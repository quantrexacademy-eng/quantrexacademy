#!/usr/bin/env node
/** qxmd177 — no scroll jump on Check/Show Answer; Marks-like in-flow sol; keep Clear-hide */
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
const setSrc = fs.readFileSync(path.join(root, "qx-settings.js"), "utf8");
const appSrc = fs.readFileSync(path.join(root, "app.js"), "utf8");
const allenSrc = fs.readFileSync(path.join(root, "allen-test-ui.js"), "utf8");

check("build is qxmd177", ver.build === "qxmd177" && /qxmd177/.test(sw) && /QX_BUILD = "qxmd177"/.test(appHtml));
check("cache qx-pwa-qxmd177", ver.cache === "qx-pwa-qxmd177" && /qx-pwa-qxmd177/.test(sw));
check("PARITY qxmd177", /PARITY = "qxmd177"/.test(setSrc));

// Scroll jump root-cause fixes
check("egCaptureScroll helper present", /function egCaptureScroll\s*\(/.test(egSrc));
check("egRestoreScroll helper present", /function egRestoreScroll\s*\(/.test(egSrc));
check("egLockScrollJump helper present", /function egLockScrollJump\s*\(/.test(egSrc));
check("reveal captures scroll before DOM mutate", /_egScrollSnap\s*=\s*egCaptureScroll\(root\)/.test(egSrc));
check("no scrollTop assignment to 0 on sol open", !(/scrollTop\s*=\s*0/.test(egSrc) && !/NEVER force scrollTop=0|NO scrollTop=0/.test(egSrc)) || !/bodyScroll\.scrollTop\s*=\s*0|bs\.scrollTop\s*=\s*0|root\.scrollTop\s*=\s*0/.test(egSrc));
check("no live scrollTop=0 assignments", !/\.scrollTop\s*=\s*0/.test(egSrc));
check("no panel.scrollIntoView / solRoot.scrollIntoView", !/panel\.scrollIntoView\s*\(/.test(egSrc) && !/solRoot\.scrollIntoView\s*\(/.test(egSrc));
check("Check Answer freezes scroll across refresh", /_chkSnap\s*=\s*egCaptureScroll\(root\)/.test(egSrc) && /egRestoreScroll\(_chkSnap\)/.test(egSrc));
check("Show Answer freezes scroll across refresh", /_showSnap\s*=\s*egCaptureScroll\(root\)/.test(egSrc));
check("close restores scroll", /_closeSnap\s*=\s*egCaptureScroll\(root\)/.test(egSrc));

// Marks-like layout
check("eg-qxmd177 on root render", /eg-qxmd177/.test(egSrc));
check("Marks-way sol class retained", /eg-sol-marks-way/.test(egSrc));
check("metadata strip retained", /eg-info-strip/.test(egSrc) || /egInfoStrip/.test(egSrc));
check("opts hide while sol open (render)", /eg-opts-sol-hidden/.test(egSrc) && /showSol \? "" : \(ctx\.opts/.test(egSrc));
check("opts hide deferred after sol paint", /egHideOptsAfterSol/.test(egSrc) && /requestAnimationFrame/.test(egSrc));
check("stem empty while sol open", /showSol \? "" : stem/.test(egSrc) || /showSol \? "" : \(stem\)/.test(egSrc) || /\(showSol \? "" : stem\)/.test(egSrc));

// CSS Marks-like / no jump
check("qxmd177 CSS overflow-anchor none", /overflow-anchor:\s*none/.test(egCss) && /qxmd177/.test(egCss));
check("qxmd177 CSS Marks-like metadata", /Marks-like: metadata strip stays put|metadata strip stays/.test(egCss));
check("qxmd177 vis CSS stem-hide static", /qxmd177: stem-hide/.test(visCss) && /position:\s*static\s*!important/.test(visCss));
check("scroll-lock class in CSS", /eg-qxmd177-scroll-lock/.test(egCss));

// Show Answer sync retained from qxmd176
check("Check Answer sets _egShowAnswer true", /session\._egShowAnswer\s*=\s*true/.test(egSrc));
check("toggle checked via wantShowSol", /wantShowSol\(session,\s*session\.idx\)\s*\?\s*" checked"/.test(egSrc));
check("app.js Check Answer sets showAnswer", /ctx\.showAnswer\s*=\s*true/.test(appSrc));
check("app.js eg-qxmd177 on stem hide", /eg-qxmd177/.test(appSrc));
check("allen qxmd177 sol class", /eg-qxmd177-sol/.test(allenSrc));

// Keep mobile Clear / Prev Next / Aa
check("Clear hidden mobile CSS", /#qxClearBtn/.test(egCss) && /display:\s*none\s*!important/.test(egCss));
check("Prev Next foot retained", /#qxPrevBtn/.test(egCss) && /#qxNextBtn/.test(egCss) && /safe-area-inset-bottom/.test(egCss));
check("Show Answer control present", /egShowAns|#egShowAns/.test(egSrc));
check("Aa / egFmtBtn present", /egFmtBtn|Text size|Aa/.test(egSrc));

// No off-canvas ghost (retained)
check("no left:-9999 in reveal hide", !/setProperty\("left",\s*"\-9999px"/.test(egSrc));
check("stem hide uses position static", /setProperty\("position",\s*"static"/.test(egSrc));

// No Vercel
check("no vercel deploy in version", !/vercel/i.test(ver.body || "") || /no Vercel/i.test(ver.body || ""));
check("Quantrex brand in version body or title", /Quantrex|quantrex/i.test(ver.body + ver.title));

console.log("\nTOTAL:", pass, "pass /", fail, "fail");
process.exit(fail ? 1 : 0);
