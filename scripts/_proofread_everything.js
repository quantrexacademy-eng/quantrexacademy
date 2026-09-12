#!/usr/bin/env node
"use strict";
/**
 * Full proofread pass on USB banks.
 * 1) leftover MathML → TeX
 * 2) mechanical cleanup (no invented keys)
 * 3) scan leftovers
 */
const fs = require("fs");
const path = require("path");
const { convertHtml } = require("./_qx_mathml");
const { proofreadHtml } = require("../lib/qx-proofread");

const ROOT = path.resolve(__dirname, "..");
const DIRS = [
  path.join(ROOT, "data", "banks"),
  path.join(ROOT, "data", "books", "chapters"),
  path.join(ROOT, "data", "tests"),
  path.join(ROOT, "data", "ncert_offline"),
  path.join(ROOT, "data", "board_offline"),
  path.join(ROOT, "data", "board_hsc_offline")
];

function walk(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const n of fs.readdirSync(dir)) {
    if (n.startsWith("_") || n.includes(".bak")) continue;
    const p = path.join(dir, n);
    let st;
    try { st = fs.statSync(p); } catch (_) { continue; }
    if (st.isDirectory()) walk(p, acc);
    else if (n.endsWith(".json")) acc.push(p);
  }
  return acc;
}

function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\$+/g, " ").replace(/\s+/g, " ").trim();
}

function fieldIssues(s) {
  const t = String(s || "");
  const issues = [];
  if (/<math\b/i.test(t)) issues.push("mathml");
  if (/\\sqrt\{\}\s*-/.test(t)) issues.push("empty_sqrt");
  if (/lim\s+[a-z]\s+1\/\+/.test(t)) issues.push("lim_plus");
  if (/\$[^$]{0,40}\\frac\{[^}]{0,8}\}\{\s*\+/.test(t)) issues.push("frac_plus");
  const plain = strip(t);
  if (!plain || plain.length < 8) issues.push("emptyish");
  return issues;
}

function processText(s) {
  if (typeof s !== "string" || !s) return { text: s, changed: false, issues: [] };
  let t = s;
  let changed = false;
  if (/<math\b/i.test(t)) {
    const r = convertHtml(t);
    if (r.changed) { t = r.html; changed = true; }
  }
  try {
    const p = proofreadHtml(t);
    if (p !== t) { t = p; changed = true; }
  } catch (_) { /* */ }
  return { text: t, changed, issues: fieldIssues(t) };
}

function processQuestion(q) {
  if (!q || typeof q !== "object") return { n: 0, issues: [] };
  let n = 0;
  const issues = [];
  ["q", "question", "questionText", "solution", "explanation", "sol"].forEach((k) => {
    if (typeof q[k] !== "string") return;
    const r = processText(q[k]);
    if (r.changed) { q[k] = r.text; n++; }
    r.issues.forEach((i) => issues.push(k + ":" + i));
  });
  if (Array.isArray(q.options)) {
    q.options = q.options.map((o, idx) => {
      if (typeof o === "string") {
        const r = processText(o);
        if (r.changed) n++;
        r.issues.forEach((i) => issues.push("opt" + idx + ":" + i));
        return r.changed ? r.text : o;
      }
      if (o && typeof o === "object") {
        ["text", "html", "q"].forEach((k) => {
          if (typeof o[k] === "string") {
            const r = processText(o[k]);
            if (r.changed) { o[k] = r.text; n++; }
            r.issues.forEach((i) => issues.push("opt" + idx + "." + k + ":" + i));
          }
        });
      }
      return o;
    });
  }
  const stem = strip(q.q || q.question || q.questionText || "");
  if (!stem) issues.push("empty_stem");
  const opts = q.options;
  if (Array.isArray(opts) && opts.length) {
    const filled = opts.filter((o) => {
      const t = typeof o === "string" ? o : (o && (o.text || o.html || o.q)) || "";
      const p = strip(t);
      return p && !/^[A-Da-d][\).:]?\s*$/.test(p);
    }).length;
    if (filled < 2 && opts.length >= 4) issues.push("letter_opts");
  }
  return { n, issues };
}

function walkQs(node, fn) {
  if (!node) return;
  if (Array.isArray(node)) { node.forEach((x) => walkQs(x, fn)); return; }
  if (typeof node !== "object") return;
  if (node.q || node.question || node.options || node.solution) fn(node);
  Object.keys(node).forEach((k) => {
    const v = node[k];
    if (v && typeof v === "object") walkQs(v, fn);
  });
}

function main() {
  const files = [];
  DIRS.forEach((d) => walk(d, files));
  const tally = {
    scannedFiles: 0,
    filesChanged: 0,
    fieldsChanged: 0,
    questions: 0,
    mathmlLeft: 0,
    emptyStem: 0,
    letterOpts: 0,
    emptySqrt: 0,
    emptyish: 0
  };
  const samples = { mathml: [], emptyStem: [], letterOpts: [], emptySqrt: [] };

  for (const fp of files) {
    tally.scannedFiles++;
    let j;
    try { j = JSON.parse(fs.readFileSync(fp, "utf8")); } catch (_) { continue; }
    let n = 0;
    walkQs(j, (q) => {
      tally.questions++;
      const r = processQuestion(q);
      n += r.n;
      r.issues.forEach((iss) => {
        if (iss.indexOf("mathml") >= 0) {
          tally.mathmlLeft++;
          if (samples.mathml.length < 5) samples.mathml.push(path.relative(ROOT, fp) + " #" + (q.id || ""));
        }
        if (iss === "empty_stem") {
          tally.emptyStem++;
          if (samples.emptyStem.length < 5) samples.emptyStem.push(path.relative(ROOT, fp) + " #" + (q.id || ""));
        }
        if (iss === "letter_opts") {
          tally.letterOpts++;
          if (samples.letterOpts.length < 5) samples.letterOpts.push(path.relative(ROOT, fp) + " #" + (q.id || ""));
        }
        if (iss.indexOf("empty_sqrt") >= 0) {
          tally.emptySqrt++;
          if (samples.emptySqrt.length < 5) samples.emptySqrt.push(path.relative(ROOT, fp) + " #" + (q.id || ""));
        }
        if (iss.indexOf("emptyish") >= 0) tally.emptyish++;
      });
    });
    if (n) {
      fs.writeFileSync(fp, JSON.stringify(j));
      tally.filesChanged++;
      tally.fieldsChanged += n;
    }
    if (tally.scannedFiles % 200 === 0) {
      console.log("scanned", tally.scannedFiles, "changed", tally.filesChanged, "qs", tally.questions);
    }
  }
  const out = path.join(ROOT, "data", "_migration", "proofread_everything.json");
  try { fs.mkdirSync(path.dirname(out), { recursive: true }); } catch (_) { /* */ }
  fs.writeFileSync(out, JSON.stringify({ tally, samples }, null, 2));
  console.log(JSON.stringify({ tally, samples }, null, 2));
}

main();
