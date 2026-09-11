#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "data", "tests", "jee_main_examgoal_2027");

function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function main() {
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
  const qdir = path.join(ROOT, "questions");
  const qfiles = fs.readdirSync(qdir).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  const cats = {};
  (man.categories || []).forEach((c) => {
    const file = path.join(ROOT, c.file);
    const j = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
    const tests = (j && (j.tests || j.items || j)) || [];
    const list = Array.isArray(tests) ? tests : [];
    const ids = list.map((t) => t.id || t.testId).filter(Boolean);
    const missingQ = ids.filter((id) => !fs.existsSync(path.join(qdir, id + ".json")) && tAvail(list, id));
    cats[c.id] = {
      title: c.title,
      listed: list.length,
      withFile: ids.filter((id) => fs.existsSync(path.join(qdir, id + ".json"))).length,
      upcoming: list.filter((t) => t.upcoming || t.status === "upcoming").length,
      available: list.filter((t) => !(t.upcoming || t.status === "upcoming")).length
    };
  });

  let tests = 0, qs = 0, emptyStem = 0, badOpts = 0, nat = 0, natBad = 0;
  let match = 0, matchBad = 0, needFig = 0, hasFig = 0, brokenHost = 0;
  const broken = [];
  const byFile = [];

  function tAvail(list, id) {
    const t = list.find((x) => (x.id || x.testId) === id);
    return t && !(t.upcoming || t.status === "upcoming");
  }

  for (const f of qfiles) {
    const arr = JSON.parse(fs.readFileSync(path.join(qdir, f), "utf8"));
    const list = Array.isArray(arr) ? arr : (arr.questions || []);
    tests += 1;
    let fileBroken = 0;
    list.forEach((q) => {
      qs += 1;
      const raw = String(q.q || q.question || "");
      const stem = strip(raw);
      const opts = q.options || [];
      const type = String(q.questionType || q.type || "");
      const isNum = /numerical|integer|nat/i.test(type) || (q.correctValue != null && !opts.length);
      if (isNum) nat += 1;
      if (/list[\s\-]*i|match the/i.test(stem)) match += 1;
      if (/<img/i.test(raw + opts.join(" "))) hasFig += 1;
      if (/https?:\/\/\.app\//i.test(raw + opts.join(" "))) brokenHost += 1;
      const flags = [];
      if (!stem || /^loading/i.test(stem)) flags.push("empty_stem");
      if (/list[\s\-]*i/i.test(stem) && !/<table/i.test(raw)) flags.push("match_no_table");
      if (/(following (reaction|compound|structure)|given (reaction|compound)|the figure)/i.test(stem)
        && !/<img/i.test(raw + opts.join(" "))) flags.push("need_fig");
      if (!isNum) {
        const good = opts.some((o) => {
          const t = strip(o);
          return (t && !/^[A-D]$/i.test(t)) || /<img/i.test(String(o || ""));
        });
        if (!opts.length || !good) flags.push("bad_opts");
      } else if (q.correctValue == null && q.answer == null) flags.push("nat_no_ans");
      if (flags.length) {
        fileBroken += 1;
        if (flags.includes("empty_stem")) emptyStem += 1;
        if (flags.includes("bad_opts")) badOpts += 1;
        if (flags.includes("match_no_table")) matchBad += 1;
        if (flags.includes("need_fig")) needFig += 1;
        if (flags.includes("nat_no_ans")) natBad += 1;
        if (broken.length < 40) {
          broken.push({ file: f, id: q.id, eg: q._examgoalId, marks: q._marksId || "", flags, stem: stem.slice(0, 80) });
        }
      }
    });
    if (fileBroken) byFile.push({ file: f, n: list.length, broken: fileBroken });
  }

  const out = {
    manifest: {
      total: man.totalTests,
      available: man.availableTests,
      upcoming: man.upcomingTests,
      shards: man.questionShards
    },
    qfiles: qfiles.length,
    tests,
    qs,
    emptyStem,
    badOpts,
    nat,
    natBad,
    match,
    matchBad,
    needFig,
    hasFig,
    brokenHost,
    cats,
    broken,
    worstFiles: byFile.sort((a, b) => b.broken - a.broken).slice(0, 20)
  };
  fs.writeFileSync(path.join(ROOT, "_audit_local.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({
    manifest: out.manifest,
    qfiles: out.qfiles,
    qs: out.qs,
    emptyStem,
    badOpts,
    nat,
    natBad,
    match,
    matchBad,
    needFig,
    hasFig,
    brokenHost,
    brokenSample: broken.length,
    cats
  }, null, 2));
}

main();
