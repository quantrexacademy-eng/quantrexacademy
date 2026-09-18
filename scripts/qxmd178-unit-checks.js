#!/usr/bin/env node
/** qxmd178 — stem never above header when Solution open; fixed chrome; static stem-hide */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("PASS —", name); }
  else { fail++; console.log("FAIL —", name, detail ? String(detail).slice(0, 280) : ""); }
}

const ver = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const appHtml = fs.readFileSync(path.join(root, "app.html"), "utf8");
const egSrc = fs.readFileSync(path.join(root, "examgoal-test-ui.js"), "utf8");
const egCss = fs.readFileSync(path.join(root, "assets/examgoal-test-ui.css"), "utf8");
const visCss = fs.readFileSync(path.join(root, "assets/qx-text-visible.css"), "utf8");
const contrastCss = fs.readFileSync(path.join(root, "assets/qx-site-contrast.css"), "utf8");
const setSrc = fs.readFileSync(path.join(root, "qx-settings.js"), "utf8");
const appSrc = fs.readFileSync(path.join(root, "app.js"), "utf8");
const allenSrc = fs.readFileSync(path.join(root, "allen-test-ui.js"), "utf8");
const mathSrc = fs.readFileSync(path.join(root, "math-render.js"), "utf8");
const teSrc = fs.readFileSync(path.join(root, "test-engine.js"), "utf8");

check("build is qxmd178", ver.build === "qxmd178" && /qxmd178/.test(sw) && /QX_BUILD = "qxmd178"/.test(appHtml));
check("cache qx-pwa-qxmd178", ver.cache === "qx-pwa-qxmd178" && /qx-pwa-qxmd178/.test(sw));
check("PARITY qxmd178", /PARITY = "qxmd178"/.test(setSrc));

// Stem display:none rules (defensive)
check("eg-qxmd178 class on render root", /eg-qxmd178/.test(egSrc) && /eg-qxmd177 eg-qxmd178/.test(egSrc));
check("CSS eg-sol-showing #egQArea display:none", /\.eg-sol-showing\.eg-qxmd178 #egQArea/.test(egCss) && /display:\s*none\s*!important/.test(egCss));
check("vis CSS qxmd178 stem-hide display:none", /qxmd178: vis stem/.test(visCss) && /eg-qxmd178 #egQArea/.test(visCss));
check("contrast CSS qxmd178 stem static", /qxmd178: site-contrast stem/.test(contrastCss) || /eg-qxmd178 #egQArea/.test(contrastCss));

// No absolute/-9999 stem-hide left in live rules (comments ok)
function liveAbsoluteStemHide(css) {
  // Strip block comments then search for absolute+left:-9 near eg-sol-showing / egQArea / stem-sol-hidden
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /(?:eg-sol-showing|egQArea|eg-stem-sol-hidden|eg-q-stem)[^}]{0,800}(?:position:\s*absolute[^}]{0,200}left:\s*-9|left:\s*-9[^}]{0,200}position:\s*absolute)/;
  return re.test(noComments);
}
check("examgoal CSS no live absolute/-9999 stem-hide", !liveAbsoluteStemHide(egCss));
check("site-contrast CSS no live absolute/-9999 stem-hide", !liveAbsoluteStemHide(contrastCss));
check("text-visible CSS no live absolute/-9999 stem-hide", !liveAbsoluteStemHide(visCss));

// Header/content overflow structure
check("qxmd178 fixed fullscreen practice root", /\.eg-test-root\.eg-qxmd178[\s\S]{0,400}position:\s*fixed\s*!important/.test(egCss));
check("qxmd178 overflow hidden on root", /\.eg-test-root\.eg-qxmd178[\s\S]{0,600}overflow:\s*hidden\s*!important/.test(egCss));
check("qxmd178 .eg-body is scroll pane", /\.eg-test-root\.eg-qxmd178 > \.eg-body[\s\S]{0,300}overflow-y:\s*auto\s*!important/.test(egCss));
check("qxmd178 #app-main overflow hidden when host", /eg-qxmd178-host #app-main[\s\S]{0,120}overflow:\s*hidden\s*!important/.test(egCss) || /:has\(\.eg-test-root\.eg-qxmd178\) #app-main[\s\S]{0,120}overflow:\s*hidden/.test(egCss));
check("qxmd178 hides host #app-main siblings", /#app-main > :not\(\.eg-test-root\)/.test(egCss));

// JS helpers
check("egNukeStemAboveHeader helper", /function egNukeStemAboveHeader\s*\(/.test(egSrc));
check("egCoverHostQuestionStrip helper", /function egCoverHostQuestionStrip\s*\(/.test(egSrc));
check("reveal calls egNukeStemAboveHeader", /egNukeStemAboveHeader\(root\)/.test(egSrc));
check("bind covers host on practice", /egCoverHostQuestionStrip\(true\)/.test(egSrc));
check("stem hide uses position static + top auto", /setProperty\("position",\s*"static"/.test(egSrc) && /setProperty\("top",\s*"auto"/.test(egSrc));
check("no live scrollTop=0 assignments", !/\.scrollTop\s*=\s*0/.test(egSrc));
check("no panel.scrollIntoView", !/panel\.scrollIntoView\s*\(/.test(egSrc));

// Host class from enter modes
check("enterMarksTestMode adds eg-qxmd178-host", /marks-test-active[\s\S]{0,80}eg-qxmd178-host/.test(teSrc));
check("enterAllenPracticeMode adds eg-qxmd178-host", /allen-practice-active[\s\S]{0,80}eg-qxmd178-host/.test(appSrc));
check("app.js qxHidePracticeStem adds eg-qxmd178", /eg-qxmd178/.test(appSrc));
check("allen qxmd178-sol class", /eg-qxmd178-sol/.test(allenSrc));

// Keep prior behavior
check("Show Answer sync retained", /session\._egShowAnswer\s*=\s*true/.test(egSrc));
check("Marks-way sol class retained", /eg-sol-marks-way/.test(egSrc));
check("Clear hidden mobile CSS", /#qxClearBtn/.test(egCss) && /display:\s*none\s*!important/.test(egCss));
check("Prev Next foot retained", /#qxPrevBtn/.test(egCss) && /#qxNextBtn/.test(egCss) && /safe-area-inset-bottom/.test(egCss));
check("soft lim glue unglue", /coordinateofthevertex/.test(mathSrc) && /mustliein/.test(mathSrc));

// No Vercel
check("no vercel deploy in version", /no Vercel/i.test(ver.body || "") || !/vercel/i.test(ver.body || ""));
check("Quantrex brand in version", /Quantrex|quantrex/i.test(ver.body + ver.title));

console.log("\nTOTAL:", pass, "pass /", fail, "fail");
process.exit(fail ? 1 : 0);
