/**
 * Quantrex brand UI — DISABLED (owner request: remove branding overlays)
 * Sidebar logo text in HTML is left as-is; no seals / chips / panel watermarks.
 */
(function () {
  "use strict";

  function removeBrandUi() {
    try {
      ["qxUiBrandSeal", "qxUiBrandChip"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
      document.querySelectorAll(".qx-ui-brand-seal, .qx-ui-brand-chip, .qx-ui-brand-corner").forEach(function (el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
      document.querySelectorAll(".qx-ui-branded").forEach(function (el) {
        el.classList.remove("qx-ui-branded");
      });
    } catch (e) { /* ignore */ }
  }

  function start() {
    removeBrandUi();
    // Strip again if something re-injects
    setTimeout(removeBrandUi, 400);
    setTimeout(removeBrandUi, 1500);
    if (typeof MutationObserver !== "undefined" && document.body) {
      var t = 0;
      var obs = new MutationObserver(function () {
        clearTimeout(t);
        t = setTimeout(removeBrandUi, 60);
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }

  window.QxBrandUI = { apply: removeBrandUi, disabled: true };
})();
