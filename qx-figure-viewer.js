// Quantrex figures:
// - Question: ONE clear figure, no box, no MARKS watermark
// - ONE circle "+" on the right of each figure
// - Click + → original Marks (watermark only in zoom)
(function () {
  const LB_ID = "qxFigLightbox";
  const ZOOM_CLS = "qx-fig-zoom-btn";
  const STRIP_VER = "21";

  function close() {
    document.querySelectorAll("#" + LB_ID + ", .qx-fig-lightbox").forEach((el) => el.remove());
    document.body.classList.remove("qx-fig-lb-open");
  }

  function fixOrigUrl(u) {
    return String(u || "")
      .replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/")
      .replace(/https?:\/\/cdn-question-pool\.app\//gi, "https://cdn-question-pool.getmarks.app/");
  }

  function isUiIcon(img) {
    if (!img) return true;
    if (img.closest(".qx-marks-icon, .exam-pill-logo, .fc-img, .qx-exam-logo, .subj-mini-ic")) return true;
    const src = String(img.getAttribute("src") || img.dataset.qxOrigSrc || "");
    return /cdn-assets\.getmarks|ic_content_exam_|formula_cards/i.test(src);
  }

  function isPoolFig(img) {
    if (!img || img.tagName !== "IMG" || isUiIcon(img)) return false;
    const src = img.getAttribute("src") || img.dataset.qxOrigSrc || "";
    return (
      /cdn-question-pool|cdn\.quizrr|\/pyq\/|proxy-image|data:image\/png|data:image\/jpeg/i.test(src) ||
      img.classList.contains("qx-pool-fig") ||
      img.classList.contains("qx-fig-img")
    );
  }

  function originalMarksSrc(img) {
    if (!img) return "";
    let orig = fixOrigUrl(img.dataset.qxOrigSrc || "");
    if (/cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(orig) && !/proxy-image|data:image/i.test(orig)) return orig;
    const cur = String(img.getAttribute("src") || "");
    if (/proxy-image/i.test(cur)) {
      try {
        const u = new URL(cur, location.origin);
        const inner = u.searchParams.get("url");
        if (inner) return fixOrigUrl(decodeURIComponent(inner));
      } catch (_) { /* */ }
    }
    if (/cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(cur)) return fixOrigUrl(cur);
    return orig || cur;
  }

  function openOriginalMarks(img) {
    if (!img) return;
    close();
    const src = originalMarksSrc(img);
    if (!src) return;
    const lb = document.createElement("div");
    lb.id = LB_ID;
    lb.className = "qx-fig-lightbox";
    lb.innerHTML =
      '<button type="button" class="qx-fig-lb-close" aria-label="Close">×</button>' +
      '<div class="qx-fig-lb-stage"><img class="qx-fig-lb-img" alt="" referrerpolicy="no-referrer" /></div>';
    document.body.appendChild(lb);
    document.body.classList.add("qx-fig-lb-open");
    const out = lb.querySelector(".qx-fig-lb-img");
    out.removeAttribute("crossorigin");
    out.src = src;
    lb.querySelector(".qx-fig-lb-close").onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      close();
    };
    lb.onclick = (e) => {
      if (e.target === lb || e.target.classList.contains("qx-fig-lb-stage")) close();
    };
  }

  /** Single host per image — prefer innermost wrap (avoids nested double +) */
  function hostForImg(img) {
    if (!img) return null;
    // Prefer flat wrap directly around the img
    if (img.parentElement && img.parentElement.classList.contains("qx-fig-flat")) {
      return img.parentElement;
    }
    const inner = img.closest(".qx-fig-flat, .qx-fig-inner, .qx-opt-fig, .qx-fig");
    if (inner) return inner;
    return img.closest(
      "#qxDiagramSlot, .qx-diagram-slot, .qx-opt-diagram-slot, .qx-diagram-seg, .qx-pool-fig-wrap"
    ) || img.parentElement;
  }

  function purgeAllZoomButtons(fromEl) {
    // Remove every zoom btn under a figure tree so only one remains
    const root =
      fromEl.closest(".mtk-opt, .mtk-q-text, .qx-question-body, .mtk-main, .qx-content, .sol-body") ||
      fromEl.parentElement ||
      document;
    // only purge within the figure cluster of this image
    const cluster =
      fromEl.closest(
        "#qxDiagramSlot, .qx-diagram-slot, .qx-opt-diagram-slot, .qx-diagram-seg, .qx-fig-flat, .qx-pool-fig-wrap, .qx-fig, .qx-opt-fig, .mtk-opt-text, .qx-prac-opt-text"
      ) || fromEl.parentElement;
    if (cluster) {
      cluster.querySelectorAll("." + ZOOM_CLS).forEach((b) => b.remove());
    }
  }

  function ensureZoomBtn(img) {
    if (!isPoolFig(img)) return;
    if (!img.dataset.qxFigId) {
      img.dataset.qxFigId = "fig" + Math.random().toString(36).slice(2, 10);
    }
    const figId = img.dataset.qxFigId;
    const host = hostForImg(img);
    if (!host) return;

    // Nuke duplicates in this figure cluster first
    purgeAllZoomButtons(img);

    host.classList.add("qx-fig-host");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = ZOOM_CLS;
    btn.setAttribute("aria-label", "Zoom figure");
    btn.title = "Zoom";
    btn.textContent = "+";
    btn.dataset.qxFor = figId;
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openOriginalMarks(img);
    };
    host.appendChild(btn);
  }

  function cleanInPage(img) {
    if (!isPoolFig(img)) return;
    img.classList.add("qx-pool-fig", "qx-no-wm");
    img.style.setProperty("opacity", "1", "important");
    img.style.setProperty("visibility", "visible", "important");
    img.style.setProperty("display", "block", "important");

    try {
      const cur = String(img.getAttribute("src") || "");
      let orig = fixOrigUrl(img.dataset.qxOrigSrc || "");
      if (!orig || /proxy-image|data:image/i.test(orig)) {
        if (/proxy-image/i.test(cur)) {
          try {
            const u = new URL(cur, location.origin);
            const inner = u.searchParams.get("url");
            if (inner) orig = fixOrigUrl(decodeURIComponent(inner));
          } catch (_) { /* */ }
        } else if (/cdn-question-pool|\/pyq\//i.test(cur)) {
          orig = fixOrigUrl(cur);
        }
      }
      if (orig && /cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(orig)) {
        img.dataset.qxOrigSrc = orig;
      }

      // Force clean proxy for every pool figure (server-side MARKS wipe)
      if (
        orig &&
        /cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(orig) &&
        !/data:image/i.test(cur) &&
        typeof QxImgClean !== "undefined" &&
        QxImgClean.proxyImageUrl
      ) {
        const want = QxImgClean.proxyImageUrl(orig);
        // Re-proxy if not on current clean ver
        if (!/proxy-image/i.test(cur) || !/v=21/.test(cur)) {
          img.crossOrigin = "anonymous";
          if (img.getAttribute("src") !== want) img.src = want;
        }
      }

      // Client soft-strip residual MARKS (always until v21)
      if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.paintMarksHideOnly) {
        if (img.dataset.qxSoftStrip !== "2" || img.dataset.qxSoftVer !== STRIP_VER) {
          const run = () => void QxPremiumWM.paintMarksHideOnly(img);
          if (img.complete && img.naturalWidth > 8) {
            // next frame so proxy paint is ready
            requestAnimationFrame(run);
          } else {
            img.addEventListener("load", run, { once: true });
          }
        }
      }
    } catch (_) { /* */ }
  }

  function dedupeZoomGlobal(scope) {
    // Safety: if any host has >1 zoom btn, keep first only
    scope.querySelectorAll(".qx-fig-host, .qx-fig-flat, .qx-diagram-slot, .qx-opt-diagram-slot").forEach((host) => {
      const btns = host.querySelectorAll("." + ZOOM_CLS);
      if (btns.length > 1) {
        for (let i = 1; i < btns.length; i++) btns[i].remove();
      }
    });
    // Nested: if parent and child both have +, remove parent
    scope.querySelectorAll("." + ZOOM_CLS).forEach((btn) => {
      const host = btn.parentElement;
      if (!host) return;
      const childHosts = host.querySelectorAll(".qx-fig-host ." + ZOOM_CLS + ", .qx-fig-flat ." + ZOOM_CLS);
      // if this host contains another host with a button, remove this host's button(s)
      const nested = host.querySelector(".qx-fig-flat, .qx-fig-inner, .qx-fig");
      if (nested && nested !== host && nested.querySelector("." + ZOOM_CLS) && host.querySelector(":scope > ." + ZOOM_CLS)) {
        host.querySelectorAll(":scope > ." + ZOOM_CLS).forEach((b) => b.remove());
      }
    });
  }

  function bind(root) {
    const scope = root || document.body;
    if (!scope || !scope.querySelectorAll) return;

    // Remove all zoom buttons first, then re-add exactly one per figure
    try {
      scope.querySelectorAll("." + ZOOM_CLS).forEach((b) => b.remove());
    } catch (_) { /* */ }

    const seen = new Set();
    const imgs = scope.querySelectorAll(
      "img.qx-pool-fig, img.qx-fig-img, img.qx-no-wm, " +
      "#qxDiagramSlot img, .qx-diagram-slot img, .qx-opt-diagram-slot img, " +
      ".mtk-opt-text img, .qx-prac-opt-text img, .mtk-q-text img, " +
      ".mtk-main img[src*='cdn-question-pool'], .mtk-main img[src*='/pyq/'], " +
      ".mtk-main img[src*='proxy-image'], .mtk-main img[src*='data:image'], " +
      ".qx-content img[src*='cdn-question-pool'], .qx-content img[src*='/pyq/'], " +
      ".qx-content img[src*='proxy-image']"
    );

    imgs.forEach((img) => {
      if (!isPoolFig(img)) return;
      // Deduplicate same img processed twice
      if (seen.has(img)) return;
      seen.add(img);
      cleanInPage(img);
      ensureZoomBtn(img);
    });

    dedupeZoomGlobal(scope);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  let t = 0;
  function scheduleBind() {
    if (t) return;
    t = window.setTimeout(() => {
      t = 0;
      bind(document);
    }, 80);
  }

  let lastBind = 0;
  const obs = new MutationObserver(() => {
    // throttle heavy rebinds
    const now = Date.now();
    if (now - lastBind < 200) return;
    lastBind = now;
    scheduleBind();
  });

  function start() {
    close();
    bind(document);
    if (document.body) {
      obs.observe(document.body, { childList: true, subtree: true });
    }
    setInterval(() => {
      // Fix double +
      document.querySelectorAll(".qx-fig-host, .qx-fig-flat").forEach((host) => {
        const btns = host.querySelectorAll(":scope > ." + ZOOM_CLS);
        for (let i = 1; i < btns.length; i++) btns[i].remove();
      });
      // Re-clean dirty pool imgs
      const dirty = document.querySelectorAll(
        "img.qx-pool-fig:not([data-qx-soft-ver='" + STRIP_VER + "']), " +
        ".mtk-main img[src*='cdn-question-pool'], .mtk-main img[src*='/pyq/']"
      );
      if (dirty.length) bind(document);
    }, 1200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  window.addEventListener("qx:question-rendered", scheduleBind);
  window.addEventListener("qx:practice-ready", scheduleBind);

  window.QxFigureViewer = { open: openOriginalMarks, close, bind, markClickable: bind, scheduleBind };
})();
