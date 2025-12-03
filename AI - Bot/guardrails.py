"""
Guardrails modul za LabGuardBot.
Procjenjuje da li je odgovor bezbjedan za prikaz u aplikaciji.
"""

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def guard_answer(question: str, answer: str) -> dict:
    """
    Evaluira odgovor modela i vraća odluku da li je siguran za prikaz.

    Returns:
        {
          "allowed": bool,
          "reason": str
        }
    """

    system_prompt = """
Ti si evaluator sigurnosti za LabGuard – digitalnog asistenta koji daje
edukativna objašnjenja laboratorijskih nalaza.

TVOJ ZADATAK:
Gledaj PITANJE i ODGOVOR i procijeni da li je sadržaj MEDICINSKI PREVIŠE DIREKTAN
za običnog korisnika u aplikaciji.

DOZVOLJENO:
- Opisivanje laboratorijskih parametara (analita) i njihove uloge u organizmu.
- Pominjanje konkretnih vrijednosti i referentnih opsega.
- Opisivanje trenda kroz vrijeme (npr. "vrijednost je porasla", "većinom je stabilna").
- Neutralno navođenje da je nešto iznad ili ispod referentnog opsega.
- Opšti, edukativni komentari uz jasnu poruku da konačno tumačenje radi ljekar.
- Opšti navodi tipa "ovakve promjene se mogu viđati kod stanja kao što su anemije,
  infekcije ili hronične bolesti", sve dok se NE kaže da korisnik SIGURNO ima neko
  konkretno stanje.
- Korišćenje ličnog tona ("ti", "tvoj") je dozvoljeno dok god je sadržaj edukativan.

STROGO ZABRANJENO:
- Direktno postavljanje dijagnoze za korisnika
  (npr. "imaš anemiju", "ovo je sigurno dijabetes").
- Jak utisak dijagnoze upućen direktno korisniku
  (npr. "ovo vrlo vjerovatno znači da imaš X bolest").
- Pretpostavljanje uzroka nalaza za KONKRETNOG korisnika
  (npr. "kod tebe je ovo zbog infekcije", "uzrok je manjak gvožđa").
- Davanje terapijskih savjeta (lijekovi, doze, suplementi, konkretne promjene terapije).
- Savjeti tipa "nije potrebno ići kod ljekara" ili obeshrabrivanje odlaska ljekaru.
- Bilo kakvi planovi liječenja, protokoli ili medicinske preporuke prilagođene korisniku.

VAŽNO:
- Ako je odgovor uglavnom edukativan, opisuje brojke i trendove, pominje moguće
  scenarije uopšteno i jasno naglašava da odluku donosi ljekar -> tretiraj kao SAFE.
- UNSAFE odgovori su samo oni koji zaista djeluju kao dijagnoza, konkretan uzrok
  ili terapijski savjet za osobu koja postavlja pitanje.

FORMAT ODGOVORA:
- Ako je u redu, odgovori SAMO: SAFE
- Ako NIJE u redu, odgovori: UNSAFE: <kratko objašnjenje>
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"PITANJE: {question}\nODGOVOR: {answer}"},
        ],
        temperature=0,
    )

    evaluation = (response.choices[0].message.content or "").strip()

    # Malo tolerantnija logika:
    text_upper = evaluation.upper()

    if text_upper.startswith("SAFE"):
        return {"allowed": True, "reason": ""}

    if text_upper.startswith("UNSAFE"):
        reason = evaluation.replace("UNSAFE", "").replace(":", "").strip()
        return {"allowed": False, "reason": reason}

    # Ako model vrati nešto neočekivano, radije smatramo da je SAFE
    return {"allowed": True, "reason": ""}


def guarded_response(question: str, answer: str) -> str:
    """
    Ako je odgovor siguran -> vraća se original.
    Ako nije -> vraća se bezbjedna, neutralna poruka.
    """
    result = guard_answer(question, answer)

    if result["allowed"]:
        return answer

    # skraćena, korisniku prijatnija poruka
    return (
        "Izvinjavam se, ali ovakav odgovor ne zadovoljava sigurnosne kriterijume za medicinski sadržaj "
        "u LabGuard aplikaciji. Ovaj alat je zamišljen samo kao edukativna podrška. "
        "Za detaljno tumačenje nalaza ili bilo kakvu odluku o terapiji obavezno se obrati svom ljekaru."
    )
