"""SSRF korumalı HTTP erişimi. Yalnızca http/https; özel, loopback, link-local
ve rezerve IP'ler engellenir. Yönlendirmelerin her adımında kontrol tekrarlanır."""
from __future__ import annotations

import asyncio
import ipaddress
import socket
from urllib.parse import urlsplit

import httpx

from .errors import ImportError_

USER_AGENT = (
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0 Mobile Safari/537.36 TarifDefterim/1.0"
)
MAX_REDIRECTS = 6
MAX_HTML_BYTES = 5 * 1024 * 1024


def _ip_is_public(ip: str) -> bool:
    addr = ipaddress.ip_address(ip)
    return not (
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_multicast
        or addr.is_reserved
        or addr.is_unspecified
        or (addr.version == 6 and addr.ipv4_mapped is not None and not _ip_is_public(str(addr.ipv4_mapped)))
    )


def validate_url(url: str) -> str:
    """Şema ve host kontrolü. Geçerli normalize edilmiş URL döner."""
    url = (url or "").strip()
    try:
        parts = urlsplit(url)
    except ValueError as exc:
        raise ImportError_("INVALID_URL", str(exc)) from exc
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise ImportError_("INVALID_URL")
    host = parts.hostname.lower()
    if host == "localhost" or host.endswith((".local", ".internal")):
        raise ImportError_("BLOCKED_URL", host)
    try:
        ipaddress.ip_address(host)
        # düz IP adresi: açıkça yasak
        raise ImportError_("BLOCKED_URL", host)
    except ValueError:
        pass
    return url


async def assert_public_host(host: str) -> None:
    """DNS çözümlemesi yapıp tüm adreslerin herkese açık olduğunu doğrular."""
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ImportError_("FETCH_FAILED", f"DNS: {host}") from exc
    if not infos:
        raise ImportError_("FETCH_FAILED", f"DNS boş: {host}")
    for info in infos:
        ip = info[4][0]
        if not _ip_is_public(ip):
            raise ImportError_("BLOCKED_URL", f"{host} -> {ip}")


async def safe_get(url: str, *, timeout: float = 20.0, max_bytes: int = MAX_HTML_BYTES) -> httpx.Response:
    """Yönlendirmeleri elle takip eden, her adımda SSRF kontrolü yapan GET."""
    current = validate_url(url)
    async with httpx.AsyncClient(follow_redirects=False, timeout=timeout, headers={"User-Agent": USER_AGENT}) as client:
        for _ in range(MAX_REDIRECTS + 1):
            parts = urlsplit(current)
            await assert_public_host(parts.hostname or "")
            try:
                async with client.stream("GET", current) as resp:
                    if resp.status_code in (301, 302, 303, 307, 308) and resp.headers.get("location"):
                        current = validate_url(str(resp.url.join(resp.headers["location"])))
                        continue
                    if resp.status_code >= 400:
                        raise ImportError_("FETCH_FAILED", f"HTTP {resp.status_code}", retryable=resp.status_code >= 500)
                    chunks: list[bytes] = []
                    size = 0
                    async for chunk in resp.aiter_bytes():
                        size += len(chunk)
                        if size > max_bytes:
                            break
                        chunks.append(chunk)
                    body = b"".join(chunks)
                    return httpx.Response(resp.status_code, headers=resp.headers, content=body, request=resp.request)
            except httpx.HTTPError as exc:
                raise ImportError_("FETCH_FAILED", str(exc), retryable=True) from exc
    raise ImportError_("FETCH_FAILED", "çok fazla yönlendirme")


async def resolve_redirects(url: str, *, timeout: float = 10.0) -> str:
    """Kısa linkleri (vm.tiktok.com, youtu.be, pin.it) son adrese çözer. İçerik indirmez."""
    current = validate_url(url)
    async with httpx.AsyncClient(follow_redirects=False, timeout=timeout, headers={"User-Agent": USER_AGENT}) as client:
        for _ in range(MAX_REDIRECTS):
            parts = urlsplit(current)
            await assert_public_host(parts.hostname or "")
            try:
                resp = await client.head(current)
                if resp.status_code in (405, 403, 400):
                    async with client.stream("GET", current) as r:
                        resp = r
            except httpx.HTTPError:
                return current
            loc = resp.headers.get("location")
            if resp.status_code in (301, 302, 303, 307, 308) and loc:
                current = validate_url(str(resp.url.join(loc)))
                continue
            return current
    return current
