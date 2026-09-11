#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
function load(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function strip(s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
const counts = {};
const samples = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach((n) => {
    const p = path.join(dir, n);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (n.startsWith("_")) return;
      return walk(p);
    }
    if (!n.endsWith(".json") || n.includes(".bak") || n.startsWith("_")) return;
    const j = load(p);
    const qs = j && (Array.isArray(j) ? j : j.questions);
    if (!qs) return;
    qs.forEach((q) => {
      if (!q || typeof q !== "object") return;
      const raw = String(q.q || q.question || "");
      const stem = strip(raw);
      const has = /<img/i.test(raw + (q.options || []).join(" "));
      if ((stem && !/^loading/i.test(stem)) || has) return;
      const top = path.relative(ROOT, p).split(path.sep).slice(0, 3).join("/");
      counts[top] = (counts[top] || 0) + 1;
      if (samples.length < 6) samples.push({ file: path.relative(ROOT, p), keys: Object.keys(q).slice(0, 10), id: q.id });
    });
  });
}
["data/banks", "data/books/chapters", "data/tests"].forEach((d) => walk(path.join(ROOT, d)));
console.log(JSON.stringify({ counts, samples, total: Object.values(counts).reduce((a, b) => a + b, 0) }, null, 2));
