/**
 * Quantrex AI Proctor — still photos on integrity events. No video recording.
 * Flags are review indicators, never "CHEATING DETECTED". Default OFF until toggle.
 * qxmd297: richer client integrity intelligence for review (tab, focus, copy/paste,
 * print, fullscreen, face hints, rapid-nav, short dwell, display heuristic).
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
  var _lastCopy = 0;
  var _lastPaste = 0;
  var _lastPrint = 0;
  var _lastCtx = 0;
  var _lastLeave = 0;
  var _lastResize = 0;
  var _lastKey = 0;
  var _listening = false;

  function bust() {
    return encodeURIComponent((typeof global.QX_BUILD === "string" && global.QX_BUILD) || "qxmd297");
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

  function bump(field) {
    if (!_state) return;
    _state[field] = (_state[field] || 0) + 1;
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

  function unbindIntel() {
    try {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("webkitfullscreenchange", onFs);
      document.removeEventListener("copy", onCopy, true);
      document.removeEventListener("cut", onCut, true);
      document.removeEventListener("paste", onPaste, true);
      window.removeEventListener("beforeprint", onBeforePrint);
      document.removeEventListener("contextmenu", onCtx, true);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerleave", onPointerLeave, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("pointerdown", onInput, true);
      document.removeEventListener("keydown", onInput, true);
    } catch (_) { /* */ }
    _listening = false;
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
    unbindIntel();
  }

  function showTabSwitchWarn(count) {
    if (document.getElementById("qxPrTabWarn")) return;
    ensureCss();
    var n = (count != null && Number(count) > 0)
      ? Number(count)
      : ((_state && _state.focusChanges) || 1);
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
      _state._tabHidAt = Date.now();
      pushEvent("tab", "o", "Browser tab or window hidden", "Potential integrity event detected — requires review.", true);
      try { showTabSwitchWarn(); } catch (_) { /* */ }
    } else if (_state._tabHidAt) {
      var hid = Date.now() - _state._tabHidAt;
      _state.tabHiddenMs = (_state.tabHiddenMs || 0) + hid;
      _state._tabHidAt = 0;
      if (hid > 8000) {
        pushEvent("tab", "o", "Returned after a long hide", "Tab was hidden for " + Math.round(hid / 1000) + "s. Potential integrity event — requires review.", false);
      }
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
      pushEvent("fullscreen", "o", "Full-screen exit", "Full-screen mode ended during the test. Potential integrity event — requires review.", true);
    }
  }
  function onCopy() {
    if (!_state || _state.ended) return;
    if (Date.now() - _lastCopy < 1500) return;
    _lastCopy = Date.now();
    bump("copyEvents");
    pushEvent("copy", "o", "Copy or cut attempted", "Potential integrity event — requires review.", true);
  }
  function onCut() { onCopy(); }
  function onPaste() {
    if (!_state || _state.ended) return;
    if (Date.now() - _lastPaste < 1500) return;
    _lastPaste = Date.now();
    bump("pasteEvents");
    pushEvent("paste", "o", "Paste attempted", "Potential integrity event — requires review.", true);
  }
  function onBeforePrint() {
    if (!_state || _state.ended) return;
    if (Date.now() - _lastPrint < 2000) return;
    _lastPrint = Date.now();
    bump("printEvents");
    pushEvent("print", "o", "Print dialog opened", "Potential integrity event — requires review.", false);
  }
  function onCtx(e) {
    if (!_state || _state.ended) return;
    if (Date.now() - _lastCtx < 2500) return;
    _lastCtx = Date.now();
    bump("ctxEvents");
    pushEvent("context", "y", "Context menu opened", "Right-click during the test. Review indicator.", false);
    try { if (e && e.preventDefault) e.preventDefault(); } catch (_) { /* */ }
  }
  function onKey(e) {
    if (!_state || _state.ended || !e) return;
    var k = (e.key || "").toLowerCase();
    var combo = (e.ctrlKey || e.metaKey) && (k === "c" || k === "v" || k === "x" || k === "p" || k === "u" || k === "s");
    var printScr = k === "printscreen";
    if (!combo && !printScr) return;
    if (Date.now() - _lastKey < 1200) return;
    _lastKey = Date.now();
    bump("keyFlags");
    pushEvent("hotkey", "o", "Restricted shortcut", "A copy, paste, print, or similar shortcut was used. Potential integrity event — requires review.", true);
  }
  function onPointerLeave(e) {
    if (!_state || _state.ended) return;
    if (e && e.target && e.target !== document.documentElement && e.target !== document.body) return;
    if (Date.now() - _lastLeave < 4000) return;
    _lastLeave = Date.now();
    bump("pointerLeaves");
    pushEvent("pointer", "y", "Pointer left the test window", "Mouse or pointer left the page. Review indicator.", false);
  }
  function onResize() {
    if (!_state || _state.ended) return;
    if (Date.now() - _lastResize < 4000) return;
    _lastResize = Date.now();
    bump("resizeEvents");
    sampleDisplay();
  }
  function onPageHide() {
    if (!_state || _state.ended) return;
    pushEvent("pagehide", "o", "Page hide / freeze", "The test page was hidden or frozen. Potential integrity event — requires review.", true);
  }
  function onInput() {
    if (_state) _state.lastInputAt = Date.now();
  }

  function sampleDisplay() {
    if (!_state || _state.ended) return;
    try {
      var scr = window.screen;
      if (!scr) return;
      var extra = (scr.width || 0) - (window.innerWidth || 0);
      var off = (typeof scr.availLeft === "number" && scr.availLeft < 0) ||
        (typeof window.screenLeft === "number" && window.screenLeft < -80);
      if ((extra > 520 && off) || (scr.width > 0 && extra > scr.width * 0.45 && off)) {
        if (!_state.secondScreen) {
          _state.secondScreen = 1;
          pushEvent("display", "y", "Additional display heuristic", "Window geometry suggests another screen may be in use. This is a weak signal and requires review.", false);
        }
      }
    } catch (_) { /* */ }
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
    if (!_stream) return;
    ensureCss();
    _pip = document.createElement("div");
    _pip.className = "qx-pr-pip qx-pr-pip-top";
    _pip.setAttribute("data-qx-pr-pip", "1");
    _pip.innerHTML = '<video playsinline muted autoplay></video><div class="qx-pr-pip-bar"><span class="qx-pr-live"></span> AI PROCTOR</div>';
    document.body.appendChild(_pip);
    var v = _pip.querySelector("video");
    _video = v;
    if (v && _stream) {
      v.srcObject = _stream;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
  }

  function bindIntel() {
    if (_listening) return;
    try {
      document.addEventListener("visibilitychange", onVis);
      window.addEventListener("blur", onBlur);
      document.addEventListener("fullscreenchange", onFs);
      document.addEventListener("webkitfullscreenchange", onFs);
      document.addEventListener("copy", onCopy, true);
      document.addEventListener("cut", onCut, true);
      document.addEventListener("paste", onPaste, true);
      window.addEventListener("beforeprint", onBeforePrint);
      document.addEventListener("contextmenu", onCtx, true);
      document.addEventListener("keydown", onKey, true);
      document.addEventListener("pointerleave", onPointerLeave, true);
      window.addEventListener("resize", onResize);
      window.addEventListener("pagehide", onPageHide);
      document.addEventListener("pointerdown", onInput, true);
      document.addEventListener("keydown", onInput, true);
    } catch (_) { /* */ }
    _listening = true;
  }

  function attach() {
    if (!_state || _state.ended) return;
    bindIntel();
    showPip();
    if (_tick) clearInterval(_tick);
    _tick = setInterval(function () {
      if (!_state || _state.ended) return;
      _state.cameraOkSec += (_stream && _stream.active) ? 1 : 0;
      _state.elapsedSec += 1;
      if (_stream && !_stream.active) {
        pushEvent("camera", "r", "Camera temporarily unavailable", "Camera track ended. Potential integrity event — requires review.", true);
      }
      if (_state.lastInputAt && Date.now() - _state.lastInputAt > 180000) {
        if (!_state._idleFlag) {
          _state._idleFlag = true;
          bump("idleEvents");
          pushEvent("idle", "y", "No interaction for 3 minutes", "Long idle stretch. Review indicator — may also be thinking time.", false);
        }
      } else {
        _state._idleFlag = false;
      }
    }, 1000);
    if (_faceTimer) clearInterval(_faceTimer);
    _faceTimer = setInterval(sampleFace, 5000);
    try { sampleFace(); } catch (_) { /* */ }
    try { sampleDisplay(); } catch (_) { /* */ }
  }

  function emptyState(config) {
    return {
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
      consent: true,
      copyEvents: 0,
      pasteEvents: 0,
      printEvents: 0,
      ctxEvents: 0,
      rapidNav: 0,
      shortDwell: 0,
      pointerLeaves: 0,
      resizeEvents: 0,
      secondScreen: 0,
      idleEvents: 0,
      keyFlags: 0,
      tabHiddenMs: 0,
      navHops: [],
      lastNavAt: 0,
      lastInputAt: Date.now()
    };
  }

  function startState(config) {
    _state = emptyState(config);
    pushEvent("start", "g", "Test started", "AI monitoring active. Still photos only on integrity events. No automatic cheating verdict.");
  }

  function ensureState(config) {
    if (_state) return _state;
    startState(config || { title: "Assessment" });
    _state.cameraOk = false;
    return _state;
  }

  function noteExternal(info) {
    info = info || {};
    ensureState({ title: info.title || "Assessment" });
    var n = Number(info.tabCount) || 0;
    if (n > 0 && n > (_state.focusChanges || 0)) {
      var add = n - (_state.focusChanges || 0);
      for (var i = 0; i < add; i++) {
        pushEvent("tab", "o", "Tab switch (session counter)", "Potential integrity event — requires review.", false);
      }
    }
  }

  function noteNav(fromIdx, toIdx, dwellSec) {
    if (!_state || _state.ended) return;
    var now = Date.now();
    var jump = Math.abs((Number(toIdx) || 0) - (Number(fromIdx) || 0));
    var dwell = Number(dwellSec) || 0;
    _state.navHops.push({ t: now, from: fromIdx, to: toIdx, dwell: dwell, jump: jump });
    if (_state.navHops.length > 80) _state.navHops = _state.navHops.slice(-80);
    if (_state.lastNavAt && now - _state.lastNavAt < 700 && jump >= 1) {
      _state.rapidNav += 1;
      if (_state.rapidNav === 6 || _state.rapidNav === 12) {
        pushEvent("nav", "y", "Rapid question navigation", "Several questions were skipped quickly. Review indicator.", false);
      }
    }
    if (dwell > 0 && dwell < 4 && jump === 1) {
      _state.shortDwell += 1;
      if (_state.shortDwell === 8 || _state.shortDwell === 16) {
        pushEvent("dwell", "y", "Very short time on several questions", "A cluster of questions was left in under 4 seconds. Review indicator.", false);
      }
    }
    _state.lastNavAt = now;
    _state.lastInputAt = now;
  }

  function stop() {
    if (_state && !_state.ended) {
      pushEvent("submit", "g", "Test submitted", "Attempt closed. Integrity events are for review only.");
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
      var intel = integrityIntel();
      list.unshift({
        id: _state.id,
        title: _state.title,
        startedAt: _state.startedAt,
        endedAt: _state.endedAt || Date.now(),
        reviewCount: _state.reviewCount,
        focusChanges: _state.focusChanges,
        cameraCuts: _state.cameraCuts,
        multiFace: _state.multiFace,
        eventCount: _state.events.length,
        intelScore: intel.score,
        intelBand: intel.band
      });
      localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(0, 20)));
    } catch (_) { /* */ }
  }

  function statusLine() {
    var intel = integrityIntel();
    if (!_state) return { label: "Not monitored", sev: "g" };
    if (intel.score < 60 || _state.multiFace >= 1) return { label: "Review required", sev: "y" };
    if (_state.reviewCount > 0 || intel.score < 85) return { label: "Some events require review", sev: "y" };
    return { label: "No significant integrity events", sev: "g" };
  }

  function integrityIntel() {
    var s = _state || {};
    var score = 100;
    var deductions = [];
    function sub(n, why) {
      if (!n) return;
      n = Math.max(0, Math.round(n));
      if (!n) return;
      score -= n;
      deductions.push({ n: n, why: why });
    }
    sub(Math.min(30, (s.focusChanges || 0) * 5), "Tab or window focus changes (" + (s.focusChanges || 0) + ")");
    sub(Math.min(16, (s.copyEvents || 0) * 8), "Copy / cut events (" + (s.copyEvents || 0) + ")");
    sub(Math.min(12, (s.pasteEvents || 0) * 6), "Paste events (" + (s.pasteEvents || 0) + ")");
    sub(Math.min(10, (s.printEvents || 0) * 10), "Print attempts (" + (s.printEvents || 0) + ")");
    sub(Math.min(15, (s.multiFace || 0) * 15), "Multiple-person camera events (" + (s.multiFace || 0) + ")");
    sub(s.cameraOk ? 0 : 12, s.cameraOk ? "" : "Camera was not enabled");
    sub(Math.min(10, (s.cameraCuts || 0) * 5), "Camera interruptions (" + (s.cameraCuts || 0) + ")");
    sub(Math.min(8, Math.floor((s.rapidNav || 0) / 6) * 4), "Rapid navigation clusters");
    sub(Math.min(8, Math.floor((s.shortDwell || 0) / 8) * 3), "Very short dwell clusters");
    sub(s.secondScreen ? 4 : 0, s.secondScreen ? "Additional display heuristic" : "");
    sub(Math.min(8, (s.keyFlags || 0) * 4), "Restricted shortcuts (" + (s.keyFlags || 0) + ")");
    score = Math.max(0, Math.min(100, score));
    var band = score >= 85 ? "Low review" : (score >= 60 ? "Watch" : "Review required");
    return { score: score, band: band, deductions: deductions.filter(function (d) { return d.why; }) };
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
      if (r.correct || r.isCorrect) topics[t].correct += 1;
      else if (!r.skip && !r.skipped && !r.isSkip) topics[t].wrong += 1;
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
    ensureState({ title: (data && data.title) || "Assessment" });
    var a = buildAnalytics(data);
    var st = statusLine();
    var intel = integrityIntel();
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
    var took = [];
    took.push((_state && _state.cameraOk) ? "Camera preview was on (still photos only, max 8)." : "Camera was off or skipped.");
    took.push("Tab / focus changes: " + ((_state && _state.focusChanges) || 0) + ".");
    took.push("Time away from tab: " + fmtSec((_state && _state.tabHiddenMs || 0) / 1000) + ".");
    took.push("Copy / paste / print flags: " + (((_state && _state.copyEvents) || 0) + ((_state && _state.pasteEvents) || 0) + ((_state && _state.printEvents) || 0)) + ".");
    took.push("Rapid-nav clusters: " + ((_state && _state.rapidNav) || 0) + " · short-dwell clusters: " + ((_state && _state.shortDwell) || 0) + ".");
    took.push("Integrity intelligence: " + intel.score + "/100 · " + intel.band + ".");
    var dedul = intel.deductions.map(function (d) {
      return "<li>−" + d.n + " · " + esc(d.why) + "</li>";
    }).join("") || "<li>No deductions.</li>";
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
            '<div class="qx-pr-kpi"><small>Integrity</small><b>' + intel.score + "</b></div>" +
            '<div class="qx-pr-kpi"><small>Review band</small><b>' + esc(intel.band) + "</b></div>" +
          "</div>" +
          '<div class="qx-pr-sec"><h3>AI Performance Summary</h3><p>' + esc(summary) + "</p></div>" +
          '<div class="qx-pr-sec"><h3>How you took this test</h3><ul>' +
            took.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") +
          "</ul></div>" +
          '<div class="qx-pr-sec"><h3>Integrity intelligence</h3>' +
            "<p>Overall monitoring status: <strong>" + esc(st.label) + "</strong></p>" +
            "<p>This score is a <strong>review aid</strong>. The system does not declare cheating and does not auto-fail the test.</p>" +
            "<ul>" + dedul + "</ul>" +
          "</div>" +
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
        try {
          document.body.setAttribute("data-qx-print-mode", "report");
          window.print();
        } catch (_) { /* */ }
      };
    });
  }

  function mountReport(host, data) {
    if (!host) return;
    ensureCss();
    ensureState({ title: (data && data.title) || "Assessment" });
    if (host.querySelector && host.querySelector("#qxPrReport")) return;
    var wrap = document.createElement("div");
    wrap.innerHTML = reportHtml(data);
    var node = wrap.firstChild;
    var rc = host.querySelector && host.querySelector("#mkRcView");
    if (rc && rc.parentNode) rc.parentNode.insertBefore(node, rc.nextSibling);
    else host.insertAdjacentElement("afterbegin", node);
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
            "<p>Camera stills are captured only when a potential integrity event is flagged. Video is never recorded. Flags are for review — the test is never auto-failed.</p>" +
            '<p class="qx-pr-motto">Concept Create Destiny</p>' +
          "</div>" +
          '<div class="qx-pr-body">' +
            "<ul class=\"qx-pr-list\">" +
              "<li><i class=\"qx-pr-dot\"></i><span>Small live preview stays at the top so questions stay fully visible.</span></li>" +
              "<li><i class=\"qx-pr-dot\"></i><span>Tab switch, focus loss, copy/paste, print, full-screen exit, or camera drop can take a still (max 8 JPEGs).</span></li>" +
              "<li><i class=\"qx-pr-dot\"></i><span>Integrity intelligence scores the session for a human reviewer. Never an automatic cheating verdict.</span></li>" +
              "<li><i class=\"qx-pr-dot\"></i><span>Stills stay on this device for this session. Event counts may be stored with your result.</span></li>" +
            "</ul>" +
            '<div class="qx-pr-checks" id="qxPrChecks"></div>' +
            '<label class="qx-pr-consent"><input type="checkbox" id="qxPrConsent"> I have read the monitoring notice and I consent to AI proctoring with still photos on integrity events.</label>' +
            '<div class="qx-pr-actions">' +
              '<button type="button" class="qx-pr-btn qx-pr-btn-gold" id="qxPrStart" disabled>Start AI-Proctored Test</button>' +
              '<button type="button" class="qx-pr-btn qx-pr-btn-ghost" id="qxPrSkip">Continue without camera</button>' +
            "</div>" +
            '<p class="qx-pr-note">Continuing without a camera is logged as a high-priority review event. Integrity signals (tab, copy, print) still run.</p>' +
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
        tab: row("Tab-switch detection"),
        intel: row("Integrity intelligence")
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
      setRow(rows.intel, true, "Review-grade");

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
      return "<li>" + esc(r.title || "Test") + " — " + (r.reviewCount || 0) + " review events" +
        (r.intelScore != null ? " · integrity " + r.intelScore : "") + "</li>";
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
    showTabSwitchWarn: showTabSwitchWarn,
    isGating: function () { return _gating; },
    noteNav: noteNav,
    noteExternal: noteExternal,
    ensureState: ensureState,
    integrityIntel: integrityIntel
  };
})(typeof window !== "undefined" ? window : this);
