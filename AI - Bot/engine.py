import os
from collections import defaultdict
from typing import Dict, List, Optional

from openai import OpenAI

from guardrails import guarded_response
from ingest.local_storage_vector import search_documents as search_analiti

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


SYSTEM_PROMPT = """
Ti si LabGuardBot, digitalni asistent za tumačenje laboratorijskih nalaza.

Uloge:
- Objašnjavaš šta znače pojedinačni analiti (hemoglobin, gvožđe, HDL, LDL, glukoza, trigliceridi...).
- Koristiš kontekst iz baze znanja (knowledge_analiti.json) i, ako je dostupno,
  konkretne vrijednosti iz nalaza korisnika.

VAŽNO:
- Ako u kontekstu imaš poslednje vrijednosti korisnikovih nalaza, UVIJEK ih eksplicitno pomeneš u odgovoru
  u formatu tipa: "U tvom poslednjem nalazu vrijednost je X (referentni opseg Y–Z)...", ali bez postavljanja dijagnoze.

Strogo zabranjeno:
- Postavljanje dijagnoze.
- Propisivanje, mijenjanje ili prekidanje terapije.
- Konkretne medicinske odluke.

Odgovori:
- Jasno, jednostavno, neutralno.
- Odgovaraj smireno i faktografski, bez dramatičnih formulacija.
- Za ozbiljne brige uvijek podsjeti da se korisnik obrati svom ljekaru.
"""


def detect_intent(question: str) -> str:
    """
    Vrlo jednostavna detekcija namjere:
    - 'overall' za opšte stanje
    - 'default' za sva ostala pitanja
    """
    q = question.lower()
    if (
        "opšte stanje" in q
        or "opste stanje" in q
        or "od 1 do 10" in q
        or "opste zdravlje" in q
        or "generalno stanje" in q
    ):
        return "overall"
    return "default"


def build_analiti_context(question: str, k: int = 3) -> str:
    """
    Pretraga knowledge_analiti.json preko FAISS indexa
    i građenje tekstualnog konteksta.
    """
    try:
        docs = search_analiti(question, k=k)
    except Exception:
        return ""

    parts = []
    for doc in docs:
        content = doc.get("content") or doc.get("text") or ""
        if not content:
            continue
        parts.append(content)

    if not parts:
        return ""

    return "\n\n".join(parts)


def summarize_lab_rows(lab_rows: List[Dict]) -> str:
    """
    Sažetak nalaza po analitima: zadnja vrijednost, broj mjerenja,
    min/max i jednostavan trend.
    """
    if not lab_rows:
        return ""

    by_analit: Dict[str, List[Dict]] = defaultdict(list)
    for row in lab_rows:
        analit = row.get("analit") or row.get("Analit")
        if not analit:
            continue
        by_analit[analit].append(row)

    summary_lines = []
    for analit, rows in by_analit.items():
        rows_sorted = sorted(rows, key=lambda r: r.get("date", ""))
        values = [r.get("value") or r.get("Vrijednost") for r in rows_sorted]
        values = [v for v in values if isinstance(v, (int, float))]

        last = rows_sorted[-1]
        last_val = last.get("value") or last.get("Vrijednost")
        unit = last.get("unit") or last.get("Jedinica")
        ref_low = last.get("ref_low") or last.get("Ref_low")
        ref_high = last.get("ref_high") or last.get("Ref_high")
        status = last.get("status") or last.get("Status")
        n = len(values)

        line = f"- {analit}: "
        if last_val is not None:
            line += f"poslednja vrijednost {last_val} {unit or ''}".strip()
        else:
            line += "poslednja vrijednost: nema podataka"

        if ref_low is not None and ref_high is not None:
            line += f", referentni opseg {ref_low}–{ref_high}"

        if status:
            line += f", status u zadnjem nalazu: {status}"

        if n >= 2:
            min_val = min(values)
            max_val = max(values)
            if values[0] < values[-1]:
                trend = "uglavnom u porastu"
            elif values[0] > values[-1]:
                trend = "uglavnom u padu"
            else:
                trend = "uglavnom stabilno"
            line += f" (min: {min_val}, max: {max_val}, trend: {trend})"
        elif n == 1:
            line += " (samo jedno mjerenje)"

        summary_lines.append(line)

    if not summary_lines:
        return ""

    header = "Sažeti pregled nalaza po analitima (bazirano na dostavljenim izvještajima):\n"
    return header + "\n".join(summary_lines)


def build_user_lab_context(lab_rows: List[Dict]) -> str:
    """
    Kraći opis: koje analite imamo i njihove zadnje vrijednosti.
    Koristi se kao dodatni kontekst kod običnih pitanja.
    """
    if not lab_rows:
        return ""

    by_analit: Dict[str, Dict] = {}
    for row in lab_rows:
        analit = row.get("analit") or row.get("Analit")
        if not analit:
            continue
        existing = by_analit.get(analit)
        if not existing or (row.get("date", "") > existing.get("date", "")):
            by_analit[analit] = row

    lines = []
    for analit, row in by_analit.items():
        val = row.get("value") or row.get("Vrijednost")
        unit = row.get("unit") or row.get("Jedinica")
        ref_low = row.get("ref_low") or row.get("Ref_low")
        ref_high = row.get("ref_high") or row.get("Ref_high")
        status = row.get("status") or row.get("Status")

        base = f"{analit}: {val} {unit or ''}".strip()
        extra = []
        if ref_low is not None and ref_high is not None:
            extra.append(f"ref. opseg {ref_low}–{ref_high}")
        if status:
            extra.append(f"status: {status}")
        if extra:
            base += " (" + ", ".join(extra) + ")"
        lines.append(base)

    if not lines:
        return ""

    return (
        "Za ovog korisnika imamo sledeće poslednje vrijednosti iz nalaza:\n"
        + "\n".join(f"- {ln}" for ln in lines)
    )


def generate_overall_answer(question: str, lab_summary: str) -> str:
    """
    Poseban poziv modela za 'opšte stanje'.
    """
    if not lab_summary:
        raw_answer = (
            "Nemam dovoljno podataka o tvojim nalazima da bih opisao opšte stanje. "
            "Molim te da prvo učitaš laboratorijske izvještaje u aplikaciju, pa onda pokušaj ponovo. "
            "Za bilo kakvo ozbiljnije tumačenje uvijek se obrati svom ljekaru."
        )
        return guarded_response(question, raw_answer)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "system",
            "content": (
                "Korisnik traži opis opšteg stanja na osnovu sledećih laboratorijskih nalaza. "
                "Na osnovu sažetka ispod, daj kratak pregled (par pasusa) i okvirnu ocjenu od 1 do 10.\n\n"
                + lab_summary
            ),
        },
        {"role": "user", "content": question},
    ]

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=messages,
        temperature=0.1,
    )
    raw_answer = response.choices[0].message.content or ""
    return guarded_response(question, raw_answer)


def generate_answer(question: str, lab_rows: Optional[List[Dict]] = None) -> str:
    """
    Glavna funkcija za generisanje odgovora.
    """
    lab_rows = lab_rows or []
    q_low = question.lower().strip()

    # 0) Meta pitanja tipa "da li vidis moje nalaze" rješavamo direktno
    if "vidis" in q_low or "vidiš" in q_low:
        raw = (
            "Nemam direktan uvid u tvoje medicinske podatke na serveru, ali aplikacija mi "
            "prosleđuje sažete informacije iz tvojih nalaza (naziv analita, vrijednost i "
            "referentni opseg). Na osnovu toga mogu da objasnim šta koji parametar znači "
            "i da ti dam informativan opis, ali ne i dijagnozu."
        )
        return guarded_response(question, raw)

    intent = detect_intent(question)

    if intent == "overall":
        lab_summary = summarize_lab_rows(lab_rows)
        return generate_overall_answer(question, lab_summary)

    knowledge_context = build_analiti_context(question, k=3)
    user_lab_context = build_user_lab_context(lab_rows)

    context_blocks = []
    if knowledge_context:
        context_blocks.append("Informacije iz baze znanja o analitima:\n" + knowledge_context)
    if user_lab_context:
        context_blocks.append(
            "Informacije iz korisnikovih nalaza (zadnje izmjerene vrijednosti):\n"
            + user_lab_context
        )

    combined_context = "\n\n".join(context_blocks).strip()

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if combined_context:
        messages.append(
            {
                "role": "system",
                "content": (
                    "Kontekst koji možeš koristiti za odgovor (ne izmišljaj nove podatke):\n"
                    + combined_context
                ),
            }
        )

    messages.append({"role": "user", "content": question})

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=messages,
        temperature=0.1,
    )
    raw_answer = response.choices[0].message.content or ""
    return guarded_response(question, raw_answer)
