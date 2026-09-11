/**
 * Mechanical proofread for Quantrex questions — never invents academic content.
 * Fixes export junk, List/LaTeX glue, brand crumbs, and solution step numbers.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof root !== "undefined") root.QxProof = api;
})(typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : this, function () {
  "use strict";

  function ownedRewrite(html) {
    try {
      if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.rewriteHtml) {
        return QxOwnedFigs.rewriteHtml(html);
      }
    } catch (_) { /* */ }
    if (typeof require === "function") {
      try {
        const owned = require("./qx-owned-figures");
        if (owned && owned.rewriteHtml) return owned.rewriteHtml(html);
      } catch (_) { /* */ }
    }
    return html;
  }

  function proofreadHtml(s) {
    let out = String(s == null ? "" : s);
    if (!out) return out;

    out = out.replace(/https?:\\?\/\\?\/\.app\//gi, "https://cdn-question-pool.getmarks.app/");
    out = out.replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/");
    out = out.replace(/https?:\/\/cdn-question-pool\.app\//gi, "https://cdn-question-pool.getmarks.app/");
    out = ownedRewrite(out);

    out = out.replace(/LIST\s*[-–]?\s*II\s*\$/gi, "List-II");
    out = out.replace(/LIST\s*[-–]?\s*I\s*\$/gi, "List-I");
    out = out.replace(/List\s*[-–]?\s*II\s*\$/gi, "List-II");
    out = out.replace(/List\s*[-–]?\s*I\s*\$/gi, "List-I");
    out = out.replace(/\bLIST[\s\-]*II\b/g, "List-II");
    out = out.replace(/\bLIST[\s\-]*I\b(?!I)/g, "List-I");
    out = out.replace(/\bCOLUMN[\s\-]*II\b/g, "Column-II");
    out = out.replace(/\bCOLUMN[\s\-]*I\b(?!I)/g, "Column-I");

    out = out.replace(/\\\\\s*\[\s*[\d.]+\s*(?:pt|em|ex|mm|cm|mu)?\s*\]/gi, "\\\\");
    out = out.replace(/(?:^|>|\s)\[\s*[\d.]+\s*pt\s*\](?=\s|<|$)/gi, " ");
    out = out.replace(
      /\$([A-Za-z])\s*[–—−-]\s*(axis|axes|coordinate|intercept|th)s?\b\$?/gi,
      (_, v, w) => "$" + v + "$-" + w
    );
    out = out.replace(/<t[dh][^>]*>\s*\[\s*[\d.]+\s*pt\s*\]\s*<\/t[dh]>/gi, "");
    out = out.replace(/\[\s*[\d.]+\s*pt\s*\]/gi, "");
    out = out.replace(/\bm\s+L\b/g, "mL");

    out = out.replace(
      /\$\$\s*(\\mathrm\s*\{[A-Za-z0-9]+\})\s*\$\$/g,
      (_, inner) => "$" + inner + "$"
    );
    out = out.replace(/\$([^$\n]{0,160})\$\$(\\mathrm\{)/g, "$$$1 $2");
    out = out.replace(/\$\{\s*\}\s*\^\{\s*([^}]+)\s*\}\s*C_\{\s*([^}]+)\s*\}\s*\$/g, "$\\binom{$1}{$2}$");
    out = out.replace(/\$\{\s*\^\{\s*([^}]+)\s*\}\s*C_\{\s*([^}]+)\s*\}\s*\$/g, "$\\binom{$1}{$2}$");
    out = out.replace(/\{\s*\}\s*\^\{\s*([^}]+)\s*\}\s*C_\{\s*([^}]+)\s*\}/g, "\\binom{$1}{$2}");
    out = out.replace(/\bSgn\s*\(/g, "$\\operatorname{sgn}(");
    out = out.replace(/\\mathrm\s*\{\s*\}/g, "");
    out = out.replace(/\\text\s*\{\s*\}/g, "");
    out = out.replace(/\$\$\s*\$\$/g, "");
    out = out.replace(/\$\s*\$/g, "");

    out = out.replace(/\bGet\s*Marks(?:\s*App)?\b/gi, "");
    out = out.replace(/\bMarks App\b/gi, "");
    out = out.replace(/\bweb\.getmarks\.app\b/gi, "");
    out = out.replace(/support us by uploading[\s\S]{0,120}/gi, "");
    out = out.replace(/official solution is not available\.?/gi, "");
    out = out.replace(/community solution\.?/gi, "");
    out = out.replace(/powered by\s+marks\b/gi, "");

    out = out.replace(/<(?:span|div|p)[^>]*(?:class|id)=["'][^"']*watermark[^"']*["'][^>]*>[\s\S]*?<\/(?:span|div|p)>/gi, "");
    out = out.replace(/<img[^>]+(?:getmarks-brand|marks-premium|ic_marks|marks_selected)[^>]*>/gi, "");

    out = out.replace(/^\s*(?:step\s*)\d{1,2}\s*[:.)\-–]\s*/gim, "");
    out = out.replace(/(<br\s*\/?>|\n)\s*(?:step\s*)\d{1,2}\s*[:.)\-–]\s*/gim, "$1");

    out = out.replace(/&amp;amp;/g, "&amp;");
    out = out.replace(/(?:&nbsp;|\u00a0){2,}/gi, " ");
    out = out.replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>");
    out = out.replace(/\n{3,}/g, "\n\n");
    out = out.replace(/[ \t]{3,}/g, "  ");
    out = out.replace(/\bm\s+L\b/g, "mL");
    out = out.replace(/\\verb\|([^|]{1,240})\|/g, '<code class="qx-tex-code">$1</code>');
    out = out.replace(/```(?:[a-zA-Z0-9]+)?\s*\n?([\s\S]{0,4000}?)```/g, '<pre class="qx-tex-code"><code>$1</code></pre>');
    out = out.replace(/\\quad\\quad/g, "\\quad");
    out = out.replace(/\\;\s*\\;/g, "\\;");

    out = out.replace(/\$\s*\\(lt|gt|le|ge|leq|geq|ne|neq|Rightarrow|rightarrow|leftarrow|to)\s*\$/g, (_, cmd) => ({
      lt: " < ", gt: " > ", le: " ≤ ", ge: " ≥ ", leq: " ≤ ", geq: " ≥ ",
      ne: " ≠ ", neq: " ≠ ", Rightarrow: " ⇒ ", rightarrow: " → ",
      leftarrow: " ← ", to: " → "
    }[cmd] || " "));
    out = out.replace(/<span[^>]*class=["'][^"']*katex-error[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi, "$1");
    out = out.replace(/ParseError:[^<\n]{0,400}/g, "");
    out = out.replace(/KaTeX parse error:[^<\n]{0,400}/g, "");

    return out;
  }

  function proofreadQuestion(q) {
    if (!q || typeof q !== "object") return q;
    if (q.q) q.q = proofreadHtml(q.q);
    if (q.question) q.question = proofreadHtml(q.question);
    if (q.questionText) q.questionText = proofreadHtml(q.questionText);
    if (Array.isArray(q.options)) {
      q.options = q.options.map((o) => {
        if (o == null) return o;
        if (typeof o === "string") return proofreadHtml(o);
        if (typeof o === "object") {
          if (o.text) o.text = proofreadHtml(o.text);
          if (o.html) o.html = proofreadHtml(o.html);
          if (o.value && typeof o.value === "string") o.value = proofreadHtml(o.value);
          return o;
        }
        return o;
      });
    }
    if (q.solution) q.solution = proofreadHtml(q.solution);
    if (q.explanation) q.explanation = proofreadHtml(q.explanation);
    return q;
  }

  function isGuttedMatch(html) {
    const s = String(html || "");
    if (!/List[\s\-]*I/i.test(s)) return false;
    if (/<table/i.test(s) && /List[\s\-]*II/i.test(s) && /<td/i.test(s)) return false;
    if (/\\begin\{array\}/i.test(s) && /List[\s\-]*II/i.test(s)) return false;
    return /match list|list[\s\-]*i\b/i.test(s) && !/List[\s\-]*II/i.test(s.replace(/List[\s\-]*I(?!I)/gi, ""));
  }

  return { proofreadHtml, proofreadQuestion, isGuttedMatch };
});
