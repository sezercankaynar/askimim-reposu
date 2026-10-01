"""Supabase erişimi: iş alma, ilerleme, tarif yazma, kapak yükleme."""
from __future__ import annotations

import asyncio
import io
import uuid
from functools import lru_cache

from PIL import Image
from supabase import Client, create_client

from .config import settings


@lru_cache(maxsize=1)
def client() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def claim_job(worker_id: str) -> dict | None:
    def _run():
        res = client().rpc("claim_import_job", {"worker_id": worker_id}).execute()
        rows = res.data or []
        return rows[0] if rows else None

    return await asyncio.to_thread(_run)


async def update_job(job_id: str, **fields) -> None:
    def _run():
        client().table("import_jobs").update(fields).eq("id", job_id).execute()

    await asyncio.to_thread(_run)


async def find_existing_recipe(user_id: str, normalized_url: str) -> str | None:
    def _run():
        res = (
            client()
            .table("recipes")
            .select("id")
            .eq("user_id", user_id)
            .eq("source_normalized_url", normalized_url)
            .limit(1)
            .execute()
        )
        return res.data[0]["id"] if res.data else None

    return await asyncio.to_thread(_run)


async def imports_last_24h(user_id: str) -> int:
    def _run():
        res = client().rpc("imports_last_24h", {"p_user": user_id}).execute()
        return int(res.data or 0)

    return await asyncio.to_thread(_run)


def _to_jpeg(data: bytes, max_side: int = 1280) -> bytes:
    im = Image.open(io.BytesIO(data))
    im = im.convert("RGB")
    im.thumbnail((max_side, max_side))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=85, optimize=True)
    return buf.getvalue()


async def upload_cover(user_id: str, data: bytes) -> str | None:
    """covers bucket'ına yükler; 'covers/{user}/{id}.jpg' döner."""
    try:
        jpeg = await asyncio.to_thread(_to_jpeg, data)
    except Exception:  # noqa: BLE001
        return None
    path = f"{user_id}/{uuid.uuid4().hex}.jpg"

    def _run():
        client().storage.from_("covers").upload(path, jpeg, {"content-type": "image/jpeg"})

    await asyncio.to_thread(_run)
    return f"covers/{path}"


async def download_upload(path: str) -> bytes:
    """import-uploads bucket'ından dosya indirir ('import-uploads/{user}/x.jpg')."""
    bucket, _, key = path.partition("/")

    def _run():
        return client().storage.from_(bucket).download(key)

    return await asyncio.to_thread(_run)


async def insert_recipe(row: dict) -> str:
    def _run():
        res = client().table("recipes").insert(row).execute()
        return res.data[0]["id"]

    return await asyncio.to_thread(_run)
