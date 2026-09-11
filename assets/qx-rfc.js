/* Revision Flash Cards reader — zoom + / zoom −, scroll-zoom, pinch, pan. */
(function () {
  "use strict";

  var deck = [];
  var cur = 0;
  var zoom = 1;
  var zoomAnim = 1;
  var zoomRaf = 0;
  var scrollZoom = true;
  var dragging = false;
  var dragX = 0;
  var dragY = 0;
  var pinch0 = 0;
  var pinchZ = 1;
  var onMove = null;
  var onUp = null;
  var ZMIN = 0.5;
  var ZMAX = 3.5;
  var ZSTEP = 0.15;
  var LS_ZOOM = "quantrex_rfc_zoom";
  var LS_SCROLL = "quantrex_rfc_scroll_zoom";

  function clamp(n, a, b) {
    return Math.min(b, Math.max(a, n));
  }

  function loadPrefs() {
    try {
      var z = parseFloat(localStorage.getItem(LS_ZOOM) || "1");
      zoom = isFinite(z) ? clamp(z, ZMIN, ZMAX) : 1;
    } catch (_) {
      zoom = 1;
    }
    zoomAnim = zoom;
    try {
      var s = localStorage.getItem(LS_SCROLL);
      scrollZoom = s === null ? true : s !== "0";
    } catch (_) {
      scrollZoom = true;
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem(LS_ZOOM, String(Math.round(zoom * 100) / 100));
      localStorage.setItem(LS_SCROLL, scrollZoom ? "1" : "0");
    } catch (_) { /* */ }
  }

  function rawSrc(src) {
    var u = String(src || "");
    if (!u) return "";
    if (/proxy-image/i.test(u)) {
      try {
        return new URL(u, location.origin).searchParams.get("url") || u;
      } catch (_) {
        return u;
      }
    }
    return u;
  }

  function proxy(src) {
    var u = rawSrc(src);
    if (!u) return "";
    if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc) {
      var d = QxOwnedFigs.displaySrc(u);
      if (d) return d;
    }
    if (/getmarks\.app|quizrr\.in/i.test(u) && !/proxy-image/i.test(u)) {
      return "/api/proxy-image?clean=1&fc=1&v=qxfig110&url=" + encodeURIComponent(u);
    }
    if (/proxy-image/i.test(String(src || "")) && /fc=1/i.test(String(src || ""))) return String(src);
    return "/api/proxy-image?clean=1&fc=1&v=qxfig110&url=" + encodeURIComponent(u);
  }

  function close() {
    var el = document.getElementById("qxRfcReader");
    if (el) el.remove();
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", onResize);
    if (onMove) window.removeEventListener("mousemove", onMove);
    if (onUp) window.removeEventListener("mouseup", onUp);
    onMove = null;
    onUp = null;
    if (zoomRaf) cancelAnimationFrame(zoomRaf);
    zoomRaf = 0;
    dragging = false;
  }

  function pctEl() {
    return document.getElementById("qxRfcZoomPct");
  }

  function imgEl() {
    return document.getElementById("qxRfcImg");
  }

  function stageEl() {
    return document.getElementById("qxRfcStage");
  }

  function paintZoomChrome() {
    var p = pctEl();
    if (p) p.textContent = Math.round(zoomAnim * 100) + "%";
    var wrap = document.getElementById("qxRfcReader");
    if (wrap) wrap.setAttribute("data-zoom", zoom > 1.02 ? "in" : "fit");
    var sc = document.getElementById("qxRfcScrollZoom");
    if (sc) {
      sc.classList.toggle("on", scrollZoom);
      sc.setAttribute("aria-pressed", scrollZoom ? "true" : "false");
      sc.title = scrollZoom ? "Scroll zoom on — wheel zooms the card" : "Scroll zoom off — wheel scrolls the card";
    }
    var minus = document.getElementById("qxRfcZoomOut");
    var plus = document.getElementById("qxRfcZoomIn");
    if (minus) minus.disabled = zoom <= ZMIN + 0.001;
    if (plus) plus.disabled = zoom >= ZMAX - 0.001;
  }

  function applyZoomNow() {
    var img = imgEl();
    var stage = stageEl();
    if (!img || !stage) return;
    var maxW = Math.max(240, stage.clientWidth - 28);
    var maxH = Math.max(200, stage.clientHeight - 28);
    var nw = img.naturalWidth || 900;
    var nh = img.naturalHeight || 1200;
    var fit = Math.min(maxW / nw, maxH / nh, 1);
    var w = Math.max(160, nw * fit * zoomAnim);
    img.style.width = w + "px";
    img.style.height = "auto";
    img.style.maxWidth = "none";
    img.style.maxHeight = "none";
    img.style.transform = "none";
    paintZoomChrome();
  }

  function tickZoom() {
    zoomRaf = 0;
    var d = zoom - zoomAnim;
    if (Math.abs(d) < 0.004) {
      zoomAnim = zoom;
      applyZoomNow();
      return;
    }
    zoomAnim += d * 0.28;
    applyZoomNow();
    zoomRaf = requestAnimationFrame(tickZoom);
  }

  function setZoom(next, instant) {
    zoom = clamp(Math.round(next * 100) / 100, ZMIN, ZMAX);
    savePrefs();
    if (instant) {
      zoomAnim = zoom;
      applyZoomNow();
      return;
    }
    if (!zoomRaf) zoomRaf = requestAnimationFrame(tickZoom);
  }

  function bumpZoom(delta) {
    setZoom(zoom + delta, false);
  }

  function onResize() {
    applyZoomNow();
  }

  function paint() {
    var item = deck[cur];
    if (!item) return;
    var img = imgEl();
    var topic = document.getElementById("qxRfcTopic");
    var num = document.getElementById("qxRfcNum");
    var src = proxy(item.src);
    if (img) {
      img.className = "qx-no-wm qx-rfc-img";
      img.onload = function () { applyZoomNow(); };
      img.setAttribute("src", src);
      img.onerror = function () {
        this.onerror = null;
        if (/getmarks\.app|quizrr\.in/i.test(this.getAttribute("src") || "")) {
          this.removeAttribute("src");
        }
        this.alt = "Card unavailable";
        this.style.minHeight = "160px";
        this.style.background = "#f8fafc";
      };
    }
    if (topic) topic.textContent = (item.chapter || "Flash card") + (item.title ? " · " + item.title : "");
    if (num) num.textContent = (cur + 1) + " / " + deck.length;
    applyZoomNow();
  }

  function go(delta) {
    var n = cur + delta;
    if (n < 0 || n >= deck.length) return;
    cur = n;
    paint();
  }

  function onKey(ev) {
    if (ev.key === "Escape") close();
    else if (ev.key === "+" || ev.key === "=") {
      ev.preventDefault();
      bumpZoom(ZSTEP);
    } else if (ev.key === "-" || ev.key === "_") {
      ev.preventDefault();
      bumpZoom(-ZSTEP);
    } else if (ev.key === "0" && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault();
      setZoom(1, false);
    } else if (ev.key === "ArrowRight" || ev.key === " " || ev.key === "PageDown") {
      ev.preventDefault();
      go(1);
    } else if (ev.key === "ArrowLeft" || ev.key === "PageUp") {
      ev.preventDefault();
      go(-1);
    }
  }

  function pinchDist(ev) {
    if (!ev.touches || ev.touches.length < 2) return 0;
    var a = ev.touches[0];
    var b = ev.touches[1];
    var dx = a.clientX - b.clientX;
    var dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function bindZoom(wrap) {
    wrap.querySelector("#qxRfcZoomOut").onclick = function (e) {
      e.stopPropagation();
      bumpZoom(-ZSTEP);
    };
    wrap.querySelector("#qxRfcZoomIn").onclick = function (e) {
      e.stopPropagation();
      bumpZoom(ZSTEP);
    };
    wrap.querySelector("#qxRfcZoomPct").onclick = function (e) {
      e.stopPropagation();
      setZoom(1, false);
    };
    wrap.querySelector("#qxRfcScrollZoom").onclick = function (e) {
      e.stopPropagation();
      scrollZoom = !scrollZoom;
      savePrefs();
      paintZoomChrome();
    };
    wrap.addEventListener(
      "wheel",
      function (e) {
        var want = scrollZoom || e.ctrlKey || e.metaKey;
        if (!want) return;
        e.preventDefault();
        var dy = e.deltaY;
        if (e.deltaMode === 1) dy *= 16;
        var step = dy > 0 ? -0.08 : 0.08;
        if (e.ctrlKey || e.metaKey) step *= 1.35;
        setZoom(zoom + step, false);
      },
      { passive: false }
    );
    wrap.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches && e.touches.length === 2) {
          pinch0 = pinchDist(e);
          pinchZ = zoom;
        }
      },
      { passive: true }
    );
    wrap.addEventListener(
      "touchmove",
      function (e) {
        if (!e.touches || e.touches.length !== 2 || !pinch0) return;
        e.preventDefault();
        var d = pinchDist(e);
        if (d < 8) return;
        setZoom(pinchZ * (d / pinch0), true);
      },
      { passive: false }
    );
    wrap.addEventListener("touchend", function () {
      pinch0 = 0;
    });
    var stage = wrap.querySelector("#qxRfcStage");
    if (stage) {
      stage.addEventListener("dblclick", function (e) {
        e.preventDefault();
        setZoom(zoom > 1.05 ? 1 : 1.6, false);
      });
      stage.addEventListener("mousedown", function (e) {
        if (e.button !== 0) return;
        if (zoom <= 1.02) return;
        dragging = true;
        dragX = e.clientX;
        dragY = e.clientY;
        stage.classList.add("is-panning");
      });
    }
    onMove = function (e) {
      if (!dragging) return;
      var st = stageEl();
      if (!st) return;
      st.scrollLeft -= e.clientX - dragX;
      st.scrollTop -= e.clientY - dragY;
      dragX = e.clientX;
      dragY = e.clientY;
    };
    onUp = function () {
      dragging = false;
      var st = stageEl();
      if (st) st.classList.remove("is-panning");
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function open(list, start) {
    deck = (list || []).filter(function (c) {
      return c && c.src;
    });
    if (!deck.length) return;
    cur = Math.max(0, Math.min(deck.length - 1, start | 0));
    loadPrefs();
    close();
    var wrap = document.createElement("div");
    wrap.id = "qxRfcReader";
    wrap.className = "qx-rfc-reader";
    wrap.innerHTML =
      '<div class="qx-rfc-reader-bar">' +
        '<strong id="qxRfcTopic">Flash card</strong>' +
        '<div class="qx-rfc-zoom" role="group" aria-label="Zoom">' +
          '<button type="button" class="qx-rfc-zbtn" id="qxRfcZoomOut" title="Zoom out (−)" aria-label="Zoom out">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M5 11h14v2H5z"/></svg>' +
          "</button>" +
          '<button type="button" class="qx-rfc-zpct" id="qxRfcZoomPct" title="Reset zoom">100%</button>' +
          '<button type="button" class="qx-rfc-zbtn qx-rfc-zplus" id="qxRfcZoomIn" title="Zoom in (+)" aria-label="Zoom in">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>' +
          "</button>" +
          '<button type="button" class="qx-rfc-zscroll" id="qxRfcScrollZoom" aria-pressed="true" title="Scroll zoom on">Scroll zoom</button>' +
        "</div>" +
        '<span id="qxRfcNum">1 / 1</span>' +
        '<button type="button" id="qxRfcClose">Close</button>' +
      "</div>" +
      '<div class="qx-rfc-stage" id="qxRfcStage">' +
        '<button type="button" class="qx-rfc-hit qx-rfc-hit-prev" id="qxRfcHitPrev" aria-label="Previous"></button>' +
        '<figure class="qx-rfc-sheet"><img id="qxRfcImg" class="qx-no-wm qx-rfc-img" alt="Revision flash card" decoding="sync"></figure>' +
        '<button type="button" class="qx-rfc-hit qx-rfc-hit-next" id="qxRfcHitNext" aria-label="Next"></button>' +
      "</div>" +
      '<div class="qx-rfc-nav">' +
        '<button type="button" id="qxRfcPrev">← Previous</button>' +
        '<div class="qx-rfc-zoom qx-rfc-zoom-dock" aria-hidden="true">' +
          '<button type="button" class="qx-rfc-zbtn" data-rfc-z="-">' +
            '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M5 11h14v2H5z"/></svg>' +
            "<span>Zoom −</span>" +
          "</button>" +
          '<button type="button" class="qx-rfc-zbtn qx-rfc-zplus" data-rfc-z="+">' +
            '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>' +
            "<span>Zoom +</span>" +
          "</button>" +
        "</div>" +
        '<button type="button" class="next" id="qxRfcNext">Next →</button>' +
      "</div>";
    document.body.appendChild(wrap);
    document.body.style.overflow = "hidden";
    wrap.querySelector("#qxRfcClose").onclick = function (e) {
      e.stopPropagation();
      close();
    };
    wrap.querySelector("#qxRfcPrev").onclick = function (e) {
      e.stopPropagation();
      go(-1);
    };
    wrap.querySelector("#qxRfcNext").onclick = function (e) {
      e.stopPropagation();
      go(1);
    };
    wrap.querySelector("#qxRfcHitPrev").onclick = function (e) {
      e.stopPropagation();
      if (zoom > 1.05) return;
      go(-1);
    };
    wrap.querySelector("#qxRfcHitNext").onclick = function (e) {
      e.stopPropagation();
      if (zoom > 1.05) return;
      go(1);
    };
    wrap.querySelectorAll("[data-rfc-z]").forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        bumpZoom(btn.getAttribute("data-rfc-z") === "+" ? ZSTEP : -ZSTEP);
      };
    });
    bindZoom(wrap);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    var sx = 0;
    wrap.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches && e.touches.length === 1) sx = e.changedTouches[0].clientX;
      },
      { passive: true }
    );
    wrap.addEventListener(
      "touchend",
      function (e) {
        if (pinch0) return;
        var dx = e.changedTouches[0].clientX - sx;
        if (zoom > 1.05) return;
        if (dx > 50) go(-1);
        else if (dx < -50) go(1);
      },
      { passive: true }
    );
    paint();
  }

  window.QxRfcCards = { open: open, close: close, setZoom: setZoom, bumpZoom: bumpZoom };
})();
