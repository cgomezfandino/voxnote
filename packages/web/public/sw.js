/* Voxnote service worker: network-first for the app shell so new deploys are
 * visible immediately; cache only as an offline fallback. Whisper model
 * weights are cached separately by transformers.js (Cache API). */
const PAGES = "voxnote-pages-v1";
const STATIC = "voxnote-static-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("voxnote-") && k !== PAGES && k !== STATIC)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGES));
  } else if (
    url.origin === self.location.origin &&
    (request.destination === "script" || request.destination === "style")
  ) {
    event.respondWith(networkFirst(request, STATIC));
  }
});
