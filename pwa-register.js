(function () {
  if (!("serviceWorker" in navigator)) return;
  /* qxmd328: the site build is THIS constant (bumped every release), not the page's QX_BUILD.
     login.html / index.html carry old page tags (qxlogin1, qxfix106) which never matched
     version.json and wiped every cache + reloaded on every new session. */
  var SITE_BUILD = "qxmd328";
  var pageBuild = (typeof window.QX_BUILD === "string" && /^qxmd\d+$/.test(window.QX_BUILD)) ? window.QX_BUILD : "";
  var bust = SITE_BUILD;
  if (pageBuild && Number(pageBuild.slice(4)) > Number(SITE_BUILD.slice(4))) bust = pageBuild;
  function buildNum(b) { var m = /^qxmd(\d+)$/.exec(String(b || "")); return m ? Number(m[1]) : 0; }

  function hardReload(target) {
    target = String(target || "");
    if (!target) return;
    /* Failsafe: at most one forced reload per target build per device (localStorage),
       plus a session guard, so a stale CDN copy can never cause repeated reloads. */
    try {
      var k = "qx_hard_" + target;
      if (sessionStorage.getItem(k) || localStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
      localStorage.setItem(k, "1");
    } catch (_) { return; }
    var go = function () {
      try {
        var u = new URL(window.location.href);
        u.searchParams.set("v", target);
        u.searchParams.set("_qx", String(Date.now()));
        window.location.replace(u.toString());
      } catch (_) {
        window.location.reload();
      }
    };
    try {
      caches.keys().then(function (keys) {
        /* keep the long-lived figure cache (content-addressed proxy images) */
        return Promise.all(keys.filter(function (k) { return k.indexOf("qx-img-") !== 0; }).map(function (k) { return caches.delete(k); }));
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
        /* Only a strictly NEWER release forces an update (never older/odd tags). */
        if (v && v.build && buildNum(v.build) > buildNum(bust)) hardReload(v.build);
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
      if (d && d.type === "QX_UPDATED" && d.build && buildNum(d.build) > buildNum(bust)) hardReload(d.build);
    });
  } catch (_) {}

  var reloading = false;
  var hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    /* first install claiming the page is not an update -> no reload */
    if (!hadController) { hadController = true; return; }
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
})();
