"""
AI Copilot brain.

Two capabilities:
  - answer():  simple product Q&A (used by /ask).
  - copilot(): assistant + agent. Detects intent, answers, AND returns product
               recommendations to show as cards. Off-topic questions are refused.
"""

import json
import re

from openai import OpenAI

import config
import products

_client = OpenAI(
    base_url=config.LLM_BASE_URL,
    api_key=config.LLM_API_KEY or "not-needed",
)

REFUSAL = "Sorry, I can only help with questions about the store's products."

# ---------------------------------------------------------------------------
# Simple assistant (text only) — used by /ask
# ---------------------------------------------------------------------------
SYSTEM_TEMPLATE = """You are the store's Product Assistant.

STRICT RULES:
1. You ONLY help with the products listed below — price, description,
   category, availability/stock, comparisons, and recommendations from this list.
2. If the user asks something clearly unrelated to these products, reply with exactly:
   "{refusal}"
3. Follow-ups are product questions — use the conversation so far.
4. Read prices EXACTLY (300 means 300, not 3000). Reply in the user's language.

PRODUCTS:
{catalog}
"""


def answer(question, history=None):
    try:
        items = products.fetch_products()
    except Exception:
        return ("I can't reach the store right now. Please make sure the "
                "backend is running on " + config.GOSELLR_API_URL + " and try again.")

    catalog = products.format_catalog(items) or "(No products are available right now.)"
    system_prompt = SYSTEM_TEMPLATE.format(refusal=REFUSAL, catalog=catalog)

    messages = [{"role": "system", "content": system_prompt}]
    for turn in (history or [])[-10:]:
        role = turn.get("role")
        content = turn.get("content")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": question})

    response = _client.chat.completions.create(
        model=config.LLM_MODEL, temperature=0.2, messages=messages,
    )
    return response.choices[0].message.content


# ---------------------------------------------------------------------------
# AI Copilot (assistant + agent + recommendations) — used by /copilot
# ---------------------------------------------------------------------------
COPILOT_SYSTEM = '''You are an AI shopping Copilot for an online store.

You operate in three modes and you decide which one fits (unless told):
- "assistant": the user asks about a specific product's price / details / stock,
  or a general product question. Answer factually from the catalog.
- "agent": the user describes a NEED or PROBLEM, or asks for suggestions /
  recommendations (e.g. "my AC broke", "I need a gift under 3000",
  "kuch acha recommend karo"). Recommend the most relevant products from the
  catalog and explain briefly.
- "off_topic": the message is clearly NOT about shopping or these products
  (general knowledge, news, coding, personal chat).

Output STRICT JSON only, nothing outside the JSON, with exactly these keys:
{"mode": "assistant|agent|off_topic", "answer": "reply in the user's language", "recommend_titles": ["exact catalog titles"]}

Rules:
- recommend_titles MUST be exact product titles copied from the CATALOG. Use [] when none apply.
- In "agent" mode, put the products you recommend into recommend_titles.
- For "off_topic": answer = "Sorry, I can only help with shopping and products." and recommend_titles = [].
- Prices are in Pakistani Rupees (Rs). Never invent products or prices. Keep answers short.
- LANGUAGE & SCRIPT — match the user exactly:
  * If the user writes in English, reply in English.
  * If the user writes in Roman Urdu (Urdu in Latin letters, e.g. "mera ac kharab ho gaya hai"),
    reply in ROMAN URDU — natural Urdu words in Latin letters (use "aap", "kya", "chahiye",
    "munasib", "theek", "behtareen"). Do NOT use Hindi words like "upyukt"/"aisi cheezein"
    and NEVER use Devanagari or Hindi script.

CATALOG:
__CATALOG__
'''


def _extract_json(text):
    """Parse a JSON object from the model output, tolerating stray text."""
    try:
        return json.loads(text)
    except Exception:
        match = re.search(r"\{.*\}", text or "", re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                return None
    return None


def copilot(question, history=None, mode="auto"):
    """Return {mode, answer, recommendations:[{id,title,price,category,images}]}"""
    try:
        items = products.fetch_products()
    except Exception:
        return {
            "mode": "error",
            "answer": ("I can't reach the store right now. Make sure the "
                       "backend is running on " + config.GOSELLR_API_URL + "."),
            "recommendations": [],
        }

    catalog = products.format_catalog(items) or "(No products available.)"
    by_title = {(p.get("title") or "").strip().lower(): p for p in items}

    messages = [{"role": "system", "content": COPILOT_SYSTEM.replace("__CATALOG__", catalog)}]
    if mode in ("assistant", "agent"):
        messages.append({
            "role": "system",
            "content": f'The user selected mode "{mode}". Prefer it unless the message is clearly off_topic.',
        })
    for turn in (history or [])[-10:]:
        role = turn.get("role")
        content = turn.get("content")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": question})

    raw = ""
    try:
        response = _client.chat.completions.create(
            model=config.LLM_MODEL, temperature=0.2, messages=messages,
        )
        raw = response.choices[0].message.content or ""
    except Exception:
        return {"mode": "error", "answer": "The AI service failed. Check your LLM_API_KEY in .env.", "recommendations": []}

    data = _extract_json(raw)
    if not isinstance(data, dict):
        # Model didn't return JSON — treat the whole thing as a plain answer.
        return {"mode": "assistant", "answer": raw or "Sorry, please try again.", "recommendations": []}

    # Map recommended titles back to full product objects for the cards.
    recs = []
    seen = set()
    for title in (data.get("recommend_titles") or []):
        key = (title or "").strip().lower()
        product = by_title.get(key)
        if product and key not in seen:
            seen.add(key)
            recs.append({
                "id": product.get("id"),
                "title": product.get("title"),
                "price": product.get("price"),
                "category": product.get("category"),
                "images": product.get("images") or [],
            })

    return {
        "mode": data.get("mode", "assistant"),
        "answer": data.get("answer", ""),
        "recommendations": recs,
    }


if __name__ == "__main__":
    import sys
    q = " ".join(sys.argv[1:]) or "my ac stopped working, suggest something"
    print(copilot(q))
