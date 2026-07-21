// Quantrex — permanent no-watermark + always-visible figures (prev/next safe)
// Runs on every render and keeps cleaning until soft-strip succeeds.
(function () {
  const POOL_SEL = [
    "img.qx-pool-fig",
    "img.qx-fig-img",
    "img.qx-no-wm",
    "#qxDiagramSlot img",
    ".qx-diagram-slot img",
    ".qx-opt-diagram-slot img",
    ".mtk-opt-text img",
    ".qx-prac-opt-text img",
    ".mtk-q-text img",
    ".qx-content img[src*='cdn-question-pool']",
    ".qx-content img[src*='/pyq/']",
    ".qx-content img[src*='proxy-image']",
    "img[src*='cdn-question-pool']",
    "img[src*='cdn.quizrr']",
    "img[src*='/pyq/']",
    "img[src*='proxy-image']"
  ].join(", ");

  // Kill MARKS chrome + Quantrex brand stamps permanently (all exams)
  const KILL_SEL = [
    "canvas.qx-premium-wm-canvas",
    "canvas.qx-marks-scrub-canvas",
    "img.qx-coaching-wm",
    "img.qx-quantrex-wm-overlay",
    ".qx-quantrex-black-wm",
    ".qx-quantrex-black-seal",
    ".qx-quantrex-wm",
    ".qx-brand-overlay",
    ".qx-premium-wm-sheet",
    ".qx-premium-wm-title",
    ".qx-premium-wm-tag",
    ".qx-premium-wm-logo",
    ".qx-diag-watermark",
    ".qx-wm-diagonal",
    ".qx-wm-corner-badge",
    ".qx-marks-strip",
    ".qx-marks-scrub",
    ".qx-wm-mask",
    "img[src*='getmarks-brand']",
    "img[alt*='Get Marks App']",
    "img[src*='marks-premium']",
    "img[src*='marks_selected']",
    "img[src*='quantrex-academy-brand']",
    "img[src*='quantrex-watermark']",
    "img[src*='quantrex-diag']",
    "img[src*='quantrex-fig-stamp']",
    "img[src*='quantrex-fig-seal']",
    "img[src*='quantrex-brand']"
  ].join(", ");

  // origSrc → cleaned data URL (survives prev/next re-render)
  const stripCache = new Map();
  let passTimer = 0;

  function forceVisible(img) {
    if (!img) return;
    img.classList.remove("qx-wm-loading", "qx-wm-pending", "qx-org-pending");
    img.classList.add("qx-fig-ready", "qx-no-wm");
    img.style.setProperty("opacity", "1", "important");
    img.style.setProperty("visibility", "visible", "important");
    img.style.setProperty("display", "block", "important");
    const wrap = img.closest(".qx-fig, .qx-opt-fig, .qx-fig-inner, .qx-diagram-slot, #qxDiagramSlot, .qx-pool-fig-wrap");
    if (wrap) {
      wrap.classList.remove("qx-wm-loading", "qx-wm-pending-wrap");
      wrap.classList.add("qx-fig-ready");
      wrap.style.setProperty("opacity", "1", "important");
      wrap.style.setProperty("visibility", "visible", "important");
    }
  }

  function nukeDom(root) {
    const scope = root || document;
    try {
      scope.querySelectorAll(KILL_SEL).forEach((el) => el.remove());
      // Absolute text seals inside figure areas (MARKS / QUANTREX ACADEMY)
      if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.nukeAllWatermarkDom) {
        QxPremiumWM.nukeAllWatermarkDom(scope);
      }
    } catch (_) { /* */ }
  }

  function isUiIcon(img) {
    if (!img) return true;
    // Option / question structure figures are NEVER icons
    if (img.closest && img.closest(".mtk-opt-text, .qx-prac-opt-text, .qx-opt-diagram-slot, .qx-opt-pair-struct, .qx-opt-direct-img, #qxDiagramSlot, .qx-diagram-slot, .qx-fig, .qx-opt-fig, .mtk-q-text, .qx-content")) {
      const src0 = String(img.getAttribute("src") || img.dataset.qxOrigSrc || "");
      if (/cdn-question-pool|cdn\.quizrr|\/pyq\/|proxy-image|data:image\/png|assets\/diagrams/i.test(src0)
        || img.classList.contains("qx-pool-fig") || img.classList.contains("qx-fig-img") || img.classList.contains("qx-no-wm")) {
        return false;
      }
    }
    if (img.classList.contains("qx-marks-icon") || img.classList.contains("qx-exam-logo")
      || img.classList.contains("fc-img") || img.classList.contains("subj-ic-img")
      || img.classList.contains("exam-pill-logo")) return true;
    const src = String(img.getAttribute("src") || img.dataset.qxOrigSrc || "");
    if (/cdn-assets\.getmarks|ic_content_exam_|app_assets\/img\/(exams|ui|cpyqb)\//i.test(src)) return true;
    // Only treat as icon when clearly tiny AND not a pool/option figure
    const w = img.naturalWidth || 0;
    const h = img.naturalHeight || 0;
    if (w > 0 && h > 0 && w <= 48 && h <= 48 && !img.classList.contains("qx-pool-fig")) return true;
    return false;
  }

  function isPoolFig(img) {
    if (!img || isUiIcon(img)) return false;
    const src = String(img.dataset.qxOrigSrc || img.getAttribute("src") || "");
    // Organic color figures — never soft-strip (prevents hang + bleach)
    if (/\/assets\/diagrams\/(qx-org-|org-src\/)/i.test(src)
      || img.classList.contains("qx-org-fig")
      || img.classList.contains("qx-organic-fig")) {
      return false;
    }
    if (img.classList.contains("qx-pool-fig") || img.classList.contains("qx-fig-img") || img.classList.contains("qx-no-wm")) {
      if (/cdn-assets\.getmarks|ic_content_exam_/i.test(src) && !/cdn-question-pool|\/pyq\//i.test(src)) return false;
      // Local clean assets already free of MARKS
      if (/\/assets\/(diagrams|qx-figures)\//i.test(src) && !/proxy-image/i.test(src)) return false;
      return true;
    }
    return /cdn-question-pool|cdn\.quizrr|\/pyq\/|proxy-image|restore-image/i.test(src);
  }

  function restoreIfBlank(img) {
    if (!img) return;
    // Soft-strip / bad proxy left a blank or tiny figure — restore original CDN
    const src = String(img.getAttribute("src") || "");
    const orig = String(img.dataset.qxOrigSrc || "");
    const blank = !img.naturalWidth || img.naturalWidth < 24 || img.naturalHeight < 24
      || src === "" || src.startsWith("data:image/gif")
      || (img.complete && img.naturalWidth > 0 && img.offsetHeight < 8);
    if (!blank) return;
    const fallback = orig || src;
    if (fallback && (/cdn-question-pool|cdn\.quizrr|\/pyq\/|qx-figures|assets\/diagrams/i.test(fallback) || fallback.startsWith("/"))) {
      delete img.dataset.qxSoftStrip;
      delete img.dataset.qxFigFrozen;
      delete img.dataset.qxProcessedVer;
      img.crossOrigin = "anonymous";
      if (/cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(fallback)
        && typeof QxImgClean !== "undefined" && QxImgClean.proxyImageUrl) {
        img.src = QxImgClean.proxyImageUrl(fallback);
      } else {
        img.src = fallback;
      }
      forceVisible(img);
    }
  }

  function cacheKey(img) {
    return String(img.dataset.qxOrigSrc || img.getAttribute("data-qx-orig-src") || img.getAttribute("src") || "").split("&v=")[0];
  }

  function applyCacheOrClean(img) {
    if (!isPoolFig(img)) {
      forceVisible(img);
      restoreIfBlank(img);
      return;
    }
    forceVisible(img);
    // Tag option images for CSS/pipeline
    if (img.closest && img.closest(".mtk-opt-text, .qx-prac-opt-text, .qx-opt-diagram-slot, .qx-opt-pair")) {
      img.classList.add("qx-pool-fig", "qx-no-wm", "qx-opt-fig-img");
    }

    // Soft-strip v11 — keep data:URL; do not let src-lock re-apply MARKS
    const STRIP_VER = "11";
    const key = cacheKey(img);
    if (img.dataset.qxSoftStrip === "2" && img.dataset.qxSoftVer === STRIP_VER) {
      forceVisible(img);
      restoreIfBlank(img);
      return;
    }
    // Stale cache / old soft-strip — force re-run (never keep dirty freeze)
    if (img.dataset.qxSoftStrip === "2" && img.dataset.qxSoftVer !== STRIP_VER) {
      delete img.dataset.qxSoftStrip;
      delete img.dataset.qxFigFrozen;
      delete img.dataset.qxSoftVer;
      if (key) stripCache.delete(key);
    }
    // Do not reuse in-memory cache unless same strip version
    if (key && stripCache.has(key) && img.dataset.qxCacheVer === STRIP_VER) {
      const clean = stripCache.get(key);
      if (clean && clean.startsWith("data:") && img.getAttribute("src") !== clean) {
        img.removeAttribute("crossorigin");
        img.src = clean;
      }
      img.dataset.qxSoftStrip = "2";
      img.dataset.qxSoftVer = STRIP_VER;
      img.dataset.qxFigFrozen = "1";
      img.dataset.qxCleanedSrc = "1";
      img.dataset.qxHasWm = "0";
      img.classList.add("qx-wm-clean", "qx-nowm", "qx-fig-ready");
      forceVisible(img);
      return;
    }

    // Ensure pool src is proxy (CORS) before strip
    try {
      const cur = String(img.getAttribute("src") || "");
      const orig = String(img.dataset.qxOrigSrc || cur);
      if (
        /cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(orig) &&
        !/proxy-image|data:image/i.test(cur) &&
        typeof QxImgClean !== "undefined" &&
        QxImgClean.proxyImageUrl
      ) {
        if (!img.dataset.qxOrigSrc) img.dataset.qxOrigSrc = orig;
        img.crossOrigin = "anonymous";
        img.src = QxImgClean.proxyImageUrl(img.dataset.qxOrigSrc);
      }
    } catch (_) { /* */ }

    if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.paintMarksHideOnly) {
      void QxPremiumWM.paintMarksHideOnly(img).then(() => {
        forceVisible(img);
        restoreIfBlank(img);
        const after = img.getAttribute("src") || "";
        if (after.startsWith("data:") && key) {
          stripCache.set(key, after);
          if (stripCache.size > 400) {
            const first = stripCache.keys().next().value;
            stripCache.delete(first);
          }
        }
        if (img.dataset.qxSoftStrip !== "2" && img.dataset.qxNowmRetry !== "1") {
          img.dataset.qxNowmRetry = "1";
          setTimeout(() => applyCacheOrClean(img), 500);
        }
        if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.stripQuantrexBrand) {
          QxPremiumWM.stripQuantrexBrand(img);
        }
      });
    } else if (typeof QxImgClean !== "undefined" && QxImgClean.rewriteAllPoolImgs) {
      QxImgClean.rewriteAllPoolImgs(img.parentElement || document);
    }
  }

  function pass(root) {
    const scope = root || document.getElementById("app-main") || document.body;
    if (!scope) return;
    nukeDom(scope);
    try {
      scope.querySelectorAll(POOL_SEL).forEach((img) => {
        try {
          applyCacheOrClean(img);
        } catch (_) {
          forceVisible(img);
        }
      });
    } catch (_) { /* */ }
  }

  function schedulePass(root, delays) {
    pass(root);
    (delays || [120, 400, 900, 1600]).forEach((ms) => {
      setTimeout(() => pass(root), ms);
    });
  }

  // Hook after every practice render
  const _origAfter = () => {};
  function hookAfterRender() {
    if (typeof window.Mx === "undefined" || !window.Mx.afterRender || window.Mx._qxNowmHooked) return;
    const prev = window.Mx.afterRender.bind(window.Mx);
    window.Mx.afterRender = function (root) {
      const r = prev(root);
      schedulePass(root || document.getElementById("app-main"));
      return r;
    };
    window.Mx._qxNowmHooked = true;
  }

  // Hook practice nav
  function hookNav() {
    if (typeof window.qxPracticeNav !== "function" || window.qxPracticeNav._qxNowmHooked) return;
    const prev = window.qxPracticeNav;
    window.qxPracticeNav = function (delta) {
      const out = prev.apply(this, arguments);
      schedulePass(document.getElementById("app-main"));
      return out;
    };
    window.qxPracticeNav._qxNowmHooked = true;
  }

  function start() {
    hookAfterRender();
    hookNav();
    schedulePass(document);
    // Re-hook when scripts finish defining globals
    setTimeout(hookAfterRender, 500);
    setTimeout(hookNav, 500);
    setTimeout(hookAfterRender, 2000);
    setTimeout(hookNav, 2000);

    // Permanent guardian — all exams, every pool figure until soft-strip succeeds
    setInterval(() => {
      const main = document.getElementById("app-main") || document.body;
      if (!main) return;
      nukeDom(main);
      let dirty = 0;
      main.querySelectorAll(POOL_SEL).forEach((img) => {
        if (isUiIcon(img)) return;
        forceVisible(img);
        if (img.dataset.qxSoftStrip !== "2") dirty++;
      });
      // Also cover solution / test body figures
      document.querySelectorAll(
        ".sol-body img, .qx-sol-body img, .mtk-main img.qx-pool-fig, .marks-test-active img.qx-pool-fig"
      ).forEach((img) => {
        if (isUiIcon(img)) return;
        if (img.dataset.qxSoftStrip !== "2") dirty++;
      });
      if (dirty > 0) pass(main);
    }, 1400);

    if (typeof MutationObserver !== "undefined" && document.body) {
      let t = 0;
      const obs = new MutationObserver(() => {
        if (t) return;
        t = setTimeout(() => {
          t = 0;
          const main = document.getElementById("app-main") || document.body;
          nukeDom(main);
          pass(main);
        }, 200);
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  window.addEventListener("qx:question-rendered", () => schedulePass(document.getElementById("app-main")));
  window.addEventListener("qx:practice-ready", () => schedulePass(document.getElementById("app-main")));

  window.QxNoWmGuard = { pass, schedulePass, nukeDom, forceVisible, stripCache };
})();
