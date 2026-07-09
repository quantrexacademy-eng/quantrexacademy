// JEE Main Test Series 2027 — Inter-Marks style (screenshots 427/428)

const TS_ATTEMPT_STORE = "quantrex_ts_attempts_v1";
const TS_NOTIFY_STORE = "quantrex_ts_notify_v1";
const TS_SERIES_ID = "jee_main_test_series_2027";

let _tsPayload = { seriesId: TS_SERIES_ID };
let _tsManifest = null;
let _tsCategoryCache = {};
let _tsPage = "home";
let _tsNav = "test";
let _tsDashTab = "attempted";
let _tsSearch = "";
let _tsSort = "default";
let _tsFilter = { testType: "All Tests", subject: "Overall", dateRange: "All Dates", statusTab: "available" };

window.TS_ACTIVE_QMAP = window.TS_ACTIVE_QMAP || {};
window._tsQuestionMeta = window._tsQuestionMeta || null;
let _tsMetaLoading = null;

function tsClearActiveQMap() {
  window.TS_ACTIVE_QMAP = {};
  if (typeof QUESTIONS !== "undefined") {
    QUESTIONS = QUESTIONS.filter(q => q._bank !== "ts_active");
  }
}
window.tsClearActiveQMap = tsClearActiveQMap;

function tsFixUrls(val) {
  if (val == null) return val;
  const fix = s => String(s).replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/");
  if (typeof val === "string") return fix(val);
  if (Array.isArray(val)) return val.map(tsFixUrls);
  return val;
}

async function tsEnsureQuestionMeta() {
  if (window._tsQuestionMeta) return window._tsQuestionMeta;
  if (_tsMetaLoading) return _tsMetaLoading;
  _tsMetaLoading = (async () => {
    try {
      const v = typeof QX_BUILD !== "undefined" ? QX_BUILD : Date.now();
      const res = await fetch(`data/quizrr/jee_main_test_series_2027/question_meta.json?v=${v}`);
      if (res.ok) window._tsQuestionMeta = await res.json();
      else window._tsQuestionMeta = {};
    } catch (e) { window._tsQuestionMeta = {}; }
    return window._tsQuestionMeta;
  })();
  return _tsMetaLoading;
}

const _tsDataGetQ = (typeof window.getQ === "function") ? window.getQ : null;
window.getQ = function tsGetQ(id) {
  if (id == null || id === "") return null;
  const map = window.TS_ACTIVE_QMAP;
  let q = null;
  if (map) {
    q = map[id] || (typeof id === "string" && /^\d+$/.test(id) ? map[Number(id)] : null)
      || (typeof id === "number" ? map[String(id)] : null);
  }
  if (!q && _tsDataGetQ) q = _tsDataGetQ(id);
  if (!q) return null;
  if (map && q.id != null) {
    map[q.id] = q;
    map[String(q.id)] = q;
  }
  return q;
};

function tsEscHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const TS_ICON_NAV = [
  { id: "test", label: "Test", icon: "📝" },
  { id: "solution", label: "Solution", icon: "💡" },
  { id: "about", label: "About", icon: "ℹ️" },
  { id: "resources", label: "Resources", icon: "📚" }
];

if (typeof go !== "function") {
  window.go = function goStandalone(view) {
    if (typeof exitMarksTestMode === "function") exitMarksTestMode();
    const mount = typeof getTestMountEl === "function" ? getTestMountEl() : document.getElementById("app-main");
    if (mount) mount.innerHTML = "";
    if (window.TS_STANDALONE && typeof tsRenderStandalone === "function") tsRenderStandalone();
  };
}

if (typeof showToast !== "function") {
  let _tsToastTimer;
  window.showToast = function showToast(msg) {
    const t = document.getElementById("appToast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(_tsToastTimer);
    _tsToastTimer = setTimeout(() => t.classList.remove("show"), 2400);
  };
}

function tsToday() {
  return new Date().toISOString().slice(0, 10);
}

function tsLoadAttempts() {
  try { return JSON.parse(localStorage.getItem(TS_ATTEMPT_STORE) || "{}"); }
  catch (e) { return {}; }
}

function tsSaveAttempt(testId, data) {
  const all = tsLoadAttempts();
  all[testId] = { ...all[testId], ...data, updatedAt: Date.now() };
  localStorage.setItem(TS_ATTEMPT_STORE, JSON.stringify(all));
}

function tsAttemptStatus(testId) {
  const rec = tsLoadAttempts()[testId];
  if (!rec) return "notStarted";
  return rec.status || "notStarted";
}

function tsLoadNotifications() {
  try { return JSON.parse(localStorage.getItem(TS_NOTIFY_STORE) || "[]"); }
  catch (e) { return []; }
}

function tsPushNotification(msg) {
  const list = tsLoadNotifications();
  list.unshift({ id: Date.now(), msg, at: new Date().toISOString(), read: false });
  localStorage.setItem(TS_NOTIFY_STORE, JSON.stringify(list.slice(0, 50)));
  showToast("🔔 " + msg);
}

async function tsFetchManifest(seriesId) {
  const sid = seriesId || TS_SERIES_ID;
  const res = await fetch(`data/quizrr/${sid}/manifest.json?v=${typeof QX_BUILD !== "undefined" ? QX_BUILD : Date.now()}`);
  if (!res.ok) throw new Error("manifest");
  return res.json();
}

async function tsFetchCategory(seriesId, file) {
  const key = seriesId + "::" + file;
  if (_tsCategoryCache[key]) return _tsCategoryCache[key];
  const res = await fetch(`data/quizrr/${seriesId}/${file}?v=${typeof QX_BUILD !== "undefined" ? QX_BUILD : Date.now()}`);
  if (!res.ok) throw new Error("category");
  const data = await res.json();
  _tsCategoryCache[key] = data;
  return data;
}

async function tsResolveTest(seriesId, meta) {
  if (!meta || !meta.file) return null;
  const data = await tsFetchCategory(seriesId, meta.file);
  if (data.tests && Array.isArray(data.tests)) {
    return data.tests.find(t => t.id === meta.id) || data.tests[meta.testIndex] || null;
  }
  if (data.questionIds) return data;
  return null;
}

function tsNormalizeQuestionId(raw) {
  if (raw && typeof raw === "object") return raw.id;
  return raw;
}

function tsDerivePaperSource(test) {
  if (!test) return null;
  if (test.paperSource) return String(test.paperSource);
  const title = String(test.title || test.source || "").trim();
  const m = title.match(/JEE\s+Main\s+(\d{4})\s*\(\s*(\d{1,2})\s+(\w+)\s+Shift\s+(\d)\s*\)/i);
  if (!m) return null;
  const monMap = {
    jan: "january", feb: "february", mar: "march", apr: "april", april: "april",
    may: "may", jun: "june", june: "june", jul: "july", july: "july",
    aug: "august", august: "august", sep: "september", sept: "september", september: "september",
    oct: "october", october: "october", nov: "november", november: "november", dec: "december", december: "december"
  };
  const monKey = m[3].toLowerCase();
  const mon = monMap[monKey] || monMap[monKey.slice(0, 3)] || monKey;
  const day = String(m[2]).padStart(2, "0");
  return `jee_main_${m[1]}_${day}_${mon}_shift_${m[4]}`;
}

function tsIsNumericalShard(q) {
  if (!q) return false;
  if (/numerical|integer/i.test(String(q.type || q.questionType || ""))) return true;
  const text = String(q.q || q.question || "");
  if (/nearest\s+integer|nearest integer|integer\s*value|_______|_{3,}/i.test(text)) return true;
  if (q.correctValue != null && String(q.correctValue) !== "") return true;
  return false;
}

function tsShardOptionsComplete(options) {
  if (!options || !options.length) return false;
  if (typeof MarksLive !== "undefined" && MarksLive.allOptionsHaveContent) {
    return MarksLive.allOptionsHaveContent(options);
  }
  return options.every(o => {
    const s = String(o || "");
    if (/<img/i.test(s)) return true;
    const t = s.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " ").trim();
    return t.length > 0 && !/^[ABCDabcd1234]$/.test(t);
  });
}

function tsNormalizeShardQuestion(q) {
  if (!q) return null;
  const text = tsFixUrls(q.q || q.question || q.text || q.stem || "");
  const meta = window._tsQuestionMeta;
  const marksId = q._marksId || (meta && meta[q.id] && meta[q.id]._marksId) || null;
  const out = {
    ...q,
    q: text,
    question: text,
    options: tsFixUrls(q.options || q.choices || []),
    solution: tsFixUrls(q.solution || ""),
    _marksId: marksId,
    _bank: "ts_active"
  };
  const placeholderOpts = typeof MarksLive !== "undefined" && MarksLive.isPlaceholderOptions
    ? MarksLive.isPlaceholderOptions(out.options)
    : !tsShardOptionsComplete(out.options);
  const hasQ = String(out.q || "").replace(/<[^>]+>/g, " ").trim().length > 8;
  const isNum = tsIsNumericalShard(out);
  if (hasQ && isNum) {
    out._shardLoaded = true;
    out._fullFetched = true;
    out._needsFull = false;
  } else if (hasQ && tsShardOptionsComplete(out.options)) {
    out._shardLoaded = true;
    out._fullFetched = true;
    out._needsFull = false;
  } else if (marksId && (placeholderOpts || (typeof MarksLive !== "undefined" && MarksLive.isPartialOptions && MarksLive.isPartialOptions(out.options)))) {
    out._needsFull = true;
    out._shardLoaded = false;
    out._fullFetched = false;
  }
  return out;
}

function tsSyncQMap(ids) {
  (ids || []).forEach(id => {
    const q = typeof getQ === "function" ? getQ(id) : null;
    if (!q || q.id == null) return;
    window.TS_ACTIVE_QMAP[q.id] = q;
    window.TS_ACTIVE_QMAP[String(q.id)] = q;
  });
}

async function tsLoadQuestionsForTest(test) {
  tsClearActiveQMap();
  await tsEnsureQuestionMeta();
  const v = typeof QX_BUILD !== "undefined" ? QX_BUILD : Date.now();
  const paths = [];
  const derived = tsDerivePaperSource(test);
  if (derived) {
    paths.push(`data/quizrr/jee_main_test_series_2027/paper_banks/${derived}.json`);
  }
  if (test.paperSource) {
    const ps = String(test.paperSource).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 64);
    const bankPath = `data/quizrr/jee_main_test_series_2027/paper_banks/${ps}.json`;
    if (!paths.includes(bankPath)) paths.push(bankPath);
  }
  paths.push(`data/quizrr/jee_main_test_series_2027/questions/${test.id}.json`);

  const wantIds = (test.questionIds || []).map(tsNormalizeQuestionId).filter(Boolean);

  for (const p of paths) {
    try {
      const res = await fetch(`${p}?v=${v}`);
      if (!res.ok) continue;
      const qs = await res.json();
      if (!Array.isArray(qs) || !qs.length) continue;
      const loadedQs = qs.map(tsNormalizeShardQuestion).filter(Boolean);
      loadedQs.forEach(q => {
        if (!q || q.id == null) return;
        window.TS_ACTIVE_QMAP[q.id] = q;
        window.TS_ACTIVE_QMAP[String(q.id)] = q;
      });
      if (typeof QUESTIONS !== "undefined") {
        QUESTIONS = QUESTIONS.filter(q => q._bank !== "ts_active").concat(loadedQs);
      }
      const idsFromShard = loadedQs.map(q => q.id).filter(id => id != null);
      const shardResolved = idsFromShard.filter(id => getQ(id));
      if (shardResolved.length > 0) return { count: shardResolved.length, ids: shardResolved };
      const catalogResolved = wantIds.filter(id => getQ(id));
      if (catalogResolved.length > 0) return { count: catalogResolved.length, ids: catalogResolved };
    } catch (e) { /* try next */ }
  }

  if (typeof loadSingleBank === "function") {
    showToast("📚 Loading question bank…");
    await loadSingleBank("jee_main");
    const resolved = wantIds.filter(id => typeof getQ === "function" && getQ(id));
    if (resolved.length > 0) return { count: resolved.length, ids: resolved };
  }
  return { count: 0, ids: [] };
}

function quizrrInstructionHtml(config) {
  const n = (config.questionIds || []).length;
  const mins = config.durationSec ? Math.floor(config.durationSec / 60) : 180;
  const marks = config.totalMarks || n * 4 || 300;
  const title = tsEscHtml(config.title || "Test");
  const subtitle = tsEscHtml(config.subtitle || "Read all instructions carefully before starting the test.");
  return `<div id="marksInstrOverlay" class="qz-instr-fullpage" role="dialog" aria-modal="true">
    <header class="qz-instr-top">
      <div class="qz-instr-brand"><span class="qz-logo">Q</span><div><strong>Quantrex Academy</strong><small>Test Instructions</small></div></div>
      <button type="button" class="qz-instr-exit" onclick="marksCancelInstructions()">✕</button>
    </header>
    <div class="qz-instr-scroll">
      <div class="qz-instr-inner">
        <h1 class="qz-instr-title">${title}</h1>
        <p class="qz-instr-desc">${subtitle}</p>
        <div class="qz-instr-stats">
          <div><span>Total Questions</span><strong>${n}</strong></div>
          <div><span>Total Time</span><strong>${mins} min</strong></div>
          <div><span>Total Marks</span><strong>${marks}</strong></div>
        </div>
        <div class="qz-instr-block">
          <h3>General Instructions</h3>
          <ol class="qz-instr-list">
            <li>The clock will be set at the server. The countdown timer on the top right corner will display remaining time.</li>
            <li>When the timer reaches zero, the test will end automatically. Submit before time expires.</li>
            <li>Click a question number in the palette to jump to that question.</li>
            <li><strong>Save &amp; Next</strong> saves your answer and moves forward.</li>
            <li><strong>Mark for Review &amp; Next</strong> marks a question to revisit later.</li>
            <li>You can change your response any number of times before final submission.</li>
            <li>Do not refresh or close the browser during the test. Use <strong>⏸ Stop</strong> to save and <strong>Resume</strong> later from the Resume tab.</li>
          </ol>
        </div>
        <div class="qz-instr-block">
          <h3>Question Palette Legend</h3>
          <div class="qz-instr-legend">
            <span><i class="mtk-dot answered"></i> Answered</span>
            <span><i class="mtk-dot not-answered"></i> Not Answered</span>
            <span><i class="mtk-dot unvisited"></i> Not Visited</span>
            <span><i class="mtk-dot rev-ans"></i> Marked for Review (Answered)</span>
            <span><i class="mtk-dot rev-skip"></i> Marked for Review (Not Answered)</span>
          </div>
        </div>
        <label class="qz-instr-check"><input type="checkbox" id="qzInstrAgree" onchange="document.getElementById('qzInstrProceed').disabled=!this.checked"/> I have read and understood the instructions.</label>
      </div>
    </div>
    <footer class="qz-instr-foot">
      <button type="button" class="qz-instr-cancel" onclick="marksCancelInstructions()">Go Back</button>
      <button type="button" class="qz-instr-proceed" id="qzInstrProceed" disabled onclick="quizrrAcceptInstructions()">Proceed to Test →</button>
    </footer>
  </div>`;
}

function showQuizrrInstructions(config, onDone, onCancel) {
  const existing = document.getElementById("marksInstrOverlay");
  if (existing) existing.remove();
  window._marksInstrDone = onDone;
  window._marksInstrCancel = onCancel;
  document.body.classList.add("marks-instr-active");
  try {
    document.body.insertAdjacentHTML("beforeend", quizrrInstructionHtml(config));
  } catch (err) {
    console.error("Quizrr instructions render failed:", err);
    document.body.classList.remove("marks-instr-active");
    showToast("⚠️ Could not show instructions. Starting test…");
    if (typeof onDone === "function") onDone();
    return;
  }
  window.scrollTo(0, 0);
}

function quizrrAcceptInstructions() {
  const cb = document.getElementById("qzInstrAgree");
  if (cb && !cb.checked) { showToast("Please confirm you read the instructions"); return; }
  const el = document.getElementById("marksInstrOverlay");
  if (el) el.remove();
  if (typeof marksRestoreInstrShell === "function") marksRestoreInstrShell();
  if (typeof window._marksInstrDone === "function") window._marksInstrDone();
  window._marksInstrDone = null;
  window._marksInstrCancel = null;
}

function tsFormatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) { return iso; }
}

function tsIsUpcoming(t) {
  if (!t) return false;
  if (t.status === "upcoming") return true;
  if (t.scheduledDate && t.scheduledDate > tsToday()) return true;
  return false;
}

function tsIsAvailable(t) {
  return !tsIsUpcoming(t);
}

function tsCatIcon(cat) {
  const ic = { physics: "⚛️", chemistry: "🧪", mathematics: "📐", qpt: "📝", qft: "🎯", year: "📅" };
  return ic[cat.icon] || "📋";
}

function tsUserName() {
  try {
    const u = JSON.parse(localStorage.getItem("quantrex_user") || "null");
    if (u && u.name) return u.name;
  } catch (e) { /* */ }
  return "Student";
}

function tsMatchesStatusTab(t) {
  const st = tsAttemptStatus(t.id);
  const tab = _tsFilter.statusTab;
  if (tab === "attempted") return st === "completed";
  if (tab === "resume") return st === "inProgress";
  if (tab === "upcoming") return tsIsUpcoming(t);
  if (tab === "available") return tsIsAvailable(t) && st !== "completed" && st !== "inProgress";
  return true;
}

function tsFilterCategoryTests(tests) {
  let list = [...(tests || [])];
  if (_tsSearch) {
    const q = _tsSearch.toLowerCase();
    list = list.filter(t => (t.title || "").toLowerCase().includes(q) || (t.chapter || "").toLowerCase().includes(q));
  }
  if (_tsFilter.testType !== "All Tests") list = list.filter(t => t.testType === _tsFilter.testType);
  if (_tsFilter.subject !== "Overall") list = list.filter(t => (t.subjects || []).includes(_tsFilter.subject));
  list = list.filter(tsMatchesStatusTab);
  if (_tsFilter.dateRange === "Last 5 Tests") list = list.slice(0, 5);
  if (_tsFilter.dateRange === "Last 10 Tests") list = list.slice(0, 10);
  if (_tsSort === "date") list.sort((a, b) => String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || "")));
  if (_tsSort === "name") list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  return list;
}

function tsAnalyticsSummary(tests) {
  const attempts = tsLoadAttempts();
  let attempted = 0, completed = 0, totalPct = 0, inProgress = 0;
  (tests || []).forEach(t => {
    const a = attempts[t.id];
    if (!a || a.status === "notStarted") return;
    attempted++;
    if (a.status === "completed") { completed++; totalPct += a.pct || 0; }
    if (a.status === "inProgress") inProgress++;
  });
  return {
    attempted, completed, inProgress,
    total: (tests || []).length,
    avgPct: completed ? Math.round(totalPct / completed) : 0
  };
}

function tsSubjectAnalytics(tests) {
  const attempts = tsLoadAttempts();
  const subs = ["Physics", "Chemistry", "Mathematics"];
  return subs.map(sub => {
    let done = 0, pctSum = 0;
    (tests || []).forEach(t => {
      if (!(t.subjects || []).includes(sub)) return;
      const a = attempts[t.id];
      if (a && a.status === "completed") { done++; pctSum += a.pct || 0; }
    });
    return { sub, done, avg: done ? Math.round(pctSum / done) : 0 };
  });
}

function tsRingSvg(pct) {
  const p = Math.min(100, Math.max(0, pct || 0));
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c - (p / 100) * c;
  return `<svg class="ts-ring-svg" viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="#252a36" stroke-width="10"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="#3b82f6" stroke-width="10"
      stroke-dasharray="${c}" stroke-dashoffset="${off}" stroke-linecap="round" transform="rotate(-90 60 60)"/>
    <text x="60" y="64" text-anchor="middle" fill="#e8ecf4" font-size="22" font-weight="800" font-family="Kanit,sans-serif">${p}%</text>
  </svg>`;
}

function tsBreadcrumb() {
  const cat = _tsPayload.categoryId && _tsManifest
    ? (_tsManifest.categories || []).find(c => c.id === _tsPayload.categoryId)
    : null;
  if (_tsPage === "analytics") return `<span class="ts-breadcrumb"><a onclick="tsGoPage('home')">Your Tests</a> / <strong>Analytics</strong></span>`;
  if (_tsPage === "alltests" || (_tsPage === "category" && !cat))
    return `<span class="ts-breadcrumb"><a onclick="tsGoPage('home')">Your Tests</a> / <strong>All Tests</strong></span>`;
  if (cat)
    return `<span class="ts-breadcrumb"><a onclick="tsGoPage('home')">Your Tests</a> / <a onclick="tsGoPage('alltests')">All Tests</a> / <strong>${cat.title}</strong></span>`;
  return `<span class="ts-breadcrumb"><strong>Your Tests</strong> / Dashboard</span>`;
}

function tsIconNavHtml() {
  const main = TS_ICON_NAV.map(n =>
    `<button type="button" class="ts-icon-nav-item${_tsNav === n.id ? " on" : ""}" onclick="tsSetNav('${n.id}')" title="${n.label}">
      <span class="ic">${n.icon}</span><span>${n.label}</span>
    </button>`
  ).join("");
  return `<nav class="ts-icon-nav">
    ${main}
    <div class="ts-icon-nav-spacer"></div>
    <div class="ts-icon-nav-foot">
      <button type="button" class="ts-icon-nav-item${_tsPage === "home" ? " on" : ""}" onclick="tsGoPage('home')" title="Home"><span class="ic">🏠</span></button>
      <button type="button" class="ts-icon-nav-item${_tsPage === "analytics" ? " on" : ""}" onclick="tsGoPage('analytics')" title="Analytics"><span class="ic">📊</span></button>
    </div>
  </nav>`;
}

function tsPageThemeIcon() {
  const t = document.documentElement.getAttribute("data-theme") || "dark";
  return t === "light" ? "🌙" : "☀️";
}

function tsTogglePageTheme() {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  root.setAttribute("data-theme", next);
  localStorage.setItem("quantrex_page_theme", next);
  const btn = document.getElementById("tsPageThemeBtn");
  if (btn) btn.textContent = next === "light" ? "🌙" : "☀️";
}
window.tsTogglePageTheme = tsTogglePageTheme;

function tsAppShell(inner) {
  return `<div class="ts-app">
    ${tsIconNavHtml()}
    <div class="ts-app-main">
      <header class="ts-topbar">
        ${tsBreadcrumb()}
        <div class="ts-topbar-actions">
          <button type="button" class="ts-theme-btn" id="tsPageThemeBtn" onclick="tsTogglePageTheme()" title="Light / Dark mode">${tsPageThemeIcon()}</button>
          <div class="ts-user-greet"><strong>Hey, ${tsUserName()}</strong><span>JEE Main 2027 Batch</span></div>
        </div>
      </header>
      <div class="ts-content">${inner}</div>
    </div>
  </div>`;
}

function tsSidebarHtml(manifest, activeId) {
  const cats = manifest.categories || [];
  const items = cats.map(c => {
    const on = c.id === activeId ? " on" : "";
    const badge = c.badge ? `<span class="ts-cat-new">${c.badge}</span>` : "";
    return `<button type="button" class="ts-side-item${on}" onclick="tsOpenCategory('${c.id}')">
      <span>${tsCatIcon(c)} ${c.title}</span>${badge}
    </button>`;
  }).join("");
  return `<aside class="ts-sidebar">
    <button type="button" class="ts-side-nav-btn${_tsPage === "alltests" && !activeId ? " on" : ""}" onclick="tsGoPage('alltests')">📋 All Tests</button>
    <div class="ts-side-head"><strong>Categories</strong><small>${manifest.totalTests || 0} tests</small></div>
    <div class="ts-side-list">${items}</div>
  </aside>`;
}

function tsCategoryCard(cat) {
  const badge = cat.badge ? `<span class="ts-cat-badge">${cat.badge}</span>` : "";
  return `<div class="ts-cat-card" onclick="tsOpenCategory('${cat.id}')">
    <div class="ts-cat-card-ic">${tsCatIcon(cat)}</div>
    <div class="ts-cat-card-body"><strong>${cat.title}</strong><small>${cat.count} Tests</small></div>
    ${badge}<span class="ts-cat-go">›</span>
  </div>`;
}

function tsResourcesHtml(manifest) {
  const res = manifest.resources || [];
  return `<section class="ts-resources"><h3>Resources</h3>
    <div class="ts-res-pills">${res.map(r =>
      `<button type="button" class="ts-res-pill" style="--ts-res:${r.color}" onclick="tsOpenResource('${r.id}','${r.link || ""}')">${r.title}</button>`
    ).join("")}</div></section>`;
}

function tsNextTestsRows(manifest) {
  const tests = (manifest.tests || []).filter(tsIsUpcoming).sort((a, b) =>
    String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || ""))
  ).slice(0, 8);
  if (!tests.length) return `<tr><td colspan="4" class="empty">No upcoming tests — you're all caught up!</td></tr>`;
  return tests.map(t => {
    const subs = (t.subjects || []).join(" + ") || "All";
    return `<tr onclick="tsOpenTest('${t.id}')">
      <td><strong>${t.title}</strong></td>
      <td><span class="ts-badge-upcoming">Upcoming</span></td>
      <td class="ts-date-cell">${tsFormatDate(t.scheduledDate)}</td>
      <td class="ts-date-cell">${subs}</td>
    </tr>`;
  }).join("");
}

function tsRecentTestsRows(manifest) {
  const attempts = tsLoadAttempts();
  const metaById = {};
  (manifest.tests || []).forEach(t => { metaById[t.id] = t; });
  let rows = Object.keys(attempts).map(id => ({ id, ...attempts[id], meta: metaById[id] }))
    .filter(r => r.meta && (_tsDashTab === "completed" ? r.status === "completed" : r.status !== "notStarted"));
  rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  rows = rows.slice(0, 8);
  if (!rows.length) return `<tr><td colspan="4" class="empty">No ${_tsDashTab} tests yet. Start your first test!</td></tr>`;
  return rows.map(r => {
    const badge = r.status === "completed"
      ? `<span class="ts-badge-done">Completed · ${r.pct != null ? r.pct + "%" : "—"}</span>`
      : `<span class="ts-badge-available">In Progress</span>`;
    const date = r.completedAt ? tsFormatDate(r.completedAt.slice(0, 10)) : "—";
    return `<tr onclick="tsOpenTest('${r.id}')">
      <td><strong>${r.meta.title}</strong></td>
      <td>${badge}</td>
      <td class="ts-date-cell">${date}</td>
      <td class="ts-date-cell">${(r.meta.subjects || []).join(" + ")}</td>
    </tr>`;
  }).join("");
}

function tsDashboardHtml(manifest) {
  const s = tsAnalyticsSummary(manifest.tests || []);
  const subs = tsSubjectAnalytics(manifest.tests || []);
  const cats = manifest.categories || [];
  const sideCats = cats.slice(0, 6).map(c =>
    `<div class="ts-side-cat" onclick="tsOpenCategory('${c.id}')"><strong>${c.title}</strong><small>${c.count} tests</small></div>`
  ).join("");
  const subBars = subs.map(x =>
    `<div class="ts-subj-bar-row"><span>${x.sub}</span><div class="ts-subj-bar-track"><div class="ts-subj-bar-fill" style="width:${x.avg}%;background:${x.sub === "Physics" ? "#22c55e" : x.sub === "Chemistry" ? "#f59e0b" : "#3b82f6"}"></div></div><em>${x.avg}%</em></div>`
  ).join("");
  return `<div class="ts-hero-banner">
    <h1>${manifest.title}</h1>
    <p>${manifest.tagline || manifest.subtitle}</p>
  </div>
  <div class="ts-dash-layout">
    <div class="ts-dash-main">
      <div class="ts-dash-stats">
        <div class="ts-stat-card"><span>Attempted</span><strong>${s.attempted}</strong><em>of ${s.total} tests</em></div>
        <div class="ts-stat-card"><span>Overall Accuracy</span><strong>${s.avgPct}%</strong><em>${s.completed} completed</em></div>
        <div class="ts-stat-card"><span>Resume</span><strong>${s.inProgress}</strong><em>in progress</em></div>
      </div>
      <div class="ts-panel">
        <div class="ts-panel-head"><h3>Next Tests</h3><button type="button" class="ts-mini-tab on" onclick="tsGoPage('alltests');tsSetStatusTab('upcoming')">View all upcoming →</button></div>
        <table class="ts-table"><thead><tr><th>Test</th><th>Status</th><th>Date</th><th>Subjects</th></tr></thead><tbody>${tsNextTestsRows(manifest)}</tbody></table>
      </div>
      <div class="ts-panel">
        <div class="ts-panel-head">
          <h3>Recent Tests</h3>
          <div class="ts-mini-tabs">
            <button type="button" class="ts-mini-tab${_tsDashTab === "attempted" ? " on" : ""}" onclick="tsSetDashTab('attempted')">Attempted</button>
            <button type="button" class="ts-mini-tab${_tsDashTab === "completed" ? " on" : ""}" onclick="tsSetDashTab('completed')">Completed</button>
          </div>
        </div>
        <table class="ts-table"><thead><tr><th>Test</th><th>Status</th><th>Date</th><th>Subjects</th></tr></thead><tbody>${tsRecentTestsRows(manifest)}</tbody></table>
      </div>
    </div>
    <aside class="ts-dash-side">
      <div class="ts-panel">
        <div class="ts-panel-head"><h3>Categories</h3><button type="button" class="ts-mini-tab" onclick="tsGoPage('alltests')">All Tests →</button></div>
        <div class="ts-side-cats">${sideCats}</div>
      </div>
      <div class="ts-panel">
        <h3 style="margin:0 0 12px;font-size:15px;font-weight:800">Analytics</h3>
        <div class="ts-analytics-ring">${tsRingSvg(s.avgPct)}<div class="ts-ring-pct">${s.avgPct}%</div><small style="color:var(--ts-muted)">Overall accuracy</small></div>
        <div class="ts-subj-bars">${subBars}</div>
        <button type="button" class="ts-mini-tab" style="margin-top:14px;width:100%" onclick="tsGoPage('analytics')">Full Analytics →</button>
      </div>
    </aside>
  </div>`;
}

function tsAnalyticsPageHtml(manifest) {
  const s = tsAnalyticsSummary(manifest.tests || []);
  const subs = tsSubjectAnalytics(manifest.tests || []);
  const attempts = tsLoadAttempts();
  const recent = Object.keys(attempts).map(id => ({ id, ...attempts[id] }))
    .filter(a => a.status === "completed").sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 10);
  const rows = recent.length ? recent.map(a => {
    const m = (manifest.tests || []).find(t => t.id === a.id);
    return `<tr><td>${m ? m.title : a.id}</td><td>${a.pct != null ? a.pct + "%" : "—"}</td><td>${a.correct != null ? a.correct + "/" + a.total : "—"}</td></tr>`;
  }).join("") : `<tr><td colspan="3" class="empty">Complete tests to see analytics</td></tr>`;
  const subCards = subs.map(x =>
    `<div class="ts-an-card"><strong>${x.avg}%</strong><small>${x.sub} · ${x.done} done</small></div>`
  ).join("");
  return `<div class="ts-analytics-page">
    <h1 style="font-family:Kanit;font-size:24px;font-weight:800;margin:0 0 16px">Performance Analytics</h1>
    <div class="ts-an-grid">
      <div class="ts-an-card"><strong>${s.attempted}</strong><small>Attempted</small></div>
      <div class="ts-an-card"><strong>${s.completed}</strong><small>Completed</small></div>
      <div class="ts-an-card"><strong>${s.avgPct}%</strong><small>Avg Accuracy</small></div>
      <div class="ts-an-card"><strong>${s.inProgress}</strong><small>Resume</small></div>
    </div>
    <div class="ts-dash-layout">
      <div class="ts-panel"><h3 style="margin:0 0 14px">Subject Breakdown</h3><div class="ts-an-grid" style="grid-template-columns:repeat(3,1fr)">${subCards}</div></div>
      <div class="ts-panel"><h3 style="margin:0 0 14px">Accuracy Ring</h3>${tsRingSvg(s.avgPct)}</div>
    </div>
    <div class="ts-panel" style="margin-top:16px"><h3 style="margin:0 0 14px">Recent Scores</h3>
      <table class="ts-table"><thead><tr><th>Test</th><th>Accuracy</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
  </div>`;
}

function tsHomeHtml(manifest) {
  const sections = manifest.sections || [...new Set((manifest.categories || []).map(c => c.section))];
  const blocks = sections.map(sec => {
    const cats = (manifest.categories || []).filter(c => c.section === sec);
    return `<section class="ts-sec-block"><h3 class="ts-sec-title">${sec}</h3><div class="ts-cat-grid">${cats.map(tsCategoryCard).join("")}</div></section>`;
  }).join("");
  const s = tsAnalyticsSummary(manifest.tests || []);
  return `<div class="ts-all-tests-layout">
    ${tsSidebarHtml(manifest, null)}
    <main class="ts-main-panel">
      <div class="ts-main-head">
        <h1>All Tests</h1>
        <p>${manifest.subtitle || manifest.title}</p>
        <div class="ts-head-stats">
          <span><strong>${manifest.totalTests || 0}</strong> Total</span>
          <span><strong>${s.completed}</strong> Done</span>
          <span><strong>${s.avgPct}%</strong> Avg</span>
        </div>
      </div>
      ${tsSyncBanner(manifest)}
      ${blocks}
      ${tsResourcesHtml(manifest)}
    </main>
  </div>`;
}

function tsFiltersHtml(manifest) {
  const filters = manifest.filters || {};
  const types = filters.testTypes || ["All Tests"];
  const subs = filters.subjects || ["Overall"];
  const dates = filters.dateRanges || ["All Dates"];
  return `<div class="ts-filter-bar">
    <select class="ts-select" aria-label="Sort" onchange="tsSetSort(this.value)">
      <option value="default"${_tsSort === "default" ? " selected" : ""}>Sort by Default</option>
      <option value="date"${_tsSort === "date" ? " selected" : ""}>Sort by Date</option>
      <option value="name"${_tsSort === "name" ? " selected" : ""}>Sort by Name</option>
    </select>
    <select class="ts-select" aria-label="Test type" onchange="tsSetFilter('testType', this.value)">
      ${types.map(t => `<option value="${t}"${_tsFilter.testType === t ? " selected" : ""}>${t}</option>`).join("")}
    </select>
    <select class="ts-select" aria-label="Subject" onchange="tsSetFilter('subject', this.value)">
      ${subs.map(s => `<option value="${s}"${_tsFilter.subject === s ? " selected" : ""}>${s}</option>`).join("")}
    </select>
    <select class="ts-select" aria-label="Date range" onchange="tsSetFilter('dateRange', this.value)">
      ${dates.map(d => `<option value="${d}"${_tsFilter.dateRange === d ? " selected" : ""}>${d}</option>`).join("")}
    </select>
    <input type="search" class="ts-search-input" placeholder="Search tests…" value="${_tsSearch.replace(/"/g, "&quot;")}" oninput="tsSetSearch(this.value)"/>
  </div>`;
}

function tsStatusTabsHtml() {
  const tabs = [
    { id: "available", label: "Available" },
    { id: "upcoming", label: "Upcoming" },
    { id: "attempted", label: "Attempted" },
    { id: "resume", label: "Resume" }
  ];
  return `<div class="ts-status-tabs">${tabs.map(t =>
    `<button type="button" class="ts-status-tab ${_tsFilter.statusTab === t.id ? "on" : ""}" onclick="tsSetStatusTab('${t.id}')">${t.label}</button>`
  ).join("")}</div>`;
}

function tsIsPyqMockCategory(cat) {
  return cat && /^pyq_20/.test(cat.id);
}

function tsSyllabusText(t) {
  if (!t) return "";
  return String(t.syllabus || t.subtitle || "").trim();
}

function tsSyllabusBtnHtml(t) {
  const text = tsSyllabusText(t);
  if (!text) return "";
  const enc = encodeURIComponent(text);
  const titleEnc = encodeURIComponent(t.title || "Test");
  return `<button type="button" class="ts-mock-syllabus" onclick="event.stopPropagation();tsShowSyllabus(decodeURIComponent('${titleEnc}'), decodeURIComponent('${enc}'))">View Syllabus</button>`;
}

function tsShowSyllabus(title, body) {
  const existing = document.getElementById("tsSyllabusModal");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", `<div class="marks-modal-overlay" id="tsSyllabusModal" onclick="if(event.target===this)tsCloseSyllabus()">
    <div class="marks-modal marks-preview-modal">
      <div class="marks-modal-head"><h3>📋 Syllabus</h3><button type="button" class="marks-modal-cancel" onclick="tsCloseSyllabus()">✕</button></div>
      <div class="marks-modal-body">
        <h2 class="marks-preview-title">${tsEscHtml(title)}</h2>
        <p class="ts-syllabus-body">${tsEscHtml(body)}</p>
      </div>
    </div>
  </div>`);
}

function tsCloseSyllabus() {
  const el = document.getElementById("tsSyllabusModal");
  if (el) el.remove();
}

function tsMockCardHtml(t) {
  const st = tsAttemptStatus(t.id);
  const up = tsIsUpcoming(t);
  const qs = t.totalQs || 75;
  const marks = t.totalMarks || 300;
  const mins = t.durationMin || 180;
  const btnLabel = up ? "Upcoming" : st === "completed" ? "Analysis" : st === "inProgress" ? "Resume" : "Attempt Test";
  const click = up
    ? `showToast('📅 Available on ${tsFormatDate(t.scheduledDate)}')`
    : `tsOpenTest('${t.id}')`;
  return `<div class="ts-mock-card${up ? " ts-upcoming" : ""}${st === "completed" ? " ts-done" : ""}">
    <div class="ts-mock-main">
      <span class="ts-mock-lock" aria-hidden="true">${up ? "🔒" : "📄"}</span>
      <div class="ts-mock-body">
        <strong>${t.title}</strong>
        <small>${t.subtitle || "Previous Year Paper as Mock"}</small>
        <div class="ts-mock-meta">
          <span>${qs} Qs</span>
          <span>${mins} Min</span>
          <span>Total Marks: ${marks}</span>
        </div>
      </div>
    </div>
    <div class="ts-mock-actions">
      ${tsSyllabusBtnHtml(t)}
      <button type="button" class="ts-mock-attempt" onclick="event.stopPropagation();${click}">${btnLabel}</button>
    </div>
  </div>`;
}

function tsTestActionBtn(t, st) {
  if (tsIsUpcoming(t)) return `<button type="button" class="ts-ch-btn locked" onclick="event.stopPropagation();showToast('📅 Available on ${tsFormatDate(t.scheduledDate)}')">🔒 ${tsFormatDate(t.scheduledDate)}</button>`;
  if (st === "completed") return `<button type="button" class="ts-ch-btn">Analysis</button>`;
  if (st === "inProgress") return `<button type="button" class="ts-ch-btn">Resume</button>`;
  return `<button type="button" class="ts-ch-btn">Attempt</button>`;
}

function tsChapterRow(chapter, tests, num) {
  const done = tests.filter(t => tsAttemptStatus(t.id) === "completed").length;
  const rows = tests.map(t => {
    const st = tsAttemptStatus(t.id);
    const att = tsLoadAttempts()[t.id] || {};
    const up = tsIsUpcoming(t);
    const score = st === "completed" && att.pct != null ? `<em>${att.pct}%</em>` : "";
    const dateHint = up ? `<span class="ts-upcoming-date">Available ${tsFormatDate(t.scheduledDate)}</span>` : "";
    const syl = tsSyllabusBtnHtml(t);
    return `<div class="ts-ch-test${up ? " ts-upcoming" : ""}" onclick="${up ? `showToast('📅 This test opens on ${tsFormatDate(t.scheduledDate)}')` : `tsOpenTest('${t.id}')`}">
      <div class="ts-ch-test-main"><span>${t.title}</span><small>${t.totalQs} Qs · ${t.durationMin}m</small>${dateHint}${score}</div>
      <div class="ts-ch-test-actions">${syl}${tsTestActionBtn(t, st)}</div>
    </div>`;
  }).join("");
  return `<details class="ts-chapter-block"><summary class="ts-chapter-head">
    <span class="ts-ch-num">${num || ""}</span><strong>${chapter}</strong>
    <small>${tests.length} test${tests.length === 1 ? "" : "s"} · ${done} done</small>
  </summary><div class="ts-chapter-tests">${rows}</div></details>`;
}

function tsCategoryListHtml(cat, tests) {
  const filtered = tsFilterCategoryTests(tests);
  if (tsIsPyqMockCategory(cat)) {
    if (!filtered.length) return '<div class="empty">No tests in this tab. Try another filter.</div>';
    return `<div class="ts-mock-list">${filtered.map(t => tsMockCardHtml(t)).join("")}</div>`;
  }
  const byChapter = {};
  filtered.forEach(t => {
    const ch = t.chapter || t.testType || "Tests";
    if (!byChapter[ch]) byChapter[ch] = [];
    byChapter[ch].push(t);
  });
  const chapters = Object.keys(byChapter).sort();
  if (!chapters.length) return '<div class="empty">No tests in this tab. Try another filter.</div>';
  if (chapters.length === 1 && chapters[0] === "Tests") {
    return filtered.map(t => {
      const st = tsAttemptStatus(t.id);
      const up = tsIsUpcoming(t);
      const action = up ? `🔒 ${tsFormatDate(t.scheduledDate)}` : st === "completed" ? "Analysis" : st === "inProgress" ? "Resume" : "Attempt";
      return `<div class="ts-flat-test${up ? " ts-upcoming" : ""}" onclick="${up ? `showToast('📅 Available on ${tsFormatDate(t.scheduledDate)}')` : `tsOpenTest('${t.id}')`}">
        <div><strong>${t.title}</strong><small>${t.totalQs} Qs · ${t.durationMin} min${up ? " · Opens " + tsFormatDate(t.scheduledDate) : ""}</small></div>
        <span class="ts-action">${action} →</span>
      </div>`;
    }).join("");
  }
  return chapters.map((ch, i) => tsChapterRow(ch, byChapter[ch], i + 1)).join("");
}

function tsSyncBanner(manifest) {
  if (!manifest.pendingQuizrrSync) return "";
  return `<div class="ts-sync-banner"><span>🔄 ${manifest.totalTests || 0} tests · Syncing test schedule…</span>
    <button type="button" class="ts-mini-tab" onclick="tsCheckQuizrrSync()">Sync</button></div>`;
}

function tsAboutHtml(manifest) {
  return `<div class="ts-panel"><h2 style="margin:0 0 12px;font-size:20px;font-weight:800">About This Series</h2>
    <p style="color:var(--ts-muted);line-height:1.7;font-size:14px">${manifest.tagline || ""}</p>
    <ul style="margin:16px 0 0;padding-left:20px;line-height:1.9;font-size:14px;color:var(--ts-muted)">
      <li>${manifest.totalTests} tests across PYQ, mocks & chapter-wise</li>
      <li>NTA-style CBT with official instructions</li>
      <li>Analytics, filters & resume support</li>
      <li>Scheduled releases for QPT & QFT mocks</li>
    </ul></div>`;
}

function tsSolutionHtml() {
  return `<div class="ts-panel"><h2 style="margin:0 0 12px;font-size:20px;font-weight:800">Solutions</h2>
    <p style="color:var(--ts-muted);font-size:14px">Complete any test and open <strong>Analysis</strong> to review accuracy and retake. Full step-by-step solutions load with each question in the test engine.</p></div>`;
}

async function tsBuildPageHtml() {
  const seriesId = _tsPayload.folder || TS_SERIES_ID;
  if (!_tsManifest) {
    try { _tsManifest = await tsFetchManifest(seriesId); }
    catch (e) { return tsAppShell('<div class="empty">Test series not found.</div>'); }
  }
  const manifest = _tsManifest;

  if (_tsNav === "about") return tsAppShell(tsAboutHtml(manifest));
  if (_tsNav === "solution") return tsAppShell(tsSolutionHtml());
  if (_tsNav === "resources") return tsAppShell(tsResourcesHtml(manifest) + `<div class="ts-panel" style="margin-top:16px"><p style="color:var(--ts-muted);font-size:14px">Tap a resource pill to open Formula Sheets, Revision Notes, and more.</p></div>`);

  if (_tsPage === "analytics") return tsAppShell(tsAnalyticsPageHtml(manifest));
  if (_tsPage === "alltests") return tsAppShell(tsHomeHtml(manifest));
  if (_tsPage === "category" && _tsPayload.categoryId) return tsAppShell(await tsCategoryInner(manifest));
  return tsAppShell(tsDashboardHtml(manifest));
}

async function tsCategoryInner(manifest) {
  const seriesId = _tsPayload.folder || TS_SERIES_ID;
  const catId = _tsPayload.categoryId;
  const cat = (manifest.categories || []).find(c => c.id === catId);
  if (!cat) return tsHomeHtml(manifest);
  let catData;
  try { catData = await tsFetchCategory(seriesId, cat.file); }
  catch (e) { return '<div class="empty">Category load failed</div>'; }
  const tests = (catData.tests || []).map(t => ({ ...t, file: cat.file, categoryId: cat.id }));
  const label = tsIsPyqMockCategory(cat) ? cat.title : /pyq/i.test(cat.title) && !tsIsPyqMockCategory(cat) ? "Chapter-wise Tests" : "Tests";
  return `<div class="ts-all-tests-layout">
    ${tsSidebarHtml(manifest, catId)}
    <main class="ts-main-panel">
      <div class="ts-cat-head"><h2>${label}</h2><p>${tsIsPyqMockCategory(cat) ? "Previous Year Papers as Mock · 75 Qs · 180 Min · 300 Marks" : cat.title + " · " + cat.count + " tests"}</p></div>
      ${tsFiltersHtml(manifest)}
      ${tsStatusTabsHtml()}
      <div class="ts-chapter-list">${tsCategoryListHtml(cat, tests)}</div>
    </main>
  </div>`;
}

async function tsRenderStandalone() {
  const root = document.getElementById("ts-root");
  if (!root) return;
  root.innerHTML = '<div class="ts-loading">Loading…</div>';
  try {
    root.innerHTML = await tsBuildPageHtml();
  } catch (e) {
    root.innerHTML = tsAppShell('<div class="empty">Failed to load. Refresh and try again.</div>');
  }
}

function tsGoPage(page) {
  _tsPage = page;
  _tsNav = "test";
  if (page === "home") _tsPayload.categoryId = null;
  if (page === "alltests") _tsPayload.categoryId = null;
  tsRerender();
}

function tsSetNav(nav) {
  _tsNav = nav;
  if (nav === "test" && _tsPage === "home") { /* stay */ }
  else if (nav === "test" && !_tsPayload.categoryId) _tsPage = "home";
  tsRerender();
}

function tsSetDashTab(tab) {
  _tsDashTab = tab;
  tsRerender();
}

function tsSetSearch(q) {
  _tsSearch = q;
  clearTimeout(window._tsSearchDebounce);
  window._tsSearchDebounce = setTimeout(() => tsRerender(), 280);
}

function tsSetSort(v) {
  _tsSort = v;
  tsRerender();
}

function tsOpenCategory(catId) {
  _tsNav = "test";
  if (!catId) { _tsPage = "alltests"; _tsPayload.categoryId = null; }
  else { _tsPage = "category"; _tsPayload.categoryId = catId; }
  tsRerender();
}

function tsSetStatusTab(tab) {
  _tsFilter.statusTab = tab;
  tsRerender();
}

function tsSetFilter(key, value) {
  if (key in _tsFilter) _tsFilter[key] = value;
  tsRerender();
}

function tsRerender() {
  if (window.TS_STANDALONE) tsRenderStandalone();
  else if (typeof render === "function") render("testseries", { folder: _tsPayload.folder || TS_SERIES_ID, categoryId: _tsPayload.categoryId });
}

function tsOpenResource(id, link) {
  if (link && !window.TS_STANDALONE && typeof go === "function") go(link);
  else if (link) window.open("app.html#" + link, "_blank");
  else showToast("📚 " + id + " — opening soon");
}

function tsResumeModalHtml(testId, title) {
  return `<div class="marks-modal-overlay marks-resume-overlay" id="tsResumeModal" onclick="if(event.target===this)tsCloseResume()">
    <div class="marks-resume-modal">
      <button type="button" class="marks-resume-close" onclick="tsCloseResume()">✕</button>
      <div class="marks-resume-icon">⏸</div>
      <h3>Resume Test</h3>
      <p class="marks-resume-sub">${tsEscHtml(title)}</p>
      <p class="marks-resume-hint">Your answers and timer are saved. Continue where you left off, or start fresh.</p>
      <button type="button" class="marks-resume-btn" onclick="tsCloseResume();tsResumeTest('${testId}')">▶ Resume Test</button>
      <button type="button" class="marks-resume-secondary" onclick="tsCloseResume();tsStartFreshTest('${testId}')">Start Fresh</button>
      <button type="button" class="marks-resume-cancel" onclick="tsCloseResume()">Cancel</button>
    </div>
  </div>`;
}

function tsCloseResume() {
  const el = document.getElementById("tsResumeModal");
  if (el) el.remove();
}

function tsShowResume(testId, title) {
  const existing = document.getElementById("tsResumeModal");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", tsResumeModalHtml(testId, title));
}

async function tsResumeTest(testId) {
  const seriesId = _tsPayload.folder || TS_SERIES_ID;
  const meta = (_tsManifest && _tsManifest.tests || []).find(t => t.id === testId);
  if (!meta) { showToast("⚠️ Test not found."); return; }
  const test = await tsResolveTest(seriesId, meta);
  if (!test) { showToast("⚠️ Test not found."); return; }
  const persistKey = `ts::${seriesId}::${testId}`;
  const saved = typeof marksLoadSession === "function" ? marksLoadSession(persistKey) : null;
  if (!saved) {
    showToast("⚠️ No saved session. Starting fresh…");
    return tsStartFreshTest(testId);
  }
  await tsLaunchTest(testId, test, meta, seriesId, { resumeData: saved, skipResumePrompt: true });
}

async function tsStartFreshTest(testId) {
  const seriesId = _tsPayload.folder || TS_SERIES_ID;
  const persistKey = `ts::${seriesId}::${testId}`;
  if (typeof marksClearSession === "function") marksClearSession(persistKey);
  tsSaveAttempt(testId, { status: "notStarted" });
  const meta = (_tsManifest && _tsManifest.tests || []).find(t => t.id === testId);
  if (!meta) { showToast("⚠️ Test not found."); return; }
  const test = await tsResolveTest(seriesId, meta);
  if (!test) { showToast("⚠️ Test not found."); return; }
  await tsLaunchTest(testId, test, meta, seriesId, { fresh: true, skipResumePrompt: true });
}

async function tsLaunchTest(testId, test, meta, seriesId, opts) {
  const o = opts || {};
  const st = tsAttemptStatus(testId);
  if (st === "completed" && !o.resumeData) { tsShowAnalysis(testId, meta); return; }
  if (!o.skipResumePrompt && !o.resumeData && !o.fresh) {
    const persistKey = `ts::${seriesId}::${testId}`;
    const saved = typeof marksLoadSession === "function" ? marksLoadSession(persistKey) : null;
    if (saved && (st === "inProgress" || saved.remainingSec > 0)) {
      tsShowResume(testId, test.title || meta.title);
      return;
    }
  }
  showToast("📚 Syncing questions…");
  const loadResult = await tsLoadQuestionsForTest(test);
  const loaded = loadResult && (loadResult.count || 0) > 0;
  const questionIds = (loadResult && loadResult.ids && loadResult.ids.length)
    ? loadResult.ids
    : (test.questionIds || []).map(tsNormalizeQuestionId).filter(Boolean);
  if (!loaded || !questionIds.length) {
    showToast(`⚠️ "${test.title || "Test"}" could not load. Check connection and retry.`);
    return;
  }
  const verified = questionIds.filter(id => getQ(id));
  if (!verified.length) {
    showToast(`⚠️ "${test.title || "Test"}" — questions failed to open. Retry in a moment.`);
    return;
  }
  const expect = test.totalQs || 75;
  if (verified.length < expect * 0.85) {
    showToast(`⚠️ Loaded ${verified.length}/${expect} questions — some may still sync.`);
  }
  tsSaveAttempt(testId, { status: "inProgress", title: test.title, categoryId: meta.categoryId });
  tsStandaloneLaunchTest(testId, test, meta, seriesId, verified, o);
}

function tsBuildTestConfig(testId, test, meta, seriesId, questionIds) {
  return {
    questionIds,
    title: test.title || "Test",
    returnTo: "tests",
    testType: "testseries",
    durationSec: (test.durationMin || 180) * 60,
    timed: true,
    shuffle: false,
    marksMode: true,
    organizeJee: questionIds.length >= 75,
    paperFormat: "jee_main",
    persistKey: `ts::${seriesId}::${testId}`,
    meta: { seriesId, testId, categoryId: meta.categoryId || null, slug: "jee_main" },
    modeLabel: `${test.testType || "Test"} · ${test.totalQs || questionIds.length} Qs`,
    subtitle: test.subtitle || "Previous Year Paper as Mock",
    totalMarks: test.totalMarks || 300,
    scoring: { correct: 4, wrong: -1, unattempted: 0 },
    onComplete: (data) => {
      if (typeof marksClearSession === "function") marksClearSession(`ts::${seriesId}::${testId}`);
      tsSaveAttempt(testId, {
        status: "completed", score: data.score, pct: data.pct,
        correct: data.correct, total: data.total, completedAt: new Date().toISOString()
      });
      showToast("✅ Submitted! View analysis in test list.");
    }
  };
}

function tsStandaloneLaunchTest(testId, test, meta, seriesId, questionIds, opts) {
  const o = opts || {};
  const config = tsBuildTestConfig(testId, test, meta, seriesId, questionIds);
  if (o.resumeData) {
    config.resumeData = o.resumeData;
    config.skipCountdown = true;
  }
  const runTest = async () => {
    try {
      if (typeof MarksLive !== "undefined" && MarksLive.prefetchQuestions) {
        const need = questionIds.filter(id => {
          const q = getQ(id);
          if (!q) return false;
          if (MarksLive.isOptionsIncomplete && MarksLive.isOptionsIncomplete(q)) return true;
          if (MarksLive.isQuestionIncomplete && MarksLive.isQuestionIncomplete(q)) return true;
          return MarksLive.needsFullQuestion(q);
        });
        if (need.length) {
          showToast(`📚 Loading ${need.length} question(s)…`);
          await MarksLive.prefetchQuestions(questionIds);
          tsSyncQMap(questionIds);
        }
      }
      if (typeof QuantrexTestEngine === "undefined") throw new Error("Test engine not loaded");
      const ok = QuantrexTestEngine.begin(config);
      if (!ok) throw new Error("No questions in session");
      const mount = document.getElementById("app-main") || document.getElementById("ts-root");
      if (!mount) throw new Error("No mount element");
      if (typeof launchTestSession === "function") launchTestSession(mount);
      else throw new Error("launchTestSession missing");
    } catch (err) {
      console.error("tsStandaloneLaunchTest:", err);
      showToast("⚠️ Test could not start: " + (err.message || "error"));
      if (typeof exitMarksTestMode === "function") exitMarksTestMode();
      else if (typeof tsRenderStandalone === "function") tsRenderStandalone();
    }
  };
  const afterCountdown = () => {
    if (o.resumeData) {
      if (typeof enterMarksTestMode === "function") enterMarksTestMode();
      runTest();
      return;
    }
    if (typeof showMarksCountdown === "function") showMarksCountdown(runTest);
    else runTest();
  };
  if (o.resumeData) {
    afterCountdown();
    return;
  }
  const showInstr = typeof showAllenInstructions === "function"
    ? showAllenInstructions
    : (typeof showQuizrrInstructions === "function" ? showQuizrrInstructions : null);
  if (showInstr) {
    showInstr(config, afterCountdown, () => {
      if (typeof marksCancelInstructions === "function") marksCancelInstructions();
      else tsRenderStandalone();
    });
    return;
  }
  afterCountdown();
}

async function tsOpenTest(testId) {
  try {
    const seriesId = _tsPayload.folder || TS_SERIES_ID;
    if (!_tsManifest) {
      try { _tsManifest = await tsFetchManifest(seriesId); } catch (e) { showToast("⚠️ Could not load catalog."); return; }
    }
    const meta = (_tsManifest.tests || []).find(t => t.id === testId);
    if (!meta) { showToast("⚠️ Test not found."); return; }
    if (tsIsUpcoming(meta)) {
      showToast("📅 This test will be available on " + tsFormatDate(meta.scheduledDate));
      return;
    }
    const st = tsAttemptStatus(testId);
    if (st === "completed") { tsShowAnalysis(testId, meta); return; }
    showToast("📚 Loading test…");
    let test;
    try { test = await tsResolveTest(seriesId, meta); }
    catch (e) { showToast("⚠️ Could not load test."); return; }
    if (!test) { showToast("⚠️ Test not found."); return; }
    await tsLaunchTest(testId, test, meta, seriesId, {});
  } catch (err) {
    console.error("tsOpenTest failed:", err);
    showToast("⚠️ Error opening test. Try again.");
    if (typeof exitMarksTestMode === "function") exitMarksTestMode();
    tsRenderStandalone();
  }
}

function tsShowAnalysis(testId, meta) {
  const att = tsLoadAttempts()[testId] || {};
  const existing = document.getElementById("tsAnalysisModal");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", `<div class="marks-modal-overlay" id="tsAnalysisModal" onclick="if(event.target===this)tsCloseAnalysis()">
    <div class="marks-modal marks-preview-modal">
      <div class="marks-modal-head"><h3>Test Analysis</h3><button type="button" class="marks-modal-cancel" onclick="tsCloseAnalysis()">✕</button></div>
      <div class="marks-modal-body">
        <h2 class="marks-preview-title">${meta.title}</h2>
        <div class="marks-preview-stats">
          <div class="marks-preview-stat"><strong>${att.pct != null ? att.pct + "%" : "—"}</strong><small>Accuracy</small></div>
          <div class="marks-preview-stat"><strong>${att.correct != null ? att.correct : "—"}/${att.total || meta.totalQs}</strong><small>Correct</small></div>
          <div class="marks-preview-stat"><strong>${att.score != null ? att.score : "—"}</strong><small>Score</small></div>
        </div>
        <button type="button" class="marks-preview-attempt" onclick="tsCloseAnalysis();tsRetakeTest('${testId}')">Retake →</button>
      </div>
    </div>
  </div>`);
}

function tsCloseAnalysis() {
  const el = document.getElementById("tsAnalysisModal");
  if (el) el.remove();
}

async function tsRetakeTest(testId) {
  tsSaveAttempt(testId, { status: "notStarted" });
  await tsOpenTest(testId);
}

async function tsCheckQuizrrSync() {
  showToast("🔄 Checking sync…");
  try {
    const res = await fetch("data/quizrr/sync_status.json?v=" + Date.now());
    if (res.ok) {
      const st = await res.json();
      tsPushNotification(st.message || "Catalog up to date");
    }
  } catch (e) { showToast("Run quizrr_full_import.js when login works"); }
}

async function viewTestSeriesFolder(payload) {
  const p = { ..._tsPayload, ...(payload || {}) };
  _tsPayload = p;
  if (p.categoryId) { _tsPage = "category"; return tsBuildPageHtml(); }
  _tsPage = p.page || "home";
  return tsBuildPageHtml();
}

async function viewTestSeriesCategory(payload) {
  const p = { ..._tsPayload, ...(payload || {}) };
  _tsPayload = p;
  _tsPage = "category";
  return tsBuildPageHtml();
}

async function viewTestSeries(payload) {
  const p = payload || {};
  const isJeeMain = p.folder === TS_SERIES_ID || p.seriesId === TS_SERIES_ID || p.id === "jeemain";

  if (!window.TS_STANDALONE && isJeeMain && !p._inline) {
    const qs = new URLSearchParams();
    if (p.categoryId) qs.set("cat", p.categoryId);
    if (p.page) qs.set("page", p.page);
    const url = "test-series.html" + (qs.toString() ? "?" + qs.toString() : "");
    window.open(url, "_blank", "noopener");
    return `<div class="marks-tests-page"><div class="ts-panel" style="margin-top:20px">
      <h2 style="margin:0 0 8px;font-size:18px;font-weight:800">JEE Main Test Series 2027</h2>
      <p style="color:var(--gray);font-size:14px;margin:0 0 14px">Opened in a new tab — Inter-Marks style dashboard with analytics, filters & scheduled tests.</p>
      <button type="button" class="btn-primary" onclick="window.open('test-series.html','_blank')">Open Again →</button>
    </div></div>`;
  }

  if (p.categoryId) return viewTestSeriesCategory({ folder: p.folder || TS_SERIES_ID, ...p });
  if (isJeeMain) return viewTestSeriesFolder({ folder: p.folder || TS_SERIES_ID, ...p });
  if (typeof viewTestSeriesLegacy === "function") return viewTestSeriesLegacy(p);
  return viewTestSeriesFolder({ folder: TS_SERIES_ID });
}

function tsBootFromUrl() {
  const params = new URLSearchParams(location.search);
  const cat = params.get("cat");
  const page = params.get("page");
  if (cat) { _tsPage = "category"; _tsPayload.categoryId = cat; }
  else if (page) _tsPage = page;
  tsRenderStandalone();
}

(function tsInit() {
  if (typeof document === "undefined") return;
  try {
    const saved = localStorage.getItem("quantrex_page_theme");
    if (saved === "light" || saved === "dark") document.documentElement.setAttribute("data-theme", saved);
  } catch (e) { /* */ }
  document.addEventListener("DOMContentLoaded", () => {
    const stuckShell = document.body.classList.contains("marks-test-active")
      || document.body.classList.contains("allen-practice-active")
      || document.body.classList.contains("marks-instr-active")
      || document.getElementById("marksInstrOverlay")
      || document.getElementById("marksCountdownOverlay");
    if (stuckShell && typeof qxForceResetShell === "function") {
      qxForceResetShell({ clearContent: !!window.TS_STANDALONE });
    } else if (typeof qxClearBlockingMount === "function") {
      qxClearBlockingMount();
    }
    if (window.TS_STANDALONE) tsBootFromUrl();
    setTimeout(async () => {
      try {
        const res = await fetch("data/quizrr/sync_status.json?v=" + Date.now());
        if (!res.ok) return;
        const st = await res.json();
        const last = localStorage.getItem("quantrex_ts_sync_hash");
        if (st.hash && st.hash !== last) {
          localStorage.setItem("quantrex_ts_sync_hash", st.hash);
          if (last) tsPushNotification(st.message || "Test series updated");
        }
      } catch (e) { /* */ }
    }, 2500);
  });
})();