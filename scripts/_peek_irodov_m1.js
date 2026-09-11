"use strict";
const fs = require("fs");
const p = "data/books/chapters/69cfb5366ecf5579037d96a4/69cfb5366ecf5579037d96a4__69d34798097639b3bf3ea47a__69d3479e097639b3bf3ea51b__69d3479e097639b3bf3ea51c.json";
const j = JSON.parse(fs.readFileSync(p, "utf8"));
const q = j.questions[0];
const qhtml = String(q.q || "");
const plain = qhtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const srcM = qhtml.match(/\bsrc=["']([^"']+)["']/i);
let idx = {};
try {
  idx = JSON.parse(fs.readFileSync("data/qx_irodov_stem_index.json", "utf8"));
} catch (_) { /* */ }
const rec = (idx.map || idx)[String(q.id)];
let withImg = 0, emptyPlain = 0, miss = 0, textOnly = 0;
j.questions.forEach((x) => {
  const h = String(x.q || "");
  if (/<img/i.test(h)) withImg++;
  const t = h.replace(/<img\b[^>]*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!t) emptyPlain++;
  if (!/<img/i.test(h) && t) textOnly++;
  if (!/<img/i.test(h) && !t) miss++;
});
console.log(JSON.stringify({
  id: q.id,
  qLen: qhtml.length,
  hasImg: /<img/i.test(qhtml),
  src: srcM ? srcM[1].slice(0, 220) : "",
  plain: plain.slice(0, 300),
  opt0: String((q.options || [])[0] || "").slice(0, 200),
  nOpt: (q.options || []).length,
  source: q.source,
  book: q._book,
  stemIndex: rec || null,
  n: j.questions.length,
  withImg,
  emptyPlain,
  textOnly,
  miss
}, null, 2));
