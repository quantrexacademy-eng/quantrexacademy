// Quantrex branding strip — remove third-party labels from display (content unchanged)
const QuantrexStrip = (() => {
  const TEXT_RULES = [
    [/\bALLEN\s*Digital\b/gi, "Quantrex Academy"],
    [/\bQuizrr\b/gi, "Quantrex Academy"],
    [/\bMOG\s*Premium\b/gi, "Quantrex Academy PYQ"],
    [/\bMOG\b/g, "PYQ"],
    [/\bMARKS\s*Premium\b/gi, "Quantrex Academy Premium"],
    [/\bMARKS\s*Selected\b/gi, "Quantrex Academy Selected"],
    [/\bMARKS\s*App\b/gi, "Quantrex Academy"],
    [/\bMARKS\s*web\b/gi, "Quantrex Academy"],
    [/Get\s*Marks\s*App/gi, "Quantrex Academy"],
    [/Powered\s+by\s+MARKS/gi, ""],
    [/Scoremarks\s+Technologies/gi, "Quantrex Academy"],
    [/Mathongo/gi, ""],
    [/\bfrom\s+MARKS\b/gi, ""],
    [/\bMARKS\s+live\b/gi, "Quantrex Academy"],
    [/\bMARKS\b/g, "Quantrex Academy"]
  ];

  const TOAST_RULES = [
    [/\bALLEN\s*Digital\b/gi, "Quantrex Academy"],
    [/\bQuizrr\b/gi, "Quantrex Academy"],
    [/\bMARKS\b/g, "Quantrex Academy"],
    [/from\s+MARKS/gi, ""]
  ];

  function protectUrls(str) {
    const slots = [];
    const safe = String(str).replace(/(https?:\/\/[^\s"'<>]+)/gi, url => {
      const key = `__QXURL${slots.length}__`;
      slots.push(url);
      return key;
    });
    return { safe, slots };
  }

  function restoreUrls(str, slots) {
    let out = str;
    slots.forEach((url, i) => { out = out.split(`__QXURL${i}__`).join(url); });
    return out;
  }

  function displayText(str) {
    if (str == null) return "";
    const { safe, slots } = protectUrls(str);
    let out = safe;
    TEXT_RULES.forEach(([rx, rep]) => { out = out.replace(rx, rep); });
    out = restoreUrls(out, slots);
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

  return { displayText, toastText, sourceLabel, tagLabel, protectUrls, restoreUrls };
})();