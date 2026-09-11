#!/usr/bin/env node
/**
 * Apply official keys to leftover Quizrr IDs from:
 *  1) quizrr_harvest.json (login)
 *  2) unique official-bank stem match with math-safe option align
 * Never invents. Never copies answer index if options cannot be aligned.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

function load(p, fb) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (_) { return fb; } }
function strip(s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function flattenMath(s) {
  return String(s || "")
    .replace(/<mn[^>]*>([\s\S]*?)<\/mn>/gi, " $1 ")
    .replace(/<mi[^>]*>([\s\S]*?)<\/mi>/gi, " $1 ")
    .replace(/<mo[^>]*>([\s\S]*?)<\/mo>/gi, " $1 ")
    .replace(/<mtext[^>]*>([\s\S]*?)<\/mtext>/gi, " $1 ")
    .replace(/\$\$([\s\S]*?)\$\$/g, " $1 ")
    .replace(/\$([^$]+)\$/g, " $1 ")
    .replace(/\\mathrm\s*\{([^}]*)\}/g, " $1 ")
    .replace(/\\text\s*\{([^}]*)\}/g, " $1 ")
    .replace(/\\dfrac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, " $1 $2 ")
    .replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, " $1 $2 ")
    .replace(/\\sqrt\s*\{([^}]*)\}/g, " $1 ")
    .replace(/\\left|\\right/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ");
}
function norm(s) {
  return flattenMath(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/&[#a-zA-Z0-9]+;/g, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
function stemKey(s) {
  let t = norm(s);
  t = t.replace(/^(which of the following|consider the following statements|given below are two statements|match list i with list ii|match the following|assertion a reason r)\s+/, "");
  return t;
}
function optKey(s) {
  return norm(s).replace(/\s+/g, "");
}
function nums(s) {
  return (flattenMath(s).match(/\d+(?:\.\d+)?/g) || []).join(",");
}
function isNum(q) {
  return /numerical|integer|nat|subjective|fill|written/i.test(String(q.questionType || q.type || ""))
    || (q.correctValue != null && !(q.options || []).length);
}
function generic(k) {
  return !k || k.length < 40;
}
function align(donorOpts, recOpts, donorAns) {
  if (donorAns == null || donorAns < 0) return null;
  const want = optKey((donorOpts || [])[donorAns] || "");
  const rec = recOpts || [];
  if (want && want.length >= 1) {
    const hits = [];
    rec.forEach((o, i) => { if (optKey(o) === want) hits.push(i); });
    if (hits.length === 1) return hits[0];
  }
  const wantN = nums((donorOpts || [])[donorAns] || "");
  if (wantN) {
    const hits = [];
    rec.forEach((o, i) => { if (nums(o) === wantN && nums(o)) hits.push(i); });
    if (hits.length === 1) return hits[0];
  }
  // same multiset of option fingerprints → same index is official same paper
  const a = (donorOpts || []).map(optKey).filter(Boolean).slice().sort().join("|");
  const b = rec.map(optKey).filter(Boolean).slice().sort().join("|");
  if (a && a === b && rec.length === (donorOpts || []).length) return donorAns;
  const an = (donorOpts || []).map(nums).filter(Boolean).slice().sort().join("|");
  const bn = rec.map(nums).filter(Boolean).slice().sort().join("|");
  if (an && an === bn && rec.length === (donorOpts || []).length && an.split("|").length >= 3) return donorAns;
  return null;
}

const byStem = new Map();
const bankDir = path.join(ROOT, "data", "banks");
fs.readdirSync(bankDir).filter((f) => f.endsWith(".json") && !f.includes(".bak")).forEach((f) => {
  const qs = (load(path.join(bankDir, f), {}).questions) || [];
  qs.forEach((q) => {
    if (q.answer == null && q.correctValue == null) return;
    const sk = stemKey(q.q || q.question);
    if (generic(sk)) return;
    if (!byStem.has(sk)) byStem.set(sk, []);
    byStem.get(sk).push(q);
  });
});

const harvest = load(path.join(ROOT, "data", "_migration", "quizrr_harvest.json"), { byId: {} });
const stats = { harvest: 0, unique: 0, multiSame: 0, nat: 0, mcq: 0, sol: 0, files: 0, noAlign: 0 };

function pickDonor(q) {
  const sk = stemKey(q.q || q.question);
  if (generic(sk)) return null;
  const hits = byStem.get(sk) || [];
  if (!hits.length) return null;
  if (hits.length === 1) return { rec: hits[0], via: "unique" };
  // all same official answer / value
  const ans = [...new Set(hits.map((h) => (isNum(h) ? "v:" + h.correctValue : "a:" + h.answer)))];
  if (ans.length === 1) return { rec: hits[0], via: "multiSame" };
  return null;
}

const qzDir = path.join(ROOT, "data", "tests", "jee_main_quizrr_pyq_chapter", "questions");
fs.readdirSync(qzDir).filter((f) => f.endsWith(".json")).forEach((f) => {
  const abs = path.join(qzDir, f);
  const data = load(abs, null);
  if (!data || !Array.isArray(data.questions)) return;
  let ch = false;
  data.questions.forEach((q) => {
    const need = q._needsAnswerKey || (q.answer == null && q.correctValue == null);
    if (!need) return;
    const hid = harvest.byId && harvest.byId[String(q._quizrrId || "")];
    if (hid) {
      if (hid.answer != null) {
        q.answer = hid.answer;
        q.answers = [hid.answer];
        delete q._needsAnswerKey;
        q._resolvedFrom = "quizrr_login";
        stats.harvest++;
        stats.mcq++;
        ch = true;
      }
      if (hid.correctValue != null) {
        q.correctValue = hid.correctValue;
        delete q._needsAnswerKey;
        q._resolvedFrom = "quizrr_login";
        stats.harvest++;
        stats.nat++;
        ch = true;
      }
      if (hid.solution && strip(hid.solution).length > strip(q.solution).length + 10) {
        q.solution = hid.solution;
        stats.sol++;
        ch = true;
      }
      if (!need && !q._needsAnswerKey) return;
    }
    const d = pickDonor(q);
    if (!d) return;
    const donor = d.rec;
    if (isNum(q) || isNum(donor) || /_+$|fill|value of|the value/i.test(strip(q.q))) {
      if (donor.correctValue != null && q.correctValue == null) {
        q.correctValue = donor.correctValue;
        q.questionType = q.questionType || "numerical";
        delete q._needsAnswerKey;
        q._resolvedFrom = "official_bank_" + d.via;
        stats.nat++;
        if (d.via === "unique") stats.unique++; else stats.multiSame++;
        ch = true;
      }
    }
    if (q.answer == null || q._needsAnswerKey) {
      const idx = align(donor.options, q.options, donor.answer);
      if (idx != null) {
        q.answer = idx;
        q.answers = [idx];
        delete q._needsAnswerKey;
        q._resolvedFrom = "official_bank_" + d.via;
        stats.mcq++;
        if (d.via === "unique") stats.unique++; else stats.multiSame++;
        ch = true;
      } else if (donor.answer != null) {
        stats.noAlign++;
      }
    }
    if (donor.solution && strip(donor.solution).length > strip(q.solution || "").length + 20) {
      q.solution = donor.solution;
      stats.sol++;
      ch = true;
    }
  });
  if (ch) {
    fs.writeFileSync(abs, JSON.stringify(data));
    stats.files++;
  }
});

// leftover recount
let left = 0, leftTests = 0;
fs.readdirSync(qzDir).filter((f) => f.endsWith(".json")).forEach((f) => {
  const qs = (load(path.join(qzDir, f), {}).questions) || [];
  const n = qs.filter((q) => q._needsAnswerKey || (q.answer == null && q.correctValue == null)).length;
  if (n) { left += n; leftTests++; }
});
const report = { stats, leftoverNoKey: left, leftoverTests: leftTests };
fs.writeFileSync(path.join(ROOT, "data", "_migration", "apply_quizrr_official_keys.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
