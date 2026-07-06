// MARKS-style Custom Test creation panel (multi-step wizard)

const CT_DAILY_LIMIT = 25;
const CT_STORE = "quantrex_custom_tests_v1";
const CT_DAILY = "quantrex_ct_daily_v1";
const CT_CDN = "https://cdn-assets.getmarks.app/app_assets/img/cpyqb";
const CT_Q_PRESETS = [5, 10, 15, 20, 25, 30, 45, 60, 90];
const CT_TIME_PRESETS = [
  { sec: 60, label: "1 min" },
  { sec: 90, label: "1.5 min" },
  { sec: 120, label: "2 min" },
  { sec: 180, label: "3 min" }
];
const CT_SOURCE_OPTS = [
  { id: "all", label: "All Sources" },
  { id: "pyq", label: "PYQ Only" },
  { id: "books", label: "Books Only" }
];

let _ctPayload = { step: "landing" };
let _ctExamsCache = null;
let _ctDraft = null;

function ctTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function ctDailyCount() {
  const raw = JSON.parse(localStorage.getItem(CT_DAILY) || "{}");
  return raw[ctTodayKey()] || 0;
}

function ctBumpDaily() {
  const raw = JSON.parse(localStorage.getItem(CT_DAILY) || "{}");
  raw[ctTodayKey()] = (raw[ctTodayKey()] || 0) + 1;
  localStorage.setItem(CT_DAILY, JSON.stringify(raw));
}

function ctLoadTests() {
  try {
    return JSON.parse(localStorage.getItem(CT_STORE) || "[]");
  } catch (e) {
    return [];
  }
}

function ctSaveTests(list) {
  localStorage.setItem(CT_STORE, JSON.stringify(list));
}

async function fetchCtExams() {
  if (_ctExamsCache) return _ctExamsCache;
  try {
    const res = await fetch("data/nav/custom_test_exams.json");
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    _ctExamsCache = (data.data && data.data.exams) || [];
  } catch (e) {
    _ctExamsCache = [];
  }
  return _ctExamsCache;
}

function ctExamForState() {
  const want = STATE.exam === "Medical" ? "NEET" : "JEE Main";
  return (_ctExamsCache || []).find(e => (e.title || "") === want)
    || (_ctExamsCache || []).find(e => (e.title || "").includes(want.split(" ")[0]))
    || (_ctExamsCache || [])[0];
}

function ctNewDraft(exam) {
  const subjects = {};
  (exam.subjects || []).forEach(s => {
    subjects[s._id] = { meta: s, chapterIds: new Set() };
  });
  return {
    examId: exam._id,
    examTitle: exam.title,
    examIcon: exam.icon || "",
    activeSubjectId: (exam.subjects || [])[0]?._id || null,
    subjects,
    collapsedUnits: new Set(),
    search: "",
    outOfSyllabus: false,
    totalQs: 20,
    difficulty: "all",
    qType: "all",
    mode: "timed",
    timePerQ: 90,
    source: "all"
  };
}

function ctNormTitle(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function ctSelectedChapters(draft) {
  const list = [];
  Object.entries(draft.subjects).forEach(([sid, sub]) => {
    (sub.meta.units || []).forEach(unit => {
      (unit.chapters || []).forEach(ch => {
        if (sub.chapterIds.has(ch._id)) {
          list.push({
            id: ch._id,
            title: ch.title,
            shortName: ch.shortName || ch.title,
            subjectId: sid,
            subjectTitle: sub.meta.title,
            unitTitle: unit.title,
            importance: ch.importance || 0
          });
        }
      });
    });
  });
  return list;
}

function ctSubjectStyle(title) {
  const m = {
    Physics: { bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8", ring: "#93c5fd" },
    Chemistry: { bg: "#f0fdf4", border: "#22c55e", color: "#15803d", ring: "#86efac" },
    Mathematics: { bg: "#fef3c7", border: "#f59e0b", color: "#b45309", ring: "#fcd34d" },
    Biology: { bg: "#fdf2f8", border: "#ec4899", color: "#be185d", ring: "#f9a8d4" },
    Botany: { bg: "#ecfdf5", border: "#10b981", color: "#047857", ring: "#6ee7b7" },
    Zoology: { bg: "#fff7ed", border: "#f97316", color: "#c2410c", ring: "#fdba74" }
  };
  return m[title] || { bg: "#f8fafc", border: "#94a3b8", color: "#475569", ring: "#cbd5e1" };
}

function ctChapterIcon(ch) {
  if (!ch || !ch.icon) return `<span class="ct-ch-icon-fallback">${(ch.shortName || ch.title || "?").slice(0, 1)}</span>`;
  const src = ch.icon.startsWith("http") ? ch.icon : `${CT_CDN}/chapters/${ch.icon}`;
  return `<img class="ct-ch-icon" src="${src}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ct-ch-icon-fallback',textContent:'${(ch.shortName || ch.title || "?").slice(0, 1).replace(/'/g, "")}'}))">`;
}

function ctSubjectIcon(sub) {
  const src = sub.iconWithIllustration || sub.iconIllustration || sub.icon;
  if (src && String(src).startsWith("http")) {
    return `<img class="ct-subj-icon" src="${src}" alt="${sub.title}">`;
  }
  return `<span class="ct-subj-emoji">${typeof subjectIcon === "function" ? subjectIcon(sub.title) : "📖"}</span>`;
}

function ctImpBar(pct) {
  const n = Math.min(100, Math.max(0, Number(pct) || 0));
  return `<div class="ct-imp-bar" title="${n}% importance"><span style="width:${n}%"></span><em>${n}%</em></div>`;
}

function ctSyllabusBadge(cat) {
  const m = {
    reduced: { label: "Reduced", cls: "ct-syl-reduced" },
    noChange: { label: "In Syllabus", cls: "ct-syl-ok" },
    added: { label: "Added", cls: "ct-syl-added" },
    outOfSyllabus: { label: "Out of Syllabus", cls: "ct-syl-out" }
  };
  const x = m[cat] || m.noChange;
  return `<span class="ct-syl ${x.cls}">${x.label}</span>`;
}

function ctStepBar(step) {
  const steps = [
    { id: 1, label: "Select Chapters" },
    { id: 2, label: "Test Settings" }
  ];
  const cur = step === "settings" ? 2 : 1;
  return `<div class="ct-steps">${steps.map(s => `
    <div class="ct-step ${s.id === cur ? "active" : s.id < cur ? "done" : ""}">
      <span class="ct-step-num">${s.id < cur ? "✓" : s.id}</span>
      <span class="ct-step-label">${s.label}</span>
    </div>`).join('<span class="ct-step-line"></span>')}</div>`;
}

function ctOnCompleteHook(testId) {
  return (data) => {
    const list = ctLoadTests();
    const item = list.find(x => x.id === testId);
    if (item) {
      item.status = "completed";
      item.score = data.score;
      item.pct = data.pct;
      item.correct = data.correct;
      item.total = data.total;
      item.completedAt = new Date().toISOString();
    }
    ctSaveTests(list);
  };
}

function ctLandingHtml(tests, dailyCreated) {
  const exam = ctExamForState();
  const examBadge = exam ? `<div class="ct-exam-badge">${exam.icon ? `<img src="${exam.icon}" alt="">` : ""}<span>${exam.title}</span></div>` : "";
  const remaining = Math.max(0, CT_DAILY_LIMIT - dailyCreated);

  const cards = tests.length ? tests.slice(0, 20).map(t => {
    const st = t.status === "completed" ? "Completed" : "Not Started";
    const cls = t.status === "completed" ? "done" : "pending";
    const scoreLine = t.status === "completed" && t.pct != null
      ? `<span class="ct-score-pill">${t.pct}% · ${t.correct || 0}/${t.totalQs} correct</span>` : "";
    const action = t.status === "completed"
      ? `<button type="button" class="btn-soft sm" onclick="ctResumeTest('${t.id}', true)">View Result</button>`
      : `<button type="button" class="btn-primary sm" onclick="ctResumeTest('${t.id}', false)">Start Test</button>`;
    return `<div class="ct-test-row">
      <div class="ct-test-dot ${cls}"></div>
      <div class="ct-test-row-main">
        <strong>${t.title}</strong>
        <small>${t.examTitle} · ${t.chapterCount} chapters · ${t.totalQs} Qs · ${new Date(t.createdAt).toLocaleDateString()}</small>
        ${scoreLine}
      </div>
      <span class="ct-status ${cls}">${st}</span>
      ${action}
    </div>`;
  }).join("") : `<div class="empty">No custom tests yet. Tap Create Test below to begin.</div>`;

  return `${topbar("Custom Tests", "Build chapter-wise timed or practice tests")}
    ${examBadge}
    <div class="ct-hero">
      <div class="ct-hero-stat"><strong>${dailyCreated}/${CT_DAILY_LIMIT}</strong><small>Tests created today</small></div>
      <div class="ct-hero-stat"><strong>${remaining}</strong><small>Remaining today</small></div>
      <div class="ct-hero-stat"><strong>${tests.length}</strong><small>Total custom tests</small></div>
    </div>
    <div class="ct-create-banner" ${mg("custom", { step: "chapters", _draftInit: true })}>
      <div class="ct-create-left">
        <span class="ct-create-icon">+</span>
        <div><strong>Create Test</strong><small>Select chapters → configure settings → start</small></div>
      </div>
      <span class="ct-create-go">→</span>
    </div>
    <h3 class="sec-title">My Custom Tests</h3>
    <div class="ct-test-list">${cards}</div>`;
}

function ctChaptersHtml(draft) {
  const sub = draft.subjects[draft.activeSubjectId];
  if (!sub) return `<div class="empty">Select a subject</div>`;
  const selected = ctSelectedChapters(draft);
  const q = (draft.search || "").toLowerCase();
  const visibleInSubject = [];
  (sub.meta.units || []).forEach(unit => {
    (unit.chapters || []).forEach(ch => {
      if (draft.outOfSyllabus && ch.syllabusCategory === "outOfSyllabus") return;
      if (q && !(ch.title + " " + (ch.shortName || "")).toLowerCase().includes(q)) return;
      visibleInSubject.push(ch._id);
    });
  });
  const allSubjectOn = visibleInSubject.length && visibleInSubject.every(id => sub.chapterIds.has(id));

  const subjectPills = Object.values(draft.subjects).map(s => {
    const cnt = s.chapterIds.size;
    const active = s.meta._id === draft.activeSubjectId;
    const sty = ctSubjectStyle(s.meta.title);
    return `<button type="button" class="ct-subj-pill ${active ? "active" : ""}" style="--ct-subj-bg:${sty.bg};--ct-subj-bd:${sty.border};--ct-subj-fg:${sty.color};--ct-subj-ring:${sty.ring}"
      onclick="ctSetSubject('${s.meta._id}')">
      ${ctSubjectIcon(s.meta)}
      <strong>${s.meta.shortName || s.meta.title}</strong>
      ${cnt ? `<em>${cnt}</em>` : ""}
    </button>`;
  }).join("");

  const units = (sub.meta.units || []).map(unit => {
    const chapters = (unit.chapters || []).filter(ch => {
      if (draft.outOfSyllabus && ch.syllabusCategory === "outOfSyllabus") return false;
      if (!q) return true;
      return (ch.title + " " + (ch.shortName || "")).toLowerCase().includes(q);
    });
    if (!chapters.length) return "";
    const unitSel = chapters.filter(ch => sub.chapterIds.has(ch._id)).length;
    const collapsed = draft.collapsedUnits && draft.collapsedUnits.has(unit._id);
    return `<div class="ct-unit ${collapsed ? "collapsed" : ""}">
      <div class="ct-unit-head" onclick="ctToggleUnitCollapse('${unit._id}')">
        <div class="ct-unit-title">
          <span class="ct-unit-chev">${collapsed ? "▸" : "▾"}</span>
          <strong>${unit.title}</strong>
          <small>${unitSel}/${chapters.length} selected</small>
        </div>
        <button type="button" class="btn-soft sm" onclick="event.stopPropagation();ctToggleUnit('${sub.meta._id}','${unit._id}')">${unitSel === chapters.length ? "Clear unit" : "Select unit"}</button>
      </div>
      <div class="ct-ch-grid">${chapters.map(ch => {
        const on = sub.chapterIds.has(ch._id);
        return `<label class="ct-ch-card ${on ? "on" : ""}">
          <input type="checkbox" class="ct-ch-check" ${on ? "checked" : ""} onchange="ctToggleChapter('${sub.meta._id}','${ch._id}', this.checked)">
          <div class="ct-ch-icon-wrap">${ctChapterIcon(ch)}</div>
          <div class="ct-ch-body">
            <strong>${ch.shortName || ch.title}</strong>
            <small>${ch.title}</small>
            <div class="ct-ch-meta">
              ${ctImpBar(ch.importance)}
              ${ctSyllabusBadge(ch.syllabusCategory)}
            </div>
          </div>
        </label>`;
      }).join("")}</div>
    </div>`;
  }).join("");

  const selChips = selected.slice(0, 8).map(c =>
    `<span class="ct-sel-chip">${c.subjectTitle}: ${c.shortName || c.title}</span>`
  ).join("") + (selected.length > 8 ? `<span class="ct-sel-chip more">+${selected.length - 8} more</span>` : "");

  return `${topbar("Create Test", draft.examTitle)}
    <div class="breadcrumb"><a href="#" onclick="ctResetWizard();go('custom',{step:'landing'});return false;">Custom Tests</a><span>›</span><span class="bc-cur">Select Chapters</span></div>
    ${ctStepBar("chapters")}
    <div class="ct-chapters-layout">
      <div class="ct-chapters-main">
        <div class="ct-toolbar">
          <input type="search" class="ct-search" placeholder="Search chapters…" value="${draft.search || ""}" oninput="ctSetSearch(this.value)">
          <label class="ct-toggle"><input type="checkbox" ${draft.outOfSyllabus ? "" : "checked"} onchange="ctSetSyllabusFilter(this.checked)"> Hide out-of-syllabus</label>
          <button type="button" class="btn-soft sm" onclick="ctToggleSubjectAll('${sub.meta._id}')">${allSubjectOn ? "Clear subject" : "Select subject"}</button>
        </div>
        <div class="ct-subj-pills">${subjectPills}</div>
        <p class="result-count">${selected.length} chapter${selected.length !== 1 ? "s" : ""} selected across all subjects</p>
        <div class="ct-units">${units || '<div class="empty">No chapters match your search.</div>'}</div>
      </div>
      ${selected.length ? `<aside class="ct-sel-panel"><h4>Selected (${selected.length})</h4><div class="ct-sel-chips">${selChips}</div></aside>` : ""}
    </div>
    <div class="ct-sticky-foot">
      <span><strong>${selected.length}</strong> chapters · ${sub.meta.title}</span>
      <button type="button" class="btn-primary" ${selected.length ? "" : "disabled"} onclick="ctGoSettings()">Continue →</button>
    </div>`;
}

function ctSettingsHtml(draft) {
  const selected = ctSelectedChapters(draft);
  const subjCount = new Set(selected.map(c => c.subjectTitle)).size;
  const diffChips = ["all", "Easy", "Medium", "Hard"].map(d => `
    <button type="button" class="ct-chip ${draft.difficulty === d ? "on" : ""}" onclick="ctSetDiff('${d}')">${d === "all" ? "All Levels" : d}</button>`).join("");
  const qChips = CT_Q_PRESETS.map(n => `
    <button type="button" class="ct-chip ${draft.totalQs === n ? "on" : ""}" onclick="ctSetTotalQs(${n})">${n}</button>`).join("");
  const typeChips = [
    { id: "all", label: "All Types" },
    { id: "single", label: "Single Correct" },
    { id: "numerical", label: "Numerical" }
  ].map(t => `<button type="button" class="ct-chip ${draft.qType === t.id ? "on" : ""}" onclick="ctSetQType('${t.id}')">${t.label}</button>`).join("");
  const srcChips = CT_SOURCE_OPTS.map(t =>
    `<button type="button" class="ct-chip ${draft.source === t.id ? "on" : ""}" onclick="ctSetSource('${t.id}')">${t.label}</button>`
  ).join("");
  const modeChips = `
    <button type="button" class="ct-mode-card ${draft.mode === "timed" ? "on" : ""}" onclick="ctSetMode('timed')">
      <span class="ct-mode-ic">⏱️</span>
      <div><strong>Timed Test</strong><small>Exam-like timer per question</small></div>
    </button>
    <button type="button" class="ct-mode-card ${draft.mode === "practice" ? "on" : ""}" onclick="ctSetMode('practice')">
      <span class="ct-mode-ic">📖</span>
      <div><strong>Practice Mode</strong><small>No timer — learn at your pace</small></div>
    </button>`;
  const timeChips = draft.mode === "timed" ? CT_TIME_PRESETS.map(t => `
    <button type="button" class="ct-chip ${draft.timePerQ === t.sec ? "on" : ""}" onclick="ctSetTimePerQ(${t.sec})">${t.label}</button>`).join("") : "";

  const durationMin = draft.mode === "timed" ? Math.ceil((draft.totalQs * draft.timePerQ) / 60) : null;
  const summary = selected.map(c => `<span class="ct-sum-chip">${c.subjectTitle}: ${c.shortName || c.title}</span>`).join("");

  return `${topbar("Test Settings", `${selected.length} chapters · ${subjCount} subject${subjCount !== 1 ? "s" : ""}`)}
    <div class="breadcrumb"><a href="#" onclick="go('custom',{step:'chapters'});return false;">Select Chapters</a><span>›</span><span class="bc-cur">Test Settings</span></div>
    ${ctStepBar("settings")}
    <div class="ct-settings-layout">
      <div class="ct-settings-main">
        <section class="ct-panel">
          <h4>Number of Questions</h4>
          <div class="ct-chips">${qChips}</div>
          <div class="ct-range-wrap">
            <input type="range" min="5" max="90" step="5" value="${draft.totalQs}" oninput="ctSetTotalQs(parseInt(this.value,10))">
            <span>${draft.totalQs} questions</span>
          </div>
        </section>
        <section class="ct-panel">
          <h4>Difficulty Level</h4>
          <div class="ct-chips">${diffChips}</div>
        </section>
        <section class="ct-panel">
          <h4>Question Type</h4>
          <div class="ct-chips">${typeChips}</div>
        </section>
        <section class="ct-panel">
          <h4>Question Source</h4>
          <div class="ct-chips">${srcChips}</div>
        </section>
        <section class="ct-panel">
          <h4>Test Mode</h4>
          <div class="ct-mode-grid">${modeChips}</div>
        </section>
        ${draft.mode === "timed" ? `<section class="ct-panel"><h4>Time per Question</h4><div class="ct-chips">${timeChips}</div><p class="ct-est-time">Estimated duration: <strong>~${durationMin} min</strong></p></section>` : ""}
      </div>
      <aside class="ct-settings-side">
        <section class="ct-panel ct-summary">
          <h4>Test Summary</h4>
          <div class="ct-sum-stats">
            <div><strong>${draft.totalQs}</strong><small>Questions</small></div>
            <div><strong>${selected.length}</strong><small>Chapters</small></div>
            <div><strong>${subjCount}</strong><small>Subjects</small></div>
            ${durationMin ? `<div><strong>${durationMin}m</strong><small>Duration</small></div>` : `<div><strong>∞</strong><small>Duration</small></div>`}
          </div>
          <h4>Selected Chapters</h4>
          <div class="ct-sum-chips">${summary}</div>
        </section>
      </aside>
    </div>
    <div class="ct-sticky-foot">
      <button type="button" class="btn-soft" onclick="go('custom', { step: 'chapters' })">← Back</button>
      <button type="button" class="btn-primary" onclick="ctGenerateTest()">Create Test</button>
    </div>`;
}

function ctGeneratingHtml() {
  return `${topbar("Create Test", "")}
    <div class="ct-generating">
      <div class="ct-spinner"></div>
      <strong>Generating your custom test. Please wait…</strong>
      <small>Picking questions from selected chapters</small>
    </div>`;
}

async function viewCustomTests(payload) {
  const p = { ..._ctPayload, ...(payload || {}) };
  _ctPayload = p;
  await fetchCtExams();

  if (p.step === "landing" || !p.step) {
    const tests = ctLoadTests();
    return ctLandingHtml(tests, ctDailyCount());
  }

  if (!_ctDraft) {
    const exam = ctExamForState();
    if (!exam) return `${topbar("Custom Tests", "")}<div class="empty">Exam data loading…</div>`;
    _ctDraft = ctNewDraft(exam);
  }

  if (p.step === "chapters") {
    if (p._draftInit || !_ctDraft) _ctDraft = ctNewDraft(ctExamForState());
    if (_ctDraft && !(_ctDraft.collapsedUnits instanceof Set)) _ctDraft.collapsedUnits = new Set();
    return ctChaptersHtml(_ctDraft);
  }
  if (p.step === "settings") return ctSettingsHtml(_ctDraft);
  if (p.step === "generating") return ctGeneratingHtml();
  return viewCustomTests({ step: "landing" });
}

function ctSetSubject(id) {
  if (!_ctDraft) return;
  _ctDraft.activeSubjectId = id;
  render("custom", { step: "chapters" });
}

function ctSetSearch(v) {
  if (!_ctDraft) return;
  _ctDraft.search = v;
  render("custom", { step: "chapters" });
}

function ctSetSyllabusFilter(hideOut) {
  if (!_ctDraft) return;
  _ctDraft.outOfSyllabus = !hideOut;
  render("custom", { step: "chapters" });
}

function ctToggleUnitCollapse(unitId) {
  if (!_ctDraft) return;
  if (!_ctDraft.collapsedUnits) _ctDraft.collapsedUnits = new Set();
  if (_ctDraft.collapsedUnits.has(unitId)) _ctDraft.collapsedUnits.delete(unitId);
  else _ctDraft.collapsedUnits.add(unitId);
  render("custom", { step: "chapters" });
}

function ctToggleChapter(subjectId, chapterId, checked) {
  if (!_ctDraft || !_ctDraft.subjects[subjectId]) return;
  const set = _ctDraft.subjects[subjectId].chapterIds;
  if (checked) set.add(chapterId); else set.delete(chapterId);
  render("custom", { step: "chapters" });
}

function ctToggleUnit(subjectId, unitId) {
  if (!_ctDraft || !_ctDraft.subjects[subjectId]) return;
  const sub = _ctDraft.subjects[subjectId];
  const unit = (sub.meta.units || []).find(u => u._id === unitId);
  if (!unit) return;
  const visible = (unit.chapters || []).filter(ch => {
    if (_ctDraft.outOfSyllabus && ch.syllabusCategory === "outOfSyllabus") return false;
    const q = (_ctDraft.search || "").toLowerCase();
    if (q && !(ch.title + " " + (ch.shortName || "")).toLowerCase().includes(q)) return false;
    return true;
  });
  const allOn = visible.every(ch => sub.chapterIds.has(ch._id));
  visible.forEach(ch => { if (allOn) sub.chapterIds.delete(ch._id); else sub.chapterIds.add(ch._id); });
  render("custom", { step: "chapters" });
}

function ctToggleSubjectAll(subjectId) {
  if (!_ctDraft || !_ctDraft.subjects[subjectId]) return;
  const sub = _ctDraft.subjects[subjectId];
  const visible = [];
  (sub.meta.units || []).forEach(unit => {
    (unit.chapters || []).forEach(ch => {
      if (_ctDraft.outOfSyllabus && ch.syllabusCategory === "outOfSyllabus") return;
      const q = (_ctDraft.search || "").toLowerCase();
      if (q && !(ch.title + " " + (ch.shortName || "")).toLowerCase().includes(q)) return;
      visible.push(ch._id);
    });
  });
  const allOn = visible.length && visible.every(id => sub.chapterIds.has(id));
  visible.forEach(id => { if (allOn) sub.chapterIds.delete(id); else sub.chapterIds.add(id); });
  render("custom", { step: "chapters" });
}

function ctGoSettings() {
  if (!ctSelectedChapters(_ctDraft).length) {
    showToast("⚠️ Select at least one chapter");
    return;
  }
  render("custom", { step: "settings" });
}

function ctSetTotalQs(n) { if (_ctDraft) { _ctDraft.totalQs = n; render("custom", { step: "settings" }); } }
function ctSetDiff(d) { if (_ctDraft) { _ctDraft.difficulty = d; render("custom", { step: "settings" }); } }
function ctSetQType(t) { if (_ctDraft) { _ctDraft.qType = t; render("custom", { step: "settings" }); } }
function ctSetSource(s) { if (_ctDraft) { _ctDraft.source = s; render("custom", { step: "settings" }); } }
function ctSetMode(m) { if (_ctDraft) { _ctDraft.mode = m; render("custom", { step: "settings" }); } }
function ctSetTimePerQ(s) { if (_ctDraft) { _ctDraft.timePerQ = s; render("custom", { step: "settings" }); } }

function ctAutoTitle(draft, chapters) {
  const subjShort = { Physics: "P", Chemistry: "C", Mathematics: "M", Biology: "B", Botany: "Bo", Zoology: "Z" };
  const first = chapters[0];
  const prefix = subjShort[first?.subjectTitle] || "T";
  const n = chapters.length;
  const chName = n === 1 ? (first.shortName || first.title.split(" ")[0]) : `${n} Chapters`;
  const num = ctLoadTests().length + 1;
  return `${prefix} - ${chName} Test ${num}`;
}

function ctMatchQuestion(q, chapters, draft) {
  const titles = new Set(chapters.map(c => ctNormTitle(c.title)));
  const shorts = new Set(chapters.map(c => ctNormTitle(c.shortName || c.title)));
  const ch = ctNormTitle(q.chapter);
  const hit = titles.has(ch) || [...titles].some(t => ch.includes(t) || t.includes(ch))
    || [...shorts].some(s => s.length > 4 && (ch.includes(s) || s.includes(ch)));
  if (!hit) return false;
  if (draft.difficulty !== "all" && q.difficulty !== draft.difficulty) return false;
  if (draft.source === "pyq" && q._book) return false;
  if (draft.source === "books" && !q._book) return false;
  if (draft.qType === "numerical") {
    const opts = q.options || [];
    if (opts.length !== 4) return false;
    if (!opts.every(o => /^[\d.\-+$\\s]+$/.test(String(o).replace(/<[^>]+>/g, "")))) return false;
  }
  if (draft.qType === "single" && (q.options || []).length !== 4) return false;
  return true;
}

async function ctGenerateTest() {
  if (!_ctDraft) return;
  if (ctDailyCount() >= CT_DAILY_LIMIT) {
    showToast("⚠️ Daily limit reached (25 tests). Try tomorrow.");
    return;
  }
  const chapters = ctSelectedChapters(_ctDraft);
  if (!chapters.length) return;

  render("custom", { step: "generating" });
  const bank = (typeof PRIMARY_BANK !== "undefined" && PRIMARY_BANK[STATE.exam]) || "jee_main";
  if (typeof ensureQuestionsLoaded === "function") await ensureQuestionsLoaded(bank);

  let pool = QUESTIONS.filter(q => ctMatchQuestion(q, chapters, _ctDraft));
  if (!pool.length) {
    const subs = new Set(chapters.map(c => c.subjectTitle));
    pool = QUESTIONS.filter(q => subs.has(q.subject) && chapters.some(c => {
      const a = ctNormTitle(q.chapter);
      const b = ctNormTitle(c.title);
      return a.includes(b.slice(0, 8)) || b.includes(a.slice(0, 8));
    }));
  }
  if (!pool.length) {
    showToast("⚠️ No questions found for selected chapters. Try more chapters.");
    render("custom", { step: "settings" });
    return;
  }

  await new Promise(r => setTimeout(r, 900));

  const shuffled = pool.sort(() => Math.random() - 0.5);
  const take = Math.min(_ctDraft.totalQs, shuffled.length);
  const qs = shuffled.slice(0, take);
  const ids = qs.map(q => q.id);
  const title = ctAutoTitle(_ctDraft, chapters);
  const testId = "ct_" + Date.now();
  const timed = _ctDraft.mode === "timed";
  const durationSec = timed ? take * _ctDraft.timePerQ : null;

  const record = {
    id: testId,
    title,
    examTitle: _ctDraft.examTitle,
    chapterCount: chapters.length,
    totalQs: take,
    status: "notStarted",
    createdAt: new Date().toISOString(),
    questionIds: ids,
    timed,
    durationSec,
    modeLabel: timed ? `Custom · ${Math.ceil(durationSec / 60)} min` : "Practice Mode"
  };

  const list = ctLoadTests();
  list.unshift(record);
  ctSaveTests(list);
  ctBumpDaily();
  _ctDraft = null;
  _ctPayload = { step: "landing" };

  startTest(ids, title, "custom", {
    testType: "custom",
    timed,
    durationSec,
    modeLabel: record.modeLabel,
    testId,
    onComplete: ctOnCompleteHook(testId)
  });
}

function ctResumeTest(id, viewResult) {
  const t = ctLoadTests().find(x => x.id === id);
  if (!t) return;
  if (viewResult) {
    if (t.pct != null) {
      showToast(`📊 ${t.title}: ${t.pct}% (${t.correct || 0}/${t.totalQs} correct)`);
    }
    go("analytics");
    return;
  }
  startTest(t.questionIds, t.title, "custom", {
    testType: "custom",
    timed: t.timed,
    durationSec: t.durationSec,
    modeLabel: t.modeLabel,
    testId: t.id,
    onComplete: ctOnCompleteHook(t.id)
  });
}

function ctResetWizard() {
  _ctDraft = null;
  _ctPayload = { step: "landing" };
}