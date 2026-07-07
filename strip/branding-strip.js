// Quantrex branding strip — remove third-party labels from display (content unchanged)
const QuantrexStrip = (() => {
  const TEXT_RULES = [
    [/\bMOG\s*Premium\b/gi, "Quantrex PYQ"],
    [/\bMOG\b/g, "PYQ"],
    [/\bMARKS\s*Premium\b/gi, "Quantrex Premium"],
    [/\bMARKS\s*Selected\b/gi, "Quantrex Selected"],
    [/\bMARKS\s*App\b/gi, "Quantrex"],
    [/\bMARKS\s*web\b/gi, "Quantrex"],
    [/Get\s*Marks\s*App/gi, "Quantrex"],
    [/Powered\s+by\s+MARKS/gi, ""],
    [/Scoremarks\s+Technologies/gi, "Quantrex Academy"],
    [/Mathongo/gi, ""],
    [/\bfrom\s+MARKS\b/gi, ""],
    [/\bMARKS\s+live\b/gi, "Quantrex Live"],
    [/\bMARKS\b/g, "Quantrex"],
    [/\bgetmarks\.app\b/gi, ""]
  ];

  const TOAST_RULES = [
    [/\bMARKS\b/g, "Quantrex"],
    [/from\s+MARKS/gi, ""]
  ];

  function displayText(str) {
    if (str == null) return "";
    let out = String(str);
    TEXT_RULES.forEach(([rx, rep]) => { out = out.replace(rx, rep); });
    return out.replace(/\s{2,}/g, " ").replace(/\s+·\s*$/g, "").trim();
  }

  function toastText(str) {
    if (str == null) return "";
    let out = String(str);
    TOAST_RULES.forEach(([rx, rep]) => { out = out.replace(rx, rep); });
    return out.replace(/\s{2,}/g, " ").trim();
  }

  function sourceLabel(q) {
    if (!q) return "";
    if (q._book && typeof bookQuestionLabel === "function") return bookQuestionLabel(q);
    const raw = q.paperSource || q.source || q.examName || "";
    let label = displayText(raw);
    if (/^PYQ$/i.test(label) && q.chapter) return q.chapter;
    if (!label || /^Quantrex$/i.test(label)) {
      if (q._bank === "board_live") return q.examName || "Board PYQ";
      if (q._bank && typeof BANK_INDEX !== "undefined" && BANK_INDEX[q._bank]) {
        return BANK_INDEX[q._bank].title;
      }
    }
    return label || "Previous Year";
  }

  function tagLabel(str) {
    const t = displayText(str);
    if (/^PYQ$/i.test(t)) return "PYQ Bank";
    return t;
  }

  return { displayText, toastText, sourceLabel, tagLabel };
})();