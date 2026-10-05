/**
 * Quantrex qxmath1 — central math/HTML sanitize + normalize pipeline.
 * ONE source of truth: clean text/LaTeX → one KaTeX renderer.
 * Never store rendered KaTeX HTML as question content.
 * Browser: window.QxMathSanitize · Node: module.exports
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof root !== "undefined") root.QxMathSanitize = api;
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this, function () {
  "use strict";

  const KATEX_CLASS_RX = /\b(?:katex(?:-html|-display|-mathml|-error)?|mord|mrel|mbin|mopen|mclose|mpunct|minner|mspace|vlist(?:-t|-r|-s)?|pstrut|strut|sizing|reset-size\d+|base|mop|mtd|mtable|col-align)\b/i;
  const RAW_KATEX_RX = /class\s*=\s*["'][^"']*\b(?:katex(?:-html|-display|-mathml)?|mord|mrel|mbin|vlist|pstrut|strut)\b/i;
  const UNSAFE_TAG_RX = /<\/?(?:script|iframe|object|embed|form|input|button|link|meta|base|svg\b[^>]*onload)[^>]*>/gi;
  const EVENT_ATTR_RX = /\s+on[a-z]+\s*=\s*(["'])[\s\S]*?\1/gi;
  const JS_HREF_RX = /\s+(?:href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi;

  const SUB_DIG = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
  const SUPER_DIG = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", "−": "⁻" };

  function detectBrokenKatex(s) {
    const t = String(s || "");
    if (!t) return false;
    if (/<span\b[^>]*class=["'][^"']*\bkatex\b/i.test(t) && !/spanclass/i.test(t)
      && !/<\s*[a-zA-Z]\s+[a-zA-Z]\s+[a-zA-Z]/.test(t)) {
      return false;
    }
    if (/spanclass|katex\s*-\s*display/i.test(t)) return true;
    if (/katex-html|katex-mathml|class\s*=\s*["'][^"']*\bkatex\b/i.test(t)) return true;
    if (/\b(?:mord|mrel|mbin|vlist|pstrut)\b/i.test(t) && /span/i.test(t)) return true;
    return false;
  }

  function detectRawHtml(s) {
    const t = String(s || "");
    if (!t) return false;
    if (detectBrokenKatex(t)) return true;
    if (/<(?:script|iframe|object|embed)\b/i.test(t)) return true;
    if (/style\s*=\s*["'][^"']{80,}/i.test(t) && (t.match(/<span\b/gi) || []).length >= 8) return true;
    return false;
  }

  function decodeEntities(s) {
    let t = String(s || "");
    t = t.replace(/&amp;(#(?:x?[0-9a-fA-F]+|[a-zA-Z]+);)/gi, "&$1");
    t = t.replace(/&nbsp;|&#160;|&#x0*A0;/gi, " ");
    t = t.replace(/&amp;/g, "&");
    t = t.replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    t = t.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
    t = t.replace(/&minus;|&#8722;/gi, "−");
    t = t.replace(/&times;|&#215;/gi, "×");
    t = t.replace(/&plusmn;|&#177;/gi, "±");
    t = t.replace(/&rarr;|&#8594;/gi, "→");
    t = t.replace(/&mdash;|&#8212;/gi, "—");
    t = t.replace(/&ndash;|&#8211;/gi, "–");
    t = t.replace(/&#(\d+);/g, (_, n) => {
      try { return String.fromCharCode(+n); } catch (e) { return ""; }
    });
    t = t.replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      try { return String.fromCharCode(parseInt(h, 16)); } catch (e) { return ""; }
    });
    if (/&(?:amp;|#\d+|#x[0-9a-f]+|nbsp|minus);/i.test(t)) {
      t = t.replace(/&amp;(#(?:x?[0-9a-fA-F]+|[a-zA-Z]+);)/gi, "&$1");
      t = t.replace(/&nbsp;|&#160;|&#x0*A0;/gi, " ");
      t = t.replace(/&minus;|&#8722;/gi, "−");
      t = t.replace(/&#(\d+);/g, (_, n) => {
        try { return String.fromCharCode(+n); } catch (e) { return ""; }
      });
    }
    return t;
  }

  function stripZeroWidth(s) {
    return String(s || "").replace(/[\u200b\u200c\u200d\ufeff\u2060]/g, "");
  }

  /** Convert plain chem-ish tokens like NO2 / CH3 / NH2 to unicode subscripts. */
  function chemifyPlain(s) {
    let t = String(s || "");
    const forms = [
      ["K2Cr2O7", "K₂Cr₂O₇"], ["KMnO4", "KMnO₄"], ["NaHCO3", "NaHCO₃"], ["Na2CO3", "Na₂CO₃"],
      ["Ca(OH)2", "Ca(OH)₂"], ["Mg(OH)2", "Mg(OH)₂"], ["C2H5OH", "C₂H₅OH"],
      ["H2SO4", "H₂SO₄"], ["H2CO3", "H₂CO₃"], ["H3PO4", "H₃PO₄"], ["HNO3", "HNO₃"],
      ["CaCO3", "CaCO₃"], ["BaSO4", "BaSO₄"], ["CuSO4", "CuSO₄"], ["FeSO4", "FeSO₄"],
      ["ZnSO4", "ZnSO₄"], ["AgNO3", "AgNO₃"], ["NH4Cl", "NH₄Cl"], ["Fe2O3", "Fe₂O₃"],
      ["Al2O3", "Al₂O₃"], ["PCl5", "PCl₅"], ["PCl3", "PCl₃"], ["CH4", "CH₄"],
      ["NH3", "NH₃"], ["H2O", "H₂O"], ["CO2", "CO₂"], ["SO2", "SO₂"], ["SO3", "SO₃"],
      ["NO2", "NO₂"], ["HCl", "HCl"], ["H2", "H₂"], ["O2", "O₂"], ["N2", "N₂"],
      ["SO4", "SO₄"], ["PO4", "PO₄"], ["NO3", "NO₃"], ["NH4", "NH₄"], ["MnO4", "MnO₄"]
    ];
    for (let i = 0; i < forms.length; i++) {
      const a = forms[i][0];
      const b = forms[i][1];
      t = t.replace(new RegExp("\\b" + a.replace(/[()]/g, "\\$&") + "\\b", "g"), b);
    }
    t = t.replace(/\b(NO|SO|CO|NH|CH|OH|PO|MnO|KMnO|H)(\d+)\b/g, (_, el, dig) =>
      el + dig.split("").map((d) => SUB_DIG[d] || d).join("")
    );
    t = t.replace(/\b(Na|K|Li|H|Ag)\+(?![A-Za-z0-9])/g, (_, el) => el + "⁺");
    t = t.replace(/\b(Cl|Br|I|F|OH)[-−](?![A-Za-z0-9])/g, (_, el) => el + "⁻");
    t = t.replace(/\b(Fe|Al|Cr)(?:\^?3\+|3\+)(?![A-Za-z0-9])/g, (_, el) => el + "³⁺");
    t = t.replace(/\b(Fe|Ca|Mg|Zn|Cu|Ba)(?:\^?2\+|2\+)(?![A-Za-z0-9])/g, (_, el) => el + "²⁺");
    t = t.replace(/\b(SO₄|CO₃|SO4|CO3)(?:\^?2[-−]|2[-−])(?![A-Za-z0-9])/g, (_, el) => {
      const base = el.replace("4", "₄").replace("3", "₃");
      return base + "²⁻";
    });
    t = t.replace(/\b([A-Za-z]+)(\d+)([+\-−])(?![A-Za-z0-9])/g, (_, el, dig, sign) =>
      el + dig.split("").map((d) => SUB_DIG[d] || d).join("") + (SUPER_DIG[sign] || sign)
    );
    t = t.replace(/\bm\/s\^2\b/g, "m/s²");
    t = t.replace(/\bm\/s2\b/g, "m/s²");
    t = t.replace(/\bkg[·.]m\/s\^2\b/g, "kg·m/s²");
    return t;
  }

  function extractAnnotationTex(block) {
    const m = /<annotation[^>]*encoding\s*=\s*["']application\/x-tex["'][^>]*>([\s\S]*?)<\/annotation>/i.exec(block);
    if (!m) return "";
    return decodeEntities(stripZeroWidth(m[1])).trim();
  }

  function mathmlToPlain(inner) {
    let t = String(inner || "");
    // Very small MathML → plain text (sub/sup aware)
    t = t.replace(/<msub>\s*<m[ion][^>]*>([\s\S]*?)<\/m[ion]>\s*<m[ion][^>]*>([\s\S]*?)<\/m[ion]>\s*<\/msub>/gi,
      (_, a, b) => stripTags(a) + toSub(stripTags(b)));
    t = t.replace(/<msup>\s*<m[ion][^>]*>([\s\S]*?)<\/m[ion]>\s*<m[ion][^>]*>([\s\S]*?)<\/m[ion]>\s*<\/msup>/gi,
      (_, a, b) => stripTags(a) + toSuper(stripTags(b)));
    t = t.replace(/<msubsup>\s*<m[ion][^>]*>([\s\S]*?)<\/m[ion]>\s*<m[ion][^>]*>([\s\S]*?)<\/m[ion]>\s*<m[ion][^>]*>([\s\S]*?)<\/m[ion]>\s*<\/msubsup>/gi,
      (_, a, b, c) => stripTags(a) + toSub(stripTags(b)) + toSuper(stripTags(c)));
    t = t.replace(/<mfrac>\s*<m[ionr][^>]*>([\s\S]*?)<\/m[ionr]>\s*<m[ionr][^>]*>([\s\S]*?)<\/m[ionr]>\s*<\/mfrac>/gi,
      (_, a, b) => "(" + stripTags(a) + ")/(" + stripTags(b) + ")");
    t = t.replace(/<msqrt>([\s\S]*?)<\/msqrt>/gi, (_, a) => "√(" + stripTags(a) + ")");
    t = stripTags(t);
    return decodeEntities(stripZeroWidth(t)).replace(/\s+/g, " ").trim();
  }

  function stripTags(s) {
    return String(s || "").replace(/<[^>]+>/g, "");
  }

  function toSub(s) {
    // Never rewrite digits inside &…; entities
    return String(s || "").replace(/&[^;]+;|./g, (ch) => {
      if (ch.length > 1) return ch;
      return SUB_DIG[ch] || ch;
    });
  }

  function toSuper(s) {
    return String(s || "").replace(/&[^;]+;|./g, (ch) => {
      if (ch.length > 1) return ch;
      return SUPER_DIG[ch] || ch;
    });
  }

  function textFromKatexBlock(block) {
    const ann = extractAnnotationTex(block);
    if (ann) return { tex: ann, fromAnnotation: true };
    let t = String(block || "");
    // Convert MathML islands to plain text FIRST (some exports put glyphs only in <math>)
    t = t.replace(/<math\b[^>]*>([\s\S]*?)<\/math>/gi, (_, inner) => mathmlToPlain(inner));
    // Drop leftover katex-mathml wrappers if any
    t = t.replace(/<span\b[^>]*class=["'][^"']*katex-mathml[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, "");
    t = t.replace(/<br\s*\/?>/gi, " ");
    t = t.replace(/<[^>]+>/g, "");
    t = decodeEntities(stripZeroWidth(t));
    t = t.replace(/\s+/g, " ").trim();
    return { tex: t, fromAnnotation: false };
  }

  function findBalancedSpanEnd(html, start) {
    let i = start;
    let depth = 0;
    const n = html.length;
    while (i < n) {
      if (html.charCodeAt(i) !== 60 /* < */) { i++; continue; }
      if (html.startsWith("</span>", i) || html.startsWith("</SPAN>", i)) {
        depth--;
        i += 7;
        if (depth === 0) return i;
        continue;
      }
      if (/^<span\b/i.test(html.slice(i, i + 6))) {
        depth++;
        const gt = html.indexOf(">", i);
        if (gt < 0) return -1;
        i = gt + 1;
        continue;
      }
      // other tag
      const gt = html.indexOf(">", i);
      if (gt < 0) return -1;
      i = gt + 1;
    }
    return -1;
  }

  /**
   * Replace every <span class="katex…">…</span> (and katex-display wrappers)
   * with clean $tex$ / plain chem text. Safe recovery only.
   */
  function recoverKatexHtml(html) {
    let s = String(html || "");
    if (!detectBrokenKatex(s)) return { html: s, recovered: 0, review: false };

    let recovered = 0;
    let review = false;
    let guard = 0;
    let searchFrom = 0;
    while (guard++ < 400 && searchFrom < s.length) {
      // Find next span; accept only class token katex or katex-display (not katex-html)
      const slice = s.slice(searchFrom);
      const m = /<span\b[^>]*class\s*=\s*["']([^"']*)["'][^>]*>/i.exec(slice);
      if (!m) break;
      const abs = searchFrom + m.index;
      const cls = m[1] || "";
      if (!/(?:^|\s)katex(?:-display)?(?:\s|$)/i.test(cls)) {
        searchFrom = abs + m[0].length;
        continue;
      }
      const end = findBalancedSpanEnd(s, abs);
      if (end < 0) {
        review = true;
        searchFrom = abs + m[0].length;
        continue;
      }
      const block = s.slice(abs, end);
      const { tex, fromAnnotation } = textFromKatexBlock(block);
      let repl = "";
      if (tex) {
        if (fromAnnotation) {
          const display = /\\begin\{|\\\\|\\frac|\\sum|\\int|\\lim|\\left/.test(tex) && tex.length > 24;
          repl = display ? ("\\[" + tex + "\\]") : ("\\(" + tex + "\\)");
        } else {
          repl = chemifyPlain(decodeEntities(tex));
        }
        recovered++;
      } else {
        recovered++;
      }
      s = s.slice(0, abs) + repl + s.slice(end);
      searchFrom = abs + repl.length;
    }

    // Residual katex-html / mord wrappers without outer .katex (broken exports)
    if (/katex-html|class\s*=\s*["'][^"']*\bmord\b/i.test(s)) {
      s = s.replace(/<span\b[^>]*class\s*=\s*["'][^"']*\b(?:katex-html|mord|mrel|mbin|mopen|mclose|mpunct|minner|mspace|vlist|pstrut|strut|base|sizing|reset-size\d+)\b[^"']*["'][^>]*>/gi, "");
      recovered++;
    }

    return { html: s, recovered, review };
  }

  /** Collapse nested empty / style-only spans left after katex recovery. */
  function collapseJunkSpans(html) {
    let s = String(html || "");
    // Remove spans that only carry inline style / class noise (no semantic role)
    for (let i = 0; i < 12; i++) {
      const prev = s;
      s = s.replace(/<span\b(?=[^>]*\bstyle\s*=)(?![^>]*\b(?:katex|qx-|mtk-|sol-|qa-)[^>]*)[^>]*>\s*<\/span>/gi, "");
      s = s.replace(/<span\b(?=[^>]*\bstyle\s*=)(?![^>]*\b(?:katex|qx-|mtk-|sol-|qa-)[^>]*)[^>]*>([\s\S]*?)<\/span>/gi, "$1");
      s = s.replace(/<span\b[^>]*class\s*=\s*["']_2tazz["'][^>]*>[\s\S]*?<\/span>/gi, "");
      s = s.replace(/<h2\b[^>]*class\s*=\s*["']_2tazz["'][^>]*>[\s\S]*?<\/h2>/gi, "");
      s = s.replace(/<(?:div|p)\b[^>]*style\s*=\s*["'][^"']*["'][^>]*>\s*<\/(?:div|p)>/gi, "");
      if (s === prev) break;
    }
    return s;
  }

  function stripUnsafeHtml(html) {
    let s = String(html || "");
    s = s.replace(UNSAFE_TAG_RX, "");
    s = s.replace(EVENT_ATTR_RX, "");
    s = s.replace(JS_HREF_RX, "");
    // Drop aria-hidden decorative crumbs that often leak as text in broken exports
    s = s.replace(/\s*aria-hidden\s*=\s*["']true["']/gi, "");
    return s;
  }

  function normalizeDelimiters(html) {
    let s = String(html || "");
    // Normalize weird dollar spacing
    s = s.replace(/\\\(\s+/g, "\\(").replace(/\s+\\\)/g, "\\)");
    s = s.replace(/\\\[\s+/g, "\\[").replace(/\s+\\\]/g, "\\]");
    // Collapse EMPTY math islands only.
    // CRITICAL (qxmd174): never use /\$\s*\$/ — that also matches display "$$…$$" delimiters
    // and strips them, leaving raw \begin{pmatrix} / \mathrm / \int visible sitewide.
    // qxmd175: require WHITESPACE inside empty display — /\$\$\s*\$\$/ also matched
    // the boundary of adjacent blocks $$x$$$$y$$ and glued them into $$xy$$ (raw broken math).
    s = s.replace(/\$\$[ \t\n\r]+\$\$/g, ""); // empty display $$ $$ only (not adjacent $$$$ )
    s = s.replace(/\$(\s+)\$/g, (full, inner, idx, src) => {
      const around = src.slice(Math.max(0, idx - 1), idx + full.length + 1);
      if (/\$\$/.test(around)) return full;
      if ((src.slice(0, idx).match(/\$/g) || []).length % 2 === 1) return full;
      return inner;
    });
    s = s.replace(/\\\(\s*\\\)/g, "");
    s = s.replace(/\\\[\s*\\\]/g, "");
    try { s = repairMarksDollarSoup(s); } catch (_) { /* */ }
    try { s = fixProseDollars(s); } catch (_) { /* */ }
    s = healOddDollars(s);
    return s;
  }

  /**
   * Marks nested-$ dumps: $ inside \begin{array}/\begin{aligned}, $\left.$, $\right\}$,
   * and $\mathrm{y}$=$\mathrm{b}$. Meaning-preserving delimiter repair only.
   */
  function repairMarksDollarSoup(html) {
    let s = String(html || "");
    if (!s) return s;
    if (/class=["'][^"']*katex|<\/?math[\s>]/i.test(s)) return s;

    // Set-builders split on English MUST run before `$\}` is stripped.
    s = s.replace(
      /\$([A-Z]\s*=\s*)\{\s*(\\left\s*\([^$]{0,80}?\\right\))\s*\|\s*([A-Z])\s*\$(\s+and\s+[A-Z][^$]{8,160}?)\s*\$\s*\}/g,
      (_, pre, a, p, eng) => "$" + pre + "\\{" + a + " \\mid \\text{" + p + eng + "}\\}$"
    );
    s = s.replace(
      /\$([A-Za-z]\s*=\s*\\?\{[^$]{0,200}?)\$(\s+(?:and|or)\s+)\$([^$]{0,80}?)\\\}/g,
      (_, a, eng, b) => "$" + a + " \\text{" + eng + "}" + b + "\\}$"
    );
    s = s.replace(
      /\$([A-Za-z]\s*=\s*\\?\{[^$]{0,200}?)\$(\s+(?:and|or)\s+)\$([^$]{0,120}?)\$(\s*\\?\})/g,
      (_, a, eng, b) => "$" + a + " \\text{" + eng + "}" + b + "\\}$"
    );
    s = s.replace(
      /(^|,\s*)(\$?)([A-Za-z]\s*=\s*\\?\{[^$]{0,200}?)\$(\s+(?:is an integer|is a real|where|such that)[^$]{0,80}?)\s*\$\s*(\\?\})/gi,
      (_, pre, _d, a, eng) => pre + "$" + a + " \\text{" + eng + "}\\}$"
    );
    s = s.replace(/\\\}(\$)\$+(?=\s|[.,;]|$)/g, "\\}$1");

    // Join split \left. \right. BEFORE stripping lone $\left.
    s = s.replace(/\\right\.\s*\$(\s+(?:and|or|,)\s+)\$\\left\./g, "\\right.$1\\left.");
    s = s.replace(/\\right\.\s*\$(\s+(?:and|or|,)\s+)\\left\./g, "\\right.$1\\left.");

    s = s.replace(/\$\\left\.\s*\$/g, "");
    s = s.replace(/\$\\left\./g, "\\left.");
    s = s.replace(/\$\\right\\\}?\$/g, "");
    s = s.replace(/\$\\right\}?\$/g, "");
    /* Never rewrite \right\} globally — that is the closer of \left\{ … \right\}. */
    s = s.replace(/\$\\\}/g, "");
    s = s.replace(/\\text\{\s*True\s*\}\s*\$/g, "\\text{ True }");

    s = s.replace(/\$\\mathrm\{([^}]+)\}\$(\s*=\s*)\$\\mathrm\{([^}]+)\}\$/g,
      "$\\mathrm{$1}$2\\mathrm{$3}$");
    s = s.replace(/(\\mathrm\{[^}]+\})\$(\s*=\s*)\$(\\mathrm\{[^}]+\})\$?/g,
      "$$$1$2$3$");
    s = s.replace(/\$\s*=\s*\$/g, "=");
    s = s.replace(/\$\s*-\s*\$\s*(\\mathrm\{(?:I{1,3}|II|III)\})/g, "- $1");
    s = s.replace(/-\s*\$(\\mathrm\{(?:I{1,3}|II|III)\})/g, "- $1");
    s = s.replace(/(^|[^$])(\\mathrm\{(?:I{1,3}|II|III)\})(?!\$)/g, "$1$$$2$");
    s = s.replace(/(^|[^$])(\\mathrm\{[A-Za-z0-9]+\}(?:\s*=\s*\\mathrm\{[A-Za-z0-9]+\}))(?!\$)/g, "$1$$$2$");

    s = s.replace(/\\begin\{([a-zA-Z*]{1,16})\}([\s\S]*?)\\end\{\1\}/g, function (full, env, inner) {
      let t = String(inner).replace(/\$/g, "");
      if (/^(?:array|aligned|align\*?|cases|matrix|pmatrix|bmatrix|vmatrix|smallmatrix)$/.test(env)) {
        t = t.replace(/\\&/g, "&");
      }
      return "\\begin{" + env + "}" + t + "\\end{" + env + "}";
    });

    s = s.replace(
      /(^|[^$])(\\begin\{(?:array|aligned|align\*?|cases)\}[\s\S]*?\\end\{(?:array|aligned|align\*?|cases)\})/g,
      function (_m, pre, tex) {
        if (/\$\s*$/.test(pre)) return _m;
        return pre + "$" + tex + "$";
      }
    );

    // Unicode set/logic ops → TeX (safe inside and outside $…$)
    s = s.replace(/∪/g, "\\cup ");
    s = s.replace(/∩/g, "\\cap ");
    s = s.replace(/∀/g, "\\forall ");

    // False closer in set-builder: $| P$ and Q are … origin$} → \text{…}
    s = s.replace(
      /\$R\s*=\s*\{\s*(\\left\s*\([^}]*?\\right\))\s*\|\s*([A-Z])\s*\$(\s+and\s+[A-Z][^$]{8,120}?)\s*\$\s*\}/g,
      (_, a, p, eng) => "$R = \\{" + a + " \\mid \\text{" + p + eng + "}\\}$"
    );
    // Extra $ after the set closer (}$$) opens a false $Let$ / $be a$ island
    s = s.replace(/\\\}(\$)\$+(?=\s)/g, "\\}$1");
    s = s.replace(/\\left\$/g, "\\left");
    s = s.replace(/\\right\$/g, "\\right");
    s = s.replace(/\$Let \$R/g, "Let $R");
    s = s.replace(/\$Let \$/g, "Let $");
    // Keep P$ and Q as two islands when the set-builder \text wrap did not fire
    s = s.replace(/(\\\left\s*\([\s\S]{0,80}?\\right\))\s*\|?\s*([A-Z])\s*\$(\s+and\s+)/g, "$1 \\mid $2$$$3");
    // Marks split \left. \right. across "and"
    s = s.replace(/\\right\.\s*\$(\s+(?:and|or|,)\s+)\$\\left\./g, "\\right.$1\\left.");
    // ${R}_{1} and {R}_{2}$ → two islands
    s = s.replace(/\$(\{R\}_\{\s*\d+\s*\})\s+and\s+(\{R\}_\{\s*\d+\s*\})\$/g, "$$$1$ and $$$2$");
    s = s.replace(/\$\}([A-Za-z])/g, "$} $1");
    s = s.replace(/\\geq\s*slant\b/g, "\\geqslant");
    s = s.replace(/\\leq\s*slant\b/g, "\\leqslant");

    // Close math before trailing English: ) if$  / ) denote$
    s = s.replace(/(\\right\s*\)|\))(\s*)(if|denote|and|then|of|as)\s*\$/gi, "$1$$$2$3 ");
    // ifx_1 / only ifx_1
    s = s.replace(/\b(only if|if)([A-Za-z])_(\d)/g, "$1 $2_$3");
    // $R =${$  / $R =$ {$  split set braces
    s = s.replace(/\$R\s*=\{\s*\$/g, "$R = \\{");
    s = s.replace(/\$R\s*=\$\s*\{\s*\$/g, "$R = \\{");
    s = s.replace(/\$R\s*=\$\s*\{/g, "$R = \\{");
    // $A to A$ → $A$ to $A$
    s = s.replace(/\$([A-Z])\s+to\s+([A-Z])\$/g, "$$$1$ to $$$2$");
    // A{R}_{1}B$ if — skip when already wrapped ($A{R}_{1}B$)
    s = s.replace(/(^|[^$])([A-Z])\{R\}_\{(\d+)\}([A-Z])\s*\$/g,
      (_, pre, a, n, b) => pre + "$" + a + "{R}_{" + n + "}" + b + "$");
    // $A{R}_{2}B if A  →  $A{R}_{2}B$ if A
    s = s.replace(/\$([A-Z]\{R\}_\{\d+\}[A-Z])\s+if\s+(?=[A-Z])/g, "$$$1$ if ");
    // $two statements: (I) \mathrm{R} is … (II)$
    s = s.replace(
      /\$((?:two|the)\s+statements:\s*)(\(I\))\s*(\\mathrm\s*\{[^}]+\})\s*(is reflexive but not symmetric\.\s*\(II\))\s*\$/gi,
      " $1$2 $$$3$ $4 "
    );
    // Wrap leftover x_1 \leq x_2 outside existing $…$ (second soup pass must not split a good island)
    {
      const parts = s.split(/(\$\$[\s\S]+?\$\$|\$[^$]*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g);
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 1) continue;
        parts[i] = parts[i].replace(
          /(^|[^$\\])((?:[xy])_\{?\d\}?\s*\\(?:leq|geq|le|ge|leqslant|geqslant)\s*(?:[xy])_\{?\d\}?(?:\s+or\s+(?:[xy])_\{?\d\}?\s*\\(?:leq|geq|le|ge|leqslant|geqslant)\s*(?:[xy])_\{?\d\}?)?)/g,
          (m, pre, tex) => pre + "$" + tex.trim() + "$"
        );
      }
      s = parts.join("");
    }
    // Prefer two islands: $x_1 \leq x_2$ or $y_1 \leq y_2$
    s = s.replace(
      /\$([xy]_\{?\d\}?\s*\\(?:leq|geq|le|ge)\s*[xy]_\{?\d\}?)\s+or\s+([xy]_\{?\d\}?\s*\\(?:leq|geq|le|ge)\s*[xy]_\{?\d\}?)\$/g,
      "$$$1$ or $$$2$"
    );
    // ofS / ofA glued
    s = s.replace(/\bof([A-Z])\b/g, "of $1");
    // English "is a multiple of" inside a LONG set-builder island only.
    // Never join well-formed $\alpha$ is a multiple of $4$.
    s = s.replace(
      /(\$[^$]{12,})\$(\s*is a multiple of\s*)\$(\d+)\s*\$(\s*\})?/gi,
      (_, a, _w, n, br) => a + " \\text{ is a multiple of }" + n + (br ? "\\}" : "") + "$"
    );
    s = s.replace(/<gwmw\b[^>]*>[\s\S]*?<\/gwmw>/gi, "");
    s = s.replace(
      /\$((?:two|the)\s+statements:[^$]{0,220}?)\$/gi,
      (_, inner) => " " + String(inner).replace(/(\\mathrm\s*\{[^}]+\})/g, "$$$1$") + " "
    );
    s = s.replace(/\$R\$ is transitive Then which one of the following is true\?\$/gi,
      "$R$ is transitive. Then which one of the following is true?");
    s = s.replace(/R\$ is transitive Then which one of the following is true\?\$/gi,
      "$R$ is transitive. Then which one of the following is true?");
    s = s.replace(/([^$]) if \\left/g, "$1 if $\\left");
    s = s.replace(/\$if\s+\\left/g, "$ if $\\left");
    s = s.replace(/\$ if \\left/g, "$ if $\\left");
    s = s.replace(/=\s*[ϕφ]\s+and\s+\$/g, "= \\phi$ and $");
    s = s.replace(/=\s*\\phi\s+and\s+\$/g, "= \\phi$ and $");
    s = s.replace(/([A-Z])\$(\\left\s*\([^)]*\\right\))\$/g, "$$$1$2$");
    s = s.replace(/\s+or\$\$/g, " or $");
    s = s.replace(
      /\\mid\s*([A-Z])\s*\$(\s+and\s+[A-Z][^$]{8,120}?)\s*\$(\s*\})?/g,
      (_, p, eng, br) => "\\mid \\text{" + p + eng + "}" + (br || "")
    );
    // Join $\left(A \cap …\right)$ \cup $\left(B \cap …\right)$ into one island
    s = s.replace(/(\\right\s*\))\s*\$\s*\\cup\s*\$\s*(\\left)/g, "$1 \\cup $2");
    s = s.replace(/(\\right\s*\))\s*\$\s*\\cap\s*\$\s*(\\left)/g, "$1 \\cap $2");
    // if A \cup {B}^{c} = B \cup {A}^{c}
    s = s.replace(
      /(if)\s+([A-Z])\s*\\cup\s*(\{[A-Z]\}\^\{c\})\s*=\s*([A-Z])\s*\\cup\s*(\{[A-Z]\}\^\{c\})/g,
      "$1 $$$2 \\cup $3 = $4 \\cup $5$"
    );
    // \in $P\left(S\right)$  /  \in P$\left(S\right)$
    s = s.replace(/\\in\s*\$P\\left/g, "\\in P\\left");
    s = s.replace(/\\in\s*P\$(\\left)/g, "\\in P$1");
    // 1 \le i \le k$}  (set-builder missing backslash on last brace)
    s = s.replace(/(1\s*\\le\s*i(?:\s*,\s*j)?\s*\\le\s*k)\s*\$\}/g, "$1\\}$");
    s = s.replace(/\\\}(\$)\$+(?=\s)/g, "\\}$1");
    s = s.replace(/\\text\{\s*is a multiple of/gi, "\\text{ is a multiple of");
    s = s.replace(/\\\(([^$\\]{0,160}?)\\\)/g, "$$$1$");
    s = s.replace(/\\\(/g, "(").replace(/\\\)/g, ")");

    return s;
  }

  function mixedProseLen(body) {
    const plain = String(body || "")
      .replace(/\$[^$]*\$/g, " ")
      .replace(/\\[a-zA-Z]+/g, " ")
      .replace(/[\\{}^_]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const words = (plain.match(/[A-Za-z]{3,}/g) || []).length;
    return { plainLen: plain.length, words: words, mixed: plain.length > 80 || words >= 6 };
  }

  /** Stem-echo cuts often eat the opening `$` of the next math island. Pair or drop the leftover. */
  function healOddDollars(html) {
    let s = String(html || "");
    if (!s) return s;
    const n = (s.match(/\$/g) || []).length;
    if (n % 2 === 0) return s;
    const m = /^((?:(?:\s|&nbsp;|<br\s*\/?\s*>|<\/?(?:p|div|span)[^>]*>)*)?)/i.exec(s);
    const prefix = m ? m[0] : "";
    const body = s.slice(prefix.length);
    const count = (body.match(/\$/g) || []).length;
    if (count % 2 === 0) return s;
    const mix = mixedProseLen(body);
    // Never prepend $ before English ("$Let $R" smashed set-builders).
    if (/^(Let|If|Then|Consider|Define|For|The|Given|Which|When)\b/.test(body)) {
      const collapsed = body.replace(/\\\}(\$)\$+(?=\s)/g, "\\}$1").replace(/\$Let \$R/g, "Let $R");
      if ((collapsed.match(/\$/g) || []).length % 2 === 0) return prefix + collapsed;
      const drop = collapsed.replace(/\$(\s+(?:be a |then |is the |and |or ))/i, "$1");
      if ((drop.match(/\$/g) || []).length % 2 === 0) return prefix + drop;
      const idx = collapsed.lastIndexOf("$");
      if (idx >= 0) {
        const after = collapsed.slice(idx + 1);
        if (/^\s*(?:be a |is the |then |and |or |of |is )/i.test(after) || !String(after).trim()) {
          return prefix + collapsed.slice(0, idx) + collapsed.slice(idx + 1);
        }
      }
      return prefix + collapsed;
    }
    if (mix.mixed) {
      if (body.startsWith("$") && mix.plainLen > 80) {
        return prefix + body.replace(/^\$/, "");
      }
      const idx = body.lastIndexOf("$");
      if (idx >= 0) return prefix + body.slice(0, idx) + body.slice(idx + 1);
      return s;
    }
    if (!body.startsWith("$") && /^(?:\\(?:mathrm|mathbf|text|frac|dfrac|tfrac|sqrt|left|right|begin|end|sin|cos|tan|log|ln|cdot|times|pm|infty|alpha|beta|gamma|theta|overline|underline|hat|vec)|\\[a-zA-Z]+|\\end\{)/.test(body)) {
      return prefix + "$" + body;
    }
    if (body.startsWith("$") && count === 1) return prefix + body + "$";
    if (count === 1 && !body.startsWith("$") && /\$\s*(?:<|$)/.test(body)) {
      return prefix + body.replace(/\$(\s*)(?=<|$)/, "$1");
    }
    if (count === 1 && /(?:\\[a-zA-Z]+|[A-Za-z])\$-(?=[A-Za-z])/.test(body)) {
      return prefix + body.replace(/\$-(?=[A-Za-z])/g, "-");
    }
    if (body.startsWith("$")) return prefix + body + "$";
    if (/\\[a-zA-Z]/.test(body) && mix.plainLen <= 80) return prefix + "$" + body;
    return prefix + body.replace(/\$(\s*)(?=<|$)/, "$1");
  }

  /**
   * qxmd285 — even-count leftover soup: `$Given that $y=…` and `\left$`.
   * healOddDollars returns early when `$` count is even, so this always runs.
   */
  function fixProseDollars(html) {
    let s = String(html || "");
    if (!s) return s;
    s = s.replace(/\\left\$/g, "\\left");
    s = s.replace(/\\right\$/g, "\\right");
    s = s.replace(/\$Let \$R/g, "Let $R");
    s = s.replace(/\$Let \$/g, "Let $");
    s = s.replace(/(^|[>\n\r])\$(\s*)(Given|If|Find|The|Simplify|Let|Consider|Which|When|For|Show|Prove|Calculate|Determine|Match|Select|Choose|Suppose|Assume|Evaluate|Obtain|Define|Statement|Assertion|Reason)\b(?!\$)/g, "$1$2$3");
    s = s.replace(/([\s(])\$(Given|If|Find|The|Simplify|Let|Consider|Which|When|For|Show|Prove|Calculate|Determine|Match|Select|Choose|Suppose|Assume|Evaluate|Obtain|Define)\b(?!\$)/g, "$1$2");
    return s;
  }

  /**
   * qxmd163 — Marks/Firestore export quirks → KaTeX-safe TeX (meaning-preserving).
   * Does NOT change math meaning; only unwraps broken wrappers / invisible ops / escapes.
   */
  function collapseEscapedBackslashes(s) {
    let t = String(s || "");
    if (!t || t.indexOf("\\") < 0) return t;
    // Visible \\\frac / \\\{ leaks from JSON over-escape. Keep TeX \\ line-breaks
    // (two slashes not followed by a letter or grouping brace).
    t = t.replace(/\\{3,}(?=[a-zA-Z{])/g, "\\");
    t = t.replace(/\\{2,}([a-zA-Z]+)/g, "\\$1");
    t = t.replace(/\\{2,}([{}])/g, "\\$1");
    t = t.replace(/\\{3,}/g, "\\");
    // qxmd253: \\$left / \$frac display leaks -> \\left / \\frac
    t = t.replace(/\\+\$\s*(?=(?:left|right|frac|dfrac|tfrac|sqrt|mathrm|mathbf|textbf|text|begin|end|infty|alpha|beta|gamma|theta|times|cdot|leq|geq|leqslant|geqslant|cap|cup|subset|subseteq|rightarrow|leftarrow|Rightarrow)\b)/g, "\\");
    return t;
  }

  function braceDeltaAt(s, i) {
    const c = s[i];
    if (c === "\\") {
      const n = s[i + 1];
      if (n === "{") return { d: 1, n: 2 };
      if (n === "}") return { d: -1, n: 2 };
      return { d: 0, n: 2 };
    }
    if (c === "{") return { d: 1, n: 1 };
    if (c === "}") return { d: -1, n: 1 };
    return { d: 0, n: 1 };
  }
  function braceDepth(s) {
    let d = 0;
    for (let i = 0; i < s.length; ) {
      const step = braceDeltaAt(s, i);
      d += step.d;
      i += step.n;
    }
    return d;
  }
  function matchGroupBrace(s, openIdx) {
    let d = 0;
    for (let i = openIdx; i < s.length; ) {
      const c = s[i];
      if (c === "\\") { i += 2; continue; }
      if (c === "{") d++;
      else if (c === "}") {
        d--;
        if (d === 0) return i;
      }
      i++;
    }
    return -1;
  }
  function unmatchedRight(s, from) {
    let depth = 0;
    for (let i = from; i < s.length; i++) {
      if (s.startsWith("\\left", i) && !/[A-Za-z]/.test(s[i + 5] || "")) { depth++; i += 4; continue; }
      if (s.startsWith("\\right", i) && !/[A-Za-z]/.test(s[i + 6] || "")) {
        if (depth === 0) return i;
        depth--;
        i += 5;
        continue;
      }
    }
    return -1;
  }
  function textifyProseGap(chunk) {
    return String(chunk || "").replace(/(^|[^\\A-Za-z])([A-Za-z]{2,})/g, (m, pre, w) => {
      if (/^(left|right|frac|mathrm|text|begin|end)$/i.test(w)) return m;
      const lead = /\s/.test(pre) ? "" : pre;
      return lead + "\\text{ " + w + " }";
    });
  }
  function promoteSetBraces(body) {
    const s = String(body || "");
    const stack = [];
    const promote = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "\\") {
        if (s[i + 1] === "{") { stack.push({ i: i, esc: true }); i++; continue; }
        if (s[i + 1] === "}") {
          const top = stack.pop();
          if (top && !top.esc) {
            const inner = s.slice(top.i + 1, i);
            if (/\\(?:in|times|mid|subset|cup|cap)\b|,/.test(inner)) promote.push(top.i);
          }
          i++;
          continue;
        }
        i++;
        continue;
      }
      if (s[i] === "{") stack.push({ i: i, esc: false });
      else if (s[i] === "}") stack.pop();
    }
    if (!promote.length) return s;
    const mark = new Set(promote);
    let o = "";
    for (let i = 0; i < s.length; i++) o += mark.has(i) ? "\\{" : s[i];
    return o;
  }
  function healSplitMathBraces(s) {
    const src = String(s || "");
    let i = 0;
    let out = "";
    while (i < src.length) {
      if (src[i] !== "$" || (i > 0 && src[i - 1] === "\\")) { out += src[i++]; continue; }
      let j = i + 1;
      while (j < src.length && !(src[j] === "$" && src[j - 1] !== "\\")) j++;
      if (j >= src.length) { out += src.slice(i); break; }
      const body = src.slice(i + 1, j);
      let depth = braceDepth(body);
      if (depth <= 0) { out += "$" + body + "$"; i = j + 1; continue; }
      let acc = body;
      let k = j + 1;
      let mode = "prose";
      let outside = "";
      let guard = 0;
      let ok = false;
      while (k < src.length && guard < 800 && depth > 0) {
        if (src[k] === "<") { ok = false; break; }
        if (src[k] === "$" && src[k - 1] !== "\\") {
          if (mode === "prose") { acc += textifyProseGap(outside); outside = ""; mode = "math"; }
          else mode = "prose";
          k++;
          guard++;
          continue;
        }
        const step = braceDeltaAt(src, k);
        depth += step.d;
        const piece = src.slice(k, k + step.n);
        if (mode === "prose") outside += piece;
        else acc += piece;
        k += step.n;
        guard += step.n;
        if (depth <= 0) { ok = true; break; }
      }
      if (ok) {
        if (mode === "math") {
          while (k < src.length && src[k] !== "$" && src[k] !== "<") { acc += src[k]; k++; }
          if (src[k] === "$") k++;
        }
        if (outside) acc += textifyProseGap(outside);
        acc = promoteSetBraces(acc);
        out += "$" + acc + "$";
        i = k;
      } else {
        out += "$" + body + "$";
        i = j + 1;
      }
    }
    return out;
  }
  function healLeftBraceTex(s) {
    const src = String(s || "");
    if (!src || (src.indexOf("\\left") < 0 && src.indexOf("\\right") < 0)) return src;
    let out = "";
    let realLeft = 0;
    const fakeAt = [];
    let i = 0;
    while (i < src.length) {
      if (src.startsWith("\\left", i) && !/[A-Za-z]/.test(src[i + 5] || "")) {
        let j = i + 5;
        while (src[j] === " " || src[j] === "\t") j++;
        if (src[j] === "{" ) {
          const close = matchGroupBrace(src, j);
          const rightAt = unmatchedRight(src, j + 1);
          if (close !== -1 && (rightAt === -1 || close < rightAt)) {
            fakeAt.push(realLeft);
            i = j;
            continue;
          }
          out += "\\left\\{";
          realLeft++;
          i = j + 1;
          continue;
        }
        out += "\\left";
        realLeft++;
        i += 5;
        continue;
      }
      if (src.startsWith("\\right", i) && !/[A-Za-z]/.test(src[i + 6] || "")) {
        let j = i + 6;
        while (src[j] === " " || src[j] === "\t") j++;
        const fake = fakeAt.length && fakeAt[fakeAt.length - 1] === realLeft;
        if (realLeft > 0 && !fake) {
          realLeft--;
          if (src[j] === "}" ) { out += "\\right\\}"; i = j + 1; continue; }
          out += "\\right";
          i += 6;
          continue;
        }
        if (fake) fakeAt.pop();
        if (src[j] === "\\" && src[j + 1] === "}") { out += "\\}"; i = j + 2; continue; }
        if (src[j] === "}") { out += "\\}"; i = j + 1; continue; }
        if (src[j] === ".") { i = j + 1; continue; }
        if (src[j] === ")" || src[j] === "]" || src[j] === "|") { out += src[j]; i = j + 1; continue; }
        i = j;
        continue;
      }
      out += src[i];
      i++;
    }
    return healSplitMathBraces(out);
  }

  function repairMarksExportTex(s) {
    let t = String(s || "");
    if (!t) return t;
    try { t = healLeftBraceTex(t); } catch (_) { /* */ }
    try { t = collapseEscapedBackslashes(t); } catch (_) { /* */ }
    // Invisible math operators + zero-widths
    t = t.replace(/[\u2061\u2062\u2063\u2064\u2060\u200b\u200c\u200d\ufeff]/g, "");
    // Double-escaped grouping braces around commands: \{\log\} → \log
    t = t.replace(/\\\{(\\[a-zA-Z]+)\\\}/g, "$1");
    // Braced command group {\log} / {log} → \log (common Marks log-base export)
    t = t.replace(/(?<![A-Za-z])\{\\?(log|ln|sin|cos|tan|cot|sec|csc|lim|exp|max|min|det|gcd|lcm|arg|deg)\}/gi,
      (_, n) => "\\" + String(n).toLowerCase());
    // {log}_{cosx} / {\log}_{sinx} → \log_{\cos x}
    t = t.replace(/\{\\?(log|ln)\}_\{(sin|cos|tan|cot|sec|csc)x\}/gi,
      (_, a, b) => "\\" + a.toLowerCase() + "_{\\" + b.toLowerCase() + " x}");
    t = t.replace(/\\(log|ln)_\{(sin|cos|tan|cot|sec|csc)x\}/gi,
      (_, a, b) => "\\" + a.toLowerCase() + "_{\\" + b.toLowerCase() + " x}");
    // \left|sin → \left|\sin
    t = t.replace(/(\\left\s*\|)\s*(sin|cos|tan|cot|sec|csc)\b/gi,
      (_, left, fn) => left + "\\" + String(fn).toLowerCase());
    // Bare sin/cos after | : |sin x|
    t = t.replace(/(\|)\s*(sin|cos|tan|cot|sec|csc)\s+(?=[A-Za-z])/gi,
      (_, bar, fn) => bar + "\\" + String(fn).toLowerCase() + " ");
    // Bare gcd( → \gcd(
    t = t.replace(/(^|[^\\A-Za-z])gcd\s*(\(|\\left)/g, "$1\\gcd $2");

    // qxmd170: {lncos}^{2}x / {lnsin} → \ln\cos^{2} x / \ln\sin (before bare glue)
    t = t.replace(/\{(ln|log)(sin|cos|tan|cot|sec|csc)\}(\^\{[^}]*\}|\^\d)?([A-Za-z0-9]?)/gi,
      (_, a, b, pow, v) => "\\" + a.toLowerCase() + "\\" + b.toLowerCase() + (pow || "") + (v ? " " + v : ""));
    // qxmd170: bare ln/log glued to trig — lnsinx / lncosx / logsinx (inside \dfrac{} too)
    t = t.replace(/(^|[^\\A-Za-z])(ln|log)(sin|cos|tan|cot|sec|csc)([A-Za-z0-9]?)/gi,
      (_, pre, a, b, v) => pre + "\\" + a.toLowerCase() + " \\" + b.toLowerCase() + (v ? " " + v : ""));
    // qxmd170: product glue sinxcosx / 2sinxcosx / sinxcos → \sin x \cos …
    t = t.replace(/(^|[^\\A-Za-z])(sin|cos|tan|cot|sec|csc)(x|y|z|t|u|v)(sin|cos|tan|cot|sec|csc)([A-Za-z0-9]?)/gi,
      (_, pre, a, v, b, v2) => pre + "\\" + a.toLowerCase() + " " + v + " \\" + b.toLowerCase() + (v2 ? " " + v2 : ""));

    // qxmd167/170: glued trig/log words — sinx / cosx / tanx (lookahead: end or non-letter)
    t = t.replace(/(^|[^\\A-Za-z])(sin|cos|tan|cot|sec|csc|log|ln)(x|y|z|t|u|v)(?![A-Za-z])/gi,
      (_, pre, fn, v) => pre + "\\" + fn.toLowerCase() + " " + v);
    // Bare fn before digit/paren/\left: sin 2x / log\left( → \sin / \log\left
    t = t.replace(/(^|[^\\A-Za-z])(sin|cos|tan|cot|sec|csc|log|ln)\s*(?=[0-9(]|\\left)/gi,
      (_, pre, fn) => pre + "\\" + fn.toLowerCase() + " ");
    // Bare log/ln before subscript: log _{1/2} → \log_{1/2}
    t = t.replace(/(^|[^\\A-Za-z])(log|ln)\s+(_\{)/gi,
      (_, pre, fn, sub) => pre + "\\" + fn.toLowerCase() + sub);
    // After a command already present: \sin xcos → \sin x \cos
    t = t.replace(/(\\(?:sin|cos|tan|cot|sec|csc|ln|log)\s+[A-Za-z0-9])(sin|cos|tan|cot|sec|csc)\b/gi,
      (_, left, fn) => left + " \\" + fn.toLowerCase());
    // Also: \sin xcosx (variable still glued to next trig)
    t = t.replace(/(\\(?:sin|cos|tan|cot|sec|csc|ln|log)\s+)([A-Za-z0-9])(sin|cos|tan|cot|sec|csc)\b/gi,
      (_, left, v, fn) => left + v + " \\" + fn.toLowerCase());
    // \lnsinx / \lncosx (command glued to sin/cos)
    t = t.replace(/\\(ln|log)(sin|cos|tan|cot|sec|csc)([A-Za-z0-9]?)/gi,
      (_, a, b, v) => "\\" + a.toLowerCase() + " \\" + b.toLowerCase() + (v ? " " + v : ""));
    // Greek glued to English: \betaare → \beta are
    t = t.replace(/\\(alpha|beta|gamma|delta|theta|phi|psi|omega|mu|nu|sigma|lambda|rho|tau|epsilon|varepsilon|pi)([a-z]{2,})/gi,
      (_, g, word) => {
        const w = String(word);
        if (/^(re|are|is|of|to|in|on|at|as|be|or|an|the|and|for|with|from|that|this|then|than|into|over|under)$/i.test(w) ||
            /^[a-z]{3,}$/i.test(w)) {
          return "\\" + g.toLowerCase() + " " + w;
        }
        return "\\" + g + w;
      });
    // sin^2 / cos^{-1} → \sin^2 / \cos^{-1} (KaTeX, not HTML sup)
    t = t.replace(/(^|[^\\A-Za-z])(sin|cos|tan|cot|sec|csc|log|ln)\s*\^\s*(\{-1\}|-1|\d)/gi,
      (_, pre, fn, p) => pre + "\\" + String(fn).toLowerCase() + "^" + p);
    // Subscript _{1 / 2} → _{1/2}
    t = t.replace(/_\{\s*(\d+)\s*\/\s*(\d+)\s*\}/g, "_{$1/$2}");
    // qxmd174: keep TeX \{ \} set braces (do not collapse to { }).
    // Double-escaped \{\cmd\} already handled above. Preserve \left\{ / \right\}.
    return t;
  }

  function looksMarksBrokenTex(s) {
    const t = String(s || "");
    if (!t) return false;
    if (/[\u2061\u2062\u2063\u2064]/.test(t)) return true;
    if (/\\\{(?:\\)?(?:log|ln|sin|cos|tan)\}/.test(t)) return true;
    if (/\{\\?(?:log|ln|sin|cos|tan)\}/.test(t)) return true;
    if (/\\left\s*\|\s*(?:sin|cos|tan)\b/i.test(t)) return true;
    if (/(?:^|[^\\])(?:sin|cos|tan|ln|log)x\b/i.test(t)) return true;
    if (/(?:^|[^\\])(?:ln|log)(?:sin|cos|tan)/i.test(t)) return true;
    if (/(?:sin|cos|tan)x(?:sin|cos|tan)/i.test(t)) return true;
    if (/\\(?:ln|log)(?:sin|cos)/i.test(t)) return true;
    if (/\\(?:alpha|beta|gamma|theta)[a-z]{2,}/i.test(t)) return true;
    return false;
  }

  function tidyWhitespace(html) {
    let s = String(html || "");
    s = s.replace(/(?:&nbsp;|\u00a0){2,}/gi, " ");
    s = s.replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>");
    s = s.replace(/\n{3,}/g, "\n\n");
    s = s.replace(/[ \t]{3,}/g, "  ");
    return s.trim();
  }

  /**
   * High-confidence display repairs for scanned Q/sol/option TeX.
   * Never wraps bare LaTeX. Never touches answers.
   */
  function healDisplayBreaks(s) {
    let t = String(s == null ? "" : s);
    if (!t) return t;
    t = t.replace(/cdn-question-pool\.{2,}app/g, "cdn-question-pool.getmarks.app");
    t = t.replace(/cdn-assets\.{2,}app/g, "cdn-assets.getmarks.app");
    t = t.replace(/\\mathrm([A-Z])/g, "\\mathrm{$1}");
    t = t.replace(/\\left\$\\\{/g, "\\left\\{");
    t = t.replace(/\\left\$\{/g, "\\left\\{");
    t = t.replace(/\\right\$\\\}/g, "\\right\\}");
    t = t.replace(/\\right\$\}/g, "\\right\\}");
    t = t.replace(/\\left\$\s*\(/g, "\\left(");
    t = t.replace(/\\right\$\s*\)/g, "\\right)");
    t = t.replace(/\\left\$/g, "\\left(");
    t = t.replace(/\\right\$/g, "\\right)");
    t = t.replace(/(?:\\)?(sin|cos|tan|cot|sec|csc|cosec)\s*[-−]\s*1\b/g, "\\$1^{-1}");
    t = t.replace(/\bandf\b/g, "and f");
    t = t.replace(/\bwherex\b/g, "where x");
    t = t.replace(/\bthenx\b/g, "then x");
    t = t.replace(/\bhencex\b/g, "hence x");
    t = t.replace(/\bthusx\b/g, "thus x");
    t = t.replace(/\bsincex\b/g, "since x");
    t = t.replace(/\biffx\b/g, "if fx");
    t = t.replace(/\b(and|if|where|then)(?=\\frac|\\mathrm|\$)/g, "$1 ");
    t = t.replace(/(^|>|\n)\s*ray\}\{/g, "$1\\begin{array}{");
    t = t.replace(/(^|>|\n)\s*gin\{array\}/g, "$1\\begin{array}");
    return t;
  }

  /**
   * Full pipeline for any stem/option/solution/hint string.
   * Returns { html, meta }
   */
  function normalizeMathContent(raw) {
    const meta = {
      hadRawKatex: false,
      recovered: 0,
      review: false,
      hadUnsafe: false
    };
    let s = String(raw == null ? "" : raw);
    if (!s) return { html: s, meta };
    const figSlots = [];
    s = s.replace(/<img\b[^>]*>/gi, (m) => {
      const k = "__QXMSFIG" + figSlots.length + "__";
      figSlots.push(m);
      return k;
    });

    meta.hadRawKatex = detectBrokenKatex(s);
    meta.hadUnsafe = /<(?:script|iframe)\b/i.test(s);

    if (meta.hadRawKatex) {
      const rec = recoverKatexHtml(s);
      s = rec.html;
      meta.recovered += rec.recovered;
      if (rec.review) meta.review = true;
      s = collapseJunkSpans(s);
      // Decode common entities left in surrounding HTML after katex peel
      s = decodeEntities(s);
    }

    // Repair entity digits accidentally turned into unicode super/subscripts
    s = s.replace(/&#([⁰¹²³⁴⁵⁶⁷⁸⁹]+);/g, (_, digs) => {
      const map = { "⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9" };
      return "&#" + [...digs].map((c) => map[c] || c).join("") + ";";
    });
    s = decodeEntities(s);

    s = stripUnsafeHtml(s);
    // qxmd250: collapse \\\frac / \\\{ display leaks. Keep \\ matrix newlines.
    try { s = collapseEscapedBackslashes(s); } catch (_) { /* */ }
    // qxmd163: also collapse \\{ before letters already done; repair Marks braces/U+2061
    try { s = repairMarksExportTex(s); } catch (_) { /* */ }
    try { s = healDisplayBreaks(s); } catch (_) { /* */ }
    s = normalizeDelimiters(s);
    try { s = fixProseDollars(s); } catch (_) { /* */ }
    try { s = healOddDollars(s); } catch (_) { /* */ }
    s = tidyWhitespace(s);
    try { s = chemifyPlain(s); } catch (_) { /* */ }

    // If still leaking katex class tokens as visible source, strip tags aggressively
    if (detectBrokenKatex(s)) {
      meta.review = true;
      s = collapseJunkSpans(s);
      // last resort: strip all remaining katex-class spans' tags
      s = s.replace(/<\/?span\b[^>]*>/gi, (tag) => {
        if (/katex|mord|mrel|mbin|vlist|strut|pstrut|base/i.test(tag)) return "";
        return tag;
      });
      if (detectBrokenKatex(s)) {
        // extreme: tag strip keeping img/table/br
        s = s.replace(/<(?!\/?(?:img|table|thead|tbody|tr|td|th|br|sub|sup|b|i|em|strong|ul|ol|li|p|div|h[1-6])\b)[^>]+>/gi, "");
      }
    }

    if (figSlots.length) {
      figSlots.forEach((tag, i) => {
        s = String(s).split("__QXMSFIG" + i + "__").join(tag);
      });
    }
    return { html: s, meta };
  }

  function sanitizeQuestionContent(raw) {
    return normalizeMathContent(raw).html;
  }

  function sanitizeSolutionContent(raw) {
    return normalizeMathContent(raw).html;
  }

  function detectUnbalancedLatex(s) {
    const t = String(s || "");
    const dollars = (t.match(/(?<!\\)\$/g) || []).length;
    if (dollars % 2 !== 0) return true;
    const openPar = (t.match(/\\\(/g) || []).length;
    const closePar = (t.match(/\\\)/g) || []).length;
    if (openPar !== closePar) return true;
    const openBr = (t.match(/\\\[/g) || []).length;
    const closeBr = (t.match(/\\\]/g) || []).length;
    if (openBr !== closeBr) return true;
    return false;
  }

  function validateLatex(s) {
    const issues = [];
    if (detectBrokenKatex(s)) issues.push("raw_katex_html");
    if (detectUnbalancedLatex(s)) issues.push("unbalanced_delimiters");
    if (/\\\\frac\b|\\fra\b(?![a-z])|\\sqt\b|\\beigin\b/i.test(s)) issues.push("invalid_latex_typo");
    return { ok: issues.length === 0, issues };
  }

  /** Extract boxed / final answer hints from solution text (never invent). */
  function extractSolutionAnswerHint(sol) {
    const t = String(sol || "").replace(/<[^>]+>/g, " ");
    const boxed = /\\boxed\s*\{([^}]{1,80})\}/.exec(t);
    if (boxed) return boxed[1].trim();
    const final = /(?:final\s*answer|correct\s*(?:option|answer|choice)|answer\s*is)\s*[:\-]?\s*\(?([A-Da-d1-4])\)?/i.exec(t);
    if (final) return final[1].trim().toUpperCase();
    return null;
  }

  function normalizeAnswerToken(a) {
    if (a == null) return null;
    if (Array.isArray(a)) return a.map(normalizeAnswerToken).filter(Boolean);
    if (typeof a === "number") return String(a);
    let s = String(a).trim();
    if (!s) return null;
    // letter answers
    const m = /^[\(\[]?([A-Da-d])[\)\]]?$/.exec(s);
    if (m) return m[1].toUpperCase();
    return s;
  }

  /**
   * Flag answer/solution mismatches — NEVER overwrite keys.
   * Returns { status: 'PASS'|'REVIEW_REQUIRED', reason? }
   */
  function validateAnswerConsistency(q) {
    if (!q || typeof q !== "object") return { status: "PASS" };
    const ans = normalizeAnswerToken(q.answer != null ? q.answer : q.correctAnswer);
    const sol = q.solution || q.explanation || "";
    if (!ans || !sol) return { status: "PASS" };
    const hint = extractSolutionAnswerHint(sol);
    if (!hint) return { status: "PASS" };
    const ansArr = Array.isArray(ans) ? ans : [ans];
    const hintNorm = normalizeAnswerToken(hint);
    // Only compare when both look like option letters
    const letterish = (x) => /^[A-D]$/i.test(String(x || ""));
    if (letterish(hintNorm) && ansArr.every(letterish)) {
      if (!ansArr.map((x) => String(x).toUpperCase()).includes(String(hintNorm).toUpperCase())) {
        return {
          status: "REVIEW_REQUIRED",
          reason: "answer_solution_mismatch",
          answer: ansArr,
          solutionHint: hintNorm
        };
      }
    }
    return { status: "PASS" };
  }

  function sanitizeQuestion(q) {
    if (!q || typeof q !== "object") return { question: q, meta: { fields: {} } };
    const meta = { fields: {}, reviewFlags: [] };
    const apply = (field) => {
      if (q[field] == null || typeof q[field] !== "string") return;
      const before = q[field];
      const { html, meta: m } = normalizeMathContent(before);
      q[field] = html;
      if (m.hadRawKatex || m.recovered || m.review) {
        meta.fields[field] = m;
        if (m.review) meta.reviewFlags.push(field + ":recovery_uncertain");
      }
    };
    apply("q");
    apply("question");
    apply("questionText");
    apply("solution");
    apply("explanation");
    apply("hint");
    if (Array.isArray(q.options)) {
      q.options = q.options.map((o, i) => {
        if (typeof o === "string") {
          const { html, meta: m } = normalizeMathContent(o);
          if (m.hadRawKatex || m.recovered) meta.fields["options[" + i + "]"] = m;
          return html;
        }
        if (o && typeof o === "object") {
          ["text", "html", "value"].forEach((k) => {
            if (typeof o[k] === "string") {
              const { html, meta: m } = normalizeMathContent(o[k]);
              o[k] = html;
              if (m.hadRawKatex || m.recovered) meta.fields["options[" + i + "]." + k] = m;
            }
          });
        }
        return o;
      });
    }
    const ansVal = validateAnswerConsistency(q);
    if (ansVal.status === "REVIEW_REQUIRED") {
      meta.reviewFlags.push("REVIEW_REQUIRED:" + ansVal.reason);
      meta.answerReview = ansVal;
      // annotate but do not change answer
      if (!q._qxReview) q._qxReview = [];
      if (Array.isArray(q._qxReview) && !q._qxReview.includes("REVIEW_REQUIRED")) {
        q._qxReview.push("REVIEW_REQUIRED");
      }
    }
    return { question: q, meta };
  }

  return {
    detectBrokenKatex,
    detectRawHtml,
    detectUnbalancedLatex,
    healOddDollars,
    fixProseDollars,
    healDisplayBreaks,
    repairMarksDollarSoup,
    recoverKatexHtml,
    normalizeMathContent,
    normalizeLatex: normalizeDelimiters,
    repairMarksExportTex,
    collapseEscapedBackslashes,
    looksMarksBrokenTex,
    decodeEntities,
    sanitizeQuestionContent,
    sanitizeSolutionContent,
    sanitizeHtml: stripUnsafeHtml,
    sanitizeQuestion,
    validateLatex,
    validateAnswerConsistency,
    validateQuestion: sanitizeQuestion,
    validateOptions: function (opts) {
      return (opts || []).map((o) => (typeof o === "string" ? sanitizeQuestionContent(o) : o));
    },
    validateSolution: sanitizeSolutionContent,
    validateAnswer: validateAnswerConsistency
  };
});
