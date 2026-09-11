/**
 * Same-origin image proxy + MARKS wipe.
 * GET /api/proxy-image?url=<encoded>&clean=1
 * Student path never fetches getmarks.app — leftover CDN URLs remap to Firebase Storage.
 * Wipe still runs on owned copies (pale logo bleach, ink kept).
 */
const { ownedFigureUrl, isForeignHost, isCardArt, displaySrc } = require("../qx-owned-figures");

function cardArt(s) {
  if (typeof isCardArt === "function") return isCardArt(s);
  return /formula_cards|revision_flash_cards|another_formula_card/i.test(String(s || ""));
}

function poolFig(s) {
  return /cdn-question-pool\.getmarks|cdn\.quizrr|watermarked_images|\/pyq\/|AKCR2_|2026_modules|questions(?:%2F|\/)figs(?:%2F|\/)(?!irodov)/i.test(String(s || ""));
}

function marksCdnFromOwned(owned) {
  const s = String(owned || "");
  const m = s.match(/\/o\/([^?]+)/i);
  if (!m) return "";
  let decoded = m[1];
  try {
    decoded = decodeURIComponent(m[1]);
  } catch (_) { /* */ }
  const gm = decoded.match(/^questions\/figs\/getmarks-assets\/(.+)$/i);
  if (gm) return "https://cdn-assets.getmarks.app/" + gm[1];
  const alt = decoded.match(/^questions\/figs\/assets\/(.+)$/i);
  if (alt) return "https://cdn-assets.getmarks.app/" + alt[1];
  const quiz = decoded.match(/^questions\/figs\/quizrr\/(.+)$/i);
  if (quiz) return "https://cdn.quizrr.in/" + quiz[1];
  const eg = decoded.match(/^questions\/figs\/examgoal\/(.+)$/i);
  if (eg) return "https://" + eg[1];
  const iro = /^questions\/figs\/irodov\//i.test(decoded);
  if (iro) return "";
  const pool = decoded.match(/^questions\/figs\/(.+)$/i);
  if (pool) return "https://cdn-question-pool.getmarks.app/" + pool[1];
  return "";
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
      return res.status(204).end();
    }
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const raw = (req.query && (req.query.url || req.query.u)) || "";
    let target = String(Array.isArray(raw) ? raw[0] : raw || "").trim();
    // Query string is already decoded once. A second decodeURIComponent turns
    // Firebase object paths (`questions%2Ffigs%2F…`) into real slashes → Storage 404.
    if (/^https?%3A/i.test(target)) {
      try { target = decodeURIComponent(target); } catch (_) { /* keep */ }
    }
    if (!target) {
      return res.status(400).json({ error: "Missing url" });
    }

    if (/\/assets\/diagrams\/qx-(?:self|book|org)-/i.test(target) && typeof displaySrc === "function") {
      const mapped = displaySrc(target);
      if (mapped && mapped !== target) {
        if (/proxy-image|restore-image/i.test(mapped)) {
          try {
            const inner = new URL(mapped, "https://www.quantrexacademy.com").searchParams.get("url");
            if (inner) target = inner;
          } catch (_) { /* keep */ }
        } else {
          target = mapped;
        }
      }
    }

    // Relative site assets → absolute
    if (target.startsWith("/")) {
      const host =
        (req.headers && (req.headers["x-forwarded-host"] || req.headers.host)) ||
        "www.quantrexacademy.com";
      const proto =
        (req.headers && req.headers["x-forwarded-proto"]) || "https";
      target = `${proto}://${String(host).split(",")[0].trim()}${target}`;
    }

    target = String(target)
      .replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/")
      .replace(
        /https?:\/\/cdn-question-pool\.app\//gi,
        "https://cdn-question-pool.getmarks.app/"
      );

    // Leftover Marks/Quizrr URLs → Quantrex Firebase Storage (student never hits Marks).
    let foreignOrig = "";
    if (isForeignHost(target)) {
      foreignOrig = target;
      const owned = ownedFigureUrl(target);
      if (owned && /firebasestorage/i.test(owned)) {
        target = owned;
      } else if (process.env.MARKS_ADMIN_MIGRATE !== "1" && !cardArt(foreignOrig) && !poolFig(foreignOrig)) {
        return res.status(404).json({
          error: "Figure not on Quantrex storage",
          self: true
        });
      }
    }

    let host = "";
    try {
      host = new URL(target).hostname || "";
    } catch (_) {
      return res.status(400).json({ error: "Bad url" });
    }

    const adminMarks = process.env.MARKS_ADMIN_MIGRATE === "1";
    const cardFetch = cardArt(target) || cardArt(foreignOrig);
    const poolFetch = poolFig(target) || poolFig(foreignOrig);
    const okHost =
      /(^|\.)quantrexacademy\.com$/i.test(host) ||
      /(^|\.)vercel\.app$/i.test(host) ||
      host === "firebasestorage.googleapis.com" ||
      /(^|\.)firebasestorage\.app$/i.test(host) ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      ((adminMarks || cardFetch || poolFetch) && (/(^|\.)getmarks\.app$/i.test(host) || /(^|\.)quizrr\.in$/i.test(host) || /(^|\.)examgoal\.net$/i.test(host)));
    if (!okHost) {
      return res.status(403).json({ error: "Host not allowed" });
    }

    const wantFc =
      String((req.query && (req.query.fc || req.query.formula)) || "") === "1"
      || /(?:^|[?&])fc=1(?:&|$)/.test(String(req.url || ""))
      || cardFetch;
    const isIrodovFig = /\/irodov\/|qx-irodov-/i.test(target);
    const wantClean =
      !isIrodovFig
      && String((req.query && (req.query.clean || req.query.c)) || "1") !== "0"
      && (wantFc || !/app_assets\/img\/ui\//i.test(target));

    function headersFor(url) {
      let hname = "";
      try {
        hname = new URL(url).hostname || "";
      } catch (_) { /* */ }
      const h = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
      };
      if (/(^|\.)quizrr\.in$/i.test(hname)) {
        h.Referer = "https://www.quizrr.in/";
        h.Origin = "https://www.quizrr.in";
      } else if (/(^|\.)getmarks\.app$/i.test(hname)) {
        h.Referer = "https://www.quantrexacademy.com/";
      } else {
        h.Referer = "https://www.quantrexacademy.com/";
      }
      return h;
    }

    async function fetchImg(url) {
      return fetch(url, { headers: headersFor(url), redirect: "follow" });
    }

    let upstream = await fetchImg(target);

    if ((!upstream || !upstream.ok) && /getmarks-assets/i.test(target)) {
      const alt = target
        .replace("questions%2Ffigs%2Fgetmarks-assets%2F", "questions%2Ffigs%2Fassets%2F")
        .replace("questions/figs/getmarks-assets/", "questions/figs/assets/");
      if (alt !== target) {
        const altRes = await fetchImg(alt);
        if (altRes && altRes.ok) {
          upstream = altRes;
          target = alt;
        }
      }
    }

    if ((!upstream || !upstream.ok) && (cardFetch || poolFetch) && !isIrodovFig) {
      const marksUrl = (foreignOrig && /getmarks\.app|quizrr\.in/i.test(foreignOrig))
        ? foreignOrig
        : marksCdnFromOwned(target);
      if (marksUrl && marksUrl !== target) {
        const markRes = await fetchImg(marksUrl);
        if (markRes && markRes.ok) {
          upstream = markRes;
          target = marksUrl;
        }
      }
    }

    if (!upstream || !upstream.ok) {
      return res.status((upstream && upstream.status === 404) ? 404 : 502).json({
        error: "Upstream fetch failed",
        status: upstream ? upstream.status : 0
      });
    }

    const ctype = upstream.headers.get("content-type") || "image/png";
    let buf = Buffer.from(await upstream.arrayBuffer());
    if (!buf.length) {
      return res.status(502).json({ error: "Empty image" });
    }

    let outType = ctype;
    let cleaned = false;

    if (wantClean) {
      try {
        const sharp = require("sharp");
        const image = sharp(buf, { failOn: "none" }).rotate();
        const meta = await image.metadata();
        const w = meta.width || 0;
        const h = meta.height || 0;
        if (w >= 8 && h >= 8 && w * h <= 12e6) {
          const { data, info } = await image
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
          const d = data;
          const channels = info.channels || 4;
          const total = info.width * info.height;
          const w0 = info.width;
          const h0 = info.height;

          // Formula cards: tiled pale MARKS logo — wipe tiles, keep ink + highlighter
          if (wantFc) {
            const mark = new Uint8Array(total);
            for (let p = 0, i = 0; p < total; p++, i += channels) {
              const r = d[i];
              const g = d[i + 1];
              const b = d[i + 2];
              const a = channels > 3 ? d[i + 3] : 255;
              if (a < 10) continue;
              const lum = 0.299 * r + 0.587 * g + 0.114 * b;
              if (lum <= 72) continue;
              const mx = r > g ? (r > b ? r : b) : (g > b ? g : b);
              const mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
              const chroma = mx - mn;
              const paleGrey = chroma < 64 && lum > 100 && lum < 254.8;
              const midGreyWm = chroma < 34 && lum > 78 && lum < 232;
              const paleCyan = b > r + 1 && lum > 120 && lum < 254.8 && chroma < 145 && (g + b) > r + 28;
              const blueGreyWm = chroma < 52 && b >= r - 2 && lum > 100 && lum < 246 && (b - r) < 48;
              const yellowBlue = r > 190 && g > 192 && b > 150 && b < 235
                && (r - b) < 58 && (g - r) > -16 && chroma < 90 && lum > 165;
              const paleYellow = lum > 186 && r > 208 && g > 196 && b > 130 && b < 240
                && (r - b) >= 10 && (r - b) < 110
                && Math.abs(r - g) < 40
                && chroma > 8 && chroma < 100;
              const cream = lum > 210 && r > 220 && g > 216 && b > 190 && chroma > 2 && chroma < 40;
              if (paleGrey || midGreyWm || paleCyan || blueGreyWm || yellowBlue || paleYellow || cream) mark[p] = 1;
            }
            const dil = new Uint8Array(total);
            for (let y = 0; y < h0; y++) {
              for (let x = 0; x < w0; x++) {
                const p = y * w0 + x;
                if (!mark[p]) continue;
                for (let dy = -2; dy <= 2; dy++) {
                  for (let dx = -2; dx <= 2; dx++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= w0 || ny >= h0) continue;
                    const np = ny * w0 + nx;
                    const i = np * channels;
                    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                    if (lum > 76) dil[np] = 1;
                  }
                }
              }
            }
            const bs = 24;
            const cols = Math.ceil(w0 / bs);
            const rows = Math.ceil(h0 / bs);
            const blockY = new Uint8Array(cols * rows);
            for (let by = 0; by < rows; by++) {
              for (let bx = 0; bx < cols; bx++) {
                let paper = 0;
                let yHits = 0;
                const y0 = by * bs;
                const x0 = bx * bs;
                const y1 = y0 + bs > h0 ? h0 : y0 + bs;
                const x1 = x0 + bs > w0 ? w0 : x0 + bs;
                for (let y = y0; y < y1; y++) {
                  for (let x = x0; x < x1; x++) {
                    const i = (y * w0 + x) * channels;
                    const r = d[i];
                    const g = d[i + 1];
                    const b = d[i + 2];
                    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                    if (lum < 175) continue;
                    paper++;
                    if (r > 190 && g > 180 && b < 215 && (r + g) > (2 * b + 24) && (r - b) > 28) yHits++;
                  }
                }
                if (paper > 18 && yHits * 2 > paper) blockY[by * cols + bx] = 1;
              }
            }
            for (let p = 0, i = 0; p < total; p++, i += channels) {
              if (!dil[p] && !mark[p]) continue;
              const x = p % w0;
              const y = (p / w0) | 0;
              const keepYellow = blockY[((y / bs) | 0) * cols + ((x / bs) | 0)] === 1;
              const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
              if (lum <= 72) continue;
              d[i] = keepYellow ? 252 : 255;
              d[i + 1] = keepYellow ? 249 : 255;
              d[i + 2] = keepYellow ? 196 : 255;
              if (channels > 3) d[i + 3] = 255;
            }
            buf = await sharp(d, {
              raw: { width: info.width, height: info.height, channels }
            })
              .png({ compressionLevel: 4, effort: 2 })
              .toBuffer();
            outType = "image/png";
            cleaned = true;
          } else {
          // Marks / GetMarks pale tiled logo + haze. Never eat dark ink (lum <= 168).
          const mark = new Uint8Array(total);
          const cw = Math.max(8, (w0 * 0.18) | 0);
          const ch = Math.max(8, (h0 * 0.16) | 0);
          for (let p = 0, i = 0; p < total; p++, i += channels) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            const a = channels > 3 ? d[i + 3] : 255;
            if (a < 10) continue;
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            if (lum <= 168) continue;
            const mx = r > g ? (r > b ? r : b) : (g > b ? g : b);
            const mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
            const chroma = mx - mn;
            const paleCyan = b >= r && b >= g - 4 && lum > 188 && lum < 254 && chroma < 90 && (b - r) >= 2;
            const paleGrey = chroma <= 22 && lum > 198 && lum < 252;
            const paleBlueGrey = b > r + 4 && chroma < 55 && lum > 185 && lum < 250;
            const x = p % w0;
            const y = (p / w0) | 0;
            const inCorner = (x < cw || x >= w0 - cw) && (y < ch || y >= h0 - ch);
            const cornerLogo = inCorner && lum > 160 && lum < 245 && chroma < 80
              && (b >= g - 8) && !(r > 210 && g > 80 && g < 170 && b < 90);
            if (paleCyan || paleGrey || paleBlueGrey || cornerLogo) mark[p] = 1;
          }
          const dil = new Uint8Array(total);
          for (let y = 0; y < h0; y++) {
            for (let x = 0; x < w0; x++) {
              const p = y * w0 + x;
              if (!mark[p]) continue;
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx < 0 || ny < 0 || nx >= w0 || ny >= h0) continue;
                  const np = ny * w0 + nx;
                  const i = np * channels;
                  const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                  if (lum > 180) dil[np] = 1;
                }
              }
            }
          }
          for (let p = 0, i = 0; p < total; p++, i += channels) {
            if (!dil[p]) continue;
            d[i] = 255;
            d[i + 1] = 255;
            d[i + 2] = 255;
            if (channels > 3) d[i + 3] = 255;
          }
          buf = await sharp(d, {
            raw: { width: info.width, height: info.height, channels }
          })
            .png({ compressionLevel: 4, effort: 2 })
            .toBuffer();
          outType = "image/png";
          cleaned = true;
          } // end !wantFc
        }
      } catch (cleanErr) {
        console.error("proxy-image clean", cleanErr && cleanErr.message);
      }
    }

    res.setHeader("Content-Type", outType);
    res.setHeader(
      "Cache-Control",
      "public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=31536000"
    );
    res.setHeader(
      "CDN-Cache-Control",
      "public, max-age=2592000, stale-while-revalidate=31536000"
    );
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Qx-Proxy", "1");
    res.setHeader("X-Qx-Clean", cleaned ? "1" : "0");
    res.setHeader("X-Qx-Clean-Ver", "qxfig110");
    return res.status(200).send(buf);
  } catch (err) {
    console.error("proxy-image", err && err.message);
    return res.status(500).json({ error: "Proxy failed" });
  }
};
