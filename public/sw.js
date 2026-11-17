// Service Worker for Raport & EHB Digital PP. KH Zumratul Muttaqin
const CACHE_NAME = "khzm-raport-v1";
const STATIC_ASSETS = [
  "/",
  "/login",
  "/logo.png",
  "/icon.png",
  "/favicon.ico",
  "/manifest.json",
];

// 1. INSTALL
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. ACTIVATE
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH (Network-first with cache fallback for offline resilience)
self.addEventListener("fetch", (event) => {
  // Only handle GET requests and skip Supabase/API dynamic data
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip API, Supabase, and auth calls
  if (
    url.pathname.startsWith("/api/") ||
    url.origin.includes("supabase.co") ||
    url.pathname.includes("_next/webpack-hmr")
  ) {
    return;
  }

  // Static assets (images, fonts, css, js) can use stale-while-revalidate
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Page navigations: Network-first, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((response) => {
        if (response) return response;
        if (event.request.mode === "navigate") {
          return caches.match("/login");
        }
        return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
      });
    })
  );
});
