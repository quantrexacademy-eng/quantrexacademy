#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const harvest = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "_migration", "quizrr_harvest.json"), "utf8"));
const byId = harvest.byId || {};
const qzDir = path.join(ROOT, "data", "tests", "jee_main_quizrr_pyq_chapter", "questions");
let left = 0, hit = 0, hitAns = 0, hitNat = 0, hitSol = 0, miss = 0;
const missSample = [];
const hitSample = [];
fs.readdirSync(qzDir).filter((f) => f.endsWith(".json")).forEach((f) => {
  const data = JSON.parse(fs.readFileSync(path.join(qzDir, f), "utf8"));
  (data.questions || []).forEach((q) => {
    const need = q._needsAnswerKey || (q.answer == null && q.correctValue == null);
    if (!need) return;
    left++;
    const hid = byId[String(q._quizrrId || "")];
    if (!hid) {
      miss++;
      if (missSample.length < 8) missSample.push({ file: f, id: q._quizrrId, stem: String(q.q || "").replace(/<[^>]+>/g, " ").slice(0, 60) });
      return;
    }
    hit++;
    if (hid.answer != null) hitAns++;
    if (hid.correctValue != null) hitNat++;
    if (hid.solution) hitSol++;
    if (hitSample.length < 6) hitSample.push({ id: q._quizrrId, hid, type: q.questionType || q.type });
  });
});
console.log(JSON.stringify({ left, hit, hitAns, hitNat, hitSol, miss, harvestIds: Object.keys(byId).length, missSample, hitSample }, null, 2));
