// Vercel Serverless — Cashfree Payment Webhook
// Logs payment events; activate subscription via client verify-payment after redirect
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const event = body.type || body.event || "unknown";
    const order = body.data && body.data.order ? body.data.order : body;

    console.log("Cashfree webhook:", event, order && order.order_id);

    // Cashfree expects 200 ACK
    return res.status(200).json({ received: true, event });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};