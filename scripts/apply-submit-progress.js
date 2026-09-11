#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ROOT = path.resolve(__dirname, "..");
const PROJECT = "quantrexacademy-app";
const BUCKET = "quantrexacademy-app.firebasestorage.app";
function load(p, fb) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; } }
function sha1(s) { return crypto.createHash("sha1").update(String(s || "")).digest("hex"); }
function extractImg(html) {
  const o = []; const rx = /\bsrc=["']([^"']+)["']/gi; let m;
  while ((m = rx.exec(String(html || "")))) if (/^https?:\/\//i.test(m[1])) o.push(m[1]);
  return o;
}
const qzDir = path.join(ROOT, "data", "tests", "jee_main_quizrr_pyq_chapter", "questions");
const docs = [];
let resolved = 0, left = 0;
fs.readdirSync(qzDir).filter((f) => f.endsWith(".json")).forEach((f) => {
  const data = load(path.join(qzDir, f), {});
  (data.questions || []).forEach((q) => {
    const need = q._needsAnswerKey || (q.answer == null && q.correctValue == null);
    if (need) { left++; return; }
    if (q._resolvedFrom === "marks_login_id" || q._resolvedFrom === "quizrr_login") {
      resolved++;
      const qtext = String(q.q || "");
      docs.push({
        id: String(q.id || q._quizrrId),
        sourceId: q._quizrrId || q._marksId || "",
        q: qtext,
        questionText: qtext,
        options: (q.options || []).map((o, i) => ({ id: String.fromCharCode(65 + i), text: String(o || "") })),
        answer: q.answer,
        correctAnswer: q.answer,
        correctValue: q.correctValue != null ? q.correctValue : null,
        solution: q.solution || "",
        questionType: q.questionType || q.type || "singleCorrect",
        source: q._resolvedFrom,
        updatedAt: new Date().toISOString()
      });
    }
  });
});
console.log("resolvedThisRound", resolved, "stillLeft", left, "docs", docs.length);

(async () => {
  if (!docs.length) { console.log("no docs"); return; }
  const appMod = require("firebase-admin/app");
  const fsMod = require("firebase-admin/firestore");
  const stMod = require("firebase-admin/storage");
  if (!appMod.getApps().length) {
    appMod.initializeApp({ credential: appMod.applicationDefault(), projectId: PROJECT, storageBucket: BUCKET });
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
  const figs = [];
  docs.forEach((d) => extractImg(d.q + " " + d.solution).forEach((u) => figs.push(u)));
  const bucket = stMod.getStorage().bucket(BUCKET);
  let figOk = 0, figSkip = 0;
  for (const url of [...new Set(figs)]) {
    const dest = "questions/figs/misc/" + sha1(url) + ".png";
    try {
      const [ex] = await bucket.file(dest).exists();
      if (ex) { figSkip++; continue; }
      const res = await fetch(url, { headers: { Accept: "image/*", "User-Agent": "QuantrexAcademyMigration/1.0" } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 40) continue;
      await bucket.file(dest).save(buf, { resumable: false, metadata: { contentType: "image/png", cacheControl: "public,max-age=31536000" } });
      figOk++;
    } catch (_) {}
  }
  console.log(JSON.stringify({ written, figOk, figSkip, stillLeft: left }));
})();
