// Vercel — server-side diagram restoration (watermarks/stains removed, figure preserved)
const sharp = require("sharp");
const { restoreDiagramPixels } = require("./diagram-restore");
const { ownedFigureUrl, isForeignHost } = require("../qx-owned-figures");

const ALLOWED = /^https:\/\/(?:firebasestorage\.googleapis\.com|www\.quantrexacademy\.com|quantrexacademy\.com)\//i;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const raw = req.query && req.query.url;
  let url = typeof raw === "string" ? decodeURIComponent(raw) : "";
  if (url && isForeignHost(url)) {
    url = ownedFigureUrl(url) || "";
  }
  if (!url || !ALLOWED.test(url)) {
    return res.status(400).json({ error: "Invalid or disallowed image URL" });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": "QuantrexRestore/1.0",
        Referer: "https://www.quantrexacademy.com/"
      },
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Upstream fetch failed" });
    }

    const input = Buffer.from(await upstream.arrayBuffer());
    const { data, info } = await sharp(input)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
    restoreDiagramPixels(pixels, info.width, info.height);

    const out = await sharp(Buffer.from(pixels), {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png({ compressionLevel: 6, quality: 100 })
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    return res.status(200).send(out);
  } catch (e) {
    return res.status(502).json({ error: "Restore error", detail: String(e.message || e) });
  }
};