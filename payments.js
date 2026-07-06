// Quantrex — Cashfree Payments (UPI, Cards, Net Banking)
const QuantrexPayments = (() => {
  const cfg = typeof QUANTREX_STACK !== "undefined" ? QUANTREX_STACK.payment : {};
  let sdkLoaded = false;

  function plans() {
    return cfg.plans || {};
  }

  function isConfigured() {
    return true; // API keys live in Vercel env; client calls /api/create-payment
  }

  function loadSdk() {
    return new Promise((resolve, reject) => {
      if (sdkLoaded && window.Cashfree) return resolve(window.Cashfree);
      const s = document.createElement("script");
      s.src = cfg.sdk || "https://sdk.cashfree.com/js/v3/cashfree.js";
      s.onload = () => { sdkLoaded = true; resolve(window.Cashfree); };
      s.onerror = () => reject(new Error("Cashfree SDK load failed"));
      document.head.appendChild(s);
    });
  }

  async function createOrder(planKey, user) {
    const plan = plans()[planKey];
    if (!plan) return { ok: false, error: "Invalid plan" };
    if (!user || !user.uid) return { ok: false, error: "Login required" };

    try {
      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          amount: plan.amount,
          planLabel: plan.label,
          planDays: plan.days,
          uid: user.uid,
          email: user.email,
          phone: user.phoneNumber || user.phone
        })
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || data.hint || "Order failed", details: data };
      return { ok: true, ...data, plan };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async function openCheckout(paymentSessionId) {
    const Cashfree = await loadSdk();
    const mode = cfg.mode === "production" ? "production" : "sandbox";
    const cashfree = Cashfree({ mode });
    return cashfree.checkout({ paymentSessionId });
  }

  async function buyPlan(planKey, user) {
    const order = await createOrder(planKey, user);
    if (!order.ok) return order;
    await openCheckout(order.paymentSessionId);
    return order;
  }

  async function verifyAndActivate(orderId, uid) {
    try {
      const res = await fetch("/api/verify-payment?order_id=" + encodeURIComponent(orderId));
      const data = await res.json();
      if (!res.ok || !data.paid) return { ok: false, error: data.error || "Payment not completed" };

      if (typeof QuantrexDB !== "undefined" && QuantrexDB.activateSubscription) {
        await QuantrexDB.activateSubscription(uid, {
          planId: data.planId,
          orderId: data.orderId,
          planDays: data.planDays,
          amount: data.amount
        });
      }
      return { ok: true, ...data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  function renderPlans(onSelect) {
    const p = plans();
    return '<div class="pay-plans">' + Object.keys(p).map(key => {
      const plan = p[key];
      return '<div class="pay-plan" data-plan="' + key + '">' +
        '<h3>' + plan.label + '</h3>' +
        '<div class="pay-price">₹' + plan.amount + '</div>' +
        '<p class="pay-desc">' + (key === "yearly" ? "Best value · Save 30%" : "Billed monthly") + '</p>' +
        '<button class="btn btn-primary pay-btn" data-plan="' + key + '">Buy Now</button></div>';
    }).join("") + '</div>';
  }

  function bindPlans(container, user) {
    if (!container) return;
    container.querySelectorAll(".pay-btn").forEach(btn => {
      btn.onclick = async () => {
        btn.disabled = true;
        btn.textContent = "Processing...";
        const result = await buyPlan(btn.dataset.plan, user);
        if (!result.ok) {
          alert(result.error || "Payment failed");
          btn.disabled = false;
          btn.textContent = "Buy Now";
        }
      };
    });
  }

  async function handleReturnQuery() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "success") return null;
    const orderId = params.get("order_id");
    const user = JSON.parse(localStorage.getItem("quantrex_user") || "null");
    if (!orderId || !user || !user.uid) return null;
    const result = await verifyAndActivate(orderId, user.uid);
    if (result.ok) showToast("✅ Premium activated! Welcome to Quantrex Premium.");
    window.history.replaceState({}, "", window.location.pathname);
    return result;
  }

  return {
    isConfigured, plans, createOrder, openCheckout, buyPlan,
    verifyAndActivate, renderPlans, bindPlans, handleReturnQuery
  };
})();