/**
 * Quantrex performance — touch-first, 60fps scroll, fast first paint
 * Production SPA helpers (not a React rewrite)
 */
window.QxPerf = (() => {
  let _imgObs = null;
  let _scrollBound = false;
  let _touchReady = false;
  let _secondaryBooted = false;
  const _loadedScripts = Object.create(null);

  function lazyImages(root) {
    const scope = root || document;
    try {
      scope.querySelectorAll("img:not([loading])").forEach(img => {
        const fig = img.classList.contains("qx-pool-fig") || img.classList.contains("qx-opt-fig-img")
          || img.classList.contains("qx-match-fig") || img.classList.contains("qx-irodov-stem")
          || img.closest("#qxDiagramSlot, .qx-diagram-slot, .qx-question-body, .mtk-q-text, .mtk-opt, .qx-prac-opt, .qx-opt-diagram-slot");
        if (fig) {
          img.loading = "eager";
          try { img.fetchPriority = "high"; } catch (_) { /* */ }
          img.decoding = "async";
          return;
        }
        if (!img.closest(".qx-q-skeleton, .hero, .dpp-banner")) {
          img.loading = "lazy";
        }
        img.decoding = "async";
        if (!img.fetchPriority && !img.closest(".dash-greet-bar, .sidebar")) {
          try { img.fetchPriority = "low"; } catch (_) { /* */ }
        }
      });
    } catch (_) { /* */ }
    if (!("IntersectionObserver" in window)) return;
    if (!_imgObs) {
      _imgObs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (!e.isIntersecting) return;
          const img = e.target;
          const src = img.dataset.src;
          if (src) {
            img.src = src;
            img.removeAttribute("data-src");
          }
          _imgObs.unobserve(img);
        });
      }, { rootMargin: "180px", threshold: 0.01 });
    }
    scope.querySelectorAll("img[data-src]").forEach(img => _imgObs.observe(img));
  }

  /** Non-blocking stylesheet (print→all trick) */
  function loadCss(href) {
    if (!href || document.querySelector('link[href="' + href + '"]')) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    l.media = "print";
    l.onload = function () { this.media = "all"; };
    document.head.appendChild(l);
  }

  function loadScript(src, opts) {
    opts = opts || {};
    if (!src) return Promise.resolve();
    if (_loadedScripts[src]) return _loadedScripts[src];
    if (document.querySelector('script[src="' + src + '"]')) {
      _loadedScripts[src] = Promise.resolve();
      return _loadedScripts[src];
    }
    _loadedScripts[src] = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = opts.async !== false;
      s.defer = !!opts.defer;
      s.onload = () => resolve();
      s.onerror = () => resolve();
      document.body.appendChild(s);
    });
    return _loadedScripts[src];
  }

  /**
   * After first paint: secondary CSS/JS that dashboard doesn't need immediately.
   * Keeps first load lean on 2G/low-end Android.
   */
  function bootSecondary() {
    if (_secondaryBooted) return;
    _secondaryBooted = true;
    const css = (window.QX_SECONDARY_CSS || []);
    const js = (window.QX_SECONDARY_JS || []);
    css.forEach(loadCss);
    // Stagger scripts so main thread stays free
    let i = 0;
    const next = () => {
      if (i >= js.length) return;
      const src = js[i++];
      loadScript(src, { async: true }).then(() => {
        if (typeof requestIdleCallback === "function") {
          requestIdleCallback(next, { timeout: 1200 });
        } else {
          setTimeout(next, 40);
        }
      });
    };
    onIdle(next);
    // KaTeX CSS first so math does not pop unstyled after Next
    loadCss("https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css");
  }

  function smoothPaint(root) {
    // No forced reflow animation on every paint (was janky on Android)
    const el = root || document.getElementById("app-main");
    if (!el) return;
    el.classList.add("qx-fade-in");
  }

  function cacheGet(key, maxAgeMs) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (!o || Date.now() - o.t > maxAgeMs) return null;
      return o.v;
    } catch (e) { return null; }
  }

  function cacheSet(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
    } catch (e) { /* quota */ }
  }

  /** Never prefetch multi-MB banks */
  function prefetchBank() { /* no-op */ }
  function prefetchPrimaryBank() { /* no-op */ }

  function onIdle(fn) {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(() => { try { fn(); } catch (_) { /* */ } }, { timeout: 2000 });
    } else {
      setTimeout(() => { try { fn(); } catch (_) { /* */ } }, 48);
    }
  }

  /**
   * First-tap reliability: ensure no stuck overlays, unlock body,
   * passive touch listeners, remove 300ms-era issues via CSS (touch-action).
   */
  function touchBoost() {
    if (_touchReady) return;
    _touchReady = true;

    // Clear stuck modal overlays that steal taps
    const clearStuck = () => {
      try {
        document.querySelectorAll(
          ".marks-modal-overlay, #mtkStopModal, #mtkSubmitModal, .mtk-qview-overlay"
        ).forEach(el => {
          // if not in DOM properly or display none — leave; only remove orphans with 0 size
          if (!el.isConnected) el.remove();
        });
      } catch (_) { /* */ }
    };

    // Fast path: pointerdown feedback class (pressed state)
    document.addEventListener("pointerdown", (ev) => {
      const t = ev.target && ev.target.closest && ev.target.closest(
        "button, .btn-primary, .btn-soft, .nav-item, .q-card, .mtk-opt, .qx-prac-opt, .chip, .mtk-btn, .mtk-exit-btn, .mtk-pal-cell"
      );
      if (!t) return;
      t.classList.add("qx-pressed");
    }, { passive: true });

    document.addEventListener("pointerup", () => {
      document.querySelectorAll(".qx-pressed").forEach(el => el.classList.remove("qx-pressed"));
    }, { passive: true });

    document.addEventListener("pointercancel", () => {
      document.querySelectorAll(".qx-pressed").forEach(el => el.classList.remove("qx-pressed"));
    }, { passive: true });

    // Tap outside sidebar closes nav (and frees overlay)
    document.addEventListener("click", (ev) => {
      if (!document.body.classList.contains("qx-nav-open")) return;
      if (ev.target.closest(".sidebar") || ev.target.closest("#navToggle")) return;
      try {
        const sb = document.querySelector(".sidebar");
        if (sb) sb.classList.remove("open");
        document.body.classList.remove("qx-nav-open");
      } catch (_) { /* */ }
    }, { capture: true, passive: true });

    onIdle(clearStuck);
  }

  function smoothScrollSetup() {
    if (_scrollBound) return;
    _scrollBound = true;
    touchBoost();

    // Prefer CSS file; inject minimal fallback if CSS missing
    if (!document.getElementById("qxPerfCss")) {
      const s = document.createElement("style");
      s.id = "qxPerfCss";
      s.textContent = `
        .qx-pressed { opacity: 0.9 !important; transform: scale(0.98) !important; }
        .q-list .q-card { content-visibility: auto; contain-intrinsic-size: auto 96px; }
      `;
      document.head.appendChild(s);
    }
  }

  /** Yield to browser between heavy chunks */
  function yieldToMain() {
    return new Promise(r => {
      if (typeof scheduler !== "undefined" && scheduler.yield) scheduler.yield().then(r);
      else setTimeout(r, 0);
    });
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        smoothScrollSetup();
        // First paint then secondary assets
        onIdle(() => bootSecondary());
        setTimeout(bootSecondary, 400);
      }, { once: true });
    } else {
      smoothScrollSetup();
      onIdle(() => bootSecondary());
      setTimeout(bootSecondary, 400);
    }
    // After first interaction, ensure secondary is loading
    ["pointerdown", "keydown", "scroll"].forEach((ev) => {
      document.addEventListener(ev, () => bootSecondary(), { once: true, passive: true });
    });
  }

  return {
    lazyImages,
    smoothPaint,
    cacheGet,
    cacheSet,
    prefetchBank,
    prefetchPrimaryBank,
    onIdle,
    smoothScrollSetup,
    touchBoost,
    yieldToMain,
    loadCss,
    loadScript,
    bootSecondary
  };
})();
