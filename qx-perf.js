// Quantrex performance — lazy assets, smooth transitions, cached metadata
window.QxPerf = (() => {
  let _imgObs = null;

  function lazyImages(root) {
    const scope = root || document;
    scope.querySelectorAll("img[loading='lazy']").forEach(img => {
      img.decoding = "async";
    });
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
      }, { rootMargin: "240px" });
    }
    scope.querySelectorAll("img[data-src]").forEach(img => _imgObs.observe(img));
  }

  function smoothPaint(root) {
    const el = root || document.getElementById("app-main");
    if (!el) return;
    el.classList.remove("qx-fade-in");
    void el.offsetWidth;
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
    } catch (e) { /* ignore */ }
  }

  function prefetchBank(slug) {
    if (!slug || typeof BANK_INDEX === "undefined" || !BANK_INDEX[slug]) return;
    if (typeof _banksLoaded !== "undefined" && _banksLoaded[slug]) return;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "fetch";
    link.href = BANK_INDEX[slug].file;
    document.head.appendChild(link);
  }

  function prefetchPrimaryBank() {
    const slug = (typeof PRIMARY_BANK !== "undefined" && PRIMARY_BANK[STATE.exam]) || "jee_main";
    prefetchBank(slug);
  }

  function onIdle(fn) {
    if (typeof requestIdleCallback === "function") requestIdleCallback(fn, { timeout: 2000 });
    else setTimeout(fn, 1);
  }

  return { lazyImages, smoothPaint, cacheGet, cacheSet, prefetchBank, prefetchPrimaryBank, onIdle };
})();