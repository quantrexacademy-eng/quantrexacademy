// Quantrex — Math & HTML rendering (MathJax + branding cleanup)
window.Mx = (() => {
  let ready = false;

  function initMathJax() {
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
        packages: { "[+]": ["ams", "noerrors", "noundefined"] }
      },
      options: {
        skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"],
        // Never skip option buttons / question body
        ignoreHtmlClass: "mathjax_ignore|tex2jax_ignore|qx-diagram-slot|qx-pool-fig-wrap|qx-fig|qx-ch-icon|qx-folder-nav|qx-ch-card-rich|cpyqb-ch-ic|cpyqb-ch-ic-fb",
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
    s.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js";
    s.async = true;
    document.head.appendChild(s);
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
  const PROTECTED_IMG_RX = /cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\/|formula_cards|cbse\/|NEET\/NCERT|ap_eamcet/i;
  const BRAND_IMG_RX = /(?:watermark|branding|marks-premium|ic_marks|marks_selected|getmarks-brand|web_assets|scoremarks)/i;
  const BRAND_LOGO_RX = /(?:watermark|marks-premium|ic_marks|marks_selected|getmarks-brand|web_assets|scoremarks)/i;
  const QUANTREX_BRAND_RX = /quantrex-academy-brand|qx-quantrex-wm-overlay/i;

  function isQuantrexBrandImg(img) {
    if (!img) return false;
    const src = img.getAttribute ? (img.getAttribute("src") || "") : "";
    const cls = img.className || "";
    return QUANTREX_BRAND_RX.test(src) || cls.includes("qx-quantrex-wm-overlay") || cls.includes("qx-premium-wm-logo");
  }
  const MARKS_UI_ICON_RX = /ic_content_exam_|cpyqb\/subjects\/|ncert_toolbox\/|subj-ic-img|exam-pill-logo|subj-mini-ic|qx-marks-icon|qx-exam-logo|board-exam|board-subj|marks-exam-ic|marks-board-subj|dash-board.*logo|dash-tool-logo|exam-card-logo/i;
  const QUESTION_IMG_RX = /cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\/|\/cbse\/|ap_eamcet/i;
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
      out = out.replace(/<[^>]*(?:watermark|getmarks-brand|marks-app)[^>]*>[\s\S]*?<\/[^>]+>/gi, "");
      out = out.replace(/<img[^>]+(?:watermark|marks-premium|ic_marks)[^>]*>/gi, "");
    }
    out = restoreImgUrls(out, slots);
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
    else el.querySelectorAll("[class*='watermark'],[class*='Watermark'],[data-brand],.marks-brand,.getmarks-brand").forEach(n => n.remove());
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
      if (FORMULA_IMG_RX.test(src) || img.classList.contains("fc-img")) return;
      if (isMarksUiIcon(src) || isMarksUiIcon(cls) || img.classList.contains("qx-marks-icon")) return;
      if (isQuestionDiagram(src)) {
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
    if (content == null) return "";
    let s = fixBrokenImgUrls(String(content).trim());
    if (!s) return "";
    const { safe, slots } = protectImgUrls(s);
    let out = safe;
    BRAND_PATTERNS.forEach(rx => { out = out.replace(rx, ""); });
    out = restoreImgUrls(out, slots);
    out = out
      .replace(/(<br\s*\/?>\s*){2,}/gi, "<br>")
      .replace(/<p>\s*<\/p>/gi, "")
      .replace(/<p>\s*(<img\b)/gi, "$1")
      .replace(/(<\/img>|<img[^>]*\/?>)\s*<\/p>/gi, "$1");
    if (isHtml(out)) return out;
    let plain = escapeHtml(out);
    plain = plain.replace(/\n/g, "<br>");
    return plain;
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
   * Repair damaged LaTeX from Marks export / strip mistakes before MathJax.
   * Fixes: $(textb{S})$, bare left(...)/right, 1/3[left(...)right], missing \ on commands.
   */
  function repairBrokenLatex(s) {
    let out = String(s || "");

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

    // Restore missing backslash on common TeX delimiters (left( → \left()
    out = out.replace(/(^|[^\\a-zA-Z])left\s*\(/g, "$1\\left(");
    out = out.replace(/(^|[^\\a-zA-Z])right\s*\)/g, "$1\\right)");
    out = out.replace(/(^|[^\\a-zA-Z])left\s*\[/g, "$1\\left[");
    out = out.replace(/(^|[^\\a-zA-Z])right\s*\]/g, "$1\\right]");
    out = out.replace(/(^|[^\\a-zA-Z])left\s*\{/g, "$1\\left\\{");
    out = out.replace(/(^|[^\\a-zA-Z])right\s*\}/g, "$1\\right\\}");

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
    out = out.replace(/(^|[^\\a-zA-Z])mathrm\s*\{/g, "$1\\mathrm{");

    // √2 bare radical near math → \sqrt{2} when digit follows
    out = out.replace(/√\s*\{?\s*(\d+)\s*\}?/g, "\\sqrt{$1}");
    out = out.replace(/√\s*([A-Za-z])/g, "\\sqrt{$1}");

    // Broken: C-$ (mathrm(O)  /  $(mathrm(O)  → proper \mathrm{O}
    out = out.replace(/\$\s*\(\s*mathrm\s*\(\s*([A-Za-z0-9]+)\s*\)/gi, "$\\mathrm{$1}");
    out = out.replace(/\$\s*mathrm\s*\(\s*([A-Za-z0-9]+)\s*\)/gi, "$\\mathrm{$1}");
    out = out.replace(/(^|[^\\])mathrm\s*\{\s*([^}]*)\s*\}/g, "$1\\mathrm{$2}");
    out = out.replace(/(^|[^\\])mathrm\s*\(\s*([^)]*)\s*\)/g, "$1\\mathrm{$2}");

    // Broken partial dollars around subscripts: CH_$3$ already handled; fix lone $ at word end
    out = out.replace(/([A-Za-z])-\$\s*(?=[\s,.;)]|$)/g, "$1–");
    out = out.replace(/\$\s*-\s*([A-Za-z])/g, "–$1");

    // Angle / degree: 108.9° already unicode; O-C-H style
    out = out.replace(/\b(\d+(?:\.\d+)?)\s*deg\b/gi, "$1^\\circ");

    // Collapse accidental $$$$ and empty $$
    out = out.replace(/\$\$+/g, "$$");
    out = out.replace(/\$\s*\$/g, " ");

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
      if (!/\\[a-zA-Z]/.test(chunk) && !/\d\s*\\pi\b/.test(chunk)) return chunk;

      const slots = [];
      const park = (m) => {
        slots.push(m);
        return "\uE100" + (slots.length - 1) + "\uE101";
      };
      const protect = (str) => str.replace(/\$[^$]+\$/g, park);
      const restore = (str) => str.replace(/\uE100(\d+)\uE101/g, (_, i) => slots[+i] || "");

      let c = protect(chunk);

      // \frac{a}{b}  (args may contain \pi etc — wrap whole frac first)
      c = c.replace(/(^|[^\\])(\\frac\s*\{[^{}]*\}\s*\{[^{}]*\})/g, (m, pre, tex) => pre + park("$" + tex + "$"));
      // \sqrt
      c = c.replace(/(^|[^\\])(\\sqrt(?:\s*\[[^\]]*\])?\s*\{[^{}]*\})/g, (m, pre, tex) => pre + park("$" + tex + "$"));
      // \textbf / \mathrm / \text{...}
      c = c.replace(
        /(^|[^\\])(\\(?:mathrm|textbf|text|mathbf|mathsf|textrm|textit|boldsymbol)\s*\{[^}]*\}(?:\s*[\^_]\s*\{?[^}\s\\]+\}?)?(?:\s*\/\s*[A-Za-zµμ°]+(?:\s*[\^_]\s*\{?[^}\s\\]+\}?)?)*)/g,
        (m, pre, tex) => pre + park("$" + tex.trim() + "$")
      );
      // \left ... \right pairs (full delimiter groups)
      c = c.replace(
        /(^|[^\\])(\\left\s*[\(\[\{.|][\s\S]*?\\right\s*[\)\]\}.|])/g,
        (m, pre, tex) => pre + park("$" + tex + "$")
      );
      // other \cmd{...}
      c = c.replace(
        /(^|[^\\])(\\[a-zA-Z]+(?:\s*\{[^{}]*\}){1,3}(?:\s*[\^_]\s*\{?[^}\s\\]+\}?)*)/g,
        (m, pre, tex) => {
          if (/^\\(?:begin|end|left|right|big|Big|frac|sqrt|mathrm|textbf|text|mathbf|boldsymbol)/.test(tex)) return m;
          return pre + park("$" + tex + "$");
        }
      );
      // 196 \pi
      c = c.replace(/(^|[^\\])(\d+(?:\.\d+)?)\s*(\\pi)\b/g, (m, pre, n, pi) => pre + park("$" + n + " " + pi + "$"));
      // bare \pi
      c = c.replace(/(^|[^\\])(\\pi)\b/g, (m, pre, pi) => pre + park("$" + pi + "$"));

      c = restore(c);
      c = c.replace(/\$\$+/g, "$");
      c = c.replace(/\$\s*\$/g, "$");
      return c;
    }
    return replaceOutsideMathFn(s, wrapChunk);
  }

  function replaceOutsideMath(s, rx, rep) {
    const parts = String(s || "").split(/(\$[^$]*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g);
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) continue;
      parts[i] = parts[i].replace(rx, rep);
    }
    return parts.join("");
  }

  function replaceOutsideMathFn(s, fn) {
    const parts = String(s || "").split(/(\$[^$]*\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g);
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
   * Bare &lt; / &gt; inside $…$ break HTML when escaped, and MathJax shows &lt; as junk.
   * Convert comparison ops inside math to TeX \lt / \gt (and unicode angle quotes).
   */
  function protectMathComparisons(s) {
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
  function normalizeLatex(s) {
    let out = repairBrokenLatex(s);
    // Second pass: currency after chem/dollar tweaks may reappear as broken math
    out = repairCurrencyAndPlainNumbers(out);
    out = fixChemNotation(out);
    out = repairCurrencyAndPlainNumbers(out);
    // Inverse trig — function replacer avoids $1 group corruption of nearby latex
    out = out.replace(/\b(tan|sin|cos|cot|sec|csc)\s*[-–]?\s*1\s*\/\s*(\d+)/gi, (_, fn, n) => `\\${fn.toLowerCase()}^{-1}${n}`);
    out = out.replace(/\b(tan|sin|cos|cot|sec|csc)\s*\^\s*\{?\s*-1\s*\}?/gi, (_, fn) => `\\${fn.toLowerCase()}^{-1}`);
    out = ensureMathDelimiters(out);
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

  function fixBrokenHtml(s) {
    let out = String(s || "");
    out = out.replace(/&lt;(\/?[a-zA-Z][^&]*?)&gt;/g, "<$1>");
    out = out.replace(/‹(\/?[a-zA-Z0-9]+)›/gi, "<$1>");
    out = out.replace(/&lt;br\s*\/?&gt;/gi, "<br>");
    out = out.replace(/(^|>)\s*<\/p>\s*(?=<|$)/gi, "$1");
    out = out.replace(/(^|>)\s*<p>\s*(?=<img\b)/gi, "$1");
    out = out.replace(/<\/?(?:font)(?:\s[^>]*)?>/gi, "");
    out = replaceOutsideMath(out, /→/g, " $\\rightarrow$ ");
    out = replaceOutsideMath(out, /←/g, " $\\leftarrow$ ");
    out = replaceOutsideMath(out, /↔/g, " $\\leftrightarrow$ ");
    out = replaceOutsideMath(out, /⇒/g, " $\\Rightarrow$ ");
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

  // Render content: HTML preserved, branding stripped, plain text escaped, LaTeX intact
  function html(content) {
    if (content == null) return "";
    let s = stripBranding(fixBrokenImgUrls(String(content).trim()));
    if (!s) return "";
    // Light cleanup only (never restructure LaTeX inside HTML tables/math)
    s = normalizeLatex(s);
    s = fixBrokenHtml(s);
    // Marks CDN figures → color-preserving clean proxy (no watermark, no pure-black)
    s = s.replace(/\bsrc=(["'])(https?:\/\/[^"']+)\1/gi, (m, q, url) => {
      if (/proxy-image|restore-image|data:|assets\/diagrams/i.test(url)) return m;
      if (/cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\/|getmarks\.app/i.test(url)) {
        return `src=${q}/api/proxy-image?url=${encodeURIComponent(url)}&clean=1&v=6${q}`;
      }
      return m;
    });
    // HTML content: still protect math comparisons, never re-escape whole string
    if (isHtml(s)) {
      s = protectMathComparisons(s);
      return s;
    }
    // Plain / LaTeX: escape only outside math so `$C < B$` stays valid for MathJax
    let out = escapeHtmlOutsideMath(s);
    out = protectMathComparisons(out);
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
    out = out.replace(/²/g, "^{2}");
    out = out.replace(/³/g, "^{3}");
    out = out.replace(/⁻/g, "^{-}");
    out = out.replace(/√/g, "\\(\\sqrt{}\\)");
    out = out.replace(/\n/g, "<br>");
    return out;
  }

  function needsMath(root) {
    const el = root || document.getElementById("app-main");
    if (!el) return false;
    return /\$|\\\(|\\\[|\\[a-zA-Z]+|math-|mjx-/i.test(el.innerHTML || "");
  }

  function typesetTargets(root) {
    const el = root || document.getElementById("app-main") || document.body;
    if (!el) return [];
    const sel = [
      ".mtk-q-text", ".qx-q-text-only", ".mtk-opt-text", ".qa-q", ".qx-prac-q",
      ".qx-prac-opt-text", ".qa-opt .qx-content", ".qx-content", ".qx-opt-text-only",
      ".qx-opt-pair-struct", ".qx-opt-pair-name",
      ".sol-body", ".sol p", ".mtk-sol .qx-content", ".qx-sol-body",
      ".qx-marks-native-opt", ".qx-marks-native-q", ".qx-prac-correct-ans",
      ".mtk-main .mtk-opt", ".mtk-main .qx-prac-opt", "#qaOpts", "#qxOpts"
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

  function typeset(root) {
    const el = root || document.getElementById("app-main") || document.body;
    if (!el) return Promise.resolve();
    initMathJax();
    const targets = typesetTargets(el);
    if (!targets.length && !needsMath(el)) return Promise.resolve();
    const list = targets.length ? targets : [el];

    const run = () => {
      if (!window.MathJax || !MathJax.typesetPromise) return null;
      // Clear previous mjx in targets so re-render works after patch
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

    /**
     * Replace MathJax "Math input error" chips with readable plain text.
     * Prefer title/annotation source; else strip the failed node so prose continues.
     */
    function demoteMathInputErrors(root) {
      try {
        const scope = root || document;
        scope.querySelectorAll("mjx-merror, .MathJax_Error, [data-mjx-error]").forEach((errEl) => {
          const title = errEl.getAttribute("title") || errEl.getAttribute("data-mjx-error") || "";
          let plain = "";
          // Titles like: "Missing close brace" — not useful; look for TeX in parent
          const cont = errEl.closest("mjx-container, .MathJax, span, div");
          const ann = cont && cont.querySelector && cont.querySelector('annotation[encoding="application/x-tex"]');
          if (ann && ann.textContent) plain = ann.textContent.trim();
          if (!plain && title && !/math input error|missing|undefined|error/i.test(title)) {
            plain = title.trim();
          }
          // Recover ₹ / Indian amounts from failed source
          if (plain) {
            plain = plain
              .replace(/^\$+|\$+$/g, "")
              .replace(/\\text\{₹\}/g, "₹")
              .replace(/\\text\{Rs\.?\}/gi, "₹")
              .replace(/\\rupees?/gi, "₹")
              .replace(/\{,\}/g, ",")
              .replace(/\\[,;]/g, " ")
              .replace(/\\[a-zA-Z]+/g, "")
              .replace(/[{}]/g, "")
              .replace(/\s+/g, " ")
              .trim();
          }
          const host = errEl.closest("mjx-container") || errEl;
          const span = document.createElement("span");
          span.className = "qx-math-fallback";
          span.textContent = plain || "";
          if (host && host.parentNode) {
            if (plain) host.parentNode.replaceChild(span, host);
            else host.parentNode.removeChild(host);
          }
        });
        // Leftover visible "Math input error" text nodes (noerrors package)
        scope.querySelectorAll("mjx-mtext, .MathJax_Error").forEach((n) => {
          if (/^\s*Math input error\s*$/i.test(n.textContent || "")) {
            const host = n.closest("mjx-container") || n;
            if (host && host.parentNode) host.parentNode.removeChild(host);
          }
        });
      } catch (e) { /* ignore */ }
    }

    const first = run();
    if (first) return first;

    return new Promise((resolve) => {
      let n = 0;
      const tick = () => {
        n += 1;
        const p = run();
        if (p) return p.then(resolve).catch(resolve);
        if (n >= 40) return resolve();
        setTimeout(tick, 150);
      };
      setTimeout(tick, 80);
    });
  }

  function afterRender(root) {
    requestAnimationFrame(() => {
      const el = root || document.getElementById("app-main") || document.body;
      const finish = () => {
        const q = typeof QxImgClean !== "undefined" && QxImgClean.resolveCurrentQuestion
          ? QxImgClean.resolveCurrentQuestion(el)
          : null;
        const marksNative = q && typeof QxImgClean !== "undefined" && QxImgClean.isMarksNativeBook && QxImgClean.isMarksNativeBook(q);
        if (typeof QxImgClean !== "undefined" && QxImgClean.finalizeAll) {
          QxImgClean.finalizeAll(el, q);
        }
        cleanDom(el);
        if (!marksNative && typeof QxImgClean !== "undefined") {
          if (QxImgClean.processAllDiagrams) QxImgClean.processAllDiagrams(el);
          else if (QxImgClean.processImage) {
            el.querySelectorAll("img[src*='cdn-question-pool'], img[src*='/pyq/'], .qx-pool-fig, #qxDiagramSlot img").forEach(img => QxImgClean.processImage(img));
          }
          if (QxImgClean.applyWmCover) {
            el.querySelectorAll("img[src*='cdn-question-pool.getmarks'], img.qx-pool-fig").forEach(img => QxImgClean.applyWmCover(img));
          }
        }
        if (!marksNative && typeof QxPremiumWM !== "undefined" && QxPremiumWM.scanAllFigures) {
          QxPremiumWM.scanAllFigures(el);
        } else if (!marksNative && typeof QxImgClean !== "undefined" && QxImgClean.applyQuantrexBrand) {
          el.querySelectorAll("img.qx-pool-fig, #qxDiagramSlot img, .qx-diagram-slot img").forEach(img => QxImgClean.applyQuantrexBrand(img));
        }
        if (typeof QxPerf !== "undefined") {
          QxPerf.lazyImages(el);
          QxPerf.smoothPaint(el);
        }
      };
      // Math first (students must read formulas), then images/cleanup
      typeset(el).then(() => {
        finish();
        if (typeof QxImgClean !== "undefined" && QxImgClean.rewriteAllPoolImgs) {
          QxImgClean.rewriteAllPoolImgs(el);
          setTimeout(() => QxImgClean.rewriteAllPoolImgs(el), 400);
        }
        // Permanent no-WM + visibility on every render (incl. prev/next)
        if (typeof QxNoWmGuard !== "undefined" && QxNoWmGuard.schedulePass) {
          QxNoWmGuard.schedulePass(el);
        } else if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.scanAllFigures) {
          QxPremiumWM.scanAllFigures(el);
          setTimeout(() => QxPremiumWM.scanAllFigures(el), 500);
        }
        // Second pass after DOM settles (options sometimes mount late)
        setTimeout(() => { typeset(el).catch(() => {}); }, 600);
      }).catch(() => {
        finish();
      });
    });
  }

  // Eager-load MathJax so first question is not raw LaTeX
  try {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => initMathJax(), { once: true });
    } else {
      initMathJax();
    }
  } catch (e) { /* */ }

  return {
    html,
    htmlMarksNative,
    typeset,
    afterRender,
    cleanDom,
    initMathJax,
    ensureMathDelimiters,
    normalizeLatex
  };
})();