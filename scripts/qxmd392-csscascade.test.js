// Real CSS parse (css-tree) + cascade resolution for the solution-formula box, over app.html's actual stylesheet order.
// npm ci --prefix scripts/test-tools && node scripts/qxmd392-csscascade.test.js (needs css-tree + jsdom; exits 2 if missing)
const assert = require("assert"), fs = require("fs"), path = require("path");
let csstree, JSDOM; try { csstree = require(require("path").join(__dirname, "test-tools/node_modules/css-tree")); ({ JSDOM } = require(require("path").join(__dirname, "test-tools/node_modules/jsdom"))); } catch (_) { console.error("css-tree/jsdom required - NOT a pass"); process.exit(2); }
const R = path.join(__dirname, ".."); let n = 0; const t = (m, f) => { f(); n++; console.log("ok", n, m); };
const html = fs.readFileSync(path.join(R, "app.html"), "utf8");
const sheets = []; html.replace(/assets\/[a-z0-9-]+\.css/g, (m) => { if (!sheets.includes(m)) sheets.push(m); });
function parse(file) {
  const errs = []; const ast = csstree.parse(fs.readFileSync(path.join(R, file), "utf8"), { positions: true, onParseError: (e) => errs.push(e.message + " @" + e.line) });
  return { ast, errs };
}
t("qxmd392-layout.css parses with ZERO errors (catches the stray `;,` / `},` that swallowed rules)", () => {
  const { errs } = parse("assets/qxmd392-layout.css"); assert.deepStrictEqual(errs, []);
});
t("the layout sheet's rules stay separate: no selector text contains a '{' or a declaration fragment", () => {
  const { ast } = parse("assets/qxmd392-layout.css");
  csstree.walk(ast, { visit: "Rule", enter(r) { const s = csstree.generate(r.prelude); assert(!/[{};!]/.test(s), "bad prelude: " + s.slice(0, 80)); } });
});
// specificity with :is/:not/:where per Selectors-4
function spec(sel) {
  let a = 0, b = 0, c = 0;
  (sel.children || []).forEach((x) => {
    if (x.type === "IdSelector") a++;
    else if (x.type === "ClassSelector" || x.type === "AttributeSelector") b++;
    else if (x.type === "TypeSelector" && x.name !== "*") c++;
    else if (x.type === "PseudoElementSelector") c++;
    else if (x.type === "PseudoClassSelector") {
      const nm = x.name.toLowerCase();
      if (nm === "where") return;
      if ((nm === "is" || nm === "not" || nm === "has") && x.children) {
        let best = [0, 0, 0]; x.children.forEach((list) => (list.children || [list]).forEach((s) => { const v = spec(s); if (cmp(v, best) > 0) best = v; }));
        a += best[0]; b += best[1]; c += best[2];
      } else b++;
    }
  });
  return [a, b, c];
}
const cmp = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
const decls = [];
let order = 0;
sheets.forEach((f) => {
  const { ast } = parse(f);
  csstree.walk(ast, { visit: "Rule", enter(rule) {
    if (this.atrule && !/^(media|supports|layer)$/.test(this.atrule.name)) return;
    if (this.atrule && this.atrule.name === "media" && !/max-width|min-width|prefers-color|screen/.test(csstree.generate(this.atrule.prelude))) return;
    if (rule.prelude.type !== "SelectorList") return;
    rule.prelude.children.forEach((sel) => {
      const text = csstree.generate(sel);
      rule.block.children.forEach((d) => { if (d.type === "Declaration") decls.push({ text, sp: spec(sel), prop: d.property.toLowerCase(), val: csstree.generate(d.value).trim(), imp: !!d.important, order: order++, file: f }); });
    });
  } });
});
const dom = new JSDOM(`<html><body><main id="app-main"><div class="eg-test-root"><div class="eg-body"><div id="egSolPanel" class="eg-sol-panel">
  <div class="qx-hw-sol"><div class="qx-hw-paper"><div class="qx-content sol-body mk-sol-body qx-hw-ink"><p><span class="katex-display" id="D"><span class="katex" id="K"></span></span></p></div></div></div></div></div></div></main>
  <div class="qx-hw-ink" id="S"><span class="katex-display" id="SD"><span class="katex"></span></span></div></body></html>`);
const doc = dom.window.document;
function win(el, prop) {
  let best = null;
  for (const d of decls) {
    if (d.prop !== prop) continue;
    let ok = false; try { ok = el.matches(d.text); } catch (_) { continue; }
    if (!ok) continue;
    if (!best || (d.imp !== best.imp ? d.imp : (cmp(d.sp, best.sp) || d.order - best.order) > 0)) best = d;
  }
  return best;
}
const show = (d) => d && `${d.val}${d.imp ? " !important" : ""} <- ${d.file}: ${d.text} [${d.sp}]`;
t("solution display formula in app.html (notebook card): display=block, overflow-x=auto, max-width=100% WIN the cascade", () => {
  const D = doc.getElementById("D");
  const r = { display: win(D, "display"), ox: win(D, "overflow-x") || win(D, "overflow"), mw: win(D, "max-width") };
  console.log("   display:", show(r.display)); console.log("   overflow-x:", show(r.ox)); console.log("   max-width:", show(r.mw));
  assert.strictEqual(r.display.val, "block"); assert(/auto/.test(r.ox.val)); assert.strictEqual(r.mw.val, "100%");
  const ov = win(D, "overflow"); if (ov && cmp([ov.imp?1:0, ...ov.sp], [r.ox.imp?1:0, ...r.ox.sp]) > 0) assert(!/visible/.test(ov.val), "shorthand overflow:visible beats overflow-x: " + show(ov));
});
t("same holds on a standalone page with NO #app-main", () => {
  const D = doc.getElementById("SD"); assert.strictEqual(win(D, "display").val, "block"); assert(/auto/.test((win(D, "overflow-x")).val));
});
t("inner .katex keeps intrinsic width (max-width none, nowrap) so fractions are not squeezed", () => {
  const K = doc.getElementById("K"); assert.strictEqual(win(K, "max-width").val, "none"); assert.strictEqual(win(K, "white-space").val, "nowrap");
});
t("notebook ancestors may shrink to the card (min-width 0, max-width 100%)", () => {
  ["qx-hw-paper", "qx-hw-ink", "qx-hw-sol"].forEach((c) => { const e = doc.querySelector("#egSolPanel ." + c); assert.strictEqual(win(e, "min-width").val, "0", c); assert.strictEqual(win(e, "max-width").val, "100%", c); });
});
console.log("PASS " + n + "  (sheets parsed: " + sheets.length + ", declarations: " + decls.length + ")");
