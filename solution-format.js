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
    if (/<[^>]+>|<\/?t[dh]|tdstyle|text-align|nbsp;|&nbsp;/i.test(s)) return false;
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
      // (^|\s)src= — never match data-qx-orig-src / data-qx-storage-src
      const srcM = a.match(/(^|\s)src=(["'])([^"']*)\2/i);
      let src = srcM ? srcM[3] : "";
      if (src && /https?:\/\/\.app\//i.test(src)) {
        src = src.replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/");
        a = a.replace(/(^|\s)src=(["'])[^"']*\2/i, `$1src=$2${src}$2`);
      }
      // Always rewrite local /assets/diagrams and Marks CDN figs to Firebase Storage / proxy.
      // Hosting intentionally ignores assets/diagrams/** (20k+ files) so local paths 404 live.
      const alreadyOk = /^data:|\/api\/proxy-image|firebasestorage\.googleapis\.com|quantrexacademy-app\.firebasestorage/i.test(src);
      const disp = (!alreadyOk && typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc)
        ? QxOwnedFigs.displaySrc(src)
        : "";
      const stored = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.ownedFigureUrl)
        ? (QxOwnedFigs.ownedFigureUrl(src) || src)
        : src;
      if (disp && disp !== src) {
        if (!/\bdata-qx-orig-src=/i.test(a)) a += ` data-qx-orig-src="${String(stored).replace(/"/g, "&quot;")}"`;
        a = a.replace(/(^|\s)src=(["'])[^"']*\2/i, `$1src=$2${disp}$2`);
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
    try {
      img.style.display = "block";
      img.style.visibility = "visible";
      img.style.opacity = "1";
    } catch (_) { /* */ }
    const orig = img.getAttribute("data-qx-storage-src") || img.getAttribute("data-qx-orig-src") || img.src;
    const tryN = parseInt(img.dataset.qxSolFigTry || "0", 10);
    img.dataset.qxSolFigTry = String(tryN + 1);
    if (tryN === 0 && typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc) {
      const disp = QxOwnedFigs.displaySrc(orig);
      if (disp && disp !== img.src) {
        img.src = disp;
        return;
      }
    }
    if (tryN <= 1 && orig && !String(orig).startsWith("data:")) {
      if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.retryOnError) {
        QxOwnedFigs.retryOnError(img);
        return;
      }
      if (!String(img.src || "").includes("/api/proxy-image")) {
        const owned = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.ownedFigureUrl)
          ? (QxOwnedFigs.ownedFigureUrl(orig) || orig)
          : orig;
        img.src = "/api/proxy-image?clean=1&url=" + encodeURIComponent(owned);
        return;
      }
    }
    // Keep plate visible rather than collapsing layout; mark failed for CSS if needed
    img.classList.add("qx-img-broken");
    img.alt = img.alt || "Figure unavailable";
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
    if (/class=["'][^"']*katex|<\/?math[\s>]|spanclass\s*=\s*"\s*katex/i.test(s)) {
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
    const lines = [];
    s.split(/\n+/).forEach(function (rawLine) {
      let l = rawLine.replace(/^\s*(?:step\s*)?\d+[\).:\-]\s*/i, "").trim();
      if (!l) return;
      if (/^[-–—•]+$/.test(l)) return;
      if (/^[.,;:!?]+$/.test(l) && lines.length) {
        lines[lines.length - 1] += l;
        return;
      }
      lines.push(l);
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

  function formatBody(solution, q) {
    let raw = flattenMarksSolTables(String(solution || ""));
    try {
      if (typeof Mx !== "undefined" && Mx.flattenUnsafeMathDollars) {
        raw = Mx.flattenUnsafeMathDollars(raw);
      }
    } catch (_) { /* */ }
    if (/katex-error|ParseError:/i.test(raw)) {
      try {
        if (typeof Mx !== "undefined" && Mx.flattenUnsafeMathDollars) raw = Mx.flattenUnsafeMathDollars(raw);
      } catch (_) { /* */ }
    }
    if (/class=["'][^"']*katex(?!-error)|spanclass\s*=\s*"\s*katex/i.test(raw)
      && !/katex-error|ParseError:/i.test(raw)) {
      if (typeof Mx !== "undefined" && typeof Mx.html === "function") {
        try { return Mx.html(raw); } catch (_) { /* */ }
      }
      return raw;
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
    if (typeof Mx !== "undefined" && /spanclass|katex-html/i.test(html)) {
      try { html = Mx.html(html); } catch (_) { /* */ }
    }
    html = polishHtml(html);
    html = cleanSolutionFigHtml(html);
        /* qx-sol-dollar-heal:v2 qxmd115 */
    // Always run heal+KaTeX+scrub so View Solution never shows raw $
    try {
      if (typeof Mx !== "undefined") {
        if (Mx.healFakeColorEntities) html = Mx.healFakeColorEntities(html);
        if (Mx.healSolutionHtml) {
          html = Mx.healSolutionHtml(html);
        } else {
          if (Mx.flattenUnsafeMathDollars) html = Mx.flattenUnsafeMathDollars(html);
          if (Mx.katexRenderIslands) html = Mx.katexRenderIslands(html);
          else if (Mx.html && /\$/.test(html)) html = Mx.html(html);
          if (Mx.scrubLeftoverDollars) html = Mx.scrubLeftoverDollars(html);
        }
      }
    } catch (_) { /* */ }
    // Lining clutter from bank HTML
    html = String(html || "")
      .replace(/<hr\s*\/?>/gi, "")
      .replace(/\s*text-decoration\s*:\s*underline\s*;?/gi, "")
      .replace(/<u\b[^>]*>([\s\S]*?)<\/u>/gi, "$1");
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
    const sol = rawSolution != null ? rawSolution : (q && (q.solution || q.sol || q.explanation));
    const has = !isPlaceholderSolution(sol);
    const theme = subjectTheme(q);
    const head = subjectBadgeLabel(q);

    let diffBadge = "";
    try {
      if (typeof QuantrexStrip !== "undefined" && QuantrexStrip.solDifficultyHtml) {
        diffBadge = QuantrexStrip.solDifficultyHtml(q) || "";
      } else if (typeof qxQuestionDifficulty === "function") {
        const d = qxQuestionDifficulty(q);
        if (d) diffBadge = `<span class="qx-sol-diff-badge">Difficulty: ${String(d).replace(/</g, "&lt;")}</span>`;
      }
    } catch (_) { /* */ }

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
      <div class="qx-content sol-body">${body}</div>
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
    flattenMarksSolTables, renderTeacherWrap, looksHollowStem
  };
})();