#!/usr/bin/env node
/** Put every bank question back into chapter folders (Marks-style Medical + Engineering). */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const META = path.join(ROOT, "data", "nav", "chapter_meta");
const BANKS = path.join(ROOT, "data", "banks");

const EXAMS = [
  "neet", "aiims", "jipmer", "nta_abhyas_neet", "mht_cet_medical",
  "jee_main", "jee_advanced", "nta_abhyas_jee_main", "mht_cet",
  "bitsat", "wbjee", "kcet", "comedk", "ap_eamcet", "ts_eamcet",
  "viteee", "kvpy", "manipal_met", "nest_niser", "iat_iiser", "nda"
];

function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function subjectFolder(sub) {
  const s = String(sub || "").trim();
  if (/botany/i.test(s)) return "Botany";
  if (/zoology/i.test(s)) return "Zoology";
  if (/biology/i.test(s)) return "Biology";
  if (/chem/i.test(s)) return "Chemistry";
  if (/math/i.test(s)) return "Mathematics";
  if (/physics/i.test(s)) return "Physics";
  if (/english|general/i.test(s)) return "General Ability";
  return s || "Other";
}

function collectMetaIds(exam) {
  const set = new Set();
  const root = path.join(META, exam);
  if (!fs.existsSync(root)) return set;
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name);
      if (fs.statSync(abs).isDirectory()) { walk(abs); continue; }
      if (!name.endsWith(".json")) continue;
      let j;
      try { j = JSON.parse(fs.readFileSync(abs, "utf8")); } catch (_) { continue; }
      const add = (id) => { if (id != null && id !== "") set.add(String(id)); };
      (j.questionIds || []).forEach(add);
      (j.topics || []).forEach((t) => (t.questionIds || []).forEach(add));
      (j.buckets || []).forEach((b) => (b.questionIds || []).forEach(add));
    }
  };
  walk(root);
  return set;
}

function ensureChapterFile(exam, subject, chapter) {
  const folder = path.join(META, exam, subjectFolder(subject));
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, slugify(chapter) + ".json");
  if (fs.existsSync(file)) {
    try { return { file, data: JSON.parse(fs.readFileSync(file, "utf8")) }; }
    catch (_) { /* recreate */ }
  }
  return {
    file,
    data: {
      examSlug: exam,
      subject,
      chapter,
      buckets: [],
      topics: []
    }
  };
}

const report = [];
for (const exam of EXAMS) {
  const bankFile = path.join(BANKS, exam + ".json");
  if (!fs.existsSync(bankFile)) {
    report.push({ exam, skip: "no bank" });
    continue;
  }
  const bank = JSON.parse(fs.readFileSync(bankFile, "utf8"));
  const qs = bank.questions || [];
  const have = collectMetaIds(exam);
  const addByChapter = new Map();
  let already = 0;
  for (const q of qs) {
    const ids = [q.id, q._marksId].filter((x) => x != null && String(x) !== "").map(String);
    if (ids.some((id) => have.has(id))) { already++; continue; }
    const sub = subjectFolder(q.subject || "Other");
    const ch = String(q.chapter || "Uncategorized").trim() || "Uncategorized";
    const key = sub + "\0" + ch;
    if (!addByChapter.has(key)) addByChapter.set(key, { subject: sub, chapter: ch, ids: [] });
    addByChapter.get(key).ids.push(String(q._marksId || q.id));
    ids.forEach((id) => have.add(id));
  }
  let added = 0;
  for (const { subject, chapter, ids } of addByChapter.values()) {
    const { file, data } = ensureChapterFile(exam, subject, chapter);
    if (!Array.isArray(data.topics)) data.topics = [];
    let topic = data.topics.find((t) => t && /all questions|more pyq|full bank/i.test(t.title || ""));
    if (!topic) {
      topic = { id: "all_" + slugify(chapter), title: "All Questions", count: 0, questionIds: [] };
      data.topics.push(topic);
    }
    if (!Array.isArray(topic.questionIds)) topic.questionIds = [];
    const seen = new Set(topic.questionIds.map(String));
    for (const id of ids) {
      if (seen.has(id)) continue;
      topic.questionIds.push(id);
      seen.add(id);
      added++;
    }
    topic.count = topic.questionIds.length;
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }
  report.push({ exam, bank: qs.length, alreadyInFolders: already, addedToFolders: added, chaptersTouched: addByChapter.size });
}

const cpyqbPath = path.join(ROOT, "data", "nav", "cpyqb.json");
if (fs.existsSync(cpyqbPath)) {
  const cpyqb = JSON.parse(fs.readFileSync(cpyqbPath, "utf8"));
  const list = Array.isArray(cpyqb) ? cpyqb : cpyqb.exams || [];
  for (const e of list) {
    const row = report.find((r) => r.exam === e.slug);
    if (row && row.bank) e.count = row.bank;
  }
  fs.writeFileSync(cpyqbPath, JSON.stringify(cpyqb));
}

fs.mkdirSync(path.join(ROOT, "data", "_migration"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "data", "_migration", "folder_restore_report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
