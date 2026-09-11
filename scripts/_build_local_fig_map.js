"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const EG_Q = path.join(ROOT, "data/tests/jee_main_examgoal_2027/questions");
const EG_RAW = path.join(ROOT, "data/tests/jee_main_examgoal_2027/_eg_raw");

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => path.join(dir, f));
}

function htmlOf(q) {
  if (!q) return "";
  const parts = [];
  const push = (v) => {
    if (v == null) return;
    if (typeof v === "string") parts.push(v);
    else if (Array.isArray(v)) v.forEach(push);
    else if (typeof v === "object") {
      ["q", "question", "solution", "explanation", "content", "html", "options", "image"].forEach((k) => push(v[k]));
      if (v.en) push(v.en);
      if (v.hi) push(v.hi);
    }
  };
  push(q);
  return parts.join("\n");
}
function imgs(s) {
  const out = [];
  const rx = /<img\b[^>]*>/gi;
  let m;
  while ((m = rx.exec(String(s || "")))) out.push(m[0]);
  return out;
}
function srcOf(tag) {
  const m = String(tag).match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  return m ? m[1] : "";
}

const map = {};
let paired = 0;
let unmatched = 0;
let selfCount = 0;

for (const f of walk(EG_Q)) {
  let qs;
  try { qs = JSON.parse(fs.readFileSync(f, "utf8")); } catch (_) { continue; }
  if (!Array.isArray(qs)) continue;
  const rawName = path.basename(f);
  const rawPath = path.join(EG_RAW, rawName);
  let raw = null;
  if (fs.existsSync(rawPath)) {
    try { raw = JSON.parse(fs.readFileSync(rawPath, "utf8")); } catch (_) { raw = null; }
  }
  const rawById = new Map();
  function crawl(node) {
    if (!node || typeof node !== "object") return;
    if (node.questionId) rawById.set(String(node.questionId), node);
    if (Array.isArray(node)) node.forEach(crawl);
    else Object.values(node).forEach(crawl);
  }
  if (raw) crawl(raw);

  for (const q of qs) {
    const blob = htmlOf(q);
    if (!/qx-self-/i.test(blob)) continue;
    const localImgs = imgs(blob).map(srcOf).filter((u) => /qx-self-/i.test(u));
    if (!localImgs.length) continue;
    selfCount += localImgs.length;
    const egId = String(q._examgoalId || "");
    const rawQ = rawById.get(egId);
    const rawBlob = rawQ ? htmlOf(rawQ) : "";
    const fbImgs = imgs(rawBlob).map(srcOf).filter((u) => /firebasestorage/i.test(u));
    if (fbImgs.length && localImgs.length) {
      localImgs.forEach((u, i) => {
        const base = u.split("/").pop().split("?")[0];
        const fb = fbImgs[Math.min(i, fbImgs.length - 1)];
        if (base && fb) {
          map[base] = fb.split("&token=")[0];
          paired++;
        }
      });
    } else unmatched++;
  }
}

function pairFolder(label, qDir, rawDir, nameToRaw) {
  let tags = 0;
  let ok = 0;
  let miss = 0;
  for (const f of walk(qDir)) {
    let qs;
    try { qs = JSON.parse(fs.readFileSync(f, "utf8")); } catch (_) { continue; }
    if (!Array.isArray(qs) && qs && qs.questions) qs = qs.questions;
    if (!Array.isArray(qs)) continue;
    const rawPath = nameToRaw(f);
    let raw = null;
    if (rawPath && fs.existsSync(rawPath)) {
      try { raw = JSON.parse(fs.readFileSync(rawPath, "utf8")); } catch (_) { raw = null; }
    }
    const rawById = new Map();
    function crawl(node) {
      if (!node || typeof node !== "object") return;
      if (node.id) rawById.set(String(node.id), node);
      if (node._id) rawById.set(String(node._id), node);
      if (node.questionId) rawById.set(String(node.questionId), node);
      if (Array.isArray(node)) node.forEach(crawl);
      else Object.values(node).forEach(crawl);
    }
    if (raw) crawl(raw);
    for (const q of qs) {
      const blob = htmlOf(q);
      if (!/qx-(?:self|book|org)-/i.test(blob)) continue;
      const localImgs = imgs(blob).map(srcOf).filter((u) => /qx-(?:self|book|org)-/i.test(u));
      if (!localImgs.length) continue;
      tags += localImgs.length;
      const ids = [q.id, q._id, q._examgoalId, q._marksId, q._quizrrId].filter(Boolean).map(String);
      ids.slice().forEach((id) => {
        if (/^qz_/i.test(id)) ids.push(id.replace(/^qz_/i, ""));
      });
      let rawQ = null;
      for (const id of ids) {
        if (rawById.has(id)) { rawQ = rawById.get(id); break; }
      }
      const rawBlob = rawQ ? htmlOf(rawQ) : "";
      const fbImgs = imgs(rawBlob).map(srcOf).filter((u) => /firebasestorage|cdn\.quizrr|cdn-question-pool/i.test(u) && !/\/assets\/diagrams\//i.test(u));
      if (fbImgs.length && localImgs.length) {
        localImgs.forEach((u, i) => {
          const base = u.split("/").pop().split("?")[0];
          const fb = fbImgs[Math.min(i, fbImgs.length - 1)];
          if (base && fb && !map[base]) {
            map[base] = fb.split("&token=")[0];
            ok++;
          }
        });
      } else miss++;
    }
  }
  return { label, tags, ok, miss };
}

const qzPair = pairFolder(
  "quizrr-pyq-chapter",
  path.join(ROOT, "data/tests/jee_main_quizrr_pyq_chapter/questions"),
  path.join(ROOT, "data/tests/jee_main_quizrr_pyq_chapter/_raw_papers"),
  (f) => path.join(ROOT, "data/tests/jee_main_quizrr_pyq_chapter/_raw_papers", path.basename(f).replace(/^qz-/, ""))
);

// Invert book manifest: quizrr CDN → local qx-book → reverse to CDN then owned later
const bookMan = path.join(ROOT, "data/qx_book_figure_manifest.json");
let bookRev = 0;
if (fs.existsSync(bookMan)) {
  const j = JSON.parse(fs.readFileSync(bookMan, "utf8"));
  const m = (j && j.map) || j;
  Object.keys(m).forEach((cdn) => {
    const local = String(m[cdn] || "");
    const base = local.split("/").pop();
    if (/^qx-book-/i.test(base) && /quizrr|getmarks/i.test(cdn)) {
      map[base] = cdn;
      bookRev++;
    }
  });
}

const orgMan = path.join(ROOT, "data/qx_organic_figure_manifest.json");
let orgRev = 0;
if (fs.existsSync(orgMan)) {
  const j = JSON.parse(fs.readFileSync(orgMan, "utf8"));
  const m = (j && j.map) || j;
  Object.keys(m).forEach((cdn) => {
    const local = String(m[cdn] || "");
    const base = local.split("/").pop();
    if (/^qx-org-/i.test(base) && /^https?:/i.test(cdn)) {
      map[base] = cdn;
      orgRev++;
    }
  });
}

const outPath = path.join(ROOT, "data/qx_local_fig_map.json");
fs.writeFileSync(outPath, JSON.stringify({ version: 1, map }));
const jsPath = path.join(ROOT, "assets/qx-local-fig-map.js");
fs.writeFileSync(jsPath, "window.QX_LOCAL_FIG_MAP=" + JSON.stringify(map) + ";\n");
console.log(JSON.stringify({
  selfTags: selfCount,
  paired,
  unmatched,
  quizrr: qzPair,
  bookRev,
  orgRev,
  mapSize: Object.keys(map).length,
  out: "data/qx_local_fig_map.json",
  js: "assets/qx-local-fig-map.js",
  jsonBytes: fs.statSync(outPath).size,
  jsBytes: fs.statSync(jsPath).size
}, null, 2));
