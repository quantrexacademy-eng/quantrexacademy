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
    return t;
  }

  function stripZeroWidth(s) {
    return String(s || "").replace(/[\u200b\u200c\u200d\ufeff\u2060]/g, "");
  }

  /** Convert plain chem-ish tokens like NO2 / CH3 / NH2 to unicode subscripts. */
  function chemifyPlain(s) {
    let t = String(s || "");
    t = t.replace(/\b(NO|SO|CO|NH|CH|OH|PO|MnO|KMnO|H)(\d+)\b/g, (_, el, dig) =>
      el + dig.split("").map((d) => SUB_DIG[d] || d).join("")
    );
    t = t.replace(/\b(Cl|Br|I|F|OH)[-−]\b/g, (_, el) => el + "⁻");
    t = t.replace(/\b([A-Za-z]+)(\d+)([+\-−])\b/g, (_, el, dig, sign) =>
      el + dig.split("").map((d) => SUB_DIG[d] || d).join("") + (SUPER_DIG[sign] || sign)
    );
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
    // Collapse empty math islands
    s = s.replace(/\$\s*\$/g, "");
    s = s.replace(/\\\(\s*\\\)/g, "");
    s = s.replace(/\\\[\s*\\\]/g, "");
    // Prefer \( \) over single $ for recovered chem-only? Keep $ if already present.
    return s;
  }

  /**
   * qxmd163 — Marks/Firestore export quirks → KaTeX-safe TeX (meaning-preserving).
   * Does NOT change math meaning; only unwraps broken wrappers / invisible ops / escapes.
   */
  function repairMarksExportTex(s) {
    let t = String(s || "");
    if (!t) return t;
    // Invisible math operators (U+2061 function application, etc.)
    t = t.replace(/[\u2061\u2062\u2063\u2064]/g, "");
    // Double-escaped grouping braces around commands: \{\log\} → \log
    t = t.replace(/\\\{(\\[a-zA-Z]+)\\\}/g, "$1");
    // Braced command group {\log} / {log} → \log (common Marks log-base export)
    t = t.replace(/\{\\?(log|ln|sin|cos|tan|cot|sec|csc|lim|exp|max|min|det|gcd|lcm|arg|deg)\}/gi,
      (_, n) => "\\" + String(n).toLowerCase());
    // \left|sin → \left|\sin
    t = t.replace(/(\\left\s*\|)\s*(sin|cos|tan|cot|sec|csc)\b/gi,
      (_, left, fn) => left + "\\" + String(fn).toLowerCase());
    // Bare sin/cos after | : |sin x|
    t = t.replace(/(\|)\s*(sin|cos|tan|cot|sec|csc)\s+(?=[A-Za-z])/gi,
      (_, bar, fn) => bar + "\\" + String(fn).toLowerCase() + " ");
    // Subscript _{1 / 2} → _{1/2}
    t = t.replace(/_\{\s*(\d+)\s*\/\s*(\d+)\s*\}/g, "_{$1/$2}");
    // Collapse leftover \\{ \\} that are not \left\{ / \right\}
    t = t.replace(/(^|[^\\])\\\{(?![a-zA-Z])/g, "$1{");
    t = t.replace(/(^|[^\\])\\\}/g, "$1}");
    // Restore \left\{ \right\} if over-collapsed
    t = t.replace(/(\\left)\s*\{/g, "$1\\{");
    t = t.replace(/(\\right)\s*\}/g, "$1\\}");
    return t;
  }

  function looksMarksBrokenTex(s) {
    const t = String(s || "");
    if (!t) return false;
    if (/[\u2061\u2062\u2063\u2064]/.test(t)) return true;
    if (/\\\{(?:\\)?(?:log|ln|sin|cos|tan)\}/.test(t)) return true;
    if (/\{\\?(?:log|ln|sin|cos|tan)\}/.test(t)) return true;
    if (/\\left\s*\|\s*(?:sin|cos|tan)\b/i.test(t)) return true;
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
    // qxmd159: Firestore/JSON double-escaped commands (\\frac) → \frac for KaTeX. Never strip slash to bare "frac".
    // Collapse only when a TeX command name follows; keep \\ matrix newlines (\\ + non-letter).
    if (/\\[a-zA-Z]/.test(s)) {
      s = s.replace(/\\{2,}([a-zA-Z]+)/g, "\\$1");
    }
    // qxmd163: also collapse \\{ before letters already done; repair Marks braces/U+2061
    try { s = repairMarksExportTex(s); } catch (_) { /* */ }
    s = normalizeDelimiters(s);
    s = tidyWhitespace(s);

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
    recoverKatexHtml,
    normalizeMathContent,
    normalizeLatex: normalizeDelimiters,
    repairMarksExportTex,
    looksMarksBrokenTex,
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
