#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "data", "books", "chapters");
const hits = [];
function walk(d) {
  fs.readdirSync(d).forEach((n) => {
    const p = path.join(d, n);
    if (fs.statSync(p).isDirectory()) return walk(p);
    if (!n.endsWith(".json")) return;
    const t = fs.readFileSync(p, "utf8");
    if (/quizrr|watermarked_images|organic_book/i.test(t) && !/qx-org-|\/assets\/diagrams\//i.test(t)) {
      hits.push(path.relative(path.join(__dirname, ".."), p));
    }
  });
}
walk(ROOT);
console.log(JSON.stringify({ n: hits.length, hits: hits.slice(0, 25) }, null, 2));
