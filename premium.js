// Quantrex — Premium + Videos UI
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
    .video-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(260px,1fr)); gap: 14px; margin-top: 16px; }
    .video-card { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; cursor: pointer; background: var(--white); transition: box-shadow .15s; }
    .video-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.08); }
    .video-thumb { background: linear-gradient(135deg,#1a1a2e,#1589EE); height: 120px; display: flex; align-items: center; justify-content: center; font-size: 36px; color: #fff; }
    .video-info { padding: 14px; }
    .video-sub { font-size: 11px; color: var(--primary); font-weight: 700; text-transform: uppercase; }
    .video-info h4 { font-size: 14px; margin: 4px 0 8px; }
    .video-badge { font-size: 11px; font-weight: 700; color: var(--green); }
    .video-badge.pending { color: var(--orange); }
    .cf-stream-wrap { position: relative; padding-top: 56.25%; border-radius: 12px; overflow: hidden; background: #000; margin-bottom: 20px; }
    .cf-stream-wrap iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
    .video-placeholder { text-align: center; padding: 48px 24px; background: var(--bg); border-radius: 12px; border: 2px dashed var(--border); }
    .svc-status { display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: 10px; margin: 20px 0; }
    .svc-chip { padding: 12px; border-radius: 10px; background: var(--bg); font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .svc-chip.live { background: #e6f9f0; color: #059669; }
    .svc-chip.pending { background: #fff7ed; color: #d97706; }
  `;

  function injectStyles() {
    if (document.getElementById("premium-css")) return;
    const s = document.createElement("style");
    s.id = "premium-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function serviceStatus() {
    const auth = typeof QuantrexDB !== "undefined" && QuantrexDB.ready;
    const storage = typeof QuantrexStorage !== "undefined";
    const video = typeof QuantrexVideo !== "undefined" && QuantrexVideo.isConfigured();
    const pay = typeof QuantrexPayments !== "undefined";
    return [
      { name: "Firebase Auth", live: auth },
      { name: "Firestore DB", live: auth },
      { name: "Firebase Storage", live: storage },
      { name: "Cloudflare Stream", live: video },
      { name: "Cashfree Payments", live: pay }
    ];
  }

  function renderServices() {
    return '<div class="svc-status">' + serviceStatus().map(s =>
      '<div class="svc-chip ' + (s.live ? 'live' : 'pending') + '">' +
      (s.live ? '✅' : '⏳') + ' ' + s.name + '</div>'
    ).join("") + '</div>';
  }

  function render(user, sub) {
    injectStyles();
    const isPremium = sub && sub.active;
    let html = '<div class="premium-page">';
    html += '<div class="premium-hero">';
    html += '<span class="premium-badge">' + (isPremium ? '⭐ PREMIUM ACTIVE' : '🔓 UPGRADE') + '</span>';
    html += '<h2>' + (isPremium ? 'Quantrex Premium' : 'Unlock Full Access') + '</h2>';
    html += '<p style="color:var(--gray)">Video lectures, unlimited tests, formula cards &amp; more</p>';
    html += renderServices();
    html += '</div>';

    if (!isPremium && typeof QuantrexPayments !== "undefined") {
      html += '<h3 style="margin-bottom:8px">Choose Plan</h3>';
      html += QuantrexPayments.renderPlans();
    } else if (isPremium) {
      html += '<p style="color:var(--green);font-weight:600;margin-bottom:16px">✅ Plan: ' + (sub.planId || 'Premium') + ' · Valid till ' +
        (sub.expiresAt && sub.expiresAt.toDate ? sub.expiresAt.toDate().toLocaleDateString() : 'active') + '</p>';
    }

    html += '<h3 style="margin:24px 0 8px">📺 Video Lectures</h3>';
    html += '<div id="videoPlayerArea"></div>';
    if (typeof QuantrexVideo !== "undefined") {
      html += QuantrexVideo.renderCatalog();
    }
    html += '</div>';
    return html;
  }

  function bind(container, user, sub) {
    if (!container) return;
    if (!sub || !sub.active) QuantrexPayments.bindPlans(container, user);
    const playerArea = container.querySelector("#videoPlayerArea");
    if (typeof QuantrexVideo !== "undefined") {
      QuantrexVideo.bindCatalog(container, (uid, title) => {
        if (playerArea) {
          playerArea.innerHTML = '<h4 style="margin-bottom:12px">' + title + '</h4>' + QuantrexVideo.renderPlayer(uid, title);
          playerArea.scrollIntoView({ behavior: "smooth" });
        }
      });
    }
  }

  return { render, bind, injectStyles };
})();