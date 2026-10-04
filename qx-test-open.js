/* Quantrex Academy — test-open screen (qxmd314)
 * Cleans the "Take Test" box (PYQ paper + chapter test) and the Test Series layout chooser:
 * folder visual, essentials only (questions, duration, marks, marking, sections, Start),
 * filters / language / instructions folded behind one small toggle. Real values only:
 * anything that cannot be read from the app's own data is simply not shown.
 */
(function (global) {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  function fmtMin(m) {
    m = Math.round(m || 0);
    if (!m) return "";
    var h = Math.floor(m / 60), r = m % 60;
    return h ? (h + " h" + (r ? " " + r + " min" : "")) : (r + " min");
  }
  function signed(n) { n = Number(n); return (n > 0 ? "+" : n < 0 ? "\u2212" : "") + Math.abs(n); }
  function markingText(sc) {
    if (!sc || sc.correct == null) return "";
    var t = signed(sc.correct) + " / " + signed(sc.wrong || 0);
    if (sc.numericalWrong != null && sc.numericalWrong !== sc.wrong) t += " (numerical " + signed(sc.numericalWrong) + ")";
    return t;
  }
  var FOLDER = '<svg class="qxto-folder" viewBox="0 0 72 56" aria-hidden="true">' +
    '<path class="qxto-f-back" d="M4 10a4 4 0 0 1 4-4h17l6 6h33a4 4 0 0 1 4 4v32a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/>' +
    '<g class="qxto-f-paper"><rect x="14" y="8" width="44" height="34" rx="3"/><path d="M20 17h26M20 23h32M20 29h22"/></g>' +
    '<path class="qxto-f-front" d="M4 22a4 4 0 0 1 4-4h56a4 4 0 0 1 4 4v26a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/>' +
    '<text class="qxto-f-q" x="36" y="41" text-anchor="middle">Q</text></svg>';

  /* ---------- facts ---------- */
  var chapLoad = { key: "", qs: null, onReady: null };
  function chapterFacts(root) {
    var ctx = global._cpyqbSessionCtx || {};
    var all = global._qxListQsAll || global._qxListQs || [];
    if (!all.length) {
      try { if (typeof getChapterQuestions === "function" && ctx.chapter) all = getChapterQuestions(ctx.exam, ctx.subject, ctx.chapter) || []; } catch (_) { all = []; }
    }
    var key = [ctx.exam, ctx.subject, ctx.chapter].join("|");
    if (!all.length && chapLoad.key === key && chapLoad.qs) all = chapLoad.qs;
    if (!all.length && ctx.chapter && chapLoad.key !== key && typeof loadChapterBank === "function") {
      // Same cached chapter file the test itself loads on Start — fetch once, then fill the facts.
      chapLoad = { key: key, qs: null };
      try {
        loadChapterBank(ctx.exam, ctx.subject, ctx.chapter).then(function (qs) {
          if (chapLoad.key !== key) return;
          chapLoad.qs = Array.isArray(qs) ? qs : [];
          if (chapLoad.qs.length && typeof chapLoad.onReady === "function") chapLoad.onReady();
        }, function () { /* facts stay partial */ });
      } catch (_) { /* */ }
    }
    var pick = function (n) { return [].slice.call(root.querySelectorAll('input[name="' + n + '"]:checked')).map(function (e) { return String(e.value); }); };
    var years = pick("cpyqbYear"), diffs = pick("cpyqbDiff"), types = pick("cpyqbType"), evals = pick("cpyqbEval");
    var qs = all.slice();
    try {
      if (years.length && typeof qYearFromSource === "function") qs = qs.filter(function (q) { return years.indexOf(String(qYearFromSource(q.source) || qYearFromSource(q.paperSource) || qYearFromSource(q.examName) || "")) >= 0; });
      if (diffs.length) qs = qs.filter(function (q) { return diffs.indexOf(typeof qxNormDifficulty === "function" ? qxNormDifficulty(q.difficulty) : String(q.difficulty || "")) >= 0; });
      if (types.length) qs = qs.filter(function (q) {
        var t = "mcq";
        try { if (global.QuantrexQFormat && QuantrexQFormat.getType) t = QuantrexQFormat.getType(q); } catch (_) { /* */ }
        if (t === "numerical" || t === "subjective") return types.indexOf("numerical") >= 0;
        if (t === "multipleCorrect") return types.indexOf("multiple") >= 0 || types.indexOf("mcq") >= 0;
        return types.indexOf("mcq") >= 0;
      });
      if (evals.length) {
        var solved = (typeof STATE !== "undefined" && STATE.solved) || [];
        qs = qs.filter(function (q) {
          var r = solved.find(function (x) { return x && String(x.id) === String(q.id); });
          if (!r) return evals.indexOf("unattempted") >= 0;
          return evals.indexOf(r.correct ? "correct" : "wrong") >= 0;
        });
      }
    } catch (_) { /* keep unfiltered */ }
    var n = qs.length;
    var exam = (typeof STATE !== "undefined" && STATE.exam) || "";
    var sc = (exam === "Engineering" || exam === "Medical") ? { correct: 4, wrong: -1 } : { correct: 1, wrong: 0 };
    return {
      exam: [String(ctx.exam || "").replace(/_/g, " ").toUpperCase(), ctx.subject].filter(Boolean).join(" \u00b7 "),
      questions: n,
      minutes: n ? Math.max(10, Math.ceil(n * 1.5)) : 0,
      marks: n * sc.correct,
      marking: markingText(sc),
      sections: ctx.subject ? [ctx.subject] : []
    };
  }
  function paperFacts(root) {
    var go = root.querySelector(".eg-cfg-go");
    var on = go && go.getAttribute("onclick") || "";
    var m = on.match(/pyqStartSession\('([^']*)',\s*decodeURIComponent\('([^']*)'\)/);
    if (!m) return null;
    var slug = m[1], src = "";
    try { src = decodeURIComponent(m[2]); } catch (_) { src = m[2]; }
    var meta = null, sc = null, fmt = null;
    try { meta = typeof pyqFindPaperMeta === "function" ? pyqFindPaperMeta(slug, src) : null; } catch (_) { /* */ }
    try { sc = typeof pyqPaperScoring === "function" ? pyqPaperScoring(slug) : null; } catch (_) { /* */ }
    try { fmt = typeof marksExamFormat === "function" ? marksExamFormat(slug) : null; } catch (_) { /* */ }
    var subs = [].slice.call(root.querySelectorAll('input[name="pyqSub"]'));
    var chosen = subs.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
    var total = meta && (meta.officialCount || meta.count) || 0;
    var n = total && subs.length && chosen.length < subs.length ? 0 : total; // partial subject picks: count known only at start
    var mins = 0;
    try {
      if (meta && meta.durationMin) mins = Number(meta.durationMin);
      else if (typeof pyqPaperDuration === "function") mins = pyqPaperDuration(total, slug, typeof qYearFromSource === "function" ? qYearFromSource(src) : null, src) / 60;
    } catch (_) { /* */ }
    if (!n) mins = (chosen.length < subs.length) ? 0 : mins;
    var pat = null; // the app's own official pattern (e.g. 90-question 2021–24 papers are out of 300)
    try { if (typeof pyqOfficialPattern === "function" && total) pat = pyqOfficialPattern(slug, typeof qYearFromSource === "function" ? qYearFromSource(src) : null, total); } catch (_) { pat = null; }
    return {
      exam: (fmt && fmt.title) || "",
      questions: n,
      minutes: mins,
      marks: n ? ((meta && meta.totalMarks) || (pat && pat.totalMarks) || (sc ? n * sc.correct : 0)) : 0,
      marking: markingText(sc),
      sections: subs.length ? [] : chosen, // the section chips right below already show this
      partial: chosen.length < subs.length
    };
  }
  function factsHtml(f) {
    if (!f) return "";
    var cells = [];
    if (f.questions) cells.push(["Questions", f.questions]);
    if (f.minutes) cells.push(["Duration", fmtMin(f.minutes)]);
    if (f.marks) cells.push(["Max marks", f.marks]);
    if (f.marking) cells.push(["Marking", f.marking]);
    if (f.sections && f.sections.length) cells.push(["Sections", f.sections.length > 3 ? f.sections.length : f.sections.join(", ")]);
    var html = cells.map(function (c) {
      var wide = c[0] === "Sections" || String(c[1]).length > 12;
      return '<div class="qxto-fact' + (wide ? " wide" : "") + '"><span>' + esc(c[0]) + "</span><b>" + esc(c[1]) + "</b></div>";
    }).join("");
    if (f.partial) html += '<p class="qxto-note">Fewer subjects selected — question count and time are set when the test starts.</p>';
    return html;
  }
  function instrHtml(f) {
    var li = [
      "The timer starts when the test opens; the test is submitted automatically when time runs out.",
      "Use the question palette to jump between questions. <b>Save &amp; Next</b> saves your answer.",
      "<b>Mark for Review</b> flags a question so you can come back to it before submitting."
    ];
    if (f && f.marking) li.unshift("Marking: <b>" + esc(f.marking) + "</b> (correct / wrong). Unattempted questions score 0.");
    return '<ul class="qxto-instr">' + li.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";
  }

  /* ---------- PYQ / chapter "Take Test" box ---------- */
  function enhanceSession(root) {
    var card = root.querySelector(".eg-cfg");
    var go = root.querySelector(".eg-cfg-go");
    if (!card || !go || card.getAttribute("data-qxto")) return;
    var badge = root.querySelector(".eg-cfg-badge");
    var isTest = (badge && badge.classList.contains("test")) || /Test$/i.test(go.textContent.trim());
    if (!isTest) return;
    card.setAttribute("data-qxto", "1");
    root.classList.add("qxto-root");
    card.classList.add("qxto");
    var isChapter = !!root.querySelector('input[name="cpyqbType"],input[name="cpyqbYear"]');
    var h = card.querySelector(".eg-cfg-h");
    var title = (h && h.querySelector("h3") && h.querySelector("h3").textContent) || "Test";
    var calc = function () { return isChapter ? chapterFacts(root) : paperFacts(root); };
    var f = calc();
    var hero = document.createElement("div");
    hero.className = "qxto-hero";
    hero.innerHTML = FOLDER + '<div class="qxto-ht"><h3>' + esc(title) + "</h3><p>" + esc((f && f.exam) || "") +
      (f && f.exam ? " \u00b7 " : "") + (isChapter ? "Chapter test" : "Full paper") + '</p></div>';
    var x = h && h.querySelector(".eg-cfg-x");
    if (x) hero.appendChild(x);
    var facts = document.createElement("div");
    facts.className = "qxto-facts";
    facts.innerHTML = factsHtml(f);
    card.insertBefore(facts, card.firstChild);
    card.insertBefore(hero, card.firstChild);
    // fold options + instructions
    var more = document.createElement("details");
    more.className = "qxto-more";
    more.innerHTML = '<summary><span>Options &amp; instructions</span></summary><div class="qxto-more-b"></div>';
    var box = more.querySelector(".qxto-more-b");
    var kids = [].slice.call(card.children);
    var subH = null, subPick = card.querySelector(".eg-sub-pick");
    kids.forEach(function (el) {
      if (el === hero || el === facts || el === go || el === h) return;
      if (el.classList.contains("eg-sub-pick")) return;
      if (el.tagName === "H4" && el.nextElementSibling === subPick) { subH = el; return; }
      // keep a real Resume choice visible
      if (el.classList.contains("eg-resume-grid") && el.querySelector('input[value="resume"]')) return;
      if (el.tagName === "H4" && el.nextElementSibling && el.nextElementSibling.classList.contains("eg-resume-grid") && el.nextElementSibling.querySelector('input[value="resume"]')) return;
      box.appendChild(el);
    });
    var ins = document.createElement("div");
    ins.innerHTML = '<h4 class="qxto-ih">Instructions</h4>' + instrHtml(f);
    box.appendChild(ins);
    if (subH) { subH.classList.add("qxto-subh"); subH.innerHTML = subH.innerHTML.replace(/Select Subjects/, "Sections"); }
    card.insertBefore(more, go);
    if (h) h.classList.add("qxto-hidden");
    var upd = function () { var nf = calc(); facts.innerHTML = factsHtml(nf); var il = box.querySelector(".qxto-instr"); if (il) il.outerHTML = instrHtml(nf); };
    if (isChapter) chapLoad.onReady = function () { if (document.body.contains(card)) upd(); };
    root.addEventListener("change", function () { setTimeout(upd, 0); });
    // capture phase: the subject chips stop propagation in their own click handler
    root.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".eg-chip[data-sub], .eg-chip")) setTimeout(upd, 60); }, true);
  }

  /* ---------- Test Series layout chooser ---------- */
  function enhanceChooser(root) {
    var card = root.querySelector(".ts-fmt-card");
    if (!card || card.getAttribute("data-qxto")) return;
    card.setAttribute("data-qxto", "1");
    root.classList.add("qxto-root");
    card.classList.add("qxto");
    var head = card.querySelector(".ts-fmt-head");
    var t = head && head.querySelector(".ts-fmt-title");
    var meta = head && head.querySelector(".ts-fmt-meta");
    var m = meta ? meta.textContent.match(/(\d+)\s*questions?\s*\u00b7\s*(\d+)\s*minutes?/i) : null;
    var hero = document.createElement("div");
    hero.className = "qxto-hero";
    hero.innerHTML = FOLDER + '<div class="qxto-ht"><h3>' + esc(t ? t.textContent : "Test") + "</h3><p>JEE Main \u00b7 Test Series</p></div>";
    var x = card.querySelector(".ts-fmt-x");
    if (x) hero.appendChild(x);
    var facts = document.createElement("div");
    facts.className = "qxto-facts";
    var n = m ? Number(m[1]) : 0;
    facts.innerHTML = factsHtml({ questions: n, minutes: m ? Number(m[2]) : 0, marks: n ? n * 4 : 0, marking: n ? markingText({ correct: 4, wrong: -1, numericalWrong: 0 }) : "" });
    card.insertBefore(facts, card.firstChild);
    card.insertBefore(hero, card.firstChild);
    if (head) head.classList.add("qxto-hidden");
    var hint = card.querySelector(".ts-fmt-hint");
    if (hint) hint.classList.add("qxto-hidden");
    var sec = card.querySelector(".ts-fmt-section");
    if (sec) sec.textContent = "Layout";
  }

  function scan() {
    var a = document.getElementById("pyqPracticeModal");
    if (a) { try { enhanceSession(a); } catch (e) { /* never block starting a test */ } }
    var b = document.getElementById("tsFormatChooser");
    if (b) { try { enhanceChooser(b); } catch (e) { /* */ } }
  }
  function init() {
    scan();
    try {
      new MutationObserver(function (list) {
        for (var i = 0; i < list.length; i++) if (list[i].addedNodes.length) { scan(); return; }
      }).observe(document.body, { childList: true });
    } catch (_) { /* */ }
  }
  if (document.body) init(); else document.addEventListener("DOMContentLoaded", init);
  global.QxTestOpen = { scan: scan };
})(typeof window !== "undefined" ? window : this);
