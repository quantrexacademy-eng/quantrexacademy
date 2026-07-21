// ============================================================
//  Quantrex App Clone — Application Logic (SPA)
// ============================================================

let currentView = "dashboard";

function qxIsLoggedIn() {
  if (typeof QuantrexGuestTrial !== "undefined" && QuantrexGuestTrial.isLoggedIn) {
    return QuantrexGuestTrial.isLoggedIn();
  }
  try {
    const cached = JSON.parse(localStorage.getItem("quantrex_user") || "null");
    if (cached && cached.uid) return true;
  } catch (e) { /* */ }
  if (typeof QuantrexDB !== "undefined" && QuantrexDB.uid) return true;
  if (typeof QuantrexDB !== "undefined" && QuantrexDB.auth && QuantrexDB.auth.currentUser) return true;
  return false;
}

function qxGuestTrialOk() {
  // Full access launch: never block the app
  if (typeof QuantrexGuestTrial !== "undefined") {
    if (QuantrexGuestTrial.OPEN_FULL_ACCESS) {
      QuantrexGuestTrial.ensureStart();
      return true;
    }
    QuantrexGuestTrial.ensureStart();
    return QuantrexGuestTrial.isActive();
  }
  return true;
}

function qxGuestTrialBlock() {
  if (typeof QuantrexGuestTrial === "undefined") return "";
  return QuantrexGuestTrial.expiredHtml();
}

function qxLoginUrl(returnView, returnPayload) {
  const params = new URLSearchParams();
  if (returnView) params.set("return", returnView);
  if (returnPayload && Object.keys(returnPayload).length) {
    params.set("payload", JSON.stringify(returnPayload));
  }
  const qs = params.toString();
  return "login.html" + (qs ? "?" + qs : "");
}

function qxRequireLogin(view, payload) {
  if (!qxGuestTrialOk()) {
    finishRender(qxGuestTrialBlock());
    return false;
  }
  return true;
}

function qxIsExamComingSoon(key) {
  return !!(typeof EXAMS !== "undefined" && EXAMS[key] && EXAMS[key].isComingSoon);
}

function qxApplyUrlExam() {
  try {
    const urlExam = new URLSearchParams(location.search).get("exam");
    if (urlExam && typeof EXAMS !== "undefined" && EXAMS[urlExam]) {
      if (qxIsExamComingSoon(urlExam)) {
        // Class 9 & 10 locked — fall back to Engineering
        STATE.exam = "Engineering";
        localStorage.setItem("quantrex_exam", "Engineering");
        if (typeof showToast === "function") {
          setTimeout(() => showToast("📚 Class 9 & 10 is Coming Soon — switched to JEE"), 600);
        }
        return;
      }
      STATE.exam = urlExam;
      localStorage.setItem("quantrex_exam", urlExam);
    }
  } catch (e) { /* */ }
}

function qxUpdateAuthChrome() {
  const logoutBtn = document.getElementById("logoutBtn");
  const loginHint = document.getElementById("qxLoginHint");
  if (qxIsLoggedIn()) {
    if (loginHint) loginHint.classList.remove("show");
    if (logoutBtn) {
      logoutBtn.title = "Logout";
      logoutBtn.textContent = "👤";
      logoutBtn.onclick = async () => {
        if (typeof QuantrexDB !== "undefined" && QuantrexDB.signOut) await QuantrexDB.signOut();
        else localStorage.removeItem("quantrex_user");
        window.location.href = "app.html?exam=Engineering";
      };
    }
  } else {
    if (loginHint) loginHint.classList.add("show");
    if (logoutBtn) {
      logoutBtn.title = "Login with email to save progress";
      logoutBtn.textContent = "🔑";
      logoutBtn.onclick = () => { window.location.href = "login.html"; };
    }
  }
}

// ---------- Router ----------
const _qxHistoryViews = [];
let _qxHistoryIgnore = false;

function qxPushHistory(view, payload) {
  try {
    const hash = "#" + encodeURIComponent(view);
    if (!_qxHistoryIgnore) {
      history.pushState({ view, payload: payload || null, scroll: 0 }, "", hash);
    }
  } catch (_) { /* ignore */ }
}

function go(view, payload) {
  // Leaving a timed test: always save progress so student can resume
  if (currentView === "test" && view !== "test" && document.body.classList.contains("marks-test-active")) {
    if (!confirm("Leave this test? Your progress will be saved so you can resume later.")) return;
    try {
      if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.stopAndSave) {
        QuantrexTestEngine.stopAndSave();
        return;
      }
    } catch (e) { /* fall through */ }
  }
  if (currentView && currentView !== view) {
    _qxHistoryViews.push({ view: currentView, scroll: (document.getElementById("app-main") || {}).scrollTop || 0 });
    if (_qxHistoryViews.length > 40) _qxHistoryViews.shift();
  }
  currentView = view;
  if (view === "books" && typeof resetBooksCache === "function") resetBooksCache();
  const main = document.getElementById("app-main");
  if (main) main.scrollTop = 0;
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const navEl = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (navEl) navEl.classList.add("active");
  qxPushHistory(view, payload);
  render(view, payload);
}

window.addEventListener("popstate", (ev) => {
  const st = ev.state;
  if (currentView === "test" && document.body.classList.contains("marks-test-active")) {
    // Stay in test — push state back
    try { history.pushState({ view: "test" }, "", "#test"); } catch (_) { /* */ }
    return;
  }
  if (currentView === "question" && window._qxPracticeCtx) {
    // Prefer practice back (list) over leaving app
    try {
      _qxHistoryIgnore = true;
      if (typeof qxPracticeBack === "function") qxPracticeBack();
    } finally {
      _qxHistoryIgnore = false;
    }
    return;
  }
  const view = (st && st.view) || ((location.hash || "").replace(/^#/, "") || "dashboard");
  const payload = st && st.payload;
  _qxHistoryIgnore = true;
  try {
    currentView = view;
    const main = document.getElementById("app-main");
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    const navEl = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (navEl) navEl.classList.add("active");
    render(view, payload);
    if (main && st && st.scroll != null) {
      requestAnimationFrame(() => { main.scrollTop = st.scroll || 0; });
    }
  } finally {
    _qxHistoryIgnore = false;
  }
});

function finishRender(html) {
  if (typeof qxClearBlockingMount === "function") qxClearBlockingMount();
  const main = document.getElementById("app-main");
  main.innerHTML = html;
  document.getElementById("examPill").textContent = EXAMS[STATE.exam].name;
  bindDynamic();
  if (typeof bindMarksGo === "function") bindMarksGo(main);
  if (typeof bindCpyqbFilters === "function") bindCpyqbFilters(main);
  if (typeof bindMarksInfiniteScroll === "function") bindMarksInfiniteScroll(main);
  if (typeof bindBooksOpen === "function") bindBooksOpen(main);
  if (typeof bindQcExamples === "function") bindQcExamples(main);
  if (typeof bindDashHome === "function") bindDashHome(main);
  if (typeof QuantrexAssignments !== "undefined") QuantrexAssignments.bind(main);
  if (typeof QuantrexSearch !== "undefined") QuantrexSearch.bind(main);
  if (typeof MarksShell !== "undefined") {
    MarksShell.bind(main);
    MarksShell.initSidebar();
  }
  if (typeof QuantrexExamLogos !== "undefined") QuantrexExamLogos.loadExamIconsFromApi();
  const contentEl = document.querySelector(".content");
  if (contentEl) contentEl.classList.toggle("marks-wide", !!main.querySelector(".marks-split-layout"));
  if (typeof Mx !== "undefined") Mx.afterRender(main);
}

function render(view, payload) {
  if (view === "formula") {
    finishRender(`<div class="empty">Formula Cards are no longer available.</div>`);
    return;
  }
  const asyncMap = {
    dashboard: viewDashboard,
    cpyqb: viewCpyqb,
    allqs: viewAllQs,
    ncert: viewNcert,
    dpp: viewDppMarks,
    books: viewBooks,
    custom: typeof viewCustomTests === "function" ? viewCustomTests : null,
    pyqmock: typeof viewPyqMock === "function" ? viewPyqMock : null,
    testseries: typeof viewTestSeries === "function" ? viewTestSeries : null,
    quickconcepts: typeof viewQuickConcepts === "function" ? viewQuickConcepts : null,
    assignments: typeof viewAssignments === "function" ? viewAssignments : null,
    teacher: typeof viewTeacherPortal === "function" ? viewTeacherPortal : null,
    board: typeof viewBoardMarksBank === "function" ? viewBoardMarksBank : null,
    examinfo: typeof viewExamInfo === "function" ? viewExamInfo : null
  };
  if (asyncMap[view]) {
    finishRender(`<div class="empty">⏳ Loading…</div>`);
    asyncMap[view](payload).then(finishRender).catch((err) => {
      console.warn("View load failed:", view, err);
      const hint = view === "teacher"
        ? "Could not load teacher portal. <a href=\"login.html\">Sign in</a> or <a href=\"teacher-login.html\">teacher sign in</a>."
        : "Failed to load.";
      const detail = err && err.message ? `<p style="font-size:13px;color:var(--gray);margin-top:8px">${err.message}</p>` : "";
      finishRender(`<div class="empty">${hint}${detail} <button class="btn-soft" onclick="go('${view}')">Retry</button></div>`);
    });
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
function topbar(title, subtitle, navOpts) {
  const o = navOpts || {};
  const showNav = o.showNav !== false && (o.backView || o.exitView || o.backOnclick || o.exitOnclick);
  let nav = "";
  if (showNav) {
    const back = o.backOnclick
      ? `<button type="button" class="qx-nav-back" onclick="${o.backOnclick}">← ${o.backLabel || "Back"}</button>`
      : o.backView
        ? `<button type="button" class="qx-nav-back" onclick="go('${o.backView}'${o.backPayload ? "," + JSON.stringify(o.backPayload).replace(/"/g, "&quot;") : ""})">← ${o.backLabel || "Back"}</button>`
        : "";
    const exit = o.exitOnclick
      ? `<button type="button" class="qx-nav-exit" onclick="${o.exitOnclick}">${o.exitLabel || "Exit"}</button>`
      : o.exitView
        ? `<button type="button" class="qx-nav-exit" onclick="go('${o.exitView}')">${o.exitLabel || "Exit"}</button>`
        : "";
    if (back || exit) nav = `<div class="qx-folder-nav-actions" style="margin-bottom:10px">${back}${exit}</div>`;
  }
  return `<div class="page-head">
    ${nav}
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

  const guestBanner = typeof QuantrexGuestTrial !== "undefined" ? QuantrexGuestTrial.bannerHtml() : "";

  return `<div class="dash-marks-wrap">
    ${guestBanner}
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
      <div class="ds"><strong>${Object.keys(EXAMS[STATE.exam].subjects || {}).length || EXAMS[STATE.exam].subjects.length}</strong><small>Subjects</small></div>
    </div>
    ${todayDPP ? `<div class="dpp-banner" onclick="startDppSet('${todayDPP.id}')">
      <div class="dpp-banner-left">
        <span class="live-dot"></span>
        <div><strong>Today's DPP is Live</strong><small>${todayDPP.title}</small></div>
      </div>
      <span class="dpp-go">Start →</span>
    </div>` : ""}
    ${marksSections}
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
    }).catch(() => {
      practiceLoading = false;
      if (typeof showToast === "function") showToast("⚠️ Could not load question bank. Check connection and retry.");
      render("practice");
    });
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
  window._qxListQs = pageQs;
  setTimeout(() => qxBackgroundPrefetch(pageQs.map(q => q.id)), 0);

  const subjects = ["all", ...EXAMS[STATE.exam].subjects];
  const subjectChips = subjects.map(s =>
    `<button class="chip ${practiceFilter.subject === s ? 'active' : ''}" data-subject="${s}">${s === 'all' ? 'All Subjects' : s}</button>`
  ).join("");

  const chapters = practiceFilter.subject === "all" ? [] : (CHAPTERS[practiceFilter.subject] || []);
  const chapterChips = chapters.length ?
    `<div class="chips"><button class="chip ${practiceFilter.chapter==='all'?'active':''}" data-chapter="all">All Chapters</button>` +
    chapters.map(c => `<button class="chip ${practiceFilter.chapter===c?'active':''}" data-chapter="${c}">${c}</button>`).join("") + "</div>" : "";

  const list = pageQs.length ? pageQs.map(q => {
    const bm = typeof QuantrexBookmarks !== "undefined" ? QuantrexBookmarks.isBookmarked(q.id) : STATE.bookmarks.includes(q.id);
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

function qxHasSolution(q) {
  if (!q) return false;
  if (typeof MarksLive !== "undefined" && MarksLive.hasRealSolution) {
    return MarksLive.hasRealSolution(q.solution);
  }
  return !!String(q.solution || "").replace(/<[^>]+>/g, "").trim();
}

function qxHtmlContent(text) {
  return typeof Mx !== "undefined" ? Mx.html(text) : String(text || "");
}

function qxRace(promise, ms) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(null), ms || 20000))
  ]);
}

async function qxHydrateQuestion(q, toast) {
  if (!q || typeof MarksLive === "undefined" || !q._marksId) return q;
  // Cap retries — never hang the UI forever
  q._hydrateAttempts = (q._hydrateAttempts || 0) + 1;
  if (q._hydrateAttempts > 8) {
    // Only fail if still no renderable options
    const hasOpts = (q.options || []).some(o => {
      const s = String(o || "");
      if (/<img\b/i.test(s)) return true;
      const t = s.replace(/<[^>]+>/g, "").trim();
      return t.length > 0;
    });
    q._optsLoadFailed = !hasOpts;
    q._fullFetched = true;
    return q;
  }
  const optsReady = MarksLive.isOptionsReady && MarksLive.isOptionsReady(q);
  const needOpts = !optsReady && (
    MarksLive.needsFullQuestion(q)
    || (MarksLive.isOptionsIncomplete && MarksLive.isOptionsIncomplete(q))
    || MarksLive.isPlaceholderOptions && MarksLive.isPlaceholderOptions(q.options)
  );
  const needFig = MarksLive.questionNeedsFigure && MarksLive.questionNeedsFigure(q);
  const needSol = !qxHasSolution(q);
  // Options already good — do not block UI on figure/solution
  if (optsReady && !needFig && !needSol) {
    q._optsLoadFailed = false;
    q._fullFetched = true;
    return q;
  }
  if (!needOpts && !needFig && !needSol && q._fullFetched) return q;
  // Don't re-fetch forever just for missing solution once options are ready
  if (optsReady && !needFig && q._fullFetched) return q;
  if (toast) showToast("Loading question…");
  try {
    // Always force when options incomplete/stub
    const forceFetch = true;
    const updated = await qxRace(
      MarksLive.ensureQuestionFull(q, { force: forceFetch, solution: needSol || needOpts }),
      25000
    );
    if (updated) {
      if (needFig) updated._figureFetchAttempted = true;
      updated._hydrateAttempts = q._hydrateAttempts;
      const readyNow = MarksLive.isOptionsReady && MarksLive.isOptionsReady(updated);
      const hasAny = (updated.options || []).some(o => {
        const s = String(o || "");
        if (/<img\b/i.test(s)) return true;
        const t = s.replace(/<[^>]+>/g, "").trim();
        return t.length > 0 && !/^[ABCD]$/i.test(t);
      });
      if (readyNow || hasAny) {
        updated._optsLoadFailed = false;
        updated._fullFetched = true;
        updated._needsFull = false;
      } else if (q._hydrateAttempts >= 8) {
        updated._optsLoadFailed = true;
      }
      return updated;
    }
    // Timeout: only mark failed if options still missing after several tries
    q._figureFetchAttempted = true;
    if (q._hydrateAttempts >= 8 && !(MarksLive.isOptionsReady && MarksLive.isOptionsReady(q))) {
      q._optsLoadFailed = true;
    }
    return q;
  } catch (e) {
    q._figureFetchAttempted = true;
    if (q._hydrateAttempts >= 8 && !(MarksLive.isOptionsReady && MarksLive.isOptionsReady(q))) {
      q._optsLoadFailed = true;
    }
    return q;
  }
}

function qxPrepareFiguresFast(q) {
  if (!q || typeof QxImgClean === "undefined" || !QxImgClean.prepareQuestionFigures) return Promise.resolve();
  return qxRace(QxImgClean.prepareQuestionFigures(q), 600);
}

function qxRenderPracticeQuestion(id) {
  const main = document.getElementById("app-main");
  if (!main) return;
  try {
    main.classList.add("qx-font-host");
    main.innerHTML = viewQuestion(id);
    document.getElementById("examPill").textContent = EXAMS[STATE.exam].name;
    bindPracticeQuestion(main);
    if (typeof syncQuestionFontScale === "function") syncQuestionFontScale(main);
    else if (typeof applyTestFontScaleToDom === "function") applyTestFontScaleToDom(typeof getTestFontScale === "function" ? getTestFontScale() : "medium");
    if (typeof Mx !== "undefined") Mx.afterRender(main);
    const q = typeof getQ === "function" ? getQ(id) : null;
    if (q && typeof QxImgClean !== "undefined" && QxImgClean.scan) {
      setTimeout(() => QxImgClean.scan(main), 0);
    }
  } catch (e) {
    console.error("Practice render failed:", id, e);
    main.innerHTML = `<div class="empty" style="padding:48px;text-align:center">Could not open question. <button class="btn-soft" onclick="qxPracticeBack()">← Back</button></div>`;
  }
}

function qxBackgroundPrefetch(ids) {
  if (typeof MarksLive === "undefined" || !MarksLive.prefetchQuestions || !ids || !ids.length) return;
  const need = ids.filter(id => {
    const q = getQ(id);
    if (!q || !q._marksId) return false;
    if (MarksLive.needsFullQuestion(q)) return true;
    if (MarksLive.isOptionsIncomplete && MarksLive.isOptionsIncomplete(q)) return true;
    if (MarksLive.isQuestionIncomplete && MarksLive.isQuestionIncomplete(q)) return true;
    if (MarksLive.questionNeedsFigure && MarksLive.questionNeedsFigure(q)) return true;
    return false;
  });
  if (!need.length) return;
  MarksLive.prefetchQuestions(need).catch(() => {});
}

let _qxPracHydrateTimer = null;
window.qxRetryPracticeLoad = qxRetryPracticeLoad;
function qxPatchPracticeOpts(main, qid) {
  if (!main) return false;
  const q = getQ(qid);
  const optsEl = main.querySelector("#qaOpts");
  if (!q || !optsEl) return false;
  const pc = window._qxPracticeCtx || { selected: {}, done: {} };
  const sel = pc.selected[q.id];
  const done = !!pc.done[q.id];
  const optsClass = typeof QuantrexQFormat !== "undefined"
    ? QuantrexQFormat.practiceOptsContainerClass(q)
    : "qx-prac-opts";
  optsEl.className = optsClass;
  optsEl.innerHTML = typeof QuantrexQFormat !== "undefined"
    ? QuantrexQFormat.renderOptions(q, { selected: sel, done })
    : "";
  if (typeof QxImgClean !== "undefined" && QxImgClean.reinjectPinned) QxImgClean.reinjectPinned(main);
  if (typeof Mx !== "undefined") Mx.afterRender(optsEl);
  return true;
}

async function qxRetryPracticeLoad() {
  const ctx = window._qxPracticeCtx;
  if (!ctx || !ctx.ids.length) return;
  const qid = ctx.ids[ctx.idx];
  let q = getQ(qid);
  if (!q) { showToast("⚠️ Question not found"); return; }
  const main = document.getElementById("app-main");
  // Never wipe the whole practice UI — only patch options/question area
  if (main) {
    const optsEl = main.querySelector("#qaOpts");
    if (optsEl && !optsEl.querySelector(".mtk-opt, .qx-prac-opt")) {
      optsEl.innerHTML = `<div class="empty qx-load-opts" style="padding:20px">Loading options…</div>`;
    }
  }
  q = await qxHydrateQuestion(q, false);
  if (q && typeof QxImgClean !== "undefined" && QxImgClean.prepareQuestionFigures) {
    try {
      await Promise.race([
        QxImgClean.prepareQuestionFigures(q),
        new Promise(r => setTimeout(r, 800))
      ]);
    } catch (_) { /* continue */ }
  }
  if (!main) return;
  // Prefer in-place option patch; full re-render only if still missing structure
  if (qxPatchPracticeOpts(main, qid) && main.querySelector(".mtk-opt, .qx-prac-opt, .mtk-header")) {
    // Update question body if still loading text
    const loadQ = main.querySelector(".qx-load-q");
    if (loadQ && q && q.q) {
      main.innerHTML = viewQuestion(qid);
    }
    bindPracticeQuestion(main);
    if (typeof Mx !== "undefined") Mx.afterRender(main);
    else if (typeof QxImgClean !== "undefined" && QxImgClean.finalizeAll) QxImgClean.finalizeAll(main, q);
    return;
  }
  main.innerHTML = viewQuestion(qid);
  bindPracticeQuestion(main);
  if (typeof Mx !== "undefined") Mx.afterRender(main);
  else if (typeof QxImgClean !== "undefined" && QxImgClean.finalizeAll) QxImgClean.finalizeAll(main, q);
}

function qxSchedulePracticeHydrate(q) {
  clearTimeout(_qxPracHydrateTimer);
  if (!q || !q._marksId || typeof MarksLive === "undefined") return;
  if (q._optsLoadFailed || (q._hydrateAttempts || 0) >= 5) return;
  const needs = (MarksLive.isQuestionIncomplete && MarksLive.isQuestionIncomplete(q))
    || (MarksLive.isOptionsIncomplete && MarksLive.isOptionsIncomplete(q))
    || (MarksLive.questionNeedsFigure && MarksLive.questionNeedsFigure(q))
    || (MarksLive.needsFullQuestion && MarksLive.needsFullQuestion(q));
  if (!needs) return;
  _qxPracHydrateTimer = setTimeout(() => {
    const main = document.getElementById("app-main");
    const stuck = main && main.querySelector(".qx-load-opts, .qx-load-q");
    if (stuck && !q._optsLoadFailed) qxRetryPracticeLoad();
  }, 4000);
}

function enterAllenPracticeMode() {
  document.body.classList.add("allen-cbt-active", "allen-practice-active");
  const sidebar = document.getElementById("sidebar");
  const topbar = document.querySelector(".topbar");
  const mainEl = document.querySelector(".main");
  if (sidebar) sidebar.style.display = "none";
  if (topbar) topbar.style.display = "none";
  if (mainEl) mainEl.style.marginLeft = "0";
  if (typeof qxShowTestMount === "function") qxShowTestMount(document.getElementById("app-main"));
}

function exitAllenPracticeMode() {
  document.body.classList.remove("allen-cbt-active", "allen-practice-active");
  const sidebar = document.getElementById("sidebar");
  const topbar = document.querySelector(".topbar");
  const mainEl = document.querySelector(".main");
  if (sidebar) sidebar.style.display = "";
  if (topbar) topbar.style.display = "";
  if (mainEl) mainEl.style.marginLeft = "";
  if (typeof qxClearMountInlineStyles === "function") qxClearMountInlineStyles(document.getElementById("app-main"));
}

function openPracticeQuestion(id) {
  const list = window._qxListQs || [];
  const ids = list.length ? list.map(x => x.id) : [id];
  const idx = Math.max(0, ids.indexOf(id));
  window._qxPracticeCtx = {
    ids,
    idx,
    selected: {},
    done: {},
    returnView: currentView,
    listFn: typeof _lastListFn === "function" ? _lastListFn : null
  };
  if (typeof AllenTestUI !== "undefined") enterAllenPracticeMode();
  go("question", id);
  // Prefetch full Marks payloads for nearby questions (options + clean figures)
  if (typeof MarksLive !== "undefined" && MarksLive.prefetchQuestions) {
    const near = ids.slice(Math.max(0, idx - 1), Math.min(ids.length, idx + 6));
    MarksLive.prefetchQuestions(near).catch(() => {});
  }
  // Force hydrate current question immediately
  setTimeout(() => {
    const q = typeof getQ === "function" ? getQ(id) : null;
    if (q && q._marksId && typeof qxHydrateQuestion === "function") {
      qxHydrateQuestion(q, false).then(() => {
        if (window._qxPracticeCtx && String(window._qxPracticeCtx.ids[window._qxPracticeCtx.idx]) === String(id)) {
          qxRenderPracticeQuestion(id);
        }
      }).catch(() => {});
    }
  }, 30);
}

const QX_REPORT_TYPES = [
  { id: "wrong_answer", label: "Wrong answer key" },
  { id: "wrong_question", label: "Wrong question text" },
  { id: "wrong_options", label: "Wrong / missing options" },
  { id: "image_missing", label: "Image / diagram missing" },
  { id: "solution_wrong", label: "Solution incorrect" },
  { id: "other", label: "Other mistake" }
];

function qxCloseReportModal() {
  const el = document.getElementById("qxReportModal");
  if (el) el.remove();
}

function qxReportModalHtml(q) {
  const types = QX_REPORT_TYPES.map(t =>
    `<button type="button" class="qx-report-type" data-report-type="${t.id}">${t.label}</button>`
  ).join("");
  return `<div class="marks-modal-overlay" id="qxReportModal" onclick="if(event.target===this)qxCloseReportModal()">
    <div class="marks-modal qx-report-modal">
      <div class="marks-modal-head">
        <h3>Report Question</h3>
        <button type="button" class="marks-modal-clear" onclick="qxCloseReportModal()">✕</button>
      </div>
      <div class="marks-modal-body">
        <p class="qx-report-hint">Select mistake type (no name needed)</p>
        <div class="qx-report-types" id="qxReportTypes">${types}</div>
        <label class="qx-report-notes-label">Notes (optional)</label>
        <textarea class="qx-report-notes" id="qxReportNotes" rows="3" placeholder="Describe the issue…"></textarea>
      </div>
      <div class="marks-modal-foot">
        <button type="button" class="marks-modal-cancel" onclick="qxCloseReportModal()">Cancel</button>
        <button type="button" class="marks-modal-apply" id="qxReportSubmit">Submit Report</button>
      </div>
    </div>
  </div>`;
}

function qxBindReportModal(q) {
  let selected = null;
  document.querySelectorAll(".qx-report-type").forEach(btn => {
    btn.onclick = () => {
      selected = btn.dataset.reportType;
      document.querySelectorAll(".qx-report-type").forEach(b => b.classList.toggle("on", b === btn));
    };
  });
  const submit = document.getElementById("qxReportSubmit");
  if (submit) submit.onclick = () => qxSubmitQuestionReport(q, selected);
}

async function qxSubmitQuestionReport(q, type) {
  if (!type) {
    showToast("⚠️ Select mistake type first");
    return;
  }
  const notes = (document.getElementById("qxReportNotes")?.value || "").trim();
  const payload = {
    questionId: q.id,
    marksId: q._marksId || null,
    type,
    notes,
    subject: q.subject || "",
    chapter: q.chapter || "",
    source: q.source || q.paperSource || "",
    bank: q._bank || "",
    ts: Date.now()
  };
  try {
    const key = "quantrex_question_reports";
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    prev.push(payload);
    localStorage.setItem(key, JSON.stringify(prev.slice(-300)));
    if (typeof firebase !== "undefined" && firebase.firestore) {
      firebase.firestore().collection("question_reports").add(payload).catch(() => {});
    }
  } catch (e) { /* ignore */ }
  qxCloseReportModal();
  showToast("✅ Report submitted — thank you!");
}

function openQuestionReport(qid) {
  const q = getQ(qid);
  if (!q) { showToast("⚠️ Question not found"); return; }
  qxCloseReportModal();
  document.body.insertAdjacentHTML("beforeend", qxReportModalHtml(q));
  qxBindReportModal(q);
}

window.openQuestionReport = openQuestionReport;
window.qxCloseReportModal = qxCloseReportModal;

function qxPracticeBack() {
  exitAllenPracticeMode();
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
  const qid = ctx.ids[ctx.idx];
  qxRenderPracticeQuestion(qid);
  (async () => {
    try {
      let q = getQ(qid);
      if (!q) return;
      const needHydrate = q._marksId && typeof MarksLive !== "undefined" && (
        MarksLive.needsFullQuestion(q)
        || MarksLive.isQuestionIncomplete(q)
        || (MarksLive.isOptionsIncomplete && MarksLive.isOptionsIncomplete(q))
        || (MarksLive.questionNeedsFigure && MarksLive.questionNeedsFigure(q))
      );
      if (needHydrate) q = await qxHydrateQuestion(q, false) || q;
      await qxPrepareFiguresFast(q);
      if (currentView === "question" && ctx.idx === ctx.ids.indexOf(qid)) {
        qxRenderPracticeQuestion(qid);
      }
    } catch (_) {
      if (currentView === "question") qxRenderPracticeQuestion(qid);
    }
  })();
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
  const bm = typeof QuantrexBookmarks !== "undefined" ? QuantrexBookmarks.isBookmarked(q.id) : STATE.bookmarks.includes(q.id);
  const sv = STATE.solved.find(s => s.id === q.id);
  const subjTag = (q.subject || "").toLowerCase().replace(/\s+/g, "-");
  const sourceLabel = typeof QuantrexStrip !== "undefined"
    ? QuantrexStrip.sourceLabel(q)
    : (q._book && typeof bookQuestionLabel === "function" ? bookQuestionLabel(q) : (q.source || ""));
  const sourceLogo = typeof QuantrexExamLogos !== "undefined" ? QuantrexExamLogos.forQuestion(q) : "";
  const done = !!pc.done[q.id];
  const sel = pc.selected[q.id];

  const incomplete = typeof MarksLive !== "undefined" && MarksLive.isQuestionIncomplete
    ? MarksLive.isQuestionIncomplete(q)
    : false;
  const qType = typeof QuantrexQFormat !== "undefined" ? QuantrexQFormat.getType(q) : "singleCorrect";
  const isNumType = qType === "numerical" || qType === "subjective";

  // Can we show options right now? (text and/or images) — never hide real options behind "could not load"
  function qxOptsRenderable(qq) {
    const opts = (qq && qq.options) || [];
    if (!opts.length) return false;
    return opts.some(o => {
      const s = String(o || "");
      if (/<img\b/i.test(s)) return true;
      const t = s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      // Letter A–D is a valid choice (structures/divisions labeled in stem)
      return t.length > 0;
    });
  }

  let optsIncomplete = !isNumType && !incomplete && typeof MarksLive !== "undefined" && MarksLive.isOptionsIncomplete
    ? MarksLive.isOptionsIncomplete(q)
    : false;
  // Hard guard only for MCQ when truly empty — letter A–D options are OK
  if (!isNumType && !optsIncomplete && !incomplete && !qxOptsRenderable(q)) {
    const optsArr = q.options || [];
    const plain = optsArr.map(o => String(o || "").replace(/<[^>]+>/g, "").trim());
    if (!plain.length || plain.every(t => !t)) {
      optsIncomplete = true;
    }
  }
  // Digital books: never block on infinite hydrate for offline packs
  if (q._book || q._bookId) {
    if (qxOptsRenderable(q) || ((q.options || []).length >= 2)) {
      optsIncomplete = false;
      q._optsLoadFailed = false;
    }
  }
  if (isNumType || qxOptsRenderable(q)) {
    optsIncomplete = false;
    q._optsLoadFailed = false;
  }
  const optsFailed = !isNumType && !!(q._optsLoadFailed || (q._hydrateAttempts || 0) >= 8);
  const qTypeBadge = typeof QuantrexQFormat !== "undefined" ? QuantrexQFormat.typeBadgeHtml(q) : "";
  let opts;
  // Numerical / integer → always show centered number box (never "options could not load")
  if (isNumType && typeof QuantrexQFormat !== "undefined") {
    opts = QuantrexQFormat.renderOptions(q, { selected: sel, done });
  } else if (qxOptsRenderable(q) && typeof QuantrexQFormat !== "undefined") {
    opts = QuantrexQFormat.renderOptions(q, { selected: sel, done });
  } else if (incomplete || (optsIncomplete && !optsFailed)) {
    opts = `<div class="empty qx-load-opts" style="padding:20px">Loading options… <button type="button" class="btn-soft sm" onclick="qxRetryPracticeLoad()">Retry</button></div>`;
  } else if (optsIncomplete && optsFailed) {
    opts = `<div class="empty qx-load-opts" style="padding:20px">Options could not load. <button type="button" class="btn-primary sm" onclick="(function(){const q=getQ(${JSON.stringify(String(q.id))});if(q){q._hydrateAttempts=0;q._optsLoadFailed=false;q._fullFetched=false;q._needsFull=true;}qxRetryPracticeLoad();})()">Retry load</button></div>`;
  } else if (typeof QuantrexQFormat !== "undefined") {
    opts = QuantrexQFormat.renderOptions(q, { selected: sel, done });
  } else {
    opts = "";
  }
  const optsClass = typeof QuantrexQFormat !== "undefined"
    ? QuantrexQFormat.practiceOptsContainerClass(q)
    : "qx-prac-opts";
  const canSubmit = typeof QuantrexQFormat !== "undefined"
    ? QuantrexQFormat.isAnswered(q, sel)
    : sel != null;

  if (typeof QxImgClean !== "undefined") {
    if (QxImgClean.rememberQuestionRaw) QxImgClean.rememberQuestionRaw(q);
    else if (QxImgClean.pinQuestionHtml) QxImgClean.pinQuestionHtml(q.id, q.q);
  }

  let diagramSlot = "";
  let qBody;
  if (incomplete) {
    qBody = `<div class="empty qx-load-q" style="padding:20px 0">Loading question text… <button type="button" class="btn-soft sm" onclick="qxRetryPracticeLoad()">Retry</button></div>`;
  } else if (typeof QxImgClean !== "undefined" && QxImgClean.buildQuestionBodyHtml) {
    const renderQ = typeof Mx !== "undefined" ? Mx.html : (t => t);
    qBody = QxImgClean.buildQuestionBodyHtml(q.id, q.q, renderQ, q);
    diagramSlot = "";
  } else if (typeof QxImgClean !== "undefined" && QxImgClean.buildDiagramSlotHtml) {
    diagramSlot = QxImgClean.buildDiagramSlotHtml(q.id, q.q, q);
    const split = QxImgClean.splitQuestionHtml(q.q, q.id);
    const hasSlotFig = diagramSlot && /qx-pool-fig|cdn-question-pool|\/pyq\/|assets\/diagrams/i.test(diagramSlot);
    const qText = hasSlotFig ? (split.text || q.q) : q.q;
    qBody = typeof Mx !== "undefined" ? Mx.html(qText) : qText;
  } else {
    qBody = typeof Mx !== "undefined" ? Mx.html(q.q) : q.q;
  }

  const resultHtml = done ? qxPracticeResultHtml(q, sel) : "";
  const hasSol = qxHasSolution(q);
  const solReveal = (window._qxSolRevealed && window._qxSolRevealed[q.id]) ? qxSolutionBlockHtml(q) : "";

  setTimeout(() => {
    loadCommunityForQuestion(q);
    const needFig = !!(q._marksId && MarksLive.questionNeedsFigure && MarksLive.questionNeedsFigure(q));
    const needFull = !!(q._marksId && MarksLive.needsFullQuestion && MarksLive.needsFullQuestion(q));
    if ((incomplete || optsIncomplete || needFig || needFull) && q._marksId && !optsFailed) {
      qxHydrateQuestion(q, false).then(hq => {
        if (!hq) return;
        const main = document.getElementById("app-main");
        if (!main) return;
        const ctx = window._qxPracticeCtx;
        const sameQ = ctx && String(ctx.ids[ctx.idx]) === String(q.id);
        if (!sameQ) return;
        // Full re-render when figure/options/text may have changed
        const stillLoad = !!main.querySelector(".qx-load-opts, .qx-load-q");
        const gotFig = MarksLive.hasPoolFigureInHtml
          ? MarksLive.hasPoolFigureInHtml(hq.q)
          : /cdn-question-pool|\/pyq\//i.test(String(hq.q || ""));
        if (stillLoad || needFig || needFull || gotFig || !(MarksLive.isOptionsReady && MarksLive.isOptionsReady(hq))) {
          qxRenderPracticeQuestion(q.id);
        } else if (MarksLive.isOptionsReady && MarksLive.isOptionsReady(hq)) {
          qxPatchPracticeOpts(main, q.id);
        } else {
          qxRenderPracticeQuestion(q.id);
        }
      }).catch(() => {
        if (!(MarksLive.isOptionsReady && MarksLive.isOptionsReady(q))) {
          q._optsLoadFailed = true;
        }
        if (window._qxPracticeCtx) qxRenderPracticeQuestion(q.id);
      });
    } else if (!optsFailed) {
      qxSchedulePracticeHydrate(q);
    }
  }, 0);

  // ExamGoal / ExamSIDE-style paper · date · shift line
  const paperMeta = typeof QuantrexStrip !== "undefined" && QuantrexStrip.paperMetaHtml
    ? QuantrexStrip.paperMetaHtml(q)
    : (sourceLabel
      ? `<div class="qx-paper-meta"><div class="qx-paper-meta-chips"><span class="qx-paper-chip qx-paper-full">${String(sourceLabel).replace(/</g, "&lt;")}</span></div></div>`
      : "");

  if (typeof AllenTestUI !== "undefined") {
    return AllenTestUI.practiceHtml(q, pc, {
      typeBadge: qTypeBadge,
      paperMeta,
      diagramSlot,
      qBody,
      optsClass,
      opts,
      incomplete,
      canSubmit,
      solActions: hasSol && !done ? `<div class="qx-sol-actions"><button type="button" class="mtk-btn mtk-btn-ghost qx-view-sol-btn" id="qxViewSolBtn">💡 View Solution</button></div>` : "",
      solReveal,
      resultHtml,
      community: ""
    });
  }

  const fontScale = typeof getTestFontScale === "function" ? getTestFontScale() : "medium";
  const fontLbl = fontScale === "xlarge" ? "XL" : (fontScale.charAt(0).toUpperCase() + fontScale.slice(1));
  return `<div class="qx-practice-page qx-font-host" data-font-scale="${fontScale}">
    <header class="qx-prac-bar">
      <button type="button" class="qx-prac-back" onclick="qxPracticeBack()">←</button>
      <div class="qx-prac-mid">
        <strong>Q${pos} <span class="qx-prac-of">/ ${total}</span></strong>
        <small>${q.chapter || q.subject}</small>
      </div>
      <div class="qx-prac-actions">
        <button type="button" class="qx-prac-icon qx-font-btn" onclick="typeof bumpTestFont==='function'&&bumpTestFont(-1)" title="Decrease text size">A−</button>
        <span class="qx-font-lbl" id="qxFontLbl" title="Text size">${fontLbl}</span>
        <button type="button" class="qx-prac-icon qx-font-btn" onclick="typeof bumpTestFont==='function'&&bumpTestFont(1)" title="Increase text size">A+</button>
        <button type="button" class="qx-prac-icon ${bm ? "on" : ""}" onclick="toggleBm(${q.id})" title="Save bookmark (exam · subject · topic)">${bm ? "🔖" : "🤍"}</button>
        <button type="button" class="qx-prac-icon" onclick="toggleBmWithGroup(${q.id})" title="Save to group">📁</button>
        <button type="button" class="qx-prac-icon" onclick="openQuestionReport(${q.id})" title="Report mistake">🚩</button>
      </div>
    </header>
    <div class="qx-prac-meta">
      ${qTypeBadge}
      <span class="tag tag-${subjTag}">${q.subject}</span>
      <span class="tag tag-diff">${q.difficulty || "Medium"}</span>
      <span class="tag qx-src-tag" title="${sourceLabel}">${sourceLogo}<span>${typeof QuantrexStrip !== "undefined" ? QuantrexStrip.tagLabel(sourceLabel) : sourceLabel}</span></span>
      ${sv ? `<span class="tag ${sv.correct ? "tag-ok" : "tag-no"}">${sv.correct ? "✓ Solved" : "✗ Wrong"}</span>` : ""}
    </div>
    ${paperMeta}
    ${diagramSlot}
    ${String(qBody || "").includes("qx-question-body")
      ? qBody
      : `<div class="qx-prac-q qx-content qx-q-text-only" data-qx-qid="${q.id}">${qBody}</div>`}
    <div class="${optsClass}" id="qaOpts">${opts}</div>
    ${hasSol && !done ? `<div class="qx-sol-actions"><button type="button" class="btn-soft qx-view-sol-btn" id="qxViewSolBtn">💡 View Solution</button></div>` : ""}
    <div id="qaSolReveal">${solReveal}</div>
    <div id="qaResult">${resultHtml}</div>
    <div class="qx-prac-foot">
      <button type="button" class="btn-soft" onclick="qxPracticeNav(-1)" ${pc.idx <= 0 ? "disabled" : ""}>← Previous</button>
      ${done || incomplete ? "" : `<button type="button" class="btn-primary qx-prac-submit" id="qxPracSubmit" ${canSubmit ? "" : "disabled"}>Submit Answer</button>`}
      <button type="button" class="btn-soft" onclick="qxPracticeNav(1)" ${pc.idx >= total - 1 ? "disabled" : ""}>Next →</button>
    </div>
  </div>`;
}

function qxSolutionBlockHtml(q) {
  if (!qxHasSolution(q)) return "";
  if (typeof QuantrexSolution !== "undefined") {
    return `<div class="result-box ok qx-sol-reveal-box">${QuantrexSolution.renderBlock(q)}</div>`;
  }
  let solHtml = typeof Mx !== "undefined" ? Mx.html(q.solution) : q.solution;
  if (typeof QuantrexSolution !== "undefined" && QuantrexSolution.cleanSolutionFigHtml) {
    solHtml = QuantrexSolution.cleanSolutionFigHtml(solHtml);
  }
  return `<div class="result-box ok qx-sol-reveal-box">
    <strong>💡 Solution</strong>
    <div class="qx-content sol-body">${solHtml}</div>
  </div>`;
}

function qxPracticeResultHtml(q, sel) {
  const graded = typeof QuantrexQFormat !== "undefined"
    ? QuantrexQFormat.grade(q, sel)
    : { correct: sel === q.answer, partial: false };
  const { correct, partial } = graded;
  const ansLabel = typeof QuantrexQFormat !== "undefined"
    ? QuantrexQFormat.formatCorrectAnswer(q)
    : "";
  const solBlock = qxHasSolution(q) ? qxSolutionBlockHtml(q) : "";
  const title = correct ? "✅ Correct!" : (partial ? "⚠️ Partially Correct" : "❌ Incorrect");
  const boxCls = correct ? "ok" : (partial ? "partial" : "no");
  return `<div class="qx-prac-result-wrap">
    <div class="result-box ${boxCls}">
      <strong>${title}</strong>
      ${!correct ? `<p class="qx-prac-correct-ans">Correct answer: <span class="qx-content">${ansLabel}</span></p>` : ""}
      ${!solBlock ? `<p class="qx-no-sol-note">Solution not available for this question.</p>` : ""}
    </div>
    ${solBlock}
  </div>`;
}

function bindPracticeQuestion(root) {
  const scope = root || document.getElementById("app-main");
  if (!scope) return;
  const ctx = window._qxPracticeCtx;
  const qid = ctx && ctx.ids[ctx.idx];
  if (typeof AllenTestUI !== "undefined") {
    AllenTestUI.bindPractice(scope, {
      onBack: qxPracticeBack,
      onNav: (d) => qxPracticeNav(d),
      onJump: (idx) => {
        if (!ctx || idx < 0 || idx >= ctx.ids.length) return;
        ctx.idx = idx;
        const main = document.getElementById("app-main");
        main.innerHTML = viewQuestion(ctx.ids[idx]);
        bindPracticeQuestion(main);
        if (typeof syncQuestionFontScale === "function") syncQuestionFontScale(main);
        if (typeof Mx !== "undefined") Mx.afterRender(main);
      }
    });
  }
  if (typeof QuantrexQFormat !== "undefined") {
    QuantrexQFormat.bindPractice(scope, ctx, qid, answerQ);
  } else {
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
  const viewSol = scope.querySelector("#qxViewSolBtn");
  if (viewSol) viewSol.onclick = () => qxRevealSolution(qid);
}

function qxRevealSolution(qid) {
  const q = getQ(qid);
  if (!q || !qxHasSolution(q)) {
    // Jovi professor mode — instant step-by-step when bank has no solution
    if (q && typeof Jovi !== "undefined" && Jovi.onPracticeWrong) {
      showToast("🤖 Jovi is solving this for you…");
      Jovi.onPracticeWrong(q, null);
      return;
    }
    showToast("⚠️ No solution available for this question");
    return;
  }
  window._qxSolRevealed = window._qxSolRevealed || {};
  window._qxSolRevealed[qid] = true;
  const el = document.getElementById("qaSolReveal");
  if (el) {
    el.innerHTML = qxSolutionBlockHtml(q);
    if (typeof Mx !== "undefined") Mx.afterRender(el);
  }
  const btn = document.getElementById("qxViewSolBtn");
  if (btn) btn.remove();
}

async function loadCommunityForQuestion(q) {
  // Community solutions UI removed — hide any leftover container
  const el = document.getElementById("qaCommunity");
  if (el) {
    el.innerHTML = "";
    el.style.display = "none";
  }
}

async function answerQ(qid, response) {
  if (response == null) return;
  if (typeof QuantrexQFormat !== "undefined" && !QuantrexQFormat.isAnswered(getQ(qid), response)) return;
  let q = getQ(qid);
  if (!q) return;
  if (q && q._marksId) {
    q = await qxHydrateQuestion(q, false);
    const solBad = qxHasSolution(q) && typeof QuantrexSolution !== "undefined"
      && QuantrexSolution.solutionLooksRelevant
      && !QuantrexSolution.solutionLooksRelevant(q, q.solution);
    if (solBad && typeof MarksLive !== "undefined") {
      q = await MarksLive.ensureQuestionFull(q, { force: true, solution: true });
    }
  }
  const ctx = window._qxPracticeCtx || { done: {}, selected: {} };
  ctx.done[qid] = true;
  ctx.selected[qid] = response;
  const main = document.getElementById("app-main");
  const solActs = main.querySelector(".qx-sol-actions");
  if (solActs) solActs.remove();
  const solReveal = document.getElementById("qaSolReveal");
  if (solReveal) solReveal.innerHTML = "";
  const graded = typeof QuantrexQFormat !== "undefined"
    ? QuantrexQFormat.applyPracticeResult(main, q, response)
    : { correct: response === q.answer, partial: false };
  STATE.markSolved(qid, graded.correct || graded.partial);
  const res = document.getElementById("qaResult");
  if (res) {
    res.innerHTML = qxPracticeResultHtml(q, response);
    if (typeof Mx !== "undefined") Mx.afterRender(res);
  }
  const sub = main.querySelector("#qxPracSubmit");
  if (sub) sub.remove();
  // Auto-trigger Jovi when wrong + no official solution (professor mode)
  if (!(graded.correct || graded.partial) && !qxHasSolution(q) && typeof Jovi !== "undefined" && Jovi.onPracticeWrong) {
    setTimeout(() => {
      try { Jovi.onPracticeWrong(q, response); } catch (e) { /* */ }
    }, 500);
  } else if (typeof Jovi !== "undefined" && Jovi.injectInlineAsk) {
    setTimeout(() => { try { Jovi.injectInlineAsk(main); } catch (e) { /* */ } }, 300);
  }
}

// toggleBm, viewNotebook — bookmarks.js

// DPP & Formula views are in marks-features.js (viewDppMarks, viewFormulaMarks)

function toggleFcBm(id) {
  const fid = "f" + id;
  let added;
  if (typeof QuantrexBookmarks !== "undefined") {
    added = QuantrexBookmarks.toggle(fid, QuantrexBookmarks.metaFromQuestion(fid));
  } else {
    const had = STATE.bookmarks.includes(fid);
    STATE.toggleBookmark(fid);
    added = !had;
  }
  showToast(added ? "🔖 Formula saved!" : "Removed");
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
  const loggedIn = qxIsLoggedIn();
  let userName = "Guest";
  try {
    const u = JSON.parse(localStorage.getItem("quantrex_user") || "null");
    if (u && (u.name || u.email || u.phone)) userName = u.name || u.email || u.phone;
  } catch (e) { /* */ }
  const guestDays = typeof QuantrexGuestTrial !== "undefined" ? QuantrexGuestTrial.daysLeft() : 7;
  const authBlock = loggedIn
    ? ""
    : `<p style="color:var(--gray);margin:12px 0 18px">Free trial · <strong>${guestDays} day${guestDays === 1 ? "" : "s"}</strong> left · full access, no login</p>`;

  return `${topbar("Profile", loggedIn ? "Your learning journey" : "Guest mode — full access during trial")}
  <div class="profile-card">
    <div class="prof-av" style="background:${exam.color}">${loggedIn ? "You" : "👋"}</div>
    <h2>${loggedIn ? userName : "Guest Student"}</h2>
    ${authBlock}
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
    ${Object.entries(EXAMS).map(([k,e]) => {
      const soon = !!e.isComingSoon;
      return `<button class="exam-opt ${STATE.exam===k?'active':''} ${soon?'soon':''}" style="${STATE.exam===k?'border-color:'+e.color:''}${soon?';opacity:.72':''}" onclick="switchExam('${k}')" ${soon?'title="Coming Soon"':''}>
        <span class="exam-opt-ic" style="background:${e.color}">${k==='Engineering'?'⚙️':k==='Medical'?'⚕️':'📚'}</span>
        <strong>${e.name}${soon?' · Soon':''}</strong>
      </button>`;
    }).join("")}
  </div>
  <div class="danger-zone">
    <button class="btn-soft danger" onclick="resetData()">🗑️ Reset All Progress</button>
  </div>`;
}

function switchExam(key) {
  if (qxIsExamComingSoon(key)) {
    showToast("📚 Class 9 & 10 is Coming Soon");
    return;
  }
  STATE.exam = key;
  localStorage.setItem("quantrex_exam", key);
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
    localStorage.removeItem("quantrex_bookmarks_v2");
    showToast("🗑️ All progress reset");
    go("dashboard");
  }
}

// ---------- Toast ----------
let toastTimer;
function showToast(msg) {
  if (typeof QuantrexStrip !== "undefined") msg = QuantrexStrip.toastText(msg);
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
let _qxBooted = false;
let _qxAuthResolved = false;

function qxShowBootLoading() {
  const main = document.getElementById("app-main");
  if (main && !main.innerHTML.trim()) {
    main.innerHTML = '<div class="empty">⏳ Loading dashboard…</div>';
  }
}

function qxScheduleBoot() {
  if (_qxBooted) return;
  _qxBooted = true;
  bootApp();
}

function bootApp() {
  qxApplyUrlExam();
  if (typeof QuantrexGuestTrial !== "undefined") QuantrexGuestTrial.ensureStart();
  if (typeof qxForceResetShell === "function") qxForceResetShell({ clearContent: false });
  else if (typeof qxClearBlockingMount === "function") qxClearBlockingMount();
  if (typeof QuantrexTheme !== "undefined") QuantrexTheme.init();
  document.querySelectorAll(".nav-item").forEach(n => {
    n.onclick = () => {
      const v = n.dataset.view;
      if (v === "cpyqb") go(v, { step: "exams", forceExamList: true });
      else if (v === "teacher" && typeof QuantrexAssignments !== "undefined" && QuantrexAssignments.openTeacherPortal) {
        QuantrexAssignments.openTeacherPortal();
      } else go(v);
    };
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
  window.qxCloseSidebar = function qxCloseSidebar() {
    const sb = document.querySelector(".sidebar");
    if (sb) sb.classList.remove("open");
    document.body.classList.remove("qx-nav-open");
  };
  document.getElementById("navToggle").onclick = () => {
    const sb = document.querySelector(".sidebar");
    if (!sb) return;
    const open = !sb.classList.contains("open");
    sb.classList.toggle("open", open);
    document.body.classList.toggle("qx-nav-open", open);
  };
  document.body.addEventListener("click", (e) => {
    if (!document.body.classList.contains("qx-nav-open")) return;
    if (e.target.closest(".sidebar") || e.target.closest("#navToggle")) return;
    qxCloseSidebar();
  });
  document.querySelectorAll(".nav-item").forEach(n => {
    n.addEventListener("click", () => {
      if (window.innerWidth <= 860) qxCloseSidebar();
    });
  });
  const searchBtn = document.getElementById("searchBtn");
  if (searchBtn) searchBtn.onclick = () => typeof QuantrexSearch !== "undefined" ? QuantrexSearch.openOverlay() : go("search");
  qxUpdateAuthChrome();
  if (typeof QxPerf !== "undefined") {
    QxPerf.prefetchPrimaryBank();
    QxPerf.onIdle(() => QxPerf.lazyImages(document));
  }
  const hash = (location.hash || "").replace("#", "").trim();
  if (hash.startsWith("teacher")) {
    const teachTab = hash.split("/")[1] || "builder";
    localStorage.setItem("qx_teacher_tab", teachTab);
    go("teacher");
  } else if (hash === "assignments") go("assignments");
  else if (hash === "custom") go("custom", { step: "landing" });
  else if (hash === "pyqmock") go("pyqmock", { step: "exams" });
  else go("dashboard");
}

document.addEventListener("DOMContentLoaded", () => {
  qxShowBootLoading();

  if (typeof QuantrexDB === "undefined" || !QuantrexDB.init()) {
    qxScheduleBoot();
    return;
  }

  let _qxSyncRenderTimer = null;
  QuantrexDB.onDataChange = () => {
    const pill = document.getElementById("examPill");
    const pillTop = document.getElementById("examPillTop");
    if (pill) pill.textContent = EXAMS[STATE.exam].name;
    if (pillTop) pillTop.textContent = EXAMS[STATE.exam].name;
    if (currentView === "question" || currentView === "test") return;
    if (document.body.classList.contains("allen-practice-active") || document.body.classList.contains("marks-test-active")) return;
    clearTimeout(_qxSyncRenderTimer);
    _qxSyncRenderTimer = setTimeout(() => {
      if (!currentView || currentView === "question" || currentView === "test") return;
      if (document.body.classList.contains("allen-practice-active") || document.body.classList.contains("marks-test-active")) return;
      render(currentView);
    }, 700);
  };

  const authTimeout = setTimeout(() => {
    if (_qxAuthResolved || _qxBooted) return;
    console.warn("Quantrex: auth timeout — booting with local data");
    qxScheduleBoot();
  }, 2800);

  QuantrexDB.watchAuth((user, loggedIn) => {
    _qxAuthResolved = true;
    clearTimeout(authTimeout);

    if (loggedIn && user) {
      if (localStorage.getItem("quantrex_exam")) {
        const saved = localStorage.getItem("quantrex_exam");
        STATE.exam = qxIsExamComingSoon(saved) ? "Engineering" : saved;
        if (qxIsExamComingSoon(saved)) localStorage.setItem("quantrex_exam", "Engineering");
      }
      const name = user.displayName || user.email || "Student";
      showToast("🔥 Firebase DB connected · Welcome, " + name);
      QuantrexDB.seedAppMeta().catch(() => {});
      if (typeof QuantrexPayments !== "undefined") QuantrexPayments.handleReturnQuery().catch(() => {});
      qxScheduleBoot();
    } else {
      const cached = JSON.parse(localStorage.getItem("quantrex_user") || "null");
      if (cached && cached.phone && !cached.uid) {
        qxScheduleBoot();
      } else if (cached && cached.uid) {
        qxScheduleBoot();
      } else {
        qxScheduleBoot();
      }
    }
  });
});

// override go() to handle test/question pseudo views
const _origGo = go;
go = function(view, payload) {
  currentView = view;
  if (view !== "test" && view !== "question" && !qxGuestTrialOk()) {
    finishRender(qxGuestTrialBlock());
    return;
  }
  if (view !== "test" && view !== "question" && !qxRequireLogin(view, payload)) return;
  const main = document.getElementById("app-main");
  main.scrollTop = 0;
  _listPage = 1;
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const navMap = { allqs: "allqs", ncert: "allqs", board: "allqs", cpyqb: "cpyqb", books: "books", tests: "tests", custom: "tests", testseries: "tests", pyqmock: "tests", analytics: "analytics", search: "search", quickconcepts: "quickconcepts", premium: "premium", assignments: "dashboard", teacher: "dashboard" };
  const navView = navMap[view] || view;
  const navEl = document.querySelector(`.nav-item[data-view="${navView}"]`);
  if (navEl) navEl.classList.add("active");

  if (view !== "test" && view !== "question" && typeof qxClearBlockingMount === "function") {
    qxClearBlockingMount();
    document.body.classList.remove("allen-cbt-active", "allen-practice-active", "marks-instr-active");
  }

  if (view === "question") {
    qxRenderPracticeQuestion(payload);
    (async () => {
      try {
        let q = getQ(payload);
        if (!q) return;
        const needHydrate = q._marksId && typeof MarksLive !== "undefined" && (
          MarksLive.needsFullQuestion(q)
          || MarksLive.isQuestionIncomplete(q)
          || (MarksLive.isOptionsIncomplete && MarksLive.isOptionsIncomplete(q))
          || (MarksLive.questionNeedsFigure && MarksLive.questionNeedsFigure(q))
        );
        if (needHydrate) q = await qxHydrateQuestion(q, false) || q;
        await qxPrepareFiguresFast(q);
        if (currentView === "question") {
          qxRenderPracticeQuestion(payload);
          const main = document.getElementById("app-main");
          if (main && typeof QxImgClean !== "undefined" && QxImgClean.scan) QxImgClean.scan(main);
        }
        const q2 = getQ(payload);
        const stillNeed = q2 && typeof MarksLive !== "undefined" && (
          MarksLive.isQuestionIncomplete(q2)
          || (MarksLive.isOptionsIncomplete && MarksLive.isOptionsIncomplete(q2))
        );
        if (stillNeed) {
          await qxHydrateQuestion(q2, false);
          if (currentView === "question") qxRenderPracticeQuestion(payload);
        }
      } catch (_) {
        if (currentView === "question") qxRenderPracticeQuestion(payload);
      }
    })();
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
