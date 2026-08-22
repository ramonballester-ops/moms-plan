/* Mom's Plan — service worker. Network-first for the shell and data (so updates
   land immediately), cache-first for the static library and icons. */
const VERSION = "2026-08-22T22:05Z-v1.2.1";
const CACHE = "moms-plan-" + VERSION;
const PRECACHE = ["./", "./index.html", "./chart.umd.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-180.png"];
const NETWORK_FIRST = /(\/$|index\.html$|data\.enc\.json)/;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // fonts etc. go straight to network
  if (NETWORK_FIRST.test(url.pathname)) {
    // Only a GOOD response may replace the cache. A dead host still answers —
    // GitHub Pages serves a 404 page when the site is disabled — and caching
    // that overwrites the working copy with an error page. Fall back to cache
    // on a bad status exactly as if the network had failed outright.
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (!res.ok) throw new Error("bad status " + res.status);
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true })
          .then((hit) => hit || Response.error()))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }))
    );
  }
});
