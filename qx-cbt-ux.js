/**
 * Quantrex CBT UX — dual format enforcement + mobile Tests entry labels
 * QUANTREX FORMAT (examgoal/Allen practice) = flexible Practice
 * NTA FORMAT (quizrr) = exact Marks/ExamGoal NTA shell for Mock / Test Series / PYQ Mock
 * Additive only. No payment / bank changes.
 */
(function (global) {
  "use strict";

  var VERSION = "qxcbt1";
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
    if (/series|pyqmock|pyq|mock|full.?test|part.?test/i.test(tt)) return true;
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

    // 2) PYQ Mock Test (timed) → always NTA FORMAT (exact quizrr shell)
    if (/^pyqmock$/i.test(tt)) {
      cfg.uiMode = "quizrr";
      cfg._qxFormat = "nta";
      return cfg;
    }

    // 3) Explicit chooser / caller
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
      // Test Series Quantrex layout choice
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

  function init() {
    wrapStartTest();
    hideUpdateBarInCbt();
    ensureCbtFontChip();
    enhanceTestsEntry();
    enhanceFormatChooser();
    enhancePyqModeBadges();
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
    init: init
  };
})(typeof window !== "undefined" ? window : this);
