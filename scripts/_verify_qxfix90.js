const fs = require("fs");
["marks-features.js", "firebase-db.js", "app.js"].forEach((f) => {
  new Function(fs.readFileSync(f, "utf8"));
  console.log("syntax-ok", f);
});
const app = fs.readFileSync("app.html", "utf8");
const mf = fs.readFileSync("marks-features.js", "utf8");
const db = fs.readFileSync("firebase-db.js", "utf8");
const checks = {
  build: (app.match(/QX_BUILD\s*=\s*"([^"]+)"/) || [])[1],
  navDpp: /> DPP</.test(app),
  starterPack: /Starter Pack /.test(mf),
  noNavDrills: !/> Drills</.test(app),
  mergeSolved: /function mergeSolved/.test(db),
  flush: /function flushProgress/.test(db),
  fb90: /firebase-db\.js\?v=qxfix90/.test(app)
};
console.log(JSON.stringify(checks, null, 2));
if (checks.build !== "qxfix90" || !checks.navDpp || !checks.starterPack || !checks.mergeSolved || !checks.flush) process.exit(1);
console.log("qxfix90 ok");
