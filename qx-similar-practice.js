/**
 * Practice similar-type generator (Mistake Booster AI).
 * Off until Question View Settings. After Check Answer only.
 * Jovi writes NEW variations (different from the original). Save → Bookmarks.
 * Generated items never join the practice question list / Other palette group.
 */
(function (global) {
  "use strict";

  var PREF_SHOW = "qx_pref_similar_booster";
  var PREF_TRICK = "qx_pref_similar_trickier";
  var PREF_COUNT = "qx_pref_similar_count";
  var PREF_NOREP = "qx_pref_similar_norepeat";
  var STORE = "quantrex_jovi_sim_qs_v1";
  var STORE_MAX = 80;
  var DEFAULT_COUNT = 3;
  var MAX_COUNT = 10;
  var CHIPS = [3, 5, 10];
  var DIFF_SKIP = 0.50;
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
    return lsGet(PREF_TRICK, "1") !== "0";
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
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

  function tooClose(srcText, otherText) {
    var a = srcText || "";
    var b = otherText || "";
    if (!strip(b)) return true;
    if (fp(a) && fp(a) === fp(b)) return true;
    if (overlap(a, b) >= DIFF_SKIP) return true;
    var na = strip(a).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 48);
    var nb = strip(b).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 48);
    return !!(na && nb && na === nb);
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
    var last = global._qxBoostLast || [];
    last.forEach(function (x) {
      var q = x && x.q;
      if (q) set[fp(q.q || q.question || "")] = 1;
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
      if (String(q.id).indexOf("jovi_sim_") === 0) continue;
      if (ch && String(q.chapter || "").toLowerCase() !== ch) continue;
      if (sub && String(q.subject || "").toLowerCase() !== sub) continue;
      if (bank && q._bank && q._bank !== bank) continue;
      var st = q.q || q.question || q.text || "";
      var f = fp(st);
      if (noRepeat && fps[f]) continue;
      if (tooClose(stem, st)) continue;
      var ov = overlap(stem, st);
      if (ov < 0.08 && tokens(st).length > 6) continue;
      scored.push({ q: q, ov: ov });
    }
    scored.sort(function (a, b) {
      return Math.abs(a.ov - 0.28) - Math.abs(b.ov - 0.28);
    });
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
    var subj = (src && (src.subject || src.Subject)) || "Mathematics";
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
      subject: subj,
      chapter: (src && src.chapter) || "",
      exam: (src && src.exam) || "",
      _bank: (src && src._bank) || "",
      source: "Jovi practice",
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
      messages: [{
        role: "user",
        content: "Generate " + count + " NEW practice questions on the same concept. Different function, numbers, and wording from the source. Never paraphrase the original stem. Each needs options or a numerical answer plus a full solution."
      }]
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
      if (typeof QUESTIONS !== "undefined" && Array.isArray(QUESTIONS)) {
        var exists = QUESTIONS.some(function (x) { return x && String(x.id) === String(q.id); });
        if (!exists) QUESTIONS.push(q);
      }
    } catch (_) { /* */ }
    try {
      if (typeof _qxIndexQuestion === "function") _qxIndexQuestion(q);
    } catch (_) { /* */ }
  }

  function persistQ(q) {
    if (!q || q.id == null) return;
    if (!q._joviGenerated && String(q.id).indexOf("jovi_sim_") !== 0) return;
    try {
      var arr = [];
      try { arr = JSON.parse(localStorage.getItem(STORE) || "[]"); } catch (_) { arr = []; }
      if (!Array.isArray(arr)) arr = [];
      arr = arr.filter(function (x) { return x && String(x.id) !== String(q.id); });
      arr.unshift({
        id: q.id,
        q: q.q,
        question: q.question,
        text: q.text,
        options: q.options,
        answer: q.answer,
        correctValue: q.correctValue,
        sol: q.sol,
        solution: q.solution,
        subject: q.subject,
        chapter: q.chapter,
        exam: q.exam,
        _bank: q._bank,
        source: q.source || "Jovi practice",
        _joviGenerated: true,
        type: q.type
      });
      if (arr.length > STORE_MAX) arr = arr.slice(0, STORE_MAX);
      localStorage.setItem(STORE, JSON.stringify(arr));
    } catch (_) { /* */ }
  }

  function hydrateStore() {
    try {
      var arr = JSON.parse(localStorage.getItem(STORE) || "[]");
      if (!Array.isArray(arr)) return;
      arr.forEach(function (q) { if (q && q.id != null) indexQ(q); });
    } catch (_) { /* */ }
  }

  function isGeneratedId(id) {
    var sid = String(id == null ? "" : id);
    if (sid.indexOf("jovi_sim_") === 0) return true;
    var q = getQSafe(id);
    return !!(q && q._joviGenerated);
  }

  function stripSimilarFromSession(session, silent) {
    session = session || currentSession();
    if (!session || !Array.isArray(session.ids) || !session.ids.length) return false;
    var keep = [];
    var dropped = 0;
    var added = session._qxBoostAddedIds || [];
    var addedSet = Object.create(null);
    added.forEach(function (id) { addedSet[String(id)] = 1; });
    session.ids.forEach(function (id, i) {
      var inSimSec = false;
      if (session.sections && session.sections.length) {
        session.sections.forEach(function (s) {
          if (!s) return;
          var lab = String(s.subject || s.label || "");
          if (/similar practice/i.test(lab) && i >= s.start && i < s.start + (s.count || 0)) inSimSec = true;
        });
      }
      if (isGeneratedId(id) || addedSet[String(id)] || inSimSec) {
        dropped++;
        return;
      }
      keep.push(id);
    });
    if (session.sections && session.sections.length) {
      session.sections = session.sections.filter(function (s) {
        return !/similar practice/i.test(String((s && (s.subject || s.label)) || ""));
      });
    }
    session._qxBoostAddedIds = [];
    if (!dropped) return false;
    var oldId = session.ids[session.idx];
    session.ids = keep;
    var ni = keep.indexOf(oldId);
    if (ni < 0) ni = keep.map(String).indexOf(String(oldId));
    session.idx = ni >= 0 ? ni : Math.min(session.idx || 0, Math.max(0, keep.length - 1));
    if (!silent) {
      try {
        if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.refresh) QuantrexTestEngine.refresh();
      } catch (_) { /* */ }
    }
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
  }

  function renderStem(raw) {
    var t = String(raw || "");
    try {
      if (typeof MathTextRenderer !== "undefined" && MathTextRenderer.html) {
        return MathTextRenderer.html(t);
      }
    } catch (_) { /* */ }
    return esc(strip(t)).slice(0, 280);
  }

  function previewHtml(items) {
    if (!items || !items.length) return "";
    var rows = items.map(function (x, i) {
      var q = x.q;
      var kind = x.kind === "jovi" ? "New variation" : "Same chapter, different stem";
      var id = esc(String(q.id));
      var saved = false;
      try {
        saved = typeof QuantrexBookmarks !== "undefined" && QuantrexBookmarks.isBookmarked(q.id);
      } catch (_) { /* */ }
      return '<li class="qx-boost-item" data-qx-boost-id="' + id + '">' +
        '<div class="qx-boost-item-k">' + (i + 1) + " \u00b7 " + kind + "</div>" +
        '<div class="qx-boost-item-q">' + renderStem(q.q || q.question || "") + "</div>" +
        '<button type="button" class="qx-boost-save' + (saved ? " on" : "") + '" data-qx-boost-save="' + id + '">' +
        (saved ? "Saved" : "Save to Bookmarks") + "</button>" +
        "</li>";
    }).join("");
    return '<div class="qx-boost-preview" id="qxBoostPreview">' +
      '<p class="qx-boost-preview-h">These questions are different from the original. Save them to Bookmarks. They will not join this question list, so Other stays empty.</p>' +
      '<ol class="qx-boost-ol">' + rows + "</ol>" +
      '<button type="button" class="qx-boost-saveall" data-qx-boost-saveall>Save all to Bookmarks</button>' +
      "</div>";
  }

  function paintPreview(items) {
    global._qxBoostLast = items || [];
    var html = previewHtml(items);
    document.querySelectorAll(".qx-boost").forEach(function (card) {
      var hold = card.querySelector(".qx-boost-preview-slot");
      if (!hold) {
        hold = document.createElement("div");
        hold.className = "qx-boost-preview-slot";
        card.appendChild(hold);
      }
      hold.innerHTML = html;
      try {
        if (typeof MathTextRenderer !== "undefined" && MathTextRenderer.afterRender) {
          MathTextRenderer.afterRender(hold);
        } else if (typeof Mx !== "undefined" && Mx.afterRender) {
          Mx.afterRender(hold);
        }
      } catch (_) { /* */ }
    });
  }

  function findPreviewQ(id) {
    var last = global._qxBoostLast || [];
    for (var i = 0; i < last.length; i++) {
      if (last[i] && last[i].q && String(last[i].q.id) === String(id)) return last[i].q;
    }
    return getQSafe(id);
  }

  function saveOne(id, skipStrip) {
    var q = findPreviewQ(id);
    if (!q) {
      toast("Question not ready to save");
      return false;
    }
    indexQ(q);
    persistQ(q);
    try {
      if (typeof QuantrexBookmarks === "undefined" || !QuantrexBookmarks.toggle) {
        toast("Bookmarks not loaded");
        return false;
      }
      if (!QuantrexBookmarks.isBookmarked(q.id)) {
        QuantrexBookmarks.toggle(q.id, {
          exam: q.exam,
          subject: q.subject,
          chapter: q.chapter,
          topic: q.chapter,
          source: q.source || "Jovi practice"
        });
      }
    } catch (e) {
      toast("Could not save bookmark");
      return false;
    }
    document.querySelectorAll('[data-qx-boost-save]').forEach(function (btn) {
      if (String(btn.getAttribute("data-qx-boost-save")) === String(id)) {
        btn.classList.add("on");
        btn.textContent = "Saved";
      }
    });
    if (!skipStrip) stripSimilarFromSession(currentSession());
    return true;
  }

  function saveAll() {
    var last = global._qxBoostLast || [];
    var n = 0;
    last.forEach(function (x) {
      if (x && x.q && saveOne(x.q.id, true)) n++;
    });
    stripSimilarFromSession(currentSession());
    if (n) toast("Saved " + n + " question" + (n > 1 ? "s" : "") + " to Bookmarks");
    else toast("Nothing new to save");
    document.querySelectorAll(".qx-boost-msg").forEach(function (m) {
      m.className = "qx-boost-msg";
      m.textContent = n
        ? "Saved to Bookmarks. They are not in this question list."
        : "Already in Bookmarks.";
    });
    return n;
  }

  var _genLock = 0;
  async function generate(opts) {
    opts = opts || {};
    if (Date.now() - _genLock < 900) return { ok: false, busy: true };
    _genLock = Date.now();
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
    setBusy(host, true, trickier ? "Writing trickier variations\u2026" : "Writing new variations\u2026");
    stripSimilarFromSession(session, true);

    var collected = [];
    var joviErr = null;
    try {
      setBusy(host, true, "Jovi is writing " + count + " new question" + (count > 1 ? "s" : "") + "\u2026");
      var gen = await callJovi(src, session, count, trickier, noRepeat);
      gen.forEach(function (item, i) {
        var built = buildJoviQ(item, src, i);
        if (!built.q || built.q.length < 8) return;
        if (tooClose(src.q || src.question || "", built.q)) return;
        if (noRepeat && fp(built.q) === fp(src.q || src.question || "")) return;
        indexQ(built);
        persistQ(built);
        rememberFp(session, built.q);
        collected.push({ kind: "jovi", q: built });
      });
    } catch (e) {
      joviErr = e;
    }

    if (collected.length < count) {
      var need = count - collected.length;
      var bank = bankSimilar(src, session, need, noRepeat);
      bank.forEach(function (q) {
        if (collected.length >= count) return;
        if (tooClose(src.q || src.question || "", q.q || q.question || "")) return;
        collected.push({ kind: "bank", q: q });
      });
    }

    if (!collected.length) {
      setBusy(host, false, "");
      document.querySelectorAll(".qx-boost-msg").forEach(function (m) {
        m.className = "qx-boost-msg err";
        m.textContent = joviErr
          ? ("Could not generate: " + String(joviErr.message || joviErr))
          : "No unused different questions yet \u2014 try again or another chapter.";
      });
      toast(joviErr ? "Could not generate similar questions" : "No unused different questions yet");
      return { ok: false, error: joviErr };
    }

    collected = collected.slice(0, count);
    collected.forEach(function (x) { rememberFp(session, x.q.q || x.q.question || ""); });
    paintPreview(collected);
    setBusy(host, false, "");
    document.querySelectorAll(".qx-boost-msg").forEach(function (m) {
      m.className = "qx-boost-msg";
      m.textContent = collected.length + " new question" + (collected.length > 1 ? "s" : "") +
        " ready. Save to Bookmarks \u2014 they stay out of this list.";
    });
    toast(collected.length + " new question" + (collected.length > 1 ? "s" : "") + " ready \u2014 Save to Bookmarks");
    return { ok: true, ids: collected.map(function (x) { return x.q.id; }), count: collected.length, preview: true };
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
        '<button type="button" class="qx-boost-go" data-qx-boost-go>Generate Practice</button>' +
        '<span class="qx-boost-lab"># Questions to generate:</span>' +
        '<div class="qx-boost-chips">' +
          '<button type="button" class="qx-boost-pm" data-qx-boost-pm="-1" aria-label="Fewer">\u2212</button>' +
          chipsHtml(count) +
          '<button type="button" class="qx-boost-pm" data-qx-boost-pm="1" aria-label="More">+</button>' +
          '<span class="qx-boost-n" data-qx-boost-nlab>' + count + "</span>" +
        "</div>" +
        '<label class="qx-boost-tog"><input type="checkbox" class="qx-boost-trick"' + (trickier ? " checked" : "") + "> More tricky</label>" +
        '<label class="qx-boost-tog"><input type="checkbox" class="qx-boost-norep"' + (noRepeatOn() ? " checked" : "") + "> Don\u2019t repeat</label>" +
      "</div>" +
      '<p class="qx-boost-msg"></p>' +
      '<div class="qx-boost-preview-slot"></div>' +
      '<div class="qx-boost-foot-gap" aria-hidden="true"></div>'
    );
  }

  function cardHtml(count, trickier) {
    return (
      '<div class="qx-boost" id="qxBoostCard">' +
        '<div class="qx-boost-head">' +
          '<span class="qx-boost-spark" aria-hidden="true">\u2726</span>' +
          "<div><h3>Mistake Booster AI</h3>" +
          "<p>New variations of this concept \u2014 different numbers. Save to Bookmarks; they stay out of this question list.</p></div>" +
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
    l.href = "assets/qx-similar-practice.css?v=" + encodeURIComponent(global.QX_BUILD || "qxmd292");
    document.head.appendChild(l);
  }

  function hostFromEvent(t) {
    return (t && t.closest && t.closest(".qx-boost")) || document.getElementById("qxBoostCard") || document;
  }

  function readGenOpts(card) {
    var trickEl = card && card.querySelector(".qx-boost-trick");
    var nrEl = card && card.querySelector(".qx-boost-norep");
    return {
      session: currentSession(),
      host: card,
      count: readCount(card),
      trickier: !!(trickEl && trickEl.checked),
      noRepeat: !(nrEl) || nrEl.checked
    };
  }

  function handleBoostEvent(e) {
    var t = e && e.target;
    if (!t || !t.closest) return;
    var saveAllBtn = t.closest("[data-qx-boost-saveall], .qx-boost-saveall");
    var saveBtn = t.closest("[data-qx-boost-save], .qx-boost-save");
    if (saveAllBtn) {
      if (e && e.preventDefault) e.preventDefault();
      if (e && e.stopPropagation) e.stopPropagation();
      saveAll();
      return;
    }
    if (saveBtn) {
      if (e && e.preventDefault) e.preventDefault();
      if (e && e.stopPropagation) e.stopPropagation();
      var sid = saveBtn.getAttribute("data-qx-boost-save");
      if (sid && saveOne(sid)) toast("Saved to Bookmarks");
      return;
    }
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
      generate(readGenOpts(card));
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
    card.querySelectorAll("[data-qx-boost-go], .qx-boost-go").forEach(function (go) {
      go.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (go.disabled) return;
        generate(readGenOpts(card));
      };
    });
    card.querySelectorAll("[data-qx-boost-n]").forEach(function (chip) {
      chip.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        syncChips(card, parseInt(chip.getAttribute("data-qx-boost-n"), 10));
      };
    });
    card.querySelectorAll("[data-qx-boost-pm]").forEach(function (pm) {
      pm.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        var d = parseInt(pm.getAttribute("data-qx-boost-pm"), 10) || 0;
        syncChips(card, readCount(card) + d);
      };
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
      if (global._qxBoostLast && global._qxBoostLast.length) paintPreview(global._qxBoostLast);
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
    if (global._qxBoostLast && global._qxBoostLast.length) paintPreview(global._qxBoostLast);
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
    }
  }

  try {
    document.addEventListener("click", handleBoostEvent, true);
    function punchFoot(e) {
      var foot = e.target && e.target.closest && e.target.closest("#egFoot, .eg-foot");
      if (!foot) return;
      var x = e.clientX, y = e.clientY;
      var prev = foot.style.pointerEvents;
      foot.style.pointerEvents = "none";
      var under = document.elementFromPoint(x, y);
      foot.style.pointerEvents = prev;
      var hit = under && under.closest && under.closest("[data-qx-boost-n],[data-qx-boost-pm],[data-qx-boost-go],[data-qx-boost-save],[data-qx-boost-saveall],.qx-boost-go,.qx-boost-chip,.qx-boost-pm,.qx-boost-save,.qx-boost-saveall,#qxBoostCard");
      if (!hit) return;
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      handleBoostEvent({ target: hit, preventDefault: function () {}, stopPropagation: function () {} });
    }
    document.addEventListener("pointerdown", punchFoot, true);
    document.addEventListener("click", punchFoot, true);
  } catch (_) { /* */ }

  try { hydrateStore(); } catch (_) { /* */ }

  global.QxSimilarPractice = {
    generate: generate,
    attach: attach,
    clickSimilar: clickSimilar,
    cardHtml: cardHtml,
    settingsHtml: settingsHtml,
    bindSettings: bindSettings,
    saveAll: saveAll,
    showOn: showOn,
    prefShow: PREF_SHOW,
    prefTrick: PREF_TRICK
  };
})(typeof window !== "undefined" ? window : globalThis);
