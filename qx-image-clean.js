// Quantrex — permanent third-party watermark removal from question diagrams
window.QxImgClean = (() => {
  const DB_NAME = "quantrex_clean_images_v1";
  const DB_STORE = "blobs";
  const MANIFEST_URL = "data/qx_clean_manifest.json";
  const REVIEW_URL = "data/qx_image_review.json";
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
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }).catch(() => null);
    return dbPromise;
  }

  async function getCachedBlob(url) {
    const db = await openDb();
    if (!db) return null;
    const key = hashUrl(url);
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
    const key = hashUrl(url);
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
      else manifest = { map: {} };
    } catch (_) {
      manifest = { map: {} };
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
    if (m.map && m.map[fixed]) return m.map[fixed];
    if (m.map && m.map[url]) return m.map[url];
    return fixed;
  }

  function isWatermarkPixel(r, g, b, a) {
    if (a !== undefined && a < 20) return false;
    const avg = (r + g + b) / 3;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    return chroma < 30 && avg >= 178 && avg <= 253;
  }

  function hasDarkNeighbor(data, w, h, x, y, radius) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const i = (ny * w + nx) * 4;
        if ((data[i] + data[i + 1] + data[i + 2]) / 3 < 95) return true;
      }
    }
    return false;
  }

  function bgColor(data, w, h, x, y) {
    const samples = [];
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const i = (ny * w + nx) * 4;
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (avg > 248) samples.push([data[i], data[i + 1], data[i + 2]]);
      }
    }
    if (!samples.length) return [255, 255, 255];
    const r = Math.round(samples.reduce((s, p) => s + p[0], 0) / samples.length);
    const g = Math.round(samples.reduce((s, p) => s + p[1], 0) / samples.length);
    const b = Math.round(samples.reduce((s, p) => s + p[2], 0) / samples.length);
    return [r, g, b];
  }

  function cleanImageData(data, w, h) {
    const zones = [
      { x0: Math.floor(w * 0.76), y0: Math.floor(h * 0.80), x1: w, y1: h },
      { x0: 0, y0: Math.floor(h * 0.80), x1: Math.ceil(w * 0.24), y1: h },
      { x0: Math.floor(w * 0.76), y0: 0, x1: w, y1: Math.ceil(h * 0.20) }
    ];
    let removed = 0;
    let zonePixels = 0;
    let darkInZones = 0;

    zones.forEach(z => {
      for (let y = z.y0; y < z.y1; y++) {
        for (let x = z.x0; x < z.x1; x++) {
          zonePixels++;
          const i = (y * w + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if ((r + g + b) / 3 < 100) darkInZones++;
          if (isWatermarkPixel(r, g, b, a)) {
            const bg = bgColor(data, w, h, x, y);
            data[i] = bg[0];
            data[i + 1] = bg[1];
            data[i + 2] = bg[2];
            data[i + 3] = 255;
            removed++;
          }
        }
      }
    });

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const d1 = Math.abs(x / Math.max(w, 1) - y / Math.max(h, 1));
        const d2 = Math.abs(1 - x / Math.max(w, 1) - y / Math.max(h, 1));
        if (d1 > 0.14 && d2 > 0.14) continue;
        const i = (y * w + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (!isWatermarkPixel(r, g, b, a)) continue;
        if (hasDarkNeighbor(data, w, h, x, y, 2)) continue;
        const bg = bgColor(data, w, h, x, y);
        data[i] = bg[0];
        data[i + 1] = bg[1];
        data[i + 2] = bg[2];
        data[i + 3] = 255;
        removed++;
      }
    }

    const darkRatio = zonePixels ? darkInZones / zonePixels : 0;
    const flagged = darkRatio > 0.42 && removed < 8;
    return { removed, flagged, darkRatio };
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

  function showReviewPlaceholder(img, reason) {
    img.classList.add("qx-img-flagged");
    img.alt = "";
    img.removeAttribute("src");
    img.style.display = "none";
    const wrap = img.closest(".qx-fig, .qx-opt-fig, .qx-img-wrap") || img.parentElement;
    if (!wrap || wrap.querySelector(".qx-img-review-note")) return;
    const note = document.createElement("div");
    note.className = "qx-img-review-note";
    note.textContent = reason || "Figure flagged for manual review — not published.";
    wrap.appendChild(note);
  }

  async function processImage(img) {
    const rawSrc = img.getAttribute("src") || img.dataset.qxOrigSrc || "";
    if (!isPoolDiagram(rawSrc, img)) return;
    if (img.dataset.qxCleaned === "1" || img.dataset.qxCleanPending === "1") return;

    const src = fixUrl(rawSrc);
    img.dataset.qxOrigSrc = src;

    const review = await loadReview();
    if (review.has(src)) {
      showReviewPlaceholder(img, "Figure under manual review.");
      img.dataset.qxCleaned = "flagged";
      return;
    }

    const manifestPath = await cleanUrl(src);
    if (manifestPath !== src && !manifestPath.startsWith("http")) {
      img.src = manifestPath;
      img.dataset.qxCleaned = "1";
      img.classList.add("qx-no-wm", "qx-cleaned");
      return;
    }

    const cached = await getCachedBlob(src);
    if (cached) {
      img.src = URL.createObjectURL(cached);
      img.dataset.qxCleaned = "1";
      img.classList.add("qx-no-wm", "qx-cleaned");
      return;
    }

    img.dataset.qxCleanPending = "1";
    const run = async () => {
      try {
        if (!img.complete || !img.naturalWidth) {
          await new Promise((res, rej) => {
            img.addEventListener("load", res, { once: true });
            img.addEventListener("error", rej, { once: true });
          });
        }
        const result = await cleanFromImage(img);
        if (!result || !result.blob) throw new Error("clean failed");
        if (result.stats.flagged) {
          showReviewPlaceholder(img, "Watermark overlaps figure — flagged for review.");
          img.dataset.qxCleaned = "flagged";
          return;
        }
        await putCachedBlob(src, result.blob);
        img.src = URL.createObjectURL(result.blob);
        img.dataset.qxCleaned = "1";
        img.classList.remove("qx-img-flagged");
        img.classList.add("qx-no-wm", "qx-cleaned");
      } catch (_) {
        img.classList.add("qx-no-wm");
      } finally {
        delete img.dataset.qxCleanPending;
      }
    };
    if (img.complete && img.naturalWidth) run();
    else img.addEventListener("load", () => run(), { once: true });
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
    loadReview
  };
})();