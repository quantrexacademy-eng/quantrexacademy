#!/usr/bin/env node
/** qxmd172 — Eng+Med content wire + medical nav aliases + no videos + Quantrex brand; keep 170/171. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.resolve(__dirname, "..");
let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("PASS —", name); }
  else { fail++; console.log("FAIL —", name, detail ? String(detail).slice(0, 200) : ""); }
}

const ver = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const html = fs.readFileSync(path.join(root, "app.html"), "utf8");
const dataSrc = fs.readFileSync(path.join(root, "data.js"), "utf8");
const mf = fs.readFileSync(path.join(root, "marks-features.js"), "utf8");
const setSrc = fs.readFileSync(path.join(root, "qx-settings.js"), "utf8");
const egSrc = fs.readFileSync(path.join(root, "examgoal-test-ui.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets/examgoal-test-ui.css"), "utf8");
const redesign = fs.readFileSync(path.join(root, "qx-redesign-nav.js"), "utf8");
const strip = fs.readFileSync(path.join(root, "strip/branding-strip.js"), "utf8");
const books = JSON.parse(fs.readFileSync(path.join(root, "data/books.json"), "utf8"));
const sanitizeSrc = fs.readFileSync(path.join(root, "qx-math-sanitize.js"), "utf8");
const solSrc = fs.readFileSync(path.join(root, "solution-format.js"), "utf8");

check("build qxmd172", ver.build === "qxmd172" && /qxmd172/.test(sw) && /QX_BUILD = "qxmd172"/.test(html));
check("cache qx-pwa-qxmd172", ver.cache === "qx-pwa-qxmd172");
check("bust settings+features+data", /qx-settings\.js\?v=qxmd172/.test(html) && /marks-features\.js\?v=qxmd172/.test(html) && /data\.js\?v=qxmd172/.test(html));

// Medical aliases
const aliases = {
  "6a507da9107f81233d9985c1": "6a4ce383c59a7b462185330f",
  "6a0adb714b032b031e049a34": "6a0addba4b032b031e049a36",
  "69cfb4af611e9b07b5d55e79": "69cfb5366ecf5579037d96a4",
  "69f9ccfa011347df7bce2a38": "69f9cc23681eab6d6021a4d1"
};
for (const [med, eng] of Object.entries(aliases)) {
  check("alias map " + med.slice(0, 8), new RegExp('"' + med + '"\\s*:\\s*"' + eng + '"').test(dataSrc));
  check("med nav file " + med.slice(0, 8), fs.existsSync(path.join(root, "data/nav/books", med + ".json")));
  check("eng pack chapters " + eng.slice(0, 8), fs.existsSync(path.join(root, "data/books/chapters", eng)));
}

check("medical catalog ≥8", (books.medical || []).length >= 8);
check("engineering catalog ≥11 active", (books.engineering || []).filter(b => !b.isComingSoon).length >= 11);
check("Quantrex Digital Books title", /Quantrex Digital Books/.test(mf) && /Quantrex Digital Books/.test(books.title || ""));
check("no Concept Video module in redesign", !/id:\s*"video"/.test(redesign.match(/function renderChapterHub[\s\S]*?const modules = \[[\s\S]*?\];/)?.[0] || "id:\"video\""));
check("adv hub no Concept Video(s) card", !/title: "Concept Video\(s\)"/.test(mf));
check("branding scrub Marks in cleanUiLabel", /qxmd172 strip Marks brand words/.test(strip));
check("settings Quantrex sections", /Appearance/.test(setSrc) && /Notifications/.test(setSrc) && /qx-qxmd-settings/.test(setSrc));
check("practice Marks foot qxmd171", /eg-marks-foot/.test(egSrc) && /eg-qxmd171/.test(egSrc));
check("palette CSS-instant", /_egMenuToggleLock < 80/.test(egSrc) && /--eg-chrome-ms:\s*120ms/.test(css));

// Format keep
const sandbox = {
  window: {}, document: { documentElement: { setAttribute() {} }, body: { setAttribute() {} }, createElement() { return { style:{}, remove(){}, textContent:"" }; }, getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {} },
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } },
  Mx: { html: t => t, cleanQuestionText: t => t, upgradePlainMathNotation: t => t, ensureMathDelimiters: t => t },
  MathTextRenderer: { render: t => t }, console, setTimeout, clearTimeout
};
sandbox.window = sandbox; sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(sanitizeSrc + "\nthis.QxMathSanitize = QxMathSanitize;", sandbox);
sandbox.QxMathSanitize = sandbox.QxMathSanitize || sandbox.window.QxMathSanitize;
vm.runInContext(solSrc + "\nthis.QuantrexSolution = QuantrexSolution;", sandbox);
const San = sandbox.QxMathSanitize;
const r = San.repairMarksExportTex("lnsinx - sinxcosx");
check("format sanitize kept", /\\ln \\sin x/.test(r) && /\\sin x \\cos/.test(r), r);

// Gaps noted — Skills coming soon still
check("Skills Diff coming soon (no invent)", (books.engineering || []).some(b => /Differential Calculus/i.test(b.title) && b.isComingSoon));

console.log("\nTOTAL:", pass, "pass /", fail, "fail");
process.exit(fail ? 1 : 0);
