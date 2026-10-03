/**
 * Quantrex practice voice pack — God / Hero / Demon / Villain / Mirzapur.
 * Voice only after Check Answer. No captions. Default OFF until Settings.
 */
(function (global) {
  "use strict";

  var KEYS = {
    on: "qx_pref_practice_voice",
    lang: "qx_pref_voice_lang",
    correct: "qx_pref_voice_correct",
    wrong: "qx_pref_voice_wrong",
    god: "qx_pref_voice_god",
    hero: "qx_pref_voice_hero",
    mirza: "qx_pref_voice_mirza"
  };
  var DEF = {
    on: "0",
    lang: "hi",
    correct: "all",
    wrong: "all",
    god: "auto",
    hero: "auto",
    mirza: "auto"
  };
  var ROOT = "assets/practice-voice/";
  var _clips = [];
  var _loaded = false;
  var _loadP = null;
  var _audio = null;
  var _lastId = "";
  var _unlock = false;

  function lsGet(k, d) {
    try {
      var v = localStorage.getItem(k);
      return v == null ? d : v;
    } catch (_) {
      return d;
    }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); } catch (_) { /* */ }
  }
  function cfg() {
    return {
      on: lsGet(KEYS.on, DEF.on) === "1",
      lang: lsGet(KEYS.lang, DEF.lang),
      correct: lsGet(KEYS.correct, DEF.correct),
      wrong: lsGet(KEYS.wrong, DEF.wrong),
      god: lsGet(KEYS.god, DEF.god),
      hero: lsGet(KEYS.hero, DEF.hero),
      mirza: lsGet(KEYS.mirza, DEF.mirza)
    };
  }
  function playSoundsOn() {
    try {
      if (typeof QxSettings !== "undefined" && QxSettings.getQuestionSettings) {
        return QxSettings.getQuestionSettings().playSounds !== false;
      }
    } catch (_) { /* */ }
    try {
      var raw = JSON.parse(localStorage.getItem("qx_marks_question_settings") || "{}") || {};
      if (typeof raw.playSounds === "boolean") return raw.playSounds;
    } catch (_) { /* */ }
    return true;
  }
  function enabled() {
    return cfg().on && playSoundsOn();
  }

  function injectCss() {
    if (document.getElementById("qxVoiceCss")) return;
    var s = document.createElement("style");
    s.id = "qxVoiceCss";
    s.textContent = [
      "#qxVoiceSec{margin:10px 0 6px;padding:10px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0}",
      "html[data-theme=dark] #qxVoiceSec,.eg-test-root[data-test-theme=dark] #qxVoiceSec{background:#0b1220;border-color:#1e293b}",
      "#qxVoiceSec .eg-fmt-row{display:flex;gap:6px;flex-wrap:wrap}",
      "#qxVoiceSec .eg-fmt-row button{appearance:none;border:1px solid #cbd5e1;background:#f1f5f9;color:#0f172a;border-radius:10px;padding:7px 10px;font-size:12px;font-weight:700;cursor:pointer}",
      "#qxVoiceSec .eg-fmt-row button.on{background:#2563eb;color:#fff;border-color:#2563eb}",
      "html[data-theme=dark] #qxVoiceSec .eg-fmt-row button,.eg-test-root[data-test-theme=dark] #qxVoiceSec .eg-fmt-row button{background:#1e293b;color:#f1f5f9;border-color:#475569}",
      ".eg-vs-voice-preview{appearance:none;border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:10px;padding:8px 12px;font-size:13px;font-weight:700;cursor:pointer;width:100%;margin:6px 0 4px}",
      "html[data-theme=dark] .eg-vs-voice-preview,.eg-test-root[data-test-theme=dark] .eg-vs-voice-preview{background:#1e293b;color:#f1f5f9;border-color:#475569}",
      ".qx-set-voice-note{display:block;font-size:11px;color:#64748b;padding:0 16px 12px}"
    ].join("");
    document.head.appendChild(s);
  }

  function bust() {
    return encodeURIComponent((typeof global.QX_BUILD === "string" && global.QX_BUILD) || "qxmd287");
  }
  function load() {
    if (_loaded) return Promise.resolve(_clips);
    if (_loadP) return _loadP;
    _loadP = fetch(ROOT + "manifest.json?v=" + bust(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : { clips: [] }; })
      .then(function (j) {
        _clips = (j && j.clips) || [];
        _loaded = true;
        return _clips;
      })
      .catch(function () {
        _clips = [];
        _loaded = true;
        return _clips;
      });
    return _loadP;
  }

  function unlock() {
    if (_unlock) return;
    _unlock = true;
    try {
      if (!_audio) _audio = new Audio();
      _audio.muted = true;
      _audio.src = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYo2q17AAAAAAD/+1DEAAA=";
      var p = _audio.play();
      if (p && p.catch) p.catch(function () {});
      setTimeout(function () {
        try { _audio.pause(); _audio.muted = false; } catch (_) { /* */ }
      }, 80);
    } catch (_) { /* */ }
  }

  function rolesFor(ok, c) {
    if (ok) {
      if (c.correct === "god") return ["god"];
      if (c.correct === "hero") return ["hero"];
      if (c.correct === "mirzapur") return ["mirzapur"];
      return ["god", "hero", "mirzapur"];
    }
    if (c.wrong === "demon") return ["demon"];
    if (c.wrong === "villain") return ["villain"];
    if (c.wrong === "mirzapur") return ["mirzapur"];
    return ["demon", "villain", "mirzapur"];
  }
  function langsFor(c) {
    if (c.lang === "en") return ["en"];
    if (c.lang === "mix") return ["hi", "en"];
    return ["hi"];
  }
  function styleOk(clip, c) {
    if (clip.role === "god" && c.god && c.god !== "auto") return clip.style === c.god;
    if (clip.role === "hero" && c.hero && c.hero !== "auto") return clip.style === c.hero;
    if (clip.role === "mirzapur" && c.mirza && c.mirza !== "auto") return clip.style === c.mirza;
    return true;
  }
  function pick(ok, force) {
    var c = cfg();
    if (!force && !c.on) return null;
    var roles = rolesFor(!!ok, c);
    var langs = langsFor(c);
    var side = ok ? "right" : "wrong";
    var pool = _clips.filter(function (x) {
      return x.side === side && roles.indexOf(x.role) >= 0 && langs.indexOf(x.lang) >= 0 && styleOk(x, c);
    });
    if (!pool.length) {
      pool = _clips.filter(function (x) {
        return x.side === side && roles.indexOf(x.role) >= 0 && langs.indexOf(x.lang) >= 0;
      });
    }
    if (!pool.length) {
      pool = _clips.filter(function (x) { return x.side === side && roles.indexOf(x.role) >= 0; });
    }
    if (pool.length > 1) pool = pool.filter(function (x) { return x.id !== _lastId; }) || pool;
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function fallbackSpeak(ok, lang) {
    try {
      if (!global.speechSynthesis) return;
      global.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(ok
        ? (lang === "en" ? "Correct." : "Sahi uttar.")
        : (lang === "en" ? "Try again." : "Dobara koshish karo."));
      u.lang = lang === "en" ? "en-IN" : "hi-IN";
      u.rate = 1;
      global.speechSynthesis.speak(u);
    } catch (_) { /* */ }
  }

  function playClip(clip, ok) {
    if (!clip) return;
    _lastId = clip.id;
    unlock();
    try {
      if (!_audio) _audio = new Audio();
      _audio.muted = false;
      _audio.volume = 1;
      _audio.src = ROOT + clip.file + "?v=" + bust();
      var p = _audio.play();
      if (p && p.catch) {
        p.catch(function () {
          fallbackSpeak(ok, clip.lang);
        });
      }
    } catch (_) {
      fallbackSpeak(ok, clip && clip.lang);
    }
  }

  function play(ok) {
    if (!enabled()) return false;
    load().then(function () {
      var clip = pick(!!ok, false);
      if (clip) playClip(clip, !!ok);
    });
    return true;
  }

  function preview() {
    unlock();
    load().then(function () {
      var clip = pick(true, true) || pick(false, true);
      if (clip) playClip(clip, clip.side === "right");
    });
  }

  function chipRow(key, lab, hint, opts, def) {
    var cur = lsGet(key, def);
    return '<div class="eg-vs-row eg-vs-sizes"><div class="eg-vs-lab"><span class="eg-vs-lab-t">' + lab + "</span>" +
      (hint ? '<span class="eg-vs-hint">' + hint + "</span>" : "") + "</div>" +
      '<div class="eg-fmt-row eg-vs-size-row" role="group">' +
      opts.map(function (o) {
        return '<button type="button" data-qx-voice-key="' + key + '" data-qx-voice-val="' + o.v + '"' +
          (cur === o.v ? ' class="on"' : "") + ">" + o.l + "</button>";
      }).join("") +
      "</div></div>";
  }

  function settingsHtml() {
    injectCss();
    var on = lsGet(KEYS.on, DEF.on) === "1";
    return '<section class="eg-vs-sec" id="qxVoiceSec"><h5 class="eg-vs-h">Practice Voice</h5>' +
      '<div class="eg-vs-row"><div class="eg-vs-lab"><span class="eg-vs-lab-t">Voice after Check Answer</span>' +
      '<span class="eg-vs-hint">God, Hero, Demon, Villain, Mirzapur — voice only, no text. Off until you turn it on.</span></div>' +
      '<button type="button" class="eg-vs-tog' + (on ? " on" : "") + '" data-eg-pref="' + KEYS.on + '" aria-pressed="' + (on ? "true" : "false") + '" role="switch"><span class="eg-vs-knob"></span></button></div>' +
      chipRow(KEYS.lang, "Voice language", "Hindi, English, or mix", [
        { v: "hi", l: "Hindi" }, { v: "en", l: "English" }, { v: "mix", l: "Mix" }
      ], DEF.lang) +
      chipRow(KEYS.correct, "Correct voice", "Right answer pack", [
        { v: "god", l: "God" }, { v: "hero", l: "Hero" }, { v: "mirzapur", l: "Mirzapur" }, { v: "all", l: "All" }
      ], DEF.correct) +
      chipRow(KEYS.wrong, "Wrong voice", "Wrong answer pack", [
        { v: "demon", l: "Demon" }, { v: "villain", l: "Villain" }, { v: "mirzapur", l: "Mirzapur" }, { v: "all", l: "All" }
      ], DEF.wrong) +
      chipRow(KEYS.god, "God voice", "Krishna blessing tone", [
        { v: "blessing", l: "Blessing" }, { v: "deep", l: "Deep" }, { v: "calm", l: "Calm" }, { v: "auto", l: "Auto" }
      ], DEF.god) +
      chipRow(KEYS.hero, "Hero voice", "Meme / mass tone", [
        { v: "mass", l: "Mass" }, { v: "meme", l: "Meme" }, { v: "punch", l: "Punch" }, { v: "auto", l: "Auto" }
      ], DEF.hero) +
      chipRow(KEYS.mirza, "Mirzapur voice", "Mass court tone", [
        { v: "mass", l: "Mass" }, { v: "fire", l: "Fire" }, { v: "court", l: "Court" }, { v: "auto", l: "Auto" }
      ], DEF.mirza) +
      '<button type="button" class="eg-vs-voice-preview" data-qx-voice-preview>Hear sample</button>' +
      "</section>";
  }

  function bindSettings(root) {
    if (!root) return;
    injectCss();
    root.querySelectorAll("[data-qx-voice-key]").forEach(function (b) {
      b.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        var key = b.getAttribute("data-qx-voice-key");
        var val = b.getAttribute("data-qx-voice-val");
        if (!key || !val) return;
        lsSet(key, val);
        var row = b.parentNode;
        if (row) {
          row.querySelectorAll("[data-qx-voice-key]").forEach(function (x) {
            x.classList.toggle("on", x.getAttribute("data-qx-voice-val") === val);
          });
        }
      };
    });
    root.querySelectorAll("[data-qx-voice-preview]").forEach(function (b) {
      b.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        preview();
      };
    });
    root.querySelectorAll('[data-eg-pref="' + KEYS.on + '"]').forEach(function (b) {
      if (b._qxVoiceBound) return;
      b._qxVoiceBound = true;
      b.addEventListener("click", function () {
        unlock();
      });
    });
  }

  try {
    document.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  } catch (_) { /* */ }

  global.QxPracticeVoice = {
    KEYS: KEYS,
    enabled: enabled,
    cfg: cfg,
    load: load,
    play: play,
    preview: preview,
    settingsHtml: settingsHtml,
    bindSettings: bindSettings,
    unlock: unlock
  };
})(typeof window !== "undefined" ? window : this);
