// Vercel Serverless — Verify Cashfree Payment Status
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const appId = process.env.CASHFREE_APP_ID;
  const secret = process.env.CASHFREE_SECRET_KEY;
  const mode = process.env.CASHFREE_MODE || "sandbox";
  const orderId = req.query.order_id;

  if (!appId || !secret) {
    return res.status(503).json({ error: "Cashfree not configured" });
  }
  if (!orderId) {
    return res.status(400).json({ error: "order_id required" });
  }

  try {
    const base = mode === "production"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";

    const r = await fetch(base + "/orders/" + orderId, {
      headers: {
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secret
      }
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message || "Verify failed" });

    const paid = data.order_status === "PAID";
    const meta = data.order_meta || {};

    return res.status(200).json({
      ok: true,
      paid,
      orderId: data.order_id,
      amount: data.order_amount,
      planId: meta.plan_id,
      planDays: Number(meta.plan_days || 30),
      uid: meta.uid
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};