#!/usr/bin/env node
/**
 * Admin-only: login-token Marks fetch → local banks/books + Firestore + Storage.
 * Student site never calls Marks (STUDENT_MARKS_RUNTIME=false).
 *
 *   node scripts/hydrate-marks-to-firebase.js
 *   node scripts/hydrate-marks-to-firebase.js --limit 50
 *   node scripts/hydrate-marks-to-firebase.js --skip-firebase
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const proof = require("../lib/qx-proofread");

const ROOT = path.resolve(__dirname, "..");
const STATE_DIR = path.join(ROOT, "data", "_migration");
const STATE_PATH = path.join(STATE_DIR, "marks_hydrate_state.json");
const QID_DIR = path.join(ROOT, "data", "qid_marks");
const PROJECT = "quantrexacademy-app";
const BUCKET = "quantrexacademy-app.firebasestorage.app";
const MARKS_API = "https://web.getmarks.app/api/v1/questions/";

const argv = process.argv.slice(2);
const LIMIT = (() => {
  const i = argv.indexOf("--limit");
  return i >= 0 ? Math.max(1, parseInt(argv[i + 1], 10) || 0) : 0;
})();
const SKIP_FB = argv.includes("--skip-firebase");
const CONCURRENCY = 1;

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
function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function sha1(s) {
  return crypto.createHash("sha1").update(String(s || "")).digest("hex");
}
function readToken() {
  const cfg = loadJson(path.join(ROOT, "data", "marks_config.json"), {});
  const tok = String(cfg.token || process.env.MARKS_TOKEN || "").trim();
  if (!tok) return "";
  try {
    const p = JSON.parse(Buffer.from(tok.split(".")[1], "base64").toString("utf8"));
    if (p.exp && p.exp * 1000 < Date.now() + 60000) {
      console.warn("Marks token expired at", new Date(p.exp * 1000).toISOString());
    }
  } catch (_) { /* */ }
  return tok;
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
function isNum(q) {
  return /numerical|integer|nat|subjective|fill|written/i.test(String((q && (q.questionType || q.type)) || ""))
    || (q && q.correctValue != null && !(q.options || []).length);
}
function needsHydrate(q) {
  if (!q) return false;
  const raw = String(q.q || q.question || "");
  const stem = strip(raw);
  const emptyStem = (!stem || /^loading/i.test(stem) || /^(figure|fig\.?|diagram|image)$/i.test(stem)) && !/<img\b/i.test(raw);
  const missFig = /(the following (reaction|compound)|given (reaction|compound)|shown in (the )?(figure|diagram)|in the (given )?figure)/i.test(stem)
    && !/<img\b/i.test(raw + (q.options || []).join(" "));
  const badOpts = !isNum(q) && optScore(q.options) < 4;
  return { emptyStem, missFig, badOpts, need: emptyStem || missFig || badOpts, pri: badOpts ? 0 : (emptyStem ? 1 : 2) };
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
function applyRec(q, rec) {
  if (!q || !rec) return false;
  let ch = false;
  if (stemScore(rec.q) > stemScore(q.q || q.question) + 8) {
    if (q.q != null) q.q = rec.q;
    else q.question = rec.q;
    ch = true;
  }
  if (optScore(rec.options) > optScore(q.options)) {
    q.options = rec.options.slice();
    if (rec.answer != null) q.answer = rec.answer;
    ch = true;
  }
  if (solScore(rec.solution) > solScore(q.solution) + 20) {
    q.solution = rec.solution;
    ch = true;
  }
  if (rec.correctValue != null && q.correctValue == null) {
    q.correctValue = rec.correctValue;
    ch = true;
  }
  if (rec.questionType && /numerical|integer/i.test(rec.questionType)
    && !/numerical|integer/i.test(String(q.questionType || q.type || ""))) {
    q.questionType = rec.questionType;
    q.type = rec.questionType;
    ch = true;
  }
  if (rec._marksId && !q._marksId) q._marksId = rec._marksId;
  return ch;
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
function storagePublicUrl(storagePath) {
  return "https://firebasestorage.googleapis.com/v0/b/" + BUCKET +
    "/o/" + encodeURIComponent(storagePath) + "?alt=media";
}
function collectTargets() {
  const byId = new Map();
  function add(q, file, kind) {
    const mid = q && q._marksId ? String(q._marksId) : "";
    const flag = needsHydrate(q);
    if (!mid || !flag.need) return;
    if (!byId.has(mid)) byId.set(mid, { marksId: mid, files: [], kind, sampleId: q.id, pri: flag.pri, badOpts: flag.badOpts });
    const row = byId.get(mid);
    row.files.push(file);
    if (flag.pri < row.pri) row.pri = flag.pri;
  }
  const bankDir = path.join(ROOT, "data", "banks");
  fs.readdirSync(bankDir).filter((f) => f.endsWith(".json") && !f.includes(".bak")).forEach((f) => {
    const abs = path.join(bankDir, f);
    const qs = (loadJson(abs, {}).questions) || [];
    qs.forEach((q) => add(q, abs, "bank"));
  });
  function walk(dir, kind) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach((name) => {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) return walk(p, kind);
      if (!name.endsWith(".json") || name.startsWith("_")) return;
      const data = loadJson(p, null);
      const qs = data && (data.questions || (Array.isArray(data) ? data : null));
      if (!qs) return;
      qs.forEach((q) => add(q, p, kind));
    });
  }
  walk(path.join(ROOT, "data", "books", "chapters"), "book");
  walk(path.join(ROOT, "data", "tests"), "test");
  return [...byId.values()].sort((a, b) => (a.pri || 0) - (b.pri || 0));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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
    const d = data.data || data;
    const rec = marksToLocal(d);
    if (!rec) return { ok: false, status: res.status, detail: "empty" };
    return { ok: true, rec, raw: data };
  }
  return { ok: false, status: 429, detail: "rate_limit_exhausted" };
}

async function poolMap(items, n, fn) {
  let i = 0;
  const workers = Array.from({ length: Math.max(1, n) }, async () => {
    while (i < items.length) {
      const cur = i++;
      await fn(items[cur], cur);
    }
  });
  await Promise.all(workers);
}

function applyToFiles(fetched) {
  const files = new Map();
  fetched.forEach((row) => {
    (row.files || []).forEach((f) => {
      if (!files.has(f)) files.set(f, []);
      files.get(f).push(row);
    });
  });
  let filesWritten = 0;
  let qsApplied = 0;
  files.forEach((rows, abs) => {
    const data = loadJson(abs, null);
    if (!data) return;
    const qs = data.questions || (Array.isArray(data) ? data : null);
    if (!qs) return;
    const byMid = new Map();
    rows.forEach((r) => { if (r.rec) byMid.set(r.marksId, r.rec); });
    let ch = false;
    qs.forEach((q) => {
      const rec = q && q._marksId ? byMid.get(String(q._marksId)) : null;
      if (!rec) return;
      if (applyRec(q, rec)) {
        qsApplied++;
        ch = true;
      }
    });
    if (ch) {
      fs.writeFileSync(abs, JSON.stringify(data));
      filesWritten++;
    }
  });
  return { filesWritten, qsApplied };
}

function toDoc(q, bank, rec) {
  const questionText = String((q && (q.q || q.question)) || (rec && rec.q) || "");
  const opts = Array.isArray((q && q.options) || (rec && rec.options))
    ? ((q && q.options) || rec.options).map((o, i) => {
        if (o && typeof o === "object") return { id: o.id || String.fromCharCode(65 + i), text: o.text || "" };
        return { id: String.fromCharCode(65 + i), text: String(o || "") };
      })
    : [];
  const figUrls = extractImgUrls(questionText + " " + opts.map((o) => o.text).join(" "));
  const id = (q && q.id != null && String(q.id) !== "0") ? String(q.id) : String((q && q._marksId) || rec._marksId);
  const isNumeric = isNum(q || rec);
  const hasOpt = opts.some((o) => {
    const t = strip(o.text);
    return (t && !/^[A-D]$/i.test(t)) || /<img\b/i.test(o.text);
  });
  const stemOk = strip(questionText).length >= 2 || /<img\b/i.test(questionText);
  const ok = stemOk && (isNumeric || hasOpt);
  return {
    id,
    sourceId: (q && q._marksId) || rec._marksId || "",
    bank: bank || "",
    exam: (q && q.exam) || bank || "",
    subject: (q && q.subject) || "",
    chapter: (q && q.chapter) || "",
    questionText,
    q: questionText,
    questionType: (q && (q.questionType || q.type)) || rec.questionType || "singleCorrect",
    options: opts,
    correctAnswer: q && q.answer != null ? q.answer : rec.answer,
    answer: q && q.answer != null ? q.answer : rec.answer,
    answers: (q && q.answers) || null,
    correctValue: (q && q.correctValue != null) ? q.correctValue : rec.correctValue,
    solution: (q && q.solution) || rec.solution || "",
    explanation: (q && (q.explanation || q.solution)) || rec.solution || "",
    figure: figUrls[0] ? { sourceUrl: figUrls[0], storagePath: storagePathForUrl(figUrls[0]) } : null,
    figureUrls: figUrls,
    source: (q && q.source) || "marks_hydrate",
    contentHash: sha1(questionText + "\n" + opts.map((o) => o.text).join("\n")),
    migrationStatus: ok ? "completed" : "failed",
    validationErrors: ok ? [] : [!stemOk ? "missing_question_text" : "missing_options"],
    updatedAt: new Date().toISOString(),
    metadata: { origin: "marks_hydrate" }
  };
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

async function writeFirestore(admin, docs) {
  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  let batch = db.batch();
  let n = 0;
  let written = 0;
  for (const doc of docs) {
    if (!doc || !doc.id) continue;
    const ref = db.collection("questions").doc(String(doc.id));
    batch.set(ref, doc, { merge: true });
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
      process.stdout.write("  firestore written≈" + written + "\r");
    }
  }
  if (n) {
    await batch.commit();
    written += n;
  }
  process.stdout.write("\n");
  return written;
}

async function uploadFigs(admin, urls, state) {
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
      if (fail <= 8) console.warn("fig fail", dest, e.message);
    }
    if (i % 20 === 0) process.stdout.write("  figs " + (i + 1) + "/" + uniq.length + " ok=" + ok + " skip=" + skip + " fail=" + fail + "\r");
  }
  process.stdout.write("\n");
  state.figuresUploaded = (state.figuresUploaded || 0) + ok;
  state.figuresFailed = (state.figuresFailed || 0) + fail;
  state.figuresSkipped = (state.figuresSkipped || 0) + skip;
  return { ok, fail, skip, total: uniq.length };
}

async function main() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.mkdirSync(QID_DIR, { recursive: true });
  const token = readToken();
  if (!token) {
    console.error("No Marks token in data/marks_config.json");
    process.exit(1);
  }
  const state = Object.assign({
    done: {},
    failed: {},
    fetched: 0,
    applied: 0,
    filesWritten: 0,
    firestoreWrites: 0,
    figuresUploaded: 0,
    figuresFailed: 0,
    startedAt: new Date().toISOString()
  }, loadJson(STATE_PATH, {}));
  if (!state.done) state.done = {};
  if (!state.failed) state.failed = {};
  Object.keys(state.failed).forEach((k) => {
    if (/429|rate_limit/i.test(String(state.failed[k] || ""))) delete state.failed[k];
  });

  const targets = collectTargets();
  const pending = targets.filter((t) => !state.done[t.marksId]);
  const work = LIMIT ? pending.slice(0, LIMIT) : pending;
  console.log(JSON.stringify({
    totalNeed: targets.length,
    already: targets.length - pending.length,
    thisRun: work.length,
    skipFirebase: SKIP_FB
  }));

  let authDead = false;
  await poolMap(work, CONCURRENCY, async (t) => {
    if (authDead) return;
    try {
      const localRaw = path.join(QID_DIR, t.marksId + ".json");
      let rec = null;
      let raw = null;
      if (fs.existsSync(localRaw)) {
        raw = loadJson(localRaw, null);
        rec = raw && marksToLocal(raw.data || raw);
      }
      if (!rec || (optScore(rec.options) < 4 && stemScore(rec.q) < 20)) {
        const out = await fetchMarks(token, t.marksId);
        if (!out.ok) {
          state.failed[t.marksId] = out.status + " " + (out.detail || "");
          return;
        }
        rec = out.rec;
        raw = out.raw;
        fs.writeFileSync(localRaw, JSON.stringify(raw));
        await sleep(450);
      }
      t.rec = rec;
      state.done[t.marksId] = true;
      state.fetched += 1;
      delete state.failed[t.marksId];
      if (state.fetched % 25 === 0) {
        state.updatedAt = new Date().toISOString();
        saveJson(STATE_PATH, state);
        process.stdout.write("  fetched " + state.fetched + "/" + work.length + "\r");
      }
    } catch (e) {
      if (e && e.auth) {
        authDead = true;
        console.error("\nMarks login expired/rejected. Re-save token via SAVE_MARKS_TOKEN.bat");
        return;
      }
      state.failed[t.marksId] = String(e && e.message || e).slice(0, 160);
    }
  });
  process.stdout.write("\n");
  saveJson(STATE_PATH, state);

  const got = work.filter((t) => t.rec);
  const applied = applyToFiles(got);
  state.applied = (state.applied || 0) + applied.qsApplied;
  state.filesWritten = (state.filesWritten || 0) + applied.filesWritten;
  console.log("applied", applied);

  if (!SKIP_FB) {
    let admin;
    try {
      admin = await initAdmin();
    } catch (e) {
      console.error("Firebase admin init failed:", e.message);
      console.error("Run: gcloud auth application-default login");
      saveJson(STATE_PATH, state);
      process.exit(1);
    }
    const docs = [];
    const figUrls = [];
    got.forEach((t) => {
      if (!t.rec) return;
      const dummy = {
        id: t.sampleId,
        _marksId: t.marksId,
        q: t.rec.q,
        options: t.rec.options,
        answer: t.rec.answer,
        correctValue: t.rec.correctValue,
        solution: t.rec.solution,
        questionType: t.rec.questionType
      };
      const doc = toDoc(dummy, t.kind || "bank", t.rec);
      docs.push(doc);
      extractImgUrls(doc.q + " " + (doc.options || []).map((o) => o.text).join(" ") + " " + doc.solution)
        .forEach((u) => figUrls.push(u));
    });
    console.log("Writing Firestore docs", docs.length);
    state.firestoreWrites = (state.firestoreWrites || 0) + await writeFirestore(admin, docs);
    console.log("Uploading figures", figUrls.length);
    const figs = await uploadFigs(admin, figUrls, state);
    console.log("figures", figs);
    const db = admin.firestore();
    await db.collection("content_health").doc("summary").set({
      lastHydrateAt: new Date().toISOString(),
      hydrateFetched: state.fetched,
      hydrateApplied: state.applied,
      hydrateFailed: Object.keys(state.failed).length,
      figuresUploaded: state.figuresUploaded,
      figuresFailed: state.figuresFailed,
      studentMarksRuntime: false,
      projectId: PROJECT
    }, { merge: true });
  }

  state.updatedAt = new Date().toISOString();
  saveJson(STATE_PATH, state);
  const leftover = collectTargets().length;
  const out = {
    fetched: state.fetched,
    applied: state.applied,
    filesWritten: state.filesWritten,
    firestoreWrites: state.firestoreWrites,
    figuresUploaded: state.figuresUploaded,
    figuresFailed: state.figuresFailed,
    failedNow: Object.keys(state.failed).length,
    stillNeed: leftover,
    authDead
  };
  saveJson(path.join(STATE_DIR, "marks_hydrate_report.json"), out);
  console.log(JSON.stringify(out, null, 2));
  if (authDead) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
