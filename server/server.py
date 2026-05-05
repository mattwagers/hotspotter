from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from surprisal import compute_surprisals, compute_surprisals_with_context

app = FastAPI(title="Hotspotter Surprisal Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SurprisalRequest(BaseModel):
    text: str
    context: str = ""


@app.get("/health")
def health():
    return {"status": "online"}


@app.post("/surprisals")
def surprisals(req: SurprisalRequest):
    if req.context:
        return compute_surprisals_with_context(req.context, req.text)
    return compute_surprisals(req.text)
