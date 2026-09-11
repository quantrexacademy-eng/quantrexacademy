/**
 * Quantrex Test Engine Performance (KL.txt)
 * — Instant N+1 question figure prefetch, clean-proxy (no Marks WM), compact figures
 * Vanilla SPA. Never rewrites question academic data.
 */
(function (global) {
  "use strict";

  const PREFETCH_CACHE = new Map();
  const MAX_CACHE = 64;
  let _lastPrefetchKey = "";
  let _linkPreloads = [];

  function fixUrl(u) {
    return String(u || "")
      .replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/")
      .replace(/https?:\/\/cdn-question-pool\.app\//gi, "https://cdn-question-pool.getmarks.app/");
  }

  function unwrapProxy(url) {
    let s = String(url || "");
    if (/proxy-image|restore-image/i.test(s)) {
      try {
        const u = new URL(s, location.origin);
        const inner = u.searchParams.get("url");
        if (inner) s = decodeURIComponent(inner);
      } catch (_) { /* */ }
    }
    return fixUrl(s).split("?")[0];
  }

  function isPoolUrl(u) {
    return /cdn-question-pool|cdn\.quizrr|\/pyq\/|watermarked_images|getmarks\.app/i.test(String(u || ""));
  }

  /** Always clean-proxy pool figures (no Marks watermark) */
  function cleanProxyUrl(url) {
    const orig = unwrapProxy(url);
    if (!orig) return "";
    if (!isPoolUrl(orig)) return orig;
    if (typeof QxImgClean !== "undefined" && QxImgClean.proxyImageUrl) {
      try {
        return QxImgClean.proxyImageUrl(orig);
      } catch (_) { /* */ }
    }
    return "/api/proxy-image?url=" + encodeURIComponent(orig) + "&clean=1";
  }

  function extractImgUrls(html) {
    const urls = [];
    const s = String(html || "");
    const re = /\bsrc\s*=\s*(?:["']([^"']+)["']|([^\s>]+))/gi;
    let m;
    while ((m = re.exec(s)) !== null) {
      const raw = fixUrl(m[1] || m[2] || "");
      if (!raw || /^data:/i.test(raw) || /logo|icon|formula_cards|ic_content|ic_marks|getmarks-brand/i.test(raw)) continue;
      if (isPoolUrl(raw) || /proxy-image|restore-image|assets\/(diagrams|qx-figures|clean-diagrams)/i.test(raw)) {
        urls.push(raw);
      }
    }
    return urls;
  }

  function urlsFromQuestion(q) {
    if (!q) return [];
    const set = new Set();
    extractImgUrls(q.q).forEach((u) => set.add(u));
    (q.options || []).forEach((o) => extractImgUrls(o).forEach((u) => set.add(u)));
    // Do not prefetch full solutions by default (bandwidth) — only on demand
    return [...set];
  }

  function displayUrlFor(url) {
    const fixed = fixUrl(url);
    if (!fixed) return fixed;
    try {
      if (typeof QxImgClean !== "undefined" && QxImgClean.resolveLocalFigureSrcSync) {
        const loc = QxImgClean.resolveLocalFigureSrcSync(fixed);
        if (loc && /assets\//i.test(loc)) return loc;
      }
    } catch (_) { /* */ }
    if (isPoolUrl(fixed) || /proxy-image/i.test(fixed)) return cleanProxyUrl(fixed);
    return fixed;
  }

  function preloadUrl(url, priority) {
    const src = displayUrlFor(url);
    if (!src) return Promise.resolve(false);
    if (PREFETCH_CACHE.has(src)) {
      const v = PREFETCH_CACHE.get(src);
      return v && typeof v.then === "function" ? v : Promise.resolve(true);
    }
    if (PREFETCH_CACHE.size > MAX_CACHE) {
      const first = PREFETCH_CACHE.keys().next().value;
      if (first) PREFETCH_CACHE.delete(first);
    }
    const p = new Promise((resolve) => {
      try {
        const img = new Image();
        img.decoding = "async";
        try {
          img.fetchPriority = priority === "high" ? "high" : "low";
        } catch (_) { /* */ }
        if (/proxy-image/i.test(src)) {
          try {
            img.crossOrigin = "anonymous";
          } catch (_) { /* */ }
        }
        let done = false;
        const finish = (ok) => {
          if (done) return;
          done = true;
          PREFETCH_CACHE.set(src, true);
          resolve(ok);
        };
        img.onload = () => finish(true);
        img.onerror = () => {
          // Retry clean proxy once with cache-bust; never prefer raw WM CDN first
          if (/proxy-image/i.test(src) && src.indexOf("_qxr=") < 0) {
            const img2 = new Image();
            img2.onload = () => finish(true);
            img2.onerror = () => finish(false);
            img2.crossOrigin = "anonymous";
            img2.src = src + (src.indexOf("?") >= 0 ? "&" : "?") + "_qxr=" + Date.now();
            return;
          }
          finish(false);
        };
        img.src = src;
      } catch (_) {
        resolve(false);
      }
    });
    PREFETCH_CACHE.set(src, p);
    return p;
  }

  function clearLinkPreloads() {
    _linkPreloads.forEach((n) => {
      try {
        n.remove();
      } catch (_) { /* */ }
    });
    _linkPreloads = [];
  }

  /** <link rel=preload> for next question's first figure (instant paint) */
  function linkPreload(url, priority) {
    try {
      const src = displayUrlFor(url);
      if (!src || typeof document === "undefined") return;
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = src;
      try {
        if (priority === "high") link.fetchPriority = "high";
      } catch (_) { /* */ }
      document.head.appendChild(link);
      _linkPreloads.push(link);
      if (_linkPreloads.length > 6) {
        const old = _linkPreloads.shift();
        try {
          old.remove();
        } catch (_) { /* */ }
      }
    } catch (_) { /* */ }
  }

  function prefetchQuestionFigures(q, priority) {
    if (!q) return;
    const urls = urlsFromQuestion(q);
    urls.forEach((u, i) => {
      void preloadUrl(u, priority === "high" && i === 0 ? "high" : priority || "low");
      if (priority === "high" && i === 0) linkPreload(u, "high");
      else if (priority === "low" && i === 0) linkPreload(u, "low");
    });
  }

  /**
   * Prefetch window: current (high), next, next+1, prev (low).
   * Only 1–2 ahead — never whole chapter.
   */
  function prefetchWindow(ids, idx, getQFn) {
    if (!ids || !ids.length || idx == null) return;
    const key = String(ids[idx]) + ":" + idx + ":" + ids.length;
    if (key === _lastPrefetchKey) return;
    _lastPrefetchKey = key;
    clearLinkPreloads();

    const getQ = getQFn || (typeof global.getQ === "function" ? global.getQ : null);
    if (!getQ) return;

    const saveData =
      typeof navigator !== "undefined" &&
      navigator.connection &&
      (navigator.connection.saveData || /2g/i.test(navigator.connection.effectiveType || ""));

    const plan = [{ i: idx, p: "high" }, { i: idx + 1, p: "low" }];
    if (!saveData) {
      plan.push({ i: idx + 2, p: "low" });
      plan.push({ i: idx - 1, p: "low" });
    }
    plan.forEach(({ i, p }) => {
      if (i < 0 || i >= ids.length) return;
      try {
        const q = getQ(ids[i]);
        if (q) prefetchQuestionFigures(q, p);
      } catch (_) { /* */ }
    });
  }

  /** Visible figures: eager + high priority + clean proxy (no WM) */
  function prioritizeVisibleFigures(root) {
    const scope = root || document;
    if (!scope || !scope.querySelectorAll) return;
    try {
      scope
        .querySelectorAll(
          ".mtk-main img, .qx-practice-page img, .qx-question-body img, .mtk-q-text img, " +
            ".qx-prac-q img, .qx-prac-opt-text img, .mtk-opt-text img, .qx-match-list img, " +
            ".qx-content img, #qxDiagramSlot img, .qx-diagram-slot img, img.qx-pool-fig, img.qx-match-fig"
        )
        .forEach((img, n) => {
          if (!img || img.tagName !== "IMG") return;
          const cur = img.getAttribute("src") || "";
          const orig = unwrapProxy(img.dataset.qxOrigSrc || cur);
          // Pin pool to clean proxy
          if (isPoolUrl(orig + " " + cur) || /proxy-image/i.test(cur)) {
            if (!img.dataset.qxOrigSrc && isPoolUrl(orig)) img.dataset.qxOrigSrc = orig;
            const clean = cleanProxyUrl(orig || cur);
            if (clean && cur !== clean && !(/proxy-image/i.test(cur) && /clean=1/i.test(cur) && unwrapProxy(cur) === orig)) {
              // only swap if not already correct clean proxy for same orig
              if (!(/proxy-image/i.test(cur) && /clean=1/i.test(cur))) {
                try {
                  img.crossOrigin = "anonymous";
                } catch (_) { /* */ }
                img.setAttribute("src", clean);
              }
            }
            img.classList.add("qx-pool-fig", "qx-no-wm", "qx-wm-clean");
          }
          img.loading = n < 4 ? "eager" : "lazy";
          img.decoding = "async";
          img.style.visibility = "visible";
          img.style.opacity = "1";
          img.style.display = "block";
          img.style.maxWidth = "min(100%, 360px)";
          img.style.height = "auto";
          img.style.objectFit = "contain";
          img.style.background = "#fff";
          // Reserve space to reduce CLS
          if (!img.getAttribute("width") && !img.style.minHeight) {
            img.style.minHeight = "48px";
          }
          try {
            img.fetchPriority = n < 3 ? "high" : "auto";
          } catch (_) { /* */ }

          if (!img.dataset.qxKlErr) {
            img.dataset.qxKlErr = "1";
            let tries = 0;
            img.addEventListener("error", function onErr() {
              tries += 1;
              const o = unwrapProxy(img.dataset.qxOrigSrc || img.getAttribute("src") || "");
              if (tries === 1 && o && isPoolUrl(o)) {
                img.crossOrigin = "anonymous";
                img.src = cleanProxyUrl(o) + (cleanProxyUrl(o).indexOf("?") >= 0 ? "&" : "?") + "_r=" + Date.now();
                return;
              }
              if (tries === 2 && o) {
                // last resort raw CDN (may have WM) so student sees structure
                img.removeAttribute("crossorigin");
                img.src = fixUrl(o);
                return;
              }
              if (tries > 2) {
                img.removeEventListener("error", onErr);
                img.alt = "Figure";
                img.style.opacity = "0.4";
              }
            });
          }
        });
    } catch (_) { /* */ }
  }

  function afterQuestionPaint(root, sessionLike) {
    prioritizeVisibleFigures(root);
    // Match tables: extract layout + clean WM
    try {
      if (typeof Mx !== "undefined" && Mx.beautifyMatchTablesInDom) {
        Mx.beautifyMatchTablesInDom(root || document.getElementById("app-main"));
      }
    } catch (_) { /* */ }
    try {
      if (typeof QxSoftWm !== "undefined" && QxSoftWm.scan) QxSoftWm.scan(root);
    } catch (_) { /* */ }
    if (sessionLike && sessionLike.ids && sessionLike.idx != null) {
      // Defer neighbor prefetch to idle so current paint stays smooth
      const run = () => prefetchWindow(sessionLike.ids, sessionLike.idx, sessionLike.getQ);
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(run, { timeout: 400 });
      } else {
        setTimeout(run, 50);
      }
    }
  }

  if (typeof document !== "undefined") {
    document.addEventListener("qx:question-rendered", (ev) => {
      const root =
        (ev && ev.detail && ev.detail.root) ||
        document.getElementById("app-main") ||
        document.body;
      prioritizeVisibleFigures(root);
    });
  }

  global.QxTestEnginePerf = {
    extractImgUrls,
    urlsFromQuestion,
    preloadUrl,
    prefetchQuestionFigures,
    prefetchWindow,
    prioritizeVisibleFigures,
    afterQuestionPaint,
    cleanProxyUrl,
    _cache: PREFETCH_CACHE
  };
})(typeof window !== "undefined" ? window : globalThis);
