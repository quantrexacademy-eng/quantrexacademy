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
function broken(q) {
  const raw = String(q.q || q.question || "");
  const stem = strip(raw);
  const hasImg = /<img\b/i.test(raw + (q.options || []).join(" "));
  const letter = !isNum(q) && !optGood(q.options);
  const empty = (!stem || /^loading/i.test(stem)) && !hasImg;
  const noKey = q._needsAnswerKey || (q.answer == null && q.correctValue == null && !isNum(q) && (q.options || []).length);
  const natBad = isNum(q) && q.correctValue == null && q.answer == null;
  const saysFig = /\b(the figure|shown in (the )?(figure|diagram|graph)|shown below)\b/i.test(stem) && !hasImg;
  return { letter, empty, noKey, natBad, saysFig, any: letter || empty || noKey || natBad || saysFig };
}
function idsOf(q) {
  return {
    marks: q._marksId || q.marksId || "",
    quizrr: q._quizrrId || q.quizrrId || "",
    eg: q._examgoalId || ""
  };
}

const out = { marks: new Set(), quizrr: new Set(), both: 0, byKind: { letter: 0, empty: 0, noKey: 0, natBad: 0, saysFig: 0 } };
const samples = { marks: [], quizrr: [] };

function scan(qs, file) {
  (qs || []).forEach((q) => {
    const b = broken(q);
    if (!b.any) return;
    const ids = idsOf(q);
    if (ids.marks) out.marks.add(String(ids.marks));
    if (ids.quizrr) out.quizrr.add(String(ids.quizrr));
    if (ids.marks && ids.quizrr) out.both++;
    if (b.letter) out.byKind.letter++;
    if (b.empty) out.byKind.empty++;
    if (b.noKey) out.byKind.noKey++;
    if (b.natBad) out.byKind.natBad++;
    if (b.saysFig) out.byKind.saysFig++;
    if (ids.marks && samples.marks.length < 4) samples.marks.push({ file, id: q.id, marks: ids.marks, letter: b.letter, noKey: b.noKey, nat: b.natBad });
    if (ids.quizrr && samples.quizrr.length < 4) samples.quizrr.push({ file, id: q.id, quizrr: ids.quizrr, noKey: b.noKey, letter: b.letter });
  });
}
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((n) => {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) return walk(p);
    if (!n.endsWith(".json") || n.includes(".bak") || n.startsWith("_")) return;
    const j = load(p);
    scan(j && (j.questions || (Array.isArray(j) ? j : null)), path.relative(ROOT, p));
  });
}
walk(path.join(ROOT, "data", "banks"));
walk(path.join(ROOT, "data", "books", "chapters"));
walk(path.join(ROOT, "data", "tests"));

const cfg = load(path.join(ROOT, "data", "marks_config.json")) || {};
let tok = { alive: false };
try {
  const p = JSON.parse(Buffer.from(String(cfg.token || "").split(".")[1], "base64").toString("utf8"));
  tok = { email: cfg.email, exp: new Date(p.exp * 1000).toISOString(), alive: p.exp * 1000 > Date.now() + 60000 };
} catch (_) {}

console.log(JSON.stringify({
  uniqueMarksIds: out.marks.size,
  uniqueQuizrrIds: out.quizrr.size,
  both: out.both,
  byKind: out.byKind,
  samples,
  marksToken: tok
}, null, 2));
