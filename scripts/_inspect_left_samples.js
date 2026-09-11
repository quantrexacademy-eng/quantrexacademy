#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const report = require(path.join(ROOT, "data", "_migration", "complete_proofread_1908.json"));

function load(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function strip(s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function qsOf(j) { return !j ? [] : Array.isArray(j) ? j : (j.questions || []); }

const picks = [];
function take(area, flag, n) {
  const arr = ((report.samples[area] || {})[flag] || []).slice(0, n);
  arr.forEach((s) => picks.push({ area, flag, ...s }));
}
take("banks", "letter_only_opts", 4);
take("banks", "says_fig_no_img", 3);
take("banks", "match_no_table", 3);
take("banks", "shattered_tex", 3);
take("banks", "no_options", 2);
take("books", "letter_only_opts", 6);
take("books", "says_fig_no_img", 4);
take("books", "no_options", 2);
take("examgoal", "letter_only_opts", 1);
take("quizrr_pyq", "letter_only_opts", 6);
take("quizrr_pyq", "says_fig_no_img", 2);
take("ncert", "letter_only_opts", 3);
take("board", "letter_only_opts", 2);

const out = [];
for (const s of picks) {
  const abs = path.join(ROOT, s.file);
  const j = load(abs);
  const qs = qsOf(j);
  const q = qs.find((x) => String(x.id) === String(s.id)) || qs.find((x) => String(x._marksId || "") === String(s.marks) && s.marks);
  if (!q) { out.push({ ...s, found: false }); continue; }
  const opts = (q.options || []).map((o) => ({
    img: /<img/i.test(String(o || "")),
    t: strip(o).slice(0, 40)
  }));
  out.push({
    area: s.area,
    flag: s.flag,
    id: q.id,
    marks: q._marksId || "",
    quizrr: q._quizrrId || "",
    type: q.questionType || q.type || "",
    nOpts: (q.options || []).length,
    opts,
    stemImg: /<img/i.test(String(q.q || "")),
    solLen: strip(q.solution || q.explanation || "").length,
    stem: strip(q.q || q.question).slice(0, 110)
  });
}
console.log(JSON.stringify(out, null, 2));
