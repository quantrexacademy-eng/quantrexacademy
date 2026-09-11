#!/usr/bin/env node
/**
 * Resolve leftover issues from existing sources only.
 * Never invents options/stems/figures. Never copies via generic stems.
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
function isGeneric(s) {
  const t = strip(s);
  if (t.length < 70) return true;
  return /^(which of the following|match list|match the following|consider the following|assertion)/i.test(t);
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
function optSetKey(opts) {
  const parts = (opts || []).map(optNorm).filter((s) => s.length > 2 && !/^[abcd]$/.test(s));
  if (parts.length < 3) return "";
  return parts.slice().sort().join("|");
}
function letterOpts(q) {
  const o = q.options || [];
  return o.length >= 2 && o.every((x) => /^[A-D]$/i.test(strip(x)));
}
function looksHowMany(q) {
  return /how many|number of |the value of|find (?:the )?(?:value|number)|nearest integer/i.test(strip(q.q || q.question));
}
function parseSolMcq(sol, n) {
  const s = String(sol || "");
  const hits = [];
  const rx = [
    /option\s*\(\s*([A-D])\s*\)\s*is\s*correct/i,
    /correct\s*(?:option|answer)\s*(?:is|:)\s*(?:option\s*)?([A-D])\b/i,
    /hence[,\s]+(?:the\s+)?(?:correct\s+)?option\s*(?:is|:)?\s*([A-D])\b/i,
    /\\boxed\{\s*(?:\\text\{)?\s*(?:option\s*)?([A-D])/i,
    /option\s*\(\s*([1-4])\s*\)\s*is\s*correct/i,
    /so\s+option\s*\(?\s*([1-4])\s*\)?\s*is\s*correct/i,
    /correct\s+answer\s+is\s+(?:option\s+)?([A-D])\b/i
  ];
  rx.forEach((r) => {
    const m = s.match(r);
    if (!m) return;
    let idx = /^[1-4]$/.test(m[1]) ? parseInt(m[1], 10) - 1 : m[1].toUpperCase().charCodeAt(0) - 65;
    if (idx >= 0 && idx < (n || 4)) hits.push(idx);
  });
  const u = [...new Set(hits)];
  return u.length === 1 ? u[0] : null;
}
function parseSolNat(sol) {
  const s = String(sol || "").replace(/<[^>]+>/g, " ");
  const hits = [];
  const rx = [
    /the correct answer is\s+([+\-]?\d+(?:\.\d+)?)/i,
    /correct answer is\s+([+\-]?\d+(?:\.\d+)?)/i,
    /\\boxed\{\s*([+\-]?\d+(?:\.\d+)?)\s*\}/,
    /answer\s*(?:is|:)\s*([+\-]?\d+(?:\.\d+)?)\s*(?:\.|$)/i,
    /hence[,\s]+(?:the\s+)?(?:value\s+is\s+)?([+\-]?\d+(?:\.\d+)?)\s*\./i
  ];
  rx.forEach((r) => {
    const m = s.match(r);
    if (m) hits.push(m[1]);
  });
  const u = [...new Set(hits)];
  return u.length === 1 ? u[0] : null;
}

const stats = {
  qzOptSet: 0, qzSolMcq: 0, qzSolNat: 0, qzStem: 0,
  bookNatFromSol: 0, bookOptsFromBank: 0, bookBbKey: 0,
  bankNatFromSol: 0, bankOptsFromStem: 0,
  cdnRemap: 0, files: 0
};

console.log("Indexing…");
const byStem = new Map();
const byImg = new Map();
const byOpt = new Map();
function addIdx(q) {
  const sk = stemKey(q.q || q.question || q.text);
  if (sk.length >= 80 && !isGeneric(sk) && !byStem.has(sk)) byStem.set(sk, q);
  imgKeys(q.q || q.question || q.text).forEach((k) => { if (!byImg.has(k)) byImg.set(k, q); });
  const ok = optSetKey(q.options);
  if (ok && !byOpt.has(ok)) byOpt.set(ok, q);
}
fs.readdirSync(path.join(ROOT, "data", "banks")).filter((f) => f.endsWith(".json") && !f.includes(".bak")).forEach((f) => {
  ((load(path.join(ROOT, "data", "banks", f), {}).questions) || []).forEach(addIdx);
});
// black book src
const bbByStem = new Map();
const bbDir = path.join(ROOT, "data", "blackbook_src");
if (fs.existsSync(bbDir)) {
  fs.readdirSync(bbDir).filter((f) => f.endsWith(".json")).forEach((f) => {
    const arr = load(path.join(bbDir, f), []);
    (Array.isArray(arr) ? arr : []).forEach((q) => {
      const sk = stemKey(q.text);
      if (sk.length >= 40) bbByStem.set(sk, q);
      addIdx({ q: q.text, options: q.options, answer: q.correctOption, solution: q.answerKeyStr || "" });
    });
  });
}
console.log("stems", byStem.size, "img", byImg.size, "optSets", byOpt.size, "bb", bbByStem.size);

function donorFor(q) {
  const imgs = imgKeys(q.q);
  for (const k of imgs) if (byImg.has(k)) return byImg.get(k);
  const ok = optSetKey(q.options);
  if (ok && byOpt.has(ok)) return byOpt.get(ok);
  const sk = stemKey(q.q);
  if (sk.length >= 80 && !isGeneric(q.q) && byStem.has(sk)) return byStem.get(sk);
  return null;
}
function alignAns(dOpts, rOpts, dAns) {
  if (dAns == null) return null;
  const want = optNorm((dOpts || [])[dAns] || "");
  if (want.length >= 2) {
    const i = (rOpts || []).findIndex((o) => optNorm(o) === want);
    if (i >= 0) return i;
  }
  return Number.isInteger(dAns) ? dAns : null;
}

// Quizrr
console.log("Quizrr…");
const qzDir = path.join(ROOT, "data", "tests", "jee_main_quizrr_pyq_chapter", "questions");
fs.readdirSync(qzDir).filter((f) => f.endsWith(".json")).forEach((f) => {
  const abs = path.join(qzDir, f);
  const data = load(abs, null);
  const list = data && data.questions;
  if (!list) return;
  let ch = false;
  list.forEach((q) => {
    const isNat = /numerical|integer|nat/i.test(String(q.questionType || q.type || ""));
    if (q.answer == null || q._needsAnswerKey) {
      const mcq = parseSolMcq(q.solution, (q.options || []).length);
      if (mcq != null) {
        q.answer = mcq; q.answers = [mcq]; delete q._needsAnswerKey; stats.qzSolMcq++; ch = true; return;
      }
      const nat = parseSolNat(q.solution);
      if (nat != null && (isNat || looksHowMany(q) || !(q.options || []).length)) {
        q.questionType = "numerical"; q.type = "numerical";
        q.correctValue = nat; q.answer = null; q.answers = [];
        delete q._needsAnswerKey; stats.qzSolNat++; ch = true; return;
      }
      const d = donorFor(q);
      if (d) {
        const ok = optSetKey(q.options);
        const viaOpt = ok && optSetKey(d.options) === ok;
        const idx = alignAns(d.options, q.options, d.answer);
        if (idx != null) {
          q.answer = idx; q.answers = [idx]; delete q._needsAnswerKey;
          if (viaOpt) stats.qzOptSet++; else stats.qzStem++;
          if (d.solution && strip(d.solution).length > strip(q.solution).length + 20)
            q.solution = proof.proofreadHtml(d.solution);
          ch = true;
        }
      }
    }
  });
  if (ch) { fs.writeFileSync(abs, JSON.stringify(data)); stats.files++; }
});

function pinNat(q, val) {
  q.questionType = "numerical";
  q.type = "numerical";
  q.correctValue = val;
  q.options = [];
  q.answer = null;
}

// Books
console.log("Books…");
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
      const sk = stemKey(q.q);
      const bb = sk.length >= 40 ? bbByStem.get(sk) : null;
      if (bb) {
        if (bb.options && bb.options.length && letterOpts(q)) {
          q.options = bb.options.slice();
          if (bb.correctOption != null) q.answer = bb.correctOption;
          stats.bookBbKey++; ch = true;
        }
        if (bb.answerKeyStr && /^\d+(?:\.\d+)?$/.test(String(bb.answerKeyStr).trim())) {
          pinNat(q, String(bb.answerKeyStr).trim());
          stats.bookBbKey++; ch = true;
        }
      }
      if (letterOpts(q)) {
        const nat = parseSolNat(q.solution);
        if (nat != null && looksHowMany(q)) {
          pinNat(q, nat); stats.bookNatFromSol++; ch = true; return;
        }
        const d = donorFor(q);
        if (d && (d.options || []).some((o) => strip(o) && !/^[A-D]$/i.test(strip(o)))) {
          q.options = d.options.slice();
          if (d.answer != null) q.answer = d.answer;
          stats.bookOptsFromBank++; ch = true;
        }
      }
      const isNat = /numerical|integer|nat/i.test(String(q.questionType || q.type || ""));
      if (isNat && q.correctValue == null && (q.answer === 0 || q.answer == null) && !(q.options || []).length) {
        const nat = parseSolNat(q.solution);
        if (nat != null) { q.correctValue = nat; q.answer = null; stats.bookNatFromSol++; ch = true; }
        else if (bb && bb.answerKeyStr && /^\d+(?:\.\d+)?$/.test(String(bb.answerKeyStr).trim())) {
          q.correctValue = String(bb.answerKeyStr).trim(); q.answer = null; stats.bookBbKey++; ch = true;
        } else if (q.answer === 0 && !q.correctValue) {
          q.answer = null;
          ch = true;
        }
      }
    });
    if (ch) { fs.writeFileSync(p, JSON.stringify(data)); stats.files++; }
  });
}
walkBooks(path.join(ROOT, "data", "books", "chapters"));

// Banks letter / how-many
console.log("Banks…");
fs.readdirSync(path.join(ROOT, "data", "banks")).filter((f) => f.endsWith(".json") && !f.includes(".bak")).forEach((f) => {
  const abs = path.join(ROOT, "data", "banks", f);
  const data = load(abs, null);
  const qs = data && data.questions;
  if (!qs) return;
  let ch = false;
  qs.forEach((q) => {
    if (letterOpts(q)) {
      const nat = parseSolNat(q.solution);
      if (nat != null && looksHowMany(q)) {
        pinNat(q, nat); stats.bankNatFromSol++; ch = true; return;
      }
      const d = donorFor(q);
      if (d && d !== q && (d.options || []).some((o) => strip(o) && !/^[A-D]$/i.test(strip(o)))) {
        q.options = d.options.slice();
        if (d.answer != null) q.answer = d.answer;
        stats.bankOptsFromStem++; ch = true;
      }
    }
  });
  if (ch) { fs.writeFileSync(abs, JSON.stringify(data)); stats.files++; }
});

// Examgoal leftover no-sol via unique stem
console.log("Examgoal…");
const egDir = path.join(ROOT, "data", "tests", "jee_main_examgoal_2027", "questions");
fs.readdirSync(egDir).filter((f) => f.endsWith(".json") && !f.startsWith("_")).forEach((f) => {
  const abs = path.join(egDir, f);
  const data = load(abs, null);
  const list = Array.isArray(data) ? data : null;
  if (!list) return;
  let ch = false;
  list.forEach((q) => {
    const sol = q.solution || "";
    if (/<img\b/i.test(sol) || strip(sol).length > 20) return;
    const d = donorFor(q);
    if (d && d.solution && strip(d.solution).length > 20 && !/^no solution/i.test(strip(d.solution))) {
      q.solution = proof.proofreadHtml(d.solution);
      ch = true;
    }
  });
  if (ch) { fs.writeFileSync(abs, JSON.stringify(data)); stats.files++; }
});

const out = path.join(ROOT, "data", "_migration", "resolve_remaining_report.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), stats }, null, 2));
console.log(JSON.stringify(stats, null, 2));
