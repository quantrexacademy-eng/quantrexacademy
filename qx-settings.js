/**
 * Quantrex Academy — dedicated mobile Settings screen.
 * Additive UX: prefs in localStorage; uses QuantrexTheme + setTestFontScale when present.
 * Does not touch payments, question bank, or book covers.
 */
(function (global) {
  "use strict";

  var PREF = {
    push: "qx_pref_push_notif",
    email: "qx_pref_email_notif",
    font: "quantrex_test_font_scale"
  };

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function lsGet(k, fallback) {
    try {
      var v = localStorage.getItem(k);
      return v == null ? fallback : v;
    } catch (_) {
      return fallback;
    }
  }

  function lsSet(k, v) {
    try { localStorage.setItem(k, v); } catch (_) { /* */ }
  }

  function getPush() {
    return lsGet(PREF.push, "1") !== "0";
  }

  function setPush(on) {
    lsSet(PREF.push, on ? "1" : "0");
    if (on) {
      try {
        if ("Notification" in window && Notification.permission === "default") {
          Notification.requestPermission().catch(function () {});
        }
      } catch (_) { /* */ }
    }
  }

  function getEmail() {
    return lsGet(PREF.email, "1") !== "0";
  }

  function setEmail(on) {
    lsSet(PREF.email, on ? "1" : "0");
  }

  function getTheme() {
    if (typeof QuantrexTheme !== "undefined" && QuantrexTheme.get) return QuantrexTheme.get();
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function setTheme(mode) {
    var m = mode === "light" ? "light" : "dark";
    if (typeof QuantrexTheme !== "undefined" && QuantrexTheme.apply) QuantrexTheme.apply(m);
    else {
      document.documentElement.setAttribute("data-theme", m);
      lsSet("quantrex_theme", m);
    }
  }

  function getFont() {
    if (typeof getTestFontScale === "function") {
      var s = getTestFontScale();
      if (s === "xlarge") return "large";
      return s || "medium";
    }
    var v = lsGet(PREF.font, "medium");
    if (v === "xlarge") return "large";
    return v === "small" || v === "large" ? v : "medium";
  }

  function setFont(scale) {
    var s = scale === "small" || scale === "large" ? scale : "medium";
    if (typeof setTestFontScale === "function") setTestFontScale(s);
    else if (typeof applyTestFontScaleToDom === "function") applyTestFontScaleToDom(s);
    else {
      lsSet(PREF.font, s);
      document.documentElement.setAttribute("data-font-scale", s);
      if (document.body) document.body.setAttribute("data-font-scale", s);
      document.documentElement.style.setProperty("--qx-q-font", s === "small" ? "14px" : s === "large" ? "18px" : "16px");
    }
  }

  function profileData() {
    if (typeof QxProfile !== "undefined" && QxProfile.get) return QxProfile.get();
    try {
      return JSON.parse(localStorage.getItem("quantrex_profile") || "{}") || {};
    } catch (_) {
      return {};
    }
  }

  function targetYear(p) {
    p = p || profileData();
    if (p.targetYear) return String(p.targetYear);
    try {
      return localStorage.getItem("qx_target_year") || "";
    } catch (_) {
      return "";
    }
  }

  function injectCss() {
    if (document.getElementById("qxSettingsCss")) return;
    var css = document.createElement("style");
    css.id = "qxSettingsCss";
    css.textContent = [
      ".qx-settings-page{max-width:560px;margin:0 auto;padding:12px 14px 96px}",
      ".qx-settings-page h1{font-family:Kanit,sans-serif;font-size:24px;margin:4px 0 6px}",
      ".qx-settings-page .qx-set-sub{color:var(--gray,#64748b);font-size:13px;margin:0 0 16px;line-height:1.45}",
      ".qx-set-card{background:var(--card,#fff);border:1px solid var(--border,#e2e8f0);border-radius:14px;overflow:hidden;margin-bottom:14px}",
      "html[data-theme=dark] .qx-set-card{background:#1a1d26;border-color:#2a2f3d}",
      ".qx-set-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border,#e2e8f0);min-height:52px}",
      ".qx-set-row:last-child{border-bottom:0}",
      "html[data-theme=dark] .qx-set-row{border-bottom-color:#2a2f3d}",
      ".qx-set-row label,.qx-set-lab{font-size:15px;font-weight:600;color:var(--dark,#0f172a)}",
      "html[data-theme=dark] .qx-set-lab{color:#e2e8f0}",
      ".qx-set-hint{display:block;font-size:11px;font-weight:500;color:var(--gray,#64748b);margin-top:2px}",
      ".qx-set-toggle{appearance:none;-webkit-appearance:none;width:46px;height:28px;border-radius:999px;background:#cbd5e1;border:0;position:relative;cursor:pointer;flex-shrink:0;transition:background .2s}",
      ".qx-set-toggle::after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:transform .2s}",
      ".qx-set-toggle.on{background:#2563eb}",
      ".qx-set-toggle.on::after{transform:translateX(18px)}",
      ".qx-set-seg{display:inline-flex;background:var(--bg,#f1f5f9);border-radius:10px;padding:3px;gap:2px}",
      "html[data-theme=dark] .qx-set-seg{background:#0f172a}",
      ".qx-set-seg button{border:0;background:transparent;padding:7px 12px;border-radius:8px;font-size:12px;font-weight:700;color:var(--gray,#64748b);cursor:pointer}",
      ".qx-set-seg button.on{background:var(--card,#fff);color:var(--dark,#0f172a);box-shadow:0 1px 2px rgba(0,0,0,.08)}",
      "html[data-theme=dark] .qx-set-seg button.on{background:#1e293b;color:#f1f5f9}",
      ".qx-set-form{padding:14px 16px;display:flex;flex-direction:column;gap:10px}",
      ".qx-set-form label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;color:var(--gray,#64748b)}",
      ".qx-set-form input,.qx-set-form select{font:inherit;font-size:14px;font-weight:600;padding:10px 12px;border-radius:10px;border:1px solid var(--border,#e2e8f0);background:var(--bg,#f8fafc);color:var(--dark,#0f172a)}",
      "html[data-theme=dark] .qx-set-form input,html[data-theme=dark] .qx-set-form select{background:#0f172a;border-color:#334155;color:#e2e8f0}",
      ".qx-set-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}",
      ".qx-set-actions .btn-primary,.qx-set-actions .btn-soft{flex:1;min-width:120px}",
      ".qx-set-link{display:flex;align-items:center;justify-content:space-between;width:100%;border:0;background:transparent;padding:14px 16px;font:inherit;font-size:15px;font-weight:600;cursor:pointer;color:var(--dark,#0f172a);text-align:left}",
      "html[data-theme=dark] .qx-set-link{color:#e2e8f0}",
      ".qx-set-link .chev{opacity:.45}",
      ".qx-set-back{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;color:#2563eb;font-weight:700;font-size:13px;padding:0;margin-bottom:8px;cursor:pointer}",
      "@media (max-width:720px){.qx-settings-page{padding-bottom:110px}}"
    ].join("");
    document.head.appendChild(css);
  }

  function toggleHtml(id, on) {
    return '<button type="button" class="qx-set-toggle' + (on ? " on" : "") + '" id="' + id + '" role="switch" aria-checked="' + (on ? "true" : "false") + '"></button>';
  }

  function segHtml(id, cur, opts) {
    return '<div class="qx-set-seg" id="' + id + '" role="group">' + opts.map(function (o) {
      return '<button type="button" data-val="' + o.v + '" class="' + (cur === o.v ? "on" : "") + '">' + esc(o.l) + "</button>";
    }).join("") + "</div>";
  }

  function renderHtml() {
    injectCss();
    var p = profileData();
    var theme = getTheme();
    var font = getFont();
    var year = targetYear(p);
    var name = p.name || "";
    var exam = p.exam || (p.exams && p.exams[0]) || lsGet("quantrex_exam", "") || "";
    var cls = p.className || lsGet("qx_student_class", "") || "";

    return (
      '<div class="qx-settings-page" id="qxSettingsRoot">' +
      '<button type="button" class="qx-set-back" id="qxSetBack">← Back</button>' +
      "<h1>Settings</h1>" +
      '<p class="qx-set-sub">Notifications, profile, theme and question text size. Works for guests — no login required.</p>' +

      '<div class="qx-set-card">' +
      '<div class="qx-set-row"><div><span class="qx-set-lab">Push Notifications</span><span class="qx-set-hint">Update alerts &amp; reminders (device)</span></div>' +
      toggleHtml("qxSetPush", getPush()) + "</div>" +
      '<div class="qx-set-row"><div><span class="qx-set-lab">Email Notifications</span><span class="qx-set-hint">Preference stub — saved on this device</span></div>' +
      toggleHtml("qxSetEmail", getEmail()) + "</div>" +
      "</div>" +

      '<div class="qx-set-card">' +
      '<div class="qx-set-row"><div><span class="qx-set-lab">Theme</span><span class="qx-set-hint">Light or dark app chrome</span></div>' +
      segHtml("qxSetTheme", theme, [{ v: "light", l: "Light" }, { v: "dark", l: "Dark" }]) +
      "</div>" +
      '<div class="qx-set-row"><div><span class="qx-set-lab">Question font size</span><span class="qx-set-hint">Applies to CBT / practice text</span></div>' +
      segHtml("qxSetFont", font, [{ v: "small", l: "S" }, { v: "medium", l: "M" }, { v: "large", l: "L" }]) +
      "</div>" +
      "</div>" +

      '<div class="qx-set-card">' +
      '<div class="qx-set-row" style="border-bottom:0;padding-bottom:4px"><span class="qx-set-lab">Edit Profile</span></div>' +
      '<div class="qx-set-form">' +
      "<label>Full name<input id=\"qxSetName\" type=\"text\" maxlength=\"48\" autocomplete=\"name\" value=\"" + esc(name) + "\" placeholder=\"Your name\"></label>" +
      "<label>Target exam<input id=\"qxSetExam\" type=\"text\" maxlength=\"48\" value=\"" + esc(exam) + "\" placeholder=\"e.g. JEE Main\"></label>" +
      "<label>Class / year<select id=\"qxSetClass\">" +
      ["", "7", "8", "9", "10", "11", "12", "Other"].map(function (c) {
        var lab = c === "" ? "Select class" : c === "Other" ? "Other" : ("Class " + c);
        return '<option value="' + esc(c) + '"' + (String(cls) === c ? " selected" : "") + ">" + esc(lab) + "</option>";
      }).join("") +
      "</select></label>" +
      "<label>Target year<input id=\"qxSetYear\" type=\"text\" maxlength=\"8\" inputmode=\"numeric\" value=\"" + esc(year) + "\" placeholder=\"e.g. 2027\"></label>" +
      '<div class="qx-set-actions">' +
      '<button type="button" class="btn-primary" id="qxSetSaveProf">Save profile</button>' +
      '<button type="button" class="btn-soft" id="qxSetOpenId">Academy ID</button>' +
      "</div></div></div>" +

      '<div class="qx-set-card">' +
      '<div class="qx-set-row" style="border-bottom:0;padding-bottom:4px"><span class="qx-set-lab">Study modes</span></div>' +
      '<button type="button" class="qx-set-link" id="qxSetPractice"><span><span class="qx-set-lab">Practice</span><span class="qx-set-hint">Quantrex-best · flexible · no exam timer</span></span><span class="chev">›</span></button>' +
      '<button type="button" class="qx-set-link" id="qxSetMock"><span><span class="qx-set-lab">Realistic Mock / Test Series</span><span class="qx-set-hint">NTA-exact CBT · timer · Mark for Review · Submit</span></span><span class="chev">›</span></button>' +
      '<button type="button" class="qx-set-link" id="qxSetStreak"><span><span class="qx-set-lab">Daily goal &amp; streak</span><span class="qx-set-hint">' +
      (function () {
        try {
          var d = JSON.parse(localStorage.getItem("quantrex_examgoal_streak_v1") || "{}");
          var n = d.count || 0;
          return n ? (n + "-day streak") : "Track consistency from Test Series";
        } catch (_) { return "Track consistency from Test Series"; }
      })() +
      '</span></span><span class="chev">›</span></button>' +
      "</div>" +

      '<div class="qx-set-card">' +
      '<button type="button" class="qx-set-link" id="qxSetHelp">Help &amp; Inquiry<span class="chev">›</span></button>' +
      "</div>" +
      "</div>"
    );
  }

  function bind(root) {
    root = root || document.getElementById("qxSettingsRoot") || document.getElementById("app-main");
    if (!root) return;

    var back = root.querySelector("#qxSetBack");
    if (back) back.onclick = function () {
      if (typeof go === "function") go("profile");
      else history.back();
    };

    function wireToggle(btn, getter, setter) {
      if (!btn) return;
      btn.onclick = function () {
        var next = !btn.classList.contains("on");
        setter(next);
        btn.classList.toggle("on", next);
        btn.setAttribute("aria-checked", next ? "true" : "false");
        if (typeof showToast === "function") showToast(next ? "Enabled" : "Disabled");
      };
    }
    wireToggle(root.querySelector("#qxSetPush"), getPush, setPush);
    wireToggle(root.querySelector("#qxSetEmail"), getEmail, setEmail);

    function wireSeg(el, apply) {
      if (!el) return;
      el.querySelectorAll("button").forEach(function (b) {
        b.onclick = function () {
          var v = b.getAttribute("data-val");
          apply(v);
          el.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
        };
      });
    }
    wireSeg(root.querySelector("#qxSetTheme"), function (v) {
      setTheme(v);
      if (typeof showToast === "function") showToast(v === "dark" ? "Dark mode" : "Light mode");
    });
    wireSeg(root.querySelector("#qxSetFont"), function (v) {
      setFont(v);
      if (typeof showToast === "function") showToast("Font: " + v);
    });

    var save = root.querySelector("#qxSetSaveProf");
    if (save) save.onclick = function () {
      var name = (root.querySelector("#qxSetName").value || "").trim();
      var exam = (root.querySelector("#qxSetExam").value || "").trim();
      var className = root.querySelector("#qxSetClass").value || "";
      var year = (root.querySelector("#qxSetYear").value || "").trim().replace(/\D/g, "").slice(0, 4);
      if (name && name.length < 2) {
        if (typeof showToast === "function") showToast("Enter a valid name");
        return;
      }
      try { if (year) localStorage.setItem("qx_target_year", year); } catch (_) { /* */ }
      if (typeof QxProfile !== "undefined" && QxProfile.save) {
        QxProfile.save({
          name: name || profileData().name,
          exam: exam,
          exams: exam ? [exam] : (profileData().exams || []),
          className: className,
          targetYear: year
        });
      } else {
        try {
          var cur = profileData();
          cur.name = name || cur.name;
          cur.exam = exam;
          cur.className = className;
          cur.targetYear = year;
          localStorage.setItem("quantrex_profile", JSON.stringify(cur));
          if (className) localStorage.setItem("qx_student_class", className);
          if (exam) localStorage.setItem("quantrex_exam", exam);
        } catch (_) { /* */ }
      }
      if (typeof showToast === "function") showToast("Profile saved");
      try { if (typeof QxProfile !== "undefined" && QxProfile.mountChrome) QxProfile.mountChrome(); } catch (_) { /* */ }
    };

    var openId = root.querySelector("#qxSetOpenId");
    if (openId) openId.onclick = function () {
      if (typeof go === "function") go("profile");
    };

    var help = root.querySelector("#qxSetHelp");
    if (help) help.onclick = function () { location.href = "help.html"; };

    function goView(v, payload) {
      if (typeof go === "function") go(v, payload);
      else if (v === "testseries") location.href = "quantrex-test-series.html";
      else if (v === "practice") location.href = "app.html#practice";
    }
    var prac = root.querySelector("#qxSetPractice");
    if (prac) prac.onclick = function () { goView("practice"); };
    var mock = root.querySelector("#qxSetMock");
    if (mock) mock.onclick = function () {
      try { localStorage.setItem("ts_last_ui_mode", "quizrr"); } catch (_) {}
      goView("testseries");
    };
    var streak = root.querySelector("#qxSetStreak");
    if (streak) streak.onclick = function () {
      try { localStorage.setItem("ts_last_ui_mode", "quizrr"); } catch (_) {}
      goView("testseries");
      if (typeof showToast === "function") showToast("Open Test Series desk for streak & daily targets");
    };
  }

  function viewSettings() {
    injectCss();
    var html = renderHtml();
    if (typeof finishRender === "function") {
      finishRender(html);
      bind(document.getElementById("app-main"));
      return;
    }
    var main = document.getElementById("app-main");
    if (main) {
      main.innerHTML = html;
      bind(main);
    }
    return html;
  }

  function open() {
    try {
      if (location.hash !== undefined) {
        var h = String(location.hash || "");
        if (h.indexOf("settings") < 0) location.hash = "settings";
      }
    } catch (_) { /* */ }
    if (typeof go === "function") go("settings");
    else viewSettings();
  }

  function patchNav() {
    try {
      var list = document.getElementById("navMoreList");
      if (list && !list.querySelector('[data-view="settings"]')) {
        var el = document.createElement("div");
        el.className = "nav-item";
        el.setAttribute("data-view", "settings");
        el.innerHTML = '<span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.22-1.12.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 14.5a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.24l2.39-.96c.5.41 1.05.73 1.63.94l.36 2.54c.05.24.25.42.49.42h3.8c.24 0 .44-.18.49-.42l.36-2.54c.58-.22 1.12-.53 1.63-.94l2.39.96c.25.1.54 0 .68-.24l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z"/></svg></span> Settings';
        list.insertBefore(el, list.firstChild);
      }
      // Profile sidebar: ensure Settings sits near Profile if missing
      var nav = document.querySelector("aside nav, .sidebar nav, #sideNav");
      if (nav && !nav.querySelector('[data-view="settings"]') && nav.querySelector('[data-view="profile"]')) {
        var prof = nav.querySelector('[data-view="profile"]');
        var s2 = document.createElement("div");
        s2.className = "nav-item";
        s2.setAttribute("data-view", "settings");
        s2.innerHTML = '<span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54c-.58.22-1.12.53-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 14.5a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.24l2.39-.96c.5.41 1.05.73 1.63.94l.36 2.54c.05.24.25.42.49.42h3.8c.24 0 .44-.18.49-.42l.36-2.54c.58-.22 1.12-.53 1.63-.94l2.39.96c.25.1.54 0 .68-.24l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z"/></svg></span> Settings';
        if (prof.nextSibling) prof.parentNode.insertBefore(s2, prof.nextSibling);
        else prof.parentNode.appendChild(s2);
      }
    } catch (_) { /* */ }
  }

  function patchProfileView() {
    // Soft-hook: after profile renders, inject a Settings button if missing
    var _fr = global.finishRender;
    if (typeof _fr !== "function" || _fr.__qxSettingsHooked) return;
    function wrapped(html) {
      var out = _fr.apply(this, arguments);
      try {
        var main = document.getElementById("app-main");
        if (!main) return out;
        var isProfile = /Academy ID|Edit ID|qx-id-mini|viewProfile/i.test(main.innerHTML) ||
          (document.body && /profile/i.test(document.body.getAttribute("data-qx-view") || ""));
        if (isProfile && !main.querySelector("#qxOpenSettingsBtn")) {
          var bar = document.createElement("div");
          bar.style.cssText = "max-width:560px;margin:12px auto 0;padding:0 14px";
          bar.innerHTML = '<button type="button" class="btn-primary" id="qxOpenSettingsBtn" style="width:100%">Settings</button>';
          var anchor = main.querySelector(".qx-set-card, .profile-card, .qx-id-card, .btn-soft") || main.firstElementChild;
          if (anchor && anchor.parentNode) {
            if (anchor.classList && anchor.classList.contains("btn-soft")) {
              main.insertBefore(bar, anchor.parentNode.nextSibling);
            } else {
              main.insertBefore(bar, anchor.nextSibling);
            }
          } else {
            main.appendChild(bar);
          }
          var btn = document.getElementById("qxOpenSettingsBtn");
          if (btn) btn.onclick = function () { open(); };
        }
      } catch (_) { /* */ }
      return out;
    }
    wrapped.__qxSettingsHooked = true;
    global.finishRender = wrapped;
  }

  function registerRoute() {
    try {
      if (typeof global.viewSettings !== "function") global.viewSettings = viewSettings;
      // Common patterns in app.js
      if (global.VIEWS && !global.VIEWS.settings) global.VIEWS.settings = viewSettings;
      if (global.PAGES && !global.PAGES.settings) global.PAGES.settings = viewSettings;
      if (global.views && !global.views.settings) global.views.settings = viewSettings;
    } catch (_) { /* */ }

    // Wrap go() so settings route works even before app.js map is patched
    if (typeof global.go === "function" && !global.go.__qxSettings) {
      var _go = global.go;
      function goWrap(view, payload) {
        if (String(view) === "settings") {
          try {
            if (document.body) document.body.setAttribute("data-qx-view", "settings");
          } catch (_) { /* */ }
          viewSettings();
          try {
            document.querySelectorAll(".nav-item").forEach(function (n) {
              n.classList.toggle("active", n.getAttribute("data-view") === "settings");
            });
          } catch (_) { /* */ }
          return;
        }
        return _go.apply(this, arguments);
      }
      goWrap.__qxSettings = true;
      global.go = goWrap;
    }
  }

  function boot() {
    injectCss();
    // Apply persisted font early
    try { setFont(getFont()); } catch (_) { /* */ }
    patchNav();
    patchProfileView();
    registerRoute();
    // Re-register after app.js may overwrite go
    setTimeout(registerRoute, 0);
    setTimeout(registerRoute, 800);
    setTimeout(patchNav, 900);
  }

  var api = {
    view: viewSettings,
    open: open,
    renderHtml: renderHtml,
    bind: bind,
    getPush: getPush,
    setPush: setPush,
    getEmail: getEmail,
    setEmail: setEmail,
    getFont: getFont,
    setFont: setFont
  };
  global.QxSettings = api;
  global.viewSettings = viewSettings;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : globalThis);
