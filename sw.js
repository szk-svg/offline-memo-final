const CACHE_NAME = "offline-memo-final-v9";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // 強制リロードで取りに行く（古いHTTPキャッシュを避ける）
    await cache.addAll(APP_SHELL.map(u => new Request(u, { cache: "reload" })));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

// index.html / ルートは「ネット優先」＝更新が入りやすい
async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const res = await fetch(req);
    cache.put(req, res.clone());
    return res;
  } catch (_) {
    const cached = await cache.match(req);
    return cached || caches.match("./index.html");
  }
}

// それ以外は「キャッシュ優先」＝速い
async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  const res = await fetch(req);
  const cache = await caches.open(CACHE_NAME);
  cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 同一オリジンだけ対象
  if (url.origin !== location.origin) return;

  const isNav = req.mode === "navigate";
  const isIndex = url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");

  if (isNav || isIndex) {
    event.respondWith(networkFirst(new Request("./index.html")));
    return;
  }

  event.respondWith(cacheFirst(req));
});