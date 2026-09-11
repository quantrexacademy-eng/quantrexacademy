/** Server catalog — chapter_meta + test manifests. Never returns a full bank. */
const fs = require("fs");
const path = require("path");
let _ownedFigs = null;
try { _ownedFigs = require("../qx-owned-figures"); } catch (_) { _ownedFigs = null; }

const ROOT = path.resolve(__dirname, "..");
const META = path.join(ROOT, "data", "nav", "chapter_meta");
const PAPER_IDS_DIR = path.join(ROOT, "data", "nav", "pyq_paper_ids");
const BANK_INDEX_PATH = path.join(ROOT, "data.js");
const _paperIdMaps = Object.create(null);

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function safeJoin(...parts) {
  const rel = path.join(...parts);
  const abs = path.resolve(rel);
  if (!abs.startsWith(path.resolve(ROOT, "data"))) return null;
  return abs;
}

function readJson(abs) {
  if (!abs || !fs.existsSync(abs)) return null;
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

function listExams() {
  if (!fs.existsSync(META)) return [];
  return fs.readdirSync(META, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function listSubjects(exam) {
  const dir = safeJoin(META, exam);
  if (!dir || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function listChapters(exam, subject) {
  const dir = safeJoin(META, exam, subject);
  if (!dir || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const j = readJson(path.join(dir, f)) || {};
      const count = (j.buckets || []).reduce((s, b) => s + (b.count || (b.questionIds || []).length || 0), 0)
        || (j.questionIds || []).length
        || 0;
      return {
        file: f,
        chapter: j.chapter || f.replace(/\.json$/, ""),
        chapterId: j.chapterId || "",
        subject: j.subject || subject,
        count
      };
    });
}

function loadChapterMeta(exam, subject, chapter) {
  const dir = safeJoin(META, exam, subject);
  if (!dir) return null;
  const want = slugify(chapter);
  const file = path.join(dir, want + ".json");
  if (fs.existsSync(file)) return readJson(file);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    const j = readJson(path.join(dir, f));
    if (j && (slugify(j.chapter) === want || j.chapter === chapter || j.chapterId === chapter)) return j;
  }
  return null;
}

function idsFromMeta(meta, topicId, bucketId) {
  if (!meta) return [];
  if (topicId && Array.isArray(meta.topics)) {
    const t = meta.topics.find((x) => x.id === topicId || x.title === topicId);
    if (t && t.questionIds) return t.questionIds.map(String);
  }
  if (bucketId && Array.isArray(meta.buckets)) {
    const b = meta.buckets.find((x) => x.id === bucketId || x.title === bucketId);
    if (b && b.questionIds) return b.questionIds.map(String);
  }
  const ids = [];
  (meta.buckets || []).forEach((b) => (b.questionIds || []).forEach((id) => ids.push(String(id))));
  (meta.topics || []).forEach((t) => (t.questionIds || []).forEach((id) => ids.push(String(id))));
  (meta.questionIds || []).forEach((id) => ids.push(String(id)));
  return [...new Set(ids)];
}

function handleCatalog(query) {
  const action = String(query.action || query.op || "").toLowerCase();
  const exam = String(query.exam || query.courseId || "").trim();
  const subject = String(query.subject || "").trim();
  const chapter = String(query.chapter || "").trim();
  const limit = Math.min(80, Math.max(1, parseInt(query.limit, 10) || 40));
  const cursor = Math.max(0, parseInt(query.cursor, 10) || 0);

  if (action === "courses" || action === "exams" || action === "toc") {
    const exams = listExams();
    if (!exam) {
      return { ok: true, exams: exams.map((id) => ({ id, subjects: listSubjects(id) })) };
    }
    return {
      ok: true,
      exam,
      subjects: listSubjects(exam).map((s) => ({
        id: s,
        name: s,
        chapters: listChapters(exam, s)
      }))
    };
  }

  if (action === "chapters") {
    if (!exam || !subject) return { ok: false, error: "exam and subject required" };
    return { ok: true, exam, subject, chapters: listChapters(exam, subject) };
  }

  if (action === "questions" || action === "chapter") {
    if (!exam || !subject || !chapter) return { ok: false, error: "exam, subject, chapter required" };
    const meta = loadChapterMeta(exam, subject, chapter);
    if (!meta) return { ok: false, error: "chapter not found" };
    const ids = idsFromMeta(meta, query.topicId, query.bucketId);
    const slice = ids.slice(cursor, cursor + limit);
    return {
      ok: true,
      exam,
      subject,
      chapter: meta.chapter || chapter,
      chapterId: meta.chapterId || "",
      total: ids.length,
      cursor,
      nextCursor: cursor + slice.length < ids.length ? cursor + slice.length : null,
      questionIds: slice,
      topics: (meta.topics || []).map((t) => ({ id: t.id, title: t.title, count: t.count || (t.questionIds || []).length })),
      buckets: (meta.buckets || []).map((b) => ({ id: b.id, title: b.title, count: b.count || (b.questionIds || []).length }))
    };
  }

  if (action === "tests") {
    const man = readJson(path.join(ROOT, "data", "tests", "jee_main_examgoal_2027", "manifest.json"));
    if (!man) return { ok: false, error: "test series not found" };
    return {
      ok: true,
      testId: man.id,
      title: man.title,
      exam: man.exam,
      totalTests: man.totalTests,
      availableTests: man.availableTests,
      sections: man.sections,
      categories: (man.categories || []).map((c) => ({
        id: c.id,
        title: c.title,
        section: c.section,
        count: c.count
      }))
    };
  }

  if (action === "paper") {
    const exam = String(query.exam || query.slug || query.bank || "jee_main").trim();
    const source = String(query.source || query.src || "").replace(/\s+/g, " ").trim();
    if (!source) return { ok: false, error: "source required" };
    const questions = findPaperQuestions(exam, source);
    return { ok: true, exam, source, count: questions.length, questions };
  }

  if (action === "q" || action === "qs" || action === "question") {
    const rawIds = String(query.id || query.ids || query.qid || "").split(/[, ]+/).filter(Boolean).slice(0, 90);
    if (!rawIds.length) return { ok: false, error: "id required" };
    const hint = String(query.exam || query.slug || query.bank || "").trim();
    const questions = rawIds.map((id) => findBankQuestion(id, hint)).filter(Boolean);
    return { ok: true, question: questions[0] || null, questions };
  }

  return { ok: false, error: "unknown action" };
}

const BANK_FILES = [
  "neet.json",
  "jee_main.json",
  "nta_abhyas_neet.json",
  "nta_abhyas_jee_main.json",
  "jee_advanced.json",
  "aiims.json",
  "jipmer.json",
  "mht_cet.json",
  "mht_cet_medical.json",
  "ap_eamcet.json",
  "ts_eamcet.json",
  "nda.json",
  "bitsat.json",
  "wbjee.json",
  "kcet.json",
  "comedk.json",
  "viteee.json",
  "kvpy.json",
  "manipal_met.json",
  "nest_niser.json",
  "iat_iiser.json",
  "dpp.json"
];
const _bankLoaded = Object.create(null);
const _qIndex = Object.create(null);
const _bankQs = Object.create(null);

function slimBankQ(q, bank) {
  if (!q) return null;
  let proof = null;
  try { proof = require("./qx-proofread"); } catch (_) { proof = null; }
  const clean = (s) => {
    let t = String(s || "");
    if (proof && proof.proofreadHtml) t = proof.proofreadHtml(t);
    else {
      t = t
        .replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/")
        .replace(/https?:\/\/cdn-question-pool\.app\//gi, "https://cdn-question-pool.getmarks.app/")
        .replace(/\$\{\s*\}\s*\^\{\s*([^}]+)\s*\}\s*C_\{\s*([^}]+)\s*\}\s*\$/g, "$\\binom{$1}{$2}$")
        .replace(/\$\{\s*\^\{\s*([^}]+)\s*\}\s*C_\{\s*([^}]+)\s*\}\s*\$/g, "$\\binom{$1}{$2}$");
    }
    if (_ownedFigs && _ownedFigs.rewriteHtml) t = _ownedFigs.rewriteHtml(t);
    return t;
  };
  const opts = Array.isArray(q.options) ? q.options.map(clean) : [];
  return {
    id: q.id,
    _marksId: q._marksId || "",
    q: clean(q.q || q.question || ""),
    options: opts,
    answer: q.answer,
    answers: q.answers || null,
    questionType: q.questionType || q.type || "singleCorrect",
    type: q.type || q.questionType || "",
    correctValue: q.correctValue,
    solution: clean(q.solution || ""),
    explanation: clean(q.explanation || ""),
    subject: q.subject || "",
    chapter: q.chapter || "",
    source: q.source || "",
    difficulty: q.difficulty || "",
    year: q.year || "",
    _bank: bank,
    _columnMatch: !!(q._columnMatch || q._matchList)
  };
}

function indexBankFile(file) {
  if (_bankLoaded[file]) return;
  _bankLoaded[file] = true;
  const abs = path.join(ROOT, "data", "banks", file);
  if (!abs.startsWith(path.resolve(ROOT, "data")) || !fs.existsSync(abs)) return;
  let data;
  try { data = JSON.parse(fs.readFileSync(abs, "utf8")); } catch (_) { return; }
  const bank = file.replace(/\.json$/i, "");
  const qs = (data && data.questions) || [];
  const uniq = [];
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    if (!q) continue;
    const slim = slimBankQ(q, bank);
    uniq.push(slim);
    if (slim.id != null) _qIndex[String(slim.id)] = slim;
    if (slim._marksId) _qIndex[String(slim._marksId)] = slim;
  }
  _bankQs[bank] = uniq;
}

function loadPaperIdMap(exam) {
  const file = String(exam || "").replace(/[^\w-]+/g, "_") + ".json";
  if (_paperIdMaps[file]) return _paperIdMaps[file];
  const abs = path.join(PAPER_IDS_DIR, file);
  if (!abs.startsWith(path.resolve(ROOT, "data")) || !fs.existsSync(abs)) {
    _paperIdMaps[file] = {};
    return _paperIdMaps[file];
  }
  try {
    _paperIdMaps[file] = JSON.parse(fs.readFileSync(abs, "utf8")) || {};
  } catch (_) {
    _paperIdMaps[file] = {};
  }
  return _paperIdMaps[file];
}

function findPaperQuestions(exam, source) {
  const file = String(exam || "").replace(/[^\w-]+/g, "_") + ".json";
  indexBankFile(file);
  const wantRaw = String(source || "").replace(/\s+/g, " ").trim();
  const want = wantRaw.toLowerCase();
  if (!want) return [];
  const idMap = loadPaperIdMap(exam);
  const ids = idMap[wantRaw] || idMap[source] || [];
  if (ids.length) {
    const out = [];
    const seen = Object.create(null);
    for (let i = 0; i < ids.length && out.length < 220; i++) {
      const sid = String(ids[i] || "");
      if (!sid || seen[sid]) continue;
      const q = _qIndex[sid];
      if (q) {
        seen[sid] = 1;
        out.push(q);
      }
    }
    if (out.length) return out;
  }
  const list = _bankQs[exam] || [];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const q = list[i];
    const a = String(q.source || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (a === want) out.push(q);
    if (out.length >= 220) break;
  }
  return out;
}

function findBankQuestion(id, examHint) {
  const sid = String(id || "").trim();
  if (!sid) return null;
  if (_qIndex[sid]) return _qIndex[sid];
  const hint = String(examHint || "").replace(/[^\w-]+/g, "_");
  if (hint) {
    const hinted = hint.endsWith(".json") ? hint : hint + ".json";
    indexBankFile(hinted);
    if (_qIndex[sid]) return _qIndex[sid];
  }
  for (let i = 0; i < BANK_FILES.length; i++) {
    indexBankFile(BANK_FILES[i]);
    if (_qIndex[sid]) return _qIndex[sid];
  }
  return null;
}

module.exports = { handleCatalog, slugify, loadChapterMeta, findBankQuestion, findPaperQuestions, slimBankQ, BANK_FILES };
