#!/usr/bin/env node
/**
 * Convert official ExamGOAL harvest (_eg_raw) into Quantrex question shards.
 * Never invents stems/options/solutions. Only copies official fields.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

const ROOT = path.resolve(__dirname, "..");
const PACK = path.join(ROOT, "data", "tests", "jee_main_examgoal_2027");
const RAW_DIR = path.join(PACK, "_eg_raw");
const QDIR = path.join(PACK, "questions");
const CATDIR = path.join(PACK, "categories");
const META_DIR = path.join(PACK, "instruction_meta");

function loadJson(p, fb) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (_) {
    return fb;
  }
}
function saveJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj));
}
function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function proof(s) {
  return String(s == null ? "" : s);
}
function titleCaseSlug(s) {
  return String(s || "")
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
function stableId(egId) {
  const crc = zlib.crc32(Buffer.from(String(egId || ""), "utf8"));
  return crc >>> 0;
}
function isNumType(t, opts, answer) {
  const s = String(t || "").toLowerCase();
  if (/numerical|integer|nat|numeric/.test(s)) return true;
  if ((!opts || !opts.length) && answer != null && answer !== "") return true;
  return false;
}
function optContents(en) {
  const opts = en.options || [];
  return opts.map((o) => {
    if (typeof o === "string") return o;
    return o && (o.content || o.text || o.html || "") || "";
  });
}
function answerFromOfficial(en, type) {
  const opts = en.options || [];
  if (isNumType(type, opts, en.answer)) {
    const v = en.answer != null && en.answer !== "" ? en.answer : null;
    return { answer: v == null ? null : String(v), correctValue: v == null ? null : String(v), isNum: true };
  }
  const co = en.correct_options;
  if (Array.isArray(co) && co.length) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const idxs = co.map((x) => {
      if (typeof x === "number") return x;
      const ch = String(x).trim().toUpperCase();
      const i = letters.indexOf(ch);
      if (i >= 0) return i;
      const n = parseInt(ch, 10);
      return Number.isFinite(n) ? n : -1;
    }).filter((i) => i >= 0);
    if (idxs.length === 1) return { answer: idxs[0], correctValue: null, isNum: false };
    if (idxs.length > 1) return { answer: idxs[0], answers: idxs, correctValue: null, isNum: false };
  }
  if (en.answer != null && en.answer !== "") {
    const ch = String(en.answer).trim().toUpperCase();
    const i = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(ch);
    if (i >= 0) return { answer: i, correctValue: null, isNum: false };
    return { answer: String(en.answer), correctValue: String(en.answer), isNum: true };
  }
  return { answer: null, correctValue: null, isNum: false };
}
function officialQToLocal(q, existing) {
  const qid = q.questionId || q.question_id || (existing && existing._examgoalId) || "";
  const en = ((q.question || {}).en) || {};
  const type = q.type || (existing && (existing.questionType || existing.type)) || "mcq";
  const content = proof(en.content || "");
  const direction = proof(en.direction || "");
  const comprehension = proof(en.comprehension || "");
  let stem = content;
  if (direction && !stem.includes(direction)) stem = direction + stem;
  if (comprehension && !stem.includes(comprehension)) stem = comprehension + stem;
  const opts = optContents(en);
  const sol = proof(en.explanation || en.hiddenExplanation || "");
  const key = answerFromOfficial(en, type);
  const subject = titleCaseSlug(q.subject || (existing && existing.subject) || "");
  const chapter = titleCaseSlug(q.chapter || (existing && existing.chapter) || "");
  const out = existing && typeof existing === "object" ? Object.assign({}, existing) : {};
  out.id = existing && existing.id != null ? existing.id : stableId(qid);
  out.subject = out.subject || subject;
  out.chapter = out.chapter || chapter;
  if (stem && (!strip(out.q || out.question) || strip(stem).length >= strip(out.q || out.question).length || (/<img/i.test(stem) && !/<img/i.test(String(out.q || ""))))) {
    out.q = stem;
    out.question = stem;
  }
  if (opts.length) {
    const existingOpts = out.options || [];
    const better = opts.some((o, i) => {
      const t = strip(o);
      const old = strip(existingOpts[i]);
      return (t && !/^[A-D]$/i.test(t) && (!old || /^[A-D]$/i.test(old) || t.length > old.length)) || /<img/i.test(o);
    });
    if (!existingOpts.length || better) out.options = opts;
  }
  if (key.isNum) {
    out.type = "numerical";
    out.questionType = "numerical";
    if (key.answer != null) {
      out.answer = key.answer;
      out.correctValue = key.correctValue;
    }
  } else {
    out.type = out.type || "mcq";
    out.questionType = out.questionType || "mcq";
    if (key.answer != null && (out.answer == null || out.answer === "" || out._needsAnswerKey)) {
      out.answer = key.answer;
    }
    if (key.answers) out.answers = key.answers;
  }
  const oldSol = String(out.solution || out.explanation || "");
  const solBetter =
    !!sol &&
    (strip(sol).length > strip(oldSol).length ||
      (/<img/i.test(sol) && !/<img/i.test(oldSol)) ||
      (!oldSol && sol.length > 0));
  if (solBetter) {
    out.solution = sol;
    out.explanation = sol;
  }
  out.source = out.source || "ExamGoal JEE Main 2027";
  out._examgoalId = qid;
  out._bank = "examgoal_2027";
  if (out._needsAnswerKey && (out.answer != null || out.correctValue != null)) delete out._needsAnswerKey;
  return out;
}

function betterThan(a, b) {
  const sa = strip(a.solution || a.explanation);
  const sb = strip(b.solution || b.explanation);
  const qa = strip(a.q || a.question);
  const qb = strip(b.q || b.question);
  const oa = (a.options || []).filter((o) => strip(o) && !/^[A-D]$/i.test(strip(o)) || /<img/i.test(String(o))).length;
  const ob = (b.options || []).filter((o) => strip(o) && !/^[A-D]$/i.test(strip(o)) || /<img/i.test(String(o))).length;
  return (sa.length > sb.length) || (qa.length > qb.length) || (oa > ob);
}

function flattenOfficial(raw) {
  const test = raw.test || raw.data || raw;
  const secs = (test && test.sections) || [];
  const out = [];
  secs.forEach((sec) => {
    (sec.questions || []).forEach((q) => out.push(q));
  });
  if (!out.length && Array.isArray(raw.questions)) {
    raw.questions.forEach((q) => {
      if (q && q.questionId) out.push(q);
    });
  }
  return out;
}

function findCatFilesForTest(tid) {
  const files = fs.readdirSync(CATDIR).filter((f) => f.endsWith(".json"));
  const hits = [];
  for (const f of files) {
    const j = loadJson(path.join(CATDIR, f), null);
    const tests = (j && j.tests) || [];
    if (tests.some((t) => (t.id || t.testId || t.examgoalId) === tid)) hits.push(f);
  }
  return hits;
}

function main() {
  if (!fs.existsSync(RAW_DIR)) {
    console.log(JSON.stringify({ error: "no raw dir" }));
    return;
  }
  const rawFiles = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith(".json"));
  const stats = {
    raw: rawFiles.length,
    appliedTests: 0,
    skippedNotLive: 0,
    skippedEmpty: 0,
    questionsWritten: 0,
    solsFilled: 0,
    stemsFilled: 0,
    optsFilled: 0,
    newTests: 0
  };
  const applied = [];

  for (const f of rawFiles) {
    const raw = loadJson(path.join(RAW_DIR, f), null);
    if (!raw) continue;
    if (raw.status === "not_live" || raw._fetch_error === "upcoming") {
      stats.skippedNotLive += 1;
      continue;
    }
    const tid = raw.testId || f.replace(/\.json$/, "");
    const officialQs = flattenOfficial(raw);
    if (!officialQs.length) {
      stats.skippedEmpty += 1;
      continue;
    }
    const existingPath = path.join(QDIR, tid + ".json");
    const existing = loadJson(existingPath, []);
    const existingList = Array.isArray(existing) ? existing : existing.questions || [];
    const byEg = new Map();
    existingList.forEach((q) => {
      if (q && q._examgoalId) byEg.set(String(q._examgoalId), q);
    });
    const merged = [];
    let sols = 0, stems = 0, opts = 0;
    officialQs.forEach((oq) => {
      const qid = String(oq.questionId || oq.question_id || "");
      const prev = byEg.get(qid) || null;
      const next = officialQToLocal(oq, prev);
      const prevSol = String((prev && (prev.solution || prev.explanation)) || "");
      const nextSol = String(next.solution || next.explanation || "");
      if ((!strip(prevSol) && !/<img/i.test(prevSol)) && (strip(nextSol) || /<img/i.test(nextSol))) sols += 1;
      if (!strip(prev && (prev.q || prev.question)) && strip(next.q || next.question)) stems += 1;
      const prevGoodOpt = (prev && prev.options || []).some((o) => strip(o) && !/^[A-D]$/i.test(strip(o)) || /<img/i.test(String(o)));
      const nextGoodOpt = (next.options || []).some((o) => strip(o) && !/^[A-D]$/i.test(strip(o)) || /<img/i.test(String(o)));
      if (!prevGoodOpt && nextGoodOpt) opts += 1;
      merged.push(next);
    });
    if (!existingList.length) stats.newTests += 1;
    saveJson(existingPath, merged);
    stats.appliedTests += 1;
    stats.questionsWritten += merged.length;
    stats.solsFilled += sols;
    stats.stemsFilled += stems;
    stats.optsFilled += opts;

    const testMeta = raw.test || {};
    const liveAt = raw.liveAt || testMeta.liveAt || "";
    const title = raw.title || testMeta.title || tid;
    const qids = merged.map((q) => q.id);
    findCatFilesForTest(tid).forEach((catFile) => {
      const cp = path.join(CATDIR, catFile);
      const cat = loadJson(cp, {});
      const tests = cat.tests || [];
      tests.forEach((t) => {
        if ((t.id || t.testId || t.examgoalId) !== tid) return;
        t.status = "available";
        t.upcoming = false;
        t.totalQs = merged.length;
        t.questionIds = qids;
        if (liveAt) t.liveAt = liveAt;
        if (t.examgoalMeta) {
          t.examgoalMeta.isUpcoming = false;
          if (liveAt) t.examgoalMeta.liveAt = liveAt;
        }
      });
      cat.tests = tests;
      saveJson(cp, cat);
    });
    const im = {
      examgoalId: tid,
      title,
      totalQuestions: merged.length,
      totalTime: testMeta.timeAllotted || undefined,
      totalMarks: testMeta.maxMarks || undefined,
      subjects: testMeta.subjects || undefined,
      sections: (testMeta.sections || []).map((s) => ({
        id: s.id,
        title: s.title,
        totalQuestions: (s.questions || []).length,
        maxMarks: s.maxMarks
      })),
      syllabus: testMeta.syllabus || raw._meta && raw._meta.syllabus,
      layout: testMeta.layout || "nta",
      policy: testMeta.policy || "jee-main"
    };
    saveJson(path.join(META_DIR, tid + ".json"), im);
    applied.push({ tid, title, n: merged.length, sols, stems, opts, new: !existingList.length });
  }

  const man = loadJson(path.join(PACK, "manifest.json"), {});
  const qfiles = fs.readdirSync(QDIR).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  let available = 0, upcoming = 0;
  const catFiles = (man.categories || []).map((c) => c.file).filter(Boolean);
  catFiles.forEach((rel) => {
    const cat = loadJson(path.join(PACK, rel), null);
    if (!cat || !Array.isArray(cat.tests)) return;
    cat.tests.forEach((t) => {
      if (t.status === "upcoming" || t.upcoming) upcoming += 1;
      else available += 1;
    });
  });
  if (Array.isArray(man.tests)) {
    man.tests.forEach((t) => {
      const has = fs.existsSync(path.join(QDIR, t.id + ".json"));
      if (has) {
        t.status = "available";
        const arr = loadJson(path.join(QDIR, t.id + ".json"), []);
        t.totalQs = Array.isArray(arr) ? arr.length : (arr.questions || []).length;
      }
    });
  }
  man.availableTests = available;
  man.upcomingTests = upcoming;
  man.questionShards = qfiles.length;
  man.syncedAt = new Date().toISOString();
  fs.writeFileSync(path.join(PACK, "manifest.json"), JSON.stringify(man, null, 2));
  fs.writeFileSync(path.join(PACK, "sync_status.json"), JSON.stringify({
    hash: "examgoal-" + qfiles.length + "-" + (available + upcoming),
    syncedAt: man.syncedAt,
    testCount: available + upcoming,
    availableCount: available,
    upcomingCount: upcoming,
    questionShards: qfiles.length,
    message: available + " tests available · " + upcoming + " upcoming · " + qfiles.length + " with questions"
  }, null, 2));

  const report = { stats, applied: applied.slice(0, 80), appliedCount: applied.length };
  fs.writeFileSync(path.join(PACK, "_eg_apply_report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(stats, null, 2));
}

main();
