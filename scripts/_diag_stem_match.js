#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
function load(p, fb) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (_) { return fb; } }
function strip(s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function normText(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$]+\$/g, " ")
    .replace(/\\[a-zA-Z]+\s*\{[^}]*\}/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/&[#a-zA-Z0-9]+;/g, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
function stemKey(s) {
  let t = normText(s);
  t = t.replace(/^(which of the following|consider the following statements|given below are two statements|match list i with list ii|match the following|assertion a reason r)\s+/i, "");
  return t;
}

const byStem = new Map();
const bankDir = path.join(ROOT, "data", "banks");
fs.readdirSync(bankDir).filter((f) => f.endsWith(".json") && !f.includes(".bak")).forEach((f) => {
  const qs = (load(path.join(bankDir, f), {}).questions) || [];
  qs.forEach((q) => {
    if (q.answer == null && q.correctValue == null) return;
    const sk = stemKey(q.q || q.question);
    if (!sk || sk.length < 40) return;
    if (!byStem.has(sk)) byStem.set(sk, []);
    byStem.get(sk).push(q);
  });
});

const qzDir = path.join(ROOT, "data", "tests", "jee_main_quizrr_pyq_chapter", "questions");
let total = 0, noKey = 0, hit1 = 0, hitN = 0, miss = 0, short = 0;
const missSamples = [];
const multiSamples = [];
fs.readdirSync(qzDir).filter((f) => f.endsWith(".json")).forEach((f) => {
  const j = load(path.join(qzDir, f), {});
  (j.questions || []).forEach((q) => {
    if (!(q._needsAnswerKey || (q.answer == null && q.correctValue == null))) return;
    noKey++;
    const sk = stemKey(q.q);
    if (!sk || sk.length < 40) { short++; return; }
    const hits = byStem.get(sk) || [];
    if (hits.length === 1) hit1++;
    else if (hits.length > 1) {
      hitN++;
      if (multiSamples.length < 5) multiSamples.push({ sk: sk.slice(0, 80), n: hits.length, ans: hits.slice(0, 4).map((h) => h.answer) });
    } else {
      miss++;
      if (missSamples.length < 6) missSamples.push({ id: q._quizrrId, sk: sk.slice(0, 100), stem: strip(q.q).slice(0, 90) });
    }
    total++;
  });
});
console.log(JSON.stringify({ noKey, short, hit1, hitN, miss, missSamples, multiSamples }, null, 2));
