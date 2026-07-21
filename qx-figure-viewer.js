// Quantrex figures (~4 days ago style):
// - Question: bare clear figure, NO box, NO MARKS watermark
// - Circle "+" on the RIGHT of the figure
// - Click + → open original Marks figure (watermark OK only there)
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
    ".mtk-main img[src*='cdn-question-pool']",
    ".mtk-main img[src*='/pyq/']",
    ".mtk-main img[src*='proxy-image']",
    ".mtk-main img[src*='data:image']",
    ".qx-content img[src*='cdn-question-pool']",
    ".qx-content img[src*='/pyq/']",
    ".qx-content img[src*='proxy-image']"
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
    const src = String(img.getAttribute("src") || img.dataset.qxOrigSrc || "");
    return /cdn-assets\.getmarks|ic_content_exam_|formula_cards/i.test(src);
  }

  function isPoolFig(img) {
    if (!img || img.tagName !== "IMG" || isUiIcon(img)) return false;
    const src = img.getAttribute("src") || img.dataset.qxOrigSrc || "";
    if (img.classList.contains("qx-pool-fig") || img.classList.contains("qx-fig-img") || img.classList.contains("qx-no-wm")) {
      return /cdn-question-pool|cdn\.quizrr|\/pyq\/|proxy-image|data:image|assets\/diagrams|qx-figures/i.test(src) || img.naturalWidth > 40;
    }
    return /cdn-question-pool|cdn\.quizrr|\/pyq\/|proxy-image|data:image/i.test(src);
  }

  function originalMarksSrc(img) {
    if (!img) return "";
    let orig = fixOrigUrl(img.dataset.qxOrigSrc || "");
    if (/cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(orig) && !/proxy-image|data:image/i.test(orig)) return orig;
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
    lb.innerHTML =
      '<button type="button" class="qx-fig-lb-close" aria-label="Close">×</button>' +
      '<div class="qx-fig-lb-stage"><img class="qx-fig-lb-img" alt="" referrerpolicy="no-referrer" /></div>';
    document.body.appendChild(lb);
    document.body.classList.add("qx-fig-lb-open");
    const out = lb.querySelector(".qx-fig-lb-img");
    out.removeAttribute("crossorigin");
    out.src = src; // raw Marks — watermark OK only in zoom
    lb.querySelector(".qx-fig-lb-close").onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
    };
    lb.onclick = (e) => {
      if (e.target === lb || e.target.classList.contains("qx-fig-lb-stage")) close();
    };
  }

  function hostForImg(img) {
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
    // remove duplicate + buttons
    host.querySelectorAll("." + ZOOM_CLS).forEach((b, i) => {
      if (i > 0) b.remove();
    });
    let btn = host.querySelector("." + ZOOM_CLS);
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = ZOOM_CLS;
      btn.setAttribute("aria-label", "Zoom figure");
      btn.title = "Zoom";
      btn.textContent = "+";
      host.appendChild(btn);
    }
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openOriginalMarks(img);
    };
  }

  function cleanInPage(img) {
    if (!isPoolFig(img)) return;
    img.classList.add("qx-pool-fig", "qx-no-wm");
    img.style.setProperty("opacity", "1", "important");
    img.style.setProperty("visibility", "visible", "important");
    img.style.setProperty("display", "block", "important");
    try {
      // Ensure proxy for CORS + server clean
      const cur = String(img.getAttribute("src") || "");
      const orig = fixOrigUrl(img.dataset.qxOrigSrc || cur);
      if (
        /cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(orig) &&
        !/proxy-image|data:image/i.test(cur) &&
        typeof QxImgClean !== "undefined" &&
        QxImgClean.proxyImageUrl
      ) {
        if (!img.dataset.qxOrigSrc) img.dataset.qxOrigSrc = orig;
        img.crossOrigin = "anonymous";
        img.src = QxImgClean.proxyImageUrl(orig);
      }
      if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.paintMarksHideOnly) {
        if (img.dataset.qxSoftStrip !== "2" || img.dataset.qxSoftVer !== "20") {
          const run = () => void QxPremiumWM.paintMarksHideOnly(img);
          if (img.complete && img.naturalWidth > 8) run();
          else img.addEventListener("load", run, { once: true });
        }
      }
    } catch (_) { /* */ }
  }

  function stripOldChrome(scope) {
    try {
      scope.querySelectorAll(
        ".qx-diag-toolbar, .qx-diag-zoom-btns, .qx-diag-btn:not(.qx-fig-zoom-btn), .qx-diag-pct, .qx-diagram-hint, .qx-diagram-badge"
      ).forEach((n) => n.remove());
    } catch (_) { /* */ }
  }

  function bind(root) {
    const scope = root || document.getElementById("app-main") || document.body;
    if (!scope) return;
    stripOldChrome(scope);
    // also test root
    const roots = [scope];
    const test = document.querySelector(".mtk-test-root, .mtk-main, .marks-test-active");
    if (test && !scope.contains(test)) roots.push(test);
    roots.forEach((r) => {
      try {
        r.querySelectorAll(FIG_IMG_SEL + ", .mtk-main img, .mtk-opt-text img").forEach((img) => {
          if (!isPoolFig(img)) return;
          cleanInPage(img);
          ensureZoomBtn(img);
        });
      } catch (_) { /* */ }
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
    }, 50);
  }

  const obs = new MutationObserver(scheduleBind);
  function start() {
    close();
    bind(document);
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });
    // keep cleaning during tests
    setInterval(() => {
      const dirty = document.querySelectorAll(
        "img.qx-pool-fig:not([data-qx-soft-strip='2']), .mtk-main img[src*='cdn-question-pool'], .mtk-main img[src*='/pyq/']"
      );
      if (dirty.length) bind(document);
    }, 900);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.addEventListener("qx:question-rendered", scheduleBind);
  window.addEventListener("qx:practice-ready", scheduleBind);

  window.QxFigureViewer = { open: openOriginalMarks, close, bind, markClickable: bind, scheduleBind };
})();
