"use strict";
const fs = require("fs");
const path = require("path");
const { displaySrc } = require("../qx-owned-figures");

function collectUrls(obj, acc) {
  if (!obj) return;
  if (typeof obj === "string") {
    const rx = /https?:\/\/[^\s"'<>]+/g;
    let m;
    while ((m = rx.exec(obj))) acc.add(m[0]);
    const img = /src=["']([^"']+)["']/gi;
    while ((m = img.exec(obj))) acc.add(m[1]);
    return;
  }
  if (Array.isArray(obj)) { obj.forEach((x) => collectUrls(x, acc)); return; }
  if (typeof obj === "object") {
    ["image", "img", "figure", "src", "url", "q", "question", "solution", "options", "explanation"].forEach((k) => {
      if (obj[k] != null) collectUrls(obj[k], acc);
    });
  }
}

function sampleJson(file, n) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  const qs = Array.isArray(json) ? json : (json.questions || []);
  const acc = new Set();
  qs.slice(0, n).forEach((q) => collectUrls(q, acc));
  return [...acc].filter((u) => /\.(png|webp|jpe?g|gif)(\?|$)/i.test(u) || /cdn-question-pool|cdn-assets|quizrr|firebasestorage|proxy-image|assets\/diagrams/i.test(u));
}

const files = [
  "data/tests/jee_main_examgoal_2027/questions/tst-19g61mnpzm42d.json",
  "data/tests/jee_main_quizrr_pyq_chapter/questions"
];

const dir = path.join(__dirname, "..", "data/tests/jee_main_quizrr_pyq_chapter/questions");
const qfiles = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).slice(0, 8);
const urls = new Set();
sampleJson(path.join(__dirname, "..", files[0]), 80).forEach((u) => urls.add(u));
qfiles.forEach((f) => sampleJson(path.join(dir, f), 40).forEach((u) => urls.add(u)));

const list = [...urls].slice(0, 12);
console.log("sample_urls", list.length);
list.forEach((u) => {
  const d = displaySrc(u);
  console.log(JSON.stringify({ raw: u.slice(0, 120), disp: String(d || "").slice(0, 140), empty: !d }));
});
