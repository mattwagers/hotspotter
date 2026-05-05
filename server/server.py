from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from surprisal import compute_surprisals

app = FastAPI(title="Hotspotter Surprisal Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SurprisalRequest(BaseModel):
    text: str


@app.get("/health")
def health():
    return {"status": "online"}


@app.post("/surprisals")
def surprisals(req: SurprisalRequest):
    return compute_surprisals(req.text)
