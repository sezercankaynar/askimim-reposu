"""Postgres tabanlı iş kuyruğu. Supabase'deki claim_import_job RPC'si ile iş alır."""
from __future__ import annotations

import asyncio
import socket

import structlog

from .config import settings

log = structlog.get_logger()
_wake = asyncio.Event()
WORKER_ID = f"{socket.gethostname()}"


def poke() -> None:
    _wake.set()


async def run_forever() -> None:
    from .pipeline import process_job
    from .store import claim_job

    while True:
        try:
            job = await claim_job(WORKER_ID)
            if job:
                log.info("job.claimed", id=job["id"], url=job["url"])
                await process_job(job)
                continue  # hemen bir sonrakine bak
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001
            log.exception("queue.error", error=str(exc))
        _wake.clear()
        try:
            await asyncio.wait_for(_wake.wait(), timeout=settings.worker_poll_seconds)
        except asyncio.TimeoutError:
            pass
