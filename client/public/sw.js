// ─── Service Worker (Section 5: Browser Storage) ──────────────────────────────
// Caches the app shell so it loads even without network connection.

const CACHE_NAME = "whatsapp-clone-v1";

// Core app assets to cache on install
const PRECACHE_URLS = [
    "/",
    "/index.html",
];

// Install: pre-cache core shell
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[SW] Pre-caching app shell");
            return cache.addAll(PRECACHE_URLS);
        }).then(() => self.skipWaiting())
    );
});

// Activate: clean up old caches from previous versions
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log("[SW] Deleting old cache:", name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: serve from cache first, fall back to network (Cache-first strategy)
self.addEventListener("fetch", (event) => {
    // Only handle GET requests
    if (event.request.method !== "GET") return;

    // Skip API, socket, and cross-origin requests — always go to network for these
    const url = new URL(event.request.url);
    const isApiRequest = url.pathname.startsWith("/api/") || url.pathname.startsWith("/socket.io");
    if (isApiRequest || url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Serve from cache but also update cache in background (stale-while-revalidate)
                const networkFetch = fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse.clone());
                        });
                    }
                    return networkResponse;
                }).catch(() => { }); // Silently fail background re-fetch
                return cachedResponse;
            }

            // Not in cache: fetch from network and store
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            });
        })
    );
});
