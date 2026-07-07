// Quantrex — official-style exam logos (SVG assets)
const QuantrexExamLogos = (() => {
  const BASE = "assets/exam-logos/";
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
    CBSE: { file: "cbse.svg", label: "CBSE Board", color: "#2563eb" },
    HSC: { file: "hsc.svg", label: "HSC Maharashtra" },
    board_live: { file: "cbse.svg", label: "Board PYQ" }
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
    return BASE + meta(key).file;
  }

  function html(key, size, cls) {
    const m = meta(key);
    const s = size || 36;
    const c = cls || "qx-exam-logo";
    const v = typeof window !== "undefined" && window.QX_BUILD ? window.QX_BUILD : "1";
    return `<img class="${c}" src="${src(key)}?v=${v}" width="${s}" height="${s}" alt="${m.label}" loading="lazy" decoding="async">`;
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