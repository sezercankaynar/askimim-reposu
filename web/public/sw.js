/* Tarif Defterim service worker: çevrimdışı tarif okuma */
const VERSION = "v1";
const PAGE_CACHE = `pages-${VERSION}`;
const IMG_CACHE = `images-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll([OFFLINE_URL, "/manifest.webmanifest", "/icons/icon-192.png"])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isPage(req) {
  return req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Next.js statik dosyaları: cache-first
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(caches.open(STATIC_CACHE).then(async (c) => (await c.match(req)) || fetch(req).then((r) => (c.put(req, r.clone()), r))));
    return;
  }

  // Tarif ve defter sayfaları: network-first, çevrimdışıysa önbellek, o da yoksa /offline
  if (url.origin === self.location.origin && isPage(req) && /^\/(defter|tarif|alisveris)/.test(url.pathname)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(PAGE_CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match(OFFLINE_URL))),
    );
    return;
  }

  // Kapak fotoğrafları (Supabase storage imzalı URL): stale-while-revalidate, imza parametresi yok sayılır
  if (/\/storage\/v1\/object\/sign\//.test(url.pathname) || req.destination === "image") {
    event.respondWith(
      caches.open(IMG_CACHE).then(async (c) => {
        const cached = await c.match(req, { ignoreSearch: true });
        const network = fetch(req)
          .then((res) => {
            if (res.ok) c.put(req, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
