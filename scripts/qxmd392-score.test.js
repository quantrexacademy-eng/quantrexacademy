// node scripts/qxmd392-score.test.js — loads the REAL qxAwardMarks out of test-engine.js
const assert = require("assert"), fs = require("fs");
const src = fs.readFileSync(__dirname + "/../test-engine.js", "utf8");
const m = src.match(/\/\* qxmd392-award-begin[\s\S]*?\*\/([\s\S]*?)\/\* qxmd392-award-end \*\//);
assert(m, "award block missing");
const award = new Function(m[1] + "; return qxAwardMarks;")();
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok", n, name); };
const MAIN = { correct: 4, wrong: -1, unattempted: 0, numericalCorrect: 4, numericalWrong: 0 };            // JEE Main 2024+ (numerical has −1 in some years: configurable)
const ADV = { correct: 3, wrong: -1, unattempted: 0, multiCorrect: 4, multiWrong: -2, partial: 1, numericalCorrect: 4, numericalWrong: 0 };
const NEET = { correct: 4, wrong: -1, unattempted: 0 };
const OK = { correct: true }, BAD = { correct: false, partial: false };
t("Main SC correct/wrong/skip", () => { assert.deepStrictEqual(award({graded:OK,scoring:MAIN}),{status:"correct",marks:4}); assert.deepStrictEqual(award({graded:BAD,scoring:MAIN}),{status:"incorrect",marks:-1}); assert.deepStrictEqual(award({skipped:true,scoring:MAIN}),{status:"skipped",marks:0}); });
t("Main numerical wrong = 0", () => assert.strictEqual(award({graded:BAD,isNum:true,scoring:MAIN}).marks, 0));
t("Adv SC +3/-1", () => { assert.strictEqual(award({graded:OK,scoring:ADV}).marks,3); assert.strictEqual(award({graded:BAD,scoring:ADV}).marks,-1); });
t("Adv MC +4/-2", () => { assert.strictEqual(award({graded:OK,isMulti:true,scoring:ADV}).marks,4); assert.strictEqual(award({graded:BAD,isMulti:true,scoring:ADV}).marks,-2); });
t("Adv MC partial levels 3/2/1", () => { for (const L of [3,2,1]) assert.deepStrictEqual(award({graded:{partial:true,partialLevel:L},isMulti:true,scoring:ADV}),{status:"partial",marks:L}); });
t("partial without level uses scoring.partial", () => assert.strictEqual(award({graded:{partial:true},isMulti:true,scoring:ADV}).marks, 1));
t("partial without scoring.partial = round(correct/2)", () => assert.strictEqual(award({graded:{partial:true},scoring:NEET}).marks, 2));
t("Adv numerical +4/0", () => { assert.strictEqual(award({graded:OK,isNum:true,scoring:ADV}).marks,4); assert.strictEqual(award({graded:BAD,isNum:true,scoring:ADV}).marks,0); });
t("custom negative unattempted honoured", () => assert.strictEqual(award({skipped:true,scoring:{unattempted:-0.25}}).marks, -0.25));
t("missing scoring -> 4/-1/0 defaults", () => { assert.strictEqual(award({graded:OK}).marks,4); assert.strictEqual(award({graded:BAD}).marks,-1); assert.strictEqual(award({skipped:true}).marks,0); });
t("no graded object = skipped (missing question)", () => assert.strictEqual(award({graded:null,scoring:MAIN}).status, "skipped"));
// totals equality across subjects — mirrors computeResults: total += marks; subject += same marks
function tally(rows, sc) { let tot = 0; const sub = {}; const c = {correct:0,partial:0,incorrect:0,skipped:0};
  for (const r of rows) { const a = award({ ...r, scoring: sc }); tot += a.marks; sub[r.s] = (sub[r.s] || 0) + a.marks; c[a.status]++; }
  const att = c.correct + c.partial + c.incorrect; return { tot, sub, c, att, acc: att ? Math.round(c.correct / att * 1000) / 10 : null }; }
t("Adv paper: subject sums == total; counts distinct", () => {
  const rows = [{s:"P",graded:OK},{s:"P",graded:{partial:true,partialLevel:2},isMulti:true},{s:"C",graded:BAD,isMulti:true},{s:"C",graded:OK,isNum:true},{s:"M",skipped:true},{s:"M",graded:BAD}];
  const r = tally(rows, ADV);
  assert.strictEqual(r.tot, 3 + 2 - 2 + 4 + 0 - 1);
  assert.strictEqual(Object.values(r.sub).reduce((a, b) => a + b, 0), r.tot);
  assert.deepStrictEqual(r.c, { correct: 2, partial: 1, incorrect: 2, skipped: 1 });
  assert.strictEqual(r.att, 5); assert.strictEqual(r.acc, 40);
});
t("all unattempted: score 0, attempted 0, accuracy null (empty state, not 0%)", () => { const r = tally([{s:"P",skipped:true},{s:"C",skipped:true}], MAIN); assert.strictEqual(r.tot,0); assert.strictEqual(r.att,0); assert.strictEqual(r.acc,null); });
t("empty paper", () => { const r = tally([], MAIN); assert.strictEqual(r.tot,0); assert.strictEqual(r.acc,null); });
t("engine uses one award for total + subject", () => {
  assert(/score \+= award\.marks;/.test(src)); assert(/breakdown\.subject\[sub\]\.score \+= award\.marks;/.test(src));
  assert(!/breakdown\.subject\[sub\]\.score \+= scoring\.correct/.test(src));
  assert(/accuracyPct:/.test(src) && /fullyCorrect, partial: partialCount, incorrect: incorrectCount/.test(src));
});
console.log("PASS", n);
