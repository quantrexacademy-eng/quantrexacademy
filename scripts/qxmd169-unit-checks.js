#!/usr/bin/env node
/** qxmd169 — mobile Practice foot, toolbar reach, medical MIPYQ, palette/load speed. */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("PASS —", name); }
  else { fail++; console.log("FAIL —", name, detail ? String(detail).slice(0, 240) : ""); }
}

const eg = fs.readFileSync(path.join(root, "examgoal-test-ui.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets/examgoal-test-ui.css"), "utf8");
const mob = fs.readFileSync(path.join(root, "assets/qx-mobile.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const data = fs.readFileSync(path.join(root, "data.js"), "utf8");
const mf = fs.readFileSync(path.join(root, "marks-features.js"), "utf8");
const books = JSON.parse(fs.readFileSync(path.join(root, "data/books.json"), "utf8"));
const ver = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const html = fs.readFileSync(path.join(root, "app.html"), "utf8");

check("build is qxmd169", ver.build === "qxmd169" && /qxmd169/.test(sw) && /QX_BUILD = "qxmd169"/.test(html));
check("practice foot has egFootMore + qxNextBtn", /id="egFootMore"/.test(eg) && /id="qxNextBtn"/.test(eg) && /eg-foot-extra/.test(eg));
check("practice foot no Save & Next label in practice branch", !/eg-foot-practice[\s\S]{0,400}Save &amp; Next/.test(eg));
check("mobile CSS hides foot-extra until more-open", /eg-foot-more-open/.test(css) && /:not\(\.eg-foot-more-open\)[\s\S]{0,80}eg-foot-extra/.test(css));
check("Report+Group have eg-tool-reach", /eg-tool-reach" id="egPlusBtn"/.test(eg) && /eg-tool-reach" id="mtkReportBtn"/.test(eg));
check("mobile shows tool-reach", /eg-tool-sec:not\(\.eg-tool-reach\)/.test(css) && /#mtkReportBtn/.test(css));
check("qxmd169 class on root", /eg-qxmd169/.test(eg));
check("palette lock ≤80ms menu", /_egMenuToggleLock < 80/.test(eg));
check("chrome ms ≤120", /--eg-chrome-ms:\s*120ms/.test(css));
check("practice legend counts include marked + att-mark", /countStatus\(g, "eg-marked"\)/.test(eg) && /countStatus\(g, "eg-att-mark"\)/.test(eg));
check("medical catalog has MIPYQ NEET 2027", (books.medical || []).some(b => /Most Important PYQ NEET 2027/i.test(b.title || "")));
check("embedded medical catalog has MIPYQ", /Most Important PYQ NEET 2027/.test(mf));
check("MIPYQ nav+chapters exist on disk", fs.existsSync(path.join(root, "data/nav/books/6a91185f41ab5aba084f4d30.json")) && fs.existsSync(path.join(root, "data/books/chapters/6a91185f41ab5aba084f4d30")));
check("medical books ≥8", (books.medical || []).length >= 8);
check("loadBookChapter default cache unless forceNet", /forceNet \? "no-store" : "default"/.test(data));
check("practice failsafe default 10s", /_qxPracticeFailsafeMs = 10000/.test(app));
check("desk hard failsafe 16s", /finishRender\(qxSlowRetryHtml\(\)\);\n    \}, 16000\)/.test(app) || /\}, 16000\);/.test(app));
check("resetBooksCache sets forceNet", /_qxBookForceNet = true/.test(mf));
check("swipe / more sheet wired", /eg-foot-more-open/.test(eg) && /touchstart/.test(eg));
check("stem-hide CSS retained", /eg-sol-showing/.test(css) && /eg-stem-sol-hidden/.test(css));
check("no api.refresh on menu palette path", /NO eng\.refresh\(\)/.test(eg) || /CSS class only — instant/.test(eg));

console.log("\nTOTAL:", pass, "pass /", fail, "fail");
process.exit(fail ? 1 : 0);
