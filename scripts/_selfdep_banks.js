"use strict";
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "data", "banks");
const rows = [];
for (const n of fs.readdirSync(dir)) {
  if (!n.endsWith(".json") || n.includes(".bak")) continue;
  const s = fs.readFileSync(path.join(dir, n), "utf8");
  rows.push({
    file: n,
    mb: Math.round(s.length / 1048576),
    getmarks: (s.match(/cdn-question-pool\.getmarks\.app|cdn-assets\.getmarks\.app/gi) || []).length,
    local: (s.match(/\/assets\/diagrams\//gi) || []).length,
    quizrr: (s.match(/cdn\.quizrr\.in/gi) || []).length,
    firebase: (s.match(/firebasestorage\.googleapis\.com/gi) || []).length
  });
}
const tot = rows.reduce((a, r) => {
  a.getmarks += r.getmarks; a.local += r.local; a.quizrr += r.quizrr; a.firebase += r.firebase;
  return a;
}, { getmarks: 0, local: 0, quizrr: 0, firebase: 0 });
console.log(JSON.stringify({ tot, rows: rows.sort((a, b) => b.getmarks - a.getmarks) }, null, 2));
