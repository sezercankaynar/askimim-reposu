"""Link → tarif hattı. 1. aşamada yalnızca iskelet; 4. ve 5. aşamada doldurulur."""
from __future__ import annotations

import structlog

from .store import update_job

log = structlog.get_logger()


async def process_job(job: dict) -> None:
    await update_job(
        job["id"],
        status="failed",
        error="Tarif çıkarma hattı henüz kurulmadı.",
        error_code="NOT_IMPLEMENTED",
        progress=0,
    )
