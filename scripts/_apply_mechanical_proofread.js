"use strict";
const fs = require("fs");
const path = require("path");
const proof = require("../lib/qx-proofread");
const ROOT = path.resolve(__dirname, "..");

function walk(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  const st = fs.statSync(dir);
  if (st.isFile()) {
    if (dir.endsWith(".json")) acc.push(dir);
    return acc;
  }
  for (const n of fs.readdirSync(dir)) {
    if (n.startsWith("_") || n.includes(".bak") || n === "qid_marks" || n === "clean_shards" || n === "_migration" || n === "_eg_") continue;
    walk(path.join(dir, n), acc);
  }
  return acc;
}

function walkQs(node, fn) {
  if (!node) return;
  if (Array.isArray(node)) {
    node.forEach((x) => walkQs(x, fn));
    return;
  }
  if (typeof node !== "object") return;
  if (node.q || node.question || node.options || node.solution) fn(node);
  for (const k of Object.keys(node)) {
    if (k === "q" || k === "question" || k === "options" || k === "solution") continue;
    const v = node[k];
    if (v && typeof v === "object") walkQs(v, fn);
  }
}

const dirs = [
  path.join(ROOT, "data/banks"),
  path.join(ROOT, "data/books/chapters"),
  path.join(ROOT, "data/tests"),
  path.join(ROOT, "data/formulas.json"),
  path.join(ROOT, "data/ncert_offline"),
  path.join(ROOT, "data/board_offline"),
  path.join(ROOT, "data/board_hsc_offline"),
  path.join(ROOT, "data/rfc_offline"),
  path.join(ROOT, "data/quick_concepts"),
  path.join(ROOT, "data/qx_match_stems.json"),
  path.join(ROOT, "data/qx_irodov_question_text.json")
];
let files = 0, changed = 0, fields = 0;
for (const d of dirs) {
  for (const fp of walk(d, [])) {
    files++;
    let j;
    try { j = JSON.parse(fs.readFileSync(fp, "utf8")); } catch (_) { continue; }
    let n = 0;
    walkQs(j, (q) => {
      const before = JSON.stringify([q.q, q.question, q.options, q.solution, q.explanation]);
      proof.proofreadQuestion(q);
      const after = JSON.stringify([q.q, q.question, q.options, q.solution, q.explanation]);
      if (before !== after) n++;
    });
    if (n) {
      fs.writeFileSync(fp, JSON.stringify(j));
      changed++;
      fields += n;
    }
    if (files % 200 === 0) console.log("scanned", files, "changedFiles", changed);
  }
}
console.log(JSON.stringify({ files, changedFiles: changed, questionsChanged: fields }));
