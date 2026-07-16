const CACHE_NAME = "shipment-tool-static-v4";
const BASE_URL = new URL("./", self.registration.scope);
const ASSETS = [
  "",
  "index.html",
  "manifest.webmanifest",
  "icon.svg",
  "static/styles.css",
  "static/app.js",
  "static/shipment-core.js",
  "static/shipment-store.js",
].map((path) => new URL(path, BASE_URL).toString());

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(event.request);
    }),
  );
});
