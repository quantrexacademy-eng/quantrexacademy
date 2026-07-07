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
    /Scoremarks\s+Technologies/gi, /Mathongo/gi, /\bGet\s*Marks\b/gi, /\bMARKS\s*App\b/gi,
    /Powered\s+by\s+MARKS/gi, /MOG\s*Premium/gi, /\bMARKS\s*Premium\b/gi,
    /\bMARKS\s*Selected\b/gi, /marks_selected/gi, /\bMARKS\s*web\b/gi
  ];
  const PROTECTED_IMG_RX = /cdn-question-pool\.getmarks|formula_cards|cbse\/|NEET\/NCERT/i;
  const BRAND_IMG_RX = /(?:logo|watermark|branding|marks-premium|ic_marks|marks_selected|getmarks-brand|web_assets|scoremarks)/i;
  const QUESTION_IMG_RX = /cdn-question-pool\.getmarks/i;
  const FORMULA_IMG_RX = /formula_cards/i;

  function diagramWrapClass(attrs) {
    return QUESTION_IMG_RX.test(attrs) || /cbse|diagram|question-pool|twelfth|tenth/i.test(attrs)
      ? "qx-diagram-wrap"
      : "qx-img-wrap";
  }

  function isDiagramImg(attrs) {
    return diagramWrapClass(attrs) === "qx-diagram-wrap";
  }

  function diagramPanelHtml(attrs) {
    const hasLoading = /loading=/i.test(attrs);
    const extra = hasLoading ? "" : ' loading="eager" decoding="async" fetchpriority="high"';
    return `<div class="qx-diagram-panel">
      <span class="qx-diagram-badge">📊 Figure</span>
      <span class="qx-diagram-wrap"><img${attrs}${extra}></span>
    </div>
    <small class="qx-diagram-hint">🔍 Tap to view full diagram</small>`;
  }

  function wrapDiagramImages(html) {
    return html.replace(/<img([^>]*)>/gi, (m, attrs) => {
      if (FORMULA_IMG_RX.test(attrs)) return m;
      if (BRAND_IMG_RX.test(attrs)) return "";
      if (/class=["'][^"']*qx-(img|diagram)-wrap/i.test(attrs)) return m;
      if (isDiagramImg(attrs)) return diagramPanelHtml(attrs);
      const hasLoading = /loading=/i.test(attrs);
      const extra = hasLoading ? "" : ' loading="lazy" decoding="async"';
      return `<span class="qx-img-wrap"><img${attrs}${extra}></span>`;
    });
  }

  function openDiagramModal(src) {
    if (!src) return;
    document.querySelectorAll(".qx-diagram-modal").forEach(n => n.remove());
    const overlay = document.createElement("div");
    overlay.className = "qx-diagram-modal";
    overlay.innerHTML = `<button type="button" class="qx-diagram-modal-close" aria-label="Close">✕</button><img src="${src.replace(/"/g, "&quot;")}" alt="Diagram">`;
    overlay.onclick = e => { if (e.target === overlay || e.target.classList.contains("qx-diagram-modal-close")) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  function bindDiagramZoom(root) {
    const scope = root || document.getElementById("app-main") || document.body;
    if (!scope) return;
    scope.querySelectorAll(".qx-diagram-panel").forEach(panel => {
      if (panel._qxZoomBound) return;
      panel._qxZoomBound = true;
      panel.onclick = () => {
        const img = panel.querySelector("img");
        if (img && img.src && !img.src.includes("__QXIMG")) openDiagramModal(img.src);
      };
    });
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

  function stripBranding(str) {
    const { safe, slots } = protectImgUrls(str);
    let out = safe;
    BRAND_PATTERNS.forEach(rx => { out = out.replace(rx, ""); });
    out = out.replace(/<[^>]*(?:watermark|getmarks-brand|marks-app)[^>]*>[\s\S]*?<\/[^>]+>/gi, "");
    out = out.replace(/<img[^>]+(?:watermark|marks-premium|ic_marks)[^>]*>/gi, "");
    out = restoreImgUrls(out, slots);
    if (typeof QuantrexStrip !== "undefined") out = QuantrexStrip.displayText(out);
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
      if (QUESTION_IMG_RX.test(src) || /cbse|diagram|question-pool/i.test(src)) {
        if (!img.closest(".qx-diagram-panel")) {
          const panel = document.createElement("div");
          panel.className = "qx-diagram-panel";
          const badge = document.createElement("span");
          badge.className = "qx-diagram-badge";
          badge.textContent = "📊 Figure";
          const wrap = document.createElement("span");
          wrap.className = "qx-diagram-wrap";
          const parent = img.parentNode;
          parent.insertBefore(panel, img);
          panel.appendChild(badge);
          panel.appendChild(wrap);
          wrap.appendChild(img);
          if (!panel.nextElementSibling || !panel.nextElementSibling.classList.contains("qx-diagram-hint")) {
            const hint = document.createElement("small");
            hint.className = "qx-diagram-hint";
            hint.textContent = "🔍 Tap to view full diagram";
            parent.insertBefore(hint, panel.nextSibling);
          }
        }
        img.loading = "eager";
        img.decoding = "async";
        img.fetchPriority = "high";
        return;
      }
      if (BRAND_IMG_RX.test(src) || BRAND_IMG_RX.test(alt)) { img.remove(); return; }
      if (!img.closest(".qx-img-wrap") && !img.closest(".qx-diagram-wrap") && src && !src.startsWith("data:")) {
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
      bindDiagramZoom(root);
      if (typeof QxPerf !== "undefined") {
        QxPerf.lazyImages(root);
        QxPerf.smoothPaint(root);
      }
      typeset(root);
    });
  }

  return { html, typeset, afterRender, cleanDom, bindDiagramZoom, openDiagramModal, initMathJax };
})();