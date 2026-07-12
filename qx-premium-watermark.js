// Quantrex Academy — premium diagonal watermark + pixel-precise MARKS hide
window.QxPremiumWM = (() => {
  const LOGO_SRC = "/assets/quantrex-premium-logo.png";
  const LOGO_FALLBACK = "/assets/quantrex-brand-badge.png";
  const PROXY_BASE = (typeof QUANTREX_STACK !== "undefined" && QUANTREX_STACK.frontend && QUANTREX_STACK.frontend.url)
    ? QUANTREX_STACK.frontend.url.replace(/\/$/, "")
    : "https://quantrexacademy-lemon.vercel.app";
  const ROT_DEG = -25;
  const TEXT_OPACITY = 0.11;
  const TAG_OPACITY = 0.09;
  const LOGO_OPACITY = 0.035;
  const COVERAGE = 0.44;
  const LOGO_SCALE = 0.14;
  const OPT_LOGO_SCALE = 0.08;
  const MAX_SCRUB_RATIO = 0.11;
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
      fb.onerror = () => cb(null);
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
    const cdn = img.dataset.qxOrigSrc || img.getAttribute("src") || "";
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
    if (!z.includes("br")) return;
    const cw = Math.max(14, Math.round(rw * 0.16));
    const ch = Math.max(10, Math.round(rh * 0.11));
    ctx.save();
    ctx.fillStyle = fillCss || "rgb(255,255,255)";
    if (z.includes("br")) {
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(rw - cw, rh - ch, cw, ch, [6, 0, 0, 0]);
        ctx.fill();
      } else {
        ctx.fillRect(rw - cw, rh - ch, cw, ch);
      }
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

  function drawPremiumWm(ctx, rw, rh, offset, logo, palette, isOpt) {
    const diag = Math.sqrt(rw * rw + rh * rh);
    const baseW = diag * (isOpt ? COVERAGE * 0.72 : COVERAGE);
    ctx.save();
    ctx.translate(rw / 2 + offset.x, rh / 2 + offset.y);
    ctx.rotate((ROT_DEG * Math.PI) / 180);

    const titleSize = Math.max(11, Math.round(baseW * (isOpt ? 0.078 : 0.085)));
    const tagSize = Math.max(7, Math.round(baseW * (isOpt ? 0.028 : 0.032)));

    if (logo && !isOpt) {
      const logoSize = baseW * LOGO_SCALE;
      ctx.globalAlpha = LOGO_OPACITY;
      ctx.drawImage(logo, -logoSize / 2, -titleSize * 0.55, logoSize, logoSize);
    } else if (logo && isOpt) {
      const logoSize = baseW * OPT_LOGO_SCALE;
      ctx.globalAlpha = LOGO_OPACITY * 0.85;
      ctx.drawImage(logo, -logoSize / 2, -titleSize * 0.5, logoSize, logoSize);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = palette.shadow;
    ctx.shadowBlur = palette.glow ? 4 : 2;

    const grad = ctx.createLinearGradient(-baseW / 2, 0, baseW / 2, 0);
    grad.addColorStop(0, palette.primary);
    grad.addColorStop(0.5, palette.accent);
    grad.addColorStop(1, palette.gold);
    ctx.fillStyle = grad;

    ctx.globalAlpha = TEXT_OPACITY;
    ctx.font = `700 ${titleSize}px Kanit, Inter, sans-serif`;
    ctx.fillText("QUANTREX ACADEMY", 0, -baseW * 0.02);

    ctx.globalAlpha = TAG_OPACITY;
    ctx.font = `600 ${tagSize}px Kanit, Inter, sans-serif`;
    ctx.fillText("CONCEPTS CREATE DESTINY", 0, titleSize * 0.9);

    ctx.shadowBlur = 0;
    ctx.restore();
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

  function paintMarksHideOnly(img) {
    if (!img || !img.isConnected || img.dataset.qxHasWm !== "1") return false;
    const stack = img.closest(".qx-fig-inner") || img.parentElement;
    if (!stack) return false;
    const w = img.offsetWidth || img.clientWidth || 0;
    const h = img.offsetHeight || img.clientHeight || 0;
    if (w < 12 || h < 12) return false;

    const rw = Math.round(w);
    const rh = Math.round(h);
    stack.style.display = "inline-block";
    stack.style.width = `${rw}px`;
    stack.style.height = `${rh}px`;
    stack.style.maxWidth = "100%";
    stack.style.lineHeight = "0";
    stack.querySelectorAll("canvas.qx-wm-canvas, canvas.qx-premium-wm-canvas").forEach(c => c.remove());
    stack.classList.remove("qx-wm-canvas-active");

    return paintMarksScrub(img, stack, rw, rh).then(() => {
      if (!img.isConnected) return false;
      stack.classList.add("qx-wm-active", "qx-premium-wm-active", "qx-marks-hidden", "qx-fig-ready");
      img.classList.add("qx-fig-ready");
      img.classList.remove("qx-wm-loading");
      img.dataset.qxPremiumWm = "1";
      return true;
    });
  }

  function paintPremiumDiagonalWm(img) {
    return paintMarksHideOnly(img);
  }

  function premiumWatermarkHtml() {
    const dark = isDarkTheme();
    const themeCls = dark ? "qx-premium-wm--dark" : "qx-premium-wm--light";
    return [
      `<div class="qx-premium-wm-sheet qx-wm-diagonal ${themeCls}" aria-hidden="true">`,
      `<span class="qx-premium-wm-title">QUANTREX ACADEMY</span>`,
      `<span class="qx-premium-wm-tag">CONCEPTS CREATE DESTINY</span>`,
      `</div>`
    ].join("");
  }

  function repaintAll(root) {
    const scope = root || document;
    scope.querySelectorAll("img.qx-pool-fig").forEach(img => {
      if (img.dataset.qxHasWm === "1") paintMarksHideOnly(img);
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

  return {
    paintMarksHideOnly,
    paintPremiumDiagonalWm,
    premiumWatermarkHtml,
    analyzeInkGrid,
    isDarkTheme,
    repaintAll,
    ROT_DEG,
    TEXT_OPACITY,
    LOGO_OPACITY
  };
})();