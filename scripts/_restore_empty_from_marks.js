#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const { convertHtml } = require("./_qx_mathml");
const ROOT = path.resolve(__dirname, "..");
const MARKS = path.join(ROOT, "data", "qid_marks");

function fmt(s) {
  let t = String(s == null ? "" : s);
  if (!t) return t;
  try { t = convertHtml(t).html; } catch (_) {}
  return t;
}
function recFrom(raw) {
  const d = raw && (raw.data || raw);
  if (!d || !d.question) return null;
  const sb = d.solution || {};
  let sol = fmt(sb.text || sb.html || "");
  const sImg = sb.image && (typeof sb.image === "string" ? sb.image : (sb.image.url || sb.image.src));
  if (typeof sImg === "string" && sImg && !/<img\b/i.test(sol)) {
    sol += "<img src=\"" + String(sImg).replace(/"/g, "") + "\">";
  }
  const opts = Array.isArray(d.options) ? d.options.map((o) => {
    if (!o) return "";
    if (typeof o === "string") return fmt(o);
    let t = fmt(o.text || o.html || "");
    const im = o.image && (typeof o.image === "string" ? o.image : (o.image.url || o.image.src));
    if (typeof im === "string" && im && !/<img\b/i.test(t)) t += "<img src=\"" + String(im).replace(/"/g, "") + "\">";
    return t;
  }) : [];
  const qb = d.question || {};
  let q = fmt(qb.text || qb.html || "");
  return { q, options: opts, solution: sol };
}
function plain(s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function isEmptySol(h) {
  const p = plain(h);
  if (/<img/i.test(String(h))) return false;
  if (p.length < 12) return true;
  return /solution not available|official solution is not available|community solution|support us by uploading/i.test(p);
}
function walk(dir, acc) {
  let names; try { names = fs.readdirSync(dir); } catch (_) { return acc; }
  for (const n of names) {
    if (n.startsWith("_") || n.includes(".bak")) continue;
    const p = path.join(dir, n);
    let st; try { st = fs.statSync(p); } catch (_) { continue; }
    if (st.isDirectory()) walk(p, acc);
    else if (n.endsWith(".json")) acc.push(p);
  }
  return acc;
}
function qsOf(j) {
  if (Array.isArray(j.questions)) return j.questions;
  if (Array.isArray(j) && j[0] && (j[0].q || j[0].id)) return j;
  return [];
}

let restored = 0, filesW = 0, checked = 0;
const files = [];
["data/banks/chapters", "data/books/chapters", "data/nav/pyq_papers"].forEach((d) => walk(path.join(ROOT, d), files));
for (const fp of files) {
  let j; try { j = JSON.parse(fs.readFileSync(fp, "utf8")); } catch (_) { continue; }
  const qs = qsOf(j);
  if (!qs.length) continue;
  let ch = false;
  for (const q of qs) {
    if (!q) continue;
    checked++;
    if (!isEmptySol(q.solution || q.explanation || "")) continue;
    const mid = String(q._marksId || q.marksId || "");
    if (!/^[a-f0-9]{24}$/i.test(mid)) continue;
    const mfp = path.join(MARKS, mid + ".json");
    if (!fs.existsSync(mfp)) continue;
    let rec = null;
    try { rec = recFrom(JSON.parse(fs.readFileSync(mfp, "utf8"))); } catch (_) { continue; }
    if (!rec || !(plain(rec.solution).length >= 12 || /<img/i.test(rec.solution))) continue;
    q.solution = rec.solution;
    q.explanation = rec.solution;
    restored++;
    ch = true;
  }
  if (ch) { fs.writeFileSync(fp, JSON.stringify(j), "utf8"); filesW++; }
}
console.log(JSON.stringify({ checked, restored, filesW }));
