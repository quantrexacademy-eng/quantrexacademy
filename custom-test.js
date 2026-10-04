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

function ctB64urlEncode(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function ctB64urlDecode(s) {
  let t = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
  while (t.length % 4) t += "=";
  return decodeURIComponent(escape(atob(t)));
}
function ctSharePayload(test) {
  return {
    v: 1,
    id: test.id,
    title: test.title,
    examSlug: test.examSlug || "",
    examTitle: test.examTitle || "",
    totalQs: test.totalQs,
    durationSec: test.durationSec,
    timed: test.timed !== false,
    modeLabel: test.modeLabel || "Custom Test",
    ids: test.questionIds || []
  };
}
function ctShareUrl(test) {
  const token = ctB64urlEncode(JSON.stringify(ctSharePayload(test)));
  // Always app.html. Site root rewrites to login.html, so a shared link must not use "/".
  return location.origin + "/app.html#custom/take/" + token;
}
function ctResolveTest(testId, teacher) {
  if (typeof testId === "object" && testId && (testId.questionIds || testId.id)) return testId;
  return ctLoadTests(teacher).find((x) => x.id === testId);
}
async function ctCopyShareLink(testId, teacher) {
  const t = ctResolveTest(testId, teacher);
  if (!t) { showToast("Test not found"); return; }
  const url = ctShareUrl(t);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(url);
    else {
      const inp = document.createElement("input");
      inp.value = url; document.body.appendChild(inp); inp.select(); document.execCommand("copy"); inp.remove();
    }
    showToast("Link copied — anyone can open it and take this test");
  } catch (_) {
    showToast(url);
  }
}
function ctShareWhatsApp(testId, teacher) {
  const t = ctResolveTest(testId, teacher);
  if (!t) { showToast("Test not found"); return; }
  const url = ctShareUrl(t);
  const text = (t.title || "Quantrex custom test") + " — " + (t.totalQs || "") + " Qs\n" + url;
  window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
}
async function ctNativeShare(testId, teacher) {
  const t = ctResolveTest(testId, teacher);
  if (!t) { showToast("Test not found"); return; }
  const url = ctShareUrl(t);
  if (navigator.share) {
    try {
      await navigator.share({ title: t.title || "Quantrex custom test", text: t.title || "Custom test", url: url });
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
  }
  await ctCopyShareLink(t, teacher);
}
function ctShareButtonsHtml(test, teacher) {
  if (!test) return "";
  const tid = String(test.id || "").replace(/'/g, "");
  const tflag = teacher ? "true" : "false";
  let url = "";
  try { url = ctShareUrl(test); } catch (_) { url = ""; }
  const safeUrl = String(url).replace(/"/g, "&quot;");
  return `<div class="ct-share-panel">
    <strong>Share this test</strong>
    <p>Copy, WhatsApp, or system share — anyone with the link can attempt it.</p>
    <div class="ct-share-row">
      <input class="ct-share-url" readonly value="${safeUrl}" onclick="this.select()">
    </div>
    <div class="ct-share-actions">
      <button type="button" class="ct-share-btn" onclick="event.stopPropagation();ctCopyShareLink('${tid}', ${tflag})">Copy link</button>
      <button type="button" class="ct-share-btn wa" onclick="event.stopPropagation();ctShareWhatsApp('${tid}', ${tflag})">WhatsApp</button>
      <button type="button" class="ct-share-btn" onclick="event.stopPropagation();ctNativeShare('${tid}', ${tflag})">Share</button>
    </div>
  </div>`;
}
window.ctCopyShareLink = ctCopyShareLink;
window.ctShareUrl = ctShareUrl;
window.ctShareWhatsApp = ctShareWhatsApp;
window.ctNativeShare = ctNativeShare;
window.ctToggleSubjectAll = ctToggleSubjectAll;

function ctRememberShared(test) {
  try {
    const list = ctLoadTests();
    if (!list.some((x) => x.id === test.id)) {
      list.unshift(Object.assign({ status: "notStarted", createdAt: new Date().toISOString() }, test));
      ctSaveTests(list);
    }
  } catch (_) { /* */ }
}

async function ctOpenSharedTest(token) {
  let data = null;
  try { data = JSON.parse(ctB64urlDecode(token)); } catch (_) { data = null; }
  if (!data || !Array.isArray(data.ids) || !data.ids.length) {
    showToast("⚠️ This share link is invalid or expired.");
    return ctLandingHtml(ctLoadTests());
  }
  const test = {
    id: data.id || ("ct_share_" + Date.now()),
    title: data.title || "Shared Custom Test",
    examSlug: data.examSlug || "",
    examTitle: data.examTitle || "Custom Test",
    totalQs: data.totalQs || data.ids.length,
    durationSec: data.durationSec || data.ids.length * 120,
    timed: data.timed !== false,
    modeLabel: data.modeLabel || "Custom Test",
    questionIds: data.ids,
    status: "notStarted"
  };
  ctRememberShared(test);
  setTimeout(() => {
    startTest(test.questionIds, test.title, "custom", {
      testType: "custom",
      timed: test.timed,
      durationSec: test.durationSec,
      modeLabel: test.modeLabel,
      testId: test.id,
      marksMode: true,
      organizeJee: false,
      skipInstructions: true,
      sharedTake: true,
      onComplete: ctOnCompleteHook(test.id)
    });
  }, 80);
  return `<div class="ct-landing-page"><div class="ct-wiz-generating">
    <div class="ct-spinner"></div>
    <strong>Opening shared test…</strong>
    <p style="margin-top:10px;color:#94a3b8">${String(test.title).replace(/</g, "&lt;")} · ${test.totalQs} Qs</p>
  </div></div>`;
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
          subject: sub.name,
          subjectTitle: sub.name,
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
  const subs = exam.subjects || [];
  const subj = subs[0] || null;
  const draft = {
    wizardStep: "pick",
    examId: exam._id,
    examSlug: exam.slug || "",
    examTitle: exam.title,
    examIcon: exam.icon || "",
    // Multi-subject: Set of selected subject ids (PCM / PCB etc.)
    subjectIds: new Set(subj ? [subj._id] : []),
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
    durationManual: false,
    difficulty: new Set(),
    scoringId: "4_-1"
  };
  ctApplyExamDefaults(draft, exam);
  return draft;
}

/** Ensure subjectIds Set + primary subjectId/subjectMeta stay in sync */
function ctEnsureSubjectIds(draft) {
  if (!draft) return;
  if (!(draft.subjectIds instanceof Set)) {
    draft.subjectIds = new Set();
    if (draft.subjectId) draft.subjectIds.add(draft.subjectId);
  }
}

function ctSyncPrimarySubject(draft) {
  if (!draft) return;
  ctEnsureSubjectIds(draft);
  const selected = ctSelectedSubjects(draft);
  if (!selected.length) {
    draft.subjectId = null;
    draft.subjectMeta = null;
    return;
  }
  // Keep primary if still selected; else first selected
  const keep = selected.find(s => s._id === draft.subjectId) || selected[0];
  draft.subjectId = keep._id;
  draft.subjectMeta = keep;
}

/** Subjects chosen on pick step (multi). Falls back to all exam subjects if none marked. */
function ctSelectedSubjects(draft) {
  if (!draft) return [];
  const all = ctExamSubjects(draft);
  ctEnsureSubjectIds(draft);
  if (draft.subjectIds.size) {
    return all.filter(s => draft.subjectIds.has(s._id));
  }
  if (draft.subjectId) return all.filter(s => s._id === draft.subjectId);
  return [];
}

/** Drop chapter picks that belong to a removed subject */
function ctPruneChaptersForSubjects(draft) {
  if (!draft || !(draft.chapterIds instanceof Set)) return;
  const keep = new Set();
  ctSelectedSubjects(draft).forEach(sub => {
    (sub.units || []).forEach(u => {
      (u.chapters || []).forEach(ch => {
        if (draft.chapterIds.has(ch._id)) keep.add(ch._id);
      });
    });
  });
  draft.chapterIds = keep;
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

function ctWizPayload(extra) {
  if (ctTeacherMode() || ctIsTeacherAssign()) {
    return Object.assign({ step: "wizard", teacherMode: true }, extra || {});
  }
  return Object.assign({ step: "wizard", fromTests: ctFromTests() }, extra || {});
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
  const title = (sub && (sub.title || sub.name)) || "";
  if (typeof QxCardIcons !== "undefined" && QxCardIcons.chapterIconHtml) {
    return `<span class="ct-wiz-subj-emoji">${QxCardIcons.chapterIconHtml(title, title)}</span>`;
  }
  return `<span class="ct-wiz-subj-emoji">${typeof subjectIcon === "function" ? subjectIcon(title) : ""}</span>`;
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

function ctChapterIcon(ch, subjectTitle) {
  if (!ch) return "";
  const name = ch.shortName || ch.title || ch.name || "";
  const subj = subjectTitle || ch.subject || ch.subjectTitle || "";
  if (typeof cpyqbChapterIcon === "function") {
    return cpyqbChapterIcon(ch, subj, name);
  }
  if (typeof QxCardIcons !== "undefined" && QxCardIcons.chapterIconHtml) {
    return QxCardIcons.chapterIconHtml(name, subj, ch);
  }
  return `<span class="cpyqb-ch-ic-fb">${(name || "?").slice(0, 1)}</span>`;
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
  // Prefer multi-selected subjects; fall back to full exam subject tree
  const subs = ctSelectedSubjects(draft);
  const walk = subs.length ? subs : ctExamSubjects(draft);
  walk.forEach(sub => {
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
  const subs = ctSelectedSubjects(draft);
  const subBadges = subs.map(s => {
    const sty = ctSubjectStyle(s.title);
    return `<span class="ct-wiz-prev-badge subj" style="background:${sty.bg};color:${sty.color};border-color:${sty.border}">${sty.short || s.title}</span>`;
  }).join("");
  return `<span class="ct-wiz-prev-badge exam">📝 ${exam}</span>${subBadges}`;
}

function ctWizardProgress(step) {
  const steps = [
    { id: "pick", n: "1", lab: "Exam" },
    { id: "chapters", n: "2", lab: "Chapters" },
    { id: "years", n: "3", lab: "Settings" }
  ];
  const idx = steps.findIndex(s => s.id === step);
  const pills = steps.map((s, i) => {
    const st = i < idx ? "done" : (i === idx ? "on" : "");
    return `<span class="ct-wiz-step ${st}"><i>${s.n}</i>${s.lab}</span>`;
  }).join('<span class="ct-wiz-step-line" aria-hidden="true"></span>');
  const pct = idx < 0 ? 10 : Math.round(((idx + 1) / steps.length) * 100);
  return `<div class="ct-wiz-steps">${pills}</div><div class="ct-wiz-progress"><span style="width:${pct}%"></span></div>`;
}

function ctWizardPreviewBar(draft, nextLabel, nextFn, nextDisabled) {
  const mins = Math.round((draft.durationSec || CT_DEFAULT_MINS * 60) / 60);
  return `<div class="ct-wiz-preview-bar">
    <button type="button" class="ct-wiz-back-btn" onclick="ctWizardBack()">←</button>
    <div class="ct-wiz-preview-mid">
      <small>Your test</small>
      <div class="ct-wiz-prev-badges">${ctPreviewBadges(draft)}</div>
      <div class="ct-wiz-sum-line">${ctSummaryLine(draft, mins)}</div>
      ${draft.wizardStep === "years" ? `<div class="ct-wiz-prev-stats"><span><strong>${draft.totalQs}</strong> Qs</span><span><strong>${mins}</strong> Mins</span></div>` : ""}
    </div>
    <button type="button" class="ct-wiz-next-btn ${nextDisabled ? "disabled" : ""}" ${nextDisabled ? "disabled" : ""} onclick="${nextFn}">${nextLabel}</button>
  </div>`;
}

/* qxmd312: one-line summary for the compact bottom bar (phones) */
function ctSummaryLine(draft, mins) {
  const subs = ctSelectedSubjects(draft).map(s => (ctSubjectStyle(s.title).short || s.title));
  const parts = [draft.examTitle || "Exam"];
  if (subs.length) parts.push(subs.join("+"));
  let nch = 0;
  try { nch = ctSelectedChapters(draft).length; } catch (_) { nch = (draft.chapterIds && draft.chapterIds.size) || 0; }
  if (draft.wizardStep !== "pick") parts.push(nch + " ch");
  if (draft.wizardStep === "years") { parts.push(draft.totalQs + " Qs"); parts.push(mins + " min"); }
  return parts.map(x => String(x).replace(/[<>&"]/g, "")).join(" · ");
}

const CT_DIFFS = ["Easy", "Medium", "Hard"];
const CT_SCORING = [
  { id: "4_-1", label: "+4 / \u22121", sub: "Correct +4, wrong \u22121", sc: { correct: 4, wrong: -1, unattempted: 0, numericalWrong: 0 } },
  { id: "4_0", label: "+4 / 0", sub: "No negative marking", sc: { correct: 4, wrong: 0, unattempted: 0, numericalWrong: 0 } },
  { id: "1_0", label: "+1 / 0", sub: "Count correct answers", sc: { correct: 1, wrong: 0, unattempted: 0, numericalWrong: 0 } }
];
function ctScoringFor(id) { return (CT_SCORING.find(x => x.id === id) || CT_SCORING[0]); }
function ctNormDiff(d) {
  const t = String(d || "").trim().toLowerCase();
  if (/^e/.test(t)) return "Easy";
  if (/^m/.test(t)) return "Medium";
  if (/^h|^d/.test(t)) return "Hard";
  return "";
}
function ctToggleDiff(d) {
  if (!_ctDraft) return;
  if (!(_ctDraft.difficulty instanceof Set)) _ctDraft.difficulty = new Set();
  if (d === "all") _ctDraft.difficulty.clear();
  else if (_ctDraft.difficulty.has(d)) _ctDraft.difficulty.delete(d);
  else _ctDraft.difficulty.add(d);
  if (_ctDraft.difficulty.size === CT_DIFFS.length) _ctDraft.difficulty.clear();
  ctRender(ctWizPayload());
}
function ctSetScoring(id) {
  if (!_ctDraft) return;
  _ctDraft.scoringId = ctScoringFor(id).id;
  ctRender(ctWizPayload());
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
  ctEnsureSubjectIds(draft);
  const subCards = (exam && exam.subjects || []).map(s => {
    const on = draft.subjectIds.has(s._id);
    const sty = ctSubjectStyle(s.title);
    return `<button type="button" class="ct-wiz-card subj multi ${on ? "on" : ""}" style="--ct-card-c:${sty.color}" onclick="ctPickSubject('${s._id}')" aria-pressed="${on ? "true" : "false"}">
      <span class="ct-wiz-subj-check" aria-hidden="true">${on ? "✓" : ""}</span>
      ${ctSubjectIcon(s)}
      <strong>${s.title}</strong>
    </button>`;
  }).join("");

  const selCount = draft.subjectIds ? draft.subjectIds.size : 0;
  const canNext = draft.examId && selCount > 0;
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
      <h4>Subjects <span class="ct-wiz-multi-hint">select one or more · PCM / PCB</span></h4>
      <p class="ct-wiz-multi-tip">Tap multiple subjects (e.g. Physics + Chemistry + Maths). Selected: <strong>${selCount}</strong></p>
      <div class="ct-wiz-subj-grid ct-wiz-subj-grid-multi">${subCards}</div>
      ${selCount > 1 ? `<div class="ct-wiz-multi-actions">
        <button type="button" class="ct-wiz-link-btn" onclick="ctSelectAllSubjects()">Select all subjects</button>
        <button type="button" class="ct-wiz-link-btn" onclick="ctClearSubjects()">Clear</button>
      </div>` : `<div class="ct-wiz-multi-actions">
        <button type="button" class="ct-wiz-link-btn" onclick="ctSelectAllSubjects()">Select all subjects</button>
      </div>`}
    </section>
    ${ctWizardPreviewBar(draft, "Next", "ctGoChapters()", !canNext)}
  </div>`;
}

function ctChaptersStepHtml(draft) {
  // Only subjects chosen on pick step (multi-select)
  const subjects = ctSelectedSubjects(draft);
  if (!subjects.length) {
    return `<div class="empty">Select at least one subject first. <button type="button" class="btn-soft" onclick="ctWizardBack()">← Back</button></div>`;
  }
  // If units panel subject not in selection, open first selected
  if (!subjects.some(s => s._id === draft.unitsSubjectId)) {
    draft.unitsSubjectId = subjects[0]._id;
  }
  const unitsSub = subjects.find(s => s._id === draft.unitsSubjectId) || subjects[0];
  if (!unitsSub) return `<div class="empty">Select a subject</div>`;
  const sel = ctSelectedChapters(draft).length;
  const showingUnits = !!draft.unitsSubjectId;

  const subjectRows = subjects.map(s => {
    const cnt = ctSubjectCount(s);
    const selInSub = (s.units || []).reduce((n, u) => n + (u.chapters || []).filter(ch => draft.chapterIds.has(ch._id)).length, 0);
    const sty = ctSubjectStyle(s.title);
    return `<div class="ct-wiz-subj-block open" data-ct-sub="${s._id}" style="--ct-card-c:${sty.color}">
      <div class="ct-wiz-subj-row">
        <div class="ct-wiz-subj-row-main">
          ${ctSubjectIcon(s)}
          <div><strong>${s.title}</strong><small>${cnt.units} Units, ${cnt.chapters} Chapters${selInSub ? ` · ${selInSub} selected` : ""}</small></div>
        </div>
        <div class="ct-wiz-subj-row-actions">
          <button type="button" class="ct-wiz-link-btn" onclick="event.stopPropagation();ctToggleSubjectAll('${s._id}')">Select all</button>
          <button type="button" class="ct-wiz-show-units" onclick="document.getElementById('ctFold_${s._id}')&&document.getElementById('ctFold_${s._id}').scrollIntoView({behavior:'smooth',block:'start'})">VIEW FOLDERS</button>
        </div>
      </div>
    </div>`;
  }).join("");

  function ctFolderCardHtml(ch, delay, subjectTitle) {
    const on = draft.chapterIds.has(ch._id);
    const name = ch.shortName || ch.title || "";
    const g = ["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7"][Math.abs(String(name).length + String(ch._id || "").length) % 8];
    return `<label class="qx-topic-card qx-topic-rich qx-topic-${g} ch-card qx-ch-card-rich ct-wiz-ch-card ct-folder ${on ? "on" : ""}" data-ct-ch="${ch._id}" style="animation-delay:${delay}ms">
      <input type="checkbox" class="ct-wiz-ch-check" ${on ? "checked" : ""} onchange="ctToggleChapter('${ch._id}', this.checked)">
      <div class="qx-topic-top qx-ch-card-top">
        <span class="qx-topic-ic cpyqb-ch-ic" aria-hidden="true">${ctChapterIcon(ch, subjectTitle)}</span>
      </div>
      <strong class="qx-topic-name">${name}</strong>
      <div class="qx-topic-details">
        <span class="qx-ch-pill">${on ? "Selected" : "Tap to add"}</span>
      </div>
    </label>`;
  }

  let delay = 0;
  const allFolders = subjects.map(s => {
    const unitsHtml = (s.units || []).map(unit => {
      const chapters = (unit.chapters || []).filter(ch => {
        if (draft.hideOutOfSyllabus && ch.syllabusCategory === "outOfSyllabus") return false;
        return true;
      });
      if (!chapters.length) return "";
      const unitSel = chapters.filter(ch => draft.chapterIds.has(ch._id)).length;
      const expanded = !draft.expandedUnits || draft.expandedUnits.size === 0 || draft.expandedUnits.has(unit._id);
      const cards = chapters.map(ch => {
        delay += 18;
        return ctFolderCardHtml(ch, delay, s.title);
      }).join("");
      return `<div class="ct-wiz-unit ${expanded ? "expanded" : "collapsed"}" data-ct-unit="${unit._id}">
        <div class="ct-wiz-unit-head" onclick="ctToggleUnitExpand('${unit._id}')">
          <span class="ct-wiz-unit-chev">${expanded ? "▾" : "▸"}</span>
          <strong>${unit.title}</strong>
          <small>${unitSel}/${chapters.length} selected</small>
          <button type="button" class="ct-wiz-unit-all" onclick="event.stopPropagation();ctToggleUnitAll('${s._id}','${unit._id}')">${unitSel === chapters.length ? "Clear unit" : "Select unit"}</button>
        </div>
        <div class="ct-wiz-ch-grid ct-wiz-folder-grid qx-topic-grid qx-topic-grid-rich">${cards}</div>
      </div>`;
    }).join("");
    return `<section class="ct-wiz-folder-sub" id="ctFold_${s._id}">
      <div class="ct-wiz-right-head"><strong>${s.title}</strong><small>Chapter folders · same icons as Chapter-wise PYQ</small></div>
      ${unitsHtml || '<div class="empty">No chapters in this subject.</div>'}
    </section>`;
  }).join("");

  const right = `<div class="ct-wizard-right-inner">${allFolders || '<div class="empty">Select a subject to see folders.</div>'}</div>`;

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
  const chapters = ctSelectedChapters(draft);
  const subjects = ctSelectedSubjects(draft);
  const presetLabels = { all: "All Years", last3: "Last 3 Years", last5: "Last 5 Years", last10: "Last 10 Years", custom: "Custom Years" };
  const chNames = chapters.slice(0, 12).map(c => c.title || c.shortName || "Chapter").join(" · ");
  const extra = chapters.length > 12 ? ` +${chapters.length - 12} more` : "";
  const subjLine = subjects.map(s => s.title).filter(Boolean).join(" · ") || "—";
  return `<div class="ct-wizard-split ct-wizard-years-split">
    <div class="ct-wizard-left-panel">
    <div class="ct-wizard-left-inner ct-wizard-years">
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
      <h4 style="margin-top:14px">Difficulty</h4>
      <div class="ct-wiz-set-chips ct-wiz-diff-chips">${(() => {
        const ds = draft.difficulty instanceof Set ? draft.difficulty : new Set();
        return `<button type="button" class="ct-wiz-set-chip ${ds.size ? "" : "on"}" onclick="ctToggleDiff('all')">All</button>` +
          CT_DIFFS.map(d => `<button type="button" class="ct-wiz-set-chip ${ds.has(d) ? "on" : ""}" aria-pressed="${ds.has(d) ? "true" : "false"}" onclick="ctToggleDiff('${d}')">${d}</button>`).join("");
      })()}</div>
      <h4 style="margin-top:14px">Marking scheme</h4>
      <div class="ct-wiz-set-chips ct-wiz-mark-chips">${CT_SCORING.map(m => `<button type="button" class="ct-wiz-set-chip ${(draft.scoringId || "4_-1") === m.id ? "on" : ""}" title="${m.sub}" onclick="ctSetScoring('${m.id}')">${m.label}</button>`).join("")}</div>
      <p class="ct-wiz-est-time">${ctScoringFor(draft.scoringId).sub}${draft.difficulty instanceof Set && draft.difficulty.size ? " · " + [...draft.difficulty].join(" + ") + " only" : " · all difficulty levels"}</p>
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
    </div>
    </div>
    <div class="ct-wizard-right-inner ct-wiz-years-summary">
      <div class="ct-wiz-right-head">
        <strong>Test settings</strong>
        <small>Review, then tap Generate Test</small>
      </div>
      <div class="ct-wiz-sum-card"><small>Exam</small><strong>${draft.examTitle || "Exam"}</strong></div>
      <div class="ct-wiz-sum-card"><small>Subjects</small><strong>${subjLine}</strong></div>
      <div class="ct-wiz-sum-card"><small>Chapters</small><strong>${chapters.length} selected</strong><p>${chNames || "—"}${extra}</p></div>
      <div class="ct-wiz-sum-card"><small>Paper</small><strong>${draft.totalQs} questions · ${mins} min</strong></div>
      <div class="ct-wiz-sum-card"><small>Years</small><strong>${presetLabels[draft.yearPreset] || "All Years"}</strong></div>
      <div class="ct-wiz-sum-card"><small>Difficulty · Marking</small><strong>${draft.difficulty instanceof Set && draft.difficulty.size ? [...draft.difficulty].join(" + ") : "All levels"} · ${ctScoringFor(draft.scoringId).label}</strong></div>
    </div>
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
    return `<div class="ct-wizard-overlay"><div class="ct-wizard-shell wide">${ctYearsStepHtml(_ctDraft)}</div></div>`;
  }
  if (_ctDraft.wizardStep === "generating") {
    return `<div class="ct-wizard-overlay"><div class="ct-wizard-shell"><div class="ct-wiz-generating">
      <div class="ct-spinner"></div>
      <strong>Generating your custom test. Please wait…</strong>
    </div></div></div>`;
  }
  try { _ctDraft.wizardStep = "pick"; } catch (_) { /* */ }
  return `<div class="ct-wizard-overlay"><div class="ct-wizard-shell">${ctPickStepHtml(_ctDraft, exams)}</div></div>`;
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
      <div class="ct-landing-share">
        <button type="button" class="ct-share-btn" onclick="event.stopPropagation();ctCopyShareLink('${t.id}', ${teacher ? "true" : "false"})">Copy</button>
        <button type="button" class="ct-share-btn wa" onclick="event.stopPropagation();ctShareWhatsApp('${t.id}', ${teacher ? "true" : "false"})">WhatsApp</button>
        <button type="button" class="ct-share-btn" onclick="event.stopPropagation();ctNativeShare('${t.id}', ${teacher ? "true" : "false"})">Share</button>
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

  const shareRow = ctShareButtonsHtml(test, teacher);
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
          <div class="marks-preview-stat"><strong>${test.scoring ? ctScoringFor(test.scoringId).label : "+4 / \u22121"}</strong><small>Marking</small></div>
        </div>
        ${test.difficulty && test.difficulty.length ? `<p class="ct-preview-years"><strong>Difficulty</strong><br>${test.difficulty.join(" + ")}</p>` : ""}
        ${yearLines ? `<p class="ct-preview-years"><strong>Previous year (${yearMeta})</strong><br>${yearLines}</p>` : ""}
        ${sub ? `<p class="ct-preview-subj"><strong>${sub}</strong><br>${chList}</p>` : (chList ? `<p class="marks-preview-chapters">${chList}</p>` : "")}
        ${shareRow}
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
  // Shared link: do not wait on exam lists, and do not require a signed-in account.
  if (p.step === "take" && p.share) {
    return ctOpenSharedTest(p.share);
  }
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
  ctRender(ctWizPayload());
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
  const subs = exam.subjects || [];
  const sub = subs[0] || null;
  // Reset multi-subject selection for new exam (pre-select first for UX)
  _ctDraft.subjectIds = new Set(sub ? [sub._id] : []);
  _ctDraft.subjectId = sub ? sub._id : null;
  _ctDraft.subjectMeta = sub || null;
  _ctDraft.unitsSubjectId = sub ? sub._id : null;
  _ctDraft.chapterIds = new Set();
  _ctYearShiftsCache = null;
  ctRender(ctWizPayload());
}

/** Toggle subject on/off — multi-select (Physics + Chemistry + Maths …) */
function ctPickSubject(id) {
  if (!_ctDraft) return;
  const exam = (_ctExamsCache || []).find(e => e._id === _ctDraft.examId);
  const sub = exam && (exam.subjects || []).find(s => s._id === id);
  if (!sub) return;
  ctEnsureSubjectIds(_ctDraft);
  if (_ctDraft.subjectIds.has(id)) {
    // Keep at least one subject selected when possible
    if (_ctDraft.subjectIds.size <= 1) {
      // Allow deselect all so user can re-pick — Next stays disabled
      _ctDraft.subjectIds.delete(id);
    } else {
      _ctDraft.subjectIds.delete(id);
    }
  } else {
    _ctDraft.subjectIds.add(id);
  }
  ctSyncPrimarySubject(_ctDraft);
  ctPruneChaptersForSubjects(_ctDraft);
  // Keep units panel on a still-selected subject
  if (_ctDraft.unitsSubjectId && !_ctDraft.subjectIds.has(_ctDraft.unitsSubjectId)) {
    _ctDraft.unitsSubjectId = _ctDraft.subjectId;
  }
  ctRender(ctWizPayload());
}

function ctSelectAllSubjects() {
  if (!_ctDraft) return;
  const all = ctExamSubjects(_ctDraft);
  _ctDraft.subjectIds = new Set(all.map(s => s._id));
  ctSyncPrimarySubject(_ctDraft);
  ctRender(ctWizPayload());
}

function ctClearSubjects() {
  if (!_ctDraft) return;
  _ctDraft.subjectIds = new Set();
  _ctDraft.subjectId = null;
  _ctDraft.subjectMeta = null;
  _ctDraft.chapterIds = new Set();
  _ctDraft.unitsSubjectId = null;
  ctRender(ctWizPayload());
}

function ctGoChapters() {
  if (!_ctDraft) return;
  ctEnsureSubjectIds(_ctDraft);
  ctSyncPrimarySubject(_ctDraft);
  const selected = ctSelectedSubjects(_ctDraft);
  if (!selected.length) {
    showToast("⚠️ Select at least one subject");
    return;
  }
  _ctDraft.wizardStep = "chapters";
  _ctDraft.unitsSubjectId = selected[0]._id;
  if (!_ctDraft.expandedUnits) _ctDraft.expandedUnits = new Set();
  // Expand units for all selected subjects so multi-subject chapter pick is ready
  selected.forEach(sub => {
    (sub.units || []).forEach(u => _ctDraft.expandedUnits.add(u._id));
  });
  ctRender(ctWizPayload());
}

async function ctGoYears() {
  if (!ctSelectedChapters(_ctDraft).length) {
    showToast("⚠️ Select at least one chapter");
    return;
  }
  _ctDraft.wizardStep = "years";
  ctSyncDuration(_ctDraft);
  ctRender(ctWizPayload());
  _ctYearShiftsCache = null;
  await ctBuildYearShifts(true);
  if (_ctDraft && _ctDraft.wizardStep === "years") ctRender(ctWizPayload());
}

function ctSetSyllabus(hideOut) {
  if (!_ctDraft) return;
  _ctDraft.hideOutOfSyllabus = hideOut;
  ctRender(ctWizPayload());
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
  ctRender(ctWizPayload());
}

function ctPaintChapterCard(chId, on) {
  const card = document.querySelector('[data-ct-ch="' + chId + '"]');
  if (!card) return;
  card.classList.toggle("on", !!on);
  const inp = card.querySelector("input.ct-wiz-ch-check");
  if (inp) inp.checked = !!on;
  const pill = card.querySelector(".qx-ch-pill");
  if (pill) pill.textContent = on ? "Selected" : "Tap to add";
}

function ctRefreshChapterChrome() {
  if (!_ctDraft) return;
  const sel = ctSelectedChapters(_ctDraft).length;
  const countEl = document.querySelector(".ct-wiz-sel-count");
  if (countEl) countEl.textContent = sel + " chapter" + (sel !== 1 ? "s" : "") + " selected";
  const sumEl = document.querySelector(".ct-wiz-sum-line");
  if (sumEl) sumEl.textContent = ctSummaryLine(_ctDraft, Math.round((_ctDraft.durationSec || CT_DEFAULT_MINS * 60) / 60));
  const next = document.querySelector(".ct-wiz-next-btn");
  if (next) {
    next.disabled = !sel;
    next.classList.toggle("disabled", !sel);
  }
  ctSelectedSubjects(_ctDraft).forEach(sub => {
    let selInSub = 0;
    (sub.units || []).forEach(unit => {
      const visible = (unit.chapters || []).filter(ch => {
        if (_ctDraft.hideOutOfSyllabus && ch.syllabusCategory === "outOfSyllabus") return false;
        return true;
      });
      const n = visible.filter(ch => _ctDraft.chapterIds.has(ch._id)).length;
      selInSub += n;
      const unitEl = document.querySelector('[data-ct-unit="' + unit._id + '"]');
      if (!unitEl) return;
      const sm = unitEl.querySelector(".ct-wiz-unit-head small");
      if (sm) sm.textContent = n + "/" + visible.length + " selected";
      const btn = unitEl.querySelector(".ct-wiz-unit-all");
      if (btn) btn.textContent = (visible.length && n === visible.length) ? "Clear unit" : "Select unit";
    });
    const block = document.querySelector('[data-ct-sub="' + sub._id + '"] small');
    if (block) {
      const cnt = ctSubjectCount(sub);
      block.textContent = cnt.units + " Units, " + cnt.chapters + " Chapters" + (selInSub ? (" · " + selInSub + " selected") : "");
    }
  });
}

function ctToggleUnitExpand(unitId) {
  if (!_ctDraft) return;
  if (!_ctDraft.expandedUnits) _ctDraft.expandedUnits = new Set();
  const el = document.querySelector('[data-ct-unit="' + unitId + '"]');
  const open = _ctDraft.expandedUnits.has(unitId);
  if (open) _ctDraft.expandedUnits.delete(unitId);
  else _ctDraft.expandedUnits.add(unitId);
  if (el) {
    el.classList.toggle("expanded", !open);
    el.classList.toggle("collapsed", open);
    const chev = el.querySelector(".ct-wiz-unit-chev");
    if (chev) chev.textContent = open ? "▸" : "▾";
  }
}

function ctSetTotalQs(n) {
  if (!_ctDraft) return;
  _ctDraft.totalQs = n;
  _ctDraft.durationManual = false;
  ctSyncDuration(_ctDraft);
  ctRender(ctWizPayload());
}

function ctSetTimePerQ(sec) {
  if (!_ctDraft) return;
  _ctDraft.timePerQ = sec;
  _ctDraft.durationManual = false;
  ctSyncDuration(_ctDraft);
  ctRender(ctWizPayload());
}

function ctSetDurationMins(mins) {
  if (!_ctDraft) return;
  const m = Math.max(1, Math.min(600, Math.round(Number(mins) || 0)));
  _ctDraft.durationSec = m * 60;
  _ctDraft.durationManual = true;
  ctRender(ctWizPayload());
}

function ctBumpDuration(mins) {
  if (!_ctDraft) return;
  const add = Math.max(1, Math.round(Number(mins) || 0));
  _ctDraft.durationSec = Math.max(60, (_ctDraft.durationSec || CT_DEFAULT_MINS * 60) + add * 60);
  _ctDraft.durationManual = true;
  ctRender(ctWizPayload());
}

function ctToggleChapter(chId, checked) {
  if (!_ctDraft) return;
  if (checked) _ctDraft.chapterIds.add(chId);
  else _ctDraft.chapterIds.delete(chId);
  ctPaintChapterCard(chId, checked);
  ctRefreshChapterChrome();
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
  const allOn = visible.length > 0 && visible.every(ch => _ctDraft.chapterIds.has(ch._id));
  visible.forEach(ch => {
    if (allOn) _ctDraft.chapterIds.delete(ch._id);
    else _ctDraft.chapterIds.add(ch._id);
    ctPaintChapterCard(ch._id, !allOn);
  });
  ctRefreshChapterChrome();
}

function ctToggleSubjectAll(subjectId) {
  if (!_ctDraft) return;
  const sub = ctExamSubjects(_ctDraft).find(s => s._id === subjectId);
  if (!sub) return;
  const visible = [];
  (sub.units || []).forEach(u => {
    (u.chapters || []).forEach(ch => {
      if (_ctDraft.hideOutOfSyllabus && ch.syllabusCategory === "outOfSyllabus") return;
      visible.push(ch);
    });
  });
  const allOn = visible.length > 0 && visible.every(ch => _ctDraft.chapterIds.has(ch._id));
  visible.forEach(ch => {
    if (allOn) _ctDraft.chapterIds.delete(ch._id);
    else _ctDraft.chapterIds.add(ch._id);
    ctPaintChapterCard(ch._id, !allOn);
  });
  ctRefreshChapterChrome();
}

function ctSetYearPreset(preset) {
  if (!_ctDraft) return;
  _ctDraft.yearPreset = preset;
  if (preset !== "custom") _ctDraft.customSources = new Set();
  ctRender(ctWizPayload());
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
  ctRender(ctWizPayload());
}

function ctAutoTitle(draft, chapters) {
  const subjShort = { Physics: "P", Chemistry: "C", Mathematics: "M", Biology: "B", Botany: "Bo", Zoology: "Z", English: "E", "General Ability": "GA" };
  const subs = ctSelectedSubjects(draft);
  let prefix;
  if (subs.length > 1) {
    // PCM / PCB style
    prefix = subs.map(s => subjShort[s.title] || (s.title || "?").charAt(0)).join("");
  } else {
    prefix = subjShort[subs[0]?.title || draft.subjectMeta?.title] || "T";
  }
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

async function ctLoadChapterPool(draft, chapters) {
  const banks = ctBanksForYears(draft);
  const seen = new Set();
  const pool = [];
  function take(q) {
    if (!q || q.id == null) return;
    const id = String(q.id);
    if (seen.has(id)) return;
    seen.add(id);
    pool.push(q);
  }
  for (const ch of chapters) {
    const subj = ch.subjectTitle || (draft.subjectMeta && draft.subjectMeta.title) || "";
    const names = [ch.title, ch.shortName].filter(Boolean);
    for (const bank of banks) {
      for (const name of names) {
        try {
          if (typeof loadChapterBank === "function") {
            const rows = await loadChapterBank(bank, subj, name);
            (rows || []).forEach(take);
          }
        } catch (_) { /* skip missing shard */ }
        try {
          if (typeof ensureCpyqbChapterQuestions === "function") {
            const rows = await ensureCpyqbChapterQuestions(bank, subj, name, null, { mode: "all" });
            (rows || []).forEach(take);
          }
        } catch (_) { /* */ }
      }
    }
  }
  const allQ = (typeof QUESTIONS !== "undefined" && Array.isArray(QUESTIONS)) ? QUESTIONS : (window.QUESTIONS || []);
  allQ.forEach(function (q) {
    try {
      if (ctMatchQuestion(q, chapters, draft)) take(q);
    } catch (_) { /* */ }
  });
  return pool;
}

async function ctGenerateTest() {
  try {
    if (window._ctGenLock && Date.now() - window._ctGenLock < 1200) return;
    window._ctGenLock = Date.now();
    if (!_ctDraft) {
      if (typeof showToast === "function") showToast("⚠️ Start Create Own Test again");
      return;
    }
    const teacherGen = ctTeacherMode() || ctIsTeacherAssign();
    if (!teacherGen && ctDailyCount() >= CT_DAILY_LIMIT) {
      showToast("⚠️ Daily limit reached (25 tests). Try tomorrow.");
      return;
    }
    if (!(_ctDraft.chapterIds instanceof Set)) {
      _ctDraft.chapterIds = new Set(Array.isArray(_ctDraft.chapterIds) ? _ctDraft.chapterIds : []);
    }
    const chapters = ctSelectedChapters(_ctDraft);
    if (!chapters.length) {
      showToast("⚠️ Select at least one chapter");
      _ctDraft.wizardStep = "chapters";
      ctRender(ctWizPayload());
      return;
    }

    _ctDraft.wizardStep = "generating";
    ctRender(ctWizPayload());

    let pool = [];
    try {
      pool = await ctLoadChapterPool(_ctDraft, chapters);
    } catch (loadErr) {
      console.warn("ctGenerateTest load", loadErr);
      pool = [];
    }

    let filtered = pool.filter(q => {
      try { return ctYearFilterOk(q && q.source, _ctDraft); } catch (_) { return true; }
    });
    if (_ctDraft.hideOutOfSyllabus) {
      const trimmed = filtered.filter(q => q && q._syllabusCategory !== "outOfSyllabus");
      if (trimmed.length) filtered = trimmed;
    }
    if (!filtered.length) filtered = pool.slice();
    if (!filtered.length) {
      showToast("⚠️ No questions found. Try more chapters or different years.");
      _ctDraft.wizardStep = "years";
      ctRender(ctWizPayload());
      return;
    }
    /* qxmd312: difficulty filter uses each question's own difficulty tag; never guessed */
    const diffSel = _ctDraft.difficulty instanceof Set ? _ctDraft.difficulty : new Set();
    if (diffSel.size) {
      const byDiff = filtered.filter(q => diffSel.has(ctNormDiff(q && q.difficulty)));
      if (!byDiff.length) {
        showToast("⚠️ No " + [...diffSel].join(" / ") + " questions in these chapters. Choose another level.");
        _ctDraft.wizardStep = "years";
        ctRender(ctWizPayload());
        return;
      }
      if (byDiff.length < (_ctDraft.totalQs || 0) && typeof showToast === "function") {
        showToast("Only " + byDiff.length + " " + [...diffSel].join(" / ") + " questions available. Test uses all of them.");
      }
      filtered = byDiff;
    }

    await new Promise(r => setTimeout(r, 400));

    const shuffled = filtered.sort(() => Math.random() - 0.5);
    const take = Math.min(_ctDraft.totalQs || shuffled.length, shuffled.length);
    const ids = shuffled.slice(0, take).map(q => q.id);
    const title = ctAutoTitle(_ctDraft, chapters);
    const testId = "ct_" + Date.now();
    const yearLabels = ctYearLabelsForDraft(_ctDraft);
    const presetLabels = { all: "All Years", last3: "Last 3 Years", last5: "Last 5 Years", last10: "Last 10 Years", custom: "Custom Years" };

    const subjectTitles = [...new Set(
      ctSelectedSubjects(_ctDraft).map(s => s.title).concat(
        chapters.map(c => c.subjectTitle).filter(Boolean)
      )
    )];
    const record = {
      id: testId,
      title,
      examTitle: _ctDraft.examTitle,
      examSlug: _ctDraft.examSlug || "",
      subjectTitle: subjectTitles.join(" · ") || _ctDraft.subjectMeta?.title,
      subjectTitles,
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
      yearLabels,
      difficulty: [...diffSel],
      scoringId: ctScoringFor(_ctDraft.scoringId).id,
      scoring: Object.assign({}, ctScoringFor(_ctDraft.scoringId).sc)
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
  } catch (err) {
    console.error("ctGenerateTest", err);
    try {
      if (_ctDraft) {
        _ctDraft.wizardStep = "years";
        ctRender(ctWizPayload());
      }
    } catch (_) { /* */ }
    if (typeof showToast === "function") showToast("⚠️ Could not generate test. Try again.");
  }
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
  var ui = "examgoal";
  var fmt = "quantrex";
  if (t.timed) {
    ui = "quizrr";
    fmt = "nta";
    try {
      var pref = localStorage.getItem("qx_cbt_format_pref") || localStorage.getItem("ts_last_ui_mode") || "";
      if (pref === "quantrex" || pref === "examgoal") {
        ui = "examgoal";
        fmt = "quantrex";
      }
    } catch (_) { /* */ }
  }
  startTest(t.questionIds, t.title, "custom", {
    testType: "custom",
    timed: t.timed,
    durationSec: t.durationSec,
    modeLabel: t.modeLabel,
    testId: t.id,
    marksMode: true,
    organizeJee: false,
    scoring: t.scoring || undefined,
    practiceMode: !t.timed,
    uiMode: ui,
    _qxFormat: fmt,
    onComplete: ctOnCompleteHook(t.id)
  });
}

function ctResetWizard() {
  _ctDraft = null;
  _ctPayload = { step: "landing" };
}

window.ctToggleSubjectAll = ctToggleSubjectAll;
window.ctCopyShareLink = ctCopyShareLink;
window.ctShareUrl = ctShareUrl;
window.ctShareWhatsApp = ctShareWhatsApp;
window.ctNativeShare = ctNativeShare;
window.ctGenerateTest = ctGenerateTest;
window.ctAttemptTest = ctAttemptTest;
window.ctShowPreview = ctShowPreview;
window.ctClosePreview = ctClosePreview;
window.ctWizardBack = ctWizardBack;