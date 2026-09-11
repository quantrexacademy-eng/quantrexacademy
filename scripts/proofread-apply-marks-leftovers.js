#!/usr/bin/env node
/**
 * Proofread repair: fetch leftover questions that have _marksId from official Marks API.
 * Never invents stems/options/solutions.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const proof = require("../lib/qx-proofread");
const ROOT = path.resolve(__dirname, "..");
const QID = path.join(ROOT, "data", "qid_marks");
const MARKS_API = "https://web.getmarks.app/api/v1/questions/";
const SKIP_FETCH = process.argv.includes("--cache-only");

function load(p, fb) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; } }
function strip(s) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function imgUrl(v) {
  if (!v) return "";
  if (typeof v === "string") return v.trim();
  return String(v.url || v.src || v.original || "").trim();
}
function isNum(q) {
  return /numerical|integer|nat|subjective|fill|written/i.test(String(q.questionType || q.type || ""))
    || (q.correctValue != null && !(q.options || []).length);
}
function optScore(opts) {
  let n = 0;
  (opts || []).forEach((o) => {
    const s = String(typeof o === "string" ? o : (o && (o.text || o.html)) || "");
    const t = strip(s);
    if (/<img\b/i.test(s)) n += 8;
    else if (t && !/^[A-D]$/i.test(t)) n += Math.min(6, 1 + Math.floor(t.length / 12));
  });
  return n;
}
function leftoverWhy(q) {
  const raw = String(q.q || q.question || "");
  const stem = strip(raw);
  const opts = q.options || [];
  const hasImg = /<img\b/i.test(raw + opts.join(" "));
  const why = [];
  if ((!stem || /^loading/i.test(stem)) && !hasImg) why.push("empty");
  if (!isNum(q) && opts.length && !opts.some((o) => {
    const s = String(o || ""); const t = strip(s);
    return /<img\b/i.test(s) || (t && !/^[A-D]$/i.test(t));
  })) why.push("letter");
  if (isNum(q) && q.correctValue == null && q.answer == null) why.push("nat");
  if (/\b(the figure|shown in (the )?(figure|diagram|graph)|shown below)\b/i.test(stem) && !hasImg) why.push("fig");
  if (/list[\s\-]*i\b|match the (list|column)/i.test(stem) && !/<table/i.test(raw) && !/\\begin\{(?:array|tabular)/i.test(raw) && !hasImg) why.push("match");
  return why;
}
function marksToLocal(d) {
  if (!d || typeof d !== "object") return null;
  const qb = d.question || {};
  let q = String(qb.text || qb.html || "");
  const qImg = imgUrl(qb.image);
  if (qImg && !/<img\b/i.test(q)) q += "\n<img src=\"" + qImg.replace(/"/g, "&quot;") + "\">";
  const opts = Array.isArray(d.options) ? d.options.map((o) => {
    if (!o) return "";
    if (typeof o === "string") return proof.proofreadHtml(o);
    let t = String(o.text || o.html || "").trim();
    const im = imgUrl(o.image);
    if (im && !/<img\b/i.test(t)) t += "\n<img src=\"" + im.replace(/"/g, "&quot;") + "\">";
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
  if (sImg && !/<img\b/i.test(sol)) sol += "\n<img src=\"" + sImg.replace(/"/g, "&quot;") + "\">";
  return {
    q: proof.proofreadHtml(q),
    options: opts,
    answer,
    correctValue: d.correctValue != null ? d.correctValue : null,
    solution: proof.proofreadHtml(sol),
    questionType: d.type || ""
  };
}

function collect() {
  const dirs = [
    path.join(ROOT, "data", "banks"),
    path.join(ROOT, "data", "books", "chapters"),
    path.join(ROOT, "data", "tests"),
    path.join(ROOT, "data", "ncert_offline", "chapters"),
    path.join(ROOT, "data", "board_offline", "chapters")
  ];
  const ids = new Set();
  const files = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach((n) => {
      const p = path.join(dir, n);
      const st = fs.statSync(p);
      if (st.isDirectory()) return walk(p);
      if (!n.endsWith(".json") || n.includes(".bak") || n.startsWith("_")) return;
      const j = load(p, null);
      const qs = j && (Array.isArray(j) ? j : j.questions);
      if (!qs) return;
      let hit = false;
      qs.forEach((q) => {
        if (!leftoverWhy(q).length) return;
        if (q._marksId) { ids.add(String(q._marksId)); hit = true; }
      });
      if (hit) files.push(p);
    });
  }
  dirs.forEach(walk);
  return { ids: [...ids], files };
}

async function fetchOne(id, token) {
  const local = path.join(QID, id + ".json");
  if (fs.existsSync(local)) {
    const raw = load(local, {});
    const rec = marksToLocal(raw.data || raw);
    if (rec && (strip(rec.q) || rec.options.some((o) => strip(o) && !/^[A-D]$/i.test(strip(o))) || rec.correctValue != null || rec.answer != null)) {
      return { rec, from: "cache" };
    }
  }
  if (SKIP_FETCH || !token) return { rec: null, from: "skip" };
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(MARKS_API + encodeURIComponent(id), {
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
          Origin: "https://web.getmarks.app",
          Referer: "https://web.getmarks.app/",
          "User-Agent": "Mozilla/5.0"
        }
      });
      if (res.status === 429) { await sleep(1500 + i * 2500); continue; }
      if (!res.ok) return { rec: null, from: "http" + res.status };
      const body = await res.json();
      fs.mkdirSync(QID, { recursive: true });
      fs.writeFileSync(local, JSON.stringify(body));
      return { rec: marksToLocal(body.data || body), from: "api" };
    } catch (e) {
      await sleep(800 + i * 800);
    }
  }
  return { rec: null, from: "fail" };
}

function applyRec(q, rec) {
  if (!rec) return false;
  let ch = false;
  const oldStem = String(q.q || q.question || "");
  if (rec.q && (strip(rec.q).length > strip(oldStem).length || (/<img/i.test(rec.q) && !/<img/i.test(oldStem)))) {
    q.q = rec.q; q.question = rec.q; ch = true;
  }
  if (optScore(rec.options) > optScore(q.options)) {
    q.options = rec.options; ch = true;
  }
  if (rec.answer != null && (q.answer == null || q._needsAnswerKey)) {
    q.answer = rec.answer; delete q._needsAnswerKey; ch = true;
  }
  if (rec.correctValue != null && q.correctValue == null) {
    q.correctValue = rec.correctValue;
    if (q.answer == null) q.answer = rec.correctValue;
    delete q._needsAnswerKey;
    ch = true;
  }
  if (rec.solution && strip(rec.solution).length > strip(q.solution || "").length + 8) {
    q.solution = rec.solution; q.explanation = rec.solution; ch = true;
  }
  return ch;
}

(async () => {
  const cfg = load(path.join(ROOT, "data", "marks_config.json"), {});
  const { ids, files } = collect();
  console.log("leftover with marksId", ids.length, "files", files.length);
  const map = {};
  let api = 0, cache = 0, miss = 0;
  for (let i = 0; i < ids.length; i++) {
    const r = await fetchOne(ids[i], cfg.token);
    if (r.rec) { map[ids[i]] = r.rec; if (r.from === "api") api++; else cache++; }
    else miss++;
    if ((i + 1) % 25 === 0 || i === ids.length - 1) {
      console.log("  fetch", i + 1, "/", ids.length, "api", api, "cache", cache, "miss", miss);
    }
    if (r.from === "api") await sleep(350);
  }
  const stats = { files: 0, qs: 0 };
  files.forEach((p) => {
    const j = load(p, null);
    const arr = Array.isArray(j);
    const qs = arr ? j : (j && j.questions) || [];
    let ch = false;
    qs.forEach((q) => {
      if (!leftoverWhy(q).length || !q._marksId) return;
      if (applyRec(q, map[String(q._marksId)])) { stats.qs++; ch = true; }
    });
    if (ch) {
      if (arr) fs.writeFileSync(p, JSON.stringify(qs));
      else { j.questions = qs; fs.writeFileSync(p, JSON.stringify(j)); }
      stats.files++;
    }
  });
  const left = collect();
  const report = { fetched: ids.length, api, cache, miss, appliedQs: stats.qs, files: stats.files, stillLeftoverIds: left.ids.length };
  fs.writeFileSync(path.join(ROOT, "data", "_migration", "proofread_marks_leftover.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})();
