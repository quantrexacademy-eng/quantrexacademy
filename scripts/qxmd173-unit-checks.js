#!/usr/bin/env node
/** qxmd173 — Mobile Practice: hide Clear; Prev|Next primary + safe-area; Aa top pop; Show Answer untouched. */
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("PASS —", name); }
  else { fail++; console.log("FAIL —", name, detail ? String(detail).slice(0, 220) : ""); }
}

const ver = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const html = fs.readFileSync(path.join(root, "app.html"), "utf8");
const egSrc = fs.readFileSync(path.join(root, "examgoal-test-ui.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets/examgoal-test-ui.css"), "utf8");
const mob = fs.readFileSync(path.join(root, "assets/qx-mobile.css"), "utf8");
const setSrc = fs.readFileSync(path.join(root, "qx-settings.js"), "utf8");

check("build qxmd173", ver.build === "qxmd173" && /qxmd173/.test(sw) && /QX_BUILD = "qxmd173"/.test(html));
check("cache qx-pwa-qxmd173", ver.cache === "qx-pwa-qxmd173" && /qx-pwa-qxmd173/.test(sw));
check("bust examgoal css+js+mobile", /examgoal-test-ui\.css\?v=qxmd173/.test(html) && /examgoal-test-ui\.js\?v=qxmd173/.test(html) && /qx-mobile\.css\?v=qxmd173/.test(html));
check("eg-qxmd173 class on root", /eg-qxmd173/.test(egSrc) && /eg-qxmd173/.test(css));
check("PARITY qxmd173", /PARITY = "qxmd173"/.test(setSrc));

// Clear hidden on mobile CSS
const clearHide = /\.eg-test-root\.eg-qxmd173[\s\S]{0,400}\.eg-btn-clear[\s\S]{0,120}display:\s*none\s*!important/.test(css)
  || /eg-foot-practice[\s\S]{0,80}#qxClearBtn[\s\S]{0,80}display:\s*none\s*!important/.test(css);
check("Clear hidden on mobile CSS (max-width)", /@media \(max-width:\s*768px\)/.test(css) && clearHide);

// Desktop Clear kept
const deskClear = /@media \(min-width:\s*769px\)[\s\S]{0,800}eg-btn-clear[\s\S]{0,200}display:\s*inline-flex\s*!important/.test(css);
check("Desktop Clear still shown (≥769px)", deskClear);

// Prev|Next primary large
check("Prev|Next min-height 52px mobile", /eg-qxmd173[\s\S]{0,200}#qxPrevBtn[\s\S]{0,400}min-height:\s*52px/.test(css) || /#qxPrevBtn,[\s\S]{0,80}#qxNextBtn[\s\S]{0,120}min-height:\s*52px/.test(css));
check("safe-area padding-bottom on foot", /padding-bottom:\s*calc\(12px \+ env\(safe-area-inset-bottom/.test(css) && /bottom:\s*0\s*!important/.test(css));
check("JS forceFoot uses bottom:0 + safe-area padding", /bottom:0!important/.test(egSrc) && /safe-area-inset-bottom/.test(egSrc));
check("JS hides Clear on narrow practice", /qxClearBtn[\s\S]{0,120}display = "none"/.test(egSrc) || /narrow\)[\s\S]{0,200}qxClearBtn/.test(egSrc));

// Show Answer untouched in render (still present as eg-show / egShowAns)
check("Show Answer still in practice foot DOM", /Show Answer/.test(egSrc) && /id="egShowAns"/.test(egSrc) && /class="eg-show"/.test(egSrc));
check("No CSS hide of Show Answer (.eg-show)", !(/eg-foot-practice[\s\S]{0,200}\.eg-show[\s\S]{0,80}display:\s*none/.test(css)));

// Aa top toolbar + popover from top
check("Aa egFmtBtn in top tools", /id="egFmtBtn"[\s\S]{0,40}Text size/.test(egSrc) || /id="egFmtBtn".*Text size/.test(egSrc));
check("fmt pop opens from top not bottom foot", /eg-qxmd173[\s\S]{0,200}\.eg-fmt-pop[\s\S]{0,300}top:\s*calc\(52px/.test(css) && /eg-qxmd173[\s\S]{0,200}#egFmtPop[\s\S]{0,200}bottom:\s*auto/.test(css));
check("fmt pop not full-screen (max-height)", /eg-qxmd173[\s\S]{0,500}max-height:\s*min\(42vh,\s*320px\)/.test(css));
check("mobile.css Clear hide + Aa top", /eg-btn-clear/.test(mob) && /egFmtBtn/.test(mob) && /top:\s*calc\(52px/.test(mob));

// Keep Mark/Clear in DOM for desktop
check("Clear button still in practice foot HTML (desktop)", /id="qxClearBtn"/.test(egSrc) && /Clear Response/.test(egSrc));
check("Prev + Next buttons present", /id="qxPrevBtn"/.test(egSrc) && /id="qxNextBtn"/.test(egSrc));
check("Next short label for mobile", /eg-btn-short">Next</.test(egSrc));

console.log("\nTOTAL:", pass, "pass /", fail, "fail");
process.exit(fail ? 1 : 0);
