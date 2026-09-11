/**
 * Build data/nav/pyq_paper_ids/{exam}.json from each bank's question.source values.
 * Usage: node scripts/build-pyq-paper-ids.js [exam ...]
 * Default: all exams that have both pyq_paper_index/*.json and data/banks/*.json
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const INDEX_DIR = path.join(ROOT, "data", "nav", "pyq_paper_index");
const BANK_DIR = path.join(ROOT, "data", "banks");
const OUT_DIR = path.join(ROOT, "data", "nav", "pyq_paper_ids");

function listIndexExams() {
  return fs
    .readdirSync(INDEX_DIR)
    .filter((f) => f.endsWith(".json") && !f.endsWith("_modules.json"))
    .map((f) => f.replace(/\.json$/, ""));
}

function loadQuestions(bankPath) {
  const raw = JSON.parse(fs.readFileSync(bankPath, "utf8"));
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.questions)) return raw.questions;
  if (raw && Array.isArray(raw.data)) return raw.data;
  return [];
}

function buildMap(questions) {
  const map = Object.create(null);
  for (const q of questions) {
    if (!q || q.id == null) continue;
    const src = String(q.source || q.paperSource || q._sourceFull || "").replace(/\s+/g, " ").trim();
    if (!src) continue;
    if (!map[src]) map[src] = [];
    map[src].push(String(q.id));
  }
  // stable order
  for (const k of Object.keys(map)) {
    map[k] = [...new Set(map[k])];
  }
  return map;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const wanted = process.argv.slice(2).filter(Boolean);
  const exams = wanted.length
    ? wanted
    : listIndexExams().filter((e) => fs.existsSync(path.join(BANK_DIR, e + ".json")));

  const summary = [];
  for (const exam of exams) {
    const bankPath = path.join(BANK_DIR, exam + ".json");
    if (!fs.existsSync(bankPath)) {
      console.warn("skip (no bank):", exam);
      continue;
    }
    console.log("building", exam, "...");
    const qs = loadQuestions(bankPath);
    const map = buildMap(qs);
    const outPath = path.join(OUT_DIR, exam + ".json");
    fs.writeFileSync(outPath, JSON.stringify(map));
    const papers = Object.keys(map).length;
    const ids = Object.values(map).reduce((n, a) => n + a.length, 0);
    summary.push({ exam, papers, ids, bytes: fs.statSync(outPath).size });
    console.log("  ->", papers, "papers,", ids, "ids,", Math.round(fs.statSync(outPath).size / 1024), "KB");
  }
  console.log(JSON.stringify(summary, null, 2));
}

main();
