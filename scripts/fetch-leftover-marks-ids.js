#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const proof = require("../lib/qx-proofread");
const ROOT = path.resolve(__dirname, "..");
const QID = path.join(ROOT, "data", "qid_marks");
const MARKS_API = "https://web.getmarks.app/api/v1/questions/";
function load(p, fb) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; } }
function strip(s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function imgUrl(v) {
  if (!v) return "";
  if (typeof v === "string") return v.trim();
  return String(v.url || v.src || v.original || "").trim();
}
function marksToLocal(d) {
  if (!d || typeof d !== "object") return null;
  const qb = d.question || {};
  let q = String(qb.text || qb.html || "");
  const qImg = imgUrl(qb.image);
  if (qImg && !/<img\b/i.test(q)) q += "\n<img src=\"" + qImg.replace(/"/g, "&quot;") + "\"><br>";
  const opts = Array.isArray(d.options) ? d.options.map((o) => {
    if (!o) return "";
    if (typeof o === "string") return proof.proofreadHtml(o);
    let t = String(o.text || o.html || "").trim();
    const im = imgUrl(o.image);
    if (im && !/<img\b/i.test(t)) t += "\n<img src=\"" + im.replace(/"/g, "&quot;") + "\"><br>";
    return proof.proofreadHtml(t);
  }) : [];
  let answer = null;
  if (Array.isArray(d.options)) {
    const i = d.options.findIndex((o) => o && o.isCorrect);
    if (i >= 0) answer = i;
  }
  const sb = d.solution || {};
  let sol = String(sb.text || sb.html || "");
  const sImg = imgUrl(sb.image);
  if (sImg && !/<img\b/i.test(sol)) sol += "\n<img src=\"" + sImg.replace(/"/g, "&quot;") + "\"><br>";
  return {
    q: proof.proofreadHtml(q),
    options: opts,
    answer,
    correctValue: d.correctValue != null ? d.correctValue : null,
    solution: proof.proofreadHtml(sol),
    questionType: d.type || ""
  };
}
const cfg = load(path.join(ROOT, "data", "marks_config.json"), {});
const token = cfg.token;
const qzDir = path.join(ROOT, "data", "tests", "jee_main_quizrr_pyq_chapter", "questions");
const ids = new Set();
const files = [];
fs.readdirSync(qzDir).filter((f) => f.endsWith(".json")).forEach((f) => {
  const abs = path.join(qzDir, f);
  const j = load(abs, {});
  const qs = j.questions || [];
  let hit = false;
  qs.forEach((q) => {
    if (!(q._needsAnswerKey || (q.answer == null && q.correctValue == null))) return;
    if (q._marksId) { ids.add(String(q._marksId)); hit = true; }
  });
  if (hit) files.push(abs);
});
console.log("leftover quizrr with marksId", ids.size, "files", files.length);

async function fetchOne(id) {
  const local = path.join(QID, id + ".json");
  if (fs.existsSync(local)) {
    const rec = marksToLocal(load(local, {}).data || load(local, {}));
    if (rec && (rec.answer != null || rec.correctValue != null)) return rec;
  }
  const res = await fetch(MARKS_API + encodeURIComponent(id), {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
      Origin: "https://web.getmarks.app",
      Referer: "https://web.getmarks.app/",
      "User-Agent": "Mozilla/5.0"
    }
  });
  const text = await res.text();
  if (!res.ok) return { err: res.status };
  const raw = JSON.parse(text);
  fs.mkdirSync(QID, { recursive: true });
  fs.writeFileSync(local, JSON.stringify(raw));
  await sleep(400);
  return marksToLocal(raw.data || raw);
}

(async () => {
  const recs = new Map();
  const arr = [...ids];
  for (let i = 0; i < arr.length; i++) {
    const rec = await fetchOne(arr[i]);
    if (rec && !rec.err) recs.set(arr[i], rec);
    else console.warn("fail", arr[i], rec && rec.err);
    if ((i + 1) % 10 === 0) process.stdout.write("  " + (i + 1) + "/" + arr.length + "\n");
  }
  let applied = 0, filesW = 0;
  files.forEach((abs) => {
    const data = load(abs, null);
    if (!data) return;
    let ch = false;
    (data.questions || []).forEach((q) => {
      if (!(q._needsAnswerKey || (q.answer == null && q.correctValue == null))) return;
      const rec = q._marksId ? recs.get(String(q._marksId)) : null;
      if (!rec) return;
      if (rec.correctValue != null && q.correctValue == null) {
        q.correctValue = rec.correctValue;
        delete q._needsAnswerKey;
        q._resolvedFrom = "marks_login_id";
        applied++;
        ch = true;
      }
      if (rec.answer != null && (q.answer == null || q._needsAnswerKey)) {
        q.answer = rec.answer;
        q.answers = [rec.answer];
        delete q._needsAnswerKey;
        q._resolvedFrom = "marks_login_id";
        applied++;
        ch = true;
      }
      if (rec.solution && strip(rec.solution).length > strip(q.solution || "").length + 10) {
        q.solution = rec.solution;
        ch = true;
      }
    });
    if (ch) {
      fs.writeFileSync(abs, JSON.stringify(data));
      filesW++;
    }
  });
  console.log(JSON.stringify({ fetched: recs.size, applied, filesW }));
})();
