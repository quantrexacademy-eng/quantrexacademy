/**
 * Lightweight: hide Marks chrome + pin figures to clean proxy once.
 * No src MutationObserver (hangs). Idempotent with SoftWm.
 */
(function () {
  "use strict";

  const POOL_SEL = [
    "img.qx-pool-fig",
    "img.qx-match-fig",
    "img.qx-no-wm",
    "#qxDiagramSlot img",
    ".qx-diagram-slot img",
    ".mtk-opt-text img",
    ".qx-prac-opt-text img",
    ".mtk-q-text img",
    ".qx-content img[src*='cdn-question-pool']",
    ".qx-content img[src*='cdn.quizrr']",
    ".qx-content img[src*='firebasestorage']",
    ".qx-content img[src*='/pyq/']",
    ".qx-content img[src*='watermarked_images']",
    ".qx-match-grid img",
    "img[src*='cdn-question-pool']",
    "img[src*='cdn.quizrr']",
    "img[src*='watermarked_images']",
    "img[src*='proxy-image']",
    "img[src*='getmarks.app']",
    ".qx-book-q img",
    ".qx-marks-native img",
    ".sol-body img",
    ".qx-sol-flow img",
    ".qx-sol-card img"
  ].join(", ");

  const KILL_SEL = [
    "canvas.qx-premium-wm-canvas",
    "canvas.qx-marks-scrub-canvas",
    "img.qx-coaching-wm:not(.qx-ui-brand-logo):not(.qx-qx-only-wm)",
    ".qx-brand-overlay:not(.qx-qx-only-wm)",
    ".qx-premium-wm-sheet",
    ".qx-premium-wm-logo",
    ".qx-wm-diagonal",
    ".qx-marks-strip",
    ".qx-marks-scrub",
    ".qx-wm-mask",
    "img[src*='getmarks-brand']",
    "img[alt*='Get Marks App']",
    "img[src*='marks-premium']",
    "img[src*='marks_selected']",
    "img[src*='allen-logo']",
    "img[src*='allen_logo']",
    "img[alt='ALLEN']",
    "img[alt='Quizrr']",
    "img[alt='Vedantu']",
    "img[src*='vedantu-logo']",
    "img[src*='aakash-logo']",
    "img[src*='fiitjee']",
    "img[src*='unacademy-logo']"
  ].join(", ");

  function forceVisible(img) {
    if (!img || !img.style) return;
    img.classList.add("qx-fig-ready", "qx-no-wm", "qx-pool-fig");
    img.style.setProperty("opacity", "1", "important");
    img.style.setProperty("visibility", "visible", "important");
    img.style.setProperty("display", "block", "important");
    img.style.setProperty("height", "auto", "important");
    img.style.setProperty("object-fit", "contain", "important");
    const dark = document.documentElement.getAttribute("data-theme") === "dark"
      || (img.closest && img.closest("[data-test-theme='dark']"));
    img.style.setProperty("background", dark ? "#eceae4" : "#ffffff", "important");
    if (img.closest("table, .qx-match-q-body, .qx-inline-table-figs")) {
      img.style.setProperty("max-width", "min(100%, 280px)", "important");
    } else if (img.closest(".mtk-opt-text, .qx-prac-opt-text, .qx-opt-diagram-slot, .qa-opt")) {
      img.style.setProperty("max-width", "min(100%, 320px)", "important");
    } else {
      img.style.setProperty("max-width", "min(100%, 720px)", "important");
    }
    markQuantrexWmHost(img);
  }

  function markQuantrexWmHost(img) {
    if (!img || img.classList.contains("qx-exam-logo") || img.classList.contains("qx-marks-icon")
      || img.classList.contains("qx-ch-glyph-img") || img.classList.contains("qx-ch-3d-img")
      || img.closest(".qx-ch-icon, .exam-pill-card, .qx-exam-folder-logo, .qx-folder-ic")) return;
    let host = img.closest && img.closest(
      ".qx-diagram-slot, #qxDiagramSlot, .qx-pool-fig-wrap, .qx-opt-diagram-slot, .qx-fig, .qx-fig-inner, figure"
    );
    if (!host) {
      host = img.parentElement;
      if (!host || host === document.body) return;
      if (host.children && host.children.length > 1) return;
    }
    if (host.classList) host.classList.add("qx-qx-wm-host");
  }

  function nukeDom(root) {
    try {
      (root || document).querySelectorAll(KILL_SEL).forEach((el) => {
        try {
          el.remove();
        } catch (_) { /* */ }
      });
    } catch (_) { /* */ }
  }

  function unwrap(url) {
    let s = String(url || "");
    if (/proxy-image|restore-image/i.test(s)) {
      try {
        const u = new URL(s, location.origin);
        const inner = u.searchParams.get("url");
        if (inner) s = inner;
      } catch (_) { /* */ }
    }
    return s
      .replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/")
      .split("?")[0];
  }

  function isCleanProxy(src) {
    return /\/api\/proxy-image/i.test(String(src || "")) && /clean=1/i.test(String(src || ""));
  }

  function pinCleanSrc(img) {
    if (!img) return;
    try {
      if (img.dataset.qxPinnedClean === "1" && isCleanProxy(img.getAttribute("src") || "")
        && /[?&]v=qxfig110(?:&|$)/i.test(img.getAttribute("src") || "")) {
        forceVisible(img);
        return;
      }
      const cur = img.getAttribute("src") || "";
      const orig = img.dataset.qxOrigSrc || cur;
      const joined = cur + " " + orig;
      if (!/cdn-question-pool|cdn\.quizrr|\/pyq\/|watermarked_images|getmarks\.app|proxy-image|firebasestorage|questions(%2F|\/)figs/i.test(joined)) {
        forceVisible(img);
        return;
      }
      const cdn = unwrap(orig || cur);
      if (!cdn) {
        forceVisible(img);
        return;
      }
      if (/\/assets\/(diagrams|book-covers|folder-icons)\//i.test(cdn) && !/getmarks|quizrr/i.test(cdn)) {
        forceVisible(img);
        bindRetry(img);
        return;
      }
      const owned = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.ownedFigureUrl)
        ? (QxOwnedFigs.ownedFigureUrl(cdn) || cdn)
        : cdn;
      img.dataset.qxOrigSrc = owned;
      img.dataset.qxStorageSrc = owned;
      if (isCleanProxy(cur) && /[?&]v=qxfig110(?:&|$)/i.test(cur) && !/getmarks|quizrr/i.test(cur)) {
        img.dataset.qxPinnedClean = "1";
        img.removeAttribute("crossorigin");
        img.classList.add("qx-wm-clean", "qx-no-wm", "qx-pool-fig");
        forceVisible(img);
        return;
      }
      const inner = /firebasestorage|\/assets\//i.test(owned) ? owned : cdn;
      const proxy = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc)
        ? QxOwnedFigs.displaySrc(cdn)
        : ("/api/proxy-image?url=" + encodeURIComponent(inner) + "&clean=1&v=qxfig110");
      if (proxy && cur !== proxy) {
        img.removeAttribute("crossorigin");
        img.crossOrigin = null;
        img.setAttribute("src", proxy);
      }
      img.dataset.qxPinnedClean = "1";
      img.classList.add("qx-wm-clean", "qx-no-wm", "qx-pool-fig", "qx-fig-ready");
      forceVisible(img);
      bindRetry(img);
    } catch (_) {
      forceVisible(img);
    }
  }

  function bindRetry(img) {
    if (!img || img.dataset.qxRetryBound === "1") return;
    img.dataset.qxRetryBound = "1";
    img.addEventListener("error", function () {
      const orig = this.dataset.qxOrigSrc || "";
      const n = parseInt(this.dataset.qxErrN || "0", 10);
      if (n >= 2 || !orig) {
        forceVisible(this);
        return;
      }
      this.dataset.qxErrN = String(n + 1);
      this.removeAttribute("crossorigin");
      const owned = this.dataset.qxStorageSrc
        || ((typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.ownedFigureUrl)
          ? QxOwnedFigs.ownedFigureUrl(orig)
          : "")
        || orig;
      if (/getmarks\.app|quizrr\.in/i.test(owned) && typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.ownedFigureUrl) {
        const mapped = QxOwnedFigs.ownedFigureUrl(owned);
        if (!mapped || /getmarks\.app|quizrr\.in/i.test(mapped)) {
          forceVisible(this);
          return;
        }
        if (n === 0) this.src = (typeof QxOwnedFigs.displaySrc === "function" ? QxOwnedFigs.displaySrc(mapped) : "")
          || ("/api/proxy-image?url=" + encodeURIComponent(mapped) + "&clean=1&v=qxfig110");
        else if (!/getmarks\.app|quizrr\.in/i.test(mapped)) this.src = mapped;
        return;
      }
      if (/getmarks\.app|quizrr\.in/i.test(owned)) {
        forceVisible(this);
        return;
      }
      if (n === 0) {
        this.src = "/api/proxy-image?url=" + encodeURIComponent(owned) + "&clean=1&v=qxfig110";
      } else {
        this.src = owned;
      }
    });
  }

  function schedulePass(root) {
    const scope = root || document.getElementById("app-main") || document;
    try {
      nukeDom(scope);
      if (typeof QuantrexStrip !== "undefined" && QuantrexStrip.scrubForeignBrandDom) {
        QuantrexStrip.scrubForeignBrandDom(scope);
      }
      scope.querySelectorAll(POOL_SEL).forEach((img) => {
        try {
          pinCleanSrc(img);
        } catch (_) {
          forceVisible(img);
        }
      });
    } catch (_) { /* */ }
  }

  function pass(root) {
    schedulePass(root);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => schedulePass(document.getElementById("app-main")));
  } else {
    schedulePass(document.getElementById("app-main"));
  }

  window.addEventListener("qx:question-rendered", () => {
    setTimeout(() => schedulePass(document.getElementById("app-main")), 50);
  });
  window.addEventListener("qx:practice-ready", () => {
    setTimeout(() => schedulePass(document.getElementById("app-main")), 90);
  });

  window.QxNoWmGuard = { pass, schedulePass, nukeDom, forceVisible, pinCleanSrc, stripCache: new Map() };
})();
