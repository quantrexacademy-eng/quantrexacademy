"use strict";
const fs = require("fs");
const path = require("path");
const src = fs.readFileSync(path.join(__dirname, "..", "math-render.js"), "utf8");
if (!/Closed island \$x-axis\$/.test(src) && !/consume BOTH dollars/.test(src)) {
  console.error("FAIL axis park not updated");
  process.exit(1);
}
const AXIS = "(?:axis|axes|coordinate|intercept|intercepts|th|direction|component|bound|interval)s?";
function park(s) {
  return String(s || "")
    .replace(new RegExp("\\$([A-Za-z])\\$-(?=" + AXIS + "\\b)", "gi"), "\uE410$1\uE411")
    .replace(new RegExp("\\$([A-Za-z])\\s*[–—−-]\\s*(" + AXIS + ")\\$", "gi"), "\uE410$1\uE411$2")
    .replace(new RegExp("\\$([A-Za-z])\\s*[–—−-]\\s*(" + AXIS + ")\\b", "gi"), "\uE410$1\uE411$2");
}
function restore(s) {
  return String(s || "").replace(/\uE410([A-Za-z])\uE411/g, "$$$1$-");
}
function heal(s) {
  let out = restore(park(s));
  out = out.replace(
    /\$([A-Za-z])\s*[–—−-]\s*(axis|axes|coordinate|intercept|th)s?\b\$?/gi,
    (_, v, w) => "$" + v + "$-" + w
  );
  return out;
}

const samples = [
  ["Let the circle $x^{2}+y^{2}=4$ intersect $x-axis$ at the points $\\mathrm{A}(\\mathrm{a}, 0)$", "intersect $x$-axis at"],
  ["intersect $x$-axis at the points", "intersect $x$-axis at"],
  ["intersect $x–axis at the points $\\mathrm{A}$", "intersect $x$-axis at"],
  ["value of x = ____ m L (nearest", "mL"],
  ["<td>[4 pt]</td><td>E</td>", "E"]
];
function stripPt(s) {
  return String(s)
    .replace(/<t[dh][^>]*>\s*\[\s*[\d.]+\s*pt\s*\]\s*<\/t[dh]>/gi, "")
    .replace(/\[\s*[\d.]+\s*pt\s*\]/gi, "")
    .replace(/\bm\s+L\b/g, "mL");
}

let fail = 0;
const a = heal(samples[0][0]);
if (!a.includes(samples[0][1]) || /axis\$/.test(a)) {
  console.error("FAIL closed $x-axis$", a);
  fail++;
}
const b = heal(samples[1][0]);
if (!b.includes(samples[1][1])) {
  console.error("FAIL paired", b);
  fail++;
}
const c = heal(samples[2][0]);
if (!c.includes("$x$-axis") || /axis\$/.test(c.replace(/\$x\$-axis/g, ""))) {
  console.error("FAIL unclosed", c);
  fail++;
}
if (!/\$\\mathrm\{A\}/.test(a) && !/\\mathrm\{A\}/.test(a)) {
  console.error("FAIL mathrm eaten", a);
  fail++;
}
if (stripPt(samples[3][0]).indexOf("mL") < 0) {
  console.error("FAIL mL");
  fail++;
}
if (/4 pt/.test(stripPt(samples[4][0]))) {
  console.error("FAIL pt cell");
  fail++;
}
if (fail) process.exit(1);
console.log("OK axis heal", a.slice(0, 180));
