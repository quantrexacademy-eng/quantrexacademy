#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const PACK = path.join(__dirname, "..", "data", "tests", "jee_main_examgoal_2027");
const QDIR = path.join(PACK, "questions");
const RAW = path.join(PACK, "_eg_raw");

function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

const nosol = [];
const needfig = [];
const badopts = [];
for (const f of fs.readdirSync(QDIR).filter((x) => x.endsWith(".json") && !x.startsWith("_"))) {
  const arr = JSON.parse(fs.readFileSync(path.join(QDIR, f), "utf8"));
  const list = Array.isArray(arr) ? arr : arr.questions || [];
  list.forEach((q) => {
    const raw = String(q.q || q.question || "");
    const stem = strip(raw);
    const opts = q.options || [];
    const sol = strip(q.solution || q.explanation || "");
    const t = String(q.questionType || q.type || "");
    const isn = /numerical|integer|nat/i.test(t) || (q.correctValue != null && !opts.length);
    if (sol.length < 8) nosol.push({ file: f, eg: q._examgoalId, stem: stem.slice(0, 80), answer: q.answer, cv: q.correctValue });
    if (!isn) {
      const good = opts.some((o) => {
        const x = strip(o);
        return (x && !/^[A-D]$/i.test(x)) || /<img/i.test(String(o || ""));
      });
      if (!opts.length || !good) badopts.push({ file: f, eg: q._examgoalId, stem: stem.slice(0, 80), opts });
    }
    if (/(following (reaction|compound|structure)|given (reaction|compound)|the figure|as shown)/i.test(stem)
      && !/<img/i.test(raw + " " + opts.join(" "))) {
      needfig.push({ file: f, eg: q._examgoalId, stem: stem.slice(0, 90) });
    }
  });
}

const ids = new Set();
nosol.concat(badopts, needfig).forEach((x) => { if (x.eg) ids.add(x.eg); });
const found = {};
for (const rf of fs.readdirSync(RAW).filter((x) => x.endsWith(".json"))) {
  const d = JSON.parse(fs.readFileSync(path.join(RAW, rf), "utf8"));
  const test = d.test || {};
  (test.sections || []).forEach((sec) => {
    (sec.questions || []).forEach((q) => {
      const qid = q.questionId;
      if (!ids.has(qid)) return;
      const en = (q.question || {}).en || {};
      const optStr = (en.options || []).map((o) => (o && o.content) || o || "").join(" ");
      found[qid] = {
        file: rf,
        hasContent: !!en.content,
        contentImg: /<img/i.test(String(en.content || "")),
        nOpts: (en.options || []).length,
        optImg: /<img/i.test(optStr),
        explLen: strip(en.explanation || en.hiddenExplanation || "").length,
        correct: en.correct_options || null,
        answer: en.answer,
        head: strip(en.content).slice(0, 80)
      };
    });
  });
}

const out = {
  nosol,
  badopts,
  needfig,
  official: found,
  missingInRaw: [...ids].filter((id) => !found[id])
};
fs.writeFileSync(path.join(PACK, "_eg_leftover_inspect.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  nosol: nosol.length,
  badopts: badopts.length,
  needfig: needfig.length,
  officialHits: Object.keys(found).length,
  missingInRaw: out.missingInRaw,
  nosol,
  badopts,
  needfigOfficial: needfig.map((x) => ({ ...x, official: found[x.eg] || null }))
}, null, 2));
