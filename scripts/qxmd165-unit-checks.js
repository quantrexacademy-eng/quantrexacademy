#!/usr/bin/env node
/** qxmd165 unit checks — stem-echo + math delimiter repair (no browser). */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(root, "solution-format.js"), "utf8");
const sandbox = {
  Mx: {
    html: (t) => t,
    cleanQuestionText: (t) => t,
    upgradePlainMathNotation: (t) => t,
    ensureMathDelimiters: (t) => t
  },
  MathTextRenderer: { render: (t) => t },
  QxMathSanitize: {
    repairMarksExportTex: (t) =>
      String(t || "")
        .replace(/[\u2061\u2062\u2063\u2064]/g, "")
        .replace(/\{\\?(log|ln|sin|cos|tan|cot|sec|csc)\}/gi, (_, n) => "\\" + n.toLowerCase())
        .replace(/(\\left\s*\|)\s*(sin|cos|tan)\b/gi, (_, left, fn) => left + "\\" + fn.toLowerCase())
  },
  console
};
vm.createContext(sandbox);
vm.runInContext(src + "\nthis.QuantrexSolution = QuantrexSolution;", sandbox);
const QS = sandbox.QuantrexSolution;

const chapter = JSON.parse(
  fs.readFileSync(path.join(root, "data/banks/chapters/jee_main/mathematics/basics-of-mathematics.json"), "utf8")
);

let pass = 0;
let fail = 0;
function check(name, cond, detail) {
  if (cond) {
    pass++;
    console.log("PASS —", name);
  } else {
    fail++;
    console.log("FAIL —", name, detail ? String(detail).slice(0, 160) : "");
  }
}

const q61 = chapter.questions.find((x) => String(x.id) === "33261");
q61.questionText = q61.q;
const s61 = QS.stripLeadingStemEcho(q61.solution, q61);
const p61 = s61.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
check("Q33261 stem-echo", /⇒|A\s*=/.test(p61) && !/^Given/i.test(p61), p61);

const q68 = chapter.questions.find((x) => String(x.id) === "33268");
q68.questionText = q68.q;
q68._qxOrigStem =
  "The number of distinct solutions of the equation $\\log_{1/2}|\\sin x|=2-\\log_{1/2}|\\cos x|$ in the interval $[0,2\\pi]$ is ________.";
const s68 = QS.stripLeadingStemEcho(q68.solution, q68);
const p68 = s68.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
check(
  "Q33268 stem-echo",
  /sin|\\\\left|\\left/i.test(p68) && !/number of distinct solutions/i.test(p68),
  p68
);

const body68 = QS.formatBody(q68.solution, q68);
check("Q33268 no left$| damage", !/\\left\s*\$/.test(body68));
check("Q33268 has $ islands", (body68.match(/\$/g) || []).length >= 4);
check("Q33268 no trailing $$\\\\", !/\$\$\s*\\\\/.test(body68));

const synth1 = {
  questionText: "Let $A=\\{1,2\\}$ and $B=\\{2,3\\}$. Find $A\\cup B$.",
  q: "Let $A=\\{1,2\\}$ and $B=\\{2,3\\}$. Find $A\\cup B$.",
  solution: "<p>Given,</p><p>$A=\\{1,2\\}$</p><p>$B=\\{2,3\\}$</p><p>$\\Rightarrow A\\cup B=\\{1,2,3\\}$</p>"
};
const syn1 = QS.stripLeadingStemEcho(synth1.solution, synth1);
check("Synth Given+defs", /A\\cup B|\\\\Rightarrow|⇒/.test(syn1) && !/Given/i.test(syn1.replace(/<[^>]+>/g, " ")), syn1);

const synth2 = {
  questionText: "Solve $x^2=4$",
  q: "Solve $x^2=4$",
  solution: "$x^2=4$<br/>$\\Rightarrow x=\\pm 2$"
};
const syn2 = QS.stripLeadingStemEcho(synth2.solution, synth2);
check("Synth lone $x^2=4$", /\\\\Rightarrow|x\s*=\s*\\pm/.test(syn2), syn2);

const synth3 = {
  questionText: "Solve $\\log_{1/2}|\\sin x\\cos x|=2$",
  q: "Solve $\\log_{1/2}|\\sin x\\cos x|=2$",
  solution: "$\\log_{1/2}|\\sin x\\cos x|=2$<br/>$|\\sin x\\cos x|=1/4$<br/>$\\Rightarrow \\sin 2x=\\pm 1/2$"
};
const syn3 = QS.stripLeadingStemEcho(synth3.solution, synth3);
check("Synth full-stem-then-work", /\\|\\sin x\\cos x\\|=1\/4|sin x/.test(syn3), syn3);

const broken =
  "log _{1/2}\\left| \\sin xcos x \\right| = 2\n\\left| \\sin xcos x \\right| = \\frac{1}{4} sin 2x = \\pm $\\dfrac{1}{2}$$ \\\\";
const fixed = QS.repairSolutionDelimiters(QS.repairSolutionProse(broken));
check("log/sin no left$|", !/\\left\s*\$/.test(fixed), fixed);
check("log/sin no trailing $$\\\\", !/\$\$\s*\\\\/.test(fixed), fixed);
check("log/sin dollar-balanced", (fixed.match(/\$/g) || []).length % 2 === 0, fixed);
check("log/sin has left| intact", /\\left\|/.test(fixed), fixed);

const tip = "Key step: $\\sin 2x = \\pm \\dfrac{1}{2}$\nAlso \\frac{1}{4}";
const tipOut = QS.formatShortcutLine(tip);
check("shortcut math path", /\\frac|dfrac|sin/.test(tipOut), tipOut);

console.log("\nTOTAL:", pass, "pass /", fail, "fail");
process.exit(fail ? 1 : 0);
