#!/usr/bin/env node
/**
 * Proofread: letter/empty A–D + fill-blank stem → numerical type.
 * Does NOT invent option text.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function isLetterOrEmptyOpts(opts) {
  if (!Array.isArray(opts) || !opts.length) return true;
  return opts.every((o) => {
    const s = String(o || "");
    if (/<img\b|smiles/i.test(s)) return false;
    const t = s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return !t || /^[A-D]$/i.test(t);
  });
}

function looksFillBlank(q) {
  const raw = String(q.q || q.question || "");
  const decoded = raw
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&lowbar;|&#95;|&#x5f;/gi, "_")
    .replace(/\\_+/g, "____");
  const t = decoded.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (/_{3,}|\\qquad|\\\\qquad|\\quad/i.test(decoded)) return true;
  if (/nearest\s*integer|integer\s*type|fill\s*in\s*the\s*blank|numerical\s*value/i.test(t)) return true;
  if (/\bis\s+[_.\-–—]{2,}/i.test(t)) return true;
  if (/\bpercentage of\b|\bmolar mass\b|\bthe value of\b/i.test(t) && isLetterOrEmptyOpts(q.options)) return true;
  return false;
}

function shouldBeNat(q) {
  if (!q) return false;
  const typ = String(q.questionType || q.type || "").toLowerCase();
  if (/numerical|subjective|integer|nat/.test(typ)) return false;
  if (!isLetterOrEmptyOpts(q.options)) return false;
  return looksFillBlank(q);
}

function walkJsonFile(abs, report) {
  let data;
  try { data = JSON.parse(fs.readFileSync(abs, "utf8")); } catch (_) { return 0; }
  const qs = Array.isArray(data) ? data : (data.questions || data.items || null);
  if (!Array.isArray(qs) || !qs.length) return 0;
  let n = 0;
  for (const q of qs) {
    if (!shouldBeNat(q)) continue;
    q.questionType = "numerical";
    q.type = "numerical";
    n++;
    if (report.samples.length < 12) {
      report.samples.push({
        file: path.relative(ROOT, abs),
        id: q.id,
        stem: String(q.q || "").replace(/<[^>]+>/g, " ").trim().slice(0, 90)
      });
    }
  }
  if (n) {
    fs.writeFileSync(abs, JSON.stringify(data));
    report.files.push({ file: path.relative(ROOT, abs), pinned: n });
  }
  return n;
}

function walkDir(dir, report) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) walkDir(abs, report);
    else if (name.endsWith(".json")) walkJsonFile(abs, report);
  }
}

const report = { files: [], samples: [], total: 0 };
const banks = path.join(ROOT, "data", "banks");
const tests = path.join(ROOT, "data", "tests");
walkDir(banks, report);
walkDir(tests, report);
report.total = report.files.reduce((s, f) => s + f.pinned, 0);
const out = path.join(ROOT, "data", "_migration", "nat_pin_report.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ totalPinned: report.total, files: report.files.length, samples: report.samples }, null, 2));
