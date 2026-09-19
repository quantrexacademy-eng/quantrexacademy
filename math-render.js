// Quantrex — Math & HTML rendering (KaTeX + MathJax MathML + chemistry Unicode)
window.Mx = (() => {
  let ready = false;
  let katexReady = false;
  let katexLoading = null;

  /** H2SO4 → H₂SO₄ outside $...$ / \(...\) / math tags */
  const CHEM_SUB = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
  const CHEM_MAP = [
    [/H2SO4/g, "H₂SO₄"], [/H2O2/g, "H₂O₂"], [/H2O/g, "H₂O"], [/CO2/g, "CO₂"], [/SO2/g, "SO₂"],
    [/SO3/g, "SO₃"], [/NO2/g, "NO₂"], [/NO3/g, "NO₃"], [/NH3/g, "NH₃"], [/NH4OH/g, "NH₄OH"],
    [/NH4/g, "NH₄"], [/Fe2O3/g, "Fe₂O₃"], [/Al2O3/g, "Al₂O₃"], [/CaCO3/g, "CaCO₃"],
    [/Na2CO3/g, "Na₂CO₃"], [/KMnO4/g, "KMnO₄"], [/K2Cr2O7/g, "K₂Cr₂O₇"], [/CH4/g, "CH₄"],
    [/C2H6/g, "C₂H₆"], [/C2H4/g, "C₂H₄"], [/C2H2/g, "C₂H₂"], [/C6H6/g, "C₆H₆"],
    [/C6H12O6/g, "C₆H₁₂O₆"], [/C12H22O11/g, "C₁₂H₂₂O₁₁"],
    [/HCl/g, "HCl"], [/NaCl/g, "NaCl"], [/NaOH/g, "NaOH"], [/Ca\(OH\)2/g, "Ca(OH)₂"],
    [/HNO3/g, "HNO₃"], [/H3PO4/g, "H₃PO₄"], [/H2CO3/g, "H₂CO₃"], [/H2S/g, "H₂S"],
    [/O2/g, "O₂"], [/N2/g, "N₂"], [/Cl2/g, "Cl₂"], [/H2/g, "H₂"], [/Br2/g, "Br₂"],
    [/I2/g, "I₂"], [/F2/g, "F₂"], [/MnO2/g, "MnO₂"], [/PCl5/g, "PCl₅"], [/PCl3/g, "PCl₃"],
    [/SiO2/g, "SiO₂"], [/ZnO/g, "ZnO"], [/CuSO4/g, "CuSO₄"], [/AgNO3/g, "AgNO₃"],
    [/BaCl2/g, "BaCl₂"], [/Mg\(OH\)2/g, "Mg(OH)₂"], [/AlCl3/g, "AlCl₃"],
    [/CuO/g, "CuO"], [/FeSO4/g, "FeSO₄"], [/ZnSO4/g, "ZnSO₄"], [/NaHCO3/g, "NaHCO₃"],
    [/CH3COOH/g, "CH₃COOH"], [/CH3OH/g, "CH₃OH"], [/C2H5OH/g, "C₂H₅OH"],
    [/FADH2/g, "FADH₂"], [/NADH/g, "NADH"],
    // Physics units / constants (plain)
    [/\bDelta H\b/g, "ΔH"], [/\bDelta G\b/g, "ΔG"], [/\bDelta S\b/g, "ΔS"],
    [/\bDelta U\b/g, "ΔU"], [/\bDelta T\b/g, "ΔT"], [/\bDelta V\b/g, "ΔV"],
    [/\bDelta P\b/g, "ΔP"], [/\bDelta E\b/g, "ΔE"]
  ];

  const SUPER_DIG = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻" };

  function formatPcmbUnits(chunk) {
    let c = String(chunk || "");
    if (!c) return c;
    c = c.replace(/\bNADP\+/g, "NADP⁺");
    c = c.replace(/\bNAD\+/g, "NAD⁺");
    c = c.replace(/\b(Na|K|H|Ag|Li)\+\b/g, "$1⁺");
    c = c.replace(/\b(Cl|Br|I|F|OH)\-\b/g, "$1⁻");
    c = c.replace(/\b(Ca|Mg|Zn|Ba|Fe|Cu|Ni|Mn)2\+\b/g, "$1²⁺");
    c = c.replace(/\b(Al|Fe|Cr)3\+\b/g, "$1³⁺");
    c = c.replace(/\bSO4\s*2-\b/g, "SO₄²⁻");
    c = c.replace(/\bCO3\s*2-\b/g, "CO₃²⁻");
    c = c.replace(/\bPO4\s*3-\b/g, "PO₄³⁻");
    c = c.replace(/\bNO3-\b/g, "NO₃⁻");
    c = c.replace(/\bm\/s\^\{?2\}?\b/g, "m/s²");
    c = c.replace(/\bms\^-1\b/g, "ms⁻¹");
    c = c.replace(/\bm s\^-1\b/g, "m s⁻¹");
    c = c.replace(/\bm s\^-2\b/g, "m s⁻²");
    c = c.replace(/\b10\^(\d+)\b/g, (_, n) => "10" + String(n).split("").map((d) => SUPER_DIG[d] || d).join(""));
    c = c.replace(/\balpha-helix\b/gi, "α-helix");
    c = c.replace(/\bbeta-sheet\b/gi, "β-sheet");
    c = c.replace(/\bgamma[- ]rays?\b/gi, "γ-rays");
    return c;
  }

  function formatChemistryUnicode(str) {
    let s = String(str || "");
    if (!s || /\$|\\\(|\\\[|<math[\s>]/i.test(s)) {
      // Still convert plain formula tokens outside math islands
    }
    const parts = [];
    let i = 0;
    while (i < s.length) {
      // skip $...$ / $$...$$
      if (s[i] === "$") {
        const dbl = s[i + 1] === "$";
        const end = s.indexOf(dbl ? "$$" : "$", i + (dbl ? 2 : 1));
        if (end === -1) { parts.push(s.slice(i)); break; }
        parts.push(s.slice(i, end + (dbl ? 2 : 1)));
        i = end + (dbl ? 2 : 1);
        continue;
      }
      if (s.startsWith("\\(", i) || s.startsWith("\\[", i)) {
        const close = s.startsWith("\\(", i) ? "\\)" : "\\]";
        const end = s.indexOf(close, i + 2);
        if (end === -1) { parts.push(s.slice(i)); break; }
        parts.push(s.slice(i, end + 2));
        i = end + 2;
        continue;
      }
      if (s.startsWith("<math", i) || s.startsWith("‹math", i)) {
        const endTag = s.startsWith("<math", i) ? "</math>" : "›/math‹";
        const end = s.toLowerCase().indexOf(endTag.toLowerCase().replace("›/math‹", "</math>"), i);
        // simpler: find </math>
        const e2 = s.toLowerCase().indexOf("</math>", i);
        if (e2 === -1) { parts.push(s.slice(i)); break; }
        parts.push(s.slice(i, e2 + 7));
        i = e2 + 7;
        continue;
      }
      // accumulate plain until next special
      let j = i + 1;
      while (j < s.length && s[j] !== "$" && !s.startsWith("\\(", j) && !s.startsWith("\\[", j)
        && !s.startsWith("<math", j) && !s.startsWith("‹math", j)) j++;
      let chunk = s.slice(i, j);
      CHEM_MAP.forEach(([re, rep]) => { chunk = chunk.replace(re, rep); });
      chunk = formatPcmbUnits(chunk);
      // generic Element + digits (not inside words): e.g. C12H22O11
      chunk = chunk.replace(/\b([A-Z][a-z]?)(\d+)\b/g, (m, el, dig) => {
        if (/^(Figure|Class|Q|Option|Eq|Year|Page|[A-E])$/i.test(el)) return m;
        return el + dig.split("").map(d => CHEM_SUB[d] || d).join("");
      });
      parts.push(chunk);
      i = j;
    }
    return parts.join("");
  }

  function ensureKatexCss() {
    if (document.getElementById("qxKatexCss")) return;
    const l = document.createElement("link");
    l.id = "qxKatexCss";
    l.rel = "stylesheet";
    l.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
    document.head.appendChild(l);
    if (!document.getElementById("qxWorldMathCss")) {
      const s = document.createElement("style");
      s.id = "qxWorldMathCss";
      s.textContent = [
        ".katex{font-size:1.08em;line-height:1.35}",
        ".katex-display{margin:0.7em 0;overflow-x:auto;overflow-y:hidden;padding:2px 0}",
        ".katex-display>.katex{display:inline-block;max-width:100%}",
        ".mtk-q-text,.qx-question-body,.mtk-opt-text,.sol-body,.qx-sol-flow{",
        "  font-variant-numeric:lining-nums;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}",
        "code.qx-tex-code,.mtk-q-text code,.qx-question-body code,.mtk-opt-text code{",
        "  font-family:ui-monospace,'Cascadia Code',Consolas,Menlo,monospace;font-size:.92em;",
        "  background:rgba(15,23,42,.06);padding:.08em .35em;border-radius:6px}",
        "html[data-theme=dark] code.qx-tex-code,html[data-theme=dark] .mtk-q-text code{",
        "  background:rgba(255,255,255,.08)}",
        "pre.qx-tex-code{display:block;overflow-x:auto;padding:12px 14px;border-radius:12px;",
        "  background:#0f172a;color:#e2e8f0;font-size:13px;line-height:1.45;margin:10px 0}",
        "pre.qx-tex-code code{background:none;color:inherit;padding:0}"
      ].join("");
      document.head.appendChild(s);
    }
  }

  const KATEX_OPTS = {
    throwOnError: false,
    strict: false,
    trust: true,
    output: "html",
    minRuleThickness: 0.06,
    macros: {
      "\\R": "\\mathbb{R}",
      "\\N": "\\mathbb{N}",
      "\\Z": "\\mathbb{Z}",
      "\\Q": "\\mathbb{Q}",
      "\\C": "\\mathbb{C}",
      "\\degree": "{}^{\\circ}",
      "\\ohm": "\\Omega",
      "\\diff": "\\mathrm{d}",
      "\\e": "\\mathrm{e}"
    }
  };

  function loadKatex() {
    if (katexReady && window.katex && window.renderMathInElement) return Promise.resolve();
    if (katexLoading) return katexLoading;
    ensureKatexCss();
    const cdn = {
      core: [
        "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/katex.min.js"
      ],
      mhchem: [
        "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/mhchem.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/contrib/mhchem.min.js"
      ],
      auto: [
        "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/contrib/auto-render.min.js"
      ]
    };
    function loadFirst(urls, id, ok) {
      const existing = document.getElementById(id);
      if (existing && ((id === "qxKatexJs" && window.katex) || (id === "qxKatexAuto" && window.renderMathInElement) || (id === "qxKatexMhchem"))) {
        ok();
        return;
      }
      let i = 0;
      const tryNext = () => {
        if (i >= urls.length) { ok(); return; }
        const s = document.createElement("script");
        s.id = i === 0 ? id : id + "_fb" + i;
        s.src = urls[i++];
        s.async = true;
        s.onload = ok;
        s.onerror = tryNext;
        document.head.appendChild(s);
      };
      tryNext();
    }
    katexLoading = new Promise((resolve) => {
      const done = () => {
        katexReady = !!(window.katex && window.renderMathInElement);
        resolve();
      };
      loadFirst(cdn.core, "qxKatexJs", () => {
        loadFirst(cdn.mhchem, "qxKatexMhchem", () => {
          loadFirst(cdn.auto, "qxKatexAuto", done);
        });
      });
    });
    return katexLoading;
  }

  function initMathJax() {
    // Keep MathJax for MathML banks; KaTeX handles $...$ TeX
    if (window.MathJax && window.MathJax.typesetPromise) {
      ready = true;
      return;
    }
    if (document.getElementById("qxMathJaxScript")) return;
    window.MathJax = {
      skipStartupTypeset: true,
      tex: {
        inlineMath: [["$", "$"], ["\\(", "\\)"]],
        displayMath: [["$$", "$$"], ["\\[", "\\]"]],
        processEscapes: true,
        processEnvironments: true,
        packages: { "[+]": ["ams", "noerrors", "noundefined", "mhchem"] },
        macros: {
          "\\R": "\\mathbb{R}",
          "\\N": "\\mathbb{N}",
          "\\Z": "\\mathbb{Z}",
          "\\Q": "\\mathbb{Q}",
          "\\C": "\\mathbb{C}"
        }
      },
      options: {
        skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"],
        ignoreHtmlClass: "mathjax_ignore|tex2jax_ignore|qx-diagram-slot|qx-pool-fig-wrap|qx-fig|qx-ch-icon|qx-folder-nav|qx-ch-card-rich|cpyqb-ch-ic|cpyqb-ch-ic-fb|katex",
        processHtmlClass: "qx-content|mtk-q-text|mtk-opt-text|qx-prac-opt-text|sol-body|mtk-opt|qx-prac-opt|qx-opt-pair-struct|qx-opt-pair-name|allen-practice",
        renderActions: { addMenu: [] }
      },
      chtml: {
        scale: 1,
        matchFontHeight: true,
        displayAlign: "left"
      },
      startup: {
        ready() {
          MathJax.startup.defaultReady();
          ready = true;
          try {
            document.dispatchEvent(new CustomEvent("qx-mathjax-ready"));
          } catch (e) { /* */ }
        }
      }
    };
    const s = document.createElement("script");
    s.id = "qxMathJaxScript";
    s.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";
    s.async = true;
    document.head.appendChild(s);
    // Preload KaTeX in parallel
    loadKatex().catch(() => {});
  }

  let _mathRequested = false;

  function isHtml(str) {
    return /<[a-z][\s\S]*>/i.test(str);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const BRAND_PATTERNS = [
    /cdn-assets\.getmarks/gi,
    /www\.vedantu\.com/gi, /vedantu\.com/gi, /\bMIMS\b/gi,
    /Scoremarks\s+Technologies/gi, /Mathongo/gi, /\bGet\s*Marks\b/gi, /\bMARKS\s*App\b/gi,
    /\bVedantu\b/gi, /\bUnacademy\b/gi, /\bAakash\b/gi, /\bFIITJEE\b/gi, /\bResonance\b/gi,
    /Powered\s+by\s+MARKS/gi, /MOG\s*Premium/gi, /\bMARKS\s*Premium\b/gi,
    /\bMARKS\s*Selected\b/gi, /marks_selected/gi, /\bMARKS\s*web\b/gi,
    /\bALLEN\s*Digital\b/gi, /\bQuizrr\b/gi
  ];
  const PYQ_CDN = "https://cdn-question-pool.getmarks.app/";
  const BROKEN_CDN_RX = /https?:\/\/\.app\//gi;
  const PROTECTED_IMG_RX = /cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\/|formula_cards|cbse\/|NEET\/NCERT|ap_eamcet|assets\/diagrams\/qx-match/i;
  // NEVER match Quizrr path "watermarked_images" — that wiped List-I/II figures (stripBranding).
  const BRAND_IMG_RX = /(?:watermark(?!ed_images|_improved)|branding|marks-premium|ic_marks|marks_selected|getmarks-brand|web_assets|scoremarks)/i;
  const BRAND_LOGO_RX = /(?:watermark(?!ed_images|_improved)|marks-premium|ic_marks|marks_selected|getmarks-brand|web_assets|scoremarks)/i;
  const QUANTREX_BRAND_RX = /quantrex-academy-brand|qx-quantrex-wm-overlay/i;

  function isQuantrexBrandImg(img) {
    if (!img) return false;
    const src = img.getAttribute ? (img.getAttribute("src") || "") : "";
    const cls = img.className || "";
    return QUANTREX_BRAND_RX.test(src) || cls.includes("qx-quantrex-wm-overlay") || cls.includes("qx-premium-wm-logo");
  }
  const MARKS_UI_ICON_RX = /ic_content_exam_|cpyqb\/subjects\/|ncert_toolbox\/|subj-ic-img|exam-pill-logo|subj-mini-ic|qx-marks-icon|qx-exam-logo|board-exam|board-subj|marks-exam-ic|marks-board-subj|dash-board.*logo|dash-tool-logo|exam-card-logo/i;
  const QUESTION_IMG_RX = /cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\/|\/cbse\/|ap_eamcet|assets\/diagrams\/qx-match|qx-local-fig/i;
  const FORMULA_IMG_RX = /formula_cards/i;

  function isMarksUiIcon(str) {
    return MARKS_UI_ICON_RX.test(str || "");
  }

  function isQuestionDiagram(str) {
    if (!str || isMarksUiIcon(str)) return false;
    if (QUESTION_IMG_RX.test(str)) return true;
    return /cdn-question-pool[^"']*\/cbse\//i.test(str)
      || /\/cbse\/\d/i.test(str)
      || /diagram|question-pool|twelfth|tenth/i.test(str);
  }

  function diagramWrapClass(attrs) {
    return isQuestionDiagram(attrs) ? "qx-diagram-wrap" : "qx-img-wrap";
  }

  function isDiagramImg(attrs) {
    return isQuestionDiagram(attrs);
  }

  const OPT_IMG_SEL = ".mtk-opt-text, .qx-prac-opt-text, .mtk-opt, .qa-opt, .qx-prac-opt";

  function isInOptionContext(node) {
    return !!(node && node.closest && node.closest(OPT_IMG_SEL));
  }

  const LOCAL_DIAG_RX = /^\.?\/?assets\/(diagrams|clean-diagrams)\//i;

  function shouldPoolFigure(src) {
    if (!src) return false;
    // Local match figures: keep as plain img (no poolFigureHtml remount)
    if (/assets\/diagrams\/qx-match|qx-local-fig/i.test(src)) return false;
    // Irodov / Rank Booster stem scans are the whole question — do not remount into a 280px box
    if (/2026_modules\/|modules\/ms\/|AKCR2_/i.test(src)) return false;
    if (/cdn-question-pool\.getmarks\.app/i.test(src)) return true;
    return LOCAL_DIAG_RX.test(src);
  }

  function figureHtml(attrs) {
    const srcM = String(attrs || "").match(/\bsrc=["']([^"']+)["']/i);
    const src = srcM ? fixBrokenImgUrls(srcM[1]) : "";
    if (shouldPoolFigure(src) && typeof QxImgClean !== "undefined" && QxImgClean.poolFigureHtml) {
      return QxImgClean.poolFigureHtml(src);
    }
    const hasLoading = /loading=/i.test(attrs);
    const extra = hasLoading ? "" : ' loading="eager" decoding="async" fetchpriority="high"';
    const cls = /class=/i.test(attrs)
      ? attrs.replace(/class=(["'])([^"']*)\1/i, 'class=$1$2 qx-fig-img qx-no-wm qx-pool-fig$1')
      : attrs + ' class="qx-fig-img qx-no-wm qx-pool-fig"';
    return `<figure class="qx-fig qx-pool-fig-wrap qx-brand-covered qx-fig-stack"><img${cls}${extra}></figure>`;
  }

  function fixImgAttrs(attrs) {
    return String(attrs || "").replace(/src=(["'])([^"']+)\1/i, (m, q, url) => {
      return `src=${q}${fixBrokenImgUrls(url)}${q}`;
    });
  }

  function wrapDiagramImages(html) {
    return html.replace(/<img([^>]*)>/gi, (m, attrs) => {
      const fixedAttrs = fixImgAttrs(attrs);
      if (FORMULA_IMG_RX.test(fixedAttrs)) return m;
      if (isMarksUiIcon(fixedAttrs)) return m;
      if (QUANTREX_BRAND_RX.test(fixedAttrs)) return m;
      // Local match figures: keep plain <img>, no figure wrapper / strip
      if (/assets\/diagrams\/qx-match|qx-local-fig|qx-match-fig/i.test(fixedAttrs)) {
        return `<img${fixedAttrs}>`;
      }
      if (BRAND_LOGO_RX.test(fixedAttrs) && !isDiagramImg(fixedAttrs)) return "";
      if (/class=["'][^"']*qx-(fig-img|opt-fig|img)-wrap/i.test(fixedAttrs)) return m;
      if (/class=["'][^"']*qx-fig-img/i.test(fixedAttrs)) return m;
      if (isDiagramImg(fixedAttrs)) return figureHtml(fixedAttrs);
      const hasLoading = /loading=/i.test(fixedAttrs);
      const extra = hasLoading ? "" : ' loading="lazy" decoding="async"';
      return `<span class="qx-img-wrap"><img${fixedAttrs}${extra}></span>`;
    });
  }

  function unwrapLegacyPanel(panel) {
    const img = panel.querySelector("img");
    if (!img || !panel.parentNode) {
      panel.remove();
      return null;
    }
    panel.parentNode.insertBefore(img, panel);
    panel.remove();
    return img;
  }

  function stripHeavyWrap(img) {
    const panel = img.closest(".qx-diagram-panel");
    if (panel) unwrapLegacyPanel(panel);
    const fig = img.closest(".qx-fig, figure");
    if (fig && isInOptionContext(img) && !fig.closest(".qx-diagram-slot, #qxDiagramSlot, .mathjax_ignore, .tex2jax_ignore")) {
      fig.parentNode.insertBefore(img, fig);
      fig.remove();
    }
    img.style.transform = "";
    img.style.transformOrigin = "";
  }

  function wrapOptFig(img) {
    stripHeavyWrap(img);
    if (img.closest(".qx-opt-fig")) return;
    const span = document.createElement("span");
    span.className = "qx-opt-fig";
    img.parentNode.insertBefore(span, img);
    span.appendChild(img);
    img.classList.add("qx-no-wm", "qx-pool-fig");
    span.classList.add("qx-pool-fig-wrap");
    img.loading = "eager";
    img.decoding = "async";
    if (typeof QxImgClean !== "undefined" && QxImgClean.ensureBrandOverlay) QxImgClean.ensureBrandOverlay(span);
  }

  function wrapQuestionFig(img) {
    stripHeavyWrap(img);
    if (img.closest(".qx-fig")) return;
    const src = fixBrokenImgUrls(img.getAttribute("src") || "");
    if (shouldPoolFigure(src) && typeof QxImgClean !== "undefined" && QxImgClean.poolFigureHtml) {
      const wrap = document.createElement("div");
      wrap.innerHTML = QxImgClean.poolFigureHtml(src);
      const fig = wrap.firstElementChild;
      if (fig) {
        img.parentNode.insertBefore(fig, img);
        img.remove();
        const slotImg = fig.querySelector("img");
        if (slotImg && QxImgClean.processImage) QxImgClean.processImage(slotImg);
        return;
      }
    }
    const fig = document.createElement("figure");
    fig.className = "qx-fig qx-pool-fig-wrap";
    const inner = document.createElement("div");
    inner.className = "qx-fig-inner qx-wm-stack";
    img.parentNode.insertBefore(fig, img);
    fig.appendChild(inner);
    inner.appendChild(img);
    img.classList.add("qx-fig-img", "qx-no-wm", "qx-pool-fig");
    img.loading = "eager";
    img.decoding = "async";
    img.fetchPriority = "high";
    if (typeof QxImgClean !== "undefined" && QxImgClean.processImage) QxImgClean.processImage(img);
  }

  function protectImgUrls(str) {
    const slots = [];
    const safe = String(str).replace(/(<img[^>]+src=["'])([^"']+)(["'])/gi, (m, pre, url, post) => {
      if (!PROTECTED_IMG_RX.test(url) && !FORMULA_IMG_RX.test(url)) return m;
      const key = `__QXIMG${slots.length}__`;
      slots.push(url);
      return `${pre}${key}${post}`;
    });
    return { safe, slots };
  }

  function restoreImgUrls(str, slots) {
    let out = str;
    slots.forEach((url, i) => { out = out.split(`__QXIMG${i}__`).join(url); });
    return out;
  }

  function fixBrokenImgUrls(str) {
    return String(str || "").replace(BROKEN_CDN_RX, PYQ_CDN);
  }

  function stripBranding(str) {
    let raw = fixBrokenImgUrls(str);
    const { safe, slots } = protectImgUrls(raw);
    let out = safe;
    BRAND_PATTERNS.forEach(rx => { out = out.replace(rx, ""); });
    if (typeof QxWM !== "undefined") out = QxWM.cleanHtml(out);
    else {
      // watermark(?!ed_images) — do not delete Quizrr structure diagrams
      out = out.replace(/<[^>]*(?:watermark(?!ed_images|_improved)|getmarks-brand|marks-app)[^>]*>[\s\S]*?<\/[^>]+>/gi, "");
      out = out.replace(/<img[^>]+(?:watermark(?!ed_images|_improved)|marks-premium|ic_marks)[^>]*>/gi, "");
    }
    out = restoreImgUrls(out, slots);
    // Safety: never allow brand strip to leave a match table without its cell figures
    if (typeof QuantrexStrip !== "undefined" && !/<img/i.test(out)) out = QuantrexStrip.displayText(out);
    if (isHtml(out)) out = wrapDiagramImages(out);
    return out.replace(/\s{2,}/g, " ").trim();
  }

  function isDiagramProtected(node) {
    if (!node) return false;
    if (node.classList && (node.classList.contains("qx-pool-fig") || node.classList.contains("qx-fig-img") || node.classList.contains("qx-no-wm"))) {
      const src = node.getAttribute && (node.getAttribute("src") || "");
      if (isQuestionDiagram(src)) return true;
    }
    return !!(node.closest && node.closest(".qx-diagram-slot, #qxDiagramSlot, .mathjax_ignore, .tex2jax_ignore, .qx-pool-fig-wrap, .qx-fig, .qx-opt-fig"));
  }

  function cleanDom(root) {
    const el = root || document.getElementById("app-main") || document.body;
    if (!el) return;
    if (typeof QxWM !== "undefined") QxWM.scan(el);
    else el.querySelectorAll("[class*='watermark'],[class*='Watermark'],[data-brand],.marks-brand,.getmarks-brand").forEach(n => {
      // Never remove table cells / figure wrappers that merely contain pool imgs
      if (n.querySelector && n.querySelector("img.qx-pool-fig, img.qx-match-fig, img[src*='quizrr'], img[src*='proxy-image'], img[src*='watermarked_images']")) return;
      n.remove();
    });
    el.querySelectorAll(".qx-diagram-panel").forEach(panel => unwrapLegacyPanel(panel));
    el.querySelectorAll(".qx-diag-toolbar, .qx-diagram-hint, .qx-diagram-badge").forEach(n => n.remove());
    el.querySelectorAll("img").forEach(img => {
      if (isQuantrexBrandImg(img)) return;
      if (img.closest(".qx-marks-native, .qx-marks-native-opt")) {
        const src = fixBrokenImgUrls(img.getAttribute("src") || "");
        if (src && src !== img.getAttribute("src")) img.setAttribute("src", src);
        img.classList.add("qx-marks-inline-fig");
        return;
      }
      if (isDiagramProtected(img)) return;
      let src = img.getAttribute("src") || "";
      const alt = img.getAttribute("alt") || "";
      const cls = img.className || "";
      const orig = img.getAttribute("data-qx-orig-src") || "";
      // Absolute protect: pool / quizrr / proxy / match-table figures
      if (/cdn\.quizrr|cdn-question-pool|watermarked_images|\/pyq\/|proxy-image|qx-pool-fig|qx-match-fig/i.test(src + " " + orig + " " + cls)
        || img.closest("table, .qx-match-q-body, .qx-inline-table-figs")) {
        img.classList.add("qx-pool-fig", "qx-no-wm", "qx-match-fig");
        img.style.display = "block";
        img.style.visibility = "visible";
        img.style.opacity = "1";
        img.style.maxHeight = "none";
        return;
      }
      if (FORMULA_IMG_RX.test(src) || img.classList.contains("fc-img")) return;
      if (isMarksUiIcon(src) || isMarksUiIcon(cls) || img.classList.contains("qx-marks-icon")) return;
      if (isQuestionDiagram(src) || isQuestionDiagram(orig)) {
        if (isInOptionContext(img)) wrapOptFig(img);
        else wrapQuestionFig(img);
        return;
      }
      if (img.classList.contains("qx-brand-logo") || img.classList.contains("qx-wm-badge") || img.closest(".qx-quantrex-wm, .qx-premium-wm, .qx-diag-watermark, .qx-brand-overlay, .qx-wm-mask, .qx-marks-scrub")) return;
      if (QUANTREX_BRAND_RX.test(src)) return;
      if (BRAND_LOGO_RX.test(src) || BRAND_LOGO_RX.test(alt)) { img.remove(); return; }
      if (src.includes("://.app/")) {
        src = fixBrokenImgUrls(src);
        img.setAttribute("src", src);
      }
      img.removeAttribute("crossorigin");
      if (!img.dataset.qxErrBound && typeof QxImgClean !== "undefined") {
        img.addEventListener("error", () => QxImgClean.restoreOriginal(img), { once: false });
        img.dataset.qxErrBound = "1";
      }
      if (!img.closest(".qx-img-wrap") && src && !src.startsWith("data:")) {
        const wrap = document.createElement("span");
        wrap.className = "qx-img-wrap";
        img.parentNode.insertBefore(wrap, img);
        wrap.appendChild(img);
      }
    });
  }

  function htmlMarksNative(content) {
    // Black Book / digital books: ALWAYS full math + spacing path.
    // Lite path was leaving raw LaTeX / broken &gt; inside $…$ (Q44-style).
    if (content == null) return "";
    let s = fixBrokenImgUrls(String(content).trim());
    if (!s) return "";
    // Keep figures: rewrite broken CDNs before full html
    s = s
      .replace(/(?:<br\s*\/?>\s*){2,}/gi, "<br>")
      .replace(/<p[^>]*>\s*(?:&nbsp;|\s|<br\s*\/?>)*\s*<\/p>/gi, "");
    return html(s);
  }

  /** Decode HTML entities inside math so KaTeX sees real < > & */
  function decodeEntitiesInMath(s) {
    const decodeInner = (inner) => String(inner || "")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&")
      .replace(/&nbsp;/gi, " ")
      .replace(/&le;/gi, "\\le ")
      .replace(/&ge;/gi, "\\ge ")
      .replace(/&ne;/gi, "\\ne ")
      .replace(/&#60;/g, "<")
      .replace(/&#62;/g, ">")
      .replace(/&#(\d+);/g, (m, n) => {
        const code = parseInt(n, 10);
        if (code === 60) return "<";
        if (code === 62) return ">";
        if (code === 38) return "&";
        try { return String.fromCharCode(code); } catch (e) { return m; }
      });
    return String(s || "")
      .replace(/\$\$([\s\S]+?)\$\$/g, (_, inner) => "$$" + decodeInner(inner) + "$$")
      .replace(/\$([^$]+)\$/g, (_, inner) => "$" + decodeInner(inner) + "$");
  }

  /** Multi-line cases/matrix inside $…$ → $$…$$ for KaTeX display */
  function promoteCasesToDisplay(s) {
    let c = String(s || "");
    // Promote the WHOLE island (sgn(t)=cases) — do not wrap cases inside an existing $
    c = c.replace(
      /\$([^$]*\\begin\{(?:cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|aligned|array|smallmatrix)\}[\s\S]*?\\end\{(?:cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|aligned|array|smallmatrix)\}[^$]*)\$/g,
      (_, body) => "$$" + body.trim() + "$$"
    );
    // Bare cases not already in math
    c = replaceOutsideMathFn(c, (chunk) => chunk.replace(
      /(^|[^$\\])(\\begin\{(?:cases|matrix|pmatrix|bmatrix)\}[\s\S]*?\\end\{(?:cases|matrix|pmatrix|bmatrix)\})/g,
      (m, pre, tex) => {
        if (/\$\$/.test(m)) return m;
        return pre + "$$" + tex + "$$";
      }
    ));
    return c;
  }

  /**
   * Currency / plain numbers often arrive as broken math from Marks/CBSE exports
   * (e.g. $₹ 1,80,000$ → MathJax "Math input error"). Prefer plain text.
   */
  function repairCurrencyAndPlainNumbers(s) {
    let out = String(s || "");

    // Normalize undefined money macros once (do not re-wrap on later passes)
    out = out.replace(/\\rupees?\b/gi, "₹");
    out = out.replace(/\\Rs\b/g, "Rs");

    // Collapse nested \text{\text{₹}} → ₹ before other rules
    for (let i = 0; i < 4; i++) {
      out = out.replace(/\\text\s*\{\s*₹\s*\}/g, "₹");
      out = out.replace(/\\mathrm\s*\{\s*₹\s*\}/g, "₹");
    }

    // Any $…$ that is only currency + Indian/western amount → plain ₹ amount
    out = out.replace(/\$([^$]{0,80})\$/g, (full, inner) => {
      const t = String(inner)
        .replace(/\\[,;:\s]+/g, " ")
        .replace(/\\text\s*\{([^}]*)\}/gi, "$1")
        .replace(/\\mathrm\s*\{([^}]*)\}/gi, "$1")
        .replace(/\\textbf\s*\{([^}]*)\}/gi, "$1")
        .replace(/\{,\}/g, ",")
        .replace(/\\/g, "")
        .replace(/\s+/g, " ")
        .trim();
      // ₹ / Rs / INR + number
      let m = t.match(/^(?:₹|Rs\.?|INR)\s*([0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]+(?:\.[0-9]+)?)$/i);
      if (m) return "₹ " + m[1];
      // pure Indian lakh / thousand grouped number (e.g. 1,80,000 or 1,000,000)
      if (/^[0-9]{1,3}(?:,[0-9]{2,3})+$/.test(t) || /^[0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?$/.test(t)) {
        return t;
      }
      return full;
    });

    // \( ₹ 1,80,000 \) or \( 1,80,000 \)
    out = out.replace(
      /\\\(\s*(?:₹|Rs\.?|INR)\s*([0-9]{1,3}(?:,[0-9]{2,3})+|[0-9]+(?:\.[0-9]+)?)\s*\\\)/gi,
      (_, n) => "₹ " + n
    );
    out = out.replace(
      /\\\(\s*([0-9]{1,2}(?:,[0-9]{2})+,[0-9]{3})\s*\\\)/g,
      "$1"
    );

    // Bare ₹ still inside multi-token math (algebra + rupee) → \text{₹} once
    out = out.replace(/\$([^$]*?)₹([^$]*?)\$/g, (full, a, b) => {
      if (/\\text\s*\{\s*$/.test(a) || /\\text\s*\{\s*₹/.test(full)) return full;
      // If the whole thing is just money, already handled above; else wrap symbol
      return "$" + a + "\\text{₹}" + b + "$";
    });

    // Fix broken thin-space thousand: 1{,80,000} → 1,80,000
    out = out.replace(/([0-9])\{,([0-9])/g, "$1,$2");

    return out;
  }

  /**
   * Convert LaTeX \begin{array}...\end{array} (incl. probability tables with \hline)
   * to HTML tables OR keep as KaTeX $…$ so symbols never show as raw \hline \dfrac.
   * Fixes Q16-style: "\hline X 4 k" / "\dfrac{30}{7k}" garbage.
   */
  function matchBalancedBrace(s, openIdx) {
    if (!s || s[openIdx] !== "{") return -1;
    let depth = 0;
    for (let k = openIdx; k < s.length; k++) {
      const ch = s[k];
      if (ch === "\\") { k++; continue; }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) return k;
      }
    }
    return -1;
  }

  /** \xrightarrow{\begin{array}...} → \xrightarrow{\substack{...}} so List-II reactions stay in the cell */
  function rewriteReactionArrowArrays(s) {
    let out = String(s || "");
    ["xrightarrow", "xleftarrow"].forEach((name) => {
      const token = "\\" + name;
      let res = "";
      let i = 0;
      while (i < out.length) {
        const idx = out.indexOf(token, i);
        if (idx < 0) { res += out.slice(i); break; }
        const after = idx + token.length;
        if (/[a-zA-Z]/.test(out[after] || "")) {
          res += out.slice(i, after);
          i = after;
          continue;
        }
        let j = after;
        while (j < out.length && /\s/.test(out[j])) j++;
        if (out[j] !== "{") {
          res += out.slice(i, j);
          i = j;
          continue;
        }
        const end = matchBalancedBrace(out, j);
        if (end < 0) {
          res += out.slice(i, j + 1);
          i = j + 1;
          continue;
        }
        let inner = out.slice(j + 1, end);
        inner = inner.replace(
          /\\begin\{array\}\{[^}]*\}([\s\S]*?)\\end\{array\}/g,
          (_, body) => "\\substack{" + String(body || "").trim() + "}"
        );
        res += out.slice(i, after) + "{" + inner + "}";
        i = end + 1;
      }
      out = res;
    });
    return out;
  }

  function parkReactionArrows(s) {
    const parked = [];
    let out = String(s || "");
    ["xrightarrow", "xleftarrow"].forEach((name) => {
      const token = "\\" + name;
      let res = "";
      let i = 0;
      while (i < out.length) {
        const idx = out.indexOf(token, i);
        if (idx < 0) { res += out.slice(i); break; }
        const after = idx + token.length;
        let j = after;
        while (j < out.length && /\s/.test(out[j])) j++;
        if (out[j] !== "{") {
          res += out.slice(i, after);
          i = after;
          continue;
        }
        const end = matchBalancedBrace(out, j);
        if (end < 0) {
          res += out.slice(i, after);
          i = after;
          continue;
        }
        const key = "\uE400" + parked.length + "\uE401";
        parked.push(out.slice(idx, end + 1));
        res += out.slice(i, idx) + key;
        i = end + 1;
      }
      out = res;
    });
    return { out, parked };
  }

  function unparkReactionArrows(s, parked) {
    return String(s || "").replace(/\uE400(\d+)\uE401/g, (_, i) => parked[+i] || "");
  }

  function latexMatchArrayToHtml(s) {
    let out = rewriteReactionArrowArrays(String(s || ""));
    const parkedArrows = parkReactionArrows(out);
    out = parkedArrows.out;

    /** Cell text for HTML tables: keep simple fractions as KaTeX $…$ */
    const cellToHtml = (t) => {
      let x = String(t || "").replace(/\\hline/g, "").trim();
      if (!x) return "&nbsp;";
      // Pure display math for dfrac/frac/mathrm
      if (/\\(d?frac|mathrm|mathbf|text|sqrt|left|right)/.test(x) || /[_^]/.test(x)) {
        x = x
          .replace(/\\dfrac\s*/g, "\\dfrac")
          .replace(/\\frac\s*/g, "\\frac")
          .replace(/\\mathrm\s*/g, "\\mathrm");
        // Ensure balanced for KaTeX
        return "$" + x.replace(/^\$+/, "").replace(/\$+$/, "") + "$";
      }
      let plain = x
        .replace(/\\mathrm\s*\{([^{}]*)\}/g, "$1")
        .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
        .replace(/\\mathbf\s*\{([^{}]*)\}/g, "$1")
        .replace(/\\ce\s*\{([^{}]*)\}/g, "$1")
        .replace(/\\left|\\right/g, "")
        .replace(/\\,/g, " ")
        .replace(/~/g, " ");
      plain = plain.replace(/_\{(\d+)\}/g, "<sub>$1</sub>").replace(/\^\{([^}]*)\}/g, "<sup>$1</sup>");
      plain = plain.replace(/_(\d+)/g, "<sub>$1</sub>").replace(/\^(-?\d+)/g, "<sup>$1</sup>");
      plain = plain.replace(/\\([_^])/g, "$1").replace(/[{}]/g, "");
      plain = plain.replace(/\s+/g, " ").trim();
      return plain || "&nbsp;";
    };

    const convertBody = (body, force, spec) => {
      let b = stripLatexRowSkips(String(body || ""))
        .replace(/\\hline/g, " ")
        // normalize row breaks
        .replace(/\\\\+/g, "\\\\");
      const rows = b.split(/\\\\/).map((r) => r.trim()).filter((r) => r && !/^&+$/.test(r));
      const parsed = rows.map((row) => row.split("&").map((c) => {
        const t = String(c || "").trim();
        if (/^\[\s*[\d.]+\s*(?:pt|em|ex|mm|cm)?\s*\]$/i.test(t)) return "";
        return t;
      }));
      if (parsed.length < 1) return null;
      const maxCols = Math.max(...parsed.map((r) => r.length), 1);
      // Probability / multi-col data tables (3+ cols) OR List match
      const isDataTable = maxCols >= 3 || parsed.some((r) => r.length >= 3);
      const isListMatch = /List[\s\-]*[IVX]*|\\mathrm\s*\{[A-D]\}|[A-D]\.\s|&\s*[IVX]+\./.test(body)
        || /list[\s\-]*[ivx]+/i.test(body);
      const specClean = String(spec || "").replace(/[| ]/g, "");
      const specMatrix = /^[clr]{1,6}$/i.test(specClean);
      // Matrices (cc/ll/ccc) stay KaTeX — do not dump HTML inside \left[ ] (ss943)
      if (!isListMatch && specMatrix && !/List[\s\-]*I|\\text\s*\{\s*Given/i.test(body)) return null;
      const looksMatrix = !isListMatch && maxCols <= 2 && !/List|Given/i.test(body);
      if (looksMatrix) return null;
      if (!force && !isDataTable && !isListMatch && parsed.length < 2) return null;

      const isGivenBox = /\\text\s*\{\s*Given/i.test(body) || /^\s*Given\s*:/i.test((parsed[0] || []).join(" "));
      if (isGivenBox) {
        let html = `<div class="qx-given-box"><div class="qx-given-h">Given</div><ul class="qx-given-list">`;
        parsed.forEach((cells) => {
          const val = cells.filter((c) => c && !/^\s*(?:\\text\s*\{\s*)?Given/i.test(c)).join(" ").trim();
          if (val) html += `<li>${cellToHtml(val)}</li>`;
        });
        html += `</ul></div>`;
        return html;
      }

      // List-I/II 4-col (A. | XeO3 | I. | BrF5) → 2 visible columns (ss936 hid col 3–4)
      if (isListMatch && maxCols >= 3) {
        let html = `<table class="qx-match-list qx-match-array">`;
        parsed.forEach((cells, ri) => {
          let left = "", right = "";
          if (cells.length >= 4) {
            left = [cells[0], cells[1]].filter(Boolean).join(" ").trim();
            right = [cells[2], cells[3]].filter(Boolean).join(" ").trim();
          } else if (cells.length === 3) {
            left = [cells[0], cells[1]].filter(Boolean).join(" ").trim();
            right = cells[2] || "";
          } else {
            left = cells[0] || "";
            right = cells[1] || "";
          }
          if (!left && !right) return;
          const th = ri === 0 && /list/i.test(cells.join(" "));
          const tag = th ? "th" : "td";
          const st = "border:1px solid #cbd5e1;padding:10px 14px;vertical-align:middle";
          html += `<tr><${tag} style="${st};width:50%">${cellToHtml(left)}</${tag}><${tag} style="${st};width:50%">${cellToHtml(right)}</${tag}></tr>`;
        });
        html += `</table>`;
        return html;
      }

      // Wide probability table: full HTML with KaTeX cells
      if (isDataTable && maxCols >= 3) {
        let html = `<div class="qx-math-table-wrap" style="overflow-x:auto;max-width:100%;margin:12px 0">`;
        html += `<table class="qx-math-array-table" style="border-collapse:collapse;margin:0 auto;background:#fff">`;
        parsed.forEach((cells, ri) => {
          html += "<tr>";
          for (let ci = 0; ci < maxCols; ci++) {
            const tag = ri === 0 ? "th" : "td";
            const st = "border:1px solid #94a3b8;padding:8px 10px;text-align:center;vertical-align:middle;white-space:nowrap;font-size:14px";
            const bg = ri === 0 ? ";background:#f1f5f9;font-weight:700" : (ri % 2 ? ";background:#f8fafc" : "");
            html += `<${tag} style="${st}${bg}">${cellToHtml(cells[ci] || "")}</${tag}>`;
          }
          html += "</tr>";
        });
        html += `</table></div>`;
        return html;
      }

      // 2-col List-I/II style
      let html = `<table class="qx-match-list qx-match-array" style="width:100%;max-width:560px;border-collapse:collapse;margin:12px 0">`;
      parsed.forEach((cells, ri) => {
        let left = "", right = "";
        if (cells.length >= 4) {
          left = [cells[0], cells[1]].filter(Boolean).join(" ").trim();
          right = [cells[2], cells[3]].filter(Boolean).join(" ").trim();
        } else if (cells.length === 2) {
          left = cells[0];
          right = cells[1];
        } else {
          left = cells.join(" ");
        }
        if (!left && !right) return;
        const th = ri === 0 && /list/i.test(cells.join(" "));
        const tag = th ? "th" : "td";
        const st = "border:1px solid #cbd5e1;padding:10px 12px;vertical-align:top;width:50%";
        html += `<tr><${tag} style="${st}">${cellToHtml(left)}</${tag}><${tag} style="${st}">${cellToHtml(right)}</${tag}></tr>`;
      });
      html += `</table>`;
      return html;
    };

    // \( \begin{array}{...} ... \end{array} \)
    out = out.replace(
      /\\\(\s*\\begin\{array\}(?:\{([^}]*)\})?([\s\S]*?)\\end\{array\}\s*\\\)/g,
      (m, spec, body) => convertBody(body, false, spec) || m
    );
    // \[ ... \]
    out = out.replace(
      /\\\[\s*\\begin\{array\}(?:\{([^}]*)\})?([\s\S]*?)\\end\{array\}\s*\\\]/g,
      (m, spec, body) => convertBody(body, false, spec) || m
    );
    // $ \begin{array} ... \end{array} $
    out = out.replace(
      /\$\s*\\begin\{array\}(?:\{([^}]*)\})?([\s\S]*?)\\end\{array\}\s*\$/g,
      (m, spec, body) => convertBody(body, false, spec) || m
    );
    // Bare \begin{array} — List-I/II only (never cc/ll/ccc matrices; never inside \left)
    out = out.replace(
      /\\begin\{array\}(?:\{([^}]*)\})?([\s\S]*?)\\end\{array\}/g,
      (m, spec, body, offset, full) => {
        const before = full.slice(Math.max(0, offset - 48), offset);
        if (/\\left\s*(?:\\[{}()[\].|]|[()\[\]{}.|])?\s*$/.test(before)) return m;
        // Already inside an open $…$ math island that started with matrix delimiters
        if (/\\left\s*\[\s*$/.test(before) || /\\left\s*$/.test(before)) return m;
        return convertBody(body, false, spec) || m;
      }
    );
    // Residual broken display: List-II\A. / \B. / \I.
    out = out.replace(/\\([A-D])\./g, " $1.");
    out = out.replace(/\\([IVX]+)\./g, " $1.");
    // Safety: if raw \hline still visible outside math, strip (already converted tables)
    out = out.replace(/\\hline/g, "");
    out = unparkReactionArrows(out, parkedArrows.parked);
    return out;
  }

  /**
   * Repair damaged LaTeX from Marks export / strip mistakes before MathJax.
   * Fixes: $(textb{S})$, bare left(...)/right, 1/3[left(...)right], missing \ on commands.
   */
  /**
   * MathJax fails with "Unknown node type "span"" when HTML <span> is inside
   * $…$ / MathML. Strip HTML tags from math islands + clean MathML spans.
   */
  function sanitizeHtmlInMath(s) {
    let out = String(s || "");
    // Remove span/div/font etc inside $…$ / $$…$$ / \(…\) / \[…\]
    const stripTags = (inner) => String(inner || "")
      .replace(/<br\s*\/?>/gi, " \\\\ ")
      .replace(/<\/?(?:span|div|font|p|b|i|em|strong|u|mark|small|label)\b[^>]*>/gi, "")
      .replace(/&nbsp;/gi, " ");
    out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => "$$" + stripTags(inner) + "$$");
    out = out.replace(/\$([^$]+?)\$/g, (_, inner) => {
      if (/\\begin|\\frac|\\sqrt|\\pi|\\le|\\ge|\\neq|\\arg|\\mathrm|\\text|\\left|\\right/.test(inner)
        || /[\\^_{}]/.test(inner) || /<br\s*\/?>/i.test(inner)) {
        return "$" + stripTags(inner) + "$";
      }
      // short math still strip tags
      if (/</.test(inner)) return "$" + stripTags(inner) + "$";
      return "$" + inner + "$";
    });
    out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner) => "\\(" + stripTags(inner) + "\\)");
    out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => "\\[" + stripTags(inner) + "\\]");
    // MathML: drop illegal HTML children that break MathJax MML parser
    out = out.replace(/<math\b([^>]*)>([\s\S]*?)<\/math>/gi, (_, attrs, body) => {
      let b = String(body || "")
        .replace(/<\/?span\b[^>]*>/gi, "")
        .replace(/<\/?div\b[^>]*>/gi, "")
        .replace(/<\/?font\b[^>]*>/gi, "")
        .replace(/<\/?p\b[^>]*>/gi, "");
      return "<math" + attrs + ">" + b + "</math>";
    });
    // Unwrap <span>…</span> that only wraps TeX/math (MathJax treats span as unknown MML node)
    out = out.replace(/<span\b[^>]*>([\s\S]*?)<\/span>/gi, (m, inner) => {
      const t = String(inner || "").trim();
      if (!t) return "";
      // Nested HTML other than br/sub/sup — keep outer (structure options)
      if (/<(?!\/?(?:br|sub|sup|i|b|em|strong)\b)[a-z]/i.test(t)) return m;
      // Pure math / latex / greek → unwrap so KaTeX sees $…$ not span
      if (/\\[a-zA-Z]|[πθαβγδεζηλμξρστφχω∞≤≥≠×÷±∈∀∃√∫∑∏∂∇]|[\^_{}$]/.test(t)) {
        return t;
      }
      // Short symbol-only math tokens (Arg already outside)
      if (/^\\?[a-zA-Z]{1,6}$/.test(t) && /\\/.test(t)) return t;
      return m;
    });
    // Recover a prior glue bug: \left → \le + ft (empty boxes + leftover ≤)
    out = out.replace(/\\le\s*ft\b/g, "\\left");
    out = out.replace(/\\ri\s*ght\b/g, "\\right");
    // Glued TeX + English only (\pithen → \pi then). Never split \left / \right / \leq.
    out = out.replace(
      /\\(pi|theta|alpha|beta|gamma|delta|infty|leq|geq|neq|leqslant|geqslant|cdot|times|pm|arg|sin|cos|tan|log|ln|int|sum|prod)(then|the|and|when|which|with|where|that|this|than|thus|therefore|of|is|as|to|for)\b/gi,
      "\\$1 $2"
    );
    try { out = unglueTexFromWords(out); } catch (_) { /* */ }
    // Visible MathJax error text leaked into content (re-render of broken nodes)
    out = out.replace(/Unknown node type\s*["']?span["']?/gi, "");
    out = out.replace(/Unknown node type\s*["']?[a-z]+["']?/gi, "");
    out = out.replace(/Math input error/gi, "");
    return out;
  }

  /**
   * $x$-axis / $n$-th must stay paired. A later "letter + $" spacer + "$-word"
   * en-dash rule was opening the $ and shredding every following island
   * (ss933: $$\mathrm{A}$$, $\gt$, raw \cos \alpha).
   */
  function parkAxisHyphenMath(s) {
    const AXIS = "(?:axis|axes|coordinate|intercept|intercepts|th|direction|component|bound|interval)s?";
    const VAR = "(?:\\\\mathrm\\s*\\{[A-Za-z]\\}|[A-Za-z])";
    return String(s || "")
      // Already paired: $x$-axis / $\mathrm{x}$-axis
      .replace(
        new RegExp("\\$(" + VAR + ")\\$-(?=" + AXIS + "\\b)", "gi"),
        "\uE410$1\uE411"
      )
      // Closed island $x-axis$ / $\mathrm{x}-axis$
      .replace(
        new RegExp("\\$(" + VAR + ")\\s*[–—−-]\\s*(" + AXIS + ")\\$", "gi"),
        "\uE410$1\uE411$2"
      )
      // Unclosed $x–axis / $\mathrm{y}-$ axis
      .replace(
        new RegExp("\\$(" + VAR + ")\\s*[–—−-]\\s*(" + AXIS + ")\\b", "gi"),
        "\uE410$1\uE411$2"
      );
  }
  function restoreAxisHyphenMath(s) {
    return String(s || "").replace(/\uE410((?:\\mathrm\s*\{[A-Za-z]\}|[A-Za-z]))\uE411/g, "$$$1$-");
  }
  function spaceGluedDollars(s) {
    let out = parkAxisHyphenMath(s);
    out = out.replace(/([A-Za-z]{2,})\$(?=[(\\[A-Za-z])/g, "$1 $");
    out = out.replace(/\$([^$]+)\$([A-Za-z])/g, "$$$1$ $2");
    // Official Marks export: $(3î+2ĵ-k)$$\mathrm{m}$  and  $E=$$\mathrm{m}_{e}c^{2}$
    out = out.replace(/\$([^$\n]{0,160})\$\$(\\mathrm\{)/g, "$$$1 $2");
    return restoreAxisHyphenMath(out);
  }
  function stripLatexPtJunk(s) {
    return String(s || "")
      .replace(/<t[dh][^>]*>\s*\[\s*[\d.]+\s*pt\s*\]\s*<\/t[dh]>/gi, "")
      .replace(/(?:^|>|\s)\[\s*[\d.]+\s*pt\s*\](?=\s|<|$)/gi, " ")
      .replace(/\[\s*[\d.]+\s*pt\s*\]/gi, "")
      .replace(/\bm\s+L\b/g, "mL")
      .replace(/\bm\s+V\b(?=\s*[,.)]|\s*$)/g, "mV");
  }
  function professionalizeSgnPiecewise(s) {
    let out = String(s || "");
    out = out.replace(/\\operatorname\s*\{\s*Sgn\s*\}/g, "\\operatorname{sgn}");
    out = out.replace(/\\text\s*\{\s*Sgn\s*\}/g, "\\operatorname{sgn}");
    out = out.replace(/\bSgn\s*\(\s*(sin|cos|tan|cot|sec|csc)\s*([A-Za-z])\s*\)/gi,
      (_, fn, v) => "\\operatorname{sgn}(\\" + String(fn).toLowerCase() + " " + v + ")");
    out = out.replace(/\bSgn\s*\(/g, "\\operatorname{sgn}(");
    // Flattened Marks piecewise: Sgn(t)={1, if t>0; -1, if t<0}
    out = out.replace(
      /(?:\\operatorname\{sgn\}|Sgn)\s*\(\s*([^)]{1,12})\s*\)\s*=\s*\{?\s*([+\-]?\d+)\s*,\s*(?:\\text\{)?\s*if\s*\}?\s*([^,;\\{}]{1,24})\s*[,;\\]+\s*([+\-]?\d+)\s*,\s*(?:\\text\{)?\s*if\s*\}?\s*([^}{]{1,24})\}?/gi,
      (_, v, a, c1, b, c2) =>
        "$$\\operatorname{sgn}(" + String(v).trim() + ")=\\begin{cases}" + a +
        " & \\text{if }" + String(c1).trim() + " \\\\ " + b +
        " & \\text{if }" + String(c2).trim() + "\\end{cases}$$"
    );
    return out;
  }

  /** Convert $...$ / $$...$$ / \(...\) islands to KaTeX HTML (works inside HTML stems). */
  function katexRenderIslands(s) {
    const src = String(s || "");
    if (/class\s*=\s*["'][^"']*katex/.test(src)) {
      const leftover = src.replace(/<[^>]+>/g, " ");
      if (!/\$[^$]{1,400}\$/.test(leftover) && !/\\\(|\\\[/.test(leftover)) return src;
    }
    if (!window.katex || !window.katex.renderToString) return src;
    const parked = [];
    const brToTex = (inner) => String(inner || "")
      .replace(/<br\s*\/?>/gi, " \\\\ ")
      .replace(/&nbsp;/gi, " ");
    let out = String(s || "").replace(/\\\$/g, "$");
    // Screenshot 944: HTML <br> inside $ \begin{aligned} $ must become TeX \\ before tags are parked
    out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => "$$" + brToTex(tex) + "$$");
    out = out.replace(/\$([^$]{1,8000})\$/g, (all, tex) => {
      if (/^\s*\d/.test(tex) && !/[\\^_{}<]/.test(tex)) return all;
      if (!/<br\s*\/?>/i.test(tex) && !/\\begin/.test(tex) && !/</.test(tex)) return all;
      return "$" + brToTex(tex) + "$";
    });
    // List-I/II: $\begin{array}...\end{array}<br>  missing closer
    {
      let n = 0;
      for (let i = 0; i < out.length; i++) {
        if (out[i] === "$" && (i === 0 || out[i - 1] !== "\\")) n++;
      }
      if (n % 2 === 1 && /\\end\{array\}(?!\$)/.test(out)) {
        const cand = out.replace(/(\\end\{array\})(?!\$)/, "$1$");
        let n2 = 0;
        for (let i = 0; i < cand.length; i++) {
          if (cand[i] === "$" && (i === 0 || cand[i - 1] !== "\\")) n2++;
        }
        if (n2 % 2 === 0) out = cand;
      }
    }
    out = out.replace(/<[^>]+>/g, (tag) => {
      const k = "\uE300" + parked.length + "\uE301";
      parked.push(tag);
      return k;
    });
    const paint = (tex, display) => {
      let t = String(tex || "").replace(/\uE300(\d+)\uE301/g, " ").trim();
      if (!t) return display ? "$$$$" : "$$";
      try {
        return window.katex.renderToString(t, Object.assign({ displayMode: !!display }, KATEX_OPTS));
      } catch (_) {
        return display ? ("$$" + t + "$$") : ("$" + t + "$");
      }
    };
    out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => paint(tex, true));
    out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_, tex) => paint(tex, true));
    out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_, tex) => paint(tex, false));
    out = out.replace(/\$([^$]{1,8000})\$/g, (all, tex) => {
      const t = String(tex || "");
      if (/^\s*\d/.test(t) && !/[\\^_{}]/.test(t)) return all;
      const display = /\\begin\{(?:aligned|align|array|cases|matrix|pmatrix|bmatrix)/.test(t);
      return paint(t, display);
    });
    out = out.replace(/\uE300(\d+)\uE301/g, (_, i) => parked[+i] || "");
    return repairSpacedKatexTags(out);
  }

  function repairSpacedKatexTags(s) {
    return String(s || "")
      .replace(/<\s*spanclass\s*=\s*"\s*katex\s*-\s*display\s*"\s*>/gi, '<span class="katex-display">')
      .replace(/<\s*span\s+class\s*=\s*"\s*katex\s*-\s*display\s*"\s*>/gi, '<span class="katex-display">')
      .replace(/<\s*spanclass\s*=\s*"\s*katex\s*"\s*>/gi, '<span class="katex">')
      .replace(/class\s*=\s*"\s*katex\s*-\s*html\s*"/gi, 'class="katex-html"')
      .replace(/class\s*=\s*"\s*katex\s*-\s*display\s*"/gi, 'class="katex-display"');
  }

  /** Quizrr/Marks \\[4pt] row skips must not become a table cell. */
  function stripLatexRowSkips(s) {
    return String(s || "")
      .replace(/\\\\\s*\[\s*[\d.]+\s*(?:pt|em|ex|mm|cm|mu)?\s*\]/gi, "\\\\")
      .replace(/\\(?:vspace|hspace|smallskip|medskip|bigskip)\s*\{[^}]*\}/gi, "")
      .replace(/\\(?:vspace|hspace)\s*\[[^\]]*\]/gi, "");
  }

  /** \left\{ \begin{aligned} 1,& if t>0 \\ -1,& if t<0 \end{aligned}\right. → cases */
  function piecewiseAlignedToCases(s) {
    let out = String(s || "");
    out = out.replace(
      /\\left\s*\\\{\s*\\begin\{aligned\}([\s\S]*?)\\end\{aligned\}\s*\\right\.?/g,
      (_, body) => {
        const rows = String(body || "").split(/\\\\/).map((r) => r.trim()).filter(Boolean);
        if (!rows.length) return "\\begin{cases}" + body + "\\end{cases}";
        const lined = rows.map((r) => {
          let row = r.replace(/,\s*&/, " &").replace(/&amp;/g, "&");
          row = row.replace(/\\text\s*\{\s*(if|when|otherwise)/gi, "\\text{$1");
          return row;
        }).join(" \\\\ ");
        return "\\begin{cases}" + lined + "\\end{cases}";
      }
    );
    out = out.replace(
      /\\left\s*\\\{\s*\\begin\{array\}(?:\{[^}]*\})?([\s\S]*?)\\end\{array\}\s*\\right\.?/g,
      (_, body) => {
        if (!/\\\\/.test(body) || !/\\text\s*\{\s*if/i.test(body)) return "\\left\\{\\begin{array}{ll}" + body + "\\end{array}\\right.";
        const rows = String(body).split(/\\\\/).map((r) => r.trim()).filter(Boolean);
        return "\\begin{cases}" + rows.join(" \\\\ ") + "\\end{cases}";
      }
    );
    // Sgn / sgn professional operator name (never nest \operatorname)
    out = out.replace(/\\operatorname\s*\{\s*(?:\\operatorname\s*\{\s*)*Sgn(?:\s*\})*\s*\}/g, "\\operatorname{sgn}");
    out = out.replace(/\\operatorname\s*\{\s*(?:\\operatorname\s*\{\s*)*sgn(?:\s*\})*\s*\}/g, "\\operatorname{sgn}");
    out = out.replace(/\\text\s*\{\s*Sgn\s*\}/g, "\\operatorname{sgn}");
    return out;
  }

  /**
   * Re-pair dollars after older passes. Safe: never touch $$cases/matrix$$.
   */
  function healShatteredTex(s) {
    let out = restoreAxisHyphenMath(parkAxisHyphenMath(s));
    out = out.replace(/\\\$/g, "$");
    try { out = repairShatteredMathDollars(out); } catch (_) { /* */ }
    // $x–axis / $x-axis / $x-axis$ → $x$-axis (never leave a trailing $)
    out = out.replace(
      /\$((?:\\mathrm\s*\{[A-Za-z]\}|[A-Za-z]))\s*[–—−-]\s*(axis|axes|coordinate|intercept|th)s?\b\$?/gi,
      (_, v, w) => "$" + v + "$-" + w
    )
    // $$\mathrm{A}$$ / $$\cos \alpha$$ crumbs → inline
    out = out.replace(
      /\$\$\s*(\\mathrm\s*\{[A-Za-z0-9]+\}|\\operatorname\s*\{[^}]+\}|\\(?:cos|sin|tan|cot|sec|csc|ln|log|lim|alpha|beta|gamma|theta|pi|infty)\b(?:\s*[A-Za-z\\{][^$]{0,36})?|\\frac\s*\{[^{}]+\}\s*\{[^{}]+\}|[A-Za-z])\s*\$\$/g,
      (_, inner) => "$" + String(inner).replace(/\s+/g, " ").trim() + "$"
    );
    // $\mathrm{y}-$ axis / $y-$ axis → $\mathrm{y}$-axis
    out = out.replace(
      /\$((?:\\mathrm\s*\{[A-Za-z]\}|[A-Za-z]))\$-\s+(axis|axes|coordinate|intercept|th)s?\b/gi,
      (_, v, w) => "$" + v + "$-" + w
    );
    out = out.replace(
      /\$((?:\\mathrm\s*\{[A-Za-z]\}|[A-Za-z]))\s*-\s*\$\s+(axis|axes|coordinate|intercept|th)s?\b/gi,
      (_, v, w) => "$" + v + "$-" + w
    );
    // Join glued islands: $(vec)$$\mathrm{m}$  /  $E=$$\mathrm{m}_{e}c^{2}$
    out = out.replace(/\$([^$\n]{0,160})\$\$(\\mathrm\{)/g, "$$$1 $2");
    // $ \gt $ leftover comparison islands next to mathrm
    out = out.replace(/\$\s*(\\gt|\\lt|\\ge|\\le|\\neq|\\ne)\s*\$/g, " $1 ");
    // Join only tiny adjacent crumbs: $\mathrm{A}$ $\mathrm{a}$
    out = out.replace(
      /\$(\\mathrm\{[A-Za-z0-9]+\})\$\s*\$(\\mathrm\{[A-Za-z0-9]+\})\$/g,
      "$$$1 $2$$"
    );
    out = stripLatexPtJunk(out);
    try { out = professionalizeSgnPiecewise(out); } catch (_) { /* */ }
    out = out.replace(/\\operatorname(?:\s*\{\s*)+(?:\\operatorname\s*\{\s*)*sgn\s*\}+/g, "\\operatorname{sgn}");
    out = out.replace(/\$(\\operatorname\{sgn\})\$\s*\(\s*\$(\\mathrm\{[A-Za-z]\})\$\s*\)/g, "$$$1($2)$");
    out = out.replace(
      /\$(\\operatorname\{sgn\}\([^)]+\))\$\s*=\s*\$(\\begin\{cases\}[\s\S]*?\\end\{cases\})\$/g,
      "$$$$$1=$2$$$$"
    );
    // Keep piecewise as display math (textbook cases)
    out = out.replace(
      /(?!\$)\$([^$\n]*\\begin\{cases\}[\s\S]*?\\end\{cases\}[^$\n]*)\$(?!\$)/g,
      "$$$$$1$$$$"
    );
    out = out.replace(/\$\$\$+/g, "$$");
    return out;
  }

  /**
   * Join shattered math dollars that leave bare \\left / \\begin outside $…$
   * (nested $\\tan $\\left, split $A=$\\left[, tofu from ensureMathDelimiters).
   * Keep $-\\frac intact; peel organic-chain orphan dollars for readable chem.
   */
  function repairShatteredMathDollars(s) {
    let out = String(s || "");
    if (!out) return out;

    // Join incomplete island before \\left / \\begin
    out = out.replace(
      /\$([^$\n]{0,120}?)\$(?=\s*\\(?:left|begin)\b)/g,
      (m, inner) => {
        const trim = String(inner || "").replace(/\s+$/g, "");
        if (!trim) return m;
        if (/=\s*$|[+\u2212\-]\s*$/.test(trim)) return "$" + trim;
        if (/\\(?:tan|sin|cos|cot|sec|csc|log|ln|lim|frac|sqrt|mathrm|mathbf|text|operatorname)\s*$/.test(trim)) {
          return "$" + trim + " ";
        }
        if (/^(?:\\)?(?:tan|sin|cos|cot|sec|csc)\s*$/i.test(trim)) return "$" + trim + " ";
        if (/^[A-Za-z][A-Za-z0-9]*\([^)]{0,24}\)\s*=\s*$/.test(trim)) return "$" + trim;
        return m;
      }
    );

    out = out.replace(/\$\$+(?=\\(?:left|begin)\b)/g, "$");

    // Chem label: $A = $ CH_3… → $A =$ CH_3…
    out = out.replace(/\$([A-Z])\s*=\s*\$\s*(?=[A-Z])/g, "$$$1 =$ ");
    // Mid-chain orphan dollars between chem atoms only (never $3,4,5$-Name)
    out = out.replace(
      /((?:\\mathrm\s*\{[A-Z][A-Za-z0-9]*\}|CH|NH|OH|COOH|CHO|HO|Br|Cl)(?:_\{?\d+\}?)?)\s*\$\s*[-–—−]\s*(?:\$\s*)?(?=(?:\\mathrm\s*\{|CH|NH|OH|COOH|CHO|HO|Br|Cl)(?:_|\b|\{|\$))/g,
      "$1–"
    );
    out = out.replace(
      /((?:\\mathrm\s*\{[A-Z][A-Za-z0-9]*\}|CH|NH|OH|HO|Br|Cl)(?:_\{?\d+\}?)?)\s*\$\s*[-–—−]\s*(?=\s*(?:OH|NH_?2|COOH|CHO)\b)/g,
      "$1–"
    );
    // Double-bond shatter: CH_2 =$ CH → CH_2=CH (qxaudit1)
    // Do NOT match single-letter labels like $A =$ CH…
    out = out.replace(
      /((?:\\mathrm\s*\{[A-Z][A-Za-z0-9]*\}|CH|NH|OH|COOH|CHO)(?:_\{?\d+\}?)?)\s*=\s*\$\s*(?=(?:\\mathrm\s*\{|CH|NH|OH|COOH|CHO|HO)(?:_|\b|\{))/g,
      "$1="
    );
    // Spaced single bonds without $: CH - CH_2 → CH–CH_2
    // Lookahead must allow CH_2 (underscore is a word char, so avoid CH\b)
    out = out.replace(
      /\b((?:CH|NH|OH)(?:_\{?\d+\}?)?)\s+[-–—−]\s+(?=(?:CH|NH|OH|COOH|CHO)(?:_|\b|\{|\$))/g,
      "$1–"
    );
    // qxaudit2: peel leftover CH_n$ – CH_m / atom$–atom after first pass (multi-hop chains)
    for (let _i = 0; _i < 4; _i++) {
      const prev = out;
      out = out.replace(
        /\b((?:CH|NH|OH|COOH|CHO|HO)(?:_\{?\d+\}?)?)\s*\$\s*([-–—−=])\s*(?:\$\s*)?(?=(?:CH|NH|OH|COOH|CHO|HO|Br|Cl)(?:_|\b|\{|\$))/g,
        "$1$2"
      );
      out = out.replace(
        /\b((?:CH|NH|OH)(?:_\{?\d+\}?\^?[+\-–]?)?)\s*\$\s*(?=>)/g,
        "$1"
      );
      // Carbanion list shatter: CH_3^->$ CH_3$-CH_2^-
      out = out.replace(/\$\s*(?=>\s*\$?\s*\(?CH)/g, "");
      out = out.replace(/(CH(?:_\{?\d+\}?)?\^?[-–−]?)\s*\$\s*-\s*\$?\s*(?=CH)/g, "$1–");
      if (out === prev) break;
    }
    // Collapse same-segment chem labels (qxaudit2):

    // "$L =$ FORMULA$" → "$L = FORMULA$" (no backslash/newline in FORMULA)
    out = out.replace(/\$([A-Z])\s*=\$\s*([^$\\]+?)\$/g, function (m, lab, body) {
      const b = String(body || "").trim();
      if (!b) return m;
      if (!/(?:CH|NH|OH|HO|COOH|CHO|\\mathrm)/.test(b)) return m;
      return "$" + lab + " = " + b + "$";
    });
    // Label with formula until \\ or <br> and no closing $: "$L =$ FORMULA \\" → "$L = FORMULA$ \\"
    out = out.replace(/\$([A-Z])\s*=\$\s*((?:CH|NH|OH|HO|COOH|CHO|\\mathrm)[^$\\]*?)(?=\s*\\\\|\s*<br|\s*$)/g, function (m, lab, body) {
      const b = String(body || "").trim();
      if (!b) return m;
      return "$" + lab + " = " + b + "$";
    });

    
    // qxproof2: close $\mathrm{X}=$ ONLY before English prose words (Rydberg, Fire…).
    // Never before TeX (\\cmd), math idents f(x), or when a closing $ already exists
    // within the same line — prior qxqa1 rules shattered valid islands (E=\\sqrt, y=f(x)).
    out = out.replace(/\$(\\mathrm\{[A-Za-z0-9]+\}(?:_[^{}\s$]+)?)=\s*(?=[A-Z][a-z]{2,}(?:\s|[.,;:<]|$))/g, function (m, cmd, offset, full) {
      const after = full.slice(offset + m.length);
      if (/^\$/.test(after)) return m;
      // TeX or another math island closer soon → leave intact
      const untilNl = after.split(/\n|<br/i)[0] || after;
      if (/\\[a-zA-Z]/.test(untilNl)) return m;
      if (/^[^$\n]{1,400}\$/.test(untilNl)) return m;
      return "$" + cmd + "=$ ";
    });
    // En-dash after closed chem label before English: $\mathrm{X}–Word
    out = out.replace(/\$(\\mathrm\{[^}]+\}(?:_[^{}\s$]*)?)[–—](?=[A-Z][a-z]{2,})/g, function (m, cmd, offset, full) {
      const before = full.slice(0, offset);
      if ((before.match(/\$/g) || []).length % 2 === 1) return m;
      return "$" + cmd + "$ – ";
    });
    out = out.replace(/\$\$(\\mathrm\{[^}]+\})\$(?:\s*-\s*\$\s*|\s*-\s+)/g, "$$$1$ – ");


    // qxproof2: heal acid OCR — prefer preserving outer $…$ when present
    out = out.replace(/\$\s*(H_\{?\d\}?)\s*\$\s*((?:SO|PO|CO|NO)_\{?\d\}?)\s*\$/g, "$$$1$2$");
    out = out.replace(/(^|[^$])\b(H_\{?\d\}?)\s*\$\s*((?:SO|PO|CO|NO)_\{?\d\}?)\s*\$/g, "$1$2$3");
    // `$H_2SO_4 or $ H_3PO_4` residue → `$H_2SO_4$ or $H_3PO_4$`
    out = out.replace(/\$\s*(H_\{?\d\}?(?:SO|PO)_\{?\d\}?)\s+or\s*\$\s*(H_\{?\d\}?(?:SO|PO)_\{?\d\}?)\s*\$?/gi, "$$$1$ or $$$2$");
    // Double-bond option shatter: CH_2 =$ CH → CH_2=CH
    out = out.replace(/\b(CH_\{?\d\}?)\s*=\s*\$\s*(?=CH)/g, "$1=");
    out = out.replace(/\$\s*-\s*\$\s*(?=CH|NH|OH|HO)/g, "–");
    // Trailing orphan $ after chem fragment at cell/string end
    out = out.replace(/(^|[^A-Za-z0-9_])((?:CH|NH|OH|HO)(?:_\{?\d+\}?)?(?:\([^)]+\))?)\s*\$(?=<\/|[<\n]|$)/g, function (m, pre, chem, offset, full) {
      const before = full.slice(0, offset + String(pre || "").length);
      const n = (before.match(/\$/g) || []).length;
      if (n % 2 === 1) return m; // closes real math — keep
      return pre + chem;
    });
    // Shatter chain: HO $-$ C$H_2-$ CH_2-$ CH $=$ CH_2$ → HO–CH_2–CH_2–CH=CH_2
        out = out.replace(/HO\s*\$?\s*-\s*\$?\s*(?:C\s*\$?\s*)?H_2\s*\$?\s*-\s*\$?\s*CH_2\s*\$?\s*-\s*\$?\s*CH\s*\$?\s*=\s*\$?\s*CH_2\s*\$?/g, "HO–CH_2–CH_2–CH=CH_2");
    // Only peel C$H_2 (OCR split carbon) — never blanket $-$ which breaks signed math
    out = out.replace(/\bC\s*\$\s*H_(\d)/g, "CH_$1");

    // Close `$L = chem…` islands missing `$` before <br>/end (qxproof2)
    out = out.replace(/\$([A-Z])\s*=\s*((?:HO|CH|NH|OH)[^$\n<]{0,80}?)(?=\s*<br|\s*$)/g, (m, lab, body) => {
      const b = String(body || "").trim();
      if (!b || /\\/.test(b)) return m;
      return "$" + lab + " = " + b + "$";
    });

    // Carbanion stability order shatter → one balanced island (tokens already present)
    out = out.replace(
      /\$\\mathrm\{CH\}_3\^->\s*\$\s*CH_3\s*[–—−-]\s*CH_2\^?-\s*>\$?\s*\(\$?\s*CH_3\$?\s*\)_2\s*\$?\s*CH\$?\s*\^?-\s*>\$?\s*\(\$?\s*CH_3\$?\s*\)_3\s*\$?\s*C\$?\s*\^?-+\.?\$/g,
      "$\\mathrm{CH}_3^- > \\mathrm{CH}_3–CH_2^- > (\\mathrm{CH}_3)_2CH^- > (\\mathrm{CH}_3)_3C^-$"
    );

    return out;
  }


  function repairChemAndShatteredTex(s) {
    let out = String(s || "");
    if (!out) return out;

    // Broken arrow: "\right arrow" split from \rightarrow
    out = out.replace(/\\right\s+arrow\b/gi, "\\rightarrow");
    out = out.replace(/\\left\s+arrow\b/gi, "\\leftarrow");
    out = out.replace(/\\right\s*-\s*arrow\b/gi, "\\rightarrow");
    out = out.replace(/\\long\s*right\s*arrow\b/gi, "\\longrightarrow");
    out = out.replace(/\\to\s+arrow\b/gi, "\\rightarrow");

    // \{HNO\} _{3}  (BOTH braces escaped) → \mathrm{HNO}_{3}
    out = out.replace(/\\\{([A-Z][A-Za-z0-9]*)\\\}(\s*(_\{[0-9]+\}|_[0-9]|\^\{?[0-9]+\}?))?/g, function (_, name, sub) {
      return "\\mathrm{" + name + "}" + (sub || "");
    });
    // Single-escaped open only: \{HNO}_{3}
    out = out.replace(/\\\{([A-Z][A-Za-z0-9]*)\}(\s*(_\{[0-9]+\}|_[0-9]))?/g, function (_, name, sub) {
      return "\\mathrm{" + name + "}" + (sub || "");
    });

    // Bare {Cl}_{2} / {H}_{2} chem (capital start, short)
    out = out.replace(/(^|[^\\$A-Za-z])\{([A-Z][A-Za-z0-9]{0,8})\}(_\{[0-9]+\}|_[0-9])/g, "$1\\mathrm{$2}$3");

    // Normalize chem state spacing: \left( l \right) → \left(l\right)
    out = out.replace(/\\left\s*\(\s*([lgsaq]|aq|sol|liq)\s*\\right\s*\)/gi, "\\left($1\\right)");

    // ── Shattered-$ repair: CHEM REACTIONS ONLY ─────────────────────────
    // Prior broad rules stripped closing $ after \right), ate $ before \left,
    // and turned $-\frac{…}$ into " - \frac{…}$" — shattering JEE math stems
    // and making signed options look like duplicates (Q14 / Q22 PYQ).
    // Only peel mid-reaction orphan $ when more chem continues after \right.
    const looksChemReaction =
      /\\rightarrow|\\longrightarrow|\\ce\{/.test(out) ||
      (/\\mathrm\{[A-Z][A-Za-z0-9]*\}/.test(out) && /\\left\s*\(/.test(out) && /\\right\s*\)/.test(out));

    if (looksChemReaction) {
      // \right) $ \left( / \right) $ + / \right) $ \mathrm{…}  (mid-reaction shatter)
      out = out.replace(
        /(\\right\s*(?:\\[{}()[\].|]|[).\]|}]))\s*\$\s*(?=\s*(?:\\left|\\mathrm|[+\u2212=]|\\rightarrow|\\longrightarrow))/g,
        "$1 "
      );
      // chem atom $ \left(  e.g. \mathrm{HCl}$\left(aq\right)
      out = out.replace(
        /(\\mathrm\{[^}]+\})\s*\$\s*(?=\\left\b)/g,
        "$1 "
      );
      // operator $ \left  mid reaction — never $-fraction / $-digit
      out = out.replace(
        /([+\u2212=])\s*\$\s*(?=\\left\b|\\mathrm\{)/g,
        "$1 "
      );
      // $ + or $ = before chem (not $ - \frac / $ - 2)
      // NEVER peel when $ opens the island ($+\mathrm{O}_2…$) — only mid-shatter closers
      // qxproof2: only peel mid-reaction $ before chem/TeX — NEVER English prose (Final, Binding…)
      out = out.replace(
        /\$\s*([+\u2212=])\s*(?=\\(?:mathrm|left|ce|text)\b|(?:CH|NH|OH|COOH|CHO|Br|Cl|Fe|Cu|Ag|Na|H_?\d|O_?\d|N_?\d|C_?\d)\b)/g,
        (m, op, offset, full) => {
          const before = full.slice(0, offset);
          const n = (before.match(/\$/g) || []).length;
          if (n % 2 === 0) return m;
          return " " + op + " ";
        }
      );

      // If still has chem \left runs with no dollars, wrap a reasonable span
      if (/\\left\s*\(/.test(out) && /\\mathrm\{[A-Z]|\\rightarrow|_\{?[0-9]/.test(out)) {
        out = out.replace(/\$\$+/g, "$");
        if (!/\$/.test(out) || (out.match(/\$/g) || []).length % 2 !== 0) {
          const plain = out.replace(/\$/g, "");
          if (/\\left/.test(plain) && /\\rightarrow|\\mathrm\{/.test(plain)) {
            out = "$" + plain.trim() + "$";
          }
        }
      }
    }

    out = out.replace(/\\right\s+arrow\b/gi, "\\rightarrow");
    return out;
  }

  function repairBrokenLatex(s) {
    let out = parkAxisHyphenMath(String(s || ""));
    try { out = repairChemAndShatteredTex(out); } catch (_) { /* */ }
    try { out = repairShatteredMathDollars(out); } catch (_) { /* */ }
    try { out = sanitizeHtmlInMath(out); } catch (_) { /* */ }
    out = out.replace(/\\le\s*ft\b/g, "\\left").replace(/\\ri\s*ght\b/g, "\\right");
    out = out.replace(/\\left\s*\$\s*\(/g, "\\left(");
    out = out.replace(/\\right\s*\$\s*\)/g, "\\right)");
    out = out.replace(/\\left\s*\$\s*\[/g, "\\left[");
    out = out.replace(/\\right\s*\$\s*\]/g, "\\right]");
    out = out.replace(/\\text\s*\$\s*\{/g, "\\text{");
    out = out.replace(/\\mathrm\s*\$\s*\{/g, "\\mathrm{");
    out = out.replace(/\\textbf\s*\$\s*\{/g, "\\textbf{");
    out = out.replace(/&amp;/gi, "&").replace(/(^|[^&A-Za-z])amp;/gi, "$1&");
    try { out = repairLeftBracketMatrix(out); } catch (_) { /* */ }
    out = stripLatexRowSkips(out);
    try { out = piecewiseAlignedToCases(out); } catch (_) { /* */ }

    // Match List-I/II arrays FIRST (before \\ collapse breaks row separators)
    try { out = latexMatchArrayToHtml(out); } catch (_) { /* */ }

    // Marks/JSON double-escape: \\frac \\rightarrow → \frac \rightarrow
    // BUT never collapse TeX array row breaks "\\" when followed by space/letter label A. I.
    // Only collapse before known TeX command names
    out = out.replace(/\\{2,}(frac|dfrac|sqrt|mathrm|mathbf|text|textbf|left|right|begin|end|in|notin|subset|subseteq|cup|cap|emptyset|mathbb|times|leq|geq|neq|rightarrow|leftarrow|alpha|beta|gamma|delta|theta|pi|infty|cdot|pm|vec|hat|bar|sin|cos|tan|log|ln|sum|int|prod|partial|nabla|circ|angle|perp)\b/g, "\\$1");
    // "\ rightarrow" / "\  frac" spaced command after backslash
    out = out.replace(/\\\s+([a-zA-Z]+)/g, "\\$1");

    out = repairCurrencyAndPlainNumbers(out);

    // $(textb{S})$ / $(textbf{S})$ → $\textbf{S}$
    out = out.replace(/\$\(\s*\\?textb\s*\{([^}]*)\}\s*\)\$/gi, "$\\textbf{$1}$");
    out = out.replace(/\$\(\s*\\?textbf\s*\{([^}]*)\}\s*\)\$/gi, "$\\textbf{$1}$");
    out = out.replace(/\$\s*\\?textb\s*\{([^}]*)\}\s*\$/gi, "$\\textbf{$1}$");
    out = out.replace(/\$\s*\\?textbf\s*\{([^}]*)\}\s*\$/gi, "$\\textbf{$1}$");
    // bare textb{...} / textbf{...} / text{...} without backslash
    out = out.replace(/(^|[^\\$A-Za-z])textb\s*\{/gi, "$1\\textbf{");
    out = out.replace(/(^|[^\\$A-Za-z])textbf\s*\{/gi, "$1\\textbf{");
    // bare text{H} → \text{H} (not textbf/textit/textrm)
    out = out.replace(/(^|[^\\$A-Za-z])text(?!bf|it|rm|sf|tt|b)\s*\{/gi, "$1\\text{");

    // ── PCM: restore missing backslash on common TeX commands ─────────
    // rightarrow{\mathrm{p}} → \overrightarrow{\mathrm{p}}  (screenshot-style vectors)
    out = out.replace(/(^|[^\\a-zA-Z])overrightarrow\s*\{/g, "$1\\overrightarrow{");
    out = out.replace(/(^|[^\\a-zA-Z])overleftarrow\s*\{/g, "$1\\overleftarrow{");
    out = out.replace(/(^|[^\\a-zA-Z])overleftrightarrow\s*\{/g, "$1\\overleftrightarrow{");
    // bare "rightarrow{...}" is almost always a broken vector, not a relation arrow
    out = out.replace(/(^|[^\\a-zA-Z])rightarrow\s*\{/g, "$1\\overrightarrow{");
    out = out.replace(/(^|[^\\a-zA-Z])leftarrow\s*\{/g, "$1\\overleftarrow{");
    out = out.replace(/(^|[^\\a-zA-Z])vec\s*\{/g, "$1\\vec{");
    out = out.replace(/(^|[^\\a-zA-Z])hat\s*\{/g, "$1\\hat{");
    out = out.replace(/(^|[^\\a-zA-Z])bar\s*\{/g, "$1\\bar{");
    out = out.replace(/(^|[^\\a-zA-Z])dot\s*\{/g, "$1\\dot{");
    out = out.replace(/(^|[^\\a-zA-Z])ddot\s*\{/g, "$1\\ddot{");
    out = out.replace(/(^|[^\\a-zA-Z])tilde\s*\{/g, "$1\\tilde{");
    out = out.replace(/(^|[^\\a-zA-Z])overline\s*\{/g, "$1\\overline{");
    out = out.replace(/(^|[^\\a-zA-Z])underline\s*\{/g, "$1\\underline{");
    out = out.replace(/(^|[^\\a-zA-Z])mathbb\s*\{/g, "$1\\mathbb{");
    out = out.replace(/(^|[^\\a-zA-Z])mathcal\s*\{/g, "$1\\mathcal{");
    out = out.replace(/(^|[^\\a-zA-Z])operatorname\s*\{/g, "$1\\operatorname{");
    out = out.replace(/(^|[^\\a-zA-Z])dfrac\s*\{/g, "$1\\dfrac{");
    out = out.replace(/(^|[^\\a-zA-Z])tfrac\s*\{/g, "$1\\tfrac{");
    out = out.replace(/(^|[^\\a-zA-Z])binom\s*\{/g, "$1\\binom{");
    out = out.replace(/(^|[^\\a-zA-Z])partial\b/g, "$1\\partial");
    out = out.replace(/(^|[^\\a-zA-Z])infty\b/g, "$1\\infty");
    out = out.replace(/(^|[^\\a-zA-Z])cdot\b/g, "$1\\cdot");
    // times / pm only in math context — never English "how many times" / "9 pm"
    out = out.replace(/(\d)\s*times\s*(?=\d|[a-zA-Z\\(])/g, "$1\\times ");
    out = out.replace(/(^|[^\\a-zA-Z])times\s*(?=\d)/g, "$1\\times ");
    out = out.replace(/(\d)\s*pm\s*(?=\d)/g, "$1\\pm ");
    out = out.replace(/(^|[^\\a-zA-Z\d])pm\s*(?=\d)/g, "$1\\pm ");
    out = out.replace(/(^|[^\\a-zA-Z])mp\b(?=\s*\d)/g, "$1\\mp");
    out = out.replace(/(^|[^\\a-zA-Z])neq\b/g, "$1\\neq");
    out = out.replace(/(^|[^\\a-zA-Z])leq\b/g, "$1\\leq");
    out = out.replace(/(^|[^\\a-zA-Z])geq\b/g, "$1\\geq");
    out = out.replace(/(^|[^\\a-zA-Z])approx\b/g, "$1\\approx");
    out = out.replace(/(^|[^\\a-zA-Z])rightarrow\b(?!\s*\{)/g, "$1\\rightarrow");
    out = out.replace(/(^|[^\\a-zA-Z])leftarrow\b(?!\s*\{)/g, "$1\\leftarrow");
    out = out.replace(/(^|[^\\a-zA-Z])Rightarrow\b/g, "$1\\Rightarrow");
    out = out.replace(/(^|[^\\a-zA-Z])Leftarrow\b/g, "$1\\Leftarrow");
    // Greek (common PCM) — only when already near math markers (avoid English "meta", "a pi")
    out = replaceOutsideMathFn(out, (chunk) => {
      if (!/\\[a-zA-Z]|\$|[=<>≤≥≠≈±×÷∞∈∀∃^_{}]|\d\s*[+\-*/=]/.test(chunk)) return chunk;
      return chunk
        .replace(/(^|[^\\a-zA-Z])(alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega)\b/g, "$1\\$2")
        .replace(/(^|[^\\a-zA-Z])(Alpha|Beta|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)\b/g, "$1\\$2");
    });
    // unit vectors often written hat{i} without \
    out = out.replace(/(^|[^\\$a-zA-Z])hat\s*([ijkı])\b/g, "$1\\hat{$2}");
    // \vec a / \hat i bare letter form (space, no braces)
    out = out.replace(/(^|[^\\a-zA-Z])vec\s+([a-zA-Z])\b/g, "$1\\vec{$2}");
    out = out.replace(/(^|[^\\a-zA-Z])bar\s+([a-zA-Z])\b/g, "$1\\bar{$2}");
    // Sets / relations — missing backslash & blackboard bold (avoids KaTeX "Unknown"/undefined)
    out = out.replace(/(^|[^\\a-zA-Z])subseteq\b/g, "$1\\subseteq");
    out = out.replace(/(^|[^\\a-zA-Z])supseteq\b/g, "$1\\supseteq");
    out = out.replace(/(^|[^\\a-zA-Z])subset\b/g, "$1\\subset");
    out = out.replace(/(^|[^\\a-zA-Z])supset\b/g, "$1\\supset");
    out = out.replace(/(^|[^\\a-zA-Z])notin\b/g, "$1\\notin");
    out = out.replace(/(^|[^\\a-zA-Z])setminus\b/g, "$1\\setminus");
    // cup/cap only when clearly math: "A cup B" / "A cap B"
    out = out.replace(/([A-Za-z0-9\}])\s+cup\s+([A-Za-z0-9\\{])/g, "$1 \\cup $2");
    out = out.replace(/([A-Za-z0-9\}])\s+cap\s+([A-Za-z0-9\\{])/g, "$1 \\cap $2");
    out = out.replace(/(^|[^\\a-zA-Z])nmid\b/g, "$1\\nmid");
    out = out.replace(/(^|[^\\a-zA-Z])mathbb\s*\{/g, "$1\\mathbb{");
    out = out.replace(/(^|[^\\a-zA-Z])mathcal\s*\{/g, "$1\\mathcal{");
    // Number sets after membership/subset: \in N → \in \mathbb{N} (not set variable C/A/B)
    out = out.replace(/(\\in|\\notin|\\subset|\\subseteq|\\supset|\\supseteq)\s*([NZQR])\b/g, "$1 \\mathbb{$2}");
    out = out.replace(/\\mathbb\{([NZQR])\}\s*\\times\s*([NZQR])\b/g, "\\mathbb{$1}\\times\\mathbb{$2}");
    // set membership: "x in N" / "x in R" (not English "in the")
    out = out.replace(/(^|[^\\a-zA-Z])([A-Za-z])\s+in\s+([NZQR])\b/g, "$1$2 \\in \\mathbb{$3}");
    out = out.replace(/(^|[^\\a-zA-Z])emptyset\b/g, "$1\\emptyset");
    out = out.replace(/(^|[^\\a-zA-Z])varnothing\b/g, "$1\\varnothing");
    out = out.replace(/(^|[^\\a-zA-Z])forall\b/g, "$1\\forall");
    // Never turn English "exists" into ∃ (ss928: "field B exists" → "B∃")
    out = out.replace(/\$([^$]*)\bexists\b([^$]*)\$/g, (_, a, b) => "$" + a + "\\exists" + b + "$");
    out = out.replace(/(^|[^\\a-zA-Z])nabla\b/g, "$1\\nabla");
    out = out.replace(/(^|[^\\a-zA-Z])perp\b/g, "$1\\perp");
    out = out.replace(/(^|[^\\a-zA-Z])parallel\b/g, "$1\\parallel");
    // geometry angle token (not English "angle of incidence" mid-sentence alone)
    out = out.replace(/(^|[^\\a-zA-Z])angle\s+([A-Z]{1,4})\b/g, "$1\\angle $2");
    out = out.replace(/(^|[^\\a-zA-Z])oplus\b/g, "$1\\oplus");
    out = out.replace(/(^|[^\\a-zA-Z])otimes\b/g, "$1\\otimes");
    // Relation symbols often bare
    out = out.replace(/(^|[^\\a-zA-Z])leqslant\b/g, "$1\\leqslant");
    out = out.replace(/(^|[^\\a-zA-Z])geqslant\b/g, "$1\\geqslant");
    out = out.replace(/(^|[^\\a-zA-Z])neq\b/g, "$1\\neq");
    out = out.replace(/(^|[^\\a-zA-Z])equiv\b/g, "$1\\equiv");
    // Fix double-escaped commands that still look raw: \\\\in → \in
    out = out.replace(/\\{2,}(in|notin|subset|subseteq|cup|cap|emptyset|mathbb|times|leq|geq|neq)\b/g, "\\$1");
    // Chemistry / physics: \ce often stripped
    out = out.replace(/(^|[^\\a-zA-Z])ce\s*\{/g, "$1\\ce{");
    // \mathrm{p} style vectors already handled; also p̂ unicode
    out = out.replace(/([a-zA-Z])̂/g, "\\hat{$1}");
    out = out.replace(/([a-zA-Z])⃗/g, "\\vec{$1}");
    out = out.replace(/([a-zA-Z])̄/g, "\\bar{$1}");

    // Restore missing backslash on common TeX delimiters (left( → \left()
    out = out.replace(/(^|[^\\a-zA-Z])left\s*\(/g, "$1\\left(");
    out = out.replace(/(^|[^\\a-zA-Z])right\s*\)/g, "$1\\right)");
    out = out.replace(/(^|[^\\a-zA-Z])left\s*\[/g, "$1\\left[");
    out = out.replace(/(^|[^\\a-zA-Z])right\s*\]/g, "$1\\right]");
    out = out.replace(/(^|[^\\a-zA-Z])left\s*\{/g, "$1\\left\\{");
    out = out.replace(/(^|[^\\a-zA-Z])right\s*\}/g, "$1\\right\\}");
    out = out.replace(/(^|[^\\a-zA-Z])left\s*\|/g, "$1\\left|");
    out = out.replace(/(^|[^\\a-zA-Z])right\s*\|/g, "$1\\right|");
    out = out.replace(/(^|[^\\a-zA-Z])left\s*\\\{/g, "$1\\left\\{");
    out = out.replace(/(^|[^\\a-zA-Z])right\s*\\\}/g, "$1\\right\\}");

    // 1/3[left(... )right] or 1/3\left(...\right] → \frac{1}{3}\left(...\right)
    out = out.replace(
      /(\d+)\s*\/\s*(\d+)\s*\[\s*\\left\s*\(([\s\S]*?)\\right\s*\)\s*\]/g,
      "\\frac{$1}{$2}\\left($3\\right)"
    );
    out = out.replace(
      /(\d+)\s*\/\s*(\d+)\s*\\left\s*\(([\s\S]*?)\\right\s*\)/g,
      "\\frac{$1}{$2}\\left($3\\right)"
    );

    // frac without backslash: frac{1}{3}
    out = out.replace(/(^|[^\\a-zA-Z])frac\s*\{/g, "$1\\frac{");
    out = out.replace(/(^|[^\\a-zA-Z])sqrt\s*\{/g, "$1\\sqrt{");
    out = out.replace(/(^|[^\\a-zA-Z])sqrt\s*\[/g, "$1\\sqrt[");
    out = out.replace(/(^|[^\\a-zA-Z])mathrm\s*\{/g, "$1\\mathrm{");
    out = out.replace(/(^|[^\\a-zA-Z])mathbf\s*\{/g, "$1\\mathbf{");
    out = out.replace(/(^|[^\\a-zA-Z])mathsf\s*\{/g, "$1\\mathsf{");
    out = out.replace(/(^|[^\\a-zA-Z])textrm\s*\{/g, "$1\\textrm{");

    // √2 bare radical near math → \sqrt{2} when digit follows
    out = out.replace(/√\s*\{?\s*(\d+)\s*\}?/g, "\\sqrt{$1}");
    out = out.replace(/√\s*([A-Za-z])/g, "\\sqrt{$1}");

    // Broken: C-$ (mathrm(O)  /  $(mathrm(O)  → proper \mathrm{O}
    out = out.replace(/\$\s*\(\s*mathrm\s*\(\s*([A-Za-z0-9]+)\s*\)/gi, "$\\mathrm{$1}");
    out = out.replace(/\$\s*mathrm\s*\(\s*([A-Za-z0-9]+)\s*\)/gi, "$\\mathrm{$1}");
    out = out.replace(/(^|[^\\])mathrm\s*\{\s*([^}]*)\s*\}/g, "$1\\mathrm{$2}");
    out = out.replace(/(^|[^\\])mathrm\s*\(\s*([^)]*)\s*\)/g, "$1\\mathrm{$2}");

    // Lone "letter-$" en-dash (prose only). NEVER eat closing $ of $-C\\equiv C-$ / signed math.
    out = out.replace(/([A-Za-z])-\$\s*(?=[\s,.;)]|$)/g, (m, letter, offset, full) => {
      const before = full.slice(0, offset);
      const n = (before.match(/\$/g) || []).length;
      // Odd count ⇒ this $ closes real math (…C-$ / …x-$) — keep delimiter
      if (n % 2 === 1) return m;
      return letter + "–";
    });
    out = out.replace(/(^|[^A-Za-z$\\\uE410-\uE411])\$\s+-\s+([A-Za-z]{3,})\b/g, (m, pre, word, offset, full) => {
      const before = full.slice(0, offset + String(pre || "").length);
      const n = (before.match(/\$/g) || []).length;
      // Odd count ⇒ this $ closes real math ($3,4,5$-Tribromo / $\mathrm{x}$-axis)
      if (n % 2 === 1) return m;
      // Signed math opener: $-x...$ / $-\frac — keep dollars
      const after = full.slice(offset + m.length - String(word).length);
      if (/^(?:\\|[a-zA-Z]\s*[+\-–=^_({]|[a-zA-Z]\d)/.test(word + after)) return m;
      return pre + "–" + word;
    });

    // Angle / degree: 108.9° already unicode; O-C-H style
    // Keep as single math token: 60^{\circ} not 60^$\circ$
    out = out.replace(/\b(\d+(?:\.\d+)?)\s*deg\b/gi, "$$$1^{\\circ}$");
    out = out.replace(/\b(\d+(?:\.\d+)?)\s*\\circ\b/g, "$$$1^{\\circ}$");
    out = out.replace(/\b(\d+(?:\.\d+)?)\\circ\b/g, "$$$1^{\\circ}$");
    // Physics thin-space units: 9.8 m/s^2 already fine; fix ~ in broken \mathrm{~g}
    out = out.replace(/\\mathrm\{\s*~+\s*([A-Za-zµμ°]+)/g, "\\mathrm{\\,$1");

    // English OCR / export junk (PCM stems)
    out = out.replace(/\bie\s*,/gi, "i.e.,");
    out = out.replace(/\beg\s*,/gi, "e.g.,");
    out = out.replace(/\bw\.r\.t\b/gi, "w.r.t.");
    out = out.replace(/\bviz\s*\./gi, "viz.");

    // Collapse accidental $$$$ and empty $$
    out = out.replace(/\$\$+/g, "$$");
    out = out.replace(/\$\s*\$/g, " ");

    // qxproof1: empty MathML fence leftovers / unit parentheticals
    out = out.replace(/\$\\left\(\s*\\right\)\$/g, "");
    out = out.replace(/\\left\(\s*\\right\)/g, "");
    // Allotrope / state OCR dollars: (diamond $) · ($ diamond $) · (graphite $)
    // Keep $C$ / $\quad C$ islands intact — only strip the orphan $ glued to the word.
    out = out.replace(/\(\s*\$\s*(diamond|graphite|gas|liquid|solid|aq)\s*\$\s*\)/gi, "($1)");
    out = out.replace(/\(\s*(diamond|graphite|gas|liquid|solid|aq)\s*\$\s*\)/gi, "($1)");
    out = out.replace(/\(\s*\$\s*(diamond|graphite)\s*\)/gi, "($1)");
    // Heal chem triple-bond shatter: -$ C\\equiv C$– → -C\\equiv C-$
    out = out.replace(/-\$\s*C\\equiv\s*C\$\s*[–—−-]/g, "-C\\equiv C-$");
    out = out.replace(/\$\s*-\s*\$\s*C\\equiv\s*C\$\s*[–—−-]/g, "$-C\\equiv C-$");

    try { out = restoreAxisHyphenMath(out); } catch (_) { /* */ }
    return out;
  }

  /**
   * Chemistry subscripts (Marks Word style) → HTML <sub>, without breaking real math.
   */
  function fixChemNotation(s) {
    let out = String(s || "");

    // CH$_3$_- → prepare then convert to HTML sub
    out = out.replace(/\$\_(\d+)\$\_(?=[-–—=.+\s)<\]},;])/g, "$_$1$");
    out = out.replace(/\$\_(\d+)\$\_/g, "$_$1$");
    out = out.replace(/\$_(\d+)\$_(?=[-–—=.+\s)<\]},;])/g, "$_$1$");
    out = out.replace(/\$_(\d+)\$_/g, "$_$1$");
    out = out.replace(/(\$_\d+\$)\_(\d)(?=[\s,;.)<\]]|$)/g, "$1");
    out = out.replace(/(\$_\d+\$)(\d)(?=[\s,;.)<\]]|$)/g, "$1");

    // Marks partial-math subscripts → HTML (only the $_n$ form, not full $expr$)
    out = out.replace(/([A-Za-z\)\]])\$\_(\d+)\$/g, "$1<sub>$2</sub>");
    out = out.replace(/([A-Za-z\)\]])\$_(\d+)\$/g, "$1<sub>$2</sub>");
    // Orphan $_n$ not part of a larger math block (lookbehind-safe)
    out = out.replace(/(^|[^$])\$\_(\d+)\$/g, "$1<sub>$2</sub>");
    out = out.replace(/(^|[^$])\$_(\d+)\$/g, "$1<sub>$2</sub>");

    // Plain CH_3 outside $…$ only
    out = replaceOutsideMath(out, /\\[A-Za-z]+/g, (m) => m.replace(/_/g, "\uE000"));
    out = replaceOutsideMath(out, /([A-Za-z\)\]])\_(\d+)(?![0-9{])/g, "$1<sub>$2</sub>");
    out = replaceOutsideMath(out, /([A-Za-z\)\]])\_\{(\d+)\}/g, "$1<sub>$2</sub>");
    out = out.replace(/\uE000/g, "_");

    // Empty dollar junk only (never strip real math like $196 \pi$)
    out = out.replace(/\$\s*(\\+\s*)+\$/g, " ");
    out = out.replace(/\$\s*\\s+\s*\$/g, " ");
    out = out.replace(/\$\s+\$/g, " ");

    out = out.replace(/\s+(<\/?su[bp]>)/gi, "$1");
    out = out.replace(/(<\/su[bp]>)\s+(?=[-–—=])/g, "$1");
    out = out.replace(/(<\/sub>)(\d)(?=[\s,;.)<\]]|$)/g, "$1");

    return out;
  }

  /**
   * Wrap bare LaTeX that lacks $…$ so MathJax can typeset.
   * Protects existing $…$ so we never nest dollars (fixes \frac{1}{4\pi}).
   */
  function ensureMathDelimiters(s) {
    function wrapChunk(chunk) {
      chunk = parkAxisHyphenMath(chunk);
      // Repair spaces in commands before wrapping (screenshot 773)
      chunk = repairLatexCommandSpaces(chunk);
      if (!/\\[a-zA-Z]/.test(chunk) && !/\d\s*\\pi\b/.test(chunk)) return restoreAxisHyphenMath(chunk);

      const slots = [];
      const park = (m) => {
        slots.push(m);
        return "\uE100" + (slots.length - 1) + "\uE101";
      };
      const protect = (str) => str
        .replace(/\$\$[\s\S]+?\$\$/g, park)
        .replace(/\$[^$]+\$/g, park);
      const restore = (str) => str.replace(/\uE100(\d+)\uE101/g, (_, i) => slots[+i] || "");

      let c = protect(chunk);

      // Piecewise / matrices — wrap full environment
      c = c.replace(
        /(^|[^$\\])(\\begin\{(?:cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|aligned|align\*?|array|smallmatrix)\}[\s\S]*?\\end\{(?:cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|aligned|align\*?|array|smallmatrix)\})/g,
        (m, pre, tex) => pre + park("$" + tex + "$")
      );

      // OUTER accents/vectors FIRST (may contain nested \mathrm) — never park inner first
      // \overrightarrow{\mathrm{p}}  \vec{a}  \hat{i}  \overline{AB}
      c = c.replace(
        /(^|[^\\$])(\\(?:overrightarrow|overleftarrow|overleftrightarrow|overline|underline|widehat|widetilde|vec|hat|bar|dot|ddot|tilde)\s*\{(?:[^{}]|\{[^{}]*\}){0,80}\}(?:\s*[_^]\s*\{?[^{}\s\\$]{1,12}\}?)*)/g,
        (m, pre, tex) => pre + park("$" + tex + "$")
      );

      // \frac{a}{b}  (args may contain \pi etc — wrap whole frac first)
      c = c.replace(/(^|[^\\])(\\frac\s*\{[^{}]*\}\s*\{[^{}]*\})/g, (m, pre, tex) => pre + park("$" + tex + "$"));
      // \sqrt
      c = c.replace(/(^|[^\\])(\\sqrt(?:\s*\[[^\]]*\])?\s*\{[^{}]*\})/g, (m, pre, tex) => pre + park("$" + tex + "$"));
      // \left ... \right pairs — also \left\{ \right\} \left| \right|
      c = c.replace(
        /(^|[^\\])(\\left\s*(?:\\[{}()[\].|]|[\(\)\[\]{}.|])[\s\S]*?\\right\s*(?:\\[{}()[\].|]|[\(\)\[\]{}.|]))/g,
        (m, pre, tex) => pre + park("$" + tex + "$")
      );
      // Bare A^{100} / B^{n} still outside math
      c = c.replace(/(^|[^$\\])([A-Za-z])\s*\^\s*\{(\d+)\}/g, (m, pre, v, n) => pre + park("$" + v + "^{" + n + "}$"));
      // \textbf / \mathrm / \text{...} — AFTER outer accents so nested stay intact
      c = c.replace(
        /(^|[^\\])(\\(?:mathrm|textbf|text|mathbf|mathsf|textrm|textit|boldsymbol|operatorname|ce)\s*\{[^}]*\}(?:\s*[\^_]\s*\{?[^}\s\\]+\}?)?(?:\s*\/\s*[A-Za-zµμ°]+(?:\s*[\^_]\s*\{?[^}\s\\]+\}?)?)*)/g,
        (m, pre, tex) => pre + park("$" + tex.trim() + "$")
      );
      // other \cmd{...}
      c = c.replace(
        /(^|[^\\])(\\[a-zA-Z]+(?:\s*\{[^{}]*\}){1,3}(?:\s*[\^_]\s*\{?[^}\s\\]+\}?)*)/g,
        (m, pre, tex) => {
          if (/^\\(?:begin|end|left|right|big|Big|frac|sqrt|mathrm|textbf|text|mathbf|boldsymbol|overrightarrow|overleftarrow|vec|hat|bar)/.test(tex)) return m;
          return pre + park("$" + tex + "$");
        }
      );
      // 196 \pi
      c = c.replace(/(^|[^\\])(\d+(?:\.\d+)?)\s*(\\pi)\b/g, (m, pre, n, pi) => pre + park("$" + n + " " + pi + "$"));
      // bare \pi
      c = c.replace(/(^|[^\\])(\\pi)\b/g, (m, pre, pi) => pre + park("$" + pi + "$"));

      // Long bare formula runs: "R = \left\{ ... \right\}" when left/right wrap failed
      c = c.replace(
        /(^|[^$\\])((?:[A-Za-z0-9]\s*=\s*)?\\(?:left|frac|sqrt|mathrm|mathbf|text|lvert|rvert|langle|rangle)[\s\S]{0,220}?(?:\\right|\}|\d)\s*)/g,
        (m, pre, tex) => {
          if (/\$/.test(tex) || /\uE100/.test(tex)) return m;
          if (!/\\[a-zA-Z]/.test(tex)) return m;
          return pre + park("$" + tex.trim() + "$");
        }
      );

      // Bare TeX symbols WITHOUT braces — KaTeX only sees $…$ delimiters.
      // Fixes options like "P \rightarrow 2" and stems with \alpha, \leq, \infty, etc.
      const BARE_SYM =
        "rightarrow|leftarrow|leftrightarrow|Leftrightarrow|Rightarrow|Leftarrow|" +
        "longrightarrow|longleftarrow|longleftrightarrow|Longleftrightarrow|" +
        "overrightarrow|overleftarrow|overleftrightarrow|" +
        "to|gets|mapsto|uparrow|downarrow|updownarrow|Uparrow|Downarrow|" +
        "infty|pm|mp|times|div|cdot|cdots|ldots|vdots|ddots|" +
        "leq|geq|neq|ne|le|ge|lt|gt|approx|equiv|sim|simeq|cong|propto|" +
        "prec|succ|preceq|succeq|ll|gg|subset|supset|subseteq|supseteq|" +
        "in|notin|ni|cup|cap|setminus|sqcup|sqcap|vee|wedge|" +
        "oplus|ominus|otimes|oslash|odot|dagger|ddagger|star|circ|bullet|" +
        "angle|perp|parallel|mid|nmid|forall|exists|nexists|partial|nabla|" +
        "emptyset|varnothing|ell|hbar|Re|Im|aleph|wp|triangle|square|diamond|" +
        "sin|cos|tan|cot|sec|csc|log|ln|exp|lim|int|sum|prod|oint|max|min|sup|inf|det|dim|ker|deg|" +
        "alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|" +
        "iota|kappa|lambda|mu|nu|xi|pi|varpi|rho|varrho|sigma|varsigma|" +
        "tau|upsilon|phi|varphi|chi|psi|omega|" +
        "Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega";
      // Degrees: 60^\circ → single math token
      c = c.replace(/(^|[^$\\])(\d+(?:\.\d+)?\s*\^\s*\{?\\circ\}?)/g, (m, pre, tex) => pre + park("$" + tex.replace(/\s+/g, "") + "$"));
      // \angle ABC
      c = c.replace(/(^|[^$\\])(\\angle\s*[A-Za-z]{0,4})/g, (m, pre, tex) => pre + park("$" + tex.trim() + "$"));
      // Set chains BEFORE bare-symbol wrap: A \subseteq B \cup C · x \in \mathbb{N}
      c = c.replace(
        /(^|[^$\\])((?:[A-Za-z0-9]+|\\mathbb\{[A-Za-z0-9]+\})(?:\s*\\(?:subseteq|supseteq|subset|supset|in|notin|cup|cap|setminus|times|leq|geq|le|ge|neq|equiv)\s*(?:[A-Za-z0-9]+|\\mathbb\{[A-Za-z0-9]+\})){1,10})/g,
        (m, pre, tex) => {
          if (/\uE100/.test(tex) || tex.length > 140) return m;
          return pre + park("$" + tex.replace(/\s+/g, " ").trim() + "$");
        }
      );
      c = c.replace(
        new RegExp("(^|[^\\\\$a-zA-Z\\uE100-\\uE101])(\\\\(?:" + BARE_SYM + "))(?![a-zA-Z])", "g"),
        (m, pre, tex) => {
          if (tex === "\\circ") return m; // part of degree token
          return pre + park("$" + tex + "$");
        }
      );

      // Nested parks (e.g. \frac inside \left...\right) need multi-pass restore
      for (let _ri = 0; _ri < 8 && /\uE100\d+\uE101/.test(c); _ri++) c = restore(c);
      c = restore(c);
      c = restoreAxisHyphenMath(c);
      // Flatten nested dollars from inner parks: $\left(1- $\frac{1}{5}$ \right)$ → one island
      for (let _ni = 0; _ni < 6; _ni++) {
        const flat = c.replace(/\$([^$\n]{0,400}?)\$(\\(?:frac|dfrac|sqrt|mathrm|mathbf|text|left|begin|sin|cos|tan|vec|hat)[^$\n]{0,200}?)\$([^$\n]{0,400}?)\$/g,
          (full, a, mid, b) => {
            if (/\$/.test(a + mid + b)) return full;
            return "$" + a + mid + b + "$";
          });
        if (flat === c) break;
        c = flat;
      }
      // Collapse only empty $$ crumbs — never $$cases$$ / $$matrix$$
      c = c.replace(/\$\$+(?=\$)/g, "$");
      c = c.replace(/\$\s*\$/g, " ");
      // Collapse adjacent short math islands "$a$ $b$" → "$a b$"
      c = c.replace(/\$([^$]{1,40})\$\s*\$([^$]{1,40})\$/g, (full, a, b) => {
        if (/\\begin|\\end/.test(a + b)) return full;
        if (!/\\|[α-ωΑ-Ω0-9=+\-*/^_{}()]/.test(a + b)) return full;
        return "$" + a.trim() + " " + b.trim() + "$";
      });
      return c;
    }
    let out = replaceOutsideMathFn(s, wrapChunk);
    // Space around $math$ glued to English/digits (FULL string — not outside-math chunks):
    // Let$\vec{a}$be → Let $\vec{a}$ be · 3$\times$4 → 3 $\times$ 4
    out = out.replace(/([A-Za-z0-9,.;:=)])\$(?=\\|[A-Za-z0-9])/g, "$1 $");
    let acc = "";
    let dollarParity = 0;
    for (let i = 0; i < out.length; i++) {
      const ch = out[i];
      if (ch === "$") {
        dollarParity ^= 1;
        acc += ch;
        if (dollarParity === 0 && i + 1 < out.length && /[A-Za-z0-9]/.test(out[i + 1])) {
          acc += " ";
        }
        continue;
      }
      acc += ch;
    }
    out = acc;
    // Operators between adjacent math islands: $a$+$b$ → $a$ + $b$
    out = out.replace(/\$\s*([+\-–=×÷·])\s*\$/g, "$ $1 $");
    return out;
  }

  function replaceOutsideMath(s, rx, rep) {
    const parts = String(s || "").split(/(\$\$[\s\S]+?\$\$|\$[^$]*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g);
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) continue;
      parts[i] = parts[i].replace(rx, rep);
    }
    return parts.join("");
  }

  const UNI_SUP = { "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁰": "0" };

  /** BHK: wrap bare Unicode operators as TeX. Does not change question meaning. */
  function texifyUnicodeMath(s) {
    const slots = [];
    let out = String(s || "").replace(/<img\b[^>]*>/gi, (m) => {
      slots.push(m);
      return "§§QXIMG" + (slots.length - 1) + "§§";
    });
    out = replaceOutsideMathFn(out, (chunk) => {
      if (!chunk) return chunk;
      if (/cdn-question-pool|proxy-image|getmarks\.app|watermark_improved|AKCR2_/i.test(chunk)) return chunk;
      let c = chunk
        .replace(/≤/g, "$\\leq$")
        .replace(/≥/g, "$\\geq$")
        .replace(/≠/g, "$\\neq$")
        .replace(/≈/g, "$\\approx$")
        .replace(/≡/g, "$\\equiv$")
        .replace(/∝/g, "$\\propto$")
        .replace(/∞/g, "$\\infty$")
        .replace(/±/g, "$\\pm$")
        .replace(/∓/g, "$\\mp$")
        .replace(/×/g, "$\\times$")
        .replace(/÷/g, "$\\div$")
        .replace(/∈/g, "$\\in$")
        .replace(/∉/g, "$\\notin$")
        .replace(/⊂/g, "$\\subset$")
        .replace(/⊆/g, "$\\subseteq$")
        .replace(/⊃/g, "$\\supset$")
        .replace(/⊇/g, "$\\supseteq$")
        .replace(/∪/g, "$\\cup$")
        .replace(/∩/g, "$\\cap$")
        .replace(/∅/g, "$\\emptyset$")
        .replace(/∀/g, "$\\forall$")
        .replace(/∃/g, "$\\exists$")
        .replace(/⇒/g, "$\\Rightarrow$")
        .replace(/⇔/g, "$\\Leftrightarrow$")
        .replace(/→/g, "$\\rightarrow$")
        .replace(/←/g, "$\\leftarrow$")
        .replace(/⇌/g, "$\\rightleftharpoons$")
        .replace(/∂/g, "$\\partial$")
        .replace(/∇/g, "$\\nabla$")
        .replace(/∫/g, "$\\int$")
        .replace(/∑/g, "$\\sum$")
        .replace(/∏/g, "$\\prod$")
        .replace(/√\s*\(([^)]+)\)/g, "$\\sqrt{$1}$")
        .replace(/√\s*([A-Za-z0-9]+)/g, "$\\sqrt{$1}$")
        .replace(/√/g, "$\\sqrt{}$")
        .replace(/π/g, "$\\pi$")
        .replace(/θ/g, "$\\theta$")
        .replace(/α/g, "$\\alpha$")
        .replace(/β/g, "$\\beta$")
        .replace(/γ/g, "$\\gamma$")
        .replace(/δ/g, "$\\delta$")
        .replace(/λ/g, "$\\lambda$")
        .replace(/μ/g, "$\\mu$")
        .replace(/σ/g, "$\\sigma$")
        .replace(/φ/g, "$\\phi$")
        .replace(/ω/g, "$\\omega$")
        .replace(/Δ/g, "$\\Delta$")
        .replace(/Ω/g, "$\\Omega$");
      c = c.replace(/([A-Za-z])([²³¹⁰⁴⁵⁶⁷⁸⁹]+)/g, (_, v, sups) =>
        "$" + v + "^{" + [...sups].map((ch) => UNI_SUP[ch] || ch).join("") + "}$"
      );
      return c;
    });
    return out.replace(/§§QXIMG(\d+)§§/g, (_, i) => slots[+i] || "");
  }

  function replaceOutsideMathFn(s, fn) {
    const parts = String(s || "").split(/(\$\$[\s\S]+?\$\$|\$[^$]*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g);
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) continue;
      parts[i] = fn(parts[i]);
    }
    return parts.join("");
  }

  function wrapBareMathCommands(s) {
    // legacy entry — full ensureMathDelimiters handles this
    return ensureMathDelimiters(s);
  }

  /**
   * Marks / Word exports sometimes use single-angle quotes ‹ › instead of < >.
   * Restore real MathML / HTML tags so MathJax mml input can render them.
   * Screenshot 696–697: options showed literal "‹math xmlns=…› RMgBr ‹/math›".
   */
  function restoreAngleQuoteTags(s) {
    let out = String(s || "");
    // Full MathML blocks first (may span attributes with spaces)
    out = out.replace(/‹\s*(\/?\s*math\b[^›]*)›/gi, (_, inner) => "<" + inner.replace(/^\s+/, "") + ">");
    // Common MathML / HTML children used in chemistry options
    out = out.replace(
      /‹\s*(\/?\s*(?:mi|mo|mn|msup|msub|msubsup|mfrac|msqrt|mroot|mrow|mstyle|mtext|mspace|mtable|mtr|mtd|semantics|annotation|math|br|sub|sup|i|b|em|span|strong)\b[^›]*)›/gi,
      (_, inner) => "<" + String(inner).replace(/^\s+/, "") + ">"
    );
    // Entity form
    out = out.replace(/&lsaquo;\s*(\/?\s*math\b[^&]*?)&rsaquo;/gi, "<$1>");
    return out;
  }

  /** Screenshot 864: MathML islands were flattened to raw \alpha / \in (no $…$). */
  const MML_CODE_TEX = {
    945: "\\alpha", 946: "\\beta", 947: "\\gamma", 948: "\\delta", 949: "\\varepsilon",
    952: "\\theta", 955: "\\lambda", 956: "\\mu", 960: "\\pi", 961: "\\rho",
    963: "\\sigma", 966: "\\phi", 969: "\\omega", 916: "\\Delta", 920: "\\Theta",
    923: "\\Lambda", 928: "\\Pi", 931: "\\Sigma", 934: "\\Phi", 937: "\\Omega",
    8712: "\\in", 8713: "\\notin", 8715: "\\ni",
    8804: "\\le", 8805: "\\ge", 8800: "\\ne", 8776: "\\approx", 8801: "\\equiv",
    8734: "\\infty", 8721: "\\sum", 8747: "\\int", 8706: "\\partial", 8711: "\\nabla",
    8834: "\\subset", 8838: "\\subseteq", 8745: "\\cap", 8746: "\\cup",
    215: "\\times", 247: "\\div", 177: "\\pm", 183: "\\cdot", 8722: "-",
    8594: "\\rightarrow", 8592: "\\leftarrow", 8596: "\\leftrightarrow",
    8469: "\\mathbb{N}", 8484: "\\mathbb{Z}", 8474: "\\mathbb{Q}",
    8477: "\\mathbb{R}", 8450: "\\mathbb{C}",
    8290: "", 8201: " ", 160: " ", 8202: " ", 8203: ""
  };
  const MML_CHAR_TEX = {
    "α": "\\alpha", "β": "\\beta", "γ": "\\gamma", "δ": "\\delta", "ε": "\\varepsilon",
    "θ": "\\theta", "λ": "\\lambda", "μ": "\\mu", "π": "\\pi", "ρ": "\\rho",
    "σ": "\\sigma", "φ": "\\phi", "ϕ": "\\phi", "ω": "\\omega", "Δ": "\\Delta",
    "∈": "\\in", "∉": "\\notin", "≤": "\\le", "≥": "\\ge", "≠": "\\ne",
    "≈": "\\approx", "∞": "\\infty", "×": "\\times", "÷": "\\div", "±": "\\pm",
    "·": "\\cdot", "−": "-", "→": "\\rightarrow", "ℕ": "\\mathbb{N}",
    "ℤ": "\\mathbb{Z}", "ℝ": "\\mathbb{R}", "ℚ": "\\mathbb{Q}", "ℂ": "\\mathbb{C}"
  };
  const MML_ENT_TEX = {
    alpha: "\\alpha", beta: "\\beta", gamma: "\\gamma", delta: "\\delta",
    theta: "\\theta", lambda: "\\lambda", mu: "\\mu", pi: "\\pi", sigma: "\\sigma",
    phi: "\\phi", omega: "\\omega", infin: "\\infty", le: "\\le", ge: "\\ge",
    ne: "\\ne", times: "\\times", plusmn: "\\pm", isin: "\\in", notin: "\\notin",
    cap: "\\cap", cup: "\\cup", sub: "\\subset", sum: "\\sum", int: "\\int",
    part: "\\partial", nbsp: " "
  };

  function mmlDecodeText(t) {
    let s = String(t || "")
      .replace(/&nbsp;|&#160;|&#x0*A0;/gi, " ")
      .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
        const n = parseInt(h, 16);
        if (MML_CODE_TEX[n] != null) return " " + MML_CODE_TEX[n] + " ";
        try { return String.fromCharCode(n); } catch (e) { return ""; }
      })
      .replace(/&#(\d+);/g, (_, d) => {
        const n = parseInt(d, 10);
        if (MML_CODE_TEX[n] != null) return " " + MML_CODE_TEX[n] + " ";
        try { return String.fromCharCode(n); } catch (e) { return ""; }
      })
      .replace(/&([a-z]+);/gi, (m, name) => {
        const k = String(name || "").toLowerCase();
        return MML_ENT_TEX[k] != null ? (" " + MML_ENT_TEX[k] + " ") : m;
      });
    let out = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      out += (MML_CHAR_TEX[ch] != null) ? (" " + MML_CHAR_TEX[ch] + " ") : ch;
    }
    return out.replace(/\s+/g, " ").trim();
  }

  function mmlKids(body) {
    // Balanced top-level MathML children (nested <msub> inside <mfenced> must not truncate)
    const s = String(body || "");
    const kids = [];
    const openRe = /<(m(?:i|n|o|row|frac|sup|sub|subsup|sqrt|fenced|text|table|underover|under|over))\b[^>]*>/gi;
    let m;
    while ((m = openRe.exec(s))) {
      const tag = m[1];
      const start = m.index;
      let pos = start + m[0].length;
      let depth = 1;
      const openTok = new RegExp("<" + tag + "\\b", "gi");
      const closeTok = new RegExp("</" + tag + "\\s*>", "gi");
      while (pos < s.length && depth > 0) {
        openTok.lastIndex = pos;
        closeTok.lastIndex = pos;
        const o = openTok.exec(s);
        const c = closeTok.exec(s);
        if (!c) { pos = s.length; depth = 0; break; }
        if (o && o.index < c.index) {
          depth++;
          pos = o.index + o[0].length;
        } else {
          depth--;
          pos = c.index + c[0].length;
          if (depth === 0) {
            kids.push(s.slice(start, pos));
            openRe.lastIndex = pos;
            break;
          }
        }
      }
      if (depth !== 0) break;
    }
    return kids;
  }

  function mathmlToTex(inner) {
    let s = String(inner || "");
    // Piecewise / arrays — Marks/Examgoal put f(x) definitions in <mtable>
    // (Q6 "Let . Consider" when this block collapsed to a lone period)
    s = s.replace(/<mtable\b[^>]*>([\s\S]*?)<\/mtable>/gi, (_, body) => {
      let rows = [...String(body).matchAll(/<m(?:labeled)?tr\b[^>]*>([\s\S]*?)<\/m(?:labeled)?tr>/gi)];
      if (!rows.length) {
        const cells = [...String(body).matchAll(/<mtd\b[^>]*>([\s\S]*?)<\/mtd>/gi)];
        if (cells.length >= 2) {
          const paired = [];
          for (let i = 0; i < cells.length; i += 2) {
            const a = mathmlToTex(cells[i][1]);
            const b = cells[i + 1] ? mathmlToTex(cells[i + 1][1]) : "";
            paired.push(b ? (a + " & " + b) : a);
          }
          rows = paired.map((t) => [t, t]);
          const joined = paired.join(" \\\\ ");
          return paired.every((r) => r.includes(" & "))
            ? "\\begin{cases}" + joined + "\\end{cases}"
            : "\\begin{array}{ll}" + joined + "\\end{array}";
        }
        return mathmlToTex(body);
      }
      let two = true;
      const texRows = rows.map((r) => {
        const cells = [...r[1].matchAll(/<mtd\b[^>]*>([\s\S]*?)<\/mtd>/gi)];
        if (cells.length !== 2) two = false;
        if (!cells.length) return mathmlToTex(r[1]);
        return cells.map((c) => mathmlToTex(c[1])).join(" & ");
      }).filter((t) => String(t || "").trim());
      if (!texRows.length) return mathmlToTex(body);
      if (two) return "\\begin{cases}" + texRows.join(" \\\\ ") + "\\end{cases}";
      return "\\begin{array}{ll}" + texRows.join(" \\\\ ") + "\\end{array}";
    });
    s = s.replace(/<munderover\b[^>]*>([\s\S]*?)<\/munderover>/gi, (_, body) => {
      const kids = mmlKids(body);
      if (kids.length >= 3) {
        const base = mathmlToTex(kids[0]);
        const und = mathmlToTex(kids[1]);
        const ov = mathmlToTex(kids[2]);
        if (/\\?lim/i.test(base)) return "\\lim_{" + und + " \\to " + ov + "}";
        return "\\mathop{" + base + "}_{" + und + "}^{" + ov + "}";
      }
      return mathmlToTex(body);
    });
    s = s.replace(/<munder\b[^>]*>([\s\S]*?)<\/munder>/gi, (_, body) => {
      const kids = mmlKids(body);
      if (kids.length >= 2) return "\\mathop{" + mathmlToTex(kids[0]) + "}_{" + mathmlToTex(kids[1]) + "}";
      return mathmlToTex(body);
    });
    s = s.replace(/<mover\b[^>]*>([\s\S]*?)<\/mover>/gi, (_, body) => {
      const kids = mmlKids(body);
      if (kids.length >= 2) return "\\overset{" + mathmlToTex(kids[1]) + "}{" + mathmlToTex(kids[0]) + "}";
      return mathmlToTex(body);
    });
    s = s.replace(/<msubsup\b[^>]*>([\s\S]*?)<\/msubsup>/gi, (_, body) => {
      const kids = mmlKids(body);
      if (kids.length >= 3) {
        return "{" + mathmlToTex(kids[0]) + "}_{" + mathmlToTex(kids[1]) + "}^{" + mathmlToTex(kids[2]) + "}";
      }
      return mathmlToTex(body);
    });
    // msup/msub/mfrac BEFORE mfenced so [\mathrm{FeF}_6]^{3-} keeps base+sup kids
    s = s.replace(/<mfrac\b[^>]*>([\s\S]*?)<\/mfrac>/gi, (_, body) => {
      const kids = mmlKids(body);
      if (kids.length >= 2) return "\\frac{" + mathmlToTex(kids[0]) + "}{" + mathmlToTex(kids[1]) + "}";
      return mathmlToTex(body);
    });
    s = s.replace(/<msup\b[^>]*>([\s\S]*?)<\/msup>/gi, (_, body) => {
      const kids = mmlKids(body);
      if (kids.length >= 2) return "{" + mathmlToTex(kids[0]) + "}^{" + mathmlToTex(kids[1]) + "}";
      return mathmlToTex(body);
    });
    s = s.replace(/<msub\b[^>]*>([\s\S]*?)<\/msub>/gi, (_, body) => {
      const kids = mmlKids(body);
      if (kids.length >= 2) return "{" + mathmlToTex(kids[0]) + "}_{" + mathmlToTex(kids[1]) + "}";
      return mathmlToTex(body);
    });
    s = s.replace(/<mfenced\b([^>]*)>([\s\S]*?)<\/mfenced>/gi, (_, attrs, body) => {
      const inner = mathmlToTex(body);
      if (!String(inner || "").trim()) return "";
      const oa = /open\s*=\s*["']([^"']*)["']/i.exec(attrs || "");
      const ca = /close\s*=\s*["']([^"']*)["']/i.exec(attrs || "");
      let o = (oa && oa[1]) != null ? oa[1] : "(";
      let c = (ca && ca[1]) != null ? ca[1] : ")";
      if (o === "{") o = "\\{";
      if (c === "}") c = "\\}";
      // empty open/close (Marks unit parentheticals) → skip fence
      if (o === "" && c === "") return inner;
      if (o === "") o = ".";
      if (c === "") c = ".";
      return "\\left" + o + inner + "\\right" + c;
    });
    s = s.replace(/<msqrt\b[^>]*>([\s\S]*?)<\/msqrt>/gi, (_, body) => "\\sqrt{" + mathmlToTex(body) + "}");
    s = s.replace(/<mrow\b[^>]*>([\s\S]*?)<\/mrow>/gi, (_, body) => mathmlToTex(body));
    s = s.replace(/<mtext\b[^>]*>([\s\S]*?)<\/mtext>/gi, (_, t) => {
      const v = mmlDecodeText(String(t || "").replace(/<[^>]+>/g, ""));
      return v ? "\\text{" + v + "}" : "";
    });
    s = s.replace(/<mi\b[^>]*>([\s\S]*?)<\/mi>/gi, (_, t) => mmlDecodeText(String(t || "").replace(/<[^>]+>/g, "")));
    s = s.replace(/<mn\b[^>]*>([\s\S]*?)<\/mn>/gi, (_, t) => mmlDecodeText(String(t || "").replace(/<[^>]+>/g, "")));
    s = s.replace(/<mo\b[^>]*>([\s\S]*?)<\/mo>/gi, (_, t) => {
      const v = mmlDecodeText(String(t || "").replace(/<[^>]+>/g, ""));
      if (!v) return "";
      if (/^\\/.test(v)) return " " + v + " ";
      if (/^[,;:]$/.test(v)) return v + " ";
      if (/^[+\-=]$/.test(v)) return " " + v + " ";
      return " " + v + " ";
    });
    s = s.replace(/<\/?(?:math|semantics|annotation(?:-xml)?|mstyle|mspace|mphantom)[^>]*>/gi, "");
    s = s.replace(/<[^>]+>/g, " ");
    return s.replace(/\s+/g, " ").trim();
  }

  function convertAllMathML(s) {
    let out = restoreAngleQuoteTags(String(s || ""));
    if (!/<math\b/i.test(out) && !/‹\s*math\b/i.test(out)) return out;
    // LIST-<math>I</math> must stay words — never $I$ / leftover "LIST- II $" (ss931)
    out = out.replace(/LIST\s*[-–]?\s*<math\b[^>]*>[\s\S]*?<\/math>/gi, (m) =>
      /II|2/i.test(m.replace(/<[^>]+>/g, "")) ? "List-II" : "List-I"
    );
    out = out.replace(/<math\b[^>]*>([\s\S]*?)<\/math>/gi, (full, inner) => {
      let tex = "";
      try { tex = mathmlToTex(inner); } catch (_) { tex = ""; }
      const texCore = String(tex || "").replace(/\\begin\{[^}]+\}|\\end\{[^}]+\}|&/g, "").replace(/[. ,;:]/g, "").trim();
      if (tex && texCore) return "$" + tex + "$";
      // Never drop the island — "Let . Consider" happens when MathML becomes ""
      const plain = String(inner || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;|&#160;/gi, " ")
        .replace(/&#\d+;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (plain && !/^[.,;:]+$/.test(plain)) return "$" + plain + "$";
      if (tex && !/^[.,;:\s]*$/.test(tex)) return "$" + tex + "$";
      // qxproof1: drop empty MathML shells (Marks unit parentheticals)
      return "";
    });
    out = out.replace(/&nbsp;|&#160;|&#x0*A0;/gi, " ");
    out = out.replace(/\\le\s*ft\b/g, "\\left").replace(/\\ri\s*ght\b/g, "\\right");
    // For$\alpha$ → For $\alpha$   $4$is → $4$ is. Never split $x$-axis.
    try { out = spaceGluedDollars(out); } catch (_) {
      out = out.replace(/([A-Za-z]{2,})\$(?!\$)/g, "$1 $");
      out = out.replace(/\$([^$]+)\$([A-Za-z])/g, "$$$1$ $2");
    }
    out = out.replace(/\$\s*=\s*\$\s*\{\s*\$/g, "$ = \\{");
    return out;
  }

  function unglueTexFromWords(s) {
    // Longest first — never split \left → \le + ft (screenshot 864)
    const cmds = [
      "varepsilon", "vartheta", "varrho", "varsigma", "varphi", "varpi",
      "leftrightarrow", "rightarrow", "leftarrow", "subseteq", "notin",
      "infty", "forall", "exists", "partial", "alpha", "beta", "gamma",
      "delta", "epsilon", "theta", "lambda", "omega", "sigma", "Gamma",
      "Delta", "Theta", "Lambda", "Omega", "times", "cdot", "leq", "geq",
      "neq", "subset", "nabla", "left", "right", "sin", "cos", "tan",
      "log", "lim", "sum", "int", "phi", "psi", "rho", "tau", "chi",
      "pi", "mu", "nu", "xi", "pm", "div", "cup", "cap", "ell", "hbar", "ln"
    ].join("|");
    let c = String(s || "");
    c = c.replace(new RegExp("([A-Za-z0-9])(\\\\(?:" + cmds + "))(?![a-zA-Z])", "g"), "$1 $2");
    c = c.replace(new RegExp("(\\\\(?:" + cmds + "))(?=[A-Za-z])", "g"), "$1 ");
    c = c.replace(/\\le\s*ft\b/g, "\\left");
    c = c.replace(/\\ri\s*ght\b/g, "\\right");
    c = c.replace(/\\right(\s*[\]\}])([A-Za-z])/g, "\\right$1 $2");
    c = c.replace(/&amp;/gi, "&");
    c = c.replace(/(^|[^&A-Za-z])amp;/gi, "$1&");
    return c;
  }

  /** Bare \left[ a & b \\ c & d \right] (and leftover amp;) → KaTeX bmatrix. */
  function repairLeftBracketMatrix(s) {
    let out = String(s || "").replace(/&amp;/gi, "&").replace(/(^|[^&A-Za-z])amp;/gi, "$1&");
    out = out.replace(
      /\\left\s*\[\s*([\s\S]{1,500}?)\\right\s*\]/g,
      (full, body) => {
        let b = String(body || "")
          .replace(/&amp;/gi, "&")
          .replace(/(^|[^&A-Za-z])amp;/gi, "$1&")
          .replace(/<br\s*\/?>/gi, "\\\\")
          .replace(/\r\n|\n|\r/g, "\\\\")
          .replace(/(?:\\\\)+/g, "\\\\")
          .trim();
        if (!b) return full;
        const isMatrix = /&/.test(b) || /\\\\/.test(b);
        if (!isMatrix) return full;
        // Already a proper array/matrix env — do NOT wrap with extra $
        // (double-$ split $A=$\left[...$$ and nested park left tofu in PYQ stems)
        if (/\\begin\{/.test(b)) return full;
        b = b.replace(/^\s*\\\\|\\\\\s*$/g, "").trim();
        return "$\\begin{bmatrix}" + b + "\\end{bmatrix}$";
      }
    );
    return out;
  }

  /**
   * Bare &lt; / &gt; inside $…$ break HTML when escaped, and MathJax shows &lt; as junk.
   * Convert comparison ops inside math to TeX \lt / \gt (and unicode angle quotes).
   * Never touch ‹math…› tags (handled by restoreAngleQuoteTags first).
   */
  function protectMathComparisons(s) {
    // Skip protection when MathML present — comparisons inside TeX only
    if (/<math[\s>]/i.test(s) || /‹\s*math\b/i.test(s)) {
      return restoreAngleQuoteTags(s);
    }
    return String(s || "").replace(/\$([^$]*)\$/g, (full, inner) => {
      let t = inner
        .replace(/&lt;/gi, " \\lt ")
        .replace(/&gt;/gi, " \\gt ")
        .replace(/‹/g, " \\lt ")
        .replace(/›/g, " \\gt ")
        // bare < > that are comparisons (not HTML tags)
        .replace(/(^|[^<\\\/])<(?![a-zA-Z\/!])/g, "$1 \\lt ")
        .replace(/(^|[^>])>(?![=])/g, "$1 \\gt ");
      t = t.replace(/\s{2,}/g, " ").trim();
      return `$${t}$`;
    });
  }

  /** Escape HTML only outside $…$ / \(…\) / \[…\] so math comparisons stay intact. */
  function escapeHtmlOutsideMath(s) {
    return replaceOutsideMathFn(String(s || ""), (chunk) => escapeHtml(chunk));
  }

  /** Safe cleanup + delimiter ensure for MathJax */
  /**
   * Convert plain JEE-style math text → LaTeX (uniform KaTeX render).
   * Fixes Screenshot 717: log(x+7/2) ( (x-7)/(2x-3) )^2 ≥ 0 as plain text.
   */
  function convertSimpleFracs(expr) {
    let e = String(expr || "").trim();
    for (let i = 0; i < 6; i++) {
      let next = e.replace(/\(([^()]+)\)\s*\/\s*\(([^()]+)\)/g, "\\frac{$1}{$2}");
      next = next.replace(/(\d+)\s*\/\s*(\d+)/g, "\\frac{$1}{$2}");
      if (next === e) break;
      e = next;
    }
    return e;
  }

  /** Extract balanced (...) starting at index of '(' */
  function takeBalanced(str, openIdx) {
    if (!str || str[openIdx] !== "(") return null;
    let depth = 0;
    for (let i = openIdx; i < str.length; i++) {
      if (str[i] === "(") depth++;
      else if (str[i] === ")") {
        depth--;
        if (depth === 0) return { inner: str.slice(openIdx + 1, i), end: i };
      }
    }
    return null;
  }

  function upgradePlainMathChunk(chunk) {
    if (!chunk || /\\begin\{|\\ce\{/.test(chunk)) return chunk;
    let c = String(chunk);
    c = c.replace(/\\because/gi, " because ");
    c = c.replace(/\\therefore/gi, " so ");
    c = c.replace(/\\forall/g, " for all ");

    // log(base)(arg)^n — balanced parentheses (handles nested fractions)
    {
      let out = "";
      let i = 0;
      const lower = c.toLowerCase();
      while (i < c.length) {
        const idx = lower.indexOf("log", i);
        if (idx < 0) {
          out += c.slice(i);
          break;
        }
        // word boundary before log
        if (idx > 0 && /[A-Za-z0-9_]/.test(c[idx - 1])) {
          out += c.slice(i, idx + 3);
          i = idx + 3;
          continue;
        }
        out += c.slice(i, idx);
        let j = idx + 3;
        while (j < c.length && /\s/.test(c[j])) j++;
        if (c[j] !== "(") {
          out += c.slice(idx, j);
          i = j;
          continue;
        }
        const basePart = takeBalanced(c, j);
        if (!basePart) {
          out += c.slice(idx, j + 1);
          i = j + 1;
          continue;
        }
        j = basePart.end + 1;
        while (j < c.length && /\s/.test(c[j])) j++;
        if (c[j] !== "(") {
          // only log(base) without second arg — leave as \log(base)
          const b0 = convertSimpleFracs(basePart.inner);
          out += `$\\log\\left(${b0}\\right)$`;
          i = j;
          continue;
        }
        const argPart = takeBalanced(c, j);
        if (!argPart) {
          out += c.slice(idx, j + 1);
          i = j + 1;
          continue;
        }
        j = argPart.end + 1;
        let exp = "";
        const expM = c.slice(j).match(/^\s*\^\s*\{?(\d+)\}?/);
        if (expM) {
          exp = `^{${expM[1]}}`;
          j += expM[0].length;
        }
        // optional trailing comparison ≥ 0 etc glued into same math
        let tail = "";
        const tailM = c.slice(j).match(/^\s*(≥|≤|≠|≥|<=|>=|=|<|>)\s*(-?\d+(?:\.\d+)?)/);
        if (tailM) {
          const opMap = { "≥": "\\ge", "≤": "\\le", "≠": "\\ne", ">=": "\\ge", "<=": "\\le", "=": "=", ">": ">", "<": "<" };
          const op = opMap[tailM[1]] || tailM[1];
          tail = ` ${op} ${tailM[2]}`;
          j += tailM[0].length;
        }
        const b = convertSimpleFracs(basePart.inner);
        const a = convertSimpleFracs(argPart.inner);
        out += ` $\\log_{${b}}\\left(${a}\\right)${exp}${tail}$ `;
        i = j;
      }
      c = out.replace(/\s{2,}/g, " ");
    }

    // Interval options: [1/4, 1/2], [1, 3], [1/6, 1/2]
    c = c.replace(
      /\[\s*(\d+)\s*\/\s*(\d+)\s*,\s*(\d+)\s*\/\s*(\d+)\s*\]/g,
      (_, a, b, d, e) => `$\\left[\\dfrac{${a}}{${b}},\\dfrac{${d}}{${e}}\\right]$`
    );
    c = c.replace(
      /\[\s*(\d+)\s*\/\s*(\d+)\s*,\s*(-?\d+)\s*\]/g,
      (_, a, b, d) => `$\\left[\\dfrac{${a}}{${b}},${d}\\right]$`
    );
    c = c.replace(
      /\[\s*(-?\d+)\s*,\s*(\d+)\s*\/\s*(\d+)\s*\]/g,
      (_, a, b, d) => `$\\left[${a},\\dfrac{${b}}{${d}}\\right]$`
    );
    c = c.replace(
      /\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]/g,
      (_, a, b) => `$[${a},${b}]$`
    );

    // Inverse trig WITH args: sin^-1(...), cos^{-1}(...), tan-1(...)
    {
      let out = "";
      let i = 0;
      const reInv = /(?<![A-Za-z\\$])(sin|cos|tan|cot|sec|csc)\s*(?:\^\s*\{?\s*-1\s*\}?|-\s*1)\s*\(/gi;
      let m;
      while ((m = reInv.exec(c)) !== null) {
        out += c.slice(i, m.index);
        const fn = m[1].toLowerCase();
        const openIdx = m.index + m[0].length - 1;
        const bal = takeBalanced(c, openIdx);
        if (!bal) {
          out += m[0];
          i = m.index + m[0].length;
          reInv.lastIndex = i;
          continue;
        }
        let inn = bal.inner
          .replace(/\b(sin|cos|tan|cot|sec|csc)\s*\^\s*\{?(\d+)\}?\s*([a-zA-Z])/gi, "\\$1^{$2} $3")
          .replace(/(?<![A-Za-z\\])\bpi\b/gi, "\\pi");
        inn = convertSimpleFracs(inn);
        out += `$\\${fn}^{-1}\\left(${inn}\\right)$`;
        i = bal.end + 1;
        reInv.lastIndex = i;
      }
      out += c.slice(i);
      c = out;
    }

    // sin^2 x, cos^2 θ
    c = c.replace(
      /\b(sin|cos|tan|cot|sec|csc)\s*\^\s*\{?(\d+)\}?\s*([a-zA-Z])\b/gi,
      (_, fn, n, v) => `$\\${fn.toLowerCase()}^{${n}} ${v}$`
    );

    // (K*pi)/6 or (K*π)/6
    c = c.replace(
      /\(\s*([A-Za-z])\s*\*?\s*(?:pi|π|\\pi)\s*\)\s*\/\s*(\d+)/gi,
      (_, k, n) => `$\\dfrac{${k}\\pi}{${n}}$`
    );

    // ln/sin/cos/tan( … )
    c = c.replace(
      /\b(ln|sin|cos|tan|cot|sec|csc|sinh|cosh|tanh|arcsin|arccos|arctan)\s*\(\s*([^()]+)\s*\)/gi,
      (_, fn, arg) => {
        const f = fn.toLowerCase();
        const map = {
          arcsin: "\\arcsin", arccos: "\\arccos", arctan: "\\arctan",
          sin: "\\sin", cos: "\\cos", tan: "\\tan", cot: "\\cot",
          sec: "\\sec", csc: "\\csc", sinh: "\\sinh", cosh: "\\cosh",
          tanh: "\\tanh", ln: "\\ln"
        };
        return `$${(map[f] || "\\" + f)}\\left(${convertSimpleFracs(arg.trim())}\\right)$`;
      }
    );

    // Remaining (a)/(b) and n/m fractions (outside existing $)
    c = replaceOutsideMathFn(c, (part) => convertSimpleFracs(part));

    // f(x)=… , f'(x) simple poly expressions
    c = replaceOutsideMathFn(c, (part) => {
      return part.replace(
        /\bf\s*'\s*\(\s*([a-z])\s*\)\s*=\s*([^\n.?!;]{1,40})/gi,
        (_, v, rhs) => ` $f'(${v})=${convertSimpleFracs(rhs.trim())}$ `
      ).replace(
        /\bf\s*\(\s*([a-z])\s*\)\s*=\s*([^\n.?!;]{1,48})/gi,
        (_, v, rhs) => {
          if (/\\frac|\$/.test(rhs)) return ` $f(${v})=${rhs.trim()}$ `;
          // x^2+2x+1 style
          let r = rhs.trim().replace(/([a-zA-Z])\^(\d+)/g, "$1^{$2}");
          r = convertSimpleFracs(r);
          return ` $f(${v})=${r}$ `;
        }
      );
    });

    // Wrap standalone \frac{a}{b} not already in $
    c = replaceOutsideMathFn(c, (part) => {
      if (!/\\frac/.test(part)) return part;
      return part.replace(/(\\frac\{[^{}]+\}\{[^{}]+\})/g, (m) => "$" + m + "$");
    });

    // x^2 outside $
    c = c.replace(/(^|[^$\\A-Za-z])([a-zA-Z0-9)\]])(\s*)\^(\d+)(?![0-9{])/g, (m, pre, base, sp, exp) => {
      return `${pre}$${base}^{${exp}}$`;
    });

    // Comparisons outside $
    c = replaceOutsideMath(c, /≥/g, " $\\ge$ ");
    c = replaceOutsideMath(c, /≤/g, " $\\le$ ");
    c = replaceOutsideMath(c, /≠/g, " $\\ne$ ");
    c = replaceOutsideMath(c, /∞/g, " $\\infty$ ");
    c = replaceOutsideMath(c, /π/g, " $\\pi$ ");
    c = replaceOutsideMath(c, /θ/g, " $\\theta$ ");
    c = replaceOutsideMath(c, /±/g, " $\\pm$ ");
    c = replaceOutsideMath(c, /×/g, " $\\times$ ");
    c = replaceOutsideMath(c, /÷/g, " $\\div$ ");
    c = replaceOutsideMath(c, /√/g, " $\\sqrt{}$ ");

    c = c.replace(/\$\s*\$/g, " ");
    // Merge adjacent math: $a$$b$ → $a b$ (never collapse $$cases$$)
    for (let k = 0; k < 4; k++) {
      c = c.replace(/\$([^$]+)\$\s*\$([^$]+)\$/g, (full, a, b) => {
        if (/\\begin\{(?:cases|matrix|pmatrix|bmatrix)/.test(a + b)) return full;
        return "$" + a + " " + b + "$";
      });
    }
    c = c.replace(/\s{2,}/g, " ").trim();
    return c;
  }

  function upgradePlainMathNotation(s) {
    // Also process text between HTML tags (question stems often <p>plain math</p>)
    let out = String(s || "");
    if (/<[^>]+>/.test(out)) {
      out = out.replace(/(>)([^<]+)(<)/g, (_, a, text, b) => {
        if (!/[\\^_/]|log\s*\(|sin\s*\(|\d\s*\/\s*\d|≥|≤|≠/.test(text) && !/\([^)]+\)\s*\/\s*\(/.test(text)) {
          return a + text + b;
        }
        return a + replaceOutsideMathFn(text, upgradePlainMathChunk) + b;
      });
      // leading/trailing text without wrapping tags
      out = out.replace(/^([^<]+)/, (m, text) => replaceOutsideMathFn(text, upgradePlainMathChunk));
      out = out.replace(/>([^<]+)$/, (m, text) => ">" + replaceOutsideMathFn(text, upgradePlainMathChunk));
      return out;
    }
    return replaceOutsideMathFn(out, upgradePlainMathChunk);
  }

  /**
   * Fix missing/broken spaces in plain question text (all exams / Black Book / OCR).
   * e.g. LetA → Let A, ]andf → ] and f, satisfyf(1) → satisfy f(1), Suppos e → Suppose
   * Protects chem formulas and $math$ islands.
   */
  // Only split when next char is Capital or '(' — never break Integral / into / continuous
  const GLUE_WORDS_CAP_RE = new RegExp(
    "\\b(" +
    "Let|Given|Suppose|Supposes|Then|When|Where|Find|Show|Prove|Such|That|And|But|" +
    "Not|For|From|With|Into|Onto|Over|Under|About|After|Before|Between|Through|During|" +
    "Without|Within|Among|Against|Upon|Satisfy|Satisfies|Satisfying|Define|Defined|" +
    "Consider|Assume|Hence|Thus|Therefore|Moreover|Also|Only|Else|Range|Domain|" +
    "Function|Functions|Mapping|Maps|Equals|Equal|Greater|Less|Than|Which|What|How|" +
    "Many|Each|Every|All|Some|None|Set|Subset|Union|Intersection|" +
    "The|Are|Was|Were|Been|Being|Has|Have|Had|Does|Did|Can|Could|" +
    "May|Might|Must|Shall|Should|Will|Would|" +
    "Number|Numbers|Value|Values|Real|Complex|Positive|Negative|Integer|Integers|" +
    "Natural|Rational|Irrational|Prime|Even|Odd|Continuous|Differentiable|" +
    "Increasing|Decreasing|Maximum|Minimum|Limit|Limits|Derivative|Integral|" +
    "Matrix|Matrices|Determinant|Vector|Vectors|Angle|Angles|Triangle|Circle|" +
    "Line|Lines|Point|Points|Plane|Planes|Sphere|Parabola|Ellipse|Hyperbola|" +
    "Sequence|Series|Probability|Permutation|Combination|Binomial|Logarithm|" +
    "Exponential|Trigonometric|Inverse|Identity|Equation|Equations|Inequality|" +
    "Root|Roots|Zero|Zeros|Coefficient|Polynomial|Degree|Order|Solution|Solutions" +
    ")(?=[A-Z(])",
    "g"
  );
  /**
   * Full proofread of math + symbols + spacing artifacts (all questions/options/sols).
   * Safe to run multiple times.
   */
  function repairLatexCommandSpaces(s) {
    let c = String(s || "");

    // Zero-width / weird spaces (always)
    c = c.replace(/[\u200B-\u200D\uFEFF\u2060\u00AD]/g, "");
    c = c.replace(/[\u00A0\u202F\u2007\u2009\u2008\u200A]/g, " ");
    // Unicode minus (not hyphen) → ASCII for TeX
    c = c.replace(/\u2212/g, "-");
    try { c = unglueTexFromWords(c); } catch (_) { /* */ }

    const hasTex = /\\[a-zA-Z]|\$|\\\(|\\\[/.test(c);
    // Unicode → TeX only outside MathML (screenshot 864: <mi>α</mi> became literal \alpha)
    if ((hasTex || /[≤≥≠≈→⇒∞∈∀∃αβγθπΔμλσφ∘]/.test(c)) && !/<math\b/i.test(c)) {
      const u2t = [
        [/×/g, "\\times "], [/÷/g, "\\div "], [/±/g, "\\pm "], [/·|⋅/g, "\\cdot "],
        [/∞/g, "\\infty "], [/≤/g, "\\le "], [/≥/g, "\\ge "], [/≠/g, "\\ne "], [/≈/g, "\\approx "],
        [/→/g, "\\rightarrow "], [/⇒/g, "\\Rightarrow "], [/↔/g, "\\leftrightarrow "], [/∘/g, "\\circ "],
        [/∈/g, "\\in "], [/∀/g, "\\forall "], [/∃/g, "\\exists "],
        [/α/g, "\\alpha "], [/β/g, "\\beta "], [/γ/g, "\\gamma "], [/θ/g, "\\theta "],
        [/π/g, "\\pi "], [/Δ/g, "\\Delta "], [/μ/g, "\\mu "], [/λ/g, "\\lambda "],
        [/σ/g, "\\sigma "], [/φ|ϕ/g, "\\phi "], [/°/g, "^\\circ "]
      ];
      u2t.forEach(([re, rep]) => { c = c.replace(re, rep); });
    }

    // Common broken command spacing: \begin {cases} \frac {a}{b} \text {sgn }
    c = c.replace(/\\(begin|end)\s*\{/g, "\\$1{");
    c = c.replace(
      /\\(frac|dfrac|tfrac|cfrac|binom|sqrt|text|mathrm|mathbf|mathsf|textrm|textit|textbf|boldsymbol|operatorname|overline|underline|hat|bar|vec|tilde|dot|ddot|left|right|big|Big|bigg|Bigg|mathbb|mathcal|mathfrak)\s*\{/g,
      "\\$1{"
    );
    c = c.replace(/\\(frac|dfrac|tfrac|binom)\s*([^{\s\\])/g, "\\$1{$2");
    c = c.replace(/\\left\s+/g, "\\left");
    c = c.replace(/\\right\s+/g, "\\right");
    c = c.replace(/\\(sin|cos|tan|cot|sec|csc|log|ln|exp|lim|max|min|sup|inf|det|dim|ker|deg|gcd|Hom|Pr|sgn|sign)\s*(?=[\^_{(])/g, "\\$1");
    c = c.replace(/\\text\s*\{\s*/g, "\\text{");
    c = c.replace(/\\mathrm\s*\{\s*/g, "\\mathrm{");
    c = c.replace(/\\(begin|end)\{([^}]*)\}/g, (_, cmd, name) => "\\" + cmd + "{" + String(name).replace(/\s+/g, "") + "}");
    // Brace padding only for short math groups (not English sentences in \text)
    c = c.replace(/\\(frac|dfrac|sqrt|mathrm|mathbf|mathbb|mathcal)(\{[^{}]{0,80}\})/g, (full, cmd, grp) =>
      "\\" + cmd + grp.replace(/\{\s+/g, "{").replace(/\s+\}/g, "}")
    );
    c = c.replace(/([_^])\s*\{/g, "$1{");
    c = c.replace(/([_^])\s+(\d)/g, "$1$2");
    c = c.replace(/(^|[^\\a-zA-Z])(begin|end)\s*\{/g, "$1\\$2{");
    c = c.replace(/(^|[^\\a-zA-Z])(frac|dfrac|sqrt|mathrm|mathbf|textbf|text)\s*\{/g, "$1\\$2{");
    c = c.replace(/(^|[^\\a-zA-Z{])sgn\b/g, "$1\\operatorname{sgn}");
    c = c.replace(/\\operatorname\{\s*\\operatorname\{\s*sgn\s*\}\s*\}/g, "\\operatorname{sgn}");
    c = c.replace(/\\text\{sgn\}/gi, "\\operatorname{sgn}");
    c = c.replace(/\\text\{sign\}/gi, "\\operatorname{sign}");
    c = c.replace(/e\s*\^\s*\{/g, "e^{");
    c = c.replace(/([a-zA-Z0-9])\s*\^\s*\{/g, "$1^{");
    c = c.replace(/([a-zA-Z0-9])\s*_\s*\{/g, "$1_{");
    c = c.replace(/[ \t]{2,}/g, " ");
    return c;
  }

  /**
   * qxmd176: unglue lowercase OCR/prose joins common in solutions & Quick Shortcut
   * e.g. oddodd → odd odd, eveneven → even even, sosymmetricrelation → so symmetric relation
   * Client-only — no bank JSON rewrite.
   */
  function unglueLowercaseMathProse(s) {
    let c = String(s || "");
    if (!c || c.length < 6) return c;
    // Explicit reported glues
    const pairs = [
      [/\boddodd\b/gi, "odd odd"],
      [/\beveneven\b/gi, "even even"],
      [/\boddoddly\b/gi, "odd oddly"],
      [/\bsosymmetricrelation\b/gi, "so symmetric relation"],
      [/\bsosymmetric\b/gi, "so symmetric"],
      [/\bsymmetricrelation\b/gi, "symmetric relation"],
      [/\basymmetricrelation\b/gi, "asymmetric relation"],
      [/\breflexiverelation\b/gi, "reflexive relation"],
      [/\btransitiverelation\b/gi, "transitive relation"],
      [/\bequivalencerelation\b/gi, "equivalence relation"],
      [/\bantisymmetric\b/gi, "antisymmetric"], // keep real word
      [/\bisnotsymmetric\b/gi, "is not symmetric"],
      [/\bisnotreflexive\b/gi, "is not reflexive"],
      [/\bisnottransitive\b/gi, "is not transitive"],
      [/\bisasymmetric\b/gi, "is asymmetric"],
      [/\bissymmetric\b/gi, "is symmetric"],
      [/\bisreflexive\b/gi, "is reflexive"],
      [/\bistransitive\b/gi, "is transitive"],
      [/\bnotsymmetric\b/gi, "not symmetric"],
      [/\bnotreflexive\b/gi, "not reflexive"],
      [/\bnottransitive\b/gi, "not transitive"],
      [/\boneof\b/gi, "one of"],
      [/\beachof\b/gi, "each of"],
      [/\ballof\b/gi, "all of"],
      [/\bnoneof\b/gi, "none of"],
      [/\bifandonlyif\b/gi, "if and only if"],
      [/\bforall\b/gi, "for all"],
      [/\bthereexists\b/gi, "there exists"],
      /* qxmd179: lim / vertex prose glues ($-coordinateofthevertexmustliein$) */
      [/\bcoordinateofthevertex\b/gi, "coordinate of the vertex"],
      [/\bcoordinatesofthevertex\b/gi, "coordinates of the vertex"],
      [/\bmustliein\b/gi, "must lie in"],
      [/\blieintherange\b/gi, "lie in the range"],
      [/\blieinthe\b/gi, "lie in the"],
      [/\bintheinterval\b/gi, "in the interval"],
      [/\bofthevertex\b/gi, "of the vertex"],
      [/\bx-coordinateofthe\b/gi, "x-coordinate of the"],
      [/\by-coordinateofthe\b/gi, "y-coordinate of the"],
    ];
    pairs.forEach(function (pr) { c = c.replace(pr[0], pr[1]); });
    /* qxmd179: $-coordinateofthevertexmustliein$ → prose (false math island) */
    try {
      c = c.replace(/\$(\s*-?[a-z][a-z0-9\-]{12,})\$/g, function (_m, inner) {
        if (/[\\^_{}=<>]|\\[a-zA-Z]|\d\s*[+\-*/]/.test(inner)) return _m;
        return String(inner).replace(/-/g, "-");
      });
    } catch (_) { /* */ }
    // Dictionary split: known token glued to another known token (lowercase)
    const TOK = (
      "odd|even|so|is|are|not|a|an|the|and|or|of|to|in|on|for|with|from|that|this|" +
      "symmetric|asymmetric|antisymmetric|reflexive|transitive|equivalence|relation|relations|" +
      "property|properties|matrix|matrices|function|functions|domain|range|set|subset|" +
      "integer|integers|real|complex|positive|negative|natural|rational|prime|" +
      "continuous|differentiable|increasing|decreasing|identity|inverse|onto|into|" +
      "hence|thus|therefore|because|since|then|when|where|which|whose"
    );
    const reTok = new RegExp("\\b(" + TOK + ")(" + TOK + ")\\b", "gi");
    // Iterate a few times for triple glues like sosymmetricrelation → so+symmetricrelation → so+symmetric+relation
    for (let i = 0; i < 4; i++) {
      const next = c.replace(reTok, function (_, a, b) {
        // avoid splitting real compounds already correct
        const joined = (a + b).toLowerCase();
        if (joined === "antisymmetric" || joined === "into" || joined === "onto") return a + b;
        return a + " " + b;
      });
      if (next === c) break;
      c = next;
    }
    return c;
  }

  /** English word heal dictionary (OCR / bad glue splits) — all screens */
  function healBrokenEnglishWords(s) {
    let c = String(s || "");
    const heal = [
      [/\bSuppos\s+e\b/gi, "Suppose"],
      [/\bsatisf\s+y\b/gi, "satisfy"],
      [/\bsatisfie\s+s\b/gi, "satisfies"],
      [/\bfunctio\s+n\b/gi, "function"],
      [/\bfu\s+nction\b/gi, "function"],
      [/\bther\s+efore\b/gi, "therefore"],
      [/\bwher\s+e\b/gi, "where"],
      [/\bcont\s+inuous\b/gi, "continuous"],
      [/\bCo\s+nstant\b/g, "Constant"],
      [/\bcon\s+stant\b/gi, "constant"],
      [/\bno\s+r\b/gi, "nor"],
      [/\ban\s+d\b/gi, "and"],
      [/\bne\s+ither\b/gi, "neither"],
      [/\be\s+ither\b/gi, "either"],
      [/\be\s+ven\b/gi, "even"],
      [/\bo\s+dd\b/gi, "odd"],
      [/\bre\s+al\b/gi, "real"],
      [/\bcom\s+plex\b/gi, "complex"],
      [/\bpos\s+itive\b/gi, "positive"],
      [/\bneg\s+ative\b/gi, "negative"],
      [/\binte\s+ger\b/gi, "integer"],
      [/\bnat\s+ural\b/gi, "natural"],
      [/\brati\s+onal\b/gi, "rational"],
      [/\bdiff\s+erentiable\b/gi, "differentiable"],
      [/\binteg\s+ral\b/gi, "integral"],
      [/\bderiv\s+ative\b/gi, "derivative"],
      [/\bmat\s+rix\b/gi, "matrix"],
      [/\bdet\s+erminant\b/gi, "determinant"],
      [/\bpoly\s+nomial\b/gi, "polynomial"],
      [/\bequa\s+tion\b/gi, "equation"],
      [/\binequa\s+lity\b/gi, "inequality"],
      [/\bprob\s+ability\b/gi, "probability"],
      [/\btrian\s+gle\b/gi, "triangle"],
      [/\bcirc\s+le\b/gi, "circle"],
      [/\bpara\s+bola\b/gi, "parabola"],
      [/\bell\s+ipse\b/gi, "ellipse"],
      [/\bhyper\s+bola\b/gi, "hyperbola"],
      [/\bvec\s+tor\b/gi, "vector"],
      [/\bmlof\b/gi, "ml of"],
      [/\bLof\b/g, "L of"],
      [/\bis\/\s*are\b/gi, "is/are"],
      [/\bMnbridge\b/g, "Mn bridge"],
      [/\breact\s+ion\b/gi, "reaction"],
      [/\breact\s+ions\b/gi, "reactions"],
      [/\bstr\s+ucture\b/gi, "structure"],
      [/\bstr\s+uctures\b/gi, "structures"],
      [/\bprod\s+uct\b/gi, "product"],
      [/\bprod\s+ucts\b/gi, "products"],
      [/\bcomp\s+ound\b/gi, "compound"],
      [/\bcomp\s+ounds\b/gi, "compounds"],
      [/\bmole\s+cule\b/gi, "molecule"],
      [/\bmole\s+cules\b/gi, "molecules"],
      [/\bopt\s+ion\b/gi, "option"],
      [/\bopt\s+ions\b/gi, "options"],
      [/\bcorr\s+ect\b/gi, "correct"],
      [/\bincor\s+rect\b/gi, "incorrect"],
      [/\bresp\s+ectively\b/gi, "respectively"],
      [/\bfoll\s+owing\b/gi, "following"],
      [/\bcontinous\b/gi, "continuous"],
      [/\bdiscontinous\b/gi, "discontinuous"],
      [/\bcorres\s+ponding\b/gi, "corresponding"],
      [/\bobta\s+ined\b/gi, "obtained"],
      // Glued phrase repairs (common OCR dumps)
      [/\bbetwomatrices\b/gi, "between matrices"],
      [/\bbetweenmatrices\b/gi, "between matrices"],
      [/\bbetweenmatrix\b/gi, "between matrices"],
      [/\bMatchthe\b/g, "Match the"],
      [/\bchoosethe\b/gi, "choose the"],
      [/\bcorrectoption\b/gi, "correct option"],
      [/\bisreactedwith\b/gi, "is reacted with"],
      [/\boneequivalentof\b/gi, "one equivalent of"],
      [/\bpentadieneis\b/gi, "pentadiene is"],
      [/\breactedwith\b/gi, "reacted with"],
      [/\bequivalentof\b/gi, "equivalent of"],
      [/\binthepresenceof\b/gi, "in the presence of"],
      [/\binpresenceof\b/gi, "in presence of"],
      [/\bthefollowing\b/gi, "the following"],
      [/\bwhichofthe\b/gi, "which of the"],
      [/\bcorrectanswer\b/gi, "correct answer"],
      [/\bListI\b/g, "List-I"],
      [/\bListII\b/g, "List-II"],
      [/\binListI\b/g, "in List-I"],
      [/\binListII\b/g, "in List-II"],
      // Ordinal / probability / matrix display repairs (Marks HTML dumps)
      [/10\^\{\\text\s*\{?\s*th\s*\}?\}/gi, "10^{\\mathrm{th}}"],
      [/\^\{\\text\s*\{\s*th\s*\}\}/gi, "^{\\mathrm{th}}"],
      [/\^\{\\text\s*\{\s*st\s*\}\}/gi, "^{\\mathrm{st}}"],
      [/\^\{\\text\s*\{\s*nd\s*\}\}/gi, "^{\\mathrm{nd}}"],
      [/\^\{\\text\s*\{\s*rd\s*\}\}/gi, "^{\\mathrm{rd}}"],
      // Probability set notation often broken in plain text
      [/\\cap/g, "\\cap"],
      [/\\cup/g, "\\cup"]
    ];
    heal.forEach(([re, rep]) => { c = c.replace(re, rep); });
    return c;
  }

  function parkLatexIslands(str, slots) {
    let c = String(str || "");
    const park = (m) => {
      const key = "\uE200" + slots.length + "\uE201";
      slots.push(m);
      return key;
    };
    // Environments (cases, matrix, align, …)
    c = c.replace(/\\begin\{[a-zA-Z*]+\}[\s\S]*?\\end\{[a-zA-Z*]+\}/g, park);
    // $…$ already handled by replaceOutsideMathFn; also park bare multi-cmd runs
    c = c.replace(/\\(?:frac|dfrac|sqrt|text|mathrm|mathbf|left|right|begin|end|binom|sum|int|prod|lim|infty|partial|nabla|cdot|times|leq|geq|neq|approx|to|mapsto|in|subset|cup|cap|forall|exists|mathbb|mathcal|overline|underline|hat|bar|vec|tilde|dot|ddot)(?:\s*\{[^{}]*\}){0,4}(?:\s*[_^]\s*\{[^{}]*\}){0,4}/g, park);
    // Remaining \cmd{...}{...}
    c = c.replace(/\\[a-zA-Z]+\s*(?:\[[^\]]*\])?\s*(?:\{[^{}]*\}){1,3}/g, park);
    // \left...\right
    c = c.replace(/\\left[\s\S]*?\\right(?:[).\]}|]|\\\}|\\.|)/g, park);
    return c;
  }

  function fixWordSpacingChunk(chunk) {
    if (!chunk || /<img\b/i.test(chunk)) return chunk;
    if (/^<[^>]+>$/.test(String(chunk).trim())) return chunk;
    if (/katex/i.test(String(chunk)) && /class\s*=/.test(String(chunk))) return chunk;

    // If this chunk is mostly LaTeX, only repair command spaces — no English glue
    const raw0 = String(chunk);
    if ((raw0.match(/\\[a-zA-Z]+/g) || []).length >= 2 || /\\begin\s*\{/.test(raw0)) {
      return repairLatexCommandSpaces(raw0);
    }

    const SUB = "\u2080-\u2089";
    const CHEM_FORMULA = new RegExp(
      "[A-Z][a-z]?(?:[" + SUB + "0-9]+)?(?:[A-Z][a-z]?(?:[" + SUB + "0-9]+)?)+|[A-Z][a-z]?(?:[" + SUB + "]+|[0-9]{1,3})",
      "g"
    );

    let c = raw0
      .replace(/[\u200B-\u200D\uFEFF\u2060\u00AD]/g, "")
      .replace(/[\u00A0\u202F\u2007\u2009]/g, " ");

    c = repairLatexCommandSpaces(c);

    const slots = [];
    c = parkLatexIslands(c, slots);

    // Park chem formulas (not Co+nstant — require digit/subscript or 3+ caps)
    c = c.replace(CHEM_FORMULA, (m) => {
      if (m.length < 2) return m;
      const hasDigit = /[0-9\u2080-\u2089]/.test(m);
      const caps = (m.match(/[A-Z]/g) || []).length;
      if (!hasDigit && caps < 3) return m;
      const key = "\uE200" + slots.length + "\uE201";
      slots.push(m);
      return key;
    });

    c = healBrokenEnglishWords(c);
    try { c = unglueLowercaseMathProse(c); } catch (_) { /* */ }

    // Normalize List labels (column matching headers)
    c = c.replace(/\bList\s*[-–]?\s*II\b/gi, "List-II");
    c = c.replace(/\bList\s*[-–]?\s*I\b/gi, "List-I");

    // English stems glued to Capital / function letter+(
    c = c.replace(/\bLet(?=[A-Z])/g, "Let ");
    c = c.replace(/\bGiven(?=[A-Z])/g, "Given ");
    c = c.replace(/\bSuppose(?=[A-Za-z])/g, "Suppose ");
    c = c.replace(/\bThen(?=[A-Z])/g, "Then ");
    c = c.replace(/\bFind(?=[A-Z])/g, "Find ");
    c = c.replace(/\bShow(?=[A-Z])/g, "Show ");
    c = c.replace(/\bProve(?=[A-Z])/g, "Prove ");
    c = c.replace(/\bMatch(?=[A-Z])/g, "Match ");
    c = c.replace(/\bChoose(?=[A-Z])/g, "Choose ");
    c = c.replace(/\bCorrect(?=[A-Z])/g, "Correct ");
    c = c.replace(/\bFollowing(?=[A-Z])/g, "Following ");
    c = c.replace(/\bCorresponding(?=[A-Z])/g, "Corresponding ");
    c = c.replace(
      /\b(then|when|where|while|hence|thus|also|else|since|after|before)(?=[a-z]\()/gi,
      "$1 "
    );
    c = c.replace(/\bsatisfies(?=[a-z]\()/gi, "satisfies ");
    c = c.replace(/\bsatisfy(?=[a-z]\()/gi, "satisfy ");
    c = c.replace(/\bdefine(?=[a-z]\()/gi, "define ");
    c = c.replace(/\bconsider(?=[a-z]\()/gi, "consider ");
    c = c.replace(/([a-z]{4,})([a-z])\(/g, "$1 $2(");

    c = c.replace(/(\d)(and|or|then|if|when|where|with|from|to|by|of|as)(?=[a-zA-Z])/gi, "$1 $2");
    c = c.replace(/([\]\}])([A-Za-z])/g, "$1 $2");
    c = c.replace(/\b(and|or|then|if|when|where|with|from|to|by|of|as|so|that)(fog|gof|fof|gog)\b/gi, "$1 $2");
    c = c.replace(/\b(and|or|of|to|by|if|as)(?=[a-z]\()/gi, "$1 ");

    c = c.replace(GLUE_WORDS_CAP_RE, "$1 ");

    // qxproof2: park unit tokens so ([a-z])([A-Z]) does not split MeV → Me V
    const UNIT_PARK = [];
    c = c.replace(/\b(?:MeV|keV|GeV|TeV|eV|mV|kV|MV|GV|mA|kA|MA|mW|kW|MW|GW|mHz|kHz|MHz|GHz)\b/g, (m) => {
      UNIT_PARK.push(m);
      return "\uE210" + (UNIT_PARK.length - 1) + "\uE211";
    });

    c = c.replace(/([a-z])([A-Z])/g, "$1 $2");
    c = c.replace(/\uE210(\d+)\uE211/g, (_, i) => UNIT_PARK[+i] || "");
    c = c.replace(
      /(^|[^A-Za-z])(Mn|Fe|Cu|Zn|Ca|Na|Cl|Br|Mg|Ni|Cr|Pb|Ag|Au|Pt|Hg|Sn|Si|Ti)(bridge|oxide|ion|ous|ic|ate|ide)\b/g,
      "$1$2 $3"
    );

    c = c.replace(/\)([A-Za-z])/g, ") $1");
    c = c.replace(/([a-z])(\d)(?![\d}])/g, "$1 $2");
    c = c.replace(/(\d)([a-z])/g, "$1 $2");

    c = c.replace(/,([^\s\d\uE200])/g, ", $1");
    // OCR: "1  ,  3  ,  5" → "1, 3, 5"
    c = c.replace(/(\d)\s+,\s+/g, "$1, ");
    c = c.replace(/,\s{2,}/g, ", ");
    if (!/class\s*=|katex/i.test(c)) {
      c = c.replace(/([A-Za-z0-9])=([A-Za-z0-9.\-])/g, "$1 = $2");
    }
    c = c.replace(/([A-Za-z0-9]):([A-Za-z])/g, "$1: $2");
    c = c.replace(/([A-Za-z0-9\]])\s*(→|⇒|⟶|∘)\s*/g, "$1 $2 ");
    c = c.replace(/\s*\/\s*/g, "/");
    c = c.replace(/\bis\/are\b/gi, "is/are");
    c = c.replace(/[ \t]{2,}/g, " ");
    c = c.replace(/\s+([,.;:!?])/g, "$1");

    // Restore parks
    c = c.replace(/\uE200(\d+)\uE201/g, (_, i) => slots[+i] || "");
    c = repairLatexCommandSpaces(c);
    c = healBrokenEnglishWords(c);
    try { c = unglueLowercaseMathProse(c); } catch (_) { /* */ }
    c = c.replace(/[ \t]{2,}/g, " ");
    return c;
  }

  function fixWordSpacing(s) {
    if (!s) return s;
    const str = String(s);
    // HTML: only rewrite text nodes between tags (never attributes / tags)
    if (/<[a-zA-Z][^>]*>/.test(str)) {
      let out = str.replace(/(>)([^<]*)(<)/g, (_, a, text, b) => {
        if (!text || !/[A-Za-z]/.test(text)) return a + text + b;
        return a + replaceOutsideMathFn(text, fixWordSpacingChunk) + b;
      });
      // Leading / trailing plain text outside tags
      out = out.replace(/^([^<]+)/, (m, text) => {
        if (/</.test(m)) return m;
        return replaceOutsideMathFn(text, fixWordSpacingChunk);
      });
      out = out.replace(/>([^<]+)$/, (m, text) => ">" + replaceOutsideMathFn(text, fixWordSpacingChunk));
      return out;
    }
    return replaceOutsideMathFn(str, fixWordSpacingChunk);
  }

  /** Walk live DOM after paint — within-node + BETWEEN-node glues (Let|A spans) */
  function fixSpacingInDom(root) {
    const el = root || document.getElementById("app-main") || document.body;
    if (!el || !el.querySelectorAll) return;
    const hosts = el.querySelectorAll(
      ".mtk-q-text, .qx-q-text-only, .mtk-opt-text, .qx-prac-opt-text, .qa-q, .qx-prac-q, " +
      ".qx-content, .sol-body, .qx-sol-body, .q-text, .qx-q-seg-text, .qx-marks-native-q, " +
      ".qx-marks-native-opt, .allen-q-body, .mtk-numerical, .qx-prac-correct-ans, .allen-q-body"
    );
    const list = hosts.length ? hosts : [el];
    const skipSel = "script, style, .katex, .katex-html, mjx-container, .MathJax, " +
      ".qx-diagram-slot, #qxDiagramSlot, .qx-fig, .mathjax_ignore, .tex2jax_ignore, code, pre, " +
      "mjx-assistive-mml, annotation, math, mi, mo, mn, mrow, msup, msub, mfrac, msqrt, mfenced";

    function acceptText(node) {
      if (!node || node.nodeValue == null) return NodeFilter.FILTER_REJECT;
      const p = node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (p.closest(skipSel)) return NodeFilter.FILTER_REJECT;
      if (p.closest("mjx-container, .katex, annotation")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }

    list.forEach((host) => {
      if (!host || (host.closest && host.closest(skipSel))) return;

      // 1) Fix each text node
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, { acceptNode: acceptText });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((n) => {
        const before = n.nodeValue;
        const after = fixWordSpacingChunk(before);
        if (after !== before) n.nodeValue = after;
      });

      // 2) Insert missing space BETWEEN adjacent text nodes (e.g. <span>Let</span><span>A</span>)
      for (let i = 1; i < nodes.length; i++) {
        const prev = nodes[i - 1];
        const cur = nodes[i];
        if (!prev || !cur || !prev.nodeValue || !cur.nodeValue) continue;
        // Only if no element with visible text sits between in the same host
        const a = prev.nodeValue;
        const b = cur.nodeValue;
        if (/\s$/.test(a) || /^\s/.test(b)) continue;
        const end = a.slice(-1);
        const start = b.charAt(0);
        // f(1) style — single letter then (
        if (/[a-zA-Z]$/.test(a) && a.replace(/\s/g, "").length <= 2 && start === "(") continue;
        // digit then digit (12)
        if (/\d$/.test(a) && /^\d/.test(b)) continue;
        // letter|digit|)}  +  letter|({[
        const need =
          (/[a-zA-Z0-9}\])]/.test(end) && /[a-zA-Z({\[]/.test(start)) ||
          (/[a-z]/.test(end) && /[A-Z]/.test(start)) ||
          (/[}\]]/.test(end) && /[a-zA-Z]/.test(start));
        if (need) cur.nodeValue = " " + b;
      }

      // 3) Merge host full text once more if still obviously broken
      try {
        const plain = (host.textContent || "");
        if (/\bLet[A-Z]|satisfy[a-z]\(|satisfies[a-z]\(|\bSuppos\s+e\b|[}\]][a-zA-Z]/.test(plain)) {
          // Re-walk text nodes after adjacent inserts
          nodes.forEach((n) => {
            if (!n.parentNode) return;
            const after = fixWordSpacingChunk(n.nodeValue || "");
            if (after !== n.nodeValue) n.nodeValue = after;
          });
        }
      } catch (_) { /* */ }
    });
  }

  function normalizeLatex(s) {
    let out = String(s || "");
    try { out = convertAllMathML(out); } catch (_) { /* */ }
    try { out = unglueTexFromWords(out); } catch (_) { /* */ }
    out = repairBrokenLatex(out);
    // Probability / matrix arrays → HTML tables BEFORE other math passes strip \\
    try { out = latexMatchArrayToHtml(out); } catch (e) { /* */ }
    try { out = decodeEntitiesInMath(out); } catch (e) { /* */ }
    try { out = repairLatexCommandSpaces(out); } catch (e) { /* */ }
    try { out = piecewiseAlignedToCases(out); } catch (e) { /* */ }
    try { out = promoteCasesToDisplay(out); } catch (e) { /* */ }
    // Second pass: currency after chem/dollar tweaks may reappear as broken math
    out = repairCurrencyAndPlainNumbers(out);
    out = fixChemNotation(out);
    out = repairCurrencyAndPlainNumbers(out);
    // Word spacing before math upgrades (plain text stems from Marks)
    try { out = fixWordSpacing(out); } catch (e) { /* */ }
    try { out = decodeEntitiesInMath(out); } catch (e) { /* */ }
    try { out = repairLatexCommandSpaces(out); } catch (e) { /* */ }
    try { out = promoteCasesToDisplay(out); } catch (e) { /* */ }
    // Plain JEE math → LaTeX (log base, fractions, powers) BEFORE delimiter wrap
    try { out = upgradePlainMathNotation(out); } catch (e) { console.warn("upgradePlainMath", e); }
    // Inverse trig leftovers — ALWAYS wrap in $…$ (bare \sin^{-1} shows raw on screen)
    out = out.replace(/\b(tan|sin|cos|cot|sec|csc)\s*[-–]?\s*1\s*\/\s*(\d+)/gi, (_, fn, n) => `$\\${fn.toLowerCase()}^{-1}${n}$`);
    out = replaceOutsideMathFn(out, (chunk) =>
      chunk.replace(
        /\b(tan|sin|cos|cot|sec|csc)\s*\^\s*\{?\s*-1\s*\}?/gi,
        (_, fn) => `$\\${fn.toLowerCase()}^{-1}$`
      )
    );
    // Bare \sin^{-1}(...) already without $ (from bad exports) → wrap whole call
    out = replaceOutsideMathFn(out, (chunk) => {
      if (!/\\(sin|cos|tan|cot|sec|csc)\^\{-1\}/.test(chunk) && !/\\(sin|cos|tan)\^\{?\d/.test(chunk)) return chunk;
      let c = chunk;
      // \sin^{-1}( ... ) with nested parens
      c = c.replace(
        /\\(sin|cos|tan|cot|sec|csc)\^\{-1\}\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g,
        (_, fn, arg) => `$\\${fn}^{-1}\\left(${arg}\\right)$`
      );
      // \sin^2 x
      c = c.replace(
        /\\(sin|cos|tan|cot|sec|csc)\^\{?(\d+)\}?\s*([a-zA-Z])/g,
        (_, fn, n, v) => `$\\${fn}^{${n}} ${v}$`
      );
      // leftover bare \sin^{-1}
      c = c.replace(/\\(sin|cos|tan|cot|sec|csc)\^\{-1\}/g, (_, fn) => `$\\${fn}^{-1}$`);
      return c;
    });
    try { out = piecewiseAlignedToCases(out); } catch (e) { /* */ }
    out = ensureMathDelimiters(out);
    try { out = healShatteredTex(out); } catch (e) { /* */ }
    // Wrap repaired \frac...\left...\right blocks still outside $…$
    out = replaceOutsideMathFn(out, (chunk) => {
      if (!/\\frac|\\left|\\sqrt|\\textbf|\\mathrm|\\mathbf/.test(chunk)) return chunk;
      return chunk.replace(
        /(\\frac\s*\{[^{}]*\}\s*\{[^{}]*\}(?:\s*\\left[\s\S]*?\\right(?:\)|\]|\\\}))?)/g,
        (m) => {
          if (/^\$/.test(m) || /\$\s*$/.test(m)) return m;
          return `$${m}$`;
        }
      );
    });
    // Strip only TRUE orphan opening $… at EOS (never eat a CLOSING $ of real math).
    // Bug was: `$\text{C}_2…\text{H}_5$ (D).` lost the last $ because ` (D).` matched the old rule.
    out = out.replace(/\$((?:\s|[A-Za-z0-9\-–—=().+/]|<[^>]+>)+)$/g, (m, rest, offset, full) => {
      if (/\\[a-zA-Z]/.test(rest)) return m;
      const before = full.slice(0, offset);
      const n = (before.match(/\$/g) || []).length;
      // Odd count before this $ ⇒ it closes a math span — keep it
      if (n % 2 === 1) return m;
      return rest;
    });
    out = protectMathComparisons(out);
    return out;
  }

  /**
   * Repair broken List-I / List-II match tables + normalize figure/cell layout.
   * Handles nested unclosed <td>(P) <td>(1)…, missing </td>, and cell images.
   */
  function repairMatchListTableHtml(s) {
    let out = String(s || "");
    if (!/<table/i.test(out)) return out;

    // Per-table repair
    out = out.replace(/<table(\s[^>]*)?>([\s\S]*?)<\/table>/gi, (full, attrs, body) => {
      const probe = (body + " " + (attrs || "")).replace(/<[^>]+>/g, " ");
      const isMatch = /List[\s\-]*I/i.test(probe) || (/\([PQRS]\)/.test(body) && /\([1-5]\)/.test(body));
      if (!isMatch) return full;

      let b = body;

      // Broken bank form (24471): <td>(P) <td>(1) </tr>  without </td>
      b = b.replace(
        /<td([^>]*)>\s*(\([PQRS]\))\s*<td([^>]*)>\s*(\([1-5]\))\s*<\/tr>/gi,
        `<td$1><span class="qx-list-lab">$2</span></td><td$3><span class="qx-list-lab">$4</span></td></tr>`
      );
      b = b.replace(
        /<td([^>]*)>\s*(\([PQRS]\))\s*(<img\b[^>]*>)?\s*<td([^>]*)>\s*(\([1-5]\))\s*(<img\b[^>]*>)?\s*<\/tr>/gi,
        (m, a1, lab1, img1, a2, lab2, img2) =>
          `<td${a1}><span class="qx-list-lab">${lab1}</span>${img1 || ""}</td>`
          + `<td${a2}><span class="qx-list-lab">${lab2}</span>${img2 || ""}</td></tr>`
      );

      // Close nested opens repeatedly: <td…>…content…<td…>  →  <td…>…</td><td…>
      for (let i = 0; i < 12; i++) {
        const next = b.replace(
          /<td([^>]*)>((?:(?!<\/?td\b)[\s\S])*?)<td([^>]*)>/gi,
          (m, a1, content, a2) => `<td${a1}>${content}</td><td${a2}>`
        );
        if (next === b) break;
        b = next;
      }

      // Label+img without close then next td: (P) <img> <td
      b = b.replace(
        /<td([^>]*)>\s*(\([PQRS]\))\s*(<img\b[^>]*(?:\/)?>)?\s*<td([^>]*)>/gi,
        (m, a, lab, img, b2) => `<td${a}>${lab}${img || ""}</td><td${b2}>`
      );
      b = b.replace(
        /<td([^>]*)>\s*(\([1-5]\))\s*(<img\b[^>]*(?:\/)?>)?\s*<td([^>]*)>/gi,
        (m, a, lab, img, b2) => `<td${a}>${lab}${img || ""}</td><td${b2}>`
      );

      // Unclosed cell before </tr>
      b = b.replace(/<td([^>]*)>((?:(?!<\/td>)[\s\S])*?)<\/tr>/gi, (m, a, content) => {
        if (/<\/td>/i.test(content)) return m;
        return `<td${a}>${content}</td></tr>`;
      });

      // Orphan open before </tr> (plain text only)
      b = b.replace(/<td([^>]*)>([^<]*)<\/tr>/gi, (m, a, bodyTxt) => {
        if (/<\/td>/i.test(m)) return m;
        return `<td${a}>${bodyTxt}</td></tr>`;
      });

      // Normalize List-I / List-II header text
      b = b.replace(/>\s*List\s*[-–]?\s*II\s*</gi, ">List-II<");
      b = b.replace(/>\s*List\s*[-–]?\s*I\s*</gi, ">List-I<");

      // Cell images: consistent sizing (column-matching figures)
      b = b.replace(/<img\b([^>]*)>/gi, (m, imgAttrs) => {
        let a = String(imgAttrs || "");
        a = a.replace(/\s(?:width|height)\s*=\s*(["']?)[^"'>\s]+\1/gi, "");
        if (/class\s*=/i.test(a)) {
          a = a.replace(/class\s*=\s*(["'])([^"']*)\1/i, (mm, q, cls) =>
            /qx-match-fig/.test(cls) ? mm : `class=${q}${cls} qx-match-fig${q}`
          );
        } else {
          a += ' class="qx-match-fig"';
        }
        const figStyle =
          "max-width:min(100%,320px);width:auto;height:auto;display:block;margin:8px auto 0;object-fit:contain";
        if (/style\s*=/i.test(a)) {
          a = a.replace(/style\s*=\s*(["'])([^"']*)\1/i, (mm, q, st) => {
            let st2 = String(st || "")
              .replace(/max-width\s*:\s*[^;]+;?/gi, "")
              .replace(/width\s*:\s*[^;]+;?/gi, "")
              .replace(/height\s*:\s*[^;]+;?/gi, "")
              .replace(/display\s*:\s*[^;]+;?/gi, "")
              .replace(/margin\s*:\s*[^;]+;?/gi, "")
              .replace(/object-fit\s*:\s*[^;]+;?/gi, "")
              .trim();
            if (st2 && !/;\s*$/.test(st2)) st2 += ";";
            return `style=${q}${figStyle};${st2}${q}`;
          });
        } else {
          a += ` style="${figStyle}"`;
        }
        return `<img${a}>`;
      });

      // Emphasize (P)/(1) labels at cell start (skip MathML cells)
      b = b.replace(
        /(<td[^>]*>)\s*(\([PQRS1-5]\))\s*(?=<img\b|\$|\\|\()/gi,
        "$1<span class=\"qx-list-lab\">$2</span> "
      );

      const firstRow = (b.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/i) || [""])[0];
      const colN = (firstRow.match(/<t[dh]\b/gi) || []).length;
      const extra4 = colN >= 4 ? " qx-match-4col" : "";
      const cls = /class\s*=/i.test(attrs || "")
        ? String(attrs).replace(/class\s*=\s*(["'])([^"']*)\1/i, (mm, q, c) => {
            let next = c;
            if (!/qx-match-list/.test(next)) next += " qx-match-list";
            if (extra4 && !/qx-match-4col/.test(next)) next += extra4;
            return `class=${q}${next}${q}`;
          })
        : `${attrs || ""} class="qx-match-list${extra4.trim() ? extra4 : ""}"`;
      return `<table${cls}>${b}</table>`;
    });

    // Leftover math closers after a table was injected into $…$ (old xrightarrow bug)
    out = out.replace(/<\/table>(?:\s*\}\s*\$)+/gi, "</table>");
    out = out.replace(/(<\/table>)(?:\s*\$\s*)+/gi, "$1");
    return out;
  }

  /** Match options: P → 2; Q → 1 — uniform spacing + visible arrows (unicode, no KaTeX needed) */
  function formatMatchOptionText(s) {
    let c = String(s || "");
    if (!/\b[PQRS]\b/.test(c) || !/\d/.test(c)) return c;
    // Collapse double-escaped TeX from JSON/Marks: \\rightarrow → \rightarrow
    c = c.replace(/\\{2,}([a-zA-Z]+)/g, "\\$1");
    // HTML entities / nbsp between letter and arrow
    c = c.replace(/&nbsp;|&#160;|\u00a0/gi, " ");
    // All arrow forms → clean unicode arrow (always renders; fixes screenshot 785 bare \rightarrow)
    // P \rightarrow 2 | P $\rightarrow$ 2 | P → 2 | P \to 2 | P --> 2
    c = c.replace(
      /\b([PQRS])\s*(?:→|⟶|⇒|⟹|⟶|-->|->|\\(?:Long|long)?(?:rightarrow|leftarrow|to|Rightarrow|mapsto)|\$\s*\\(?:Long|long)?(?:rightarrow|leftarrow|to|Rightarrow|mapsto)\s*\$)\s*(\d)/g,
      "$1 → $2"
    );
    // Bare "P rightarrow 2" if backslash was stripped
    c = c.replace(/\b([PQRS])\s+(?:long)?rightarrow\s+(\d)/gi, "$1 → $2");
    c = c.replace(/\s*;\s*/g, "; ");
    c = c.replace(/\s*,\s*/g, ", ");
    c = c.replace(/[ \t]{2,}/g, " ");
    return c.trim();
  }

  /** Soften complex reaction TeX in List-II cells (substack/array → readable). */
  function simplifyMatchCellLatex(html) {
    let h = rewriteReactionArrowArrays(String(html || ""));
    h = h.replace(/\\xrighttarrow/g, "\\rightarrow");
    return h;
  }

  /**
   * True when List-I/II table has only labels — no structures/text/images.
   */
  function matchTableIsLabelOnly(table) {
    if (!table) return true;
    const html = table.innerHTML || "";
    if (/<img\b/i.test(html)) return false;
    const plain = (table.textContent || "")
      .replace(/List\s*[-–]?\s*I{1,2}/gi, " ")
      .replace(/\([PQRS1-5]\)/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return plain.length < 8;
  }

  /**
   * Marks-style plate: one full List-I/II figure under the stem (common Adv bank form).
   */
  function promoteStemMatchFigures(root) {
    const el = root || document;
    if (!el || !el.querySelectorAll) return;
    el.querySelectorAll(".mtk-q-text, .qx-prac-q, .qx-question-body, .qx-content").forEach((host) => {
      if (!host || host.dataset.qxMatchPlate === "1") return;
      if (host.closest && host.closest(".qx-match-q-body, .qx-inline-table-figs")) return;
      const liveTable = host.querySelector("table");
      if (liveTable && !matchTableIsLabelOnly(liveTable)) return;
      const imgs = Array.from(host.querySelectorAll("img")).filter((img) => {
        if (!img || !img.getAttribute("src")) return false;
        if (img.closest(".qx-match-grid, .qx-match-item, .qx-opt-diagram-slot")) return false;
        const src = img.getAttribute("src") || "";
        return /cdn-question-pool|cdn\.quizrr|\/pyq\/|proxy-image|assets\/diagrams/i.test(src);
      });
      // Single large plate (or 1 plate + empty table) → Marks native figure
      const tables = host.querySelectorAll("table");
      const emptyTables = Array.from(tables).filter(matchTableIsLabelOnly);
      if (imgs.length === 1 && (tables.length === 0 || emptyTables.length === tables.length)) {
        host.dataset.qxMatchPlate = "1";
        const img = imgs[0];
        img.classList.add("qx-match-plate-img", "qx-pool-fig", "qx-no-wm");
        img.removeAttribute("width");
        img.removeAttribute("height");
        const plate = document.createElement("div");
        plate.className = "qx-match-plate";
        img.parentNode.insertBefore(plate, img);
        plate.appendChild(img);
        // Hide empty label-only tables under the plate
        emptyTables.forEach((t) => {
          t.style.display = "none";
          t.setAttribute("aria-hidden", "true");
        });
      } else if (imgs.length >= 2) {
        // Multiple figures in stem — wrap in horizontal Marks strip
        host.dataset.qxMatchPlate = "1";
        const strip = document.createElement("div");
        strip.className = "qx-match-fig-strip";
        imgs.forEach((img) => {
          img.classList.add("qx-match-plate-img", "qx-pool-fig", "qx-no-wm");
          img.removeAttribute("width");
          img.removeAttribute("height");
          const cell = document.createElement("div");
          cell.className = "qx-match-fig-strip-item";
          img.parentNode.insertBefore(cell, img);
          cell.appendChild(img);
          strip.appendChild(cell);
        });
        const anchor = host.querySelector("table") || host.lastChild;
        if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(strip, anchor);
        else host.appendChild(strip);
      }
    });
  }

  /**
   * Rebuild List-I / List-II into Marks-style 2-column cards WITH cell content/images.
   * Broken bank HTML: <td>(P) <td>(1) </tr> — labels only → skip empty cards, hydrate instead.
   */
  function rebuildMatchListAsCards(table) {
    if (!table || !table.rows || table.dataset.qxMatchRebuilt === "1") return false;
    const rows = Array.from(table.rows || []);
    if (rows.length < 2) return false;

    const listI = [];
    const listII = [];

    function pinPoolImgs(html) {
      return String(html || "").replace(/<img\b([^>]*)>/gi, (full, attrs) => {
        let a = String(attrs || "");
        const sm = a.match(/\bsrc\s*=\s*(["'])([^"']*)\1/i);
        let src = sm ? sm[2] : "";
        if (!src) return full;
        src = src
          .replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/")
          .replace(/https?:\/\/cdn-question-pool\.app\//gi, "https://cdn-question-pool.getmarks.app/");
        if (/proxy-image|restore-image/i.test(src)) {
          try {
            const u = new URL(src, "https://www.quantrexacademy.com");
            const inner = u.searchParams.get("url");
            if (inner) src = inner;
          } catch (_) { /* */ }
        }
        const orig = src.split("?")[0] || src;
        const isPool = /cdn-question-pool|cdn\.quizrr|\/pyq\/|watermarked_images|getmarks\.app/i.test(orig);
        const disp = isPool
          ? ((typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc)
            ? QxOwnedFigs.displaySrc(orig)
            : "/api/proxy-image?url=" + encodeURIComponent(orig) + "&clean=1&v=qxfig110")
          : orig;
        const safe = disp.replace(/"/g, "&quot;");
        const safeOrig = orig.replace(/"/g, "&quot;");
        return `<img class="qx-pool-fig qx-match-fig qx-no-wm qx-fig-ready qx-wm-clean" src="${safe}" data-qx-orig-src="${safeOrig}" alt="" loading="eager" decoding="async" style="max-width:min(100%,260px);max-height:150px;width:auto;height:auto;display:block;margin:6px auto;object-fit:contain;background:#fff;border-radius:8px">`;
      });
    }
    function cellBodyHtml(cell) {
      if (!cell) return "";
      let h = String(cell.innerHTML || "");
      // ONLY remove exact leading labels (P)/(1)/A)/P) — never bare S/R inside words
      h = h.replace(/^\s*(?:&nbsp;|\s)*/, "");
      h = h.replace(/^\s*\(([A-DTPQRS1-5])\)\s*(?=<img\b|\$|\\|<math|[A-Za-z(])/i, "");
      h = h.replace(/^\s*([A-DTPQRS1-5])\)\s*(?=<img\b|\$|\\|<math|[A-Za-z(])/i, "");
      h = h.replace(/^\s*<span[^>]*qx-list-lab[^>]*>\s*\(?[A-DTPQRS1-5]\)?\s*<\/span>\s*/i, "");
      // Also strip label-only text nodes before img: (P)&nbsp;<img
      h = h.replace(/^\s*\(([A-DTPQRS1-5])\)\s*(?:&nbsp;|\s)*/i, "");
      // Clean proxy for pool figures (no Marks watermark)
      if (/<img\b/i.test(h)) return pinPoolImgs(h).trim();
      h = simplifyMatchCellLatex(h);
      return h.trim();
    }
    /** Label from cell text OR leading (P)/(1) in HTML */
    function labFromCell(cell, preferNum) {
      if (!cell) return "";
      const t = (cell.textContent || "").replace(/\s+/g, " ").trim();
      let m = t.match(/^\(([PQRS1-5A-D])\)/i) || t.match(/^([PQRS1-5A-D])\)/);
      if (m) return "(" + String(m[1]).toUpperCase() + ")";
      const h = String(cell.innerHTML || "");
      m = h.match(/^\s*\(([PQRS1-5A-D])\)/i) || h.match(/^\s*([PQRS1-5A-D])\)/);
      if (m) return "(" + String(m[1]).toUpperCase() + ")";
      if (preferNum) {
        m = t.match(/\(([1-5])\)/) || h.match(/\(([1-5])\)/);
        if (m) return "(" + m[1] + ")";
      } else {
        m = t.match(/\(([PQRS])\)/i) || h.match(/\(([PQRS])\)/i);
        if (m) return "(" + String(m[1]).toUpperCase() + ")";
      }
      return "";
    }

    /**
     * Parse List labels used by real JEE Adv / Marks banks:
     * (A) A) A.  |  (P) P)  |  (1) 1)  — never bare letters inside words.
     */
    function parseListLab(text) {
      const t = String(text || "").replace(/\s+/g, " ").trim();
      if (!t || t.length > 12) return null;
      // (A) (P) (1) (T)
      let m = t.match(/^\(([A-DT]|[PQRS]|[1-5])\)$/i);
      if (m) return String(m[1]).toUpperCase();
      // A) P) 1) T)
      m = t.match(/^([A-DT]|[PQRS]|[1-5])\)$/i);
      if (m) return String(m[1]).toUpperCase();
      // A. P. 1.
      m = t.match(/^([A-DT]|[PQRS]|[1-5])\.$/i);
      if (m) return String(m[1]).toUpperCase();
      // pure single token
      m = t.match(/^([A-DT]|[PQRS]|[1-5])$/i);
      if (m) return String(m[1]).toUpperCase();
      return null;
    }
    function fmtLab(lab) {
      return lab ? "(" + lab + ")" : "";
    }

    rows.forEach((tr) => {
      const cells = Array.from(tr.cells || []);
      if (!cells.length) return;
      const texts = cells.map((c) => (c.textContent || "").replace(/\s+/g, " ").trim());
      const joined = texts.join(" | ");
      if (/list\s*[-–]?\s*i\b/i.test(joined) && /list\s*[-–]?\s*ii\b/i.test(joined)) return;
      if (texts.every((t) => !t || t === "\u00a0")) return;

      // 4-col: A) | content | P) | content  OR  (P) | content | (1) | content
      if (cells.length >= 4) {
        const labI = parseListLab(texts[0]);
        const labII = parseListLab(texts[2]);
        // Content is ALWAYS the dedicated content cell (1 and 3), never strip word-initial letters
        let bodyI = cellBodyHtml(cells[1]);
        let bodyII = cellBodyHtml(cells[3]);
        // If content cell empty but label cell has more than label (rare), take remainder
        if (!bodyI && cells[0]) {
          const t = texts[0].replace(/^\(?[A-DTPQRS1-5]\)?[.)]?\s*/i, "").trim();
          if (t.length > 1) bodyI = cellBodyHtml(cells[0]);
        }
        if (!bodyII && cells[2]) {
          const t = texts[2].replace(/^\(?[A-DTPQRS1-5]\)?[.)]?\s*/i, "").trim();
          if (t.length > 1) bodyII = cellBodyHtml(cells[2]);
        }
        if (labI || bodyI) {
          listI.push({ lab: fmtLab(labI), html: bodyI });
        }
        if (labII || bodyII) {
          listII.push({ lab: fmtLab(labII), html: bodyII });
        }
        return;
      }

      // 2-col: (P) + structure | (1) + structure  (Marks / Quizrr bank form)
      if (cells.length === 2) {
        const t0 = texts[0];
        const t1 = texts[1];
        const hasImg0 = !!(cells[0].querySelector && cells[0].querySelector("img"));
        const hasImg1 = !!(cells[1].querySelector && cells[1].querySelector("img"));
        const html0 = cells[0].innerHTML || "";
        const html1 = cells[1].innerHTML || "";
        const looksI = hasImg0 || /^\([PQRS]\)/i.test(t0) || /^\([A-D]\)/i.test(t0)
          || /\$|\\|<img\b|<math/i.test(html0);
        const looksII = hasImg1 || /^\([1-5]\)/.test(t1) || /^\([PQRS]\)/i.test(t1)
          || /\$|\\|<img\b|<math/i.test(html1) || (t1 && t1.length > 2);

        if (looksI) {
          listI.push({ lab: labFromCell(cells[0], false), html: cellBodyHtml(cells[0]) });
        }
        if (looksII) {
          listII.push({ lab: labFromCell(cells[1], true), html: cellBodyHtml(cells[1]) });
        }
      }
    });

    if (listI.length + listII.length < 2) return false;

    // Label-only empty columns → do NOT paint empty cards; mark for hydrate
    const hasContent = [...listI, ...listII].some((it) => {
      const h = String(it.html || "");
      return /<img\b/i.test(h) || h.replace(/<[^>]+>/g, " ").trim().length > 2;
    });
    if (!hasContent) {
      table.dataset.qxMatchEmpty = "1";
      // Compact skeleton instead of blank dual columns
      const sk = document.createElement("div");
      sk.className = "qx-match-empty-skel";
      sk.innerHTML = '<div class="qx-match-empty-msg">Loading List-I / List-II structures…</div>'
        + '<div class="qx-match-empty-grid" aria-hidden="true">'
        + '<div class="qx-match-col"><div class="qx-match-col-h">List-I</div><div class="qx-match-col-body">'
        + listI.map((it) => '<div class="qx-match-item"><span class="qx-list-lab">' + (it.lab || "") + '</span><div class="qx-match-item-body qx-match-ph"></div></div>').join("")
        + '</div></div>'
        + '<div class="qx-match-col qx-match-col-ii"><div class="qx-match-col-h">List-II</div><div class="qx-match-col-body">'
        + listII.map((it) => '<div class="qx-match-item"><span class="qx-list-lab">' + (it.lab || "") + '</span><div class="qx-match-item-body qx-match-ph"></div></div>').join("")
        + '</div></div></div>';
      table.dataset.qxMatchRebuilt = "1";
      if (table.parentNode) {
        table.parentNode.insertBefore(sk, table);
        table.style.display = "none";
        table.setAttribute("aria-hidden", "true");
      }
      return true;
    }

    const colHtml = (title, items, side) => {
      const rowsHtml = items.map((it) =>
        `<div class="qx-match-item">`
        + (it.lab ? `<span class="qx-list-lab">${it.lab}</span>` : `<span class="qx-list-lab">·</span>`)
        + `<div class="qx-match-item-body qx-content">${it.html || ""}</div>`
        + `</div>`
      ).join("");
      return `<div class="qx-match-col qx-match-col-${side}">`
        + `<div class="qx-match-col-h">${title}</div>`
        + `<div class="qx-match-col-body">${rowsHtml}</div>`
        + `</div>`;
    };

    const wrap = document.createElement("div");
    wrap.className = "qx-match-grid qx-match-marks";
    wrap.innerHTML = colHtml("List-I", listI, "i") + colHtml("List-II", listII, "ii");
    table.dataset.qxMatchRebuilt = "1";
    if (table.parentNode) {
      // Remove any previous rebuild siblings
      const prev = table.parentNode.querySelectorAll(".qx-match-grid, .qx-match-empty-skel");
      prev.forEach((n) => { if (n !== wrap) n.remove(); });
      table.parentNode.insertBefore(wrap, table);
      table.style.display = "none";
      table.setAttribute("aria-hidden", "true");
      table.classList.add("qx-match-src-hidden");
    }
    return true;
  }

  /**
   * Column matching: KEEP extracted table layout (List-I | List-II as imported).
   * Do NOT rebuild into cards. Only polish borders + clean-proxy images (no Marks WM).
   */
  function pinMatchImgNoWm(img) {
    if (!img) return;
    try {
      let src = img.getAttribute("src") || "";
      let orig = img.dataset.qxOrigSrc || src;
      if (/proxy-image|restore-image/i.test(orig)) {
        try {
          const u = new URL(orig, location.origin);
          const inner = u.searchParams.get("url");
          if (inner) orig = decodeURIComponent(inner);
        } catch (_) { /* */ }
      }
      if (/proxy-image|restore-image/i.test(src)) {
        try {
          const u = new URL(src, location.origin);
          const inner = u.searchParams.get("url");
          if (inner) orig = decodeURIComponent(inner);
        } catch (_) { /* */ }
      }
      orig = String(orig || "")
        .replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/")
        .split("?")[0];
      if (!/cdn-question-pool|cdn\.quizrr|\/pyq\/|watermarked_images|getmarks\.app/i.test(orig + " " + src)) {
        img.classList.add("qx-match-fig", "qx-pool-fig", "qx-no-wm");
        img.style.maxWidth = "min(100%, 280px)";
        img.style.maxHeight = "160px";
        img.style.width = "auto";
        img.style.height = "auto";
        img.style.display = "block";
        img.style.margin = "4px auto";
        img.style.objectFit = "contain";
        img.style.background = "#fff";
        img.removeAttribute("width");
        img.removeAttribute("height");
        return;
      }
      const stored = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.ownedFigureUrl)
        ? (QxOwnedFigs.ownedFigureUrl(orig) || orig)
        : orig;
      img.dataset.qxOrigSrc = stored;
      if (/\/api\/proxy-image/i.test(src) && /clean=1/i.test(src) && !/getmarks|quizrr/i.test(src)) {
        img.classList.add("qx-match-fig", "qx-pool-fig", "qx-no-wm", "qx-wm-clean");
      } else {
        const proxy = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc)
          ? QxOwnedFigs.displaySrc(orig)
          : "/api/proxy-image?url=" + encodeURIComponent(stored) + "&clean=1&v=qxfig110";
        if (proxy && src !== proxy) {
          img.removeAttribute("crossorigin");
          img.crossOrigin = null;
          img.setAttribute("src", proxy);
        }
        img.classList.add("qx-match-fig", "qx-pool-fig", "qx-no-wm", "qx-wm-clean");
      }
      img.style.maxWidth = "min(100%, 280px)";
      img.style.maxHeight = "160px";
      img.style.width = "auto";
      img.style.height = "auto";
      img.style.display = "block";
      img.style.margin = "4px auto";
      img.style.objectFit = "contain";
      img.style.background = "#fff";
      img.style.opacity = "1";
      img.style.visibility = "visible";
      img.removeAttribute("width");
      img.removeAttribute("height");
    } catch (_) { /* */ }
  }

  function beautifyMatchTablesInDom(root) {
    const el = root || document.getElementById("app-main") || document.body;
    if (!el || !el.querySelectorAll) return;

    try {
      el.querySelectorAll("td, th").forEach((cell) => {
        const t = String(cell.textContent || "").replace(/\s+/g, " ").trim();
        if (/^\[\s*[\d.]+\s*pt\s*\]$/.test(t)) {
          cell.textContent = "";
        }
      });
    } catch (_) { /* */ }

    // Remove any OLD card rebuild leftovers — restore original extracted tables
    el.querySelectorAll(".qx-match-grid, .qx-match-empty-skel").forEach((n) => {
      try { n.remove(); } catch (_) { /* */ }
    });
    el.querySelectorAll("table.qx-match-src-hidden, table[data-qx-match-rebuilt='1']").forEach((t) => {
      t.style.display = "";
      t.removeAttribute("aria-hidden");
      t.classList.remove("qx-match-src-hidden");
      delete t.dataset.qxMatchRebuilt;
      delete t.dataset.qxMatchEmpty;
    });

    // Do NOT promote/rebuild — keep extract HTML structure as bank shipped it

    el.querySelectorAll("table").forEach((table) => {
      if (table.closest && table.closest(".qx-match-grid, .qx-match-empty-skel")) return;
      const text = table.textContent || "";
      // Only List-I/II / structure-figure tables — NOT probability math tables
      if (table.classList.contains("qx-math-array-table")) return;
      if (table.closest && table.closest(".qx-math-table-wrap")) return;
      const hasList = /List[\s\-]*I/i.test(text);
      const hasPQRS = /\([PQRS]\)/.test(text) && (/\([1-5]\)/.test(text) || /List/i.test(text));
      const hasStructImg = !!(table.querySelector && table.querySelector(
        "img[src*='watermarked'], img[src*='quizrr'], img[src*='cdn-question-pool'], img[src*='proxy-image'], img.qx-match-fig"
      ));
      const isMatch = hasList || hasPQRS || table.classList.contains("qx-match-list") || hasStructImg;
      if (!isMatch) return;

      table.classList.add("qx-match-list", "qx-match-extract");
      table.style.display = "table";
      table.style.borderCollapse = "collapse";
      table.style.width = "100%";
      table.style.maxWidth = "920px";
      table.style.tableLayout = "auto";
      table.style.margin = "12px 0";
      table.style.background = "#fff";

      const firstRow = table.querySelector("tr");
      const colN = firstRow ? firstRow.querySelectorAll("th, td").length : 2;
      if (colN >= 4) table.classList.add("qx-match-4col");
      // Extract form is usually 2-col equal List-I | List-II
      const widths = colN === 4 ? ["10%", "40%", "10%", "40%"] : (colN === 2 ? ["50%", "50%"] : null);

      Array.from(table.querySelectorAll("tr")).forEach((tr) => {
        Array.from(tr.cells || []).forEach((cell, ci) => {
          cell.style.verticalAlign = "top";
          cell.style.padding = "10px 12px";
          cell.style.border = "1px solid #cbd5e1";
          cell.style.wordBreak = "break-word";
          cell.style.overflow = "hidden";
          if (widths && widths[ci]) cell.style.width = widths[ci];
          if (cell.tagName === "TH") {
            cell.style.textAlign = "center";
            cell.style.fontWeight = "700";
            cell.style.background = "#f1f5f9";
          }
          cell.querySelectorAll("img").forEach((img) => pinMatchImgNoWm(img));
        });
      });
    });

    // Any leftover pool imgs in match body (outside tables too)
    el.querySelectorAll(
      ".qx-match-q-body img, .qx-inline-table-figs img, .mtk-q-text img, .qx-prac-q img, .qx-content img"
    ).forEach((img) => {
      const s = (img.getAttribute("src") || "") + " " + (img.dataset.qxOrigSrc || "");
      if (/cdn-question-pool|cdn\.quizrr|watermarked_images|\/pyq\/|proxy-image/i.test(s)) {
        pinMatchImgNoWm(img);
      }
    });

    // Match options: tidy P → 2
    el.querySelectorAll(".mtk-opt-text, .qx-prac-opt-text, .qa-opt .qx-content, .mtk-opt, .qx-prac-opt").forEach((host) => {
      const plain = host.textContent || "";
      if (!/\b[PQRS]\b/.test(plain) || !/\d/.test(plain)) return;
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, null);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((n) => {
        if (!n || n.nodeValue == null) return;
        if (n.parentElement && n.parentElement.closest(".katex, mjx-container, .MathJax, annotation")) return;
        const before = n.nodeValue;
        const after = formatMatchOptionText(before);
        if (after !== before) n.nodeValue = after;
      });
    });

    try { upgradeBareTexInDom(el); } catch (_) { /* */ }
  }

  /**
   * DOM pass: text nodes still showing raw \alpha \leq \rightarrow etc. get $…$ wrappers.
   * Safe outside katex/mjx; used after paint so screenshot-785 style options recover.
   */
  function upgradeBareTexInDom(root) {
    const el = root || document.getElementById("app-main") || document.body;
    if (!el || !el.querySelectorAll) return;
    const hosts = el.querySelectorAll(
      ".qx-content, .mtk-opt-text, .qx-prac-opt-text, .mtk-q-text, .q-text, " +
      ".sol-body, .qx-sol-body, .allen-q-body, .qx-prac-q, .qx-q-seg-text, " +
      ".qx-opt-text-only, .qx-q-text-only, .mtk-numerical, .qx-prac-correct-ans"
    );
    const bareRx = /\\(?:rightarrow|leftarrow|leftrightarrow|Leftrightarrow|Rightarrow|Leftarrow|longrightarrow|overrightarrow|overleftarrow|to|infty|pm|times|div|cdot|leq|geq|neq|ne|le|ge|lt|gt|approx|equiv|sim|subset|subseteq|supset|supseteq|in|notin|cup|cap|forall|exists|partial|nabla|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|nu|xi|pi|rho|sigma|tau|phi|psi|omega|Gamma|Delta|Theta|Lambda|Pi|Sigma|Phi|Psi|Omega|frac|sqrt|mathrm|mathbf|text|left|right|hat|vec|bar|sin|cos|tan|log|ln|angle|perp|parallel|emptyset|ce)\b/;
    // Also catch missing-backslash vectors: rightarrow{\mathrm{p}}
    const missingBs = /(?:^|[^\\a-zA-Z])(?:rightarrow|leftarrow|overrightarrow|vec|hat|frac|sqrt|mathrm|mathbf|left|right|subset|subseteq)\s*[\{\(\[]/;
    hosts.forEach((host) => {
      if (!host || host.closest(".katex, mjx-container, .MathJax, math")) return;
      // Full-host rewrite ONLY for pure-text hosts (no element children) — never strip <sub>/<br>/<math>
      const plain = host.textContent || "";
      const onlyText = !host.children || host.children.length === 0;
      if (onlyText && (bareRx.test(plain) || missingBs.test(plain) || /\\[a-zA-Z]+/.test(plain))) {
        try {
          let fixed = plain;
          fixed = repairBrokenLatex(fixed);
          if (/\b[PQRS]\b/.test(fixed) && /\d/.test(fixed)) fixed = formatMatchOptionText(fixed);
          fixed = ensureMathDelimiters(fixed);
          if (fixed !== plain && /\$|\\[a-zA-Z]/.test(fixed)) {
            host.textContent = fixed;
            return;
          }
        } catch (_) { /* fall through to node walk */ }
      }
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, null);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((n) => {
        if (!n || n.nodeValue == null) return;
        if (n.parentElement && n.parentElement.closest(".katex, mjx-container, .MathJax, annotation, script, style, math, mi, mo, mn, mrow")) return;
        let t = n.nodeValue;
        if (!bareRx.test(t) && !missingBs.test(t) && !/\\[a-zA-Z]+/.test(t)) return;
        try { t = repairBrokenLatex(t); } catch (_) { /* */ }
        if (/\b[PQRS]\b/.test(t) && /\d/.test(t)) t = formatMatchOptionText(t);
        try { t = ensureMathDelimiters(t); } catch (_) { /* */ }
        if (t !== n.nodeValue) n.nodeValue = t;
      });
    });
  }

  function fixBrokenHtml(s) {
    let out = restoreAngleQuoteTags(String(s || ""));
    out = out.replace(/&lt;(\/?[a-zA-Z][^&]*?)&gt;/g, "<$1>");
    out = out.replace(/‹(\/?[a-zA-Z0-9][^›]*)›/gi, "<$1>");
    out = out.replace(/&lt;br\s*\/?&gt;/gi, "<br>");
    out = out.replace(/(^|>)\s*<\/p>\s*(?=<|$)/gi, "$1");
    out = out.replace(/(^|>)\s*<p>\s*(?=<img\b)/gi, "$1");
    out = out.replace(/<\/?(?:font)(?:\s[^>]*)?>/gi, "");
    try { out = repairMatchListTableHtml(out); } catch (_) { /* */ }
    // Match-list options keep unicode arrows (P → 2). Other text: promote unicode → TeX for KaTeX.
    out = replaceOutsideMathFn(out, (chunk) => {
      if (/\b[PQRS]\b/.test(chunk) && /→|⟶/.test(chunk) && /\d/.test(chunk)) {
        // Already formatMatchOptionText'd — leave unicode arrows
        return chunk;
      }
      return chunk
        .replace(/→/g, " $\\rightarrow$ ")
        .replace(/←/g, " $\\leftarrow$ ")
        .replace(/↔/g, " $\\leftrightarrow$ ")
        .replace(/⇒/g, " $\\Rightarrow$ ");
    });
    out = replaceOutsideMath(out, /≤/g, " $\\le$ ");
    out = replaceOutsideMath(out, /≥/g, " $\\ge$ ");
    out = replaceOutsideMath(out, /≠/g, " $\\ne$ ");
    out = replaceOutsideMath(out, /≈/g, " $\\approx$ ");
    out = replaceOutsideMath(out, /·/g, " $\\cdot$ ");
    out = replaceOutsideMath(out, /×/g, " $\\times$ ");
    out = replaceOutsideMath(out, /÷/g, " $\\div$ ");
    out = replaceOutsideMath(out, /±/g, " $\\pm$ ");
    out = replaceOutsideMath(out, /°/g, "$^{\\circ}$");
    // Bare letter-order comparisons outside math: C < B < A → C $\lt$ B $\lt$ A
    out = replaceOutsideMathFn(out, (chunk) =>
      chunk
        .replace(/([A-D])\s*<\s*(?=[A-D])/g, "$1 $\\lt$ ")
        .replace(/([A-D])\s*>\s*(?=[A-D])/g, "$1 $\\gt$ ")
    );
    out = protectMathComparisons(out);
    return out;
  }

  const _htmlMemo = new Map();
  function memoHtml(key, value) {
    if (key && key.length < 10000) {
      const hollow = /\bLet\s+[.,;:]\s|\bLet\s+\.\s|Let\s+Consider/i.test(String(value || "").replace(/<[^>]+>/g, " "));
      const unrendered = /\$[^$]{1,400}\$|\\\(|\\\[/.test(String(value || ""))
        && !(typeof window !== "undefined" && window.katex && window.katex.renderToString);
      if (!hollow && !unrendered) {
        if (_htmlMemo.size >= 280) {
          const oldest = _htmlMemo.keys().next().value;
          _htmlMemo.delete(oldest);
        }
        _htmlMemo.set(key, value);
      }
    }
    return value;
  }


  /** qxmath1 — run central sanitize before any render (never store raw katex HTML) */
  function qxSanitizeIncoming(s) {
    try {
      if (typeof QxMathSanitize !== "undefined" && QxMathSanitize.normalizeMathContent) {
        return QxMathSanitize.normalizeMathContent(s).html;
      }
    } catch (_) { /* */ }
    return s;
  }

  // Render content: HTML preserved, branding stripped, plain text escaped, LaTeX intact
  function html(content) {
    if (content == null) return "";
    try { loadKatex(); } catch (_) { /* */ }
    content = qxSanitizeIncoming(content);
    const cacheKey = String(content);
    if (cacheKey.length < 10000 && _htmlMemo.has(cacheKey)) {
      const hit = _htmlMemo.get(cacheKey);
      const stillTex = /\$[^$]{1,800}\$|\\\(|\\\[/.test(hit);
      if (!stillTex) return hit;
      if (!(window.katex && window.katex.renderToString)) return hit;
      _htmlMemo.delete(cacheKey);
    }
    // Match-list placeholders — never strip or treat as branding
    const matchFigSlots = [];
    let s0 = parkAxisHyphenMath(stripLatexRowSkips(cacheKey.trim()));
    try { s0 = piecewiseAlignedToCases(s0); } catch (_) { /* */ }
    s0 = s0
      .replace(/\$\{\s*\}\s*\^\{\s*([^}]+)\s*\}\s*C_\{\s*([^}]+)\s*\}\s*\$/g, "$\\binom{$1}{$2}$")
      .replace(/\$\{\s*\^\{\s*([^}]+)\s*\}\s*C_\{\s*([^}]+)\s*\}\s*\$/g, "$\\binom{$1}{$2}$")
      .replace(/\{\s*\}\s*\^\{\s*([^}]+)\s*\}\s*C_\{\s*([^}]+)\s*\}/g, "\\binom{$1}{$2}")
      .replace(/\$\s*\^\{\s*([^}]+)\s*\}\s*C_\{\s*([^}]+)\s*\}\s*\$/g, "$\\binom{$1}{$2}$");
    s0 = s0.replace(/§§QXMATCHFIG(\d+)§§/g, (m, i) => {
      matchFigSlots.push(m);
      return `QXMATCHFIGPLACEHOLDER${i}END`;
    });
    let s = stripBranding(fixBrokenImgUrls(s0));
    s = s
      .replace(/LIST\s*[-–]?\s*<math\b[^>]*>[\s\S]*?<\/math>/gi, (m) =>
        /II|2/i.test(m.replace(/<[^>]+>/g, "")) ? "List-II" : "List-I"
      )
      .replace(/LIST\s*[-–]?\s*II\s*\$/gi, "List-II")
      .replace(/LIST\s*[-–]?\s*I\s*\$/gi, "List-I");
    if (!s) return "";
    // Restore match figure placeholders before further processing
    s = s.replace(/QXMATCHFIGPLACEHOLDER(\d+)END/g, (_, i) => `§§QXMATCHFIG${i}§§`);
    // Restore ‹math› → <math> BEFORE any comparison / latex transforms
    s = restoreAngleQuoteTags(s);
    // Screenshot 864: turn MathML islands into $…$ TeX so KaTeX renders α / ∈
    try { s = convertAllMathML(s); } catch (_) { /* */ }
    try { s = unglueTexFromWords(s); } catch (_) { /* */ }
    // Kill MathJax-breaking HTML inside math + glued \pi then
    try { s = sanitizeHtmlInMath(s); } catch (_) { /* */ }
    // Match-list options (plain "P → 2; Q → 1") — tidy before full HTML path
    if (!/<table/i.test(s) && /\b[PQRS]\b/.test(s) && /→|rightarrow|⟶/.test(s)) {
      try { s = formatMatchOptionText(s); } catch (_) { /* */ }
    }
    // One proofread pass (second pass only if leftover glue / raw errors)
    try { s = cleanQuestionText(s); } catch (_) { /* */ }
    // Never drop a full $f(x)=…$ island (screenshot 882 / 895: "Let . Consider")
    {
      const inW = (cacheKey.match(/\$/g) || []).length + (cacheKey.match(/\\[a-zA-Z]+/g) || []).length + (cacheKey.match(/<math\b/gi) || []).length * 4;
      const outW = (s.match(/\$/g) || []).length + (s.match(/\\[a-zA-Z]+/g) || []).length;
      const hollow = /\bLet\s+[.,;:]\s|\bLet\s+\.\s|Let\s+Consider/i.test(s.replace(/<[^>]+>/g, " "));
      if ((inW >= 8 && outW < inW * 0.45) || hollow) {
        try {
          let retry = restoreAngleQuoteTags(fixBrokenImgUrls(s0));
          retry = convertAllMathML(retry);
          const retryHollow = /\bLet\s+[.,;:]\s|\bLet\s+\.\s|Let\s+Consider/i.test(retry.replace(/<[^>]+>/g, " "));
          if (!retryHollow) s = retry;
          else {
            // Keep original MathML/TeX so KaTeX can still typeset the definition
            s = restoreAngleQuoteTags(fixBrokenImgUrls(s0));
          }
        } catch (_) {
          s = restoreAngleQuoteTags(fixBrokenImgUrls(s0));
        }
      }
    }
    s = normalizeLatex(s);
    s = fixBrokenHtml(s);
    if (/\\le\s*ft|Unknown node type|Math input error|\\pithen/i.test(s)) {
      try { s = cleanQuestionText(s); } catch (_) { /* */ }
    }
    // Second pass: list/table structure after all text transforms
    try { s = repairMatchListTableHtml(s); } catch (_) { /* */ }
    // Chemistry Unicode (H2SO4 → H₂SO₄) outside math islands
    try { s = formatChemistryUnicode(s); } catch (_) { /* */ }
    // BHK: leftover Unicode math → KaTeX (never mutate figures / meaning)
    try { s = texifyUnicodeMath(s); } catch (_) { /* */ }
    // Pool figures → clean proxy (no Marks watermark on view/click). Keep local assets as-is.
    // Also rewrite full <img … /> tags so self-closing slash never breaks attributes.
    if (typeof QxImgClean !== "undefined" && QxImgClean.forceCleanProxyInHtml) {
      try { s = QxImgClean.forceCleanProxyInHtml(s); } catch (_) { /* */ }
    }
    if (typeof QxImgClean !== "undefined" && QxImgClean.stripSpilledFigUrls) {
      try { s = QxImgClean.stripSpilledFigUrls(s); } catch (_) { /* */ }
    }
    s = s.replace(/\bsrc=(["'])(https?:\/\/[^"']+)\1/gi, (m, q, url) => {
      if (/data:|assets\/diagrams|assets\/qx-figures/i.test(url)) return m;
      const esc = (u) => String(u || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      if (/proxy-image/i.test(url) && /clean=1/i.test(url)) {
        return `src="${esc(url)}"`;
      }
      if (/proxy-image|restore-image/i.test(url)) {
        try {
          const u = new URL(url, "https://www.quantrexacademy.com");
          const inner = u.searchParams.get("url");
          if (inner && typeof QxImgClean !== "undefined" && QxImgClean.proxyImageUrl) {
            return `src="${esc(QxImgClean.proxyImageUrl(inner))}"`;
          }
          if (inner) {
            return `src="${esc("/api/proxy-image?url=" + encodeURIComponent(inner) + "&clean=1")}"`;
          }
        } catch (_) { /* */ }
        return m;
      }
      if (/cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\/|watermarked_images|getmarks\.app/i.test(url)) {
        if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc) {
          return `src="${esc(QxOwnedFigs.displaySrc(url) || url)}"`;
        }
        if (typeof QxImgClean !== "undefined" && QxImgClean.proxyImageUrl) {
          return `src="${esc(QxImgClean.proxyImageUrl(url))}"`;
        }
        return `src="${esc("/api/proxy-image?url=" + encodeURIComponent(url) + "&clean=1&v=qxfig110")}"`;
      }
      return m;
    });
    // Normalize any remaining broken self-closing mid-attribute: `src="x" / data-`
    s = s.replace(/<img\b([^>]*?)\s\/\s+([a-z-]+)=/gi, "<img$1 $2=");
    s = s.replace(/<img\b([^>]*?)\s\/>/gi, "<img$1>");
    s = s.replace(/&nbsp;|&#160;|&#x0*A0;/gi, " ");
    s = s.replace(/\\le\s*ft\b/g, "\\left").replace(/\\ri\s*ght\b/g, "\\right");
    // Space before OPENING $ only (Let$x$ → Let $x$). Never split $x$-axis.
    try { s = spaceGluedDollars(s); } catch (_) { /* */ }
    try { s = stripLatexPtJunk(s); } catch (_) { /* */ }
    try { s = professionalizeSgnPiecewise(s); } catch (_) { /* */ }
    try { s = healShatteredTex(s); } catch (_) { /* */ }
    // HTML content: still protect math comparisons; math already upgraded in normalizeLatex
    if (isHtml(s) || /<table\b/i.test(s) || /<\/t(?:able|d|h|r)\b/i.test(s)) {
      s = protectMathComparisons(s);
      try { s = healShatteredTex(s); } catch (_) { /* */ }
      try { s = professionalizeSgnPiecewise(s); } catch (_) { /* */ }
      try { s = katexRenderIslands(s); } catch (_) { /* */ }
      try { s = repairSpacedKatexTags(s); } catch (_) { /* */ }
      return memoHtml(cacheKey, s);
    }
    // Plain / LaTeX: escape only outside math so `$C < B$` stays valid for MathJax
    let out = escapeHtmlOutsideMath(s);
    out = protectMathComparisons(out);
    // Unicode math → KaTeX-friendly (keep readable even if typeset fails)
    out = out.replace(/×/g, "\\(\\times\\)");
    out = out.replace(/÷/g, "\\(\\div\\)");
    out = out.replace(/±/g, "\\(\\pm\\)");
    out = out.replace(/∞/g, "\\(\\infty\\)");
    out = out.replace(/π/g, "\\(\\pi\\)");
    out = out.replace(/θ/g, "\\(\\theta\\)");
    out = out.replace(/α/g, "\\(\\alpha\\)");
    out = out.replace(/β/g, "\\(\\beta\\)");
    out = out.replace(/γ/g, "\\(\\gamma\\)");
    out = out.replace(/Δ/g, "\\(\\Delta\\)");
    out = out.replace(/Ω/g, "\\(\\Omega\\)");
    out = out.replace(/μ/g, "\\(\\mu\\)");
    // Superscripts/subscripts as unicode stay fine; also offer KaTeX when next to identifiers
    out = out.replace(/([A-Za-z0-9\)\]])²/g, "$1^{2}");
    out = out.replace(/([A-Za-z0-9\)\]])³/g, "$1^{3}");
    out = out.replace(/²/g, "²");
    out = out.replace(/³/g, "³");
    out = out.replace(/⁻¹/g, "^{-1}");
    out = out.replace(/⁻/g, "⁻");
    // √x or √(…) — never empty \sqrt{}
    out = out.replace(/√\s*\(([^)]+)\)/g, "\\(\\sqrt{$1}\\)");
    out = out.replace(/√\s*([A-Za-z0-9]+)/g, "\\(\\sqrt{$1}\\)");
    out = out.replace(/√/g, "√");
    out = out.replace(/\n/g, "<br>");
    try { out = healShatteredTex(out); } catch (_) { /* */ }
    try { out = katexRenderIslands(out); } catch (_) { /* */ }
    try { out = repairSpacedKatexTags(out); } catch (_) { /* */ }
    return memoHtml(cacheKey, out);
  }

  function needsMath(root) {
    const el = root || document.getElementById("app-main");
    if (!el) return false;
    return /\$|\\\(|\\\[|\\[a-zA-Z]+|<math[\s>]|‹\s*math\b|math-|mjx-/i.test(el.innerHTML || "");
  }

  function typesetTargets(root) {
    const el = root || document.getElementById("app-main") || document.body;
    if (!el) return [];
    const sel = [
      ".mtk-q-text", ".qx-q-text-only", ".mtk-opt-text", ".qa-q", ".qx-prac-q",
      ".qx-prac-opt-text", ".qa-opt .qx-content", ".qx-content", ".qx-opt-text-only",
      ".qx-opt-pair-struct", ".qx-opt-pair-name",
      ".sol-body", ".sol p", ".mtk-sol .qx-content", ".qx-sol-body",
      ".qx-marks-native", ".qx-marks-native-opt", ".qx-marks-native-q", ".qx-prac-correct-ans",
      ".mtk-main .mtk-opt", ".mtk-main .qx-prac-opt", "#qaOpts", "#qxOpts",
      ".qx-question-body", ".qx-q-seg-text"
    ].join(", ");
    let nodes = Array.from(el.querySelectorAll(sel)).filter(n =>
      !n.closest(".qx-diagram-slot, #qxDiagramSlot, .mathjax_ignore, .tex2jax_ignore, .qx-opt-diagram-slot, .qx-fig, .qx-pool-fig-wrap")
    );
    // Prefer leaf content nodes; if empty but math present, typeset whole root
    if (!nodes.length && needsMath(el)) nodes = [el];
    // Deduplicate nested (parent + child both selected)
    nodes = nodes.filter(n => !nodes.some(o => o !== n && o.contains(n)));
    return nodes;
  }

  function demoteMathInputErrors(root) {
    try {
      const scope = root || document;
      // Recover TeX from annotation before nuking error nodes
      const texFromErr = (errEl) => {
        const cont = errEl.closest("mjx-container, .MathJax, span, div");
        const ann = cont && cont.querySelector && cont.querySelector('annotation[encoding="application/x-tex"]');
        if (ann && ann.textContent) return ann.textContent.trim();
        const title = errEl.getAttribute("title") || errEl.getAttribute("data-mjx-error") || "";
        if (title && !/math input error|unknown node|missing|undefined|error/i.test(title)) return title.trim();
        return "";
      };
      const unicodeFallback = (tex) => {
        let plain = String(tex || "")
          .replace(/^\$+|\$+$/g, "")
          .replace(/\\pi\b/g, "π")
          .replace(/\\theta\b/g, "θ")
          .replace(/\\alpha\b/g, "α")
          .replace(/\\beta\b/g, "β")
          .replace(/\\gamma\b/g, "γ")
          .replace(/\\infty\b/g, "∞")
          .replace(/\\leq\b|\\le\b/g, "≤")
          .replace(/\\geq\b|\\ge\b/g, "≥")
          .replace(/\\neq\b|\\ne\b/g, "≠")
          .replace(/\\cdot\b/g, "·")
          .replace(/\\times\b/g, "×")
          .replace(/\\pm\b/g, "±")
          .replace(/\\rightarrow\b|\\to\b/g, "→")
          .replace(/\\arg\b/g, "arg")
          .replace(/\\mathrm\{([^}]*)\}/g, "$1")
          .replace(/\\text\{([^}]*)\}/g, "$1")
          .replace(/\\left|\\right/g, "")
          .replace(/\\[a-zA-Z]+/g, "")
          .replace(/[{}]/g, "")
          .replace(/\s+/g, " ")
          .trim();
        return plain;
      };
      scope.querySelectorAll("mjx-merror, .MathJax_Error, [data-mjx-error], .katex-error").forEach((errEl) => {
        let plain = unicodeFallback(texFromErr(errEl));
        const host = errEl.closest("mjx-container") || errEl.closest(".katex") || errEl;
        const span = document.createElement("span");
        span.className = "qx-math-fallback";
        span.textContent = plain || "";
        if (host && host.parentNode) {
          if (plain) host.parentNode.replaceChild(span, host);
          else {
            // Never delete a failed f(x)=… island — that leaves "Let . Consider"
            const parentTxt = String((host.parentNode.textContent || "")).replace(/\s+/g, " ");
            if (/\bLet\s*$/i.test(parentTxt) || /\bLet\s+[.,;:]?\s*$/i.test(parentTxt.slice(0, parentTxt.indexOf(host.textContent || "") + 1))) {
              span.textContent = span.textContent || "f(x)";
              host.parentNode.replaceChild(span, host);
            } else {
              host.parentNode.removeChild(host);
            }
          }
        }
      });
      scope.querySelectorAll("mjx-mtext, .MathJax_Error").forEach((n) => {
        if (/^\s*Math input error\s*$/i.test(n.textContent || "")
          || /Unknown node type/i.test(n.textContent || "")) {
          const host = n.closest("mjx-container") || n;
          if (host && host.parentNode) host.parentNode.removeChild(host);
        }
      });
      // Scrub leaked error strings in plain text leaves (screenshot 820/821)
      const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
      const bad = [];
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (!n || !n.nodeValue) continue;
        if (/Unknown node type/i.test(n.nodeValue) || /Math input error/i.test(n.nodeValue)) {
          bad.push(n);
        }
      }
      bad.forEach((n) => {
        n.nodeValue = String(n.nodeValue)
          .replace(/Unknown node type\s*["']?span["']?/gi, "")
          .replace(/Unknown node type\s*["']?[a-zA-Z]+["']?/gi, "")
          .replace(/Math input error/gi, "")
          .replace(/\s{2,}/g, " ");
      });
    } catch (e) { /* ignore */ }
  }

  function typesetKatex(list) {
    if (!window.renderMathInElement || !window.katex) return Promise.resolve();
    const opts = Object.assign({
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false }
      ],
      ignoredClasses: ["mathjax_ignore", "tex2jax_ignore", "qx-diagram-slot", "qx-fig", "katex", "qx-tex-code"]
    }, KATEX_OPTS);
    list.forEach(node => {
      try {
        if (node.querySelector && node.querySelector(".katex") && !/\$|\\\(|\\\[/.test(node.textContent || "")) return;
        const raw = node.innerHTML || "";
        if (/\\begin\{cases\}/.test(raw) && !/\$\$[^$]*\\begin\{cases\}/.test(raw)) {
          const up = raw.replace(
            /\$([^$]*\\begin\{cases\}[\s\S]*?\\end\{cases\}[^$]*)\$/g,
            "$$$$$1$$$$"
          );
          if (up !== raw) node.innerHTML = up;
        }
        window.renderMathInElement(node, opts);
      } catch (e) { /* */ }
    });
    return Promise.resolve();
  }

  function typeset(root) {
    const el = root || document.getElementById("app-main") || document.body;
    if (!el) return Promise.resolve();
    try { ensureKatexCss(); } catch (_) { /* */ }
    // Pre-clean MathML spans that cause "Unknown node type span"
    try {
      el.querySelectorAll("math span, math div, math font, math p").forEach((bad) => {
        // unwrap: keep children, drop illegal wrapper
        const parent = bad.parentNode;
        if (!parent) return;
        while (bad.firstChild) parent.insertBefore(bad.firstChild, bad);
        parent.removeChild(bad);
      });
    } catch (_) { /* */ }
    // Always upgrade bare TeX in text nodes before KaTeX/MathJax sees them
    try { upgradeBareTexInDom(el); } catch (_) { /* */ }
    initMathJax();
    const targets = typesetTargets(el);
    if (!targets.length && !needsMath(el)) return Promise.resolve();
    const list = targets.length ? targets : [el];
    const hasMathML = /<math[\s>]/i.test(el.innerHTML || "");

    const runKatex = () => loadKatex().then(() => typesetKatex(list)).catch(() => {});

    const runMj = () => {
      if (!window.MathJax || !MathJax.typesetPromise) return null;
      try {
        if (MathJax.typesetClear) MathJax.typesetClear(list);
      } catch (e) { /* */ }
      return MathJax.typesetPromise(list).then(() => {
        demoteMathInputErrors(el);
      }).catch((err) => {
        console.warn("MathJax typeset:", err && err.message);
        demoteMathInputErrors(el);
      });
    };

    // KaTeX for TeX; MathJax for MathML / fallback
    return runKatex().then(() => {
      demoteMathInputErrors(el);
      if (hasMathML || !katexReady) {
        const first = runMj();
        if (first) return first.then(() => demoteMathInputErrors(el));
        // Short wait — was 40×150ms (~6s) which felt like full freeze on practice
        return new Promise((resolve) => {
          let n = 0;
          const tick = () => {
            n += 1;
            const p = runMj();
            if (p) return p.then(() => { demoteMathInputErrors(el); resolve(); }).catch(() => { demoteMathInputErrors(el); resolve(); });
            if (n >= 12) { demoteMathInputErrors(el); return resolve(); }
            setTimeout(tick, 80);
          };
          setTimeout(tick, 40);
        });
      }
      return Promise.resolve();
    });
  }

  function stemLooksHollow(html) {
    const t = String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return /\bLet\s+[.,;:]\s|\bLet\s+\.\s|Let\s+Consider/i.test(t);
  }

  function recoverHollowStemInDom(root) {
    const el = root || (typeof document !== "undefined" ? document.getElementById("app-main") : null);
    if (!el || !el.querySelectorAll) return;
    const hosts = el.querySelectorAll(".mtk-q-text, .qx-q-seg-text, .qx-marks-native-q, .qzrr-q-area .qx-content, .qx-q-text-only");
    if (!hosts.length) return;
    let q = null;
    try {
      if (typeof QxImgClean !== "undefined" && QxImgClean.resolveCurrentQuestion) {
        q = QxImgClean.resolveCurrentQuestion(el);
      }
    } catch (_) { /* */ }
    if (!q && typeof getQ === "function" && window.QuantrexTestEngine && QuantrexTestEngine.getSession) {
      try {
        const sess = QuantrexTestEngine.getSession();
        if (sess && sess.ids && sess.ids[sess.idx] != null) q = getQ(sess.ids[sess.idx]);
      } catch (_) { /* */ }
    }
    if (!q) return;
    const src = (typeof QxImgClean !== "undefined" && QxImgClean.bestStemHtml)
      ? QxImgClean.bestStemHtml(q, q._qxOrigStem || q._qxBankQ || q.q)
      : (q._qxOrigStem || q._qxBankQ || q.q);
    if (!src || stemLooksHollow(src) && !/<math\b|\\begin\{|\$/.test(String(src))) return;
    hosts.forEach((host) => {
      if (host.closest && host.closest(".mtk-opt, .qx-prac-opt, .qa-opt")) return;
      /* qxmd208: never rewrite hosts inside SOLUTION */
      if (host.closest && host.closest("#egSol, #egSolPanel, .eg-sol, .eg-sol-panel, .sol-body, .qx-sol-flow, .qx-sol-card, #qaSolReveal")) return;
      if (!stemLooksHollow(host.innerHTML || host.textContent || "")) return;
      let painted = "";
      try { painted = html(src); } catch (_) { painted = String(src); }
      if (stemLooksHollow(painted) && /<math\b/i.test(String(src))) {
        try { painted = convertAllMathML(restoreAngleQuoteTags(String(src))); } catch (_) { /* */ }
      }
      if (painted && !stemLooksHollow(painted)) {
        host.innerHTML = painted;
        host.style.display = "block";
        host.style.visibility = "visible";
      }
    });
  }

  /**
   * Practice / CBT: typeset math only — skip multi-pass watermark + diagram scrub
   * (that cascade froze the tab AFTER question text already painted — screenshot 710).
   */
  function afterRenderLight(root) {
    requestAnimationFrame(() => {
      const el = root || document.getElementById("app-main") || document.body;
      if (!el) return;
      try { fixSpacingInDom(el); } catch (_) { /* */ }
      try { beautifyMatchTablesInDom(el); } catch (_) { /* */ }
      try { upgradeBareTexInDom(el); } catch (_) { /* */ }
      // Typeset ALL question/option/solution surfaces for uniform math
      const pickMathRoots = () => {
        const SEL =
          ".mtk-q-text, .qx-q-text-only, .qx-q-seg-text, .qx-marks-native-q, " +
          ".qx-question-body, #qzrrQArea, .qzrr-q-area, .qx-prac-q, .allen-q-body, " +
          ".eg-q-stem, #egQArea, .eg-opts, .eg-sol, #egSol, .eg-sol-bottom, " +
          ".eg-sol-panel, #egSolPanel, .eg-sol-inline, .eg-sol-marks-way, " +
          ".mtk-opt-text, .qx-prac-opt-text, #qaOpts, #qxOpts, .sol-body, .qx-sol-body, " +
          ".mtk-numerical, .qx-opt-text-only, .qx-content, .q-text, .mtk-q, " +
          ".qx-match-item-body, .qx-match-grid, .qx-match-col-body, .qx-given-box, " +
          ".mk-sol-stem, .mk-sol-opt-text, .qc-ex-q, .qc-ex-opts, .qx-sum-card, " +
          ".qx-formula-card, .qx-rev-card, .qx-bm-q, .seo-q-stem, .q-stem, " +
          ".qx-sol-card, .qx-sol-flow, #qaSolReveal, #qaResult";
        const mathRoots = el.querySelectorAll(SEL);
        const list = mathRoots.length ? Array.prototype.slice.call(mathRoots, 0, 24) : [];
        // qxmd175: when afterRender(solEl) is called on #egSol itself, querySelectorAll
        // misses the root — always include el if it looks like a math host.
        try {
          if (el && el.nodeType === 1) {
            const id = el.id || "";
            const cls = el.className && String(el.className) || "";
            if (/^(egSol|egSolPanel|qaSolReveal|qaResult)$/.test(id) ||
                /eg-sol|sol-body|qx-sol|qx-content|eg-opts|mtk-opt|eg-q-stem/.test(cls)) {
              if (list.indexOf(el) < 0) list.unshift(el);
            }
          }
        } catch (_) { /* */ }
        return list.length ? list : [el];
      };
      const healStemDollarsInDom = () => {
        el.querySelectorAll(".mtk-q-text, .qx-q-seg-text, .qx-marks-native-q, .qx-q-text-only, .qx-given-box, .mtk-opt-text, .qx-prac-opt-text, .eg-q-stem, #egQArea, .eg-sol, #egSol, .mk-sol-stem, .qc-ex-q, .sol-body, .qx-sol-body").forEach((node) => {
          if (!node || node.closest(".katex, mjx-container")) return;
          const before = node.innerHTML || "";
          if (!/\$|\\mathrm|\\begin\{|\\left\\\{/.test(before)) return;
          try {
            let h = parkAxisHyphenMath(before);
            h = stripLatexRowSkips(h);
            h = stripLatexPtJunk(h);
            h = professionalizeSgnPiecewise(h);
            h = piecewiseAlignedToCases(h);
            try { h = repairChemAndShatteredTex(h); } catch (_) { /* */ }
            try { h = repairShatteredMathDollars(h); } catch (_) { /* */ }
            h = healShatteredTex(h);
            if (h !== before) node.innerHTML = h;
          } catch (_) { /* */ }
        });
      };
      try { healStemDollarsInDom(); } catch (_) { /* */ }
      try {
        el.querySelectorAll(".qx-prac-opt, .mtk-opt, .qa-opt").forEach((opt) => {
          if (opt.querySelector("img")) {
            opt.querySelectorAll(".qx-fig-loading, [data-qx-fig-wait]").forEach((n) => n.remove());
          }
        });
      } catch (_) { /* */ }
      const list = pickMathRoots();
      const run = () => {
        try { fixSpacingInDom(el); } catch (_) { /* */ }
        try { beautifyMatchTablesInDom(el); } catch (_) { /* */ }
        try { healStemDollarsInDom(); } catch (_) { /* */ }
        try { upgradeBareTexInDom(el); } catch (_) { /* */ }
        try {
          if (typeof QxImgClean !== "undefined" && QxImgClean.finalizeAll) {
            const q = QxImgClean.resolveCurrentQuestion ? QxImgClean.resolveCurrentQuestion(el) : null;
            QxImgClean.finalizeAll(el, q);
          }
          try {
            if (typeof QxImgClean !== "undefined" && QxImgClean.stripStemRescuedFromSolution) {
              QxImgClean.stripStemRescuedFromSolution(el);
            } else if (el && el.querySelectorAll) {
              el.querySelectorAll("#egSol .qx-stem-rescued, #egSolPanel .qx-stem-rescued, .eg-sol .qx-stem-rescued, .qx-stem-rescued").forEach(function (n) {
                try {
                  if (n && n.closest && n.closest("#egSol, #egSolPanel, .eg-sol, .eg-sol-panel") && n.parentNode) {
                    n.parentNode.removeChild(n);
                  }
                } catch (_) { /* */ }
              });
            }
          } catch (_) { /* */ }
        } catch (_) { /* */ }
        try {
          if (window.QxSoftWm && typeof QxSoftWm.scan === "function") QxSoftWm.scan(el);
        } catch (_) { /* */ }
        try {
          if (typeof QxImgClean !== "undefined" && QxImgClean.dedupeDomFigures) {
            QxImgClean.dedupeDomFigures(el);
          }
        } catch (_) { /* */ }
        try { cleanDom(el); } catch (_) { /* */ }
        try { beautifyMatchTablesInDom(el); } catch (_) { /* */ }
        try { healStemDollarsInDom(); } catch (_) { /* */ }
        try { upgradeBareTexInDom(el); } catch (_) { /* */ }
        // Second typeset only if TeX islands remain unrendered
        const live = pickMathRoots();
        const need2 = /\$[^$\n]{1,400}\$|\\\(|\\\[|<math[\s>]/i.test(el.innerHTML || "")
          && !el.querySelector(".katex, mjx-container");
        const pass2 = need2
          ? loadKatex().then(() => typesetKatex(live)).then(() => {
              if (/<math[\s>]/i.test(el.innerHTML || "")) return typeset(el);
              return null;
            }).catch(() => typesetKatex(live))
          : Promise.resolve();
        pass2.finally(() => {
          try { recoverHollowStemInDom(el); } catch (_) { /* */ }
          try {
            if (typeof QxImgClean !== "undefined" && QxImgClean.arrangePortraitFigures
              && !(document.body && document.body.classList.contains("marks-test-active"))) {
              QxImgClean.arrangePortraitFigures(el);
            }
          } catch (_) { /* */ }
          if (typeof QxPerf !== "undefined") QxPerf.lazyImages(el);
        });
      };
      // Prefer KaTeX on each node (fast + uniform); MathJax only if MathML present
      const ts = loadKatex()
        .then(() => {
          el.querySelectorAll(
            ".mtk-q-text, .qx-q-seg-text, .qx-marks-native-q, .qx-q-text-only, " +
            ".mtk-opt-text, .qx-prac-opt-text, .sol-body, .qx-sol-body, .qx-content, " +
            ".eg-sol, #egSol, .eg-sol-inline, .eg-sol-panel, #egSolPanel, " +
            ".qx-sol-card, .qx-sol-flow, #qaSolReveal, #qaResult, .eg-opts, .mtk-opt-text"
          ).forEach((node) => {
            if (!node || (node.closest && node.closest(".katex, mjx-container"))) return;
            if (node.querySelector && node.querySelector(".katex")) {
              const textBits = Array.prototype.map.call(node.childNodes, function (n) {
                return n.nodeType === 3 ? (n.nodeValue || "") : "";
              }).join("");
              if (!/\$|\\\(|\\\[|\\left|\\right|\\mathrm|\\\{/.test(textBits)) return;
            }
            const before = node.innerHTML || "";
            if (!/\$|\\\(|\\\[|\\left|\\right|\\mathrm|\\ce\b|\\\{/.test(before)) return;
            try {
              const painted = katexRenderIslands(before);
              if (painted && painted !== before) node.innerHTML = painted;
            } catch (_) { /* */ }
          });
        })
        .then(() => typesetKatex(pickMathRoots()))
        .then(() => {
          if (/<math[\s>]/i.test(el.innerHTML || "")) return typeset(el);
          return null;
        })
        .catch(() => typeset(el));
      const guard = new Promise(r => setTimeout(r, 2500));
      Promise.race([ts, guard]).then(run).catch(run);
    });
  }

  function afterRender(root) {
    // Practice / Allen CBT: light path only (anti-hang)
    if (document.body.classList.contains("allen-practice-active")
      || document.body.classList.contains("allen-cbt-active")
      || document.body.classList.contains("marks-test-active")) {
      return afterRenderLight(root);
    }

    requestAnimationFrame(() => {
      const el = root || document.getElementById("app-main") || document.body;
      try { fixSpacingInDom(el); } catch (_) { /* */ }
      try { beautifyMatchTablesInDom(el); } catch (_) { /* */ }
      try { upgradeBareTexInDom(el); } catch (_) { /* */ }
      const finish = () => {
        try { fixSpacingInDom(el); } catch (_) { /* */ }
        try { beautifyMatchTablesInDom(el); } catch (_) { /* */ }
        try { upgradeBareTexInDom(el); } catch (_) { /* */ }
        const q = typeof QxImgClean !== "undefined" && QxImgClean.resolveCurrentQuestion
          ? QxImgClean.resolveCurrentQuestion(el)
          : null;
        const marksNative = q && typeof QxImgClean !== "undefined" && QxImgClean.isMarksNativeBook && QxImgClean.isMarksNativeBook(q);
        if (typeof QxImgClean !== "undefined" && QxImgClean.finalizeAll) {
          QxImgClean.finalizeAll(el, q);
        }
        try {
          if (typeof QxImgClean !== "undefined" && QxImgClean.stripStemRescuedFromSolution) {
            QxImgClean.stripStemRescuedFromSolution(el);
          }
        } catch (_) { /* */ }
        if (typeof QxImgClean !== "undefined" && QxImgClean.dedupeDomFigures) {
          QxImgClean.dedupeDomFigures(el);
        }
        try {
          if (window.QxSoftWm && typeof QxSoftWm.scan === "function") QxSoftWm.scan(el);
        } catch (_) { /* */ }
        cleanDom(el);
        try { fixSpacingInDom(el); } catch (_) { /* */ }
        try { beautifyMatchTablesInDom(el); } catch (_) { /* */ }
        try { upgradeBareTexInDom(el); } catch (_) { /* */ }
        // Second typeset after DOM bare-TeX upgrade (full path)
        const need2 = /\$|\\\(|\\\[|\\[a-zA-Z]|<math[\s>]/i.test(el.innerHTML || "");
        const pass2 = need2 ? typeset(el) : Promise.resolve();
        pass2.finally(() => {
          // Only process images that exist — skip full-tree diagram scrub when empty
          const poolImgs = el.querySelectorAll("#qxDiagramSlot img, .qx-diagram-slot img, img.qx-pool-fig");
          if (!marksNative && poolImgs.length && typeof QxImgClean !== "undefined" && QxImgClean.processImage) {
            poolImgs.forEach(img => {
              if (img.dataset.qxFigFrozen === "1") return;
              try { QxImgClean.processImage(img); } catch (_) { /* */ }
            });
          }
          if (typeof QxPerf !== "undefined") {
            QxPerf.lazyImages(el);
          }
        });
      };
      const ts = typeset(el);
      const guard = new Promise(r => setTimeout(r, 2500));
      Promise.race([ts, guard]).then(() => {
        finish();
      }).catch(() => {
        finish();
      });
    });
  }

  // Lazy MathJax — eager load on boot competed with first paint and felt like hang
  // initMathJax() is called from typeset()/afterRender when a question actually needs it

  /**
   * OCR / export junk common in JEE Advanced banks:
   * "1  ,  3  ,  5-tris" · multi-spaces · ListI · longrightarrow mix
   */
  function proofreadExamText(s) {
    let out = String(s || "");
    try { out = repairChemAndShatteredTex(out); } catch (_) { /* */ }
    // Export junk: literal "undefined" from broken Marks/API fields (Sets/Relations solutions too)
    out = out.replace(/(?:<br\s*\/?>\s*){0,3}\bundefined\b(?:\s*<br\s*\/?>){0,3}/gi, " ");
    out = out.replace(/\bundefined\b/gi, "");
    out = out.replace(/\bnull\b(?=\s*[.,;:<]|\s*$)/g, "");
    // Digit–comma spacing: "1  ,  3" → "1, 3"
    out = out.replace(/(\d)\s+,\s+/g, "$1, ");
    out = out.replace(/,\s{2,}/g, ", ");
    // Circle / locus options: "x^2 + y^2 - 4y - 4  0" → "... = 0"
    out = out.replace(/([xyz0-9\^{}\\]+\s*(?:[+\-–−]\s*[xyz0-9\^{}\\]+)+)\s{2,}0\s*(?=[<.,;]|$)/gi, "$1 = 0");
    out = out.replace(
      /((?:[xyz]\s*(?:\^\s*\{?\s*2\}?|²))(?:\s*[+\-–−]\s*[0-9xyz\^\{\}²]+)+)\s+0(?=\s|$|<)/gi,
      "$1 = 0"
    );
    // "(  4  -nitro" → "(4-nitro"
    out = out.replace(/\(\s+(\d+)\s+-/g, "($1-");
    out = out.replace(/-\s+(\d+)\s+-/g, "-$1-");
    // Unify arrows in plain text / options
    out = out.replace(/\$\\longrightarrow\$/g, "$\\rightarrow$");
    out = out.replace(/\\longrightarrow(?![a-zA-Z])/g, "\\rightarrow");
    out = out.replace(/\bListI\b/g, "List-I").replace(/\bListII\b/g, "List-II");
    out = out.replace(/\bList\s*I\b/g, "List-I").replace(/\bList\s*II\b/g, "List-II");
    out = out.replace(/\bMatchthe\b/g, "Match the");
    out = out.replace(/\bMatchList\b/gi, "Match List");
    out = out.replace(/\bchoosethe\b/gi, "choose the");
    out = out.replace(/\bcorrectoption\b/gi, "correct option");
    out = out.replace(/\bcorrectanswer\b/gi, "correct answer");
    // Common PCM English glue / OCR (JEE Advanced banks)
    out = out.replace(/\bwhichofthefollowing\b/gi, "which of the following");
    out = out.replace(/\bthefollowing\b/gi, "the following");
    out = out.replace(/\bisreactedwith\b/gi, "is reacted with");
    out = out.replace(/\boneequivalentof\b/gi, "one equivalent of");
    out = out.replace(/\bpentadieneis\b/gi, "pentadiene is");
    out = out.replace(/\bisare\b/gi, "is (are)");
    out = out.replace(/\bstatemen\s*t\(s\)\b/gi, "statement(s)");
    out = out.replace(/\bstatemen t\b/gi, "statement");
    // Paragraph:/Question: glued to next word (screenshot 826)
    out = out.replace(/\b(Paragraph|Question|Assertion|Reason|Passage|Comprehension)\s*:?\s*(?=[A-Za-z(])/gi, "$1: ");
    out = out.replace(/\b(Paragraph|Question|Assertion|Reason)([A-Z])/g, "$1: $2");
    out = out.replace(/\b(Paragraph|Question):\s*/g, "$1: ");
    out = out.replace(/\bassertioni\b/gi, "Assertion I");
    out = out.replace(/\breasonr\b/gi, "Reason R");
    out = out.replace(/\bcolumni\b/gi, "Column I");
    out = out.replace(/\bcolumnii\b/gi, "Column II");
    out = out.replace(/\bcolumn\s*1\b/gi, "Column I");
    out = out.replace(/\bcolumn\s*2\b/gi, "Column II");
    out = out.replace(/\bstatement\s*[-–]?\s*1\b/gi, "Statement-1");
    out = out.replace(/\bstatement\s*[-–]?\s*2\b/gi, "Statement-2");
    out = out.replace(/\boneormore\b/gi, "one or more");
    out = out.replace(/\bmorethanone\b/gi, "more than one");
    out = out.replace(/\binthefollowing\b/gi, "in the following");
    out = out.replace(/\baccordingtothe\b/gi, "according to the");
    out = out.replace(/\bas shownin\b/gi, "as shown in");
    out = out.replace(/\bas shown below\b/gi, "as shown below");
    try { out = stripLatexPtJunk(out); } catch (_) { /* */ }
    try { out = professionalizeSgnPiecewise(out); } catch (_) { /* */ }
    try { out = parkAxisHyphenMath(out); out = restoreAxisHyphenMath(out); } catch (_) { /* */ }
    out = out.replace(/\bfigure shows\b/gi, "figure shows");
    out = out.replace(/\brespectively\b/gi, "respectively");
    // Glued word pairs common in OCR
    out = out.replace(/\b(of|the|to|in|is|are|and|or|for|with|from|that|this|each|both)([A-Z][a-z]{2,})/g, "$1 $2");
    out = out.replace(/([a-z])([A-Z][a-z]{2,})/g, (m, a, b) => {
      // avoid breaking camelCase chemical formulas like NaCl
      if (/^(Cl|Br|Na|Mg|Ca|Fe|Cu|Zn|Al|Si|SO|NO|CO|OH|NH)/.test(b)) return m;
      return a + " " + b;
    });
    // Space before units when glued: 5m/s → 5 m/s (outside math)
    out = replaceOutsideMathFn(out, (chunk) => {
      // Skip URL / query / percent-encoded chunks ( %3A must not become %3 A via Ampere unit rule )
      if (/%[0-9A-Fa-f]{2}/.test(chunk) || /https?:|proxy-image|cdn-question-pool|firebasestorage/i.test(chunk)) {
        return chunk;
      }
      return chunk
        .replace(/(?<!%)(\d)(m\/s\b|ms\b|km\/h\b|kg\b|g\b|cm\b|mm\b|nm\b|mol\b|atm\b|Pa\b|N\b|J\b|W\b|V\b|A\b|Hz\b|eV\b)/g, "$1 $2")
        .replace(/(\d)\s*\^\s*o\b/gi, "$1^\\circ")
        .replace(/\s+([,.;:!?])/g, "$1")
        .replace(/([(\[])\s+/g, "$1")
        .replace(/\s+([)\]])/g, "$1");
    });
    // Multi-space between words outside tags
    if (/<[a-zA-Z]/.test(out)) {
      out = out.replace(/(>)([^<]+)(<)/g, (_, a, t, b) =>
        a + t.replace(/[ \t]{2,}/g, " ").replace(/\s+([,.;:!?])/g, "$1") + b
      );
    } else {
      out = out.replace(/[ \t]{2,}/g, " ");
    }
    return out;
  }

  /** Clean any question/option/solution string (all screens) — single proofread entry */
  function cleanQuestionText(s) {
    if (s == null || s === "") return s;
    try {
      let out = qxSanitizeIncoming(String(s));
      try { out = convertAllMathML(out); } catch (_) { /* */ }
      out = proofreadExamText(out);
      out = healBrokenEnglishWords(out);
      out = repairBrokenLatex(out);
      out = repairLatexCommandSpaces(out);
      out = fixWordSpacing(out);
      try { out = unglueLowercaseMathProse(out); } catch (_) { /* */ }
      if (/\\le\s*ft|\\pithen|\\textb\{|unknown node/i.test(out)) {
        out = repairBrokenLatex(out);
        out = repairLatexCommandSpaces(out);
      }
      out = ensureMathDelimiters(out);
      out = healBrokenEnglishWords(out);
      try { out = restoreAxisHyphenMath(out); } catch (_) { /* */ }
      // Safety: never leak private-use park tokens (tofu boxes) into student UI
      if (/[\uE100-\uE111\uE200-\uE211\uE410-\uE411]/.test(out)) {
        out = out.replace(/\uE100\d+\uE101/g, "");
        out = out.replace(/\uE200\d+\uE201/g, "");
        out = out.replace(/\uE410([^\uE411]*)\uE411/g, "$$$1$-");
        out = out.replace(/[\uE000-\uF8FF]/g, "");
      }
      return out;
    } catch (e) {
      return s;
    }
  }

  return {
    html,
    htmlMarksNative,
    typeset,
    afterRender,
    afterRenderLight,
    recoverHollowStemInDom,
    cleanDom,
    fixWordSpacing,
    unglueLowercaseMathProse,
    fixSpacingInDom,
    cleanQuestionText,
    sanitizeIncoming: qxSanitizeIncoming,
    detectBrokenKatex: (t) => (typeof QxMathSanitize !== "undefined" && QxMathSanitize.detectBrokenKatex)
      ? QxMathSanitize.detectBrokenKatex(t) : /katex-html|class\s*=\s*["'][^"']*\bmord\b/i.test(String(t || "")),
    proofreadExamText,
    repairChemAndShatteredTex,
    repairShatteredMathDollars,
    repairLatexCommandSpaces,
    repairMatchListTableHtml,
    beautifyMatchTablesInDom,
    formatMatchOptionText,
    upgradeBareTexInDom,
    ensureMathDelimiters,
    initMathJax,
    ensureMathDelimiters,
    normalizeLatex,
    upgradePlainMathNotation,
    restoreAngleQuoteTags,
    convertAllMathML,
    unglueTexFromWords
  };
})();

/* qxmd163 — MathTextRenderer: Firebase → normalize (meaning-preserving) → Mx.html → KaTeX.
 * Used for stem/options/answer/solution/explanation/hints across practice, PYQ, mocks, DPP.
 * Invalid LaTeX never crashes the test: throwOnError:false + safe fallback + optional debug.
 */
(function (w) {
  if (!w || !w.Mx) return;
  function debugOn() {
    try {
      return !!(w.QX_DEBUG || (typeof localStorage !== "undefined" && localStorage.getItem("qx_debug_math") === "1"));
    } catch (_) { return false; }
  }
  function normalize(text) {
    let t = text == null ? "" : text;
    try {
      if (typeof w.QxMathSanitize !== "undefined" && w.QxMathSanitize.normalizeMathContent) {
        t = w.QxMathSanitize.normalizeMathContent(t).html;
      }
    } catch (err) {
      if (debugOn()) try { console.warn("[MathTextRenderer.normalize]", err && err.message); } catch (_) {}
    }
    return t;
  }
  function render(text, opts) {
    try {
      const cleaned = normalize(text);
      return w.Mx.html(cleaned, opts);
    } catch (err) {
      try {
        if (debugOn()) console.warn("[MathTextRenderer] fallback", err && err.message, String(text || "").slice(0, 120));
      } catch (_) {}
      const safe = String(text == null ? "" : text)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return '<span class="qx-math-fallback">' + safe + "</span>";
    }
  }
  /** Prefer clean _qxOrigStem / _qxBankQ when Marks-export q.q is broken. Images untouched. */
  function pickStemSource(q, fallback) {
    try {
      if (typeof w.QxImgClean !== "undefined" && w.QxImgClean.bestStemHtml) {
        return w.QxImgClean.bestStemHtml(q, fallback != null ? fallback : (q && q.q));
      }
    } catch (_) { /* */ }
    if (!q) return fallback || "";
    const raw = q.q || q.question || fallback || "";
    const orig = q._qxOrigStem || q._qxBankQ || "";
    try {
      if (orig && typeof w.QxMathSanitize !== "undefined" && w.QxMathSanitize.looksMarksBrokenTex) {
        if (w.QxMathSanitize.looksMarksBrokenTex(raw) && !w.QxMathSanitize.looksMarksBrokenTex(orig)) return orig;
      }
    } catch (_) { /* */ }
    if (orig && /[\u2061\u2062]/.test(String(raw)) && !/[\u2061\u2062]/.test(String(orig))) return orig;
    return raw || orig || "";
  }
  function renderQuestionStem(q, opts) {
    return render(pickStemSource(q), opts);
  }
  function renderField(q, field, opts) {
    if (!q) return "";
    const v = q[field];
    if (v == null) return "";
    if (typeof v === "string") return render(v, opts);
    return render(String(v), opts);
  }
  w.MathTextRenderer = {
    render,
    renderInline: (t) => render(t, { displayMode: false }),
    renderDisplay: (t) => render(t, { displayMode: true }),
    renderQuestionStem,
    renderField,
    pickStemSource,
    normalize,
    sanitize: normalize
  };
})(typeof window !== "undefined" ? window : undefined);
