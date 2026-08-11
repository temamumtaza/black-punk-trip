const CACHE_NAME = "black-punk-trip-public-shell-v3";
const SHELL_URLS = ["/offline.html", "/manifest.webmanifest", "/icons/icon-192.svg", "/icons/icon-512.svg"];
const IMMUTABLE_ASSET_PREFIX = "/_next/static/";
const MAX_DYNAMIC_ASSETS = 100;

async function cacheAsset(request, response) {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response);
  const shellPaths = new Set(SHELL_URLS);
  const assetKeys = (await cache.keys()).filter((key) => {
    const pathname = new URL(key.url).pathname;
    return !shellPaths.has(pathname);
  });
  if (assetKeys.length > MAX_DYNAMIC_ASSETS) {
    await cache.delete(assetKeys[0]);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    if (url.pathname.startsWith(IMMUTABLE_ASSET_PREFIX)) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok) event.waitUntil(cacheAsset(event.request, response.clone()));
        return response;
      } catch {
        return caches.match(event.request);
      }
    }

    try {
      const response = await fetch(event.request);
      if (response.ok && ["script", "style", "image", "font"].includes(event.request.destination)) {
        event.waitUntil(cacheAsset(event.request, response.clone()));
      }
      return response;
    } catch {
      if (event.request.mode === "navigate") return caches.match("/offline.html");
      return caches.match(event.request);
    }
  })());
});
