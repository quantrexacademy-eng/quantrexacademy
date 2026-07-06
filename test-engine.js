// Quantrex Test Engine — original exam simulation (timer, palette, review, scoring)
const QuantrexTestEngine = (() => {
  const SCORING = {
    jee: { correct: 4, wrong: -1, unattempted: 0 },
    neet: { correct: 4, wrong: -1, unattempted: 0 },
    practice: { correct: 1, wrong: 0, unattempted: 0 }
  };

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
      const el = document.getElementById("qxTimer");
      if (el) {
        el.textContent = formatTime(session.remainingSec);
        el.classList.toggle("warn", session.remainingSec <= 300);
        el.classList.toggle("danger", session.remainingSec <= 60);
      }
    }, 1000);
  }

  function paletteStatus(i) {
    if (!session) return "unvisited";
    if (session.review.has(i)) return "review";
    if (session.answers[i] !== undefined) return "answered";
    if (session.visited.has(i)) return "skipped";
    return "unvisited";
  }

  function stats() {
    if (!session) return { answered: 0, review: 0, skipped: 0, unvisited: session?.ids?.length || 0 };
    const total = session.ids.length;
    let answered = 0, review = session.review.size, skipped = 0;
    for (let i = 0; i < total; i++) {
      if (session.answers[i] !== undefined) answered++;
      else if (session.visited.has(i)) skipped++;
    }
    return { answered, review, skipped, unvisited: total - answered - skipped, total };
  }

  function htmlContent(text) {
    return typeof Mx !== "undefined" ? Mx.html(text) : text;
  }

  function renderPalette() {
    if (!session) return "";
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

  function renderQuestion() {
    if (!session) return '<div class="empty">No active test session.</div>';
    const q = getQ(session.ids[session.idx]);
    if (!q) return '<div class="empty">Question not found.</div>';
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
          <div class="qa-q qx-content">${htmlContent(q.q)}</div>
          <div class="qa-options" id="qxOpts">
            ${q.options.map((o, i) => `<button type="button" class="qa-opt ${selected === i ? "selected" : ""}" data-opt="${i}">
              <span class="opt-letter">${String.fromCharCode(65 + i)}</span>
              <span class="qx-content">${htmlContent(o)}</span></button>`).join("")}
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
    root.querySelectorAll("[data-opt]").forEach(btn => {
      btn.onclick = () => selectAnswer(parseInt(btn.dataset.opt, 10));
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
    const submitBtn = root.querySelector("#qxSubmitBtn");
    if (submitBtn) submitBtn.onclick = () => confirmSubmit();
    root.querySelectorAll(".qx-pal-cell").forEach(cell => {
      cell.onclick = () => goTo(parseInt(cell.dataset.qidx, 10));
    });
  }

  function refresh() {
    const main = document.getElementById("app-main");
    if (!main) return;
    main.innerHTML = renderQuestion();
    bindEvents(main);
    if (typeof Mx !== "undefined") Mx.afterRender(main);
  }

  function selectAnswer(idx) {
    if (!session || session.submitted) return;
    session.answers[session.idx] = idx;
    session.visited.add(session.idx);
    session.review.delete(session.idx);
    refresh();
  }

  function toggleReview() {
    if (!session) return;
    if (session.review.has(session.idx)) session.review.delete(session.idx);
    else session.review.add(session.idx);
    refresh();
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
    if (confirm("Leave this assessment? Unsaved answers will be lost.")) {
      stopTimer();
      session = null;
      go(session.returnTo || "dashboard");
    }
  }

  function confirmSubmit() {
    if (!session) return;
    const s = stats();
    const msg = `Submit now?\n\nAnswered: ${s.answered}\nMarked for review: ${s.review}\nSkipped/Unvisited: ${s.unvisited + s.skipped}`;
    if (confirm(msg)) submit(false);
  }

  function computeResults() {
    const scoring = session.scoring;
    let correct = 0, wrong = 0, skipped = 0, score = 0;
    const breakdown = { subject: {}, difficulty: {} };
    const rows = session.ids.map((id, i) => {
      const q = getQ(id);
      const chosen = session.answers[i];
      const isCorrect = chosen !== undefined && q && chosen === q.answer;
      const isWrong = chosen !== undefined && q && chosen !== q.answer;
      const isSkip = chosen === undefined;
      if (isCorrect) { correct++; score += scoring.correct; }
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

  function renderResults(data) {
    const ret = session.returnTo;
    const title = session.title;
    const mode = session.testType;
    const pass = data.pct >= 60;
    const subjectBars = Object.entries(data.breakdown.subject).map(([sub, v]) => {
      const acc = v.total ? Math.round(v.correct / v.total * 100) : 0;
      return `<div class="qx-subj-bar"><div class="qx-subj-label"><span>${sub}</span><span>${acc}%</span></div>
        <div class="qx-bar-track"><div class="qx-bar-fill" style="width:${acc}%"></div></div>
        <small>${v.correct}/${v.total} correct</small></div>`;
    }).join("");

    const reviewHtml = data.rows.map((r, i) => {
      if (!r.q) return "";
      const sol = r.q.solution ? `<div class="sol"><strong>Solution</strong><div class="qx-content sol-body">${htmlContent(r.q.solution)}</div></div>` : "";
      return `<div class="rv-row ${r.isCorrect ? "ok" : r.isSkip ? "" : "no"}">
        <div class="rv-q qx-content"><strong>Q${i + 1}.</strong> ${htmlContent(r.q.q)}</div>
        <div class="rv-ans">
          ${r.isSkip ? '<span class="tag tag-skip">Not attempted</span>' :
            `<span class="tag ${r.isCorrect ? "tag-ok" : "tag-no"}">${r.isCorrect ? "✓" : "✗"} ${htmlContent(r.q.options[r.chosen])}</span>`}
          ${r.isWrong ? `<div class="rv-correct">✓ Answer: ${htmlContent(r.q.options[r.q.answer])}</div>` : ""}
        </div>${sol}</div>`;
    }).join("");

    if (typeof QuantrexAnalytics !== "undefined") {
      QuantrexAnalytics.recordAttempt({
        title, mode, ...data,
        exam: STATE.exam,
        date: Date.now()
      });
    }

    session = null;
    return `<div class="result-screen">
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
      <div class="review-list">${reviewHtml}</div>
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
    const main = document.getElementById("app-main");
    if (main) {
      main.innerHTML = renderResults(data);
      if (typeof Mx !== "undefined") Mx.afterRender(main);
    }
    if (typeof session.onComplete === "function") {
      try { session.onComplete(data); } catch (e) { console.error(e); }
    }
    if (!auto) showToast("✅ Assessment submitted!");
  }

  function begin(config) {
    const ids = config.shuffle !== false ? shuffle(config.questionIds) : [...config.questionIds];
    if (!ids.length) {
      showToast("⚠️ No questions available for this test.");
      return false;
    }
    const duration = config.durationSec ?? (config.timed ? Math.max(600, ids.length * 90) : null);
    session = {
      ids,
      title: config.title || "Quantrex Assessment",
      returnTo: config.returnTo || "tests",
      testType: config.testType || "custom",
      modeLabel: config.modeLabel || (duration ? "Timed Mode" : "Practice Mode"),
      durationSec: duration,
      remainingSec: duration,
      scoring: config.scoring || defaultScoring(STATE.exam),
      idx: 0,
      answers: {},
      review: new Set(),
      visited: new Set([0]),
      startedAt: Date.now(),
      submitted: false,
      testId: config.testId || null,
      onComplete: config.onComplete || null
    };
    startTimer();
    return true;
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
    formatTime,
    set onTick(fn) { onTick = fn; }
  };
})();

function startTest(questionIds, title, returnTo, options) {
  const opts = options || {};
  const ok = QuantrexTestEngine.begin({
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
    onComplete: opts.onComplete
  });
  if (!ok) return;
  currentView = "test";
  const main = document.getElementById("app-main");
  main.innerHTML = QuantrexTestEngine.render();
  QuantrexTestEngine.bindEvents(main);
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  if (typeof Mx !== "undefined") Mx.afterRender(main);
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
    modeLabel: `Chapter Test · ${mins} min`
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
    shuffle: true
  });
}