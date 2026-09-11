/**
 * Same-origin proxy for Marks board + NCERT nav/list APIs.
 * Token stays on the server (data/marks_config.json is not deployed).
 */
const fs = require("fs");
const path = require("path");

function readToken() {
  if (process.env.MARKS_TOKEN && String(process.env.MARKS_TOKEN).length > 20) {
    return String(process.env.MARKS_TOKEN).trim();
  }
  try {
    const cfgPath = path.join(process.env.QX_SITE_ROOT || process.cwd(), "data", "marks_config.json");
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      if (cfg && cfg.token) return String(cfg.token);
    }
  } catch (_) { /* */ }
  return "";
}

function allowedPath(p) {
  const s = String(p || "");
  if (!s.startsWith("/api/v4/")) return false;
  if (s.length > 500) return false;
  if (/[<>"']/.test(s)) return false;
  return /^\/api\/v4\/(bpyqb|neet)\//.test(s);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (process.env.MARKS_ADMIN_MIGRATE !== "1") {
    return res.status(410).json({ error: "Marks nav disabled for students", self: true });
  }

  const raw = String((req.query && (req.query.path || req.query.p)) || "");
  let p = raw;
  try { p = decodeURIComponent(raw); } catch (_) { p = raw; }
  if (!p.startsWith("/")) p = "/" + p;
  if (!allowedPath(p)) {
    return res.status(400).json({ error: "Path not allowed" });
  }

  const token = readToken();
  if (!token) return res.status(503).json({ error: "Token missing" });

  try {
    const upstream = await fetch("https://web.getmarks.app" + p, {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Origin: "https://web.getmarks.app",
        Referer: "https://web.getmarks.app/"
      }
    });
    const text = await upstream.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_) { json = { error: "Bad upstream JSON", detail: text.slice(0, 160) }; }
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "public, max-age=120, s-maxage=300, stale-while-revalidate=3600");
    res.setHeader("X-Qx-Marks-Nav", "1");
    return res.status(upstream.ok ? 200 : upstream.status).send(JSON.stringify(json));
  } catch (e) {
    return res.status(502).json({ error: "Proxy failed", detail: String(e && e.message || e).slice(0, 160) });
  }
};
