const CACHE_NAME = "postpartum-cache-v2";
const APP_SHELL = ["/", "/auth/welcome", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") {
        return;
    }

    // Cache API only supports http/https; skip extension, blob, data, etc.
    let url;
    try {
        url = new URL(request.url);
    } catch {
        return;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        return;
    }

    event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
            try {
                const networkResponse = await fetch(request);
                try {
                    await cache.put(request, networkResponse.clone());
                } catch {
                    // Ignore put failures (opaque responses, quota, etc.)
                }
                return networkResponse;
            } catch {
                const cached = await cache.match(request);
                return cached ?? Response.error();
            }
        })
    );
});
