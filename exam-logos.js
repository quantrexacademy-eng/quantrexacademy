// Quantrex — exam logos (MARKS CDN for board exams, local SVG for competitive)
const QuantrexExamLogos = (() => {
  const BASE = "assets/exam-logos/";
  const MARKS_CDN = "https://cdn-assets.getmarks.app/app_assets/img/exams/";
  const MAP = {
    Engineering: { file: "jee-main.svg", label: "JEE Main & Advanced", short: "JEE" },
    Medical: { file: "neet.svg", label: "NEET UG", short: "NEET" },
    Foundation: { file: "nda.svg", label: "Class 9 & 10", short: "Foundation" },
    jee_main: { file: "jee-main.svg", label: "JEE Main" },
    jee_advanced: { file: "jee-advanced.svg", label: "JEE Advanced" },
    neet: { file: "neet.svg", label: "NEET UG" },
    aiims: { file: "neet.svg", label: "AIIMS" },
    bitsat: { file: "bitsat.svg", label: "BITSAT" },
    mht_cet: { file: "mht-cet.svg", label: "MHT CET" },
    mht_cet_medical: { file: "mht-cet.svg", label: "MHT CET Medical" },
    wbjee: { file: "wbjee.svg", label: "WBJEE" },
    comedk: { file: "comedk.svg", label: "COMEDK" },
    kcet: { file: "kcet.svg", label: "KCET" },
    ap_eamcet: { file: "ap-eamcet.svg", label: "AP EAPCET" },
    nda: { file: "nda.svg", label: "NDA" },
    kvpy: { file: "kvpy.svg", label: "KVPY" },
    CBSE: { cdn: MARKS_CDN + "ic_content_exam_cbse.svg", label: "CBSE" },
    HSC: { cdn: MARKS_CDN + "ic_content_exam_hsc_boards.svg", label: "HSC (Maharashtra)" },
    board_live: { cdn: MARKS_CDN + "ic_content_exam_cbse.svg", label: "Board PYQ" }
  };

  function meta(key) {
    const k = key || (typeof STATE !== "undefined" ? STATE.exam : "Engineering");
    if (MAP[k]) return MAP[k];
    if (typeof BANK_INDEX !== "undefined" && BANK_INDEX[k]) {
      const slug = k.replace(/[^a-z0-9_]/gi, "_");
      return MAP[slug] || { file: "exam-default.svg", label: BANK_INDEX[k].title };
    }
    return { file: "exam-default.svg", label: String(k || "Exam") };
  }

  function src(key) {
    const m = meta(key);
    if (m.cdn) return m.cdn;
    return BASE + m.file;
  }

  function html(key, size, cls) {
    const m = meta(key);
    const s = size || 36;
    const c = (cls || "qx-exam-logo") + " qx-marks-icon";
    const v = typeof window !== "undefined" && window.QX_BUILD ? window.QX_BUILD : "1";
    const url = m.cdn ? m.cdn : src(key) + "?v=" + v;
    return `<img class="${c}" src="${url}" width="${s}" height="${s}" alt="${m.label}" loading="lazy" decoding="async">`;
  }

  function forQuestion(q) {
    if (!q) return html(STATE.exam);
    if (q._bank === "board_live") {
      const b = typeof dashBoardSelected === "function" ? dashBoardSelected() : "CBSE";
      return html(b);
    }
    if (q._bank && MAP[q._bank]) return html(q._bank);
    if (q.exam && MAP[q.exam]) return html(q.exam);
    return html(STATE.exam);
  }

  return { meta, src, html, forQuestion, MAP };
})();