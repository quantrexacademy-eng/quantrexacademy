"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

function walk(dir, acc) {
  if (!fs.existsSync(dir)) return acc;
  const st = fs.statSync(dir);
  if (st.isFile()) {
    if (dir.endsWith(".json") && !path.basename(dir).startsWith("_") && !dir.includes(".bak")) acc.push(dir);
    return acc;
  }
  for (const n of fs.readdirSync(dir)) {
    if (n.startsWith("_") || n.includes(".bak") || n === "qid_marks" || n === "clean_shards" || n === "_migration") continue;
    walk(path.join(dir, n), acc);
  }
  return acc;
}
function load(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (_) { return null; }
}
function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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
function blob(q) {
  return String(q.q || q.question || "") + " " + (q.options || []).join(" ") + " " + String(q.solution || q.explanation || "");
}
function flag(q) {
  const raw = String(q.q || q.question || "");
  const stem = strip(raw);
  const opts = q.options || [];
  const sol = String(q.solution || q.explanation || "");
  const all = blob(q);
  const hasImg = /<img\b/i.test(all);
  const flags = [];
  if ((!stem || /^loading/i.test(stem) || /^(figure|fig\.?|diagram|image)$/i.test(stem)) && !hasImg) flags.push("empty_stem");
  if (/https?:\/\/\.app\//i.test(all)) flags.push("broken_host");
  if (/\$\$\\mathrm\{[A-Za-z]\}/.test(raw)) flags.push("shattered_tex");
  if (/\[\s*[\d.]+\s*pt\s*\]/i.test(raw + sol)) flags.push("latex_rowskip");
  if (/LIST\s*[-–]?\s*I{1,2}\s*\$/i.test(raw)) flags.push("list_dollar");
  if (/\bMarks\b|getmarks|Get Marks/i.test(strip(all)) && !/cdn-question-pool|firebasestorage/i.test(all)) flags.push("marks_text");
  const matchTalk = /list[\s\-]*i\b|column\s*match|match the (list|column|following)/i.test(stem);
  const matchHas = /<table/i.test(raw) || /\\begin\{(?:array|tabular)/i.test(raw) || hasImg || /List[\s\-]*II/i.test(raw);
  if (matchTalk && !matchHas) flags.push("match_no_table");
  const saysFig = /\b(the figure|shown in (the )?(figure|diagram|graph)|shown below|as shown in)\b/i.test(stem);
  if (saysFig && !hasImg) flags.push("says_fig_no_img");
  if (!isNum(q)) {
    const good = opts.some((o) => {
      const t = strip(o);
      return /<img\b/i.test(String(o || "")) || (t && !/^[A-D]$/i.test(t));
    });
    if (!opts.length) flags.push("no_options");
    else if (!good) flags.push("letter_only_opts");
  } else if (q.correctValue == null && q.answer == null) flags.push("nat_no_key");
  const solTxt = strip(sol);
  if (!solTxt && !/<img/i.test(sol)) flags.push("no_sol");
  if (/cdn-question-pool\.getmarks|cdn-assets\.getmarks|cdn\.quizrr\.in/i.test(all)) flags.push("remote_cdn");
  return flags;
}

function scan(rel, label) {
  const files = walk(path.join(ROOT, rel), []);
  const c = {
    label, files: files.length, qs: 0, emptyStem: 0, letterOpts: 0, noOpts: 0,
    natNoKey: 0, noSol: 0, saysFig: 0, matchBad: 0, brokenHost: 0,
    shattered: 0, rowskip: 0, listDollar: 0, remoteCdn: 0, marksText: 0, hasImg: 0, hasSol: 0
  };
  const samples = {};
  files.forEach((p) => {
    const j = load(p);
    qsOf(j).forEach((q) => {
      c.qs += 1;
      const all = blob(q);
      if (/<img/i.test(all)) c.hasImg += 1;
      if (strip(q.solution || q.explanation)) c.hasSol += 1;
      flag(q).forEach((f) => {
        if (f === "empty_stem") c.emptyStem++;
        if (f === "letter_only_opts") c.letterOpts++;
        if (f === "no_options") c.noOpts++;
        if (f === "nat_no_key") c.natNoKey++;
        if (f === "no_sol") c.noSol++;
        if (f === "says_fig_no_img") c.saysFig++;
        if (f === "match_no_table") c.matchBad++;
        if (f === "broken_host") c.brokenHost++;
        if (f === "shattered_tex") c.shattered++;
        if (f === "latex_rowskip") c.rowskip++;
        if (f === "list_dollar") c.listDollar++;
        if (f === "remote_cdn") c.remoteCdn++;
        if (f === "marks_text") c.marksText++;
        if (!samples[f]) samples[f] = [];
        if (samples[f].length < 3) {
          samples[f].push({ id: q.id, file: path.relative(ROOT, p).slice(-70), stem: strip(q.q || q.question).slice(0, 60) });
        }
      });
    });
  });
  c.samples = samples;
  return c;
}

const areas = [
  scan("data/banks", "banks"),
  scan("data/books/chapters", "books"),
  scan("data/tests/jee_main_examgoal_2027/questions", "examgoal"),
  scan("data/tests/jee_main_quizrr_pyq_chapter/questions", "quizrr"),
  scan("data/ncert_offline/chapters", "ncert"),
  scan("data/board_offline/chapters", "board"),
  scan("data/board_hsc_offline/chapters", "hsc")
];
const slim = areas.map((a) => {
  const { samples, ...rest } = a;
  return rest;
});
console.log(JSON.stringify({ at: new Date().toISOString(), areas: slim, samples: Object.fromEntries(areas.map((a) => [a.label, a.samples])) }, null, 2));
fs.writeFileSync(path.join(ROOT, "data/_migration/proof_report_now.json"), JSON.stringify({ areas: slim, samples: Object.fromEntries(areas.map((a) => [a.label, a.samples])) }, null, 2));
