/* qxmd355 — Quantrex Quiz Crorepati TV-stage player. Original host TTS + SFX. No KBC IP. */
(function (w) {
  "use strict";
  var LET = "ABCD";
  var CLASSIC = [1000, 2000, 3000, 5000, 10000, 20000, 40000, 80000, 160000, 320000, 640000, 1250000, 2500000, 5000000, 10000000];

  var LINES = {
    en: {
      welcome: "Welcome to Quantrex Academy. This is Quiz Crorepati, The Ultimate Challenge. Are you ready?",
      qintro: "Question {n}, for {prize} rupees.",
      hereq: "Here is your question.",
      opt: "Option {L}: {t}",
      clock: "You have {n} seconds. The clock starts now.",
      notime: "No time limit on this question. Take a breath, then choose.",
      s30: "Thirty seconds remaining.",
      s15: "Fifteen seconds left. Think carefully.",
      s10: "Ten seconds left.",
      s5: "Five.",
      s4: "Four.",
      s3: "Three.",
      s2: "Two.",
      s1: "One.",
      timeup: "Time is up.",
      pick: "Choose your answer, then lock it.",
      selected: "Option {L} selected. Lock your answer?",
      locked: "Option {L} — locked.",
      correct: "Correct! You have won {prize} rupees.",
      wrong: "That is the wrong answer. The correct option is {L}.",
      dropSafe: "You take home {prize} rupees.",
      dropZero: "This round ends at zero.",
      fifty: "Fifty-fifty. Two wrong options are going away.",
      audience: "Audience poll. This is a simulated classroom poll.",
      expert: "Let us ask the expert.",
      switchQ: "We change the question. Here is a new one of the same level.",
      next: "Next question.",
      mile: "Well done. You have crossed a safe level.",
      walk: "You walk away with {prize} rupees.",
      over: "Game over. Your final prize is {prize} rupees. Keep practising on Quantrex Academy.",
      crore: "Outstanding. You have climbed the full ladder.",
      lockAsk: "Computer, lock option {L}."
    },
    hi: {
      welcome: "नमस्कार। क्वांट्रेक्स अकादमी में आपका स्वागत है। यह है क्विज़ करोड़पति। क्या आप तैयार हैं?",
      qintro: "प्रश्न {n}, {prize} रुपये के लिए।",
      hereq: "यह रहा आपका सवाल।",
      opt: "विकल्प {L}: {t}",
      clock: "आपके पास {n} सेकंड हैं। घड़ी शुरू।",
      notime: "इस सवाल पर समय सीमा नहीं है। शांति से चुनिए।",
      s30: "तीस सेकंड शेष।",
      s15: "पंद्रह सेकंड बचे हैं। ध्यान से सोचिए।",
      s10: "दस सेकंड बचे हैं।",
      s5: "पाँच।",
      s4: "चार।",
      s3: "तीन।",
      s2: "दो।",
      s1: "एक।",
      timeup: "समय समाप्त।",
      pick: "उत्तर चुनकर लॉक कीजिए।",
      selected: "विकल्प {L} चुना गया। लॉक करें?",
      locked: "विकल्प {L} लॉक।",
      correct: "सही उत्तर! आप जीत चुके हैं {prize} रुपये।",
      wrong: "यह गलत उत्तर है। सही विकल्प है {L}।",
      dropSafe: "आप {prize} रुपये लेकर जा रहे हैं।",
      dropZero: "इस राउंड में पुरस्कार शून्य।",
      fifty: "पचास-पचास। दो गलत विकल्प हट रहे हैं।",
      audience: "दर्शक मतदान। यह एक सिम्युलेटेड पोल है।",
      expert: "विशेषज्ञ से पूछते हैं।",
      switchQ: "सवाल बदला जाता है। यही स्तर, नया प्रश्न।",
      next: "अगला प्रश्न।",
      mile: "शाबाश। आपने सुरक्षित स्तर पार कर लिया।",
      walk: "आप {prize} रुपये के साथ विदा ले रहे हैं।",
      over: "खेल समाप्त। आपका अंतिम पुरस्कार {prize} रुपये। क्वांट्रेक्स अकादमी पर अभ्यास जारी रखिए।",
      crore: "शानदार। आपने पूरी सीढ़ी चढ़ ली।",
      lockAsk: "विकल्प {L} लॉक कीजिए।"
    },
    hinglish: {
      welcome: "Namaskar. Quantrex Academy mein aapka swagat hai. Yeh hai Quiz Crorepati, The Ultimate Challenge. Aap tayyar hain?",
      qintro: "Question {n}, {prize} rupaye ke liye.",
      hereq: "Yeh raha aapka sawaal.",
      opt: "Option {L}: {t}",
      clock: "Aapke paas {n} seconds hain. Clock start.",
      notime: "Is sawaal par time limit nahi hai. Shaanti se choose kijiye.",
      s30: "30 seconds remaining.",
      s15: "15 seconds left. Sochiye dhyaan se.",
      s10: "Das second bache hain.",
      s5: "Paanch.",
      s4: "Chaar.",
      s3: "Teen.",
      s2: "Do.",
      s1: "Ek.",
      timeup: "Samay samapt. Time's up.",
      pick: "Apna jawab choose karke lock kijiye.",
      selected: "Option {L} selected. Lock karna hai?",
      locked: "Option {L} — locked.",
      correct: "Sahi jawab! Aap jeet chuke hain {prize} rupaye.",
      wrong: "Yeh galat jawab hai. Sahi uttar hai option {L}.",
      dropSafe: "Aap {prize} rupaye ke saath jaa rahe hain.",
      dropZero: "Is round mein prize zero.",
      fifty: "50-50. Do galat vikalp hata rahe hain.",
      audience: "Audience poll. Yeh simulated classroom poll hai.",
      expert: "Expert se poochhte hain.",
      switchQ: "Sawal badla jaata hai. Naya sawaal, same level.",
      next: "Agla sawaal.",
      mile: "Shaabaash. Aapne safe level cross kar liya.",
      walk: "Aap walk away kar rahe hain {prize} ke saath.",
      over: "Game over. Aapka final prize {prize} rupaye. Quantrex Academy par practice jaari rakhiye.",
      crore: "Zabardast. Aapne poori ladder climb kar li.",
      lockAsk: "Computer ji, option {L} lock kijiye."
    }
  };

  var S = null;
  var A = { ctx: null, on: true, master: null, revIn: null, noise: null, loops: {} };

  function fmtRs(n) {
    n = Math.max(0, Math.round(Number(n) || 0));
    return "₹" + n.toLocaleString("en-IN");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c];
    });
  }
  function line(key, vars) {
    var pack = (S && LINES[S.lang]) || LINES.hinglish;
    var t = pack[key] || LINES.en[key] || "";
    vars = vars || {};
    Object.keys(vars).forEach(function (k) {
      t = t.split("{" + k + "}").join(String(vars[k]));
    });
    return t;
  }
  function speakable(html) {
    var t = String(html == null ? "" : html);
    t = t.replace(/<script[\s\S]*?<\/script>/gi, " ");
    t = t.replace(/<style[\s\S]*?<\/style>/gi, " ");
    t = t.replace(/<img[^>]*>/gi, " diagram ");
    t = t.replace(/<[^>]+>/g, " ");
    t = t.replace(/\$\$([\s\S]*?)\$\$/g, " $1 ");
    t = t.replace(/\$([^$]+)\$/g, " $1 ");
    t = t.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, " $1 over $2 ");
    t = t.replace(/\\sqrt\{([^{}]+)\}/g, " square root of $1 ");
    t = t.replace(/\\[a-zA-Z]+/g, " ");
    t = t.replace(/[{}^_]+/g, " ");
    t = t.replace(/&[a-z]+;/gi, " ");
    t = t.replace(/\s+/g, " ").trim();
    return t;
  }
  function stemHtml(q) {
    try {
      if (w.MathTextRenderer && w.MathTextRenderer.renderQuestionStem) return w.MathTextRenderer.renderQuestionStem(q);
    } catch (_) { /* */ }
    return (q && (q.q || q.question || q.text)) || "";
  }
  function optHtml(t) {
    try {
      if (w.MathTextRenderer && w.MathTextRenderer.render) return w.MathTextRenderer.render(t);
    } catch (_) { /* */ }
    return String(t == null ? "" : t);
  }
  function typeset(el) {
    try { if (w.Mx && w.Mx.typeset) w.Mx.typeset(el); } catch (_) { /* */ }
    try { if (w.MathTextRenderer && w.MathTextRenderer.afterRenderLight) w.MathTextRenderer.afterRenderLight(el); } catch (_) { /* */ }
  }
  function correctIndex(q) {
    try {
      if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.correctIndices) {
        var ix = QuantrexQFormat.correctIndices(q) || [];
        if (ix.length) return ix[0];
      }
    } catch (_) { /* */ }
    if (typeof q.answer === "number") return q.answer;
    var a = String(q.answer == null ? "" : q.answer).trim().toUpperCase();
    var li = LET.indexOf(a);
    if (li >= 0) return li;
    return 0;
  }
  function hasFour(q) {
    return q && Array.isArray(q.options) && q.options.length >= 2;
  }
  function solOf(q) {
    return (q && (q.solution || q.explanation || q.explain || q.sol || q.hint)) || "";
  }

  function ainit() {
    if (A.ctx) {
      try { A.ctx.resume(); } catch (_) { /* */ }
      return;
    }
    try {
      var c = A.ctx = new (w.AudioContext || w.webkitAudioContext)();
      var comp = c.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      comp.connect(c.destination);
      A.master = c.createGain();
      A.master.gain.value = 0.8;
      A.master.connect(comp);
      var len = c.sampleRate * 2.2, ir = c.createBuffer(2, len, c.sampleRate);
      for (var ch = 0; ch < 2; ch++) {
        var d = ir.getChannelData(ch);
        for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      }
      A.rev = c.createConvolver();
      A.rev.buffer = ir;
      A.revIn = c.createGain();
      A.revIn.gain.value = 0.24;
      A.revIn.connect(A.rev);
      A.rev.connect(A.master);
      var nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0);
      for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
      A.noise = nb;
    } catch (_) { A.ctx = null; }
  }
  function now() { return A.ctx ? A.ctx.currentTime : 0; }
  function out(g, wet) {
    if (!A.master) return;
    g.connect(A.master);
    if (wet && A.revIn) g.connect(A.revIn);
  }
  function tone(type, f, t, dur, vol, o) {
    if (!A.ctx || !A.on) return;
    o = o || {};
    var c = A.ctx, os = c.createOscillator(), g = c.createGain();
    os.type = type;
    os.frequency.setValueAtTime(f, t);
    if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || dur));
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + (o.a || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var n = os;
    if (o.lp) {
      var fl = c.createBiquadFilter();
      fl.type = "lowpass";
      fl.frequency.setValueAtTime(o.lp, t);
      os.connect(fl);
      n = fl;
    }
    n.connect(g);
    out(g, o.wet);
    os.start(t);
    os.stop(t + dur + 0.04);
  }
  function noise(t, dur, vol, o) {
    if (!A.ctx || !A.on || !A.noise) return;
    o = o || {};
    var c = A.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = A.noise;
    s.loop = true;
    f.type = o.type || "bandpass";
    f.frequency.setValueAtTime(o.f || 1000, t);
    if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + (o.a || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); out(g, o.wet);
    s.start(t, Math.random());
    s.stop(t + dur + 0.04);
  }
  var N = function (n) { return 440 * Math.pow(2, (n - 69) / 12); };
  function stab(t, notes, dur, vol) {
    notes.forEach(function (m) {
      tone("sawtooth", N(m), t, dur, vol, { lp: 900, a: 0.01, wet: 1 });
    });
  }
  var SFX = {
    intro: function () {
      var t = now() + 0.05;
      noise(t, 1.0, 0.3, { f: 300, fTo: 4500, a: 0.8, wet: 1 });
      tone("sine", N(38), t + 1.0, 1.6, 0.4, { wet: 1 });
      stab(t + 1.0, [50, 57, 62, 66], 0.5, 0.06);
      stab(t + 1.8, [50, 57, 62, 66, 69], 1.6, 0.05);
    },
    whoosh: function () { noise(now(), 0.5, 0.4, { f: 350, fTo: 4000, a: 0.2, wet: 1 }); },
    opt: function (i) { stab(now(), [62, 66, 69, 74][i] ? [[50, 62], [54, 66], [57, 69], [62, 74]][i] : [62], 0.35, 0.08); },
    tick: function (u) { tone("sine", u ? 1500 : 980, now(), 0.05, u ? 0.32 : 0.16); },
    sel: function () { tone("triangle", 880, now(), 0.12, 0.14); },
    lock: function () { tone("sine", 110, now(), 0.9, 0.7, { to: 42, glide: 0.55, wet: 1 }); },
    correct: function () {
      var t = now() + 0.04;
      [62, 66, 69, 74].forEach(function (m, i) { stab(t + i * 0.1, [m], 0.28, 0.07); });
      stab(t + 0.42, [62, 66, 69, 74], 1.5, 0.05);
    },
    wrong: function () { tone("sawtooth", 110, now(), 0.8, 0.22, { lp: 800 }); tone("sawtooth", 116, now(), 0.8, 0.22, { lp: 800 }); },
    timeup: function () { for (var i = 0; i < 3; i++) tone("square", 440, now() + i * 0.28, 0.2, 0.12, { lp: 1800 }); },
    fifty: function () { tone("sawtooth", 1400, now(), 0.25, 0.12, { to: 180, lp: 3500, wet: 1 }); },
    hit: function () { tone("sine", 90, now(), 0.5, 0.5, { to: 40, wet: 1 }); }
  };
  function stopLoop(name) {
    var L = A.loops[name];
    if (!L) return;
    clearInterval(L.id);
    try { L.g.gain.setTargetAtTime(0, now(), 0.12); } catch (_) { /* */ }
    delete A.loops[name];
  }
  function bed() {
    if (!A.ctx || !A.on) return;
    stopLoop("bed");
    var bass = [38, 38, 41, 40, 38, 38, 43, 41], L = { n: 0, next: now() + 0.05, g: A.ctx.createGain() };
    L.g.gain.value = 0.9;
    L.g.connect(A.master);
    L.id = setInterval(function () {
      while (L.next < now() + 0.2) {
        var m = bass[L.n % 8];
        tone("triangle", N(m), L.next, 0.4, 0.16, { lp: 480 });
        L.n++;
        L.next += 0.5;
      }
    }, 60);
    A.loops.bed = L;
  }
  function suspense() {
    if (!A.ctx || !A.on) return;
    stopLoop("sus");
    var L = { n: 0, next: now() + 0.04, g: A.ctx.createGain() };
    L.g.gain.value = 1;
    L.g.connect(A.master);
    L.id = setInterval(function () {
      while (L.next < now() + 0.2) {
        var rise = Math.min(1, L.n / 36);
        tone("sawtooth", N(50) * (1 + rise * 0.05), L.next, 0.24, 0.03 + rise * 0.03, { lp: 400 + rise * 1600 });
        L.n++;
        L.next += 0.25;
      }
    }, 50);
    A.loops.sus = L;
  }

  function pickVoice() {
    var voices = [];
    try { voices = w.speechSynthesis.getVoices() || []; } catch (_) { voices = []; }
    var prefer = S.lang === "hi"
      ? [/hi-IN/i, /hindi/i, /en-IN/i]
      : S.lang === "en"
        ? [/en-IN/i, /india/i, /en-GB/i, /en-US/i]
        : [/en-IN/i, /india/i, /hi-IN/i, /hindi/i, /en-GB/i];
    var k, v, i;
    for (k = 0; k < prefer.length; k++) {
      for (i = 0; i < voices.length; i++) {
        v = voices[i];
        if (prefer[k].test(v.lang) || prefer[k].test(v.name)) return v;
      }
    }
    return voices[0] || null;
  }
  function caption(t, kind) {
    if (!S || !S.root) return;
    var el = S.root.querySelector("#qxQsCaption");
    if (!el) return;
    el.textContent = t || "";
    el.className = kind || "";
  }
  function stopTalk() {
    try { w.speechSynthesis.cancel(); } catch (_) { /* */ }
    S.talkOnce = (S.talkOnce || 0) + 1;
  }
  function say(text, kind) {
    caption(text, kind);
    if (!S.voiceOn || !text) return Promise.resolve();
    return new Promise(function (resolve) {
      var done = false;
      function fin() {
        if (done) return;
        done = true;
        if (S && S.talkFin === fin) S.talkFin = null;
        resolve();
      }
      S.talkFin = fin;
      try {
        w.speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(text);
        u.rate = S.lang === "hi" ? 0.84 : 0.88;
        u.pitch = 0.95;
        u.volume = 1;
        u.lang = S.lang === "hi" ? "hi-IN" : "en-IN";
        var v = pickVoice();
        if (v) u.voice = v;
        u.onend = fin;
        u.onerror = fin;
        S.utter = u;
        w.speechSynthesis.speak(u);
        setTimeout(fin, Math.min(18000, 800 + text.length * 70));
      } catch (_) { fin(); }
    });
  }
  function wait(ms) {
    return new Promise(function (r) {
      if (S.fast) ms = Math.min(ms, 40);
      var id = setTimeout(r, ms);
      S.waiters.push(function () { clearTimeout(id); r(); });
    });
  }
  function skipHost() {
    S.fast = true;
    stopTalk();
    if (S.talkFin) {
      try { S.talkFin(); } catch (_) { /* */ }
    }
    S.waiters.splice(0).forEach(function (f) { try { f(); } catch (_) { /* */ } });
  }

  function ensureCss() {
    if (document.getElementById("qxQuizShowCss")) return;
    var l = document.createElement("link");
    l.id = "qxQuizShowCss";
    l.rel = "stylesheet";
    l.href = "assets/qx-quiz-show.css?v=" + encodeURIComponent(w.QX_BUILD || "qxmd356");
    document.head.appendChild(l);
  }

  function slotPrize(i) {
    var slots = (S.rules && S.rules.slots) || [];
    if (slots[i] && slots[i].prize != null) return Number(slots[i].prize) || 0;
    if (CLASSIC[i] != null) return CLASSIC[i];
    return (i + 1) * 1000;
  }
  function isSafe(i) {
    var slots = (S.rules && S.rules.slots) || [];
    return !!(slots[i] && slots[i].safe);
  }
  function lastSafePrize() {
    var won = 0;
    for (var i = 0; i < S.qi; i++) {
      if (S.res[i] === true && isSafe(i)) won = slotPrize(i);
    }
    return won;
  }
  function currentWon() {
    var won = 0;
    for (var i = 0; i < S.res.length; i++) {
      if (S.res[i] === true) won = slotPrize(i);
    }
    return won;
  }

  function paintLadder() {
    var box = S.root.querySelector("#qxQsLadder");
    if (!box) return;
    var n = S.qs.length;
    var html = "";
    for (var i = n - 1; i >= 0; i--) {
      var cls = "qxqs-rung";
      if (i === S.qi && S.phase !== "final") cls += " cur";
      if (S.res[i] === true) cls += " won";
      if (S.res[i] === false) cls += " miss";
      if (isSafe(i)) cls += " safe";
      html += '<div class="' + cls + '"><span>' + (i + 1) + "</span><span>" + fmtRs(slotPrize(i)) + "</span></div>";
    }
    box.innerHTML = html;
    var sc = S.root.querySelector("#qxQsScore");
    if (sc) sc.textContent = fmtRs(currentWon());
  }
  function setRing(f) {
    var c = S.root.querySelector("#qxQsTimer .fg");
    if (!c) return;
    var L = 2 * Math.PI * 62;
    c.style.strokeDasharray = String(L);
    c.style.strokeDashoffset = String(L * (1 - f));
  }
  function fit() {
    if (!S || !S.root) return;
    var stage = S.root.querySelector("#qxQsStage");
    var wrap = S.root.querySelector("#qxQsWrap");
    if (!stage || !wrap) return;
    var w = wrap.clientWidth || window.innerWidth || 1920;
    var h = wrap.clientHeight || window.innerHeight || 1080;
    if (w < 2 || h < 2) return;
    var s = Math.min(w / 1920, h / 1080);
    stage.style.transform = "translate(" + ((w - 1920 * s) / 2) + "px," + ((h - 1080 * s) / 2) + "px) scale(" + s + ")";
  }
  function bindFit() {
    S._fit = function () { fit(); };
    window.addEventListener("resize", S._fit);
    document.addEventListener("fullscreenchange", S._fit);
    fit();
    setTimeout(fit, 40);
    setTimeout(fit, 250);
  }
  function unbindFit() {
    if (!S || !S._fit) return;
    window.removeEventListener("resize", S._fit);
    document.removeEventListener("fullscreenchange", S._fit);
    S._fit = null;
  }
  function controls(list) {
    var box = S.root.querySelector("#qxQsControls");
    if (!box) return;
    box.innerHTML = "";
    list.forEach(function (item) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "qxqs-btn " + (item.cls || "");
      b.textContent = item.lab;
      b.onclick = function (e) { e.stopPropagation(); item.fn(); };
      box.appendChild(b);
    });
  }
  function optEls() { return Array.prototype.slice.call(S.root.querySelectorAll(".qxqs-opt")); }

  function loadQ(id) {
    try { if (typeof getQ === "function") return getQ(id); } catch (_) { /* */ }
    return null;
  }

  async function prefetch(ids) {
    try {
      if (w.MarksLive && w.MarksLive.prefetchQuestions) await w.MarksLive.prefetchQuestions(ids);
    } catch (_) { /* */ }
  }

  function rootHtml(test) {
    var n = (test.questionIds || []).length;
    var tq = (test.qsRules && test.qsRules.timePerQ) || test.timePerQ || 60;
    var meta = test.title || test.name || test.exam || "Quiz Crorepati";
    var tlab = tq ? tq + "s each" : "no timer";
    return '<div id="qxQsRot">Turn your phone sideways for the best view</div>' +
      '<div id="qxQsWrap"><div id="qxQsStage">' +
      '<div class="qxqs-beams"></div><div class="qxqs-beams b2"></div><div class="qxqs-spot"></div><div class="qxqs-floor"></div>' +
      '<header class="qxqs-head">' +
      '<div class="qxqs-brand"><div class="qxqs-logo">Q</div><div><b>QUANTREX ACADEMY</b><i>Concepts Create Destiny</i></div></div>' +
      '<div class="qxqs-htitle">QUIZ CROREPATI</div>' +
      '<div class="qxqs-hright"><span id="qxQsMeta">' + esc(String(meta)) + "</span>" +
      '<button type="button" class="qxqs-ico" id="qxQsSnd" title="Sound">🔊</button>' +
      '<button type="button" class="qxqs-ico" id="qxQsFs" title="Fullscreen">⛶</button>' +
      '<button type="button" class="qxqs-ico" id="qxQsExit" title="Exit">✕</button>' +
      "</div></header>" +
      '<div class="qxqs-main" id="qxQsMain">' +
      '<div class="qxqs-top">' +
      '<div class="qxqs-timer off" id="qxQsTimer"><svg viewBox="0 0 150 150"><circle class="bg" cx="75" cy="75" r="62"></circle><circle class="fg" cx="75" cy="75" r="62"></circle></svg><div class="qxqs-tnum" id="qxQsTnum">' + tq + "</div></div>" +
      '<div id="qxQsCaption">Press START GAME</div>' +
      "</div>" +
      '<div class="qxqs-qwrap"><div id="qxQsBox" class="hx"><div class="hxi"><div id="qxQsHead"></div><div id="qxQsText"></div></div></div></div>' +
      '<div id="qxQsOpts"></div>' +
      '<div class="qxqs-controls" id="qxQsControls"></div>' +
      "</div>" +
      '<aside class="qxqs-aside">' +
      '<div class="qxqs-life" id="qxQsLife"></div>' +
      '<div class="qxqs-champ">★ PRIZE LADDER ★</div>' +
      '<div class="qxqs-ladder" id="qxQsLadder"></div>' +
      '<div class="qxqs-score">Points<b id="qxQsScore">₹0</b></div>' +
      '<div class="qxqs-host">Host: Quantrex Host</div>' +
      "</aside>" +
      '<footer class="qxqs-foot"><span>www.quantrexacademy.com</span><span>A–D pick · Enter lock · 5 = 50:50</span><span class="tag">Concepts Create Destiny</span></footer>' +
      '<div class="qxqs-overlay" id="qxQsIntro">' +
      '<div class="qxqs-beams"></div>' +
      '<div class="qxqs-emb">Q</div>' +
      "<h1>QUANTREX QUIZ ARENA</h1>" +
      "<h2>Quiz Crorepati · The Ultimate Challenge</h2>" +
      '<div class="hl">Host: Quantrex Host · virtual prize ladder</div>' +
      '<p class="qxqs-note">' + n + " questions · " + tlab + " · virtual ₹ only, not real money</p>" +
      '<div class="qxqs-lang">' +
      '<button type="button" class="qxqs-chip" data-lang="hinglish">Hinglish</button>' +
      '<button type="button" class="qxqs-chip" data-lang="en">English</button>' +
      '<button type="button" class="qxqs-chip" data-lang="hi">हिन्दी</button>' +
      "</div>" +
      '<button type="button" class="qxqs-start" id="qxQsStart">▶ START GAME</button>' +
      '<div class="tag">Concepts Create Destiny</div>' +
      '<div class="ft">www.quantrexacademy.com</div>' +
      "</div>" +
      '<div class="qxqs-overlay gone" id="qxQsFinal">' +
      '<div class="qxqs-beams"></div>' +
      '<div class="qxqs-emb">★</div>' +
      "<h1>GAME OVER</h1>" +
      '<h2 id="qxQsFinalP"></h2>' +
      '<div class="hl" id="qxQsFinalSol"></div>' +
      '<button type="button" class="qxqs-start" id="qxQsAgain">↺ PLAY AGAIN</button>' +
      '<p><button type="button" class="qxqs-btn" id="qxQsDone">Back to tests</button></p>' +
      '<div class="tag">Concepts Create Destiny</div>' +
      '<div class="ft">www.quantrexacademy.com</div>' +
      "</div>" +
      '<div class="qxqs-overlay gone" id="qxQsPoll"><div class="qxqs-card"><h2>Audience Poll</h2><div class="qxqs-poll" id="qxQsPollBody"></div><button type="button" class="qxqs-btn gold" id="qxQsPollOk">Continue</button></div></div>' +
      "</div></div>";
  }

  function paintLife() {
    var box = S.root.querySelector("#qxQsLife");
    if (!box) return;
    var L = S.rules.lifelines || {};
    var items = [];
    if (L.fifty !== false) items.push(["fifty", "50:50", S.used.fifty]);
    if (L.audience) items.push(["audience", "Audience", S.used.audience]);
    if (L.expert) items.push(["expert", "Expert", S.used.expert]);
    if (L.switchQ) items.push(["switchQ", "Switch", S.used.switchQ]);
    box.innerHTML = items.map(function (it) {
      return '<button type="button" class="qxqs-ll' + (it[2] ? " used" : "") + '" data-ll="' + it[0] + '"' + (it[2] ? " disabled" : "") + ">" + it[1] + "</button>";
    }).join("");
    Array.prototype.forEach.call(box.querySelectorAll(".qxqs-ll"), function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        useLife(b.getAttribute("data-ll"));
      };
    });
  }

  function markLangChips() {
    Array.prototype.forEach.call(S.root.querySelectorAll(".qxqs-chip[data-lang]"), function (b) {
      b.classList.toggle("on", b.getAttribute("data-lang") === S.lang);
    });
  }

  async function startQ(i) {
    var run = ++S.run;
    S.qi = i;
    S.fast = false;
    S.sel = null;
    S.waiters.splice(0).forEach(function (f) { try { f(); } catch (_) { /* */ } });
    stopTalk();
    if (S.talkFin) { try { S.talkFin(); } catch (_) { /* */ } }
    stopTimer();
    stopLoop("bed");
    stopLoop("sus");
    delete S.res[i];
    S.phase = "opening";
    paintLadder();
    caption("");
    var q = S.qs[i];
    var prize = slotPrize(i);
    var box = S.root.querySelector("#qxQsBox");
    if (box) box.classList.remove("open");
    var head = S.root.querySelector("#qxQsHead");
    if (head) head.textContent = "Question " + (i + 1) + "  ·  " + fmtRs(prize) + (isSafe(i) ? "  ·  SAFE LEVEL" : "");
    var qtext = S.root.querySelector("#qxQsText");
    if (qtext) {
      qtext.innerHTML = stemHtml(q);
      typeset(qtext);
    }
    var opts = (q.options || []).slice(0, 4);
    while (opts.length < 4) opts.push("");
    var O = S.root.querySelector("#qxQsOpts");
    O.innerHTML = '<div class="qxqs-orow" style="top:48px"></div><div class="qxqs-orow" style="top:166px"></div>' +
      opts.map(function (o, k) {
        return '<button type="button" class="qxqs-opt hx' + (k % 2 ? " r" : "") + '" data-k="' + k + '"><div class="hxi"><span class="L">' + LET[k] + ':</span><span class="t">' + optHtml(o) + "</span></div></button>";
      }).join("");
    typeset(O);
    Array.prototype.forEach.call(O.querySelectorAll(".qxqs-opt"), function (el) {
      el.onclick = function (e) { e.stopPropagation(); pick(+el.getAttribute("data-k"), true); };
    });
    var timerEl = S.root.querySelector("#qxQsTimer");
    if (timerEl) timerEl.className = "qxqs-timer off";
    var tnum = S.root.querySelector("#qxQsTnum");
    if (tnum) tnum.textContent = S.timePerQ || "–";
    setRing(1);
    controls([{ lab: "Skip host ⏭", fn: skipHost }]);
    await wait(180);
    if (run !== S.run) return;
    SFX.whoosh();
    if (box) box.classList.add("open");
    await wait(S.fast ? 20 : 520);
    if (run !== S.run) return;
    await say(line("qintro", { n: i + 1, prize: fmtRs(prize) }));
    if (run !== S.run) return;
    if (S.readQuestion) {
      await say(line("hereq"));
      if (run !== S.run) return;
      await say(speakable(stemHtml(q)));
      if (run !== S.run) return;
    }
    S.phase = "options";
    var els = optEls();
    for (var k = 0; k < els.length; k++) {
      if (run !== S.run) return;
      els[k].classList.add("in");
      if (!S.fast) SFX.opt(k);
      var ot = speakable(opts[k]);
      if (ot && S.voiceOn && !S.fast && S.readQuestion) await say(line("opt", { L: LET[k], t: ot }));
      else await wait(S.fast ? 20 : 280);
    }
    if (run !== S.run) return;
    answering();
  }

  function answering() {
    S.phase = "answering";
    S.fast = false;
    paintLife();
    var btns = [
      { lab: "Lock answer", cls: "gold", fn: lock }
    ];
    if (S.rules.walkAway !== false) btns.push({ lab: "Walk away", fn: walkAway });
    if (S.rules.timerOn !== false) btns.push({ lab: S.paused ? "Resume" : "Pause", fn: pauseT });
    controls(btns);
    var timerEl = S.root.querySelector("#qxQsTimer");
    if (S.rules.timerOn === false) {
      if (timerEl) timerEl.className = "qxqs-timer off";
      say(line("notime") + " " + line("pick"));
      return;
    }
    if (timerEl) timerEl.className = "qxqs-timer";
    S.t = S.timePerQ;
    S.paused = false;
    S.announced = {};
    S.root.querySelector("#qxQsTnum").textContent = S.t;
    setRing(1);
    bed();
    say(line("clock", { n: S.timePerQ }) + " " + line("pick"));
    S.tid = setInterval(tick, 1000);
  }
  function tick() {
    if (S.phase !== "answering" || S.paused) return;
    S.t -= 1;
    S.root.querySelector("#qxQsTnum").textContent = Math.max(0, S.t);
    setRing(Math.max(0, S.t) / Math.max(1, S.timePerQ));
    var urgent = S.t <= 10;
    S.root.querySelector("#qxQsTimer").className = "qxqs-timer" + (urgent ? " urgent" : "");
    SFX.tick(urgent);
    if (S.t === 30 && !S.announced.s30) { S.announced.s30 = 1; say(line("s30")); }
    else if (S.t === 15 && !S.announced.s15) { S.announced.s15 = 1; say(line("s15")); }
    else if (S.t === 10 && !S.announced.s10) { S.announced.s10 = 1; say(line("s10")); }
    else if (S.t === 5) say(line("s5"));
    else if (S.t === 4) say(line("s4"));
    else if (S.t === 3) say(line("s3"));
    else if (S.t === 2) say(line("s2"));
    else if (S.t === 1) say(line("s1"));
    if (S.t <= 0) timeUp();
  }
  function stopTimer() { clearInterval(S.tid); S.tid = null; }
  function pauseT() {
    if (S.phase !== "answering" || S.rules.timerOn === false) return;
    S.paused = !S.paused;
    caption(S.paused ? "Timer paused" : line("pick"));
    if (S.paused) stopLoop("bed"); else bed();
  }

  function pick(k, click) {
    if (S.phase !== "answering") return;
    var el = optEls()[k];
    if (!el || el.classList.contains("gone")) return;
    if (click && S.sel === k) return lock();
    S.sel = k;
    optEls().forEach(function (e) { e.classList.remove("sel"); });
    el.classList.add("sel");
    SFX.sel();
    say(line("selected", { L: LET[k] }));
  }

  function lock() {
    if (S.phase !== "answering" || S.sel == null) {
      caption(line("pick"));
      return;
    }
    if (S.rules.lockConfirm !== false && !S._confirming) {
      S._confirming = true;
      caption(line("selected", { L: LET[S.sel] }));
      controls([
        { lab: "Yes, lock " + LET[S.sel], cls: "gold", fn: function () { S._confirming = false; lock(); } },
        { lab: "Change", fn: function () { S._confirming = false; S.phase = "answering"; answering(); } }
      ]);
      return;
    }
    S._confirming = false;
    S.phase = "locked";
    stopTimer();
    stopLoop("bed");
    var el = optEls()[S.sel];
    if (el) { el.classList.remove("sel"); el.classList.add("locked"); }
    SFX.lock();
    say(line("locked", { L: LET[S.sel] }), "lock").then(function () { return say(line("lockAsk", { L: LET[S.sel] }), "lock"); });
    setTimeout(function () { if (S.phase === "locked") suspense(); }, 500);
    setTimeout(function () { if (S.phase === "locked") reveal(); }, 1600);
  }

  function reveal() {
    if (S.phase !== "locked" && S.phase !== "answering") return;
    S.phase = "revealed";
    stopLoop("sus");
    stopTimer();
    SFX.hit();
    var q = S.qs[S.qi];
    var ans = correctIndex(q);
    var ok = S.sel === ans;
    S.res[S.qi] = ok;
    var els = optEls();
    setTimeout(function () {
      els.forEach(function (e) { e.classList.remove("locked", "sel"); });
      if (S.sel != null && els[S.sel] && !ok) els[S.sel].classList.add("wrong");
      if (els[ans]) els[ans].classList.add("correct");
      if (ok) SFX.correct(); else SFX.wrong();
      paintLadder();
      var prize = slotPrize(S.qi);
      if (ok) {
        say(line("correct", { prize: fmtRs(prize) }), "good").then(function () {
          if (isSafe(S.qi)) return say(line("mile"), "good");
        });
      } else {
        say(line("wrong", { L: LET[ans] }), "bad").then(function () {
          var drop = lastSafePrize();
          return say(drop ? line("dropSafe", { prize: fmtRs(drop) }) : line("dropZero"), "bad");
        });
      }
      afterReveal(ok);
    }, 700);
  }

  function timeUp() {
    if (S.phase !== "answering") return;
    S.phase = "revealed";
    stopTimer();
    stopLoop("bed");
    SFX.timeup();
    S.sel = null;
    say(line("timeup"), "bad");
    var q = S.qs[S.qi];
    var ans = correctIndex(q);
    S.res[S.qi] = false;
    setTimeout(function () {
      var els = optEls();
      if (els[ans]) els[ans].classList.add("correct");
      paintLadder();
      say(line("wrong", { L: LET[ans] }));
      afterReveal(false);
    }, 600);
  }

  function afterReveal(ok) {
    var last = S.qi >= S.qs.length - 1;
    var died = !ok;
    var btns = [];
    var sol = solOf(S.qs[S.qi]);
    if (sol) btns.push({ lab: "Solution", fn: showSol });
    if (died) btns.push({ lab: "Results", cls: "gold", fn: final });
    else if (last) btns.push({ lab: "Results", cls: "gold", fn: final });
    else btns.push({ lab: "Next question", cls: "gold", fn: next });
    controls(btns);
  }
  function showSol() {
    var q = S.qs[S.qi];
    var html = solOf(q);
    caption("Solution");
    var card = S.root.querySelector("#qxQsPoll");
    S.root.querySelector("#qxQsPollBody").parentNode.querySelector("h2").textContent = "Solution";
    var body = S.root.querySelector("#qxQsPollBody");
    body.className = "qxqs-sol";
    body.innerHTML = (w.MathTextRenderer && w.MathTextRenderer.render) ? w.MathTextRenderer.render(html) : html;
    typeset(body);
    card.classList.remove("gone");
  }
  function next() {
    if (S.phase !== "revealed") return;
    if (S.res[S.qi] === false) return final();
    if (S.qi < S.qs.length - 1) {
      say(line("next"));
      startQ(S.qi + 1);
    } else final();
  }
  function walkAway() {
    if (S.phase !== "answering") return;
    S.phase = "final";
    stopTimer();
    stopLoop("bed");
    var prize = S.qi > 0 && S.res[S.qi - 1] === true ? slotPrize(S.qi - 1) : 0;
    say(line("walk", { prize: fmtRs(prize) })).then(final);
  }
  function final() {
    S.phase = "final";
    stopTimer();
    stopLoop("bed");
    stopLoop("sus");
    stopTalk();
    paintLadder();
    var died = S.res[S.qi] === false;
    var prize = 0;
    if (died) prize = lastSafePrize();
    else prize = currentWon();
    S.prizeWon = prize;
    var okN = S.res.filter(function (x) { return x === true; }).length;
    var msg = (prize >= 10000000 ? line("crore") + " " : "") + line("over", { prize: fmtRs(prize) });
    say(msg);
    S.root.querySelector("#qxQsFinalP").textContent = okN + " / " + S.qs.length + " correct · " + fmtRs(prize) + " virtual";
    S.root.querySelector("#qxQsFinal").classList.remove("gone");
    SFX.correct();
    try {
      if (typeof S.onComplete === "function") {
        S.onComplete({
          score: prize,
          pct: S.qs.length ? Math.round(100 * okN / S.qs.length) : 0,
          correct: okN,
          total: S.qs.length
        });
      }
    } catch (_) { /* */ }
  }

  function useLife(kind) {
    if (S.phase !== "answering" || S.used[kind]) return;
    var q = S.qs[S.qi];
    var ans = correctIndex(q);
    if (kind === "fifty") {
      S.used.fifty = true;
      SFX.fifty();
      say(line("fifty"));
      var wrong = [0, 1, 2, 3].filter(function (i) { return i !== ans && i < (q.options || []).length; });
      wrong.sort(function () { return Math.random() - 0.5; });
      wrong.slice(0, 2).forEach(function (k) {
        var el = optEls()[k];
        if (el) {
          el.classList.add("gone");
          el.classList.remove("sel");
          if (S.sel === k) S.sel = null;
        }
      });
    } else if (kind === "audience") {
      S.used.audience = true;
      say(line("audience"));
      var weights = [0, 0, 0, 0];
      var nOpt = Math.min(4, (q.options || []).length);
      var remain = 100;
      var bias = 55;
      var slot = ((S.rules.slots || [])[S.qi] || {}).diff || "";
      if (slot === "Easy") bias = 70;
      if (slot === "Hard") bias = 42;
      weights[ans] = Math.max(28, Math.min(82, bias + Math.round(Math.random() * 10 - 5)));
      remain -= weights[ans];
      for (var i = 0; i < nOpt; i++) {
        if (i === ans) continue;
        if (i === nOpt - 1 || [0, 1, 2, 3].filter(function (x) { return x !== ans && x < nOpt; }).pop() === i) {
          weights[i] = Math.max(0, remain);
          remain = 0;
        } else {
          var take = Math.round(Math.random() * remain * 0.6);
          weights[i] = take;
          remain -= take;
        }
      }
      var body = S.root.querySelector("#qxQsPollBody");
      body.className = "qxqs-poll";
      S.root.querySelector("#qxQsPoll h2").textContent = "Audience Poll · simulated";
      body.innerHTML = [0, 1, 2, 3].slice(0, nOpt).map(function (k) {
        return '<div class="qxqs-bar-row"><span>' + LET[k] + '</span><div class="qxqs-bar"><i style="width:' + weights[k] + '%"></i></div><span>' + weights[k] + "%</span></div>";
      }).join("");
      S.root.querySelector("#qxQsPoll").classList.remove("gone");
    } else if (kind === "expert") {
      S.used.expert = true;
      say(line("expert"));
      var hint = speakable(q.hint || q.trick || q.concept || "").slice(0, 220);
      if (!hint) hint = S.lang === "en"
        ? "Look at the given data and units. Eliminate options that break the definition."
        : "Diye gaye data aur units dekhiye. Jo option definition todta hai, use hataaiye.";
      say(hint);
    } else if (kind === "switchQ") {
      if (!S.switchPool.length) {
        caption("No spare question left to switch.");
        return;
      }
      S.used.switchQ = true;
      say(line("switchQ"));
      var nid = S.switchPool.shift();
      var nq = loadQ(nid);
      if (nq && hasFour(nq)) {
        S.qs[S.qi] = nq;
        startQ(S.qi);
      }
    }
    paintLife();
  }

  function bindChrome() {
    S.root.querySelector("#qxQsStart").onclick = function (e) { e.stopPropagation(); startGame(); };
    S.root.querySelector("#qxQsAgain").onclick = function (e) { e.stopPropagation(); S.root.querySelector("#qxQsFinal").classList.add("gone"); startGame(); };
    S.root.querySelector("#qxQsDone").onclick = function (e) { e.stopPropagation(); close(); };
    S.root.querySelector("#qxQsExit").onclick = function (e) { e.stopPropagation(); close(); };
    S.root.querySelector("#qxQsPollOk").onclick = function (e) { e.stopPropagation(); S.root.querySelector("#qxQsPoll").classList.add("gone"); };
    S.root.querySelector("#qxQsSnd").onclick = function (e) {
      e.stopPropagation();
      A.on = !A.on;
      S.voiceOn = A.on;
      S.root.querySelector("#qxQsSnd").textContent = A.on ? "🔊" : "🔇";
      if (!A.on) { stopTalk(); stopLoop("bed"); stopLoop("sus"); }
    };
    S.root.querySelector("#qxQsFs").onclick = function (e) {
      e.stopPropagation();
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        else S.root.requestFullscreen && S.root.requestFullscreen();
      } catch (_) { /* */ }
    };
    Array.prototype.forEach.call(S.root.querySelectorAll(".qxqs-chip[data-lang]"), function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        S.lang = b.getAttribute("data-lang");
        markLangChips();
      };
    });
    S._key = function (e) {
      if (!S || !S.active) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var k = e.key.toLowerCase();
      if (k === " " || k === "enter") {
        e.preventDefault();
        if (S.phase === "intro") return startGame();
        if (S.phase === "opening" || S.phase === "options") return skipHost();
        if (S.phase === "answering") return S.sel != null ? lock() : null;
        if (S.phase === "revealed") return next();
        if (S.phase === "final") return startGame();
      }
      if ("abcd".indexOf(k) >= 0 && k.length === 1) pick("abcd".indexOf(k), true);
      if (k === "l") lock();
      if (k === "5") useLife("fifty");
      if (k === "n" && S.phase === "revealed") next();
      if (k === "p") pauseT();
      if (k === "escape") close();
    };
    document.addEventListener("keydown", S._key);
  }

  function startGame() {
    if (S.phase !== "intro" && S.phase !== "final") return;
    ainit();
    try { w.speechSynthesis.getVoices(); } catch (_) { /* */ }
    S.used = { fifty: false, audience: false, expert: false, switchQ: false };
    S.res = [];
    S.prizeWon = 0;
    S.qs = (S.test.questionIds || []).map(loadQ).filter(hasFour);
    S.switchPool = (S.test.switchPool || []).filter(function (id) {
      return (S.test.questionIds || []).indexOf(id) < 0;
    });
    if (!S.qs.length) {
      caption("Questions could not be loaded. Close and try again.");
      return;
    }
    S.root.querySelector("#qxQsIntro").classList.add("gone");
    S.root.querySelector("#qxQsFinal").classList.add("gone");
    S.phase = "opening";
    paintLadder();
    paintLife();
    SFX.intro();
    var run = ++S.run;
    say(line("welcome")).then(function () {
      if (run === S.run && S.phase === "opening") startQ(0);
    });
  }

  function close() {
    if (!S) return;
    S.active = false;
    stopTimer();
    stopTalk();
    if (S.talkFin) { try { S.talkFin(); } catch (_) { /* */ } }
    stopLoop("bed");
    stopLoop("sus");
    if (S._key) document.removeEventListener("keydown", S._key);
    unbindFit();
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (_) { /* */ }
    if (S.root && S.root.parentNode) S.root.parentNode.removeChild(S.root);
    try { delete document.documentElement.dataset.qxQuizShow; } catch (_) { /* */ }
    S = null;
    try {
      if (typeof go === "function") go("custom");
    } catch (_) { /* */ }
  }

  async function start(test) {
    ensureCss();
    if (!test || !Array.isArray(test.questionIds) || !test.questionIds.length) {
      if (typeof showToast === "function") showToast("No questions in this Quiz Show");
      return;
    }
    var ids = test.questionIds.slice();
    var extra = Array.isArray(test.switchPool) ? test.switchPool.slice() : [];
    await prefetch(ids.concat(extra).slice(0, 90));
    var qs = [];
    ids.forEach(function (id) {
      var q = loadQ(id);
      if (q && hasFour(q)) qs.push(q);
    });
    if (!qs.length) {
      if (typeof showToast === "function") showToast("Quiz Show needs 4-option questions. Open this test after the bank loads, or recreate it.");
      return;
    }
    var existing = document.getElementById("qxQsRoot");
    if (existing) existing.remove();
    var root = document.createElement("div");
    root.id = "qxQsRoot";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", "Quantrex Quiz Crorepati");
    root.innerHTML = rootHtml(test);
    document.body.appendChild(root);
    try { document.documentElement.dataset.qxQuizShow = "1"; } catch (_) { /* */ }
    var rules = test.qsRules || {};
    S = {
      root: root,
      test: test,
      qs: qs,
      switchPool: extra.filter(function (id) { return ids.indexOf(id) < 0; }),
      rules: rules,
      lang: rules.hostLang || "hinglish",
      voiceOn: rules.hostVoice !== false,
      readQuestion: !!rules.readQuestion,
      timePerQ: rules.timerOn === false ? 0 : Math.max(10, Number(rules.timePerQ || test.timePerQ || 60)),
      phase: "intro",
      qi: 0,
      sel: null,
      res: [],
      used: { fifty: false, audience: false, expert: false, switchQ: false },
      run: 0,
      fast: false,
      waiters: [],
      talkOnce: 0,
      t: 60,
      tid: null,
      paused: false,
      active: true,
      onComplete: test._onComplete || null
    };
    if (S.timePerQ === 0) S.rules.timerOn = false;
    A.on = rules.hostSfx !== false;
    bindChrome();
    bindFit();
    markLangChips();
    paintLadder();
    paintLife();
    caption("Press START GAME. Host voice and time calls play after you tap.");
    try { w.speechSynthesis.getVoices(); } catch (_) { /* */ }
    if (w.speechSynthesis && w.speechSynthesis.onvoiceschanged == null) {
      w.speechSynthesis.onvoiceschanged = function () { /* warm */ };
    }
  }

  w.QxQuizShow = {
    start: start,
    close: close,
    classicPrizes: CLASSIC.slice()
  };
})(window);
