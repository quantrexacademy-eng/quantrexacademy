#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
function load(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (_) { return null; } }
function strip(s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function isNum(q) {
  return /numerical|integer|nat|subjective|fill|written/i.test(String(q.questionType || q.type || ""))
    || (q.correctValue != null && !(q.options || []).length);
}
function optGood(opts) {
  return (opts || []).some((o) => {
    const s = String(o || "");
    const t = strip(s);
    return /<img\b/i.test(s) || (t && !/^[A-D]$/i.test(t));
  });
}
function flags(q) {
  const raw = String(q.q || q.question || "");
  const stem = strip(raw);
  const hasImg = /<img\b/i.test(raw + (q.options || []).join(" "));
  const letter = !isNum(q) && !optGood(q.options);
  const empty = (!stem || /^loading/i.test(stem)) && !hasImg;
  const noKey = !!(q._needsAnswerKey || (q.answer == null && q.correctValue == null && !isNum(q) && (q.options || []).length));
  const natBad = isNum(q) && q.correctValue == null && q.answer == null;
  const saysFig = /\b(the figure|shown in (the )?(figure|diagram|graph)|shown below)\b/i.test(stem) && !hasImg;
  const hasAns = q.answer != null || q.correctValue != null;
  return { letter, empty, noKey, natBad, saysFig, hasImg, hasAns, stemLen: stem.length };
}

const qidDir = path.join(ROOT, "data", "qid_marks");
const marksHaveCache = new Set(fs.existsSync(qidDir) ? fs.readdirSync(qidDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")) : []);

const marks = { ids: new Set(), qs: 0, cached: 0, uncached: 0, byKind: {}, byFile: {}, samples: [] };
const quizrr = { ids: new Set(), tests: new Set(), qs: 0, noKey: 0, letter: 0, empty: 0, natBad: 0, saysFig: 0, hasSol: 0, samples: [] };

function bump(map, k) { map[k] = (map[k] || 0) + 1; }

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((n) => {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) return walk(p);
    if (!n.endsWith(".json") || n.includes(".bak") || n.startsWith("_")) return;
    const j = load(p);
    const qs = j && (j.questions || (Array.isArray(j) ? j : null));
    if (!qs) return;
    const rel = path.relative(ROOT, p);
    qs.forEach((q) => {
      const f = flags(q);
      const mid = q._marksId || q.marksId || "";
      const qid = q._quizrrId || q.quizrrId || "";
      const broken = f.letter || f.empty || f.noKey || f.natBad || f.saysFig;
      if (!broken) return;
      if (mid) {
        marks.qs++;
        marks.ids.add(String(mid));
        if (marksHaveCache.has(String(mid))) marks.cached++;
        else marks.uncached++;
        if (f.letter) bump(marks.byKind, "letter");
        if (f.empty) bump(marks.byKind, "empty");
        if (f.noKey) bump(marks.byKind, "noKey");
        if (f.natBad) bump(marks.byKind, "natBad");
        if (f.saysFig) bump(marks.byKind, "saysFig");
        if (f.hasAns) bump(marks.byKind, "hasAns");
        bump(marks.byFile, rel.split(path.sep)[2] || rel);
        if (marks.samples.length < 6) marks.samples.push({ file: rel, id: q.id, mid, letter: f.letter, empty: f.empty, noKey: f.noKey, nat: f.natBad, fig: f.saysFig, hasAns: f.hasAns, stem: strip(q.q).slice(0, 70) });
      }
      if (qid) {
        quizrr.qs++;
        quizrr.ids.add(String(qid));
        if (q._quizrrTestId || q._testId) quizrr.tests.add(String(q._quizrrTestId || q._testId));
        if (j && j._quizrrTestId) quizrr.tests.add(String(j._quizrrTestId));
        if (f.noKey) quizrr.noKey++;
        if (f.letter) quizrr.letter++;
        if (f.empty) quizrr.empty++;
        if (f.natBad) quizrr.natBad++;
        if (f.saysFig) quizrr.saysFig++;
        if (strip(q.solution).length > 20) quizrr.hasSol++;
        if (quizrr.samples.length < 4) quizrr.samples.push({ file: rel, id: q.id, qid, noKey: f.noKey, letter: f.letter, sol: strip(q.solution).slice(0, 40), stem: strip(q.q).slice(0, 70) });
      }
    });
  });
}
walk(path.join(ROOT, "data", "banks"));
walk(path.join(ROOT, "data", "books", "chapters"));
walk(path.join(ROOT, "data", "tests"));

// How many leftover quizrr tests from question files
const qzDir = path.join(ROOT, "data", "tests", "jee_main_quizrr_pyq_chapter", "questions");
const leftoverTests = [];
if (fs.existsSync(qzDir)) {
  fs.readdirSync(qzDir).filter((f) => f.endsWith(".json")).forEach((f) => {
    const j = load(path.join(qzDir, f));
    const qs = (j && j.questions) || [];
    const bad = qs.filter((q) => {
      const fl = flags(q);
      return fl.noKey || fl.letter || fl.empty || fl.natBad || fl.saysFig;
    });
    if (bad.length) leftoverTests.push({ file: f, test: j._quizrrTestId || f.replace(/^qz-|\.json$/g, ""), n: bad.length, noKey: bad.filter((q) => flags(q).noKey).length });
  });
}

console.log(JSON.stringify({
  marks: { uniqueIds: marks.ids.size, qs: marks.qs, cachedQs: marks.cached, uncachedQs: marks.uncached, byKind: marks.byKind, byFile: marks.byFile, samples: marks.samples },
  quizrr: { uniqueIds: quizrr.ids.size, qs: quizrr.qs, leftoverTests: leftoverTests.length, testsFromQ: quizrr.tests.size, noKey: quizrr.noKey, letter: quizrr.letter, empty: quizrr.empty, natBad: quizrr.natBad, saysFig: quizrr.saysFig, hasSol: quizrr.hasSol, samples: quizrr.samples, topTests: leftoverTests.sort((a, b) => b.n - a.n).slice(0, 8) }
}, null, 2));
