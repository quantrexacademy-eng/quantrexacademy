// MARKS-style Custom Test — /ct flow (landing → wizard → preview → test)

const CT_DAILY_LIMIT = 25;
const CT_STORE = "quantrex_custom_tests_v1";
const CT_DAILY = "quantrex_ct_daily_v1";

const CT_DEFAULT_QS = 25;
const CT_DEFAULT_MINS = 60;
const CT_Q_PRESETS = [5, 10, 15, 20, 25, 30, 45, 60];
const CT_TIME_PRESETS = [
  { sec: 60, label: "1 min" },
  { sec: 90, label: "1.5 min" },
  { sec: 120, label: "2 min" },
  { sec: 180, label: "3 min" }
];

let _ctPayload = { step: "landing" };
let _ctExamsCache = null;
let _ctDraft = null;
let _ctFilter = "all";
let _ctYearShiftsCache = null;

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
  try { return JSON.parse(localStorage.getItem(CT_STORE) || "[]"); }
  catch (e) { return []; }
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

function ctExamsForWizard() {
  const all = _ctExamsCache || [];
  if (STATE.exam === "Medical") {
    return all.filter(e => /neet/i.test(e.title || ""));
  }
  const order = ["JEE Main", "NEET", "MHT CET"];
  const picked = order.map(t => all.find(e => (e.title || "") === t)).filter(Boolean);
  return picked.length ? picked : all.slice(0, 3);
}

function ctDefaultExam() {
  const list = ctExamsForWizard();
  const want = STATE.exam === "Medical" ? "NEET" : "JEE Main";
  return list.find(e => (e.title || "") === want) || list[0];
}

function ctNewDraft(exam) {
  const subj = (exam.subjects || [])[0];
  return {
    wizardStep: "pick",
    examId: exam._id,
    examTitle: exam.title,
    examIcon: exam.icon || "",
    subjectId: subj ? subj._id : null,
    subjectMeta: subj || null,
    chapterIds: new Set(),
    hideOutOfSyllabus: true,
    unitsSubjectId: subj ? subj._id : null,
    expandedUnits: new Set(),
    yearPreset: "all",
    customSources: new Set(),
    totalQs: CT_DEFAULT_QS,
    timePerQ: 120,
    durationSec: CT_DEFAULT_QS * 120
  };
}

function ctSyncDuration(draft) {
  if (!draft) return;
  draft.durationSec = Math.max(60, (draft.totalQs || CT_DEFAULT_QS) * (draft.timePerQ || 120));
}

function ctExamSubjects(draft) {
  const exam = (_ctExamsCache || []).find(e => e._id === draft.examId);
  return (exam && exam.subjects) || (draft.subjectMeta ? [draft.subjectMeta] : []);
}

function ctBanksForYears() {
  if (STATE.exam === "Medical") return ["neet", "nta_abhyas_neet", "aiims"].filter(s => typeof BANK_INDEX !== "undefined" && BANK_INDEX[s]);
  return ["jee_main", "nta_abhyas_jee_main", "jee_advanced"].filter(s => typeof BANK_INDEX !== "undefined" && BANK_INDEX[s]);
}

function ctNormTitle(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function ctFromTests() {
  return !!(_ctPayload && _ctPayload.fromTests);
}

function ctSubjectStyle(title) {
  const m = {
    Physics: { bg: "rgba(249,115,22,.15)", border: "#f97316", color: "#fb923c", short: "Phy" },
    Chemistry: { bg: "rgba(34,197,94,.15)", border: "#22c55e", color: "#4ade80", short: "Chem" },
    Mathematics: { bg: "rgba(59,130,246,.15)", border: "#3b82f6", color: "#60a5fa", short: "Math" },
    Biology: { bg: "rgba(236,72,153,.15)", border: "#ec4899", color: "#f472b6", short: "Bio" },
    Botany: { bg: "rgba(16,185,129,.15)", border: "#10b981", color: "#34d399", short: "Bot" },
    Zoology: { bg: "rgba(249,115,22,.15)", border: "#f97316", color: "#fb923c", short: "Zoo" }
  };
  return m[title] || { bg: "rgba(148,163,184,.15)", border: "#94a3b8", color: "#cbd5e1", short: (title || "Sub").slice(0, 4) };
}

function ctSubjectIcon(sub) {
  return `<span class="ct-wiz-subj-emoji">${typeof subjectIcon === "function" ? subjectIcon(sub.title) : "📖"}</span>`;
}

function ctExamIcon(ex) {
  const t = String(ex.title || "").toLowerCase();
  const ic = /neet/i.test(t) ? "🩺" : /mht/i.test(t) ? "🎓" : /jee/i.test(t) ? "📝" : "📋";
  return `<span class="ct-wiz-card-fb">${ic}</span>`;
}

function ctChapterIcon(ch) {
  if (!ch) return "";
  return `<span class="ct-wiz-ch-fb">${(ch.shortName || ch.title || "?").slice(0, 1)}</span>`;
}

function ctSourceLabel(source) {
  const year = typeof qYearFromSource === "function" ? qYearFromSource(source) : null;
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  let month = "";
  for (const m of months) {
    if (new RegExp(m, "i").test(source || "")) { month = m; break; }
  }
  if (!month) {
    const abbr = (source || "").match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i);
    if (abbr) month = abbr[1];
  }
  return year ? `${year} ${month}`.trim() : String(source || "").slice(0, 24);
}

async function ctBuildYearShifts(force) {
  if (_ctYearShiftsCache && !force) return _ctYearShiftsCache;
  const cacheKey = "qx_year_shifts_" + (STATE.exam || "Engineering");
  if (!force && typeof QxPerf !== "undefined") {
    const cached = QxPerf.cacheGet(cacheKey, 1800000);
    if (cached) { _ctYearShiftsCache = cached; return _ctYearShiftsCache; }
  }
  const map = new Map();
  for (const slug of ctBanksForYears()) {
    if (typeof loadSingleBank === "function" && !_banksLoaded[slug]) {
      try { await loadSingleBank(slug); } catch (e) { /* skip */ }
    }
    QUESTIONS.filter(q => q._bank === slug && q.source).forEach(q => {
      if (!map.has(q.source)) {
        map.set(q.source, {
          source: q.source,
          label: ctSourceLabel(q.source),
          year: typeof qYearFromSource === "function" ? (qYearFromSource(q.source) || 0) : 0
        });
      }
    });
  }
  _ctYearShiftsCache = [...map.values()].sort((a, b) => b.year - a.year || b.source.localeCompare(a.source));
  if (typeof QxPerf !== "undefined") QxPerf.cacheSet(cacheKey, _ctYearShiftsCache);
  return _ctYearShiftsCache;
}

function ctYearPresetRange(preset) {
  const maxY = new Date().getFullYear();
  if (preset === "last3") return maxY - 2;
  if (preset === "last5") return maxY - 4;
  if (preset === "last10") return maxY - 9;
  return 0;
}

function ctYearFilterOk(source, draft) {
  const year = typeof qYearFromSource === "function" ? qYearFromSource(source) : null;
  if (draft.yearPreset === "custom") {
    return draft.customSources.size ? draft.customSources.has(source) : true;
  }
  if (draft.yearPreset === "all") return true;
  const min = ctYearPresetRange(draft.yearPreset);
  return year != null && year >= min;
}

function ctSelectedChapters(draft) {
  if (!draft) return [];
  const list = [];
  ctExamSubjects(draft).forEach(sub => {
  (sub.units || []).forEach(unit => {
    (unit.chapters || []).forEach(ch => {
      if (draft.chapterIds.has(ch._id)) {
        list.push({
          id: ch._id,
          title: ch.title,
          shortName: ch.shortName || ch.title,
          unitTitle: unit.title,
          subjectTitle: sub.title,
          syllabusCategory: ch.syllabusCategory
        });
      }
    });
  });
  });
  return list;
}

function ctSubjectCount(sub) {
  let units = (sub.units || []).length;
  let chapters = 0;
  (sub.units || []).forEach(u => { chapters += (u.chapters || []).length; });
  return { units, chapters };
}

function ctPreviewBadges(draft) {
  const exam = draft.examTitle || "JEE Main";
  const sub = draft.subjectMeta ? draft.subjectMeta.title : "";
  const sty = ctSubjectStyle(sub);
  return `<span class="ct-wiz-prev-badge exam">📝 ${exam}</span>
    ${sub ? `<span class="ct-wiz-prev-badge subj" style="background:${sty.bg};color:${sty.color};border-color:${sty.border}">${sty.short || sub}</span>` : ""}`;
}

function ctWizardProgress(step) {
  const steps = ["pick", "chapters", "years"];
  const idx = steps.indexOf(step);
  const pct = idx < 0 ? 10 : Math.round(((idx + 1) / steps.length) * 100);
  return `<div class="ct-wiz-progress"><span style="width:${pct}%"></span></div>`;
}

function ctWizardPreviewBar(draft, nextLabel, nextFn, nextDisabled) {
  const mins = Math.round((draft.durationSec || CT_DEFAULT_MINS * 60) / 60);
  return `<div class="ct-wiz-preview-bar">
    <button type="button" class="ct-wiz-back-btn" onclick="ctWizardBack()">←</button>
    <div class="ct-wiz-preview-mid">
      <small>Test Preview</small>
      <div class="ct-wiz-prev-badges">${ctPreviewBadges(draft)}</div>
      ${draft.wizardStep === "years" ? `<div class="ct-wiz-prev-stats"><span><strong>${draft.totalQs}</strong> Qs</span><span><strong>${mins}</strong> Mins</span></div>` : ""}
    </div>
    <button type="button" class="ct-wiz-next-btn ${nextDisabled ? "disabled" : ""}" ${nextDisabled ? "disabled" : ""} onclick="${nextFn}">${nextLabel}</button>
  </div>`;
}

function ctPickStepHtml(draft, exams) {
  const examCards = exams.map(ex => {
    const on = draft.examId === ex._id;
    return `<button type="button" class="ct-wiz-card ${on ? "on" : ""}" onclick="ctPickExam('${ex._id}')">
      ${ctExamIcon(ex)}
      <strong>${ex.title}</strong>
    </button>`;
  }).join("");

  const exam = exams.find(e => e._id === draft.examId) || exams[0];
  const subCards = (exam && exam.subjects || []).map(s => {
    const on = draft.subjectId === s._id;
    const sty = ctSubjectStyle(s.title);
    return `<button type="button" class="ct-wiz-card subj ${on ? "on" : ""}" style="--ct-card-c:${sty.color}" onclick="ctPickSubject('${s._id}')">
      ${ctSubjectIcon(s)}
      <strong>${s.title}</strong>
    </button>`;
  }).join("");

  const canNext = draft.examId && draft.subjectId;
  return `<div class="ct-wizard-left-inner">
    <div class="ct-wiz-head">
      <h2>Create your own test</h2>
      <button type="button" class="ct-wiz-close" onclick="ctCloseWizard()">✕</button>
    </div>
    ${ctWizardProgress("pick")}
    <section class="ct-wiz-section">
      <h4>Choose your exam</h4>
      <div class="ct-wiz-exam-grid">${examCards}</div>
    </section>
    <section class="ct-wiz-section">
      <h4>Subject</h4>
      <div class="ct-wiz-subj-grid">${subCards}</div>
    </section>
    ${ctWizardPreviewBar(draft, "Next", "ctGoChapters()", !canNext)}
  </div>`;
}

function ctChaptersStepHtml(draft) {
  const subjects = ctExamSubjects(draft);
  const unitsSub = subjects.find(s => s._id === draft.unitsSubjectId) || draft.subjectMeta;
  if (!unitsSub) return `<div class="empty">Select a subject</div>`;
  const sel = ctSelectedChapters(draft).length;
  const showingUnits = !!draft.unitsSubjectId;

  const subjectRows = subjects.map(s => {
    const cnt = ctSubjectCount(s);
    const open = draft.unitsSubjectId === s._id;
    const selInSub = (s.units || []).reduce((n, u) => n + (u.chapters || []).filter(ch => draft.chapterIds.has(ch._id)).length, 0);
    return `<div class="ct-wiz-subj-block ${open ? "open" : ""}">
      <div class="ct-wiz-subj-row">
        <div class="ct-wiz-subj-row-main">
          ${ctSubjectIcon(s)}
          <div><strong>${s.title}</strong><small>${cnt.units} Units, ${cnt.chapters} Chapters${selInSub ? ` · ${selInSub} selected` : ""}</small></div>
        </div>
        <button type="button" class="ct-wiz-show-units" onclick="ctShowUnitsFor('${s._id}')">${open ? "HIDE UNITS" : "SHOW UNITS"}</button>
      </div>
    </div>`;
  }).join("");

  const units = showingUnits ? (unitsSub.units || []).map(unit => {
    const chapters = (unit.chapters || []).filter(ch => {
      if (draft.hideOutOfSyllabus && ch.syllabusCategory === "outOfSyllabus") return false;
      return true;
    });
    if (!chapters.length) return "";
    const unitSel = chapters.filter(ch => draft.chapterIds.has(ch._id)).length;
    const expanded = !draft.expandedUnits || draft.expandedUnits.has(unit._id);
    return `<div class="ct-wiz-unit ${expanded ? "expanded" : "collapsed"}">
      <div class="ct-wiz-unit-head" onclick="ctToggleUnitExpand('${unit._id}')">
        <span class="ct-wiz-unit-chev">${expanded ? "▾" : "▸"}</span>
        <strong>${unit.title}</strong>
        <small>${unitSel}/${chapters.length} selected</small>
        <button type="button" class="ct-wiz-unit-all" onclick="event.stopPropagation();ctToggleUnitAll('${unitsSub._id}','${unit._id}')">${unitSel === chapters.length ? "Clear unit" : "Select unit"}</button>
      </div>
      ${expanded ? `<div class="ct-wiz-ch-grid">${chapters.map(ch => {
        const on = draft.chapterIds.has(ch._id);
        return `<label class="ct-wiz-ch-card ${on ? "on" : ""}">
          <input type="checkbox" class="ct-wiz-ch-check" ${on ? "checked" : ""} onchange="ctToggleChapter('${ch._id}', this.checked)">
          <div class="ct-wiz-ch-card-ic">${ctChapterIcon(ch)}</div>
          <div class="ct-wiz-ch-card-body">
            <strong>${ch.shortName || ch.title}</strong>
            <small>${ch.title}</small>
          </div>
        </label>`;
      }).join("")}</div>` : ""}
    </div>`;
  }).join("") : "";

  const right = showingUnits
    ? `<div class="ct-wizard-right-inner"><div class="ct-wiz-right-head"><strong>${unitsSub.title}</strong><small>Select chapters from units</small></div>${units || '<div class="empty">No chapters in this subject.</div>'}</div>`
    : `<div class="ct-wizard-right-empty"><p>Tap <strong>SHOW UNITS</strong> on a subject to pick chapters</p></div>`;

  return `<div class="ct-wizard-split">
    <div class="ct-wizard-left-panel"><div class="ct-wizard-left-inner">
      <div class="ct-wiz-head">
        <h2>Create your own test</h2>
        <button type="button" class="ct-wiz-close" onclick="ctCloseWizard()">✕</button>
      </div>
      ${ctWizardProgress("chapters")}
      <label class="ct-wiz-syllabus-toggle">
        <span>⚠️ Don't include out of syllabus Qs</span>
        <input type="checkbox" ${draft.hideOutOfSyllabus ? "checked" : ""} onchange="ctSetSyllabus(this.checked)">
      </label>
      <div class="ct-wiz-subj-list">${subjectRows}</div>
      <p class="ct-wiz-sel-count">${sel} chapter${sel !== 1 ? "s" : ""} selected</p>
      ${ctWizardPreviewBar(draft, "Next", "ctGoYears()", !sel)}
    </div></div>
    ${right}
  </div>`;
}

function ctYearsStepHtml(draft) {
  const shifts = _ctYearShiftsCache || [];
  const minY = shifts.length ? shifts[shifts.length - 1].year : 2002;
  const maxY = shifts.length ? shifts[0].year : new Date().getFullYear();
  const mins = Math.round((draft.durationSec || CT_DEFAULT_MINS * 60) / 60);
  const qChips = CT_Q_PRESETS.map(n =>
    `<button type="button" class="ct-wiz-set-chip ${draft.totalQs === n ? "on" : ""}" onclick="ctSetTotalQs(${n})">${n}</button>`
  ).join("");
  const tChips = CT_TIME_PRESETS.map(t =>
    `<button type="button" class="ct-wiz-set-chip ${draft.timePerQ === t.sec ? "on" : ""}" onclick="ctSetTimePerQ(${t.sec})">${t.label}</button>`
  ).join("");
  const presets = [
    { id: "all", label: "All Years", sub: "The test will be created from All PYQs" },
    { id: "last3", label: "Last 3 Years", num: "3" },
    { id: "last5", label: "Last 5 Years", num: "5" },
    { id: "last10", label: "Last 10 Years", num: "10" }
  ];
  const presetCards = presets.map(p => {
    const on = draft.yearPreset === p.id;
    return `<button type="button" class="ct-wiz-year-preset ${on ? "on" : ""}" onclick="ctSetYearPreset('${p.id}')">
      <span class="ct-wiz-preset-check">${on ? "✓" : ""}</span>
      ${p.num ? `<span class="ct-wiz-preset-num">${p.num}</span>` : `<span class="ct-wiz-preset-globe">🌐</span>`}
      <strong>${p.label}</strong>
      ${p.sub ? `<small>${p.sub}</small>` : ""}
    </button>`;
  }).join("");

  const customSel = draft.yearPreset === "custom" && draft.customSources.size;
  return `<div class="ct-wizard-left-inner ct-wizard-years">
    <div class="ct-wiz-head">
      <h2>Create your own test</h2>
      <button type="button" class="ct-wiz-close" onclick="ctCloseWizard()">✕</button>
    </div>
    ${ctWizardProgress("years")}
    <section class="ct-wiz-section ct-wiz-settings">
      <h4>Number of Questions</h4>
      <div class="ct-wiz-set-chips">${qChips}</div>
      <h4 style="margin-top:14px">Time per Question</h4>
      <div class="ct-wiz-set-chips">${tChips}</div>
      <p class="ct-wiz-est-time">Estimated duration: <strong>${mins} min</strong> · ${draft.totalQs} Qs × ${draft.timePerQ >= 60 ? (draft.timePerQ / 60) + " min" : draft.timePerQ + "s"} per Q</p>
    </section>
    <section class="ct-wiz-section">
      <h4>Select Year of Paper You Want to Include</h4>
      <p class="ct-wiz-hint">The test will be created from All PYQs</p>
      <div class="ct-wiz-year-presets">${presetCards}</div>
      <button type="button" class="ct-wiz-custom-years" onclick="ctOpenYearModal()">
        <span>✏️ Select Custom Years</span>
        ${customSel ? `<em>${draft.customSources.size} selected</em>` : ""}
      </button>
    </section>
    ${ctWizardPreviewBar(draft, "Generate Test", "ctGenerateTest()", false)}
  </div>`;
}

function ctWizardHtml() {
  if (!_ctDraft) return "";
  const exams = ctExamsForWizard();
  if (_ctDraft.wizardStep === "pick") {
    return `<div class="ct-wizard-overlay"><div class="ct-wizard-shell">${ctPickStepHtml(_ctDraft, exams)}</div></div>`;
  }
  if (_ctDraft.wizardStep === "chapters") {
    return `<div class="ct-wizard-overlay"><div class="ct-wizard-shell wide">${ctChaptersStepHtml(_ctDraft)}</div></div>`;
  }
  if (_ctDraft.wizardStep === "years") {
    return `<div class="ct-wizard-overlay"><div class="ct-wizard-shell">${ctYearsStepHtml(_ctDraft)}</div></div>`;
  }
  if (_ctDraft.wizardStep === "generating") {
    return `<div class="ct-wizard-overlay"><div class="ct-wizard-shell"><div class="ct-wiz-generating">
      <div class="ct-spinner"></div>
      <strong>Generating your custom test. Please wait…</strong>
    </div></div></div>`;
  }
  return "";
}

function ctFilterTests(tests) {
  if (_ctFilter === "attempted") return tests.filter(t => t.status === "completed");
  if (_ctFilter === "notAttempted") return tests.filter(t => t.status !== "completed");
  if (_ctFilter === "resume") return tests.filter(t => t.status === "inProgress");
  return tests;
}

function ctLandingHtml(tests) {
  const filtered = ctFilterTests(tests);
  const filters = [
    { id: "all", label: "All" },
    { id: "attempted", label: "Attempted" },
    { id: "notAttempted", label: "Not Attempted" },
    { id: "resume", label: "Resume" }
  ];
  const filterPills = filters.map(f =>
    `<button type="button" class="ct-landing-filter ${ _ctFilter === f.id ? "on" : ""}" onclick="ctSetFilter('${f.id}')">${f.label}</button>`
  ).join("");

  const cards = filtered.length ? filtered.slice(0, 40).map(t => {
    const action = t.status === "completed" ? "View Analysis →" : (t.status === "inProgress" ? "Resume →" : "Attempt Now →");
    const cls = t.status === "completed" ? "done" : "";
    const date = t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
    return `<div class="ct-landing-row ${cls}" onclick="ctShowPreview('${t.id}')">
      <div class="ct-landing-row-main">
        <strong>${t.title}</strong>
        <small>${t.examTitle || "JEE Main"} · ${date}</small>
        ${t.status === "completed" && t.pct != null ? `<small class="ct-landing-score">${t.pct}% correct</small>` : ""}
      </div>
      <span class="ct-landing-action">${action}</span>
    </div>`;
  }).join("") : `<div class="ct-landing-empty">No tests in this filter.</div>`;

  const back = ctFromTests()
    ? `<button type="button" class="marks-ct-back" onclick="go('tests')">←</button>`
    : "";

  return `<div class="ct-landing-page">
    <div class="ct-landing-head">
      ${back}
      <div>
        <h1>Custom Test</h1>
        <p>${tests.length} Custom tests generated</p>
      </div>
    </div>
    <div class="ct-landing-filters">${filterPills}</div>
    <div class="ct-landing-list">${cards}</div>
    <button type="button" class="ct-create-sticky" onclick="ctStartWizard()">+ Create new custom test</button>
  </div>`;
}

function ctYearModalHtml(draft) {
  const shifts = _ctYearShiftsCache || [];
  window._ctYearModalShifts = shifts;
  const minY = shifts.length ? shifts[shifts.length - 1].year : 2002;
  const maxY = shifts.length ? shifts[0].year : new Date().getFullYear();
  const grid = window._ctYearModalShifts.map((s, i) => {
    const on = draft.customSources.has(s.source);
    return `<button type="button" class="ct-year-cell ${on ? "on" : ""}" onclick="ctToggleYearIdx(${i})">${s.label}</button>`;
  }).join("");

  return `<div class="marks-modal-overlay" id="ctYearModal" onclick="if(event.target===this)ctCloseYearModal()">
    <div class="marks-modal ct-year-modal">
      <div class="marks-modal-head">
        <h3>Select Year of Paper You Want to Include</h3>
        <button type="button" class="marks-modal-cancel" style="flex:0;padding:6px 12px" onclick="ctCloseYearModal()">✕</button>
      </div>
      <div class="marks-modal-body">
        <div class="ct-year-quick">
          <button type="button" onclick="ctSetYearPreset('all');ctCloseYearModal()">All Years</button>
          <button type="button" onclick="ctSetYearPreset('last3');ctCloseYearModal()">Last 3 Years</button>
          <button type="button" onclick="ctSetYearPreset('last5');ctCloseYearModal()">Last 5 Years</button>
          <button type="button" onclick="ctSetYearPreset('last10');ctCloseYearModal()">Last 10 Years</button>
        </div>
        <div class="ct-year-modal-head2">
          <span>All Years (${maxY} – ${minY})</span>
          <button type="button" class="marks-modal-clear" onclick="ctClearCustomYears()">Clear All</button>
        </div>
        <div class="ct-year-grid">${grid}</div>
      </div>
      <div class="marks-modal-foot">
        <button type="button" class="marks-modal-apply" onclick="ctApplyCustomYears()">Select</button>
      </div>
    </div>
  </div>`;
}

function ctPreviewModalHtml(test) {
  const mins = test.durationSec ? Math.round(test.durationSec / 60) : CT_DEFAULT_MINS;
  const sub = (test.chapters && test.chapters[0] && test.chapters[0].subjectTitle) || test.subjectTitle || "";
  const sty = ctSubjectStyle(sub);
  const chList = (test.chapters || []).map(c => c.shortName || c.title).join(", ");
  const yearLines = (test.yearLabels || []).slice(0, 8).join(", ");
  const yearMeta = test.yearPreset === "all" ? "All Years" : (test.yearPreset === "custom" ? `Custom (${(test.yearLabels || []).length} shifts)` : test.yearPresetLabel || "Selected years");

  return `<div class="marks-modal-overlay" id="ctPreviewModal" onclick="if(event.target===this)ctClosePreview()">
    <div class="marks-modal marks-preview-modal">
      <div class="marks-modal-head">
        <h3>Test preview</h3>
        <button type="button" class="marks-modal-cancel" style="flex:0;padding:6px 12px" onclick="ctClosePreview()">✕</button>
      </div>
      <div class="marks-modal-body">
        <h2 class="marks-preview-title">${test.title}</h2>
        <div class="marks-preview-badges">
          <span class="marks-preview-badge exam">${test.examTitle || "JEE Main"}</span>
          ${sub ? `<span class="marks-preview-badge subj" style="background:${sty.bg};color:${sty.color};border-color:${sty.border}">${sub}</span>` : ""}
        </div>
        <div class="marks-preview-stats">
          <div class="marks-preview-stat"><strong>${test.totalQs}</strong><small>Questions</small></div>
          <div class="marks-preview-stat"><strong>${mins} Mins</strong><small>Duration</small></div>
        </div>
        ${yearLines ? `<p class="ct-preview-years"><strong>Previous year (${yearMeta})</strong><br>${yearLines}</p>` : ""}
        ${sub ? `<p class="ct-preview-subj"><strong>${sub}</strong><br>${chList}</p>` : (chList ? `<p class="marks-preview-chapters">${chList}</p>` : "")}
        <button type="button" class="marks-preview-attempt" onclick="ctClosePreview();ctAttemptTest('${test.id}')">Attempt test now →</button>
        <button type="button" class="marks-preview-later" onclick="ctClosePreview()">Attempt Later</button>
      </div>
    </div>
  </div>`;
}

async function viewCustomTests(payload) {
  const keepFromTests = _ctPayload.fromTests;
  const p = { ..._ctPayload, ...(payload || {}) };
  if (p.fromTests == null && keepFromTests) p.fromTests = keepFromTests;
  _ctPayload = p;
  await fetchCtExams();

  if (p.step === "wizard" || _ctDraft) {
    if (p._draftInit || !_ctDraft) {
      _ctDraft = ctNewDraft(ctDefaultExam());
      _ctDraft.wizardStep = p.sub || "pick";
    }
    return ctWizardHtml();
  }

  const tests = ctLoadTests();
  return ctLandingHtml(tests);
}

function ctStartWizard() {
  _ctDraft = ctNewDraft(ctDefaultExam());
  _ctDraft.wizardStep = "pick";
  render("custom", { step: "wizard", fromTests: ctFromTests() });
}

function ctCloseWizard() {
  _ctDraft = null;
  render("custom", { step: "landing", fromTests: ctFromTests() });
}

function ctWizardBack() {
  if (!_ctDraft) return;
  if (_ctDraft.wizardStep === "years") _ctDraft.wizardStep = "chapters";
  else if (_ctDraft.wizardStep === "chapters") _ctDraft.wizardStep = "pick";
  else ctCloseWizard();
  render("custom", { step: "wizard", fromTests: ctFromTests() });
}

function ctSetFilter(f) {
  _ctFilter = f;
  render("custom", { step: "landing", fromTests: ctFromTests() });
}

function ctPickExam(id) {
  if (!_ctDraft) return;
  const exam = (_ctExamsCache || []).find(e => e._id === id);
  if (!exam) return;
  _ctDraft.examId = exam._id;
  _ctDraft.examTitle = exam.title;
  _ctDraft.examIcon = exam.icon || "";
  const sub = (exam.subjects || [])[0];
  _ctDraft.subjectId = sub ? sub._id : null;
  _ctDraft.subjectMeta = sub || null;
  _ctDraft.chapterIds = new Set();
  render("custom", { step: "wizard", fromTests: ctFromTests() });
}

function ctPickSubject(id) {
  if (!_ctDraft) return;
  const exam = (_ctExamsCache || []).find(e => e._id === _ctDraft.examId);
  const sub = exam && (exam.subjects || []).find(s => s._id === id);
  if (!sub) return;
  _ctDraft.subjectId = sub._id;
  _ctDraft.subjectMeta = sub;
  _ctDraft.chapterIds = new Set();
  render("custom", { step: "wizard", fromTests: ctFromTests() });
}

function ctGoChapters() {
  if (!_ctDraft || !_ctDraft.subjectId) return;
  _ctDraft.wizardStep = "chapters";
  _ctDraft.unitsSubjectId = _ctDraft.subjectId;
  if (!_ctDraft.expandedUnits) _ctDraft.expandedUnits = new Set();
  (ctExamSubjects(_ctDraft).find(s => s._id === _ctDraft.subjectId)?.units || []).forEach(u => _ctDraft.expandedUnits.add(u._id));
  render("custom", { step: "wizard", fromTests: ctFromTests() });
}

async function ctGoYears() {
  if (!ctSelectedChapters(_ctDraft).length) {
    showToast("⚠️ Select at least one chapter");
    return;
  }
  _ctDraft.wizardStep = "years";
  ctSyncDuration(_ctDraft);
  finishRender(`<div class="ct-wizard-overlay"><div class="ct-wizard-shell"><div class="ct-wiz-generating"><div class="ct-spinner"></div><strong>Loading year papers…</strong></div></div></div>`);
  _ctYearShiftsCache = null;
  await ctBuildYearShifts(true);
  render("custom", { step: "wizard", fromTests: ctFromTests() });
}

function ctSetSyllabus(hideOut) {
  if (!_ctDraft) return;
  _ctDraft.hideOutOfSyllabus = hideOut;
  render("custom", { step: "wizard", fromTests: ctFromTests() });
}

function ctShowUnitsFor(subjectId) {
  if (!_ctDraft) return;
  if (_ctDraft.unitsSubjectId === subjectId) {
    _ctDraft.unitsSubjectId = null;
  } else {
    _ctDraft.unitsSubjectId = subjectId;
    const sub = ctExamSubjects(_ctDraft).find(s => s._id === subjectId);
    if (sub && (!_ctDraft.expandedUnits || !_ctDraft.expandedUnits.size)) {
      _ctDraft.expandedUnits = new Set((sub.units || []).map(u => u._id));
    }
  }
  render("custom", { step: "wizard", fromTests: ctFromTests() });
}

function ctToggleUnitExpand(unitId) {
  if (!_ctDraft) return;
  if (!_ctDraft.expandedUnits) _ctDraft.expandedUnits = new Set();
  if (_ctDraft.expandedUnits.has(unitId)) _ctDraft.expandedUnits.delete(unitId);
  else _ctDraft.expandedUnits.add(unitId);
  render("custom", { step: "wizard", fromTests: ctFromTests() });
}

function ctSetTotalQs(n) {
  if (!_ctDraft) return;
  _ctDraft.totalQs = n;
  ctSyncDuration(_ctDraft);
  render("custom", { step: "wizard", fromTests: ctFromTests() });
}

function ctSetTimePerQ(sec) {
  if (!_ctDraft) return;
  _ctDraft.timePerQ = sec;
  ctSyncDuration(_ctDraft);
  render("custom", { step: "wizard", fromTests: ctFromTests() });
}

function ctToggleChapter(chId, checked) {
  if (!_ctDraft) return;
  if (checked) _ctDraft.chapterIds.add(chId);
  else _ctDraft.chapterIds.delete(chId);
  render("custom", { step: "wizard", fromTests: ctFromTests() });
}

function ctToggleUnitAll(subjectId, unitId) {
  if (!_ctDraft) return;
  const sub = ctExamSubjects(_ctDraft).find(s => s._id === subjectId);
  if (!sub) return;
  const unit = (sub.units || []).find(u => u._id === unitId);
  if (!unit) return;
  const visible = (unit.chapters || []).filter(ch => {
    if (_ctDraft.hideOutOfSyllabus && ch.syllabusCategory === "outOfSyllabus") return false;
    return true;
  });
  const allOn = visible.every(ch => _ctDraft.chapterIds.has(ch._id));
  visible.forEach(ch => { if (allOn) _ctDraft.chapterIds.delete(ch._id); else _ctDraft.chapterIds.add(ch._id); });
  render("custom", { step: "wizard", fromTests: ctFromTests() });
}

function ctSetYearPreset(preset) {
  if (!_ctDraft) return;
  _ctDraft.yearPreset = preset;
  if (preset !== "custom") _ctDraft.customSources = new Set();
  render("custom", { step: "wizard", fromTests: ctFromTests() });
}

async function ctOpenYearModal() {
  if (!_ctDraft) return;
  if (!_ctYearShiftsCache || !_ctYearShiftsCache.length) {
    showToast("📚 Loading all year papers…");
    await ctBuildYearShifts(true);
  }
  const existing = document.getElementById("ctYearModal");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", ctYearModalHtml(_ctDraft));
}

function ctCloseYearModal() {
  const el = document.getElementById("ctYearModal");
  if (el) el.remove();
}

function ctToggleYearIdx(idx) {
  if (!_ctDraft) return;
  const s = (window._ctYearModalShifts || [])[idx];
  if (!s) return;
  if (_ctDraft.customSources.has(s.source)) _ctDraft.customSources.delete(s.source);
  else _ctDraft.customSources.add(s.source);
  const modal = document.getElementById("ctYearModal");
  if (modal) modal.outerHTML = ctYearModalHtml(_ctDraft);
}

function ctClearCustomYears() {
  if (!_ctDraft) return;
  _ctDraft.customSources = new Set();
  const modal = document.getElementById("ctYearModal");
  if (modal) modal.outerHTML = ctYearModalHtml(_ctDraft);
}

function ctApplyCustomYears() {
  if (!_ctDraft) return;
  _ctDraft.yearPreset = "custom";
  ctCloseYearModal();
  render("custom", { step: "wizard", fromTests: ctFromTests() });
}

function ctAutoTitle(draft, chapters) {
  const subjShort = { Physics: "P", Chemistry: "C", Mathematics: "M", Biology: "B", Botany: "Bo", Zoology: "Z" };
  const prefix = subjShort[draft.subjectMeta?.title] || "T";
  const n = chapters.length;
  const chName = n === 1 ? (chapters[0].shortName || chapters[0].title.split(" ")[0]) : `${n} Chapters`;
  const num = ctLoadTests().length + 1;
  return `${prefix} - ${chName} Test ${num}`;
}

function ctMatchQuestion(q, chapters, draft) {
  const allowedSubs = new Set(chapters.map(c => c.subjectTitle).filter(Boolean));
  if (allowedSubs.size && !allowedSubs.has(q.subject)) return false;
  const titles = new Set(chapters.map(c => ctNormTitle(c.title)));
  const shorts = new Set(chapters.map(c => ctNormTitle(c.shortName || c.title)));
  const ch = ctNormTitle(q.chapter);
  const hit = titles.has(ch) || [...titles].some(t => ch.includes(t) || t.includes(ch))
    || [...shorts].some(s => s.length > 4 && (ch.includes(s) || s.includes(ch)));
  if (!hit) return false;
  if (!ctYearFilterOk(q.source, draft)) return false;
  if (draft.hideOutOfSyllabus && q._syllabusCategory === "outOfSyllabus") return false;
  return true;
}

function ctYearLabelsForDraft(draft) {
  const shifts = _ctYearShiftsCache || [];
  return shifts.filter(s => ctYearFilterOk(s.source, draft)).map(s => s.label);
}

async function ctGenerateTest() {
  if (!_ctDraft) return;
  if (ctDailyCount() >= CT_DAILY_LIMIT) {
    showToast("⚠️ Daily limit reached (25 tests). Try tomorrow.");
    return;
  }
  const chapters = ctSelectedChapters(_ctDraft);
  if (!chapters.length) return;

  _ctDraft.wizardStep = "generating";
  render("custom", { step: "wizard", fromTests: ctFromTests() });

  const bank = (typeof PRIMARY_BANK !== "undefined" && PRIMARY_BANK[STATE.exam]) || "jee_main";
  if (typeof ensureQuestionsLoaded === "function") await ensureQuestionsLoaded(bank);
  _ctYearShiftsCache = null;

  let pool = QUESTIONS.filter(q => ctMatchQuestion(q, chapters, _ctDraft));
  if (!pool.length) {
    const subj = _ctDraft.subjectMeta?.title;
    pool = QUESTIONS.filter(q => q.subject === subj && chapters.some(c => {
      const a = ctNormTitle(q.chapter);
      const b = ctNormTitle(c.title);
      return a.includes(b.slice(0, 8)) || b.includes(a.slice(0, 8));
    })).filter(q => ctYearFilterOk(q.source, _ctDraft));
  }
  if (!pool.length) {
    showToast("⚠️ No questions found. Try more chapters or different years.");
    _ctDraft.wizardStep = "years";
    render("custom", { step: "wizard", fromTests: ctFromTests() });
    return;
  }

  await new Promise(r => setTimeout(r, 800));

  const shuffled = pool.sort(() => Math.random() - 0.5);
  const take = Math.min(_ctDraft.totalQs, shuffled.length);
  const ids = shuffled.slice(0, take).map(q => q.id);
  const title = ctAutoTitle(_ctDraft, chapters);
  const testId = "ct_" + Date.now();
  const yearLabels = ctYearLabelsForDraft(_ctDraft);
  const presetLabels = { all: "All Years", last3: "Last 3 Years", last5: "Last 5 Years", last10: "Last 10 Years", custom: "Custom Years" };

  const record = {
    id: testId,
    title,
    examTitle: _ctDraft.examTitle,
    subjectTitle: _ctDraft.subjectMeta?.title,
    chapterCount: chapters.length,
    chapters: chapters.map(c => ({ title: c.title, shortName: c.shortName, subjectTitle: c.subjectTitle || _ctDraft.subjectMeta?.title })),
    timePerQ: _ctDraft.timePerQ,
    totalQs: take,
    status: "notStarted",
    createdAt: new Date().toISOString(),
    questionIds: ids,
    timed: true,
    durationSec: _ctDraft.durationSec,
    modeLabel: `Custom · ${Math.round(_ctDraft.durationSec / 60)} min`,
    yearPreset: _ctDraft.yearPreset,
    yearPresetLabel: presetLabels[_ctDraft.yearPreset],
    yearLabels
  };

  const list = ctLoadTests();
  list.unshift(record);
  ctSaveTests(list);
  ctBumpDaily();

  const fromTests = ctFromTests();
  _ctDraft = null;
  _ctPayload = { step: "landing", fromTests };

  render("custom", { step: "landing", fromTests });
  setTimeout(() => ctShowPreview(testId), 150);
}

function ctShowPreview(testId) {
  const t = ctLoadTests().find(x => x.id === testId);
  if (!t) return;
  const existing = document.getElementById("ctPreviewModal");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", ctPreviewModalHtml(t));
}

function ctClosePreview() {
  const el = document.getElementById("ctPreviewModal");
  if (el) el.remove();
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

function ctAttemptTest(id) {
  const t = ctLoadTests().find(x => x.id === id);
  if (!t) return;
  const list = ctLoadTests();
  const item = list.find(x => x.id === id);
  if (item && item.status !== "completed") {
    item.status = "inProgress";
    ctSaveTests(list);
  }
  startTest(t.questionIds, t.title, "custom", {
    testType: "custom",
    timed: t.timed,
    durationSec: t.durationSec,
    modeLabel: t.modeLabel,
    testId: t.id,
    marksMode: true,
    organizeJee: false,
    onComplete: ctOnCompleteHook(t.id)
  });
}

function ctResetWizard() {
  _ctDraft = null;
  _ctPayload = { step: "landing" };
}