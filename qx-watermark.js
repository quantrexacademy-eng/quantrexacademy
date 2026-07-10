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
    out = out.replace(/<[^>]*(?:watermark|Watermark|getmarks-brand|marks-app|marks_selected|vedantu)[^>]*>[\s\S]*?<\/[^>]+>/gi, "");
    out = out.replace(/<img[^>]+(?:watermark|marks-premium|ic_marks|marks-brand|getmarks-brand|vedantu)[^>]*>/gi, "");
    out = out.replace(/<div[^>]*style="[^"]*(?:MARKS|watermark|vedantu)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
    out = out.replace(/<span[^>]*style="[^"]*(?:MARKS|watermark|vedantu)[^"]*"[^>]*>[\s\S]*?<\/span>/gi, "");
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
    if (typeof QxImgClean !== "undefined") QxImgClean.processImage(img);
  }

  function tagDiagramImages(root) {
    const scope = root || document.body;
    if (!scope) return;
    scope.querySelectorAll("img").forEach(img => {
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