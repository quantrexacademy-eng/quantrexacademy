#!/usr/bin/env node
"use strict";
const fs = require("fs");
const p = "C:/Users/Admin/quizrr_login/quizrr_index.js";
const t = fs.readFileSync(p, "utf8");
const set = new Set();
const rx = /\/api\/[A-Za-z0-9_\-\/${}.?=]+/g;
let m;
while ((m = rx.exec(t))) {
  const s = m[0];
  if (/test|question|solution|submit|attempt|start|finish|end|paper|content|analysis/i.test(s)) set.add(s);
}
const arr = [...set].sort();
console.log(arr.join("\n"));
console.log("COUNT", arr.length);
