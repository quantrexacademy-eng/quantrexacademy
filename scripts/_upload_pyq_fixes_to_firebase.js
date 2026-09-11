#!/usr/bin/env node
/**
 * Admin: write repaired PYQ mock questions + figures to Firestore/Storage.
 *   node scripts/_upload_pyq_fixes_to_firebase.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const REPORT = path.join(ROOT, "data", "_migration", "pyq_all_exams_fixed.json");
const BANK_DIR = path.join(ROOT, "data", "banks");
const PROJECT = "quantrexacademy-app";
const BUCKET = "quantrexacademy-app.firebasestorage.app";

function loadJson(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (_) {
    return fallback;
  }
}

function sha1(s) {
  return crypto.createHash("sha1").update(String(s || "")).digest("hex");
}

function repairFigUrl(url) {
  return String(url || "").replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/");
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

function contentHash(q) {
  const opts = (q.options || []).map((o) => (typeof o === "string" ? o : (o && o.text) || "")).join("\n");
  return sha1(String(q.q || q.question || "") + "\n" + opts + "\n" + String(q.answer));
}

function stableId(q) {
  if (q && q.id != null && String(q.id).trim() !== "") return String(q.id);
  if (q && q._marksId) return String(q._marksId);
  return "h_" + contentHash(q).slice(0, 20);
}

function toDoc(q, bank) {
  const questionText = rewriteHtmlToStorage(String(q.q || q.question || ""));
  const opts = normalizeOptions(q.options);
  const figUrls = extractImgUrls(questionText + " " + opts.map((o) => o.text).join(" "));
  return {
    id: stableId(q),
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
    solution: rewriteHtmlToStorage(q.solution || ""),
    explanation: rewriteHtmlToStorage(q.explanation || q.solution || ""),
    figure: figUrls[0] ? { sourceUrl: figUrls[0], storagePath: storagePathForUrl(figUrls[0]) } : null,
    figureUrls: figUrls,
    source: q.source || bank,
    contentHash: contentHash(q),
    migrationStatus: "completed",
    updatedAt: new Date().toISOString(),
    metadata: { origin: "pyq_mock_repair_qxfix44" }
  };
}

function initAdmin() {
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
  return { firestore: () => fsMod.getFirestore(), storage: () => stMod.getStorage() };
}

async function main() {
  const report = loadJson(REPORT, null);
  if (!report) {
    console.error("Missing", REPORT);
    process.exit(1);
  }
  const admin = initAdmin();
  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  const bucket = admin.storage().bucket(BUCKET);

  const byBank = {};
  (report.changed_ids || []).forEach((row) => {
    if (!row || row.id == null) return;
    (byBank[row.bank] || (byBank[row.bank] = new Set())).add(String(row.id));
  });

  let written = 0;
  let missing = 0;
  let batch = db.batch();
  let inBatch = 0;
  async function flush() {
    if (!inBatch) return;
    await batch.commit();
    batch = db.batch();
    inBatch = 0;
    process.stdout.write("  firestore written=" + written + "\r");
  }

  for (const [bank, idSet] of Object.entries(byBank)) {
    const data = loadJson(path.join(BANK_DIR, bank + ".json"), { questions: [] });
    const qs = data.questions || [];
    console.log("upload", bank, "ids", idSet.size);
    for (const q of qs) {
      if (!q || !idSet.has(String(q.id))) continue;
      const doc = toDoc(q, bank);
      const ref = db.collection("questions").doc(doc.id);
      batch.set(ref, doc, { merge: true });
      inBatch += 1;
      written += 1;
      if (inBatch >= 400) await flush();
    }
  }
  await flush();
  console.log("\nfirestore docs", written, "missing", missing);

  const urls = [...new Set((report.cdn_urls || []).map(repairFigUrl).filter((u) => /^https?:\/\//i.test(u)))];
  console.log("figures to check", urls.length);
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
      if (fail < 12) console.log("fig fail", url.slice(-80), e.message);
    }
    if (i % 20 === 0) process.stdout.write("  figs " + (i + 1) + "/" + urls.length + " up=" + ok + " skip=" + skip + " fail=" + fail + "\r");
  }
  console.log("\nfigures uploaded", ok, "existed", skip, "fail", fail);
  await db.collection("content_health").doc("summary").set({
    pyqMockRepairAt: new Date().toISOString(),
    pyqMockDocsWritten: written,
    pyqMockFigsUploaded: ok,
    pyqMockFigsFailed: fail,
    studentMarksRuntime: false,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log("ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
