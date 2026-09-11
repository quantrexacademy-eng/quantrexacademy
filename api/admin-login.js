// Server-side admin check — password never shipped to the browser
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST only" });
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const kind = String(body.kind || "").slice(0, 32);
  if (/^(register|inquiry|purchase|payment_fail)$/i.test(kind)) {
    const name = String(body.name || "").trim().slice(0, 80);
    const phone = String(body.phone || "").replace(/\D/g, "").slice(-10);
    const email = String(body.email || "").trim().slice(0, 80);
    if (!name && !phone && !email) {
      return res.status(400).json({ ok: false, error: "Name, mobile or email is required" });
    }
    const exams = Array.isArray(body.exams) ? body.exams.map(String).slice(0, 20) : [];
    const lines = [
      "Quantrex Academy — " + kind,
      "Name: " + (name || "—"),
      "Mobile: " + (phone || "—"),
      "Email: " + (email || "—"),
      "Class: " + String(body.className || "—"),
      "Exams: " + (exams.join(", ") || "—"),
      "State: " + String(body.state || "—"),
      "District: " + String(body.district || "—"),
      "Individual Maths: " + String(body.individualMaths || "—"),
      "Group class: " + String(body.groupClass || "—"),
      "Live class every day: " + String(body.liveClass || "—"),
      body.note ? "Message: " + String(body.note).slice(0, 800) : "",
      body.plan ? "Plan: " + String(body.plan) : "",
      body.paymentId ? "Payment ID: " + String(body.paymentId) : "",
      body.error ? "Error: " + String(body.error).slice(0, 200) : ""
    ].filter(Boolean).join("\n");
    return res.status(200).json({
      ok: true,
      kind: kind,
      adminWhatsApp: "https://wa.me/917750858874?text=" + encodeURIComponent(lines),
      helpWhatsApp: "https://wa.me/918700508344?text=" + encodeURIComponent(lines),
      helpCall: "tel:+918700508344",
      adminEmail: "mailto:quantrexacademy@gmail.com?subject=" + encodeURIComponent("Quantrex " + kind) + "&body=" + encodeURIComponent(lines)
    });
  }
  const id = String(body.email || body.phone || body.id || "").trim().toLowerCase();
  const pass = String(body.password || "");
  const emailOk = id === "quantrexacademy@gmail.com";
  const phoneDigits = id.replace(/\D/g, "");
  const phoneOk = phoneDigits === "7750858874" || phoneDigits.endsWith("7750858874");
  const wantPass = process.env.QX_ADMIN_PASSWORD || "function13@";
  if (!(emailOk || phoneOk) || pass !== wantPass) {
    return res.status(401).json({ ok: false, error: "Invalid admin login" });
  }
  return res.status(200).json({
    ok: true,
    role: "admin",
    email: "quantrexacademy@gmail.com",
    phone: "7750858874",
    name: "Quantrex Admin",
    uid: "admin_quantrex"
  });
};
