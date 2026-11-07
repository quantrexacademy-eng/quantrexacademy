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
    /* skip inline .katex that sits inside a display block or another formula: handle the outermost only.
       (an existing .qx-mscroll wrapper is NOT a reason to skip: that branch re-fits it on resize) */
    for (var p = el.parentElement; p; p = p.parentElement) {
      if (p.classList && (p.classList.contains("katex-display") || p.classList.contains("katex"))) return false;
      if (p.tagName && p.tagName.toLowerCase() === "mjx-container") return false;
    }
    return true;
  }
  /* inline !important: stylesheet `max-width:100% !important` would otherwise beat a plain inline style */
  /* qxmd392h: never remove+reapply an unchanged cap (that relayouts and can snap scrollLeft to 0);
     change the cap only when the available width really changed, and keep the user's scroll position. */
  function fit(w, lim) {
    var r = w.getBoundingClientRect(), avail = Math.max(40, Math.floor(lim - r.left));
    var cur = w.style.getPropertyValue("max-width"), want = avail + "px";
    if (cur) { if (cur === want) return false; }
    else if (!(r.right > lim + 0.5)) return false;
    var sl = w.scrollLeft;
    w.style.setProperty("max-width", want, "important");
    if (sl && w.scrollLeft !== sl) { try { w.scrollLeft = sl; } catch (_) {} }
    return true;
  }
  /* only real scroll regions get inline !important overflow (beats every stylesheet / injected rule) */
  function forceScroll(el) {
    if (el.style.getPropertyValue("overflow-x") !== "auto" || el.style.getPropertyPriority("overflow-x") !== "important") el.style.setProperty("overflow-x", "auto", "important");
    if (el.style.getPropertyValue("overflow-y") !== "hidden" || el.style.getPropertyPriority("overflow-y") !== "important") el.style.setProperty("overflow-y", "hidden", "important");
  }
  /* MutationObserver filter: text-only changes (per-question timer textContent) are ignored;
     newly inserted ELEMENTS (a rendered question/solution/formula) are processed */
  function wantsProcess(records) {
    for (var i = 0; i < (records ? records.length : 0); i++) {
      var a = records[i].addedNodes;
      for (var j = 0; j < (a ? a.length : 0); j++) if (a[j].nodeType === 1 && !(a[j].id === "qxMathQA")) return true;
    }
    return false;
  }
  /* painted right edge of the formula: the box itself OR its intrinsic content (a CSS-limited box can hide
     an oversized child: rect fits, but scrollWidth > clientWidth and the child paints past the card) */
  function paintRight(el) {
    var r = el.getBoundingClientRect(), right = r.right;
    var k = el.firstElementChild; if (k) right = Math.max(right, k.getBoundingClientRect().right);
    if (el.scrollWidth && el.clientWidth) right = Math.max(right, r.left + el.scrollWidth);
    return right;
  }
  function markRegion(el) {
    if (el.getAttribute("tabindex") == null) el.setAttribute("tabindex", "0");
    el.setAttribute("role", "region");
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", "Wide formula, scroll sideways");
    el.classList.add("qx-mscroll-on");
    forceScroll(el);
  }
  function process(scope, win, doc, stop) {
    var list = scope.querySelectorAll ? scope.querySelectorAll(SEL) : [];
    var changed = 0;
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (!topLevel(el)) continue;
      var block = el.classList.contains("katex-display") || el.getAttribute("display") === "true";
      if (block) {
        /* display formula: the .katex-display box itself is the scroll region (CSS gives it overflow-x:auto);
           cap it to the tightest clipping ancestor, inner .katex keeps natural width */
        var limB = limitRight(el, win, stop);
        if (el.getBoundingClientRect().width < 1) continue;
        if (paintRight(el) <= limB + 0.5 && !(el.scrollWidth > el.clientWidth + 1)) continue;
        fit(el, limB);
        if (el.scrollWidth > el.clientWidth + 1 || paintRight(el) > el.getBoundingClientRect().right + 0.5) { markRegion(el); changed++; }
        continue;
      }
      var w = el.parentElement && el.parentElement.classList.contains(WRAP) ? el.parentElement : null;
      var lim = limitRight(w || el, win, stop);
      if (w) { fit(w, lim); continue; }
      var r = el.getBoundingClientRect();
      if (r.width < 1 || paintRight(el) <= lim + 0.5) continue; /* fits: untouched */
      w = doc.createElement("span");
      w.className = WRAP;
      w.setAttribute("tabindex", "0");
      w.setAttribute("role", "region");
      w.setAttribute("aria-label", "Wide formula, scroll sideways");
      forceScroll(w);
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
    function run() { raf = 0; try { process(host, win, doc, null); stats(host, win, doc); } catch (_) { /* never break the page */ } }
    function q() { if (!raf) raf = win.requestAnimationFrame(run); }
    if (win.MutationObserver) new win.MutationObserver(function (recs) { if (wantsProcess(recs)) q(); }).observe(host, { childList: true, subtree: true });
    var sraf = 0;
    doc.addEventListener("scroll", function (e) {
      var t = e.target; if (!t || !t.classList || !(t.classList.contains("qx-mscroll-on") || t.classList.contains(WRAP))) return;
      if (!sraf) sraf = win.requestAnimationFrame(function () { sraf = 0; try { stats(host, win, doc); } catch (_) {} });
    }, true);
    win.addEventListener("resize", q, { passive: true });
    if (win.visualViewport) win.visualViewport.addEventListener("resize", q, { passive: true });
    if (win.ResizeObserver) new win.ResizeObserver(q).observe(host);
    if (doc.fonts) { if (doc.fonts.ready) doc.fonts.ready.then(q); if (doc.fonts.addEventListener) doc.fonts.addEventListener("loadingdone", q); }
    q();
  }
  /* PREVIEW-ONLY read-only QA panel (window.QX_PREVIEW_GUEST is set only by the preview guard) + ?qxqa=1 */
  function stats(host, win, doc) {
    var on = win.QX_PREVIEW_GUEST && /[?&]qxqa=1/.test(win.location.search);
    if (!on) return;
    var rows = [], list = host.querySelectorAll(".katex-display, ." + WRAP);
    for (var i = 0; i < list.length; i++) {
      var e = list[i]; if (!e.getBoundingClientRect().width) continue;
      var lim = limitRight(e, win, null);
      rows.push((e.classList.contains(WRAP) ? "wrap" : "disp") + (e.classList.contains("qx-mscroll-on") || e.classList.contains(WRAP) ? "+region" : "") +
        " ox=" + win.getComputedStyle(e).overflowX + " left=" + Math.round(e.scrollLeft) + "/" + Math.max(0, e.scrollWidth - e.clientWidth) +
        " client=" + e.clientWidth + " scroll=" + e.scrollWidth + " right=" + Math.round(e.getBoundingClientRect().right) + " lim=" + Math.round(lim) +
        (e.getBoundingClientRect().right > lim + 0.5 ? " CLIPPED" : " ok"));
    }
    var p = doc.getElementById("qxMathQA");
    if (!p) { p = doc.createElement("pre"); p.id = "qxMathQA"; p.setAttribute("aria-live", "off");
      p.style.cssText = "position:fixed;left:0;right:0;bottom:0;max-height:30vh;overflow:auto;margin:0;z-index:2147483646;background:#111;color:#0f0;font:11px/1.3 monospace;padding:4px;opacity:.92";
      doc.body.appendChild(p); }
    var txt = "qx-math-scroll QA  viewport=" + win.innerWidth + "  formulas=" + rows.length + "  regions=" + host.querySelectorAll(".qx-mscroll-on, ." + WRAP).length + "\n" + rows.join("\n");
    if (p.textContent !== txt) p.textContent = txt;
  }
  var api = { process: process, fit: fit, wantsProcess: wantsProcess, forceScroll: forceScroll, limitRight: limitRight, topLevel: topLevel, WRAP: WRAP };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else {
    root.QxMathScroll = api;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { start(window, document); });
    else start(window, document);
  }
})(typeof window !== "undefined" ? window : globalThis);
