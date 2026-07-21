// Quantrex Academy — premium diagonal watermark + pixel-precise MARKS hide
window.QxPremiumWM = (() => {
  const LOGO_SRC = "/assets/quantrex-academy-brand.png";
  const COACHING_WM_SRC = "/assets/quantrex-academy-brand-wm.png";
  const LOGO_FALLBACK = "/assets/quantrex-academy-brand.svg";
  const LOGO_FALLBACK2 = "/assets/quantrex-premium-logo.png";
  const COACHING_WM_SCALE = 0.38;
  const COACHING_WM_OPACITY = 0.055;
  const COACHING_WM_OPACITY_OPT = 0.04;
  const COACHING_WM_MIN_PX = 56;
  const PROXY_BASE = (typeof location !== "undefined" && location.origin && !/localhost|127\.0\.0\.1/i.test(location.origin))
    ? location.origin.replace(/\/$/, "")
    : "https://quantrexacademy-live.web.app";
  const ROT_DEG = 35;
  const TEXT_OPACITY = 0.12;
  const TAG_OPACITY = 0.10;
  const LOGO_OPACITY_MIN = 0.12;
  const LOGO_OPACITY_MAX = 0.18;
  const LOGO_SCALE_MIN = 0.15;
  const LOGO_SCALE_MAX = 0.30;
  const FALLBACK_OPACITY = 0.10;
  const FALLBACK_COVERAGE = 0.72;
  const OPT_LOGO_SCALE = 0.12;
  const MAX_SCRUB_RATIO = 0.15;
  const OPT_MAX_SCRUB_RATIO = 0.16;
  const INK_DILATE = 2;
  const SCRUB_MIN_AVG = 108;

  let logoImg = null;
  let logoReady = false;
  let coachingWmImg = null;
  let coachingWmReady = false;
  let themeObsStarted = false;
  const _scrubCache = new Map();

  function isDarkTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  function themePalette() {
    // Always black Quantrex brand on figures (user brand requirement)
    return {
      primary: "rgba(0,0,0,0.88)",
      accent: "rgba(20,20,20,0.78)",
      gold: "rgba(0,0,0,0.55)",
      shadow: "rgba(0,0,0,0.18)",
      glow: false,
      black: true
    };
  }

  function ensureLogo(cb) {
    if (logoReady && logoImg) { cb(logoImg); return; }
    const img = new Image();
    img.decoding = "async";
    img.onload = () => { logoImg = img; logoReady = true; cb(img); };
    img.onerror = () => {
      const fb = new Image();
      fb.decoding = "async";
      fb.onload = () => { logoImg = fb; logoReady = true; cb(fb); };
      fb.onerror = () => {
        const fb2 = new Image();
        fb2.decoding = "async";
        fb2.onload = () => { logoImg = fb2; logoReady = true; cb(fb2); };
        fb2.onerror = () => cb(null);
        fb2.src = LOGO_FALLBACK2;
      };
      fb.src = LOGO_FALLBACK;
    };
    img.src = LOGO_SRC;
  }

  function ensureCoachingWmLogo(cb) {
    if (coachingWmReady && coachingWmImg) { cb(coachingWmImg); return; }
    const img = new Image();
    img.decoding = "async";
    img.onload = () => { coachingWmImg = img; coachingWmReady = true; cb(img); };
    img.onerror = () => ensureLogo(cb);
    img.src = COACHING_WM_SRC;
  }

  function isLikelyInk(r, g, b) {
    const avg = (r + g + b) / 3;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (avg < 132) return true;
    if (chroma > 32 && avg < 218) return true;
    return false;
  }

  function dilateInkMask(mask, w, h, radius) {
    const out = new Uint8Array(mask);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) continue;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            out[ny * w + nx] = 1;
          }
        }
      }
    }
    return out;
  }

  function isStrictMarksPixel(r, g, b, a) {
    return isRemovableWm(r, g, b, a);
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

  function buildInkMask(data, w, h) {
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (isLikelyInk(data[i], data[i + 1], data[i + 2])) mask[y * w + x] = 1;
      }
    }
    return mask;
  }

  function sampleDrawable(drawable, nw, nh, maxSide) {
    const scale = Math.min(1, maxSide / Math.max(nw, nh, 1));
    const w = Math.max(8, Math.round(nw * scale));
    const h = Math.max(8, Math.round(nh * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    try {
      ctx.drawImage(drawable, 0, 0, w, h);
      return { data: ctx.getImageData(0, 0, w, h).data, w, h };
    } catch (_) {
      return null;
    }
  }

  function proxyUrl(cdn) {
    const fixed = String(cdn || "").replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/");
    // Always same-origin clean proxy (strips MARKS watermarks server-side)
    try {
      if (location.origin && !/localhost|127\.0\.0\.1/i.test(location.origin)) {
        return `/api/proxy-image?url=${encodeURIComponent(fixed)}&clean=1`;
      }
    } catch (_) { /* */ }
    const base = (PROXY_BASE || "https://quantrexacademy-live.web.app").replace(/\/$/, "");
    return `${base}/api/proxy-image?url=${encodeURIComponent(fixed)}&clean=1`;
  }

  function loadProbe(url, cors) {
    return new Promise(resolve => {
      const probe = new Image();
      if (cors) probe.crossOrigin = "anonymous";
      probe.decoding = "async";
      probe.onload = () => resolve(probe.naturalWidth > 0 ? probe : null);
      probe.onerror = () => resolve(null);
      probe.src = url;
    });
  }

  async function loadScrubDrawable(img) {
    let cdn = img.dataset.qxOrigSrc || "";
    if (!cdn || cdn.includes("/api/")) {
      const src = img.getAttribute("src") || "";
      if (src.includes("url=")) {
        try {
          const inner = new URL(src, location.origin).searchParams.get("url");
          if (inner) cdn = decodeURIComponent(inner);
        } catch (_) { /* ignore */ }
      }
      if (!cdn) cdn = src;
    }
    const key = cdn + ":scrub";
    if (_scrubCache.has(key)) return _scrubCache.get(key);

    const task = (async () => {
      const direct = sampleDrawable(img, img.naturalWidth, img.naturalHeight, 480);
      if (direct) return { sample: direct, source: "display" };
      const viaProxy = await loadProbe(proxyUrl(cdn), true);
      if (viaProxy) {
        const sample = sampleDrawable(viaProxy, viaProxy.naturalWidth, viaProxy.naturalHeight, 480);
        if (sample) return { sample, source: "proxy" };
      }
      const viaCors = await loadProbe(cdn, true);
      if (viaCors) {
        const sample = sampleDrawable(viaCors, viaCors.naturalWidth, viaCors.naturalHeight, 480);
        if (sample) return { sample, source: "cors" };
      }
      return null;
    })();

    _scrubCache.set(key, task);
    return task;
  }

  function removeScrubCanvas(stack) {
    if (!stack) return;
    stack.querySelectorAll("canvas.qx-marks-scrub-canvas").forEach(c => c.remove());
  }

  function isOptContext(img) {
    return !!(img && img.closest && img.closest(".mtk-opt-text, .qx-prac-opt-text, .mtk-opt, .qa-opt, .qx-prac-opt"));
  }

  function ensureScrubCanvas(stack, rw, rh) {
    let canvas = stack.querySelector("canvas.qx-marks-scrub-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "qx-marks-scrub-canvas";
      canvas.setAttribute("aria-hidden", "true");
      const wm = stack.querySelector("canvas.qx-wm-canvas");
      if (wm) stack.insertBefore(canvas, wm);
      else stack.appendChild(canvas);
    }
    canvas.width = rw;
    canvas.height = rh;
    canvas.style.cssText = `position:absolute;top:0;left:0;width:${rw}px;height:${rh}px;z-index:5;pointer-events:none;`;
    return canvas;
  }

  function isSafeScrubPixel(r, g, b, a, inkDilated, idx) {
    if (inkDilated[idx]) return false;
    if (!isStrictMarksPixel(r, g, b, a)) return false;
    const avg = (r + g + b) / 3;
    if (avg < SCRUB_MIN_AVG) return false;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (chroma > 42 && avg < 205) return false;
    return true;
  }

  function buildScrubGrid(data, w, h, inkDilated) {
    const cols = 8;
    const rows = 8;
    const cw = w / cols;
    const ch = h / rows;
    const cellOk = new Uint8Array(cols * rows);
    let wmHeavy = 0;

    for (let ry = 0; ry < rows; ry++) {
      for (let cx = 0; cx < cols; cx++) {
        const x0 = Math.floor(cx * cw);
        const y0 = Math.floor(ry * ch);
        const x1 = Math.min(w, Math.ceil((cx + 1) * cw));
        const y1 = Math.min(h, Math.ceil((ry + 1) * ch));
        let ink = 0;
        let wm = 0;
        let scrub = 0;
        let total = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const idx = y * w + x;
            const i = idx * 4;
            total++;
            if (inkDilated[idx]) ink++;
            else if (isRemovableWm(data[i], data[i + 1], data[i + 2], data[i + 3])) wm++;
            if (isSafeScrubPixel(data[i], data[i + 1], data[i + 2], data[i + 3], inkDilated, idx)) scrub++;
          }
        }
        const inkR = ink / Math.max(total, 1);
        const wmR = wm / Math.max(total, 1);
        const scrubR = scrub / Math.max(total, 1);
        const centerCell = cx >= 2 && cx <= 5 && ry >= 2 && ry <= 5;
        const inkMax = centerCell ? 0.2 : 0.09;
        if (inkR < inkMax && (wmR > 0.035 || scrubR > 0.025)) {
          cellOk[ry * cols + cx] = 1;
          if (wmR > 0.08) wmHeavy++;
        }
      }
    }
    return { cellOk, cols, rows, cw, ch, wmHeavy };
  }

  function samplePaperColor(data, w, h) {
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let n = 0;
    const pts = [];
    for (let x = 0; x < w; x += Math.max(1, Math.floor(w / 12))) {
      pts.push([x, 1], [x, h - 2]);
    }
    for (let y = 0; y < h; y += Math.max(1, Math.floor(h / 12))) {
      pts.push([1, y], [w - 2, y]);
    }
    pts.push([2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3]);
    for (const [x, y] of pts) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const i = (y * w + x) * 4;
      if (isLikelyInk(data[i], data[i + 1], data[i + 2])) continue;
      sr += data[i];
      sg += data[i + 1];
      sb += data[i + 2];
      n++;
    }
    if (!n) return { r: 255, g: 255, b: 255, css: "rgb(255,255,255)" };
    const r = Math.round(sr / n);
    const g = Math.round(sg / n);
    const b = Math.round(sb / n);
    return { r, g, b, css: `rgb(${r},${g},${b})` };
  }

  function scrubFillColor(data, w, h) {
    const paper = samplePaperColor(data, w, h);
    const avg = (paper.r + paper.g + paper.b) / 3;
    if (avg >= 175) return paper.css;
    if (avg >= 128) return paper.css;
    return paper.css;
  }

  function isDiagonalWmBand(x, y, w, h) {
    const dx = x - w / 2;
    const dy = y - h / 2;
    const rot = (ROT_DEG * Math.PI) / 180;
    const across = -dx * Math.sin(rot) + dy * Math.cos(rot);
    const along = dx * Math.cos(rot) + dy * Math.sin(rot);
    const band = Math.min(w, h) * 0.24;
    const len = Math.sqrt(w * w + h * h) * 0.52;
    return Math.abs(across) < band && Math.abs(along) < len;
  }

  function isStainPixel(r, g, b, a) {
    if (a !== undefined && a < 6) return false;
    const avg = (r + g + b) / 3;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (isLikelyInk(r, g, b)) return false;
    if (chroma > 52) return false;
    return avg >= 148 && avg <= 248;
  }

  function isWmScrubPixel(r, g, b, a, inkDilated, idx) {
    if (inkDilated[idx]) return false;
    if (isSafeScrubPixel(r, g, b, a, inkDilated, idx)) return true;
    const avg = (r + g + b) / 3;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (isStainPixel(r, g, b, a)) return true;
    if (avg >= 105 && avg <= 252 && chroma < 62 && isRemovableWm(r, g, b, a)) return true;
    return false;
  }

  function parseZoneList(img) {
    const raw = img && img.dataset ? img.dataset.qxWmZones : "";
    const zones = String(raw || "").split(",").map(s => s.trim()).filter(Boolean);
    return zones.length ? zones : ["center", "br"];
  }

  function paintCornerMarksFallback(ctx, rw, rh, zones, fillCss) {
    if (!ctx || rw < 20 || rh < 20) return;
    const z = Array.isArray(zones) ? zones : [];
    ctx.save();
    ctx.fillStyle = fillCss || "rgb(255,255,255)";
    if (z.includes("br")) {
      const cw = Math.max(14, Math.round(rw * 0.18));
      const ch = Math.max(10, Math.round(rh * 0.12));
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(rw - cw, rh - ch, cw, ch, [6, 0, 0, 0]);
        ctx.fill();
      } else {
        ctx.fillRect(rw - cw, rh - ch, cw, ch);
      }
    }
    if (z.includes("center")) {
      const cw = Math.max(20, Math.round(rw * 0.55));
      const ch = Math.max(12, Math.round(rh * 0.24));
      ctx.fillRect(Math.round((rw - cw) / 2), Math.round((rh - ch) / 2), cw, ch);
    }
    if (z.includes("tr")) {
      const cw = Math.max(12, Math.round(rw * 0.14));
      const ch = Math.max(8, Math.round(rh * 0.1));
      ctx.fillRect(rw - cw, 0, cw, ch);
    }
    if (z.includes("bl")) {
      const cw = Math.max(12, Math.round(rw * 0.14));
      const ch = Math.max(8, Math.round(rh * 0.1));
      ctx.fillRect(0, rh - ch, cw, ch);
    }
    ctx.restore();
  }

  async function paintSafeMarksScrub(img, stack, rw, rh) {
    const canvas = ensureScrubCanvas(stack, rw, rh);
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.clearRect(0, 0, rw, rh);

    const zones = parseZoneList(img);
    const isOpt = isOptContext(img);
    const drawable = await loadScrubDrawable(img);
    const fillFallback = "rgb(255,255,255)";
    if (!drawable || !drawable.sample) {
      paintCornerMarksFallback(ctx, rw, rh, zones, fillFallback);
      return true;
    }

    const { data, w, h } = drawable.sample;
    const fillCss = scrubFillColor(data, w, h);
    const inkMask = buildInkMask(data, w, h);
    const inkDilated = dilateInkMask(inkMask, w, h, INK_DILATE);
    const grid = buildScrubGrid(data, w, h, inkDilated);
    const scrubMask = new Uint8Array(w * h);
    let scrubCount = 0;
    const total = w * h;
    const maxRatio = isOpt ? OPT_MAX_SCRUB_RATIO : MAX_SCRUB_RATIO;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const cx = Math.min(grid.cols - 1, Math.floor(x / grid.cw));
        const ry = Math.min(grid.rows - 1, Math.floor(y / grid.ch));
        const inCell = grid.cellOk[ry * grid.cols + cx];
        const inDiag = isDiagonalWmBand(x, y, w, h);
        if (!inCell && !inDiag) continue;
        const i = idx * 4;
        if (isWmScrubPixel(data[i], data[i + 1], data[i + 2], data[i + 3], inkDilated, idx)) {
          scrubMask[idx] = 1;
          scrubCount++;
        }
      }
    }

    const ratio = scrubCount / Math.max(total, 1);
    const sx = rw / w;
    const sy = rh / h;

    if (scrubCount >= 4 && ratio <= maxRatio) {
      ctx.fillStyle = fillCss;
      for (let dy = 0; dy < rh; dy++) {
        for (let dx = 0; dx < rw; dx++) {
          const sx_ = Math.min(w - 1, Math.floor(dx / sx));
          const sy_ = Math.min(h - 1, Math.floor(dy / sy));
          if (scrubMask[sy_ * w + sx_]) ctx.fillRect(dx, dy, 1, 1);
        }
      }
    }

    paintCornerMarksFallback(ctx, rw, rh, zones, fillCss);
    return true;
  }

  function analyzeInkGrid(drawable, nw, nh, cols, rows) {
    const sample = sampleDrawable(drawable, nw, nh, 320);
    if (!sample) return { offsetX: 0, offsetY: 0 };
    const { data, w, h } = sample;
    const cw = w / cols;
    const ch = h / rows;
    let blankSumX = 0, blankSumY = 0, blankW = 0;
    let wmSumX = 0, wmSumY = 0, wmW = 0;
    let inkSumX = 0, inkSumY = 0, inkW = 0;

    for (let ry = 0; ry < rows; ry++) {
      for (let cx = 0; cx < cols; cx++) {
        const x0 = Math.floor(cx * cw);
        const y0 = Math.floor(ry * ch);
        const x1 = Math.min(w, Math.ceil((cx + 1) * cw));
        const y1 = Math.min(h, Math.ceil((ry + 1) * ch));
        let ink = 0, wm = 0, total = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * w + x) * 4;
            total++;
            if (isLikelyInk(data[i], data[i + 1], data[i + 2])) ink++;
            else if (isRemovableWm(data[i], data[i + 1], data[i + 2], data[i + 3])) wm++;
          }
        }
        const inkR = ink / Math.max(total, 1);
        const wmR = wm / Math.max(total, 1);
        const cxMid = (x0 + x1) / 2 / w - 0.5;
        const cyMid = (y0 + y1) / 2 / h - 0.5;
        if (inkR > 0.08) { inkSumX += cxMid * inkR; inkSumY += cyMid * inkR; inkW += inkR; }
        if (inkR < 0.03) { blankSumX += cxMid; blankSumY += cyMid; blankW++; }
        if (wmR > 0.05) { wmSumX += cxMid * wmR; wmSumY += cyMid * wmR; wmW += wmR; }
      }
    }
    const blankBiasX = blankW ? blankSumX / blankW : 0;
    const blankBiasY = blankW ? blankSumY / blankW : 0;
    const wmBiasX = wmW ? wmSumX / wmW : 0;
    const wmBiasY = wmW ? wmSumY / wmW : 0;
    const contentX = inkW ? inkSumX / inkW : 0;
    const contentY = inkW ? inkSumY / inkW : 0;
    const clamp = v => Math.max(-0.14, Math.min(0.14, v));
    return {
      offsetX: clamp(wmBiasX * 0.5 + blankBiasX * 0.2 - contentX * 0.15),
      offsetY: clamp(wmBiasY * 0.5 + blankBiasY * 0.2 - contentY * 0.15)
    };
  }

  function zonesBias(zones, rw, rh) {
    const z = Array.isArray(zones) ? zones : [];
    let bx = 0, by = 0, n = 0;
    if (z.includes("center")) { n++; }
    if (z.includes("br")) { bx += 0.18; by += 0.18; n++; }
    if (z.includes("bl")) { bx -= 0.18; by += 0.18; n++; }
    if (z.includes("tr")) { bx += 0.18; by -= 0.18; n++; }
    if (z.includes("tl")) { bx -= 0.18; by -= 0.18; n++; }
    if (!n) return { x: 0, y: 0 };
    return { x: (bx / Math.max(n, 1)) * rw * 0.28, y: (by / Math.max(n, 1)) * rh * 0.28 };
  }

  function computeOffset(img, rw, rh) {
    const nw = img.naturalWidth || rw;
    const nh = img.naturalHeight || rh;
    const grid = analyzeInkGrid(img, nw, nh, 8, 8);
    const zones = String(img.dataset.qxWmZones || "center,br").split(",").map(s => s.trim());
    const zb = zonesBias(zones, rw, rh);
    return { x: grid.offsetX * rw * 0.35 + zb.x, y: grid.offsetY * rh * 0.35 + zb.y };
  }

  function analyzePlacementGrid(sample, cols, rows) {
    if (!sample) return null;
    const { data, w, h } = sample;
    const cw = w / cols;
    const ch = h / rows;
    const cells = [];
    let totalInk = 0;
    let total = 0;

    for (let ry = 0; ry < rows; ry++) {
      for (let cx = 0; cx < cols; cx++) {
        const x0 = Math.floor(cx * cw);
        const y0 = Math.floor(ry * ch);
        const x1 = Math.min(w, Math.ceil((cx + 1) * cw));
        const y1 = Math.min(h, Math.ceil((ry + 1) * ch));
        let ink = 0;
        let wm = 0;
        let n = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * w + x) * 4;
            n++;
            if (isLikelyInk(data[i], data[i + 1], data[i + 2])) ink++;
            else if (isRemovableWm(data[i], data[i + 1], data[i + 2], data[i + 3])) wm++;
          }
        }
        const inkR = ink / Math.max(n, 1);
        const wmR = wm / Math.max(n, 1);
        const blank = Math.max(0, 1 - inkR * 1.35 - wmR * 0.6);
        const cxMid = (x0 + x1) / 2 / w;
        const cyMid = (y0 + y1) / 2 / h;
        const centerCell = cx >= 3 && cx <= 6 && ry >= 3 && ry <= 6;
        const cornerCell = (cx <= 1 || cx >= cols - 2) && (ry <= 1 || ry >= rows - 2);
        cells.push({ cx, ry, inkR, wmR, blank, cxMid, cyMid, centerCell, cornerCell });
        totalInk += inkR;
        total++;
      }
    }

    const avgInk = totalInk / Math.max(total, 1);
    const sorted = [...cells].sort((a, b) => b.blank - a.blank);
    const best = sorted.find(c => c.inkR < 0.09) || sorted[0];
    const centerCells = cells.filter(c => c.centerCell);
    const centerInk = centerCells.reduce((s, c) => s + c.inkR, 0) / Math.max(centerCells.length, 1);
    const centerBlank = centerCells.reduce((s, c) => s + c.blank, 0) / Math.max(centerCells.length, 1);
    const cornerCells = cells.filter(c => c.cornerCell);
    const bestCorner = [...cornerCells].sort((a, b) => b.blank - a.blank)[0];

    return {
      cells,
      best,
      bestCorner,
      avgInk,
      centerInk,
      centerBlank,
      dense: avgInk > 0.17,
      fullPage: w * h > 220000
    };
  }

  function footprintInkRatio(sample, nx, ny, nfw, nfh) {
    if (!sample) return 1;
    const { data, w, h } = sample;
    const pad = 0.012;
    const x0 = Math.max(0, Math.floor((nx - nfw / 2 - pad) * w));
    const y0 = Math.max(0, Math.floor((ny - nfh / 2 - pad) * h));
    const x1 = Math.min(w, Math.ceil((nx + nfw / 2 + pad) * w));
    const y1 = Math.min(h, Math.ceil((ny + nfh / 2 + pad) * h));
    let ink = 0;
    let n = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * w + x) * 4;
        n++;
        if (isLikelyInk(data[i], data[i + 1], data[i + 2])) ink++;
      }
    }
    return ink / Math.max(n, 1);
  }

  function findLargestEmptyRegion(cells, cols, rows) {
    if (!cells || !cells.length) return null;
    const map = new Map();
    cells.forEach(c => map.set(`${c.cx},${c.ry}`, c));
    const visited = new Set();
    let best = null;

    for (const seed of cells) {
      if (seed.inkR >= 0.065) continue;
      const sk = `${seed.cx},${seed.ry}`;
      if (visited.has(sk)) continue;
      const region = [];
      const queue = [seed];
      visited.add(sk);
      while (queue.length) {
        const c = queue.shift();
        region.push(c);
        const neighbors = [
          [c.cx - 1, c.ry], [c.cx + 1, c.ry], [c.cx, c.ry - 1], [c.cx, c.ry + 1]
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const nk = `${nx},${ny}`;
          if (visited.has(nk)) continue;
          const nb = map.get(nk);
          if (!nb || nb.inkR >= 0.075) continue;
          visited.add(nk);
          queue.push(nb);
        }
      }
      if (!best || region.length > best.area) {
        const cxMid = region.reduce((s, c) => s + c.cxMid, 0) / region.length;
        const cyMid = region.reduce((s, c) => s + c.cyMid, 0) / region.length;
        const avgInk = region.reduce((s, c) => s + c.inkR, 0) / region.length;
        best = { cxMid, cyMid, area: region.length, avgInk };
      }
    }
    return best;
  }

  function logoAspect(logo) {
    return logo && logo.naturalWidth > 0 ? logo.naturalHeight / logo.naturalWidth : 1.25;
  }

  function placementMetrics(rw, rh, scale, logo, isOpt) {
    const s = isOpt ? Math.max(OPT_LOGO_SCALE, scale * 0.85) : scale;
    const lw = Math.max(20, rw * s);
    const aspect = logoAspect(logo);
    return { scale: s, lw, lh: lw * aspect, nfw: lw / rw, nfh: (lw * aspect) / rh };
  }

  function isSafePlacement(sample, nx, ny, metrics, maxInk) {
    if (!sample) return true;
    return footprintInkRatio(sample, nx, ny, metrics.nfw, metrics.nfh) <= maxInk;
  }

  function buildPlacement(mode, nx, ny, rw, rh, scale, opacity) {
    return { mode, x: rw * nx, y: rh * ny, nx, ny, scale, opacity };
  }

  function resolvePlacement(sample, rw, rh, isOpt, logo) {
    const grid = analyzePlacementGrid(sample, 12, 12);
    const dense = grid && grid.dense;
    const fullPage = grid && grid.fullPage;
    let scale = isOpt ? OPT_LOGO_SCALE : (fullPage ? LOGO_SCALE_MAX : LOGO_SCALE_MIN + 0.06);
    let opacity = dense ? LOGO_OPACITY_MIN : LOGO_OPACITY_MAX;
    if (dense) scale = Math.max(LOGO_SCALE_MIN, scale * 0.72);
    const metrics = placementMetrics(rw, rh, scale, logo, isOpt);
    const maxInk = dense ? 0.045 : 0.065;
    const candidates = [];

    if (grid && grid.centerInk < 0.045 && grid.centerBlank > 0.55) {
      candidates.push(buildPlacement("center", 0.5, 0.5, rw, rh, metrics.scale, opacity));
    }

    const largest = grid ? findLargestEmptyRegion(grid.cells, 12, 12) : null;
    if (largest && largest.avgInk < 0.06) {
      candidates.push(buildPlacement("region", largest.cxMid, largest.cyMid, rw, rh, metrics.scale, opacity));
    }

    if (grid && grid.best && grid.best.inkR < 0.08) {
      candidates.push(buildPlacement("region", grid.best.cxMid, grid.best.cyMid, rw, rh, metrics.scale, opacity));
    }

    if (grid && grid.bestCorner && grid.bestCorner.inkR < 0.065) {
      const c = grid.bestCorner;
      candidates.push(buildPlacement("corner", c.cxMid, c.cyMid, rw, rh, metrics.scale * 0.9, opacity));
    }

    for (const cand of candidates) {
      if (isSafePlacement(sample, cand.nx, cand.ny, metrics, maxInk)) return cand;
    }

    if (grid && grid.best && grid.best.inkR < 0.11) {
      const shrunk = buildPlacement("region", grid.best.cxMid, grid.best.cyMid, rw, rh, metrics.scale * 0.72, LOGO_OPACITY_MIN);
      if (isSafePlacement(sample, shrunk.nx, shrunk.ny, placementMetrics(rw, rh, shrunk.scale, logo, isOpt), maxInk + 0.02)) {
        return shrunk;
      }
    }

    return {
      mode: "fallback-diagonal",
      x: rw / 2,
      y: rh / 2,
      scale: isOpt ? metrics.scale * 0.8 : metrics.scale,
      opacity: Math.min(FALLBACK_OPACITY, opacity * 0.7),
      coverage: FALLBACK_COVERAGE
    };
  }

  function ensureBrandCanvas(stack, rw, rh) {
    let canvas = stack.querySelector("canvas.qx-premium-wm-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.className = "qx-premium-wm-canvas";
      canvas.setAttribute("aria-hidden", "true");
      stack.appendChild(canvas);
    }
    canvas.width = rw;
    canvas.height = rh;
    canvas.style.cssText = `position:absolute;top:0;left:0;width:${rw}px;height:${rh}px;z-index:12;pointer-events:none;opacity:1;`;
    return canvas;
  }

  function applyBlackQuantrexTextOverlay(stack, rw, rh) {
    // Disabled — remove any leftover Quantrex text seals
    if (!stack) return null;
    stack.querySelectorAll(".qx-quantrex-black-wm, .qx-quantrex-black-seal").forEach(el => el.remove());
    return null;
  }

  function applyBrandOverlayDom(stack, placement, rw, rh) {
    // Disabled — never stamp QUANTREX ACADEMY on figures
    if (!stack) return null;
    stack.querySelectorAll(
      "img.qx-quantrex-wm-overlay, .qx-quantrex-black-wm, .qx-quantrex-black-seal, canvas.qx-premium-wm-canvas, .qx-premium-wm-sheet"
    ).forEach(el => el.remove());
    return null;
  }

  function drawPlacedLogo() { /* permanently disabled — never stamp brand on figures */ }
  function drawFallbackDiagonal() { /* permanently disabled */ }
  function drawBrandOnContext() { /* permanently disabled */ }

  async function paintBrandWatermark(img, stack, rw, rh) {
    if (img) stripQuantrexBrand(img);
    return false;
  }

  function applyCoachingWmOverlay(stack, rw, rh, lw, opacity) {
    // No Quantrex brand on figures — keep neat clean diagrams only
    if (!stack) return null;
    stack.querySelectorAll("img.qx-coaching-wm, img.qx-quantrex-wm-overlay").forEach(el => el.remove());
    stack.classList.remove("qx-coaching-wm-active", "qx-quantrex-wm-active", "qx-brand-covered");
    return null;
  }

  function paintCoachingBrandLight(img) {
    if (img) stripQuantrexBrand(img);
    return Promise.resolve(false);
  }

  async function paintOrganicCoachingWatermark(img, stack, rw, rh) {
    if (img) stripQuantrexBrand(img);
    return false;
  }

  async function exportWatermarkedFigure(img) {
    // Return clean figure only — never bake QUANTREX watermark into PNG
    if (!img || img.naturalWidth < 12 || img.naturalHeight < 12) return null;
    try {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = nw;
      canvas.height = nh;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, nw, nh);
      return canvas.toDataURL("image/png");
    } catch (_) {
      return null;
    }
  }

  function parseZones(img) {
    const raw = img && img.dataset ? img.dataset.qxWmZones : "";
    const zones = String(raw || "center,br").split(",").map(s => s.trim()).filter(Boolean);
    return zones.length ? zones : ["center", "br"];
  }

  async function paintMarksScrub(img, stack, rw, rh) {
    if (!stack || rw < 12 || rh < 12) {
      removeScrubCanvas(stack);
      return;
    }
    await paintSafeMarksScrub(img, stack, rw, rh);
  }

  function prepareFigureStack(img) {
    if (!img || !img.isConnected) return null;
    const stack = img.closest(".qx-fig-inner") || img.parentElement;
    if (!stack) return null;
    const w = img.offsetWidth || img.clientWidth || 0;
    const h = img.offsetHeight || img.clientHeight || 0;
    if (w < 12 || h < 12) return null;
    const rw = Math.round(w);
    const rh = Math.round(h);
    stack.style.display = "inline-block";
    stack.style.width = `${rw}px`;
    stack.style.height = `${rh}px`;
    stack.style.maxWidth = "100%";
    stack.style.lineHeight = "0";
    return { stack, rw, rh };
  }

  /** Soft-strip algorithm version — bump forces re-clean of previously frozen figures */
  const SOFT_STRIP_VER = "20";

  /** True only for MARKS/Quizrr pool diagrams that carry baked watermarks */
  function figureNeedsMarksClean(img) {
    if (!img) return false;
    // Already cleaned with current algorithm
    if (img.dataset.qxSoftStrip === "2" && img.dataset.qxSoftVer === SOFT_STRIP_VER) return false;
    if (img.classList.contains("qx-marks-icon") || img.classList.contains("qx-exam-logo")
      || img.classList.contains("fc-img") || img.classList.contains("subj-ic-img")) {
      return false;
    }
    const src = String(img.dataset.qxOrigSrc || img.getAttribute("src") || "");
    // UI icons — never treat as pool figures
    if (/cdn-assets\.getmarks|app_assets\/img\/(exams|ui|cpyqb)\//i.test(src)) return false;
    if (/ic_content_exam_|formula_cards|ncert_toolbox/i.test(src)) return false;
    // Already-soft-stripped data URLs
    if (src.startsWith("data:image") && img.dataset.qxSoftVer === SOFT_STRIP_VER) return false;
    // Local alc-prep assets only
    if (/\/assets\/qx-figures\//i.test(src) || /qx-alc-prep|hcv-|qx-irodov/i.test(src)) return false;
    if (/\/assets\/diagrams\/org-src\//i.test(src)) return false;
    // EVERY structure figure needs MARKS wipe until softVer matches (organic color + pool + options)
    if (/\/assets\/diagrams\/qx-org-/i.test(src)
      || img.classList.contains("qx-org-fig")
      || img.classList.contains("qx-organic-fig")
      || img.classList.contains("qx-pool-fig")
      || img.classList.contains("qx-fig-img")
      || img.classList.contains("qx-opt-fig-img")
      || /cdn-question-pool|cdn\.quizrr|\/pyq\/|proxy-image|restore-image|getmarks/i.test(src)
      || img.dataset.qxHasWm === "1"
      || img.dataset.qxOrigSrc) {
      return true;
    }
    return false;
  }

  /**
   * PERMANENT MARKS wipe (all exams / options A–D):
   * Binary line-art kill — dark structure kept, ALL gray (incl. MARKS) → pure white.
   * Result is data: URL; src-lock must not overwrite it (fixed v11).
   */
  function softStripMarksPixels(img) {
    return new Promise(resolve => {
      if (!img || !img.isConnected || img.naturalWidth < 8 || img.naturalHeight < 8) {
        return resolve(false);
      }
      // Re-run if algorithm upgraded (old freeze left residual MARKS)
      if (img.dataset.qxSoftStrip === "2" && img.dataset.qxSoftVer === SOFT_STRIP_VER) {
        stripQuantrexBrand(img);
        return resolve(true);
      }
      try {
        const nw = img.naturalWidth;
        const nh = img.naturalHeight;
        const canvas = document.createElement("canvas");
        canvas.width = nw;
        canvas.height = nh;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(false);
        ctx.drawImage(img, 0, 0, nw, nh);
        let data;
        try {
          data = ctx.getImageData(0, 0, nw, nh);
        } catch (_) {
          try {
            const orig = String(img.dataset.qxOrigSrc || img.getAttribute("src") || "");
            if (
              img.dataset.qxProxyRetry !== "1" &&
              /cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(orig) &&
              typeof QxImgClean !== "undefined" &&
              QxImgClean.proxyImageUrl
            ) {
              img.dataset.qxProxyRetry = "1";
              if (!img.dataset.qxOrigSrc) img.dataset.qxOrigSrc = orig;
              img.crossOrigin = "anonymous";
              img.onload = () => {
                softStripMarksPixels(img).then(resolve);
              };
              img.onerror = () => resolve(false);
              img.src = QxImgClean.proxyImageUrl(img.dataset.qxOrigSrc);
              return;
            }
          } catch (__) { /* */ }
          return resolve(false);
        }
        const d = data.data;
        const totalPx = (d.length / 4) | 0;
        // v20: strong MARKS kill (screens 643/644 still showed watermark in tests).
        // Keep true dark structure + colour; bleach mid gray/blue haze hard.
        let inkBefore = 0;
        const INK_MAX = 100;
        const CHROMA_INK = 40;
        const core = new Uint8Array(totalPx);
        for (let p = 0, i = 0; i < d.length; i += 4, p++) {
          let r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
          if (a < 18) continue;
          if (a < 250) {
            const t = a / 255;
            r = Math.round(r * t + 255 * (1 - t));
            g = Math.round(g * t + 255 * (1 - t));
            b = Math.round(b * t + 255 * (1 - t));
          }
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const chroma = Math.max(r, g, b) - Math.min(r, g, b);
          if (lum <= INK_MAX) { core[p] = 1; inkBefore++; }
          else if (chroma >= CHROMA_INK && lum < 210) { core[p] = 1; inkBefore++; }
        }
        const inkMask = new Uint8Array(core);
        for (let y = 0; y < nh; y++) {
          for (let x = 0; x < nw; x++) {
            if (!core[y * nw + x]) continue;
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= nw || ny >= nh) continue;
                inkMask[ny * nw + nx] = 1;
              }
            }
          }
        }
        let stripped = 0;
        let inkAfter = 0;
        const out = new Uint8ClampedArray(d);
        for (let p = 0, i = 0; i < d.length; i += 4, p++) {
          let r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];
          if (a < 18) {
            out[i] = 255; out[i + 1] = 255; out[i + 2] = 255; out[i + 3] = 255;
            continue;
          }
          if (a < 250) {
            const t = a / 255;
            r = Math.round(r * t + 255 * (1 - t));
            g = Math.round(g * t + 255 * (1 - t));
            b = Math.round(b * t + 255 * (1 - t));
          }
          if (inkMask[p] === 1) {
            out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
            inkAfter++;
            continue;
          }
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const chroma = Math.max(r, g, b) - Math.min(r, g, b);
          const nearGray =
            Math.abs(r - g) < 55 && Math.abs(g - b) < 58 && Math.abs(r - b) < 60;
          const blueGray = b >= r - 10 && b >= g - 8 && chroma < 55;
          // Aggressive MARKS band (diagonal pale stamps)
          if ((nearGray || blueGray) && lum > 105 && lum < 248 && chroma < 58) {
            out[i] = 255; out[i + 1] = 255; out[i + 2] = 255; out[i + 3] = 255;
            stripped++;
          } else if (lum > 175 && chroma < 38) {
            out[i] = 255; out[i + 1] = 255; out[i + 2] = 255; out[i + 3] = 255;
            stripped++;
          } else {
            out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = 255;
            if (lum < 200) inkAfter++;
          }
        }
        if (inkBefore > 80 && inkAfter < inkBefore * 0.28) {
          img.dataset.qxSoftStrip = "2";
          img.dataset.qxSoftVer = SOFT_STRIP_VER;
          img.dataset.qxFigFrozen = "1";
          img.dataset.qxHasWm = "0";
          img.classList.add("qx-fig-ready", "qx-wm-clean", "qx-nowm");
          img.style.setProperty("opacity", "1", "important");
          img.style.setProperty("visibility", "visible", "important");
          img.style.setProperty("display", "block", "important");
          stripQuantrexBrand(img);
          return resolve(true);
        }
        for (let i = 0; i < d.length; i++) d[i] = out[i];
        ctx.putImageData(data, 0, 0);
        const url = canvas.toDataURL("image/png");
        const prev = img.getAttribute("src") || "";
        img.style.setProperty("opacity", "1", "important");
        img.style.setProperty("visibility", "visible", "important");
        const markClean = () => {
          img.dataset.qxSoftStrip = "2";
          img.dataset.qxSoftVer = SOFT_STRIP_VER;
          img.dataset.qxFigFrozen = "1";
          img.dataset.qxCleanedSrc = "1";
          img.dataset.qxColorClean = "1";
          img.dataset.qxHasWm = "0";
          img.dataset.qxWmClean = "1";
          img.dataset.qxCleaned = "1";
          img.dataset.qxRestoredSrc = "1";
          img.classList.add("qx-wm-clean", "qx-fig-ready", "qx-hq-color", "qx-nowm", "qx-cleaned");
          img.classList.remove("qx-hcv-ink", "qx-black-redraw", "qx-wm-loading");
          img.style.setProperty("opacity", "1", "important");
          img.style.setProperty("visibility", "visible", "important");
          img.style.setProperty("display", "block", "important");
          stripQuantrexBrand(img);
          try {
            if (window.QxNoWmGuard && window.QxNoWmGuard.stripCache) {
              const k = String(img.dataset.qxOrigSrc || prev || "").split("&v=")[0];
              if (k && url.startsWith("data:")) {
                window.QxNoWmGuard.stripCache.set(k, url);
                img.dataset.qxCacheVer = SOFT_STRIP_VER;
              }
            }
          } catch (_) { /* */ }
        };
        img.onload = () => {
          markClean();
          resolve(true);
        };
        img.onerror = () => {
          if (prev) img.src = prev;
          img.style.setProperty("opacity", "1", "important");
          resolve(false);
        };
        img.removeAttribute("crossorigin");
        if (img.src !== url) img.src = url;
        else {
          markClean();
          resolve(true);
        }
      } catch (_) {
        resolve(false);
      }
    });
  }

  function redrawFigureBlackInk(img) {
    return new Promise(async resolve => {
      if (!img || !img.isConnected) return resolve(false);
      stripQuantrexBrand(img);
      // Soft-strip already done — permanent freeze
      if (img.dataset.qxSoftStrip === "2") {
        img.classList.add("qx-fig-ready");
        img.dataset.qxFigFrozen = "1";
        return resolve(true);
      }
      if (!figureNeedsMarksClean(img)) {
        img.classList.add("qx-fig-ready");
        return resolve(false);
      }
      // Route raw CDN through clean same-origin proxy first
      try {
        const cur = String(img.getAttribute("src") || "");
        const orig = String(img.dataset.qxOrigSrc || cur);
        if (
          /cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(orig) &&
          !/cdn-assets\.getmarks/i.test(orig) &&
          !/data:image/i.test(cur) &&
          img.dataset.qxProxyDone !== "1" &&
          typeof QxImgClean !== "undefined" &&
          QxImgClean.proxyImageUrl
        ) {
          if (!img.dataset.qxOrigSrc) img.dataset.qxOrigSrc = orig;
          // Always re-point to same-origin proxy for CORS soft-strip
          if (!/proxy-image/i.test(cur) || (/proxy-image/i.test(cur) && !/v=20/.test(cur))) {
            img.dataset.qxProxyDone = "1";
            img.crossOrigin = "anonymous";
            await new Promise(r => {
              const done = () => r();
              img.addEventListener("load", done, { once: true });
              img.addEventListener("error", done, { once: true });
              img.src = QxImgClean.proxyImageUrl(img.dataset.qxOrigSrc || orig);
              if (img.complete && img.naturalWidth > 0) done();
            });
          } else {
            img.dataset.qxProxyDone = "1";
          }
        }
      } catch (_) { /* */ }
      // ALWAYS pixel-strip residual MARKS (proxy alone leaves watermark)
      const ok = await softStripMarksPixels(img);
      if (ok) img.dataset.qxFigFrozen = "1";
      resolve(ok);
    });
  }

  function stripQuantrexBrand(img) {
    if (!img) return;
    const stack = img.closest(
      ".qx-fig-inner, .qx-fig, .qx-opt-fig, .qx-diagram-slot, .qx-opt-diagram-slot, #qxDiagramSlot, .qx-pool-fig-wrap, .qx-fig-stack"
    ) || img.parentElement;
    if (stack) {
      stack.querySelectorAll(
        "canvas.qx-premium-wm-canvas, canvas.qx-marks-scrub-canvas, img.qx-quantrex-wm-overlay, img.qx-coaching-wm, " +
        ".qx-brand-overlay, .qx-quantrex-wm, .qx-quantrex-black-wm, .qx-quantrex-black-seal, " +
        ".qx-premium-wm-sheet, .qx-diag-watermark, .qx-wm-diagonal, .qx-wm-corner-badge, .qx-marks-strip, .qx-wm-mask"
      ).forEach(el => el.remove());
      stack.classList.remove(
        "qx-wm-canvas-active", "qx-quantrex-wm-active", "qx-premium-wm-active",
        "qx-coaching-wm-active", "qx-wm-active", "qx-brand-covered"
      );
    }
    delete img.dataset.qxQuantrexWm;
    delete img.dataset.qxWmOverlay;
    delete img.dataset.qxBrandWm;
    delete img.dataset.qxPremiumWm;
    img.classList.remove("qx-brand-wm");
  }

  /**
   * Gentle MARKS strip only — neat clean figures, no Quantrex brand stamp.
   */
  function paintMarksHideOnly(img) {
    if (!img || !img.isConnected) return Promise.resolve(false);
    stripQuantrexBrand(img);
    if (!figureNeedsMarksClean(img)) {
      img.classList.add("qx-fig-ready", "qx-wm-clean");
      img.dataset.qxHasWm = "0";
      img.dataset.qxWmClean = "1";
      img.style.setProperty("opacity", "1", "important");
      img.style.setProperty("visibility", "visible", "important");
      img.style.setProperty("display", "block", "important");
      return Promise.resolve(true);
    }
    // Always show figure while cleaning (beautiful in-page, no click needed)
    img.style.setProperty("opacity", "1", "important");
    img.style.setProperty("visibility", "visible", "important");
    img.style.setProperty("display", "block", "important");
    return redrawFigureBlackInk(img).then(ok => {
      if (ok) {
        img.classList.add("qx-fig-ready", "qx-wm-clean", "qx-hq-color", "qx-nowm", "qx-cleaned");
        img.classList.remove("qx-wm-loading", "qx-black-redraw");
        img.dataset.qxHasWm = "0";
        img.dataset.qxWmClean = "1";
        img.dataset.qxSoftStrip = "2";
        img.dataset.qxSoftVer = SOFT_STRIP_VER;
      } else {
        // Retry up to 3x via proxy (CORS) so MARKS never stays on screen
        const n = (parseInt(img.dataset.qxStripRetry || "0", 10) || 0) + 1;
        img.dataset.qxStripRetry = String(n);
        if (n <= 3) {
          setTimeout(() => paintMarksHideOnly(img), 280 * n);
        }
      }
      img.style.setProperty("opacity", "1", "important");
      img.style.setProperty("visibility", "visible", "important");
      img.style.setProperty("display", "block", "important");
      stripQuantrexBrand(img);
      return !!ok;
    });
  }

  function paintQuantrexBrand(img) {
    if (img) stripQuantrexBrand(img);
    return Promise.resolve(false);
  }

  function paintPremiumDiagonalWm(img) {
    return paintMarksHideOnly(img);
  }

  function premiumWatermarkHtml() {
    return "";
  }

  function nukeAllWatermarkDom(root) {
    const scope = root || document;
    try {
      // Remove MARKS chrome + all Quantrex stamps — figures stay plain clean
      scope.querySelectorAll(
        "canvas.qx-marks-scrub-canvas, canvas.qx-premium-wm-canvas, .qx-marks-strip, .qx-marks-scrub, .qx-wm-mask, " +
        ".qx-premium-wm-sheet, .qx-premium-wm-title, .qx-premium-wm-tag, .qx-premium-wm-logo, " +
        ".qx-wm-corner-badge, .qx-brand-overlay, .qx-diag-watermark, .qx-wm-diagonal, " +
        "img.qx-coaching-wm, img.qx-quantrex-wm-overlay, .qx-quantrex-black-wm, .qx-quantrex-black-seal, " +
        "img[src*='getmarks-brand'], img[alt*='Get Marks App'], img[src*='marks-premium'], img[src*='marks_selected'], " +
        "img[src*='quantrex-academy-brand'], img[src*='quantrex-watermark'], img[src*='quantrex-diag'], " +
        "img[src*='quantrex-fig-stamp'], img[src*='quantrex-fig-seal'], img[src*='quantrex-brand']"
      ).forEach(el => el.remove());
      // Absolute/fixed text seals ("MARKS", "QUANTREX ACADEMY") inside figure areas
      scope.querySelectorAll(
        ".qx-fig, .qx-opt-fig, .qx-fig-inner, .qx-diagram-slot, .qx-opt-diagram-slot, #qxDiagramSlot, " +
        ".qx-pool-fig-wrap, .mtk-q-text, .mtk-opt-text, .qx-prac-opt-text, .qx-content"
      ).forEach(box => {
        box.querySelectorAll("div, span, p, label, em, strong").forEach(el => {
          if (el.querySelector("img, canvas, mjx-container, .MathJax")) return;
          const t = (el.textContent || "").replace(/\s+/g, " ").trim();
          if (!t || t.length > 48) return;
          if (!/^(MARKS|Get\s*Marks|MARKS\s*App|Quizrr|QUANTREX(\s+ACADEMY)?|CONCEPTS\s+CREATE\s+DESTINY)$/i.test(t)
            && !/quantrex\s*academy/i.test(t)) return;
          const st = window.getComputedStyle ? getComputedStyle(el) : null;
          const pos = st && st.position;
          if (pos === "absolute" || pos === "fixed" || (st && parseFloat(st.opacity || "1") < 0.55)
            || el.className && /wm|watermark|brand|stamp|seal|overlay/i.test(String(el.className))) {
            el.remove();
          }
        });
      });
    } catch (_) { /* */ }
  }

  function repaintAll(root) {
    const scope = root || document;
    nukeAllWatermarkDom(scope);
    scope.querySelectorAll(
      "img.qx-pool-fig, img.qx-fig-img, img.qx-sol-fig, img.qx-no-wm, " +
      "img[src*='cdn-question-pool'], img[src*='/pyq/'], img[src*='cdn.quizrr'], " +
      "img[src*='proxy-image'], img[src*='/assets/qx-figures/'], img[src*='/assets/diagrams/'], " +
      "#qxDiagramSlot img, .qx-diagram-slot img, .qx-opt-diagram-slot img, " +
      ".sol-body img, .qx-sol-body img, .mtk-opt-text img, .qx-prac-opt-text img"
    ).forEach(img => {
      if (!img) return;
      if (img.classList.contains("qx-marks-icon") || img.classList.contains("qx-exam-logo") || img.classList.contains("fc-img")) return;
      img.style.setProperty("opacity", "1", "important");
      img.style.setProperty("visibility", "visible", "important");
      img.style.setProperty("display", "block", "important");
      stripQuantrexBrand(img);
      if (img.dataset.qxSoftStrip === "2") return;
      if (figureNeedsMarksClean(img) || img.classList.contains("qx-pool-fig") || /cdn-question-pool|\/pyq\/|proxy-image/i.test(img.getAttribute("src") || "")) {
        void paintMarksHideOnly(img);
      }
    });
  }

  function startThemeObserver() {
    if (themeObsStarted || typeof MutationObserver === "undefined") return;
    themeObsStarted = true;
    const obs = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.attributeName === "data-theme") {
          requestAnimationFrame(() => repaintAll(document));
          break;
        }
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  startThemeObserver();

  function scanAllFigures(root) {
    repaintAll(root || document);
  }

  if (typeof MutationObserver !== "undefined") {
    try {
      const killObs = new MutationObserver(() => {
        nukeAllWatermarkDom(document);
      });
      const startKill = () => {
        if (document.body) {
          killObs.observe(document.body, { childList: true, subtree: true });
          nukeAllWatermarkDom(document);
        }
      };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startKill);
      else startKill();
    } catch (_) { /* */ }
  }

  return {
    paintMarksHideOnly,
    paintPremiumDiagonalWm,
    paintQuantrexBrand,
    stripQuantrexBrand,
    paintBrandWatermark,
    paintOrganicCoachingWatermark,
    paintCoachingBrandLight,
    exportWatermarkedFigure,
    premiumWatermarkHtml,
    softStripMarksPixels,
    redrawFigureBlackInk,
    nukeAllWatermarkDom,
    analyzeInkGrid,
    resolvePlacement,
    isDarkTheme,
    repaintAll,
    scanAllFigures,
    ROT_DEG,
    TEXT_OPACITY,
    LOGO_OPACITY_MIN,
    LOGO_OPACITY_MAX
  };
})();