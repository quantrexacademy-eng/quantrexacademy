// node scripts/qxmd392-batch.test.js — entry-point coverage, analytics record/aggregate, raw difficulty, attempt filter
const assert = require("assert"), fs = require("fs"), path = require("path");
const R = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const P = require("../qx-progress.js"); global.QxProgress = P; const F = require("../qx-list-filters.js");
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok", n, name); };
const PAGES = ["app.html", "test-series.html", "examgoal-test-series.html", "quantrex-test-series.html", "jee-main-pyq-chapter.html"];
t("every question entry page loads layout css + same question-format tag", () => PAGES.forEach((p) => {
  const h = R(p); assert(/assets\/qxmd392-layout\.css\?v=qxmd392[c-z]/.test(h), p + " css");
  const tags = h.match(/question-format\.js\?v=([\w]+)/g); assert(tags && tags.every((x) => x.endsWith("qxmd392c")), p + " qf tag");
}));
t("standalone pages load qx-fit + qx-start-index BEFORE test-engine; no app-only scripts added", () => PAGES.slice(1).forEach((p) => {
  const h = R(p), te = h.indexOf("test-engine.js");
  assert(h.indexOf("qx-fit.js") > 0 && h.indexOf("qx-fit.js") < te && h.indexOf("qx-start-index.js") < te, p);
  assert(!/marks-features\.js|qx-progress\.js|app\.js\?/.test(h), p + " must not pull app-only modules");
  assert(/id="app-main"/.test(h), p + " has #app-main so the scoped selectors apply");
}));
t("layout css covers test roots AND practice/solution containers", () => {
  const c = R("assets/qxmd392-layout.css");
  [".eg-test-root .katex-display", ".mtk-test-root .katex-display", ".qzrr-cbt .katex-display", ".qx-practice-page .katex-display", ".qx-practice-page mjx-container"].forEach((s) => assert(c.includes(s), s));
  assert(/\.qx-practice-page :is\([^)]*qx-sol-reveal-box/.test(c));
});
t("test-engine lazy loader uses the same question-format tag", () => assert(/question-format\.js\?v=qxmd392c/.test(R("test-engine.js"))));
const rows = [{ id: 1, status: "correct", marks: 4, timeSec: 30.4 }, { id: 2, status: "partial", marks: 2, timeSec: 50 }, { id: 3, status: "incorrect", marks: -1, timeSec: 10 }, { id: 4, status: "skipped", marks: 0, timeSec: 0, isSkip: true }];
const data = { title: "T", correct: 1, wrong: 2, skipped: 1, score: 5, maxScore: 16, pct: 25, total: 4, timeUsed: 90, fullyCorrect: 1, partial: 1, incorrect: 1, attempted: 3, testId: "tst-1", slug: "jee_main", source: "", rows,
  breakdown: { subject: { Maths: { total: 4, correct: 1, partial: 1, incorrect: 1, wrong: 2, skipped: 1, score: 5, maxMarks: 16, timeSec: 90 } }, chapter: { "Maths\u0001Trig": { subject: "Maths", chapter: "Trig", total: 4, correct: 1, partial: 1, incorrect: 1, skipped: 1, score: 5, timeSec: 90 } } } };
t("record keeps old keys, adds real ids/split/qr; empty source not stored", () => {
  const r = P.buildRecord(data, 1000);
  ["title", "correct", "wrong", "skipped", "score", "maxScore", "pct", "total", "timeUsed", "breakdown", "date"].forEach((k) => assert(k in r, k));
  assert.strictEqual(r.testId, "tst-1"); assert.strictEqual(r.fullyCorrect, 1); assert(!("source" in r)); assert.strictEqual(r.v, 2);
  assert.deepStrictEqual(r.qr, [[1, "c", 4, 30], [2, "p", 2, 50], [3, "i", -1, 10], [4, "s", 0, 0]]);
});
t("per-question detail only on newest 20; summaries untouched", () => {
  const list = Array.from({ length: 30 }, (_, i) => Object.assign(P.buildRecord(data, i), { id: i }));
  const tr = P.trimDetail(list); assert(tr[19].qr && !tr[20].qr); assert.strictEqual(tr[25].score, 5);
});
const now = Date.UTC(2026, 10, 7);
const legacy = { title: "Old", correct: 10, wrong: 5, total: 20, pct: 50, score: 35, maxScore: 80, timeUsed: 600, date: now - 2 * 86400000 };
const fresh = Object.assign(P.buildRecord(data, now - 86400000));
const old = Object.assign(P.buildRecord(data, now - 40 * 86400000));
t("weighted accuracy = sum fully correct / sum attempted; legacy excluded but counted", () => {
  const g = P.aggregate([fresh, legacy, old], "all", now);
  assert.strictEqual(g.tests, 3); assert.strictEqual(g.legacy, 1); assert.strictEqual(g.correct, 2); assert.strictEqual(g.attempted, 6);
  assert.strictEqual(g.accuracy, 2 / 6); assert.strictEqual(g.score, 45); assert.strictEqual(g.maxScore, 112);
});
t("date ranges use attempt timestamps", () => {
  assert.strictEqual(P.aggregate([fresh, legacy, old], "7d", now).tests, 2);
  assert.strictEqual(P.aggregate([fresh, legacy, old], "30d", now).tests, 2);
  assert.strictEqual(P.aggregate([fresh, legacy, old], "3m", now).tests, 3);
  assert.strictEqual(P.aggregate([], "7d", now).tests, 0);
});
t("dashboard html: honest empty state, legacy note, no rank/percentile words, escaped titles", () => {
  assert(/No tests recorded/.test(P.dashboardHtml([], "7d", now)));
  const h = P.dashboardHtml([fresh, legacy, Object.assign({}, fresh, { title: "<b>x" })], "all", now);
  assert(/older test was saved before/.test(h)); assert(!/rank|percentile|strong|weak/i.test(h)); assert(!h.includes("<b>x")); assert(/By subject/.test(h) && /By chapter/.test(h) && /By test/.test(h));
});
t("raw difficulty: numeric stays 'Level n', words keep meaning, blanks are Unrated", () => {
  assert.strictEqual(F.diffLabel({ difficulty: "2" }), "Level 2"); assert.strictEqual(F.diffLabel({ difficulty: "medium" }), "Medium"); assert.strictEqual(F.diffLabel({ difficulty: "" }), null);
  const pool = [{ id: 1, difficulty: "Easy" }, { id: 2, difficulty: "1" }, { id: 3 }, { id: 4, difficulty: "Hard" }];
  const h = F.diffBarHtml(pool, "all"); assert(/Level 1/.test(h) && /Unrated/.test(h) && !/>Easy <b>2/.test(h));
  assert.deepStrictEqual(F.apply(pool, { rawDiff: true, diff: "unrated" }).map((q) => q.id), [3]);
  assert.deepStrictEqual(F.apply(pool, { rawDiff: true, diff: "Level 1" }).map((q) => q.id), [2]);
});
t("attempt filter uses saved records only; 'No saved attempt' is not 'never attempted'", () => {
  const idx = P.practiceIndex([{ id: 1, correct: true, result: "partial" }, { id: 2, correct: true }, { id: 3, correct: false }]);
  const pool = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
  const ap = (att) => F.apply(pool, { att, attIndex: idx, bmIndex: { 4: true } }).map((q) => q.id);
  assert.deepStrictEqual(ap("partial"), [1]); assert.deepStrictEqual(ap("correct"), [2]); assert.deepStrictEqual(ap("incorrect"), [3]);
  assert.deepStrictEqual(ap("none"), [4]); assert.deepStrictEqual(ap("bookmarked"), [4]); assert.deepStrictEqual(ap("attempted"), [1, 2, 3]);
  const bar = F.attemptBarHtml(pool, "all", idx, { 4: true }); assert(/No saved attempt/.test(bar) && !/Never/i.test(bar));
});
t("engine no longer invents 'Medium' for untagged questions; markSolved stores result", () => {
  assert(!/q\.difficulty \|\| "Medium"/.test(R("test-engine.js"))); assert(/"Unrated"/.test(R("test-engine.js")));
  assert(/rec\.result = extra\.result/.test(R("data.js"))); assert(/result: graded\.correct \? "correct"/.test(R("app.js")));
});
console.log("PASS " + n);
