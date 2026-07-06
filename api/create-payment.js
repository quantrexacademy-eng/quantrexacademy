// Vercel Serverless — Create Cashfree Payment Order
// Env: CASHFREE_APP_ID, CASHFREE_SECRET_KEY, CASHFREE_MODE (sandbox|production)
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const appId = process.env.CASHFREE_APP_ID;
  const secret = process.env.CASHFREE_SECRET_KEY;
  const mode = process.env.CASHFREE_MODE || "sandbox";

  if (!appId || !secret) {
    return res.status(503).json({
      error: "Cashfree not configured",
      hint: "Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY in Vercel Environment Variables"
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { planId, amount, uid, email, phone, planLabel, planDays } = body;

    if (!planId || !amount || !uid) {
      return res.status(400).json({ error: "Missing planId, amount, or uid" });
    }

    const base = mode === "production"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";

    const orderId = "qx_" + uid.slice(0, 8) + "_" + Date.now();
    const returnUrl = (process.env.SITE_URL || "https://quantrexacademy-lemon.vercel.app") + "/app?payment=success&order_id=" + orderId;

    const orderRes = await fetch(base + "/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secret
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: Number(amount),
        order_currency: "INR",
        customer_details: {
          customer_id: uid,
          customer_email: email || "student@quantrexacademy.com",
          customer_phone: phone || "9999999999"
        },
        order_meta: {
          return_url: returnUrl,
          notify_url: (process.env.SITE_URL || "https://quantrexacademy-lemon.vercel.app") + "/api/payment-webhook",
          plan_id: planId,
          plan_label: planLabel || planId,
          plan_days: String(planDays || 30),
          uid: uid
        }
      })
    });

    const data = await orderRes.json();
    if (!orderRes.ok) {
      return res.status(orderRes.status).json({ error: data.message || "Cashfree order failed", details: data });
    }

    return res.status(200).json({
      ok: true,
      orderId: data.order_id,
      paymentSessionId: data.payment_session_id,
      orderStatus: data.order_status
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
};