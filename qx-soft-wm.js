/**
 * Soft figure pin — clean proxy once (no Marks watermark).
 * No MutationObserver thrash. Idempotent: already-clean proxy left alone.
 */
(function () {
  "use strict";

  const POOL_RX = /cdn-question-pool\.getmarks|cdn\.quizrr|\/pyq\/|watermarked_images|getmarks\.app/i;

  function unwrap(url) {
    let s = String(url || "");
    if (/proxy-image|restore-image/i.test(s)) {
      try {
        const u = new URL(s, location.origin);
        const inner = u.searchParams.get("url");
        if (inner) s = decodeURIComponent(inner);
      } catch (_) { /* */ }
    }
    return s
      .replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/")
      .split("?")[0];
  }

  function cleanProxy(cdn) {
    const o = unwrap(cdn);
    if (!o) return "";
    if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc) {
      const disp = QxOwnedFigs.displaySrc(o);
      if (disp) return disp;
    }
    if (!POOL_RX.test(o) && !/quizrr|getmarks/i.test(o)) return o;
    const owned = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.ownedFigureUrl)
      ? QxOwnedFigs.ownedFigureUrl(o)
      : "";
    const inner = owned || o;
    if (/getmarks|quizrr/i.test(inner) && !/firebasestorage|\/assets\//i.test(inner)) return owned || "";
    return "/api/proxy-image?url=" + encodeURIComponent(inner) + "&clean=1&v=qxfig110";
  }

  function isCleanProxy(src) {
    return /\/api\/proxy-image/i.test(String(src || "")) && /(?:\?|&)clean=1(?:&|$)/i.test(String(src || ""));
  }

  function forceVisible(img) {
    if (!img || !img.style) return;
    img.style.setProperty("display", "block", "important");
    img.style.setProperty("visibility", "visible", "important");
    img.style.setProperty("opacity", "1", "important");
    img.style.setProperty("height", "auto", "important");
    img.style.setProperty("width", "auto", "important");
    img.style.setProperty("object-fit", "contain", "important");
    img.style.setProperty("object-position", "center", "important");
    const dark = (typeof document !== "undefined" && (
      document.documentElement.getAttribute("data-theme") === "dark"
      || (img.closest && img.closest(".mtk-test-root") && img.closest(".mtk-test-root").getAttribute("data-test-theme") === "dark")
    ));
    img.style.setProperty("background", dark ? "#eceae4" : "#ffffff", "important");
    img.style.setProperty("overflow", "visible", "important");
    img.style.setProperty("filter", "none", "important");
    if (img.closest("table, .qx-match-q-body, .qx-inline-table-figs")) {
      img.style.setProperty("max-width", "min(100%, 280px)", "important");
      img.style.setProperty("max-height", "min(42vh, 240px)", "important");
    } else if (img.closest(".mtk-opt-text, .qx-prac-opt-text, .qx-opt-diagram-slot, .qa-opt")) {
      img.style.setProperty("max-width", "min(100%, 320px)", "important");
      img.style.setProperty("max-height", "min(46vh, 280px)", "important");
    } else {
      img.style.setProperty("max-width", "min(100%, 720px)", "important");
      img.style.setProperty("max-height", "none", "important");
    }
  }

  function pinPoolImgs(root) {
    const scope = root || document.getElementById("app-main") || document;
    if (!scope.querySelectorAll) return;
    scope
      .querySelectorAll(
        "img[src*='cdn-question-pool'],img[src*='cdn.quizrr'],img[src*='/pyq/']," +
          "img[src*='2026_modules'],img[src*='AKCR2_'],img[src*='modules/ms']," +
          "img[src*='watermarked_images'],img[src*='proxy-image'],img[src*='restore-image']," +
          "img.qx-pool-fig,img.qx-match-fig,img.qx-no-wm"
      )
      .forEach((img) => {
        try {
          if (!img) return;
          if (img.classList.contains("qx-ui-brand-logo") || img.classList.contains("qx-marks-icon")) return;
          if (img.dataset.qxPinnedClean === "1" && isCleanProxy(img.getAttribute("src") || "")
            && /[?&]v=qxfig110(?:&|$)/i.test(img.getAttribute("src") || "")) {
            forceVisible(img);
            return;
          }
          const src = img.getAttribute("src") || "";
          const orig = img.dataset.qxOrigSrc || src;
          // Never replace a local baked figure with a proxy — figures must stay.
          if (/\/assets\/diagrams\//i.test(src) && !/org-src/i.test(src)) {
            img.classList.add("qx-fig-ready", "qx-no-wm", "qx-pool-fig");
            forceVisible(img);
            return;
          }
          if (/qx-org-|org-src|qx-organic-fig/i.test(src)) {
            img.classList.add("qx-org-fig", "qx-fig-ready", "qx-no-wm");
            img.style.setProperty("opacity", "1", "important");
            img.style.setProperty("visibility", "visible", "important");
            return;
          }
          if (!POOL_RX.test(src + " " + orig) && !/proxy-image|restore-image/i.test(src)) return;

          const cdn = unwrap(orig || src);
          if (!cdn) return;
          img.dataset.qxOrigSrc = cdn;
          // Never CORS-taint — that blanked options. Clean proxy only (no Marks logo).
          img.removeAttribute("crossorigin");
          img.crossOrigin = null;
          const proxy = cleanProxy(cdn);
          const cur = img.getAttribute("src") || "";
          if (proxy && cur !== proxy) {
            img.setAttribute("src", proxy);
          }
          img.dataset.qxPinnedClean = "1";
          img.classList.add("qx-no-wm", "qx-pool-fig", "qx-fig-ready", "qx-wm-clean");
          forceVisible(img);

          if (!img.dataset.qxErrOnce) {
            img.dataset.qxErrOnce = "1";
            img.addEventListener("error", function onFigErr() {
              const o = img.dataset.qxOrigSrc || cdn;
              const tries = parseInt(img.dataset.qxProxyTries || "0", 10) || 0;
              if (tries >= 2 || !o) return;
              img.dataset.qxProxyTries = String(tries + 1);
              const next = cleanProxy(o);
              if (!next) return;
              img.removeAttribute("crossorigin");
              // Retry clean proxy only — raw CDN would show MARKS watermark
              img.setAttribute("src", next + (tries ? "&r=" + Date.now() : ""));
            });
          }
        } catch (_) { /* */ }
      });
  }

  function isUiChromeImg(img) {
    if (!img || !img.classList) return true;
    if (img.classList.contains("qx-marks-icon") || img.classList.contains("qx-ui-brand-logo")
      || img.classList.contains("fc-img") || img.classList.contains("qx-fc-img")
      || img.classList.contains("exam-pill-logo") || img.classList.contains("subj-ic-img")
      || img.classList.contains("dash-tool-logo") || img.classList.contains("qx-exam-logo")) {
      return true;
    }
    const src = img.getAttribute("src") || "";
    return /formula_cards|app_assets\/img\/(exams|ui)|quantrex-logo|exam-pill|subj-ic|ic_content_exam_/i.test(src);
  }

  function isQuestionFigure(img) {
    if (!img || isUiChromeImg(img)) return false;
    const src = img.getAttribute("src") || "";
    const orig = img.dataset.qxOrigSrc || "";
    const cls = String(img.className || "");
    if (/data:image\/gif/i.test(src)) return false;
    return /qx-org-|qx-organic-fig|organic_book|watermarked_images|qx-org-fig|qx-pool-fig|qx-opt-fig|qx-match-fig|qx-fig-img|qx-hq-color|cdn-question-pool|cdn\.quizrr|\/pyq\/|proxy-image|restore-image|assets\/diagrams|assets\/qx-figures|assets\/book|watermark_improved/i.test(
      src + " " + orig + " " + cls
    );
  }

  function wrapQuantrexFig(img) {
    if (!img || img.closest(".qx-org-fig-host")) return;
    if (!isQuestionFigure(img)) return;
    const src = img.getAttribute("src") || "";
    const origHint = img.dataset.qxOrigSrc || src;
    const cls = String(img.className || "");
    const host = document.createElement("span");
    host.className = "qx-org-fig-host";
    if (/2026_modules|AKCR2_|modules\/ms\//i.test(src + " " + origHint)) {
      host.classList.add("qx-org-fig-host-scan");
    }
    if (img.closest("table, .qx-match-q-body, .qx-inline-table-figs")) host.classList.add("qx-org-fig-host-cell");
    if (img.closest(".mtk-opt-text, .qx-prac-opt-text, .qx-opt-diagram-slot, .qa-opt")) host.classList.add("qx-org-fig-host-opt");
    const wm = document.createElement("span");
    wm.className = "qx-org-qx-wm";
    wm.setAttribute("aria-hidden", "true");
    const parent = img.parentNode;
    if (!parent) return;
    parent.insertBefore(host, img);
    host.appendChild(img);
    host.appendChild(wm);
    try {
      const opt = img.closest(".qx-prac-opt, .mtk-opt, .qa-opt, .qx-prac-opt-text, .mtk-opt-text");
      if (opt) opt.querySelectorAll(".qx-fig-loading, [data-qx-fig-wait]").forEach((n) => n.remove());
    } catch (_) { /* */ }
    img.classList.add("qx-fig-ready", "qx-no-wm");
    const bust = (typeof window !== "undefined" && window.QX_BUILD) || "qxfigstd1";
    if (/\/assets\/diagrams\/qx-org-/i.test(src) && !/[?&]v=/.test(src)) {
      img.setAttribute("src", src.split("?")[0] + "?v=" + encodeURIComponent(bust));
    }
    forceVisible(img);
  }

  function wrapQuantrexFigs(root) {
    const scope = root || document.getElementById("app-main") || document;
    if (!scope.querySelectorAll) return;
    scope.querySelectorAll(
      "img.qx-org-fig, img.qx-organic-fig, img.qx-pool-fig, img.qx-opt-fig-img, img.qx-match-fig, img.qx-fig-img, img.mk-sol-fig, " +
      ".sol-body img, .qx-sol-body img, .mk-sol-q img, .qa-q img, .qa-opt img, " +
      "img[src*='qx-org-'], img[src*='organic_book'], img[src*='watermarked_images'], " +
      "img[src*='cdn-question-pool'], img[src*='cdn.quizrr'], img[src*='/pyq/'], " +
      "img[src*='2026_modules'], img[src*='AKCR2_'], " +
      "img[src*='proxy-image'], img[src*='restore-image'], img[src*='assets/diagrams'], img[src*='assets/qx-figures']"
    ).forEach(wrapQuantrexFig);
  }

  function hideMarksChrome(root) {
    const scope = root || document;
    if (!scope.querySelectorAll) return;
    scope
      .querySelectorAll(
        "img[src*='ic_marks'],img[src*='marks-premium'],img[src*='getmarks-brand']," +
          "img[src*='marks_selected'],.marks-brand,.getmarks-brand"
      )
      .forEach((el) => {
        const s = (el.getAttribute && el.getAttribute("src")) || "";
        if (POOL_RX.test(s) || /proxy-image/i.test(s)) return;
        try {
          el.style.setProperty("display", "none", "important");
        } catch (_) { /* */ }
      });
  }

  let _optFigIndex = window._qxOptFigIndex || null;
  let _optFigIndexLoading = false;

  function isOptFigStub(html) {
    const s = String(html || "");
    const t = s.replace(/<img\b[^>]*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const textStub = !t || /^(figure|fig\.?|diagram|image|structure|photo)$/i.test(t);
    if (/\b(?:alt|title)\s*=\s*["'][^"']*\b(?:figure|fig\.?|diagram|image)\b/i.test(s)) return true;
    if (/\/(?:ic_)?(?:figure|fig)(?:[_-]?(?:placeholder|stub|icon|label|mark))?s?\.(?:png|jpe?g|gif|svg|webp)/i.test(s)) return true;
    const w = s.match(/\bwidth\s*[:=]\s*["']?(\d+)/i) || s.match(/\bwidth\s*:\s*(\d+)px/i);
    if (w && parseInt(w[1], 10) > 0 && parseInt(w[1], 10) < 140) return true;
    if (/watermark_improved|28S2_o_|qx-org-|watermarked_images|qx-figures|AKCR2_/i.test(s)) return false;
    if (/<img\b/i.test(s) && /cdn-question-pool|proxy-image|\/pyq\//i.test(s) && !textStub) return false;
    return textStub;
  }

  function recForQuestion(q) {
    const idx = _optFigIndex || window._qxOptFigIndex;
    if (!q || !idx) return null;
    return idx[String(q.id)]
      || (q._marksId ? idx[String(q._marksId)] : null)
      || (q.id != null && idx[q.id])
      || null;
  }

  function applyIndexToQuestion(q) {
    if (!q) return false;
    const filled = optHtmlFor(q);
    if (!filled || !filled.some(Boolean)) return false;
    const next = Array.isArray(q.options) ? q.options.slice() : [];
    let changed = false;
    filled.forEach((h, i) => {
      if (!h) return;
      const cur = next[i];
      const base = (u) => String(u || "").split("?")[0].split("/").pop().toLowerCase();
      const want = (String(h).match(/data-qx-orig-src=["']([^"']+)/i) || String(h).match(/src=["']([^"']+)/i) || [])[1] || "";
      const have = (String(cur || "").match(/data-qx-orig-src=["']([^"']+)/i) || String(cur || "").match(/src=["']([^"']+)/i) || [])[1] || "";
      const wrong = want && have && base(want) !== base(have);
      if (isOptFigStub(cur) || wrong) {
        next[i] = h;
        changed = true;
      }
    });
    if (changed) {
      q.options = next;
      if (!q._qxBankOptions || !q._qxBankOptions.some((o) => /<img\b/i.test(String(o || "")))) {
        q._qxBankOptions = next.slice();
      }
    }
    return changed;
  }

  function applyIndexToSession() {
    try {
      if (!window.QuantrexTestEngine || !QuantrexTestEngine.getSession || typeof getQ !== "function") return;
      const sess = QuantrexTestEngine.getSession();
      if (!sess || !sess.ids) return;
      const i0 = Math.max(0, (sess.idx || 0) - 1);
      const i1 = Math.min(sess.ids.length, (sess.idx || 0) + 10);
      for (let i = i0; i < i1; i++) applyIndexToQuestion(getQ(sess.ids[i]));
    } catch (_) { /* */ }
  }

  function onIndexReady() {
    if (window._qxOptFigIndex) _optFigIndex = window._qxOptFigIndex;
    applyIndexToSession();
    schedule(20);
    try {
      if (window.QuantrexTestEngine && typeof QuantrexTestEngine.refreshOptions === "function") {
        QuantrexTestEngine.refreshOptions();
      }
    } catch (_) { /* */ }
  }

  function loadOptFigIndex() {
    if (!_optFigIndex && window._qxOptFigIndex && typeof window._qxOptFigIndex === "object"
      && Object.keys(window._qxOptFigIndex).length) {
      _optFigIndex = window._qxOptFigIndex;
    }
    if (_optFigIndex) {
      window._qxOptFigIndex = _optFigIndex;
      applyIndexToSession();
      return;
    }
    if (_optFigIndexLoading) return;
    _optFigIndexLoading = true;
    fetch("data/qx_opt_fig_index.json?v=qxtheme1", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((j) => {
        _optFigIndex = j || {};
        window._qxOptFigIndex = _optFigIndex;
        onIndexReady();
      })
      .catch(() => { _optFigIndex = {}; });
  }

  function lookupOptCdns(q) {
    const rec = recForQuestion(q);
    return rec && rec.o ? rec.o : null;
  }

  function optHtmlFor(q) {
    const cdns = lookupOptCdns(q);
    if (!cdns || !cdns.some(Boolean)) return null;
    return cdns.map((u) => {
      const cdn = unwrap(u || "");
      if (!cdn) return "";
      const proxy = cleanProxy(cdn) || cdn;
      const safe = String(proxy).replace(/"/g, "&quot;");
      const orig = String(cdn).replace(/"/g, "&quot;");
      return `<img class="qx-pool-fig qx-no-wm qx-opt-fig-img qx-fig-ready" src="${safe}" data-qx-orig-src="${orig}" alt="" loading="eager">`;
    });
  }

  function stripFigureWords(el) {
    if (!el || !el.querySelectorAll) return;
    const spill = /getmarks\.app|cdn-question-pool|cdn\.quizrr|proxy-image|watermark_improved|watermarked_images|2026_modules|AKCR2_|\/pyq\/|%2Fpyq|url=https?/i;
    el.querySelectorAll(".mtk-opt-text, .qx-prac-opt-text, .qa-opt .qx-content, .mtk-q-text, .qx-marks-native-q, .qx-marks-native-opt, .qx-content").forEach((host) => {
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, null);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((n) => {
        if (!n || !n.nodeValue) return;
        if (n.parentElement && n.parentElement.closest("script, style, .katex, math, .qx-org-qx-wm")) return;
        let t = n.nodeValue;
        if (spill.test(t) || /https?:\/\/\S+\.(?:png|jpe?g|webp|gif)/i.test(t)) {
          t = t
            .replace(/(?:https?:\/\/|\/api\/proxy-image)\S+/gi, " ")
            .replace(/\b(?:getmarks\.app|cdn-question-pool|cdn\.quizrr)\S*/gi, " ")
            .replace(/\b(?:watermark_improved|watermarked_images|2026_modules|AKCR2_)\S*/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (!/[A-Za-z]{3,}/.test(t) && !/\d/.test(t)) t = "";
        } else {
          t = t.replace(/\b(?:FIGURE|Figure|Fig\.?|DIAGRAM)\b/g, " ").replace(/\s+/g, " ");
        }
        if (t !== n.nodeValue) n.nodeValue = t;
      });
    });
  }

  function injectMissingOptionFigs(root) {
    const scope = root || document.getElementById("app-main") || document;
    if (!scope.querySelectorAll) return;
    let q = null;
    try {
      if (typeof QxImgClean !== "undefined" && QxImgClean.resolveCurrentQuestion) {
        q = QxImgClean.resolveCurrentQuestion(scope);
      }
    } catch (_) { /* */ }
    try {
      if (!q && window.QuantrexTestEngine && QuantrexTestEngine.getSession && typeof getQ === "function") {
        const sess = QuantrexTestEngine.getSession();
        if (sess && sess.ids && sess.ids[sess.idx] != null) q = getQ(sess.ids[sess.idx]);
      }
    } catch (_) { /* */ }
    const fromHtml = (opts) => (opts || []).map((o) => {
      const m = String(o || "").match(/\bsrc=["']([^"']+)["']/i);
      return m ? unwrap(m[1]) : "";
    });
    const idxCdns = lookupOptCdns(q) || [];
    const bankCdns = fromHtml(q && q._qxBankOptions);
    const liveCdns = fromHtml(q && q.options);
    const maxN = Math.max(idxCdns.length, bankCdns.length, liveCdns.length, 4);
    const cdns = [];
    for (let i = 0; i < maxN; i++) {
      cdns[i] = unwrap(idxCdns[i] || bankCdns[i] || liveCdns[i] || "");
    }
    if (!cdns.some(Boolean)) return;
    const hosts = scope.querySelectorAll(".mtk-opt-text, .qx-prac-opt-text");
    hosts.forEach((host, i) => {
      const cdn = unwrap(cdns[i] || "");
      if (!cdn) return;
      try {
        host.querySelectorAll(".qx-match-pairs, .qx-match-combo").forEach((el) => el.remove());
      } catch (_) { /* */ }
      const img = host.querySelector("img");
      const figBase = (u) => unwrap(u || "").split("/").pop().toLowerCase();
      const have = img ? figBase(img.getAttribute("src") || img.dataset.qxOrigSrc || "") : "";
      const want = figBase(cdn);
      const alt = img ? String(img.getAttribute("alt") || "") : "";
      const hostTxt = String(host.textContent || "").replace(/\s+/g, " ").trim();
      const tiny = !!(img && img.complete && img.naturalWidth > 0
        && (img.naturalWidth < 140 || img.naturalHeight < 48));
      const placeholder = img && (
        /^(figure|fig\.?|diagram|image)$/i.test(alt)
        || /figure|fig_stub|placeholder/i.test(have)
        || tiny
      );
      const onlyFigureWord = /^(figure|fig\.?|diagram|image|structure)$/i.test(hostTxt);
      const wrongFile = !!(want && have && want !== have);
      if (img && img.complete && img.naturalWidth >= 140 && !placeholder && !onlyFigureWord && !wrongFile) return;
      if (img && !img.complete && have === want && /watermark_improved|28S2_o_|qx-org-|watermarked_images|AKCR2_/i.test(have)) {
        return;
      }
      const proxy = cleanProxy(cdn) || cdn;
      if (!img) {
        const n = document.createElement("img");
        n.className = "qx-pool-fig qx-no-wm qx-opt-fig-img qx-fig-ready";
        n.setAttribute("src", proxy);
        n.setAttribute("data-qx-orig-src", cdn);
        n.setAttribute("alt", "");
        n.setAttribute("loading", "eager");
        host.insertBefore(n, host.firstChild);
        forceVisible(n);
        wrapQuantrexFig(n);
        return;
      }
      img.removeAttribute("crossorigin");
      img.dataset.qxOrigSrc = cdn;
      img.setAttribute("src", proxy);
      img.setAttribute("alt", "");
      forceVisible(img);
      wrapQuantrexFig(img);
    });
  }

  function injectMissingStemFig(root) {
    const scope = root || document.getElementById("app-main") || document;
    if (!scope.querySelector) return;
    const body = scope.querySelector(".qx-question-body, .mtk-main, .qx-prac-q, .qa-q") || scope;
    const existing = Array.from(body.querySelectorAll(
      ".qx-diagram-slot img, #qxDiagramSlot img, .qx-org-fig-host img, .qx-marks-native-q img, .mtk-q-text img, .qx-q-text-only img"
    )).filter((img) => !img.closest(".mtk-opt, .qx-prac-opt, .qa-opt, .mtk-opt-text, .qx-prac-opt-text"));
    const hasRealStem = existing.some((img) => {
      if (!img.complete || img.naturalWidth < 80) return false;
      const src = (img.getAttribute("src") || "") + " " + (img.dataset.qxOrigSrc || "");
      if (/figure|fig_stub|placeholder/i.test(src + " " + String(img.getAttribute("alt") || ""))) return false;
      if (img.naturalWidth < 140 && img.naturalHeight < 48) return false;
      return /2026_modules|AKCR2_|watermark_improved|watermarked_images|qx-org-|\/pyq\/|proxy-image|cdn-question-pool/i.test(src)
        || img.naturalWidth >= 140;
    });
    if (hasRealStem) return;
    const stem = body.querySelector(".mtk-q-text, .qx-prac-q, .qx-content.qx-marks-native-q, .qx-q-text-only");
    if (!stem) return;
    let q = null;
    try {
      if (typeof QxImgClean !== "undefined" && QxImgClean.resolveCurrentQuestion) {
        q = QxImgClean.resolveCurrentQuestion(scope);
      }
    } catch (_) { /* */ }
    try {
      if (!q && typeof getQ === "function" && window.QuantrexTestEngine && QuantrexTestEngine.getSession) {
        const sess = QuantrexTestEngine.getSession();
        if (sess && sess.ids && sess.ids[sess.idx] != null) q = getQ(sess.ids[sess.idx]);
      }
    } catch (_) { /* */ }
    if (!q) return;
    try {
      if (typeof QxImgClean !== "undefined" && QxImgClean.ensureIrodovStem) QxImgClean.ensureIrodovStem(q);
    } catch (_) { /* */ }
    const raw = (typeof QxImgClean !== "undefined" && QxImgClean.irodovStemHtml && QxImgClean.isIrodovQuestion && QxImgClean.isIrodovQuestion(q))
      ? (q._qxBankQ || q.q || QxImgClean.irodovStemHtml(q) || "")
      : (q._qxBankQ || q.q || "");
    let m = String(raw).match(/\bsrc=["']([^"']+)["']/i);
    if (!m && typeof QxImgClean !== "undefined" && QxImgClean.questionImageSrc) {
      const extra = QxImgClean.questionImageSrc(q);
      if (extra) m = [extra, extra];
    }
    if (!m) return;
    const cdn = unwrap(m[1]);
    if (!cdn || (!POOL_RX.test(cdn) && !/2026_modules|modules\/ms|AKCR2_/i.test(cdn))) return;
    const img = stem.querySelector("img");
    const txt = String(stem.textContent || "").replace(/\s+/g, " ").trim();
    const tiny = !!(img && img.complete && img.naturalWidth > 0 && (img.naturalWidth < 140 || img.naturalHeight < 48));
    const broken = !img || (img.complete && img.naturalWidth < 8)
      || /^(figure|fig\.?|diagram)$/i.test(txt)
      || (img && /^(figure|fig\.?)$/i.test(String(img.getAttribute("alt") || "")))
      || tiny;
    if (!broken && img && img.naturalWidth >= 140) return;
    const src = cleanProxy(cdn) || cdn;
    if (!img) {
      const n = document.createElement("img");
      n.className = "qx-pool-fig qx-no-wm qx-fig-img qx-fig-ready";
      n.setAttribute("src", src);
      n.setAttribute("data-qx-orig-src", cdn);
      n.setAttribute("alt", "");
      n.setAttribute("loading", "eager");
      n.style.cssText = "max-width:min(100%,680px);height:auto;display:block;margin:12px auto;object-fit:contain;background:#fff;float:none;clear:both";
      stem.appendChild(n);
      wrapQuantrexFig(n);
      return;
    }
    img.removeAttribute("crossorigin");
    img.dataset.qxOrigSrc = cdn;
    img.setAttribute("src", src);
    img.setAttribute("alt", "");
    forceVisible(img);
    wrapQuantrexFig(img);
  }

  function scan(root) {
    const r = root || document.getElementById("app-main") || document;
    loadOptFigIndex();
    applyIndexToSession();
    hideMarksChrome(r);
    pinPoolImgs(r);
    stripFigureWords(r);
    injectMissingOptionFigs(r);
    injectMissingStemFig(r);
    wrapQuantrexFigs(r);
    try {
      if (typeof QxImgClean !== "undefined" && QxImgClean.dedupeDomFigures) {
        QxImgClean.dedupeDomFigures(r);
      }
    } catch (_) { /* */ }
  }

  try { loadOptFigIndex(); } catch (_) { /* */ }

  let t = 0;
  function schedule(ms) {
    clearTimeout(t);
    t = setTimeout(() => {
      try {
        scan();
      } catch (_) { /* */ }
    }, ms == null ? 60 : ms);
  }

  function boot() {
    schedule(40);
    schedule(350);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.QxSoftWm = {
    scan, schedule, forceCleanPoolImgs: pinPoolImgs, pinPoolImgs, wrapQuantrexFigs,
    lookupOptCdns, optHtmlFor, applyIndexToQuestion, applyIndexToSession, onIndexReady
  };
})();
