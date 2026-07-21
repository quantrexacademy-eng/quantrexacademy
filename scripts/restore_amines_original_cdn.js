/**
 * Revert harsh local amine figure packs → original CDN URLs.
 * Watermark removal stays in live proxy + soft-strip (keeps original quality).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BANK = path.join(ROOT, "data", "banks", "jee_advanced.json");
const MANIFEST = path.join(ROOT, "data", "qx_amines_adv_figure_manifest.json");
const OVERRIDES = path.join(ROOT, "data", "qx_figure_overrides.json");

const man = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
let text = fs.readFileSync(BANK, "utf8");
let n = 0;

for (const f of man.figures || []) {
  const id = f.id;
  const cdn = f.url;
  if (!id || !cdn) continue;
  const locals = [
    `/assets/qx-figures/amines-adv/qx-amine-${id}.png?v=amine2`,
    `/assets/qx-figures/amines-adv/qx-amine-${id}.png`,
    `/assets/qx-figures/amides-prep/qx-amide-${id}.png?v=amide1`,
    `/assets/qx-figures/amides-prep/qx-amide-${id}.png`,
  ];
  for (const loc of locals) {
    if (text.includes(loc)) {
      text = text.split(loc).join(cdn);
      n++;
    }
  }
}

// any remaining local amine/amide packs → leave only if no mapping
const leftover = (text.match(/\/assets\/qx-figures\/(?:amines-adv|amides-prep)\//g) || []).length;
fs.writeFileSync(BANK, text);
console.log("restored replacements", n, "leftover local refs", leftover);

// Drop override rules that force harsh binary amine assets
const ov = JSON.parse(fs.readFileSync(OVERRIDES, "utf8"));
const before = (ov.rules || []).length;
ov.rules = (ov.rules || []).filter(
  (r) =>
    !String(r.clean || "").includes("amines-adv") &&
    !String(r.clean || "").includes("amides-prep")
);
ov.version = (ov.version || 1) + 1;
fs.writeFileSync(OVERRIDES, JSON.stringify(ov, null, 2) + "\n");
console.log("overrides removed", before - ov.rules.length, "version", ov.version);
