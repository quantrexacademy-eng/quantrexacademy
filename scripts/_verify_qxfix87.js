const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
function read(f) { return fs.readFileSync(path.join(root, f), "utf8"); }

["qx-access.js", "qx-live-feed.js", "test-series.js", "marks-features.js", "book-covers.js", "test-engine.js", "qx-guest-trial.js"].forEach((f) => {
  new Function(read(f));
  console.log("syntax-ok", f);
});

const access = read("qx-access.js");
const marks = read("marks-features.js");
const covers = read("book-covers.js");
const app = read("app.html");
const guest = read("qx-guest-trial.js");
const checks = {
  build: (app.match(/QX_BUILD\s*=\s*"([^"]+)"/) || [])[1] || "",
  access87: /qx-access\.js\?v=qxfix87/.test(app),
  marks87: /marks-features\.js\?v=qxfix87/.test(app),
  peekV2: /quantrex_free_peeks_v2/.test(access),
  subjKey: /exam:" \+ exam \+ ":subj:"/.test(access) || /"exam:" \+ exam \+ ":subj:"/.test(access),
  mockKey: /"mock:" \+ exam/.test(access),
  bookFolder: /":folder:" \+ folder/.test(access),
  formulaKey: /"formula:" \+ exam/.test(access),
  revKey: /"rev:" \+ exam/.test(access),
  pyqPeek: /function pyqPeekAttr/.test(marks),
  pyqGate: /function qxPyqBlocked/.test(marks),
  noTenTap: !/UNLOCK_CLICKS = 10/.test(marks),
  irodovOpen: /function tryIrodovGate\(\) \{\s*setIrodovUnlocked\(\);\s*return true;/.test(marks),
  noIrodovGateAttr: !/data-irodov-gate="1"/.test(covers),
  banner: /1st chapter free in every subject/.test(guest)
};
console.log(JSON.stringify(checks, null, 2));
if (checks.build !== "qxfix87") process.exit(1);
Object.keys(checks).forEach((k) => {
  if (k !== "build" && !checks[k]) {
    console.error("fail", k);
    process.exit(1);
  }
});
console.log("qxfix87 verify passed");
