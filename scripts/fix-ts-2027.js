#!/usr/bin/env node
/**
 * Repair JEE Main 2027 test-series questions:
 * - fill empty stems/options from local jee_main / jee_advanced banks
 * - repair https://.app/ hosts
 * - treat LaTeX arrays as valid match content
 * - fetch Marks only for remaining holes (admin)
 */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const TOKEN = (() => {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "marks_config.json"), "utf8"));
    return j.token || "";
  } catch (_) { return process.env.MARKS_TOKEN || ""; }
})();

function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function repairHost(s) {
  return String(s || "")
    .replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/")
    .replace(/https?:\/\/cdn-question-pool\.app\//gi, "https://cdn-question-pool.getmarks.app/");
}
function hasTableOrArray(html) {
  const s = String(html || "");
  return /<table/i.test(s) || /\\begin\{array/i.test(s) || /\\begin\{tabular/i.test(s);
}
function hasFig(html) {
  return /<img\b/i.test(String(html || ""));
}
function optsGood(opts) {
  return (opts || []).some((o) => {
    const t = strip(o);
    return (t && !/^[A-D]$/i.test(t)) || /<img/i.test(String(o || "")) || /C_\{|\\binom|\$/.test(String(o || ""));
  });
}
function isNum(q) {
  return /numerical|integer|nat/i.test(String(q.questionType || q.type || ""))
    || (q.correctValue != null && !(q.options || []).length);
}

function flagsOf(q) {
  const raw = repairHost(String(q.q || q.question || ""));
  const stem = strip(raw);
  const opts = q.options || [];
  const flags = [];
  if (!stem || /^loading/i.test(stem)) flags.push("empty_stem");
  if (/list[\s\-]*i/i.test(stem) && !hasTableOrArray(raw) && !hasFig(raw)
    && stem.length < 80) flags.push("match_thin");
  if (/\b(figure|diagram)\b/i.test(stem) && !hasFig(raw + opts.join(" "))
    && !/law of|following reaction|following compound/i.test(stem)) flags.push("need_fig");
  if (!isNum(q) && !optsGood(opts)) flags.push("bad_opts");
  if (isNum(q) && q.correctValue == null && q.answer == null) flags.push("nat_no_ans");
  return flags;
}

function indexBank(file) {
  const p = path.join(ROOT, "data", "banks", file);
  if (!fs.existsSync(p)) return { byMarks: {}, byId: {}, byStem: {} };
  const qs = (JSON.parse(fs.readFileSync(p, "utf8")).questions) || [];
  const byMarks = Object.create(null);
  const byId = Object.create(null);
  const byStem = Object.create(null);
  qs.forEach((q) => {
    if (q._marksId) byMarks[String(q._marksId)] = q;
    if (q.id != null) byId[String(q.id)] = q;
    const st = strip(q.q).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);
    if (st.length > 24 && !byStem[st]) byStem[st] = q;
  });
  return { byMarks, byId, byStem };
}

function applyBank(q, rec) {
  if (!rec) return false;
  let changed = false;
  const recQ = repairHost(rec.q || rec.question || "");
  const cur = String(q.q || q.question || "");
  if ((!strip(cur) || strip(cur).length < 12) && strip(recQ).length > 12) {
    q.q = recQ;
    q.question = recQ;
    changed = true;
  } else if (strip(cur) && recQ && recQ.length > cur.length + 40 && hasTableOrArray(recQ) && !hasTableOrArray(cur)) {
    q.q = recQ;
    q.question = recQ;
    changed = true;
  } else if (hasFig(recQ) && !hasFig(cur) && /figure|diagram|structure|reaction/i.test(strip(cur))) {
    q.q = recQ;
    q.question = recQ;
    changed = true;
  }
  if (!optsGood(q.options) && optsGood(rec.options)) {
    q.options = rec.options.slice();
    changed = true;
  }
  if (q.answer == null && rec.answer != null) { q.answer = rec.answer; changed = true; }
  if (q.correctValue == null && rec.correctValue != null) { q.correctValue = rec.correctValue; changed = true; }
  if (rec.solution && (!q.solution || String(q.solution).length < 20)) { q.solution = rec.solution; changed = true; }
  if (rec._marksId && !q._marksId) q._marksId = rec._marksId;
  return changed;
}

async function fetchMarks(id) {
  if (!TOKEN || !id) return null;
  const url = "https://web.getmarks.app/api/v1/questions/" + encodeURIComponent(id);
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: "Bearer " + TOKEN,
        Accept: "application/json",
        Origin: "https://web.getmarks.app",
        Referer: "https://web.getmarks.app/"
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const d = data.data || data;
    if (!d) return null;
    const qBody = d.question || d.title || {};
    const text = qBody.text || qBody.html || "";
    const rawOpts = Array.isArray(d.options) ? d.options : [];
    const opts = rawOpts.map((o) => {
      if (!o) return "";
      if (typeof o === "string") return o;
      let t = String(o.text || "");
      let img = o.image || o.img;
      if (img && typeof img === "object") img = img.url || img.src;
      if (img && !/<img/i.test(t)) t += `<img src="${img}">`;
      return t;
    });
    return {
      q: text,
      options: opts,
      answer: d.correctIndex != null ? d.correctIndex : undefined,
      correctValue: d.correctValue,
      solution: (d.solution && (d.solution.text || d.solution.html)) || "",
      _marksId: id
    };
  } catch (_) {
    return null;
  }
}

function walkTests(dir) {
  const qdir = path.join(dir, "questions");
  if (!fs.existsSync(qdir)) return [];
  return fs.readdirSync(qdir).filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => path.join(qdir, f));
}

async function repairDir(dir, banks, stats) {
  const files = walkTests(dir);
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const isArr = Array.isArray(raw);
    const list = isArr ? raw : (raw.questions || []);
    let changedFile = false;
    for (const q of list) {
      if (q.q) q.q = repairHost(q.q);
      if (q.question) q.question = repairHost(q.question);
      if (Array.isArray(q.options)) q.options = q.options.map(repairHost);
      const before = flagsOf(q);
      if (!before.length) continue;
      stats.flagged += 1;
      let hit = null;
      const mid = q._marksId
        || (String(q.id || "").indexOf("qz_") === 0 ? String(q.id).slice(3) : "")
        || (String(q._quizrrId || "").replace(/^qz[-_]/, ""));
      if (mid) hit = banks.jee.byMarks[mid] || banks.adv.byMarks[mid];
      if (!hit && q.id != null) hit = banks.jee.byId[String(q.id)] || banks.adv.byId[String(q.id)];
      const st = strip(q.q || q.question).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);
      if (!hit && st.length > 24) hit = banks.jee.byStem[st] || banks.adv.byStem[st];
      if (applyBank(q, hit)) {
        stats.fromBank += 1;
        changedFile = true;
      }
      if (flagsOf(q).length && mid) {
        const mk = await fetchMarks(mid);
        if (applyBank(q, mk)) {
          stats.fromMarks += 1;
          changedFile = true;
        }
      }
      const after = flagsOf(q);
      if (!after.length) stats.fixed += 1;
      else stats.still.push({ file: path.basename(file), id: q.id, flags: after, stem: strip(q.q).slice(0, 70) });
    }
    if (changedFile) {
      fs.writeFileSync(file, JSON.stringify(isArr ? list : Object.assign(raw, { questions: list })));
      stats.files += 1;
    }
  }
}

async function main() {
  console.log("Indexing banks…");
  const banks = {
    jee: indexBank("jee_main.json"),
    adv: indexBank("jee_advanced.json")
  };
  const stats = { flagged: 0, fromBank: 0, fromMarks: 0, fixed: 0, files: 0, still: [] };
  console.log("Repair examgoal 2027…");
  await repairDir(path.join(ROOT, "data", "tests", "jee_main_examgoal_2027"), banks, stats);
  console.log("Repair quizrr PYQ chapter…");
  await repairDir(path.join(ROOT, "data", "tests", "jee_main_quizrr_pyq_chapter"), banks, stats);
  const report = {
    flagged: stats.flagged,
    fromBank: stats.fromBank,
    fromMarks: stats.fromMarks,
    fixed: stats.fixed,
    files: stats.files,
    still: stats.still.slice(0, 40),
    stillCount: stats.still.length
  };
  fs.writeFileSync(path.join(ROOT, "data", "tests", "jee_main_examgoal_2027", "_repair_report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
