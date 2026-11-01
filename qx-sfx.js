/* qx-sfx: meme answer-feedback sounds (practice Check Answer only). Isolated module.
   Off by default. Lazy: manifest + clips load only when ON. Never plays in a live test. */
(function () {
  "use strict";
  if (window.QxSfx) return;
  var BASE = "assets/sfx/", V = "qxmd391";
  var K = { on: "qx_sfx_on", pack: "qx_sfx_pack", vol: "qx_sfx_vol", rnd: "qx_sfx_random" };
  function g(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (_) { return d; } }
  function s(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }
  var man = null, manP = null, audio = null, unlocked = false, last = {}, nextUp = { correct: null, wrong: null }, pre = {};
  function enabled() { return g(K.on, "0") === "1"; }
  function load() {
    if (man) return Promise.resolve(man);
    if (!manP) manP = fetch(BASE + "manifest.json?v=" + V).then(function (r) { return r.json(); }).then(function (j) { man = j; return j; }).catch(function () { manP = null; return null; });
    return manP;
  }
  function el() {
    if (!audio) { audio = new Audio(); audio.preload = "auto"; audio.setAttribute("playsinline", ""); audio.id = "qxSfxAudio"; }
    return audio;
  }
  function unlock() {
    if (unlocked) return; unlocked = true;
    try { var a = el(); a.muted = true; a.src = BASE + "silent.mp3?v=" + V; var p = a.play(); if (p && p.then) p.then(function () { if (/silent\.mp3/.test(a.src)) a.pause(); a.muted = false; }).catch(function () { a.muted = false; unlocked = false; }); else a.muted = false; } catch (_) { unlocked = false; }
  }
  function pool(cat) {
    if (!man) return [];
    var pk = g(K.pack, "all");
    var list = man.clips.filter(function (c) { return c.category === cat && (pk === "all" || c.pack === pk); });
    if (!list.length) list = man.clips.filter(function (c) { return c.category === cat; });
    return list;
  }
  function pick(cat) {
    var l = pool(cat); if (!l.length) return null;
    if (g(K.rnd, "1") !== "1") { var i = ((last[cat] == null ? -1 : last[cat]) + 1) % l.length; last[cat] = i; return l[i]; }
    var c; for (var t = 0; t < 4; t++) { c = l[Math.floor(Math.random() * l.length)]; if (c.file !== last[cat]) break; }
    last[cat] = c.file; return c;
  }
  function prefetch(c) {
    if (!c || pre[c.file]) return;
    try { var a = new Audio(); a.preload = "auto"; a.src = BASE + c.file + "?v=" + V; pre[c.file] = a; var ks = Object.keys(pre); if (ks.length > 4) delete pre[ks[0]]; } catch (_) {}
  }
  function prep() { nextUp.correct = pick("correct"); nextUp.wrong = pick("wrong"); prefetch(nextUp.correct); prefetch(nextUp.wrong); }
  function inLiveTest() {
    try {
      if (document.querySelector(".qx-proctor-active,[data-qx-proctor-on]")) return true;
      var r = document.querySelector(".eg-test-root");
      if (r && r.getAttribute("data-mode") === "test") return true;
    } catch (_) {}
    return false;
  }
  function playClip(c) {
    if (!c) return;
    try {
      var a = el(); a.pause(); a.muted = false; a.src = BASE + c.file + "?v=" + V;
      a.volume = Math.max(0, Math.min(1, (+g(K.vol, "70") || 0) / 100));
      var p = a.play(); if (p && p.catch) p.catch(function () {});
    } catch (_) {}
  }
  function play(right, force) {
    if (!force && (!enabled() || inLiveTest())) return;
    var cat = right ? "correct" : "wrong";
    load().then(function () {
      var c = nextUp[cat] || pick(cat); nextUp[cat] = null; playClip(c);
      setTimeout(prep, 600);
    });
  }
  var PACKS = [["all", "All memes (random)"]];
  function chips(key, opts, cur, attr) {
    return '<div class="eg-fmt-row qx-sfx-chips" role="group" style="display:flex;flex-wrap:wrap;gap:6px">' + opts.map(function (o) {
      return '<button type="button" style="flex:0 0 auto;width:auto;min-width:0;max-width:none;white-space:nowrap;padding:6px 10px" ' + attr + '="' + o[0] + '"' + (cur === o[0] ? ' class="on"' : "") + ">" + o[1] + "</button>";
    }).join("") + "</div>";
  }
  function settingsHtml() {
    var on = enabled(), pk = g(K.pack, "all"), rnd = g(K.rnd, "1") === "1";
    var packs = PACKS.concat((man && man.packs || window.__qxSfxPacks || []).map(function (p) { return [p.id, p.label + " (" + p.count + ")"]; }));
    if (!man) load().then(function (m) { if (m) { window.__qxSfxPacks = m.packs; var box = document.getElementById("qxSfxPacks"); if (box) { box.innerHTML = chips(K.pack, PACKS.concat(m.packs.map(function (p) { return [p.id, p.label + " (" + p.count + ")"]; })), g(K.pack, "all"), "data-qx-sfx-pack"); } } });
    return '<section class="eg-vs-sec" id="qxSfxSec"><h5 class="eg-vs-h">Sounds</h5>' +
      '<div class="eg-vs-row"><div class="eg-vs-lab"><span class="eg-vs-lab-t">Meme Sounds (Original)</span><span class="eg-vs-hint">Meme sound on Check Answer in practice. Never during a live test.</span></div>' +
      '<button type="button" class="eg-vs-tog' + (on ? " on" : "") + '" data-eg-pref="' + K.on + '" data-qx-sfx-tog aria-pressed="' + on + '" role="switch"><span class="eg-vs-knob"></span></button></div>' +
      '<div class="qx-sfx-packrow" style="display:block;padding:6px 0"><div class="eg-vs-lab-t" style="display:block;margin-bottom:6px">Sound pack</div><div id="qxSfxPacks">' + chips(K.pack, packs, pk, "data-qx-sfx-pack") + "</div></div>" +
      '<div class="eg-vs-row"><div class="eg-vs-lab"><span class="eg-vs-lab-t">Volume</span></div><input type="range" min="0" max="100" step="5" value="' + g(K.vol, "70") + '" data-qx-sfx-vol aria-label="Sound volume" style="width:140px"></div>' +
      '<div class="eg-vs-row"><div class="eg-vs-lab"><span class="eg-vs-lab-t">Random each time</span><span class="eg-vs-hint">Off = play in order</span></div>' +
      '<button type="button" class="eg-vs-tog' + (rnd ? " on" : "") + '" data-qx-sfx-rnd aria-pressed="' + rnd + '" role="switch"><span class="eg-vs-knob"></span></button></div>' +
      '<div class="eg-fmt-row qx-sfx-prev" style="display:flex;gap:8px"><button type="button" data-qx-sfx-prev="1">\u25B6 Correct</button><button type="button" data-qx-sfx-prev="0">\u25B6 Wrong</button></div></section>';
  }
  function bindSettings() {}
  /* delegated handlers: survive popover re-render */
  document.addEventListener("pointerdown", function (e) { var t = e.target; if (t && t.closest && t.closest("#qxSfxSec,#egCheckBtn,.eg-btn-check")) unlock(); }, { capture: true, passive: true });
  document.addEventListener("click", function (e) {
    var t = e.target; if (!t || !t.closest) return;
    var b;
    if ((b = t.closest("[data-qx-sfx-pack]"))) {
      e.preventDefault(); e.stopPropagation(); s(K.pack, b.getAttribute("data-qx-sfx-pack"));
      b.parentNode.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
      nextUp = { correct: null, wrong: null }; return;
    }
    if ((b = t.closest("[data-qx-sfx-rnd]"))) {
      e.preventDefault(); e.stopPropagation(); var n = g(K.rnd, "1") !== "1"; s(K.rnd, n ? "1" : "0");
      b.classList.toggle("on", n); b.setAttribute("aria-pressed", n); return;
    }
    if ((b = t.closest("[data-qx-sfx-prev]"))) {
      e.preventDefault(); e.stopPropagation(); unlock(); play(b.getAttribute("data-qx-sfx-prev") === "1", true); return;
    }
    if ((b = t.closest("[data-qx-sfx-tog]"))) { unlock(); setTimeout(function () { if (enabled()) load().then(prep); }, 50); }
  }, true);
  document.addEventListener("input", function (e) { var t = e.target; if (t && t.matches && t.matches("[data-qx-sfx-vol]")) { s(K.vol, t.value); try { if (audio) audio.volume = t.value / 100; } catch (_) {} } }, true);
  window.QxSfx = { enabled: enabled, play: play, unlock: unlock, settingsHtml: settingsHtml, bindSettings: bindSettings };
  if (enabled()) setTimeout(function () { load().then(prep); }, 4000);
})();
