/* qxmd250 — backslash collapse + shared toolbar smoke checks */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

function check(name, ok) {
  if (!ok) {
    console.error("FAIL", name);
    process.exitCode = 1;
  } else {
    console.log("ok", name);
  }
}

const sanSrc = fs.readFileSync(path.join(root, "qx-math-sanitize.js"), "utf8");
const egSrc = fs.readFileSync(path.join(root, "examgoal-test-ui.js"), "utf8");
const allenSrc = fs.readFileSync(path.join(root, "allen-test-ui.js"), "utf8");
const appSrc = fs.readFileSync(path.join(root, "app.html"), "utf8");
const ver = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));

check("QX_BUILD qxmd250", /window\.QX_BUILD = "qxmd250"/.test(appSrc));
check("version.json build", ver.build === "qxmd250");
check("sharedToolsHtml exists", /function sharedToolsHtml/.test(egSrc));
check("practice and test share helper", /sharedToolsHtml\(\{ theme:/.test(egSrc));
check("no unicode gear in examgoal toolbar", !/egFmtBtn[^>]*>\\u2699/.test(egSrc));
check("allen labeled Settings", /eg-tip">Settings<\/span>/.test(allenSrc));
check("collapseEscapedBackslashes exported", /collapseEscapedBackslashes/.test(sanSrc));

const San = require("../qx-math-sanitize.js");
check("sanitize loaded", !!(San && San.repairMarksExportTex));

if (San && San.repairMarksExportTex) {
  check("triple frac", San.repairMarksExportTex("\\\\\\frac{1}{2}").indexOf("\\frac") === 0);
  check("triple brace", San.repairMarksExportTex("\\\\\\{1,2\\\\\\}").indexOf("\\{") === 0);
  check("double command", San.repairMarksExportTex("\\\\sin x").indexOf("\\sin") === 0);
  check("matrix newline kept", /\\\\\s*b/.test(San.repairMarksExportTex("a \\\\ b")));
  check("answer-like token unchanged-ish", San.repairMarksExportTex("42") === "42");
}

if (process.exitCode) {
  console.error("qxmd250 checks failed");
  process.exit(1);
}
console.log("qxmd250 checks passed");
