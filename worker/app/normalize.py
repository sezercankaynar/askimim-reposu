"""Platform tespiti ve URL normalize etme."""
from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit

from .errors import ImportError_
from .net import resolve_redirects, validate_url

TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
    "igsh", "igshid", "fbclid", "gclid", "si", "feature", "ref", "ref_src", "_t", "_r",
    "is_from_webapp", "sender_device", "sender_web_id", "web_id", "share_app_id", "share_link_id",
    "checksum", "sec_user_id", "source", "sender_id", "mc_cid", "mc_eid", "rlkey",
}

SHORTENERS = {"vm.tiktok.com", "vt.tiktok.com", "youtu.be", "pin.it", "bit.ly", "t.co", "tinyurl.com", "l.instagram.com"}

VIDEO_HOSTS = {
    "youtube": ("youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com"),
    "instagram": ("instagram.com", "www.instagram.com", "m.instagram.com"),
    "tiktok": ("tiktok.com", "www.tiktok.com", "m.tiktok.com", "vm.tiktok.com", "vt.tiktok.com"),
    "pinterest": ("pinterest.com", "www.pinterest.com", "tr.pinterest.com", "pin.it", "pinterest.co.uk", "pinterest.de"),
}


@dataclass
class NormalizedUrl:
    url: str
    platform: str  # youtube | instagram | tiktok | pinterest | web
    is_video: bool


def detect_platform(host: str) -> str:
    host = host.lower()
    for platform, hosts in VIDEO_HOSTS.items():
        if host in hosts or any(host.endswith("." + h) for h in hosts):
            return platform
    return "web"


def _strip_tracking(url: str) -> str:
    parts = urlsplit(url)
    q = [(k, v) for k, v in parse_qs(parts.query, keep_blank_values=False).items() if k not in TRACKING_PARAMS]
    query = urlencode([(k, vs[0]) for k, vs in q])
    return urlunsplit((parts.scheme, parts.netloc.lower(), parts.path.rstrip("/") or "/", query, ""))


def canonicalize(url: str) -> NormalizedUrl:
    """Platforma göre kanonik biçim. (Yönlendirme takibi yapmaz; bkz. normalize_url)"""
    url = validate_url(url)
    parts = urlsplit(url)
    host = (parts.hostname or "").lower()
    platform = detect_platform(host)

    if platform == "youtube":
        vid = None
        if host == "youtu.be":
            vid = parts.path.strip("/").split("/")[0]
        else:
            m = re.match(r"^/(?:shorts|embed|live|v)/([\w-]{11})", parts.path)
            if m:
                vid = m.group(1)
            else:
                vid = parse_qs(parts.query).get("v", [None])[0]
        if not vid or not re.fullmatch(r"[\w-]{11}", vid):
            raise ImportError_("UNSUPPORTED_PLATFORM", "YouTube video kimliği bulunamadı")
        return NormalizedUrl(f"https://www.youtube.com/watch?v={vid}", "youtube", True)

    if platform == "instagram":
        m = re.match(r"^/(?:[\w.]+/)?(reel|reels|p|tv)/([\w-]+)", parts.path)
        if not m:
            raise ImportError_("UNSUPPORTED_PLATFORM", "Instagram gönderi linki bekleniyor")
        kind = "reel" if m.group(1) in ("reel", "reels") else m.group(1)
        return NormalizedUrl(f"https://www.instagram.com/{kind}/{m.group(2)}/", "instagram", True)

    if platform == "tiktok":
        m = re.match(r"^/(@[\w.-]+)/(?:video|photo)/(\d+)", parts.path)
        if m:
            return NormalizedUrl(f"https://www.tiktok.com/{m.group(1)}/video/{m.group(2)}", "tiktok", True)
        m = re.match(r"^/(?:t/)?([\w]+)/?$", parts.path)
        if m or host in SHORTENERS:
            # çözülmemiş kısa link
            return NormalizedUrl(_strip_tracking(url), "tiktok", True)
        raise ImportError_("UNSUPPORTED_PLATFORM", "TikTok video linki bekleniyor")

    if platform == "pinterest":
        m = re.match(r"^/pin/(\d+)", parts.path)
        if m:
            return NormalizedUrl(f"https://www.pinterest.com/pin/{m.group(1)}/", "pinterest", True)
        if host == "pin.it":
            return NormalizedUrl(_strip_tracking(url), "pinterest", True)
        raise ImportError_("UNSUPPORTED_PLATFORM", "Pinterest pin linki bekleniyor")

    return NormalizedUrl(_strip_tracking(url), "web", False)


async def normalize_url(url: str) -> NormalizedUrl:
    """Kısa linkleri açar, takip parametrelerini temizler, kanonik biçime getirir."""
    url = validate_url(url)
    host = (urlsplit(url).hostname or "").lower()
    if host in SHORTENERS:
        url = await resolve_redirects(url)
    return canonicalize(url)
