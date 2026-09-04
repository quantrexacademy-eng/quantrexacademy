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
  if (typeof QuantrexGuestTrial !== "undefined" && QuantrexGuestTrial.ensureStart) {
    QuantrexGuestTrial.ensureStart();
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
    const params = new URLSearchParams(location.search);
    const urlExam = params.get("exam");
    const bank = params.get("bank");
    if (urlExam && typeof EXAMS !== "undefined" && EXAMS[urlExam]) {
      if (qxIsExamComingSoon(urlExam)) {
        STATE.exam = "Engineering";
        localStorage.setItem("quantrex_exam", "Engineering");
      } else {
        STATE.exam = urlExam;
        localStorage.setItem("quantrex_exam", urlExam);
      }
    }
    // Deep-link from login orbit: open specific PYQ bank (subjects list)
    if (bank) {
      try {
        localStorage.setItem("quantrex_bank", bank);
        if (typeof _currentBankSlug !== "undefined") _currentBankSlug = bank;
      } catch (_) { /* */ }
      // Infer track from bank if exam not set
      if (!urlExam || !EXAMS[urlExam]) {
        if (/^neet|aiims|jipmer/i.test(bank)) {
          STATE.exam = "Medical";
          localStorage.setItem("quantrex_exam", "Medical");
        } else if (/^nda/i.test(bank)) {
          STATE.exam = "Defence";
          localStorage.setItem("quantrex_exam", "Defence");
        } else {
          STATE.exam = "Engineering";
          localStorage.setItem("quantrex_exam", "Engineering");
        }
      }
    }
    const open = (params.get("open") || params.get("view") || "").toLowerCase();
    const step = params.get("step") || "subjects";
    if (open === "cpyqb" && bank) {
      window._qxUrlCpyqb = { step: step, exam: bank, forceExamList: false };
    }
  } catch (e) { /* */ }
}

/** ?question=76353 deep-link (screenshot 687) — also support hash #question/id */
function qxUrlQuestionId() {
  try {
    const q = new URLSearchParams(location.search).get("question");
    if (q && String(q).trim()) return String(q).trim();
  } catch (_) { /* */ }
  return null;
}

function qxUpdateAuthChrome() {
  try {
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.grantIfOwner) QuantrexAccess.grantIfOwner();
  } catch (_) {}
  try {
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.paintLocks) QuantrexAccess.paintLocks();
  } catch (_) {}
  if (typeof QxProfile !== "undefined" && QxProfile.mountChrome) QxProfile.mountChrome();
  const loginHint = document.getElementById("qxLoginHint");
  if (loginHint) loginHint.classList.toggle("show", !qxIsLoggedIn());
}

function qxSyncPaidAccess() {
  try {
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.grantIfOwner) QuantrexAccess.grantIfOwner();
  } catch (_) {}
  let user = null;
  try { user = JSON.parse(localStorage.getItem("quantrex_user") || "null"); } catch (_) { user = null; }
  const uid = user && user.uid && String(user.uid).indexOf("guest_") !== 0 ? user.uid : "";
  const done = function () {
    try { if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.paintLocks) QuantrexAccess.paintLocks(); } catch (_) {}
    try { if (typeof QxProfile !== "undefined" && QxProfile.mountChrome) QxProfile.mountChrome(); } catch (_) {}
  };
  if (!uid || typeof QuantrexDB === "undefined" || !QuantrexDB.getSubscription) {
    try {
      if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.applyRemoteSub && !(QuantrexAccess.isAdmin && QuantrexAccess.isAdmin())) {
        QuantrexAccess.applyRemoteSub({ active: false });
      }
    } catch (_) {}
    done();
    return;
  }
  QuantrexDB.getSubscription(uid).then(done).catch(done);
}

// ---------- Router ----------
const _qxHistoryViews = [];
let _qxHistoryIgnore = false;

/** Build deep-link hash so refresh stays on the same page */
function qxBuildHash(view, payload) {
  const v = String(view || "dashboard");
  if (v === "question" && payload != null && payload !== "") {
    return "#question/" + encodeURIComponent(String(payload));
  }
  if (v === "test") return "#test";
  if (v === "teacher") {
    const tab = localStorage.getItem("qx_teacher_tab") || "builder";
    return "#teacher/" + encodeURIComponent(tab);
  }
  if (v === "custom" && payload && payload.step) {
    if (payload.step === "take" && payload.share) {
      return "#custom/take/" + payload.share;
    }
    return "#custom/" + encodeURIComponent(String(payload.step));
  }
  if (v === "pyqmock" && payload && payload.step) {
    // Preserve exam/year so refresh/back never opens a blank PYQ mock page
    const parts = ["pyqmock", String(payload.step)];
    if (payload.exam) parts.push(String(payload.exam));
    if (payload.year) parts.push(String(payload.year));
    if (payload.module) parts.push(String(payload.module));
    return "#" + parts.map(x => encodeURIComponent(x)).join("/");
  }
  if (v === "flashcards" && payload && typeof payload === "object") {
    try {
      return "#flashcards/" + encodeURIComponent(JSON.stringify(payload));
    } catch (_) {
      return "#flashcards";
    }
  }
  if (v === "books" && payload != null && payload !== "") {
    if (typeof payload === "object") {
      try {
        return "#books/" + encodeURIComponent(JSON.stringify(payload));
      } catch (_) {
        return "#books";
      }
    }
    return "#books/" + encodeURIComponent(String(payload));
  }
  return "#" + encodeURIComponent(v);
}

function qxPersistRoute(view, payload) {
  try {
    const snap = {
      view: String(view || "dashboard"),
      payload: payload == null ? null : payload,
      exam: (typeof STATE !== "undefined" && STATE.exam) || localStorage.getItem("quantrex_exam") || "Engineering",
      practice: null,
      t: Date.now()
    };
    if (view === "question" && window._qxPracticeCtx) {
      const pc = window._qxPracticeCtx;
      snap.practice = {
        ids: (pc.ids || []).slice(0, 500),
        idx: pc.idx || 0,
        returnView: pc.returnView || "dashboard"
      };
    }
    sessionStorage.setItem("qx_route_v1", JSON.stringify(snap));
  } catch (_) { /* quota / private mode */ }
}

function qxPushHistory(view, payload) {
  try {
    const hash = qxBuildHash(view, payload);
    if (!_qxHistoryIgnore) {
      history.pushState({ view, payload: payload || null, scroll: 0 }, "", hash);
    } else {
      // still update URL when restoring so refresh works
      try {
        if (location.hash !== hash) history.replaceState({ view, payload: payload || null, scroll: 0 }, "", hash);
      } catch (__) { /* */ }
    }
    qxPersistRoute(view, payload);
  } catch (_) { /* ignore */ }
}

/** Parse location.hash + session into { view, payload } for boot / popstate */
function qxParseRouteFromLocation() {
  const raw = (location.hash || "").replace(/^#/, "").trim();
  // Permanent (687): ?question=ID works even without hash (user bookmarks / share links)
  const urlQ = typeof qxUrlQuestionId === "function" ? qxUrlQuestionId() : null;
  if (!raw && urlQ) {
    window._qxPracticeCtx = {
      ids: [urlQ],
      idx: 0,
      selected: {},
      done: {},
      returnView: "dashboard",
      listFn: null
    };
    return { view: "question", payload: urlQ };
  }
  if (!raw) {
    // Login orbit deep-link: app.html?open=cpyqb&bank=jee_main&step=subjects
    if (window._qxUrlCpyqb && window._qxUrlCpyqb.exam) {
      const p = window._qxUrlCpyqb;
      window._qxUrlCpyqb = null;
      try {
        const u = new URL(location.href);
        u.searchParams.delete("open");
        u.searchParams.delete("view");
        u.searchParams.delete("bank");
        u.searchParams.delete("step");
        history.replaceState(null, "", u.pathname + u.search + (u.hash || ""));
      } catch (_) { /* */ }
      return { view: "cpyqb", payload: p };
    }
    try {
      const s = JSON.parse(sessionStorage.getItem("qx_route_v1") || "null");
      if (s && s.view && (Date.now() - (s.t || 0)) < 7 * 24 * 3600 * 1000) {
        if (s.exam && typeof STATE !== "undefined") {
          try { STATE.exam = s.exam; localStorage.setItem("quantrex_exam", s.exam); } catch (_) { /* */ }
        }
        if (s.view === "question" && s.practice && s.practice.ids && s.practice.ids.length) {
          window._qxPracticeCtx = {
            ids: s.practice.ids,
            idx: Math.min(s.practice.idx || 0, s.practice.ids.length - 1),
            selected: {},
            done: {},
            returnView: s.practice.returnView || "dashboard",
            listFn: null
          };
          return { view: "question", payload: s.practice.ids[window._qxPracticeCtx.idx] };
        }
        return { view: s.view, payload: s.payload };
      }
    } catch (_) { /* */ }
    return { view: "dashboard", payload: null };
  }
  const parts = raw.split("/").map(p => {
    try { return decodeURIComponent(p); } catch (_) { return p; }
  });
  const head = (parts[0] || "dashboard").toLowerCase();
  if (head === "question" && parts[1]) {
    // Restore practice list from session if available
    try {
      const s = JSON.parse(sessionStorage.getItem("qx_route_v1") || "null");
      if (s && s.practice && Array.isArray(s.practice.ids) && s.practice.ids.length) {
        window._qxPracticeCtx = {
          ids: s.practice.ids,
          idx: Math.max(0, s.practice.ids.indexOf(parts[1])),
          selected: {},
          done: {},
          returnView: s.practice.returnView || "dashboard",
          listFn: null
        };
        if (window._qxPracticeCtx.idx < 0) {
          window._qxPracticeCtx.ids = [parts[1]];
          window._qxPracticeCtx.idx = 0;
        }
      } else {
        window._qxPracticeCtx = {
          ids: [parts[1]],
          idx: 0,
          selected: {},
          done: {},
          returnView: "dashboard",
          listFn: null
        };
      }
    } catch (_) {
      window._qxPracticeCtx = { ids: [parts[1]], idx: 0, selected: {}, done: {}, returnView: "dashboard", listFn: null };
    }
    return { view: "question", payload: parts[1] };
  }
  if (head === "teacher") {
    if (parts[1]) localStorage.setItem("qx_teacher_tab", parts[1]);
    return { view: "teacher", payload: null };
  }
  if (head === "custom") {
    if (parts[1] === "take" && parts[2]) {
      return { view: "custom", payload: { step: "take", share: parts.slice(2).join("/") } };
    }
    return { view: "custom", payload: { step: parts[1] || "landing" } };
  }
  if (head === "pyqmock") {
    const pl = { step: parts[1] || "exams" };
    if (parts[2]) pl.exam = parts[2];
    if (parts[3]) pl.year = parts[3];
    if (parts[4]) pl.module = parts[4];
    return { view: "pyqmock", payload: pl };
  }
  if (head === "flashcards") {
    let fp = { step: "subjects" };
    if (parts[1]) {
      try { fp = JSON.parse(parts[1]); } catch (_) { fp = { step: "subjects" }; }
    }
    if (!fp || typeof fp !== "object") fp = { step: "subjects" };
    return { view: "flashcards", payload: fp };
  }
  if (head === "books") {
    let bp = parts[1] || null;
    if (bp && (bp.startsWith("{") || bp.startsWith("["))) {
      try { bp = JSON.parse(bp); } catch (_) { /* keep string */ }
    }
    if (bp === "[object Object]") bp = null;
    return { view: "books", payload: bp };
  }
  if (head === "test") return { view: "test", payload: null };
  // Known SPA views
  const known = new Set([
    "dashboard", "allqs", "ncert", "board", "cpyqb", "books", "tests", "custom",
    "testseries", "pyqmock", "analytics", "search", "quickconcepts", "premium",
    "assignments", "teacher", "question", "test", "bookmarks", "wrong", "profile", "settings",
    "flashcards", "formula", "dpp", "revision"
  ]);
  if (known.has(head)) return { view: head, payload: parts[1] || null };
  return { view: "dashboard", payload: null };
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
  // Sanitize CPYQB payloads so exam tiles (TS EAMCET, etc.) always open subjects
  if (view === "cpyqb" && payload && typeof payload === "object") {
    payload = { ...payload };
    if (payload.exam && payload.forceExamList !== true && payload.step !== "exams") {
      payload.forceExamList = false;
      if (!payload.step) payload.step = "subjects";
    }
    if (payload.forceExamList === true && !payload.exam) {
      payload.step = "exams";
      delete payload.subject;
      delete payload.chapter;
    }
  }
  if (currentView && currentView !== view) {
    _qxHistoryViews.push({ view: currentView, scroll: (document.getElementById("app-main") || {}).scrollTop || 0 });
    if (_qxHistoryViews.length > 40) _qxHistoryViews.shift();
  }
  currentView = view;
  try { document.body.setAttribute("data-qx-view", String(view || "")); } catch (_) { /* */ }
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
  if (!main) return;
  main.innerHTML = html;
  try {
    const examName = (typeof EXAMS !== "undefined" && EXAMS[STATE.exam] && EXAMS[STATE.exam].name) || "Quantrex";
    const pill = document.getElementById("examPill");
    if (pill) pill.textContent = examName;
  } catch (_) { /* */ }
  if (typeof qxSyncTopExamBar === "function") qxSyncTopExamBar();
  bindDynamic();
  if (typeof bindMarksGo === "function") bindMarksGo(main);
  if (typeof bindCpyqbFilters === "function") bindCpyqbFilters(main);
  if (typeof bindMarksInfiniteScroll === "function") bindMarksInfiniteScroll(main);
  if (typeof bindBooksOpen === "function") bindBooksOpen(main);
  if (typeof bindQcExamples === "function") bindQcExamples(main);
  if (typeof bindDashHome === "function") bindDashHome(main);
  if (typeof qxFillStudentDesk === "function") {
    try { qxFillStudentDesk(main); } catch (_) { /* */ }
  }
  try { if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.paintLocks) QuantrexAccess.paintLocks(document); } catch (_) {}
  if (typeof QuantrexAssignments !== "undefined") QuantrexAssignments.bind(main);
  if (typeof QuantrexSearch !== "undefined") QuantrexSearch.bind(main);
  if (typeof MarksShell !== "undefined") {
    MarksShell.bind(main);
    MarksShell.initSidebar();
  }
  // Heavy / optional work after paint
  const afterPaint = () => {
    if (typeof QuantrexExamLogos !== "undefined") {
      try { QuantrexExamLogos.loadExamIconsFromApi(); } catch (_) { /* */ }
    }
    if (typeof QxPerf !== "undefined") {
      try {
        QxPerf.lazyImages(main);
        QxPerf.smoothPaint(document.querySelector(".content") || main);
      } catch (_) { /* */ }
    }
    try {
      if (window.lucide && lucide.createIcons) lucide.createIcons();
    } catch (_) { /* */ }
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => setTimeout(afterPaint, 0));
  } else {
    setTimeout(afterPaint, 0);
  }
  const contentEl = document.querySelector(".content");
  if (contentEl) contentEl.classList.toggle("marks-wide", !!main.querySelector(".marks-split-layout"));
  // Skip heavy MathJax on big question lists — typeset first few only
  if (typeof Mx !== "undefined") {
    const list = main.querySelector("#marksQList, .q-list");
    const listCount = list ? list.querySelectorAll(".q-card, .q-text").length : 0;
    if (listCount > 12) {
      setTimeout(() => {
        try {
          const cards = main.querySelectorAll(".q-card .q-text, .q-text.qx-content");
          const slice = Array.prototype.slice.call(cards, 0, 6);
          slice.forEach(el => { try { Mx.afterRender(el); } catch (_) { /* */ } });
        } catch (_) { /* */ }
      }, 80);
    } else if (listCount > 0 || main.querySelector(".mtk-q-text, .qx-content, .qa-wrap")) {
      // Yield before full typeset so UI remains interactive
      setTimeout(() => {
        try { Mx.afterRender(main); } catch (_) { /* */ }
      }, 16);
    }
  }
}

function render(view, payload) {
  if (typeof QuantrexAccess !== "undefined" && !QuantrexAccess.allow(view, payload)) {
    finishRender(QuantrexAccess.paywallHtml(view, payload));
    return;
  }
  const asyncMap = {
    dashboard: viewDashboard,
    cpyqb: viewCpyqb,
    allqs: viewAllQs,
    ncert: viewNcert,
    dpp: viewDppMarks,
    formula: typeof viewFormulaMarks === "function" ? viewFormulaMarks : null,
    flashcards: typeof viewRfcMarks === "function" ? viewRfcMarks : null,
    revision: typeof viewRevisionMarks === "function" ? viewRevisionMarks : null,
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
    // Drop stale async paints when user clicks another exam quickly
    window._qxRenderSeq = (window._qxRenderSeq || 0) + 1;
    const seq = window._qxRenderSeq;
    finishRender(qxLoadLogoHtml("Opening your Academy desk…"));
    asyncMap[view](payload).then((html) => {
      if (seq !== window._qxRenderSeq) return;
      finishRender(html);
    }).catch((err) => {
      if (seq !== window._qxRenderSeq) return;
      console.warn("View load failed:", view, err);
      const msg = String((err && err.message) || "");
      const isBankJson = /JSON|question bank|invalid|delimiter|property value/i.test(msg);
      const hint = view === "teacher"
        ? "Could not load teacher portal. <a href=\"login.html\">Sign in</a> or <a href=\"teacher-login.html\">teacher sign in</a>."
        : isBankJson
          ? "Question bank could not load. Tap Retry (fixed data is live)."
          : "Failed to load.";
      // Never dump raw JSON parse stack positions to students
      const friendly = isBankJson
        ? "If this keeps happening, hard-refresh the page (Ctrl+Shift+R)."
        : (msg ? msg.replace(/</g, "&lt;").slice(0, 180) : "");
      const detail = friendly
        ? `<p style="font-size:13px;color:var(--gray);margin-top:8px">${friendly}</p>`
        : "";
      finishRender(`<div class="empty">${hint}${detail} <button class="btn-primary sm" onclick="location.reload()">Retry</button></div>`);
    });
    return;
  }
  const map = {
    practice: viewPractice,
    tests: viewTests,
    leaderboard: () => qxLoadLogoHtml("Loading leaderboard…"),
    notebook: viewNotebook,
    profile: viewProfile,
    settings: (typeof viewSettings === 'function' ? viewSettings : (typeof QxSettings !== 'undefined' ? QxSettings.view : function () { return '<div class="empty">Settings loading…</div>'; })),
    analytics: () => typeof QuantrexAnalytics !== "undefined" ? QuantrexAnalytics.viewAnalytics() : '<div class="empty">Analytics loading…</div>',
    search: () => typeof QuantrexSearch !== "undefined" ? QuantrexSearch.viewSearch() : '<div class="empty">Search unavailable</div>',
    premium: viewPremium
  };
  if (view === "leaderboard" && typeof QuantrexLeaderboard !== "undefined") {
    finishRender(qxLoadLogoHtml("Loading leaderboard…"));
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
  if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.ALL_COURSES_FREE) {
    sub = QuantrexAccess.paidSub() || { active: true, planId: "all_free" };
  } else if (user && user.uid && typeof QuantrexDB !== "undefined") {
    sub = await QuantrexDB.getSubscription(user.uid);
  }
  if (typeof QuantrexPremium === "undefined") {
    return topbar("Premium", "") + '<div class="empty">Premium module loading…</div>';
  }
  const html = topbar(
    QuantrexAccess && QuantrexAccess.ALL_COURSES_FREE ? "All courses" : "Premium Plans",
    QuantrexAccess && QuantrexAccess.ALL_COURSES_FREE ? "Everything is free — no subscription" : "Unlock all 127k+ questions & features"
  ) + QuantrexPremium.render(user, sub);
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
  const exam = (typeof EXAMS !== "undefined" && EXAMS[STATE.exam]) ? EXAMS[STATE.exam] : { name: "JEE Main & Advanced", subjects: ["Physics", "Chemistry", "Mathematics"] };
  const solved = (STATE && STATE.solved) || [];
  const correct = solved.filter(s => s.correct).length;
  const accuracy = solved.length ? Math.round(correct / solved.length * 100) : 0;
  const name = typeof dashUserName === "function" ? dashUserName() : "Student";
  const initial = typeof dashUserInitial === "function" ? dashUserInitial() : "S";

  const todayDPP = (typeof DPPS !== "undefined" && Array.isArray(DPPS))
    ? DPPS.filter(d => d.date === "Today")[0]
    : null;
  // Medical home paints immediately (same as Engineering desk). Do not wait on Marks APIs.
  let marksSections = "";
  if (STATE.exam === "Medical" && typeof renderMedicalMarksHomeExtras === "function") {
    try { marksSections = renderMedicalMarksHomeExtras() || ""; } catch (_) { marksSections = ""; }
  } else if (typeof marksDashboardSections === "function") {
    try {
      marksSections = await Promise.race([
        marksDashboardSections(),
        new Promise((resolve) => setTimeout(() => resolve(""), 8000))
      ]);
      if (marksSections == null) marksSections = "";
    } catch (e) {
      marksSections = "";
    }
  }

  const guestBanner = typeof QuantrexGuestTrial !== "undefined" ? QuantrexGuestTrial.bannerHtml() : "";

  return `<div class="dash-marks-wrap qx-home">
    ${guestBanner}
    <div class="dash-greet-bar qx-hero">
      <div class="dash-greet-left">
        <div class="dash-avatar">${initial}</div>
        <div>
          <h1>Hey, ${name}!</h1>
          <p>${exam.name}</p>
        </div>
      </div>
      ${qxDashPlanChip()}
    </div>
    <div class="dash-stats dash-stats-compact">
      <div class="ds"><strong>${solved.length}</strong><small>Solved</small></div>
      <div class="ds"><strong>${accuracy}%</strong><small>Accuracy</small></div>
      <div class="ds"><strong>${(STATE.bookmarks && STATE.bookmarks.length) || 0}</strong><small>Bookmarks</small></div>
      <div class="ds"><strong>${Array.isArray(exam.subjects) ? exam.subjects.length : Object.keys(exam.subjects || {}).length}</strong><small>Subjects</small></div>
    </div>
    ${todayDPP ? `<div class="dpp-banner" onclick="startDppSet('${todayDPP.id}')">
      <div class="dpp-banner-left">
        <span class="live-dot"></span>
        <div><strong>Today's DPP is live</strong><small>${qxCleanDppTitle(todayDPP.title)}</small></div>
      </div>
      <span class="dpp-go">Start →</span>
    </div>` : ""}
    ${marksSections}
  </div>`;
}


function qxCleanDppTitle(s) {
  let t = String(s || "");
  t = t.replace(/\s*Ã[\s\S]{0,48}?\s*/g, " ");
  t = t.replace(/\s*â€.?\s*/g, " ");
  t = t.replace(/\s{2,}/g, " ").trim();
  if (typeof qxDppMeta === "function") {
    const meta = qxDppMeta({ title: t });
    const subj = (t.match(/^(Chemistry|Physics|Mathematics|Maths|Biology|Botany|Zoology)/i) || [])[1];
    return (subj ? subj + " · " : "") + meta.title;
  }
  return t || "Today's DPP";
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
  // Prefer live bank over Coming Soon empty classes
  const liveBanks = banks.filter(([, b]) => !b.isComingSoon && (b.count || 0) > 0);
  const activeSlug = _currentBankSlug
    || (liveBanks[0] && liveBanks[0][0])
    || (banks[0] && banks[0][0]);

  // Anti-hang: never download full JEE/NEET bank on Practice tab
  if (typeof qxIsLargeBank === "function" && activeSlug && qxIsLargeBank(activeSlug) && !_banksLoaded[activeSlug]) {
    return `${topbar("Question Bank (PYQ)", "Chapter-wise practice")}
      <div class="empty" style="padding:40px;text-align:center;max-width:480px;margin:24px auto">
        <p style="font-weight:700;margin-bottom:10px">Use Chapter-wise PYQ (instant)</p>
        <p style="color:var(--gray);font-size:14px;margin-bottom:18px">Full bank is too large to load at once (causes freeze). Open by subject → chapter instead.</p>
        <button type="button" class="btn-primary" onclick="go('cpyqb',{step:'exams',forceExamList:true})">Open PYQ Bank →</button>
      </div>`;
  }

  if (practiceLoading) {
    return `${topbar("Question Bank (PYQ)", "Loading questions…")}${qxLoadLogoHtml("Loading question bank…")}`;
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
    return `${topbar("Question Bank (PYQ)", "Loading questions…")}${qxLoadLogoHtml("Loading " + (meta ? meta.title : "bank") + "…")}`;
  }

  const bankPicker = banks.length ? `<div class="bank-picker">
    <label>Exam Paper</label>
    <select id="bankSelect">${banks.map(([slug, b]) => {
      const soon = b.isComingSoon ? " · Coming Soon" : "";
      const cnt = (b.count || 0).toLocaleString();
      return `<option value="${slug}" ${slug === activeSlug ? "selected" : ""} ${b.isComingSoon ? "disabled" : ""}>${b.title} (${cnt})${soon}</option>`;
    }).join("")}</select>
  </div>` : "";

  // Match by bank slug and/or exam track (Academic / Defence / Engineering / Medical)
  let qs = QUESTIONS.filter(q => {
    if (_currentBankSlug && q._bank !== _currentBankSlug) return false;
    if (q.exam === STATE.exam) return true;
    // Legacy Foundation → Academic
    if (STATE.exam === "Academic" && (q.exam === "Foundation" || q._bank === "class_9" || String(q._bank || "").startsWith("class_"))) return true;
    if (STATE.exam === "Defence" && (q.exam === "NDA" || q._bank === "nda")) return true;
    return false;
  });
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
        ${typeof qxDifficultyTag === "function" ? qxDifficultyTag(q) : ""}
        ${sv ? `<span class="tag ${sv.correct?'tag-ok':'tag-no'}">${sv.correct?'✓ Correct':'✗ Wrong'}</span>` : ''}
      </div>
      <div class="q-text qx-content">${typeof Mx!=="undefined"?Mx.html(q.q):q.q}</div>
      <div class="q-footer"><small>📖 ${q.chapter || ""}${q.chapter && q.source ? " · " : ""}📌 ${q.source || ""}</small><span class="bm">${bm ? '🔖' : '🤍'}</span></div>
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

/** True if option HTML is real (not empty / not pure A–D letter stub, including MathML A/B/C/D). */
function qxIsFigureStubText(o) {
  const t = String(o || "")
    .replace(/<img\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\$/g, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return !t || /^(figure|fig\.?|diagram|image|structure|photo)$/i.test(t);
}

function qxOptionHasRealFigure(o) {
  const s = String(o || "");
  if (!/<img\b/i.test(s)) return false;
  if (/\b(?:alt|title)\s*=\s*["'][^"']*\b(?:figure|fig\.?|diagram|image)\b/i.test(s)) return false;
  if (/\/(?:ic_)?(?:figure|fig)(?:[_-]?(?:placeholder|stub|icon|label|mark))?s?\.(?:png|jpe?g|gif|svg|webp)/i.test(s)) return false;
  const w = s.match(/\bwidth\s*[:=]\s*["']?(\d+)/i) || s.match(/\bwidth\s*:\s*(\d+)px/i);
  if (w && parseInt(w[1], 10) > 0 && parseInt(w[1], 10) < 140) return false;
  return /cdn-question-pool|cdn\.quizrr|\/pyq\/|proxy-image|restore-image|assets\/(?:diagrams|qx-figures|books|clean-diagrams)|watermark_improved|watermarked_images/i.test(s)
    && /watermark_improved|watermarked_images|28S2_o_|qx-org-|qx-figures|AKCR2_|2026_modules|\/pyq\//i.test(s);
}

function qxOptionHasContent(o) {
  const s = String(o || "");
  if (qxOptionHasRealFigure(s)) return true;
  if (/smiles/i.test(s) && s.length > 8) return true;
  if (qxIsFigureStubText(s)) return false;
  const t = s
    .replace(/<[^>]+>/g, "")
    .replace(/\$/g, "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return false;
  // Pure letter stubs (A) / A / MathML A — not real options
  if (/^[ABCD]$/i.test(t)) return false;
  if (/^\(?[ABCD]\)?$/i.test(t)) return false;
  return t.length > 0;
}

/** True if UI can show answer controls (MCQ choices or numerical box). */
function qxHasRenderableOpts(q) {
  if (!q) return false;
  let t = "";
  if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType) {
    try { t = QuantrexQFormat.getType(q); } catch (_) { /* */ }
  }
  if (t === "numerical" || t === "subjective") return true;
  if (typeof MarksLive !== "undefined" && MarksLive.isNumericalQuestion && MarksLive.isNumericalQuestion(q)) {
    return true;
  }
  const opts = q.options || [];
  return opts.some(qxOptionHasContent);
}

/** Rank Booster / book packs: options are only A–D letters with no stem figure → content missing */
function qxBookOptionsBroken(q) {
  if (!q || !(q._book || q._bookId)) return false;
  // Black Book page scans + subjective page packs — intentionally no MCQ options
  let t = "";
  try {
    if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType) t = QuantrexQFormat.getType(q);
  } catch (_) { /* */ }
  if (t === "subjective" || /subjective/i.test(String(q.questionType || q.type || ""))) return false;
  if (/bb-page-img|black-book-pages|bb-page-wrap/i.test(String(q.q || ""))) return false;
  const opts = q.options || [];
  if (!opts.length) {
    // Stem is a full page / figure study question — not broken
    if (/<img\b/i.test(String(q.q || ""))) return false;
    return true;
  }
  if (opts.some(o => /<img\b|smiles/i.test(String(o || "")))) return false;
  const plain = opts.map(o => String(o || "").replace(/<[^>]+>/g, "").replace(/\$/g, "").trim());
  const allLetters = plain.length >= 2 && plain.every(t => /^[A-D]$/i.test(t) || !t);
  if (!allLetters) return false;
  // Stem already has structures / labeled figure → letter choices are intentional
  if (/<img\b/i.test(String(q.q || ""))) return false;
  return true;
}

/** True if we still need Marks/network to load real options or numerical answer key. */
function qxNeedsOptionsLoad(q) {
  if (!q) return false;
  // Digital books: only network-fill when option pack is broken (letter stubs, no figure)
  if (q._book || q._bookId) {
    if (!qxBookOptionsBroken(q)) return false;
    if (q._optsLoadFailed && (q._hydrateAttempts || 0) >= 3) return false;
    // Prefer marksId; fall back to numeric bank id (Marks sometimes uses it)
    if (!q._marksId && q.id != null && /^\d{5,}$/.test(String(q.id))) {
      q._marksId = String(q.id);
    }
    if (!q._marksId) return false;
    return !q._marksFillTried || !qxHasRenderableOpts(q);
  }
  if (!q._marksId) return false;
  if (q._optsLoadFailed && (q._hydrateAttempts || 0) >= 4) return false;
  let t = "";
  try {
    if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType) t = QuantrexQFormat.getType(q);
  } catch (_) { /* */ }
  if (t === "numerical" || t === "subjective"
    || (typeof MarksLive !== "undefined" && MarksLive.isNumericalQuestion && MarksLive.isNumericalQuestion(q))) {
    const cv = q.correctValue;
    if (q._marksFillTried && cv != null && String(cv).trim() !== "") return false;
    if (q._marksFillTried && (cv == null || String(cv).trim() === "")) return false; // one try
    return cv == null || String(cv).trim() === "";
  }
  // Marks student runtime is off — catalog/Firebase only, never spin on empty A–D
  if (typeof MarksLive !== "undefined" && MarksLive.STUDENT_MARKS_RUNTIME === false) {
    if (q._catalogTried || q._marksFillTried || q._fullFetched || q._optsLoadFailed) return false;
  }
  // MCQ: keep loading until real content exists — never stop early on empty A–D boxes
  const opts = q.options || [];
  const hasMcq = opts.some(qxOptionHasContent);
  if (hasMcq) return false;
  if (typeof MarksLive !== "undefined") {
    if (MarksLive.isPlaceholderOptions && MarksLive.isPlaceholderOptions(opts)) return true;
    if (MarksLive.isOptionsIncomplete && MarksLive.isOptionsIncomplete(q)) return true;
  }
  if (!opts.length) return !q._marksFillTried;
  // Tried once but still empty → allow one more via retry button only
  return !q._marksFillTried;
}

/** Pull options from QUESTIONS bank master (if already shipped with figures). */
function qxFindBankQuestion(q) {
  if (!q) return null;
  if (q._qxBankOptions && q._qxBankOptions.some(qxOptionHasRealFigure)) return q;
  try {
    if (typeof getQ === "function") {
      const byId = q.id != null ? getQ(q.id) : null;
      if (byId && byId !== q && (byId._qxBankOptions || byId.options)) return byId;
    }
    if (q._marksId && typeof QUESTIONS !== "undefined") {
      const hit = QUESTIONS.find(x => x && x !== q && String(x._marksId) === String(q._marksId)
        && (x._qxBankOptions || (x.options || []).some(qxOptionHasRealFigure)));
      if (hit) return hit;
    }
  } catch (_) { /* */ }
  return null;
}

function qxUpgradeFigureStubs(q) {
  if (!q) return q;
  const bank = qxFindBankQuestion(q) || q;
  const master = (bank._qxBankOptions && bank._qxBankOptions.length)
    ? bank._qxBankOptions
    : ((bank.options || []).some(qxOptionHasRealFigure) ? bank.options : null);
  if (!master || !master.length) return q;
  if (!q._qxBankOptions) q._qxBankOptions = master.slice();
  const cur = q.options || [];
  const next = master.map((b, i) => {
    const o = cur[i];
    if (qxOptionHasRealFigure(b) && (!o || qxIsFigureStubText(o) || !qxOptionHasRealFigure(o))) return b;
    return o != null ? o : b;
  });
  q.options = next;
  q._optsLoadFailed = false;
  q._optsLoadStartedAt = 0;
  return q;
}

function qxMathWeight(s) {
  const t = String(s || "");
  return (t.match(/\$/g) || []).length + (t.match(/\\[a-zA-Z]+/g) || []).length;
}

function qxStemLooksGutted(s) {
  const raw = String(s || "");
  const t = raw.replace(/<img\b[^>]*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (/\bLet\s*[.,;:]?\s*(Consider|Then|the following)\b/i.test(t)) return true;
  if (/\bLet\s+\.\s/i.test(t)) return true;
  if (/^Let\s*\.\s/i.test(t)) return true;
  return false;
}

function qxRestoreQuestionContent(q) {
  if (!q) return q;
  try {
    const master = q._qxBankOptions;
    if (master && master.length) {
      const cur = q.options || [];
      const curGood = cur.some((o) => {
        const raw = String(o || "");
        if (/<img\b/i.test(raw) || /\$|\\binom|\^\{|C_\{/.test(raw)) return true;
        const t = raw.replace(/<[^>]+>/g, "").trim();
        return t.length > 1 && !/^[A-D]$/i.test(t);
      });
      if (!curGood) q.options = master.slice();
    }
  } catch (_) { /* */ }
  try {
    if (window.QxImgClean && typeof QxImgClean.ensureIrodovStem === "function") {
      QxImgClean.ensureIrodovStem(q);
    }
  } catch (_) { /* */ }
  const hasFig = (s) => /<img\b/i.test(String(s || "")) && /cdn-question-pool|cdn\.quizrr|\/pyq\/|2026_modules|modules\/ms|proxy-image|assets\/(?:diagrams|qx-figures)|watermark_improved|AKCR2_/i.test(String(s || ""));
  const stub = (s) => {
    const t = String(s || "").replace(/<img\b[^>]*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (hasFig(s)) return false;
    return !t || /^(figure|fig\.?|diagram|image|structure|photo)$/i.test(t);
  };
  const bank = (typeof qxFindBankQuestion === "function" ? qxFindBankQuestion(q) : null) || q;
  try {
    if (window.QxImgClean && typeof QxImgClean.pinOriginalQuestion === "function") {
      QxImgClean.pinOriginalQuestion(q);
      if (bank && bank !== q) QxImgClean.pinOriginalQuestion(bank);
    }
  } catch (_) { /* */ }
  const pinned = q._qxOrigStem || q._qxBankQ || bank._qxOrigStem || bank._qxBankQ || (bank !== q ? bank.q : "");
  if (pinned) {
    const cur = String(q.q || "");
    const matchScore = (s) => {
      const t = String(s || "");
      let n = 0;
      if (/<table/i.test(t)) n += 8;
      if (/List[\s\-]*I/i.test(t)) n += 4;
      if (/List[\s\-]*II/i.test(t)) n += 4;
      n += (t.match(/<img\b/gi) || []).length * 2;
      n += Math.min(10, Math.floor(t.length / 180));
      return n;
    };
    const curPlain = String(cur).replace(/<img\b[^>]*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const pinPlain = String(pinned).replace(/<img\b[^>]*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (pinPlain.length > 20 && curPlain.length < Math.max(12, pinPlain.length * 0.55)) {
      q.q = pinned;
    }
    const curStubFig = stub(cur)
      || /\b(?:alt|title)\s*=\s*["'][^"']*\b(?:figure|fig\.?)\b/i.test(cur)
      || (/<img\b/i.test(cur) && !/2026_modules|AKCR2_|watermark_improved|watermarked_images|qx-org-|qx-book-|hcv-|\/assets\/diagrams\/|\/pyq\//i.test(cur));
    try {
      if (window.QxImgClean && typeof QxImgClean.applyMatchStemToQuestion === "function") {
        QxImgClean.applyMatchStemToQuestion(q, q._marksId || q.id);
      }
    } catch (_) { /* */ }
    const idxStem = (window.QxImgClean && QxImgClean.matchStemHtml) ? (QxImgClean.matchStemHtml(q, q.id) || "") : "";
    if (idxStem && matchScore(idxStem) > matchScore(cur) + 1) q.q = idxStem;
    else if (matchScore(pinned) > matchScore(cur) + 1) q.q = pinned;
    else if (hasFig(pinned) && (curStubFig || !hasFig(cur))) q.q = pinned;
    else if (qxStemLooksGutted(cur) && !qxStemLooksGutted(pinned)) q.q = pinned;
    else if (qxMathWeight(pinned) > qxMathWeight(cur) + 3) q.q = pinned;
  }
  qxSyncOptsFromBank(q);
  try {
    if (window.QxSoftWm && typeof QxSoftWm.applyIndexToQuestion === "function") {
      QxSoftWm.applyIndexToQuestion(q);
    } else if ((q.options || []).every(o => typeof qxIsFigureStubText === "function" && qxIsFigureStubText(o))
      && window.QxSoftWm && typeof QxSoftWm.optHtmlFor === "function") {
      const filled = QxSoftWm.optHtmlFor(q);
      if (filled && filled.some(Boolean)) {
        q.options = filled.map((h, i) => h || (q.options && q.options[i]) || "");
        if (!q._qxBankOptions) q._qxBankOptions = q.options.slice();
      }
    }
  } catch (_) { /* */ }
  return q;
}

function qxSyncOptsFromBank(q) {
  if (!q) return q;
  qxUpgradeFigureStubs(q);
  if (qxHasRenderableOpts(q) && !(q.options || []).every(qxIsFigureStubText)) {
    q._optsLoadFailed = false;
    q._optsLoadStartedAt = 0;
    return q;
  }
  try {
    const bank = qxFindBankQuestion(q);
    if (bank && (bank.options || []).some(qxOptionHasRealFigure)) {
      q.options = (bank._qxBankOptions || bank.options || []).slice();
      if (bank.answer != null) q.answer = bank.answer;
      if (bank.answers) q.answers = bank.answers;
      q._optsLoadFailed = false;
      q._optsLoadStartedAt = 0;
      q._fullFetched = true;
    }
  } catch (_) { /* */ }
  return q;
}

/**
 * Fill incomplete options from Quantrex catalog / Firebase (no Marks).
 */
async function qxFillOptionsFromMarks(q) {
  if (!q) return q;
  qxSyncOptsFromBank(q);
  try {
    if (typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion
      && !(typeof qxHasRenderableOpts === "function" && qxHasRenderableOpts(q))) {
      await QuantrexCatalog.fillQuestion(q);
    }
  } catch (_) { /* local catalog optional */ }
  return q;
}

async function qxHydrateQuestion(q, toast) {
  if (!q) return q;
  try {
    if (typeof qxRestoreQuestionContent === "function") qxRestoreQuestionContent(q);
  } catch (_) { /* */ }
  if (q._book || q._bookId) {
    q._fullFetched = true;
    q._needsFull = false;
    q._listStub = false;
    return q;
  }
  try {
    if (typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion) {
      await QuantrexCatalog.fillQuestion(q);
    }
  } catch (_) { /* local catalog optional */ }
  if (qxHasRenderableOpts(q) && String(q.q || "").trim() && !/^Loading question/i.test(String(q.q || ""))) {
    q._listStub = false;
    q._needsFull = false;
    q._optsLoadFailed = false;
    q._fullFetched = true;
    return q;
  }
  try {
    if (typeof QxFirebaseBank !== "undefined" && QxFirebaseBank.getQuestion) {
      const rec = await QxFirebaseBank.getQuestion(q._marksId || q.id);
      if (rec && typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.applyCatalogRec) {
        QuantrexCatalog.applyCatalogRec(q, rec);
      }
    }
  } catch (_) { /* */ }
  q._listStub = !String(q.q || "").trim();
  q._needsFull = false;
  q._fullFetched = true;
  q._optsLoadFailed = !qxHasRenderableOpts(q);
  return q;
}


function qxPrepareFiguresFast(q) {
  if (!q || typeof QxImgClean === "undefined" || !QxImgClean.prepareQuestionFigures) return Promise.resolve();
  return qxRace(QxImgClean.prepareQuestionFigures(q), 600);
}

/** Refresh practice after Marks fill — always re-paint MCQ options (blank-opt bug). */
function qxMaybeRefreshPractice(id) {
  const main = document.getElementById("app-main");
  const q = typeof getQ === "function" ? getQ(id) : null;
  if (!main || !q) return;
  // Only skip wipe for numerical keypad once answer key is ready (keep typing UX)
  const isNum = (q.questionType === "numerical" || q.questionType === "subjective"
    || (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType
      && /numerical|subjective/.test(QuantrexQFormat.getType(q))));
  if (isNum && main.querySelector(".mtk-numerical, .qx-prac-numerical")
    && (q.correctValue != null || q._marksFillTried)) {
    return;
  }
  // MCQ: must re-render so filled option text/images appear (Screenshot 713 blank A–D)
  qxRenderPracticeQuestion(id);
}

function qxSetExamPillSafe(fallbackName) {
  try {
    const name = (typeof EXAMS !== "undefined" && typeof STATE !== "undefined" && STATE
      && EXAMS[STATE.exam] && EXAMS[STATE.exam].name)
      || fallbackName
      || "Practice";
    const pill = document.getElementById("examPill");
    if (pill) pill.textContent = name;
    const pillTop = document.getElementById("examPillTop");
    if (pillTop) pillTop.textContent = name;
  } catch (_) { /* never block open */ }
}

function qxRenderPracticeQuestion(id) {
  const main = document.getElementById("app-main");
  if (!main) return;
  try {
    main.classList.add("qx-font-host");
    const qPre = typeof getQ === "function" ? getQ(id) : null;
    // Irodov / books: rewrite CDN figures → local clean before first paint
    try {
      if (qPre && typeof qxPatchOrganicBookQuestion === "function"
        && /qx-org-|organic_book|watermarked_images/i.test(String(qPre.q || "") + (qPre.options || []).join(""))) {
        const patched = qxPatchOrganicBookQuestion(qPre);
        if (patched.q) qPre.q = patched.q;
        if (patched.solution) qPre.solution = patched.solution;
        if (Array.isArray(patched.options)) qPre.options = patched.options;
      }
    } catch (_) { /* */ }
    try {
      if (qPre && typeof QxImgClean !== "undefined" && QxImgClean.rewriteHtmlFigures) {
        if (qPre.q) qPre.q = QxImgClean.rewriteHtmlFigures(qPre.q);
        if (Array.isArray(qPre.options)) {
          qPre.options = qPre.options.map(o =>
            (o && /cdn-question-pool|cdn\.quizrr|https?:\/\/\.app|2026_modules/i.test(String(o)))
              ? QxImgClean.rewriteHtmlFigures(o) : o
          );
        }
      }
    } catch (_) { /* */ }
    if (qPre && (qPre._book || qPre._bookId)) {
      document.body.classList.add("qx-book-mode");
      main.classList.add("qx-book-mode");
    } else {
      document.body.classList.remove("qx-book-mode");
      main.classList.remove("qx-book-mode");
    }
    let html = "";
    try {
      html = viewQuestion(id);
    } catch (ve) {
      console.error("viewQuestion failed:", id, ve);
      // Minimal fallback UI so user never sees permanent "Could not open"
      const q = qPre || (typeof getQ === "function" ? getQ(id) : null);
      const stem = q && q.q
        ? (typeof Mx !== "undefined" && Mx.html ? Mx.html(String(q.q).slice(0, 8000)) : String(q.q).slice(0, 8000))
        : "<p>Question body unavailable.</p>";
      let opts = "";
      try {
        if (q && typeof QuantrexQFormat !== "undefined") {
          opts = QuantrexQFormat.renderOptions(q, { selected: null, done: false });
        }
      } catch (_) { opts = ""; }
      html = `<div class="qx-practice-page" style="padding:20px;max-width:900px;margin:0 auto">
        <button type="button" class="btn-soft" onclick="qxPracticeBack()">← Back</button>
        <div class="mtk-q-text qx-content" style="margin:16px 0">${stem}</div>
        <div id="qaOpts" class="qx-prac-opts">${opts || "<p class='empty'>Options loading…</p>"}</div>
      </div>`;
    }
    main.innerHTML = html;
    qxSetExamPillSafe(qPre && (qPre.examName || qPre.exam));
    try { bindPracticeQuestion(main); } catch (be) { console.warn("bindPracticeQuestion", be); }
    // BNH: priority figures + neighbor prefetch
    try {
      if (typeof QxTestEnginePerf !== "undefined") {
        const pc = window._qxPracticeCtx;
        QxTestEnginePerf.afterQuestionPaint(main, pc ? {
          ids: pc.ids,
          idx: pc.idx,
          getQ: typeof getQ === "function" ? getQ : null
        } : null);
      }
    } catch (_) { /* */ }
    // Light figure pin only (NO multi-pass thrash — was hanging browser)
    try {
      window._qxSoftWmQid = id;
      if (window.QxSoftWm && typeof QxSoftWm.scan === "function") QxSoftWm.scan(main);
      if (typeof QxNoWmGuard !== "undefined" && QxNoWmGuard.schedulePass) QxNoWmGuard.schedulePass(main);
    } catch (_) { /* */ }
    if (typeof syncQuestionFontScale === "function") syncQuestionFontScale(main);
    else if (typeof applyTestFontScaleToDom === "function") applyTestFontScaleToDom(typeof getTestFontScale === "function" ? getTestFontScale() : "medium");
    // One math pass after paint — extra typeset froze low-end phones
    if (typeof Mx !== "undefined") {
      try { if (Mx.fixSpacingInDom) Mx.fixSpacingInDom(main); } catch (_) { /* */ }
      if (Mx.afterRenderLight) Mx.afterRenderLight(main);
      else Mx.afterRender(main);
      const settle = () => {
        try {
          const raw = /(?:^|>)[^<]{0,40}\$[^$]{1,120}\$/.test(main.innerHTML || "");
          if (raw && Mx.typeset) Mx.typeset(main);
          if (window.QxSoftWm && QxSoftWm.scan) QxSoftWm.scan(main);
        } catch (_) { /* */ }
      };
      if (typeof requestIdleCallback === "function") requestIdleCallback(settle, { timeout: 700 });
      else setTimeout(settle, 220);
    }
    try {
      window.dispatchEvent(new CustomEvent("qx:question-rendered", { detail: { id: id } }));
      window.dispatchEvent(new CustomEvent("qx:practice-ready", { detail: { id: id } }));
    } catch (_) { /* */ }
    const q = typeof getQ === "function" ? getQ(id) : null;
    // Books/Irodov only: heavy figure map. PYQ uses CDN native (no prepare/finalize loops).
    if (q && (q._book || q._bookId) && typeof QxImgClean !== "undefined") {
      const figPass = async () => {
        try {
          if (QxImgClean.loadBookFigureMaps) await QxImgClean.loadBookFigureMaps();
          if (QxImgClean.prepareQuestionFigures) await QxImgClean.prepareQuestionFigures(q);
          const before = String(q.q || "");
          if (QxImgClean.rewriteHtmlFigures) q.q = QxImgClean.rewriteHtmlFigures(q.q);
          if (q.q !== before && /\/assets\/diagrams\//i.test(String(q.q))
            && !/qx-irodov|AKCR2_|2026_modules\/jee_advanced_physics/i.test(String(q.q))) {
            try {
              main.innerHTML = viewQuestion(id);
              if (typeof bindPracticeQuestion === "function") bindPracticeQuestion(main);
              if (typeof Mx !== "undefined" && Mx.afterRenderLight) Mx.afterRenderLight(main);
            } catch (_) { /* */ }
          }
          if (QxImgClean.rewriteAllPoolImgs) QxImgClean.rewriteAllPoolImgs(main);
        } catch (_) { /* */ }
      };
      void figPass();
    } else if (main && typeof QxImgClean !== "undefined" && QxImgClean.rewriteAllPoolImgs) {
      // One lightweight pin of pool imgs to CDN
      try { QxImgClean.rewriteAllPoolImgs(main); } catch (_) { /* */ }
    }
  } catch (e) {
    console.error("Practice render failed:", id, e);
    // Last-resort recovery: never leave user stuck
    try {
      const q = typeof getQ === "function" ? getQ(id) : null;
      const msg = (e && e.message) ? String(e.message).slice(0, 120) : "render error";
      main.innerHTML = `<div class="empty" style="padding:48px;text-align:center;max-width:520px;margin:40px auto">
        <p style="font-weight:700;margin-bottom:10px">Could not open question</p>
        <p style="font-size:12px;color:var(--gray);margin-bottom:16px">${msg.replace(/</g, "")}</p>
        <button type="button" class="btn-primary" style="margin:0 8px 8px 0" onclick="typeof openPracticeQuestion==='function'&&openPracticeQuestion(${JSON.stringify(String(id))})">Retry open</button>
        <button type="button" class="btn-soft" onclick="qxPracticeBack()">← Back</button>
        ${q && q.q ? `<div class="qx-content" style="text-align:left;margin-top:24px;max-height:40vh;overflow:auto">${String(q.q).replace(/</g, "&lt;").slice(0, 2000)}</div>` : ""}
      </div>`;
    } catch (_) {
      main.innerHTML = `<div class="empty" style="padding:48px;text-align:center">Could not open question. <button class="btn-soft" onclick="qxPracticeBack()">← Back</button></div>`;
    }
  }
}

function qxBackgroundPrefetch(ids) {
  if (!ids || !ids.length) return;
  // Never Marks-prefetch digital book packs (Rank Booster / HC Verma hang fix)
  // Cap background work — large chapters (Mole Concept 200+) must not flood Marks API
  const needOpts = ids.filter(id => {
    const q = getQ(id);
    return q && q._marksId && !(q._book || q._bookId) && typeof qxNeedsOptionsLoad === "function" && qxNeedsOptionsLoad(q);
  }).slice(0, 6);
  if (needOpts.length) {
    (async () => {
      for (const id of needOpts) {
        const q = getQ(id);
        if (!q || q._book || q._bookId) continue;
        if (typeof qxNeedsOptionsLoad === "function" && !qxNeedsOptionsLoad(q)) continue;
        try { await qxRace(qxFillOptionsFromMarks(q), 5000); } catch (_) { /* */ }
      }
    })().catch(() => {});
  }
  if (typeof MarksLive === "undefined" || !MarksLive.prefetchQuestions) return;
  const need = ids.filter(id => {
    const q = getQ(id);
    if (!q || !q._marksId || q._book || q._bookId) return false;
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
  // Reset fail flags so user Retry always gets one fresh attempt
  q._optsLoadFailed = false;
  q._hydrateInFlight = false;
  q._hydrateStartedAt = 0;
  q._optsLoadStartedAt = 0;
  q._fetchFailCount = 0;
  q._hydrateAttempts = 0;
  q._fullFetched = false;
  q._needsFull = true;
  q._figureFetchAttempted = false;

  const main = document.getElementById("app-main");
  if (main) {
    const optsEl = main.querySelector("#qaOpts");
    if (optsEl && !optsEl.querySelector(".mtk-opt, .qx-prac-opt, .qx-prac-numerical, .mtk-numerical")) {
      optsEl.innerHTML = `<div class="empty qx-load-opts" style="padding:20px">Loading options…</div>`;
    }
  }
  // Permanent (690): bank sync + Marks fill on every Retry
  q._marksFillTried = false;
  qxSyncOptsFromBank(q);
  try {
    q._marksFillTried = true;
    q = await qxRace(qxFillOptionsFromMarks(q), 14000) || q;
  } catch (_) { /* */ }
  if (!qxHasRenderableOpts(q)) {
    q = await qxHydrateQuestion(q, false);
  }
  q._marksFillTried = true;
  if (q && typeof QxImgClean !== "undefined" && QxImgClean.prepareQuestionFigures) {
    try {
      await Promise.race([
        QxImgClean.prepareQuestionFigures(q),
        new Promise(r => setTimeout(r, 600))
      ]);
    } catch (_) { /* continue */ }
  }
  if (!main) return;
  // Always re-render once after retry so fail/success UI updates (no hang on empty patch)
  main.innerHTML = viewQuestion(qid);
  bindPracticeQuestion(main);
  if (typeof Mx !== "undefined") Mx.afterRender(main);
  else if (typeof QxImgClean !== "undefined" && QxImgClean.finalizeAll) QxImgClean.finalizeAll(main, q);
}

function qxSchedulePracticeHydrate(q) {
  clearTimeout(_qxPracHydrateTimer);
  if (!q || !q._marksId || typeof MarksLive === "undefined") return;
  if (q._optsLoadFailed || (q._hydrateAttempts || 0) >= 4) return;
  if (qxHasRenderableOpts(q) && !(MarksLive.isQuestionIncomplete && MarksLive.isQuestionIncomplete(q))) return;
  const needs = (MarksLive.isQuestionIncomplete && MarksLive.isQuestionIncomplete(q))
    || (MarksLive.isOptionsIncomplete && MarksLive.isOptionsIncomplete(q))
    || (MarksLive.needsFullQuestion && MarksLive.needsFullQuestion(q));
  if (!needs) return;
  _qxPracHydrateTimer = setTimeout(() => {
    const main = document.getElementById("app-main");
    const stuck = main && main.querySelector(".qx-load-opts, .qx-load-q");
    if (stuck && !qxHasRenderableOpts(q) && (q._hydrateAttempts || 0) < 4) {
      qxRetryPracticeLoad();
    } else if (stuck && !qxHasRenderableOpts(q)) {
      q._optsLoadFailed = true;
      q._hydrateInFlight = false;
      if (window._qxPracticeCtx) qxRenderPracticeQuestion(q.id);
    }
  }, 2000);
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
  try {
    const ctx = window._qxPracticeCtx || {};
    const cpy = typeof _cpyqbPayload !== "undefined" ? _cpyqbPayload : {};
    const gate = {
      exam: cpy.exam || ctx.exam || (typeof STATE !== "undefined" ? STATE.exam : ""),
      subject: cpy.subject || ctx.subject || "",
      chapter: cpy.chapter || ctx.chapter || "",
      qid: id
    };
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.allow && !QuantrexAccess.allow("question", gate)) {
      if (typeof finishRender === "function") finishRender(QuantrexAccess.paywallHtml("question", gate));
      return;
    }
  } catch (_) { /* */ }
  // Chapter-wise PYQ list → ExamGOAL full-window practice (same chrome as mock)
  try {
    const view = typeof currentView !== "undefined" ? currentView : "";
    const fromEg = view === "cpyqb" || view === "books" || view === "board"
      || (typeof _cpyqbPayload !== "undefined" && _cpyqbPayload && _cpyqbPayload.chapter);
    const list = window._qxListQs || window._qxListQsAll || [];
    if (fromEg && list.length && typeof cpyqbLaunchList === "function") {
      const ids = list.map((x) => x && x.id).filter(Boolean);
      const openId = id;
      const idx = Math.max(0, ids.findIndex((x) => String(x) === String(openId)));
      const keys = typeof cpyqbSessionKeys === "function" ? cpyqbSessionKeys({ returnTo: view }) : {};
      const ch = keys.chapter || (view === "books" ? "Digital Book" : (view === "board" ? "Board PYQ" : "Chapter PYQ"));
      const sub = keys.subject || "";
      const title = ch + (sub ? " · " + sub : "");
      const main0 = document.getElementById("app-main");
      if (typeof qxAskBookPracticeOrTest === "function") {
        qxAskBookPracticeOrTest(ids, title, idx >= 0 ? idx : 0, view || keys.returnTo);
        return;
      }
      if (main0 && typeof qxLoadLogoHtml === "function") {
        main0.innerHTML = qxLoadLogoHtml("Opening practice…");
      }
      cpyqbLaunchList(ids, title, idx >= 0 ? idx : 0, view || keys.returnTo);
      return;
    }
  } catch (_) { /* fall through to in-page practice */ }
  // Resolve by id, string id (m_…), or marksId (list stubs)
  let q = typeof getQ === "function" ? getQ(id) : null;
  if (!q && typeof QUESTIONS !== "undefined") {
    q = QUESTIONS.find(x => x && (String(x.id) === String(id) || x._marksId === id
      || (String(id).indexOf("m_") === 0 && x._marksId === String(id).slice(2))));
  }
  // Prefer full bank question over empty list stub (same Marks id)
  if (q && (q._listStub || /^Loading question/i.test(String(q.q || ""))) && q._marksId
    && typeof QUESTIONS !== "undefined") {
    const full = QUESTIONS.find(x => x && x._marksId === q._marksId
      && !x._listStub
      && String(x.q || "").replace(/<[^>]+>/g, "").trim().length > 20
      && !/^Loading question/i.test(String(x.q || "")));
    if (full) q = full;
  }
  const openId = q && q.id != null ? q.id : id;
  const list = window._qxListQs || window._qxListQsAll || [];
  const ids = list.length ? list.map(x => x.id) : [openId];
  const idx = Math.max(0, ids.findIndex(x => String(x) === String(openId) || String(x) === String(id)));
  window._qxPracticeCtx = {
    ids,
    idx: idx >= 0 ? idx : 0,
    selected: {},
    done: {},
    answers: {},
    returnView: currentView || "cpyqb",
    listFn: typeof _lastListFn === "function" ? _lastListFn : null
  };
  try {
    ids.forEach(qid => {
      const qq = typeof getQ === "function" ? getQ(qid) : null;
      if (qq && qq._marksId && typeof QxQuestionCache !== "undefined" && QxQuestionCache.rememberStub) {
        QxQuestionCache.rememberStub(qq);
      }
    });
    if (q && q._marksId && typeof QxQuestionCache !== "undefined" && QxQuestionCache.rememberStub) {
      QxQuestionCache.rememberStub(q);
    }
  } catch (_) { /* */ }

  // Hydrate list stubs BEFORE navigation so go() does not paint "Loading question…" forever
  const needsHydrate = q && (typeof qxIsListStubQuestion === "function"
    ? qxIsListStubQuestion(q)
    : !!(q._listStub || /^Loading question/i.test(String(q.q || ""))));
  if (needsHydrate && q) {
    if (typeof AllenTestUI !== "undefined") enterAllenPracticeMode();
    currentView = "question";
    const main0 = document.getElementById("app-main");
    if (main0) {
      main0.innerHTML = `<div class="empty qx-q-skeleton" style="padding:48px;text-align:center;max-width:520px;margin:40px auto">
        <div style="height:14px;background:rgba(148,163,184,.25);border-radius:8px;margin-bottom:12px;animation:qxPulse 1.2s ease infinite"></div>
        <div style="height:14px;background:rgba(148,163,184,.18);border-radius:8px;width:80%;margin:0 auto 20px;animation:qxPulse 1.2s ease infinite"></div>
      </div><style>@keyframes qxPulse{0%,100%{opacity:1}50%{opacity:.45}}</style>`;
    }
    (async () => {
      try {
        if (typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion) {
          await QuantrexCatalog.fillQuestion(q);
        }
      } catch (_) { /* */ }
      const stillStub = typeof qxIsListStubQuestion === "function"
        ? qxIsListStubQuestion(q)
        : !!(q._listStub || /^Loading question/i.test(String(q.q || "")));
      if (stillStub && typeof QxFirebaseBank !== "undefined" && QxFirebaseBank.getQuestion) {
        try {
          const rec = await QxFirebaseBank.getQuestion(q._marksId || q.id);
          if (rec && typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.applyCatalogRec) {
            QuantrexCatalog.applyCatalogRec(q, rec);
          }
        } catch (_) { /* open with catalog / stub */ }
      }
      if (q && String(q.q || "").trim() && !/^Loading question/i.test(String(q.q || ""))) {
        q._listStub = false;
        q._needsFull = false;
      }
      try {
        if (typeof go === "function") go("question", openId);
        else qxRenderPracticeQuestion(openId);
      } catch (e) {
        console.warn("openPracticeQuestion after hydrate", e);
        try { qxRenderPracticeQuestion(openId); } catch (_) { /* */ }
      }
    })();
    return;
  }

  if (typeof AllenTestUI !== "undefined") enterAllenPracticeMode();
  try {
    if (typeof go === "function") go("question", openId);
    else {
      currentView = "question";
      qxRenderPracticeQuestion(openId);
    }
  } catch (e) {
    console.warn("openPracticeQuestion go failed", e);
    currentView = "question";
    try { qxRenderPracticeQuestion(openId); } catch (_) { /* */ }
  }
  // Fallback if paint failed (Screenshot 714: click did nothing)
  setTimeout(() => {
    try {
      const main = document.getElementById("app-main");
      const painted = main && main.querySelector(".mtk-test-root, .qx-practice-page, .qx-q-skeleton, .allen-practice, .mtk-q-text");
      if (!painted || currentView !== "question") {
        currentView = "question";
        if (typeof AllenTestUI !== "undefined") enterAllenPracticeMode();
        qxRenderPracticeQuestion(openId);
      }
    } catch (e) {
      console.warn("openPracticeQuestion fallback", e);
    }
  }, 40);

  // Prefetch + options fill for nearby / current
  const cur = typeof getQ === "function" ? getQ(openId) : q;
  const isBookQ = !!(cur && (cur._book || cur._bookId));
  if (!isBookQ && typeof MarksLive !== "undefined" && MarksLive.prefetchQuestions) {
    const near = ids.slice(Math.max(0, idx - 1), Math.min(ids.length, idx + 6));
    MarksLive.prefetchQuestions(near).catch(() => {});
  }
  setTimeout(() => {
    const qq = typeof getQ === "function" ? getQ(openId) : null;
    if (!qq || !qq._marksId || qq._book || qq._bookId) return;
    if (typeof qxNeedsOptionsLoad === "function" && !qxNeedsOptionsLoad(qq) && qxHasRenderableOpts(qq)) return;
    const before = (qq.options || []).join("\0") + "|" + String(qq.correctValue || "");
    (async () => {
      try {
        await qxRace(qxFillOptionsFromMarks(qq), 10000);
        qq._marksFillTried = true;
        if (qxHasRenderableOpts(qq)) {
          qq._fullFetched = true;
          qq._optsLoadFailed = false;
        }
      } catch (_) {
        qq._marksFillTried = true;
      }
      if (!window._qxPracticeCtx || String(window._qxPracticeCtx.ids[window._qxPracticeCtx.idx]) !== String(openId)) return;
      const after = (qq.options || []).join("\0") + "|" + String(qq.correctValue || "");
      if (after !== before || qxHasRenderableOpts(qq)) {
        qxRenderPracticeQuestion(openId);
      }
    })();
  }, 30);
}

// Open question cards via data-qid (works for m_<marksId> string ids — no broken inline onclick)
document.addEventListener("click", function qxCardOpenDelegate(ev) {
  try {
    const card = ev.target && ev.target.closest && ev.target.closest(".q-card[data-qid]");
    if (!card) return;
    if (ev.target.closest("button, a, input, select, textarea, .nb-rm")) return;
    const qid = card.getAttribute("data-qid");
    if (!qid || typeof openPracticeQuestion !== "function") return;
    if (window._qxLastOpenId === qid && Date.now() - (window._qxLastOpenAt || 0) < 350) return;
    window._qxLastOpenId = qid;
    window._qxLastOpenAt = Date.now();
    ev.preventDefault();
    openPracticeQuestion(qid);
  } catch (e) {
    console.warn("qxCardOpenDelegate", e);
  }
}, true);

// Keyboard: Enter/Space on focused card
document.addEventListener("keydown", function qxCardKeyOpen(ev) {
  if (ev.key !== "Enter" && ev.key !== " ") return;
  const card = ev.target && ev.target.closest && ev.target.closest(".q-card[data-qid]");
  if (!card || ev.target !== card) return;
  const qid = card.getAttribute("data-qid");
  if (!qid || typeof openPracticeQuestion !== "function") return;
  ev.preventDefault();
  openPracticeQuestion(qid);
}, true);

/** ExamGOAL-style report types (screenshots 703/705) — every question */
const QX_REPORT_TYPES = [
  { id: "typo", label: "Typo Error", desc: "If question has error or spelling mistake or misprint etc.", ic: "✏️" },
  { id: "answer", label: "Answer Error", desc: "If question's answer is wrong.", ic: "✗" },
  { id: "classification", label: "Classification Error", desc: "If question in wrong chapter, wrong topic or wrong difficulty level.", ic: "📂" },
  { id: "translation", label: "Translation Error", desc: "If question's translation is wrong or has error.", ic: "🌐" },
  { id: "other", label: "Other Error", desc: "Any other issue with this question.", ic: "⋯" }
];

function qxCloseReportModal() {
  const el = document.getElementById("qxReportModal");
  if (el) el.remove();
}

function qxReportModalHtml(q) {
  const types = QX_REPORT_TYPES.map(t =>
    `<button type="button" class="qx-report-type" data-report-type="${t.id}">
      <span class="qx-rt-ic" aria-hidden="true">${t.ic}</span>
      <span><strong>${t.label}</strong><small>${t.desc}</small></span>
      <span class="qx-rt-chev" aria-hidden="true">›</span>
    </button>`
  ).join("");
  return `<div class="marks-modal-overlay" id="qxReportModal" onclick="if(event.target===this)qxCloseReportModal()">
    <div class="marks-modal qx-report-modal">
      <div class="marks-modal-head">
        <h3>Report Question</h3>
        <button type="button" class="marks-modal-clear" onclick="qxCloseReportModal()">✕</button>
      </div>
      <div class="marks-modal-body">
        <p class="qx-report-hint">Please select the type of issue you want to report</p>
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
    showToast("⚠️ Select the type of issue first");
    return;
  }
  const notes = (document.getElementById("qxReportNotes")?.value || "").trim();
  let student = {};
  try { student = JSON.parse(localStorage.getItem("quantrex_user") || "{}") || {}; } catch (_) { /* */ }
  const typeMeta = QX_REPORT_TYPES.find(t => t.id === type);
  const payload = {
    questionId: q.id,
    marksId: q._marksId || null,
    type,
    typeLabel: (typeMeta && typeMeta.label) || type,
    notes,
    subject: q.subject || "",
    chapter: q.chapter || "",
    source: q.source || q.paperSource || "",
    bank: q._bank || q._book || "",
    exam: (typeof STATE !== "undefined" && STATE.exam) || "",
    studentEmail: student.email || "",
    studentName: student.name || "",
    ts: Date.now()
  };
  try {
    const key = "quantrex_question_reports";
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    prev.push(payload);
    localStorage.setItem(key, JSON.stringify(prev.slice(-500)));
    if (typeof firebase !== "undefined" && firebase.firestore) {
      firebase.firestore().collection("question_reports").add(payload).catch(() => {});
    }
    if (type === "answer") {
      const who = String(student.uid || student.email || student.phone || "anon-" + (payload.ts % 100000));
      const voteKey = "qx_answer_flags";
      const votes = JSON.parse(localStorage.getItem(voteKey) || "{}");
      const qk = String(q.id);
      const set = new Set(votes[qk] || []);
      set.add(who);
      votes[qk] = [...set];
      localStorage.setItem(voteKey, JSON.stringify(votes));
      if (set.size >= 2) {
        q._flaggedWrong = true;
        showToast("⚠️ Two students marked this answer wrong — flagged for admin");
        try {
          if (typeof firebase !== "undefined" && firebase.firestore) {
            firebase.firestore().collection("flagged_questions").doc(qk).set({
              questionId: q.id, count: set.size, type: "answer", updatedAt: Date.now()
            }, { merge: true }).catch(() => {});
          }
        } catch (_) { /* */ }
      }
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
  try { exitAllenPracticeMode(); } catch (_) { /* */ }
  const ctx = window._qxPracticeCtx;
  try {
    if (ctx && typeof ctx.listFn === "function") {
      if (typeof _lastListFn !== "undefined") _lastListFn = ctx.listFn;
      const view = ctx.returnView || currentView || "practice";
      if (typeof render === "function") {
        render(view, ctx.listFn());
        return;
      }
    }
    if (ctx && ctx.returnView && typeof go === "function") {
      go(ctx.returnView);
      return;
    }
    if (typeof go === "function") {
      go("practice");
      return;
    }
  } catch (err) {
    console.warn("qxPracticeBack", err);
  }
  if (typeof history !== "undefined" && history.length > 1) history.back();
}
window.qxPracticeBack = qxPracticeBack;

function qxPracticeNav(delta) {
  const ctx = window._qxPracticeCtx;
  if (!ctx || !ctx.ids.length) return;
  const next = ctx.idx + delta;
  if (next < 0 || next >= ctx.ids.length) return;
  ctx.idx = next;
  const qid = ctx.ids[ctx.idx];
  // BNH: warm next/prev figures before paint
  try {
    if (typeof QxTestEnginePerf !== "undefined") {
      QxTestEnginePerf.prefetchWindow(ctx.ids, ctx.idx, typeof getQ === "function" ? getQ : null);
    }
  } catch (_) { /* */ }
  // Instant paint first
  go("question", qid);
}

function viewQuestion(id) {
  let q = getQ(id);
  if (!q) {
    // Permanent (687): async bank resolve — show loading then re-render when found
    if (typeof ensureQuestionLoaded === "function") {
      ensureQuestionLoaded(id).then(found => {
        if (!found) return;
        if (typeof currentView !== "undefined" && currentView === "question") {
          if (!window._qxPracticeCtx) {
            window._qxPracticeCtx = { ids: [found.id], idx: 0, selected: {}, done: {}, answers: {} };
          } else if (!window._qxPracticeCtx.ids.some(x => String(x) === String(found.id))) {
            window._qxPracticeCtx.ids = [found.id];
            window._qxPracticeCtx.idx = 0;
          }
          qxRenderPracticeQuestion(found.id);
        }
      }).catch(() => {});
    }
    return `<div class="qx-practice-page qx-q-sk-page" style="padding:16px">
      <div class="qx-q-sk" aria-busy="true">
        <span class="qx-q-skeleton qx-q-sk-bar"></span>
        <span class="qx-q-skeleton qx-q-sk-stem"></span>
        <span class="qx-q-skeleton qx-q-sk-opt"></span>
        <span class="qx-q-skeleton qx-q-sk-opt"></span>
        <span class="qx-q-skeleton qx-q-sk-opt"></span>
        <span class="qx-q-skeleton qx-q-sk-opt"></span>
      </div>
      <p class="empty" style="padding:12px;margin-top:8px">Loading question… <button class="btn-soft" type="button" onclick="location.reload()">Retry</button></p>
    </div>`;
  }
  // Permanent (690): always re-sync bank options + stem figures first
  qxRestoreQuestionContent(q);
  qxSyncOptsFromBank(q);
  // Clear stale fail flags if bank/cache already has options
  if (qxHasRenderableOpts(q)) {
    q._optsLoadFailed = false;
    q._optsLoadStartedAt = 0;
    q._hydrateInFlight = false;
  }

  const ctx = window._qxPracticeCtx;
  if (ctx) {
    const i = ctx.ids.findIndex(x => String(x) === String(id) || String(x) === String(q.id));
    if (i >= 0) ctx.idx = i;
  } else {
    window._qxPracticeCtx = { ids: [q.id], idx: 0, selected: {}, done: {}, returnView: currentView, listFn: null };
  }
  const pc = window._qxPracticeCtx;
  const total = pc.ids.length;
  const pos = pc.idx + 1;
  const qKey = String(q.id);
  const bm = typeof QuantrexBookmarks !== "undefined" ? QuantrexBookmarks.isBookmarked(q.id) : STATE.bookmarks.includes(q.id);
  const sv = STATE.solved.find(s => s.id === q.id || String(s.id) === qKey);
  const subjTag = (q.subject || "general").toLowerCase().replace(/\s+/g, "-");
  const sourceLabel = typeof QuantrexStrip !== "undefined"
    ? QuantrexStrip.sourceLabel(q)
    : (q._book && typeof bookQuestionLabel === "function" ? bookQuestionLabel(q) : (q.source || ""));
  const sourceLogo = typeof QuantrexExamLogos !== "undefined" ? QuantrexExamLogos.forQuestion(q) : "";
  const done = !!(pc.done[q.id] || pc.done[qKey]);
  const sel = pc.selected[q.id] !== undefined ? pc.selected[q.id] : pc.selected[qKey];

  const incomplete = (typeof MarksLive !== "undefined" && MarksLive.isQuestionIncomplete
    ? MarksLive.isQuestionIncomplete(q)
    : false)
    || !!(q._listStub || /^Loading question/i.test(String(q.q || "").replace(/<[^>]+>/g, " ").trim()));
  const qType = typeof QuantrexQFormat !== "undefined" ? QuantrexQFormat.getType(q) : "singleCorrect";
  const isNumType = qType === "numerical" || qType === "subjective";

  // Permanent fix: ANY real option content (text LaTeX / images) → always render immediately
  // (was stuck on Loading because isOptionsIncomplete / letter-stub logic fought bank data)
  function qxOptsRenderable(qq) {
    if (!qq) return false;
    if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType) {
      try {
        const t = QuantrexQFormat.getType(qq);
        if (t === "numerical" || t === "subjective") return true;
      } catch (_) { /* */ }
    }
    const opts = qq.options || [];
    if (!opts.length) return false;
    return opts.some(o => {
      const s = String(o || "");
      if (/<img\b|smiles/i.test(s)) return true;
      // Keep $...$ LaTeX comparisons (C < B) — strip only real HTML tags
      const t = s.replace(/<[^>]+>/g, "").replace(/\$/g, "").trim();
      if (!t) return false;
      if (/^[A-D]$/i.test(t)) return false; // pure letter stub
      return t.length > 0;
    });
  }

  // Never trust Marks isOptionsIncomplete alone when bank already has content
  let optsIncomplete = !isNumType && !qxOptsRenderable(q);
  if (q._book || q._bookId) {
    if (qxOptsRenderable(q) && !qxBookOptionsBroken(q)) {
      optsIncomplete = false;
      q._optsLoadFailed = false;
    } else if (qxBookOptionsBroken(q)) {
      optsIncomplete = true;
    }
  }
  if (isNumType || qxOptsRenderable(q)) {
    optsIncomplete = false;
    q._optsLoadFailed = false;
    // Do NOT set _marksFillTried here — that blocked Marks fill and left blank A–D boxes
  }
  const hasMarks = !!(q._marksId && !(q._book || q._bookId));
  const fillTried = !!q._marksFillTried;
  const optsFailed = !isNumType && !qxOptsRenderable(q) && fillTried && !!q._optsLoadFailed;
  const qTypeBadge = typeof QuantrexQFormat !== "undefined" ? QuantrexQFormat.typeBadgeHtml(q) : "";
  let opts = "";
  // ALWAYS show bank options when present (26813 etc.) — never "Loading options"
  try {
    // Black Book / page-scan subjective: no MCQ — study the page image
    if (isNumType && /bb-page-img|black-book-pages|bb-page-wrap/i.test(String(q.q || ""))) {
      opts = `<div class="bb-page-study empty" style="padding:16px;text-align:center;color:var(--gray);font-size:13px">
        📖 Full book page — study the problem above, then use Next for the following page.
      </div>`;
    } else if (isNumType && typeof QuantrexQFormat !== "undefined") {
      opts = QuantrexQFormat.renderOptions(q, { selected: sel, done });
    } else if (qxOptsRenderable(q) && typeof QuantrexQFormat !== "undefined") {
      opts = QuantrexQFormat.renderOptions(q, { selected: sel, done });
    } else if (optsFailed) {
      opts = `<div class="empty qx-load-opts" style="padding:20px">Options could not load. <button type="button" class="btn-primary sm" onclick="qxRetryPracticeLoad()">Retry load</button></div>`;
    } else if (incomplete || optsIncomplete || (hasMarks && !qxOptsRenderable(q))) {
      opts = `<div class="empty qx-load-opts" style="padding:20px">Loading options… <button type="button" class="btn-soft sm" onclick="qxRetryPracticeLoad()">Retry</button></div>`;
    } else if (typeof QuantrexQFormat !== "undefined") {
      opts = QuantrexQFormat.renderOptions(q, { selected: sel, done });
    }
  } catch (optErr) {
    console.warn("renderOptions failed", optErr);
    // Emergency fallback: still show A–D from bank so practice is never blank (mapLike bug etc.)
    try {
      const rawOpts = q.options || [];
      if (rawOpts.length) {
        opts = rawOpts.map((o, i) => {
          const letter = String.fromCharCode(65 + i);
          let body = String(o || "");
          try {
            if (typeof Mx !== "undefined" && Mx.html) body = Mx.html(body);
          } catch (_) { /* keep raw */ }
          return `<button type="button" class="qx-prac-opt" data-prac-opt="${i}" ${done ? "disabled" : ""}>
            <span class="mtk-opt-letter qx-opt-circle">${letter}</span>
            <span class="qx-prac-opt-text qx-content">${body}</span>
          </button>`;
        }).join("");
      } else {
        opts = `<div class="empty qx-load-opts" style="padding:20px">Options error. <button type="button" class="btn-soft sm" onclick="qxRetryPracticeLoad()">Retry</button></div>`;
      }
    } catch (_) {
      opts = `<div class="empty qx-load-opts" style="padding:20px">Options error. <button type="button" class="btn-soft sm" onclick="qxRetryPracticeLoad()">Retry</button></div>`;
    }
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
  let qBody = "";
  try {
    if (incomplete) {
      qBody = `<div class="empty qx-load-q" style="padding:20px 0">Loading question text… <button type="button" class="btn-soft sm" onclick="qxRetryPracticeLoad()">Retry</button></div>`;
    } else if (typeof QxImgClean !== "undefined" && QxImgClean.buildQuestionBodyHtml) {
      const renderQ = typeof Mx !== "undefined" ? Mx.html : (t => t);
      const stemSrc = (QxImgClean.bestStemHtml ? QxImgClean.bestStemHtml(q, q.q) : (q._qxOrigStem || q._qxBankQ || q.q));
      qBody = QxImgClean.buildQuestionBodyHtml(q.id, stemSrc, renderQ, q);
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
  } catch (bodyErr) {
    console.warn("qBody build failed", bodyErr);
    qBody = `<div class="mtk-q-text qx-content">${String(q.q || "").replace(/</g, "&lt;").slice(0, 12000)}</div>`;
  }
  if (!qBody) qBody = `<div class="empty">Question text unavailable</div>`;
  try {
    const wantStem = String(q._qxOrigStem || q._qxBankQ || q.q || "")
      .replace(/<img\b[^>]*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const gotStem = String(qBody || "")
      .replace(/<img\b[^>]*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (wantStem.length > 20 && gotStem.length < Math.max(12, wantStem.length * 0.4)) {
      const rawText = String(q._qxOrigStem || q._qxBankQ || q.q || "")
        .replace(/<img\b[^>]*>/gi, " ")
        .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, " ");
      const painted = (typeof Mx !== "undefined" && Mx.html) ? Mx.html(rawText) : rawText;
      const textDiv = `<div class="mtk-q-text qx-content qx-stem-forced" data-qx-qid="${q.id}" style="display:block;visibility:visible;opacity:1;margin:0 0 10px">${painted}</div>`;
      if (/qx-question-body/i.test(qBody)) {
        qBody = qBody.replace(/(<div\b[^>]*class="[^"]*qx-question-body[^"]*"[^>]*>)/i, "$1" + textDiv);
      } else {
        qBody = textDiv + qBody;
      }
    }
  } catch (_) { /* */ }

  const resultHtml = done ? qxPracticeResultHtml(q, sel) : "";
  const hasSol = qxHasSolution(q);
  const solReveal = (window._qxSolRevealed && window._qxSolRevealed[q.id]) ? qxSolutionBlockHtml(q) : "";

  setTimeout(() => {
    try { loadCommunityForQuestion(q); } catch (_) { /* */ }
    const qidNow = q.id;
    try {
      const pcWarm = window._qxPracticeCtx;
      if (pcWarm && typeof QxTestEnginePerf !== "undefined" && QxTestEnginePerf.prefetchWindow) {
        QxTestEnginePerf.prefetchWindow(pcWarm.ids, pcWarm.idx, typeof getQ === "function" ? getQ : null);
      }
      const nextId = pcWarm && pcWarm.ids[pcWarm.idx + 1];
      if (nextId != null && typeof ensureQuestionLoaded === "function") {
        const nq = typeof getQ === "function" ? getQ(nextId) : null;
        if (!nq || (typeof qxIsListStubQuestion === "function" && qxIsListStubQuestion(nq))) {
          ensureQuestionLoaded(nextId).catch(() => {});
        }
      }
    } catch (_) { /* */ }
    try {
      const main = document.getElementById("app-main");
      if (main && typeof QxFigureViewer !== "undefined" && QxFigureViewer.bind) QxFigureViewer.bind(main);
      if (main && window.QxImgClean && typeof QxImgClean.ensureStemVisible === "function") {
        QxImgClean.ensureStemVisible(main, typeof getQ === "function" ? getQ(qidNow) : q);
      }
    } catch (_) { /* */ }
    // Load options when stubs / empty / numerical missing answer key
    // ALSO hydrate empty List-I/II match tables (figures missing — screenshot 831)
    // Digital books: also fill when letter-only broken packs (Rank Booster)
    (async () => {
      try {
        let qq = typeof getQ === "function" ? getQ(qidNow) : q;
        if (!qq) return;
        if (window.QxImgClean && typeof QxImgClean.loadMatchStemIndex === "function") {
          try { await QxImgClean.loadMatchStemIndex(); } catch (_) { /* */ }
          const beforeStem = String(qq.q || "");
          const beforeImgs = (beforeStem.match(/<img\b/gi) || []).length;
          if (window.QxImgClean.applyMatchStemToQuestion) {
            QxImgClean.applyMatchStemToQuestion(qq, qq._marksId || qq.id);
          }
          qxRestoreQuestionContent(qq);
          const afterStem = String(qq.q || "");
          const afterImgs = (afterStem.match(/<img\b/gi) || []).length;
          if (afterImgs > beforeImgs || afterStem.length > beforeStem.length + 40) {
            qxRenderPracticeQuestion(qidNow);
            return;
          }
        }
        if ((qq._book || qq._bookId) && qxBookOptionsBroken(qq) && !qq._marksId && qq.id != null) {
          qq._marksId = String(qq.id);
        }
        try {
          if (typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion
            && !(typeof qxHasRenderableOpts === "function" && qxHasRenderableOpts(qq))) {
            const beforeCat = (qq.options || []).join("\0");
            await QuantrexCatalog.fillQuestion(qq);
            if ((qq.options || []).join("\0") !== beforeCat && typeof qxHasRenderableOpts === "function" && qxHasRenderableOpts(qq)) {
              qxRenderPracticeQuestion(qidNow);
              return;
            }
          }
        } catch (_) { /* Marks fallback */ }
        if (!qq._marksId && !(qq.options || []).length) return;
        const emptyMatch = typeof MarksLive !== "undefined" && MarksLive.questionNeedsFigure
          && MarksLive.questionNeedsFigure(qq);
        const needOpts = typeof qxNeedsOptionsLoad === "function" && qxNeedsOptionsLoad(qq);
        if (!needOpts && !emptyMatch) return;
        const beforeQ = String(qq.q || "");
        const before = (qq.options || []).join("\0") + "|" + String(qq.correctValue || "") + "|" + beforeQ.length;
        qq._marksFillTried = true;
        if (needOpts) {
          await qxRace(qxFillOptionsFromMarks(qq), 10000);
        }
        // Force full hydrate for blank List-I/II columns / missing structures
        if ((needOpts || emptyMatch) && typeof qxHydrateQuestion === "function") {
          await qxRace(qxHydrateQuestion(qq, true), 14000);
        } else if (emptyMatch && typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion) {
          await qxRace(QuantrexCatalog.fillQuestion(qq), 14000);
        }
        const main = document.getElementById("app-main");
        const ctx = window._qxPracticeCtx;
        if (!main || !ctx || String(ctx.ids[ctx.idx]) !== String(qidNow)) return;
        const afterQ = String(qq.q || "");
        const after = (qq.options || []).join("\0") + "|" + String(qq.correctValue || "") + "|" + afterQ.length;
        if (qxHasRenderableOpts(qq)) qq._optsLoadFailed = false;
        else if (after === before && needOpts) qq._optsLoadFailed = true;
        // Re-paint when stem gained figures / longer List-I/II HTML
        if (after !== before || /<img\b/i.test(afterQ) || afterQ.length > beforeQ.length + 40) {
          qxRenderPracticeQuestion(qidNow);
        }
      } catch (_) {
        const qq = typeof getQ === "function" ? getQ(qidNow) : null;
        if (qq && typeof qxNeedsOptionsLoad === "function" && qxNeedsOptionsLoad(qq)) {
          qq._optsLoadFailed = true;
          qq._marksFillTried = true;
          if (window._qxPracticeCtx) qxRenderPracticeQuestion(qidNow);
        }
      }
    })();
  }, 0);

  // Offline paper meta (year/date/shift) when API left only "JEE Main"
  if (typeof QuantrexStrip !== "undefined" && QuantrexStrip.enrichQuestionPaperMetaSync) {
    QuantrexStrip.enrichQuestionPaperMetaSync(q);
  }
  // Paper only (exam / date / shift) — no repeated subject/chapter chips
  const paperMeta = typeof qxPaperMetaBlock === "function"
    ? qxPaperMetaBlock(q)
    : (typeof QuantrexStrip !== "undefined" && QuantrexStrip.paperMetaHtml
      ? QuantrexStrip.paperMetaHtml(q, { includeChapter: false, includeSubject: false })
      : (sourceLabel
        ? `<div class="qx-paper-meta"><div class="qx-paper-meta-chips"><span class="qx-paper-chip qx-paper-full">${String(sourceLabel).replace(/</g, "&lt;")}</span></div></div>`
        : ""));
  // Async fill from data/qid_paper shard then re-render once if improved
  if (typeof QuantrexStrip !== "undefined" && QuantrexStrip.enrichQuestionPaperMeta
    && !(QuantrexStrip.paperMetaLooksRich && QuantrexStrip.paperMetaLooksRich(q.source || q.paperSource))) {
    const qidEnrich = q.id;
    QuantrexStrip.enrichQuestionPaperMeta(q).then((changed) => {
      if (!changed) return;
      const ctx = window._qxPracticeCtx;
      if (!ctx || String(ctx.ids[ctx.idx]) !== String(qidEnrich)) return;
      if (typeof qxRenderPracticeQuestion === "function") qxRenderPracticeQuestion(qidEnrich);
    }).catch(() => {});
  }

  if (typeof AllenTestUI !== "undefined" && AllenTestUI.practiceHtml) {
    try {
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
    } catch (allenErr) {
      console.warn("AllenTestUI.practiceHtml failed", allenErr);
      // fall through to simple layout below
    }
  }

  const fontScale = typeof getTestFontScale === "function" ? getTestFontScale() : "medium";
  const fontLbl = fontScale === "xlarge" ? "XL" : (fontScale.charAt(0).toUpperCase() + fontScale.slice(1));
  const bookPageCls = (q._book || q._bookId) ? " qx-book-q" : "";
  return `<div class="qx-practice-page qx-font-host${bookPageCls}" data-font-scale="${fontScale}">
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
        <button type="button" class="qx-bm-btn ${bm ? "on" : ""}" onclick="toggleBm(${typeof qxJsId === "function" ? qxJsId(q.id) : JSON.stringify(String(q.id))})" title="${bm ? "Remove bookmark" : "Bookmark question"}" aria-pressed="${bm ? "true" : "false"}"><svg class="qx-bm-svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 3.5h12a1.5 1.5 0 0 1 1.5 1.5v15.2a.9.9 0 0 1-1.4.75L12 16.6l-6.1 4.35A.9.9 0 0 1 4.5 20.2V5A1.5 1.5 0 0 1 6 3.5z" fill="currentColor"/></svg><span class="qx-bm-lbl">${bm ? "Saved" : "Bookmark"}</span></button>
        <button type="button" class="qx-bm-btn qx-bm-group" onclick="toggleBmWithGroup(${typeof qxJsId === "function" ? qxJsId(q.id) : JSON.stringify(String(q.id))})" title="Save to notebook group"><svg class="qx-bm-svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h3.1l1.4 1.6h8.5a2 2 0 0 1 2 2v8.4a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10z" fill="currentColor"/></svg><span class="qx-bm-lbl">Group</span></button>
        <button type="button" class="qx-report-fab" onclick="openQuestionReport(${typeof qxJsId === "function" ? qxJsId(q.id) : JSON.stringify(String(q.id))})" title="Report Question">🚩 Report</button>
      </div>
    </header>
    <div class="qx-prac-meta">
      ${qTypeBadge}
      ${typeof qxDifficultyTag === "function" ? qxDifficultyTag(q) : ""}
      ${(() => {
        // Chapter once here; subject already in header elsewhere when using Allen UI
        const ch = (typeof QuantrexStrip !== "undefined" && QuantrexStrip.humanChapter)
          ? QuantrexStrip.humanChapter(q)
          : (q.chapter && !/^[a-f0-9]{24}$/i.test(String(q.chapter)) ? q.chapter : "");
        return ch ? `<span class="tag tag-chapter">${ch}</span>` : "";
      })()}
      ${sv ? `<span class="tag ${sv.correct ? "tag-ok" : "tag-no"}">${sv.correct ? "✓ Solved" : "✗ Wrong"}</span>` : ""}
    </div>
    ${paperMeta}
    ${diagramSlot}
    ${String(qBody || "").includes("qx-question-body")
      ? qBody
      : `<div class="qx-prac-q qx-content qx-q-text-only" data-qx-qid="${q.id}">${qBody}</div>`}
    <div class="${optsClass}" id="qaOpts">${opts}</div>
    <div class="eg-action-row">
      <div class="eg-check-wrap">${done || incomplete ? "" : `<button type="button" class="eg-check qx-prac-submit" id="qxPracSubmit" ${canSubmit ? "" : "disabled"}>Check Answer</button>`}</div>
      <button type="button" class="eg-note" id="qxPracNote">Add a Note</button>
    </div>
    <div id="qaSolReveal">${solReveal}</div>
    <div id="qaResult">${resultHtml}</div>
    <div class="qx-prac-foot eg-foot">
      <div class="eg-foot-left">
        <label class="eg-show"><span class="eg-switch"><input type="checkbox" id="qxPracShowAns"${pc.showAnswer ? " checked" : ""}><span class="eg-switch-knob" aria-hidden="true"></span></span> Show Answer</label>
      </div>
      <div class="eg-foot-right">
        <button type="button" class="eg-btn" id="qxPracClear">Clear Response</button>
        <button type="button" class="eg-btn" onclick="qxPracticeNav(-1)" ${pc.idx <= 0 ? "disabled" : ""}>← Previous</button>
        <button type="button" class="eg-btn eg-btn-next" onclick="qxPracticeNav(1)" ${pc.idx >= total - 1 ? "disabled" : ""}>Next →</button>
      </div>
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
        go("question", ctx.ids[idx]);
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
  qxPracticeWireExtra(scope, ctx, qid);
}

function qxPracticeWireExtra(scope, ctx, qid) {
  if (!scope || !ctx || qid == null) return;
  try {
    if (typeof ExamgoalTestUI !== "undefined" && ExamgoalTestUI.ensureCss) ExamgoalTestUI.ensureCss();
  } catch (_) { /* */ }
  const q = typeof getQ === "function" ? getQ(qid) : null;

  const show = scope.querySelector("#qxPracShowAns");
  if (show) {
    show.checked = !!ctx.showAnswer;
    if (ctx.showAnswer && q) {
      if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.revealAnswers) {
        QuantrexQFormat.revealAnswers(scope, q, ctx.selected[qid]);
      }
      if (typeof qxHasSolution === "function" && qxHasSolution(q) && typeof qxRevealSolution === "function") {
        qxRevealSolution(qid);
      }
    }
    show.onchange = function () {
      ctx.showAnswer = !!show.checked;
      if (ctx.showAnswer) {
        if (q && typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.revealAnswers) {
          QuantrexQFormat.revealAnswers(scope, q, ctx.selected[qid]);
        }
        if (q && typeof qxHasSolution === "function" && qxHasSolution(q) && typeof qxRevealSolution === "function") {
          qxRevealSolution(qid);
        }
      } else if (typeof qxRenderPracticeQuestion === "function") {
        qxRenderPracticeQuestion(qid);
      }
    };
  }

  const clear = scope.querySelector("#qxPracClear");
  if (clear) {
    clear.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      delete ctx.selected[qid];
      delete ctx.done[qid];
      if (window._qxSolRevealed) delete window._qxSolRevealed[qid];
      if (typeof qxRenderPracticeQuestion === "function") qxRenderPracticeQuestion(qid);
    };
  }

  const note = scope.querySelector("#qxPracNote");
  if (note) {
    note.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (typeof ExamgoalTestUI !== "undefined" && ExamgoalTestUI.openNote) {
        ExamgoalTestUI.openNote(qid, note);
      }
    };
  }
}

function qxRevealSolution(qid) {
  const q = getQ(qid);
  if (!q || !qxHasSolution(q)) {
    // Do NOT auto-open Jovi during practice — only when student taps the orange FAB
    showToast("⚠️ No solution available — open Jovi (orange robot) if you want AI help");
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
    if (solBad && typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion) {
      q = await QuantrexCatalog.fillQuestion(q);
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
  STATE.markSolved(qid, graded.correct || graded.partial, {
    subject: q.subject,
    chapter: q.chapter,
    exam: (typeof STATE !== "undefined" && STATE.exam) || q.exam
  });
  const res = document.getElementById("qaResult");
  if (res) {
    res.innerHTML = qxPracticeResultHtml(q, response);
    if (typeof Mx !== "undefined") Mx.afterRender(res);
  }
  const sub = main.querySelector("#qxPracSubmit");
  if (sub) sub.disabled = true;
  // Practice stays clean — no auto Jovi panel / inline card (user opens FAB only)
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
  if (diff !== "all") {
    pool = pool.filter(q =>
      (typeof qxNormDifficulty === "function" ? qxNormDifficulty(q.difficulty) : q.difficulty) === diff
    );
  }
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

function qxPlanDisplayName(planId) {
  const names = {
    all_free: "All courses free",
    trial_7: "7-Day Pass",
    plan_trial_7: "7-Day Pass",
    jee_ts: "JEE Main Test Series",
    plan_jee_ts: "JEE Main Test Series",
    eng_complete: "Engineering Complete",
    plan_eng_complete: "Engineering Complete",
    eng_combo: "Engineering Combo",
    plan_eng_combo: "Engineering Combo",
    med_complete: "Medical Complete",
    plan_med_complete: "Medical Complete",
    admin_full: "Admin · full access",
    all_free: "All courses free"
  };
  const key = String(planId || "");
  return names[key] || names[key.replace(/^plan_/, "")] || "Quantrex course";
}

function qxOpenPaidPlan(planId) {
  const k = String(planId || "").replace(/^plan_/, "");
  let exam = (typeof STATE !== "undefined" && STATE.exam) || "Engineering";
  if (k === "med_complete") exam = "Medical";
  else if (k === "jee_ts" || k === "eng_complete" || k === "eng_combo") exam = "Engineering";
  if (typeof switchExam === "function") switchExam(exam, { open: "dashboard" });
  else if (typeof go === "function") go("dashboard");
}

function qxDashPlanChip() {
  try {
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.isAdmin && QuantrexAccess.isAdmin()) {
      return '<button type="button" class="qx-premium-pill dash-premium-btn" onclick="go(\'profile\')">Admin · full access</button>';
    }
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.ALL_COURSES_FREE) {
      return '<button type="button" class="qx-premium-pill dash-premium-btn qx-plan-chip" onclick="go(\'dashboard\')">All courses free</button>';
    }
    const s = typeof QuantrexAccess !== "undefined" && QuantrexAccess.paidSub ? QuantrexAccess.paidSub() : null;
    if (s && s.active) {
      const label = qxPlanDisplayName(s.planId);
      const left = s.expiresAt ? Math.max(0, Math.ceil((Number(s.expiresAt) - Date.now()) / 86400000)) : 0;
      const sub = left ? (label + " · " + left + "d") : label;
      return '<button type="button" class="qx-premium-pill dash-premium-btn qx-plan-chip" onclick="qxOpenPaidPlan(\'' +
        String(s.planId || "").replace(/'/g, "") + '\')">Current plan · ' + sub + " →</button>";
    }
  } catch (_) {}
  return '<button type="button" class="qx-premium-pill dash-premium-btn" onclick="go(\'premium\')">QUANTREX PREMIUM</button>';
}

function qxFmtInDate(ms) {
  const n = Number(ms || 0);
  if (!n) return "—";
  try {
    return new Date(n).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch (_) {
    return "—";
  }
}

function qxEscDesk(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function qxProfileCoursesHtml() {
  let s = null;
  let admin = false;
  try {
    admin = typeof QuantrexAccess !== "undefined" && QuantrexAccess.isAdmin && QuantrexAccess.isAdmin();
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.paidSub) s = QuantrexAccess.paidSub();
  } catch (_) { s = null; }
  let u = {};
  try { u = JSON.parse(localStorage.getItem("quantrex_user") || "null") || {}; } catch (_) { u = {}; }
  const p = typeof QxProfile !== "undefined" ? QxProfile.get() : {};
  const cls = p.className ? ("Class " + p.className) : "—";
  const exams = (p.exams && p.exams.length) ? p.exams.join(" · ") : (p.exam || u.exam || "—");
  const loc = [p.district, p.state].filter(Boolean).join(", ") || "—";
  const serial = "QX-" + String(u.uid || "GUEST").replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
  const board = p.board || u.board || (typeof localStorage !== "undefined" ? (localStorage.getItem("quantrex_board") || "") : "") || "—";
  const desk = '<div class="qx-course-box qx-student-desk"><h3>Student information</h3>' +
    '<div class="qx-desk-grid">' +
    "<div><span>Enrollment no</span><b>" + qxEscDesk(serial) + "</b></div>" +
    "<div><span>Class / batch</span><b>" + qxEscDesk(cls) + "</b></div>" +
    "<div><span>Target exam</span><b>" + qxEscDesk(exams) + "</b></div>" +
    "<div><span>Board</span><b>" + qxEscDesk(board) + "</b></div>" +
    "<div><span>Campus</span><b>" + qxEscDesk(loc) + "</b></div>" +
    "<div><span>Phone</span><b>" + qxEscDesk(p.phone || u.phone || "—") + "</b></div>" +
    "<div><span>Email</span><b>" + qxEscDesk(p.email || u.email || "—") + "</b></div>" +
    "<div><span>Student ID</span><b>" + qxEscDesk(u.uid || "Guest") + "</b></div>" +
    "</div></div>";

  if (admin) {
    return desk +
      '<div class="qx-course-box"><h3>Course details</h3><p>Admin · full access on every Quantrex course.</p>' +
      "<div class=\"qx-desk-grid\"><div><span>Start date</span><b>Academy owner</b></div>" +
      "<div><span>End date</span><b>No expiry</b></div>" +
      "<div><span>Access</span><b>Engineering · Medical · Test series</b></div></div>" +
      '<a class="qx-access-go" href="app.html">Open Academy desk</a></div>' +
      '<div class="qx-course-box" id="qxPurchaseMount"><h3>Purchase details</h3><p class="sec-desc">Loading receipts…</p></div>';
  }
  if (!s || !s.active) {
    return desk +
      '<div class="qx-course-box"><h3>Course details</h3><p>All Quantrex courses are free. Open Engineering, Medical, and JEE Test Series from the dashboard.</p>' +
      '<a class="qx-access-go" href="app.html">Open Academy desk</a></div>' +
      '<div class="qx-course-box" id="qxPurchaseMount"><h3>Purchase details</h3><p class="sec-desc">No purchase needed.</p></div>';
  }
  const key = String(s.planId || "");
  const label = qxPlanDisplayName(key);
  const exp = Number(s.expiresAt || 0);
  const start = Number(s.startedAt || 0);
  const left = exp ? Math.max(0, Math.ceil((exp - Date.now()) / 86400000)) : 0;
  const expTxt = qxFmtInDate(exp);
  const startTxt = qxFmtInDate(start);
  const soon = left > 0 && left <= 1;
  const status = soon ? "Expires tomorrow" : (left ? ("Active · " + left + " days left") : "Active");
  const pid = key.replace(/'/g, "");
  const amount = s.amount ? ("₹" + Number(s.amount).toLocaleString("en-IN")) : "—";
  const order = s.orderId || s.paymentId || "—";
  const feats = Array.isArray(s.features) ? s.features.map(function (f) {
    return f === "eng" ? "Engineering" : f === "med" ? "Medical" : f === "jee_ts" ? "JEE Main Test Series" : f;
  }).join(" · ") : "—";
  return desk +
    '<div class="qx-course-box"><h3>Course details</h3>' +
    '<button type="button" class="qx-course-row qx-course-hit" onclick="qxOpenPaidPlan(\'' + pid + '\')">' +
    "<div><b>" + qxEscDesk(label) + "</b><span>" + qxEscDesk(status) + "</span></div>" +
    (soon
      ? '<a class="qx-access-go" href="pay.html" onclick="event.stopPropagation()">Renew now</a>'
      : '<span class="qx-access-go">Access course →</span>') +
    "</button>" +
    '<div class="qx-desk-grid">' +
    "<div><span>Start date</span><b>" + qxEscDesk(startTxt) + "</b></div>" +
    "<div><span>End date</span><b>" + qxEscDesk(expTxt) + "</b></div>" +
    "<div><span>Validity</span><b>" + (left ? (left + " days left") : "Active") + "</b></div>" +
    "<div><span>Included</span><b>" + qxEscDesk(feats) + "</b></div>" +
    "</div></div>" +
    '<div class="qx-course-box" id="qxPurchaseMount"><h3>Purchase details</h3>' +
    '<div class="qx-desk-grid">' +
    "<div><span>Order / receipt</span><b>" + qxEscDesk(order) + "</b></div>" +
    "<div><span>Amount</span><b>" + qxEscDesk(amount) + "</b></div>" +
    "<div><span>Purchase date</span><b>" + qxEscDesk(startTxt) + "</b></div>" +
    "<div><span>Plan</span><b>" + qxEscDesk(label) + "</b></div>" +
    '</div><p class="sec-desc" id="qxPurchaseHint">Receipts from Quantrex pay desk load here.</p></div>';
}

async function qxFillStudentDesk(root) {
  const mount = (root || document).querySelector("#qxPurchaseMount");
  if (!mount) return;
  let uid = "";
  try {
    const u = JSON.parse(localStorage.getItem("quantrex_user") || "null") || {};
    uid = u.uid || "";
  } catch (_) { uid = ""; }
  if (!uid || String(uid).indexOf("guest_") === 0) return;
  let rows = [];
  let student = null;
  try {
    if (typeof QuantrexDB !== "undefined") {
      if (QuantrexDB.getStudentRecord) student = await QuantrexDB.getStudentRecord(uid);
      if (QuantrexDB.listMyPurchases) rows = await QuantrexDB.listMyPurchases(uid);
    }
  } catch (_) { rows = []; }
  if (student && (student.subscriptionPlan || student.subscriptionStartDate || student.subscriptionEndDate)) {
    const start = student.subscriptionStartDate && student.subscriptionStartDate.toDate
      ? student.subscriptionStartDate.toDate().getTime()
      : Number(student.subscriptionStartDate || 0);
    const end = student.subscriptionEndDate && student.subscriptionEndDate.toDate
      ? student.subscriptionEndDate.toDate().getTime()
      : Number(student.subscriptionEndDate || 0);
    const extra = (root || document).querySelector(".qx-student-desk .qx-desk-grid");
    if (extra && start) {
      const hint = extra.querySelector("[data-qx-enroll]");
      if (!hint) {
        extra.insertAdjacentHTML("beforeend",
          "<div data-qx-enroll><span>Course start</span><b>" + qxEscDesk(qxFmtInDate(start)) + "</b></div>" +
          "<div><span>Course end</span><b>" + qxEscDesk(end ? qxFmtInDate(end) : "—") + "</b></div>" +
          "<div><span>Enrollment status</span><b>" + qxEscDesk(student.subscriptionStatus || student.status || "active") + "</b></div>");
      }
    }
  }
  if (!rows || !rows.length) return;
  const html = rows.slice(0, 8).map(function (r) {
    const when = qxFmtInDate(r.ts);
    const amt = r.amount ? ("₹" + Number(r.amount).toLocaleString("en-IN")) : "—";
    return "<div class=\"qx-course-row\"><div><b>" + qxEscDesk(r.course || "Quantrex course") +
      "</b><span>" + qxEscDesk(when) + " · " + qxEscDesk(r.orderId || "receipt") + "</span></div><b>" + qxEscDesk(amt) + "</b></div>";
  }).join("");
  const hint = mount.querySelector("#qxPurchaseHint");
  if (hint) hint.outerHTML = html;
  else mount.insertAdjacentHTML("beforeend", html);
}

// ============ PROFILE ============
function viewProfile() {
  const exam = EXAMS[STATE.exam];
  const solved = STATE.solved;
  const correct = solved.filter(s => s.correct).length;
  const accuracy = solved.length ? Math.round(correct / solved.length * 100) : 0;
  const points = correct * 10;
  const loggedIn = qxIsLoggedIn();
  let u = {};
  try { u = JSON.parse(localStorage.getItem("quantrex_user") || "null") || {}; } catch (e) { u = {}; }
  const p = typeof QxProfile !== "undefined" ? QxProfile.get() : {};
  const userName = p.name || u.name || u.email || u.phone || "Guest";
  const subLine = typeof QxProfile !== "undefined" && QxProfile.planLabel ? QxProfile.planLabel() : "Explorer pass";
  const cls = p.className ? ("Class " + p.className) : "Class not set";
  const loc = [p.district, p.state].filter(Boolean).join(", ") || "India";
  const exams = (p.exams && p.exams.length) ? p.exams.join(" · ") : (exam.name || STATE.exam);
  const serial = "QX-" + String(u.uid || "GUEST").replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
  const initials = String(userName).replace(/[^A-Za-z]/g, " ").trim().split(" ").map(function (w) { return w.charAt(0); }).join("").slice(0, 2).toUpperCase() || "Q";
  const authBtns = loggedIn
    ? `<button type="button" class="btn-soft" onclick="QxProfile.ensure({reason:'profile'})">Edit ID</button>
       <button type="button" class="btn-soft" onclick="QxProfile.doLogout()">Sign out</button>`
    : `<a class="btn-primary" href="login.html" style="display:inline-block;text-decoration:none;padding:10px 16px;border-radius:10px">Create Academy ID</a>`;

  return `${topbar("Academy ID", loggedIn ? "Your Quantrex desk — not a coaching clone" : "Guest explorer")}
  <div class="qx-id-card">
    <div class="qx-id-top">
      <div class="qx-id-av">${loggedIn ? initials : "Q"}</div>
      <div>
        <h2>${loggedIn ? userName : "Explorer"}</h2>
        <p>${cls} · ${exams}</p>
      </div>
    </div>
    <div class="qx-id-meta">
      <div><span>Plan</span><b>${subLine}</b></div>
      <div><span>Campus</span><b>${loc}</b></div>
      <div><span>Phone</span><b>${p.phone || u.phone || "—"}</b></div>
      <div><span>Email</span><b>${p.email || u.email || "—"}</b></div>
    </div>
    <div class="qx-id-stats">
      <div><strong>${solved.length}</strong><small>Solved</small></div>
      <div><strong>${accuracy}%</strong><small>Accuracy</small></div>
      <div><strong>${points}</strong><small>XP</small></div>
      <div><strong>${STATE.bookmarks.length}</strong><small>Saved</small></div>
    </div>
    <div class="qx-id-actions">${authBtns}
      <button type="button" class="btn-primary" id="qxOpenSettingsBtn" onclick="typeof QxSettings!=='undefined'?QxSettings.open():go('settings')">Settings</button>
    </div>
    <div class="qx-id-serial">${serial}</div>
  </div>
  ${qxProfileCoursesHtml()}
  <h3 class="sec-title">Exam desk</h3>
  <div class="exam-switch">
    ${Object.entries(EXAMS).map(([k, e]) => {
      const soon = !!e.isComingSoon;
      const ic = k === "Engineering" ? "⚙️" : k === "Medical" ? "⚕️" : k === "Defence" ? "🎖️" : "📚";
      return `<button class="exam-opt ${STATE.exam === k ? "active" : ""} ${soon ? "soon" : ""}" style="${STATE.exam === k ? "border-color:" + e.color : ""}${soon ? ";opacity:.72" : ""}" onclick="switchExam('${k}',{open:'dashboard'})" ${soon ? 'title="Coming Soon"' : ""}>
        <span class="exam-opt-ic" style="background:${e.color}">${ic}</span>
        <strong>${e.name}${soon ? " · Soon" : ""}</strong>
      </button>`;
    }).join("")}
  </div>
  <div class="danger-zone">
    <button class="btn-soft danger" onclick="resetData()">Reset practice history</button>
  </div>`;
}

function qxSyncTopExamBar() {
  const active = (typeof STATE !== "undefined" && STATE.exam) || "Engineering";
  document.querySelectorAll(".qx-top-exam[data-exam]").forEach(btn => {
    btn.classList.toggle("on", btn.getAttribute("data-exam") === active);
  });
  try { if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.paintLocks) QuantrexAccess.paintLocks(); } catch (_) {}
  const pill = document.getElementById("examPill");
  const pillTop = document.getElementById("examPillTop");
  const name = (typeof EXAMS !== "undefined" && EXAMS[active] && EXAMS[active].name) || active;
  if (pill) pill.textContent = name;
  if (pillTop) pillTop.textContent = name;
}

function qxBindTopExamBar() {
  const bar = document.getElementById("qxTopExams");
  if (!bar || bar._qxBound) return;
  bar._qxBound = true;
  bar.querySelectorAll(".qx-top-exam[data-exam]").forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const key = btn.getAttribute("data-exam");
      if (!key) return;
      if (typeof switchExam === "function") switchExam(key, { open: "dashboard" });
    };
  });
  qxSyncTopExamBar();
}

function switchExam(key, opts) {
  opts = opts || {};
  // Old Foundation bookmark → Academic (Class 7–12)
  if (key === "Foundation") key = "Academic";
  if (typeof qxIsExamComingSoon === "function" && qxIsExamComingSoon(key)) {
    showToast("📚 This track is Coming Soon");
    return;
  }
  if (typeof EXAMS === "undefined" || !EXAMS[key]) {
    showToast("⚠️ Unknown exam track");
    return;
  }
  STATE.exam = key;
  localStorage.setItem("quantrex_exam", key);
  practiceFilter = { subject: "all", chapter: "all" };
  practicePage = 1;
  try {
    if (key === "Academic") {
      // Product: Class folders → 11/12 use JEE (filterClass); 7–10 Coming Soon
      localStorage.setItem("quantrex_bank", "class_11");
      if (typeof _currentBankSlug !== "undefined") _currentBankSlug = "class_11";
    } else if (key === "Defence") {
      localStorage.setItem("quantrex_bank", "nda");
      if (typeof _currentBankSlug !== "undefined") _currentBankSlug = "nda";
    } else if (key === "Engineering") {
      localStorage.setItem("quantrex_bank", "jee_main");
      if (typeof _currentBankSlug !== "undefined") _currentBankSlug = "jee_main";
    } else if (key === "Medical") {
      localStorage.setItem("quantrex_bank", "neet");
      if (typeof _currentBankSlug !== "undefined") _currentBankSlug = "neet";
    }
  } catch (_) { /* */ }
  if (typeof qxSyncTopExamBar === "function") qxSyncTopExamBar();
  showToast(`✅ ${EXAMS[key].name}`);
  // Top bar: open that track's home desk (Engineering and Medical both dashboard).
  const dest = opts.open || "dashboard";
  if (dest === "cpyqb" && typeof go === "function") {
    go("cpyqb", { step: "exams", forceExamList: true });
  } else if (typeof go === "function") {
    go(dest === "dashboard" ? "dashboard" : dest);
  }
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

function qxLoadLogoHtml(msg) {
  const t = String(msg || "Loading questions…");
  return '<div class="qx-load-logo" role="status" aria-live="polite">' +
    '<div class="qx-load-orbit"><img src="/assets/quantrex-logo-3d-64.png?v=qxfix110" alt="Quantrex" class="qx-ui-brand-logo" width="64" height="64"></div>' +
    "<p>" + t + "</p>" +
    "</div>";
}

function qxShowBootLoading() {
  const main = document.getElementById("app-main");
  if (main && !main.innerHTML.trim()) {
    main.innerHTML = qxLoadLogoHtml("Opening Quantrex Academy…");
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
  if (typeof bindMarksGoDelegate === "function") bindMarksGoDelegate();
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
  qxSetExamPillSafe();
  if (typeof qxBindTopExamBar === "function") qxBindTopExamBar();
  if (typeof qxSyncTopExamBar === "function") qxSyncTopExamBar();
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
  setTimeout(qxUpdateAuthChrome, 400);
  setTimeout(qxUpdateAuthChrome, 1600);
  // Deep-link / refresh restore — NEVER force dashboard if user was mid-flow
  const route = qxParseRouteFromLocation();
  // Never prefetch 46MB bank on cold #question / #test — that competes with fast path and freezes tab
  if (typeof QxPerf !== "undefined") {
    if (route.view !== "question" && route.view !== "test") {
      QxPerf.prefetchPrimaryBank();
    }
    QxPerf.onIdle(() => QxPerf.lazyImages(document));
  }
  try {
    _qxHistoryIgnore = true;
    go(route.view || "dashboard", route.payload);
  } finally {
    _qxHistoryIgnore = false;
  }
  // Ensure URL reflects restored route (refresh-safe)
  try {
    const want = qxBuildHash(route.view || "dashboard", route.payload);
    if (location.hash !== want) {
      history.replaceState({ view: route.view, payload: route.payload }, "", want);
    }
  } catch (_) { /* */ }
}

function qxShowSafeLoginWelcome() {
  try {
    if (sessionStorage.getItem("qx_just_signed_in") !== "1") return;
    sessionStorage.removeItem("qx_just_signed_in");
  } catch (_) { return; }
  let name = "there";
  try {
    const u = JSON.parse(localStorage.getItem("quantrex_user") || "null");
    if (u && u.name) name = String(u.name).split(" ")[0];
  } catch (_) { /* */ }
  const el = document.createElement("div");
  el.className = "qx-safe-welcome";
  el.setAttribute("role", "status");
  el.innerHTML = `<div class="qx-safe-welcome-card">
    <strong>Welcome to Quantrex Academy</strong>
    <p>Hi ${name.replace(/</g, "")} — you are signed in safely. Your practice stays on Quantrex Academy. Nothing here is public.</p>
    <button type="button" class="btn-primary sm" id="qxSafeWelcomeOk">Continue</button>
  </div>`;
  document.body.appendChild(el);
  const close = () => { el.classList.add("out"); setTimeout(() => el.remove(), 280); };
  const btn = el.querySelector("#qxSafeWelcomeOk");
  if (btn) btn.onclick = close;
  setTimeout(close, 5600);
}

document.addEventListener("DOMContentLoaded", () => {
  qxShowBootLoading();
  try { qxShowSafeLoginWelcome(); } catch (_) { /* */ }

  // ALWAYS boot UI immediately — never wait on Firebase (was main "stuck on loading" feel)
  qxScheduleBoot();

  if (typeof QuantrexDB === "undefined" || !QuantrexDB.init()) {
    return;
  }

  let _qxSyncRenderTimer = null;
  QuantrexDB.onDataChange = () => {
    if (currentView === "question" || currentView === "test") return;
    if (document.body.classList.contains("allen-practice-active") || document.body.classList.contains("marks-test-active")) return;
    const pill = document.getElementById("examPill");
    const pillTop = document.getElementById("examPillTop");
    if (pill) pill.textContent = EXAMS[STATE.exam].name;
    if (pillTop) pillTop.textContent = EXAMS[STATE.exam].name;
    if (typeof qxSyncTopExamBar === "function") qxSyncTopExamBar();
    clearTimeout(_qxSyncRenderTimer);
    _qxSyncRenderTimer = setTimeout(() => {
      if (!currentView || currentView === "question" || currentView === "test") return;
      if (document.body.classList.contains("allen-practice-active") || document.body.classList.contains("marks-test-active")) return;
      // Avoid full re-render storms — only update chrome for progress sync
    }, 1200);
  };

  QuantrexDB.watchAuth((user, loggedIn) => {
    _qxAuthResolved = true;
    if (loggedIn && user) {
      if (localStorage.getItem("quantrex_exam")) {
        const saved = localStorage.getItem("quantrex_exam");
        STATE.exam = qxIsExamComingSoon(saved) ? "Engineering" : saved;
        if (qxIsExamComingSoon(saved)) localStorage.setItem("quantrex_exam", "Engineering");
      }
      QuantrexDB.seedAppMeta().catch(() => {});
      if (typeof QuantrexPayments !== "undefined") QuantrexPayments.handleReturnQuery().catch(() => {});
      qxSyncPaidAccess();
      qxUpdateAuthChrome();
      try {
        if (typeof QuantrexDB !== "undefined" && QuantrexDB.flushProgress) QuantrexDB.flushProgress();
      } catch (_) {}
    } else {
      try {
        if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.applyRemoteSub) {
          QuantrexAccess.applyRemoteSub({ active: false });
        }
      } catch (_) {}
      qxUpdateAuthChrome();
    }
  });
});

// override go() to handle test/question pseudo views
const _origGo = go;
go = function(view, payload) {
  currentView = view;
  if (typeof QuantrexAccess !== "undefined" && !QuantrexAccess.allow(view, payload)) {
    finishRender(QuantrexAccess.paywallHtml(view, payload));
    return;
  }
  if (view !== "test" && view !== "question" && !qxRequireLogin(view, payload)) return;
  const main = document.getElementById("app-main");
  if (main) main.scrollTop = 0;
  _listPage = 1;
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const navMap = { allqs: "allqs", ncert: "allqs", board: "allqs", cpyqb: "cpyqb", books: "books", tests: "tests", custom: "tests", testseries: "tests", pyqmock: "tests", analytics: "analytics", search: "search", quickconcepts: "quickconcepts", premium: "premium", assignments: "dashboard", teacher: "dashboard" };
  const navView = navMap[view] || view;
  const navEl = document.querySelector(`.nav-item[data-view="${navView}"]`);
  if (navEl) navEl.classList.add("active");

  // Deep-link + session so refresh never dumps user on home
  qxPushHistory(view, payload);

  if (view !== "test" && view !== "question" && typeof qxClearBlockingMount === "function") {
    qxClearBlockingMount();
    document.body.classList.remove("allen-cbt-active", "allen-practice-active", "marks-instr-active");
  }

  if (view === "question") {
    // Keep practice idx in sync with payload id
    try {
      if (window._qxPracticeCtx && window._qxPracticeCtx.ids) {
        const i = window._qxPracticeCtx.ids.findIndex(x => String(x) === String(payload));
        if (i >= 0) window._qxPracticeCtx.idx = i;
      }
    } catch (_) { /* */ }

    // Instant path: if question already in memory → paint immediately (<100ms target)
    const mainEl0 = document.getElementById("app-main");
    if (typeof AllenTestUI !== "undefined") enterAllenPracticeMode();
    const cachedQ = typeof getQ === "function" ? getQ(payload) : null;
    const isStubQ = typeof qxIsListStubQuestion === "function"
      ? qxIsListStubQuestion(cachedQ)
      : !!(cachedQ && (cachedQ._listStub || /^Loading question/i.test(String(cachedQ.q || ""))));
    // Never paint list stubs as "open" — hydrate first (Amines topic open bug)
    if (cachedQ && !isStubQ && (qxHasRenderableOpts(cachedQ) || cachedQ.questionType === "numerical" || cachedQ.correctValue != null || (cachedQ.q && String(cachedQ.q).replace(/<[^>]+>/g, "").trim().length > 12))) {
      qxRenderPracticeQuestion(payload);
      // Warm next 1–2 ids in background (no await)
      try {
        const ctx = window._qxPracticeCtx;
        if (ctx && ctx.ids && typeof MarksLive !== "undefined" && MarksLive.prefetchQuestions) {
          const i = ctx.idx || 0;
          const near = ctx.ids.slice(i + 1, i + 3);
          if (near.length) MarksLive.prefetchQuestions(near).catch(() => {});
        }
      } catch (_) { /* */ }
      // Still fill incomplete options in background without blanking UI
      if (cachedQ._marksId && !(cachedQ._book || cachedQ._bookId) && typeof qxNeedsOptionsLoad === "function" && qxNeedsOptionsLoad(cachedQ)) {
        qxRace(qxFillOptionsFromMarks(cachedQ), 8000).then(() => {
          cachedQ._marksFillTried = true;
          if (qxHasRenderableOpts(cachedQ) || (cachedQ.options || []).some(qxOptionHasContent)) {
            cachedQ._fullFetched = true;
            cachedQ._optsLoadFailed = false;
          } else {
            cachedQ._optsLoadFailed = true;
          }
          if (currentView === "question") {
            const cur = window._qxPracticeCtx && window._qxPracticeCtx.ids
              ? window._qxPracticeCtx.ids[window._qxPracticeCtx.idx]
              : null;
            if (String(cur) === String(payload) || String(cachedQ.id) === String(payload)) {
              qxMaybeRefreshPractice(payload);
            }
          }
        }).catch(() => {
          cachedQ._marksFillTried = true;
          cachedQ._optsLoadFailed = true;
        });
      }
      return;
    }
    if (mainEl0 && !cachedQ) {
      mainEl0.innerHTML = `<div class="empty qx-q-skeleton" style="padding:48px;text-align:center;max-width:520px;margin:40px auto">
        <div style="height:14px;background:rgba(148,163,184,.25);border-radius:8px;margin-bottom:12px;animation:qxPulse 1.2s ease infinite"></div>
        <div style="height:14px;background:rgba(148,163,184,.18);border-radius:8px;width:80%;margin:0 auto 20px;animation:qxPulse 1.2s ease infinite"></div>
        <p style="font-weight:600;color:var(--gray)">Loading question…</p>
        <p style="font-size:12px;color:var(--gray);margin-top:8px">Instant path · no full bank download</p>
      </div>
      <style>@keyframes qxPulse{0%,100%{opacity:1}50%{opacity:.45}}</style>`;
    }

    (async () => {
      try {
        let q = getQ(payload);
        // Prefer fast path first (shard + Marks API)
        if (!q && typeof ensureQuestionLoaded === "function") {
          q = await ensureQuestionLoaded(payload);
        }
        // List stub — Quantrex catalog / Firebase only
        if (q && (typeof qxIsListStubQuestion === "function" ? qxIsListStubQuestion(q) : q._listStub)
          && typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion) {
          try {
            q = await qxRace(QuantrexCatalog.fillQuestion(q), 14000);
            if (q) {
              q._listStub = false;
              q._needsFull = false;
              if (typeof _qxIndexQuestion === "function") _qxIndexQuestion(q);
            }
          } catch (_) { /* keep stub */ }
        }
        if (!q && typeof window.qxEnsureOfflinePackQuestion === "function") {
          try { q = await window.qxEnsureOfflinePackQuestion(payload); } catch (_) { /* */ }
        }
        if (!q) {
          // One more try: Marks id direct fetch (m_<hex> / board_<hex> / ncert_<hex> or numeric)
          try {
            const mid = String(payload || "").replace(/^(m_|board_|ncert_)/i, "");
            const isHex = /^[a-f0-9]{24}$/i.test(mid);
            const isNum = /^\d{5,}$/.test(mid);
            if ((isHex || isNum) && typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion) {
              const stub = {
                id: isNum ? Number(mid) : String(payload),
                _marksId: mid,
                q: "",
                options: [],
                _bank: /^board_/i.test(String(payload)) ? "board" : (/^ncert_/i.test(String(payload)) ? "ncert" : ((typeof _currentBankSlug !== "undefined" && _currentBankSlug) || "jee_advanced")),
                examName: /^board_/i.test(String(payload)) ? "CBSE Board" : "",
                _listStub: true,
                _needsFull: true
              };
              q = await qxRace(QuantrexCatalog.fillQuestion(stub), 14000);
              if (q && typeof getQ === "function" && !getQ(q.id) && typeof QUESTIONS !== "undefined") {
                try { QUESTIONS.push(q); if (typeof _qxIndexQuestion === "function") _qxIndexQuestion(q); } catch (_) { /* */ }
              }
            }
          } catch (_) { q = null; }
        }
        if (!q) {
          if (currentView === "question" && mainEl0) {
            // Soft recovery — don't feel like a crash; guide back to chapter list
            const isStub = /^m_/.test(String(payload)) || Number(payload) >= 910000000;
            mainEl0.innerHTML = `<div class="empty" style="padding:48px;text-align:center;max-width:480px;margin:40px auto">
              <p style="font-weight:700;margin-bottom:10px">Question not loaded</p>
              <p style="font-size:13px;color:var(--gray);margin:0 0 16px;line-height:1.5">
                ${/^board_/i.test(String(payload))
                  ? "Open again from <strong>CBSE Board</strong> (subject → chapter)."
                  : (/^ncert_/i.test(String(payload))
                    ? "Open again from <strong>NCERT</strong> (subject → chapter)."
                    : (isStub
                  ? "Open again from <strong>Chapter-wise PYQ</strong> (subject → chapter). Direct links after refresh may need the chapter context."
                  : "Could not load this question. Open it from the folder you were practising."))}
              </p>
              <p style="font-size:11px;color:var(--gray);margin-bottom:16px">id: ${String(payload).replace(/</g, "")}</p>
              <button class="btn-primary" onclick="${
                /^board_/i.test(String(payload))
                  ? "go('board',{step:'subjects',board:'CBSE'})"
                  : (/^ncert_/i.test(String(payload))
                    ? "go('ncert',{step:'kinds'})"
                    : "go('cpyqb',{step:'exams',forceExamList:true})")
              }" style="margin:0 8px 8px 0">${
                /^board_/i.test(String(payload)) ? "Open Board →"
                  : (/^ncert_/i.test(String(payload)) ? "Open NCERT →" : "Open PYQ Bank →")
              }</button>
              <button class="btn-soft" onclick="qxPracticeBack()">← Back</button>
            </div>`;
          }
          return;
        }
        if (!window._qxPracticeCtx) {
          window._qxPracticeCtx = { ids: [q.id], idx: 0, selected: {}, done: {}, answers: {}, returnView: "dashboard", listFn: null };
        } else if (!window._qxPracticeCtx.ids.some(x => String(x) === String(q.id))) {
          window._qxPracticeCtx.ids = [q.id];
          window._qxPracticeCtx.idx = 0;
        }
        qxSyncOptsFromBank(q);
        if (q._book || q._bookId) {
          q._optsLoadFailed = false;
          // Only skip Marks fill when book options already have real content
          if (!qxBookOptionsBroken(q)) {
            q._marksFillTried = true;
          } else {
            q._marksFillTried = false;
            if (!q._marksId && q.id != null && /^\d{5,}$/.test(String(q.id))) {
              q._marksId = String(q.id);
            }
          }
        }
        // Numerical with empty options is still renderable — show now
        if (currentView === "question") {
          qxRenderPracticeQuestion(q.id);
        }
        // Fill MCQ options / numerical key from Marks — books included when options broken
        if (typeof qxNeedsOptionsLoad === "function" ? qxNeedsOptionsLoad(q) : (!qxHasRenderableOpts(q) && q._marksId)) {
          try {
            await qxRace(qxFillOptionsFromMarks(q), 8000);
            q._marksFillTried = true;
            if (qxHasRenderableOpts(q) || (q.options || []).some(qxOptionHasContent)) {
              q._fullFetched = true;
              q._optsLoadFailed = false;
            } else {
              q._optsLoadFailed = true;
            }
          } catch (_) {
            q._marksFillTried = true;
            q._optsLoadFailed = true;
          }
          if (currentView === "question") {
            qxMaybeRefreshPractice(q.id);
          }
        }
        try {
          const mainEl = document.getElementById("app-main");
          if (mainEl && typeof QxFigureViewer !== "undefined" && QxFigureViewer.bind) {
            QxFigureViewer.bind(mainEl);
          }
        } catch (_) { /* */ }
      } catch (err) {
        console.warn("question deep-link", err);
        if (currentView === "question") {
          try { qxRenderPracticeQuestion(payload); } catch (_) { /* */ }
        }
      }
    })();
    return;
  }
  if (view === "test") {
    if (main) {
      main.innerHTML = renderTest();
      if (typeof QuantrexTestEngine !== "undefined") QuantrexTestEngine.bindEvents(main);
      if (typeof Mx !== "undefined") Mx.afterRender(main);
    }
    return;
  }
  render(view, payload);
};

// Hash change (typed URL / external link) while app already running
window.addEventListener("hashchange", () => {
  if (_qxHistoryIgnore) return;
  if (currentView === "test" && document.body.classList.contains("marks-test-active")) return;
  try {
    const route = qxParseRouteFromLocation();
    if (!route || !route.view) return;
    if (route.view === currentView && String(route.payload || "") === String((window._qxLastPayload) || "")) return;
    _qxHistoryIgnore = true;
    go(route.view, route.payload);
  } finally {
    _qxHistoryIgnore = false;
  }
});
