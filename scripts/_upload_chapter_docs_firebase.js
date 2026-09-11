#!/usr/bin/env node
/**
 * Admin-only: upload chapter-hydrate JSONL docs to Firestore.
 * Student site never calls Marks (STUDENT_MARKS_RUNTIME=false).
 *
 *   node scripts/_upload_chapter_docs_firebase.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const argFile = process.argv.find((a) => a.startsWith("--file="));
const DOCS = argFile
  ? path.resolve(argFile.slice(7))
  : path.join(ROOT, "data", "_migration", "chapter_hydrate_docs.jsonl");
const PROJECT = "quantrexacademy-app";
const BUCKET = "quantrexacademy-app.firebasestorage.app";

function sha1(s) {
  return crypto.createHash("sha1").update(String(s || "")).digest("hex");
}

async function main() {
  if (!fs.existsSync(DOCS)) {
    console.error("missing", DOCS);
    process.exit(1);
  }
  const lines = fs.readFileSync(DOCS, "utf8").split(/\r?\n/).filter(Boolean);
  const docs = [];
  for (const line of lines) {
    try {
      const d = JSON.parse(line);
      if (d && d.id != null) {
        d.contentHash = sha1(String(d.q || "") + "\n" + JSON.stringify(d.options || []));
        docs.push(d);
      }
    } catch (_) { /* skip bad line */ }
  }
  console.log("docs", docs.length);

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
    const payload = Object.assign({}, doc);
    delete payload.file;
    const id = String(doc.id);
    batch.set(db.collection("questions").doc(id), payload, { merge: true });
    n++;
    if (doc.sourceId && String(doc.sourceId) !== id) {
      batch.set(db.collection("questions").doc(String(doc.sourceId)), payload, { merge: true });
      n++;
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
  await db.collection("content_health").doc("summary").set({
    lastChapterHydrateAt: new Date().toISOString(),
    chapterDocsWritten: written,
    studentMarksRuntime: false,
    projectId: PROJECT
  }, { merge: true });
  console.log("\nfirestore written", written);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
