// Quantrex — embedded watermark removal (never hides or breaks figures)
window.QxImgClean = (() => {
  const DB_NAME = "quantrex_clean_images_v7";
  const DB_STORE = "blobs";
  const MANIFEST_URL = "data/qx_clean_manifest.json";
  const REVIEW_URL = "data/qx_image_review.json";
  const CLEAN_VER = 7;
  const MANIFEST_MIN_VER = 3;
  const WM_RESIDUE_MAX = 0.018;
  const PYQ_CDN = "https://cdn-question-pool.getmarks.app/";
  const PROXY_BASE = (typeof QUANTREX_STACK !== "undefined" && QUANTREX_STACK.frontend && QUANTREX_STACK.frontend.url)
    ? QUANTREX_STACK.frontend.url.replace(/\/$/, "")
    : "https://quantrexacademy-lemon.vercel.app";
  const BROKEN_CDN_RX = /https?:\/\/\.app\//gi;
  const POOL_RX = /cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\/|\/cbse\/|ap_eamcet/i;
  const OPT_IMG_SEL = ".mtk-opt-text, .qx-prac-opt-text, .mtk-opt, .qa-opt, .qx-prac-opt";
  const SKIP_RX = /watermark|marks-premium|ic_marks|marks_selected|getmarks-brand|web_assets|formula_cards|ic_content_exam_|cpyqb\/subjects\//i;

  let manifest = null;
  let reviewSet = null;
  let dbPromise = null;

  function fixUrl(url) {
    return String(url || "").replace(BROKEN_CDN_RX, PYQ_CDN);
  }

  function isPoolDiagram(src, el) {
    const s = fixUrl(src);
    if (!s || s.startsWith("data:") || s.startsWith("blob:")) return false;
    if (SKIP_RX.test(s)) return false;
    if (el && (el.classList.contains("qx-marks-icon") || el.classList.contains("fc-img"))) return false;
    return POOL_RX.test(s);
  }

  function hashUrl(url) {
    const s = fixUrl(url);
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
    return (h >>> 0).toString(16);
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      if (!window.indexedDB) return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    }).catch(() => null);
    return dbPromise;
  }

  async function getCachedBlob(url) {
    const db = await openDb();
    if (!db) return null;
    const key = hashUrl(url) + ":v" + CLEAN_VER;
    return new Promise(resolve => {
      const tx = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  async function putCachedBlob(url, blob) {
    const db = await openDb();
    if (!db) return;
    const key = hashUrl(url) + ":v" + CLEAN_VER;
    return new Promise(resolve => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  async function loadManifest() {
    if (manifest) return manifest;
    try {
      const r = await fetch(MANIFEST_URL, { cache: "no-store" });
      if (r.ok) manifest = await r.json();
      else manifest = { map: {}, version: 1 };
    } catch (_) {
      manifest = { map: {}, version: 1 };
    }
    return manifest;
  }

  async function loadReview() {
    if (reviewSet) return reviewSet;
    try {
      const r = await fetch(REVIEW_URL, { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        reviewSet = new Set((j.flagged || []).map(fixUrl));
      } else reviewSet = new Set();
    } catch (_) {
      reviewSet = new Set();
    }
    return reviewSet;
  }

  async function cleanUrl(url) {
    const fixed = fixUrl(url);
    const m = await loadManifest();
    if ((m.version || 1) >= MANIFEST_MIN_VER && m.map && m.map[fixed]) return m.map[fixed];
    if ((m.version || 1) >= MANIFEST_MIN_VER && m.map && m.map[url]) return m.map[url];
    return fixed;
  }

  function pixelAvg(data, i) {
    return (data[i] + data[i + 1] + data[i + 2]) / 3;
  }

  function isLikelyInk(r, g, b) {
    const avg = (r + g + b) / 3;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (avg < 118) return true;
    if (chroma > 45 && avg < 210) return true;
    return false;
  }

  function isWatermarkPixel(r, g, b, a) {
    if (a !== undefined && a < 10) return false;
    const avg = (r + g + b) / 3;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    return chroma < 42 && avg >= 140 && avg <= 248;
  }

  function isMarksOverlay(r, g, b, a) {
    if (a !== undefined && a < 8) return false;
    const avg = (r + g + b) / 3;
    if (avg < 108) return false;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (chroma >= 60) return false;
    if (b >= r - 22 && b >= g - 14 && avg >= 125 && avg <= 252) return true;
    if (chroma < 44 && avg >= 132 && avg <= 248) return true;
    return false;
  }

  function isRemovableWm(r, g, b, a) {
    return isWatermarkPixel(r, g, b, a) || isMarksOverlay(r, g, b, a);
  }

  function hasInkNearby(data, w, h, x, y, radius) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const i = (ny * w + nx) * 4;
        if (isLikelyInk(data[i], data[i + 1], data[i + 2])) return true;
      }
    }
    return false;
  }

  function lightContextRatio(data, w, h, x, y, radius) {
    let light = 0;
    let total = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        total++;
        if (pixelAvg(data, (ny * w + nx) * 4) > 165) light++;
      }
    }
    return total ? light / total : 0;
  }

  function medianChannel(samples, ch) {
    const arr = samples.map(p => p[ch]).sort((a, b) => a - b);
    return arr[Math.floor(arr.length / 2)];
  }

  function localBgColor(data, w, h, x, y) {
    const samples = [];
    const rays = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [2, 0], [-2, 0], [0, 2], [0, -2],
      [1, 1], [-1, -1], [1, -1], [-1, 1]
    ];
    for (const [sdx, sdy] of rays) {
      for (let step = 1; step <= 10; step++) {
        const nx = x + sdx * step;
        const ny = y + sdy * step;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) break;
        const i = (ny * w + nx) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (isLikelyInk(r, g, b)) break;
        if (!isRemovableWm(r, g, b, data[i + 3])) {
          samples.push([r, g, b]);
          break;
        }
      }
    }
    if (samples.length >= 2) {
      return [medianChannel(samples, 0), medianChannel(samples, 1), medianChannel(samples, 2)];
    }
    const white = [];
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const i = (ny * w + nx) * 4;
        if (pixelAvg(data, i) > 242) white.push([data[i], data[i + 1], data[i + 2]]);
      }
    }
    if (white.length) {
      return [
        Math.round(white.reduce((s, p) => s + p[0], 0) / white.length),
        Math.round(white.reduce((s, p) => s + p[1], 0) / white.length),
        Math.round(white.reduce((s, p) => s + p[2], 0) / white.length)
      ];
    }
    return [255, 255, 255];
  }

  function paintBg(data, w, h, x, y) {
    const i = (y * w + x) * 4;
    const bg = localBgColor(data, w, h, x, y);
    data[i] = bg[0];
    data[i + 1] = bg[1];
    data[i + 2] = bg[2];
    data[i + 3] = 255;
  }

  function safeToRemove(data, w, h, x, y, strict) {
    const i = (y * w + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (!isRemovableWm(r, g, b, data[i + 3])) return false;
    if (isLikelyInk(r, g, b)) return false;
    const inkRadius = strict ? 2 : 1;
    if (hasInkNearby(data, w, h, x, y, inkRadius)) return false;
    const lightNeed = strict ? 0.38 : 0.52;
    if (lightContextRatio(data, w, h, x, y, 4) < lightNeed) return false;
    return true;
  }

  function safeOverlayRemove(data, w, h, x, y) {
    const i = (y * w + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const avg = (r + g + b) / 3;
    if (!isRemovableWm(r, g, b, data[i + 3])) return false;
    if (isLikelyInk(r, g, b)) return false;
    if (avg < 112) return false;
    return true;
  }

  function countInk(data, w, h) {
    let ink = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (isLikelyInk(data[i], data[i + 1], data[i + 2])) ink++;
      }
    }
    return ink;
  }

  function countWm(data, w, h) {
    let wm = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (isRemovableWm(data[i], data[i + 1], data[i + 2], data[i + 3])) wm++;
      }
    }
    return wm;
  }

  function cleanImageData(data, w, h) {
    let removed = 0;
    const total = w * h;
    const beforeInk = countInk(data, w, h);
    const beforeWm = countWm(data, w, h);

    const corners = [
      { x0: Math.floor(w * 0.72), y0: Math.floor(h * 0.78), x1: w, y1: h },
      { x0: 0, y0: Math.floor(h * 0.78), x1: Math.ceil(w * 0.28), y1: h },
      { x0: Math.floor(w * 0.72), y0: 0, x1: w, y1: Math.ceil(h * 0.22) }
    ];
    corners.forEach(z => {
      for (let y = z.y0; y < z.y1; y++) {
        for (let x = z.x0; x < z.x1; x++) {
          if (!safeToRemove(data, w, h, x, y, false)) continue;
          paintBg(data, w, h, x, y);
          removed++;
        }
      }
    });

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const d1 = Math.abs(x / Math.max(w, 1) - y / Math.max(h, 1));
        const d2 = Math.abs(1 - x / Math.max(w, 1) - y / Math.max(h, 1));
        if (d1 > 0.16 && d2 > 0.16) continue;
        if (!safeToRemove(data, w, h, x, y, false)) continue;
        paintBg(data, w, h, x, y);
        removed++;
      }
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!safeToRemove(data, w, h, x, y, true)) continue;
        paintBg(data, w, h, x, y);
        removed++;
      }
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (!isRemovableWm(r, g, b, data[i + 3])) continue;
        if (lightContextRatio(data, w, h, x, y, 5) < 0.72) continue;
        if (hasInkNearby(data, w, h, x, y, 3)) continue;
        paintBg(data, w, h, x, y);
        removed++;
      }
    }

    const cx0 = Math.floor(w * 0.06);
    const cy0 = Math.floor(h * 0.06);
    const cx1 = Math.ceil(w * 0.94);
    const cy1 = Math.ceil(h * 0.94);
    for (let y = cy0; y < cy1; y++) {
      for (let x = cx0; x < cx1; x++) {
        if (!safeOverlayRemove(data, w, h, x, y)) continue;
        paintBg(data, w, h, x, y);
        removed++;
      }
    }

    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (!safeOverlayRemove(data, w, h, x, y)) continue;
          paintBg(data, w, h, x, y);
          removed++;
        }
      }
    }

    const afterInk = countInk(data, w, h);
    const afterWm = countWm(data, w, h);
    const removedRatio = removed / Math.max(total, 1);
    const damaged = afterInk < Math.max(45, beforeInk * 0.22);
    const improved = afterWm < beforeWm * 0.55 || (beforeWm > 0 && afterWm === 0);
    const residueRatio = afterWm / Math.max(total, 1);
    const cleanEnough = residueRatio <= WM_RESIDUE_MAX;
    return {
      removed, damaged, improved, cleanEnough, residueRatio,
      removedRatio, beforeInk, afterInk, beforeWm, afterWm
    };
  }

  function showReviewPlaceholder(img) {
    img.style.display = "none";
    img.classList.add("qx-img-flagged");
    const wrap = img.closest(".qx-fig, .qx-opt-fig, .qx-img-wrap, figure") || img.parentElement;
    if (!wrap || wrap.querySelector(".qx-img-review-note")) return;
    const note = document.createElement("div");
    note.className = "qx-img-review-note";
    note.textContent = "Diagram is being professionally recreated — not published with third-party branding.";
    wrap.classList.add("qx-img-under-review");
    wrap.insertBefore(note, img);
  }

  function isInOptionContext(node) {
    return !!(node && node.closest && node.closest(OPT_IMG_SEL));
  }

  function ensureDiagramWrap(img) {
    if (img.closest(".qx-fig, .qx-opt-fig")) return img.closest(".qx-fig, .qx-opt-fig");
    if (isInOptionContext(img)) {
      const span = document.createElement("span");
      span.className = "qx-opt-fig";
      img.parentNode.insertBefore(span, img);
      span.appendChild(img);
      img.classList.add("qx-no-wm");
      return span;
    }
    const fig = document.createElement("figure");
    fig.className = "qx-fig";
    img.parentNode.insertBefore(fig, img);
    fig.appendChild(img);
    img.classList.add("qx-fig-img", "qx-no-wm");
    return fig;
  }

  function proxyImageUrl(cdnSrc) {
    const fixed = fixUrl(cdnSrc);
    if (location.origin && !location.origin.includes("localhost")) {
      if (location.origin.includes("vercel.app")) {
        return `${location.origin}/api/proxy-image?url=${encodeURIComponent(fixed)}`;
      }
    }
    return `${PROXY_BASE}/api/proxy-image?url=${encodeURIComponent(fixed)}`;
  }

  function markPendingMask(img) {
    if (!img.classList.contains("qx-cleaned")) {
      ensureDiagramWrap(img);
      img.classList.add("qx-wm-pending");
      const fig = img.closest(".qx-fig, .qx-opt-fig");
      if (fig) fig.classList.add("qx-wm-pending-wrap");
    }
  }

  function stripDisplayCors(img) {
    img.removeAttribute("crossorigin");
    img.crossOrigin = null;
  }

  function restoreOriginal(img) {
    const orig = img.dataset.qxOrigSrc;
    if (!orig) return;
    stripDisplayCors(img);
    if (img.getAttribute("src") !== orig) img.src = orig;
    img.classList.remove("qx-img-flagged");
    img.style.display = "";
    img.style.visibility = "";
    img.style.opacity = "";
  }

  function loadProbe(url, useCors) {
    return new Promise(resolve => {
      const probe = new Image();
      if (useCors) probe.crossOrigin = "anonymous";
      probe.onload = () => resolve(probe.naturalWidth > 0 ? probe : null);
      probe.onerror = () => resolve(null);
      probe.src = url;
    });
  }

  async function loadForCanvas(cdnSrc, manifestPath) {
    if (manifestPath && !manifestPath.startsWith("http")) {
      const local = await loadProbe(manifestPath, false);
      if (local) return { img: local, source: manifestPath, canRead: true };
    }
    const proxy = proxyImageUrl(cdnSrc);
    const viaProxy = await loadProbe(proxy, true);
    if (viaProxy) return { img: viaProxy, source: proxy, canRead: true };
    const cors = await loadProbe(cdnSrc, true);
    if (cors) return { img: cors, source: cdnSrc, canRead: true };
    return null;
  }

  function canvasToBlob(canvas) {
    return new Promise(resolve => {
      canvas.toBlob(b => resolve(b), "image/png", 1.0);
    });
  }

  async function cleanFromProbe(probe) {
    const w = probe.naturalWidth || probe.width;
    const h = probe.naturalHeight || probe.height;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    try {
      ctx.drawImage(probe, 0, 0);
      const imageData = ctx.getImageData(0, 0, w, h);
      const stats = cleanImageData(imageData.data, w, h);
      if (stats.damaged || !stats.improved || !stats.cleanEnough) return { blob: null, stats };
      ctx.putImageData(imageData, 0, 0);
      const blob = await canvasToBlob(canvas);
      return { blob, stats };
    } catch (_) {
      return null;
    }
  }

  async function applyCleanedBlob(img, blob, src) {
    if (!blob) return false;
    await putCachedBlob(src, blob);
    const url = URL.createObjectURL(blob);
    const prev = img.src;
    return new Promise(resolve => {
      const done = (ok) => {
        if (!ok) {
          URL.revokeObjectURL(url);
          restoreOriginal(img);
        } else {
          img.dataset.qxCleaned = "1";
          img.dataset.qxCleanVer = String(CLEAN_VER);
          img.classList.remove("qx-img-flagged");
          img.style.display = "";
          img.classList.add("qx-no-wm", "qx-cleaned");
        }
        resolve(ok);
      };
      img.addEventListener("load", () => done(true), { once: true });
      img.addEventListener("error", () => {
        img.src = prev;
        done(false);
      }, { once: true });
      stripDisplayCors(img);
      img.src = url;
    });
  }

  function waitForDisplay(img, url, forceReload) {
    return new Promise(resolve => {
      const finish = () => resolve(img.naturalWidth > 0);
      stripDisplayCors(img);
      const needsReload = forceReload || !img.naturalWidth || !img.getAttribute("src")
        || img.getAttribute("src") === window.location.href
        || String(img.getAttribute("src") || "").includes("://.app/");
      if (!needsReload && img.complete && img.naturalWidth > 0) return resolve(true);
      img.addEventListener("load", finish, { once: true });
      img.addEventListener("error", finish, { once: true });
      if (needsReload) img.src = url;
      else if (img.complete) finish();
    });
  }

  async function ensureVisible(img, cdnSrc) {
    stripDisplayCors(img);
    img.dataset.qxOrigSrc = cdnSrc;
    const current = fixUrl(img.getAttribute("src") || "");
    if (current !== cdnSrc) img.src = cdnSrc;
    await waitForDisplay(img, cdnSrc, current !== cdnSrc);
    return img.naturalWidth > 0;
  }

  async function blobLooksValid(blob) {
    if (!blob || !blob.size) return false;
    const url = URL.createObjectURL(blob);
    try {
      const probe = await loadProbe(url, false);
      return !!(probe && probe.naturalWidth > 0 && probe.naturalHeight > 0);
    } catch (_) {
      return false;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function tryDisplayManifest(img, manifestPath, cdnSrc) {
    if (!manifestPath || manifestPath.startsWith("http")) return false;
    stripDisplayCors(img);
    img.dataset.qxOrigSrc = cdnSrc;
    const ok = await new Promise(resolve => {
      const done = (success) => {
        if (success) {
          img.dataset.qxCleaned = "1";
          img.dataset.qxCleanVer = String(CLEAN_VER);
          img.classList.add("qx-no-wm", "qx-cleaned");
          img.classList.remove("qx-img-flagged", "qx-wm-pending");
          const fig = img.closest(".qx-fig, .qx-opt-fig");
          if (fig) fig.classList.remove("qx-wm-pending-wrap");
        }
        resolve(!!success);
      };
      img.addEventListener("load", () => done(img.naturalWidth > 0), { once: true });
      img.addEventListener("error", () => done(false), { once: true });
      img.src = manifestPath;
      if (img.complete) done(img.naturalWidth > 0);
    });
    return ok;
  }

  async function tryClean(img, cdnSrc, manifestPath) {
    if (!img.naturalWidth) return false;

    const cached = await getCachedBlob(cdnSrc);
    if (cached && await blobLooksValid(cached)) {
      const ok = await applyCleanedBlob(img, cached, cdnSrc);
      if (ok) return true;
    }

    const loaded = await loadForCanvas(cdnSrc, manifestPath);
    if (!loaded) return false;

    const result = await cleanFromProbe(loaded.img);
    if (!result || !result.blob || result.stats.damaged || !result.stats.improved) return false;
    if (!(await blobLooksValid(result.blob))) return false;
    return applyCleanedBlob(img, result.blob, cdnSrc);
  }

  function attachErrorFallback(img) {
    if (img.dataset.qxErrBound === "1") return;
    img.dataset.qxErrBound = "1";
    img.addEventListener("error", () => {
      if (img.dataset.qxOrigSrc) restoreOriginal(img);
    });
  }

  async function processImage(img) {
    const rawSrc = img.getAttribute("src") || img.dataset.qxOrigSrc || "";
    if (!isPoolDiagram(rawSrc, img)) return;
    if (img.dataset.qxCleanVer === String(CLEAN_VER) && img.dataset.qxCleaned === "1") return;
    if (img.dataset.qxCleanPending === "1") return;

    const cdnSrc = fixUrl(rawSrc);
    img.dataset.qxOrigSrc = cdnSrc;
    attachErrorFallback(img);
    stripDisplayCors(img);
    ensureDiagramWrap(img);

    const review = await loadReview();
    const isFlagged = review.has(cdnSrc);
    const m = await loadManifest();
    const manifestPath = (m.version || 1) >= MANIFEST_MIN_VER && m.map
      ? (m.map[cdnSrc] || m.map[rawSrc])
      : null;

    img.dataset.qxCleanPending = "1";
    try {
      if (manifestPath) {
        const fromManifest = await tryDisplayManifest(img, manifestPath, cdnSrc);
        if (fromManifest) {
          img.classList.remove("qx-wm-pending");
          const fig = img.closest(".qx-fig, .qx-opt-fig");
          if (fig) fig.classList.remove("qx-wm-pending-wrap");
          return;
        }
      }
      if (isFlagged && !manifestPath) {
        showReviewPlaceholder(img);
        return;
      }
      const visible = await ensureVisible(img, cdnSrc);
      if (!visible) {
        restoreOriginal(img);
        return;
      }
      const cleaned = await tryClean(img, cdnSrc, manifestPath);
      if (cleaned) {
        img.classList.remove("qx-wm-pending");
        const fig = img.closest(".qx-fig, .qx-opt-fig");
        if (fig) fig.classList.remove("qx-wm-pending-wrap");
      } else {
        markPendingMask(img);
      }
    } catch (_) {
      restoreOriginal(img);
      markPendingMask(img);
    } finally {
      delete img.dataset.qxCleanPending;
      img.classList.add("qx-no-wm");
      if (!img.classList.contains("qx-img-flagged")) {
        img.style.display = img.style.display === "none" ? "none" : "";
      }
    }
  }

  let observerStarted = false;

  function startObserver() {
    if (observerStarted || !window.MutationObserver) return;
    observerStarted = true;
    const obs = new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes.forEach(n => {
          if (n.nodeType !== 1) return;
          if (n.tagName === "IMG") processImage(n);
          else if (n.querySelectorAll) n.querySelectorAll("img").forEach(processImage);
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function scan(root) {
    const scope = root || document.body;
    if (!scope) return;
    startObserver();
    scope.querySelectorAll("img").forEach(img => processImage(img));
  }

  return {
    fixUrl,
    isPoolDiagram,
    cleanUrl,
    scan,
    processImage,
    cleanImageData,
    loadManifest,
    loadReview,
    restoreOriginal,
    CLEAN_VER
  };
})();