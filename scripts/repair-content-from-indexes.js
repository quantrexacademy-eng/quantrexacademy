#!/usr/bin/env node
/**
 * Restore Quantrex content from existing local sources only.
 * Never invents stems, options, figures, or solutions.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const proof = require("../lib/qx-proofread");

function load(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function strip(s) {
  return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function hasImg(s) {
  return /<img\b/i.test(String(s || ""));
}
function stemKey(s) {
  return strip(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 70);
}
function optScore(opts) {
  if (!Array.isArray(opts) || !opts.length) return 0;
  let n = 0;
  opts.forEach((o) => {
    const raw = String(o || "");
    const t = strip(raw);
    if (hasImg(raw)) n += 8;
    else if (t && !/^[A-D]$/i.test(t)) n += Math.min(6, 1 + Math.floor(t.length / 12));
  });
  return n;
}
function optsGood(opts) {
  return optScore(opts) >= 4;
}
function isLetterOrEmpty(opts) {
  if (!Array.isArray(opts) || opts.length < 2) return true;
  return !optsGood(opts);
}
function solScore(s) {
  const t = strip(s);
  if (!t || /^no solution/i.test(t)) return 0;
  return t.length + (hasImg(s) ? 80 : 0);
}
function stemScore(html) {
  const s = String(html || "");
  let n = strip(s).length;
  if (hasImg(s)) n += 80;
  if (/<table/i.test(s)) n += 40;
  if (/List[\s\-]*II/i.test(s)) n += 20;
  if (/\\begin\{array/i.test(s)) n += 20;
  return n;
}
function isGenericStem(stem) {
  const t = strip(stem);
  if (t.length < 80) return true;
  return /^(which of the following|which one of the following|which one feature|match the following|match list|match the columns|consider the following|the correct (option|statement|answer)|assertion\s*:|reason\s*:)/i.test(t);
}

function imgHtml(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  return '<img src="' + u.replace(/"/g, "&quot;") + '"><br>';
}

function fromQidMarks(rec) {
  if (!rec) return null;
  const d = rec.data || rec;
  const qt = d.question || {};
  let q = String(qt.text || "");
  if (qt.image) q += (q ? "\n" : "") + imgHtml(qt.image);
  const opts = Array.isArray(d.options)
    ? d.options.map((o) => {
        let t = String((o && o.text) || "").trim();
        if (o && o.image) t += (t ? "\n" : "") + imgHtml(o.image);
        return t;
      })
    : [];
  let ans = d.correctValue;
  if (ans == null && Array.isArray(d.options)) {
    const i = d.options.findIndex((o) => o && o.isCorrect);
    if (i >= 0) ans = i;
  }
  const sol = (d.solution && (d.solution.text || d.solution.html)) || "";
  return { q, options: opts, answer: ans, correctValue: d.correctValue, solution: sol, type: d.type || "" };
}

function walkFiles(dir, pred, acc) {
  if (!fs.existsSync(dir)) return acc;
  fs.readdirSync(dir).forEach((name) => {
    const p = path.join(dir, name);
    let st;
    try { st = fs.statSync(p); } catch (_) { return; }
    if (st.isDirectory()) walkFiles(p, pred, acc);
    else if (pred(name, p)) acc.push(p);
  });
  return acc;
}

function questionsOf(data) {
  if (!data || typeof data !== "object") return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.questions)) return data.questions;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

const stats = {
  files: 0,
  written: 0,
  qs: 0,
  host: 0,
  latex: 0,
  stemFromBank: 0,
  optFromBank: 0,
  optFromFig: 0,
  optFromMarks: 0,
  stemFromMarks: 0,
  matchFromIdx: 0,
  solFromBank: 0,
  solFromMarks: 0,
  rfcCopied: 0
};

function applyProof(s) {
  const before = String(s == null ? "" : s);
  const after = proof.proofreadHtml(before);
  if (after !== before) {
    if (/https?:\/\/\.app\/|cdn-question-pool\.app\//i.test(before)) stats.host++;
    else stats.latex++;
  }
  return after;
}

function applyToQuestion(q, ctx) {
  if (!q || typeof q !== "object") return false;
  let changed = false;
  const beforeQ = q.q || q.question || "";
  if (q.q != null) {
    const n = applyProof(q.q);
    if (n !== q.q) { q.q = n; changed = true; }
  }
  if (q.question != null) {
    const n = applyProof(q.question);
    if (n !== q.question) { q.question = n; changed = true; }
  }
  if (q.questionText != null) {
    const n = applyProof(q.questionText);
    if (n !== q.questionText) { q.questionText = n; changed = true; }
  }
  if (Array.isArray(q.options)) {
    q.options = q.options.map((o) => {
      const n = applyProof(o);
      if (n !== o) changed = true;
      return n;
    });
  }
  if (q.solution != null) {
    const n = applyProof(q.solution);
    if (n !== q.solution) { q.solution = n; changed = true; }
  }
  if (q.explanation != null) {
    const n = applyProof(q.explanation);
    if (n !== q.explanation) { q.explanation = n; changed = true; }
  }

  const mid = q._marksId ? String(q._marksId) : "";
  const id = q.id != null ? String(q.id) : "";

  // qid_marks restore
  if (mid && ctx.qid[mid]) {
    const rec = ctx.qid[mid];
    if (stemScore(rec.q) > stemScore(q.q || q.question) + 10) {
      if (q.q != null) q.q = rec.q;
      else q.question = rec.q;
      stats.stemFromMarks++;
      changed = true;
    }
    if (optsGood(rec.options) && isLetterOrEmpty(q.options)) {
      q.options = rec.options.slice();
      if (rec.answer != null) q.answer = rec.answer;
      if (rec.correctValue != null && q.correctValue == null) q.correctValue = rec.correctValue;
      stats.optFromMarks++;
      changed = true;
    }
    if (solScore(rec.solution) > solScore(q.solution) + 20) {
      q.solution = rec.solution;
      stats.solFromMarks++;
      changed = true;
    }
  }

  // match-stem index (richer table)
  const mrec = (id && ctx.match[id]) || (mid && ctx.match[mid]) || null;
  if (mrec && mrec.q) {
    if (stemScore(mrec.q) > stemScore(q.q || q.question) + 20) {
      if (q.q != null) q.q = mrec.q;
      else q.question = mrec.q;
      stats.matchFromIdx++;
      changed = true;
    }
    if (Array.isArray(mrec.o) && optsGood(mrec.o) && isLetterOrEmpty(q.options)) {
      q.options = mrec.o.slice();
      if (mrec.a != null) q.answer = mrec.a;
      changed = true;
    }
  }

  // option figures from index
  const frec = (id && ctx.optfig[id]) || (mid && ctx.optfig[mid]) || null;
  if (frec && Array.isArray(frec.o) && frec.o.some(Boolean)) {
    const next = Array.isArray(q.options) ? q.options.slice() : ["", "", "", ""];
    let hit = false;
    frec.o.forEach((u, i) => {
      if (!u) return;
      const cur = next[i];
      if (isLetterOrEmpty([cur]) || !String(cur || "").trim()) {
        next[i] = imgHtml(applyProof(u));
        hit = true;
      }
    });
    if (hit) {
      q.options = next;
      stats.optFromFig++;
      changed = true;
    }
  }

  // Exact unique-stem restore only (never generic "which of the following" collisions)
  const curHtml = String(q.q || q.question || "");
  const fullStem = strip(curHtml);
  const donor = (!isGenericStem(curHtml) && fullStem.length >= 80) ? ctx.byFullStem[fullStem.toLowerCase()] : null;
  if (donor && donor !== q) {
    if (isLetterOrEmpty(q.options) && optsGood(donor.options)) {
      q.options = donor.options.slice();
      if (donor.answer != null) q.answer = donor.answer;
      if (donor.answers) q.answers = donor.answers;
      if (donor.correctValue != null && q.correctValue == null) q.correctValue = donor.correctValue;
      stats.optFromBank++;
      changed = true;
    }
    if (!hasImg(curHtml) && hasImg(donor.q) && strip(donor.q).toLowerCase() === fullStem.toLowerCase()) {
      if (q.q != null) q.q = donor.q;
      else q.question = donor.q;
      stats.stemFromBank++;
      changed = true;
    }
    if (solScore(q.solution) < 20 && solScore(donor.solution) > 60
      && strip(donor.q || donor.question).toLowerCase() === fullStem.toLowerCase()) {
      q.solution = donor.solution;
      stats.solFromBank++;
      changed = true;
    }
  }

  return changed;
}

function processFile(abs, ctx) {
  let data;
  try { data = load(abs); } catch (_) { return; }
  const qs = questionsOf(data);
  if (!qs.length && data && typeof data === "object" && !Array.isArray(data)) {
    // formulas / rfc cards
    const cards = data.cards || data.flashcards || data.formulas;
    if (Array.isArray(cards)) {
      let ch = false;
      cards.forEach((c) => {
        ["html", "formula", "front", "back", "q", "a", "text"].forEach((k) => {
          if (c && c[k] != null) {
            const n = applyProof(c[k]);
            if (n !== c[k]) { c[k] = n; ch = true; }
          }
        });
      });
      if (ch) {
        fs.writeFileSync(abs, JSON.stringify(data));
        stats.written++;
      }
      stats.files++;
      return;
    }
    if (Array.isArray(data) === false && typeof data.formula === "string") {
      const n = applyProof(data.formula);
      if (n !== data.formula) {
        data.formula = n;
        fs.writeFileSync(abs, JSON.stringify(data));
        stats.written++;
      }
    }
  }
  if (!qs.length) {
    stats.files++;
    return;
  }
  let ch = false;
  qs.forEach((q) => {
    stats.qs++;
    if (applyToQuestion(q, ctx)) ch = true;
  });
  if (ch) {
    fs.writeFileSync(abs, JSON.stringify(data));
    stats.written++;
  }
  stats.files++;
}

function copyRfcAliases() {
  const dir = path.join(ROOT, "data", "rfc_offline", "chapters");
  const pairs = [
    ["chemistry_p_block_elements_group_13_14.json", "chemistry_p_block_elements_group_13_and_14.json"],
    ["chemistry_p_block_elements_group_15_16_17_18.json", "chemistry_p_block_elements_group_15_16_17_and_18.json"],
    ["mathematics_trigonometric_ratios_identities.json", "mathematics_trigonometric_ratios_and_identities.json"]
  ];
  pairs.forEach(([src, dest]) => {
    const a = path.join(dir, src);
    const b = path.join(dir, dest);
    if (fs.existsSync(a) && !fs.existsSync(b)) {
      fs.copyFileSync(a, b);
      stats.rfcCopied++;
    }
  });
}

function main() {
  console.log("Loading indexes…");
  const matchJ = load(path.join(ROOT, "data", "qx_match_stems.json"));
  const match = (matchJ && matchJ.map) || {};
  const optfig = load(path.join(ROOT, "data", "qx_opt_fig_index.json"));

  const qid = Object.create(null);
  const qidDir = path.join(ROOT, "data", "qid_marks");
  fs.readdirSync(qidDir).filter((f) => f.endsWith(".json")).forEach((f) => {
    try {
      const rec = fromQidMarks(load(path.join(qidDir, f)));
      if (rec) {
        rec.q = applyProof(rec.q);
        rec.options = rec.options.map(applyProof);
        rec.solution = applyProof(rec.solution);
        qid[f.replace(/\.json$/, "")] = rec;
      }
    } catch (_) { /* skip */ }
  });

  const byFullStem = Object.create(null);
  const bankDir = path.join(ROOT, "data", "banks");
  const bankFiles = fs.readdirSync(bankDir).filter((f) => f.endsWith(".json") && !f.includes(".bak"));
  bankFiles.forEach((f) => {
    const qs = (load(path.join(bankDir, f)).questions || []);
    qs.forEach((q) => {
      const full = strip(q.q || q.question);
      if (isGenericStem(full)) return;
      const k = full.toLowerCase();
      const cur = byFullStem[k];
      const score = optScore(q.options) * 10 + stemScore(q.q || q.question) + solScore(q.solution) / 20;
      const curScore = cur ? optScore(cur.options) * 10 + stemScore(cur.q || cur.question) + solScore(cur.solution) / 20 : -1;
      if (!cur || score > curScore) byFullStem[k] = q;
    });
  });
  Object.keys(qid).forEach((id) => {
    const rec = qid[id];
    const full = strip(rec.q);
    if (isGenericStem(full)) return;
    const k = full.toLowerCase();
    const cur = byFullStem[k];
    if (!cur || optScore(rec.options) > optScore(cur.options)) {
      byFullStem[k] = { q: rec.q, options: rec.options, answer: rec.answer, solution: rec.solution, correctValue: rec.correctValue };
    }
  });

  const ctx = { match, optfig, qid, byFullStem };
  console.log(JSON.stringify({
    matchKeys: Object.keys(match).length,
    optfigKeys: Object.keys(optfig).length,
    qidKeys: Object.keys(qid).length,
    fullStemKeys: Object.keys(byFullStem).length
  }));

  console.log("RFC aliases…");
  copyRfcAliases();

  console.log("Repairing banks…");
  bankFiles.forEach((f) => processFile(path.join(bankDir, f), ctx));

  console.log("Repairing books…");
  walkFiles(path.join(ROOT, "data", "books", "chapters"), (n) => n.endsWith(".json"), [])
    .forEach((p) => processFile(p, ctx));

  console.log("Repairing tests…");
  walkFiles(path.join(ROOT, "data", "tests"), (n) => n.endsWith(".json") && !n.startsWith("_"), [])
    .forEach((p) => processFile(p, ctx));

  console.log("Repairing formulas / RFC / offline packs…");
  const extra = [];
  extra.push(path.join(ROOT, "data", "formulas.json"));
  walkFiles(path.join(ROOT, "data", "rfc_offline"), (n) => n.endsWith(".json"), extra);
  walkFiles(path.join(ROOT, "data", "ncert_offline"), (n) => n.endsWith(".json"), extra);
  walkFiles(path.join(ROOT, "data", "board_offline"), (n) => n.endsWith(".json"), extra);
  walkFiles(path.join(ROOT, "data", "board_hsc_offline"), (n) => n.endsWith(".json"), extra);
  extra.forEach((p) => {
    if (!fs.existsSync(p)) return;
    // formulas.json is a flat array of formula objects
    if (path.basename(p) === "formulas.json") {
      let data;
      try { data = load(p); } catch (_) { return; }
      const arr = Array.isArray(data) ? data : (data.formulas || []);
      let ch = false;
      arr.forEach((f) => {
        ["formula", "html", "text"].forEach((k) => {
          if (f && f[k] != null) {
            const n = applyProof(f[k]);
            if (n !== f[k]) { f[k] = n; ch = true; }
          }
        });
      });
      if (ch) {
        fs.writeFileSync(p, JSON.stringify(data));
        stats.written++;
      }
      stats.files++;
      return;
    }
    processFile(p, ctx);
  });

  const out = path.join(ROOT, "data", "_migration", "repair_from_indexes.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), stats }, null, 2));
  console.log(JSON.stringify(stats, null, 2));
}

main();
