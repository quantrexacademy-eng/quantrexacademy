/* Quantrex PWA — website + Android TWA share this cache.
   Bump CACHE on every release so activate deletes ALL old qx-pwa-* caches.
   Critical question/math/test JS must NEVER be served stale from cache. */
const CACHE = "qx-pwa-qxmd164";
const PRECACHE = ["/login.html", "/manifest.webmanifest", "/assets/icon-192.png", "/assets/icon-512.png"];
const SKIP = /\.(mp4|webm|apk|m4a|mp3)$/i;
const ASSET_IMG = /\.(png|jpe?g|webp|svg|gif|ico|woff2?)$/i;
const ASSET_CODE = /\.(css|js)$/i;

/* Never fall back to stale copies of these — question format / math / test engine. */
const NEVER_STALE = /(?:^|\/)(qx-math-sanitize|math-render|qx-proofread|solution-format|test-engine|examgoal-test-ui|allen-test-ui|app|question-format|qx-settings|marks-features|marks-shell|marks-live|qx-cbt-ux|jovi|qx-q-fast|qx-catalog|qx-session|theme)\.(?:js|css)$/i;
const NEVER_STALE_HTML = /(?:^|\/)(app|login|examgoal-test-series|quantrex-test-series)\.html$/i;
const QUESTION_DATA = /\/data\/(?:banks\/chapters\/|nav\/pyq_paper_packs\/|.*\.(?:json))$/i;
const HTML_DOC = /\.html$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim()).then(() =>
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((c) => c.postMessage({ type: "QX_UPDATED", cache: CACHE, build: "qxmd164" }));
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
  /* Always network — version gate + assetlinks for TWA */
  if (url.pathname === "/version.json") return;
  if (url.pathname === "/.well-known/assetlinks.json") return;
  if (SKIP.test(url.pathname)) return;

  const path = url.pathname;
  const isImg = ASSET_IMG.test(path) || (path.startsWith("/assets/") && !SKIP.test(path) && !ASSET_CODE.test(path));
  const isCode = ASSET_CODE.test(path);
  const isNeverStaleJs = NEVER_STALE.test(path); /* js+css */
  const isNeverStaleHtml = NEVER_STALE_HTML.test(path) || (req.mode === "navigate" && HTML_DOC.test(path));
  const isQuestionData = QUESTION_DATA.test(path);
  const isHtml = HTML_DOC.test(path) || req.mode === "navigate";
  const hasBust = url.searchParams.has("v");

  function putCache(res) {
    if (res && res.ok) {
      const copy = res.clone();
      /* Cache by full request URL so ?v=qxjovi2 does not collide with older busts */
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
    }
    return res;
  }

  /* Critical JS/CSS: network-only (no stale fallback). Offline → network error, not old format. */
  if (isNeverStaleJs) {
    event.respondWith(fetch(req).then(putCache));
    return;
  }

  /* HTML shells + question JSON / paper packs: network-first, no stale on soft fail for navigations */
  if (isNeverStaleHtml || isQuestionData || (isHtml && req.mode === "navigate")) {
    event.respondWith(
      fetch(req).then(putCache).catch(() => {
        if (req.mode === "navigate") {
          return caches.match(req).then((hit) => hit || caches.match("/login.html"));
        }
        /* Soft fail for data: prefer nothing over wrong question HTML */
        return caches.match(req);
      })
    );
    return;
  }

  /* Version-busted CSS/JS: network-first, cache by full URL; still allow offline fallback */
  if (isCode && hasBust) {
    event.respondWith(
      fetch(req).then(putCache).catch(() => caches.match(req))
    );
    return;
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

  /* Default: network-first */
  event.respondWith(
    fetch(req).then(putCache).catch(() =>
      caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("/login.html") : undefined))
    )
  );
});
