/**
 * Quantrex AI Proctor — still photos on integrity events. No video recording.
 * Flags are review indicators, never "CHEATING DETECTED".
 */
(function (global) {
  "use strict";

  var MAX_SNAPS = 8;
  var SNAP_W = 480;
  var LOG_KEY = "qx_ai_proctor_log";
  var PREF_KEY = "qx_pref_ai_proctor";
  var _state = null;
  var _stream = null;
  var _video = null;
  var _pip = null;
  var _tick = null;
  var _faceTimer = null;
  var _css = false;
  var _gating = false;
  var _lastBlur = 0;
  var _lastVis = 0;
  var _lastFace = 0;
  var _listening = false;

  function bust() {
    return encodeURIComponent((typeof global.QX_BUILD === "string" && global.QX_BUILD) || "qxmd291");
  }
  function ensureCss() {
    if (_css || !document.head) return;
    if (document.getElementById("qxAiProctorCss")) { _css = true; return; }
    var l = document.createElement("link");
    l.id = "qxAiProctorCss";
    l.rel = "stylesheet";
    l.href = "assets/qx-ai-proctor.css?v=" + bust();
    document.head.appendChild(l);
    _css = true;
  }
  function nowLabel(ts) {
    var d = new Date(ts || Date.now());
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }
  function esc(s) {
    return String(s || "").replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  function sessionObj() {
    try {
      if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.getSession) {
        return QuantrexTestEngine.getSession();
      }
    } catch (_) { /* */ }
    return null;
  }
  function isPractice(sess) {
    sess = sess || sessionObj();
    return !!(sess && sess.practiceMode);
  }
  function prefOn() {
    try { return localStorage.getItem(PREF_KEY) === "1"; } catch (_) { return false; }
  }
  function setEnabled(on) {
    try { localStorage.setItem(PREF_KEY, on ? "1" : "0"); } catch (_) { /* */ }
  }
  function shouldGate(config) {
    if (!prefOn()) return false;
    if (config && config.practiceMode) return false;
    if (isPractice()) return false;
    return true;
  }

  function pushEvent(type, severity, label, note, withPhoto) {
    if (!_state) return;
    var ev = {
      t: Date.now(),
      type: type,
      severity: severity || "y",
      label: label || type,
      note: note || "",
      photoId: null
    };
    _state.events.push(ev);
    if (severity === "o" || severity === "r") _state.reviewCount += 1;
    if (type === "focus" || type === "tab") _state.focusChanges += 1;
    if (type === "camera") _state.cameraCuts += 1;
    if (type === "multiface") _state.multiFace += 1;
    if (withPhoto) snapshot(ev);
    return ev;
  }

  function snapshot(ev) {
    if (!_video || !_state) return;
    if (_state.snaps.length >= MAX_SNAPS) return;
    try {
      var w = _video.videoWidth || 640;
      var h = _video.videoHeight || 480;
      if (!w || !h) return;
      var canvas = document.createElement("canvas");
      var scale = SNAP_W / w;
      canvas.width = SNAP_W;
      canvas.height = Math.max(80, Math.round(h * scale));
      var ctx = canvas.getContext("2d");
      ctx.drawImage(_video, 0, 0, canvas.width, canvas.height);
      var url = canvas.toDataURL("image/jpeg", 0.62);
      var id = "s" + _state.snaps.length;
      _state.snaps.push({ id: id, t: Date.now(), url: url, event: ev && ev.type });
      if (ev) ev.photoId = id;
    } catch (_) { /* stills are best-effort; never record video */ }
  }

  function stopStream() {
    try {
      if (_stream) _stream.getTracks().forEach(function (t) { try { t.stop(); } catch (_) { /* */ } });
    } catch (_) { /* */ }
    _stream = null;
    if (_tick) { clearInterval(_tick); _tick = null; }
    if (_faceTimer) { clearInterval(_faceTimer); _faceTimer = null; }
    if (_pip && _pip.parentNode) _pip.parentNode.removeChild(_pip);
    _pip = null;
    _video = null;
    try {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
    } catch (_) { /* */ }
    _listening = false;
  }

  function showTabSwitchWarn() {
    if (document.getElementById("qxPrTabWarn")) return;
    ensureCss();
    var n = (_state && _state.focusChanges) || 1;
    var overlay = document.createElement("div");
    overlay.id = "qxPrTabWarn";
    overlay.className = "qx-pr-tabwarn";
    overlay.innerHTML =
      '<div class="qx-pr-tabwarn-card" role="dialog" aria-modal="true" aria-labelledby="qxPrTabWarnTitle">' +
        '<button type="button" class="qx-pr-tabwarn-x" aria-label="Close">×</button>' +
        '<h2 id="qxPrTabWarnTitle">Warning: Tab Switching Detected</h2>' +
        "<p>You have switched tabs " + n + " time" + (n === 1 ? "" : "s") + " during this test.</p>" +
        "<p>Tab switching is not allowed as it may be considered a violation of test integrity.</p>" +
        "<p>Please remain on this tab for the duration of the test.</p>" +
        '<div class="qx-pr-tabwarn-note"><strong>Note:</strong> Repeated tab switching may result in your test being terminated.</div>' +
        '<div class="qx-pr-tabwarn-act"><button type="button" class="qx-pr-tabwarn-ok">I Understand</button></div>' +
      "</div>";
    document.body.appendChild(overlay);
    function closeWarn() { try { overlay.remove(); } catch (_) { /* */ } }
    var ok = overlay.querySelector(".qx-pr-tabwarn-ok");
    var x = overlay.querySelector(".qx-pr-tabwarn-x");
    if (ok) ok.onclick = closeWarn;
    if (x) x.onclick = closeWarn;
  }

  function onVis() {
    if (!_state || _state.ended) return;
    if (document.hidden) {
      if (Date.now() - _lastVis < 1200) return;
      _lastVis = Date.now();
      pushEvent("tab", "o", "Browser tab or window hidden", "Potential integrity event detected — requires review.", true);
      try { showTabSwitchWarn(); } catch (_) { /* */ }
    }
  }
  function onBlur() {
    if (!_state || _state.ended) return;
    if (document.hidden) return;
    if (Date.now() - _lastBlur < 2500) return;
    _lastBlur = Date.now();
    pushEvent("focus", "o", "Browser focus changed", "Window lost focus. Potential integrity event — requires review.", true);
  }
  function onFs() {
    if (!_state || _state.ended) return;
    var fs = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fs) {
      pushEvent("fullscreen", "o", "Full-screen exit", "Full-screen mode ended during the test.", true);
    }
  }

  function sampleFace() {
    if (!_state || _state.ended || !_video) return;
    if (Date.now() - _lastFace < 8000) return;
    try {
      if (typeof FaceDetector === "undefined") return;
      if (!_state._fd) _state._fd = new FaceDetector({ fastMode: true, maxDetectedFaces: 4 });
      _state._fd.detect(_video).then(function (faces) {
        _lastFace = Date.now();
        var n = (faces && faces.length) || 0;
        _state.faceSamples += 1;
        if (n === 0) {
          _state.faceMiss += 1;
          pushEvent("face", "y", "Face temporarily not visible", "Lighting or camera angle may also cause this.", true);
        } else if (n >= 2) {
          _state.multiFace += 1;
          pushEvent("multiface", "r", "Multiple-person event detected", "Potential integrity event detected — requires review.", true);
        } else {
          _state.faceHit += 1;
        }
      }).catch(function () { /* detector optional */ });
    } catch (_) { /* */ }
  }

  function showPip() {
    if (_pip) return;
    ensureCss();
    _pip = document.createElement("div");
    _pip.className = "qx-pr-pip";
    _pip.innerHTML = '<video playsinline muted autoplay></video><div class="qx-pr-pip-bar"><span class="qx-pr-live"></span> AI PROCTORING ACTIVE</div>';
    document.body.appendChild(_pip);
    var v = _pip.querySelector("video");
    _video = v;
    if (v && _stream) {
      v.srcObject = _stream;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
  }

  function attach() {
    if (!_state || _state.ended) return;
    if (!_listening) {
      try {
        document.addEventListener("visibilitychange", onVis);
        window.addEventListener("blur", onBlur);
        document.addEventListener("fullscreenchange", onFs);
        document.addEventListener("webkitfullscreenchange", onFs);
      } catch (_) { /* */ }
      _listening = true;
    }
    showPip();
    if (_tick) clearInterval(_tick);
    _tick = setInterval(function () {
      if (!_state || _state.ended) return;
      _state.cameraOkSec += (_stream && _stream.active) ? 1 : 0;
      _state.elapsedSec += 1;
      if (_stream && !_stream.active) {
        pushEvent("camera", "r", "Camera temporarily unavailable", "Camera track ended.", true);
      }
    }, 1000);
    if (_faceTimer) clearInterval(_faceTimer);
    _faceTimer = setInterval(sampleFace, 5000);
    try { sampleFace(); } catch (_) { /* */ }
  }

  function startState(config) {
    _state = {
      id: "pr_" + Date.now(),
      title: (config && config.title) || "AI Proctored Test",
      startedAt: Date.now(),
      ended: false,
      events: [],
      snaps: [],
      reviewCount: 0,
      focusChanges: 0,
      cameraCuts: 0,
      multiFace: 0,
      faceSamples: 0,
      faceHit: 0,
      faceMiss: 0,
      cameraOkSec: 0,
      elapsedSec: 0,
      cameraOk: false,
      consent: true
    };
    pushEvent("start", "g", "Test started", "AI monitoring active. Still photos only on integrity events.");
  }

  function stop() {
    if (_state && !_state.ended) {
      pushEvent("submit", "g", "Test submitted", "");
      _state.ended = true;
      _state.endedAt = Date.now();
      persistMeta();
    }
    stopStream();
    global._qxProctorGating = false;
  }

  function persistMeta() {
    if (!_state) return;
    try {
      var list = [];
      try { list = JSON.parse(localStorage.getItem(LOG_KEY) || "[]") || []; } catch (_) { list = []; }
      list.unshift({
        id: _state.id,
        title: _state.title,
        startedAt: _state.startedAt,
        endedAt: _state.endedAt || Date.now(),
        reviewCount: _state.reviewCount,
        focusChanges: _state.focusChanges,
        cameraCuts: _state.cameraCuts,
        multiFace: _state.multiFace,
        eventCount: _state.events.length
      });
      localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(0, 20)));
    } catch (_) { /* */ }
  }

  function statusLine() {
    if (!_state) return { label: "Not monitored", sev: "g" };
    if (_state.reviewCount >= 4 || _state.multiFace >= 1) return { label: "Some events require review", sev: "y" };
    if (_state.reviewCount > 0) return { label: "Some events require review", sev: "y" };
    return { label: "No significant integrity events", sev: "g" };
  }

  function pct(n) {
    n = Math.max(0, Math.min(100, n));
    return (Math.round(n * 10) / 10).toFixed(1);
  }

  function buildAnalytics(data) {
    data = data || global._qxLastAnalysis || {};
    var rows = data.rows || [];
    var total = data.total || rows.length || 0;
    var correct = data.correct || 0;
    var wrong = data.wrong || 0;
    var skipped = data.skipped || 0;
    var score = data.score != null ? data.score : 0;
    var max = data.maxScore || (total * 4) || 0;
    var acc = total ? (correct / total) * 100 : 0;
    var times = rows.map(function (r) { return Number(r.sec || r.time || 0) || 0; });
    var avg = times.length ? times.reduce(function (a, b) { return a + b; }, 0) / times.length : 0;
    var topics = {};
    rows.forEach(function (r) {
      var t = r.chapter || r.topic || r.subject || "General";
      if (!topics[t]) topics[t] = { attempted: 0, correct: 0, wrong: 0, time: 0 };
      topics[t].attempted += 1;
      if (r.correct) topics[t].correct += 1;
      else if (!r.skip && !r.skipped) topics[t].wrong += 1;
      topics[t].time += Number(r.sec || r.time || 0) || 0;
    });
    var topicRows = Object.keys(topics).map(function (k) {
      var v = topics[k];
      return {
        topic: k,
        attempted: v.attempted,
        correct: v.correct,
        wrong: v.wrong,
        acc: v.attempted ? Math.round(v.correct / v.attempted * 100) : 0,
        avg: v.attempted ? Math.round(v.time / v.attempted) : 0
      };
    }).sort(function (a, b) { return b.attempted - a.attempted; });
    var weak = topicRows.filter(function (t) { return t.acc < 70; }).slice(0, 3);
    var strong = topicRows.filter(function (t) { return t.acc >= 80; }).slice(0, 3);
    var slow = rows.slice().sort(function (a, b) {
      return (Number(b.sec || b.time || 0) || 0) - (Number(a.sec || a.time || 0) || 0);
    }).slice(0, 5);
    return {
      total: total, correct: correct, wrong: wrong, skipped: skipped,
      score: score, max: max, acc: acc, avg: avg, topicRows: topicRows,
      weak: weak, strong: strong, slow: slow, pct: data.pct, timeUsed: data.timeUsed
    };
  }

  function fmtSec(s) {
    s = Math.max(0, Math.round(Number(s) || 0));
    if (s < 60) return s + "s";
    return Math.floor(s / 60) + "m " + (s % 60) + "s";
  }

  function reportHtml(data) {
    ensureCss();
    var a = buildAnalytics(data);
    var st = statusLine();
    var camPct = _state && _state.elapsedSec ? (_state.cameraOkSec / _state.elapsedSec) * 100 : (_state && _state.cameraOk ? 100 : 0);
    var facePct = _state && _state.faceSamples ? (_state.faceHit / _state.faceSamples) * 100 : 100;
    var name = "";
    try {
      var u = (global.QxAuth && QxAuth.currentUser && QxAuth.currentUser()) ||
        (global.firebase && firebase.auth && firebase.auth().currentUser);
      name = (u && (u.displayName || u.phoneNumber || u.email)) || "";
    } catch (_) { /* */ }
    var tl = ((_state && _state.events) || []).map(function (ev) {
      return '<li><span>' + esc(nowLabel(ev.t)) + '</span><i class="qx-pr-sev ' + esc(ev.severity) + '"></i><div><strong>' +
        esc(ev.label) + "</strong><div>" + esc(ev.note) + "</div></div></li>";
    }).join("");
    var photos = ((_state && _state.snaps) || []).map(function (s) {
      return '<img src="' + s.url + '" alt="Integrity still">';
    }).join("");
    var topicTable = a.topicRows.slice(0, 8).map(function (t) {
      return "<tr><td>" + esc(t.topic) + "</td><td>" + t.attempted + "</td><td>" + t.correct + "</td><td>" + t.wrong +
        "</td><td>" + t.acc + "%</td><td>" + fmtSec(t.avg) + "</td></tr>";
    }).join("");
    var bars = a.topicRows.slice(0, 6).map(function (t) {
      return '<div style="margin:6px 0 10px"><div style="display:flex;justify-content:space-between;font-size:12px"><span>' +
        esc(t.topic) + "</span><span>" + t.acc + '%</span></div><div class="qx-pr-bar"><i style="width:' + t.acc + '%"></i></div></div>';
    }).join("");
    var next = [];
    if (a.weak.length) next.push("Revise " + a.weak.map(function (w) { return w.topic; }).join(", ") + " fundamentals.");
    next.push("Review every incorrect question before the next mock.");
    next.push("Keep first-pass time under 3 minutes per question.");
    if (a.avg > 120) next.push("Work on calculation speed — average time is high.");
    else next.push("Attempt easier questions first, then return to hard items.");
    var estAcc = Math.min(20, Math.round((100 - a.acc) * 0.25));
    var estTime = a.avg > 90 ? 8 : 4;
    var estConcept = a.weak.length * 5;
    var summary = a.strong.length
      ? ("Your strongest area was " + a.strong[0].topic + " (" + a.strong[0].acc + "% accuracy).")
      : "Keep building accuracy across topics.";
    if (a.weak.length) summary += " Main improvement area: " + a.weak[0].topic + " (" + a.weak[0].acc + "%).";
    return (
      '<section class="qx-pr-report" id="qxPrReport">' +
        '<article class="qx-pr-sheet">' +
          '<header class="qx-pr-cover">' +
            '<p class="qx-pr-kicker">Quantrex Academy</p>' +
            "<h1>AI Test Performance Report</h1>" +
            '<p class="qx-pr-motto">Concept Create Destiny</p>' +
            '<div class="qx-pr-meta">' +
              (name ? "<span>" + esc(name) + "</span>" : "") +
              "<span>" + esc((_state && _state.title) || "Assessment") + "</span>" +
              "<span>" + esc(new Date((_state && _state.startedAt) || Date.now()).toLocaleString()) + "</span>" +
            "</div>" +
          "</header>" +
          '<div class="qx-pr-score">' +
            '<div class="qx-pr-kpi"><small>Score</small><b>' + esc(String(a.score)) + " / " + esc(String(a.max)) + "</b></div>" +
            '<div class="qx-pr-kpi"><small>Accuracy</small><b>' + pct(a.acc) + "%</b></div>" +
            '<div class="qx-pr-kpi"><small>Attempted</small><b>' + (a.total - a.skipped) + " / " + a.total + "</b></div>" +
            '<div class="qx-pr-kpi"><small>Correct</small><b>' + a.correct + "</b></div>" +
            '<div class="qx-pr-kpi"><small>Wrong</small><b>' + a.wrong + "</b></div>" +
            '<div class="qx-pr-kpi"><small>Unattempted</small><b>' + a.skipped + "</b></div>" +
          "</div>" +
          '<div class="qx-pr-sec"><h3>AI Performance Summary</h3><p>' + esc(summary) + "</p></div>" +
          '<div class="qx-pr-sec"><h3>Topic-wise Performance</h3>' +
            (bars || "<p>Topic breakdown appears when chapter tags are present.</p>") +
            (topicTable
              ? '<table class="qx-pr-table"><thead><tr><th>Topic</th><th>Attempted</th><th>Correct</th><th>Wrong</th><th>Accuracy</th><th>Avg time</th></tr></thead><tbody>' +
                topicTable + "</tbody></table>"
              : "") +
          "</div>" +
          '<div class="qx-pr-sec"><h3>Time Analytics</h3><p>Average time / question: <strong>' + fmtSec(a.avg) + "</strong></p></div>" +
          '<div class="qx-pr-sec"><h3>Score Improvement Estimate</h3>' +
            "<p>Current score: <strong>" + esc(String(a.score)) + "</strong></p>" +
            "<ul><li>Accuracy improvement → +" + estAcc + " marks</li>" +
            "<li>Time management → +" + estTime + " marks</li>" +
            "<li>Concept revision → +" + estConcept + " marks</li></ul>" +
            "<p>Potential target range is an estimate, not a guaranteed score.</p>" +
          "</div>" +
          '<div class="qx-pr-sec"><h3>Your Next Steps</h3><ol>' +
            next.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
          "</ol></div>" +
          '<div class="qx-pr-sec"><h3>AI Proctoring Report</h3>' +
            "<p>Overall monitoring status: <strong>" + esc(st.label) + "</strong></p>" +
            "<p>Camera availability: " + pct(camPct) + "% · Face visibility: " + pct(facePct) +
            "% · Multiple face events: " + ((_state && _state.multiFace) || 0) +
            " · Focus changes: " + ((_state && _state.focusChanges) || 0) +
            " · Camera interruptions: " + ((_state && _state.cameraCuts) || 0) +
            " · Potential integrity events: " + ((_state && _state.reviewCount) || 0) + "</p>" +
            '<p class="qx-pr-disclaimer">These are indicators for review. The system does not declare cheating automatically. Lighting, connectivity, or camera limits can create false flags.</p>' +
            (photos ? '<div class="qx-pr-photos" style="margin-top:10px">' + photos + "</div>" : "") +
          "</div>" +
          '<div class="qx-pr-sec"><h3>AI Proctoring Timeline</h3><ul class="qx-pr-tl">' + (tl || "<li>No events</li>") + "</ul></div>" +
          '<div class="qx-pr-sec qx-pr-actions">' +
            '<button type="button" class="qx-pr-btn qx-pr-btn-gold" data-qx-pr-print>Download / Print PDF</button>' +
          "</div>" +
        "</article>" +
      "</section>"
    );
  }

  function bindReport(root) {
    if (!root) return;
    root.querySelectorAll("[data-qx-pr-print]").forEach(function (b) {
      b.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        try { window.print(); } catch (_) { /* */ }
      };
    });
  }

  function mountReport(host, data) {
    if (!host) return;
    ensureCss();
    var wrap = document.createElement("div");
    wrap.innerHTML = reportHtml(data);
    host.insertAdjacentElement("afterbegin", wrap.firstChild);
    bindReport(host);
  }

  function checkNet() {
    return navigator.onLine !== false;
  }

  function gate(config) {
    ensureCss();
    _gating = true;
    global._qxProctorGating = true;
    return new Promise(function (resolve) {
      var done = false;
      var finish = function () {
        if (done) return;
        done = true;
        _gating = false;
        global._qxProctorGating = false;
        try { overlay.remove(); } catch (_) { /* */ }
        resolve(true);
      };
      var overlay = document.createElement("div");
      overlay.className = "qx-pr-root";
      overlay.innerHTML =
        '<div class="qx-pr-card" role="dialog" aria-modal="true">' +
          '<div class="qx-pr-hero">' +
            '<p class="qx-pr-kicker">Quantrex Academy</p>' +
            "<h2>AI-Proctored Test</h2>" +
            "<p>Camera stills are captured only when you switch tabs or a potential integrity event is flagged. Video is never recorded.</p>" +
            '<p class="qx-pr-motto">Concept Create Destiny</p>' +
          "</div>" +
          '<div class="qx-pr-body">' +
            "<ul class=\"qx-pr-list\">" +
              "<li><i class=\"qx-pr-dot\"></i><span>Camera stays on in a small preview. No continuous video file is saved.</span></li>" +
              "<li><i class=\"qx-pr-dot\"></i><span>Tab switch, focus loss, full-screen exit, or camera drop takes a still photo for review.</span></li>" +
              "<li><i class=\"qx-pr-dot\"></i><span>AI flags are review indicators — never an automatic cheating verdict.</span></li>" +
              "<li><i class=\"qx-pr-dot\"></i><span>Stills stay on this device for this session. Event counts may be stored with your result.</span></li>" +
            "</ul>" +
            '<div class="qx-pr-checks" id="qxPrChecks"></div>' +
            '<label class="qx-pr-consent"><input type="checkbox" id="qxPrConsent"> I have read the monitoring notice and I consent to AI proctoring with still photos on integrity events.</label>' +
            '<div class="qx-pr-actions">' +
              '<button type="button" class="qx-pr-btn qx-pr-btn-gold" id="qxPrStart" disabled>Start AI-Proctored Test</button>' +
              '<button type="button" class="qx-pr-btn qx-pr-btn-ghost" id="qxPrSkip">Continue without camera</button>' +
            "</div>" +
            '<p class="qx-pr-note">Continuing without a camera is logged as a high-priority review event.</p>' +
          "</div>" +
        "</div>";
      document.body.appendChild(overlay);
      var checksEl = overlay.querySelector("#qxPrChecks");
      var startBtn = overlay.querySelector("#qxPrStart");
      var skipBtn = overlay.querySelector("#qxPrSkip");
      var consent = overlay.querySelector("#qxPrConsent");
      var rows = {
        cam: row("Camera"),
        net: row("Internet"),
        br: row("Browser"),
        fs: row("Full-screen"),
        tab: row("Tab-switch detection")
      };
      function row(lab) {
        var d = document.createElement("div");
        d.className = "qx-pr-row";
        d.innerHTML = "<span>" + lab + '</span><strong class="qx-pr-wait">Checking…</strong>';
        checksEl.appendChild(d);
        return d.querySelector("strong");
      }
      function setRow(el, ok, lab) {
        el.className = ok ? "qx-pr-ok" : "qx-pr-bad";
        el.textContent = lab;
      }
      setRow(rows.net, checkNet(), checkNet() ? "Ready" : "Offline");
      setRow(rows.br, true, (navigator.userAgent.match(/Chrome|Edg|Firefox|Safari|CriOS/) || ["Browser"])[0]);
      setRow(rows.tab, typeof document.hidden === "boolean", typeof document.hidden === "boolean" ? "Ready" : "Limited");
      setRow(rows.fs, !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen), "Available");

      function syncStart() {
        startBtn.disabled = !(consent.checked && _stream);
      }
      consent.onchange = syncStart;

      navigator.mediaDevices && navigator.mediaDevices.getUserMedia
        ? navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
            .then(function (stream) {
              _stream = stream;
              setRow(rows.cam, true, "Ready");
              syncStart();
            })
            .catch(function () {
              setRow(rows.cam, false, "Permission needed");
              syncStart();
            })
        : (setRow(rows.cam, false, "Not supported"), syncStart());

      startBtn.onclick = function () {
        if (!consent.checked || !_stream) return;
        startBtn.disabled = true;
        startState(config);
        _state.cameraOk = true;
        try {
          var el = document.documentElement;
          if (el.requestFullscreen) el.requestFullscreen().catch(function () {});
          else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        } catch (_) { /* */ }
        finish();
        attach();
      };
      skipBtn.onclick = function () {
        startState(config);
        _state.cameraOk = false;
        pushEvent("camera", "r", "Camera not enabled", "Student continued without camera. High-priority review.", false);
        finish();
        attach();
      };
    });
  }

  function historyHtml() {
    var list = [];
    try { list = JSON.parse(localStorage.getItem(LOG_KEY) || "[]") || []; } catch (_) { list = []; }
    if (!list.length) return "";
    return '<div class="qx-pr-sec"><h3>My Performance</h3><ul>' + list.slice(0, 8).map(function (r) {
      return "<li>" + esc(r.title || "Test") + " — " + (r.reviewCount || 0) + " review events</li>";
    }).join("") + "</ul></div>";
  }

  global.QxAiProctor = {
    shouldGate: shouldGate,
    enabled: prefOn,
    setEnabled: setEnabled,
    gate: gate,
    attach: attach,
    stop: stop,
    snapshot: function () { snapshot(null); },
    reportHtml: reportHtml,
    mountReport: mountReport,
    bindReport: bindReport,
    historyHtml: historyHtml,
    getState: function () { return _state; },
    isGating: function () { return _gating; }
  };
})(typeof window !== "undefined" ? window : this);
