/* Quantrex PWA — website + Android TWA share this cache. */
const CACHE = "qx-pwa-v129";
const PRECACHE = ["/login.html", "/manifest.webmanifest", "/assets/icon-192.png", "/assets/icon-512.png"];
const SKIP = /\.(mp4|webm|apk|m4a|mp3)$/i;
const ASSET_IMG = /\.(png|jpe?g|webp|svg|gif|ico|woff2?)$/i;
const ASSET_CODE = /\.(css|js)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim()).then(() =>
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((c) => c.postMessage({ type: "QX_UPDATED", cache: CACHE }));
      })
    )
  );
});

self.addEventListener("message", (event) => {
  const d = event && event.data;
  if (d && (d.type === "SKIP_WAITING" || d.type === "QX_SKIP_WAITING")) {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname === "/version.json") return;
  if (SKIP.test(url.pathname)) return;

  const isImg = ASSET_IMG.test(url.pathname) || (url.pathname.startsWith("/assets/") && !SKIP.test(url.pathname) && !ASSET_CODE.test(url.pathname));
  const isCode = ASSET_CODE.test(url.pathname);

  function putCache(res) {
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
    }
    return res;
  }

  if (isCode) {
    event.respondWith(
      fetch(req).then(putCache).catch(() => caches.match(req))
    );
    return;
  }
  if (isImg) {
    event.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then(putCache).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  event.respondWith(
    fetch(req).catch(() => caches.match(req).then((hit) => hit || caches.match("/login.html")))
  );
});
