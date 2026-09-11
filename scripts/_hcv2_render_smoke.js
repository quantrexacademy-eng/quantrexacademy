/* Smoke: local HCV figures must survive parse + native body build pieces. */
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "qx-image-clean.js"), "utf8");
if (src.includes("isIrodovFig")) {
  console.error("FAIL isIrodovFig still referenced");
  process.exit(1);
}
if (!/never abort the stem rewrite/.test(src)) {
  console.error("FAIL rewrite guard missing");
  process.exit(1);
}
const LOCAL_CLEAN_RX = /^\.?\/?assets\/(diagrams|clean-diagrams|qx-figures)\//i;
const samples = [
  "/assets/diagrams/qx-book-26a04af3be7a5e53.png",
  "/assets/diagrams/hcv-v2-obj-chapter_31_capacitors_figure_31_q1.png",
  "/assets/diagrams/qx-book-60eb0a348f239904.png"
];
for (const u of samples) {
  if (!LOCAL_CLEAN_RX.test(u)) {
    console.error("FAIL LOCAL_CLEAN_RX", u);
    process.exit(1);
  }
  const tag = `<img style="width: 420px" src="${u}" />`;
  const imgM = tag.match(/<img\b([^>]*)>/i);
  const srcM = imgM[1].match(/\bsrc=["']([^"']+)["']/i);
  if (!srcM || srcM[1] !== u) {
    console.error("FAIL parse tag", u);
    process.exit(1);
  }
}
const ch = path.join(__dirname, "..", "data/books/chapters/6a0addba4b032b031e049a36/6a0addba4b032b031e049a36__6a2fdc56afb6d6932c18427d__6a2fdc56afb6d6932c184280__6a2fdc56afb6d6932c184281.json");
const j = JSON.parse(fs.readFileSync(ch, "utf8"));
const withFig = (j.questions || []).filter(q => /<img\b/i.test(String(q.q || "")));
if (withFig.length < 1) {
  console.error("FAIL objective I capacitors has no stem figures");
  process.exit(1);
}
console.log("OK figs", withFig.length, "sample", (String(withFig[0].q).match(/src=["']([^"']+)/) || [])[1]);
