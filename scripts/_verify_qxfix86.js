const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const files = ["qx-access.js", "qx-live-feed.js", "test-series.js"];
for (const f of files) {
  const src = fs.readFileSync(path.join(root, f), "utf8");
  new Function(src);
  console.log("syntax-ok", f);
}
const app = fs.readFileSync(path.join(root, "app.html"), "utf8");
const build = (app.match(/QX_BUILD\s*=\s*"([^"]+)"/) || [])[1] || "";
const checks = {
  build,
  access: /qx-access\.js\?v=qxfix86/.test(app),
  feed: /qx-live-feed\.js\?v=qxfix86/.test(app),
  ts: /test-series\.js\?v=qxfix86/.test(app),
  noChapterHubCatalog: !/step === "chapterHub"/.test(fs.readFileSync(path.join(root, "qx-access.js"), "utf8")),
  canAccess: /function canAccess/.test(fs.readFileSync(path.join(root, "qx-access.js"), "utf8")),
  peekAttr: /function tsPeekAttr/.test(fs.readFileSync(path.join(root, "test-series.js"), "utf8")),
  purchasesTab: /data-tab="purchase"/.test(fs.readFileSync(path.join(root, "qx-live-feed.js"), "utf8")),
  ingestLive: /function ingestLiveDoc/.test(fs.readFileSync(path.join(root, "qx-live-feed.js"), "utf8"))
};
console.log(JSON.stringify(checks, null, 2));
if (build !== "qxfix86") process.exit(1);
for (const k of Object.keys(checks)) {
  if (k !== "build" && !checks[k]) {
    console.error("fail", k);
    process.exit(1);
  }
}
console.log("qxfix86 verify passed");
