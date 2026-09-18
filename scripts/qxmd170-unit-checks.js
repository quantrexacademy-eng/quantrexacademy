#!/usr/bin/env node
/** qxmd170 — format harden (lnsinx/sinxcosx/shortcut) + P1 features regression. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("PASS —", name); }
  else { fail++; console.log("FAIL —", name, detail ? String(detail).slice(0, 240) : ""); }
}

const sanitizeSrc = fs.readFileSync(path.join(root, "qx-math-sanitize.js"), "utf8");
const solSrc = fs.readFileSync(path.join(root, "solution-format.js"), "utf8");
const egSrc = fs.readFileSync(path.join(root, "examgoal-test-ui.js"), "utf8");
const setSrc = fs.readFileSync(path.join(root, "qx-settings.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets/examgoal-test-ui.css"), "utf8");
const mob = fs.readFileSync(path.join(root, "assets/qx-mobile.css"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const data = fs.readFileSync(path.join(root, "data.js"), "utf8");
const mf = fs.readFileSync(path.join(root, "marks-features.js"), "utf8");
const qf = fs.readFileSync(path.join(root, "question-format.js"), "utf8");
const books = JSON.parse(fs.readFileSync(path.join(root, "data/books.json"), "utf8"));
const ver = JSON.parse(fs.readFileSync(path.join(root, "version.json"), "utf8"));
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const html = fs.readFileSync(path.join(root, "app.html"), "utf8");

const sandbox = {
  window: {},
  document: { documentElement: { setAttribute() {} }, body: { setAttribute() {} }, createElement() { return { style:{}, remove(){}, textContent:"" }; }, getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {} },
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } },
  Mx: {
    html: (t) => t,
    cleanQuestionText: (t) => t,
    upgradePlainMathNotation: (t) => t,
    ensureMathDelimiters: (t) => t
  },
  MathTextRenderer: { render: (t) => t },
  console,
  setTimeout,
  clearTimeout
};
sandbox.window = sandbox;
sandbox.global = sandbox;
vm.createContext(sandbox);
vm.runInContext(sanitizeSrc + "\nthis.QxMathSanitize = QxMathSanitize;", sandbox);
sandbox.QxMathSanitize = sandbox.QxMathSanitize || sandbox.window.QxMathSanitize;
vm.runInContext(solSrc + "\nthis.QuantrexSolution = QuantrexSolution;", sandbox);
const QS = sandbox.QuantrexSolution;
const San = sandbox.QxMathSanitize;

// --- Build / P1 retained ---
check("build is qxmd170", ver.build === "qxmd170" && /qxmd170/.test(sw) && /QX_BUILD = "qxmd170"/.test(html));
check("practice foot has egFootMore + qxNextBtn", /id="egFootMore"/.test(egSrc) && /id="qxNextBtn"/.test(egSrc) && /eg-foot-extra/.test(egSrc));
check("mobile CSS hides foot-extra until more-open", /eg-foot-more-open/.test(css) && /:not\(\.eg-foot-more-open\)[\s\S]{0,80}eg-foot-extra/.test(css));
check("Report+Group have eg-tool-reach", /eg-tool-reach" id="egPlusBtn"/.test(egSrc) && /eg-tool-reach" id="mtkReportBtn"/.test(egSrc));
check("qxmd170 class on root", /eg-qxmd170/.test(egSrc) && /eg-qxmd170/.test(css));
check("palette lock ≤80ms menu", /_egMenuToggleLock < 80/.test(egSrc));
check("chrome ms ≤120", /--eg-chrome-ms:\s*120ms/.test(css));
check("practice failsafe default 10s", /_qxPracticeFailsafeMs = 10000/.test(app));
check("stem-hide CSS retained", /eg-sol-showing/.test(css) && /eg-stem-sol-hidden/.test(css));
check("radio hidden sitewide", /mtk-opt-radio[\s\S]{0,120}display:\s*none\s*!important/.test(css));
check("option katex dark+light colors", /data-test-theme="dark"[\s\S]{0,200}mtk-opt-text \.katex/.test(css) && /data-test-theme="light"[\s\S]{0,200}mtk-opt-text \.katex/.test(css));
check("no api.refresh on menu palette path", /NO eng\.refresh\(\)/.test(egSrc) || /CSS class only — instant/.test(egSrc));

// --- Medical catalog ---
check("medical catalog has MIPYQ NEET 2027", (books.medical || []).some(b => /Most Important PYQ NEET 2027/i.test(b.title || "")));
check("embedded medical catalog has MIPYQ", /Most Important PYQ NEET 2027/.test(mf));
check("MIPYQ in Recommended recIds", /recIds = \[[^\]]*6a91185f41ab5aba084f4d30/.test(mf));
check("medical track fallback in viewBooks", /qxFolderTrack\(\) === "Medical"/.test(mf) && /isMed \? "Medical"/.test(mf));
check("booksForExam medical embedded fallback", /QX_BOOKS_CATALOG\.medical/.test(mf));
check("medical books ≥8", (books.medical || []).length >= 8);
check("MIPYQ nav+chapters exist on disk", fs.existsSync(path.join(root, "data/nav/books/6a91185f41ab5aba084f4d30.json")) && fs.existsSync(path.join(root, "data/books/chapters/6a91185f41ab5aba084f4d30")));

// --- Sanitize glue (expanded) ---
const rProd = San.repairMarksExportTex("2sinxcosx = n/10");
check("glue sinxcosx product", /\\sin x \\cos x/.test(rProd) && !/sinxcosx/.test(rProd), rProd);

const rLn = San.repairMarksExportTex("lnsinx - lncosx");
check("glue bare lnsinx lncosx", /\\ln \\sin x/.test(rLn) && /\\ln \\cos x/.test(rLn), rLn);

const rDfrac = San.repairMarksExportTex("\\dfrac{lnsinx}{lncosx}");
check("glue lnsinx inside dfrac", /\\dfrac\{\\ln \\sin x\}\{\\ln \\cos x\}/.test(rDfrac), rDfrac);

const rBrace = San.repairMarksExportTex("lnsinx = {lncos}^{2}x");
check("glue {lncos}^{2}x", /\\ln\\cos\^\{2\}/.test(rBrace) || /\\ln \\cos/.test(rBrace), rBrace);

const r1 = San.repairMarksExportTex("\\left| \\sin xcos x \\right| = \\frac{1}{4}");
check("glue sin xcos → sin x cos", /\\sin x \\cos x/.test(r1) && !/xcos/.test(r1), r1);

const r2 = San.repairMarksExportTex("sinx + cosx = 1");
check("glue sinx cosx", /\\sin x/.test(r2) && /\\cos x/.test(r2), r2);

const r3 = San.repairMarksExportTex("\\lnsinx - \\lncosx");
check("glue \\lnsinx", /\\ln \\sin x/.test(r3) && /\\ln \\cos x/.test(r3), r3);

const r4 = San.repairMarksExportTex("where $\\betaare$ integers");
check("glue betaare", /\\beta are/.test(r4) && !/\\betaare/.test(r4), r4);

const r5 = San.repairMarksExportTex("{\\log}_{cosx}\\left(cotx\\right)");
check("log_{cosx} + cotx", /\\log_\{\\cos x\}/.test(r5) && /\\cot x/.test(r5), r5);

const r6 = San.repairMarksExportTex("$\\dfrac{\\alpha+\\sqrt{\\beta}}{2}$");
check("alpha/beta dfrac intact", /\\dfrac\{\\alpha\+\\sqrt\{\\beta\}\}\{2\}/.test(r6), r6);

const rLog = San.repairMarksExportTex("log _{1/2}\\left| \\sin xcos x \\right| = 2");
check("bare log _{1/2}", /\\log_\{1\/2\}/.test(rLog) && !/xcos/.test(rLog), rLog);

const broken =
  "log _{1/2}\\left| \\sin xcos x \\right| = 2\n\\left| \\sin xcos x \\right| = \\frac{1}{4} sin 2x = \\pm $\\dfrac{1}{2}$$ \\\\";
const fixed = QS.repairSolutionDelimiters(QS.repairSolutionProse(San.repairMarksExportTex(broken)));
check("log/sin no left$|", !/\\left\s*\$/.test(fixed), fixed);
check("log/sin no trailing $$\\\\", !/\$\$\s*\\\\/.test(fixed), fixed);
check("log/sin no xcos", !/xcos/.test(fixed), fixed);
check("log/sin dollar-balanced", (fixed.match(/\$/g) || []).length % 2 === 0, fixed);

// --- Stem echo + real bank ---
const chapter = JSON.parse(
  fs.readFileSync(path.join(root, "data/banks/chapters/jee_main/mathematics/basics-of-mathematics.json"), "utf8")
);
const q68 = chapter.questions.find((x) => String(x.id) === "33268");
q68.questionText = q68.q;
q68._qxOrigStem =
  "The number of distinct solutions of the equation $\\log_{1/2}|\\sin x|=2-\\log_{1/2}|\\cos x|$ in the interval $[0,2\\pi]$ is ________.";
const body68 = QS.formatBody(q68.solution, q68);
check("Q33268 no stem reprint", !/number of distinct solutions/i.test(body68), body68.slice(0, 120));
check("Q33268 no xcos after format", !/xcos/.test(body68), body68.slice(0, 200));
check("Q33268 has math islands", /\\sin|\\cos|dfrac|frac/.test(body68), body68.slice(0, 200));

const q61 = chapter.questions.find((x) => String(x.id) === "33261");
q61.questionText = q61.q;
const s61 = QS.stripLeadingStemEcho(q61.solution, q61);
check("Q33261 stem-echo", /⇒|A\s*=/.test(s61.replace(/<[^>]+>/g, " ")) && !/^Given/i.test(s61.replace(/<[^>]+>/g, " ").trim()), s61.slice(0, 100));

const q65 = chapter.questions.find((x) => String(x.id) === "33265");
q65.questionText = q65.q;
const body65 = QS.formatBody(q65.solution, q65);
check("Q33265 no raw lnsinx/sinxcosx", !/lnsinx|lncosx|sinxcosx/.test(body65), body65.slice(0, 220));
check("Q33265 has \\sin / \\cos / \\ln", /\\sin|\\cos|\\ln|\\log/.test(body65), body65.slice(0, 220));

// --- Quick Shortcut ---
const tip1 = QS.formatShortcutLine("Key step: sinxcosx = 1/10");
check("shortcut prose not all-math", /^Key step:/i.test(tip1) && /\$/.test(tip1) && !/^\$Key step/i.test(tip1), tip1);
check("shortcut has sin cos cmds", /\\sin/.test(tip1) && /\\cos/.test(tip1), tip1);

const tip2 = QS.formatShortcutLine("Key step: $\\sin 2x = \\pm \\dfrac{1}{2}$");
check("shortcut keeps existing $ math", /Key step:/.test(tip2) && /\\sin 2x/.test(tip2) && !/^\$Key step/i.test(tip2), tip2);

const tip3 = QS.formatShortcutLine("\\sin 2x = \\pm 1/2");
check("shortcut pure tex wrapped", /^\$/.test(tip3) && /\\sin 2x/.test(tip3), tip3);

// --- Defaults ---
check("eg getPalettePref default side", /return "side";/.test(egSrc) && /default side/.test(egSrc));
check("qx-settings default side", /lsGet\(PREF\.palette,\s*"side"\)/.test(setSrc));
check("practice foot has Mark for Review", /qxReviewNextBtn/.test(egSrc) && /eg-foot-practice/.test(egSrc));
check("htmlContent calls repairMarksExportTex", /htmlContent[\s\S]{0,400}repairMarksExportTex/.test(qf));
check("formatShortcutLine calls repairMarksExportTex", /formatShortcutLine[\s\S]{0,500}repairMarksExportTex/.test(solSrc));
check("script busts qxmd170 for sanitize+sol", /qx-math-sanitize\.js\?v=qxmd170/.test(html) && /solution-format\.js\?v=qxmd170/.test(html));

console.log("\nTOTAL:", pass, "pass /", fail, "fail");
process.exit(fail ? 1 : 0);
