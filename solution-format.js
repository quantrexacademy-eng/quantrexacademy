// Quantrex — polished solution display (structured steps, shortcut tips, subject themes)
const QuantrexSolution = (() => {
  const PHRASE_MAP = [
    [/Therefore/gi, "Hence"],
    [/Thus,/gi, "So,"],
    [/Thus /gi, "So "],
    [/We get/gi, "This gives"],
    [/We have/gi, "We obtain"],
    [/Using the formula/gi, "Applying the relation"],
    [/By applying/gi, "Applying"],
    [/correct answer is/gi, "required value is"],
    [/Hence the answer/gi, "The answer"],
    [/Option \((\d)\) is correct/gi, "Choice ($1) is correct"],
    [/The correct option is/gi, "The right choice is"],
    [/It follows that/gi, "This implies"],
    [/Substituting the values/gi, "On substituting"],
    [/Simplifying/gi, "On simplification"],
    [/As per/gi, "According to"],
    [/From the above/gi, "From this step"]
  ];

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function plainText(html) {
    return String(html || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isMatchQuestion(q) {
    if (!q) return false;
    const text = String(q.q || "");
    if (/match\s+(the\s+)?list|list[\s\-]*i.*list[\s\-]*ii|column\s+match/i.test(text)) return true;
    if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType(q) === "columnMatch") return true;
    const opts = (q.options || []).map(o => plainText(o)).join(" ");
    return /→|⟶|->/.test(opts) && /\(A\)|\(B\)|\(C\)|\(D\)/i.test(opts);
  }

  function solutionLooksRelevant(q, sol) {
    const solText = plainText(sol);
    if (!solText || solText.length < 20) return false;
    if (/^no solution\.?$/i.test(solText)) return false;
    if (isMatchQuestion(q)) {
      const matchHints = /match|list[\s\-]*i|list[\s\-]*ii|→|mapping|combination|pair|correct\s+option/i.test(solText);
      const calcHeavy = /f\s*['′]\s*\(|derivative|differentiat|integrat|sin\s*[\-−]?\s*\^?1/i.test(solText);
      if (calcHeavy && !matchHints && solText.length > 280) return false;
    }
    return true;
  }

  function normalizeMathChars(html) {
    return String(html || "")
      .replace(/‹/g, "&lt;")
      .replace(/›/g, "&gt;")
      .replace(/≤/g, "$\\le$")
      .replace(/≥/g, "$\\ge$")
      .replace(/≠/g, "$\\ne$")
      .replace(/−/g, "-")
      .replace(/–/g, "-")
      .replace(/—/g, "-")
      .replace(/′/g, "'")
      .replace(/″/g, "\"");
  }

  function structureSolutionBody(html) {
    let out = normalizeMathChars(html);
    if (/<div[^>]+class=["'][^"']*qx-sol-step/i.test(out)) return out;

    const text = plainText(out);
    const stepMarkers = text.match(/\([A-D]\)/gi) || [];
    const hasSteps = stepMarkers.length >= 2 && stepMarkers.length <= 8;

    if (hasSteps) {
      const chunks = out.split(/(?=(?:<br\s*\/?>|\n)\s*\([A-D]\)\s*)/i);
      if (chunks.length > 1) {
        return chunks.map(chunk => {
          const t = chunk.trim();
          if (!t) return "";
          const m = t.match(/^\(?([A-D])\)?\s*/i);
          if (m) {
            const label = m[1].toUpperCase();
            const body = t.replace(/^\(?[A-D]\)?\s*/i, "").trim();
            return `<div class="qx-sol-step"><span class="qx-sol-step-label">${label}</span><div class="qx-sol-step-body">${body}</div></div>`;
          }
          return `<div class="qx-sol-step qx-sol-step-plain"><div class="qx-sol-step-body">${t}</div></div>`;
        }).filter(Boolean).join("");
      }
    }

    out = out.replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>");
    const paras = out.split(/(?:<br\s*\/?>\s*){2,}/i).filter(p => p.trim());
    if (paras.length > 1) {
      return paras.map(p => `<p class="qx-sol-para">${p.trim()}</p>`).join("");
    }
    return out;
  }

  function isCleanLatex(expr) {
    const s = String(expr || "").trim();
    if (!s || s.length < 3 || s.length > 80) return false;
    if (/f\s*['′]|prime|\.\.\.|undefined|NaN/i.test(s)) return false;
    if (/[{}]/.test(s) && (s.split("{").length !== s.split("}").length)) return false;
    return /[=+\-*/\\^]|\\frac|\\sqrt|\\int|\\sum|\\le|\\ge/.test(s);
  }

  function formatShortcutLine(text) {
    let t = String(text || "").trim();
    if (!t) return "";
    t = t.replace(/\s+/g, " ");
    if (isCleanLatex(t) && !/\$/.test(t)) t = `$${t}$`;
    if (typeof Mx !== "undefined") return Mx.html(t);
    return esc(t);
  }

  function extractFinalAnswerLine(raw, q) {
    const patterns = [
      /(?:answer|hence|therefore|so,?|thus)[:\s]+([^.!\n]{4,90})/i,
      /(?:required value|correct option|right choice)\s+(?:is\s+)?([^.!\n]{4,90})/i,
      /=\s*([0-9.\-]+(?:\s*(?:m\/s|J|N|mol|g|Hz|Ω|V|A))?)\s*$/m
    ];
    for (const rx of patterns) {
      const m = raw.match(rx);
      if (m && m[1]) {
        const line = m[1].trim().replace(/\s+/g, " ");
        if (line.length >= 3 && line.length <= 90) return `Final answer: ${line}`;
      }
    }
    if (q && q.answer >= 0 && typeof QuantrexQFormat !== "undefined") {
      const cor = QuantrexQFormat.formatCorrectAnswer(q);
      if (cor && plainText(cor).length <= 120) {
        return `Correct option: ${plainText(cor)}`;
      }
    }
    return "";
  }

  function extractKeyFormula(solution) {
    const latex = [...String(solution || "").matchAll(/\$([^$]{3,80})\$/g)]
      .map(m => m[1].trim())
      .filter(isCleanLatex);
    if (!latex.length) return "";
    const best = latex.find(f => /=/.test(f) && !/\\begin/.test(f)) || latex[latex.length - 1];
    return `Key step: $${best}$`;
  }

  function extractShortcut(solution, q) {
    if (!solutionLooksRelevant(q, solution)) return [];
    const raw = plainText(solution);
    const tips = [];
    const sub = ((q && q.subject) || "").toLowerCase();

    if (isMatchQuestion(q)) {
      if (q && q.answer >= 0) {
        const cor = (q.options || [])[q.answer];
        const corText = plainText(cor);
        if (corText) tips.push(`Correct mapping — ${corText}`);
      }
      tips.push("Step 1: Read List-I and List-II carefully.");
      tips.push("Step 2: Match each item; eliminate wrong combinations.");
      return tips.slice(0, 3);
    }

    const finalLine = extractFinalAnswerLine(raw, q);
    if (finalLine) tips.push(finalLine);

    const keyFormula = extractKeyFormula(solution);
    if (keyFormula && tips.length < 3) tips.push(keyFormula);

    if (/nearest\s+integer|round\s+off/i.test(raw)) tips.push("Round your final value to the nearest integer.");
    if (/partial\s+mark|multiple\s+correct/i.test(raw)) tips.push("Select every option that satisfies the condition.");

    if (sub.includes("phys")) {
      if (/conservation|energy|momentum/i.test(raw)) tips.push("Apply conservation laws before lengthy algebra.");
      else if (/kinematic|v\s*=|u\s*\+/i.test(raw)) tips.push("Choose the kinematic equation with your unknown.");
      else if (/ohm|resistance|current|circuit/i.test(raw)) tips.push("Draw the equivalent circuit, then apply KVL/KCL.");
    } else if (sub.includes("chem")) {
      if (/oxidation|reduction|state/i.test(raw)) tips.push("Assign oxidation states, then balance redox.");
      else if (/equilibrium|Kc|Kp/i.test(raw)) tips.push("Write Kc/Kp expression, substitute equilibrium moles.");
      else if (/organic|reagent/i.test(raw)) tips.push("Track functional-group change at each step.");
    } else if (sub.includes("math")) {
      if (/integrat/i.test(raw)) tips.push("Look for substitution or a standard integral form.");
      else if (/differentiat|d\/d/i.test(raw)) tips.push("Differentiate term-by-term; apply chain rule where needed.");
      else if (/probability|permutation|combination/i.test(raw)) tips.push("Favourable outcomes ÷ total outcomes.");
    } else if (sub.includes("bio") || sub.includes("zool") || sub.includes("bot")) {
      tips.push("Recall structure ↔ function link for the concept asked.");
    }

    const seen = new Set();
    return tips.filter(t => {
      const k = plainText(t).toLowerCase().slice(0, 56);
      if (!k || seen.has(k) || plainText(t).length < 8) return false;
      if (/f\s*['′]\s*\(|prime\s*\(/i.test(t)) return false;
      seen.add(k);
      return true;
    }).slice(0, 3);
  }

  function renderShortcutPanel(shortcuts) {
    if (!shortcuts || !shortcuts.length) return "";
    const items = shortcuts.map((t, i) =>
      `<li class="qx-sol-shortcut-item">
        <span class="qx-sol-shortcut-num">${i + 1}</span>
        <span class="qx-sol-shortcut-text qx-content">${formatShortcutLine(t)}</span>
      </li>`
    ).join("");
    return `<div class="qx-sol-shortcut-panel" aria-label="Quick shortcut">
      <div class="qx-sol-shortcut-head">
        <span class="qx-sol-shortcut-icon">⚡</span>
        <span class="qx-sol-shortcut-title">Quick Shortcut</span>
      </div>
      <ol class="qx-sol-shortcut-list">${items}</ol>
    </div>`;
  }

  function polishHtml(html) {
    let out = String(html || "");
    PHRASE_MAP.forEach(([rx, rep]) => { out = out.replace(rx, rep); });
    out = out.replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>");
    return out;
  }

  function subjectTheme(q) {
    const s = ((q && q.subject) || "").toLowerCase();
    if (s.includes("phys")) return "qx-sol-phys";
    if (s.includes("chem")) return "qx-sol-chem";
    if (s.includes("math")) return "qx-sol-math";
    if (s.includes("bio") || s.includes("zool") || s.includes("bot")) return "qx-sol-bio";
    return "qx-sol-default";
  }

  /** Route Marks/Quizrr solution figures through proxy + tag for soft-strip redraw */
  function cleanSolutionFigHtml(html) {
    let out = String(html || "");
    // Fix broken https://.app/ bank URLs
    out = out.replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/");
    out = out.replace(/<img\b([^>]*)>/gi, (full, attrs) => {
      let a = attrs;
      // Prefer existing local clean assets
      const srcM = a.match(/\bsrc=(["'])([^"']+)\1/i);
      let src = srcM ? srcM[2] : "";
      if (src && /https?:\/\/\.app\//i.test(src)) {
        src = src.replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/");
        a = a.replace(/\bsrc=(["'])[^"']+\1/i, `src=$1${src}$1`);
      }
      // Proxy pool CDN for CORS soft-strip
      if (src && /cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\/|getmarks\.app/i.test(src)
        && !/proxy-image|restore-image|data:|assets\/(diagrams|qx-figures)/i.test(src)) {
        const prox = `/api/proxy-image?url=${encodeURIComponent(src)}&clean=1&v=7`;
        if (!/\bdata-qx-orig-src=/i.test(a)) a += ` data-qx-orig-src="${src}"`;
        a = a.replace(/\bsrc=(["'])[^"']+\1/i, `src=$1${prox}$1`);
        if (!/\breferrerpolicy=/i.test(a)) a += ' referrerpolicy="no-referrer"';
        if (!/\bonerror=/i.test(a)) {
          a += ` onerror="this.onerror=null;this.src=this.getAttribute('data-qx-orig-src')||this.src;"`;
        }
      }
      // Tag for WM strip + visibility pipeline
      if (!/\bclass=/i.test(a)) {
        a += ' class="qx-pool-fig qx-no-wm qx-sol-fig"';
      } else if (!/qx-pool-fig|qx-sol-fig/i.test(a)) {
        a = a.replace(/\bclass=(["'])([^"']*)\1/i, (m, q, c) => `class=${q}${c} qx-pool-fig qx-no-wm qx-sol-fig${q}`);
      }
      if (!/\bstyle=/i.test(a)) {
        a += ' style="max-width:100%;height:auto;display:block;margin:10px auto;object-fit:contain;background:#fff"';
      }
      if (!/\bloading=/i.test(a)) a += ' loading="eager"';
      return `<img${a}>`;
    });
    return out;
  }

  function formatBody(solution, q) {
    let html = typeof Mx !== "undefined" ? Mx.html(solution) : String(solution || "");
    html = polishHtml(html);
    html = cleanSolutionFigHtml(html);
    html = structureSolutionBody(html);
    if (q && !solutionLooksRelevant(q, solution)) {
      html = `<p class="qx-sol-warn">⚠️ The stored solution may not match this question. Re-fetching from source when online.</p>${html}`;
    }
    return html;
  }

  function renderBlock(q, rawSolution) {
    const sol = rawSolution != null ? rawSolution : (q && q.solution);
    if (!sol || !String(sol).replace(/<[^>]+>/g, "").trim()) return "";
    const body = formatBody(sol, q);
    const shortcuts = extractShortcut(sol, q);
    const theme = subjectTheme(q);
    const shortcutHtml = renderShortcutPanel(shortcuts);
    return `<div class="qx-sol-card ${theme}">
      <div class="qx-sol-head">
        <span class="qx-sol-badge">Quantrex Solution</span>
      </div>
      ${shortcutHtml}
      <div class="qx-content sol-body qx-sol-body">${body}</div>
    </div>`;
  }

  function renderInline(q) {
    return renderBlock(q);
  }

  return {
    renderBlock, renderInline, renderShortcutPanel, polishHtml, extractShortcut, subjectTheme, formatBody,
    cleanSolutionFigHtml,
    solutionLooksRelevant, isMatchQuestion, structureSolutionBody, formatShortcutLine
  };
})();