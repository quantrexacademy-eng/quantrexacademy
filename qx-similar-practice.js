/**
 * Practice similar-type generator (Mistake Booster AI).
 * Off until Question View Settings. After Check Answer only.
 * Database-first unused same-chapter PYQs, then Jovi-generated items.
 */
(function (global) {
  "use strict";

  var PREF_SHOW = "qx_pref_similar_booster";
  var PREF_TRICK = "qx_pref_similar_trickier";
  var PREF_COUNT = "qx_pref_similar_count";
  var PREF_NOREP = "qx_pref_similar_norepeat";
  var DEFAULT_COUNT = 3;
  var MAX_COUNT = 10;
  var CHIPS = [3, 5, 10];
  var JOVI_URLS = ["/api/jovi", "https://jovi-rhun66xupa-uc.a.run.app"];

  function lsGet(k, fallback) {
    try {
      var v = localStorage.getItem(k);
      if (v == null) return fallback;
      return v;
    } catch (_) { return fallback; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); } catch (_) { /* */ }
  }
  function showOn() {
    return lsGet(PREF_SHOW, "0") === "1";
  }
  function trickDefault() {
    return lsGet(PREF_TRICK, "0") === "1";
  }
  function noRepeatOn() {
    return lsGet(PREF_NOREP, "1") !== "0";
  }
  function savedCount() {
    var n = parseInt(lsGet(PREF_COUNT, String(DEFAULT_COUNT)), 10);
    if (!Number.isFinite(n)) n = DEFAULT_COUNT;
    return Math.max(1, Math.min(MAX_COUNT, n));
  }
  function isChecked(session) {
    if (!session) return false;
    var i = session.idx;
    if (session._egChecked && (session._egChecked[i] || session._egChecked[String(i)])) return true;
    try {
      if (typeof ExamgoalTestUI !== "undefined" && ExamgoalTestUI.egCheckedAt) {
        return !!ExamgoalTestUI.egCheckedAt(session, i);
      }
    } catch (_) { /* */ }
    return false;
  }

  function strip(s) {
    return String(s || "").replace(/<[^>]+>/g, " ").replace(/\$+/g, " ").replace(/\s+/g, " ").trim();
  }
  function fp(s) {
    return strip(s).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim().slice(0, 96);
  }
  function toast(msg) {
    if (typeof showToast === "function") showToast(msg);
  }

  function currentSession() {
    try {
      if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.getSession) {
        return QuantrexTestEngine.getSession();
      }
    } catch (_) { /* */ }
    return global._qxPracticeCtx || null;
  }

  function getQSafe(id) {
    try {
      if (typeof getQ === "function") return getQ(id);
    } catch (_) { /* */ }
    return null;
  }

  function currentQuestion(session) {
    session = session || currentSession();
    if (!session || !session.ids) return null;
    var id = session.ids[session.idx];
    return getQSafe(id);
  }

  function tokens(s) {
    return strip(s).toLowerCase().split(/\s+/).filter(function (w) {
      return w.length >= 4;
    }).slice(0, 24);
  }

  function overlap(a, b) {
    var ta = tokens(a);
    var tb = tokens(b);
    if (!ta.length || !tb.length) return 0;
    var hit = 0;
    ta.forEach(function (w) { if (tb.indexOf(w) >= 0) hit++; });
    return hit / ta.length;
  }

  function usedIdSet(session) {
    var set = Object.create(null);
    var ids = (session && session.ids) || [];
    ids.forEach(function (id) { set[String(id)] = 1; });
    return set;
  }

  function seenFpSet(session) {
    var set = Object.create(null);
    if (session && session._qxSimilarFp) {
      (session._qxSimilarFp || []).forEach(function (x) { set[x] = 1; });
    }
    var ids = (session && session.ids) || [];
    ids.forEach(function (id) {
      var q = getQSafe(id);
      if (q) set[fp(q.q || q.question || q.text || "")] = 1;
    });
    return set;
  }

  function rememberFp(session, text) {
    if (!session) return;
    if (!session._qxSimilarFp) session._qxSimilarFp = [];
    var f = fp(text);
    if (f && session._qxSimilarFp.indexOf(f) < 0) session._qxSimilarFp.push(f);
  }

  function bankSimilar(src, session, want, noRepeat) {
    var out = [];
    if (!src) return out;
    var qs = (typeof QUESTIONS !== "undefined" && Array.isArray(QUESTIONS)) ? QUESTIONS : [];
    if (!qs.length) return out;
    var used = usedIdSet(session);
    var fps = seenFpSet(session);
    var ch = String(src.chapter || "").toLowerCase();
    var sub = String(src.subject || "").toLowerCase();
    var bank = src._bank || "";
    var stem = src.q || src.question || src.text || "";
    var scored = [];
    var sameCh = [];
    for (var i = 0; i < qs.length; i++) {
      var q = qs[i];
      if (!q || q.id == null) continue;
      if (used[String(q.id)]) continue;
      if (q._joviGenerated) continue;
      if (ch && String(q.chapter || "").toLowerCase() !== ch) continue;
      if (sub && String(q.subject || "").toLowerCase() !== sub) continue;
      if (bank && q._bank && q._bank !== bank) continue;
      var st = q.q || q.question || q.text || "";
      var f = fp(st);
      if (noRepeat && fps[f]) continue;
      var ov = overlap(stem, st);
      if (ov >= 0.92) continue;
      sameCh.push(q);
      if (ov < 0.12 && tokens(st).length > 6) continue;
      scored.push({ q: q, ov: ov });
    }
    scored.sort(function (a, b) { return b.ov - a.ov; });
    scored.forEach(function (x) {
      if (out.length >= want) return;
      out.push(x.q);
    });
    if (out.length < want) {
      sameCh.forEach(function (q) {
        if (out.length >= want) return;
        if (out.some(function (x) { return String(x.id) === String(q.id); })) return;
        out.push(q);
      });
    }
    return out;
  }

  function buildJoviQ(item, src, i) {
    var id = "jovi_sim_" + Date.now() + "_" + i + "_" + Math.floor(Math.random() * 9999);
    var text = String(item.text || "").trim();
    var sol = String(item.sol || "").trim();
    var isNum = String(item.type || "").toLowerCase() === "numerical";
    var q = {
      id: id,
      q: text,
      question: text,
      text: text,
      options: isNum ? [] : (item.options || []).slice(0, 4),
      answer: isNum ? (item.correctValue || item.answer) : item.answer,
      correctValue: isNum ? String(item.correctValue || item.answer || "") : undefined,
      sol: sol,
      solution: sol,
      subject: (src && src.subject) || "",
      chapter: (src && src.chapter) || "",
      exam: (src && src.exam) || "",
      _bank: (src && src._bank) || "",
      source: "[Jovi-generated]",
      _joviGenerated: true,
      type: isNum ? "numerical" : "singleCorrect"
    };
    return q;
  }

  async function callJovi(src, session, count, trickier, noRepeat) {
    var avoid = [];
    if (noRepeat) {
      var fps = seenFpSet(session);
      Object.keys(fps).forEach(function (k) { if (k) avoid.push(k); });
    }
    if (src) avoid.unshift(strip(src.q || src.question || src.text || "").slice(0, 280));
    var body = {
      mode: "similar_practice",
      count: count,
      trickier: !!trickier,
      avoidStems: avoid.slice(0, 12),
      context: {
        exam: (src && (src.exam || src._bank)) || "",
        subject: src && src.subject,
        chapter: src && src.chapter,
        questionId: src && src.id,
        questionText: strip(src && (src.q || src.question || src.text) || "").slice(0, 2200),
        options: src && Array.isArray(src.options) ? src.options.map(strip).slice(0, 6) : [],
        trickier: !!trickier,
        count: count
      },
      messages: [{ role: "user", content: "Generate " + count + " similar practice questions with options and full solutions." }]
    };
    var lastErr = null;
    for (var u = 0; u < JOVI_URLS.length; u++) {
      try {
        var res = await fetch(JOVI_URLS[u], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        var data = await res.json().catch(function () { return {}; });
        if (!res.ok) {
          lastErr = new Error((data && (data.message || data.error)) || ("HTTP " + res.status));
          continue;
        }
        return (data && data.questions) || [];
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Jovi unavailable");
  }

  function indexQ(q) {
    try {
      if (typeof QUESTIONS !== "undefined" && Array.isArray(QUESTIONS)) QUESTIONS.push(q);
    } catch (_) { /* */ }
    try {
      if (typeof _qxIndexQuestion === "function") _qxIndexQuestion(q);
    } catch (_) { /* */ }
  }

  function appendToSession(ids) {
    if (!ids || !ids.length) return false;
    try {
      if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.appendPracticeQuestions) {
        return !!QuantrexTestEngine.appendPracticeQuestions(ids);
      }
    } catch (_) { /* */ }
    var sess = currentSession();
    if (!sess || !Array.isArray(sess.ids)) return false;
    var start = sess.ids.length;
    ids.forEach(function (id) {
      if (sess.ids.indexOf(id) < 0 && sess.ids.indexOf(String(id)) < 0) sess.ids.push(id);
    });
    if (sess.sections && sess.sections.length) {
      sess.sections.push({
        subject: "Similar practice",
        label: "Similar practice",
        start: start,
        count: sess.ids.length - start
      });
    }
    sess.idx = start;
    try {
      if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.refresh) QuantrexTestEngine.refresh();
    } catch (_) { /* */ }
    return true;
  }

  function setBusy(root, on, msg) {
    var gos = document.querySelectorAll(".qx-boost-go");
    gos.forEach(function (go) {
      go.disabled = !!on;
      go.textContent = on ? "Generating\u2026" : "Generate Practice";
    });
    var msgs = document.querySelectorAll(".qx-boost-msg");
    msgs.forEach(function (m) {
      m.className = "qx-boost-msg";
      m.textContent = msg || "";
    });
    var bar = document.getElementById("egSimilarBtn");
    if (bar) bar.classList.toggle("on", !!on);
  }

  async function generate(opts) {
    opts = opts || {};
    var session = opts.session || currentSession();
    if (!session || !session.practiceMode) {
      toast("Open a practice question first");
      return { ok: false };
    }
    var src = currentQuestion(session);
    if (!src) {
      toast("Question not loaded");
      return { ok: false };
    }
    var count = Math.max(1, Math.min(MAX_COUNT, Number(opts.count != null ? opts.count : savedCount()) || DEFAULT_COUNT));
    var trickier = opts.trickier != null ? !!opts.trickier : trickDefault();
    var noRepeat = opts.noRepeat != null ? !!opts.noRepeat : noRepeatOn();
    lsSet(PREF_COUNT, String(count));
    if (opts.trickier != null) lsSet(PREF_TRICK, trickier ? "1" : "0");

    var host = opts.host || document.querySelector(".eg-test-root") || document;
    setBusy(host, true, trickier ? "Building trickier variations\u2026" : "Finding similar questions\u2026");

    var collected = [];
    try {
      var bank = bankSimilar(src, session, count, noRepeat);
      bank.forEach(function (q) { collected.push({ kind: "bank", q: q }); });

      var need = count - collected.length;
      if (need > 0) {
        setBusy(host, true, "Jovi is writing " + need + " new question" + (need > 1 ? "s" : "") + "\u2026");
        var gen = await callJovi(src, session, need, trickier, noRepeat);
        gen.forEach(function (item, i) {
          var built = buildJoviQ(item, src, i);
          if (!built.q || built.q.length < 8) return;
          if (noRepeat && fp(built.q) === fp(src.q || src.question || "")) return;
          if (overlap(src.q || src.question || "", built.q) >= 0.92) return;
          indexQ(built);
          rememberFp(session, built.q);
          collected.push({ kind: "jovi", q: built });
        });
      }
    } catch (e) {
      setBusy(host, false, "");
      var errText = collected.length
        ? "AI fill failed \u2014 using bank similar questions."
        : ("Could not generate: " + String(e.message || e));
      document.querySelectorAll(".qx-boost-msg").forEach(function (m) {
        m.className = "qx-boost-msg err";
        m.textContent = errText;
      });
      if (!collected.length) {
        toast("Could not generate similar questions");
        return { ok: false, error: e };
      }
    }

    collected = collected.slice(0, count);
    if (!collected.length) {
      setBusy(host, false, "");
      document.querySelectorAll(".qx-boost-msg").forEach(function (m) {
        m.className = "qx-boost-msg err";
        m.textContent = "No unused similar questions yet \u2014 try again or another chapter.";
      });
      toast("No unused similar questions yet \u2014 try again");
      return { ok: false };
    }
    collected.forEach(function (x) { rememberFp(session, x.q.q || x.q.question || ""); });
    var ids = collected.map(function (x) { return x.q.id; });
    var ok = appendToSession(ids);
    setBusy(host, false, "");
    if (ok) {
      toast("Added " + ids.length + " similar practice question" + (ids.length > 1 ? "s" : ""));
    } else {
      toast("Questions ready but could not add to this session");
    }
    return { ok: ok, ids: ids, count: ids.length };
  }

  function chipsHtml(count) {
    count = Math.max(1, Math.min(MAX_COUNT, Number(count) || DEFAULT_COUNT));
    return CHIPS.map(function (n) {
      return '<button type="button" class="qx-boost-chip' + (n === count ? " on" : "") + '" data-qx-boost-n="' + n + '" aria-label="' + n + ' questions">' + n + "</button>";
    }).join("");
  }

  function controlsHtml(count, trickier, compact) {
    count = Math.max(1, Math.min(MAX_COUNT, Number(count) || DEFAULT_COUNT));
    return (
      '<div class="qx-boost-box">' +
        '<span class="qx-boost-lab"># Questions to generate:</span>' +
        '<div class="qx-boost-chips">' +
          '<button type="button" class="qx-boost-pm" data-qx-boost-pm="-1" aria-label="Fewer">\u2212</button>' +
          chipsHtml(count) +
          '<button type="button" class="qx-boost-pm" data-qx-boost-pm="1" aria-label="More">+</button>' +
          '<span class="qx-boost-n" data-qx-boost-nlab>' + count + "</span>" +
        "</div>" +
        '<label class="qx-boost-tog"><input type="checkbox" class="qx-boost-trick"' + (trickier ? " checked" : "") + "> More tricky</label>" +
        '<label class="qx-boost-tog"><input type="checkbox" class="qx-boost-norep"' + (noRepeatOn() ? " checked" : "") + "> Don\u2019t repeat</label>" +
        '<button type="button" class="qx-boost-go" data-qx-boost-go>Generate Practice</button>' +
      "</div>" +
      '<p class="qx-boost-msg"></p>'
    );
  }

  function cardHtml(count, trickier) {
    return (
      '<div class="qx-boost" id="qxBoostCard">' +
        '<div class="qx-boost-head">' +
          '<span class="qx-boost-spark" aria-hidden="true">\u2726</span>' +
          "<div><h3>Mistake Booster AI</h3>" +
          "<p>Challenge yourself with trickier, realistic variations of this concept.</p></div>" +
        "</div>" +
        controlsHtml(count, trickier, false) +
      "</div>"
    );
  }

  function settingsHtml() {
    ensureCss();
    var on = showOn();
    return (
      '<div id="qxBoostSettingsBox" class="qx-boost qx-boost-settings"' + (on ? "" : " hidden") + ">" +
        controlsHtml(savedCount(), trickDefault(), true) +
      "</div>"
    );
  }

  function syncChips(card, n) {
    if (!card) return;
    n = Math.max(1, Math.min(MAX_COUNT, n));
    lsSet(PREF_COUNT, String(n));
    card.querySelectorAll("[data-qx-boost-nlab], #qxBoostN").forEach(function (lab) {
      lab.textContent = String(n);
    });
    document.querySelectorAll(".qx-boost [data-qx-boost-nlab], .qx-boost #qxBoostN").forEach(function (lab) {
      lab.textContent = String(n);
    });
    document.querySelectorAll(".qx-boost [data-qx-boost-n]").forEach(function (b) {
      b.classList.toggle("on", parseInt(b.getAttribute("data-qx-boost-n"), 10) === n);
    });
  }

  function readCount(card) {
    var lab = card && card.querySelector("[data-qx-boost-nlab], #qxBoostN");
    var n = parseInt(lab && lab.textContent, 10);
    return Number.isFinite(n) ? Math.max(1, Math.min(MAX_COUNT, n)) : savedCount();
  }

  function ensureCss() {
    if (document.getElementById("qxSimilarCss")) return;
    var l = document.createElement("link");
    l.id = "qxSimilarCss";
    l.rel = "stylesheet";
    l.href = "assets/qx-similar-practice.css?v=" + encodeURIComponent(global.QX_BUILD || "qxmd288");
    document.head.appendChild(l);
  }

  function hostFromEvent(t) {
    return (t && t.closest && t.closest(".qx-boost")) || document.getElementById("qxBoostCard") || document;
  }

  function handleBoostEvent(e) {
    var t = e && e.target;
    if (!t || !t.closest) return;
    if (t.closest && t.closest("input.qx-boost-trick, input.qx-boost-norep, label.qx-boost-tog, .qx-boost-tog")) {
      return;
    }
    var chip = t.closest("[data-qx-boost-n]");
    var pm = t.closest("[data-qx-boost-pm]");
    var go = t.closest("[data-qx-boost-go], .qx-boost-go");
    if (!chip && !pm && !go) return;
    if (e && e.preventDefault) e.preventDefault();
    if (e && e.stopPropagation) e.stopPropagation();
    var card = hostFromEvent(t);
    if (chip) {
      syncChips(card, parseInt(chip.getAttribute("data-qx-boost-n"), 10));
      return;
    }
    if (pm) {
      var d = parseInt(pm.getAttribute("data-qx-boost-pm"), 10) || 0;
      syncChips(card, readCount(card) + d);
      return;
    }
    if (go) {
      if (go.disabled) return;
      var trickEl = card.querySelector(".qx-boost-trick");
      var nrEl = card.querySelector(".qx-boost-norep");
      generate({
        session: currentSession(),
        host: card,
        count: readCount(card),
        trickier: !!(trickEl && trickEl.checked),
        noRepeat: !(nrEl) || nrEl.checked
      });
    }
  }

  function wireCard(card) {
    if (!card) return;
    card.querySelectorAll(".qx-boost-trick").forEach(function (el) {
      el.onchange = function () { lsSet(PREF_TRICK, el.checked ? "1" : "0"); };
    });
    card.querySelectorAll(".qx-boost-norep").forEach(function (el) {
      el.onchange = function () { lsSet(PREF_NOREP, el.checked ? "1" : "0"); };
    });
  }

  function removeCard(root) {
    try {
      var old = (root && root.querySelector && root.querySelector("#qxBoostCard")) || document.getElementById("qxBoostCard");
      if (old) old.remove();
    } catch (_) { /* */ }
  }

  function attach(root, session) {
    ensureCss();
    session = session || currentSession();
    if (!session || !session.practiceMode) {
      removeCard(root);
      return;
    }
    if (!showOn() || !isChecked(session)) {
      removeCard(root);
      return;
    }
    root = root || document.querySelector(".eg-test-root");
    if (!root || !root.querySelector) return;
    var existing = root.querySelector("#qxBoostCard");
    if (existing) {
      wireCard(existing);
      return;
    }
    var html = cardHtml(savedCount(), trickDefault());
    var sol = root.querySelector("#egSolPanel");
    var mount = root.querySelector("#qxBoostMount");
    if (mount) {
      mount.innerHTML = html;
    } else if (sol && sol.parentNode) {
      sol.insertAdjacentHTML("afterend", html);
    } else {
      var qcard = root.querySelector(".eg-q-card");
      if (qcard) qcard.insertAdjacentHTML("beforeend", html);
      else return;
    }
    var card = root.querySelector("#qxBoostCard");
    wireCard(card);
    try {
      if (card) {
        card.style.scrollMarginBottom = "120px";
        requestAnimationFrame(function () {
          try { card.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (_) { /* */ }
        });
      }
    } catch (_) { /* */ }
  }

  function bindSettings(root) {
    if (!root) return;
    ensureCss();
    var box = root.querySelector("#qxBoostSettingsBox");
    if (box) box.hidden = !showOn();
    wireCard(root.querySelector(".qx-boost-settings") || box || root);
  }

  function clickSimilar() {
    var session = currentSession();
    if (!session || !session.practiceMode) {
      toast("Similar practice is for Practice mode");
      return;
    }
    if (!showOn()) {
      try { lsSet(PREF_SHOW, "1"); } catch (_) { /* */ }
      toast("Mistake Booster AI is now on");
    }
    var root = document.querySelector(".eg-test-root");
    if (!isChecked(session)) {
      generate({ session: session, count: savedCount(), trickier: trickDefault(), noRepeat: noRepeatOn() });
      return;
    }
    attach(root, session);
    var card = root && root.querySelector("#qxBoostCard");
    if (card) {
      try { card.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (_) { /* */ }
      generate({
        session: session,
        host: card,
        count: readCount(card),
        trickier: trickDefault(),
        noRepeat: noRepeatOn()
      });
    } else {
      generate({ session: session, count: savedCount(), trickier: trickDefault(), noRepeat: noRepeatOn() });
    }
  }

  try {
    document.addEventListener("click", handleBoostEvent, true);
    document.addEventListener("pointerdown", function (e) {
      var foot = e.target && e.target.closest && e.target.closest("#egFoot, .eg-foot");
      if (!foot) return;
      var x = e.clientX, y = e.clientY;
      var prev = foot.style.pointerEvents;
      foot.style.pointerEvents = "none";
      var under = document.elementFromPoint(x, y);
      foot.style.pointerEvents = prev;
      var hit = under && under.closest && under.closest("[data-qx-boost-n],[data-qx-boost-pm],[data-qx-boost-go],.qx-boost-go,.qx-boost-chip,.qx-boost-pm");
      if (!hit) return;
      e.preventDefault();
      e.stopPropagation();
      handleBoostEvent({ target: hit, preventDefault: function () {}, stopPropagation: function () {} });
    }, true);
  } catch (_) { /* */ }

  global.QxSimilarPractice = {
    generate: generate,
    attach: attach,
    clickSimilar: clickSimilar,
    cardHtml: cardHtml,
    settingsHtml: settingsHtml,
    bindSettings: bindSettings,
    showOn: showOn,
    prefShow: PREF_SHOW,
    prefTrick: PREF_TRICK
  };
})(typeof window !== "undefined" ? window : globalThis);
