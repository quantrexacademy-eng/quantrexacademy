#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const { convertHtml } = require("./_qx_mathml");
const ROOT = path.resolve(__dirname, "..");
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "marks_config.json"), "utf8"));
const TOK = cfg.token;
const BASE = "https://production.getmarks.app";
const MARKS_DIR = path.join(ROOT, "data", "qid_marks");
const BOOKS = [
  {
    stream: "Engineering",
    examId: "6a7db25c02198edab586feff",
    moduleId: "6aa93b7f25c310c04441e9a2",
    title: "Physical Chemistry for JEE Main 2027",
    exam: "JEE Main 2027",
    cover: "assets/book-covers/physical-chemistry-jee.svg"
  },
  {
    stream: "Medical",
    examId: "6aa934f6b8c05657c7be7531",
    moduleId: "6aa93b7f25c310c04441f844",
    title: "Physical Chemistry for NEET 2027",
    exam: "NEET",
    cover: "assets/book-covers/physical-chemistry-neet.svg"
  },
  {
    stream: "Medical",
    examId: "6a9158833d351af582b98369",
    moduleId: "6a9161f1a69a205613f39f1b",
    title: "Most Important PYQ Based Questions",
    exam: "NEET 2027",
    cover: "assets/book-covers/qx-pyq-important.jpg"
  }
];

function fmt(s) {
  let t = String(s == null ? "" : s);
  if (!t) return t;
  t = convertHtml(t).html;
  t = t.replace(/cdn-question-pool\.\.+app/gi, "cdn-question-pool.getmarks.app");
  t = t.replace(/&nbsp;/gi, " ");
  t = t.replace(/\$([^$]+)\$/g, (all, inner) => {
    if (/\\begin\{(?:array|align|aligned|matrix)/.test(inner)) return all;
    if (!/&/.test(inner)) return all;
    return "$" + inner.replace(/&(?![a-zA-Z#])/g, " \\text{ and } ") + "$";
  });
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

function titleOf(obj) {
  if (!obj) return "";
  if (Array.isArray(obj.titles) && obj.titles[0]) return String(obj.titles[0]);
  return String(obj.title || obj.name || "");
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function api(p, query) {
  const u = BASE + p + (query ? ("?" + new URLSearchParams(query)) : "");
  for (let attempt = 0; attempt < 8; attempt++) {
    const r = await fetch(u, {
      headers: {
        Authorization: "Bearer " + TOK,
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
        Origin: "https://web.getmarks.app",
        Referer: "https://web.getmarks.app/"
      }
    });
    const json = await r.json().catch(() => ({}));
    if (r.status === 429 || r.status === 503) {
      const wait = 1500 * (attempt + 1);
      console.log("  backoff", r.status, wait + "ms", p.slice(-60));
      await sleep(wait);
      continue;
    }
    return { status: r.status, json };
  }
  return { status: 429, json: { message: "rate limited" } };
}

async function poolMap(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  const n = Math.min(limit, items.length) || 1;
  await Promise.all(Array.from({ length: n }, worker));
  return out;
}

function loadCache(id) {
  const fp = path.join(MARKS_DIR, id + ".json");
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, "utf8")); } catch (_) { return null; }
}

function saveCache(id, raw) {
  try {
    if (!fs.existsSync(MARKS_DIR)) fs.mkdirSync(MARKS_DIR, { recursive: true });
    fs.writeFileSync(path.join(MARKS_DIR, id + ".json"), JSON.stringify(raw), "utf8");
  } catch (_) { /* */ }
}

async function listChapterQuestions(examId, moduleId, sid, cid) {
  const out = [];
  let offset = 0;
  for (;;) {
    const r = await api(
      `/api/v4/marks-selected/exam/${examId}/module/${moduleId}/subjects/${sid}/chapters/${cid}`,
      { status: "all", offset: String(offset), limit: "50", platform: "web", isShowAllQs: "true" }
    );
    if (r.status !== 200) break;
    const data = r.json.data || {};
    const block = data.questions || {};
    const qs = Array.isArray(block.questions) ? block.questions : (Array.isArray(block) ? block : []);
    if (!qs.length) break;
    out.push.apply(out, qs);
    const total = typeof block.total === "number" ? block.total : null;
    offset += qs.length;
    if (total != null && offset >= total) break;
    if (qs.length < 50) break;
  }
  return out;
}

async function fullQuestion(id) {
  const cached = loadCache(id);
  if (cached) {
    const rec = recFrom(cached);
    if (rec && rec.q) return rec;
  }
  const r = await api("/api/v1/questions/" + encodeURIComponent(id));
  if (r.status === 200 && r.json) {
    saveCache(id, r.json);
    return recFrom(r.json);
  }
  return null;
}

async function extractBook(book) {
  console.log("\n====", book.stream, book.title, book.examId);
  const subR = await api(`/api/v4/marks-selected/exam/${book.examId}/module/${book.moduleId}/subjects`, { platform: "web" });
  if (subR.status !== 200) {
    console.log("SUBJECTS FAIL", subR.status, subR.json && (subR.json.message || (subR.json.error && subR.json.error.message)));
    return { ok: false };
  }
  const pack = subR.json.data || {};
  const subs = (pack.subjects && pack.subjects.subjects) || pack.subjects || [];
  const moduleId = (pack.module && (pack.module.id || pack.module._id)) || book.moduleId;
  console.log("subjects", subs.length, "module", moduleId);

  const navSubjects = [];
  let totalQ = 0;
  const chDir = path.join(ROOT, "data", "books", "chapters", book.examId);
  fs.mkdirSync(chDir, { recursive: true });

  for (const s of subs) {
    const sid = s._id || s.id;
    const sname = titleOf(s) || s.title || "Subject";
    const chR = await api(
      `/api/v4/marks-selected/exam/${book.examId}/module/${book.moduleId}/subjects/${sid}/chapters`,
      { platform: "web" }
    );
    let chs = [];
    if (chR.status === 200) {
      const cd = chR.json.data || {};
      chs = cd.chapters || [];
      if (chs && chs.chapters) chs = chs.chapters;
    }
    chs = (chs || []).slice().sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));
    console.log(" ", sname, "chapters", chs.length);
    const navChs = [];
    for (const ch of chs) {
      const cid = ch._id || ch.id;
      const cname = titleOf(ch) || ch.title || "Chapter";
      const pos = Number(ch.position);
      const key = book.examId + "__" + book.moduleId + "__" + sid + "__" + cid;
      const existingFp = path.join(chDir, key + ".json");
      if (fs.existsSync(existingFp)) {
        try {
          const ex = JSON.parse(fs.readFileSync(existingFp, "utf8"));
          if (Array.isArray(ex.questions) && ex.questions.length) {
            console.log("   skip", cname, ex.questions.length);
            navChs.push({
              id: cid,
              name: cname,
              count: ex.questions.length,
              position: Number.isFinite(pos) ? pos : navChs.length,
              key
            });
            totalQ += ex.questions.length;
            continue;
          }
        } catch (_) { /* rewrite */ }
      }
      await sleep(250);
      const listed = await listChapterQuestions(book.examId, book.moduleId, sid, cid);
      const ids = listed.map((q) => q._id || q.id || q.questionId).filter(Boolean);
      console.log("   ", (Number.isFinite(pos) ? pos : "?"), cname, "listed", ids.length);
      const recs = await poolMap(ids, 6, async (id, idx) => {
        const rec = await fullQuestion(id);
        if (!rec) {
          return {
            id,
            _marksId: id,
            subject: sname,
            chapter: cname,
            exam: book.exam,
            q: "",
            options: [],
            answer: null,
            solution: "",
            _book: book.examId,
            _bookId: book.examId,
            _chapterKey: key,
            _order: idx
          };
        }
        return {
          id,
          _marksId: id,
          subject: sname,
          chapter: cname,
          exam: book.exam,
          examName: book.title,
          q: rec.q,
          question: rec.q,
          options: rec.options,
          answer: rec.answer,
          solution: rec.solution,
          explanation: rec.solution,
          source: book.title,
          type: "singleCorrect",
          _book: book.examId,
          _bookId: book.examId,
          _chapterKey: key,
          _order: idx
        };
      });
      const questions = recs.filter(Boolean);
      const payload = {
        bookId: book.examId,
        moduleId: book.moduleId,
        subjectId: sid,
        chapterId: cid,
        subject: sname,
        chapter: cname,
        position: Number.isFinite(pos) ? pos : navChs.length,
        count: questions.length,
        questions
      };
      fs.writeFileSync(path.join(chDir, key + ".json"), JSON.stringify(payload), "utf8");
      navChs.push({
        id: cid,
        name: cname,
        count: questions.length,
        position: Number.isFinite(pos) ? pos : navChs.length,
        key
      });
      totalQ += questions.length;
    }
    navSubjects.push({
      id: sid,
      name: sname,
      count: navChs.reduce((n, c) => n + (c.count || 0), 0),
      position: Number(s.position) || navSubjects.length,
      chapters: navChs
    });
  }

  const nav = {
    id: book.examId,
    title: book.title,
    type: "exam",
    exam: book.exam,
    banner: book.cover,
    redirectType: "subject",
    count: totalQ,
    stream: book.stream,
    modules: [
      {
        id: book.moduleId,
        title: book.title,
        count: totalQ,
        subjects: navSubjects
      }
    ]
  };
  const navDir = path.join(ROOT, "data", "nav", "books");
  fs.mkdirSync(navDir, { recursive: true });
  fs.writeFileSync(path.join(navDir, book.examId + ".json"), JSON.stringify(nav, null, 2), "utf8");
  console.log("WROTE", book.examId, "totalQ", totalQ, "subjects", navSubjects.length);
  return { ok: true, totalQ, subjects: navSubjects.length };
}

(async () => {
  const summary = [];
  for (const b of BOOKS) {
    try {
      summary.push(Object.assign({ title: b.title, examId: b.examId }, await extractBook(b)));
    } catch (e) {
      console.error("FAIL", b.title, e);
      summary.push({ title: b.title, examId: b.examId, ok: false, error: String(e.message || e) });
    }
  }
  fs.writeFileSync(
    path.join(ROOT, "data", "_marks_probe", "missing_books", "extract_summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8"
  );
  console.log("\nSUMMARY", JSON.stringify(summary, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
