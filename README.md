# EHB AI Copilot — Product Assistant & Shopping Agent

An AI copilot for an e-commerce marketplace. It works in two ways:

- **Assistant** — answers questions about products (price, details, stock) using the live catalog.
- **Agent** — when a user describes a need or problem (e.g. *"my AC broke"*, *"gift under 3000"*),
  it recommends the most relevant products and returns them as cards.

It auto-detects which mode fits, replies in the user's language (English / Roman Urdu),
and politely refuses anything unrelated to shopping.

> This repo contains only the AI copilot (a standalone Python service + a React component).
> It talks to any backend that exposes `GET /products`. No database, secrets, or marketplace
> source code are included.

## Architecture

```
Browser (React modal)  ──►  Python AI service (FastAPI)  ──►  LLM (OpenAI-compatible)
                                     │
                                     └──►  Store backend  GET /products
```

- **backend/** — the AI service (FastAPI). Fetches products, builds a strict prompt,
  calls the LLM, and returns `{mode, answer, recommendations[]}`.
- **frontend/** — a single React (Next.js) component that renders the chat modal and
  calls the service. See `frontend/INTEGRATION.md`.

The LLM is **provider-agnostic** via the OpenAI-compatible API — use Groq (free), Ollama
(offline), or OpenAI by changing three values in `.env`.

## Backend — setup & run

```bash
cd backend
python -m venv .venv
# Windows:  .\.venv\Scripts\Activate.ps1     |  macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env        # then paste your LLM key into LLM_API_KEY
uvicorn api:app --port 8001
```

Endpoints:
- `GET  /health`
- `POST /ask`      → `{ answer }`
- `POST /copilot`  → `{ mode, answer, recommendations[] }`

Quick test:
```bash
python assistant.py "any electronics under 5000?"
```

## Frontend

A drop-in React component (`frontend/ProductAssistant.tsx`). Full wiring steps in
`frontend/INTEGRATION.md`. In short: set `NEXT_PUBLIC_ASSISTANT_API_URL`, import the
component, and control its `open` state from any button.

## Configuration (`.env`)

| Variable | Meaning | Example |
|----------|---------|---------|
| `LLM_BASE_URL` | OpenAI-compatible endpoint | `https://api.groq.com/openai/v1` |
| `LLM_API_KEY`  | your provider key | `gsk_...` |
| `LLM_MODEL`    | model name | `llama-3.1-8b-instant` |

## Notes

- Never commit your real `.env` — it's already in `.gitignore`.
- The product source is a plain `GET /products?status=approved` returning `{ data: [...] }`
  (or a bare array). Point `GOSELLR_API_URL` at your own backend.
