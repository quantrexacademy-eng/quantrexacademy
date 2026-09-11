#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "data", "tests", "jee_main_quizrr_pyq_chapter");

function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const qdir = path.join(ROOT, "questions");
const qfiles = fs.existsSync(qdir) ? fs.readdirSync(qdir).filter((f) => f.endsWith(".json")) : [];
let qs = 0, emptyStem = 0, badOpts = 0, nat = 0, natBad = 0, match = 0, matchBad = 0, needFig = 0, hasFig = 0, brokenHost = 0;
const broken = [];
for (const f of qfiles) {
  const arr = JSON.parse(fs.readFileSync(path.join(qdir, f), "utf8"));
  const list = Array.isArray(arr) ? arr : (arr.questions || []);
  list.forEach((q) => {
    qs += 1;
    const raw = String(q.q || q.question || "");
    const stem = strip(raw);
    const opts = q.options || [];
    const type = String(q.questionType || q.type || "");
    const isNum = /numerical|integer|nat/i.test(type) || (q.correctValue != null && !opts.length);
    if (isNum) nat += 1;
    if (/list[\s\-]*i|match the/i.test(stem)) match += 1;
    if (/<img/i.test(raw + opts.join(" "))) hasFig += 1;
    if (/https?:\/\/\.app\//i.test(raw + opts.join(" "))) brokenHost += 1;
    const flags = [];
    if (!stem || /^loading/i.test(stem)) flags.push("empty_stem");
    if (/list[\s\-]*i/i.test(stem) && !/<table/i.test(raw)) flags.push("match_no_table");
    if (/(following (reaction|compound|structure)|given (reaction|compound)|the figure)/i.test(stem)
      && !/<img/i.test(raw + opts.join(" "))) flags.push("need_fig");
    if (!isNum) {
      const good = opts.some((o) => {
        const t = strip(o);
        return (t && !/^[A-D]$/i.test(t)) || /<img/i.test(String(o || ""));
      });
      if (!opts.length || !good) flags.push("bad_opts");
    } else if (q.correctValue == null && q.answer == null) flags.push("nat_no_ans");
    if (flags.length) {
      if (flags.includes("empty_stem")) emptyStem += 1;
      if (flags.includes("bad_opts")) badOpts += 1;
      if (flags.includes("match_no_table")) matchBad += 1;
      if (flags.includes("need_fig")) needFig += 1;
      if (flags.includes("nat_no_ans")) natBad += 1;
      if (broken.length < 30) broken.push({ file: f, id: q.id, marks: q._marksId || "", flags, stem: stem.slice(0, 80) });
    }
  });
}
const man = fs.existsSync(path.join(ROOT, "manifest.json"))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"))
  : {};
console.log(JSON.stringify({
  files: qfiles.length,
  qs,
  emptyStem,
  badOpts,
  nat,
  natBad,
  match,
  matchBad,
  needFig,
  hasFig,
  brokenHost,
  manTitle: man.title,
  manCount: man.availableTests || man.totalTests,
  broken
}, null, 2));
