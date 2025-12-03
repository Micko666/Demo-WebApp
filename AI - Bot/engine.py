import os
from collections import defaultdict
from typing import Dict, List, Optional

from openai import OpenAI

from guardrails import guarded_response
from ingest.local_storage_vector import load_documents as load_analiti_documents

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ---------------------------------------------------------
#  GLOBALNI KONTEKST IZ knowledge_analiti.json
# ---------------------------------------------------------

_ANALITI_DOCS: List[Dict] = []
_ANALITI_SYNONYMS: Dict[str, List[Dict]] = {}
_ANALITI_BY_ID: Dict[str, Dict] = {}


def _init_analiti_index():
    """
    Učita analite iz knowledge_analiti.json i napravi mape:
    - lowercase(ime/sinonim) -> lista dokumenata
    - id -> dokument (za related_analytes)
    """
    global _ANALITI_DOCS, _ANALITI_SYNONYMS, _ANALITI_BY_ID

    try:
        docs = load_analiti_documents()
    except Exception:
        docs = []

    _ANALITI_DOCS = []
    _ANALITI_SYNONYMS = {}
    _ANALITI_BY_ID = {}

    for doc in docs:
        if not isinstance(doc, dict):
            continue
        if doc.get("type") != "analit_info":
            continue

        _ANALITI_DOCS.append(doc)

        doc_id = doc.get("id")
        if doc_id:
            _ANALITI_BY_ID[doc_id] = doc

        terms = set()
        name = (doc.get("name") or "").strip()
        if name:
            terms.add(name.lower())

        for syn in doc.get("synonyms", []) or []:
            syn = (syn or "").strip()
            if syn:
                terms.add(syn.lower())

        for term in terms:
            _ANALITI_SYNONYMS.setdefault(term, []).append(doc)


# inicijalizacija pri importu
_init_analiti_index()


def _match_analiti_in_question(question: str) -> List[Dict]:
    """
    Na osnovu imena i sinonima traži koje analite pitanje eksplicitno pominje.
    Ne koristi semantičku sličnost – samo direktna pojavljivanja izraza.
    """
    q = (question or "").lower()
    if not q or not _ANALITI_SYNONYMS:
        return []

    seen_ids = set()
    results: List[Dict] = []

    for term, docs in _ANALITI_SYNONYMS.items():
        if not term or term not in q:
            continue
        for d in docs:
            doc_id = d.get("id") or id(d)
            if doc_id in seen_ids:
                continue
            seen_ids.add(doc_id)
            results.append(d)

    return results


def _analit_doc_to_text(doc: Dict) -> str:
    """
    Pretvara jedan analit_info zapis u sažeti tekst za kontekst.
    Podržava nova polja: related_analytes i trend_focus.
    """
    name = doc.get("name", "")
    category = doc.get("category", "")
    unit = doc.get("unit_general", "")
    short = doc.get("short_description", "")
    long = doc.get("long_description", "")
    why = doc.get("why_measured", "")
    clinical = doc.get("clinical_significance", "")
    interp = doc.get("interpretation_principle", "")
    factors = doc.get("factors_affecting", "")
    sample = doc.get("sample_requirements", "")
    prep = doc.get("patient_preparation", "")
    notes = doc.get("notes_for_user", "")

    # NOVO: povezani analiti
    related_ids = doc.get("related_analytes") or []
    related_names: List[str] = []
    for rid in related_ids:
        rel = _ANALITI_BY_ID.get(rid)
        if rel:
            rel_name = (rel.get("name") or "").strip()
            if rel_name:
                related_names.append(rel_name)

    related_line = ""
    if related_names:
        related_line = (
            "Povezani analiti koji se često posmatraju zajedno: "
            + ", ".join(sorted(set(related_names)))
            + "."
        )

    # NOVO: fokus na praćenje kroz vrijeme
    trend_focus = (doc.get("trend_focus") or "").strip()
    trend_line = ""
    if trend_focus:
        trend_line = "Napomena o posmatranju kroz vrijeme: " + trend_focus

    parts = [
        f"Analit: {name}" if name else "",
        f"Kategorija: {category}" if category else "",
        f"Tipična jedinica: {unit}" if unit else "",
        short,
        long,
        why,
        clinical,
        interp,
        factors,
        sample,
        prep,
        notes,
        related_line,
        trend_line,
    ]
    text = "\n".join(p for p in parts if p)
    # sigurnosno ograničimo dužinu
    return text[:8000]


SYSTEM_PROMPT = """
Ti si LabGuard AI – digitalni asistent koji ljudima na jednostavan način objašnjava
laboratorijske nalaze.

TVOJ ZADATAK:
- Objašnjavaš ŠTA koji analit znači, kako se obično tumači i šta može da znači trend
  kroz vrijeme (porast, pad, stabilne vrijednosti).
- Ne postavljaš dijagnozu, ne daješ terapiju, ne govoriš korisniku šta tačno treba da radi.
- Odgovaraš opušteno, ali jasno i razumljivo, kao edukativni vodič.

IZVORI:
- Odgovaraš ISKLJUČIVO na osnovu:
  1) baze znanja o analitima (knowledge_analiti.json),
  2) lab_rows koje dobiješ iz korisničkih nalaza (vrijednost, referentni opseg, datum).
- NE koristiš šire medicinsko znanje izvan ovih izvora.
- Ako nemaš podatak o nekom analitu u bazi znanja, jasno kažeš da nemaš dovoljno informacija.

TUMAČENJE:
- Ako korisnik pita za konkretan analit:
  - Ukratko objasni šta taj analit predstavlja na običnom jeziku, ali samo ako ga imamo u bazi znanja.
  - Ako imaš njegovu vrijednost i referentni opseg iz lab_rows:
      * reci da li je okvirno u granicama, ispod ili iznad,
      * objasni šta to uopšteno znači, ali bez dijagnoze.
- Ako analit koji korisnik pominje nije u bazi znanja:
  - Reci da u bazi nema dovoljno informacija i da se treba osloniti na brojke u aplikaciji i savjet ljekara.
- Ako korisnik traži "opšte stanje" ili "trend kroz vrijeme":
  - Gledaš sve dostupne lab_rows,
  - Ukratko opisuješ šta većinom raste, šta pada, a šta je stabilno,
  - Možeš da daš okvirnu subjektivnu ocjenu (1–10), ali jasno kažeš da to NIJE dijagnoza.

SIGURNOST:
- Ne postavljaš dijagnozu (npr. "imaš anemiju", "sigurno je dijabetes").
- Ne daješ terapiju, doze, lijekove, suplemente.
- Ne obeshrabruješ odlazak kod ljekara.
- Uvijek naglašavaš da konačno tumačenje i odluku o terapiji donosi ljekar.

AKO NE ZNAŠ:
- Ako pitanje nije u domenu laboratorijskih nalaza ili nemaš dovoljno podataka,
  iskreno reci da nemaš informaciju i predloži da se korisnik obrati ljekaru.
"""


def detect_intent(question: str) -> str:
    """
    Vrlo jednostavna detekcija namjere:
    - 'overall' za opšte stanje / trend kroz vrijeme
    - 'default' za sva ostala pitanja
    """
    q = (question or "").lower()

    if (
        "opšte stanje" in q
        or "opste stanje" in q
        or "opste zdravlje" in q
        or "opšte zdravlje" in q
        or "generalno stanje" in q
        or "od 1 do 10" in q
        or "trend" in q
        or "kroz vrijeme" in q
        or "kroz vrjeme" in q
        or "što se promijenilo" in q
        or "sto se promijenilo" in q
        or "sta se promijenilo" in q
        or "sta se promjenilo" in q
        or "promjene kroz vrijeme" in q
    ):
        return "overall"

    return "default"


def build_analiti_context(question: str, k: int = 3) -> str:
    """
    Umjesto semantičke pretrage, koristimo STROGO
    podudaranje sa imenima i sinonimima iz knowledge_analiti.json.
    """
    matched_docs = _match_analiti_in_question(question)
    if not matched_docs:
        return ""

    parts = []
    for doc in matched_docs[:k]:
        parts.append(_analit_doc_to_text(doc))

    if not parts:
        return ""

    return "\n\n".join(parts)


def summarize_lab_rows(lab_rows: List[Dict]) -> str:
    """
    Sažetak nalaza po analitima: zadnja vrijednost, min/max i jednostavan trend.
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

    header = (
        "Sažeti pregled nalaza po analitima (bazirano na dostavljenim izvještajima):\n"
    )
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


def _maybe_handle_unknown_analit(question: str) -> Optional[str]:
    """
    Ako pitanje izgleda kao 'objasni mi ovaj analit', a nijedan analit
    iz naše baze se ne poklapa sa imenom/sinonimima u pitanju,
    vraćamo bezbjednu poruku UMJESTO poziva LLM-u.
    """
    q = (question or "").lower()

    if _match_analiti_in_question(q):
        return None

    triggers = [
        "šta znači",
        "sta znaci",
        "objasni mi",
        "objasni ovaj nalaz",
        "sta predstavlja",
        "što znači",
        "sto znaci",
        "sta je",
        "šta je",
    ]

    if any(t in q for t in triggers):
        raw = (
            "Nemam dovoljno pouzdanih informacija o tom konkretnom parametru u svojoj bazi znanja, "
            "pa ne mogu da ga detaljno tumačim. U aplikaciji možeš da vidiš brojčane vrijednosti "
            "i referentni opseg, ali za pravo medicinsko objašnjenje najbolje je da nalaz "
            "prođeš sa svojim ljekarom."
        )
        return guarded_response(question, raw)

    return None


def generate_overall_answer(question: str, lab_summary: str) -> str:
    """
    Poseban poziv modela za 'opšte stanje' / trend nalaza.
    """
    if not lab_summary:
        raw_answer = (
            "Nemam dovoljno podataka o tvojim nalazima da bih opisao opšte stanje. "
            "Molim te da prvo učitaš laboratorijske izvještaje u aplikaciju, pa onda pokušaš ponovo. "
            "Za bilo kakvo ozbiljnije tumačenje uvijek se obrati svom ljekaru."
        )
        return guarded_response(question, raw_answer)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "system",
            "content": (
                "Korisnik traži opis opšteg stanja i trenda nalaza kroz vrijeme. "
                "Na osnovu sažetka ispod, opiši ukratko šta se mijenja (šta raste, šta pada, šta je stabilno). "
                "Možeš da daš i okviran utisak (npr. 1–10), ali naglasi da to nije dijagnoza.\n\n"
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
    q_low = (question or "").lower().strip()

    # 0) Meta pitanja tipa "da li vidis moje nalaze"
    if "vidis" in q_low or "vidiš" in q_low:
        raw = (
            "Nemam direktan uvid u tvoje medicinske podatke na serveru, ali aplikacija mi "
            "prosleđuje sažete informacije iz tvojih nalaza (naziv analita, vrijednost i "
            "referentni opseg). Na osnovu toga mogu da objasnim šta koji parametar znači "
            "i da ti dam informativan opis, ali ne i dijagnozu."
        )
        return guarded_response(question, raw)

    intent = detect_intent(question)

    # 1) Opšte stanje / trend
    if intent == "overall":
        lab_summary = summarize_lab_rows(lab_rows)
        return generate_overall_answer(question, lab_summary)

    # 2) Ako izgleda da pita za analit koga uopšte nemamo u bazi – odmah safe odgovor
    maybe = _maybe_handle_unknown_analit(question)
    if maybe is not None:
        return maybe

    # 3) Kontekst iz baze znanja (samo eksplicitni analiti) + poslednje vrijednosti
    knowledge_context = build_analiti_context(question, k=3)
    user_lab_context = build_user_lab_context(lab_rows)

    context_blocks = []
    if knowledge_context:
        context_blocks.append(
            "Informacije iz baze znanja o analitima:\n" + knowledge_context
        )
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
                "role": "assistant",
                "content": (
                    "Ovo su podaci koje možeš koristiti samo kao pomoć, "
                    "ali ih ne smiješ izmišljati niti dopunjavati:\n\n"
                    + combined_context
                ),
            }
        )

    messages.append({"role": "user", "content": question})

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=messages,
        temperature=0,
    )

    raw_answer = response.choices[0].message.content or ""
    return guarded_response(question, raw_answer)
