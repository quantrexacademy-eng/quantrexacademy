/* qxmd372/qxmd383/qxmd384: Full toolbar toggle — show designed full toolbar on click (mobile).
   #egFullBtn / #pracFullBtn keep immersive fullscreen; separate #qxFullToolbarBtn toggles tools.
   qxmd383: debounce MutationObserver + re-entrancy guard (Practice mount was hanging Page Unresponsive).
   qxmd384: light-tap via pointerdown, observe #app-main only, rAF coalesce, no transition fight. */
(function () {
  "use strict";
  if (window.__qxFullToolbar372) return;
  window.__qxFullToolbar372 = true;
  var KEY = "qx_pref_full_toolbar";
  var _busy = false;
  var _scanT = 0;
  var _raf = 0;
  var _mo = null;
  var _lastApplied = null;
  var _obsRoot = null;

  function apply(on) {
    if (_busy) return;
    _busy = true;
    try {
      on = !!on;
      try {
        document.body.classList.toggle("qx-full-toolbar", on);
        localStorage.setItem(KEY, on ? "1" : "0");
      } catch (_) { /* */ }
      var btns = document.querySelectorAll("#qxFullToolbarBtn, [data-qx-full-toolbar]");
      btns.forEach(function (b) {
        b.setAttribute("aria-pressed", on ? "true" : "false");
        var tip = b.querySelector(".eg-tip, .qx-tip");
        if (tip) tip.textContent = on ? "Compact tools" : "Full toolbar";
        else if (!b.querySelector("svg")) b.title = on ? "Compact tools" : "Full toolbar";
      });
      /* qxmd382: Full toolbar -> desktop-like chrome; off -> mobile-close
         qxmd383: skip DOM class churn when state unchanged (avoids layout storms) */
      if (_lastApplied === on) {
        var roots = document.querySelectorAll(".eg-test-root");
        var needs = false;
        for (var i = 0; i < roots.length; i++) {
          var r = roots[i];
          var anyOpen = r.classList.contains("eg-side-open") || r.classList.contains("eg-strip-open") || r.classList.contains("eg-preview-open");
          var wantDesktop = !narrowFor(on) || anyOpen;
          if (r.classList.contains("eg-desktop-mode") !== wantDesktop) { needs = true; break; }
        }
        if (!needs && roots.length) { return; }
      }
      try {
        var narrow = narrowFor(on);
        document.querySelectorAll(".eg-test-root").forEach(function (root) {
          var anyOpen = root.classList.contains("eg-side-open") || root.classList.contains("eg-strip-open") || root.classList.contains("eg-preview-open");
          root.classList.toggle("eg-desktop-mode", !narrow || anyOpen);
          root.classList.toggle("eg-mobile", !!narrow && !anyOpen);
          root.classList.toggle("eg-mobile-vp", !!narrow && !anyOpen);
        });
      } catch (_) { /* */ }
      _lastApplied = on;
    } finally {
      _busy = false;
    }
  }

  function narrowFor(fullOn) {
    try {
      if (typeof window.qxEgIsNarrow === "function") return window.qxEgIsNarrow();
    } catch (_) { /* */ }
    return !fullOn;
  }

  function toggle() { apply(!document.body.classList.contains("qx-full-toolbar")); }

  function ensureBtn(tools) {
    if (!tools || tools.querySelector("#qxFullToolbarBtn")) return;
    var b = document.createElement("button");
    b.type = "button";
    b.id = "qxFullToolbarBtn";
    b.className = "eg-tool-btn qx-full-toolbar-btn";
    b.setAttribute("aria-label", "Full toolbar");
    b.setAttribute("title", "Full toolbar");
    b.style.cssText = "touch-action:manipulation;min-width:44px;min-height:44px;pointer-events:auto;-webkit-user-select:none;user-select:none";
    b.innerHTML = '<span class="eg-tip">Full toolbar</span>';
    /* qxmd384: fire on pointerdown for light-tap (no hard press / click delay) */
    var fired = 0;
    function fire(e) {
      if (e) {
        try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
      }
      var now = Date.now();
      if (now - fired < 280) return;
      fired = now;
      toggle();
    }
    b.addEventListener("pointerdown", function (e) {
      if (e && typeof e.button === "number" && e.button !== 0) return;
      fire(e);
    }, { passive: false });
    b.addEventListener("click", function (e) {
      /* fallback / a11y keyboard */
      fire(e);
    });
    try { if (_mo) _mo.disconnect(); } catch (_) { /* */ }
    try { tools.appendChild(b); } catch (_) { /* */ }
    try { reobserve(); } catch (_) { /* */ }
  }

  function scan() {
    if (_busy) return;
    document.querySelectorAll(".eg-top-tools, .mtk-header-tools").forEach(ensureBtn);
    var pressed = false;
    try { pressed = localStorage.getItem(KEY) === "1"; } catch (_) { /* */ }
    /* qxmd382: phone/app default = compact (mobile view); Full toolbar is opt-in */
    try {
      var el = document.documentElement;
      var compact = el && (el.classList.contains("qx-compact") || el.classList.contains("qx-app") || el.classList.contains("qx-phone") || el.getAttribute("data-qx-shell") === "app");
      if (compact && localStorage.getItem(KEY) == null) pressed = false;
    } catch (_) { /* */ }
    apply(pressed);
  }

  function scheduleScan() {
    if (_busy) return;
    /* qxmd384: coalesce MO storms with rAF + short debounce (smoother toolbar, less jank) */
    if (_raf) return;
    _raf = requestAnimationFrame(function () {
      _raf = 0;
      if (_scanT) return;
      _scanT = setTimeout(function () {
        _scanT = 0;
        try { scan(); } catch (_) { /* */ }
      }, 120);
    });
  }

  document.addEventListener("pointerdown", function (e) {
    var t = e.target && e.target.closest && e.target.closest("[data-qx-full-toolbar]");
    if (!t || t.id === "qxFullToolbarBtn") return;
    if (e && typeof e.button === "number" && e.button !== 0) return;
    try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
    toggle();
  }, true);

  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest("[data-qx-full-toolbar], #qxFullToolbarBtn");
    if (!t) return;
    /* button already handled on pointerdown; allow keyboard-activated click only */
    if (t.id === "qxFullToolbarBtn" && e.detail !== 0) {
      try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
      return;
    }
    if (t.id === "qxFullToolbarBtn") return;
    e.preventDefault();
    e.stopPropagation();
    toggle();
  }, true);

  function reobserve() {
    if (!_mo) return;
    _obsRoot = document.getElementById("app-main") || document.body;
    if (!_obsRoot) return;
    try {
      _mo.observe(_obsRoot, { childList: true, subtree: true });
    } catch (_) { /* */ }
  }

  function start() {
    scan();
    try {
      _mo = new MutationObserver(scheduleScan);
      reobserve();
      /* if app-main appears later, switch observation off body */
      if (!document.getElementById("app-main") && document.body) {
        var boot = new MutationObserver(function () {
          if (document.getElementById("app-main")) {
            try { boot.disconnect(); } catch (_) {}
            try { if (_mo) _mo.disconnect(); } catch (_) {}
            reobserve();
          }
        });
        boot.observe(document.body, { childList: true, subtree: true });
        setTimeout(function () { try { boot.disconnect(); } catch (_) {} }, 8000);
      }
    } catch (_) { /* */ }
  }
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
  window.qxToggleFullToolbar = toggle;
  window.qxSetFullToolbar = apply;
})();
