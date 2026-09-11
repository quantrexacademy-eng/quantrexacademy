#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
function load(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function strip(s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function isNum(q) {
  return /numerical|integer|nat|subjective|fill|written/i.test(String(q.questionType || q.type || ""))
    || (q.correctValue != null && !(q.options || []).length);
}
function leftover(q) {
  const raw = String(q.q || q.question || "");
  const stem = strip(raw);
  const opts = q.options || [];
  const hasImg = /<img\b/i.test(raw + opts.join(" "));
  const letter = !isNum(q) && opts.length >= 2 && !opts.some((o) => {
    const s = String(o || ""); const t = strip(s);
    return /<img\b/i.test(s) || (t && !/^[A-D]$/i.test(t));
  });
  const empty = (!stem || /^loading/i.test(stem)) && !hasImg;
  const nat = isNum(q) && q.correctValue == null && q.answer == null;
  const fig = /\b(the figure|shown in (the )?(figure|diagram|graph)|shown below)\b/i.test(stem) && !hasImg;
  const noKey = q._needsAnswerKey || (!isNum(q) && q.answer == null && q.correctValue == null && opts.length);
  return { letter, empty, nat, fig, noKey, any: letter || empty || nat || fig || noKey };
}
const buckets = {
  letterWithId: 0, letterNoId: 0,
  figWithId: 0, figNoId: 0,
  natWithId: 0, natNoId: 0,
  emptyWithId: 0, emptyNoId: 0,
  noKeyWithId: 0, noKeyNoId: 0
};
const byBook = {};
function walk(dir, kind) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((n) => {
    const p = path.join(dir, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) return walk(p, kind);
    if (!n.endsWith(".json") || n.includes(".bak") || n.startsWith("_")) return;
    const j = load(p);
    const qs = j && (Array.isArray(j) ? j : j.questions);
    if (!qs) return;
    qs.forEach((q) => {
      const b = leftover(q);
      if (!b.any) return;
      const hasId = !!(q._marksId || q._quizrrId || q._examgoalId);
      if (b.letter) buckets[hasId ? "letterWithId" : "letterNoId"]++;
      if (b.fig) buckets[hasId ? "figWithId" : "figNoId"]++;
      if (b.nat) buckets[hasId ? "natWithId" : "natNoId"]++;
      if (b.empty) buckets[hasId ? "emptyWithId" : "emptyNoId"]++;
      if (b.noKey) buckets[hasId ? "noKeyWithId" : "noKeyNoId"]++;
      if (kind === "books") {
        const book = path.basename(path.dirname(p));
        byBook[book] = byBook[book] || { letter: 0, fig: 0, noId: 0 };
        if (b.letter) byBook[book].letter++;
        if (b.fig) byBook[book].fig++;
        if (!hasId) byBook[book].noId++;
      }
    });
  });
}
walk(path.join(ROOT, "data", "banks"), "banks");
walk(path.join(ROOT, "data", "books", "chapters"), "books");
walk(path.join(ROOT, "data", "tests"), "tests");
console.log(JSON.stringify({ buckets, byBook }, null, 2));
