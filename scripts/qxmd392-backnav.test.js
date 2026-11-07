// node scripts/qxmd392-backnav.test.js — real source blocks: list filter state across re-render / back-navigation,
// numeric difficulty badges, practice settings Escape + focus restore, account-deletion links.
const assert = require("assert"), fs = require("fs"), path = require("path"), vm = require("vm");
const R = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
function grab(src, name) {
  const m = new RegExp("(async\\s+)?function " + name + "\\s*\\(").exec(src); if (!m) throw new Error("no fn " + name);
  let d = 0, k = src.indexOf("{", m.index); for (; k < src.length; k++) { if (src[k] === "{") d++; else if (src[k] === "}") { d--; if (!d) break; } }
  return src.slice(m.index, k + 1);
}
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok", n, name); };
const MF = R("marks-features.js");
const rq = grab(MF, "renderQList");
const block = rq.slice(rq.indexOf("  opts = opts || {};"), rq.indexOf("  window._qxListQs = viewQs;"));
global.QxProgress = require("../qx-progress.js"); const F = require("../qx-list-filters.js");
function mk() {
  const ctx = { window: {}, QxListFilters: F, QxProgress: global.QxProgress, STATE: { solved: [{ id: 2, correct: false, result: "incorrect" }], bookmarks: [] },
    currentView: "cpyqb", _cpyqbPayload: { exam: "jee_main", subject: "Mathematics", chapter: "Trig", mode: "all" }, qxRegisterOfflineQuestions() {}, console };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext('let _qxListDiffFilter="all",_qxListYearFilter="all",_qxListTypeFilter="all",_qxListAttFilter="all",_listPage=1;' +
    ["qxNormDifficulty", "qxListScopeKey", "qxListFiltersActive", "qxListFilterState", "qxAttemptIndexes"].map((x) => grab(MF, x)).join("\n") +
    "\nlet _qxListScope=null;\nfunction fresh(qs, opts){" + block + "; return viewQs.map(q=>q.id); }\n" +
    "this.api={fresh, set:(k,v)=>{ if(k==='diff')_qxListDiffFilter=v; if(k==='year')_qxListYearFilter=v; if(k==='type')_qxListTypeFilter=v; if(k==='att')_qxListAttFilter=v; }, st:()=>[_qxListDiffFilter,_qxListYearFilter,_qxListTypeFilter,_qxListAttFilter]};", ctx);
  return ctx;
}
const pool = [{ id: 1, difficulty: "Easy", source: "JEE Main 2024 (x)" }, { id: 2, difficulty: "2", source: "JEE Main 2023 (x)" }, { id: 3, source: "JEE Main 2019 (x)", questionType: "numerical" }];
t("back to the SAME chapter: every chosen filter is re-applied to the list (chips and predicate agree)", () => {
  const c = mk(); c.api.fresh(pool, {});
  c.api.set("att", "incorrect"); assert.strictEqual(JSON.stringify(c.api.fresh(pool, {})), JSON.stringify([2]));
  c.api.set("att", "all"); c.api.set("diff", "Level 2"); assert.strictEqual(JSON.stringify(c.api.fresh(pool, {})), JSON.stringify([2]));
  c.api.set("diff", "all"); c.api.set("year", "last3"); assert.strictEqual(JSON.stringify(c.api.fresh(pool, {})), JSON.stringify([1, 2]));
  c.api.set("year", "all"); c.api.set("type", "unknown"); assert.strictEqual(JSON.stringify(c.api.fresh(pool, {})), JSON.stringify([1, 2]));
});
t("a DIFFERENT chapter clears all four filters (state + list)", () => {
  const c = mk(); c.api.fresh(pool, {}); c.api.set("att", "incorrect"); c.api.set("diff", "Easy"); c.api.set("year", "last3"); c.api.set("type", "Numerical");
  c._cpyqbPayload = { exam: "jee_main", subject: "Mathematics", chapter: "Limits", mode: "all" };
  assert.strictEqual(JSON.stringify(c.api.fresh(pool, {})), JSON.stringify([1, 2, 3])); assert.strictEqual(JSON.stringify(c.api.st()), JSON.stringify(["all", "all", "all", "all"]));
});
t("non-chapter lists (no scope) always start unfiltered", () => {
  const c = mk(); c._cpyqbPayload = {}; c.api.set("att", "incorrect"); assert.strictEqual(JSON.stringify(c.api.fresh(pool, {})), JSON.stringify([1, 2, 3]));
});
t("difficulty badge: numeric level shown as 'Level n', neutral class; words kept; rank never guesses", () => {
  const ctx = {}; vm.createContext(ctx); vm.runInContext(["qxNormDifficulty", "qxQuestionDifficulty", "qxDifficultyTag", "qxDifficultyRank"].map((x) => grab(MF, x)).join("\n") + ";this.T=qxDifficultyTag;this.N=qxNormDifficulty;this.K=qxDifficultyRank;", ctx);
  assert.strictEqual(ctx.N(2), "Level 2"); assert.strictEqual(ctx.N("1"), "Level 1"); assert.strictEqual(ctx.N("moderate"), "Medium");
  assert(/diff-level[^>]*>Level 3</.test(ctx.T({ difficulty: 3 }))); assert(/diff-easy/.test(ctx.T({ difficulty: "Easy" })));
  assert(ctx.K("Hard") === 3 && ctx.K("2") > 3);
});
t("custom test difficulty keeps word-only matching (numbers never become Easy/Medium/Hard)", () => {
  const ctx = {}; vm.createContext(ctx); vm.runInContext(grab(R("custom-test.js"), "ctNormDiff") + ";this.f=ctNormDiff;", ctx);
  assert.strictEqual(ctx.f("1"), ""); assert.strictEqual(ctx.f("Easy"), "Easy");
});
t("#pracViewPanel: Escape closes, aria-expanded=false, focus returns to gear (real qx-fit.js)", () => {
  const L = {}; const attrs = { hidden: null }; let focused = null;
  const btn = { id: "pracViewMenuBtn", attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, focus() { focused = "btn"; } };
  const panel = { hasAttribute: (k) => attrs[k] != null, setAttribute: (k, v) => { attrs[k] = v; }, removeAttribute: (k) => { attrs[k] = null; }, contains: () => false, querySelector: () => ({ focus() { focused = "inside"; } }) };
  attrs.hidden = null; // open
  const doc = { documentElement: { style: { setProperty() {} } }, readyState: "complete", hidden: false,
    getElementById: (id) => (id === "pracViewPanel" ? panel : id === "pracViewMenuBtn" ? btn : null),
    addEventListener: (ev, fn) => { (L[ev] = L[ev] || []).push(fn); } };
  const win = { addEventListener() {}, visualViewport: null, innerHeight: 800 };
  vm.runInNewContext(R("qx-fit.js"), { window: win, document: doc, requestAnimationFrame: () => 0, setTimeout: (f) => f(), getComputedStyle: () => ({ display: "none" }), visualViewport: undefined });
  let prevented = false; L.keydown.forEach((f) => f({ key: "Escape", preventDefault() { prevented = true; } }));
  assert(prevented && attrs.hidden === "" && btn.attrs["aria-expanded"] === "false" && focused === "btn");
  focused = null; attrs.hidden = null;
  L.click.forEach((f) => f({ target: { closest: () => ({ id: "pracViewMenuBtn" }) } })); assert.strictEqual(focused, "inside");
});
t("account deletion request link inside profile menu and Settings > Account; page makes no promises", () => {
  assert(/href="\/delete-account\.html"[^>]*>Request account deletion/.test(R("qx-profile.js")));
  assert(/qxSetDeleteAccount" href="\/delete-account\.html"/.test(R("qx-settings.js")));
  const page = R("delete-account.html").toLowerCase(); assert(page.includes("quantrexacademy@gmail.com"));
  assert(!/within \d+ (days|hours)|gdpr|compliant|guarantee/.test(page));
  assert(/qx-profile\.js\?v=qxmd392d/.test(R("app.html")) && /qx-settings\.js\?v=qxmd392d/.test(R("app.html")));
});
console.log("PASS " + n);
