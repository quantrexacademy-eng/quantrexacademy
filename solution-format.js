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

  /**
   * Chemistry · Physics · Maths symbols for solution HTML
   * Runs before Mx.html so KaTeX / unicode render correctly.
   */
  function polishScientificSymbols(html) {
    let s = String(html || "");
    // Do not break real MathML
    if (/<math[\s>]/i.test(s)) {
      // Only light unicode outside math tags is risky — skip global rewrites on MathML-heavy sols
      return s
        .replace(/&lt;-&gt;/g, "⇌")
        .replace(/&lt;=&gt;/g, "⇔")
        .replace(/-&gt;/g, "→")
        .replace(/&lt;-/g, "←");
    }

    // Reaction / process arrows (HTML entities + ascii)
    s = s.replace(/&lt;-&gt;/gi, "⇌");
    s = s.replace(/&lt;=&gt;/gi, "⇔");
    s = s.replace(/&lt;→/g, "←");
    s = s.replace(/-&gt;/g, "→");
    s = s.replace(/&lt;-/g, "←");
    s = s.replace(/\s<=>\s/g, " ⇌ ");
    s = s.replace(/\s<->\s/g, " ⇌ ");
    s = s.replace(/\s->\s/g, " → ");
    s = s.replace(/\s<-\s/g, " ← ");
    s = s.replace(/→/g, "→");
    s = s.replace(/←/g, "←");
    s = s.replace(/⇌/g, "⇌");

    // Physics Δ quantities (plain text)
    s = s.replace(/\bDelta\s*([HGSUTVPE])/g, "Δ$1");
    s = s.replace(/\bdelta\s*([hgsutv])/g, "δ$1");
    s = s.replace(/\bDelta\b(?!\s*[A-Za-z])/g, "Δ");

    // Unicode symbols already present — keep as-is for MathJax/KaTeX (don't wrap everything in $)
    // Only fix common broken HTML entity arrows / degrees
    s = s.replace(/(\d)\s*deg(?:ree)?s?\b/gi, "$1°");

    // Chemistry charges as unicode (outside math)
    s = s.replace(/\^(\+|\-)/g, (_, c) => (c === "+" ? "⁺" : "⁻"));

    // Dashes
    s = s.replace(/−/g, "−"); // keep minus unicode
    s = s.replace(/–/g, "–");

    // Fix guillemet pseudo-tags that break solutions
    s = s.replace(/‹\s*(\/?\s*math\b[^›]*)›/gi, "<$1>");
    s = s.replace(/‹\s*(\/?\s*[a-z][a-z0-9]*\b[^›]*)›/gi, "<$1>");

    return s;
  }

  function normalizeMathChars(html) {
    return polishScientificSymbols(html);
  }

  function structureSolutionBody(html) {
    let out = normalizeMathChars(html);
    if (/<div[^>]+class=["'][^"']*qx-sol-step/i.test(out)) return out;

    // Proofread solution text when Mx available
    try {
      if (typeof Mx !== "undefined" && Mx.cleanQuestionText) out = Mx.cleanQuestionText(out);
    } catch (_) { /* */ }
    // qxproof1 residual: empty fences + chem triple-bond shatter in solutions
    out = out.replace(/\$\\left\(\s*\\right\)\$/g, "");
    out = out.replace(/\\left\(\s*\\right\)/g, "");
    out = out.replace(/-\$\s*C\\equiv\s*C\$\s*[–—−-]/g, "-C\\equiv C-$");

    const text = plainText(out);
    const stepMarkers = text.match(/\([A-D]\)/gi) || [];
    const hasSteps = stepMarkers.length >= 2 && stepMarkers.length <= 8;

    // Numbered steps: Step 1: / 1. / (1)
    const hasNumSteps = /(?:^|\n|<br\s*\/?>)\s*(?:step\s*)?\d{1,2}[\.:)\]]\s+\S/i.test(out)
      || /(?:^|\n|<br\s*\/?>)\s*step\s*\d{1,2}\s*[:.\-–]/i.test(out);

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

    if (hasNumSteps) {
      const chunks = out.split(/(?=(?:<br\s*\/?>|\n)\s*(?:step\s*)?\d{1,2}[\.:)\]]\s+)/i);
      if (chunks.length > 1) {
        let n = 0;
        return chunks.map((chunk) => {
          const t = chunk.trim();
          if (!t) return "";
          const m = t.match(/^(?:step\s*)?(\d{1,2})[\.:)\]]\s*/i);
          if (m) {
            n = parseInt(m[1], 10) || (++n);
            return `<div class="qx-sol-step qx-sol-step-num"><div class="qx-sol-step-body">${t}</div></div>`;
          }
          return `<div class="qx-sol-step qx-sol-step-plain"><div class="qx-sol-step-body">${t}</div></div>`;
        }).filter(Boolean).join("");
      }
    }

    out = out.replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>");
    const paras = out.split(/(?:<br\s*\/?>\s*){2,}/i).filter(p => p.trim());
    if (paras.length > 1) {
      return paras.map((p, i) => {
        const pt = plainText(p);
        const isFinal = /(?:answer|hence|therefore|∴|final|option\s*[A-D]|required)/i.test(pt) && i === paras.length - 1;
        const isSub = /substitut/i.test(pt);
        const cls = isFinal ? "qx-sol-final" : (isSub ? "qx-sol-sub" : "qx-sol-step qx-sol-step-plain");
        return `<div class="${cls}"><div class="qx-sol-step-body">${p.trim()}</div></div>`;
      }).join("");
    }
    return `<div class="qx-sol-body-wrap">${out}</div>`;
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
    out = out.replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>");
    return out;
  }

  /** Marks 2-col word|math tables → one continuous paragraph per row. Keep List-I/II tables. */
  function flattenMarksSolTables(html) {
    let s = String(html || "");
    s = s.replace(/\s*(?:style|align)=(["'])[^"']*(?:float\s*:\s*right|text-align\s*:\s*right)[^"']*\1/gi, "");
    s = s.replace(/<img(\s[^>]*?)>/gi, (full, attrs) => {
      let a = String(attrs || "").replace(/\s+/g, " ");
      if (/width\s*=/.test(a) && /src\s*=/.test(a) && !/\ssrc\s*=/i.test(" " + a)) {
        a = a.replace(/("|'|\d)src=/i, '$1 src=');
      }
      a = a.replace(/\s*(?:style|align)=(["'])[^"']*(?:float\s*:\s*right)[^"']*\1/gi, "");
      return `<img${a}>`;
    });
    s = s.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (full, inner) => {
      if (/list[\s\-]*i|column\s*i|match the/i.test(full)) return full;
      const rows = [...String(inner).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
      if (!rows.length) return full;
      const lines = rows.map((r) => {
        const cells = [...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
          .map((c) => String(c[1] || "").replace(/<\/?p\b[^>]*>/gi, " ").replace(/\s+/g, " ").trim())
          .filter(Boolean);
        if (!cells.length) return "";
        return `<p class="qx-sol-p">${cells.join(" ")}</p>`;
      }).filter(Boolean);
      return lines.length ? `<div class="qx-sol-flow-inner">${lines.join("")}</div>` : full;
    });
    return s;
  }

  function looksHollowStem(html) {
    const t = String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!t) return true;
    if (/\bLet\s+[.,;:]\s|\bLet\s+\.\s|Let\s+Consider/i.test(t)) return true;
    if (/Taking the limit as\s*,/i.test(t)) return true;
    return false;
  }

  function renderTeacherWrap(q, bodyHtml) {
    const theme = subjectTheme(q);
    return `<div class="qx-hw-sol ${theme}">
      <div class="qx-hw-sol-head">
        <span class="qx-hw-sol-title">Full steps</span>
        <span class="qx-hw-sol-sub">detailed solution</span>
      </div>
      <div class="qx-hw-paper">
        <div class="qx-content sol-body mk-sol-body qx-hw-ink">${bodyHtml}</div>
      </div>
    </div>`;
  }

  function parkMathForEasy(s) {
    const slots = [];
    let out = String(s || "");
    out = out.replace(/\$\$[\s\S]+?\$\$|\$[^$]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, (m) => {
      const k = "\uE500" + slots.length + "\uE501";
      slots.push(m);
      return k;
    });
    return { out, slots };
  }
  function unparkMathForEasy(s, slots) {
    return String(s || "").replace(/\uE500(\d+)\uE501/g, (_, i) => slots[+i] || "");
  }

  function easyPlainSentences(html) {
    let t = String(html || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>|<\/div>|<\/li>|<\/tr>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+\n/g, "\n")
      .replace(/\n{2,}/g, "\n")
      .trim();
    const parked = parkMathForEasy(t);
    t = parked.out
      .replace(/\b(?:therefore|hence|thus|it follows that|we obtain|we have|we get)\b/gi, "So")
      .replace(/\bon substituting(?: the values)?\b/gi, "Put the values")
      .replace(/\bon simplification\b/gi, "Simplify")
      .replace(/\bthe required value is\b/gi, "Answer is")
      .replace(/\bthe correct option is\b/gi, "Correct option is")
      .replace(/\bas we know that\b/gi, "")
      .replace(/\bit is (?:well )?known that\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    t = unparkMathForEasy(t, parked.slots);
    const parts = [];
    String(t).replace(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g, (m) => {
      const x = String(m || "").trim();
      if (x.length > 8) parts.push(x);
      return m;
    });
    return parts.length ? parts : (t ? [t] : []);
  }

  function clipEasy(s, n) {
    const t = String(s || "").replace(/\s+/g, " ").trim();
    if (t.length <= n) return t;
    const cut = t.slice(0, n);
    const sp = cut.lastIndexOf(" ");
    return (sp > 40 ? cut.slice(0, sp) : cut).trim() + "…";
  }

  function extractEasyExplain(sol, q) {
    const sents = easyPlainSentences(sol);
    const idea = clipEasy(sents.slice(0, 2).join(" "), 220);
    const rest = sents.slice(idea && sents.length > 1 ? 2 : 1).slice(0, 4);
    const steps = rest.map((x) => clipEasy(x, 140)).filter(Boolean);
    let answer = "";
    const finalLine = extractFinalAnswerLine(plainText(sol), q);
    if (finalLine) answer = finalLine.replace(/^Final answer:\s*/i, "").replace(/^Correct option:\s*/i, "");
    if (!answer && q && typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.formatCorrectAnswer) {
      const cor = QuantrexQFormat.formatCorrectAnswer(q);
      if (cor) answer = plainText(cor);
    }
    return { idea, steps, answer: clipEasy(answer, 100) };
  }

  function renderEasyExplain(q, sol, fullHtml) {
    const easy = extractEasyExplain(sol, q);
    const shortAlready = plainText(sol).length < 200 && !(easy.steps && easy.steps.length);
    const ideaHtml = easy.idea
      ? (typeof Mx !== "undefined" ? Mx.html(easy.idea) : esc(easy.idea))
      : "";
    const stepsHtml = (easy.steps || []).map((st, i) =>
      `<li><span class="qx-easy-n">${i + 1}</span><span class="qx-easy-t qx-content">${typeof Mx !== "undefined" ? Mx.html(st) : esc(st)}</span></li>`
    ).join("");
    const ansHtml = easy.answer
      ? `<div class="qx-easy-ans"><span class="qx-easy-ans-lab">Answer</span><span class="qx-easy-ans-val qx-content">${typeof Mx !== "undefined" ? Mx.html(easy.answer) : esc(easy.answer)}</span></div>`
      : "";
    const more = shortAlready ? "" : `<details class="qx-easy-more"><summary>See full steps</summary>${fullHtml}</details>`;
    return `<div class="qx-easy-sol ${subjectTheme(q)}">
      <div class="qx-easy-head">Easy explanation</div>
      ${ansHtml}
      ${ideaHtml ? `<p class="qx-easy-idea qx-content">${ideaHtml}</p>` : ""}
      ${stepsHtml ? `<ol class="qx-easy-steps">${stepsHtml}</ol>` : ""}
      ${more || fullHtml}
    </div>`;
  }

  function subjectTheme(q) {
    const s = ((q && q.subject) || "").toLowerCase();
    if (s.includes("phys")) return "qx-sol-phys";
    if (s.includes("chem")) return "qx-sol-chem";
    if (s.includes("math")) return "qx-sol-math";
    if (s.includes("bio") || s.includes("zool") || s.includes("bot")) return "qx-sol-bio";
    return "qx-sol-default";
  }

  /** Leftover Marks/Quizrr → Quantrex Storage + pale wipe. Local book figs stay direct. */
  function cleanSolutionFigHtml(html) {
    let out = String(html || "");
    out = out.replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/");
    if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.rewriteHtml) {
      out = QxOwnedFigs.rewriteHtml(out);
    }
    out = out.replace(/px(["'])src=/gi, "px$1 src=");
    out = out.replace(/<img\b([^>]*)>/gi, (full, attrs) => {
      let a = String(attrs || "");
      const srcM = a.match(/\bsrc=(["'])([^"']+)\1/i);
      let src = srcM ? srcM[2] : "";
      if (src && /https?:\/\/\.app\//i.test(src)) {
        src = src.replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/");
        a = a.replace(/\bsrc=(["'])[^"']+\1/i, `src=$1${src}$1`);
      }
      const isLocalBook = /qx-book-|qx-org-|\/assets\/diagrams\/qx-(?:book|org)-/i.test(src);
      const disp = (!isLocalBook && typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc)
        ? QxOwnedFigs.displaySrc(src)
        : "";
      const stored = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.ownedFigureUrl)
        ? (QxOwnedFigs.ownedFigureUrl(src) || src)
        : src;
      if (disp && disp !== src) {
        if (!/\bdata-qx-orig-src=/i.test(a)) a += ` data-qx-orig-src="${String(stored).replace(/"/g, "&quot;")}"`;
        a = a.replace(/\bsrc=(["'])[^"']+\1/i, `src=$1${disp}$1`);
      } else if (src && !/\bdata-qx-orig-src=/i.test(a)) {
        a += ` data-qx-orig-src="${String(stored).replace(/"/g, "&quot;")}"`;
      }
      if (!/\breferrerpolicy=/i.test(a)) a += ' referrerpolicy="no-referrer"';
      if (!/\bonerror=/i.test(a)) {
        a += ` onerror="if(window.QuantrexSolution&&QuantrexSolution.handleSolImgErr){QuantrexSolution.handleSolImgErr(this);}else if(window.QxOwnedFigs&&QxOwnedFigs.retryOnError){QxOwnedFigs.retryOnError(this);}else{this.style.display='none';}"`;
      }
      if (!/\bclass=/i.test(a)) {
        a += ' class="qx-pool-fig qx-no-wm qx-sol-fig"';
      } else if (!/qx-pool-fig|qx-sol-fig/i.test(a)) {
        a = a.replace(/\bclass=(["'])([^"']*)\1/i, (m, q, c) => `class=${q}${c} qx-pool-fig qx-no-wm qx-sol-fig${q}`);
      }
      if (!/\bstyle=/i.test(a)) {
        a += ' style="max-width:100%;height:auto;display:block;margin:10px auto;float:none;object-fit:contain;background:#fff;border-radius:6px"';
      }
      if (!/\bloading=/i.test(a)) a += ' loading="eager"';
      return `<img${a}>`;
    });
    return out;
  }

  function handleSolImgErr(img) {
    if (!img) return;
    const orig = img.getAttribute("data-qx-orig-src") || img.src;
    if (!img.dataset.retried && orig && !orig.startsWith("data:")) {
      img.dataset.retried = "1";
      if (!orig.includes("/api/proxy-image")) {
        img.src = "/api/proxy-image?clean=1&url=" + encodeURIComponent(orig);
        return;
      }
    }
    img.classList.add("qx-img-hidden"); img.style.display = "none";
  }

  /**
   * Repair mashed official solutions (screenshot 990 style).
   * Never invents academic content. No numbered Step 1/2.
   */
  function repairSolutionProse(html) {
    let s = String(html || "");
    if (!s.trim()) return s;
    if (/class=["'][^"']*katex|<\/?math[\s>]/i.test(s)) return s;

    s = s.replace(/\\because/gi, " because ");
    s = s.replace(/\\therefore/gi, " so ");
    s = s.replace(/\\forall/g, " for all ");
    s = s.replace(/\\in(?![A-Za-z])/g, " in ");
    s = s.replace(/\\mathbb\s*\{\s*R\s*\}/g, "\\mathbb{R}");
    s = s.replace(/\\R(?![A-Za-z])/g, "\\mathbb{R}");
    s = s.replace(/\\Rightarrow/g, "\\Rightarrow");
    s = s.replace(/\\le(?![A-Za-z])/g, "\\le");
    s = s.replace(/\\ge(?![A-Za-z])/g, "\\ge");
    s = s.replace(/\\not\s*R/g, "\\not R");
    s = s.replace(/\[\s*because\s*/gi, " (because ");
    s = s.replace(/ \(because ([^)\]]{0,80})\]/gi, " (because $1)");

    s = s.replace(/(\d)\s*\/\s*R['′]?\s*(\d)/g, "$$$1\\not\\!R\\,$2$");
    s = s.replace(/(\d)\s*R\s*(\d)/g, "$$$1\\,R\\,$2$");
    s = s.replace(/(^|[^$A-Za-z\\])([ab])R([ab])(?![A-Za-z])/g, "$1$$$2R$3$");

    s = s.replace(/Since\s*,\s*/gi, "Since ");
    s = s.replace(/,\s*\|/g, ", $|");
    s = s.replace(/\|\s*,/g, "|$,");
    s = s.replace(/([,;:])\|/g, "$1 $|");

    s = s.replace(/(^|[^$])\|([a-zA-Z0-9+\-−=\s\\]{1,40})\|(?!\$)/g, (all, pre, inner) => {
      if (/\$/.test(inner)) return all;
      return pre + "$|" + inner.trim() + "|$";
    });

    s = s.replace(/\${3,}/g, "$$");
    s = s.replace(/\$\s+\$/g, " ");

    s = s.replace(/\bNow\s*,/g, "\nNow,");
    s = s.replace(/\bBut\s+(?=[A-Z$\\])/g, "\nBut ");
    s = s.replace(/\bHence\s*,?/g, "\nHence ");
    s = s.replace(/\bTherefore\s*,?/g, "\nTherefore ");
    s = s.replace(/\bHowever\s*,/g, "\nHowever,");
    s = s.replace(/[∴]\s*/g, ".\n");
    s = s.replace(/(?<!\d)\.\s+(?=[A-Z$\\])/g, ".\n");
    s = s.replace(/\bis reflexive\.?/gi, "is reflexive.\n");
    s = s.replace(/\bis symmetric\.?/gi, "is symmetric.\n");
    s = s.replace(/\bis transitive\.?/gi, "is transitive.\n");

    s = s.replace(/\s{2,}/g, " ");
    s = s.replace(/ *\n */g, "\n");
    return s.trim();
  }

  /** Official solution as short clean paragraphs. No step numbers. Never invents text. */
  function toNumberedSteps(html) {
    return toCleanFlow(html);
  }
  function toCleanFlow(html) {
    const parked = [];
    const park = (m) => {
      const k = "\uE700" + parked.length + "\uE701";
      parked.push(m);
      return k;
    };
    let s = String(html || "");
    if (/class=["'][^"']*katex|<\/?math[\s>]/i.test(s) && !/<br\s*\/?>/i.test(s)) {
      return `<div class="qx-sol-flow">${s}</div>`;
    }
    s = s.replace(/\$\$[\s\S]+?\$\$/g, park);
    s = s.replace(/\\\[[\s\S]+?\\\]/g, park);
    s = s.replace(/\\\([\s\S]+?\\\)/g, park);
    s = s.replace(/\$[^$]{1,8000}\$/g, park);
    s = s.replace(/<img\b[^>]*>/gi, park);
    s = s.replace(/<table\b[\s\S]*?<\/table>/gi, park);
    s = s.replace(/<math\b[\s\S]*?<\/math>/gi, park);
    s = s.replace(/<span\b[^>]*class=["'][^"']*katex[^"']*["'][\s\S]*?<\/span>/gi, park);
    s = s.replace(/<br\s*\/?>/gi, "\n");
    s = s.replace(/<\/p>/gi, "\n");
    s = s.replace(/<p\b[^>]*>/gi, "");
    s = s.replace(/^\s*(?:step\s*)?\d+[\).:\-]\s*/gim, "");
    const lines = s.split(/\n+/).map((l) => l.replace(/^\s*(?:step\s*)?\d+[\).:\-]\s*/i, "").trim()).filter((l) => {
      if (!l) return false;
      if (/^[-–—•]+$/.test(l)) return false;
      return true;
    });
    const unpark = (t) => String(t || "").replace(/\uE700(\d+)\uE701/g, (_, i) => parked[+i] || "");
    if (!lines.length) return `<div class="qx-sol-flow">${unpark(s)}</div>`;
    return `<div class="qx-sol-flow">${lines.map((line) => {
      let l = unpark(line);
      l = l.replace(/^(Approach|Concept|Solution|Method\s+\d+|Step\s+\d+)[:\-\.]?\s*(<.*?>)?$/i, (m, g1, g2) => `<strong class="qx-sol-step-head">${g1}</strong>${g2||''}`);
      l = l.replace(/^(Approach|Concept|Solution|Method\s+\d+|Step\s+\d+)[:\-\.]\s+/i, (m, g1) => `<strong class="qx-sol-step-head">${g1}:</strong> `);
      return `<p class="qx-sol-p">${l}</p>`;
    }).join("")}</div>`;
  }

  /**
   * Normalize HTML/TeX for stem-vs-solution prefix compare.
   * Strips tags, entities, $ delimiters, and common TeX commands so
   * "\mathrm{A}" / "\leqslant" match the rendered stem text.
   */
  function stemComparePlain(html) {
    return String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#(\d+);/g, (_, n) => {
        try { return String.fromCharCode(+n); } catch (e) { return " "; }
      })
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\$+/g, " ")
      .replace(/\\[,;!~\s]/g, " ")
      .replace(/\\(?:mathrm|mathbf|boldsymbol|mathit|mathsf|mathtt|text|operatorname|mathbb|mathcal|leqslant|geqslant|leq|geq|neq|approx|equiv|sim|propto|infty|partial|nabla|cdot|times|div|pm|mp|oplus|otimes|cup|cap|subset|subseteq|supset|supseteq|in|notin|ni|forall|exists|neg|land|lor|rightarrow|leftarrow|Rightarrow|Leftarrow|leftrightarrow|mapsto|ldots|dots|cdots|vdots|frac|dfrac|tfrac|sqrt|left|right|big|Big|bigg|Bigg|begin|end|over|underline|overline|hat|bar|vec|dot|ddot|tilde|widehat|overline)\s*\{?/gi, " ")
      .replace(/\\(sin|cos|tan|cot|sec|csc|log|ln|exp|det|min|max|inf|sup|lim|ker|arg|dim|gcd|Pr|sinh|cosh|tanh|arcsin|arccos|arctan)\b/gi, " $1 ")
      .replace(/\\circ\b/gi, " deg ")
      .replace(/\\[a-zA-Z]+\s*\{?/g, " ")
      .replace(/[{}]/g, " ")
      .replace(/[_^]/g, " ")
      .replace(/[^a-zA-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  /** Strip Marks-style leading DIFFICULTY / ANSWER / Correct option meta (renderBlock already shows these). */
  function stripLeadingSolMeta(html) {
    let s = String(html || "");
    for (let n = 0; n < 14; n++) {
      const before = s;
      // Leading whitespace / breaks / empty wrappers
      s = s.replace(/^(?:\s|&nbsp;|<br\s*\/?\s*>|<\/?(?:p|div|span|strong|b|em|h[1-6])\b[^>]*>)+/i, "");
      // DIFFICULTY / LEVEL — tolerate split tags: <b>DIFFICULTY</b>: Easy</div>
      s = s.replace(
        /^(?:<(?:div|span|p|strong|b)[^>]*>\s*)*(?:difficulty|level)\s*(?:<\/(?:div|span|p|strong|b)>)?\s*[:\-–]?\s*(?:<(?:div|span|p|strong|b)[^>]*>\s*)*(?:easy|medium|hard|moderate|tough)?\s*(?:<\/(?:div|span|p|strong|b)>)?(?:\s|&nbsp;|<br\s*\/?\s*>|\n)*/i,
        ""
      );
      // Orphan ": Easy</div>" left after partial DIFFICULTY strip
      s = s.replace(
        /^[:\-–]\s*(?:easy|medium|hard|moderate|tough)\s*(?:<\/(?:div|span|p|strong|b)>)?(?:\s|&nbsp;|<br\s*\/?\s*>|\n)*/i,
        ""
      );
      // ANSWER / Correct option
      s = s.replace(
        /^(?:<(?:div|span|p|strong|b)[^>]*>\s*)*(?:correct\s*(?:option|answer|choice)|answer|ans)\s*(?:<\/(?:div|span|p|strong|b)>)?\s*[:\-–]?\s*(?:<(?:div|span|p|strong|b)[^>]*>\s*)*(?:\(?[A-D]\)?|option\s*[A-D]|[^\n<]{0,48})?\s*(?:<\/(?:div|span|p|strong|b)>)?(?:\s|&nbsp;|<br\s*\/?\s*>|\n)*/i,
        ""
      );
      // Orphan ": (B)</div>" after ANSWER strip
      s = s.replace(
        /^[:\-–]\s*(?:\(?[A-D]\)?|option\s*[A-D])\s*(?:<\/(?:div|span|p|strong|b)>)?(?:\s|&nbsp;|<br\s*\/?\s*>|\n)*/i,
        ""
      );
      if (s === before) break;
    }
    return s;
  }

  /**
   * After Check Answer / Show Answer the solution panel must NOT re-print the question stem.
   * Many bank/Marks solutions start with a full stem echo (often raw TeX). Strip that prefix
   * when it duplicates questionText / q, then drop leading DIFFICULTY/ANSWER meta.
   * Never invents content — only removes a leading duplicate.
   *
   * qxmd159: plainWithMap MUST mirror stemComparePlain (emit spaces for ^ _ $ { }) —
   * qxmd158 failed because x^2 → "x2" vs "x 2", so align never fired on live UX.
   */
  function tidyAfterStemCut(rest) {
    let r = String(rest || "");
    r = r.replace(/^[a-zA-Z]{1,12}(?=[\s,.;:!?<]|&nbsp;|<|$)/, "");
    r = r.replace(/^\$+/g, "");
    r = r.replace(/^[\s.$\\?!,;:\-–—)'"\]]+/u, "");
    r = r.replace(/^(?:\s|&nbsp;|<br\s*\/?\s*>|<\/?(?:p|div|span)[^>]*>)+/i, "");
    r = r.replace(/^(?:<(?:div|span|p)[^>]*>\s*)*(?:given(?:\s+that)?|as\s+given)\s*[,:\-–]?\s*/i, "");
    r = stripLeadingSolMeta(r);
    r = r.replace(/^\$+/g, "");
    r = r.replace(/^<\/(?:p|div|span)>/i, "");
    r = stripLeadingSolMeta(r);
    return r;
  }

  function stripLeadingStemEcho(html, q) {
    let out = String(html || "");
    if (!out.trim()) return out;
    out = stripLeadingSolMeta(out);
    // Drop common wrappers that precede a stem echo in Marks/bank solutions
    out = out.replace(
      /^(?:(?:\s|&nbsp;|<br\s*\/?\s*>|<\/?(?:p|div|span)[^>]*>)*)(?:given(?:\s+that)?|as\s+given|from\s+the\s+(?:given\s+)?question|according\s+to\s+the\s+question|question)\s*(?:<[^>]+>)*\s*[,:\-–]?\s*/i,
      ""
    );
    out = stripLeadingSolMeta(out);

    const stemSrc = (q && (
      q.questionText || q.q || q.question || q.text || q._qxOrigStem || q._qxBankQ || ""
    )) || "";
    const stemP = stemComparePlain(stemSrc);
    if (stemP.length < 6) return stripLeadingSolMeta(out);

    /**
     * Walk HTML with the SAME reductions as stemComparePlain, recording
     * html index after each emitted plain character (including spaces).
     */
    function plainWithMap(src) {
      const map = []; // map[k] = html index AFTER plain[k]
      let plain = "";
      let i = 0;
      const s = String(src || "");
      const emitSpace = (htmlIdx) => {
        if (!plain.length || plain[plain.length - 1] === " ") return;
        plain += " ";
        map.push(htmlIdx);
      };
      const emitChar = (ch, htmlIdx) => {
        plain += ch.toLowerCase();
        map.push(htmlIdx);
      };
      while (i < s.length) {
        if (s[i] === "<") {
          const close = s.indexOf(">", i);
          if (close < 0) break;
          const tag = s.slice(i, close + 1);
          if (/^<(?:br\b|\/(?:p|div|li|tr|h[1-6])\b)/i.test(tag)) emitSpace(close + 1);
          i = close + 1;
          continue;
        }
        if (s[i] === "&") {
          const semi = s.indexOf(";", i);
          if (semi > i && semi - i < 14) {
            const ent = s.slice(i, semi + 1);
            let ch = " ";
            const mNum = ent.match(/^&#(\d+);$/);
            if (mNum) {
              try { ch = String.fromCharCode(+mNum[1]); } catch (_) { ch = " "; }
            } else if (/^&nbsp;$/i.test(ent)) {
              ch = " ";
            } else {
              ch = " ";
            }
            if (/[a-zA-Z0-9]/.test(ch)) emitChar(ch, semi + 1);
            else emitSpace(semi + 1);
            i = semi + 1;
            continue;
          }
        }
        if (s[i] === "\\") {
          let j = i + 1;
          while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
          const cmd = s.slice(i + 1, j).toLowerCase();
          // Keep operator names (sin/log/…) so short stems still match; else skip like stemComparePlain
          if (/^(sin|cos|tan|cot|sec|csc|log|ln|exp|det|min|max|inf|sup|lim|ker|arg|dim|gcd|pr|sinh|cosh|tanh|arcsin|arccos|arctan)$/.test(cmd)) {
            for (const ch of cmd) emitChar(ch, j);
            emitSpace(j);
          } else if (cmd === "circ") {
            for (const ch of "deg") emitChar(ch, j);
            emitSpace(j);
          } else {
            // Skip TeX command name; brace contents still emitted (\mathrm{A} → A)
            emitSpace(j);
          }
          i = j;
          continue;
        }
        // Mirror stemComparePlain: $ { } _ ^ become spaces (NOT silent skips)
        if (s[i] === "$" || s[i] === "{" || s[i] === "}" || s[i] === "_" || s[i] === "^") {
          emitSpace(i + 1);
          i++;
          continue;
        }
        const ch = s[i];
        if (/[a-zA-Z0-9]/.test(ch)) emitChar(ch, i + 1);
        else emitSpace(i + 1);
        i++;
      }
      while (plain.endsWith(" ")) {
        plain = plain.slice(0, -1);
        map.pop();
      }
      while (plain.startsWith(" ")) {
        plain = plain.slice(1);
        map.shift();
      }
      return { plain, map };
    }

    const { plain: solP, map } = plainWithMap(out);
    const probeLen = Math.min(stemP.length, Math.max(32, Math.floor(stemP.length * 0.82)));
    const probe = stemP.slice(0, probeLen);
    const head = stemP.slice(0, Math.min(40, stemP.length));
    let align = -1;
    if (solP.startsWith(probe) || solP.startsWith(head)) align = 0;
    else {
      const at = solP.indexOf(head);
      if (at >= 0 && at <= 64) align = at;
    }
    // Fallback: stemComparePlain agreement when map walker still drifts
    if (align < 0) {
      const solSC = stemComparePlain(out);
      if (solSC.startsWith(probe) || solSC.startsWith(head)) {
        // Approximate cut: find stem tail phrase in raw HTML (case-insensitive alnum)
        const tailLen = Math.min(36, Math.max(16, Math.floor(stemP.length / 3)));
        const tailWords = stemP.slice(-tailLen).trim().split(/\s+/).filter(Boolean).slice(-4);
        if (tailWords.length) {
          const tailRe = new RegExp(
            tailWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[^a-zA-Z0-9]{0,12}"),
            "i"
          );
          const tm = tailRe.exec(out);
          if (tm) {
            let cutAt = tm.index + tm[0].length;
            let rest = tidyAfterStemCut(out.slice(cutAt));
            const restPlain = stemComparePlain(rest);
            if (restPlain.length >= 8 || solSC.length <= restPlain.length + 40) {
              return rest || stripLeadingSolMeta(out);
            }
          }
        }
      }
      return stripLeadingSolMeta(out);
    }
    if (!map.length) return stripLeadingSolMeta(out);

    const tailLen = Math.min(42, Math.max(18, Math.floor(stemP.length / 3)));
    const tail = stemP.slice(-tailLen);
    let cutPlainEnd = align + stemP.length;
    const tailAt = solP.indexOf(tail, align);
    if (tailAt >= align && tailAt + tail.length <= align + stemP.length + 80) {
      cutPlainEnd = tailAt + tail.length;
    }
    cutPlainEnd = Math.min(Math.max(cutPlainEnd, align + Math.min(20, stemP.length)), map.length);
    if (cutPlainEnd < Math.min(12, Math.max(4, stemP.length))) return stripLeadingSolMeta(out);
    const cutAt = map[cutPlainEnd - 1];
    if (!(cutAt > 0)) return stripLeadingSolMeta(out);

    let rest = tidyAfterStemCut(out.slice(cutAt));

    const restPlain = stemComparePlain(rest);
    // Restore only when cut erased essentially the whole solution (not when a short real explanation remains)
    if (restPlain.length < 3 && solP.length > restPlain.length + 40) {
      return stripLeadingSolMeta(String(html || ""));
    }
    if (restPlain.length < 3 && stemP.length >= solP.length - 4) {
      return stripLeadingSolMeta(String(html || ""));
    }
    return rest || out;
  }

  function formatBody(solution, q) {
    let raw = flattenMarksSolTables(String(solution || ""));
    raw = stripLeadingStemEcho(raw, q);
    // Same deep TeX/symbol repair as stems/options (solutions were missing shatter/tofu fixes)
    if (typeof Mx !== "undefined" && Mx.cleanQuestionText) {
      try { raw = Mx.cleanQuestionText(raw); } catch (_) { /* */ }
    }
    if (typeof QxProof !== "undefined" && QxProof.proofreadHtml) {
      try { raw = QxProof.proofreadHtml(raw); } catch (_) { /* */ }
    }
    raw = repairSolutionProse(raw);
    raw = polishScientificSymbols(raw);
    if (typeof Mx !== "undefined" && Mx.upgradePlainMathNotation) {
      try { raw = Mx.upgradePlainMathNotation(raw); } catch (_) { /* */ }
    }
    raw = toCleanFlow(raw);
    let html = typeof Mx !== "undefined" ? Mx.html(raw) : raw;
    html = polishHtml(html);
    html = cleanSolutionFigHtml(html);
    html = String(html || "")
      .replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>")
      .replace(/\n{3,}/g, "\n\n");
    // Never re-polish after KaTeX HTML exists (would space class="katex-display")
    if (!/class=["'][^"']*katex/i.test(html)) {
      try { html = polishScientificSymbols(html); } catch (_) { /* */ }
    }
    return html;
  }

  function subjectBadgeLabel(q) {
    const t = subjectTheme(q);
    if (t === "qx-sol-phys") return "Physics Solution";
    if (t === "qx-sol-chem") return "Chemistry Solution";
    if (t === "qx-sol-math") return "Mathematics Solution";
    if (t === "qx-sol-bio") return "Biology Solution";
    return "Quantrex Solution";
  }

  function officialAnswerHtml(q) {
    if (!q) return "";
    let label = "";
    try {
      if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.formatCorrectAnswer) {
        label = plainText(QuantrexQFormat.formatCorrectAnswer(q) || "");
      }
    } catch (_) { /* */ }
    if (!label && q.answer != null && q.options && q.options[q.answer] != null) {
      const letter = String.fromCharCode(65 + Number(q.answer));
      label = letter;
    }
    if (!label && q.correctValue != null && String(q.correctValue).trim()) {
      label = String(q.correctValue).trim();
    }
    if (!label || label.length > 160) return "";
    const val = typeof Mx !== "undefined" ? Mx.html(label) : esc(label);
    return `<div class="qx-sol-ans"><span class="qx-sol-ans-lab">Answer</span><span class="qx-sol-ans-val qx-content">${val}</span></div>`;
  }

  function isPlaceholderSolution(sol) {
    const plain = String(sol || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim().toLowerCase();
    if (!plain) return true;
    if (/^no solution\.?$/.test(plain)) return true;
    if (/solution not available|official solution is not available/.test(plain)) return true;
    if (/support us by uploading|community solution|upload your own solution/.test(plain)) return true;
    return false;
  }

  function ensureSolCss() {
    if (typeof document === "undefined") return;
    if (document.getElementById("qx-sol-css-fallback")) return;
    if (document.querySelector('link[href*="qx-solution.css"]')) return;
    const s = document.createElement("style");
    s.id = "qx-sol-css-fallback";
    s.textContent = ".qx-sol-card{margin:14px 0;padding:14px 16px;border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#0f172a}.qx-sol-card-h{font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#334155;margin:0 0 12px}.qx-sol-ans{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 12px;padding:8px 12px;border-radius:10px;background:#ecfdf5;border:1px solid #86efac}.qx-sol-missing{color:#64748b}";
    document.head.appendChild(s);
  }

  function renderBlock(q, rawSolution) {
    try { ensureSolCss(); } catch (_) { /* */ }
    let sol = rawSolution != null ? rawSolution : (q && (q.solution || q.sol || q.explanation));
    try { sol = stripLeadingStemEcho(sol, q); } catch (_) { /* */ }
    const has = !isPlaceholderSolution(sol);
    const theme = subjectTheme(q);
    const head = subjectBadgeLabel(q);

    // Difficulty badge for solution view
    const rawDiff = q && (q.difficulty || q.level || q.difficultyLevel);
    let diffBadge = "";
    if (rawDiff) {
      const dStr = String(rawDiff).trim();
      const norm = /easy/i.test(dStr) ? "Easy" : (/hard|tough/i.test(dStr) ? "Hard" : "Medium");
      const col = norm === "Easy" ? "#16a34a" : (norm === "Hard" ? "#dc2626" : "#d97706");
      const bg = norm === "Easy" ? "#ecfdf5" : (norm === "Hard" ? "#fef2f2" : "#fffbeb");
      const bdr = norm === "Easy" ? "#86efac" : (norm === "Hard" ? "#fca5a5" : "#fde68a");
      diffBadge = `<span class="qx-sol-diff-badge" style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:${col};background:${bg};border:1px solid ${bdr}">Difficulty: ${norm}</span>`;
    }

    // Exam / Paper metadata line inside solution
    let examMeta = "";
    try {
      if (typeof qxPaperMetaBlock === "function") {
        examMeta = qxPaperMetaBlock(q);
      } else if (typeof QuantrexStrip !== "undefined" && QuantrexStrip.paperMetaHtml) {
        examMeta = QuantrexStrip.paperMetaHtml(q, { includeChapter: true, includeSubject: false });
      }
    } catch (_) {}
    if (!examMeta && q && (q.source || q.paperSource || q._sourceFull)) {
      const src = String(q.source || q.paperSource || q._sourceFull).replace(/</g, "&lt;");
      examMeta = `<div class="qx-paper-meta" style="margin:6px 0 10px"><div class="qx-paper-meta-chips"><span class="qx-paper-chip">${src}</span></div></div>`;
    }

    if (!has) {
      return `<div class="qx-sol-card ${theme}">
        <div class="qx-sol-card-h" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <span>${head}</span>
          ${diffBadge}
        </div>
        ${examMeta || ""}
        ${officialAnswerHtml(q)}
        <p class="qx-sol-missing">Solution not available.</p>
      </div>`;
    }
    const body = formatBody(sol, q);
    const fromSol = [];
    const keyFormula = extractKeyFormula(sol);
    if (keyFormula) fromSol.push(keyFormula);
    const shortcutHtml = renderShortcutPanel(fromSol);
    return `<div class="qx-sol-card ${theme}">
      <div class="qx-sol-card-h" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <span>${head}</span>
        ${diffBadge}
      </div>
      ${examMeta || ""}
      ${officialAnswerHtml(q)}
      ${shortcutHtml}
      <div class="qx-content sol-body qx-sol-flow">${body}</div>
    </div>`;
  }

  function renderInline(q) {
    return renderBlock(q);
  }

  return {
    renderBlock, renderInline, renderShortcutPanel, polishHtml, extractShortcut, subjectTheme, formatBody,
    repairSolutionProse,
    isPlaceholderSolution,
    cleanSolutionFigHtml, handleSolImgErr, polishScientificSymbols, extractEasyExplain, renderEasyExplain,
    solutionLooksRelevant, isMatchQuestion, structureSolutionBody, formatShortcutLine,
    flattenMarksSolTables, renderTeacherWrap, looksHollowStem,
    stripLeadingStemEcho, stripLeadingSolMeta, stemComparePlain
  };
})();