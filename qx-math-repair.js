/* qxmd330 \u2014 QxMathRepair: last-line safety net for $-delimited question/solution HTML.
 * Wraps Mx.html: if the legacy pipeline output leaks raw TeX / KaTeX markup / stray $,
 * the input is re-rendered by a small deterministic renderer:
 *   - unpaired / misplaced $ repaired per line, \left/\right balanced (fallback: plain delimiters)
 *   - plain text HTML-escaped (only whitelisted tags pass), never re-renders .katex HTML
 *   - "\\" outside math -> line break, stray textual \Since \Thus \Case -> words
 *   - KaTeX throwOnError:false. No data or format changes. */
(function (w) {
  "use strict";
  if (!w || w.QxMathRepair) return;
  var TAG_RE = /<\/?(?:br|b|i|u|em|strong|sup|sub|p|div|span|img|table|thead|tbody|tr|td|th|ul|ol|li|center|font|blockquote|hr|small|big|code|pre|figure|figcaption|a|svg|path|g|text|line|rect|circle|polyline|polygon)\b(?:(?:[^<>"']|"[^"]*"|'[^']*')*|[^<>]*)>/gi;
  var URL_RE = /(?:https?:\/\/|\/api\/proxy-image\?)[^\s<>"'\u0002\u0003)]+/g;
  var KATEX_HTML = /class\s*=\s*["'][^"']*\bkatex\b/i;
  var LEAK_RE = /spanclass|span\s*class\s*=|katex-(?:html|display|mathml)|aria-hidden|\\[a-zA-Z]{2,}|\\\\|\$/;
  var PROSE_IN_MATH = /(?<![\\a-zA-Z])(?:[a-zA-Z]{2,}\s+[a-zA-Z]{2,}\s+[a-zA-Z]{2,}|[a-zA-Z]{6,})(?![a-zA-Z])/g;
  var LEAK_G = new RegExp(LEAK_RE.source, "g");
  var cache = new Map();
  var MAXC = 800;

  function esc(s) {
    return String(s).replace(/&(?!(?:[a-zA-Z]{2,8}|#\d{1,6}|#x[0-9a-fA-F]{1,6});)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  var ENT = { sdot: "\\cdot ", there4: "\\therefore ", because: "\\because ", hellip: "\\ldots ", rarr: "\\rightarrow ", larr: "\\leftarrow ", harr: "\\leftrightarrow ", rArr: "\\Rightarrow ", lArr: "\\Leftarrow ", hArr: "\\Leftrightarrow ", le: "\\le ", ge: "\\ge ", ne: "\\ne ", plusmn: "\\pm ", mnplus: "\\mp ", divide: "\\div ", infin: "\\infty ", asymp: "\\approx ", approx: "\\approx ", prop: "\\propto ", sum: "\\sum ", prod: "\\prod ", int: "\\int ", nabla: "\\nabla ", part: "\\partial ", isin: "\\in ", notin: "\\notin ", cap: "\\cap ", cup: "\\cup ", sub: "\\subset ", sup: "\\supset ", perp: "\\perp ", ang: "\\angle ", micro: "\\mu ", sup2: "^{2}", sup3: "^{3}", sup1: "^{1}", frac12: "\\frac{1}{2}", frac14: "\\frac{1}{4}", frac34: "\\frac{3}{4}", lt: "<", gt: ">", nbsp: " ", ensp: " ", emsp: " ", thinsp: " ", ndash: "-", mdash: "-", minus: "-", middot: "\\cdot ", bull: "\\bullet ", rsquo: "'", lsquo: "'", ldquo: "''", rdquo: "''", prime: "'", Prime: "''", equiv: "\\equiv ", forall: "\\forall ", exist: "\\exists ", empty: "\\emptyset ", oplus: "\\oplus ", otimes: "\\otimes ", cong: "\\cong ", sim: "\\sim ", lang: "\\langle ", rang: "\\rangle ", lceil: "\\lceil ", rceil: "\\rceil ", lfloor: "\\lfloor ", rfloor: "\\rfloor " };
  function decodeEnt(s) {
    return String(s).replace(/&(#x[0-9a-fA-F]{1,6}|#\d{1,6}|[a-zA-Z][a-zA-Z0-9]{1,8});/g, function (m, n) {
      if (n[0] === "#") { var c = n[1] === "x" || n[1] === "X" ? parseInt(n.slice(2), 16) : parseInt(n.slice(1), 10); if (c === 39) return "'"; if (c === 34) return '"'; return c > 31 && c < 1114112 ? String.fromCodePoint(c) : " "; }
      if (n === "amp") return "&";
      if (ENT[n] != null) return ENT[n];
      if (/^(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Phi|Psi|Omega)$/.test(n)) return "\\" + n + " ";
      if (n === "times") return "\\times ";
      if (n === "deg") return "^{\\circ}";
      return m;
    });
  }
  var TEXTCMD = /\\(Since|Thus|Hence|Therefore|Case|Now|Also|So|Then|Let|Given|Comparing|However|The|Intersection|Taking|Finally|Using|Substituting|Evaluating|Equating|Answer|Note|Here|We|For|If|When|From|Put|i\.e)\b/g;
  function textFix(s) {
    // text outside math: "\\" -> line break marker, stray \Word -> Word
    return s.replace(/\\\\/g, "\u0001").replace(TEXTCMD, "$1");
  }
  var PROSE = /\s+(?:(?:is|are|and|then|be|we|so|where|which|for|of|lies|gives|do|does|has|have|with|in|the)(?=\s|$)|[A-Za-z]{3,}[,.:;]?\s+[A-Za-z]{3,}\b)/;
  function looksTexy(s) {
    return /\\[a-zA-Z]+|[\^_=<>]|\d/.test(s);
  }
  // Fix one line's $ delimiters (line already free of HTML tags).
  function fixDollars(line) {
    var s = line;
    // glued "$" right before \left / \right that breaks a math run: "\log$\left(" , "($\left|"
    s = s.replace(/([^\s$>])\$(?=\\(?:left|right)\b)/g, "$1");
    s = s.replace(/(\\(?:rightarrow|to|in|times|cdot|le|ge|leq|geq|subset|subseteq)|[=+])\s*\$(?=\\[a-zA-Z]|\{)/g, "$1 ");
    s = s.replace(/\$(\\text\s*\{[^{}$]*\})\$/g, "$1");
    s = dropInnerDollars(s);
    // "$$" display kept; count single $
    var n = (s.replace(/\$\$/g, "").match(/\$/g) || []).length;
    var guard = 0;
    s = s.replace(/([^\s$])\$\$(?=\\)/g, "$1");
    return searchFix(s);
  }
  var CONNECT = /(?<![\\a-zA-Z])(?:and|is|are|then|where|be|we|for|which|so|the|gives|lies)(?![a-zA-Z])/g;
  function badness(s) {
    var parts = s.split("$"), bad = 0;
    if ((parts.length - 1) % 2) bad += 3;
    for (var i = 0; i < parts.length; i++) {
      var t = parts[i];
      if (i % 2 === 0) {
        bad += (t.replace(TEXTCMD, "").match(/\\[a-zA-Z]{2,}|[\^_]\{/g) || []).length * 2;
      } else {
        var a = t.replace(/\\(?:text|mathrm|textrm|mbox|operatorname|textbf|mathbf|rm)\s*\{[^{}]*\}/g, " ");
        bad += (a.match(PROSE_IN_MATH) || []).length * 2 + (a.match(CONNECT) || []).length * 2;
        if (!t.trim()) bad += 1;
        var br = (t.match(/\{/g) || []).length - (t.match(/\}/g) || []).length;
        if (br) bad += 2;
        var lr = (t.match(/\\left(?![a-zA-Z])/g) || []).length - (t.match(/\\right(?![a-zA-Z])/g) || []).length;
        if (lr) bad += 1;
      }
    }
    return bad;
  }
  function searchFix(s) {
    if (s.indexOf("$") < 0 || s.length > 4000 || Date.now() > deadline) return s;
    var work = 0;
    s = s.replace(/\$\$/g, "\u0004");
    var best = s, bb = badness(s);
    for (var round = 0; round < 6 && bb > 0 && work < 6000 && Date.now() < deadline; round++) {
      var cands = [], k, m;
      cands.push(best + "$");
      var lead = best.match(/^\s*/)[0].length; cands.push(best.slice(0, lead) + "$" + best.slice(lead));
      var g = new RegExp(PROSE.source, "g");
      while ((m = g.exec(best))) {
        var e = m.index + m[0].length; while (e < best.length && /\s/.test(best[e])) e++;
        // skip the prose words to the next math-looking char
        var r = best.slice(e).search(/[\\(\[{0-9^_=]|\b[a-zA-Z]\b/); var e2 = r < 0 ? -1 : e + r;
        cands.push(best.slice(0, m.index) + "$" + best.slice(m.index));
        cands.push(best.slice(0, e) + "$" + best.slice(e));
        if (e2 > 0) cands.push(best.slice(0, m.index) + "$" + best.slice(m.index, e2) + "$" + best.slice(e2));
        if (g.lastIndex === m.index) g.lastIndex++;
      }
      var tb = /\\(?!(?:Since|Thus|Hence|Therefore|Case|Now|Also|So|Then|Let|Given)\b)[a-zA-Z]{2,}/g;
      while ((m = tb.exec(best))) cands.push(best.slice(0, m.index) + "$" + best.slice(m.index));
      for (k = 0; k < best.length; k++) if (best[k] === "$") cands.push(best.slice(0, k) + best.slice(k + 1));
      var improved = false;
      work += cands.length;
      for (k = 0; k < cands.length; k++) { var cb = badness(cands[k]); if (cb < bb) { bb = cb; best = cands[k]; improved = true; } }
      if (!improved) break;
    }
    if (((best.match(/\$/g) || []).length) % 2) best += "$";
    return best.replace(/\u0004/g, "$$$$");
  }
  // A "$" met while a math run still has an open {, \left or \begin is noise: drop it.
  function dropInnerDollars(s) {
    var out = "", inM = false, depth = 0, i = 0, L = s.length;
    while (i < L) {
      var ch = s[i];
      if (ch === "\\") {
        var m = /^\\([a-zA-Z]+)/.exec(s.slice(i, i + 12));
        if (m) {
          if (inM) {
            if (m[1] === "left" || m[1] === "begin") depth++;
            else if ((m[1] === "right" || m[1] === "end") && depth > 0) depth--;
          }
          out += m[0]; i += m[0].length; continue;
        }
        out += s.substr(i, 2); i += 2; continue;
      }
      if (ch === "$") {
        if (s[i + 1] === "$") { out += "$$"; i += 2; inM = !inM; depth = 0; continue; }
        if (!inM) { inM = true; depth = 0; out += ch; }
        else if (depth > 0) { /* spurious */ }
        else { inM = false; out += ch; }
        i++; continue;
      }
      if (inM) { if (ch === "{") depth++; else if (ch === "}" && depth > 0) depth--; }
      out += ch; i++;
    }
    return out;
  }
  function balanceLR(tex) {
    var l = (tex.match(/\\left(?![a-zA-Z])/g) || []).length;
    var r = (tex.match(/\\right(?![a-zA-Z])/g) || []).length;
    if (l === r) return tex;
    return tex.replace(/\\left(?![a-zA-Z])\s*\.?/g, "").replace(/\\right(?![a-zA-Z])\s*\.?/g, "");
  }
  // ---- TeX repair helpers (math content only; never used on URLs / attributes) ----
  var deadline = 0;
  var STATS = { fixed: 0, plain: 0, errors: [] };
  function logErr(tex, e) {
    try {
      if (STATS.errors.length < 300) STATS.errors.push({ m: String(e && (e.rawMessage || e.message) || e).slice(0, 160), t: String(tex).slice(0, 120) });
    } catch (_) { /* */ }
  }

  function stripEsc(s) { return s.replace(/\\[\\{}$&_#%]/g, "\u0001\u0001"); }
  function balanceBraces(tex) {
    var out = "", depth = 0, i, ch, L = tex.length;
    for (i = 0; i < L; i++) {
      ch = tex[i];
      if (ch === "\\") { out += ch + (i + 1 < L ? tex[i + 1] : ""); i++; continue; }
      if (ch === "{") { depth++; out += ch; continue; }
      if (ch === "}") { if (depth > 0) { depth--; out += ch; } continue; }
      out += ch;
    }
    while (depth-- > 0) out += "}";
    return out;
  }
  function balanceEnvs(tex) {
    var re = /\\(begin|end)\s*\{([a-zA-Z*]+)\}/g, st = [], m, kill = [];
    while ((m = re.exec(tex))) {
      if (m[1] === "begin") st.push(m[2]);
      else if (st.length && st[st.length - 1] === m[2]) st.pop();
      else kill.push([m.index, m[0].length]);
    }
    for (var k = kill.length - 1; k >= 0; k--) tex = tex.slice(0, kill[k][0]) + tex.slice(kill[k][0] + kill[k][1]);
    while (st.length) tex += "\\end{" + st.pop() + "}";
    return tex;
  }
  function fixTex(tex) {
    tex = tex.replace(/\$/g, " ").replace(/\u0002\d+\u0003/g, " ").replace(/\u0005/g, " ");
    // blanks "____" typed inside math
    tex = tex.replace(/(?:_\s*){2,}/g, "\\underline{\\hspace{2em}}");
    if (!/\\begin\s*\{/.test(tex)) tex = tex.replace(/(^|[^\\])&/g, "$1 ").replace(/(^|[^\\])&/g, "$1 ");
    tex = tex.replace(/\\(?:displaystyle|textstyle)\s*(?=$|\})/g, "");
    tex = balanceBraces(tex);
    tex = balanceEnvs(tex);
    return tex;
  }
  function validPrefix(K, name) {
    for (var n = name.length - 1; n >= 2; n--) {
      try { K.renderToString("\\" + name.slice(0, n), { throwOnError: true, strict: "ignore" }); return n; } catch (_) { /* */ }
    }
    return 0;
  }
  function patchTex(K, tex, e, tried) {
    var msg = String(e && (e.rawMessage || e.message) || ""), p = e && typeof e.position === "number" ? e.position : tex.length, n = (e && e.length) || 1, m, key;
    if (p < 0 || p > tex.length) p = tex.length;
    key = msg.replace(/\s+/g, " ").slice(0, 60) + "@" + p;
    var t = tried[key] = (tried[key] || 0) + 1;
    if (t > 2) return null;
    if ((m = /^Undefined control sequence: \\([a-zA-Z]+)/.exec(msg))) {
      var k = validPrefix(K, m[1]);
      if (k && t === 1) return tex.slice(0, p + 1 + k) + " " + tex.slice(p + 1 + k);
      return tex.slice(0, p) + "\\text{" + m[1] + "}" + tex.slice(p + 1 + m[1].length);
    }
    if (/^Expected group after/.test(msg)) {
      if (t === 1) return tex.slice(0, p + n) + "{}" + tex.slice(p + n);
      return tex.slice(0, p) + tex.slice(p + n);
    }
    if (/^Double (?:sub|super)script/.test(msg)) return tex.slice(0, p) + "{}" + tex.slice(p);
    if (/^Unexpected character/.test(msg)) return tex.slice(0, p) + " " + tex.slice(p + 1);
    if (/^Can't use function '\$'/.test(msg)) return tex.slice(0, p) + " " + tex.slice(p + 1);
    if (/^Limit controls/.test(msg)) return tex.replace(/\\(?:no)?limits/g, "");
    if (/got function '\\(?:left|right)' with no arguments|^Invalid delimiter|Expected '\\right'|Expected delimiter|\\left|\\right/.test(msg) && /left|right|delimiter/i.test(msg)) {
      var bl = balanceLR(tex);
      if (bl !== tex) return bl;
      return tex.replace(/\\left(?![a-zA-Z])\s*[^\s]?/g, "").replace(/\\right(?![a-zA-Z])\s*[^\s]?/g, "");
    }
    if (/^Expected '(.*)', got '(.*)'/.test(msg) || /^Expected & or \\\\ or \\cr or \\end/.test(msg) || /^Unexpected end of input|^Expected '\}'/.test(msg)) {
      var mm = /^Expected '(.*)', got '(.*)'/.exec(msg), got = mm ? mm[2] : "EOF", exp = mm ? mm[1] : "";
      if (/^Expected & or/.test(msg)) { var b = /\\begin\s*\{([a-zA-Z*]+)\}(?![\s\S]*\\begin\s*\{)/.exec(tex); return tex + (b ? "\\end{" + b[1] + "}" : ""); }
      if (got === "&") return tex.slice(0, p) + " " + tex.slice(p + 1);
      if (exp === "}" || /expected '\}'/.test(msg)) return got === "EOF" || p >= tex.length ? tex + "}" : tex.slice(0, p) + "}" + tex.slice(p);
      if (got === "}" || got === "{" || got === "#" || got === "\\\\" || got === "_" || got === "^") return tex.slice(0, p) + tex.slice(p + Math.max(1, n));
      if (got === "\\end" || got === "\\right") return tex.slice(0, p) + tex.slice(p + 4 + (got === "\\right" ? 2 : 0)).replace(/^\s*\{[a-zA-Z*]+\}/, "");
      if (/^\\right/.test(exp) || /\\right/.test(exp)) return balanceLR(tex) !== tex ? balanceLR(tex) : tex + "\\right.";
      if (got === "EOF") return tex + (exp && exp.length < 3 ? exp : "");
      return tex.slice(0, p) + tex.slice(p + Math.max(1, n));
    }
    return null;
  }
  function plainTex(tex) {
    var G = { alpha: "\u03b1", beta: "\u03b2", gamma: "\u03b3", delta: "\u03b4", epsilon: "\u03b5", varepsilon: "\u03b5", theta: "\u03b8", lambda: "\u03bb", mu: "\u03bc", pi: "\u03c0", rho: "\u03c1", sigma: "\u03c3", tau: "\u03c4", phi: "\u03c6", omega: "\u03c9", Delta: "\u0394", Omega: "\u03a9", Sigma: "\u03a3", Pi: "\u03a0", Phi: "\u03a6", times: "\u00d7", cdot: "\u00b7", div: "\u00f7", pm: "\u00b1", mp: "\u2213", le: "\u2264", leq: "\u2264", ge: "\u2265", geq: "\u2265", ne: "\u2260", neq: "\u2260", approx: "\u2248", infty: "\u221e", rightarrow: "\u2192", to: "\u2192", leftarrow: "\u2190", Rightarrow: "\u21d2", Leftrightarrow: "\u21d4", leftrightarrow: "\u2194", therefore: "\u2234", because: "\u2235", circ: "\u00b0", degree: "\u00b0", ldots: "\u2026", cdots: "\u2026", partial: "\u2202", nabla: "\u2207", int: "\u222b", sum: "\u03a3", sqrt: "\u221a", in: "\u2208", subset: "\u2282", cup: "\u222a", cap: "\u2229", angle: "\u2220", perp: "\u22a5", propto: "\u221d" };
    var s = String(tex).replace(/\$/g, " ").replace(/\\(?:left|right)(?![a-zA-Z])\s*[.]?/g, "")
      .replace(/\\(?:d|t|c)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)").replace(/\\(?:text|mathrm|mathbf|textbf|textrm|mathit|operatorname|boldsymbol|overrightarrow|vec|hat|bar|overline|underline)\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\(?:begin|end)\s*\{[a-zA-Z*]+\}/g, " ").replace(/\\\\/g, " ").replace(/\\[,;:! ]/g, " ").replace(/\\([a-zA-Z]+)/g, function (_, c) { return G[c] != null ? G[c] : (/^(?:sin|cos|tan|cot|sec|csc|log|ln|lim|exp|min|max)$/.test(c) ? c : ""); })
      .replace(/[{}]/g, "").replace(/\\/g, "").replace(/&/g, " ").replace(/\s+/g, " ");
    return s;
  }
  function kx(tex, display) {
    var K = w.katex;
    tex = decodeEnt(tex).replace(/\u0001/g, "\\\\")
      .replace(/\^\{\s*"\s*\}/g, "^{''}").replace(/\^\{\s*'(?:\s*')+\s*\}/g, function (x) { return "^{" + x.replace(/[^']/g, "") + "}"; }).replace(/"/g, "''")
      .replace(/\\overset\s*\{\s*\^\s*\}\s*\{/g, "\\hat{")
      .replace(/\\mathrm(?:\s*\\mathrm)+/g, "\\mathrm")
      .replace(/\\mathrm(?=\s*[^\s{\\])/g, "")
      .replace(/(\\begin\{(?:array|matrix|pmatrix|vmatrix|bmatrix|cases|aligned)\}[\s\S]*?)\\end/g, function (x) { return x.replace(/([^\\])\\(?=[A-Z0-9](?![a-zA-Z]))/g, "$1\\\\"); });
    if (!K || !K.renderToString) return '<span class="qx-math-fallback">' + esc(plainTex(tex)) + "</span>";
    var opt = { displayMode: !!display, throwOnError: true, strict: "ignore", trust: false, maxExpand: 400 }, lastErr = null;
    try { return K.renderToString(tex, opt); } catch (e0) { lastErr = e0; }
    var t2 = fixTex(tex), tried = {}, i;
    for (i = 0; i < 12 && t2 != null && Date.now() < deadline + 2000; i++) {
      try { var r = K.renderToString(t2, opt); STATS.fixed++; return r; } catch (e) { lastErr = e; t2 = patchTex(K, t2, e, tried); }
    }
    logErr(tex, lastErr);
    try { var bl = balanceLR(fixTex(tex)); return K.renderToString(bl, opt); } catch (_) { /* */ }
    STATS.plain++;
    return '<span class="qx-math-fallback">' + esc(plainTex(tex)) + "</span>";
  }
  // bare TeX left in prose (no $): wrap maximal "mathy" token runs as inline math (brace / \left / \begin aware)
  var MATHY = /\\(?!(?:Since|Thus|Hence|Therefore|Case|Now|Also|So|Then|Let|Given|However|The)\b)[a-zA-Z]+|[\^_{}]|\\[{}|]/;
  function openness(s) {
    var t = s.replace(/\\[{}]/g, "");
    return (t.match(/\{/g) || []).length - (t.match(/\}/g) || []).length
      + (t.match(/\\left(?![a-zA-Z])/g) || []).length - (t.match(/\\right(?![a-zA-Z])/g) || []).length
      + (t.match(/\\begin\s*\{/g) || []).length - (t.match(/\\end\s*\{/g) || []).length;
  }
  function bareTex(text) {
    if (!/\\[a-zA-Z]{2,}|[\^_]\{/.test(text)) return null;
    var toks = text.split(/(\s+)/), out = [], run = [], hasM = false, open = 0;
    function isProse(t) { return !MATHY.test(t) && /^[A-Za-z]{2,}[,.:;]?$/.test(t); }
    function flush() {
      if (!run.length) return;
      var tail = [], lead = [];
      if (openness(run.join("")) === 0) {
        while (run.length && (/^\s+$/.test(run[run.length - 1]) || isProse(run[run.length - 1]))) tail.unshift(run.pop());
        while (run.length && (/^\s+$/.test(run[0]) || isProse(run[0]))) lead.push(run.shift());
      } else {
        while (run.length && /^\s+$/.test(run[run.length - 1])) tail.unshift(run.pop());
      }
      out.push({ t: lead.join("") });
      if (run.length) {
        var m = run.join(""), pm = m.match(/[,.;:]+$/), pun = pm ? pm[0] : "";
        if (pun) m = m.slice(0, -pun.length);
        if (hasM) out.push({ m: m }); else out.push({ t: m });
        if (pun) out.push({ t: pun });
      }
      out.push({ t: tail.join("") });
      run = []; hasM = false; open = 0;
    }
    for (var i = 0; i < toks.length; i++) {
      var tk = toks[i];
      if (/^\s+$/.test(tk) || !tk) { if (run.length) run.push(tk); else out.push({ t: tk }); continue; }
      var isM = MATHY.test(tk), isShort = /^(?:\\\\|&|[A-Za-z]|\d+(?:\.\d+)?|[-+=<>()\[\]|,.\u222a\u2229\u2208\u2264\u2265\u2260\u2192\u00d7\u00f7\u00b7]+|[A-Za-z]?[()\[\]0-9,+\-=]+[A-Za-z]?)$/.test(tk);
      if (isM) { run.push(tk); hasM = true; open = Math.max(0, open + openness(tk)); }
      else if (run.length && (isShort || open > 0)) { run.push(tk); open = Math.max(0, open + openness(tk)); }
      else { flush(); out.push({ t: tk }); }
    }
    flush();
    return out;
  }
  function textOut(raw) {
    var envRe = /\\begin\{([a-zA-Z*]+)\}[\s\S]*?\\end\{\1\}/g, em, h0 = "", j0 = 0, any = false;
    while ((em = envRe.exec(raw))) { any = true; h0 += textOut1(raw.slice(j0, em.index)) + kx(em[0].replace(/\$/g, ""), true); j0 = envRe.lastIndex; }
    return any ? h0 + textOut1(raw.slice(j0)) : textOut1(raw);
  }
  function textOut1(raw) {
    var t = textFix(raw).replace(/\$/g, "");
    var parts = bareTex(t);
    if (!parts) return esc(t).replace(/\u0001/g, "<br>");
    var h = "";
    for (var i = 0; i < parts.length; i++) {
      var x = parts[i];
      if (x.m != null) h += kx(x.m, false);
      else h += esc(x.t).replace(/\u0001/g, "<br>");
    }
    return h;
  }
  // math chunk that may contain parked tags (\u0002n\u0003): render the pieces, keep the tags out of the math
  function mathChunk(tex, disp) {
    if (tex.indexOf("\u0002") < 0) return kx(tex, disp);
    var parts = tex.split(/(\u0002\d+\u0003)/), h = "";
    for (var i = 0; i < parts.length; i++) {
      if (i % 2) h += parts[i];
      else if (parts[i].replace(/\s+/g, "")) h += kx(parts[i], disp);
    }
    return h;
  }
  function renderText(seg) {
    // seg: tag-free text with $ delimiters
    var out = "", i = 0, re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g, m;
    while ((m = re.exec(seg))) {
      out += textOut(seg.slice(i, m.index));
      var disp = m[1] != null || m[4] != null;
      out += mathChunk(m[1] || m[2] || m[3] || m[4] || "", disp);
      i = re.lastIndex;
    }
    out += textOut(seg.slice(i));
    return out;
  }
  function clean(src) {
    src = String(src == null ? "" : src);
    if (cache.has(src)) return cache.get(src);
    var rawSrc = src;
    deadline = Date.now() + 4000;
    src = src.replace(/\\\$\s?(?=[a-zA-Z])/g, "\\");   // "\$left" -> "\left" (corrupted command)
    // split into lines on <br>/<p>/<div> boundaries, keep tags verbatim
    var parts = src.split(/(<br\s*\/?>|<\/?(?:p|div|li|tr|td|th|table|tbody|thead|ul|ol|blockquote|h[1-6])\b[^<>]*>)/i);
    var html = "";
    for (var p = 0; p < parts.length; p++) {
      var part = parts[p];
      if (p % 2 === 1) { html += part; continue; }
      if (!part) continue;
      if (/\n/.test(part)) {
        var ls = part.split("\n"), acc = "", outL = [];
        for (var li = 0; li < ls.length; li++) {
          acc = acc ? acc + "\n" + ls[li] : ls[li];
          var nb = (acc.match(/\\begin\{/g) || []).length, ne = (acc.match(/\\end\{/g) || []).length;
          if (nb <= ne) { outL.push(acc); acc = ""; }
        }
        if (acc) outL.push(acc);
        if (outL.length > 1) {
          parts.splice.apply(parts, [p, 1].concat(outL.reduce(function (a, x, j) { if (j) a.push("<br>"); a.push(x); return a; }, [])));
          p--; continue;
        }
      }
      // inline tags inside a line: park them
      var tags = [];
      var t = part.replace(TAG_RE, function (x) { tags.push(x); return "\u0002" + (tags.length - 1) + "\u0003"; });
      t = t.replace(URL_RE, function (x) { tags.push(x); return "\u0002" + (tags.length - 1) + "\u0003"; });
      t = fixDollars(t);
      // a parked tag inside math would break it; render chunks between tags but keep $ pairing across them
      var r = renderText(t.replace(/\u0002(\d+)\u0003/g, function (_, k) { return /^<(?:b|i|u|em|strong|\/b|\/i|\/u|\/em|\/strong)>$/i.test(tags[+k]) ? "" : "\u0002" + k + "\u0003"; }));
      html += r.replace(/\u0002(\d+)\u0003/g, function (_, k) { return tags[+k]; });
    }
    if (cache.size > MAXC) cache.clear();
    cache.set(rawSrc, html);
    return html;
  }
  function leaks(html) { return leakScore(html) > 0; }
  var VIS_BAD = /spanclass|span\s*class\s*=|katex-(?:html|display)|\\(?:left|right|frac|dfrac|sqrt|begin|end|alpha|beta|theta|Rightarrow|times|text|mathrm)\b|\\\\|\$/g;
  var tplEl = null;
  function leakScore(html) {
    if (!html) return 0;
    html = String(html);
    if (html.length > 3000000) return 0;
    var d;
    try { tplEl = tplEl || document.createElement("template"); tplEl.innerHTML = html; d = tplEl.content; } catch (_) { d = null; }
    if (!d || !d.querySelectorAll) return leakScoreRe(html);
    var hard = d.querySelectorAll(".katex-error").length * 3, prose = 0;
    var an = d.querySelectorAll("annotation");
    for (var i = 0; i < an.length; i++) {
      var a = (an[i].textContent || "").replace(/\\(?:text|mathrm|textrm|mbox|operatorname|textbf|mathbf|rm)\s*\{[^{}]*\}/g, " ");
      prose += (a.match(PROSE_IN_MATH) || []).length;
    }
    var rm = d.querySelectorAll(".katex,math,script,style,code,pre,svg,.katex-error");
    for (i = 0; i < rm.length; i++) if (rm[i].parentNode) rm[i].parentNode.removeChild(rm[i]);
    var t = d.textContent || "";
    return (hard + (t.match(VIS_BAD) || []).length) * 1000 + Math.min(prose, 999);
  }
  function leakScoreRe(html) {
    var sc = (html.match(/katex-error/g) || []).length * 3000, pr = 0;
    html.replace(/<annotation[^>]*>([\s\S]*?)<\/annotation>/gi, function (_, a) {
      a = a.replace(/&amp;/g, "&").replace(/\\(?:text|mathrm|textrm|mbox|operatorname|textbf|mathbf|rm)\s*\{[^{}]*\}/g, " ");
      pr += (a.match(PROSE_IN_MATH) || []).length;
      return "";
    });
    var t = html.replace(/<annotation[\s\S]*?<\/annotation>/gi, "").replace(/<(script|style|code|pre|svg|math)\b[\s\S]*?<\/\1>/gi, "")
      .replace(/<[^>]*>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    return sc + (t.match(LEAK_G) || []).length * 1000 + Math.min(pr, 999);
  }
  function eligible(src) {
    if (typeof src !== "string" || src.length > 60000) return false;
    if (!/[$\\\u00b2\u00b3\u00b9\u2070-\u209f]|&#?[a-zA-Z0-9]+;/.test(src)) return false;
    if (KATEX_HTML.test(src)) return false;          // never re-render KaTeX output
    if (/<(?:math|mjx-|svg|script)\b/i.test(src)) return false; // MathML / svg -> legacy path
    return true;
  }
  // data repair: "&" inside an img src/href was once rewritten as " \\text{ and } " by an old pass; restore it (attribute values only)
  var BADURL = /\s*\\text\s*\{\s*(?:\$\s*)?and\s*(?:\$\s*)?\}\s*(?=(?:clean|v|alt|token)=)/g;
  function fixImgUrls(html) {
    if (typeof html !== "string" || html.indexOf("\\text") < 0) return html;
    return html.replace(/(<(?:img|a|source)\b[^>]*?\b(?:src|href|srcset)\s*=\s*")([^"]*)(")/gi, function (m, a, v, c) {
      return v.indexOf("\\text") < 0 ? m : a + v.replace(BADURL, "&") + c;
    });
  }
  var depth = 0, allDone = false;
  function wrapHtml(orig) {
    var f = function (text, opts) {
      if (!allDone) { try { allDone = install(); } catch (_) { allDone = true; } }
      if (depth) return orig.apply(this, arguments);
      var out;
      depth++;
      try { out = orig.apply(this, arguments); } finally { depth--; }
      try { out = fixImgUrls(out); } catch (_) { /* */ }
      try {
        if (eligible(text) && w.katex) {
          var s0 = leakScore(out);
          if (s0 > 0) {
            var c = clean(text);
            if (leakScore(c) < s0) return fixImgUrls(c);
          }
        }
      } catch (_) { /* keep legacy output */ }
      return out;
    };
    f.__qxRepair = true;
    return f;
  }
  function install() {
    var Mx = w.Mx;
    if (!Mx || typeof Mx.html !== "function") return false;
    if (!Mx.html.__qxRepair) Mx.html = wrapHtml(Mx.html);
    var R = w.MathTextRenderer;
    if (R && typeof R.render === "function" && !R.render.__qxRepair) {
      var rr = wrapHtml(R.render);
      R.render = rr; R.html = rr;
      var ps = R.pickStemSource;
      if (typeof ps === "function") {
        R.pickStemSource = function (q, fb) {
          var o = ps.apply(this, arguments);
          try {
            var raw = q && (q.q || q.question);
            if (w.katex && raw && raw !== o && typeof raw === "string" && eligible(raw) && !/<img\b/i.test(String(o)) && !/<img\b/i.test(raw)) {
              if (leakScore(clean(raw)) < leakScore(clean(String(o)))) return raw;
            }
          } catch (_) { /* */ }
          return o;
        };
        R.pickStemSource.__qxRepair = true;
      }
      var rs = R.renderQuestionStem;
      if (typeof rs === "function") R.renderQuestionStem = function (q, o) {
        var src = R.pickStemSource ? R.pickStemSource(q) : (q && (q.q || q.question));
        return rr(src, o);
      };
      R.renderField = function (q, field, o) { if (!q || q[field] == null) return ""; return rr(String(q[field]), o); };
      R.renderInline = function (t) { return rr(t, { displayMode: false }); };
      R.renderDisplay = function (t) { return rr(t, { displayMode: true }); };
    }
    ["afterRender", "afterRenderLight", "typeset", "recoverKatexLeakInDom", "recoverGluedStemInDom", "recoverHollowStemInDom", "upgradeBareTexInDom", "cleanDom"].forEach(function (k) {
      var fn = Mx[k];
      if (typeof fn !== "function" || fn.__qxRepair) return;
      var g = function (root) {
        var r = fn.apply(this, arguments);
        try { guardDom(root); } catch (_) { /* */ }
        if (r && typeof r.then === "function") r.then(function () { try { guardDom(root); } catch (_) { /* */ } });
        return r;
      };
      g.__qxRepair = true;
      Mx[k] = g;
    });
    var QS = w.QuantrexSolution;
    if (QS && typeof QS.renderBlock === "function" && !QS.renderBlock.__qxRepair) {
      var rb = QS.renderBlock;
      QS.renderBlock = function (q, rawSol) {
        var out = rb.apply(this, arguments);
        try { out = fixImgUrls(out); } catch (_) { /* */ }
        try {
          var raw = rawSol || (q && (q.solution || q.sol || q.explanation));
          if (out && w.katex && typeof raw === "string" && eligible(raw) && !/<img\b/i.test(raw)) {
            var d = document.createElement("div");
            d.innerHTML = out;
            var body = d.querySelector(".qx-sol-flow-inner") || d.querySelector(".qx-sol-flow");
            if (body && !body.querySelector("img")) {
              var s0 = leakScore(body.innerHTML);
              if (s0 > 0) { var c = clean(raw); if (leakScore(c) < s0) { body.innerHTML = c; out = d.innerHTML; } }
            }
          }
        } catch (_) { /* keep legacy */ }
        return out;
      };
      QS.renderBlock.__qxRepair = true;
    }
    return !!(w.MathTextRenderer && w.MathTextRenderer.render.__qxRepair && w.QuantrexSolution && w.QuantrexSolution.renderBlock && w.QuantrexSolution.renderBlock.__qxRepair);
  }
  // DOM guard: stems carry their source in data-qx-stem-src; repaint leaking ones deterministically.
  function guardDom(root) {
    if (!root || !root.querySelectorAll || !w.katex) return;
    var list = Array.prototype.slice.call(root.querySelectorAll("[data-qx-stem-src]"));
    if (root.getAttribute && root.getAttribute("data-qx-stem-src") != null) list.push(root);
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.__qxRepGuard === el.innerHTML) continue;
      var src = el.getAttribute("data-qx-stem-src");
      if (!eligible(src) || /<img\b/i.test(src) !== /<img\b/i.test(el.innerHTML)) continue;
      var s0 = leakScore(el.innerHTML);
      if (s0 > 0) {
        var c = clean(src);
        if (leakScore(c) < s0) el.innerHTML = c;
      }
      el.__qxRepGuard = el.innerHTML;
    }
  }
  w.QxMathRepair = { eligible: eligible, stats: STATS, guardDom: guardDom, clean: clean, leaks: leaks, leakScore: leakScore, fixDollars: fixDollars, install: install };
  if (!install()) {
    try { document.addEventListener("DOMContentLoaded", install); } catch (_) { /* */ }
    var tries = 0, iv = setInterval(function () { if (install() || ++tries > 150) clearInterval(iv); }, 50);
  }
})(typeof window !== "undefined" ? window : undefined);
