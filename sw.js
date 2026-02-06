const CACHE_NAME = "offline-memo-final-v7";
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

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const res = await fetch(req);
      // 同一オリジンだけキャッシュ
      const url = new URL(req.url);
      if (url.origin === self.location.origin) {
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      // SPAフォールバック
      const fallback = await cache.match("./index.html");
      return fallback || new Response("offline", { status: 503 });
    }
  })());
});