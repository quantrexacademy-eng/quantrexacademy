#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const dir = path.join(ROOT, "data", "tests", "jee_main_quizrr_pyq_chapter", "questions");
function load(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function strip(s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function isNum(q) {
  return /numerical|integer|nat/i.test(String(q.questionType || q.type || ""));
}
const out = { n: 0, nat: 0, mcq: 0, hasSol: 0, letter: 0, emptyOpts: 0, samples: [] };
fs.readdirSync(dir).filter((f) => f.endsWith(".json")).forEach((f) => {
  const qs = load(path.join(dir, f)).questions || [];
  qs.forEach((q) => {
    if (!(q._needsAnswerKey || (q.answer == null && q.correctValue == null))) return;
    out.n++;
    if (isNum(q)) out.nat++; else out.mcq++;
    if (strip(q.solution).length > 15) out.hasSol++;
    const opts = q.options || [];
    if (opts.every((o) => !strip(o))) out.emptyOpts++;
    if (out.samples.length < 8) {
      out.samples.push({
        file: f,
        id: q._quizrrId,
        type: q.questionType,
        opts: (opts || []).map((o) => strip(o).slice(0, 40)),
        stem: strip(q.q).slice(0, 90),
        sol: strip(q.solution).slice(0, 50)
      });
    }
  });
});
console.log(JSON.stringify(out, null, 2));
