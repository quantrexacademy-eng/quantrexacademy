(function () {
  if (!("serviceWorker" in navigator)) return;
  var bust = (typeof window.QX_BUILD === "string" && window.QX_BUILD) || "qxmd293";

  function hardReload() {
    try {
      var k = "qx_hard_" + bust;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch (_) { /* */ }
    var go = function () {
      try {
        var u = new URL(window.location.href);
        u.searchParams.set("v", bust);
        u.searchParams.set("_qx", String(Date.now()));
        window.location.replace(u.toString());
      } catch (_) {
        window.location.reload();
      }
    };
    try {
      caches.keys().then(function (keys) {
        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
      }).then(function () {
        if (navigator.serviceWorker.getRegistrations) {
          return navigator.serviceWorker.getRegistrations().then(function (regs) {
            return Promise.all(regs.map(function (r) { return r.unregister(); }));
          });
        }
      }).then(go).catch(go);
    } catch (_) {
      go();
    }
  }

  function checkVersion() {
    fetch("/version.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) {
        if (v && v.build && String(v.build) !== String(bust)) hardReload();
      })
      .catch(function () {});
  }

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js?v=" + encodeURIComponent(bust)).then(function (reg) {
      if (reg.waiting) {
        try { reg.waiting.postMessage({ type: "SKIP_WAITING" }); } catch (_) {}
      }
      reg.addEventListener("updatefound", function () {
        var w = reg.installing;
        if (!w) return;
        w.addEventListener("statechange", function () {
          if (w.state === "installed") {
            try { if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" }); } catch (_) {}
          }
        });
      });
      try { reg.update(); } catch (_) {}
    }).catch(function () {});
    checkVersion();
  });

  try { checkVersion(); } catch (_) {}

  try {
    navigator.serviceWorker.addEventListener("message", function (ev) {
      var d = ev && ev.data;
      if (d && d.type === "QX_UPDATED" && d.build && String(d.build) !== String(bust)) hardReload();
    });
  } catch (_) {}

  var reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
})();
