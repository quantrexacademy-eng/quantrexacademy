// Quantrex — remove MARKS / third-party watermarks from HTML + DOM
window.QxWM = (() => {
  const POOL_RX = /cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\/|\/cbse\/|ap_eamcet/i;
  const UI_ICON_RX = /ic_content_exam_|cpyqb\/subjects\/|ncert_toolbox\/|formula_cards|qx-marks-icon|fc-img|exam-pill-logo|subj-mini-ic/i;

  function isPoolDiagram(src, el) {
    if (!src || src.startsWith("data:")) return false;
    if (UI_ICON_RX.test(src)) return false;
    if (el && (el.classList.contains("qx-marks-icon") || el.classList.contains("fc-img"))) return false;
    return POOL_RX.test(src);
  }

  const WM_TEXT_RX = /^(MARKS|Get\s*Marks|MARKS\s*App|Quizrr|ALLEN|MIMS|Vedantu|www\.vedantu|Mathongo|Resonance|FIITJEE|Aakash|Unacademy|Byju'?s?)$/i;

  function cleanHtml(html) {
    let out = String(html || "");
    const brandSlots = [];
    out = out.replace(/<img[^>]*quantrex-academy-brand[^>]*>/gi, (m) => {
      const key = `__QXBRAND${brandSlots.length}__`;
      brandSlots.push(m);
      return key;
    });
    const slots = [];
    out = out.replace(/<(?:figure|img)\b[^>]*>[\s\S]*?(?:<\/figure>|>)/gi, (m) => {
      if (!POOL_RX.test(m)) return m;
      const key = `__QXPOOL${slots.length}__`;
      slots.push(m);
      return key;
    });
    out = out.replace(/<[^>]*(?:watermark|Watermark|getmarks-brand|marks-app|marks_selected|vedantu)[^>]*>[\s\S]*?<\/[^>]+>/gi, "");
    out = out.replace(/<img[^>]+(?:watermark|marks-premium|ic_marks|marks-brand|getmarks-brand|vedantu)[^>]*>/gi, "");
    out = out.replace(/<div[^>]*style="[^"]*(?:MARKS|watermark|vedantu)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
    out = out.replace(/<span[^>]*style="[^"]*(?:MARKS|watermark|vedantu)[^"]*"[^>]*>[\s\S]*?<\/span>/gi, "");
    slots.forEach((block, i) => { out = out.split(`__QXPOOL${i}__`).join(block); });
    brandSlots.forEach((block, i) => { out = out.split(`__QXBRAND${i}__`).join(block); });
    out = out.replace(/www\.vedantu\.com/gi, "");
    out = out.replace(/vedantu\.com/gi, "");
    return out;
  }

  function removeOverlayNodes(root) {
    const scope = root || document.body;
    if (!scope) return;
    scope.querySelectorAll(
      "[class*='watermark'],[class*='Watermark'],[data-brand],[data-watermark],.marks-brand,.getmarks-brand,.watermark-text,.watermark-overlay"
    ).forEach(el => {
      if (el.closest("img.qx-marks-icon, .fc-formula, .sidebar-head")) return;
      if (el.classList.contains("qx-wm-corner-badge") || el.classList.contains("qx-quantrex-wm") || el.classList.contains("qx-quantrex-wm-overlay") || el.classList.contains("qx-premium-wm") || el.classList.contains("qx-premium-wm-sheet") || el.classList.contains("qx-wm-diagonal") || el.classList.contains("qx-diag-watermark") || el.classList.contains("qx-brand-overlay") || el.classList.contains("qx-wm-mask") || el.classList.contains("qx-marks-scrub") || el.classList.contains("qx-marks-strip") || el.closest(".qx-brand-covered, .qx-wm-active, .qx-premium-wm-active, .qx-quantrex-wm, .qx-premium-wm, .qx-premium-wm-sheet, .qx-diag-watermark, .qx-brand-overlay, .qx-wm-mask, .qx-marks-scrub, .qx-marks-strip")) return;
      if (el.querySelector("img.qx-pool-fig, img.qx-no-wm[src*='cdn-question-pool'], img.qx-no-wm[src*='/pyq/']")) return;
      el.remove();
    });
    scope.querySelectorAll("div,span,p").forEach(el => {
      if (el.children.length > 2) return;
      const t = (el.textContent || "").trim();
      if (!WM_TEXT_RX.test(t)) return;
      const st = window.getComputedStyle ? getComputedStyle(el) : el.style;
      if (st && (st.position === "absolute" || st.position === "fixed" || parseFloat(st.opacity) < 1)) {
        el.remove();
      }
    });
  }

  function washBakedWatermark(img) {
    if (!img || img.dataset.qxWashed === "1") return;
    img.dataset.qxWashed = "1";
    img.classList.add("qx-no-wm");
    img.style.display = "block";
    img.style.visibility = "visible";
    img.style.opacity = "1";
    if (typeof QxImgClean !== "undefined") QxImgClean.processImage(img);
  }

  function tagDiagramImages(root) {
    const scope = root || document.body;
    if (!scope) return;
    scope.querySelectorAll("img").forEach(img => {
      if (img.closest(".qx-diagram-slot, #qxDiagramSlot, .mathjax_ignore, .tex2jax_ignore")) return;
      const src = img.getAttribute("src") || "";
      if (!isPoolDiagram(src, img)) return;
      img.classList.add("qx-no-wm");
      img.removeAttribute("data-brand");
      washBakedWatermark(img);
    });
  }

  function scan(root) {
    removeOverlayNodes(root);
    tagDiagramImages(root);
  }

  return { cleanHtml, scan, isPoolDiagram, removeOverlayNodes, tagDiagramImages, washBakedWatermark };
})();