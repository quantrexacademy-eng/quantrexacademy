// Quantrex — embedded watermark removal (preserves diagram ink & visibility)
window.QxImgClean = (() => {
  const DB_NAME = "quantrex_clean_images_v2";
  const DB_STORE = "blobs";
  const MANIFEST_URL = "data/qx_clean_manifest.json";
  const REVIEW_URL = "data/qx_image_review.json";
  const CLEAN_VER = 2;
  const PYQ_CDN = "https://cdn-question-pool.getmarks.app/";
  const BROKEN_CDN_RX = /https?:\/\/\.app\//gi;
  const POOL_RX = /cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\/jee_main\/|\/pyq\/neet\/|\/pyq\/aiims\//i;
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
    if ((m.version || 1) >= CLEAN_VER && m.map && m.map[fixed]) return m.map[fixed];
    if ((m.version || 1) >= CLEAN_VER && m.map && m.map[url]) return m.map[url];
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
    return chroma < 40 && avg >= 148 && avg <= 246;
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
        if (!isWatermarkPixel(r, g, b, data[i + 3])) {
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
    if (!isWatermarkPixel(r, g, b, data[i + 3])) return false;
    if (isLikelyInk(r, g, b)) return false;
    const inkRadius = strict ? 2 : 1;
    if (hasInkNearby(data, w, h, x, y, inkRadius)) return false;
    const lightNeed = strict ? 0.40 : 0.55;
    if (lightContextRatio(data, w, h, x, y, 4) < lightNeed) return false;
    return true;
  }

  function cleanImageData(data, w, h) {
    let removed = 0;
    const total = w * h;

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
        if (!isWatermarkPixel(r, g, b, data[i + 3])) continue;
        if (lightContextRatio(data, w, h, x, y, 5) < 0.78) continue;
        if (hasInkNearby(data, w, h, x, y, 3)) continue;
        paintBg(data, w, h, x, y);
        removed++;
      }
    }

    const removedRatio = removed / Math.max(total, 1);
    const flagged = removedRatio > 0.38;
    return { removed, flagged, removedRatio };
  }

  function ensureCors(img) {
    const src = fixUrl(img.getAttribute("src") || img.dataset.qxOrigSrc || "");
    if (!src || src.startsWith("blob:") || src.startsWith("data:")) return Promise.resolve();
    const needsReload = img.crossOrigin !== "anonymous";
    img.crossOrigin = "anonymous";
    img.dataset.qxCors = "1";
    if (!needsReload && img.complete && img.naturalWidth) return Promise.resolve();
    return new Promise((resolve, reject) => {
      img.addEventListener("load", () => resolve(), { once: true });
      img.addEventListener("error", () => reject(new Error("cors load failed")), { once: true });
      img.src = src;
    });
  }

  function canvasToBlob(canvas) {
    return new Promise(resolve => {
      canvas.toBlob(b => resolve(b), "image/png", 1.0);
    });
  }

  async function cleanFromImage(img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, w, h);
    const stats = cleanImageData(imageData.data, w, h);
    ctx.putImageData(imageData, 0, 0);
    const blob = await canvasToBlob(canvas);
    return { blob, stats };
  }

  async function applyCleanedBlob(img, blob, src) {
    await putCachedBlob(src, blob);
    const url = URL.createObjectURL(blob);
    img.src = url;
    img.dataset.qxCleaned = "1";
    img.dataset.qxCleanVer = String(CLEAN_VER);
    img.classList.remove("qx-img-flagged");
    img.style.display = "";
    img.classList.add("qx-no-wm", "qx-cleaned");
  }

  async function runtimeClean(img, src) {
    try {
      try { await ensureCors(img); } catch (_) { /* fallback */ }
      if (!img.complete || !img.naturalWidth) {
        await new Promise((res, rej) => {
          img.addEventListener("load", res, { once: true });
          img.addEventListener("error", rej, { once: true });
        });
      }
      const result = await cleanFromImage(img);
      if (!result || !result.blob) return;
      await applyCleanedBlob(img, result.blob, src);
    } catch (_) {
      img.classList.add("qx-no-wm");
    }
  }

  async function processImage(img) {
    const rawSrc = img.getAttribute("src") || img.dataset.qxOrigSrc || "";
    if (!isPoolDiagram(rawSrc, img)) return;
    if (img.dataset.qxCleanVer === String(CLEAN_VER) && img.dataset.qxCleaned === "1") return;
    if (img.dataset.qxCleanPending === "1") return;

    const src = fixUrl(rawSrc);
    img.dataset.qxOrigSrc = src;

    const cached = await getCachedBlob(src);
    if (cached) {
      await applyCleanedBlob(img, cached, src);
      return;
    }

    const m = await loadManifest();
    const manifestPath = (m.version || 1) >= CLEAN_VER && m.map ? (m.map[src] || m.map[rawSrc]) : null;

    img.dataset.qxCleanPending = "1";
    const finish = async () => {
      try {
        if (manifestPath && !manifestPath.startsWith("http")) {
          img.crossOrigin = "anonymous";
          img.src = manifestPath;
          await new Promise((res, rej) => {
            img.addEventListener("load", res, { once: true });
            img.addEventListener("error", rej, { once: true });
          });
        }
        await runtimeClean(img, src);
      } finally {
        delete img.dataset.qxCleanPending;
      }
    };

    if (img.complete && img.naturalWidth && !manifestPath) finish();
    else if (manifestPath) finish();
    else {
      img.addEventListener("load", () => finish(), { once: true });
      if (!img.getAttribute("src")) img.src = src;
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
    CLEAN_VER
  };
})();