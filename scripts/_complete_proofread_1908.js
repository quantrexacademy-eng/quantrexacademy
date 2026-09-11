#!/usr/bin/env node
"use strict";
/**
 * Complete Quantrex proofread — report only, never invents content.
 * Classifies leftovers vs scanner false-positives.
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "data", "_migration", "complete_proofread_1908.json");

function load(p, fb) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (_) { return fb; }
}
function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function walkJson(dir, acc, skipDirRx) {
  if (!fs.existsSync(dir)) return acc;
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n);
    let st;
    try { st = fs.statSync(p); } catch (_) { continue; }
    if (st.isDirectory()) {
      if (skipDirRx && skipDirRx.test(n)) continue;
      walkJson(p, acc, skipDirRx);
    } else if (n.endsWith(".json") && !n.includes(".bak") && !n.startsWith("_")) {
      acc.push(p);
    }
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
function optText(o) { return strip(o); }
function hasImg(s) { return /<img\b/i.test(String(s || "")); }
function letterOnly(opts) {
  if (!opts || opts.length < 2) return false;
  return opts.every((o) => {
    const t = optText(o);
    return /^[A-D]$/i.test(t) && !hasImg(o);
  });
}
function optGood(opts) {
  return (opts || []).some((o) => {
    const t = optText(o);
    return hasImg(o) || (t && !/^[A-D]$/i.test(t));
  });
}
function chemEq(raw) {
  return /\\mathrm|\\ce\{|rightleftharpoons|rightarrow|\\to\b|→|⇌|\\xrightarrow/i.test(String(raw || ""));
}
function hasTable(raw) {
  const s = String(raw || "");
  return /<table/i.test(s) || /\\begin\{(?:array|tabular)/i.test(s)
    || /\|[^\n]{2,}\|/.test(s) || /<mtable/i.test(s);
}
function figTalk(stem) {
  return /\b(the figure|shown in (the )?(figure|diagram|graph)|shown below|as shown in)\b/i.test(stem);
}
function geometryFig(stem) {
  return /figure formed by|figure (is|of) (a |an )?(triangle|parallelogram|quadrilateral|rectangle|square|rhombus|circle)/i.test(stem);
}

function classify(q) {
  const raw = String(q.q || q.question || "");
  const stem = strip(raw);
  const opts = q.options || [];
  const sol = String(q.solution || q.explanation || "");
  const img = hasImg(raw + opts.join(" ") + sol);
  const flags = [];
  const notes = [];

  if ((!stem || /^loading/i.test(stem) || /^(figure|fig\.?|diagram|image)$/i.test(stem)) && !img) {
    flags.push("empty_stem");
  }
  if (/https?:\/\/\.app\//i.test(raw + opts.join(" "))) flags.push("broken_host");
  if (/\$\$\\mathrm\{[A-Za-z]\}/.test(raw)) flags.push("shattered_tex");
  if (/\[\s*[\d.]+\s*pt\s*\]/i.test(raw)) flags.push("latex_rowskip");
  if (/LIST\s*[-–]?\s*I{1,2}\s*\$/i.test(raw)) flags.push("list_dollar");

  const matchTalk = /list[\s\-]*i\b|column\s*match|match the (list|column|following)/i.test(stem);
  if (matchTalk && !hasTable(raw) && !img && !/List[\s\-]*II/i.test(raw)) {
    flags.push("match_no_table");
  } else if (matchTalk && !hasTable(raw) && /List[\s\-]*II/i.test(raw)) {
    notes.push("match_inline_list");
  }

  if (figTalk(stem) && !img) {
    if (chemEq(raw) || geometryFig(stem)) notes.push("fig_talk_text_ok");
    else flags.push("says_fig_no_img");
  }

  if (!isNum(q)) {
    if (!opts.length) flags.push("no_options");
    else if (letterOnly(opts)) {
      flags.push("letter_only_opts");
      if (img) notes.push("letter_opts_but_stem_or_sol_has_img");
    } else if (!optGood(opts)) flags.push("empty_or_letter_opts");
  } else if (q.correctValue == null && q.answer == null && !(q.answers && q.answers.length)) {
    flags.push("nat_no_key");
  }

  const solTxt = strip(sol);
  if (!solTxt && !hasImg(sol)) flags.push("no_sol");

  const hasId = !!(q._marksId || q._quizrrId || q._examgoalId);
  return { flags, notes, hasId, img, stem: stem.slice(0, 80) };
}

function scanDir(rel, label, skipDirRx) {
  const files = walkJson(path.join(ROOT, rel), [], skipDirRx);
  const c = {
    label, files: files.length, qs: 0,
    emptyStem: 0, letterOpts: 0, letterWithId: 0, letterNoId: 0,
    noOpts: 0, natNoKey: 0, noSol: 0, noSolWithId: 0, noSolNoId: 0,
    saysFig: 0, figTalkOk: 0, matchBad: 0,
    brokenHost: 0, shattered: 0, rowskip: 0, listDollar: 0,
    hasImg: 0, withId: { marks: 0, quizrr: 0, eg: 0 }
  };
  const byFile = {};
  const samples = {};
  function add(k, rec) {
    if (!samples[k]) samples[k] = [];
    if (samples[k].length < 6) samples[k].push(rec);
  }
  files.forEach((p) => {
    const j = load(p, null);
    const relp = path.relative(ROOT, p);
    const fileKey = rel.startsWith("data/banks") ? path.basename(p)
      : (rel.startsWith("data/books") ? path.basename(path.dirname(p)) : path.basename(p));
    if (!byFile[fileKey]) byFile[fileKey] = { qs: 0, letter: 0, noSol: 0, fig: 0, nat: 0, empty: 0 };
    qsOf(j).forEach((q) => {
      c.qs += 1;
      byFile[fileKey].qs += 1;
      const raw = String(q.q || q.question || "");
      if (hasImg(raw + (q.options || []).join(" "))) c.hasImg += 1;
      if (q._marksId) c.withId.marks += 1;
      if (q._quizrrId) c.withId.quizrr += 1;
      if (q._examgoalId) c.withId.eg += 1;
      const r = classify(q);
      const rec = {
        file: relp, id: q.id,
        marks: q._marksId || "", quizrr: q._quizrrId || "", eg: q._examgoalId || "",
        type: q.questionType || q.type || "",
        stem: r.stem, notes: r.notes
      };
      r.flags.forEach((f) => {
        if (f === "empty_stem") { c.emptyStem += 1; byFile[fileKey].empty += 1; }
        if (f === "letter_only_opts" || f === "empty_or_letter_opts") {
          c.letterOpts += 1;
          byFile[fileKey].letter += 1;
          if (r.hasId) c.letterWithId += 1; else c.letterNoId += 1;
        }
        if (f === "no_options") c.noOpts += 1;
        if (f === "nat_no_key") { c.natNoKey += 1; byFile[fileKey].nat += 1; }
        if (f === "no_sol") {
          c.noSol += 1;
          byFile[fileKey].noSol += 1;
          if (r.hasId) c.noSolWithId += 1; else c.noSolNoId += 1;
        }
        if (f === "says_fig_no_img") { c.saysFig += 1; byFile[fileKey].fig += 1; }
        if (f === "match_no_table") c.matchBad += 1;
        if (f === "broken_host") c.brokenHost += 1;
        if (f === "shattered_tex") c.shattered += 1;
        if (f === "latex_rowskip") c.rowskip += 1;
        if (f === "list_dollar") c.listDollar += 1;
        add(f, rec);
      });
      if (r.notes.includes("fig_talk_text_ok")) c.figTalkOk += 1;
    });
  });
  const topLetter = Object.entries(byFile)
    .filter(([, v]) => v.letter || v.noSol || v.fig || v.nat)
    .sort((a, b) => (b[1].letter + b[1].noSol) - (a[1].letter + a[1].noSol))
    .slice(0, 12)
    .map(([k, v]) => ({ file: k, ...v }));
  return { ...c, topLetter, samples };
}

function bookNames() {
  const books = load(path.join(ROOT, "data", "books.json"), {});
  const map = {};
  [].concat(books.engineering || [], books.medical || []).forEach((b) => {
    if (b && b.id) map[b.id] = b.title || b.badge || b.id;
  });
  return map;
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
  return {
    eng: (books.engineering || []).length,
    med: (books.medical || []).length,
    comingSoon: [].concat(books.engineering || [], books.medical || []).filter((b) => b.isComingSoon).length,
    missingCovers: missing
  };
}

function quizrrLeftover() {
  const dir = path.join(ROOT, "data", "tests", "jee_main_quizrr_pyq_chapter", "questions");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_")) : [];
  let leftoverTests = 0, leftoverQs = 0, qs = 0;
  const tests = [];
  files.forEach((f) => {
    const j = load(path.join(dir, f), {});
    const list = qsOf(j);
    let left = 0;
    list.forEach((q) => {
      qs += 1;
      const num = isNum(q);
      const stem = strip(q.q);
      const opts = q.options || [];
      const noStem = !stem && !hasImg(q.q);
      const noKey = num
        ? (q.correctValue == null && q.answer == null)
        : (q.answer == null && !(q.answers && q.answers.length));
      const badOpt = !num && opts.length >= 2 && letterOnly(opts);
      if (noStem || noKey || badOpt) left += 1;
    });
    if (left) {
      leftoverTests += 1;
      leftoverQs += left;
      tests.push({ file: f, title: j.title || "", leftover: left, total: list.length });
    }
  });
  return { files: files.length, qs, leftoverTests, leftoverQs, tests: tests.slice(0, 20) };
}

function examgoalMeta() {
  const pack = path.join(ROOT, "data", "tests", "jee_main_examgoal_2027");
  const man = load(path.join(pack, "manifest.json"), {});
  const qdir = path.join(pack, "questions");
  const qfiles = fs.existsSync(qdir) ? fs.readdirSync(qdir).filter((f) => f.endsWith(".json") && !f.startsWith("_")).length : 0;
  return {
    total: man.totalTests, available: man.availableTests, upcoming: man.upcomingTests,
    shards: man.questionShards, qfiles
  };
}

function rfcAudit() {
  return load(path.join(ROOT, "data", "_migration", "proofread_rfc.json"), {});
}

function formulasAudit() {
  return load(path.join(ROOT, "data", "_migration", "proofread_formulas.json"), {});
}

function main() {
  const names = bookNames();
  const areas = [
    scanDir("data/banks", "banks"),
    scanDir("data/books/chapters", "books"),
    scanDir("data/tests/jee_main_examgoal_2027/questions", "examgoal"),
    scanDir("data/tests/jee_main_quizrr_pyq_chapter/questions", "quizrr_pyq"),
    scanDir("data/ncert_offline/chapters", "ncert"),
    scanDir("data/board_offline/chapters", "board"),
    scanDir("data/board_hsc_offline/chapters", "hsc")
  ];
  const booksArea = areas.find((a) => a.label === "books");
  if (booksArea && booksArea.topLetter) {
    booksArea.topLetter = booksArea.topLetter.map((row) => ({
      ...row, title: names[row.file] || row.file
    }));
  }
  const out = {
    generatedAt: new Date().toISOString(),
    pages: pageAudit(),
    booksMeta: covers(),
    examgoalMeta: examgoalMeta(),
    quizrrLeftover: quizrrLeftover(),
    rfc: rfcAudit(),
    formulas: formulasAudit(),
    areas: areas.map(({ samples, ...rest }) => rest),
    samples: Object.fromEntries(areas.map((a) => [a.label, a.samples]))
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  const slim = {
    generatedAt: out.generatedAt,
    pages: out.pages,
    booksMeta: out.booksMeta,
    examgoalMeta: out.examgoalMeta,
    quizrrLeftover: out.quizrrLeftover,
    rfc: out.rfc,
    formulas: out.formulas,
    areas: out.areas
  };
  console.log(JSON.stringify(slim, null, 2));
}

main();
