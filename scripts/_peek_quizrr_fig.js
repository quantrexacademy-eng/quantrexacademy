"use strict";
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "..", "data/tests/jee_main_quizrr_pyq_chapter/questions");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).slice(0, 20);
let shown = 0;
for (const f of files) {
  const s = fs.readFileSync(path.join(dir, f), "utf8");
  if (!/qx-book-|qx-self-|quizrr|getmarks/i.test(s)) continue;
  const qs = JSON.parse(s);
  const arr = Array.isArray(qs) ? qs : (qs.questions || []);
  for (const q of arr) {
    const blob = JSON.stringify(q);
    if (!/<img/i.test(blob)) continue;
    const tags = blob.match(/<img[^>]+>/gi) || [];
    if (!tags.length) continue;
    console.log(f, q.id, tags[0].slice(0, 280));
    shown++;
    if (shown >= 6) process.exit(0);
  }
}
console.log("shown", shown);
