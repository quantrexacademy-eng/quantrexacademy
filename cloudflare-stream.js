// Quantrex — Cloudflare Stream Video Player
const QuantrexVideo = (() => {
  const cfg = typeof QUANTREX_STACK !== "undefined" ? QUANTREX_STACK.video : {};

  function isConfigured() {
    return !!(cfg.customerCode);
  }

  function embedUrl(videoUid) {
    if (!videoUid || !cfg.customerCode) return null;
    return "https://customer-" + cfg.customerCode + ".cloudflarestream.com/" + videoUid + "/iframe";
  }

  function renderPlayer(videoUid, title) {
    const src = embedUrl(videoUid);
    if (!src) {
      return '<div class="video-placeholder">' +
        '<div style="font-size:48px;margin-bottom:12px">🎬</div>' +
        '<h3>' + (title || "Video Lecture") + '</h3>' +
        '<p style="color:var(--gray);margin-top:8px">Cloudflare Stream configure karo — stack-config.js mein customerCode add karo.</p>' +
        '<a href="https://dash.cloudflare.com" target="_blank" rel="noopener" class="btn btn-primary" style="display:inline-flex;margin-top:16px;width:auto;padding:12px 24px">Setup Cloudflare Stream</a>' +
        '</div>';
    }
    return '<div class="cf-stream-wrap">' +
      '<iframe src="' + src + '" ' +
      'allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" ' +
      'allowfullscreen loading="lazy" title="' + (title || "Video") + '"></iframe></div>';
  }

  function renderCatalog() {
    const items = cfg.catalog || [];
    if (!items.length) return '<p class="empty-msg">No videos configured.</p>';
    return '<div class="video-grid">' + items.map(v => {
      const playable = !!(v.uid && cfg.customerCode);
      return '<div class="video-card' + (playable ? ' playable' : '') + '" data-uid="' + (v.uid || '') + '" data-title="' + v.title + '">' +
        '<div class="video-thumb">▶</div>' +
        '<div class="video-info"><span class="video-sub">' + v.subject + '</span>' +
        '<h4>' + v.title + '</h4>' +
        (playable ? '<span class="video-badge">Watch</span>' : '<span class="video-badge pending">Coming soon</span>') +
        '</div></div>';
    }).join("") + '</div>';
  }

  function bindCatalog(container, onPlay) {
    if (!container) return;
    container.querySelectorAll(".video-card.playable").forEach(card => {
      card.onclick = () => {
        const uid = card.dataset.uid;
        const title = card.dataset.title;
        if (onPlay) onPlay(uid, title);
      };
    });
  }

  return { isConfigured, embedUrl, renderPlayer, renderCatalog, bindCatalog };
})();