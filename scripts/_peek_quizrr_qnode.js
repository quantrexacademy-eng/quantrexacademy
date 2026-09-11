"use strict";
const fs = require("fs");
const j = JSON.parse(fs.readFileSync("data/tests/jee_main_quizrr_pyq_chapter/_raw_papers/69de21e87e39d99b57bc5a88.json", "utf8"));
const needle = "69de4f1f2ee0e063d923dc97";
function find(node) {
  if (!node || typeof node !== "object") return null;
  if (node._id === needle || node.questionId === needle || node.id === needle) return node;
  if (Array.isArray(node)) {
    for (const x of node) { const h = find(x); if (h) return h; }
    return null;
  }
  for (const v of Object.values(node)) {
    const h = find(v);
    if (h) return h;
  }
  return null;
}
const n = find(j);
console.log("found", !!n, n && Object.keys(n));
const s = JSON.stringify(n || {});
console.log("has img", /<img/i.test(s));
console.log("has fb", /firebasestorage/i.test(s));
console.log("slice", s.slice(0, 400));
const pq = JSON.parse(fs.readFileSync("data/tests/jee_main_quizrr_pyq_chapter/questions/qz-69de21e87e39d99b57bc5a88.json", "utf8"));
const q = pq.find((x) => String(x.id).includes(needle));
console.log("proc id", q && q.id);
console.log("proc img", ((q && JSON.stringify(q)) || "").match(/<img[^>]+>/));
