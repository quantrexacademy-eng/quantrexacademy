"use strict";
const fs = require("fs");
const j = JSON.parse(fs.readFileSync("data/tests/jee_main_quizrr_pyq_chapter/_raw_papers/69de21e87e39d99b57bc5a88.json", "utf8"));
const needle = "69de4f1f2ee0e063d923dc97";
function find(node, path) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) return node.forEach((x, i) => find(x, path + "[" + i + "]"));
  for (const [k, v] of Object.entries(node)) {
    if (String(v) === needle || String(k).includes("id") && String(v).includes(needle)) {
      console.log(path + "." + k, "=", String(v).slice(0, 80));
    }
    if (v && typeof v === "object") find(v, path + "." + k);
  }
}
find(j, "root");
const q = (j.data && (j.data.questions || j.data.test || j.data)) || j;
console.log("data keys", j.data && Object.keys(j.data));
