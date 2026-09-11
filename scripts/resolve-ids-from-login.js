#!/usr/bin/env node
/**
 * Admin-only: resolve leftover questions that have _marksId / _quizrrId.
 * Fetches official Marks records, applies official Quizrr/Marks keys,
 * bakes into local JSON + Firebase. Never invents academic content.
 *
 *   node scripts/resolve-ids-from-login.js
 *   node scripts/resolve-ids-from-login.js --skip-firebase
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const proof = require("../lib/qx-proofread");

const ROOT = path.resolve(__dirname, "..");
const STATE_DIR = path.join(ROOT, "data", "_migration");
const QID_DIR = path.join(ROOT, "data", "qid_marks");
const QZ_CACHE = path.join(ROOT, "data", "qid_quizrr");
const PROJECT = "quantrexacademy-app";
const BUCKET = "quantrexacademy-app.firebasestorage.app";
const MARKS_API = "https://web.getmarks.app/api/v1/questions/";
const SKIP_FB = process.argv.includes("--skip-firebase");

function loadJson(p, fb) {
  try {
    if (!fs.existsSync(p)) return fb;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (_) {
    return fb;
  }
}
function saveJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}
function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function sha1(s) {
  return crypto.createHash("sha1").update(String(s || "")).digest("hex");
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function isNum(q) {
  return /numerical|integer|nat|subjective|fill|written/i.test(String((q && (q.questionType || q.type)) || ""))
    || (q && q.correctValue != null && !(q.options || []).length);
}
function optScore(opts) {
  if (!Array.isArray(opts) || !opts.length) return 0;
  let n = 0;
  opts.forEach((o) => {
    const raw = String(typeof o === "string" ? o : (o && (o.text || o.html)) || "");
    const t = strip(raw);
    if (/<img\b/i.test(raw)) n += 8;
    else if (t && !/^[A-D]$/i.test(t)) n += Math.min(6, 1 + Math.floor(t.length / 12));
  });
  return n;
}
function stemScore(html) {
  const s = String(html || "");
  let n = strip(s).length;
  if (/<img\b/i.test(s)) n += 80;
  if (/<table/i.test(s)) n += 40;
  return n;
}
function solScore(s) {
  const t = strip(s);
  if (!t || /^no solution/i.test(t)) return 0;
  return t.length + (/<img\b/i.test(String(s || "")) ? 80 : 0);
}
function imgUrl(v) {
  if (!v) return "";
  if (typeof v === "string") return v.trim();
  return String(v.url || v.src || v.original || "").trim();
}
function imgTag(url) {
  const u = proof.proofreadHtml(String(url || "").trim());
  if (!u) return "";
  return '<img src="' + u.replace(/"/g, "&quot;") + '"><br>';
}
function extractImgUrls(html) {
  const urls = [];
  const rx = /\bsrc=["']([^"']+)["']/gi;
  let m;
  const s = String(html || "");
  while ((m = rx.exec(s)) !== null) {
    const u = proof.proofreadHtml(m[1]);
    if (/^https?:\/\//i.test(u) && !/^data:/i.test(u)) urls.push(u);
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
function readToken() {
  const cfg = loadJson(path.join(ROOT, "data", "marks_config.json"), {});
  return String(cfg.token || process.env.MARKS_TOKEN || "").trim();
}

function marksToLocal(d) {
  if (!d || typeof d !== "object") return null;
  const qb = d.question || {};
  let q = String(qb.text || qb.html || "");
  const qImg = imgUrl(qb.image);
  if (qImg && !/<img\b/i.test(q)) q += (q ? "\n" : "") + imgTag(qImg);
  const opts = Array.isArray(d.options)
    ? d.options.map((o) => {
        if (!o) return "";
        if (typeof o === "string") return proof.proofreadHtml(o);
        let t = String(o.text || o.html || "").trim();
        const im = imgUrl(o.image || o.img);
        if (im && !/<img\b/i.test(t)) t += (t ? "\n" : "") + imgTag(im);
        return proof.proofreadHtml(t);
      })
    : [];
  let answer = null;
  if (Array.isArray(d.options)) {
    const i = d.options.findIndex((o) => o && o.isCorrect);
    if (i >= 0) answer = i;
  }
  if (answer == null && d.correctIndex != null) answer = d.correctIndex;
  const sb = d.solution || {};
  let sol = String(sb.text || sb.html || "");
  const sImg = imgUrl(sb.image);
  if (sImg && !/<img\b/i.test(sol)) sol += (sol ? "\n" : "") + imgTag(sImg);
  return {
    q: proof.proofreadHtml(q),
    options: opts,
    answer,
    correctValue: d.correctValue != null ? d.correctValue : null,
    solution: proof.proofreadHtml(sol),
    questionType: d.type || "singleCorrect",
    _marksId: d._id || ""
  };
}

function applyMarks(q, rec) {
  if (!q || !rec) return false;
  let ch = false;
  const localRaw = String(q.q || q.question || "");
  if (stemScore(rec.q) > stemScore(localRaw) + 4) {
    if (q.q != null) q.q = rec.q;
    else q.question = rec.q;
    ch = true;
  } else if (/<img\b/i.test(rec.q) && !/<img\b/i.test(localRaw)) {
    const extra = rec.q.match(/<img\b[^>]*>/i);
    if (extra) {
      if (q.q != null) q.q = localRaw + "\n" + extra[0] + "<br>";
      else q.question = localRaw + "\n" + extra[0] + "<br>";
      ch = true;
    }
  }
  if (optScore(rec.options) > optScore(q.options)) {
    q.options = rec.options.slice();
    ch = true;
  }
  if (solScore(rec.solution) > solScore(q.solution) + 8) {
    q.solution = rec.solution;
    ch = true;
  }
  if (rec.answer != null && (q.answer == null || q._needsAnswerKey)) {
    q.answer = rec.answer;
    q.answers = [rec.answer];
    delete q._needsAnswerKey;
    ch = true;
  }
  if (rec.correctValue != null && q.correctValue == null) {
    q.correctValue = rec.correctValue;
    delete q._needsAnswerKey;
    ch = true;
  }
  if (rec.questionType && /numerical|integer/i.test(rec.questionType)
    && !/numerical|integer/i.test(String(q.questionType || q.type || ""))) {
    q.questionType = rec.questionType;
    q.type = rec.questionType;
    ch = true;
  }
  if (rec._marksId && !q._marksId) q._marksId = rec._marksId;
  q._resolvedFrom = "marks_login";
  return ch;
}

async function fetchMarks(token, id) {
  let wait = 8000;
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(MARKS_API + encodeURIComponent(id), {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Origin: "https://web.getmarks.app",
        Referer: "https://web.getmarks.app/"
      }
    });
    const text = await res.text();
    if (res.status === 401 || res.status === 403) {
      const err = new Error("MARKS_AUTH_" + res.status);
      err.auth = true;
      throw err;
    }
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "0", 10);
      const delay = Math.max(wait, (retryAfter || 0) * 1000);
      process.stdout.write("\n  429 backoff " + Math.round(delay / 1000) + "s\n");
      await sleep(delay);
      wait = Math.min(120000, Math.floor(wait * 1.6));
      continue;
    }
    if (!res.ok) return { ok: false, status: res.status, detail: text.slice(0, 160) };
    let data;
    try { data = JSON.parse(text); } catch (_) {
      return { ok: false, status: res.status, detail: "bad_json" };
    }
    const rec = marksToLocal(data.data || data);
    if (!rec) return { ok: false, status: res.status, detail: "empty" };
    return { ok: true, rec, raw: data };
  }
  return { ok: false, status: 429, detail: "rate_limit_exhausted" };
}

function normText(s) {
  return String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$]+\$/g, " ")
    .replace(/\\[a-zA-Z]+\s*\{[^}]*\}/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/&[#a-zA-Z0-9]+;/g, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
function stemKey(s) {
  let t = normText(s);
  t = t.replace(/^(which of the following|consider the following statements|given below are two statements|match list i with list ii|match the following|assertion a reason r)\s+/i, "");
  return t;
}
function numsOf(s) {
  return (String(s || "").match(/\d+(?:\.\d+)?/g) || []).join(",");
}
function isGenericKey(k) {
  if (!k || k.length < 48) return true;
  return /^(match list|which of the following|consider the following|assertion)$/.test(k.slice(0, 28));
}
function optNorm(s) {
  return normText(s).replace(/\s+/g, "");
}
function alignAnswer(donorOpts, recOpts, donorAns) {
  if (donorAns == null || donorAns < 0) return null;
  const want = optNorm((donorOpts || [])[donorAns] || "");
  if (want && want.length >= 2) {
    const rec = recOpts || [];
    for (let i = 0; i < rec.length; i++) {
      if (optNorm(rec[i]) === want) return i;
    }
  }
  if (Number.isInteger(donorAns) && (recOpts || []).length === (donorOpts || []).length) {
    const a = (donorOpts || []).map(optNorm).filter((x) => x.length > 1).sort().join("|");
    const b = (recOpts || []).map(optNorm).filter((x) => x.length > 1).sort().join("|");
    if (a && a === b) return donorAns;
  }
  return null;
}

function walkJsonFiles(dir, fn) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((n) => {
    const p = path.join(dir, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) return walkJsonFiles(p, fn);
    if (!n.endsWith(".json") || n.includes(".bak") || n.startsWith("_")) return;
    fn(p);
  });
}

function leftoverFlags(q) {
  const raw = String(q.q || q.question || "");
  const stem = strip(raw);
  const hasImg = /<img\b/i.test(raw + (q.options || []).join(" "));
  const letter = !isNum(q) && !optScore(q.options);
  const empty = (!stem || /^loading/i.test(stem)) && !hasImg;
  const noKey = !!(q._needsAnswerKey || (q.answer == null && q.correctValue == null && !isNum(q) && (q.options || []).length));
  const natBad = isNum(q) && q.correctValue == null && q.answer == null;
  const saysFig = /\b(the figure|shown in (the )?(figure|diagram|graph)|shown below)\b/i.test(stem) && !hasImg;
  return { letter, empty, noKey, natBad, saysFig, hasImg, any: letter || empty || noKey || natBad || saysFig };
}

function collectLeftovers() {
  const marks = new Map();
  const quizrr = [];
  function addFile(abs) {
    const data = loadJson(abs, null);
    if (!data) return;
    const qs = data.questions || (Array.isArray(data) ? data : null);
    if (!qs) return;
    qs.forEach((q, idx) => {
      const fl = leftoverFlags(q);
      if (!fl.any) return;
      const mid = q._marksId || q.marksId || "";
      const qid = q._quizrrId || q.quizrrId || "";
      if (mid) {
        if (!marks.has(String(mid))) marks.set(String(mid), { marksId: String(mid), files: [] });
        marks.get(String(mid)).files.push(abs);
      }
      if (qid) {
        quizrr.push({
          file: abs,
          idx,
          qid: String(qid),
          testId: String(q._quizrrTestId || q._testId || data._quizrrTestId || ""),
          flags: fl
        });
      }
    });
  }
  walkJsonFiles(path.join(ROOT, "data", "banks"), addFile);
  walkJsonFiles(path.join(ROOT, "data", "books", "chapters"), addFile);
  walkJsonFiles(path.join(ROOT, "data", "tests"), addFile);
  return { marks: [...marks.values()], quizrr };
}

function indexOfficialDonors() {
  const byStem = new Map();
  const byMarks = new Map();
  function add(q, src) {
    if (!q) return;
    if (q._marksId) byMarks.set(String(q._marksId), q);
    const sk = stemKey(q.q || q.question);
    if (isGenericKey(sk)) return;
    const hasKey = q.answer != null || q.correctValue != null;
    if (!hasKey) return;
    if (!byStem.has(sk)) byStem.set(sk, []);
    byStem.get(sk).push({ q, src });
  }
  const bankDir = path.join(ROOT, "data", "banks");
  fs.readdirSync(bankDir).filter((f) => f.endsWith(".json") && !f.includes(".bak")).forEach((f) => {
    const qs = (loadJson(path.join(bankDir, f), {}).questions) || [];
    qs.forEach((q) => add(q, f));
  });
  if (fs.existsSync(QID_DIR)) {
    fs.readdirSync(QID_DIR).filter((f) => f.endsWith(".json")).forEach((f) => {
      const raw = loadJson(path.join(QID_DIR, f), null);
      const rec = raw && marksToLocal(raw.data || raw);
      if (rec) add(rec, "qid:" + f);
    });
  }
  return { byStem, byMarks };
}

function uniqueDonor(byStem, q) {
  const sk = stemKey(q.q || q.question);
  if (isGenericKey(sk)) return null;
  const hits = byStem.get(sk) || [];
  if (hits.length !== 1) return null;
  const donor = hits[0].q;
  const a = numsOf(strip(q.q || q.question));
  const b = numsOf(strip(donor.q || donor.question));
  if (a && b && a !== b && a.split(",").length >= 2) return null;
  return donor;
}

async function initAdmin() {
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

function toDoc(q, bank) {
  const questionText = String(q.q || q.question || "");
  const opts = Array.isArray(q.options)
    ? q.options.map((o, i) => {
        if (o && typeof o === "object") return { id: o.id || String.fromCharCode(65 + i), text: o.text || "" };
        return { id: String.fromCharCode(65 + i), text: String(o || "") };
      })
    : [];
  const figUrls = extractImgUrls(questionText + " " + opts.map((o) => o.text).join(" ") + " " + (q.solution || ""));
  const id = (q.id != null && String(q.id) !== "0")
    ? String(q.id)
    : String(q._marksId || q._quizrrId || sha1(questionText).slice(0, 24));
  return {
    id,
    sourceId: q._marksId || q._quizrrId || "",
    bank: bank || "",
    exam: q.exam || bank || "",
    subject: q.subject || "",
    chapter: q.chapter || "",
    questionText,
    q: questionText,
    questionType: q.questionType || q.type || "singleCorrect",
    options: opts,
    correctAnswer: q.answer,
    answer: q.answer,
    answers: q.answers || null,
    correctValue: q.correctValue != null ? q.correctValue : null,
    solution: q.solution || "",
    explanation: q.explanation || q.solution || "",
    figure: figUrls[0] ? { sourceUrl: figUrls[0], storagePath: storagePathForUrl(figUrls[0]) } : null,
    figureUrls: figUrls,
    source: q._resolvedFrom || q.source || "id_login_resolve",
    contentHash: sha1(questionText + "\n" + opts.map((o) => o.text).join("\n")),
    updatedAt: new Date().toISOString(),
    metadata: { origin: "id_login_resolve" }
  };
}

async function writeFirestore(admin, docs) {
  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  let batch = db.batch();
  let n = 0;
  let written = 0;
  for (const doc of docs) {
    if (!doc || !doc.id) continue;
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
    }
  }
  if (n) {
    await batch.commit();
    written += n;
  }
  return written;
}

async function uploadFigs(admin, urls) {
  const bucket = admin.storage().bucket(BUCKET);
  let ok = 0, fail = 0, skip = 0;
  const uniq = [...new Set(urls.filter(Boolean))];
  for (let i = 0; i < uniq.length; i++) {
    const url = uniq[i];
    const dest = storagePathForUrl(url);
    try {
      const [exists] = await bucket.file(dest).exists();
      if (exists) { skip++; continue; }
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
      ok++;
    } catch (e) {
      fail++;
      if (fail <= 6) console.warn("fig fail", dest, e.message);
    }
  }
  return { ok, fail, skip, total: uniq.length };
}

async function main() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.mkdirSync(QID_DIR, { recursive: true });
  fs.mkdirSync(QZ_CACHE, { recursive: true });

  const stats = {
    marksFetched: 0,
    marksCached: 0,
    marksApplied: 0,
    marksFailed: 0,
    qzFromBank: 0,
    qzFromQuizrrCache: 0,
    qzNat: 0,
    qzMcq: 0,
    filesWritten: 0,
    firestoreWrites: 0,
    figures: null
  };

  console.log("Collecting leftovers…");
  const left = collectLeftovers();
  console.log(JSON.stringify({ marksIds: left.marks.length, quizrrQs: left.quizrr.length }));

  const token = readToken();
  if (!token) {
    console.error("No Marks token");
    process.exit(1);
  }

  const marksRec = new Map();
  for (let i = 0; i < left.marks.length; i++) {
    const row = left.marks[i];
    const localRaw = path.join(QID_DIR, row.marksId + ".json");
    let rec = null;
    if (fs.existsSync(localRaw)) {
      rec = marksToLocal(loadJson(localRaw, {}).data || loadJson(localRaw, {}));
      if (rec) stats.marksCached++;
    }
    if (!rec || (optScore(rec.options) < 4 && stemScore(rec.q) < 20) || (!/<img\b/i.test(rec.q + rec.solution) && row.files.length)) {
      try {
        const out = await fetchMarks(token, row.marksId);
        if (out.ok) {
          rec = out.rec;
          fs.writeFileSync(localRaw, JSON.stringify(out.raw));
          stats.marksFetched++;
          await sleep(450);
        } else {
          stats.marksFailed++;
          if (!rec) console.warn("marks fail", row.marksId, out.status, out.detail);
        }
      } catch (e) {
        if (e && e.auth) {
          console.error("Marks token rejected");
          break;
        }
        stats.marksFailed++;
      }
    }
    if (rec) marksRec.set(row.marksId, rec);
    if ((i + 1) % 25 === 0) process.stdout.write("  marks " + (i + 1) + "/" + left.marks.length + "\r");
  }
  process.stdout.write("\n");

  console.log("Indexing official donors…");
  const donors = indexOfficialDonors();
  console.log("donor stems", donors.byStem.size, "marks", donors.byMarks.size);

  const qzHarvest = loadJson(path.join(STATE_DIR, "quizrr_harvest.json"), { byId: {} });

  const files = new Map();
  function touch(abs) {
    if (!files.has(abs)) {
      const data = loadJson(abs, null);
      if (!data) return null;
      files.set(abs, data);
    }
    return files.get(abs);
  }

  left.marks.forEach((row) => {
    const rec = marksRec.get(row.marksId);
    if (!rec) return;
    (row.files || []).forEach((abs) => {
      const data = touch(abs);
      if (!data) return;
      const qs = data.questions || (Array.isArray(data) ? data : null);
      if (!qs) return;
      qs.forEach((q) => {
        if (String(q._marksId || q.marksId || "") !== row.marksId) return;
        if (applyMarks(q, rec)) stats.marksApplied++;
      });
    });
  });

  left.quizrr.forEach((row) => {
    const data = touch(row.file);
    if (!data) return;
    const qs = data.questions || (Array.isArray(data) ? data : null);
    if (!qs) return;
    const q = qs[row.idx];
    if (!q) return;

    const harvested = qzHarvest.byId && qzHarvest.byId[row.qid];
    if (harvested) {
      let ch = false;
      if (harvested.answer != null && (q.answer == null || q._needsAnswerKey)) {
        q.answer = harvested.answer;
        q.answers = [harvested.answer];
        delete q._needsAnswerKey;
        ch = true;
        stats.qzMcq++;
      }
      if (harvested.correctValue != null && q.correctValue == null) {
        q.correctValue = harvested.correctValue;
        delete q._needsAnswerKey;
        ch = true;
        stats.qzNat++;
      }
      if (solScore(harvested.solution) > solScore(q.solution) + 8) {
        q.solution = harvested.solution;
        ch = true;
      }
      if (ch) {
        q._resolvedFrom = "quizrr_login";
        stats.qzFromQuizrrCache++;
        return;
      }
    }

    const donor = uniqueDonor(donors.byStem, q);
    if (!donor) return;
    let ch = false;
    if (isNum(q) || isNum(donor)) {
      if (donor.correctValue != null && q.correctValue == null) {
        q.correctValue = donor.correctValue;
        q.questionType = q.questionType || donor.questionType || "numerical";
        delete q._needsAnswerKey;
        ch = true;
        stats.qzNat++;
      }
    } else {
      const idx = alignAnswer(donor.options, q.options, donor.answer);
      if (idx != null && (q.answer == null || q._needsAnswerKey)) {
        q.answer = idx;
        q.answers = [idx];
        delete q._needsAnswerKey;
        ch = true;
        stats.qzMcq++;
      }
    }
    if (solScore(donor.solution) > solScore(q.solution) + 20) {
      q.solution = donor.solution;
      ch = true;
    }
    if (ch) {
      q._resolvedFrom = "official_bank_via_unique_stem";
      if (donor._marksId) q._marksId = q._marksId || donor._marksId;
      stats.qzFromBank++;
    }
  });

  files.forEach((data, abs) => {
    fs.writeFileSync(abs, JSON.stringify(data));
    stats.filesWritten++;
  });

  if (!SKIP_FB) {
    try {
      const admin = await initAdmin();
      const docs = [];
      const figUrls = [];
      files.forEach((data, abs) => {
        const qs = data.questions || (Array.isArray(data) ? data : null);
        if (!qs) return;
        const bank = /banks/.test(abs) ? path.basename(abs, ".json") : (/quizrr/.test(abs) ? "quizrr_pyq" : "book");
        qs.forEach((q) => {
          if (q._resolvedFrom) {
            const doc = toDoc(q, bank);
            docs.push(doc);
            extractImgUrls(doc.q + " " + (doc.options || []).map((o) => o.text).join(" ") + " " + doc.solution)
              .forEach((u) => figUrls.push(u));
          }
        });
      });
      console.log("Firestore docs", docs.length);
      stats.firestoreWrites = await writeFirestore(admin, docs);
      stats.figures = await uploadFigs(admin, figUrls);
      const db = admin.firestore();
      await db.collection("content_health").doc("summary").set({
        lastIdResolveAt: new Date().toISOString(),
        marksApplied: stats.marksApplied,
        quizrrFromBank: stats.qzFromBank,
        quizrrFromLogin: stats.qzFromQuizrrCache
      }, { merge: true });
    } catch (e) {
      console.error("Firebase:", e.message);
    }
  }

  const after = collectLeftovers();
  const report = {
    generatedAt: new Date().toISOString(),
    stats,
    leftoverAfter: { marksIds: after.marks.length, quizrrQs: after.quizrr.length }
  };
  saveJson(path.join(STATE_DIR, "resolve_ids_login_report.json"), report);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
