#!/usr/bin/env node
/**
 * Admin-only, resumable migration: local banks → Firestore + Storage figures.
 * Never invoked by the student website.
 *
 *   node scripts/migrate-banks-to-firebase.js --stats
 *   node scripts/migrate-banks-to-firebase.js --text
 *   node scripts/migrate-banks-to-firebase.js --figures
 *   node scripts/migrate-banks-to-firebase.js --all
 *   node scripts/migrate-banks-to-firebase.js --retry-failed
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const BANK_DIR = path.join(ROOT, "data", "banks");
const STATE_DIR = path.join(ROOT, "data", "_migration");
const STATE_PATH = path.join(STATE_DIR, "state.json");
const FAIL_PATH = path.join(STATE_DIR, "failed.json");
const REPORT_PATH = path.join(STATE_DIR, "report.json");
const PROJECT = "quantrexacademy-app";
const BUCKET = "quantrexacademy-app.firebasestorage.app";

const argv = process.argv.slice(2);
const WANT_STATS = argv.includes("--stats");
const WANT_TEXT = argv.includes("--text") || argv.includes("--all");
const WANT_FIGS = argv.includes("--figures") || argv.includes("--all");
const WANT_RETRY = argv.includes("--retry-failed");
const LIMIT = (() => {
  const i = argv.indexOf("--limit");
  return i >= 0 ? Math.max(1, parseInt(argv[i + 1], 10) || 0) : 0;
})();

function sha1(s) {
  return crypto.createHash("sha1").update(String(s || "")).digest("hex");
}

function loadJson(p, fallback) {
  try {
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (_) {
    return fallback;
  }
}

function saveJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

function listBankFiles() {
  if (!fs.existsSync(BANK_DIR)) return [];
  return fs.readdirSync(BANK_DIR).filter((f) => f.endsWith(".json") && !f.includes(".bak"));
}

function repairFigUrl(url) {
  let u = String(url || "").trim();
  if (!u) return "";
  u = u.replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/");
  u = u.replace(/https?:\/\/cdn-question-pool\.app\//gi, "https://cdn-question-pool.getmarks.app/");
  return u;
}

function extractImgUrls(html) {
  const urls = [];
  const s = String(html || "");
  const rx = /\bsrc=["']([^"']+)["']/gi;
  let m;
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
  const m3 = !rel && raw.match(/examgoal\.net\/(.+?)(?:\?|#|$)/i);
  if (m3) rel = "examgoal/" + decodeURIComponent(m3[1]);
  if (!rel) rel = "misc/" + sha1(raw) + extOf(raw);
  rel = rel.replace(/\\/g, "/").replace(/^\/+/, "");
  return "questions/figs/" + rel;
}

function extOf(url) {
  const p = String(url || "").split("?")[0];
  const m = p.match(/\.(png|jpe?g|webp|gif|svg)$/i);
  return m ? m[0].toLowerCase() : ".png";
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
    const p = storagePathForUrl(url);
    return "src=" + q + storagePublicUrl(p) + q;
  });
}

function normalizeOptions(opts) {
  if (!Array.isArray(opts)) return [];
  return opts.map((o, i) => {
    if (o == null) return { id: String.fromCharCode(65 + i), text: "" };
    if (typeof o === "string") return { id: String.fromCharCode(65 + i), text: o };
    return {
      id: o.id || o.key || String.fromCharCode(65 + i),
      text: o.text || o.html || String(o.value || "")
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

function validateQuestion(doc) {
  const reasons = [];
  const rawStem = String(doc.questionText || "");
  const stem = rawStem.replace(/<[^>]+>/g, " ").trim();
  if ((!stem || stem.length < 2) && !/<img\b/i.test(rawStem)) reasons.push("missing_question_text");
  const isNum = /numerical|integer|subjective|fill/i.test(String(doc.questionType || ""));
  const opts = doc.options || [];
  const hasOpt = opts.some((o) => {
    const t = String((o && o.text) || o || "").replace(/<[^>]+>/g, "").trim();
    return (t && !/^[A-D]$/i.test(t)) || /<img\b/i.test(String((o && o.text) || o || ""));
  });
  if (!isNum && !hasOpt) reasons.push("missing_options");
  if (!isNum && doc.correctAnswer == null && doc.answer == null) reasons.push("missing_answer");
  return reasons;
}

function gatherStats() {
  const banks = listBankFiles();
  let questions = 0;
  let withFigs = 0;
  let withOpts = 0;
  let withSol = 0;
  const urls = new Set();
  const byBank = [];
  for (const file of banks) {
    const data = loadJson(path.join(BANK_DIR, file), { questions: [] });
    const qs = data.questions || [];
    let bf = 0;
    let bo = 0;
    let bs = 0;
    for (const q of qs) {
      questions += 1;
      const blob = String(q.q || "") + " " + (q.options || []).join(" ");
      const imgs = extractImgUrls(blob);
      if (imgs.length) {
        withFigs += 1;
        bf += 1;
        imgs.forEach((u) => urls.add(u));
      }
      const optsOk = (q.options || []).some((o) => String(o || "").replace(/<[^>]+>/g, "").trim().length > 0);
      if (optsOk) {
        withOpts += 1;
        bo += 1;
      }
      if (q.solution || q.explanation) {
        withSol += 1;
        bs += 1;
      }
    }
    byBank.push({ file, count: qs.length, withFigs: bf, withOpts: bo, withSol: bs });
  }
  return { banks: byBank, questions, withFigs, withOpts, withSol, uniqueFigures: urls.size, figureUrls: [...urls] };
}

function emptyState() {
  return {
    textCursor: { file: "", index: 0 },
    figCursor: 0,
    written: 0,
    skipped: 0,
    failed: 0,
    figuresUploaded: 0,
    figuresFailed: 0,
    duplicates: 0,
    incomplete: 0,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function initAdmin() {
  let appMod;
  let fsMod;
  let stMod;
  try {
    appMod = require("firebase-admin/app");
    fsMod = require("firebase-admin/firestore");
    stMod = require("firebase-admin/storage");
  } catch (e) {
    console.error("Install firebase-admin first: npm install firebase-admin --save-dev");
    process.exit(1);
  }
  if (!appMod.getApps().length) {
    appMod.initializeApp({
      credential: appMod.applicationDefault(),
      projectId: PROJECT,
      storageBucket: BUCKET
    });
  }
  return {
    firestore: () => fsMod.getFirestore(),
    storage: () => stMod.getStorage()
  };
}

function toDoc(q, bank) {
  const opts = normalizeOptions(q.options);
  const id = stableId(q);
  const questionText = String(q.q || q.question || "");
  const figUrls = extractImgUrls(questionText + " " + opts.map((o) => o.text).join(" "));
  const doc = {
    id,
    sourceId: q._marksId || "",
    bank: bank,
    exam: q.exam || bank,
    subject: q.subject || "",
    chapter: q.chapter || "",
    chapterId: q.chapterId || "",
    topicId: q.topicId || "",
    year: q.year || "",
    questionNumber: q.questionNumber || q.qno || "",
    questionText,
    q: questionText,
    questionType: q.questionType || q.type || "singleCorrect",
    options: opts,
    correctAnswer: q.answer != null ? q.answer : null,
    answer: q.answer != null ? q.answer : null,
    answers: q.answers || null,
    solution: q.solution || "",
    explanation: q.explanation || q.solution || "",
    figure: figUrls[0] ? { sourceUrl: figUrls[0], storagePath: storagePathForUrl(figUrls[0]) } : null,
    figureUrls: figUrls,
    source: q.source || bank,
    difficulty: q.difficulty || "",
    language: q.language || "en",
    contentHash: contentHash(q),
    migrationStatus: "processing",
    updatedAt: new Date().toISOString(),
    metadata: {
      _columnMatch: !!(q._columnMatch || q._matchList),
      origin: "local_bank"
    }
  };
  const bad = validateQuestion(doc);
  doc.validationErrors = bad;
  doc.migrationStatus = bad.length ? "failed" : "completed";
  return doc;
}

async function migrateText(admin, state) {
  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  const banks = listBankFiles();
  let startFile = state.textCursor && state.textCursor.file;
  let startIndex = (state.textCursor && state.textCursor.index) || 0;
  let seenStart = !startFile;
  const batchSize = 400;
  let batch = db.batch();
  let inBatch = 0;
  let processed = 0;

  async function flush() {
    if (!inBatch) return;
    await batch.commit();
    batch = db.batch();
    inBatch = 0;
    state.updatedAt = new Date().toISOString();
    saveJson(STATE_PATH, state);
    process.stdout.write("  text written=" + state.written + " failed=" + state.failed + " skip=" + state.skipped + "\r");
  }

  for (const file of banks) {
    if (!seenStart) {
      if (file === startFile) seenStart = true;
      else continue;
    }
    const bank = file.replace(/\.json$/i, "");
    const data = loadJson(path.join(BANK_DIR, file), { questions: [] });
    const qs = data.questions || [];
    const from = file === startFile ? startIndex : 0;
    for (let i = from; i < qs.length; i++) {
      const q = qs[i];
      state.textCursor = { file, index: i + 1 };
      if (!q) {
        state.skipped += 1;
        continue;
      }
      const doc = toDoc(q, bank);
      const ref = db.collection("questions").doc(doc.id);
      if (doc.migrationStatus === "failed") {
        state.failed += 1;
        state.incomplete += 1;
        appendFail({ questionId: doc.id, sourceId: doc.sourceId, status: "failed", error: (doc.validationErrors || []).join(","), timestamp: Date.now(), figureStatus: "skipped" });
      } else {
        state.written += 1;
      }
      batch.set(ref, doc, { merge: true });
      inBatch += 1;
      processed += 1;
      if (doc.sourceId && doc.sourceId !== doc.id) {
        batch.set(db.collection("migration_logs").doc(doc.id), {
          questionId: doc.id,
          sourceId: doc.sourceId,
          status: doc.migrationStatus,
          error: (doc.validationErrors || []).join(",") || "",
          timestamp: Date.now(),
          figureStatus: (doc.figureUrls || []).length ? "pending" : "none"
        }, { merge: true });
        inBatch += 1;
      }
      if (inBatch >= batchSize) await flush();
      if (LIMIT && processed >= LIMIT) {
        await flush();
        return;
      }
    }
  }
  await flush();
  process.stdout.write("\n");
}

function appendFail(row) {
  const cur = loadJson(FAIL_PATH, []);
  cur.push(row);
  if (cur.length > 20000) cur.splice(0, cur.length - 20000);
  saveJson(FAIL_PATH, cur);
}

async function migrateFigures(admin, statsUrls, state) {
  const bucket = admin.storage().bucket(BUCKET);
  const db = admin.firestore();
  const urls = statsUrls || [];
  const from = state.figCursor || 0;
  for (let i = from; i < urls.length; i++) {
    const url = urls[i];
    state.figCursor = i + 1;
    const dest = storagePathForUrl(url);
    try {
      const [exists] = await bucket.file(dest).exists();
      if (!exists) {
        const res = await fetch(repairFigUrl(url), {
          headers: {
            Accept: "image/*,*/*",
            "User-Agent": "QuantrexAcademyMigration/1.0",
            Referer: "https://www.quantrexacademy.com/",
            Origin: "https://www.quantrexacademy.com"
          }
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length < 40) throw new Error("tiny_file");
        const ctype = res.headers.get("content-type") || "image/png";
        await bucket.file(dest).save(buf, {
          resumable: false,
          metadata: { contentType: ctype, cacheControl: "public,max-age=31536000" }
        });
      }
      state.figuresUploaded += 1;
    } catch (e) {
      state.figuresFailed += 1;
      appendFail({
        questionId: "",
        sourceId: url,
        status: "failed",
        error: String(e && e.message || e).slice(0, 240),
        timestamp: Date.now(),
        figureStatus: "failed"
      });
    }
    if (i % 25 === 0) {
      state.updatedAt = new Date().toISOString();
      saveJson(STATE_PATH, state);
      process.stdout.write("  figs " + (i + 1) + "/" + urls.length + " ok=" + state.figuresUploaded + " fail=" + state.figuresFailed + "\r");
    }
    if (LIMIT && (i - from + 1) >= LIMIT) break;
  }
  process.stdout.write("\n");
  await writeHealth(admin, state, { uniqueFigures: urls.length });
}

async function rewriteCompletedDocs(admin, state) {
  const db = admin.firestore();
  const snap = await db.collection("questions").where("migrationStatus", "==", "completed").limit(400).get();
  let n = 0;
  let batch = db.batch();
  let inBatch = 0;
  async function walk(querySnap) {
    for (const doc of querySnap.docs) {
      const d = doc.data() || {};
      const nextQ = rewriteHtmlToStorage(d.q || d.questionText || "");
      const nextOpts = (d.options || []).map((o) => {
        if (!o) return o;
        if (typeof o === "string") return { id: "A", text: rewriteHtmlToStorage(o) };
        return { id: o.id || "A", text: rewriteHtmlToStorage(o.text || "") };
      });
      batch.set(doc.ref, { q: nextQ, questionText: nextQ, options: nextOpts, figuresPrimary: "storage" }, { merge: true });
      inBatch += 1;
      n += 1;
      if (inBatch >= 400) {
        await batch.commit();
        batch = db.batch();
        inBatch = 0;
      }
    }
  }
  await walk(snap);
  if (inBatch) await batch.commit();
  state.rewrittenDocs = (state.rewrittenDocs || 0) + n;
}

async function retryFailedFigures(admin, state) {
  const rows = loadJson(FAIL_PATH, []);
  const urls = [];
  const seen = new Set();
  for (const row of rows) {
    if (row.figureStatus !== "failed") continue;
    const u = repairFigUrl(row.sourceId);
    if (!u || !/^https?:\/\//i.test(u) || seen.has(u)) continue;
    if (/https?:\/\/\.app\//i.test(u)) continue;
    seen.add(u);
    urls.push(u);
  }
  console.log("Retrying failed figures:", urls.length);
  const kept = rows.filter((r) => r.figureStatus !== "failed");
  saveJson(FAIL_PATH, kept);
  const prevCursor = state.figCursor;
  const prevFail = state.figuresFailed;
  state.figCursor = 0;
  const uploadedBefore = state.figuresUploaded;
  const failBefore = state.figuresFailed;
  await migrateFigures(admin, urls, state);
  state.figCursor = prevCursor;
  const newlyOk = state.figuresUploaded - uploadedBefore;
  const newlyFail = state.figuresFailed - failBefore;
  state.figuresFailed = Math.max(0, prevFail - newlyOk + newlyFail);
}

async function writeHealth(admin, state, extra) {
  const db = admin.firestore();
  const payload = {
    totalQuestions: extra && extra.questions != null ? extra.questions : state.written + state.failed,
    migrated: state.written,
    failed: state.failed,
    skipped: state.skipped,
    incomplete: state.incomplete,
    duplicates: state.duplicates,
    figures: extra && extra.uniqueFigures != null ? extra.uniqueFigures : null,
    figuresUploaded: state.figuresUploaded,
    missingFigures: state.figuresFailed,
    updatedAt: new Date().toISOString(),
    projectId: PROJECT,
    studentMarksRuntime: false
  };
  await db.collection("content_health").doc("summary").set(payload, { merge: true });
  saveJson(REPORT_PATH, Object.assign({}, payload, { state }));
}

async function main() {
  console.log("Quantrex bank → Firebase migration");
  console.log("project", PROJECT);
  const stats = gatherStats();
  console.log("banks", stats.banks.length, "questions", stats.questions, "withFigs", stats.withFigs, "uniqueFigs", stats.uniqueFigures, "withOpts", stats.withOpts, "withSol", stats.withSol);
  saveJson(path.join(STATE_DIR, "stats.json"), {
    banks: stats.banks,
    questions: stats.questions,
    withFigs: stats.withFigs,
    withOpts: stats.withOpts,
    withSol: stats.withSol,
    uniqueFigures: stats.uniqueFigures
  });
  if (WANT_STATS && !WANT_TEXT && !WANT_FIGS) return;

  const state = Object.assign(emptyState(), loadJson(STATE_PATH, {}));
  const admin = await initAdmin();
  if (WANT_RETRY) {
    console.log("Retry failed figures only…");
    await retryFailedFigures(admin, state);
    await writeHealth(admin, state, stats);
    saveJson(STATE_PATH, state);
    console.log("done", {
      written: state.written,
      failed: state.failed,
      figuresUploaded: state.figuresUploaded,
      figuresFailed: state.figuresFailed
    });
    return;
  }
  if (WANT_TEXT) {
    console.log("Phase 1: Firestore text/options…");
    await migrateText(admin, state);
    await writeHealth(admin, state, stats);
  }
  if (WANT_FIGS) {
    console.log("Phase 2: Storage figures…");
    await migrateFigures(admin, stats.figureUrls, state);
    try {
      await rewriteCompletedDocs(admin, state);
    } catch (e) {
      console.warn("rewrite docs", e && e.message);
    }
    await writeHealth(admin, state, stats);
  }
  saveJson(STATE_PATH, state);
  console.log("done", {
    written: state.written,
    failed: state.failed,
    figuresUploaded: state.figuresUploaded,
    figuresFailed: state.figuresFailed
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
