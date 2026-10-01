"""Link → tarif hattı. Her adım import_jobs.status / progress / step_label alanlarını günceller."""
from __future__ import annotations

import asyncio
import shutil
import uuid
from collections.abc import Awaitable, Callable
from typing import TypeVar

import structlog

from . import media, store
from .config import settings
from .content import Extracted
from .errors import ImportError_
from .llm import extract_recipe
from .normalize import normalize_url
from .sources.video import (
    description_is_complete,
    download_lowest,
    extract_video_metadata,
    fetch_thumbnail,
    make_workdir,
)
from .sources.website import extract_website

log = structlog.get_logger()
T = TypeVar("T")

STEPS = {
    "fetching": (10, "Link inceleniyor"),
    "downloading": (30, "Video indiriliyor"),
    "transcribing": (50, "Ses yazıya dökülüyor"),
    "reading_frames": (65, "Görseller okunuyor"),
    "writing": (80, "Tarif yazılıyor"),
    "done": (100, "Deftere eklendi"),
}


async def set_step(job_id: str, status: str, label: str | None = None, progress: int | None = None) -> None:
    p, default_label = STEPS.get(status, (None, None))
    await store.update_job(
        job_id,
        status=status,
        progress=progress if progress is not None else p,
        step_label=label or default_label,
    )


async def with_retry(fn: Callable[[], Awaitable[T]], *, attempts: int = 3, label: str = "") -> T:
    """Hatalı adımı 2 kez daha dener (toplam 3). Yalnızca retryable hatalar tekrarlanır."""
    delay = 2.0
    last: Exception | None = None
    for i in range(attempts):
        try:
            return await fn()
        except ImportError_ as exc:
            last = exc
            if not exc.retryable or i == attempts - 1:
                raise
        except (TimeoutError, OSError) as exc:
            last = exc
            if i == attempts - 1:
                raise ImportError_("UNKNOWN", str(exc)) from exc
        log.warning("step.retry", step=label, attempt=i + 1, error=str(last))
        await asyncio.sleep(delay)
        delay *= 2
    raise ImportError_("UNKNOWN", str(last))


async def gather_video(job_id: str, url: str, platform: str, workdir: str) -> Extracted:
    ex, _info = await with_retry(lambda: extract_video_metadata(url, platform, workdir), label="metadata")
    ex.cover_bytes = await fetch_thumbnail(ex.thumbnail_url)

    complete = description_is_complete(ex.description) or description_is_complete(ex.subtitles)
    ex.meta["description_complete"] = complete
    if complete:
        log.info("video.skip_download", reason="açıklama yeterli")
        return ex

    await set_step(job_id, "downloading")
    video_path = await with_retry(lambda: asyncio.to_thread(download_lowest, url, workdir, platform), label="download")

    if not ex.subtitles:
        await set_step(job_id, "transcribing")
        try:
            audio = await media.extract_audio(video_path, workdir)
            text, seconds = await with_retry(lambda: media.transcribe(audio), label="transcribe")
            ex.transcript = text
            ex.meta["transcribe_seconds"] = seconds
        except ImportError_ as exc:
            # Transkript olmadan da (kareler + açıklama ile) devam edilebilir
            log.warning("transcribe.skipped", error=str(exc))
            ex.meta["transcribe_error"] = exc.code

    await set_step(job_id, "reading_frames")
    ex.frames = await media.extract_frames(video_path, workdir)
    ex.meta["frames"] = len(ex.frames)
    return ex


async def gather_screenshots(upload_paths: list[str]) -> Extracted:
    ex = Extracted(platform="screenshots", url="")
    for p in upload_paths[:10]:
        try:
            ex.frames.append(await store.download_upload(p))
        except Exception as exc:  # noqa: BLE001
            log.warning("upload.read_failed", path=p, error=str(exc))
    if not ex.frames:
        raise ImportError_("NO_RECIPE_FOUND", "ekran görüntüsü okunamadı")
    ex.cover_bytes = ex.frames[0]
    return ex


def build_recipe_row(job: dict, ex: Extracted, data: dict, cover_path: str | None, normalized_url: str | None) -> dict:
    ingredients = []
    for ing in data.get("ingredients") or []:
        ingredients.append({
            "id": uuid.uuid4().hex[:8],
            "name": ing.get("name") or "",
            "amount": ing.get("amount"),
            "amount_max": ing.get("amount_max"),
            "unit": ing.get("unit"),
            "note": ing.get("note"),
            "group": ing.get("group"),
            "estimated": bool(ing.get("estimated")),
            "confidence": ing.get("confidence", 1.0),
        })
    conf = data.get("confidence") or {}
    return {
        "user_id": job["user_id"],
        "title": data.get("title") or ex.title or "İsimsiz tarif",
        "status": job.get("target_status") or "todo",
        "category": data.get("category") or "Diğer",
        "subcategory": data.get("subcategory"),
        "servings": data.get("servings"),
        "original_servings": data.get("servings"),
        "time_text": data.get("time_text"),
        "ingredients": ingredients,
        "steps": [s for s in (data.get("steps") or []) if s],
        "notes": data.get("notes"),
        "cover_path": cover_path,
        "source_url": job["url"] if job.get("kind") != "screenshots" else None,
        "source_normalized_url": normalized_url,
        "source_platform": ex.platform,
        "source_author": ex.author,
        "source_author_url": ex.author_url,
        "confidence": conf,
        "needs_review": True,  # her otomatik tarif "kontrol et" rozeti alır
        "made_at": None,
    }


async def process_job(job: dict) -> None:
    job_id = job["id"]
    workdir = make_workdir()
    structlog.contextvars.bind_contextvars(job_id=job_id)
    try:
        await _process(job, workdir)
    except ImportError_ as exc:
        log.warning("job.failed", code=exc.code, detail=exc.detail)
        await store.update_job(job_id, status="failed", error=exc.message, error_code=exc.code, finished_at="now()")
    except Exception as exc:
        log.exception("job.crashed", error=str(exc))
        err = ImportError_("UNKNOWN", str(exc))
        await store.update_job(job_id, status="failed", error=err.message, error_code="UNKNOWN", finished_at="now()")
    finally:
        shutil.rmtree(workdir, ignore_errors=True)  # indirilen video/ses silinir
        structlog.contextvars.unbind_contextvars("job_id")


async def _process(job: dict, workdir: str) -> None:
    job_id = job["id"]
    user_id = job["user_id"]

    # Günlük limit (web tarafı da kontrol eder; burada ikinci savunma)
    if await store.imports_last_24h(user_id) > settings.daily_import_limit:
        raise ImportError_("DAILY_LIMIT")

    normalized_url: str | None = None
    if job.get("kind") == "screenshots":
        await set_step(job_id, "reading_frames", "Ekran görüntüleri okunuyor")
        ex = await gather_screenshots(job.get("upload_paths") or [])
    else:
        await set_step(job_id, "fetching")
        norm = await normalize_url(job["url"])
        normalized_url = norm.url
        await store.update_job(job_id, normalized_url=norm.url, platform=norm.platform)

        existing = await store.find_existing_recipe(user_id, norm.url)
        if existing:
            await store.update_job(
                job_id, status="duplicate", progress=100, step_label="Zaten defterde", recipe_id=existing, finished_at="now()"
            )
            return

        if norm.is_video:
            ex = await gather_video(job_id, norm.url, norm.platform, workdir)
        else:
            ex = await with_retry(lambda: extract_website(norm.url), label="website")
            ex.cover_bytes = await fetch_thumbnail(ex.thumbnail_url)

    if not ex.has_text() and not ex.frames:
        raise ImportError_("NO_RECIPE_FOUND", "metin ve görsel yok")

    await set_step(job_id, "writing")
    result = await with_retry(lambda: extract_recipe(ex), label="llm")
    data = result.recipe
    if not data.get("found") or not data.get("ingredients"):
        await store.update_job(
            job_id, input_tokens=result.input_tokens, output_tokens=result.output_tokens, cost_usd=result.cost_usd
        )
        raise ImportError_("NO_RECIPE_FOUND")

    # Kapak: Claude'un seçtiği kare > küçük resim
    cover_bytes = ex.cover_bytes
    idx = data.get("cover_frame_index")
    if isinstance(idx, int) and 0 <= idx < len(ex.frames):
        cover_bytes = ex.frames[idx]
    cover_path = await store.upload_cover(user_id, cover_bytes) if cover_bytes else None

    row = build_recipe_row(job, ex, data, cover_path, normalized_url)
    recipe_id = await store.insert_recipe(row)

    await store.update_job(
        job_id,
        status="done",
        progress=100,
        step_label="Deftere eklendi",
        recipe_id=recipe_id,
        input_tokens=result.input_tokens,
        output_tokens=result.output_tokens,
        transcribe_seconds=ex.meta.get("transcribe_seconds", 0),
        cost_usd=result.cost_usd,
        finished_at="now()",
        meta={k: v for k, v in ex.meta.items() if k != "ytdlp_id"} | {"source_kind": ex.meta.get("source_kind")},
    )
    log.info("job.done", recipe_id=recipe_id, cost_usd=result.cost_usd, tokens=(result.input_tokens, result.output_tokens))
