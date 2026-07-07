// Quantrex Analytics — unique performance intelligence dashboard
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
    if (!list.length) return { attempts: 0, avgPct: 0, totalCorrect: 0, totalQs: 0, bestPct: 0, totalTime: 0 };
    const avgPct = Math.round(list.reduce((s, a) => s + a.pct, 0) / list.length);
    const totalCorrect = list.reduce((s, a) => s + a.correct, 0);
    const totalQs = list.reduce((s, a) => s + a.total, 0);
    const bestPct = Math.max(...list.map(a => a.pct));
    const totalTime = list.reduce((s, a) => s + (a.timeUsed || 0), 0);
    return { attempts: list.length, avgPct, totalCorrect, totalQs, bestPct, totalTime };
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

  function difficultyAggregate() {
    const list = load();
    const agg = {};
    list.forEach(a => {
      if (!a.breakdown || !a.breakdown.difficulty) return;
      Object.entries(a.breakdown.difficulty).forEach(([d, v]) => {
        if (!agg[d]) agg[d] = { correct: 0, total: 0 };
        agg[d].correct += v.correct;
        agg[d].total += v.total;
      });
    });
    return agg;
  }

  function weekTrend() {
    const list = load();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const end = d.getTime() + 86400000;
      const dayAttempts = list.filter(a => a.date >= d.getTime() && a.date < end);
      const avg = dayAttempts.length
        ? Math.round(dayAttempts.reduce((s, a) => s + a.pct, 0) / dayAttempts.length)
        : 0;
      days.push({
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        count: dayAttempts.length,
        avg
      });
    }
    return days;
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

  function modeLabel(mode) {
    const m = { pyqmock: "Full Paper", chapter: "Chapter Test", custom: "Custom Test", dpp: "DPP" };
    return m[mode] || (typeof QuantrexStrip !== "undefined" ? QuantrexStrip.displayText(mode) : mode);
  }

  function ringSvg(pct) {
    const r = 54;
    const c = 2 * Math.PI * r;
    const off = c - (pct / 100) * c;
    const color = pct >= 75 ? "#10b981" : pct >= 50 ? "#0d9488" : "#f59e0b";
    return `<svg class="qx-an-ring" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="10"/>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="10"
        stroke-dasharray="${c}" stroke-dashoffset="${off}" stroke-linecap="round" transform="rotate(-90 60 60)"/>
      <text x="60" y="56" text-anchor="middle" fill="#fff" font-size="22" font-weight="800" font-family="Kanit,sans-serif">${pct}%</text>
      <text x="60" y="74" text-anchor="middle" fill="rgba(255,255,255,.7)" font-size="10" font-weight="600">AVG SCORE</text>
    </svg>`;
  }

  function viewAnalytics() {
    const list = load();
    const sum = summary();
    const subj = subjectAggregate();
    const diff = difficultyAggregate();
    const trend = weekTrend();
    const solved = STATE.solved;
    const practiceAcc = solved.length ? Math.round(solved.filter(s => s.correct).length / solved.length * 100) : 0;
    const examName = EXAMS[STATE.exam].name;
    const examLogo = typeof QuantrexExamLogos !== "undefined"
      ? QuantrexExamLogos.html(STATE.exam, 48, "qx-an-exam-logo")
      : "";

    const trendBars = trend.map(d => {
      const h = Math.max(8, d.avg || (d.count ? 20 : 4));
      return `<div class="qx-an-trend-col" title="${d.label}: ${d.count} test(s), ${d.avg}% avg">
        <div class="qx-an-trend-bar" style="height:${h}%"></div>
        <small>${d.label}</small>
      </div>`;
    }).join("");

    const subjCards = Object.entries(subj).sort((a, b) => b[1].total - a[1].total).map(([name, v]) => {
      const acc = v.total ? Math.round(v.correct / v.total * 100) : 0;
      const col = acc >= 70 ? "#10b981" : acc >= 45 ? "#0d9488" : "#f59e0b";
      return `<div class="qx-an-subj-card">
        <div class="qx-an-subj-top"><span>${name}</span><strong style="color:${col}">${acc}%</strong></div>
        <div class="qx-an-subj-track"><div class="qx-an-subj-fill" style="width:${acc}%;background:${col}"></div></div>
        <small>${v.correct} correct · ${v.wrong} wrong · ${v.total} total</small>
      </div>`;
    }).join("");

    const diffPills = Object.entries(diff).map(([name, v]) => {
      const acc = v.total ? Math.round(v.correct / v.total * 100) : 0;
      return `<div class="qx-an-diff-pill"><span>${name}</span><strong>${acc}%</strong><small>${v.total} Qs</small></div>`;
    }).join("");

    const history = list.length ? list.slice(0, 15).map(a => {
      const logo = typeof QuantrexExamLogos !== "undefined" ? QuantrexExamLogos.html(a.exam || STATE.exam, 32, "qx-an-hist-logo") : "";
      const title = typeof QuantrexStrip !== "undefined" ? QuantrexStrip.displayText(a.title) : a.title;
      return `<div class="qx-an-hist-row">
        ${logo}
        <div class="qx-an-hist-body">
          <strong>${title}</strong>
          <small>${formatDate(a.date)} · ${modeLabel(a.mode)}</small>
        </div>
        <div class="qx-an-hist-score">
          <span class="qx-an-pct ${a.pct >= 60 ? "ok" : "low"}">${a.pct}%</span>
          <small>${a.correct}/${a.total} · ${formatTime(a.timeUsed)}</small>
        </div>
      </div>`;
    }).join("") : '<div class="qx-an-empty">No tests yet — start a mock or chapter test to unlock insights.</div>';

    return `${typeof topbar === "function" ? topbar("Performance Intelligence", "Your Quantrex learning analytics — private & on-device") : ""}
    <div class="qx-analytics-page">
      <div class="qx-an-hero">
        <div class="qx-an-hero-left">
          ${examLogo}
          <div>
            <p class="qx-an-eyebrow">Active track</p>
            <h2>${examName}</h2>
            <p class="qx-an-sub">${sum.attempts} assessments · ${formatTime(sum.totalTime)} total time</p>
          </div>
        </div>
        <div class="qx-an-hero-ring">${ringSvg(sum.avgPct || practiceAcc)}</div>
      </div>

      <div class="qx-an-kpis">
        <div class="qx-an-kpi"><span class="qx-an-kpi-val">${sum.attempts}</span><span class="qx-an-kpi-lbl">Tests</span></div>
        <div class="qx-an-kpi"><span class="qx-an-kpi-val">${sum.bestPct}%</span><span class="qx-an-kpi-lbl">Peak Score</span></div>
        <div class="qx-an-kpi"><span class="qx-an-kpi-val">${sum.totalCorrect}</span><span class="qx-an-kpi-lbl">Correct</span></div>
        <div class="qx-an-kpi"><span class="qx-an-kpi-val">${practiceAcc}%</span><span class="qx-an-kpi-lbl">Practice Acc.</span></div>
        <div class="qx-an-kpi"><span class="qx-an-kpi-val">${solved.length}</span><span class="qx-an-kpi-lbl">Solved Qs</span></div>
      </div>

      <div class="qx-an-grid">
        <section class="qx-an-panel">
          <h3>7-Day Momentum</h3>
          <div class="qx-an-trend">${trendBars}</div>
        </section>
        <section class="qx-an-panel">
          <h3>Difficulty Split</h3>
          <div class="qx-an-diff-row">${diffPills || '<p class="qx-an-muted">Take more tests to see difficulty trends.</p>'}</div>
        </section>
      </div>

      ${subjCards ? `<section class="qx-an-panel qx-an-subj-panel"><h3>Subject Mastery</h3><div class="qx-an-subj-grid">${subjCards}</div></section>` : ""}

      <section class="qx-an-panel">
        <h3>Recent Assessments</h3>
        <div class="qx-an-history">${history}</div>
      </section>

      <div class="qx-an-actions">
        <button class="btn-primary" onclick="go('tests')">▶ Start New Test</button>
        <button class="btn-soft" onclick="go('cpyqb')">Practice PYQs</button>
        <button class="btn-soft danger" onclick="QuantrexAnalytics.clear()">Clear History</button>
      </div>
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