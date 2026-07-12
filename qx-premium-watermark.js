// Quantrex Academy — premium diagonal watermark + pixel-precise MARKS hide
window.QxPremiumWM = (() => {
  const LOGO_SRC = "/assets/quantrex-academy-brand.png";
  const LOGO_FALLBACK = "/assets/quantrex-academy-brand.svg";
  const LOGO_FALLBACK2 = "/assets/quantrex-premium-logo.png";
  const PROXY_BASE = (typeof QUANTREX_STACK !== "undefined" && QUANTREX_STACK.frontend && QUANTREX_STACK.frontend.url)
    ? QUANTREX_STACK.frontend.url.replace(/\/$/, "")
    : "https://quantrexacademy-lemon.vercel.app";
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
  let themeObsStarted = false;
  const _scrubCache = new Map();

  function isDarkTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  function themePalette() {
    if (isDarkTheme()) {
      return {
        primary: "rgba(248,250,252,0.9)",
        accent: "rgba(203,213,225,0.75)",
        gold: "rgba(234,179,8,0.7)",
        shadow: "rgba(15,23,42,0.2)",
        glow: false
      };
    }
    return {
      primary: "rgba(51,65,85,0.88)",
      accent: "rgba(100,116,139,0.8)",
      gold: "rgba(180,134,11,0.75)",
      shadow: "rgba(15,23,42,0.12)",
      glow: false
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
    const base = (location.origin && location.origin.includes("vercel.app")) ? location.origin : PROXY_BASE;
    const fixed = String(cdn || "").replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/");
    return `${base}/api/proxy-image?url=${encodeURIComponent(fixed)}`;
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

  function applyBrandOverlayDom(stack, placement, rw, rh) {
    if (!stack || !placement || rw < 12 || rh < 12) return null;
    let el = stack.querySelector("img.qx-quantrex-wm-overlay");
    if (!el) {
      el = document.createElement("img");
      el.className = "qx-quantrex-wm-overlay";
      el.alt = "";
      el.decoding = "async";
      el.draggable = false;
      el.setAttribute("aria-hidden", "true");
      el.setAttribute("referrerpolicy", "no-referrer");
      stack.appendChild(el);
    }
    if (el.getAttribute("src") !== LOGO_SRC) el.src = LOGO_SRC;
    const aspect = logoImg && logoImg.naturalWidth > 0 ? logoImg.naturalHeight / logoImg.naturalWidth : 1.25;
    const lw = Math.max(52, Math.round(rw * (placement.scale || LOGO_SCALE_MIN)));
    const lh = Math.round(lw * aspect);
    const opacity = placement.opacity || LOGO_OPACITY_MAX;
    let left = placement.x;
    let top = placement.y;
    let transform = "translate(-50%,-50%)";
    if (placement.mode === "fallback-diagonal") {
      left = rw / 2;
      top = rh / 2;
      transform = `translate(-50%,-50%) rotate(${ROT_DEG}deg)`;
      el.style.width = `${Math.max(64, Math.round(Math.sqrt(rw * rw + rh * rh) * 0.34))}px`;
    } else {
      el.style.width = `${lw}px`;
    }
    el.style.cssText = [
      "position:absolute",
      `left:${left}px`,
      `top:${top}px`,
      `width:${placement.mode === "fallback-diagonal" ? el.style.width : lw + "px"}`,
      "height:auto",
      `opacity:${opacity}`,
      `transform:${transform}`,
      "z-index:15",
      "pointer-events:none",
      "display:block",
      "visibility:visible"
    ].join(";");
    el.dataset.qxWmMode = placement.mode || "region";
    return el;
  }

  function drawPlacedLogo(ctx, rw, rh, logo, placement) {
    if (!ctx || !placement) return;
    const aspect = logo && logo.naturalWidth > 0 ? logo.naturalHeight / logo.naturalWidth : 1.25;
    const lw = Math.max(24, rw * placement.scale);
    const lh = lw * aspect;
    ctx.save();
    ctx.globalAlpha = placement.opacity;
    ctx.globalCompositeOperation = "multiply";
    if (logo && logo.naturalWidth > 0) {
      ctx.drawImage(logo, placement.x - lw / 2, placement.y - lh / 2, lw, lh);
    } else {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(30,79,255,0.85)";
      ctx.font = `700 ${Math.max(10, lw * 0.12)}px Kanit, Inter, sans-serif`;
      ctx.fillText("QUANTREX", placement.x, placement.y - lh * 0.08);
      ctx.fillStyle = "rgba(17,24,39,0.85)";
      ctx.font = `600 ${Math.max(8, lw * 0.07)}px Kanit, Inter, sans-serif`;
      ctx.fillText("ACADEMY", placement.x, placement.y + lh * 0.08);
    }
    ctx.restore();
  }

  function drawFallbackDiagonal(ctx, rw, rh, logo, placement) {
    if (!ctx) return;
    const diag = Math.sqrt(rw * rw + rh * rh);
    const cov = placement && placement.coverage ? placement.coverage : FALLBACK_COVERAGE;
    const lw = Math.max(28, diag * cov * 0.42);
    const aspect = logo && logo.naturalWidth > 0 ? logo.naturalHeight / logo.naturalWidth : 1.25;
    const lh = lw * aspect;
    const opacity = placement && placement.opacity ? placement.opacity : FALLBACK_OPACITY;
    ctx.save();
    ctx.translate(rw / 2, rh / 2);
    ctx.rotate((ROT_DEG * Math.PI) / 180);
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = "multiply";
    if (logo && logo.naturalWidth > 0) {
      ctx.drawImage(logo, -lw / 2, -lh / 2, lw, lh);
    } else {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(51,65,85,0.75)";
      ctx.font = `700 ${Math.max(12, lw * 0.09)}px Kanit, Inter, sans-serif`;
      ctx.fillText("QUANTREX ACADEMY", 0, 0);
      ctx.font = `600 ${Math.max(8, lw * 0.04)}px Kanit, Inter, sans-serif`;
      ctx.fillText("CONCEPTS CREATE DESTINY", 0, lw * 0.08);
    }
    ctx.restore();
  }

  function drawBrandOnContext(ctx, rw, rh, logo, placement) {
    if (!ctx || !placement) return;
    if (placement.mode === "fallback-diagonal") drawFallbackDiagonal(ctx, rw, rh, logo, placement);
    else drawPlacedLogo(ctx, rw, rh, logo, placement);
  }

  async function paintBrandWatermark(img, stack, rw, rh) {
    if (!img || !stack || rw < 12 || rh < 12) return false;
    const isOpt = isOptContext(img);
    const drawable = await loadScrubDrawable(img);
    const canvas = ensureBrandCanvas(stack, rw, rh);
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.clearRect(0, 0, rw, rh);
    return new Promise(resolve => {
      ensureLogo(logo => {
        if (!img.isConnected) return resolve(false);
        const placement = resolvePlacement(drawable && drawable.sample, rw, rh, isOpt, logo);
        drawBrandOnContext(ctx, rw, rh, logo, placement);
        applyBrandOverlayDom(stack, placement, rw, rh);
        stack.classList.add("qx-wm-canvas-active", "qx-quantrex-wm-active", "qx-premium-wm-active");
        img.dataset.qxQuantrexWm = "1";
        img.dataset.qxWmOverlay = "1";
        resolve(true);
      });
    });
  }

  async function exportWatermarkedFigure(img) {
    if (!img || img.naturalWidth < 12 || img.naturalHeight < 12) return null;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = nw;
    canvas.height = nh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, nw, nh);
    const isOpt = isOptContext(img);
    const drawable = await loadScrubDrawable(img);
    return new Promise(resolve => {
      ensureLogo(logo => {
        const placement = resolvePlacement(drawable && drawable.sample, nw, nh, isOpt, logo);
        drawBrandOnContext(ctx, nw, nh, logo, placement);
        try {
          resolve(canvas.toDataURL("image/png"));
        } catch (_) {
          resolve(null);
        }
      });
    });
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

  async function paintQuantrexBrand(img) {
    if (!img || !img.isConnected) return false;
    const prep = prepareFigureStack(img);
    if (!prep) return false;
    const { stack, rw, rh } = prep;
    if (img.dataset.qxHasWm === "1") await paintMarksScrub(img, stack, rw, rh);
    const branded = await paintBrandWatermark(img, stack, rw, rh);
    if (!img.isConnected) return false;
    stack.classList.add("qx-wm-active", "qx-premium-wm-active", "qx-brand-covered", "qx-fig-ready");
    if (img.dataset.qxHasWm === "1") stack.classList.add("qx-marks-hidden");
    img.classList.add("qx-fig-ready", "qx-brand-wm");
    img.classList.remove("qx-wm-loading");
    img.dataset.qxPremiumWm = "1";
    img.dataset.qxBrandWm = "1";
    return branded;
  }

  function paintMarksHideOnly(img) {
    return paintQuantrexBrand(img);
  }

  function paintPremiumDiagonalWm(img) {
    return paintQuantrexBrand(img);
  }

  function premiumWatermarkHtml() {
    const dark = isDarkTheme();
    const themeCls = dark ? "qx-premium-wm--dark" : "qx-premium-wm--light";
    return [
      `<div class="qx-brand-overlay qx-quantrex-wm ${themeCls}" aria-hidden="true">`,
      `<img class="qx-premium-wm-logo" src="${LOGO_SRC}" alt="" decoding="async" draggable="false">`,
      `</div>`
    ].join("");
  }

  function repaintAll(root) {
    const scope = root || document;
    scope.querySelectorAll("img.qx-pool-fig, img.qx-fig-img").forEach(img => {
      if (img.naturalWidth > 0 || img.offsetWidth > 12) void paintQuantrexBrand(img);
    });
    scope.querySelectorAll(".qx-premium-wm-sheet").forEach(el => {
      el.classList.toggle("qx-premium-wm--dark", isDarkTheme());
      el.classList.toggle("qx-premium-wm--light", !isDarkTheme());
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

  function isPoolFigure(img) {
    if (!img || img.tagName !== "IMG") return false;
    if (img.classList.contains("qx-marks-icon") || img.classList.contains("fc-img")) return false;
    const src = img.getAttribute("src") || img.dataset.qxOrigSrc || "";
    return img.classList.contains("qx-pool-fig")
      || img.classList.contains("qx-fig-img")
      || /cdn-question-pool|\/pyq\/|\/cbse\/|ap_eamcet/i.test(src);
  }

  function scanAllFigures(root) {
    const scope = root || document;
    scope.querySelectorAll("img.qx-pool-fig, img.qx-fig-img, #qxDiagramSlot img, .qx-diagram-slot img, .qx-opt-fig img").forEach(img => {
      if (!isPoolFigure(img)) return;
      if (img.naturalWidth > 12 || img.offsetWidth > 24) void paintQuantrexBrand(img);
    });
  }

  let brandGuardStarted = false;
  function startBrandGuardian() {
    if (brandGuardStarted) return;
    brandGuardStarted = true;
    document.addEventListener("load", (e) => {
      const t = e.target;
      if (t && t.tagName === "IMG" && isPoolFigure(t)) void paintQuantrexBrand(t);
    }, true);
    if (typeof MutationObserver !== "undefined") {
      let pending = false;
      const obs = new MutationObserver(() => {
        if (pending) return;
        pending = true;
        requestAnimationFrame(() => {
          pending = false;
          scanAllFigures(document);
        });
      });
      const boot = () => {
        if (!document.body) return;
        obs.observe(document.body, { childList: true, subtree: true });
        scanAllFigures(document);
        setTimeout(() => scanAllFigures(document), 800);
        setTimeout(() => scanAllFigures(document), 2500);
      };
      if (document.body) boot();
      else document.addEventListener("DOMContentLoaded", boot);
    }
  }

  startBrandGuardian();

  return {
    paintMarksHideOnly,
    paintPremiumDiagonalWm,
    paintQuantrexBrand,
    paintBrandWatermark,
    exportWatermarkedFigure,
    premiumWatermarkHtml,
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