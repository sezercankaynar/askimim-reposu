"""Video platformları: yt-dlp ile metadata (+ gerekirse en düşük kalitede video)."""
from __future__ import annotations

import asyncio
import base64
import os
import re
import tempfile
from pathlib import Path

import httpx
import structlog
import yt_dlp

from ..config import settings
from ..content import Extracted
from ..errors import ImportError_
from ..net import USER_AGENT, safe_get

log = structlog.get_logger()

# Miktar+birim içeren satır: "2 su bardağı un", "1 cup flour", "200 g kıyma"
_QTY_RE = re.compile(
    r"(^|\n)\s*[-•*]?\s*(\d+[.,/]?\d*|½|¼|¾|yarım|bir|iki|üç)\s*"
    r"(su bardağı|çay bardağı|bardak|kaşı[kğ]|yemek k|çay k|tatlı k|adet|paket|g\b|gr\b|gram|kg|ml|lt|litre|"
    r"cup|tbsp|tsp|oz|lb|diş|dal|demet|tutam|yumurta)",
    re.IGNORECASE,
)
_STEP_RE = re.compile(
    r"(karıştır|ekle|pişir|kavur|yoğur|çırp|dök|fırın|kaynat|doğra|servis|ilave|bekle|mix|add|bake|stir|cook|whisk)",
    re.IGNORECASE,
)


def description_is_complete(text: str | None) -> bool:
    """Açıklamada tarif tam yazıyor mu? (≥3 miktarlı satır ve adım benzeri cümleler)"""
    if not text:
        return False
    qty = len(_QTY_RE.findall(text))
    steps = len(_STEP_RE.findall(text))
    return qty >= 3 and steps >= 2


def _cookie_file() -> str | None:
    if settings.ytdlp_cookies_file and os.path.exists(settings.ytdlp_cookies_file):
        return settings.ytdlp_cookies_file
    if settings.ytdlp_cookies_b64:
        path = Path(settings.tmp_dir) / "cookies.txt"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(base64.b64decode(settings.ytdlp_cookies_b64))
        return str(path)
    return None


def _base_opts(workdir: str) -> dict:
    opts: dict = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
        "writesubtitles": False,
        "http_headers": {"User-Agent": USER_AGENT},
        "paths": {"home": workdir, "temp": workdir},
        "socket_timeout": 30,
        "retries": 2,
    }
    cookies = _cookie_file()
    if cookies:
        opts["cookiefile"] = cookies
    return opts


def _map_ytdlp_error(exc: Exception, platform: str) -> ImportError_:
    msg = str(exc).lower()
    if platform == "instagram" and ("login" in msg or "rate-limit" in msg or "cookies" in msg or "not available" in msg):
        return ImportError_("INSTAGRAM_LOGIN_REQUIRED", str(exc)[:300])
    if "private" in msg or "unavailable" in msg or "removed" in msg or "404" in msg:
        return ImportError_("PRIVATE_CONTENT", str(exc)[:300])
    if "file is larger" in msg or "too large" in msg:
        return ImportError_("VIDEO_TOO_LARGE", str(exc)[:300])
    return ImportError_("DOWNLOAD_FAILED", str(exc)[:300], retryable=True)


def fetch_info(url: str, workdir: str, platform: str) -> dict:
    """yt-dlp metadata (senkron; thread içinde çağrılır)."""
    try:
        with yt_dlp.YoutubeDL(_base_opts(workdir)) as ydl:
            info = ydl.extract_info(url, download=False)
            return ydl.sanitize_info(info)
    except yt_dlp.utils.DownloadError as exc:
        raise _map_ytdlp_error(exc, platform) from exc


def download_lowest(url: str, workdir: str, platform: str) -> str:
    """Videoyu en düşük uygun kalitede indirir, dosya yolunu döner."""
    max_bytes = settings.max_video_mb * 1024 * 1024
    opts = _base_opts(workdir) | {
        "skip_download": False,
        # 480p'ye kadar en küçük mp4; olmazsa en kötü
        "format": "worst[height<=480][ext=mp4]/worst[ext=mp4]/worst",
        "outtmpl": os.path.join(workdir, "video.%(ext)s"),
        "max_filesize": max_bytes,
        "match_filter": yt_dlp.utils.match_filter_func(f"duration <= {settings.max_video_seconds}"),
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            path = ydl.prepare_filename(info)
    except yt_dlp.utils.DownloadError as exc:
        raise _map_ytdlp_error(exc, platform) from exc
    if not os.path.exists(path):
        candidates = [p for p in Path(workdir).glob("video.*")]
        if not candidates:
            raise ImportError_("DOWNLOAD_FAILED", "dosya bulunamadı", retryable=True)
        path = str(candidates[0])
    if os.path.getsize(path) > max_bytes:
        raise ImportError_("VIDEO_TOO_LARGE")
    return path


def _subtitle_text(info: dict) -> str | None:
    subs = info.get("subtitles") or {}
    auto = info.get("automatic_captions") or {}
    for lang in ("tr", "en", "tr-orig", "en-orig"):
        for src in (subs, auto):
            if lang in src:
                for fmt in src[lang]:
                    if fmt.get("ext") in ("vtt", "srv3", "json3", "ttml") and fmt.get("url"):
                        return fmt["url"]
    return None


def _vtt_to_text(vtt: str) -> str:
    lines = []
    seen = set()
    for line in vtt.splitlines():
        line = line.strip()
        if not line or "-->" in line or line.startswith(("WEBVTT", "Kind:", "Language:", "NOTE")) or line.isdigit():
            continue
        line = re.sub(r"<[^>]+>", "", line)
        if line and line not in seen:
            seen.add(line)
            lines.append(line)
    return " ".join(lines)


async def _download_subtitles(url: str) -> str | None:
    try:
        async with httpx.AsyncClient(timeout=20, headers={"User-Agent": USER_AGENT}, follow_redirects=True) as c:
            r = await c.get(url)
            if r.status_code == 200 and r.text:
                return _vtt_to_text(r.text)[:20000]
    except httpx.HTTPError:
        return None
    return None


async def fetch_thumbnail(url: str | None) -> bytes | None:
    if not url:
        return None
    try:
        resp = await safe_get(url, timeout=15, max_bytes=8 * 1024 * 1024)
        if resp.headers.get("content-type", "").startswith("image/") or url.endswith((".jpg", ".jpeg", ".png", ".webp")):
            return resp.content
    except ImportError_:
        return None
    return None


async def extract_video_metadata(url: str, platform: str, workdir: str) -> tuple[Extracted, dict]:
    """Metadata'yı alır; video indirmeye karar vermek çağırana kalır."""
    info = await asyncio.to_thread(fetch_info, url, workdir, platform)
    duration = info.get("duration")
    if duration and duration > settings.max_video_seconds:
        raise ImportError_("VIDEO_TOO_LONG", f"{duration}s")

    ex = Extracted(platform=platform, url=url)
    ex.title = info.get("title")
    ex.description = info.get("description") or info.get("caption")
    ex.author = info.get("uploader") or info.get("channel") or info.get("creator")
    ex.author_url = info.get("uploader_url") or info.get("channel_url")
    ex.thumbnail_url = info.get("thumbnail")
    ex.duration = duration
    ex.meta["ytdlp_id"] = info.get("id")

    sub_url = _subtitle_text(info)
    if sub_url:
        ex.subtitles = await _download_subtitles(sub_url)
    return ex, info


def make_workdir() -> str:
    Path(settings.tmp_dir).mkdir(parents=True, exist_ok=True)
    return tempfile.mkdtemp(prefix="job-", dir=settings.tmp_dir)
