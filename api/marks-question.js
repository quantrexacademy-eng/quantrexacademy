/**
 * Same-origin Marks question proxy (flat path — Vercel reliably deploys api/*.js).
 * GET /api/marks-question?id=<marksQuestionId>
 */
const fs = require("fs");
const path = require("path");

function jwtAlive(tok) {
  try {
    const p = JSON.parse(Buffer.from(String(tok).split(".")[1], "base64").toString("utf8"));
    return p && p.exp && p.exp * 1000 > Date.now() + 60000;
  } catch (_) {
    return false;
  }
}

function readToken() {
  const envTok = process.env.MARKS_TOKEN && String(process.env.MARKS_TOKEN).trim();
  let fileTok = "";
  try {
    const cfgPath = path.join(process.env.QX_SITE_ROOT || process.cwd(), "data", "marks_config.json");
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      if (cfg && cfg.token) fileTok = String(cfg.token).trim();
    }
  } catch (_) { /* */ }
  if (envTok && jwtAlive(envTok)) return envTok;
  if (fileTok && jwtAlive(fileTok)) return fileTok;
  return envTok || fileTok || "";
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept");
      return res.status(204).end();
    }
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    const q = req.query || {};
    const action = String(q.action || q.op || "").trim();
    const { handleCatalog, findBankQuestion } = require("../lib/qx-catalog-server");
    if (action) {
      const out = handleCatalog(q);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-Qx-Catalog", "1");
      return res.status(out.ok ? 200 : 400).json(out);
    }
    const id = String((q.id || q.qid) || "").trim();
    if (id) {
      try {
        const rec = findBankQuestion(id);
        if (rec) {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
          res.setHeader("Content-Type", "application/json");
          res.setHeader("X-Qx-Catalog", "1");
          return res.status(200).json({ ok: true, question: rec, questions: [rec] });
        }
      } catch (_) { /* continue */ }
    }
    if (!id) {
      return res.status(400).json({ error: "Missing id" });
    }
    // Offline Quantrex copy (not live Marks)
    try {
      const offlinePath = path.join(process.cwd(), "data", "qid_marks", id + ".json");
      if (fs.existsSync(offlinePath)) {
        const offline = JSON.parse(fs.readFileSync(offlinePath, "utf8"));
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
        res.setHeader("Content-Type", "application/json");
        res.setHeader("X-Qx-Marks-Source", "offline");
        return res.status(200).json(offline);
      }
    } catch (_) { /* */ }

    // Live Marks only for admin migration — never the student site
    if (process.env.MARKS_ADMIN_MIGRATE !== "1") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Content-Type", "application/json");
      return res.status(404).json({ error: "Question not in Quantrex catalog", id });
    }
    const token = readToken();
    if (!token) {
      return res.status(503).json({ error: "Marks token not configured" });
    }
    const url = `https://web.getmarks.app/api/v1/questions/${encodeURIComponent(id)}`;
    const upstream = await fetch(url, {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Origin: "https://web.getmarks.app",
        Referer: "https://web.getmarks.app/"
      }
    });
    if (!upstream.ok) {
      // Second offline try under marks_data (local only; often vercelignored)
      try {
        const alt = path.join(process.cwd(), "marks_data", "cpyqb", "exams");
        // shallow known path scan is expensive — skip on serverless
      } catch (_) { /* */ }
      const body = await upstream.text().catch(() => "");
      return res.status(upstream.status === 401 || upstream.status === 403 ? 401 : 502).json({
        error: "Marks upstream failed",
        status: upstream.status,
        detail: String(body || "").slice(0, 200)
      });
    }
    const data = await upstream.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=3600");
    res.setHeader("Content-Type", "application/json");
    res.setHeader("X-Qx-Marks-Source", "live");
    return res.status(200).json(data);
  } catch (err) {
    console.error("marks-question", err && err.message);
    return res.status(500).json({ error: "Proxy failed" });
  }
};
