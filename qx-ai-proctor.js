/* Quantrex Academy — AI Proctor v2 (qxmd316)
 * Opt-in per test (choice shown once at test start). 100% on-device:
 * - Face AI: TF.js BlazeFace, lazy-loaded from our own hosting only when the student picks AI Proctor.
 * - Video frames are analysed in memory and never uploaded. Optional tiny thumbnails stay in this tab only.
 * - Browser signals: tab hidden, window blur, full-screen exit, copy/cut/paste, right-click, restricted keys,
 *   devtools-like resize, extended display, camera off / permission revoked.
 * - Events are debounced episodes {type, start, duration, question} — only suspicious moments are kept.
 * Public API kept compatible with test-engine.js: shouldGate, enabled, setEnabled, gate, attach, stop,
 * mountReport, noteNav, noteExternal, getState, showTabSwitchWarn, integrityIntel, ensureState, isGating.
 * New: choose(config) -> Promise<{proctor:boolean}>, begin(config).
 */
(function (global) {
  "use strict";
  var VER = "qxmd316";
  var VENDOR = "vendor/proctor/";
  var LOG_KEY = "qx_ai_proctor_log";
  var PIP_POS_KEY = "qx_pr_pip_pos_tr";
  var MAX_THUMBS = 8;
  var TICK_MS = 700;
  // persistence (ms) before a frame condition becomes an event; clear time before it closes
  var HOLD = { noface: 3000, multiface: 2000, lookaway: 4000, far: 6000, dark: 3000, freeze: 8000 };
  var CLEAR_MS = 1500;
  var TYPES = {
    noface: { label: "No face visible", sev: "high" },
    multiface: { label: "Multiple faces", sev: "high" },
    lookaway: { label: "Looking away / head turned", sev: "medium" },
    far: { label: "Face too far from camera", sev: "low" },
    dark: { label: "Camera blocked or too dark", sev: "high" },
    camoff: { label: "Camera turned off / permission revoked", sev: "high" },
    tab: { label: "Tab switched / app hidden", sev: "high" },
    blur: { label: "Left the test window", sev: "medium" },
    fullscreen: { label: "Exited full screen", sev: "medium" },
    copy: { label: "Copy / cut", sev: "medium" },
    paste: { label: "Paste", sev: "medium" },
    context: { label: "Right-click menu", sev: "low" },
    hotkey: { label: "Restricted shortcut", sev: "medium" },
    devtools: { label: "Developer tools suspected", sev: "medium" },
    display: { label: "Extra display connected", sev: "medium" },
    freeze: { label: "Camera image frozen", sev: "high" }
  };
  var SEV_W = { high: 12, medium: 6, low: 2 };

  var _pending = null;     // { stream, config } from choose()
  var _state = null;
  var _stream = null;
  var _video = null;
  var _pip = null;
  var _loop = null;
  var _clock = null;
  var _model = null;
  var _modelState = "idle"; // idle|loading|ready|failed
  var _canvas = null;
  var _listening = false;
  var _cssDone = false;
  var _gating = false;
  var _drag = null;
  var _detBusy = false;
  var _freezeHash = "";
  var _freezeSince = 0;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  function ensureCss() {
    if (_cssDone || !document.head) return;
    _cssDone = true;
    if (document.getElementById("qxAiProctorCss")) return;
    var l = document.createElement("link");
    l.id = "qxAiProctorCss";
    l.rel = "stylesheet";
    l.href = "assets/qx-ai-proctor.css?v=" + VER;
    document.head.appendChild(l);
  }
  function toast(msg) { try { if (typeof global.showToast === "function") global.showToast(msg); } catch (_) { /* */ } }
  function sess() {
    try { return (global.QuantrexTestEngine && QuantrexTestEngine.getSession) ? QuantrexTestEngine.getSession() : null; } catch (_) { return null; }
  }
  function qNo() {
    var s = sess();
    return (s && typeof s.idx === "number") ? s.idx + 1 : null;
  }
  function qAt(ts) {
    var log = _state && _state.qlog, q = null;
    if (log) for (var i = 0; i < log.length && log[i].t <= ts; i++) q = log[i].q;
    return q != null ? q : qNo();
  }
  function noteQ() {
    if (!_state) return;
    var q = qNo(), log = _state.qlog;
    if (q != null && (!log.length || log[log.length - 1].q !== q)) log.push({ t: Date.now(), q: q });
  }
  function since() { return _state ? Math.max(0, Date.now() - _state.startedAt) : 0; }
  function active() { return !!(_state && !_state.ended); }

  /* ---------------- episodes (debounced events) ---------------- */
  function openEp(type, note, atMs) {
    if (!active()) return null;
    var cur = _state.open[type];
    if (cur) return cur;
    var ev = {
      type: type,
      label: (TYPES[type] || {}).label || type,
      sev: (TYPES[type] || {}).sev || "low",
      t0: Math.max(0, (atMs != null ? atMs : Date.now()) - _state.startedAt),
      dur: null,
      q: qAt(atMs != null ? atMs : Date.now()),
      note: note || ""
    };
    _state.events.push(ev);
    _state.open[type] = ev;
    thumb(ev);
    updatePip();
    return ev;
  }
  function closeEp(type, atMs) {
    if (!_state) return;
    var ev = _state.open[type];
    if (!ev) return;
    ev.dur = Math.max(0, (atMs != null ? atMs : Date.now()) - _state.startedAt - ev.t0);
    delete _state.open[type];
    updatePip();
  }
  var _lastInst = {};
  function instant(type, note, gapMs) {
    if (!active()) return null;
    var now = Date.now();
    if (_lastInst[type] && now - _lastInst[type] < (gapMs || 1500)) return null;
    _lastInst[type] = now;
    var ev = openEp(type, note);
    if (ev) closeEp(type, now);
    return ev;
  }
  function thumb(ev) {
    try {
      if (!_video || !_state || _state.thumbs >= MAX_THUMBS) return;
      if (!_video.videoWidth) return;
      var c = document.createElement("canvas");
      c.width = 96;
      c.height = Math.round(96 * _video.videoHeight / _video.videoWidth) || 72;
      c.getContext("2d").drawImage(_video, 0, 0, c.width, c.height);
      ev.thumb = c.toDataURL("image/jpeg", 0.55);
      _state.thumbs += 1;
    } catch (_) { /* best effort; stays in this tab */ }
  }

  /* ---------------- vendor loading (lazy, self-hosted) ---------------- */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error("load " + src)); };
      document.head.appendChild(s);
    });
  }
  function loadModel() {
    if (_modelState === "ready" || _modelState === "loading") return;
    _modelState = "loading";
    updatePip();
    var p = global.tf ? Promise.resolve() : loadScript(VENDOR + "tf.min.js?v=" + VER);
    p.then(function () {
      return global.blazeface ? null : loadScript(VENDOR + "blazeface.min.js?v=" + VER);
    }).then(function () {
      var tf = global.tf;
      return tf.setBackend("webgl").catch(function () { return false; }).then(function (ok) {
        if (ok === false || tf.getBackend() !== "webgl") return tf.setBackend("cpu");
      }).then(function () { return tf.ready(); });
    }).then(function () {
      return global.blazeface.load({ modelUrl: VENDOR + "blazeface/model.json?v=" + VER, maxFaces: 4, scoreThreshold: 0.72 });
    }).then(function (m) {
      _model = m;
      _modelState = "ready";
      if (_state) { _state.modelReady = true; _state.backend = global.tf.getBackend(); }
      updatePip();
    }).catch(function (e) {
      _modelState = "failed";
      if (_state) _state.modelFailed = String((e && e.message) || e).slice(0, 120);
      updatePip();
    });
  }

  /* ---------------- frame analysis ---------------- */
  function lumaStats() {
    try {
      if (!_canvas) { _canvas = document.createElement("canvas"); _canvas.width = 32; _canvas.height = 24; }
      var ctx = _canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(_video, 0, 0, 32, 24);
      var d = ctx.getImageData(0, 0, 32, 24).data;
      var n = d.length / 4, sum = 0, sq = 0;
      for (var i = 0; i < d.length; i += 4) {
        var y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        sum += y; sq += y * y;
      }
      var mean = sum / n;
      return { mean: mean, sd: Math.sqrt(Math.max(0, sq / n - mean * mean)) };
    } catch (_) { return null; }
  }
  function classify(preds, vw) {
    if (!preds.length) return "noface";
    if (preds.length >= 2) return "multiface";
    var p = preds[0];
    var tl = p.topLeft, br = p.bottomRight, lm = p.landmarks || [];
    var w = Math.abs(br[0] - tl[0]);
    if (vw && w < vw * 0.11) return "far";
    if (lm.length >= 4) {
      var re = lm[0], le = lm[1], nose = lm[2], mouth = lm[3];
      var eyeDx = Math.abs(le[0] - re[0]) || 1;
      var midX = (le[0] + re[0]) / 2, midY = (le[1] + re[1]) / 2;
      var yaw = (nose[0] - midX) / eyeDx;              // ~0 when facing camera
      var span = (mouth[1] - midY) || 1;
      var pitch = (nose[1] - midY) / span;             // ~0.45–0.6 when level
      if (Math.abs(yaw) > 0.5 || eyeDx < w * 0.22) return "lookaway";
      if (pitch < 0.18 || pitch > 0.9) return "lookaway";
    }
    return "ok";
  }
  function applyFrame(kind) {
    var now = Date.now();
    var st = _state;
    st.frames += 1;
    if (kind === "ok") st.okFrames += 1;
    ["noface", "multiface", "lookaway", "far", "dark"].forEach(function (k) {
      if (k === kind) {
        st.cond[k] = st.cond[k] || { since: now };
        st.cond[k].clearAt = 0;
        if (!st.open[k] && now - st.cond[k].since >= HOLD[k]) openEp(k, "", st.cond[k].since);
      } else if (st.cond[k]) {
        if (!st.cond[k].clearAt) st.cond[k].clearAt = now;
        if (now - st.cond[k].clearAt >= CLEAR_MS) {
          if (st.open[k]) closeEp(k, st.cond[k].clearAt);
          delete st.cond[k];
        }
      }
    });
    st.lastKind = kind;
  }
  function tick() {
    if (!active()) return;
    noteQ();
    if (_detBusy) return;
    if (document.hidden) return; // tab episode already covers this time
    if (!_video || !_stream) return;
    var tr = _stream.getVideoTracks()[0];
    if (!tr || tr.readyState === "ended" || !_stream.active) { openEp("camoff"); return; }
    if (tr.muted) { applyFrame("dark"); return; }
    if (_state.open.camoff) closeEp("camoff");
    if (!_video.videoWidth || _video.readyState < 2) return;
    var ls = lumaStats();
    if (ls && (ls.mean < 22 || (ls.sd < 6 && ls.mean < 60))) { applyFrame("dark"); return; }
    if (ls) {
      var fh = Math.round(ls.mean) + ":" + Math.round(ls.sd * 10);
      if (fh === _freezeHash) {
        if (!_freezeSince) _freezeSince = Date.now();
        if (Date.now() - _freezeSince >= HOLD.freeze && _state && !_state.open.dark && !_state.open.noface) openEp("freeze");
      } else {
        _freezeHash = fh;
        _freezeSince = 0;
        closeEp("freeze");
      }
    }
    if (_modelState !== "ready" || !_model) return;
    _detBusy = true;
    var t0 = performance.now();
    _model.estimateFaces(_video, false).then(function (preds) {
      _detBusy = false;
      if (!active()) return;
      _state.detMs = Math.round(performance.now() - t0);
      applyFrame(classify(preds || [], _video.videoWidth));
    }).catch(function () { _detBusy = false; });
  }

  /* ---------------- browser signals ---------------- */
  var H = {};
  H.vis = function () {
    if (!active()) return;
    if (document.hidden) { closeEp("blur"); openEp("tab"); }
    else closeEp("tab");
  };
  H.blur = function () {
    if (!active() || document.hidden) return;
    var at = Date.now();
    clearTimeout(H._blurT);
    H._blurT = setTimeout(function () {
      if (!active() || document.hidden || document.hasFocus()) return;
      var ae = document.activeElement;
      if (ae && ae.tagName === "IFRAME") return;
      openEp("blur", "", at);
    }, 1500);
  };
  H.focus = function () { clearTimeout(H._blurT); closeEp("blur"); };
  H.fs = function () {
    if (!active()) return;
    var fs = document.fullscreenElement || document.webkitFullscreenElement;
    if (fs) { _state.fsSeen = true; closeEp("fullscreen"); hideFsBar(); }
    else if (_state.fsSeen && Date.now() - _state.startedAt > 2500) { openEp("fullscreen"); showFsBar(); }
  };
  H.copy = function () { instant("copy"); };
  H.paste = function () { instant("paste"); };
  H.ctx = function () { instant("context", "", 2500); };
  H.key = function (e) {
    if (!active() || !e) return;
    var k = String(e.key || "").toLowerCase();
    var bad = ((e.ctrlKey || e.metaKey) && /^(c|v|x|p|u|s)$/.test(k)) ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && /^(i|j|c)$/.test(k)) || k === "f12" || k === "printscreen";
    if (bad) instant("hotkey", k.toUpperCase(), 1200);
  };
  H.resize = function () {
    if (!active()) return;
    clearTimeout(H._rzT);
    H._rzT = setTimeout(checkDevtools, 600);
  };
  function checkDevtools() {
    if (!active()) return;
    var wide = (global.outerWidth || 0) - (global.innerWidth || 0);
    var tall = (global.outerHeight || 0) - (global.innerHeight || 0);
    var desk = !/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || "");
    var sus = desk && global.outerWidth > 0 && (wide > 200 || tall > 260);
    if (sus) openEp("devtools"); else closeEp("devtools");
  }
  function checkDisplay() {
    if (!active()) return;
    try {
      if (global.screen && global.screen.isExtended === true) openEp("display");
      else closeEp("display");
    } catch (_) { /* */ }
  }
  H.screen = function () { checkDisplay(); };
  function bind() {
    if (_listening) return;
    _listening = true;
    document.addEventListener("visibilitychange", H.vis);
    global.addEventListener("blur", H.blur);
    global.addEventListener("focus", H.focus);
    document.addEventListener("fullscreenchange", H.fs);
    document.addEventListener("webkitfullscreenchange", H.fs);
    document.addEventListener("copy", H.copy, true);
    document.addEventListener("cut", H.copy, true);
    document.addEventListener("paste", H.paste, true);
    document.addEventListener("contextmenu", H.ctx, true);
    document.addEventListener("keydown", H.key, true);
    global.addEventListener("resize", H.resize);
    try { if (global.screen && global.screen.addEventListener) global.screen.addEventListener("change", H.screen); } catch (_) { /* */ }
  }
  function unbind() {
    if (!_listening) return;
    _listening = false;
    document.removeEventListener("visibilitychange", H.vis);
    global.removeEventListener("blur", H.blur);
    global.removeEventListener("focus", H.focus);
    document.removeEventListener("fullscreenchange", H.fs);
    document.removeEventListener("webkitfullscreenchange", H.fs);
    document.removeEventListener("copy", H.copy, true);
    document.removeEventListener("cut", H.copy, true);
    document.removeEventListener("paste", H.paste, true);
    document.removeEventListener("contextmenu", H.ctx, true);
    document.removeEventListener("keydown", H.key, true);
    global.removeEventListener("resize", H.resize);
    try { if (global.screen && global.screen.removeEventListener) global.screen.removeEventListener("change", H.screen); } catch (_) { /* */ }
  }
  function watchPermission() {
    try {
      if (!navigator.permissions || !navigator.permissions.query) return;
      navigator.permissions.query({ name: "camera" }).then(function (p) {
        p.onchange = function () {
          if (!active()) return;
          if (p.state === "denied") openEp("camoff", "permission revoked");
        };
      }).catch(function () { /* */ });
    } catch (_) { /* */ }
  }

  /* ---------------- full-screen helpers ---------------- */
  function reqFs() {
    try {
      var el = document.documentElement;
      var r = el.requestFullscreen ? el.requestFullscreen() : (el.webkitRequestFullscreen ? el.webkitRequestFullscreen() : null);
      if (r && r.catch) r.catch(function () { /* phones / iframes may refuse */ });
    } catch (_) { /* */ }
  }
  function exitFs() {
    try {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
      else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (_) { /* */ }
  }
  function showFsBar() {
    if (document.getElementById("qxPrFsBar")) return;
    var b = document.createElement("div");
    b.id = "qxPrFsBar";
    b.className = "qxpr-fsbar";
    b.innerHTML = '<span>Full screen exited — this is recorded.</span><button type="button">Return to full screen</button>';
    b.querySelector("button").onclick = function () { reqFs(); };
    document.body.appendChild(b);
  }
  function hideFsBar() { var b = document.getElementById("qxPrFsBar"); if (b) b.remove(); }

  /* ---------------- self-view (draggable) ---------------- */
  function updatePip() {
    if (!_pip || !_state) return;
    var st = $(".qxpr-pip-st", _pip);
    if (!st) return;
    var openKeys = Object.keys(_state.open).filter(function (k) { return k !== "tab"; });
    var txt, cls;
    if (_modelState === "loading") { txt = "Loading AI…"; cls = "wait"; }
    else if (_modelState === "failed") { txt = "Signals only"; cls = "warn"; }
    else if (openKeys.length) { txt = (TYPES[openKeys[0]] || {}).label || "Check"; cls = "bad"; }
    else { txt = "Monitoring"; cls = "ok"; }
    st.textContent = txt;
    st.className = "qxpr-pip-st " + cls;
  }
  function defaultPipPos() {
    var w = (_pip && _pip.offsetWidth) || 112;
    return { x: Math.max(8, (global.innerWidth || 360) - w - 8), y: 12 };
  }
  function clampPos(x, y) {
    var w = _pip.offsetWidth || 112, h = _pip.offsetHeight || 96;
    return {
      x: Math.min(Math.max(4, x), Math.max(4, (global.innerWidth || 360) - w - 4)),
      y: Math.min(Math.max(4, y), Math.max(4, (global.innerHeight || 640) - h - 4))
    };
  }
  function placePip(x, y, save) {
    var p = clampPos(x, y);
    _pip.style.left = p.x + "px";
    _pip.style.top = p.y + "px";
    _pip.style.right = "auto";
    _pip.style.bottom = "auto";
    if (save) { try { localStorage.setItem(PIP_POS_KEY, JSON.stringify(p)); } catch (_) { /* */ } }
  }
  function showPip() {
    if (_pip || !_stream) return;
    ensureCss();
    _pip = document.createElement("div");
    _pip.className = "qxpr-pip";
    _pip.id = "qxPrPip";
    _pip.setAttribute("title", "AI Proctor self-view — drag to move");
    _pip.innerHTML = '<video playsinline muted autoplay></video>' +
      '<div class="qxpr-pip-bar"><i class="qxpr-dot"></i><span class="qxpr-pip-st wait">Starting…</span>' +
      '<button type="button" class="qxpr-pip-pin" title="Reset camera to top right" aria-label="Reset camera position">⌂</button></div>';
    document.body.appendChild(_pip);
    _video = $("video", _pip);
    _video.srcObject = _stream;
    var pl = _video.play();
    if (pl && pl.catch) pl.catch(function () { /* */ });
    function snapTopRight(save) {
      var d = defaultPipPos();
      placePip(d.x, d.y, !!save);
    }
    try {
      var saved = JSON.parse(localStorage.getItem(PIP_POS_KEY) || "null");
      if (saved && typeof saved.x === "number" && typeof saved.y === "number") placePip(saved.x, saved.y, false);
      else snapTopRight(false);
    } catch (_) { snapTopRight(false); }
    var pin = $(".qxpr-pip-pin", _pip);
    if (pin) pin.addEventListener("pointerdown", function (e) {
      e.stopPropagation();
      e.preventDefault();
      snapTopRight(true);
    });
    var sx, sy, ox, oy, on = false;
    function down(e) {
      if (e.button != null && e.button !== 0) return;
      if (e.target && e.target.closest && e.target.closest(".qxpr-pip-pin")) return;
      on = true; sx = e.clientX; sy = e.clientY;
      var r = _pip.getBoundingClientRect(); ox = r.left; oy = r.top;
      _pip.classList.add("drag");
      try { _pip.setPointerCapture(e.pointerId); } catch (_) { /* */ }
      e.preventDefault();
    }
    function move(e) { if (on) { placePip(ox + e.clientX - sx, oy + e.clientY - sy, false); e.preventDefault(); } }
    function up() { if (!on) return; on = false; _pip.classList.remove("drag"); var r = _pip.getBoundingClientRect(); placePip(r.left, r.top, true); }
    _pip.addEventListener("pointerdown", down);
    _pip.addEventListener("pointermove", move);
    _pip.addEventListener("pointerup", up);
    _pip.addEventListener("pointercancel", up);
    _pip.addEventListener("dblclick", function () { snapTopRight(true); });
    global.addEventListener("resize", function pipClamp() {
      if (!_pip) return;
      var r = _pip.getBoundingClientRect();
      placePip(r.left, r.top, false);
    });
    _drag = { down: down };
    updatePip();
  }
  function removePip() {
    if (_pip && _pip.parentNode) _pip.parentNode.removeChild(_pip);
    _pip = null; _video = null;
  }
  function stopStream(s) {
    try { (s || _stream).getTracks().forEach(function (t) { try { t.stop(); } catch (_) { /* */ } }); } catch (_) { /* */ }
  }

  /* ---------------- choice at test start ---------------- */
  function choose(config) {
    ensureCss();
    _gating = true;
    if (_pending && _pending.stream) stopStream(_pending.stream);
    _pending = null;
    return new Promise(function (resolve) {
      var root = document.createElement("div");
      root.className = "qxpr-choice";
      root.id = "qxPrChoice";
      root.setAttribute("role", "dialog");
      root.setAttribute("aria-modal", "true");
      root.setAttribute("aria-labelledby", "qxPrChoiceT");
      var title = esc((config && config.title) || "Test");
      root.innerHTML =
        '<div class="qxpr-card">' +
          '<p class="qxpr-kicker">Quantrex Academy</p>' +
          '<h2 id="qxPrChoiceT">How do you want to take this test?</h2>' +
          '<p class="qxpr-sub">' + title + '</p>' +
          '<div class="qxpr-opts" data-step="pick">' +
            '<button type="button" class="qxpr-opt qxpr-opt-ai" id="qxPrWith">' +
              '<span class="qxpr-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="M15.5 10.5 21 7.5v9l-5.5-3"/></svg></span>' +
              '<span class="qxpr-opt-t"><b>Take test with AI Proctor</b><small>Camera + on-device AI · integrity report after submit</small></span></button>' +
            '<button type="button" class="qxpr-opt" id="qxPrWithout">' +
              '<span class="qxpr-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16M14 6l6 6-6 6"/></svg></span>' +
              '<span class="qxpr-opt-t"><b>Take test without AI Proctor</b><small>Start normally</small></span></button>' +
          '</div>' +
          '<div class="qxpr-status" id="qxPrStatus" hidden></div>' +
          '<p class="qxpr-privacy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/></svg>Video is processed on your device and never uploaded.</p>' +
        '</div>';
      document.body.appendChild(root);
      var done = false;
      function finish(withProctor, stream) {
        if (done) return;
        done = true;
        _gating = false;
        _pending = withProctor ? { stream: stream, config: config || {} } : null;
        global.__qxProctorFs = !!withProctor; // keep the browser full screen the student just entered
        try { root.remove(); } catch (_) { /* */ }
        if (withProctor) loadModel();
        resolve({ proctor: !!withProctor });
      }
      var status = $("#qxPrStatus", root);
      var opts = $(".qxpr-opts", root);
      function setStatus(html) { status.hidden = false; status.innerHTML = html; }
      function askCamera() {
        opts.hidden = true;
        setStatus('<div class="qxpr-spin" aria-hidden="true"></div><p>Allow camera access to start AI Proctor…</p>');
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { denied("This browser does not support camera access."); return; }
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
          .then(function (stream) { finish(true, stream); })
          .catch(function (e) {
            var n = e && e.name;
            denied(n === "NotAllowedError" ? "Camera permission was denied." : n === "NotFoundError" ? "No camera was found on this device." : "Camera could not be started.");
          });
      }
      function denied(msg) {
        setStatus('<p class="qxpr-err">' + esc(msg) + '</p><p class="qxpr-hint">You can allow the camera in your browser settings and retry, or continue without AI Proctor.</p>' +
          '<div class="qxpr-row"><button type="button" class="qxpr-btn" id="qxPrRetry">Retry camera</button>' +
          '<button type="button" class="qxpr-btn qxpr-btn-p" id="qxPrNo">Continue without AI Proctor</button></div>');
        $("#qxPrRetry", root).onclick = function () { reqFs(); askCamera(); };
        $("#qxPrNo", root).onclick = function () { finish(false); };
      }
      $("#qxPrWith", root).onclick = function () { reqFs(); askCamera(); };
      $("#qxPrWithout", root).onclick = function () { finish(false); };
      setTimeout(function () { try { $("#qxPrWith", root).focus(); } catch (_) { /* */ } }, 30);
    });
  }

  /* ---------------- session lifecycle ---------------- */
  function newState(config) {
    return {
      id: "pr_" + Date.now(),
      proctored: true,
      title: (config && config.title) || "Test",
      startedAt: Date.now(),
      ended: false,
      events: [],
      open: {},
      cond: {},
      thumbs: 0,
      qlog: [],
      frames: 0,
      okFrames: 0,
      fsSeen: !!(document.fullscreenElement || document.webkitFullscreenElement),
      modelReady: _modelState === "ready",
      backend: global.tf && global.tf.getBackend ? global.tf.getBackend() : null,
      detMs: null
    };
  }
  function begin(config) {
    if (!_pending || (config && config.practiceMode)) return false;
    var p = _pending;
    _pending = null;
    if (_state && !_state.ended) stop();
    _stream = p.stream;
    _state = newState(config || p.config);
    noteQ();
    bind();
    showPip();
    watchPermission();
    try {
      _stream.getVideoTracks().forEach(function (t) {
        t.addEventListener("ended", function () { if (active()) openEp("camoff"); });
      });
    } catch (_) { /* */ }
    if (_loop) clearInterval(_loop);
    _loop = setInterval(tick, TICK_MS);
    if (_clock) clearInterval(_clock);
    _clock = setInterval(function () { checkDisplay(); }, 15000);
    checkDisplay();
    checkDevtools();
    if (!_state.fsSeen && document.hidden === false) { /* full screen refused (e.g. iPhone) — not an event */ }
    loadModel();
    return true;
  }
  function stop() {
    if (_pending && _pending.stream) { stopStream(_pending.stream); _pending = null; }
    if (_state && !_state.ended) {
      var now = Date.now();
      Object.keys(_state.open).forEach(function (k) { closeEp(k, now); });
      _state.ended = true;
      _state.endedAt = now;
      _state.durationMs = now - _state.startedAt;
      persist();
    }
    if (_loop) { clearInterval(_loop); _loop = null; }
    if (_clock) { clearInterval(_clock); _clock = null; }
    unbind();
    hideFsBar();
    if (_stream) stopStream(_stream);
    _stream = null;
    removePip();
    if (_state && _state.proctored) exitFs();
    _gating = false;
    global._qxProctorGating = false;
    global.__qxProctorFs = false;
  }

  /* ---------------- scoring + report ---------------- */
  function integrityIntel() {
    var s = _state;
    if (!s || !s.proctored) return { score: 100, band: "na", deductions: [] };
    var byType = {};
    s.events.forEach(function (e) {
      var w = SEV_W[e.sev] || 2;
      var extra = e.dur ? Math.min(8, Math.floor(e.dur / 10000)) : 0;
      byType[e.type] = (byType[e.type] || 0) + w + extra;
    });
    var total = 0, ded = [];
    Object.keys(byType).forEach(function (k) {
      var d = Math.min(30, byType[k]);
      total += d;
      ded.push({ type: k, label: (TYPES[k] || {}).label || k, points: d });
    });
    var score = Math.max(0, Math.round(100 - total));
    var band = score >= 85 ? "good" : score >= 60 ? "review" : "risk";
    return { score: score, band: band, deductions: ded };
  }
  function fmtT(ms) {
    var s = Math.round((ms || 0) / 1000);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return (h ? h + ":" + p(m) : m) + ":" + p(x);
  }
  function fmtDur(ms) {
    if (!ms) return "instant";
    var s = Math.round(ms / 1000);
    if (s < 60) return s + "s";
    return Math.floor(s / 60) + "m " + (s % 60) + "s";
  }
  function verdict(intel) {
    if (intel.band === "good") return { t: "No significant concerns", d: "Monitoring found no major integrity issues in this attempt. Flags are indicators for review, never automatic proof of cheating." };
    if (intel.band === "review") return { t: "Potential integrity event — requires review", d: "A few moments need a human review. AI flags are indicators, not proof. This is not an automatic cheating decision." };
    return { t: "Potential integrity event — requires review", d: "Several flags were recorded. Review the timeline below. AI flags are indicators, not proof. This is not an automatic cheating decision." };
  }
  function reportHtml() {
    var s = _state;
    if (!s || !s.proctored) return "";
    var intel = integrityIntel();
    var v = verdict(intel);
    var evs = s.events.slice().sort(function (a, b) { return a.t0 - b.t0; });
    var counts = {};
    evs.forEach(function (e) { counts[e.type] = (counts[e.type] || 0) + 1; });
    var faceCov = s.frames ? Math.round(100 * s.okFrames / s.frames) : null;
    var aiLine = s.modelReady
      ? "Face AI: BlazeFace on this device (" + esc(s.backend || "") + ")" + (faceCov != null ? " · face clearly visible in " + faceCov + "% of " + s.frames + " checks" : "")
      : (s.modelFailed ? "Face AI could not load on this device — browser signals and camera checks only." : "Face AI was still loading — browser signals and camera checks only.");
    var rows = evs.map(function (e) {
      return '<tr class="sev-' + e.sev + '"><td data-l="Time">' + fmtT(e.t0) + '</td><td data-l="Duration">' + fmtDur(e.dur) + '</td><td data-l="Type" class="qxpr-ty">' +
        (e.thumb ? '<img class="qxpr-th" alt="" src="' + e.thumb + '">' : "") + "<span>" + esc(e.label) + (e.note ? ' <small>(' + esc(e.note) + ")</small>" : "") +
        '</span></td><td data-l="Question">' + (e.q ? "Q" + e.q : "\u2014") + '</td><td data-l="Severity"><em class="qxpr-sev ' + e.sev + '">' + e.sev + "</em></td></tr>";
    }).join("");
    var chips = Object.keys(counts).map(function (k) {
      return '<li><b>' + counts[k] + "</b><span>" + esc((TYPES[k] || {}).label || k) + "</span></li>";
    }).join("");
    return '<section class="qxpr-report" id="qxPrReport" aria-labelledby="qxPrRepT">' +
      '<header class="qxpr-rep-h"><div><h2 id="qxPrRepT">AI Proctor Report</h2><p>' + esc(s.title) + " · monitored " + fmtDur(s.durationMs || 0) + "</p></div>" +
      '<button type="button" class="qxpr-btn" data-qxpr-print>Print report</button></header>' +
      '<div class="qxpr-rep-top"><div class="qxpr-score ' + intel.band + '"><b>' + intel.score + "</b><small>/100</small><span>Integrity score</span></div>" +
      '<div class="qxpr-verdict ' + intel.band + '"><h3>' + esc(v.t) + "</h3><p>" + esc(v.d) + "</p><p class=\"qxpr-ai\">" + aiLine + "</p></div></div>" +
      (evs.length
        ? '<h3 class="qxpr-h3">Counts by type</h3><ul class="qxpr-counts">' + chips + "</ul>" +
          '<h3 class="qxpr-h3">Moments that need review (' + evs.length + ")</h3>" +
          '<div class="qxpr-tblw"><table class="qxpr-tbl"><thead><tr><th>Time into test</th><th>Duration</th><th>Type</th><th>Question</th><th>Severity</th></tr></thead><tbody>' + rows + "</tbody></table></div>"
        : '<p class="qxpr-clean">No suspicious activity was recorded during this attempt.</p>') +
      '<p class="qxpr-foot">Video was processed on your device and never uploaded. Thumbnails (if any) exist only in this browser tab.</p>' +
      "</section>";
  }
  function printPrep() {
    var rep = document.getElementById("qxPrReport");
    if (!rep) return false;
    printDone();
    var host = document.createElement("div");
    host.className = "qxpr-print-host";
    host.id = "qxPrPrintHost";
    var c = rep.cloneNode(true);
    c.id = "qxPrReportPrint";
    host.appendChild(c);
    document.body.appendChild(host);
    document.documentElement.classList.add("qxpr-printing");
    return true;
  }
  function printDone() {
    document.documentElement.classList.remove("qxpr-printing");
    var h = document.getElementById("qxPrPrintHost");
    if (h) h.remove();
  }
  function bindReport(root) {
    if (!root) return;
    var b = root.querySelector("[data-qxpr-print]");
    if (b) b.onclick = function (e) {
      e.preventDefault();
      if (!printPrep()) return;
      var off = function () { printDone(); global.removeEventListener("afterprint", off); };
      global.addEventListener("afterprint", off);
      try { global.print(); } catch (_) { /* */ }
      setTimeout(off, 1200);
    };
  }
  function mountReport(host) {
    if (!host || !_state || !_state.proctored) return; // only when this attempt was proctored
    ensureCss();
    if (document.getElementById("qxPrReport")) return;
    var w = document.createElement("div");
    w.innerHTML = reportHtml();
    var node = w.firstChild;
    if (!node) return;
    var anchor = host.querySelector("#qxAnalysis") || host.querySelector("#mkRcBody") || host.querySelector("#mkRcView") || host.querySelector(".result-stats");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(node, anchor.nextSibling);
    else host.insertAdjacentElement("afterbegin", node);
    bindReport(node);
    // keep the report directly after the analysis section once it mounts
    try {
      var mo = new MutationObserver(function () {
        var an = document.getElementById("qxAnalysis"), rep = document.getElementById("qxPrReport");
        if (an && rep && an.nextSibling !== rep && an.parentNode) { an.parentNode.insertBefore(rep, an.nextSibling); mo.disconnect(); }
      });
      mo.observe(host, { childList: true, subtree: true });
      setTimeout(function () { mo.disconnect(); }, 8000);
    } catch (_) { /* */ }
  }
  function persist() {
    try {
      var intel = integrityIntel();
      var list = JSON.parse(localStorage.getItem(LOG_KEY) || "[]") || [];
      list.unshift({
        id: _state.id, title: _state.title, startedAt: _state.startedAt, endedAt: _state.endedAt,
        score: intel.score, band: intel.band,
        events: _state.events.map(function (e) { return { type: e.type, t0: e.t0, dur: e.dur, q: e.q, sev: e.sev }; })
      });
      localStorage.setItem(LOG_KEY, JSON.stringify(list.slice(0, 10)));
    } catch (_) { /* */ }
  }

  /* ---------------- compat API ---------------- */
  function showTabSwitchWarn(count) {
    if (document.getElementById("qxPrTabWarn")) return;
    ensureCss();
    var n = Number(count) || 1;
    var o = document.createElement("div");
    o.id = "qxPrTabWarn";
    o.className = "qxpr-choice";
    o.innerHTML = '<div class="qxpr-card" role="alertdialog" aria-modal="true"><h2>Tab switch detected</h2><p class="qxpr-sub">You left this test ' + n + ' time' + (n === 1 ? "" : "s") + '. Please stay on this tab until you submit.</p><div class="qxpr-row"><button type="button" class="qxpr-btn qxpr-btn-p">I understand</button></div></div>';
    document.body.appendChild(o);
    o.querySelector("button").onclick = function () { o.remove(); };
  }
  function gate() {
    // Mid-test enabling is not offered: the choice exists only at test start.
    if (active()) toast("AI Proctor is ON");
    else toast("AI Proctor can be chosen only when a test starts");
    return Promise.resolve(true);
  }

  global.QxAiProctor = {
    version: VER,
    choose: choose,
    begin: begin,
    shouldGate: function () { return false; },
    enabled: function () { return active(); },
    setEnabled: function () { /* choice is per test now */ },
    gate: gate,
    attach: function () { /* replaced by begin() */ },
    stop: stop,
    mountReport: mountReport,
    reportHtml: reportHtml,
    bindReport: bindReport,
    printPrep: printPrep,
    printDone: printDone,
    noteNav: function () { setTimeout(noteQ, 0); },
    noteExternal: function () { /* engine tab counter not needed: own visibility episodes */ },
    ensureState: function () { return _state; },
    getState: function () { return _state; },
    integrityIntel: integrityIntel,
    showTabSwitchWarn: showTabSwitchWarn,
    isGating: function () { return _gating; },
    historyHtml: function () { return ""; },
    snapshot: function () { /* */ },
    _debug: { classify: classify, modelState: function () { return _modelState; }, events: function () { return _state ? _state.events : []; } }
  };
})(typeof window !== "undefined" ? window : this);
