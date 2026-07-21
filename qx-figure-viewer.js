// Quantrex — figure zoom opens CLEAN image only (never raw Marks CDN with watermark).
// In-page figures keep original quality via proxy + soft-strip; zoom uses same cleaned src.
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
    ".qx-content img[src*='data:image']",
    ".qx-content img[src*='qx-figures']",
    ".qx-content img[src*='assets/diagrams']"
  ].join(", ");

  function close() {
    document.querySelectorAll("#" + LB_ID + ", .qx-fig-lightbox").forEach((el) => el.remove());
    document.body.classList.remove("qx-fig-lb-open");
  }

  /** Prefer already-cleaned display (data: after soft-strip, or clean proxy) — never dirty CDN alone */
  function cleanedSrcFor(img) {
    if (!img) return "";
    const cur = String(img.getAttribute("src") || "");
    if (cur.startsWith("data:image") && img.dataset.qxSoftStrip === "2") return cur;
    if (cur.startsWith("data:image") && cur.length > 200) return cur;
    if (/proxy-image/i.test(cur) && /clean=1/i.test(cur)) return cur;
    if (/\/assets\/(qx-figures|diagrams|clean-diagrams)\//i.test(cur)) return cur;
    const orig = String(img.dataset.qxOrigSrc || cur || "");
    if (typeof QxImgClean !== "undefined" && QxImgClean.proxyImageUrl && /cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(orig)) {
      return QxImgClean.proxyImageUrl(orig);
    }
    return cur || orig;
  }

  async function ensureCleanThenOpen(img) {
    if (!img) return;
    close();
    // Soft-strip in place first so zoom shows watermark-free original-quality art
    try {
      if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.paintMarksHideOnly) {
        if (img.dataset.qxSoftStrip !== "2" || img.dataset.qxSoftVer !== "17") {
          await QxPremiumWM.paintMarksHideOnly(img);
        }
      }
    } catch (_) { /* */ }

    let src = cleanedSrcFor(img);
    if (!src) return;

    const lb = document.createElement("div");
    lb.id = LB_ID;
    lb.className = "qx-fig-lightbox";
    lb.setAttribute("role", "dialog");
    lb.setAttribute("aria-modal", "true");
    lb.innerHTML =
      '<button type="button" class="qx-fig-lb-close" aria-label="Close">×</button>' +
      '<div class="qx-fig-lb-stage">' +
      '<img class="qx-fig-lb-img qx-pool-fig qx-no-wm" alt="Figure" />' +
      "</div>";
    document.body.appendChild(lb);
    document.body.classList.add("qx-fig-lb-open");

    const out = lb.querySelector(".qx-fig-lb-img");
    out.style.cssText =
      "max-width:min(96vw,1100px);max-height:88vh;width:auto;height:auto;object-fit:contain;background:#fff;display:block;margin:auto;";
    out.dataset.qxOrigSrc = String(img.dataset.qxOrigSrc || img.getAttribute("src") || "");
    out.crossOrigin = "anonymous";

    const finishStrip = async () => {
      try {
        if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.paintMarksHideOnly) {
          await QxPremiumWM.paintMarksHideOnly(out);
        }
      } catch (_) { /* */ }
    };

    out.onload = () => {
      void finishStrip();
    };
    out.src = src;
    if (out.complete && out.naturalWidth > 0) void finishStrip();

    lb.querySelector(".qx-fig-lb-close").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
    });
    lb.addEventListener("click", (e) => {
      if (e.target === lb || e.target.classList.contains("qx-fig-lb-stage")) close();
    });
  }

  function openFromEvent(e) {
    const t = e.target;
    if (!t || !t.closest) return;
    if (t.closest(".qx-fig-lb-close, button, a, input, .mtk-opt-letter, .qx-prac-opt-letter")) return;
    const img =
      t.tagName === "IMG"
        ? t
        : t.querySelector && t.closest("#qxDiagramSlot, .qx-diagram-slot, .qx-opt-diagram-slot, .qx-fig, .qx-pool-fig-wrap, .qx-fig-flat")
          ? t.closest("#qxDiagramSlot, .qx-diagram-slot, .qx-opt-diagram-slot, .qx-fig, .qx-pool-fig-wrap, .qx-fig-flat").querySelector("img")
          : null;
    if (!img) return;
    if (!img.matches(FIG_SEL) && !img.classList.contains("qx-pool-fig") && !img.classList.contains("qx-fig-img")) {
      const src = img.getAttribute("src") || "";
      if (!/cdn-question-pool|\/pyq\/|proxy-image|data:image|qx-figures|assets\/diagrams/i.test(src)) return;
    }
    e.preventDefault();
    e.stopPropagation();
    void ensureCleanThenOpen(img);
  }

  function markClickable(root) {
    const scope = root || document;
    try {
      scope.querySelectorAll(FIG_SEL).forEach((img) => {
        if (!img || img.closest(".qx-marks-icon, .exam-pill-logo, .fc-img")) return;
        img.classList.add("qx-fig-clickable");
        img.style.cursor = "zoom-in";
        img.title = img.title || "Click to enlarge (clean view)";
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

  function bind(root) {
    markClickable(root || document);
  }

  document.addEventListener("click", openFromEvent, true);
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
    open: (img) => void ensureCleanThenOpen(img),
    close,
    bind,
    markClickable
  };
})();
