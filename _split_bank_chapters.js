/**
 * USB-only helper: split large banks into per-chapter JSON.
 * Output: data/banks/chapters/{slug}/{subjectSlug}/{chapterSlug}.json
 * Run from QUANTREX\website: node _split_bank_chapters.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const BANKS = path.join(ROOT, "data", "banks");
const OUT = path.join(BANKS, "chapters");

function slugPart(s) {
  return String(s || "unknown")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "unknown";
}

function listBanks() {
  return fs.readdirSync(BANKS).filter((n) => n.endsWith(".json") && !n.includes(".bak"));
}

function splitOne(file) {
  const slug = file.replace(/\.json$/i, "");
  const full = path.join(BANKS, file);
  const raw = JSON.parse(fs.readFileSync(full, "utf8"));
  const questions = Array.isArray(raw) ? raw : (raw.questions || []);
  const groups = Object.create(null);
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q) continue;
    const sub = String(q.subject || "Unknown").trim() || "Unknown";
    const ch = String(q.chapter || "Unknown").trim() || "Unknown";
    const key = sub + "\0" + ch;
    if (!groups[key]) groups[key] = { subject: sub, chapter: ch, questions: [] };
    groups[key].questions.push(q);
  }
  const index = { slug, title: (raw && raw.title) || slug, count: questions.length, chapters: {} };
  const destRoot = path.join(OUT, slug);
  fs.mkdirSync(destRoot, { recursive: true });
  let files = 0;
  Object.keys(groups).forEach((key) => {
    const g = groups[key];
    const subSl = slugPart(g.subject);
    const chSl = slugPart(g.chapter);
    const dir = path.join(destRoot, subSl);
    fs.mkdirSync(dir, { recursive: true });
    const rel = subSl + "/" + chSl + ".json";
    const payload = {
      title: (raw && raw.title) || slug,
      category: (raw && raw.category) || "",
      bank: slug,
      subject: g.subject,
      chapter: g.chapter,
      count: g.questions.length,
      questions: g.questions
    };
    fs.writeFileSync(path.join(destRoot, rel), JSON.stringify(payload));
    if (!index.chapters[g.subject]) index.chapters[g.subject] = {};
    index.chapters[g.subject][g.chapter] = rel;
    files++;
  });
  fs.writeFileSync(path.join(destRoot, "index.json"), JSON.stringify(index));
  return { slug, questions: questions.length, files };
}

const files = listBanks();
const report = [];
files.forEach((f) => {
  const r = splitOne(f);
  report.push(r);
  console.log(r.slug + "  q=" + r.questions + "  chapters=" + r.files);
});
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify({ built: Date.now(), banks: report }, null, 2));
console.log("DONE banks=" + files.length + " chapter-files=" + report.reduce((n, r) => n + r.files, 0));
