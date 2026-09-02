(function () {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", function () {
    var bust = (typeof window.QX_BUILD === "string" && window.QX_BUILD) || "qxfix115";
    navigator.serviceWorker.register("/sw.js?v=" + encodeURIComponent(bust)).then(function (reg) {
      function tell() {
        try { window.dispatchEvent(new CustomEvent("qx-sw-update")); } catch (_) {}
      }
      if (reg.waiting) tell();
      reg.addEventListener("updatefound", function () {
        var w = reg.installing;
        if (!w) return;
        w.addEventListener("statechange", function () {
          if (w.state === "installed" && navigator.serviceWorker.controller) tell();
        });
      });
    }).catch(function () {});
    var reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", function() {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
    navigator.serviceWorker.addEventListener("message", function (ev) {
      var d = ev && ev.data;
      if (!d) return;
      if (d.type === "QX_SW_WAITING" || d.type === "QX_UPDATED") {
        try { window.dispatchEvent(new CustomEvent("qx-sw-update")); } catch (_) {}
      }
    });
  });
})();
