const fs = require("fs");
const path = require("path");
const j = require("../data/banks/jee_advanced.json");
const ids = [
  "66965dc7d603121f43a3d07c",
  "64b16a56f23ac7d519f9b37e",
  "64b16a3df23ac7d519f9b299",
  "64b16a3bf23ac7d519f9b289",
  "64b16a35f23ac7d519f9b253",
  "64b169d3f23ac7d519f9aed1",
];
const byMarks = {};
for (const q of j.questions) {
  if (q._marksId) byMarks[q._marksId] = q;
}
const CDN = "https://cdn-question-pool.getmarks.app/";
function fix(u) {
  return String(u || "").replace(/https?:\/\/\.app\//gi, CDN);
}
const re = /https?:\/\/[^"'\\\s>]+\.(?:png|jpg|jpeg|webp)/gi;
const out = [];
const allUrls = new Set();
for (const id of ids) {
  const q = byMarks[id] || j.questions.find((x) => String(x.id) === id);
  if (!q) {
    console.log("MISSING", id);
    continue;
  }
  const urls = [];
  const fields = [["q", q.q], ["solution", q.solution]];
  (q.options || []).forEach((o, i) => fields.push(["opt" + i, o]));
  for (const [field, html] of fields) {
    if (!html) continue;
    let m;
    const s = String(html);
    re.lastIndex = 0;
    while ((m = re.exec(s))) {
      const url = fix(m[0]);
      urls.push({ field, url });
      allUrls.add(url);
    }
  }
  out.push({
    marksId: id,
    bankId: q.id,
    source: q.source,
    qPreview: String(q.q || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160),
    urls,
  });
}
const payload = {
  topic: "Preparation and Properties of Amides",
  exam: "jee_advanced",
  chapter: "Amines",
  questions: out,
  urls: [...allUrls].map((url) => ({ url })),
};
fs.writeFileSync(path.join(__dirname, "_amides_figs.json"), JSON.stringify(payload, null, 2));
console.log("questions", out.length, "unique urls", allUrls.size);
out.forEach((q) => console.log(q.marksId, q.urls.length, "imgs", q.qPreview.slice(0, 80)));
for (const u of allUrls) console.log("URL", u);
