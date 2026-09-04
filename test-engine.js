// Quantrex Test Engine — MARKS-style exam simulation (sections, fullscreen, countdown)

function getTestMountEl() {
  const appMain = document.getElementById("app-main");
  if (appMain) return appMain;
  return document.getElementById("ts-root");
}
window.getTestMountEl = getTestMountEl;

function getTestTheme() {
  // ExamGOAL chrome: independent of website theme. Default LIGHT (ss 972).
  try {
    const t = localStorage.getItem("quantrex_test_theme");
    if (t === "light" || t === "dark") return t;
  } catch (_) { /* */ }
  return "light";
}

function setTestTheme(mode) {
  const m = mode === "dark" ? "dark" : "light";
  try { localStorage.setItem("quantrex_test_theme", m); } catch (_) { /* */ }
  document.documentElement.setAttribute("data-test-theme", m);
  document.querySelectorAll(".mtk-test-root, .eg-test-root").forEach(root => {
    root.setAttribute("data-test-theme", m);
    root.classList.toggle("qzrr-dark", m === "dark");
  });
  document.body.classList.toggle("qx-test-light", m === "light");
  document.body.classList.toggle("qx-test-dark", m === "dark");
  document.querySelectorAll(".mtk-theme-lbl").forEach(el => {
    el.textContent = m === "light" ? "Light" : "Dark";
  });
}
window.setTestTheme = setTestTheme;

function toggleTestTheme() {
  setTestTheme(getTestTheme() === "dark" ? "light" : "dark");
  try {
    if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.refresh) {
      QuantrexTestEngine.refresh();
    }
  } catch (_) { /* */ }
}
window.toggleTestTheme = toggleTestTheme;

const TEST_FONT_ORDER = ["small", "medium", "large", "xlarge"];
const TEST_FONT_LABELS = { small: "Standard", medium: "Medium", large: "Large", xlarge: "Extra Large" };
// Shared key — Test Series + PYQ + Digital Books + all question UIs
const TEST_FONT_KEY = "quantrex_test_font";
// Continuous zoom for practice / CBT reading (best-practice range)
const TEST_ZOOM_KEY = "quantrex_content_zoom";
const TEST_ZOOM_MIN = 0.5;
const TEST_ZOOM_MAX = 3.0;
const TEST_ZOOM_STEP = 0.05;

function getTestZoom() {
  let z = parseFloat(localStorage.getItem(TEST_ZOOM_KEY) || "1");
  if (!Number.isFinite(z)) z = 1;
  return Math.max(TEST_ZOOM_MIN, Math.min(TEST_ZOOM_MAX, z));
}

function applyTestZoomToDom(zoom) {
  const z = Math.max(TEST_ZOOM_MIN, Math.min(TEST_ZOOM_MAX, Number(zoom) || 1));
  const pct = Math.round(z * 100) + "%";
  try {
    document.documentElement.style.setProperty("--qx-content-zoom", String(z));
    document.documentElement.setAttribute("data-content-zoom", String(z));
    if (document.body) {
      document.body.style.setProperty("--qx-content-zoom", String(z));
      document.body.setAttribute("data-content-zoom", String(z));
    }
  } catch (_) { /* */ }
  // Clear nested zoom (was applied to both parent + stem → clip + broken scroll)
  document.querySelectorAll(".mtk-q-text, .mtk-opt-text, .qx-prac-q, .eg-q-stem, .qzrr-main-col, .qzrr-zoom-target").forEach((el) => {
    try { el.style.zoom = ""; } catch (_) { /* */ }
  });
  const hosts = document.querySelectorAll(
    ".eg-test-root .eg-q-card, .mtk-test-root:not(.eg-test-root) .mtk-main, " +
    ".qzrr-cbt .qzrr-q-area, .qzrr-cbt #qzrrQArea, .qx-practice-page .qx-prac-body, .qx-prac-zoom-host"
  );
  const seen = new Set();
  hosts.forEach((el) => {
    if (!el || seen.has(el)) return;
    let p = el.parentElement;
    let nested = false;
    while (p) {
      if (seen.has(p)) { nested = true; break; }
      p = p.parentElement;
    }
    if (nested) return;
    seen.add(el);
    try { el.style.zoom = String(z); } catch (_) { /* */ }
  });
  try {
    document.querySelectorAll(".mtk-test-root, .qx-practice-page, .qzrr-cbt, .eg-test-root").forEach((el) => {
      el.style.setProperty("--qx-content-zoom", String(z));
    });
  } catch (_) { /* */ }
  document.querySelectorAll(
    "#pracZoomLbl, .qx-zoom-lbl, #mtkZoomLbl, #qzrrZoomLbl, #qzrrZoomLblSide, #qzrrA11yZoomLbl"
  ).forEach((lbl) => {
    lbl.textContent = pct;
  });
  return z;
}

function setTestZoom(zoom) {
  const z = applyTestZoomToDom(zoom);
  try { localStorage.setItem(TEST_ZOOM_KEY, String(z)); } catch (_) { /* */ }
  return z;
}

function bumpTestZoom(deltaSteps) {
  const step = Number(deltaSteps) || 0;
  const cur = getTestZoom();
  const next = Math.round((cur + step * TEST_ZOOM_STEP) * 100) / 100;
  return setTestZoom(next);
}

window.getTestZoom = getTestZoom;
window.setTestZoom = setTestZoom;
window.bumpTestZoom = bumpTestZoom;
window.applyTestZoomToDom = applyTestZoomToDom;

function getTestFontScale() {
  // Default medium = balanced beauty scale (not oversized math)
  let v = localStorage.getItem(TEST_FONT_KEY) || "medium";
  // One-time migrate: old xlarge default felt huge after typography redesign
  try {
    if (!localStorage.getItem("quantrex_font_beauty_v1") && v === "xlarge") {
      v = "medium";
      localStorage.setItem(TEST_FONT_KEY, "medium");
    }
    localStorage.setItem("quantrex_font_beauty_v1", "1");
  } catch (_) { /* */ }
  return TEST_FONT_ORDER.includes(v) ? v : "medium";
}

function applyTestFontScaleToDom(scale) {
  const s = TEST_FONT_ORDER.includes(scale) ? scale : "medium";
  // Global: every question surface reads this (PYQ, books, tests, practice)
  try {
    document.documentElement.setAttribute("data-font-scale", s);
    if (document.body) document.body.setAttribute("data-font-scale", s);
  } catch (_) { /* */ }
  document.querySelectorAll(
    ".mtk-test-root, .qx-practice-page, .qx-prac-q-wrap, .marks-result, #app-main.qx-font-host, .qx-font-host, .eg-test-root"
  ).forEach(el => el.setAttribute("data-font-scale", s));
  const lblText = TEST_FONT_LABELS[s] || "Medium";
  document.querySelectorAll("#mtkFontLbl, .mtk-font-lbl, #qxFontLbl, .qx-font-lbl").forEach(lbl => {
    lbl.textContent = lblText;
  });
  const short = { small: "S", medium: "M", large: "L", xlarge: "XL" };
  document.querySelectorAll("#mtkPalFontLbl, .mtk-pal-scale").forEach(lbl => {
    lbl.textContent = short[s] || "M";
  });
  document.querySelectorAll(".mtk-font-preset, .qx-font-preset, .qx-prac-size-btn").forEach(btn => {
    const sc = btn.dataset.scale;
    if (sc) btn.classList.toggle("on", sc === s);
  });
  return s;
}

function setTestFontScale(scale) {
  const s = applyTestFontScaleToDom(scale);
  localStorage.setItem(TEST_FONT_KEY, s);
  return s;
}

function bumpTestFont(delta) {
  const cur = getTestFontScale();
  const idx = TEST_FONT_ORDER.indexOf(cur);
  const next = TEST_FONT_ORDER[Math.max(0, Math.min(TEST_FONT_ORDER.length - 1, idx + delta))];
  setTestFontScale(next);
  return next;
}

/** Call after any question HTML mounts (practice / books / PYQ / CBT). */
function syncQuestionFontScale(root) {
  const s = getTestFontScale();
  if (root && root.setAttribute) root.setAttribute("data-font-scale", s);
  applyTestFontScaleToDom(s);
  applyTestZoomToDom(getTestZoom());
  return s;
}

window.getTestFontScale = getTestFontScale;
window.setTestFontScale = setTestFontScale;
window.bumpTestFont = bumpTestFont;
window.syncQuestionFontScale = syncQuestionFontScale;
window.applyTestFontScaleToDom = applyTestFontScaleToDom;

/* Capture-phase so PYQ mock A−/A+ and zoom ± survive innerHTML repaint. */
if (!window._qxZoomClickBound) {
  window._qxZoomClickBound = true;
  document.addEventListener("click", function (e) {
    const t = e.target && e.target.closest
      ? e.target.closest(
        "#qzrrZoomOutTop, #qzrrZoomOutSide, #qzrrZoomInTop, #qzrrZoomInSide, " +
        "#egZoomOut, #egZoomIn, #egZoomOutHdr, #egZoomInHdr, " +
        ".qzrr-zoom-circle, #mtkFontDown, #mtkFontUp, #mtkFontDownHdr, #mtkFontUpHdr, " +
        ".mtk-font-btn, .qx-font-btn, [data-qzrr-zoom], #qxFcZoomIn, #qxFcZoomOut"
      )
      : null;
    if (!t) return;
    if (t.closest && t.closest(".qzrr-a11y-popover") && t.getAttribute("data-qzrr-zoom") == null
      && !t.classList.contains("qzrr-zoom-circle")) return;
    const id = t.id || "";
    const isFont = t.classList.contains("mtk-font-btn") || t.classList.contains("qx-font-btn")
      || /mtkFont/.test(id);
    const isPlus = t.classList.contains("qzrr-zoom-circle-plus") || /In|Up/i.test(id)
      || t.getAttribute("data-qzrr-zoom") === "1";
    const isMinus = t.classList.contains("qzrr-zoom-circle") && !isPlus
      || /Out|Down/i.test(id)
      || t.getAttribute("data-qzrr-zoom") === "-1";
    if (!isFont && !isPlus && !isMinus && !t.hasAttribute("data-qzrr-zoom")) return;
    e.preventDefault();
    e.stopPropagation();
    if (isFont) {
      bumpTestFont(/Down/i.test(id) || /A−|A-/.test(t.textContent || "") ? -1 : 1);
      applyTestZoomToDom(getTestZoom());
      return;
    }
    if (t.hasAttribute("data-qzrr-zoom")) {
      bumpTestZoom(parseInt(t.getAttribute("data-qzrr-zoom"), 10) * 2);
    } else if (isMinus) {
      bumpTestZoom(-2);
    } else {
      bumpTestZoom(2);
    }
    applyTestZoomToDom(getTestZoom());
  }, true);
}

if (!window._qxEgHdrBound) {
  window._qxEgHdrBound = true;
  document.addEventListener("click", function (e) {
    const t = e.target && e.target.closest
      ? e.target.closest("#egFullBtn, #egStarBtn, #egQStar, #egFmtBtn, #egMenuBtn, #mtkThemeBtn, #egPlusBtn")
      : null;
    if (!t) return;
    const root = t.closest(".eg-test-root") || t.closest(".mtk-test-root") || document;
    const id = t.id || "";
    e.preventDefault();
    e.stopPropagation();
    if (id === "mtkThemeBtn") {
      if (typeof toggleTestTheme === "function") toggleTestTheme();
      return;
    }
    if (id === "egFullBtn") {
      const el = document.querySelector(".eg-test-root") || document.documentElement;
      try {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          (el.requestFullscreen || el.webkitRequestFullscreen || document.documentElement.requestFullscreen).call(el);
        } else {
          (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        }
      } catch (_) { /* */ }
      return;
    }
    if (id === "egStarBtn" || id === "egQStar") {
      let qid = null;
      try {
        if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.getSession) {
          const sess = QuantrexTestEngine.getSession();
          if (sess && sess.ids) qid = sess.ids[sess.idx];
        }
      } catch (_) { /* */ }
      if (qid != null && typeof toggleBm === "function") toggleBm(qid);
      return;
    }
    if (id === "egPlusBtn") {
      let qid = null;
      try {
        if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.getSession) {
          const sess = QuantrexTestEngine.getSession();
          if (sess && sess.ids) qid = sess.ids[sess.idx];
        }
      } catch (_) { /* */ }
      if (qid != null && typeof toggleBmWithGroup === "function") toggleBmWithGroup(qid);
      return;
    }
    if (id === "egMenuBtn") {
      if (root.classList) {
        const collapsed = !root.classList.contains("eg-side-collapsed");
        root.classList.toggle("eg-side-collapsed", collapsed);
        root.classList.toggle("eg-side-open", !collapsed);
        t.classList.toggle("on", collapsed);
      }
      return;
    }
    if (id === "egFmtBtn") {
      let pop = document.getElementById("egFmtPop");
      if (pop) { pop.remove(); return; }
      pop = document.createElement("div");
      pop.id = "egFmtPop";
      pop.className = "eg-fmt-pop";
      const cur = (typeof getTestFontScale === "function" && getTestFontScale()) || "medium";
      pop.innerHTML = "<h5>Text size</h5><div class=\"eg-fmt-row\">" +
        ["small", "medium", "large", "xlarge"].map(function (s) {
          return '<button type="button" class="eg-scale' + (cur === s ? " on" : "") + '" data-eg-scale="' + s + '">' +
            (s === "small" ? "S" : s === "medium" ? "M" : s === "large" ? "L" : "XL") + "</button>";
        }).join("") +
        "</div><h5>Zoom</h5><div class=\"eg-fmt-row\">" +
        '<button type="button" id="egZoomOut" class="qzrr-zoom-circle" data-qzrr-zoom="-1">−</button>' +
        '<button type="button" id="egZoomIn" class="qzrr-zoom-circle qzrr-zoom-circle-plus" data-qzrr-zoom="1">+</button></div>';
      (root.appendChild ? root : document.body).appendChild(pop);
      pop.querySelectorAll("[data-eg-scale]").forEach(function (b) {
        b.onclick = function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (typeof setTestFontScale === "function") setTestFontScale(b.getAttribute("data-eg-scale"));
          pop.querySelectorAll(".eg-scale").forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
        };
      });
    }
  }, true);
}

function tsTestLoadingHtml() {
  return `<div class="mtk-test-root allen-cbt ts-test-loading" style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f7fb;color:#1a2b4a;font-size:17px;font-family:Inter,sans-serif">Loading questions…</div>`;
}

const QuantrexTestEngine = (() => {
  const SCORING = {
    jee: { correct: 4, wrong: -1, unattempted: 0 },
    neet: { correct: 4, wrong: -1, unattempted: 0 },
    practice: { correct: 1, wrong: 0, unattempted: 0 }
  };

  const JEE_SECTION_SPEC = [
    { subject: "Mathematics", sc: 20, num: 5, labels: ["Mathematics Single Correct", "Mathematics Numerical"], shorts: ["MATHEMATICS SINGLE CORRECT", "MATHEMATICS NUMERICAL"] },
    { subject: "Physics", sc: 20, num: 5, labels: ["Physics Single Correct", "Physics Numerical"], shorts: ["PHYSICS SINGLE CORRECT", "PHYSICS NUMERICAL"] },
    { subject: "Chemistry", sc: 20, num: 5, labels: ["Chemistry Single Correct", "Chemistry Numerical"], shorts: ["CHEMISTRY SINGLE CORRECT", "CHEMISTRY NUMERICAL"] }
  ];

  let session = null;
  let timerHandle = null;
  let onTick = null;

  function defaultScoring(exam) {
    if (exam === "Medical") return SCORING.neet;
    if (exam === "Engineering") return SCORING.jee;
    return SCORING.practice;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }

  function formatMarksTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const totalM = Math.floor(s / 60);
    const r = s % 60;
    return `${totalM}m ${r}s`;
  }

  /** Quizrr / NTA style: 63:54 or 1:05:03 */
  function formatQuizrrTime(sec) {
    const s = Math.max(0, Math.floor(sec == null ? 0 : sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(r).padStart(2, "0");
    if (h > 0) return `${h}:${mm}:${ss}`;
    return `${m}:${ss}`;
  }

  function stopTimer() {
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
  }

  function startTimer() {
    stopTimer();
    if (!session || session.practiceMode) return;
    if (session.durationSec == null || session.durationSec <= 0) return;
    timerHandle = setInterval(() => {
      if (!session || session.submitted || session.practiceMode) return;
      if (session.durationSec == null || session.durationSec <= 0) return;
      session.remainingSec -= 1;
      if (session.remainingSec <= 0) {
        session.remainingSec = 0;
        stopTimer();
        showToast("⏱️ Time's up! Submitting your test…");
        submit(true);
        return;
      }
      if (typeof onTick === "function") onTick(session.remainingSec);
      updateTimerEl();
      if (session.persistKey && session.remainingSec % 10 === 0) marksPersistSession();
    }, 1000);
    updateTimerEl();
  }

  function updateTimerEl() {
    if (!session) return;
    const el = document.getElementById("qxTimer");
    if (!el) return;
    const eg = session.uiMode === "examgoal"
      || (typeof ExamgoalTestUI !== "undefined" && ExamgoalTestUI.isExamgoalUi(session))
      || (el.classList && el.classList.contains("eg-timer"));
    if (eg) {
      const s = Math.max(0, Math.floor(session.remainingSec == null ? 0 : session.remainingSec));
      const h = Math.floor(s / 3600);
      const mi = Math.floor((s % 3600) / 60);
      const r = s % 60;
      el.textContent = String(h).padStart(2, "0") + ":" + String(mi).padStart(2, "0") + ":" + String(r).padStart(2, "0");
    } else if (session.uiMode === "quizrr") {
      el.textContent = formatQuizrrTime(session.remainingSec);
    } else if (session.marksMode) {
      el.innerHTML = `<span class="mtk-timer-ic">🕐</span>${formatMarksTime(session.remainingSec)}`;
    } else {
      el.textContent = formatTime(session.remainingSec);
    }
    el.classList.toggle("warn", session.remainingSec <= 300);
    el.classList.toggle("danger", session.remainingSec <= 60);
  }

  function hasAnswerAt(i) {
    if (!session) return false;
    const a = session.answers[i];
    if (a === undefined) return false;
    const q = getQ(session.ids[i]);
    if (q && typeof QuantrexQFormat !== "undefined") return QuantrexQFormat.isAnswered(q, a);
    if (Array.isArray(a)) return a.length > 0;
    return String(a).trim() !== "";
  }

  function paletteStatus(i) {
    if (!session) return "unvisited";
    if (typeof ExamgoalTestUI !== "undefined" && ExamgoalTestUI.isExamgoalUi(session) && ExamgoalTestUI.paletteStatus) {
      return ExamgoalTestUI.paletteStatus(session, i, { hasAnswerAt });
    }
    const hasAns = hasAnswerAt(i);
    const isRev = session.review.has(i);
    const visited = session.visited.has(i);
    // Quizrr / Marks NTA palette: green answered, red not-answered, purple review
    if (session.marksMode || session.uiMode === "quizrr") {
      if (isRev && hasAns) return "rev-ans";
      if (isRev && !hasAns) return "rev-skip";
      if (hasAns) return "answered";
      if (visited) return "not-answered";
      return "unvisited";
    }
    if (isRev) return "review";
    if (hasAns) return "answered";
    if (visited) return "skipped";
    return "unvisited";
  }

  function stats() {
    if (!session) return { answered: 0, review: 0, skipped: 0, unvisited: 0, total: 0 };
    const total = session.ids.length;
    let answered = 0, review = 0, skipped = 0, revAns = 0, revSkip = 0;
    for (let i = 0; i < total; i++) {
      const hasAns = hasAnswerAt(i);
      const isRev = session.review.has(i);
      if (hasAns) answered++;
      if (isRev) {
        review++;
        if (hasAns) revAns++; else revSkip++;
      } else if (session.visited.has(i) && !hasAns) skipped++;
    }
    return {
      answered, review, skipped, unvisited: total - answered - skipped,
      revAns, revSkip, total
    };
  }

  function htmlContent(text) {
    if (typeof Mx === "undefined") return text;
    // Always full math+spacing path (questions, options, solutions everywhere)
    return Mx.html(text);
  }

  function pinQuestionDiagrams(q) {
    if (!q || q.id == null || typeof QxImgClean === "undefined") return;
    if (QxImgClean.rememberQuestionRaw) QxImgClean.rememberQuestionRaw(q);
    else if (QxImgClean.pinQuestionHtml) {
      QxImgClean.pinQuestionHtml(q.id, q.q);
      (q.options || []).forEach((o, i) => QxImgClean.pinQuestionHtml(q.id + ":opt:" + i, o));
    }
  }

  function finalizeDiagrams(main) {
    if (!main) return;
    let q = null;
    try {
      q = session && typeof getQ === "function" ? getQ(session.ids[session.idx]) : null;
      if (q && typeof QxImgClean !== "undefined" && QxImgClean.finalizeAll) QxImgClean.finalizeAll(main, q);
    } catch (_) { /* */ }
    try { fixRowFigures(main, q); } catch (_) { /* */ }
  }

  function marksNativeHtmlFn(q) {
    // Black Book / digital books: full Mx.html for correct math + spacing
    // (htmlMarksNative now delegates to html — keep call for figure-friendly clean)
    if (typeof QxImgClean !== "undefined" && QxImgClean.isMarksNativeBook && QxImgClean.isMarksNativeBook(q)
      && typeof Mx !== "undefined" && Mx.htmlMarksNative) {
      return Mx.htmlMarksNative;
    }
    return htmlContent;
  }

  function renderQuestionText(q, textReady) {
    const stem = String((q && q.q) || "");
    const stemPlain = stem.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    // Show bank stem immediately when we have real text (never blank white screen)
    if (!textReady && stemPlain.length < 4 && !/<img\b/i.test(stem)) {
      return '<div class="empty mtk-q-loading">Loading question...</div>';
    }
    if (!(typeof QxImgClean !== "undefined" && QxImgClean.isMarksNativeBook && QxImgClean.isMarksNativeBook(q))) {
      pinQuestionDiagrams(q);
    }
    const renderFn = marksNativeHtmlFn(q);
    if (typeof QxImgClean !== "undefined" && QxImgClean.buildQuestionBodyHtml) {
      try { if (QxImgClean.pinOriginalQuestion) QxImgClean.pinOriginalQuestion(q); } catch (_) { /* */ }
      const stemSrc = QxImgClean.bestStemHtml ? QxImgClean.bestStemHtml(q, q.q) : (q._qxOrigStem || q._qxBankQ || q.q);
      return QxImgClean.buildQuestionBodyHtml(q.id, stemSrc, renderFn, q);
    }
    return `<div class="mtk-q-text qx-content" data-qx-qid="${q.id}">${renderFn(q.q)}</div>`;
  }

  /** True when this Q must show integer keypad (type OR current NUM section) */
  function isCurrentNumericalUI(q) {
    if (!q) return false;
    try {
      if (session && session.sections && session.sections.length) {
        const sec = session.sections[currentSectionIdx()];
        if (sec && (sec.type === "NUM" || /numerical/i.test(String(sec.label || "")))) return true;
      }
    } catch (_) { /* */ }
    if (typeof isNumericalQuestion === "function" && isNumericalQuestion(q)) return true;
    if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType
      && QuantrexQFormat.getType(q) === "numerical") return true;
    return false;
  }

  function renderNumericalOptsHtml(q, selected) {
    const val = selected != null && typeof selected !== "object" ? String(selected) : "";
    if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.renderNumericalEntry) {
      return QuantrexQFormat.renderNumericalEntry(val, { cbt: true, label: "Enter integer answer" });
    }
    const esc = val.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    return `<div class="mtk-numerical mtk-numerical-wrap" style="display:flex!important;justify-content:center;padding:12px;width:100%">
      <div class="qx-num-entry qx-num-panel" style="max-width:220px;width:100%;padding:12px;border:1px solid #cbd5e1;border-radius:10px;background:#fff">
        <input type="text" class="qx-num-input" id="qxNumInput" inputmode="decimal" autocomplete="off"
          value="${esc}" style="display:block;width:100%;max-width:132px;min-height:40px;margin:0 auto;padding:8px;border:2px solid #1e3a8a;border-radius:8px;font-size:18px;font-weight:700;text-align:center">
        <div class="qx-num-keypad" id="qxNumKeypad" style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;max-width:196px;margin:0 auto">
          <button type="button" class="qx-num-key" data-num-key="7" style="padding:12px;border:1px solid #94a3b8;border-radius:6px;background:#fff;font-weight:700">7</button>
          <button type="button" class="qx-num-key" data-num-key="8" style="padding:12px;border:1px solid #94a3b8;border-radius:6px;background:#fff;font-weight:700">8</button>
          <button type="button" class="qx-num-key" data-num-key="9" style="padding:12px;border:1px solid #94a3b8;border-radius:6px;background:#fff;font-weight:700">9</button>
          <button type="button" class="qx-num-key" data-num-key="4" style="padding:12px;border:1px solid #94a3b8;border-radius:6px;background:#fff;font-weight:700">4</button>
          <button type="button" class="qx-num-key" data-num-key="5" style="padding:12px;border:1px solid #94a3b8;border-radius:6px;background:#fff;font-weight:700">5</button>
          <button type="button" class="qx-num-key" data-num-key="6" style="padding:12px;border:1px solid #94a3b8;border-radius:6px;background:#fff;font-weight:700">6</button>
          <button type="button" class="qx-num-key" data-num-key="1" style="padding:12px;border:1px solid #94a3b8;border-radius:6px;background:#fff;font-weight:700">1</button>
          <button type="button" class="qx-num-key" data-num-key="2" style="padding:12px;border:1px solid #94a3b8;border-radius:6px;background:#fff;font-weight:700">2</button>
          <button type="button" class="qx-num-key" data-num-key="3" style="padding:12px;border:1px solid #94a3b8;border-radius:6px;background:#fff;font-weight:700">3</button>
          <button type="button" class="qx-num-key" data-num-key="-" style="padding:12px;border:1px solid #94a3b8;border-radius:6px;background:#fff;font-weight:700">−</button>
          <button type="button" class="qx-num-key" data-num-key="0" style="padding:12px;border:1px solid #94a3b8;border-radius:6px;background:#fff;font-weight:700">0</button>
          <button type="button" class="qx-num-key" data-num-key="." style="padding:12px;border:1px solid #94a3b8;border-radius:6px;background:#fff;font-weight:700">.</button>
          <button type="button" class="qx-num-key" data-num-key="back" style="grid-column:1/-1;padding:10px;border:1px solid #94a3b8;border-radius:6px;background:#f1f5f9;font-weight:700">⌫ Backspace</button>
          <button type="button" class="qx-num-key" data-num-key="clear" style="grid-column:1/-1;padding:10px;border:1px solid #fecaca;border-radius:6px;background:#fef2f2;color:#dc2626;font-weight:700">Clear All</button>
        </div>
      </div>
    </div>`;
  }

  function renderOptsHtml(q, selected) {
    try {
      if (typeof qxSyncOptsFromBank === "function") qxSyncOptsFromBank(q);
    } catch (_) { /* */ }
    try {
      if (window.QxSoftWm && typeof QxSoftWm.applyIndexToQuestion === "function") {
        QxSoftWm.applyIndexToQuestion(q);
      }
    } catch (_) { /* */ }
    // CRITICAL: never return "" for numerical — that wiped the keypad after patchOptionsOnly
    if (isCurrentNumericalUI(q)) {
      return renderNumericalOptsHtml(q, selected);
    }
    if (typeof QuantrexQFormat !== "undefined") {
      return QuantrexQFormat.renderTestOptions(q, selected, marksNativeHtmlFn(q));
    }
    return (q.options || []).map((o, i) => {
      const letter = String.fromCharCode(65 + i);
      return `<button type="button" class="mtk-opt ${selected === i ? "selected" : ""}" data-opt="${i}">
        <span class="mtk-opt-radio" aria-hidden="true"></span>
        <span class="mtk-opt-letter" aria-hidden="true">${letter}</span>
        <span class="mtk-opt-text qx-content">${htmlContent(o)}</span>
      </button>`;
    }).join("");
  }

  function patchOptionsOnly(main) {
    if (!main || !session) return false;
    const q = getQ(session.ids[session.idx]);
    const optsEl = main.querySelector("#qxOpts");
    if (!q || !optsEl) return false;
    pinQuestionDiagrams(q);
    const numUI = isCurrentNumericalUI(q);
    const optsClass = numUI
      ? "mtk-options mtk-numerical-wrap"
      : (typeof QuantrexQFormat !== "undefined"
        ? QuantrexQFormat.testOptsContainerClass(q)
        : "mtk-options mtk-options-grid");
    optsEl.className = optsClass;
    optsEl.innerHTML = renderOptsHtml(q, session.answers[session.idx]);
    bindEvents(main);
    finalizeDiagrams(main);
    if (typeof Mx !== "undefined") Mx.afterRender(optsEl);
    else finalizeDiagrams(main);
    marksPersistSession();
    return true;
  }

  function patchPaletteCell(main, idx) {
    if (!main || !session || idx == null) return;
    const cell = main.querySelector(`.mtk-pal-cell[data-qidx="${idx}"], .qx-pal-cell[data-qidx="${idx}"], .eg-pal-cell[data-qidx="${idx}"]`);
    if (!cell) return;
    const st = paletteStatus(idx);
    const cur = idx === session.idx;
    const isEg = cell.classList.contains("eg-pal-cell");
    const base = isEg ? "eg-pal-cell mtk-pal-cell" : (cell.classList.contains("mtk-pal-cell") ? "mtk-pal-cell" : "qx-pal-cell");
    cell.className = `${base} ${st}${cur ? " cur" : ""}`;
  }

  function patchAnswerUI(main) {
    if (!main || !session) return false;
    const q = getQ(session.ids[session.idx]);
    if (!q) return false;
    const selected = session.answers[session.idx];
    const multi = isMultiSelectQuestion(q);
    const selectedSet = Array.isArray(selected)
      ? new Set(selected)
      : (selected != null && selected !== "" ? new Set([selected]) : new Set());

    const numInput = main.querySelector("#qxNumInput");
    if (numInput && (typeof QuantrexQFormat === "undefined" || QuantrexQFormat.getType(q) === "numerical")) {
      numInput.value = selected != null ? String(selected) : "";
    }

    main.querySelectorAll("[data-opt]").forEach(btn => {
      const i = parseInt(btn.dataset.opt, 10);
      btn.classList.toggle("selected", selectedSet.has(i));
      btn.classList.toggle("mtk-opt-multi", multi);
      if (multi) btn.setAttribute("aria-pressed", selectedSet.has(i) ? "true" : "false");
    });
    main.querySelectorAll("[data-prac-opt]").forEach(btn => {
      const i = parseInt(btn.dataset.pracOpt, 10);
      btn.classList.toggle("selected", selectedSet.has(i));
      btn.classList.toggle("qx-prac-opt-multi", multi);
    });

    patchPaletteCell(main, session.idx);
    marksPersistSession();
    return true;
  }

  function patchReviewUI(main) {
    if (!main || !session) return false;
    const isReview = session.review.has(session.idx);
    const reviewBtn = main.querySelector("#qxReviewBtn");
    if (reviewBtn) {
      reviewBtn.classList.toggle("on", isReview);
      reviewBtn.textContent = isReview ? "🔖 Marked" : "🏷️ Mark for Review";
    }
    patchPaletteCell(main, session.idx);
    marksPersistSession();
    return true;
  }

  function currentSectionIdx() {
    if (!session || !session.sections || !session.sections.length) return 0;
    const idx = session.idx;
    let hit = -1;
    // Last matching section wins — if Math range was saved too wide it must not
    // swallow Chemistry/Physics after the user clicks those tabs.
    for (let i = 0; i < session.sections.length; i++) {
      const s = session.sections[i];
      const start = Number(s.start);
      const count = Number(s.count);
      const st = Number.isFinite(start) ? start : 0;
      const ct = Number.isFinite(count) ? count : 0;
      if (ct > 0 && idx >= st && idx < st + ct) hit = i;
    }
    return hit >= 0 ? hit : 0;
  }

  function isSideCollapsed() {
    if (!session) return (typeof window !== "undefined" && window.innerWidth <= 768);
    if (session._sideCollapsed != null) return !!session._sideCollapsed;
    if (session._qzrrSideCollapsed != null) return !!session._qzrrSideCollapsed;
    return (typeof window !== "undefined" && window.innerWidth <= 768);
  }

  function setSideCollapsed(on) {
    if (!session) return;
    session._sideCollapsed = !!on;
    session._qzrrSideCollapsed = !!on;
    const mount = getTestMountEl();
    const host = (mount && (
      mount.querySelector(".mtk-test-root")
      || mount.querySelector(".qx-test-layout")
    )) || mount;
    if (host) {
      host.classList.toggle("mtk-side-collapsed", !!on);
      host.classList.toggle("qzrr-side-collapsed", !!on);
    }
    const handle = document.querySelector("#mtkPalOpen");
    if (handle) {
      handle.textContent = on ? "◀" : "▶";
      handle.title = on ? "Show question panel" : "Hide question panel";
      handle.setAttribute("aria-label", handle.title);
    }
    try { marksPersistSession(); } catch (_) { /* */ }
  }

  function paletteScrollEl(root) {
    if (!root) return null;
    return root.querySelector(".mtk-pal-groups")
      || root.querySelector(".qzrr-side")
      || root.querySelector(".mtk-palette")
      || root.querySelector(".qx-palette");
  }

  /** Scroll a child inside its parent only — never scroll the page to the top. */
  function scrollChildIntoParent(child, parent, opts) {
    if (!child || !parent) return;
    const o = opts || {};
    const c = child.getBoundingClientRect();
    const p = parent.getBoundingClientRect();
    if (!c.width && !c.height) return;
    if (o.axis === "x") {
      if (o.alignStart) parent.scrollLeft += (c.left - p.left) - 6;
      else if (c.left < p.left + 4) parent.scrollLeft += (c.left - p.left) - 8;
      else if (c.right > p.right - 4) parent.scrollLeft += (c.right - p.right) + 8;
      return;
    }
    if (o.alignStart) parent.scrollTop += (c.top - p.top) - 6;
    else if (c.top < p.top + 4) parent.scrollTop += (c.top - p.top) - 8;
    else if (c.bottom > p.bottom - 4) parent.scrollTop += (c.bottom - p.bottom) + 8;
  }

  function capturePaletteNavState(root) {
    if (!session || !root) return;
    const groups = root.querySelector(".mtk-pal-groups");
    const aside = root.querySelector(".mtk-palette, .qzrr-side, .qx-palette");
    const tabs = root.querySelector(".mtk-sec-tabs, .qzrr-sec-tabs");
    if (groups) session._palGroupsScroll = groups.scrollTop;
    if (aside) session._palAsideScroll = aside.scrollTop;
    if (tabs) session._palTabsScroll = tabs.scrollLeft;
  }

  function restorePaletteNavState(root) {
    if (!session || !root) return;
    const pin = session._palPinSection;
    if (pin != null) delete session._palPinSection;
    const apply = () => {
      try {
        const groups = root.querySelector(".mtk-pal-groups");
        const aside = root.querySelector(".mtk-palette, .qzrr-side, .qx-palette");
        const tabs = root.querySelector(".mtk-sec-tabs, .qzrr-sec-tabs");
        const pal = groups || aside;
        if (pin != null) {
          const grp = root.querySelector(`.mtk-pal-group[data-sec="${pin}"], .qzrr-pal-sec[data-sec="${pin}"]`);
          if (grp && pal) scrollChildIntoParent(grp, pal, { alignStart: true });
        } else {
          if (groups && session._palGroupsScroll != null) groups.scrollTop = session._palGroupsScroll;
          if (aside && session._palAsideScroll != null) aside.scrollTop = session._palAsideScroll;
        }
        const cur = root.querySelector(".mtk-pal-cell.cur, .qx-pal-cell.cur, .qzrr-grid-cell.cur");
        if (cur && pal) scrollChildIntoParent(cur, pal, {});
        const activeTab = root.querySelector(".mtk-sec-tab.active, .qzrr-sec-chip.active");
        if (tabs) {
          if (session._palTabsScroll != null && pin == null) tabs.scrollLeft = session._palTabsScroll;
          if (activeTab) scrollChildIntoParent(activeTab, tabs, { axis: "x" });
        }
      } catch (_) { /* */ }
    };
    apply();
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(apply);
  }

  /** Jump to section and keep palette/question in sync (Chem/Phys tabs must not snap back to Math) */
  function goToSection(secIndex) {
    if (!session || !session.sections || !session.sections.length) return;
    const parsed = parseInt(secIndex, 10);
    const i = Math.max(0, Math.min(session.sections.length - 1, Number.isFinite(parsed) ? parsed : 0));
    const sec = session.sections[i];
    if (!sec) return;
    const start = Number.isFinite(Number(sec.start)) ? Number(sec.start) : 0;
    const target = Math.min(Math.max(0, start), Math.max(0, session.ids.length - 1));
    // Tab click always enters that section (first question). Do not keep Math idx.
    session._palPinSection = i;
    goTo(target);
  }

  function sectionColorClass(subject) {
    const s = String(subject || "").toLowerCase();
    if (s.includes("math")) return "mtk-sec-math";
    if (s.includes("phys")) return "mtk-sec-phys";
    if (s.includes("chem")) return "mtk-sec-chem";
    if (s.includes("bot") || s.includes("zoo") || s.includes("bio")) return "mtk-sec-gen";
    return "mtk-sec-gen";
  }

  function renderMarksColorStrip() {
    return `<div class="mtk-color-strip" aria-hidden="true">
      <span class="mtk-strip-seg mtk-strip-math"></span>
      <span class="mtk-strip-seg mtk-strip-phys"></span>
      <span class="mtk-strip-seg mtk-strip-chem"></span>
      <span class="mtk-strip-seg mtk-strip-acc"></span>
    </div>`;
  }

  function renderMarkingBadges(q) {
    if (!session) return "";
    const sc = session.scoring || { correct: 4, wrong: -1, numericalWrong: 0 };
    const isNum = q && (
      (typeof isNumericalQuestion === "function" && isNumericalQuestion(q))
      || (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType && QuantrexQFormat.getType(q) === "numerical")
    );
    const posPts = sc.correct != null ? sc.correct : 4;
    // JEE Main numerical: historically 0 wrong; 2025+ NTA may use -1 — honour scoring.numericalWrong
    let wrongPts = sc.wrong != null ? sc.wrong : -1;
    if (isNum) {
      wrongPts = (sc.numericalWrong != null) ? sc.numericalWrong : 0;
    }
    const pos = posPts > 0 ? `<span class="mtk-pos-mark">+${posPts}</span>` : "";
    const neg = wrongPts < 0 ? `<span class="mtk-neg-mark">${wrongPts}</span>` : "";
    return `${pos}${neg}`;
  }

  function renderMarksSectionTabs() {
    if (!session || !session.sections || session.sections.length < 2) return "";
    const cur = currentSectionIdx();
    // Marks website: Title Case tabs e.g. "Mathematics Single Correct" (not ALL CAPS)
    const tabs = session.sections.map((sec, i) => {
      const cls = sectionColorClass(sec.subject);
      const lab = sec.label || sec.shortLabel || ("Section " + (i + 1));
      return `<button type="button" class="mtk-sec-tab ${cls}${i === cur ? " active" : ""}" data-sec="${i}">${lab}</button>`;
    }).join("");
    return `<div class="mtk-sec-bar">
      <button type="button" class="mtk-sec-nav" id="mtkSecPrev" title="Previous section">‹</button>
      <div class="mtk-sec-tabs">${tabs}</div>
      <button type="button" class="mtk-sec-nav" id="mtkSecNext" title="Next section">›</button>
    </div>`;
  }

  function renderMarksPaletteHead() {
    const scale = getTestFontScale();
    const labels = { small: "S", medium: "M", large: "L", xlarge: "XL" };
    return `<div class="mtk-pal-head-row">
      <strong>Overview</strong>
      <button type="button" class="mtk-pal-close" id="mtkPalClose" title="Hide question panel">✕</button>
    </div>
    <div class="mtk-font-tools">
      <button type="button" class="mtk-font-btn" id="mtkFontDown" title="Decrease text size">A−</button>
      <span class="mtk-pal-scale" id="mtkPalFontLbl">${labels[scale] || "M"}</span>
      <button type="button" class="mtk-font-btn" id="mtkFontUp" title="Increase text size">A+</button>
      <button type="button" class="mtk-font-gear" id="mtkQviewGear" title="Question view settings">⚙</button>
    </div>`;
  }

  function renderMarksPalette() {
    const s = stats();
    const curSec = currentSectionIdx();
    // Marks website: GLOBAL Q numbers across whole paper (1–20 SC, 21–25 NUM, 26–45 Phys…)
    // NOT local 1,2,3 restarting each section. Group headers ALL CAPS.
    let groups = "";
    if (session.sections && session.sections.length) {
      groups = session.sections.map((sec, si) => {
        const cells = [];
        const start = Number.isFinite(Number(sec.start)) ? Number(sec.start) : 0;
        const count = Number.isFinite(Number(sec.count)) ? Number(sec.count) : 0;
        const used = new Set();
        for (let i = start; i < start + count; i++) {
          if (i < 0 || i >= session.ids.length || used.has(i)) continue;
          used.add(i);
          const st = paletteStatus(i);
          const cur = i === session.idx ? " cur" : "";
          const globalN = i + 1;
          cells.push(`<button type="button" class="mtk-pal-cell ${st}${cur}" data-qidx="${i}" title="Q${globalN}">${globalN}</button>`);
        }
        const on = si === curSec ? " active-sec" : "";
        const grpLab = (sec.shortLabel || sec.label || ("Section " + (si + 1))).toString().toUpperCase();
        return `<div class="mtk-pal-group${on}" data-sec="${si}">
          <div class="mtk-pal-grp-label">${grpLab}</div>
          <div class="mtk-pal-grp-grid">${cells.join("")}</div>
        </div>`;
      }).join("");
    } else {
      const cells = session.ids.map((_, i) => {
        const st = paletteStatus(i);
        const cur = i === session.idx ? " cur" : "";
        return `<button type="button" class="mtk-pal-cell ${st}${cur}" data-qidx="${i}">${i + 1}</button>`;
      }).join("");
      groups = `<div class="mtk-pal-grp-grid flat">${cells}</div>`;
    }
    // Marks Overview: big colored number tiles (screenshot 816)
    return `<aside class="mtk-palette">
      ${renderMarksPaletteHead()}
      <div class="mtk-pal-stats mtk-pal-stats-boxes">
        <div class="mtk-stat-box answered">
          <span class="mtk-stat-n">${s.answered}</span>
          <span class="mtk-stat-t"><strong>${s.answered} Qs</strong> Answered</span>
        </div>
        <div class="mtk-stat-box not-answered">
          <span class="mtk-stat-n">${s.skipped}</span>
          <span class="mtk-stat-t"><strong>${s.skipped} Qs</strong> Not Answered</span>
        </div>
        <div class="mtk-stat-box unvisited">
          <span class="mtk-stat-n">${s.unvisited}</span>
          <span class="mtk-stat-t"><strong>${s.unvisited} Qs</strong> Not Visited</span>
        </div>
        <div class="mtk-stat-box rev-skip">
          <span class="mtk-stat-n">${s.revSkip}</span>
          <span class="mtk-stat-t"><strong>${s.revSkip} Qs</strong> Marked For Review</span>
        </div>
        <div class="mtk-stat-box rev-ans mtk-stat-full">
          <span class="mtk-stat-n">${s.revAns}</span>
          <span class="mtk-stat-t"><strong>${s.revAns} Qs</strong> Answered and Marked For Review<br><em>(will be considered for evaluation)</em></span>
        </div>
      </div>
      <div class="mtk-pal-groups">${groups}</div>
      <button type="button" class="mtk-submit-btn" id="qxSubmitBtn">Submit</button>
    </aside>`;
  }

  function renderPalette() {
    if (!session) return "";
    if (session.marksMode) return renderMarksPalette();
    const cells = session.ids.map((_, i) => {
      const st = paletteStatus(i);
      const cur = i === session.idx ? " cur" : "";
      return `<button type="button" class="qx-pal-cell ${st}${cur}" data-qidx="${i}" title="Question ${i + 1}">${i + 1}</button>`;
    }).join("");
    const s = stats();
    return `<aside class="qx-palette">
      <div class="qx-pal-head"><strong>Question Map</strong>
        <button type="button" class="mtk-pal-close" id="mtkPalClose" title="Hide question panel">✕</button>
      </div>
      <div class="qx-pal-legend">
        <span><i class="dot answered"></i>${s.answered} Done</span>
        <span><i class="dot review"></i>${s.review} Review</span>
        <span><i class="dot skipped"></i>${s.skipped} Skipped</span>
        <span><i class="dot unvisited"></i>${s.unvisited} Left</span>
      </div>
      <div class="qx-pal-grid">${cells}</div>
      <button type="button" class="btn-primary qx-submit-btn" id="qxSubmitBtn">Submit Assessment</button>
    </aside>`;
  }

  function renderMarksQuestion() {
    const q = getQ(session.ids[session.idx]);
    if (!q) {
      return `<div class="mtk-test-root" data-test-theme="${getTestTheme()}">
        <header class="mtk-header"><div class="mtk-brand"><span class="mtk-logo mtk-logo-img" aria-hidden="true"><img src="/assets/quantrex-logo-3d-64.png?v=qxfix104" width="28" height="28" alt="" class="qx-ui-brand-logo"></span><span class="mtk-brand-text">Quantrex Academy</span></div></header>
        <div class="mtk-main" style="padding:40px"><div class="empty" style="color:#f87171;font-size:16px">Question not found (id: ${session.ids[session.idx]}). <button type="button" class="mtk-btn mtk-btn-ghost" onclick="if(typeof go==='function')go('tests')">← Back</button></div></div>
      </div>`;
    }
    try {
      if (typeof qxRestoreQuestionContent === "function") qxRestoreQuestionContent(q);
    } catch (_) { /* */ }
    try {
      if (typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion) {
        const optsOk = (q.options || []).some((o) => {
          const t = String(o || "").replace(/<[^>]+>/g, "").trim();
          return (t && t.length > 0 && !/^[A-D]$/i.test(t)) || /<img\b/i.test(String(o || ""));
        });
        if (!q._catalogTried && (!optsOk || /^Loading question/i.test(String(q.q || "")))) {
          QuantrexCatalog.fillQuestion(q).then(() => {
            try {
              if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType) QuantrexQFormat.getType(q);
              if (session && getQ(session.ids[session.idx]) === q) paintQuestionNow(getTestMountEl(), q);
            } catch (_) { /* */ }
          }).catch(() => {});
        }
      }
    } catch (_) { /* */ }
    // Prefer showing bank text immediately — never leave stem blank if we have content
    let textReady = true; // Quantrex fast render bypass
    const stemPlain = String(q.q || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!textReady && stemPlain.length >= 8) textReady = true;
    const hasRenderableOpts = (q.options || []).some(o => {
      const s = String(o || "");
      if (typeof qxIsFigureStubText === "function" && qxIsFigureStubText(s) && !/<img\b[^>]+cdn-question-pool|<img\b[^>]+proxy-image|<img\b[^>]+\/pyq\//i.test(s)) {
        return false;
      }
      if (typeof qxOptionHasRealFigure === "function" && qxOptionHasRealFigure(s)) return true;
      if (/<img\b/i.test(s) && /cdn-question-pool|proxy-image|\/pyq\/|watermark_improved|assets\//i.test(s)) return true;
      const t = s.replace(/<img\b[^>]*>/gi, " ").replace(/<[^>]+>/g, "").trim();
      if (/^(figure|fig\.?|diagram|image|structure)$/i.test(t)) return false;
      return t.length > 0 && !/^[A-D]$/i.test(t);
    });
    const letterStubOnly = (q.options || []).length >= 2 && (q.options || []).every(o => {
      const t = String(o || "").replace(/<[^>]+>/g, "").trim();
      return !t || /^[A-D]$/i.test(t);
    });
    // Simple numeric/short MCQ options (Marks Q1 style: 0,1,2,3) — always render, never "Loading…"
    const shortPlainOpts = !letterStubOnly && (q.options || []).length >= 2
      && (q.options || []).every(o => {
        const t = String(o || "").replace(/<[^>]+>/g, "").trim();
        return t.length > 0 && t.length <= 40;
      });
    // Force numerical UI when: type is NAT, OR current Marks section is NUMERICAL
    const secNow = (session.sections && session.sections.length)
      ? session.sections[currentSectionIdx()]
      : null;
    const inNumSection = !!(secNow && (secNow.type === "NUM" || /numerical/i.test(String(secNow.label || ""))));
    const inMultiSection = !!(secNow && (secNow.type === "MC" || /more correct|multiple correct|one or more/i.test(String(secNow.label || ""))));
    // Pin multi type only on official JEE Advanced papers (never NDA/JEE Main coded singles)
    if (isOfficialAdvPaper() && !isCodedSingleCorrect(q)
      && (inMultiSection || (typeof isMultiSelectQuestion === "function" && isMultiSelectQuestion(q)))) {
      try {
        q.questionType = "multipleCorrect";
        q.type = "multipleCorrect";
        q._advSection = "MC";
      } catch (_) { /* */ }
    }
    const isNumQ = inNumSection
      || (typeof isNumericalQuestion === "function" && isNumericalQuestion(q))
      || (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType(q) === "numerical");
    const isMultiQ = !isNumQ && !isCodedSingleCorrect(q)
      && ((isOfficialAdvPaper() && inMultiSection) || isMultiSelectQuestion(q));
    const selected = session.answers[session.idx];
    const markBadges = renderMarkingBadges(q);
    const timerHtml = session.durationSec != null
      ? `<div class="mtk-timer" id="qxTimer"><span class="mtk-timer-ic">🕐</span>${formatMarksTime(session.remainingSec)}</div>` : "";
    const testTheme = getTestTheme();
    const fontScale = getTestFontScale();
    const canResume = !!(session.persistKey || session.marksMode);
    const exitBtn = `<button type="button" class="mtk-exit-btn mtk-exit-only" id="mtkExitBtn" data-qx-exit="1" title="${canResume ? "Save &amp; exit — Resume later" : "Exit test"}" onclick="event.preventDefault();event.stopPropagation();if(window.qxExitTest)window.qxExitTest();return false;">Exit</button>`;

    // Badge: force Numerical / Multi when section says so (official Adv)
    let typeBadge = typeof QuantrexQFormat !== "undefined" ? QuantrexQFormat.typeBadgeHtml(q) : "";
    if (isNumQ) {
      typeBadge = `<span class="qx-qtype-badge qx-qtype-numerical">Numerical Type</span>`;
    } else if (isMultiQ) {
      typeBadge = `<span class="qx-qtype-badge qx-qtype-multiple">One or More Correct</span>`;
    }
    const optsClass = isNumQ
      ? "mtk-options mtk-numerical-wrap"
      : (isMultiQ
        ? "mtk-options mtk-options-grid mtk-options-multi qx-opts-multi"
        : (typeof QuantrexQFormat !== "undefined"
          ? QuantrexQFormat.testOptsContainerClass(q)
          : "mtk-options mtk-options-grid"));

    // In-test official section instruction strip (Adv multi/single/num)
    let sectionInstr = "";
    if (secNow && (session.paperFormat === "jee_advanced" || (session.meta && session.meta.exam === "jee_advanced")
      || (session.meta && session.meta.slug === "jee_advanced"))) {
      const st = secNow.type || "";
      if (st === "MC" || isMultiQ) {
        sectionInstr = `<div class="qx-sec-instr qx-sec-instr-multi" role="note">
          <strong>SECTION — One or More Correct</strong>
          <span>Each question has FOUR options. <b>ONE OR MORE THAN ONE</b> option(s) may be correct. Tap options to select/deselect multiple (A+B+C+D allowed). Full +4 only if all correct options chosen; partial marks as per official scheme; wrong combination −1.</span>
        </div>`;
      } else if (st === "NUM" || isNumQ) {
        sectionInstr = `<div class="qx-sec-instr qx-sec-instr-num" role="note">
          <strong>SECTION — Numerical Value</strong>
          <span>Enter the correct numerical value. Full Marks +4 if correct; Zero Marks 0 otherwise (no negative marking).</span>
        </div>`;
      } else if (st === "MATCH") {
        sectionInstr = `<div class="qx-sec-instr" role="note">
          <strong>SECTION — Match List</strong>
          <span>Choose the option corresponding to the correct matching. Follow the marking scheme for this paper.</span>
        </div>`;
      } else {
        sectionInstr = `<div class="qx-sec-instr qx-sec-instr-sc" role="note">
          <strong>SECTION — Single Correct</strong>
          <span>Each question has FOUR options (A)(B)(C)(D). <b>ONLY ONE</b> is correct. Full Marks +3 · Incorrect −1 · Unattempted 0.</span>
        </div>`;
      }
    }

    // Never infinite "Loading options…" — show keypad / options / clear fallback
    let opts;
    if (isNumQ) {
      opts = renderNumericalOptsHtml(q, selected);
    } else if (!textReady && !shortPlainOpts && !hasRenderableOpts) {
      opts = `<div class="empty" style="padding:24px;grid-column:1/-1">Loading question…</div>`;
    } else if ((hasRenderableOpts || shortPlainOpts) && typeof QuantrexQFormat !== "undefined") {
      opts = QuantrexQFormat.renderTestOptions(q, selected, htmlContent);
    } else if (hasRenderableOpts || shortPlainOpts) {
      opts = (q.options || []).map((o, i) => {
        const letter = String.fromCharCode(65 + i);
        const body = String(o || "").trim();
        const plain = body.replace(/<[^>]+>/g, "").trim();
        const shown = plain
          ? `<span class="qx-opt-plain">${plain.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span>`
          : (body ? htmlContent(o) : "—");
        return `<button type="button" class="mtk-opt ${selected === i ? "selected" : ""}" data-opt="${i}">
          <span class="mtk-opt-radio"></span>
          <span class="mtk-opt-letter">${letter}</span>
          <span class="mtk-opt-text qx-content">${shown}</span>
        </button>`;
      }).filter(Boolean).join("");
    } else if (q._catalogTried && (q._optsFetchFailed || q._fullFetched || !q._marksId)) {
      // Local catalog already tried — never spin forever
      const n = Math.max(4, (q.options || []).length || 4);
      opts = Array.from({ length: n }, (_, i) => {
        const letter = String.fromCharCode(65 + i);
        const raw = (q.options && q.options[i]) != null ? String(q.options[i]) : "";
        const plain = raw.replace(/<[^>]+>/g, "").trim();
        const body = plain && !/^[A-D]$/i.test(plain) ? htmlContent(raw) : letter;
        return `<button type="button" class="mtk-opt ${selected === i ? "selected" : ""}" data-opt="${i}">
          <span class="mtk-opt-radio"></span>
          <span class="mtk-opt-letter">${letter}</span>
          <span class="mtk-opt-text qx-content">${body}</span>
        </button>`;
      }).join("") + (letterStubOnly || !hasRenderableOpts
        ? `<p class="empty" style="grid-column:1/-1;padding:8px;font-size:13px;opacity:.85">Structure options offline. Choose A–D if known, or tap Retry load.</p>
           <button type="button" class="mtk-btn mtk-btn-save" id="qxOptsRetry" style="grid-column:1/-1;max-width:200px;margin:8px auto">Retry load</button>`
        : "");
    } else {
      // First paint: brief loading while Marks hydrate runs (max a few seconds)
      opts = `<div class="empty" style="padding:24px;grid-column:1/-1" data-qx-opts-loading="1">Loading options…</div>`;
    }

    const ctx = typeof AllenTestUI !== "undefined" ? AllenTestUI.detectContext(session) : null;
    const examLabel = ctx ? AllenTestUI.examTitle(ctx) : "CBT";
    const brandName = (window.QX_BRAND && window.QX_BRAND.name) || "Quantrex Academy";
    const brandLogo = (window.QX_BRAND && window.QX_BRAND.logo)
      || `<span class="mtk-logo mtk-logo-img" aria-hidden="true"><img src="/assets/quantrex-logo-3d-64.png?v=qxfix104" width="28" height="28" alt="" class="qx-ui-brand-logo"></span>`;
    const titleEsc = String(session.title || "Test").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const timeLeft = session.durationSec != null ? formatMarksTime(session.remainingSec) : "—";

    // ── ExamGOAL chrome (PYQ all exams + JEE Main Quantrex layout) ────
    if (typeof ExamgoalTestUI !== "undefined" && ExamgoalTestUI.isExamgoalUi(session)) {
      return ExamgoalTestUI.render({
        session, q, opts, optsClass, typeBadge, sectionInstr, textReady,
        markBadges, isNumQ, isMultiQ, fontScale, testTheme,
        renderQuestionText, formatMarksTime, hasAnswerAt
      });
    }

    // ── Exact Quizrr / NTA CBT chrome (screenshot 791) ─────────────────
    if (session.uiMode === "quizrr") {
      const secIdx = currentSectionIdx();
      const hasSecs = !!(session.sections && session.sections.length);
      const sec = hasSecs ? session.sections[secIdx] : null;
      const secName = (sec && (sec.label || sec.shortLabel)) || "ALL QUESTIONS";
      const secStart = sec ? sec.start : 0;
      const secCount = sec ? sec.count : session.ids.length;
      const secEnd = secStart + secCount;
      // Section-local stats + palette (like Quizrr)
      let qzAns = 0, qzNa = 0, qzNv = 0, qzMr = 0, qzAmr = 0;
      const palCells = [];
      for (let i = secStart; i < secEnd; i++) {
        const hasAns = hasAnswerAt(i);
        const isRev = session.review.has(i);
        const visited = session.visited.has(i);
        if (isRev && hasAns) qzAmr++;
        else if (isRev) qzMr++;
        else if (hasAns) qzAns++;
        else if (visited) qzNa++;
        else qzNv++;
        const st = paletteStatus(i);
        const cur = i === session.idx ? " cur" : "";
        const localN = i - secStart + 1;
        palCells.push(`<button type="button" class="mtk-pal-cell qzrr-grid-cell ${st}${cur}" data-qidx="${i}">${localN}</button>`);
      }
      const secTabs = hasSecs
        ? session.sections.map((s, i) => {
            const lab = s.label || s.shortLabel || `Section ${i + 1}`;
            return `<button type="button" class="mtk-sec-tab qzrr-sec-chip${i === secIdx ? " active" : ""}" data-sec="${i}">${lab} <span class="qzrr-info-i">i</span></button>`;
          }).join("")
        : `<button type="button" class="qzrr-sec-chip active">${secName} <span class="qzrr-info-i">i</span></button>`;
      const qType = isMultiQ ? "multipleCorrect"
        : (isNumQ ? "numerical"
          : ((typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType)
            ? QuantrexQFormat.getType(q)
            : "mcq"));
      const qTypeLabel = qType === "numerical" ? "Numerical"
        : (qType === "multipleCorrect" ? "One or More Correct" : "Single Correct");
      const posMark = qType === "multipleCorrect" ? 4
        : (qType === "numerical" ? 4
          : ((session.scoring && session.scoring.correct) != null ? session.scoring.correct : 3));
      const negMark = qType === "numerical" ? 0
        : (qType === "multipleCorrect" ? -1
          : ((session.scoring && session.scoring.wrong) != null ? session.scoring.wrong : -1));
      const localQno = session.idx - secStart + 1;
      const clock = formatQuizrrTime(session.remainingSec);
      const userName = (typeof localStorage !== "undefined"
        && (localStorage.getItem("quantrex_user_name") || localStorage.getItem("qx_user_name")))
        || "Candidate";
      const userEsc = String(userName).replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const maxSecMarks = secCount * (posMark > 0 ? posMark : 4);
      const magOn = !!(session && session._qzrrMag);
      const sideCollapsed = isSideCollapsed();
      const secInfoOpen = !(session && session._qzrrSecInfoClosed);
      if (session && session._qzrrDark == null) session._qzrrDark = getTestTheme() === "dark";
      const qzrrDark = !!(session && session._qzrrDark);
      return `<div class="mtk-test-root allen-cbt qzrr-cbt${magOn ? " qzrr-mag-on" : ""}${sideCollapsed ? " qzrr-side-collapsed" : ""}${qzrrDark ? " qzrr-dark" : ""}" data-test-theme="${qzrrDark ? "dark" : "light"}" data-font-scale="${fontScale}" data-ui="quizrr">
        <header class="qzrr-black-bar">
          <div class="qzrr-black-title">${titleEsc}</div>
          <div class="qzrr-black-tools">
            <button type="button" class="qzrr-tool-btn qzrr-tool-a11y" id="qzrrA11yBtn" title="View Settings">
              <span class="qzrr-ico qzrr-ico-green" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="#4caf50" stroke-width="2"/><path d="M12 2.5v2.2M12 19.3V21.5M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" stroke="#4caf50" stroke-width="1.8" stroke-linecap="round"/></svg></span>
              View Settings
            </button>
            <button type="button" class="qzrr-tool-btn qzrr-tool-instr" id="qzrrInstrBtn" title="Instructions">
              <span class="qzrr-ico qzrr-ico-blue" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#42a5f5" stroke-width="2"/><path d="M12 10.5v6" stroke="#42a5f5" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7.2" r="1.2" fill="#42a5f5"/></svg></span>
              Instructions
            </button>
            <button type="button" class="qzrr-tool-btn qzrr-tool-paper" id="qzrrPaperBtn" title="Question Paper">
              <span class="qzrr-ico qzrr-ico-blue" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M7 3.5h7.2L19 8.3V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" stroke="#42a5f5" stroke-width="1.7"/><path d="M14 3.5V9h5.2" stroke="#42a5f5" stroke-width="1.7"/><path d="M9 12h6M9 15.5h6" stroke="#42a5f5" stroke-width="1.5" stroke-linecap="round"/></svg></span>
              Question Paper
            </button>
            <button type="button" class="qzrr-tool-btn mtk-font-btn" id="mtkFontDown" title="Decrease text size">A−</button>
            <button type="button" class="qzrr-tool-btn mtk-font-btn" id="mtkFontUp" title="Increase text size">A+</button>
            <button type="button" class="qzrr-tool-btn qzrr-exit" id="mtkExitBtn" data-qx-exit="1"
              title="Exit test"
              onclick="event.preventDefault();event.stopPropagation();if(window.qxExitTest){window.qxExitTest();}return false;">Exit</button>
          </div>
        </header>
        <!-- Quizrr top-right zoom: magnifier circle (same corner as screenshot 796) -->
        <div class="qzrr-top-zoom" id="qzrrTopZoom">
          <button type="button" class="qzrr-top-zoom-fab" id="qzrrZoomFab" title="Zoom" aria-label="Zoom" aria-expanded="false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.2" stroke="currentColor" stroke-width="2.2"/>
              <path d="M15.3 15.3L21 21" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="qzrr-top-zoom-panel" id="qzrrZoomPanel" hidden>
            <button type="button" class="qzrr-zoom-circle" id="qzrrZoomOutTop" title="Zoom out">−</button>
            <span class="qzrr-zoom-lbl" id="qzrrZoomLbl">${Math.round(getTestZoom() * 100)}%</span>
            <button type="button" class="qzrr-zoom-circle qzrr-zoom-circle-plus" id="qzrrZoomInTop" title="Zoom in">+</button>
          </div>
        </div>
        <div class="qzrr-sec-strip">
          <div class="qzrr-sec-strip-left">
            <button type="button" class="qzrr-paper-chip" id="qzrrPaperChipBtn" title="Paper info">${titleEsc.length > 22 ? titleEsc.slice(0, 20) + "…" : titleEsc} <span class="qzrr-info-i">i</span></button>
          </div>
        </div>
        <div class="qzrr-body">
          <div class="qzrr-main-col">
            <div class="qzrr-sec-row">
              <div class="qzrr-sec-tabs-wrap">
                <span class="qzrr-sec-lbl">Sections</span>
                <button type="button" class="qzrr-sec-nav" id="mtkSecPrev" title="Previous section" ${secIdx <= 0 ? "disabled" : ""}>◀</button>
                <div class="qzrr-sec-tabs">${secTabs}</div>
                <button type="button" class="qzrr-sec-nav" id="mtkSecNext" title="Next section" ${!hasSecs || secIdx >= session.sections.length - 1 ? "disabled" : ""}>▶</button>
              </div>
              <div class="qzrr-sec-row-right">
                <div class="qzrr-time-box">Time Left : <strong id="qxTimer">${clock}</strong></div>
              </div>
            </div>
            <div class="qzrr-q-meta-row">
              <div>
                <div class="qzrr-qtype">Question Type: ${qTypeLabel}</div>
                <div class="qzrr-qno">Question No. ${localQno}</div>
              </div>
              <div class="qzrr-marks-line">Marks for correct answer: <strong>${posMark}</strong> | Negative Marks: <strong>${negMark}</strong></div>
            </div>
            <div class="qzrr-section-info${secInfoOpen ? "" : " collapsed"}" id="qzrrSecInfo">
              <button type="button" class="qzrr-section-info-head" id="qzrrSecInfoToggle" aria-expanded="${secInfoOpen ? "true" : "false"}">
                <strong>${secName} (Maximum Marks: ${maxSecMarks})</strong>
                <span class="qzrr-sec-caret" aria-hidden="true">${secInfoOpen ? "▲" : "▼"}</span>
              </button>
              <ul class="qzrr-section-info-ul">
                <li>This section contains <strong>${secCount}</strong> question${secCount === 1 ? "" : "s"}.</li>
                <li>${qType === "numerical" || (sec && sec.type === "NUM")
                  ? "The answer to each question is a <strong>NUMERICAL VALUE</strong>. Enter it using the on-screen keypad."
                  : (isMultiQ || (sec && sec.type === "MC")
                    ? "Each question has FOUR options (A)(B)(C)(D). <strong>ONE OR MORE THAN ONE</strong> of these four option(s) is(are) correct. You may select multiple options."
                    : "Each question has FOUR options (A)(B)(C)(D). <strong>ONLY ONE</strong> of these four options is the correct answer.")}</li>
                <li>${isMultiQ || (sec && sec.type === "MC")
                  ? "Choose the option(s) corresponding to (all) the correct answer(s). Tap again to deselect."
                  : "For each question, choose the option corresponding to the correct answer."}</li>
                <li>Answer to each question will be evaluated according to the following marking scheme:
                  <ul class="qzrr-mark-sub">
                    ${isMultiQ || (sec && sec.type === "MC")
                      ? `<li><em>Full Marks</em> : +4 ONLY if (all) the correct option(s) is(are) chosen</li>
                         <li><em>Partial Marks</em> : +3 / +2 / +1 as per official JEE (Advanced) multi-correct scheme</li>
                         <li><em>Zero Marks</em> : 0 If unanswered</li>
                         <li><em>Negative Marks</em> : −1 In all other cases</li>`
                      : (qType === "numerical" || (sec && sec.type === "NUM")
                        ? `<li><em>Full Marks</em> : +4 If ONLY the correct numerical value is entered</li>
                           <li><em>Zero Marks</em> : 0 In all other cases</li>`
                        : `<li><em>Full Marks</em> : +${posMark} If ONLY the correct option is chosen</li>
                           <li><em>Zero Marks</em> : 0 If unanswered</li>
                           <li><em>Negative Marks</em> : ${negMark} In all other cases</li>`)}
                  </ul>
                </li>
              </ul>
            </div>
            <div class="qzrr-q-area" id="qzrrQArea">
              ${renderQuestionText(q, textReady)}
              ${sectionInstr || ""}
              <div class="${optsClass} qzrr-opts" id="qxOpts">${opts}</div>
            </div>
            <div class="qzrr-footer-actions">
              <div class="qzrr-act-left">
                <button type="button" class="qzrr-btn qzrr-btn-outline" id="qxReviewNextBtn">Mark for Review &amp; Next</button>
                <button type="button" class="qzrr-btn qzrr-btn-outline" id="qxClearBtn">Clear Response</button>
              </div>
              <div class="qzrr-act-right">
                <button type="button" class="qzrr-btn qzrr-btn-outline" id="qxPrevBtn" ${session.idx <= 0 ? "disabled" : ""}>Previous</button>
                <button type="button" class="qzrr-btn qzrr-btn-primary" id="qxSaveBtn">Save &amp; Next</button>
              </div>
              <button type="button" class="qzrr-btn qzrr-btn-primary qzrr-submit-mobile" id="qxSubmitTop"
                onclick="event.preventDefault();event.stopPropagation();if(window.qxSubmitTest){window.qxSubmitTest();}return false;">Submit</button>
            </div>
          </div>
          <button type="button" class="qzrr-side-toggle" id="qzrrSideToggle" title="Show question panel" aria-label="Show question panel">◀</button>
          <aside class="qzrr-side" id="qzrrSide">
            <div class="qzrr-side-head">
              <strong>Overview</strong>
              <button type="button" class="qzrr-pal-close" id="qzrrPalClose" title="Hide question panel">✕</button>
            </div>
            <div class="qzrr-side-profile">
              <div class="qzrr-profile-top">
                <div class="qzrr-profile-avatar" aria-hidden="true">
                  <svg viewBox="0 0 64 64" width="48" height="48"><circle cx="32" cy="32" r="32" fill="#d9e2ec"/><circle cx="32" cy="24" r="12" fill="#90a4ae"/><ellipse cx="32" cy="52" rx="18" ry="14" fill="#90a4ae"/></svg>
                </div>
              </div>
              <div class="qzrr-profile-name">${userEsc}</div>
              <!-- Quizrr right-side zoom (profile ke niche) -->
              <div class="qzrr-side-zoom" role="group" aria-label="Zoom">
                <button type="button" class="qzrr-zoom-circle" id="qzrrZoomOutSide" title="Zoom out">−</button>
                <span class="qzrr-zoom-lbl" id="qzrrZoomLblSide">${Math.round(getTestZoom() * 100)}%</span>
                <button type="button" class="qzrr-zoom-circle qzrr-zoom-circle-plus" id="qzrrZoomInSide" title="Zoom in">+</button>
              </div>
            </div>
            <div class="qzrr-side-stats">
              <div class="qzrr-stat"><span class="qzrr-pill qzrr-pill-ans">${qzAns}</span><span>Answered</span></div>
              <div class="qzrr-stat"><span class="qzrr-pill qzrr-pill-na">${qzNa}</span><span>Not Answered</span></div>
              <div class="qzrr-stat"><span class="qzrr-pill qzrr-pill-nv">${qzNv}</span><span>Not Visited</span></div>
              <div class="qzrr-stat"><span class="qzrr-pill qzrr-pill-mr">${qzMr}</span><span>Marked for review</span></div>
              <div class="qzrr-stat qzrr-stat-wide"><span class="qzrr-pill qzrr-pill-amr">${qzAmr}</span><span>Answered and Marked for Review (will also be evaluated)</span></div>
            </div>
            <div class="qzrr-sec-bar-label"><span>${secName}</span></div>
            <p class="qzrr-choose">Choose a Question</p>
            <div class="qzrr-grid">${palCells.join("")}</div>
            <div class="qzrr-side-foot">
              <button type="button" class="qzrr-btn qzrr-btn-primary" id="qxSubmitBtn"
                onclick="event.preventDefault();event.stopPropagation();if(window.qxSubmitTest){window.qxSubmitTest();}return false;">Submit</button>
            </div>
          </aside>
        </div>
        <div id="qzrrModalHost"></div>
      </div>`;
    }

    return `<div class="mtk-test-root allen-cbt${isSideCollapsed() ? " mtk-side-collapsed" : ""}" data-test-theme="${testTheme}" data-font-scale="${fontScale}">
      <header class="mtk-header">
        <div class="mtk-header-left">
          <div class="mtk-brand allen-brand">${brandLogo}<span class="mtk-brand-text">${brandName} · ${examLabel}</span></div>
        </div>
        ${timerHtml}
        <div class="mtk-header-tools">
          <button type="button" class="mtk-theme-btn" id="mtkThemeBtn" title="Toggle light/dark mode">${testTheme === "dark" ? "☀️" : "🌙"}</button>
          <span class="mtk-theme-lbl" id="mtkThemeLbl">${testTheme === "light" ? "Light" : "Dark"}</span>
          <button type="button" class="mtk-font-btn" id="mtkFontDownHdr" title="Decrease text size">A−</button>
          <button type="button" class="mtk-font-btn" id="mtkFontUpHdr" title="Increase text size">A+</button>
        </div>
        ${exitBtn}
        <button type="button" class="mtk-submit-top" id="qxSubmitTop">Submit</button>
      </header>
      ${renderMarksColorStrip()}
      ${renderMarksSectionTabs()}
      <div class="mtk-body">
        <div class="mtk-main">
          <div class="mtk-q-head">
            <span class="mtk-q-num">Q${session.idx + 1}</span>${markBadges}
            ${typeBadge}
          </div>
          ${renderQuestionText(q, textReady)}
          ${sectionInstr || ""}
          <div class="${optsClass}" id="qxOpts">${opts}</div>
          ${isMultiQ ? `<p class="qx-multi-hint">Select <strong>one or more</strong> options (A–D). Tap again to unselect.</p>` : ""}
          <div class="mtk-controls">
            <div class="mtk-act-left">
              <button type="button" class="mtk-btn mtk-btn-review" id="qxReviewNextBtn">Mark for Review &amp; Next</button>
              <button type="button" class="mtk-btn mtk-btn-clear" id="qxClearBtn">Clear Response</button>
            </div>
            <div class="mtk-act-right">
              <button type="button" class="mtk-btn mtk-btn-prev" id="qxPrevBtn" ${session.idx <= 0 ? "disabled" : ""}>Previous</button>
              <button type="button" class="mtk-btn mtk-btn-save" id="qxSaveBtn">Save &amp; Next</button>
            </div>
          </div>
        </div>
        ${renderMarksPalette()}
        <button type="button" class="mtk-pal-open" id="mtkPalOpen" title="${isSideCollapsed() ? "Show question panel" : "Hide question panel"}" aria-label="${isSideCollapsed() ? "Show question panel" : "Hide question panel"}">${isSideCollapsed() ? "◀" : "▶"}</button>
      </div>
    </div>`;
  }

  function renderQuestion() {
    if (!session) return '<div class="empty">No active test session.</div>';
    if (session.marksMode) return renderMarksQuestion();

    const q = getQ(session.ids[session.idx]);
    if (!q) return '<div class="empty">Question not found.</div>';
    try {
      if (typeof qxRestoreQuestionContent === "function") qxRestoreQuestionContent(q);
    } catch (_) { /* */ }
    try {
      if (typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion
        && (!q.options || !q.options.some((o) => String(o || "").replace(/<[^>]+>/g, "").trim().length > 1))) {
        QuantrexCatalog.fillQuestion(q).then(() => {
          try { if (typeof render === "function") render(); } catch (_) { /* */ }
        }).catch(() => {});
      }
    } catch (_) { /* */ }
    const incomplete = (typeof MarksLive !== "undefined" && MarksLive.isQuestionIncomplete
      ? MarksLive.isQuestionIncomplete(q)
      : false)
      || /^Loading question/i.test(String(q.q || ""));
    const total = session.ids.length;
    const selected = session.answers[session.idx];
    const isReview = session.review.has(session.idx);
    const subjTag = (q.subject || "").toLowerCase().replace(/\s+/g, "-");
    const timerHtml = session.durationSec != null
      ? `<div class="qx-timer" id="qxTimer">${formatTime(session.remainingSec)}</div>` : "";

    return `<div class="qx-test-layout${isSideCollapsed() ? " mtk-side-collapsed" : ""}">
      <div class="qx-test-main">
        <div class="qx-test-bar">
          <div class="tb-info">
            <strong>${session.title}</strong>
            <small>Question ${session.idx + 1} of ${total} · ${session.modeLabel}</small>
          </div>
          <div class="qx-test-bar-right">
            ${timerHtml}
            <button type="button" class="btn-soft sm" id="qxQuitBtn">Exit</button>
          </div>
        </div>
        <div class="qx-test-progress"><div style="width:${Math.round((session.idx / total) * 100)}%"></div></div>
        <div class="qa-wrap qx-qa">
          <div class="qa-head">
            <div>
              <span class="tag tag-${subjTag}">${q.subject}</span>
              ${typeof qxDifficultyTag === "function" ? qxDifficultyTag(q) : ""}
              ${q.chapter ? `<span class="tag">📖 ${q.chapter}</span>` : ""}
            </div>
            <button type="button" class="bm-btn ${isReview ? "on" : ""}" id="qxReviewBtn">${isReview ? "🔖 Marked" : "🏷️ Mark for Review"}</button>
          </div>
          ${incomplete ? '<div class="qa-q qx-content"><div class="empty">Loading question…</div></div>' : renderQuestionText(q, true)}
          <div class="${typeof QuantrexQFormat !== "undefined" ? QuantrexQFormat.practiceOptsContainerClass(q) : "qa-options"}" id="qxOpts">
            ${incomplete ? '<div class="empty" style="padding:16px">Loading options…</div>' : (typeof QuantrexQFormat !== "undefined"
              ? QuantrexQFormat.renderOptions(q, { selected, done: false })
              : (q.options || []).map((o, i) => {
                const letter = String.fromCharCode(65 + i);
                return `<button type="button" class="qa-opt ${selected === i ? "selected" : ""}" data-opt="${i}">
                <span class="opt-letter">${letter}</span>
                <span class="qx-content">${htmlContent(o)}</span></button>`;
              }).join(""))}
          </div>
          <div class="qx-controls eg-foot">
            <div class="eg-foot-left mtk-act-left">
              <button type="button" class="btn-soft" id="qxReviewNextBtn">Mark for Review &amp; Next</button>
              <button type="button" class="btn-soft" id="qxClearBtn">Clear Response</button>
            </div>
            <div class="eg-foot-right mtk-act-right">
              <button type="button" class="btn-soft" id="qxPrevBtn" ${session.idx <= 0 ? "disabled" : ""}>Previous</button>
              <button type="button" class="btn-primary" id="qxSaveBtn">Save &amp; Next</button>
            </div>
          </div>
        </div>
      </div>
      ${renderPalette()}
      <button type="button" class="mtk-pal-open" id="mtkPalOpen" title="Show question panel" aria-label="Show question panel">◀</button>
    </div>`;
  }

  function bindEvents(root) {
    if (!session || !root) return;
    const q = getQ(session.ids[session.idx]);
    const numInput = root.querySelector("#qxNumInput");
    if (numInput && typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.bindNumericalKeypad) {
      QuantrexQFormat.bindNumericalKeypad(root, (v) => {
        if (v) session.answers[session.idx] = v;
        else delete session.answers[session.idx];
        session.visited.add(session.idx);
      });
    } else if (numInput) {
      numInput.oninput = () => {
        const v = numInput.value.trim();
        if (v) session.answers[session.idx] = v;
        else delete session.answers[session.idx];
        session.visited.add(session.idx);
      };
    }
    const optsRetry = root.querySelector("#qxOptsRetry");
    if (optsRetry) {
      optsRetry.onclick = () => {
        const qq = getQ(session.ids[session.idx]);
        if (qq) {
          delete qq._optsFetchFailed;
          delete qq._fullFetched;
        }
        refresh();
      };
    }
    root.querySelectorAll("[data-opt]").forEach(btn => {
      const pick = () => selectAnswer(parseInt(btn.dataset.opt, 10));
      btn.onclick = pick;
      btn.onpointerdown = (e) => {
        if (e && e.button != null && e.button !== 0) return;
        btn.classList.add("selected");
        if (e && e.pointerType === "touch") {
          e.preventDefault();
          pick();
        }
      };
    });
    root.querySelectorAll("[data-prac-opt]").forEach(btn => {
      const pick = () => selectAnswer(parseInt(btn.dataset.pracOpt, 10));
      btn.onclick = pick;
      btn.onpointerdown = (e) => {
        if (e && e.button != null && e.button !== 0) return;
        btn.classList.add("selected");
      };
    });
    const reviewBtn = root.querySelector("#qxReviewBtn");
    if (reviewBtn) reviewBtn.onclick = toggleReview;
    const prev = root.querySelector("#qxPrevBtn");
    if (prev) prev.onclick = () => goTo(session.idx - 1);
    const next = root.querySelector("#qxNextBtn");
    if (next) next.onclick = () => goTo(session.idx + 1);
    const skip = root.querySelector("#qxSkipBtn");
    if (skip) skip.onclick = skipQuestion;
    const save = root.querySelector("#qxSaveBtn");
    if (save) {
      // pointerup = faster than click on mobile/touch (no 300ms feel)
      const fireSave = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        saveAndNext();
      };
      save.onclick = fireSave;
      save.onpointerup = (e) => {
        if (e.pointerType === "touch" || e.pointerType === "pen") fireSave(e);
      };
    }
    const quitBtn = root.querySelector("#qxQuitBtn");
    if (quitBtn) quitBtn.onclick = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      quit();
    };
    const clearBtn = root.querySelector("#qxClearBtn");
    if (clearBtn) clearBtn.onclick = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      clearResponse();
    };
    const reviewNext = root.querySelector("#qxReviewNextBtn");
    if (reviewNext) reviewNext.onclick = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      markReviewAndNext();
    };
    const wireSubmit = (el) => {
      if (!el) return;
      el.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        try {
          if (typeof window.qxSubmitTest === "function") window.qxSubmitTest();
          else confirmSubmit();
        } catch (err) {
          console.error("submit click", err);
          try { confirmSubmit(); } catch (_) { /* */ }
        }
      };
    };
    wireSubmit(root.querySelector("#qxSubmitBtn"));
    wireSubmit(root.querySelector("#qxSubmitTop"));
    // Exit — JS + inline backup
    root.querySelectorAll("#mtkExitBtn, [data-qx-exit]").forEach((mtkExit) => {
      mtkExit.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        try {
          if (typeof window.qxExitTest === "function") window.qxExitTest();
          else quit();
        } catch (err) {
          console.error("exit click", err);
          try { quit(true); } catch (_) { /* */ }
        }
      };
    });
    const mtkReport = root.querySelector("#mtkReportBtn");
    if (mtkReport && typeof openQuestionReport === "function") {
      mtkReport.onclick = () => {
        const q = getQ(session.ids[session.idx]);
        if (q) openQuestionReport(q.id);
      };
    }
    const mtkTheme = root.querySelector("#mtkThemeBtn");
    if (mtkTheme) mtkTheme.onclick = () => { if (typeof toggleTestTheme === "function") toggleTestTheme(); };
    const bindFont = (btn, delta) => {
      if (btn) btn.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (typeof bumpTestFont === "function") bumpTestFont(delta);
        try { applyTestZoomToDom(getTestZoom()); } catch (_) { /* */ }
      };
    };
    bindFont(root.querySelector("#mtkFontDown"), -1);
    bindFont(root.querySelector("#mtkFontUp"), 1);
    bindFont(root.querySelector("#mtkFontDownHdr"), -1);
    bindFont(root.querySelector("#mtkFontUpHdr"), 1);
    root.querySelectorAll(".mtk-font-btn").forEach((btn) => {
      if (btn.id && /Down/i.test(btn.id) && !btn.onclick) bindFont(btn, -1);
      if (btn.id && /Up/i.test(btn.id) && !btn.onclick) bindFont(btn, 1);
    });
    const qviewGear = root.querySelector("#mtkQviewGear");
    if (qviewGear) qviewGear.onclick = () => { if (typeof toggleMtkQviewSettings === "function") toggleMtkQviewSettings(); };
    const palClose = root.querySelector("#mtkPalClose");
    if (palClose) palClose.onclick = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      setSideCollapsed(true);
    };
    const palOpen = root.querySelector("#mtkPalOpen");
    if (palOpen) palOpen.onclick = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      setSideCollapsed(!isSideCollapsed());
    };
    root.querySelectorAll(".qx-pal-cell, .mtk-pal-cell").forEach(cell => {
      cell.onclick = () => goTo(parseInt(cell.dataset.qidx, 10));
    });
    root.querySelectorAll(".mtk-sec-tab, .qzrr-sec-chip[data-sec]").forEach(tab => {
      tab.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        // Ignore pure "i" info glyph mis-clicks — still switch section
        const secI = parseInt(tab.getAttribute("data-sec"), 10);
        if (!Number.isNaN(secI)) goToSection(secI);
      };
    });
    root.querySelectorAll(".mtk-pal-group[data-sec], .qzrr-pal-sec[data-sec]").forEach((grp) => {
      const lab = grp.querySelector(".mtk-pal-grp-label, .qzrr-pal-sec-lab");
      if (!lab) return;
      lab.style.cursor = "pointer";
      lab.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const secI = parseInt(grp.getAttribute("data-sec"), 10);
        if (!Number.isNaN(secI)) goToSection(secI);
      };
    });
    const secPrev = root.querySelector("#mtkSecPrev");
    if (secPrev) secPrev.onclick = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      const cur = currentSectionIdx();
      if (cur > 0) goToSection(cur - 1);
    };
    const secNext = root.querySelector("#mtkSecNext");
    if (secNext) secNext.onclick = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      const cur = currentSectionIdx();
      if (cur < session.sections.length - 1) goToSection(cur + 1);
    };

    // ── Quizrr toolbar + chrome (exact NTA behavior) ─────────────────
    if (session.uiMode === "quizrr") {
      bindQuizrrChrome(root);
    }
    if (typeof ExamgoalTestUI !== "undefined" && ExamgoalTestUI.isExamgoalUi(session)) {
      ExamgoalTestUI.bind(root, {
        session,
        getQ,
        goTo,
        refresh,
        toggleReview: typeof toggleReview === "function" ? toggleReview : null,
        hasAnswerAt
      });
    }
  }

  function closeQzrrModal(root) {
    const host = (root || document).querySelector("#qzrrModalHost");
    if (host) host.innerHTML = "";
    document.querySelectorAll(".qzrr-modal-backdrop").forEach(el => el.remove());
  }

  function openQzrrModal(root, title, bodyHtml, opts) {
    const o = opts || {};
    const host = root.querySelector("#qzrrModalHost") || root;
    closeQzrrModal(root);
    const wrap = document.createElement("div");
    wrap.className = "qzrr-modal-backdrop";
    wrap.innerHTML = `<div class="qzrr-modal" role="dialog" aria-modal="true" aria-label="${String(title).replace(/"/g, "")}">
      <div class="qzrr-modal-head">
        <strong>${title}</strong>
        <button type="button" class="qzrr-modal-x" data-qzrr-close="1" aria-label="Close">✕</button>
      </div>
      <div class="qzrr-modal-body">${bodyHtml}</div>
      ${o.footer || `<div class="qzrr-modal-foot"><button type="button" class="qzrr-btn qzrr-btn-primary" data-qzrr-close="1">Close</button></div>`}
    </div>`;
    host.appendChild(wrap);
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap || (e.target && e.target.getAttribute && e.target.getAttribute("data-qzrr-close"))) {
        closeQzrrModal(root);
      }
    });
    return wrap;
  }

  function quizrrQuestionPaperHtml() {
    if (!session) return "";
    const rows = session.ids.map((id, i) => {
      const q = getQ(id);
      const st = paletteStatus(i);
      const has = hasAnswerAt(i);
      const rev = session.review.has(i);
      let status = "Not Visited";
      if (rev && has) status = "Answered + Marked";
      else if (rev) status = "Marked for Review";
      else if (has) status = "Answered";
      else if (session.visited.has(i)) status = "Not Answered";
      const plain = String((q && q.q) || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
      const cur = i === session.idx ? " qzrr-qp-cur" : "";
      return `<button type="button" class="qzrr-qp-row${cur}" data-qidx="${i}">
        <span class="qzrr-qp-no">Q${i + 1}</span>
        <span class="qzrr-qp-st qzrr-qp-st-${st}">${status}</span>
        <span class="qzrr-qp-snip">${plain || "—"}</span>
      </button>`;
    }).join("");
    return `<p class="qzrr-qp-lead">Click a question to jump. Status matches the palette.</p>
      <div class="qzrr-qp-list">${rows}</div>`;
  }

  function quizrrAccessibilityHtml() {
    // Limited important features only — all must work
    const scale = getTestFontScale();
    const dark = !!(session && session._qzrrDark);
    const contrast = !!(session && session._qzrrContrast);
    const spacing = !!(session && session._qzrrSpacing);
    const zoomPct = Math.round(getTestZoom() * 100);
    const fontOn = (name) => (scale === name ? " on" : "");
    const medOn = fontOn("medium") || (!["small", "medium", "large", "xlarge"].includes(scale) ? " on" : "");
    return `<div class="qzrr-a11y-pop qx-a11y-best">
      <p class="qzrr-a11y-sub">Adjust how the paper looks. Changes apply instantly.</p>
      <div class="qzrr-a11y-grid qx-a11y-grid-2">
        <div class="qzrr-a11y-tile">
          <div class="qzrr-a11y-tile-ico" aria-hidden="true">🌙</div>
          <div class="qzrr-a11y-tile-title">Dark Mode</div>
          <label class="qzrr-a11y-switch">
            <span class="qzrr-a11y-sun" aria-hidden="true">☀</span>
            <input type="checkbox" id="qzrrDarkToggle" ${dark ? "checked" : ""} aria-label="Dark mode" />
            <span class="qzrr-a11y-slider"></span>
            <span class="qzrr-a11y-moon" aria-hidden="true">☾</span>
          </label>
          <small class="qzrr-a11y-hint">${dark ? "Dark mode ON" : "Light mode"}</small>
        </div>
        <div class="qzrr-a11y-tile">
          <div class="qzrr-a11y-tile-ico" aria-hidden="true">🔤</div>
          <div class="qzrr-a11y-tile-title">Font Size</div>
          <div class="qzrr-a11y-font-row">
            <button type="button" class="qzrr-a11y-font${fontOn("small")}" data-qzrr-scale="small" title="Small" style="font-size:12px">A</button>
            <button type="button" class="qzrr-a11y-font${medOn}" data-qzrr-scale="medium" title="Medium" style="font-size:15px">A</button>
            <button type="button" class="qzrr-a11y-font${fontOn("large")}" data-qzrr-scale="large" title="Large" style="font-size:18px">A</button>
            <button type="button" class="qzrr-a11y-font${fontOn("xlarge")}" data-qzrr-scale="xlarge" title="Extra large" style="font-size:21px">A</button>
          </div>
          <small class="qzrr-a11y-hint">Text and math together</small>
        </div>
        <div class="qzrr-a11y-tile">
          <div class="qzrr-a11y-tile-ico" aria-hidden="true">🔍</div>
          <div class="qzrr-a11y-tile-title">Zoom</div>
          <div class="qzrr-a11y-zoom-row">
            <button type="button" class="qzrr-zoom-circle" data-qzrr-zoom="-1" title="Zoom out">−</button>
            <span class="qzrr-zoom-lbl" id="qzrrA11yZoomLbl">${zoomPct}%</span>
            <button type="button" class="qzrr-zoom-circle qzrr-zoom-circle-plus" data-qzrr-zoom="1" title="Zoom in">+</button>
          </div>
          <button type="button" class="qx-a11y-reset-zoom" data-qzrr-zoom-reset="1">Reset 100%</button>
        </div>
        <div class="qzrr-a11y-tile">
          <div class="qzrr-a11y-tile-ico" aria-hidden="true">◐</div>
          <div class="qzrr-a11y-tile-title">High Contrast</div>
          <label class="qzrr-a11y-switch">
            <input type="checkbox" id="qzrrContrastToggle" ${contrast ? "checked" : ""} aria-label="High contrast" />
            <span class="qzrr-a11y-slider"></span>
          </label>
          <small class="qzrr-a11y-hint">Clearer black text</small>
        </div>
        <div class="qzrr-a11y-tile qx-a11y-tile-wide">
          <div class="qzrr-a11y-tile-ico" aria-hidden="true">↕</div>
          <div class="qzrr-a11y-tile-title">Comfortable Spacing</div>
          <label class="qzrr-a11y-switch">
            <input type="checkbox" id="qzrrSpacingToggle" ${spacing ? "checked" : ""} aria-label="Line spacing" />
            <span class="qzrr-a11y-slider"></span>
          </label>
          <small class="qzrr-a11y-hint">More space between lines</small>
        </div>
      </div>
      <div class="qx-a11y-actions">
        <button type="button" class="qx-a11y-btn-reset" id="qzrrA11yResetAll">Reset all</button>
        <button type="button" class="qx-a11y-btn-done" id="qzrrA11yDone">Done</button>
      </div>
    </div>`;
  }

  function quizrrInstructionsViewHtml() {
    const n = session ? session.ids.length : 0;
    const mins = session && session.durationSec != null ? Math.floor(session.durationSec / 60) : "—";
    const title = session ? String(session.title || "Test").replace(/</g, "&lt;") : "Test";
    return `<div class="qzrr-instr-view">
      <h3>INSTRUCTIONS TO CANDIDATES</h3>
      <p><strong>Paper:</strong> ${title} · <strong>${n}</strong> questions · <strong>${mins}</strong> minutes</p>
      <ol>
        <li>The countdown timer shows remaining time. When it reaches zero the test ends automatically.</li>
        <li>Use the <strong>Question Palette</strong> on the right to jump between questions.</li>
        <li><strong>Save &amp; Next</strong> saves your answer and moves to the next question.</li>
        <li><strong>Mark for Review &amp; Next</strong> marks the question for review and moves ahead. Answered + marked questions are still evaluated.</li>
        <li><strong>Clear Response</strong> removes the selected answer for the current question.</li>
        <li>You may change answers any number of times before final <strong>Submit</strong>.</li>
        <li>Sections can be switched anytime from the section tabs above.</li>
      </ol>
      <div class="qzrr-mini-legend" style="margin-top:12px">
        <span><i class="qzrr-pill qzrr-pill-ans">A</i> Answered</span>
        <span><i class="qzrr-pill qzrr-pill-na">N</i> Not Answered</span>
        <span><i class="qzrr-pill qzrr-pill-nv">V</i> Not Visited</span>
        <span><i class="qzrr-pill qzrr-pill-mr">R</i> Marked</span>
        <span><i class="qzrr-pill qzrr-pill-amr">M</i> Answered + Marked</span>
      </div>
    </div>`;
  }

  function bindQuizrrChrome(root) {
    if (!root || !session) return;

    const a11yBtn = root.querySelector("#qzrrA11yBtn");
    if (a11yBtn) {
      a11yBtn.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        // Fixed on body with clean backdrop so it works flawlessly on mobile & desktop
        let pop = document.getElementById("qzrrA11yPopover");
        if (pop) { pop.remove(); }
        let backdrop = document.getElementById("qzrrA11yBackdrop");
        if (backdrop) { backdrop.remove(); }

        backdrop = document.createElement("div");
        backdrop.id = "qzrrA11yBackdrop";
        backdrop.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(3px);z-index:20090;animation:qxFadeIn .15s ease;";
        document.body.appendChild(backdrop);

        pop = document.createElement("div");
        pop.id = "qzrrA11yPopover";
        pop.className = "qzrr-a11y-popover";
        pop.innerHTML = `<div class="qzrr-a11y-popover-head">View Settings <button type="button" class="qzrr-a11y-x" id="qzrrA11yClose" aria-label="Close">✕</button></div>${quizrrAccessibilityHtml()}`;
        document.body.appendChild(pop);

        const isMobile = window.innerWidth <= 640;
        if (isMobile) {
          pop.style.position = "fixed";
          pop.style.top = "50%";
          pop.style.left = "50%";
          pop.style.transform = "translate(-50%, -50%)";
          pop.style.width = "min(360px, 92vw)";
          pop.style.maxHeight = "85vh";
          pop.style.overflowY = "auto";
          pop.style.borderRadius = "16px";
          pop.style.boxShadow = "0 20px 45px rgba(0,0,0,0.35)";
          pop.style.zIndex = "20100";
        } else {
          const rect = a11yBtn.getBoundingClientRect();
          const popW = Math.min(400, window.innerWidth - 16);
          let left = Math.min(rect.left, window.innerWidth - popW - 8);
          left = Math.max(8, left);
          pop.style.position = "fixed";
          pop.style.top = Math.min(window.innerHeight - 20, rect.bottom + 8) + "px";
          pop.style.left = left + "px";
          pop.style.right = "auto";
          pop.style.zIndex = "20100";
        }

        const applyA11yClasses = () => {
          const isDark = !!session._qzrrDark;
          root.classList.toggle("qzrr-dark", isDark);
          root.classList.toggle("qzrr-contrast", !!session._qzrrContrast);
          root.classList.toggle("qzrr-spacing", !!session._qzrrSpacing);
          root.classList.remove("qzrr-mag-on", "qzrr-dyslexia", "qzrr-focus");
          root.setAttribute("data-test-theme", isDark ? "dark" : "light");
          if (document.body) document.body.classList.toggle("qzrr-dark-body", isDark);
        };
        const syncZoomLbl = () => {
          const pct = Math.round(getTestZoom() * 100) + "%";
          document.querySelectorAll("#qzrrA11yZoomLbl, #qzrrZoomLbl, #qzrrZoomLblSide").forEach(el => {
            el.textContent = pct;
          });
        };
        const closeA11y = () => {
          try { pop.remove(); } catch (_) { /* */ }
          try { const bd = document.getElementById("qzrrA11yBackdrop"); if (bd) bd.remove(); } catch (_) { /* */ }
        };
        backdrop.onclick = (ev) => { ev.stopPropagation(); closeA11y(); };
        const closeBtn = pop.querySelector("#qzrrA11yClose");
        if (closeBtn) closeBtn.onclick = (ev) => { ev.stopPropagation(); closeA11y(); };
        const doneBtn = pop.querySelector("#qzrrA11yDone");
        if (doneBtn) doneBtn.onclick = (ev) => { ev.stopPropagation(); closeA11y(); };

        pop.querySelectorAll("[data-qzrr-scale]").forEach(btn => {
          btn.onclick = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            setTestFontScale(btn.getAttribute("data-qzrr-scale"));
            pop.querySelectorAll(".qzrr-a11y-font").forEach(b => b.classList.remove("on"));
            btn.classList.add("on");
          };
        });
        pop.querySelectorAll("[data-qzrr-zoom]").forEach(btn => {
          btn.onclick = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            bumpTestZoom(parseInt(btn.getAttribute("data-qzrr-zoom"), 10) * 2);
            applyTestZoomToDom(getTestZoom());
            syncZoomLbl();
          };
        });
        const zReset = pop.querySelector("[data-qzrr-zoom-reset]");
        if (zReset) {
          zReset.onclick = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            setTestZoom(1);
            applyTestZoomToDom(1);
            syncZoomLbl();
          };
        }
        const bindToggle = (sel, key, onChange) => {
          const el = pop.querySelector(sel);
          if (!el) return;
          el.onchange = () => {
            session[key] = !!el.checked;
            applyA11yClasses();
            if (typeof onChange === "function") onChange(!!el.checked);
            syncZoomLbl();
          };
        };
        bindToggle("#qzrrDarkToggle", "_qzrrDark");
        bindToggle("#qzrrContrastToggle", "_qzrrContrast");
        bindToggle("#qzrrSpacingToggle", "_qzrrSpacing");
        const resetAll = pop.querySelector("#qzrrA11yResetAll");
        if (resetAll) {
          resetAll.onclick = (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            session._qzrrDark = false;
            session._qzrrContrast = false;
            session._qzrrSpacing = false;
            setTestFontScale("medium");
            setTestZoom(1);
            applyTestZoomToDom(1);
            applyA11yClasses();
            closeA11y();
            a11yBtn.click();
            if (typeof showToast === "function") showToast("View settings reset");
          };
        }
        applyA11yClasses();
        setTimeout(() => {
          const closer = (ev) => {
            if (!pop.isConnected) {
              document.removeEventListener("click", closer, true);
              return;
            }
            if (!pop.contains(ev.target) && ev.target !== a11yBtn && !a11yBtn.contains(ev.target)) {
              closeA11y();
              document.removeEventListener("click", closer, true);
            }
          };
          document.addEventListener("click", closer, true);
        }, 80);
      };
    }

    // Top-right magnifier FAB still opens zoom +/−
    const zoomFab = root.querySelector("#qzrrZoomFab");
    const zoomPanel = root.querySelector("#qzrrZoomPanel");
    if (zoomFab && zoomPanel) {
      zoomFab.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const open = zoomPanel.hasAttribute("hidden");
        if (open) {
          zoomPanel.removeAttribute("hidden");
          zoomFab.setAttribute("aria-expanded", "true");
          zoomFab.classList.add("on");
        } else {
          zoomPanel.setAttribute("hidden", "");
          zoomFab.setAttribute("aria-expanded", "false");
          zoomFab.classList.remove("on");
        }
      };
    }

    const instrBtn = root.querySelector("#qzrrInstrBtn");
    if (instrBtn) {
      instrBtn.onclick = () => {
        openQzrrModal(root, "Instructions", quizrrInstructionsViewHtml());
      };
    }

    const paperBtn = root.querySelector("#qzrrPaperBtn");
    const paperChip = root.querySelector("#qzrrPaperChipBtn");
    const openPaper = () => {
      const modal = openQzrrModal(root, "Question Paper", quizrrQuestionPaperHtml());
      modal.querySelectorAll(".qzrr-qp-row").forEach(row => {
        row.onclick = (e) => {
          e.stopPropagation();
          const idx = parseInt(row.getAttribute("data-qidx"), 10);
          closeQzrrModal(root);
          if (!Number.isNaN(idx)) goTo(idx);
        };
      });
    };
    if (paperBtn) paperBtn.onclick = openPaper;
    if (paperChip) paperChip.onclick = openPaper;

    const secInfoToggle = root.querySelector("#qzrrSecInfoToggle");
    if (secInfoToggle) {
      secInfoToggle.onclick = () => {
        session._qzrrSecInfoClosed = !session._qzrrSecInfoClosed;
        const box = root.querySelector("#qzrrSecInfo");
        if (box) {
          box.classList.toggle("collapsed", !!session._qzrrSecInfoClosed);
          const caret = box.querySelector(".qzrr-sec-caret");
          if (caret) caret.textContent = session._qzrrSecInfoClosed ? "▼" : "▲";
          secInfoToggle.setAttribute("aria-expanded", session._qzrrSecInfoClosed ? "false" : "true");
        }
      };
    }

    const sideToggle = root.querySelector("#qzrrSideToggle");
    if (sideToggle) {
      sideToggle.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        setSideCollapsed(false);
      };
    }
    const qzrrClose = root.querySelector("#qzrrPalClose");
    if (qzrrClose) {
      qzrrClose.onclick = (e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        setSideCollapsed(true);
      };
    }

    // Restore session UI flags
    root.classList.toggle("qzrr-contrast", !!session._qzrrContrast);
    root.classList.toggle("qzrr-spacing", !!session._qzrrSpacing);
    root.classList.toggle("qzrr-dark", !!session._qzrrDark);
    root.classList.remove("qzrr-mag-on", "qzrr-dyslexia", "qzrr-focus");
    if (session._qzrrDark) root.setAttribute("data-test-theme", "dark");

    const syncTopZoomLbl = () => {
      const pct = Math.round(getTestZoom() * 100) + "%";
      root.querySelectorAll("#qzrrZoomLbl, #qzrrA11yZoomLbl, #qzrrZoomLblSide").forEach(el => {
        el.textContent = pct;
      });
      document.querySelectorAll("#qzrrA11yZoomLbl").forEach(el => { el.textContent = pct; });
    };
    const wireZoomPair = (outSel, inSel) => {
      const zoomOut = root.querySelector(outSel);
      const zoomIn = root.querySelector(inSel);
      if (zoomOut) {
        zoomOut.onclick = (e) => {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          bumpTestZoom(-2);
          applyTestZoomToDom(getTestZoom());
          syncTopZoomLbl();
        };
      }
      if (zoomIn) {
        zoomIn.onclick = (e) => {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          bumpTestZoom(2);
          applyTestZoomToDom(getTestZoom());
          syncTopZoomLbl();
        };
      }
    };
    wireZoomPair("#qzrrZoomOutTop", "#qzrrZoomInTop");
    wireZoomPair("#qzrrZoomOutSide", "#qzrrZoomInSide");
    applyTestZoomToDom(getTestZoom());
    syncTopZoomLbl();
    if (session._qzrrDark) {
      root.classList.add("qzrr-dark");
      root.setAttribute("data-test-theme", "dark");
    }
  }

  let _refreshBusy = false;
  let _navQueued = false; // Next/Prev pressed while paint in flight → re-run after
  let _optsLoadTimer = null;
  function questionTextNeedsHydrate(q) {
    if (!q) return false;
    return typeof MarksLive !== "undefined" && MarksLive.isQuestionIncomplete
      ? MarksLive.isQuestionIncomplete(q)
      : false;
  }

  /** Fast paint first; figures rewrite local/proxy then finalize (Marks-smooth) */
  function paintQuestionNow(main, q) {
    if (main && main.getAttribute("data-qx-painting") === "1") return;
    if (main) main.setAttribute("data-qx-painting", "1");
    try {
    if (q) {
      try {
        if (typeof qxRestoreQuestionContent === "function") qxRestoreQuestionContent(q);
      } catch (_) { /* */ }
      try {
        // Sync rewrite CDN → local Irodov/book maps when already loaded
        if (typeof QxImgClean !== "undefined" && QxImgClean.rewriteHtmlFigures) {
          if (q.q) q.q = QxImgClean.rewriteHtmlFigures(q.q);
          if (Array.isArray(q.options)) {
            q.options = q.options.map(o =>
              (o && /cdn-question-pool|cdn\.quizrr|https?:\/\/\.app|2026_modules/i.test(String(o)))
                ? QxImgClean.rewriteHtmlFigures(o) : o
            );
          }
        }
      } catch (_) { /* */ }
      try { pinQuestionDiagrams(q); } catch (_) { /* */ }
    }
    capturePaletteNavState(main);
    main.innerHTML = renderQuestion();
    bindEvents(main);
    restorePaletteNavState(main);
    setTestTheme(getTestTheme());
    setTestFontScale(getTestFontScale());
    try { applyTestZoomToDom(getTestZoom()); } catch (_) { /* */ }
    try { finalizeDiagrams(main); } catch (_) { /* */ }
    try {
      if (typeof QxImgClean !== "undefined") {
        if (QxImgClean.rewriteAllPoolImgs) QxImgClean.rewriteAllPoolImgs(main);
        if (QxImgClean.finalizeAll) QxImgClean.finalizeAll(main, q);
      }
    } catch (_) { /* */ }
    // Light math path only in CBT — never block Next on watermark/img scrub
    try {
      if (typeof Mx !== "undefined") {
        if (Mx.afterRenderLight) Mx.afterRenderLight(main);
        else Mx.afterRender(main);
        if (Mx.recoverHollowStemInDom) Mx.recoverHollowStemInDom(main);
      }
    } catch (_) { /* */ }
    marksPersistSession();
    // BNH: current figures high-priority + next/prev prefetch (non-blocking)
    try {
      if (typeof QxTestEnginePerf !== "undefined") {
        QxTestEnginePerf.afterQuestionPaint(main, {
          ids: session && session.ids,
          idx: session && session.idx,
          getQ: getQ
        });
      }
      try {
        document.dispatchEvent(new CustomEvent("qx:question-rendered", { detail: { root: main, q } }));
      } catch (_) { /* */ }
    } catch (_) { /* */ }
    // Background: load book figure maps + prepare + second finalize (Irodov / CDN)
    if (q && typeof QxImgClean !== "undefined") {
      const runFig = async () => {
        try {
          if (QxImgClean.loadBookFigureMaps) await QxImgClean.loadBookFigureMaps();
          if (QxImgClean.prepareQuestionFigures) await QxImgClean.prepareQuestionFigures(q);
        } catch (_) { /* */ }
        // Re-paint only if stem gained local figures and still on same Q
        try {
          if (!session || getQ(session.ids[session.idx]) !== q) return;
          if (QxImgClean.rewriteHtmlFigures) {
            const before = q.q;
            q.q = QxImgClean.rewriteHtmlFigures(q.q);
            // Re-paint only when we swapped CDN → local clean asset
            if (q.q !== before && /\/assets\/(diagrams|qx-figures|clean-diagrams)\//i.test(String(q.q))) {
              paintQuestionNow(main, q);
              return;
            }
          }
          if (QxImgClean.rewriteAllPoolImgs) QxImgClean.rewriteAllPoolImgs(main);
          if (QxImgClean.finalizeAll) QxImgClean.finalizeAll(main, q);
          if (typeof QxTestEnginePerf !== "undefined") {
            QxTestEnginePerf.prioritizeVisibleFigures(main);
          }
        } catch (_) { /* */ }
      };
      Promise.race([runFig(), new Promise(r => setTimeout(r, 4000))]).catch(() => {});
    }
    } finally {
      if (main) main.removeAttribute("data-qx-painting");
    }
  }

  async function refresh() {
    const main = getTestMountEl();
    if (!main || !session) return;
    if (_refreshBusy) {
      _navQueued = true;
      return;
    }
    _refreshBusy = true;
    _navQueued = false;
    try {
    const q = getQ(session.ids[session.idx]);
    try {
      if (q && typeof qxRestoreQuestionContent === "function") qxRestoreQuestionContent(q);
    } catch (_) { /* */ }
    try {
      if (q && typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion) {
        const optsOk = (q.options || []).some((o) => {
          const t = String(o || "").replace(/<[^>]+>/g, "").trim();
          return (t && !/^[A-D]$/i.test(t)) || /<img\b/i.test(String(o || ""));
        });
        if (!optsOk || /^Loading question/i.test(String(q.q || ""))) {
          await QuantrexCatalog.fillQuestion(q);
        }
      }
    } catch (_) { /* */ }
    const textNeed = questionTextNeedsHydrate(q);
    // Numerical NAT never needs option hydrate
    const isNumNow = q && isCurrentNumericalUI(q);
    const hasGoodOpts = q && (q.options || []).some(o => {
      const s = String(o || "");
      if (typeof qxOptionHasRealFigure === "function" && qxOptionHasRealFigure(s)) return true;
      if (/<img\b/i.test(s) && /cdn-question-pool|proxy-image|\/pyq\/|watermark_improved/i.test(s)) return true;
      const t = s.replace(/<img\b[^>]*>/gi, " ").replace(/<[^>]+>/g, "").trim();
      if (/^(figure|fig\.?|diagram|image|structure)$/i.test(t)) return false;
      return t.length > 0 && !/^[A-D]$/i.test(t);
    });
    const marksOff = typeof MarksLive !== "undefined" && MarksLive.STUDENT_MARKS_RUNTIME === false;
    const optsNeed = !marksOff && !isNumNow && !hasGoodOpts && q && !q._optsFetchFailed && q._marksId
      && typeof MarksLive !== "undefined" && (
        (MarksLive.isOptionsIncomplete && MarksLive.isOptionsIncomplete(q))
        || (MarksLive.isPlaceholderOptions && MarksLive.isPlaceholderOptions(q.options))
      );
    const figNeed = !marksOff && q && typeof MarksLive !== "undefined" && MarksLive.questionNeedsFigure
      ? MarksLive.questionNeedsFigure(q)
      : false;
    const fullNeed = !marksOff && q && typeof MarksLive !== "undefined" && MarksLive.needsFullQuestion
      ? MarksLive.needsFullQuestion(q)
      : false;

    const finishOptsFail = (qq) => {
      if (qq) qq._optsFetchFailed = true;
      clearTimeout(_optsLoadTimer);
      if (session && qq && getQ(session.ids[session.idx]) === qq) paintQuestionNow(main, qq);
    };

    if ((textNeed || figNeed || fullNeed) && q && typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion) {
      paintQuestionNow(main, q);
      try {
        await QuantrexCatalog.fillQuestion(q);
        if (typeof tsSyncQMap === "function") tsSyncQMap([session.ids[session.idx]]);
      } catch (e) {
        q._optsFetchFailed = true;
      }
      // If still no real options after hydrate, stop infinite Loading
      const stillBad = !(q.options || []).some(o => {
        const s = String(o || "");
        if (/<img\b|smiles/i.test(s)) return true;
        const t = s.replace(/<[^>]+>/g, "").trim();
        return t.length > 0 && !/^[A-D]$/i.test(t);
      });
      if (stillBad && !isCurrentNumericalUI(q)) q._optsFetchFailed = true;
      if (session && getQ(session.ids[session.idx]) === q) paintQuestionNow(main, q);
    } else if (optsNeed && q && typeof MarksLive !== "undefined" && MarksLive.isExamgoalQuestion && MarksLive.isExamgoalQuestion(q) && (q.options || []).length) {
      if (patchOptionsOnly(main)) { /* ok */ }
      else paintQuestionNow(main, q);
    } else if (optsNeed && q && typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion) {
      paintQuestionNow(main, q);
      clearTimeout(_optsLoadTimer);
      // Fail fast: 2.5s max on "Loading options…" (was 12s forever-feel)
      _optsLoadTimer = setTimeout(() => finishOptsFail(q), 2500);
      QuantrexCatalog.fillQuestion(q).then((updated) => {
        clearTimeout(_optsLoadTimer);
        const qq = updated || q;
        if (updated && updated.id != null && window.TS_ACTIVE_QMAP) {
          window.TS_ACTIVE_QMAP[updated.id] = updated;
          window.TS_ACTIVE_QMAP[String(updated.id)] = updated;
        }
        if (typeof tsSyncQMap === "function") tsSyncQMap([session.ids[session.idx]]);
        const ok = (qq.options || []).some(o => {
          const s = String(o || "");
          if (/<img\b|smiles/i.test(s)) return true;
          const t = s.replace(/<[^>]+>/g, "").trim();
          return t.length > 0 && !/^[A-D]$/i.test(t);
        });
        if (!ok) qq._optsFetchFailed = true;
        if (!patchOptionsOnly(main)) {
          if (session && getQ(session.ids[session.idx]) === qq) paintQuestionNow(main, qq);
        }
      }).catch(() => finishOptsFail(q));
      return;
    } else {
      if (typeof MarksLive !== "undefined" && MarksLive.prefetchQuestions) {
        const near = [session.idx - 1, session.idx + 1, session.idx + 2]
          .filter(i => i >= 0 && i < session.ids.length)
          .map(i => session.ids[i]);
        MarksLive.prefetchQuestions(near).catch(() => {});
      }
      paintQuestionNow(main, getQ(session.ids[session.idx]));
    }
    // Wire Retry button if present
    const retryBtn = main.querySelector("#qxOptsRetry");
    if (retryBtn) {
      retryBtn.onclick = () => {
        const qq = getQ(session.ids[session.idx]);
        if (qq) { delete qq._optsFetchFailed; delete qq._fullFetched; }
        _refreshBusy = false;
        refresh();
      };
    }
    restorePaletteNavState(main);
    } finally {
      _refreshBusy = false;
      if (_navQueued && session) {
        _navQueued = false;
        // User pressed Next again while busy — paint latest idx immediately
        setTimeout(() => { try { refresh(); } catch (_) { /* */ } }, 0);
      }
    }
  }

  function isCodedSingleCorrect(q) {
    if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.looksCodedSingleCorrect) {
      try { return !!QuantrexQFormat.looksCodedSingleCorrect(q); } catch (_) { /* */ }
    }
    const opts = ((q && q.options) || []).map((o) =>
      String(o || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    );
    if (opts.length < 3) return false;
    const coded = opts.filter((t) =>
      /^(1|2|3|4)\s+only\.?$/i.test(t)
      || /^both\b/i.test(t)
      || /^neither\b/i.test(t)
      || /^[a-e](?:\s*,\s*[a-e])*\s+and\s+[a-e]\s+only\.?$/i.test(t)
      || /^[a-e]\s+and\s+[a-e]\s+only\.?$/i.test(t)
    );
    return coded.length >= Math.min(3, opts.length);
  }

  function isOfficialAdvPaper() {
    try {
      if (!session) return false;
      if (session.paperFormat === "jee_advanced") return true;
      const meta = session.meta || {};
      return meta.exam === "jee_advanced" || meta.slug === "jee_advanced";
    } catch (_) { return false; }
  }

  /** True when user can pick A+B+C+D together (JEE Adv multi / one-or-more). */
  function isMultiSelectQuestion(q) {
    if (!q) return false;
    if (isCodedSingleCorrect(q)) return false;
    // Official JEE Advanced multi section only — not JEE Main / NDA chapter practice
    try {
      if (isOfficialAdvPaper() && session && session.sections && session.sections.length) {
        const sec = session.sections[currentSectionIdx()];
        if (sec && (sec.type === "MC" || /more correct|multiple correct|one or more/i.test(String(sec.label || "")))) {
          return true;
        }
      }
    } catch (_) { /* */ }
    if (q._advSection === "MC") return true;
    if (typeof QuantrexQFormat !== "undefined") {
      try {
        if (QuantrexQFormat.getType(q) === "multipleCorrect") return true;
        if (QuantrexQFormat.looksMultipleCorrect && QuantrexQFormat.looksMultipleCorrect(q)) return true;
      } catch (_) { /* */ }
    }
    const t = String(q.questionType || q.type || "").toLowerCase();
    if (/multiple|multi|more.?correct|one.?or.?more/.test(t)) return true;
    if (Array.isArray(q.answers) && q.answers.length > 1) return true;
    const stem = String(q.q || "");
    if (/\bis\s*\(are\)\s+TRUE\b/i.test(stem)) return true;
    if (/\bone or more than one\s+(?:of\s+the\s+)?(?:correct\s+)?(?:option|answer|statement)/i.test(stem)) return true;
    return false;
  }

  function selectAnswer(idx) {
    if (!session || session.submitted) return;
    const q = getQ(session.ids[session.idx]);
    const multi = isMultiSelectQuestion(q);
    if (multi) {
      if (isOfficialAdvPaper() && !isCodedSingleCorrect(q)) {
        try {
          q.questionType = "multipleCorrect";
          q.type = "multipleCorrect";
          q._advSection = "MC";
        } catch (_) { /* */ }
      }
      let sel = session.answers[session.idx];
      if (!Array.isArray(sel)) {
        // Convert previous single pick into multi set
        sel = (sel != null && sel !== "" && typeof sel === "number") ? [sel] : [];
      }
      if (sel.includes(idx)) sel = sel.filter(x => x !== idx);
      else sel = [...sel, idx].sort((a, b) => a - b);
      if (!sel.length) delete session.answers[session.idx];
      else session.answers[session.idx] = sel;
    } else {
      session.answers[session.idx] = idx;
    }
    session.visited.add(session.idx);
    session.review.delete(session.idx);
    const main = getTestMountEl();
    if (patchAnswerUI(main)) return;
    refresh();
  }

  function clearResponse() {
    if (!session) return;
    delete session.answers[session.idx];
    const main = getTestMountEl();
    if (patchAnswerUI(main)) return;
    refresh();
  }

  function toggleReview() {
    if (!session) return;
    if (session.review.has(session.idx)) session.review.delete(session.idx);
    else session.review.add(session.idx);
    const main = getTestMountEl();
    if (patchReviewUI(main)) return;
    refresh();
  }

  function markReviewAndNext() {
    if (!session) return;
    session.review.add(session.idx);
    session.visited.add(session.idx);
    if (session.idx < session.ids.length - 1) goTo(session.idx + 1);
    else refresh();
  }

  function recordQTime(fromIdx) {
    if (!session || fromIdx == null || fromIdx < 0) return;
    if (!session.qTimes) session.qTimes = {};
    const now = Date.now();
    const enter = session._qEnterAt || now;
    const dt = Math.max(0, Math.round((now - enter) / 1000));
    session.qTimes[fromIdx] = (session.qTimes[fromIdx] || 0) + dt;
    session._qEnterAt = now;
  }

  function goTo(idx) {
    if (!session || idx < 0 || idx >= session.ids.length) return;
    if (idx === session.idx) {
      // Same question (e.g. Chemistry tab while already on first Chem Q) —
      // still pin the right-side palette to this subject, never jump to Maths.
      try {
        const root = getTestMountEl();
        if (root) restorePaletteNavState(root);
      } catch (_) { /* */ }
      return;
    }
    // Dwell time on previous question (Marks time charts)
    recordQTime(session.idx);
    // Always update index first so rapid Next taps advance even if paint lags
    session.visited.add(session.idx);
    session.idx = idx;
    session.visited.add(idx);
    session._qEnterAt = Date.now();
    // BNH: warm next figure while paint starts
    try {
      if (typeof QxTestEnginePerf !== "undefined" && session.ids) {
        QxTestEnginePerf.prefetchWindow(session.ids, idx, getQ);
      }
    } catch (_) { /* */ }
    refresh();
  }

  function skipQuestion() {
    if (!session) return;
    delete session.answers[session.idx];
    session.visited.add(session.idx);
    if (session.idx < session.ids.length - 1) goTo(session.idx + 1);
    else refresh();
  }

  function saveAndNext() {
    if (!session) return;
    // Debounce only double-fire within 80ms (not multi-tap lag)
    if (window._qxSaveNextLock && Date.now() - window._qxSaveNextLock < 80) return;
    window._qxSaveNextLock = Date.now();
    session.visited.add(session.idx);
    if (session.idx < session.ids.length - 1) goTo(session.idx + 1);
    else confirmSubmit();
  }

  function leaveTestUi(testType, ret) {
    try {
      if (typeof exitMarksTestMode === "function") exitMarksTestMode();
    } catch (_) { /* */ }
    try {
      if (testType === "testseries") {
        if (window.TS_STANDALONE && typeof tsRenderStandalone === "function") {
          tsRenderStandalone();
          return;
        }
        if (typeof go === "function") {
          go("testseries");
          return;
        }
      }
      if (typeof go === "function") go(ret || "tests");
    } catch (e) {
      console.warn("leaveTestUi", e);
      try {
        if (typeof go === "function") go("tests");
      } catch (_) { /* */ }
    }
  }

  function stopAndSave() {
    if (!session) return;
    const hadPersist = !!session.persistKey;
    const testType = session.testType;
    const ret = testType === "testseries" ? "testseries" : (session.returnTo || "tests");
    const qAt = (session.idx || 0) + 1;
    try { stopTimer(); } catch (_) { /* */ }
    try {
      if (session.persistKey) {
        marksPersistSession();
        if (session.testType === "testseries" && session.meta && session.meta.testId && typeof tsSaveAttempt === "function") {
          tsSaveAttempt(session.meta.testId, {
            status: "inProgress",
            title: session.title,
            categoryId: session.meta.categoryId || null,
            lastQ: qAt
          });
        }
        if (session.testType === "pyqmock" && session.meta && typeof pyqSaveAttempt === "function") {
          const attemptKey = typeof pyqAttemptKey === "function"
            ? pyqAttemptKey(session.meta.slug, session.meta.source) : null;
          if (attemptKey) pyqSaveAttempt(attemptKey, { status: "inProgress", slug: session.meta.slug, source: session.meta.source, title: session.title });
        }
      } else if (session.marksMode) {
        marksPersistSession();
      } else {
        marksClearSession();
      }
    } catch (e) {
      console.warn("stopAndSave persist", e);
    }
    session = null;
    leaveTestUi(testType, ret);
    const resumeHint = testType === "testseries" ? "Test Series → same test → Resume" : "PYQ Mock Tests → Resume";
    if (typeof showToast === "function") {
      showToast(hadPersist
        ? `✓ Saved at Q${qAt}. Resume from ${resumeHint}.`
        : "✓ Left test.");
    }
  }

  function quit(force) {
    if (!session) {
      leaveTestUi(null, "tests");
      return;
    }
    // Confirm once (unless force)
    if (!force && typeof mtkShowStopModal === "function") {
      try {
        mtkShowStopModal("exit");
        return;
      } catch (e) {
        console.warn("modal fail, saving directly", e);
      }
    }
    if (session.persistKey || session.marksMode) {
      stopAndSave();
      return;
    }
    try { stopTimer(); } catch (_) { /* */ }
    const ret = session.returnTo || "tests";
    const testType = session.testType;
    session = null;
    leaveTestUi(testType, ret);
  }

  function confirmSubmit() {
    // BNH: already submitted → ignore; debounce only rapid double-click on confirm
    if (!session || session.submitted) return;
    if (typeof mtkShowSubmitModal === "function") {
      mtkShowSubmitModal();
      return;
    }
    const s = stats();
    const msg = session.marksMode
      ? `Submit test now?\n\nAnswered: ${s.answered}\nNot Answered: ${s.skipped}\nNot Visited: ${s.unvisited}\nMarked for Review: ${s.review}`
      : `Submit now?\n\nAnswered: ${s.answered}\nMarked for review: ${s.review}\nSkipped/Unvisited: ${s.unvisited + s.skipped}`;
    if (confirm(msg)) {
      if (window._qxConfirmSubmitLock && Date.now() - window._qxConfirmSubmitLock < 1500) return;
      window._qxConfirmSubmitLock = Date.now();
      submit(false);
    }
  }

  function computeResults() {
    // Flush dwell on current question before scoring
    try { recordQTime(session.idx); } catch (_) { /* */ }
    const scoring = session.scoring;
    let correct = 0, wrong = 0, skipped = 0, notVisited = 0, score = 0;
    const breakdown = { subject: {}, difficulty: {} };
    let timeCorrect = 0, timeWrong = 0, timeSkip = 0;
    const rows = session.ids.map((id, i) => {
      const q = getQ(id);
      const chosen = session.answers[i];
      let isCorrect = false;
      let isWrong = false;
      let isPartial = false;
      const isSkip = chosen === undefined || (typeof QuantrexQFormat !== "undefined" && q && !QuantrexQFormat.isAnswered(q, chosen));
      const visited = session.visited && session.visited.has(i);
      const qSec = (session.qTimes && session.qTimes[i]) || 0;
      if (!isSkip && q) {
        const graded = typeof QuantrexQFormat !== "undefined"
          ? QuantrexQFormat.grade(q, chosen)
          : { correct: chosen === q.answer, partial: false };
        isCorrect = graded.correct;
        isPartial = graded.partial;
        isWrong = !isCorrect && !isPartial;
      }
      // JEE Advanced type-aware marks (SC +3/−1, MC +4/−2 partial, NUM +4/0)
      const secType = (q && typeof questionSectionType === "function") ? questionSectionType(q) : "SC";
      const isMulti = secType === "MC" || (q && String(q.questionType || "").toLowerCase().includes("multiple"));
      const isNumQ = secType === "NUM" || (q && (typeof isNumericalQuestion === "function" ? isNumericalQuestion(q) : false));
      if (isCorrect) {
        correct++;
        let add = scoring.correct;
        if (isMulti && scoring.multiCorrect != null) add = scoring.multiCorrect;
        else if (isNumQ && scoring.numericalCorrect != null) add = scoring.numericalCorrect;
        score += add;
        timeCorrect += qSec;
      } else if (isPartial) {
        // Official Adv multi partial: +3/+2/+1 from grade.partialLevel when present
        wrong++;
        let pAdd = scoring.partial != null ? scoring.partial : Math.round(scoring.correct / 2);
        try {
          const g2 = typeof QuantrexQFormat !== "undefined" ? QuantrexQFormat.grade(q, chosen) : null;
          if (g2 && g2.partialLevel === 3) pAdd = 3;
          else if (g2 && g2.partialLevel === 2) pAdd = 2;
          else if (g2 && g2.partialLevel === 1) pAdd = 1;
        } catch (_) { /* */ }
        score += pAdd;
        timeWrong += qSec;
      } else if (isWrong) {
        wrong++;
        let wrongPts = scoring.wrong;
        if (isNumQ && scoring.numericalWrong != null) wrongPts = scoring.numericalWrong;
        else if (isMulti && scoring.multiWrong != null) wrongPts = scoring.multiWrong;
        score += (wrongPts != null ? wrongPts : -1);
        timeWrong += qSec;
      }
      else {
        skipped++;
        score += scoring.unattempted;
        timeSkip += qSec;
        if (!visited) notVisited++;
      }
      if (q) {
        const sub = q.subject || "Other";
        const diff = q.difficulty || "Medium";
        if (!breakdown.subject[sub]) {
          breakdown.subject[sub] = {
            correct: 0, wrong: 0, total: 0, skipped: 0, notVisited: 0,
            timeSec: 0, timeCorrect: 0, timeWrong: 0, timeSkip: 0, score: 0
          };
        }
        if (!breakdown.difficulty[diff]) breakdown.difficulty[diff] = { correct: 0, wrong: 0, total: 0 };
        breakdown.subject[sub].total++;
        breakdown.subject[sub].timeSec += qSec;
        breakdown.difficulty[diff].total++;
        if (isCorrect) {
          breakdown.subject[sub].correct++;
          breakdown.subject[sub].timeCorrect += qSec;
          breakdown.subject[sub].score += scoring.correct;
          breakdown.difficulty[diff].correct++;
        }
        if (isWrong || isPartial) {
          breakdown.subject[sub].wrong++;
          breakdown.subject[sub].timeWrong += qSec;
          const isNum = q && (typeof isNumericalQuestion === "function" ? isNumericalQuestion(q) : false);
          const wrongPts = (isNum && scoring.numericalWrong != null) ? scoring.numericalWrong : scoring.wrong;
          breakdown.subject[sub].score += (isPartial
            ? (scoring.partial != null ? scoring.partial : Math.round(scoring.correct / 2))
            : (wrongPts != null ? wrongPts : -1));
          breakdown.difficulty[diff].wrong++;
        }
        if (isSkip) {
          breakdown.subject[sub].skipped = (breakdown.subject[sub].skipped || 0) + 1;
          breakdown.subject[sub].timeSkip += qSec;
          if (!visited) breakdown.subject[sub].notVisited = (breakdown.subject[sub].notVisited || 0) + 1;
        }
      }
      if (chosen !== undefined && q && typeof STATE !== "undefined" && STATE.markSolved) STATE.markSolved(id, isCorrect);
      return { q, chosen, isCorrect, isWrong, isSkip, idx: i, timeSec: qSec };
    });
    const total = session.ids.length;
    const pct = total ? Math.round(correct / total * 100) : 0;
    const timeUsed = Math.max(0, Math.round((Date.now() - session.startedAt) / 1000));
    // Not attempted = skipped that were visited; notVisited separate
    const notAttempted = Math.max(0, skipped - notVisited);
    // If dwell sum is tiny (instant submit), fall back to wall-clock on skip bucket
    const dwellSum = timeCorrect + timeWrong + timeSkip;
    if (dwellSum < 1 && timeUsed > 0) {
      timeSkip = timeUsed;
    }
    const maxScore = (session.totalMarks != null && session.totalMarks > 0)
      ? session.totalMarks
      : (total * (scoring.correct != null ? scoring.correct : 4));
    const durationMin = session.catalogDurationMin
      || (session.durationSec != null ? Math.round(session.durationSec / 60) : 180);
    return {
      correct, wrong, skipped, notVisited, notAttempted, score, pct, total, rows, breakdown,
      timeUsed, maxScore, durationMin,
      timeCorrect, timeWrong, timeSkip,
      sections: session.sections || null,
      qTimes: session.qTimes ? { ...session.qTimes } : {}
    };
  }

  /** Format seconds as Marks "0.15 min" style */
  function fmtMarksMin(sec) {
    const s = Math.max(0, Number(sec) || 0);
    const m = s / 60;
    if (m < 10) return m.toFixed(2) + " min";
    if (m < 100) return m.toFixed(1) + " min";
    return Math.round(m) + " min";
  }

  function subjectIcon(sub) {
    const s = String(sub || "").toLowerCase();
    if (/math/.test(s)) return "∑";
    if (/phys/.test(s)) return "⚛";
    if (/chem/.test(s)) return "⚗";
    if (/bio|bot|zoo/.test(s)) return "🧬";
    return "📘";
  }

  /** Resolve latest question object (bank may have solution even if row snapshot is thin) */
  function resolveAnalysisQ(r) {
    if (!r) return null;
    let q = r.q;
    const id = (q && q.id) != null ? q.id : r.id;
    if (id != null && typeof getQ === "function") {
      try {
        const live = getQ(id);
        if (live) {
          // Prefer live bank fields for solution/options when row was snapshotted thin
          q = Object.assign({}, live, q || {}, {
            solution: (live.solution && String(live.solution).length >= String((q && q.solution) || "").length)
              ? live.solution
              : ((q && q.solution) || live.solution || live.sol || live.explanation || ""),
            options: (live.options && live.options.length) ? live.options : ((q && q.options) || live.options),
            q: (live.q && String(live.q).length >= String((q && q.q) || "").length) ? live.q : ((q && q.q) || live.q)
          });
        }
      } catch (_) { /* */ }
    }
    return q;
  }

  function hasSolutionText(solRaw) {
    const s = String(solRaw || "");
    if (!s.trim()) return false;
    if (typeof MarksLive !== "undefined" && MarksLive.hasRealSolution) return MarksLive.hasRealSolution(s);
    return !!s.replace(/<[^>]+>/g, "").trim();
  }

  /** Marks-style continuous solution (no scattered step cards / badges) */
  function renderSolutionBodyHtml(q, solRaw) {
    if (typeof QuantrexSolution !== "undefined" && QuantrexSolution.renderBlock) {
      try {
        return QuantrexSolution.renderBlock(q, solRaw);
      } catch (_) { /* fall through */ }
    }
    if (!hasSolutionText(solRaw)) {
      return `<div class="qx-sol-card"><div class="qx-sol-card-h">Solution</div><p class="qx-sol-missing">Solution not available.</p></div>`;
    }
    let raw = String(solRaw || "");
    try {
      if (typeof QuantrexSolution !== "undefined" && QuantrexSolution.flattenMarksSolTables) {
        raw = QuantrexSolution.flattenMarksSolTables(raw);
      }
      if (typeof QuantrexSolution !== "undefined" && QuantrexSolution.repairSolutionProse) {
        raw = QuantrexSolution.repairSolutionProse(raw);
      }
      if (typeof QuantrexSolution !== "undefined" && QuantrexSolution.cleanSolutionFigHtml) {
        raw = QuantrexSolution.cleanSolutionFigHtml(raw);
      }
      if (typeof QuantrexSolution !== "undefined" && QuantrexSolution.polishScientificSymbols) {
        raw = QuantrexSolution.polishScientificSymbols(raw);
      }
    } catch (_) { /* */ }
    let body = "";
    try {
      if (typeof Mx !== "undefined" && Mx.html) body = Mx.html(raw);
      else body = raw;
    } catch (_) {
      body = raw;
    }
    body = String(body || "")
      .replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>")
      .replace(/\n{3,}/g, "\n\n");
    if (!String(body).replace(/<[^>]+>/g, "").trim()) body = htmlContent(raw);
    return `<div class="qx-sol-card">
      <div class="qx-sol-card-h">Solution</div>
      <div class="qx-content sol-body qx-sol-flow">${body}</div>
    </div>`;
  }

  /** Fix figures in a painted solution/question row (proxy + onerror + QxImgClean) */
  function fixRowFigures(row, q) {
    if (!row) return;
    try {
      if (q && typeof QxImgClean !== "undefined") {
        if (QxImgClean.rememberQuestionRaw) QxImgClean.rememberQuestionRaw(q);
        if (QxImgClean.finalizeAll) QxImgClean.finalizeAll(row, q);
      }
    } catch (_) { /* */ }
    row.querySelectorAll("img").forEach(img => {
      try {
        let src = img.getAttribute("src") || "";
        if (!src) return;
        if (/^https?:\/\/\.app\//i.test(src)) {
          src = src.replace(/^https?:\/\/\.app\//i, "https://cdn-question-pool.getmarks.app/");
        }
        if (/cdn-question-pool\.getmarks|cdn\.quizrr\.in|getmarks\.app\/pyq/i.test(src)
          && !/\/api\/proxy-image|\/api\/restore-image|data:/i.test(src)) {
          const prox = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc)
            ? QxOwnedFigs.displaySrc(src)
            : `/api/proxy-image?url=${encodeURIComponent(src)}&clean=1&v=qxfig110`;
          const stored = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.ownedFigureUrl)
            ? (QxOwnedFigs.ownedFigureUrl(src) || src)
            : src;
          if (!img.getAttribute("data-qx-orig-src")) img.setAttribute("data-qx-orig-src", stored);
          if (prox) img.setAttribute("src", prox);
        }
        img.setAttribute("loading", "eager");
        img.setAttribute("referrerpolicy", "no-referrer");
        img.classList.add("qx-pool-fig", "mk-sol-fig");
        if (!img.getAttribute("onerror")) {
          img.setAttribute("onerror",
            "if(window.QxOwnedFigs&&QxOwnedFigs.retryOnError){QxOwnedFigs.retryOnError(this);return;}var o=this.getAttribute('data-qx-storage-src')||this.getAttribute('data-qx-orig-src')||'';var cur=this.getAttribute('src')||'';this.style.opacity='1';this.style.background='#fff';this.style.display='block';if(!this.dataset.qxFigTry){this.dataset.qxFigTry='1';if(o&&/getmarks\\.app|quizrr\\.in/i.test(o)&&window.QxOwnedFigs&&QxOwnedFigs.ownedFigureUrl){var m=QxOwnedFigs.ownedFigureUrl(o);if(m)o=m;}if(o&&cur!==o&&!/getmarks\\.app|quizrr\\.in/i.test(o)){this.src=o;return;}if(o){this.src='/api/proxy-image?url='+encodeURIComponent(o)+'&clean=1&v=qxfig110';return;}}");
        }
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        img.style.display = "block";
        img.style.margin = "10px auto";
        img.style.opacity = "1";
        img.style.background = "#fff";
      } catch (_) { /* */ }
    });
  }

  /** Marks-style solution card — one Q at a time (smooth like getmarks.app) */
  function renderReviewRow(r, i, opts) {
    const force = opts && opts.force;
    const q = resolveAnalysisQ(r);
    if (!q) {
      return `<div class="rv-row mk-sol-row skip" data-rv-idx="${i}" data-rv-ready="0" hidden>
        <div class="mk-sol-qhead"><span class="mk-sol-qnum">Q${i + 1}</span></div>
        <div class="empty">Question data missing.</div>
      </div>`;
    }
    // Lazy shell: only full paint when active (avoids 75× KaTeX freeze on submit)
    if (!force) {
      const statusTag = r.isCorrect ? "correct" : r.isSkip ? "skip" : "wrong";
      const statusDot = r.isCorrect ? "ok" : r.isSkip ? "skip" : "no";
      return `<div class="rv-row mk-sol-row ${statusTag}" data-rv-idx="${i}" data-rv-ready="0" data-rv-sub="${String(q.subject || "").replace(/"/g, "")}" hidden>
        <div class="mk-sol-qhead">
          <span class="mk-sol-qnum">Q${i + 1}</span>
          <span class="mk-sol-status-dot ${statusDot}"></span>
        </div>
        <div class="mk-sol-loading">Opening solution…</div>
      </div>`;
    }

    const solRaw = q.solution || q.sol || q.explanation || "";
    const isNum = typeof isNumericalQuestion === "function" && isNumericalQuestion(q);
    const corIdx = typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.correctIndices
      ? (QuantrexQFormat.correctIndices(q)[0])
      : q.answer;
    const corNum = typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.correctNumerical
      ? QuantrexQFormat.correctNumerical(q)
      : (q.correctValue != null ? String(q.correctValue) : "");

    let optsHtml = "";
    if (isNum) {
      optsHtml = `<div class="mk-sol-num">
        <div class="mk-sol-num-lab">Your answer</div>
        <div class="mk-sol-num-val ${r.isSkip ? "skip" : r.isCorrect ? "ok" : "no"}">${r.isSkip ? "—" : String(r.chosen != null ? r.chosen : "—")}</div>
        <div class="mk-sol-num-lab">Correct answer</div>
        <div class="mk-sol-num-val ok">${corNum || "—"}</div>
      </div>`;
    } else {
      const optsArr = q.options || [];
      optsHtml = `<div class="mk-sol-opts">${optsArr.map((o, oi) => {
        const letter = String.fromCharCode(65 + oi);
        const isCor = oi === corIdx || (Array.isArray(corIdx) && corIdx.includes(oi));
        const isCh = !r.isSkip && (r.chosen === oi || (Array.isArray(r.chosen) && r.chosen.includes(oi)));
        let cls = "mk-sol-opt";
        if (isCor) cls += " correct";
        if (isCh && !isCor) cls += " wrong";
        if (isCh && isCor) cls += " chosen";
        const mark = isCor ? `<span class="mk-sol-check" aria-hidden="true">✓</span>` : (isCh ? `<span class="mk-sol-x" aria-hidden="true">✗</span>` : "");
        return `<div class="${cls}">
          <span class="mk-sol-letter">${letter}</span>
          <span class="mk-sol-opt-text qx-content">${htmlContent(o)}</span>
          ${mark}
        </div>`;
      }).join("")}</div>`;
    }

    const sol = renderSolutionBodyHtml(q, solRaw);
    const statusTag = r.isCorrect ? "correct" : r.isSkip ? "skip" : "wrong";
    const statusDot = r.isCorrect ? "ok" : r.isSkip ? "skip" : "no";
    const sub = (q.subject || "").replace(/"/g, "");
    // Stem with figure-aware body when possible
    let stemHtml = "";
    try {
      pinQuestionDiagrams(q);
      if (typeof QxImgClean !== "undefined" && QxImgClean.buildQuestionBodyHtml) {
        try { if (QxImgClean.pinOriginalQuestion) QxImgClean.pinOriginalQuestion(q); } catch (_) { /* */ }
        const stemSrc = QxImgClean.bestStemHtml ? QxImgClean.bestStemHtml(q, q.q) : (q._qxOrigStem || q._qxBankQ || q.q);
        stemHtml = QxImgClean.buildQuestionBodyHtml(q.id, stemSrc, htmlContent, q);
      } else {
        stemHtml = `<div class="mk-sol-stem qx-content">${htmlContent(q.q)}</div>`;
      }
    } catch (_) {
      stemHtml = `<div class="mk-sol-stem qx-content">${htmlContent(q.q)}</div>`;
    }
    if (!/mk-sol-stem|mtk-q-text/i.test(stemHtml)) {
      stemHtml = `<div class="mk-sol-stem qx-content rv-q">${stemHtml}</div>`;
    } else {
      stemHtml = stemHtml.replace(/mtk-q-text/g, "mtk-q-text mk-sol-stem rv-q");
    }
    return `<div class="rv-row mk-sol-row ${statusTag}" data-rv-idx="${i}" data-rv-ready="1" data-rv-sub="${sub}" hidden>
      <div class="mk-sol-qhead">
        <span class="mk-sol-qnum">Q${i + 1}</span>
        <span class="mk-sol-status-dot ${statusDot}" title="${r.isCorrect ? "Correct" : r.isSkip ? "Not Attempted" : "Incorrect"}"></span>
      </div>
      ${stemHtml}
      ${optsHtml}
      ${sol}
    </div>`;
  }

  /** Marks solution Overview rail — global numbers by section + correct/wrong/NA counts */
  function renderMarksReviewRail(data) {
    let okN = 0, noN = 0, skipN = 0;
    data.rows.forEach(r => {
      if (!r.q) return;
      if (r.isCorrect) okN++;
      else if (r.isSkip) skipN++;
      else noN++;
    });
    const sections = data.sections || null;
    let groupsHtml = "";
    if (sections && sections.length) {
      groupsHtml = sections.map(sec => {
        const start = Number(sec.start) || 0;
        const count = Number(sec.count) || 0;
        const cells = [];
        for (let i = start; i < start + count && i < data.rows.length; i++) {
          const r = data.rows[i];
          if (!r) continue;
          const st = r.isCorrect ? "ok" : r.isSkip ? "skip" : "no";
          cells.push(`<button type="button" class="qx-rv-qpill ${st}" data-rv-jump="${i}">${i + 1}</button>`);
        }
        const lab = String(sec.shortLabel || sec.label || "").toUpperCase();
        return `<div class="qx-rv-subj-block" data-sol-sec="${lab.replace(/"/g, "")}">
          <div class="qx-rv-subj-name">${lab}</div>
          <div class="qx-rv-subj-grid">${cells.join("")}</div>
        </div>`;
      }).join("");
    } else {
      const subjectOrder = ["Mathematics", "Physics", "Chemistry", "Biology", "Botany", "Zoology"];
      const bySub = {};
      data.rows.forEach((r, i) => {
        if (!r.q) return;
        const sub = r.q.subject || "Other";
        if (!bySub[sub]) bySub[sub] = [];
        bySub[sub].push({ i, r });
      });
      const subs = subjectOrder.filter(s => bySub[s]).concat(Object.keys(bySub).filter(s => !subjectOrder.includes(s)));
      groupsHtml = subs.map(sub => {
        const cells = bySub[sub].map(({ i, r }) => {
          const st = r.isCorrect ? "ok" : r.isSkip ? "skip" : "no";
          return `<button type="button" class="qx-rv-qpill ${st}" data-rv-jump="${i}">${i + 1}</button>`;
        }).join("");
        return `<div class="qx-rv-subj-block">
          <div class="qx-rv-subj-name">${sub.toUpperCase()}</div>
          <div class="qx-rv-subj-grid">${cells}</div>
        </div>`;
      }).join("");
    }
    return `<div class="mk-sol-overview-head">Overview</div>
      <div class="mk-sol-overview-stats">
        <div class="mk-sol-st ok"><span class="mk-sol-st-num">${okN}</span><span class="mk-sol-st-lab"><strong>${okN} Qs</strong> Answered Correct</span></div>
        <div class="mk-sol-st no"><span class="mk-sol-st-num">${noN}</span><span class="mk-sol-st-lab"><strong>${noN} Qs</strong> Answered Wrong</span></div>
        <div class="mk-sol-st skip"><span class="mk-sol-st-num">${skipN}</span><span class="mk-sol-st-lab"><strong>${skipN} Qs</strong> Not Attempted</span></div>
      </div>
      <div class="mk-sol-overview-total">${data.total} Qs</div>
      ${groupsHtml}`;
  }

  async function hydrateRowSolution(r) {
    if (!r) return r;
    let q = resolveAnalysisQ(r);
    if (!q) return r;
    const sol0 = q.solution || q.sol || q.explanation || "";
    const stem0 = String(q.q || "").replace(/<[^>]+>/g, " ");
    const hollow = typeof QuantrexSolution !== "undefined" && QuantrexSolution.looksHollowStem
      ? QuantrexSolution.looksHollowStem(q.q)
      : /\bLet\s+[.,;:]\s/.test(stem0);
    if (hasSolutionText(sol0) && !hollow) {
      r.q = q;
      return r;
    }
    // Pull full stem + solution from Marks when bank is thin / math dropped
    if (typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion) {
      try {
        await Promise.race([
          QuantrexCatalog.fillQuestion(q),
          new Promise(res => setTimeout(res, 8000))
        ]);
        q = resolveAnalysisQ(Object.assign({}, r, { q }));
        r.q = q;
      } catch (_) { /* keep partial */ }
    }
    return r;
  }

  function paintSolRow(listEl, data, idx) {
    if (!listEl || !data || !data.rows) return null;
    const r = data.rows[idx];
    if (!r) return null;
    let row = listEl.querySelector(`.rv-row[data-rv-idx="${idx}"]`);
    const html = renderReviewRow(r, idx, { force: true });
    if (!row) {
      listEl.insertAdjacentHTML("beforeend", html);
      row = listEl.querySelector(`.rv-row[data-rv-idx="${idx}"]`);
    } else {
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      const neu = tmp.firstElementChild;
      if (neu) row.replaceWith(neu);
      row = listEl.querySelector(`.rv-row[data-rv-idx="${idx}"]`);
    }
    if (row) {
      row.dataset.rvReady = "1";
      row.classList.add("active");
      row.removeAttribute("hidden");
      try { fixRowFigures(row, resolveAnalysisQ(r)); } catch (_) { /* */ }
    }
    return row;
  }

  function bindReviewSplit(root, data) {
    if (!root) return;
    const analysis = data || window._qxLastAnalysis || null;
    const main = root.querySelector(".qx-review-main") || root.querySelector(".mk-sol-main") || root;
    const listEl = root.querySelector(".marks-review-list") || root.querySelector(".review-list") || main;
    const total = analysis && analysis.rows ? analysis.rows.length
      : root.querySelectorAll(".rv-row").length;

    const show = async (idx) => {
      const n = Math.max(0, Math.min(total - 1, parseInt(idx, 10) || 0));
      root.dataset.curRv = String(n);
      // Hide others
      root.querySelectorAll(".rv-row").forEach(row => {
        const on = parseInt(row.dataset.rvIdx, 10) === n;
        row.classList.toggle("active", on);
        if (on) row.removeAttribute("hidden");
        else row.setAttribute("hidden", "");
      });
      root.querySelectorAll(".qx-rv-qpill").forEach(p => {
        p.classList.toggle("cur", parseInt(p.dataset.rvJump, 10) === n);
      });
      // Sync section tabs
      const secTabs = root.querySelectorAll(".mk-sol-sec-tab");
      if (secTabs.length) {
        let activeTab = null;
        secTabs.forEach(tab => {
          const start = parseInt(tab.dataset.secStart, 10) || 0;
          const next = tab.nextElementSibling;
          // mark last tab whose start <= n
          if (start <= n) activeTab = tab;
        });
        // Prefer section that owns n
        let best = null;
        secTabs.forEach(tab => {
          const start = parseInt(tab.dataset.secStart, 10) || 0;
          if (start <= n && (!best || start >= (parseInt(best.dataset.secStart, 10) || 0))) best = tab;
        });
        secTabs.forEach(t => t.classList.toggle("active", t === best));
      }

      // Lazy full paint for this Q only
      if (analysis && analysis.rows && analysis.rows[n]) {
        const r = analysis.rows[n];
        const q0 = resolveAnalysisQ(r);
        const needHydrate = q0 && !hasSolutionText(q0.solution || q0.sol || q0.explanation || "");
        let row = listEl.querySelector(`.rv-row[data-rv-idx="${n}"]`);
        if (!row || row.dataset.rvReady !== "1" || needHydrate) {
          if (row && needHydrate) {
            const load = row.querySelector(".mk-sol-loading") || row.querySelector(".mk-sol-empty");
            if (load) load.innerHTML = "Loading full solution…";
          }
          if (needHydrate) await hydrateRowSolution(r);
          row = paintSolRow(listEl, analysis, n);
        } else {
          row.classList.add("active");
          row.removeAttribute("hidden");
        }
        if (main) main.scrollTop = 0;
        try { if (row) fixRowFigures(row, resolveAnalysisQ(r)); } catch (_) { /* */ }
        // Math only on active row (smooth)
        try {
          if (row && typeof Mx !== "undefined") {
            if (Mx.afterRenderLight) Mx.afterRenderLight(row);
            else if (Mx.afterRender) Mx.afterRender(row);
          }
        } catch (_) { /* */ }
        // Second pass for late-loading figures
        if (row) {
          setTimeout(() => {
            try {
              fixRowFigures(row, resolveAnalysisQ(r));
              if (typeof Mx !== "undefined" && Mx.afterRenderLight) Mx.afterRenderLight(row);
            } catch (_) { /* */ }
          }, 120);
        }
      }

      const prev = root.querySelector("#mkSolPrev");
      const next = root.querySelector("#mkSolNext");
      if (prev) prev.disabled = n <= 0;
      if (next) next.disabled = n >= total - 1;
    };

    // Event delegation — every button works even after re-paint
    if (!root._mkSolBound) {
      root._mkSolBound = true;
      root.addEventListener("click", (ev) => {
        const t = ev.target.closest("[data-rv-jump], #mkSolPrev, #mkSolNext, #mkSolViewQ, .mk-sol-sec-tab");
        if (!t || !root.contains(t)) return;
        if (t.hasAttribute("data-rv-jump")) {
          ev.preventDefault();
          show(parseInt(t.getAttribute("data-rv-jump"), 10));
          return;
        }
        if (t.id === "mkSolPrev") {
          ev.preventDefault();
          show(Math.max(0, (parseInt(root.dataset.curRv, 10) || 0) - 1));
          return;
        }
        if (t.id === "mkSolNext" || t.id === "mkSolViewQ") {
          ev.preventDefault();
          // View Question / Save & Next → next (Marks-like navigation)
          const cur = parseInt(root.dataset.curRv, 10) || 0;
          if (t.id === "mkSolViewQ") {
            const active = root.querySelector(`.rv-row[data-rv-idx="${cur}"] .mk-sol-stem`);
            if (active) active.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
          }
          show(Math.min(total - 1, cur + 1));
          return;
        }
        if (t.classList.contains("mk-sol-sec-tab")) {
          ev.preventDefault();
          root.querySelectorAll(".mk-sol-sec-tab").forEach(x => x.classList.remove("active"));
          t.classList.add("active");
          const start = parseInt(t.dataset.secStart, 10);
          if (!Number.isNaN(start)) show(start);
        }
      });
    }
    root._mkSolShow = show;
    if (total > 0) show(0);
  }

  function mkBarChart(items, maxVal) {
    const max = Math.max(0.01, maxVal || Math.max(...items.map(it => it.v), 0.01));
    return `<div class="mk-rc-bars">${items.map(it => {
      const h = Math.max(2, Math.round((it.v / max) * 100));
      return `<div class="mk-rc-bar-col">
        <span class="mk-rc-bar-val">${it.labelTop || ""}</span>
        <div class="mk-rc-bar-track"><div class="mk-rc-bar ${it.cls || ""}" style="height:${h}%"></div></div>
        <span class="mk-rc-bar-lab">${it.lab}</span>
      </div>`;
    }).join("")}</div>`;
  }

  function mkScopeStats(data, scope) {
    // scope = "overall" or subject name
    if (!scope || scope === "overall") {
      return {
        label: "Overall",
        score: Math.max(0, data.score),
        maxScore: data.maxScore || (data.total * 4),
        correct: data.correct,
        wrong: data.wrong,
        skip: data.skipped,
        total: data.total,
        attempted: data.correct + data.wrong,
        timeSec: data.timeUsed || 0,
        timeCorrect: data.timeCorrect || 0,
        timeWrong: data.timeWrong || 0,
        timeSkip: data.timeSkip || 0,
        subjectTimes: Object.entries((data.breakdown && data.breakdown.subject) || {}).map(([k, v]) => ({
          name: k, sec: v.timeSec || 0
        }))
      };
    }
    const v = (data.breakdown && data.breakdown.subject && data.breakdown.subject[scope]) || {
      correct: 0, wrong: 0, total: 0, skipped: 0, timeSec: 0, timeCorrect: 0, timeWrong: 0, timeSkip: 0, score: 0
    };
    return {
      label: scope,
      score: Math.max(0, v.score != null ? v.score : (v.correct * 4)),
      maxScore: (v.total || 0) * 4,
      correct: v.correct || 0,
      wrong: v.wrong || 0,
      skip: v.skipped != null ? v.skipped : Math.max(0, (v.total || 0) - (v.correct || 0) - (v.wrong || 0)),
      total: v.total || 0,
      attempted: (v.correct || 0) + (v.wrong || 0),
      timeSec: v.timeSec || 0,
      timeCorrect: v.timeCorrect || 0,
      timeWrong: v.timeWrong || 0,
      timeSkip: v.timeSkip || 0,
      subjectTimes: null
    };
  }

  function renderMarksRcPanel(st, durationMin, showSubjectChart) {
    const acc = st.attempted ? ((st.correct / st.attempted) * 100) : 0;
    const accStr = Math.round(acc) + "%";
    const tMin = fmtMarksMin(st.timeSec);
    const tMax = Math.max(st.timeCorrect, st.timeWrong, st.timeSkip, 1);
    const qualityBars = mkBarChart([
      { v: st.timeCorrect, lab: "Correct", cls: "ok", labelTop: fmtMarksMin(st.timeCorrect).replace(" min", "") },
      { v: st.timeWrong, lab: "Incorrect", cls: "no", labelTop: fmtMarksMin(st.timeWrong).replace(" min", "") },
      { v: st.timeSkip, lab: "Not Attempted", cls: "skip", labelTop: fmtMarksMin(st.timeSkip).replace(" min", "") }
    ], tMax);
    let subChart = "";
    if (showSubjectChart && st.subjectTimes && st.subjectTimes.length) {
      const sMax = Math.max(...st.subjectTimes.map(x => x.sec), 1);
      const colors = ["math", "phys", "chem", "bio", "other"];
      subChart = `<div class="mk-rc-chart-card">
        <h3>Subject wise Time spent</h3>
        <p class="mk-rc-chart-sub">Total time spent: <strong>${fmtMarksMin(st.timeSec)}</strong></p>
        ${mkBarChart(st.subjectTimes.map((x, i) => ({
          v: x.sec,
          lab: x.name.length > 12 ? x.name.slice(0, 10) + "…" : x.name,
          cls: colors[i % colors.length],
          labelTop: fmtMarksMin(x.sec).replace(" min", "")
        })), sMax)}
        <div class="mk-rc-legend-row">${st.subjectTimes.map((x, i) =>
          `<span class="mk-rc-leg ${colors[i % colors.length]}">${x.name}: ${fmtMarksMin(x.sec)}</span>`
        ).join("")}</div>
      </div>`;
    }
    const circ = Math.min(100, st.total ? Math.round(((st.correct + st.wrong) / st.total) * 100) : 0);
    return `<div class="mk-rc-score-row">
        <div class="mk-rc-ribbon">
          <div class="mk-rc-ribbon-lab">MARKS OBTAINED</div>
          <div class="mk-rc-ribbon-val"><span>${st.score}</span><small>/${st.maxScore}</small></div>
        </div>
        <div class="mk-rc-pills">
          <div class="mk-rc-pill purp">
            <div class="mk-rc-pill-val">${st.attempted}</div>
            <div class="mk-rc-pill-lab">Qs attempted out of ${st.total}</div>
          </div>
          <div class="mk-rc-pill green">
            <div class="mk-rc-pill-val">${accStr}</div>
            <div class="mk-rc-pill-lab">Accuracy</div>
          </div>
          <div class="mk-rc-pill orang">
            <div class="mk-rc-pill-val">${tMin}</div>
            <div class="mk-rc-pill-lab">Time taken out of ${durationMin} min</div>
          </div>
        </div>
      </div>
      <div class="mk-rc-section">
        <h3>Attempts Analysis (${st.label})</h3>
        <div class="mk-rc-attempt-row">
          <div class="mk-rc-donut" style="--pct:${circ}">
            <div class="mk-rc-donut-inner">
              <strong>${st.total}</strong>
              <span>Total Qs</span>
            </div>
          </div>
          <div class="mk-rc-attempt-stats">
            <div class="mk-rc-as ok"><i></i><div><span>Correct:</span><strong>${st.correct} Qs</strong></div></div>
            <div class="mk-rc-as no"><i></i><div><span>Incorrect:</span><strong>${st.wrong} Qs</strong></div></div>
            <div class="mk-rc-as skip"><i></i><div><span>Not Answered:</span><strong>${st.skip} Qs</strong></div></div>
          </div>
        </div>
      </div>
      <div class="mk-rc-charts ${subChart ? "two" : "one"}">
        <div class="mk-rc-chart-card">
          <h3>Quality of Time Spent (${st.label})</h3>
          <p class="mk-rc-chart-sub">Total time spent: <strong>${fmtMarksMin(st.timeSec)}</strong></p>
          ${qualityBars}
          <div class="mk-rc-legend-row">
            <span class="mk-rc-leg ok">Time spent on correct qs: ${fmtMarksMin(st.timeCorrect)}</span>
            <span class="mk-rc-leg no">Time spent on incorrect qs: ${fmtMarksMin(st.timeWrong)}</span>
            <span class="mk-rc-leg skip">Time spent on not attempted qs: ${fmtMarksMin(st.timeSkip)}</span>
          </div>
        </div>
        ${subChart}
      </div>`;
  }

  /** Marks website Report Card + Solution view (screenshots 812–815) */
  function renderQuizrrAnalysis(data, meta) {
    const title = String(meta.title || "Test").replace(/</g, "&lt;");
    const durationMin = data.durationMin || 180;
    const subKeys = Object.keys((data.breakdown && data.breakdown.subject) || {});
    const subjectOrder = ["Mathematics", "Physics", "Chemistry", "Biology", "Botany", "Zoology"];
    const orderedSubs = subjectOrder.filter(s => subKeys.includes(s))
      .concat(subKeys.filter(s => !subjectOrder.includes(s)));

    const overallSt = mkScopeStats(data, "overall");
    const panelsHtml = [
      `<div class="mk-rc-panel on" data-mk-scope="overall">${renderMarksRcPanel(overallSt, durationMin, true)}</div>`
    ].concat(orderedSubs.map(sub => {
      const st = mkScopeStats(data, sub);
      return `<div class="mk-rc-panel" data-mk-scope="${String(sub).replace(/"/g, "")}">${renderMarksRcPanel(st, durationMin, false)}</div>`;
    })).join("");

    const tabsHtml = [
      `<button type="button" class="mk-rc-tab on" data-mk-scope="overall"><span class="mk-rc-tab-ic">✓</span> Overall</button>`
    ].concat(orderedSubs.map(sub => {
      return `<button type="button" class="mk-rc-tab" data-mk-scope="${String(sub).replace(/"/g, "")}"><span class="mk-rc-tab-ic">${subjectIcon(sub)}</span> ${sub}</button>`;
    })).join("");

    const reviewRows = data.rows.map((r, i) => renderReviewRow(r, i)).join("");
    const reviewRail = renderMarksReviewRail(data);

    // Section tabs for solution view (global Q numbers)
    let solSecTabs = "";
    if (data.sections && data.sections.length) {
      solSecTabs = data.sections.map((sec, i) => {
        const lab = sec.label || sec.shortLabel || ("Section " + (i + 1));
        const start = Number(sec.start) || 0;
        return `<button type="button" class="mk-sol-sec-tab${i === 0 ? " active" : ""}" data-sec-start="${start}" data-sec-i="${i}">${lab}</button>`;
      }).join("");
    } else {
      solSecTabs = orderedSubs.map((sub, i) => {
        const first = data.rows.findIndex(r => r.q && (r.q.subject || "Other") === sub);
        return `<button type="button" class="mk-sol-sec-tab${i === 0 ? " active" : ""}" data-sec-start="${first >= 0 ? first : 0}">${sub}</button>`;
      }).join("");
    }

    const theme = "light"; // Marks Report Card is always light white
    return `<div class="mk-rc-page qz-an-page" id="qzAnPage" data-ui="marks-report-card" data-theme="${theme}">
      <!-- ── Report Card (default) ── -->
      <div class="mk-rc-view on" id="mkRcView">
        <header class="mk-rc-top">
          <div class="mk-rc-top-left">
            <button type="button" class="mk-rc-back" id="qzAnBack" title="Back">←</button>
            <div>
              <h1>Report Card</h1>
              <p class="mk-rc-subtitle">${title}</p>
            </div>
          </div>
          <div class="mk-rc-attempt">Attempt 1 ▾</div>
        </header>
        <div class="mk-rc-actions">
          <button type="button" class="mk-rc-btn-sol" id="qzAnViewSol">View Solution</button>
          <button type="button" class="mk-rc-btn-re" id="mkRcReattempt">Reattempt</button>
        </div>
        <nav class="mk-rc-tabs" id="mkRcTabs">${tabsHtml}</nav>
        <div class="mk-rc-body" id="mkRcBody">${panelsHtml}</div>
      </div>

      <!-- ── Solution view (Marks style) ── -->
      <div class="mk-sol-view" id="mkSolView" hidden>
        <header class="mk-sol-top">
          <button type="button" class="mk-sol-back" id="mkSolBack" title="Back to Report Card">←</button>
          <div class="mk-sol-sec-bar">
            <button type="button" class="mk-sol-sec-nav" id="mkSolSecPrev">‹</button>
            <div class="mk-sol-sec-tabs">${solSecTabs}</div>
            <button type="button" class="mk-sol-sec-nav" id="mkSolSecNext">›</button>
          </div>
        </header>
        <div class="mk-sol-body qx-review-split" id="qxReviewSplit">
          <div class="mk-sol-main qx-review-main">
            <div class="review-list marks-review-list">${reviewRows}</div>
            <div class="mk-sol-footer">
              <button type="button" class="mk-sol-fbtn ghost" id="mkSolPrev">Previous</button>
              <button type="button" class="mk-sol-fbtn dark" id="mkSolViewQ">View Question</button>
              <button type="button" class="mk-sol-fbtn dark" id="mkSolNext">Save &amp; Next</button>
            </div>
          </div>
          <aside class="mk-sol-rail qx-review-rail">
            ${reviewRail}
          </aside>
        </div>
      </div>
    </div>`;
  }

  function bindQuizrrAnalysis(root) {
    if (!root) return;
    const data = window._qxLastAnalysis || null;

    const leaveAnalysis = () => {
      document.body.classList.remove(
        "marks-results-active", "qzrr-analysis-active",
        "qz-an-theme-light", "qz-an-theme-dark", "marks-test-active"
      );
      try {
        const sidebar = document.getElementById("sidebar");
        const topbar = document.querySelector(".topbar");
        const mainEl = document.querySelector(".main");
        if (sidebar) sidebar.style.display = "";
        if (topbar) topbar.style.display = "";
        if (mainEl) mainEl.style.marginLeft = "";
      } catch (_) { /* */ }
      if (window.TS_STANDALONE && typeof tsRenderStandalone === "function") tsRenderStandalone();
      else if (typeof go === "function") go("tests");
      else window.location.href = "app.html?exam=Engineering#tests";
    };

    const showReport = () => {
      const rc = root.querySelector("#mkRcView");
      const sol = root.querySelector("#mkSolView");
      if (rc) {
        rc.classList.add("on");
        rc.removeAttribute("hidden");
        rc.hidden = false;
      }
      if (sol) {
        sol.classList.remove("on");
        sol.setAttribute("hidden", "");
        sol.hidden = true;
      }
    };

    const showSolutions = () => {
      const rc = root.querySelector("#mkRcView");
      const sol = root.querySelector("#mkSolView");
      if (rc) {
        rc.classList.remove("on");
        rc.setAttribute("hidden", "");
        rc.hidden = true;
      }
      if (sol) {
        sol.classList.add("on");
        sol.removeAttribute("hidden");
        sol.hidden = false;
      }
      // Bind on full solution shell (section tabs live outside #qxReviewSplit)
      const shell = sol || root.querySelector("#qxReviewSplit") || root;
      bindReviewSplit(shell, data);
      if (data && data.rows && typeof MarksLive !== "undefined" && MarksLive.ensureQuestionFull) {
        const start = parseInt(shell.dataset.curRv, 10) || 0;
        const batch = data.rows.slice(start, start + 4);
        Promise.resolve().then(async () => {
          for (const r of batch) {
            try { await hydrateRowSolution(r); } catch (_) { /* */ }
          }
        });
      }
    };

    const doReattempt = () => {
      const cfg = window._qxReattemptConfig;
      if (!cfg || !cfg.ids || !cfg.ids.length) {
        if (typeof showToast === "function") showToast("Reattempt not available — open paper again from PYQ Mock.");
        leaveAnalysis();
        return;
      }
      document.body.classList.remove(
        "marks-results-active", "qzrr-analysis-active",
        "qz-an-theme-light", "qz-an-theme-dark"
      );
      try {
        if (cfg.opts && cfg.opts.persistKey && typeof marksClearSession === "function") {
          marksClearSession(cfg.opts.persistKey);
        }
      } catch (_) { /* */ }
      try {
        if (typeof enterMarksTestMode === "function") enterMarksTestMode();
      } catch (_) { /* */ }
      if (typeof startTest === "function") {
        startTest(cfg.ids, cfg.title, cfg.returnTo || "tests", Object.assign({}, cfg.opts || {}, {
          resumeData: null,
          skipCountdown: true,
          shuffle: false,
          marksMode: true
        }));
      } else leaveAnalysis();
    };

    // Single delegated click handler — all Report Card + chrome buttons
    if (!root._mkRcBound) {
      root._mkRcBound = true;
      root.addEventListener("click", (ev) => {
        const t = ev.target.closest(
          "#qzAnBack, #mkSolBack, #qzAnViewSol, #mkRcReattempt, .mk-rc-tab, #mkSolSecPrev, #mkSolSecNext"
        );
        if (!t || !root.contains(t)) return;
        ev.preventDefault();
        if (t.id === "qzAnBack") { leaveAnalysis(); return; }
        if (t.id === "mkSolBack") { showReport(); return; }
        if (t.id === "qzAnViewSol") { showSolutions(); return; }
        if (t.id === "mkRcReattempt") { doReattempt(); return; }
        if (t.classList.contains("mk-rc-tab")) {
          const scope = t.getAttribute("data-mk-scope");
          root.querySelectorAll(".mk-rc-tab").forEach(x => x.classList.toggle("on", x === t));
          root.querySelectorAll(".mk-rc-panel").forEach(p => {
            p.classList.toggle("on", p.getAttribute("data-mk-scope") === scope);
          });
          return;
        }
        if (t.id === "mkSolSecPrev" || t.id === "mkSolSecNext") {
          const tabs = Array.from(root.querySelectorAll(".mk-sol-sec-tab"));
          const i = tabs.findIndex(x => x.classList.contains("active"));
          const nextI = t.id === "mkSolSecPrev" ? i - 1 : i + 1;
          if (nextI >= 0 && nextI < tabs.length) {
            tabs[nextI].click();
          }
        }
      });
    }

    // Expose for external hooks
    root._mkShowSolutions = showSolutions;
    root._mkShowReport = showReport;
  }

  function renderResults(data) {
    const ret = session.returnTo;
    const title = session.title;
    const mode = session.testType;
    const marksReview = session.marksMode;
    const uiMode = session.uiMode || "quantrex";
    const scoring = session.scoring || { correct: 4, wrong: -1 };
    const isPyq = mode === "pyqmock";
    // Prefer full analysis UI (Marks Report Card) for PYQ + Marks mocks + Quizrr
    const useFullAnalysis = uiMode === "quizrr" || isPyq || marksReview;
    // Report Card always pure white light (Marks website)
    const theme = "light";

    // Snapshot for Reattempt button
    try {
      window._qxReattemptConfig = {
        ids: session.ids.slice(),
        title: session.title,
        returnTo: ret || "tests",
        opts: {
          testType: mode,
          timed: session.durationSec != null,
          durationSec: session.durationSec,
          shuffle: false,
          marksMode: !!session.marksMode,
          organizeJee: true,
          uiMode: session.uiMode || "quantrex",
          paperFormat: session.paperFormat || (session.meta && session.meta.format) || null,
          scoring: session.scoring,
          catalogTotalQs: session.catalogTotalQs,
          totalMarks: session.totalMarks,
          catalogDurationMin: session.catalogDurationMin,
          persistKey: session.persistKey,
          meta: session.meta,
          modeLabel: session.modeLabel,
          skipCountdown: true
        }
      };
    } catch (_) {
      window._qxReattemptConfig = null;
    }

    // Attach sections onto results for solution palette (before session null)
    if (!data.sections && session.sections) data.sections = session.sections;
    // Ensure each row can re-resolve question id after session ends
    if (data.rows) {
      data.rows.forEach((r, i) => {
        if (r && r.q && r.q.id != null) r.id = r.q.id;
        else if (r && session.ids) r.id = session.ids[i];
      });
    }
    try { window._qxLastAnalysis = data; } catch (_) { /* */ }

    if (typeof QuantrexAnalytics !== "undefined") {
      try {
        QuantrexAnalytics.recordAttempt({
          title, mode, ...data,
          exam: (typeof STATE !== "undefined" && STATE.exam) || "",
          date: Date.now(),
          slug: session.meta && session.meta.slug,
          source: session.meta && session.meta.source
        });
      } catch (e) { console.warn("analytics record", e); }
    }

    const analysisMeta = {
      title,
      scoring,
      returnTo: ret || (isPyq ? "tests" : "dashboard"),
      testType: mode,
      theme
    };
    marksClearSession();
    const standalone = window.TS_STANDALONE;
    session = null;

    // Shell for analysis — leave test chrome, keep content mount (Marks-smooth)
    // CRITICAL: remove marks-test-active (position:fixed freezes/scroll-locks Report Card)
    document.body.classList.remove(
      "marks-instr-active", "allen-cbt-active", "allen-practice-active", "marks-test-active"
    );
    document.body.classList.add("marks-results-active", "qzrr-analysis-active", "qz-an-theme-light");
    document.body.classList.remove("qz-an-theme-dark");
    try {
      // Exit fullscreen if still open from CBT
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (_) { /* */ }
    if (standalone) {
      const tsRoot = document.getElementById("ts-root");
      if (tsRoot) tsRoot.style.display = "none";
      const appMain = document.getElementById("app-main");
      if (appMain && typeof qxShowTestMount === "function") qxShowTestMount(appMain);
    } else {
      try {
        const sidebar = document.getElementById("sidebar");
        const topbar = document.querySelector(".topbar");
        if (sidebar) sidebar.style.display = "none";
        if (topbar) topbar.style.display = "none";
        const mainEl = document.querySelector(".main");
        if (mainEl) mainEl.style.marginLeft = "0";
        const content = document.querySelector(".content");
        if (content) {
          content.style.padding = "0";
          content.style.maxWidth = "none";
        }
        const appMain = document.getElementById("app-main");
        if (appMain) {
          appMain.style.position = "";
          appMain.style.inset = "";
          appMain.style.overflow = "auto";
          appMain.style.minHeight = "100vh";
          appMain.style.pointerEvents = "auto";
        }
      } catch (_) { /* */ }
    }

    if (useFullAnalysis) {
      return renderQuizrrAnalysis(data, analysisMeta);
    }

    const pass = data.pct >= 60;
    const subjectBars = Object.entries(data.breakdown.subject || {}).map(([sub, v]) => {
      const acc = v.total ? Math.round(v.correct / v.total * 100) : 0;
      return `<div class="qx-subj-bar"><div class="qx-subj-label"><span>${sub}</span><span>${acc}%</span></div>
        <div class="qx-bar-track"><div class="qx-bar-fill" style="width:${acc}%"></div></div>
        <small>${v.correct}/${v.total} correct</small></div>`;
    }).join("");
    const reviewRows = data.rows.map((r, i) => renderReviewRow(r, i)).join("");
    const reviewBlock = `<div class="qx-review-split" id="qxReviewSplit">
      <div class="qx-review-main"><div class="review-list marks-review-list">${reviewRows}</div></div>
      <aside class="qx-review-rail"><div class="qx-rv-rail-head">Questions</div>${renderMarksReviewRail(data)}</aside>
    </div>`;

    return `<div class="result-screen marks-result" data-theme="${theme}">
      <div class="result-hero ${pass ? "pass" : "fail"}">
        <div class="result-ring">${data.pct}%</div>
        <h2>${pass ? "Strong performance!" : "Room to improve"}</h2>
        <p>Score <strong>${data.score}</strong> / ${data.maxScore} · ${data.correct}/${data.total} correct</p>
        <p class="qx-time-used">Time: ${formatTime(data.timeUsed)}</p>
      </div>
      <div class="result-stats">
        <div class="rs"><strong style="color:#2bc48a">${data.correct}</strong><small>Correct</small></div>
        <div class="rs"><strong style="color:#ef4444">${data.wrong}</strong><small>Incorrect</small></div>
        <div class="rs"><strong style="color:#6b7280">${data.skipped}</strong><small>Skipped</small></div>
        <div class="rs"><strong>${data.score}</strong><small>Total Score</small></div>
      </div>
      ${subjectBars ? `<h3 class="sec-title">Subject Breakdown</h3><div class="qx-analytics-bars">${subjectBars}</div>` : ""}
      <h3 class="sec-title">Solutions Review</h3>
      ${reviewBlock}
      <div class="result-actions">
        <button class="btn-primary" onclick="go('dashboard')">← Home</button>
        <button class="btn-soft" onclick="go('analytics')">View Analytics</button>
        <button class="btn-soft" onclick="go('${ret || "tests"}')">Take Another</button>
      </div>
    </div>`;
  }

  function submit(auto) {
    if (!session || session.submitted) return;
    session.submitted = true;
    stopTimer();
    const data = computeResults();
    // Full snapshot for "View Analysis" later (resume after submit)
    let snapshot = null;
    try {
      snapshot = buildAttemptSnapshot(data, session);
      window._qxLastAnalysis = data;
      window._qxLastAttemptSnapshot = snapshot;
    } catch (_) {
      try { window._qxLastAnalysis = data; } catch (e2) { /* */ }
    }
    if (typeof session.onComplete === "function") {
      try { session.onComplete(data, snapshot); } catch (e) { console.error(e); }
    }
    const main = getTestMountEl();
    if (main) {
      // Instant Report Card paint — NO full-page MathJax on 75 solutions (was freezing UI)
      main.innerHTML = renderResults(data);
      const an = main.querySelector("#qzAnPage");
      if (an) {
        bindQuizrrAnalysis(an);
      } else {
        bindReviewSplit(main.querySelector("#qxReviewSplit"), data);
      }
      // Soft-prefetch first few solutions in idle time so View Solution is instant
      if (data.rows && data.rows.length && typeof requestIdleCallback === "function") {
        requestIdleCallback(() => {
          data.rows.slice(0, 5).forEach(r => { try { hydrateRowSolution(r); } catch (_) { /* */ } });
        }, { timeout: 2500 });
      } else {
        setTimeout(() => {
          data.rows.slice(0, 5).forEach(r => { try { hydrateRowSolution(r); } catch (_) { /* */ } });
        }, 400);
      }
    }
    if (!auto) showToast("✅ Submitted! Report Card ready — open View Solution anytime.");
  }

  function repairSessionSections(ids, sections) {
    const n = (ids || []).length;
    if (!sections || !sections.length || !n) return sections || null;
    const counts = sections.map((s) => Number(s.count));
    const firstTooBig = sections.length > 1 && Number.isFinite(counts[0]) && counts[0] >= n;
    const badCount = counts.some((c) => !Number.isFinite(c) || c < 0);
    if (firstTooBig || badCount) return null;
    let pos = 0;
    return sections.map((s) => {
      const count = Math.max(0, Number(s.count) || 0);
      const row = Object.assign({}, s, { start: pos, count });
      pos += count;
      return row;
    });
  }

  function begin(config) {
    const resume = config.resumeData || null;
    let ids = resume ? [...resume.ids] : (config.shuffle !== false ? shuffle(config.questionIds) : [...config.questionIds]);
    if (!ids.length) {
      showToast("⚠️ No questions available for this test.");
      return false;
    }
    let sections = resume ? resume.sections : (config.sections || null);
    const wantQuizrrUi = ((resume && resume.uiMode) || config.uiMode) === "quizrr";
    const isPyqMock = config.testType === "pyqmock";
    const orgOpts = {
      paperFormat: config.paperFormat || (config.meta && config.meta.slug),
      examSlug: (config.meta && config.meta.slug) || config.paperFormat,
      year: config.meta && config.meta.year,
      pattern: config.meta && config.meta.pattern,
      source: config.meta && config.meta.source,
      paperNum: config.meta && config.meta.paperNum,
      shuffle: false
    };
    if (!resume && (isPyqMock || wantQuizrrUi || (config.marksMode && config.organizeJee))) {
      // PYQ Mock → always Marks website paper format (exact exam layout for that year)
      let organized = null;
      if (isPyqMock || config.paperFormat || ids.length >= 20) {
        organized = organizeMarksPaper(ids, orgOpts);
      } else if (wantQuizrrUi) {
        organized = organizeQuizrrTypeSections(ids);
      } else {
        organized = organizeExamPaper(ids, orgOpts);
      }
      if (organized && organized.sections && organized.sections.length) {
        ids = organized.orderedIds;
        sections = organized.sections;
      }
    }
    // Resume / stale saves often lose start= or leave Math covering the whole paper
    let fixedSecs = repairSessionSections(ids, sections);
    if (!fixedSecs && ids.length >= 8) {
      try {
        const rebuilt = organizeMarksPaper(ids, orgOpts);
        if (rebuilt && rebuilt.sections && rebuilt.sections.length) {
          ids = rebuilt.orderedIds;
          fixedSecs = rebuilt.sections;
        }
      } catch (_) { /* */ }
    }
    if (fixedSecs) sections = fixedSecs;
    const practiceMode = !!(config.practiceMode || (resume && resume.practiceMode));
    const timed = !practiceMode && config.timed !== false;
    const rawDur = config.durationSec;
    const duration = practiceMode
      ? null
      : (rawDur == null || rawDur <= 0
        ? (timed ? Math.max(600, ids.length * 90) : null)
        : rawDur);
    session = {
      ids,
      title: config.title || "Quantrex Assessment",
      returnTo: config.returnTo || "tests",
      testType: config.testType || "custom",
      modeLabel: config.modeLabel || (duration ? "Timed Mode" : "Practice Mode"),
      durationSec: duration,
      remainingSec: practiceMode ? null : (resume ? resume.remainingSec : duration),
      practiceMode,
      scoring: config.scoring || defaultScoring(STATE.exam),
      idx: resume ? (resume.idx || 0) : Math.max(0, Math.min(ids.length - 1, Number(config.startIdx) || 0)),
      answers: resume ? { ...resume.answers } : {},
      review: new Set(resume ? (resume.review || []) : []),
      visited: new Set(resume ? (resume.visited || [resume.idx || 0]) : [Math.max(0, Math.min(ids.length - 1, Number(config.startIdx) || 0))]),
      startedAt: resume ? (resume.startedAt || Date.now()) : Date.now(),
      submitted: false,
      testId: config.testId || null,
      onComplete: config.onComplete || null,
      marksMode: !!config.marksMode,
      sections,
      deferTimer: !!config.deferTimer,
      persistKey: config.persistKey || null,
      meta: config.meta || null,
      paperFormat: config.paperFormat || null,
      shuffle: config.shuffle !== false,
      // "quizrr" = NTA CBT; "examgoal" = ExamGOAL chrome; "quantrex" = Allen/legacy
      uiMode: (resume && resume.uiMode) || config.uiMode || "quantrex",
      _egChecked: (resume && resume._egChecked) ? { ...resume._egChecked } : {},
      _egCorrect: (resume && resume._egCorrect) ? { ...resume._egCorrect } : {},
      _egShowAnswer: !!(resume && resume._egShowAnswer),
      _egSideCollapsed: !!(resume && resume._egSideCollapsed),
      // Per-question dwell seconds for Marks Report Card time charts
      qTimes: (resume && resume.qTimes) ? { ...resume.qTimes } : {},
      _qEnterAt: Date.now(),
      catalogTotalQs: config.catalogTotalQs || null,
      totalMarks: config.totalMarks || null,
      catalogDurationMin: config.catalogDurationMin || null,
      _sideCollapsed: !!(resume && (resume._sideCollapsed || resume._qzrrSideCollapsed)),
      _qzrrSideCollapsed: !!(resume && (resume._sideCollapsed || resume._qzrrSideCollapsed))
    };
    if (!session.deferTimer) startTimer();
    marksPersistSession();
    if (typeof MarksLive !== "undefined" && MarksLive.prefetchQuestions) {
      MarksLive.prefetchQuestions(ids).catch(() => {});
    }
    return true;
  }

  function launchTimer() {
    if (session) {
      session.startedAt = Date.now();
      startTimer();
    }
  }

  function render() {
    return renderQuestion();
  }

  function isActive() {
    return !!session && !session.submitted;
  }

  function getSession() {
    return session;
  }

  /** Compact snapshot for localStorage — reopen Report Card + Solutions later */
  function buildAttemptSnapshot(data, sess) {
    if (!data || !sess) return null;
    const grades = (data.rows || []).map((r, i) => ({
      id: (r.q && r.q.id != null) ? r.q.id : (sess.ids && sess.ids[i]),
      chosen: r.chosen,
      isCorrect: !!r.isCorrect,
      isWrong: !!r.isWrong,
      isSkip: !!r.isSkip,
      timeSec: r.timeSec || 0
    }));
    return {
      v: 2,
      status: "completed",
      title: sess.title || "Test",
      score: data.score,
      pct: data.pct,
      correct: data.correct,
      wrong: data.wrong,
      skipped: data.skipped,
      notVisited: data.notVisited,
      notAttempted: data.notAttempted,
      total: data.total,
      maxScore: data.maxScore,
      durationMin: data.durationMin,
      timeUsed: data.timeUsed,
      timeCorrect: data.timeCorrect,
      timeWrong: data.timeWrong,
      timeSkip: data.timeSkip,
      scoring: sess.scoring || { correct: 4, wrong: -1 },
      sections: sess.sections || data.sections || null,
      meta: sess.meta || null,
      paperFormat: sess.paperFormat || null,
      uiMode: sess.uiMode || "quantrex",
      marksMode: !!sess.marksMode,
      catalogTotalQs: sess.catalogTotalQs,
      totalMarks: sess.totalMarks,
      catalogDurationMin: sess.catalogDurationMin,
      ids: (sess.ids || []).slice(),
      answers: sess.answers ? { ...sess.answers } : {},
      review: sess.review ? [...sess.review] : [],
      visited: sess.visited ? [...sess.visited] : [],
      qTimes: sess.qTimes ? { ...sess.qTimes } : {},
      breakdown: data.breakdown || { subject: {} },
      grades,
      savedAt: Date.now()
    };
  }

  function rebuildAnalysisFromSnapshot(snap) {
    if (!snap) return null;
    const ids = snap.ids || (snap.grades || []).map(g => g.id);
    const grades = snap.grades || [];
    const rows = ids.map((id, i) => {
      const g = grades[i] || {};
      const qid = g.id != null ? g.id : id;
      const q = typeof getQ === "function" ? getQ(qid) : null;
      return {
        q,
        id: qid,
        chosen: g.chosen,
        isCorrect: !!g.isCorrect,
        isWrong: !!g.isWrong,
        isSkip: g.isSkip != null ? !!g.isSkip : (g.chosen === undefined),
        idx: i,
        timeSec: g.timeSec || (snap.qTimes && snap.qTimes[i]) || 0
      };
    });
    return {
      correct: snap.correct || 0,
      wrong: snap.wrong || 0,
      skipped: snap.skipped || 0,
      notVisited: snap.notVisited || 0,
      notAttempted: snap.notAttempted || 0,
      score: snap.score || 0,
      pct: snap.pct || 0,
      total: snap.total || rows.length,
      maxScore: snap.maxScore || (rows.length * 4),
      durationMin: snap.durationMin || 180,
      timeUsed: snap.timeUsed || 0,
      timeCorrect: snap.timeCorrect || 0,
      timeWrong: snap.timeWrong || 0,
      timeSkip: snap.timeSkip || 0,
      rows,
      breakdown: snap.breakdown || { subject: {} },
      sections: snap.sections || null,
      qTimes: snap.qTimes || {}
    };
  }

  function openSavedAnalysis(snap) {
    if (!snap) {
      if (typeof showToast === "function") showToast("⚠️ Saved analysis not found.");
      return false;
    }
    const data = rebuildAnalysisFromSnapshot(snap);
    if (!data || !data.rows || !data.rows.length) {
      if (typeof showToast === "function") showToast("⚠️ Could not rebuild analysis — load paper bank first.");
      return false;
    }
    window._qxLastAnalysis = data;
    window._qxReattemptConfig = {
      ids: (snap.ids || data.rows.map(r => r.id)).filter(Boolean),
      title: snap.title || "Test",
      returnTo: "tests",
      opts: {
        testType: "pyqmock",
        timed: true,
        durationSec: (snap.durationMin || 180) * 60,
        shuffle: false,
        marksMode: true,
        organizeJee: true,
        uiMode: snap.uiMode || "quantrex",
        paperFormat: snap.paperFormat || (snap.meta && snap.meta.format) || null,
        scoring: snap.scoring,
        catalogTotalQs: snap.catalogTotalQs,
        totalMarks: snap.totalMarks,
        catalogDurationMin: snap.catalogDurationMin || snap.durationMin,
        persistKey: null,
        meta: snap.meta,
        modeLabel: snap.title,
        skipCountdown: true
      }
    };
    document.body.classList.remove(
      "marks-instr-active", "allen-cbt-active", "allen-practice-active", "marks-test-active"
    );
    document.body.classList.add("marks-results-active", "qzrr-analysis-active", "qz-an-theme-light");
    document.body.classList.remove("qz-an-theme-dark");
    try {
      const sidebar = document.getElementById("sidebar");
      const topbar = document.querySelector(".topbar");
      if (sidebar) sidebar.style.display = "none";
      if (topbar) topbar.style.display = "none";
      const mainEl = document.querySelector(".main");
      if (mainEl) mainEl.style.marginLeft = "0";
      const appMain = document.getElementById("app-main");
      if (appMain) {
        appMain.style.position = "";
        appMain.style.inset = "";
        appMain.style.overflow = "auto";
        appMain.style.pointerEvents = "auto";
        appMain.style.minHeight = "100vh";
      }
    } catch (_) { /* */ }
    const main = getTestMountEl();
    if (!main) return false;
    const meta = { title: snap.title || "Test", scoring: snap.scoring, theme: "light", testType: "pyqmock" };
    main.innerHTML = renderQuizrrAnalysis(data, meta);
    const an = main.querySelector("#qzAnPage");
    if (an) bindQuizrrAnalysis(an);
    if (typeof showToast === "function") showToast("📊 Saved Report Card opened");
    return true;
  }

  return {
    begin,
    render,
    bindEvents,
    refresh,
    submit,
    quit,
    stopAndSave,
    isActive,
    getSession,
    refreshOptions: function () {
      const main = getTestMountEl();
      return patchOptionsOnly(main);
    },
    buildAttemptSnapshot,
    rebuildAnalysisFromSnapshot,
    openSavedAnalysis,
    launchTimer,
    formatTime,
    formatMarksTime,
    setSideCollapsed,
    isSideCollapsed,
    selectAnswer,
    set onTick(fn) { onTick = fn; }
  };
})();

/**
 * Marks JEE Main numerical — same rules as QuantrexQFormat.getType.
 * Letter stubs ["A","B","C","D"] + blank stem = NAT (integer box), not MCQ.
 */
function isNumericalQuestion(q) {
  if (!q) return false;
  if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType) {
    return QuantrexQFormat.getType(q) === "numerical";
  }
  const t = String(q.questionType || q.type || q.qType || "").toLowerCase().trim();
  if (/numerical|integer|nat|subjective|fill/.test(t)) {
    if (jeeMainHasRealMcqOptions(q)) return false;
    return true;
  }
  if (jeeMainHasRealMcqOptions(q)) return false;
  const opts = (q.options || []).map(o => String(o || "").replace(/<[^>]+>/g, "").trim());
  const letterOnly = !opts.length || opts.every(o => !o || /^[A-D]$/i.test(o));
  const blank = /_{2,}|\\_\\_|______|\\qquad|is equal to\s*[_.\\]/i.test(String(q.q || ""));
  if (letterOnly && blank) return true;
  return false;
}

function jeeMainHasRealMcqOptions(q) {
  const optsRaw = (q && q.options) || [];
  let real = 0;
  for (const o of optsRaw) {
    const s = String(o || "");
    if (/<img\b|smiles|<math[\s>]/i.test(s)) { real++; continue; }
    const txt = s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (txt && !/^[A-D]$/i.test(txt)) real++;
  }
  return real >= 2;
}

/**
 * Candidate score for untagged NAT items (Marks sometimes leaves questionType empty).
 * Used only to FILL up to official year count (5 or 10) — never to invent extra NUM.
 */
function jeeMainNumericalCandidateScore(q) {
  if (!q || isNumericalQuestion(q)) return 0;
  if (jeeMainHasRealMcqOptions(q)) return 0;
  const opts = q.options || [];
  const real = opts.filter(o => {
    const t = String(o || "").replace(/<[^>]+>/g, " ").trim();
    return t && !/^[A-D]$/i.test(t);
  }).length;
  if (real >= 2) return 0;
  const qt = String(q.q || "").replace(/<[^>]+>/g, " ");
  let score = 0;
  const rawQ = String(q.q || "");
  if (/_{3,}|\\qquad|\\\\qquad|\\_\\_|nearest\s*integer|integer\s*type|fill\s*in\s*the\s*blank|______/i.test(rawQ)) score += 6;
  if (/\bis\s*_+\s*\.?$/.test(qt.trim()) || /\$\\qquad\$|\\quad/i.test(rawQ)) score += 5;
  if (/\\_\\_\\_\\_/.test(rawQ)) score += 5;
  if (q.correctValue != null && String(q.correctValue) !== "") score += 4;
  if (real === 0) score += 2;
  if (opts.length === 0) score += 1;
  // empty A–D stubs only
  if (opts.length >= 1 && opts.every(o => {
    const t = String(o || "").replace(/<[^>]+>/g, "").trim();
    return !t || /^[A-D]$/i.test(t);
  })) score += 2;
  return score;
}

function numericalConfidence(q) {
  if (!q) return 0;
  if (isNumericalQuestion(q)) {
    let c = 5;
    if (/numerical|integer|nat/i.test(String(q.questionType || q.type || ""))) c += 3;
    if (q.correctValue != null && String(q.correctValue) !== "") c += 1;
    return c;
  }
  return jeeMainNumericalCandidateScore(q);
}

/**
 * Year-exact Marks JEE Main split per subject:
 *  pure MCQ years → all SC
 *  2021–24 → up to 10 NUM (official), rest SC
 *  2025–26 → exactly 5 NUM when possible, rest SC (fill untagged NAT)
 */
function splitJeeMainSubjectIds(ids, numTarget) {
  const list = ids || [];
  if (!numTarget || numTarget <= 0) {
    return { scTake: list.slice(), numTake: [] };
  }
  const typedNum = [];
  const rest = [];
  list.forEach(id => {
    const q = getQ(id);
    if (isNumericalQuestion(q)) typedNum.push(id);
    else rest.push(id);
  });

  let numTake = typedNum.slice();
  let scTake = rest.slice();

  // Cap overflow typed NUM → SC (false tags)
  if (numTake.length > numTarget) {
    scTake = numTake.slice(numTarget).concat(scTake);
    numTake = numTake.slice(0, numTarget);
  }

  // Fill missing NUM from high-score candidates (untagged NAT in Marks bank)
  if (numTake.length < numTarget) {
    const ranked = scTake
      .map(id => ({ id, s: jeeMainNumericalCandidateScore(getQ(id)) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s);
    const need = numTarget - numTake.length;
    const promote = ranked.slice(0, need).map(x => x.id);
    if (promote.length) {
      const promSet = new Set(promote);
      numTake = numTake.concat(promote);
      scTake = scTake.filter(id => !promSet.has(id));
    }
  }

  // If still short and subject has classic 25 (20+5) or 30 (20+10) count, take lowest-confidence from end of SC
  // Only when total matches official paper size (avoid breaking incomplete papers)
  if (numTake.length < numTarget && (list.length === 25 || list.length === 30)) {
    const need = numTarget - numTake.length;
    // Prefer SC items with no real options
    const weak = scTake.filter(id => !jeeMainHasRealMcqOptions(getQ(id)));
    const take = (weak.length >= need ? weak : scTake).slice(-need);
    const takeSet = new Set(take);
    numTake = numTake.concat(take);
    scTake = scTake.filter(id => !takeSet.has(id));
  }

  return { scTake, numTake };
}

function questionSectionType(q) {
  if (!q) return "SC";
  const stem = String(q.q || q.question || "");
  const opts = Array.isArray(q.options) ? q.options : [];
  const optJoin = opts.map(o => String(o || "")).join(" ");
  const tRaw = String(q.questionType || q.type || q._advSection || "").toLowerCase();

  if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.looksCodedSingleCorrect) {
    try { if (QuantrexQFormat.looksCodedSingleCorrect(q)) return "SC"; } catch (_) { /* */ }
  }

  // Explicit multi FIRST (Physics "more than one correct" must not vanish into SC)
  if (q._advSection === "MC" || /multiple|multi/.test(tRaw)
    || (Array.isArray(q.answers) && q.answers.length > 1)) {
    return "MC";
  }
  if (typeof QuantrexQFormat !== "undefined") {
    try {
      if (QuantrexQFormat.looksMultipleCorrect && QuantrexQFormat.looksMultipleCorrect(q)) return "MC";
      if (QuantrexQFormat.getType && QuantrexQFormat.getType(q) === "multipleCorrect") return "MC";
    } catch (_) { /* */ }
  }
  if (/\bis\s*\(are\)\s+(TRUE|FALSE)\b/i.test(stem)
    || /\bstatement\s*\(s\)\s+is\s*\(are\)\b/i.test(stem)
    || /\bone or more than one\s+(?:of\s+the\s+)?(?:correct\s+)?(?:option|answer|statement)/i.test(stem)
    || /\bwhich of the following\b[\s\S]{0,80}\bis\s*\(are\)\b/i.test(stem)
    || /\bcorrect option\(s\)\b/i.test(stem)) {
    return "MC";
  }

  // Column matching
  const looksMatch = q._advSection === "MATCH"
    || /list[\s-]*i\b|list[\s-]*ii\b|match the|column[\s-]*matching|matrix match/i.test(stem)
    || /\\mathrm\{[PQRS]\}|P\s*\\rightarrow|P\s*→|P\s*\\to/i.test(optJoin + stem)
    || (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.isMatchColumn && QuantrexQFormat.isMatchColumn(q));
  if (looksMatch) return "MATCH";

  if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType) {
    try {
      const t = QuantrexQFormat.getType(q);
      if (t === "numerical" || t === "subjective") return "NUM";
      if (t === "columnMatch") return "MATCH";
    } catch (_) { /* */ }
  }
  if (typeof isNumericalQuestion === "function" && isNumericalQuestion(q)) return "NUM";
  if (/numerical|integer|nat|fill|subjective/.test(tRaw) || q._advSection === "NUM") return "NUM";
  if (!opts.length || opts.length < 2) return "NUM";
  return "SC";
}

/** Infer + pin questionType on bank items so answer UI matches section (JEE Advanced). */
function qxPinJeeAdvQuestionType(q) {
  if (!q) return q;
  const sec = questionSectionType(q);
  if (sec === "NUM") {
    q.questionType = "numerical";
    q.type = "numerical";
  } else if (sec === "MC") {
    q.questionType = "multipleCorrect";
    q.type = "multipleCorrect";
  } else if (sec === "MATCH") {
    // Match-list is usually single-correct among combo options in modern Adv
    if (!q.questionType) {
      q.questionType = "singleCorrect";
      q.type = "singleCorrect";
    }
    q._advSection = "MATCH";
  } else {
    if (!q.questionType || q.questionType === "unk") {
      q.questionType = "singleCorrect";
      q.type = "singleCorrect";
    }
    q._advSection = "SC";
  }
  if (sec !== "MATCH" && sec !== "SC") q._advSection = sec;
  return q;
}

const SECTION_TYPE_LABELS = {
  SC: "Single Correct Type",
  MC: "One or More Correct Type",
  MATCH: "Match List Type",
  NUM: "Numerical Value Type"
};

const JEE_ADV_SECTION_LABEL = {
  SC: "Section 1 — Single Correct Type",
  MC: "Section 2 — One or More Correct Type",
  MATCH: "Section 3 — Match List Type",
  NUM: "Section 4 — Numerical Value Type"
};

const SECTION_TYPE_SHORT = {
  SC: "SC",
  MC: "MC",
  MATCH: "MATCH",
  NUM: "NUM"
};

/**
 * Official JEE (Advanced) year map — pattern / marking per jeeadv.ac.in archive years.
 * Section counts are indicative; live paper uses actual questions present.
 */
const JEE_ADV_OFFICIAL = {
  // Modern (2021–2025): four section types common; marks differ slightly by year
  // Official 2026 PDFs: p1_english.pdf / p2_english.pdf (jeeadv.ac.in/documents)
  2026: {
    durationMin: 180,
    paperMarksHint: 180,
    sections: [
      { type: "SC", name: "Single Correct Option (ONLY ONE)", correct: "+3", wrong: "−1", unattempted: "0" },
      { type: "MC", name: "One or More Correct Options", correct: "+4 / partial +3,+2,+1", wrong: "−1", unattempted: "0" },
      { type: "NUM", name: "Numerical Value Answer", correct: "+4", wrong: "0", unattempted: "0" },
      { type: "MATCH", name: "Match / List (if present)", correct: "+3", wrong: "−1", unattempted: "0" }
    ],
    note: "Official JEE (Advanced) 2026 Paper 1 & 2 · jeeadv.ac.in/documents/p1_english.pdf · p2_english.pdf"
  },
  2025: {
    durationMin: 180,
    paperMarksHint: 180,
    sections: [
      { type: "SC", name: "Single Correct Option", correct: "+3", wrong: "−1", unattempted: "0" },
      { type: "MC", name: "One or More Correct Options", correct: "+4 (partial)", wrong: "−1", unattempted: "0" },
      { type: "NUM", name: "Numerical Value Answer", correct: "+4", wrong: "0", unattempted: "0" },
      { type: "MATCH", name: "Match the Following (List)", correct: "+3", wrong: "−1", unattempted: "0" }
    ],
    note: "Paper 1 & Paper 2 · Physics, Chemistry, Mathematics · 3 hours each · Source: jeeadv.ac.in"
  },
  2024: {
    durationMin: 180,
    paperMarksHint: 180,
    sections: [
      { type: "SC", name: "Single Correct Option", correct: "+3", wrong: "−1", unattempted: "0" },
      { type: "MC", name: "One or More Correct Options", correct: "+4 (partial)", wrong: "−2", unattempted: "0" },
      { type: "NUM", name: "Numerical Value Answer", correct: "+4", wrong: "0", unattempted: "0" },
      { type: "MATCH", name: "Match List", correct: "+3", wrong: "−1", unattempted: "0" }
    ],
    note: "Paper 1 & Paper 2 · 3 hours each · Official archive jeeadv.ac.in"
  },
  2023: {
    durationMin: 180,
    paperMarksHint: 180,
    sections: [
      { type: "SC", name: "Single Correct Option", correct: "+3", wrong: "−1", unattempted: "0" },
      { type: "MC", name: "One or More Correct Options", correct: "+4 (partial)", wrong: "−2", unattempted: "0" },
      { type: "NUM", name: "Numerical Value Answer", correct: "+4", wrong: "0", unattempted: "0" },
      { type: "MATCH", name: "Match List", correct: "+3", wrong: "−1", unattempted: "0" }
    ],
    note: "Paper 1 & Paper 2 · Physics · Chemistry · Mathematics"
  },
  2022: {
    durationMin: 180,
    paperMarksHint: 180,
    sections: [
      { type: "SC", name: "Single Correct Option", correct: "+3", wrong: "−1", unattempted: "0" },
      { type: "MC", name: "One or More Correct Options", correct: "+4 (partial)", wrong: "−2", unattempted: "0" },
      { type: "NUM", name: "Numerical Value Answer", correct: "+4", wrong: "0", unattempted: "0" },
      { type: "MATCH", name: "Match List", correct: "+3", wrong: "−1", unattempted: "0" }
    ],
    note: "Paper 1 & Paper 2 · 3 hours each"
  },
  2021: {
    durationMin: 180,
    paperMarksHint: 180,
    sections: [
      { type: "SC", name: "Single Correct Option", correct: "+3", wrong: "−1", unattempted: "0" },
      { type: "MC", name: "One or More Correct Options", correct: "+4 (partial)", wrong: "−2", unattempted: "0" },
      { type: "NUM", name: "Numerical Value Answer", correct: "+4", wrong: "0", unattempted: "0" }
    ],
    note: "Paper 1 & Paper 2 · multi-section pattern"
  },
  2020: {
    durationMin: 180,
    paperMarksHint: 198,
    sections: [
      { type: "SC", name: "Single Correct Option", correct: "+3", wrong: "−1", unattempted: "0" },
      { type: "MC", name: "One or More Correct Options", correct: "+4 (partial)", wrong: "−2", unattempted: "0" },
      { type: "NUM", name: "Numerical Value Answer", correct: "+4", wrong: "0", unattempted: "0" }
    ],
    note: "Paper 1 & Paper 2 · computer-based"
  },
  2019: {
    durationMin: 180,
    paperMarksHint: 186,
    sections: [
      { type: "SC", name: "Single Correct Option", correct: "+3", wrong: "−1", unattempted: "0" },
      { type: "MC", name: "One or More Correct Options", correct: "+4 (partial)", wrong: "−2", unattempted: "0" },
      { type: "NUM", name: "Numerical Value Answer", correct: "+3", wrong: "0", unattempted: "0" },
      { type: "MATCH", name: "Matrix / Match", correct: "+3", wrong: "−1", unattempted: "0" }
    ],
    note: "Paper 1 & Paper 2 · official JEE (Advanced) 2019"
  },
  2018: {
    durationMin: 180,
    paperMarksHint: 180,
    sections: [
      { type: "SC", name: "Single Correct Option", correct: "+3", wrong: "−1", unattempted: "0" },
      { type: "MC", name: "One or More Correct Options", correct: "+4 (partial)", wrong: "−2", unattempted: "0" },
      { type: "NUM", name: "Numerical Value Answer", correct: "+3", wrong: "0", unattempted: "0" },
      { type: "MATCH", name: "Match List", correct: "+3", wrong: "0", unattempted: "0" }
    ],
    note: "Paper 1 & Paper 2 · official JEE (Advanced) 2018"
  },
  2017: {
    durationMin: 180,
    paperMarksHint: 183,
    sections: [
      { type: "SC", name: "Single Correct Option", correct: "+3", wrong: "−1", unattempted: "0" },
      { type: "MC", name: "One or More Correct Options", correct: "+4 (partial)", wrong: "−2", unattempted: "0" },
      { type: "NUM", name: "Numerical / Integer", correct: "+3", wrong: "0", unattempted: "0" }
    ],
    note: "Paper 1 & Paper 2 · official JEE (Advanced) 2017"
  },
  2016: {
    durationMin: 180,
    paperMarksHint: 186,
    sections: [
      { type: "SC", name: "Single Correct Option", correct: "+3", wrong: "−1", unattempted: "0" },
      { type: "MC", name: "One or More Correct Options", correct: "+4 (partial)", wrong: "−2", unattempted: "0" },
      { type: "NUM", name: "Integer Answer", correct: "+3", wrong: "0", unattempted: "0" }
    ],
    note: "Paper 1 & Paper 2 · official JEE (Advanced) 2016"
  },
  2015: {
    durationMin: 180,
    paperMarksHint: 264,
    sections: [
      { type: "SC", name: "Single Correct Option", correct: "+3", wrong: "−1", unattempted: "0" },
      { type: "MC", name: "One or More Correct Options", correct: "+4 (partial)", wrong: "−2", unattempted: "0" },
      { type: "NUM", name: "Integer Answer", correct: "+4", wrong: "0", unattempted: "0" }
    ],
    note: "Paper 1 & Paper 2 · official JEE (Advanced) 2015"
  }
};

function jeeAdvOfficialForYear(year) {
  const y = year != null ? Number(year) : null;
  if (y && JEE_ADV_OFFICIAL[y]) return JEE_ADV_OFFICIAL[y];
  if (y && y >= 2026) return JEE_ADV_OFFICIAL[2026];
  if (y && y >= 2021) return JEE_ADV_OFFICIAL[2025];
  if (y && y >= 2018) return JEE_ADV_OFFICIAL[2019];
  if (y && y >= 2015) return JEE_ADV_OFFICIAL[2016];
  // Pre-2015 IIT-JEE style fallback
  return {
    durationMin: 180,
    paperMarksHint: 180,
    sections: [
      { type: "SC", name: "Single Correct / Objective", correct: "+3", wrong: "−1", unattempted: "0" },
      { type: "MC", name: "More than one correct", correct: "+3", wrong: "−1", unattempted: "0" },
      { type: "NUM", name: "Integer / Numerical", correct: "+3", wrong: "0", unattempted: "0" },
      { type: "MATCH", name: "Matrix Match", correct: "+2", wrong: "0", unattempted: "0" }
    ],
    note: "IIT-JEE / JEE (Advanced) historical pattern · jeeadv.ac.in archive"
  };
}

function parseJeeAdvPaperNum(source) {
  const s = String(source || "");
  const m = s.match(/paper\s*([12])/i) || s.match(/\bP\s*([12])\b/i);
  return m ? Number(m[1]) : null;
}

if (typeof window !== "undefined") {
  window.JEE_ADV_OFFICIAL = JEE_ADV_OFFICIAL;
  window.jeeAdvOfficialForYear = jeeAdvOfficialForYear;
  window.parseJeeAdvPaperNum = parseJeeAdvPaperNum;
  window.qxPinJeeAdvQuestionType = qxPinJeeAdvQuestionType;
}

function buildSectionsFromOrder(questionIds) {
  const orderedIds = [...questionIds];
  const sections = [];
  questionIds.forEach((id, i) => {
    const q = getQ(id);
    const sub = (q && q.subject) || "Other";
    const type = questionSectionType(q);
    const key = sub + "::" + type;
    const last = sections[sections.length - 1];
    if (!last || last.key !== key) {
      sections.push({
        key,
        label: `${sub} ${SECTION_TYPE_LABELS[type]}`,
        shortLabel: `${sub.toUpperCase().slice(0, 3)} ${SECTION_TYPE_SHORT[type]}`,
        subject: sub,
        type,
        start: i,
        count: 1
      });
    } else {
      last.count++;
    }
  });
  return { orderedIds, sections };
}

/**
 * JEE (Advanced) full paper — Physics → Chemistry → Mathematics.
 * Section numbers follow official type order for that year; only types
 * present in THIS paper become sections (so questions match instructions).
 */
function organizeJeeAdvancedPaper(questionIds, opts) {
  const o = opts || {};
  const year = o.year != null ? Number(o.year) : null;
  const source = o.source || "";
  const paperNum = o.paperNum != null ? o.paperNum : parseJeeAdvPaperNum(source);
  const off = jeeAdvOfficialForYear(year);
  // Official type order for section numbering (skip empty types)
  const typeOrder = (off.sections || []).map(s => s.type);
  ["SC", "MC", "MATCH", "NUM"].forEach(t => {
    if (!typeOrder.includes(t)) typeOrder.push(t);
  });
  const subjectOrder = ["Physics", "Chemistry", "Mathematics"];
  const bySubType = {};
  questionIds.forEach(id => {
    const q = getQ(id);
    if (!q) return;
    // Pin types so keypad / multi-select match section
    try { qxPinJeeAdvQuestionType(q); } catch (_) { /* */ }
    let sub = q.subject || "Other";
    if (/math/i.test(sub)) sub = "Mathematics";
    else if (/phys/i.test(sub)) sub = "Physics";
    else if (/chem/i.test(sub)) sub = "Chemistry";
    const type = questionSectionType(q);
    const key = sub + "::" + type;
    if (!bySubType[key]) bySubType[key] = { sub, type, ids: [] };
    bySubType[key].ids.push(id);
  });

  const orderedIds = [];
  const sections = [];
  const typeOfficialName = {};
  (off.sections || []).forEach(s => { typeOfficialName[s.type] = s.name; });

  subjectOrder.forEach(sub => {
    let secNum = 0;
    typeOrder.forEach(type => {
      const key = sub + "::" + type;
      const bucket = bySubType[key];
      if (!bucket || !bucket.ids.length) return;
      secNum += 1;
      const typeLab = typeOfficialName[type] || SECTION_TYPE_LABELS[type] || type;
      const paperTag = paperNum ? `P${paperNum}` : "Adv";
      sections.push({
        label: `${sub} — Section ${secNum} (${typeLab})`,
        shortLabel: `${sub.slice(0, 4).toUpperCase()} S${secNum}`,
        subject: sub,
        type,
        sectionHint: `JEE (Advanced)${year ? " " + year : ""}${paperNum ? " Paper " + paperNum : ""} · ${typeLab}`,
        start: orderedIds.length,
        count: bucket.ids.length,
        paper: paperTag
      });
      orderedIds.push(...bucket.ids);
      delete bySubType[key];
    });
  });
  Object.values(bySubType).forEach(bucket => {
    if (!bucket.ids.length) return;
    sections.push({
      label: `${bucket.sub} — ${SECTION_TYPE_LABELS[bucket.type] || bucket.type}`,
      shortLabel: `${bucket.sub.slice(0, 3).toUpperCase()} ${SECTION_TYPE_SHORT[bucket.type] || ""}`,
      subject: bucket.sub,
      type: bucket.type,
      start: orderedIds.length,
      count: bucket.ids.length
    });
    orderedIds.push(...bucket.ids);
  });
  const placed = new Set(orderedIds);
  questionIds.forEach(id => { if (!placed.has(id)) orderedIds.push(id); });
  return { orderedIds, sections, year, paperNum, official: off };
}

/**
 * NEET (UG) — official year pattern (Marks / NTA):
 *  ≤2020 & 2025+: 180 MCQ → Physics / Chemistry / Botany / Zoology only
 *  2021–2024: Section A (MCQ) + Section B (Numerical, attempt 10 of 15)
 * Never force A/B on pure-MCQ years even if a question is mis-tagged numerical.
 */
function organizeNeetPaper(questionIds, opts) {
  const o = opts || {};
  let pattern = o.pattern || "";
  const year = o.year != null ? Number(o.year) : null;
  if (!pattern && typeof AllenTestUI !== "undefined" && AllenTestUI.neetPattern) {
    pattern = AllenTestUI.neetPattern(year, (questionIds || []).length);
  }
  if (!pattern) {
    if (year != null && year >= 2021 && year <= 2024) pattern = "neet_200_ab";
    else if ((questionIds || []).length >= 190) pattern = "neet_200_ab";
    else pattern = "neet_180_mcq";
  }
  const pureMcq = pattern === "neet_180_mcq";

  const subjectOrder = ["Physics", "Chemistry", "Botany", "Zoology"];
  const bySubject = {};
  questionIds.forEach(id => {
    const q = getQ(id);
    if (!q) return;
    let sub = q.subject || "Other";
    if (/bio/i.test(sub) && !/botany|zoology/i.test(sub)) sub = "Botany";
    if (/phys/i.test(sub)) sub = "Physics";
    else if (/chem/i.test(sub)) sub = "Chemistry";
    else if (/bot/i.test(sub)) sub = "Botany";
    else if (/zoo/i.test(sub)) sub = "Zoology";
    if (!bySubject[sub]) bySubject[sub] = [];
    bySubject[sub].push(id);
  });
  const orderedIds = [];
  const sections = [];
  const pushSec = (sub, arr, type, label, short, hint) => {
    if (!arr || !arr.length) return;
    sections.push({
      label,
      shortLabel: short,
      subject: sub,
      type,
      sectionHint: hint || "",
      start: orderedIds.length,
      count: arr.length
    });
    orderedIds.push(...arr);
  };

  subjectOrder.forEach(sub => {
    const ids = bySubject[sub] || [];
    if (!ids.length) return;
    if (pureMcq) {
      // Official 180 MCQ years: one subject tab only — never invent Section B
      pushSec(sub, ids, "SC", sub, sub.toUpperCase(), "Single Correct MCQ");
    } else {
      // 2021–24 NEET: Section A MCQ + Section B NUM (cap 15 NUM; overflow → A)
      const scored = ids.map(id => {
        const q = getQ(id);
        const num = isNumericalQuestion(q);
        return { id, num, conf: num && typeof numericalConfidence === "function" ? numericalConfidence(q) : (num ? 1 : 0) };
      });
      let sc = scored.filter(x => !x.num).map(x => x.id);
      let numScored = scored.filter(x => x.num).sort((a, b) => b.conf - a.conf);
      const numCap = 15;
      let num = numScored.slice(0, numCap).map(x => x.id);
      const overflow = numScored.slice(numCap).map(x => x.id);
      if (overflow.length) sc = sc.concat(overflow);
      if (sc.length && num.length) {
        pushSec(sub, sc, "SC", `${sub} Section A (MCQ)`, `${sub.toUpperCase()} SECTION A`, "Section A · MCQ");
        pushSec(sub, num, "NUM", `${sub} Section B (Numerical)`, `${sub.toUpperCase()} SECTION B`, "Section B · Attempt any 10 of 15");
      } else {
        pushSec(sub, ids, sc.length ? "SC" : "NUM", sub, sub.toUpperCase(), "MCQ");
      }
    }
    delete bySubject[sub];
  });
  Object.keys(bySubject).forEach(sub => {
    const ids = bySubject[sub];
    if (!ids.length) return;
    pushSec(sub, ids, "SC", sub, sub.toUpperCase().slice(0, 8), "");
  });
  return { orderedIds, sections };
}

function resolvePaperFormat(opts) {
  const o = opts || {};
  const slug = String(o.examSlug || o.paperFormat || o || "");
  // Prefer Marks exam registry (correct name/layout per exam)
  if (typeof marksExamFormat === "function") {
    const fmt = marksExamFormat(slug);
    if (fmt && fmt.format) return fmt.format;
  }
  if (o.paperFormat && typeof o.paperFormat === "string") {
    const pf = o.paperFormat;
    if (/jee_advanced/i.test(pf)) return "jee_advanced";
    if (/jee_main|nta_abhyas_jee/i.test(pf)) return "jee_main";
    if (/neet|nta_abhyas_neet/i.test(pf)) return "neet";
    if (/aiims|jipmer|mht_cet_medical/i.test(pf)) return "neet_medical";
    if (/nda/i.test(pf)) return "nda";
    if (/bitsat/i.test(pf)) return "bitsat";
    if (/mht_cet/i.test(pf)) return "mht_cet";
  }
  if (/jee_advanced/i.test(slug)) return "jee_advanced";
  if (/jee_main|nta_abhyas_jee/i.test(slug)) return "jee_main";
  if (/neet|nta_abhyas_neet/i.test(slug)) return "neet";
  if (/aiims|jipmer|mht_cet_medical/i.test(slug)) return "neet_medical";
  if (/nda/i.test(slug)) return "nda";
  if (/bitsat/i.test(slug)) return "bitsat";
  if (/mht_cet/i.test(slug)) return "mht_cet";
  if (typeof STATE !== "undefined" && STATE.exam === "Medical") return "neet";
  if (typeof STATE !== "undefined" && STATE.exam === "Defence") return "nda";
  return "jee_main";
}

function buildSectionsBySubject(questionIds) {
  const orderedIds = [...questionIds];
  const sections = [];
  questionIds.forEach((id, i) => {
    const q = getQ(id);
    const sub = (q && q.subject) || "Other";
    const last = sections[sections.length - 1];
    if (!last || last.subject !== sub) {
      sections.push({
        label: sub,
        shortLabel: sub.toUpperCase().slice(0, 4),
        subject: sub,
        start: i,
        count: 1
      });
    } else {
      last.count++;
    }
  });
  return { orderedIds, sections };
}

function buildJeeAdvancedSections(questionIds) {
  const orderedIds = [...questionIds];
  const sections = [];
  questionIds.forEach((id, i) => {
    const q = getQ(id);
    const sub = (q && q.subject) || "Other";
    const type = questionSectionType(q);
    const key = sub + "::" + type;
    const last = sections[sections.length - 1];
    if (!last || last.key !== key) {
      const secSuffix = JEE_ADV_SECTION_LABEL[type] || SECTION_TYPE_LABELS[type] || type;
      sections.push({
        key,
        label: `${sub} ${secSuffix}`,
        shortLabel: `${sub.slice(0, 3).toUpperCase()} · ${SECTION_TYPE_SHORT[type] || type}`,
        subject: sub,
        type,
        start: i,
        count: 1
      });
    } else {
      last.count++;
    }
  });
  return { orderedIds, sections };
}

const EXAM_SUBJECT_ORDER = {
  jee_main: ["Mathematics", "Physics", "Chemistry"],
  nta_abhyas_jee_main: ["Mathematics", "Physics", "Chemistry"],
  // Official paper UI order (Physics → Chemistry → Mathematics)
  jee_advanced: ["Physics", "Chemistry", "Mathematics"],
  neet: ["Physics", "Chemistry", "Botany", "Zoology"],
  nta_abhyas_neet: ["Physics", "Chemistry", "Botany", "Zoology"],
  aiims: ["Physics", "Chemistry", "Biology", "Botany", "Zoology"],
  jipmer: ["Physics", "Chemistry", "Biology", "Botany", "Zoology"],
  mht_cet: ["Mathematics", "Physics", "Chemistry"],
  mht_cet_medical: ["Physics", "Chemistry", "Biology"],
  nda: ["Mathematics", "English", "General Science", "General Studies", "General Ability"],
  bitsat: ["Mathematics", "Physics", "Chemistry", "English", "Logical Reasoning"],
  comedk: ["Mathematics", "Physics", "Chemistry"],
  wbjee: ["Mathematics", "Physics", "Chemistry"],
  kcet: ["Mathematics", "Physics", "Chemistry"],
  ap_eamcet: ["Mathematics", "Physics", "Chemistry"],
  ts_eamcet: ["Mathematics", "Physics", "Chemistry"],
  viteee: ["Mathematics", "Physics", "Chemistry", "English", "Aptitude"],
  manipal_met: ["Mathematics", "Physics", "Chemistry", "English", "General English"],
  nest_niser: ["Mathematics", "Physics", "Chemistry", "Biology"],
  iat_iiser: ["Mathematics", "Physics", "Chemistry", "Biology"],
  kvpy: ["Mathematics", "Physics", "Chemistry", "Biology"]
};

function subjectOrderForExam(format, slug) {
  if (slug && EXAM_SUBJECT_ORDER[slug]) return EXAM_SUBJECT_ORDER[slug];
  if (format === "neet") return EXAM_SUBJECT_ORDER.neet;
  if (format === "jee_advanced") return EXAM_SUBJECT_ORDER.jee_advanced;
  return EXAM_SUBJECT_ORDER.jee_main;
}

function organizeSubjectWisePaper(questionIds, opts) {
  const slug = (opts && opts.examSlug) || "";
  const format = resolvePaperFormat(opts || {});
  const preferred = subjectOrderForExam(format, slug);
  const bySubject = {};
  const seen = [];
  questionIds.forEach(id => {
    const q = getQ(id);
    const sub = (q && q.subject) || "Other";
    if (!bySubject[sub]) {
      bySubject[sub] = [];
      seen.push(sub);
    }
    bySubject[sub].push(id);
  });
  const orderedSubjects = [];
  preferred.forEach(s => { if (bySubject[s] && !orderedSubjects.includes(s)) orderedSubjects.push(s); });
  seen.forEach(s => { if (!orderedSubjects.includes(s)) orderedSubjects.push(s); });
  const orderedIds = [];
  const sections = [];
  orderedSubjects.forEach(sub => {
    const ids = bySubject[sub];
    if (!ids.length) return;
    sections.push({
      label: sub,
      shortLabel: sub.toUpperCase().slice(0, 4),
      subject: sub,
      start: orderedIds.length,
      count: ids.length
    });
    orderedIds.push(...ids);
  });
  return { orderedIds, sections };
}

/**
 * MARKS website full-paper layout (exact section chrome per exam).
 * Used by PYQ Mock for every exam: JEE Main / Advanced / NEET / CET / NDA / …
 */
function organizeMarksPaper(questionIds, opts) {
  const o = opts || {};
  const format = resolvePaperFormat(o);
  const slug = o.examSlug || o.paperFormat || "";

  // JEE Main / Abhyas — year-exact official pattern (never mix years)
  if (format === "jee_main") {
    return organizeJeeMainPaper(questionIds, {
      flexible: true,
      year: o.year,
      pattern: o.pattern
    });
  }
  // JEE Advanced ONLY — year/paper official sections (jeeadv.ac.in)
  if (format === "jee_advanced") {
    // Pre-pin types so Physics multi always gets MC section
    (questionIds || []).forEach(id => {
      try {
        const q = typeof getQ === "function" ? getQ(id) : null;
        if (!q) return;
        if (typeof qxPinJeeAdvQuestionType === "function") qxPinJeeAdvQuestionType(q);
        // Force multi when bank/Marks tagged multipleCorrect
        const t = String(q.questionType || q.type || "").toLowerCase();
        if (t.includes("multiple") || (Array.isArray(q.answers) && q.answers.length > 1)) {
          q.questionType = "multipleCorrect";
          q.type = "multipleCorrect";
          q._advSection = "MC";
        }
        // Fix blank option figures: rewrite pool imgs
        if (typeof QxImgClean !== "undefined" && QxImgClean.rewriteHtmlFigures) {
          if (q.q) q.q = QxImgClean.rewriteHtmlFigures(q.q);
          if (Array.isArray(q.options)) {
            q.options = q.options.map(op =>
              (op && /cdn-question-pool|cdn\.quizrr|img/i.test(String(op)))
                ? QxImgClean.rewriteHtmlFigures(String(op)) : op
            );
          }
        }
      } catch (_) { /* */ }
    });
    return organizeJeeAdvancedPaper(questionIds, {
      year: o.year,
      source: o.source,
      paperNum: o.paperNum,
      pattern: o.pattern
    });
  }
  // NEET UG — year-exact official pattern
  if (format === "neet") {
    return organizeNeetPaper(questionIds, {
      year: o.year,
      pattern: o.pattern
    });
  }
  // AIIMS / JIPMER medical variants
  if (format === "neet_medical") {
    return organizeSubjectTypePaper(questionIds, {
      subjectOrder: EXAM_SUBJECT_ORDER.aiims || ["Physics", "Chemistry", "Biology"],
      typeOrder: ["SC", "NUM", "MC"],
      labelStyle: "marks"
    });
  }
  // NDA, BITSAT, CET, etc. — subject sections in Marks/exam order, SC then NUM inside
  return organizeSubjectTypePaper(questionIds, {
    subjectOrder: subjectOrderForExam(format, slug),
    typeOrder: ["SC", "NUM", "MC", "MATCH"],
    labelStyle: "marks"
  });
}

/** Subject × type buckets with Marks-style section titles (no forced 20/5 caps). */
function organizeSubjectTypePaper(questionIds, opts) {
  const o = opts || {};
  const preferred = o.subjectOrder || EXAM_SUBJECT_ORDER.jee_main;
  const typeOrder = o.typeOrder || ["SC", "NUM", "MC", "MATCH"];
  const typeLabel = {
    SC: "Single Correct",
    NUM: "Numerical",
    MC: "Multiple Correct",
    MATCH: "Column Matching"
  };
  const buckets = {};
  const seenSubs = [];
  questionIds.forEach(id => {
    const q = getQ(id);
    if (!q) return;
    const sub = q.subject || "Other";
    const type = questionSectionType(q);
    if (!buckets[sub]) {
      buckets[sub] = { SC: [], NUM: [], MC: [], MATCH: [] };
      seenSubs.push(sub);
    }
    const key = buckets[sub][type] ? type : "SC";
    buckets[sub][key].push(id);
  });
  const subs = preferred.filter(s => buckets[s]).concat(seenSubs.filter(s => !preferred.includes(s)));
  const orderedIds = [];
  const sections = [];
  subs.forEach(sub => {
    // Prefer split SC/NUM when both exist (Marks JEE-style); else one subject section
    const hasSplit = typeOrder.filter(t => (buckets[sub][t] || []).length).length > 1;
    if (hasSplit) {
      typeOrder.forEach(type => {
        const arr = buckets[sub][type] || [];
        if (!arr.length) return;
        const lab = `${sub} ${typeLabel[type] || type}`;
        sections.push({
          label: lab,
          shortLabel: lab.toUpperCase(),
          subject: sub,
          type,
          start: orderedIds.length,
          count: arr.length
        });
        orderedIds.push(...arr);
      });
    } else {
      const arr = [];
      typeOrder.forEach(t => arr.push(...(buckets[sub][t] || [])));
      if (!arr.length) return;
      sections.push({
        label: sub,
        shortLabel: sub.toUpperCase(),
        subject: sub,
        start: orderedIds.length,
        count: arr.length
      });
      orderedIds.push(...arr);
    }
  });
  const placed = new Set(orderedIds);
  questionIds.forEach(id => { if (!placed.has(id)) orderedIds.push(id); });
  if (!sections.length && orderedIds.length) {
    sections.push({ label: "All Questions", shortLabel: "ALL", subject: "General", start: 0, count: orderedIds.length });
  }
  return { orderedIds, sections };
}

function organizeExamPaper(questionIds, opts) {
  // Always Marks full-paper layout for exam simulations / PYQ mocks
  return organizeMarksPaper(questionIds, opts || {});
}

/**
 * Quizrr CBT sections: e.g. "Mathematics Single Correct" + "Mathematics Numerical"
 * (screenshot 791/795) — always by question type, even for chapter packs.
 */
function organizeQuizrrTypeSections(questionIds) {
  const typeOrder = ["SC", "NUM", "MC", "MATCH"];
  const typeLabel = {
    SC: "Single Correct",
    NUM: "Numerical",
    MC: "Multiple Correct",
    MATCH: "Column Matching"
  };
  const subjectOrder = ["Mathematics", "Physics", "Chemistry", "Biology", "Botany", "Zoology"];
  const buckets = {};
  const orderedSubs = [];
  questionIds.forEach(id => {
    const q = getQ(id);
    if (!q) return;
    const sub = q.subject || "Mathematics";
    const type = questionSectionType(q);
    if (!buckets[sub]) {
      buckets[sub] = { SC: [], NUM: [], MC: [], MATCH: [] };
      orderedSubs.push(sub);
    }
    const key = buckets[sub][type] ? type : "SC";
    buckets[sub][key].push(id);
  });
  // Prefer standard PCM order, then any extra subjects
  const subs = subjectOrder.filter(s => buckets[s]).concat(orderedSubs.filter(s => !subjectOrder.includes(s)));
  const orderedIds = [];
  const sections = [];
  subs.forEach(sub => {
    typeOrder.forEach(type => {
      const arr = (buckets[sub] && buckets[sub][type]) || [];
      if (!arr.length) return;
      const lab = `${sub} ${typeLabel[type] || type}`;
      sections.push({
        label: lab,
        shortLabel: lab,
        subject: sub,
        type,
        start: orderedIds.length,
        count: arr.length
      });
      orderedIds.push(...arr);
    });
  });
  // Orphans (no getQ)
  const placed = new Set(orderedIds);
  questionIds.forEach(id => {
    if (!placed.has(id)) orderedIds.push(id);
  });
  if (!sections.length && orderedIds.length) {
    sections.push({
      label: "All Questions",
      shortLabel: "ALL",
      subject: "General",
      type: "SC",
      start: 0,
      count: orderedIds.length
    });
  }
  return { orderedIds, sections };
}
window.organizeQuizrrTypeSections = organizeQuizrrTypeSections;

/**
 * JEE Main — exact Marks website CBT (screenshot 807 / getmarks pyq-mt):
 * Tabs (Title Case): Mathematics Single Correct · Mathematics Numerical · Physics …
 * Palette headers (ALL CAPS) + GLOBAL numbers 1…N (Math SC 1–20, Math NUM 21–25, …)
 * flexible PYQ: keep every question from the shift; split SC vs NUM only.
 */
function organizeJeeMainPaper(questionIds, opts) {
  const flexible = !!(opts && opts.flexible);
  const year = opts && opts.year != null ? Number(opts.year) : null;
  let pattern = (opts && opts.pattern) || "";
  if (!pattern && typeof AllenTestUI !== "undefined" && AllenTestUI.jeeMainPattern) {
    pattern = AllenTestUI.jeeMainPattern(year, (questionIds || []).length, questionIds);
  }
  if (!pattern && typeof AllenTestUI !== "undefined" && AllenTestUI.inferJeeMainFromPaper) {
    pattern = AllenTestUI.inferJeeMainFromPaper(questionIds);
  }
  if (!pattern) {
    const n = (questionIds || []).length;
    if (year != null) {
      if (year <= 2012) pattern = "aieee_90";
      else if (year <= 2018) pattern = "main_90_mcq";
      else if (year <= 2020) pattern = "main_75_mcq";
      else if (year <= 2024) pattern = "main_90_num";
      else pattern = "main_75_num";
    } else {
      pattern = n >= 85 ? "main_90_mcq" : (n >= 70 ? "main_75_mcq" : "main_90_mcq");
    }
  }
  const bySubject = { Mathematics: [], Physics: [], Chemistry: [] };
  questionIds.forEach(id => {
    const q = getQ(id);
    if (!q) return;
    const sub = q.subject;
    if (bySubject[sub]) bySubject[sub].push(id);
    else if (/math/i.test(sub || "")) bySubject.Mathematics.push(id);
    else if (/phys/i.test(sub || "")) bySubject.Physics.push(id);
    else if (/chem/i.test(sub || "")) bySubject.Chemistry.push(id);
  });

  const orderedIds = [];
  const sections = [];
  // Marks: label = Title Case (tabs), shortLabel = ALL CAPS (palette headers)
  const spec = [
    {
      subject: "Mathematics",
      labels: ["Mathematics Single Correct", "Mathematics Numerical"],
      shorts: ["MATHEMATICS SINGLE CORRECT", "MATHEMATICS NUMERICAL"]
    },
    {
      subject: "Physics",
      labels: ["Physics Single Correct", "Physics Numerical"],
      shorts: ["PHYSICS SINGLE CORRECT", "PHYSICS NUMERICAL"]
    },
    {
      subject: "Chemistry",
      labels: ["Chemistry Single Correct", "Chemistry Numerical"],
      shorts: ["CHEMISTRY SINGLE CORRECT", "CHEMISTRY NUMERICAL"]
    }
  ];

  // Marks website year pattern:
  //  ≤2018: 30 MCQ / subject · 2019–20: 25 MCQ · 2021–24: 20 SC + 10 NUM · 2025–26: 20 SC + 5 NUM
  const pureMcq = pattern === "aieee_90" || pattern === "main_90_mcq" || pattern === "main_75_mcq";
  const numTarget = pureMcq ? 0 : (pattern === "main_75_num" ? 5 : (pattern === "main_90_num" ? 10 : 5));
  const numHint = pattern === "main_90_num"
    ? "Section B · Numerical (attempt any 5 of 10)"
    : "Section B · Numerical";

  spec.forEach(s => {
    const ids = bySubject[s.subject] || [];
    if (!ids.length) return;

    if (pureMcq) {
      sections.push({
        label: s.subject,
        shortLabel: s.subject.toUpperCase(),
        subject: s.subject,
        type: "SC",
        sectionHint: "MCQ",
        start: orderedIds.length,
        count: ids.length
      });
      orderedIds.push(...ids);
      return;
    }

    // Year-exact SC / NUM (fill untagged NAT, cap false NUM) — Marks 20+5 / 20+10
    let { scTake, numTake } = splitJeeMainSubjectIds(ids, numTarget);
    if (!flexible) {
      scTake = scTake.slice(0, 20);
      numTake = numTake.slice(0, numTarget);
    }

    [[scTake, s.labels[0], s.shorts[0], "SC"], [numTake, s.labels[1], s.shorts[1], "NUM"]].forEach(([arr, label, short, type]) => {
      if (!arr.length) return;
      sections.push({
        label,
        shortLabel: short,
        subject: s.subject,
        type,
        sectionHint: type === "NUM" ? numHint : "Section A · Single Correct",
        start: orderedIds.length,
        count: arr.length
      });
      orderedIds.push(...arr);
    });
  });

  const placed = new Set(orderedIds);
  questionIds.forEach(id => { if (!placed.has(id)) orderedIds.push(id); });

  return { orderedIds, sections };
}

function qxClearMountInlineStyles(main) {
  if (!main) return;
  main.style.position = "";
  main.style.inset = "";
  main.style.top = "";
  main.style.left = "";
  main.style.right = "";
  main.style.bottom = "";
  main.style.zIndex = "";
  main.style.opacity = "";
  main.style.pointerEvents = "";
  main.style.overflow = "";
  main.style.background = "";
  main.style.padding = "";
  main.style.maxWidth = "";
}

function qxClearBlockingMount() {
  if (document.body.classList.contains("marks-test-active") || document.body.classList.contains("allen-practice-active")) return;
  qxClearMountInlineStyles(document.getElementById("app-main"));
}

function qxForceResetShell(opts) {
  const o = opts || {};
  document.body.classList.remove("marks-test-active", "marks-instr-active", "allen-cbt-active", "allen-practice-active", "qzrr-instr-active", "ts-fmt-chooser-active");
  document.body.style.overflow = "";
  ["marksInstrOverlay", "marksCountdownOverlay", "mtkStopModal", "mtkSubmitModal", "tsResumeModal", "pyqResumeModal", "pyqPreviewModal", "tsFormatChooser"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  const appMain = document.getElementById("app-main");
  if (appMain) {
    if (o.clearContent) appMain.innerHTML = "";
    qxClearMountInlineStyles(appMain);
  }
  const sidebar = document.getElementById("sidebar");
  const topbar = document.querySelector(".topbar");
  const mainEl = document.querySelector(".main");
  if (sidebar) sidebar.style.display = "";
  if (topbar) topbar.style.display = "";
  if (mainEl) mainEl.style.marginLeft = "";
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
}
window.qxForceResetShell = qxForceResetShell;
window.qxClearBlockingMount = qxClearBlockingMount;
window.qxClearMountInlineStyles = qxClearMountInlineStyles;
window.qxShowTestMount = qxShowTestMount;

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const mount = document.getElementById("app-main");
  const blocking = mount && (mount.style.position === "fixed" || mount.style.zIndex === "9500")
    && !document.body.classList.contains("marks-test-active")
    && !document.body.classList.contains("allen-practice-active");
  if (!blocking) return;
  qxForceResetShell({ clearContent: false });
  if (typeof showToast === "function") showToast("Screen unlocked — tap Home or refresh if needed");
  if (!window.TS_STANDALONE && typeof go === "function") try { go("dashboard"); } catch (err) { /* */ }
  else if (window.TS_STANDALONE && typeof tsRenderStandalone === "function") tsRenderStandalone();
});

function qxShowTestMount(main) {
  if (!main) return;
  main.style.opacity = "1";
  main.style.pointerEvents = "auto";
  main.style.zIndex = "9500";
  if (window.TS_STANDALONE || main.id === "app-main") {
    main.style.position = "fixed";
    main.style.inset = "0";
    main.style.overflow = "auto";
    main.style.background = (typeof getTestTheme === "function" && getTestTheme() === "dark") ? "#070b16" : "#eef2f7";
  }
}

function enterMarksTestMode() {
  document.body.classList.add("marks-test-active", "allen-cbt-active");
  const appMain = document.getElementById("app-main");
  qxShowTestMount(appMain);
  const sidebar = document.getElementById("sidebar");
  const topbar = document.querySelector(".topbar");
  const main = document.querySelector(".main");
  const content = document.querySelector(".content");
  if (sidebar) sidebar.style.display = "none";
  if (topbar) topbar.style.display = "none";
  if (main) main.style.marginLeft = "0";
  if (content) content.style.padding = "0";
  if (content) content.style.maxWidth = "none";
  // CSS full-window only — never browser Fullscreen (that paints a second layer over subject tabs)
  try {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
  } catch (_) { /* */ }
}

function exitMarksTestMode() {
  if (typeof tsClearActiveQMap === "function") tsClearActiveQMap();
  qxForceResetShell({ clearContent: true });
  if (window.TS_STANDALONE && typeof tsRenderStandalone === "function") {
    try { tsRenderStandalone(); } catch (e) { console.error("tsRenderStandalone recovery:", e); }
  }
}

const MARKS_SESSION_STORE = "quantrex_marks_sessions_v2";
const MARKS_SESSION_LEGACY = "quantrex_marks_session_v1";

function marksMigrateSessions() {
  try {
    if (localStorage.getItem(MARKS_SESSION_STORE)) return;
    const raw = localStorage.getItem(MARKS_SESSION_LEGACY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && data.persistKey) {
      localStorage.setItem(MARKS_SESSION_STORE, JSON.stringify({ [data.persistKey]: data }));
    }
  } catch (e) { /* ignore */ }
}

function marksLoadAllSessions() {
  marksMigrateSessions();
  try {
    const data = JSON.parse(localStorage.getItem(MARKS_SESSION_STORE) || "{}");
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch (e) { return {}; }
}

function marksAutoPersistKey(title, ids, meta) {
  const slug = (meta && meta.slug) || "test";
  const src = meta && meta.source ? String(meta.source).replace(/[^\w\s.-]/g, "").slice(0, 48) : "";
  const t = String(title || "exam").replace(/[^\w\s.-]/g, "").slice(0, 32);
  return `qx::${slug}::${src || t}::${(ids || []).length}`;
}

function marksGetActiveSession() {
  const all = marksLoadAllSessions();
  let best = null;
  Object.values(all).forEach(data => {
    if (data && data.remainingSec > 0 && data.persistKey) {
      if (!best || (data.savedAt || 0) > (best.savedAt || 0)) best = data;
    }
  });
  return best;
}

function marksPersistSession() {
  if (!QuantrexTestEngine.getSession()) return;
  const s = QuantrexTestEngine.getSession();
  if (!s || s.submitted || !s.persistKey) return;
  const data = {
    persistKey: s.persistKey,
    ids: s.ids,
    title: s.title,
    returnTo: s.returnTo,
    testType: s.testType,
    modeLabel: s.modeLabel,
    durationSec: s.durationSec,
    remainingSec: s.remainingSec,
    idx: s.idx,
    answers: s.answers,
    review: [...s.review],
    visited: [...s.visited],
    sections: s.sections,
    marksMode: s.marksMode,
    organizeJee: true,
    meta: s.meta,
    paperFormat: s.paperFormat || (s.meta && s.meta.slug) || null,
    shuffle: s.shuffle !== false,
    uiMode: s.uiMode || "quantrex",
    practiceMode: !!s.practiceMode,
    _egChecked: s._egChecked || {},
    _egCorrect: s._egCorrect || {},
    _egShowAnswer: !!s._egShowAnswer,
    startedAt: s.startedAt,
    qTimes: s.qTimes || {},
    _egSideCollapsed: !!s._egSideCollapsed,
    _sideCollapsed: !!s._sideCollapsed,
    _qzrrSideCollapsed: !!(s._sideCollapsed || s._qzrrSideCollapsed),
    savedAt: Date.now()
  };
  try {
    const all = marksLoadAllSessions();
    all[s.persistKey] = data;
    localStorage.setItem(MARKS_SESSION_STORE, JSON.stringify(all));
  } catch (e) { /* ignore */ }
}

function marksLoadSession(key) {
  const all = marksLoadAllSessions();
  const data = all[key];
  if (!data || data.persistKey !== key) return null;
  // Allow resume if time left OR answered something (don't drop mid-test save)
  const hasAnswers = data.answers && Object.keys(data.answers).length > 0;
  if ((data.remainingSec != null && data.remainingSec > 0) || hasAnswers) return data;
  return null;
}

function marksClearSession(key) {
  try {
    if (key) {
      const all = marksLoadAllSessions();
      delete all[key];
      localStorage.setItem(MARKS_SESSION_STORE, JSON.stringify(all));
    } else {
      localStorage.removeItem(MARKS_SESSION_STORE);
      localStorage.removeItem(MARKS_SESSION_LEGACY);
    }
  } catch (e) { /* ignore */ }
}

/**
 * Instructions HTML — ALWAYS official year pattern via AllenTestUI when available.
 * Old generic long instructions removed (no second/false format).
 */
function marksInstructionHtml(config) {
  if (typeof AllenTestUI !== "undefined" && AllenTestUI.instructionHtml) {
    return AllenTestUI.instructionHtml(config || {});
  }
  // Minimal fallback only if Allen UI missing
  const n = (config.questionIds || []).length;
  const mins = config.durationSec ? Math.floor(config.durationSec / 60) : "—";
  return `<div id="marksInstrOverlay" class="allen-instr-fullpage" role="dialog">
    <header class="allen-instr-top"><strong>Quantrex Academy</strong>
      <button type="button" class="allen-instr-exit" onclick="marksCancelInstructions()">✕ Exit</button></header>
    <div class="allen-instr-scroll"><div class="allen-instr-inner">
      <h1 class="allen-instr-title">${(config && config.title) || "Examination"}</h1>
      <div class="allen-instr-stats">
        <div><span>Questions</span><strong>${n}</strong></div>
        <div><span>Duration</span><strong>${mins} min</strong></div>
      </div>
      <p>Official NTA CBT instructions will load with the full UI. Confirm to continue.</p>
      <label class="allen-instr-check"><input type="checkbox" id="qzInstrAgree"/> I have read the instructions.</label>
    </div></div>
    <footer class="allen-instr-foot">
      <button type="button" class="allen-instr-cancel" onclick="marksCancelInstructions()">Go Back</button>
      <button type="button" class="allen-instr-proceed" id="qzInstrProceed" onclick="marksAcceptInstructions()" disabled>Proceed to Test →</button>
    </footer>
  </div>`;
}

let _marksInstrDone = null;
let _marksInstrCancel = null;

function marksRestoreInstrShell() {
  document.body.classList.remove("marks-instr-active");
  const tsApp = document.querySelector(".ts-app");
  if (tsApp && tsApp.dataset.prevDisplay !== undefined) {
    tsApp.style.display = tsApp.dataset.prevDisplay;
    delete tsApp.dataset.prevDisplay;
  }
}

function marksCancelInstructions() {
  const el = document.getElementById("marksInstrOverlay");
  if (el) el.remove();
  marksRestoreInstrShell();
  document.body.classList.remove("marks-instr-active", "allen-cbt-active", "qzrr-instr-active", "ts-fmt-chooser-active");
  const cancelFn = window._marksInstrCancel || _marksInstrCancel;
  _marksInstrDone = null;
  _marksInstrCancel = null;
  window._marksInstrDone = null;
  window._marksInstrCancel = null;
  const tsRoot = document.getElementById("ts-root");
  if (tsRoot) {
    tsRoot.style.display = "";
    tsRoot.style.removeProperty("opacity");
    tsRoot.style.removeProperty("pointer-events");
  }
  const appMain = document.getElementById("app-main");
  if (appMain && !document.body.classList.contains("marks-test-active")) {
    appMain.style.removeProperty("opacity");
    appMain.style.removeProperty("pointer-events");
    appMain.style.removeProperty("z-index");
  }
  if (document.body.classList.contains("marks-test-active")) {
    if (typeof exitMarksTestMode === "function") exitMarksTestMode();
    return;
  }
  if (typeof cancelFn === "function") {
    try { cancelFn(); } catch (e) { console.error("marksCancelInstructions:", e); }
  } else if (window.TS_STANDALONE && typeof tsRenderStandalone === "function") {
    tsRenderStandalone();
  }
}
window.marksCancelInstructions = marksCancelInstructions;

function marksAcceptInstructions() {
  const cb = document.getElementById("qzInstrAgree");
  if (cb && !cb.checked) {
    if (typeof showToast === "function") showToast("Please confirm you read the instructions");
    return;
  }
  const el = document.getElementById("marksInstrOverlay");
  if (el) el.remove();
  marksRestoreInstrShell();
  document.body.classList.remove("marks-instr-active", "qzrr-instr-active", "ts-fmt-chooser-active");
  document.body.classList.add("allen-cbt-active");
  const doneFn = window._marksInstrDone || _marksInstrDone;
  _marksInstrDone = null;
  _marksInstrCancel = null;
  window._marksInstrDone = null;
  window._marksInstrCancel = null;
  if (typeof doneFn === "function") doneFn();
}
window.marksAcceptInstructions = marksAcceptInstructions;

function showMarksInstructions(config, onDone, onCancel) {
  // Always prefer official Allen year-pattern instructions (one screen only)
  if (typeof showAllenInstructions === "function") {
    showAllenInstructions(config, onDone, onCancel);
    return;
  }
  const marksMode = config.marksMode;
  const main = getTestMountEl();
  if (main && marksMode && main.id === "app-main") main.innerHTML = "";
  const existing = document.getElementById("marksInstrOverlay");
  if (existing) existing.remove();
  _marksInstrDone = onDone;
  _marksInstrCancel = onCancel;
  window._marksInstrDone = onDone;
  window._marksInstrCancel = onCancel;
  document.body.classList.add("marks-instr-active", "allen-cbt-active");
  document.body.insertAdjacentHTML("beforeend", marksInstructionHtml(config));
  if (typeof bindAllenInstructionEvents === "function") bindAllenInstructionEvents();
  else {
    const agree = document.getElementById("qzInstrAgree");
    const proceedBtn = document.getElementById("qzInstrProceed");
    if (agree && proceedBtn) agree.addEventListener("change", () => { proceedBtn.disabled = !agree.checked; });
  }
  window.scrollTo(0, 0);
}

function showMarksCountdown(onDone) {
  const existing = document.getElementById("marksCountdownOverlay");
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.id = "marksCountdownOverlay";
  overlay.className = "marks-countdown-overlay";
  overlay.innerHTML = `<div class="marks-countdown-inner">
    <div class="marks-countdown-grab">Grab Your Pen &amp; Paper</div>
    <div class="marks-countdown-label">Test starts in</div>
    <div class="marks-countdown-num">3</div>
  </div>`;
  document.body.appendChild(overlay);
  let n = 3;
  const numEl = overlay.querySelector(".marks-countdown-num");
  const tick = () => {
    if (n > 0) {
      if (numEl) numEl.textContent = String(n);
      n--;
      setTimeout(tick, 1000);
    } else {
      if (numEl) numEl.textContent = "Go!";
      setTimeout(() => {
        overlay.remove();
        enterMarksTestMode();
        const main = getTestMountEl();
        if (main) {
          qxShowTestMount(main);
          main.innerHTML = typeof tsTestLoadingHtml === "function" ? tsTestLoadingHtml() : '<div class="mtk-test-root allen-cbt ts-test-loading" style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f4f7fb;color:#1a2b4a;font-size:17px">Loading test…</div>';
        }
        const run = typeof onDone === "function" ? onDone() : null;
        Promise.resolve(run).catch(err => {
          console.error("Quantrex countdown onDone failed:", err);
          showToast("⚠️ Could not start test. Try again.");
          exitMarksTestMode();
          if (main) main.innerHTML = "";
          if (window.TS_STANDALONE && typeof tsRenderStandalone === "function") tsRenderStandalone();
        });
      }, 600);
    }
  };
  setTimeout(tick, 400);
}

function launchTestSession(main) {
  if (!main) main = getTestMountEl();
  if (!main) {
    console.error("Quantrex: no test mount element (#app-main or #ts-root)");
    showToast("⚠️ Could not open test. Refresh and try again.");
    exitMarksTestMode();
    if (window.TS_STANDALONE && typeof tsRenderStandalone === "function") tsRenderStandalone();
    return;
  }
  try {
    enterMarksTestMode();
    document.body.classList.remove("marks-instr-active");
    if (main.id === "app-main") qxShowTestMount(main);
    if (typeof currentView !== "undefined") currentView = "test";
    const html = QuantrexTestEngine.render();
    if (!html || !String(html).trim()) {
      throw new Error("Test render returned empty HTML");
    }
    main.innerHTML = html;
    setTestTheme(getTestTheme());
    setTestFontScale(getTestFontScale());
    QuantrexTestEngine.bindEvents(main);
    QuantrexTestEngine.launchTimer();
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    if (typeof Mx !== "undefined") {
      if (Mx.afterRenderLight) Mx.afterRenderLight(main);
      else Mx.afterRender(main);
    }
  } catch (err) {
    console.error("Quantrex launchTestSession failed:", err);
    showToast("⚠️ Test UI failed to load. Refresh and try again.");
    exitMarksTestMode();
    main.innerHTML = "";
    if (window.TS_STANDALONE && typeof tsRenderStandalone === "function") tsRenderStandalone();
  }
}

async function startTest(questionIds, title, returnTo, options) {
  const opts = options || {};
  try {
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.allow) {
      const gate = {
        exam: (opts.meta && (opts.meta.slug || opts.meta.exam || opts.meta.track)) || (typeof STATE !== "undefined" ? STATE.exam : ""),
        slug: (opts.meta && opts.meta.slug) || "",
        subject: (opts.meta && (opts.meta.subject || opts.meta.subjectName)) || "",
        testType: opts.testType || returnTo || "",
        seriesId: (opts.meta && opts.meta.seriesId) || opts.seriesId || "",
        provider: (opts.meta && opts.meta.provider) || "",
        title: title || "",
        testId: opts.testId || "",
        source: (opts.meta && opts.meta.source) || "",
        year: (opts.meta && opts.meta.year) || "",
        paperId: (/pyqmock/i.test(String(opts.testType || returnTo || ""))
          ? ((opts.meta && (opts.meta.source || opts.meta.paperId)) || "")
          : (opts.testId || "")),
        chapter: (opts.meta && (opts.meta.chapter || opts.meta.chapterId)) || "",
        bookId: (opts.meta && (opts.meta.bookId || opts.meta.book)) || "",
        moduleId: (opts.meta && opts.meta.moduleId) || "",
        startTest: true
      };
      if (!QuantrexAccess.allow("test", gate)) {
        if (typeof finishRender === "function") finishRender(QuantrexAccess.paywallHtml("test", gate));
        else if (typeof showToast === "function") showToast("This course is locked — buy it on the payment page");
        return;
      }
    }
  } catch (_) { /* */ }
  const isTs = opts.testType === "testseries";
  const marksMode = opts.marksMode !== false;
  // Practice / non-TS: Quantrex-best (examgoal chrome). Test Series: NTA-exact (quizrr) by default.
  let uiMode = opts.uiMode || (opts.resumeData && opts.resumeData.uiMode) || null;
  if (isTs) {
    if (!uiMode) {
      try { uiMode = localStorage.getItem("ts_last_ui_mode") || "quizrr"; } catch (_) { uiMode = "quizrr"; }
    }
    if (uiMode !== "examgoal" && uiMode !== "quantrex" && uiMode !== "quizrr") uiMode = "quizrr";
  } else {
    // Practice / PYQ / custom: Quantrex-best shell
    uiMode = opts.practiceMode ? "examgoal" : (uiMode || "examgoal");
    if (!opts.practiceMode && opts.testType === "pyqmock") uiMode = uiMode || "examgoal";
    uiMode = "examgoal";
  }
  if (uiMode === "quantrex") uiMode = "examgoal";
  const practiceMode = !!opts.practiceMode;
  const skipInstr = !!(opts.skipInstructions || practiceMode || !isTs);
  const skipCd = !!(opts.skipCountdown || practiceMode || opts.testType === "pyqmock" || !isTs);
  // Full window for every exam. JEE Main Test Series still shows instructions first.
  if (skipInstr) {
    try { if (typeof enterMarksTestMode === "function") enterMarksTestMode(); } catch (_) { /* */ }
  }
  const config = {
    questionIds,
    title,
    returnTo,
    testType: opts.testType || returnTo || "custom",
    durationSec: practiceMode ? null : opts.durationSec,
    timed: practiceMode ? false : opts.timed,
    practiceMode,
    shuffle: opts.shuffle !== false,
    modeLabel: opts.modeLabel,
    scoring: opts.scoring,
    testId: opts.testId,
    onComplete: opts.onComplete,
    marksMode,
    organizeJee: opts.organizeJee !== false,
    sections: opts.sections || null,
    deferTimer: marksMode && !skipCd,
    persistKey: opts.persistKey || (marksMode ? marksAutoPersistKey(title, questionIds, opts.meta) : null),
    meta: opts.meta || null,
    resumeData: opts.resumeData || null,
    paperFormat: opts.paperFormat || (opts.resumeData && opts.resumeData.paperFormat) || null,
    // Marks instruction banner: year-wise official totals (passed from startPyqPaperMock)
    catalogTotalQs: opts.catalogTotalQs || null,
    expectedQs: opts.expectedQs || opts.catalogTotalQs || null,
    totalMarks: opts.totalMarks || null,
    catalogDurationMin: opts.catalogDurationMin || (opts.durationSec ? Math.floor(opts.durationSec / 60) : null),
    shuffle: opts.resumeData ? opts.resumeData.shuffle !== false : (opts.shuffle !== false),
    uiMode: uiMode === "quizrr" ? "quizrr" : "examgoal"
  };

  const main = getTestMountEl();
  try {
    if (main && typeof qxLoadLogoHtml === "function" && !main.querySelector(".eg-test-root, .mtk-test-root")) {
      main.innerHTML = qxLoadLogoHtml(practiceMode ? "Opening practice…" : "Starting test…");
    }
  } catch (_) { /* */ }
  const run = async () => {
    try {
      const bookReady = opts.testType === "book"
        || !!(opts.meta && opts.meta.bookId)
        || (typeof qxBookQsAlreadyLoaded === "function" && qxBookQsAlreadyLoaded(questionIds));
      if (!bookReady && typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.questionsByIds) {
        try {
          showToast("📚 Loading question options…");
          for (let i = 0; i < questionIds.length; i += 20) {
            const chunk = questionIds.slice(i, i + 20);
            const data = await QuantrexCatalog.questionsByIds(chunk);
            ((data && data.questions) || []).forEach((rec) => {
              if (!rec) return;
              let q = null;
              if (typeof getQ === "function") {
                q = getQ(rec.id) || getQ(rec._marksId) || getQ("m_" + rec.id);
                if (!q && rec._marksId) q = getQ("m_" + rec._marksId);
              }
              if (!q && typeof QUESTIONS !== "undefined") {
                q = QUESTIONS.find(function (x) {
                  return x && (String(x.id) === String(rec.id) || String(x._marksId) === String(rec.id)
                    || String(x._marksId) === String(rec._marksId) || String(x.id) === String(rec._marksId));
                });
              }
              if (q && QuantrexCatalog.applyCatalogRec) QuantrexCatalog.applyCatalogRec(q, rec);
              else if (!q && typeof QUESTIONS !== "undefined") {
                const nq = Object.assign({ _listStub: false, _catalogTried: true }, rec);
                QUESTIONS.push(nq);
                if (typeof _qxIndexQuestion === "function") _qxIndexQuestion(nq);
              }
            });
          }
        } catch (_) { /* continue into test */ }
      }
      const ok = QuantrexTestEngine.begin(config);
      if (!ok) {
        exitMarksTestMode();
        if (window.TS_STANDALONE && typeof tsRenderStandalone === "function") tsRenderStandalone();
        return;
      }
      launchTestSession(main);
    } catch (err) {
      console.error("Quantrex startTest run failed:", err);
      showToast("⚠️ Could not start test. Try again.");
      exitMarksTestMode();
      if (window.TS_STANDALONE && typeof tsRenderStandalone === "function") tsRenderStandalone();
    }
  };

  const launchMarks = () => {
    if (marksMode && !skipCd) showMarksCountdown(run);
    else { enterMarksTestMode(); run(); }
  };

  // Instructions: Test Series only. PYQ mock + practice never show exam instructions.
  if (marksMode && !skipInstr) {
    const cancel = () => {
      if (window.TS_STANDALONE && typeof tsRenderStandalone === "function") tsRenderStandalone();
    };
    if (typeof showAllenInstructions === "function") {
      showAllenInstructions(config, launchMarks, cancel);
      return;
    }
    if (typeof showMarksInstructions === "function") {
      showMarksInstructions(config, launchMarks, cancel);
      return;
    }
  }
  launchMarks();
}

function renderTest() {
  return QuantrexTestEngine.render();
}

async function startChapterTest(questionIds, meta) {
  if (!questionIds.length) { showToast("⚠️ No questions in this chapter."); return; }
  const limit = meta.limit || Math.min(30, questionIds.length);
  const pool = questionIds.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const ids = pool.slice(0, limit);
  const mins = Math.ceil(ids.length * 1.5);
  startTest(ids, meta.title || "Chapter Test", meta.returnTo || "tests", {
    testType: "chapter",
    timed: true,
    durationSec: mins * 60,
    modeLabel: `Chapter Test · ${mins} min`,
    marksMode: true,
    uiMode: "examgoal",
    skipInstructions: true
  });
  if (typeof MarksLive !== "undefined" && MarksLive.prefetchQuestions) {
    MarksLive.prefetchQuestions(ids).catch(() => {});
  }
}

async function startMockTest(examSlug, options) {
  const opts = options || {};
  if (typeof loadSingleBank === "function" && !_banksLoaded[examSlug]) {
    showToast("📚 Loading exam paper…");
    await loadSingleBank(examSlug, { allowLarge: true });
  }
  let pool = QUESTIONS.filter(q => q._bank === examSlug);
  if (opts.subject) pool = pool.filter(q => q.subject === opts.subject);
  if (opts.year && typeof qYearFromSource === "function") {
    pool = pool.filter(q => qYearFromSource(q.source) === Number(opts.year));
  }
  if (!pool.length) { showToast("⚠️ No questions found for this mock."); return; }
  const count = opts.count || (STATE.exam === "Medical" ? 180 : 90);
  const ids = pool.map(q => q.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const selected = ids.slice(0, Math.min(count, ids.length));
  const duration = opts.durationSec || (STATE.exam === "Medical" ? 3 * 3600 : 3 * 3600);
  const bankTitle = (BANK_INDEX[examSlug] && BANK_INDEX[examSlug].title) || examSlug;
  startTest(selected, opts.title || `${bankTitle} Mock`, "tests", {
    testType: "mock",
    timed: true,
    durationSec: duration,
    modeLabel: `${bankTitle} · ${Math.floor(duration / 60)} min`,
    marksMode: true,
    uiMode: "examgoal",
    skipInstructions: true
  });
  if (typeof MarksLive !== "undefined" && MarksLive.prefetchQuestions) {
    MarksLive.prefetchQuestions(selected).catch(() => {});
  }
}

function mtkQviewSettingsHtml() {
  const scale = getTestFontScale();
  const presets = TEST_FONT_ORDER.map(s =>
    `<button type="button" class="mtk-font-preset ${scale === s ? "on" : ""}" data-scale="${s}" onclick="setTestFontScale('${s}');toggleMtkQviewSettings(false)">${TEST_FONT_LABELS[s]}</button>`
  ).join("");
  return `<div class="mtk-qview-overlay" id="mtkQviewOverlay" onclick="if(event.target===this)toggleMtkQviewSettings(false)">
    <aside class="mtk-qview-panel" onclick="event.stopPropagation()">
      <div class="mtk-qview-head">
        <strong>Question View Settings</strong>
        <button type="button" class="mtk-qview-close" onclick="toggleMtkQviewSettings(false)">✕</button>
      </div>
      <section class="mtk-qview-sec">
        <h4>PRACTICE EXPERIENCE</h4>
        <label class="mtk-qview-label">Text Size</label>
        <div class="mtk-font-presets">${presets}</div>
        <p class="mtk-qview-hint">Use A− / A+ on the right panel for quick changes during the test.</p>
      </section>
    </aside>
  </div>`;
}

function toggleMtkQviewSettings(show) {
  const existing = document.getElementById("mtkQviewOverlay");
  if (show === false || existing) {
    if (existing) existing.remove();
    return;
  }
  document.body.insertAdjacentHTML("beforeend", mtkQviewSettingsHtml());
}

function mtkStopModalHtml(mode) {
  const sess = typeof QuantrexTestEngine !== "undefined" ? QuantrexTestEngine.getSession() : null;
  const qNum = sess ? ((sess.idx || 0) + 1) : 1;
  const total = sess && sess.ids ? sess.ids.length : 0;
  const resumeWhere = sess && sess.testType === "testseries"
    ? "Test Series → same test (Resume)"
    : sess && sess.testType === "pyqmock"
      ? "PYQ Mock Tests → Resume"
      : "your tests list (Resume)";
  const canSave = !!(sess && (sess.persistKey || sess.marksMode));
  const hint = canSave
    ? `Progress will be <strong>saved at Q${qNum}${total ? " / " + total : ""}</strong> with your answers and remaining time. Open the same test again and tap <strong>Resume</strong> to continue from there (${resumeWhere}).`
    : "Leave this test? Progress may not be saved for this session.";
  const actionBtn = canSave ? "Save &amp; Exit — Resume later" : "Exit Test";
  return `<div class="marks-modal-overlay" id="mtkStopModal" onclick="if(event.target===this)mtkCloseStopModal()">
    <div class="marks-resume-modal marks-stop-modal">
      <button type="button" class="marks-resume-close" onclick="mtkCloseStopModal()">✕</button>
      <div class="marks-resume-icon">💾</div>
      <h3>Save &amp; Exit?</h3>
      <p class="marks-resume-hint">${hint}</p>
      <button type="button" class="marks-resume-btn" onclick="mtkConfirmStop('exit')">${actionBtn}</button>
      <button type="button" class="marks-resume-cancel" onclick="mtkCloseStopModal()">Continue Test</button>
    </div>
  </div>`;
}

function mtkShowStopModal(mode) {
  mtkCloseStopModal();
  document.body.insertAdjacentHTML("beforeend", mtkStopModalHtml(mode));
}

function mtkCloseStopModal() {
  const el = document.getElementById("mtkStopModal");
  if (el) el.remove();
}

function mtkConfirmStop(mode) {
  mtkCloseStopModal();
  try {
    if (typeof window.qxExitTest === "function") {
      window.qxExitTest(true);
      return;
    }
    const eng = typeof QuantrexTestEngine !== "undefined" ? QuantrexTestEngine : null;
    if (eng && eng.stopAndSave) eng.stopAndSave();
    else if (eng && eng.quit) eng.quit(true);
  } catch (e) {
    console.error("mtkConfirmStop", e);
  }
}

/** Global Exit — used by inline onclick + bindEvents (always save for resume) */
window.qxExitTest = function qxExitTest(force) {
  try {
    const eng = typeof QuantrexTestEngine !== "undefined" ? QuantrexTestEngine : null;
    if (!eng || !eng.getSession || !eng.getSession()) {
      if (typeof exitMarksTestMode === "function") exitMarksTestMode();
      if (window.TS_STANDALONE && typeof tsRenderStandalone === "function") tsRenderStandalone();
      else if (typeof go === "function") go("testseries");
      return;
    }
    if (eng.quit) eng.quit(!!force);
    else if (eng.stopAndSave) eng.stopAndSave();
  } catch (e) {
    console.error("qxExitTest", e);
    try {
      if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.stopAndSave) {
        QuantrexTestEngine.stopAndSave();
      }
    } catch (_) { /* */ }
  }
};

/** Global Submit — footer + inline onclick (always works even if re-bind missed) */
window.qxSubmitTest = function qxSubmitTest() {
  try {
    const eng = typeof QuantrexTestEngine !== "undefined" ? QuantrexTestEngine : null;
    if (!eng || !eng.getSession || !eng.getSession()) {
      if (typeof showToast === "function") showToast("⚠️ No active test to submit");
      return;
    }
    // Prefer modal; if it fails or is hidden behind UI, fall back to confirm()
    try {
      if (typeof mtkShowSubmitModal === "function") {
        mtkShowSubmitModal();
        // Ensure modal is on top of #app-main (z-index 9500)
        const ov = document.getElementById("mtkSubmitModal");
        if (ov) {
          ov.style.zIndex = "20100";
          ov.style.position = "fixed";
          return;
        }
      }
    } catch (err) {
      console.warn("submit modal failed", err);
    }
    if (window.confirm("Submit test now? You cannot change answers after submitting.")) {
      if (eng.submit) eng.submit(false);
    }
  } catch (e) {
    console.error("qxSubmitTest", e);
    try {
      if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.submit) {
        if (window.confirm("Submit test now?")) QuantrexTestEngine.submit(false);
      }
    } catch (_) { /* */ }
  }
};

// Capture-phase backup if header re-render loses handlers
document.addEventListener("click", function qxExitBtnDelegate(ev) {
  try {
    const btn = ev.target && ev.target.closest && ev.target.closest("#mtkExitBtn, [data-qx-exit], .mtk-exit-only");
    if (!btn) return;
    // Let inline handler run first; if it already prevented, still ensure exit
    if (ev.eventPhase === Event.CAPTURING_PHASE) {
      // Don't double-fire if already handled this tick
      if (window._qxExitLock && Date.now() - window._qxExitLock < 500) return;
    }
    window._qxExitLock = Date.now();
    // Inline onclick also fires — only use delegate when no inline
    if (btn.getAttribute("onclick")) return;
    ev.preventDefault();
    if (typeof window.qxExitTest === "function") window.qxExitTest();
  } catch (_) { /* */ }
}, true);

function mtkSubmitModalHtml() {
  const sess = typeof QuantrexTestEngine !== "undefined" ? QuantrexTestEngine.getSession() : null;
  if (!sess) return "";
  const s = (() => {
    let answered = 0, skipped = 0, unvisited = 0, review = 0;
    sess.ids.forEach((_, i) => {
      const chosen = sess.answers[i];
      const visited = sess.visited.has(i);
      const rev = sess.review.has(i);
      if (!visited) { unvisited++; return; }
      if (chosen === undefined) { skipped++; if (rev) review++; return; }
      answered++;
      if (rev) review++;
    });
    return { answered, skipped, unvisited, review };
  })();
  const rows = sess.marksMode
    ? `<div class="marks-submit-stats">
        <span><strong>${s.answered}</strong> Answered</span>
        <span><strong>${s.skipped}</strong> Not Answered</span>
        <span><strong>${s.unvisited}</strong> Not Visited</span>
        <span><strong>${s.review}</strong> Marked for Review</span>
      </div>`
    : `<div class="marks-submit-stats">
        <span><strong>${s.answered}</strong> Answered</span>
        <span><strong>${s.review}</strong> Marked for Review</span>
        <span><strong>${s.unvisited + s.skipped}</strong> Skipped/Unvisited</span>
      </div>`;
  return `<div class="marks-modal-overlay" id="mtkSubmitModal" onclick="if(event.target===this)mtkCloseSubmitModal()">
    <div class="marks-resume-modal marks-stop-modal">
      <button type="button" class="marks-resume-close" onclick="mtkCloseSubmitModal()">✕</button>
      <div class="marks-resume-icon">📋</div>
      <h3>Submit Test?</h3>
      <p class="marks-resume-hint">Review your attempt summary before final submission. You cannot change answers after submitting.</p>
      ${rows}
      <button type="button" class="marks-resume-btn" onclick="mtkConfirmSubmit()">✓ Submit Test</button>
      <button type="button" class="marks-resume-cancel" onclick="mtkCloseSubmitModal()">Continue Test</button>
    </div>
  </div>`;
}

function mtkShowSubmitModal() {
  mtkCloseSubmitModal();
  const html = mtkSubmitModalHtml();
  if (html) document.body.insertAdjacentHTML("beforeend", html);
}

function mtkCloseSubmitModal() {
  const el = document.getElementById("mtkSubmitModal");
  if (el) el.remove();
}

function mtkConfirmSubmit() {
  mtkCloseSubmitModal();
  if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.submit) {
    QuantrexTestEngine.submit(false);
  }
}
// Ensure submit/exit modals work from inline onclick on all pages
window.mtkShowSubmitModal = mtkShowSubmitModal;
window.mtkCloseSubmitModal = mtkCloseSubmitModal;
window.mtkConfirmSubmit = mtkConfirmSubmit;
window.mtkShowStopModal = typeof mtkShowStopModal === "function" ? mtkShowStopModal : window.mtkShowStopModal;
window.mtkCloseStopModal = typeof mtkCloseStopModal === "function" ? mtkCloseStopModal : window.mtkCloseStopModal;
window.mtkConfirmStop = typeof mtkConfirmStop === "function" ? mtkConfirmStop : window.mtkConfirmStop;

// Capture-phase Submit backup (same pattern as Exit)
document.addEventListener("click", function qxSubmitBtnDelegate(ev) {
  try {
    const btn = ev.target && ev.target.closest && ev.target.closest("#qxSubmitBtn, #qxSubmitTop");
    if (!btn) return;
    if (window._qxSubmitLock && Date.now() - window._qxSubmitLock < 400) return;
    // Prefer explicit handlers; if they didn't stop, still ensure submit opens
    if (btn.getAttribute("onclick")) return; // inline handles it
    window._qxSubmitLock = Date.now();
    ev.preventDefault();
    if (typeof window.qxSubmitTest === "function") window.qxSubmitTest();
  } catch (_) { /* */ }
}, true);

// Capture-phase Save & Next / Prev / Mark-Review — never miss taps when re-render races
document.addEventListener("pointerup", function qxNavBtnDelegate(ev) {
  try {
    if (!ev || ev.button != null && ev.button !== 0) return;
    const btn = ev.target && ev.target.closest && ev.target.closest("#qxSaveBtn, #qxNextBtn, #qxPrevBtn, #qxReviewNextBtn, #qxSkipBtn");
    if (!btn || btn.disabled) return;
    const eng = typeof QuantrexTestEngine !== "undefined" ? QuantrexTestEngine : null;
    if (!eng || !eng.isActive || !eng.isActive()) return;
    // If handler already fired this tick, skip
    if (window._qxNavLock && Date.now() - window._qxNavLock < 70) return;
    // Prefer element handler if still attached and recent bind — only backup if no onclick and no recent paint
    const id = btn.id || "";
    window._qxNavLock = Date.now();
    // Don't double-fire when bindEvents already handled (click fires after pointerup)
    // Only act on touch/pen where click is flaky; mouse uses onclick
    if (ev.pointerType === "mouse") return;
    ev.preventDefault();
    ev.stopPropagation();
    if (id === "qxSaveBtn" || id === "qxNextBtn") {
      // saveAndNext not exported — re-click path: dispatch via bound onclick if present
      if (typeof btn.onclick === "function") btn.onclick(ev);
      else if (eng.getSession) {
        const s = eng.getSession();
        if (s && s.idx < s.ids.length - 1) {
          // force go via re-bind
          const root = document.getElementById("app-main") || document.body;
          if (eng.bindEvents) eng.bindEvents(root);
          const again = root.querySelector("#qxSaveBtn");
          if (again && again.onclick) again.onclick(ev);
        }
      }
    } else if (typeof btn.onclick === "function") {
      btn.onclick(ev);
    }
  } catch (_) { /* */ }
}, true);

document.addEventListener("click", function qxOptSelectDelegate(ev) {
  try {
    const btn = ev.target && ev.target.closest && ev.target.closest(".mtk-opt[data-opt], .qx-prac-opt[data-prac-opt]");
    if (!btn) return;
    const eng = typeof QuantrexTestEngine !== "undefined" ? QuantrexTestEngine : null;
    if (!eng || !eng.isActive || !eng.isActive()) return;
    if (window._qxOptLock && Date.now() - window._qxOptLock < 80) return;
    window._qxOptLock = Date.now();
    const i = parseInt(btn.getAttribute("data-opt") || btn.getAttribute("data-prac-opt"), 10);
    if (Number.isNaN(i)) return;
    if (typeof btn.onclick === "function") return; // bindEvents already handles
    ev.preventDefault();
    if (eng.selectAnswer) eng.selectAnswer(i);
  } catch (_) { /* */ }
}, true);

document.addEventListener("click", function qxSidePanelDelegate(ev) {
  try {
    const btn = ev.target && ev.target.closest && ev.target.closest("#mtkPalClose, #mtkPalOpen, #qzrrPalClose, #qzrrSideToggle");
    if (!btn) return;
    const eng = typeof QuantrexTestEngine !== "undefined" ? QuantrexTestEngine : null;
    if (!eng || !eng.isActive || !eng.isActive()) return;
    if (window._qxSideLock && Date.now() - window._qxSideLock < 80) return;
    window._qxSideLock = Date.now();
    ev.preventDefault();
    ev.stopPropagation();
    const id = btn.id || "";
    if (id === "mtkPalClose" || id === "qzrrPalClose") {
      if (eng.setSideCollapsed) eng.setSideCollapsed(true);
    } else if (id === "mtkPalOpen") {
      if (eng.setSideCollapsed && eng.isSideCollapsed) eng.setSideCollapsed(!eng.isSideCollapsed());
    } else if (id === "qzrrSideToggle") {
      if (eng.setSideCollapsed) eng.setSideCollapsed(false);
    }
  } catch (_) { /* */ }
}, true);