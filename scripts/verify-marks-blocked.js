#!/usr/bin/env node
/**
 * Static + live check that the student path does not call Marks.
 *
 *   node scripts/verify-marks-blocked.js
 *   node scripts/verify-marks-blocked.js --live
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const STUDENT = [
  "app.js",
  "data.js",
  "marks-live.js",
  "marks-features.js",
  "test-engine.js",
  "qx-catalog.js",
  "qx-firebase-bank.js",
  "assets/qx-question-cache.js"
];

const FORBIDDEN = [
  /fetch\(\s*[`'"]https:\/\/web\.getmarks\.app/i,
  /fetch\(\s*[`'"]\/api\/marks-question/i,
  /fetch\(\s*[`'"]\/api\/marks\/question/i
];

function walkHits() {
  const hits = [];
  for (const rel of STUDENT) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      if (/STUDENT_MARKS_RUNTIME\s*=\s*false/.test(line)) return;
      if (/never call Marks|Marks student runtime disabled|mn\.txt/i.test(line)) return;
      FORBIDDEN.forEach((rx) => {
        if (rx.test(line) && !/^\s*(\/\/|\*|\/\*)/.test(line)) {
          hits.push({ file: rel, line: i + 1, text: line.trim().slice(0, 160) });
        }
      });
    });
  }
  return hits;
}

async function liveCatalog() {
  const ids = ["24475", "27196", "27189", "33077", "27184", "33283"];
  const url = "https://www.quantrexacademy.com/api/catalog?action=qs&ids=" + ids.join(",");
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  const qs = (data && data.questions) || [];
  const report = qs.map((q) => {
    const opts = (q.options || []).map((o) => String(o || "").replace(/<[^>]+>/g, " ").trim());
    return {
      id: q.id,
      stem: String(q.q || "").replace(/<[^>]+>/g, " ").trim().slice(0, 80),
      optCount: opts.filter((t) => t && !/^[A-D]$/i.test(t)).length,
      hasImg: /<img\b/i.test(String(q.q || "") + (q.options || []).join(" "))
    };
  });
  return { ok: !!(data && data.ok), count: qs.length, report };
}

async function main() {
  const hits = walkHits();
  const live = process.argv.includes("--live") ? await liveCatalog() : null;
  const runtimeOff = fs.readFileSync(path.join(ROOT, "marks-live.js"), "utf8").includes("STUDENT_MARKS_RUNTIME = false");
  const liveFetchHits = hits.filter((h) => /fetch\s*\(\s*[`'"]https:\/\/web\.getmarks\.app/i.test(h.text));
  console.log(JSON.stringify({
    studentMarksRuntimeOff: runtimeOff,
    forbiddenHits: hits,
    live,
    marksApiBlockedTest: runtimeOff && liveFetchHits.length === 0 ? "PASS" : "FAIL"
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
