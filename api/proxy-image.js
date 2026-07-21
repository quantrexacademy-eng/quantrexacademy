/**
 * Same-origin image proxy for Marks/Quizrr pool diagrams.
 * GET /api/proxy-image?url=<encoded>&clean=1
 * When clean=1: server-side MARKS pixel wipe (sharp) so watermarks never reach the browser.
 */
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
    let target = "";
    try {
      target = decodeURIComponent(String(raw || "").trim());
    } catch (_) {
      target = String(raw || "").trim();
    }
    if (!target || !/^https?:\/\//i.test(target)) {
      return res.status(400).json({ error: "Missing url" });
    }

    // Bank data historically stored broken host "https://.app/pyq/..." — repair before fetch
    target = String(target)
      .replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/")
      .replace(/https?:\/\/cdn-question-pool\.app\//gi, "https://cdn-question-pool.getmarks.app/");

    let host = "";
    try {
      host = new URL(target).hostname || "";
    } catch (_) {
      return res.status(400).json({ error: "Bad url" });
    }
    const okHost =
      /(^|\.)getmarks\.app$/i.test(host) ||
      /(^|\.)quizrr\.in$/i.test(host) ||
      host === "cdn-question-pool.getmarks.app" ||
      host === "cdn.quizrr.in";
    if (!okHost) {
      return res.status(403).json({ error: "Host not allowed" });
    }

    const wantClean =
      String((req.query && (req.query.clean || req.query.c)) || "1") !== "0";

    const upstream = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://web.getmarks.app/",
        Origin: "https://web.getmarks.app"
      },
      redirect: "follow"
    });

    if (!upstream.ok) {
      return res.status(upstream.status === 404 ? 404 : 502).json({
        error: "Upstream fetch failed",
        status: upstream.status
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
          // Nuclear v15: ONLY true dark structure + strong colour survive.
          // Mid/pale gray-blue MARKS (lum ~120–240) → pure white. No dilate
          // (dilate was protecting watermark pixels adjacent to ink).
          const ink = new Uint8Array(total);
          const INK_MAX = 72;
          const CHROMA_INK = 55;
          for (let p = 0, i = 0; p < total; p++, i += channels) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            const a = channels > 3 ? d[i + 3] : 255;
            if (a < 12) continue;
            const t = a / 255;
            const rr = Math.round(r * t + 255 * (1 - t));
            const gg = Math.round(g * t + 255 * (1 - t));
            const bb = Math.round(b * t + 255 * (1 - t));
            const lum = 0.299 * rr + 0.587 * gg + 0.114 * bb;
            const chroma = Math.max(rr, gg, bb) - Math.min(rr, gg, bb);
            if (lum <= INK_MAX) ink[p] = 1;
            else if (chroma >= CHROMA_INK && lum < 200) ink[p] = 1;
          }
          for (let p = 0, i = 0; p < total; p++, i += channels) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            const a = channels > 3 ? d[i + 3] : 255;
            const t = a / 255;
            const rr = Math.round(r * t + 255 * (1 - t));
            const gg = Math.round(g * t + 255 * (1 - t));
            const bb = Math.round(b * t + 255 * (1 - t));
            if (ink[p]) {
              d[i] = rr;
              d[i + 1] = gg;
              d[i + 2] = bb;
              d[i + 3] = 255;
              continue;
            }
            const lum = 0.299 * rr + 0.587 * gg + 0.114 * bb;
            const chroma = Math.max(rr, gg, bb) - Math.min(rr, gg, bb);
            const nearGray =
              Math.abs(rr - gg) < 48 &&
              Math.abs(gg - bb) < 52 &&
              Math.abs(rr - bb) < 54;
            // Everything not true ink that is gray/pale → paper white
            if (lum > INK_MAX && (nearGray || chroma < 50)) {
              d[i] = 255;
              d[i + 1] = 255;
              d[i + 2] = 255;
              d[i + 3] = 255;
            } else if (lum > 95 && chroma < 60) {
              d[i] = 255;
              d[i + 1] = 255;
              d[i + 2] = 255;
              d[i + 3] = 255;
            } else {
              d[i] = rr;
              d[i + 1] = gg;
              d[i + 2] = bb;
              d[i + 3] = 255;
            }
          }
          buf = await sharp(d, {
            raw: {
              width: info.width,
              height: info.height,
              channels: 4
            }
          })
            .png({ compressionLevel: 8, effort: 6 })
            .toBuffer();
          outType = "image/png";
          cleaned = true;
        }
      } catch (cleanErr) {
        console.error("proxy-image clean", cleanErr && cleanErr.message);
        // fall through with original buffer
      }
    }

    res.setHeader("Content-Type", outType);
    // Short cache for cleaned images so algorithm bumps take effect
    res.setHeader(
      "Cache-Control",
      cleaned
        ? "public, max-age=3600, stale-while-revalidate=86400"
        : "public, max-age=86400, stale-while-revalidate=604800"
    );
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("X-Qx-Proxy", "1");
    res.setHeader("X-Qx-Clean", cleaned ? "1" : "0");
    res.setHeader("X-Qx-Clean-Ver", "16");
    return res.status(200).send(buf);
  } catch (err) {
    console.error("proxy-image", err && err.message);
    return res.status(500).json({ error: "Proxy failed" });
  }
};
