const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const MAP = path.join(ROOT, "data", "hcv-em-induction-generated-map.json");
const OUT_DIR = path.join(ROOT, "assets", "diagrams");

async function main() {
  const map = JSON.parse(fs.readFileSync(MAP, "utf8"));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let ok = 0;
  for (const [id, src] of Object.entries(map)) {
    const out = path.join(OUT_DIR, `hcv-v2-em-induction-${id}.png`);
    const abs = src.replace(/\//g, path.sep);
    if (!fs.existsSync(abs)) {
      console.error("missing", id, abs);
      continue;
    }
    if (abs.toLowerCase().endsWith(".png")) {
      fs.copyFileSync(abs, out);
    } else {
      await sharp(abs, { density: 192 }).png({ compressionLevel: 6 }).toFile(out);
    }
    ok++;
    console.log("wrote", path.basename(out));
  }
  // keep legacy alias for Q23-24
  const e3 = path.join(OUT_DIR, "hcv-v2-em-induction-e3.png");
  const legacy = path.join(OUT_DIR, "hcv-v2-em-induction-ex23-24-two-boys-rhombus.png");
  if (fs.existsSync(e3) && !fs.existsSync(legacy)) fs.copyFileSync(e3, legacy);
  if (fs.existsSync(legacy) && fs.existsSync(e3)) {
    const s1 = fs.statSync(legacy).mtimeMs;
    const s2 = fs.statSync(e3).mtimeMs;
    if (s2 >= s1) fs.copyFileSync(e3, legacy);
  }
  console.log("installed", ok, "figures");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});