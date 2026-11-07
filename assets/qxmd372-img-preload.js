/* qxmd372: CBT figure late-load — mark ready + soft preload next Q images */
(function () {
  "use strict";
  if (window.__qxImgPreload372) return;
  window.__qxImgPreload372 = true;
  function mark(img) {
    if (!img || img.tagName !== "IMG") return;
    function ready() { img.classList.add("qx-img-ready"); }
    if (img.complete && img.naturalWidth) ready();
    else {
      img.addEventListener("load", ready, { once: true });
      img.addEventListener("error", ready, { once: true });
    }
  }
  function scan(root) {
    (root || document).querySelectorAll(".mtk-q-text img, .eg-q-text img, .qx-question-body img, .mtk-opt-text img, .sol-body img").forEach(mark);
  }
  function preloadUrls(urls) {
    (urls || []).forEach(function (u) {
      if (!u) return;
      try {
        var i = new Image();
        i.decoding = "async";
        i.src = u;
      } catch (_) { /* */ }
    });
  }
  window.qxPreloadQuestionImages = function (htmlOrEl) {
    var urls = [];
    try {
      var tmp = typeof htmlOrEl === "string" ? document.createElement("div") : htmlOrEl;
      if (typeof htmlOrEl === "string") tmp.innerHTML = htmlOrEl;
      if (tmp) tmp.querySelectorAll("img[src]").forEach(function (img) { urls.push(img.getAttribute("src")); });
    } catch (_) { /* */ }
    preloadUrls(urls);
  };
  var queued = false;
  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; scan(document); });
  }
  function start() {
    scan(document);
    try { new MutationObserver(queue).observe(document.body, { childList: true, subtree: true }); } catch (_) { /* */ }
  }
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
