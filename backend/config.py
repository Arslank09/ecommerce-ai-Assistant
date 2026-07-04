"""Settings for the AI Copilot service (all from .env)."""

import os
from dotenv import load_dotenv

load_dotenv()

# LLM provider (OpenAI-compatible: Groq free / Ollama / OpenAI)
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")

# Where to read live products from (the store backend)
GOSELLR_API_URL = os.getenv("GOSELLR_API_URL", "http://localhost:3002")
