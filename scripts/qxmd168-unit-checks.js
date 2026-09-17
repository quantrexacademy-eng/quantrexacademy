#!/usr/bin/env node
/** qxmd168 — Digital Books load: catalog, chapters, caches, figures, letter-only. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("PASS —", name); }
  else { fail++; console.log("FAIL —", name, detail ? String(detail).slice(0, 220) : ""); }
}

const books = JSON.parse(fs.readFileSync(path.join(root, "data/books.json"), "utf8"));
const navDir = path.join(root, "data/nav/books");
const chDir = path.join(root, "data/books/chapters");
const ALIAS = {
  "69f9ccfa011347df7bce2a38": "69f9cc23681eab6d6021a4d1",
  "6a0adb714b032b031e049a34": "6a0addba4b032b031e049a36",
  "6a507da9107f81233d9985c1": "6a4ce383c59a7b462185330f",
  "69cfb4af611e9b07b5d55e79": "69cfb5366ecf5579037d96a4"
};

check("catalog has engineering books", (books.engineering || []).length >= 11);
check("catalog has medical books", (books.medical || []).length >= 7);
check("catalog has curated PYQ books", (books.curated || []).length >= 3);

let openable = 0, blocked = 0;
for (const stream of ["engineering", "medical", "curated"]) {
  for (const b of books[stream] || []) {
    if (b.isComingSoon) continue;
    const id = ALIAS[b.id] || b.id;
    const hasNav = fs.existsSync(path.join(navDir, id + ".json")) || fs.existsSync(path.join(navDir, b.id + ".json"));
    const bankOnly = ["69a684ac213ecfafb0629c0d", "69a6ea53213ecfafb0629c18", "69a6eaf1213ecfafb0629c19"].includes(b.id);
    const hasCh = fs.existsSync(path.join(chDir, id)) || fs.existsSync(path.join(chDir, b.id));
    if (hasNav && (hasCh || bankOnly)) openable++;
    else blocked++;
  }
}
check("all non-soon books openable (nav+chapters or bank)", blocked === 0, "blocked=" + blocked + " openable=" + openable);

function chapterCoverage(bid, label) {
  const nav = JSON.parse(fs.readFileSync(path.join(navDir, bid + ".json"), "utf8"));
  let keys = 0, withQs = 0, qtotal = 0, emptyNav0 = 0;
  for (const m of nav.modules || []) {
    for (const s of m.subjects || []) {
      for (const c of s.chapters || []) {
        const list = (c.exercises && c.exercises.length) ? c.exercises : [c];
        for (const x of list) {
          keys++;
          const f = path.join(chDir, bid, x.key + ".json");
          if (!fs.existsSync(f)) continue;
          const n = (JSON.parse(fs.readFileSync(f, "utf8")).questions || []).length;
          if (n > 0) { withQs++; qtotal += n; }
          else if (!x.count) emptyNav0++;
        }
      }
    }
  }
  return { label, keys, withQs, qtotal, emptyNav0 };
}
const rb = chapterCoverage("68f1ce4cc729e5251bd00430", "Rank Booster");
check("Rank Booster all chapters have questions", rb.keys === rb.withQs && rb.qtotal === 2793, JSON.stringify(rb));
const hcv = chapterCoverage("6a0addba4b032b031e049a36", "HCV v2");
check("HC Verma Vol2 all chapters have questions", hcv.keys === hcv.withQs && hcv.qtotal === 1854, JSON.stringify(hcv));

const qidIdx = JSON.parse(fs.readFileSync(path.join(root, "data/qx_book_qid_index.json"), "utf8"));
check("qx_book_qid_index present (≥15k)", Object.keys(qidIdx).length >= 15000);

const dataSrc = fs.readFileSync(path.join(root, "data.js"), "utf8");
check("loadBookChapter uses cache no-store", /chapters\/\$\{resolvedId\}\/\$\{chapterKey\}\.json[\s\S]{0,120}cache:\s*"no-store"/.test(dataSrc));
check("clearBookLoadCaches exported", /function clearBookLoadCaches/.test(dataSrc));
check("bank fallback uses loadChapterBank", /loadChapterBank\(useSlug/.test(dataSrc));
check("empty chapter packs not marked loaded", /if \(qs\.length\) _bookChaptersLoaded\[cacheKey\] = true/.test(dataSrc));
check("getBookQuestions resolves aliases", /qxResolveBookId/.test(dataSrc.slice(dataSrc.indexOf("function getBookQuestions"))));

const mf = fs.readFileSync(path.join(root, "marks-features.js"), "utf8");
check("resetBooksCache clears chapter/nav caches", /clearBookLoadCaches/.test(mf));
check("embedded curated books present", /67656ccf18ff438b6c18cc4c/.test(mf));
check("fetchBooks forceReload supported", /fetchBooks\(!!p\.forceReload\)/.test(mf));

const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
check("go(books) does not wipe cache every time", !/if \(view === "books" && typeof resetBooksCache === "function"\) resetBooksCache\(\)/.test(app));

const owned = fs.readFileSync(path.join(root, "qx-owned-figures.js"), "utf8");
check("qxBookLocalSrc helper", /function qxBookLocalSrc/.test(owned));
check("qxBookStorageSrc helper", /function qxBookStorageSrc/.test(owned));
check("retryOnError prefers Firebase after local miss", /qxBookStorageSrc\(o \|\| cur\)/.test(owned));

const qf = fs.readFileSync(path.join(root, "question-format.js"), "utf8");
check("letter-only digital books never stall Loading", /letterOnly/.test(qf) && /void stemHasFig/.test(qf));

const ver = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));
check("version.json is qxmd168", ver.build === "qxmd168" && ver.cache === "qx-pwa-qxmd168");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
check("sw cache qxmd168", /qx-pwa-qxmd168/.test(sw));
check("sw NEVER_STALE includes data.js + book loaders", /data\|book-covers\|qx-image-clean\|qx-owned-figures/.test(sw));
const appHtml = fs.readFileSync(path.join(root, "app.html"), "utf8");
check("app.html QX_BUILD qxmd168", /QX_BUILD\s*=\s*"qxmd168"/.test(appHtml));
check("app.html marks-features bust qxmd168", /marks-features\.js\?v=qxmd168/.test(appHtml));

// Owned figs displaySrc prefers local for qx-book
const sandbox = { console, window: {}, Math, String, parseInt, encodeURIComponent, URL };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(owned + "\nthis.api = QxOwnedFigs || (typeof module!=='undefined' && module.exports);", sandbox);
// QxOwnedFigs is attached to root — re-run factory style
let QxOwnedFigs;
try {
  vm.runInContext(`
    var root = this;
    ${owned}
    this._figs = root.QxOwnedFigs;
  `, sandbox);
  QxOwnedFigs = sandbox._figs;
} catch (e) {
  // IIFE already set on sandbox if window
  QxOwnedFigs = sandbox.QxOwnedFigs;
}
if (QxOwnedFigs && QxOwnedFigs.displaySrc) {
  const local = QxOwnedFigs.displaySrc("/assets/diagrams/qx-book-aa4bcd76052c93e4.png");
  check("displaySrc prefers local qx-book path", /\/assets\/diagrams\/qx-book-aa4bcd76052c93e4\.png/.test(local), local);
} else {
  check("QxOwnedFigs loaded in VM", false, "no API");
}

console.log("\nTOTAL:", pass, "pass /", fail, "fail");
process.exit(fail ? 1 : 0);
