// Vercel Serverless — Verify Razorpay payment signature
// Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
const crypto = require("crypto");
const { getPlan } = require("../lib/qx-plans");

function authHeader() {
  const id = process.env.RAZORPAY_KEY_ID || "";
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  return "Basic " + Buffer.from(id + ":" + secret).toString("base64");
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) {
    return res.status(503).json({ error: "Razorpay not configured" });
  }

  try {
    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const orderId = body.razorpay_order_id || body.order_id;
      const paymentId = body.razorpay_payment_id || body.payment_id;
      const signature = body.razorpay_signature || body.signature;
      if (!orderId || !paymentId || !signature) {
        return res.status(400).json({ error: "Missing Razorpay payment fields" });
      }
      const expected = crypto
        .createHmac("sha256", secret)
        .update(orderId + "|" + paymentId)
        .digest("hex");
      if (expected !== signature) {
        return res.status(400).json({ ok: false, paid: false, error: "Invalid payment signature" });
      }

      // Valid HMAC is proof of payment. Order status may still be "attempted".
      let notes = {};
      let amountPaise = 0;
      try {
        const orderRes = await fetch("https://api.razorpay.com/v1/orders/" + encodeURIComponent(orderId), {
          headers: { Authorization: authHeader() }
        });
        const order = await orderRes.json();
        if (orderRes.ok) {
          notes = order.notes || {};
          amountPaise = Number(order.amount) || 0;
        }
      } catch (_) { /* signature already verified */ }
      const plan = getPlan(notes.plan_id || notes.plan_key || "complete");

      return res.status(200).json({
        ok: true,
        paid: true,
        provider: "razorpay",
        orderId,
        paymentId,
        amount: amountPaise / 100,
        planId: (plan && plan.id) || notes.plan_id,
        planDays: Number((plan && plan.days) || notes.plan_days || 365),
        features: (plan && plan.features) || String(notes.plan_features || "").split(",").filter(Boolean),
        uid: notes.uid || ""
      });
    }

    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const orderId = req.query.order_id || req.query.razorpay_order_id;
    if (!orderId) return res.status(400).json({ error: "order_id required" });

    const orderRes = await fetch("https://api.razorpay.com/v1/orders/" + encodeURIComponent(orderId), {
      headers: { Authorization: authHeader() }
    });
    const order = await orderRes.json();
    if (!orderRes.ok) {
      return res.status(orderRes.status).json({ error: (order.error && order.error.description) || "Verify failed" });
    }
    const notes = order.notes || {};
    const plan = getPlan(notes.plan_id || notes.plan_key || "complete");
    const paid = order.status === "paid" || Number(order.amount_paid) >= Number(order.amount);

    return res.status(200).json({
      ok: true,
      paid,
      provider: "razorpay",
      orderId: order.id,
      amount: (Number(order.amount) || 0) / 100,
      planId: (plan && plan.id) || notes.plan_id,
      planDays: Number((plan && plan.days) || notes.plan_days || 365),
      features: (plan && plan.features) || String(notes.plan_features || "").split(",").filter(Boolean),
      uid: notes.uid || ""
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
