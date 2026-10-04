/* qxmd311: Quantrex shared Print module (QxPrint).
   One dialog + one print view for every study screen: practice / chapter / PYQ / mock / custom test player
   (Settings > Tools > Print), result + analysis, bookmarks, Create Own Test preview.
   Uses only the real question / answer / solution data already loaded in the app. A missing correct answer prints
   "Answer: not available" - nothing is ever guessed. Output: print-only container + @media print (A4), window.print(). */
(function () {
  "use strict";
  if (window.QxPrint) return;

  var BRAND = {
    name: "Quantrex Academy",
    tag: "Concept Create Destiny",
    site: "www.quantrexacademy.com",
    wa: "+91 87005 08344",
    logo: "assets/quantrex-logo-3d-192.png"
  };
  var CONTENT = [
    { id: "paper", label: "Questions only", sub: "Clean question paper" },
    { id: "paper_key", label: "Questions + Answer key", sub: "Key on a separate last page" },
    { id: "paper_sol", label: "Questions + Solutions", sub: "Solution under each question" },
    { id: "paper_key_sol", label: "Questions + Answer key + Solutions", sub: "Complete study copy" },
    { id: "key", label: "Answer key only", sub: "Compact table of answers" }
  ];
  var SCOPES = [
    { id: "all", label: "All questions" },
    { id: "wrong", label: "Wrong only", need: "attempt" },
    { id: "wrong_un", label: "Wrong + Unattempted", need: "attempt" },
    { id: "bm", label: "Bookmarked", need: "bm" }
  ];

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function gq(id) { try { return typeof getQ === "function" ? getQ(id) : null; } catch (_) { return null; } }
  function QF() { return typeof QuantrexQFormat !== "undefined" ? QuantrexQFormat : null; }
  function toast(m) { try { if (typeof showToast === "function") showToast(m); } catch (_) {} }
  function mx(t) { try { return (typeof Mx !== "undefined" && Mx.html) ? Mx.html(String(t || "")) : esc(t); } catch (_) { return esc(t); } }
  function plain(t) { return String(t || "").replace(/<[^>]+>/g, " ").replace(/\$+/g, "").replace(/\\[a-zA-Z]+/g, " ").replace(/[{}]/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); }
  function isBm(id) { try { return typeof QuantrexBookmarks !== "undefined" && QuantrexBookmarks.isBookmarked(id); } catch (_) { return false; } }
  function letter(i) { return String.fromCharCode(65 + i); }
  function qType(q) { var f = QF(); try { return f ? f.getType(q) : (q && q.options && q.options.length ? "singleCorrect" : "numerical"); } catch (_) { return "singleCorrect"; } }
  function opts(q) {
    var o = q && (q.options || q.opts || q.choices);
    return Array.isArray(o) ? o.filter(function (x) { return x != null && String(x).trim() !== ""; }) : [];
  }
  function isNumType(t) { return t === "numerical" || t === "subjective"; }
  /* Correct answer, never guessed. Returns {ok, text(html), short(plain)} */
  function correctAnswer(q) {
    if (!q) return { ok: false };
    var f = QF(), t = qType(q);
    if (isNumType(t) || !opts(q).length) {
      var v = "";
      try { v = f ? f.correctNumerical(q) : (q.correctValue != null ? String(q.correctValue) : ""); } catch (_) { v = ""; }
      v = String(v || "").replace(/<[^>]+>/g, "").trim();
      if (!v) return { ok: false };
      return { ok: true, text: esc(v), short: v };
    }
    var ci = [];
    try { ci = f ? f.correctIndices(q) : []; } catch (_) { ci = []; }
    var n = opts(q).length;
    ci = (ci || []).filter(function (i) { return i >= 0 && i < n; });
    if (!ci.length) return { ok: false };
    var lab = ci.map(letter).join(", ");
    return { ok: true, text: "(" + lab + ")", short: lab };
  }
  function chosenText(q, chosen) {
    if (chosen == null || chosen === "" || (Array.isArray(chosen) && !chosen.length)) return "";
    var t = qType(q);
    if (isNumType(t) || !opts(q).length) return esc(String(chosen));
    if (Array.isArray(chosen)) return "(" + chosen.map(function (i) { return letter(+i); }).join(", ") + ")";
    if (/^\d+$/.test(String(chosen))) return "(" + letter(+chosen) + ")";
    return esc(String(chosen));
  }
  function grade(q, chosen) {
    var f = QF();
    if (!q) return "unknown";
    var answered = chosen !== undefined && chosen !== null && chosen !== "" && !(Array.isArray(chosen) && !chosen.length);
    try { if (answered && f && f.isAnswered) answered = f.isAnswered(q, chosen); } catch (_) {}
    if (!answered) return "skipped";
    if (!correctAnswer(q).ok) return "unknown";
    try {
      var g = f ? f.grade(q, chosen) : { correct: false };
      if (g.correct) return "correct";
      if (g.partial) return "partial";
      return "wrong";
    } catch (_) { return "unknown"; }
  }
  function sourceChip(q) {
    var s = q && (q.source || q.paperSource || q._sourceFull || "");
    s = plain(s);
    if (!s && q && q.examName) s = plain(q.examName + (q.year ? " " + q.year : ""));
    return s.slice(0, 60);
  }
  function paint(src) {
    try { if (typeof MathTextRenderer !== "undefined" && MathTextRenderer.render) return MathTextRenderer.render(String(src || "")); } catch (_) {}
    return mx(src);
  }
  /* same pipeline as the player (test-engine renderQuestionText): clean stem source, figures, math */
  function stemHtml(q) {
    var src = (q && (q.q || q.question || q.questionText)) || "";
    try {
      if (typeof MathTextRenderer !== "undefined" && MathTextRenderer.pickStemSource) src = MathTextRenderer.pickStemSource(q, q.q) || src;
      else if (typeof QxImgClean !== "undefined" && QxImgClean.bestStemHtml) src = QxImgClean.bestStemHtml(q, q.q) || src;
    } catch (_) {}
    try {
      if (typeof QxImgClean !== "undefined" && QxImgClean.buildQuestionBodyHtml) {
        var html = QxImgClean.buildQuestionBodyHtml(q.id, src, paint, q);
        if (html) return String(html).replace(/\sid="[^"]*"/g, "");
      }
    } catch (_) {}
    return paint(src);
  }
  function solutionHtml(q) {
    var raw = q && (q.solution || q.sol || q.explanation) || "";
    try {
      if (typeof QuantrexSolution !== "undefined" && QuantrexSolution.isPlaceholderSolution && QuantrexSolution.isPlaceholderSolution(raw)) return "";
    } catch (_) {}
    if (!plain(raw)) return "";
    if (/solution not available|support us by uploading|community solution|official solution is not available/i.test(plain(raw))) return "";
    try {
      if (typeof QuantrexSolution !== "undefined" && QuantrexSolution.renderBlock) {
        var card = QuantrexSolution.renderBlock(q);
        if (card) {
          var d = document.createElement("div");
          d.innerHTML = card;
          var flow = d.querySelector(".qx-sol-flow");
          if (flow && plain(flow.innerHTML)) return flow.innerHTML;
        }
      }
    } catch (_) {}
    return mx(raw);
  }

  /* ---------- context collection ---------- */
  function engineSession() { try { return (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.getSession) ? QuantrexTestEngine.getSession() : null; } catch (_) { return null; } }
  function itemsFromSession(s) {
    var practice = !!s.practiceMode, submitted = !!s.submitted;
    var checked = s._egChecked || {};
    var anyAttempt = false;
    var items = (s.ids || []).map(function (id, i) {
      var q = gq(id), chosen = s.answers ? s.answers[i] : undefined, st = "unknown";
      if (submitted) st = grade(q, chosen);
      else if (practice) {
        var isChecked = !!(checked[i] || checked[String(i)] || checked[id]);
        if (isChecked) st = grade(q, chosen);
        else st = "skipped";
      }
      if ((submitted || practice) && (st === "correct" || st === "wrong" || st === "partial")) anyAttempt = true;
      return { id: id, q: q, n: i + 1, chosen: chosen, status: st, bm: isBm(id) };
    });
    var hasAttempt = submitted || (practice && anyAttempt);
    if (!hasAttempt) items.forEach(function (it) { it.status = "unknown"; });
    return { items: items, hasAttempt: hasAttempt, phase: submitted ? "result" : (practice ? "practice" : "test"), title: s.title || "Practice" };
  }
  function itemsFromSnapshot(snap) {
    var grades = snap.grades || [];
    var ids = snap.ids || grades.map(function (g) { return g.id; });
    var answers = snap.answers || {};
    var items = ids.map(function (id, i) {
      var g = grades[i] || {}, qid = g.id != null ? g.id : id, q = gq(qid);
      var chosen = g.chosen !== undefined ? g.chosen : answers[i];
      var st = g.isCorrect ? "correct" : (g.isWrong ? "wrong" : (g.isSkip ? "skipped" : grade(q, chosen)));
      if (st === "correct" || st === "wrong") { if (!correctAnswer(q).ok && st === "wrong") st = "unknown"; }
      return { id: qid, q: q, n: i + 1, chosen: chosen, status: st, bm: isBm(qid) };
    });
    return { items: items, hasAttempt: true, phase: "result", title: snap.title || "Test" };
  }
  function itemsFromIds(ids, title) {
    return { items: (ids || []).map(function (id, i) { return { id: id, q: gq(id), n: i + 1, chosen: undefined, status: "unknown", bm: isBm(id) }; }), hasAttempt: false, phase: "list", title: title || "Questions" };
  }
  function autoContext() {
    var onResult = !!document.querySelector("#qzAnPage, .result-screen, .marks-result, .qzrr-analysis");
    var s = engineSession();
    if (s && s.ids && s.ids.length && !(onResult && !s.submitted)) return itemsFromSession(s);
    var snap = window._qxLastAttemptSnapshot;
    if (onResult && snap && (snap.ids || snap.grades)) return itemsFromSnapshot(snap);
    if (s && s.ids && s.ids.length) return itemsFromSession(s);
    if (snap && (snap.ids || snap.grades)) return itemsFromSnapshot(snap);
    /* single-question player (#question/<id>) */
    var el = document.querySelector(".mtk-test-root [data-qx-qid], .eg-test-root [data-qx-qid]");
    var qid = el && el.getAttribute("data-qx-qid");
    if (qid && gq(qid)) return itemsFromIds([gq(qid).id != null ? gq(qid).id : qid], (gq(qid).chapter || "Question"));
    return null;
  }

  /* ---------- state ---------- */
  var ST = null; /* { ctx, content, scope, sel:Set(idx), mine, cols, font, header, pages, wm, filt } */
  function defaults(ctx, preset) {
    var content = ctx.phase === "test" ? "paper" : (ctx.phase === "result" ? "paper_key_sol" : (ctx.hasAttempt ? "paper_key_sol" : "paper_key"));
    var o = { ctx: ctx, content: content, scope: "all", mine: ctx.hasAttempt, cols: 1, font: "normal", header: true, pages: true, wm: true, filt: { ch: "", diff: "" } };
    if (preset === "mistakes") { o.scope = "wrong"; o.content = "paper_sol"; o.mine = true; }
    o.sel = new Set();
    applyScope(o);
    return o;
  }
  function matchScope(it, scope) {
    if (scope === "wrong") return it.status === "wrong" || it.status === "partial";
    if (scope === "wrong_un") return it.status === "wrong" || it.status === "partial" || it.status === "skipped";
    if (scope === "bm") return !!it.bm;
    return true;
  }
  function matchFilt(it, f) {
    var q = it.q || {};
    if (f.ch && String(q.chapter || q.topic || "") !== f.ch) return false;
    if (f.diff && String(q.difficulty || "") !== f.diff) return false;
    return true;
  }
  function applyScope(o) {
    o.sel = new Set();
    o.ctx.items.forEach(function (it, i) { if (matchScope(it, o.scope) && matchFilt(it, o.filt)) o.sel.add(i); });
  }
  function counts(ctx) {
    var c = { all: ctx.items.length, wrong: 0, wrong_un: 0, bm: 0 };
    ctx.items.forEach(function (it) { if (matchScope(it, "wrong")) c.wrong++; if (matchScope(it, "wrong_un")) c.wrong_un++; if (it.bm) c.bm++; });
    return c;
  }
  function distinct(ctx, key) {
    var m = {};
    ctx.items.forEach(function (it) { var v = it.q && it.q[key]; if (v) m[v] = (m[v] || 0) + 1; });
    return Object.keys(m);
  }

  /* ---------- styles ---------- */
  function ensureCss() {
    if (document.getElementById("qxPrintCss")) return;
    var css = [
      /* dialog */
      "#qxPrintDlg{position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center;font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}",
      "@media (min-width:720px){#qxPrintDlg{align-items:center}}",
      "#qxPrintDlg .qxpd{background:#fff;color:#0f172a;width:100%;max-width:560px;max-height:92vh;max-height:92dvh;display:flex;flex-direction:column;border-radius:18px 18px 0 0;box-shadow:0 -10px 40px rgba(0,0,0,.25);box-sizing:border-box;overflow:hidden}",
      "@media (min-width:720px){#qxPrintDlg .qxpd{border-radius:18px}}",
      "#qxPrintDlg .qxpd-h{display:flex;align-items:center;gap:10px;padding:14px 16px 10px;border-bottom:1px solid #e5e7eb}",
      "#qxPrintDlg .qxpd-h h3{margin:0;font-size:17px;font-weight:800;flex:1;min-width:0}",
      "#qxPrintDlg .qxpd-x{border:0;background:#f1f5f9;color:#0f172a;width:36px;height:36px;border-radius:10px;font-size:18px;cursor:pointer}",
      "#qxPrintDlg .qxpd-b{overflow-y:auto;overflow-x:hidden;padding:10px 16px 6px;-webkit-overflow-scrolling:touch}",
      "#qxPrintDlg .qxpd-sec{margin:8px 0 12px}",
      "#qxPrintDlg .qxpd-lab{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64748b;margin:0 0 6px}",
      "#qxPrintDlg .qxpd-preset{display:flex;gap:8px;flex-wrap:wrap}",
      "#qxPrintDlg .qxpd-preset button{flex:1 1 140px;min-height:44px;border-radius:12px;border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;font-weight:800;font-size:14px;cursor:pointer}",
      "#qxPrintDlg .qxpd-preset button.alt{border-color:#bfdbfe;background:#eff6ff;color:#1d4ed8}",
      "#qxPrintDlg .qxpd-opt{display:flex;align-items:flex-start;gap:10px;padding:9px 10px;border:1px solid #e5e7eb;border-radius:12px;margin:0 0 6px;cursor:pointer;min-height:44px;box-sizing:border-box}",
      "#qxPrintDlg .qxpd-opt input{margin:3px 0 0;width:18px;height:18px;flex:0 0 auto;accent-color:#2563eb}",
      "#qxPrintDlg .qxpd-opt b{display:block;font-size:14px;font-weight:700}",
      "#qxPrintDlg .qxpd-opt small{display:block;font-size:12px;color:#64748b;margin-top:1px}",
      "#qxPrintDlg .qxpd-opt.on{border-color:#2563eb;background:#eff6ff}",
      "#qxPrintDlg .qxpd-opt.dis{opacity:.45;cursor:not-allowed}",
      "#qxPrintDlg .qxpd-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}",
      "#qxPrintDlg .qxpd-grid .qxpd-opt{margin:0}",
      "#qxPrintDlg .qxpd-row{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:40px;font-size:14px}",
      "#qxPrintDlg .qxpd-seg{display:inline-flex;border:1px solid #cbd5e1;border-radius:10px;overflow:hidden;flex:0 0 auto}",
      "#qxPrintDlg .qxpd-seg button{border:0;background:#fff;color:#334155;padding:8px 12px;font-size:13px;font-weight:700;min-height:36px;cursor:pointer}",
      "#qxPrintDlg .qxpd-seg button.on{background:#2563eb;color:#fff}",
      "#qxPrintDlg .qxpd-tg{width:20px;height:20px;accent-color:#2563eb}",
      "#qxPrintDlg .qxpd-tg:disabled + span{opacity:.5}",
      "#qxPrintDlg details{border:1px solid #e5e7eb;border-radius:12px;padding:0 10px}",
      "#qxPrintDlg summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:700;font-size:14px;gap:6px}",
      "#qxPrintDlg .qxpd-filters{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 8px}",
      "#qxPrintDlg .qxpd-filters select{max-width:100%;min-height:36px;border:1px solid #cbd5e1;border-radius:9px;padding:4px 8px;font-size:13px;background:#fff;color:#0f172a}",
      "#qxPrintDlg .qxpd-filters button{min-height:36px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;color:#0f172a;font-size:13px;font-weight:700;padding:0 10px;cursor:pointer}",
      "#qxPrintDlg .qxpd-list{max-height:260px;overflow-y:auto;margin:0 0 10px;border-top:1px solid #f1f5f9}",
      "#qxPrintDlg .qxpd-it{display:flex;gap:8px;align-items:flex-start;padding:7px 2px;border-bottom:1px solid #f1f5f9;font-size:13px;cursor:pointer}",
      "#qxPrintDlg .qxpd-it input{width:18px;height:18px;margin:1px 0 0;flex:0 0 auto;accent-color:#2563eb}",
      "#qxPrintDlg .qxpd-it .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;color:#334155}",
      "#qxPrintDlg .qxpd-st{font-size:10px;font-weight:800;padding:2px 6px;border-radius:999px;flex:0 0 auto;text-transform:uppercase}",
      ".qxpd-st.correct{background:#dcfce7;color:#166534}.qxpd-st.wrong,.qxpd-st.partial{background:#fee2e2;color:#991b1b}.qxpd-st.skipped{background:#f1f5f9;color:#475569}",
      "#qxPrintDlg .qxpd-f{display:flex;gap:8px;padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));border-top:1px solid #e5e7eb;background:inherit}",
      "#qxPrintDlg .qxpd-f button{flex:1;min-height:48px;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer;border:1px solid #cbd5e1;background:#fff;color:#0f172a}",
      "#qxPrintDlg .qxpd-f .go{flex:2;background:#2563eb;border-color:#2563eb;color:#fff}",
      "#qxPrintDlg .qxpd-f .go:disabled{opacity:.5}",
      "#qxPrintDlg .qxpd-note{font-size:12px;color:#64748b;margin:2px 0 8px}",
      /* dark dialog */
      "html[data-theme='dark'] #qxPrintDlg .qxpd{background:#0f172a;color:#e2e8f0}",
      "html[data-theme='dark'] #qxPrintDlg .qxpd-h,html[data-theme='dark'] #qxPrintDlg .qxpd-f{border-color:#1e293b}",
      "html[data-theme='dark'] #qxPrintDlg .qxpd-x{background:#1e293b;color:#e2e8f0}",
      "html[data-theme='dark'] #qxPrintDlg .qxpd-opt,html[data-theme='dark'] #qxPrintDlg details{border-color:#334155}",
      "html[data-theme='dark'] #qxPrintDlg .qxpd-opt.on{background:#172554;border-color:#3b82f6}",
      "html[data-theme='dark'] #qxPrintDlg .qxpd-opt small,html[data-theme='dark'] #qxPrintDlg .qxpd-lab,html[data-theme='dark'] #qxPrintDlg .qxpd-note{color:#94a3b8}",
      "html[data-theme='dark'] #qxPrintDlg .qxpd-seg{border-color:#334155}",
      "html[data-theme='dark'] #qxPrintDlg .qxpd-seg button{background:#1e293b;color:#cbd5e1}",
      "html[data-theme='dark'] #qxPrintDlg .qxpd-seg button.on{background:#2563eb;color:#fff}",
      "html[data-theme='dark'] #qxPrintDlg .qxpd-it{border-color:#1e293b}",
      "html[data-theme='dark'] #qxPrintDlg .qxpd-it .t{color:#cbd5e1}",
      "html[data-theme='dark'] #qxPrintDlg .qxpd-filters select,html[data-theme='dark'] #qxPrintDlg .qxpd-filters button,html[data-theme='dark'] #qxPrintDlg .qxpd-f button{background:#1e293b;color:#e2e8f0;border-color:#334155}",
      "html[data-theme='dark'] #qxPrintDlg .qxpd-f .go{background:#2563eb;border-color:#2563eb;color:#fff}",
      "html[data-theme='dark'] #qxPrintDlg .qxpd-preset button{background:#450a0a;border-color:#7f1d1d;color:#fecaca}",
      "html[data-theme='dark'] #qxPrintDlg .qxpd-preset button.alt{background:#172554;border-color:#1e3a8a;color:#bfdbfe}",
      /* print view (screen preview) - always light */
      "#qxPrintView{position:fixed;inset:0;z-index:2147483646;background:#e2e8f0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;color:#0f172a;color-scheme:light}",
      "#qxPrintView .qxp-bar{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:8px;padding:8px 10px;padding-top:max(8px,env(safe-area-inset-top,0px));background:#0f172a;color:#fff;font:600 14px Inter,system-ui,sans-serif}",
      "#qxPrintView .qxp-bar .ttl{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      "#qxPrintView .qxp-bar button{min-height:40px;border-radius:10px;border:1px solid #334155;background:#1e293b;color:#fff;font-weight:800;font-size:14px;padding:0 12px;cursor:pointer}",
      "#qxPrintView .qxp-bar button.go{background:#2563eb;border-color:#2563eb}",
      "#qxPrintView .qxp-doc{background:#fff;color:#0f172a;max-width:210mm;margin:12px auto 40px;padding:12mm 12mm 16mm;box-sizing:border-box;position:relative;box-shadow:0 2px 14px rgba(15,23,42,.18);font-family:'Times New Roman',Georgia,serif}",
      "@media (max-width:600px){#qxPrintView .qxp-doc{margin:0;padding:14px 12px 28px;box-shadow:none}}",
      "#qxPrintView .qxp-wm{position:fixed;left:0;right:0;top:46%;text-align:center;font:800 64px Inter,system-ui,sans-serif;color:rgba(15,23,42,.05);transform:rotate(-28deg);pointer-events:none;z-index:1;white-space:nowrap}",
      "@media (max-width:600px){#qxPrintView .qxp-wm{font-size:40px}}",
      "#qxPrintView .qxp-head{display:flex;align-items:center;gap:12px;border-bottom:2px solid #1d4ed8;padding:0 0 8px;margin:0 0 8px;font-family:Inter,system-ui,sans-serif}",
      "#qxPrintView .qxp-head img{width:44px;height:44px;object-fit:contain;flex:0 0 auto}",
      "#qxPrintView .qxp-head .bn{flex:1;min-width:0}",
      "#qxPrintView .qxp-head .bn b{display:block;font-size:19px;white-space:nowrap;font-weight:900;color:#0f172a;letter-spacing:.01em}",
      "#qxPrintView .qxp-head .bn i{display:block;font-size:12px;color:#475569;font-style:italic}",
      "#qxPrintView .qxp-head .ct{text-align:right;font-size:11px;color:#334155;line-height:1.5}",
      "#qxPrintView .qxp-title{font-family:Inter,system-ui,sans-serif;margin:0 0 10px}",
      "#qxPrintView .qxp-title h1{font-size:16px;margin:0 0 2px;color:#0f172a}",
      "#qxPrintView .qxp-title div{font-size:11.5px;color:#475569}",
      "#qxPrintView .qxp-qs{position:relative;z-index:2}",
      "#qxPrintView .qxp-q{padding:8px 0 10px;border-bottom:1px solid #e2e8f0;width:100%;box-sizing:border-box}",
      /* a question (number, stem, options, my answer) never splits; a long solution may continue on the next page */
      "#qxPrintView .qxp-q.nosol,#qxPrintView .qxp-qpart{break-inside:avoid;page-break-inside:avoid}",
      "#qxPrintView .qxp-ans,#qxPrintView .qxp-solh{break-after:avoid;page-break-after:avoid}",
      "#qxPrintView .qxp-sol p,#qxPrintView .qxp-sol .katex-display{break-inside:avoid}",
      "#qxPrintView .katex:not(.katex-display>.katex){white-space:normal;max-width:100%}",
      "#qxPrintView .katex:not(.katex-display>.katex)>.katex-html{display:inline;white-space:normal}",
      "@media screen{#qxPrintView .qxp-stem,#qxPrintView .qxp-sol,#qxPrintView .qxp-opts li .qx-content{overflow-x:auto;overflow-y:hidden;max-width:100%}}",
      "#qxPrintView .qxp-qh{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:0 0 4px;font-family:Inter,system-ui,sans-serif}",
      "#qxPrintView .qxp-no{font-weight:900;font-size:13px;color:#fff;background:#1d4ed8;border-radius:6px;padding:1px 7px}",
      "#qxPrintView .qxp-chip{font-size:10.5px;font-weight:700;color:#1e3a8a;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;padding:1px 8px}",
      "#qxPrintView .qxp-chip.st-correct{color:#166534;background:#f0fdf4;border-color:#bbf7d0}",
      "#qxPrintView .qxp-chip.st-wrong,#qxPrintView .qxp-chip.st-partial{color:#991b1b;background:#fef2f2;border-color:#fecaca}",
      "#qxPrintView .qxp-chip.st-skipped{color:#475569;background:#f8fafc;border-color:#e2e8f0}",
      "#qxPrintView .qxp-stem{font-size:17px;line-height:1.55;overflow-wrap:anywhere}",
      "#qxPrintView .qxp-opts{list-style:none;margin:6px 0 0;padding:0;display:grid;grid-template-columns:1fr;gap:3px 14px}",
      "#qxPrintView .qxp-opts.short{grid-template-columns:1fr 1fr}",
      "#qxPrintView .qxp-opts li{display:flex;gap:6px;font-size:16px;line-height:1.5;break-inside:avoid}",
      "#qxPrintView .qxp-opts li .ol{font-weight:800;flex:0 0 auto;font-family:Inter,system-ui,sans-serif;font-size:.9em}",
      "#qxPrintView .qxp-opts li.ok .ol{color:#15803d}",
      "#qxPrintView .qxp-numans{font-size:14px;color:#334155;margin:6px 0 0;font-family:Inter,system-ui,sans-serif}",
      "#qxPrintView .qxp-mine{font:600 12.5px Inter,system-ui,sans-serif;margin:6px 0 0;color:#334155}",
      "#qxPrintView .qxp-mine .bad{color:#b91c1c}#qxPrintView .qxp-mine .good{color:#15803d}",
      "#qxPrintView .qxp-ans{font:800 13px Inter,system-ui,sans-serif;color:#15803d;margin:6px 0 2px}",
      "#qxPrintView .qxp-ans.na{color:#92400e}",
      "#qxPrintView .qxp-sol{margin:4px 0 0;padding:6px 10px;border-left:3px solid #93c5fd;background:#f8fafc;font-size:15.5px;line-height:1.6;overflow-wrap:anywhere}",
      "#qxPrintView .qxp-solh{font:800 11px Inter,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#1d4ed8;margin:0 0 2px}",
      "#qxPrintView .qxp-key{margin-top:14px;font-family:Inter,system-ui,sans-serif}",
      "#qxPrintView .qxp-key.newpage{break-before:page;page-break-before:always}",
      "#qxPrintView .qxp-key h2{font-size:15px;margin:0 0 8px;border-bottom:2px solid #1d4ed8;padding-bottom:4px}",
      "#qxPrintView .qxp-keygrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:4px 8px;font-size:12.5px}",
      "#qxPrintView .qxp-keygrid span{border:1px solid #e2e8f0;border-radius:6px;padding:3px 6px;break-inside:avoid}",
      "#qxPrintView .qxp-keygrid .na{color:#92400e;font-size:11px}",
      "#qxPrintView .qxp-endnote{font:11px Inter,system-ui,sans-serif;color:#64748b;margin:10px 0 0}",
      "#qxPrintView .katex{font-size:1.06em}",
      "#qxPrintView .katex-display{overflow-x:auto;overflow-y:hidden;max-width:100%;margin:.4em 0}",
      "#qxPrintView img{max-width:100%;height:auto}",
      "#qxPrintView table{border-collapse:collapse;max-width:100%}",
      "#qxPrintView td,#qxPrintView th{border:1px solid #cbd5e1;padding:2px 6px}",
      "#qxPrintView .qxp-font-large .qxp-stem{font-size:20px}#qxPrintView .qxp-font-large .qxp-opts li{font-size:19px}#qxPrintView .qxp-font-large .qxp-sol{font-size:18px}",
      /* force light colours inside the print view even when the app is dark */
      "html body #qxPrintView#qxPrintView .qxp-doc :where(.qxp-stem,.qxp-opts,.qxp-sol,.qxp-sol *,.qxp-stem *,.qxp-opts *):not(.ol){color:#0f172a !important;-webkit-text-fill-color:#0f172a !important}",
      "html body #qxPrintView#qxPrintView .qxp-doc :where(.qxp-stem *,.qxp-sol *,.qxp-opts *){background-color:transparent !important;border-color:#cbd5e1}",
      "@media (min-width:760px){#qxPrintView .qxp-cols-2 .qxp-qs{column-count:2;column-gap:8mm;column-rule:1px solid #e2e8f0}#qxPrintView .qxp-cols-2 .qxp-q{display:inline-block}}",
      /* print */
      "@media print{",
      "html.qxp-printing,html.qxp-printing body{background:#fff !important;overflow:visible !important;height:auto !important;min-height:0 !important;position:static !important;width:auto !important}",
      "html.qxp-printing body>*:not(#qxPrintView){display:none !important}",
      "html.qxp-printing #qxPrintView{position:static !important;inset:auto !important;overflow:visible !important;background:#fff !important;height:auto !important;z-index:auto !important}",
      "html.qxp-printing #qxPrintView .qxp-bar{display:none !important}",
      "html.qxp-printing #qxPrintView .qxp-doc{max-width:none;margin:0;padding:0;box-shadow:none}",
      "html.qxp-printing #qxPrintView .qxp-wm{font-size:72pt;top:42%}",
      "html.qxp-printing #qxPrintView .qxp-stem{font-size:11.5pt}html.qxp-printing #qxPrintView .qxp-opts li{font-size:11pt}html.qxp-printing #qxPrintView .qxp-sol{font-size:10.5pt}",
      "html.qxp-printing #qxPrintView .qxp-font-large .qxp-stem{font-size:13.5pt}html.qxp-printing #qxPrintView .qxp-font-large .qxp-opts li{font-size:13pt}html.qxp-printing #qxPrintView .qxp-font-large .qxp-sol{font-size:12.5pt}",
      "html.qxp-printing #qxPrintView .qxp-cols-2 .qxp-qs{column-count:2;column-gap:8mm;column-rule:1px solid #e2e8f0}html.qxp-printing #qxPrintView .qxp-cols-2 .qxp-q{display:inline-block}",
      "html.qxp-printing #qxPrintView *{-webkit-print-color-adjust:exact;print-color-adjust:exact}",
      "}"
    ].join("\n");
    var st = document.createElement("style");
    st.id = "qxPrintCss";
    st.textContent = css;
    document.head.appendChild(st);
  }
  function pageCss(o) {
    var mb = [];
    if (o.header) mb.push("@bottom-left{content:'Quantrex Academy \\00b7  www.quantrexacademy.com';font:8pt Inter,system-ui,sans-serif;color:#64748b}");
    if (o.pages) mb.push("@bottom-right{content:'Page ' counter(page) ' of ' counter(pages);font:8pt Inter,system-ui,sans-serif;color:#64748b}");
    return "@media print{@page{size:A4;margin:12mm 11mm 14mm 11mm;" + mb.join("") + "}}";
  }

  /* ---------- dialog ---------- */
  function closeDlg() { var d = document.getElementById("qxPrintDlg"); if (d) d.remove(); }
  function scopeAvail(sc, ctx, c) {
    if (sc.need === "attempt") return ctx.hasAttempt && c[sc.id] > 0;
    if (sc.need === "bm") return c.bm > 0;
    return true;
  }
  function renderDlg() {
    var o = ST, ctx = o.ctx, c = counts(ctx);
    var chs = distinct(ctx, "chapter"), dfs = distinct(ctx, "difficulty");
    var h = [];
    h.push('<div class="qxpd" role="dialog" aria-modal="true" aria-label="Print">');
    h.push('<div class="qxpd-h"><h3>Print / Save as PDF</h3><button type="button" class="qxpd-x" data-a="close" aria-label="Close">&#10005;</button></div>');
    h.push('<div class="qxpd-b">');
    h.push('<div class="qxpd-sec"><div class="qxpd-preset">');
    if (ctx.hasAttempt && c.wrong > 0) h.push('<button type="button" data-a="mistakes">Print my mistakes (' + c.wrong + ')</button>');
    if (ctx.phase !== "test") h.push('<button type="button" class="alt" data-a="fullkey">Full paper + answer key</button>');
    else h.push('<button type="button" class="alt" data-a="paperonly">Print question paper</button>');
    h.push("</div></div>");
    h.push('<div class="qxpd-sec"><div class="qxpd-lab">Content</div>');
    var lockKey = ctx.phase === "test"; /* running test: answers/solutions stay hidden until submit */
    CONTENT.forEach(function (x) {
      var dis = lockKey && x.id !== "paper";
      h.push('<label class="qxpd-opt' + (o.content === x.id ? " on" : "") + (dis ? " dis" : "") + '"><input type="radio" name="qxpdC" value="' + x.id + '"' + (o.content === x.id ? " checked" : "") + (dis ? " disabled" : "") + '><span><b>' + x.label + "</b><small>" + x.sub + "</small></span></label>");
    });
    if (lockKey) h.push('<div class="qxpd-note">Answer key and solutions unlock after you submit the test.</div>');
    h.push("</div>");
    h.push('<div class="qxpd-sec"><div class="qxpd-lab">Questions</div><div class="qxpd-grid">');
    SCOPES.forEach(function (x) {
      var ok = scopeAvail(x, ctx, c);
      h.push('<label class="qxpd-opt' + (o.scope === x.id ? " on" : "") + (ok ? "" : " dis") + '"><input type="radio" name="qxpdS" value="' + x.id + '"' + (o.scope === x.id ? " checked" : "") + (ok ? "" : " disabled") + '><span><b>' + x.label + "</b><small>" + c[x.id] + " Qs</small></span></label>");
    });
    h.push("</div>");
    if (!ctx.hasAttempt) h.push('<div class="qxpd-note">Wrong / Unattempted unlock after you check answers or submit.</div>');
    h.push("</div>");
    /* selector */
    h.push('<div class="qxpd-sec"><details' + (o.openList ? " open" : "") + ' data-a="list"><summary>Choose questions <span style="color:#2563eb">(' + o.sel.size + " of " + ctx.items.length + " selected)</span></summary>");
    h.push('<div class="qxpd-filters">');
    if (chs.length > 1) h.push('<select data-f="ch" aria-label="Chapter"><option value="">All chapters</option>' + chs.map(function (v) { return '<option value="' + esc(v) + '"' + (o.filt.ch === v ? " selected" : "") + ">" + esc(v) + "</option>"; }).join("") + "</select>");
    if (dfs.length > 1) h.push('<select data-f="diff" aria-label="Difficulty"><option value="">All levels</option>' + dfs.map(function (v) { return '<option value="' + esc(v) + '"' + (o.filt.diff === v ? " selected" : "") + ">" + esc(v) + "</option>"; }).join("") + "</select>");
    h.push('<button type="button" data-a="selall">Select all</button><button type="button" data-a="selnone">Clear</button></div>');
    if (o.openList) {
      h.push('<div class="qxpd-list">');
      ctx.items.forEach(function (it, i) {
        if (!matchFilt(it, o.filt)) return;
        var q = it.q, t = q ? plain(q.q || q.question || "").slice(0, 110) : "(question not loaded)";
        var stl = it.status === "correct" ? "Correct" : (it.status === "wrong" ? "Wrong" : (it.status === "partial" ? "Partial" : (it.status === "skipped" && ctx.hasAttempt ? "Skipped" : "")));
        h.push('<label class="qxpd-it"><input type="checkbox" data-i="' + i + '"' + (o.sel.has(i) ? " checked" : "") + "><b>Q" + it.n + '</b><span class="t">' + esc(t) + "</span>" + (stl ? '<span class="qxpd-st ' + it.status + '">' + stl + "</span>" : "") + (it.bm ? " &#9733;" : "") + "</label>");
      });
      h.push("</div>");
    }
    h.push("</details></div>");
    /* extras */
    h.push('<div class="qxpd-sec"><div class="qxpd-lab">Layout</div>');
    h.push('<label class="qxpd-row"><span>Show my answer vs correct</span><input type="checkbox" class="qxpd-tg" data-x="mine"' + (o.mine && ctx.hasAttempt ? " checked" : "") + (ctx.hasAttempt ? "" : " disabled") + "></label>");
    h.push('<div class="qxpd-row"><span>Columns</span><span class="qxpd-seg"><button type="button" data-cols="1" class="' + (o.cols === 1 ? "on" : "") + '">1</button><button type="button" data-cols="2" class="' + (o.cols === 2 ? "on" : "") + '">2</button></span></div>');
    h.push('<div class="qxpd-row"><span>Font size</span><span class="qxpd-seg"><button type="button" data-font="normal" class="' + (o.font === "normal" ? "on" : "") + '">Normal</button><button type="button" data-font="large" class="' + (o.font === "large" ? "on" : "") + '">Large</button></span></div>');
    h.push('<label class="qxpd-row"><span>Quantrex header</span><input type="checkbox" class="qxpd-tg" data-x="header"' + (o.header ? " checked" : "") + "></label>");
    h.push('<label class="qxpd-row"><span>Page numbers</span><input type="checkbox" class="qxpd-tg" data-x="pages"' + (o.pages ? " checked" : "") + "></label>");
    h.push('<label class="qxpd-row"><span>Light watermark</span><input type="checkbox" class="qxpd-tg" data-x="wm"' + (o.wm ? " checked" : "") + "></label>");
    h.push("</div>");
    h.push('<div class="qxpd-note">Tip: on Android choose <b>Save as PDF</b> in the print screen to keep a copy.</div>');
    h.push("</div>");
    h.push('<div class="qxpd-f"><button type="button" data-a="close">Cancel</button><button type="button" class="go" data-a="go"' + (o.sel.size ? "" : " disabled") + ">Preview &amp; Print (" + o.sel.size + ")</button></div>");
    h.push("</div>");
    var d = document.getElementById("qxPrintDlg");
    var keepScroll = 0;
    if (!d) {
      d = document.createElement("div");
      d.id = "qxPrintDlg";
      document.body.appendChild(d);
      bindDlg(d);
    } else {
      var b0 = d.querySelector(".qxpd-b"); keepScroll = b0 ? b0.scrollTop : 0;
    }
    d.innerHTML = h.join("");
    var b1 = d.querySelector(".qxpd-b"); if (b1 && keepScroll) b1.scrollTop = keepScroll;
  }
  function bindDlg(d) {
    d.addEventListener("click", function (e) {
      if (e.target === d) { closeDlg(); return; }
      var a = e.target.closest("[data-a]");
      var o = ST;
      if (!o) return;
      if (a && a.tagName !== "DETAILS") {
        var act = a.getAttribute("data-a");
        if (act === "close") { e.preventDefault(); closeDlg(); return; }
        if (act === "mistakes") { e.preventDefault(); o.scope = "wrong"; o.content = "paper_sol"; o.mine = true; o.filt = { ch: "", diff: "" }; applyScope(o); go(); return; }
        if (act === "paperonly") { e.preventDefault(); o.scope = "all"; o.content = "paper"; o.filt = { ch: "", diff: "" }; applyScope(o); go(); return; }
        if (act === "fullkey") { e.preventDefault(); o.scope = "all"; o.content = "paper_key"; o.filt = { ch: "", diff: "" }; applyScope(o); go(); return; }
        if (act === "selall") { e.preventDefault(); o.ctx.items.forEach(function (it, i) { if (matchFilt(it, o.filt)) o.sel.add(i); }); o.openList = true; renderDlg(); return; }
        if (act === "selnone") { e.preventDefault(); o.ctx.items.forEach(function (it, i) { if (matchFilt(it, o.filt)) o.sel.delete(i); }); o.openList = true; renderDlg(); return; }
        if (act === "go") { e.preventDefault(); go(); return; }
      }
      var cb = e.target.closest("[data-cols]");
      if (cb) { o.cols = +cb.getAttribute("data-cols"); renderDlg(); return; }
      var fb = e.target.closest("[data-font]");
      if (fb) { o.font = fb.getAttribute("data-font"); renderDlg(); return; }
    });
    d.addEventListener("toggle", function (e) {
      if (e.target && e.target.tagName === "DETAILS" && ST) { var was = !!ST.openList; ST.openList = e.target.open; if (was !== ST.openList) renderDlg(); }
    }, true);
    d.addEventListener("change", function (e) {
      var o = ST, t = e.target;
      if (!o || !t) return;
      if (t.name === "qxpdC") { o.content = t.value; renderDlg(); return; }
      if (t.name === "qxpdS") { o.scope = t.value; applyScope(o); renderDlg(); return; }
      if (t.hasAttribute("data-i")) { var i = +t.getAttribute("data-i"); if (t.checked) o.sel.add(i); else o.sel.delete(i); renderDlg(); return; }
      if (t.hasAttribute("data-f")) { o.filt[t.getAttribute("data-f")] = t.value; applyScope(o); o.openList = true; renderDlg(); return; }
      if (t.hasAttribute("data-x")) { o[t.getAttribute("data-x")] = !!t.checked; return; }
    });
  }

  /* ---------- print view ---------- */
  function contentLabel(id) { for (var i = 0; i < CONTENT.length; i++) if (CONTENT[i].id === id) return CONTENT[i].label; return ""; }
  function scopeLabel(id) { for (var i = 0; i < SCOPES.length; i++) if (SCOPES[i].id === id) return SCOPES[i].label; return ""; }
  function qBlock(it, o, showQ, showSol) {
    var q = it.q;
    var h = ['<article class="qxp-q' + (showSol ? "" : " nosol") + '" data-n="' + it.n + '" data-qid="' + esc(String(it.id)) + '"><div class="qxp-qpart">'];
    var chip = q ? sourceChip(q) : "";
    var stl = o.mine && o.ctx.hasAttempt ? ({ correct: "Correct", wrong: "Wrong", partial: "Partially correct", skipped: "Not attempted" })[it.status] : "";
    h.push('<div class="qxp-qh"><span class="qxp-no">Q' + it.n + "</span>" + (chip ? '<span class="qxp-chip">' + esc(chip) + "</span>" : "") + (stl ? '<span class="qxp-chip st-' + it.status + '">' + stl + "</span>" : "") + "</div>");
    if (!q) { h.push('<div class="qxp-stem"><em>This question could not be loaded. Open it once while online and print again.</em></div></div></article>'); return h.join(""); }
    var ca = correctAnswer(q);
    if (showQ) {
      h.push('<div class="qxp-stem qx-content">' + stemHtml(q) + "</div>");
      var op = opts(q), t = qType(q);
      if (op.length && !isNumType(t)) {
        var short = op.every(function (x) { return plain(x).length <= 28 && !/<img/i.test(String(x)); });
        var okSet = {};
        if (showSol && ca.ok) String(ca.short).split(/,\s*/).forEach(function (l) { okSet[l] = 1; });
        h.push('<ol class="qxp-opts' + (short && o.cols === 1 ? " short" : "") + '">' + op.map(function (x, i) {
          return '<li class="' + (okSet[letter(i)] ? "ok" : "") + '"><span class="ol">(' + letter(i) + ')</span><span class="qx-content">' + paint(x) + "</span></li>";
        }).join("") + "</ol>");
      } else {
        h.push('<div class="qxp-numans">Answer: ____________</div>');
      }
    }
    if (o.mine && o.ctx.hasAttempt) {
      var mine = chosenText(q, it.chosen);
      var good = it.status === "correct";
      h.push('<div class="qxp-mine">Your answer: <span class="' + (good ? "good" : "bad") + '">' + (mine || "Not attempted") + "</span> &nbsp;&middot;&nbsp; Correct: " + (ca.ok ? '<span class="good">' + ca.text + "</span>" : "not available") + "</div>");
    }
    h.push("</div>");
    if (showSol) {
      h.push(ca.ok ? '<div class="qxp-ans">Answer: ' + ca.text + "</div>" : '<div class="qxp-ans na">Answer: not available</div>');
      var sol = solutionHtml(q);
      h.push('<div class="qxp-sol"><div class="qxp-solh">Solution</div>' + (sol ? '<div class="qx-content">' + sol + "</div>" : "<em>Solution not available.</em>") + "</div>");
    }
    h.push("</article>");
    return h.join("");
  }
  function keyBlock(items, newpage) {
    return '<section class="qxp-key' + (newpage ? " newpage" : "") + '"><h2>Answer Key</h2><div class="qxp-keygrid">' + items.map(function (it) {
      var ca = it.q ? correctAnswer(it.q) : { ok: false };
      return "<span><b>" + it.n + ".</b> " + (ca.ok ? ca.text : '<span class="na">not available</span>') + "</span>";
    }).join("") + "</div></section>";
  }
  function closeView() {
    var v = document.getElementById("qxPrintView"); if (v) v.remove();
    var p = document.getElementById("qxPrintPageCss"); if (p) p.remove();
    document.documentElement.classList.remove("qxp-printing");
    restoreInline();
  }
  var _saved = null;
  function forceInline() {
    if (_saved) return;
    _saved = { h: document.documentElement.getAttribute("style"), b: document.body.getAttribute("style") };
  }
  function restoreInline() {
    if (!_saved) return;
    try {
      if (_saved.h == null) document.documentElement.removeAttribute("style"); else document.documentElement.setAttribute("style", _saved.h);
      if (_saved.b == null) document.body.removeAttribute("style"); else document.body.setAttribute("style", _saved.b);
    } catch (_) {}
    _saved = null;
  }
  function printNow() {
    var html = document.documentElement, body = document.body;
    forceInline();
    ["overflow", "height", "position", "min-height"].forEach(function (p) {
      html.style.setProperty(p, p === "overflow" ? "visible" : (p === "position" ? "static" : "auto"), "important");
      body.style.setProperty(p, p === "overflow" ? "visible" : (p === "position" ? "static" : "auto"), "important");
    });
    html.classList.add("qxp-printing");
    var done = function () { restoreInline(); };
    window.addEventListener("afterprint", function once() { window.removeEventListener("afterprint", once); setTimeout(done, 50); });
    try { window.print(); } catch (_) { toast("Printing is not supported here. Use the browser menu > Share > Print."); }
  }
  function waitImages(root, ms) {
    var imgs = [].slice.call(root.querySelectorAll("img"));
    imgs.forEach(function (im) { try { im.loading = "eager"; } catch (_) {} });
    return Promise.race([
      Promise.all(imgs.map(function (im) { return im.complete ? 1 : new Promise(function (r) { im.addEventListener("load", r, { once: true }); im.addEventListener("error", r, { once: true }); }); })),
      new Promise(function (r) { setTimeout(r, ms); })
    ]);
  }
  /* Same content restore / hydrate the player does before painting a question (test-engine refresh):
     qxRestoreQuestionContent (local, free) for all; network fill only for questions whose text/options are
     still incomplete, capped so a big print never fires hundreds of reads. */
  function needsFill(q) {
    if (!q) return false;
    if (/^Loading question/i.test(String(q.q || ""))) return true;
    try { if (typeof MarksLive !== "undefined" && MarksLive.isQuestionIncomplete && MarksLive.isQuestionIncomplete(q)) return true; } catch (_) {}
    var t = qType(q);
    if (!isNumType(t)) {
      var op = opts(q);
      if (!op.length) return !!q._marksId;
      try { if (typeof MarksLive !== "undefined" && MarksLive.isPlaceholderOptions && MarksLive.isPlaceholderOptions(q.options)) return true; } catch (_) {}
    }
    return false;
  }
  /* A stem whose rendered text still shows raw TeX (e.g. "\\left\\{$$\\begin{cases}") is a stale list copy:
     the player fixes it on visit by reading the bank record, so print does the same, only for those. */
  function leaky(q) {
    try {
      var src = String(q.q || "");
      if (!/\\[a-zA-Z]|\$/.test(src)) return false;
      if (typeof MathTextRenderer !== "undefined" && MathTextRenderer.pickStemSource) src = MathTextRenderer.pickStemSource(q, src);
      var html = typeof MathTextRenderer !== "undefined" && MathTextRenderer.render ? MathTextRenderer.render(src) : src;
      var d = document.createElement("div"); d.innerHTML = html;
      var w = document.createTreeWalker(d, NodeFilter.SHOW_TEXT), n;
      while ((n = w.nextNode())) {
        var pe = n.parentElement;
        if (pe && pe.closest && pe.closest(".katex,.MathJax,mjx-container,script,style")) continue;
        if (/\\(frac|sqrt|left|right|begin|end|alpha|beta|theta|times|mathrm|text|cdot|le|ge)\b|\$\$/.test(n.textContent)) return true;
      }
    } catch (_) {}
    return false;
  }
  function refetch(q) {
    var id = q._marksId || q.id;
    if (q._qxpRefetched) return Promise.resolve();
    q._qxpRefetched = 1;
    if (id == null || typeof QxFirebaseBank === "undefined" || !QxFirebaseBank.getQuestion || typeof QuantrexCatalog === "undefined" || !QuantrexCatalog.applyCatalogRec) return Promise.resolve();
    return Promise.resolve().then(function () { return QxFirebaseBank.getQuestion(id); }).then(function (fb) {
      if (!fb) return;
      var old = q.q;
      if (fb.q) q.q = "";
      try { QuantrexCatalog.applyCatalogRec(q, fb); } catch (_) {}
      if (!q.q) q.q = old;
    });
  }
  function prepare(items, onProg) {
    items.forEach(function (it) {
      if (!it.q) it.q = gq(it.id);
      if (it.q && typeof qxRestoreQuestionContent === "function") { try { qxRestoreQuestionContent(it.q); } catch (_) {} }
    });
    var hasCat = typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion;
    var need = [];
    items.forEach(function (it) {
      if (!it.q || need.length >= 150) return;
      if (hasCat && needsFill(it.q)) need.push({ it: it, mode: "fill" });
      else if (!it.q._qxpRefetched && need.filter(function (j) { return j.mode === "refetch"; }).length < 12 && leaky(it.q)) need.push({ it: it, mode: "refetch" });
    });
    if (!need.length) return Promise.resolve();
    var deadline = Date.now() + 45000, k = 0, done = 0;
    function worker() {
      if (k >= need.length || Date.now() > deadline) return Promise.resolve();
      var job = need[k++], q = job.it.q;
      var p = job.mode === "fill"
        ? Promise.resolve().then(function () { return QuantrexCatalog.fillQuestion(q); }).then(function () { if (leaky(q)) return refetch(q); })
        : refetch(q);
      return Promise.race([p, new Promise(function (r) { setTimeout(r, 8000); })])
        .catch(function () {}).then(function () { done++; if (onProg) onProg(done, need.length); try { if (typeof qxRestoreQuestionContent === "function") qxRestoreQuestionContent(q); } catch (_) {} return worker(); });
    }
    return Promise.all([worker(), worker(), worker(), worker(), worker(), worker()]);
  }
  function go() {
    var o = ST;
    if (!o || !o.sel.size) return;
    closeDlg();
    var items = o.ctx.items.filter(function (it, i) { return o.sel.has(i); });
    ensureCss();
    var wait = document.createElement("div");
    wait.id = "qxPrintView";
    wait.innerHTML = '<div class="qxp-bar"><button type="button" data-a="back">&#8592; Back</button><span class="ttl">Preparing questions...</span></div>';
    closeView();
    document.body.appendChild(wait);
    wait.addEventListener("click", function (e) { if (e.target.closest("[data-a=back]")) { wait.remove(); } });
    prepare(items, function (d, n) { var t = wait.querySelector(".ttl"); if (t) t.textContent = "Preparing questions... " + d + "/" + n; }).then(function () {
      if (!document.body.contains(wait)) return;
      wait.remove();
      build(o, items);
    });
  }
  function build(o, items) {
    var showQ = o.content !== "key";
    var showSol = o.content === "paper_sol" || o.content === "paper_key_sol";
    var showKey = o.content === "paper_key" || o.content === "paper_key_sol" || o.content === "key";
    ensureCss();
    closeView();
    var pc = document.createElement("style"); pc.id = "qxPrintPageCss"; pc.textContent = pageCss(o); document.head.appendChild(pc);
    var v = document.createElement("div");
    v.id = "qxPrintView";
    v.setAttribute("data-theme", "light");
    var date = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    var meta = contentLabel(o.content) + " \u00b7 " + items.length + " question" + (items.length === 1 ? "" : "s") + (o.scope !== "all" ? " \u00b7 " + scopeLabel(o.scope) : "") + " \u00b7 " + date;
    var head = o.header ? '<header class="qxp-head"><img src="' + BRAND.logo + '" alt=""><div class="bn"><b>' + BRAND.name + "</b><i>" + BRAND.tag + '</i></div><div class="ct">' + BRAND.site + "<br>WhatsApp " + BRAND.wa + "</div></header>" : "";
    v.innerHTML = '<div class="qxp-bar"><button type="button" data-a="back">&#8592; Back</button><span class="ttl">' + esc(o.ctx.title) + '</span><button type="button" class="go" data-a="print">Print / PDF</button></div>' +
      (o.wm ? '<div class="qxp-wm" aria-hidden="true">Quantrex Academy</div>' : "") +
      '<div class="qxp-doc qxp-cols-' + o.cols + " qxp-font-" + o.font + '">' + head +
      '<div class="qxp-title"><h1>' + esc(o.ctx.title) + "</h1><div>" + esc(meta) + "</div></div>" +
      '<section class="qxp-qs"></section><div class="qxp-tail"></div></div>';
    document.body.appendChild(v);
    v.addEventListener("click", function (e) {
      var a = e.target.closest("[data-a]"); if (!a) return;
      if (a.getAttribute("data-a") === "back") { closeView(); }
      if (a.getAttribute("data-a") === "print") { printNow(); }
    });
    var qs = v.querySelector(".qxp-qs"), tail = v.querySelector(".qxp-tail");
    var i = 0, CH = 8;
    var missing = items.filter(function (it) { return !it.q; }).length;
    function step() {
      if (!document.getElementById("qxPrintView")) return;
      if (showQ || showSol) {
        var buf = [];
        for (var k = 0; k < CH && i < items.length; k++, i++) buf.push(qBlock(items[i], o, showQ, showSol));
        var tmp = document.createElement("div"); tmp.innerHTML = buf.join("");
        var nodes = [].slice.call(tmp.children);
        nodes.forEach(function (n) { qs.appendChild(n); fixFigures(n); });
        if (i < items.length) { setTimeout(step, 0); return; }
      }
      if (showKey) tail.innerHTML = keyBlock(items, showQ);
      var note = [];
      if (missing) note.push(missing + " question(s) could not be loaded and are marked in the paper.");
      if (note.length) tail.insertAdjacentHTML("beforeend", '<p class="qxp-endnote">' + esc(note.join(" ")) + "</p>");
      var docEl = v.querySelector(".qxp-doc");
      try { if (typeof Mx !== "undefined" && Mx.afterRender) Mx.afterRender(docEl); else if (typeof Mx !== "undefined" && Mx.afterRenderLight) Mx.afterRenderLight(docEl); } catch (_) {}
      try { var f = QF(); if (f && f.healEntityLeak) f.healEntityLeak(docEl); } catch (_) {}
      v.setAttribute("data-ready", "1");
      waitImages(v, 8000).then(function () {
        v.setAttribute("data-images", "1");
        if (!QxPrint.noAutoPrint) setTimeout(printNow, 250);
      });
    }
    step();
  }
  function fixFigures(node) {
    try {
      node.querySelectorAll("img").forEach(function (im) {
        im.removeAttribute("loading");
        if (!im.getAttribute("onerror")) im.addEventListener("error", function () { im.style.display = "none"; }, { once: true });
      });
    } catch (_) {}
  }

  /* ---------- public ---------- */
  function openWith(ctx, preset) {
    if (!ctx || !ctx.items || !ctx.items.length) { toast("Nothing to print here yet"); return false; }
    ensureCss();
    ST = defaults(ctx, preset);
    if (preset === "mistakes" && ST.sel.size) { go(); return true; }
    renderDlg();
    return true;
  }
  function openAuto(preset) {
    var ctx = autoContext();
    if (!ctx) { toast("Open a test, practice set or result to print"); return false; }
    return openWith(ctx, preset);
  }
  async function openBookmarks() {
    var ids = [];
    try {
      if (typeof nbLoadBookmarkQuestions === "function") { var p = await nbLoadBookmarkQuestions(); ids = p.ids || []; }
      else if (typeof QuantrexBookmarks !== "undefined") ids = QuantrexBookmarks.getItems({ type: "question" }).map(function (x) { return x.id; });
    } catch (_) {}
    if (!ids.length) { toast("No bookmarked questions to print"); return false; }
    var ctx = itemsFromIds(ids, "My bookmarked questions");
    ctx.items.forEach(function (it) { it.bm = true; });
    return openWith(ctx);
  }
  async function loadIds(ids) {
    var miss = ids.filter(function (id) { var q = gq(id); return !q || !(q.q || q.question); });
    if (!miss.length) return;
    try {
      if (typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.questionsByIds) {
        for (var i = 0; i < miss.length; i += 24) {
          var data = await QuantrexCatalog.questionsByIds(miss.slice(i, i + 24));
          if (typeof nbApplyCatalogPack === "function") nbApplyCatalogPack(data);
        }
      }
    } catch (_) {}
  }
  async function openIds(ids, title, extra) {
    ids = (ids || []).filter(function (x) { return x != null && x !== ""; });
    if (!ids.length) { toast("No questions to print"); return false; }
    await loadIds(ids);
    var ctx = itemsFromIds(ids, title);
    if (extra && extra.snapshot && (extra.snapshot.grades || extra.snapshot.ids)) ctx = itemsFromSnapshot(extra.snapshot);
    return openWith(ctx);
  }
  var QxPrint = { open: openAuto, openWith: openWith, openIds: openIds, openBookmarks: openBookmarks, close: function () { closeDlg(); closeView(); }, noAutoPrint: false,
    _ctx: autoContext, _correct: correctAnswer, _state: function () { return ST; } };
  window.QxPrint = QxPrint;

  /* ---------- entry points ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("#egPrintBtn, #qzAnPrint, #mkSolPrint, [data-qx-print], #qzrrPrintBtn") : null;
    if (!t) return;
    e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    var preset = t.getAttribute("data-qx-print") === "mistakes" ? "mistakes" : "";
    if (t.id === "mkSolPrint") {
      var root = t.closest("[data-sol-filter]"); var f = root && root.getAttribute("data-sol-filter");
      if (f === "wrong" || f === "incorrect") preset = "mistakes";
    }
    /* close the settings sheet first (Settings > Tools > Print) */
    var vp = document.getElementById("pracViewPanel");
    if (vp && vp.contains(t)) { var cl = document.getElementById("pracViewClose"); try { if (cl) cl.click(); else vp.hidden = true; } catch (_) {} }
    var mo = document.getElementById("mtkQviewOverlay");
    if (mo && mo.contains(t)) { try { mo.remove(); } catch (_) {} }
    var pop = document.getElementById("egFmtPop");
    if (pop && pop.contains(t)) { try { var gear = document.getElementById("egFmtBtn"); if (gear) gear.click(); } catch (_) {} var p2 = document.getElementById("egFmtPop"); if (p2) { try { p2.remove(); } catch (_) {} } }
    setTimeout(function () { openAuto(preset); }, 30);
  }, true);

  function mkBtn(label, cls, preset) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = cls || "";
    b.setAttribute("data-qx-print", preset || "1");
    b.textContent = label;
    return b;
  }
  function inject() {
    /* Settings > Tools: one Print entry in every player (practice, test, CBT) */
    document.querySelectorAll("#egFmtPop .eg-vs-tools, #pracViewPanel .eg-vs-tools").forEach(function (row) {
      if (row.querySelector("[data-qx-print]")) return;
      row.appendChild(mkBtn("Print", "", "1"));
    });
    document.querySelectorAll("#mtkQviewOverlay .mtk-qview-panel").forEach(function (panel) {
      if (panel.querySelector("[data-qx-print]")) return;
      var sec = document.createElement("section");
      sec.className = "mtk-qview-sec";
      sec.innerHTML = "<h4>TOOLS</h4>";
      var b = mkBtn("Print / Save as PDF", "mtk-font-preset", "1");
      sec.appendChild(b);
      panel.appendChild(sec);
    });
    /* result / report card */
    document.querySelectorAll(".result-screen .result-actions").forEach(function (bar) {
      if (bar.querySelector("[data-qx-print]")) return;
      bar.appendChild(mkBtn("Print", "btn-soft", "1"));
      var snap = window._qxLastAttemptSnapshot;
      if (snap && snap.wrong > 0) bar.appendChild(mkBtn("Print my mistakes", "btn-soft", "mistakes"));
    });
    document.querySelectorAll("#qzAnPage").forEach(function (an) {
      if (an.querySelector("[data-qx-print='mistakes']")) return;
      var anchor = an.querySelector("#qzAnPrint");
      var snap = window._qxLastAttemptSnapshot;
      if (anchor && snap && snap.wrong > 0) {
        var b = mkBtn("Print my mistakes", anchor.className || "", "mistakes");
        anchor.parentNode.insertBefore(b, anchor.nextSibling);
      }
    });
    /* Create Own Test preview */
    document.querySelectorAll("#ctPreviewModal .marks-modal-body").forEach(function (body) {
      if (body.querySelector("[data-qx-ct-print]")) return;
      var att = body.querySelector("[onclick*='ctAttemptTest'],[onclick*='ctAssignTeacherTest']");
      var m = att && /ct(?:AttemptTest|AssignTeacherTest)\('([^']+)'\)/.exec(att.getAttribute("onclick") || "");
      if (!m) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "marks-preview-later qx-ct-print";
      b.setAttribute("data-qx-ct-print", m[1]);
      b.textContent = "Print questions";
      b.addEventListener("click", function (e) {
        e.preventDefault(); e.stopPropagation();
        var t = null;
        try { t = (ctLoadTests(true) || []).concat(ctLoadTests(false) || []).find(function (x) { return x.id === m[1]; }); } catch (_) {}
        if (!t) { toast("Test not found"); return; }
        try { ctClosePreview(); } catch (_) {}
        openIds(t.questionIds || [], t.title || "Custom test");
      });
      att.parentNode.insertBefore(b, att.nextSibling);
    });
  }
  /* bookmarks: replace the old raw popup print with the shared dialog */
  function hookBookmarks() {
    if (typeof window.nbPrintBookmarks === "function" && !window.nbPrintBookmarks.__qx311) {
      var f = function () { return openBookmarks(); };
      f.__qx311 = true;
      window.nbPrintBookmarks = f;
      try { nbPrintBookmarks = f; } catch (_) {}
    }
  }
  var queued = false, calls = 0, winStart = 0;
  function run() {
    queued = false;
    var now = Date.now();
    if (now - winStart > 1000) { winStart = now; calls = 0; }
    if (++calls > 30) return;
    try { inject(); } catch (_) {}
    hookBookmarks();
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(run); } }
  function start() {
    try { new MutationObserver(queue).observe(document.body, { childList: true, subtree: true }); } catch (_) {}
    queue();
  }
  window.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (document.getElementById("qxPrintDlg")) closeDlg(); } });
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
