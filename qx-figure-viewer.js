// Quantrex — figures stay IN the question (no lightbox / front overlay).
// Click does not open a separate present view (that pulled raw CDN + watermarks).
(function () {
  const WRAP_SEL = [
    "#qxDiagramSlot",
    ".qx-diagram-slot",
    ".qx-opt-diagram-slot",
    ".qx-fig",
    ".qx-opt-fig",
    ".qx-pool-fig-wrap",
    ".qx-fig-inner"
  ].join(", ");

  function close() {
    // Remove any leftover lightbox from older builds
    document.querySelectorAll("#qxFigLightbox, .qx-fig-lightbox").forEach((el) => el.remove());
    document.body.classList.remove("qx-fig-lb-open");
  }

  function open() {
    // Disabled — never bring figure to front (stays stuck in question)
    close();
  }

  function stripZoomChrome(root) {
    const scope = root || document;
    try {
      scope.querySelectorAll(
        ".qx-diag-toolbar, .qx-diag-zoom-btns, .qx-diag-btn, .qx-diag-pct, .qx-diagram-hint, .qx-diagram-badge"
      ).forEach((n) => n.remove());
      scope.querySelectorAll(".qx-diagram-panel").forEach((panel) => {
        const img = panel.querySelector("img");
        if (img && panel.parentNode) {
          panel.parentNode.insertBefore(img, panel);
          panel.remove();
        } else {
          panel.remove();
        }
      });
      scope.querySelectorAll("img.qx-pool-fig, img.qx-fig-img, img.qx-no-wm, .qx-diagram-wrap img").forEach((img) => {
        if (img.style) {
          if (img.style.transform) img.style.transform = "";
          if (img.style.zoom) img.style.zoom = "";
        }
        img.classList.remove("qx-fig-clickable");
        img.removeAttribute("title");
        img.style.cursor = "default";
      });
      scope.querySelectorAll(WRAP_SEL).forEach((wrap) => {
        wrap.classList.remove("qx-fig-clickable-wrap");
        wrap.style.cursor = "";
      });
    } catch (_) { /* */ }
  }

  function markClickable() {
    // no-op — figures are not click-to-open
  }

  function bind(root) {
    stripZoomChrome(root || document);
    close();
  }

  // Block any legacy lightbox / figure-open behaviour completely
  function isFigureTarget(t) {
    if (!t || !t.closest) return false;
    if (t.closest("#qxFigLightbox, .qx-fig-lightbox")) return true;
    if (t.closest(".qx-fig, .qx-opt-fig, .qx-diagram-slot, #qxDiagramSlot, .qx-pool-fig-wrap, .qx-fig-inner")) return true;
    if (t.tagName === "IMG" && (t.classList.contains("qx-pool-fig") || t.classList.contains("qx-fig-img") || t.classList.contains("qx-no-wm"))) return true;
    return false;
  }
  document.addEventListener(
    "click",
    (e) => {
      if (!isFigureTarget(e.target)) return;
      close();
      // Do not stop option selection when clicking option text outside the img —
      // only neutralize figure open (preventDefault on the image itself)
      if (e.target && e.target.tagName === "IMG") {
        e.preventDefault();
      }
    },
    true
  );
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
    if (document.body) {
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  window.addEventListener("qx:question-rendered", scheduleBind);
  window.addEventListener("qx:practice-ready", scheduleBind);

  window.QxFigureViewer = { open, close, bind, markClickable, stripZoomChrome };
})();
