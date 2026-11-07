// node scripts/make-preview-config.js -> firebase.preview.json (live config + noindex for preview channels only)
const fs = require("fs"), path = require("path"), root = path.join(__dirname, "..");
const cfg = JSON.parse(fs.readFileSync(path.join(root, "firebase.json"), "utf8"));
const h = Array.isArray(cfg.hosting) ? cfg.hosting[0] : cfg.hosting;
h.headers = (h.headers || []).concat([{ source: "**", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]);
h.ignore = h.ignore.concat(["firebase.preview.json"]);
fs.writeFileSync(path.join(root, "firebase.preview.json"), JSON.stringify(cfg, null, 2) + "\n");
console.log("wrote firebase.preview.json");
