#!/usr/bin/env node
"use strict";
const fs = require("fs");
const t = fs.readFileSync("C:/Users/Admin/quizrr_login/quizrr_index.js", "utf8");
const needles = [
  "tempTestDetails", "startTest", "start-test", "submitTest", "endTest",
  "finishTest", "/api/test", "check-submission", "detailedAnalysis",
  "solution/", "bonusAttempt", "language"
];
for (const n of needles) {
  let i = 0, c = 0;
  while (c < 4) {
    const p = t.indexOf(n, i);
    if (p < 0) break;
    console.log("\n===", n, "at", p, "===");
    console.log(t.slice(Math.max(0, p - 180), p + 220).replace(/\n/g, " "));
    i = p + n.length;
    c++;
  }
}
