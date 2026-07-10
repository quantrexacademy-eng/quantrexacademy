// Quantrex — Math & HTML rendering (MathJax + branding cleanup)
window.Mx = (() => {
  let ready = false;

  function initMathJax() {
    if (ready || window.MathJax) return;
    window.MathJax = {
      skipStartupTypeset: true,
      tex: {
        inlineMath: [["$", "$"], ["\\(", "\\)"]],
        displayMath: [["$$", "$$"], ["\\[", "\\]"]],
        processEscapes: true,
        processEnvironments: true
      },
      options: {
        skipHtmlTags: ["script", "noscript", "style", "textarea", "pre", "code"],
        renderActions: { addMenu: [] }
      },
      startup: {
        ready() {
          MathJax.startup.defaultReady();
          ready = true;
        }
      }
    };
    const s = document.createElement("script");
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
  const PROTECTED_IMG_RX = /cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\/jee_main\/|formula_cards|cbse\/|NEET\/NCERT/i;
  const BRAND_IMG_RX = /(?:watermark|branding|marks-premium|ic_marks|marks_selected|getmarks-brand|web_assets|scoremarks)/i;
  const BRAND_LOGO_RX = /(?:watermark|marks-premium|ic_marks|marks_selected|getmarks-brand|web_assets|scoremarks)/i;
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

  function figureHtml(attrs) {
    const hasLoading = /loading=/i.test(attrs);
    const extra = hasLoading ? "" : ' loading="eager" decoding="async" fetchpriority="high"';
    const cls = /class=/i.test(attrs)
      ? attrs.replace(/class=(["'])([^"']*)\1/i, 'class=$1$2 qx-fig-img qx-no-wm$1')
      : attrs + ' class="qx-fig-img qx-no-wm"';
    return `<figure class="qx-fig"><img${cls}${extra}></figure>`;
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
      if (BRAND_LOGO_RX.test(fixedAttrs)) return "";
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
    if (fig && isInOptionContext(img)) {
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
    img.classList.add("qx-no-wm");
    img.loading = "eager";
    img.decoding = "async";
  }

  function wrapQuestionFig(img) {
    stripHeavyWrap(img);
    if (img.closest(".qx-fig")) return;
    const fig = document.createElement("figure");
    fig.className = "qx-fig";
    img.parentNode.insertBefore(fig, img);
    fig.appendChild(img);
    img.classList.add("qx-fig-img", "qx-no-wm");
    img.loading = "eager";
    img.decoding = "async";
    img.fetchPriority = "high";
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

  function cleanDom(root) {
    const el = root || document.getElementById("app-main") || document.body;
    if (!el) return;
    if (typeof QxWM !== "undefined") QxWM.scan(el);
    else el.querySelectorAll("[class*='watermark'],[class*='Watermark'],[data-brand],.marks-brand,.getmarks-brand").forEach(n => n.remove());
    el.querySelectorAll(".qx-diagram-panel").forEach(panel => unwrapLegacyPanel(panel));
    el.querySelectorAll(".qx-diag-toolbar, .qx-diagram-hint, .qx-diagram-badge").forEach(n => n.remove());
    el.querySelectorAll("img").forEach(img => {
      let src = img.getAttribute("src") || "";
      const alt = img.getAttribute("alt") || "";
      const cls = img.className || "";
      if (FORMULA_IMG_RX.test(src) || img.classList.contains("fc-img")) return;
      if (isMarksUiIcon(src) || isMarksUiIcon(cls) || img.classList.contains("qx-marks-icon")) return;
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
      if (isQuestionDiagram(src)) {
        if (isInOptionContext(img)) wrapOptFig(img);
        else wrapQuestionFig(img);
        return;
      }
      if (!img.closest(".qx-img-wrap") && src && !src.startsWith("data:")) {
        const wrap = document.createElement("span");
        wrap.className = "qx-img-wrap";
        img.parentNode.insertBefore(wrap, img);
        wrap.appendChild(img);
      }
    });
  }

  // Render content: HTML preserved, branding stripped, plain text escaped, LaTeX intact
  function html(content) {
    if (content == null) return "";
    const s = stripBranding(fixBrokenImgUrls(String(content).trim()));
    if (!s) return "";
    if (isHtml(s)) return s;
    // Convert common unicode math to LaTeX where helpful
    let out = escapeHtml(s);
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
    return /[$\\]|math-|mjx-|class="q-text"|class="qx-q"/i.test(el.innerHTML);
  }

  function typeset(root) {
    const el = root || document.getElementById("app-main") || document.body;
    if (!needsMath(el)) return Promise.resolve();
    if (!_mathRequested) { _mathRequested = true; initMathJax(); }
    if (!window.MathJax || !MathJax.typesetPromise) {
      return new Promise(r => setTimeout(r, 200));
    }
    return MathJax.typesetPromise([el]).catch(() => {});
  }

  function afterRender(root) {
    requestAnimationFrame(() => {
      cleanDom(root);
      if (typeof QxImgClean !== "undefined") QxImgClean.scan(root);
      if (typeof QxPerf !== "undefined") {
        QxPerf.lazyImages(root);
        QxPerf.smoothPaint(root);
      }
      typeset(root);
    });
  }

  return { html, typeset, afterRender, cleanDom, initMathJax };
})();