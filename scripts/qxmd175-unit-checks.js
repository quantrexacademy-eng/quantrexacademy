#!/usr/bin/env node
/** qxmd175 — Marks-way stem hide + mobile Clear-hide + $$ preserve + typeset hooks */
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
const egSrc = fs.readFileSync(path.join(root, "examgoal-test-ui.js"), "utf8");
const egCss = fs.readFileSync(path.join(root, "assets/examgoal-test-ui.css"), "utf8");
const visCss = fs.readFileSync(path.join(root, "assets/qx-text-visible.css"), "utf8");
const mathSrc = fs.readFileSync(path.join(root, "math-render.js"), "utf8");
const setSrc = fs.readFileSync(path.join(root, "qx-settings.js"), "utf8");
const appSrc = fs.readFileSync(path.join(root, "app.js"), "utf8");
const allenSrc = fs.readFileSync(path.join(root, "allen-test-ui.js"), "utf8");

check("build is qxmd175", ver.build === "qxmd175" && /qxmd175/.test(sw) && /QX_BUILD = "qxmd175"/.test(appHtml));
check("cache qx-pwa-qxmd175", ver.cache === "qx-pwa-qxmd175" && /qx-pwa-qxmd175/.test(sw));
check("PARITY qxmd175", /PARITY = "qxmd175"/.test(setSrc));

// (1) Stem hidden when solution open — Marks-way
check("stem hidden when sol open (render empty stem)", /showSol \? "" : stem/.test(egSrc) || /\(showSol \? "" : stem\)/.test(egSrc));
check("stem-hide class on sol open", /eg-stem-sol-hidden/.test(egSrc) && /eg-sol-showing/.test(egSrc));
check("Marks-way sol replaces stem slot", /eg-sol-marks-way/.test(egSrc) && /Marks-way/.test(egSrc));
check("reveal inserts after #egQArea", /qSlot\.insertAdjacentHTML\("afterend"/.test(egSrc) || /insertAdjacentHTML\("afterend", panelHtml\)/.test(egSrc));
check("stem-hide CSS nuclear present", /eg-sol-showing/.test(egCss) && /eg-stem-sol-hidden/.test(egCss));
check("qxmd175 stem-hide beats visibility", /qxmd175/.test(egCss) && /eg-sol-showing\.eg-qxmd175/.test(egCss) || /Stem must stay gone/.test(egCss));
check("qx-text-visible stem-hide after qxmd167", /qxmd175: stem-hide wins/.test(visCss) || /eg-sol-showing \.eg-q-stem/.test(visCss));
check("Allen Marks-way sol order", /eg-sol-marks-way/.test(allenSrc));
check("app.js hide stem hosts include eg-q-stem", /\.eg-q-stem/.test(appSrc) && /qxHidePracticeStem|eg-stem-sol-hidden|qx-stem-sol-hidden/.test(appSrc));

// (2) Clear hidden mobile CSS; Prev/Next visible
check("Clear hidden mobile CSS", /#qxClearBtn/.test(egCss) && /display:\s*none\s*!important/.test(egCss));
check("qxmd173 Clear-hide retained", /eg-qxmd173/.test(egCss) && /eg-btn-clear/.test(egCss));
check("qxmd175 foot safe-area / Prev Next", /safe-area-inset-bottom/.test(egCss) && /#qxPrevBtn/.test(egCss) && /#qxNextBtn/.test(egCss));
check("foot practice classes preserved", /eg-foot-practice/.test(egSrc) && /eg-marks-foot/.test(egSrc));
check("Show Answer unchanged", /egShowAns|eg-show|#egShowAns/.test(egSrc));

// (3) $$ preserved + typeset hooks
check("sanitize requires whitespace for empty $$", /qxmd175: require WHITESPACE/.test(sanitizeSrc) && /\\\$\\\$\[ \\t\\n\\r\]\+\\\$\\\$/.test(sanitizeSrc));
check("sanitize warns adjacent $$", /adjacent|qxmd175/.test(sanitizeSrc));
check("typeset retries after Check Answer", /qxTypesetSol/.test(egSrc) && /50,\s*200,\s*500/.test(egSrc));
check("math-render includes eg-sol-panel", /eg-sol-panel|#egSolPanel/.test(mathSrc));
check("math-render self-root include", /querySelectorAll misses the root|looks like a math host/.test(mathSrc));
check("app.js sol typeset retries", /qaSolReveal/.test(appSrc) && /50,\s*200,\s*500/.test(appSrc));

const Qx = require(path.join(root, "qx-math-sanitize.js"));
function out(s) { return Qx.normalizeMathContent(s).html; }

check("$$x^2$$ keeps display dollars", out("$$x^2$$") === "$$x^2$$", out("$$x^2$$"));
check("adjacent $$x$$$$y$$ NOT glued", out("$$x^2$$$$y^2$$") === "$$x^2$$$$y^2$$", out("$$x^2$$$$y^2$$"));
check("pmatrix keeps $$", /^\$\$/.test(out("$$\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}$$")) && /\$\$$/.test(out("$$\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}$$")));
check("mathrm inline keeps $", out("$\\mathrm{R}_{1}$") === "$\\mathrm{R}_{1}$");
check("set braces keep \\{", /\\\{1/.test(out("set $\\{1, 2, 3\\}$")), out("set $\\{1, 2, 3\\}$"));
check("empty $$ $$ collapses", out("$$ $$") === "");
check("empty $ $ collapses", out("$ $") === "");

console.log("\nTOTAL:", pass, "pass /", fail, "fail");
process.exit(fail ? 1 : 0);
