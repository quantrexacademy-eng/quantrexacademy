"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

function walk(dir, acc, skipRx) {
  if (!fs.existsSync(dir)) return acc;
  for (const n of fs.readdirSync(dir)) {
    if (skipRx && skipRx.test(n)) continue;
    const p = path.join(dir, n);
    let st;
    try { st = fs.statSync(p); } catch (_) { continue; }
    if (st.isDirectory()) walk(p, acc, skipRx);
    else if (n.endsWith(".json") && !n.includes(".bak") && !n.startsWith("_")) acc.push(p);
  }
  return acc;
}

function countHosts(files) {
  const hosts = {
    getmarks: 0, quizrr: 0, examgoal: 0, localAssets: 0, firebase: 0, proxy: 0, files: files.length
  };
  const fileHits = { getmarks: 0, quizrr: 0, examgoal: 0 };
  for (const f of files) {
    let s;
    try { s = fs.readFileSync(f, "utf8"); } catch (_) { continue; }
    const gm = (s.match(/cdn-question-pool\.getmarks\.app|cdn-assets\.getmarks\.app/gi) || []).length;
    const qz = (s.match(/cdn\.quizrr\.in/gi) || []).length;
    const eg = (s.match(/examgoal\.net/gi) || []).length;
    const loc = (s.match(/\/assets\/diagrams\//gi) || []).length;
    const fb = (s.match(/firebasestorage\.googleapis\.com/gi) || []).length;
    const px = (s.match(/\/api\/proxy-image/gi) || []).length;
    hosts.getmarks += gm;
    hosts.quizrr += qz;
    hosts.examgoal += eg;
    hosts.localAssets += loc;
    hosts.firebase += fb;
    hosts.proxy += px;
    if (gm) fileHits.getmarks++;
    if (qz) fileHits.quizrr++;
    if (eg) fileHits.examgoal++;
  }
  hosts.fileHits = fileHits;
  return hosts;
}

const areas = {
  books: walk(path.join(ROOT, "data/books/chapters"), [], /_ocr|_probe/),
  quizrr_pyq: walk(path.join(ROOT, "data/tests/jee_main_quizrr_pyq_chapter"), [], null),
  examgoal: walk(path.join(ROOT, "data/tests/jee_main_examgoal_2027"), [], /_eg_/),
  nav_books: walk(path.join(ROOT, "data/nav/books"), [], null)
};
const out = {};
for (const [k, files] of Object.entries(areas)) out[k] = countHosts(files);

const marksLive = fs.readFileSync(path.join(ROOT, "marks-live.js"), "utf8");
out.runtime = {
  studentMarksOff: /STUDENT_MARKS_RUNTIME\s*=\s*false/.test(marksLive),
  firebaseBank: fs.existsSync(path.join(ROOT, "qx-firebase-bank.js")),
  catalogApi: fs.existsSync(path.join(ROOT, "api/marks-question.js"))
};
const bankDir = path.join(ROOT, "data/banks");
out.banksOnDisk = fs.existsSync(bankDir)
  ? fs.readdirSync(bankDir).filter((f) => f.endsWith(".json") && !f.includes(".bak")).length
  : 0;

console.log(JSON.stringify(out, null, 2));
fs.writeFileSync(path.join(ROOT, "data/_migration/selfdep_status_1908.json"), JSON.stringify(out, null, 2));
