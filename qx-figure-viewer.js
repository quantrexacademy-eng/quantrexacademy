/**
 * Quantrex figures — Marks website style (CDN + watermark).
 * NO zoom button (user request). Digital books: never rewrite.
 * Optional: click figure still opens lightbox only if double-click disabled — no button.
 */
(function () {
  "use strict";

  const HOST_CLS = "qx-fig-host";
  const ZOOM_CLS = "qx-fig-zoom-btn";
  const LB_ID = "qxFigLightbox";

  function fixUrl(u) {
    return String(u || "")
      .replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/")
      .replace(/https?:\/\/cdn-question-pool\.app\//gi, "https://cdn-question-pool.getmarks.app/");
  }

  function unwrapProxy(url) {
    const s = String(url || "");
    try {
      if (/proxy-image|restore-image/i.test(s)) {
        const u = new URL(s, location.origin);
        const inner = u.searchParams.get("url");
        if (inner) return fixUrl(decodeURIComponent(inner));
      }
    } catch (_) { /* */ }
    return fixUrl(s);
  }

  function isBookContext(img) {
    if (!img) return false;
    if (img.closest(".qx-marks-native, .qx-marks-native-q, .qx-marks-native-opt, [data-book-id], .qx-book-reader")) {
      return true;
    }
    const src = String(img.getAttribute("src") || "");
    return /\/assets\/(diagrams|qx-figures|clean-diagrams|books)\//i.test(src)
      || /qx-book-|qx-irodov|hcv-|qx-org-|qx-perm-|qx-alc-/i.test(src);
  }

  function isUiIcon(img) {
    if (!img || img.tagName !== "IMG") return true;
    if (
      img.closest(
        ".qx-marks-icon, .exam-pill-logo, .fc-img, .qx-exam-logo, .subj-mini-ic, " +
          ".qx-book-photo, .qx-book-cover, .book-card, .dash-tool-logo, header, nav, .sidebar-logo"
      )
    ) {
      return true;
    }
    const src = String(img.getAttribute("src") || img.dataset.qxOrigSrc || "");
    return /cdn-assets\.getmarks|ic_content_exam_|formula_cards|book-cover|logo/i.test(src);
  }

  function isStudyFig(img) {
    if (!img || img.tagName !== "IMG" || isUiIcon(img)) return false;
    const src = img.getAttribute("src") || img.dataset.qxOrigSrc || "";
    if (
      img.classList.contains("qx-pool-fig") ||
      img.classList.contains("qx-fig-img") ||
      img.classList.contains("qx-opt-fig-img") ||
      img.classList.contains("qx-sol-fig")
    ) {
      return true;
    }
    return /cdn-question-pool|cdn\.quizrr|\/pyq\/|proxy-image/i.test(src);
  }

  function marksNativeSrc(url) {
    const u = unwrapProxy(url);
    if (!u || /^data:/.test(u)) return u;
    if (/\/assets\//i.test(u)) return u.split("?")[0];
    if (/cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(u)) return fixUrl(u);
    return u;
  }

  /** Strip zoom chrome; pin Marks CDN; never wrap books */
  function cleanInPage(img) {
    if (!img || !img.isConnected) return;
    // Digital books — no touch
    if (isBookContext(img)) return;
    if (!isStudyFig(img)) return;

    // Remove any Zoom buttons permanently
    const parent = img.parentNode;
    if (parent) {
      parent.querySelectorAll("." + ZOOM_CLS + ", .qx-diag-btn, .qx-diag-toolbar, .qx-diagram-badge").forEach((el) => el.remove());
    }
    document.querySelectorAll("." + ZOOM_CLS).forEach((el) => {
      if (el.closest && el.closest(".mtk-main, .qx-content, #app-main")) el.remove();
    });

    // Unwrap host if it only exists for zoom button
    let host = img.closest("." + HOST_CLS);
    if (host && host.parentNode) {
      // Move img out of host if host is only a zoom wrapper
      const onlyZoomChrome = !host.querySelector("img:not(.qx-pool-fig)") || host.children.length <= 2;
      if (onlyZoomChrome) {
        while (host.firstChild) host.parentNode.insertBefore(host.firstChild, host);
        host.remove();
      }
    }

    let orig = marksNativeSrc(img.dataset.qxOrigSrc || img.getAttribute("src") || "");
    if (!orig) return;
    img.dataset.qxOrigSrc = orig;
    img.dataset.qxHdSrc = orig;
    img.removeAttribute("crossorigin");
    img.removeAttribute("title");
    img.classList.remove("qx-fig-clickable");
    img.style.cursor = "default";
    img.style.opacity = "1";
    img.style.visibility = "visible";
    img.style.display = "block";
    img.classList.add("qx-pool-fig", "qx-fig-ready", "qx-marks-native-fig");

    // Force raw CDN (unwrap proxy that hides figures)
    const cur = String(img.getAttribute("src") || "");
    if (/proxy-image|restore-image/i.test(cur) || cur !== orig) {
      if (/cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(orig)) {
        img.setAttribute("src", orig);
      }
    }
    img.dataset.qxViewerBound = "1";
    img.dataset.qxFigFrozen = "1";
  }

  function bind(root) {
    const scope = root || document.body;
    if (!scope || !scope.querySelectorAll) return;
    // Global kill zoom buttons in practice UI
    scope.querySelectorAll("." + ZOOM_CLS + ", button.qx-fig-zoom-btn").forEach((el) => el.remove());
    scope.querySelectorAll("img").forEach((img) => {
      if (isBookContext(img)) return;
      if (isStudyFig(img)) cleanInPage(img);
    });
  }

  function scheduleBind() {
    setTimeout(() => bind(document.getElementById("app-main") || document.body), 40);
  }

  function start() {
    bind(document);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.addEventListener("qx:question-rendered", scheduleBind);
  window.addEventListener("qx:practice-ready", scheduleBind);

  // No lightbox / open API (zoom removed)
  window.QxFigureViewer = {
    open: function () { /* disabled */ },
    close: function () {
      document.body.classList.remove("qx-fig-lb-open");
      const lb = document.getElementById(LB_ID);
      if (lb) lb.classList.remove("qx-lb-open");
    },
    bind,
    markClickable: function () { /* no zoom btn */ },
    scheduleBind
  };
})();
