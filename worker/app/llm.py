"""Claude ile yapılandırılmış tarif çıkarma (metin + görseller, katı JSON şeması)."""
from __future__ import annotations

import base64
import json
from dataclasses import dataclass

import anthropic
import structlog

from .categories import ALL_SUBCATEGORIES, CATEGORIES, CATEGORY_NAMES
from .config import settings
from .content import Extracted
from .errors import ImportError_

log = structlog.get_logger()

UNITS = [
    "su bardağı", "çay bardağı", "kahve fincanı", "yemek kaşığı", "tatlı kaşığı", "çay kaşığı",
    "g", "kg", "ml", "lt", "adet", "diş", "dal", "demet", "paket", "dilim", "yaprak", "parça", "kase", "avuç",
    "tutam", "göz kararı", "biraz",
]

RECIPE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "found", "title", "category", "subcategory", "servings", "time_text",
        "ingredients", "steps", "notes", "cover_frame_index", "confidence",
    ],
    "properties": {
        "found": {"type": "boolean", "description": "İçerikte gerçek bir yemek tarifi var mı?"},
        "title": {"type": "string"},
        "category": {"type": "string", "enum": CATEGORY_NAMES},
        "subcategory": {"type": ["string", "null"], "enum": ALL_SUBCATEGORIES + [None]},
        "servings": {"type": ["integer", "null"]},
        "time_text": {"type": ["string", "null"], "description": "örn. '45 dk', '1 saat 20 dk'"},
        "ingredients": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["name", "amount", "amount_max", "unit", "note", "group", "estimated", "confidence"],
                "properties": {
                    "name": {"type": "string"},
                    "amount": {"type": ["number", "null"]},
                    "amount_max": {"type": ["number", "null"]},
                    "unit": {"type": ["string", "null"], "enum": UNITS + [None]},
                    "note": {"type": ["string", "null"]},
                    "group": {"type": ["string", "null"], "description": "örn. 'Sos için', 'Hamuru için'"},
                    "estimated": {"type": "boolean", "description": "Miktar içerikte net değilse true"},
                    "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                },
            },
        },
        "steps": {"type": "array", "items": {"type": "string"}},
        "notes": {"type": ["string", "null"]},
        "cover_frame_index": {
            "type": ["integer", "null"],
            "description": "Verilen karelerden yemeğin en iyi göründüğü karenin 0 tabanlı indeksi; kare yoksa null",
        },
        "confidence": {
            "type": "object",
            "additionalProperties": False,
            "required": ["title", "servings", "time", "ingredients", "steps", "category"],
            "properties": {k: {"type": "number", "minimum": 0, "maximum": 1} for k in ("title", "servings", "time", "ingredients", "steps", "category")},
        },
    },
}

SYSTEM_PROMPT = f"""Sen bir Türk mutfağı editörüsün. Sana bir sosyal medya gönderisinden ya da web sayfasından toplanmış ham içerik verilecek: açıklama/caption, ses transkripti, altyazı, sayfa metni ve/veya videodan alınmış kareler. Görevin bu içerikten TEK bir yemek tarifini yapılandırılmış biçimde çıkarmak.

Kurallar:
1. İçerikte olmayan hiçbir malzemeyi UYDURMA. Miktar verilmemişse amount null, estimated true ve confidence düşük olsun. Miktar bağlamdan çıkarılabiliyorsa (örn. "bir avuç") tahmin et ama estimated true işaretle.
2. Her şeyi Türkçeye çevir: başlık, malzeme adları, adımlar, notlar. Malzeme adları küçük harf ve sade olsun ("un", "toz şeker", "tavuk göğsü").
3. Birimleri Türk mutfak ölçülerine çevir: 1 cup = 240 ml (bunu en yakın su bardağı/çay bardağına çevir: 1 cup ≈ 1 su bardağı + 1 çay kaşığı değil, pratikte 1 cup ≈ 1,25 su bardağı; basitlik için 1 cup → 1 su bardağı yazıp note alanına "240 ml" ekle), 1 oz = 28 g, 1 lb = 454 g, tbsp = yemek kaşığı, tsp = çay kaşığı, 1 stick butter = 113 g. Birim alanı yalnızca izin verilen listeden seçilir; sayılabilir şeylerde "adet".
4. Kategoriyi ve alt kategoriyi SADECE şu listeden seç:
{json.dumps(CATEGORIES, ensure_ascii=False, indent=1)}
5. Kişi sayısını ve toplam süreyi bul; bulunamıyorsa null bırak ve confidence'ı düşür.
6. Adımlar kısa, emir kipinde, numarasız cümleler olsun. Süreleri koru ("10 dakika pişir").
7. Ekran görüntüsü/karelerde yazılı malzeme listesi varsa onu açıklama ve transkriptle birleştir; çelişkide yazılı olana güven.
8. Kareler verildiyse yemeğin bitmiş halinin en iyi göründüğü karenin indeksini cover_frame_index'e yaz.
9. İçerikte gerçek bir yemek tarifi yoksa found=false döndür ve diğer alanları boş/null bırak.
10. Her alan için 0-1 arası güven skoru ver.
Yanıt yalnızca JSON şemasına uyan tek bir nesne olmalıdır."""

# Fiyatlar (USD / 1M token). Model değişirse README'den güncellenir.
PRICES = {
    "claude-opus-5-5": (4.0, 20.0),
    "claude-sonnet-5-5": (2.0, 10.0),
    "claude-haiku-4-5": (1.0, 5.0),
}


@dataclass
class LLMResult:
    recipe: dict
    input_tokens: int
    output_tokens: int
    cost_usd: float


def build_user_content(ex: Extracted) -> list[dict]:
    parts: list[dict] = []
    text_blocks = [f"Platform: {ex.platform}\nURL: {ex.url}"]
    if ex.title:
        text_blocks.append(f"BAŞLIK:\n{ex.title}")
    if ex.author:
        text_blocks.append(f"YAZAR: {ex.author}")
    if ex.json_ld:
        text_blocks.append("SAYFADAKİ YAPILANDIRILMIŞ TARİF (schema.org):\n" + json.dumps(ex.json_ld, ensure_ascii=False, indent=1))
    elif ex.description:
        text_blocks.append(f"AÇIKLAMA / SAYFA METNİ:\n{ex.description[:30000]}")
    if ex.subtitles:
        text_blocks.append(f"ALTYAZI:\n{ex.subtitles[:20000]}")
    if ex.transcript:
        text_blocks.append(f"SES TRANSKRİPTİ:\n{ex.transcript[:20000]}")
    parts.append({"type": "text", "text": "\n\n".join(text_blocks)})
    for i, frame in enumerate(ex.frames):
        parts.append({"type": "text", "text": f"Kare {i}:"})
        parts.append({
            "type": "image",
            "source": {"type": "base64", "media_type": "image/jpeg", "data": base64.standard_b64encode(frame).decode()},
        })
    parts.append({"type": "text", "text": "Yukarıdaki içerikten tarifi çıkar."})
    return parts


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    inp, out = PRICES.get(model, (4.0, 20.0))
    return round((input_tokens * inp + output_tokens * out) / 1_000_000, 5)


async def extract_recipe(ex: Extracted) -> LLMResult:
    if not settings.anthropic_api_key:
        raise ImportError_("LLM_FAILED", "ANTHROPIC_API_KEY eksik")
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, max_retries=2, timeout=180)
    model = settings.anthropic_model
    try:
        resp = await client.messages.create(
            model=model,
            max_tokens=8000,
            output_config={"effort": "medium", "format": {"type": "json_schema", "schema": RECIPE_SCHEMA}},
            system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": build_user_content(ex)}],
        )
    except anthropic.RateLimitError as exc:
        raise ImportError_("LLM_FAILED", "rate limit", retryable=True) from exc
    except anthropic.APIStatusError as exc:
        raise ImportError_("LLM_FAILED", f"HTTP {exc.status_code}: {exc.message[:200]}", retryable=exc.status_code >= 500) from exc
    except anthropic.APIConnectionError as exc:
        raise ImportError_("LLM_FAILED", str(exc), retryable=True) from exc

    if resp.stop_reason == "refusal":
        raise ImportError_("LLM_FAILED", "refusal")
    text = next((b.text for b in resp.content if b.type == "text"), None)
    if not text:
        raise ImportError_("LLM_FAILED", "boş yanıt", retryable=True)
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ImportError_("LLM_FAILED", f"JSON: {exc}", retryable=True) from exc

    usage = resp.usage
    inp = usage.input_tokens + (usage.cache_read_input_tokens or 0) + (usage.cache_creation_input_tokens or 0)
    cost = estimate_cost(model, inp, usage.output_tokens)
    log.info("llm.done", model=model, input_tokens=inp, output_tokens=usage.output_tokens, cost_usd=cost,
             cache_read=usage.cache_read_input_tokens)
    return LLMResult(recipe=data, input_tokens=inp, output_tokens=usage.output_tokens, cost_usd=cost)
