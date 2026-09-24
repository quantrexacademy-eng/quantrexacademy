#!/usr/bin/env node
"use strict";
/** USB-only: strip stem-echo, restore official Marks Q/opts/sol. Never invent. Never write C:. */
const fs = require("fs");
const path = require("path");
const { convertHtml } = require("./_qx_mathml");
const ROOT = path.resolve(__dirname, "..");
const MARKS = path.join(ROOT, "data", "qid_marks");
const OUT = path.join(ROOT, "data", "_proofread_fix.json");

function walk(dir, acc, max) {
  if (acc.length >= max) return acc;
  let names;
  try { names = fs.readdirSync(dir); } catch (_) { return acc; }
  for (const n of names) {
    if (acc.length >= max) break;
    if (n.startsWith("_") || n.includes(".bak") || n === "qid_marks" || n === "node_modules") continue;
    const p = path.join(dir, n);
    let st;
    try { st = fs.statSync(p); } catch (_) { continue; }
    if (st.isDirectory()) walk(p, acc, max);
    else if (n.endsWith(".json")) acc.push(p);
  }
  return acc;
}

function plain(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function fmt(s) {
  let t = String(s == null ? "" : s);
  if (!t) return t;
  try { t = convertHtml(t).html; } catch (_) { /* */ }
  t = t.replace(/cdn-question-pool\.\.+app/gi, "cdn-question-pool.getmarks.app");
  return t;
}

function recFrom(raw) {
  const d = raw && (raw.data || raw);
  if (!d || !d.question) return null;
  const qb = d.question || {};
  let q = fmt(qb.text || qb.html || "");
  const qImg = qb.image && (typeof qb.image === "string" ? qb.image : (qb.image.url || qb.image.src));
  if (typeof qImg === "string" && qImg && !/<img\b/i.test(q)) q += '\n<img src="' + qImg.replace(/"/g, "&quot;") + '">';
  const opts = Array.isArray(d.options)
    ? d.options.map((o) => {
        if (!o) return "";
        if (typeof o === "string") return fmt(o);
        let t = fmt(o.text || o.html || "");
        const im = o.image && (typeof o.image === "string" ? o.image : (o.image.url || o.image.src));
        if (typeof im === "string" && im && !/<img\b/i.test(t)) t += '\n<img src="' + im.replace(/"/g, "&quot;") + '">';
        return t;
      })
    : [];
  let answer = null;
  if (Array.isArray(d.options)) {
    const i = d.options.findIndex((x) => x && x.isCorrect);
    if (i >= 0) answer = i;
  }
  const sb = d.solution || {};
  let sol = fmt(sb.text || sb.html || "");
  const sImg = sb.image && (typeof sb.image === "string" ? sb.image : (sb.image.url || sb.image.src));
  if (typeof sImg === "string" && sImg && !/<img\b/i.test(sol)) sol += '\n<img src="' + sImg.replace(/"/g, "&quot;") + '">';
  return { q, options: opts, answer, solution: sol };
}

const marksCache = new Map();
function loadMarks(id) {
  const key = String(id || "");
  if (!key || key === "undefined") return null;
  if (marksCache.has(key)) return marksCache.get(key);
  const fp = path.join(MARKS, key + ".json");
  let rec = null;
  if (fs.existsSync(fp)) {
    try { rec = recFrom(JSON.parse(fs.readFileSync(fp, "utf8"))); } catch (_) { rec = null; }
  }
  marksCache.set(key, rec);
  if (marksCache.size > 4000) {
    const first = marksCache.keys().next().value;
    marksCache.delete(first);
  }
  return rec;
}

function stripStemEcho(sol, stem) {
  const stemP = plain(stem).toLowerCase();
  const head = stemP.slice(0, 40);
  if (head.length < 16) return { html: sol, cut: false };
  let s = String(sol || "");
  let cut = false;
  for (let n = 0; n < 16; n++) {
    const p = plain(s).toLowerCase();
    if (p.indexOf(head) !== 0) break;
    const m = /^(?:\s|&nbsp;|<br\s*\/?>|<(?:p|div|span|h[1-6]|li|blockquote)[^>]*>[\s\S]*?<\/(?:p|div|span|h[1-6]|li|blockquote)>)+/i.exec(s);
    if (!m || m[0].length < 8) break;
    if (m[0].length >= s.length - 12) break;
    s = s.slice(m[0].length);
    cut = true;
  }
  if (!cut) {
    const p = plain(s).toLowerCase();
    if (p.indexOf(head) === 0 && p.length > head.length + 20) {
      const idx = s.toLowerCase().indexOf(head.slice(0, 16));
      if (idx >= 0) {
        let i = idx + 16;
        const want = stemP.length;
        let seen = 16;
        while (i < s.length && seen < want) {
          if (s[i] === "<") {
            const c = s.indexOf(">", i);
            if (c < 0) break;
            i = c + 1;
            continue;
          }
          if (/\s/.test(s[i])) { i++; continue; }
          i++;
          seen++;
        }
        if (i > 20 && i < s.length - 12) {
          s = s.slice(i);
          cut = true;
        }
      }
    }
  }
  const left = plain(s);
  if (cut && left.length < 8 && !/<img/i.test(s)) return { html: sol, cut: false };
  return { html: s, cut };
}

function isNat(q) {
  const t = String(q.type || q.qType || q.kind || "").toLowerCase();
  if (/nat|numerical|integer|numeric|fill/.test(t)) return true;
  if (!Array.isArray(q.options) || q.options.length === 0) return true;
  return false;
}

function emptyStem(q) {
  const h = String(q.q || q.question || "");
  return plain(h).length < 8 && !/<img/i.test(h);
}
function emptySol(q) {
  const h = String(q.solution || q.explanation || "");
  return plain(h).length < 12 && !/<img/i.test(h);
}
function emptyOpts(q) {
  if (isNat(q)) return false;
  const opts = q.options || [];
  if (!opts.length) return true;
  return opts.every((o) => {
    const t = typeof o === "string" ? o : (o && (o.text || o.html || o.q)) || "";
    return plain(t).length < 1 && !/<img/i.test(String(t));
  });
}

function questionsOf(j) {
  if (!j) return [];
  if (Array.isArray(j.questions)) return j.questions;
  if (Array.isArray(j) && j[0] && (j[0].q || j[0].question || j[0].id)) return j;
  return [];
}

const stats = {
  files: 0, qs: 0, stemCut: 0, solRestored: 0, optRestored: 0, stemRestored: 0, filesWritten: 0
};

const DIRS = ["data/banks/chapters", "data/books/chapters", "data/nav/pyq_papers", "data/tests"];
const files = [];
for (const d of DIRS) walk(path.join(ROOT, d), files, 25000);
console.log("files", files.length);

for (const fp of files) {
  let j;
  try { j = JSON.parse(fs.readFileSync(fp, "utf8")); } catch (_) { continue; }
  const qs = questionsOf(j);
  if (!qs.length) continue;
  stats.files++;
  let changed = false;
  for (const q of qs) {
    if (!q || typeof q !== "object") continue;
    stats.qs++;
    const needMarks = emptyStem(q) || emptySol(q) || emptyOpts(q);
    const mk = needMarks ? loadMarks(q._marksId || q.marksId || q.id) : null;
    if (emptyStem(q) && mk && mk.q && plain(mk.q).length >= 8) {
      q.q = mk.q;
      q.question = mk.q;
      stats.stemRestored++;
      changed = true;
    }
    if (emptyOpts(q) && mk && mk.options && mk.options.length) {
      q.options = mk.options;
      if (mk.answer != null) q.answer = mk.answer;
      stats.optRestored++;
      changed = true;
    }
    if (emptySol(q) && mk && mk.solution && (plain(mk.solution).length >= 12 || /<img/i.test(mk.solution))) {
      q.solution = mk.solution;
      q.explanation = mk.solution;
      stats.solRestored++;
      changed = true;
    }
    const stem = q.q || q.question || "";
    const sol = q.solution || q.explanation || "";
    if (sol && stem) {
      const head = plain(stem).toLowerCase().slice(0, 24);
      if (head.length >= 16 && plain(sol).toLowerCase().indexOf(head) === 0) {
        const r = stripStemEcho(sol, stem);
        if (r.cut && r.html && r.html !== sol) {
          q.solution = r.html;
          if (q.explanation) q.explanation = r.html;
          stats.stemCut++;
          changed = true;
        }
      }
    }
  }
  if (changed) {
    fs.writeFileSync(fp, JSON.stringify(j), "utf8");
    stats.filesWritten++;
    if (stats.filesWritten % 50 === 0) console.log("written", stats.filesWritten, stats);
  }
}

fs.writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), stats }, null, 2), "utf8");
console.log("DONE", JSON.stringify(stats, null, 2));
console.log("WROTE", OUT);
