// Quantrex figures: bare clean image only — no rectangular box, no zoom + button.
// Soft-strip MARKS on load; no click-to-open chrome.
(function () {
  const ZOOM_CLS = "qx-fig-zoom-btn";
  const STRIP_VER = "22";

  function close() {
    document.querySelectorAll("#qxFigLightbox, .qx-fig-lightbox").forEach((el) => el.remove());
    document.body.classList.remove("qx-fig-lb-open");
  }

  function fixOrigUrl(u) {
    return String(u || "")
      .replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/")
      .replace(/https?:\/\/cdn-question-pool\.app\//gi, "https://cdn-question-pool.getmarks.app/");
  }

  function isUiIcon(img) {
    if (!img) return true;
    if (img.closest(".qx-marks-icon, .exam-pill-logo, .fc-img, .qx-exam-logo, .subj-mini-ic")) return true;
    const src = String(img.getAttribute("src") || img.dataset.qxOrigSrc || "");
    return /cdn-assets\.getmarks|ic_content_exam_|formula_cards/i.test(src);
  }

  function isPoolFig(img) {
    if (!img || img.tagName !== "IMG" || isUiIcon(img)) return false;
    const src = img.getAttribute("src") || img.dataset.qxOrigSrc || "";
    return (
      /cdn-question-pool|cdn\.quizrr|\/pyq\/|proxy-image|data:image\/png|data:image\/jpeg/i.test(src) ||
      img.classList.contains("qx-pool-fig") ||
      img.classList.contains("qx-fig-img")
    );
  }

  function stripAllZoomChrome(scope) {
    const root = scope || document;
    try {
      root.querySelectorAll(
        "." + ZOOM_CLS +
        ", .qx-diag-toolbar, .qx-diag-zoom-btns, .qx-diag-btn, .qx-diag-pct, " +
        ".qx-diagram-hint, .qx-diagram-badge, #qxFigLightbox, .qx-fig-lightbox"
      ).forEach((el) => el.remove());
      root.querySelectorAll(".qx-fig-host, .qx-fig-clickable-wrap").forEach((el) => {
        el.classList.remove("qx-fig-host", "qx-fig-clickable-wrap");
        el.style.paddingRight = "";
      });
      root.querySelectorAll("img.qx-fig-clickable").forEach((img) => {
        img.classList.remove("qx-fig-clickable");
        img.style.cursor = "default";
        img.removeAttribute("title");
      });
    } catch (_) { /* */ }
  }

  function cleanInPage(img) {
    if (!isPoolFig(img)) return;
    img.classList.add("qx-pool-fig", "qx-no-wm");
    img.style.setProperty("opacity", "1", "important");
    img.style.setProperty("visibility", "visible", "important");
    img.style.setProperty("display", "block", "important");
    img.style.cursor = "default";

    try {
      const cur = String(img.getAttribute("src") || "");
      let orig = fixOrigUrl(img.dataset.qxOrigSrc || "");
      if (!orig || /proxy-image|data:image/i.test(orig)) {
        if (/proxy-image/i.test(cur)) {
          try {
            const u = new URL(cur, location.origin);
            const inner = u.searchParams.get("url");
            if (inner) orig = fixOrigUrl(decodeURIComponent(inner));
          } catch (_) { /* */ }
        } else if (/cdn-question-pool|\/pyq\//i.test(cur)) {
          orig = fixOrigUrl(cur);
        }
      }
      if (orig && /cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(orig)) {
        img.dataset.qxOrigSrc = orig;
      }

      if (
        orig &&
        /cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(orig) &&
        !/data:image/i.test(cur) &&
        typeof QxImgClean !== "undefined" &&
        QxImgClean.proxyImageUrl
      ) {
        const want = QxImgClean.proxyImageUrl(orig);
        if (!/proxy-image/i.test(cur) || !/v=22/.test(cur)) {
          img.crossOrigin = "anonymous";
          if (img.getAttribute("src") !== want) img.src = want;
        }
      }

      if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.paintMarksHideOnly) {
        if (img.dataset.qxSoftStrip !== "2" || img.dataset.qxSoftVer !== STRIP_VER) {
          const run = () => void QxPremiumWM.paintMarksHideOnly(img);
          if (img.complete && img.naturalWidth > 8) requestAnimationFrame(run);
          else img.addEventListener("load", run, { once: true });
        }
      }
    } catch (_) { /* */ }
  }

  function bind(root) {
    const scope = root || document.body;
    if (!scope || !scope.querySelectorAll) return;
    stripAllZoomChrome(scope);
    close();

    const imgs = scope.querySelectorAll(
      "img.qx-pool-fig, img.qx-fig-img, img.qx-no-wm, " +
      "#qxDiagramSlot img, .qx-diagram-slot img, .qx-opt-diagram-slot img, " +
      ".mtk-opt-text img, .qx-prac-opt-text img, .mtk-q-text img, " +
      ".mtk-main img[src*='cdn-question-pool'], .mtk-main img[src*='/pyq/'], " +
      ".mtk-main img[src*='proxy-image'], .mtk-main img[src*='data:image'], " +
      ".qx-content img[src*='cdn-question-pool'], .qx-content img[src*='/pyq/'], " +
      ".qx-content img[src*='proxy-image']"
    );
    imgs.forEach((img) => {
      if (isPoolFig(img)) cleanInPage(img);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  let t = 0;
  function scheduleBind() {
    if (t) return;
    t = window.setTimeout(() => {
      t = 0;
      bind(document);
    }, 80);
  }

  let lastBind = 0;
  const obs = new MutationObserver(() => {
    const now = Date.now();
    if (now - lastBind < 250) return;
    lastBind = now;
    scheduleBind();
  });

  function start() {
    close();
    bind(document);
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });
    setInterval(() => {
      // Keep + buttons gone if something re-injects them
      document.querySelectorAll("." + ZOOM_CLS + ", #qxFigLightbox, .qx-fig-lightbox").forEach((el) => el.remove());
      const dirty = document.querySelectorAll(
        "img.qx-pool-fig:not([data-qx-soft-ver='" + STRIP_VER + "']), " +
        ".mtk-main img[src*='cdn-question-pool'], .mtk-main img[src*='/pyq/']"
      );
      if (dirty.length) bind(document);
    }, 1400);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.addEventListener("qx:question-rendered", scheduleBind);
  window.addEventListener("qx:practice-ready", scheduleBind);

  window.QxFigureViewer = {
    open: () => close(),
    close,
    bind,
    markClickable: () => {},
    scheduleBind
  };
})();
