/* qxmd273 QxCardViewer: one full-screen reader for Revision Flash Cards + Formula Cards.
   Fit-width by default, zoom 50-400% (buttons, ctrl/trackpad wheel, pinch, double-tap), pans/scrolls to every edge,
   fit-page toggle, light/dark, fullscreen (where supported), re-fits on resize / orientation change. */
(function () {
  "use strict";
  if (window.QxCardViewer) return;
  var ZMIN = 0.5, ZMAX = 4, STEPS = [0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4];
  var S = null; // live state
  var LS_FIT = "qx_cv_fit", LS_THEME = "qx_cv_theme";
  var CSS = [
    "#qxCvReader{position:fixed;left:0;top:0;right:0;bottom:0;width:100vw;height:100vh;height:100dvh;z-index:2147483647;display:flex;flex-direction:column;--cv-bg:#e9eef5;--cv-bar:#ffffff;--cv-ink:#0f172a;--cv-sub:#64748b;--cv-btn:#f1f5f9;--cv-btn-h:#e2e8f0;--cv-line:#e2e8f0;--cv-acc:#2563eb;background:var(--cv-bg);color:var(--cv-ink);font-family:inherit;-webkit-tap-highlight-color:transparent;overscroll-behavior:contain;touch-action:manipulation}",
    "#qxCvReader[data-theme=dark]{--cv-bg:#0b1220;--cv-bar:#111827;--cv-ink:#f1f5f9;--cv-sub:#94a3b8;--cv-btn:#1f2937;--cv-btn-h:#334155;--cv-line:#1f2937;--cv-acc:#3b82f6}",
    "#qxCvReader *{box-sizing:border-box}",
    "#qxCvReader .qx-cv-bar{flex:0 0 auto;display:flex;align-items:center;gap:6px;min-height:52px;padding:6px max(8px,env(safe-area-inset-right,0px)) 6px max(8px,env(safe-area-inset-left,0px));padding-top:calc(6px + env(safe-area-inset-top,0px));background:var(--cv-bar);border-bottom:1px solid var(--cv-line);position:relative;z-index:3}",
    "#qxCvReader .qx-cv-title{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;line-height:1.15}",
    "#qxCvReader .qx-cv-title strong{font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    "#qxCvReader .qx-cv-title small{font-size:11.5px;font-weight:700;color:var(--cv-sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    "#qxCvReader .qx-cv-tools{flex:0 0 auto;display:flex;align-items:center;gap:4px;padding:3px;border-radius:999px;background:var(--cv-btn)}",
    "#qxCvReader button{font:inherit;color:inherit;cursor:pointer;border:0;pointer-events:auto;touch-action:manipulation;-webkit-user-select:none;user-select:none}",
    "#qxCvReader .qx-cv-ib{width:34px;height:34px;min-width:34px;border-radius:999px;background:transparent;display:inline-flex;align-items:center;justify-content:center;padding:0;transition:background .15s,transform .15s}",
    "#qxCvReader .qx-cv-ib:hover{background:var(--cv-btn-h)}#qxCvReader .qx-cv-ib:active{transform:scale(.92)}",
    "#qxCvReader .qx-cv-ib:disabled{opacity:.35;cursor:default}",
    "#qxCvReader .qx-cv-ib svg{width:18px;height:18px;display:block}",
    "#qxCvReader .qx-cv-close{background:var(--cv-btn)}",
    "#qxCvReader .qx-cv-pct{min-width:50px;height:34px;border-radius:999px;background:var(--cv-bar);font-size:12.5px;font-weight:800;font-variant-numeric:tabular-nums;padding:0 6px}",
    "#qxCvReader .qx-cv-ib.on{background:var(--cv-acc);color:#fff}",
    "#qxCvReader .qx-cv-stage{flex:1 1 auto;min-height:0;position:relative;overflow:auto;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;overscroll-behavior:contain;padding:10px max(10px,env(safe-area-inset-right,0px)) 14px max(10px,env(safe-area-inset-left,0px));cursor:default;outline:0}",
    "#qxCvReader[data-pan=on] .qx-cv-stage{cursor:grab}#qxCvReader .qx-cv-stage.is-panning{cursor:grabbing}",
    "#qxCvReader .qx-cv-page{position:relative;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 10px 30px rgba(2,6,23,.18);overflow:hidden;color:#0f172a}",
    "#qxCvReader[data-theme=dark] .qx-cv-page{box-shadow:0 14px 40px rgba(0,0,0,.55)}",
    "#qxCvReader .qx-cv-page img.qx-cv-img{display:block;border:0;background:#fff;-webkit-user-drag:none;user-select:none;filter:none;opacity:1;visibility:visible;content-visibility:visible}",
    "#qxCvReader .qx-cv-html{padding:18px 16px;font-size:16px;line-height:1.55;overflow-wrap:anywhere}",
    "#qxCvReader .qx-cv-html img{max-width:100%;height:auto}",
    "#qxCvReader .qx-cv-mean{margin:0;padding:10px 16px 14px;font-size:14px;font-weight:600;color:#334155;border-top:1px solid #e2e8f0}",
    "#qxCvReader .qx-cv-load{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font-size:13px;font-weight:700;color:var(--cv-sub);pointer-events:none}",
    "#qxCvReader .qx-cv-nav{flex:0 0 auto;display:grid;grid-template-columns:minmax(0,260px) auto minmax(0,260px);justify-content:center;align-items:center;gap:10px;padding:8px max(12px,env(safe-area-inset-right,0px)) calc(8px + env(safe-area-inset-bottom,0px)) max(12px,env(safe-area-inset-left,0px));background:var(--cv-bar);border-top:1px solid var(--cv-line);position:relative;z-index:3}",
    "#qxCvReader .qx-cv-nb{height:44px;border-radius:999px;font-size:14.5px;font-weight:800;background:var(--cv-btn);display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 14px}",
    "#qxCvReader .qx-cv-nb.next{background:var(--cv-acc);color:#fff}",
    "#qxCvReader .qx-cv-nb:disabled{opacity:.4;cursor:default}",
    "#qxCvReader .qx-cv-count{font-size:13px;font-weight:800;color:var(--cv-sub);font-variant-numeric:tabular-nums;min-width:56px;text-align:center}",
    "#qxCvReader .qx-cv-side{position:absolute;top:50%;transform:translateY(-50%);z-index:4;width:42px;height:42px;border-radius:999px;background:rgba(15,23,42,.55);color:#fff;display:none;align-items:center;justify-content:center;padding:0;box-shadow:0 6px 18px rgba(0,0,0,.3)}",
    "#qxCvReader .qx-cv-side svg{width:20px;height:20px}",
    "#qxCvReader .qx-cv-side:disabled{opacity:.25}",
    "#qxCvReader .qx-cv-side.prev{left:max(6px,env(safe-area-inset-left,0px))}#qxCvReader .qx-cv-side.next{right:max(6px,env(safe-area-inset-right,0px))}",
    "#qxCvReader .qx-cv-mid{flex:1 1 auto;min-height:0;position:relative;display:flex;flex-direction:column}",
    "#qxCvReader .qx-cv-inlinecount{display:none}",
    "@media (max-width:420px){#qxCvReader .qx-cv-ib{width:32px;height:32px;min-width:32px}#qxCvReader .qx-cv-pct{min-width:46px;height:32px;font-size:12px}#qxCvReader .qx-cv-tools{gap:2px}#qxCvReader .qx-cv-bar{gap:5px}}",
    "@media (max-width:359px){#qxCvReader .qx-cv-fs{display:none!important}}",
    /* landscape phones: thin top bar, no bottom bar, side arrows -> card gets max height */
    "@media (orientation:landscape) and (max-height:560px){#qxCvReader .qx-cv-bar{min-height:42px;padding-top:calc(3px + env(safe-area-inset-top,0px));padding-bottom:3px}#qxCvReader .qx-cv-title{flex-direction:row;align-items:baseline;gap:8px}#qxCvReader .qx-cv-nav{display:none}#qxCvReader .qx-cv-side{display:inline-flex}#qxCvReader .qx-cv-inlinecount{display:inline}#qxCvReader .qx-cv-stage{padding-top:6px;padding-bottom:calc(6px + env(safe-area-inset-bottom,0px));padding-left:max(54px,env(safe-area-inset-left,0px));padding-right:max(54px,env(safe-area-inset-right,0px))}}",
    "@media (prefers-reduced-motion:reduce){#qxCvReader *{transition:none!important}}"
  ].join("\n");

  var IC = {
    close: '<path fill="currentColor" d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 0 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z"/>',
    minus: '<path fill="currentColor" d="M5 11h14v2H5z"/>',
    plus: '<path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/>',
    fitw: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>',
    fitp: '<rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M9 8h6M9 12h6M9 16h4"/>',
    sun: '<circle cx="12" cy="12" r="4" fill="currentColor"/><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path fill="currentColor" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    fs: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    fsx: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
    left: '<path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M15 5l-7 7 7 7"/>',
    right: '<path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>'
  };
  function svg(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + IC[n] + "</svg>"; }
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function imp(el, p, v) { if (el) el.style.setProperty(p, v, "important"); }
  function ensureCss() {
    if (document.getElementById("qxCvCss")) return;
    var st = document.createElement("style"); st.id = "qxCvCss"; st.textContent = CSS; document.head.appendChild(st);
  }
  function siteDark() {
    var h = document.documentElement, b = document.body;
    return h.getAttribute("data-theme") === "dark" || /(^|\s)(dark|qx-dark|theme-dark)(\s|$)/.test(h.className + " " + (b ? b.className : ""));
  }
  function $(id) { return document.getElementById(id); }
  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function fsOk() { var d = document.documentElement; return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled) && !!(d.requestFullscreen || d.webkitRequestFullscreen); }

  function build(opts) {
    var w = document.createElement("div");
    w.id = "qxCvReader"; w.className = "qx-cv-reader " + (opts.kind ? "qx-cv-" + opts.kind : "");
    w.setAttribute("role", "dialog"); w.setAttribute("aria-modal", "true");
    w.innerHTML =
      '<div class="qx-cv-bar">' +
        '<button type="button" class="qx-cv-ib qx-cv-close" data-cv="close" title="Close (Esc)" aria-label="Close">' + svg("close") + "</button>" +
        '<div class="qx-cv-title"><strong id="qxCvTitle"></strong><small id="qxCvSub"></small><small class="qx-cv-inlinecount" id="qxCvCount2"></small></div>' +
        '<div class="qx-cv-tools" role="toolbar" aria-label="Viewer tools">' +
          '<button type="button" class="qx-cv-ib" data-cv="out" title="Zoom out (-)" aria-label="Zoom out">' + svg("minus") + "</button>" +
          '<button type="button" class="qx-cv-pct" data-cv="reset" id="qxCvPct" title="Reset zoom (0)" aria-label="Reset zoom">100%</button>' +
          '<button type="button" class="qx-cv-ib" data-cv="in" title="Zoom in (+)" aria-label="Zoom in">' + svg("plus") + "</button>" +
          '<button type="button" class="qx-cv-ib" data-cv="fit" id="qxCvFit" title="Fit page / fit width (F)" aria-label="Toggle fit page"></button>' +
          '<button type="button" class="qx-cv-ib" data-cv="theme" id="qxCvTheme" title="Light / dark" aria-label="Toggle light or dark"></button>' +
          (fsOk() ? '<button type="button" class="qx-cv-ib qx-cv-fs" data-cv="fs" id="qxCvFs" title="Full screen" aria-label="Full screen">' + svg("fs") + "</button>" : "") +
        "</div>" +
      "</div>" +
      '<div class="qx-cv-mid">' +
        '<div class="qx-cv-stage" id="qxCvStage" tabindex="-1">' +
          '<div class="qx-cv-page" id="qxCvPage"><img id="qxCvImg" class="qx-cv-img qx-rfc-img qx-fc-img qx-no-wm" alt="" decoding="async" referrerpolicy="no-referrer"><div class="qx-cv-html" id="qxCvHtml"></div><p class="qx-cv-mean" id="qxCvMean"></p></div>' +
          '<div class="qx-cv-load" id="qxCvLoad">Loading card...</div>' +
        "</div>" +
        '<button type="button" class="qx-cv-side prev" data-cv="prev" aria-label="Previous card">' + svg("left") + "</button>" +
        '<button type="button" class="qx-cv-side next" data-cv="next" aria-label="Next card">' + svg("right") + "</button>" +
      "</div>" +
      '<div class="qx-cv-nav">' +
        '<button type="button" class="qx-cv-nb" data-cv="prev">' + svg("left").replace("<svg", '<svg width="18" height="18"') + "<span>Previous</span></button>" +
        '<span class="qx-cv-count" id="qxCvCount">1 / 1</span>' +
        '<button type="button" class="qx-cv-nb next" data-cv="next"><span>Next</span>' + svg("right").replace("<svg", '<svg width="18" height="18"') + "</button>" +
      "</div>";
    return w;
  }

  function natRatio() {
    var img = $("qxCvImg");
    if (S.isImg && img && img.naturalWidth > 0) return img.naturalHeight / img.naturalWidth;
    return 0;
  }
  function baseWidth() {
    var st = $("qxCvStage"); if (!st) return 320;
    var cs = getComputedStyle(st);
    var availW = st.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var availH = st.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    availW = Math.max(120, availW); availH = Math.max(120, availH);
    var r = natRatio();
    if (S.fit === "page" && r > 0) return Math.min(availW, availH / r);
    // fit width: fill the screen width; on wide desktop keep a readable page width
    return Math.min(availW, S.isImg ? 1080 : 900);
  }
  function layout(anchor) {
    if (!S) return;
    var st = $("qxCvStage"), page = $("qxCvPage"), img = $("qxCvImg"), html = $("qxCvHtml");
    if (!st || !page) return;
    var oldW = page.offsetWidth || 1, oldH = page.offsetHeight || 1;
    var ax = anchor ? anchor.x : st.clientWidth / 2, ay = anchor ? anchor.y : st.clientHeight / 2;
    var relX = (st.scrollLeft + ax - page.offsetLeft) / oldW, relY = (st.scrollTop + ay - page.offsetTop) / oldH;
    var w = Math.max(80, Math.round(baseWidth() * S.zoom));
    imp(page, "width", w + "px"); imp(page, "max-width", "none"); imp(page, "min-width", "0");
    if (img) {
      imp(img, "width", "100%"); imp(img, "max-width", "none"); imp(img, "min-width", "0");
      imp(img, "height", "auto"); imp(img, "max-height", "none"); imp(img, "transform", "none"); imp(img, "margin", "0");
    }
    if (html) html.style.fontSize = (16 * S.zoom).toFixed(1) + "px";
    // vertical centring when the whole card fits
    var cs = getComputedStyle(st);
    var availH = st.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var ph = page.offsetHeight;
    page.style.marginTop = ph < availH ? Math.floor((availH - ph) / 2) + "px" : "0px";
    if (anchor || S.keepAnchor) {
      st.scrollLeft = relX * page.offsetWidth + page.offsetLeft - ax;
      st.scrollTop = relY * page.offsetHeight + page.offsetTop - ay;
    }
    chrome();
  }
  function chrome() {
    var w = $("qxCvReader"); if (!w || !S) return;
    var p = $("qxCvPct"); if (p) p.textContent = Math.round(S.zoom * 100) + "%";
    w.querySelectorAll('[data-cv="out"]').forEach(function (b) { b.disabled = S.zoom <= ZMIN + 0.001; });
    w.querySelectorAll('[data-cv="in"]').forEach(function (b) { b.disabled = S.zoom >= ZMAX - 0.001; });
    var st = $("qxCvStage");
    var pannable = st && (st.scrollWidth > st.clientWidth + 2 || st.scrollHeight > st.clientHeight + 2);
    w.setAttribute("data-pan", pannable && S.zoom > 1.01 ? "on" : "off");
    w.setAttribute("data-zoom", S.zoom > 1.01 ? "in" : "fit");
    var f = $("qxCvFit");
    if (f) { f.innerHTML = svg(S.fit === "page" ? "fitw" : "fitp"); f.title = S.fit === "page" ? "Fit width (F)" : "Fit whole page (F)"; f.setAttribute("aria-label", f.title); }
    var t = $("qxCvTheme");
    if (t) { var dk = w.getAttribute("data-theme") === "dark"; t.innerHTML = svg(dk ? "sun" : "moon"); t.title = dk ? "Light mode" : "Dark mode"; }
    var fsb = $("qxCvFs"); if (fsb) { var on = !!fsEl(); fsb.innerHTML = svg(on ? "fsx" : "fs"); fsb.title = on ? "Exit full screen" : "Full screen"; fsb.classList.toggle("on", on); }
    var n = S.items.length, c = S.cur;
    var atStart = c <= 0 && !S.hasEdge, atEnd = c >= n - 1 && !S.hasEdge;
    w.querySelectorAll('[data-cv="prev"]').forEach(function (b) { b.disabled = atStart; });
    w.querySelectorAll('[data-cv="next"]').forEach(function (b) { b.disabled = atEnd; });
    var txt = (c + 1) + " / " + n;
    var c1 = $("qxCvCount"), c2 = $("qxCvCount2"); if (c1) c1.textContent = txt; if (c2) c2.textContent = txt;
  }
  function setZoom(z, anchor) {
    if (!S) return;
    S.zoom = clamp(Math.round(z * 100) / 100, ZMIN, ZMAX);
    layout(anchor || { x: $("qxCvStage").clientWidth / 2, y: $("qxCvStage").clientHeight / 2 });
  }
  function step(dir) {
    var z = S.zoom, nz = z;
    if (dir > 0) { for (var i = 0; i < STEPS.length; i++) if (STEPS[i] > z + 0.001) { nz = STEPS[i]; break; } }
    else { for (var j = STEPS.length - 1; j >= 0; j--) if (STEPS[j] < z - 0.001) { nz = STEPS[j]; break; } }
    setZoom(nz);
  }
  var rafT = 0;
  function refit() { if (rafT) cancelAnimationFrame(rafT); rafT = requestAnimationFrame(function () { rafT = 0; S && (S.keepAnchor = true, layout(), S.keepAnchor = false); }); }

  function paint() {
    var it = S.items[S.cur]; if (!it) return;
    var img = $("qxCvImg"), html = $("qxCvHtml"), mean = $("qxCvMean"), load = $("qxCvLoad"), st = $("qxCvStage");
    $("qxCvTitle").textContent = it.title || S.title || "Card";
    var sub = it.sub || S.sub || ""; $("qxCvSub").textContent = sub; $("qxCvSub").style.display = sub ? "" : "none";
    S.isImg = !!it.src;
    if (html) { html.innerHTML = it.html || ""; html.style.display = it.html ? "" : "none"; }
    if (mean) { mean.textContent = it.meaning || ""; mean.style.display = it.meaning ? "" : "none"; }
    if (img) {
      if (it.src) {
        img.style.display = ""; if (load) load.style.display = "";
        img.onload = function () { if (load) load.style.display = "none"; layout(); };
        img.onerror = function () {
          if (typeof S.onError === "function" && S.onError(img, it) === true) return;
          if (load) { load.style.display = ""; load.textContent = "Card could not load"; }
        };
        if (img.getAttribute("src") !== it.src) img.setAttribute("src", it.src);
        else if (img.complete && img.naturalWidth) { if (load) load.style.display = "none"; }
      } else { img.removeAttribute("src"); img.style.display = "none"; if (load) load.style.display = "none"; }
      img.alt = it.title || "Card";
    }
    layout();
    if (st) { st.scrollTop = 0; st.scrollLeft = Math.max(0, (st.scrollWidth - st.clientWidth) / 2); }
    var nx = S.items[S.cur + 1]; if (nx && nx.src) { var pre = new Image(); pre.referrerPolicy = "no-referrer"; pre.src = nx.src; }
    if (typeof S.onChange === "function") { try { S.onChange(S.cur); } catch (_) { /* */ } }
  }
  function go(d) {
    if (!S) return;
    if (window.QxNavGuard && window.QxNavGuard.block && window.QxNavGuard.block()) return;
    var n = S.cur + d;
    if (n < 0 || n >= S.items.length) {
      if (typeof S.onEdge === "function") { var fn = S.onEdge; if (fn(d > 0 ? 1 : -1) === true) close(); }
      return;
    }
    S.cur = n; paint();
  }
  function toggleFs() {
    var w = $("qxCvReader"); if (!w) return;
    try {
      if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (w.requestFullscreen || w.webkitRequestFullscreen).call(w);
    } catch (_) { /* */ }
  }
  function onKey(e) {
    if (!S) return;
    var k = e.key;
    if (k === "Escape") { if (fsEl()) return; e.preventDefault(); close(); }
    else if (k === "ArrowRight" || k === "PageDown") { e.preventDefault(); go(1); }
    else if (k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); go(-1); }
    else if (k === "+" || k === "=") { e.preventDefault(); step(1); }
    else if (k === "-" || k === "_") { e.preventDefault(); step(-1); }
    else if (k === "0") { e.preventDefault(); setZoom(1); }
    else if (k === "f" || k === "F") { e.preventDefault(); toggleFit(); }
  }
  function toggleFit() { S.fit = S.fit === "page" ? "width" : "page"; try { localStorage.setItem(LS_FIT, S.fit); } catch (_) { /* */ } S.zoom = 1; layout(); var st = $("qxCvStage"); if (st) st.scrollTop = 0; }
  function toggleTheme() {
    var w = $("qxCvReader"); var nt = w.getAttribute("data-theme") === "dark" ? "light" : "dark";
    w.setAttribute("data-theme", nt); try { localStorage.setItem(LS_THEME, nt); } catch (_) { /* */ } chrome();
  }
  function dist(t) { var dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY; return Math.sqrt(dx * dx + dy * dy); }
  function rel(st, x, y) { var r = st.getBoundingClientRect(); return { x: x - r.left, y: y - r.top }; }

  function bind(w) {
    w.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cv]"); if (!b || b.disabled) return;
      e.preventDefault(); e.stopPropagation();
      var a = b.getAttribute("data-cv");
      if (a === "close") close(); else if (a === "in") step(1); else if (a === "out") step(-1);
      else if (a === "reset") setZoom(1); else if (a === "fit") toggleFit(); else if (a === "theme") toggleTheme();
      else if (a === "fs") toggleFs(); else if (a === "prev") go(-1); else if (a === "next") go(1);
    });
    var st = w.querySelector("#qxCvStage");
    // desktop: ctrl/cmd + wheel or trackpad pinch zooms around the pointer; plain wheel scrolls normally
    st.addEventListener("wheel", function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      var dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      setZoom(S.zoom * Math.exp(-dy * 0.0025), rel(st, e.clientX, e.clientY));
    }, { passive: false });
    // touch: pinch zoom around fingers, swipe for next/prev when not zoomed
    var p0 = 0, z0 = 1, sx = 0, sy = 0, st0 = 0, multi = false, lastTap = 0;
    st.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) { multi = true; p0 = dist(e.touches); z0 = S.zoom; }
      else if (e.touches.length === 1) { multi = false; sx = e.touches[0].clientX; sy = e.touches[0].clientY; st0 = Date.now(); }
    }, { passive: true });
    st.addEventListener("touchmove", function (e) {
      if (e.touches.length !== 2 || !p0) return;
      e.preventDefault();
      var d = dist(e.touches); if (d < 10) return;
      var mx = (e.touches[0].clientX + e.touches[1].clientX) / 2, my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      setZoom(z0 * d / p0, rel(st, mx, my));
    }, { passive: false });
    st.addEventListener("touchend", function (e) {
      if (multi) { if (e.touches.length === 0) { multi = false; p0 = 0; } return; }
      var t = e.changedTouches[0]; if (!t) return;
      var dx = t.clientX - sx, dy = t.clientY - sy, dt = Date.now() - st0;
      var canPanX = st.scrollWidth > st.clientWidth + 2;
      if (!canPanX && S.zoom <= 1.01 && Math.abs(dx) > 60 && Math.abs(dy) < 50 && dt < 700) { go(dx < 0 ? 1 : -1); return; }
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 300) {
        var now = Date.now();
        if (now - lastTap < 320) { lastTap = 0; e.preventDefault(); setZoom(S.zoom > 1.05 ? 1 : 2, rel(st, t.clientX, t.clientY)); }
        else lastTap = now;
      }
    }, { passive: false });
    st.addEventListener("dblclick", function (e) { e.preventDefault(); setZoom(S.zoom > 1.05 ? 1 : 2, rel(st, e.clientX, e.clientY)); });
    // mouse drag to pan when zoomed
    var drag = null;
    st.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      if (!(st.scrollWidth > st.clientWidth + 2 || st.scrollHeight > st.clientHeight + 2)) return;
      drag = { x: e.clientX, y: e.clientY, l: st.scrollLeft, t: st.scrollTop }; st.classList.add("is-panning"); e.preventDefault();
    });
    S.onMove = function (e) { if (!drag) return; st.scrollLeft = drag.l - (e.clientX - drag.x); st.scrollTop = drag.t - (e.clientY - drag.y); };
    S.onUp = function () { if (drag) { drag = null; st.classList.remove("is-panning"); } };
    window.addEventListener("mousemove", S.onMove); window.addEventListener("mouseup", S.onUp);
    S.onResize = refit;
    window.addEventListener("resize", refit); window.addEventListener("orientationchange", refit);
    if (window.visualViewport) window.visualViewport.addEventListener("resize", refit);
    document.addEventListener("fullscreenchange", refit); document.addEventListener("webkitfullscreenchange", refit);
    document.addEventListener("keydown", onKey, true);
  }

  function close() {
    var w = $("qxCvReader");
    if (S) {
      window.removeEventListener("resize", refit); window.removeEventListener("orientationchange", refit);
      if (window.visualViewport) window.visualViewport.removeEventListener("resize", refit);
      document.removeEventListener("fullscreenchange", refit); document.removeEventListener("webkitfullscreenchange", refit);
      document.removeEventListener("keydown", onKey, true);
      if (S.onMove) window.removeEventListener("mousemove", S.onMove);
      if (S.onUp) window.removeEventListener("mouseup", S.onUp);
      var oc = S.onClose; var prevOv = S.prevOverflow; S = null;
      document.documentElement.style.overflow = prevOv[0]; document.body.style.overflow = prevOv[1];
      try { if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (_) { /* */ }
      if (typeof oc === "function") { try { oc(); } catch (_) { /* */ } }
    }
    if (w) w.remove();
  }

  function open(opts) {
    opts = opts || {};
    var items = (opts.items || []).filter(function (x) { return x && (x.src || x.html); });
    if (!items.length) return false;
    ensureCss();
    close();
    var fit = "width"; try { fit = localStorage.getItem(LS_FIT) === "page" ? "page" : "width"; } catch (_) { /* */ }
    var th = null; try { th = localStorage.getItem(LS_THEME); } catch (_) { /* */ }
    S = {
      items: items, cur: clamp(opts.start | 0, 0, items.length - 1), zoom: 1, fit: fit,
      title: opts.title || "", sub: opts.sub || "", onEdge: opts.onEdge || null, hasEdge: !!opts.onEdge,
      onError: opts.onError || null, onChange: opts.onChange || null, onClose: opts.onClose || null,
      prevOverflow: [document.documentElement.style.overflow, document.body.style.overflow]
    };
    var w = build(opts);
    w.setAttribute("data-theme", th === "dark" || th === "light" ? th : (siteDark() ? "dark" : "light"));
    document.body.appendChild(w);
    document.documentElement.style.overflow = "hidden"; document.body.style.overflow = "hidden";
    bind(w);
    paint();
    try { $("qxCvStage").focus({ preventScroll: true }); } catch (_) { /* */ }
    return true;
  }

  /* Any QxRfcCards (including a stale cached qx-rfc.js?v=qxmd227 injected by marks-features) opens in this viewer. */
  function rfcRaw(src) {
    var u = String(src || "");
    if (/proxy-image/i.test(u)) { try { return new URL(u, location.origin).searchParams.get("url") || u; } catch (_) { return u; } }
    return u;
  }
  function rfcSrc(src) {
    var u = rfcRaw(src); if (!u) return "";
    if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc) { var d = QxOwnedFigs.displaySrc(u); if (d) return d; }
    if (/proxy-image/i.test(String(src || "")) && /fc=1/i.test(String(src || ""))) return String(src);
    return "/api/proxy-image?clean=1&fc=1&v=qxfig110&url=" + encodeURIComponent(u);
  }
  function rfcOnError(img, it) {
    if (img.dataset.qxCvRaw !== "1" && it.raw && /firebasestorage/i.test(it.raw)) { img.dataset.qxCvRaw = "1"; img.setAttribute("src", it.raw); return true; }
    if (window.QxOwnedFigs && QxOwnedFigs.retryOnError && img.dataset.qxCvOwned !== "1") { img.dataset.qxCvOwned = "1"; QxOwnedFigs.retryOnError(img); return true; }
    return false;
  }
  function wrapRfc(obj) {
    if (!obj || typeof obj !== "object" || obj.__qxCv) return obj;
    var orig = obj.open;
    obj.open = function (list, start) {
      var items = (list || []).filter(function (c) { return c && c.src; }).map(function (c) {
        return { src: rfcSrc(c.src), raw: rfcRaw(c.src), title: (c.chapter || "Revision Flash Card") + (c.title ? " \u00b7 " + c.title : ""), sub: "Revision Flash Cards" };
      });
      if (items.length && open({ kind: "rfc", start: start | 0, items: items, onError: rfcOnError })) {
        var old = document.getElementById("qxRfcReader"); if (old) old.remove();
        return;
      }
      return typeof orig === "function" ? orig.apply(this, arguments) : undefined;
    };
    obj.__qxCv = true;
    return obj;
  }
  try {
    var rfcObj = wrapRfc(window.QxRfcCards);
    Object.defineProperty(window, "QxRfcCards", { configurable: true, enumerable: true, get: function () { return rfcObj; }, set: function (v) { rfcObj = wrapRfc(v); } });
  } catch (_) { /* */ }

  /* qxmd276: stale cached qx-formula-cards.js?v=qxmd227 (injected by marks-features) binds cards with its own closure
     and opens the old #qxFcReader. Keep the patched instance and route every card click / old reader to this viewer. */
  var FC_CARD = ".fc-card.qx-fc-designed, .fc-grid .fc-card";
  function fcIsGood(o) { try { return !!(o && typeof o.open === "function" && /QxCardViewer/.test(String(o.open))); } catch (_) { return false; } }
  try {
    var fcAny = window.QxFormulaCards, fcGood = fcIsGood(fcAny) ? fcAny : null;
    Object.defineProperty(window, "QxFormulaCards", { configurable: true, enumerable: true,
      get: function () { return fcGood || fcAny; },
      set: function (v) { fcAny = v; if (fcIsGood(v)) fcGood = v; } });
    window.addEventListener("click", function (e) {
      if (!fcGood || !e.target || !e.target.closest) return;
      var card = e.target.closest(FC_CARD);
      if (!card || card.closest("#qxCvReader") || e.target.closest(".bm-btn")) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var idx = parseInt(card.getAttribute("data-fc-i"), 10);
      fcGood.open(Number.isFinite(idx) ? idx : Array.prototype.indexOf.call(card.parentNode.children, card));
    }, true);
    var fcSwap = function () {
      var old = document.getElementById("qxFcReader");
      if (!old || !fcGood) return;
      var m = /(\d+)\s*\/\s*\d+/.exec(((document.getElementById("qxFcReaderNum") || {}).textContent) || "");
      var b = document.getElementById("qxFcClose");
      if (b) b.click(); else old.remove();
      fcGood.open(m ? (+m[1] - 1) : 0);
    };
    var fcObs = function () { try { new MutationObserver(function (ms) { for (var i = 0; i < ms.length; i++) for (var j = 0; j < ms[i].addedNodes.length; j++) if (ms[i].addedNodes[j].id === "qxFcReader") { setTimeout(fcSwap, 0); return; } }).observe(document.body, { childList: true }); } catch (_) { /* */ } };
    if (document.body) fcObs(); else document.addEventListener("DOMContentLoaded", fcObs);
  } catch (_) { /* */ }

  window.QxCardViewer = {
    open: open, close: close, go: go, zoomIn: function () { step(1); }, zoomOut: function () { step(-1); },
    setZoom: function (z) { setZoom(z); }, toggleFit: function () { S && toggleFit(); },
    state: function () { return S ? { cur: S.cur, n: S.items.length, zoom: S.zoom, fit: S.fit } : null },
    isOpen: function () { return !!S; }
  };
})();
