/**
 * Quantrex Academy — dedicated mobile Settings screen.
 * Additive UX: prefs in localStorage; uses QuantrexTheme + setTestFontScale when present.
 * Does not touch payments, question bank, or book covers.
 */
(function (global) {
  "use strict";

  var PARITY = "qxeg1";
  var PREF = {
    push: "qx_pref_push_notif",
    email: "qx_pref_email_notif",
    font: "quantrex_test_font_scale",
    palette: "qx_eg_palette_mode"
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

  function getPaletteMode() {
    /* qxmd167: default side (right sidebar only) — simpler/faster than Both */
    var v = lsGet(PREF.palette, "side");
    return v === "side" || v === "strip" || v === "both" ? v : "side";
  }

  function setPaletteMode(mode) {
    var m = mode === "side" || mode === "strip" || mode === "both" ? mode : "side";
    lsSet(PREF.palette, m);
    return m;
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
    var cssEl = document.getElementById("qxSettingsCss");
    if (cssEl) cssEl.remove();
    var css = document.createElement("style");
    css.id = "qxSettingsCss";
    /* Marks mobile Settings: clean sheet — Push / Email / Edit Profile */
    css.textContent = [
      ".qx-settings-page{max-width:480px;margin:0 auto;padding:8px 0 110px;background:var(--card,#fff);min-height:100%}",
      "html[data-theme=dark] .qx-settings-page{background:#111827}",
      ".qx-settings-page .qx-set-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 12px;border-bottom:1px solid #e5e7eb}",
      "html[data-theme=dark] .qx-settings-page .qx-set-head{border-bottom-color:#1f2937}",
      ".qx-settings-page .qx-set-head h1{font-size:22px;font-weight:800;margin:0;color:#0f172a;font-family:inherit}",
      "html[data-theme=dark] .qx-settings-page .qx-set-head h1{color:#f8fafc}",
      ".qx-settings-page .qx-set-close{appearance:none;border:0;background:#0f172a;color:#fff;width:36px;height:36px;border-radius:999px;font-size:18px;cursor:pointer;line-height:1}",
      "html[data-theme=dark] .qx-settings-page .qx-set-close{background:#e5e7eb;color:#111}",
      ".qx-settings-page .qx-set-list{padding:8px 0}",
      ".qx-settings-page .qx-set-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 18px;background:transparent;border:0;width:100%;text-align:left;min-height:56px}",
      ".qx-settings-page .qx-set-lab{font-size:16px;font-weight:600;color:#0f172a}",
      "html[data-theme=dark] .qx-settings-page .qx-set-lab{color:#f1f5f9}",
      ".qx-settings-page .qx-set-hint{display:none}",
      ".qx-set-toggle{appearance:none;-webkit-appearance:none;width:48px;height:28px;border-radius:999px;background:#cbd5e1;border:0;position:relative;cursor:pointer;flex-shrink:0;transition:background .2s}",
      ".qx-set-toggle::after{content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:transform .2s}",
      ".qx-set-toggle.on{background:#2563eb}",
      ".qx-set-toggle.on::after{transform:translateX(20px)}",
      ".qx-set-edit-ico{width:22px;height:22px;color:#64748b;flex-shrink:0}",
      ".qx-set-profile-panel{display:none;padding:8px 18px 24px}",
      ".qx-settings-page.is-editing .qx-set-list{display:none}",
      ".qx-settings-page.is-editing .qx-set-profile-panel{display:block}",
      ".qx-set-profile-panel h2{font-size:18px;margin:8px 0 14px;color:#0f172a}",
      "html[data-theme=dark] .qx-set-profile-panel h2{color:#f8fafc}",
      ".qx-set-form{display:flex;flex-direction:column;gap:12px}",
      ".qx-set-form label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;color:#64748b}",
      ".qx-set-form input,.qx-set-form select{font:inherit;font-size:15px;font-weight:600;padding:12px 14px;border-radius:12px;border:1px solid #e2e8f0;background:#f8fafc;color:#0f172a}",
      "html[data-theme=dark] .qx-set-form input,html[data-theme=dark] .qx-set-form select{background:#0f172a;border-color:#334155;color:#e2e8f0}",
      ".qx-set-actions{display:flex;gap:8px;margin-top:8px}",
      ".qx-set-actions .btn-primary,.qx-set-actions .btn-soft{flex:1;min-width:120px}",
      ".qx-set-extra{margin-top:8px;padding:0 18px 8px;border-top:1px solid #f1f5f9}",
      "html[data-theme=dark] .qx-set-extra{border-top-color:#1f2937}",
      ".qx-set-extra .qx-set-row{padding:14px 0}",
      ".qx-set-seg{display:inline-flex;background:#f1f5f9;border-radius:10px;padding:3px;gap:2px}",
      "html[data-theme=dark] .qx-set-seg{background:#0f172a}",
      ".qx-set-seg button{border:0;background:transparent;padding:7px 10px;border-radius:8px;font-size:12px;font-weight:700;color:#64748b;cursor:pointer;min-width:0}","@media (max-width:420px){.qx-set-seg button{padding:6px 8px;font-size:11px}}",
      ".qx-set-seg button.on{background:#fff;color:#0f172a;box-shadow:0 1px 2px rgba(0,0,0,.08)}",
      "html[data-theme=dark] .qx-set-seg button.on{background:#1e293b;color:#f1f5f9}",
      ".qx-set-exam-sec{padding:14px 18px 18px;border-bottom:1px solid #e5e7eb}",
      "html[data-theme=dark] .qx-set-exam-sec{border-bottom-color:#1f2937}",
      ".qx-set-exam-sec h2{font-size:15px;font-weight:800;margin:0 0 4px;color:#0f172a;letter-spacing:-.01em}",
      "html[data-theme=dark] .qx-set-exam-sec h2{color:#f8fafc}",
      ".qx-set-exam-sec .qx-set-exam-sub{font-size:12px;color:#64748b;margin:0 0 12px;line-height:1.35}",
      ".qx-set-exam-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}",
      ".qx-set-exam-card{appearance:none;border:2px solid #e2e8f0;background:#f8fafc;border-radius:16px;padding:16px 12px;min-height:88px;cursor:pointer;text-align:left;font:inherit;display:flex;flex-direction:column;gap:4px;transition:border-color .12s,box-shadow .12s,background .12s;-webkit-tap-highlight-color:transparent;touch-action:manipulation}",
      "html[data-theme=dark] .qx-set-exam-card{background:#0f172a;border-color:#334155;color:#e2e8f0}",
      ".qx-set-exam-card:active{transform:scale(.98)}",
      ".qx-set-exam-card.on{border-color:#0d9488;background:linear-gradient(135deg,rgba(13,148,136,.12),rgba(99,102,241,.1));box-shadow:0 4px 14px rgba(13,148,136,.18)}",
      ".qx-set-exam-card .qx-set-exam-ic{font-size:22px;line-height:1}",
      ".qx-set-exam-card strong{font-size:14px;font-weight:800;color:#0f172a}",
      "html[data-theme=dark] .qx-set-exam-card strong{color:#f1f5f9}",
      ".qx-set-exam-card small{font-size:11px;font-weight:600;color:#64748b}",
      ".qx-settings-page.is-editing .qx-set-exam-sec{display:none}",
      "@media (max-width:720px){.qx-settings-page{padding-bottom:120px}.qx-set-exam-card{min-height:96px;padding:18px 14px}}"
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

  function pencilSvg() {
    return '<svg class="qx-set-edit-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  }


  function currentExamKey() {
    try {
      if (typeof STATE !== "undefined" && STATE && STATE.exam) return STATE.exam;
    } catch (_) {}
    return lsGet("quantrex_exam", "") || "Engineering";
  }

  function examTrackHtml() {
    var cur = currentExamKey();
    if (cur === "Foundation") cur = "Academic";
    var tracks = [
      { k: "Engineering", ic: "⚙️", title: "Engineering (JEE)", sub: "JEE Main & Advanced" },
      { k: "Medical", ic: "⚕️", title: "Medical (NEET)", sub: "NEET UG" },
      { k: "Defence", ic: "🎖️", title: "Defence (NDA)", sub: "NDA & Defence" },
      { k: "Academic", ic: "📚", title: "Academic", sub: "Class 7–12" }
    ];
    var cards = tracks.map(function (t) {
      var on = cur === t.k ? " on" : "";
      return (
        '<button type="button" class="qx-set-exam-card' + on + '" data-exam="' + t.k + '" aria-pressed="' + (cur === t.k ? "true" : "false") + '">' +
        '<span class="qx-set-exam-ic" aria-hidden="true">' + t.ic + "</span>" +
        "<strong>" + esc(t.title) + "</strong>" +
        "<small>" + esc(t.sub) + "</small>" +
        "</button>"
      );
    }).join("");
    return (
      '<div class="qx-set-exam-sec" id="qxSetExamSec">' +
      "<h2>Choose exam track</h2>" +
      '<p class="qx-set-exam-sub">Pick your track — Engineering · Medical · Defence · Academic. Changes home, PYQ &amp; tests.</p>' +
      '<div class="qx-set-exam-grid" role="group" aria-label="Choose exam track">' + cards + "</div></div>"
    );
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
      '<div class="qx-settings-page qx-marks-settings" id="qxSettingsRoot">' +
      '<div class="qx-set-head"><h1>Settings</h1>' +
      '<button type="button" class="qx-set-close" id="qxSetBack" title="Close" aria-label="Close">×</button></div>' +

      /* Choose exam track — impossible to miss on phone */
      examTrackHtml() +

      /* Marks-exact primary list */
      '<div class="qx-set-list" id="qxSetMainList">' +
      '<div class="qx-set-row"><span class="qx-set-lab">Push Notifications</span>' +
      toggleHtml("qxSetPush", getPush()) + "</div>" +
      '<div class="qx-set-row"><span class="qx-set-lab">Email Notifications</span>' +
      toggleHtml("qxSetEmail", getEmail()) + "</div>" +
      '<button type="button" class="qx-set-row" id="qxSetEditProfile">' +
      '<span class="qx-set-lab">Edit Profile</span>' + pencilSvg() +
      "</button>" +

      /* compact extras (ExamGoal-like readability) under same sheet */
      '<div class="qx-set-extra">' +
      '<div class="qx-set-row"><span class="qx-set-lab">Theme</span>' +
      segHtml("qxSetTheme", theme, [{ v: "light", l: "Light" }, { v: "dark", l: "Dark" }]) +
      "</div>" +
      '<div class="qx-set-row"><span class="qx-set-lab">Question font</span>' +
      segHtml("qxSetFont", font, [{ v: "small", l: "S" }, { v: "medium", l: "M" }, { v: "large", l: "L" }]) +
      "</div>" +
      '<div class="qx-set-row"><span class="qx-set-lab">Practice palette</span>' +
      segHtml("qxSetPalette", getPaletteMode(), [{ v: "side", l: "Right" }, { v: "strip", l: "Top" }, { v: "both", l: "Both" }]) +
      "</div></div></div>" +

      /* Edit Profile panel (Marks Edit >) */
      '<div class="qx-set-profile-panel" id="qxSetProfilePanel">' +
      "<h2>Edit Profile</h2>" +
      '<div class="qx-set-form">' +
      "<label>Full name<input id=\"qxSetName\" type=\"text\" maxlength=\"48\" autocomplete=\"name\" value=\"" + esc(name) + "\" placeholder=\"Your name\"></label>" +
      "<label>Target exam<input id=\"qxSetExam\" type=\"text\" maxlength=\"48\" value=\"" + esc(exam) + "\" placeholder=\"e.g. JEE Main\"></label>" +
      "<label>Class / year<select id=\"qxSetClass\">" +
      ["", "7", "8", "9", "10", "11", "12", "Dropper", "Other"].map(function (c) {
        var lab = c === "" ? "Select class" : (c === "Dropper" || c === "Other" ? c : ("Class " + c));
        return '<option value="' + esc(c) + '"' + (String(cls) === c ? " selected" : "") + '>' + esc(lab) + "</option>";
      }).join("") +
      "</select></label>" +
      "<label>Target year<input id=\"qxSetYear\" type=\"text\" maxlength=\"8\" inputmode=\"numeric\" value=\"" + esc(year) + "\" placeholder=\"e.g. 2027\"></label>" +
      '<div class="qx-set-actions">' +
      '<button type="button" class="btn-soft" id="qxSetCancelProf">Back</button>' +
      '<button type="button" class="btn-primary" id="qxSetSaveProf">Save</button>' +
      "</div></div></div></div>"
    );
  }

  function bind(root) {
    root = root || document.getElementById("qxSettingsRoot") || document.getElementById("app-main");
    if (!root) return;
    var page = root.querySelector("#qxSettingsRoot") || root;

    var back = root.querySelector("#qxSetBack");
    if (back) back.onclick = function () {
      if (page.classList.contains("is-editing")) {
        page.classList.remove("is-editing");
        var h = page.querySelector(".qx-set-head h1");
        if (h) h.textContent = "Settings";
        return;
      }
      if (typeof go === "function") go("profile");
      else history.back();
    };

    function wireToggle(btn) {
      if (!btn) return;
      btn.onclick = function () {
        var next = !btn.classList.contains("on");
        if (btn.id === "qxSetPush") setPush(next);
        else if (btn.id === "qxSetEmail") setEmail(next);
        btn.classList.toggle("on", next);
        btn.setAttribute("aria-checked", next ? "true" : "false");
        if (typeof showToast === "function") showToast(next ? "Enabled" : "Disabled");
      };
    }

    root.querySelectorAll(".qx-set-exam-card[data-exam]").forEach(function (btn) {
      btn.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        var key = btn.getAttribute("data-exam");
        if (!key) return;
        root.querySelectorAll(".qx-set-exam-card[data-exam]").forEach(function (b) {
          var on = b.getAttribute("data-exam") === key;
          b.classList.toggle("on", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        if (typeof switchExam === "function") switchExam(key, { open: "dashboard" });
        else {
          try { localStorage.setItem("quantrex_exam", key); } catch (_) {}
          if (typeof showToast === "function") showToast("Exam: " + key);
          if (typeof go === "function") go("dashboard");
        }
      };
    });

    wireToggle(root.querySelector("#qxSetPush"));
    wireToggle(root.querySelector("#qxSetEmail"));

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
    wireSeg(root.querySelector("#qxSetPalette"), function (v) {
      setPaletteMode(v);
      if (typeof showToast === "function") {
        showToast(v === "side" ? "Palette: Right sidebar" : v === "strip" ? "Palette: Top bar" : "Palette: Both");
      }
    });

    var edit = root.querySelector("#qxSetEditProfile");
    if (edit) edit.onclick = function () {
      page.classList.add("is-editing");
      var h = page.querySelector(".qx-set-head h1");
      if (h) h.textContent = "Edit Profile";
    };
    var cancel = root.querySelector("#qxSetCancelProf");
    if (cancel) cancel.onclick = function () {
      page.classList.remove("is-editing");
      var h = page.querySelector(".qx-set-head h1");
      if (h) h.textContent = "Settings";
    };

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
      page.classList.remove("is-editing");
      var h2 = page.querySelector(".qx-set-head h1");
      if (h2) h2.textContent = "Settings";
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
    setFont: setFont,
    getPaletteMode: getPaletteMode,
    setPaletteMode: setPaletteMode
  };
  global.QxSettings = api;
  global.viewSettings = viewSettings;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(typeof window !== "undefined" ? window : globalThis);
