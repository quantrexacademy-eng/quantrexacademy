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
    /getmarks\.app/gi, /cdn-assets\.getmarks/gi, /cdn-question-pool\.getmarks/gi,
    /Scoremarks\s+Technologies/gi, /Mathongo/gi, /\bGet\s*Marks\b/gi, /\bMARKS\s*App\b/gi,
    /Powered\s+by\s+MARKS/gi, /MOG\s*Premium/gi, /\bMARKS\s*Premium\b/gi,
    /\bMARKS\s*Selected\b/gi, /marks_selected/gi, /\bMARKS\s*web\b/gi
  ];
  const BRAND_IMG_RX = /(?:logo|watermark|branding|marks-premium|ic_marks|marks_selected|getmarks-brand|web_assets|scoremarks)/i;
  const QUESTION_IMG_RX = /cdn-question-pool\.getmarks/i;
  const FORMULA_IMG_RX = /formula_cards/i;

  function wrapDiagramImages(html) {
    return html.replace(/<img([^>]*)>/gi, (m, attrs) => {
      if (FORMULA_IMG_RX.test(attrs)) return m;
      if (BRAND_IMG_RX.test(attrs)) return "";
      if (/class=["'][^"']*qx-img-wrap/i.test(attrs)) return m;
      return `<span class="qx-img-wrap"><img${attrs}></span>`;
    });
  }

  function stripBranding(str) {
    let out = String(str);
    BRAND_PATTERNS.forEach(rx => { out = out.replace(rx, ""); });
    out = out.replace(/<[^>]*(?:watermark|getmarks-brand|marks-app)[^>]*>[\s\S]*?<\/[^>]+>/gi, "");
    out = out.replace(/<img[^>]+(?:watermark|marks-premium|ic_marks)[^>]*>/gi, "");
    if (isHtml(out)) out = wrapDiagramImages(out);
    return out.replace(/\s{2,}/g, " ").trim();
  }

  function cleanDom(root) {
    const el = root || document.getElementById("app-main") || document.body;
    if (!el) return;
    el.querySelectorAll("[class*='watermark'],[class*='Watermark'],[data-brand],.marks-brand,.getmarks-brand").forEach(n => n.remove());
    el.querySelectorAll("img").forEach(img => {
      const src = img.getAttribute("src") || "";
      const alt = img.getAttribute("alt") || "";
      if (FORMULA_IMG_RX.test(src) || img.classList.contains("fc-img")) return;
      if (QUESTION_IMG_RX.test(src)) {
        if (!img.closest(".qx-img-wrap")) {
          const wrap = document.createElement("span");
          wrap.className = "qx-img-wrap";
          img.parentNode.insertBefore(wrap, img);
          wrap.appendChild(img);
        }
        return;
      }
      if (BRAND_IMG_RX.test(src) || BRAND_IMG_RX.test(alt)) { img.remove(); return; }
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
    const s = stripBranding(String(content).trim());
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
      if (typeof QxPerf !== "undefined") {
        QxPerf.lazyImages(root);
        QxPerf.smoothPaint(root);
      }
      typeset(root);
    });
  }

  return { html, typeset, afterRender, cleanDom, initMathJax };
})();