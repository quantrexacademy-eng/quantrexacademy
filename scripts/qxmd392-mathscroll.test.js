// NODE_PATH=/tmp/jsd/node_modules node scripts/qxmd392-mathscroll.test.js  (needs jsdom; exits 2 if missing)
const assert = require("assert"), fs = require("fs"), path = require("path");
let JSDOM; try { ({ JSDOM } = require("jsdom")); } catch (_) { console.error("jsdom required (npm i jsdom) - NOT a pass"); process.exit(2); }
const M = require("../qx-math-scroll.js");
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok", n, name); };
// Screenshot case 38389: card 390px; .qx-hw-paper grew to 520px (its own overflow-x:auto never scrolls); the
// outer .eg-body clips -> "= 45 + 64 =" cut off. Geometry is stubbed because jsdom has no layout.
function page(formulaW, opts) {
  opts = opts || {};
  const dom = new JSDOM(`<div id="app-main" style="overflow:hidden"><div class="eg-body" style="overflow-x:hidden">
    <div class="qx-hw-paper" style="overflow-x:auto"><div class="qx-hw-ink"><p>steps
    <span class="katex-display" id="disp"><span class="katex" id="inner"><span class="katex-html"><span class="mfrac">9/16</span></span></span></span>
    <span class="katex" id="small">x</span></p></div></div></div></div>`);
  const win = dom.window, doc = win.document;
  win.innerWidth = 390;
  const R = { "app-main": [0, 390], "eg-body": [8, 382], "qx-hw-paper": [16, 536], "qx-hw-ink": [62, 518] };
  const W = { disp: formulaW, inner: formulaW, small: 20 };
  const rect = (l, r) => ({ left: l, right: r, width: r - l, top: 0, bottom: 20, height: 20 });
  win.HTMLElement.prototype.getBoundingClientRect = function () {
    const k = this.id || this.className.split(" ")[0];
    if (R[k]) return rect(R[k][0], R[k][1]);
    if (this.classList.contains("qx-mscroll")) { const mw = parseFloat(this.style.maxWidth) || 1e9; return rect(70, 70 + Math.min(mw, W[this.firstElementChild.id] || 0)); }
    if (W[k] != null) return rect(70, 70 + W[k]);
    return rect(0, 0);
  };
  return { win, doc };
}
t("wide display formula inside a grown auto-scroll paper is wrapped and fitted to the OUTER clip (eg-body)", () => {
  const { win, doc } = page(600);
  const before = doc.getElementById("disp").outerHTML;
  assert.strictEqual(M.process(doc.getElementById("app-main"), win, doc, null), 1);
  const w = doc.getElementById("disp").parentElement;
  assert(w.classList.contains("qx-mscroll") && w.classList.contains("qx-mscroll-block") && w.tagName === "DIV");
  assert.strictEqual(w.getAttribute("tabindex"), "0"); assert.strictEqual(w.getAttribute("role"), "region");
  assert.strictEqual(parseFloat(w.style.maxWidth), 382 - 70, "max-width = tightest clipper right edge - left");
  assert.strictEqual(doc.getElementById("disp").outerHTML, before, "math subtree untouched (not re-typeset/rewritten)");
});
t("nested .katex inside the display is not double-wrapped; small inline formula untouched", () => {
  const { win, doc } = page(600); M.process(doc.getElementById("app-main"), win, doc, null);
  assert.strictEqual(doc.querySelectorAll(".qx-mscroll").length, 1);
  assert(!doc.getElementById("small").parentElement.classList.contains("qx-mscroll"));
});
t("formula that fits is never wrapped", () => { const { win, doc } = page(200); assert.strictEqual(M.process(doc.getElementById("app-main"), win, doc, null), 0); });
t("idempotent: second pass re-fits but does not wrap again", () => {
  const { win, doc } = page(600); M.process(doc.getElementById("app-main"), win, doc, null);
  assert.strictEqual(M.process(doc.getElementById("app-main"), win, doc, null), 0); assert.strictEqual(doc.querySelectorAll(".qx-mscroll").length, 1);
});
t("wide INLINE formula (question stem case) gets an inline-block span wrapper", () => {
  const { win, doc } = page(20); const s = doc.getElementById("small"); win.HTMLElement.prototype._g = 1;
  const orig = win.HTMLElement.prototype.getBoundingClientRect;
  win.HTMLElement.prototype.getBoundingClientRect = function () { return this.id === "small" ? { left: 70, right: 700, width: 630, top: 0, bottom: 1, height: 1 } : orig.call(this); };
  M.process(doc.getElementById("app-main"), win, doc, null);
  assert.strictEqual(s.parentElement.tagName, "SPAN"); assert(s.parentElement.classList.contains("qx-mscroll") && !s.parentElement.classList.contains("qx-mscroll-block"));
});
t("loaded on every question entry page after math-render; css has the scroll box and no blanket inline .katex scroll", () => {
  ["app.html", "test-series.html", "examgoal-test-series.html", "quantrex-test-series.html", "jee-main-pyq-chapter.html"].forEach((p) => {
    const h = fs.readFileSync(path.join(__dirname, "..", p), "utf8"); const i = h.search(/math-render\.js/), j = h.indexOf("qx-math-scroll.js?v=qxmd392e");
    assert(i > 0 && j > i, p);
  });
  const c = fs.readFileSync(path.join(__dirname, "../assets/qxmd392-layout.css"), "utf8");
  assert(/\.qx-mscroll \{[^}]*overflow-x: auto/.test(c)); assert(!/:not\(\.katex-display\) > \.katex,/.test(c));
  assert(/\.qx-hw-paper, \.qx-hw-ink/.test(c));
});
console.log("PASS " + n);
