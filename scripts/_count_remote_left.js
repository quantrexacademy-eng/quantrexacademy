#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const RX = /https?:\/\/(?:cdn\.quizrr\.in|app-content\.cdn\.examgoal\.net|watermarked_images)[^"'\\\s]*/gi;
function walk(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (n.startsWith("_") || n === "node_modules") continue;
      walk(p, acc);
    } else if (n.endsWith(".json") && !n.includes(".bak") && !n.startsWith("_")) acc.push(p);
  }
  return acc;
}
const dirs = [
  "data/banks",
  "data/books/chapters",
  "data/tests/jee_main_examgoal_2027/questions",
  "data/tests/jee_main_quizrr_pyq_chapter/questions",
  "data/ncert_offline/chapters",
  "data/board_offline/chapters"
];
let files = 0, hits = 0;
const hosts = {};
dirs.forEach((d) => {
  walk(path.join(ROOT, d), []).forEach((p) => {
    const t = fs.readFileSync(p, "utf8");
    const m = t.match(RX);
    if (!m) return;
    files += 1;
    hits += m.length;
    m.forEach((u) => {
      const h = u.split("/")[2];
      hosts[h] = (hosts[h] || 0) + 1;
    });
  });
});
console.log(JSON.stringify({ files, hits, hosts }, null, 2));
