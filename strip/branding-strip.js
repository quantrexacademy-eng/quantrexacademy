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

  /**
   * ExamGoal / ExamSIDE style paper meta.
   * Input examples:
   *   "JEE Main 2026 (08 April Shift 2)"
   *   "JEE Main 2026 (Online) 8th April Evening Shift"
   *   "JEE Advanced 2024 Paper 1"
   * Output chips: exam · date · Morning/Evening Shift (or Paper 1/2)
   */
  function parsePaperMeta(q) {
    const raw = displayText(
      (q && (q.paperSource || q.source || q.examName || "")) || ""
    );
    if (!raw) return null;
    const out = {
      raw,
      exam: "",
      year: "",
      date: "",
      shift: "",
      mode: "", // Online / Offline
      paper: "",
      label: raw
    };

    // JEE Main 2026 (Online) 8th April Evening Shift
    let m = raw.match(
      /^(JEE\s*(?:Main|Advanced)|NEET(?:\s*UG)?|BITSAT|MHT\s*CET|COMEDK|WBJEE|KCET|AP\s*EAMCET|TS\s*EAMCET)[^\d]*(\d{4})?\s*(?:\((Online|Offline)\))?\s*(?:(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+(?:\s+\d{4})?)|(?:\(?\s*(\d{1,2})\s+([A-Za-z]+)\s*(?:Shift|SHIFT)?\s*([12])?\s*\)?))?\s*(?:(Morning|Evening)\s*Shift|Shift\s*([12])|Paper\s*([12]))?/i
    );
    if (m) {
      out.exam = (m[1] || "").replace(/\s+/g, " ").trim();
      out.year = m[2] || "";
      out.mode = m[3] || "";
      if (m[4]) out.date = m[4].replace(/\s+/g, " ").trim();
      else if (m[5] && m[6]) {
        out.date = `${m[5]} ${m[6]}${out.year ? " " + out.year : ""}`.trim();
      }
      if (m[8]) out.shift = m[8].charAt(0).toUpperCase() + m[8].slice(1).toLowerCase() + " Shift";
      else if (m[9]) out.shift = (m[9] === "1" ? "Morning" : "Evening") + " Shift";
      else if (m[7]) out.shift = (String(m[7]) === "1" ? "Morning" : "Evening") + " Shift";
      if (m[10]) out.paper = "Paper " + m[10];
    }

    // Primary bank format: "JEE Main 2026 (08 April Shift 2)"
    {
      const sm = raw.match(/\((\d{1,2})\s+([A-Za-z]+)\s+Shift\s*([12])\)/i)
        || raw.match(/(\d{1,2})\s+([A-Za-z]+)\s+Shift\s*([12])/i);
      if (sm) {
        if (!out.date) out.date = `${sm[1]} ${sm[2]}`;
        if (!out.shift) out.shift = (sm[3] === "1" ? "Morning" : "Evening") + " Shift";
      }
    }
    // Simpler exam/year fallback
    if (!out.exam) {
      m = raw.match(/^(JEE\s*Main|JEE\s*Advanced|NEET|BITSAT|MHT\s*CET|COMEDK)[^\d]*(\d{4})/i);
      if (m) {
        out.exam = m[1].replace(/\s+/g, " ");
        out.year = m[2];
      }
      const pm = raw.match(/Paper\s*([12])/i);
      if (pm) out.paper = "Paper " + pm[1];
      const om = raw.match(/\b(Online|Offline)\b/i);
      if (om) out.mode = om[1];
    }
    // Use structured paperDate from Marks when present
    if (!out.date && q && q.paperDate) {
      try {
        const d = new Date(q.paperDate);
        if (!isNaN(d.getTime())) {
          out.date = d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
        }
      } catch (_) { /* */ }
    }

    // Build ExamGoal-style display label
    const parts = [];
    if (out.exam) parts.push(out.exam + (out.year ? " " + out.year : ""));
    if (out.mode) parts.push(out.mode);
    if (out.date) parts.push(out.date.replace(/\s+\d{4}$/, "") + (out.year && !/\d{4}/.test(out.date) ? "" : ""));
    // Prefer pretty date with ordinal if missing
    if (out.date && out.year && !out.date.includes(out.year)) {
      // keep short date without year duplication in chip; year stays on exam chip
    }
    if (out.shift) parts.push(out.shift);
    if (out.paper) parts.push(out.paper);
    if (parts.length) out.label = parts.join(" · ");
    else out.label = raw;

    // Clean double year
    out.label = out.label.replace(/\s+/g, " ").trim();
    return out;
  }

  function paperMetaHtml(q) {
    const meta = parsePaperMeta(q);
    if (!meta || !meta.label) return "";
    const logo = (typeof QuantrexExamLogos !== "undefined" && QuantrexExamLogos.forQuestion)
      ? QuantrexExamLogos.forQuestion(q).replace(
        'class="qx-exam-logo',
        'class="qx-exam-logo qx-paper-exam-logo'
      )
      : "";
    const chips = [];
    if (meta.exam) {
      chips.push(`<span class="qx-paper-chip qx-paper-exam">${escHtml(meta.exam)}${meta.year ? " " + escHtml(meta.year) : ""}</span>`);
    }
    if (meta.mode) chips.push(`<span class="qx-paper-chip qx-paper-mode">${escHtml(meta.mode)}</span>`);
    if (meta.date) {
      let d = meta.date;
      // Drop trailing year if already on exam chip
      if (meta.year) d = d.replace(new RegExp("\\s*" + meta.year + "\\s*$"), "");
      chips.push(`<span class="qx-paper-chip qx-paper-date">${escHtml(d.trim())}</span>`);
    }
    if (meta.shift) chips.push(`<span class="qx-paper-chip qx-paper-shift">${escHtml(meta.shift)}</span>`);
    if (meta.paper) chips.push(`<span class="qx-paper-chip qx-paper-paper">${escHtml(meta.paper)}</span>`);
    if (!chips.length) {
      chips.push(`<span class="qx-paper-chip qx-paper-full">${escHtml(meta.label)}</span>`);
    }
    const chapter = (q && q.chapter) ? `<span class="qx-paper-chip qx-paper-chapter">${escHtml(q.chapter)}</span>` : "";
    const subject = (q && q.subject) ? `<span class="qx-paper-chip qx-paper-subject">${escHtml(q.subject)}</span>` : "";
    return `<div class="qx-paper-meta" title="${escHtml(meta.raw)}">
      ${logo}
      <div class="qx-paper-meta-chips">${chips.join("")}${chapter}${subject}</div>
    </div>`;
  }

  function escHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return {
    displayText, toastText, sourceLabel, tagLabel, protectUrls, restoreUrls,
    parsePaperMeta, paperMetaHtml
  };
})();