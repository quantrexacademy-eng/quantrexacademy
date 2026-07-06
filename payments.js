// Quantrex — Cashfree Payment Integration (UPI, Cards, Net Banking)
// Docs: https://docs.cashfree.com/docs/web-integration
const QuantrexPayments = (() => {
  const cfg = typeof QUANTREX_STACK !== "undefined" ? QUANTREX_STACK.payment : {};

  function isConfigured() {
    return !!(cfg.appId && cfg.mode);
  }

  async function createOrder(planId, user) {
    if (!isConfigured()) {
      return { ok: false, error: "Cashfree not configured. Add appId in stack-config.js or Vercel env." };
    }
    // Production: call Vercel serverless /api/cashfree-order with user uid + plan
    return {
      ok: false,
      error: "Payment API endpoint pending. Connect Cashfree sandbox keys in Vercel env.",
      planId,
      userId: user && user.uid
    };
  }

  function openCheckout(paymentSessionId) {
    if (!paymentSessionId) return;
    // Cashfree JS SDK loads here when keys are set
    console.info("Cashfree checkout:", paymentSessionId);
  }

  return { isConfigured, createOrder, openCheckout, plans: cfg.plans || {} };
})();