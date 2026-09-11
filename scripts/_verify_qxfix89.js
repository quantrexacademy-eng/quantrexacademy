const fs = require("fs");
new Function(fs.readFileSync("marks-features.js", "utf8"));
new Function(fs.readFileSync("app.js", "utf8"));
const app = fs.readFileSync("app.html", "utf8");
const mf = fs.readFileSync("marks-features.js", "utf8");
const build = (app.match(/QX_BUILD\s*=\s*"([^"]+)"/) || [])[1];
const checks = {
  build,
  navDrills: /> Drills</.test(app),
  dppMeta: /function qxDppMeta/.test(mf),
  starter: /Starter Pack /.test(mf),
  cardLayout: /dpp-set-card strong \{ display: block/.test(app),
  marks89: /marks-features\.js\?v=qxfix89/.test(app)
};
console.log(JSON.stringify(checks, null, 2));
if (build !== "qxfix89" || !checks.navDrills || !checks.dppMeta || !checks.starter || !checks.cardLayout) {
  process.exit(1);
}
console.log("qxfix89 ok");
