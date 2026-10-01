"""ffmpeg ile ses çıkarma ve anahtar kare alma; Whisper ile yazıya dökme."""
from __future__ import annotations

import asyncio
import os
import shutil
from pathlib import Path

import httpx
import structlog

from .config import settings
from .errors import ImportError_

log = structlog.get_logger()

FFMPEG = shutil.which("ffmpeg") or "ffmpeg"
FFPROBE = shutil.which("ffprobe") or "ffprobe"


async def _run(*cmd: str, timeout: float = 180) -> tuple[int, bytes, bytes]:
    proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    try:
        out, err = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except TimeoutError:
        proc.kill()
        raise
    return proc.returncode or 0, out, err


async def probe_duration(video_path: str) -> float | None:
    code, out, _ = await _run(FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video_path, timeout=30)
    try:
        return float(out.decode().strip()) if code == 0 else None
    except ValueError:
        return None


async def extract_audio(video_path: str, workdir: str) -> str:
    """16 kHz mono m4a (Whisper için küçük dosya)."""
    out = os.path.join(workdir, "audio.m4a")
    code, _, err = await _run(
        FFMPEG, "-y", "-i", video_path, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "48k", "-c:a", "aac", out, timeout=240
    )
    if code != 0 or not os.path.exists(out):
        raise ImportError_("TRANSCRIBE_FAILED", err.decode(errors="ignore")[-300:])
    return out


async def extract_frames(video_path: str, workdir: str, max_frames: int | None = None) -> list[bytes]:
    """Sahne değişimlerinden kare alır; azsa eşit aralıklı karelerle tamamlar. 6-10 kare döner."""
    max_frames = max_frames or settings.max_frames
    frames_dir = Path(workdir) / "frames"
    frames_dir.mkdir(exist_ok=True)

    # 1) sahne değişimleri
    await _run(
        FFMPEG, "-y", "-i", video_path,
        "-vf", "select='gt(scene,0.3)',scale=640:-2",
        "-vsync", "vfr", "-frames:v", str(max_frames), "-q:v", "4",
        str(frames_dir / "scene_%02d.jpg"), timeout=240,
    )
    files = sorted(frames_dir.glob("scene_*.jpg"))

    # 2) eşit aralıklı tamamlama
    min_frames = min(6, max_frames)
    if len(files) < min_frames:
        duration = await probe_duration(video_path) or 30.0
        n = max_frames - len(files)
        await _run(
            FFMPEG, "-y", "-i", video_path,
            "-vf", f"fps=1/{max(duration / n, 0.5):.3f},scale=640:-2",
            "-frames:v", str(n), "-q:v", "4",
            str(frames_dir / "even_%02d.jpg"), timeout=240,
        )
        files = sorted(frames_dir.glob("*.jpg"))

    out: list[bytes] = []
    for f in files[:max_frames]:
        out.append(f.read_bytes())
    return out


async def transcribe(audio_path: str) -> tuple[str, float]:
    """Whisper (Groq ya da OpenAI). (metin, saniye) döner."""
    provider = settings.transcribe_provider.lower()
    if provider == "groq":
        url, key, model = "https://api.groq.com/openai/v1/audio/transcriptions", settings.groq_api_key, "whisper-large-v3-turbo"
    elif provider == "openai":
        url, key, model = "https://api.openai.com/v1/audio/transcriptions", settings.openai_api_key, "whisper-1"
    else:
        raise ImportError_("TRANSCRIBE_FAILED", f"bilinmeyen sağlayıcı: {provider}")
    if not key:
        raise ImportError_("TRANSCRIBE_FAILED", "API anahtarı eksik")

    size = os.path.getsize(audio_path)
    if size > 24 * 1024 * 1024:
        raise ImportError_("TRANSCRIBE_FAILED", "ses dosyası 25 MB sınırını aşıyor")

    audio_bytes = await asyncio.to_thread(Path(audio_path).read_bytes)
    async with httpx.AsyncClient(timeout=180) as client:
        try:
            r = await client.post(
                url,
                headers={"Authorization": f"Bearer {key}"},
                data={"model": model, "response_format": "verbose_json", "prompt": "Yemek tarifi. Malzemeler ve ölçüler."},
                files={"file": ("audio.m4a", audio_bytes, "audio/mp4")},
            )
        except httpx.HTTPError as exc:
            raise ImportError_("TRANSCRIBE_FAILED", str(exc), retryable=True) from exc
    if r.status_code != 200:
        raise ImportError_("TRANSCRIBE_FAILED", f"HTTP {r.status_code}: {r.text[:200]}", retryable=r.status_code >= 500)
    data = r.json()
    return (data.get("text") or "").strip(), float(data.get("duration") or 0)
