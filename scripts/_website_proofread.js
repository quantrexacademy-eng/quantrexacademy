#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");

function load(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

const pages = [
  "index.html", "login.html", "app.html", "admin.html", "pay.html",
  "examgoal-test-series.html", "quantrex-test-series.html", "test-series.html",
  "jee-main-pyq-chapter.html", "teacher-login.html", "q.html"
];

const brandHits = [];
const missingPages = [];
pages.forEach((f) => {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) { missingPages.push(f); return; }
  const t = fs.readFileSync(abs, "utf8");
  if (/getmarks|marks app|web\.getmarks/i.test(t) && !/never call Marks|STUDENT_MARKS|getmarks\.app\/\//i.test(t)) {
    const lines = t.split(/\n/).filter((l) => /getmarks|Marks App/i.test(l) && !/cdn-question-pool\.getmarks|never call|STUDENT_MARKS|marks-live|marks-features|marks-shell/i.test(l));
    if (lines.length) brandHits.push({ file: f, n: lines.length, sample: lines[0].trim().slice(0, 120) });
  }
});

const app = fs.readFileSync(path.join(ROOT, "app.html"), "utf8");
const build = (app.match(/QX_BUILD\s*=\s*"([^"]+)"/) || [])[1] || "";
const title = (app.match(/<title>([^<]+)/) || [])[1] || "";
const hasQuantrex = /Quantrex Academy/i.test(app);
const hasGetmarksBrand = /GetMarks|getmarks app/i.test(app) && !/cdn-question-pool\.getmarks/i.test(app.replace(/cdn-question-pool\.getmarks\.app/g, ""));

const books = load(path.join(ROOT, "data", "books.json")) || {};
const eng = books.engineering || [];
const missingCovers = [];
eng.forEach((b) => {
  if (b.cover && !exists(b.cover.split("?")[0])) missingCovers.push({ id: b.id, title: b.title, cover: b.cover });
});

const navNeeded = [
  "data/nav/dpp.json", "data/nav/formulas.json", "data/nav/rfc.json",
  "data/nav/cpyqb.json", "data/books.json", "data/formulas.json"
];
const missingNav = navNeeded.filter((f) => !exists(f));

const folderIcons = fs.existsSync(path.join(ROOT, "assets", "folder-icons"))
  ? fs.readdirSync(path.join(ROOT, "assets", "folder-icons"))
  : [];

const marksLive = fs.readFileSync(path.join(ROOT, "marks-live.js"), "utf8");
const runtimeOff = /STUDENT_MARKS_RUNTIME\s*=\s*false/.test(marksLive);

console.log(JSON.stringify({
  build, title, hasQuantrex,
  missingPages, brandHits, missingCovers: missingCovers.slice(0, 20),
  missingNav, folderIcons, runtimeOff,
  bookCount: eng.length
}, null, 2));
