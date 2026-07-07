// ============================================================
//  Quantrex App Clone — Application Logic (SPA)
// ============================================================

let currentView = "dashboard";

// ---------- Router ----------
function go(view, payload) {
  currentView = view;
  const main = document.getElementById("app-main");
  main.scrollTop = 0;
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const navEl = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (navEl) navEl.classList.add("active");
  render(view, payload);
}

function finishRender(html) {
  const main = document.getElementById("app-main");
  main.innerHTML = html;
  document.getElementById("examPill").textContent = EXAMS[STATE.exam].name;
  bindDynamic();
  if (typeof bindMarksGo === "function") bindMarksGo(main);
  if (typeof bindCpyqbFilters === "function") bindCpyqbFilters(main);
  if (typeof bindMarksInfiniteScroll === "function") bindMarksInfiniteScroll(main);
  if (typeof bindBooksOpen === "function") bindBooksOpen(main);
  if (typeof bindDashHome === "function") bindDashHome(main);
  if (typeof QuantrexSearch !== "undefined") QuantrexSearch.bind(main);
  if (typeof MarksShell !== "undefined") {
    MarksShell.bind(main);
    MarksShell.initSidebar();
  }
  const contentEl = document.querySelector(".content");
  if (contentEl) contentEl.classList.toggle("marks-wide", !!main.querySelector(".marks-split-layout"));
  if (typeof Mx !== "undefined") Mx.afterRender(main);
}

function render(view, payload) {
  const asyncMap = {
    dashboard: viewDashboard,
    cpyqb: viewCpyqb,
    allqs: viewAllQs,
    ncert: viewNcert,
    dpp: viewDppMarks,
    formula: viewFormulaMarks,
    books: viewBooks,
    custom: typeof viewCustomTests === "function" ? viewCustomTests : null,
    pyqmock: typeof viewPyqMock === "function" ? viewPyqMock : null,
    testseries: typeof viewTestSeries === "function" ? viewTestSeries : null,
    quickconcepts: typeof viewQuickConcepts === "function" ? viewQuickConcepts : null
  };
  if (asyncMap[view]) {
    finishRender(`<div class="empty">⏳ Loading…</div>`);
    asyncMap[view](payload).then(finishRender).catch(() => finishRender(`<div class="empty">Failed to load. Try again.</div>`));
    return;
  }
  const map = {
    practice: viewPractice,
    tests: viewTests,
    leaderboard: () => '<div class="empty">⏳ Loading leaderboard…</div>',
    notebook: viewNotebook,
    profile: viewProfile,
    analytics: () => typeof QuantrexAnalytics !== "undefined" ? QuantrexAnalytics.viewAnalytics() : '<div class="empty">Analytics loading…</div>',
    search: () => typeof QuantrexSearch !== "undefined" ? QuantrexSearch.viewSearch() : '<div class="empty">Search unavailable</div>',
    premium: viewPremium
  };
  if (view === "leaderboard" && typeof QuantrexLeaderboard !== "undefined") {
    finishRender('<div class="empty">⏳ Loading leaderboard…</div>');
    QuantrexLeaderboard.renderView().then(html => finishRender(
      topbar("Leaderboard", "Live rankings · " + EXAMS[STATE.exam].name) + html
    )).catch(() => finishRender(topbar("Leaderboard", "") + '<div class="empty">Leaderboard unavailable. Login required.</div>'));
    return;
  }
  finishRender(map[view] ? map[view](payload) : `<div class="empty">Page not found.</div>`);
}

async function viewPremium() {
  const user = JSON.parse(localStorage.getItem("quantrex_user") || "null");
  let sub = { active: false };
  if (user && user.uid && typeof QuantrexDB !== "undefined") {
    sub = await QuantrexDB.getSubscription(user.uid);
  }
  if (typeof QuantrexPremium === "undefined") {
    return topbar("Premium", "") + '<div class="empty">Premium module loading…</div>';
  }
  const html = topbar("Premium Plans", "Unlock all 127k+ questions & features") + QuantrexPremium.render(user, sub);
  setTimeout(() => {
    const main = document.getElementById("app-main");
    if (main) QuantrexPremium.bind(main, user, sub);
  }, 0);
  return html;
}

// ---------- Top bar / helpers ----------
function topbar(title, subtitle) {
  return `<div class="page-head">
    <h1>${title}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ""}
  </div>`;
}

function filterChips(items, activeKey, filterFn, allLabel) {
  const unique = [...new Set(items.map(filterFn))];
  let html = `<div class="chips"><button class="chip active" data-${activeKey}="all">${allLabel}</button>`;
  unique.forEach(v => { html += `<button class="chip" data-${activeKey}="${v}">${v}</button>`; });
  return html + "</div>";
}

// ============ DASHBOARD (MARKS home — screen 407) ============
async function viewDashboard() {
  const exam = EXAMS[STATE.exam];
  const solved = STATE.solved;
  const correct = solved.filter(s => s.correct).length;
  const accuracy = solved.length ? Math.round(correct / solved.length * 100) : 0;
  const name = typeof dashUserName === "function" ? dashUserName() : "Student";
  const initial = typeof dashUserInitial === "function" ? dashUserInitial() : "S";

  const todayDPP = DPPS.filter(d => d.date === "Today")[0];
  const marksSections = typeof marksDashboardSections === "function" ? await marksDashboardSections() : "";

  const moduleCards = MODULES.map(m => `
    <div class="dash-card" onclick="go('${m.target || m.id}')">
      <div class="dash-ic" style="background:${m.color}">${m.icon}</div>
      <strong>${m.name}</strong>
      <small>${m.desc}</small>
    </div>`).join("");

  return `<div class="dash-marks-wrap">
    <div class="dash-greet-bar">
      <div class="dash-greet-left">
        <div class="dash-avatar">${initial}</div>
        <div>
          <h1>Hey, ${name}!</h1>
          <p>${exam.name}</p>
        </div>
      </div>
      <button type="button" class="qx-premium-pill dash-premium-btn" onclick="go('premium')">QUANTREX PREMIUM</button>
    </div>
    <div class="dash-stats dash-stats-compact">
      <div class="ds"><strong>${solved.length}</strong><small>Solved</small></div>
      <div class="ds"><strong>${accuracy}%</strong><small>Accuracy</small></div>
      <div class="ds"><strong>${STATE.bookmarks.length}</strong><small>Bookmarks</small></div>
      <div class="ds"><strong>🔥 14</strong><small>Streak</small></div>
    </div>
    ${todayDPP ? `<div class="dpp-banner" onclick="startDppSet('${todayDPP.id}')">
      <div class="dpp-banner-left">
        <span class="live-dot"></span>
        <div><strong>Today's DPP is Live</strong><small>${todayDPP.title}</small></div>
      </div>
      <span class="dpp-go">Start →</span>
    </div>` : ""}
    ${marksSections}
    <h3 class="sec-title">All Modules</h3>
    <div class="dash-grid">${moduleCards}</div>
  </div>`;
}

// ============ PRACTICE (PYQ Question Bank) ============
let practiceFilter = { subject: "all", chapter: "all" };
let practicePage = 1;
const PRACTICE_PAGE_SIZE = 40;
let practiceLoading = false;

function getExamBanks() {
  if (typeof getBanksForExam === "function") return getBanksForExam(STATE.exam);
  return Object.entries(BANK_INDEX || {}).filter(([, b]) => b.category === STATE.exam);
}

function viewPractice() {
  const banks = getExamBanks();
  const activeSlug = _currentBankSlug || (banks[0] && banks[0][0]);

  if (practiceLoading) {
    return `${topbar("Question Bank (PYQ)", "Loading questions…")}<div class="empty">⏳ Loading question bank…</div>`;
  }

  if (typeof BANK_INDEX !== "undefined" && activeSlug && !_banksLoaded[activeSlug] && typeof loadSingleBank === "function") {
    practiceLoading = true;
    loadSingleBank(activeSlug).then(() => {
      practiceLoading = false;
      practicePage = 1;
      render("practice");
    }).catch(() => { practiceLoading = false; render("practice"); });
    const meta = BANK_INDEX[activeSlug];
    return `${topbar("Question Bank (PYQ)", "Loading questions…")}<div class="empty">⏳ Loading ${meta ? meta.title : "bank"} (${(meta && meta.count) || 0} questions)…</div>`;
  }

  const bankPicker = banks.length ? `<div class="bank-picker">
    <label>Exam Paper</label>
    <select id="bankSelect">${banks.map(([slug, b]) =>
      `<option value="${slug}" ${slug === activeSlug ? "selected" : ""}>${b.title} (${b.count.toLocaleString()})</option>`
    ).join("")}</select>
  </div>` : "";

  let qs = QUESTIONS.filter(q => q.exam === STATE.exam && (!_currentBankSlug || q._bank === _currentBankSlug));
  if (practiceFilter.subject !== "all") qs = qs.filter(q => q.subject === practiceFilter.subject);
  if (practiceFilter.chapter !== "all") qs = qs.filter(q => q.chapter === practiceFilter.chapter);

  const totalPages = Math.max(1, Math.ceil(qs.length / PRACTICE_PAGE_SIZE));
  if (practicePage > totalPages) practicePage = totalPages;
  const pageQs = qs.slice((practicePage - 1) * PRACTICE_PAGE_SIZE, practicePage * PRACTICE_PAGE_SIZE);

  const subjects = ["all", ...EXAMS[STATE.exam].subjects];
  const subjectChips = subjects.map(s =>
    `<button class="chip ${practiceFilter.subject === s ? 'active' : ''}" data-subject="${s}">${s === 'all' ? 'All Subjects' : s}</button>`
  ).join("");

  const chapters = practiceFilter.subject === "all" ? [] : (CHAPTERS[practiceFilter.subject] || []);
  const chapterChips = chapters.length ?
    `<div class="chips"><button class="chip ${practiceFilter.chapter==='all'?'active':''}" data-chapter="all">All Chapters</button>` +
    chapters.map(c => `<button class="chip ${practiceFilter.chapter===c?'active':''}" data-chapter="${c}">${c}</button>`).join("") + "</div>" : "";

  const list = pageQs.length ? pageQs.map(q => {
    const bm = STATE.bookmarks.includes(q.id);
    const sv = STATE.solved.find(s => s.id === q.id);
    const subjTag = q.subject.toLowerCase().replace(/\s+/g, "-");
    return `<div class="q-card" onclick="openPracticeQuestion(${q.id})">
      <div class="q-meta">
        <span class="tag tag-${subjTag}">${q.subject}</span>
        <span class="tag tag-diff">${q.difficulty}</span>
        ${sv ? `<span class="tag ${sv.correct?'tag-ok':'tag-no'}">${sv.correct?'✓ Correct':'✗ Wrong'}</span>` : ''}
      </div>
      <div class="q-text qx-content">${typeof Mx!=="undefined"?Mx.html(q.q):q.q}</div>
      <div class="q-footer"><small>📖 ${q.chapter} · 📌 ${q.source}</small><span class="bm">${bm ? '🔖' : '🤍'}</span></div>
    </div>`;
  }).join("") : `<div class="empty">${activeSlug ? "No questions match these filters." : "Select an exam paper to begin."}</div>`;

  const pagination = qs.length > PRACTICE_PAGE_SIZE ? `<div class="pagination">
    <button class="btn-soft sm" ${practicePage <= 1 ? "disabled" : ""} onclick="practicePage--;render('practice')">← Prev</button>
    <span>Page ${practicePage} of ${totalPages}</span>
    <button class="btn-soft sm" ${practicePage >= totalPages ? "disabled" : ""} onclick="practicePage++;render('practice')">Next →</button>
  </div>` : "";

  return `${topbar("Question Bank (PYQ)", "Practice chapter-wise previous year questions with instant solutions")}
  ${bankPicker}
  ${`<div class="chips" id="subjectChips">${subjectChips}</div>`}
  ${chapterChips}
  <p class="result-count">${qs.length.toLocaleString()} question${qs.length!==1?'s':''} found${qs.length > PRACTICE_PAGE_SIZE ? ` · showing ${pageQs.length} on page ${practicePage}` : ""}</p>
  <div class="q-list">${list}</div>
  ${pagination}`;
}

// ============ SINGLE QUESTION — MARKS-style practice ============
window._qxPracticeCtx = null;

function openPracticeQuestion(id) {
  const list = window._qxListQs || [];
  const ids = list.length ? list.map(q => q.id) : [id];
  const idx = Math.max(0, ids.indexOf(id));
  window._qxPracticeCtx = {
    ids,
    idx,
    selected: {},
    done: {},
    returnView: currentView,
    listFn: typeof _lastListFn === "function" ? _lastListFn : null
  };
  go("question", id);
}

function qxPracticeBack() {
  const ctx = window._qxPracticeCtx;
  if (ctx && ctx.listFn && typeof _lastListFn !== "undefined") {
    _lastListFn = ctx.listFn;
    render(ctx.returnView || currentView, ctx.listFn());
    return;
  }
  if (ctx && ctx.returnView) { go(ctx.returnView); return; }
  go("practice");
}

function qxPracticeNav(delta) {
  const ctx = window._qxPracticeCtx;
  if (!ctx || !ctx.ids.length) return;
  const next = ctx.idx + delta;
  if (next < 0 || next >= ctx.ids.length) return;
  ctx.idx = next;
  const main = document.getElementById("app-main");
  main.innerHTML = viewQuestion(ctx.ids[ctx.idx]);
  bindPracticeQuestion(main);
  if (typeof Mx !== "undefined") Mx.afterRender(main);
}

function viewQuestion(id) {
  const q = getQ(id);
  if (!q) return `<div class="empty">Question not found. <button class="btn-soft" onclick="qxPracticeBack()">← Back</button></div>`;

  const ctx = window._qxPracticeCtx;
  if (ctx) {
    const i = ctx.ids.indexOf(id);
    if (i >= 0) ctx.idx = i;
  } else {
    window._qxPracticeCtx = { ids: [id], idx: 0, selected: {}, done: {}, returnView: currentView, listFn: null };
  }
  const pc = window._qxPracticeCtx;
  const total = pc.ids.length;
  const pos = pc.idx + 1;
  const bm = STATE.bookmarks.includes(q.id);
  const sv = STATE.solved.find(s => s.id === q.id);
  const subjTag = (q.subject || "").toLowerCase().replace(/\s+/g, "-");
  const sourceLabel = q._book && typeof bookQuestionLabel === "function" ? bookQuestionLabel(q) : (q.source || "");
  const done = !!pc.done[q.id];
  const sel = pc.selected[q.id];

  const opts = (q.options || []).map((o, i) => {
    let cls = "qx-prac-opt";
    if (sel === i) cls += " selected";
    if (done) {
      if (i === q.answer) cls += " correct";
      else if (sel === i) cls += " wrong";
    }
    return `<button type="button" class="${cls}" data-prac-opt="${i}" ${done ? "disabled" : ""}>
      <span class="qx-prac-radio"></span>
      <span class="qx-prac-letter">${String.fromCharCode(65 + i)}</span>
      <span class="qx-prac-opt-text qx-content">${typeof Mx !== "undefined" ? Mx.html(o) : o}</span>
    </button>`;
  }).join("");

  const resultHtml = done ? qxPracticeResultHtml(q, sel) : "";

  setTimeout(() => loadCommunityForQuestion(q), 0);

  return `<div class="qx-practice-page">
    <header class="qx-prac-bar">
      <button type="button" class="qx-prac-back" onclick="qxPracticeBack()">←</button>
      <div class="qx-prac-mid">
        <strong>Q${pos} <span class="qx-prac-of">/ ${total}</span></strong>
        <small>${q.chapter || q.subject}</small>
      </div>
      <div class="qx-prac-actions">
        <button type="button" class="qx-prac-icon ${bm ? "on" : ""}" onclick="toggleBm(${q.id})" title="Bookmark">${bm ? "🔖" : "🤍"}</button>
        <button type="button" class="qx-prac-icon" onclick="showToast('🚩 Thanks — report noted.')" title="Report">🚩</button>
      </div>
    </header>
    <div class="qx-prac-meta">
      <span class="tag tag-${subjTag}">${q.subject}</span>
      <span class="tag tag-diff">${q.difficulty || "Medium"}</span>
      <span class="tag" title="${sourceLabel}">📌 ${sourceLabel}</span>
      ${sv ? `<span class="tag ${sv.correct ? "tag-ok" : "tag-no"}">${sv.correct ? "✓ Solved" : "✗ Wrong"}</span>` : ""}
    </div>
    <div class="qx-prac-q qx-content">${typeof Mx !== "undefined" ? Mx.html(q.q) : q.q}</div>
    <div class="qx-prac-opts" id="qaOpts">${opts}</div>
    <div id="qaResult">${resultHtml}</div>
    <div class="qx-prac-foot">
      <button type="button" class="btn-soft" onclick="qxPracticeNav(-1)" ${pc.idx <= 0 ? "disabled" : ""}>← Previous</button>
      ${done ? "" : `<button type="button" class="btn-primary qx-prac-submit" id="qxPracSubmit" ${sel == null ? "disabled" : ""}>Submit Answer</button>`}
      <button type="button" class="btn-soft" onclick="qxPracticeNav(1)" ${pc.idx >= total - 1 ? "disabled" : ""}>Next →</button>
    </div>
    <div id="qaCommunity"><div class="empty" style="padding:16px">Loading community solutions…</div></div>
  </div>`;
}

function qxPracticeResultHtml(q, sel) {
  const correct = sel === q.answer;
  const solHtml = typeof Mx !== "undefined" ? Mx.html(q.solution) : q.solution;
  return `<div class="result-box ${correct ? "ok" : "no"}">
    <strong>${correct ? "✅ Correct!" : "❌ Incorrect"}</strong>
    ${!correct ? `<p class="qx-prac-correct-ans">Correct answer: <b>${String.fromCharCode(65 + q.answer)}</b></p>` : ""}
    <div class="sol"><strong>💡 Solution</strong><div class="qx-content sol-body">${solHtml}</div></div>
  </div>`;
}

function bindPracticeQuestion(root) {
  const scope = root || document.getElementById("app-main");
  if (!scope) return;
  const ctx = window._qxPracticeCtx;
  const qid = ctx && ctx.ids[ctx.idx];
  scope.querySelectorAll("[data-prac-opt]").forEach(btn => {
    btn.onclick = () => {
      if (!ctx || ctx.done[qid]) return;
      const idx = parseInt(btn.dataset.pracOpt, 10);
      ctx.selected[qid] = idx;
      scope.querySelectorAll("[data-prac-opt]").forEach(b => b.classList.toggle("selected", parseInt(b.dataset.pracOpt, 10) === idx));
      const sub = scope.querySelector("#qxPracSubmit");
      if (sub) sub.disabled = false;
    };
  });
  const submit = scope.querySelector("#qxPracSubmit");
  if (submit) submit.onclick = () => answerQ(qid, ctx.selected[qid]);
}

async function loadCommunityForQuestion(q) {
  const el = document.getElementById("qaCommunity");
  if (!el || typeof QuantrexCommunity === "undefined") return;
  try {
    const posts = await QuantrexCommunity.fetchPosts(q);
    el.innerHTML = QuantrexCommunity.renderPanel(q, posts);
    QuantrexCommunity.bind(q, el);
    if (typeof Mx !== "undefined") Mx.afterRender(el);
  } catch (e) {
    el.innerHTML = '<p class="empty">Community solutions unavailable. Login to post.</p>';
  }
}

function answerQ(qid, idx) {
  const q = getQ(qid);
  if (!q || idx == null) return;
  const ctx = window._qxPracticeCtx || { done: {}, selected: {} };
  ctx.done[qid] = true;
  ctx.selected[qid] = idx;
  const main = document.getElementById("app-main");
  main.querySelectorAll("[data-prac-opt]").forEach((o, i) => {
    o.disabled = true;
    o.classList.remove("selected");
    if (i === q.answer) o.classList.add("correct");
    if (i === idx && idx !== q.answer) o.classList.add("wrong");
    if (i === idx && idx === q.answer) o.classList.add("selected", "correct");
  });
  const correct = idx === q.answer;
  STATE.markSolved(qid, correct);
  const res = document.getElementById("qaResult");
  if (res) {
    res.innerHTML = qxPracticeResultHtml(q, idx);
    if (typeof Mx !== "undefined") Mx.afterRender(res);
  }
  const sub = main.querySelector("#qxPracSubmit");
  if (sub) sub.remove();
}

function toggleBm(id) {
  STATE.toggleBookmark(id);
  const main = document.getElementById("app-main");
  if (currentView === "question" && main) {
    main.innerHTML = viewQuestion(id);
    bindPracticeQuestion(main);
    if (typeof Mx !== "undefined") Mx.afterRender(main);
  } else {
    render("question", id);
  }
  showToast(STATE.bookmarks.includes(id) ? "🔖 Bookmarked!" : "Removed bookmark");
}

// DPP & Formula views are in marks-features.js (viewDppMarks, viewFormulaMarks)

function toggleFcBm(id) {
  STATE.toggleBookmark("f" + id);
  showToast(STATE.bookmarks.includes("f"+id) ? "🔖 Formula saved!" : "Removed");
  render("formula");
}

// ============ CUSTOM TEST BUILDER ============
function viewCustomBuilder() {
  const subjects = EXAMS[STATE.exam].subjects;
  return `${topbar("Custom Test", "Build your own test in seconds")}
  <div class="builder">
    <div class="b-field"><label>Subject</label>
      <select id="bSubject">${subjects.map(s=>`<option>${s}</option>`).join("")}</select>
    </div>
    <div class="b-field"><label>Chapters</label>
      <div class="b-checks" id="bChapters"></div>
    </div>
    <div class="b-field"><label>Number of Questions</label>
      <input type="number" id="bCount" value="5" min="1" max="20">
    </div>
    <div class="b-field"><label>Difficulty</label>
      <select id="bDiff"><option>all</option><option>Easy</option><option>Medium</option><option>Hard</option></select>
    </div>
    <div class="b-field"><label>Mode</label>
      <select id="bMode"><option value="timed">Timed (1.5 min/question)</option><option value="practice">Practice (no timer)</option></select>
    </div>
    <button class="btn-primary big" onclick="createCustomTest()">🚀 Create &amp; Start Test</button>
  </div>`;
}

async function createCustomTest() {
  const bank = (typeof PRIMARY_BANK !== "undefined" && PRIMARY_BANK[STATE.exam]) || _currentBankSlug;
  if (typeof ensureQuestionsLoaded === "function") await ensureQuestionsLoaded(bank);
  const subject = document.getElementById("bSubject").value;
  const checked = [...document.querySelectorAll(".b-check:checked")].map(c => c.value);
  const count = parseInt(document.getElementById("bCount").value) || 5;
  const diff = document.getElementById("bDiff").value;
  let pool = QUESTIONS.filter(q => q.subject === subject);
  if (checked.length) pool = pool.filter(q => checked.includes(q.chapter));
  if (diff !== "all") pool = pool.filter(q => q.difficulty === diff);
  if (!pool.length) { showToast("⚠️ No questions match. Try wider filters."); return; }
  // shuffle & take count
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(count, pool.length));
  const ids = shuffled.map(q => q.id);
  const mode = document.getElementById("bMode")?.value || "timed";
  const timed = mode === "timed";
  return startTest(ids, `Custom Test · ${subject}`, "custom", {
    testType: "custom",
    timed,
    durationSec: timed ? Math.max(300, ids.length * 90) : null,
    modeLabel: timed ? "Timed Custom Test" : "Practice Mode"
  });
}

// Test engine: test-engine.js (startTest, renderTest, startChapterTest, startMockTest)

// Leaderboard: leaderboard.js (Firebase live rankings)

// ============ NOTEBOOK ============
function viewNotebook() {
  const notes = STATE.notes;
  const bmQs = STATE.bookmarks.filter(b => typeof b === "number").map(getQ).filter(Boolean);
  const bmFs = STATE.bookmarks.filter(b => typeof b === "string" && b.startsWith("f"))
    .map(b => FORMULAS.find(f => "f"+f.id === b)).filter(Boolean);

  return `${topbar("My Notebook", "Your saved notes, questions & formulas")}
  <div class="nb-section">
    <h3 class="sec-title">➕ Quick Note</h3>
    <div class="note-add">
      <textarea id="noteText" placeholder="Type a quick note or concept you want to remember..."></textarea>
      <button class="btn-primary" onclick="addNoteFromInput()">Save Note</button>
    </div>
  </div>
  <div class="nb-section">
    <h3 class="sec-title">📝 My Notes (${notes.length})</h3>
    ${notes.length ? notes.map(n => `<div class="note-card"><p>${n.text.replace(/</g,'&lt;')}</p>
      <div class="note-meta"><small>${n.date}</small><button onclick="deleteNote(${n.id})">🗑️</button></div></div>`).join("")
      : '<div class="empty">No notes yet. Add one above!</div>'}
  </div>
  <div class="nb-section">
    <h3 class="sec-title">🔖 Saved Questions (${bmQs.length})</h3>
    ${bmQs.length ? bmQs.map(q => `<div class="q-card" onclick="go('question',${q.id})"><div class="q-text qx-content">${typeof Mx!=="undefined"?Mx.html(q.q):q.q}</div>
      <small>📖 ${q.subject} · ${q.chapter}</small></div>`).join("")
      : '<div class="empty">Bookmark questions from practice to see them here.</div>'}
  </div>
  <div class="nb-section">
    <h3 class="sec-title">🧮 Saved Formulas (${bmFs.length})</h3>
    ${bmFs.length ? bmFs.map(f => `<div class="note-card"><div class="fc-formula qx-content">${typeof Mx!=="undefined"?Mx.html(f.formula):f.formula}</div><small>${f.subject} · ${f.topic}</small></div>`).join("")
      : '<div class="empty">Bookmark formulas to revisit them quickly.</div>'}
  </div>`;
}

function addNoteFromInput() {
  const txt = document.getElementById("noteText").value.trim();
  if (!txt) { showToast("⚠️ Note is empty"); return; }
  STATE.addNote(txt);
  showToast("✅ Note saved!");
  render("notebook");
}
function deleteNote(id) { STATE.deleteNote(id); render("notebook"); }

// ============ PROFILE ============
function viewProfile() {
  const exam = EXAMS[STATE.exam];
  const solved = STATE.solved;
  const correct = solved.filter(s => s.correct).length;
  const accuracy = solved.length ? Math.round(correct/solved.length*100) : 0;
  const points = correct * 10;

  return `${topbar("Profile", "Your learning journey")}
  <div class="profile-card">
    <div class="prof-av" style="background:${exam.color}">You</div>
    <h2>Quantrex Student</h2>
    <span class="tag" style="background:${exam.color};color:#fff">${exam.name}</span>
    <div class="prof-stats">
      <div><strong>${solved.length}</strong><small>Solved</small></div>
      <div><strong>${accuracy}%</strong><small>Accuracy</small></div>
      <div><strong>${points}</strong><small>Points</small></div>
      <div><strong>${STATE.bookmarks.length}</strong><small>Saved</small></div>
    </div>
  </div>
  <h3 class="sec-title">Choose Your Exam Goal</h3>
  <div class="exam-switch">
    ${Object.entries(EXAMS).map(([k,e]) => `
      <button class="exam-opt ${STATE.exam===k?'active':''}" style="${STATE.exam===k?'border-color:'+e.color:''}" onclick="switchExam('${k}')">
        <span class="exam-opt-ic" style="background:${e.color}">${k==='Engineering'?'⚙️':k==='Medical'?'⚕️':'📚'}</span>
        <strong>${e.name}</strong>
      </button>`).join("")}
  </div>
  <div class="danger-zone">
    <button class="btn-soft danger" onclick="resetData()">🗑️ Reset All Progress</button>
  </div>`;
}

function switchExam(key) {
  STATE.exam = key;
  practiceFilter = { subject: "all", chapter: "all" };
  practicePage = 1;
  showToast(`✅ Switched to ${EXAMS[key].name}`);
  go("dashboard");
}

function resetData() {
  if (confirm("Reset ALL progress? This clears solved questions, notes & bookmarks.")) {
    localStorage.removeItem("quantrex_solved");
    localStorage.removeItem("quantrex_notes");
    localStorage.removeItem("quantrex_bookmarks");
    showToast("🗑️ All progress reset");
    go("dashboard");
  }
}

// ---------- Toast ----------
let toastTimer;
function showToast(msg) {
  const t = document.getElementById("appToast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2400);
}

// ---------- Dynamic event binding (chips) ----------
function bindDynamic() {
  document.querySelectorAll(".chip[data-subject]").forEach(c => {
    c.onclick = () => {
      practiceFilter.subject = c.dataset.subject;
      practiceFilter.chapter = "all";
      practicePage = 1;
      render("practice");
    };
  });
  document.querySelectorAll(".chip[data-chapter]").forEach(c => {
    c.onclick = () => { practiceFilter.chapter = c.dataset.chapter; practicePage = 1; render("practice"); };
  });
  const bankSelect = document.getElementById("bankSelect");
  if (bankSelect) {
    bankSelect.onchange = async () => {
      practiceFilter = { subject: "all", chapter: "all" };
      practicePage = 1;
      if (typeof loadSingleBank === "function") await loadSingleBank(bankSelect.value);
      render("practice");
    };
  }
  document.querySelectorAll(".chip[data-fcsubject]").forEach(c => {
    c.onclick = () => { localStorage.setItem("quantrex_fc_filter", c.dataset.fcsubject); render("formula"); };
  });
  // custom builder: chapters update on subject change
  const bSubject = document.getElementById("bSubject");
  if (bSubject) {
    const renderChecks = () => {
      const subj = bSubject.value;
      const chs = CHAPTERS[subj] || [];
      document.getElementById("bChapters").innerHTML = chs.map(c =>
        `<label class="b-check-label"><input type="checkbox" class="b-check" value="${c}"> ${c}</label>`).join("");
    };
    renderChecks();
    bSubject.onchange = renderChecks;
  }
}

// ---------- Init ----------
function bootApp() {
  if (typeof QuantrexTheme !== "undefined") QuantrexTheme.init();
  document.querySelectorAll(".nav-item").forEach(n => {
    n.onclick = () => go(n.dataset.view);
  });
  const navMore = document.getElementById("navMoreToggle");
  const navMoreList = document.getElementById("navMoreList");
  if (navMore && navMoreList) {
    navMore.onclick = () => {
      const open = navMoreList.style.display !== "none";
      navMoreList.style.display = open ? "none" : "block";
    };
  }
  document.getElementById("examPill").textContent = EXAMS[STATE.exam].name;
  document.getElementById("examPillTop").textContent = EXAMS[STATE.exam].name;
  document.getElementById("navToggle").onclick = () => {
    document.querySelector(".sidebar").classList.toggle("open");
  };
  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) searchBtn.onclick = () => typeof QuantrexSearch !== "undefined" ? QuantrexSearch.openOverlay() : go("search");
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.onclick = async () => {
    if (typeof QuantrexDB !== "undefined" && QuantrexDB.signOut) {
      await QuantrexDB.signOut();
    } else {
      localStorage.removeItem("quantrex_user");
    }
    window.location.href = "login.html";
  };
  if (typeof QxPerf !== "undefined") {
    QxPerf.prefetchPrimaryBank();
    QxPerf.onIdle(() => QxPerf.lazyImages(document));
  }
  go("dashboard");
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof QuantrexDB === "undefined" || !QuantrexDB.init()) {
    bootApp();
    return;
  }

  QuantrexDB.onDataChange = () => {
    document.getElementById("examPill").textContent = EXAMS[STATE.exam].name;
    document.getElementById("examPillTop").textContent = EXAMS[STATE.exam].name;
    if (currentView) render(currentView);
  };

  QuantrexDB.watchAuth((user, loggedIn) => {
    if (loggedIn && user) {
      if (localStorage.getItem("quantrex_exam")) STATE.exam = localStorage.getItem("quantrex_exam");
      const name = user.displayName || user.email || "Student";
      showToast("🔥 Firebase DB connected · Welcome, " + name);
      QuantrexDB.seedAppMeta().catch(() => {});
      if (typeof QuantrexPayments !== "undefined") QuantrexPayments.handleReturnQuery().catch(() => {});
      bootApp();
    } else {
      const cached = JSON.parse(localStorage.getItem("quantrex_user") || "null");
      if (cached && (cached.uid || cached.phone || cached.email)) {
        if (cached.uid) {
          QuantrexDB.syncForUser({ uid: cached.uid, email: cached.email, displayName: cached.name }).then(() => bootApp());
        } else {
          bootApp();
        }
      } else {
        window.location.href = "login.html";
      }
    }
  });
});

// override go() to handle test/question pseudo views
const _origGo = go;
go = function(view, payload) {
  currentView = view;
  const main = document.getElementById("app-main");
  main.scrollTop = 0;
  _listPage = 1;
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const navMap = { allqs: "allqs", ncert: "allqs", cpyqb: "cpyqb", books: "books", tests: "tests", custom: "tests", testseries: "tests", pyqmock: "tests", analytics: "analytics", search: "search", quickconcepts: "quickconcepts", premium: "premium" };
  const navView = navMap[view] || view;
  const navEl = document.querySelector(`.nav-item[data-view="${navView}"]`);
  if (navEl) navEl.classList.add("active");

  if (view === "question") {
    main.innerHTML = viewQuestion(payload);
    document.getElementById("examPill").textContent = EXAMS[STATE.exam].name;
    bindPracticeQuestion(main);
    if (typeof Mx !== "undefined") Mx.afterRender(main);
    return;
  }
  if (view === "test") {
    main.innerHTML = renderTest();
    if (typeof QuantrexTestEngine !== "undefined") QuantrexTestEngine.bindEvents(main);
    if (typeof Mx !== "undefined") Mx.afterRender(main);
    return;
  }
  render(view, payload);
};
