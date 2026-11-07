// node scripts/qxmd392-options.test.js — real isStubOptionText from question-format.js; live Q38383 options ["4","1","3","2"]
const assert = require("assert"), fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "question-format.js"), "utf8");
const i = src.indexOf("function isStubOptionText("); let d = 0, end = 0; for (let k = src.indexOf("{", i); k < src.length; k++) { if (src[k] === "{") d++; else if (src[k] === "}" && --d === 0) { end = k + 1; break; } }
const stub = new Function(src.slice(i, end) + "; return isStubOptionText;")();
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok", n, name); };
const live = ["4", "1", "3", "2"];
t("JEE Main 2025 29 Jan S2 Q38383: option C '3' is a real answer (was blanked)", () => live.forEach((o, j) => assert.strictEqual(stub(o, j, live), false, "slot " + j)));
t("old 2-arg behaviour still blanks in-order digit (compat when list unknown)", () => assert.strictEqual(stub("3", 2), true));
t("true placeholders 1,2,3,4 and A,B,C,D still blanked", () => { const a = ["1","2","3","4"], b = ["A","B","C","D"]; a.forEach((o, j) => assert(stub(o, j, a))); b.forEach((o, j) => assert(stub(o, j, b))); });
t("mixed real values with an A-D letter stays real", () => { const m = ["A", "5", "7", "9"]; assert.strictEqual(stub("A", 0, m), false); });
t("empty option remains a stub", () => assert(stub("", 1, live)));
t("all call sites pass the option list", () => { const lines = src.split("\n").filter((l) => l.includes("isStubOptionText(") && !l.includes("function isStubOptionText")); assert.strictEqual(lines.length, 5); lines.forEach((l) => assert(/, (opts|optsList|optsRaw)\)/.test(l), l)); });
t("CSS: wide math scrolls instead of clipping (katex + mathjax, 3 players)", () => { const css = fs.readFileSync(path.join(__dirname, "..", "assets/qxmd392-layout.css"), "utf8");
  assert(/\.eg-test-root \.katex-display[\s\S]*?overflow-x: auto/.test(css)); assert(/:not\(\.katex-display\) > \.katex[\s\S]*?max-width: 100%[\s\S]*?overflow-x: auto/.test(css)); assert(/mjx-container[\s\S]*?overflow-x: auto/.test(css)); });
console.log("PASS", n);
