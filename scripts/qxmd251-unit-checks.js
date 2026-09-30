"use strict";
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
const checks = [];
function ok(name, cond, extra) {
  checks.push({ name, pass: !!cond, extra: extra || "" });
}

const app = read("app.html");
ok("QX_BUILD qxmd251", /window\.QX_BUILD = "qxmd251"/.test(app));
ok("app chrome-lock v=qxmd251", /qx-chrome-lock\.css\?v=qxmd251/.test(app));
ok("app test-engine v=qxmd251", /test-engine\.js\?v=qxmd251/.test(app));
ok("app test-series v=qxmd251", /test-series\.js\?v=qxmd251/.test(app));
ok("app qx-cbt-ux v=qxmd251", /qx-cbt-ux\.js\?v=qxmd251/.test(app));
ok("app gemini v=qxmd251", /qx-gemini-theme\.css\?v=qxmd251/.test(app));

const ver = JSON.parse(read("version.json"));
ok("version.json build", ver.build === "qxmd251");
ok("version.json cache", ver.cache === "qx-pwa-qxmd251");

const sw = read("sw.js");
ok("sw CACHE", /qx-pwa-qxmd251/.test(sw));
ok("sw NEVER_STALE test-series", /test-series/.test(sw));
ok("sw NEVER_STALE chrome-lock", /qx-chrome-lock/.test(sw));

const eng = read("test-engine.js");
ok("engine qxOpenQzrrA11y", /window\.qxOpenQzrrA11y\s*=/.test(eng));
ok("engine qxOpenQzrrInstr", /window\.qxOpenQzrrInstr\s*=/.test(eng));
ok("engine qxOpenQzrrPaper", /window\.qxOpenQzrrPaper\s*=/.test(eng));
ok("engine a11y inline onclick", /id="qzrrA11yBtn"[\s\S]{0,180}qxOpenQzrrA11y/.test(eng));
ok("engine instr inline onclick", /id="qzrrInstrBtn"[\s\S]{0,180}qxOpenQzrrInstr/.test(eng));
ok("engine paper inline onclick", /id="qzrrPaperBtn"[\s\S]{0,180}qxOpenQzrrPaper/.test(eng));
ok("engine always data-test-theme", /setAttribute\("data-test-theme", session\._qzrrDark \? "dark" : "light"\)/.test(eng));

const gem = read("assets/qx-gemini-theme.css");
ok("gemini dark opts pale ink", /\.qzrr-cbt\.qzrr-dark \.mtk-opt \.mtk-opt-text[\s\S]{0,400}#f8fafc/.test(gem));
ok("gemini no dark-opt #0f172a", !/\.qzrr-cbt\.qzrr-dark \.mtk-opt \.mtk-opt-text[\s\S]{0,280}#0f172a/.test(gem));

const lock = read("assets/qx-chrome-lock.css");
ok("lock qxmd251 marker", /qxmd251/.test(lock));
ok("lock qzrr tool pointer-events", /#qzrrA11yBtn[\s\S]{0,400}pointer-events:\s*auto/.test(lock));
ok("lock light ink #0b1220", /#0b1220/.test(lock));
ok("lock dark ink #f8fafc", /#f8fafc/.test(lock));
ok("lock instr overlay", /\.qzrr-instr-page/.test(lock));

const cbt = read("qx-cbt-ux.js");
ok("cbt honor examgoal chooser", /if \(ui === "examgoal" \|\| ui === "quantrex"\)/.test(cbt));
ok("cbt capture only if opener exists", /if \(typeof window\.qxOpenQzrrA11y === "function"\)/.test(cbt));

const ts = read("test-series.js");
ok("ts no force quizrr overwrite", !/config\.uiMode = "quizrr";\s*\n\s*if \(config\.resumeData\)/.test(ts));

const fail = checks.filter((c) => !c.pass);
checks.forEach((c) => {
  console.log((c.pass ? "PASS" : "FAIL") + "  " + c.name + (c.extra ? "  " + c.extra : ""));
});
if (fail.length) {
  console.error("FAILED " + fail.length + "/" + checks.length);
  process.exit(1);
}
console.log("OK " + checks.length + " checks");
