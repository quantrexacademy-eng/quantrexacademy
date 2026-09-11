#!/usr/bin/env node
/**
 * Apply Quizrr harvest keys, clear stale flags, bake Firebase, recount holes.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const proof = require("../lib/qx-proofread");
const ROOT = path.resolve(__dirname, "..");
const PROJECT = "quantrexacademy-app";
const BUCKET = "quantrexacademy-app.firebasestorage.app";
const SKIP_FB = process.argv.includes("--skip-firebase");

function load(p, fb) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (_) { return fb; } }
function strip(s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function sha1(s) { return crypto.createHash("sha1").update(String(s || "")).digest("hex"); }
function isNum(q) {
  return /numerical|integer|nat|subjective|fill/i.test(String(q.questionType || q.type || ""));
}
function extractImgUrls(html) {
  const urls = [];
  const rx = /\bsrc=["']([^"']+)["']/gi;
  let m;
  while ((m = rx.exec(String(html || "")))) {
    const u = proof.proofreadHtml(m[1]);
    if (/^https?:\/\//i.test(u)) urls.push(u);
  }
  return urls;
}
function storagePathForUrl(url) {
  const raw = proof.proofreadHtml(url);
  let rel = "";
  const m1 = raw.match(/cdn-question-pool\.getmarks\.app\/(.+?)(?:\?|#|$)/i);
  if (m1) rel = decodeURIComponent(m1[1]);
  const m2 = !rel && raw.match(/cdn\.quizrr\.in\/(.+?)(?:\?|#|$)/i);
  if (m2) rel = "quizrr/" + decodeURIComponent(m2[1]);
  if (!rel) rel = "misc/" + sha1(raw) + ".png";
  return "questions/figs/" + rel.replace(/\\/g, "/").replace(/^\/+/, "");
}

const harvest = load(path.join(ROOT, "data", "_migration", "quizrr_harvest.json"), { byId: {} });
const stats = { harvestAns: 0, harvestNat: 0, harvestSol: 0, flagsCleared: 0, marksFig: 0, files: 0 };

function applyHarvest(q) {
  const hid = harvest.byId && harvest.byId[String(q._quizrrId || "")];
  if (!hid) return false;
  let ch = false;
  if (hid.answer != null && hid.answer !== "" && (q.answer == null || q._needsAnswerKey)) {
    q.answer = hid.answer;
    q.answers = [hid.answer];
    delete q._needsAnswerKey;
    q._resolvedFrom = "quizrr_login";
    stats.harvestAns++;
    ch = true;
  }
  if (hid.correctValue != null && hid.correctValue !== "" && q.correctValue == null) {
    q.correctValue = hid.correctValue;
    delete q._needsAnswerKey;
    q._resolvedFrom = "quizrr_login";
    stats.harvestNat++;
    ch = true;
  }
  if (hid.solution && strip(hid.solution).length > strip(q.solution || "").length + 8) {
    q.solution = hid.solution;
    stats.harvestSol++;
    ch = true;
  }
  return ch;
}

function applyMarksFig(q) {
  const mid = q._marksId || q.marksId;
  if (!mid) return false;
  const raw = load(path.join(ROOT, "data", "qid_marks", mid + ".json"), null);
  if (!raw) return false;
  const d = raw.data || raw;
  const qb = d.question || {};
  const img = (qb.image && (qb.image.url || qb.image.src || qb.image.original)) || "";
  const html = String(qb.text || qb.html || "");
  const local = String(q.q || q.question || "");
  if (/<img\b/i.test(local)) return false;
  let add = "";
  if (/<img\b/i.test(html)) add = (html.match(/<img\b[^>]*>/i) || [])[0] || "";
  else if (img) add = '<img src="' + String(img).replace(/"/g, "&quot;") + '">';
  if (!add) return false;
  if (q.q != null) q.q = local + "\n" + add + "<br>";
  else q.question = local + "\n" + add + "<br>";
  stats.marksFig++;
  return true;
}

const changedDocs = [];
function walk(dir, kind) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((n) => {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) return walk(p, kind);
    if (!n.endsWith(".json") || n.includes(".bak") || n.startsWith("_")) return;
    const data = load(p, null);
    const qs = data && (data.questions || (Array.isArray(data) ? data : null));
    if (!qs) return;
    let ch = false;
    qs.forEach((q) => {
      if (applyHarvest(q)) ch = true;
      if (applyMarksFig(q)) ch = true;
      if ((q.answer != null || q.correctValue != null) && q._needsAnswerKey) {
        delete q._needsAnswerKey;
        stats.flagsCleared++;
        ch = true;
      }
      if (q._resolvedFrom || q._quizrrId || q._marksId) {
        if (q._resolvedFrom) changedDocs.push({ q, kind, file: p });
      }
    });
    if (ch) {
      fs.writeFileSync(p, JSON.stringify(data));
      stats.files++;
    }
  });
}
walk(path.join(ROOT, "data", "banks"), "bank");
walk(path.join(ROOT, "data", "books", "chapters"), "book");
walk(path.join(ROOT, "data", "tests"), "test");

function leftoverKind(q) {
  const raw = String(q.q || q.question || "");
  const stem = strip(raw);
  const hasImg = /<img\b/i.test(raw + (q.options || []).join(" "));
  const letter = !isNum(q) && !(q.options || []).some((o) => {
    const t = strip(o);
    return /<img\b/i.test(String(o || "")) || (t && !/^[A-D]$/i.test(t));
  });
  const empty = (!stem || /^loading/i.test(stem)) && !hasImg;
  const noKey = !!(q._needsAnswerKey || (q.answer == null && q.correctValue == null && !isNum(q) && (q.options || []).length));
  const natBad = isNum(q) && q.correctValue == null && q.answer == null;
  const saysFig = /\b(the figure|shown in (the )?(figure|diagram|graph)|shown below)\b/i.test(stem) && !hasImg;
  const hole = empty || noKey || natBad || (saysFig && !q._marksId);
  const officialLetter = letter && (q.answer != null) && !empty && !noKey;
  return { hole, officialLetter, saysFig, empty, noKey, natBad, hasMarks: !!(q._marksId || q.marksId), hasQz: !!(q._quizrrId || q.quizrrId) };
}

const left = { holeMarks: 0, holeQz: 0, officialLetter: 0, saysFigMarks: 0, noKeyQz: 0, natQz: 0 };
function count(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((n) => {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) return count(p);
    if (!n.endsWith(".json") || n.includes(".bak") || n.startsWith("_")) return;
    const data = load(p, null);
    const qs = data && (data.questions || (Array.isArray(data) ? data : null));
    if (!qs) return;
    qs.forEach((q) => {
      const ids = leftoverKind(q);
      if (ids.officialLetter && ids.hasMarks) left.officialLetter++;
      if (ids.saysFig && ids.hasMarks && !ids.hole) left.saysFigMarks++;
      if (!ids.hole) return;
      if (ids.hasQz) {
        left.holeQz++;
        if (ids.noKey) left.noKeyQz++;
        if (ids.natBad) left.natQz++;
      }
      if (ids.hasMarks && !ids.hasQz) left.holeMarks++;
    });
  });
}
count(path.join(ROOT, "data", "banks"));
count(path.join(ROOT, "data", "books", "chapters"));
count(path.join(ROOT, "data", "tests"));

async function firebase() {
  if (SKIP_FB || !changedDocs.length) return { written: 0 };
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
  const docs = [];
  const figUrls = [];
  changedDocs.forEach(({ q, kind }) => {
    const questionText = String(q.q || q.question || "");
    const opts = (q.options || []).map((o, i) => ({ id: String.fromCharCode(65 + i), text: String(o || "") }));
    extractImgUrls(questionText + " " + opts.map((o) => o.text).join(" ") + " " + (q.solution || "")).forEach((u) => figUrls.push(u));
    const id = (q.id != null && String(q.id) !== "0") ? String(q.id) : String(q._marksId || q._quizrrId);
    docs.push({
      id,
      sourceId: q._marksId || q._quizrrId || "",
      bank: kind,
      q: questionText,
      questionText,
      options: opts,
      answer: q.answer,
      correctAnswer: q.answer,
      correctValue: q.correctValue != null ? q.correctValue : null,
      solution: q.solution || "",
      questionType: q.questionType || q.type || "singleCorrect",
      source: q._resolvedFrom || "id_login_resolve",
      updatedAt: new Date().toISOString()
    });
  });
  let batch = db.batch();
  let n = 0, written = 0;
  for (const doc of docs) {
    if (!doc.id) continue;
    batch.set(db.collection("questions").doc(String(doc.id)), doc, { merge: true });
    n++;
    if (n >= 400) { await batch.commit(); written += n; batch = db.batch(); n = 0; }
  }
  if (n) { await batch.commit(); written += n; }
  let figOk = 0, figSkip = 0, figFail = 0;
  for (const url of [...new Set(figUrls)]) {
    const dest = storagePathForUrl(url);
    try {
      const [ex] = await bucket.file(dest).exists();
      if (ex) { figSkip++; continue; }
      const res = await fetch(url, { headers: { Accept: "image/*,*/*", "User-Agent": "QuantrexAcademyMigration/1.0" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 40) throw new Error("tiny");
      await bucket.file(dest).save(buf, { resumable: false, metadata: { contentType: res.headers.get("content-type") || "image/png", cacheControl: "public,max-age=31536000" } });
      figOk++;
    } catch (_) { figFail++; }
  }
  await db.collection("content_health").doc("summary").set({
    lastIdResolveAt: new Date().toISOString(),
    holeQuizrr: left.holeQz,
    holeMarks: left.holeMarks,
    officialLetterMarks: left.officialLetter
  }, { merge: true });
  return { written, figs: { figOk, figSkip, figFail, total: figUrls.length } };
}

(async () => {
  let fb = { skipped: true };
  try { fb = await firebase(); } catch (e) { fb = { error: e.message }; }
  const report = { generatedAt: new Date().toISOString(), stats, leftoverHoles: left, firebase: fb };
  fs.writeFileSync(path.join(ROOT, "data", "_migration", "finalize_id_resolve.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})();
