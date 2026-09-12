#!/usr/bin/env node
"use strict";
/**
 * MathML → TeX for Quantrex banks. Matching open/close tags (not a greedy regex).
 * Never invents academic keys. Used by bake + same logic copied into math-render.js.
 */

function escRe(name) {
  return String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findClose(str, tag, from) {
  const openRe = new RegExp("<" + escRe(tag) + "(?=[\\s>/])", "i");
  const closeRe = new RegExp("</" + escRe(tag) + "\\s*>", "i");
  let depth = 1;
  let j = from;
  while (j < str.length && depth > 0) {
    const next = str.indexOf("<", j);
    if (next < 0) return -1;
    const rest = str.slice(next);
    const cl = rest.match(closeRe);
    const op = rest.match(openRe);
    const clAt = cl && rest.indexOf(cl[0]) === 0;
    const opAt = op && rest.indexOf(op[0]) === 0 && !str.startsWith("</", next);
    if (clAt && (!opAt || true) && /^<\//.test(rest)) {
      depth--;
      j = next + cl[0].length;
      if (depth === 0) return next;
    } else if (opAt && !/^<\//.test(rest)) {
      const om = rest.match(/^<[a-zA-Z][\w:-]*\b[^>]*>/);
      if (om && /\/>$/.test(om[0])) j = next + om[0].length;
      else {
        depth++;
        j = next + (om ? om[0].length : 1);
      }
    } else {
      j = next + 1;
    }
  }
  return -1;
}

function mmlDirectChildren(html) {
  const s = String(html || "");
  const kids = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] !== "<") { i++; continue; }
    if (s.startsWith("</", i)) { i++; continue; }
    const m = s.slice(i).match(/^<([a-zA-Z][\w:-]*)(\s[^>]*)?>/);
    if (!m) { i++; continue; }
    const name = m[1];
    const start = i;
    i += m[0].length;
    if (/\/>$/.test(m[0])) {
      kids.push(s.slice(start, i));
      continue;
    }
    const closeAt = findClose(s, name, i);
    if (closeAt < 0) {
      kids.push(s.slice(start));
      break;
    }
    const closeM = s.slice(closeAt).match(new RegExp("^</" + escRe(name) + "\\s*>", "i"));
    i = closeAt + (closeM ? closeM[0].length : 0);
    kids.push(s.slice(start, i));
  }
  return kids;
}

function replaceTag(s, tag, fn) {
  const str = String(s || "");
  const openRe = new RegExp("<" + escRe(tag) + "\\b([^>]*)>", "i");
  let out = "";
  let i = 0;
  while (i < str.length) {
    const slice = str.slice(i);
    const m = slice.match(openRe);
    if (!m || m.index == null) {
      out += slice;
      break;
    }
    out += slice.slice(0, m.index);
    const abs = i + m.index;
    const afterOpen = abs + m[0].length;
    if (/\/>$/.test(m[0])) {
      out += fn(m[1] || "", "");
      i = afterOpen;
      continue;
    }
    const closeAt = findClose(str, tag, afterOpen);
    if (closeAt < 0) {
      out += str.slice(abs);
      break;
    }
    const body = str.slice(afterOpen, closeAt);
    const closeM = str.slice(closeAt).match(new RegExp("^</" + escRe(tag) + "\\s*>", "i"));
    out += fn(m[1] || "", body);
    i = closeAt + (closeM ? closeM[0].length : 0);
  }
  return out;
}

function unwrap(el) {
  const s = String(el || "").trim();
  const m = s.match(/^<([a-zA-Z][\w:-]*)\b[^>]*>([\s\S]*)<\/\1\s*>$/i);
  return m ? m[2] : s;
}

const MML_CHAR = {
  "α": "\\alpha", "β": "\\beta", "γ": "\\gamma", "δ": "\\delta", "θ": "\\theta",
  "λ": "\\lambda", "μ": "\\mu", "π": "\\pi", "σ": "\\sigma", "φ": "\\phi", "ω": "\\omega",
  "Δ": "\\Delta", "∈": "\\in", "∉": "\\notin", "≤": "\\le", "≥": "\\ge", "≠": "\\ne",
  "≈": "\\approx", "∞": "\\infty", "×": "\\times", "÷": "\\div", "±": "\\pm",
  "·": "\\cdot", "−": "-", "→": "\\to", "ℕ": "\\mathbb{N}", "ℤ": "\\mathbb{Z}",
  "ℝ": "\\mathbb{R}", "ℚ": "\\mathbb{Q}", "ℂ": "\\mathbb{C}", "…": "\\ldots"
};

function decodeText(t) {
  let s = String(t || "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&infin;|&infin/gi, "\\infty")
    .replace(/&rarr;|&rightarrow;/gi, "\\to")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const n = parseInt(h, 16);
      try { return String.fromCharCode(n); } catch (e) { return ""; }
    })
    .replace(/&#(\d+);/g, (_, d) => {
      const n = parseInt(d, 10);
      try { return String.fromCharCode(n); } catch (e) { return ""; }
    });
  let out = "";
  for (let i = 0; i < s.length; i++) {
    out += MML_CHAR[s[i]] != null ? (" " + MML_CHAR[s[i]] + " ") : s[i];
  }
  return out.replace(/\s+/g, " ").trim();
}

function mathmlToTex(inner) {
  let s = String(inner || "");

  s = s.replace(/<mtable\b[^>]*>([\s\S]*?)<\/mtable>/gi, (_, body) => {
    const rows = [...String(body).matchAll(/<m(?:labeled)?tr\b[^>]*>([\s\S]*?)<\/m(?:labeled)?tr>/gi)];
    if (!rows.length) return mathmlToTex(body);
    const texRows = rows.map((r) => {
      const cells = mmlDirectChildren(r[1]).filter((c) => /^<mtd\b/i.test(c.trim()));
      if (!cells.length) return mathmlToTex(r[1]);
      return cells.map((c) => mathmlToTex(unwrap(c))).join(" & ");
    }).filter(Boolean);
    if (!texRows.length) return mathmlToTex(body);
    const two = texRows.every((t) => t.includes(" & "));
    if (two) return "\\begin{cases}" + texRows.join(" \\\\ ") + "\\end{cases}";
    return "\\begin{array}{ll}" + texRows.join(" \\\\ ") + "\\end{array}";
  });

  function kidsTex(body) {
    return mmlDirectChildren(body).map((k) => mathmlToTex(unwrap(k)));
  }

  s = replaceTag(s, "munderover", (_, body) => {
    const k = kidsTex(body);
    if (k.length >= 3) {
      if (/lim/i.test(k[0])) return "\\lim_{" + k[1] + " \\to " + k[2] + "}";
      return "\\mathop{" + k[0] + "}_{" + k[1] + "}^{" + k[2] + "}";
    }
    return mathmlToTex(body);
  });
  s = replaceTag(s, "munder", (_, body) => {
    const k = kidsTex(body);
    if (k.length >= 2) {
      if (/lim/i.test(k[0])) return "\\lim_{" + k[1] + "}";
      return "\\mathop{" + k[0] + "}_{" + k[1] + "}";
    }
    return mathmlToTex(body);
  });
  s = replaceTag(s, "mover", (_, body) => {
    const k = kidsTex(body);
    if (k.length >= 2) return "\\overset{" + k[1] + "}{" + k[0] + "}";
    return mathmlToTex(body);
  });
  s = replaceTag(s, "msubsup", (_, body) => {
    const k = kidsTex(body);
    if (k.length >= 3) return "{" + k[0] + "}_{" + k[1] + "}^{" + k[2] + "}";
    return mathmlToTex(body);
  });
  s = replaceTag(s, "mfenced", (attrs, body) => {
    const o = /open\s*=\s*["']([^"']*)["']/i.exec(attrs || "");
    const c = /close\s*=\s*["']([^"']*)["']/i.exec(attrs || "");
    const L = (o && o[1] != null) ? o[1] : "(";
    const R = (c && c[1] != null) ? c[1] : ")";
    const map = { "(": "(", ")": ")", "[": "[", "]": "]", "{": "\\{", "}": "\\}" };
    return "\\left" + (map[L] || L) + mathmlToTex(body) + "\\right" + (map[R] || R);
  });
  s = replaceTag(s, "mfrac", (_, body) => {
    const k = kidsTex(body);
    if (k.length >= 2) return "\\dfrac{" + k[0] + "}{" + k[1] + "}";
    return mathmlToTex(body);
  });
  s = replaceTag(s, "msup", (_, body) => {
    const k = kidsTex(body);
    if (k.length >= 2) return "{" + k[0] + "}^{" + k[1] + "}";
    return mathmlToTex(body);
  });
  s = replaceTag(s, "msub", (_, body) => {
    const k = kidsTex(body);
    if (k.length >= 2) return "{" + k[0] + "}_{" + k[1] + "}";
    return mathmlToTex(body);
  });
  s = replaceTag(s, "msqrt", (_, body) => "\\sqrt{" + mathmlToTex(body) + "}");
  s = replaceTag(s, "mrow", (_, body) => mathmlToTex(body));

  s = s.replace(/<mtext\b[^>]*>([\s\S]*?)<\/mtext>/gi, (_, t) => {
    const v = decodeText(String(t || "").replace(/<[^>]+>/g, ""));
    return v ? "\\text{" + v + "}" : "";
  });
  s = s.replace(/<mi\b([^>]*)>([\s\S]*?)<\/mi>/gi, (_, attrs, t) => {
    const v = decodeText(String(t || "").replace(/<[^>]+>/g, ""));
    if (/double-struck|mathvariant\s*=\s*["']double/i.test(attrs || "") && /^[A-Z]$/.test(v)) {
      return "\\mathbb{" + v + "}";
    }
    return v;
  });
  s = s.replace(/<mn\b[^>]*>([\s\S]*?)<\/mn>/gi, (_, t) => decodeText(String(t || "").replace(/<[^>]+>/g, "")));
  s = s.replace(/<mo\b[^>]*>([\s\S]*?)<\/mo>/gi, (_, t) => {
    const v = decodeText(String(t || "").replace(/<[^>]+>/g, ""));
    if (!v) return "";
    if (/^\\/.test(v)) return " " + v + " ";
    if (/^[,;:]$/.test(v)) return v + " ";
    if (/^[+\-=]$/.test(v)) return " " + v + " ";
    return " " + v + " ";
  });

  s = s.replace(/<\/?(?:math|semantics|annotation(?:-xml)?|mstyle|mspace|mphantom)[^>]*>/gi, "");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  s = s.replace(/:\s*\\to\s*R\s*\\to/g, ":\\mathbb{R}\\to ");
  s = s.replace(/:\s*\\rightarrow\s*R\s*\\rightarrow/g, ":\\mathbb{R}\\to ");
  s = s.replace(/\\sqrt\{((?:[^{}]|\{[^{}]*\})*)\s-\s*\}\\sqrt\{/g, "\\sqrt{$1}-\\sqrt{");
  return s;
}

function texCore(tex) {
  return String(tex || "")
    .replace(/\\(?:text|mathrm|operatorname)\s*\{[^{}]*\}/g, "")
    .replace(/[. ,;:]/g, "")
    .trim();
}

function emitTex(inner, bare) {
  const tex = mathmlToTex(inner);
  if (!texCore(tex)) return tex || "";
  return bare ? tex : ("$" + tex + "$");
}

function convertHtml(html, depth, bare) {
  let out = String(html || "");
  const orig = out;
  depth = depth || 0;
  if (depth > 12) return { html: out, changed: false };
  if (!/<math\b/i.test(out) && !/<(?:mi|mo|mn)\b/i.test(out)) {
    return { html: out, changed: false };
  }
  let guard = 0;
  while (/<math\b/i.test(out) && guard++ < 12) {
    const next = replaceTag(out, "math", (_, inner) => {
      if (/<math\b/i.test(inner) && depth < 12) {
        inner = convertHtml(inner, depth + 1, true).html;
      }
      return emitTex(inner, bare);
    });
    if (next === out) break;
    out = next;
  }
  if (!bare) {
    out = out.replace(/((?:<(?:mi|mo|mn|mtext|msup|msub|mfrac)[^>]*>[\s\S]*?<\/(?:mi|mo|mn|mtext|msup|msub|mfrac)>\s*){2,})/gi, (m) => emitTex(m, false));
    out = out.replace(/<math\b[^>]*\/>/gi, "");
    out = out.replace(/<\/?math\b[^>]*>/gi, "");
    out = out.replace(/<(?:mspace|mphantom)[^>]*\/?>/gi, "");
  }
  return { html: out, changed: out !== orig };
}

module.exports = { mathmlToTex, convertHtml, mmlDirectChildren };

if (require.main === module && process.argv[2] === "selftest") {
  const fs = require("fs");
  const path = require("path");
  const bank = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "banks", "chapters", "jee_main", "mathematics", "limits.json"), "utf8"));
  for (const id of [35720, 35704]) {
    const q = (bank.questions || []).find((x) => x.id === id);
    const r = convertHtml(q.q);
    console.log("====", id);
    console.log(r.html.slice(0, 800));
    console.log("OPT0", convertHtml(q.options[0]).html);
  }
}
