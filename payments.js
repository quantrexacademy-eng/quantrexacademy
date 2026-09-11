// Quantrex — Razorpay Checkout (UPI, Cards, Net Banking)
const QuantrexPayments = (() => {
  const cfg = typeof QUANTREX_STACK !== "undefined" ? QUANTREX_STACK.payment : {};
  let sdkLoaded = false;
  let publicCfg = null;

  function plans() {
    if (publicCfg && publicCfg.plans) return publicCfg.plans;
    return cfg.plans || {};
  }

  function isConfigured() {
    return true;
  }

  async function loadPublicConfig() {
    if (publicCfg) return publicCfg;
    try {
      const r = await fetch("/api/create-payment", { cache: "no-store" });
      publicCfg = await r.json();
    } catch (_) {
      publicCfg = { ok: false, plans: cfg.plans || {} };
    }
    return publicCfg;
  }

  function loadSdk() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        sdkLoaded = true;
        return resolve(window.Razorpay);
      }
      const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
      const s = existing || document.createElement("script");
      let done = false;
      const finish = function (err) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (err || !window.Razorpay) reject(err || new Error("Razorpay checkout failed to load — allow checkout.razorpay.com"));
        else {
          sdkLoaded = true;
          resolve(window.Razorpay);
        }
      };
      const timer = setTimeout(function () { finish(new Error("Razorpay script timeout — disable adblock and retry")); }, 8000);
      s.addEventListener("load", function () { finish(); });
      s.addEventListener("error", function () { finish(new Error("Razorpay checkout failed to load")); });
      if (!existing) {
        s.src = (cfg && cfg.sdk) || "https://checkout.razorpay.com/v1/checkout.js";
        s.async = true;
        document.head.appendChild(s);
      } else if (window.Razorpay) finish();
    });
  }

  async function createOrder(planKey, user) {
    const list = plans();
    const plan = list[planKey] || Object.values(list).find((p) => p.id === planKey || p.key === planKey);
    if (!plan) return { ok: false, error: "Invalid plan" };
    if (!user || !user.uid) {
      try {
        let gid = localStorage.getItem("quantrex_guest_id");
        if (!gid) {
          gid = "guest_pay_" + Date.now();
          localStorage.setItem("quantrex_guest_id", gid);
        }
        user = { uid: gid, email: (user && user.email) || "", phone: (user && (user.phone || user.contact)) || "", name: (user && user.name) || "" };
      } catch (_) {
        user = { uid: "guest_pay_" + Date.now(), email: "", phone: "", name: "" };
      }
    }

    try {
      const ac = typeof AbortController !== "undefined" ? new AbortController() : null;
      const to = setTimeout(function () { try { ac && ac.abort(); } catch (_) {} }, 20000);
      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac ? ac.signal : undefined,
        body: JSON.stringify({
          planId: plan.id || planKey,
          planKey: plan.key || planKey,
          uid: user.uid,
          email: user.email,
          phone: user.phoneNumber || user.phone || user.contact
        })
      });
      clearTimeout(to);
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || data.hint || "Order failed", details: data };
      return { ok: true, ...data, plan };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async function openCheckout(order, user) {
    const RazorpayCtor = await loadSdk();
    const pub = await loadPublicConfig();
    const key = order.keyId || pub.keyId || cfg.keyId;
    if (!key) throw new Error("Razorpay key missing");
    const orderId = order.orderId || order.order_id;
    if (!orderId) throw new Error("Razorpay order id missing");

    return new Promise((resolve) => {
      let opened = false;
      let rzp;
      try {
        rzp = new RazorpayCtor({
          key: key,
          amount: Number(order.amount),
          currency: order.currency || "INR",
          name: "Quantrex Academy",
          description: (order.planLabel || (order.plan && order.plan.label) || "Quantrex access"),
          order_id: orderId,
          retry: { enabled: true, max_count: 2 },
          prefill: {
            name: (user && (user.displayName || user.name)) || "Student",
            email: (user && user.email) || "",
            contact: String((user && (user.phoneNumber || user.phone || user.contact)) || "").replace(/\D/g, "").slice(-10)
          },
          notes: {
            plan_id: String(order.planId || ""),
            uid: String((user && user.uid) || "")
          },
          theme: { color: "#2563eb" },
          modal: {
            ondismiss: function () {
              resolve({ ok: false, cancelled: true, error: "Payment cancelled" });
            }
          },
          handler: function (response) {
            verifyAndActivate(
              response.razorpay_order_id,
              user && user.uid,
              response
            ).then(resolve).catch(function (e) {
              resolve({ ok: false, error: (e && e.message) || "Verify failed" });
            });
          }
        });
      } catch (e) {
        resolve({ ok: false, error: (e && e.message) || "Razorpay init failed" });
        return;
      }
      rzp.on("payment.failed", function (resp) {
        const msg = (resp && resp.error && resp.error.description) || "Payment failed";
        resolve({ ok: false, error: msg });
      });
      try {
        rzp.open();
      } catch (e) {
        resolve({ ok: false, error: (e && e.message) || "Razorpay open failed" });
      }
    });
  }

  async function buyPlan(planKey, user) {
    try {
      if (typeof QxProfile !== "undefined" && QxProfile.missing().length) {
        const prof = await QxProfile.ensure({ reason: "pay" });
        user = Object.assign({}, user || {}, {
          name: prof.name,
          className: prof.className,
          state: prof.state,
          district: prof.district
        });
      }
      await loadPublicConfig();
      await loadSdk();
      const order = await createOrder(planKey, user);
      if (!order.ok) return order;
      if (!order.orderId && !order.order_id) return { ok: false, error: "Razorpay order missing" };
      return await openCheckout(order, user);
    } catch (e) {
      return { ok: false, error: (e && e.message) || "Could not open Razorpay" };
    }
  }

  async function verifyAndActivate(orderId, uid, rzpFields) {
    try {
      let data;
      if (rzpFields && rzpFields.razorpay_signature) {
        const res = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rzpFields)
        });
        data = await res.json();
        if (!res.ok || !data.paid) return { ok: false, error: data.error || "Payment not completed" };
      } else {
        const res = await fetch("/api/verify-payment?order_id=" + encodeURIComponent(orderId));
        data = await res.json();
        if (!res.ok || !data.paid) return { ok: false, error: data.error || "Payment not completed" };
      }

      const userId = uid || data.uid;
      let feats = Array.isArray(data.features) ? data.features.filter(Boolean) : [];
      if (!feats.length && typeof QuantrexAccess !== "undefined" && QuantrexAccess.planFeatures) {
        feats = QuantrexAccess.planFeatures(data.planId || data.planKey);
      }
      if (!feats.length) feats = ["eng", "med", "jee_ts"];
      const days = Number(data.planDays || 7);
      const startedAt = Date.now();
      const expiresAt = startedAt + days * 86400000;
      try {
        if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.saveSub) {
          QuantrexAccess.saveSub({
            active: true,
            planId: data.planId || data.planKey || "",
            features: feats,
            startedAt: startedAt,
            expiresAt: expiresAt,
            orderId: data.orderId || "",
            paymentId: data.paymentId || (rzpFields && rzpFields.razorpay_payment_id) || "",
            amount: data.amount || 0
          });
        }
      } catch (_) {}
      let sub = {};
      if (userId && typeof QuantrexDB !== "undefined" && QuantrexDB.activateSubscription) {
        sub = await QuantrexDB.activateSubscription(userId, {
          planId: data.planId,
          orderId: data.orderId,
          planDays: days,
          amount: data.amount,
          features: feats
        }) || {};
      }
      const out = {
        ok: true,
        ...data,
        paymentId: data.paymentId || (rzpFields && rzpFields.razorpay_payment_id) || "",
        startedAt: sub.startedAt || Date.now(),
        expiresAt: sub.expiresAt || (Date.now() + (Number(data.planDays || 7) * 86400000)),
        days: sub.days || data.planDays
      };
      try {
        const list = plans();
        const plan = list[data.planKey] || Object.values(list).find(function (p) {
          return p && (p.id === data.planId || p.key === data.planKey);
        }) || {};
        const label = data.planLabel || plan.label || "Quantrex access";
        if (typeof QxLiveFeed !== "undefined" && QxLiveFeed.publishReal) {
          QxLiveFeed.publishReal(label, data.planId || data.planKey || "");
        }
      } catch (_) { /* */ }
      return out;
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  function renderPlans() {
    const p = plans();
    const keys = Object.keys(p);
    if (!keys.length) {
      return '<div class="pay-plans"><div class="pay-plan"><h3>7-Day Pass</h3><div class="pay-price"><span class="old">₹99</span> ₹9</div><p class="pay-desc">Full access · 7 days</p><a class="btn btn-primary pay-btn" href="pay.html?plan=trial_7">Pay ₹9</a></div></div>';
    }
    return '<div class="pay-plans">' + keys.map((key) => {
      const plan = p[key];
      const live = plan.liveAmount != null ? plan.liveAmount : plan.amount;
      const showOld = plan.isOffer && plan.amount && plan.amount !== live;
      return '<div class="pay-plan" data-plan="' + key + '">' +
        '<h3>' + (plan.label || "Quantrex") + '</h3>' +
        '<div class="pay-price">' + (showOld ? '<span class="old">₹' + plan.amount + '</span> ' : '') + '₹' + live + '</div>' +
        '<p class="pay-desc">' + (plan.days === 7 ? "7 days · " : "1 year · ") + (plan.tracks || "") + '</p>' +
        '<button class="btn btn-primary pay-btn" data-plan="' + key + '">Pay ₹' + live + '</button></div>';
    }).join("") + '</div>';
  }

  function bindPlans(container, user) {
    if (!container) return;
    container.querySelectorAll(".pay-btn[data-plan]").forEach((btn) => {
      btn.onclick = async () => {
        if (!user || !user.uid) {
          window.location.href = "login.html?next=pay";
          return;
        }
        btn.disabled = true;
        const prev = btn.textContent;
        btn.textContent = "Opening Razorpay…";
        const result = await buyPlan(btn.dataset.plan, user);
        if (result && result.ok) {
          if (typeof showToast === "function") showToast("Quantrex access unlocked");
          else alert("Payment successful. Your Quantrex access is active.");
          if (typeof go === "function") go("premium");
          else window.location.href = "app.html#premium";
          return;
        }
        if (!(result && result.cancelled) && typeof showToast === "function") {
          showToast(result.error || "Payment failed");
        } else if (!(result && result.cancelled)) {
          alert((result && result.error) || "Payment failed");
        }
        btn.disabled = false;
        btn.textContent = prev;
      };
    });
  }

  async function handleReturnQuery() {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order_id") || params.get("razorpay_order_id");
    if (!orderId || (params.get("payment") !== "success" && !params.get("razorpay_payment_id"))) return null;
    const user = JSON.parse(localStorage.getItem("quantrex_user") || "null");
    if (!user || !user.uid) return null;
    const result = await verifyAndActivate(orderId, user.uid, {
      razorpay_order_id: params.get("razorpay_order_id") || orderId,
      razorpay_payment_id: params.get("razorpay_payment_id"),
      razorpay_signature: params.get("razorpay_signature")
    });
    if (result.ok && typeof showToast === "function") showToast("✅ Premium activated!");
    window.history.replaceState({}, "", window.location.pathname + window.location.hash);
    return result;
  }

  return {
    isConfigured,
    plans,
    loadPublicConfig,
    createOrder,
    openCheckout,
    buyPlan,
    verifyAndActivate,
    renderPlans,
    bindPlans,
    handleReturnQuery
  };
})();
