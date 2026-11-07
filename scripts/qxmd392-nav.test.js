// node scripts/qxmd392-nav.test.js  — no browser, no network
const assert = require("assert");
const fs = require("fs");
const Q = require("../qx-start-index.js");
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok", n, name); };

t("clicked id found by id", () => assert.strictEqual(Q.findClicked(["a","b","c"], [], "c"), 2));
t("numeric vs string id", () => assert.strictEqual(Q.findClicked([101,102,103], [], "102"), 1));
t("Marks id stub match", () => assert.strictEqual(Q.findClicked(["x1","x2"], [{id:"x1",_marksId:"m_9"},{id:"x2",_marksId:"m_7"}], "m_7"), 1));
t("marksId / qid fields", () => { assert.strictEqual(Q.findClicked(["x"],[{id:"x",marksId:"M"}],"M"),0); assert.strictEqual(Q.findClicked(["x","y"],[{},{qid:"Q"}],"Q"),1); });
t("missing id -> -1 (caller falls back to 0)", () => assert.strictEqual(Q.findClicked(["a","b"], [{id:"a"}], "zz"), -1));
t("null/empty clicked -> -1", () => { assert.strictEqual(Q.findClicked(["a"],[],null),-1); assert.strictEqual(Q.findClicked(["a"],[],""),-1); });
t("duplicate ids -> first occurrence", () => assert.strictEqual(Q.findClicked(["a","b","a"], [], "a"), 0));
t("null holes in list ignored", () => assert.strictEqual(Q.findClicked([], [null, {_marksId:"k"}], "k"), 1));
t("identity kept after re-sort", () => {
  const orig = ["q1","q2","q3","q4","q5","q6","q7","q8"]; const sorted = ["q5","q1","q8","q2","q7","q3","q6","q4"];
  for (let i = 0; i < orig.length; i++) assert.strictEqual(sorted[Q.resolveStart(orig, i, sorted)], orig[i]);
});
t("old behaviour was wrong (regression guard)", () => { const orig=["q1","q2","q3"], sorted=["q3","q1","q2"]; assert.notStrictEqual(sorted[2], orig[2]); assert.strictEqual(sorted[Q.resolveStart(orig,2,sorted)], "q3"); });
t("start id dropped by re-sort -> clamped index", () => assert.strictEqual(Q.resolveStart(["a","b","c"], 2, ["a","b"]), 1));
t("bad startIdx -> 0 / clamped", () => { assert.strictEqual(Q.resolveStart(["a","b"], NaN, ["a","b"]), 0); assert.strictEqual(Q.resolveStart(["a","b"], -4, ["a","b"]), 0); assert.strictEqual(Q.resolveStart(["a","b"], 99, ["b","a"]), 0); });
t("empty lists", () => { assert.strictEqual(Q.resolveStart([], 3, []), 0); assert.strictEqual(Q.clamp(5, 0), 0); });
t("filtered order Prev/Next walks filtered list only", () => {
  const all = ["a","b","c","d","e"]; const filtered = all.filter((x) => x !== "b" && x !== "d"); // a c e
  let i = Q.findClicked(filtered, [], "c"); assert.strictEqual(i, 1);
  i = Q.step(i, 1, filtered.length); assert.strictEqual(filtered[i], "e");
  i = Q.step(i, -1, filtered.length); i = Q.step(i, -1, filtered.length); assert.strictEqual(filtered[i], "a");
});
t("first/last boundaries do not wrap", () => { assert.strictEqual(Q.step(0,-1,5),0); assert.strictEqual(Q.step(4,1,5),4); assert.strictEqual(Q.step(0,1,1),0); });
t("engine + app wired to helper", () => {
  const te = fs.readFileSync(__dirname + "/../test-engine.js", "utf8"), app = fs.readFileSync(__dirname + "/../app.js", "utf8"), html = fs.readFileSync(__dirname + "/../app.html", "utf8");
  assert(/QxStartIndex\.resolveStart\(qxOrigIds, config\.startIdx, ids\)/.test(te));
  assert(/idx: resume \? \(resume\.idx \|\| 0\) : qxStartIdx/.test(te));
  assert(/qxKeepListOrder/.test(te));
  assert(/QxStartIndex \? window\.QxStartIndex\.findClicked/.test(app) && /find\(ids, list, id\)/.test(app));
  assert(html.indexOf("qx-start-index.js") < html.indexOf("test-engine.js?v=") && html.indexOf("qx-start-index.js") < html.indexOf("app.js?v="));
});
t("qx-fit has no recurring timer", () => assert(!/setInterval/.test(fs.readFileSync(__dirname + "/../qx-fit.js", "utf8"))));
console.log("PASS", n);
