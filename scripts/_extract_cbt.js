#!/usr/bin/env node
"use strict";
const fs = require("fs");
const t = fs.readFileSync("C:/Users/Admin/quizrr_login/quizrr_index.js", "utf8");
const needles = [
  "test-platform", "testplatform", "cbt.", "submitTest", "endTest",
  "finishTest", "isSubmitted", "submitPaper", "language=en",
  "tempTestDetails", "check-submission", "Start Test", "startTest",
  "https://test", "app.quizrr.in/tests", "/attempt/", "question-paper"
];
for (const n of needles) {
  let i = 0, c = 0;
  while (c < 3) {
    const p = t.indexOf(n, i);
    if (p < 0) break;
    const sl = t.slice(Math.max(0, p - 160), p + 200).replace(/\s+/g, " ");
    if (/api|http|submit|test|goto|href|navigate/i.test(sl)) {
      console.log("\n===", n, p, "===\n", sl.slice(0, 340));
      c++;
    }
    i = p + n.length;
  }
}
