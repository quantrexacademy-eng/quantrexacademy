// Quantrex figures:
// - Question view: bare image only (no box), MARKS soft-stripped (no watermark)
// - Top-right zoom (+) button: opens original Marks figure (watermark OK there)
(function () {
  const LB_ID = "qxFigLightbox";
  const ZOOM_CLS = "qx-fig-zoom-btn";
  const FIG_IMG_SEL = [
    "img.qx-pool-fig",
    "img.qx-fig-img",
    "img.qx-no-wm",
    "#qxDiagramSlot img",
    ".qx-diagram-slot img",
    ".qx-opt-diagram-slot img",
    ".mtk-opt-text img.qx-pool-fig",
    ".qx-prac-opt-text img.qx-pool-fig",
    ".mtk-q-text img.qx-pool-fig",
    ".qx-content img[src*='cdn-question-pool']",
    ".qx-content img[src*='/pyq/']",
    ".qx-content img[src*='proxy-image']",
    ".qx-content img[src*='data:image']"
  ].join(", ");

  function close() {
    document.querySelectorAll("#" + LB_ID + ", .qx-fig-lightbox").forEach((el) => el.remove());
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
    if (img.classList.contains("qx-marks-icon") || img.classList.contains("fc-img")) return true;
    const src = String(img.getAttribute("src") || img.dataset.qxOrigSrc || "");
    return /cdn-assets\.getmarks|ic_content_exam_|formula_cards/i.test(src);
  }

  function isPoolFig(img) {
    if (!img || img.tagName !== "IMG" || isUiIcon(img)) return false;
    if (img.matches(FIG_IMG_SEL)) return true;
    const src = img.getAttribute("src") || img.dataset.qxOrigSrc || "";
    return /cdn-question-pool|cdn\.quizrr|\/pyq\/|proxy-image|data:image/i.test(src)
      || img.classList.contains("qx-pool-fig")
      || img.classList.contains("qx-fig-img");
  }

  /** Original Marks CDN — used only in zoom lightbox (may have watermark) */
  function originalMarksSrc(img) {
    if (!img) return "";
    let orig = fixOrigUrl(img.dataset.qxOrigSrc || "");
    if (/cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(orig) && !/proxy-image|data:image/i.test(orig)) {
      return orig;
    }
    const cur = String(img.getAttribute("src") || "");
    if (/proxy-image/i.test(cur)) {
      try {
        const u = new URL(cur, location.origin);
        const inner = u.searchParams.get("url");
        if (inner) return fixOrigUrl(decodeURIComponent(inner));
      } catch (_) { /* */ }
    }
    if (/cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(cur)) return fixOrigUrl(cur);
    return orig || cur;
  }

  function openOriginalMarks(img) {
    if (!img) return;
    close();
    const src = originalMarksSrc(img);
    if (!src) return;

    const lb = document.createElement("div");
    lb.id = LB_ID;
    lb.className = "qx-fig-lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.innerHTML =
      '<button type="button" class="qx-fig-lb-close" aria-label="Close">×</button>' +
      '<div class="qx-fig-lb-stage">' +
      '<img class="qx-fig-lb-img" alt="Original figure" referrerpolicy="no-referrer" />' +
      "</div>";
    document.body.appendChild(lb);
    document.body.classList.add("qx-fig-lb-open");

    const out = lb.querySelector(".qx-fig-lb-img");
    // RAW Marks CDN — watermark allowed only in this zoom view
    out.removeAttribute("crossorigin");
    out.src = src;

    lb.querySelector(".qx-fig-lb-close").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
    });
    lb.addEventListener("click", (e) => {
      if (e.target === lb || e.target.classList.contains("qx-fig-lb-stage")) close();
    });
  }

  function hostForImg(img) {
    if (!img) return null;
    return (
      img.closest(
        "#qxDiagramSlot, .qx-diagram-slot, .qx-opt-diagram-slot, .qx-diagram-seg, " +
        ".qx-fig-flat, .qx-pool-fig-wrap, .qx-fig, .qx-opt-fig, .qx-fig-inner"
      ) || img.parentElement
    );
  }

  function ensureZoomBtn(img) {
    if (!isPoolFig(img)) return;
    const host = hostForImg(img);
    if (!host) return;
    host.classList.add("qx-fig-host");
    // make host positioning context for absolute zoom btn
    const st = window.getComputedStyle ? getComputedStyle(host) : null;
    if (st && st.position === "static") {
      host.style.position = "relative";
    }
    let btn = host.querySelector("." + ZOOM_CLS);
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = ZOOM_CLS;
      btn.setAttribute("aria-label", "Zoom original figure");
      btn.title = "Zoom";
      btn.innerHTML = "+";
      host.appendChild(btn);
    }
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openOriginalMarks(img);
    };
  }

  function stripOldChrome(root) {
    const scope = root || document;
    try {
      // remove old multi-button toolbars (keep our single +)
      scope.querySelectorAll(
        ".qx-diag-toolbar, .qx-diag-zoom-btns, .qx-diag-btn:not(.qx-fig-zoom-btn), .qx-diag-pct, .qx-diagram-hint, .qx-diagram-badge"
      ).forEach((n) => n.remove());
      scope.querySelectorAll(".qx-diagram-panel").forEach((panel) => {
        const img = panel.querySelector("img");
        if (img && panel.parentNode) {
          panel.parentNode.insertBefore(img, panel);
          panel.remove();
        } else panel.remove();
      });
    } catch (_) { /* */ }
  }

  /** Soft-strip MARKS on question page (never show watermark until zoom) */
  function cleanInPage(img) {
    if (!isPoolFig(img)) return;
    try {
      if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.paintMarksHideOnly) {
        if (img.dataset.qxSoftStrip !== "2" || img.dataset.qxSoftVer !== "18") {
          void QxPremiumWM.paintMarksHideOnly(img);
        }
      }
    } catch (_) { /* */ }
  }

  function bind(root) {
    const scope = root || document.getElementById("app-main") || document.body;
    if (!scope) return;
    stripOldChrome(scope);
    try {
      scope.querySelectorAll(FIG_IMG_SEL).forEach((img) => {
        if (!isPoolFig(img)) return;
        img.classList.add("qx-pool-fig", "qx-no-wm");
        img.style.cursor = "default";
        ensureZoomBtn(img);
        cleanInPage(img);
      });
    } catch (_) { /* */ }
  }

  // Clicks on the image itself do NOT open zoom — only the + button
  document.addEventListener(
    "click",
    (e) => {
      const t = e.target;
      if (!t) return;
      if (t.classList && t.classList.contains(ZOOM_CLS)) return; // handled on btn
      if (t.closest && t.closest("." + ZOOM_CLS)) return;
      // block accidental legacy open on bare img
      if (t.tagName === "IMG" && isPoolFig(t) && !t.closest("#" + LB_ID)) {
        // allow selection; don't open
      }
    },
    true
  );

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  let bindTimer = 0;
  function scheduleBind(root) {
    if (bindTimer) return;
    bindTimer = window.setTimeout(() => {
      bindTimer = 0;
      bind(root || document.getElementById("app-main") || document.body);
    }, 60);
  }

  const obs = new MutationObserver(() => scheduleBind());
  function start() {
    close();
    bind(document);
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  window.addEventListener("qx:question-rendered", () => scheduleBind());
  window.addEventListener("qx:practice-ready", () => scheduleBind());

  window.QxFigureViewer = {
    open: openOriginalMarks,
    close,
    bind,
    markClickable: bind,
    scheduleBind
  };
})();
