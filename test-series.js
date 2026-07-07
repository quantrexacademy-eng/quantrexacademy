// JEE Main Test Series 2027 — Quizrr screenshots 424/425 style

const TS_ATTEMPT_STORE = "quantrex_ts_attempts_v1";
const TS_NOTIFY_STORE = "quantrex_ts_notify_v1";
const TS_LAST_SYNC_KEY = "quantrex_ts_last_sync_check";

let _tsPayload = { seriesId: "jee_main_test_series_2027" };
let _tsManifest = null;
let _tsCategoryCache = {};
let _tsFilter = { testType: "All Tests", subject: "Overall", dateRange: "All Dates", statusTab: "available" };

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
  if (typeof showToast === "function") showToast("🔔 " + msg);
}

async function tsFetchManifest(seriesId) {
  const sid = seriesId || "jee_main_test_series_2027";
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

function tsFormatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) { return iso; }
}

function tsSubjectStyle(sub) {
  const m = {
    Physics: { color: "#37B24D", bg: "rgba(55,178,77,.12)" },
    Chemistry: { color: "#FF8C33", bg: "rgba(255,140,51,.12)" },
    Mathematics: { color: "#0086FF", bg: "rgba(0,134,255,.12)" },
    Overall: { color: "#6366f1", bg: "rgba(99,102,241,.12)" }
  };
  return m[sub] || { color: "#94a3b8", bg: "rgba(148,163,184,.12)" };
}

function tsCatIcon(cat) {
  const ic = { physics: "⚛️", chemistry: "🧪", mathematics: "📐", qpt: "📝", qft: "🎯", year: "📅" };
  return ic[cat.icon] || "📋";
}

function tsMatchesStatusTab(t) {
  const st = tsAttemptStatus(t.id);
  const tab = _tsFilter.statusTab;
  if (tab === "attempted") return st === "completed";
  if (tab === "resume") return st === "inProgress";
  if (tab === "upcoming") return t.status === "upcoming" || (t.scheduledDate && t.scheduledDate > new Date().toISOString().slice(0, 10));
  return st === "notStarted" && t.status !== "upcoming";
}

function tsFilterCategoryTests(tests) {
  let list = [...(tests || [])];
  if (_tsFilter.testType !== "All Tests") list = list.filter(t => t.testType === _tsFilter.testType);
  if (_tsFilter.subject !== "Overall") list = list.filter(t => (t.subjects || []).includes(_tsFilter.subject));
  list = list.filter(tsMatchesStatusTab);
  if (_tsFilter.dateRange === "Last 5 Tests") list = list.slice(0, 5);
  if (_tsFilter.dateRange === "Last 10 Tests") list = list.slice(0, 10);
  return list;
}

function tsAnalyticsSummary(tests) {
  const attempts = tsLoadAttempts();
  let attempted = 0, completed = 0, totalPct = 0;
  (tests || []).forEach(t => {
    const a = attempts[t.id];
    if (!a || a.status === "notStarted") return;
    attempted++;
    if (a.status === "completed") { completed++; totalPct += a.pct || 0; }
  });
  return { attempted, completed, total: tests.length, avgPct: completed ? Math.round(totalPct / completed) : 0 };
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
    <div class="ts-side-head"><strong>All Tests</strong><small>${manifest.totalTests || (manifest.tests || []).length} tests</small></div>
    <div class="ts-side-list">${items}</div>
  </aside>`;
}

function tsCategoryCard(cat) {
  const badge = cat.badge ? `<span class="ts-cat-badge">${cat.badge}</span>` : "";
  return `<div class="ts-cat-card" onclick="tsOpenCategory('${cat.id}')">
    <div class="ts-cat-card-ic">${tsCatIcon(cat)}</div>
    <div class="ts-cat-card-body">
      <strong>${cat.title}</strong>
      <small>${cat.count} Tests</small>
    </div>
    ${badge}
    <span class="ts-cat-go">›</span>
  </div>`;
}

function tsResourcesHtml(manifest) {
  const res = manifest.resources || [];
  return `<section class="ts-resources">
    <h3>Resources</h3>
    <div class="ts-res-pills">${res.map(r =>
      `<button type="button" class="ts-res-pill" style="--ts-res:${r.color}" onclick="tsOpenResource('${r.id}','${r.link || ""}')">${r.title}</button>`
    ).join("")}</div>
  </section>`;
}

function tsHomeHtml(manifest) {
  const sections = manifest.sections || [...new Set((manifest.categories || []).map(c => c.section))];
  const blocks = sections.map(sec => {
    const cats = (manifest.categories || []).filter(c => c.section === sec);
    return `<section class="ts-sec-block">
      <h3 class="ts-sec-title">${sec}</h3>
      <div class="ts-cat-grid">${cats.map(tsCategoryCard).join("")}</div>
    </section>`;
  }).join("");
  const s = tsAnalyticsSummary(manifest.tests || []);
  return `<div class="ts-all-tests-layout">
    ${tsSidebarHtml(manifest, null)}
    <main class="ts-main-panel">
      <div class="ts-main-head">
        <h1>All Tests</h1>
        <p>${manifest.subtitle || manifest.title}</p>
        <div class="ts-head-stats">
          <span><strong>${manifest.totalTests || (manifest.tests || []).length}</strong> Total Tests</span>
          <span><strong>${s.completed}</strong> Completed</span>
          <span><strong>${s.avgPct}%</strong> Avg Score</span>
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
    <select class="ts-select" aria-label="Test type" onchange="tsSetFilter('testType', this.value)">
      ${types.map(t => `<option value="${t}"${_tsFilter.testType === t ? " selected" : ""}>${t}</option>`).join("")}
    </select>
    <select class="ts-select" aria-label="Subject" onchange="tsSetFilter('subject', this.value)">
      ${subs.map(s => `<option value="${s}"${_tsFilter.subject === s ? " selected" : ""}>${s}</option>`).join("")}
    </select>
    <select class="ts-select" aria-label="Date range" onchange="tsSetFilter('dateRange', this.value)">
      ${dates.map(d => `<option value="${d}"${_tsFilter.dateRange === d ? " selected" : ""}>${d}</option>`).join("")}
    </select>
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

function tsChapterRow(chapter, tests, num) {
  const done = tests.filter(t => tsAttemptStatus(t.id) === "completed").length;
  const rows = tests.map(t => {
    const st = tsAttemptStatus(t.id);
    const att = tsLoadAttempts()[t.id] || {};
    const action = st === "completed" ? "Analysis" : st === "inProgress" ? "Resume" : "Attempt";
    const score = st === "completed" && att.pct != null ? `<em>${att.pct}%</em>` : "";
    return `<div class="ts-ch-test" onclick="event.stopPropagation();tsOpenTest('${t.id}')">
      <span>${t.title}</span>
      <small>${t.totalQs} Qs · ${t.durationMin}m</small>
      ${score}
      <button type="button" class="ts-ch-btn">${action}</button>
    </div>`;
  }).join("");
  return `<details class="ts-chapter-block">
    <summary class="ts-chapter-head">
      <span class="ts-ch-num">${num || ""}</span>
      <strong>${chapter}</strong>
      <small>${tests.length} test${tests.length === 1 ? "" : "s"} · ${done} done</small>
    </summary>
    <div class="ts-chapter-tests">${rows}</div>
  </details>`;
}

function tsCategoryListHtml(cat, tests) {
  const filtered = tsFilterCategoryTests(tests);
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
      return `<div class="ts-flat-test" onclick="tsOpenTest('${t.id}')">
        <strong>${t.title}</strong>
        <small>${t.totalQs} Qs · ${t.durationMin} min · ${t.testType}</small>
        <span class="ts-action">${st === "completed" ? "Analysis" : st === "inProgress" ? "Resume" : "Attempt"} →</span>
      </div>`;
    }).join("");
  }
  return chapters.map((ch, i) => tsChapterRow(ch, byChapter[ch], i + 1)).join("");
}

function tsSyncBanner(manifest) {
  if (!manifest.pendingQuizrrSync) return "";
  return `<div class="ts-sync-banner">
    <span>🔄 ${manifest.totalTests || 0} tests loaded · Quizrr live dates sync when login succeeds (notification auto).</span>
    <button type="button" class="btn-soft sm" onclick="tsCheckQuizrrSync()">Sync</button>
  </div>`;
}

async function viewTestSeriesCategory(payload) {
  const p = { ..._tsPayload, ...(payload || {}) };
  _tsPayload = p;
  const seriesId = p.folder || "jee_main_test_series_2027";
  const catId = p.categoryId;
  if (!_tsManifest) {
    try { _tsManifest = await tsFetchManifest(seriesId); } catch (e) {
      return `<div class="empty">Series not found</div>`;
    }
  }
  const cat = (_tsManifest.categories || []).find(c => c.id === catId);
  if (!cat) return viewTestSeriesFolder(p);
  let catData;
  try { catData = await tsFetchCategory(seriesId, cat.file); } catch (e) {
    return `<div class="empty">Category load failed</div>`;
  }
  const tests = (catData.tests || []).map(t => ({
    ...t,
    file: cat.file,
    categoryId: cat.id
  }));
  const label = /pyq/i.test(cat.title) ? "Chapter-wise Tests" : "Tests";
  return `<div class="marks-tests-page ts-folder-page">
    <button type="button" class="pyqmock-back" onclick="tsOpenCategory(null)">← All Tests</button>
    <div class="ts-all-tests-layout">
      ${tsSidebarHtml(_tsManifest, catId)}
      <main class="ts-main-panel">
        <div class="ts-cat-head">
          <h2>${cat.title}</h2>
          <p>${label} · ${cat.count} tests</p>
        </div>
        ${tsFiltersHtml(_tsManifest)}
        ${tsStatusTabsHtml()}
        <div class="ts-chapter-list">${tsCategoryListHtml(cat, tests)}</div>
      </main>
    </div>
  </div>`;
}

async function viewTestSeriesFolder(payload) {
  const p = { ..._tsPayload, ...(payload || {}) };
  _tsPayload = p;
  if (p.categoryId) return viewTestSeriesCategory(p);
  const seriesId = p.folder || p.seriesId || "jee_main_test_series_2027";
  try {
    _tsManifest = await tsFetchManifest(seriesId);
  } catch (e) {
    return `<div class="marks-tests-page"><div class="empty">Test series not found.</div></div>`;
  }
  const unread = tsLoadNotifications().filter(n => !n.read).length;
  return `<div class="marks-tests-page ts-folder-page">
    <button type="button" class="pyqmock-back" onclick="go('tests')">← Tests</button>
    <div class="ts-top-banner">
      <span class="ts-batch-pill">JEE Main 2027 Full Test Series for Class 12 (April Batch)</span>
      ${unread ? `<span class="ts-notify-pill">${unread} new</span>` : ""}
    </div>
    ${tsHomeHtml(_tsManifest)}
  </div>`;
}

function tsOpenCategory(catId) {
  if (!catId) render("testseries", { folder: _tsPayload.folder || "jee_main_test_series_2027" });
  else render("testseries", { folder: _tsPayload.folder || "jee_main_test_series_2027", categoryId: catId });
}

function tsSetStatusTab(tab) {
  _tsFilter.statusTab = tab;
  render("testseries", { folder: _tsPayload.folder || "jee_main_test_series_2027", categoryId: _tsPayload.categoryId });
}

function tsSetFilter(key, value) {
  if (key in _tsFilter) _tsFilter[key] = value;
  render("testseries", { folder: _tsPayload.folder || "jee_main_test_series_2027", categoryId: _tsPayload.categoryId });
}

function tsOpenResource(id, link) {
  if (link && typeof go === "function") go(link);
  else showToast("📚 " + id + " — opening soon");
}

async function tsOpenTest(testId) {
  const seriesId = _tsPayload.folder || "jee_main_test_series_2027";
  const meta = (_tsManifest && _tsManifest.tests || []).find(t => t.id === testId);
  if (!meta) return;
  const st = tsAttemptStatus(testId);
  if (st === "completed") { tsShowAnalysis(testId, meta); return; }
  showToast("📚 Loading test…");
  let test;
  try { test = await tsResolveTest(seriesId, meta); } catch (e) {
    showToast("⚠️ Could not load test."); return;
  }
  if (!test || !test.questionIds || !test.questionIds.length) {
    showToast("⚠️ No questions in this test."); return;
  }
  if (typeof loadSingleBank === "function") await loadSingleBank("jee_main");
  if (typeof MarksLive !== "undefined" && MarksLive.prefetchQuestions) {
    await MarksLive.prefetchQuestions(test.questionIds.slice(0, 80));
  }
  tsSaveAttempt(testId, { status: "inProgress", title: test.title, categoryId: meta.categoryId });
  startTest(test.questionIds, test.title, "tests", {
    testType: "testseries",
    timed: true,
    durationSec: (test.durationMin || 180) * 60,
    shuffle: false,
    marksMode: true,
    organizeJee: true,
    paperFormat: "jee_main",
    persistKey: `ts::${seriesId}::${testId}`,
    meta: { seriesId, testId, slug: "jee_main" },
    modeLabel: `${test.testType} · ${test.totalQs} Qs`,
    onComplete: (data) => {
      marksClearSession();
      tsSaveAttempt(testId, {
        status: "completed", score: data.score, pct: data.pct,
        correct: data.correct, total: data.total, completedAt: new Date().toISOString()
      });
      showToast("✅ Submitted! View analysis in test list.");
    }
  });
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

async function viewTestSeries(payload) {
  const p = payload || {};
  if (p.categoryId) return viewTestSeriesCategory({ folder: p.folder || "jee_main_test_series_2027", ...p });
  if (p.folder || p.seriesId === "jee_main_test_series_2027" || p.id === "jeemain") {
    return viewTestSeriesFolder({ folder: p.folder || "jee_main_test_series_2027", ...p });
  }
  if (typeof viewTestSeriesLegacy === "function") return viewTestSeriesLegacy(p);
  return viewTestSeriesFolder({ folder: "jee_main_test_series_2027" });
}

(function tsInitSyncWatch() {
  if (typeof document === "undefined") return;
  document.addEventListener("DOMContentLoaded", () => {
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