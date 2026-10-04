/* Quantrex post-test Analysis (qxmd313). Real attempt data only: window._qxLastAnalysis rows
   (status, chosen answer, per-question dwell time from session.qTimes). Inline SVG charts, printable,
   rule-based Teacher's review. Nothing is uploaded; nothing is guessed. */
(function () {
  "use strict";
  if (window.QxAnalysis) return;
  var CSS_ID = "qxAnalysisCss";
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function QF() { return typeof QuantrexQFormat !== "undefined" ? QuantrexQFormat : null; }
  function opts(q) { return (q && Array.isArray(q.options)) ? q.options : []; }
  function letter(i) { return String.fromCharCode(65 + (Number(i) || 0)); }
  function isNum(q) {
    try { var f = QF(); if (f && f.getType) { var t = String(f.getType(q) || ""); if (/num|integer/i.test(t)) return true; } } catch (_) {}
    return !opts(q).length || /numer|integer/i.test(String((q && q.questionType) || ""));
  }
  function correctTxt(q) {
    if (!q) return "";
    var f = QF();
    try {
      if (isNum(q)) { var v = f && f.correctNumerical ? f.correctNumerical(q) : q.correctValue; v = String(v == null ? "" : v).replace(/<[^>]+>/g, "").trim(); return v; }
      var ci = (f && f.correctIndices ? f.correctIndices(q) : []) || [];
      var n = opts(q).length;
      ci = ci.filter(function (i) { return i >= 0 && i < n; });
      return ci.map(letter).join(", ");
    } catch (_) { return ""; }
  }
  function chosenTxt(q, c) {
    if (c == null || c === "" || (Array.isArray(c) && !c.length)) return "";
    if (isNum(q)) return String(c);
    if (Array.isArray(c)) return c.map(function (i) { return letter(+i); }).join(", ");
    if (typeof c === "number" || /^\d+$/.test(String(c))) return letter(+c);
    return String(c);
  }
  function fmt(s) {
    s = Math.max(0, Math.round(Number(s) || 0));
    if (s < 60) return s + "s";
    var m = Math.floor(s / 60), r = s % 60;
    if (m < 60) return m + "m " + (r < 10 ? "0" : "") + r + "s";
    return Math.floor(m / 60) + "h " + (m % 60) + "m";
  }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function scoringLabel() {
    var sc = null;
    try { sc = (window._qxLastAttemptSnapshot && window._qxLastAttemptSnapshot.scoring) || (window._qxReattemptConfig && window._qxReattemptConfig.opts && window._qxReattemptConfig.opts.scoring); } catch (_) {}
    if (!sc || sc.correct == null) return "";
    var w = Number(sc.wrong || 0);
    return "+" + sc.correct + " / " + (w < 0 ? "\u2212" + Math.abs(w) : "0");
  }

  function model(data) {
    var rows = (data && data.rows) || [];
    var items = rows.map(function (r, i) {
      var q = r.q || null;
      var st = r.isCorrect ? "correct" : (r.isSkip ? "skipped" : (r.isWrong ? "wrong" : "partial"));
      var diffRaw = String((q && q.difficulty) || "").trim().toLowerCase();
      var diff = /^e/.test(diffRaw) ? "Easy" : /^m/.test(diffRaw) ? "Medium" : (/^h|^d/.test(diffRaw) ? "Hard" : "");
      return {
        n: i + 1, idx: i, q: q, st: st,
        t: Math.max(0, Number(r.timeSec) || 0),
        sub: (q && q.subject) || "Other",
        ch: (q && (q.chapter || q.chapterTitle)) || "Chapter not tagged",
        diff: diff,
        mine: chosenTxt(q, r.chosen),
        key: correctTxt(q)
      };
    });
    var tsum = items.reduce(function (a, b) { return a + b.t; }, 0);
    var c = { correct: 0, wrong: 0, partial: 0, skipped: 0 };
    items.forEach(function (it) { c[it.st]++; });
    return { items: items, hasTime: tsum >= 1, tsum: tsum, c: c, data: data };
  }
  function groupBy(items, keyFn) {
    var g = {}, order = [];
    items.forEach(function (it) {
      var k = keyFn(it);
      if (!g[k]) { g[k] = { k: k, n: 0, correct: 0, wrong: 0, partial: 0, skipped: 0, t: 0, sub: it.sub }; order.push(k); }
      var x = g[k]; x.n++; x[it.st]++; x.t += it.t;
    });
    return order.map(function (k) { var x = g[k]; x.att = x.correct + x.wrong + x.partial; x.acc = pct(x.correct, x.att); return x; });
  }

  /* ---------- SVG charts ---------- */
  function donut(c, total) {
    var R = 42, C = 2 * Math.PI * R, off = 0, segs = [
      { v: c.correct, col: "#16a34a" }, { v: c.partial, col: "#f59e0b" }, { v: c.wrong, col: "#dc2626" }, { v: c.skipped, col: "#94a3b8" }
    ];
    var h = '<svg class="qxan-donut" viewBox="0 0 110 110" role="img" aria-label="Correct ' + c.correct + ', wrong ' + c.wrong + ', not attempted ' + c.skipped + '">' +
      '<circle cx="55" cy="55" r="' + R + '" fill="none" stroke="#e2e8f0" stroke-width="14"/>';
    segs.forEach(function (s) {
      if (!s.v || !total) return;
      var len = C * s.v / total;
      h += '<circle cx="55" cy="55" r="' + R + '" fill="none" stroke="' + s.col + '" stroke-width="14" stroke-dasharray="' + len.toFixed(2) + " " + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 55 55)"/>';
      off += len;
    });
    h += '<text x="55" y="52" text-anchor="middle" class="qxan-dn-big">' + total + '</text><text x="55" y="68" text-anchor="middle" class="qxan-dn-sm">questions</text></svg>';
    return h;
  }
  var COL = { correct: "#16a34a", wrong: "#dc2626", partial: "#f59e0b", skipped: "#94a3b8" };
  function timeBars(items) {
    var n = items.length, max = Math.max.apply(null, items.map(function (i) { return i.t; }).concat([1]));
    var bw = 10, gap = 4, H = 120, padL = 30, W = padL + n * (bw + gap) + 6;
    var h = '<svg class="qxan-tbars" viewBox="0 0 ' + W + " " + (H + 26) + '" width="' + W + '" height="' + (H + 26) + '" role="img" aria-label="Time per question">';
    h += '<line x1="' + padL + '" y1="' + H + '" x2="' + W + '" y2="' + H + '" stroke="#cbd5e1"/>';
    h += '<text x="' + (padL - 4) + '" y="10" text-anchor="end" class="qxan-ax">' + esc(fmt(max)) + '</text><text x="' + (padL - 4) + '" y="' + H + '" text-anchor="end" class="qxan-ax">0</text>';
    items.forEach(function (it, i) {
      var bh = Math.max(it.t > 0 ? 2 : 0, Math.round((it.t / max) * (H - 8)));
      var x = padL + i * (bw + gap) + 2;
      h += '<rect x="' + x + '" y="' + (H - bh) + '" width="' + bw + '" height="' + bh + '" rx="2" fill="' + COL[it.st] + '"><title>Q' + it.n + " \u00b7 " + esc(fmt(it.t)) + " \u00b7 " + it.st + "</title></rect>";
      if (n <= 40 || it.n % 5 === 0 || it.n === 1) h += '<text x="' + (x + bw / 2) + '" y="' + (H + 14) + '" text-anchor="middle" class="qxan-ax">' + it.n + "</text>";
    });
    return h + "</svg>";
  }
  function avgBars(m) {
    var groups = ["correct", "wrong", "skipped"].map(function (st) {
      var xs = m.items.filter(function (i) { return st === "wrong" ? (i.st === "wrong" || i.st === "partial") : i.st === st; });
      var tot = xs.reduce(function (a, b) { return a + b.t; }, 0);
      return { st: st, n: xs.length, avg: xs.length ? tot / xs.length : 0, tot: tot };
    });
    var max = Math.max.apply(null, groups.map(function (g) { return g.avg; }).concat([1]));
    var lab = { correct: "Correct", wrong: "Wrong", skipped: "Not attempted" };
    return '<div class="qxan-avg">' + groups.map(function (g) {
      return '<div class="qxan-avg-row"><span class="l">' + lab[g.st] + " (" + g.n + ')</span><span class="bar"><i style="width:' + Math.round(g.avg / max * 100) + "%;background:" + COL[g.st] + '"></i></span><span class="v">' + (g.n ? fmt(g.avg) + " avg" : "\u2014") + "</span></div>";
    }).join("") + "</div>";
  }

  /* ---------- Teacher's review (rule-based) ---------- */
  function review(m, chapters) {
    var out = { weak: [], revise: [], strong: [], time: [], careless: [], plan: [] };
    chapters.forEach(function (x) {
      if (x.k === "Chapter not tagged") return;
      if (x.att >= 1 && (x.acc < 50 || x.wrong >= 2) && x.wrong > 0) out.weak.push(x);
      else if (x.att >= 1 && x.acc < 80) out.revise.push(x);
      else if (x.correct >= 2 && x.acc >= 80) out.strong.push(x);
    });
    var it = m.items, att = it.filter(function (i) { return i.st !== "skipped"; });
    var corr = it.filter(function (i) { return i.st === "correct"; });
    var wr = it.filter(function (i) { return i.st === "wrong" || i.st === "partial"; });
    var avg = function (xs) { return xs.length ? xs.reduce(function (a, b) { return a + b.t; }, 0) / xs.length : 0; };
    var dur = (m.data && m.data.durationMin ? m.data.durationMin * 60 : 0), used = (m.data && m.data.timeUsed) || m.tsum;
    if (m.hasTime) {
      if (wr.length && corr.length && avg(wr) > avg(corr) * 1.3) out.time.push("You spent " + fmt(avg(wr)) + " on average on questions you got wrong vs " + fmt(avg(corr)) + " on correct ones. If a question is not opening up in about " + fmt(Math.max(60, avg(corr) * 1.5)) + ", mark it and move on.");
      var slowSkip = it.filter(function (i) { return i.st === "skipped" && i.t >= 90; });
      if (slowSkip.length) out.time.push(slowSkip.length + " question" + (slowSkip.length > 1 ? "s" : "") + " took 90s or more and were still left unanswered (Q" + slowSkip.slice(0, 6).map(function (i) { return i.n; }).join(", Q") + "). Decide earlier whether to attempt.");
      if (dur && used < dur * 0.5 && m.c.skipped > it.length * 0.25) out.time.push("You used " + fmt(used) + " of " + fmt(dur) + " and left " + m.c.skipped + " questions unattempted. Use the remaining time for a second pass.");
      if (!out.time.length && att.length) out.time.push("Average " + fmt(avg(att)) + " per attempted question. Time use looks balanced for this attempt.");
      var med = corr.map(function (i) { return i.t; }).sort(function (a, b) { return a - b; })[Math.floor(corr.length / 2)] || 0;
      var fast = wr.filter(function (i) { return i.t > 0 && i.t < Math.max(15, med * 0.4); });
      if (fast.length) out.careless.push(fast.length + " wrong answer" + (fast.length > 1 ? "s were" : " was") + " given in under " + fmt(Math.max(15, med * 0.4)) + " (Q" + fast.slice(0, 8).map(function (i) { return i.n; }).join(", Q") + "). These may be careless slips: re-read the question and check units/signs before answering.");
    } else {
      out.time.push("Time data not available for this attempt (older attempts did not record time per question).");
    }
    if (out.weak.length) out.plan.push("Revise the basics of " + out.weak.slice(0, 3).map(function (x) { return x.k; }).join(", ") + ", then practise 15\u201320 questions from each.");
    if (wr.length) out.plan.push("Print your " + wr.length + " mistake" + (wr.length > 1 ? "s" : "") + " with solutions and re-solve them without looking.");
    if (m.c.skipped) out.plan.push("Attempt the " + m.c.skipped + " unattempted question" + (m.c.skipped > 1 ? "s" : "") + " in practice mode to close the gaps.");
    if (out.revise.length) out.plan.push("Quick revision for " + out.revise.slice(0, 3).map(function (x) { return x.k; }).join(", ") + ".");
    out.plan.push("Reattempt this test after revision and compare accuracy.");
    return out;
  }

  function build(data) {
    var m = model(data);
    var total = m.items.length;
    if (!total) return "";
    var att = m.c.correct + m.c.wrong + m.c.partial;
    var acc = pct(m.c.correct, att);
    var chapters = groupBy(m.items, function (i) { return i.ch; });
    var subjects = groupBy(m.items, function (i) { return i.sub; });
    var diffs = groupBy(m.items.filter(function (i) { return i.diff; }), function (i) { return i.diff; });
    var rv = review(m, chapters);
    var sl = scoringLabel();
    var h = [];
    h.push('<section class="qxan" id="qxAnalysis" aria-label="Test analysis">');
    h.push('<div class="qxan-head"><div><h2>Analysis</h2><p>From this attempt only' + (sl ? " \u00b7 marking " + esc(sl) : "") + '</p></div><div class="qxan-actions">' +
      '<button type="button" data-qxan="mistakes"' + (m.c.wrong + m.c.partial ? "" : " disabled") + '>Print my mistakes</button><button type="button" data-qxan="print">Print analysis</button></div></div>');
    /* summary */
    h.push('<div class="qxan-card qxan-sum">' + donut(m.c, total) + '<div class="qxan-kpis">' +
      '<div><b>' + esc(data.score) + '<small>/' + esc(data.maxScore) + '</small></b><span>Score</span></div>' +
      '<div><b>' + acc + '%</b><span>Accuracy (correct / attempted)</span></div>' +
      '<div><b>' + att + '<small>/' + total + '</small></b><span>Attempted</span></div>' +
      '<div><b>' + esc(fmt(data.timeUsed || m.tsum)) + '</b><span>Time used' + (data.durationMin ? " of " + data.durationMin + " min" : "") + '</span></div></div>' +
      '<ul class="qxan-legend"><li><i style="background:' + COL.correct + '"></i>Correct ' + m.c.correct + '</li><li><i style="background:' + COL.wrong + '"></i>Wrong ' + m.c.wrong + '</li>' + (m.c.partial ? '<li><i style="background:' + COL.partial + '"></i>Partial ' + m.c.partial + "</li>" : "") + '<li><i style="background:' + COL.skipped + '"></i>Not attempted ' + m.c.skipped + "</li></ul></div>");
    /* time */
    h.push('<div class="qxan-card"><h3>Time analysis</h3>');
    if (m.hasTime) {
      h.push('<p class="qxan-sub">Time spent on each question (green correct, red wrong, grey not attempted)</p><div class="qxan-scroll">' + timeBars(m.items) + "</div>" + avgBars(m));
      var slow = m.items.slice().sort(function (a, b) { return b.t - a.t; }).slice(0, 5).filter(function (i) { return i.t > 0; });
      if (slow.length) h.push('<h4>Slowest questions</h4><ol class="qxan-slow">' + slow.map(function (i) { return '<li><button type="button" data-qxan-q="' + i.idx + '">Q' + i.n + '</button><span>' + esc(i.ch) + '</span><b>' + esc(fmt(i.t)) + '</b><em class="st-' + i.st + '">' + i.st.replace("skipped", "not attempted") + "</em></li>"; }).join("") + "</ol>");
    } else {
      h.push('<p class="qxan-na">Time data not available for this attempt.</p>');
    }
    h.push("</div>");
    /* breakdown */
    function table(rows, label) {
      return '<div class="qxan-scroll"><table class="qxan-tbl"><thead><tr><th>' + label + '</th><th>Qs</th><th>\u2713</th><th>\u2717</th><th>\u2013</th><th>Accuracy</th>' + (m.hasTime ? "<th>Avg time</th>" : "") + "</tr></thead><tbody>" +
        rows.map(function (x) {
          return "<tr><td>" + esc(x.k) + "</td><td>" + x.n + '</td><td class="g">' + x.correct + '</td><td class="r">' + (x.wrong + x.partial) + "</td><td>" + x.skipped + '</td><td><span class="qxan-accbar"><i style="width:' + x.acc + "%;background:" + (x.acc >= 80 ? COL.correct : x.acc >= 50 ? "#f59e0b" : COL.wrong) + '"></i></span>' + (x.att ? x.acc + "%" : "\u2014") + "</td>" + (m.hasTime ? "<td>" + esc(fmt(x.n ? x.t / x.n : 0)) + "</td>" : "") + "</tr>";
        }).join("") + "</tbody></table></div>";
    }
    h.push('<div class="qxan-card"><h3>Subject &amp; chapter breakdown</h3>' + (subjects.length > 1 ? table(subjects, "Subject") : "") + table(chapters, "Chapter") + "</div>");
    if (diffs.length) h.push('<div class="qxan-card"><h3>Difficulty breakdown</h3><p class="qxan-sub">Based on each question\u2019s difficulty tag (' + diffs.reduce(function (a, b) { return a + b.n; }, 0) + " of " + total + " tagged)</p>" + table(diffs.sort(function (a, b) { return ["Easy", "Medium", "Hard"].indexOf(a.k) - ["Easy", "Medium", "Hard"].indexOf(b.k); }), "Level") + "</div>");
    /* teacher's review */
    function chips(xs, cls) { return xs.length ? xs.slice(0, 6).map(function (x) { return '<span class="qxan-chip ' + cls + '">' + esc(x.k) + " \u00b7 " + x.acc + "%</span>"; }).join("") : '<span class="qxan-none">None in this attempt</span>'; }
    h.push('<div class="qxan-card qxan-teacher"><h3>Teacher\u2019s review</h3><p class="qxan-sub">Rule-based feedback from your answers and time in this attempt.</p>' +
      '<div class="qxan-tr"><b>Weak chapters</b><div>' + chips(rv.weak, "weak") + '</div></div>' +
      '<div class="qxan-tr"><b>Revise</b><div>' + chips(rv.revise, "rev") + '</div></div>' +
      '<div class="qxan-tr"><b>Strong</b><div>' + chips(rv.strong, "strong") + "</div></div>" +
      '<h4>Time advice</h4><ul>' + rv.time.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
      (rv.careless.length ? "<h4>Careless-error check</h4><ul>" + rv.careless.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
      '<h4>Next steps</h4><ol>' + rv.plan.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ol></div>");
    /* question-wise review */
    h.push('<div class="qxan-card"><h3>Question-wise review</h3><p class="qxan-sub">Tap a question to open its solution.</p><div class="qxan-scroll"><table class="qxan-tbl qxan-qw"><thead><tr><th>Q</th><th>Chapter</th><th>Yours</th><th>Correct</th>' + (m.hasTime ? "<th>Time</th>" : "") + "<th>Result</th></tr></thead><tbody>" +
      m.items.map(function (i) {
        return '<tr><td><button type="button" data-qxan-q="' + i.idx + '">Q' + i.n + "</button></td><td>" + esc(i.ch) + "</td><td>" + (i.mine ? esc(i.mine) : "\u2014") + "</td><td>" + (i.key ? esc(i.key) : "n/a") + "</td>" + (m.hasTime ? "<td>" + esc(fmt(i.t)) + "</td>" : "") + '<td><em class="st-' + i.st + '">' + i.st.replace("skipped", "not attempted") + "</em></td></tr>";
      }).join("") + "</tbody></table></div></div>");
    h.push('<p class="qxan-foot">Quantrex Academy \u00b7 Concept Create Destiny \u00b7 www.quantrexacademy.com</p></section>');
    return h.join("");
  }

  function ensureCss() {
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement("style"); st.id = CSS_ID;
    st.textContent = [
      ".qxan{max-width:980px;margin:16px auto 24px;padding:0 12px;font-family:Inter,system-ui,sans-serif;color:#0f172a;box-sizing:border-box}",
      ".qxan *{box-sizing:border-box}",
      ".qxan-head{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end;justify-content:space-between;margin:6px 0 10px}",
      ".qxan-head h2{margin:0;font:800 22px/1.2 Kanit,Inter,sans-serif}.qxan-head p{margin:2px 0 0;color:#64748b;font-size:12.5px}",
      ".qxan-actions{display:flex;gap:8px;flex-wrap:wrap}.qxan-actions button{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:10px;padding:8px 12px;font:700 13px Inter,sans-serif;cursor:pointer;min-height:38px}",
      ".qxan-actions button:first-child{background:#1d4ed8;color:#fff;border-color:#1d4ed8}.qxan-actions button:disabled{opacity:.5;cursor:default}",
      ".qxan-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:0 0 12px;box-shadow:0 1px 2px rgba(15,23,42,.04);min-width:0}",
      ".qxan-card h3{margin:0 0 6px;font:800 16px Inter,sans-serif}.qxan-card h4{margin:12px 0 6px;font:800 13.5px Inter,sans-serif}",
      ".qxan-sub{margin:0 0 8px;color:#64748b;font-size:12.5px}.qxan-na{color:#64748b;font-style:italic;margin:4px 0}",
      ".qxan-sum{display:grid;grid-template-columns:120px 1fr;gap:12px;align-items:center}",
      ".qxan-donut{width:120px;height:120px}.qxan-dn-big{font:800 20px Inter,sans-serif;fill:#0f172a}.qxan-dn-sm{font:600 9px Inter,sans-serif;fill:#64748b}",
      ".qxan-kpis{display:grid;grid-template-columns:1fr 1fr;gap:8px}.qxan-kpis div{background:#f8fafc;border-radius:10px;padding:8px 10px;min-width:0}",
      ".qxan-kpis b{display:block;font:800 18px Inter,sans-serif}.qxan-kpis small{font-size:12px;color:#64748b;font-weight:700}.qxan-kpis span{font-size:11.5px;color:#64748b}",
      ".qxan-legend{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px 14px;list-style:none;margin:0;padding:0;font-size:12.5px;color:#334155}.qxan-legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}",
      ".qxan-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}",
      ".qxan-tbars{display:block}.qxan-ax{font:600 9px Inter,sans-serif;fill:#64748b}",
      ".qxan-avg{margin-top:8px}.qxan-avg-row{display:grid;grid-template-columns:118px 1fr 84px;gap:8px;align-items:center;font-size:12.5px;margin:4px 0}",
      ".qxan-avg-row .bar{height:10px;background:#f1f5f9;border-radius:6px;overflow:hidden}.qxan-avg-row .bar i{display:block;height:100%;border-radius:6px}.qxan-avg-row .v{text-align:right;font-weight:700}",
      ".qxan-slow{margin:0;padding-left:18px}.qxan-slow li{display:flex;gap:8px;align-items:center;font-size:13px;margin:3px 0}.qxan-slow span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#475569}",
      ".qxan button[data-qxan-q]{border:1px solid #cbd5e1;background:#f8fafc;border-radius:8px;padding:3px 8px;font:700 12px Inter,sans-serif;color:#1d4ed8;cursor:pointer}",
      ".qxan-tbl{width:100%;border-collapse:collapse;font-size:12.5px;min-width:420px}.qxan-tbl th{background:#f8fafc;text-align:left;font-weight:800;color:#334155;padding:7px 6px;border-bottom:1px solid #e2e8f0;white-space:nowrap}",
      ".qxan-tbl td{padding:6px;border-bottom:1px solid #f1f5f9;vertical-align:middle}.qxan-tbl td.g{color:#15803d;font-weight:700}.qxan-tbl td.r{color:#b91c1c;font-weight:700}",
      ".qxan-accbar{display:inline-block;width:46px;height:7px;background:#f1f5f9;border-radius:4px;overflow:hidden;margin-right:6px;vertical-align:middle}.qxan-accbar i{display:block;height:100%}",
      ".qxan em[class^=st-]{font-style:normal;font-weight:700;font-size:12px;text-transform:capitalize}.qxan .st-correct{color:#15803d}.qxan .st-wrong{color:#b91c1c}.qxan .st-partial{color:#b45309}.qxan .st-skipped{color:#64748b}",
      ".qxan-tr{display:grid;grid-template-columns:110px 1fr;gap:8px;align-items:start;margin:6px 0;font-size:13px}",
      ".qxan-chip{display:inline-block;border-radius:999px;padding:3px 10px;margin:0 6px 6px 0;font-size:12px;font-weight:700}.qxan-chip.weak{background:#fee2e2;color:#991b1b}.qxan-chip.rev{background:#fef3c7;color:#92400e}.qxan-chip.strong{background:#dcfce7;color:#166534}",
      ".qxan-none{color:#94a3b8;font-size:12.5px}.qxan-teacher ul,.qxan-teacher ol{margin:0;padding-left:18px;font-size:13px;line-height:1.5}",
      ".qxan-foot{text-align:center;color:#94a3b8;font-size:11.5px;margin:8px 0 0}",
      "@media (max-width:480px){.qxan-sum{grid-template-columns:96px 1fr}.qxan-donut{width:96px;height:96px}.qxan-kpis b{font-size:16px}.qxan-avg-row{grid-template-columns:96px 1fr 70px}.qxan-tr{grid-template-columns:1fr}}",
      "@media print{html.qxan-printing body *{visibility:hidden !important}html.qxan-printing #qxAnalysis,html.qxan-printing #qxAnalysis *{visibility:visible !important}",
      "html.qxan-printing #qxAnalysis{position:absolute;left:0;top:0;width:100%;max-width:none;margin:0}html.qxan-printing .qxan-actions,html.qxan-printing button[data-qxan-q]{border:0 !important;background:none !important;color:#0f172a !important}",
      "html.qxan-printing .qxan-actions{display:none !important}html.qxan-printing .qxan-card{break-inside:avoid;box-shadow:none}html.qxan-printing .qxan-scroll{overflow:visible}",
      "html.qxan-printing,html.qxan-printing body{overflow:visible !important;height:auto !important}html.qxan-printing *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}"
    ].join("\n");
    document.head.appendChild(st);
  }

  function openSolution(idx) {
    var an = document.getElementById("qzAnPage");
    try {
      if (an && an._mkShowSolutions) {
        an._mkShowSolutions();
        setTimeout(function () {
          var sv = document.getElementById("mkSolView");
          var host = [sv, an].concat([].slice.call(document.querySelectorAll("#mkSolView *"))).filter(function (x) { return x && x._mkSolShow; })[0];
          if (host) host._mkSolShow(idx);
          else { var row = document.querySelector('.rv-row[data-rv-idx="' + idx + '"]'); if (row) row.scrollIntoView({ block: "start" }); }
        }, 60);
        return;
      }
    } catch (_) {}
    var r = document.querySelector('.rv-row[data-rv-idx="' + idx + '"]');
    if (r) r.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function bind(sec) {
    sec.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var a = b.getAttribute("data-qxan");
      if (a === "mistakes") { e.preventDefault(); if (window.QxPrint) window.QxPrint.open("mistakes"); return; }
      if (a === "print") {
        e.preventDefault();
        var html = document.documentElement; html.classList.add("qxan-printing");
        var done = function () { html.classList.remove("qxan-printing"); window.removeEventListener("afterprint", done); };
        window.addEventListener("afterprint", done);
        setTimeout(function () { try { window.print(); } catch (_) {} setTimeout(done, 1500); }, 50);
        return;
      }
      var qi = b.getAttribute("data-qxan-q");
      if (qi != null) { e.preventDefault(); openSolution(+qi); }
    });
  }
  var done = typeof WeakSet !== "undefined" ? new WeakSet() : null;
  function mount(root, data) {
    data = data || window._qxLastAnalysis;
    if (!root || !data || !data.rows || !data.rows.length) return null;
    if (root.querySelector("#qxAnalysis")) return root.querySelector("#qxAnalysis");
    ensureCss();
    var wrap = document.createElement("div");
    try { wrap.innerHTML = build(data); } catch (err) { try { console.warn("qx-analysis", err); } catch (_) {} return null; }
    var sec = wrap.firstChild; if (!sec) return null;
    var body = root.querySelector("#mkRcBody");
    var stats = root.querySelector(".result-stats");
    if (body && body.parentNode) body.parentNode.insertBefore(sec, body.nextSibling);
    else if (stats && stats.parentNode) stats.parentNode.insertBefore(sec, stats.nextSibling);
    else root.appendChild(sec);
    bind(sec);
    return sec;
  }
  function scan() {
    var data = window._qxLastAnalysis;
    if (!data || !data.rows) return;
    var root = document.getElementById("qzAnPage") || document.querySelector(".result-screen.marks-result");
    if (!root || root.querySelector("#qxAnalysis")) return;
    if (done && done.has(root)) return;
    if (done) done.add(root);
    mount(root, data);
  }
  var pend = 0;
  try {
    new MutationObserver(function () { if (pend) return; pend = 1; setTimeout(function () { pend = 0; scan(); }, 120); })
      .observe(document.documentElement, { childList: true, subtree: true });
  } catch (_) {}
  window.QxAnalysis = { mount: mount, build: build, _model: model };
})();
