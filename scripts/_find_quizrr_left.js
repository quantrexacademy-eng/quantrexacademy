#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const RX = /https?:\/\/cdn\.quizrr\.in[^"'\\\s]*/gi;
function walk(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (n.startsWith("_")) continue;
      walk(p, acc);
    } else if (n.endsWith(".json") && !n.includes(".bak")) acc.push(p);
  }
  return acc;
}
["data/banks","data/books/chapters","data/tests","data/ncert_offline","data/board_offline"].forEach((d) => {
  walk(path.join(ROOT, d), []).forEach((p) => {
    const t = fs.readFileSync(p, "utf8");
    const m = t.match(RX);
    if (m) console.log(path.relative(ROOT, p), m.length, m.slice(0, 3));
  });
});
