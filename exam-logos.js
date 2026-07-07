// Quantrex — MARKS CDN icons only (exams, subjects, NCERT toolbox)
const QuantrexExamLogos = (() => {
  const EXAM_BASE = "https://cdn-assets.getmarks.app/app_assets/img/exams/";
  const SUBJ_BASE = "https://cdn-assets.getmarks.app/app_assets/img/cpyqb/subjects/";
  const NCERT_TOOL = "https://cdn-assets.getmarks.app/app_assets/img/ui/ncert_toolbox/";

  const EXAM_FILES = {
    Engineering: "ic_content_exam_jee_main.png",
    Medical: "ic_content_exam_neet.png",
    Foundation: "ic_content_exam_nda.png",
    jee_main: "ic_content_exam_jee_main.png",
    jee_advanced: "ic_content_exam_jee_advanced.png",
    neet: "ic_content_exam_neet.png",
    aiims: "ic_content_exam_aiims.png",
    bitsat: "ic_content_exam_bitsat.png",
    mht_cet: "ic_content_exam_mhtcet.png",
    mht_cet_medical: "ic_content_exam_mhtcet.png",
    wbjee: "ic_content_exam_wbjee.png",
    comedk: "ic_content_exam_comedk.png",
    kcet: "ic_content_exam_kcet.png",
    ap_eamcet: "ic_content_exam_ap_eamcet.png",
    nda: "ic_content_exam_nda.png",
    kvpy: "ic_content_exam_kvpy.png",
    manipal_met: "ic_content_exam_manipal.png",
    iat_iiser: "ic_content_exam_iat.png",
    jipmer: "ic_content_exam_aiims.png",
    nta_abhyas_neet: "ic_content_exam_neet.png",
    nta_abhyas_jee_main: "ic_content_exam_jee_main.png",
    nest_niser: "ic_content_exam_nest.png",
    viteee: "ic_content_exam_viteee.png",
    ts_eamcet: "ic_content_exam_ts_eamcet.png",
    CBSE: "ic_content_exam_cbse.svg",
    HSC: "ic_content_exam_hsc_boards.svg",
    board_live: "ic_content_exam_cbse.svg"
  };

  const SUBJ_FILES = {
    Physics: "ic_physics_icon.svg",
    Chemistry: "ic_chemistry_icon.svg",
    Mathematics: "ic_mathematics_icon.svg",
    Biology: "ic_biology_icon.svg",
    Botany: "ic_botany_icon.svg",
    Zoology: "ic_zoology_icon.svg"
  };

  const NCERT_KIND = {
    lblq: {
      light: NCERT_TOOL + "ic_ncert_line_by_line_light.svg",
      dark: NCERT_TOOL + "ic_ncert_line_by_line_dark.svg",
      label: "NCERT Line by Line Qs"
    },
    ncoq: {
      light: NCERT_TOOL + "ic_ncert_problems_light.svg",
      dark: NCERT_TOOL + "ic_ncert_problems_dark.svg",
      label: "NCERT & Exemplar Qs"
    },
    dbq: {
      light: NCERT_TOOL + "ic_diagram_based_qs_light.svg",
      dark: NCERT_TOOL + "ic_diagram_based_qs_dark.svg",
      label: "Diagram Based Qs"
    }
  };

  const TITLE_SLUG = {
    "jee main": "jee_main",
    "jee advanced": "jee_advanced",
    "neet": "neet",
    "aiims": "aiims",
    "bitsat": "bitsat",
    "mht cet": "mht_cet",
    "mht cet - medical": "mht_cet_medical",
    "wbjee": "wbjee",
    "comedk": "comedk",
    "kcet": "kcet",
    "ap eamcet": "ap_eamcet",
    "ts eamcet": "ts_eamcet",
    "viteee": "viteee",
    "nest (niser)": "nest_niser",
    "nda": "nda",
    "kvpy": "kvpy",
    "manipal (met)": "manipal_met",
    "iat (iiser)": "iat_iiser",
    "jipmer": "jipmer",
    "nta abhyas (neet)": "nta_abhyas_neet",
    "nta abhyas (jee main)": "nta_abhyas_jee_main",
    "cbse": "CBSE",
    "hsc (maharashtra)": "HSC"
  };

  const CATEGORY_KEYS = new Set(["Engineering", "Medical", "Foundation"]);

  let _apiIcons = null;
  let _apiLoading = null;

  function themeKey() {
    if (typeof document === "undefined") return "light";
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function resolveThemedUrl(icon) {
    if (!icon) return "";
    if (typeof icon === "string") return icon;
    const t = themeKey();
    return icon[t] || icon.light || icon.dark || "";
  }

  function slugFromTitle(title) {
    if (!title) return null;
    const k = String(title).trim().toLowerCase();
    if (TITLE_SLUG[k]) return TITLE_SLUG[k];
    return k.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  async function loadExamIconsFromApi() {
    if (_apiIcons) return _apiIcons;
    if (_apiLoading) return _apiLoading;
    _apiLoading = (async () => {
      const map = {};
      try {
        if (typeof MarksLive !== "undefined") await MarksLive.ensureToken();
        const token = localStorage.getItem("quantrex_marks_token");
        if (!token) return map;
        const res = await fetch("https://web.getmarks.app/api/v1/exams?platform=web", {
          headers: { Authorization: "Bearer " + token, Accept: "application/json" }
        });
        if (!res.ok) return map;
        const data = await res.json();
        for (const cat of (data.data && data.data.exams) || []) {
          for (const r of cat.records || []) {
            const icon = r.icon || (r.examId && r.examId.icon);
            const url = resolveThemedUrl(icon);
            if (!url) continue;
            const slug = slugFromTitle(r.title);
            if (slug) map[slug] = url;
            if (typeof BANK_INDEX !== "undefined") {
              for (const [bankSlug, meta] of Object.entries(BANK_INDEX)) {
                if (meta.title && meta.title.toLowerCase() === String(r.title).toLowerCase()) {
                  map[bankSlug] = url;
                }
              }
            }
          }
        }
      } catch (e) { /* ignore */ }
      _apiIcons = map;
      return map;
    })();
    return _apiLoading;
  }

  const MAP_LABEL = {
    Engineering: "JEE Main & Advanced", Medical: "NEET UG", Foundation: "Class 9 & 10",
    CBSE: "CBSE", HSC: "HSC (Maharashtra)", board_live: "Board PYQ"
  };

  function meta(key) {
    const k = key || (typeof STATE !== "undefined" ? STATE.exam : "Engineering");
    let label = String(k || "Exam");
    if (MAP_LABEL[k]) label = MAP_LABEL[k];
    else if (typeof BANK_INDEX !== "undefined" && BANK_INDEX[k]) label = BANK_INDEX[k].title;
    return { key: k, label };
  }

  function staticExamSrc(slug) {
    if (!slug) return "";
    if (EXAM_FILES[slug] && !CATEGORY_KEYS.has(slug)) return EXAM_BASE + EXAM_FILES[slug];
    if (typeof BANK_INDEX !== "undefined" && BANK_INDEX[slug]) {
      const file = EXAM_FILES[slug];
      if (file) return EXAM_BASE + file;
      const derived = slugFromTitle(BANK_INDEX[slug].title);
      if (derived && EXAM_FILES[derived]) return EXAM_BASE + EXAM_FILES[derived];
    }
    return "";
  }

  function examSrc(key) {
    const k = key || (typeof STATE !== "undefined" ? STATE.exam : "Engineering");
    const staticUrl = staticExamSrc(k);
    if (staticUrl) return staticUrl;
    if (_apiIcons && _apiIcons[k]) {
      const url = resolveThemedUrl(_apiIcons[k]);
      if (url) return url;
    }
    if (EXAM_FILES[k]) return EXAM_BASE + EXAM_FILES[k];
    const cat = (typeof STATE !== "undefined" && STATE.exam) || "Engineering";
    return EXAM_BASE + (EXAM_FILES[cat] || EXAM_FILES.jee_main);
  }

  function imgHtml(src, label, size, cls) {
    const s = size || 36;
    const c = (cls || "qx-exam-logo") + " qx-marks-icon";
    const url = String(src || "").replace(/"/g, "&quot;");
    return `<img class="${c}" src="${url}" width="${s}" height="${s}" alt="${label || ""}" loading="lazy" decoding="async">`;
  }

  function html(key, size, cls) {
    const m = meta(key);
    return imgHtml(examSrc(key), m.label, size, cls);
  }

  function fromUrl(url, size, cls, alt) {
    const src = resolveThemedUrl(url);
    if (!src) return "";
    return imgHtml(src, alt || "", size, cls);
  }

  function subjectSrc(name, iconUrl) {
    if (iconUrl) return iconUrl;
    const file = SUBJ_FILES[name];
    return file ? SUBJ_BASE + file : "";
  }

  function subjectHtml(name, size, cls, iconUrl) {
    const src = subjectSrc(name, iconUrl);
    if (!src) return "";
    return imgHtml(src, name, size || 36, cls || "marks-subj-ic-img");
  }

  function ncertToolSrc(kind) {
    const m = NCERT_KIND[kind] || NCERT_KIND.lblq;
    return resolveThemedUrl(m);
  }

  function ncertToolHtml(kind, size, cls) {
    const m = NCERT_KIND[kind] || NCERT_KIND.lblq;
    const src = resolveThemedUrl(m);
    if (!src) return "";
    return imgHtml(src, m.label, size || 32, cls || "dash-tool-logo");
  }

  function forQuestion(q) {
    if (!q) return html(STATE.exam);
    if (q._bank === "board_live") {
      const b = typeof dashBoardSelected === "function" ? dashBoardSelected() : "CBSE";
      return html(b);
    }
    if (q._bank && (EXAM_FILES[q._bank] || (_apiIcons && _apiIcons[q._bank]))) return html(q._bank);
    if (q.exam && EXAM_FILES[q.exam]) return html(q.exam);
    return html(STATE.exam);
  }

  return {
    meta, examSrc, staticExamSrc, slugFromTitle, html, fromUrl, subjectSrc, subjectHtml,
    ncertToolHtml, ncertToolSrc, forQuestion, loadExamIconsFromApi,
    EXAM_FILES, SUBJ_FILES, NCERT_KIND, EXAM_BASE
  };
})();