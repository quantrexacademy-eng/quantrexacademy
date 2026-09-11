#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const PACK = path.join(__dirname, "..", "data", "tests", "jee_main_examgoal_2027");

function getLocal(file, eg) {
  const arr = JSON.parse(fs.readFileSync(path.join(PACK, "questions", file), "utf8"));
  return (Array.isArray(arr) ? arr : []).find((q) => q._examgoalId === eg);
}
function getOfficial(file, eg) {
  const d = JSON.parse(fs.readFileSync(path.join(PACK, "_eg_raw", file), "utf8"));
  for (const sec of (d.test && d.test.sections) || []) {
    for (const q of sec.questions || []) {
      if (q.questionId === eg) return q;
    }
  }
  return null;
}

const targets = [
  ["tst-19g61mpczvtet.json", "tq-mrdgfgws"],
  ["tst-19g61mpe6cuzb.json", "tq-msvviki1"],
  ["tst-19g61mo679g17.json", "tq-mqb8ixdq"]
];
for (const [f, eg] of targets) {
  const loc = getLocal(f, eg);
  const off = getOfficial(f, eg);
  const en = ((off && off.question) || {}).en || {};
  console.log("====", eg, "====");
  console.log("local img", /<img/i.test(String((loc && (loc.q || loc.question)) || "")));
  console.log("local q head", String((loc && (loc.q || loc.question)) || "").slice(0, 220));
  console.log("local opts", loc && loc.options);
  console.log("official img", /<img/i.test(String(en.content || "")));
  console.log("official content head", String(en.content || "").slice(0, 280));
  console.log("official keys", Object.keys(en));
  console.log("official expl", JSON.stringify(en.explanation || "").slice(0, 80));
  console.log("official hidden", JSON.stringify(en.hiddenExplanation || "").slice(0, 80));
  console.log("official hi expl?", !!(off && off.question && off.question.hi && off.question.hi.explanation));
}
