// Quantrex Academy — plans (Razorpay)
const QuantrexPremium = (() => {
  const CSS = `
    .premium-page { max-width: 920px; margin: 0 auto; }
    .premium-hero { text-align: center; padding: 8px 0 18px; }
    .premium-hero h2 { font-family: Kanit, sans-serif; font-size: 26px; margin-bottom: 8px; }
    .premium-badge { display: inline-block; background: #111827; color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 12px; }
    .premium-hero img { width: 100%; max-width: 920px; border-radius: 16px; margin: 8px 0 16px; display: block; }
    .pay-plans { display: grid; grid-template-columns: repeat(auto-fit,minmax(200px,1fr)); gap: 12px; margin: 16px 0; }
    .pay-plan { border: 2px solid var(--border,#e5e7eb); border-radius: 16px; padding: 18px; text-align: center; background: var(--white,#fff); }
    .pay-price { font-size: 28px; font-weight: 800; color: var(--primary,#0b57d0); margin: 8px 0; }
    .pay-price .old { color: #9ca3af; text-decoration: line-through; font-size: 14px; margin-right: 6px; }
    .pay-desc { color: var(--gray); font-size: 13px; margin-bottom: 12px; }
    .pay-btn { width: 100%; }
    table.qx-plan-chart { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
    table.qx-plan-chart th, table.qx-plan-chart td { padding: 8px 6px; border-top: 1px solid #eef2f7; text-align: left; }
    table.qx-plan-chart th { color: #6b7280; font-size: 11px; }
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
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.ALL_COURSES_FREE) {
      let html = '<div class="premium-page"><div class="premium-hero">';
      html += '<span class="premium-badge">ALL COURSES FREE</span>';
      html += "<h2>No subscription</h2>";
      html += '<p style="color:var(--gray)">Every course, test series, book, and PYQ is unlocked. Nothing to buy.</p>';
      html += "</div></div>";
      return html;
    }
    const isPremium = sub && sub.active;
    let html = '<div class="premium-page"><div class="premium-hero">';
    html += '<span class="premium-badge">' + (isPremium ? "PLAN ACTIVE" : "QUANTREX ACADEMY") + "</span>";
    html += "<h2>" + (isPremium ? "Your coaching access" : "Unlock Quantrex coaching") + "</h2>";
    html += '<p style="color:var(--gray)">7-Day Pass <s>₹99</s> <strong>₹9</strong> · or 1-year Engineering / Medical plans</p>';
    html += '<img src="assets/banners/qx-coaching-wide.png" alt="Quantrex Academy coaching">';
    html += "</div>";
    if (isPremium) {
      html += '<p style="color:var(--green,#059669);font-weight:600">Plan: ' + (sub.planId || "Active") + "</p>";
    } else if (typeof QuantrexPayments !== "undefined") {
      html += "<h3>Pay with Razorpay</h3>" + QuantrexPayments.renderPlans();
    }
    html += '<div style="margin-top:18px"><a class="btn-primary" href="pay.html" style="display:inline-block;text-decoration:none;padding:12px 18px;border-radius:12px">Open full chart</a></div>';
    html += "</div>";
    return html;
  }

  function bind(container, user, sub) {
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.ALL_COURSES_FREE) return;
    if (!container || (sub && sub.active)) return;
    if (typeof QuantrexPayments !== "undefined") {
      QuantrexPayments.loadPublicConfig().then(() => {
        QuantrexPayments.bindPlans(container, user);
      });
    }
  }

  return { render, bind, injectStyles };
})();
