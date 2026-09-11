#!/usr/bin/env node
"use strict";
const fs = require("fs");
const t = fs.readFileSync("C:/Users/Admin/quizrr_login/quizrr_index.js", "utf8");
const p = t.indexOf("https://test.quizrr.in/tests/");
console.log(t.slice(p - 500, p + 800).replace(/\s+/g, " "));
console.log("\n\n==== analysis redirect ====\n");
const p2 = t.indexOf("isSubmitted");
console.log(t.slice(p2, p2 + 600).replace(/\s+/g, " "));
