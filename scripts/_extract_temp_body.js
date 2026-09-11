#!/usr/bin/env node
"use strict";
const fs = require("fs");
const t = fs.readFileSync("C:/Users/Admin/quizrr_login/quizrr_index.js", "utf8");
const p = t.indexOf("tempTestDetails");
console.log("first temp at", p);
console.log(t.slice(p - 400, p + 1800).replace(/\n/g, " "));
console.log("\n\n==== second ====\n");
const p2 = t.indexOf("tempTestDetails", p + 20);
console.log(t.slice(p2 - 200, p2 + 1200).replace(/\n/g, " "));
console.log("\n\n==== type: ====\n");
let i = 0, c = 0;
while (c < 15) {
  const x = t.indexOf('type:"', i);
  if (x < 0) break;
  const sl = t.slice(x, x + 80);
  if (/submit|finish|end|complete|attempt|question|subject/i.test(sl)) {
    console.log(sl);
    c++;
  }
  i = x + 6;
}
