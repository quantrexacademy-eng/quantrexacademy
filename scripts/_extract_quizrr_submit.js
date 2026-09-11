#!/usr/bin/env node
"use strict";
const fs = require("fs");
const t = fs.readFileSync("C:/Users/Admin/quizrr_login/quizrr_index.js", "utf8");

// Find submit-related API calls
const pats = [
  /\/api\/[^"'`]{0,80}submit[^"'`]{0,40}/gi,
  /\/api\/[^"'`]{0,80}finish[^"'`]{0,40}/gi,
  /\/api\/[^"'`]{0,80}endTest[^"'`]{0,40}/gi,
  /_0\.(post|put|patch|get)\(`\/api\/[^`]+`/g,
  /_0\.(post|put|patch)\(`\$\{bm\}\/api\/[^`]+`/g,
];
const found = new Set();
for (const p of pats) {
  let m;
  while ((m = p.exec(t))) found.add(m[0].slice(0, 200));
}
console.log("API CALLS:");
[...found].sort().forEach((s) => console.log(s));

console.log("\n--- submit contexts ---");
let i = 0, c = 0;
while (c < 12) {
  const p = t.toLowerCase().indexOf("submit", i);
  if (p < 0) break;
  const slice = t.slice(Math.max(0, p - 80), p + 140);
  if (/api|post|patch|put|test/i.test(slice)) {
    console.log("\n@", p, slice.replace(/\s+/g, " ").slice(0, 220));
    c++;
  }
  i = p + 6;
}
