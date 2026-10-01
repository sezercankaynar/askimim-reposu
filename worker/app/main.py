"""FastAPI girişi. /health canlılık kontrolü, /wake ise web uygulamasının
yeni iş eklendiğinde worker'ı dürtmesi için kullanılır. Kuyruk döngüsü
uygulama açılırken arka planda başlar."""
from __future__ import annotations

import asyncio
import contextlib

import structlog
from fastapi import FastAPI, Header, HTTPException

from .config import settings

log = structlog.get_logger()


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    task: asyncio.Task | None = None
    if settings.configured:
        from .queue import run_forever

        task = asyncio.create_task(run_forever())
        log.info("queue.started")
    else:
        log.warning("queue.disabled", reason="SUPABASE_URL / SERVICE_ROLE_KEY eksik")
    yield
    if task:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


app = FastAPI(title="Tarif Defterim Worker", lifespan=lifespan)


@app.get("/health")
async def health():
    return {"ok": True, "queue": settings.configured}


@app.post("/wake")
async def wake(x_worker_secret: str = Header(default="")):
    if not settings.worker_shared_secret or x_worker_secret != settings.worker_shared_secret:
        raise HTTPException(status_code=401, detail="unauthorized")
    from .queue import poke

    poke()
    return {"ok": True}
