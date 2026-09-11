/**
 * Quantrex leads — registration / inquiry / purchase notify.
 * Admin WhatsApp 7750858874 · Help 8700508344 · email quantrexacademy@gmail.com
 */
window.QxLeads = (function () {
  const ADMIN_WA = "917750858874";
  const HELP_WA = "918700508344";
  const HELP_CALL = "8700508344";
  const ADMIN_EMAIL = "quantrexacademy@gmail.com";

  function waUrl(num, text) {
    return "https://wa.me/" + String(num).replace(/\D/g, "") + "?text=" + encodeURIComponent(text || "");
  }
  function mailUrl(to, subject, body) {
    return "mailto:" + encodeURIComponent(to) +
      "?subject=" + encodeURIComponent(subject || "Quantrex Academy") +
      "&body=" + encodeURIComponent(body || "");
  }
  function yn(v) {
    const s = String(v == null ? "" : v).toLowerCase();
    if (s === "yes" || s === "true" || s === "1") return "Yes";
    if (s === "no" || s === "false" || s === "0") return "No";
    return v ? String(v) : "—";
  }
  function profileBits() {
    let p = {};
    try {
      if (typeof QxProfile !== "undefined") p = QxProfile.get() || {};
    } catch (_) { /* */ }
    let u = {};
    try { u = JSON.parse(localStorage.getItem("quantrex_user") || "{}") || {}; } catch (_) { /* */ }
    return Object.assign({}, p, {
      name: p.name || u.name || "",
      phone: p.phone || u.phone || u.phoneNumber || "",
      email: p.email || u.email || "",
      className: p.className || u.className || "",
      state: p.state || u.state || "",
      district: p.district || u.district || "",
      exams: p.exams || (p.exam ? [p.exam] : []),
      individualMaths: p.individualMaths,
      groupClass: p.groupClass,
      liveClass: p.liveClass
    });
  }
  function formatLead(kind, extra) {
    const p = Object.assign(profileBits(), extra || {});
    const exams = Array.isArray(p.exams) ? p.exams.filter(Boolean).join(", ") : (p.exam || p.exams || "");
    const lines = [
      "Quantrex Academy — " + (kind === "inquiry" ? "Help / Inquiry" : kind === "purchase" ? "Purchase receipt" : kind === "payment_fail" ? "Payment failed" : "New registration"),
      "",
      "Name: " + (p.name || "—"),
      "Mobile: " + (p.phone || "—"),
      "Email: " + (p.email || "—"),
      "Class: " + (p.className || "—"),
      "Exam(s): " + (exams || "—"),
      "State: " + (p.state || "—"),
      "District: " + (p.district || "—"),
      "Individual Maths class: " + yn(p.individualMaths),
      "Group class: " + yn(p.groupClass),
      "Live class every day: " + yn(p.liveClass)
    ];
    if (p.note) lines.push("Message: " + p.note);
    if (p.plan) lines.push("Plan: " + p.plan);
    if (p.amount) lines.push("Amount: " + p.amount);
    if (p.paymentId) lines.push("Payment ID: " + p.paymentId);
    if (p.error) lines.push("Error: " + p.error);
    lines.push("", "Quantrex Maths teacher will call interested students.");
    return lines.join("\n");
  }

  async function postServer(kind, extra) {
    const p = Object.assign(profileBits(), extra || {});
    try {
      await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: kind,
          name: p.name || "",
          phone: p.phone || "",
          email: p.email || "",
          className: p.className || "",
          exams: p.exams || [],
          state: p.state || "",
          district: p.district || "",
          individualMaths: p.individualMaths || "",
          groupClass: p.groupClass || "",
          liveClass: p.liveClass || "",
          note: p.note || "",
          plan: p.plan || "",
          amount: p.amount || "",
          paymentId: p.paymentId || "",
          error: p.error || ""
        })
      });
    } catch (_) { /* */ }
    try {
      if (typeof firebase !== "undefined" && firebase.firestore) {
        const db = firebase.firestore();
        await db.collection("leads").add({
          kind: kind,
          name: p.name || "",
          phone: p.phone || "",
          email: p.email || "",
          className: p.className || "",
          exams: p.exams || [],
          state: p.state || "",
          district: p.district || "",
          individualMaths: p.individualMaths || "",
          groupClass: p.groupClass || "",
          liveClass: p.liveClass || "",
          note: String(p.note || "").slice(0, 800),
          plan: p.plan || "",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (_) { /* */ }
  }

  function openNotify(kind, extra, opts) {
    opts = opts || {};
    const text = formatLead(kind, extra);
    const toAdmin = kind === "inquiry" && opts.help ? HELP_WA : ADMIN_WA;
    const subject = kind === "purchase" ? "Quantrex payment receipt"
      : kind === "inquiry" ? "Quantrex help / inquiry"
      : kind === "payment_fail" ? "Quantrex payment failed"
      : "Quantrex new registration";
    const wa = waUrl(toAdmin, text);
    const mail = mailUrl(ADMIN_EMAIL, subject, text);
    try { window.open(wa, "_blank", "noopener"); } catch (_) { location.href = wa; }
    if (!opts.skipMail) {
      setTimeout(function () {
        try {
          const a = document.createElement("a");
          a.href = mail;
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          a.remove();
        } catch (_) { /* */ }
      }, 600);
    }
    return { wa: wa, mail: mail, text: text, helpWa: waUrl(HELP_WA, text), helpCall: "tel:+91" + HELP_CALL };
  }

  async function submit(kind, extra, opts) {
    const p = Object.assign(profileBits(), extra || {});
    if (typeof QxProfile !== "undefined" && QxProfile.save) {
      try { QxProfile.save(p); } catch (_) { /* */ }
    }
    await postServer(kind, p);
    if (opts && opts.silent) return { text: formatLead(kind, p) };
    return openNotify(kind, p, opts);
  }

  return {
    ADMIN_WA: ADMIN_WA,
    HELP_WA: HELP_WA,
    HELP_CALL: HELP_CALL,
    ADMIN_EMAIL: ADMIN_EMAIL,
    waUrl: waUrl,
    mailUrl: mailUrl,
    formatLead: formatLead,
    submit: submit,
    openNotify: openNotify,
    profileBits: profileBits
  };
})();
