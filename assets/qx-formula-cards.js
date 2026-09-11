/* Formula cards — full written-page reader, page-turn, no double-open blank. */
(function () {
  const FC_SEL = ".fc-card img.fc-img, .fc-card img.qx-fc-img, .fc-formula img";
  let deck = [];
  let cur = 0;
  let zoom = 1;
  let rot = 0;
  let flipping = false;

  function isFormulaView() {
    return !!(document.querySelector(".qx-fc-grid, .qx-fc-designed, .fc-grid, .qx-fc-folder-grid"));
  }

  function fcProxyUrl(raw) {
    let u = String(raw || "");
    if (/proxy-image/i.test(u)) {
      try { u = new URL(u, location.origin).searchParams.get("url") || u; } catch (_) { /* */ }
    }
    if (!u) return "";
    if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc) {
      const d = QxOwnedFigs.displaySrc(u);
      if (d) return d;
    }
    if (!/getmarks\.app|formula_cards|another_formula_card|revision_flash_cards|firebasestorage/i.test(u)) return "";
    if (/getmarks\.app|quizrr\.in/i.test(u) && typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.ownedFigureUrl) {
      const owned = QxOwnedFigs.ownedFigureUrl(u);
      if (owned && /firebasestorage/i.test(owned)) u = owned;
      else if (/getmarks\.app|quizrr\.in/i.test(u)) return "/api/proxy-image?clean=1&fc=1&v=qxfig110&url=" + encodeURIComponent(u);
    }
    return "/api/proxy-image?clean=1&fc=1&v=qxfig110&url=" + encodeURIComponent(u);
  }

  function forceProxy(img) {
    if (!img) return;
    const next = fcProxyUrl(img.getAttribute("src") || img.src || "");
    if (next && img.getAttribute("src") !== next) img.setAttribute("src", next);
  }

  function wrapImg(img) {
    if (!img || img.closest(".qx-fc-page") || img.closest("#qxFcReader")) return img.closest(".qx-fc-page");
    const fig = document.createElement("figure");
    fig.className = "qx-fc-page";
    img.parentNode.insertBefore(fig, img);
    fig.appendChild(img);
    if (!fig.querySelector(".qx-fc-seal")) {
      const seal = document.createElement("span");
      seal.className = "qx-fc-seal";
      seal.setAttribute("aria-hidden", "true");
      fig.appendChild(seal);
    }
    return fig;
  }

  function collectDeck() {
    if (Array.isArray(window._qxFcDeck) && window._qxFcDeck.length) {
      deck = window._qxFcDeck.map((d, i) => Object.assign({ i: i }, d));
      return deck;
    }
    const cards = Array.from(document.querySelectorAll(".fc-card.qx-fc-designed, .fc-grid .fc-card"));
    deck = cards.map((card, i) => {
      const img = card.querySelector("img");
      const box = card.querySelector(".fc-formula");
      const rawSrc = img ? (img.getAttribute("src") || img.currentSrc || img.src || "") : "";
      return {
        i: i,
        topic: ((card.querySelector(".tag, .fc-head span") || {}).textContent || "").trim(),
        meaning: ((card.querySelector(".fc-meaning") || {}).textContent || "").trim(),
        html: box ? box.innerHTML : "",
        src: fcProxyUrl(rawSrc) || rawSrc
      };
    });
    return deck;
  }

  function closeReader() {
    const el = document.getElementById("qxFcReader");
    if (el) el.remove();
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKey);
    flipping = false;
  }

  function applyXform() {
    const page = document.getElementById("qxFcPage");
    if (!page) return;
    page.style.transform = "rotate(" + rot + "deg) scale(" + zoom + ")";
    page.style.transformOrigin = "center top";
  }

  function onKey(ev) {
    if (ev.key === "Escape") closeReader();
    else if (ev.key === "ArrowRight" || ev.key === " " || ev.key === "PageDown") {
      ev.preventDefault();
      go(1);
    } else if (ev.key === "ArrowLeft" || ev.key === "PageUp") {
      ev.preventDefault();
      go(-1);
    } else if (ev.key === "r" || ev.key === "R") {
      ev.preventDefault();
      rot = (rot + 90) % 360;
      applyXform();
    }
  }

  function paintReader(dir) {
    const item = deck[cur];
    if (!item) return;
    const imgEl = document.getElementById("qxFcReaderImg");
    const htmlEl = document.getElementById("qxFcReaderHtml");
    const topicEl = document.getElementById("qxFcReaderTopic");
    const meanEl = document.getElementById("qxFcReaderMean");
    const numEl = document.getElementById("qxFcReaderNum");
    const page = document.getElementById("qxFcPage");
    const html = String(item.html || "");
    const src = fcProxyUrl(item.src) || item.src || "";
    const htmlHasImg = /<img\b/i.test(html);

    if (htmlEl) {
      if (html && (!src || /[A-Za-z]{8,}/.test(html.replace(/<[^>]+>/g, " ")))) {
        htmlEl.innerHTML = html;
        htmlEl.style.display = htmlHasImg && src ? "none" : "";
      } else {
        htmlEl.innerHTML = "";
        htmlEl.style.display = "none";
      }
    }
    if (imgEl) {
      if (src) {
        imgEl.style.display = "";
        imgEl.onerror = function () {
          var el = this;
          if (el.dataset.qxFcTriedRaw === "1") {
            if (window.QxOwnedFigs && QxOwnedFigs.retryOnError) QxOwnedFigs.retryOnError(el);
            return;
          }
          el.dataset.qxFcTriedRaw = "1";
          var raw = String(item.src || "").replace(/^.*[?&]url=/, function (m) { return ""; });
          try {
            var u = new URL(String(item.src || ""), location.origin);
            if (u.pathname.indexOf("proxy-image") >= 0) {
              var decoded = decodeURIComponent(u.searchParams.get("url") || "");
              if (decoded) { el.setAttribute("src", decoded); return; }
            }
          } catch (_) { /* */ }
          if (window.QxOwnedFigs && QxOwnedFigs.retryOnError) QxOwnedFigs.retryOnError(el);
        };
        if (imgEl.getAttribute("src") !== src) imgEl.setAttribute("src", src);
      } else if (htmlHasImg) {
        imgEl.style.display = "none";
        if (htmlEl) {
          htmlEl.innerHTML = html;
          htmlEl.style.display = "";
        }
      } else {
        imgEl.removeAttribute("src");
        imgEl.style.display = "none";
      }
    }
    if (topicEl) topicEl.textContent = item.topic || "Formula";
    if (meanEl) {
      meanEl.textContent = item.meaning || "";
      meanEl.style.display = item.meaning ? "" : "none";
    }
    if (numEl) numEl.textContent = (cur + 1) + " / " + deck.length;
    zoom = 1;
    rot = 0;
    if (page) {
      page.style.transform = "";
      page.classList.remove("qx-fc-turn-next", "qx-fc-turn-prev");
      void page.offsetWidth;
      page.classList.add(dir < 0 ? "qx-fc-turn-prev" : "qx-fc-turn-next");
    }
    applyXform();
    const stage = document.getElementById("qxFcStage");
    if (stage) stage.scrollTop = 0;
  }

  function jumpChapter(dir) {
    const trail = window._qxFcTrail;
    if (!trail || !trail.chapters || !trail.chapters.length) return false;
    const ni = (trail.chapterIdx | 0) + dir;
    if (ni < 0 || ni >= trail.chapters.length) return false;
    const nextCh = trail.chapters[ni];
    if (!nextCh || !nextCh.name) return false;
    window._qxFcOpenAfter = dir > 0 ? 0 : "last";
    closeReader();
    if (typeof go === "function") {
      go("formula", { step: "cards", subject: trail.subject, chapter: nextCh.name });
    } else if (window.qxFcOpenChapter) {
      window.qxFcOpenChapter(trail.subject, nextCh.name);
    }
    return true;
  }

  function go(delta) {
    if (flipping) return;
    const n = cur + delta;
    if (n >= 0 && n < deck.length) {
      flipping = true;
      cur = n;
      paintReader(delta);
      setTimeout(function () { flipping = false; }, 380);
      return;
    }
    if (n >= deck.length) jumpChapter(1);
    else if (n < 0) jumpChapter(-1);
  }

  function openReader(start) {
    collectDeck();
    if (!deck.length) return;
    cur = Math.max(0, Math.min(deck.length - 1, start | 0));
    closeReader();
    const wrap = document.createElement("div");
    wrap.id = "qxFcReader";
    wrap.className = "qx-fc-reader";
    wrap.innerHTML = `<div class="qx-fc-reader-bar">
        <strong id="qxFcReaderTopic">Formula</strong>
        <span class="qx-fc-reader-num" id="qxFcReaderNum">1 / 1</span>
        <span class="qx-fc-reader-tools">
          <button type="button" id="qxFcRot" title="Rotate">⟳</button>
          <button type="button" id="qxFcZoomOut" title="Zoom out">−</button>
          <button type="button" id="qxFcZoomIn" title="Zoom in">+</button>
          <button type="button" id="qxFcClose">Close</button>
        </span>
      </div>
      <div class="qx-fc-reader-stage" id="qxFcStage">
        <button type="button" class="qx-fc-hit qx-fc-hit-prev" id="qxFcHitPrev" aria-label="Previous"></button>
        <div class="qx-fc-reader-page qx-fc-turn-next" id="qxFcPage">
          <div class="qx-fc-reader-html" id="qxFcReaderHtml"></div>
          <img id="qxFcReaderImg" alt="Formula page">
          <span class="qx-fc-seal" aria-hidden="true"></span>
          <p class="qx-fc-reader-mean" id="qxFcReaderMean"></p>
        </div>
        <button type="button" class="qx-fc-hit qx-fc-hit-next" id="qxFcHitNext" aria-label="Next"></button>
      </div>
      <div class="qx-fc-reader-nav">
        <button type="button" class="qx-fc-nav-btn" id="qxFcPrev">← Previous page</button>
        <button type="button" class="qx-fc-nav-btn qx-fc-nav-next" id="qxFcNext">Next page →</button>
      </div>`;
    document.body.appendChild(wrap);
    document.body.style.overflow = "hidden";
    wrap.querySelector("#qxFcZoomIn").onclick = function (e) { e.stopPropagation(); zoom = Math.min(4.2, zoom + 0.2); applyXform(); };
    wrap.querySelector("#qxFcZoomOut").onclick = function (e) { e.stopPropagation(); zoom = Math.max(0.55, zoom - 0.2); applyXform(); };
    wrap.querySelector("#qxFcRot").onclick = function (e) { e.stopPropagation(); rot = (rot + 90) % 360; applyXform(); };
    wrap.querySelector("#qxFcClose").onclick = function (e) { e.stopPropagation(); closeReader(); };
    wrap.querySelector("#qxFcPrev").onclick = function (e) { e.stopPropagation(); go(-1); };
    wrap.querySelector("#qxFcNext").onclick = function (e) { e.stopPropagation(); go(1); };
    wrap.querySelector("#qxFcHitPrev").onclick = function (e) { e.stopPropagation(); go(-1); };
    wrap.querySelector("#qxFcHitNext").onclick = function (e) { e.stopPropagation(); go(1); };
    wrap.querySelector("#qxFcStage").addEventListener("wheel", function (e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoom = Math.max(0.55, Math.min(4.2, zoom + (e.deltaY < 0 ? 0.14 : -0.14)));
        applyXform();
      }
    }, { passive: false });
    document.addEventListener("keydown", onKey);
    var sx = 0;
    wrap.addEventListener("touchstart", function (e) { sx = e.changedTouches[0].clientX; }, { passive: true });
    wrap.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      if (dx > 50) go(-1);
      else if (dx < -50) go(1);
    }, { passive: true });
    paintReader(1);
  }

  function bindCard(card) {
    if (!card || card.dataset.qxFcBound === "1") return;
    card.dataset.qxFcBound = "1";
    card.style.cursor = "zoom-in";
    card.addEventListener("click", function (e) {
      if (e.target.closest(".bm-btn")) return;
      e.preventDefault();
      e.stopPropagation();
      var idx = parseInt(card.getAttribute("data-fc-i"), 10);
      collectDeck();
      var i = Number.isFinite(idx) ? idx : Array.from(card.parentNode.children).indexOf(card);
      openReader(i);
    });
  }

  function enhance() {
    if (!isFormulaView()) return;
    var host = document.getElementById("app-main") || document;
    host.querySelectorAll(FC_SEL).forEach(function (img) {
      if (img.closest("#qxFcReader")) return;
      forceProxy(img);
      wrapImg(img);
    });
    host.querySelectorAll(".fc-card.qx-fc-designed, .fc-grid .fc-card").forEach(bindCard);
    if (window._qxFcOpenAfter != null && document.querySelector(".fc-card")) {
      var flag = window._qxFcOpenAfter;
      window._qxFcOpenAfter = null;
      collectDeck();
      var start = flag === "last" ? Math.max(0, deck.length - 1) : 0;
      setTimeout(function () { openReader(start); }, 120);
    }
  }

  function schedule() {
    enhance();
    [80, 250, 600].forEach(function (ms) { setTimeout(enhance, ms); });
  }

  function bootCss() {
    var link = document.getElementById("qxFcCardCss");
    if (!link) {
      link = document.createElement("link");
      link.id = "qxFcCardCss";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (!/qxfix110/.test(link.href || "")) link.href = "assets/qx-formula-cards.css?v=qxmd99";
  }

  window.QxFormulaCards = { enhance: schedule, open: openReader, go: go };
  bootCss();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule);
  else schedule();
  var t = 0;
  try {
    var mo = new MutationObserver(function () {
      if (!isFormulaView()) return;
      clearTimeout(t);
      t = setTimeout(enhance, 80);
    });
    mo.observe(document.getElementById("app-main") || document.body, { childList: true, subtree: true });
  } catch (_) { /* */ }
})();
