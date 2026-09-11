#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "data", "tests", "jee_main_quizrr_pyq_chapter", "questions");
let n = 0, withMarks = 0;
const ids = [];
fs.readdirSync(dir).filter((f) => f.endsWith(".json")).forEach((f) => {
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  (j.questions || []).forEach((q) => {
    if (!(q._needsAnswerKey || (q.answer == null && q.correctValue == null))) return;
    n++;
    if (q._marksId) { withMarks++; ids.push(q._marksId); }
  });
});
console.log(JSON.stringify({ leftover: n, withMarksId: withMarks, sampleMarks: ids.slice(0, 8) }));
