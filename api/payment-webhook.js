// Vercel Serverless — Razorpay webhook
// URL: https://www.quantrexacademy.com/api/payment-webhook
// Env: RAZORPAY_WEBHOOK_SECRET, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
const crypto = require("crypto");
const { getPlan } = require("../lib/qx-plans");

module.exports.config = { api: { bodyParser: false } };

function authHeader() {
  const id = process.env.RAZORPAY_KEY_ID || "";
  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  return "Basic " + Buffer.from(id + ":" + secret).toString("base64");
}

function readRaw(req) {
  if (req.rawBody) {
    return Promise.resolve(Buffer.isBuffer(req.rawBody) ? req.rawBody.toString("utf8") : String(req.rawBody));
  }
  if (typeof req.body === "string") return Promise.resolve(req.body);
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body.toString("utf8"));
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
    const raw = await readRaw(req);
    const sig = String(req.headers["x-razorpay-signature"] || "");
    if (!secret) return res.status(500).json({ error: "Webhook secret missing" });
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    if (!sig || expected !== sig) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const body = raw ? JSON.parse(raw) : {};
    const event = body.event || "unknown";
    const payment = body.payload && body.payload.payment && body.payload.payment.entity;
    const order = body.payload && body.payload.order && body.payload.order.entity;
    const qr = body.payload && body.payload.qr_code && body.payload.qr_code.entity;
    let notes = (payment && payment.notes) || (order && order.notes) || {};

    if (payment && payment.order_id && !notes.plan_id && !notes.uid) {
      try {
        const orderRes = await fetch(
          "https://api.razorpay.com/v1/orders/" + encodeURIComponent(payment.order_id),
          { headers: { Authorization: authHeader() } }
        );
        const od = await orderRes.json();
        if (orderRes.ok) notes = od.notes || notes;
      } catch (_) { /* notes stay as payload */ }
    }

    const plan = getPlan(notes.plan_id || notes.plan_key || "");
    console.log("Razorpay webhook", event, {
      paymentId: payment && payment.id,
      orderId: (payment && payment.order_id) || (order && order.id) || "",
      qrId: qr && qr.id,
      uid: notes.uid || "",
      plan: (plan && plan.key) || notes.plan_key || "",
      status: (payment && payment.status) || (order && order.status) || ""
    });

    return res.status(200).json({
      received: true,
      event,
      planId: plan && plan.id,
      uid: notes.uid || ""
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};
