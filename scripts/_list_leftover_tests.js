#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
function load(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function strip(s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function isNum(q) {
  return /numerical|integer|nat|subjective|fill/i.test(String(q.questionType || q.type || ""));
}
function need(q) {
  return !!(q._needsAnswerKey || (q.answer == null && q.correctValue == null));
}
const tests = [];
const qzDir = path.join(ROOT, "data", "tests", "jee_main_quizrr_pyq_chapter", "questions");
fs.readdirSync(qzDir).filter((f) => f.endsWith(".json")).forEach((f) => {
  const j = load(path.join(qzDir, f));
  const qs = (j && j.questions) || [];
  const bad = qs.filter(need);
  if (!bad.length) return;
  tests.push({
    file: f,
    testId: j._quizrrTestId || f.replace(/^qz-|\.json$/g, ""),
    title: j.title || "",
    leftover: bad.length,
    nat: bad.filter(isNum).length,
    mcq: bad.filter((q) => !isNum(q)).length,
    qids: bad.map((q) => q._quizrrId).filter(Boolean)
  });
});
tests.sort((a, b) => b.leftover - a.leftover);
console.log(JSON.stringify({
  leftoverTests: tests.length,
  leftoverQs: tests.reduce((n, t) => n + t.leftover, 0),
  top: tests.slice(0, 12),
  allIds: tests.map((t) => t.testId)
}, null, 2));
fs.writeFileSync(path.join(ROOT, "data", "_migration", "leftover_quizrr_tests.json"), JSON.stringify(tests, null, 2));
