#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

function load(p, fb) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (_) { return fb; }
}
function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function walkJson(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    let st;
    try { st = fs.statSync(p); } catch (_) { continue; }
    if (st.isDirectory()) walkJson(p, acc);
    else if (n.endsWith(".json") && !n.includes(".bak") && !n.startsWith("_")) acc.push(p);
  }
  return acc;
}
function qsOf(j) {
  if (!j) return [];
  if (Array.isArray(j)) return j;
  if (Array.isArray(j.questions)) return j.questions;
  return [];
}
function isNum(q) {
  return /numerical|integer|nat|subjective|fill|written/i.test(String(q.questionType || q.type || ""))
    || (q.correctValue != null && !(q.options || []).length);
}
function optGood(opts) {
  return (opts || []).some((o) => {
    const s = String(o || "");
    const t = strip(s);
    return /<img\b/i.test(s) || (t && !/^[A-D]$/i.test(t));
  });
}
function flag(q) {
  const raw = String(q.q || q.question || "");
  const stem = strip(raw);
  const opts = q.options || [];
  const sol = String(q.solution || q.explanation || "");
  const hasImg = /<img\b/i.test(raw + opts.join(" ") + sol);
  const flags = [];
  if ((!stem || /^loading/i.test(stem) || /^(figure|fig\.?|diagram|image)$/i.test(stem)) && !hasImg) flags.push("empty_stem");
  if (/https?:\/\/\.app\//i.test(raw + opts.join(" "))) flags.push("broken_host");
  if (/\$\$\\mathrm\{[A-Za-z]\}/.test(raw)) flags.push("shattered_tex");
  if (/\[\s*[\d.]+\s*pt\s*\]/i.test(raw)) flags.push("latex_rowskip");
  if (/LIST\s*[-–]?\s*I{1,2}\s*\$/i.test(raw)) flags.push("list_dollar");
  const matchTalk = /list[\s\-]*i\b|column\s*match|match the (list|column|following)/i.test(stem);
  const matchHas = /<table/i.test(raw) || /\\begin\{(?:array|tabular)/i.test(raw) || hasImg || /List[\s\-]*II/i.test(raw);
  if (matchTalk && !matchHas) flags.push("match_no_table");
  const saysFig = /\b(the figure|shown in (the )?(figure|diagram|graph)|shown below|as shown in)\b/i.test(stem);
  if (saysFig && !hasImg) flags.push("says_fig_no_img");
  if (!isNum(q)) {
    if (!opts.length) flags.push("no_options");
    else if (!optGood(opts)) flags.push("letter_only_opts");
  } else if (q.correctValue == null && q.answer == null) flags.push("nat_no_key");
  if (q._needsAnswerKey || (q.answer == null && q.correctValue == null && !isNum(q) && opts.length)) flags.push("no_key");
  const solTxt = strip(sol);
  if (!solTxt && !/<img/i.test(sol)) flags.push("no_sol");
  return flags;
}

function scanDir(rel, label) {
  const files = walkJson(path.join(ROOT, rel), []);
  const c = {
    label, files: files.length, qs: 0, emptyStem: 0, letterOpts: 0, noOpts: 0,
    noKey: 0, natNoKey: 0, noSol: 0, saysFig: 0, matchBad: 0, brokenHost: 0,
    shattered: 0, rowskip: 0, listDollar: 0, hasImg: 0, withId: { marks: 0, quizrr: 0, eg: 0 }
  };
  const samples = {};
  function add(flagName, rec) {
    if (!samples[flagName]) samples[flagName] = [];
    if (samples[flagName].length < 5) samples[flagName].push(rec);
  }
  files.forEach((p) => {
    const j = load(p, null);
    qsOf(j).forEach((q) => {
      c.qs += 1;
      const raw = String(q.q || q.question || "");
      if (/<img/i.test(raw + (q.options || []).join(" "))) c.hasImg += 1;
      if (q._marksId) c.withId.marks += 1;
      if (q._quizrrId) c.withId.quizrr += 1;
      if (q._examgoalId) c.withId.eg += 1;
      const flags = flag(q);
      flags.forEach((f) => {
        if (f === "empty_stem") c.emptyStem += 1;
        if (f === "letter_only_opts") c.letterOpts += 1;
        if (f === "no_options") c.noOpts += 1;
        if (f === "no_key") c.noKey += 1;
        if (f === "nat_no_key") c.natNoKey += 1;
        if (f === "no_sol") c.noSol += 1;
        if (f === "says_fig_no_img") c.saysFig += 1;
        if (f === "match_no_table") c.matchBad += 1;
        if (f === "broken_host") c.brokenHost += 1;
        if (f === "shattered_tex") c.shattered += 1;
        if (f === "latex_rowskip") c.rowskip += 1;
        if (f === "list_dollar") c.listDollar += 1;
        add(f, {
          file: path.relative(ROOT, p),
          id: q.id,
          marks: q._marksId || "",
          quizrr: q._quizrrId || "",
          eg: q._examgoalId || "",
          stem: strip(q.q || q.question).slice(0, 70)
        });
      });
    });
  });
  c.samples = samples;
  return c;
}

function pageAudit() {
  const pages = [
    "index.html", "login.html", "app.html", "admin.html", "pay.html",
    "examgoal-test-series.html", "quantrex-test-series.html", "test-series.html",
    "jee-main-pyq-chapter.html", "teacher-login.html", "q.html"
  ];
  const missing = [];
  const brand = [];
  pages.forEach((f) => {
    const abs = path.join(ROOT, f);
    if (!fs.existsSync(abs)) { missing.push(f); return; }
    const t = fs.readFileSync(abs, "utf8");
    if (/GetMarks App|Marks App(?! )/i.test(t) && !/STUDENT_MARKS|never call Marks/i.test(t)) {
      brand.push(f);
    }
  });
  const app = fs.readFileSync(path.join(ROOT, "app.html"), "utf8");
  const marksLive = fs.readFileSync(path.join(ROOT, "marks-live.js"), "utf8");
  return {
    missingPages: missing,
    brandHits: brand,
    build: (app.match(/QX_BUILD\s*=\s*"([^"]+)"/) || [])[1] || "",
    title: (app.match(/<title>([^<]+)/) || [])[1] || "",
    runtimeOff: /STUDENT_MARKS_RUNTIME\s*=\s*false/.test(marksLive),
    folderIcons: fs.existsSync(path.join(ROOT, "assets", "folder-icons"))
      ? fs.readdirSync(path.join(ROOT, "assets", "folder-icons")).length : 0
  };
}

function covers() {
  const books = load(path.join(ROOT, "data", "books.json"), {});
  const missing = [];
  (books.engineering || []).concat(books.medical || []).forEach((b) => {
    if (!b || !b.cover) return;
    const rel = String(b.cover).split("?")[0];
    if (!fs.existsSync(path.join(ROOT, rel))) missing.push({ id: b.id, title: b.title, cover: rel });
  });
  return { eng: (books.engineering || []).length, med: (books.medical || []).length, missingCovers: missing.slice(0, 20) };
}

function examgoalCats() {
  const pack = path.join(ROOT, "data", "tests", "jee_main_examgoal_2027");
  const man = load(path.join(pack, "manifest.json"), {});
  const qdir = path.join(pack, "questions");
  const qfiles = fs.existsSync(qdir) ? fs.readdirSync(qdir).filter((f) => f.endsWith(".json") && !f.startsWith("_")).length : 0;
  return {
    total: man.totalTests, available: man.availableTests, upcoming: man.upcomingTests, shards: man.questionShards, qfiles
  };
}

function main() {
  const areas = [
    scanDir("data/banks", "banks"),
    scanDir("data/books/chapters", "books"),
    scanDir("data/tests/jee_main_examgoal_2027/questions", "examgoal"),
    scanDir("data/tests/jee_main_quizrr_pyq_chapter/questions", "quizrr_pyq"),
    scanDir("data/ncert_offline/chapters", "ncert"),
    scanDir("data/board_offline/chapters", "board"),
    scanDir("data/board_hsc_offline/chapters", "hsc"),
    scanDir("data/quick_concepts", "quick_concepts")
  ];
  const out = {
    generatedAt: new Date().toISOString(),
    pages: pageAudit(),
    booksMeta: covers(),
    examgoalMeta: examgoalCats(),
    areas: areas.map((a) => {
      const { samples, ...rest } = a;
      return rest;
    }),
    samples: Object.fromEntries(areas.map((a) => [a.label, a.samples]))
  };
  fs.mkdirSync(path.join(ROOT, "data", "_migration"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "data", "_migration", "full_website_proofread.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({
    generatedAt: out.generatedAt,
    pages: out.pages,
    booksMeta: out.booksMeta,
    examgoalMeta: out.examgoalMeta,
    areas: out.areas
  }, null, 2));
}

main();
