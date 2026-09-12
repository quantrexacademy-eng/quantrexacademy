// Quantrex branding strip — remove third-party labels from display (content unchanged)
const QuantrexStrip = (() => {
  const TEXT_RULES = [
    [/\bALLEN\s*Digital\b/gi, "Quantrex Academy"],
    [/\bALLEN\b/g, "Quantrex Academy"],
    [/\bExamGOAL\b/gi, "Quantrex"],
    [/\bExamGoal\b/gi, "Quantrex"],
    [/\bQuizrr\b/gi, "Quantrex"],
    [/\bMOG\s*Premium\b/gi, "Quantrex Academy PYQ"],
    [/\bMOG\b/g, "PYQ"],
    [/\bMARKS\s*Premium\b/gi, "Quantrex Academy Premium"],
    [/\bMARKS\s*Selected\b/gi, "Quantrex Academy Selected"],
    [/\bMARKS\s*App\b/gi, "Quantrex Academy"],
    [/\bMARKS\s*web\b/gi, "Quantrex Academy"],
    [/Get\s*Marks(?:\s*App)?/gi, "Quantrex Academy"],
    [/Powered\s+by\s+MARKS/gi, ""],
    [/Scoremarks\s+Technologies/gi, "Quantrex Academy"],
    [/Mathongo/gi, "Quantrex Academy"],
    [/\bVedantu\b/gi, "Quantrex Academy"],
    [/\bUnacademy\b/gi, "Quantrex Academy"],
    [/\bAakash\b/gi, "Quantrex Academy"],
    [/\bFIITJEE\b/gi, "Quantrex Academy"],
    [/\bResonance\b/gi, "Quantrex Academy"],
    [/\bPhysics\s*Wallah\b/gi, "Quantrex Academy"],
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

  /** Hide Mongo ObjectIds / internal hashes that leak into UI (screenshot 726). */
  function isRawId(s) {
    const t = String(s || "").trim();
    if (!t) return true;
    if (/^[a-f0-9]{24}$/i.test(t)) return true; // Mongo ObjectId
    if (/^m_[a-f0-9]{20,}$/i.test(t)) return true;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return true;
    // mostly-hex blob with almost no spaces/words
    if (t.length >= 18 && t.length <= 40 && /^[a-f0-9]+$/i.test(t)) return true;
    return false;
  }

  function cleanUiLabel(s) {
    const t = displayText(s);
    if (!t || isRawId(t)) return "";
    // Drop pure id-like tokens inside multi-part labels
    const parts = t.split(/\s*[·|>/]\s*/).map(p => p.trim()).filter(p => p && !isRawId(p));
    if (!parts.length) return "";
    return parts.join(" · ");
  }

  const CHAPTER_DISPLAY_ALIASES = {
    "Motion In One Dimension": "Motion in One Dimension",
    "Motion In Two Dimensions": "Motion in Two Dimensions",
    "Work Power Energy": "Work, Power and Energy",
    "Center of Mass Momentum and Collision": "Center of Mass, Momentum and Collision",
    "Basic of Mathematics": "Basics of Mathematics",
    "Permutation Combination": "Permutation and Combination",
    "Sequence and Series": "Sequences and Series",
    "Quadratic Equations": "Quadratic Equation"
  };

  function niceChapterLabel(s) {
    const raw = String(s || "").trim();
    if (!raw) return "";
    if (CHAPTER_DISPLAY_ALIASES[raw]) return CHAPTER_DISPLAY_ALIASES[raw];
    // soft title-case fix: "In"/"Of" mid-title → "in"/"of" for Motion In ...
    return raw
      .replace(/\bIn\b/g, "in")
      .replace(/\bOf\b(?!$)/g, "of")
      .replace(/\bAnd\b/g, "and");
  }

  function humanChapter(q) {
    if (!q) return "";
    const cands = [q.chapterName, q.chapterTitle, q.topicName, q.topic, q.chapter];
    for (let i = 0; i < cands.length; i++) {
      const c = cleanUiLabel(cands[i]);
      if (c) return niceChapterLabel(c);
    }
    return "";
  }

  function humanSubject(q) {
    if (!q) return "";
    const cands = [q.subjectName, q.subjectTitle, q.subject];
    for (let i = 0; i < cands.length; i++) {
      const c = cleanUiLabel(cands[i]);
      if (c) return c;
    }
    return "";
  }

  function stripPaperOriginWords(s) {
    return String(s || "")
      .replace(/\bDigital\s*Book\b/gi, " ")
      .replace(/\b(?:Actual|Book)\b/gi, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s·,|/–-]+|[\s·,|/–-]+$/g, "")
      .trim();
  }

  function sourceLabel(q) {
    if (!q) return "";
    if (q._book && typeof bookQuestionLabel === "function") {
      const bl = stripPaperOriginWords(bookQuestionLabel(q));
      if (bl) return bl;
    }
    const raw = q.paperSource || q.source || q.examName || "";
    let label = stripPaperOriginWords(cleanUiLabel(raw));
    if (/^PYQ$/i.test(label) && humanChapter(q)) return humanChapter(q);
    if (!label || /^Quantrex$/i.test(label)) {
      if (q._bank === "board_live") return cleanUiLabel(q.examName) || "Board PYQ";
      if (q._bank && typeof BANK_INDEX !== "undefined" && BANK_INDEX[q._bank]) {
        return BANK_INDEX[q._bank].title;
      }
    }
    return label || "Previous Year";
  }

  function tagLabel(str) {
    const t = cleanUiLabel(str);
    if (!t) return "";
    if (/^PYQ$/i.test(t)) return "PYQ Bank";
    return t;
  }

  const MONTHS = {
    jan: "January", january: "January",
    feb: "February", february: "February",
    mar: "March", march: "March",
    apr: "April", april: "April",
    may: "May",
    jun: "June", june: "June",
    jul: "July", july: "July",
    aug: "August", august: "August",
    sep: "September", sept: "September", september: "September",
    oct: "October", october: "October",
    nov: "November", november: "November",
    dec: "December", december: "December"
  };

  function prettyMonth(m) {
    if (!m) return "";
    const k = String(m).toLowerCase().replace(/\./g, "");
    return MONTHS[k] || (m.charAt(0).toUpperCase() + m.slice(1).toLowerCase());
  }

  function shiftLabelFromNum(n) {
    const s = String(n || "").trim();
    if (s === "1" || /^morning|forenoon|am$/i.test(s)) return "Morning Shift";
    if (s === "2" || /^evening|afternoon|pm$/i.test(s)) return "Evening Shift";
    return "";
  }

  function formatPaperDate(day, month, year) {
    let d = String(day || "").replace(/(st|nd|rd|th)/i, "");
    d = d.replace(/^0+(\d)/, "$1"); // 08 → 8
    const mon = prettyMonth(month);
    const y = year ? String(year) : "";
    if (!d && !mon) return "";
    return [d, mon, y].filter(Boolean).join(" ");
  }

  function formatIsoDate(val) {
    if (val == null || val === "") return "";
    try {
      // year-only number
      if (/^\d{4}$/.test(String(val))) return String(val);
      const d = new Date(val);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    } catch (_) {
      return "";
    }
  }

  /**
   * Pull exam / year / date / shift / paper from one human source string.
   * Merges into `out` (never clears a better field already set).
   */
  function absorbSourceString(out, raw) {
    if (!raw || isRawId(raw)) return;
    const s = String(raw);

    // Exam name
    if (!out.exam) {
      let m = s.match(
        /\b(JEE\s*Main|JEE\s*Advanced|NEET(?:\s*UG)?|BITSAT|MHT\s*CET|COMEDK|WBJEE|KCET|AP\s*EAMCET|TS\s*EAMCET|VITEEE|NDA|Manipal\s*\(?MET\)?|IAT|NEST)\b/i
      );
      if (m) {
        out.exam = m[1].replace(/\s+/g, " ")
          .replace(/JEE\s*MAIN/i, "JEE Main")
          .replace(/JEE\s*ADVANCED/i, "JEE Advanced")
          .replace(/NEET\s*UG/i, "NEET UG");
      }
    }

    // Year
    if (!out.year) {
      const ym = s.match(/\b(20\d{2}|19\d{2})\b/);
      if (ym) out.year = ym[1];
    }

    // Online / Offline
    if (!out.mode) {
      const mm = s.match(/\b(Online|Offline)\b/i);
      if (mm) out.mode = mm[1].charAt(0).toUpperCase() + mm[1].slice(1).toLowerCase();
    }

    // Paper 1 / 2
    if (!out.paper) {
      const pm = s.match(/\bPaper\s*([12I]+)\b/i);
      if (pm) {
        const p = pm[1].replace(/I/i, "1").replace(/II/i, "2");
        out.paper = "Paper " + (/2|II/i.test(pm[1]) ? "2" : "1");
      }
    }

    // --- Date + Shift combined patterns ---
    // (08 Apr Shift 2) | 08 April Shift 1 | 08-Apr-2024 Shift-2
    if (!out.date || !out.shift) {
      let m = s.match(
        /\(?\s*(\d{1,2})(?:st|nd|rd|th)?[\s\-/]+([A-Za-z]{3,9})\.?(?:[\s\-/]+(\d{4}))?[\s,]+Shift\s*[-–]?\s*([12])\s*\)?/i
      ) || s.match(
        /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:\s+(\d{4}))?\s*(?:Online|Offline)?\s*Shift\s*[-–]?\s*([12])\b/i
      );
      if (m) {
        if (!out.date) out.date = formatPaperDate(m[1], m[2], m[3] || out.year);
        if (!out.shift) out.shift = shiftLabelFromNum(m[4]);
      }
    }

    // (08 Apr Online) | 16 Apr Online — date + mode, no shift number
    if (!out.date) {
      let m = s.match(
        /\(\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:\s+(\d{4}))?\s*(Online|Offline)?\s*\)/i
      ) || s.match(
        /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:\s+(\d{4}))?\s*(Online|Offline)\b/i
      );
      if (m && !/shift/i.test(m[2] || "")) {
        out.date = formatPaperDate(m[1], m[2], m[3] || out.year);
        if (m[4] && !out.mode) {
          out.mode = m[4].charAt(0).toUpperCase() + m[4].slice(1).toLowerCase();
        }
      }
    }

    // "8th April 2024 Evening Shift" / "9 January 2020 Morning Shift"
    if (!out.date || !out.shift) {
      let m = s.match(
        /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:\s+(\d{4}))?\s*(Morning|Evening|Forenoon|Afternoon)\s*Shift\b/i
      );
      if (m) {
        if (!out.date) out.date = formatPaperDate(m[1], m[2], m[3] || out.year);
        if (!out.shift) {
          const w = m[4].toLowerCase();
          out.shift = (w === "morning" || w === "forenoon") ? "Morning Shift" : "Evening Shift";
        }
      }
    }

    // Morning/Evening Shift alone
    if (!out.shift) {
      let m = s.match(/\b(Morning|Evening|Forenoon|Afternoon)\s*Shift\b/i);
      if (m) {
        const w = m[1].toLowerCase();
        out.shift = (w === "morning" || w === "forenoon") ? "Morning Shift" : "Evening Shift";
      }
    }
    if (!out.shift) {
      let m = s.match(/\bShift\s*[-–]?\s*([12])\b/i);
      if (m) out.shift = shiftLabelFromNum(m[1]);
    }

    // Date alone: "8th April 2024" / "08 Apr"
    if (!out.date) {
      let m = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:\s+(\d{4}))?\b/);
      if (m && !/shift|online|offline|main|advanced|paper/i.test(m[2])) {
        out.date = formatPaperDate(m[1], m[2], m[3] || out.year);
      }
    }

    // ISO-ish 2024-04-08
    if (!out.date) {
      let m = s.match(/\b(20\d{2}|19\d{2})-(\d{1,2})-(\d{1,2})\b/);
      if (m) {
        const monNames = ["", "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"];
        const mi = parseInt(m[2], 10);
        out.date = formatPaperDate(m[3], monNames[mi] || m[2], m[1]);
        if (!out.year) out.year = m[1];
      }
    }
  }

  /**
   * Complete paper meta chips: Exam Year · Date · Morning/Evening Shift · Paper
   * Handles:
   *   "JEE Main 2024 (08 Apr Shift 2)"
   *   "JEE Main 2018 (16 Apr Online)"
   *   "JEE Main 2026 (Online) 8th April Evening Shift"
   *   "JEE Advanced 2024 Paper 1"
   * Plus q.paperDate / q.paperShift / q.shift from Marks API
   * Merges ALL candidate strings so thin "JEE Main" does not wipe richer source.
   */
  function parsePaperMeta(q) {
    const candidates = [
      q && q._sourceFull,
      q && q.paperSource,
      q && q.source,
      q && q.paperTitle,
      q && q.yearTitle,
      q && q.examName,
      q && q.exam
    ].map(s => displayText(s)).filter(s => s && !isRawId(s));

    // Prefer richest string as raw label base
    let raw = "";
    candidates.forEach(c => {
      const score = (c.match(/shift|morning|evening|apr|jan|feb|mar|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}/gi) || []).length;
      const prev = (raw.match(/shift|morning|evening|apr|jan|feb|mar|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}/gi) || []).length;
      if (!raw || score > prev || (score === prev && c.length > raw.length)) raw = c;
    });
    if (!raw && q) {
      const examGuess = cleanUiLabel(q.examName || q.exam || "");
      if (examGuess) raw = examGuess;
    }
    if (!raw) return null;

    const out = {
      raw,
      exam: "",
      year: "",
      date: "",
      shift: "",
      mode: "",
      paper: "",
      label: raw
    };

    // Explicit structured fields first (Marks list / hydrate)
    if (q) {
      if (q.year && /^\d{4}$/.test(String(q.year))) out.year = String(q.year);
      if (q.paperYear && /^\d{4}$/.test(String(q.paperYear))) out.year = String(q.paperYear);
      const sh = q.paperShift != null ? q.paperShift : (q.shift != null ? q.shift : (q.session != null ? q.session : q.slot));
      if (sh != null && sh !== "") {
        const fromNum = shiftLabelFromNum(sh);
        if (fromNum) out.shift = fromNum;
        else if (/morning|evening|forenoon|afternoon/i.test(String(sh))) {
          out.shift = /morning|forenoon/i.test(String(sh)) ? "Morning Shift" : "Evening Shift";
        }
      }
      const dateFields = [q.paperDate, q.heldOn, q.examDate, q.date, q.sessionDate];
      for (let i = 0; i < dateFields.length; i++) {
        if (!dateFields[i]) continue;
        const iso = formatIsoDate(dateFields[i]);
        if (iso) {
          out.date = iso;
          if (!out.year) {
            const ym = String(iso).match(/\b(20\d{2}|19\d{2})\b/);
            if (ym) out.year = ym[1];
          }
          break;
        }
        // already human string
        if (/\d{1,2}|January|April|Apr|Jan/i.test(String(dateFields[i]))) {
          absorbSourceString(out, String(dateFields[i]));
          break;
        }
      }
    }

    // Merge every candidate string (thin + rich)
    candidates.forEach(c => absorbSourceString(out, c));
    absorbSourceString(out, raw);

    // Year lives on the exam chip only — do not also append it to the date
    if (out.date && out.year) {
      out.date = String(out.date)
        .replace(new RegExp("(^|\\s)" + out.year + "(?=\\s|$)", "g"), " ")
        .replace(/\s+/g, " ")
        .trim();
    }

    // Build full label for tooltip / single chip fallback
    const parts = [];
    if (out.exam) parts.push(out.exam + (out.year ? " " + out.year : ""));
    else if (out.year) parts.push(out.year);
    if (out.date) parts.push(out.date);
    if (out.shift) parts.push(out.shift);
    if (out.paper) parts.push(out.paper);
    out.label = parts.length ? parts.join(" · ") : raw;
    out.label = out.label.replace(/\s+/g, " ").trim();
    return out;
  }

  function isPyqMockSession() {
    try {
      if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.getSession) {
        const s = QuantrexTestEngine.getSession();
        if (s && /pyqmock/i.test(String(s.testType || ""))) return true;
      }
    } catch (_) { /* */ }
    return false;
  }

  /** Real Easy/Medium/Hard for the solution only. Empty if the bank has no difficulty. */
  function solDifficultyHtml(q) {
    const diff = (typeof qxQuestionDifficulty === "function")
      ? qxQuestionDifficulty(q)
      : "";
    if (!diff) return "";
    const dcls = String(diff).toLowerCase().replace(/[^a-z]/g, "") || "medium";
    return `<span class="qx-sol-diff-badge qx-paper-diff qx-paper-diff-${escHtml(dcls)}">Difficulty: ${escHtml(diff)}</span>`;
  }

  /**
   * Paper chips only (exam / year / date / shift / paper).
   * Do NOT repeat subject or chapter — those render once in the question head.
   * PYQ mock: date + Morning/Evening only (if present in source). Never invent.
   * Difficulty is never on the question — solution only.
   */
  function paperMetaHtml(q, opts) {
    opts = opts || {};
    const meta = parsePaperMeta(q);
    let logo = "";
    if (typeof QuantrexExamLogos !== "undefined" && QuantrexExamLogos.forQuestion) {
      logo = QuantrexExamLogos.forQuestion(q, 16);
      if (logo) {
        logo = logo
          .replace(/class="([^"]*)"/, 'class="$1 qx-paper-exam-logo qx-nta-chip"')
          .replace(/width="\d+"/g, 'width="16"')
          .replace(/height="\d+"/g, 'height="16"')
          .replace(/style="[^"]*"/, 'style="width:16px;height:16px;max-width:16px;max-height:16px;object-fit:contain;display:inline-block;vertical-align:-3px;margin:0 5px 0 0"');
      }
    }
    const chips = [];
    const examName = meta && meta.exam && !isRawId(meta.exam) ? stripPaperOriginWords(meta.exam) : "";
    const yearTxt = meta && meta.year && !isRawId(meta.year) ? String(meta.year) : "";
    let dateTxt = meta && meta.date && !isRawId(meta.date) ? stripPaperOriginWords(meta.date) : "";
    if (yearTxt && dateTxt) {
      dateTxt = dateTxt.replace(new RegExp("(^|\\s)" + yearTxt + "(?=\\s|$)", "g"), " ").replace(/\s+/g, " ").trim();
    }
    const dateShiftOnly = !!(opts.dateShiftOnly || opts.pyqMock || isPyqMockSession());
    if (dateTxt) {
      chips.push(`<span class="qx-paper-chip qx-paper-date">📅 ${escHtml(dateTxt)}</span>`);
    }
    if (meta && meta.shift) {
      chips.push(`<span class="qx-paper-chip qx-paper-shift">${escHtml(meta.shift)}</span>`);
    }
    if (!dateShiftOnly) {
      if (examName) {
        const examTxt = yearTxt ? examName + " " + yearTxt : examName;
        chips.unshift(`<span class="qx-paper-chip qx-paper-exam">${logo}<span class="qx-paper-exam-txt">${escHtml(examTxt)}</span></span>`);
        logo = "";
      } else if (yearTxt) {
        chips.unshift(`<span class="qx-paper-chip qx-paper-exam">${logo}<span class="qx-paper-exam-txt">${escHtml(yearTxt)}</span></span>`);
        logo = "";
      }
      if (meta && meta.mode && !isRawId(meta.mode)) {
        chips.push(`<span class="qx-paper-chip qx-paper-mode">${escHtml(meta.mode)}</span>`);
      }
      if (meta && meta.paper && !isRawId(meta.paper)) {
        chips.push(`<span class="qx-paper-chip qx-paper-paper">${escHtml(meta.paper)}</span>`);
      }
    }
    /* Difficulty never on the question — only in the solution. */

    if (!dateShiftOnly && !chips.length && meta && meta.label && !isRawId(meta.label)) {
      const full = stripPaperOriginWords(meta.label);
      if (full) {
        chips.push(`<span class="qx-paper-chip qx-paper-full">${logo}<span>${escHtml(full)}</span></span>`);
        logo = "";
      }
    }

    // Optional (off by default to avoid repeating subject/chapter shown elsewhere)
    if (opts.includeChapter) {
      const ch = humanChapter(q);
      if (ch) chips.push(`<span class="qx-paper-chip qx-paper-chapter">${escHtml(ch)}</span>`);
    }
    if (opts.includeSubject) {
      const sub = humanSubject(q);
      if (sub) chips.push(`<span class="qx-paper-chip qx-paper-subject">${escHtml(sub)}</span>`);
    }
    if (!chips.length) return "";

    const titleRaw = (meta && meta.label) || (meta && meta.raw) || "Question";
    return `<div class="qx-paper-meta" title="${escHtml(titleRaw)}">
      <div class="qx-paper-meta-chips">${logo}${chips.join("")}</div>
    </div>`;
  }

  function escHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Offline paper meta shards: data/qid_paper/{prefix}.json → { id: { s, d, m } } */
  const _paperShardCache = Object.create(null);
  const _paperShardLoading = Object.create(null);

  function paperMetaLooksRich(s) {
    return !!(s && /shift\s*[-–]?\s*[12]|morning|evening|forenoon|afternoon|\d{1,2}\s*[A-Za-z]{3,}|20\d{2}-\d{2}-\d{2}/i.test(String(s)));
  }

  function paperOriginLabel(q, meta) {
    return "";
  }

  function applyPaperRec(q, rec) {
    if (!q || !rec || !rec.s) return false;
    const prev = q.source || q.paperSource || "";
    if (paperMetaLooksRich(prev) && !paperMetaLooksRich(rec.s) && prev.length >= String(rec.s).length) return false;
    if (paperMetaLooksRich(rec.s) || !paperMetaLooksRich(prev) || String(rec.s).length > prev.length) {
      q.source = rec.s;
      q.paperSource = rec.s;
      q._sourceFull = rec.s;
    }
    if (rec.d && (!q.difficulty || q.difficulty === "Medium")) {
      // Prefer offline bank difficulty only if missing; keep API Easy/Hard
      if (!q.difficulty) q.difficulty = rec.d;
    }
    if (rec.d && !q.difficulty) q.difficulty = rec.d;
    return true;
  }

  async function loadPaperShard(pref) {
    if (_paperShardCache[pref]) return _paperShardCache[pref];
    if (_paperShardLoading[pref]) return _paperShardLoading[pref];
    _paperShardLoading[pref] = (async () => {
      try {
        const res = await fetch("data/qid_paper/" + encodeURIComponent(pref) + ".json?v=qxpm1", {
          cache: "force-cache"
        });
        _paperShardCache[pref] = res.ok ? await res.json() : {};
      } catch (_) {
        _paperShardCache[pref] = {};
      }
      delete _paperShardLoading[pref];
      return _paperShardCache[pref];
    })();
    return _paperShardLoading[pref];
  }

  /**
   * Ensure q.source has year/date/shift when available in offline index or fields.
   * Call before paperMetaHtml; returns true if meta improved.
   */
  async function enrichQuestionPaperMeta(q) {
    if (!q) return false;
    const before = String(q.source || q.paperSource || "");
    if (paperMetaLooksRich(before)) return false;
    const sid = String(q.id != null ? q.id : "");
    if (!sid) return false;
    const pref = sid.length > 3 ? sid.slice(0, -3) : "0";
    const shard = await loadPaperShard(pref);
    const rec = shard && (shard[sid] || shard[String(Number(sid))]);
    if (!rec) return false;
    applyPaperRec(q, rec);
    const after = String(q.source || "");
    return after !== before && paperMetaLooksRich(after);
  }

  /** Sync if shard already cached (no network). */
  function enrichQuestionPaperMetaSync(q) {
    if (!q) return false;
    const before = String(q.source || q.paperSource || "");
    if (paperMetaLooksRich(before)) return false;
    const sid = String(q.id != null ? q.id : "");
    if (!sid) return false;
    const pref = sid.length > 3 ? sid.slice(0, -3) : "0";
    const shard = _paperShardCache[pref];
    if (!shard) return false;
    const rec = shard[sid] || shard[String(Number(sid))];
    if (!rec) return false;
    applyPaperRec(q, rec);
    return paperMetaLooksRich(q.source || "");
  }

  function scrubForeignBrandDom(root) {
    const scope = root || document.body;
    if (!scope || !scope.querySelectorAll) return;
    const kill = [
      "img[src*='allen-logo']",
      "img[src*='getmarks-brand']",
      "img[src*='marks-premium']",
      "img[src*='vedantu-logo']",
      "img[alt='ALLEN']",
      "img[alt='Quizrr']",
      "img[alt='Get Marks App']"
    ].join(",");
    try {
      scope.querySelectorAll(kill).forEach((el) => {
        if (el.closest && el.closest("img.qx-pool-fig, .qx-pool-fig-wrap")) return;
        el.remove();
      });
      scope.querySelectorAll(".qx-paper-chip.qx-paper-actual").forEach((el) => el.remove());
      scope.querySelectorAll(".qx-paper-chip").forEach((el) => {
        const t = String(el.textContent || "").replace(/\s+/g, " ").trim();
        if (/^(actual|book|digital book)$/i.test(t)) el.remove();
      });
    } catch (_) { /* */ }
  }

  return {
    displayText, toastText, sourceLabel, tagLabel, protectUrls, restoreUrls,
    scrubForeignBrandDom,
    parsePaperMeta, paperMetaHtml, isRawId, cleanUiLabel, humanChapter, humanSubject,
    enrichQuestionPaperMeta, enrichQuestionPaperMetaSync, paperMetaLooksRich,
    isPyqMockSession, solDifficultyHtml
  };
})();