// Quantrex Test Engine — MARKS-style exam simulation (sections, fullscreen, countdown)
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

  function renderMarksSectionTabs() {
    if (!session.sections || !session.sections.length) return "";
    const curSec = currentSectionIdx();
    const tabs = session.sections.map((s, i) =>
      `<button type="button" class="mtk-sec-tab ${i === curSec ? "active" : ""}" data-sec="${i}">${s.label}</button>`
    ).join("");
    return `<div class="mtk-sec-bar">
      <button type="button" class="mtk-sec-nav" id="mtkSecPrev" title="Previous section">‹</button>
      <div class="mtk-sec-tabs" id="mtkSecTabs">${tabs}</div>
      <button type="button" class="mtk-sec-nav" id="mtkSecNext" title="Next section">›</button>
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
      <div class="mtk-pal-head"><strong>Overview</strong></div>
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

  function getTestTheme() {
    return localStorage.getItem("quantrex_test_theme") || "dark";
  }

  function setTestTheme(mode) {
    const m = mode === "light" ? "light" : "dark";
    localStorage.setItem("quantrex_test_theme", m);
    const root = document.querySelector(".mtk-test-root");
    if (root) root.setAttribute("data-test-theme", m);
    const btn = document.getElementById("mtkThemeBtn");
    if (btn) btn.textContent = m === "dark" ? "☀️" : "🌙";
  }

  function toggleTestTheme() {
    setTestTheme(getTestTheme() === "dark" ? "light" : "dark");
  }

  function renderMarksQuestion() {
    const q = getQ(session.ids[session.idx]);
    if (!q) return '<div class="empty">Question not found.</div>';
    const incomplete = typeof MarksLive !== "undefined" && MarksLive.isQuestionIncomplete
      ? MarksLive.isQuestionIncomplete(q)
      : false;
    const selected = session.answers[session.idx];
    const wrongMark = session.scoring.wrong < 0 ? `<span class="mtk-neg-mark">${session.scoring.wrong}</span>` : "";
    const timerHtml = session.durationSec != null
      ? `<div class="mtk-timer" id="qxTimer"><span class="mtk-timer-ic">🕐</span>${formatMarksTime(session.remainingSec)}</div>` : "";
    const testTheme = getTestTheme();

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

    return `<div class="mtk-test-root" data-test-theme="${testTheme}">
      <header class="mtk-header">
        <div class="mtk-header-left">
          <button type="button" class="mtk-close-btn" id="mtkCloseBtn" title="Exit test">✕</button>
          <div class="mtk-brand"><span class="mtk-logo">Q</span><span class="mtk-brand-text">Quantrex</span></div>
        </div>
        ${timerHtml}
        <button type="button" class="mtk-theme-btn" id="mtkThemeBtn" title="Toggle light/dark">${testTheme === "dark" ? "☀️" : "🌙"}</button>
        <button type="button" class="mtk-report-btn" id="mtkReportBtn" title="Report mistake">🚩 Report</button>
        <button type="button" class="mtk-submit-top" id="qxSubmitTop">Submit</button>
      </header>
      ${renderMarksSectionTabs()}
      <div class="mtk-body">
        <div class="mtk-main">
          <div class="mtk-q-head">
            <span class="mtk-q-num">Q${session.idx + 1}</span>${wrongMark}
            ${typeBadge}
          </div>
          <div class="mtk-q-text qx-content">${incomplete ? '<div class="empty">Loading question…</div>' : htmlContent(q.q)}</div>
          <div class="${optsClass}" id="qxOpts">${opts}</div>
          <div class="mtk-controls">
            <button type="button" class="mtk-btn-ghost" id="qxClearBtn">Clear Response</button>
            <button type="button" class="mtk-btn-ghost" id="qxReviewNextBtn">Mark For Review &amp; Next</button>
            <button type="button" class="mtk-btn-ghost" id="qxPrevBtn" ${session.idx <= 0 ? "disabled" : ""}>Previous</button>
            <button type="button" class="mtk-btn-save" id="qxSaveBtn">Save &amp; Next</button>
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
    if (mtkTheme) mtkTheme.onclick = toggleTestTheme;
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
    const main = document.getElementById("app-main");
    if (!main || !session || _refreshBusy) return;
    _refreshBusy = true;
    const q = getQ(session.ids[session.idx]);
    const incomplete = q && typeof MarksLive !== "undefined" && MarksLive.isQuestionIncomplete
      ? MarksLive.isQuestionIncomplete(q)
      : (q && typeof MarksLive !== "undefined" && MarksLive.needsFullQuestion(q));
    if (incomplete) {
      main.innerHTML = `<div class="mtk-test-root"><div class="empty" style="padding:48px;text-align:center">Loading question options…</div></div>`;
      try { await MarksLive.ensureQuestionFull(q, { force: true }); } catch (e) { /* continue */ }
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

  function quit() {
    if (!session) return;
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
      const sol = hasSol ? `<div class="sol qx-exam-sol"><strong>Solution</strong><div class="qx-content sol-body qx-exam-text">${htmlContent(r.q.solution)}</div></div>` : "";
    const chosenHtml = typeof QuantrexQFormat !== "undefined"
      ? QuantrexQFormat.formatChosenAnswer(r.q, r.chosen)
      : htmlContent((r.q.options || [])[r.chosen]);
    const correctHtml = typeof QuantrexQFormat !== "undefined"
      ? QuantrexQFormat.formatCorrectAnswer(r.q)
      : htmlContent((r.q.options || [])[r.q.answer]);
      return `<div class="rv-row ${r.isCorrect ? "ok" : r.isSkip ? "" : "no"}" data-rv-idx="${i}">
        <div class="rv-q qx-content qx-exam-text"><strong>Q${i + 1}.</strong> ${htmlContent(r.q.q)}</div>
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
    const main = document.getElementById("app-main");
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
      meta: config.meta || null
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

function organizeExamPaper(questionIds, opts) {
  const format = resolvePaperFormat(opts || {});
  const preserveOrder = opts && opts.shuffle === false;
  if (preserveOrder) {
    if (format === "jee_advanced") return buildJeeAdvancedSections(questionIds);
    if (format === "neet") return buildSectionsBySubject(questionIds);
    if (format === "jee_main" && questionIds.length >= 60) return organizeJeeMainPaper(questionIds);
    return buildSectionsFromOrder(questionIds);
  }
  if (format === "jee_advanced") return organizeJeeAdvancedPaper(questionIds);
  if (format === "neet") return organizeNeetPaper(questionIds);
  if (questionIds.length >= 60) return organizeJeeMainPaper(questionIds);
  return buildSectionsFromOrder(questionIds);
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
  document.body.classList.add("marks-test-active");
  const sidebar = document.getElementById("sidebar");
  const topbar = document.querySelector(".topbar");
  const main = document.querySelector(".main");
  const content = document.querySelector(".content");
  if (sidebar) sidebar.style.display = "none";
  if (topbar) topbar.style.display = "none";
  if (main) main.style.marginLeft = "0";
  if (content) content.style.padding = "0";
  if (content) content.style.maxWidth = "none";
  const root = document.documentElement;
  if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
  else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
}

function exitMarksTestMode() {
  document.body.classList.remove("marks-test-active");
  const overlay = document.getElementById("marksCountdownOverlay");
  if (overlay) overlay.remove();
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
  const formatName = format === "jee_advanced" ? "JEE Advanced" : format === "neet" ? "NEET" : "JEE Main";
  const preview = organizeExamPaper(config.questionIds || [], {
    paperFormat: format,
    examSlug: config.meta && config.meta.slug,
    shuffle: config.shuffle !== false
  });
  const secList = (preview && preview.sections || []).map(s =>
    `<li><strong>${s.label}</strong> — ${s.count} Qs</li>`
  ).join("") || `<li>${n} questions · ${formatName} format</li>`;
  const wrongTxt = scoring.wrong < 0 ? `${scoring.wrong} for wrong` : "no negative marking";
  return `<div class="marks-modal-overlay" id="marksInstrOverlay">
    <div class="marks-modal marks-instr-modal">
      <div class="marks-modal-head"><h3>Instructions</h3></div>
      <div class="marks-modal-body marks-instr-body">
        <h2 class="marks-instr-title">${config.title || "Assessment"}</h2>
        <div class="marks-instr-stats">
          <span><strong>${n}</strong> Questions</span>
          <span><strong>${mins}</strong> Minutes</span>
          <span><strong>+${scoring.correct}</strong> / ${wrongTxt}</span>
        </div>
        <div class="marks-instr-section">
          <h4>Paper sections</h4>
          <ul class="marks-instr-list">${secList}</ul>
        </div>
        <div class="marks-instr-section">
          <h4>Before you begin</h4>
          <ul class="marks-instr-rules">
            <li>Timer starts after you accept — use the question palette to jump between sections.</li>
            <li>Mark questions for review and revisit before submit.</li>
            <li>Do not refresh or close the tab during the test.</li>
            <li>Submit only when you have attempted all sections or time runs out.</li>
          </ul>
        </div>
      </div>
      <div class="marks-modal-foot">
        <button type="button" class="marks-modal-cancel" onclick="marksCancelInstructions()">Cancel</button>
        <button type="button" class="marks-modal-apply" onclick="marksAcceptInstructions()">I have read the instructions — Start Test</button>
      </div>
    </div>
  </div>`;
}

let _marksInstrDone = null;
let _marksInstrCancel = null;

function marksCancelInstructions() {
  const el = document.getElementById("marksInstrOverlay");
  if (el) el.remove();
  if (document.body.classList.contains("marks-test-active")) exitMarksTestMode();
  if (typeof _marksInstrCancel === "function") _marksInstrCancel();
  _marksInstrDone = null;
  _marksInstrCancel = null;
}

function marksAcceptInstructions() {
  const el = document.getElementById("marksInstrOverlay");
  if (el) el.remove();
  if (typeof _marksInstrDone === "function") _marksInstrDone();
  _marksInstrDone = null;
  _marksInstrCancel = null;
}

function showMarksInstructions(config, onDone, onCancel) {
  const marksMode = config.marksMode;
  if (marksMode) enterMarksTestMode();
  const main = document.getElementById("app-main");
  if (main && marksMode) main.innerHTML = "";
  const existing = document.getElementById("marksInstrOverlay");
  if (existing) existing.remove();
  _marksInstrDone = onDone;
  _marksInstrCancel = onCancel;
  document.body.insertAdjacentHTML("beforeend", marksInstructionHtml(config));
}

function showMarksCountdown(onDone) {
  enterMarksTestMode();
  const main = document.getElementById("app-main");
  if (main) main.innerHTML = "";
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
        if (typeof onDone === "function") onDone();
      }, 600);
    }
  };
  setTimeout(tick, 400);
}

function launchTestSession(main) {
  currentView = "test";
  main.innerHTML = QuantrexTestEngine.render();
  QuantrexTestEngine.bindEvents(main);
  QuantrexTestEngine.launchTimer();
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  if (typeof Mx !== "undefined") Mx.afterRender(main);
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
    persistKey: opts.persistKey || null,
    meta: opts.meta || null,
    resumeData: opts.resumeData || null,
    paperFormat: opts.paperFormat || null
  };

  const main = document.getElementById("app-main");
  const run = async () => {
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
      return;
    }
    launchTestSession(main);
  };

  if (marksMode && !opts.skipCountdown) {
    showMarksCountdown(run);
  } else if (marksMode && opts.skipCountdown) {
    enterMarksTestMode();
    run();
  } else {
    run();
  }
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