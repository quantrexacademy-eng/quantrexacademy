/* qxmd392c: real-data progress helpers. Pure functions + small HTML renderers.
   Nothing here invents history: fields an old record lacks stay "unknown" and are counted apart.
   No ranks, percentiles, strengths or syllabus tags are produced here. */
(function (root) {
  "use strict";
  var DAY = 86400000;
  var RANGES = [
    { id: "7d", label: "7 days", days: 7 }, { id: "14d", label: "14 days", days: 14 },
    { id: "30d", label: "30 days", days: 30 }, { id: "3m", label: "3 months", months: 3 },
    { id: "6m", label: "6 months", months: 6 }, { id: "all", label: "All time" }
  ];
  var QR_KEEP_ATTEMPTS = 20;   /* per-question detail kept on the newest N attempts only (doc size) */
  var QR_MAX_ROWS = 300;
  var CODE = { correct: "c", partial: "p", incorrect: "i", skipped: "s" };

  function rangeStart(id, now) {
    now = now == null ? Date.now() : now;
    var r = RANGES.filter(function (x) { return x.id === id; })[0];
    if (!r || r.id === "all") return null;
    if (r.days) return now - r.days * DAY;
    var d = new Date(now); d.setMonth(d.getMonth() - r.months); return d.getTime();
  }

  /* compact per-question outcome from the engine's own rows: [id, code, marks, sec] */
  function compactRows(rows) {
    if (!Array.isArray(rows) || !rows.length || rows.length > QR_MAX_ROWS) return null;
    return rows.map(function (r) {
      var id = r && (r.id != null ? r.id : (r.q && r.q.id));
      var code = CODE[r && r.status] || (r && r.isSkip ? "s" : null);
      return [id == null ? null : id, code, typeof (r && r.marks) === "number" ? r.marks : null,
        Math.round(Number(r && r.timeSec) || 0)];
    });
  }

  /* build the stored record. Old keys kept exactly; new keys only when the session really had them. */
  function buildRecord(data, now) {
    data = data || {};
    var rec = {
      id: now || Date.now(), title: data.title, mode: data.mode || data.testType || "custom", exam: data.exam,
      correct: data.correct, wrong: data.wrong, skipped: data.skipped, score: data.score, maxScore: data.maxScore,
      pct: data.pct, total: data.total, timeUsed: data.timeUsed, breakdown: data.breakdown, date: data.date || now || Date.now()
    };
    var opt = ["testId", "slug", "source", "fullyCorrect", "partial", "incorrect", "attempted", "accuracyPct", "notVisited", "scoring"];
    opt.forEach(function (k) { if (data[k] != null && data[k] !== "") rec[k] = data[k]; });
    var qr = compactRows(data.rows);
    if (qr) rec.qr = qr;
    if (rec.fullyCorrect != null) rec.v = 2;
    return rec;
  }

  function trimDetail(list) {
    return (list || []).map(function (a, i) {
      if (i < QR_KEEP_ATTEMPTS || !a || !a.qr) return a;
      var c = {}; Object.keys(a).forEach(function (k) { if (k !== "qr") c[k] = a[k]; }); return c;
    });
  }

  function hasSplit(a) { return a && a.fullyCorrect != null && a.attempted != null; }

  function addTo(m, key, extra) {
    if (!m[key]) { m[key] = { total: 0, correct: 0, partial: 0, incorrect: 0, skipped: 0, attempted: 0, score: 0, maxMarks: 0, timeSec: 0, timeKnown: false }; Object.keys(extra || {}).forEach(function (k) { m[key][k] = extra[k]; }); }
    return m[key];
  }

  /* weighted: accuracy = sum fully-correct / sum attempted (never an average of percentages) */
  function aggregate(attempts, rangeId, now) {
    var from = rangeStart(rangeId, now);
    var inRange = (attempts || []).filter(function (a) { return a && (from == null || Number(a.date) >= from); });
    var out = { range: rangeId || "all", tests: inRange.length, detailed: 0, legacy: 0,
      correct: 0, partial: 0, incorrect: 0, skipped: 0, attempted: 0, questions: 0,
      score: 0, maxScore: 0, scoreKnown: 0, timeSec: 0, subject: {}, chapter: {}, paper: {} };
    inRange.forEach(function (a) {
      var title = String(a.title || a.testId || "Untitled test");
      var pk = a.testId ? "id:" + a.testId : "t:" + title;
      var p = addTo(out.paper, pk, { title: title, tests: 0, lastDate: 0, legacy: 0 });
      p.tests++; p.lastDate = Math.max(p.lastDate, Number(a.date) || 0);
      if (typeof a.score === "number" && typeof a.maxScore === "number" && a.maxScore > 0) {
        out.score += a.score; out.maxScore += a.maxScore; out.scoreKnown++; p.score += a.score; p.maxMarks += a.maxScore;
      }
      if (typeof a.timeUsed === "number") { out.timeSec += a.timeUsed; p.timeSec += a.timeUsed; p.timeKnown = true; }
      if (!hasSplit(a)) { out.legacy++; p.legacy++; return; }
      out.detailed++;
      out.correct += a.fullyCorrect; out.partial += a.partial || 0; out.incorrect += a.incorrect || 0;
      out.attempted += a.attempted; out.skipped += a.skipped || 0; out.questions += a.total || 0;
      p.correct += a.fullyCorrect; p.partial += a.partial || 0; p.incorrect += a.incorrect || 0;
      p.attempted += a.attempted; p.total += a.total || 0;
      var bs = (a.breakdown && a.breakdown.subject) || {};
      Object.keys(bs).forEach(function (s) {
        var v = bs[s] || {}, t = addTo(out.subject, s);
        var part = v.partial || 0, inc = v.incorrect != null ? v.incorrect : Math.max(0, (v.wrong || 0) - part);
        t.total += v.total || 0; t.correct += v.correct || 0; t.partial += part; t.incorrect += inc;
        t.skipped += v.skipped || 0; t.attempted += (v.correct || 0) + part + inc;
        t.score += v.score || 0; t.maxMarks += v.maxMarks || 0;
        if (v.timeSec != null) { t.timeSec += v.timeSec; t.timeKnown = true; }
      });
      var bc = (a.breakdown && a.breakdown.chapter) || {};
      Object.keys(bc).forEach(function (k) {
        var v = bc[k] || {}; var name = v.chapter || k;
        var t = addTo(out.chapter, (v.subject || "") + "\u0001" + name, { subject: v.subject || "", chapter: name });
        t.total += v.total || 0; t.correct += v.correct || 0; t.partial += v.partial || 0; t.incorrect += v.incorrect || 0;
        t.skipped += v.skipped || 0; t.attempted += (v.correct || 0) + (v.partial || 0) + (v.incorrect || 0);
        t.score += v.score || 0; if (v.timeSec != null) { t.timeSec += v.timeSec; t.timeKnown = true; }
      });
    });
    out.accuracy = out.attempted ? out.correct / out.attempted : null;
    return out;
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); }
  function pct(n, d) { return d ? Math.round(n / d * 1000) / 10 : null; }
  function fmtT(sec) { sec = Math.round(Number(sec) || 0); var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60); return h ? h + "h " + m + "m" : m + "m " + (sec % 60) + "s"; }
  function bar(c, p, i, s) {
    var t = c + p + i + (s || 0); if (!t) return '<span class="qx-pg-na">—</span>';
    function seg(n, cls, lab) { return n ? '<i class="' + cls + '" style="width:' + (n / t * 100).toFixed(2) + '%" title="' + lab + ': ' + n + '"></i>' : ""; }
    return '<span class="qx-pg-bar" role="img" aria-label="' + c + ' correct, ' + p + ' partial, ' + i + ' incorrect' + (s ? ", " + s + " skipped" : "") + '">' +
      seg(c, "c", "Correct") + seg(p, "p", "Partial") + seg(i, "i", "Incorrect") + seg(s || 0, "s", "Skipped") + "</span>";
  }
  function rowHtml(name, v, showTime) {
    var acc = pct(v.correct, v.attempted);
    return "<tr><th scope=row>" + name + "</th><td>" + bar(v.correct, v.partial, v.incorrect, v.skipped) + "</td><td>" + v.correct + " / " + v.partial + " / " + v.incorrect +
      "</td><td>" + v.attempted + " of " + v.total + "</td><td>" + (acc == null ? "—" : acc + "%") + "</td><td>" + (v.maxMarks ? esc(v.score) + " / " + esc(v.maxMarks) : esc(v.score)) +
      "</td>" + (showTime ? "<td>" + (v.timeKnown ? fmtT(v.timeSec) : "not recorded") + "</td>" : "") + "</tr>";
  }
  function table(caption, head, rows) {
    if (!rows.length) return "";
    return '<div class="qx-pg-tw"><table class="qx-pg-t"><caption>' + caption + "</caption><thead><tr>" + head.map(function (h) { return "<th scope=col>" + h + "</th>"; }).join("") +
      "</tr></thead><tbody>" + rows.join("") + "</tbody></table></div>";
  }

  function dashboardHtml(attempts, rangeId, now) {
    rangeId = rangeId || "30d";
    var g = aggregate(attempts, rangeId, now);
    var chips = RANGES.map(function (r) {
      return '<button type="button" class="qx-diff-chip' + (r.id === rangeId ? ' on" aria-pressed="true"' : '" aria-pressed="false"') + ' onclick="qxSetDashRange(\'' + r.id + '\')">' + r.label + "</button>";
    }).join("");
    var h = '<section class="qx-an-panel qx-pg" id="qxProgressPanel" aria-labelledby="qxPgH"><h3 id="qxPgH">Test performance</h3>' +
      '<div class="qx-diff-filter-bar" role="group" aria-label="Date range">' + chips + "</div>";
    if (!g.tests) return h + '<p class="qx-an-muted" role="status">No tests recorded on this device in this period.</p></section>';
    var acc = g.accuracy == null ? "—" : (Math.round(g.accuracy * 1000) / 10) + "%";
    h += '<div class="qx-pg-kpis">' +
      '<div><b>' + g.tests + "</b><small>tests</small></div>" +
      '<div><b>' + acc + "</b><small>accuracy (fully correct ÷ attempted" + (g.detailed ? ", " + g.detailed + " test" + (g.detailed > 1 ? "s" : "") : "") + ")</small></div>" +
      '<div><b>' + (g.detailed ? g.attempted + " of " + g.questions : "—") + "</b><small>questions attempted</small></div>" +
      '<div><b>' + (g.scoreKnown ? esc(g.score) + " / " + esc(g.maxScore) : "—") + "</b><small>marks</small></div>" +
      '<div><b>' + fmtT(g.timeSec) + "</b><small>time in tests</small></div></div>";
    if (g.detailed) h += '<p class="qx-pg-legend">' + bar(g.correct, g.partial, g.incorrect, g.skipped) + ' <span><i class="c"></i>Correct ' + g.correct + '</span> <span><i class="p"></i>Partial ' + g.partial + '</span> <span><i class="i"></i>Incorrect ' + g.incorrect + '</span> <span><i class="s"></i>Skipped ' + g.skipped + "</span></p>";
    if (g.legacy) h += '<p class="qx-an-muted">' + g.legacy + " older test" + (g.legacy > 1 ? "s were" : " was") + " saved before correct/partial/incorrect were recorded separately, so " + (g.legacy > 1 ? "they are" : "it is") + " counted in tests, marks and time but not in accuracy.</p>";
    var head = ["", "Result", "C / P / I", "Attempted", "Accuracy", "Marks"];
    var subj = Object.keys(g.subject).sort().map(function (k) { return rowHtml(esc(k), g.subject[k], true); });
    h += table("By subject", head.concat("Time"), subj);
    var ch = Object.keys(g.chapter).map(function (k) { return g.chapter[k]; }).sort(function (a, b) { return b.total - a.total; }).slice(0, 40)
      .map(function (v) { return rowHtml(esc(v.chapter) + (v.subject ? " <small>" + esc(v.subject) + "</small>" : ""), v, true); });
    h += table("By chapter (from each question's own chapter field)", head.concat("Time"), ch);
    var pp = Object.keys(g.paper).map(function (k) { return g.paper[k]; }).sort(function (a, b) { return b.lastDate - a.lastDate; }).slice(0, 40)
      .map(function (v) {
        var r = v.legacy === v.tests ? Object.assign({}, v, { attempted: 0 }) : v;
        return rowHtml(esc(v.title) + " <small>×" + v.tests + "</small>", r, true).replace("<td>0 of 0</td>", "<td>not recorded</td>");
      });
    h += table("By test / paper", head.concat("Time"), pp);
    return h + "</section>";
  }

  /* practice history from STATE.solved records ({id, correct, result?, date}) */
  function resultOf(rec) {
    if (!rec) return null;
    if (rec.result === "correct" || rec.result === "partial" || rec.result === "incorrect") return rec.result;
    return rec.correct ? "correct-legacy" : "incorrect";
  }
  function practiceIndex(solved) {
    var m = {}; (solved || []).forEach(function (r) { if (r && r.id != null) m[String(r.id)] = resultOf(r); }); return m;
  }
  function attemptOk(q, f, idx, bm) {
    if (!f || f === "all") return true;
    var r = idx[String(q && q.id)];
    if (f === "bookmarked") return !!(bm && bm[String(q && q.id)]);
    if (f === "none") return !r;
    if (f === "attempted") return !!r;
    if (f === "correct") return r === "correct" || r === "correct-legacy";
    return r === f;
  }

  var api = { RANGES: RANGES, QR_KEEP_ATTEMPTS: QR_KEEP_ATTEMPTS, rangeStart: rangeStart, compactRows: compactRows, buildRecord: buildRecord,
    trimDetail: trimDetail, aggregate: aggregate, dashboardHtml: dashboardHtml, resultOf: resultOf, practiceIndex: practiceIndex, attemptOk: attemptOk };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.QxProgress = api;
})(typeof window !== "undefined" ? window : globalThis);
