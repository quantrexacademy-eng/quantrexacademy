// Quantrex — NO click-to-open / lightbox.
// Click used to load raw CDN and show MARKS watermark. Figures stay as bare images only.
(function () {
  function close() {
    document.querySelectorAll("#qxFigLightbox, .qx-fig-lightbox").forEach((el) => el.remove());
    document.body.classList.remove("qx-fig-lb-open");
  }

  function stripZoomChrome(root) {
    const scope = root || document;
    try {
      scope.querySelectorAll(
        ".qx-diag-toolbar, .qx-diag-zoom-btns, .qx-diag-btn, .qx-diag-pct, .qx-diagram-hint, .qx-diagram-badge, #qxFigLightbox, .qx-fig-lightbox"
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
      scope.querySelectorAll("img.qx-pool-fig, img.qx-fig-img, img.qx-no-wm, .qx-diagram-wrap img, .qx-fig-flat img").forEach((img) => {
        if (img.style) {
          if (img.style.transform) img.style.transform = "";
          if (img.style.zoom) img.style.zoom = "";
        }
        img.classList.remove("qx-fig-clickable");
        img.removeAttribute("title");
        img.style.cursor = "default";
      });
      scope.querySelectorAll(
        "#qxDiagramSlot, .qx-diagram-slot, .qx-opt-diagram-slot, .qx-fig, .qx-opt-fig, .qx-pool-fig-wrap, .qx-fig-flat, .qx-fig-inner"
      ).forEach((wrap) => {
        wrap.classList.remove("qx-fig-clickable-wrap");
        wrap.style.cursor = "";
      });
    } catch (_) { /* */ }
  }

  function bind(root) {
    stripZoomChrome(root || document);
    close();
  }

  // Block figure open / zoom completely (watermark path)
  function isFigureTarget(t) {
    if (!t || !t.closest) return false;
    if (t.closest("#qxFigLightbox, .qx-fig-lightbox")) return true;
    if (t.closest(".qx-fig, .qx-opt-fig, .qx-diagram-slot, #qxDiagramSlot, .qx-pool-fig-wrap, .qx-fig-inner, .qx-fig-flat")) return true;
    if (t.tagName === "IMG" && (t.classList.contains("qx-pool-fig") || t.classList.contains("qx-fig-img") || t.classList.contains("qx-no-wm"))) return true;
    return false;
  }

  document.addEventListener(
    "click",
    (e) => {
      if (!isFigureTarget(e.target)) return;
      close();
      // Prevent open-on-click; allow option letter clicks outside the img
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
    open: () => close(),
    close,
    bind,
    markClickable: () => {},
    stripZoomChrome
  };
})();
