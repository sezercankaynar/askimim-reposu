import pytest

from app.errors import ImportError_
from app.net import _ip_is_public, validate_url
from app.normalize import canonicalize


def test_youtube_variants_canonicalize():
    for u in [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=abc&feature=share",
        "https://youtu.be/dQw4w9WgXcQ?si=xyz",
        "https://youtube.com/shorts/dQw4w9WgXcQ",
        "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    ]:
        n = canonicalize(u)
        assert n.url == "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        assert n.platform == "youtube" and n.is_video


def test_instagram_reel_and_post():
    assert canonicalize("https://www.instagram.com/reel/CxYz123/?igsh=abc").url == "https://www.instagram.com/reel/CxYz123/"
    assert canonicalize("https://www.instagram.com/reels/CxYz123/").url == "https://www.instagram.com/reel/CxYz123/"
    assert canonicalize("https://www.instagram.com/p/CxYz123/?utm_source=ig").url == "https://www.instagram.com/p/CxYz123/"
    assert canonicalize("https://www.instagram.com/someuser/reel/CxYz123/").platform == "instagram"


def test_tiktok_and_pinterest():
    n = canonicalize("https://www.tiktok.com/@ornek/video/7301234567890123456?is_from_webapp=1&sender_device=pc")
    assert n.url == "https://www.tiktok.com/@ornek/video/7301234567890123456"
    assert n.platform == "tiktok"
    p = canonicalize("https://tr.pinterest.com/pin/123456789012345678/?mt=login")
    assert p.url == "https://www.pinterest.com/pin/123456789012345678/"
    assert p.platform == "pinterest"


def test_web_strips_tracking():
    n = canonicalize("https://www.nefisyemektarifleri.com/islak-kek/?utm_source=x&fbclid=y&sayfa=2")
    assert n.url == "https://www.nefisyemektarifleri.com/islak-kek?sayfa=2"
    assert n.platform == "web" and not n.is_video


@pytest.mark.parametrize(
    "bad",
    ["ftp://example.com/x", "javascript:alert(1)", "http://localhost/x", "http://127.0.0.1/", "http://10.0.0.5/", "http://[::1]/", "not a url"],
)
def test_ssrf_blocked(bad):
    with pytest.raises(ImportError_) as exc:
        validate_url(bad)
    assert exc.value.code in ("INVALID_URL", "BLOCKED_URL")


def test_private_ips_detected():
    assert not _ip_is_public("192.168.1.1")
    assert not _ip_is_public("169.254.169.254")
    assert not _ip_is_public("::ffff:10.0.0.1")
    assert _ip_is_public("8.8.8.8")
