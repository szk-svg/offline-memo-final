const CACHE_NAME = "offline-memo-final-v7.2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE_NAME) ? null : caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // ★ ナビゲーション(=HTML表示)は network-first（更新が反映されない問題を潰す）
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const fresh = await fetch(req);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (e) {
        const cached = await cache.match("./index.html");
        return cached || new Response("offline", { status: 503 });
      }
    })());
    return;
  }

  // それ以外は cache-first
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const res = await fetch(req);
      const url = new URL(req.url);
      if (url.origin === self.location.origin) {
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      const fallback = await cache.match("./index.html");
      return fallback || new Response("offline", { status: 503 });
    }
  })());
});