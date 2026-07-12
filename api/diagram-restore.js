// Server-side diagram restoration — remove watermarks/stains, preserve ink lines

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

function isStainPixel(r, g, b, a) {
  if (a !== undefined && a < 6) return false;
  const avg = (r + g + b) / 3;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  if (isLikelyInk(r, g, b)) return false;
  if (chroma > 50) return false;
  return avg >= 152 && avg <= 246;
}

function isArtifactPixel(r, g, b, a) {
  return isWatermarkPixel(r, g, b, a) || isMarksOverlay(r, g, b, a) || isStainPixel(r, g, b, a);
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
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (mask[ny * w + nx]) { dilated[idx] = 1; break; }
        }
        if (dilated[idx]) break;
      }
    }
  }
  return dilated;
}

function medianOf(arr) {
  if (!arr.length) return 255;
  const s = arr.slice().sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function localBgColor(data, w, h, x, y) {
  const samples = [];
  const rays = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]];
  for (const [sdx, sdy] of rays) {
    for (let step = 1; step <= 10; step++) {
      const nx = x + sdx * step, ny = y + sdy * step;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) break;
      const i = (ny * w + nx) * 4;
      if (isLikelyInk(data[i], data[i + 1], data[i + 2])) break;
      if (!isArtifactPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        samples.push([data[i], data[i + 1], data[i + 2]]);
        break;
      }
    }
  }
  if (samples.length >= 2) {
    const med = (ch) => {
      const arr = samples.map(p => p[ch]).sort((a, b) => a - b);
      return arr[Math.floor(arr.length / 2)];
    };
    return [med(0), med(1), med(2)];
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

function buildArtifactMask(data, w, h, inkMask) {
  const wm = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (inkMask[i]) continue;
    const pi = i * 4;
    if (isArtifactPixel(data[pi], data[pi + 1], data[pi + 2], data[pi + 3])) wm[i] = 1;
  }
  const out = new Uint8Array(wm);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!wm[y * w + x]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (!inkMask[ni]) out[ni] = 1;
        }
      }
    }
  }
  return out;
}

function inpaintMasked(data, w, h, wmMask, inkMask) {
  const remaining = new Uint8Array(wmMask);
  const known = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) known[i] = (!remaining[i] || inkMask[i]) ? 1 : 0;

  for (let pass = 0; pass < 32; pass++) {
    let any = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (!remaining[idx] || inkMask[idx]) continue;
        const rs = [], gs = [], bs = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const ni = ny * w + nx;
            if (!known[ni]) continue;
            const pi = ni * 4;
            rs.push(data[pi]); gs.push(data[pi + 1]); bs.push(data[pi + 2]);
          }
        }
        if (rs.length < 4) continue;
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
    data[pi] = data[pi + 1] = data[pi + 2] = 255;
    data[pi + 3] = 255;
  }
}

function scrubZone(data, w, h, inkMask, x0, x1, y0, y1) {
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = y * w + x;
      if (inkMask[idx]) continue;
      const i = idx * 4;
      if (isLikelyInk(data[i], data[i + 1], data[i + 2])) continue;
      if (isArtifactPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        paintBg(data, w, h, x, y);
        n++;
      }
    }
  }
  return n;
}

function restoreProfessional(data, w, h) {
  const inkMask = buildInkMask(data, w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (inkMask[idx]) continue;
      const i = idx * 4;
      const avg = pixelAvg(data, i);
      if (avg >= 232 || isArtifactPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        data[i] = data[i + 1] = data[i + 2] = 255;
        data[i + 3] = 255;
      }
    }
  }
}

function whitenBand(data, w, h, inkMask, x0, x1, y0, y1) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = y * w + x;
      if (inkMask[idx]) continue;
      const i = idx * 4;
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (isLikelyInk(data[i], data[i + 1], data[i + 2])) continue;
      if (isArtifactPixel(data[i], data[i + 1], data[i + 2], data[i + 3]) || (avg >= 100 && avg <= 250)) {
        data[i] = data[i + 1] = data[i + 2] = 255;
        data[i + 3] = 255;
      }
    }
  }
}

function restoreDiagramPixels(data, w, h) {
  const inkMask = buildInkMask(data, w, h);
  const mask = buildArtifactMask(data, w, h, inkMask);
  inpaintMasked(data, w, h, mask, inkMask);

  const ink2 = buildInkMask(data, w, h);
  scrubZone(data, w, h, ink2, Math.floor(w * 0.08), Math.ceil(w * 0.92), Math.floor(h * 0.08), Math.ceil(h * 0.92));
  whitenBand(data, w, h, buildInkMask(data, w, h), Math.floor(w * 0.08), Math.ceil(w * 0.92), Math.floor(h * 0.18), Math.ceil(h * 0.82));
  whitenBand(data, w, h, buildInkMask(data, w, h), Math.floor(w * 0.2), Math.ceil(w * 0.8), Math.floor(h * 0.3), Math.ceil(h * 0.7));
  scrubZone(data, w, h, buildInkMask(data, w, h), 0, Math.floor(w * 0.36), Math.floor(h * 0.68), h);
  scrubZone(data, w, h, buildInkMask(data, w, h), Math.floor(w * 0.64), w, Math.floor(h * 0.68), h);

  for (let pass = 0; pass < 4; pass++) {
    const ink3 = buildInkMask(data, w, h);
    const m2 = buildArtifactMask(data, w, h, ink3);
    inpaintMasked(data, w, h, m2, ink3);
  }

  restoreProfessional(data, w, h);
  return data;
}

module.exports = { restoreDiagramPixels, isLikelyInk, pixelAvg };