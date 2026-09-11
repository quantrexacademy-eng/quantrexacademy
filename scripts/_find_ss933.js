"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const needles = [
  /intersect[\s\S]{0,40}axis/i,
  /Sgn\s*\(\s*sin/i,
  /NaHCO3|NaHCO_3|HSnO/i,
  /\\\[4pt\]|\[\s*4\s*pt\s*\]/i
];
function walk(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const n of fs.readdirSync(dir)) {
    if (n.startsWith(".") || n === "node_modules") continue;
    const p = path.join(dir, n);
    let st;
    try { st = fs.statSync(p); } catch (_) { continue; }
    if (st.isDirectory()) {
      if (/_ocr|_probe|_migration|qid_marks|clean_shards/.test(n)) continue;
      walk(p, acc);
    } else if (n.endsWith(".json") && !n.includes(".bak")) acc.push(p);
  }
  return acc;
}
const files = [];
walk(path.join(ROOT, "data/tests"), files);
walk(path.join(ROOT, "data/banks"), files);
walk(path.join(ROOT, "data/books/chapters"), files);
let hits = 0;
for (const f of files) {
  const raw = fs.readFileSync(f, "utf8");
  if (!/intersect|Sgn\(|NaHCO|4pt|HSnO|mathrm\{A\}/i.test(raw)) continue;
  let j;
  try { j = JSON.parse(raw); } catch (_) { continue; }
  const qs = Array.isArray(j) ? j : (j.questions || j.items || []);
  if (!Array.isArray(qs)) continue;
  for (const q of qs) {
    const blob = String((q && (q.q || q.question || "")) + "\n" + (q && q.solution || ""));
    if (needles.some((rx) => rx.test(blob))) {
      hits++;
      if (hits <= 8) {
        console.log("---", path.relative(ROOT, f), "id", q.id);
        console.log(blob.slice(0, 500).replace(/\s+/g, " "));
        console.log("");
      }
    }
  }
}
console.log("hits", hits, "files", files.length);
