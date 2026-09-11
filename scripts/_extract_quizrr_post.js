#!/usr/bin/env node
"use strict";
const fs = require("fs");
const t = fs.readFileSync("C:/Users/Admin/quizrr_login/quizrr_index.js", "utf8");

const found = new Set();
const rx = /\$\{bm\}\/api\/[^`'"]+/g;
let m;
while ((m = rx.exec(t))) found.add(m[0]);
console.log("BM APIS:");
[...found].sort().forEach((s) => console.log(s));

console.log("\n--- type: submit-ish ---");
for (const n of ["type:\"submit\"", "type:'submit'", "type:\"finish\"", "type:\"end\"", "isSubmitted", "submitTest", "endTest", "finishTest", "submitPaper", "\"submit\""]) {
  let i = 0, c = 0;
  while (c < 3) {
    const p = t.indexOf(n, i);
    if (p < 0) break;
    const slice = t.slice(Math.max(0, p - 120), p + 160).replace(/\s+/g, " ");
    if (/api|post|test|attempt/i.test(slice)) {
      console.log("\n", n, "@", p, slice.slice(0, 260));
      c++;
    }
    i = p + n.length;
  }
}
