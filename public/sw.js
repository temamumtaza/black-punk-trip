const CACHE_NAME = "black-punk-trip-public-shell-v6";
const SHELL_URLS = ["/offline.html", "/manifest.webmanifest", "/icons/bp-logo-192.png", "/icons/bp-logo-512.png", "/brand/bp-logo.png"];
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

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() ?? "Ada pembaruan di Black Punk Trip." };
  }

  const title = payload.title || "Black Punk Trip";
  const options = {
    body: payload.body || "Ada pembaruan baru di trip kamu.",
    icon: "/icons/bp-logo-192.png",
    badge: "/icons/bp-logo-192.png",
    tag: payload.tag || payload.eventId || "black-punk-trip",
    renotify: Boolean(payload.renotify),
    data: { url: payload.url || "/app?view=home" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/app?view=home", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("navigate" in client) {
        await client.navigate(targetUrl);
        return client.focus();
      }
    }
    return self.clients.openWindow(targetUrl);
  })());
});
