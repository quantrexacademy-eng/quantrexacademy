// MARKS-style Custom Test — /ct flow (landing → wizard → preview → test)

const CT_DAILY_LIMIT = 25;
const CT_STORE = "quantrex_custom_tests_v1";
const CT_TEACHER_STORE = "quantrex_teacher_custom_tests_v1";
const CT_DAILY = "quantrex_ct_daily_v1";

const CT_DEFAULT_QS = 25;
const CT_DEFAULT_MINS = 60;
const CT_Q_PRESETS = [5, 10, 15, 20, 25, 30, 45, 60, 75, 90];
const CT_TIME_PRESETS = [
  { sec: 60, label: "1 min" },
  { sec: 90, label: "1.5 min" },
  { sec: 120, label: "2 min" },
  { sec: 180, label: "3 min" }
];
const CT_DEFAULT_EXAM = { totalQs: 25, timePerQ: 120 };
const CT_EXAM_DEFAULTS = {
  jee_main: { totalQs: 25, timePerQ: 120 },
  jee_advanced: { totalQs: 18, timePerQ: 180 },
  nta_abhyas_jee_main: { totalQs: 25, timePerQ: 120 },
  mht_cet: { totalQs: 50, timePerQ: 72 },
  comedk: { totalQs: 30, timePerQ: 120 },
  bitsat: { totalQs: 30, timePerQ: 72 },
  wbjee: { totalQs: 30, timePerQ: 120 },
  kcet: { totalQs: 30, timePerQ: 72 },
  ap_eamcet: { totalQs: 40, timePerQ: 72 },
  ts_eamcet: { totalQs: 40, timePerQ: 72 },
  viteee: { totalQs: 30, timePerQ: 60 },
  manipal_met: { totalQs: 30, timePerQ: 72 },
  iat_iiser: { totalQs: 30, timePerQ: 120 },
  nest_niser: { totalQs: 30, timePerQ: 120 },
  kvpy: { totalQs: 25, timePerQ: 120 },
  nda: { totalQs: 30, timePerQ: 90 },
  neet: { totalQs: 45, timePerQ: 80 },
  aiims: { totalQs: 40, timePerQ: 90 },
  nta_abhyas_neet: { totalQs: 45, timePerQ: 80 },
  jipmer: { totalQs: 40, timePerQ: 90 },
  mht_cet_medical: { totalQs: 50, timePerQ: 72 }
};

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

function ctStoreKey(teacher) {
  return (teacher || ctTeacherMode()) ? CT_TEACHER_STORE : CT_STORE;
}

function ctLoadTests(teacher) {
  try { return JSON.parse(localStorage.getItem(ctStoreKey(teacher)) || "[]"); }
  catch (e) { return []; }
}

function ctSaveTests(list, teacher) {
  localStorage.setItem(ctStoreKey(teacher), JSON.stringify(list));
}

function ctTeacherMode() {
  return !!(_ctPayload && _ctPayload.teacherMode) || ctIsTeacherAssign();
}

function ctCpyqbToExam(navEntry) {
  const slug = navEntry.slug;
  return {
    _id: "ct_" + slug,
    slug,
    title: navEntry.title,
    icon: "",
    hasOutOfSyllabusFilter: false,
    subjects: (navEntry.subjects || []).map((sub, si) => ({
      _id: "ct_" + slug + "_s" + si,
      title: sub.name,
      shortName: (sub.name || "Sub").slice(0, 3),
      units: [{
        _id: "ct_" + slug + "_s" + si + "_u0",
        title: "All Chapters",
        shortName: "All",
        chapters: (sub.chapters || []).map((ch, ci) => ({
          _id: "ct_" + slug + "_s" + si + "_c" + ci,
          title: ch.name,
          shortName: ch.name,
          syllabusCategory: "noChange"
        }))
      }]
    }))
  };
}

async function fetchCtExams() {
  if (_ctExamsCache) return _ctExamsCache;
  let rich = [];
  try {
    const res = await fetch("data/nav/custom_test_exams.json");
    if (res.ok) {
      const data = await res.json();
      rich = (data.data && data.data.exams) || [];
    }
  } catch (e) { /* skip */ }
  let cpyqb = [];
  try {
    if (typeof fetchNav === "function") cpyqb = await fetchNav("cpyqb");
    else {
      const res = await fetch("data/nav/cpyqb.json");
      if (res.ok) cpyqb = await res.json();
    }
  } catch (e) { /* skip */ }
  const richByTitle = new Map(rich.map(e => [e.title, e]));
  const bySlug = new Map(cpyqb.map(e => [e.slug, e]));
  const slugs = [
    ...((typeof CPYQB_EXAM_ORDER !== "undefined" && CPYQB_EXAM_ORDER.Engineering) || []),
    ...((typeof CPYQB_EXAM_ORDER !== "undefined" && CPYQB_EXAM_ORDER.Medical) || [])
  ];
  _ctExamsCache = [...new Set(slugs)].map(slug => {
    const nav = bySlug.get(slug);
    if (!nav) return null;
    const richExam = richByTitle.get(nav.title);
    if (richExam) return { ...richExam, slug };
    return ctCpyqbToExam(nav);
  }).filter(Boolean);
  if (!_ctExamsCache.length) _ctExamsCache = rich;
  return _ctExamsCache;
}

function ctExamsForWizard() {
  const all = _ctExamsCache || [];
  const order = STATE.exam === "Medical"
    ? ((typeof CPYQB_EXAM_ORDER !== "undefined" && CPYQB_EXAM_ORDER.Medical) || [])
    : ((typeof CPYQB_EXAM_ORDER !== "undefined" && CPYQB_EXAM_ORDER.Engineering) || []);
  return order.map(s => all.find(e => e.slug === s)).filter(Boolean);
}

function ctDefaultExam() {
  const list = ctExamsForWizard();
  const wantSlug = STATE.exam === "Medical" ? "neet" : "jee_main";
  return list.find(e => e.slug === wantSlug) || list[0];
}

function ctApplyExamDefaults(draft, exam) {
  if (!draft || !exam) return;
  const slug = exam.slug || "";
  const defs = CT_EXAM_DEFAULTS[slug] || CT_DEFAULT_EXAM;
  draft.examSlug = slug;
  draft.totalQs = defs.totalQs;
  draft.timePerQ = defs.timePerQ;
  draft.durationManual = false;
  ctSyncDuration(draft, true);
}

function ctNewDraft(exam) {
  const subj = (exam.subjects || [])[0];
  const draft = {
    wizardStep: "pick",
    examId: exam._id,
    examSlug: exam.slug || "",
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
    durationSec: CT_DEFAULT_QS * 120,
    durationManual: false
  };
  ctApplyExamDefaults(draft, exam);
  return draft;
}

function ctSyncDuration(draft, force) {
  if (!draft) return;
  if (draft.durationManual && !force) return;
  draft.durationSec = Math.max(60, (draft.totalQs || CT_DEFAULT_QS) * (draft.timePerQ || 120));
}

function ctExamSubjects(draft) {
  const exam = (_ctExamsCache || []).find(e => e._id === draft.examId);
  return (exam && exam.subjects) || (draft.subjectMeta ? [draft.subjectMeta] : []);
}

function ctBanksForYears(draft) {
  const slug = draft && draft.examSlug;
  if (slug && typeof BANK_INDEX !== "undefined" && BANK_INDEX[slug]) {
    const banks = [slug];
    if (slug === "jee_main" && BANK_INDEX.nta_abhyas_jee_main) banks.push("nta_abhyas_jee_main");
    if (slug === "neet" && BANK_INDEX.nta_abhyas_neet) banks.push("nta_abhyas_neet");
    return banks.filter(s => BANK_INDEX[s]);
  }
  if (STATE.exam === "Medical") return ["neet", "nta_abhyas_neet", "aiims"].filter(s => typeof BANK_INDEX !== "undefined" && BANK_INDEX[s]);
  return ["jee_main", "nta_abhyas_jee_main", "jee_advanced"].filter(s => typeof BANK_INDEX !== "undefined" && BANK_INDEX[s]);
}

function ctNormTitle(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function ctFromTests() {
  return !!(_ctPayload && _ctPayload.fromTests);
}

function ctIsTeacherAssign() {
  return !!(_ctDraft && _ctDraft._teacherAssign);
}

function ctRender(payload) {
  if (ctTeacherMode() || ctIsTeacherAssign()) {
    if (payload) _ctPayload = { ..._ctPayload, ...payload, teacherMode: true };
    if (typeof QuantrexTeacherBuilder !== "undefined") QuantrexTeacherBuilder.refresh();
    else if (typeof QuantrexAssignments !== "undefined") QuantrexAssignments.setTeacherTab("builder");
    else go("teacher");
    return;
  }
  render("custom", payload);
}

function ctSubjectStyle(title) {
  const m = {
    Physics: { bg: "rgba(249,115,22,.15)", border: "#f97316", color: "#fb923c", short: "Phy" },
    Chemistry: { bg: "rgba(34,197,94,.15)", border: "#22c55e", color: "#4ade80", short: "Chem" },
    Mathematics: { bg: "rgba(59,130,246,.15)", border: "#3b82f6", color: "#60a5fa", short: "Math" },
    Biology: { bg: "rgba(236,72,153,.15)", border: "#ec4899", color: "#f472b6", short: "Bio" },
    Botany: { bg: "rgba(16,185,129,.15)", border: "#10b981", color: "#34d399", short: "Bot" },
    Zoology: { bg: "rgba(249,115,22,.15)", border: "#f97316", color: "#fb923c", short: "Zoo" },
    "General Ability": { bg: "rgba(99,102,241,.15)", border: "#6366f1", color: "#818cf8", short: "GA" },
    English: { bg: "rgba(168,85,247,.15)", border: "#a855f7", color: "#c084fc", short: "Eng" },
    "General Science": { bg: "rgba(14,165,233,.15)", border: "#0ea5e9", color: "#38bdf8", short: "Sci" },
    "General Studies": { bg: "rgba(234,179,8,.15)", border: "#eab308", color: "#facc15", short: "GS" }
  };
  return m[title] || { bg: "rgba(148,163,184,.15)", border: "#94a3b8", color: "#cbd5e1", short: (title || "Sub").slice(0, 4) };
}

function ctSubjectIcon(sub) {
  return `<span class="ct-wiz-subj-emoji">${typeof subjectIcon === "function" ? subjectIcon(sub.title) : "📖"}</span>`;
}

function ctExamIcon(ex) {
  const slug = ex.slug || "";
  if (typeof QuantrexExamLogos !== "undefined" && slug) {
    return QuantrexExamLogos.html(slug, 32, "ct-wiz-card-logo");
  }
  const t = String(ex.title || "").toLowerCase();
  const ic = /neet/i.test(t) ? "🩺" : /nda/i.test(t) ? "🎖️" : /mht/i.test(t) ? "🎓" : /jee/i.test(t) ? "📝" : "📋";
  return `<span class="ct-wiz-card-fb">${ic}</span>`;
}

function ctChapterIcon(ch) {
  if (!ch) return "";
  if (typeof QxCardIcons !== "undefined") {
    const name = ch.shortName || ch.title || ch.name || "";
    const subj = ch.subject || (typeof _ctState !== "undefined" && _ctState.subject) || "";
    return QxCardIcons.chapterIconHtml(name, subj, ch);
  }
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
  for (const slug of ctBanksForYears(_ctDraft)) {
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
  const autoMins = Math.round(((draft.totalQs || CT_DEFAULT_QS) * (draft.timePerQ || 120)) / 60);
  const perQLabel = draft.timePerQ >= 60 ? (draft.timePerQ / 60) + " min" : draft.timePerQ + "s";
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
      <h4 style="margin-top:14px">Total Test Duration</h4>
      <div class="ct-wiz-duration-row">
        <input type="number" class="ct-wiz-duration-input" min="1" max="600" value="${mins}" onchange="ctSetDurationMins(+this.value)">
        <span class="ct-wiz-duration-unit">min</span>
        <button type="button" class="ct-wiz-duration-bump" onclick="ctBumpDuration(15)">+15 min</button>
        <button type="button" class="ct-wiz-duration-bump" onclick="ctBumpDuration(30)">+30 min</button>
      </div>
      <p class="ct-wiz-est-time">${draft.examTitle || "Exam"} default: <strong>${autoMins} min</strong> (${draft.totalQs} Qs × ${perQLabel}) · Test time: <strong>${mins} min</strong>${draft.durationManual ? " · custom" : ""}</p>
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
    ${ctWizardPreviewBar(draft, ctIsTeacherAssign() ? "Create Assignment" : "Generate Test", "ctGenerateTest()", false)}
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

function ctFilterTests(tests, teacher) {
  if (teacher || ctTeacherMode()) {
    if (_ctFilter === "attempted") return tests.filter(t => t.assigned);
    if (_ctFilter === "notAttempted") return tests.filter(t => !t.assigned);
    return tests;
  }
  if (_ctFilter === "attempted") return tests.filter(t => t.status === "completed");
  if (_ctFilter === "notAttempted") return tests.filter(t => t.status !== "completed");
  if (_ctFilter === "resume") return tests.filter(t => t.status === "inProgress");
  return tests;
}

function ctLandingHtml(tests, forTeacher) {
  const teacher = forTeacher || ctTeacherMode();
  const filtered = ctFilterTests(tests, teacher);
  const filters = teacher
    ? [
        { id: "all", label: "All" },
        { id: "notAttempted", label: "Ready to Assign" },
        { id: "attempted", label: "Assigned" }
      ]
    : [
        { id: "all", label: "All" },
        { id: "attempted", label: "Attempted" },
        { id: "notAttempted", label: "Not Attempted" },
        { id: "resume", label: "Resume" }
      ];
  const filterPills = filters.map(f =>
    `<button type="button" class="ct-landing-filter ${ _ctFilter === f.id ? "on" : ""}" onclick="ctSetFilter('${f.id}')">${f.label}</button>`
  ).join("");

  const cards = filtered.length ? filtered.slice(0, 40).map(t => {
    let action, cls;
    if (teacher) {
      action = t.assigned ? "Assigned ✓" : "Assign to Batch →";
      cls = t.assigned ? "done" : "";
    } else {
      action = t.status === "completed" ? "View Analysis →" : (t.status === "inProgress" ? "Resume →" : "Attempt Now →");
      cls = t.status === "completed" ? "done" : "";
    }
    const date = t.createdAt ? new Date(t.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
    const extra = !teacher && t.status === "completed" && t.pct != null
      ? `<small class="ct-landing-score">${t.pct}% correct</small>`
      : (teacher && t.totalQs ? `<small class="ct-landing-score">${t.totalQs} Qs · ${Math.round((t.durationSec || 3600) / 60)} min</small>` : "");
    return `<div class="ct-landing-row ${cls}" onclick="ctShowPreview('${t.id}', ${teacher})">
      <div class="ct-landing-row-main">
        <strong>${t.title}</strong>
        <small>${t.examTitle || "JEE Main"} · ${date}</small>
        ${extra}
      </div>
      <span class="ct-landing-action">${action}</span>
    </div>`;
  }).join("") : `<div class="ct-landing-empty">No tests in this filter.</div>`;

  let back = "";
  if (teacher) {
    back = `<button type="button" class="marks-ct-back" onclick="QuantrexAssignments.setTeacherTab('home')">←</button>`;
  } else if (ctFromTests()) {
    back = `<button type="button" class="marks-ct-back" onclick="go('tests')">←</button>`;
  }

  const createFn = teacher ? "ctStartWizardTeacher()" : "ctStartWizard()";
  const title = teacher ? "Create Own Test" : "Custom Test";
  const sub = teacher
    ? `${tests.length} teacher tests · exam · chapters · years · assign to batch`
    : `${tests.length} Custom tests generated`;

  return `<div class="ct-landing-page">
    <div class="ct-landing-head">
      ${back}
      <div>
        <h1>${title}</h1>
        <p>${sub}</p>
      </div>
    </div>
    <div class="ct-landing-filters">${filterPills}</div>
    <div class="ct-landing-list">${cards}</div>
    <button type="button" class="ct-create-sticky" onclick="${createFn}">+ Create new custom test</button>
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

function ctPreviewModalHtml(test, forTeacher) {
  const teacher = forTeacher || ctTeacherMode();
  const mins = test.durationSec ? Math.round(test.durationSec / 60) : CT_DEFAULT_MINS;
  const sub = (test.chapters && test.chapters[0] && test.chapters[0].subjectTitle) || test.subjectTitle || "";
  const sty = ctSubjectStyle(sub);
  const chList = (test.chapters || []).map(c => c.shortName || c.title).join(", ");
  const yearLines = (test.yearLabels || []).slice(0, 8).join(", ");
  const yearMeta = test.yearPreset === "all" ? "All Years" : (test.yearPreset === "custom" ? `Custom (${(test.yearLabels || []).length} shifts)` : test.yearPresetLabel || "Selected years");

  const actions = teacher
    ? `<button type="button" class="marks-preview-attempt" onclick="ctClosePreview();ctAssignTeacherTest('${test.id}')">${test.assigned ? "Assign Again →" : "Assign to Batch →"}</button>
        <button type="button" class="marks-preview-later" onclick="ctClosePreview()">Close</button>`
    : `<button type="button" class="marks-preview-attempt" onclick="ctClosePreview();ctAttemptTest('${test.id}')">Attempt test now →</button>
        <button type="button" class="marks-preview-later" onclick="ctClosePreview()">Attempt Later</button>`;

  return `<div class="marks-modal-overlay" id="ctPreviewModal" onclick="if(event.target===this)ctClosePreview()">
    <div class="marks-modal marks-preview-modal">
      <div class="marks-modal-head">
        <h3>${teacher ? "Assignment preview" : "Test preview"}</h3>
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
        ${actions}
      </div>
    </div>
  </div>`;
}

async function viewCustomTests(payload) {
  const keepFromTests = _ctPayload.fromTests;
  const p = { ..._ctPayload, ...(payload || {}) };
  if (p.fromTests == null && keepFromTests) p.fromTests = keepFromTests;
  p.teacherMode = false;
  if (_ctDraft && _ctDraft._teacherAssign) _ctDraft = null;
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

async function viewTeacherCustomTests(payload) {
  const p = { ...(payload || {}), teacherMode: true, step: (payload && payload.step) || "landing" };
  _ctPayload = { ..._ctPayload, ...p };
  await fetchCtExams();

  if (p.step === "wizard" || (_ctDraft && _ctDraft._teacherAssign)) {
    if (!_ctDraft) {
      _ctDraft = ctNewDraft(ctDefaultExam());
      _ctDraft.wizardStep = p.sub || "pick";
      _ctDraft._teacherAssign = true;
    }
    if (typeof QuantrexTeacherBuilder !== "undefined") QuantrexTeacherBuilder.setWizardActive();
    if (_ctDraft.wizardStep === "years" && (!_ctYearShiftsCache || !_ctYearShiftsCache.length)) {
      await ctBuildYearShifts(true);
    }
    return ctWizardHtml();
  }

  if (typeof QuantrexTeacherBuilder !== "undefined") QuantrexTeacherBuilder.setLanding();
  const tests = ctLoadTests(true);
  return ctLandingHtml(tests, true);
}

function ctStartWizard() {
  _ctDraft = ctNewDraft(ctDefaultExam());
  _ctDraft.wizardStep = "pick";
  ctRender({ step: "wizard", fromTests: ctFromTests() });
}

function ctStartWizardTeacher() {
  _ctPayload = { step: "wizard", teacherMode: true };
  _ctDraft = ctNewDraft(ctDefaultExam());
  _ctDraft.wizardStep = "pick";
  _ctDraft._teacherAssign = true;
  if (typeof QuantrexTeacherBuilder !== "undefined") QuantrexTeacherBuilder.setWizardActive();
  ctRender({ step: "wizard", teacherMode: true });
}

function ctCloseWizard() {
  if (ctTeacherMode() || ctIsTeacherAssign()) {
    _ctDraft = null;
    _ctPayload = { step: "landing", teacherMode: true };
    if (typeof QuantrexTeacherBuilder !== "undefined") QuantrexTeacherBuilder.setLanding();
    ctRender({ step: "landing", teacherMode: true });
    return;
  }
  _ctDraft = null;
  ctRender({ step: "landing", fromTests: ctFromTests() });
}

function ctAssignTeacherTest(id) {
  const t = ctLoadTests(true).find(x => x.id === id);
  if (!t) { showToast("Test not found"); return; }
  if (typeof QuantrexAssignments === "undefined") { showToast("Teacher module loading…"); return; }
  QuantrexAssignments.applyFromCustomTest(t);
  const list = ctLoadTests(true);
  const item = list.find(x => x.id === id);
  if (item) {
    item.assigned = true;
    item.assignedAt = new Date().toISOString();
    ctSaveTests(list, true);
  }
}

function ctWizardBack() {
  if (!_ctDraft) return;
  if (_ctDraft.wizardStep === "years") _ctDraft.wizardStep = "chapters";
  else if (_ctDraft.wizardStep === "chapters") _ctDraft.wizardStep = "pick";
  else {
    ctCloseWizard();
    return;
  }
  const payload = (ctTeacherMode() || ctIsTeacherAssign())
    ? { step: "wizard", teacherMode: true }
    : { step: "wizard", fromTests: ctFromTests() };
  ctRender(payload);
}

function ctSetFilter(f) {
  _ctFilter = f;
  ctRender({ step: "landing", fromTests: ctFromTests() });
}

function ctPickExam(id) {
  if (!_ctDraft) return;
  const exam = (_ctExamsCache || []).find(e => e._id === id);
  if (!exam) return;
  _ctDraft.examId = exam._id;
  _ctDraft.examTitle = exam.title;
  _ctDraft.examIcon = exam.icon || "";
  ctApplyExamDefaults(_ctDraft, exam);
  const sub = (exam.subjects || [])[0];
  _ctDraft.subjectId = sub ? sub._id : null;
  _ctDraft.subjectMeta = sub || null;
  _ctDraft.chapterIds = new Set();
  _ctYearShiftsCache = null;
  ctRender({ step: "wizard", fromTests: ctFromTests() });
}

function ctPickSubject(id) {
  if (!_ctDraft) return;
  const exam = (_ctExamsCache || []).find(e => e._id === _ctDraft.examId);
  const sub = exam && (exam.subjects || []).find(s => s._id === id);
  if (!sub) return;
  _ctDraft.subjectId = sub._id;
  _ctDraft.subjectMeta = sub;
  _ctDraft.chapterIds = new Set();
  ctRender({ step: "wizard", fromTests: ctFromTests() });
}

function ctGoChapters() {
  if (!_ctDraft || !_ctDraft.subjectId) return;
  _ctDraft.wizardStep = "chapters";
  _ctDraft.unitsSubjectId = _ctDraft.subjectId;
  if (!_ctDraft.expandedUnits) _ctDraft.expandedUnits = new Set();
  (ctExamSubjects(_ctDraft).find(s => s._id === _ctDraft.subjectId)?.units || []).forEach(u => _ctDraft.expandedUnits.add(u._id));
  ctRender({ step: "wizard", fromTests: ctFromTests() });
}

async function ctGoYears() {
  if (!ctSelectedChapters(_ctDraft).length) {
    showToast("⚠️ Select at least one chapter");
    return;
  }
  _ctDraft.wizardStep = "years";
  ctSyncDuration(_ctDraft);
  if (ctIsTeacherAssign()) {
    go("teacher");
  } else {
    finishRender(`<div class="ct-wizard-overlay"><div class="ct-wizard-shell"><div class="ct-wiz-generating"><div class="ct-spinner"></div><strong>Loading year papers…</strong></div></div></div>`);
  }
  _ctYearShiftsCache = null;
  await ctBuildYearShifts(true);
  ctRender({ step: "wizard", fromTests: ctFromTests() });
}

function ctSetSyllabus(hideOut) {
  if (!_ctDraft) return;
  _ctDraft.hideOutOfSyllabus = hideOut;
  ctRender({ step: "wizard", fromTests: ctFromTests() });
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
  ctRender({ step: "wizard", fromTests: ctFromTests() });
}

function ctToggleUnitExpand(unitId) {
  if (!_ctDraft) return;
  if (!_ctDraft.expandedUnits) _ctDraft.expandedUnits = new Set();
  if (_ctDraft.expandedUnits.has(unitId)) _ctDraft.expandedUnits.delete(unitId);
  else _ctDraft.expandedUnits.add(unitId);
  ctRender({ step: "wizard", fromTests: ctFromTests() });
}

function ctSetTotalQs(n) {
  if (!_ctDraft) return;
  _ctDraft.totalQs = n;
  _ctDraft.durationManual = false;
  ctSyncDuration(_ctDraft);
  ctRender({ step: "wizard", fromTests: ctFromTests() });
}

function ctSetTimePerQ(sec) {
  if (!_ctDraft) return;
  _ctDraft.timePerQ = sec;
  _ctDraft.durationManual = false;
  ctSyncDuration(_ctDraft);
  ctRender({ step: "wizard", fromTests: ctFromTests() });
}

function ctSetDurationMins(mins) {
  if (!_ctDraft) return;
  const m = Math.max(1, Math.min(600, Math.round(Number(mins) || 0)));
  _ctDraft.durationSec = m * 60;
  _ctDraft.durationManual = true;
  ctRender({ step: "wizard", fromTests: ctFromTests() });
}

function ctBumpDuration(mins) {
  if (!_ctDraft) return;
  const add = Math.max(1, Math.round(Number(mins) || 0));
  _ctDraft.durationSec = Math.max(60, (_ctDraft.durationSec || CT_DEFAULT_MINS * 60) + add * 60);
  _ctDraft.durationManual = true;
  ctRender({ step: "wizard", fromTests: ctFromTests() });
}

function ctToggleChapter(chId, checked) {
  if (!_ctDraft) return;
  if (checked) _ctDraft.chapterIds.add(chId);
  else _ctDraft.chapterIds.delete(chId);
  ctRender({ step: "wizard", fromTests: ctFromTests() });
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
  ctRender({ step: "wizard", fromTests: ctFromTests() });
}

function ctSetYearPreset(preset) {
  if (!_ctDraft) return;
  _ctDraft.yearPreset = preset;
  if (preset !== "custom") _ctDraft.customSources = new Set();
  ctRender({ step: "wizard", fromTests: ctFromTests() });
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
  ctRender({ step: "wizard", fromTests: ctFromTests() });
}

function ctAutoTitle(draft, chapters) {
  const subjShort = { Physics: "P", Chemistry: "C", Mathematics: "M", Biology: "B", Botany: "Bo", Zoology: "Z" };
  const prefix = subjShort[draft.subjectMeta?.title] || "T";
  const n = chapters.length;
  const chName = n === 1 ? (chapters[0].shortName || chapters[0].title.split(" ")[0]) : `${n} Chapters`;
  const num = ctLoadTests(ctTeacherMode() || ctIsTeacherAssign()).length + 1;
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
  const teacherGen = ctTeacherMode() || ctIsTeacherAssign();
  if (!teacherGen && ctDailyCount() >= CT_DAILY_LIMIT) {
    showToast("⚠️ Daily limit reached (25 tests). Try tomorrow.");
    return;
  }
  const chapters = ctSelectedChapters(_ctDraft);
  if (!chapters.length) return;

  _ctDraft.wizardStep = "generating";
  ctRender({ step: "wizard", fromTests: ctFromTests() });

  const banks = ctBanksForYears(_ctDraft);
  if (typeof loadMultipleBanks === "function") await loadMultipleBanks(banks);
  else if (typeof ensureQuestionsLoaded === "function") await ensureQuestionsLoaded(banks[0]);
  else for (const b of banks) { if (typeof loadSingleBank === "function") await loadSingleBank(b); }
  _ctYearShiftsCache = null;

  let pool = QUESTIONS.filter(q => banks.includes(q._bank) && ctMatchQuestion(q, chapters, _ctDraft));
  if (!pool.length) {
    const subj = _ctDraft.subjectMeta?.title;
    pool = QUESTIONS.filter(q => banks.includes(q._bank) && q.subject === subj && chapters.some(c => {
      const a = ctNormTitle(q.chapter);
      const b = ctNormTitle(c.title);
      return a.includes(b.slice(0, 8)) || b.includes(a.slice(0, 8));
    })).filter(q => ctYearFilterOk(q.source, _ctDraft));
  }
  if (!pool.length) {
    showToast("⚠️ No questions found. Try more chapters or different years.");
    _ctDraft.wizardStep = "years";
    ctRender({ step: "wizard", fromTests: ctFromTests() });
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
    examSlug: _ctDraft.examSlug || "",
    subjectTitle: _ctDraft.subjectMeta?.title,
    chapterCount: chapters.length,
    chapters: chapters.map(c => ({ id: c.id, title: c.title, shortName: c.shortName, subjectTitle: c.subjectTitle || _ctDraft.subjectMeta?.title })),
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

  if (teacherGen) {
    const tlist = ctLoadTests(true);
    tlist.unshift(record);
    ctSaveTests(tlist, true);
    _ctDraft = null;
    _ctPayload = { step: "landing", teacherMode: true };
    if (typeof QuantrexTeacherBuilder !== "undefined") QuantrexTeacherBuilder.setLanding();
    ctRender({ step: "landing", teacherMode: true });
    setTimeout(() => ctShowPreview(testId, true), 200);
    return;
  }

  const list = ctLoadTests();
  list.unshift(record);
  ctSaveTests(list);
  ctBumpDaily();

  const fromTests = ctFromTests();
  _ctDraft = null;
  _ctPayload = { step: "landing", fromTests };

  ctRender({ step: "landing", fromTests });
  setTimeout(() => ctShowPreview(testId), 150);
}

function ctShowPreview(testId, forTeacher) {
  const teacher = forTeacher || ctTeacherMode();
  const t = ctLoadTests(teacher).find(x => x.id === testId);
  if (!t) return;
  const existing = document.getElementById("ctPreviewModal");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", ctPreviewModalHtml(t, teacher));
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