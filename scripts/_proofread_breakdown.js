#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
function load(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }

const banks = load(path.join(ROOT, "data", "_migration", "proofread_banks.json")) || {};
const books = load(path.join(ROOT, "data", "_migration", "proofread_books.json")) || {};
const scan = load(path.join(ROOT, "data", "_migration", "proofread_scan.json")) || {};

function flagCounts(broken) {
  const c = {};
  (broken || []).forEach((r) => (r.flags || []).forEach((f) => { c[f] = (c[f] || 0) + 1; }));
  return c;
}

const bankSum = (banks.summary || []).filter((s) => s.emptyStem || s.badOpts || s.matchBad || s.missFig || s.natBad || s.brokenHost)
  .sort((a, b) => (b.badOpts + b.missFig + b.emptyStem + b.natBad) - (a.badOpts + a.missFig + a.emptyStem + a.natBad));

const bookRows = Object.entries(books.books || {}).map(([id, b]) => ({
  id,
  questions: b.questions,
  emptyStem: b.emptyStem,
  badOpts: b.badOpts,
  leftoverCdn: b.leftoverCdn
})).filter((b) => b.emptyStem || b.badOpts || b.leftoverCdn)
  .sort((a, b) => (b.badOpts + b.emptyStem + b.leftoverCdn) - (a.badOpts + a.emptyStem + a.leftoverCdn));

console.log(JSON.stringify({
  bankFlags: flagCounts(banks.broken),
  bankHot: bankSum.slice(0, 15),
  bookFlags: flagCounts(books.broken),
  bookHot: bookRows.slice(0, 12),
  scanTop: scan
}, null, 2));
