from datetime import datetime
from typing import Any, Dict, List

from fastapi import Body, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from engine import generate_answer


app = FastAPI(title="LabGuard AI Bot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "time": datetime.now().isoformat()}


@app.post("/chat")
async def chat(payload: Dict[str, Any] = Body(...)):
    """
    Namjerno jako tolerantna verzija:
    - prihvata bilo kakav JSON
    - pokušava da pronađe pitanje pod više ključeva
    - pokušava da pronađe lab_rows (labRows / lab_rows / rows ...)
    """

    # 1) Izvuci pitanje iz raznih mogućih ključeva
    question = (
        payload.get("question")
        or payload.get("message")
        or payload.get("prompt")
        or ""
    )

    if not isinstance(question, str):
        question = str(question)

    # 2) Izvuci lab_rows iz više mogućih naziva
    raw_rows = (
        payload.get("lab_rows")
        or payload.get("labRows")
        or payload.get("rows")
        or payload.get("lab_rows_flat")
        or []
    )

    lab_rows: List[Dict[str, Any]] = []
    if isinstance(raw_rows, list):
        for item in raw_rows:
            if isinstance(item, dict):
                lab_rows.append(item)
    else:
        # ako je nešto drugo (npr. dict), jednostavno ignorišemo
        lab_rows = []

    # 3) Pozovi engine
    answer = generate_answer(question=question, lab_rows=lab_rows)

    return {
        "question": question,
        "answer": answer,
        "timestamp": datetime.now().isoformat(),
    }
