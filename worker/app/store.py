"""Supabase erişimi (iş alma, ilerleme güncelleme). 4. aşamada genişletilir."""
from __future__ import annotations

import asyncio
from functools import lru_cache

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
