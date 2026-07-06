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
  if (typeof bindMarksInfiniteScroll === "function") bindMarksInfiniteScroll(main);
  if (typeof bindBooksOpen === "function") bindBooksOpen(main);
  if (typeof QuantrexSearch !== "undefined") QuantrexSearch.bind(main);
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

// ============ DASHBOARD (MARKS-style) ============
async function viewDashboard() {
  const exam = EXAMS[STATE.exam];
  const solved = STATE.solved;
  const correct = solved.filter(s => s.correct).length;
  const accuracy = solved.length ? Math.round(correct / solved.length * 100) : 0;

  const moduleCards = MODULES.map(m => `
    <div class="dash-card" onclick="go('${m.target || m.id}')">
      <div class="dash-ic" style="background:${m.color}">${m.icon}</div>
      <strong>${m.name}</strong>
      <small>${m.desc}</small>
    </div>`).join("");

  const todayDPP = DPPS.filter(d => d.date === "Today")[0];
  const marksSections = typeof marksDashboardSections === "function" ? await marksDashboardSections() : "";

  return `${topbar(`Welcome back 👋`, `${exam.name} · Keep your streak alive!`)}
  <div class="dash-stats">
    <div class="ds"><strong>${solved.length}</strong><small>Questions Solved</small></div>
    <div class="ds"><strong>${accuracy}%</strong><small>Accuracy</small></div>
    <div class="ds"><strong>${STATE.bookmarks.length}</strong><small>Bookmarked</small></div>
    <div class="ds"><strong>🔥 14</strong><small>Day Streak</small></div>
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
  <div class="dash-grid">${moduleCards}</div>`;
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
    return `<div class="q-card" onclick="go('question', ${q.id})">
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

// ============ SINGLE QUESTION (interactive) ============
function viewQuestion(id) {
  const q = getQ(id);
  if (!q) return viewPractice();
  const bm = STATE.bookmarks.includes(q.id);
  setTimeout(() => loadCommunityForQuestion(q), 0);
  return `${topbar("Practice Question", `${q.subject} · ${q.chapter}`)}
  <div class="qa-wrap">
    <div class="qa-head">
      <div><span class="tag tag-${q.subject.toLowerCase()}">${q.subject}</span> <span class="tag tag-diff">${q.difficulty}</span> <span class="tag">📌 ${q.source}</span></div>
      <button class="bm-btn ${bm?'on':''}" onclick="toggleBm(${q.id})">${bm?'🔖 Saved':'🤍 Save'}</button>
    </div>
    <div class="qa-q qx-content">${typeof Mx!=="undefined"?Mx.html(q.q):q.q}</div>
    <div class="qa-options" id="qaOpts">
      ${q.options.map((o, i) => `<button class="qa-opt" data-idx="${i}" onclick="answerQ(${q.id}, ${i})">
        <span class="opt-letter">${String.fromCharCode(65+i)}</span><span class="qx-content">${typeof Mx!=="undefined"?Mx.html(o):o}</span></button>`).join("")}
    </div>
    <div id="qaResult"></div>
    <div id="qaCommunity"><div class="empty" style="padding:16px">Loading community solutions…</div></div>
    <div class="qa-nav">
      <button class="btn-soft" onclick="go('practice')">← Back to list</button>
    </div>
  </div>`;
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
  const opts = document.querySelectorAll(".qa-opt");
  opts.forEach((o, i) => {
    o.disabled = true;
    if (i === q.answer) o.classList.add("correct");
    if (i === idx && idx !== q.answer) o.classList.add("wrong");
  });
  const correct = idx === q.answer;
  STATE.markSolved(qid, correct);
  const solHtml = typeof Mx !== "undefined" ? Mx.html(q.solution) : q.solution;
  document.getElementById("qaResult").innerHTML = `
    <div class="result-box ${correct?'ok':'no'}">
      <strong>${correct?'✅ Correct!':'❌ Incorrect'}</strong>
      <div class="sol"><strong>💡 Solution:</strong><div class="qx-content sol-body">${solHtml}</div></div>
    </div>`;
  if (typeof Mx !== "undefined") Mx.afterRender(document.getElementById("qaResult"));
}

function toggleBm(id) {
  STATE.toggleBookmark(id);
  render("question", id);
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
  const navMap = { allqs: "allqs", ncert: "allqs", cpyqb: "cpyqb", books: "books", tests: "tests", custom: "tests", analytics: "analytics", search: "search", quickconcepts: "quickconcepts", premium: "premium" };
  const navView = navMap[view] || view;
  const navEl = document.querySelector(`.nav-item[data-view="${navView}"]`);
  if (navEl) navEl.classList.add("active");

  if (view === "question") { main.innerHTML = viewQuestion(payload); document.getElementById("examPill").textContent = EXAMS[STATE.exam].name; if (typeof Mx!=="undefined") Mx.afterRender(main); return; }
  if (view === "test") {
    main.innerHTML = renderTest();
    if (typeof QuantrexTestEngine !== "undefined") QuantrexTestEngine.bindEvents(main);
    if (typeof Mx !== "undefined") Mx.afterRender(main);
    return;
  }
  render(view, payload);
};
