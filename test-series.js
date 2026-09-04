// JEE Main Test Series 2027 — Inter-Marks style (screenshots 427/428)

const TS_EXAMGOAL_SERIES = "jee_main_examgoal_2027";
const TS_SERIES_PATHS = {
  jee_main_examgoal_2027: "data/tests/jee_main_examgoal_2027",
  jeemain: "data/tests/jee_main_examgoal_2027",
  // Free chapter-wise PYQ (Quizrr pack on disk — never the missing legacy folder)
  jee_main_pyq_chapter: "data/tests/jee_main_quizrr_pyq_chapter",
  jee_main_quizrr_pyq_chapter: "data/tests/jee_main_quizrr_pyq_chapter"
};

const TS_CFG = (typeof window !== "undefined" && window.TS_CFG) || {
  seriesId: TS_EXAMGOAL_SERIES,
  dataRoot: TS_SERIES_PATHS[TS_EXAMGOAL_SERIES],
  attemptStore: "quantrex_examgoal_attempts_v1",
  notifyStore: "quantrex_examgoal_notify_v1",
  provider: "examgoal"
};
const TS_ATTEMPT_STORE = TS_CFG.attemptStore || "quantrex_examgoal_attempts_v1";
const TS_NOTIFY_STORE = TS_CFG.notifyStore || "quantrex_examgoal_notify_v1";
const TS_SERIES_ID = TS_CFG.seriesId || TS_EXAMGOAL_SERIES;

function tsDataRoot(seriesId) {
  const sid = seriesId || TS_SERIES_ID;
  if (TS_SERIES_PATHS[sid]) return TS_SERIES_PATHS[sid];
  if (!seriesId && TS_CFG.dataRoot) return TS_CFG.dataRoot;
  if (sid.includes("examgoal") || sid === "jeemain") return `data/tests/${sid}`;
  return `data/tests/${sid}`;
}

/** Resolve data root for a test/category that may live in linked series (Quizrr PYQ). */
function tsRootForMeta(meta) {
  const rootId = (meta && (meta.seriesRoot || meta.seriesId)) || null;
  if (rootId && TS_SERIES_PATHS[rootId]) return TS_SERIES_PATHS[rootId];
  return tsDataRoot(_tsPayload.folder || TS_SERIES_ID);
}

let _tsPayload = { seriesId: TS_SERIES_ID };
let _tsManifest = null;
let _tsCategoryCache = {};
let _tsPage = "home";
let _tsNav = "test";
let _tsDashTab = "attempted";
let _tsSearch = "";
let _tsSort = "default";
let _tsFilter = { testType: "All Tests", subject: "Overall", dateRange: "All Dates", statusTab: TS_CFG.provider === "examgoal" ? "all" : "available" };

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
  const fix = s => String(s)
    .replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/")
    .replace(/\/fly\/@width\//gi, "/fly/640/")
    .replace(/@width/g, "640");
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
      const res = await fetch(`${tsDataRoot(TS_SERIES_ID)}/question_meta.json?v=${v}`);
      if (res.ok) window._tsQuestionMeta = await res.json();
      else window._tsQuestionMeta = {};
    } catch (e) { window._tsQuestionMeta = {}; }
    return window._tsQuestionMeta;
  })();
  return _tsMetaLoading;
}

const _tsInstrMetaCache = {};

async function tsFetchInstructionMeta(seriesId, testId, metaHint) {
  if (!testId) return null;
  const key = (seriesId || TS_SERIES_ID) + "::" + testId;
  if (_tsInstrMetaCache[key]) return _tsInstrMetaCache[key];
  try {
    const v = typeof QX_BUILD !== "undefined" ? QX_BUILD : Date.now();
    const roots = [];
    const primary = tsRootForMeta(metaHint || { seriesRoot: seriesId });
    roots.push(primary);
    // also try examgoal + quizrr pyq folders
    ["jee_main_examgoal_2027", "jee_main_quizrr_pyq_chapter"].forEach(id => {
      const r = TS_SERIES_PATHS[id];
      if (r && !roots.includes(r)) roots.push(r);
    });
    for (const root of roots) {
      try {
        const res = await fetch(`${root}/instruction_meta/${testId}.json?v=${v}`);
        if (!res.ok) continue;
        const meta = tsBrandInstructionMeta(await res.json());
        _tsInstrMetaCache[key] = meta;
        return meta;
      } catch (_) { /* try next */ }
    }
    return null;
  } catch (e) { return null; }
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

function tsPeekAttr(testId) {
  const sid = tsEscHtml((_tsPayload && (_tsPayload.folder || _tsPayload.seriesId)) || TS_SERIES_ID || "jee_main_examgoal_2027");
  const id = tsEscHtml(testId || "");
  if (!id) return "";
  return ` data-qx-peek="test" data-qx-series="${sid}" data-qx-paper="${id}"`;
}

function tsPaintLocks() {
  try {
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.paintLocks) {
      QuantrexAccess.paintLocks(document.getElementById("ts-root") || document);
    }
  } catch (_) { /* */ }
}

function tsQuantrexBrand(s) {
  if (!s || TS_CFG.provider !== "examgoal") return s;
  return String(s)
    .replace(/ExamGOAL|ExamGoal|Examgoal/g, "Quantrex")
    .replace(/\s*·?\s*Brand Coaching Style/gi, "")
    .replace(/Allen[- ]style\s*CBT/gi, "CBT")
    .replace(/NTA-style\s+Allen\s+CBT/gi, "NTA-style CBT")
    .trim();
}

function tsBrandManifest(m) {
  if (!m || TS_CFG.provider !== "examgoal") return m;
  const out = { ...m };
  if (out.subtitle) out.subtitle = tsQuantrexBrand(out.subtitle);
  if (out.tagline) out.tagline = tsQuantrexBrand(out.tagline);
  if (out.sections) out.sections = out.sections.map(tsQuantrexBrand);
  if (out.categories) {
    out.categories = out.categories.map(c => ({ ...c, section: tsQuantrexBrand(c.section) }));
  }
  if (out.tests) {
    out.tests = out.tests.map(t => ({
      ...t,
      title: tsQuantrexBrand(t.title),
      shortTitle: t.shortTitle ? tsQuantrexBrand(t.shortTitle) : t.shortTitle,
      subtitle: t.subtitle ? tsQuantrexBrand(t.subtitle) : t.subtitle
    }));
  }
  return out;
}

function tsBrandCategoryData(data) {
  if (!data || TS_CFG.provider !== "examgoal") return data;
  const out = { ...data };
  if (out.category) {
    out.category = { ...out.category, section: tsQuantrexBrand(out.category.section) };
  }
  if (out.tests) {
    out.tests = out.tests.map(t => ({
      ...t,
      title: tsQuantrexBrand(t.title),
      shortTitle: t.shortTitle ? tsQuantrexBrand(t.shortTitle) : t.shortTitle,
      subtitle: t.subtitle ? tsQuantrexBrand(t.subtitle) : t.subtitle,
      chapter: tsQuantrexBrand(t.chapter),
      chapterGroup: tsQuantrexBrand(t.chapterGroup),
      topicSection: tsQuantrexBrand(t.topicSection)
    }));
  }
  return out;
}

function tsBrandInstructionMeta(meta) {
  if (!meta || TS_CFG.provider !== "examgoal") return meta;
  return { ...meta, title: tsQuantrexBrand(meta.title) };
}

const TS_ICON_NAV = [
  { id: "test", label: "Test", icon: "📝" },
  { id: "solution", label: "Solution", icon: "💡" },
  { id: "about", label: "About", icon: "ℹ️" },
  { id: "resources", label: "Resources", icon: "📚" }
];

if (typeof go !== "function") {
  window.go = function goStandalone(view) {
    document.body.classList.remove("marks-results-active", "marks-test-active", "marks-instr-active", "allen-cbt-active");
    const tsRoot = document.getElementById("ts-root");
    if (tsRoot) tsRoot.style.display = "";
    const mount = typeof getTestMountEl === "function" ? getTestMountEl() : document.getElementById("app-main");
    if (mount) {
      mount.innerHTML = "";
      if (typeof qxClearMountInlineStyles === "function") qxClearMountInlineStyles(mount);
    }
    if (!window.TS_STANDALONE) return;
    const v = String(view || "dashboard").toLowerCase();
    if (v === "analytics") { tsGoPage("analytics"); return; }
    if (v === "tests" || v === "testseries") { tsGoPage("alltests"); return; }
    if (v === "dashboard" || v === "home") { tsGoPage("home"); return; }
    tsRenderStandalone();
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
  const res = await fetch(`${tsDataRoot(sid)}/manifest.json?v=${typeof QX_BUILD !== "undefined" ? QX_BUILD : Date.now()}`);
  if (!res.ok) throw new Error("manifest");
  return tsBrandManifest(await res.json());
}

async function tsFetchCategory(seriesId, file) {
  const key = seriesId + "::" + file;
  if (_tsCategoryCache[key]) return _tsCategoryCache[key];
  const res = await fetch(`${tsDataRoot(seriesId)}/${file}?v=${typeof QX_BUILD !== "undefined" ? QX_BUILD : Date.now()}`);
  if (!res.ok) throw new Error("category");
  const data = tsBrandCategoryData(await res.json());
  _tsCategoryCache[key] = data;
  return data;
}

async function tsResolveTest(seriesId, meta) {
  if (!meta || !meta.file) return null;
  const data = await tsFetchCategory(seriesId, meta.file);
  let test = null;
  if (data.tests && Array.isArray(data.tests)) {
    test = data.tests.find(t => t.id === meta.id) || data.tests[meta.testIndex] || null;
  } else if (data.questionIds) {
    test = data;
  }
  if (!test) return null;
  // Preserve Quizrr / linked-series pointers from manifest index
  return {
    ...test,
    seriesRoot: test.seriesRoot || meta.seriesRoot || null,
    seriesId: test.seriesId || meta.seriesId || seriesId,
    questionShard: test.questionShard || meta.questionShard || null,
    examgoalMeta: test.examgoalMeta || meta.examgoalMeta || null
  };
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
    return t.length > 0;
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
  const isEg = !!(out._examgoalId || out._bank === "examgoal_2027" || TS_CFG.provider === "examgoal");
  if (hasQ && isNum) {
    out._shardLoaded = true;
    out._fullFetched = true;
    out._needsFull = false;
  } else if (hasQ && (tsShardOptionsComplete(out.options) || (isEg && (out.options || []).length && !placeholderOpts))) {
    out._shardLoaded = true;
    out._fullFetched = true;
    out._needsFull = false;
  } else if (marksId && !isEg && (placeholderOpts || (typeof MarksLive !== "undefined" && MarksLive.isPartialOptions && MarksLive.isPartialOptions(out.options)))) {
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
  const seriesId = test.seriesId || test.seriesRoot || _tsPayload.folder || TS_SERIES_ID;
  const root = tsRootForMeta(test);
  // ExamGoal shards use test.id; Quizrr PYQ shards use qz-{quizrrTestId}.json
  paths.push(`${root}/questions/${test.id}.json`);
  if (test.questionShard) paths.push(`${root}/questions/${test.questionShard}`);
  const qzId = test.examgoalMeta && test.examgoalMeta.quizrrTestId;
  if (qzId) {
    paths.push(`${tsDataRoot("jee_main_quizrr_pyq_chapter")}/questions/qz-${qzId}.json`);
    // Full PYQ mock papers (year/shift) live in examgoal questions as qzmock-{id}.json
    paths.push(`${root}/questions/qzmock-${qzId}.json`);
    paths.push(`${tsDataRoot(seriesId)}/questions/qzmock-${qzId}.json`);
  }
  if (test.examgoalMeta && test.examgoalMeta.questionFile) {
    paths.push(`${root}/questions/${test.examgoalMeta.questionFile}`);
    paths.push(`${tsDataRoot(seriesId)}/questions/${test.examgoalMeta.questionFile}`);
  }
  // Fallback examgoal folder
  paths.push(`${tsDataRoot(seriesId)}/questions/${test.id}.json`);

  const wantIds = (test.questionIds || []).map(tsNormalizeQuestionId).filter(Boolean);
  const expect = test.totalQs || 75;
  let best = { count: 0, ids: [] };

  for (const p of paths) {
    try {
      const res = await fetch(`${p}?v=${v}`);
      if (!res.ok) continue;
      let raw = await res.json();
      // Quizrr export shape: { id, title, questions: [...] }
      const qs = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.questions) ? raw.questions : []);
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
      const catalogResolved = wantIds.filter(id => getQ(id));
      const candidate = shardResolved.length >= catalogResolved.length ? shardResolved : catalogResolved;
      if (candidate.length > best.count) best = { count: candidate.length, ids: candidate };
      if (best.count >= expect * 0.85) break;
    } catch (e) { /* try next */ }
  }

  return best;
}

function quizrrInferSectionType(title) {
  const t = String(title || "").toLowerCase();
  if (t.includes("numerical")) return "numerical";
  if (t.includes("multiple correct")) return "multipleCorrect";
  return "singleCorrect";
}

function quizrrTypeLabel(type) {
  const map = {
    singleCorrect: "single correct",
    multipleCorrect: "multiple correct",
    numerical: "numerical type",
    paragraph: "paragraph type"
  };
  return map[type] || "single correct";
}

function quizrrSectionMarking(type) {
  if (type === "numerical") return { correct: 4, incorrect: 0 };
  if (type === "multipleCorrect") return { correct: 4, incorrect: -2 };
  return { correct: 4, incorrect: -1 };
}

function quizrrFormatSubjectsList(subjects) {
  const names = (subjects || []).map(s => s.subjectId?.title || s.title).filter(Boolean);
  if (!names.length) return "";
  if (names.length === 1) return `<strong>${tsEscHtml(names[0])}</strong>`;
  return names.map((n, i) => {
    const esc = tsEscHtml(n);
    if (i === names.length - 1) return `and <strong>${esc}</strong>`;
    if (i === 0) return `<strong>${esc}</strong>`;
    return `<strong>${esc}</strong>, `;
  }).join("");
}

function quizrrSectionFceHtml(section) {
  const title = section.title || section.sectionId?.title || "";
  const qCount = section.questionCount
    || (Array.isArray(section.questions) ? section.questions.length : 0)
    || (section.sectionId?.questions || []).length;
  const type = quizrrInferSectionType(title);
  const label = quizrrTypeLabel(type);
  const ms = section.markingScheme || section.sectionId?.markingScheme || quizrrSectionMarking(type);
  const correct = ms.correct ?? ms.correctAttempt ?? 4;
  const incorrect = ms.incorrect ?? ms.incorrectAttempt ?? (type === "numerical" ? 0 : -1);
  const maxAttempt = section.maximumAttemptLimit ?? section.sectionId?.maximumAttemptLimit;
  let limitHtml = "";
  if (maxAttempt != null && maxAttempt !== qCount) {
    limitHtml = `<p class="qz-instr-sub">The maximum number of questions that can be attempted in this section — <strong>${maxAttempt}</strong> questions.</p>`;
  }
  return `<li class="qz-instr-sec-item"><span><strong>${tsEscHtml(title)}</strong> consisting of <strong>${qCount}</strong> <strong>${label}</strong> questions. For each correct response, you will get <strong>+${correct}</strong> mark while an incorrect response will get you <strong>${incorrect}</strong> mark. <strong>0</strong> will be awarded for no response.</span>${limitHtml}</li>`;
}

function quizrrEceInstructionsHtml(meta) {
  const qCount = meta.totalQuestions || 0;
  const mins = quizrrNormMinutes(meta.totalTime, 180);
  const marks = meta.totalMarks || 300;
  const subjects = meta.subjects || [];
  const sections = meta.sections || [];
  const subjectLine = quizrrFormatSubjectsList(subjects);
  const sectionItems = sections.map(s => quizrrSectionFceHtml(s)).join("");
  return `<ul class="qz-instr-list qz-instr-ece">
    <li>The total duration of this test is <strong>${mins}</strong> minutes.</li>
    <li>The test is of <strong>${marks}</strong> marks.</li>
    <li>There will be <strong>${qCount}</strong> questions in the test.</li>
    <li>There are <strong>${subjects.length}</strong> subject(s) in the test: ${subjectLine}</li>
    <li>The paper is divided into <strong>${sections.length}</strong> sections.</li>
    <li>There are following sections:
      <ul class="qz-instr-nested">${sectionItems}</ul>
    </li>
  </ul>`;
}

/** Normalize instruction totalTime: minutes preferred; fix catalog dumps (e.g. 36000 → 36) */
function quizrrNormMinutes(raw, fallback) {
  const fb = fallback || 180;
  let t = Number(raw);
  if (!Number.isFinite(t) || t <= 0) return fb;
  if (t >= 1000) {
    const asMin = Math.round(t / 1000); // 36000 → 36 (durationMin*1000 dumps)
    const asMsMin = Math.round(t / 60000); // true milliseconds
    if (asMin >= 1 && asMin <= 600) t = asMin;
    else if (asMsMin >= 1 && asMsMin <= 600) t = asMsMin;
    else t = fb;
  } else if (t > 600) {
    t = Math.round(t / 60); // seconds → min
  }
  if (t < 1 || t > 600) t = fb;
  return t;
}

/** Exact Quizrr test.quizrr.in NTA instructions (screenshots 789/790). */
function quizrrInstructionHtml(config) {
  const meta = config.quizrrInstrMeta || {};
  const n = meta.totalQuestions || config.catalogTotalQs || (config.questionIds || []).length;
  const mins = quizrrNormMinutes(
    meta.totalTime,
    config.catalogDurationMin || (config.durationSec ? Math.floor(config.durationSec / 60) : 180)
  );
  const title = tsEscHtml(config.title || meta.title || "Test");
  const userName = tsEscHtml(
    (typeof localStorage !== "undefined" && (localStorage.getItem("quantrex_user_name") || localStorage.getItem("qx_user_name")))
    || "Candidate"
  );
  const declareText =
    "I have read and understood the instructions. All computer hardware allotted to me are in proper working condition. " +
    "I declare that I am not in possession of / not wearing / not carrying any prohibited gadget like mobile phone, bluetooth devices etc. " +
    "/any prohibited material with me into the Examination Hall.I agree that in case of not adhering to the instructions, " +
    "I shall be liable to be debarred from this Test and/or to disciplinary action, which may include ban from future Tests / Examinations";

  return `<div id="marksInstrOverlay" class="qzrr-instr-page" role="dialog" aria-modal="true">
    <div class="qzrr-instr-layout">
      <div class="qzrr-instr-main">
        <div class="qzrr-instr-subhead">Instructions</div>
        <div class="qzrr-instr-body">
          <h2 class="qzrr-instr-center-title">INSTRUCTIONS TO CANDIDATES</h2>
          <h3 class="qzrr-gi-title">GENERAL INSTRUCTIONS</h3>
          <ol class="qzrr-instr-ol">
            <li>Total duration of the paper is <strong>${mins}</strong> minutes.</li>
            <li>The on-screen computer clock will be set at the server. The countdown timer in the top right corner of the computer screen will display the remaining time (in minutes) available for you to complete the examination. When the timer reaches zero, the examination will end by itself automatically. You will not be required to end or submit the answers of examination. Please note that only the answers that you have saved will be recorded and submitted.</li>
            <li>The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols. You can view the summary of your actions on the questions of any section above the question palette.</li>
          </ol>
          <table class="qzrr-sym-table" cellspacing="0" cellpadding="0">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Meaning of the symbol</th>
                <th>Image of question palette (bottom) and section summary (top)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span class="qzrr-sym qzrr-sym-nv">1</span></td>
                <td>You have not visited this question yet.</td>
                <td rowspan="5" class="qzrr-sym-preview">
                  <div class="qzrr-mini-legend">
                    <span><i class="qzrr-pill qzrr-pill-ans">0</i> Answered</span>
                    <span><i class="qzrr-pill qzrr-pill-na">0</i> Not Answered</span>
                    <span><i class="qzrr-pill qzrr-pill-nv">0</i> Not Visited</span>
                    <span><i class="qzrr-pill qzrr-pill-mr">0</i> Marked for Review</span>
                    <span><i class="qzrr-pill qzrr-pill-amr">0</i> Answered &amp; Marked</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td><span class="qzrr-sym qzrr-sym-na">2</span></td>
                <td>You have not answered the question.</td>
              </tr>
              <tr>
                <td><span class="qzrr-sym qzrr-sym-ans">3</span></td>
                <td>You have answered the question.</td>
              </tr>
              <tr>
                <td><span class="qzrr-sym qzrr-sym-mr">4</span></td>
                <td>You have NOT answered the question, but have marked the question for review.</td>
              </tr>
              <tr>
                <td><span class="qzrr-sym qzrr-sym-amr">5</span></td>
                <td>You have answered the question, but marked it for review. This will be considered for evaluation.</td>
              </tr>
            </tbody>
          </table>
          <ol class="qzrr-instr-ol" start="4">
            <li>The Marked for Review status for a question simply indicates that you would like to look at that question again.</li>
            <li>You can click on the "&gt;" arrow which appears to the left of question palette to collapse the question palette thereby maximizing the question window. To view the question palette again, you can click on "&lt;" which appears on the right side of question window.</li>
            <li>You can click on <strong>◀</strong> to navigate to the bottom and <strong>▲</strong> to navigate to the top of the question area, without scrolling.</li>
            <li>A Test Summary page will be displayed before final submission. It will help student in reconciling the result and in case of any discrepancy.</li>
          </ol>
          <h3 class="qzrr-gi-title">NAVIGATING TO A QUESTION:</h3>
          <p>To navigate between questions, you may do one of the following:</p>
          <ol class="qzrr-instr-ol">
            <li>Click on the question number in the Question Palette at the right of the screen to go to that numbered question directly. Note that using this option does <strong>NOT</strong> save your answer to the current question.</li>
            <li>Click on <strong>Save &amp; Next</strong> to save answer for the current question and then go to the next question.</li>
            <li>Click on <strong>Mark for Review &amp; Next</strong> to save answer for the current question, mark it for review, and then go to the next question.</li>
          </ol>
          <h3 class="qzrr-gi-title">ANSWERING A QUESTION:</h3>
          <p><strong>Procedure for answering a multiple choice (single correct option) type question:</strong></p>
          <ol class="qzrr-instr-ol">
            <li>To select your answer, click on the button of one of the options</li>
            <li>To deselect your chosen answer, click on the button of the chosen option again or click on the <strong>Clear Response</strong> button</li>
            <li>To change your chosen answer, click on the button of another option</li>
            <li>To save your answer, you MUST click on the <strong>Save &amp; Next</strong> button</li>
            <li>To mark the question for review, click on the <strong>Mark for Review &amp; Next</strong> button.</li>
          </ol>
          <p><strong>Procedure for answering a numerical value type question:</strong></p>
          <ol class="qzrr-instr-ol">
            <li>To enter a number as your answer, use the virtual numerical keypad</li>
            <li>A fraction (e.g. −0.3 or −.3) can be entered as an answer with or without '0' before the decimal point</li>
            <li>To clear your answer, click on the <strong>Clear Response</strong> button</li>
            <li>To save your answer, you MUST click on the <strong>Save &amp; Next</strong> button</li>
            <li>To mark the question for review, click on the <strong>Mark for Review &amp; Next</strong> button. If an answer is entered for a question that is Marked for Review, that answer will be considered in evaluation.</li>
          </ol>
          <ol class="qzrr-instr-ol">
            <li>To change your answer to a question that has already been answered, first select that question for answering and then follow the procedure for answering that type of question.</li>
            <li>Note that ONLY Questions for which answers are saved or marked for review after answering will be considered for evaluation.</li>
          </ol>
          <h3 class="qzrr-gi-title">NAVIGATING THROUGH SECTIONS:</h3>
          <ol class="qzrr-instr-ol">
            <li>Sections in this question paper are displayed on the top bar of the screen. Questions in a section can be viewed by clicking on the section name. The section you are currently viewing is highlighted.</li>
            <li>After clicking the <strong>Save &amp; Next</strong> button on the last question for a section, you will automatically be taken to the first question of the next section.</li>
            <li>You can shuffle between sections and questions anytime during the examination as per your convenience only during the time stipulated.</li>
            <li>Candidate can view the corresponding section summary as part of the legend that appears in every section above the question palette.</li>
          </ol>
          <p class="qzrr-instr-lang">All the questions will appear in English language.</p>
          <p class="qzrr-instr-meta">Paper: <strong>${title}</strong> · <strong>${n}</strong> questions · <strong>${mins}</strong> minutes</p>
        </div>
        <div class="qzrr-instr-declare">
          <label class="qzrr-declare-label">
            <input type="checkbox" id="qzInstrAgree" />
            <span>${declareText}</span>
          </label>
          <div class="qzrr-ready-wrap">
            <button type="button" class="qzrr-ready-btn" id="qzInstrProceed" disabled>I am ready to begin</button>
          </div>
        </div>
      </div>
      <aside class="qzrr-instr-side">
        <div class="qzrr-profile-avatar" aria-hidden="true">
          <svg viewBox="0 0 64 64" width="72" height="72"><circle cx="32" cy="32" r="32" fill="#d9e2ec"/><circle cx="32" cy="24" r="12" fill="#90a4ae"/><ellipse cx="32" cy="52" rx="18" ry="14" fill="#90a4ae"/></svg>
        </div>
        <div class="qzrr-profile-name">${userName}</div>
        <button type="button" class="qzrr-instr-back" id="qzrrInstrBackBtn">← Go Back</button>
      </aside>
    </div>
  </div>`;
}

function bindQuizrrInstructionEvents() {
  const root = document.getElementById("marksInstrOverlay");
  if (!root) return;
  const cancel = () => {
    if (typeof window.marksCancelInstructions === "function") window.marksCancelInstructions();
  };
  const proceed = () => {
    if (typeof window.marksAcceptInstructions === "function") window.marksAcceptInstructions();
  };
  root.querySelector("#qzrrInstrBackBtn")?.addEventListener("click", cancel);
  root.querySelector("#qzInstrProceed")?.addEventListener("click", proceed);
  const agree = root.querySelector("#qzInstrAgree");
  const proceedBtn = root.querySelector("#qzInstrProceed");
  if (agree && proceedBtn) {
    agree.addEventListener("change", () => { proceedBtn.disabled = !agree.checked; });
  }
}

function showQuizrrInstructions(config, onDone, onCancel) {
  const existing = document.getElementById("marksInstrOverlay");
  if (existing) existing.remove();
  window._marksInstrDone = onDone;
  window._marksInstrCancel = onCancel;
  document.body.classList.add("marks-instr-active", "qzrr-instr-active");
  try {
    document.body.insertAdjacentHTML("beforeend", quizrrInstructionHtml(config));
    bindQuizrrInstructionEvents();
  } catch (err) {
    console.error("Quizrr instructions render failed:", err);
    document.body.classList.remove("marks-instr-active", "qzrr-instr-active");
    showToast("⚠️ Could not show instructions. Starting test…");
    if (typeof onDone === "function") onDone();
    return;
  }
  window.scrollTo(0, 0);
}
window.showQuizrrInstructions = showQuizrrInstructions;

function quizrrAcceptInstructions() {
  if (typeof marksAcceptInstructions === "function") marksAcceptInstructions();
}

function tsIsJeeMainLayoutChooser(seriesId) {
  const sid = String(seriesId || (_tsPayload && _tsPayload.folder) || TS_SERIES_ID || (TS_CFG && TS_CFG.seriesId) || "");
  return /jee_main|jeemain|examgoal_2027/i.test(sid);
}

/** Dual format picker — Quantrex (best UX) vs NTA-exact (default for Test Series). */
function tsFormatChooserHtml(config) {
  const title = tsEscHtml(config.title || "Test");
  const n = config.catalogTotalQs || (config.questionIds || []).length;
  const mins = config.catalogDurationMin || (config.durationSec ? Math.floor(config.durationSec / 60) : 180);
  let last = "quizrr";
  try { last = localStorage.getItem("ts_last_ui_mode") || "quizrr"; } catch (_) { /* */ }
  if (last !== "quizrr" && last !== "examgoal" && last !== "quantrex") last = "quizrr";
  const ntaOn = last === "quizrr";
  return `<div id="tsFormatChooser" class="ts-fmt-chooser" role="dialog" aria-modal="true" aria-label="Choose test layout">
    <div class="ts-fmt-card eg-layout-card">
      <button type="button" class="ts-fmt-x" id="tsFmtCancel" aria-label="Cancel">✕</button>
      <div class="ts-fmt-head">
        <h2 class="ts-fmt-title">${title}</h2>
        <p class="ts-fmt-meta">${n} questions · ${mins} minutes</p>
      </div>
      <h3 class="ts-fmt-section">Layout Mode</h3>
      <p class="ts-fmt-hint" style="margin:0 0 12px;text-align:left">Choose your preferred test layout and language</p>
      <div class="ts-fmt-grid">
        <button type="button" class="ts-fmt-opt ts-fmt-qx${ntaOn ? "" : " on"}" id="tsFmtQuantrex" data-ui="examgoal">
          <div class="ts-fmt-opt-icon">QX</div>
          <div class="ts-fmt-opt-body">
            <strong>Quantrex</strong>
            <span>Clean &amp; intuitive interface</span>
          </div>
        </button>
        <button type="button" class="ts-fmt-opt ts-fmt-qz${ntaOn ? " on" : ""}" id="tsFmtQuizrr" data-ui="quizrr">
          <div class="ts-fmt-opt-icon">NTA</div>
          <div class="ts-fmt-opt-body">
            <strong>NTA</strong>
            <span>Mimics official NTA exam</span>
          </div>
        </button>
      </div>
      <div class="ts-fmt-lang">Language · English</div>
      <button type="button" class="ts-fmt-start" id="tsFmtStart">Start Test</button>
    </div>
  </div>`;
}

function showTsFormatChooser(config, onPick, onCancel) {
  const old = document.getElementById("tsFormatChooser");
  if (old) old.remove();
  document.body.classList.add("marks-instr-active", "ts-fmt-chooser-active");
  document.body.insertAdjacentHTML("beforeend", tsFormatChooserHtml(config));
  const root = document.getElementById("tsFormatChooser");
  const finish = (ui) => {
    root?.remove();
    document.body.classList.remove("ts-fmt-chooser-active");
    // keep marks-instr-active if instructions follow immediately
    if (typeof onPick === "function") onPick(ui);
  };
  const cancel = () => {
    root?.remove();
    document.body.classList.remove("marks-instr-active", "ts-fmt-chooser-active");
    if (typeof onCancel === "function") onCancel();
  };
  let picked = "quizrr";
  try {
    const saved = localStorage.getItem("ts_last_ui_mode") || "quizrr";
    picked = (saved === "examgoal" || saved === "quantrex") ? "examgoal" : "quizrr";
  } catch (_) { /* */ }
  const mark = (ui) => {
    picked = ui;
    root.querySelectorAll(".ts-fmt-opt").forEach((b) => b.classList.toggle("on", b.getAttribute("data-ui") === ui));
  };
  root.querySelector("#tsFmtCancel")?.addEventListener("click", cancel);
  root.querySelector("#tsFmtQuantrex")?.addEventListener("click", () => mark("examgoal"));
  root.querySelector("#tsFmtQuizrr")?.addEventListener("click", () => mark("quizrr"));
  root.querySelector("#tsFmtStart")?.addEventListener("click", () => finish(picked));
  root.addEventListener("click", (e) => { if (e.target === root) cancel(); });
}
window.showTsFormatChooser = showTsFormatChooser;

function tsFormatDate(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) { return iso; }
}

function tsIsUpcoming(t) {
  if (!t) return false;
  // Date wins: past scheduled/live date => available even if catalog still says upcoming
  const day = t.scheduledDate || (t.liveAt ? String(t.liveAt).slice(0, 10) : "") || (t.examgoalMeta && t.examgoalMeta.liveAt ? String(t.examgoalMeta.liveAt).slice(0, 10) : "");
  if (day && day <= tsToday()) return false;
  if (t.status === "available") return false;
  if (t.status === "upcoming") return true;
  if (day && day > tsToday()) return true;
  return false;
}

function tsIsAvailable(t) {
  return !tsIsUpcoming(t);
}

function tsCatIcon(cat) {
  const ic = { physics: "⚛️", chemistry: "🧪", mathematics: "📐", qpt: "📝", qft: "🎯", ept: "📝", eft: "🎯", year: "📅" };
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
  if (tab === "all") return true;
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
      const a = attempts[t.id];
      if (!a || a.status !== "completed") return;
      if (a.breakdown && a.breakdown.subject && a.breakdown.subject[sub]) {
        done++;
        pctSum += a.breakdown.subject[sub].pct || 0;
      } else if ((t.subjects || []).includes(sub)) {
        done++;
        pctSum += a.pct || 0;
      }
    });
    return { sub, done, avg: done ? Math.round(pctSum / done) : 0 };
  });
}

function tsFormatDuration(sec) {
  if (!sec && sec !== 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m + "m " + String(s).padStart(2, "0") + "s";
}

function tsPersistResultSummary(testId, data) {
  const subBreakdown = {};
  if (data.breakdown && data.breakdown.subject) {
    Object.entries(data.breakdown.subject).forEach(([sub, v]) => {
      subBreakdown[sub] = {
        correct: v.correct, wrong: v.wrong, total: v.total,
        pct: v.total ? Math.round(v.correct / v.total * 100) : 0
      };
    });
  }
  const weakAreas = Object.entries(subBreakdown)
    .filter(([, v]) => v.pct < 50 && v.total > 0)
    .map(([s]) => s);
  tsSaveAttempt(testId, {
    status: "completed",
    score: data.score, pct: data.pct,
    correct: data.correct, wrong: data.wrong, skipped: data.skipped,
    notVisited: data.notVisited || 0,
    notAttempted: data.notAttempted != null ? data.notAttempted : Math.max(0, (data.skipped || 0) - (data.notVisited || 0)),
    total: data.total, maxScore: data.maxScore, timeUsed: data.timeUsed,
    breakdown: { subject: subBreakdown },
    weakAreas,
    completedAt: new Date().toISOString()
  });
  if (TS_CFG.provider === "examgoal") {
    const qids = (data.rows || []).map(r => r.q && r.q.id).filter(Boolean);
    if (qids.length) tsMarkQuestionsSeen(testId, qids);
    tsBumpStreak();
  }
}

function tsRingSvg(pct) {
  const p = Math.min(100, Math.max(0, pct || 0));
  const r = 52;
  const c = 2 * Math.PI * r;
  const off = c - (p / 100) * c;
  return `<svg class="ts-ring-svg ts-premium-ring-svg" viewBox="0 0 120 120">
    <defs><linearGradient id="qxRingGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#003DA5"/><stop offset="100%" stop-color="#F58220"/></linearGradient></defs>
    <circle class="ts-ring-track" cx="60" cy="60" r="${r}" fill="none" stroke-width="10"/>
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="url(#qxRingGrad)" stroke-width="10"
      stroke-dasharray="${c}" stroke-dashoffset="${off}" stroke-linecap="round" transform="rotate(-90 60 60)"/>
    <text class="ts-ring-label" x="60" y="64" text-anchor="middle" font-size="22" font-weight="800" font-family="Poppins,Kanit,sans-serif">${p}%</text>
  </svg>`;
}

function tsBreadcrumb() {
  const cat = _tsPayload.categoryId && _tsManifest
    ? (_tsManifest.categories || []).find(c => c.id === _tsPayload.categoryId)
    : null;
  const topic = _tsPayload.topicSection ? ` / <strong>${tsEscHtml(_tsPayload.topicSection)}</strong>` : "";
  if (_tsPage === "analytics") return `<span class="ts-breadcrumb"><a onclick="tsGoPage('home')">Your Tests</a> / <strong>Analytics</strong></span>`;
  if (_tsPage === "alltests" || (_tsPage === "category" && !cat))
    return `<span class="ts-breadcrumb"><a onclick="tsGoPage('home')">Your Tests</a> / <strong>All Tests</strong></span>`;
  if (cat)
    return `<span class="ts-breadcrumb"><a onclick="tsGoPage('home')">Your Tests</a> / <a onclick="tsGoPage('alltests')">All Tests</a> / <a onclick="tsOpenCategory('${cat.id}')">${cat.title}</a>${topic}</span>`;
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

function tsTogglePageTheme(ev) {
  if (ev) { ev.preventDefault(); ev.stopPropagation(); }
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  const next = cur === "light" ? "dark" : "light";
  try {
    localStorage.setItem("quantrex_page_theme", next);
    localStorage.setItem("quantrex_theme", next);
    localStorage.setItem("quantrex_test_theme", next);
  } catch (_) { /* */ }
  if (typeof QuantrexTheme !== "undefined" && QuantrexTheme.apply) QuantrexTheme.apply(next);
  else document.documentElement.setAttribute("data-theme", next);
  if (typeof setTestTheme === "function") setTestTheme(next);
  document.querySelectorAll("#tsPageThemeBtn, .ts-premium-theme-btn, .ts-theme-btn").forEach((btn) => {
    btn.textContent = next === "light" ? "🌙" : "☀️";
    btn.setAttribute("title", next === "light" ? "Switch to dark mode" : "Switch to light mode");
  });
}
window.tsTogglePageTheme = tsTogglePageTheme;

const TS_SEEN_Q_STORE = "quantrex_examgoal_seen_q_v1";

function tsLoadSeenQuestions() {
  try { return JSON.parse(localStorage.getItem(TS_SEEN_Q_STORE) || "{}"); }
  catch (e) { return {}; }
}

function tsMarkQuestionsSeen(testId, ids) {
  if (!testId || !ids || !ids.length) return;
  const all = tsLoadSeenQuestions();
  const set = new Set(all[testId] || []);
  ids.forEach(id => set.add(String(id)));
  all[testId] = [...set];
  localStorage.setItem(TS_SEEN_Q_STORE, JSON.stringify(all));
}

function tsSeenQuestionCount() {
  const all = tsLoadSeenQuestions();
  return Object.values(all).reduce((n, arr) => n + (arr ? arr.length : 0), 0);
}

function tsStreakDays() {
  try {
    const raw = localStorage.getItem("quantrex_examgoal_streak_v1");
    if (!raw) return 0;
    const d = JSON.parse(raw);
    return d.count || 0;
  } catch (e) { return 0; }
}

function tsBumpStreak() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const raw = JSON.parse(localStorage.getItem("quantrex_examgoal_streak_v1") || "{}");
    if (raw.last === today) return;
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const count = raw.last === y ? (raw.count || 0) + 1 : 1;
    localStorage.setItem("quantrex_examgoal_streak_v1", JSON.stringify({ last: today, count }));
  } catch (e) { /* */ }
}

function tsPremiumSidebarCollapsed() {
  return localStorage.getItem("ts_premium_sidebar_collapsed") === "1";
}

function tsTogglePremiumSidebar() {
  const collapsed = !tsPremiumSidebarCollapsed();
  localStorage.setItem("ts_premium_sidebar_collapsed", collapsed ? "1" : "0");
  document.body.classList.toggle("ts-psb-collapsed", collapsed);
  const sb = document.querySelector(".ts-premium-sidebar");
  if (sb) sb.classList.toggle("collapsed", collapsed);
  tsRerender();
}

function tsTogglePremiumMobileNav() {
  const sb = document.querySelector(".ts-premium-sidebar");
  if (sb) sb.classList.toggle("mobile-open");
}
window.tsTogglePremiumSidebar = tsTogglePremiumSidebar;
window.tsTogglePremiumMobileNav = tsTogglePremiumMobileNav;

function tsPremiumNavItem(id, icon, label, onclick) {
  const catMatch = _tsPage === "category" && _tsPayload.categoryId === id;
  const pageMatch = _tsPage === id;
  const on = (catMatch || pageMatch) ? " on" : "";
  return `<button type="button" class="ts-psb-item${on}" onclick="${onclick}"><span class="ts-psb-icon">${icon}</span><span class="ts-psb-label">${label}</span></button>`;
}

function tsPremiumSidebarHtml() {
  const collapsed = tsPremiumSidebarCollapsed();
  return `<aside class="ts-premium-sidebar${collapsed ? " collapsed" : ""}">
    <div class="ts-psb-brand">
      <div class="ts-psb-logo">Q</div>
      <div class="ts-psb-brand-text"><strong>Quantrex Academy</strong><small>JEE Main 2027 · Quantrex</small></div>
    </div>
    <nav class="ts-psb-nav">
      ${tsPremiumNavItem("home", "🏠", "Dashboard", "tsGoPage('home')")}
      ${tsPremiumNavItem("alltests", "📋", "All Tests", "tsGoPage('alltests')")}
      <div class="ts-psb-section">Chapter & Topic</div>
      ${tsPremiumNavItem("physics", "⚛️", "Physics", "tsOpenCategory('physics')")}
      ${tsPremiumNavItem("mathematics", "📐", "Mathematics", "tsOpenCategory('mathematics')")}
      ${tsPremiumNavItem("chemistry", "🧪", "Chemistry", "tsOpenCategory('chemistry')")}
      <div class="ts-psb-section">Mock Tests</div>
      ${tsPremiumNavItem("ept", "📝", "Part Tests", "tsOpenCategory('ept')")}
      ${tsPremiumNavItem("eft", "🎯", "Full Tests", "tsOpenCategory('eft')")}
      <div class="ts-psb-section">More</div>
      ${tsPremiumNavItem("analytics", "📊", "Analytics", "tsGoPage('analytics')")}
      <button type="button" class="ts-psb-item${_tsNav === "resources" ? " on" : ""}" onclick="tsSetNav('resources')"><span class="ts-psb-icon">📚</span><span class="ts-psb-label">Resources</span></button>
      <button type="button" class="ts-psb-item" onclick="showToast('👤 ${tsUserName()} — JEE Main 2027 batch')"><span class="ts-psb-icon">👤</span><span class="ts-psb-label">Profile</span></button>
    </nav>
    <div class="ts-psb-foot">
      <button type="button" class="ts-psb-item" onclick="tsGoBack()"><span class="ts-psb-icon">←</span><span class="ts-psb-label">Back</span></button>
      <button type="button" class="ts-psb-item ts-psb-exit" onclick="tsExitSeries()"><span class="ts-psb-icon">🚪</span><span class="ts-psb-label">Exit Series</span></button>
      <button type="button" class="ts-psb-toggle" onclick="tsTogglePremiumSidebar()"><span>${collapsed ? "→" : "←"} Collapse</span></button>
    </div>
  </aside>`;
}

function tsGoBack() {
  if (_tsPayload && _tsPayload.topicSection) {
    _tsPayload.topicSection = null;
    tsRerender();
    return;
  }
  if (_tsPayload && _tsPayload.categoryId) {
    tsOpenCategory(null);
    return;
  }
  if (_tsNav === "about" || _tsNav === "solution" || _tsNav === "resources") {
    _tsNav = "test";
    tsGoPage("home");
    return;
  }
  if (_tsPage && _tsPage !== "home") {
    tsGoPage("home");
    return;
  }
  tsExitSeries();
}

function tsExitSeries() {
  if (window.TS_STANDALONE) {
    try {
      window.location.href = "app.html?exam=Engineering#tests";
    } catch (e) {
      window.location.href = "app.html";
    }
    return;
  }
  if (typeof go === "function") go("tests");
}

function tsPremiumHeaderHtml() {
  const searchVal = (_tsSearch || "").replace(/"/g, "&quot;");
  return `<header class="ts-premium-header">
    <div class="ts-premium-header-left">
      <button type="button" class="ts-premium-mobile-menu" onclick="tsTogglePremiumMobileNav()" aria-label="Menu">☰</button>
      <div class="ts-premium-nav-btns">
        <button type="button" class="ts-nav-back-btn" onclick="tsGoBack()" title="Go back one level">← Back</button>
        <button type="button" class="ts-nav-exit-btn" onclick="tsExitSeries()" title="Exit test series">Exit</button>
      </div>
      <div class="ts-premium-breadcrumb">${tsBreadcrumb()}</div>
      <label class="ts-premium-search"><span>🔍</span><input type="search" placeholder="Search tests, chapters…" value="${searchVal}" oninput="tsSetSearch(this.value)"/></label>
    </div>
    <div class="ts-premium-header-right">
      <span class="ts-premium-badge" title="Every question is new — no PYQ repeat from past JEE papers">✦ New Questions Only — No PYQ</span>
      <button type="button" class="ts-premium-theme-btn" id="tsPageThemeBtn" onclick="tsTogglePageTheme(event)" title="Light / Dark">${tsPageThemeIcon()}</button>
      <div class="ts-premium-user"><strong>${tsUserName()}</strong><span>JEE Main 2027</span></div>
    </div>
  </header>`;
}

function tsEnsurePremiumStyles() {
  if (typeof document === "undefined") return Promise.resolve();
  if (document.getElementById("qxTsPremiumCss") && document.getElementById("qxTsPageCss")) {
    return Promise.resolve();
  }
  const files = [
    { id: "qxTsPremiumCss", href: "assets/examgoal-premium.css?v=qxtsfmt1" },
    { id: "qxTsPageCss", href: "test-series-page.css?v=qxtsfmt1" }
  ];
  return Promise.all(files.map(f => new Promise(resolve => {
    if (document.getElementById(f.id)) return resolve();
    const link = document.createElement("link");
    link.id = f.id;
    link.rel = "stylesheet";
    link.href = f.href;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  })));
}

function tsPremiumEmbedNavHtml() {
  const chip = (id, label, onclick) => {
    const on = (_tsPage === id || _tsPayload.categoryId === id) ? " on" : "";
    return `<button type="button" class="ts-embed-chip${on}" onclick="${onclick}">${label}</button>`;
  };
  return `<div class="ts-embed-nav" role="navigation" aria-label="Test series sections">
    ${chip("home", "Dashboard", "tsGoPage('home')")}
    ${chip("alltests", "All Tests", "tsGoPage('alltests')")}
    ${chip("pyq_physics", "PYQ Phy", "tsOpenCategory('pyq_physics')")}
    ${chip("pyq_chemistry", "PYQ Chem", "tsOpenCategory('pyq_chemistry')")}
    ${chip("pyq_mathematics", "PYQ Math", "tsOpenCategory('pyq_mathematics')")}
    ${chip("physics", "Physics", "tsOpenCategory('physics')")}
    ${chip("mathematics", "Maths", "tsOpenCategory('mathematics')")}
    ${chip("chemistry", "Chemistry", "tsOpenCategory('chemistry')")}
    ${chip("ept", "Part Tests", "tsOpenCategory('ept')")}
    ${chip("eft", "Full Tests", "tsOpenCategory('eft')")}
    ${chip("analytics", "Analytics", "tsGoPage('analytics')")}
  </div>`;
}

function tsPremiumAppShell(inner) {
  // Inside main app: no second "Q" sidebar (broken layout). Use toolbar + full premium CSS.
  if (!window.TS_STANDALONE) {
    return `<div class="ts-premium-app ts-premium-embed">
      <div class="ts-premium-main ts-premium-main-embed">
        <div class="ts-embed-toolbar">
          <button type="button" class="ts-embed-back" onclick="tsGoBack()">← Back</button>
          <button type="button" class="ts-embed-back ts-embed-exit" onclick="tsExitSeries()">Exit</button>
          ${tsPremiumEmbedNavHtml()}
          <a class="ts-embed-full" href="examgoal-test-series.html" target="_blank" rel="noopener">Full page ↗</a>
        </div>
        ${tsPremiumHeaderHtml()}
        <div class="ts-premium-content">${inner}</div>
      </div>
    </div>`;
  }
  const collapsed = tsPremiumSidebarCollapsed();
  return `<div class="ts-premium-app${collapsed ? " ts-psb-collapsed" : ""}">
    ${tsPremiumSidebarHtml()}
    <div class="ts-premium-main">
      ${tsPremiumHeaderHtml()}
      <div class="ts-premium-content">${inner}</div>
    </div>
  </div>`;
}

function tsInitPremiumCounters() {
  document.querySelectorAll("[data-count-to]").forEach(el => {
    const target = parseInt(el.dataset.countTo, 10) || 0;
    const suffix = el.dataset.countSuffix || "";
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 24));
    const tick = () => {
      cur = Math.min(target, cur + step);
      el.textContent = cur + suffix;
      if (cur < target) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  if (document.body.classList.contains("ts-psb-collapsed") !== tsPremiumSidebarCollapsed()) {
    document.body.classList.toggle("ts-psb-collapsed", tsPremiumSidebarCollapsed());
  }
}

function tsSubjectProgressPct(catId, manifest) {
  const tests = (manifest.tests || []).filter(t => t.categoryId === catId);
  if (!tests.length) return 0;
  const done = tests.filter(t => tsAttemptStatus(t.id) === "completed").length;
  return Math.round(done / tests.length * 100);
}

function tsPremiumSubjectCard(cat, manifest) {
  const pct = tsSubjectProgressPct(cat.id, manifest);
  const avail = (manifest.tests || []).filter(t => t.categoryId === cat.id && tsIsAvailable(t)).length;
  const ring = tsRingSvg(pct);
  return `<div class="ts-premium-subject ${cat.id}" onclick="tsOpenCategory('${cat.id}')">
    <div class="ts-premium-subject-top">
      <span class="ts-premium-subject-ic">${tsCatIcon(cat)}</span>
      <div class="ts-premium-ring">${ring}</div>
    </div>
    <strong>${cat.title}</strong>
    <small>${cat.count} tests · ${avail} available · ${pct}% done</small>
  </div>`;
}

function tsPremiumDiffTag(t) {
  const tt = String(t.testType || t.difficulty || "").toLowerCase();
  if (/advanced|adv/.test(tt)) return '<span class="ts-premium-pill diff">Advanced</span>';
  return '<span class="ts-premium-pill diff">JEE Mains</span>';
}

function tsPremiumMockMini(t, manifest) {
  const st = tsAttemptStatus(t.id);
  const up = tsIsUpcoming(t);
  const pill = up ? '<span class="ts-premium-pill up">Locked</span>'
    : st === "completed" ? '<span class="ts-premium-pill done">Attempted</span>'
      : '<span class="ts-premium-pill av">Available</span>';
  const click = up ? `showToast('📅 ${tsFormatDate(t.scheduledDate)}')` : `tsOpenTest('${t.id}')`;
  const syl = tsSyllabusBtnHtml(t);
  const sylBtn = syl ? syl.replace("ts-mock-syllabus", "ts-premium-cta ghost ts-mock-syllabus") : "";
  return `<div class="ts-premium-mock-card${up ? " locked" : ""}"${tsPeekAttr(t.id)} onclick="${click}">
    <strong>${tsEscHtml(t.shortTitle || t.title)}</strong>
    <div class="ts-premium-pills">${pill}${tsPremiumDiffTag(t)}<span class="ts-premium-pill fresh" title="Fresh questions — no PYQ repeat">✦ No Repeat</span></div>
    <small style="color:var(--qx-muted);font-size:12px">${t.totalQs || 75} Qs · ${t.durationMin || 180}m · ${t.totalMarks || 300} marks</small>
    ${t.subtitle ? `<small style="color:var(--qx-muted);font-size:11px;display:block;margin-top:4px">${tsEscHtml(t.subtitle)}</small>` : ""}
    <div class="ts-premium-mock-actions">
      ${sylBtn}
      ${!up ? `<button type="button" class="ts-premium-cta" onclick="event.stopPropagation();tsOpenTest('${t.id}')">${st === "completed" ? "Analysis" : st === "inProgress" ? "Resume" : "Start Test"}</button>` : ""}
    </div>
  </div>`;
}

function tsPremiumCatStatsHtml(tests) {
  let available = 0, upcoming = 0, attempted = 0;
  (tests || []).forEach(t => {
    const st = tsAttemptStatus(t.id);
    if (st === "completed") attempted++;
    else if (tsIsUpcoming(t)) upcoming++;
    else if (tsIsAvailable(t)) available++;
  });
  const total = (tests || []).length;
  return `<div class="ts-premium-cat-stats">
    <div class="ts-premium-stat"><span>Total</span><strong data-count-to="${total}">0</strong></div>
    <div class="ts-premium-stat"><span>Available</span><strong data-count-to="${available}">0</strong></div>
    <div class="ts-premium-stat"><span>Upcoming</span><strong data-count-to="${upcoming}">0</strong></div>
    <div class="ts-premium-stat"><span>Attempted</span><strong data-count-to="${attempted}">0</strong></div>
  </div>`;
}

function tsPremiumCategoryHtml(cat, tests, manifest) {
  const isMock = tsIsMockCardCategory(cat);
  const topic = _tsPayload.topicSection;
  const heroTitle = topic || cat.title;
  const heroSub = topic ? `${cat.title} · ${topic}` : tsCategorySubtitle(cat);
  const filters = !topic && !isMock ? "" : tsFiltersHtml(manifest);
  return `${tsPremiumFreshnessBanner(manifest)}
  <div class="ts-premium-hero">
    <h1>${tsEscHtml(heroTitle)}</h1>
    <p>${heroSub}</p>
  </div>
  ${tsPremiumCatStatsHtml(tests)}
  ${filters}
  ${tsStatusTabsHtml()}
  <div class="ts-premium-cat-body">${tsCategoryListHtml(cat, tests)}</div>`;
}

function tsPremiumFreshnessBanner(manifest) {
  const seen = tsSeenQuestionCount();
  const pool = manifest.totalTests || 458;
  return `<div class="ts-premium-freshness" title="Your attempts track question IDs locally. Retakes prioritize unseen items from the Quantrex Ultimate Series bank.">
    <span>🔒</span><span>Question Pool: <strong>${pool} unique</strong> non-repeating tests · <strong>${seen}</strong> questions marked in your sessions</span>
  </div>`;
}

function tsPremiumDashboardHtml(manifest) {
  const s = tsAnalyticsSummary(manifest.tests || []);
  const pyq = (manifest.categories || []).filter(c => String(c.id || "").startsWith("pyq_"));
  const subs = (manifest.categories || []).filter(c => ["physics", "mathematics", "chemistry"].includes(c.id));
  const ept = (manifest.tests || []).filter(t => t.categoryId === "ept").sort((a, b) => (a.seriesOrder || 0) - (b.seriesOrder || 0));
  const eft = (manifest.tests || []).filter(t => t.categoryId === "eft").slice(0, 6);
  const pyqBlock = pyq.length ? `
  <h2 class="ts-premium-section-title">PYQ Chapterwise <span class="ts-premium-pill" style="background:#DC2828;color:#fff;margin-left:8px;font-size:11px">Free · Quantrex</span>
    <button type="button" class="ts-mini-tab" onclick="tsOpenCategory('${pyq[0].id}')">Open →</button></h2>
  <p class="ts-premium-section-sub" style="margin:-6px 0 12px;color:var(--gray);font-size:13px">JEE Main previous year questions as chapter tests (PCM) — Quantrex NTA-style instructions.</p>
  <div class="ts-premium-subjects">${pyq.map(c => tsPremiumSubjectCard(c, manifest)).join("")}</div>` : "";
  return `${tsPremiumFreshnessBanner(manifest)}
  <div class="ts-premium-hero">
    <h1>${manifest.title || "JEE Main New Question Test Series 2027"}</h1>
    <p>${manifest.subtitle || "Quantrex Ultimate Series"} — New questions + free PYQ Chapterwise (PCM).</p>
  </div>
  <div class="ts-premium-stats">
    <div class="ts-premium-stat"><span>Total Tests</span><strong data-count-to="${manifest.totalTests || 0}">0</strong><em>${manifest.availableTests || 0} live now</em></div>
    <div class="ts-premium-stat"><span>Completed</span><strong data-count-to="${s.completed}">0</strong><em>${s.attempted} attempted</em></div>
    <div class="ts-premium-stat"><span>Average Score</span><strong data-count-to="${s.avgPct}" data-count-suffix="%">0%</strong><em>accuracy</em></div>
    <div class="ts-premium-stat"><span>Streak</span><strong data-count-to="${tsStreakDays()}">0</strong><em>day streak</em></div>
  </div>
  ${pyqBlock}
  <h2 class="ts-premium-section-title">New Question Subjects <button type="button" class="ts-mini-tab" onclick="tsGoPage('alltests')">View all →</button></h2>
  <div class="ts-premium-subjects">${subs.map(c => tsPremiumSubjectCard(c, manifest)).join("")}</div>
  <h2 class="ts-premium-section-title">Part Tests (EPT)</h2>
  <div class="ts-premium-mock-scroll">${ept.map(t => tsPremiumMockMini(t, manifest)).join("")}</div>
  <h2 class="ts-premium-section-title" style="margin-top:24px">Full Tests (EFT)</h2>
  <div class="ts-premium-mock-scroll">${eft.map(t => tsPremiumMockMini(t, manifest)).join("")}</div>
  <div class="ts-premium-panel" style="margin-top:24px">
    <div class="ts-panel-head"><h3>Upcoming Releases</h3><button type="button" class="ts-mini-tab" onclick="tsGoPage('alltests');tsSetStatusTab('upcoming')">All upcoming →</button></div>
    <table class="ts-table"><thead><tr><th>Test</th><th>Date</th><th>Subject</th></tr></thead><tbody>${tsNextTestsRows(manifest)}</tbody></table>
  </div>`;
}

function tsPremiumAllTestsHtml(manifest) {
  const subs = (manifest.categories || []).filter(c =>
    ["pyq_physics", "pyq_chemistry", "pyq_mathematics", "physics", "mathematics", "chemistry", "ept", "eft"].includes(c.id)
    || String(c.section || "") === "PYQ Chapterwise"
  );
  const blocks = subs.map(c => {
    const avail = (manifest.tests || []).filter(t => t.categoryId === c.id && tsIsAvailable(t)).length;
    return `<div class="ts-premium-subject ${c.id}" onclick="tsOpenCategory('${c.id}')">
      <div class="ts-premium-subject-top"><span class="ts-premium-subject-ic">${tsCatIcon(c)}</span><div class="ts-premium-ring">${tsRingSvg(tsSubjectProgressPct(c.id, manifest))}</div></div>
      <strong>${c.title}</strong><small>${c.count} tests · ${avail} available</small>
    </div>`;
  }).join("");
  return `${tsPremiumFreshnessBanner(manifest)}
  <div class="ts-premium-hero"><h1>Test Library</h1><p>Chapter & topic-wise practice plus Quantrex Part/Full mocks — official series order.</p></div>
  <div class="ts-premium-subjects" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${blocks}</div>`;
}

function tsPremiumSparkline(scores) {
  if (!scores.length) return '<p class="empty">Complete tests to see trend</p>';
  const w = 280, h = 80, pad = 8;
  const max = Math.max(...scores, 100);
  const pts = scores.map((v, i) => {
    const x = pad + (i / Math.max(scores.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" class="ts-premium-chart"><defs><linearGradient id="qxGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#4F7CFF"/><stop offset="100%" stop-color="#8B5CF6"/></linearGradient></defs><polyline fill="none" stroke="url(#qxGrad)" stroke-width="2.5" points="${pts}"/></svg>`;
}

function tsPremiumAnalyticsHtml(manifest) {
  const s = tsAnalyticsSummary(manifest.tests || []);
  const subs = tsSubjectAnalytics(manifest.tests || []);
  const attempts = tsLoadAttempts();
  const recent = Object.keys(attempts).map(id => ({ id, ...attempts[id] }))
    .filter(a => a.status === "completed").sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
  const scores = recent.map(a => a.pct || 0).slice(-12);
  const subBars = subs.map(x => {
    const col = x.sub === "Physics" ? "#22c55e" : x.sub === "Chemistry" ? "#f59e0b" : "#4f7cff";
    return `<div class="ts-subj-bar-row"><span>${x.sub}</span><div class="ts-subj-bar-track"><div class="ts-subj-bar-fill" style="width:${x.avg}%;background:${col}"></div></div><em>${x.avg}%</em></div>`;
  }).join("");
  const heat = subs.map(x => {
    const weak = x.avg < 50 && x.done > 0;
    const bg = weak ? "rgba(239,68,68,0.12)" : x.avg >= 70 ? "rgba(34,197,94,0.12)" : "rgba(79,124,255,0.1)";
    return `<div class="ts-premium-heat-cell" style="background:${bg}"><strong>${x.avg}%</strong>${x.sub}<br><small>${x.done} tests</small></div>`;
  }).join("");
  return `<div class="ts-premium-hero"><h1>Performance Analytics</h1><p>Score trends, subject accuracy, and weak-topic heatmap from your attempts.</p></div>
  <div class="ts-premium-stats">
    <div class="ts-premium-stat"><span>Attempted</span><strong>${s.attempted}</strong></div>
    <div class="ts-premium-stat"><span>Completed</span><strong>${s.completed}</strong></div>
    <div class="ts-premium-stat"><span>Avg Accuracy</span><strong>${s.avgPct}%</strong></div>
    <div class="ts-premium-stat"><span>In Progress</span><strong>${s.inProgress}</strong></div>
  </div>
  <div class="ts-premium-chart-row">
    <div class="ts-premium-panel"><h3 style="margin:0 0 12px">Score Trend</h3>${tsPremiumSparkline(scores)}</div>
    <div class="ts-premium-panel"><h3 style="margin:0 0 12px">Subject Accuracy</h3><div class="ts-subj-bars">${subBars}</div></div>
  </div>
  <div class="ts-premium-panel"><h3 style="margin:0 0 12px">Weak Topic Heatmap</h3><div class="ts-premium-heatmap">${heat}</div></div>`;
}

function tsAppShell(inner) {
  if (TS_CFG.provider === "examgoal") return tsPremiumAppShell(inner);
  return `<div class="ts-app">
    ${tsIconNavHtml()}
    <div class="ts-app-main">
      <header class="ts-topbar">
        ${tsBreadcrumb()}
        <div class="ts-topbar-actions">
          <button type="button" class="ts-theme-btn" id="tsPageThemeBtn" onclick="tsTogglePageTheme(event)" title="Light / Dark mode">${tsPageThemeIcon()}</button>
          <div class="ts-user-greet"><strong>Hey, ${tsUserName()}</strong><span>JEE Main 2027 Batch</span></div>
        </div>
      </header>
      <div class="ts-content">${inner}</div>
    </div>
  </div>`;
}

function tsSidebarHtml(manifest, activeId) {
  if (TS_CFG.provider === "examgoal") return "";
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

function tsExamgoalSidebarHtml(manifest, activeId) {
  const pyq = (manifest.categories || []).filter(c => String(c.id || "").startsWith("pyq_"));
  const subs = (manifest.categories || []).filter(c => ["physics", "mathematics", "chemistry"].includes(c.id));
  const mocks = (manifest.categories || []).filter(c => ["ept", "eft"].includes(c.id));
  const mkItems = (list) => list.map(c => {
    const on = c.id === activeId && !_tsPayload.topicSection ? " on" : "";
    return `<button type="button" class="ts-side-item${on}" onclick="tsOpenCategory('${c.id}')"><span>${tsCatIcon(c)} ${c.title}</span><span class="ts-cat-go">›</span></button>`;
  }).join("");
  return `<aside class="ts-sidebar ts-eg-sidebar">
    <button type="button" class="ts-side-nav-btn${_tsPage === "alltests" && !activeId ? " on" : ""}" onclick="tsGoPage('alltests')">📋 All Tests</button>
    ${pyq.length ? `<div class="ts-side-head"><strong>PYQ Chapterwise</strong><small style="display:block;opacity:.75">Free · Quantrex PCM</small></div>
    <div class="ts-side-list">${mkItems(pyq)}</div>` : ""}
    <div class="ts-side-head"${pyq.length ? ' style="margin-top:14px"' : ""}><strong>Chapter and Topic Wise Tests</strong></div>
    <div class="ts-side-list">${mkItems(subs)}</div>
    <div class="ts-side-head" style="margin-top:14px"><strong>Quantrex Mock Tests</strong></div>
    <div class="ts-side-list">${mkItems(mocks)}</div>
    <button type="button" class="ts-side-item" onclick="tsGoPage('analytics')"><span>📊 Analytics</span></button>
  </aside>`;
}

function tsExamgoalStatsBar(tests) {
  let available = 0, upcoming = 0, attempted = 0;
  (tests || []).forEach(t => {
    const st = tsAttemptStatus(t.id);
    if (st === "completed") attempted++;
    else if (tsIsUpcoming(t)) upcoming++;
    else if (tsIsAvailable(t)) available++;
  });
  const total = (tests || []).length;
  return `<div class="ts-eg-stats">
    <span class="ts-eg-stat">Total <strong>${total}</strong></span>
    <span class="ts-eg-stat av">Available <strong>${available}</strong></span>
    <span class="ts-eg-stat up">Upcoming <strong>${upcoming}</strong></span>
    <span class="ts-eg-stat att">Attempted <strong>${attempted}</strong></span>
  </div>`;
}

function tsExamgoalTopicStats(tests) {
  let av = 0, up = 0, att = 0, free = 0;
  (tests || []).forEach(t => {
    const st = tsAttemptStatus(t.id);
    if (st === "completed") att++;
    else if (tsIsUpcoming(t)) up++;
    else { av++; if (!t.isPremium) free++; }
  });
  return { av, up, att, free, total: (tests || []).length };
}

function tsTopicIcon(sectionName) {
  const n = String(sectionName || "").toLowerCase();
  if (/vector|3d|geometry|coordinate/.test(n)) return "📐";
  if (/matrix|determinant|algebra|complex|binomial|sequence|logarithm|set|relation|quadratic|permutation|probability/.test(n)) return "🔢";
  if (/mechanic|motion|force|energy|wave|optics|electro|magnetic|thermo|fluid/.test(n)) return "⚛️";
  if (/organic|inorganic|physical|chem|reaction|equilibrium|acid|base|redox/.test(n)) return "🧪";
  return "📘";
}

function tsExamgoalTopicCard(sectionName, tests) {
  const s = tsExamgoalTopicStats(tests);
  const enc = encodeURIComponent(sectionName);
  const pills = [];
  if (s.free) pills.push(`<span class="ts-allen-pill free">${s.free} Free</span>`);
  if (s.av) pills.push(`<span class="ts-allen-pill av">${s.av} Available</span>`);
  if (s.up) pills.push(`<span class="ts-allen-pill up">${s.up} Upcoming</span>`);
  if (s.att) pills.push(`<span class="ts-allen-pill att">${s.att} Done</span>`);
  const pct = s.total ? Math.round(s.att / s.total * 100) : 0;
  return `<div class="ts-allen-topic-card" onclick="tsOpenTopicSection('${enc}')">
    <div class="ts-allen-topic-ic">${tsTopicIcon(sectionName)}</div>
    <div class="ts-allen-topic-body">
      <strong>${tsEscHtml(sectionName)}</strong>
      <div class="ts-allen-topic-pills">${pills.join("") || `<span class="ts-allen-pill">${s.total} tests</span>`}</div>
    </div>
    <div class="ts-allen-topic-right">
      <div class="ts-allen-topic-ring">${tsRingSvg(pct)}</div>
      <span class="ts-allen-topic-go" aria-hidden="true">›</span>
    </div>
  </div>`;
}

function tsOpenTopicSection(sectionEnc) {
  _tsPayload.topicSection = decodeURIComponent(sectionEnc || "");
  tsRerender();
}
window.tsOpenTopicSection = tsOpenTopicSection;

function tsPremiumTestRowHtml(t) {
  const st = tsAttemptStatus(t.id);
  const up = tsIsUpcoming(t);
  const action = up ? `showToast('📅 Available on ${tsFormatDate(t.scheduledDate)}')` : `tsOpenTest('${t.id}')`;
  const btn = up ? "🔒 Upcoming" : st === "completed" ? "Analysis" : st === "inProgress" ? "Resume" : "Start Test";
  const pill = up ? '<span class="ts-premium-pill up">Locked</span>'
    : st === "completed" ? '<span class="ts-premium-pill done">Attempted</span>'
      : st === "inProgress" ? '<span class="ts-premium-pill av">Resume</span>'
        : '<span class="ts-premium-pill av">Available</span>';
  return `<div class="ts-eg-test-row ts-premium-test-row${up ? " ts-upcoming" : ""}"${tsPeekAttr(t.id)} onclick="${action}">
    <div class="ts-premium-test-main">
      <strong>${tsEscHtml(t.title)}</strong>
      <div class="ts-premium-pills">${pill}${tsPremiumDiffTag(t)}<span class="ts-premium-pill fresh" title="No PYQ repeat">✦</span></div>
      <small>${t.totalQs} Qs · ${t.durationMin}m · ${t.testType || "JEE Mains"}</small>
      ${up ? `<em class="ts-upcoming-date">Opens ${tsFormatDate(t.scheduledDate)}</em>` : ""}
    </div>
    <div class="ts-eg-test-actions">${tsSyllabusBtnHtml(t)}<button type="button" class="ts-premium-cta${up ? " ghost" : ""}" onclick="event.stopPropagation();${action}">${btn}</button></div>
  </div>`;
}

function tsExamgoalCategoryListHtml(cat, tests) {
  if (tsIsMockCardCategory(cat)) {
    let filtered = tsFilterCategoryTests(tests);
    if (!filtered.length) return '<div class="empty">No tests in this tab.</div>';
    filtered = tsSortBySeriesOrder(filtered);
    const cards = filtered.map(t => tsPremiumMockMini(t, _tsManifest || { tests: [] })).join("");
    return `<div class="ts-premium-mock-scroll ts-premium-mock-grid">${cards}</div>`;
  }
  const topic = _tsPayload.topicSection;
  if (topic) {
    let list = tests.filter(t => (t.topicSection || t.chapter) === topic);
    list = tsFilterCategoryTests(list);
    list = tsSortBySeriesOrder(list);
    if (!list.length) return '<div class="empty">No tests in this topic.</div>';
    return `<div class="ts-eg-topic-head"><button type="button" class="ts-premium-cta ghost" onclick="tsClearTopicSection()">← Back</button><h3>${tsEscHtml(topic)}</h3></div>
      <div class="ts-premium-test-list">${list.map(t => tsPremiumTestRowHtml(t)).join("")}</div>`;
  }
  let filtered = tsFilterCategoryTests(tests);
  const byGroup = {};
  const groupOrder = [];
  tsSortBySeriesOrder(filtered).forEach(t => {
    const g = t.chapterGroup || "Tests";
    if (!byGroup[g]) { byGroup[g] = {}; groupOrder.push(g); }
    const sec = t.topicSection || t.chapter || "Tests";
    if (!byGroup[g][sec]) byGroup[g][sec] = [];
    byGroup[g][sec].push(t);
  });
  if (!groupOrder.length) return '<div class="empty">No tests in this tab.</div>';
  return `<div class="ts-allen-chapter-list">${groupOrder.map(g => {
    const sections = Object.keys(byGroup[g]);
    const groupTests = sections.reduce((n, sec) => n + byGroup[g][sec].length, 0);
    const cards = sections.map(sec => tsExamgoalTopicCard(sec, byGroup[g][sec])).join("");
    return `<section class="ts-allen-chapter-block">
      <div class="ts-allen-chapter-head">
        <h2 class="ts-allen-chapter-title">${tsEscHtml(g)}</h2>
        <span class="ts-allen-chapter-count">${sections.length} topics · ${groupTests} tests</span>
      </div>
      <div class="ts-allen-topic-grid">${cards}</div>
    </section>`;
  }).join("")}</div>`;
}

function tsClearTopicSection() {
  _tsPayload.topicSection = null;
  tsRerender();
}
window.tsClearTopicSection = tsClearTopicSection;

function tsCategoryCard(cat, manifest) {
  const badge = cat.badge ? `<span class="ts-cat-badge">${cat.badge}</span>` : "";
  let availBadge = "";
  if (manifest && (cat.id === "qpt" || cat.id === "qft" || cat.id === "ept" || cat.id === "eft")) {
    const n = (manifest.tests || []).filter(t => t.categoryId === cat.id && tsIsAvailable(t)).length;
    if (n) availBadge = `<span class="ts-cat-badge ts-cat-avail">${n} available</span>`;
  }
  return `<div class="ts-cat-card" onclick="tsOpenCategory('${cat.id}')">
    <div class="ts-cat-card-ic">${tsCatIcon(cat)}</div>
    <div class="ts-cat-card-body"><strong>${cat.title}</strong><small>${cat.count} Tests</small></div>
    ${availBadge || badge}<span class="ts-cat-go">›</span>
  </div>`;
}

function tsResourcesHtml(manifest) {
  const res = manifest.resources || [];
  return `<section class="ts-resources"><h3>Resources</h3>
    <div class="ts-res-pills">${res.map(r =>
      `<button type="button" class="ts-res-pill" style="--ts-res:${r.color}" onclick="tsOpenResource('${r.id}','${r.link || ""}')">${r.title}</button>`
    ).join("")}</div></section>`;
}

function tsPartTestCatId() {
  return TS_CFG.provider === "examgoal" ? "ept" : "qpt";
}

function tsAvailableQptRows(manifest) {
  const partCat = tsPartTestCatId();
  const tests = (manifest.tests || [])
    .filter(t => t.categoryId === partCat && tsIsAvailable(t))
    .sort((a, b) => String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || "")));
  if (!tests.length) return "";
  return tests.map(t => {
    const st = tsAttemptStatus(t.id);
    const att = tsLoadAttempts()[t.id] || {};
    const badge = st === "completed"
      ? `<span class="ts-badge-done">Completed${att.pct != null ? " · " + att.pct + "%" : ""}</span>`
      : st === "inProgress"
        ? `<span class="ts-badge-available">Resume</span>`
        : `<span class="ts-badge-available">Available</span>`;
    return `<tr onclick="tsOpenTest('${t.id}')">
      <td><strong>${t.shortTitle || t.title}</strong></td>
      <td>${badge}</td>
      <td class="ts-date-cell">${tsFormatDate(t.scheduledDate)}</td>
      <td class="ts-date-cell">${(t.subjects || []).join(" + ")}</td>
    </tr>`;
  }).join("");
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
  if (TS_CFG.provider === "examgoal") return tsPremiumDashboardHtml(manifest);
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
      ${tsAvailableQptRows(manifest) ? `<div class="ts-panel ts-qpt-live-panel">
        <div class="ts-panel-head"><h3>Available Now — Part Tests (EPT)</h3><button type="button" class="ts-mini-tab on" onclick="tsOpenCategory('${tsPartTestCatId()}');tsSetStatusTab('available')">Open EPT →</button></div>
        <table class="ts-table"><thead><tr><th>Test</th><th>Status</th><th>Released</th><th>Subjects</th></tr></thead><tbody>${tsAvailableQptRows(manifest)}</tbody></table>
      </div>` : ""}
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
  if (TS_CFG.provider === "examgoal") return tsPremiumAnalyticsHtml(manifest);
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
  if (TS_CFG.provider === "examgoal") return tsPremiumAllTestsHtml(manifest);
  const sections = manifest.sections || [...new Set((manifest.categories || []).map(c => c.section))];
  const blocks = sections.map(sec => {
    const cats = (manifest.categories || []).filter(c => c.section === sec);
    return `<section class="ts-sec-block"><h3 class="ts-sec-title">${sec}</h3><div class="ts-cat-grid">${cats.map(c => tsCategoryCard(c, manifest)).join("")}</div></section>`;
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
  const tabs = TS_CFG.provider === "examgoal"
    ? [
        { id: "all", label: "All Tests" },
        { id: "available", label: "Available" },
        { id: "upcoming", label: "Upcoming" },
        { id: "attempted", label: "Attempted" },
        { id: "resume", label: "Resume" }
      ]
    : [
        { id: "available", label: "Available" },
        { id: "upcoming", label: "Upcoming" },
        { id: "attempted", label: "Attempted" },
        { id: "resume", label: "Resume" }
      ];
  return `<div class="ts-status-tabs">${tabs.map(t =>
    `<button type="button" class="ts-status-tab ${_tsFilter.statusTab === t.id ? "on" : ""}" onclick="tsSetStatusTab('${t.id}')">${t.label}</button>`
  ).join("")}</div>`;
}

function tsIsMockCardCategory(cat) {
  return cat && (/^pyq_20/.test(cat.id) || cat.id === "qpt" || cat.id === "qft" || cat.id === "ept" || cat.id === "eft");
}

function tsCategorySubtitle(cat) {
  if (!cat) return "";
  if (cat.id === "ept") return "Quantrex Part Tests (EPT) · 75 Qs · 3h · 300 Marks";
  if (cat.id === "eft") return "Quantrex Full Syllabus Tests · 75 Qs · 3h · 300 Marks";
  if (String(cat.id || "").startsWith("pyq_")) return cat.title + " · " + cat.count + " chapter PYQ tests · Quantrex Free Pack · NTA instructions";
  if (cat.id === "physics" || cat.id === "mathematics" || cat.id === "chemistry") return cat.title + " · " + cat.count + " tests · Quantrex order";
  if (cat.id === "qpt") return "Part Tests · 75 Qs · 180 Min · 300 Marks · Video Solutions";
  if (cat.id === "qft") return "Full Tests · 75 Qs · 180 Min · 300 Marks · Video Solutions";
  if (/^pyq_20/.test(cat.id)) return "Previous Year Papers as Mock · 75 Qs · 180 Min · 300 Marks";
  return cat.title + " · " + cat.count + " tests";
}

function tsSyllabusText(t) {
  if (!t) return "";
  return String(t.syllabus || t.subtitle || "").trim();
}

function tsSyllabusBodyHtml(body) {
  const raw = String(body || "").trim();
  if (!raw) return "";
  const lines = raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);
  return lines.map(l => tsEscHtml(l)).join("<br/>");
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
        <p class="ts-syllabus-body">${tsSyllabusBodyHtml(body)}</p>
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
  return `<div class="ts-mock-card${up ? " ts-upcoming" : ""}${st === "completed" ? " ts-done" : ""}"${tsPeekAttr(t.id)}>
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
    return `<div class="ts-ch-test${up ? " ts-upcoming" : ""}"${tsPeekAttr(t.id)} onclick="${up ? `showToast('📅 This test opens on ${tsFormatDate(t.scheduledDate)}')` : `tsOpenTest('${t.id}')`}">
      <div class="ts-ch-test-main"><span>${t.title}</span><small>${t.totalQs} Qs · ${t.durationMin}m</small>${dateHint}${score}</div>
      <div class="ts-ch-test-actions">${syl}${tsTestActionBtn(t, st)}</div>
    </div>`;
  }).join("");
  return `<details class="ts-chapter-block"><summary class="ts-chapter-head">
    <span class="ts-ch-num">${num || ""}</span><strong>${chapter}</strong>
    <small>${tests.length} test${tests.length === 1 ? "" : "s"} · ${done} done</small>
  </summary><div class="ts-chapter-tests">${rows}</div></details>`;
}

function tsSortBySeriesOrder(list) {
  return list.slice().sort((a, b) => {
    const oa = a.seriesOrder != null ? a.seriesOrder : 99999;
    const ob = b.seriesOrder != null ? b.seriesOrder : 99999;
    if (oa !== ob) return oa - ob;
    return String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || ""));
  });
}

function tsCategoryListHtml(cat, tests) {
  if (TS_CFG.provider === "examgoal") return tsExamgoalCategoryListHtml(cat, tests);
  let filtered = tsFilterCategoryTests(tests);
  if (tsIsMockCardCategory(cat)) {
    if (!filtered.length) return '<div class="empty">No tests in this tab. Try another filter.</div>';
    filtered = tsSortBySeriesOrder(filtered);
    return `<div class="ts-mock-list">${filtered.map(t => tsMockCardHtml(t)).join("")}</div>`;
  }
  const byChapter = {};
  const chapterOrder = [];
  tsSortBySeriesOrder(filtered).forEach(t => {
    const ch = t.chapter || t.testType || "Tests";
    if (!byChapter[ch]) { byChapter[ch] = []; chapterOrder.push(ch); }
    byChapter[ch].push(t);
  });
  const chapters = chapterOrder;
  if (!chapters.length) return '<div class="empty">No tests in this tab. Try another filter.</div>';
  if (chapters.length === 1 && chapters[0] === "Tests") {
    return filtered.map(t => {
      const st = tsAttemptStatus(t.id);
      const up = tsIsUpcoming(t);
      const action = up ? `🔒 ${tsFormatDate(t.scheduledDate)}` : st === "completed" ? "Analysis" : st === "inProgress" ? "Resume" : "Attempt";
      return `<div class="ts-flat-test${up ? " ts-upcoming" : ""}"${tsPeekAttr(t.id)} onclick="${up ? `showToast('📅 Available on ${tsFormatDate(t.scheduledDate)}')` : `tsOpenTest('${t.id}')`}">
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
  const isEg = TS_CFG.provider === "examgoal";
  const bullets = isEg
    ? [
      `${manifest.totalTests} tests — ${manifest.availableTests || 0} available, ${manifest.upcomingTests || 0} upcoming`,
      "100% new questions — no PYQ",
      "NTA-style CBT interface",
      "Part, Full, Topic & Chapter tests with scheduled releases"
    ]
    : [
      `${manifest.totalTests} tests across PYQ, mocks & chapter-wise`,
      "NTA-style CBT with official instructions",
      "Analytics, filters & resume support",
      "Scheduled releases for QPT & QFT mocks"
    ];
  return `<div class="ts-panel"><h2 style="margin:0 0 12px;font-size:20px;font-weight:800">About This Series</h2>
    <p style="color:var(--ts-muted);line-height:1.7;font-size:14px">${manifest.tagline || ""}</p>
    <ul style="margin:16px 0 0;padding-left:20px;line-height:1.9;font-size:14px;color:var(--ts-muted)">
      ${bullets.map(b => `<li>${b}</li>`).join("")}
    </ul></div>`;
}

function tsSolutionHtml() {
  return `<div class="ts-panel"><h2 style="margin:0 0 12px;font-size:20px;font-weight:800">Solutions</h2>
    <p style="color:var(--ts-muted);font-size:14px">Complete any test and open <strong>Analysis</strong> to review accuracy and retake. Full step-by-step solutions load with each question in the test engine.</p></div>`;
}

async function tsBuildPageHtml() {
  if (!window.TS_STANDALONE) {
    try { await tsEnsurePremiumStyles(); } catch (e) { /* */ }
    try { document.body.classList.add("ts-premium-embed-active"); } catch (e) { /* */ }
  }
  const seriesId = _tsPayload.folder || TS_SERIES_ID;
  if (!_tsManifest) {
    try { _tsManifest = await tsFetchManifest(seriesId); }
    catch (e) { return tsAppShell('<div class="empty">Test series not found.</div>'); }
  }
  const manifest = _tsManifest;

  if (_tsNav === "about") return tsAppShell(tsAboutHtml(manifest));
  if (_tsNav === "solution") return tsAppShell(tsSolutionHtml());
  if (_tsNav === "resources") {
    const resInner = TS_CFG.provider === "examgoal"
      ? `<div class="ts-premium-hero"><h1>Resources</h1><p>Formula sheets, revision notes, and quick references for JEE Main 2027.</p></div>${tsResourcesHtml(manifest)}<div class="ts-premium-panel"><p style="color:var(--qx-muted);font-size:14px;margin:0">Tap a resource pill to open Formula Sheets, Revision Notes, and more.</p></div>`
      : tsResourcesHtml(manifest) + `<div class="ts-panel" style="margin-top:16px"><p style="color:var(--ts-muted);font-size:14px">Tap a resource pill to open Formula Sheets, Revision Notes, and more.</p></div>`;
    return tsAppShell(resInner);
  }

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
  if (TS_CFG.provider === "examgoal") return tsPremiumCategoryHtml(cat, tests, manifest);
  const label = tsIsMockCardCategory(cat) ? cat.title : /pyq/i.test(cat.title) && !tsIsMockCardCategory(cat) ? "Chapter-wise Tests" : "Tests";
  const filters = tsFiltersHtml(manifest);
  return `<div class="ts-all-tests-layout">
    ${tsSidebarHtml(manifest, catId)}
    <main class="ts-main-panel">
      <div class="ts-cat-head"><h2>${label}</h2><p>${tsCategorySubtitle(cat)}</p></div>
      ${filters}
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
    if (TS_CFG.provider === "examgoal") requestAnimationFrame(() => tsInitPremiumCounters());
    tsPaintLocks();
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
  if (!catId) { _tsPage = "alltests"; _tsPayload.categoryId = null; _tsPayload.topicSection = null; }
  else {
    _tsPage = "category";
    _tsPayload.categoryId = catId;
    _tsPayload.topicSection = null;
    if (TS_CFG.provider === "examgoal" && _tsFilter.statusTab === "available") _tsFilter.statusTab = "all";
  }
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
  const instrMeta = await tsFetchInstructionMeta(seriesId, testId, test || meta);
  tsStandaloneLaunchTest(testId, test, meta, seriesId, verified, o, instrMeta);
}

function tsBuildTestConfig(testId, test, meta, seriesId, questionIds, instrMeta) {
  const catalogQs = test.totalQs || questionIds.length;
  const isPartOrFull = /part test|full test|qpt|qft/i.test((test.testType || "") + (test.title || ""));
  const organizeJee = isPartOrFull
    ? questionIds.length >= Math.min(catalogQs, 75) * 0.9
    : questionIds.length >= 75;
  return {
    questionIds,
    title: test.title || "Test",
    returnTo: "testseries",
    testType: "testseries",
    durationSec: (test.durationMin || 180) * 60,
    timed: true,
    shuffle: false,
    marksMode: true,
    organizeJee,
    // Always section-split for Quizrr-like tabs (SC / Numerical) when possible
    paperFormat: "jee_main",
    persistKey: `ts::${seriesId}::${testId}`,
    meta: { seriesId, testId, categoryId: meta.categoryId || null, slug: "jee_main", year: test.year || meta.year || 2027 },
    modeLabel: `${test.testType || "Test"} · ${catalogQs} Qs`,
    subtitle: test.subtitle || "Based on Reduced Syllabus (as per NTA)",
    totalMarks: test.totalMarks || (catalogQs >= 75 ? 300 : catalogQs * 4),
    catalogTotalQs: catalogQs,
    catalogDurationMin: test.durationMin || 180,
    quizrrInstrMeta: instrMeta || null,
    scoring: { correct: 4, wrong: -1, unattempted: 0 },
    onComplete: (data) => {
      if (typeof marksClearSession === "function") marksClearSession(`ts::${seriesId}::${testId}`);
      tsPersistResultSummary(testId, data);
      showToast("✅ Submitted! Review solutions below or open analysis from test list.");
    }
  };
}

function tsStandaloneLaunchTest(testId, test, meta, seriesId, questionIds, opts, instrMeta) {
  const o = opts || {};
  const config = tsBuildTestConfig(testId, test, meta, seriesId, questionIds, instrMeta);
  if (o.resumeData) {
    config.resumeData = o.resumeData;
    config.skipCountdown = true;
    // Resume with same UI format as original attempt
    if (o.resumeData.uiMode) config.uiMode = o.resumeData.uiMode;
  }
  if (o.uiMode) config.uiMode = o.uiMode;

  try {
    const gate = {
      testType: "testseries",
      seriesId: seriesId || "jee_main_examgoal_2027",
      testId: testId || "",
      startTest: true,
      title: (test && test.title) || ""
    };
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.allow && !QuantrexAccess.allow("test", gate)) {
      const html = QuantrexAccess.paywallHtml("test", gate);
      const mount = document.getElementById("app-main") || document.getElementById("ts-root");
      if (mount) mount.innerHTML = html;
      return;
    }
  } catch (_) { /* */ }
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

  const startAfterInstructions = () => {
    // Quizrr path: no extra countdown flash — go straight into CBT (like Quizrr)
    if (config.uiMode === "quizrr") {
      if (typeof enterMarksTestMode === "function") enterMarksTestMode();
      runTest();
      return;
    }
    if (o.resumeData) {
      if (typeof enterMarksTestMode === "function") enterMarksTestMode();
      runTest();
      return;
    }
    if (typeof showMarksCountdown === "function") showMarksCountdown(runTest);
    else runTest();
  };

  const onCancel = () => {
    document.body.classList.remove("marks-instr-active", "qzrr-instr-active", "ts-fmt-chooser-active");
    if (typeof tsRenderStandalone === "function") tsRenderStandalone();
  };

  const launchWithUi = (uiMode) => {
    config.uiMode = uiMode === "quizrr" ? "quizrr" : "examgoal";
    try { localStorage.setItem("ts_last_ui_mode", config.uiMode); } catch (_) { /* */ }
    // Exam instructions only in Test Series (not PYQ mock)
    if (config.uiMode === "quizrr" && typeof showQuizrrInstructions === "function") {
      showQuizrrInstructions(config, startAfterInstructions, onCancel);
      return;
    }
    if (typeof showAllenInstructions === "function") {
      showAllenInstructions(config, startAfterInstructions, onCancel);
      return;
    }
    if (typeof showMarksInstructions === "function") {
      showMarksInstructions(config, startAfterInstructions, onCancel);
      return;
    }
    startAfterInstructions();
  };

  // Resume: skip chooser, keep saved format
  if (o.resumeData) {
    startAfterInstructions();
    return;
  }
  // Explicit format from caller
  if (o.uiMode === "quizrr" || o.uiMode === "examgoal" || o.uiMode === "quantrex") {
    launchWithUi(o.uiMode === "quantrex" ? "examgoal" : o.uiMode);
    return;
  }
  // NTA vs Quantrex layout — JEE Main Test Series only
  if (tsIsJeeMainLayoutChooser() && typeof showTsFormatChooser === "function") {
    showTsFormatChooser(config, launchWithUi, onCancel);
    return;
  }
  launchWithUi("examgoal");
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
  // Prefer full Quizrr analysis page when we have result stats (post-submit look)
  if (att.total != null && typeof document !== "undefined") {
    const data = {
      correct: att.correct || 0,
      wrong: att.wrong || 0,
      skipped: att.skipped || 0,
      notVisited: att.notVisited || 0,
      notAttempted: att.notAttempted != null ? att.notAttempted : Math.max(0, (att.skipped || 0) - (att.notVisited || 0)),
      score: att.score || 0,
      pct: att.pct || 0,
      total: att.total || meta.totalQs || 0,
      maxScore: att.maxScore || ((att.total || meta.totalQs || 0) * 4),
      timeUsed: att.timeUsed || 0,
      breakdown: att.breakdown || { subject: {} },
      rows: [] // no per-question rows when reopening from list
    };
    // Rebuild subject map shape for engine renderer
    if (data.breakdown.subject) {
      Object.keys(data.breakdown.subject).forEach(k => {
        const v = data.breakdown.subject[k];
        if (v && v.correct == null) data.breakdown.subject[k] = { correct: 0, wrong: 0, total: 0, ...v };
      });
    }
    const mount = document.getElementById("app-main") || document.getElementById("ts-root");
    if (mount && typeof QuantrexTestEngine !== "undefined") {
      // Render via temporary HTML builder if engine exposes it; else inline compact Quizrr page
      document.body.classList.add("marks-results-active", "qzrr-analysis-active");
      if (window.TS_STANDALONE) {
        const tsRoot = document.getElementById("ts-root");
        if (tsRoot && mount.id !== "ts-root") tsRoot.style.display = "none";
      }
      const maxScore = data.maxScore;
      const attempted = data.correct + data.wrong;
      const acc = data.total ? ((data.correct / data.total) * 100) : 0;
      const timeMin = Math.max(1, Math.round((data.timeUsed || 0) / 60));
      const title = tsEscHtml(meta.title || "Test");
      mount.innerHTML = `<div class="qz-an-page" id="qzAnPage">
        <aside class="qz-an-side">
          <button type="button" class="qz-an-back" id="qzAnBack">←</button>
          <div class="qz-an-side-head"><h2>Test Analysis</h2><p>${title}</p></div>
          <div class="qz-an-mode">
            <button type="button" class="qz-an-mode-btn on" data-qz-mode="personal">Personal</button>
            <button type="button" class="qz-an-mode-btn" data-qz-mode="comparative">Comparative</button>
          </div>
          <nav class="qz-an-nav">
            <button type="button" class="qz-an-nav-btn on" data-qz-tab="overview">📋 Overview</button>
            <button type="button" class="qz-an-nav-btn" data-qz-tab="performance">📈 Performance Analysis</button>
            <button type="button" class="qz-an-nav-btn" data-qz-tab="attempt">✅ Attempt Analysis</button>
          </nav>
        </aside>
        <main class="qz-an-main">
          <header class="qz-an-top">
            <h1 id="qzAnTitle">Overview</h1>
            <div class="qz-an-top-actions">
              <button type="button" class="qz-an-dl" id="qzAnDownload">⬇ Download Analysis</button>
              <button type="button" class="qz-an-viewsol" onclick="tsCloseAnalysis();tsRetakeTest('${testId}')">Retake →</button>
            </div>
          </header>
          <section class="qz-an-panel on" data-qz-panel="overview">
            <div class="qz-an-score-card">
              <div class="qz-an-score-left">
                <div class="qz-an-score-label">Overall Score</div>
                <div class="qz-an-score-big"><span>${Math.max(0, data.score)}</span><small>/${maxScore}</small></div>
              </div>
              <div class="qz-an-badge">Quantrex · Analysis</div>
            </div>
            <div class="qz-an-stat-grid">
              <div class="qz-an-stat"><span class="qz-an-stat-lab">QS ATTEMPTED</span><strong>${attempted}<small>/${data.total}</small></strong></div>
              <div class="qz-an-stat"><span class="qz-an-stat-lab">ACCURACY</span><strong>${acc.toFixed(2)}%</strong></div>
              <div class="qz-an-stat"><span class="qz-an-stat-lab">TIME TAKEN</span><strong>${timeMin}<small> min</small></strong></div>
              <div class="qz-an-stat"><span class="qz-an-stat-lab">CORRECT</span><strong style="color:#4caf50">${data.correct}</strong></div>
              <div class="qz-an-stat"><span class="qz-an-stat-lab">WRONG</span><strong style="color:#ef5350">${data.wrong}</strong></div>
              <div class="qz-an-stat"><span class="qz-an-stat-lab">SKIPPED</span><strong style="color:#90a4ae">${data.skipped}</strong></div>
            </div>
          </section>
          <section class="qz-an-panel" data-qz-panel="performance">
            <div class="qz-an-card">
              <div class="qz-an-card-head"><h3>Test Performance</h3></div>
              <table class="qz-an-table">
                <thead><tr><th>Students</th><th>Score</th><th>Accuracy</th></tr></thead>
                <tbody>
                  <tr>
                    <td><span class="qz-an-you">You</span></td>
                    <td>${Math.max(0, data.score)} / ${maxScore}</td>
                    <td>${Math.round(acc)}%</td>
                  </tr>
                  <tr class="qz-an-cmp"><td>Top 10%ile</td><td>${Math.round(maxScore * 0.67)} / ${maxScore}</td><td>84%</td></tr>
                  <tr class="qz-an-cmp"><td>Top 25%ile</td><td>${Math.round(maxScore * 0.5)} / ${maxScore}</td><td>78%</td></tr>
                </tbody>
              </table>
            </div>
            <div class="qz-an-card" style="margin-top:16px">
              <div class="qz-an-card-head"><h3>Test Breakdown</h3></div>
              <table class="qz-an-table">
                <thead><tr><th>Students</th><th class="ok">Attempted Correct</th><th class="bad">Attempted Wrong</th><th class="mut">Not Attempted</th><th class="mut">Not Visited</th></tr></thead>
                <tbody>
                  <tr>
                    <td><span class="qz-an-you">You</span></td>
                    <td class="ok">${data.correct} / ${data.total}</td>
                    <td class="bad">${data.wrong} / ${data.total}</td>
                    <td class="mut">${data.notAttempted} / ${data.total}</td>
                    <td class="mut">${data.notVisited} / ${data.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <section class="qz-an-panel" data-qz-panel="attempt">
            <div class="qz-an-stat-grid">
              <div class="qz-an-stat"><span class="qz-an-stat-lab">CORRECT</span><strong style="color:#4caf50">${data.correct}</strong></div>
              <div class="qz-an-stat"><span class="qz-an-stat-lab">WRONG</span><strong style="color:#ef5350">${data.wrong}</strong></div>
              <div class="qz-an-stat"><span class="qz-an-stat-lab">SKIPPED</span><strong style="color:#90a4ae">${data.skipped}</strong></div>
              <div class="qz-an-stat"><span class="qz-an-stat-lab">SCORE</span><strong>${Math.max(0, data.score)} / ${maxScore}</strong></div>
            </div>
          </section>
        </main>
      </div>`;
      const root = mount.querySelector("#qzAnPage");
      if (root) {
        const titles = { overview: "Overview", performance: "Performance Analysis", attempt: "Attempt Analysis" };
        root.querySelectorAll(".qz-an-nav-btn").forEach(btn => {
          btn.onclick = () => {
            const tab = btn.getAttribute("data-qz-tab");
            root.querySelectorAll(".qz-an-nav-btn").forEach(b => b.classList.toggle("on", b === btn));
            root.querySelectorAll(".qz-an-panel").forEach(p => p.classList.toggle("on", p.getAttribute("data-qz-panel") === tab));
            const t = root.querySelector("#qzAnTitle");
            if (t) t.textContent = titles[tab] || "Overview";
          };
        });
        root.querySelectorAll(".qz-an-mode-btn").forEach(btn => {
          btn.onclick = () => {
            root.querySelectorAll(".qz-an-mode-btn").forEach(b => b.classList.remove("on"));
            btn.classList.add("on");
            root.classList.toggle("qz-an-comparative", btn.getAttribute("data-qz-mode") === "comparative");
          };
        });
        const back = root.querySelector("#qzAnBack");
        if (back) back.onclick = () => tsCloseAnalysis();
        const dl = root.querySelector("#qzAnDownload");
        if (dl) dl.onclick = () => {
          try {
            const blob = new Blob([root.innerText || ""], { type: "text/plain;charset=utf-8" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "test-analysis.txt";
            a.click();
            URL.revokeObjectURL(a.href);
          } catch (_) { /* */ }
        };
      }
      return;
    }
  }
  // Fallback compact modal
  const pass = (att.pct || 0) >= 60;
  document.body.insertAdjacentHTML("beforeend", `<div class="marks-modal-overlay" id="tsAnalysisModal" onclick="if(event.target===this)tsCloseAnalysis()">
    <div class="marks-modal marks-preview-modal" style="max-width:520px">
      <div class="marks-modal-head"><h3>Test Analysis</h3><button type="button" class="marks-modal-cancel" onclick="tsCloseAnalysis()">✕</button></div>
      <div class="marks-modal-body">
        <h2 class="marks-preview-title">${tsEscHtml(meta.title)}</h2>
        <div class="marks-preview-stats" style="grid-template-columns:repeat(4,1fr)">
          <div class="marks-preview-stat"><strong>${att.pct != null ? att.pct + "%" : "—"}</strong><small>Accuracy</small></div>
          <div class="marks-preview-stat"><strong>${att.correct != null ? att.correct : "—"}/${att.total || meta.totalQs}</strong><small>Correct</small></div>
          <div class="marks-preview-stat"><strong>${att.score != null ? att.score : "—"}</strong><small>Score</small></div>
          <div class="marks-preview-stat"><strong>${tsFormatDuration(att.timeUsed)}</strong><small>Time</small></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:16px">
          <button type="button" class="marks-preview-attempt" style="flex:1" onclick="tsCloseAnalysis();tsRetakeTest('${testId}')">Retake →</button>
          <button type="button" class="marks-modal-cancel" onclick="tsCloseAnalysis()">Close</button>
        </div>
      </div>
    </div>
  </div>`);
}

function tsCloseAnalysis() {
  const el = document.getElementById("tsAnalysisModal");
  if (el) el.remove();
  document.body.classList.remove("qzrr-analysis-active", "marks-results-active");
  const mount = document.getElementById("app-main");
  if (mount && mount.querySelector("#qzAnPage")) {
    mount.innerHTML = "";
    if (typeof tsRenderStandalone === "function") tsRenderStandalone();
  } else if (window.TS_STANDALONE && typeof tsRenderStandalone === "function") {
    const tsRoot = document.getElementById("ts-root");
    if (tsRoot) tsRoot.style.display = "";
    tsRenderStandalone();
  }
}

async function tsRetakeTest(testId) {
  tsSaveAttempt(testId, { status: "notStarted" });
  await tsOpenTest(testId);
}

async function tsCheckQuizrrSync() {
  showToast("🔄 Checking sync…");
  try {
    const res = await fetch(`${tsDataRoot(TS_SERIES_ID)}/sync_status.json?v=` + Date.now());
    if (res.ok) {
      const st = await res.json();
      tsPushNotification(st.message || "Catalog up to date");
    }
  } catch (e) { showToast("Sync unavailable — Quizrr series removed"); }
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

const TS_EXAMGOAL_ID = "jee_main_examgoal_2027";
const TS_REMOVED_SERIES = new Set(["quizrr", "jeeboth", "jeeadv", "neet", "neet2", "aiims", "nda", "nda2", "gk"]);

function tsIsExamgoalSeries(p) {
  const id = p && (p.folder || p.seriesId || p.id);
  return id === TS_EXAMGOAL_ID || id === "jeemain" || TS_CFG.provider === "examgoal";
}

function tsIsRemovedSeries(p) {
  const id = p && (p.id || p.folder || p.seriesId);
  return TS_REMOVED_SERIES.has(id) || id === "jee_main_test_series_2027" || id === TS_SERIES_ID && TS_CFG.provider === "quizrr";
}

async function viewTestSeries(payload) {
  const p = payload || {};
  try {
    const locked = typeof qxAccessBlock === "function" ? qxAccessBlock("testseries", Object.assign({ seriesId: "jee_main_examgoal_2027" }, p)) : "";
    if (locked) return locked;
  } catch (_) { /* */ }

  if (tsIsRemovedSeries(p)) {
    return `<div class="marks-tests-page"><div class="ts-panel" style="margin-top:20px">
      <p style="color:var(--gray);font-size:14px;margin:0 0 14px">This test series is no longer available.</p>
      <button type="button" class="btn-primary" onclick="window.open('examgoal-test-series.html','_blank','noopener')">Open JEE Main Test Series 2027 (New Questions) →</button>
    </div></div>`;
  }

  const openExamgoal = tsIsExamgoalSeries(p) || p.id === "jeemain" || p.id === "jee_main_examgoal_2027";

  // Prefer the dedicated full-page series (proper layout + CSS). Falls back to in-app embed.
  if (!window.TS_STANDALONE && openExamgoal && !p._inline) {
    const qs = new URLSearchParams();
    if (p.categoryId) qs.set("cat", p.categoryId);
    if (p.page) qs.set("page", p.page);
    const url = "examgoal-test-series.html" + (qs.toString() ? "?" + qs.toString() : "");
    // Same tab = full premium format (as before). Card stays on Tests.
    try { window.location.assign(url); } catch (e) { window.open(url, "_blank", "noopener"); }
    return `<div class="marks-tests-page"><div class="ts-panel" style="margin-top:24px;text-align:center">
      <h2 style="margin:0 0 8px;font-size:18px;font-weight:800">Opening JEE Main Test Series 2027…</h2>
      <p style="color:var(--gray);font-size:14px;margin:0 0 14px">New questions only · no PYQ · full series format</p>
      <a class="btn-primary" href="${url}">Open Test Series →</a>
    </div></div>`;
  }

  if (p.categoryId) return viewTestSeriesCategory({ folder: p.folder || TS_EXAMGOAL_ID, ...p });
  if (openExamgoal || TS_CFG.provider === "examgoal") {
    return viewTestSeriesFolder({ folder: TS_EXAMGOAL_ID, ...p });
  }
  if (typeof viewTestSeriesLegacy === "function") return viewTestSeriesLegacy(p);
  return viewTestSeriesFolder({ folder: TS_EXAMGOAL_ID });
}

function tsBootFromUrl() {
  const params = new URLSearchParams(location.search);
  const cat = params.get("cat");
  const page = params.get("page");
  if (cat) { _tsPage = "category"; _tsPayload.categoryId = cat; }
  else if (page) _tsPage = page;
  _tsPayload.folder = TS_SERIES_ID;
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
        const res = await fetch(`${tsDataRoot(TS_SERIES_ID)}/sync_status.json?v=` + Date.now());
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