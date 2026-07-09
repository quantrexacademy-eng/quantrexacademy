// Quantrex — polished solution display (rephrased, shortcut tips, subject themes)
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

  function extractShortcut(solution, q) {
    const raw = plainText(solution);
    const tips = [];
    const sub = ((q && q.subject) || "").toLowerCase();

    const latex = [...String(solution || "").matchAll(/\$([^$]{2,90})\$/g)]
      .map(m => m[1].replace(/\\mathrm\{([^}]+)\}/g, "$1").trim())
      .filter(f => f.length >= 3 && f.length <= 72);
    latex.slice(0, 2).forEach(f => tips.push(f));

    const chain = raw.match(/[^.]{4,90}(?:→|⟹|=>|=\s*[^.]{2,40})/);
    if (chain && tips.length < 3) {
      const t = chain[0].trim().replace(/\s+/g, " ");
      if (t.length >= 8 && t.length <= 80) tips.push(t);
    }

    if (/nearest\s+integer|round\s+off/i.test(raw)) tips.push("Round to nearest integer in the last step");
    if (/partial\s+mark|multiple\s+correct/i.test(raw)) tips.push("Tick every option that satisfies the condition");

    if (sub.includes("phys")) {
      if (/conservation|energy|momentum/i.test(raw)) tips.push("Use conservation laws before long algebra");
      else if (/kinematic|v\s*=|u\s*\+/i.test(raw)) tips.push("Pick the kinematic equation with the unknown you need");
      else if (/ohm|resistance|current/i.test(raw)) tips.push("Draw the equivalent circuit first");
    }
    if (sub.includes("chem")) {
      if (/oxidation|reduction|state/i.test(raw)) tips.push("Assign oxidation states before balancing");
      else if (/equilibrium|Kc|Kp/i.test(raw)) tips.push("Write the equilibrium expression, then substitute");
      else if (/organic|reagent/i.test(raw)) tips.push("Track functional group change step by step");
    }
    if (sub.includes("math")) {
      if (/integrat/i.test(raw)) tips.push("Check substitution or standard integral form");
      else if (/differentiat|d\/d/i.test(raw)) tips.push("Differentiate term-by-term; watch chain rule");
      else if (/probability|permutation|combination/i.test(raw)) tips.push("List favourable outcomes ÷ total outcomes");
    }
    if ((sub.includes("bio") || sub.includes("zool") || sub.includes("bot")) && /mitochond|nephron|chlorophyll/i.test(raw)) {
      tips.push("Link structure to function — one-line recall");
    }

    const seen = new Set();
    return tips.filter(t => {
      const k = t.toLowerCase().slice(0, 48);
      if (seen.has(k) || t.length < 4) return false;
      seen.add(k);
      return true;
    }).slice(0, 3);
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

  function formatBody(solution) {
    if (typeof Mx !== "undefined") return polishHtml(Mx.html(solution));
    return polishHtml(String(solution || ""));
  }

  function renderBlock(q, rawSolution) {
    const sol = rawSolution != null ? rawSolution : (q && q.solution);
    if (!sol || !String(sol).replace(/<[^>]+>/g, "").trim()) return "";
    const body = formatBody(sol);
    const shortcuts = extractShortcut(sol, q);
    const theme = subjectTheme(q);
    const shortcutHtml = shortcuts.length
      ? `<div class="qx-sol-shortcut" aria-label="Shortcut tips">
          <span class="qx-sol-shortcut-label">⚡ Shortcut</span>
          <div class="qx-sol-tips">${shortcuts.map(t => `<span class="qx-sol-tip">${esc(t)}</span>`).join("")}</div>
        </div>`
      : "";
    return `<div class="qx-sol-card ${theme}">
      <div class="qx-sol-head">
        <span class="qx-sol-badge">Quantrex Solution</span>
        ${shortcutHtml}
      </div>
      <div class="qx-content sol-body qx-sol-body">${body}</div>
    </div>`;
  }

  function renderInline(q) {
    return renderBlock(q);
  }

  return { renderBlock, renderInline, polishHtml, extractShortcut, subjectTheme, formatBody };
})();