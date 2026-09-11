"use strict";
/**
 * Sample audit: missing figures + garbled question format
 * across test series, digital books, PYQ banks.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const { displaySrc, ownedFigureUrl } = require("../qx-owned-figures");

const KATEX_DUMP = /span\s*class\s*=\s*["']?\s*katex|class\s*=\s*["']katex/i;
const KATEX_SPACED = /spanclass\s*=\s*["']?\s*katex|class\s*=\s*"katex\s*-\s*display"/i;
const CHEM_RAW = /CH_3|C_2H|H_2O|SO_4|NO_3|NH_4/;
const BROKEN_LEFT = /\\left\s*\$\s*\(/;
const BARE_FRAC = /(?:^|[>\s])\\frac\{/;
const GETMARKS_IMG = /src\s*=\s*["'][^"']*(?:cdn-question-pool\.getmarks|cdn-assets\.getmarks|cdn\.quizrr\.in)/i;
const IMG_SRC = /<img\b[^>]*\bsrc\s*=\s*["']([^"']*)["'][^>]*>/gi;
const EMPTY_SRC = /<img\b[^>]*\bsrc\s*=\s*["']\s*["']/i;

function walk(dir, acc, maxFiles, pred) {
  if (!fs.existsSync(dir) || acc.length >= maxFiles) return acc;
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return acc; }
  for (const e of ents) {
    if (acc.length >= maxFiles) break;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name.startsWith("_") || e.name === "node_modules") continue;
      walk(p, acc, maxFiles, pred);
    } else if (e.isFile() && e.name.endsWith(".json") && (!pred || pred(p))) {
      acc.push(p);
    }
  }
  return acc;
}

function blobOf(q) {
  const parts = [];
  const push = (v) => {
    if (v == null) return;
    if (typeof v === "string") parts.push(v);
    else if (Array.isArray(v)) v.forEach(push);
    else if (typeof v === "object") {
      ["q", "question", "stem", "text", "html", "solution", "explanation", "image", "img", "figure"].forEach((k) => push(v[k]));
      if (Array.isArray(v.options)) v.options.forEach(push);
    }
  };
  push(q);
  return parts.join("\n");
}

function stemOf(q) {
  if (!q || typeof q !== "object") return "";
  return String(q.q || q.question || q.stem || q.text || "");
}

function optsOf(q) {
  if (!q || typeof q !== "object") return [];
  const o = q.options || q.opts || [];
  if (!Array.isArray(o)) return [];
  return o.map((x) => {
    if (x == null) return "";
    if (typeof x === "string") return x;
    return String(x.text || x.html || x.value || "");
  });
}

function figUrls(blob) {
  const urls = [];
  let m;
  const rx = new RegExp(IMG_SRC.source, "gi");
  while ((m = rx.exec(blob))) urls.push(m[1]);
  if (/https?:\/\/\S+\.(?:png|webp|jpe?g|gif)/i.test(blob) && !urls.length) {
    const u = blob.match(/https?:\/\/[^\s"'<>]+\.(?:png|webp|jpe?g|gif)/gi);
    if (u) urls.push(...u);
  }
  return urls;
}

function analyzeQ(q, file) {
  const issues = [];
  const stem = stemOf(q);
  const opts = optsOf(q);
  const blob = blobOf(q);
  const id = q && (q.id || q._id || q._examgoalId || q._marksId) || "?";
  const type = String((q && (q.type || q.questionType)) || "mcq").toLowerCase();

  if (!stem.trim()) issues.push("emptyStem");
  if (/mcq|single|multi/.test(type) && opts.length && opts.every((o) => !String(o).trim())) issues.push("emptyOptions");
  if (KATEX_DUMP.test(blob) || KATEX_SPACED.test(blob)) issues.push("katexDump");
  if (CHEM_RAW.test(stem) && !/\$/.test(stem) && !/<sub/i.test(stem)) issues.push("rawChem");
  if (BROKEN_LEFT.test(blob)) issues.push("brokenLeft");
  if (GETMARKS_IMG.test(blob)) issues.push("rawMarksImg");
  if (EMPTY_SRC.test(blob)) issues.push("emptyImgSrc");

  const urls = figUrls(blob);
  const figIssues = [];
  for (const u of urls) {
    if (!u || u === "#" || /^data:image\/gif/i.test(u)) {
      figIssues.push({ u, issue: "emptyOrPlaceholder" });
      continue;
    }
    const disp = displaySrc(u);
    if (!disp) figIssues.push({ u: u.slice(0, 140), issue: "displaySrcEmpty" });
    else if (/getmarks\.app|quizrr\.in/i.test(disp) && !/proxy-image/i.test(disp)) {
      figIssues.push({ u: u.slice(0, 140), issue: "studentHitsMarks" });
    }
  }
  return { id, file, issues, figCount: urls.length, figIssues };
}

function extractQs(json) {
  if (Array.isArray(json)) return json.filter((x) => x && typeof x === "object");
  if (!json || typeof json !== "object") return [];
  if (Array.isArray(json.questions)) return json.questions;
  if (Array.isArray(json.items)) return json.items;
  if (Array.isArray(json.data)) return json.data;
  return [json];
}

function scanFiles(label, files, maxQs) {
  const out = {
    label,
    files: files.length,
    qs: 0,
    withFigs: 0,
    issues: {},
    samples: [],
    figIssueSamples: []
  };
  let n = 0;
  for (const f of files) {
    let json;
    try { json = JSON.parse(fs.readFileSync(f, "utf8")); } catch (_) { continue; }
    const qs = extractQs(json);
    for (const q of qs) {
      if (n >= maxQs) break;
      n++;
      const r = analyzeQ(q, path.relative(ROOT, f));
      out.qs++;
      if (r.figCount) out.withFigs++;
      r.issues.forEach((i) => { out.issues[i] = (out.issues[i] || 0) + 1; });
      if (r.issues.length && out.samples.length < 12) out.samples.push(r);
      if (r.figIssues.length && out.figIssueSamples.length < 12) {
        out.figIssueSamples.push({ id: r.id, file: r.file, figIssues: r.figIssues.slice(0, 3) });
      }
    }
    if (n >= maxQs) break;
  }
  return out;
}

function pick(dir, n, pred) {
  const all = walk(dir, [], 8000, pred);
  if (all.length <= n) return all;
  const step = Math.max(1, Math.floor(all.length / n));
  const picked = [];
  for (let i = 0; i < all.length && picked.length < n; i += step) picked.push(all[i]);
  return picked;
}

const reports = [];

reports.push(scanFiles(
  "test-series-examgoal-2027",
  pick(path.join(ROOT, "data/tests/jee_main_examgoal_2027/questions"), 40),
  2500
));

reports.push(scanFiles(
  "test-series-quizrr-pyq-chapter",
  pick(path.join(ROOT, "data/tests/jee_main_quizrr_pyq_chapter/questions"), 30),
  1500
));

reports.push(scanFiles(
  "digital-book-pyq-important",
  pick(path.join(ROOT, "data/books/chapters/6a91185f41ab5aba084f4d30"), 30),
  1500
));

reports.push(scanFiles(
  "digital-books-other",
  pick(path.join(ROOT, "data/books/chapters"), 40, (p) => !p.includes("6a91185f41ab5aba084f4d30")),
  1500
));

const bankDir = path.join(ROOT, "data/banks");
const bankFiles = ["jee_main.json", "jee_advanced.json", "neet.json", "bitsat.json", "nda.json"]
  .map((n) => path.join(bankDir, n))
  .filter((p) => fs.existsSync(p));
reports.push(scanFiles("pyq-banks", bankFiles, 800));

console.log(JSON.stringify(reports, null, 2));
