// npm ci --prefix scripts/test-tools && node scripts/qxmd392-mathscroll.test.js  (needs jsdom; exits 2 if missing)
const assert = require("assert"), fs = require("fs"), path = require("path");
let JSDOM; try { ({ JSDOM } = require(require("path").join(__dirname, "test-tools/node_modules/jsdom"))); } catch (_) { console.error("jsdom required (npm i jsdom) - NOT a pass"); process.exit(2); }
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
function dispCase(dispRight, childW, scrollW, clientW) {
  const { win, doc } = page(0);
  const D = doc.getElementById("disp"), K = doc.getElementById("inner");
  Object.defineProperty(D, "scrollWidth", { get: () => scrollW }); Object.defineProperty(D, "clientWidth", { get: () => { const mw = parseFloat(D.style.getPropertyValue("max-width")); return mw ? Math.min(mw, clientW) : clientW; } });
  const orig = win.HTMLElement.prototype.getBoundingClientRect;
  win.HTMLElement.prototype.getBoundingClientRect = function () {
    const rr = (l, r) => ({ left: l, right: r, width: r - l, top: 0, bottom: 20, height: 20 });
    if (this === D) { const mw = parseFloat(D.style.getPropertyValue("max-width")); return rr(70, mw ? 70 + mw : dispRight); }
    if (this === K) return rr(70, 70 + childW);
    return orig.call(this);
  };
  return { win, doc, D, K };
}
t("ROOT CASE: CSS-limited display box whose rect FITS but child paints past card (scrollWidth>clientWidth) is capped + made a focusable region", () => {
  // .katex-display limited by max-width:100% of a grown .qx-hw-paper (right 536 > eg-body 382), child 600px wide
  const { win, doc, D, K } = dispCase(536, 600, 600, 466);
  const before = D.innerHTML;
  M.process(doc.getElementById("app-main"), win, doc, null);
  assert.strictEqual(D.style.getPropertyValue("max-width"), (382 - 70) + "px"); assert.strictEqual(D.style.getPropertyPriority("max-width"), "important");
  assert(D.classList.contains("qx-mscroll-on")); assert.strictEqual(D.getAttribute("tabindex"), "0"); assert.strictEqual(D.getAttribute("role"), "region");
  assert(D.clientWidth <= 382 - 70 && D.scrollWidth > D.clientWidth, "region fits card and really scrolls");
  assert.strictEqual(D.innerHTML, before, "math subtree untouched"); assert.strictEqual(doc.querySelectorAll(".qx-mscroll").length, 0, "display not re-wrapped");
});
t("rect fits but scrollWidth>clientWidth inside the card: region marked even without capping", () => {
  const { win, doc, D } = dispCase(300, 600, 600, 230);
  M.process(doc.getElementById("app-main"), win, doc, null);
  assert(D.classList.contains("qx-mscroll-on")); assert.strictEqual(D.style.getPropertyValue("max-width"), "");
});
t("display formula that fits (no overflow) untouched", () => {
  const { win, doc, D } = dispCase(250, 180, 180, 180);
  assert.strictEqual(M.process(doc.getElementById("app-main"), win, doc, null), 0); assert(!D.classList.contains("qx-mscroll-on")); assert.strictEqual(D.getAttribute("tabindex"), null);
});
t("existing inline wrapper IS re-fitted on a later pass (resize branch reachable)", () => {
  const { win, doc } = page(20); const s = doc.getElementById("small");
  const orig = win.HTMLElement.prototype.getBoundingClientRect; let wide = 700;
  win.HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.id === "small") return { left: 70, right: wide, width: wide - 70, top: 0, bottom: 1, height: 1 };
    if (this.classList.contains("qx-mscroll")) { const mw = parseFloat(this.style.getPropertyValue("max-width")) || 1e9; return { left: 70, right: 70 + Math.min(mw, wide - 70), width: 0, top: 0, bottom: 1, height: 1 }; }
    return orig.call(this);
  };
  M.process(doc.getElementById("app-main"), win, doc, null); const w = s.parentElement;
  assert(w.classList.contains("qx-mscroll")); assert.strictEqual(w.style.getPropertyValue("max-width"), "312px");
  const R = { "eg-body": 300 }; const o2 = win.HTMLElement.prototype.getBoundingClientRect;
  win.HTMLElement.prototype.getBoundingClientRect = function () { const k = this.className && this.className.split(" ")[0]; if (k === "eg-body") return { left: 8, right: 300, width: 292, top: 0, bottom: 1, height: 1 }; return o2.call(this); };
  assert.strictEqual(M.process(doc.getElementById("app-main"), win, doc, null), 0); assert.strictEqual(w.style.getPropertyValue("max-width"), "230px", "re-fit to narrower card");
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
    const h = fs.readFileSync(path.join(__dirname, "..", p), "utf8"); const i = h.search(/math-render\.js/), j = h.indexOf("qx-math-scroll.js?v=qxmd392g");
    assert(i > 0 && j > i, p);
  });
  const c = fs.readFileSync(path.join(__dirname, "../assets/qxmd392-layout.css"), "utf8");
  assert(/\.qx-mscroll \{[^}]*overflow-x: auto/.test(c)); assert(!/:not\(\.katex-display\) > \.katex,/.test(c));
  assert(/\.qx-hw-paper, \.qx-hw-ink/.test(c));
});
console.log("PASS " + n);
