// JEE Main Test Series 2027 — Quizrr-style folder, filters, analytics, auto-sync notifications

const TS_ATTEMPT_STORE = "quantrex_ts_attempts_v1";
const TS_NOTIFY_STORE = "quantrex_ts_notify_v1";
const TS_LAST_SYNC_KEY = "quantrex_ts_last_sync_check";

let _tsPayload = { seriesId: "jee_main_test_series_2027" };
let _tsManifest = null;
let _tsFilter = { testType: "All Tests", subject: "Overall", dateRange: "All Dates", status: "all" };

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

async function tsFetchTest(seriesId, file) {
  const res = await fetch(`data/quizrr/${seriesId}/${file}?v=${typeof QX_BUILD !== "undefined" ? QX_BUILD : Date.now()}`);
  if (!res.ok) throw new Error("test");
  return res.json();
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

function tsFilterTests(tests) {
  let list = [...(tests || [])];
  if (_tsFilter.testType !== "All Tests") list = list.filter(t => t.testType === _tsFilter.testType);
  if (_tsFilter.subject !== "Overall") {
    list = list.filter(t => (t.subjects || []).some(s => s === _tsFilter.subject));
  }
  if (_tsFilter.status === "attempted") list = list.filter(t => tsAttemptStatus(t.id) === "completed");
  if (_tsFilter.status === "notStarted") list = list.filter(t => tsAttemptStatus(t.id) === "notStarted");
  if (_tsFilter.status === "inProgress") list = list.filter(t => tsAttemptStatus(t.id) === "inProgress");
  list.sort((a, b) => (b.scheduledDate || "").localeCompare(a.scheduledDate || ""));
  if (_tsFilter.dateRange === "Last 5 Tests") list = list.slice(0, 5);
  if (_tsFilter.dateRange === "Last 10 Tests") list = list.slice(0, 10);
  return list;
}

function tsAnalyticsSummary(tests) {
  const attempts = tsLoadAttempts();
  let attempted = 0, completed = 0, totalScore = 0, totalPct = 0;
  (tests || []).forEach(t => {
    const a = attempts[t.id];
    if (!a || a.status === "notStarted") return;
    attempted++;
    if (a.status === "completed") {
      completed++;
      totalScore += a.score || 0;
      totalPct += a.pct || 0;
    }
  });
  const avgPct = completed ? Math.round(totalPct / completed) : 0;
  return { attempted, completed, total: tests.length, avgPct };
}

function tsFilterBar(manifest) {
  const types = (manifest.filters && manifest.filters.testTypes) || ["All Tests"];
  const subs = (manifest.filters && manifest.filters.subjects) || ["Overall"];
  const dates = (manifest.filters && manifest.filters.dateRanges) || ["All Dates"];
  const statuses = [
    { id: "all", label: "All" },
    { id: "notStarted", label: "Not Started" },
    { id: "inProgress", label: "Resume" },
    { id: "attempted", label: "Attempted" }
  ];
  const chip = (val, cur, fn) =>
    `<button type="button" class="ts-filter-chip ${cur === val ? "on" : ""}" onclick="${fn}('${val.replace(/'/g, "\\'")}')">${val}</button>`;
  return `<div class="ts-filter-panel">
    <div class="ts-filter-row">
      <span class="ts-filter-label">Test Type</span>
      <div class="ts-filter-chips">${types.map(t => chip(t, _tsFilter.testType, "tsSetTestType")).join("")}</div>
    </div>
    <div class="ts-filter-row">
      <span class="ts-filter-label">Subject</span>
      <div class="ts-filter-chips">${subs.map(s => chip(s, _tsFilter.subject, "tsSetSubject")).join("")}</div>
    </div>
    <div class="ts-filter-row">
      <span class="ts-filter-label">Test Date</span>
      <div class="ts-filter-chips">${dates.map(d => chip(d, _tsFilter.dateRange, "tsSetDateRange")).join("")}</div>
    </div>
    <div class="ts-filter-row">
      <span class="ts-filter-label">Status</span>
      <div class="ts-filter-chips">${statuses.map(s => chip(s.id, _tsFilter.status, "tsSetStatus")).join("")}</div>
    </div>
  </div>`;
}

function tsTestRow(t) {
  const st = tsAttemptStatus(t.id);
  const att = tsLoadAttempts()[t.id] || {};
  const subBadges = (t.subjects || []).map(s => {
    const sty = tsSubjectStyle(s);
    return `<span class="ts-sub-badge" style="background:${sty.bg};color:${sty.color}">${s}</span>`;
  }).join("");
  const action = st === "completed" ? "View Analysis" : st === "inProgress" ? "Resume" : "Attempt";
  const scoreLine = st === "completed" && att.pct != null
    ? `<span class="ts-score">${att.pct}% · ${att.correct || 0}/${att.total || t.totalQs}</span>` : "";
  return `<div class="ts-test-row ${st}" onclick="tsOpenTest('${t.id}')">
    <div class="ts-test-main">
      <strong>${t.title}</strong>
      <small>${t.testType} · ${t.totalQs} Qs · ${t.durationMin} min</small>
      <div class="ts-test-meta">${subBadges}<span class="ts-date">📅 ${tsFormatDate(t.scheduledDate)}</span></div>
    </div>
    <div class="ts-test-side">
      ${scoreLine}
      <span class="ts-action">${action} →</span>
    </div>
  </div>`;
}

function tsAnalyticsPanel(manifest, tests) {
  const s = tsAnalyticsSummary(tests);
  const subs = ["Physics", "Chemistry", "Mathematics"];
  const subRows = subs.map(sub => {
    const subTests = tests.filter(t => (t.subjects || []).includes(sub));
    const subSum = tsAnalyticsSummary(subTests);
    const sty = tsSubjectStyle(sub);
    return `<div class="ts-an-sub" style="border-color:${sty.color}">
      <strong style="color:${sty.color}">${sub}</strong>
      <span>${subSum.completed}/${subTests.length} done</span>
      <em>Avg ${subSum.avgPct}%</em>
    </div>`;
  }).join("");
  return `<section class="ts-analytics">
    <h3>Series Analytics</h3>
    <div class="ts-an-cards">
      <div class="ts-an-card"><strong>${s.completed}</strong><small>Tests Completed</small></div>
      <div class="ts-an-card"><strong>${s.attempted}</strong><small>In Progress + Done</small></div>
      <div class="ts-an-card"><strong>${s.avgPct}%</strong><small>Avg Accuracy</small></div>
      <div class="ts-an-card"><strong>${s.total - s.completed}</strong><small>Remaining</small></div>
    </div>
    <div class="ts-an-subs">${subRows}</div>
  </section>`;
}

function tsSyncBanner(manifest) {
  if (!manifest.pendingQuizrrSync) return "";
  return `<div class="ts-sync-banner">
    <span>🔄 Quizrr auto-sync pending — new tests &amp; dates will appear with notification when credentials sync succeeds.</span>
    <button type="button" class="btn-soft sm" onclick="tsCheckQuizrrSync()">Check Now</button>
  </div>`;
}

async function viewTestSeriesFolder(payload) {
  const p = { ..._tsPayload, ...(payload || {}) };
  _tsPayload = p;
  const seriesId = p.folder || p.seriesId || "jee_main_test_series_2027";
  try {
    _tsManifest = await tsFetchManifest(seriesId);
  } catch (e) {
    return `<div class="marks-tests-page"><div class="empty">Test series not found. Run import from E:\\QUIZRR_IMPORT_TASK</div></div>`;
  }
  const tests = _tsFilterTests(_tsManifest.tests || []);
  const unread = tsLoadNotifications().filter(n => !n.read).length;
  return `<div class="marks-tests-page ts-folder-page">
    <button type="button" class="pyqmock-back" onclick="go('tests')">← Tests</button>
    <div class="ts-folder-hero">
      <div class="ts-folder-logo">JEE<br>MAIN</div>
      <div>
        <h1>${_tsManifest.title}</h1>
        <p>${_tsManifest.tagline || ""} · ${_tsManifest.tests.length} tests</p>
        <small class="ts-sync-src">Source: ${_tsManifest.syncedFrom || "local"} · Updated ${tsFormatDate((_tsManifest.syncedAt || "").slice(0, 10))}</small>
      </div>
      ${unread ? `<span class="ts-notify-pill">${unread} new</span>` : ""}
    </div>
    ${tsSyncBanner(_tsManifest)}
    ${tsFilterBar(_tsManifest)}
    ${tsAnalyticsPanel(_tsManifest, _tsManifest.tests || [])}
    <div class="ts-test-list">
      <h3>Tests (${tests.length})</h3>
      ${tests.length ? tests.map(tsTestRow).join("") : '<div class="empty">No tests match filters.</div>'}
    </div>
  </div>`;
}

function tsSetTestType(v) { _tsFilter.testType = v; render("testseries", { folder: _tsPayload.folder || "jee_main_test_series_2027" }); }
function tsSetSubject(v) { _tsFilter.subject = v; render("testseries", { folder: _tsPayload.folder || "jee_main_test_series_2027" }); }
function tsSetDateRange(v) { _tsFilter.dateRange = v; render("testseries", { folder: _tsPayload.folder || "jee_main_test_series_2027" }); }
function tsSetStatus(v) { _tsFilter.status = v; render("testseries", { folder: _tsPayload.folder || "jee_main_test_series_2027" }); }

async function tsOpenTest(testId) {
  const seriesId = _tsPayload.folder || "jee_main_test_series_2027";
  const meta = (_tsManifest && _tsManifest.tests || []).find(t => t.id === testId);
  if (!meta) return;
  const st = tsAttemptStatus(testId);
  if (st === "completed") {
    tsShowAnalysis(testId, meta);
    return;
  }
  showToast("📚 Loading test…");
  let test;
  try {
    test = await tsFetchTest(seriesId, meta.file);
  } catch (e) {
    showToast("⚠️ Could not load test.");
    return;
  }
  if (!test.questionIds || !test.questionIds.length) {
    showToast("⚠️ No questions in this test yet.");
    return;
  }
  if (typeof loadSingleBank === "function") await loadSingleBank("jee_main");
  if (typeof MarksLive !== "undefined" && MarksLive.prefetchQuestions) {
    await MarksLive.prefetchQuestions(test.questionIds);
  }
  tsSaveAttempt(testId, { status: "inProgress", title: test.title });
  const key = `ts::${seriesId}::${testId}`;
  startTest(test.questionIds, test.title, "tests", {
    testType: "testseries",
    timed: true,
    durationSec: (test.durationMin || 180) * 60,
    shuffle: false,
    marksMode: true,
    organizeJee: true,
    paperFormat: "jee_main",
    persistKey: key,
    meta: { seriesId, testId, slug: "jee_main" },
    modeLabel: `${test.testType} · ${test.totalQs} Qs`,
    onComplete: (data) => {
      marksClearSession();
      tsSaveAttempt(testId, {
        status: "completed",
        score: data.score,
        pct: data.pct,
        correct: data.correct,
        total: data.total,
        completedAt: new Date().toISOString()
      });
      showToast("✅ Test submitted! View analysis in series folder.");
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
        <p class="marks-preview-chapters">${(meta.subjects || []).join(" · ")} · ${tsFormatDate(meta.scheduledDate)}</p>
        <button type="button" class="marks-preview-attempt" onclick="tsCloseAnalysis();tsRetakeTest('${testId}')">Retake Test →</button>
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
  showToast("🔄 Checking Quizrr for new tests…");
  try {
    const res = await fetch("data/quizrr/sync_status.json?v=" + Date.now());
    if (res.ok) {
      const st = await res.json();
      if (st.newTests) tsPushNotification(`${st.newTests} new tests added from Quizrr!`);
      else showToast("✓ Already up to date.");
    } else {
      showToast("ℹ️ Run tools/quizrr_full_import.js on E: drive to sync from Quizrr.");
    }
  } catch (e) {
    showToast("ℹ️ Sync script ready at E:\\QUIZRR_IMPORT_TASK — login pending.");
  }
  localStorage.setItem(TS_LAST_SYNC_KEY, String(Date.now()));
}

async function viewTestSeries(payload) {
  const p = payload || {};
  if (p.folder || p.seriesId === "jee_main_test_series_2027" || p.id === "jeemain") {
    return viewTestSeriesFolder({ folder: p.folder || "jee_main_test_series_2027", ...p });
  }
  if (typeof viewTestSeriesLegacy === "function") return viewTestSeriesLegacy(p);
  return viewTestSeriesFolder({ folder: "jee_main_test_series_2027" });
}

// Auto-notify on load if sync status changed
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
          if (last) tsPushNotification((st.message || "Test series updated from Quizrr"));
        }
      } catch (e) { /* offline */ }
    }, 3000);
  });
})();