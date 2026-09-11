#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "data", "tests", "jee_main_examgoal_2027");
const QDIR = path.join(ROOT, "questions");
const CATDIR = path.join(ROOT, "categories");
const NOW = new Date("2026-08-19T12:00:00.000Z");

function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function loadJson(p, fb) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (_) {
    return fb;
  }
}

function main() {
  const qfiles = fs.readdirSync(QDIR).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  let qs = 0, noSol = 0, emptyStem = 0, badOpts = 0, needFig = 0, hasFig = 0, hasSol = 0;
  const noSolSample = [];
  const needFigSample = [];
  for (const f of qfiles) {
    const arr = loadJson(path.join(QDIR, f), []);
    const list = Array.isArray(arr) ? arr : arr.questions || [];
    list.forEach((q) => {
      qs += 1;
      const raw = String(q.q || q.question || "");
      const stem = strip(raw);
      const opts = q.options || [];
      const sol = strip(q.solution || q.explanation || "");
      const type = String(q.questionType || q.type || "");
      const isNum = /numerical|integer|nat/i.test(type) || (q.correctValue != null && !opts.length);
      if (/<img/i.test(raw + opts.join(" "))) hasFig += 1;
      if (sol.length >= 8 || /<img/i.test(String(q.solution || q.explanation || ""))) hasSol += 1;
      else {
        noSol += 1;
        if (noSolSample.length < 12) noSolSample.push({ file: f, eg: q._examgoalId, stem: stem.slice(0, 70) });
      }
      if (!stem) emptyStem += 1;
      if (!isNum) {
        const good = opts.some((o) => {
          const t = strip(o);
          return (t && !/^[A-D]$/i.test(t)) || /<img/i.test(String(o || ""));
        });
        if (!opts.length || !good) badOpts += 1;
      }
      if (/(following (reaction|compound|structure)|given (reaction|compound)|the figure|as shown)/i.test(stem)
        && !/<img/i.test(raw + opts.join(" "))) {
        needFig += 1;
        if (needFigSample.length < 12) needFigSample.push({ file: f, eg: q._examgoalId, stem: stem.slice(0, 70) });
      }
    });
  }

  const cats = {};
  const newlyLive = [];
  const stillUpcoming = [];
  for (const f of fs.readdirSync(CATDIR).filter((x) => x.endsWith(".json"))) {
    const j = loadJson(path.join(CATDIR, f), {});
    const tests = j.tests || [];
    const id = (j.category && j.category.id) || f.replace(".json", "");
    let upcoming = 0, available = 0, withFile = 0, liveButNoFile = 0;
    tests.forEach((t) => {
      const liveAt = t.liveAt || (t.examgoalMeta && t.examgoalMeta.liveAt) || "";
      const isUp = t.upcoming || t.status === "upcoming" || (t.examgoalMeta && t.examgoalMeta.isUpcoming);
      const hasQ = fs.existsSync(path.join(QDIR, (t.id || t.testId) + ".json"));
      const past = liveAt && new Date(liveAt) <= NOW;
      if (hasQ) withFile += 1;
      if (isUp) {
        upcoming += 1;
        if (past) {
          liveButNoFile += 1;
          newlyLive.push({
            cat: id,
            id: t.id,
            title: t.title,
            liveAt,
            hasQ
          });
        } else {
          stillUpcoming.push({ cat: id, id: t.id, title: t.title, liveAt });
        }
      } else {
        available += 1;
        if (!hasQ && !String(id).startsWith("pyq_")) {
          liveButNoFile += 1;
          newlyLive.push({ cat: id, id: t.id, title: t.title, liveAt, hasQ, marked: "available_no_file" });
        }
      }
    });
    cats[id] = { listed: tests.length, upcoming, available, withFile, liveButNoFile };
  }

  const out = {
    qfiles: qfiles.length,
    qs,
    hasSol,
    noSol,
    emptyStem,
    badOpts,
    needFig,
    hasFig,
    cats,
    newlyLiveCount: newlyLive.length,
    stillUpcomingCount: stillUpcoming.length,
    newlyLive: newlyLive.slice(0, 40),
    stillUpcomingSample: stillUpcoming.slice(0, 15),
    noSolSample,
    needFigSample
  };
  fs.writeFileSync(path.join(ROOT, "_gap_scan.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify({
    qfiles: out.qfiles,
    qs,
    hasSol,
    noSol,
    emptyStem,
    badOpts,
    needFig,
    hasFig,
    newlyLiveCount: newlyLive.length,
    stillUpcomingCount: stillUpcoming.length,
    cats
  }, null, 2));
}

main();
