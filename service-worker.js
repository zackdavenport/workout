const CACHE_NAME = "iron-log-v2";

// Paths are relative to this file's location, so this works whether the app
// is hosted at a domain root or under a GitHub Pages project subpath.
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./exercises.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
];

// Files that change whenever the app is updated. These use a network-first
// strategy below so a fresh deploy is picked up right away instead of being
// masked by a stale cache.
const NETWORK_FIRST_FILES = [
  "index.html", "style.css", "app.js", "exercises.js", "manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isNetworkFirst =
    event.request.mode === "navigate" ||
    NETWORK_FIRST_FILES.some((name) => url.pathname.endsWith(name));

  if (isNetworkFirst) {
    // Network-first: always try to get the latest app code/markup. Only
    // fall back to whatever's cached if the network is unavailable (offline).
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => cached || caches.match("./index.html"))
        )
    );
    return;
  }

  // Cache-first for stable assets (icons, etc.) that don't need instant updates.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.ok && response.type === "basic") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => undefined);
    })
  );
});
