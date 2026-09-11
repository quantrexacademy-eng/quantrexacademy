#!/usr/bin/env node
/**
 * Upload Marks-hydrated questions + figures to Firestore/Storage.
 * Student site stays Marks-free (STUDENT_MARKS_RUNTIME=false).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const REPORT = path.join(ROOT, "data", "_migration", "marks_all_hydrate_report.json");
const PROJECT = "quantrexacademy-app";
const BUCKET = "quantrexacademy-app.firebasestorage.app";

function loadJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (_) {
    return fallback;
  }
}
function sha1(s) {
  return crypto.createHash("sha1").update(String(s || "")).digest("hex");
}
function repairFigUrl(url) {
  return String(url || "")
    .replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/")
    .replace(/https?:\/\/cdn-question-pool\.app\//gi, "https://cdn-question-pool.getmarks.app/");
}
function extractImgUrls(html) {
  const urls = [];
  const rx = /\bsrc=["']([^"']+)["']/gi;
  let m;
  const s = String(html || "");
  while ((m = rx.exec(s)) !== null) {
    const u = repairFigUrl(m[1]);
    if (/^https?:\/\//i.test(u) && !/^data:/i.test(u)) urls.push(u);
  }
  return urls;
}
function storagePathForUrl(url) {
  const raw = repairFigUrl(url);
  let rel = "";
  const m1 = raw.match(/cdn-question-pool\.getmarks\.app\/(.+?)(?:\?|#|$)/i);
  if (m1) rel = decodeURIComponent(m1[1]);
  const m2 = !rel && raw.match(/cdn\.quizrr\.in\/(.+?)(?:\?|#|$)/i);
  if (m2) rel = "quizrr/" + decodeURIComponent(m2[1]);
  if (!rel) rel = "misc/" + sha1(raw) + ".png";
  return "questions/figs/" + rel.replace(/\\/g, "/").replace(/^\/+/, "");
}
function storagePublicUrl(storagePath) {
  return "https://firebasestorage.googleapis.com/v0/b/" + BUCKET +
    "/o/" + encodeURIComponent(storagePath) + "?alt=media";
}
function rewriteHtmlToStorage(html) {
  return String(html || "").replace(/\bsrc=(["'])([^"']+)\1/gi, (all, q, url) => {
    if (!/^https?:\/\//i.test(url)) return all;
    if (/firebasestorage\.googleapis\.com|quantrexacademy-app\.firebasestorage/i.test(url)) return all;
    if (/\/assets\//i.test(url)) return all;
    return "src=" + q + storagePublicUrl(storagePathForUrl(url)) + q;
  });
}
function normalizeOptions(opts) {
  if (!Array.isArray(opts)) return [];
  return opts.map((o, i) => {
    if (o == null) return { id: String.fromCharCode(65 + i), text: "" };
    if (typeof o === "string") return { id: String.fromCharCode(65 + i), text: rewriteHtmlToStorage(o) };
    return {
      id: o.id || o.key || String.fromCharCode(65 + i),
      text: rewriteHtmlToStorage(o.text || o.html || "")
    };
  });
}
function toDoc(q, bank) {
  const questionText = rewriteHtmlToStorage(String(q.q || q.question || ""));
  const opts = normalizeOptions(q.options);
  const figUrls = extractImgUrls(
    questionText + " " + opts.map((o) => o.text).join(" ") + " " + String(q.solution || "")
  );
  const id = (q.id != null && String(q.id) !== "") ? String(q.id) : String(q._marksId || "");
  return {
    id,
    sourceId: q._marksId || "",
    bank,
    exam: q.exam || bank,
    subject: q.subject || "",
    chapter: q.chapter || "",
    questionText,
    q: questionText,
    questionType: q.questionType || q.type || "singleCorrect",
    options: opts,
    correctAnswer: q.answer != null ? q.answer : null,
    answer: q.answer != null ? q.answer : null,
    answers: q.answers || null,
    correctValue: q.correctValue != null ? q.correctValue : null,
    solution: rewriteHtmlToStorage(q.solution || ""),
    explanation: rewriteHtmlToStorage(q.explanation || q.solution || ""),
    figure: figUrls[0] ? { sourceUrl: figUrls[0], storagePath: storagePathForUrl(figUrls[0]) } : null,
    figureUrls: figUrls,
    source: q.source || bank,
    contentHash: sha1(questionText + "\n" + opts.map((o) => o.text).join("\n")),
    migrationStatus: "completed",
    updatedAt: new Date().toISOString(),
    metadata: { origin: "marks_hydrate_qxfix50", studentMarksRuntime: false }
  };
}

async function main() {
  const report = loadJson(REPORT, null);
  if (!report) {
    console.error("Missing", REPORT);
    process.exit(1);
  }
  const appMod = require("firebase-admin/app");
  const fsMod = require("firebase-admin/firestore");
  const stMod = require("firebase-admin/storage");
  if (!appMod.getApps().length) {
    appMod.initializeApp({
      credential: appMod.applicationDefault(),
      projectId: PROJECT,
      storageBucket: BUCKET
    });
  }
  const db = fsMod.getFirestore();
  db.settings({ ignoreUndefinedProperties: true });
  const bucket = stMod.getStorage().bucket(BUCKET);

  const byFile = new Map();
  (report.changed_ids || []).forEach((row) => {
    if (!row || !row.file) return;
    if (!byFile.has(row.file)) byFile.set(row.file, []);
    byFile.get(row.file).push(row);
  });

  let written = 0;
  const figUrls = new Set();
  let batch = db.batch();
  let inBatch = 0;
  async function flush() {
    if (!inBatch) return;
    await batch.commit();
    batch = db.batch();
    inBatch = 0;
    process.stdout.write("  firestore written=" + written + "\n");
  }

  for (const [rel, rows] of byFile.entries()) {
    const abs = path.join(ROOT, rel);
    const data = loadJson(abs, null);
    const qs = data && (data.questions || (Array.isArray(data) ? data : null));
    if (!qs) {
      console.log("skip missing", rel);
      continue;
    }
    const wantId = new Set(rows.map((r) => String(r.id)));
    const wantMid = new Set(rows.map((r) => String(r.marksId || "")).filter(Boolean));
    const bank = path.basename(rel, ".json");
    let n = 0;
    for (const q of qs) {
      if (!q) continue;
      const hit = wantId.has(String(q.id)) || (q._marksId && wantMid.has(String(q._marksId)));
      if (!hit) continue;
      const doc = toDoc(q, bank);
      if (!doc.id) continue;
      (doc.figureUrls || []).forEach((u) => figUrls.add(repairFigUrl(u)));
      batch.set(db.collection("questions").doc(doc.id), doc, { merge: true });
      inBatch += 1;
      written += 1;
      n += 1;
      if (doc.sourceId && doc.sourceId !== doc.id) {
        batch.set(db.collection("questions").doc(String(doc.sourceId)), doc, { merge: true });
        inBatch += 1;
        written += 1;
      }
      if (inBatch >= 400) await flush();
    }
    console.log("upload", rel, "qs", n);
  }
  await flush();
  console.log("firestore docs", written, "figs unique", figUrls.size);

  const urls = [...figUrls];
  let ok = 0, fail = 0, skip = 0;
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const dest = storagePathForUrl(url);
    try {
      const [exists] = await bucket.file(dest).exists();
      if (exists) { skip += 1; continue; }
      const res = await fetch(url, {
        headers: {
          Accept: "image/*,*/*",
          "User-Agent": "QuantrexAcademyMigration/1.0",
          Referer: "https://www.quantrexacademy.com/"
        }
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 40) throw new Error("tiny");
      await bucket.file(dest).save(buf, {
        resumable: false,
        metadata: {
          contentType: res.headers.get("content-type") || "image/png",
          cacheControl: "public,max-age=31536000"
        }
      });
      ok += 1;
    } catch (e) {
      fail += 1;
      if (fail < 12) console.log("fig fail", url.slice(-90), e.message);
    }
    if (i % 25 === 0) process.stdout.write("  figs " + (i + 1) + "/" + urls.length + " up=" + ok + " skip=" + skip + " fail=" + fail + "\n");
  }
  console.log("figures uploaded", ok, "existed", skip, "fail", fail);
  await db.collection("content_health").doc("summary").set({
    marksHydrateAt: new Date().toISOString(),
    marksHydrateDocsWritten: written,
    marksHydrateFigsUploaded: ok,
    marksHydrateFigsFailed: fail,
    studentMarksRuntime: false,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log("ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
