// Quantrex — embedded watermark removal (never hides or breaks figures)
window.QxImgClean = (() => {
  const DB_NAME = "quantrex_clean_images_v62";
  const DB_STORE = "blobs";
  const MANIFEST_URL = "data/qx_clean_manifest.json";
  const REVIEW_URL = "data/qx_image_review.json";
  const CLEAN_VER = 66;
  const CENTER_WM_MAX = 0.006;
  const WM_DETECT_MIN = 0.0035;
  const CDN_ONLY = false;
  const _pinnedHtml = new Map();
  const _cleanSrcCache = new Map();
  const _manifestExistsCache = new Map();
  let _manifestAssetsAvailable = null;
  const FIG_PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  const MIN_INK_RATIO = 0.004;
  const MIN_INK_VS_CDN = 0.38;
  const MAX_WHITE_RATIO = 0.97;
  const MANIFEST_MIN_VER = 3;
  const WM_RESIDUE_MAX = 0.048;
  const PYQ_CDN = "https://cdn-question-pool.getmarks.app/";
  const PROXY_BASE = (typeof location !== "undefined" && location.origin && !/localhost|127\.0\.0\.1/i.test(location.origin))
    ? location.origin.replace(/\/$/, "")
    : ((typeof QUANTREX_STACK !== "undefined" && QUANTREX_STACK.frontend && QUANTREX_STACK.frontend.url)
      ? QUANTREX_STACK.frontend.url.replace(/\/$/, "")
      : "https://quantrexacademy-live.web.app");
  const BROKEN_CDN_RX = /https?:\/\/\.app\//gi;
  const POOL_RX = /cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\/|\/cbse\/|ap_eamcet/i;
  const OPT_IMG_SEL = ".mtk-opt-text, .qx-prac-opt-text, .mtk-opt, .qa-opt, .qx-prac-opt";
  // NOTE: do NOT match "watermarked_images" (Quizrr organic diagram folder)
  const SKIP_RX = /marks-premium|ic_marks|marks_selected|getmarks-brand|web_assets|formula_cards|ic_content_exam_|cpyqb\/subjects\/|(?:^|\/)watermark(?:\.|_|-|$)|watermark(?:\.png|\.svg|overlay)/i;
  const BRAND_OVERLAY_IMG = "/assets/quantrex-academy-brand.png";
  const GETMARKS_POOL_RX = /cdn-question-pool\.getmarks\.app/i;
  const FIGURE_OVERRIDES_URL = "data/qx_figure_overrides.json";
  const FIGURE_OVERRIDE_FALLBACK = [];
  const LOCAL_CLEAN_RX = /^\.?\/?assets\/(diagrams|clean-diagrams|qx-figures)\//i;
  const ORG_SRC_RX = /\/assets\/diagrams\/org-src\//i;
  const QX_ORG_RX = /\/assets\/diagrams\/qx-org-[a-f0-9]+\.png/i;
  // Render like Marks web: preserve native HTML + inline diagrams
  const MARKS_NATIVE_BOOKS = new Set([
    "68f1ce4cc729e5251bd00430", // Rank Booster
    "69cfb5366ecf5579037d96a4",
    "6a4ce383c59a7b462185330f", // Fundamentals of Organic Chemistry
    "69736c8362b916d85e52cd1b", // BITSAT English & Logical Reasoning
  ]);

  function isMarksNativeBook(q) {
    if (!q) return false;
    const bid = q._book || q._bookId;
    return MARKS_NATIVE_BOOKS.has(String(bid));
  }

  let manifest = null;
  let reviewSet = null;
  let figureOverrides = null;
  let dbPromise = null;

  function fixUrl(url) {
    return String(url || "").replace(BROKEN_CDN_RX, PYQ_CDN);
  }

  function isPoolDiagram(src, el) {
    const s = fixUrl(src);
    if (!s || s.startsWith("data:")) return false;
    if (s.startsWith("blob:")) return !!(el && el.dataset && el.dataset.qxOrigSrc);
    if (SKIP_RX.test(s)) return false;
    if (el && (el.classList.contains("qx-marks-icon") || el.classList.contains("fc-img"))) return false;
    if (isLocalCleanAsset(s)) return true;
    return POOL_RX.test(s);
  }

  function poolCdnSrc(img) {
    const origRaw = fixUrl(img.dataset.qxOrigSrc || "");
    const orig = canonicalCdnSrc(origRaw) || (origRaw && POOL_RX.test(origRaw) && !SKIP_RX.test(origRaw) ? origRaw : "");
    if (orig) return orig;
    const cur = fixUrl(img.getAttribute("src") || "");
    const canon = canonicalCdnSrc(cur);
    if (canon) return canon;
    if (cur && !cur.startsWith("blob:") && !cur.includes("clean-diagrams") && !isLocalCleanAsset(cur) && !isApiFigureSrc(cur)) return cur;
    return origRaw || cur;
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
      const r = await fetch(MANIFEST_URL);
      if (r.ok) manifest = await r.json();
      else manifest = { map: {}, version: 1 };
    } catch (_) {
      manifest = { map: {}, version: 1 };
    }
    return manifest;
  }

  function isManifestCleanPath(manifestRel, cdnSrc) {
    if (!manifestRel || manifestRel.startsWith("http")) return false;
    const fixed = fixUrl(cdnSrc || "");
    return manifestRel !== fixed && manifestRel !== cdnSrc;
  }

  async function manifestAssetsAvailable() {
    if (_manifestAssetsAvailable !== null) return _manifestAssetsAvailable;
    try {
      const r = await fetch("/assets/clean-diagrams/08/1d/081d55c5d82314ae.png", { method: "HEAD" });
      _manifestAssetsAvailable = r.ok;
    } catch (_) {
      _manifestAssetsAvailable = false;
    }
    return _manifestAssetsAvailable;
  }

  async function manifestFileExists(path) {
    if (!path || path.startsWith("http")) return false;
    if (!(await manifestAssetsAvailable())) return false;
    if (_manifestExistsCache.has(path)) return _manifestExistsCache.get(path);
    const url = path.startsWith("/") ? path : "/" + path;
    try {
      const r = await fetch(url, { method: "HEAD" });
      const ok = r.ok;
      _manifestExistsCache.set(path, ok);
      return ok;
    } catch (_) {
      _manifestExistsCache.set(path, false);
      return false;
    }
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

  async function loadFigureOverrides() {
    if (figureOverrides) return figureOverrides;
    try {
      const r = await fetch(FIGURE_OVERRIDES_URL, { cache: "no-store" });
      if (r.ok) figureOverrides = await r.json();
      else figureOverrides = { version: 1, rules: [] };
    } catch (_) {
      figureOverrides = { version: 1, rules: [] };
    }
    return figureOverrides;
  }

  function normalizeAssetSrc(src) {
    const s = String(src || "").trim();
    if (!s) return s;
    if (LOCAL_CLEAN_RX.test(s)) {
      let path = s.startsWith("/") ? s : "/" + s;
      const q = path.indexOf("?");
      const base = q >= 0 ? path.slice(0, q) : path;
      const build = (typeof window !== "undefined" && window.QX_BUILD) || "1";
      return `${base}?v=${build}`;
    }
    return s;
  }

  function isLocalCleanAsset(src) {
    return LOCAL_CLEAN_RX.test(String(src || ""));
  }

  function isPreprocessedQxOrg(src) {
    return QX_ORG_RX.test(String(src || ""));
  }

  function isOrganicOrgSrc(src) {
    return ORG_SRC_RX.test(String(src || "")) && !isPreprocessedQxOrg(src);
  }

  function isOrganicFigure(src) {
    return isPreprocessedQxOrg(src) || isOrganicOrgSrc(src);
  }

  function isLocalReadyAsset(src) {
    if (isPreprocessedQxOrg(src)) return true;
    return isLocalCleanAsset(src) && !isOrganicOrgSrc(src);
  }

  function finalizeQxOrgDisplay(img) {
    if (!img || !img.isConnected) return;
    restoreOrganicFigureSize(img);
    markDisplayClean(img);
    revealOrganicClean(img);
  }

  function parseImgDisplayWidth(attrs) {
    const s = String(attrs || "");
    const dw = s.match(/\bdata-qx-display-w=["'](\d+)["']/i);
    if (dw) return parseInt(dw[1], 10) || 0;
    const style = s.match(/\bstyle=["']([^"']*)["']/i);
    if (style) {
      const wm = style[1].match(/width:\s*(\d+)\s*px/i);
      if (wm) return parseInt(wm[1], 10) || 0;
    }
    return 0;
  }

  function captureOrganicDisplayWidth(img) {
    if (!img) return 0;
    const stored = parseInt(img.dataset.qxDisplayW || "", 10);
    if (stored > 12) return stored;
    const fromStyle = parseImgDisplayWidth(img.getAttribute("style") || "");
    if (fromStyle > 12) {
      img.dataset.qxDisplayW = String(fromStyle);
      return fromStyle;
    }
    return 0;
  }

  const ORGANIC_DEFAULT_FIG_W = 300;

  function restoreOrganicFigureSize(img) {
    if (!img) return;
    img.classList.add("qx-organic-fig");
    let targetW = captureOrganicDisplayWidth(img);
    const nw = img.naturalWidth || 0;
    const nh = img.naturalHeight || 0;
    if (!targetW && nw > 0) targetW = Math.min(nw, 680);
    if (!targetW) targetW = ORGANIC_DEFAULT_FIG_W;
    const px = `${targetW}px`;
    const stack = img.closest(".qx-fig-inner");
    const fig = img.closest(".qx-fig, .qx-opt-fig");
    const slot = img.closest("#qxDiagramSlot, .qx-diagram-slot");
    img.dataset.qxDisplayW = String(targetW);
    img.style.setProperty("--qx-fig-w", px);
    img.style.setProperty("width", px, "important");
    img.style.setProperty("max-width", "100%", "important");
    img.style.setProperty("height", "auto", "important");
    img.style.setProperty("display", "block", "important");
    img.style.setProperty("visibility", "visible", "important");
    img.style.setProperty("opacity", "1", "important");
    if (nw > 0 && nh > 0) {
      img.style.setProperty("min-height", `${Math.max(48, Math.round(targetW * nh / nw))}px`, "important");
    }
    if (stack) {
      stack.style.setProperty("--qx-fig-w", px);
      stack.style.setProperty("width", px, "important");
      stack.style.setProperty("max-width", "100%", "important");
      stack.style.setProperty("min-width", px, "important");
      stack.style.removeProperty("height");
      stack.style.removeProperty("max-height");
    }
    if (fig) {
      fig.style.setProperty("--qx-fig-w", px);
      fig.style.setProperty("max-width", "100%", "important");
      fig.style.setProperty("width", px, "important");
    }
    if (slot) {
      slot.style.setProperty("max-width", "100%", "important");
      slot.style.setProperty("width", "100%", "important");
    }
  }

  function hideOrganicPending(img) {
    if (!img) return;
    captureOrganicDisplayWidth(img);
    img.classList.add("qx-wm-loading", "qx-org-pending");
    img.classList.remove("qx-fig-ready", "qx-cleaned", "qx-restored");
    const fig = img.closest(".qx-fig, .qx-opt-fig, .qx-fig-inner");
    if (fig) fig.classList.remove("qx-fig-ready");
    if (String(img.getAttribute("src") || "").includes("org-src")) {
      img.setAttribute("src", FIG_PLACEHOLDER);
    }
  }

  function revealOrganicClean(img) {
    if (!img) return;
    img.classList.remove("qx-wm-loading", "qx-org-pending", "qx-wm-pending");
    img.classList.add("qx-fig-ready");
    img.style.removeProperty("visibility");
    img.style.removeProperty("opacity");
    const fig = img.closest(".qx-fig, .qx-opt-fig");
    if (fig) {
      fig.classList.remove("qx-wm-pending-wrap");
      fig.classList.add("qx-fig-ready");
    }
    revealFigure(img);
  }

  function cleanOrganicOrgImageData(data, w, h) {
    const total = w * h;
    let sumL = 0;
    for (let i = 0; i < total; i++) {
      const pi = i * 4;
      sumL += (data[pi] + data[pi + 1] + data[pi + 2]) / 3;
    }
    if (sumL / total < 130) {
      for (let i = 0; i < total; i++) {
        const pi = i * 4;
        data[pi] = 255 - data[pi];
        data[pi + 1] = 255 - data[pi + 1];
        data[pi + 2] = 255 - data[pi + 2];
      }
    }
    const beforeInk = countInk(data, w, h);
    let removed = 0;
    const lumAt = (x, y) => {
      const pi = (y * w + x) * 4;
      return (data[pi] + data[pi + 1] + data[pi + 2]) / 3;
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const pi = (y * w + x) * 4;
        const r = data[pi];
        const g = data[pi + 1];
        const b = data[pi + 2];
        const L = (r + g + b) / 3;
        const C = Math.max(r, g, b) - Math.min(r, g, b);
        if (b > r + 18 && b > g + 10 && L > 120 && L < 230) {
          data[pi] = data[pi + 1] = data[pi + 2] = 255;
          removed++;
        } else if (L > 110 && L < 200 && C < 28 && C > 4) {
          data[pi] = data[pi + 1] = data[pi + 2] = 255;
          removed++;
        }
      }
    }
    const rowFrac = new Float32Array(h);
    for (let y = 0; y < h; y++) {
      let dark = 0;
      for (let x = 0; x < w; x++) if (lumAt(x, y) < 38) dark++;
      rowFrac[y] = dark / w;
    }
    const barRows = new Uint8Array(h);
    let runStart = null;
    for (let y = 0; y < h; y++) {
      if (rowFrac[y] >= 0.92) {
        if (runStart === null) runStart = y;
      } else if (runStart !== null) {
        if (y - runStart >= 6) barRows.fill(1, runStart, y);
        runStart = null;
      }
    }
    if (runStart !== null && h - runStart >= 6) barRows.fill(1, runStart, h);
    for (let y = 0; y < h; y++) {
      if (!barRows[y]) continue;
      for (let x = 0; x < w; x++) {
        if (lumAt(x, y) < 50) {
          const pi = (y * w + x) * 4;
          data[pi] = data[pi + 1] = data[pi + 2] = 255;
          removed++;
        }
      }
    }
    const afterInk = countInk(data, w, h);
    return {
      removed,
      removedRatio: removed / Math.max(total, 1),
      improved: removed > 0,
      cleanEnough: true,
      damaged: afterInk < Math.max(30, beforeInk * 0.25),
      residueRatio: 0,
      beforeInk,
      afterInk
    };
  }

  function normalizeMatchText(s) {
    return String(s || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&amp;|&Omega;|&#\d+;/gi, " ")
      .replace(/[₁₂₃₄₅₆₇₈₉₀]/g, ch => ({ "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "₀": "0" }[ch] || ch))
      .replace(/(\b[pq])\s+(\d)\b/gi, "$1$2")
      .replace(/\bomega\b/gi, "ω")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function collectQuestionHtml(rawHtml, qid) {
    const parts = [String(rawHtml || "")];
    if (qid != null && window._qxDiagramRaw && window._qxDiagramRaw[String(qid)]) {
      parts.push(window._qxDiagramRaw[String(qid)]);
    }
    return parts.join(" ");
  }

  function getFigureOverrideSrc(rawHtml, qid) {
    const norm = normalizeMatchText(collectQuestionHtml(rawHtml, qid));
    if (!norm) return null;
    const rules = [
      ...(figureOverrides && figureOverrides.rules ? figureOverrides.rules : []),
      ...FIGURE_OVERRIDE_FALLBACK
    ];
    for (const rule of rules) {
      if (!rule) continue;
      if (rule.match && norm.includes(normalizeMatchText(rule.match))) return normalizeAssetSrc(rule.clean);
      if (rule.matchRx) {
        try {
          if (new RegExp(rule.matchRx, "i").test(norm)) return normalizeAssetSrc(rule.clean);
        } catch (_) {}
      }
      if (rule.matchAny && Array.isArray(rule.matchAny)) {
        const hits = rule.matchAny.filter(m => norm.includes(normalizeMatchText(m))).length;
        if (rule.matchMin ? hits >= rule.matchMin : hits >= (rule.matchAny.length >= 2 ? 2 : 1)) {
          return normalizeAssetSrc(rule.clean);
        }
      }
    }
    return null;
  }

  function questionImageSrc(q) {
    if (!q) return null;
    const raw = q._questionImage || q.questionImage || q.image || null;
    if (!raw) return null;
    const cdn = fixUrl(typeof raw === "string" ? raw : (raw.url || raw.src || ""));
    return cdn && isPoolDiagram(cdn) ? normalizeAssetSrc(cdn) : null;
  }

  function extractDiagramEntries(html) {
    const entries = [];
    const s = String(html || "");
    const imgRx = /<img\b([^>]*)>/gi;
    let m;
    while ((m = imgRx.exec(s)) !== null) {
      const attrs = m[1];
      const origM = attrs.match(/\bdata-qx-orig-src=["']([^"']+)["']/i);
      const srcM = attrs.match(/\bsrc=["']([^"']+)["']/i);
      const raw = origM ? origM[1] : (srcM ? srcM[1] : "");
      if (!raw || isApiFigureSrc(raw)) continue;
      let src = "";
      if (isLocalCleanAsset(raw)) src = normalizeAssetSrc(raw);
      else {
        const cdn = canonicalCdnSrc(raw);
        if (cdn) src = cdn;
      }
      if (!src || (!isPoolDiagram(src) && !isLocalCleanAsset(src))) continue;
      const displayW = parseImgDisplayWidth(attrs);
      if (!entries.some(e => e.src === src)) entries.push({ src, displayW });
    }
    return entries;
  }

  function resolveDiagramEntries(rawHtml, qid, q) {
    const override = getFigureOverrideSrc(rawHtml, qid);
    if (override) return [{ src: override, displayW: 0 }];
    const entries = extractDiagramEntries(rawHtml);
    if (!entries.length) {
      const qSrc = questionImageSrc(q);
      if (qSrc) entries.push({ src: qSrc, displayW: 0 });
    }
    return entries;
  }

  function resolveDiagramSrcs(rawHtml, qid, q) {
    return resolveDiagramEntries(rawHtml, qid, q).map(e => e.src);
  }

  function applyLocalCleanFigure(img, src, qid) {
    if (!img || !src) return false;
    const clean = normalizeAssetSrc(src);
    if (!isLocalReadyAsset(clean)) return false;
    if (!img.closest(".qx-fig, .qx-opt-fig")) ensureDiagramWrap(img);
    overlayTargetForImg(img);
    img.setAttribute("src", clean);
    img.dataset.qxOrigSrc = clean;
    img.dataset.qxHasWm = "0";
    img.dataset.qxCleaned = "1";
    img.dataset.qxPinned = "1";
    if (qid != null) img.dataset.qxQid = String(qid);
    img.classList.add("qx-cleaned", "qx-restored", "qx-wm-clean", "qx-no-wm", "qx-pool-fig", "qx-fig-img");
    img.classList.remove("qx-wm-fallback", "qx-wm-pending");
    removeCanvasShield(img);
    const target = overlayTargetForImg(img);
    if (target) stripBrandOverlay(target);
    const fig = img.closest(".qx-fig, .qx-opt-fig");
    if (fig) fig.classList.remove("qx-wm-active");
    return true;
  }

  function trySwapFigureOverride(img) {
    return false;
  }

  async function cleanUrl(url) {
    const fixed = fixUrl(url);
    await loadFigureOverrides();
    const rules = [...(figureOverrides?.rules || []), ...FIGURE_OVERRIDE_FALLBACK];
    for (const rule of rules) {
      if (rule.url && (rule.url === fixed || rule.url === url)) return normalizeAssetSrc(rule.clean);
      if (rule.urlRx) {
        try {
          if (new RegExp(rule.urlRx, "i").test(fixed)) return normalizeAssetSrc(rule.clean);
        } catch (_) {}
      }
    }
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
    if (a !== undefined && a < 8) return false;
    const avg = (r + g + b) / 3;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    return chroma < 52 && avg >= 118 && avg <= 252;
  }

  function isMarksOverlay(r, g, b, a) {
    if (a !== undefined && a < 5) return false;
    const avg = (r + g + b) / 3;
    if (avg < 88) return false;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (chroma >= 80) return false;
    if (b > r + 4 && b > g && avg >= 112 && avg <= 252) return true;
    if (b >= r - 35 && b >= g - 22 && avg >= 105 && avg <= 252) return true;
    if (chroma < 55 && avg >= 112 && avg <= 250) return true;
    return false;
  }

  function isRemovableWm(r, g, b, a) {
    return isWatermarkPixel(r, g, b, a) || isMarksOverlay(r, g, b, a);
  }

  function isStainPixel(r, g, b, a) {
    if (a !== undefined && a < 6) return false;
    const avg = (r + g + b) / 3;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (isLikelyInk(r, g, b)) return false;
    if (chroma > 50) return false;
    return avg >= 152 && avg <= 246;
  }

  function isArtifactPixel(r, g, b, a) {
    return isRemovableWm(r, g, b, a) || isStainPixel(r, g, b, a);
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

  function countCenterBandWm(data, w, h) {
    const x0 = Math.floor(w * 0.24);
    const x1 = Math.ceil(w * 0.76);
    const y0 = Math.floor(h * 0.36);
    const y1 = Math.ceil(h * 0.64);
    let wm = 0;
    let total = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        total++;
        const i = (y * w + x) * 4;
        if (isRemovableWm(data[i], data[i + 1], data[i + 2], data[i + 3])) wm++;
      }
    }
    return { wm, total, ratio: wm / Math.max(total, 1) };
  }

  function countCornerBandWm(data, w, h) {
    const zones = [
      [0, Math.floor(w * 0.30), Math.floor(h * 0.72), h],
      [Math.floor(w * 0.70), w, Math.floor(h * 0.72), h],
      [0, Math.floor(w * 0.30), 0, Math.floor(h * 0.28)],
      [Math.floor(w * 0.70), w, 0, Math.floor(h * 0.28)]
    ];
    let wm = 0;
    let total = 0;
    for (const [x0, x1, y0, y1] of zones) {
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          total++;
          const i = (y * w + x) * 4;
          if (isRemovableWm(data[i], data[i + 1], data[i + 2], data[i + 3])
            || isMarksOverlay(data[i], data[i + 1], data[i + 2], data[i + 3])) wm++;
        }
      }
    }
    return { wm, total, ratio: wm / Math.max(total, 1) };
  }

  function countZoneWm(data, w, h, x0, x1, y0, y1) {
    let wm = 0;
    let total = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        total++;
        const i = (y * w + x) * 4;
        if (isRemovableWm(data[i], data[i + 1], data[i + 2], data[i + 3])
          || isMarksOverlay(data[i], data[i + 1], data[i + 2], data[i + 3])) wm++;
      }
    }
    return { wm, total, ratio: wm / Math.max(total, 1) };
  }

  function watermarkZonesFromData(data, w, h) {
    const zones = [];
    const center = countCenterBandWm(data, w, h);
    const tl = countZoneWm(data, w, h, 0, Math.floor(w * 0.32), 0, Math.floor(h * 0.28));
    const tr = countZoneWm(data, w, h, Math.floor(w * 0.68), w, 0, Math.floor(h * 0.28));
    const bl = countZoneWm(data, w, h, 0, Math.floor(w * 0.32), Math.floor(h * 0.72), h);
    const br = countZoneWm(data, w, h, Math.floor(w * 0.68), w, Math.floor(h * 0.72), h);
    if (center.ratio > WM_DETECT_MIN) zones.push("center");
    if (tl.ratio > WM_DETECT_MIN) zones.push("tl");
    if (tr.ratio > WM_DETECT_MIN) zones.push("tr");
    if (bl.ratio > WM_DETECT_MIN) zones.push("bl");
    if (br.ratio > WM_DETECT_MIN) zones.push("br");
    if (!zones.length) {
      const corners = countCornerBandWm(data, w, h);
      const totalRatio = countWm(data, w, h) / Math.max(w * h, 1);
      if (corners.ratio > WM_DETECT_MIN || totalRatio > 0.01) zones.push("br");
    }
    return { zones, centerRatio: center.ratio, cornerRatio: br.ratio, totalRatio: countWm(data, w, h) / Math.max(w * h, 1) };
  }

  function analyzeWatermarkPixels(data, w, h) {
    const probe = watermarkZonesFromData(data, w, h);
    const hasWm = probe.zones.length > 0;
    return { hasWm, zones: probe.zones, centerRatio: probe.centerRatio, cornerRatio: probe.cornerRatio, totalRatio: probe.totalRatio };
  }

  function buildInkMask(data, w, h) {
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (isLikelyInk(data[i], data[i + 1], data[i + 2])) mask[y * w + x] = 1;
      }
    }
    const dilated = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (mask[idx]) { dilated[idx] = 1; continue; }
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            if (mask[ny * w + nx]) { dilated[idx] = 1; break; }
          }
          if (dilated[idx]) break;
        }
      }
    }
    return dilated;
  }

  function buildWmMask(data, w, h, inkMask) {
    const wm = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (inkMask[idx]) continue;
        const i = idx * 4;
        if (isArtifactPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) wm[idx] = 1;
      }
    }
    return wm;
  }

  function dilateMaskSafe(mask, w, h, inkMask, radius) {
    const out = new Uint8Array(mask);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (!mask[idx]) continue;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const ni = ny * w + nx;
            if (inkMask[ni]) continue;
            out[ni] = 1;
          }
        }
      }
    }
    return out;
  }

  function buildArtifactMask(data, w, h, inkMask) {
    const base = buildWmMask(data, w, h, inkMask);
    return dilateMaskSafe(base, w, h, inkMask, 1);
  }

  function seamlessFeather(data, w, h, cleanedMask, inkMask) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (!cleanedMask[idx] || inkMask[idx]) continue;
        let border = false;
        for (let dy = -1; dy <= 1 && !border; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ni = (y + dy) * w + (x + dx);
            if (!cleanedMask[ni]) { border = true; break; }
          }
        }
        if (!border) continue;
        let sr = 0, sg = 0, sb = 0, n = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const ni = ny * w + nx;
            if (cleanedMask[ni] || inkMask[ni]) continue;
            const pi = ni * 4;
            sr += data[pi];
            sg += data[pi + 1];
            sb += data[pi + 2];
            n++;
          }
        }
        if (n < 3) continue;
        const pi = idx * 4;
        const blend = 0.55;
        data[pi] = Math.round(data[pi] * (1 - blend) + (sr / n) * blend);
        data[pi + 1] = Math.round(data[pi + 1] * (1 - blend) + (sg / n) * blend);
        data[pi + 2] = Math.round(data[pi + 2] * (1 - blend) + (sb / n) * blend);
      }
    }
  }

  function restoreProfessional(data, w, h) {
    const inkMask = buildInkMask(data, w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (inkMask[idx]) continue;
        const i = idx * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const avg = (r + g + b) / 3;
        if (isArtifactPixel(r, g, b, data[i + 3]) || avg >= 236) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          data[i + 3] = 255;
        }
      }
    }
  }

  function medianOf(arr) {
    if (!arr.length) return 255;
    const s = arr.slice().sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }

  function inpaintMasked(data, w, h, wmMask, inkMask) {
    const remaining = new Uint8Array(wmMask);
    const known = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) known[i] = (!remaining[i] || inkMask[i]) ? 1 : 0;

    for (let pass = 0; pass < 28; pass++) {
      let any = false;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          if (!remaining[idx] || inkMask[idx]) continue;
          let nk = 0;
          const rs = [], gs = [], bs = [];
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
              const ni = ny * w + nx;
              if (!known[ni]) continue;
              nk++;
              const pi = ni * 4;
              rs.push(data[pi]);
              gs.push(data[pi + 1]);
              bs.push(data[pi + 2]);
            }
          }
          if (nk < 4) continue;
          const pi = idx * 4;
          data[pi] = medianOf(rs);
          data[pi + 1] = medianOf(gs);
          data[pi + 2] = medianOf(bs);
          data[pi + 3] = 255;
          remaining[idx] = 0;
          known[idx] = 1;
          any = true;
        }
      }
      if (!any) break;
    }

    for (let i = 0; i < w * h; i++) {
      if (!remaining[i] || inkMask[i]) continue;
      const pi = i * 4;
      data[pi] = 255;
      data[pi + 1] = 255;
      data[pi + 2] = 255;
      data[pi + 3] = 255;
    }
  }

  function normalizeWhiteBackground(data, w, h, inkMask) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (inkMask[idx]) continue;
        const i = idx * 4;
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (avg >= 240) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        }
      }
    }
  }

  function scrubCenterWatermark(data, w, h, inkMask) {
    let removed = 0;
    const mx0 = Math.floor(w * 0.08);
    const mx1 = Math.ceil(w * 0.92);
    const my0 = Math.floor(h * 0.08);
    const my1 = Math.ceil(h * 0.92);
    for (let pass = 0; pass < 5; pass++) {
      for (let y = my0; y < my1; y++) {
        for (let x = mx0; x < mx1; x++) {
          const idx = y * w + x;
          if (inkMask[idx]) continue;
          const i = idx * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (isLikelyInk(r, g, b)) continue;
          if (isRemovableWm(r, g, b, data[i + 3]) || isMarksOverlay(r, g, b, data[i + 3])) {
            paintBg(data, w, h, x, y);
            removed++;
          }
        }
      }
    }
    return removed;
  }

  function scrubMarksTextBand(data, w, h, inkMask) {
    let n = 0;
    const x0 = Math.floor(w * 0.22);
    const x1 = Math.ceil(w * 0.78);
    const y0 = Math.floor(h * 0.34);
    const y1 = Math.ceil(h * 0.66);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = y * w + x;
        if (inkMask[idx]) continue;
        const i = idx * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (isLikelyInk(r, g, b)) continue;
        if (isRemovableWm(r, g, b, data[i + 3]) || isMarksOverlay(r, g, b, data[i + 3])) {
          paintBg(data, w, h, x, y);
          n++;
        }
      }
    }
    return n;
  }

  function scrubCornerWatermarks(data, w, h, inkMask) {
    let n = 0;
    const zones = [
      [0, Math.floor(w * 0.34), Math.floor(h * 0.72), h],
      [Math.floor(w * 0.66), w, Math.floor(h * 0.72), h],
      [0, Math.floor(w * 0.34), 0, Math.floor(h * 0.28)],
      [Math.floor(w * 0.66), w, 0, Math.floor(h * 0.28)]
    ];
    for (const [x0, x1, y0, y1] of zones) {
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const idx = y * w + x;
          if (inkMask[idx]) continue;
          const i = idx * 4;
          if (isLikelyInk(data[i], data[i + 1], data[i + 2])) continue;
          if (isRemovableWm(data[i], data[i + 1], data[i + 2], data[i + 3]) || isMarksOverlay(data[i], data[i + 1], data[i + 2], data[i + 3])) {
            paintBg(data, w, h, x, y);
            n++;
          }
        }
      }
    }
    return n;
  }

  function whitenMarksBand(data, w, h, inkMask) {
    let n = 0;
    const x0 = Math.floor(w * 0.18);
    const x1 = Math.ceil(w * 0.82);
    const y0 = Math.floor(h * 0.30);
    const y1 = Math.ceil(h * 0.70);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = y * w + x;
        if (inkMask[idx]) continue;
        const i = idx * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const avg = (r + g + b) / 3;
        if (isLikelyInk(r, g, b)) continue;
        if (isRemovableWm(r, g, b, data[i + 3]) || isMarksOverlay(r, g, b, data[i + 3])
          || (avg >= 108 && avg <= 248 && Math.max(r, g, b) - Math.min(r, g, b) < 58)) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          data[i + 3] = 255;
          n++;
        }
      }
    }
    return n;
  }

  function forceCenterWmScrub(data, w, h, inkMask) {
    return scrubMarksTextBand(data, w, h, inkMask) + whitenMarksBand(data, w, h, inkMask);
  }

  function colorizeLineArt(data, w, h) {
    const inkMask = buildInkMask(data, w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const pi = idx * 4;
        const r = data[pi];
        const g = data[pi + 1];
        const b = data[pi + 2];
        const avg = (r + g + b) / 3;
        if (inkMask[idx]) {
          if (avg < 95) {
            data[pi] = 18;
            data[pi + 1] = 52;
            data[pi + 2] = 118;
          } else if (avg < 150) {
            data[pi] = 42;
            data[pi + 1] = 88;
            data[pi + 2] = 158;
          } else {
            data[pi] = 72;
            data[pi + 1] = 118;
            data[pi + 2] = 188;
          }
          data[pi + 3] = 255;
          continue;
        }
        if (avg >= 248) {
          data[pi] = 255;
          data[pi + 1] = 255;
          data[pi + 2] = 255;
          continue;
        }
        if (avg >= 175 && avg < 248 && !isRemovableWm(r, g, b, data[pi + 3])) {
          data[pi] = 212;
          data[pi + 1] = 228;
          data[pi + 2] = 245;
        }
      }
    }
  }

  function cleanImageData(data, w, h) {
    const total = w * h;
    const beforeInk = countInk(data, w, h);
    const beforeWm = countWm(data, w, h);

    const inkMask = buildInkMask(data, w, h);
    const wmMask = buildArtifactMask(data, w, h, inkMask);
    let removed = 0;
    for (let i = 0; i < w * h; i++) if (wmMask[i]) removed++;

    inpaintMasked(data, w, h, wmMask, inkMask);
    seamlessFeather(data, w, h, wmMask, inkMask);
    removed += scrubCenterWatermark(data, w, h, buildInkMask(data, w, h));
    removed += scrubMarksTextBand(data, w, h, buildInkMask(data, w, h));
    removed += whitenMarksBand(data, w, h, buildInkMask(data, w, h));
    removed += scrubCornerWatermarks(data, w, h, buildInkMask(data, w, h));

    const inkMask2 = buildInkMask(data, w, h);
    normalizeWhiteBackground(data, w, h, inkMask2);

    for (let pass = 0; pass < 3; pass++) {
      const inkMask3 = buildInkMask(data, w, h);
      const wm2 = buildArtifactMask(data, w, h, inkMask3);
      inpaintMasked(data, w, h, wm2, inkMask3);
      seamlessFeather(data, w, h, wm2, inkMask3);
      normalizeWhiteBackground(data, w, h, buildInkMask(data, w, h));
    }

    restoreProfessional(data, w, h);

    const afterInk = countInk(data, w, h);
    const afterWm = countWm(data, w, h);
    const centerBand = countCenterBandWm(data, w, h);
    const removedRatio = removed / Math.max(total, 1);
    const damaged = afterInk < Math.max(45, beforeInk * MIN_INK_VS_CDN);
    const improved = afterWm < beforeWm * 0.55 || (beforeWm > 0 && afterWm === 0);
    const residueRatio = afterWm / Math.max(total, 1);
    const cleanEnough = residueRatio <= WM_RESIDUE_MAX || (improved && residueRatio <= 0.03);
    return {
      removed, damaged, improved, cleanEnough, residueRatio, centerResidue: centerBand.ratio,
      removedRatio, beforeInk, afterInk, beforeWm, afterWm
    };
  }

  function hasVisibleInk(data, w, h) {
    let ink = 0;
    let white = 0;
    const total = Math.max(w * h, 1);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (avg < 200) ink++;
        if (avg > 248) white++;
      }
    }
    return (ink / total) >= MIN_INK_RATIO && (white / total) < MAX_WHITE_RATIO;
  }

  function revertToCdn(img, cdnSrc) {
    const orig = fixUrl(cdnSrc || img.dataset.qxOrigSrc || "");
    if (!orig) return;
    img.classList.remove("qx-img-flagged", "qx-cleaned", "qx-wm-clean");
    delete img.dataset.qxCleaned;
    delete img.dataset.qxCleanVer;
    delete img.dataset.qxWmClean;
    img.style.display = "";
    img.style.visibility = "";
    img.style.opacity = "";
    stripDisplayCors(img);
    const display = poolDisplaySrc(orig);
    if (img.getAttribute("src") !== display) img.src = display;
  }

  function forceKeepVisible(img, cdnSrc) {
    revertToCdn(img, cdnSrc);
  }

  function inkRatioFromData(data, w, h) {
    let ink = 0;
    const total = Math.max(w * h, 1);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if ((data[i] + data[i + 1] + data[i + 2]) / 3 < 200) ink++;
      }
    }
    return ink / total;
  }

  async function probeInkRatio(probe) {
    const w = probe.naturalWidth || probe.width;
    const h = probe.naturalHeight || probe.height;
    if (!w || !h) return 0;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(probe, 0, 0);
      return inkRatioFromData(ctx.getImageData(0, 0, w, h).data, w, h);
    } catch (_) {
      return 0;
    }
  }

  async function validateProbeInk(probe) {
    const w = probe.naturalWidth || probe.width;
    const h = probe.naturalHeight || probe.height;
    if (!w || !h) return false;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(probe, 0, 0);
      return hasVisibleInk(ctx.getImageData(0, 0, w, h).data, w, h);
    } catch (_) {
      return true;
    }
  }

  function showReviewPlaceholder(img) {
    markPendingMask(img);
    forceKeepVisible(img);
    const wrap = img.closest(".qx-fig, .qx-opt-fig, .qx-img-wrap, figure") || img.parentElement;
    if (!wrap || wrap.querySelector(".qx-img-review-note")) return;
    const note = document.createElement("div");
    note.className = "qx-img-review-note";
    note.textContent = "Diagram under review — showing original until recreation is ready.";
    wrap.classList.add("qx-img-under-review");
    wrap.appendChild(note);
  }

  function isInOptionContext(node) {
    return !!(node && node.closest && node.closest(OPT_IMG_SEL));
  }

  function defaultWmZones(cdnSrc) {
    if (GETMARKS_POOL_RX.test(fixUrl(cdnSrc || ""))) return ["br", "center", "tr", "bl"];
    return ["br", "center"];
  }

  function isApiFigureSrc(src) {
    const s = fixUrl(src || "");
    return s.includes("/api/restore-image") || s.includes("/api/proxy-image");
  }

  function canonicalCdnSrc(src) {
    const s = fixUrl(src || "");
    if (!s) return "";
    if (isLocalCleanAsset(s)) return normalizeAssetSrc(s);
    if (isApiFigureSrc(s)) {
      try {
        const u = new URL(s, PROXY_BASE);
        const inner = u.searchParams.get("url");
        if (inner) return canonicalCdnSrc(decodeURIComponent(inner));
      } catch (_) { /* ignore */ }
      return "";
    }
    if (SKIP_RX.test(s)) return "";
    if (POOL_RX.test(s)) return s;
    return "";
  }

  function isGetmarksPool(cdnSrc) {
    const cdn = canonicalCdnSrc(cdnSrc) || fixUrl(cdnSrc || "");
    return GETMARKS_POOL_RX.test(cdn) && !isApiFigureSrc(cdnSrc);
  }

  function marksHideHtml() {
    return "";
  }

  function premiumSheetHtml() {
    // Never inject Quantrex/MARKS text watermarks over figures
    return "";
  }

  function quantrexWmCoverHtml(zones) {
    return "";
  }

  function watermarkStripHtml() {
    return "";
  }

  function premiumWatermarkHtml() {
    return "";
  }

  function diagramWatermarkHtml() {
    return "";
  }

  function brandOverlayHtml() {
    return "";
  }

  const OVERLAY_CLASS_RX = /^(qx-quantrex-wm|qx-premium-wm|qx-premium-wm-sheet|qx-diag-watermark|qx-brand-overlay|qx-wm-mask|qx-marks-scrub|qx-marks-strip|qx-wm-diagonal)$/;

  function directOverlayKids(parent) {
    if (!parent || !parent.children) return [];
    return Array.from(parent.children).filter(el => {
      if (!el.classList) return false;
      for (const cls of el.classList) if (OVERLAY_CLASS_RX.test(cls)) return true;
      return false;
    });
  }

  function stripBrandOverlay(container) {
    if (!container) return;
    directOverlayKids(container).forEach(el => el.remove());
    if (container.matches && container.matches(".qx-fig-inner, .qx-fig, .qx-opt-fig")) {
      container.classList.remove("qx-wm-active", "qx-wm-fallback-wrap", "qx-premium-wm--over-embedded", "qx-quantrex-wm--marks-present", "qx-quantrex-wm--clean");
    }
  }

  function ensureFigInnerStack(img) {
    if (!img || !img.parentNode) return null;
    let inner = img.closest(".qx-fig-inner");
    if (inner) return inner;
    const fig = img.closest(".qx-fig, .qx-opt-fig");
    if (!fig) return null;
    inner = document.createElement("div");
    inner.className = "qx-fig-inner qx-wm-stack";
    fig.insertBefore(inner, img);
    inner.appendChild(img);
    return inner;
  }

  function overlayTargetForImg(img) {
    if (!img) return null;
    return ensureFigInnerStack(img) || img.closest(".qx-fig-inner, .qx-fig, .qx-opt-fig");
  }

  const _canvasResizeObs = typeof WeakMap !== "undefined" ? new WeakMap() : null;

  function bindCanvasResize(img, stack) {
    if (!img || !stack || !_canvasResizeObs || _canvasResizeObs.has(img)) return;
    _canvasResizeObs.set(img, true);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (!img.isConnected || img.dataset.qxHasWm !== "1") return;
      paintPremiumWatermark(img);
    });
    ro.observe(img);
    ro.observe(stack);
  }

  function removeCanvasShield(img) {
    const stack = img && img.closest(".qx-fig-inner");
    if (!stack) return;
    stack.querySelectorAll("canvas.qx-marks-scrub-canvas, canvas.qx-premium-wm-canvas, img.qx-quantrex-wm-overlay").forEach(c => c.remove());
    stack.classList.remove("qx-wm-canvas-active", "qx-quantrex-wm-active", "qx-premium-wm-active");
    if (img) {
      delete img.dataset.qxQuantrexWm;
      delete img.dataset.qxWmOverlay;
      delete img.dataset.qxBrandWm;
      delete img.dataset.qxPremiumWm;
      img.classList.remove("qx-brand-wm");
    }
  }

  function paintPremiumWatermark(img) {
    // Never paint Quantrex brand on figures — only strip leftovers
    if (!img) return;
    removeCanvasShield(img);
    const stack = overlayTargetForImg(img);
    if (stack) {
      stripBrandOverlay(stack);
      stack.querySelectorAll(
        ".qx-premium-wm-sheet, .qx-quantrex-wm, .qx-quantrex-black-wm, .qx-quantrex-black-seal, img.qx-quantrex-wm-overlay, canvas.qx-premium-wm-canvas, .qx-brand-overlay, .qx-diag-watermark"
      ).forEach(el => el.remove());
    }
  }

  function paintCanvasShield(img) {
    paintPremiumWatermark(img);
  }

  function enhancePoolFigure(img) {
    if (!img) return;
    img.classList.add("qx-hq-color", "qx-pool-fig");
    img.style.setProperty("display", "block", "important");
    img.style.setProperty("visibility", "visible", "important");
    img.style.setProperty("opacity", "1", "important");
    img.style.setProperty("position", "relative", "important");
    img.style.setProperty("z-index", "2", "important");
    img.style.setProperty("image-rendering", "auto", "important");
    img.style.setProperty("max-height", "none", "important");
    img.style.setProperty("object-fit", "contain", "important");
  }

  function applyWmCover(img) {
    if (!img || !img.isConnected) return;
    enhancePoolFigure(img);
    revealFigure(img);
    const target = overlayTargetForImg(img);
    if (target) {
      stripBrandOverlay(target);
      removeCanvasShield(img);
      target.classList.remove("qx-premium-wm-active");
    }
    const fig = img.closest(".qx-fig, .qx-opt-fig");
    if (fig) fig.classList.remove("qx-premium-wm-active");
    // Always try MARKS clean for pool figures (server may already have cleaned via proxy)
    if (img.naturalWidth > 0 && typeof QxPremiumWM !== "undefined" && QxPremiumWM.paintMarksHideOnly) {
      void QxPremiumWM.paintMarksHideOnly(img);
    }
  }

  function markFigureReady(img, keepScrub) {
    if (!img) return;
    revealFigure(img);
    enhancePoolFigure(img);
    img.classList.add("qx-fig-ready", "qx-hq-color");
    const target = overlayTargetForImg(img);
    if (target) {
      target.querySelectorAll(".qx-premium-wm-sheet, .qx-quantrex-wm, .qx-diag-watermark, .qx-brand-overlay, img.qx-quantrex-wm-overlay").forEach(el => el.remove());
      if (!keepScrub) removeCanvasShield(img);
      target.classList.remove("qx-premium-wm-active", "qx-wm-active");
    }
    const fig = img.closest(".qx-fig, .qx-opt-fig");
    if (fig) fig.classList.remove("qx-premium-wm-active", "qx-wm-active");
  }

  async function upgradePoolFigure(img, cdnSrc) {
    if (!img || !img.isConnected) return;
    const cdn = canonicalCdnSrc(cdnSrc) || fixUrl(cdnSrc || poolCdnSrc(img) || "");
    revealFigure(img);
    enhancePoolFigure(img);
    if (!cdn || !isPoolDiagram(cdn, img)) {
      if (img.naturalWidth > 0) markFigureReady(img, false);
      return;
    }
    if (isPreprocessedQxOrg(cdn)) {
      const busted = normalizeAssetSrc(cdn);
      if (busted && fixUrl(img.getAttribute("src") || "") !== fixUrl(busted)) {
        img.setAttribute("src", busted);
      }
      if (img.naturalWidth <= 0) await waitForImageLoad(img, 8000);
      finalizeQxOrgDisplay(img);
      return;
    }
    if (isOrganicOrgSrc(cdn) && img.classList.contains("qx-cleaned")) {
      await finalizeOrganicOrgDisplay(img);
      return;
    }
    if (isLocalReadyAsset(cdn) || (img.classList.contains("qx-cleaned") && !isOrganicOrgSrc(cdn))) {
      const busted = normalizeAssetSrc(cdn);
      if (busted && fixUrl(img.getAttribute("src") || "") !== fixUrl(busted)) {
        img.setAttribute("src", busted);
      }
      if (img.dataset.qxDisplayW) finalizeQxOrgDisplay(img);
      else markDisplayClean(img);
      return;
    }

    if (img.naturalWidth <= 0) await loadPoolFigureSrc(img, cdn);
    if (img.naturalWidth <= 0) return;

    const cur = String(img.getAttribute("src") || "");
    if (isGetmarksPool(cdn) && !cur.includes("/api/restore-image")) {
      const ok = await loadDisplaySrc(img, restoreImageUrl(cdn), cdn);
      if (ok && img.naturalWidth > 12) {
        markDisplayClean(img);
        return;
      }
      await loadDisplaySrc(img, proxyImageUrl(cdn), cdn);
    }

    if (img.naturalWidth > 12 && String(img.getAttribute("src") || "").includes("/api/restore-image")) {
      markDisplayClean(img);
      return;
    }

    img.dataset.qxHasWm = "1";
    if (!img.dataset.qxWmZones) img.dataset.qxWmZones = defaultWmZones(cdn).join(",");
    stripBrandOverlay(overlayTargetForImg(img));
    let scrubbed = false;
    if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.paintMarksHideOnly) {
      scrubbed = await QxPremiumWM.paintMarksHideOnly(img);
    }
    if (!scrubbed && isGetmarksPool(cdn)) {
      const retry = await loadDisplaySrc(img, restoreImageUrl(cdn), cdn);
      if (retry && img.naturalWidth > 12) {
        markDisplayClean(img);
        return;
      }
    }
    img.dataset.qxHasWm = "0";
    img.dataset.qxWmClean = "1";
    markFigureReady(img, scrubbed);
  }

  function shouldBrandOverlay(img) {
    // Always false — Quantrex watermarks removed from all figures
    return false;
  }

  function applyQuantrexBrand(img) {
    // Watermarks disabled — they were covering figures. Only strip leftovers.
    if (!img || !img.isConnected) return Promise.resolve(false);
    if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.stripQuantrexBrand) {
      QxPremiumWM.stripQuantrexBrand(img);
    } else {
      removeCanvasShield(img);
    }
    return Promise.resolve(false);
  }

  function flagPoolWatermark(img, wmProbe) {
    if (!img) return;
    const cdn = poolCdnSrc(img) || fixUrl(img.getAttribute("src") || "");
    if (!isPoolDiagram(cdn, img)) return;
    if (wmProbe && wmProbe.hasWm) {
      img.dataset.qxHasWm = "1";
      if (wmProbe.zones && wmProbe.zones.length) {
        img.dataset.qxWmZones = wmProbe.zones.join(",");
      } else if (!img.dataset.qxWmZones) {
        img.dataset.qxWmZones = defaultWmZones(cdn).join(",");
      }
      return;
    }
    if (wmProbe && !wmProbe.hasWm) {
      img.dataset.qxHasWm = "0";
      img.dataset.qxWmClean = "1";
      delete img.dataset.qxWmZones;
      return;
    }
    if (img.dataset.qxHasWm === "1" || img.dataset.qxHasWm === "0") return;
    img.dataset.qxHasWm = "pending";
  }

  function markNoWatermark(img) {
    if (!img) return;
    revealFigure(img);
    img.dataset.qxHasWm = "0";
    img.dataset.qxWmClean = "1";
    img.classList.add("qx-wm-none", "qx-wm-clean");
    img.classList.remove("qx-wm-pending", "qx-wm-fallback");
    const target = overlayTargetForImg(img);
    const fig = img.closest(".qx-fig, .qx-opt-fig");
    removeCanvasShield(img);
    if (target) {
      target.classList.remove("qx-wm-active", "qx-wm-pending-wrap", "qx-wm-canvas-active");
      stripBrandOverlay(target);
    }
    if (fig) fig.classList.remove("qx-wm-active", "qx-wm-pending-wrap");
  }

  function markWmClean(img) {
    if (!img) return;
    img.dataset.qxHasWm = "0";
    img.dataset.qxWmClean = "1";
    img.classList.add("qx-wm-clean");
    img.classList.remove("qx-wm-pending", "qx-wm-fallback");
    removeCanvasShield(img);
    const target = overlayTargetForImg(img);
    const fig = img.closest(".qx-fig, .qx-opt-fig");
    if (target) {
      target.classList.remove("qx-wm-pending-wrap", "qx-wm-canvas-active", "qx-wm-active", "qx-premium-wm-active");
      stripBrandOverlay(target);
    }
    if (fig) fig.classList.remove("qx-wm-pending-wrap", "qx-wm-active", "qx-premium-wm-active");
  }

  function markWmNeedsOverlay(img) {
    if (img && img.dataset.qxHasWm === "1") applyWmCover(img);
  }

  async function retryInpaint(img, cdnSrc, attempt) {
    if (!img || !img.isConnected || isCleanedImg(img) || img.dataset.qxHasWm !== "1") return;
    const n = attempt || 0;
    if (n > 2) return;
    await new Promise(r => setTimeout(r, 400 + n * 600));
    if (!img.isConnected || isCleanedImg(img)) return;
    if (await resolveAndShowClean(img, cdnSrc)) return;
    const manifestRel = await cleanUrl(cdnSrc);
    const manifestPath = manifestRel && manifestRel !== cdnSrc && !manifestRel.startsWith("http")
      ? manifestRel : null;
    if (await tryClean(img, cdnSrc, manifestPath)) return;
    keepPoolImageVisible(img, cdnSrc);
    void retryInpaint(img, cdnSrc, n + 1);
  }

  function probeFromDrawable(drawable, w, h) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(drawable, 0, 0);
      return analyzeWatermarkPixels(ctx.getImageData(0, 0, w, h).data, w, h);
    } catch (_) {
      return null;
    }
  }

  async function probeWatermarkFromImage(img, cdnSrc) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const cdn = fixUrl(cdnSrc || img.dataset.qxOrigSrc || poolCdnSrc(img) || "");
    if (!w || !h) return { hasWm: false, zones: [] };
    let wm = probeFromDrawable(img, w, h);
    if (!wm) {
      const viaProxy = await loadProbe(proxyImageUrl(cdn), true);
      if (viaProxy) wm = probeFromDrawable(viaProxy, viaProxy.naturalWidth, viaProxy.naturalHeight);
    }
    if (wm) return wm;
    if (isGetmarksPool(cdn)) return { hasWm: true, zones: defaultWmZones(cdn) };
    return { hasWm: false, zones: [] };
  }

  async function probeCenterWmFromImage(img) {
    const probe = await probeWatermarkFromImage(img, img.dataset.qxOrigSrc);
    return probe.centerRatio != null ? probe.centerRatio : 1;
  }

  async function finalizeOrganicOrgDisplay(img) {
    if (!img || !img.isConnected) return;
    restoreOrganicFigureSize(img);
    await waitForImageLoad(img, 4000);
    restoreOrganicFigureSize(img);
    const stack = img.closest(".qx-fig-inner") || img.parentElement;
    if (!stack || typeof QxPremiumWM === "undefined") return;
    const dw = captureOrganicDisplayWidth(img);
    const w = dw > 12 ? dw : (img.offsetWidth || img.clientWidth || img.naturalWidth || 0);
    const nh = img.naturalHeight || 0;
    const nw = img.naturalWidth || 0;
    const h = w > 12 && nw > 0 && nh > 0 ? Math.round(w * nh / nw) : (img.offsetHeight || img.clientHeight || nh || 0);
    if (w < 12 || h < 12) {
      if (img.dataset.qxCoachingWmBound !== "1") {
        img.dataset.qxCoachingWmBound = "1";
        const repaint = () => { void finalizeOrganicOrgDisplay(img); };
        img.addEventListener("load", repaint, { once: true });
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(repaint);
      }
      return;
    }
    // No watermark overlays (they covered figures) — clean black figure only
    if (QxPremiumWM.stripQuantrexBrand) QxPremiumWM.stripQuantrexBrand(img);
    if (QxPremiumWM.paintMarksHideOnly) await QxPremiumWM.paintMarksHideOnly(img);
    markDisplayClean(img);
    revealOrganicClean(img);
  }

  async function finalizeCleanDisplay(img, stats) {
    if (!img || !img.isConnected) return;
    const cdn = poolCdnSrc(img) || fixUrl(img.dataset.qxOrigSrc || "");
    if (img.naturalWidth > 0 && img.dataset.qxOrigSrc) {
      if (isOrganicOrgSrc(cdn) && (img.classList.contains("qx-cleaned") || String(img.getAttribute("src") || "").startsWith("blob:"))) {
        await finalizeOrganicOrgDisplay(img);
        return;
      }
      await upgradePoolFigure(img, poolCdnSrc(img));
      return;
    }
    const cur = String(img.getAttribute("src") || "");
    const cleanedPixels = img.classList.contains("qx-cleaned") || img.classList.contains("qx-restored")
      || cur.includes("clean-diagrams") || cur.startsWith("blob:") || cur.includes("/api/restore-image");
    if (!cleanedPixels) {
      if (isPoolDiagram(poolCdnSrc(img), img)) await upgradePoolFigure(img, poolCdnSrc(img));
      return;
    }
    const centerResidue = stats && typeof stats.centerResidue === "number"
      ? stats.centerResidue
      : await probeCenterWmFromImage(img);
    if (centerResidue <= CENTER_WM_MAX) markDisplayClean(img);
    else await upgradePoolFigure(img, poolCdnSrc(img));
  }

  function isOptFigure(img) {
    return !!(img && img.closest && img.closest(".mtk-opt-text, .qx-prac-opt-text, .mtk-opt, .qa-opt, .qx-prac-opt"));
  }

  function syncBrandOverlay(container) {
    // Never inject Quantrex watermark — always strip overlays, keep figure clean
    if (!container) return;
    const img = container.matches && container.matches("img")
      ? container
      : container.querySelector("img.qx-pool-fig, img.qx-fig-img, img.qx-no-wm, img");
    const target = (img && overlayTargetForImg(img)) || container;
    stripBrandOverlay(target);
    if (img) removeCanvasShield(img);
    target.querySelectorAll(
      ".qx-premium-wm-sheet, .qx-quantrex-wm, .qx-quantrex-black-wm, .qx-quantrex-black-seal, img.qx-quantrex-wm-overlay, canvas.qx-premium-wm-canvas, .qx-brand-overlay, .qx-diag-watermark, .qx-coaching-wm"
    ).forEach(el => el.remove());
    target.classList.remove("qx-wm-active", "qx-premium-wm-active", "qx-quantrex-wm-active", "qx-coaching-wm-active");
    const fig = img && img.closest(".qx-fig, .qx-opt-fig");
    if (fig) fig.classList.remove("qx-wm-active", "qx-premium-wm-active");
    // Still upgrade pool figures via clean proxy (no brand paint)
    if (img && img.naturalWidth > 0) {
      const cdn = poolCdnSrc(img);
      if (cdn) void upgradePoolFigure(img, cdn);
    }
  }

  function ensureBrandOverlay(container) {
    // No brand watermark overlays — only strip leftovers
    if (!container) return;
    stripBrandOverlay(container);
    container.querySelectorAll(
      ".qx-premium-wm-sheet, .qx-quantrex-wm, .qx-diag-watermark, .qx-brand-overlay, img.qx-quantrex-wm-overlay, canvas.qx-premium-wm-canvas, .qx-quantrex-black-wm, .qx-quantrex-black-seal"
    ).forEach(el => el.remove());
  }

  function ensureBrandOverlayLegacy(container) {
    syncBrandOverlay(container);
  }

  function processAllDiagrams(root) {
    const scope = root || document.body;
    if (!scope) return;
    startObserver();
    startGuardian();
    scope.querySelectorAll("img").forEach(img => processImage(img));
  }

  function ensureDiagramWrap(img) {
    let wrap = img.closest(".qx-fig, .qx-opt-fig");
    if (wrap) {
      ensureBrandOverlay(wrap);
      return wrap;
    }
    if (isInOptionContext(img)) {
      const span = document.createElement("span");
      span.className = "qx-opt-fig qx-brand-covered qx-fig-stack";
      img.parentNode.insertBefore(span, img);
      span.appendChild(img);
      img.classList.add("qx-no-wm");
      return span;
    }
    const fig = document.createElement("figure");
    fig.className = "qx-fig qx-pool-fig-wrap qx-brand-covered qx-fig-stack";
    img.parentNode.insertBefore(fig, img);
    fig.appendChild(img);
    img.classList.add("qx-fig-img", "qx-no-wm", "qx-pool-fig");
    ensureFigInnerStack(img);
    return fig;
  }

  function apiBase() {
    if (location.origin && !location.origin.includes("localhost") && location.origin.includes("vercel.app")) {
      return location.origin;
    }
    return PROXY_BASE;
  }

  function proxyImageUrl(cdnSrc) {
    const fixed = fixUrl(cdnSrc);
    // v=6: same-origin proxy + client soft-strip (permanent MARKS kill)
    const q = `url=${encodeURIComponent(fixed)}&clean=1&v=6`;
    try {
      if (typeof location !== "undefined" && location.origin && !/localhost|127\.0\.0\.1/i.test(location.origin)) {
        return `/api/proxy-image?${q}`;
      }
    } catch (_) { /* */ }
    const base = String(PROXY_BASE || apiBase() || "https://quantrexacademy-live.web.app").replace(/\/$/, "");
    return `${base}/api/proxy-image?${q}`;
  }

  /** True only for question-pool diagrams — never exam/subject/UI icons */
  function isRewritablePoolSrc(src, img) {
    const s = fixUrl(src || "");
    if (!s || s.startsWith("data:") || s.startsWith("blob:")) return false;
    if (SKIP_RX.test(s)) return false;
    if (/cdn-assets\.getmarks|app_assets\/img\/(exams|ui|cpyqb)\//i.test(s)) return false;
    if (img && (img.classList.contains("qx-marks-icon") || img.classList.contains("qx-exam-logo")
      || img.classList.contains("fc-img") || img.classList.contains("subj-ic-img")
      || img.classList.contains("dash-tool-logo") || img.classList.contains("exam-pill-logo"))) {
      return false;
    }
    // Only actual question figures (pool / quizrr / pyq paths)
    return /cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\//i.test(s);
  }

  /** After proxy load → permanent pixel soft-strip (kills residual MARKS) */
  function queueSoftStrip(img) {
    if (!img || img.dataset.qxSoftStrip === "2") return;
    const run = () => {
      if (!img.isConnected || img.dataset.qxSoftStrip === "2") return;
      if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.paintMarksHideOnly) {
        void QxPremiumWM.paintMarksHideOnly(img);
      }
    };
    if (img.complete && img.naturalWidth > 8) {
      // next frame so layout is ready
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
      else setTimeout(run, 0);
    } else {
      img.addEventListener("load", run, { once: true });
    }
  }

  /** Force every Marks/Quizrr POOL diagram to clean proxy (never UI icons) */
  function rewriteAllPoolImgs(root) {
    const scope = root || document;
    if (!scope || !scope.querySelectorAll) return 0;
    let n = 0;
    scope.querySelectorAll("img").forEach((img) => {
      // Soft-strip done → leave frozen forever
      if (!img || img.dataset.qxSoftStrip === "2") return;
      const cur = fixUrl(img.getAttribute("src") || "");
      const orig = fixUrl(img.dataset.qxOrigSrc || cur);
      const src = orig || cur;
      // Restore UI icons that were wrongly sent through proxy
      if (/proxy-image|restore-image/i.test(cur)) {
        try {
          const m = cur.match(/[?&]url=([^&]+)/);
          if (m) {
            const u = decodeURIComponent(m[1]);
            if (SKIP_RX.test(u) || /cdn-assets\.getmarks|app_assets\/img\/(exams|ui|cpyqb)\//i.test(u)
              || img.classList.contains("qx-marks-icon") || img.classList.contains("qx-exam-logo")) {
              img.dataset.qxOrigSrc = u;
              img.removeAttribute("crossorigin");
              img.src = u;
              img.dataset.qxProxied = "1";
              img.dataset.qxHasWm = "0";
              n++;
              return;
            }
          }
        } catch (_) { /* */ }
        // Already on proxy — still need soft-strip for residual MARKS
        if (isRewritablePoolSrc(orig, img) || /cdn-question-pool|\/pyq\//i.test(orig) || img.classList.contains("qx-pool-fig")) {
          queueSoftStrip(img);
        }
        return;
      }
      if (!src || /data:|assets\/diagrams/i.test(src)) {
        if (img.classList.contains("qx-pool-fig") || /proxy-image/i.test(cur)) queueSoftStrip(img);
        return;
      }
      if (isRewritablePoolSrc(src, img)) {
        img.dataset.qxOrigSrc = src;
        img.crossOrigin = "anonymous";
        img.setAttribute("crossorigin", "anonymous");
        img.src = proxyImageUrl(src);
        img.dataset.qxProxied = "1";
        // NOT qxCleanedSrc — soft-strip must still run
        img.dataset.qxHasWm = "0";
        queueSoftStrip(img);
        n++;
      } else if (img.classList.contains("qx-pool-fig") || /proxy-image|cdn-question-pool|\/pyq\//i.test(cur)) {
        queueSoftStrip(img);
      }
    });
    return n;
  }

  function poolDisplaySrc(cdnSrc) {
    const cdn = canonicalCdnSrc(cdnSrc) || fixUrl(cdnSrc || "");
    if (!cdn) return "";
    // Always route Marks/Quizrr pool images through clean proxy (strips MARKS WM → pure black)
    if (isGetmarksPool(cdn) || POOL_RX.test(cdn)) {
      const base = proxyImageUrl(cdn);
      return base.includes("clean=") ? base : `${base}${base.includes("?") ? "&" : "?"}clean=1`;
    }
    return cdn;
  }

  function setApiImgCors(img) {
    if (!img) return;
    img.crossOrigin = "anonymous";
    img.setAttribute("crossorigin", "anonymous");
  }

  function stripDisplayCors(img) {
    if (!img) return;
    const src = String(img.getAttribute("src") || "");
    if (src.includes("/api/restore-image") || src.includes("/api/proxy-image")) {
      setApiImgCors(img);
      return;
    }
    img.removeAttribute("crossorigin");
    img.crossOrigin = null;
  }

  async function ensurePoolDisplay(img, cdnSrc) {
    if (!img || !cdnSrc) return false;
    const display = poolDisplaySrc(cdnSrc);
    if (!display || display === fixUrl(cdnSrc)) return false;
    return loadDisplaySrc(img, display, cdnSrc);
  }

  function restoreImageUrl(cdnSrc) {
    const fixed = fixUrl(cdnSrc);
    return `${apiBase()}/api/restore-image?url=${encodeURIComponent(fixed)}`;
  }

  async function fetchRestoredBlob(cdnSrc) {
    try {
      const r = await fetch(restoreImageUrl(cdnSrc), { cache: "no-store" });
      if (!r.ok) return null;
      const blob = await r.blob();
      if (!blob || !blob.size) return null;
      return blob;
    } catch (_) {
      return null;
    }
  }

  function figureSrcIsDisplayable(src) {
    const s = fixUrl(src || "");
    if (!s || s === FIG_PLACEHOLDER || s.startsWith("data:image/gif")) return false;
    return s.includes("/api/restore-image") || s.includes("/api/proxy-image")
      || s.includes("clean-diagrams") || isLocalCleanAsset(s) || POOL_RX.test(s);
  }

  function primePoolFigure(img, cdnSrc) {
    if (!img || !cdnSrc) return;
    if (imgHasRealFigure(img)) {
      revealFigure(img);
      return;
    }
    const cur = fixUrl(img.getAttribute("src") || "");
    if (figureSrcIsDisplayable(cur) && img.naturalWidth > 0) {
      revealFigure(img);
      return;
    }
    const display = poolDisplaySrc(cdnSrc);
    if (!display || display === cur) return;
    img.dataset.qxOrigSrc = fixUrl(cdnSrc);
    img.dataset.qxPrimed = "1";
    img.setAttribute("src", display);
    revealFigure(img);
  }

  function hideFigureLoading(img) {
    if (!img || img.classList.contains("qx-pool-fig") || img.dataset.qxOrigSrc) return;
    const cur = fixUrl(img.getAttribute("src") || "");
    if (figureSrcIsDisplayable(cur) || img.dataset.qxPrimed === "1") return;
    img.classList.add("qx-wm-loading");
    img.classList.remove("qx-fig-ready");
    const stack = img.closest(".qx-fig-inner");
    if (stack) stack.classList.remove("qx-fig-ready");
  }

  function revealFigure(img) {
    if (!img) return;
    img.classList.remove("qx-wm-loading");
    img.classList.add("qx-fig-ready");
    img.style.removeProperty("opacity");
    img.style.removeProperty("visibility");
    const stack = img.closest(".qx-fig-inner");
    if (stack) stack.classList.add("qx-fig-ready");
  }

  function markDisplayClean(img) {
    if (!img) return;
    img.dataset.qxCleaned = "1";
    img.dataset.qxCleanVer = String(CLEAN_VER);
    img.dataset.qxRestoredSrc = "1";
    img.dataset.qxHasWm = "0";
    img.classList.remove("qx-img-flagged", "qx-wm-pending", "qx-wm-fallback");
    img.classList.add("qx-no-wm", "qx-cleaned", "qx-restored", "qx-wm-clean");
    const fig = img.closest(".qx-fig, .qx-opt-fig, .qx-diagram-slot, #qxDiagramSlot");
    if (fig) fig.classList.remove("qx-wm-pending-wrap", "qx-wm-fallback-wrap");
    markWmClean(img);
    revealFigure(img);
  }

  async function preloadCleanSrc(cdn) {
    const fixed = fixUrl(cdn);
    if (_cleanSrcCache.has(fixed)) return _cleanSrcCache.get(fixed);
    const task = (async () => {
      const manifestRel = await cleanUrl(fixed);
      let clean = null;
      if (isManifestCleanPath(manifestRel, fixed) && await manifestFileExists(manifestRel)) {
        clean = manifestRel;
      }
      return { cdn: fixed, clean };
    })();
    _cleanSrcCache.set(fixed, task);
    return task;
  }

  async function prepareQuestionFigures(q) {
    if (!q) return;
    rememberQuestionRaw(q);
    await loadManifest();
    const urls = new Set();
    extractPoolSrcs(q.q || "").forEach(u => urls.add(fixUrl(u)));
    (q.options || []).forEach((opt, i) => {
      extractPoolSrcs(opt || "").forEach(u => urls.add(fixUrl(u)));
      const key = String(q.id) + ":opt:" + i;
      if (window._qxDiagramRaw && window._qxDiagramRaw[key]) {
        extractPoolSrcs(window._qxDiagramRaw[key]).forEach(u => urls.add(fixUrl(u)));
      }
    });
    if (!urls.size) return;
    void Promise.all([...urls].map(u => preloadCleanSrc(u)));
  }

  function waitForMarksHide(img, ms) {
    const limit = ms || 4000;
    return new Promise(resolve => {
      const start = Date.now();
      const tick = () => {
        if (!img || !img.isConnected) return resolve();
        const stack = img.closest(".qx-fig-inner");
        if (img.dataset.qxPremiumWm === "1" || (stack && stack.classList.contains("qx-marks-hidden"))) return resolve();
        if (img.dataset.qxHasWm === "0" || img.classList.contains("qx-wm-clean")) return resolve();
        if (Date.now() - start > limit) return resolve();
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  function loadDisplaySrc(img, src, cdnSrc) {
    if (!img || !src) return Promise.resolve(false);
    img.dataset.qxOrigSrc = fixUrl(cdnSrc || src);
    // CORS only for our same-origin proxy (required for canvas Quantrex WM)
    if (String(src).includes("/api/proxy-image") || String(src).includes("/api/restore-image")) {
      img.crossOrigin = "anonymous";
      img.setAttribute("crossorigin", "anonymous");
    } else {
      img.removeAttribute("crossorigin");
      img.crossOrigin = null;
    }
    const prevSrc = img.getAttribute("src") || "";
    return new Promise(resolve => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (ok && img.naturalWidth > 0) {
          markDisplayClean(img);
          revealFigure(img);
          resolve(true);
          return;
        }
        resolve(false);
      };
      const timer = setTimeout(() => finish(false), 12000);
      img.addEventListener("load", () => finish(img.naturalWidth > 0), { once: true });
      img.addEventListener("error", () => {
        // Proxy failed → direct CDN (no CORS scrub, but figure still visible)
        const cdn = fixUrl(cdnSrc || img.dataset.qxOrigSrc || "");
        if (cdn && src !== cdn && img.dataset.qxCdnFallback !== "1") {
          img.dataset.qxCdnFallback = "1";
          img.removeAttribute("crossorigin");
          img.crossOrigin = null;
          img.src = cdn;
          return;
        }
        if (prevSrc && prevSrc !== src && !img.naturalWidth && !prevSrc.includes("data:image/gif")) {
          img.setAttribute("src", prevSrc);
        }
        finish(false);
      }, { once: true });
      if (img.getAttribute("src") !== src) img.src = src;
      else if (img.complete) finish(img.naturalWidth > 0);
    });
  }

  async function loadPoolFigureSrc(img, cdnSrc) {
    if (!img || !cdnSrc) return false;
    const cdn = canonicalCdnSrc(cdnSrc) || fixUrl(cdnSrc);
    // 1) CORS proxy (best — Quantrex WM canvas)  2) direct CDN  3) local clean
    if (await loadDisplaySrc(img, poolDisplaySrc(cdn), cdn)) return true;
    if (await loadDisplaySrc(img, cdn, cdn)) return true;
    const manifestRel = await cleanUrl(cdn);
    if (isManifestCleanPath(manifestRel, cdn) && await manifestFileExists(manifestRel)) {
      if (await loadDisplaySrc(img, manifestRel, cdn)) return true;
    }
    return false;
  }

  function waitForImageLoad(img, ms) {
    if (!img) return Promise.resolve(false);
    if (img.naturalWidth > 0) return Promise.resolve(true);
    return new Promise(resolve => {
      const limit = ms || 10000;
      const done = (ok) => {
        clearTimeout(timer);
        resolve(!!ok && img.naturalWidth > 0);
      };
      const timer = setTimeout(() => done(false), limit);
      img.addEventListener("load", () => done(true), { once: true });
      img.addEventListener("error", () => done(false), { once: true });
      if (img.complete) done(img.naturalWidth > 0);
    });
  }

  async function resolveAndShowClean(img, cdnSrc) {
    if (!img || !cdnSrc) return false;
    if (img.dataset.qxRestoreTried === String(CLEAN_VER) && isCleanedImg(img) && img.naturalWidth > 0) return true;

    if (isOrganicOrgSrc(cdnSrc)) {
      const cached = await getCachedBlob(cdnSrc);
      if (cached && await blobLooksValid(cached)) {
        const ok = await applyOrganicCleanedBlob(img, cached, cdnSrc);
        if (ok) {
          img.dataset.qxRestoreTried = String(CLEAN_VER);
          return true;
        }
      }
      return false;
    }

    if (isLocalReadyAsset(cdnSrc)) {
      const busted = normalizeAssetSrc(cdnSrc);
      if (busted && await loadDisplaySrc(img, busted, cdnSrc)) {
        img.dataset.qxRestoreTried = String(CLEAN_VER);
        return true;
      }
      img.dataset.qxRestoreTried = String(CLEAN_VER);
      return false;
    }

    const cached = await getCachedBlob(cdnSrc);
    if (cached && await blobLooksValid(cached)) {
      const url = URL.createObjectURL(cached);
      try {
        if (await loadDisplaySrc(img, url, cdnSrc)) {
          img.dataset.qxRestoreTried = String(CLEAN_VER);
          return true;
        }
      } finally {
        if (String(img.getAttribute("src") || "") !== url) URL.revokeObjectURL(url);
      }
    }

    if (await loadPoolFigureSrc(img, cdnSrc)) {
      img.dataset.qxRestoreTried = String(CLEAN_VER);
      return true;
    }
    img.dataset.qxRestoreTried = String(CLEAN_VER);
    return false;
  }

  async function tryShowRestored(img, cdnSrc) {
    return resolveAndShowClean(img, cdnSrc);
  }

  function markPendingMask(img) {
    if (!img.classList.contains("qx-cleaned")) {
      ensureDiagramWrap(img);
      img.classList.add("qx-wm-pending");
      const fig = img.closest(".qx-fig, .qx-opt-fig");
      if (fig) fig.classList.add("qx-wm-pending-wrap");
    }
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
    if (isOrganicOrgSrc(cdnSrc)) {
      const localPath = normalizeAssetSrc(cdnSrc);
      const local = await loadProbe(localPath, false);
      if (local) return { img: local, source: localPath, canRead: true };
    }
    if (manifestPath && !manifestPath.startsWith("http")) {
      const local = await loadProbe(manifestPath, false);
      if (local) return { img: local, source: manifestPath, canRead: true };
    }
    const proxy = proxyImageUrl(cdnSrc);
    const viaProxy = await loadProbe(proxy, true);
    if (viaProxy) return { img: viaProxy, source: proxy, canRead: true };
    const cors = await loadProbe(cdnSrc, true);
    if (cors) return { img: cors, source: cdnSrc, canRead: true };
    const display = await loadProbe(cdnSrc, false);
    if (display) return { img: display, source: cdnSrc, canRead: false };
    return null;
  }

  function canvasToBlob(canvas) {
    return new Promise(resolve => {
      canvas.toBlob(b => resolve(b), "image/png", 1.0);
    });
  }

  async function cleanOrganicFromProbe(probe) {
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
      const stats = cleanOrganicOrgImageData(imageData.data, w, h);
      if (stats.damaged || !hasVisibleInk(imageData.data, w, h)) return { blob: null, stats };
      ctx.putImageData(imageData, 0, 0);
      const blob = await canvasToBlob(canvas);
      return { blob, stats };
    } catch (_) {
      return null;
    }
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
      const usable = !stats.damaged && (stats.improved || stats.removedRatio >= 0.002)
        && (stats.cleanEnough || stats.residueRatio <= WM_RESIDUE_MAX || stats.removedRatio >= 0.002);
      const fallback = !stats.damaged && stats.beforeInk > 0 && hasVisibleInk(imageData.data, w, h);
      if (!usable && !fallback) return { blob: null, stats };
      if (!hasVisibleInk(imageData.data, w, h)) return { blob: null, stats: { ...stats, damaged: true } };
      ctx.putImageData(imageData, 0, 0);
      const blob = await canvasToBlob(canvas);
      return { blob, stats };
    } catch (_) {
      return null;
    }
  }

  async function applyOrganicCleanedBlob(img, blob, src) {
    if (!blob || !img) return false;
    const preview = URL.createObjectURL(blob);
    try {
      const probe = await loadProbe(preview, false);
      if (!probe || !(await validateProbeInk(probe))) return false;
    } finally {
      URL.revokeObjectURL(preview);
    }
    await putCachedBlob(src, blob);
    const url = URL.createObjectURL(blob);
    return new Promise(resolve => {
      const done = async (ok) => {
        if (!ok || !img.isConnected) {
          URL.revokeObjectURL(url);
          hideOrganicPending(img);
          resolve(false);
          return;
        }
        img.dataset.qxCleaned = "1";
        img.dataset.qxCleanVer = String(CLEAN_VER);
        img.classList.add("qx-no-wm", "qx-cleaned", "qx-restored");
        stripDisplayCors(img);
        img.src = url;
        await waitForImageLoad(img, 8000);
        if (img.naturalWidth > 0) {
          restoreOrganicFigureSize(img);
          await finalizeOrganicOrgDisplay(img);
        }
        resolve(img.naturalWidth > 0);
      };
      img.addEventListener("load", () => { void done(true); }, { once: true });
      img.addEventListener("error", () => { void done(false); }, { once: true });
      stripDisplayCors(img);
      img.src = url;
      if (img.complete && img.naturalWidth > 0) void done(true);
    });
  }

  async function applyCleanedBlob(img, blob, src) {
    if (!blob) return false;
    if (isOrganicOrgSrc(src)) return applyOrganicCleanedBlob(img, blob, src);
    const preview = URL.createObjectURL(blob);
    try {
      const probe = await loadProbe(preview, false);
      if (!probe || !(await validateProbeInk(probe))) return false;
      const cdnProbe = await loadProbe(fixUrl(src), false);
      if (cdnProbe) {
        const mInk = await probeInkRatio(probe);
        const cInk = await probeInkRatio(cdnProbe);
        if (cInk > 0.01 && mInk < cInk * MIN_INK_VS_CDN) return false;
      }
    } finally {
      URL.revokeObjectURL(preview);
    }
    await putCachedBlob(src, blob);
    const url = URL.createObjectURL(blob);
    const prev = img.src;
    return new Promise(resolve => {
      const done = (ok) => {
        if (!ok) {
          URL.revokeObjectURL(url);
          restoreOriginal(img);
          resolve(false);
          return;
        }
        img.dataset.qxCleaned = "1";
        img.dataset.qxCleanVer = String(CLEAN_VER);
        img.classList.remove("qx-img-flagged");
        img.style.display = "";
        img.classList.add("qx-no-wm", "qx-cleaned", "qx-restored");
        void finalizeCleanDisplay(img).then(() => resolve(true));
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
    const probe = await loadProbe(manifestPath, false);
    if (!probe || !(await validateProbeInk(probe))) return false;
    const cdnProbe = await loadProbe(cdnSrc, false);
    if (cdnProbe) {
      const mInk = await probeInkRatio(probe);
      const cInk = await probeInkRatio(cdnProbe);
      if (cInk > 0.01 && mInk < cInk * MIN_INK_VS_CDN) return false;
    }
    stripDisplayCors(img);
    img.dataset.qxOrigSrc = cdnSrc;
    const ok = await new Promise(resolve => {
      const finish = async (success) => {
        if (success && (await validateProbeInk(img))) {
          img.dataset.qxCleaned = "1";
          img.dataset.qxCleanVer = String(CLEAN_VER);
          img.classList.add("qx-no-wm", "qx-cleaned", "qx-restored");
          img.classList.remove("qx-img-flagged", "qx-wm-pending");
          const fig = img.closest(".qx-fig, .qx-opt-fig");
          if (fig) fig.classList.remove("qx-wm-pending-wrap");
          await finalizeCleanDisplay(img);
          resolve(true);
          return;
        }
        revertToCdn(img, cdnSrc);
        resolve(false);
      };
      img.addEventListener("load", () => finish(img.naturalWidth > 0), { once: true });
      img.addEventListener("error", () => finish(false), { once: true });
      img.src = manifestPath;
      if (img.complete) finish(img.naturalWidth > 0);
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

    const restored = await fetchRestoredBlob(cdnSrc);
    if (restored && await blobLooksValid(restored)) {
      const ok = await applyCleanedBlob(img, restored, cdnSrc);
      if (ok) {
        await finalizeCleanDisplay(img);
        return true;
      }
    }

    const loaded = await loadForCanvas(cdnSrc, manifestPath);
    if (!loaded || loaded.canRead === false) return false;

    const result = await cleanFromProbe(loaded.img);
    if (!result || !result.blob) return false;
    if (!(await blobLooksValid(result.blob))) return false;
    const ok = await applyCleanedBlob(img, result.blob, cdnSrc);
    if (ok && img.naturalWidth > 0) {
      await finalizeCleanDisplay(img, result.stats);
      return true;
    }
    if (isGetmarksPool(cdnSrc) && await loadDisplaySrc(img, restoreImageUrl(cdnSrc), cdnSrc)) {
      await finalizeCleanDisplay(img, result.stats);
      return true;
    }
    if (await ensurePoolDisplay(img, cdnSrc)) return true;
    return false;
  }

  function attachErrorFallback(img) {
    if (img.dataset.qxErrBound === "1") return;
    img.dataset.qxErrBound = "1";
    img.addEventListener("load", () => {
      if (img.naturalWidth > 0) {
        img.dataset.qxProxyOk = "1";
        revealFigure(img);
      }
    });
    img.addEventListener("error", () => {
      const cdn = canonicalCdnSrc(img.dataset.qxOrigSrc || "") || fixUrl(img.dataset.qxOrigSrc || poolCdnSrc(img) || "");
      if (!cdn) return;
      const cur = String(img.getAttribute("src") || "");
      revealFigure(img);
      // Prefer direct CDN whenever proxy/restore/placeholder fails
      if (cur !== cdn && img.dataset.qxCdnDirectTried !== "1") {
        img.dataset.qxCdnDirectTried = "1";
        img.removeAttribute("crossorigin");
        img.crossOrigin = null;
        img.setAttribute("src", cdn);
        return;
      }
      if (cur.includes("/api/") && img.dataset.qxCdnRetry2 !== "1") {
        img.dataset.qxCdnRetry2 = "1";
        img.removeAttribute("crossorigin");
        img.setAttribute("src", cdn);
      }
    });
  }

  function attachWatchdog(img, cdnSrc) {
    if (img.dataset.qxWatchdog === "1") return;
    img.dataset.qxWatchdog = "1";
    let lastGood = img.naturalWidth || 0;

    const heal = () => {
      if (!img.isConnected) return;
      const cdn = poolCdnSrc(img) || cdnSrc;
      if (!cdn || !POOL_RX.test(cdn)) return;
      const cur = fixUrl(img.getAttribute("src") || "");
      if (isWorkingAltSrc(img, cur)) return;
      if (cur.includes("/api/restore-image") && !img.naturalWidth && img.complete) {
        setApiImgCors(img);
        img.setAttribute("src", proxyImageUrl(cdn));
        void upgradePoolFigure(img, cdn);
        return;
      }
      if (cur.includes("/api/proxy-image") && usingProxy(img)) return;
      if (isLocalCleanAsset(cur) || isLocalCleanAsset(cdn)) return;
      if (isCleanedImg(img) || usingRestoredSrc(img)) return;
      if (cur !== cdn && !cur.startsWith("blob:") && !cur.includes("clean-diagrams") && !cur.includes("/api/restore-image")) {
        keepPoolImageVisible(img, cdn);
      }
      if (img.naturalWidth > 0) lastGood = img.naturalWidth;
      else if ((lastGood > 0 || img.dataset.qxOrigSrc) && !usingRestoredSrc(img) && !isCleanedImg(img)) {
        void ensurePoolDisplay(img, cdn);
      }
    };

    img.addEventListener("load", heal);
    img.addEventListener("error", heal);
    let ticks = 0;
    const poll = setInterval(() => {
      if (!img.isConnected || isCleanedImg(img) || img.naturalWidth > 0) {
        clearInterval(poll);
        return;
      }
      heal();
      if (++ticks >= 8) clearInterval(poll);
    }, 800);
  }

  function attachSrcLock(img, cdnSrc) {
    if (img.dataset.qxSrcLock === "1" || !window.MutationObserver) return;
    if (isCleanedImg(img) || usingRestoredSrc(img)) return;
    img.dataset.qxSrcLock = "1";
    const obs = new MutationObserver(() => {
      if (!img.isConnected) { obs.disconnect(); return; }
      if (isCleanedImg(img) || usingRestoredSrc(img)) { obs.disconnect(); return; }
      const cdn = poolCdnSrc(img) || cdnSrc;
      const cur = fixUrl(img.getAttribute("src") || "");
      if (!cdn) return;
      if (cur.includes("/api/restore-image")) return;
      if (cur.includes("/api/proxy-image") && usingProxy(img)) return;
      if (cur.startsWith("blob:")) return;
      if (isLocalCleanAsset(cur) || isLocalCleanAsset(cdn)) return;
      if (cur.includes("clean-diagrams")) return;
      if (cur !== cdn) keepPoolImageVisible(img, cdn);
    });
    obs.observe(img, { attributes: true, attributeFilter: ["src"] });
  }

  let legacyPurged = false;
  function purgeLegacyDbs() {
    if (legacyPurged || !window.indexedDB) return;
    legacyPurged = true;
    for (let v = 1; v <= 61; v++) {
      try { indexedDB.deleteDatabase(`quantrex_clean_images_v${v}`); } catch (_) {}
    }
  }

  function isCleanedImg(img) {
    if (!img) return false;
    const cur = fixUrl(img.getAttribute("src") || "");
    if (isOrganicOrgSrc(cur) && !cur.startsWith("blob:")) {
      return !!(img.dataset.qxCleaned === "1" && img.dataset.qxCleanVer === String(CLEAN_VER));
    }
    if (isLocalReadyAsset(cur) && (img.dataset.qxCleaned === "1" || img.classList.contains("qx-cleaned"))) return true;
    return !!(img.dataset.qxCleaned === "1" || img.classList.contains("qx-cleaned"));
  }

  function usingProxy(img) {
    return !!(img && (img.dataset.qxCdnFailed === "1" || img.dataset.qxProxyOk === "1"
      || String(img.getAttribute("src") || "").includes("/api/proxy-image")));
  }

  function usingRestoredSrc(img) {
    const cur = fixUrl(img.getAttribute("src") || "");
    return !!(img && (img.dataset.qxRestoredSrc === "1" || cur.includes("/api/restore-image")
      || cur.startsWith("blob:") || isLocalCleanAsset(cur) || cur.includes("clean-diagrams")));
  }

  function isWorkingAltSrc(img, cur) {
    if (!img || !cur) return false;
    if (isLocalCleanAsset(cur)) return true;
    if (img.naturalWidth <= 0) return false;
    return cur.includes("/api/restore-image") || cur.startsWith("blob:") || cur.includes("clean-diagrams");
  }

  function keepPoolImageVisible(img, cdnSrc, force) {
    if (!img) return;
    const cdn = fixUrl(cdnSrc || poolCdnSrc(img) || "");
    if (!cdn) return;
    if (isLocalCleanAsset(cdn)) return;
    const cur = fixUrl(img.getAttribute("src") || "");
    if (isWorkingAltSrc(img, cur)) return;
    const broken = cur.includes("://.app/") || (!img.naturalWidth && img.complete);
    if (!force && !broken && isCleanedImg(img) && img.naturalWidth > 0) return;
    if (!force && !broken && usingRestoredSrc(img) && img.naturalWidth > 0) return;

    img.dataset.qxOrigSrc = cdn;
    img.classList.remove("qx-img-flagged", "qx-wm-pending");
    stripDisplayCors(img);
    const display = poolDisplaySrc(cdn);
    if (!force && usingProxy(img) && !broken) {
      const proxy = proxyImageUrl(cdn);
      if (!cur.includes("/api/proxy-image") && img.getAttribute("src") !== proxy) img.setAttribute("src", proxy);
    } else if (force || broken || !cur || cur === FIG_PLACEHOLDER || cur.includes("://.app/") || (isGetmarksPool(cdn) && cur === cdn)) {
      if (img.getAttribute("src") !== display) img.setAttribute("src", display);
    } else if (cur !== cdn && !usingRestoredSrc(img) && !cur.includes("clean-diagrams") && !cur.startsWith("blob:")) {
      if (img.getAttribute("src") !== display) img.setAttribute("src", display);
    }
    img.style.removeProperty("display");
    img.style.removeProperty("visibility");
    img.style.removeProperty("opacity");
    img.style.display = "block";
    img.style.visibility = "visible";
    img.style.opacity = "1";
    const fig = img.closest(".qx-fig, .qx-opt-fig, figure, .qx-img-wrap, .qx-diagram-slot, #qxDiagramSlot");
    if (fig) {
      fig.classList.remove("qx-wm-pending-wrap", "qx-img-under-review");
      fig.style.removeProperty("display");
      fig.style.removeProperty("visibility");
      fig.style.removeProperty("opacity");
      fig.style.display = "block";
      fig.style.visibility = "visible";
      fig.style.opacity = "1";
      fig.querySelectorAll(".qx-img-review-note").forEach(n => n.remove());
    }
    const slot = img.closest("#qxDiagramSlot, .qx-diagram-slot");
    if (slot) {
      slot.style.display = "block";
      slot.style.visibility = "visible";
      slot.style.opacity = "1";
    }
  }

  async function runCleanPipeline(img, cdnSrc) {
    if (!img || !img.isConnected || isCleanedImg(img) || img.dataset.qxHasWm !== "1") return;
    if (await resolveAndShowClean(img, cdnSrc)) return;
    const manifestRel = await cleanUrl(cdnSrc);
    const manifestPath = manifestRel && manifestRel !== cdnSrc && !manifestRel.startsWith("http")
      ? manifestRel : null;
    const ok = await tryClean(img, cdnSrc, manifestPath);
    if (!ok && !isCleanedImg(img)) {
      keepPoolImageVisible(img, cdnSrc);
      markWmNeedsOverlay(img);
      void retryInpaint(img, cdnSrc, 0);
    }
  }

  async function processImageAsync(img, cdnSrc) {
    if (!img || !img.isConnected) return;
    hideFigureLoading(img);
    try {
      if (await resolveAndShowClean(img, cdnSrc)) return;

      if (isOrganicOrgSrc(cdnSrc)) {
        hideOrganicPending(img);
        const loaded = await loadForCanvas(cdnSrc, null);
        if (loaded && loaded.canRead !== false) {
          const result = await cleanOrganicFromProbe(loaded.img);
          if (result && result.blob && await applyOrganicCleanedBlob(img, result.blob, cdnSrc)) {
            return;
          }
        }
        hideOrganicPending(img);
        return;
      }

      const cached = await preloadCleanSrc(cdnSrc);
      const manifestPath = cached.clean || null;
      if (manifestPath && await loadDisplaySrc(img, manifestPath, cdnSrc)) return;

      if (!img.naturalWidth && await loadPoolFigureSrc(img, cdnSrc)) return;

      if (await tryClean(img, cdnSrc, manifestPath)) return;

      const loaded = await loadForCanvas(cdnSrc, manifestPath);
      if (loaded && loaded.canRead !== false) {
        const result = await cleanFromProbe(loaded.img);
        if (result && result.blob && await applyCleanedBlob(img, result.blob, cdnSrc) && img.naturalWidth > 0) {
          await finalizeCleanDisplay(img, result.stats);
          return;
        }
      }

      if (await loadPoolFigureSrc(img, cdnSrc)) return;

      enhancePoolFigure(img);
      flagPoolWatermark(img, { hasWm: true, zones: defaultWmZones(cdnSrc) });
      applyWmCover(img);
      await waitForMarksHide(img);
    } finally {
      if (!img || !img.isConnected) return;
      if (isOrganicOrgSrc(cdnSrc)) {
        if (isCleanedImg(img) && img.naturalWidth > 0) {
          if (!img.dataset.qxCoachingWm) void finalizeOrganicOrgDisplay(img);
          return;
        }
        hideOrganicPending(img);
        return;
      }
      if (img.naturalWidth > 0) {
        revealFigure(img);
        if (!isCleanedImg(img)) removeCanvasShield(img);
        return;
      }
      primePoolFigure(img, cdnSrc);
      await waitForImageLoad(img, 10000);
      if (img.naturalWidth > 0) {
        markDisplayClean(img);
        return;
      }
      await loadPoolFigureSrc(img, cdnSrc);
      if (img.naturalWidth > 0) markDisplayClean(img);
      revealFigure(img);
    }
  }

  function processImage(img) {
    const cdnSrc = poolCdnSrc(img);
    if (!cdnSrc || !isPoolDiagram(cdnSrc, img)) return;
    if (img.dataset.qxProcessedVer === String(CLEAN_VER)) {
      const orgPending = isOrganicOrgSrc(cdnSrc) && !isCleanedImg(img);
      if (!orgPending && (isCleanedImg(img) || img.classList.contains("qx-fig-ready")) && img.naturalWidth > 0) {
        revealFigure(img);
        if (isPreprocessedQxOrg(cdnSrc) || img.dataset.qxDisplayW) {
          finalizeQxOrgDisplay(img);
        } else if (isCleanedImg(img)) {
          void finalizeCleanDisplay(img);
        } else {
          removeCanvasShield(img);
        }
        return;
      }
      if (img.dataset.qxProcessing === "1") return;
      if (img.classList.contains("qx-wm-loading") && !img.classList.contains("qx-fig-ready") && !img.naturalWidth) {
        delete img.dataset.qxProcessedVer;
      }
    }

    if (isPreprocessedQxOrg(cdnSrc)) {
      captureOrganicDisplayWidth(img);
      const busted = normalizeAssetSrc(cdnSrc);
      if (busted) img.setAttribute("src", busted);
      img.dataset.qxHasWm = "0";
      img.classList.add("qx-cleaned", "qx-restored", "qx-wm-clean");
      void (async () => {
        await waitForImageLoad(img, 10000);
        if (img.isConnected && img.naturalWidth > 0) finalizeQxOrgDisplay(img);
      })();
    } else if (isOrganicOrgSrc(cdnSrc)) {
      img.dataset.qxHasWm = "1";
      img.classList.remove("qx-cleaned", "qx-restored", "qx-wm-clean");
      delete img.dataset.qxCleaned;
      hideOrganicPending(img);
    } else if (isLocalReadyAsset(cdnSrc)) {
      const busted = normalizeAssetSrc(cdnSrc);
      if (busted && fixUrl(img.getAttribute("src") || "") !== fixUrl(busted)) {
        img.setAttribute("src", busted);
      }
    }

    attachErrorFallback(img);
    attachSrcLock(img, cdnSrc);
    attachWatchdog(img, cdnSrc);
    img.classList.add("qx-no-wm", "qx-pool-fig");
    img.dataset.qxProcessedVer = String(CLEAN_VER);
    if (!img.dataset.qxOrigSrc) img.dataset.qxOrigSrc = fixUrl(cdnSrc);

    ensureDiagramWrap(img);
    const fig = img.closest(".qx-fig, .qx-opt-fig, figure, .qx-img-wrap");
    if (fig) {
      fig.classList.add("qx-pool-fig-wrap");
      fig.style.removeProperty("display");
      fig.style.removeProperty("visibility");
      fig.style.removeProperty("opacity");
    }

    if (isCleanedImg(img)) {
      if (isPreprocessedQxOrg(cdnSrc) || img.dataset.qxDisplayW) {
        if (img.naturalWidth > 0) finalizeQxOrgDisplay(img);
        else img.addEventListener("load", () => finalizeQxOrgDisplay(img), { once: true });
      }
      revealFigure(img);
      if (!isPreprocessedQxOrg(cdnSrc)) void finalizeCleanDisplay(img);
      return;
    }

    primePoolFigure(img, cdnSrc);
    hideFigureLoading(img);

    const curSrc = fixUrl(img.getAttribute("src") || "");
    if (img.dataset.qxPrimed === "1" || isApiFigureSrc(curSrc)) {
      revealFigure(img);
      if (img.naturalWidth > 0) {
        void upgradePoolFigure(img, cdnSrc);
        return;
      }
      img.dataset.qxProcessing = "1";
      void (async () => {
        try {
          await waitForImageLoad(img, 12000);
          if (img.naturalWidth <= 0) await loadPoolFigureSrc(img, cdnSrc);
          if (img.naturalWidth > 0) await upgradePoolFigure(img, cdnSrc);
        } finally {
          revealFigure(img);
          delete img.dataset.qxProcessing;
        }
      })();
      return;
    }

    img.dataset.qxProcessing = "1";
    void processImageAsync(img, cdnSrc).finally(() => {
      delete img.dataset.qxProcessing;
    });
  }

  let observerStarted = false;
  let observerPending = false;
  const observerQueue = new Set();

  function queueProcessImage(img) {
    if (!img || img.nodeType !== 1) return;
    observerQueue.add(img);
    if (observerPending) return;
    observerPending = true;
    requestAnimationFrame(() => {
      observerPending = false;
      const batch = [...observerQueue];
      observerQueue.clear();
      batch.forEach(processImage);
    });
  }

  function startObserver() {
    if (observerStarted || !window.MutationObserver) return;
    observerStarted = true;
    const obs = new MutationObserver(muts => {
      muts.forEach(m => {
        if (m.type === "childList") {
          m.removedNodes.forEach(n => {
            if (n.nodeType !== 1) return;
            const slot = n.id === "qxDiagramSlot" ? n : (n.querySelector && n.querySelector("#qxDiagramSlot"));
            if (slot && slot.dataset && slot.dataset.qxQid) {
              requestAnimationFrame(() => reinjectPinned(document));
            }
          });
        }
        m.addedNodes.forEach(n => {
          if (n.nodeType !== 1) return;
          if (n.tagName === "IMG") queueProcessImage(n);
          else if (n.querySelectorAll) {
            n.querySelectorAll("img[src*='cdn-question-pool'], img[src*='/pyq/'], img[src*='/assets/diagrams/'], #qxDiagramSlot img").forEach(queueProcessImage);
          }
          if (n.id === "qxDiagramSlot" || n.classList?.contains("qx-diagram-slot")) {
            n.querySelectorAll?.("img").forEach(queueProcessImage);
          } else if (n.querySelectorAll) {
            n.querySelectorAll(".qx-diagram-slot img, #qxDiagramSlot img").forEach(queueProcessImage);
          }
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function extractPoolFigureHtml(html, qid) {
    const override = getFigureOverrideSrc(html, qid);
    if (override) return poolFigureHtml(override);
    const parts = [];
    const s = String(html || "");
    const figRx = /<figure\b[^>]*>[\s\S]*?<\/figure>/gi;
    let fm;
    while ((fm = figRx.exec(s)) !== null) {
      if (POOL_RX.test(fm[0])) parts.push(fm[0]);
    }
    const imgRx = /<img\b[^>]*>/gi;
    let m;
    while ((m = imgRx.exec(s)) !== null) {
      const tag = m[0];
      const origM = tag.match(/\bdata-qx-orig-src=["']([^"']+)["']/i);
      const srcM = tag.match(/\bsrc=["']([^"']+)["']/i);
      const raw = origM ? origM[1] : (srcM ? srcM[1] : "");
      if (!raw || isApiFigureSrc(raw)) continue;
      const src = canonicalCdnSrc(raw) || (isLocalCleanAsset(raw) ? normalizeAssetSrc(raw) : "");
      if (!src || (!isPoolDiagram(src) && !isLocalCleanAsset(src))) continue;
      if (parts.some(p => p.includes(src))) continue;
      parts.push(poolFigureHtml(src, parseImgDisplayWidth(tag)));
    }
    return parts.join("");
  }

  function compactQuestionHtml(html) {
    return String(html || "")
      .replace(/(<br\s*\/?>\s*){2,}/gi, "<br>")
      .replace(/(<\/p>\s*)+<p[^>]*>/gi, "</p><p>")
      .replace(/<p>\s*<\/p>/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function stripDiagramTags(html) {
    return compactQuestionHtml(String(html || "")
      .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, " ")
      .replace(/<img\b[^>]*>/gi, " ")
      .replace(/<p>\s*<\/p>/gi, " "));
  }

  function splitQuestionHtml(html, qid) {
    const raw = compactQuestionHtml(html);
    const diagrams = extractPoolFigureHtml(raw, qid);
    const imgAt = raw.search(/<(?:figure|img)\b/i);
    if (imgAt < 0) {
      const text = stripDiagramTags(raw);
      return { diagrams, text, before: text, after: "" };
    }
    const before = stripDiagramTags(raw.slice(0, imgAt));
    const after = stripDiagramTags(raw.slice(imgAt));
    const text = [before, after].filter(Boolean).join(" ");
    return { diagrams, text, before, after };
  }

  function parseFigureFromTag(tag) {
    const block = String(tag || "");
    const imgM = block.match(/<img\b([^>]*)>/i);
    if (!imgM) return null;
    const attrs = imgM[1];
    const origM = attrs.match(/\bdata-qx-orig-src=["']([^"']+)["']/i);
    const srcM = attrs.match(/\bsrc=["']([^"']+)["']/i);
    const raw = origM ? origM[1] : (srcM ? srcM[1] : "");
    if (!raw || isApiFigureSrc(raw)) return null;
    let src = "";
    if (isLocalCleanAsset(raw)) src = normalizeAssetSrc(raw);
    else {
      const cdn = canonicalCdnSrc(raw);
      if (cdn) src = cdn;
    }
    if (!src || (!isPoolDiagram(src) && !isLocalCleanAsset(src))) return null;
    return { src, displayW: parseImgDisplayWidth(attrs) };
  }

  function parseQuestionSegments(html, qid, q) {
    const override = getFigureOverrideSrc(html, qid);
    if (override) return [{ type: "figure", src: override, displayW: 0 }];
    const qSrc = questionImageSrc(q);
    const raw = compactQuestionHtml(html);
    const figRx = /<figure\b[^>]*>[\s\S]*?<\/figure>|<img\b[^>]*>/gi;
    const segments = [];
    let last = 0;
    let m;
    while ((m = figRx.exec(raw)) !== null) {
      const text = raw.slice(last, m.index).trim();
      if (text) segments.push({ type: "text", html: text });
      const fig = parseFigureFromTag(m[0]);
      if (fig) segments.push({ type: "figure", src: fig.src, displayW: fig.displayW });
      last = m.index + m[0].length;
    }
    const tail = raw.slice(last).trim();
    if (tail) segments.push({ type: "text", html: tail });
    if (!segments.length && raw) segments.push({ type: "text", html: raw });
    if (!segments.some(s => s.type === "figure") && qSrc) {
      segments.push({ type: "figure", src: qSrc, displayW: 0 });
    }
    return segments;
  }

  function pushPoolSrc(srcs, raw) {
    const cdn = canonicalCdnSrc(raw);
    if (!cdn || srcs.includes(cdn)) return;
    srcs.push(cdn);
  }

  function pushDiagramSrc(srcs, raw) {
    if (isLocalCleanAsset(raw)) {
      const local = normalizeAssetSrc(raw);
      if (local && !srcs.includes(local)) srcs.push(local);
      return;
    }
    pushPoolSrc(srcs, raw);
  }

  function extractPoolSrcs(html) {
    const srcs = [];
    const s = String(html || "");
    const origRx = /\bdata-qx-orig-src=["']([^"']+)["']/gi;
    let om;
    while ((om = origRx.exec(s)) !== null) pushDiagramSrc(srcs, om[1]);
    const rx = /\bsrc=["']([^"']+)["']/gi;
    let m;
    while ((m = rx.exec(s)) !== null) {
      if (isApiFigureSrc(m[1])) continue;
      pushDiagramSrc(srcs, m[1]);
    }
    if (!srcs.length && POOL_RX.test(s)) {
      const urlRx = /(https?:\/\/[^\s"'<>]+|\/pyq\/[^\s"'<>]+)/gi;
      let um;
      while ((um = urlRx.exec(s)) !== null) {
        const raw = um[1].startsWith("/") ? PYQ_CDN.replace(/\/$/, "") + um[1] : um[1];
        pushPoolSrc(srcs, raw);
      }
    }
    return srcs;
  }

  function rememberQuestionRaw(q) {
    if (!q || q.id == null) return;
    window._qxDiagramRaw = window._qxDiagramRaw || {};
    window._qxDiagramRaw[String(q.id)] = q.q;
    (q.options || []).forEach((o, i) => {
      window._qxDiagramRaw[String(q.id) + ":opt:" + i] = o;
    });
  }

  function imgIsLoading(img) {
    if (!img) return false;
    const src = fixUrl(img.getAttribute("src") || "");
    return !!src && !img.complete;
  }

  function mountDiagramSlot(slot, qid, rawHtml) {
    if (!slot) return;
    pinQuestionHtml(qid, rawHtml);
    const q = (typeof getQ === "function" && qid != null) ? getQ(qid) : null;
    const entries = resolveDiagramEntries(rawHtml, qid, q);
    slot.classList.add("qx-pool-fig-wrap", "mathjax_ignore", "tex2jax_ignore");
    slot.dataset.qxQid = String(qid);
    slot.dataset.qxLocked = "1";
    slot.style.display = "block";
    slot.style.visibility = "visible";
    slot.style.opacity = "1";
    if (!entries.length) return;

    const existing = Array.from(slot.querySelectorAll("img"));
    const existingSrcs = existing.map(i => canonicalCdnSrc(i.dataset.qxOrigSrc || i.getAttribute("src") || "") || fixUrl(i.dataset.qxOrigSrc || ""));
    const srcs = entries.map(e => e.src);
    if (srcs.length === existingSrcs.length && srcs.every((s, i) => s === existingSrcs[i])) {
      if (existing.some(imgIsLoading)) return;
      existing.forEach(img => processImage(img));
      return;
    }
    if (existing.some(imgIsLoading) && existingSrcs.length && srcs.length === existingSrcs.length) return;

    slot.innerHTML = entries.map(e => poolFigureHtml(e.src, e.displayW)).join("");
    slot.querySelectorAll("img").forEach(img => processImage(img));
  }

  function escAttr(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function poolFigureHtml(cdn, displayW) {
    const src = normalizeAssetSrc(canonicalCdnSrc(cdn) || cdn);
    const u = escAttr(src);
    const organic = isPreprocessedQxOrg(src) || isOrganicOrgSrc(src);
    let dw = parseInt(displayW, 10) || 0;
    if (organic && dw <= 12) dw = ORGANIC_DEFAULT_FIG_W;
    const orgSrc = isOrganicOrgSrc(src);
    const localClean = isLocalReadyAsset(src);
    const pool = !localClean && !orgSrc && isPoolDiagram(src);
    const overlay = "";
    // Pool diagrams → CORS proxy (scrub MARKS + Quantrex black WM). Local assets stay direct.
    let displaySrc = u;
    if (pool) displaySrc = escAttr(poolDisplaySrc(src) || src);
    else if (orgSrc || localClean) displaySrc = u;
    // Proxy allows canvas CORS; direct CDN has no ACAO
    const corsAttr = pool ? ` crossorigin="anonymous"` : "";
    const wmAttrs = orgSrc
      ? ` data-qx-has-wm="1" data-qx-org-src="1" data-qx-wm-zones="center,br"`
      : (pool
        ? ` data-qx-has-wm="1" data-qx-wm-zones="${escAttr(defaultWmZones(src).join(","))}" data-qx-primed="1" data-qx-pending-load="1"`
        : (localClean ? ` data-qx-has-wm="0" data-qx-cleaned="1"` : ""));
    const wmClass = (localClean || pool || orgSrc) ? " qx-fig-ready" : " qx-wm-loading";
    const poolAttr = (pool || orgSrc) ? ` data-qx-pool-wm="1"` : "";
    const cleanCls = localClean ? " qx-cleaned qx-restored qx-wm-clean qx-fig-ready" : " qx-fig-ready";
    const figW = dw > 12 ? ` style="--qx-fig-w:${dw}px;max-width:100%;"` : "";
    const imgDataW = dw > 12 ? ` data-qx-display-w="${dw}"` : "";
    const imgStyle = dw > 12
      ? ` style="--qx-fig-w:${dw}px;width:${dw}px;height:auto;max-width:100%;display:block;margin:0 auto;"`
      : ` style="max-width:100%;height:auto;max-height:200px;display:block;margin:4px auto;"`;
    const imgClass = ` class="qx-fig-img qx-no-wm qx-pool-fig${organic ? " qx-organic-fig" : ""}${cleanCls}"`;
    return `<figure class="qx-fig qx-pool-fig-wrap qx-brand-covered qx-fig-stack mathjax_ignore tex2jax_ignore${wmClass}"${figW}><div class="qx-fig-inner qx-wm-stack${wmClass}"${poolAttr}${figW}><img${imgClass}${imgDataW}${imgStyle} src="${displaySrc}" alt="" loading="eager" decoding="async" fetchpriority="high" referrerpolicy="no-referrer"${corsAttr} data-qx-orig-src="${u}" data-qx-pinned="1"${wmAttrs}>${overlay}</div></figure>`;
  }

  function buildSlotInnerHtml(rawHtml, qid, q) {
    const entries = resolveDiagramEntries(rawHtml, qid, q);
    if (entries.length) {
      return entries.map(e => poolFigureHtml(e.src, e.displayW)).join("");
    }
    const pinned = extractPoolFigureHtml(rawHtml, qid);
    return pinned || "";
  }

  function buildDiagramSlotHtml(qid, rawHtml, q) {
    if (qid == null || qid === "") return "";
    pinQuestionHtml(qid, rawHtml);
    const inner = buildSlotInnerHtml(rawHtml, qid, q);
    if (!inner) return "";
    return `<div class="qx-diagram-slot qx-pool-fig-wrap mathjax_ignore tex2jax_ignore" id="qxDiagramSlot" data-qx-qid="${qid}" data-qx-locked="1">${inner}</div>`;
  }

  function buildOptSlotHtml(qid, optIndex, rawHtml) {
    if (qid == null || qid === "") return "";
    const key = String(qid) + ":opt:" + optIndex;
    pinQuestionHtml(key, rawHtml);
    const inner = buildSlotInnerHtml(rawHtml, key);
    if (!inner) return "";
    return `<div class="qx-opt-diagram-slot qx-diagram-slot mathjax_ignore tex2jax_ignore" data-qx-qid="${key}" data-qx-locked="1">${inner}</div>`;
  }

  function renderOptionContent(qid, optIndex, rawOpt, renderText) {
    const q = (typeof getQ === "function" && qid != null) ? getQ(qid) : null;
    const render = typeof renderText === "function" ? renderText : (t => t);
    const raw = fixUrl(String(rawOpt || ""));
    if (isMarksNativeBook(q)) {
      return `<span class="qx-marks-native-opt">${render(raw)}</span>`;
    }
    const key = String(qid) + ":opt:" + optIndex;
    pinQuestionHtml(key, raw);
    // Image options: always keep a visible img path (never blank A/B/C/D boxes)
    if (/<img\b/i.test(raw)) {
      const slot = buildOptSlotHtml(qid, optIndex, raw);
      const { text } = splitQuestionHtml(raw, key);
      const plain = String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const body = plain ? render(text) : "";
      if (slot) return slot + (body ? `<span class="qx-opt-text-only">${body}</span>` : "");
      // Slot builder failed — render original HTML with fixed CDN urls
      return `<span class="qx-opt-direct-img qx-content">${render(raw)}</span>`;
    }
    return `<span class="qx-content">${render(raw)}</span>`;
  }

  function imgHasRealFigure(img) {
    if (!img) return false;
    const nw = img.naturalWidth || 0;
    const nh = img.naturalHeight || 0;
    if (nw < 40 || nh < 40) return false;
    const src = fixUrl(img.getAttribute("src") || "");
    if (!src || src === FIG_PLACEHOLDER || src.startsWith("data:image/gif")) return false;
    // Fully loaded and painted
    if (!img.complete) return false;
    return (img.offsetHeight > 24 || img.clientHeight > 24);
  }

  function slotFigureVisible(slot) {
    const slotImg = slot && slot.querySelector("img.qx-pool-fig, img");
    return imgHasRealFigure(slotImg);
  }

  function stripQuestionInlineImgs(root) {
    // Only dedupe when diagram SLOT has a fully loaded real figure.
    // Never strip the only copy of a figure (was causing missing figures).
    const scope = root || document;
    const slot = scope.querySelector("#qxDiagramSlot, .qx-question-body .qx-diagram-slot");
    if (!slotFigureVisible(slot)) return;
    scope.querySelectorAll(".mtk-q-text, .qx-q-text-only, .qa-q, .qx-prac-q, .qx-question-body .mtk-q-text").forEach(textEl => {
      if (textEl.closest(".qx-diagram-slot, #qxDiagramSlot")) return;
      textEl.querySelectorAll("figure").forEach(fig => {
        if (fig.closest(".qx-diagram-slot, #qxDiagramSlot")) return;
        if (fig.querySelector("img[src*='cdn-question-pool'], img[src*='/pyq/'], img[src*='qx-figures']")) fig.remove();
      });
      textEl.querySelectorAll("img").forEach(img => {
        if (img.closest(".qx-diagram-slot, #qxDiagramSlot")) return;
        const cdn = fixUrl(img.getAttribute("src") || img.dataset.qxOrigSrc || "");
        if (isPoolDiagram(cdn, img) || isLocalCleanAsset(cdn)) img.remove();
      });
    });
  }

  function stripInlinePoolImgs(root) {
    const scope = root || document;
    stripQuestionInlineImgs(scope);
    scope.querySelectorAll(".mtk-opt-text, .qx-prac-opt-text, .qa-opt .qx-content").forEach(textEl => {
      const slot = textEl.querySelector(".qx-opt-diagram-slot, .qx-diagram-slot");
      const slotImg = slot && slot.querySelector("img");
      const slotOk = imgHasRealFigure(slotImg);
      textEl.querySelectorAll("img").forEach(img => {
        if (img.closest(".qx-opt-diagram-slot, .qx-diagram-slot")) return;
        const cdn = fixUrl(img.getAttribute("src") || img.dataset.qxOrigSrc || "");
        if (!isPoolDiagram(cdn, img) && !isLocalCleanAsset(cdn)) return;
        // Only remove duplicate when slot already shows a real loaded figure
        if (slotOk && img !== slotImg) img.remove();
        else processImage(img);
      });
    });
  }

  function finalizeDiagrams(root, q) {
    const scope = root || document;
    scope.querySelectorAll(".qx-diagram-seg[data-qx-qid]").forEach(slot => {
      slot.querySelectorAll("img").forEach(img => processImage(img));
    });
    scope.querySelectorAll("#qxDiagramSlot, .qx-diagram-slot[data-qx-qid]").forEach(slot => {
      if (slot.classList.contains("qx-diagram-seg")) return;
      const qid = slot.dataset.qxQid;
      let raw = null;
      if (q && String(q.id) === String(qid)) raw = q.q;
      else if (window._qxDiagramRaw && window._qxDiagramRaw[String(qid)]) raw = window._qxDiagramRaw[String(qid)];
      if (raw) mountDiagramSlot(slot, qid, raw);
    });
  }

  function resolveCurrentQuestion(root) {
    if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.getSession && typeof getQ === "function") {
      const sess = QuantrexTestEngine.getSession();
      if (sess && sess.ids && sess.ids[sess.idx] != null) {
        const q = getQ(sess.ids[sess.idx]);
        if (q) return q;
      }
    }
    const scope = root || document;
    const qidEl = scope.querySelector(".qx-question-body[data-qx-qid], [data-qx-qid].mtk-q-text, [data-qx-qid].qx-q-text-only, #qxDiagramSlot[data-qx-qid]");
    if (qidEl && qidEl.dataset.qxQid && typeof getQ === "function") {
      const q = getQ(qidEl.dataset.qxQid);
      if (q) return q;
    }
    return null;
  }

  function finalizeOptionDiagrams(root, q) {
    const scope = root || document;
    scope.querySelectorAll(".qx-opt-diagram-slot[data-qx-qid]").forEach(slot => {
      const key = slot.dataset.qxQid;
      let raw = window._qxDiagramRaw && window._qxDiagramRaw[key];
      if (!raw && key && String(q.id) === String(key.split(":opt:")[0])) {
        const idx = parseInt(String(key).split(":opt:")[1], 10);
        if (!isNaN(idx)) raw = (q.options || [])[idx];
      }
      if (raw) mountDiagramSlot(slot, key, raw);
    });
    if (!q || !q.options) {
      stripInlinePoolImgs(scope);
      return;
    }
    const optBtns = scope.querySelectorAll(".mtk-opt, .qa-opt, .qx-prac-opt");
    (q.options || []).forEach((opt, i) => {
      if (!extractPoolSrcs(opt).length) return;
      const btn = optBtns[i];
      if (!btn) return;
      const textEl = btn.querySelector(".mtk-opt-text, .qx-prac-opt-text, .qx-content");
      if (!textEl) return;
      let slot = textEl.querySelector(".qx-opt-diagram-slot");
      if (!slot) {
        slot = document.createElement("div");
        slot.className = "qx-opt-diagram-slot qx-diagram-slot mathjax_ignore tex2jax_ignore";
        slot.dataset.qxQid = String(q.id) + ":opt:" + i;
        slot.dataset.qxLocked = "1";
        textEl.insertBefore(slot, textEl.firstChild);
      }
      mountDiagramSlot(slot, q.id + ":opt:" + i, opt);
    });
    stripInlinePoolImgs(scope);
  }

  function applyBrandOverlays(root) {
    const scope = root || document.body;
    if (!scope) return;
    if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.scanAllFigures) {
      QxPremiumWM.scanAllFigures(scope);
    }
    scope.querySelectorAll(".qx-diagram-slot, #qxDiagramSlot, .qx-opt-diagram-slot").forEach(slot => {
      directOverlayKids(slot).forEach(el => el.remove());
      slot.classList.remove("qx-wm-active");
    });
    scope.querySelectorAll("img.qx-pool-fig, img[src*='cdn-question-pool'], img[src*='/pyq/'], img[src*='/assets/diagrams/']").forEach(img => {
      removeCanvasShield(img);
      const target = overlayTargetForImg(img);
      if (target) syncBrandOverlay(target);
    });
  }

  function finalizeMarksNative(root, q) {
    const scope = root || document;
    if (q) rememberQuestionRaw(q);
    scope.querySelectorAll(".qx-marks-native img, .qx-marks-native-opt img").forEach(img => {
      const src = fixUrl(img.getAttribute("src") || "");
      if (src && src !== img.getAttribute("src")) img.setAttribute("src", src);
      img.classList.add("qx-marks-inline-fig");
      img.removeAttribute("crossorigin");
      img.loading = "eager";
      img.decoding = "async";
    });
  }

  function finalizeAll(root, q) {
    if (isMarksNativeBook(q)) {
      finalizeMarksNative(root, q);
      return;
    }
    if (q) rememberQuestionRaw(q);
    finalizeDiagrams(root, q);
    finalizeOptionDiagrams(root, q);
    stripInlinePoolImgs(root);
    reinjectPinned(root);
    applyBrandOverlays(root);
  }

  function buildQuestionBodyHtml(qid, rawHtml, renderText, q) {
    if (qid == null || qid === "") return "";
    const render = typeof renderText === "function" ? renderText : (t => t);
    if (isMarksNativeBook(q)) {
      const body = render(fixUrl(String(rawHtml || "")));
      return `<div class="mtk-q-text qx-content qx-marks-native qx-marks-native-q" data-qx-qid="${qid}">${body}</div>`;
    }
    pinQuestionHtml(qid, rawHtml);
    const segments = parseQuestionSegments(rawHtml, qid, q);
    const textCls = "mtk-q-text qx-content qx-q-text-only";
    const hasFig = segments.some(s => s.type === "figure");
    if (!hasFig) {
      return `<div class="${textCls}" data-qx-qid="${qid}">${render(rawHtml)}</div>`;
    }
    const figTotal = segments.filter(s => s.type === "figure").length;
    let figIdx = 0;
    const parts = segments.map(seg => {
      if (seg.type === "text") {
        return `<div class="${textCls} qx-q-seg-text" data-qx-qid="${qid}">${render(seg.html)}</div>`;
      }
      figIdx += 1;
      const inner = poolFigureHtml(seg.src, seg.displayW);
      const idAttr = figTotal === 1 && figIdx === 1 ? ' id="qxDiagramSlot"' : "";
      return `<div class="qx-diagram-seg qx-diagram-slot qx-pool-fig-wrap mathjax_ignore tex2jax_ignore"${idAttr} data-qx-qid="${qid}" data-qx-seg="${figIdx}" data-qx-locked="1">${inner}</div>`;
    });
    return `<div class="qx-question-body qx-question-flow" data-qx-qid="${qid}">${parts.join("")}</div>`;
  }

  function pinQuestionHtml(qid, html) {
    if (qid == null || qid === "") return;
    const block = extractPoolFigureHtml(html, qid);
    if (block) _pinnedHtml.set(String(qid), block);
  }

  function slotNeedsDiagram(slot) {
    if (!slot) return false;
    const imgs = slot.querySelectorAll("img");
    if (!imgs.length) return true;
    if (Array.from(imgs).some(imgIsLoading)) return false;
    if (Array.from(imgs).some(img => isLocalCleanAsset(poolCdnSrc(img) || img.getAttribute("src")))) return false;
    let hasVisible = false;
    for (const img of imgs) {
      const cdn = poolCdnSrc(img) || fixUrl(img.getAttribute("src") || "");
      if (isLocalCleanAsset(cdn)) { hasVisible = true; continue; }
      if (!cdn || !isPoolDiagram(cdn, img)) continue;
      const st = window.getComputedStyle ? getComputedStyle(img) : img.style;
      const hidden = st && (st.display === "none" || st.visibility === "hidden" || parseFloat(st.opacity || "1") <= 0.05);
      if (!hidden && (img.offsetHeight > 8 || img.naturalWidth > 0 || img.complete)) hasVisible = true;
    }
    return !hasVisible;
  }

  function reinjectPinned(scope) {
    const root = scope || document;
    root.querySelectorAll(".qx-diagram-slot[data-qx-qid]").forEach(slot => {
      const qid = slot.dataset.qxQid;
      const pin = _pinnedHtml.get(String(qid));
      if (!pin || !slotNeedsDiagram(slot)) return;
      slot.innerHTML = pin;
      slot.classList.add("qx-pool-fig-wrap");
      slot.querySelectorAll("img").forEach(img => processImage(img));
    });
    stripQuestionInlineImgs(root);
  }

  let guardianStarted = false;
  const GUARDIAN_MS = 25000;
  const GUARDIAN_SEL = "img.qx-pool-fig, .qx-diagram-slot img, .qx-opt-fig img, .qx-fig img";

  function runGuardianPass() {
    if (document.hidden) return;
    document.querySelectorAll(GUARDIAN_SEL).forEach(img => {
      const cdn = poolCdnSrc(img);
      if (!cdn || !isPoolDiagram(cdn, img)) return;
      const cur = fixUrl(img.getAttribute("src") || "");
      if (isCleanedImg(img) && img.naturalWidth > 0) return;
      if (img.dataset.qxProcessing === "1") return;
      if (img.classList.contains("qx-wm-loading") && !img.classList.contains("qx-fig-ready") && !img.naturalWidth) {
        queueProcessImage(img);
        return;
      }
      if (cur.includes("/api/proxy-image") && usingProxy(img)) return;
      if (!img.isConnected) return;
      if (isWorkingAltSrc(img, cur)) return;
      if (cur.includes("/api/restore-image") && !img.naturalWidth && img.complete) {
        void ensurePoolDisplay(img, cdn);
        return;
      }
      if (cur.includes("://.app/") || (!img.naturalWidth && img.complete && cur === cdn)) {
        void ensurePoolDisplay(img, cdn);
        if (!isCleanedImg(img) && !usingRestoredSrc(img)) queueProcessImage(img);
        return;
      }
      if (isLocalCleanAsset(cur) || isLocalCleanAsset(cdn)) return;
      if (isGetmarksPool(cdn) && cur === cdn) {
        void ensurePoolDisplay(img, cdn);
        return;
      }
      if (cur !== cdn && !cur.startsWith("blob:") && !cur.includes("clean-diagrams") && !cur.includes("/api/restore-image")) {
        keepPoolImageVisible(img, cdn);
      }
    });
  }

  function startGuardian() {
    if (guardianStarted) return;
    guardianStarted = true;
    setInterval(runGuardianPass, GUARDIAN_MS);
  }

  function scan(root) {
    const scope = root || document.body;
    if (!scope) return;
    purgeLegacyDbs();
    void loadFigureOverrides();
    startObserver();
    startGuardian();
    // First force every Marks CDN img onto clean proxy (removes baked MARKS watermark)
    rewriteAllPoolImgs(scope);
    if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.scanAllFigures) {
      QxPremiumWM.scanAllFigures(scope);
    }
    // Strip any leftover overlays
    scope.querySelectorAll(
      ".qx-premium-wm-sheet, .qx-quantrex-wm-overlay, .qx-brand-overlay, .qx-diag-watermark, canvas.qx-premium-wm-canvas, canvas.qx-marks-scrub-canvas, .qx-quantrex-black-wm, .qx-quantrex-black-seal"
    ).forEach(el => el.remove());
    scope.querySelectorAll("img").forEach(img => processImage(img));
    finalizeAll(scope, resolveCurrentQuestion(scope));
    // second pass after images settle
    setTimeout(() => rewriteAllPoolImgs(scope), 400);
    setTimeout(() => rewriteAllPoolImgs(scope), 1200);
  }

  return {
    fixUrl,
    isPoolDiagram,
    cleanUrl,
    scan,
    rewriteAllPoolImgs,
    proxyImageUrl,
    processImage,
    pinQuestionHtml,
    splitQuestionHtml,
    extractPoolSrcs,
    buildDiagramSlotHtml,
    buildOptSlotHtml,
    renderOptionContent,
    buildQuestionBodyHtml,
    isMarksNativeBook,
    mountDiagramSlot,
    rememberQuestionRaw,
    finalizeDiagrams,
    finalizeOptionDiagrams,
    finalizeAll,
    prepareQuestionFigures,
    revealFigure,
    resolveCurrentQuestion,
    reinjectPinned,
    brandOverlayHtml,
    poolFigureHtml,
    ensureBrandOverlay,
    syncBrandOverlay,
    finalizeCleanDisplay,
    applyBrandOverlays,
    applyWmCover,
    applyQuantrexBrand,
    exportWatermarkedFigure: (img) => (
      typeof QxPremiumWM !== "undefined" && QxPremiumWM.exportWatermarkedFigure
        ? QxPremiumWM.exportWatermarkedFigure(img)
        : Promise.resolve(null)
    ),
    processAllDiagrams,
    cleanImageData,
    loadManifest,
    loadReview,
    restoreOriginal,
    CLEAN_VER
  };
})();