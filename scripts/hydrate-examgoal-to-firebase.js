#!/usr/bin/env node
/**
 * Admin-only: bake ExamGOAL shards into Firestore.
 * Student site still reads local JSON; this is a backup + figure index.
 *
 *   node scripts/hydrate-examgoal-to-firebase.js
 *   node scripts/hydrate-examgoal-to-firebase.js --skip-firebase
 */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const QDIR = path.join(ROOT, "data", "tests", "jee_main_examgoal_2027", "questions");
const PROJECT = "quantrexacademy-app";
const BUCKET = "quantrexacademy-app.firebasestorage.app";
const SKIP_FB = process.argv.includes("--skip-firebase");

function sha1(s) {
  return crypto.createHash("sha1").update(String(s || "")).digest("hex");
}
function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function extractImgUrls(html) {
  const urls = [];
  const rx = /\bsrc=["']([^"']+)["']/gi;
  let m;
  while ((m = rx.exec(String(html || ""))) !== null) {
    if (/^https?:\/\//i.test(m[1]) && !/^data:/i.test(m[1])) urls.push(m[1]);
  }
  return urls;
}
function toDoc(q, file) {
  const questionText = String(q.q || q.question || "");
  const opts = (q.options || []).map((o, i) => ({
    id: String.fromCharCode(65 + i),
    text: typeof o === "string" ? o : (o && (o.text || o.html)) || ""
  }));
  const figUrls = extractImgUrls(questionText + " " + opts.map((o) => o.text).join(" ") + " " + String(q.solution || ""));
  return {
    id: String(q.id),
    sourceId: q._examgoalId || "",
    bank: "examgoal_2027",
    exam: "JEE Main",
    subject: q.subject || "",
    chapter: q.chapter || "",
    questionText,
    q: questionText,
    questionType: q.questionType || q.type || "mcq",
    options: opts,
    correctAnswer: q.answer,
    answer: q.answer,
    answers: q.answers || null,
    correctValue: q.correctValue != null ? q.correctValue : null,
    solution: q.solution || q.explanation || "",
    explanation: q.explanation || q.solution || "",
    figureUrls: figUrls,
    source: q.source || "ExamGoal JEE Main 2027",
    contentHash: sha1(questionText + "\n" + opts.map((o) => o.text).join("\n")),
    migrationStatus: "completed",
    updatedAt: new Date().toISOString(),
    metadata: { origin: "examgoal_hydrate", file }
  };
}

async function main() {
  const files = fs.readdirSync(QDIR).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  const docs = [];
  for (const f of files) {
    const arr = JSON.parse(fs.readFileSync(path.join(QDIR, f), "utf8"));
    const list = Array.isArray(arr) ? arr : arr.questions || [];
    list.forEach((q) => {
      if (q && q.id != null) docs.push(toDoc(q, f));
    });
  }
  console.log("docs", docs.length, "files", files.length);
  if (SKIP_FB) return;
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
  let batch = db.batch();
  let n = 0;
  let written = 0;
  for (const doc of docs) {
    batch.set(db.collection("questions").doc(String(doc.id)), doc, { merge: true });
    n += 1;
    if (doc.sourceId) {
      batch.set(db.collection("questions").doc(String(doc.sourceId)), doc, { merge: true });
      n += 1;
    }
    if (n >= 400) {
      await batch.commit();
      written += n;
      batch = db.batch();
      n = 0;
      process.stdout.write("  firestore written≈" + written + "\r");
    }
  }
  if (n) {
    await batch.commit();
    written += n;
  }
  console.log("\nfirestore written", written);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
