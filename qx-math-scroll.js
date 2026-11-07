/* qxmd392e: wide formulas get a REAL horizontal scroll box instead of being clipped.
   Progressive enhancement after render: only formulas that are actually wider than the box that clips them
   are wrapped (inline -> inline-block span, display -> block div). The KaTeX/MathJax subtree is moved as-is:
   nothing is re-typeset, rewritten or shrunk. Event-driven (MutationObserver + resize), no polling timers. */
(function (root) {
  "use strict";
  var SEL = ".katex-display, mjx-container[display=\"true\"], .katex, mjx-container";
  var WRAP = "qx-mscroll";
  function isClipper(el, win) {
    var cs = win.getComputedStyle(el);
    var ox = cs.overflowX || cs.overflow;
    return ox === "hidden" || ox === "clip" || ox === "auto" || ox === "scroll";
  }
  /* tightest right edge among ALL ancestors that clip/scroll horizontally (an outer clipper can be narrower
     than an inner auto-scroll box that grew with its content), plus the viewport */
  function limitRight(el, win, stop) {
    var lim = win.innerWidth || 1e9;
    for (var p = el.parentElement; p && p !== stop; p = p.parentElement) {
      if (p.classList && p.classList.contains(WRAP)) continue;
      if (isClipper(p, win)) lim = Math.min(lim, innerRight(p, win));
    }
    return lim;
  }
  function innerRight(box, win) {
    var r = box.getBoundingClientRect(), cs = win.getComputedStyle(box);
    return r.left + (box.clientLeft || 0) + (box.clientWidth || r.width) - (parseFloat(cs.paddingRight) || 0);
  }
  function topLevel(el) {
    /* skip inline .katex that sits inside a display block or another formula: wrap the outermost only */
    for (var p = el.parentElement; p; p = p.parentElement) {
      if (p.classList && (p.classList.contains("katex-display") || p.classList.contains("katex") || p.classList.contains(WRAP))) return false;
      if (p.tagName && p.tagName.toLowerCase() === "mjx-container") return false;
    }
    return true;
  }
  function fit(w, lim) {
    w.style.maxWidth = "";
    var r = w.getBoundingClientRect(), avail = Math.floor(lim - r.left);
    if (r.right > lim + 0.5) w.style.maxWidth = Math.max(40, avail) + "px";
  }
  function process(scope, win, doc, stop) {
    var list = scope.querySelectorAll ? scope.querySelectorAll(SEL) : [];
    var changed = 0;
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (!topLevel(el)) continue;
      var w = el.parentElement && el.parentElement.classList.contains(WRAP) ? el.parentElement : null;
      var lim = limitRight(w || el, win, stop);
      if (w) { fit(w, lim); continue; }
      var r = el.getBoundingClientRect();
      if (r.width < 1 || r.right <= lim + 0.5) continue; /* fits: untouched */
      var block = el.classList.contains("katex-display") || el.getAttribute("display") === "true";
      w = doc.createElement(block ? "div" : "span");
      w.className = WRAP + (block ? " qx-mscroll-block" : "");
      w.setAttribute("tabindex", "0");
      w.setAttribute("role", "region");
      w.setAttribute("aria-label", "Wide formula, scroll sideways");
      el.parentNode.insertBefore(w, el);
      w.appendChild(el);
      fit(w, limitRight(w, win, stop));
      changed++;
    }
    return changed;
  }
  function start(win, doc) {
    var host = doc.getElementById("app-main") || doc.body;
    if (!host) return;
    var raf = 0;
    function run() { raf = 0; try { process(host, win, doc, null); } catch (_) { /* never break the page */ } }
    function q() { if (!raf) raf = win.requestAnimationFrame(run); }
    if (win.MutationObserver) new win.MutationObserver(q).observe(host, { childList: true, subtree: true });
    win.addEventListener("resize", q, { passive: true });
    if (win.visualViewport) win.visualViewport.addEventListener("resize", q, { passive: true });
    q();
  }
  var api = { process: process, limitRight: limitRight, topLevel: topLevel, WRAP: WRAP };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else {
    root.QxMathScroll = api;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { start(window, document); });
    else start(window, document);
  }
})(typeof window !== "undefined" ? window : globalThis);
