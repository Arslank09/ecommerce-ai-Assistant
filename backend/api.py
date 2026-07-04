"""
AI Copilot - FastAPI service.
Run:  uvicorn api:app --port 8001
Docs: http://localhost:8001/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import assistant

app = FastAPI(title="AI Copilot", version="1.0")

# Allow the frontend (browser) to call this service. Add your app's origin(s).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4002", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Turn(BaseModel):
    role: str
    content: str


class AskRequest(BaseModel):
    question: str
    history: list[Turn] = []


class CopilotRequest(BaseModel):
    question: str
    history: list[Turn] = []
    mode: str = "auto"     # "auto" | "assistant" | "agent"


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ask")
def ask(req: AskRequest):
    """Ask a product question; off-topic questions get a polite refusal."""
    history = [{"role": t.role, "content": t.content} for t in req.history]
    return {"answer": assistant.answer(req.question, history)}


@app.post("/copilot")
def copilot(req: CopilotRequest):
    """Assistant + agent: returns {mode, answer, recommendations[]}."""
    history = [{"role": t.role, "content": t.content} for t in req.history]
    return assistant.copilot(req.question, history, req.mode)
