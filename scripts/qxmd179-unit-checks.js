#!/usr/bin/env node
/** qxmd179 — Eng/Med Digital Books split, count badges, no Eng-only in Med, Med MIPYQ ≠ Eng pack. */
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("PASS —", name); }
  else { fail++; console.log("FAIL —", name, detail ? String(detail).slice(0, 240) : ""); }
}

const ver = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const html = fs.readFileSync(path.join(root, "app.html"), "utf8");
const mf = fs.readFileSync(path.join(root, "marks-features.js"), "utf8");
const covers = fs.readFileSync(path.join(root, "book-covers.js"), "utf8");
const dataSrc = fs.readFileSync(path.join(root, "data.js"), "utf8");
const books = JSON.parse(fs.readFileSync(path.join(root, "data/books.json"), "utf8"));

check("build qxmd179", ver.build === "qxmd179" && /qxmd179/.test(sw) && /QX_BUILD = "qxmd179"/.test(html));
check("cache qx-pwa-qxmd179", ver.cache === "qx-pwa-qxmd179");
check("bust books UI scripts", /book-covers\.js\?v=qxmd179/.test(html) && /marks-features\.js\?v=qxmd179/.test(html) && /data\.js\?v=qxmd179/.test(html));

const engOnlyIds = [
  "68f1ce4cc729e5251bd00430", // Rank Booster
  "6894d29d3156b1f3ca5ad0be", // Backlog
  "69048808ef55966cf1d71f1d", // Olympiad
  "69736c8362b916d85e52cd1b", // BITSAT Eng
  "68946f70ebd145663de38728", // 99 Percentile JEE
  "6a91185f41ab5aba084f4d30"  // Eng MIPYQ
];
const medIds = (books.medical || []).map((b) => b.id);
for (const id of engOnlyIds) {
  check("medical has no eng-only id " + id.slice(0, 8), !medIds.includes(id));
}
check("embedded medical has no Eng MIPYQ id", !/medical:\s*\[[\s\S]*?id:\s*"6a91185f41ab5aba084f4d30"/.test(mf));
check("mergeBooksCatalog remote-authoritative", /qxmd179: when remote stream list exists/.test(mf));

const engMipyq = (books.engineering || []).find((b) => b.id === "6a91185f41ab5aba084f4d30");
check("Eng MIPYQ present with local count ≥4200", !!(engMipyq && engMipyq.count >= 4200));
check("Eng MIPYQ badge 4200+", !!(engMipyq && /4200\+/.test(engMipyq.countBadge || "")));

const medMipyq = (books.medical || []).find((b) => /Most Important PYQ/i.test(b.title || ""));
check("Med MIPYQ distinct id (not Eng)", !!(medMipyq && medMipyq.id !== "6a91185f41ab5aba084f4d30"));
check("Med MIPYQ badge 4941", !!(medMipyq && /4941/.test(medMipyq.countBadge || medMipyq.marksBadge || "")));
check("Med MIPYQ not wired to Eng bankSlug jee_main openable pack", !!(medMipyq && (medMipyq.isComingSoon || medMipyq.bankSlug !== "jee_main")));
check("Med MIPYQ coming-soon until local NEET pack", !!(medMipyq && medMipyq.isComingSoon === true));

check("PhysChem Eng catalog entry", (books.engineering || []).some((b) => /Physical Chemistry/i.test(b.title) && /JEE/i.test(b.title)));
check("PhysChem Med catalog entry", (books.medical || []).some((b) => /Physical Chemistry/i.test(b.title) && /NEET/i.test(b.title)));

check("Med titles Organic NEET", (books.medical || []).some((b) => /Organic/i.test(b.title) && /NEET/i.test(b.title)));
check("Eng titles Organic JEE", (books.engineering || []).some((b) => /Organic/i.test(b.title) && /JEE/i.test(b.title)));
check("Top 500 NEET stays in Med", (books.medical || []).filter((b) => /Top 500/i.test(b.title)).length >= 2);

check("count badge helper", /function bookCountBadgeText/.test(covers));
check("yellow cover badge CSS", /qx-photo-qbadge/.test(html) && /#facc15/.test(html));
check("every active eng book with count has countBadge or count", (books.engineering || []).filter((b) => !b.isComingSoon).every((b) => b.count > 0 && (b.countBadge || b.count)));
check("every listed med book shows badge text when count known", (books.medical || []).filter((b) => b.count > 0).every((b) => b.countBadge || b.marksBadge));

// Aliases kept
const aliases = {
  "6a507da9107f81233d9985c1": "6a4ce383c59a7b462185330f",
  "6a0adb714b032b031e049a34": "6a0addba4b032b031e049a36",
  "69cfb4af611e9b07b5d55e79": "69cfb5366ecf5579037d96a4",
  "69f9ccfa011347df7bce2a38": "69f9cc23681eab6d6021a4d1"
};
for (const [med, eng] of Object.entries(aliases)) {
  check("alias map " + med.slice(0, 8), new RegExp('"' + med + '"\\s*:\\s*"' + eng + '"').test(dataSrc));
}

check("recommended Eng Marks order PhysChem+MIPYQ+HCV2", /engRecIds = \["qx_physchem_jee_2027", "6a91185f41ab5aba084f4d30", "6a0addba4b032b031e049a36"\]/.test(mf));
check("recommended Med Marks order PhysChem+MIPYQ+HCV2", /recIds = \["qx_physchem_neet_2027", "qx_mipyq_neet_2027", "6a0adb714b032b031e049a34"\]/.test(mf));

check("Quantrex branding (no Marks UI title)", /Quantrex Digital Books/.test(books.title || "") && !/\bMarks\b/.test(books.title || ""));
check("no Marks in catalog titles", !(books.engineering || []).concat(books.medical || []).some((b) => /\bMarks\b/i.test(b.title || "")));

// Local Eng MIPYQ chapter count sanity
const chapDir = path.join(root, "data/books/chapters/6a91185f41ab5aba084f4d30");
let localSum = 0;
if (fs.existsSync(chapDir)) {
  for (const f of fs.readdirSync(chapDir)) {
    if (!f.endsWith(".json")) continue;
    try {
      const d = JSON.parse(fs.readFileSync(path.join(chapDir, f), "utf8"));
      localSum += (d.questions || []).length;
    } catch (_) {}
  }
}
check("Eng MIPYQ local pack count 4289", localSum === 4289, localSum);

console.log("\nTOTAL:", pass, "pass /", fail, "fail");
process.exit(fail ? 1 : 0);
