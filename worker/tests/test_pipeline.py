"""Her platformdan bir örnek link ile uçtan uca hat testi (yt-dlp, Whisper, Claude ve Supabase mock'lu)."""
import json
from pathlib import Path

import pytest

from app import pipeline, store
from app.content import Extracted
from app.llm import LLMResult
from app.sources import video, website

FIX = Path(__file__).parent / "fixtures"
LLM_PAYLOAD = json.loads((FIX / "llm_recipe.json").read_text())


class FakeStore:
    """store modülünün yerine geçen bellek içi kayıt."""

    def __init__(self):
        self.jobs: dict[str, dict] = {}
        self.recipes: list[dict] = []
        self.covers: list[bytes] = []

    async def update_job(self, job_id, **fields):
        self.jobs.setdefault(job_id, {}).update(fields)

    async def find_existing_recipe(self, user_id, normalized_url):
        for r in self.recipes:
            if r["user_id"] == user_id and r["source_normalized_url"] == normalized_url:
                return r["id"]
        return None

    async def imports_last_24h(self, user_id):
        return 1

    async def upload_cover(self, user_id, data):
        self.covers.append(data)
        return f"covers/{user_id}/x.jpg"

    async def insert_recipe(self, row):
        row = dict(row, id=f"r{len(self.recipes) + 1}")
        self.recipes.append(row)
        return row["id"]

    async def download_upload(self, path):
        return b"\xff\xd8shot"


@pytest.fixture
def fake(monkeypatch):
    fs = FakeStore()
    for name in ("update_job", "find_existing_recipe", "imports_last_24h", "upload_cover", "insert_recipe", "download_upload"):
        monkeypatch.setattr(store, name, getattr(fs, name))

    async def fake_llm(ex: Extracted):
        fs.last_extracted = ex
        return LLMResult(recipe=LLM_PAYLOAD, input_tokens=1500, output_tokens=400, cost_usd=0.014)

    monkeypatch.setattr(pipeline, "extract_recipe", fake_llm)

    async def fake_thumb(url):
        return b"\xff\xd8thumb" if url else None

    monkeypatch.setattr(pipeline, "fetch_thumbnail", fake_thumb)
    return fs


def _mock_ytdlp(monkeypatch, fixture: str, *, download_ok=True):
    info = json.loads((FIX / fixture).read_text())
    monkeypatch.setattr(video, "fetch_info", lambda url, workdir, platform: info)
    calls = {"download": 0}

    def fake_download(url, workdir, platform):
        calls["download"] += 1
        if not download_ok:
            raise pipeline.ImportError_("INSTAGRAM_LOGIN_REQUIRED", "login required")
        p = Path(workdir) / "video.mp4"
        p.write_bytes(b"fake")
        return str(p)

    monkeypatch.setattr(video, "download_lowest", fake_download)
    monkeypatch.setattr(pipeline, "download_lowest", fake_download)
    return calls


def _mock_media(monkeypatch):
    async def fake_audio(video_path, workdir):
        return str(Path(workdir) / "audio.m4a")

    async def fake_transcribe(audio_path):
        return "bir su bardağı un ekliyoruz, üç yumurta kırıyoruz", 38.0

    async def fake_frames(video_path, workdir, max_frames=None):
        return [b"\xff\xd8f1", b"\xff\xd8f2", b"\xff\xd8f3"]

    monkeypatch.setattr(pipeline.media, "extract_audio", fake_audio)
    monkeypatch.setattr(pipeline.media, "transcribe", fake_transcribe)
    monkeypatch.setattr(pipeline.media, "extract_frames", fake_frames)


def _job(url, **extra):
    return {"id": "job1", "user_id": "u1", "url": url, "kind": "url", "target_status": "todo", **extra}


async def test_recipe_site_jsonld(fake, monkeypatch):
    html = (FIX / "recipe_site.html").read_text()

    async def fake_site(url):
        return website.parse_html(html, url)

    monkeypatch.setattr(pipeline, "extract_website", fake_site)
    await pipeline.process_job(_job("https://example.com/banana-bread?utm_source=x"))
    job = fake.jobs["job1"]
    assert job["status"] == "done" and job["progress"] == 100
    assert job["normalized_url"] == "https://example.com/banana-bread"
    r = fake.recipes[0]
    assert r["source_platform"] == "web" and r["source_author"] == "Jane Baker"
    assert r["needs_review"] is True and r["cover_path"].startswith("covers/")
    assert fake.last_extracted.json_ld["name"] == "Best Banana Bread"
    assert job["cost_usd"] == 0.014 and job["input_tokens"] == 1500


async def test_youtube_description_complete_skips_download(fake, monkeypatch):
    calls = _mock_ytdlp(monkeypatch, "youtube_info.json")
    await pipeline.process_job(_job("https://youtu.be/dQw4w9WgXcQ?si=abc"))
    job = fake.jobs["job1"]
    assert job["status"] == "done"
    assert job["platform"] == "youtube"
    assert calls["download"] == 0, "açıklama yeterliyse video indirilmez"
    assert fake.recipes[0]["source_normalized_url"] == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    assert job["meta"]["description_complete"] is True


async def test_tiktok_downloads_transcribes_and_reads_frames(fake, monkeypatch):
    calls = _mock_ytdlp(monkeypatch, "tiktok_info.json")
    _mock_media(monkeypatch)
    await pipeline.process_job(_job("https://www.tiktok.com/@ornekhesap/video/7301234567890123456"))
    job = fake.jobs["job1"]
    assert job["status"] == "done"
    assert calls["download"] == 1
    ex = fake.last_extracted
    assert "yumurta" in ex.transcript and len(ex.frames) == 3
    assert job["transcribe_seconds"] == 38.0
    assert job["meta"]["frames"] == 3


async def test_pinterest_video(fake, monkeypatch):
    _mock_ytdlp(monkeypatch, "pinterest_info.json")
    _mock_media(monkeypatch)
    await pipeline.process_job(_job("https://www.pinterest.com/pin/123456789012345678/"))
    assert fake.jobs["job1"]["status"] == "done"
    assert fake.jobs["job1"]["platform"] == "pinterest"


async def test_instagram_login_required_gives_clear_message(fake, monkeypatch):
    _mock_ytdlp(monkeypatch, "instagram_info.json", download_ok=False)
    await pipeline.process_job(_job("https://www.instagram.com/reel/CxYz123/?igsh=abc"))
    job = fake.jobs["job1"]
    assert job["status"] == "failed"
    assert job["error_code"] == "INSTAGRAM_LOGIN_REQUIRED"
    assert "ekran görüntü" in job["error"].lower()


async def test_cover_frame_chosen_by_llm(fake, monkeypatch):
    _mock_ytdlp(monkeypatch, "tiktok_info.json")
    _mock_media(monkeypatch)

    async def fake_llm(ex):
        return LLMResult(recipe=dict(LLM_PAYLOAD, cover_frame_index=1), input_tokens=1, output_tokens=1, cost_usd=0.0)

    monkeypatch.setattr(pipeline, "extract_recipe", fake_llm)
    await pipeline.process_job(_job("https://www.tiktok.com/@ornekhesap/video/7301234567890123456"))
    assert fake.covers[-1] == b"\xff\xd8f2"


async def test_duplicate_link_points_to_existing_recipe(fake, monkeypatch):
    _mock_ytdlp(monkeypatch, "youtube_info.json")
    await pipeline.process_job(_job("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))
    await pipeline.process_job(dict(_job("https://youtube.com/shorts/dQw4w9WgXcQ"), id="job2"))
    assert fake.jobs["job2"]["status"] == "duplicate"
    assert fake.jobs["job2"]["recipe_id"] == fake.recipes[0]["id"]
    assert len(fake.recipes) == 1


async def test_no_recipe_found(fake, monkeypatch):
    _mock_ytdlp(monkeypatch, "youtube_info.json")

    async def fake_llm(ex):
        return LLMResult(recipe={"found": False, "ingredients": []}, input_tokens=10, output_tokens=5, cost_usd=0.001)

    monkeypatch.setattr(pipeline, "extract_recipe", fake_llm)
    await pipeline.process_job(_job("https://www.youtube.com/watch?v=dQw4w9WgXcQ"))
    job = fake.jobs["job1"]
    assert job["status"] == "failed" and job["error_code"] == "NO_RECIPE_FOUND"
    assert job["cost_usd"] == 0.001


async def test_screenshots_job(fake):
    await pipeline.process_job({"id": "job3", "user_id": "u1", "url": "", "kind": "screenshots", "target_status": "made",
                                "upload_paths": ["import-uploads/u1/a.jpg", "import-uploads/u1/b.jpg"]})
    job = fake.jobs["job3"]
    assert job["status"] == "done"
    assert fake.recipes[-1]["status"] == "made" and fake.recipes[-1]["source_url"] is None
    assert len(fake.last_extracted.frames) == 2


async def test_retry_then_fail(fake, monkeypatch):
    attempts = {"n": 0}

    async def flaky(url):
        attempts["n"] += 1
        raise pipeline.ImportError_("FETCH_FAILED", "500", retryable=True)

    monkeypatch.setattr(pipeline, "extract_website", flaky)
    monkeypatch.setattr(pipeline.asyncio, "sleep", _nosleep)
    await pipeline.process_job(_job("https://example.com/x"))
    assert attempts["n"] == 3
    assert fake.jobs["job1"]["error_code"] == "FETCH_FAILED"


async def _nosleep(_):
    return None


def test_description_heuristic():
    assert video.description_is_complete(json.loads((FIX / "youtube_info.json").read_text())["description"])
    assert not video.description_is_complete("en kolay menemen 🍳 #tarif")
