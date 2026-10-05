/**
 * Server-side KaTeX for public /q/ pages.
 * Googlebot and SERP fetch the HTML; client JS is not enough.
 * Display-only. Never rewrite stored JSON.
 */
"use strict";

let katex = null;
try {
  katex = require("katex");
  try { require("katex/contrib/mhchem"); } catch (_) { /* mhchem optional */ }
} catch (_) {
  katex = null;
}

const MATH_RE = /\$\$([\s\S]{1,12000}?)\$\$|\\\[([\s\S]{1,12000}?)\\\]|\$(?!\$)((?:\\\$|[^$]){1,8000})\$|\\\(([\s\S]{1,8000}?)\\\)/g;

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function texToHtml(tex, display) {
  const t = String(tex || "").trim();
  if (!t) return "";
  if (!katex) return '<span class="tex">' + esc(t) + "</span>";
  try {
    return katex.renderToString(t, {
      displayMode: !!display,
      throwOnError: false,
      strict: "ignore",
      output: "htmlAndMathml",
      trust: false,
      minRuleThickness: 0.04
    });
  } catch (_) {
    return '<span class="tex">' + esc(t) + "</span>";
  }
}

function decodeBasic(t) {
  return String(t || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/* Display-only: keep \begin{aligned} as one math block even if inner $ broke. */
function prepTex(src) {
  let t = decodeBasic(src);
  t = t.replace(/\$?\s*\\begin\{(aligned|align\*?|gather\*?|eqnarray\*?|array)\}([\s\S]*?)\\end\{\1\}\s*\$?/g, function (_, env, inner) {
    const clean = String(inner || "").replace(/\$/g, "");
    return "$$\\begin{" + env + "}" + clean + "\\end{" + env + "}$$";
  });
  return t;
}

function holdMath(src) {
  const held = [];
  const re = new RegExp(MATH_RE.source, "g");
  const out = prepTex(src).replace(re, function (_full, d1, d2, i1, i2) {
    let html;
    if (d1 != null) html = texToHtml(d1, true);
    else if (d2 != null) html = texToHtml(d2, true);
    else if (i1 != null) html = texToHtml(i1, false);
    else html = texToHtml(i2, false);
    held.push(html);
    return "%%QXMATH" + (held.length - 1) + "%%";
  });
  return { out: out, held: held };
}

function restoreMath(s, held) {
  return String(s || "").replace(/%%QXMATH(\d+)%%/g, function (_, n) {
    return held[Number(n)] || "";
  }).replace(/\\ce\{([^{}]{0,400})\}/g, function (_m, inner) {
    return texToHtml("\\ce{" + inner + "}", false);
  });
}

function mathifyText(text) {
  const pack = holdMath(text);
  return restoreMath(esc(pack.out), pack.held);
}

function mathifyHtml(html) {
  const pack = holdMath(html);
  return restoreMath(pack.out, pack.held);
}

module.exports = {
  ready: !!katex,
  texToHtml: texToHtml,
  holdMath: holdMath,
  restoreMath: restoreMath,
  mathifyText: mathifyText,
  mathifyHtml: mathifyHtml
};
