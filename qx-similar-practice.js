/**
 * Practice similar-type generator (Mistake Booster AI).
 * Database-first unused same-chapter PYQs, then Jovi-generated items with options + solutions.
 */
(function (global) {
  "use strict";

  var PREF_SHOW = "qx_pref_similar_booster";
  var PREF_TRICK = "qx_pref_similar_trickier";
  var PREF_COUNT = "qx_pref_similar_count";
  var PREF_NOREP = "qx_pref_similar_norepeat";
  var DEFAULT_COUNT = 3;
  var MAX_COUNT = 10;
  var CHIPS = [1, 2, 3, 5];

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
    var v = lsGet(PREF_SHOW, "1");
    return v !== "0";
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
      if (ov < 0.12 && tokens(st).length > 6) continue;
      scored.push({ q: q, ov: ov });
    }
    scored.sort(function (a, b) { return b.ov - a.ov; });
    scored.forEach(function (x) {
      if (out.length >= want) return;
      out.push(x.q);
    });
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
    var res = await fetch("/api/jovi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      throw new Error((data && (data.message || data.error)) || ("HTTP " + res.status));
    }
    return (data && data.questions) || [];
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
    var go = root && root.querySelector && root.querySelector("#qxBoostGo");
    if (go) {
      go.disabled = !!on;
      go.textContent = on ? "Generating…" : "Generate Practice";
    }
    var m = root && root.querySelector && root.querySelector("#qxBoostMsg");
    if (m) {
      m.className = "qx-boost-msg";
      m.textContent = msg || "";
    }
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
    setBusy(host, true, trickier ? "Building trickier variations…" : "Finding similar questions…");

    var collected = [];
    try {
      var bank = bankSimilar(src, session, count, noRepeat);
      bank.forEach(function (q) { collected.push({ kind: "bank", q: q }); });

      var need = count - collected.length;
      if (need > 0) {
        setBusy(host, true, "Jovi is writing " + need + " new question" + (need > 1 ? "s" : "") + "…");
        var gen = await callJovi(src, session, need, trickier, noRepeat);
        gen.forEach(function (item, i) {
          var built = buildJoviQ(item, src, i);
          if (noRepeat && fp(built.q) === fp(src.q || src.question || "")) return;
          if (overlap(src.q || src.question || "", built.q) >= 0.92) return;
          indexQ(built);
          rememberFp(session, built.q);
          collected.push({ kind: "jovi", q: built });
        });
      }
    } catch (e) {
      setBusy(host, false, "");
      var m = host.querySelector && host.querySelector("#qxBoostMsg");
      if (m) {
        m.className = "qx-boost-msg err";
        m.textContent = collected.length
          ? "AI fill failed — using bank similar questions."
          : ("Could not generate: " + String(e.message || e));
      }
      if (!collected.length) {
        toast("Could not generate similar questions");
        return { ok: false, error: e };
      }
    }

    collected = collected.slice(0, count);
    if (!collected.length) {
      setBusy(host, false, "");
      toast("No unused similar questions yet — try again");
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

  function cardHtml(count, trickier) {
    count = Math.max(1, Math.min(MAX_COUNT, Number(count) || DEFAULT_COUNT));
    var chips = CHIPS.map(function (n) {
      return '<button type="button" class="qx-boost-chip' + (n === count ? " on" : "") + '" data-qx-boost-n="' + n + '" aria-label="' + n + ' questions">' + n + "</button>";
    }).join("");
    return (
      '<div class="qx-boost" id="qxBoostCard">' +
        '<div class="qx-boost-head">' +
          '<span class="qx-boost-spark" aria-hidden="true">✦</span>' +
          "<div><h3>Mistake Booster AI</h3>" +
          "<p>Challenge yourself with trickier, realistic variations of this concept.</p></div>" +
        "</div>" +
        '<div class="qx-boost-box">' +
          '<span class="qx-boost-lab"># Questions to generate:</span>' +
          '<div class="qx-boost-chips">' +
            '<button type="button" class="qx-boost-pm" data-qx-boost-pm="-1" aria-label="Fewer">−</button>' +
            chips +
            '<button type="button" class="qx-boost-pm" data-qx-boost-pm="1" aria-label="More">+</button>' +
            '<span class="qx-boost-n" id="qxBoostN">' + count + "</span>" +
          "</div>" +
          '<label class="qx-boost-tog"><input type="checkbox" id="qxBoostTrick"' + (trickier ? " checked" : "") + "> More tricky</label>" +
          '<label class="qx-boost-tog"><input type="checkbox" id="qxBoostNoRep"' + (noRepeatOn() ? " checked" : "") + "> Don\u2019t repeat</label>" +
          '<button type="button" class="qx-boost-go" id="qxBoostGo">Generate Practice</button>' +
        "</div>" +
        '<p class="qx-boost-msg" id="qxBoostMsg"></p>' +
      "</div>"
    );
  }

  function syncChips(card, n) {
    if (!card) return;
    n = Math.max(1, Math.min(MAX_COUNT, n));
    lsSet(PREF_COUNT, String(n));
    var lab = card.querySelector("#qxBoostN");
    if (lab) lab.textContent = String(n);
    card.querySelectorAll("[data-qx-boost-n]").forEach(function (b) {
      b.classList.toggle("on", parseInt(b.getAttribute("data-qx-boost-n"), 10) === n);
    });
  }

  function readCount(card) {
    var lab = card && card.querySelector("#qxBoostN");
    var n = parseInt(lab && lab.textContent, 10);
    return Number.isFinite(n) ? Math.max(1, Math.min(MAX_COUNT, n)) : savedCount();
  }

  function ensureCss() {
    if (document.getElementById("qxSimilarCss")) return;
    var l = document.createElement("link");
    l.id = "qxSimilarCss";
    l.rel = "stylesheet";
    l.href = "assets/qx-similar-practice.css?v=" + encodeURIComponent(global.QX_BUILD || "qxmd286");
    document.head.appendChild(l);
  }

  function wireCard(card, session) {
    if (!card || card._qxBoostWired) return;
    card._qxBoostWired = true;
    card.querySelectorAll("[data-qx-boost-n]").forEach(function (b) {
      b.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        syncChips(card, parseInt(b.getAttribute("data-qx-boost-n"), 10));
      };
    });
    card.querySelectorAll("[data-qx-boost-pm]").forEach(function (b) {
      b.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        var d = parseInt(b.getAttribute("data-qx-boost-pm"), 10) || 0;
        syncChips(card, readCount(card) + d);
      };
    });
    var trick = card.querySelector("#qxBoostTrick");
    if (trick) trick.onchange = function () { lsSet(PREF_TRICK, trick.checked ? "1" : "0"); };
    var nr = card.querySelector("#qxBoostNoRep");
    if (nr) nr.onchange = function () { lsSet(PREF_NOREP, nr.checked ? "1" : "0"); };
    var go = card.querySelector("#qxBoostGo");
    if (go) {
      go.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        generate({
          session: session || currentSession(),
          host: card,
          count: readCount(card),
          trickier: !!(trick && trick.checked),
          noRepeat: !(nr) || nr.checked
        });
      };
    }
  }

  function attach(root, session) {
    ensureCss();
    session = session || currentSession();
    if (!session || !session.practiceMode) return;
    if (!showOn()) {
      var old = root && root.querySelector && root.querySelector("#qxBoostCard");
      if (old) old.remove();
      return;
    }
    root = root || document.querySelector(".eg-test-root");
    if (!root || !root.querySelector) return;
    if (root.querySelector("#qxBoostCard")) {
      wireCard(root.querySelector("#qxBoostCard"), session);
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
      var card = root.querySelector(".eg-q-card");
      if (card) card.insertAdjacentHTML("beforeend", html);
      else return;
    }
    wireCard(root.querySelector("#qxBoostCard"), session);
  }

  function clickSimilar() {
    var session = currentSession();
    if (!session || !session.practiceMode) {
      toast("Similar practice is for Practice mode");
      return;
    }
    var root = document.querySelector(".eg-test-root");
    if (root && !root.querySelector("#qxBoostCard")) {
      var sol = root.querySelector("#egSolPanel");
      if (!sol) {
        generate({ session: session, count: savedCount(), trickier: trickDefault(), noRepeat: noRepeatOn() });
        return;
      }
      attach(root, session);
    }
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

  global.QxSimilarPractice = {
    generate: generate,
    attach: attach,
    clickSimilar: clickSimilar,
    cardHtml: cardHtml,
    showOn: showOn,
    prefShow: PREF_SHOW,
    prefTrick: PREF_TRICK
  };
})(typeof window !== "undefined" ? window : globalThis);
