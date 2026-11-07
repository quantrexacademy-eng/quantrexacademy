/* Quantrex Report Card view (qxmd321). Real attempt data only. */
(function (global) {
  "use strict";
  if (global.QxReportCard) return;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function QF() { return typeof QuantrexQFormat !== "undefined" ? QuantrexQFormat : null; }
  function opts(q) { return (q && Array.isArray(q.options)) ? q.options : []; }
  function letter(i) { return String.fromCharCode(65 + (Number(i) || 0)); }
  function isNum(q) {
    try {
      var f = QF();
      if (f && f.getType) {
        var t = String(f.getType(q) || "");
        if (/num|integer/i.test(t)) return true;
      }
    } catch (_) {}
    return !opts(q).length || /numer|integer/i.test(String((q && q.questionType) || ""));
  }
  function correctTxt(q) {
    if (!q) return "";
    var f = QF();
    try {
      if (isNum(q)) {
        var v = f && f.correctNumerical ? f.correctNumerical(q) : q.correctValue;
        return String(v == null ? "" : v).replace(/<[^>]+>/g, "").trim();
      }
      var ci = (f && f.correctIndices ? f.correctIndices(q) : []) || [];
      var n = opts(q).length;
      return ci.filter(function (i) { return i >= 0 && i < n; }).map(letter).join(", ");
    } catch (_) { return ""; }
  }
  function chosenTxt(q, c) {
    if (c == null || c === "" || (Array.isArray(c) && !c.length)) return "";
    if (isNum(q)) return String(c);
    if (Array.isArray(c)) return c.map(function (i) { return letter(+i); }).join(", ");
    if (typeof c === "number" || /^\d+$/.test(String(c))) return letter(+c);
    return String(c);
  }
  function fmtDur(s) {
    s = Math.max(0, Math.round(Number(s) || 0));
    if (s < 60) return s + " sec";
    var m = Math.floor(s / 60), r = s % 60;
    if (m < 60) return r ? (m + " min " + (r < 10 ? "0" : "") + r + " sec") : (m + " min");
    return Math.floor(m / 60) + "h " + (m % 60) + "m";
  }
  function fmtMin(s) {
    var m = Math.max(0, Number(s) || 0) / 60;
    if (m < 10) return m.toFixed(1) + " min";
    return Math.round(m) + " min";
  }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function accCls(a) { return a >= 75 ? "hi" : a >= 50 ? "mid" : "lo"; }
  function fmtWhen(ts) {
    var d = new Date(ts || Date.now());
    if (isNaN(d.getTime())) d = new Date();
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var h = d.getHours(), m = d.getMinutes();
    var ap = h >= 12 ? "PM" : "AM";
    var h12 = h % 12 || 12;
    return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear() + ", " +
      h12 + ":" + (m < 10 ? "0" : "") + m + " " + ap;
  }
  function scoringOf(data, meta) {
    return (meta && meta.scoring) ||
      (data && data.scoring) ||
      (global._qxLastAttemptSnapshot && global._qxLastAttemptSnapshot.scoring) ||
      { correct: 4, wrong: -1 };
  }
  function icTrophy() {
    return '<svg class="qx-rc-kpi-ic" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 5h10v3a5 5 0 0 1-10 0V5z" fill="#F5C542"/><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" stroke="#F5C542" stroke-width="1.7"/><path d="M12 13v3M9 20h6v-2a3 3 0 0 0-6 0v2z" stroke="#F5C542" stroke-width="1.7" stroke-linecap="round"/></svg>';
  }
  function icBars() {
    return '<svg class="qx-rc-kpi-ic" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 17V10M10 17V7M15 17v-4M20 17V5" stroke="#86efac" stroke-width="2.2" stroke-linecap="round"/></svg>';
  }
  function icTarget() {
    return '<svg class="qx-rc-kpi-ic" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="#fda4af" stroke-width="1.8"/><circle cx="12" cy="12" r="4" stroke="#fda4af" stroke-width="1.8"/><circle cx="12" cy="12" r="1.6" fill="#fda4af"/></svg>';
  }
  function icCrown() {
    return '<svg class="qx-rc-kpi-ic" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 16l2-8 6 5 6-5 2 8H4z" fill="#F5C542"/><path d="M5 18h14" stroke="#F5C542" stroke-width="1.6" stroke-linecap="round"/></svg>';
  }
  function donut(c, w, s, total, center) {
    var R = 42, C = 2 * Math.PI * R, off = 0;
    var segs = [
      { v: c, col: "#22c55e" },
      { v: w, col: "#ef4444" },
      { v: s, col: "#cbd5e1" }
    ];
    var h = '<svg class="qx-rc-donut" viewBox="0 0 110 110" role="img" aria-label="Attempt distribution">';
    h += '<circle cx="55" cy="55" r="' + R + '" fill="none" stroke="#e2e8f0" stroke-width="14"/>';
    segs.forEach(function (x) {
      if (!x.v || !total) return;
      var len = C * x.v / total;
      h += '<circle cx="55" cy="55" r="' + R + '" fill="none" stroke="' + x.col + '" stroke-width="14" stroke-dasharray="' +
        len.toFixed(2) + " " + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) +
        '" transform="rotate(-90 55 55)"/>';
      off += len;
    });
    h += '<text x="55" y="52" text-anchor="middle" font-size="18" font-weight="800" fill="#0f172a">' + esc(center || total) + "</text>";
    h += '<text x="55" y="68" text-anchor="middle" font-size="9" font-weight="600" fill="#64748b">Questions</text></svg>';
    return h;
  }
  function mistDonut(b) {
    var total = b.total || 0;
    var R = 42, C = 2 * Math.PI * R, off = 0;
    var segs = [
      { v: b.concept, col: "#ef4444" },
      { v: b.calc, col: "#f59e0b" },
      { v: b.silly, col: "#3b82f6" },
      { v: b.guess, col: "#a855f7" }
    ];
    var h = '<svg class="qx-rc-donut" viewBox="0 0 110 110" role="img" aria-label="Mistake analysis">';
    h += '<circle cx="55" cy="55" r="' + R + '" fill="none" stroke="#e2e8f0" stroke-width="14"/>';
    segs.forEach(function (x) {
      if (!x.v || !total) return;
      var len = C * x.v / total;
      h += '<circle cx="55" cy="55" r="' + R + '" fill="none" stroke="' + x.col + '" stroke-width="14" stroke-dasharray="' +
        len.toFixed(2) + " " + (C - len).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) +
        '" transform="rotate(-90 55 55)"/>';
      off += len;
    });
    h += '<text x="55" y="52" text-anchor="middle" font-size="20" font-weight="800" fill="#0f172a">' + total + "</text>";
    h += '<text x="55" y="68" text-anchor="middle" font-size="9" font-weight="600" fill="#64748b">Wrong</text></svg>';
    return h;
  }

  function model(data, meta) {
    var rows = (data && data.rows) || [];
    var sc = scoringOf(data, meta);
    var plus = Number(sc.correct != null ? sc.correct : 4);
    var minus = Number(sc.wrong != null ? sc.wrong : -1);
    var items = rows.map(function (r, i) {
      var q = r.q || null;
      var st = r.isCorrect ? "correct" : (r.isSkip ? "skipped" : (r.isWrong ? "wrong" : "partial"));
      var diffRaw = String((q && q.difficulty) || "").trim().toLowerCase();
      var diff = /^e/.test(diffRaw) ? "Easy" : /^m/.test(diffRaw) ? "Moderate" : (/^h|^d/.test(diffRaw) ? "Hard" : "");
      /* qxmd392: use the engine's awarded marks (multi/numerical/partial aware) when present */
      var pts = (r.marks != null && isFinite(Number(r.marks))) ? Number(r.marks) : (st === "correct" ? plus : (st === "skipped" ? 0 : minus));
      return {
        n: i + 1, idx: i, q: q, st: st,
        t: Math.max(0, Number(r.timeSec) || 0),
        sub: (q && q.subject) || "Other",
        ch: (q && (q.chapter || q.chapterTitle)) || "Chapter not tagged",
        diff: diff,
        mine: chosenTxt(q, r.chosen),
        key: correctTxt(q),
        pts: pts
      };
    });
    var tsum = items.reduce(function (a, b) { return a + b.t; }, 0);
    var c = {
      correct: data.correct || 0,
      wrong: data.wrong || 0,
      skipped: data.skipped != null ? data.skipped : (data.total ? data.total - (data.correct || 0) - (data.wrong || 0) : 0)
    };
    if (items.length) {
      c = { correct: 0, wrong: 0, skipped: 0, partial: 0 };
      items.forEach(function (it) { c[it.st] = (c[it.st] || 0) + 1; });
      c.wrong = (c.wrong || 0) + (c.partial || 0);
    }
    return { items: items, hasTime: tsum >= 1, tsum: tsum, c: c, data: data, plus: plus, minus: minus };
  }
  /* qxmd392: "wrong" here includes partially-correct answers; say so when any exist */
  function wrongLab(c) { var p = (c && c.partial) || 0; return p ? "Incorrect / partial (" + p + " partial)" : "Incorrect"; }
  function groupBy(items, keyFn, plus, minus) {
    var g = {}, order = [];
    items.forEach(function (it) {
      var k = keyFn(it);
      if (!g[k]) { g[k] = { k: k, n: 0, correct: 0, wrong: 0, skipped: 0, t: 0, score: 0, max: 0 }; order.push(k); }
      var x = g[k];
      x.n++; x[it.st === "partial" ? "wrong" : it.st]++; if (it.st === "partial") x.partial = (x.partial || 0) + 1; x.t += it.t;
      x.score += it.pts; x.max += plus;
    });
    return order.map(function (k) {
      var x = g[k];
      x.att = x.correct + x.wrong;
      x.acc = pct(x.correct, x.att);
      return x;
    });
  }
  function median(xs) {
    if (!xs.length) return 0;
    var a = xs.slice().sort(function (p, q) { return p - q; });
    return a[Math.floor(a.length / 2)] || 0;
  }
  function mistakes(items) {
    var wr = items.filter(function (i) { return i.st === "wrong" || i.st === "partial"; });
    var corr = items.filter(function (i) { return i.st === "correct" && i.t > 0; });
    var med = median(corr.map(function (i) { return i.t; })) || 45;
    var guess = 0, silly = 0, calc = 0, concept = 0;
    wr.forEach(function (i) {
      if (i.t > 0 && i.t < 15) guess++;
      else if (i.t > 0 && i.t < Math.max(15, med * 0.4)) silly++;
      else if (i.t > med * 1.3) calc++;
      else concept++;
    });
    return { guess: guess, silly: silly, calc: calc, concept: concept, total: wr.length, med: med };
  }
  function timeStats(m, data) {
    var att = m.items.filter(function (i) { return i.st !== "skipped" && i.t > 0; });
    var skips = m.items.filter(function (i) { return i.st === "skipped"; });
    var avg = att.length ? att.reduce(function (a, b) { return a + b.t; }, 0) / att.length : 0;
    var fast = att.slice().sort(function (a, b) { return a.t - b.t; })[0] || null;
    var slow = att.slice().sort(function (a, b) { return b.t - a.t; })[0] || null;
    var wasted = skips.reduce(function (a, b) { return a + b.t; }, 0);
    var used = Number(data.timeUsed) || m.tsum;
    var dur = (data.durationMin || 0) * 60;
    return { avg: avg, fast: fast, slow: slow, wasted: wasted, used: used, dur: dur, attN: att.length };
  }
  function plan(m, chapters, ts, examLabel) {
    var out = [];
    var weak = chapters.filter(function (x) { return x.k !== "Chapter not tagged" && x.att >= 1 && (x.acc < 50 || x.wrong >= 2) && x.wrong > 0; });
    var revise = chapters.filter(function (x) { return x.k !== "Chapter not tagged" && x.att >= 1 && x.acc >= 50 && x.acc < 80; });
    if (weak[0]) out.push("Revise basic " + weak[0].k + " (" + Math.max(15, weak[0].n * 2) + " Qs)");
    if (weak[1]) out.push("Practise " + Math.max(20, weak[1].n * 3) + " questions on " + weak[1].k);
    else if (weak[0]) out.push("Practise " + Math.max(20, weak[0].n * 3) + " questions on " + weak[0].k);
    if (/jee/i.test(examLabel || "")) out.push("Solve previous year questions (" + examLabel + ")");
    if (ts.avg > 45) out.push("Improve time management (target 45 sec/Q)");
    else if (ts.wasted >= 60) out.push("Cut time spent on questions you then leave blank");
    var wr = m.c.wrong || 0, sk = m.c.skipped || 0;
    if (wr + sk) out.push("Reattempt all incorrect and unattempted questions");
    if (revise[0] && out.length < 5) out.push("Quick revision for " + revise[0].k);
    if (!out.length) out.push("Reattempt this test after a short revision and compare accuracy.");
    return out.slice(0, 5);
  }
  function rankOf(data, meta) {
    var hint = [data.examHint, data.examTitle, meta && meta.title, meta && meta.examSlug, meta && meta.testType].filter(Boolean).join(" ");
    if (typeof QxRankEst === "undefined" || !QxRankEst.estimate) {
      var p = data.maxScore ? Math.max(0, data.score / data.maxScore * 100) : 0;
      return { percentile: Math.round(p * 10) / 10, rankFmt: "—", poolFmt: "", band: "", label: "This paper", note: "", applicable: false };
    }
    return QxRankEst.estimate({
      score: data.score,
      maxScore: data.maxScore,
      title: meta && meta.title,
      hint: hint,
      slug: meta && meta.examSlug,
      exam: meta && meta.examSlug
    });
  }
  function subIcon(sub) {
    var s = String(sub || "").toLowerCase();
    if (/math/.test(s)) return "∑";
    if (/phys/.test(s)) return "⚛";
    if (/chem/.test(s)) return "⚗";
    if (/bio|bot|zoo/.test(s)) return "🧬";
    return "📘";
  }
  function stLabel(st) {
    if (st === "correct") return "Correct";
    if (st === "wrong" || st === "partial") return "Wrong";
    return "Unattempted";
  }
  function stCls(st) {
    if (st === "correct") return "ok";
    if (st === "wrong" || st === "partial") return "no";
    return "skip";
  }

  function studentWho(data) {
    if (data && data.student && data.student.name) {
      var s0 = data.student;
      return {
        name: String(s0.name || "Student").trim(),
        first: String(s0.first || String(s0.name || "Student").split(" ")[0]).trim(),
        email: String(s0.email || "").trim(),
        phone: String(s0.phone || "").trim(),
        photo: String(s0.photo || s0.photoURL || "").trim(),
        uid: String(s0.uid || "").trim(),
        guest: !!s0.guest,
        initials: String(s0.initials || "").trim(),
        className: String(s0.className || "").trim(),
        exam: String(s0.exam || "").trim(),
        serial: String(s0.serial || "").trim()
      };
    }
    var u = {}, p = {}, fb = null;
    try { u = JSON.parse(localStorage.getItem("quantrex_user") || "null") || {}; } catch (_) { u = {}; }
    try { if (global.QxProfile && QxProfile.get) p = QxProfile.get() || {}; } catch (_) { p = {}; }
    try { fb = global.firebase && firebase.auth && firebase.auth().currentUser; } catch (_) { fb = null; }
    var name = String((p && p.name) || u.name || u.displayName || (fb && fb.displayName) || "").trim();
    var email = String((p && p.email) || u.email || (fb && fb.email) || "").trim();
    var phone = String((p && p.phone) || u.phone || u.phoneNumber || (fb && fb.phoneNumber) || "").trim();
    var photo = String(u.photoURL || (p && p.photoURL) || (fb && fb.photoURL) || "").trim();
    var uid = String(u.uid || (fb && fb.uid) || "").trim();
    var guest = !uid || uid.indexOf("guest_") === 0;
    if (!name) {
      if (email && email.indexOf("@") > 0) name = email.split("@")[0].replace(/[._]+/g, " ");
      else name = guest ? "Guest student" : "Student";
    }
    name = name.replace(/\s+/g, " ");
    var initials = name.replace(/[^A-Za-z\u0900-\u097F]/g, " ").trim().split(/\s+/).map(function (w) {
      return w.charAt(0);
    }).join("").slice(0, 2).toUpperCase() || "Q";
    var serial = uid ? ("QX-" + uid.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()) : "";
    return {
      name: name,
      first: name.split(" ")[0],
      email: email,
      phone: phone,
      photo: photo,
      uid: uid,
      guest: guest,
      initials: initials,
      className: String((p && p.className) || u.className || "").trim(),
      exam: String((p && p.exam) || u.exam || u.targetExam || "").trim(),
      serial: serial
    };
  }

  function identityHtml(stu, title, when) {
    var photo = stu.photo
      ? '<img class="qx-rc-id-img" src="' + esc(stu.photo) + '" alt="" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
      : "";
    var av = '<span class="qx-rc-id-av"' + (stu.photo ? ' style="display:none"' : "") + ">" + esc(stu.initials || "Q") + "</span>";
    var meta = [stu.className ? ("Class " + stu.className) : "", stu.exam, stu.serial].filter(Boolean).join(" · ");
    return '<section class="qx-rc-id" aria-label="Candidate">' +
      '<div class="qx-rc-id-photo">' + photo + av + "</div>" +
      '<div class="qx-rc-id-who">' +
      '<div class="kicker">Candidate who sat this paper</div>' +
      "<h2>" + esc(stu.name) + "</h2>" +
      (meta ? "<p>" + esc(meta) + "</p>" : "") +
      (stu.guest ? '<p class="qx-rc-id-guest">Sign in next time so this hall card prints in your registered name.</p>' : "") +
      "</div>" +
      '<div class="qx-rc-id-stamp">' +
      "<b>Hall report</b>" +
      "<span>" + esc(when || "") + "</span>" +
      "<span>" + esc(title || "Test") + "</span>" +
      "</div></section>";
  }

  function teacherReview(stu, data, m, chapters, ts, mist, rk, plans) {
    var first = esc(stu.first || "Student");
    var total = data.total || m.items.length || 0;
    var att = (m.c.correct || 0) + (m.c.wrong || 0);
    var acc = pct(m.c.correct, att);
    var skip = m.c.skipped || 0;
    var wr = m.c.wrong || 0;
    var attPct = pct(att, total);
    var weak = chapters.filter(function (x) { return x.k !== "Chapter not tagged" && x.att >= 1 && x.acc < 50 && x.wrong > 0; })
      .sort(function (a, b) { return a.acc - b.acc; });
    var strong = chapters.filter(function (x) { return x.k !== "Chapter not tagged" && x.att >= 1 && x.acc >= 70; })
      .sort(function (a, b) { return b.acc - a.acc; });
    var paras = [];
    paras.push(first + ", I have read this script the way a hall examiner reads thousands of JEE papers: marks first, then how you used the clock, then which chapters actually paid you.");
    if (attPct < 40) {
      paras.push("You attempted only " + att + " of " + total + " (" + attPct + "%). Leaving " + skip + " blank is not safety — it is unused scoring. On the ones you did try, accuracy was " + acc + "%. Next sitting: attempt every question where you can kill two options.");
    } else if (attPct >= 85 && acc < 50) {
      paras.push("You filled " + attPct + "% of the paper but accuracy is " + acc + "%. That pattern is guessing under pressure. Negative marking has already taken " + wr + " wrong hits. Slow down on the last 8–10 bubbles.");
    } else if (acc >= 80 && attPct >= 50) {
      paras.push("Accuracy " + acc + "% on " + att + " attempts is ranker habit. Do not get greedy. Protect this, then add 4–6 more sure attempts — not 15 extra guesses.");
    } else {
      paras.push("Score " + esc(data.score) + "/" + esc(data.maxScore) + " from " + att + " attempts (" + acc + "% accuracy), " + skip + " unattempted. This is a workable script if the next week is honest, not dramatic.");
    }
    if (ts.attN && ts.avg > 70) {
      paras.push("Average " + fmtDur(ts.avg) + " on attempted questions is too slow for this paper. Decide in about 45 seconds or mark for review. You also spent " + fmtDur(ts.wasted) + " on questions you then left.");
    } else if (ts.wasted >= 60) {
      paras.push("You burned " + fmtDur(ts.wasted) + " on questions that stayed blank. Read, decide, move. The clock does not refund hesitation.");
    } else if (ts.attN && ts.avg > 0 && ts.avg < 25 && wr >= 3) {
      paras.push("Many answers went in under " + fmtDur(ts.avg) + " average. Speed without a method is how easy marks leak. Read the last line of the question before you bubble.");
    }
    if (mist.guess >= 2) {
      paras.push(mist.guess + " wrong answers were marked in under 15 seconds. That is not calculation. Stop filling a bubble you have not actually solved.");
    } else if (mist.concept >= 2 && weak[0]) {
      paras.push("Most wrongs look conceptual, not arithmetic. " + esc(weak[0].k) + " paid you " + weak[0].acc + "% on " + weak[0].att + " attempts. That chapter needs a blackboard restart, not another full mock.");
    } else if (weak[0]) {
      paras.push(esc(weak[0].k) + " is the hole in this paper (" + weak[0].correct + "/" + weak[0].att + " correct). One weak chapter in JEE Main is enough to stall a percentile.");
    }
    if (strong[0] && strong[0].k !== (weak[0] && weak[0].k)) {
      paras.push("Keep " + esc(strong[0].k) + " as it is — " + strong[0].acc + "% here. Do not over-revise a chapter that already scores.");
    }
    if (rk && rk.applicable && rk.percentile != null) {
      paras.push("Estimated percentile " + rk.percentile + (rk.rankFmt && rk.rankFmt !== "—" ? (" · estimated rank " + rk.rankFmt) : "") + " from published score tables for " + esc(rk.examLabel || "this exam") + ". This is an estimate, not NTA allotment.");
    }
    var hw = (plans || []).slice(0, 3);
    if (hw.length) paras.push("For the next seven days, only this: " + hw.map(function (p, i) { return (i + 1) + ". " + p; }).join(" "));
    return '<article class="qx-rc-card qx-rc-teacher">' +
      '<div class="qx-rc-teacher-h">' +
      '<span class="qx-rc-teacher-badge">Faculty review</span>' +
      "<h3>Examiner’s note for " + esc(stu.name) + "</h3>" +
      '<p class="qx-rc-teacher-role">Senior faculty · Quantrex Academy · written from this attempt only</p>' +
      "</div>" +
      '<ul class="qx-rc-teacher-bullets">' +
      paras.map(function (p) { return "<li>" + p + "</li>"; }).join("") +
      "</ul></article>";
  }

  function invigilatorHtml(data, stu) {
    var P = global.QxAiProctor;
    var st = null, intel = null;
    try { st = P && P.getState ? P.getState() : null; } catch (_) { st = null; }
    try { intel = P && P.integrityIntel ? P.integrityIntel() : null; } catch (_) { intel = null; }
    var tabN = Number((data && data.tabSwitches) || (st && st.events && st.events.filter(function (e) { return e.type === "tab" || e.type === "blur"; }).length) || 0);
    var first = esc(stu.first || "Student");
    if (!st || !st.proctored) {
      return '<section class="qx-rc-card qx-rc-invig off">' +
        '<div class="qx-rc-invig-h"><span class="qx-rc-invig-ic">👁</span><div><h3>Invigilator report</h3><p>AI Proctor was off for this sitting</p></div></div>' +
        "<p>" + first + ", the camera was not monitoring this attempt. An empty flag list here means the invigilator desk was not switched on — it does not certify the hall. Turn on AI Proctor in Settings before a ranked mock if you want a face-and-tab report on the card.</p>" +
        (tabN ? ("<p>This browser still counted " + tabN + " time(s) you left the test window. In a real NTA sitting that is noticed. Stay on the paper until Submit.</p>") : "") +
        "</section>";
    }
    var evs = (st.events || []).slice();
    var counts = {};
    evs.forEach(function (e) { counts[e.type] = (counts[e.type] || 0) + 1; });
    var faceCov = st.frames ? Math.round(100 * (st.okFrames || 0) / st.frames) : null;
    var score = (intel && intel.score != null) ? intel.score : 100;
    var band = (intel && intel.band) || "good";
    var lines = [];
    if (faceCov != null) {
      lines.push("Face was clearly in frame for " + faceCov + "% of " + st.frames + " on-device checks.");
    }
    if (counts.tab || counts.blur) {
      lines.push("You left the test window " + ((counts.tab || 0) + (counts.blur || 0)) + " time(s). An invigilator would have walked to your seat. Stay on this tab until Submit.");
    }
    if (counts.noface) lines.push("Camera lost your face " + counts.noface + " time(s). Sit so the lens sees you, the way you would sit before a hall invigilator.");
    if (counts.multiface) lines.push("More than one face was seen " + counts.multiface + " time(s). Keep the desk yours alone during a ranked mock.");
    if (counts.lookaway) lines.push("Head-turn / look-away flagged " + counts.lookaway + " time(s). Eyes on the paper.");
    if (counts.copy || counts.paste) lines.push("Copy or paste was recorded. That is not allowed in a hall paper.");
    if (counts.camoff) lines.push("Camera went off or permission was pulled during the sitting.");
    if (!lines.length) {
      lines.push("No significant integrity flags on this sitting. Treat that as a clean hall report for this attempt only — flags are review indicators, never automatic proof of cheating.");
    }
    var chips = Object.keys(counts).map(function (k) {
      return "<li><b>" + counts[k] + "</b><span>" + esc((k === "tab" ? "Tab / app hidden" : k)) + "</span></li>";
    }).join("");
    return '<section class="qx-rc-card qx-rc-invig ' + esc(band) + '">' +
      '<div class="qx-rc-invig-h"><span class="qx-rc-invig-ic">👁</span><div><h3>Invigilator report</h3><p>How ' + esc(stu.name) + " sat this test · AI Proctor on-device</p></div>" +
      '<div class="qx-rc-invig-score ' + esc(band) + '"><b>' + score + "</b><small>/100</small><span>Integrity</span></div></div>" +
      lines.map(function (p) { return "<p>" + p + "</p>"; }).join("") +
      (chips ? '<ul class="qx-rc-invig-chips">' + chips + "</ul>" : "") +
      '<p class="qx-rc-invig-foot">Video stayed on this device and was not uploaded. A flag is a note for review, not a cheating verdict.</p>' +
      "</section>";
  }

  function chapterTable(chapters, withChev) {
    if (!chapters.length) return '<p class="qx-rc-na">Chapters were not tagged on these questions.</p>';
    return '<div class="qx-rc-scroll"><table class="qx-rc-tbl"><thead><tr>' +
      "<th>Chapter</th><th>Qs</th><th>Attempted</th><th>Correct</th><th>Accuracy</th><th>Score</th>" +
      (withChev ? "<th></th>" : "") + "</tr></thead><tbody>" +
      chapters.map(function (x) {
        return "<tr data-qx-rc-goto=\"question\"><td>" + esc(x.k) + "</td><td>" + x.n + "</td><td>" + x.att +
          "</td><td>" + x.correct + '</td><td class="qx-rc-acc ' + accCls(x.acc) + '">' + (x.att ? x.acc + "%" : "—") +
          "</td><td>" + x.score + "/" + x.max + "</td>" +
          (withChev ? '<td class="qx-rc-chev">›</td>' : "") + "</tr>";
      }).join("") + "</tbody></table></div>";
  }
  function questionTable(items, limit) {
    var rows = limit ? items.slice(0, limit) : items;
    if (!items.length) return '<p class="qx-rc-na">Per-question answers were not saved for this attempt.</p>';
    return '<div class="qx-rc-scroll"><table class="qx-rc-tbl"><thead><tr>' +
      "<th>Q.No.</th><th>Your Answer</th><th>Correct Answer</th><th>Result</th><th>Time</th><th>Difficulty</th>" +
      "</tr></thead><tbody>" +
      rows.map(function (i) {
        return "<tr data-st=\"" + stCls(i.st) + "\"><td><button type=\"button\" class=\"qx-rc-qbtn\" data-qxan-q=\"" + i.idx + "\">" + i.n +
          "</button></td><td>" + (i.mine ? esc(i.mine) : "—") + "</td><td>" + (i.key ? esc(i.key) : "n/a") +
          '</td><td><em class="qx-rc-st ' + stCls(i.st) + '">' + stLabel(i.st) + "</em></td><td>" +
          (i.t ? fmtDur(i.t) : "—") + "</td><td>" + (i.diff ? esc(i.diff) : "—") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }

  function overallHtml(data, m, rk, chapters, ts, mist, plans, stu) {
    var total = data.total || m.items.length || 0;
    var att = (m.c.correct || 0) + (m.c.wrong || 0);
    var acc = pct(m.c.correct, att);
    var usedPct = ts.dur ? Math.min(100, Math.round(ts.used / ts.dur * 100)) : 0;
    var scorePct = data.maxScore ? Math.round(Math.max(0, data.score) / data.maxScore * 100) : 0;
    var strong = chapters.filter(function (x) { return x.k !== "Chapter not tagged" && x.att >= 1 && x.acc >= 67; })
      .sort(function (a, b) { return b.acc - a.acc; }).slice(0, 3);
    var weak = chapters.filter(function (x) { return x.k !== "Chapter not tagged" && x.att >= 1 && x.acc < 50; })
      .sort(function (a, b) { return a.acc - b.acc; }).slice(0, 3);

    var stats = '<div class="qx-rc-stats">' +
      '<div class="qx-rc-stat"><div class="ic">📋</div><div class="lab">Questions</div><div class="num">' + total + '</div><div class="pct">Total Questions</div></div>' +
      '<div class="qx-rc-stat"><div class="ic">✅</div><div class="lab">Attempted</div><div class="num">' + att + '</div><div class="pct">(' + pct(att, total) + '%)</div></div>' +
      '<div class="qx-rc-stat"><div class="ic">✅</div><div class="lab">Correct</div><div class="num">' + (m.c.correct || 0) + '</div><div class="pct">(' + pct(m.c.correct, total) + '%)</div></div>' +
      '<div class="qx-rc-stat"><div class="ic">❌</div><div class="lab">' + wrongLab(m.c) + '</div><div class="num">' + (m.c.wrong || 0) + '</div><div class="pct">(' + pct(m.c.wrong, total) + '%)</div></div>' +
      '<div class="qx-rc-stat"><div class="ic">➖</div><div class="lab">Unattempted</div><div class="num">' + (m.c.skipped || 0) + '</div><div class="pct">(' + pct(m.c.skipped, total) + '%)</div></div>' +
      "</div>";

    var ma = '<div class="qx-rc-card"><h3><span class="dot"></span> Marks &amp; Accuracy</h3><div class="qx-rc-ma">' +
      '<div><span>Your Score</span><b>' + esc(data.score) + '<small>/' + esc(data.maxScore) + "</small></b>" +
      '<div class="bar"><i style="width:' + scorePct + '%;background:#3b82f6"></i></div></div>' +
      '<div><span>Accuracy</span><b>' + acc.toFixed(1) + "%</b>" +
      '<div class="bar"><i style="width:' + acc + '%;background:#22c55e"></i></div></div>' +
      '<div><span>Time Taken</span><b>' + fmtMin(ts.used) + "</b><span>out of " + (data.durationMin || "—") + " min</span></div>" +
      "</div></div>";

    var dist = '<div class="qx-rc-card"><h3><span class="dot"></span> Attempt Distribution</h3><div class="qx-rc-donut-row">' +
      donut(m.c.correct, m.c.wrong, m.c.skipped, total, total) +
      '<ul class="qx-rc-leg">' +
      '<li><i style="background:#22c55e"></i> Correct <b>' + (m.c.correct || 0) + " (" + pct(m.c.correct, total) + "%)</b></li>" +
      '<li><i style="background:#ef4444"></i> ' + wrongLab(m.c) + ' <b>' + (m.c.wrong || 0) + " (" + pct(m.c.wrong, total) + "%)</b></li>" +
      '<li><i style="background:#cbd5e1"></i> Unattempted <b>' + (m.c.skipped || 0) + " (" + pct(m.c.skipped, total) + "%)</b></li>" +
      "</ul></div></div>";

    var ch = '<div class="qx-rc-card"><h3><span class="dot"></span> Chapter-wise Performance</h3>' + chapterTable(chapters, true) + "</div>";

    var tm = '<div class="qx-rc-card"><h3><span class="dot"></span> Time Analysis</h3>' +
      '<div class="qx-rc-timebig">' + fmtMin(ts.used) + ' <small>out of ' + (data.durationMin || "—") + " min</small></div>" +
      '<div class="qx-rc-used"><i style="width:' + usedPct + '%"></i></div>' +
      '<div style="font-size:12px;color:#64748b;font-weight:700">' + usedPct + "% used</div>" +
      '<div class="qx-rc-tmetrics">' +
      '<div><div class="k">Avg. Time / Q</div><div class="v">' + (ts.attN ? fmtDur(ts.avg) : "—") + "</div></div>" +
      '<div><div class="k">Fastest Q</div><div class="v">' + (ts.fast ? fmtDur(ts.fast.t) + " <small>(Q. No. " + ts.fast.n + ")</small>" : "—") + "</div></div>" +
      '<div><div class="k">Slowest Q</div><div class="v">' + (ts.slow ? fmtDur(ts.slow.t) + " <small>(Q. No. " + ts.slow.n + ")</small>" : "—") + "</div></div>" +
      '<div><div class="k">Time Wasted</div><div class="v">' + (ts.wasted ? fmtDur(ts.wasted) : "0 sec") + "</div></div>" +
      "</div></div>";

    function swRows(xs, col) {
      if (!xs.length) return '<p class="qx-rc-none">None in this attempt</p>';
      return xs.map(function (x) {
        return '<div class="qx-rc-sw-row"><span>' + esc(x.k) + "</span><b class=\"qx-rc-acc " + accCls(x.acc) + '">' + x.acc +
          '%</b><span class="bar"><i style="width:' + x.acc + "%;background:" + col + '"></i></span></div>';
      }).join("");
    }
    var sw = '<div class="qx-rc-card"><h3><span class="dot"></span> Strength &amp; Weakness</h3><div class="qx-rc-sw">' +
      '<div class="qx-rc-sw-col ok"><h4>✔ Strong Topics</h4>' + swRows(strong, "#22c55e") + "</div>" +
      '<div class="qx-rc-sw-col no"><h4>✘ Weak Topics</h4>' + swRows(weak, "#ef4444") + "</div>" +
      "</div></div>";

    var mistLeg = '<ul class="qx-rc-leg">' +
      '<li><i style="background:#ef4444"></i> Conceptual Mistakes <b>' + pct(mist.concept, mist.total) + "% (" + mist.concept + ")</b></li>" +
      '<li><i style="background:#f59e0b"></i> Calculation Mistakes <b>' + pct(mist.calc, mist.total) + "% (" + mist.calc + ")</b></li>" +
      '<li><i style="background:#3b82f6"></i> Silly Mistakes <b>' + pct(mist.silly, mist.total) + "% (" + mist.silly + ")</b></li>" +
      '<li><i style="background:#a855f7"></i> Guessing Mistakes <b>' + pct(mist.guess, mist.total) + "% (" + mist.guess + ")</b></li>" +
      "</ul>";
    var mistCard = '<div class="qx-rc-card"><h3><span class="dot"></span> AI Mistake Analysis</h3>' +
      (mist.total
        ? ('<div class="qx-rc-mist">' + mistDonut(mist) + mistLeg + "</div>" +
          '<p class="qx-rc-na" style="font-style:normal;margin-top:8px">From this attempt only: guessing = wrong in under 15s; silly = much faster than your correct median; calculation = slower than that median; remaining wrongs = conceptual.</p>')
        : '<p class="qx-rc-na">No wrong answers in this attempt.</p>') +
      "</div>";

    var qh = '<div class="qx-rc-card"><h3><span class="dot"></span> Question-wise Analysis (Top View) ' +
      '<button type="button" class="qx-rc-link" data-qx-rc-goto="question" style="margin-left:auto">View All Questions →</button></h3>' +
      questionTable(m.items, 5) + "</div>";

    var pl = '<div class="qx-rc-card"><h3><span class="dot"></span> Personalized Improvement Plan</h3><ol class="qx-rc-plan">' +
      plans.map(function (p, i) {
        return '<li><span class="n">' + (i + 1) + "</span><span>" + esc(p) + '</span><span class="go">›</span></li>';
      }).join("") + "</ol></div>";

    var teach = teacherReview(stu || studentWho(data), data, m, chapters, ts, mist, rk, plans);
    var invig = invigilatorHtml(data, stu || studentWho(data));

    return stats +
      '<div class="qx-rc-grid">' + ma + dist + "</div>" +
      '<div class="qx-rc-grid">' + ch + tm + "</div>" +
      '<div class="qx-rc-grid">' + sw + mistCard + "</div>" +
      '<div class="qx-rc-grid">' + qh + pl + "</div>" +
      invig +
      teach;
  }

  function timePanel(data, ts, m) {
    var usedPct = ts.dur ? Math.min(100, Math.round(ts.used / ts.dur * 100)) : 0;
    var items = m.items;
    var max = 1;
    items.forEach(function (i) { if (i.t > max) max = i.t; });
    var bars = items.length ? '<div class="qx-rc-scroll" style="padding-bottom:6px">' + items.map(function (i) {
      var w = Math.round(i.t / max * 100);
      var col = i.st === "correct" ? "#22c55e" : (i.st === "skipped" ? "#94a3b8" : "#ef4444");
      return '<div style="display:grid;grid-template-columns:36px 1fr 64px;gap:8px;align-items:center;font-size:12px;margin:3px 0">' +
        '<button type="button" class="qx-rc-qbtn" data-qxan-q="' + i.idx + '">Q' + i.n + "</button>" +
        '<span style="height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden"><i style="display:block;height:100%;width:' + w + "%;background:" + col + '"></i></span>' +
        "<b>" + (i.t ? fmtDur(i.t) : "—") + "</b></div>";
    }).join("") + "</div>" : '<p class="qx-rc-na">Time per question was not recorded.</p>';
    return '<div class="qx-rc-card"><h3>Time Analysis</h3>' +
      '<div class="qx-rc-timebig">' + fmtMin(ts.used) + " <small>of " + (data.durationMin || "—") + " min</small></div>" +
      '<div class="qx-rc-used"><i style="width:' + usedPct + '%"></i></div>' +
      '<div class="qx-rc-tmetrics">' +
      '<div><div class="k">Avg attempted</div><div class="v">' + (ts.attN ? fmtDur(ts.avg) : "—") + "</div></div>" +
      '<div><div class="k">Fastest</div><div class="v">' + (ts.fast ? ("Q" + ts.fast.n + " · " + fmtDur(ts.fast.t)) : "—") + "</div></div>" +
      '<div><div class="k">Slowest</div><div class="v">' + (ts.slow ? ("Q" + ts.slow.n + " · " + fmtDur(ts.slow.t)) : "—") + "</div></div>" +
      '<div><div class="k">On unattempted</div><div class="v">' + fmtDur(ts.wasted) + "</div></div>" +
      "</div><h3 style=\"margin-top:16px\">Time per question</h3>" + bars + "</div>";
  }

  function viewHtml(data, meta) {
    data = data || {};
    meta = meta || {};
    var m = model(data, meta);
    var chapters = groupBy(m.items, function (i) { return i.ch; }, m.plus, m.minus);
    var subjects = groupBy(m.items, function (i) { return i.sub; }, m.plus, m.minus);
    var ts = timeStats(m, data);
    var mist = mistakes(m.items);
    var rk = rankOf(data, meta);
    var plans = plan(m, chapters, ts, rk.examLabel || rk.label);
    var stu = studentWho(data);
    var title = String(meta.title || data.examTitle || "Test");
    var attN = (global._qxLastAttemptSnapshot && global._qxLastAttemptSnapshot.attemptN) || 1;
    var total = data.total || m.items.length || 0;
    var accAtt = (m.c.correct || 0) + (m.c.wrong || 0);
    var acc = pct(m.c.correct, accAtt);
    var scorePct = data.maxScore ? Math.round(Math.max(0, data.score) / data.maxScore * 100) : 0;
    var chipCls = rk.band === "Excellent" || rk.band === "Above Average" ? "good" :
      (rk.band === "Average" ? "" : "warn");

    var subKeys = Object.keys((data.breakdown && data.breakdown.subject) || {});
    if (!subKeys.length) subKeys = subjects.map(function (s) { return s.k; }).filter(function (k) { return k && k !== "Other"; });
    var subjectOrder = ["Mathematics", "Physics", "Chemistry", "Biology", "Botany", "Zoology"];
    var orderedSubs = subjectOrder.filter(function (s) { return subKeys.indexOf(s) >= 0; })
      .concat(subKeys.filter(function (s) { return subjectOrder.indexOf(s) < 0; }));

    var tabs = '<button type="button" class="mk-rc-tab on" data-mk-scope="overall"><span class="mk-rc-tab-ic">▣</span> Overall</button>';
    orderedSubs.forEach(function (s) {
      tabs += '<button type="button" class="mk-rc-tab" data-mk-scope="' + esc(s) + '"><span class="mk-rc-tab-ic">' +
        subIcon(s) + "</span> " + esc(s) + "</button>";
    });
    tabs += '<button type="button" class="mk-rc-tab" data-mk-scope="time"><span class="mk-rc-tab-ic">⏱</span> Time Analysis</button>';
    tabs += '<button type="button" class="mk-rc-tab" data-mk-scope="chapter"><span class="mk-rc-tab-ic">📘</span> Chapter Analysis</button>';
    tabs += '<button type="button" class="mk-rc-tab" data-mk-scope="question"><span class="mk-rc-tab-ic">☰</span> Question Analysis</button>';

    function subPanel(sub) {
      var st = (typeof mkScopeStats === "function") ? null : null;
      var g = subjects.filter(function (x) { return x.k === sub; })[0];
      var rows = m.items.filter(function (i) { return i.sub === sub; });
      var cc = { correct: 0, wrong: 0, skipped: 0 };
      rows.forEach(function (i) { if (i.st === "correct") cc.correct++; else if (i.st === "skipped") cc.skipped++; else { cc.wrong++; if (i.st === "partial") cc.partial = (cc.partial || 0) + 1; } });
      var n = rows.length || (g && g.n) || 0;
      var score = g ? g.score : 0;
      var max = g ? g.max : n * m.plus;
      var att = cc.correct + cc.wrong;
      return '<div class="qx-rc-stats">' +
        '<div class="qx-rc-stat"><div class="lab">Questions</div><div class="num">' + n + "</div></div>" +
        '<div class="qx-rc-stat"><div class="lab">Attempted</div><div class="num">' + att + "</div></div>" +
        '<div class="qx-rc-stat"><div class="lab">Correct</div><div class="num">' + cc.correct + "</div></div>" +
        '<div class="qx-rc-stat"><div class="lab">' + wrongLab(cc) + '</div><div class="num">' + cc.wrong + "</div></div>" +
        '<div class="qx-rc-stat"><div class="lab">Score</div><div class="num">' + score + "/" + max + "</div></div></div>" +
        questionTable(rows);
    }

    var qFilt = '<div class="qx-rc-qfilt" role="tablist">' +
      '<button type="button" class="on" data-qx-qfilt="all">All</button>' +
      '<button type="button" data-qx-qfilt="ok">Correct</button>' +
      '<button type="button" data-qx-qfilt="no">Wrong</button>' +
      '<button type="button" data-qx-qfilt="skip">Unattempted</button></div>';
    var panels = '<div class="mk-rc-panel on" data-mk-scope="overall">' + overallHtml(data, m, rk, chapters, ts, mist, plans, stu) + "</div>";
    orderedSubs.forEach(function (s) {
      panels += '<div class="mk-rc-panel" data-mk-scope="' + esc(s) + '">' + subPanel(s) + "</div>";
    });
    panels += '<div class="mk-rc-panel" data-mk-scope="time">' + timePanel(data, ts, m) + "</div>";
    panels += '<div class="mk-rc-panel" data-mk-scope="chapter"><div class="qx-rc-card"><h3>Chapter Analysis</h3>' + chapterTable(chapters, true) + "</div></div>";
    panels += '<div class="mk-rc-panel" data-mk-scope="question"><div class="qx-rc-card"><h3>Question-wise Analysis</h3>' + qFilt + questionTable(m.items) + "</div></div>";

    var rankLine = rk.applicable ? (rk.rankFmt + ' <span class="sub">(Out of ' + rk.poolFmt + ")</span>") : "—";
    var pctLine = (rk.percentile != null ? rk.percentile : "—");

    return '<header class="qx-rc-brand">' +
      '<div class="qx-rc-brand-left">' +
      '<button type="button" class="mk-rc-back" id="qzAnBack" title="Back">‹</button>' +
      '<img class="qx-rc-logo" alt="Quantrex Academy" src="assets/quantrex-logo-mark.png" width="56" height="56" onerror="this.onerror=null;this.src=\'assets/quantrex-logo-3d-on-clear.png\'">' +
      '<span class="qx-rc-word">QUANTREX <em>ACADEMY</em></span></div>' +
      '<div class="qx-rc-brand-acts">' +
      '<button type="button" class="qx-rc-act" id="qzAnViewSol"><svg viewBox="0 0 24 24" fill="none"><path d="M7 4h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.7"/><path d="M14 4v5h5M8 13h8M8 17h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg> View Solution</button>' +
      '<button type="button" class="qx-rc-act" id="mkRcReattempt"><svg viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Reattempt</button>' +
      '<button type="button" class="qx-rc-act" id="qxRcCopy" title="Copy summary">Copy</button>' +
      '<button type="button" class="qx-rc-act qx-rc-act-pdf" id="qzAnPrint"><svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l5 5v13H7V3z" stroke="currentColor" stroke-width="1.7"/><path d="M14 3v5h5M9 14h6M9 18h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg> Print / PDF</button>' +
      "</div></header>" +
      '<div class="mk-rc-view on" id="mkRcView">' +
      identityHtml(stu, title, fmtWhen(data.startedAt)) +
      '<div class="qx-rc-title-row"><div><h1>Report Card</h1><p class="qx-rc-sub">' + esc(title) + "</p></div>" +
      '<div class="qx-rc-attempt">Attempt ' + esc(attN) + "</div></div>" +
      '<div class="qx-rc-meta"><span>' + esc(fmtWhen(data.startedAt)) + "</span>" +
      "<span>Time Limit: " + esc(data.durationMin || "—") + " min</span>" +
      "<span>No. of Questions: " + total + "</span>" +
      "<span>" + esc(stu.name) + "</span></div>" +
      '<div class="qx-rc-hero" id="qxRcHero">' +
      '<div class="qx-rc-kpi">' + icTrophy() + '<div class="lab">MARKS OBTAINED</div><div class="val" data-qx-count="' + esc(data.score) + '">' +
      esc(data.score) + "<small>/" + esc(data.maxScore) + "</small></div><div class=\"sub\">" + scorePct + "% Score</div></div>" +
      '<div class="qx-rc-kpi">' + icBars() + '<div class="lab">ESTIMATED PERCENTILE</div><div class="val">' + pctLine +
      "</div>" + (rk.band ? '<span class="chip ' + chipCls + '">' + esc(rk.band) + "</span>" : "") + "</div>" +
      '<div class="qx-rc-kpi">' + icTarget() + '<div class="lab">ESTIMATED RANK</div><div class="val" style="font-size:22px">' + rankLine + "</div></div>" +
      '<div class="qx-rc-kpi">' + icCrown() + '<div class="lab">ACCURACY</div><div class="val" data-qx-count="' + acc.toFixed(1) + '">' + acc.toFixed(1) +
      '%</div><div class="qx-rc-accbar"><i style="width:' + acc + '%"></i></div></div>' +
      (rk.note ? '<div class="qx-rc-estnote">' + esc(rk.label) + " · " + esc(rk.note) + "</div>" : "") +
      "</div>" +
      '<nav class="mk-rc-tabs" id="mkRcTabs">' + tabs + "</nav>" +
      '<div class="mk-rc-body" id="mkRcBody">' + panels + "</div>" +
      '<div id="qxPrSlot"></div>' +
      "</div>";
  }

  function unlockScroll() {
    try {
      var html = document.documentElement;
      var body = document.body;
      var main = document.getElementById("app-main");
      [html, body].forEach(function (el) {
        if (!el || !el.style) return;
        el.style.setProperty("overflow-x", "hidden", "important");
        el.style.setProperty("overflow-y", "auto", "important");
        el.style.setProperty("height", "auto", "important");
        el.style.setProperty("max-height", "none", "important");
      });
      if (main && main.style) {
        main.style.setProperty("position", "fixed", "important");
        main.style.setProperty("inset", "0", "important");
        main.style.setProperty("top", "0", "important");
        main.style.setProperty("left", "0", "important");
        main.style.setProperty("right", "0", "important");
        main.style.setProperty("bottom", "0", "important");
        main.style.setProperty("width", "100%", "important");
        main.style.setProperty("height", "100dvh", "important");
        main.style.setProperty("max-height", "100dvh", "important");
        main.style.setProperty("min-height", "0", "important");
        main.style.setProperty("overflow-x", "hidden", "important");
        main.style.setProperty("overflow-y", "scroll", "important");
        main.style.setProperty("z-index", "9500", "important");
        main.style.setProperty("-webkit-overflow-scrolling", "touch");
        main.scrollTop = 0;
      }
      var feet = document.querySelectorAll("#egFoot, .eg-foot, .qzrr-footer-actions, .qx-prac-foot");
      Array.prototype.forEach.call(feet, function (el) {
        if (!el) return;
        if (el.closest && el.closest("#qzAnPage, .mk-sol-view, .mk-rc-page")) return;
        el.style.setProperty("display", "none", "important");
        el.setAttribute("data-qx-rc-hid-foot", "1");
      });
    } catch (_) { /* */ }
  }
  function restoreScroll() {
    try {
      var html = document.documentElement;
      var body = document.body;
      var main = document.getElementById("app-main");
      ["overflow-x", "overflow-y", "height", "max-height"].forEach(function (p) {
        if (html && html.style) html.style.removeProperty(p);
        if (body && body.style) body.style.removeProperty(p);
      });
      if (main && main.style) {
        ["position", "inset", "top", "left", "right", "bottom", "width", "height", "max-height", "min-height", "overflow-x", "overflow-y", "z-index", "-webkit-overflow-scrolling"].forEach(function (p) {
          main.style.removeProperty(p);
        });
      }
      var hid = document.querySelectorAll("[data-qx-rc-hid-foot]");
      Array.prototype.forEach.call(hid, function (el) {
        el.style.removeProperty("display");
        el.removeAttribute("data-qx-rc-hid-foot");
      });
    } catch (_) { /* */ }
  }

  function bind(root, data) {
    if (!root) return;
    unlockScroll();
    var stu = studentWho(data);
    var reduce = false;
    try { reduce = !!(global.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (_) {}
    if (!reduce) {
      var nums = root.querySelectorAll("[data-qx-count]");
      Array.prototype.forEach.call(nums, function (el) {
        var raw = String(el.getAttribute("data-qx-count") || "0");
        var to = parseFloat(raw);
        if (!isFinite(to)) return;
        var suffix = /%/.test(el.textContent) ? "%" : "";
        var small = el.querySelector("small");
        var rest = small ? small.outerHTML : "";
        var t0 = Date.now(), dur = 700;
        function tick() {
          var p = Math.min(1, (Date.now() - t0) / dur);
          var e = 1 - Math.pow(1 - p, 3);
          var n = to * e;
          el.innerHTML = (suffix ? n.toFixed(1) : Math.round(n)) + suffix + rest;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }
    if (!root._qxRcFilt) {
      root._qxRcFilt = true;
      root.addEventListener("click", function (ev) {
        var f = ev.target.closest && ev.target.closest("[data-qx-qfilt]");
        if (f && root.contains(f)) {
          ev.preventDefault();
          var key = f.getAttribute("data-qx-qfilt") || "all";
          var panel = f.closest(".mk-rc-panel") || root;
          panel.querySelectorAll("[data-qx-qfilt]").forEach(function (b) { b.classList.toggle("on", b === f); });
          panel.querySelectorAll("tr[data-st]").forEach(function (tr) {
            tr.style.display = (key === "all" || tr.getAttribute("data-st") === key) ? "" : "none";
          });
          return;
        }
        if (ev.target.closest && ev.target.closest("#qxRcCopy") && root.contains(ev.target.closest("#qxRcCopy"))) {
          ev.preventDefault();
          var d = data || global._qxLastAnalysis || {};
          var txt = [
            "Quantrex Academy Report Card",
            "Candidate: " + stu.name,
            "Paper: " + (d.examTitle || ""),
            "Score: " + d.score + "/" + d.maxScore,
            "Correct: " + d.correct + "  Wrong: " + d.wrong + "  Unattempted: " + d.skipped,
            "Time: " + fmtMin(d.timeUsed || 0)
          ].join("\n");
          function ok() { if (typeof global.showToast === "function") global.showToast("Summary copied"); }
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok);
            else ok();
          } catch (_) { ok(); }
        }
      });
    }
  }

  global.QxReportCard = {
    viewHtml: viewHtml,
    model: model,
    studentWho: studentWho,
    bind: bind,
    unlockScroll: unlockScroll,
    restoreScroll: restoreScroll
  };
})(typeof window !== "undefined" ? window : this);
