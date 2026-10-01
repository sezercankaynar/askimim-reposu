"""Tarif siteleri: schema.org Recipe JSON-LD, yoksa okunabilir ana metin; kapak için og:image."""
from __future__ import annotations

import json
from typing import Any

import extruct
import trafilatura
from bs4 import BeautifulSoup

from ..content import Extracted
from ..net import safe_get


def _find_recipe(data: Any) -> dict | None:
    """JSON-LD ağacında (graph dahil) Recipe nesnesini bul."""
    if isinstance(data, list):
        for item in data:
            r = _find_recipe(item)
            if r:
                return r
        return None
    if isinstance(data, dict):
        t = data.get("@type")
        types = t if isinstance(t, list) else [t]
        if any(isinstance(x, str) and x.lower() == "recipe" for x in types):
            return data
        for key in ("@graph", "mainEntity", "mainEntityOfPage", "itemListElement"):
            if key in data:
                r = _find_recipe(data[key])
                if r:
                    return r
    return None


def _text(v: Any) -> str | None:
    if v is None:
        return None
    if isinstance(v, str):
        return v.strip() or None
    if isinstance(v, dict):
        return _text(v.get("name") or v.get("text") or v.get("@value"))
    if isinstance(v, list):
        return "\n".join(x for x in (_text(i) for i in v) if x) or None
    return str(v)


def _image(v: Any) -> str | None:
    if isinstance(v, str):
        return v
    if isinstance(v, dict):
        return _image(v.get("url") or v.get("contentUrl"))
    if isinstance(v, list) and v:
        return _image(v[0])
    return None


def recipe_from_jsonld(recipe: dict) -> dict:
    """JSON-LD Recipe'yi sade bir sözlüğe indirger."""
    instructions = recipe.get("recipeInstructions")
    steps: list[str] = []
    if isinstance(instructions, str):
        steps = [s.strip() for s in instructions.split("\n") if s.strip()]
    elif isinstance(instructions, list):
        for it in instructions:
            if isinstance(it, dict) and it.get("@type") == "HowToSection":
                for s in it.get("itemListElement") or []:
                    t = _text(s)
                    if t:
                        steps.append(t)
            else:
                t = _text(it)
                if t:
                    steps.append(t)
    ingredients = recipe.get("recipeIngredient") or recipe.get("ingredients") or []
    if isinstance(ingredients, str):
        ingredients = [ingredients]
    author = recipe.get("author")
    return {
        "name": _text(recipe.get("name")),
        "description": _text(recipe.get("description")),
        "ingredients": [str(i).strip() for i in ingredients if str(i).strip()],
        "steps": steps,
        "yield": _text(recipe.get("recipeYield")),
        "total_time": _text(recipe.get("totalTime")),
        "cook_time": _text(recipe.get("cookTime")),
        "prep_time": _text(recipe.get("prepTime")),
        "category": _text(recipe.get("recipeCategory")),
        "cuisine": _text(recipe.get("recipeCuisine")),
        "image": _image(recipe.get("image")),
        "author": _text(author),
        "author_url": author.get("url") if isinstance(author, dict) else None,
    }


def parse_html(html: str, url: str) -> Extracted:
    """Saf fonksiyon: HTML → Extracted (testlerde doğrudan kullanılır)."""
    ex = Extracted(platform="web", url=url)
    soup = BeautifulSoup(html, "lxml")

    og = {m.get("property") or m.get("name"): m.get("content") for m in soup.find_all("meta") if m.get("content")}
    ex.title = og.get("og:title") or (soup.title.string.strip() if soup.title and soup.title.string else None)
    ex.thumbnail_url = og.get("og:image") or og.get("twitter:image")
    ex.author = og.get("author") or og.get("article:author")

    try:
        data = extruct.extract(html, base_url=url, syntaxes=["json-ld"], uniform=True)
        recipe = _find_recipe(data.get("json-ld") or [])
    except Exception:  # noqa: BLE001
        recipe = None

    if recipe:
        simple = recipe_from_jsonld(recipe)
        ex.json_ld = simple
        ex.title = simple["name"] or ex.title
        ex.thumbnail_url = simple["image"] or ex.thumbnail_url
        ex.author = simple["author"] or ex.author
        ex.author_url = simple["author_url"]
        ex.description = json.dumps(simple, ensure_ascii=False, indent=1)
        ex.meta["source_kind"] = "json-ld"
        return ex

    text = trafilatura.extract(html, url=url, include_comments=False, include_tables=True, favor_recall=True)
    ex.description = text or (soup.get_text(" ", strip=True)[:20000] if soup.body else None)
    ex.meta["source_kind"] = "readability"
    return ex


async def extract_website(url: str) -> Extracted:
    resp = await safe_get(url)
    html = resp.text
    return parse_html(html, str(resp.url) if resp.url else url)
