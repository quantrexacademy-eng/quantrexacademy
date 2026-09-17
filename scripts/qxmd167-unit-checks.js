#!/usr/bin/env node
/** qxmd167 unit checks — format glue + delimiter + stem-echo + palette default. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const sanitizeSrc = fs.readFileSync(path.join(root, "qx-math-sanitize.js"), "utf8");
const solSrc = fs.readFileSync(path.join(root, "solution-format.js"), "utf8");
const egSrc = fs.readFileSync(path.join(root, "examgoal-test-ui.js"), "utf8");
const setSrc = fs.readFileSync(path.join(root, "qx-settings.js"), "utf8");

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

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log("PASS —", name); }
  else { fail++; console.log("FAIL —", name, detail ? String(detail).slice(0, 200) : ""); }
}

// --- Sanitize glue fixes ---
const r1 = San.repairMarksExportTex("\\left| \\sin xcos x \\right| = \\frac{1}{4}");
check("glue sin xcos → sin x cos", /\\sin x \\cos x/.test(r1) && !/xcos/.test(r1), r1);

const r2 = San.repairMarksExportTex("sinx + cosx = 1");
check("glue sinx cosx", /\\sin x/.test(r2) && /\\cos x/.test(r2), r2);

const r3 = San.repairMarksExportTex("\\lnsinx - \\lncosx");
check("glue lnsinx", /\\ln \\sin x/.test(r3) && /\\ln \\cos x/.test(r3), r3);

const r4 = San.repairMarksExportTex("where $\\betaare$ integers");
check("glue betaare", /\\beta are/.test(r4) && !/\\betaare/.test(r4), r4);

const r5 = San.repairMarksExportTex("{\\log}_{cosx}\\left(cotx\\right)");
check("log_{cosx} + cotx", /\\log_\{\\cos x\}/.test(r5) && /\\cot x/.test(r5), r5);

const r6 = San.repairMarksExportTex("$\\dfrac{\\alpha+\\sqrt{\\beta}}{2}$");
check("alpha/beta dfrac intact", /\\dfrac\{\\alpha\+\\sqrt\{\\beta\}\}\{2\}/.test(r6), r6);

const broken =
  "log _{1/2}\\left| \\sin xcos x \\right| = 2\n\\left| \\sin xcos x \\right| = \\frac{1}{4} sin 2x = \\pm $\\dfrac{1}{2}$$ \\\\";
const fixed = QS.repairSolutionDelimiters(QS.repairSolutionProse(San.repairMarksExportTex(broken)));
check("log/sin no left$|", !/\\left\s*\$/.test(fixed), fixed);
check("log/sin no trailing $$\\\\", !/\$\$\s*\\\\/.test(fixed), fixed);
check("log/sin no xcos", !/xcos/.test(fixed), fixed);
check("log/sin has cos cmd", /\\cos/.test(fixed), fixed);
check("log/sin dollar-balanced", (fixed.match(/\$/g) || []).length % 2 === 0, fixed);

// --- Stem echo (real bank) ---
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

const tip = "Key step: $\\sin 2x = \\pm \\dfrac{1}{2}$\nAlso \\frac{1}{4}";
check("shortcut math path", /\\frac|dfrac|sin/.test(QS.formatShortcutLine(tip)), tip);

// --- Defaults: palette side ---
check("eg getPalettePref default side", /return "side";/.test(egSrc) && /default side/.test(egSrc));
check("qx-settings default side", /lsGet\(PREF\.palette,\s*"side"\)/.test(setSrc));
check("practice foot has Mark for Review", /qxReviewNextBtn/.test(egSrc) && /eg-foot-practice/.test(egSrc));
check("practice foot has Clear + Save", /qxClearBtn/.test(egSrc) && /id="qxSaveBtn"/.test(egSrc));
check("practice legend has Marked", egSrc.includes('eg-dot marked"></i>Marked') && egSrc.includes("eg-foot-practice"));

console.log("\nTOTAL:", pass, "pass /", fail, "fail");
process.exit(fail ? 1 : 0);
