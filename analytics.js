// Quantrex Analytics — test history, performance trends, subject accuracy
const QuantrexAnalytics = (() => {
  const KEY = "quantrex_attempts";
  const MAX = 100;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch (e) { return []; }
  }

  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    try {
      const user = JSON.parse(localStorage.getItem("quantrex_user") || "null");
      if (user && user.uid && typeof QuantrexDB !== "undefined") QuantrexDB.persist(user.uid);
    } catch (e) {}
  }

  function recordAttempt(data) {
    const list = load();
    list.unshift({
      id: Date.now(),
      title: data.title,
      mode: data.mode || data.testType || "custom",
      exam: data.exam,
      correct: data.correct,
      wrong: data.wrong,
      skipped: data.skipped,
      score: data.score,
      maxScore: data.maxScore,
      pct: data.pct,
      total: data.total,
      timeUsed: data.timeUsed,
      breakdown: data.breakdown,
      date: data.date || Date.now()
    });
    save(list);
  }

  function summary() {
    const list = load();
    if (!list.length) return { attempts: 0, avgPct: 0, totalCorrect: 0, totalQs: 0, bestPct: 0 };
    const avgPct = Math.round(list.reduce((s, a) => s + a.pct, 0) / list.length);
    const totalCorrect = list.reduce((s, a) => s + a.correct, 0);
    const totalQs = list.reduce((s, a) => s + a.total, 0);
    const bestPct = Math.max(...list.map(a => a.pct));
    return { attempts: list.length, avgPct, totalCorrect, totalQs, bestPct };
  }

  function subjectAggregate() {
    const list = load();
    const agg = {};
    list.forEach(a => {
      if (!a.breakdown || !a.breakdown.subject) return;
      Object.entries(a.breakdown.subject).forEach(([sub, v]) => {
        if (!agg[sub]) agg[sub] = { correct: 0, wrong: 0, total: 0 };
        agg[sub].correct += v.correct;
        agg[sub].wrong += v.wrong;
        agg[sub].total += v.total;
      });
    });
    return agg;
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function formatTime(sec) {
    if (typeof QuantrexTestEngine !== "undefined") return QuantrexTestEngine.formatTime(sec);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function viewAnalytics() {
    const list = load();
    const sum = summary();
    const subj = subjectAggregate();
    const subjBars = Object.entries(subj).map(([name, v]) => {
      const acc = v.total ? Math.round(v.correct / v.total * 100) : 0;
      return `<div class="qx-subj-bar"><div class="qx-subj-label"><span>${name}</span><span>${acc}%</span></div>
        <div class="qx-bar-track"><div class="qx-bar-fill" style="width:${acc}%"></div></div></div>`;
    }).join("");

    const history = list.length ? list.slice(0, 20).map(a => `
      <div class="qx-hist-row">
        <div><strong>${a.title}</strong><small>${formatDate(a.date)} · ${a.mode}</small></div>
        <div class="qx-hist-score"><span class="tag ${a.pct >= 60 ? "tag-ok" : "tag-no"}">${a.pct}%</span>
          <small>${a.correct}/${a.total} · ${formatTime(a.timeUsed)}</small></div>
      </div>`).join("") : '<div class="empty">No assessments yet. Take a test to see analytics here.</div>';

    const solved = STATE.solved;
    const practiceAcc = solved.length ? Math.round(solved.filter(s => s.correct).length / solved.length * 100) : 0;

    return `${typeof topbar === "function" ? topbar("Performance Analytics", "Track your progress across tests and practice") : ""}
      <div class="dash-stats">
        <div class="ds"><strong>${sum.attempts}</strong><small>Tests Taken</small></div>
        <div class="ds"><strong>${sum.avgPct}%</strong><small>Avg Test Score</small></div>
        <div class="ds"><strong>${sum.bestPct}%</strong><small>Best Score</small></div>
        <div class="ds"><strong>${practiceAcc}%</strong><small>Practice Accuracy</small></div>
      </div>
      ${subjBars ? `<h3 class="sec-title">Subject Accuracy (All Tests)</h3><div class="qx-analytics-bars">${subjBars}</div>` : ""}
      <h3 class="sec-title">Recent Assessments</h3>
      <div class="qx-history">${history}</div>
      <div class="result-actions" style="margin-top:20px">
        <button class="btn-primary" onclick="go('tests')">Take a Test</button>
        <button class="btn-soft danger" onclick="QuantrexAnalytics.clear()">Clear History</button>
      </div>`;
  }

  function clear() {
    if (confirm("Clear all test history and analytics?")) {
      localStorage.removeItem(KEY);
      showToast("Analytics cleared");
      go("analytics");
    }
  }

  return { recordAttempt, load, summary, subjectAggregate, viewAnalytics, clear };
})();