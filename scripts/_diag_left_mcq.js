#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
function load(p, fb) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (_) { return fb; } }
function strip(s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
const dir = path.join(ROOT, "data", "tests", "jee_main_quizrr_pyq_chapter", "questions");
const samples = [];
fs.readdirSync(dir).filter((f) => f.endsWith(".json")).forEach((f) => {
  (load(path.join(dir, f), {}).questions || []).forEach((q) => {
    if (!(q._needsAnswerKey || (q.answer == null && q.correctValue == null))) return;
    if (/numerical|integer|nat/i.test(String(q.questionType || ""))) return;
    if (samples.length < 10) samples.push({
      id: q._quizrrId, file: f,
      opts: (q.options || []).map((o) => strip(o).slice(0, 50)),
      stem: strip(q.q).slice(0, 110)
    });
  });
});
console.log(JSON.stringify(samples, null, 2));
