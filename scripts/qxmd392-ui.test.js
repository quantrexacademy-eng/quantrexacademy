// node scripts/qxmd392-ui.test.js — real functions extracted from test-engine.js / app.js / qx-fit.js
const assert = require("assert"), fs = require("fs"), vm = require("vm");
const R = (f) => fs.readFileSync(__dirname + "/../" + f, "utf8");
function grab(src, name) { const i = src.indexOf("function " + name + "("); assert(i >= 0, name); let d = 0, j = src.indexOf("{", i);
  for (let k = j; k < src.length; k++) { if (src[k] === "{") d++; else if (src[k] === "}" && --d === 0) return src.slice(i, k + 1); } throw name; }
const TE = R("test-engine.js");
const env = new Function(["qxEscPaper","fmtMarksMin","mkBarChart","qxSplitCounts","mkScopeStats","renderMarksRcPanel"].map((n) => grab(TE, n)).join("\n") +
  "; return {qxSplitCounts, mkScopeStats, renderMarksRcPanel};")();
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok", n, name); };
t("split known", () => assert.deepStrictEqual(env.qxSplitCounts(17, 2, 1, 1), { correct:17, wrong:2, partial:1, incorrect:1, splitKnown:true, attempted:19, accuracy:89.5 }));
t("legacy attempt without split -> combined, not called incorrect", () => { const s = env.qxSplitCounts(3, 2); assert.strictEqual(s.splitKnown, false); assert.strictEqual(s.incorrect, 2); assert.strictEqual(s.attempted, 5); });
t("nothing attempted -> accuracy null", () => assert.strictEqual(env.qxSplitCounts(0, 0, 0, 0).accuracy, null));
const data = { score: -3, maxScore: 12, correct: 0, wrong: 3, partial: 1, incorrect: 2, skipped: 1, total: 4, timeUsed: 60,
  breakdown: { subject: { Physics: { correct:0, wrong:3, partial:1, incorrect:2, skipped:1, total:4, score:-3, maxMarks:12 } },
    chapter: { a: { subject:"Physics", chapter:"<b>Optics</b>", total:2, correct:0, partial:1, incorrect:1, skipped:0, score:1, timeSec:0 },
               b: { subject:"Physics", chapter:"Unclassified", total:2, correct:0, partial:0, incorrect:1, skipped:1, score:-1, timeSec:0 } } } };
t("overall stats: negative score kept, split, accuracy 0%", () => { const s = env.mkScopeStats(data, "overall"); assert.strictEqual(s.score, -3); assert.strictEqual(s.partial, 1); assert.strictEqual(s.incorrect, 2); assert.strictEqual(s.accuracy, 0); assert.strictEqual(s.chapters.length, 2); });
t("subject stats use scheme maxMarks not total*4", () => assert.strictEqual(env.mkScopeStats(data, "Physics").maxScore, 12));
const html = env.renderMarksRcPanel(env.mkScopeStats(data, "overall"), 30, false);
t("render: partial + incorrect rows, chapter table, escaped HTML, Unclassified last", () => {
  assert(/Partially correct:<\/span><strong>1 Qs/.test(html)); assert(/Incorrect:<\/span><strong>2 Qs/.test(html));
  assert(html.includes("&lt;b&gt;Optics&lt;/b&gt;") && !html.includes("<b>Optics"));
  assert(html.indexOf("Optics") < html.indexOf("Unclassified")); assert(html.includes("<span>-3</span>"));
});
t("render legacy: 'Incorrect / partial' label", () => { const h = env.renderMarksRcPanel(env.mkScopeStats({ ...data, partial: undefined, incorrect: undefined, breakdown: {} }, "overall"), 30, false); assert(h.includes("Incorrect / partial:")); assert(!h.includes("Partially correct:")); });
t("render empty: accuracy '—' + no-attempt note, no chapter table", () => { const h = env.renderMarksRcPanel(env.mkScopeStats({ score:0, maxScore:0, correct:0, wrong:0, partial:0, incorrect:0, skipped:0, total:0, breakdown:{} }, "overall"), 0, false); assert(h.includes(">—<")); assert(h.includes("no Qs attempted")); assert(!h.includes("Chapter Breakdown")); });
// pagination: real qxNavList from app.js
const AP = R("app.js"); const win = {}; const nav = new Function("window", grab(AP, "qxNavList") + "; return qxNavList;")(win);
t("paginated practice: Prev/Next list = full filtered list, same reference (no copy)", () => {
  const qs = Array.from({ length: 45 }, (_, i) => ({ id: "q" + i })); const page2 = qs.slice(20, 40);
  win._qxListQs = page2; win._qxListQsFull = qs; win._qxListQsFullFor = page2;
  const L = nav(); assert.strictEqual(L, qs);
  const Q = require("../qx-start-index.js"); const ids = L.map((x) => x.id);
  const i = Q.findClicked(ids, L, "q39"); assert.strictEqual(i, 39); assert.strictEqual(ids[Q.step(i, 1, ids.length)], "q40");
  assert.strictEqual(Q.step(44, 1, 45), 44); assert.strictEqual(Q.step(0, -1, 45), 0);
});
t("other list views keep their own visible list (stale full list ignored)", () => { win._qxListQs = [{ id: "x" }]; assert.deepStrictEqual(nav(), [{ id: "x" }]); win._qxListQs = undefined; win._qxListQsAll = [{ id: "y" }]; assert.strictEqual(nav()[0].id, "y"); });
t("app.js wiring: both open paths use qxNavList; page view sets full ref", () => { assert.strictEqual((AP.match(/const list = qxNavList\(\);/g) || []).length, 2); assert(/window\._qxListQsFull = qs;/.test(AP) && /window\._qxListQsFullFor = pageQs;/.test(AP)); });
// settings panel a11y: run real qx-fit.js against a minimal fake DOM
t("settings: Escape closes via #egFmtClose, aria-expanded, focus returns", () => {
  const L = { click: [], keydown: [] }, timers = [];
  const el = (id) => ({ id, attrs: {}, hidden: false, setAttribute(k, v) { this.attrs[k] = v; }, focus() { doc.activeElement = this; }, contains: (x) => x === first, querySelector: () => first, closest() { return this; } });
  const btn = el("egFmtBtn"), pop = el("egFmtPop"), close = el("egFmtClose"), first = el("first"); let shown = true;
  close.click = () => { shown = false; };
  const doc = { activeElement: null, readyState: "complete", documentElement: { style: { setProperty() {} } }, hidden: false,
    getElementById: (i) => ({ egFmtBtn: btn, egFmtPop: pop, egFmtClose: close })[i] || null, addEventListener: (k, f) => { (L[k] = L[k] || []).push(f); } };
  const ctx = { document: doc, window: { addEventListener() {}, innerHeight: 700 }, getComputedStyle: () => ({ display: shown ? "block" : "none", visibility: "visible" }),
    requestAnimationFrame: (f) => f(), setTimeout: (f) => timers.push(f) };
  vm.runInNewContext(R("qx-fit.js"), ctx);
  L.click.forEach((f) => f({ target: btn })); timers.splice(0).forEach((f) => f());
  assert.strictEqual(btn.attrs["aria-expanded"], "true"); assert.strictEqual(doc.activeElement, first);
  let prevented = false; L.keydown.forEach((f) => f({ key: "Escape", preventDefault() { prevented = true; } })); timers.splice(0).forEach((f) => f());
  assert(prevented); assert.strictEqual(shown, false); assert.strictEqual(btn.attrs["aria-expanded"], "false"); assert.strictEqual(doc.activeElement, btn);
  prevented = false; L.keydown.forEach((f) => f({ key: "Escape", preventDefault() { prevented = true; } })); assert(!prevented, "Escape ignored when closed");
});
console.log("PASS", n);
