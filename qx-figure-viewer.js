// Quantrex figure behaviour (user request):
// - Question open → cleaned figure (no MARKS watermark)
// - Click image → original Marks CDN figure (with watermark) in lightbox
// - Bare image in page (no card chrome)
(function () {
  const LB_ID = "qxFigLightbox";
  const FIG_SEL = [
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

  /** Original Marks CDN (may include watermark) — for click-to-view only */
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
    // Intentionally RAW Marks CDN — user wants watermark only here on click
    out.removeAttribute("crossorigin");
    out.src = src;
    // Do NOT run soft-strip / paintMarksHideOnly on this lightbox image

    lb.querySelector(".qx-fig-lb-close").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
    });
    lb.addEventListener("click", (e) => {
      if (e.target === lb || e.target.classList.contains("qx-fig-lb-stage")) close();
    });
  }

  function isPoolFigureImg(img) {
    if (!img || img.tagName !== "IMG") return false;
    if (img.closest(".qx-marks-icon, .exam-pill-logo, .fc-img, .qx-exam-logo")) return false;
    if (img.matches(FIG_SEL)) return true;
    const src = img.getAttribute("src") || img.dataset.qxOrigSrc || "";
    return /cdn-question-pool|cdn\.quizrr|\/pyq\/|proxy-image|data:image/i.test(src)
      || img.classList.contains("qx-pool-fig")
      || img.classList.contains("qx-fig-img");
  }

  function markClickable(root) {
    const scope = root || document;
    try {
      scope.querySelectorAll(FIG_SEL).forEach((img) => {
        if (!isPoolFigureImg(img)) return;
        img.classList.add("qx-fig-clickable");
        img.style.cursor = "zoom-in";
        img.title = "Click for original Marks figure";
        const wrap = img.closest(
          "#qxDiagramSlot, .qx-diagram-slot, .qx-opt-diagram-slot, .qx-fig, .qx-pool-fig-wrap, .qx-fig-flat, .qx-fig-inner"
        );
        if (wrap) {
          wrap.classList.add("qx-fig-clickable-wrap");
          wrap.style.cursor = "zoom-in";
        }
      });
    } catch (_) { /* */ }
  }

  function onClick(e) {
    const t = e.target;
    if (!t || !t.closest) return;
    if (t.closest(".qx-fig-lb-close, button, a, input, .mtk-opt-letter, .qx-prac-opt-letter")) return;

    let img = null;
    if (t.tagName === "IMG" && isPoolFigureImg(t)) {
      img = t;
    } else {
      const wrap = t.closest(
        "#qxDiagramSlot, .qx-diagram-slot, .qx-opt-diagram-slot, .qx-fig, .qx-pool-fig-wrap, .qx-fig-flat, .qx-fig-inner"
      );
      if (wrap) {
        const cand = wrap.querySelector("img");
        if (cand && isPoolFigureImg(cand)) img = cand;
      }
    }
    if (!img) return;
    e.preventDefault();
    e.stopPropagation();
    openOriginalMarks(img);
  }

  function bind(root) {
    markClickable(root || document);
  }

  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  let bindTimer = 0;
  function scheduleBind() {
    if (bindTimer) return;
    bindTimer = window.setTimeout(() => {
      bindTimer = 0;
      bind(document.getElementById("app-main") || document.body);
    }, 80);
  }

  const obs = new MutationObserver(scheduleBind);
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

  window.addEventListener("qx:question-rendered", scheduleBind);
  window.addEventListener("qx:practice-ready", scheduleBind);

  window.QxFigureViewer = {
    open: openOriginalMarks,
    close,
    bind,
    markClickable
  };
})();
