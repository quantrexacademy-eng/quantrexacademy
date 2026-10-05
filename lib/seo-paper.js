/**
 * Paper chips for public Google /q/ pages — same exam / date / Morning-Evening
 * arrangement as the website (QuantrexStrip.parsePaperMeta).
 * Display-only. Never writes question JSON.
 */
"use strict";

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
  d = d.replace(/^0+(\d)/, "$1");
  const mon = prettyMonth(month);
  const y = year ? String(year) : "";
  if (!d && !mon) return "";
  return [d, mon, y].filter(Boolean).join(" ");
}

function stripPaperOriginWords(s) {
  return String(s || "")
    .replace(/\bDigital\s*Book\b/gi, " ")
    .replace(/\b(?:Actual|Book)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s·,|/–-]+|[\s·,|/–-]+$/g, "")
    .trim();
}

function absorbSourceString(out, raw) {
  if (!raw) return;
  const s = String(raw);

  if (!out.exam) {
    const m = s.match(
      /\b(JEE\s*Main|JEE\s*Advanced|NEET(?:\s*UG)?|BITSAT|MHT\s*CET|COMEDK|WBJEE|KCET|AP\s*EAMCET|TS\s*EAMCET|VITEEE|NDA|Manipal\s*\(?MET\)?|IAT|NEST|AIIMS|JIPMER|NTA\s*Abhyas)\b/i
    );
    if (m) {
      out.exam = m[1].replace(/\s+/g, " ")
        .replace(/JEE\s*MAIN/i, "JEE Main")
        .replace(/JEE\s*ADVANCED/i, "JEE Advanced")
        .replace(/NEET\s*UG/i, "NEET UG");
    }
  }

  if (!out.year) {
    const ym = s.match(/\b(20\d{2}|19\d{2})\b/);
    if (ym) out.year = ym[1];
  }

  if (!out.mode) {
    const mm = s.match(/\b(Online|Offline)\b/i);
    if (mm) out.mode = mm[1].charAt(0).toUpperCase() + mm[1].slice(1).toLowerCase();
  }

  if (!out.paper) {
    const pm = s.match(/\bPaper\s*([12I]{1,3})\b/i);
    if (pm) out.paper = "Paper " + (/2|II/i.test(pm[1]) ? "2" : "1");
  }

  if (!out.date || !out.shift) {
    const m = s.match(
      /\(?\s*(\d{1,2})(?:st|nd|rd|th)?[\s\-/]+([A-Za-z]{3,9})\.?(?:[\s\-/]+(\d{4}))?[\s,]+Shift\s*[-–]?\s*([12])\s*\)?/i
    ) || s.match(
      /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:\s+(\d{4}))?\s*(?:Online|Offline)?\s*Shift\s*[-–]?\s*([12])\b/i
    );
    if (m) {
      if (!out.date) out.date = formatPaperDate(m[1], m[2], m[3] || out.year);
      if (!out.shift) out.shift = shiftLabelFromNum(m[4]);
    }
  }

  if (!out.date) {
    const m = s.match(
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

  if (!out.date || !out.shift) {
    const m = s.match(
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

  if (!out.shift) {
    const m = s.match(/\b(Morning|Evening|Forenoon|Afternoon)\s*Shift\b/i);
    if (m) {
      const w = m[1].toLowerCase();
      out.shift = (w === "morning" || w === "forenoon") ? "Morning Shift" : "Evening Shift";
    }
  }
  if (!out.shift) {
    const m = s.match(/\bShift\s*[-–]?\s*([12])\b/i);
    if (m) out.shift = shiftLabelFromNum(m[1]);
  }

  if (!out.date) {
    const m = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:\s+(\d{4}))?\b/);
    if (m && !/shift|online|offline|main|advanced|paper/i.test(m[2])) {
      out.date = formatPaperDate(m[1], m[2], m[3] || out.year);
    }
  }
}

function parsePaperMeta(rec) {
  const candidates = [
    rec && rec._sourceFull,
    rec && rec.paperSource,
    rec && rec.source,
    rec && rec.paperTitle,
    rec && rec.yearTitle,
    rec && rec.examName,
    rec && rec.exam,
    rec && rec.meta && rec.meta.source
  ].map((s) => String(s || "").trim()).filter(Boolean);

  let raw = "";
  candidates.forEach((c) => {
    const score = (c.match(/shift|morning|evening|apr|jan|feb|mar|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}/gi) || []).length;
    const prev = (raw.match(/shift|morning|evening|apr|jan|feb|mar|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}/gi) || []).length;
    if (!raw || score > prev || (score === prev && c.length > raw.length)) raw = c;
  });

  const out = {
    raw: raw,
    exam: "",
    year: "",
    date: "",
    shift: "",
    mode: "",
    paper: "",
    label: raw,
    chips: [],
    line: ""
  };

  if (rec) {
    if (rec.year && /^\d{4}$/.test(String(rec.year))) out.year = String(rec.year);
    const sh = rec.paperShift != null ? rec.paperShift : (rec.shift != null ? rec.shift : rec.session);
    if (sh != null && sh !== "") {
      const fromNum = shiftLabelFromNum(sh);
      if (fromNum) out.shift = fromNum;
      else if (/morning|evening|forenoon|afternoon/i.test(String(sh))) {
        out.shift = /morning|forenoon/i.test(String(sh)) ? "Morning Shift" : "Evening Shift";
      }
    }
  }

  candidates.forEach((c) => absorbSourceString(out, c));
  absorbSourceString(out, raw);

  if (!out.exam && rec && rec.exam) out.exam = stripPaperOriginWords(String(rec.exam));
  if (!out.year && rec && rec.year) out.year = String(rec.year);

  if (out.date && out.year) {
    out.date = String(out.date)
      .replace(new RegExp("(^|\\s)" + out.year + "(?=\\s|$)", "g"), " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  out.exam = stripPaperOriginWords(out.exam);
  out.date = stripPaperOriginWords(out.date);

  const examTxt = out.exam ? (out.year ? out.exam + " " + out.year : out.exam) : out.year;
  if (examTxt) out.chips.push(examTxt);
  if (out.date) out.chips.push(out.date);
  if (out.shift) out.chips.push(out.shift);
  if (out.mode) out.chips.push(out.mode);
  if (out.paper) out.chips.push(out.paper);

  out.line = out.chips.join(" · ");
  out.label = out.line || stripPaperOriginWords(raw);
  return out;
}

module.exports = {
  parsePaperMeta,
  stripPaperOriginWords,
  formatPaperDate,
  shiftLabelFromNum
};
