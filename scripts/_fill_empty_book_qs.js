#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const { convertHtml } = require("./_qx_mathml");
const ROOT = path.resolve(__dirname, "..");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "marks_config.json"), "utf8"));
const TOK = cfg.token;
const MARKS_DIR = path.join(ROOT, "data", "qid_marks");
const DIRS = [
  "C:/Users/Admin/qx-hosting/data/books/chapters/6a7db25c02198edab586feff",
  "C:/Users/Admin/qx-hosting/data/books/chapters/6aa934f6b8c05657c7be7531"
];

function fmt(s) {
  let t = String(s == null ? "" : s);
  if (!t) return t;
  t = convertHtml(t).html;
  t = t.replace(/cdn-question-pool\.\.+app/gi, "cdn-question-pool.getmarks.app");
  return t;
}
function recFrom(raw) {
  const d = raw && (raw.data || raw);
  if (!d || !d.question) return null;
  const qb = d.question || {};
  let q = fmt(qb.text || qb.html || "");
  const qImg = qb.image && (typeof qb.image === "string" ? qb.image : (qb.image.url || qb.image.src));
  if (typeof qImg === "string" && qImg && !/<img\b/i.test(q)) q += '\n<img src="' + qImg.replace(/"/g, "&quot;") + '">';
  const opts = Array.isArray(d.options)
    ? d.options.map((o) => {
        if (!o) return "";
        if (typeof o === "string") return fmt(o);
        let t = fmt(o.text || o.html || "");
        const im = o.image && (typeof o.image === "string" ? o.image : (o.image.url || o.image.src));
        if (typeof im === "string" && im && !/<img\b/i.test(t)) t += '\n<img src="' + im.replace(/"/g, "&quot;") + '">';
        return t;
      })
    : [];
  let answer = null;
  if (Array.isArray(d.options)) {
    const i = d.options.findIndex((x) => x && x.isCorrect);
    if (i >= 0) answer = i;
  }
  const sb = d.solution || {};
  let sol = fmt(sb.text || sb.html || "");
  const sImg = sb.image && (typeof sb.image === "string" ? sb.image : (sb.image.url || sb.image.src));
  if (typeof sImg === "string" && sImg && !/<img\b/i.test(sol)) sol += '\n<img src="' + sImg.replace(/"/g, "&quot;") + '">';
  return { q, options: opts, answer, solution: sol };
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function emptyStem(x) {
  const stem = String(x.q || x.question || "").replace(/<[^>]+>/g, " ").trim();
  return stem.length < 4 && !/<img/i.test(String(x.q || ""));
}

(async () => {
  let filled = 0, fail = 0;
  for (const dir of DIRS) {
    const files = fs.readdirSync(dir).filter((n) => n.endsWith(".json"));
    for (const f of files) {
      const fp = path.join(dir, f);
      const j = JSON.parse(fs.readFileSync(fp, "utf8"));
      let changed = false;
      for (const x of j.questions || []) {
        if (!emptyStem(x)) continue;
        const id = String(x._marksId || x.id);
        let rec = null;
        const cacheFp = path.join(MARKS_DIR, id + ".json");
        if (fs.existsSync(cacheFp)) {
          try { rec = recFrom(JSON.parse(fs.readFileSync(cacheFp, "utf8"))); } catch (_) {}
        }
        if (!rec || !rec.q) {
          for (let a = 0; a < 6; a++) {
            const r = await fetch("https://production.getmarks.app/api/v1/questions/" + encodeURIComponent(id), {
              headers: {
                Authorization: "Bearer " + TOK,
                Accept: "application/json",
                "User-Agent": "Mozilla/5.0",
                Origin: "https://web.getmarks.app",
                Referer: "https://web.getmarks.app/"
              }
            });
            if (r.status === 429) { await sleep(2000 * (a + 1)); continue; }
            const raw = await r.json().catch(() => null);
            if (r.status === 200 && raw) {
              try { fs.writeFileSync(cacheFp, JSON.stringify(raw), "utf8"); } catch (_) {}
              rec = recFrom(raw);
            }
            break;
          }
          await sleep(80);
        }
        if (rec && rec.q) {
          x.q = rec.q;
          x.question = rec.q;
          x.options = rec.options;
          x.answer = rec.answer;
          x.solution = rec.solution;
          x.explanation = rec.solution;
          changed = true;
          filled++;
        } else fail++;
      }
      if (changed) fs.writeFileSync(fp, JSON.stringify(j), "utf8");
    }
  }
  console.log("filled", filled, "fail", fail);
})().catch((e) => { console.error(e); process.exit(1); });
