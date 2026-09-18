#!/usr/bin/env node
/** qxmd176 — no ghost stem (no absolute hide); Show Answer sync; glued-word unglue; keep Clear-hide */
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
const egSrc = fs.readFileSync(path.join(root, "examgoal-test-ui.js"), "utf8");
const egCss = fs.readFileSync(path.join(root, "assets/examgoal-test-ui.css"), "utf8");
const visCss = fs.readFileSync(path.join(root, "assets/qx-text-visible.css"), "utf8");
const mathSrc = fs.readFileSync(path.join(root, "math-render.js"), "utf8");
const solSrc = fs.readFileSync(path.join(root, "solution-format.js"), "utf8");
const setSrc = fs.readFileSync(path.join(root, "qx-settings.js"), "utf8");
const appSrc = fs.readFileSync(path.join(root, "app.js"), "utf8");
const allenSrc = fs.readFileSync(path.join(root, "allen-test-ui.js"), "utf8");

check("build is qxmd176", ver.build === "qxmd176" && /qxmd176/.test(sw) && /QX_BUILD = "qxmd176"/.test(appHtml));
check("cache qx-pwa-qxmd176", ver.cache === "qx-pwa-qxmd176" && /qx-pwa-qxmd176/.test(sw));
check("PARITY qxmd176", /PARITY = "qxmd176"/.test(setSrc));

// Ghost stem root-cause fixes
check("no left:-9999 in revealPracticeSolution hide", !/setProperty\("left",\s*"\-9999px"/.test(egSrc));
check("stem hide uses position static", /setProperty\("position",\s*"static"/.test(egSrc));
check("render stem style no absolute -9999", !/left:-9999px!important/.test(egSrc) || /left:auto!important/.test(egSrc));
check("no panel.scrollIntoView call in reveal", !/panel\.scrollIntoView\s*\(/.test(egSrc) && !/solRoot\.scrollIntoView\s*\(/.test(egSrc));
check("safe body scrollTop instead", /scrollTop\s*=\s*0/.test(egSrc) && /NEVER panel\.scrollIntoView|no scrollIntoView/.test(egSrc));
check("qxmd176 CSS kills off-canvas absolute", /kill off-canvas ghost stem/.test(egCss) && /position:\s*static\s*!important/.test(egCss));
check("qxmd176 vis CSS no absolute stem", /stem-hide without off-canvas/.test(visCss) && /eg-qxmd176/.test(visCss));
check("eg-qxmd176 on root", /eg-qxmd176/.test(egSrc));

// Marks-like layout
check("Marks-way sol replaces stem slot", /eg-sol-marks-way/.test(egSrc) && /Marks-way/.test(egSrc));
check("metadata strip kept (eg-info-strip)", /eg-info-strip/.test(egSrc) && /eg-info-strip/.test(egCss));
check("opts hide while sol open", /eg-opts-sol-hidden/.test(egSrc) && /eg-sol-showing\.eg-qxmd176 #qxOpts/.test(egCss));
check("stem empty while sol open", /showSol \? "" : stem/.test(egSrc));

// Show Answer sync
check("Check Answer sets _egShowAnswer true", /session\._egShowAnswer\s*=\s*true/.test(egSrc));
check("toggle checked via wantShowSol", /wantShowSol\(session,\s*session\.idx\)\s*\?\s*" checked"/.test(egSrc));
check("Show Answer OFF clears _egChecked", /toggle OFF = close solution fully/.test(egSrc) || /delete session\._egChecked\[session\.idx\]/.test(egSrc));
check("app.js Check Answer sets showAnswer", /ctx\.showAnswer\s*=\s*true/.test(appSrc));
check("allen checkbox follows solOpen", /qxPracShowAns"\$\{solOpen \? " checked"/.test(allenSrc));

// Keep mobile Clear / Prev Next / Aa
check("Clear hidden mobile CSS", /#qxClearBtn/.test(egCss) && /display:\s*none\s*!important/.test(egCss));
check("Prev Next foot retained", /#qxPrevBtn/.test(egCss) && /#qxNextBtn/.test(egCss) && /safe-area-inset-bottom/.test(egCss));
check("Show Answer control present", /egShowAns|eg-show|#egShowAns/.test(egSrc));
check("Aa / egFmtBtn present", /egFmtBtn|Text size/.test(egSrc));

// Glued words
check("unglueLowercaseMathProse defined", /function unglueLowercaseMathProse/.test(mathSrc));
check("unglue exported on Mx", /unglueLowercaseMathProse/.test(mathSrc));
check("formatShortcutLine calls unglue", /unglueLowercaseMathProse|fixWordSpacing/.test(solSrc) && /qxmd176: unglue Quick Shortcut/.test(solSrc));
check("oddodd pattern in unglue", /oddodd/.test(mathSrc) && /sosymmetricrelation/.test(mathSrc));

// Runtime unglue
const m = mathSrc.match(/function unglueLowercaseMathProse\(s\) \{[\s\S]*?\n  \}\n/);
check("unglue fn extractable", !!m);
if (m) {
  eval(m[0]);
  check("unglue oddodd", unglueLowercaseMathProse("oddodd") === "odd odd", unglueLowercaseMathProse("oddodd"));
  check("unglue eveneven", unglueLowercaseMathProse("eveneven") === "even even");
  check("unglue sosymmetricrelation", unglueLowercaseMathProse("sosymmetricrelation") === "so symmetric relation");
}

// Retain sanitize $$ from qxmd175
const sanitizeSrc = fs.readFileSync(path.join(root, "qx-math-sanitize.js"), "utf8");
check("sanitize $$ whitespace retain", /qxmd175: require WHITESPACE/.test(sanitizeSrc));
const Qx = require(path.join(root, "qx-math-sanitize.js"));
function out(s) { return Qx.normalizeMathContent(s).html; }
check("adjacent $$ not glued", out("$$x^2$$$$y^2$$") === "$$x^2$$$$y^2$$", out("$$x^2$$$$y^2$$"));

// No Vercel in version body intent
check("no vercel deploy in version", !/vercel/i.test(ver.body || "") || /no Vercel/i.test(ver.body || ""));

console.log("\nTOTAL:", pass, "pass /", fail, "fail");
process.exit(fail ? 1 : 0);
