#!/usr/bin/env node
/**
 * Upload Quantrex PYQ book chapters to Firestore questions collection.
 * Local chapter JSON remains the student source of truth.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const BOOK = "6a91185f41ab5aba084f4d30";
const DIR = path.join(ROOT, "data", "books", "chapters", BOOK);
const PROJECT = "quantrexacademy-app";
const BUCKET = "quantrexacademy-app.firebasestorage.app";

function load(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function main() {
  if (!fs.existsSync(DIR)) {
    console.log("NO_DIR", DIR);
    process.exit(1);
  }
  const files = fs.readdirSync(DIR).filter((n) => n.endsWith(".json"));
  const docs = [];
  files.forEach((n) => {
    const data = load(path.join(DIR, n));
    const qs = (data && data.questions) || [];
    qs.forEach((q) => {
      if (!q || !q.id) return;
      docs.push({
        id: String(q.id),
        sourceId: String(q._marksId || q.id),
        bank: "qx_pyq_important",
        exam: q.exam || "jee_main",
        subject: q.subject || "",
        chapter: q.chapter || "",
        questionText: q.q || q.question || "",
        q: q.q || q.question || "",
        options: q.options || [],
        answer: q.answer,
        correctAnswer: q.answer,
        solution: q.solution || "",
        explanation: q.solution || "",
        source: "quantrex-pyq",
        bookId: BOOK,
        _book: BOOK,
        _chapterKey: q._chapterKey || "",
        updatedAt: new Date().toISOString()
      });
    });
  });
  console.log("docs", docs.length, "files", files.length);
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
    n++;
    if (doc.sourceId && doc.sourceId !== String(doc.id)) {
      batch.set(db.collection("questions").doc(String(doc.sourceId)), doc, { merge: true });
      n++;
    }
    if (n >= 400) {
      await batch.commit();
      written += n;
      batch = db.batch();
      n = 0;
      console.log("written", written);
    }
  }
  if (n) {
    await batch.commit();
    written += n;
  }
  console.log("FIRESTORE_OK", written);
}

main().catch((e) => {
  console.error("FIREBASE_FAIL", e && e.message);
  process.exit(1);
});
