#!/usr/bin/env node
/**
 * Safe restore from Marks cache, Quizrr raw/local maps, Examgoal files.
 * Never invents stems/options/answers. Never copies via short generic stems.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const proof = require("../lib/qx-proofread");
const ROOT = path.resolve(__dirname, "..");

function load(p, fb) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (_) { return fb; }
}
function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function stemKey(s) {
  return strip(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function optNorm(s) {
  return strip(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
}
function imgKeys(html) {
  const out = [];
  const rx = /src=["']([^"']+)["']/gi;
  let m;
  while ((m = rx.exec(String(html || "")))) {
    const base = m[1].split("?")[0].split("/").pop().toLowerCase();
    if (base && base.length > 10) out.push(base);
  }
  return out;
}
function isGenericStem(s) {
  const t = strip(s);
  if (t.length < 70) return true;
  return /^(which of the following|match list|match the following|consider the following|assertion)/i.test(t);
}
function parseSolAnswer(sol, optN) {
  const s = String(sol || "");
  if (!s.trim()) return null;
  const hits = [];
  const rx = [
    /option\s*\(\s*([A-D])\s*\)\s*is\s*correct/i,
    /correct\s*(?:option|answer)\s*(?:is|:)\s*(?:option\s*)?([A-D])/i,
    /hence[,\s]+(?:the\s+)?(?:correct\s+)?option\s*(?:is|:)?\s*([A-D])/i,
    /\\boxed\{\s*(?:\\text\{)?\s*(?:option\s*)?([A-D])/i,
    /option\s*\(\s*([1-4])\s*\)\s*is\s*correct/i,
    /so\s+option\s*\(?\s*([1-4])\s*\)?\s*is\s*correct/i,
    /matches\s+(?:the\s+)?value[^.]*option\s*([A-D])/i
  ];
  rx.forEach((r) => {
    const m = s.match(r);
    if (!m) return;
    let idx;
    if (/[A-D]/i.test(m[1]) && !/^[1-4]$/.test(m[1])) idx = m[1].toUpperCase().charCodeAt(0) - 65;
    else idx = parseInt(m[1], 10) - 1;
    if (idx >= 0 && idx < (optN || 4)) hits.push(idx);
  });
  const uniq = [...new Set(hits)];
  return uniq.length === 1 ? uniq[0] : null;
}
function alignAnswer(donorOpts, recOpts, donorAns) {
  if (donorAns == null || donorAns < 0) return null;
  const want = optNorm((donorOpts || [])[donorAns] || "");
  if (!want || want.length < 2) return Number.isInteger(donorAns) ? donorAns : null;
  const rec = recOpts || [];
  for (let i = 0; i < rec.length; i++) {
    if (optNorm(rec[i]) === want) return i;
  }
  return Number.isInteger(donorAns) && rec.length === (donorOpts || []).length ? donorAns : null;
}

const stats = {
  qzAnsFromSol: 0,
  qzAnsFromImg: 0,
  qzAnsFromStem: 0,
  qzClearedFake: 0,
  qzSolFromBank: 0,
  egSolFromBank: 0,
  egAnsFromSol: 0,
  bookFigRemap: 0,
  bookFiles: 0,
  bankFromQid: 0,
  qzFiles: 0,
  egFiles: 0
};

console.log("Indexing banks…");
const byImg = new Map();
const byStem = new Map();
const byMarks = new Map();
fs.readdirSync(path.join(ROOT, "data", "banks")).filter((f) => f.endsWith(".json") && !f.includes(".bak")).forEach((f) => {
  const qs = (load(path.join(ROOT, "data", "banks", f), {}).questions) || [];
  qs.forEach((q) => {
    if (q._marksId) byMarks.set(String(q._marksId), q);
    imgKeys(q.q).forEach((k) => { if (!byImg.has(k)) byImg.set(k, q); });
    const sk = stemKey(q.q);
    if (sk.length >= 80 && !isGenericStem(q.q) && !byStem.has(sk)) byStem.set(sk, q);
  });
});
console.log("index img", byImg.size, "stem", byStem.size, "marks", byMarks.size);

function findDonor(q) {
  const imgs = imgKeys(q.q);
  for (const k of imgs) {
    if (byImg.has(k)) return { rec: byImg.get(k), via: "img" };
  }
  const sk = stemKey(q.q);
  if (sk.length >= 80 && !isGenericStem(q.q) && byStem.has(sk)) return { rec: byStem.get(sk), via: "stem" };
  if (q._marksId && byMarks.has(String(q._marksId))) return { rec: byMarks.get(String(q._marksId)), via: "marks" };
  return null;
}

function applyAnswer(q, donor, via) {
  if (!donor) return false;
  const idx = alignAnswer(donor.options, q.options, donor.answer);
  if (idx == null) return false;
  q.answer = idx;
  q.answers = [idx];
  delete q._needsAnswerKey;
  if (via === "img") stats.qzAnsFromImg++;
  else stats.qzAnsFromStem++;
  const dsol = String(donor.solution || "");
  if (dsol && strip(dsol).length > strip(q.solution).length + 20 && !/^no solution/i.test(strip(dsol))) {
    q.solution = proof.proofreadHtml(dsol);
    stats.qzSolFromBank++;
  }
  return true;
}

// 1) Quizrr: recover answers, clear fake A
console.log("Repairing Quizrr PYQ answers…");
const qzDir = path.join(ROOT, "data", "tests", "jee_main_quizrr_pyq_chapter", "questions");
fs.readdirSync(qzDir).filter((f) => f.endsWith(".json")).forEach((f) => {
  const abs = path.join(qzDir, f);
  const data = load(abs, null);
  const list = data && (data.questions || (Array.isArray(data) ? data : null));
  if (!list) return;
  let ch = false;
  list.forEach((q) => {
    if (!q || q._needsAnswerKey !== true) return;
    const fromSol = parseSolAnswer(q.solution, (q.options || []).length || 4);
    if (fromSol != null) {
      q.answer = fromSol;
      q.answers = [fromSol];
      delete q._needsAnswerKey;
      stats.qzAnsFromSol++;
      ch = true;
      return;
    }
    const hit = findDonor(q);
    if (hit && applyAnswer(q, hit.rec, hit.via)) {
      ch = true;
      return;
    }
    // do not leave fake "A is correct"
    if (q.answer === 0 && q._needsAnswerKey) {
      q.answer = null;
      q.answers = [];
      stats.qzClearedFake++;
      ch = true;
    }
  });
  if (ch) {
    fs.writeFileSync(abs, JSON.stringify(data));
    stats.qzFiles++;
  }
});

// 2) Examgoal: recover missing text solutions from bank; parse sol answers if letter
console.log("Repairing Examgoal solutions…");
const egDir = path.join(ROOT, "data", "tests", "jee_main_examgoal_2027", "questions");
fs.readdirSync(egDir).filter((f) => f.endsWith(".json") && !f.startsWith("_")).forEach((f) => {
  const abs = path.join(egDir, f);
  const data = load(abs, null);
  const list = Array.isArray(data) ? data : (data && data.questions);
  if (!list) return;
  let ch = false;
  list.forEach((q) => {
    const sol = q.solution || "";
    const hasImgSol = /<img\b/i.test(sol);
    const hasText = strip(sol).length > 20;
    if (!hasImgSol && !hasText) {
      const hit = findDonor(q);
      if (hit && hit.rec.solution && strip(hit.rec.solution).length > 20 && !/^no solution/i.test(strip(hit.rec.solution))) {
        q.solution = proof.proofreadHtml(hit.rec.solution);
        stats.egSolFromBank++;
        ch = true;
      }
    }
    if ((q.answer == null || q.answer === "") && (q.options || []).length) {
      const a = parseSolAnswer(q.solution, q.options.length);
      if (a != null) {
        q.answer = a;
        stats.egAnsFromSol++;
        ch = true;
      }
    }
  });
  if (ch) {
    fs.writeFileSync(abs, JSON.stringify(data));
    stats.egFiles++;
  }
});

// 3) Books: remap leftover Quizrr CDN → local diagrams (only if file exists)
console.log("Remapping book Quizrr figures…");
const man = load(path.join(ROOT, "data", "qx_book_figure_manifest.json"), {});
const figMap = man.map || {};
const orgMan = load(path.join(ROOT, "data", "qx_organic_figure_manifest.json"), {});
const orgMap = (orgMan && (orgMan.map || orgMan)) || {};
function localFor(url) {
  const u = String(url || "").split("?")[0];
  const loc = figMap[u] || figMap[url] || orgMap[u] || orgMap[url];
  if (!loc) return "";
  const rel = String(loc).replace(/^\//, "");
  if (!fs.existsSync(path.join(ROOT, rel))) return "";
  return "/" + rel.replace(/\\/g, "/");
}
function remapHtml(html) {
  return String(html || "").replace(/https:\/\/cdn\.quizrr\.in\/[^"'\\\s>]+/g, (u) => {
    const loc = localFor(u);
    if (loc) {
      stats.bookFigRemap++;
      return loc;
    }
    return u;
  });
}
function walkBooks(dir) {
  fs.readdirSync(dir).forEach((name) => {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) return walkBooks(p);
    if (!name.endsWith(".json")) return;
    const data = load(p, null);
    const qs = data && data.questions;
    if (!qs) return;
    let ch = false;
    qs.forEach((q) => {
      const nq = remapHtml(q.q);
      if (nq !== q.q) { q.q = nq; ch = true; }
      if (Array.isArray(q.options)) {
        q.options = q.options.map((o) => {
          const n = remapHtml(o);
          if (n !== o) ch = true;
          return n;
        });
      }
      if (q.solution) {
        const n = remapHtml(q.solution);
        if (n !== q.solution) { q.solution = n; ch = true; }
      }
      // letter-only: fill from exact bank stem/img
      const letter = (q.options || []).length >= 2 && (q.options || []).every((o) => /^[A-D]$/i.test(strip(o)));
      if (letter) {
        const hit = findDonor(q);
        if (hit && (hit.rec.options || []).some((o) => strip(o) && !/^[A-D]$/i.test(strip(o)))) {
          q.options = hit.rec.options.slice();
          if (hit.rec.answer != null) q.answer = hit.rec.answer;
          ch = true;
        }
      }
    });
    if (ch) {
      fs.writeFileSync(p, JSON.stringify(data));
      stats.bookFiles++;
    }
  });
}
walkBooks(path.join(ROOT, "data", "books", "chapters"));

// 4) Banks: leftover letter/NAT from already-fetched qid_marks (exact id only)
console.log("Applying leftover qid_marks to banks…");
const qidDir = path.join(ROOT, "data", "qid_marks");
const qid = Object.create(null);
if (fs.existsSync(qidDir)) {
  fs.readdirSync(qidDir).filter((f) => f.endsWith(".json")).forEach((f) => {
    const j = load(path.join(qidDir, f), null);
    const d = j && (j.data || j);
    if (!d) return;
    const opts = Array.isArray(d.options) ? d.options.map((o) => {
      let t = String((o && o.text) || "");
      const img = o && o.image && (typeof o.image === "string" ? o.image : o.image.url);
      if (img && !/<img/i.test(t)) t += '<img src="' + img + '"><br>';
      return proof.proofreadHtml(t);
    }) : [];
    let ans = null;
    if (Array.isArray(d.options)) {
      const i = d.options.findIndex((o) => o && o.isCorrect);
      if (i >= 0) ans = i;
    }
    qid[f.replace(/\.json$/, "")] = {
      q: proof.proofreadHtml((d.question && d.question.text) || ""),
      options: opts,
      answer: ans,
      correctValue: d.correctValue,
      solution: proof.proofreadHtml((d.solution && d.solution.text) || ""),
      type: d.type || ""
    };
  });
}
fs.readdirSync(path.join(ROOT, "data", "banks")).filter((f) => f.endsWith(".json") && !f.includes(".bak")).forEach((f) => {
  const abs = path.join(ROOT, "data", "banks", f);
  const data = load(abs, null);
  const qs = data && data.questions;
  if (!qs) return;
  let ch = false;
  qs.forEach((q) => {
    const rec = q._marksId ? qid[String(q._marksId)] : null;
    if (!rec) return;
    const letter = (q.options || []).length >= 2 && (q.options || []).every((o) => /^[A-D]$/i.test(strip(o)));
    if (letter && rec.options.some((o) => strip(o) && !/^[A-D]$/i.test(strip(o)))) {
      q.options = rec.options.slice();
      if (rec.answer != null) q.answer = rec.answer;
      stats.bankFromQid++;
      ch = true;
    }
    if (/numerical|integer/i.test(rec.type) && q.correctValue == null && rec.correctValue != null) {
      q.questionType = rec.type;
      q.type = rec.type;
      q.correctValue = rec.correctValue;
      stats.bankFromQid++;
      ch = true;
    }
  });
  if (ch) fs.writeFileSync(abs, JSON.stringify(data));
});

const report = path.join(ROOT, "data", "_migration", "repair_mqe_report.json");
fs.mkdirSync(path.dirname(report), { recursive: true });
fs.writeFileSync(report, JSON.stringify({ generatedAt: new Date().toISOString(), stats }, null, 2));
console.log(JSON.stringify(stats, null, 2));
