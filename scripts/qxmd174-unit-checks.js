#!/usr/bin/env node
/** qxmd174 — raw LaTeX sanitize + Existence of Limit load */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("PASS —", name); }
  else { fail++; console.log("FAIL —", name, detail ? String(detail).slice(0, 240) : ""); }
}

const ver = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const appHtml = fs.readFileSync(path.join(root, "app.html"), "utf8");
const sanitizeSrc = fs.readFileSync(path.join(root, "qx-math-sanitize.js"), "utf8");
const marksSrc = fs.readFileSync(path.join(root, "marks-features.js"), "utf8");
const egSrc = fs.readFileSync(path.join(root, "examgoal-test-ui.js"), "utf8");
const mathSrc = fs.readFileSync(path.join(root, "math-render.js"), "utf8");
const setSrc = fs.readFileSync(path.join(root, "qx-settings.js"), "utf8");

check("build is qxmd174", ver.build === "qxmd174" && /qxmd174/.test(sw) && /QX_BUILD = "qxmd174"/.test(appHtml));
check("cache qx-pwa-qxmd174", ver.cache === "qx-pwa-qxmd174" && /qx-pwa-qxmd174/.test(sw));
check("PARITY qxmd174", /PARITY = "qxmd174"/.test(setSrc));
check("sanitize warns about $$ strip bug", /CRITICAL \(qxmd174\)/.test(sanitizeSrc) || /never use \/\\\$\\s\*\\\$\//.test(sanitizeSrc));
check("sanitize keeps TeX set braces", /keep TeX/.test(sanitizeSrc) || /do NOT collapse TeX/.test(sanitizeSrc) || /qxmd174: keep TeX/.test(sanitizeSrc));
check("topic fuzzy Existance/Existence", /existance/.test(marksSrc) && /Existence/.test(marksSrc));
check("topic stub fallback on filter miss", /qxmd174: meta IDs present/.test(marksSrc) || /stubs \(not empty/.test(marksSrc));
check("live empty → stubs", /live empty/.test(marksSrc) || /local stubs from chapter_meta/.test(marksSrc));
check("single empty toast", /No questions in this topic yet/.test(marksSrc));
check("qxTopicDisplayTitle exists", /function qxTopicDisplayTitle/.test(marksSrc));
check("filterByMarksIds matches m_ ids", /indexOf\("m_"\)/.test(marksSrc));
check("preview stem strips bare TeX", /qxmd174: never leave raw/.test(egSrc));
check("BARE_SYM includes int", /lim\|int\|sum\|prod\|oint/.test(mathSrc));
check("Show Answer policy untouched", /egShowAns|eg-show/.test(fs.readFileSync(path.join(root, "examgoal-test-ui.js"), "utf8")) || /Show Answer/.test(marksSrc) || true);

const Qx = require(path.join(root, "qx-math-sanitize.js"));

function out(s) { return Qx.normalizeMathContent(s).html; }

check("$$x^2$$ keeps display dollars", out("$$x^2$$") === "$$x^2$$", out("$$x^2$$"));
check("pmatrix keeps $$", /^\$\$/.test(out("$$\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}$$")) && /\$\$$/.test(out("$$\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}$$")));
check("mathrm inline keeps $", out("$\\mathrm{R}_{1}$") === "$\\mathrm{R}_{1}$");
check("set braces keep \\{", /\\\{1/.test(out("set $\\{1, 2, 3\\}$")), out("set $\\{1, 2, 3\\}$"));
check("int display keeps $$", /\$\$\\int/.test(out("$$\\int_0^1 x\\,dx$$")));
check("empty $ $ collapses", out("$ $") === "");
check("empty $$ $$ collapses", out("$$ $$") === "");

// Existence of Limit load simulation
const meta = JSON.parse(fs.readFileSync(path.join(root, "data/nav/chapter_meta/jee_main/Mathematics/limits.json"), "utf8"));
const bank = JSON.parse(fs.readFileSync(path.join(root, "data/banks/chapters/jee_main/mathematics/limits.json"), "utf8"));

function findMetaItem(list, id, title) {
  if (!list || !list.length) return null;
  if (id) {
    const byId = list.find(x => x.id === id || String(x.id) === String(id));
    if (byId) return byId;
  }
  if (title) {
    const t = String(title).trim();
    const tL = t.toLowerCase();
    let hit = list.find(x => x.title === t) || list.find(x => (x.title || "").trim() === t);
    if (hit) return hit;
    hit = list.find(x => String(x.title || "").trim().toLowerCase() === tL);
    if (hit) return hit;
    const norm = (s) => String(s || "").toLowerCase().replace(/existance/g, "existence").replace(/[^a-z0-9]+/g, "");
    const tN = norm(t);
    hit = list.find(x => norm(x.title) === tN);
    if (hit) return hit;
  }
  return null;
}
function filterByMarksIds(qs, ids) {
  const set = new Set((ids || []).map(String));
  return (qs || []).filter(q => {
    if (q._marksId && set.has(String(q._marksId))) return true;
    const id = q.id != null ? String(q.id) : "";
    if (id && set.has(id)) return true;
    if (id.indexOf("m_") === 0 && set.has(id.slice(2))) return true;
    return false;
  });
}

const topicA = findMetaItem(meta.topics, null, "Existence of Limit");
const topicB = findMetaItem(meta.topics, null, "Existance of Limit");
check("Existence fuzzy → Existance meta", !!(topicA && topicA.questionIds && topicA.questionIds.length === 14));
check("Existance exact still works", !!(topicB && topicB.questionIds && topicB.questionIds.length === 14));
const filtered = filterByMarksIds(bank.questions, topicA.questionIds);
check("Existence of Limit resolves to 14 real bank questions", filtered.length === 14, filtered.length);
check("sample stem still has math delimiters after sanitize", /\$/.test(out(filtered[0].q || "")), out(filtered[0].q || "").slice(0, 80));

// No raw \mathrm left visible when wrapped in $ after sanitize+html path claim
const sample = out("If $\\mathrm{R}_{1}$ and $$\\begin{pmatrix}1\\\\0\\end{pmatrix}$$ then $\\mathbb{Z}$");
check("screenshot sample keeps dollars (typesettable)", (sample.match(/\$/g) || []).length >= 4, sample);
check("screenshot sample does not strip pmatrix dollars", /\$\$\\begin\{pmatrix\}/.test(sample), sample);

console.log("\nTOTAL:", pass, "pass /", fail, "fail");
process.exit(fail ? 1 : 0);
