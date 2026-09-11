#!/usr/bin/env node
/**
 * Fill leftover Quizrr NAT/MCQ keys from official solutions already on the
 * question, or from a unique official-bank donor (including MCQ→NAT number).
 * Never invents.
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
    .replace(/\$\$([\s\S]*?)\$\$/g, " $1 ")
    .replace(/\$([^$]+)\$/g, " $1 ")
    .replace(/\\mathrm\s*\{([^}]*)\}/g, " $1 ")
    .replace(/\\text\s*\{([^}]*)\}/g, " $1 ")
    .replace(/\\dfrac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, " $1 / $2 ")
    .replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, " $1 / $2 ")
    .replace(/\\boxed\s*\{([^}]*)\}/g, " BOXED $1 ")
    .replace(/\\[a-zA-Z]+/g, " ");
}
function norm(s) {
  return flattenMath(s).replace(/<[^>]+>/g, " ").replace(/&[#a-zA-Z0-9]+;/g, " ")
    .replace(/[^a-z0-9]+/gi, " ").toLowerCase().replace(/\s+/g, " ").trim();
}
function stemKey(s) {
  return norm(s).replace(/^(which of the following|consider the following statements|given below are two statements|match list i with list ii|match the following)\s+/, "");
}
function isNum(q) {
  return /numerical|integer|nat|subjective|fill/i.test(String(q.questionType || q.type || ""));
}
function parseNat(sol) {
  const s = flattenMath(sol).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const hits = [];
  const rx = [
    /BOXED\s+([+\-]?\d+(?:\.\d+)?)/,
    /(?:the\s+)?(?:correct\s+)?answer\s+is\s*[=:]?\s*([+\-]?\d+(?:\.\d+)?)/i,
    /hence[,\s]+(?:the\s+)?(?:value|answer|result)?\s*(?:is|=)\s*([+\-]?\d+(?:\.\d+)?)/i,
    /therefore[,\s]+(?:the\s+)?(?:value|answer)?\s*(?:is|=)\s*([+\-]?\d+(?:\.\d+)?)/i,
    /(?:required|desired)\s+(?:value|answer|speed|distance|time|ratio|number|magnitude)\s*(?:is|=)\s*([+\-]?\d+(?:\.\d+)?)/i,
    /so\s+(?:the\s+)?(?:value|answer|result)\s*(?:is|=)\s*([+\-]?\d+(?:\.\d+)?)/i,
    /=\s*([+\-]?\d+(?:\.\d+)?)\s*(?:\.|$)/
  ];
  // only last "=" if it appears after hence/therefore/so/thus near the end
  const tail = s.slice(-280);
  rx.forEach((r, i) => {
    const src = i === rx.length - 1 ? tail : s;
    const m = src.match(r);
    if (m) hits.push(m[1]);
  });
  const u = [...new Set(hits)];
  if (u.length === 1 && isFinite(Number(u[0]))) return Number(u[0]);
  return null;
}
function numFromOpt(o) {
  const t = strip(flattenMath(o)).replace(/,/g, "").replace(/\s+/g, "");
  if (/^[+\-]?\d+(?:\.\d+)?$/.test(t)) return Number(t);
  return null;
}

const byStem = new Map();
const bankDir = path.join(ROOT, "data", "banks");
fs.readdirSync(bankDir).filter((f) => f.endsWith(".json") && !f.includes(".bak")).forEach((f) => {
  ((load(path.join(bankDir, f), {}).questions) || []).forEach((q) => {
    if (q.answer == null && q.correctValue == null) return;
    const sk = stemKey(q.q || q.question);
    if (!sk || sk.length < 40) return;
    if (!byStem.has(sk)) byStem.set(sk, []);
    byStem.get(sk).push(q);
  });
});

const stats = { fromSol: 0, fromDonorNat: 0, fromDonorMcqNum: 0, files: 0 };
const qzDir = path.join(ROOT, "data", "tests", "jee_main_quizrr_pyq_chapter", "questions");
fs.readdirSync(qzDir).filter((f) => f.endsWith(".json")).forEach((f) => {
  const abs = path.join(qzDir, f);
  const data = load(abs, null);
  if (!data || !data.questions) return;
  let ch = false;
  data.questions.forEach((q) => {
    const need = q._needsAnswerKey || (q.answer == null && q.correctValue == null);
    if (!need) return;
    if (isNum(q) && q.correctValue == null) {
      const v = parseNat(q.solution || "");
      if (v != null) {
        q.correctValue = v;
        delete q._needsAnswerKey;
        q._resolvedFrom = "official_solution_nat";
        stats.fromSol++;
        ch = true;
        return;
      }
      const sk = stemKey(q.q);
      const hits = (!sk || sk.length < 40) ? [] : (byStem.get(sk) || []);
      let donor = null;
      if (hits.length === 1) donor = hits[0];
      else if (hits.length > 1) {
        const vals = [...new Set(hits.map((h) => {
          if (h.correctValue != null) return String(h.correctValue);
          if (h.answer != null) {
            const n = numFromOpt((h.options || [])[h.answer]);
            return n == null ? "" : String(n);
          }
          return "";
        }).filter(Boolean))];
        if (vals.length === 1) donor = hits[0];
      }
      if (donor) {
        if (donor.correctValue != null) {
          q.correctValue = donor.correctValue;
          delete q._needsAnswerKey;
          q._resolvedFrom = "official_bank_nat";
          stats.fromDonorNat++;
          ch = true;
          return;
        }
        if (donor.answer != null) {
          const n = numFromOpt((donor.options || [])[donor.answer]);
          if (n != null) {
            q.correctValue = n;
            delete q._needsAnswerKey;
            q._resolvedFrom = "official_bank_mcq_number";
            stats.fromDonorMcqNum++;
            ch = true;
          }
        }
      }
    }
  });
  if (ch) {
    fs.writeFileSync(abs, JSON.stringify(data));
    stats.files++;
  }
});

let left = 0, nat = 0, mcq = 0;
fs.readdirSync(qzDir).filter((f) => f.endsWith(".json")).forEach((f) => {
  (load(path.join(qzDir, f), {}).questions || []).forEach((q) => {
    if (!(q._needsAnswerKey || (q.answer == null && q.correctValue == null))) return;
    left++;
    if (isNum(q)) nat++; else mcq++;
  });
});
const report = { stats, leftoverNoKey: left, leftoverNat: nat, leftoverMcq: mcq };
fs.writeFileSync(path.join(ROOT, "data", "_migration", "apply_nat_official.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
