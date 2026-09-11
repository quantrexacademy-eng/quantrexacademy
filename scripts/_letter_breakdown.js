#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
function load(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function strip(s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function walk(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) { if (!n.startsWith("_")) walk(p, acc); }
    else if (n.endsWith(".json") && !n.includes(".bak") && !n.startsWith("_")) acc.push(p);
  }
  return acc;
}
function qsOf(j) { return !j ? [] : Array.isArray(j) ? j : (j.questions || []); }
function isNum(q) {
  return /numerical|integer|nat|subjective|fill|written/i.test(String(q.questionType || q.type || ""))
    || (q.correctValue != null && !(q.options || []).length);
}
function letterOnly(opts) {
  return opts && opts.length >= 2 && opts.every((o) => /^[A-D]$/i.test(strip(o)) && !/<img/i.test(String(o)));
}
function figTalk(stem) {
  return /\b(the figure|shown in (the )?(figure|diagram|graph)|shown below|as shown in)\b/i.test(stem);
}

const jobs = [
  ["banks", "data/banks"],
  ["books", "data/books/chapters"],
  ["quizrr", "data/tests/jee_main_quizrr_pyq_chapter/questions"],
  ["examgoal", "data/tests/jee_main_examgoal_2027/questions"],
  ["ncert", "data/ncert_offline/chapters"],
  ["board", "data/board_offline/chapters"]
];
const out = {};
for (const [label, rel] of jobs) {
  const files = walk(path.join(ROOT, rel), []);
  const c = {
    letter: 0, letterStemImg: 0, letterNoImg: 0, letterWithId: 0, letterNoId: 0,
    letterGasesABCD: 0, letterIdentifySet: 0,
    figNoImg: 0, figNoImgWithId: 0
  };
  const noImgSamples = [];
  files.forEach((p) => {
    qsOf(load(p)).forEach((q) => {
      const raw = String(q.q || q.question || "");
      const stem = strip(raw);
      const opts = q.options || [];
      const id = !!(q._marksId || q._quizrrId || q._examgoalId);
      if (!isNum(q) && letterOnly(opts)) {
        c.letter += 1;
        const img = /<img/i.test(raw);
        if (img) c.letterStemImg += 1; else c.letterNoImg += 1;
        if (id) c.letterWithId += 1; else c.letterNoId += 1;
        if (/\b[A-D]\b.*\b[A-D]\b.*\b[A-D]\b.*\b[A-D]\b/.test(stem) || /gases|divisions|particles A/i.test(stem)) c.letterGasesABCD += 1;
        if (/identify the correct set|energy levels|shown is figure|shown below/i.test(stem)) c.letterIdentifySet += 1;
        if (!img && noImgSamples.length < 4) {
          noImgSamples.push({ file: path.relative(ROOT, p), id: q.id, marks: q._marksId || "", stem: stem.slice(0, 90) });
        }
      }
      if (figTalk(stem) && !/<img/i.test(raw + opts.join(" "))) {
        c.figNoImg += 1;
        if (id) c.figNoImgWithId += 1;
      }
    });
  });
  c.noImgSamples = noImgSamples;
  out[label] = c;
}
console.log(JSON.stringify(out, null, 2));
