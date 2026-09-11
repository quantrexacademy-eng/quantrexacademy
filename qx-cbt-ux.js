/**
 * Quantrex CBT UX — dual format enforcement + mobile Tests entry labels
 * QUANTREX FORMAT (examgoal/Allen practice) = flexible Practice
 * NTA FORMAT (quizrr) = exact Marks/ExamGoal NTA shell for Test Series only
 * PYQ Mock = ExamGoal / Quantrex practice chrome (same as chapter-wise)
 * Additive only. No payment / bank changes.
 */
(function (global) {
  "use strict";

  var VERSION = "qxmd116";
  var FORMAT_KEY = "qx_cbt_format_pref"; // "quantrex" | "nta"

  function isPracticeConfig(cfg) {
    if (!cfg || typeof cfg !== "object") return false;
    if (cfg.practiceMode) return true;
    if (cfg.timed === false && String(cfg.testType || "").indexOf("pyq") >= 0) return true;
    return false;
  }

  function wantsNta(cfg) {
    if (!cfg || typeof cfg !== "object") return false;
    if (isPracticeConfig(cfg)) return false;
    var ui = String(cfg.uiMode || "");
    if (ui === "quizrr") return true;
    if (ui === "examgoal" || ui === "quantrex") return false;
    var tt = String(cfg.testType || cfg.modeLabel || cfg.title || "");
    if (/^testseries$/i.test(tt) || /(?:^|[\s_-])(?:test)?series(?:$|[\s_-])/i.test(tt) || /full.?test|part.?test/i.test(tt)) return true;
    if (cfg.timed && cfg.marksMode) return true;
    return false;
  }

  function normalizeConfig(cfg) {
    if (!cfg || typeof cfg !== "object") return cfg;
    var ui = String(cfg.uiMode || "");
    var tt = String(cfg.testType || "");

    // 1) Practice → always QUANTREX FORMAT
    if (isPracticeConfig(cfg)) {
      cfg.uiMode = "examgoal";
      cfg._qxFormat = "quantrex";
      return cfg;
    }

        // 2) Test Series → always NTA (quizrr). PYQ Mock → ExamGoal (chapter-practice UX).
    if (/^pyqmock$/i.test(tt)) {
      cfg.uiMode = "examgoal";
      cfg._qxFormat = "quantrex";
      return cfg;
    }
    if (/^testseries$/i.test(tt)) {
      cfg.uiMode = "quizrr";
      cfg._qxFormat = "nta";
      cfg.practiceMode = false;
      return cfg;
    }

    // 3) Explicit chooser / caller (practice / custom only)
    if (ui === "quantrex") {
      cfg.uiMode = "examgoal";
      cfg._qxFormat = "quantrex";
      return cfg;
    }
    if (ui === "quizrr") {
      cfg._qxFormat = "nta";
      return cfg;
    }
    if (ui === "examgoal") {
      cfg._qxFormat = "quantrex";
      return cfg;
    }

    // 4) Heuristic: timed marks mocks / series → NTA
    if (wantsNta(cfg)) {
      cfg.uiMode = "quizrr";
      cfg._qxFormat = "nta";
      return cfg;
    }
    return cfg;
  }

  function wrapStartTest() {
    if (global.__qxCbtStartWrapped) return;
    var tries = 0;
    function attempt() {
      tries++;
      if (typeof global.startTest !== "function") {
        if (tries < 80) setTimeout(attempt, 100);
        return;
      }
      if (global.startTest.__qxCbtWrapped) return;
      var orig = global.startTest;
      function wrapped(ids, title, returnTo, config) {
        var cfg = config && typeof config === "object" ? Object.assign({}, config) : {};
        normalizeConfig(cfg);
        try {
          document.documentElement.setAttribute(
            "data-qx-cbt-format",
            cfg._qxFormat || (cfg.uiMode === "quizrr" ? "nta" : "quantrex")
          );
        } catch (_) { /* */ }
        return orig.call(this, ids, title, returnTo, cfg);
      }
      wrapped.__qxCbtWrapped = true;
      global.startTest = wrapped;
      global.__qxCbtStartWrapped = true;
    }
    attempt();
  }


  /** Immersive full-window question view (ExamGoal feel) — Practice + Test/CBT */
  function syncQuestionFullscreen() {
    function isQuestionOpen() {
      var b = document.body;
      if (!b) return false;
      if (document.querySelector(".eg-test-root, .qzrr-cbt, .mtk-test-root.allen-cbt")) return true;
      if (
        b.classList.contains("marks-test-active") ||
        b.classList.contains("allen-cbt-active") ||
        b.classList.contains("allen-practice-active") ||
        b.classList.contains("qzrr-instr-active") ||
        b.classList.contains("marks-instr-active")
      ) return true;
      return false;
    }
    function sync() {
      var b = document.body;
      if (!b) return;
      var on = isQuestionOpen();
      // Keep results analysis as immersive too (hide chrome) but allow scroll
      var results = b.classList.contains("marks-results-active") || b.classList.contains("qzrr-analysis-active");
      var immersive = on || results;
      b.classList.toggle("qx-q-fullscreen", !!immersive);
      b.classList.toggle("qx-cbt-session", !!on || !!results);
      try {
        document.documentElement.classList.toggle("qx-q-fullscreen", !!immersive);
      } catch (_) { /* */ }
      // Hide chrome elements that CSS may miss (inline display from other scripts)
      var hideSel = [
        "#sidebar", ".sidebar", ".topbar", ".qx-top-exams",
        ".jovi-fab", "#joviFab", ".qx-update-bar",
        ".qx-brand-overlay", "#qxBrandOverlay",
        ".marks-bottom-nav", ".qx-bottom-nav", "#qxBottomNav",
        ".qx-mobile-tabbar", ".nav-dock"
      ];
      hideSel.forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (el) {
          if (!el) return;
          if (immersive) {
            if (!el.hasAttribute("data-qx-fs-prev")) {
              el.setAttribute("data-qx-fs-prev", el.style.display || "");
            }
            el.style.display = "none";
            el.setAttribute("hidden", "");
          } else if (el.hasAttribute("data-qx-fs-prev")) {
            var prev = el.getAttribute("data-qx-fs-prev");
            el.style.display = prev;
            el.removeAttribute("data-qx-fs-prev");
            el.removeAttribute("hidden");
          }
        });
      });
      // Ensure #app-main fills viewport only while a real CBT/practice shell is open
      var main = document.getElementById("app-main");
      if (main && immersive && on) {
        if (typeof global.qxShowTestMount === "function") {
          try { global.qxShowTestMount(main); } catch (_) { /* */ }
        } else {
          main.style.position = "fixed";
          main.style.inset = "0";
          main.style.zIndex = "9500";
          main.style.overflow = "auto";
          main.style.padding = "0";
          main.style.maxWidth = "none";
        }
      } else if (main && !immersive && !document.querySelector(".eg-test-root, .qzrr-cbt, .mtk-test-root.allen-cbt")) {
        if (typeof global.qxClearMountInlineStyles === "function") {
          try { global.qxClearMountInlineStyles(main); } catch (_) { /* */ }
        } else {
          main.style.position = "";
          main.style.inset = "";
          main.style.zIndex = "";
          main.style.overflow = "";
          main.style.padding = "";
          main.style.maxWidth = "";
          main.style.background = "";
        }
      }
      var bar = document.querySelector(".qx-update-bar");
      if (bar && immersive) bar.setAttribute("hidden", "");
      try {
        if (immersive && global.QxLiveFeed && typeof global.QxLiveFeed.hideBar === "function") {
          global.QxLiveFeed.hideBar();
        }
      } catch (_) { /* */ }
      try {
        if (immersive) document.body.style.overflow = on ? "hidden" : "";
        else document.body.style.overflow = "";
      } catch (_) { /* */ }
    }
    sync();
    if (global.__qxQFsObs) return;
    global.__qxQFsObs = true;
    try {
      var mo = new MutationObserver(function () { sync(); });
      mo.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class"]
      });
    } catch (_) {
      setInterval(sync, 1200);
    }
    document.addEventListener("qx:test-start", sync);
    document.addEventListener("qx:test-end", sync);
    document.addEventListener("qx:question-rendered", sync);
    ["hashchange", "popstate"].forEach(function (ev) {
      window.addEventListener(ev, function () { setTimeout(sync, 30); });
    });
    // Wrap practice enter/exit if present
    function wrap(name, after) {
      if (typeof global[name] !== "function" || global[name].__qxFsWrapped) return;
      var orig = global[name];
      function wrapped() {
        var r = orig.apply(this, arguments);
        try { after(); } catch (_) { /* */ }
        return r;
      }
      wrapped.__qxFsWrapped = true;
      global[name] = wrapped;
    }
    var tries = 0;
    (function attempt() {
      tries++;
      wrap("enterAllenPracticeMode", sync);
      wrap("exitAllenPracticeMode", sync);
      wrap("enterMarksTestMode", sync);
      wrap("exitMarksTestMode", sync);
      wrap("qxForceResetShell", sync);
      if (tries < 60) setTimeout(attempt, 150);
    })();
  }

  function hideUpdateBarInCbt() {
    function sync() {
      var b = document.body;
      if (!b) return;
      var inCbt =
        b.classList.contains("marks-test-active") ||
        b.classList.contains("allen-cbt-active") ||
        b.classList.contains("allen-practice-active") ||
        b.classList.contains("mtk-test-open") ||
        b.classList.contains("qzrr-instr-active") ||
        b.classList.contains("marks-instr-active") ||
        !!document.querySelector(".mtk-test-root, .eg-test-root, .qzrr-cbt");
      b.classList.toggle("qx-cbt-session", !!inCbt);
      b.classList.toggle("mtk-test-open", !!inCbt && b.classList.contains("marks-test-active"));
      var bar = document.querySelector(".qx-update-bar");
      if (bar && inCbt) bar.setAttribute("hidden", "");
      // Soften live-feed conflict with sticky CBT footer
      try {
        if (global.QxLiveFeed && typeof global.QxLiveFeed.hideBar === "function" && inCbt) {
          global.QxLiveFeed.hideBar();
        }
      } catch (_) { /* */ }
    }
    sync();
    if (global.__qxCbtBarObs) return;
    global.__qxCbtBarObs = true;
    try {
      var mo = new MutationObserver(sync);
      mo.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class"]
      });
    } catch (_) {
      setInterval(sync, 1500);
    }
    document.addEventListener("qx:test-start", sync);
    document.addEventListener("qx:test-end", sync);
  }

  function ensureCbtFontChip() {
    function place() {
      var root =
        document.querySelector(".qzrr-cbt, .mtk-test-root.allen-cbt, .eg-test-root") ||
        null;
      if (!root) return;
      if (root.querySelector("#qxCbtFontChip")) return;
      // Quizrr already has a11y font; Examgoal has zoom — add compact chip for mobile reachability
      var chip = document.createElement("div");
      chip.id = "qxCbtFontChip";
      chip.className = "qx-cbt-font-chip";
      chip.innerHTML =
        '<button type="button" class="qx-cbt-font-btn" data-delta="-1" aria-label="Smaller text">A−</button>' +
        '<span class="qx-cbt-font-lbl" id="qxCbtFontLbl">Aa</span>' +
        '<button type="button" class="qx-cbt-font-btn" data-delta="1" aria-label="Larger text">A+</button>';
      chip.addEventListener("click", function (e) {
        var btn = e.target && e.target.closest ? e.target.closest("[data-delta]") : null;
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        var d = parseInt(btn.getAttribute("data-delta"), 10) || 0;
        if (typeof global.bumpTestFont === "function") global.bumpTestFont(d);
        else if (typeof global.setTestFontScale === "function") {
          var order = ["small", "medium", "large", "xlarge"];
          var cur =
            typeof global.getTestFontScale === "function"
              ? global.getTestFontScale()
              : "medium";
          var i = Math.max(0, Math.min(order.length - 1, order.indexOf(cur) + d));
          global.setTestFontScale(order[i]);
        }
        var lbl = chip.querySelector("#qxCbtFontLbl");
        if (lbl && typeof global.getTestFontScale === "function") {
          var short = { small: "S", medium: "M", large: "L", xlarge: "XL" };
          lbl.textContent = short[global.getTestFontScale()] || "M";
        }
      });
      var host =
        root.querySelector(".qzrr-top-actions, .eg-hdr-tools, .mtk-header-right, .qzrr-head") ||
        root;
      host.appendChild(chip);
    }
    place();
    if (!global.__qxCbtFontObs) {
      global.__qxCbtFontObs = true;
      document.addEventListener("qx:question-rendered", place);
      setInterval(place, 2000);
    }
  }

  function enhanceTestsEntry() {
    function run() {
      var page = document.querySelector(".marks-tests-page");
      if (!page || page.querySelector("#qxFormatLegend")) return;
      var legend = document.createElement("div");
      legend.id = "qxFormatLegend";
      legend.className = "qx-format-legend";
      legend.innerHTML =
        '<div class="qx-fmt-card qx-fmt-qx">' +
        "<strong>QUANTREX FORMAT</strong>" +
        "<span>Flexible Practice · solutions · bookmarks · font/theme</span>" +
        "</div>" +
        '<div class="qx-fmt-card qx-fmt-nta">' +
        "<strong>NTA FORMAT</strong>" +
        "<span>Exact exam shell · timer · palette · Save &amp; Next · Mark for Review</span>" +
        "</div>";
      var head = page.querySelector(".marks-tests-head");
      if (head && head.parentNode) head.parentNode.insertBefore(legend, head.nextSibling);
      else page.insertBefore(legend, page.firstChild);

      // Annotate entry cards
      page.querySelectorAll(".mth-card").forEach(function (card) {
        if (card.querySelector(".qx-mode-pill")) return;
        var t = (card.textContent || "").toLowerCase();
        var pill = document.createElement("span");
        pill.className = "qx-mode-pill";
        if (/create your own|custom/.test(t) && !/teacher/.test(t)) {
          pill.className += " qx-mode-flex";
          pill.textContent = "Custom · choose timed Mock (NTA) or untimed Practice";
        } else if (/pyq mock|re-neet|mock test/.test(t)) {
          pill.className += " qx-mode-nta";
          pill.textContent = "NTA FORMAT · Realistic Mock";
        } else if (/test series|neet 2027 test/.test(t)) {
          pill.className += " qx-mode-nta";
          pill.textContent = "NTA FORMAT · Test Series";
        } else if (/teacher/.test(t)) {
          return;
        } else {
          return;
        }
        var body = card.querySelector(".mth-body") || card;
        body.appendChild(pill);
      });

      page.querySelectorAll(".mts-card, .mts-jeemain").forEach(function (card) {
        if (card.querySelector(".qx-mode-pill")) return;
        var pill = document.createElement("span");
        pill.className = "qx-mode-pill qx-mode-nta";
        pill.textContent = "NTA FORMAT · official exam chrome (Quantrex layout optional)";
        var body = card.querySelector(".mts-body") || card;
        body.appendChild(pill);
      });
    }
    run();
    if (!global.__qxTestsLegendObs) {
      global.__qxTestsLegendObs = true;
      var mo = new MutationObserver(function () {
        if (document.querySelector(".marks-tests-page")) run();
      });
      try {
        mo.observe(document.getElementById("app-main") || document.body, {
          childList: true,
          subtree: true
        });
      } catch (_) { /* */ }
    }
  }

  function enhanceFormatChooser() {
    function run() {
      var root = document.getElementById("tsFormatChooser");
      if (!root || root.getAttribute("data-qx-enhanced")) return;
      root.setAttribute("data-qx-enhanced", "1");
      var qx = root.querySelector("#tsFmtQuantrex .ts-fmt-opt-body");
      var nta = root.querySelector("#tsFmtQuizrr .ts-fmt-opt-body");
      if (qx) {
        var s = qx.querySelector("span");
        var st = qx.querySelector("strong");
        if (st) st.textContent = "QUANTREX FORMAT";
        if (s) s.textContent = "Flexible practice UI · not the official NTA shell";
      }
      if (nta) {
        var s2 = nta.querySelector("span");
        var st2 = nta.querySelector("strong");
        if (st2) st2.textContent = "NTA FORMAT";
        if (s2)
          s2.textContent =
            "Exact official exam shell · palette · timer · Save & Next";
      }
      var hint = root.querySelector(".ts-fmt-hint");
      if (hint) {
        hint.textContent =
          "Test Series defaults to NTA FORMAT (Marks/ExamGoal). Pick QUANTREX FORMAT only if you want the flexible practice layout.";
      }
    }
    run();
    if (!global.__qxFmtChooserObs) {
      global.__qxFmtChooserObs = true;
      document.addEventListener(
        "click",
        function () {
          setTimeout(run, 50);
        },
        true
      );
      var mo = new MutationObserver(run);
      try {
        mo.observe(document.body, { childList: true, subtree: true });
      } catch (_) { /* */ }
    }
  }

  function enhancePyqModeBadges() {
    function run() {
      var modal = document.getElementById("pyqPracticeModal");
      if (!modal || modal.getAttribute("data-qx-fmt")) return;
      var badge = modal.querySelector(".eg-cfg-badge");
      if (!badge) return;
      modal.setAttribute("data-qx-fmt", "1");
      if (badge.classList.contains("test")) {
        badge.textContent = "Test Mode · NTA FORMAT";
        badge.title = "Timed mock uses exact NTA CBT shell";
      } else {
        badge.textContent = "Practice Mode · QUANTREX FORMAT";
        badge.title = "Flexible practice UI with solutions";
      }
    }
    run();
    if (!global.__qxPyqBadgeObs) {
      global.__qxPyqBadgeObs = true;
      var mo = new MutationObserver(run);
      try {
        mo.observe(document.body, { childList: true, subtree: true });
      } catch (_) { /* */ }
    }
  }

  function bindTestToolsCapture() {
    if (global.__qxToolCap) return;
    global.__qxToolCap = true;
    // qxmd111: never blanket-stopPropagation on .qzrr-tool-btn — that killed
    // View Settings / Instructions / Question Paper onclick from bindQuizrrChrome.
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest && e.target.closest(
        "#qzrrA11yBtn, #qzrrInstrBtn, #qzrrPaperBtn, #qzrrPaperChipBtn, " +
        "#mtkFontDown, #mtkFontUp, #mtkFontDownHdr, #mtkFontUpHdr, " +
        ".qzrr-zoom-circle, .qzrr-top-zoom-fab, [data-qzrr-zoom], " +
        "#egFmtBtn, #mtkThemeBtn, #egMenuBtn, #egFullBtn, #qzrrSideToggle, #qzrrPalClose, #mtkPalClose"
      );
      if (!t) return;
      var id = t.id || "";
      try {
        if (id === "qzrrA11yBtn") {
          e.preventDefault();
          e.stopPropagation();
          if (typeof window.qxOpenQzrrA11y === "function") window.qxOpenQzrrA11y(e);
          return;
        }
        if (id === "qzrrInstrBtn") {
          e.preventDefault();
          e.stopPropagation();
          if (typeof window.qxOpenQzrrInstr === "function") window.qxOpenQzrrInstr(e);
          return;
        }
        if (id === "qzrrPaperBtn" || id === "qzrrPaperChipBtn") {
          e.preventDefault();
          e.stopPropagation();
          if (typeof window.qxOpenQzrrPaper === "function") window.qxOpenQzrrPaper(e);
          return;
        }
        // Font A+/- handled by test-engine _qxZoomClickBound — avoid double-scale
        if (id === "mtkFontDown" || id === "mtkFontUp" || id === "mtkFontDownHdr" || id === "mtkFontUpHdr" ||
            (t.classList && t.classList.contains("mtk-font-btn"))) {
          return;
        }
        if ((t.classList.contains("qzrr-zoom-circle") || t.getAttribute("data-qzrr-zoom")) && typeof bumpTestZoom === "function") {
          e.preventDefault();
          e.stopPropagation();
          var d = parseInt(t.getAttribute("data-qzrr-zoom") || (/\+|plus|in/i.test(t.id + t.className) ? "1" : "-1"), 10);
          bumpTestZoom(d);
          if (typeof applyTestZoomToDom === "function") applyTestZoomToDom(typeof getTestZoom === "function" ? getTestZoom() : 1);
        }
      } catch (_) { /* */ }
    }, true);
  }

  function init() {
    wrapStartTest();
    syncQuestionFullscreen();
    hideUpdateBarInCbt();
    ensureCbtFontChip();
    enhanceTestsEntry();
    enhanceFormatChooser();
    enhancePyqModeBadges();
    bindTestToolsCapture();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.QxCbtUx = {
    version: VERSION,
    normalizeConfig: normalizeConfig,
    FORMAT_KEY: FORMAT_KEY,
    syncQuestionFullscreen: syncQuestionFullscreen,
    init: init
  };
})(typeof window !== "undefined" ? window : this);

/* qxmd111Capture: NTA toolbar openers + submit backup (idempotent) */
(function qxmd111Capture() {
  if (window.__qxmd111Capture) return;
  window.__qxmd111Capture = true;
  document.addEventListener("click", function (ev) {
    try {
      var t = ev.target && ev.target.closest
        ? ev.target.closest("#qzrrA11yBtn,#qzrrInstrBtn,#qzrrPaperBtn,#qzrrPaperChipBtn,#mtkExitBtn,#qxSubmitBtn,#qxSubmitTop,[data-qx-exit='1']")
        : null;
      if (!t) return;
      var id = t.id || "";
      if (id === "qzrrA11yBtn" && typeof window.qxOpenQzrrA11y === "function") {
        if (!ev.defaultPrevented) { ev.preventDefault(); window.qxOpenQzrrA11y(ev); }
        return;
      }
      if (id === "qzrrInstrBtn" && typeof window.qxOpenQzrrInstr === "function") {
        if (!ev.defaultPrevented) { ev.preventDefault(); window.qxOpenQzrrInstr(ev); }
        return;
      }
      if ((id === "qzrrPaperBtn" || id === "qzrrPaperChipBtn") && typeof window.qxOpenQzrrPaper === "function") {
        if (!ev.defaultPrevented) { ev.preventDefault(); window.qxOpenQzrrPaper(ev); }
        return;
      }
      if ((id === "qxSubmitBtn" || id === "qxSubmitTop") && typeof window.qxSubmitTest === "function") {
        if (!t.__qxmd111Bound) {
          t.__qxmd111Bound = true;
          t.addEventListener("click", function (e) {
            try {
              if (e) { e.preventDefault(); e.stopPropagation(); }
              window.qxSubmitTest();
            } catch (_) {}
          }, true);
        }
      }
    } catch (_) {}
  }, true);
})();
