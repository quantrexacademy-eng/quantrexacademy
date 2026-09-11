#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ROOT = path.resolve(__dirname, "..");
const PROJECT = "quantrexacademy-app";
const BUCKET = "quantrexacademy-app.firebasestorage.app";
const SKIP_FB = process.argv.includes("--skip-firebase");
function load(p, fb) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; } }
function strip(s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function sha1(s) { return crypto.createHash("sha1").update(String(s || "")).digest("hex"); }

const harvest = load(path.join(ROOT, "data", "_migration", "quizrr_harvest.json"), { byId: {} });
const byId = harvest.byId || {};
const qzDir = path.join(ROOT, "data", "tests", "jee_main_quizrr_pyq_chapter", "questions");
const stats = { ans: 0, nat: 0, sol: 0, files: 0 };
const docs = [];

fs.readdirSync(qzDir).filter((f) => f.endsWith(".json")).forEach((f) => {
  const abs = path.join(qzDir, f);
  const data = load(abs, null);
  if (!data || !data.questions) return;
  let ch = false;
  data.questions.forEach((q) => {
    const hid = byId[String(q._quizrrId || "")];
    if (!hid) return;
    if (hid.answer != null && hid.answer !== "" && (q.answer == null || q._needsAnswerKey)) {
      q.answer = hid.answer;
      q.answers = [hid.answer];
      delete q._needsAnswerKey;
      q._resolvedFrom = "quizrr_submit";
      stats.ans++;
      ch = true;
    }
    if (hid.correctValue != null && hid.correctValue !== "" && q.correctValue == null) {
      q.correctValue = hid.correctValue;
      delete q._needsAnswerKey;
      q._resolvedFrom = "quizrr_submit";
      stats.nat++;
      ch = true;
    }
    if (hid.solution && strip(hid.solution).length > strip(q.solution || "").length + 8) {
      q.solution = hid.solution;
      stats.sol++;
      ch = true;
    }
    if (q._resolvedFrom === "quizrr_submit") {
      const qtext = String(q.q || "");
      docs.push({
        id: String(q.id || q._quizrrId),
        sourceId: q._quizrrId || "",
        q: qtext,
        questionText: qtext,
        options: (q.options || []).map((o, i) => ({ id: String.fromCharCode(65 + i), text: String(o || "") })),
        answer: q.answer,
        correctAnswer: q.answer,
        correctValue: q.correctValue != null ? q.correctValue : null,
        solution: q.solution || "",
        questionType: q.questionType || q.type || "singleCorrect",
        source: "quizrr_submit",
        updatedAt: new Date().toISOString()
      });
    }
  });
  if (ch) {
    fs.writeFileSync(abs, JSON.stringify(data));
    stats.files++;
  }
});

let left = 0;
fs.readdirSync(qzDir).filter((f) => f.endsWith(".json")).forEach((f) => {
  (load(path.join(qzDir, f), {}).questions || []).forEach((q) => {
    if (q._needsAnswerKey || (q.answer == null && q.correctValue == null)) left++;
  });
});

(async () => {
  let fb = { skipped: true };
  if (!SKIP_FB && docs.length) {
    const appMod = require("firebase-admin/app");
    const fsMod = require("firebase-admin/firestore");
    if (!appMod.getApps().length) {
      appMod.initializeApp({
        credential: appMod.applicationDefault(),
        projectId: PROJECT,
        storageBucket: BUCKET
      });
    }
    const db = fsMod.getFirestore();
    db.settings({ ignoreUndefinedProperties: true });
    let batch = db.batch(), n = 0, written = 0;
    for (const doc of docs) {
      batch.set(db.collection("questions").doc(doc.id), doc, { merge: true });
      n++;
      if (n >= 400) { await batch.commit(); written += n; batch = db.batch(); n = 0; }
    }
    if (n) { await batch.commit(); written += n; }
    fb = { written };
  }
  const report = { harvestIds: Object.keys(byId).length, stats, leftoverNoKey: left, firebase: fb };
  fs.writeFileSync(path.join(ROOT, "data", "_migration", "apply_quizrr_harvest.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})();
