// node scripts/qxmd392-listreturn.test.js — real app.js blocks: list position kept across practice -> Save & Exit/Back.
const assert = require("assert"), fs = require("fs"), path = require("path");
const { JSDOM } = require(path.join(__dirname, "test-tools", "node_modules", "jsdom"));
const R = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
function grab(src, name) {
  const m = new RegExp("function " + name + "\\s*\\(").exec(src); if (!m) throw new Error("no fn " + name);
  let d = 0, k = src.indexOf("{", m.index); for (; k < src.length; k++) { if (src[k] === "{") d++; else if (src[k] === "}") { d--; if (!d) break; } }
  return src.slice(m.index, k + 1);
}
const A = R("app.js"), MF = R("marks-features.js");
const names = ["qxScrollerOf", "qxCardFor", "qxTopIn", "qxCaptureListReturn", "qxListReturnPage", "qxRestoreListReturn"];
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log("ok", n, name); };
const CARD_H = 200;
function mk(nested) {
  const dom = new JSDOM(`<div id="app-main"></div>`, { runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window, d = w.document, main = d.getElementById("app-main");
  // minimal layout model: one scroller (document or #app-main), cards stacked CARD_H apart
  const sc = nested ? main : (d.scrollingElement || d.documentElement);
  let st = 0;
  Object.defineProperty(sc, "scrollTop", { get: () => st, set: (v) => { st = Math.max(0, v); }, configurable: true });
  Object.defineProperty(sc, "scrollHeight", { get: () => 99999, configurable: true });
  Object.defineProperty(sc, "clientHeight", { get: () => 700, configurable: true });
  if (nested) { main.style.overflowY = "auto"; main.getBoundingClientRect = () => ({ top: 56 }); }
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    if (this === main && nested) return { top: 56 };
    const list = this.parentElement; const i = list ? Array.prototype.indexOf.call(list.children, this) : 0;
    return { top: (nested ? 56 : 0) + w._extra + i * CARD_H - st };
  };
  w._extra = 300; w.currentView = "cpyqb"; w._listPage = 1; w.scope = "jee|math|trig";
  w.eval("var currentView='cpyqb', _listPage=1; function qxListScopeKey(){return window.scope;}\n" + names.map((x) => grab(A, x)).join("\n") +
    "\nvar _qxListReturn=null; window.api={cap:qxCaptureListReturn,res:qxRestoreListReturn,page:qxListReturnPage,get pend(){return _qxListReturn;},setView(v){currentView=v;}};");
  const paint = (ids) => { main.innerHTML = `<div id="marksQList">${ids.map((i) => `<div class="q-card" data-qid="${i}"></div>`).join("")}</div>`; };
  return { w, d, main, sc, paint, get st() { return st; }, set st(v) { st = v; } };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  for (const nested of [false, true]) {
    await t((nested ? "nested #app-main" : "document") + " scroller: Save&Exit re-render returns to the exact clicked card", async () => {
      const c = mk(nested); c.paint(["a", "b", "jan29", "d"]); c.st = 688; // card jan29 at y ~ 12 in its scroller
      const before = c.w.document.querySelector('[data-qid="jan29"]').getBoundingClientRect().top;
      c.w.api.cap("jan29"); c.w.api.setView("test"); c.st = 0; c.main.innerHTML = "<div>practice</div>";
      c.w.api.setView("cpyqb"); c.paint(["a", "b", "jan29", "d"]); // go(ret) zeroed scroll
      assert.strictEqual(c.w.api.res(c.main), true);
      assert.strictEqual(c.w.document.querySelector('[data-qid="jan29"]').getBoundingClientRect().top, before);
      c.w._extra = 380; await sleep(150); // async typeset grows the header above the list
      assert.strictEqual(c.w.document.querySelector('[data-qid="jan29"]').getBoundingClientRect().top, before);
      assert.strictEqual(c.w.api.pend, null, "consumed once");
    });
  }
  await t("user scroll stops re-anchoring (no churn); later timers do nothing", async () => {
    const c = mk(true); c.paint(["x", "y", "z"]); c.st = 300; c.w.api.cap("z"); c.st = 0; c.paint(["x", "y", "z"]);
    c.w.api.res(c.main); c.w.dispatchEvent(new c.w.Event("touchstart")); c.st = 5; await sleep(450);
    assert.strictEqual(c.st, 5);
  });
  await t("different chapter (scope) or missing card: no restore, pending cleared", async () => {
    const c = mk(false); c.paint(["p", "q"]); c.st = 200; c.w.api.cap("q"); c.st = 0; c.w.scope = "jee|math|other"; c.paint(["p", "q"]);
    assert.strictEqual(c.w.api.res(c.main), false); assert.strictEqual(c.st, 0); assert.strictEqual(c.w.api.pend, null);
    const c2 = mk(false); c2.paint(["p", "q"]); c2.w.api.cap("q"); c2.paint(["p"]); assert.strictEqual(c2.w.api.res(c2.main), false);
  });
  await t("render before list exists (loading logo) keeps pending until the list paints", async () => {
    const c = mk(false); c.paint(["p", "q"]); c.st = 150; c.w.api.cap("q"); c.main.innerHTML = "<div>Opening…</div>";
    assert.strictEqual(c.w.api.res(c.main), false); assert.ok(c.w.api.pend); assert.strictEqual(c.w.api.page(), 1);
  });
  await t("wiring: capture on list click, restore in finishRender, page kept in renderQList", () => {
    assert.ok(/const pick = qxListForClicked\(id\);\n\s+if \(pick\.from === "list"\) qxCaptureListReturn\(id\);/.test(A));
    assert.ok(/bindMarksInfiniteScroll\(main\);\n\s+if \(typeof qxRestoreListReturn === "function"\)/.test(grab(A, "finishRender")));
    assert.ok(/Math\.max\(1, page \|\| _listPage \|\| 1, qxRetPage\)/.test(grab(MF, "renderQList")));
  });
  console.log("PASS", n);
})().catch((e) => { console.error(e); process.exit(1); });
