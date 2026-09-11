// Vercel Serverless — Razorpay create order (also aliased as POST /api/create-order)
// Env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET — never sent to the browser except key_id
const Razorpay = require("razorpay");
const { getPlan, liveAmount, publicPlans } = require("../lib/qx-plans");

function client() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "",
    key_secret: process.env.RAZORPAY_KEY_SECRET || ""
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const secret = process.env.RAZORPAY_KEY_SECRET || "";

  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      ok: !!(keyId && secret),
      provider: "razorpay",
      keyId,
      configured: !!(keyId && secret),
      plans: publicPlans(),
      offerEndsAt: require("../lib/qx-plans").OFFER_ENDS_AT
    });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!keyId || !secret) {
    return res.status(401).json({
      error: "Razorpay not configured",
      hint: "Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Vercel env"
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const plan = getPlan(body.planId || body.planKey || (body.amount ? null : "trial_7"));

    let amountPaise;
    let currency = "INR";
    let receipt = String(body.receipt || "").slice(0, 40);
    const notes = {};

    if (plan) {
      amountPaise = Math.round(Number(liveAmount(plan)) * 100);
      currency = plan.currency || "INR";
      let uid = String(body.uid || "").trim();
      if (!uid) uid = "guest_pay_" + Date.now();
      if (!receipt) {
        receipt = ("qx_" + uid.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8) + "_" + Date.now()).slice(0, 40);
      }
      Object.assign(notes, {
        plan_id: plan.id,
        plan_key: plan.key,
        plan_days: String(plan.days),
        plan_features: (plan.features || []).join(","),
        tracks: plan.tracks,
        uid,
        email: String(body.email || ""),
        phone: String(body.phone || "")
      });
    } else {
      amountPaise = Math.round(Number(body.amount));
      currency = String(body.currency || "INR").toUpperCase();
      if (!receipt) receipt = ("qx_" + Date.now()).slice(0, 40);
    }

    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      return res.status(400).json({ error: "Amount must be at least 100 paise" });
    }

    const rzp = client();
    const data = await rzp.orders.create({
      amount: amountPaise,
      currency,
      receipt,
      notes
    });

    return res.status(200).json({
      ok: true,
      provider: "razorpay",
      keyId,
      order_id: data.id,
      orderId: data.id,
      amount: data.amount,
      currency: data.currency,
      planId: plan ? plan.id : undefined,
      planKey: plan ? plan.key : undefined,
      planLabel: plan ? plan.label : undefined,
      planDays: plan ? plan.days : undefined,
      features: plan ? plan.features : undefined
    });
  } catch (err) {
    const status = (err && (err.statusCode || err.status)) || 500;
    const desc = (err && err.error && err.error.description) || err.message || "Razorpay order failed";
    if (status === 401 || /authentication|invalid key|unauthorized/i.test(String(desc))) {
      return res.status(401).json({ error: desc });
    }
    return res.status(status >= 400 ? status : 500).json({ error: desc });
  }
};
