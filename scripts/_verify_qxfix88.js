const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
function read(f) { return fs.readFileSync(path.join(root, f), "utf8"); }

["qx-access.js", "marks-features.js", "test-engine.js"].forEach((f) => {
  new Function(read(f));
  console.log("syntax-ok", f);
});
const access = read("qx-access.js");
const marks = read("marks-features.js");
const app = read("app.html");
const eg = read("assets/examgoal-test-ui.css");
const sol = read("assets/qx-solution.css");
const checks = {
  build: (app.match(/QX_BUILD\s*=\s*"([^"]+)"/) || [])[1] || "",
  access88: /qx-access\.js\?v=qxfix88/.test(app),
  lockTag: /function setLockTag/.test(access),
  peekV3: /quantrex_free_peeks_v3/.test(access),
  yearToken: /year:/.test(access) && /mockyear:/.test(access),
  pyqYearAttr: /data-qx-year/.test(marks),
  qbarAlways: !/\.eg-side-collapsed \.eg-qbar \{ display: none/.test(eg),
  qbarFlex: /\.eg-test-root \.eg-qbar/.test(eg),
  solDark: /html\[data-theme="dark"\] \.eg-sol/.test(sol)
};
console.log(JSON.stringify(checks, null, 2));
if (checks.build !== "qxfix88") process.exit(1);
Object.keys(checks).forEach((k) => {
  if (k !== "build" && !checks[k]) {
    console.error("fail", k);
    process.exit(1);
  }
});
console.log("qxfix88 verify passed");
