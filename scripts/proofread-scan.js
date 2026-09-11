#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "data", "_migration");

function walk(dir, pred, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    let st;
    try { st = fs.statSync(p); } catch (_) { continue; }
    if (st.isDirectory()) walk(p, pred, acc);
    else if (pred(name, p)) acc.push(p);
  }
  return acc;
}

function loadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (_) { return null; }
}

function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function flagQuestion(q, file) {
  const raw = String(q.q || q.question || "");
  const stem = strip(raw);
  const opts = Array.isArray(q.options) ? q.options : [];
  const type = String(q.questionType || q.type || "");
  const isNum = /numerical|integer|nat|subjective|fill|written/i.test(type) || (q.correctValue != null && !opts.length);
  const flags = [];
  const hasImg = /<img\b/i.test(raw + opts.join(" "));
  if ((!stem || /^loading question/i.test(stem) || /^(figure|fig\.?|diagram|image)$/i.test(stem)) && !hasImg) {
    flags.push("empty_stem");
  }
  if (/https?:\/\/\.app\//i.test(raw + opts.join(" "))) flags.push("broken_host");
  if (/\$\$\\mathrm\{[A-Za-z]\}/.test(raw)) flags.push("shattered_tex");
  if (/\[\s*[\d.]+\s*pt\s*\]/i.test(raw)) flags.push("latex_rowskip");
  if (/LIST\s*[-–]?\s*I{1,2}\s*\$/i.test(raw)) flags.push("list_dollar_header");
  if (/\bloading\s*=|\bdecoding\s*=|cdn-question-pool|watermarked|&clean=/i.test(stem) && !/<img/i.test(raw)) flags.push("html_leak");
  const matchTalk = /list[\s\-]*i\b|column\s*match|match the (list|column|following)/i.test(stem);
  const matchHasBody = /<table/i.test(raw) || /\\begin\{(?:array|tabular)/i.test(raw) || hasImg || /List[\s\-]*II/i.test(raw);
  if (matchTalk && !matchHasBody) flags.push("match_missing_table");
  const saysFig = /\b(the figure|shown in (the )?(figure|diagram|graph)|shown below|as shown in)\b/i.test(stem);
  const textOnlyRxn = /\\mathrm|rightleftharpoons|rightarrow|\\ce\{|→|⇌/.test(raw) && !saysFig;
  const whichOnly = /^which of the following/i.test(stem) && !saysFig;
  if (saysFig && !hasImg && !textOnlyRxn && !whichOnly) flags.push("missing_needed_figure");
  if (!isNum) {
    const good = opts.filter((o) => {
      const t = strip(o);
      const s = String(o || "");
      if (/<img\b/i.test(s)) return true;
      if (/C_\{|\^\{|\\binom|\$/.test(s) && t.length > 1) return true;
      return t && !/^[A-D]$/i.test(t);
    });
    if (!opts.length) flags.push("no_options");
    else if (good.length < Math.min(2, opts.length) && opts.length >= 2) flags.push("empty_or_letter_options");
    if (opts.length && opts.every((o) => /^[A-D]$/i.test(strip(o))) && !opts.some((o) => /C_\{|\\binom/.test(String(o || "")))) {
      flags.push("letter_only_options");
    }
  } else if (!/subjective|written|fill/i.test(type)
    && q.correctValue == null && q.answer == null && !(q.answers && q.answers.length)) {
    flags.push("nat_missing_answer");
  }
  if (!flags.length) return null;
  return { id: q.id, marksId: q._marksId || "", file: path.relative(ROOT, file), flags, type: type || (isNum ? "numerical" : "mcq") };
}

function auditBanks() {
  const dir = path.join(ROOT, "data", "banks");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !f.includes(".bak"));
  const summary = [];
  const broken = [];
  let total = 0;
  for (const f of files) {
    const p = path.join(dir, f);
    const data = loadJson(p) || {};
    const qs = data.questions || [];
    total += qs.length;
    let emptyStem = 0, badOpts = 0, matchBad = 0, missFig = 0, natBad = 0, brokenHost = 0;
    qs.forEach((q) => {
      const row = flagQuestion(q, p);
      if (!row) return;
      broken.push(row);
      if (row.flags.includes("empty_stem")) emptyStem += 1;
      if (row.flags.includes("empty_or_letter_options") || row.flags.includes("letter_only_options") || row.flags.includes("no_options")) badOpts += 1;
      if (row.flags.includes("match_missing_table")) matchBad += 1;
      if (row.flags.includes("missing_needed_figure")) missFig += 1;
      if (row.flags.includes("nat_missing_answer")) natBad += 1;
      if (row.flags.includes("broken_host")) brokenHost += 1;
    });
    summary.push({ file: f, count: qs.length, emptyStem, badOpts, matchBad, missFig, natBad, brokenHost });
  }
  return { total, brokenCount: broken.length, summary, broken: broken.slice(0, 400) };
}

function auditBooks() {
  const root = path.join(ROOT, "data", "books", "chapters");
  const files = walk(root, (n) => n.endsWith(".json"), []);
  const books = {};
  const broken = [];
  let total = 0;
  let leftoverCdn = 0;
  let missingLocal = 0;
  for (const p of files) {
    const data = loadJson(p) || {};
    const qs = data.questions || [];
    const bookId = path.basename(path.dirname(p));
    if (!books[bookId]) books[bookId] = { chapters: 0, questions: 0, emptyStem: 0, badOpts: 0, leftoverCdn: 0 };
    books[bookId].chapters += 1;
    books[bookId].questions += qs.length;
    total += qs.length;
    qs.forEach((q) => {
      const blob = String(q.q || "") + (q.options || []).join(" ");
      if (/quizrr|watermarked_images|organic_book/i.test(blob) && !/qx-org-|\/assets\/diagrams\//i.test(blob)) {
        leftoverCdn += 1;
        books[bookId].leftoverCdn += 1;
      }
      const m = blob.match(/\/assets\/diagrams\/qx-org-[a-f0-9]+\.png/gi) || [];
      m.forEach((rel) => {
        const abs = path.join(ROOT, rel.replace(/^\//, "").split("?")[0]);
        if (!fs.existsSync(abs)) missingLocal += 1;
      });
      const row = flagQuestion(q, p);
      if (row) {
        broken.push(row);
        if (row.flags.includes("empty_stem")) books[bookId].emptyStem += 1;
        if (row.flags.includes("empty_or_letter_options") || row.flags.includes("no_options")) books[bookId].badOpts += 1;
      }
    });
  }
  return { total, chapters: files.length, brokenCount: broken.length, leftoverCdn, missingLocal, books, broken: broken.slice(0, 200) };
}

function auditRfc() {
  const nav = loadJson(path.join(ROOT, "data", "nav", "rfc.json"));
  const subjects = (nav && (nav.subjects || nav.data || nav)) || [];
  const list = Array.isArray(subjects) ? subjects : (subjects.subjects || []);
  const chDir = path.join(ROOT, "data", "rfc_offline", "chapters");
  const files = fs.existsSync(chDir) ? fs.readdirSync(chDir).filter((f) => f.endsWith(".json")) : [];
  let navChapters = 0;
  let navCards = 0;
  let missingFiles = 0;
  let emptyPacks = 0;
  let cardsOnDisk = 0;
  const missing = [];
  function slug(s) {
    return String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }
  function keyOf(s) {
    const n = String(s.name || s.title || "");
    if (/math/i.test(n)) return "mathematics";
    if (/chem/i.test(n)) return "chemistry";
    if (/bot/i.test(n)) return "botany";
    if (/zoo/i.test(n)) return "zoology";
    return "physics";
  }
  list.forEach((s) => {
    (s.chapters || []).forEach((c) => {
      navChapters += 1;
      navCards += Number(c.count) || 0;
      const file = keyOf(s) + "_" + slug(c.name) + ".json";
      const abs = path.join(chDir, file);
      if (!fs.existsSync(abs)) {
        missingFiles += 1;
        missing.push({ subject: s.name, chapter: c.name, file, count: c.count || 0 });
        return;
      }
      const pack = loadJson(abs) || {};
      const cards = pack.cards || pack.flashcards || [];
      cardsOnDisk += cards.length;
      if (!cards.length && (c.count || 0) > 0) emptyPacks += 1;
    });
  });
  return { navSubjects: list.length, navChapters, navCards, diskFiles: files.length, cardsOnDisk, missingFiles, emptyPacks, missing: missing.slice(0, 80) };
}

function auditFormulas() {
  const formulas = loadJson(path.join(ROOT, "data", "formulas.json"));
  const arr = Array.isArray(formulas) ? formulas : ((formulas && formulas.formulas) || []);
  let noHtml = 0;
  let noImg = 0;
  let brokenHost = 0;
  const bySub = {};
  arr.forEach((f) => {
    const sn = f.subject || "General";
    const cn = f.chapter || "Formulas";
    if (!bySub[sn]) bySub[sn] = { count: 0, chapters: {} };
    bySub[sn].count += 1;
    bySub[sn].chapters[cn] = (bySub[sn].chapters[cn] || 0) + 1;
    const html = String(f.formula || "");
    if (!html.trim()) noHtml += 1;
    if (!/<img\b/i.test(html) && html.length < 8) noImg += 1;
    if (/https?:\/\/\.app\//i.test(html)) brokenHost += 1;
  });
  const nav = loadJson(path.join(ROOT, "data", "nav", "formulas.json"));
  return {
    total: arr.length,
    noHtml,
    noImg,
    brokenHost,
    subjects: Object.keys(bySub).length,
    bySubject: Object.fromEntries(Object.entries(bySub).map(([k, v]) => [k, { count: v.count, chapters: Object.keys(v.chapters).length }])),
    navExists: !!nav
  };
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log("Scanning banks…");
  const banks = auditBanks();
  console.log("Scanning books…");
  const books = auditBooks();
  console.log("Scanning RFC…");
  const rfc = auditRfc();
  console.log("Scanning formulas…");
  const formulas = auditFormulas();
  const report = {
    generatedAt: new Date().toISOString(),
    banks,
    books,
    rfc,
    formulas
  };
  fs.writeFileSync(path.join(OUT, "proofread_scan.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT, "proofread_banks.json"), JSON.stringify(banks, null, 2));
  fs.writeFileSync(path.join(OUT, "proofread_books.json"), JSON.stringify(books, null, 2));
  fs.writeFileSync(path.join(OUT, "proofread_rfc.json"), JSON.stringify(rfc, null, 2));
  fs.writeFileSync(path.join(OUT, "proofread_formulas.json"), JSON.stringify(formulas, null, 2));
  console.log(JSON.stringify({
    banks: { total: banks.total, broken: banks.brokenCount, files: banks.summary.length },
    books: { total: books.total, broken: books.brokenCount, leftoverCdn: books.leftoverCdn, missingLocal: books.missingLocal },
    rfc: { navChapters: rfc.navChapters, missingFiles: rfc.missingFiles, emptyPacks: rfc.emptyPacks, cardsOnDisk: rfc.cardsOnDisk },
    formulas: { total: formulas.total, noHtml: formulas.noHtml, brokenHost: formulas.brokenHost }
  }, null, 2));
}

main();
