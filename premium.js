// Quantrex — Premium Plans (Cashfree — no video)
const QuantrexPremium = (() => {
  const CSS = `
    .premium-page { max-width: 900px; margin: 0 auto; }
    .premium-hero { text-align: center; padding: 24px 0 32px; }
    .premium-hero h2 { font-family: Kanit, sans-serif; font-size: 28px; margin-bottom: 8px; }
    .premium-badge { display: inline-block; background: linear-gradient(135deg,#7c5ce7,#a08ae8); color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 12px; }
    .pay-plans { display: grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap: 16px; margin: 20px 0; }
    .pay-plan { border: 2px solid var(--border); border-radius: 14px; padding: 24px; text-align: center; background: var(--white); }
    .pay-plan:hover { border-color: var(--primary); }
    .pay-price { font-size: 36px; font-weight: 800; color: var(--primary); margin: 8px 0; }
    .pay-desc { color: var(--gray); font-size: 13px; margin-bottom: 16px; }
    .pay-btn { width: 100%; }
    .premium-feats { display: grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap: 12px; margin: 24px 0; }
    .premium-feat { padding: 16px; background: var(--bg); border-radius: 12px; font-size: 14px; font-weight: 600; }
  `;

  function injectStyles() {
    if (document.getElementById("premium-css")) return;
    const s = document.createElement("style");
    s.id = "premium-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function render(user, sub) {
    injectStyles();
    const isPremium = sub && sub.active;
    let html = '<div class="premium-page"><div class="premium-hero">';
    html += '<span class="premium-badge">' + (isPremium ? '⭐ PREMIUM ACTIVE' : '🔓 UPGRADE') + '</span>';
    html += '<h2>' + (isPremium ? 'Quantrex Premium' : 'Unlock Full Access') + '</h2>';
    html += '<p style="color:var(--gray)">Unlimited tests, all question banks, formula cards &amp; more</p>';
    html += '</div>';
    html += '<div class="premium-feats">';
    ["All 127k+ Questions", "Custom Tests", "Formula Cards", "DPP Sets", "Digital Books", "Leaderboard"].forEach(f => {
      html += '<div class="premium-feat">✅ ' + f + '</div>';
    });
    html += '</div>';
    if (!isPremium && typeof QuantrexPayments !== "undefined") {
      html += '<h3>Choose Plan</h3>' + QuantrexPayments.renderPlans();
    } else if (isPremium) {
      html += '<p style="color:var(--green);font-weight:600">✅ Plan: ' + (sub.planId || 'Premium') + '</p>';
    }
    html += '</div>';
    return html;
  }

  function bind(container, user, sub) {
    if (!container || sub && sub.active) return;
    if (typeof QuantrexPayments !== "undefined") QuantrexPayments.bindPlans(container, user);
  }

  return { render, bind, injectStyles };
})();