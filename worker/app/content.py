"""Çıkarma hattının ara veri yapıları."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Extracted:
    """Kaynaktan toplanan ham bağlam. Claude'a tek parça olarak gider."""

    platform: str
    url: str
    title: str | None = None
    description: str | None = None  # açıklama / caption / sayfa metni
    transcript: str | None = None
    subtitles: str | None = None
    json_ld: dict | None = None
    author: str | None = None
    author_url: str | None = None
    thumbnail_url: str | None = None
    duration: float | None = None
    frames: list[bytes] = field(default_factory=list)  # JPEG kareler
    cover_bytes: bytes | None = None
    meta: dict = field(default_factory=dict)

    def has_text(self) -> bool:
        return bool((self.description or "").strip() or (self.transcript or "").strip() or self.json_ld)
