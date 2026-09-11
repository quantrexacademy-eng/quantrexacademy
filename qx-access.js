// Quantrex Academy — paid access + 1 free peek per chapter/folder
const QuantrexAccess = (() => {
  const ALL_COURSES_FREE = true;
  const PEEK_KEY = "quantrex_free_peeks_v3";
  const SUB_KEY = "quantrex_sub";
  const ADMIN_EMAILS = ["quantrexacademy@gmail.com"];
  const ADMIN_PHONES = ["7750858874"];
  const ADMIN_FEATURES = ["eng", "med", "jee_ts"];
  const ADMIN_SUB = {
    active: true,
    planId: "admin_full",
    features: ADMIN_FEATURES,
    expiresAt: Date.parse("2099-12-31T23:59:59+05:30"),
    role: "admin"
  };
  const FREE_ALL_SUB = {
    active: true,
    planId: "all_free",
    features: ADMIN_FEATURES.slice(),
    expiresAt: Date.parse("2099-12-31T23:59:59+05:30"),
    startedAt: Date.parse("2026-08-31T00:00:00+05:30"),
    role: "free",
    label: "All courses free"
  };

  const OFFER_KEY = "quantrex_free_offer_v3";

  function isPeekToken(v) {
    return /^(ch:|folder:|paper:|year:)/.test(String(v || ""));
  }
  function sanitizeMap(raw) {
    const out = {};
    if (!raw || typeof raw !== "object") return out;
    Object.keys(raw).forEach(function (k) {
      if (isPeekToken(raw[k])) out[k] = String(raw[k]);
    });
    return out;
  }
  function loadPeeks() {
    let map = {};
    try { map = JSON.parse(localStorage.getItem(PEEK_KEY) || "{}") || {}; } catch (_) { map = {}; }
    const clean = sanitizeMap(map);
    if (JSON.stringify(clean) !== JSON.stringify(map)) savePeeks(clean);
    return clean;
  }
  function savePeeks(map) {
    try { localStorage.setItem(PEEK_KEY, JSON.stringify(map)); } catch (_) {}
  }
  function loadOffers() {
    let map = {};
    try { map = JSON.parse(localStorage.getItem(OFFER_KEY) || "{}") || {}; } catch (_) { map = {}; }
    return sanitizeMap(map);
  }
  function saveOffers(map) {
    try { localStorage.setItem(OFFER_KEY, JSON.stringify(map)); } catch (_) {}
  }
  function loadSub() {
    try { return JSON.parse(localStorage.getItem(SUB_KEY) || "null"); } catch (_) { return null; }
  }
  const COURSE_PLAN = { eng: "eng_complete", med: "med_complete", jee_ts: "jee_ts" };
  const COURSE_LABEL = {
    eng: "Engineering Complete",
    med: "Medical Complete",
    jee_ts: "JEE Main Test Series"
  };

  function saveSub(sub) {
    try {
      if (isAdmin()) {
        localStorage.setItem(SUB_KEY, JSON.stringify(ADMIN_SUB));
        return;
      }
      if (!sub || !sub.active) {
        localStorage.removeItem(SUB_KEY);
        return;
      }
      if (sub.planId === "admin_full" || sub.role === "admin") {
        localStorage.removeItem(SUB_KEY);
        return;
      }
      localStorage.setItem(SUB_KEY, JSON.stringify(sub));
    } catch (_) {}
  }

  function isLoggedIn() {
    if (typeof QuantrexGuestTrial !== "undefined" && QuantrexGuestTrial.isLoggedIn) {
      return QuantrexGuestTrial.isLoggedIn();
    }
    try {
      const u = JSON.parse(localStorage.getItem("quantrex_user") || "null");
      return !!(u && u.uid && String(u.uid).indexOf("guest_") !== 0);
    } catch (_) { return false; }
  }

  function planFeatures(planId) {
    const k = String(planId || "").replace(/^plan_/, "").toLowerCase();
    if (k === "trial_7") return ["eng", "med", "jee_ts"];
    if (k === "eng_combo" || k === "complete") return ["eng", "jee_ts"];
    if (k === "eng_complete") return ["eng"];
    if (k === "med_complete") return ["med"];
    if (k === "jee_ts") return ["jee_ts"];
    if (k === "admin_full") return ADMIN_FEATURES.slice();
    return [];
  }

  function hasActivePlan(planKey) {
    const s = paidSub();
    if (!s) return false;
    const need = planFeatures(planKey);
    if (!need.length) return false;
    return need.every(function (f) { return s.features.indexOf(f) >= 0; });
  }

  function paidSub() {
    if (isAdmin()) return ADMIN_SUB;
    if (ALL_COURSES_FREE) return FREE_ALL_SUB;
    const s = loadSub();
    if (!s || !s.active) return null;
    if (s.planId === "admin_full" || s.role === "admin") {
      clearStolenAdmin();
      return null;
    }
    const exp = Number(s.expiresAt || 0);
    if (exp && exp < Date.now()) {
      try { localStorage.removeItem(SUB_KEY); } catch (_) {}
      return null;
    }
    if (!Array.isArray(s.features) || !s.features.length) return null;
    return s;
  }

  function features() {
    const s = paidSub();
    return (s && Array.isArray(s.features) && s.features) || [];
  }

  function hasFeature(feat) {
    if (ALL_COURSES_FREE) return true;
    const f = features();
    if (f.indexOf(feat) >= 0) return true;
    if (feat === "eng" && f.indexOf("eng") >= 0) return true;
    return false;
  }

  function neededFeature(view, payload) {
    const p = payload && typeof payload === "object" ? payload : {};
    const exam = String(p.exam || p.track || p.category || (typeof STATE !== "undefined" ? STATE.exam : "") || "");
    const blob = [view, exam, p.seriesId, p.provider, p.testType, p.title, p.modeLabel]
      .filter(Boolean).join(" ").toLowerCase();
    if (view === "testseries" || /examgoal|jee_main_examgoal|test series/.test(blob)) return "jee_ts";
    if (view === "test" && /examgoal|testseries|series/.test(blob)) return "jee_ts";
    if (/medical|neet|aiims|jipmer/.test(exam.toLowerCase()) || /medical|neet/.test(blob)) return "med";
    return "eng";
  }

  const FREE_VIEWS = {
    dashboard: 1, premium: 1, profile: 1, search: 1, leaderboard: 1,
    notebook: 1, community: 1, assignments: 1, teacher: 1, analytics: 1,
    examinfo: 1, tests: 1
  };
  const PAID_NAV = [
    "revision", "books", "cpyqb", "allqs", "dpp", "formula", "ncert",
    "flashcards", "custom", "pyqmock", "testseries", "practice", "board",
    "quickconcepts", "tests"
  ];

  function isCatalogListing(view, payload) {
    if (FREE_VIEWS[view]) return true;
    if (view === "question" || view === "test") return false;
    const p = payload && typeof payload === "object" ? payload : {};
    if (p.qid || p.testId || p.startTest || p.openPractice || p.share || p.file || p.paperId || p.ids) return false;
    const step = String(p.step || "").toLowerCase();
    if (/^(reader|play|cards|start|questions|question|set|paper|mock|test|take|dpp|topics|topic|buckets|summaryNotes)$/.test(step)) {
      return false;
    }
    if (view === "pyqmock") {
      if (p.paper || p.source || p.paperId || p.startTest || step === "take" || step === "paper") return false;
      return true;
    }
    if (view === "cpyqb") {
      return step === "exams" || step === "subjects" || step === "chapters" ||
        step === "classExams" || step === "class12boards" || !step;
    }
    if (view === "books") {
      if (!p.bookId || step === "list" || step === "modules") return true;
      if (step === "subjects") return true;
      if ((step === "chapters" || !step) && !p.chapterId && !p.chapter) return true;
      return false;
    }
    if (view === "revision") {
      if (!p.subject || step === "subjects" || step === "zones" || !p.zone) return true;
      return false;
    }
    if (view === "allqs" || view === "ncert" || view === "board" || view === "dpp" ||
        view === "formula" || view === "flashcards") {
      return step === "subjects" || step === "chapters" || step === "kinds" || step === "list" || !step;
    }
    if (view === "testseries") return !p.file && !p.testId && !p.testIndex && (step === "list" || !step);
    if (view === "custom") return step === "landing" || !step;
    return false;
  }

  function peekKey(view, payload) {
    const p = payload && typeof payload === "object" ? payload : {};
    const ctx = typeof window !== "undefined" ? window._qxPracticeCtx : null;
    const exam = String(
      p.slug || p.exam || p.track || (ctx && (ctx.exam || ctx.bank)) ||
      (typeof STATE !== "undefined" ? STATE.exam : "") || ""
    ).trim() || "exam";
    const subject = String(
      p.subject || p.subjectName || (ctx && ctx.subject) || ""
    ).trim() || "subj";
    const bookId = String(p.bookId || p.book || (ctx && ctx.bookId) || "").trim();
    const folder = String(p.moduleId || p.folderId || (ctx && ctx.moduleId) || "").trim() || "main";
    const testType = String(p.testType || p.returnTo || "").toLowerCase();
    const feat = neededFeature(view, payload);
    if (feat === "jee_ts" || view === "testseries" || (view === "test" && /testseries|examgoal/.test(testType))) {
      return "series:" + String(p.seriesId || p.series || "jee_main_examgoal_2027");
    }
    if (view === "pyqmock" || testType === "pyqmock") {
      return "mock:" + exam;
    }
    if (view === "books" || bookId) return "book:" + (bookId || "digital") + ":folder:" + folder;
    if (view === "formula" || testType === "formula") return "formula:" + exam + ":subj:" + subject;
    if (view === "flashcards" || testType === "flashcards") return "rfc:" + exam + ":subj:" + subject;
    if (view === "revision") return "rev:" + exam + ":subj:" + subject;
    if (view === "dpp" || testType === "dpp") return "dpp:" + exam + ":subj:" + subject;
    return "exam:" + exam + ":subj:" + subject;
  }
  function demoKey(view, payload) {
    return peekKey(view, payload);
  }

  function folderKey(view, payload) {
    const p = payload && typeof payload === "object" ? payload : {};
    const ctx = typeof window !== "undefined" ? window._qxPracticeCtx : null;
    if (view === "question") {
      const folder = [
        "folder",
        (ctx && (ctx.exam || ctx.bank || ctx.returnView)) || p.exam || "",
        (ctx && ctx.subject) || p.subject || "",
        (ctx && (ctx.chapterId || ctx.chapter)) || p.chapterId || p.chapter || "",
        (ctx && ctx.bookId) || p.bookId || p.book || ""
      ].filter(Boolean).join(":");
      return folder || "folder:practice";
    }
    const parts = [
      view,
      p.exam || (ctx && ctx.exam),
      p.subject || (ctx && ctx.subject),
      p.bookId || p.book || (ctx && ctx.bookId),
      p.chapterId || p.chapter || (ctx && (ctx.chapterId || ctx.chapter)),
      p.topicId || p.topic,
      p.categoryId,
      p.seriesId
    ].filter(Boolean).map(String);
    if (parts.length <= 1) {
      if (view === "test") return "test:" + String((p.testId || p.id || payload) || "one");
    }
    return parts.join(":");
  }

  function itemId(view, payload) {
    const p = payload && typeof payload === "object" ? payload : {};
    const ctx = typeof window !== "undefined" ? window._qxPracticeCtx : null;
    const bookId = String(p.bookId || p.book || (ctx && ctx.bookId) || "").trim();
    const testType = String(p.testType || "").toLowerCase();
    if (view === "revision" && p.zone) return "ch:" + String(p.zone);
    if (view === "books" || bookId) {
      const ch = String(p.chapter || p.chapterId || p.chapterKey || (ctx && (ctx.chapterId || ctx.chapter)) || "").trim();
      return ch ? ("ch:" + ch) : "";
    }
    if (view === "pyqmock" || testType === "pyqmock") {
      const paper = String(p.paperId || p.source || p.testId || p.file || p.paper || "").trim();
      return paper ? ("paper:" + paper) : "";
    }
    const ch = String(p.chapter || p.chapterId || (ctx && (ctx.chapterId || ctx.chapter)) || "").trim();
    if (ch) return "ch:" + ch;
    if (p.testId || p.file || p.paperId || p.source) {
      return "paper:" + String(p.testId || p.file || p.paperId || p.source);
    }
    if (view === "question") {
      const qch = String((ctx && (ctx.chapter || ctx.chapterId)) || p.chapter || "").trim();
      return qch ? ("ch:" + qch) : "";
    }
    return "";
  }

  function peekKind(key) {
    const k = String(key || "");
    if (k.indexOf("series:") === 0 || k.indexOf("mock:") === 0) return "paper";
    return "ch";
  }
  function tokenKind(token) {
    const t = String(token || "");
    if (t.indexOf("folder:") === 0) return "folder";
    if (t.indexOf("paper:") === 0) return "paper";
    if (t.indexOf("ch:") === 0) return "ch";
    return "";
  }
  function cardToken(view, payload) {
    const p = payload && typeof payload === "object" ? payload : {};
    const ch = String(p.chapter || p.chapterId || p.chapterKey || "").trim();
    const paper = String(p.testId || p.file || p.paperId || p.source || p.paper || "").trim();
    if (view === "revision" && p.zone) return "ch:" + String(p.zone);
    if (view === "books" || p.bookId) return ch ? ("ch:" + ch) : "";
    if (view === "pyqmock") return paper ? ("paper:" + paper) : "";
    if (view === "testseries" || (view === "test" && !ch)) return paper ? ("paper:" + paper) : "";
    if (ch) return "ch:" + ch;
    if (paper) return "paper:" + paper;
    return "";
  }

  function digitsPhone(raw) {
    return String(raw || "").replace(/\D/g, "");
  }
  function isOwnerIdentity(email, phone) {
    const em = String(email || "").trim().toLowerCase();
    const ph = digitsPhone(phone);
    if (ADMIN_EMAILS.indexOf(em) >= 0) return true;
    if (ph === "7750858874" || ph.endsWith("7750858874")) return true;
    return false;
  }
  function liveAuthIdentity() {
    try {
      if (typeof firebase !== "undefined" && firebase.auth) {
        const cu = firebase.auth().currentUser;
        if (cu) {
          return {
            email: cu.email || "",
            phone: cu.phoneNumber || ""
          };
        }
      }
    } catch (_) { /* */ }
    return null;
  }
  function storedIdentity() {
    try {
      const u = JSON.parse(localStorage.getItem("quantrex_user") || "null");
      if (!u || !u.uid || String(u.uid).indexOf("guest_") === 0) return { email: "", phone: "" };
      return { email: u.email || "", phone: u.phone || u.phoneNumber || "" };
    } catch (_) {
      return { email: "", phone: "" };
    }
  }
  function isAdmin() {
    const live = liveAuthIdentity();
    if (live && (live.email || live.phone) && isOwnerIdentity(live.email, live.phone)) return true;
    if (live && (live.email || live.phone) && !isOwnerIdentity(live.email, live.phone)) return false;
    const st = storedIdentity();
    return isOwnerIdentity(st.email, st.phone);
  }
  function clearStolenAdmin() {
    try { localStorage.removeItem("quantrex_admin"); } catch (_) {}
    try {
      const s = loadSub();
      if (s && (s.planId === "admin_full" || s.role === "admin")) localStorage.removeItem(SUB_KEY);
    } catch (_) {}
    try {
      const u = JSON.parse(localStorage.getItem("quantrex_user") || "null");
      if (u && u.role === "admin" && !isOwnerIdentity(u.email, u.phone || u.phoneNumber)) {
        u.role = "student";
        localStorage.setItem("quantrex_user", JSON.stringify(u));
      }
    } catch (_) {}
  }
  function grantAdmin(user) {
    const email = (user && (user.email || user.emailAddress)) || "";
    const phone = (user && (user.phone || user.phoneNumber)) || "";
    if (!isOwnerIdentity(email, phone) && !isAdmin()) return false;
    try { localStorage.setItem("quantrex_admin", "1"); } catch (_) {}
    try {
      const u = JSON.parse(localStorage.getItem("quantrex_user") || "null") || {};
      u.role = "admin";
      if (email) u.email = email;
      if (phone) u.phone = digitsPhone(phone);
      localStorage.setItem("quantrex_user", JSON.stringify(u));
    } catch (_) { /* */ }
    saveSub(ADMIN_SUB);
    return true;
  }
  function grantIfOwner(user) {
    const email = (user && user.email) || "";
    const phone = (user && (user.phone || user.phoneNumber)) || "";
    if (user && isOwnerIdentity(email, phone)) return grantAdmin(user);
    if (!user && isAdmin()) {
      const st = storedIdentity();
      const live = liveAuthIdentity() || {};
      return grantAdmin({ email: live.email || st.email, phone: live.phone || st.phone });
    }
    if (!isAdmin()) clearStolenAdmin();
    return false;
  }

  function applyRemoteSub(data) {
    if (isAdmin()) {
      saveSub(ADMIN_SUB);
      return ADMIN_SUB;
    }
    clearStolenAdmin();
    if (!data || !data.active) {
      try { localStorage.removeItem(SUB_KEY); } catch (_) {}
      return null;
    }
    let features = Array.isArray(data.features) ? data.features.filter(Boolean) : [];
    if (!features.length) features = planFeatures(data.planId || data.planKey || data.key || "");
    const sub = {
      active: true,
      planId: data.planId || data.planKey || data.key || "",
      features: features,
      expiresAt: Number(data.expiresAt || 0) || 0,
      startedAt: Number(data.startedAt || 0) || Date.now(),
      orderId: data.orderId || "",
      paymentId: data.paymentId || "",
      amount: data.amount || 0,
      label: data.label || COURSE_LABEL[features[0]] || ""
    };
    if (sub.planId === "admin_full" || data.role === "admin") {
      try { localStorage.removeItem(SUB_KEY); } catch (_) {}
      return null;
    }
    if (!features.length) {
      try { localStorage.removeItem(SUB_KEY); } catch (_) {}
      return null;
    }
    saveSub(sub);
    return sub;
  }

  function canAccess(view, payload, claim) {
    if (ALL_COURSES_FREE) return true;
    if (isAdmin()) return true;
    if (FREE_VIEWS[view]) return true;
    if (isCatalogListing(view, payload)) return true;
    if (hasFeature(neededFeature(view, payload))) return true;
    const p = payload && typeof payload === "object" ? payload : {};
    const testType = String(p.testType || "").toLowerCase();
    if (view === "pyqmock" || testType === "pyqmock") {
      const exam = String(p.slug || p.exam || "").trim();
      const year = String(p.year || "").trim();
      if (exam && year) {
        const yKey = "mockyear:" + exam;
        const yUsed = loadPeeks()[yKey] || loadOffers()[yKey] || "";
        if (yUsed && yUsed !== ("year:" + year)) return false;
      }
    }
    const key = peekKey(view, payload);
    const item = itemId(view, payload);
    const kind = peekKind(key);
    if (!item || tokenKind(item) !== kind) return false;
    const peeks = loadPeeks();
    if (peeks[key]) return peeks[key] === item;
    const offers = loadOffers();
    if (offers[key] && offers[key] !== item) return false;
    if (claim) {
      peeks[key] = item;
      savePeeks(peeks);
      if ((view === "pyqmock" || testType === "pyqmock") && p.year && p.exam) {
        const yKey = "mockyear:" + String(p.exam || p.slug || "");
        if (yKey !== "mockyear:" && !peeks[yKey] && !offers[yKey]) {
          const yo = loadOffers();
          yo[yKey] = "year:" + String(p.year);
          saveOffers(yo);
        }
      }
    }
    return true;
  }
  function allow(view, payload) {
    return canAccess(view, payload, true);
  }

  function blockHtml(view, payload) {
    if (allow(view, payload)) return "";
    return paywallHtml(view, payload);
  }

  function payHref(planKey) {
    return "pay.html?plan=" + encodeURIComponent(planKey || "trial_7");
  }

  function paywallHtml(view, payload) {
    return "";
  }

  function featureForExam(exam) {
    const e = String(exam || "").toLowerCase();
    if (/medical|neet|aiims|jipmer/.test(e)) return "med";
    return "eng";
  }

  function injectLockCss() {
    let s = document.getElementById("qxAccessLockCss");
    if (!s) {
      s = document.createElement("style");
      s.id = "qxAccessLockCss";
      document.head.appendChild(s);
    }
    s.textContent = [
      ".nav-item.is-locked::after{content:\"Premium\";margin-left:auto;font-size:10px;font-weight:800;letter-spacing:.04em;background:#0f172a;color:#fbbf24;padding:3px 8px;border-radius:999px;flex-shrink:0;}",
      "html[data-theme=\"dark\"] .nav-item.is-locked::after{background:#fbbf24;color:#0f172a;}",
      ".qx-top-exam.is-locked{padding-right:10px;}",
      ".qx-course-lock,.qx-access-free,.pyqmock-paper-card,.pyqmock-year-card,.qx-topic-card,.qx-rfc-ch,.qx-fc-tile{position:relative!important;}",
      ".qx-lock-tag{position:absolute;top:8px;right:8px;z-index:12;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:4px 9px;border-radius:999px;pointer-events:none;line-height:1.2;box-shadow:0 1px 4px rgba(0,0,0,.18);}",
      ".qx-lock-tag.is-free{background:#16a34a;color:#fff;-webkit-text-fill-color:#fff;}",
      ".qx-lock-tag.is-prem{background:#0f172a;color:#fbbf24;-webkit-text-fill-color:#fbbf24;}",
      "html[data-theme=\"dark\"] .qx-lock-tag.is-prem{background:#fbbf24;color:#0f172a;-webkit-text-fill-color:#0f172a;}",
      ".pyqmock-paper-main .qx-lock-tag{position:static;display:inline-flex;margin:0 8px 6px 0;vertical-align:middle;}",
      ".qx-paywall{max-width:560px;margin:36px auto;padding:22px;text-align:center;}",
      ".qx-paywall-ic{font-size:42px;line-height:1;margin-bottom:8px;}",
      ".qx-paywall-kicker{font-size:13px;font-weight:800;letter-spacing:.12em;color:#3b82f6;margin-bottom:8px;}",
      ".qx-paywall h2{font-family:Kanit,sans-serif;font-size:26px;margin:0 0 8px;}",
      ".qx-paywall p{line-height:1.55;margin:0 0 18px;}",
      ".qx-paywall-btns{display:grid;gap:10px;}",
      ".qx-paywall-buy,.qx-paywall-trial,.qx-paywall-all{display:block;text-decoration:none;padding:14px 18px;border-radius:12px;font-weight:800;}",
      ".qx-paywall-buy{background:#2563eb;color:#fff;}",
      ".qx-paywall-trial{border:2px solid currentColor;background:transparent;}",
      ".qx-paywall-all{font-size:13px;font-weight:700;color:#2563eb;}",
      "html[data-theme=\"light\"] .qx-paywall h2,html[data-theme=\"light\"] .qx-paywall p,html[data-theme=\"light\"] .qx-paywall-trial{color:#0f172a;}",
      "html[data-theme=\"dark\"] .qx-paywall h2,html[data-theme=\"dark\"] .qx-paywall p,html[data-theme=\"dark\"] .qx-paywall-trial{color:#f1f5f9;}",
      "html[data-theme=\"dark\"] .qx-paywall-all{color:#93c5fd;}"
    ].join("");
    if (!s.parentNode) document.head.appendChild(s);
  }

  function parseMgPayload(el) {
    if (typeof qxParseMgp === "function") {
      try { return qxParseMgp(el); } catch (_) { /* */ }
    }
    try {
      let raw = el.getAttribute("data-mgp") || "{}";
      raw = String(raw).replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      return JSON.parse(raw || "{}");
    } catch (_) {
      return {};
    }
  }

  function paintLocks(root) {
    injectLockCss();
    const scope = root || document;
    if (ALL_COURSES_FREE || isAdmin()) {
      scope.querySelectorAll(".is-locked, .qx-course-lock, .qx-access-free").forEach(function (el) {
        el.classList.remove("is-locked", "qx-course-lock", "qx-access-free");
        el.removeAttribute("data-qx-lock");
      });
      scope.querySelectorAll(".qx-lock-tag").forEach(function (el) { el.remove(); });
      return;
    }
    scope.querySelectorAll(".qx-top-exam[data-exam]").forEach(function (btn) {
      const locked = !hasFeature(featureForExam(btn.getAttribute("data-exam")));
      btn.classList.toggle("is-locked", locked);
      if (locked) btn.setAttribute("data-qx-lock", "1");
      else btn.removeAttribute("data-qx-lock");
    });
    scope.querySelectorAll(".nav-item[data-view]").forEach(function (btn) {
      const v = btn.getAttribute("data-view") || "";
      if (PAID_NAV.indexOf(v) < 0) {
        btn.classList.remove("is-locked");
        return;
      }
      const feat = v === "testseries" ? "jee_ts" : featureForExam(typeof STATE !== "undefined" ? STATE.exam : "");
      const locked = !hasFeature(feat);
      btn.classList.toggle("is-locked", locked);
    });
    const stampRoots = [];
    function addStampRoot(el) {
      if (el && el.querySelectorAll && stampRoots.indexOf(el) < 0) stampRoots.push(el);
    }
    if (root && root !== document) addStampRoot(root);
    addStampRoot(document.getElementById("app-main"));
    addStampRoot(document.getElementById("ts-root"));
    if (!stampRoots.length) addStampRoot(scope);
    const peeks = loadPeeks();
    const offers = loadOffers();
    let offerDirty = false;
    function setLockTag(el, kind) {
      const old = el.querySelectorAll(".qx-lock-tag");
      let tag = old[0] || null;
      for (let i = 1; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
      if (!kind) {
        if (tag) tag.parentNode.removeChild(tag);
        el.classList.remove("qx-course-lock", "qx-access-free");
        return;
      }
      if (!tag) {
        tag = document.createElement("span");
        tag.className = "qx-lock-tag";
        tag.setAttribute("aria-hidden", "true");
        const mount = el.querySelector(".pyqmock-paper-main") || el;
        if (mount.firstChild) mount.insertBefore(tag, mount.firstChild);
        else mount.appendChild(tag);
      }
      tag.textContent = kind === "free" ? "Free" : "Premium";
      tag.classList.toggle("is-free", kind === "free");
      tag.classList.toggle("is-prem", kind === "prem");
      el.classList.toggle("qx-access-free", kind === "free");
      el.classList.toggle("qx-course-lock", kind === "prem");
    }
    function stampCard(el, view, payload) {
      if (!view || FREE_VIEWS[view]) {
        setLockTag(el, "");
        return;
      }
      if (hasFeature(neededFeature(view, payload))) {
        setLockTag(el, "");
        return;
      }
      const p = payload && typeof payload === "object" ? payload : {};
      if (view === "pyqmock" && p.year && !p.paperId && !p.source && !p.testId && !p.paper) {
        const yKey = "mockyear:" + String(p.exam || p.slug || "exam");
        const token = "year:" + String(p.year);
        let used = peeks[yKey] || offers[yKey] || "";
        if (!used) {
          offers[yKey] = token;
          used = token;
          offerDirty = true;
        }
        setLockTag(el, used === token ? "free" : "prem");
        return;
      }
      const token = cardToken(view, payload);
      const key = peekKey(view, payload);
      const kind = peekKind(key);
      if (!token || tokenKind(token) !== kind) {
        setLockTag(el, "");
        return;
      }
      if (view === "pyqmock" && p.year) {
        const yKey = "mockyear:" + String(p.exam || p.slug || "exam");
        let yUsed = peeks[yKey] || offers[yKey] || "";
        if (!yUsed) {
          offers[yKey] = "year:" + String(p.year);
          yUsed = offers[yKey];
          offerDirty = true;
        }
        if (yUsed !== ("year:" + String(p.year))) {
          setLockTag(el, "prem");
          return;
        }
      }
      let used = peeks[key] || offers[key] || "";
      if (!used) {
        offers[key] = token;
        used = token;
        offerDirty = true;
      }
      setLockTag(el, used === token ? "free" : "prem");
    }
    stampRoots.forEach(function (stampRoot) {
      stampRoot.querySelectorAll("[data-mg]").forEach(function (el) {
        stampCard(el, el.getAttribute("data-mg") || "", parseMgPayload(el));
      });
      stampRoot.querySelectorAll("[data-qx-peek]").forEach(function (el) {
        const view = el.getAttribute("data-qx-peek") || "test";
        const paper = el.getAttribute("data-qx-paper") || "";
        const payload = {
          exam: el.getAttribute("data-qx-exam") || "",
          slug: el.getAttribute("data-qx-exam") || "",
          seriesId: el.getAttribute("data-qx-series") || "",
          testId: paper,
          paperId: paper,
          source: paper,
          bookId: el.getAttribute("data-qx-book") || "",
          moduleId: el.getAttribute("data-qx-folder") || "",
          chapter: el.getAttribute("data-qx-chapter") || "",
          subject: el.getAttribute("data-qx-subject") || "",
          zone: el.getAttribute("data-qx-zone") || "",
          year: el.getAttribute("data-qx-year") || "",
          startTest: view === "test" || view === "pyqmock"
        };
        stampCard(el, view, payload);
      });
    });
    if (offerDirty) saveOffers(offers);
  }

  return {
    ALL_COURSES_FREE, FREE_ALL_SUB,
    loadSub, saveSub, paidSub, hasFeature, neededFeature, planFeatures, hasActivePlan,
    allow, paywallHtml, isLoggedIn, features, payHref, isAdmin,
    grantAdmin, grantIfOwner, isOwnerIdentity, clearStolenAdmin, ADMIN_EMAILS, ADMIN_PHONES,
    applyRemoteSub, paintLocks, featureForExam, COURSE_PLAN, COURSE_LABEL,
    blockHtml, isCatalogListing, demoKey, canAccess
  };
})();
window.qxAccessBlock = function (view, payload) {
  try {
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.blockHtml) {
      return QuantrexAccess.blockHtml(view, payload) || "";
    }
  } catch (_) {}
  return "";
};
