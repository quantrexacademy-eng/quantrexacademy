// Vercel serverless — proxy pool diagram images so browser canvas can remove watermarks (CORS)
const ALLOWED = /^https:\/\/cdn-question-pool\.getmarks\.app\//i;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const raw = req.query && req.query.url;
  const url = typeof raw === "string" ? decodeURIComponent(raw) : "";
  if (!url || !ALLOWED.test(url)) {
    return res.status(400).json({ error: "Invalid or disallowed image URL" });
  }

  try {
    const upstream = await fetch(url, {
      headers: { "User-Agent": "QuantrexImageProxy/1.0" },
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: "Upstream fetch failed" });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    const type = upstream.headers.get("content-type") || "image/png";
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(502).json({ error: "Proxy error", detail: String(e.message || e) });
  }
};