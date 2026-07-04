"""Fetch live products from the store backend and format them for the LLM."""

import requests

import config


def fetch_products(limit=100):
    url = f"{config.GOSELLR_API_URL.rstrip('/')}/products"
    resp = requests.get(url, params={"status": "approved", "limit": limit}, timeout=10)
    resp.raise_for_status()
    payload = resp.json()
    if isinstance(payload, dict):
        return payload.get("data") or payload.get("items") or payload.get("products") or []
    if isinstance(payload, list):
        return payload
    return []


def format_catalog(products):
    if not products:
        return ""
    lines = []
    for p in products:
        title = p.get("title", "Unknown")
        price = p.get("price", "N/A")
        category = p.get("category", "Uncategorized")
        stock = p.get("stock")
        desc = (p.get("description") or "").strip()
        line = f"- {title} | Price: Rs {price} | Category: {category}"
        if stock is not None:
            line += f" | Stock: {stock}"
        if desc:
            line += f" | {desc}"
        lines.append(line)
    return "\n".join(lines)
