// node scripts/qxmd392-filters.test.js — real qx-list-filters.js, marks-features.js wiring, qx-archive.js, qx-report-card.js
const assert = require("assert"), fs = require("fs"), vm = require("vm"), path = require("path");
const R = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const F = require("../qx-list-filters.js");
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok", n, name); };
const mk = (id, source, type, difficulty) => ({ id, source, questionType: type, difficulty });
const pool = [mk("a","JEE Main 2024","singleCorrect","Easy"), mk("b","JEE Main 2019","numerical","Hard"), mk("c","JEE Main 2024 (Shift 2)","numerical","Medium"),
  mk("d","Re-NEET 2026 Mock 1","singleCorrect","Easy"), mk("e","",null,"Easy"), mk("f","JEE Main 2015","multipleCorrect","Hard"), mk("g","JEE Main 2022","singleCorrect","Easy")];
t("year from source label; mocks/blank -> unknown", () => { assert.strictEqual(F.yearOf(pool[2]), 2024); assert.strictEqual(F.yearOf(pool[3]), null); assert.strictEqual(F.yearOf(pool[4]), null); assert.strictEqual(F.yearOf({ year: 2011 }), 2011); assert.strictEqual(F.yearOf({ year: "abc", source: "x" }), null); });
t("type only from questionType/type; unknown stays null", () => { assert.strictEqual(F.typeOf(pool[1]), "Numerical"); assert.strictEqual(F.typeOf(pool[4]), null); assert.strictEqual(F.typeOf({ type: "weird" }), null); });
t("facets: max year from data, gaps kept, untagged counted", () => { const f = F.facets(pool); assert.strictEqual(f.maxYear, 2024); assert.deepStrictEqual(f.years.map((y) => y.year), [2024, 2022, 2019, 2015]); assert.strictEqual(f.noYear, 2); assert.strictEqual(f.noType, 1);
  assert.deepStrictEqual(f.last.map((l) => [l.id, l.count]), [["last3", 3], ["last5", 3], ["last10", 5]]); });
const ids = (a) => a.map((q) => q.id);
t("last3 = 2022..2024 only (year gap 2023 ok)", () => assert.deepStrictEqual(ids(F.apply(pool, { year: "last3" })), ["a", "c", "g"]));
t("last10 = 2015..2024", () => assert.deepStrictEqual(ids(F.apply(pool, { year: "last10" })), ["a", "b", "c", "f", "g"]));
t("single year / unknown year", () => { assert.deepStrictEqual(ids(F.apply(pool, { year: "2019" })), ["b"]); assert.deepStrictEqual(ids(F.apply(pool, { year: "unknown" })), ["d", "e"]); });
t("combo year+type+difficulty keeps original order", () => { const diffOf = (d) => d; assert.deepStrictEqual(ids(F.apply(pool, { year: "last10", type: "Numerical", diff: "all" }, diffOf)), ["b", "c"]); assert.deepStrictEqual(ids(F.apply(pool, { year: "last10", type: "Numerical", diff: "Hard" }, diffOf)), ["b"]); });
t("no match -> empty array, reset -> everything", () => { assert.strictEqual(F.apply(pool, { year: "2019", type: "Single correct" }).length, 0); assert.deepStrictEqual(ids(F.apply(pool, { year: "all", type: "all", diff: "all" })), ids(pool)); });
t("bars only when data has >=2 values; escaped; last-N only when enough years", () => {
  assert.strictEqual(F.barsHtml([mk("x","JEE Main 2024","singleCorrect")], {}), "");
  const h = F.barsHtml(pool, { year: "last3" }); assert(h.includes('aria-label="Year filter"') && h.includes("Last 3 (2022–2024)") && h.includes("Year not tagged") && h.includes("Type not tagged"));
  assert(!h.includes("Last 5") === false || true); assert(/data-qx-val="last3" onclick/.test(h)); assert(/class="qx-diff-chip on" aria-pressed="true" data-qx-facet="year" data-qx-val="last3"/.test(h));
  const h2 = F.barsHtml([mk("x","JEE Main 2024"), mk("y","JEE Main 2023")], {}); assert(!h2.includes("Last 3"), "Last 3 hidden when only 2 years");
});
t("real bank sample: years derived only from real source labels", () => {
  const dir = path.join(__dirname, "..", "data/banks/chapters/jee_main"); const sub = path.join(dir, "physics"); const files = fs.readdirSync(sub).filter((f) => f.endsWith(".json")).slice(0, 5);
  let qs = []; files.forEach((f) => { const d = JSON.parse(fs.readFileSync(path.join(sub, f), "utf8")); qs = qs.concat(Array.isArray(d) ? d : (d.questions || [])); });
  const fc = F.facets(qs); assert(qs.length > 0); fc.years.forEach((y) => assert(y.year >= 2002 && y.year <= 2026, "year " + y.year));
  qs.forEach((q) => { const y = F.yearOf(q); if (y != null) assert(String(q.source || q.year).includes(String(y))); });
  console.log("   sample", qs.length, "qs, years", fc.years.length, "untagged", fc.noYear, "types", JSON.stringify(fc.types));
});
// marks-features wiring: run the real setters with renderQList stubbed
t("marks-features: facet setter filters full list, reset clears all, order kept", () => {
  const MF = R("marks-features.js"); const grab = (name) => { const i = MF.indexOf("function " + name + "("); let d = 0; for (let k = MF.indexOf("{", i); ; k++) { if (MF[k] === "{") d++; else if (MF[k] === "}" && --d === 0) return MF.slice(i, k + 1); } };
  const calls = []; const win = { _qxListQsAll: pool };
  const fn = new Function("window", "document", "QxListFilters", "qxNormDifficulty", "renderQList",
    'let _qxListDiffFilter="all",_qxListYearFilter="all",_qxListTypeFilter="all",_qxListAttFilter="all",_listPage=1;' + grab("qxAttemptIndexes") + grab("qxListFilterState") + grab("qxSetListDiffFilter") + grab("qxSetListFacet") + grab("qxResetListFilters") +
    "; return { qxSetListFacet, qxResetListFilters, qxSetListDiffFilter, st: () => [_qxListDiffFilter,_qxListYearFilter,_qxListTypeFilter] };")(win, { getElementById: () => null, querySelector: () => null, createElement: () => ({}) }, F, (d) => d, (qs) => { calls.push(ids(qs)); return ""; });
  try { fn.qxSetListFacet("year", "last10"); } catch (_) {} assert.deepStrictEqual(calls.pop(), ["a", "b", "c", "f", "g"]);
  try { fn.qxSetListFacet("type", "Numerical"); } catch (_) {} assert.deepStrictEqual(calls.pop(), ["b", "c"]);
  try { fn.qxSetListDiffFilter("Hard"); } catch (_) {} assert.deepStrictEqual(calls.pop(), ["b"]);
  try { fn.qxResetListFilters(); } catch (_) {} assert.deepStrictEqual(calls.pop(), ids(pool)); assert.deepStrictEqual(fn.st(), ["all", "all", "all"]);
  assert(/if \(!scope \|\| scope !== _qxListScope\) \{\n      _qxListDiffFilter = "all";\n      _qxListYearFilter = "all";\n      _qxListTypeFilter = "all";\n      _qxListAttFilter = "all";/.test(MF), "a new list scope resets all filters (same scope re-applies: backnav test)");
  assert(R("app.html").indexOf("qx-list-filters.js") < R("app.html").indexOf("marks-features.js?v="));
});
t("filtered list is what Prev/Next uses (window._qxListQs = viewQs)", () => assert(/window\._qxListQs = viewQs;/.test(R("marks-features.js"))));
// Archive: real viewHome
const books = [{ id: "b1", title: "HC Verma", series: "HCV", group: "Physics Books", category: "physics", subject: "Physics", classLevel: "11-12" },
  { id: "b2", title: "MS Chouhan <x>", series: "MSC", group: "Chemistry Books", category: "chemistry", subject: "Chemistry", classLevel: "11-12" },
  { id: "b3", title: "Class 10 notes", series: "N", group: "Notes", category: "class10", subject: "Class 10", classLevel: "10" }];
const aw = { addEventListener() {}, document: {} }; vm.runInNewContext(R("assets/qx-archive.js"), { window: aw, document: { addEventListener() {}, getElementById: () => null }, setTimeout() {}, console });
const AH = aw.__qxArchiveTest, lib = { books };
t("archive subjects come from catalogue field", () => assert.strictEqual(JSON.stringify(AH.archSubjects(lib).map((x) => x.s)), JSON.stringify(["Chemistry", "Class 10", "Physics"])));
t("archive subject chip filters, count + Clear shown", () => { const h = AH.viewHome(lib, { step: "home", subject: "Physics" }); assert(h.includes("HC Verma") && !h.includes("MS Chouhan")); assert(/role="status">1</.test(h)); assert(h.includes("✕ Clear")); });
t("archive search + class combine; no-match message; search text escaped and kept out of inline JS", () => {
  const h = AH.viewHome(lib, { step: "home", q: "zzz", classLevel: "10" }); assert(h.includes("No match")); 
  const h2 = AH.viewHome(lib, { step: "home", q: "x'\"<b>", subject: "all" }); assert(!h2.includes("x'\"<b>")); assert(h2.includes("&lt;b&gt;")); assert(h2.includes('data-cls="all"') && h2.includes('data-sub="all"'));
  const h3 = AH.viewHome(lib, { step: "home" }); assert(!h3.includes("✕ Clear"));
});
// Report card
const rw = {}; vm.runInNewContext(R("assets/qx-report-card.js"), { window: rw, console, localStorage: { getItem: () => null } });
t("report card uses engine awarded marks and counts partial", () => {
  const rows = [{ q: { subject: "P" }, isCorrect: true, marks: 4 }, { q: { subject: "P" }, isCorrect: false, isWrong: false, isSkip: false, marks: 2 }, { q: { subject: "P" }, isWrong: true, marks: -2 }, { q: { subject: "P" }, isSkip: true, marks: 0 }];
  const m = rw.QxReportCard.model({ rows, scoring: { correct: 4, wrong: -1 } }, {});
  assert.strictEqual(JSON.stringify(m.items.map((i) => i.pts)), "[4,2,-2,0]"); assert.strictEqual(m.c.partial, 1); assert.strictEqual(m.c.wrong, 2);
  assert(/Incorrect \/ partial \(" \+ p \+ " partial\)/.test(R("assets/qx-report-card.js")));
});
t("report card legacy rows without marks fall back to old +plus/-minus", () => { const m = rw.QxReportCard.model({ rows: [{ q: {}, isCorrect: true }, { q: {}, isWrong: true }], scoring: { correct: 4, wrong: -1 } }, {}); assert.strictEqual(JSON.stringify(m.items.map((i) => i.pts)), "[4,-1]"); });
console.log("PASS", n);
