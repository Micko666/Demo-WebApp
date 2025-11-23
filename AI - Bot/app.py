from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from engine import generate_answer


class LabRowIn(BaseModel):
    analit: str
    value: Optional[float] = None
    unit: Optional[str] = None
    ref_low: Optional[float] = None
    ref_high: Optional[float] = None
    status: Optional[str] = None
    date: str  # očekujemo format 'YYYY-MM-DD'


class ChatRequest(BaseModel):
    question: str
    lab_rows: List[LabRowIn] = []


app = FastAPI(title="LabGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # u produkciji ovo suzi na domen aplikacije
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "LabGuard API works"}


@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Glavni endpoint za LabGuard AI bota.
    Prima:
    {
      "question": "...",
      "lab_rows": [ { analit, value, unit, ref_low, ref_high, status, date }, ... ]
    }
    """
    rows = [r.model_dump() for r in request.lab_rows]

    answer = generate_answer(
        question=request.question,
        lab_rows=rows,
    )

    return {
        "question": request.question,
        "answer": answer,
        "timestamp": datetime.now().isoformat(),
    }
