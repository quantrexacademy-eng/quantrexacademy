/* qxmd311: layout guard for the question screens (practice, test, CBT, Allen player).
   Root cause of the "footer runs to the left" report: the question scroll host (.eg-body / #qzrrQArea) was set to
   overflow-x:auto by qxAutoFitQuestion, and a long inline KaTeX line (e.g. a 450px sum on a 360px phone) made the whole
   question panel pan sideways under a horizontal swipe, so the page looked shifted left against the bottom bar.
   Fix: hosts never scroll sideways (CSS + this guard), wide math/tables/images/pre scroll inside their own box,
   and the fixed footer is re-pinned to left:0/right:0 if anything moves it. */
(function () {
  "use strict";
  if (window.__qxLayoutGuard311) return;
  window.__qxLayoutGuard311 = true;
  var HOSTS = ".eg-body, #egQArea.eg-body, #qzrrQArea, .qzrr-q-area, .eg-main, .eg-test-root, .mtk-test-root, .mtk-body, .allen-practice, #app-main";
  var WIDE_SCOPE = ".eg-test-root, .mtk-test-root, .qzrr-cbt, .allen-practice, #qaSolReveal, #egSolPanel, .qx-sol-card, .result-screen, #qzAnPage";
  function session() {
    var b = document.body;
    if (!b) return false;
    return !!document.querySelector(".eg-test-root, .mtk-test-root, .qzrr-cbt, .allen-practice");
  }
  function resetX(el) {
    try { if (el && el.scrollLeft) el.scrollLeft = 0; } catch (_) {}
  }
  function isHost(el) {
    try { return !!(el && el.nodeType === 1 && el.matches && el.matches(HOSTS)); } catch (_) { return false; }
  }
  /* any sideways scroll of a page-level host snaps back (inner .katex-display / table wrappers keep their own scroll) */
  document.addEventListener("scroll", function (e) {
    if (!session()) return;
    var t = e.target;
    if (t === document || t === document.documentElement || t === document.body) {
      if (window.scrollX) { try { window.scrollTo(0, window.scrollY); } catch (_) {} }
      return;
    }
    if (isHost(t) && t.scrollLeft) resetX(t);
  }, true);

  function markWide(root) {
    var scope = root || document;
    var list;
    try { list = scope.querySelectorAll(WIDE_SCOPE.split(",").map(function (x) { return x.trim() + " .katex"; }).join(",")); } catch (_) { return; }
    for (var i = 0; i < list.length; i++) {
      var k = list[i];
      if (k.closest(".katex-display") || k.closest("#qxPrintView")) continue;
      if (!k.closest(WIDE_SCOPE)) continue;
      var p = k.parentElement;
      if (!p) continue;
      var pw = p.clientWidth;
      if (!pw) continue;
      var kw = k.getBoundingClientRect().width;
      if (kw > pw + 1) {
        if (!k.classList.contains("qx-katex-wide")) k.classList.add("qx-katex-wide");
      } else if (k.classList.contains("qx-katex-wide") && k.scrollWidth <= pw + 1) {
        k.classList.remove("qx-katex-wide");
      }
    }
  }

  function footers() {
    var out = [];
    try {
      document.querySelectorAll("#egFoot, .eg-foot-marks, .qx-prac-foot, .mtk-footer, .qzrr-footer, .qzrr-foot").forEach(function (f) {
        if (!f.getClientRects().length) return;
        if (getComputedStyle(f).position === "fixed") out.push(f);
      });
    } catch (_) {}
    return out;
  }
  function pinFooters() {
    var vw = document.documentElement.clientWidth || window.innerWidth;
    footers().forEach(function (f) {
      var r = f.getBoundingClientRect();
      if (Math.abs(r.left) > 0.5 || Math.abs(r.right - vw) > 0.5) {
        f.style.setProperty("left", "0", "important");
        f.style.setProperty("right", "0", "important");
        f.style.setProperty("width", "100%", "important");
        f.style.setProperty("max-width", "100%", "important");
        f.style.setProperty("margin-left", "0", "important");
        f.style.setProperty("margin-right", "0", "important");
        f.style.setProperty("transform", "none", "important");
        f.style.setProperty("translate", "none", "important");
      }
      /* notch-safe side padding in landscape (inline: the footer painters set padding inline !important) */
      var pl = "max(12px, env(safe-area-inset-left, 0px))", pr = "max(12px, env(safe-area-inset-right, 0px))";
      if (f.style.getPropertyValue("padding-left") !== pl) f.style.setProperty("padding-left", pl, "important");
      if (f.style.getPropertyValue("padding-right") !== pr) f.style.setProperty("padding-right", pr, "important");
    });
  }

  var queued = false, calls = 0, winStart = 0;
  function run() {
    queued = false;
    var now = Date.now();
    if (now - winStart > 1000) { winStart = now; calls = 0; }
    if (++calls > 20) return; /* loop breaker */
    if (!session()) return;
    try { if (window.scrollX) window.scrollTo(0, window.scrollY); } catch (_) {}
    try { document.querySelectorAll(HOSTS).forEach(resetX); } catch (_) {}
    markWide(document);
    pinFooters();
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(run); } }
  window.qxLayoutGuardRun = run;
  function start() {
    try { new MutationObserver(queue).observe(document.body, { childList: true, subtree: true }); } catch (_) {}
    window.addEventListener("resize", queue, { passive: true });
    window.addEventListener("orientationchange", function () { setTimeout(queue, 250); }, { passive: true });
    try { if (window.visualViewport) window.visualViewport.addEventListener("resize", queue, { passive: true }); } catch (_) {}
    queue();
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
