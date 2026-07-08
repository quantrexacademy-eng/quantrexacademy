// Quantrex Test Engine — MARKS-style exam simulation (sections, fullscreen, countdown)

function getTestMountEl() {
  const appMain = document.getElementById("app-main");
  if (appMain) return appMain;
  return document.getElementById("ts-root");
}
window.getTestMountEl = getTestMountEl;

function getTestTheme() {
  return localStorage.getItem("quantrex_test_theme") || "light";
}

function setTestTheme(mode) {
  const m = mode === "light" ? "light" : "dark";
  localStorage.setItem("quantrex_test_theme", m);
  const root = document.querySelector(".mtk-test-root");
  if (root) root.setAttribute("data-test-theme", m);
  document.querySelectorAll(".mtk-theme-lbl").forEach(el => {
    el.textContent = m === "light" ? "Light" : "Dark";
  });
  const btn = document.getElementById("mtkThemeBtn");
  if (btn) btn.textContent = m === "dark" ? "☀️" : "🌙";
}
window.setTestTheme = setTestTheme;

function toggleTestTheme() {
  setTestTheme(getTestTheme() === "dark" ? "light" : "dark");
}
window.toggleTestTheme = toggleTestTheme;

const TEST_FONT_ORDER = ["small", "medium", "large", "xlarge"];
const TEST_FONT_LABELS = { small: "Small", medium: "Medium", large: "Large", xlarge: "Extra Large" };

function getTestFontScale() {
  const v = localStorage.getItem("quantrex_test_font") || "medium";
  return TEST_FONT_ORDER.includes(v) ? v : "medium";
}

function setTestFontScale(scale) {
  const s = TEST_FONT_ORDER.includes(scale) ? scale : "medium";
  localStorage.setItem("quantrex_test_font", s);
  const root = document.querySelector(".mtk-test-root");
  if (root) root.setAttribute("data-font-scale", s);
  const lblText = s === "xlarge" ? "XL" : (TEST_FONT_LABELS[s] || "Medium");
  document.querySelectorAll("#mtkFontLbl, .mtk-font-lbl").forEach(lbl => {
    lbl.textContent = lblText;
  });
  document.querySelectorAll(".mtk-font-preset").forEach(btn => {
    btn.classList.toggle("on", btn.dataset.scale === s);
  });
}

function bumpTestFont(delta) {
  const cur = getTestFontScale();
  const idx = TEST_FONT_ORDER.indexOf(cur);
  const next = TEST_FONT_ORDER[Math.max(0, Math.min(TEST_FONT_ORDER.length - 1, idx + delta))];
  setTestFontScale(next);
}
window.getTestFontScale = getTestFontScale;
window.setTestFontScale = setTestFontScale;
window.bumpTestFont = bumpTestFont;

function tsTestLoadingHtml() {
  return `<div class="mtk-test-root ts-test-loading" style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#12151c;color:#e2e8f0;font-size:17px;font-family:Inter,sans-serif">Loading questions…</div>`;
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

  function stopTimer() {
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
  }

  function startTimer() {
    stopTimer();
    if (!session || session.durationSec == null) return;
    timerHandle = setInterval(() => {
      if (!session || session.submitted) return;
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
    const txt = session.marksMode ? formatMarksTime(session.remainingSec) : formatTime(session.remainingSec);
    if (session.marksMode) {
      el.innerHTML = `<span class="mtk-timer-ic">🕐</span>${txt}`;
    } else {
      el.textContent = txt;
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
    const hasAns = hasAnswerAt(i);
    const isRev = session.review.has(i);
    const visited = session.visited.has(i);
    if (session.marksMode) {
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
    return typeof Mx !== "undefined" ? Mx.html(text) : text;
  }

  function currentSectionIdx() {
    if (!session || !session.sections || !session.sections.length) return 0;
    const idx = session.idx;
    for (let i = 0; i < session.sections.length; i++) {
      const s = session.sections[i];
      if (idx >= s.start && idx < s.start + s.count) return i;
    }
    return 0;
  }

  function sectionColorClass(subject) {
    const s = String(subject || "").toLowerCase();
    if (s.includes("math")) return "mtk-sec-math";
    if (s.includes("phys")) return "mtk-sec-phys";
    if (s.includes("chem")) return "mtk-sec-chem";
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

  function renderMarkingBadges() {
    if (!session) return "";
    const sc = session.scoring || { correct: 4, wrong: -1 };
    const pos = sc.correct > 0 ? `<span class="mtk-pos-mark">+${sc.correct}</span>` : "";
    const neg = sc.wrong < 0 ? `<span class="mtk-neg-mark">${sc.wrong}</span>` : "";
    return `${pos}${neg}`;
  }

  function renderMarksSectionTabs() {
    if (!session || !session.sections || session.sections.length < 2) return "";
    const cur = currentSectionIdx();
    const tabs = session.sections.map((sec, i) => {
      const cls = sectionColorClass(sec.subject);
      return `<button type="button" class="mtk-sec-tab ${cls}${i === cur ? " active" : ""}" data-sec="${i}">${sec.shortLabel || sec.label}</button>`;
    }).join("");
    return `<div class="mtk-sec-bar">
      <button type="button" class="mtk-sec-nav" id="mtkSecPrev" title="Previous section">‹</button>
      <div class="mtk-sec-tabs">${tabs}</div>
      <button type="button" class="mtk-sec-nav" id="mtkSecNext" title="Next section">›</button>
    </div>`;
  }

  function renderMarksPaletteHead() {
    const scale = getTestFontScale();
    const labels = { small: "Small", medium: "Medium", large: "Large", xlarge: "XL" };
    return `<div class="mtk-pal-head-row">
      <strong>Overview</strong>
      <div class="mtk-font-tools">
        <button type="button" class="mtk-font-btn" id="mtkFontDown" title="Decrease text size">A−</button>
        <span class="mtk-font-lbl" id="mtkFontLbl">${labels[scale] || "Medium"}</span>
        <button type="button" class="mtk-font-btn" id="mtkFontUp" title="Increase text size">A+</button>
        <button type="button" class="mtk-font-gear" id="mtkQviewGear" title="Question view settings">⚙</button>
      </div>
    </div>`;
  }

  function renderMarksPalette() {
    const s = stats();
    let groups = "";
    if (session.sections && session.sections.length) {
      groups = session.sections.map(sec => {
        const cells = [];
        for (let i = sec.start; i < sec.start + sec.count; i++) {
          const st = paletteStatus(i);
          const cur = i === session.idx ? " cur" : "";
          cells.push(`<button type="button" class="mtk-pal-cell ${st}${cur}" data-qidx="${i}">${i + 1}</button>`);
        }
        return `<div class="mtk-pal-group">
          <div class="mtk-pal-grp-label">${sec.shortLabel}</div>
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
    return `<aside class="mtk-palette">
      ${renderMarksPaletteHead()}
      <div class="mtk-pal-legend">
        <span><i class="mtk-dot answered"></i>Answered</span>
        <span><i class="mtk-dot not-answered"></i>Not Answered</span>
        <span><i class="mtk-dot unvisited"></i>Not Visited</span>
        <span><i class="mtk-dot rev-ans"></i>Marked</span>
      </div>
      <div class="mtk-pal-stats">
        <div class="mtk-stat"><i class="mtk-dot answered"></i><span>${s.answered} Qs Answered</span></div>
        <div class="mtk-stat"><i class="mtk-dot not-answered"></i><span>${s.skipped} Qs Not Answered</span></div>
        <div class="mtk-stat"><i class="mtk-dot unvisited"></i><span>${s.unvisited} Qs Not Visited</span></div>
        <div class="mtk-stat"><i class="mtk-dot rev-ans"></i><span>${s.revAns} Qs Answered and Marked For Review</span></div>
        <div class="mtk-stat"><i class="mtk-dot rev-skip"></i><span>${s.revSkip} Qs Not Answered and Marked For Review</span></div>
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
      <div class="qx-pal-head"><strong>Question Map</strong></div>
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
        <header class="mtk-header"><div class="mtk-brand"><span class="mtk-logo">Q</span><span class="mtk-brand-text">Quantrex</span></div></header>
        <div class="mtk-main" style="padding:40px"><div class="empty" style="color:#f87171;font-size:16px">Question not found (id: ${session.ids[session.idx]}). <button type="button" class="mtk-btn mtk-btn-ghost" onclick="if(typeof go==='function')go('tests')">← Back</button></div></div>
      </div>`;
    }
    const incomplete = typeof MarksLive !== "undefined" && MarksLive.isQuestionIncomplete
      ? MarksLive.isQuestionIncomplete(q)
      : false;
    const selected = session.answers[session.idx];
    const markBadges = renderMarkingBadges();
    const timerHtml = session.durationSec != null
      ? `<div class="mtk-timer" id="qxTimer"><span class="mtk-timer-ic">🕐</span>${formatMarksTime(session.remainingSec)}</div>` : "";
    const testTheme = getTestTheme();
    const fontScale = getTestFontScale();
    const stopBtn = session.persistKey
      ? `<button type="button" class="mtk-stop-btn" id="mtkStopBtn" title="Stop test and resume later">⏸ Stop</button>`
      : "";

    const typeBadge = typeof QuantrexQFormat !== "undefined" ? QuantrexQFormat.typeBadgeHtml(q) : "";
    const optsClass = typeof QuantrexQFormat !== "undefined"
      ? QuantrexQFormat.testOptsContainerClass(q)
      : "mtk-options mtk-options-grid";
    const opts = incomplete
      ? `<div class="empty" style="padding:24px;grid-column:1/-1">Loading options…</div>`
      : (typeof QuantrexQFormat !== "undefined"
        ? QuantrexQFormat.renderTestOptions(q, selected, htmlContent)
        : (q.options || []).map((o, i) => {
          const letter = String.fromCharCode(65 + i);
          return `<button type="button" class="mtk-opt ${selected === i ? "selected" : ""}" data-opt="${i}">
            <span class="mtk-opt-radio"></span>
            <span class="mtk-opt-letter">${letter}</span>
            <span class="mtk-opt-text qx-content">${htmlContent(o)}</span>
          </button>`;
        }).join(""));

    const ctx = typeof AllenTestUI !== "undefined" ? AllenTestUI.detectContext(session) : null;
    const examLabel = ctx ? AllenTestUI.examTitle(ctx) : "CBT";
    const allenLogo = typeof AllenTestUI !== "undefined"
      ? `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><rect width="32" height="32" rx="6" fill="#003DA5"/><text x="16" y="22" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-weight="900" font-size="16">A</text></svg>`
      : `<span class="mtk-logo">Q</span>`;
    return `<div class="mtk-test-root allen-cbt" data-test-theme="${testTheme}" data-font-scale="${fontScale}">
      <header class="mtk-header">
        <div class="mtk-header-left">
          <button type="button" class="mtk-close-btn" id="mtkCloseBtn" title="Exit test">✕</button>
          <div class="mtk-brand allen-brand">${allenLogo}<span class="mtk-brand-text">${examLabel} · CBT</span></div>
        </div>
        ${timerHtml}
        <div class="mtk-header-tools">
          <button type="button" class="mtk-theme-btn" id="mtkThemeBtn" title="Toggle light/dark mode">${testTheme === "dark" ? "☀️" : "🌙"}</button>
          <span class="mtk-theme-lbl" id="mtkThemeLbl">${testTheme === "light" ? "Light" : "Dark"}</span>
          <button type="button" class="mtk-font-btn" id="mtkFontDownHdr" title="Decrease text size">A−</button>
          <button type="button" class="mtk-font-btn" id="mtkFontUpHdr" title="Increase text size">A+</button>
        </div>
        ${stopBtn}
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
          <div class="mtk-q-text qx-content">${incomplete ? '<div class="empty">Loading question…</div>' : htmlContent(q.q)}</div>
          <div class="${optsClass}" id="qxOpts">${opts}</div>
          <div class="mtk-controls">
            <button type="button" class="mtk-btn mtk-btn-clear" id="qxClearBtn">Clear Response</button>
            <button type="button" class="mtk-btn mtk-btn-review" id="qxReviewNextBtn">Mark For Review &amp; Next</button>
            <button type="button" class="mtk-btn mtk-btn-prev" id="qxPrevBtn" ${session.idx <= 0 ? "disabled" : ""}>Previous</button>
            <button type="button" class="mtk-btn mtk-btn-save" id="qxSaveBtn">Save &amp; Next</button>
          </div>
        </div>
        ${renderMarksPalette()}
      </div>
    </div>`;
  }

  function renderQuestion() {
    if (!session) return '<div class="empty">No active test session.</div>';
    if (session.marksMode) return renderMarksQuestion();

    const q = getQ(session.ids[session.idx]);
    if (!q) return '<div class="empty">Question not found.</div>';
    const incomplete = typeof MarksLive !== "undefined" && MarksLive.isQuestionIncomplete
      ? MarksLive.isQuestionIncomplete(q)
      : false;
    const total = session.ids.length;
    const selected = session.answers[session.idx];
    const isReview = session.review.has(session.idx);
    const subjTag = (q.subject || "").toLowerCase().replace(/\s+/g, "-");
    const timerHtml = session.durationSec != null
      ? `<div class="qx-timer" id="qxTimer">${formatTime(session.remainingSec)}</div>` : "";

    return `<div class="qx-test-layout">
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
              <span class="tag tag-diff">${q.difficulty || "Medium"}</span>
              ${q.chapter ? `<span class="tag">📖 ${q.chapter}</span>` : ""}
            </div>
            <button type="button" class="bm-btn ${isReview ? "on" : ""}" id="qxReviewBtn">${isReview ? "🔖 Marked" : "🏷️ Mark for Review"}</button>
          </div>
          <div class="qa-q qx-content">${incomplete ? '<div class="empty">Loading question…</div>' : htmlContent(q.q)}</div>
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
          <div class="qx-controls">
            <button type="button" class="btn-soft" id="qxPrevBtn" ${session.idx <= 0 ? "disabled" : ""}>← Previous</button>
            <div class="qx-controls-mid">
              <button type="button" class="btn-soft" id="qxSkipBtn">Skip</button>
              <button type="button" class="btn-primary" id="qxSaveBtn">Save &amp; Next →</button>
            </div>
            <button type="button" class="btn-soft" id="qxNextBtn" ${session.idx >= total - 1 ? "disabled" : ""}>Next →</button>
          </div>
        </div>
      </div>
      ${renderPalette()}
    </div>`;
  }

  function bindEvents(root) {
    if (!session || !root) return;
    const q = getQ(session.ids[session.idx]);
    const numInput = root.querySelector("#qxNumInput");
    if (numInput) {
      numInput.oninput = () => {
        session.answers[session.idx] = numInput.value.trim();
        session.visited.add(session.idx);
      };
    }
    root.querySelectorAll("[data-opt]").forEach(btn => {
      btn.onclick = () => selectAnswer(parseInt(btn.dataset.opt, 10));
    });
    root.querySelectorAll("[data-prac-opt]").forEach(btn => {
      btn.onclick = () => selectAnswer(parseInt(btn.dataset.pracOpt, 10));
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
    if (save) save.onclick = saveAndNext;
    const quit = root.querySelector("#qxQuitBtn");
    if (quit) quit.onclick = quit;
    const clearBtn = root.querySelector("#qxClearBtn");
    if (clearBtn) clearBtn.onclick = clearResponse;
    const reviewNext = root.querySelector("#qxReviewNextBtn");
    if (reviewNext) reviewNext.onclick = markReviewAndNext;
    const submitBtn = root.querySelector("#qxSubmitBtn");
    if (submitBtn) submitBtn.onclick = () => confirmSubmit();
    const submitTop = root.querySelector("#qxSubmitTop");
    if (submitTop) submitTop.onclick = () => confirmSubmit();
    const mtkClose = root.querySelector("#mtkCloseBtn");
    if (mtkClose) mtkClose.onclick = quit;
    const mtkReport = root.querySelector("#mtkReportBtn");
    if (mtkReport && typeof openQuestionReport === "function") {
      mtkReport.onclick = () => {
        const q = getQ(session.ids[session.idx]);
        if (q) openQuestionReport(q.id);
      };
    }
    const mtkTheme = root.querySelector("#mtkThemeBtn");
    if (mtkTheme) mtkTheme.onclick = () => { if (typeof toggleTestTheme === "function") toggleTestTheme(); };
    const mtkStop = root.querySelector("#mtkStopBtn");
    if (mtkStop) mtkStop.onclick = () => { if (typeof mtkShowStopModal === "function") mtkShowStopModal(); };
    const bindFont = (btn, delta) => {
      if (btn) btn.onclick = () => { if (typeof bumpTestFont === "function") bumpTestFont(delta); };
    };
    bindFont(root.querySelector("#mtkFontDown"), -1);
    bindFont(root.querySelector("#mtkFontUp"), 1);
    bindFont(root.querySelector("#mtkFontDownHdr"), -1);
    bindFont(root.querySelector("#mtkFontUpHdr"), 1);
    const qviewGear = root.querySelector("#mtkQviewGear");
    if (qviewGear) qviewGear.onclick = () => { if (typeof toggleMtkQviewSettings === "function") toggleMtkQviewSettings(); };
    root.querySelectorAll(".qx-pal-cell, .mtk-pal-cell").forEach(cell => {
      cell.onclick = () => goTo(parseInt(cell.dataset.qidx, 10));
    });
    root.querySelectorAll(".mtk-sec-tab").forEach(tab => {
      tab.onclick = () => {
        const sec = session.sections[parseInt(tab.dataset.sec, 10)];
        if (sec) goTo(sec.start);
      };
    });
    const secPrev = root.querySelector("#mtkSecPrev");
    if (secPrev) secPrev.onclick = () => {
      const cur = currentSectionIdx();
      if (cur > 0) goTo(session.sections[cur - 1].start);
    };
    const secNext = root.querySelector("#mtkSecNext");
    if (secNext) secNext.onclick = () => {
      const cur = currentSectionIdx();
      if (cur < session.sections.length - 1) goTo(session.sections[cur + 1].start);
    };
  }

  let _refreshBusy = false;
  async function refresh() {
    const main = getTestMountEl();
    if (!main || !session || _refreshBusy) return;
    _refreshBusy = true;
    const q = getQ(session.ids[session.idx]);
    const incomplete = q && typeof MarksLive !== "undefined" && MarksLive.isQuestionIncomplete
      ? MarksLive.isQuestionIncomplete(q)
      : (q && typeof MarksLive !== "undefined" && MarksLive.needsFullQuestion(q));
    if (incomplete) {
      main.innerHTML = `<div class="mtk-test-root"><div class="empty" style="padding:48px;text-align:center">Loading question options…</div></div>`;
      try {
        await MarksLive.ensureQuestionFull(q, { force: true });
        if (typeof tsSyncQMap === "function") tsSyncQMap([session.ids[session.idx]]);
      } catch (e) { /* continue */ }
    }
    if (typeof MarksLive !== "undefined" && MarksLive.prefetchQuestions) {
      const near = [session.idx - 1, session.idx + 1, session.idx + 2]
        .filter(i => i >= 0 && i < session.ids.length)
        .map(i => session.ids[i]);
      MarksLive.prefetchQuestions(near).catch(() => {});
    }
    main.innerHTML = renderQuestion();
    bindEvents(main);
    if (typeof Mx !== "undefined") Mx.afterRender(main);
    marksPersistSession();
    const activeTab = main.querySelector(".mtk-sec-tab.active");
    if (activeTab) activeTab.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    _refreshBusy = false;
  }

  function selectAnswer(idx) {
    if (!session || session.submitted) return;
    const q = getQ(session.ids[session.idx]);
    const multi = q && typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType(q) === "multipleCorrect";
    if (multi) {
      let sel = session.answers[session.idx];
      if (!Array.isArray(sel)) sel = [];
      if (sel.includes(idx)) sel = sel.filter(x => x !== idx);
      else sel = [...sel, idx].sort((a, b) => a - b);
      session.answers[session.idx] = sel;
    } else {
      session.answers[session.idx] = idx;
    }
    session.visited.add(session.idx);
    session.review.delete(session.idx);
    refresh();
  }

  function clearResponse() {
    if (!session) return;
    delete session.answers[session.idx];
    refresh();
  }

  function toggleReview() {
    if (!session) return;
    if (session.review.has(session.idx)) session.review.delete(session.idx);
    else session.review.add(session.idx);
    refresh();
  }

  function markReviewAndNext() {
    if (!session) return;
    session.review.add(session.idx);
    session.visited.add(session.idx);
    if (session.idx < session.ids.length - 1) goTo(session.idx + 1);
    else refresh();
  }

  function goTo(idx) {
    if (!session || idx < 0 || idx >= session.ids.length) return;
    session.visited.add(session.idx);
    session.idx = idx;
    session.visited.add(idx);
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
    session.visited.add(session.idx);
    if (session.idx < session.ids.length - 1) goTo(session.idx + 1);
    else confirmSubmit();
  }

  function stopAndSave() {
    if (!session) return;
    const hadPersist = !!session.persistKey;
    const testType = session.testType;
    const ret = session.returnTo || "tests";
    stopTimer();
    if (session.persistKey) {
      marksPersistSession();
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
    exitMarksTestMode();
    session = null;
    go(ret);
    const resumeHint = testType === "testseries" ? "Test Series → Resume tab" : "PYQ Mock Tests";
    showToast(hadPersist ? `✓ Test stopped. Resume anytime from ${resumeHint}.` : "✓ Test saved.");
  }

  function quit() {
    if (!session) return;
    if (session.marksMode && session.persistKey && typeof mtkShowStopModal === "function") {
      mtkShowStopModal("exit");
      return;
    }
    const msg = session.marksMode
      ? "Exit test? Your progress is saved — you can resume later from PYQ Mock Tests."
      : "Leave this assessment? Unsaved answers will be lost.";
    if (confirm(msg)) {
      stopTimer();
      if (session.marksMode && session.persistKey) marksPersistSession();
      else marksClearSession();
      const ret = session.returnTo || "tests";
      exitMarksTestMode();
      session = null;
      go(ret);
    }
  }

  function confirmSubmit() {
    if (!session) return;
    const s = stats();
    const msg = session.marksMode
      ? `Submit test now?\n\nAnswered: ${s.answered}\nNot Answered: ${s.skipped}\nNot Visited: ${s.unvisited}\nMarked for Review: ${s.review}`
      : `Submit now?\n\nAnswered: ${s.answered}\nMarked for review: ${s.review}\nSkipped/Unvisited: ${s.unvisited + s.skipped}`;
    if (confirm(msg)) submit(false);
  }

  function computeResults() {
    const scoring = session.scoring;
    let correct = 0, wrong = 0, skipped = 0, score = 0;
    const breakdown = { subject: {}, difficulty: {} };
    const rows = session.ids.map((id, i) => {
      const q = getQ(id);
      const chosen = session.answers[i];
      let isCorrect = false;
      let isWrong = false;
      let isPartial = false;
      const isSkip = chosen === undefined || (typeof QuantrexQFormat !== "undefined" && q && !QuantrexQFormat.isAnswered(q, chosen));
      if (!isSkip && q) {
        const graded = typeof QuantrexQFormat !== "undefined"
          ? QuantrexQFormat.grade(q, chosen)
          : { correct: chosen === q.answer, partial: false };
        isCorrect = graded.correct;
        isPartial = graded.partial;
        isWrong = !isCorrect && !isPartial;
      }
      if (isCorrect) { correct++; score += scoring.correct; }
      else if (isPartial) { wrong++; score += (scoring.partial != null ? scoring.partial : Math.round(scoring.correct / 2)); }
      else if (isWrong) { wrong++; score += scoring.wrong; }
      else { skipped++; score += scoring.unattempted; }
      if (q) {
        const sub = q.subject || "Other";
        const diff = q.difficulty || "Medium";
        if (!breakdown.subject[sub]) breakdown.subject[sub] = { correct: 0, wrong: 0, total: 0 };
        if (!breakdown.difficulty[diff]) breakdown.difficulty[diff] = { correct: 0, wrong: 0, total: 0 };
        breakdown.subject[sub].total++;
        breakdown.difficulty[diff].total++;
        if (isCorrect) { breakdown.subject[sub].correct++; breakdown.difficulty[diff].correct++; }
        if (isWrong) { breakdown.subject[sub].wrong++; breakdown.difficulty[diff].wrong++; }
      }
      if (chosen !== undefined && q) STATE.markSolved(id, isCorrect);
      return { q, chosen, isCorrect, isWrong, isSkip, idx: i };
    });
    const total = session.ids.length;
    const pct = total ? Math.round(correct / total * 100) : 0;
    const timeUsed = Math.round((Date.now() - session.startedAt) / 1000);
    return { correct, wrong, skipped, score, pct, total, rows, breakdown, timeUsed, maxScore: total * scoring.correct };
  }

  function renderReviewRow(r, i) {
    if (!r.q) return "";
    const hasSol = typeof MarksLive !== "undefined" && MarksLive.hasRealSolution
      ? MarksLive.hasRealSolution(r.q.solution)
      : !!String(r.q.solution || "").replace(/<[^>]+>/g, "").trim();
      const sol = hasSol ? `<div class="sol qx-exam-sol"><strong>Solution</strong><div class="qx-content sol-body">${htmlContent(r.q.solution)}</div></div>` : "";
    const chosenHtml = typeof QuantrexQFormat !== "undefined"
      ? QuantrexQFormat.formatChosenAnswer(r.q, r.chosen)
      : htmlContent((r.q.options || [])[r.chosen]);
    const correctHtml = typeof QuantrexQFormat !== "undefined"
      ? QuantrexQFormat.formatCorrectAnswer(r.q)
      : htmlContent((r.q.options || [])[r.q.answer]);
      return `<div class="rv-row ${r.isCorrect ? "ok" : r.isSkip ? "" : "no"}" data-rv-idx="${i}">
        <div class="rv-q qx-content"><strong>Q${i + 1}.</strong> ${htmlContent(r.q.q)}</div>
      <div class="rv-ans">
        ${r.isSkip ? '<span class="tag tag-skip">Not attempted</span>' :
          `<span class="tag ${r.isCorrect ? "tag-ok" : "tag-no"}">${r.isCorrect ? "✓" : "✗"} <span class="qx-content">${chosenHtml}</span></span>`}
        ${r.isWrong ? `<div class="rv-correct">✓ Answer: <span class="qx-content">${correctHtml}</span></div>` : ""}
      </div>${sol}</div>`;
  }

  function renderMarksReviewRail(data) {
    const subjectOrder = ["Mathematics", "Physics", "Chemistry", "Biology", "Botany", "Zoology"];
    const bySub = {};
    data.rows.forEach((r, i) => {
      if (!r.q) return;
      const sub = r.q.subject || "Other";
      if (!bySub[sub]) bySub[sub] = [];
      bySub[sub].push({ i, r });
    });
    const subs = subjectOrder.filter(s => bySub[s]).concat(Object.keys(bySub).filter(s => !subjectOrder.includes(s)));
    return subs.map(sub => {
      const cells = bySub[sub].map(({ i, r }) => {
        const st = r.isCorrect ? "ok" : r.isSkip ? "skip" : "no";
        return `<button type="button" class="qx-rv-qpill ${st}" data-rv-jump="${i}">${i + 1}</button>`;
      }).join("");
      return `<div class="qx-rv-subj-block">
        <div class="qx-rv-subj-name">${sub}</div>
        <div class="qx-rv-subj-grid">${cells}</div>
      </div>`;
    }).join("");
  }

  function bindReviewSplit(root) {
    if (!root) return;
    const main = root.querySelector(".qx-review-main");
    const rows = root.querySelectorAll(".rv-row");
    const pills = root.querySelectorAll(".qx-rv-qpill");
    const show = (idx) => {
      rows.forEach(row => row.classList.toggle("active", parseInt(row.dataset.rvIdx, 10) === idx));
      pills.forEach(p => p.classList.toggle("cur", parseInt(p.dataset.rvJump, 10) === idx));
      const active = root.querySelector(`.rv-row[data-rv-idx="${idx}"]`);
      if (active && main) main.scrollTop = 0;
    };
    pills.forEach(p => {
      p.onclick = () => show(parseInt(p.dataset.rvJump, 10));
    });
    if (rows.length) show(0);
  }

  function renderResults(data) {
    const ret = session.returnTo;
    const title = session.title;
    const mode = session.testType;
    const marksReview = session.marksMode;
    const pass = data.pct >= 60;
    const subjectBars = Object.entries(data.breakdown.subject).map(([sub, v]) => {
      const acc = v.total ? Math.round(v.correct / v.total * 100) : 0;
      return `<div class="qx-subj-bar"><div class="qx-subj-label"><span>${sub}</span><span>${acc}%</span></div>
        <div class="qx-bar-track"><div class="qx-bar-fill" style="width:${acc}%"></div></div>
        <small>${v.correct}/${v.total} correct</small></div>`;
    }).join("");

    const reviewRows = data.rows.map((r, i) => renderReviewRow(r, i)).join("");
    const reviewBlock = marksReview
      ? `<div class="qx-review-split" id="qxReviewSplit">
          <div class="qx-review-main"><div class="review-list marks-review-list">${reviewRows}</div></div>
          <aside class="qx-review-rail"><div class="qx-rv-rail-head">Questions</div>${renderMarksReviewRail(data)}</aside>
        </div>`
      : `<div class="review-list">${reviewRows}</div>`;

    if (typeof QuantrexAnalytics !== "undefined") {
      QuantrexAnalytics.recordAttempt({
        title, mode, ...data,
        exam: STATE.exam,
        date: Date.now()
      });
    }

    marksClearSession();
    session = null;
    exitMarksTestMode();
    return `<div class="result-screen ${marksReview ? "marks-result" : ""}">
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
    if (typeof session.onComplete === "function") {
      try { session.onComplete(data); } catch (e) { console.error(e); }
    }
    const main = getTestMountEl();
    if (main) {
      main.innerHTML = renderResults(data);
      bindReviewSplit(main.querySelector("#qxReviewSplit"));
      if (typeof Mx !== "undefined") Mx.afterRender(main);
    }
    if (!auto) showToast("✅ Assessment submitted!");
  }

  function begin(config) {
    const resume = config.resumeData || null;
    let ids = resume ? [...resume.ids] : (config.shuffle !== false ? shuffle(config.questionIds) : [...config.questionIds]);
    if (!ids.length) {
      showToast("⚠️ No questions available for this test.");
      return false;
    }
    let sections = resume ? resume.sections : (config.sections || null);
    if (!resume && config.marksMode && config.organizeJee) {
      const organized = organizeExamPaper(ids, {
        paperFormat: config.paperFormat,
        examSlug: config.meta && config.meta.slug,
        shuffle: config.shuffle !== false
      });
      if (organized) {
        ids = organized.orderedIds;
        sections = organized.sections;
      }
    }
    const duration = config.durationSec ?? (config.timed ? Math.max(600, ids.length * 90) : null);
    session = {
      ids,
      title: config.title || "Quantrex Assessment",
      returnTo: config.returnTo || "tests",
      testType: config.testType || "custom",
      modeLabel: config.modeLabel || (duration ? "Timed Mode" : "Practice Mode"),
      durationSec: duration,
      remainingSec: resume ? resume.remainingSec : duration,
      scoring: config.scoring || defaultScoring(STATE.exam),
      idx: resume ? (resume.idx || 0) : 0,
      answers: resume ? { ...resume.answers } : {},
      review: new Set(resume ? (resume.review || []) : []),
      visited: new Set(resume ? (resume.visited || [resume.idx || 0]) : [0]),
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
      shuffle: config.shuffle !== false
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
    launchTimer,
    formatTime,
    formatMarksTime,
    set onTick(fn) { onTick = fn; }
  };
})();

function isNumericalQuestion(q) {
  if (!q) return false;
  if (typeof QuantrexQFormat !== "undefined") return QuantrexQFormat.getType(q) === "numerical";
  const opts = (q.options || []).map(o => String(o).replace(/<[^>]+>/g, "").trim());
  const abcd = opts.every(o => !o || o === "A" || o === "B" || o === "C" || o === "D");
  const qtext = String(q.q || "").toLowerCase();
  const fillBlank = /_{3,}|nearest integer|nearest\s+integer|integer\)|numerical|fill in|blank|_______/i.test(qtext);
  if (abcd && (fillBlank || opts.every(o => !o))) return true;
  if (opts.length === 4 && opts.every(o => /^[\d.\-+\s,]+$/.test(o) && o)) return true;
  return false;
}

function questionSectionType(q) {
  if (!q) return "SC";
  if (typeof QuantrexQFormat !== "undefined") {
    if (QuantrexQFormat.isMatchColumn(q)) return "MATCH";
    const t = QuantrexQFormat.getType(q);
    if (t === "multipleCorrect") return "MC";
    if (t === "numerical") return "NUM";
    if (t === "columnMatch") return "MATCH";
    return "SC";
  }
  if (Array.isArray(q.answers) && q.answers.length > 1) return "MC";
  if (isNumericalQuestion(q)) return "NUM";
  return "SC";
}

const SECTION_TYPE_LABELS = {
  SC: "Single Correct Type",
  MC: "Multiple Correct Type",
  MATCH: "Column Matching Type",
  NUM: "Numerical Type"
};

const JEE_ADV_SECTION_LABEL = {
  SC: "Section 1 — Single Correct Type",
  MC: "Section 2 — Multiple Correct Type",
  MATCH: "Section 2 — Column Matching Type",
  NUM: "Section 3 — Numerical Type"
};

const SECTION_TYPE_SHORT = {
  SC: "SC",
  MC: "MC",
  MATCH: "MATCH",
  NUM: "NUM"
};

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

function organizeJeeAdvancedPaper(questionIds) {
  const subjectOrder = ["Mathematics", "Physics", "Chemistry"];
  const typeOrder = ["SC", "MC", "NUM"];
  const bySubType = {};
  questionIds.forEach(id => {
    const q = getQ(id);
    if (!q) return;
    const sub = q.subject || "Other";
    const type = questionSectionType(q);
    const key = sub + "::" + type;
    if (!bySubType[key]) bySubType[key] = { sub, type, ids: [] };
    bySubType[key].ids.push(id);
  });

  const orderedIds = [];
  const sections = [];
  subjectOrder.forEach(sub => {
    typeOrder.forEach((type, ti) => {
      const key = sub + "::" + type;
      const bucket = bySubType[key];
      if (!bucket || !bucket.ids.length) return;
      const secNum = typeOrder.indexOf(type) + 1;
      sections.push({
        label: `${sub} Section ${secNum} — ${SECTION_TYPE_LABELS[type]}`,
        shortLabel: `${sub.toUpperCase().slice(0, 3)} S${secNum}`,
        subject: sub,
        type,
        start: orderedIds.length,
        count: bucket.ids.length
      });
      orderedIds.push(...bucket.ids);
      delete bySubType[key];
    });
  });
  Object.values(bySubType).forEach(bucket => {
    if (!bucket.ids.length) return;
    sections.push({
      label: `${bucket.sub} ${SECTION_TYPE_LABELS[bucket.type]}`,
      shortLabel: `${bucket.sub.toUpperCase().slice(0, 3)} ${SECTION_TYPE_SHORT[bucket.type]}`,
      subject: bucket.sub,
      type: bucket.type,
      start: orderedIds.length,
      count: bucket.ids.length
    });
    orderedIds.push(...bucket.ids);
  });
  const placed = new Set(orderedIds);
  questionIds.forEach(id => { if (!placed.has(id)) orderedIds.push(id); });
  return { orderedIds, sections };
}

function organizeNeetPaper(questionIds) {
  const subjectOrder = ["Physics", "Chemistry", "Botany", "Zoology"];
  const bySubject = {};
  questionIds.forEach(id => {
    const q = getQ(id);
    const sub = (q && q.subject) || "Other";
    if (!bySubject[sub]) bySubject[sub] = [];
    bySubject[sub].push(id);
  });
  const orderedIds = [];
  const sections = [];
  subjectOrder.forEach(sub => {
    const ids = bySubject[sub] || [];
    if (!ids.length) return;
    sections.push({
      label: sub,
      shortLabel: sub.toUpperCase().slice(0, 4),
      subject: sub,
      start: orderedIds.length,
      count: ids.length
    });
    orderedIds.push(...ids);
    delete bySubject[sub];
  });
  Object.keys(bySubject).forEach(sub => {
    const ids = bySubject[sub];
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

function resolvePaperFormat(opts) {
  const slug = (opts && opts.examSlug) || "";
  if (opts && opts.paperFormat) return opts.paperFormat;
  if (/jee_advanced/i.test(slug)) return "jee_advanced";
  if (/jee_main|nta_abhyas_jee/i.test(slug)) return "jee_main";
  if (/neet|aiims|nta_abhyas_neet/i.test(slug)) return "neet";
  if (typeof STATE !== "undefined" && STATE.exam === "Medical") return "neet";
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
  jee_advanced: ["Chemistry", "Mathematics", "Physics"],
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

function organizeExamPaper(questionIds, opts) {
  const format = resolvePaperFormat(opts || {});
  if (format === "jee_main" && questionIds.length >= 20) {
    return organizeJeeMainPaper(questionIds);
  }
  return organizeSubjectWisePaper(questionIds, opts || {});
}

function organizeJeeMainPaper(questionIds) {
  const bySubject = { Mathematics: [], Physics: [], Chemistry: [] };
  questionIds.forEach(id => {
    const q = getQ(id);
    if (!q) return;
    if (bySubject[q.subject]) bySubject[q.subject].push(id);
  });

  const orderedIds = [];
  const sections = [];
  const spec = [
    { subject: "Mathematics", sc: 20, num: 5, labels: ["Mathematics Single Correct", "Mathematics Numerical"], shorts: ["MATHEMATICS SINGLE CORRECT", "MATHEMATICS NUMERICAL"] },
    { subject: "Physics", sc: 20, num: 5, labels: ["Physics Single Correct", "Physics Numerical"], shorts: ["PHYSICS SINGLE CORRECT", "PHYSICS NUMERICAL"] },
    { subject: "Chemistry", sc: 20, num: 5, labels: ["Chemistry Single Correct", "Chemistry Numerical"], shorts: ["CHEMISTRY SINGLE CORRECT", "CHEMISTRY NUMERICAL"] }
  ];

  spec.forEach(s => {
    const ids = bySubject[s.subject] || [];
    const items = ids.map(id => ({ id, num: isNumericalQuestion(getQ(id)) }));
    let scPool = items.filter(x => !x.num).map(x => x.id);
    let numPool = items.filter(x => x.num).map(x => x.id);
    if (scPool.length < s.sc) {
      const extra = numPool.splice(0, s.sc - scPool.length);
      scPool = scPool.concat(extra);
    }
    if (numPool.length < s.num) {
      const extra = scPool.splice(s.sc);
      numPool = numPool.concat(extra.slice(0, s.num - numPool.length));
    }
    const scTake = scPool.slice(0, s.sc);
    const numTake = numPool.slice(0, s.num);

    [[scTake, s.labels[0], s.shorts[0]], [numTake, s.labels[1], s.shorts[1]]].forEach(([arr, label, short]) => {
      if (!arr.length) return;
      sections.push({ label, shortLabel: short, subject: s.subject, start: orderedIds.length, count: arr.length });
      orderedIds.push(...arr);
    });
  });

  const placed = new Set(orderedIds);
  questionIds.forEach(id => { if (!placed.has(id)) orderedIds.push(id); });

  return { orderedIds, sections };
}

function enterMarksTestMode() {
  document.body.classList.add("marks-test-active", "allen-cbt-active");
  const appMain = document.getElementById("app-main");
  if (appMain) {
    appMain.style.opacity = "1";
    appMain.style.pointerEvents = "auto";
    appMain.style.zIndex = "9500";
  }
  const sidebar = document.getElementById("sidebar");
  const topbar = document.querySelector(".topbar");
  const main = document.querySelector(".main");
  const content = document.querySelector(".content");
  if (sidebar) sidebar.style.display = "none";
  if (topbar) topbar.style.display = "none";
  if (main) main.style.marginLeft = "0";
  if (content) content.style.padding = "0";
  if (content) content.style.maxWidth = "none";
  if (!window.TS_STANDALONE) {
    const root = document.documentElement;
    if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
    else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
  }
}

function exitMarksTestMode() {
  document.body.classList.remove("marks-test-active", "marks-instr-active", "allen-cbt-active");
  const appMain = document.getElementById("app-main");
  if (appMain) {
    appMain.innerHTML = "";
    appMain.style.opacity = "";
    appMain.style.pointerEvents = "";
    appMain.style.zIndex = "";
  }
  const overlay = document.getElementById("marksCountdownOverlay");
  if (overlay) overlay.remove();
  const instr = document.getElementById("marksInstrOverlay");
  if (instr) instr.remove();
  const sidebar = document.getElementById("sidebar");
  const topbar = document.querySelector(".topbar");
  const main = document.querySelector(".main");
  const content = document.querySelector(".content");
  if (sidebar) sidebar.style.display = "";
  if (topbar) topbar.style.display = "";
  if (main) main.style.marginLeft = "";
  if (content) content.style.padding = "";
  if (content) content.style.maxWidth = "";
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
}

const MARKS_SESSION_STORE = "quantrex_marks_session_v1";

function marksAutoPersistKey(title, ids, meta) {
  const slug = (meta && meta.slug) || "test";
  const src = meta && meta.source ? String(meta.source).replace(/[^\w\s.-]/g, "").slice(0, 48) : "";
  const t = String(title || "exam").replace(/[^\w\s.-]/g, "").slice(0, 32);
  return `qx::${slug}::${src || t}::${(ids || []).length}`;
}

function marksGetActiveSession() {
  try {
    const data = JSON.parse(localStorage.getItem(MARKS_SESSION_STORE) || "null");
    if (data && data.remainingSec > 0 && data.persistKey) return data;
  } catch (e) { /* ignore */ }
  return null;
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
    startedAt: s.startedAt,
    savedAt: Date.now()
  };
  try { localStorage.setItem(MARKS_SESSION_STORE, JSON.stringify(data)); } catch (e) { /* ignore */ }
}

function marksLoadSession(key) {
  try {
    const data = JSON.parse(localStorage.getItem(MARKS_SESSION_STORE) || "null");
    if (data && data.persistKey === key && data.remainingSec > 0) return data;
  } catch (e) { /* ignore */ }
  return null;
}

function marksClearSession() {
  try { localStorage.removeItem(MARKS_SESSION_STORE); } catch (e) { /* ignore */ }
}

function marksInstructionHtml(config) {
  const scoring = config.scoring || { correct: 4, wrong: -1, unattempted: 0 };
  const n = (config.questionIds || []).length;
  const mins = config.durationSec ? Math.floor(config.durationSec / 60) : "—";
  const format = resolvePaperFormat({ paperFormat: config.paperFormat, examSlug: config.meta && config.meta.slug });
  const preview = organizeExamPaper(config.questionIds || [], {
    paperFormat: format,
    examSlug: config.meta && config.meta.slug,
    shuffle: config.shuffle !== false
  });
  const secRows = (preview && preview.sections || []).map(s =>
    `<tr><td>${s.label}</td><td>${s.count}</td></tr>`
  ).join("");
  const examTitle = format === "jee_advanced" ? "JEE (Advanced)" : format === "neet" ? "NEET (UG)" : "JEE (Main)";
  const markingBlock = format === "jee_advanced"
    ? `<p><strong>Marking Scheme (JEE Advanced):</strong> Section 1 (Single Correct): +3, −1 · Section 2 (Multiple Correct / Column Match): +4 with partial marking, −2 · Section 3 (Numerical): +4, 0 (no negative marking).</p>`
    : format === "neet"
      ? `<p><strong>Marking Scheme:</strong> Each correct answer <strong>+4</strong> marks. Each incorrect answer <strong>−1</strong> mark. Unattempted questions carry <strong>0</strong> marks.</p>`
      : `<p><strong>Marking Scheme:</strong> Each correct answer <strong>+${scoring.correct}</strong> marks. Each incorrect answer <strong>${scoring.wrong}</strong> mark. Unattempted questions carry <strong>${scoring.unattempted}</strong> marks.</p>`;
  return `<div id="marksInstrOverlay" class="marks-instr-fullpage" role="document">
    <header class="marks-instr-topbar">
      <div class="marks-instr-topbar-brand">
        <span class="marks-instr-topbar-logo">Q</span>
        <div>
          <div class="marks-instr-org">${examTitle} — Computer Based Test</div>
          <div class="marks-instr-topbar-sub">Instructions to Candidates</div>
        </div>
      </div>
      <button type="button" class="marks-instr-exit" onclick="marksCancelInstructions()" aria-label="Exit">✕ Exit</button>
    </header>
    <div class="marks-instr-scroll">
      <div class="marks-instr-inner">
        <div class="marks-instr-banner">
          <h2 class="marks-instr-title">${config.title || "Examination"}</h2>
        </div>
        <p class="marks-instr-lead"><strong>Please read the instructions carefully before you proceed.</strong></p>
        <div class="marks-instr-meta">
          <div><span>Total Questions</span><strong>${n}</strong></div>
          <div><span>Duration</span><strong>${mins} Minutes</strong></div>
          <div><span>Mode</span><strong>Online CBT</strong></div>
        </div>
        ${markingBlock}
        <div class="marks-instr-section">
          <h4>General Instructions</h4>
          <ol class="marks-instr-rules">
            <li>The total duration of the examination is <strong>${mins} minutes</strong>. The clock is server-controlled. The countdown timer on the top will display the remaining time.</li>
            <li>When the timer reaches zero, the examination will end automatically. You must submit before time expires.</li>
            <li>The <strong>Question Palette</strong> on the right shows the status of each question. Click a question number to navigate directly.</li>
            <li>Click <strong>Save &amp; Next</strong> to save your response and move to the next question.</li>
            <li>Click <strong>Mark For Review &amp; Next</strong> to mark a question for review and move ahead. You may revisit marked questions before final submission.</li>
            <li>Click <strong>Clear Response</strong> to erase the selected answer for the current question.</li>
            <li>You may change your response any number of times before final submission.</li>
            <li>Do not refresh the page or close the browser during the test. Progress is auto-saved — you can <strong>Resume Test</strong> if interrupted.</li>
          </ol>
        </div>
        ${secRows ? `<div class="marks-instr-section"><h4>Paper Sections</h4>
          <table class="marks-instr-table"><thead><tr><th>Section</th><th>Questions</th></tr></thead><tbody>${secRows}</tbody></table></div>` : ""}
        <div class="marks-instr-section">
          <h4>Question Status Legend</h4>
          <div class="marks-instr-legend">
            <span><i class="mtk-dot answered"></i> Green — Answered</span>
            <span><i class="mtk-dot not-answered"></i> Red — Not Answered</span>
            <span><i class="mtk-dot unvisited"></i> Grey — Not Visited</span>
            <span><i class="mtk-dot rev-ans"></i> Purple — Marked for Review (Answered)</span>
            <span><i class="mtk-dot rev-skip"></i> Violet — Marked for Review (Not Answered)</span>
          </div>
        </div>
      </div>
    </div>
    <footer class="marks-instr-foot-bar">
      <button type="button" class="marks-instr-cancel-btn" onclick="marksCancelInstructions()">Cancel</button>
      <button type="button" class="marks-instr-start" onclick="marksAcceptInstructions()">I have read and understood the instructions — Proceed</button>
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
  document.body.classList.remove("marks-instr-active", "allen-cbt-active");
  if (document.body.classList.contains("marks-test-active")) exitMarksTestMode();
  const cancelFn = window._marksInstrCancel || _marksInstrCancel;
  if (typeof cancelFn === "function") cancelFn();
  if (window.TS_STANDALONE && typeof tsRenderStandalone === "function") tsRenderStandalone();
  _marksInstrDone = null;
  _marksInstrCancel = null;
  window._marksInstrDone = null;
  window._marksInstrCancel = null;
}

function marksAcceptInstructions() {
  const el = document.getElementById("marksInstrOverlay");
  if (el) el.remove();
  marksRestoreInstrShell();
  document.body.classList.remove("marks-instr-active");
  document.body.classList.add("allen-cbt-active");
  const doneFn = window._marksInstrDone || _marksInstrDone;
  if (typeof doneFn === "function") doneFn();
  _marksInstrDone = null;
  _marksInstrCancel = null;
  window._marksInstrDone = null;
  window._marksInstrCancel = null;
}

function showMarksInstructions(config, onDone, onCancel) {
  const marksMode = config.marksMode;
  const main = getTestMountEl();
  if (main && marksMode && main.id === "app-main") main.innerHTML = "";
  const existing = document.getElementById("marksInstrOverlay");
  if (existing) existing.remove();
  _marksInstrDone = onDone;
  _marksInstrCancel = onCancel;
  document.body.classList.add("marks-instr-active");
  document.body.insertAdjacentHTML("beforeend", marksInstructionHtml(config));
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
          main.style.opacity = "1";
          main.style.pointerEvents = "auto";
          main.style.zIndex = "9500";
          main.innerHTML = typeof tsTestLoadingHtml === "function" ? tsTestLoadingHtml() : '<div style="padding:48px;color:#fff;text-align:center">Loading test…</div>';
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
    if (main.id === "app-main") {
      main.style.opacity = "1";
      main.style.pointerEvents = "auto";
      main.style.zIndex = "9500";
    }
    if (typeof currentView !== "undefined") currentView = "test";
    const html = QuantrexTestEngine.render();
    if (!html || !String(html).trim()) {
      throw new Error("Test render returned empty HTML");
    }
    main.innerHTML = html;
    QuantrexTestEngine.bindEvents(main);
    QuantrexTestEngine.launchTimer();
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    if (typeof Mx !== "undefined") Mx.afterRender(main);
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
  const marksMode = opts.marksMode !== false && (opts.testType === "pyqmock" || opts.testType === "custom" || opts.marksMode);
  const config = {
    questionIds,
    title,
    returnTo,
    testType: opts.testType || returnTo || "custom",
    durationSec: opts.durationSec,
    timed: opts.timed,
    shuffle: opts.shuffle !== false,
    modeLabel: opts.modeLabel,
    scoring: opts.scoring,
    testId: opts.testId,
    onComplete: opts.onComplete,
    marksMode,
    organizeJee: opts.organizeJee !== false,
    sections: opts.sections || null,
    deferTimer: marksMode && !opts.skipCountdown,
    persistKey: opts.persistKey || (marksMode ? marksAutoPersistKey(title, questionIds, opts.meta) : null),
    meta: opts.meta || null,
    resumeData: opts.resumeData || null,
    paperFormat: opts.paperFormat || (opts.resumeData && opts.resumeData.paperFormat) || null,
    shuffle: opts.resumeData ? opts.resumeData.shuffle !== false : (opts.shuffle !== false)
  };

  const main = getTestMountEl();
  const run = async () => {
    try {
      if (typeof MarksLive !== "undefined" && MarksLive.prefetchQuestions) {
        const need = questionIds.filter(id => {
          const q = getQ(id);
          return q && MarksLive.needsFullQuestion(q);
        });
        if (need.length) {
          showToast("📚 Loading question options…");
          await MarksLive.prefetchQuestions(questionIds);
        }
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
    if (marksMode && !opts.skipCountdown) showMarksCountdown(run);
    else if (marksMode && opts.skipCountdown) { enterMarksTestMode(); run(); }
    else run();
  };

  if (marksMode && !opts.skipInstructions && typeof showAllenInstructions === "function") {
    showAllenInstructions(config, launchMarks, () => {
      if (typeof marksCancelInstructions === "function") marksCancelInstructions();
    });
    return;
  }
  if (marksMode && !opts.skipInstructions && typeof showMarksInstructions === "function") {
    showMarksInstructions(config, launchMarks, () => {
      if (typeof marksCancelInstructions === "function") marksCancelInstructions();
    });
    return;
  }
  launchMarks();
}

function renderTest() {
  return QuantrexTestEngine.render();
}

async function startChapterTest(questionIds, meta) {
  if (!questionIds.length) { showToast("⚠️ No questions in this chapter."); return; }
  if (typeof MarksLive !== "undefined" && MarksLive.prefetchQuestions) {
    await MarksLive.prefetchQuestions(questionIds.slice(0, 50));
  }
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
    marksMode: false
  });
}

async function startMockTest(examSlug, options) {
  const opts = options || {};
  if (typeof loadSingleBank === "function" && !_banksLoaded[examSlug]) {
    showToast("📚 Loading exam paper…");
    await loadSingleBank(examSlug);
  }
  let pool = QUESTIONS.filter(q => q._bank === examSlug);
  if (opts.subject) pool = pool.filter(q => q.subject === opts.subject);
  if (opts.year && typeof qYearFromSource === "function") {
    pool = pool.filter(q => qYearFromSource(q.source) === Number(opts.year));
  }
  if (!pool.length) { showToast("⚠️ No questions found for this mock."); return; }
  const count = opts.count || (STATE.exam === "Medical" ? 180 : 90);
  const ids = pool.map(q => q.id);
  if (typeof MarksLive !== "undefined" && MarksLive.prefetchQuestions) {
    showToast("📚 Loading mock test options…");
    await MarksLive.prefetchQuestions(ids.slice(0, Math.min(ids.length, 120)));
  }
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
    modeLabel: "Full Mock · 3 hr",
    shuffle: true,
    marksMode: true,
    organizeJee: selected.length >= 30,
    paperFormat: /jee_advanced/i.test(examSlug) ? "jee_advanced" : (STATE.exam === "Medical" ? "neet" : "jee_main"),
    meta: { slug: examSlug }
  });
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
  const isExit = mode === "exit";
  const sess = typeof QuantrexTestEngine !== "undefined" ? QuantrexTestEngine.getSession() : null;
  const resumeWhere = sess && sess.testType === "testseries"
    ? "Test Series → Resume tab"
    : "PYQ Mock Tests";
  return `<div class="marks-modal-overlay" id="mtkStopModal" onclick="if(event.target===this)mtkCloseStopModal()">
    <div class="marks-resume-modal marks-stop-modal">
      <button type="button" class="marks-resume-close" onclick="mtkCloseStopModal()">✕</button>
      <div class="marks-resume-icon">${isExit ? "🚪" : "⏸"}</div>
      <h3>${isExit ? "Exit Test?" : "Stop Test"}</h3>
      <p class="marks-resume-hint">Your answers and remaining time will be saved. Resume anytime from <strong>${resumeWhere}</strong>.</p>
      <button type="button" class="marks-resume-btn" onclick="mtkConfirmStop()">⏸ Stop &amp; Save</button>
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

function mtkConfirmStop() {
  mtkCloseStopModal();
  if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.stopAndSave) {
    QuantrexTestEngine.stopAndSave();
  }
}