// Quantrex — Question QA Validator (format / logic / answer consistency)
// Marks questions ⚠️ NEEDS REVIEW when structural problems are found.
// Does NOT auto-rewrite bank data; used by practice diagnostics + admin tools.
(function (global) {
  "use strict";

  function plain(html) {
    return String(html || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasMath(s) {
    return /\$|\\\(|\\\[|<math[\s>]|\\frac|\\sqrt|\\int|\\sum|\\lim|\\begin/i.test(String(s || ""));
  }

  function unclosedLatex(s) {
    const t = String(s || "");
    const dollars = (t.match(/(?<!\\)\$/g) || []).length;
    if (dollars % 2 !== 0) return true;
    const open = (t.match(/\\begin\{/g) || []).length;
    const close = (t.match(/\\end\{/g) || []).length;
    return open !== close;
  }

  function mergedWords(s) {
    // "thevalue" / "ofx" style glue — low confidence, only flag dense cases
    return /\b[a-z]{2,}[A-Z][a-z]{2,}\b/.test(s) || /\b(the|of|is|to|and)[a-z]{4,}\b/i.test(s);
  }

  /**
   * @returns {{ ok: boolean, status: string, errors: string[], warnings: string[], type: string }}
   */
  function validateQuestion(q) {
    const errors = [];
    const warnings = [];
    if (!q) {
      return { ok: false, status: "NEEDS_REVIEW", errors: ["Missing question object"], warnings, type: "unknown" };
    }

    const type = typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType
      ? QuantrexQFormat.getType(q)
      : (q.questionType || q.type || "singleCorrect");
    const stem = plain(q.q);
    const opts = q.options || [];

    // —— Format ——
    if (!stem || stem.length < 3) errors.push("Question stem empty or too short");
    if (mergedWords(stem)) warnings.push("Possible merged words in stem");
    if (unclosedLatex(q.q)) errors.push("Unbalanced LaTeX delimiters in stem");
    if (/\\frac\{[^}]*$|\\sqrt\{[^}]*$/i.test(String(q.q || ""))) errors.push("Broken LaTeX command in stem");

    // —— Type / options ——
    if (type === "numerical" || type === "subjective") {
      const cv = q.correctValue != null ? String(q.correctValue).trim() : "";
      if (!cv && typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.correctNumerical) {
        const n = QuantrexQFormat.correctNumerical(q);
        if (!n) errors.push("Numerical answer (correctValue) missing");
      } else if (!cv) {
        errors.push("Numerical answer (correctValue) missing");
      }
    } else {
      if (!opts.length) errors.push("MCQ options missing");
      if (opts.length && opts.length < 2) warnings.push("Fewer than 2 options");
      const emptyOpts = opts.filter((o) => !plain(o) && !/<img/i.test(String(o || ""))).length;
      if (emptyOpts) errors.push(emptyOpts + " empty option(s)");
      opts.forEach((o, i) => {
        if (unclosedLatex(o)) errors.push("Unbalanced LaTeX in option " + String.fromCharCode(65 + i));
      });
      let cor = [];
      if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.correctIndices) {
        cor = QuantrexQFormat.correctIndices(q);
      } else if (Array.isArray(q.answers) && q.answers.length) {
        cor = q.answers.slice();
      } else if (q.answer != null) {
        cor = [q.answer];
      }
      if (!cor.length) errors.push("Correct answer index missing");
      cor.forEach((i) => {
        if (typeof i !== "number" || i < 0 || (opts.length && i >= opts.length)) {
          errors.push("Correct answer index out of range: " + i);
        }
      });
      if (type === "multipleCorrect" && cor.length < 2) {
        warnings.push("Multiple-correct type but fewer than 2 correct indices");
      }
    }

    // —— Solution consistency (heuristic) ——
    const sol = plain(q.solution);
    if (sol && sol.length >= 20 && type !== "numerical" && type !== "subjective") {
      let cor = [];
      if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.correctIndices) {
        cor = QuantrexQFormat.correctIndices(q);
      }
      if (cor.length === 1) {
        const letter = String.fromCharCode(65 + cor[0]);
        const claims = [];
        const m1 = sol.match(/(?:correct\s*(?:option|answer|choice)|answer\s*is|option)\s*[:\s]*\(?([A-D])\)?/i);
        if (m1) claims.push(m1[1].toUpperCase());
        const m2 = sol.match(/\(([A-D])\)\s*(?:is\s*)?(?:correct|right)/i);
        if (m2) claims.push(m2[1].toUpperCase());
        const unique = [...new Set(claims)];
        if (unique.length === 1 && unique[0] !== letter) {
          errors.push("Solution claims option " + unique[0] + " but key is " + letter);
        }
      }
    }

    // —— Images ——
    if (/figure|diagram|shown\s+below|as\s+shown/i.test(stem) && !/<img/i.test(String(q.q || ""))) {
      warnings.push("Stem references a figure but no <img> found");
    }

    // —— Math present but may be raw ——
    if (/\\frac|\\sqrt|\\int|\\sum|\\alpha|\\beta|\\theta|\\pi|\\leq|\\geq/i.test(String(q.q || "") + opts.join(" "))
      && !hasMath(q.q) && !opts.some(hasMath)) {
      warnings.push("LaTeX commands without math delimiters");
    }

    const ok = errors.length === 0;
    return {
      ok,
      status: ok ? (warnings.length ? "OK_WITH_WARNINGS" : "OK") : "NEEDS_REVIEW",
      errors,
      warnings,
      type,
      id: q.id != null ? q.id : null
    };
  }

  function validateMany(list, limit) {
    const max = limit != null ? limit : (list || []).length;
    const rows = [];
    let needs = 0;
    for (let i = 0; i < Math.min(max, (list || []).length); i++) {
      const r = validateQuestion(list[i]);
      if (!r.ok) needs++;
      rows.push(r);
    }
    return { total: rows.length, needsReview: needs, rows };
  }

  function formatBadge(result) {
    if (!result || result.ok) return "";
    const reason = (result.errors || []).slice(0, 2).join("; ");
    return `<span class="qx-qa-badge" title="${String(reason).replace(/"/g, "&quot;")}">⚠️ NEEDS REVIEW</span>`;
  }

  global.QuantrexQuestionQA = {
    validateQuestion,
    validateMany,
    formatBadge,
    plain
  };
})(typeof window !== "undefined" ? window : globalThis);
