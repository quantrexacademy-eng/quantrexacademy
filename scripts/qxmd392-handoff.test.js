// node scripts/qxmd392-handoff.test.js — runs the REAL click -> Choose mode -> Practice -> startTest handoff
// functions extracted from app.js / marks-features.js / test-engine.js in a vm with a tiny fake DOM.
const assert = require("assert"), fs = require("fs"), vm = require("vm"), path = require("path");
const R = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
function grab(src, name) {
  const re = new RegExp("(async\\s+)?function " + name + "\\s*\\(");
  const m = re.exec(src); if (!m) throw new Error("no fn " + name);
  let d = 0, k = src.indexOf("{", m.index);
  for (; k < src.length; k++) { const c = src[k]; if (c === "{") d++; else if (c === "}") { d--; if (!d) break; } }
  return src.slice(m.index, k + 1);
}
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log("ok", n, name); };
const APP = R("app.js"), MF = R("marks-features.js"), TE = R("test-engine.js");
const QS = require("../qx-start-index.js");

function mkCtx(opts) {
  const cards = (opts.cards || []).map((id) => ({ getAttribute: () => String(id) }));
  const body = { appendChild(el) { ctx._modal = el; } };
  const doc = {
    body,
    getElementById: (id) => (id === "app-main" ? { innerHTML: "", querySelector: () => null, querySelectorAll: (s) => (s === ".q-card[data-qid]" ? cards : []) } : null),
    createElement: () => {
      const btn = {}; const el = { remove() {}, set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; },
        querySelector: (s) => (btn[s] || (btn[s] = { onclick: null })) };
      return el;
    }
  };
  const ctx = { window: {}, document: doc, console, setTimeout: () => 0, Promise, String, Number, Math, Array, Object, JSON,
    currentView: opts.view, _cpyqbPayload: opts.payload || {}, calls: [] };
  ctx.window = ctx; ctx.window.QxStartIndex = QS;
  ctx.window._qxListQs = opts.list; ctx.getQ = (id) => (opts.list || []).concat(opts.extra || []).find((q) => String(q.id) === String(id)) || null;
  ctx.cpyqbSessionKeys = () => ({ chapter: "Trigonometric Ratios and Identities", subject: "Mathematics" });
  ctx.qxBookQsAlreadyLoaded = () => true;
  ctx.startTest = (ids, title, ret, o) => { ctx.calls.push({ ids, o }); return true; };
  vm.createContext(ctx);
  vm.runInContext([grab(APP, "qxNavList"), grab(APP, "qxVisibleCardIds"), grab(APP, "qxListForClicked"), grab(APP, "openPracticeQuestion"),
    grab(MF, "cpyqbLaunchList"), grab(MF, "qxAskBookPracticeOrTest")].join("\n") + "\n;this.open=openPracticeQuestion;", ctx);
  ctx.go = () => {}; ctx.qxRenderPracticeQuestion = () => {};
  return ctx;
}
const chapter = [38380, 38381, 38382, 38383, 38384, 38389, 38395].map((id) => ({ id, chapter: "Trig" }));

(async () => {
  await t("chapter middle card -> Choose mode -> Practice starts AT the clicked id (38389)", async () => {
    const c = mkCtx({ view: "cpyqb", list: chapter });
    c.open("38389");
    assert(c._modal, "Choose mode modal opened");
    c._modal.querySelector(".qx-book-pt-practice").onclick();
    await new Promise((r) => setImmediate(r));
    const call = c.calls.pop(); assert(call, "startTest called");
    assert.strictEqual(String(call.ids[call.o.startIdx]), "38389");
    assert.strictEqual(String(call.o.startId), "38389");
  });
  await t("Take Test from chooser starts at Q1 (test mode, unchanged)", async () => {
    const c = mkCtx({ view: "cpyqb", list: chapter });
    c.open(38395); c._modal.querySelector(".qx-book-pt-test").onclick();
    const call = c.calls.pop(); assert.strictEqual(call.o.startIdx, 0); assert.strictEqual(call.o.startId, null);
  });
  await t("search click with STALE chapter list + stale payload does not launch the old chapter", async () => {
    const c = mkCtx({ view: "search", list: chapter.slice(0, 3), payload: { chapter: "Old" }, cards: [38383, 99001], extra: [{ id: 99001 }] });
    c.open("38383");
    assert(!c._modal, "no chapter chooser from search");
    assert.strictEqual(c.calls.length, 0);
    assert.deepStrictEqual(c.window._qxPracticeCtx.ids.map(String), ["38383", "99001"]);
    assert.strictEqual(c.window._qxPracticeCtx.idx, 0);
  });
  await t("search: clicked 2nd result -> idx 1 of on-screen results, Prev/Next walk results", async () => {
    const c = mkCtx({ view: "search", list: chapter.slice(0, 2), payload: { chapter: "Old" }, cards: [11, 38389, 12], extra: [{ id: 11 }, { id: 12 }, { id: 38389 }] });
    c.open("38389");
    const p = c.window._qxPracticeCtx; assert.strictEqual(String(p.ids[p.idx]), "38389"); assert.strictEqual(p.ids.length, 3);
  });
  await t("startTest copies startIdx/startId into config (root cause: was dropped -> Q1)", () => {
    const st = grab(TE, "startTest");
    assert(/startIdx: opts\.startIdx != null \? opts\.startIdx : null/.test(st));
    assert(/startId: opts\.startId != null \? opts\.startId : null/.test(st));
  });
  await t("engine resolves the start by id after re-ordering", () => {
    const body = TE.slice(TE.indexOf("const qxStartById"), TE.indexOf("session = {", TE.indexOf("const qxStartById")));
    const f = new Function("resume", "config", "ids", "window", "qxOrigIds", "qxStartId", body + "; return qxStartIdx;");
    assert.strictEqual(f(null, { startId: 38389, startIdx: 5 }, [38395, 38389, 38380], { QxStartIndex: QS }, null, null), 1);
    assert.strictEqual(f(null, { startId: null, startIdx: 2 }, [1, 2, 3], { QxStartIndex: QS }, [1, 2, 3], 3), 2);
    assert.strictEqual(f({ idx: 4 }, { startId: 2 }, [1, 2], { QxStartIndex: QS }, null, null), 0);
  });
  await t("m_ prefixed Marks ids resolve against _marksId", () => assert.strictEqual(QS.findClicked(["a", "b"], [{ id: "a", _marksId: "7" }, { id: "b", _marksId: "9" }], "m_9"), 1));
  console.log("PASS " + n);
})().catch((e) => { console.error(e); process.exit(1); });
