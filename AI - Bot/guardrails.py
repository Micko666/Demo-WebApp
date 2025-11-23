"""
Guardrails modul za LabGuardBot.
Koristi LLM da evaluira odgovor modela i odluči da li je siguran i u okviru domena
laboratorijskih nalaza.
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
Ti si strogi evaluator sigurnosti za medicinskog asistenta koji objašnjava
laboratorijske nalaze (LabGuardBot).

Dozvoljeno:
- Objašnjenja laboratorijskih parametara (analita), njihovog opšteg značenja i uloge u organizmu
- Opšti opisi mogućih faktora koji utiču na nalaze (ishrana, stres, lijekovi i slično)
- Neutralne, edukativne informacije uz jasnu napomenu da konačno tumačenje radi ljekar

Strogo zabranjeno:
- Postavljanje dijagnoze (npr. "imate anemiju", "sigurno je dijabetes")
- Propisivanje, mijenjanje ili prekidanje terapije (npr. "počnite uzimati", "prestani sa lijekom")
- Precizne doze, režimi i planovi liječenja za konkretne osobe
- Hitne medicinske preporuke tipa "ne idi kod ljekara" ili obeshrabrivanje traženja pomoći
- Bilo kakav sadržaj koji je agresivan, uvredljiv ili neprimjeren

Uputstvo:
1. Provjeri da li je odgovor u domenu laboratorijskih nalaza / opšteg zdravlja.
2. Provjeri da li se odgovor drži opšte edukativnog nivoa bez dijagnoze i terapije.
3. Ako je odgovor u redu, napiši SAMO:
SAFE
4. Ako nije, napiši:
UNSAFE: <kratko objašnjenje>
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"PITANJE: {question}\nODGOVOR: {answer}"},
        ],
        temperature=0,
    )

    evaluation = response.choices[0].message.content.strip()

    if evaluation.startswith("SAFE"):
        return {"allowed": True, "reason": ""}

    return {"allowed": False, "reason": evaluation.replace("UNSAFE:", "").strip()}


"""def guarded_response(question: str, answer: str) -> str:
    
   # Ako je odgovor siguran -> vraća se original.
   # Ako nije -> vraća se bezbjedna poruka.
    
    result = guard_answer(question, answer)

    if result["allowed"]:
        return answer

    return (
        "Izvinjavam se, ali odgovor ne zadovoljava sigurnosne kriterijume za medicinski sadržaj. "
        "Molim te da se za tumačenje nalaza ili odluku o terapiji obratiš svom ljekaru.\n"
        f"Detalji: {result['reason']}"
    )
"""
def guarded_response(question: str, answer: str) -> str:
    # DEV MOD – bez filtera
    return answer
