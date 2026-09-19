/* ExamGOAL-faithful PYQ practice/test chrome — Quantrex Academy */
(function (global) {
  "use strict";

  function ensureCss() {
    let l = document.getElementById("egTestUiCss");
    if (!l) l = document.querySelector('link[href*="examgoal-test-ui.css"]');
    if (!l) {
      l = document.createElement("link");
      l.id = "egTestUiCss";
      l.rel = "stylesheet";
      document.head.appendChild(l);
    } else if (!l.id) {
      l.id = "egTestUiCss";
    }
    const href = "assets/examgoal-test-ui.css?v=" + encodeURIComponent(global.QX_BUILD || "qxmd191");
    if (l.getAttribute("href") !== href) l.href = href;
    let chrome = document.getElementById("qxPracChromeCss");
    if (!chrome) {
      chrome = document.createElement("link");
      chrome.id = "qxPracChromeCss";
      chrome.rel = "stylesheet";
      document.head.appendChild(chrome);
    }
    const ch = "assets/qx-prac-chrome.css?v=" + encodeURIComponent(global.QX_BUILD || "qxmd202");
    if (chrome.getAttribute("href") !== ch) chrome.href = ch;
    let both = document.getElementById("qxBothThemesCss");
    if (!both) {
      both = document.createElement("link");
      both.id = "qxBothThemesCss";
      both.rel = "stylesheet";
      document.head.appendChild(both);
    }
    const bh = "assets/qx-both-themes.css?v=" + encodeURIComponent(global.QX_BUILD || "qxmd202");
    if (both.getAttribute("href") !== bh) both.href = bh;
    let r = document.getElementById("qxPracticeReadCss");
    if (!r) {
      r = document.createElement("link");
      r.id = "qxPracticeReadCss";
      r.rel = "stylesheet";
      document.head.appendChild(r);
    }
    const rh = "assets/qx-practice-read.css?v=" + encodeURIComponent(global.QX_BUILD || "qxmd182");
    if (r.getAttribute("href") !== rh) r.href = rh;
  }

  function isExamgoalUi(session) {
    if (!session) return false;
    if (session.uiMode === "quizrr") return false;
    return true;
  }


  /** qxtool9/qxfast3: review/visited may be Array/Object after persist — always coerce to Set */
  function toIndexSet(v, fallbackArr) {
    if (v instanceof Set) return v;
    if (Array.isArray(v)) return new Set(v.map(Number).filter(function (n) { return Number.isFinite(n); }));
    if (v && typeof v === "object") {
      var out = [];
      Object.keys(v).forEach(function (k) {
        var n = Number(v[k]);
        if (!Number.isFinite(n)) n = Number(k);
        if (Number.isFinite(n)) out.push(n);
      });
      return new Set(out);
    }
    return new Set(Array.isArray(fallbackArr) ? fallbackArr : []);
  }
  function normalizeSessionSets(session) {
    if (!session) return session;
    try { session.review = toIndexSet(session.review, []); } catch (_) { session.review = new Set(); }
    try {
      var fb = session.idx != null ? [session.idx] : [];
      session.visited = toIndexSet(session.visited, fb);
    } catch (_) { session.visited = new Set(session.idx != null ? [session.idx] : []); }
    return session;
  }


  /** qxeg1/qxeg3: top strip + right palette are INDEPENDENT (✕ closes one only) */
  function chromeFlags(session) {
    if (!session) return { stripOpen: false, sideOpen: false, previewOpen: false, anyOpen: false, bothOpen: false };
    if (session._egStripOpen == null && session._egSideOpen == null) {
      // migrate legacy single-flag sessions once
      if (session._egSideUserOpened && session._egSideCollapsed === false) {
        session._egStripOpen = true;
        session._egSideOpen = true;
      } else {
        session._egStripOpen = true;
        session._egSideOpen = true;
      }
    }
    if (session._egStripOpen == null) session._egStripOpen = false;
    if (session._egSideOpen == null) session._egSideOpen = false;
    if (session._egPreviewOpen == null) session._egPreviewOpen = false;
    session._egStripOpen = !!session._egStripOpen;
    session._egSideOpen = !!session._egSideOpen;
    session._egPreviewOpen = !!session._egPreviewOpen;
    // keep legacy mirrors for older CSS/callers
    session._egSideCollapsed = !session._egSideOpen;
    if (session._egSideOpen || session._egStripOpen || session._egPreviewOpen) session._egSideUserOpened = true;
    return {
      stripOpen: session._egStripOpen,
      sideOpen: session._egSideOpen,
      previewOpen: session._egPreviewOpen,
      anyOpen: !!(session._egStripOpen || session._egSideOpen || session._egPreviewOpen),
      bothOpen: !!(session._egStripOpen && session._egSideOpen)
    };
  }

  /** qxmd167: palette layout preference — side | strip | both (default side = simple) */
  var EG_PALETTE_PREF_KEY = "qx_eg_palette_mode";
  function getPalettePref() {
    try {
      if (typeof QxSettings !== "undefined" && QxSettings.getPaletteMode) {
        return QxSettings.getPaletteMode();
      }
    } catch (_) { /* */ }
    try {
      var v = localStorage.getItem(EG_PALETTE_PREF_KEY);
      if (v === "side" || v === "strip" || v === "both") return v;
    } catch (_) { /* */ }
    return "both";
  }
  function setPalettePref(mode) {
    var m = mode === "side" || mode === "strip" || mode === "both" ? mode : "side";
    try { localStorage.setItem(EG_PALETTE_PREF_KEY, m); } catch (_) { /* */ }
    try {
      if (typeof QxSettings !== "undefined" && QxSettings.setPaletteMode) QxSettings.setPaletteMode(m);
    } catch (_) { /* */ }
    return m;
  }
  /** Apply preference when user opens Palette (does not force-close the other independently). */
  function applyPalettePrefOpen(session) {
    var pref = getPalettePref();
    if (pref === "side") {
      session._egSideOpen = true;
      session._egSideCollapsed = false;
      session._egSideUserOpened = true;
    } else if (pref === "strip") {
      session._egStripOpen = true;
      session._egSideUserOpened = true;
    } else {
      session._egStripOpen = true;
      session._egSideOpen = true;
      session._egSideCollapsed = false;
      session._egSideUserOpened = true;
    }
  }

  /** Plain stem snippet for Questions Preview rows (ExamGoal-style). qxmd174: never leave raw \mathrm/\lim. */
  function stemPreviewText(q) {
    if (!q) return "Question";
    if (typeof global.qPreview === "function") {
      try {
        const t = global.qPreview(q.q || q.question || q.stem || "");
        if (t && !/\\[a-zA-Z]/.test(t)) return t;
      } catch (_) { /* */ }
    }
    let s = String(q.q || q.question || q.stem || "");
    s = s.replace(/<table[\s\S]*?<\/table>/gi, " ");
    s = s.replace(/<img\b[^>]*>/gi, " ");
    s = s.replace(/<[^>]+>/g, " ");
    s = s.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
      .replace(/&[a-z]+;/gi, " ");
    s = s.replace(/\$\$[\s\S]*?\$\$/g, " ");
    s = s.replace(/\\\[[\s\S]*?\\\]/g, " ");
    s = s.replace(/\\\([\s\S]*?\\\)/g, " ");
    s = s.replace(/\$([^$]*)\$/g, (_, inner) => {
      return String(inner)
        .replace(/\\(?:mathrm|mathbf|mathbb|mathcal|text|textbf|textit)\s*\{([^{}]*)\}/gi, "$1")
        .replace(/\\(?:left|right)\s*/g, "")
        .replace(/\\(?:frac|dfrac|tfrac)\s*\{([^{}]*)\}\s*\{([^{}]*)\}/gi, "($1)/($2)")
        .replace(/\\(?:lim|int|sum|prod|log|ln|sin|cos|tan|sqrt)(?![a-zA-Z])/g, " ")
        .replace(/\\[a-zA-Z]+\s*\{([^{}]*)\}/g, "$1")
        .replace(/\\[a-zA-Z]+/g, " ")
        .replace(/[_^]\{([^{}]*)\}/g, "$1")
        .replace(/[_^]/g, "")
        .replace(/[{}]/g, "");
    });
    // Bare leftover TeX (after $$ strip bug leftovers)
    s = s.replace(/\\(?:mathrm|mathbf|mathbb|mathcal|text|textbf|textit)\s*\{([^{}]*)\}/gi, "$1");
    s = s.replace(/\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g, " ");
    s = s.replace(/\\[a-zA-Z]+\s*\{([^{}]*)\}/g, "$1");
    s = s.replace(/\\[a-zA-Z]+/g, " ");
    s = s.replace(/[{}$]/g, " ").replace(/\s+/g, " ").trim();
    if (s.length > 140) s = s.slice(0, 140).replace(/\s+\S*$/, "") + "…";
    return s || "Question";
  }


  function canonSubject(raw) {
    const s = String(raw || "").trim();
    if (/math/i.test(s)) return "Mathematics";
    if (/chem/i.test(s)) return "Chemistry";
    if (/phys/i.test(s)) return "Physics";
    if (/botany/i.test(s)) return "Botany";
    if (/zoolog/i.test(s)) return "Zoology";
    if (/bio/i.test(s)) return "Biology";
    if (/english/i.test(s)) return "English";
    if (/gs|general stud/i.test(s)) return "General Studies";
    if (/science/i.test(s)) return "General Science";
    return s || "Questions";
  }

  function subjectGroups(session, getQFn) {
    const groups = [];
    const map = {};
    const ids = (session && session.ids) || [];
    const getQ = getQFn || (typeof global.getQ === "function" ? global.getQ : function () { return null; });
    for (let i = 0; i < ids.length; i++) {
      let name = "Questions";
      if (session.sections && session.sections.length) {
        const sec = session.sections.find(function (s) {
          return i >= s.start && i < s.start + (s.count || 0);
        });
        if (sec) name = sec.subject || sec.label || name;
      }
      const q = getQ(ids[i]);
      if (q && (q.subject || q.Subject)) name = q.subject || q.Subject;
      name = canonSubject(name);
      if (!map[name]) {
        map[name] = { name: name, indices: [] };
        groups.push(map[name]);
      }
      map[name].indices.push(i);
    }
    if (!groups.length) {
      groups.push({
        name: "Questions",
        indices: ids.map(function (_, i) { return i; })
      });
    }
    return groups;
  }

  function groupOf(session, idx, groups) {
    const gs = groups || subjectGroups(session, global.getQ);
    return gs.find(function (g) { return g.indices.indexOf(idx) >= 0; }) || gs[0];
  }

  function localNum(session, idx, groups) {
    const g = groupOf(session, idx, groups);
    if (!g) return idx + 1;
    const p = g.indices.indexOf(idx);
    return p >= 0 ? p + 1 : idx + 1;
  }

  function ico(path) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + "</svg>";
  }

  function formatQTime(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
  }

  function formatClock(sec) {
    const s = Math.max(0, Math.floor(sec == null ? 0 : sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
  }

  function qTypeLabel(q, isNumQ, isMultiQ) {
    if (isNumQ) return "Numerical Answer";
    if (isMultiQ) return "MCQ Multiple Correct";
    if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.typeLabel) {
      const t = QuantrexQFormat.getType(q);
      if (t === "numerical") return "Numerical Answer";
      if (t === "multipleCorrect") return "MCQ Multiple Correct";
    }
    return "MCQ Single Answer";
  }

  function paletteStatus(session, i, helpers) {
    normalizeSessionSets(session);
    const hasAns = helpers && helpers.hasAnswerAt ? helpers.hasAnswerAt(i) : false;
    const visited = !!(session.visited && session.visited.has(i));
    const marked = !!(session.review && session.review.has(i));
    const practice = !!session.practiceMode;
    const revealed = egCheckedAt(session, i);
    if (practice) {
      if (revealed && hasAns) {
        return (session._egCorrect && session._egCorrect[i]) ? "eg-correct" : "eg-wrong";
      }
      if (marked && hasAns) return "eg-att-mark";
      if (marked) return "eg-marked";
      if (hasAns) return "eg-att";
      if (visited) return "eg-seen";
      return "eg-unseen";
    }
    if (marked && hasAns) return "eg-att-mark";
    if (marked) return "eg-marked";
    if (hasAns) return "eg-attempted";
    if (visited) return "eg-seen-test";
    return "eg-unseen";
  }

  function posNeg(session, q, isNumQ, isMultiQ) {
    const sc = session.scoring || { correct: 4, wrong: -1 };
    const pos = isNumQ ? (sc.numericalCorrect != null ? sc.numericalCorrect : 4)
      : (isMultiQ ? (sc.multiCorrect != null ? sc.multiCorrect : 4) : (sc.correct != null ? sc.correct : 4));
    const neg = isNumQ ? 0 : (sc.wrong != null ? sc.wrong : -1);
    return { pos: pos, neg: neg };
  }


  /** True if practice checked/show flags say reveal solution for index i */
  function egCheckedAt(session, i) {
    if (!session || !session._egChecked) return false;
    if (session._egChecked[i]) return true;
    try {
      if (session._egChecked[String(i)]) return true;
    } catch (_) { /* */ }
    return false;
  }

  function wantShowSol(session, idx) {
    if (!session || !session.practiceMode) return false;
    var i = idx != null ? idx : session.idx;
    return egCheckedAt(session, i);
  }

  function solutionHtml(q) {
    let solContent = "";
    try {
      if (typeof QuantrexSolution !== "undefined" && QuantrexSolution.renderBlock) {
        solContent = QuantrexSolution.renderBlock(q);
        try {
          if (QuantrexSolution.stripLeadingStemEcho) {
            solContent = QuantrexSolution.stripLeadingStemEcho(solContent, q);
          }
        } catch (_) { /* */ }
        solContent = String(solContent || "").replace(/<(div|p|section)[^>]*class="[^"]*(?:eg-q-stem|mtk-q-text|qa-q)[^"]*"[\s\S]*?<\/\1>/gi, "");
      }
    } catch (_) { /* */ }
    if (!solContent) {
      const sol = q && (q.solution || q.sol || q.explanation) || "";
      const plain = String(sol).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (!plain || /solution not available|support us by uploading|community solution|official solution is not available/i.test(plain)) {
        solContent = '<p class="qx-sol-missing">Solution not available.</p>';
      } else {
        let cleanSol = sol;
        try {
          if (typeof QuantrexSolution !== "undefined" && QuantrexSolution.stripLeadingStemEcho) {
            cleanSol = QuantrexSolution.stripLeadingStemEcho(sol, q);
          }
        } catch (_) { /* */ }
        let html = cleanSol;
        try {
          if (typeof MathTextRenderer !== "undefined" && MathTextRenderer.render) {
            html = MathTextRenderer.render(cleanSol);
          } else if (typeof Mx !== "undefined" && Mx.html) {
            html = Mx.html(cleanSol);
          }
        } catch (_) {
          html = typeof Mx !== "undefined" && Mx.html ? Mx.html(cleanSol) : cleanSol;
        }
        solContent = '<div class="qx-content sol-body qx-sol-flow">' + html + "</div>";
      }
    }
    /* Difficulty ONLY in solution panel (never on question view) */
    let diffBadge = "";
    try {
      if (typeof qxDifficultyTag === "function") {
        const tag = qxDifficultyTag(q);
        if (tag) diffBadge = '<div class="eg-sol-diff-row">' + tag + "</div>";
      }
    } catch (_) { /* */ }
    if (!diffBadge) {
      const diffRaw = (q && (q.difficulty || q.Difficulty)) ? String(q.difficulty || q.Difficulty) : "";
      if (diffRaw) {
        const dLow = diffRaw.toLowerCase();
        const diffCls = /hard/.test(dLow) ? "diff-hard" : (/easy/.test(dLow) ? "diff-easy" : "diff-medium");
        const lab = diffRaw.charAt(0).toUpperCase() + diffRaw.slice(1).toLowerCase();
        diffBadge = '<div class="eg-sol-diff-row"><span class="tag tag-diff ' + diffCls + ' eg-diff-compact">' +
          lab.replace(/</g, "&lt;") + "</span></div>";
      }
    }
    return diffBadge + solContent;
  }

  function dwellSec(session) {
    const stored = (session.qTimes && session.qTimes[session.idx]) || 0;
    const enter = session._qEnterAt || Date.now();
    const extra = Math.max(0, Math.round((Date.now() - enter) / 1000));
    return stored + extra;
  }

  function render(ctx) {
    try {
    try { ensureCss(); } catch (_egCssErr) { /* never abort render for CSS */ }
    const session = ctx.session;
    normalizeSessionSets(session);
    const q = ctx.q;
    const practice = !!session.practiceMode;
    const theme = ctx.testTheme || (typeof getTestTheme === "function" ? getTestTheme() : "light");
    const fontScale = ctx.fontScale || (typeof getTestFontScale === "function" ? getTestFontScale() : "medium");
    const groups = subjectGroups(session, typeof getQ === "function" ? getQ : null);
    const curGroup = groupOf(session, session.idx, groups);
    const qno = localNum(session, session.idx, groups);
    const marks = posNeg(session, q, ctx.isNumQ, ctx.isMultiQ);
    const typeLab = qTypeLabel(q, ctx.isNumQ, ctx.isMultiQ);
    try {
      if (typeof QuantrexStrip !== "undefined" && QuantrexStrip.enrichQuestionPaperMetaSync) {
        QuantrexStrip.enrichQuestionPaperMetaSync(q);
      }
    } catch (_) { /* */ }
    // qxtool8: one toolbar (no Flag/Zoom); solution-like info pills; mobile-default + All-Q desktop mode
    let examLine = "";
    let dateShiftChips = "";
    try {
      let bits = null;
      if (typeof qxParsePaperBits === "function") bits = qxParsePaperBits(q) || {};
      const exam = bits && bits.exam ? String(bits.exam) : "";
      const year = bits && bits.year ? String(bits.year) : "";
      const date = bits && bits.date ? String(bits.date) : "";
      const shift = bits && bits.shift ? String(bits.shift) : "";
      const mode = bits && bits.mode ? String(bits.mode) : "";
      const parts = [];
      if (exam) parts.push(exam + (year ? " " + year : ""));
      else if (year) parts.push(year);
      if (mode) parts.push("(" + mode + ")");
      if (date) parts.push(date);
      if (shift) parts.push(shift);
      if (parts.length) {
        examLine = parts.join(" ").replace(/</g, "&lt;");
      }
      /* Solution-like meta pills on question (NO difficulty) */
      const examLab = (exam ? (exam + (year ? " " + year : "")) : (year || "")).trim();
      if (examLab) {
        dateShiftChips += '<span class="qx-paper-chip qx-paper-exam"><span class="qx-paper-exam-txt">' +
          examLab.replace(/</g, "&lt;") + "</span></span>";
      }
      if (date) {
        dateShiftChips += '<span class="qx-paper-chip qx-paper-date">📅 ' + date.replace(/</g, "&lt;") + "</span>";
      }
      if (shift) {
        dateShiftChips += '<span class="qx-paper-chip qx-paper-shift">' + shift.replace(/</g, "&lt;") + "</span>";
      }
      if (!examLine) {
        let paperMeta = "";
        try {
          paperMeta = (typeof qxPaperMetaBlock === "function")
            ? qxPaperMetaBlock(q)
            : (typeof QuantrexStrip !== "undefined" && QuantrexStrip.paperMetaHtml
              ? QuantrexStrip.paperMetaHtml(q, { includeChapter: false, includeSubject: false })
              : "");
        } catch (_) { paperMeta = ""; }
        if (paperMeta) {
          const raw = String(paperMeta).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (raw) examLine = raw.replace(/</g, "&lt;");
          const pick = function (cls) {
            const re = new RegExp("<span[^>]*class=\"[^\"]*" + cls + "[^\"]*\"[^>]*>[\\s\\S]*?<\\/span>", "i");
            const m = String(paperMeta).match(re);
            return m ? m[0] : "";
          };
          if (!dateShiftChips) dateShiftChips = (pick("qx-paper-exam") + pick("qx-paper-date") + pick("qx-paper-shift")).trim();
        }
      }
    } catch (_) { /* */ }

    const titleEsc = String(session.title || "Test").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const stem = typeof ctx.renderQuestionText === "function" ? ctx.renderQuestionText(q, ctx.textReady) : "";
    const showSol = wantShowSol(session, session.idx);
    const hasAns = ctx.hasAnswerAt ? ctx.hasAnswerAt(session.idx) : session.answers[session.idx] != null;
    const fmtOpen = !!session._egFmtOpen;
    const starred = session.review && session.review.has(session.idx);

    const tabs = groups.map(function (g) {
      const on = curGroup && g.name === curGroup.name;
      /* qxeg6: subject name ONLY — never append question count (no "Mathematics 22") */
      return '<button type="button" class="eg-sub' + (on ? " on" : "") + '" data-eg-sub="' +
        String(g.name).replace(/"/g, "") + '">' + g.name + "</button>";
    }).join("");
    const qbar = (curGroup && curGroup.indices || []).map(function (i, li) {
      const st = paletteStatus(session, i, ctx);
      const cur = i === session.idx ? " cur" : "";
      const nlab = String(li + 1);
      return '<button type="button" class="eg-qbar-n eg-q-dot ' + st + cur + '" data-qidx="' + i + '" data-qnum="' + nlab + '" title="Question ' + nlab + '" aria-label="Question ' + nlab + '">' + nlab + "</button>";
    }).join("");

    function countStatus(g, st) {
      let n = 0;
      g.indices.forEach(function (i) {
        if (paletteStatus(session, i, ctx) === st) n++;
      });
      return n;
    }

    const palHtml = groups.map(function (g) {
      const cells = g.indices.map(function (i, li) {
        const st = paletteStatus(session, i, ctx);
        const cur = i === session.idx ? " cur" : "";
        return '<button type="button" class="eg-pal-cell mtk-pal-cell ' + st + cur + '" data-qidx="' + i + '">' + (li + 1) + "</button>";
      }).join("");
      let counts;
      if (practice) {
        /* qxmd170: counts must cover every paletteStatus class used by grid cells */
        counts = '<span><i class="eg-dot correct"></i> ' + countStatus(g, "eg-correct") +
          '</span><span><i class="eg-dot wrong"></i> ' + countStatus(g, "eg-wrong") +
          '</span><span><i class="eg-dot att"></i> ' + countStatus(g, "eg-att") +
          '</span><span><i class="eg-dot marked"></i> ' + countStatus(g, "eg-marked") +
          '</span><span><i class="eg-dot att-mark"></i> ' + countStatus(g, "eg-att-mark") +
          '</span><span><i class="eg-dot seen-p"></i> ' + countStatus(g, "eg-seen") +
          '</span><span><i class="eg-dot unseen"></i> ' + countStatus(g, "eg-unseen") + "</span>";
      } else {
        counts = '<span><i class="eg-dot attempted"></i> ' + countStatus(g, "eg-attempted") +
          '</span><span><i class="eg-dot att-mark"></i> ' + countStatus(g, "eg-att-mark") +
          '</span><span><i class="eg-dot marked"></i> ' + countStatus(g, "eg-marked") +
          '</span><span><i class="eg-dot seen-t"></i> ' + countStatus(g, "eg-seen-test") +
          '</span><span><i class="eg-dot unseen"></i> ' + countStatus(g, "eg-unseen") + "</span>";
      }
      return '<div class="eg-sg"><h4>' + g.name + '</h4><div class="eg-sg-counts">' + counts +
        '</div><div class="eg-grid">' + cells + "</div></div>";
    }).join("");

    const legend = practice
      ? '<div class="eg-legend"><span><i class="eg-dot correct"></i>Correct</span><span><i class="eg-dot wrong"></i>Wrong</span>' +
        '<span><i class="eg-dot att"></i>Answered</span><span><i class="eg-dot marked"></i>Marked</span>' +
        '<span><i class="eg-dot att-mark"></i>Ans+Mark</span>' +
        '<span><i class="eg-dot seen-p"></i>Seen</span><span><i class="eg-dot unseen"></i>Unseen</span></div>'
      : '<div class="eg-legend"><span><i class="eg-dot attempted"></i>Answered</span><span><i class="eg-dot marked"></i>Marked</span>' +
        '<span><i class="eg-dot att-mark"></i>Ans+Mark</span><span><i class="eg-dot seen-t"></i>Not ans</span>' +
        '<span><i class="eg-dot unseen"></i>Not visited</span></div>';

    const timer = '<span class="eg-timer" id="egTimer">' +
      formatClock(session.remainingSec != null ? session.remainingSec : 0) + "</span>";
    const palPref = getPalettePref();
    const fmtSec = practice
      ? '<h5 class="eg-fmt-pal-h eg-fmt-more-h">More</h5><div class="eg-fmt-row eg-fmt-more" role="group" aria-label="More tools">' +
        '<button type="button" data-eg-fmt-act="star" title="Bookmark">Bookmark</button>' +
        '<button type="button" data-eg-fmt-act="plus" title="Create group">Group</button>' +
        '<button type="button" data-eg-fmt-act="full" title="Fullscreen">Full</button>' +
        '<button type="button" data-eg-fmt-act="report" title="Report question">Report</button>' +
        "</div>"
      : "";
    const fmt = fmtOpen
      ? '<div class="eg-fmt-pop" id="egFmtPop"><h5>Text size</h5><div class="eg-fmt-row">' +
        '<button type="button" data-eg-scale="small"' + (fontScale === "small" ? ' class="on"' : "") + ">A−</button>" +
        '<button type="button" data-eg-scale="medium"' + (fontScale === "medium" ? ' class="on"' : "") + ">A</button>" +
        '<button type="button" data-eg-scale="large"' + (fontScale === "large" ? ' class="on"' : "") + ">A+</button>" +
        '</div><h5 class="eg-fmt-pal-h">Palette</h5><div class="eg-fmt-row eg-fmt-pal" role="group" aria-label="Palette layout">' +
        '<button type="button" data-eg-pal="side"' + (palPref === "side" ? ' class="on"' : "") + ' title="Right sidebar">Right</button>' +
        '<button type="button" data-eg-pal="strip"' + (palPref === "strip" ? ' class="on"' : "") + ' title="Top question bar">Top</button>' +
        '<button type="button" data-eg-pal="both"' + (palPref === "both" ? ' class="on"' : "") + ' title="Right sidebar and top bar">Both</button>' +
        "</div>" + fmtSec + "</div>"
      : "";

    const checkRow = practice
      ? '<div class="eg-action-row">' +
        '<div class="eg-check-wrap"><button type="button" class="eg-check" id="egCheckBtn">Check Answer</button></div>' +
        '<button type="button" class="eg-note" id="egNoteBtn">Add a Note</button></div>'
      : "";
    /* qxmd176: toggle ON whenever solution is open (Check Answer or Show Answer) */
    const showSwitch = '<label class="eg-show"><span class="eg-switch"><input type="checkbox" id="egShowAns"' +
      (wantShowSol(session, session.idx) ? " checked" : "") +
      '><span class="eg-switch-knob" aria-hidden="true"></span></span> Show Answer</label>';
    const lastQ = session.idx >= session.ids.length - 1;
    const firstQ = session.idx <= 0;
    const mode = practice ? "PRACTICE" : "TEST";
    const isMobileEg = !!(window.matchMedia && window.matchMedia("(max-width: 900px)").matches);

    /* qxeg1: DEFAULT both hidden; All-Q opens both; ✕ closes strip/side INDEPENDENTLY */
    normalizeSessionSets(session);
    const cf0 = chromeFlags(session);
    const stripOpen = cf0.stripOpen;
    const sideOpen = cf0.sideOpen;
    const collapsed = !sideOpen; /* legacy alias: side closed */
    const footClose = (sideOpen && isMobileEg)
      ? '<button type="button" class="eg-btn eg-btn-close-pal" id="egFootClose" title="Close palette">✕ Close</button>'
      : "";
    /* Prev/Next always present; Marks-like Mark|Clear + Save&Next on mobile */
    /* qxmd171 Marks foot DOM; qxmd173 mobile CSS hides Clear — Prev|Next primary; Show Answer unchanged */
    const foot = practice
      ? '<div class="eg-foot eg-foot-practice eg-marks-foot" id="egFoot" style="display:flex!important;flex-direction:column!important;background:#ffffff!important;border-top:1px solid #e5e7eb!important;box-shadow:none!important;position:fixed!important;left:0!important;right:0!important;bottom:0!important;z-index:2147483000!important;padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px))!important;gap:8px!important;">' +
        '<div class="eg-foot-extra eg-foot-left" id="egFootExtra" style="background:#ffffff!important;width:100%!important;">' +
        showSwitch +
        '<button type="button" class="eg-btn eg-btn-review" id="qxReviewNextBtn">Mark for Review</button>' +
        '<button type="button" class="eg-btn eg-btn-clear" id="qxClearBtn">Clear Response</button>' +
        "</div>" +
        '<div class="eg-foot-nav eg-foot-right" style="display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;width:100%!important;order:99!important;visibility:visible!important;">' +
        (footClose || "") +
        '<button type="button" class="eg-btn eg-btn-more" id="egFootMore" title="More" aria-label="More" aria-expanded="false" hidden>⋯</button>' +
        '<button type="button" class="eg-btn" id="qxPrevBtn" style="display:inline-flex!important;visibility:visible!important;opacity:1!important;min-height:48px!important;background:#ffffff!important;color:#1565C0!important;border:2px solid #1565C0!important;border-radius:10px!important;font-weight:800!important;"' + (firstQ ? " disabled" : "") + ">Previous</button>" +
        '<button type="button" class="eg-btn eg-btn-next" id="qxNextBtn" style="display:inline-flex!important;visibility:visible!important;opacity:1!important;min-height:48px!important;background:#1565C0!important;color:#ffffff!important;border:2px solid #1565C0!important;border-radius:10px!important;font-weight:800!important;"' + (lastQ ? " disabled" : "") + ">Next</button>" +
        "</div>" +
        '<div class="eg-foot-sheet-scrim" id="egFootSheetScrim" hidden aria-hidden="true"></div>' +
        "</div>"
      : '<div class="eg-foot" id="egFoot">' +
        '<div class="eg-foot-left">' +
        '<button type="button" class="eg-btn" id="qxReviewNextBtn">Mark for Review &amp; Next</button>' +
        '<button type="button" class="eg-btn" id="qxClearBtn">Clear Response</button></div>' +
        '<div class="eg-foot-right">' +
        (footClose || "") +
        '<button type="button" class="eg-btn" id="qxPrevBtn"' + (firstQ ? " disabled" : "") + ">Previous</button>" +
        '<button type="button" class="eg-btn eg-btn-next" id="qxSaveBtn">Save &amp; Next</button>' +
        "</div>" +
        '<button type="button" class="eg-submit eg-submit-always" id="qxSubmitTop" data-eg-submit="1"' +
        ' onclick="event.preventDefault();event.stopPropagation();if(window.qxSubmitTest){window.qxSubmitTest();}return false;">Submit</button>' +
        "</div>";
    const submitSide = practice ? "" :
      '<div class="eg-side-foot"><button type="button" class="eg-submit" id="qxSubmitBtn" data-eg-submit="1"' +
      ' onclick="event.preventDefault();event.stopPropagation();if(window.qxSubmitTest){window.qxSubmitTest();}return false;">Submit</button></div>';
    const qidNow = session.ids[session.idx];
    const bmOn = !!(typeof QuantrexBookmarks !== "undefined" && QuantrexBookmarks.isBookmarked && QuantrexBookmarks.isBookmarked(qidNow));
    const flagOn = !!(session.review && session.review.has(session.idx));
    const previewOpen = !!session._egPreviewOpen;
    const chromeOpen = stripOpen && sideOpen;
    const allQOn = stripOpen || previewOpen;
    const allQTitle = allQOn ? "Close questions preview" : "All questions / preview";
    const sideTitle = sideOpen ? "Close question palette" : "Question number palette";
    const gridIco = ico('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>');
    const menuIco = ico('<path d="M4 7h16M4 12h16M4 17h16"/>');
    const flagIco = ico('<path d="M4 22V4"/><path d="M4 4h12l-2 4 2 4H4"/>');
    const groupIco = ico('<path d="M12 5v14M5 12h14"/>');
    const getQFn = typeof getQ === "function" ? getQ : (typeof global.getQ === "function" ? global.getQ : null);
    const previewRows = (session.ids || []).map(function (id, i) {
      let qq = null;
      try { qq = getQFn ? getQFn(id) : null; } catch (_) { qq = null; }
      const st = paletteStatus(session, i, ctx);
      const cur = i === session.idx ? " cur" : "";
      const snip = stemPreviewText(qq).replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return '<button type="button" class="eg-qpreview-row ' + st + cur + '" data-qidx="' + i + '" title="Go to question ' + (i + 1) + '">' +
        '<span class="eg-qpreview-num" aria-hidden="true">' + (i + 1) + "</span>" +
        '<span class="eg-qpreview-stem">' + snip + "</span></button>";
    }).join("");
    const previewHtml = '<div class="eg-qpreview' + (previewOpen ? " open" : "") + '" id="egQPreview" role="dialog" aria-label="Questions Preview" aria-hidden="' + (previewOpen ? "false" : "true") + '"' +
      (previewOpen ? "" : ' hidden style="display:none!important"') + ">" +
      '<div class="eg-qpreview-head">' +
      '<button type="button" class="eg-qpreview-close" id="egQPreviewClose" title="Close preview" aria-label="Close">✕</button>' +
      "<strong>Questions Preview</strong></div>" +
      '<div class="eg-qpreview-list" id="egQPreviewList">' + previewRows + "</div></div>";
    const qnoPad = String(qno).padStart(2, "0");
    const typeShort = /numerical/i.test(typeLab) ? "Numerical" : (/multiple/i.test(typeLab) ? "MCQ Multiple" : "MCQ");
    const infoChips = dateShiftChips || (examLine
      ? '<span class="qx-paper-chip qx-paper-exam"><span class="qx-paper-exam-txt">' + examLine + "</span></span>"
      : "");

    /* Mobile-first; desktop-mode while strip, side, or preview is open */
    const desktopMode = !!(stripOpen || sideOpen || previewOpen);
    return '<div class="eg-test-root mtk-test-root' +
      (sideOpen ? " eg-side-open" : " eg-side-collapsed") +
      (stripOpen ? " eg-strip-open" : " eg-strip-collapsed") +
      " eg-tools-open eg-compact eg-qxmd167 eg-qxmd170 eg-qxmd171 eg-qxmd173 eg-qxmd180 eg-qxmd182 eg-qxtool8 eg-qxeg1 eg-qxeg2 eg-qxeg3 eg-qxeg4 eg-qxeg5 eg-qxeg6 eg-qxeg7" +
      (previewOpen ? " eg-preview-open" : " eg-preview-collapsed") +
      (desktopMode ? " eg-desktop-mode" : " eg-mobile") +
      (!desktopMode && isMobileEg ? " eg-mobile-vp" : "") +
      "" +
      '" data-test-theme="' + theme + '" data-font-scale="' + fontScale +
      '" data-eg-mode="' + (practice ? "practice" : "test") + '" data-ui="examgoal" data-eg-cycle="' + (chromeOpen ? "1" : "0") + '">' +
      '<header class="eg-top" style="display:flex!important;align-items:center!important;gap:8px!important;min-height:56px!important;padding:6px 10px!important;background:#1565C0!important;color:#fff!important;visibility:visible!important;opacity:1!important;position:relative!important;top:auto!important;bottom:auto!important;left:auto!important;right:auto!important;z-index:70!important;flex-shrink:0!important;">' +
      '<button type="button" class="eg-back" id="mtkExitBtn" data-qx-exit="1" title="Exit" aria-label="Exit">‹</button>' +
      '<div class="eg-top-title">' + titleEsc + ' <span class="eg-mode-pill">' + mode + "</span></div>" +
      '<div class="eg-top-tools qx-prac-tools" role="toolbar" aria-label="Question tools" style="display:flex!important;visibility:visible!important;opacity:1!important;flex-wrap:wrap!important;gap:6px!important;margin-left:auto!important;">' +
      (!practice ? timer : "") +
      /* qxmd167: primary always-visible row — Theme, Aa, All Q, Palette */
      '<button type="button" class="eg-ico mtk-theme-btn eg-tool-btn eg-tool-pri' + (theme === "light" ? " eg-moon" : "") + '" id="mtkThemeBtn" data-tip="Theme" title="Light / dark" aria-label="Light / dark">' +
      (theme === "dark"
        ? ico('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>')
        : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>') +
      '<span class="eg-tip">Theme</span></button>' +
      '<button type="button" class="eg-ico eg-tool-btn eg-tool-pri" id="egFmtBtn" data-tip="Text size" title="Text size" aria-label="Text size">Aa<span class="eg-tip">Aa</span></button>' +
      '<button type="button" class="eg-ico eg-tool-btn eg-allq-btn eg-tool-pri' + (allQOn ? " on" : "") + '" id="egAllQBtn" data-tip="All Q" title="' + allQTitle + '" aria-label="' + allQTitle + '" aria-expanded="' + (allQOn ? "true" : "false") + '" data-eg-cycle="' + (allQOn ? "1" : "0") + '">' +
      gridIco + '<span class="eg-tip">All Q</span></button>' +
      '<button type="button" class="eg-ico eg-tool-btn eg-menu-btn eg-lines-btn eg-tool-pri' + (sideOpen ? " on" : "") + '" id="egMenuBtn" data-tip="Palette" title="' + sideTitle + '" aria-label="' + sideTitle + '" aria-expanded="' + (sideOpen ? "true" : "false") + '">' +
      menuIco + '<span class="eg-tip">Palette</span></button>' +
      /* secondary — stay if fit; mobile CSS may tuck into Aa */
      '<button type="button" class="eg-ico star eg-tool-btn eg-tool-sec' + (bmOn ? " on" : "") + '" id="egStarBtn" data-tip="Bookmark" title="Bookmark" aria-label="Bookmark">' +
      (bmOn ? "★" : "☆") + '<span class="eg-tip">Bookmark</span></button>' +
      '<button type="button" class="eg-ico eg-tool-btn eg-tool-sec eg-tool-reach" id="egPlusBtn" data-tip="Group" title="Create group" aria-label="Create group">' +
      groupIco + '<span class="eg-tip">Group</span></button>' +
      '<button type="button" class="eg-ico eg-tool-btn eg-tool-sec" id="egFullBtn" data-tip="Fullscreen" title="Fullscreen" aria-label="Fullscreen">' +
      ico('<path d="M8 3H3v5M16 3h5v5M8 21H3v-5M21 16v5h-5"/>') + '<span class="eg-tip">Full</span></button>' +
      '<button type="button" class="eg-ico warn eg-tool-btn eg-tool-sec eg-tool-reach" id="mtkReportBtn" data-tip="Report" title="Report question" aria-label="Report">!<span class="eg-tip">Report</span></button>' +
      "</div>" + fmt +
      "</header>" +
      '<div class="eg-subs">' + tabs + "</div>" +
      '<div class="eg-qbar eg-strip' + (stripOpen ? "" : " eg-strip-collapsed") + '" id="egQBar" role="navigation" aria-label="Question numbers" aria-hidden="' + (stripOpen ? "false" : "true") + '"' + (stripOpen ? '' : ' hidden') + '>' +
      '<button type="button" class="eg-strip-close" id="egStripClose" title="Close top questions" aria-label="Close top questions">✕</button>' +
      '<div class="eg-qbar-scroll">' + qbar + "</div></div>" +
      '<div class="eg-info-strip eg-info-pills eg-examgoal-meta" id="egInfoStrip" role="status">' +
      '<span class="eg-q-num" title="Question ' + qno + '">' + qnoPad + "</span>" +
      '<span class="eg-q-time" id="egQTime" title="Time on this question">' + formatQTime(dwellSec(session)) + "</span>" +
      '<span class="eg-meta-sep" aria-hidden="true">|</span>' +
      '<span class="eg-marks" title="Scoring"><span class="eg-mark eg-mark-pos">+' + marks.pos +
      '</span> <span class="eg-mark eg-mark-neg">' + (marks.neg ? String(marks.neg) : "0") + "</span></span>" +
      '<span class="eg-meta-sep" aria-hidden="true">|</span>' +
      (examLine
        ? '<span class="eg-paper-line qx-paper-exam" title="' + examLine + '">' + examLine + "</span>"
        : (infoChips
          ? '<div class="eg-info-meta qx-paper-meta-chips">' + infoChips + "</div>"
          : '<span class="eg-paper-line eg-paper-empty">—</span>')) +
      '<span class="eg-meta-sep" aria-hidden="true">|</span>' +
      '<span class="eg-type eg-type-pill">' + typeLab.replace(/</g, "&lt;") + "</span>" +
      "</div>" +
      '<div class="eg-body">' +
      '<div class="eg-main"><div class="eg-q-card">' +
      /* qxmd180: Check Answer keeps stem + options visible; solution sits below (Exam Goal). */
      '<div class="eg-q-stem" id="egQArea" aria-hidden="false">' +
      stem + "</div>" +
      (ctx.sectionInstr || "") +
      '<div class="' + (ctx.optsClass || "mtk-options mtk-options-grid") + ' eg-opts" id="qxOpts">' +
      (ctx.opts || "") + "</div>" +
      checkRow +
      (showSol ? (function () {
        var solInner = "";
        try { solInner = solutionHtml(q); } catch (_solErr) { solInner = ""; }
        if (!solInner) solInner = '<p class="qx-sol-missing">Solution unavailable</p>';
        return '<div class="eg-sol-panel eg-sol-below" id="egSolPanel" role="region" aria-label="Solution">' +
          '<header class="eg-sol-panel-head">' +
          '<strong>Solution</strong>' +
          '<button type="button" class="eg-sol-panel-close" id="egSolClose" title="Close">✕</button>' +
          '</header>' +
          '<div class="eg-sol eg-sol-inline qx-content" id="egSol">' + solInner + '</div>' +
          '</div>';
      })() : "") +
      '</div>' +
      "</div>" +
      '<aside class="eg-side" id="egSide"' + (sideOpen ? ' aria-hidden="false"' : ' hidden aria-hidden="true"') + '>' +
      '<div class="eg-side-head"><strong>Questions</strong>' +
      '<button type="button" class="eg-side-close" id="egSideClose" title="Close palette" aria-label="Close">✕</button></div>' +
      legend + palHtml + submitSide + "</aside>" +
      '<button type="button" class="eg-side-scrim" id="egSideScrim" aria-label="Close palette" tabindex="-1"></button>' +
      "</div>" +
      foot +
      previewHtml +
      "</div>";
    } catch (_renderErr) {
      try { console.warn("[ExamgoalTestUI.render]", _renderErr); } catch (_) { /* */ }
      var sess = ctx && ctx.session;
      var practiceFail = !!(sess && sess.practiceMode);
      var wantSolFail = false;
      try { wantSolFail = wantShowSol(sess, sess && sess.idx); } catch (_) { wantSolFail = !!(sess && (sess._egShowAnswer || egCheckedAt(sess, sess && sess.idx))); }
      var fallbackSol = wantSolFail
        ? '<div class="eg-sol-panel eg-sol-marks-way" id="egSolPanel" role="region" aria-label="Solution">' +
          '<header class="eg-sol-panel-head"><strong>Solution</strong>' +
          '<button type="button" class="eg-sol-panel-close" id="egSolClose" title="Close">✕</button></header>' +
          '<div class="eg-sol eg-sol-inline" id="egSol"><p class="qx-sol-missing">Solution unavailable</p></div></div>'
        : "";
      var titleFail = String((sess && sess.title) || "Test").replace(/</g, "&lt;");
      return '<div class="eg-test-root mtk-test-root" data-ui="examgoal" data-eg-mode="' +
        (practiceFail ? "practice" : "test") + '">' +
        '<header class="eg-top"><div class="eg-top-title">' + titleFail + "</div></header>" +
        '<div class="eg-body"><div class="eg-main"><div class="eg-q-card">' +
        '<p class="qx-sol-missing">Unable to render question chrome.</p>' +
        fallbackSol +
        "</div></div></div></div>";
    }
  }

  function applyOptDecor(root, session, q, idx) {
    if (!root) return;
    const chosen = session && session.answers ? session.answers[idx] : null;
    const chosenSet = Array.isArray(chosen)
      ? chosen.map(function (x) { return Number(x); })
      : (chosen != null && chosen !== "" ? [Number(chosen)] : []);
    const show = !!(session && egCheckedAt(session, idx));
    let cor = [];
    if (show && q && typeof QuantrexQFormat !== "undefined") {
      try { cor = QuantrexQFormat.correctIndices(q) || []; } catch (_) { cor = []; }
    }
    root.querySelectorAll("[data-opt]").forEach(function (btn) {
      const i = parseInt(btn.dataset.opt, 10);
      const picked = chosenSet.indexOf(i) >= 0;
      btn.classList.toggle("selected", picked);
      btn.classList.remove("eg-opt-right", "eg-opt-wrong");
      if (!show) return;
      if (cor.indexOf(i) >= 0) btn.classList.add("eg-opt-right");
      else if (picked) btn.classList.add("eg-opt-wrong");
    });
  }

  var NOTE_KEY = "quantrex_qnotes_v1";

  function loadNotes() {
    try { return JSON.parse(localStorage.getItem(NOTE_KEY) || "{}") || {}; } catch (_) { return {}; }
  }

  function saveNotes(map) {
    try { localStorage.setItem(NOTE_KEY, JSON.stringify(map)); } catch (_) { /* */ }
  }

  function openNote(qid, anchor) {
    const id = String(qid == null ? "" : qid);
    const existing = document.getElementById("egNotePop");
    if (existing) {
      const same = existing.getAttribute("data-qid") === id;
      existing.remove();
      if (same) return;
    }
    const map = loadNotes();
    const cur = (map[id] && map[id].text) || "";
    const pop = document.createElement("div");
    pop.id = "egNotePop";
    pop.className = "eg-note-pop";
    pop.setAttribute("data-qid", id);
    pop.innerHTML = '<div class="eg-note-pop-h">Add a Note</div>' +
      '<textarea id="egNoteText" rows="5" placeholder="Write a note for this question…">' +
      String(cur).replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</textarea>" +
      '<div class="eg-note-pop-act">' +
      '<button type="button" class="eg-btn" id="egNoteCancel">Cancel</button>' +
      '<button type="button" class="eg-btn eg-btn-next" id="egNoteSave">Save</button></div>';
    const host = (anchor && anchor.closest &&
      (anchor.closest(".eg-test-root") || anchor.closest(".mtk-test-root") ||
       anchor.closest(".qx-practice-page") || anchor.closest("#app-main"))) || document.body;
    if (host && host.style) {
      const pos = window.getComputedStyle(host).position;
      if (pos === "static") host.style.position = "relative";
    }
    host.appendChild(pop);
    const ta = pop.querySelector("#egNoteText");
    if (ta) {
      try { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } catch (_) { /* */ }
    }
    const close = function () { if (pop.parentNode) pop.remove(); };
    pop.querySelector("#egNoteCancel").onclick = close;
    pop.querySelector("#egNoteSave").onclick = function () {
      const text = (ta && ta.value || "").trim();
      const m = loadNotes();
      if (text) m[id] = { text: text, at: Date.now() };
      else delete m[id];
      saveNotes(m);
      if (text && typeof STATE !== "undefined" && STATE.addNote) {
        try { STATE.addNote(text); } catch (_) { /* */ }
      }
      close();
      if (typeof showToast === "function") showToast(text ? "Note saved" : "Note cleared");
    };
  }

  function checkAnswer(session, getQFn) {
    if (!session) return;
    const q = getQFn(session.ids[session.idx]);
    if (!q) return;
    const chosen = session.answers[session.idx];
    const answered = typeof QuantrexQFormat !== "undefined"
      ? QuantrexQFormat.isAnswered(q, chosen)
      : chosen != null && chosen !== "";
    if (!answered) {
      if (typeof showToast === "function") showToast("Select an option first");
      return false;
    }
    if (!session._egChecked) session._egChecked = {};
    if (!session._egCorrect) session._egCorrect = {};
    session._egChecked[session.idx] = true;
    try { session._egChecked[String(session.idx)] = true; } catch (_) { /* */ }
    try {
      if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.grade) {
        const g = QuantrexQFormat.grade(q, chosen);
        session._egCorrect[session.idx] = !!(g && g.correct);
        try { session._egCorrect[String(session.idx)] = session._egCorrect[session.idx]; } catch (_) { /* */ }
      } else {
        session._egCorrect[session.idx] = chosen === q.answer;
        try { session._egCorrect[String(session.idx)] = session._egCorrect[session.idx]; } catch (_) { /* */ }
      }
    } catch (_) {
      session._egCorrect[session.idx] = chosen === q.answer;
      try { session._egCorrect[String(session.idx)] = session._egCorrect[session.idx]; } catch (_) { /* */ }
    }
    return true;
  }


  /**
   * qxmd162: Immediate DOM Solution reveal for Practice Check/Show Answer.
   * Does not rely on api.refresh() — inserts/replaces #egSolPanel even if refresh fails.
   */

  /* qxmd177: Marks-like — capture/restore scroll; NEVER force scrollTop=0 on sol open */
  function egCaptureScroll(root) {
    var snap = { root: root || null, items: [] };
    try {
      var nodes = [];
      if (root) nodes.push({ el: root, key: "root" });
      try {
        var sels = [".eg-body", ".eg-main", ".eg-scroll", ".eg-q-card"];
        for (var si = 0; si < sels.length; si++) {
          var el = root && root.querySelector ? root.querySelector(sels[si]) : null;
          if (el) nodes.push({ el: el, key: sels[si] });
        }
      } catch (_) { /* */ }
      try {
        var appMain = document.getElementById("app-main");
        if (appMain) nodes.push({ el: appMain, key: "#app-main" });
      } catch (_) { /* */ }
      try {
        if (document.scrollingElement) nodes.push({ el: document.scrollingElement, key: "scrollingElement" });
        nodes.push({ el: document.documentElement, key: "documentElement" });
        nodes.push({ el: document.body, key: "body" });
      } catch (_) { /* */ }
      var seen = [];
      nodes.forEach(function (n) {
        if (!n || !n.el || seen.indexOf(n.el) >= 0) return;
        seen.push(n.el);
        try {
          if (typeof n.el.scrollTop === "number") {
            snap.items.push({ el: n.el, key: n.key, top: n.el.scrollTop, left: n.el.scrollLeft || 0 });
          }
        } catch (_) { /* */ }
      });
    } catch (_) { /* */ }
    return snap;
  }
  function egRestoreScroll(snap) {
    if (!snap) return;
    var items = snap.items || snap; // tolerate legacy array
    if (!items || !items.length) return;
    function resolve(s) {
      try {
        if (s.el && s.el.isConnected !== false) return s.el;
      } catch (_) { /* */ }
      try {
        if (!s.key) return null;
        if (s.key === "root") return snap.root && snap.root.isConnected !== false ? snap.root : (document.querySelector(".eg-test-root") || null);
        if (s.key === "#app-main") return document.getElementById("app-main");
        if (s.key === "scrollingElement") return document.scrollingElement;
        if (s.key === "documentElement") return document.documentElement;
        if (s.key === "body") return document.body;
        var host = (snap.root && snap.root.isConnected !== false) ? snap.root : document.querySelector(".eg-test-root");
        if (host && host.querySelector) return host.querySelector(s.key);
        return document.querySelector(s.key);
      } catch (_) { return null; }
    }
    function apply() {
      items.forEach(function (s) {
        try {
          var el = resolve(s);
          if (!el) return;
          el.scrollTop = s.top;
          if (typeof s.left === "number") el.scrollLeft = s.left;
          // refresh el ref for subsequent applies after remount
          s.el = el;
        } catch (_) { /* */ }
      });
    }
    apply();
    try {
      requestAnimationFrame(function () {
        apply();
        requestAnimationFrame(apply);
      });
    } catch (_) {
      try { setTimeout(apply, 0); } catch (__) { /* */ }
    }
    try { setTimeout(apply, 40); setTimeout(apply, 120); setTimeout(apply, 280); } catch (_) { /* */ }
  }
  function egLockScrollJump(root, on) {
    try {
      if (!root || !root.classList) return;
      if (on) root.classList.add("eg-qxmd177-scroll-lock");
      else root.classList.remove("eg-qxmd177-scroll-lock");
    } catch (_) { /* */ }
  }


  function egCoverHostQuestionStrip(on) {
    try {
      var body = document.body;
      if (!body) return;
      if (on) body.classList.remove("eg-qxmd179-host", "eg-qxmd179");
      else body.classList.remove("eg-qxmd179-host", "eg-qxmd179");
      /* Hide any chapter/list question text still in DOM outside practice root */
      if (on) {
        document.querySelectorAll(".q-card .q-text, .q-text.qx-content, .cpyqb-q-stem, .qx-list-q-stem").forEach(function (el) {
          try {
            if (el.closest && el.closest(".eg-test-root, .mtk-test-root, .eg-sol-panel")) return;
            el.setAttribute("data-eg-qxmd179-host-hid", "1");
            el.style.setProperty("display", "none", "important");
            el.style.setProperty("visibility", "hidden", "important");
            el.style.setProperty("height", "0", "important");
            el.style.setProperty("overflow", "hidden", "important");
          } catch (_) { /* */ }
        });
      } else {
        document.querySelectorAll("[data-eg-qxmd179-host-hid]").forEach(function (el) {
          try {
            el.removeAttribute("data-eg-qxmd179-host-hid");
            el.style.removeProperty("display");
            el.style.removeProperty("visibility");
            el.style.removeProperty("height");
            el.style.removeProperty("overflow");
          } catch (_) { /* */ }
        });
      }
    } catch (_) { /* */ }
  }

  function egNukeStemAboveHeader(root) {
    try {
      if (root && root.classList) {
        root.classList.add("eg-qxmd182", "eg-qxmd180");
        root.classList.remove("eg-qxmd179", "eg-qxmd177", "eg-qxmd176", "eg-qxmd175");
      }
    } catch (_) { /* */ }
  }


  function revealPracticeSolution(root, api) {
    if (!root || !api || !api.session) return false;
    const session = api.session;
    if (!session.practiceMode) return false;
    if (!wantShowSol(session, session.idx)) return false;
    /* qxmd177: lock scroll position — Marks Practice never jumps Q to top on Check Answer */
    var _egScrollSnap = egCaptureScroll(root);
    egLockScrollJump(root, true);
    let q = null;
    try { q = api.getQ ? api.getQ(session.ids[session.idx]) : null; } catch (_) { q = null; }
    let solInner = "";
    try { solInner = solutionHtml(q); } catch (_solErr) { solInner = ""; }
    if (!solInner) solInner = '<p class="qx-sol-missing">Solution unavailable</p>';

    const panelHtml =
      '<div class="eg-sol-panel eg-sol-marks-way" id="egSolPanel" role="region" aria-label="Solution">' +
      '<header class="eg-sol-panel-head">' +
      '<strong>Solution</strong>' +
      '<button type="button" class="eg-sol-panel-close" id="egSolClose" title="Close">✕</button>' +
      '</header>' +
      '<div class="eg-sol eg-sol-inline" id="egSol">' + solInner + '</div>' +
      '</div>';

    try {
      const existing = root.querySelector("#egSolPanel");
      if (existing) {
        existing.outerHTML = panelHtml;
      } else {
        /* qxmd175/176 Marks-way: inject Solution where the stem was (after #egQArea), not under a split */
        const qSlot = root.querySelector("#egQArea");
        const card = root.querySelector(".eg-q-card");
        const actionRow = root.querySelector(".eg-action-row");
        const opts = root.querySelector("#qxOpts");
        if (opts && opts.parentNode) {
          opts.insertAdjacentHTML("afterend", panelHtml);
        } else if (actionRow && actionRow.parentNode) {
          actionRow.insertAdjacentHTML("afterend", panelHtml);
        } else if (qSlot && qSlot.parentNode) {
          qSlot.insertAdjacentHTML("afterend", panelHtml);
        } else if (card) {
          card.insertAdjacentHTML("beforeend", panelHtml);
        } else {
          const insertAfter = actionRow || opts;
          if (insertAfter && insertAfter.parentNode) {
            insertAfter.insertAdjacentHTML("afterend", panelHtml);
          } else {
            return false;
          }
        }
      }
    } catch (_domErr) {
      try { console.warn("[revealPracticeSolution]", _domErr); } catch (_) { /* */ }
      return false;
    }

    try {
      root.classList.add("qx-sol-showing", "eg-qxmd180", "eg-qxmd182");
      root.classList.remove("eg-sol-showing", "eg-qxmd175", "eg-qxmd176", "eg-qxmd177", "eg-qxmd179");
      const egRoot = root.classList.contains("eg-test-root") ? root : (root.closest && root.closest(".eg-test-root"));
      if (egRoot) {
        egRoot.classList.add("qx-sol-showing", "eg-qxmd180", "eg-qxmd182");
        egRoot.classList.remove("eg-sol-showing", "eg-qxmd175", "eg-qxmd176", "eg-qxmd177", "eg-qxmd179");
      }
      /* qxmd176: sync Show Answer toggle with solution visibility */
      try {
        session._egShowAnswer = false;
        const showElSync = root.querySelector("#egShowAns");
        if (showElSync) showElSync.checked = wantShowSol(session, session.idx);
      } catch (_) { /* */ }
    } catch (_) { /* */ }
    const qArea = root.querySelector("#egQArea");
    try {
      root.classList.add("eg-qxmd180", "eg-qxmd182");
      root.classList.remove("eg-qxmd175", "eg-qxmd176", "eg-qxmd177", "eg-qxmd179");
    } catch (_) { /* */ }
    if (qArea) {
      try {
        qArea.classList.remove("eg-stem-sol-hidden", "qx-stem-sol-hidden");
        qArea.removeAttribute("hidden");
        qArea.setAttribute("aria-hidden", "false");
        qArea.style.cssText = "";
      } catch (_) { /* */ }
    }
    try {
      const optsEl = root.querySelector("#qxOpts, .eg-opts");
      if (optsEl) {
        optsEl.classList.remove("eg-opts-sol-hidden");
        optsEl.removeAttribute("hidden");
        optsEl.setAttribute("aria-hidden", "false");
        optsEl.style.cssText = "";
      }
      const checkRow = root.querySelector(".eg-action-row, #egCheckRow");
      if (checkRow) {
        checkRow.classList.remove("eg-opts-sol-hidden");
        checkRow.style.cssText = "";
      }
    } catch (_) { /* */ }
    try {
      requestAnimationFrame(function () { egRestoreScroll(_egScrollSnap); });
    } catch (_) { /* */ }

    const panel = root.querySelector("#egSolPanel");
    const solClose = root.querySelector("#egSolClose");
    if (solClose) {
      solClose.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        session._egShowAnswer = false;
        if (session._egChecked) {
          try { delete session._egChecked[session.idx]; } catch (_) { /* */ }
          try { delete session._egChecked[String(session.idx)]; } catch (_) { /* */ }
        }
        const showEl = root.querySelector("#egShowAns");
        if (showEl) showEl.checked = false;
        try {
          const p = root.querySelector("#egSolPanel");
          if (p) p.remove();
          root.classList.remove("eg-sol-showing");
          if (qArea) {
            qArea.classList.remove("eg-stem-sol-hidden");
            qArea.removeAttribute("hidden");
            qArea.setAttribute("aria-hidden", "false");
            try {
              qArea.style.removeProperty("display");
              qArea.style.removeProperty("visibility");
              qArea.style.removeProperty("opacity");
              qArea.style.removeProperty("height");
              qArea.style.removeProperty("max-height");
              qArea.style.removeProperty("overflow");
              qArea.style.removeProperty("margin");
              qArea.style.removeProperty("padding");
              qArea.style.removeProperty("position");
              qArea.style.removeProperty("left");
              qArea.style.removeProperty("clip");
              qArea.style.removeProperty("font-size");
              qArea.style.removeProperty("line-height");
            } catch (_) { /* */ }
          }
          root.querySelectorAll(".eg-opts-sol-hidden").forEach(function (el) {
            el.classList.remove("eg-opts-sol-hidden");
            el.removeAttribute("aria-hidden");
            try { el.style.removeProperty("display"); } catch (_) { /* */ }
          });
        } catch (_) { /* */ }
        if (typeof api.refresh === "function") {
          try { api.refresh(); } catch (_) { /* */ }
        }
      };
    }

    try { applyOptDecor(root, session, q, session.idx); } catch (_) { /* */ }
    /* qxmd175: typeset solution after inject — KaTeX race + afterRender root-self miss */
    function qxTypesetSol(el) {
      if (!el || typeof Mx === "undefined") return;
      try {
        if (Mx.afterRender) Mx.afterRender(el);
        else if (Mx.afterRenderLight) Mx.afterRenderLight(el);
        else if (Mx.typeset) Mx.typeset(el);
      } catch (_) { /* */ }
    }
    try {
      if (panel) {
        const solEl = panel.querySelector("#egSol") || panel;
        qxTypesetSol(solEl);
        qxTypesetSol(panel);
        [50, 200, 500].forEach(function (ms) {
          setTimeout(function () {
            try {
              const live = root.querySelector("#egSolPanel #egSol") || root.querySelector("#egSolPanel");
              qxTypesetSol(live);
            } catch (_) { /* */ }
          }, ms);
        });
      }
    } catch (_) { /* */ }
    try {
      if (root && typeof root._egForceFoot === "function") root._egForceFoot(true);
    } catch (_) { /* */ }
    /* qxmd177: NO scrollTop=0 / NO scrollIntoView — restore prior scroll (Marks-like, no Q jump to top) */
    try {
      egHideOptsAfterSol();
      egRestoreScroll(_egScrollSnap);
      setTimeout(function () {
        try {
          egRestoreScroll(_egScrollSnap);
          egLockScrollJump(root, false);
        } catch (_) { /* */ }
      }, 160);
    } catch (_) { /* */ }
    return !!panel;
  }

  function hidePracticeSolutionDom(root) {
    if (!root) return;
    try {
      const p = root.querySelector("#egSolPanel");
      if (p) p.remove();
      root.classList.remove("eg-sol-showing");
      const qArea = root.querySelector("#egQArea");
      if (qArea) {
        qArea.classList.remove("eg-stem-sol-hidden");
        qArea.removeAttribute("hidden");
        qArea.setAttribute("aria-hidden", "false");
        try {
          qArea.style.removeProperty("display");
          qArea.style.removeProperty("visibility");
          qArea.style.removeProperty("opacity");
          qArea.style.removeProperty("height");
          qArea.style.removeProperty("max-height");
          qArea.style.removeProperty("overflow");
          qArea.style.removeProperty("margin");
          qArea.style.removeProperty("padding");
          qArea.style.removeProperty("position");
          qArea.style.removeProperty("left");
          qArea.style.removeProperty("clip");
          qArea.style.removeProperty("font-size");
          qArea.style.removeProperty("line-height");
        } catch (_) { /* */ }
      }
      root.querySelectorAll(".eg-opts-sol-hidden").forEach(function (el) {
        el.classList.remove("eg-opts-sol-hidden");
        el.removeAttribute("aria-hidden");
        try { el.style.removeProperty("display"); } catch (_) { /* */ }
      });
    } catch (_) { /* */ }
  }

  function bind(root, api) {
    if (!root || !api || !api.session) return;
    try {
      root.classList.add("eg-qxmd182", "eg-qxmd180");
      root.classList.remove("eg-qxmd175", "eg-qxmd176", "eg-qxmd177", "eg-qxmd179");
      document.documentElement.classList.add("qx-test-zoom");
    } catch (_) { /* */ }
    const session = api.session;
    normalizeSessionSets(session);
    applyOptDecor(root, session, api.getQ(session.ids[session.idx]), session.idx);
    /* qxmd164: re-apply stem hide after every bind/refresh — theme CSS + refresh wipe otherwise */
    try {
      if (wantShowSol(session, session.idx)) {
        revealPracticeSolution(root, api);
        setTimeout(function () { try { revealPracticeSolution(root, api); } catch (_) {} }, 0);
      }
    } catch (_) { /* */ }

    // Live Per-Question Ticking Timer
    if (global._egQTimerInterval) {
      clearInterval(global._egQTimerInterval);
      global._egQTimerInterval = null;
    }
    if (!session.qTimes) session.qTimes = {};
    if (session._curQIdx !== session.idx) {
      if (session._curQIdx != null && session._qEnterAt) {
        const elapsed = Math.max(0, Math.round((Date.now() - session._qEnterAt) / 1000));
        session.qTimes[session._curQIdx] = (session.qTimes[session._curQIdx] || 0) + elapsed;
      }
      session._curQIdx = session.idx;
      session._qEnterAt = Date.now();
    }
    const qTimeEl = root.querySelector("#egQTime, .eg-q-time");
    if (qTimeEl) {
      global._egQTimerInterval = setInterval(function () {
        if (!document.contains(qTimeEl) || !session) {
          clearInterval(global._egQTimerInterval);
          global._egQTimerInterval = null;
          return;
        }
        qTimeEl.textContent = formatQTime(dwellSec(session));
      }, 1000);
    }

    const check = root.querySelector("#egCheckBtn");
    if (check) check.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      var ok = false;
      try { ok = !!checkAnswer(session, api.getQ); } catch (_) { ok = false; }
      /* qxmd177: freeze scroll across Check Answer + refresh (no Q→top jump) */
      var _chkSnap = egCaptureScroll(root);
      egLockScrollJump(root, true);
      if (ok) {
        try {
          session._egShowAnswer = false;
          var seOn = root.querySelector("#egShowAns");
          if (seOn) seOn.checked = true;
        } catch (_) { /* */ }
        try { revealPracticeSolution(root, api); } catch (_rev) {
          try { console.warn("[egCheckBtn reveal]", _rev); } catch (_) { /* */ }
        }
      }
      if (typeof api.refresh === "function") {
        try {
          var _refRet = api.refresh();
          var _restore = function () {
            try { egRestoreScroll(_chkSnap); egLockScrollJump(root, false); } catch (_) { /* */ }
          };
          if (_refRet && typeof _refRet.then === "function") {
            _refRet.then(_restore).catch(_restore);
          } else {
            setTimeout(_restore, 0);
            setTimeout(_restore, 80);
            setTimeout(_restore, 200);
          }
        } catch (_) { egRestoreScroll(_chkSnap); }
      } else {
        egRestoreScroll(_chkSnap);
        egLockScrollJump(root, false);
      }
      try { if (typeof forceFootVisible === "function") forceFootVisible(true); } catch (_) { /* */ }
    };
    const show = root.querySelector("#egShowAns");
    if (show) show.onchange = function () {
      if (!session._egChecked) session._egChecked = {};
      if (show.checked) {
        session._egChecked[session.idx] = true;
        try { session._egChecked[String(session.idx)] = true; } catch (_) { /* */ }
      } else {
        try { delete session._egChecked[session.idx]; } catch (_) { /* */ }
        try { delete session._egChecked[String(session.idx)]; } catch (_) { /* */ }
      }
      session._egShowAnswer = false;
      var _showSnap = egCaptureScroll(root);
      egLockScrollJump(root, true);
      if (show.checked) {
        try { revealPracticeSolution(root, api); } catch (_rev) {
          try { console.warn("[egShowAns reveal]", _rev); } catch (_) { /* */ }
        }
      } else {
        hidePracticeSolutionDom(root);
      }
      if (typeof api.refresh === "function") {
        try {
          var _refRet2 = api.refresh();
          var _restore2 = function () {
            try { egRestoreScroll(_showSnap); egLockScrollJump(root, false); } catch (_) { /* */ }
          };
          if (_refRet2 && typeof _refRet2.then === "function") {
            _refRet2.then(_restore2).catch(_restore2);
          } else {
            setTimeout(_restore2, 0);
            setTimeout(_restore2, 80);
            setTimeout(_restore2, 200);
          }
        } catch (_) { egRestoreScroll(_showSnap); }
      } else {
        egRestoreScroll(_showSnap);
        egLockScrollJump(root, false);
      }
    };
    const solClose = root.querySelector("#egSolClose");
    if (solClose) solClose.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      var _closeSnap = egCaptureScroll(root);
      session._egShowAnswer = false;
      if (session._egChecked) {
        try { delete session._egChecked[session.idx]; } catch (_) { /* */ }
        try { delete session._egChecked[String(session.idx)]; } catch (_) { /* */ }
      }
      if (show) show.checked = false;
      hidePracticeSolutionDom(root);
      if (typeof api.refresh === "function") {
        try {
          var _refRet3 = api.refresh();
          var _restore3 = function () { try { egRestoreScroll(_closeSnap); } catch (_) { /* */ } };
          if (_refRet3 && typeof _refRet3.then === "function") _refRet3.then(_restore3).catch(_restore3);
          else { setTimeout(_restore3, 0); setTimeout(_restore3, 80); }
        } catch (_) { egRestoreScroll(_closeSnap); }
      } else {
        egRestoreScroll(_closeSnap);
      }
    };
    // Typeset inline bottom solution panel math
    try {
      const solRoot = root.querySelector("#egSolPanel") || root.querySelector("#egSol");
      if (solRoot && typeof Mx !== "undefined") {
        // Full afterRender so solution symbols get same typeset as stems
        if (Mx.afterRender) Mx.afterRender(solRoot);
        else if (Mx.afterRenderLight) Mx.afterRenderLight(solRoot);
      }
      /* qxmd177: never scroll on sol typeset/bind — preserve viewport (Marks-like) */
      try {
        if (root.classList.contains("eg-sol-showing")) {
          /* keep current scroll; overflow-anchor disabled via eg-qxmd177 CSS */
        }
      } catch (_) { /* */ }
    } catch (_) { /* */ }
    /* qxeg7: foot already in DOM from render — CSS nuclear visibility; debounce thrash */
    var _egFootRaf = 0;
    var _egFootLast = 0;
    var _egFootPainted = false;
    function forceFootVisibleNow(force) {
      try {
        const foot = root.querySelector("#egFoot, .eg-foot");
        if (!foot) return;
        foot.style.setProperty("display", "flex", "important");
        foot.style.setProperty("flex-direction", "column", "important");
        foot.style.setProperty("background", "#ffffff", "important");
        foot.style.setProperty("visibility", "visible", "important");
        const nav = foot.querySelector(".eg-foot-nav, .eg-foot-right");
        if (nav) {
          nav.style.setProperty("display", "grid", "important");
          nav.style.setProperty("grid-template-columns", "1fr 1fr", "important");
          nav.style.setProperty("width", "100%", "important");
          nav.style.setProperty("visibility", "visible", "important");
        }
        ["qxPrevBtn", "qxNextBtn"].forEach(function (id) {
          const b = foot.querySelector("#" + id);
          if (!b) return;
          b.style.setProperty("display", "inline-flex", "important");
          b.style.setProperty("visibility", "visible", "important");
          b.style.setProperty("opacity", "1", "important");
          b.style.setProperty("min-height", "48px", "important");
        });
        try { if (typeof root._egBindNavBtns === "function") root._egBindNavBtns(); } catch (_) {}
      } catch (_) { /* */ }
    }
    function forceFootVisible(force) {
      /* qxeg7: debounce — at most one paint now + one coalesced RAF; skip if painted < 200ms ago */
      var now = Date.now();
      if (!force && _egFootPainted && (now - _egFootLast) < 200) return;
      try { forceFootVisibleNow(!!force); } catch (_) {}
      if (_egFootRaf) return;
      _egFootRaf = (typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : function (cb) { return setTimeout(cb, 16); })(function () {
        _egFootRaf = 0;
        if (!force && _egFootPainted && (Date.now() - _egFootLast) < 200) return;
        try { forceFootVisibleNow(false); } catch (_) {}
      });
    }
    function syncCycleBtn() {
      try {
        const cf = chromeFlags(session);
        const stripOpen = cf.stripOpen;
        const sideOpen = cf.sideOpen;
        const anyOpen = cf.anyOpen;
        const bothOpen = cf.bothOpen;
        const previewOpen = !!session._egPreviewOpen;
        /* qxeg7: CSS class toggles ONLY — no per-node style loops / layout thrash */
        root.classList.toggle("eg-side-collapsed", !sideOpen);
        root.classList.toggle("eg-side-open", sideOpen);
        root.classList.toggle("eg-strip-collapsed", !stripOpen);
        root.classList.toggle("eg-strip-open", stripOpen);
        root.classList.toggle("eg-desktop-mode", anyOpen);
        root.classList.toggle("eg-mobile", !anyOpen);
        root.classList.toggle("eg-preview-open", previewOpen);
        root.classList.toggle("eg-preview-collapsed", !previewOpen);
        root.classList.remove("eg-tools-closed", "eg-tools-open", "eg-sol-showing", "eg-qxmd175", "eg-qxmd176", "eg-qxmd177", "eg-qxmd179");
        root.classList.add("eg-tools-open", "eg-qxmd167", "eg-qxmd170", "eg-qxmd171", "eg-qxmd173", "eg-qxmd180", "eg-qxmd182", "eg-qxtool8", "eg-qxeg1", "eg-qxeg2", "eg-qxeg3", "eg-qxeg4", "eg-qxeg5", "eg-qxeg6", "eg-qxeg7", "eg-foot-ready");
        root.setAttribute("data-eg-cycle", bothOpen ? "1" : "0");
        const strip = root.querySelector("#egQBar");
        if (strip) {
          strip.classList.toggle("eg-strip-collapsed", !stripOpen);
          strip.setAttribute("aria-hidden", stripOpen ? "false" : "true");
          if (stripOpen) strip.removeAttribute("hidden");
          else strip.setAttribute("hidden", "");
          /* clear stale inline display:none from older renders so CSS transitions win */
          try { strip.style.cssText = ""; } catch (_) {}
        }
        const side = root.querySelector("#egSide");
        if (side) {
          side.setAttribute("aria-hidden", sideOpen ? "false" : "true");
          if (sideOpen) side.removeAttribute("hidden");
          else side.setAttribute("hidden", "");
          try { side.style.cssText = ""; } catch (_) {}
        }
        const body = root.querySelector(".eg-body");
        if (body) { try { body.style.cssText = ""; } catch (_) {} }
        const main = root.querySelector(".eg-main");
        if (main) { try { main.style.cssText = ""; } catch (_) {} }
        const scrim = root.querySelector("#egSideScrim,.eg-side-scrim");
        if (scrim) { try { scrim.style.cssText = ""; } catch (_) {} }
        const preview = root.querySelector("#egQPreview");
        if (preview) {
          preview.classList.toggle("open", previewOpen);
          preview.setAttribute("aria-hidden", previewOpen ? "false" : "true");
          if (previewOpen) preview.removeAttribute("hidden");
          else preview.setAttribute("hidden", "");
          try { preview.style.cssText = ""; } catch (_) {}
        }
        const allQOn = !!(stripOpen || previewOpen);
        const allQTitle = allQOn ? "Close questions preview" : "All questions / preview";
        const allQ = root.querySelector("#egAllQBtn");
        if (allQ) {
          allQ.classList.toggle("on", allQOn);
          allQ.setAttribute("aria-expanded", allQOn ? "true" : "false");
          allQ.title = allQTitle;
          allQ.setAttribute("aria-label", allQTitle);
          allQ.setAttribute("data-eg-cycle", allQOn ? "1" : "0");
        }
        const sideTitle = sideOpen ? "Close question palette" : "Question number palette";
        const menu = root.querySelector("#egMenuBtn");
        if (menu) {
          menu.classList.toggle("on", sideOpen);
          menu.setAttribute("aria-expanded", sideOpen ? "true" : "false");
          menu.title = sideTitle;
          menu.setAttribute("aria-label", sideTitle);
          menu.removeAttribute("data-eg-cycle");
        }
        /* foot stays CSS-visible; do NOT thrash forceFoot on every chrome toggle */
      } catch (_) { /* */ }
    }
    /* expose for doc-level backup without full api.refresh */
    root._egSyncCycleBtn = syncCycleBtn;
    function collapseEgSideOnly() {
      try {
        session._egSideOpen = false;
        session._egSideCollapsed = true;
        session._egToolsOpen = false;
        session._egToolsUserOpened = false;
        /* do NOT touch strip */
        if (!session._egStripOpen) {
          session._egSideUserOpened = false;
          session._egHdrCycle = 0;
        }
        syncCycleBtn();
      } catch (_) { /* */ }
    }
    function collapseEgStripOnly() {
      try {
        session._egStripOpen = false;
        /* do NOT touch side */
        if (!session._egSideOpen) {
          session._egSideUserOpened = false;
          session._egHdrCycle = 0;
        }
        syncCycleBtn();
      } catch (_) { /* */ }
    }
    function collapseEgSide() {
      /* legacy name: close side only (✕ / scrim) — never closes strip */
      collapseEgSideOnly();
    }
    function openEgBoth() {
      try {
        session._egStripOpen = true;
        session._egSideOpen = true;
        session._egSideCollapsed = false;
        session._egSideUserOpened = true;
        session._egHdrCycle = 1;
        session._egSideIgnoreScrimUntil = Date.now() + 200;
        syncCycleBtn();
      } catch (_) { /* */ }
    }
    function openEgSide() {
      /* qxmd167: side only — do not force strip (keeps Palette simple/fast) */
      try {
        session._egSideOpen = true;
        session._egSideCollapsed = false;
        session._egSideUserOpened = true;
        session._egHdrCycle = 1;
        session._egSideIgnoreScrimUntil = Date.now() + 200;
        syncCycleBtn();
      } catch (_) { /* */ }
    }
    function collapseEgBoth() {
      try {
        session._egStripOpen = false;
        session._egSideOpen = false;
        session._egPreviewOpen = false;
        session._egSideCollapsed = true;
        session._egSideUserOpened = false;
        session._egHdrCycle = 0;
        session._egToolsOpen = false;
        session._egToolsUserOpened = false;
        syncCycleBtn();
      } catch (_) { /* */ }
    }
    /** qxeg4: All Q / grid — top strip + Questions Preview (does NOT force side) */
    function openEgPreviewStrip() {
      try {
        session._egPreviewOpen = true;
        session._egStripOpen = true; /* qxeg6/7: force #egQBar open on All Q */
        session._egSideUserOpened = true;
        session._egHdrCycle = 1;
        syncCycleBtn(); /* CSS class only — instant */
      } catch (_) { /* */ }
    }
    function collapseEgPreviewStrip() {
      try {
        session._egPreviewOpen = false;
        session._egStripOpen = false;
        if (!session._egSideOpen) {
          session._egSideUserOpened = false;
          session._egHdrCycle = 0;
        }
        syncCycleBtn();
      } catch (_) { /* */ }
    }
    function cycleAllQChrome(e) {
      if (e) {
        try {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        } catch (_) { /* */ }
      }
      if (window._egAllQToggleLock && Date.now() - window._egAllQToggleLock < 80) return;
      window._egAllQToggleLock = Date.now();
      const cf = chromeFlags(session);
      if (cf.previewOpen || cf.stripOpen) collapseEgPreviewStrip();
      else openEgPreviewStrip();
      syncCycleBtn();
    }
    /** qxeg4: line/menu button — toggle RIGHT side palette ONLY */
    function toggleEgSideOnly(e) {
      if (e) {
        try {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        } catch (_) { /* */ }
      }
      if (window._egMenuToggleLock && Date.now() - window._egMenuToggleLock < 80) return;
      window._egMenuToggleLock = Date.now();
      const cf = chromeFlags(session);
      const pref = getPalettePref();
      /* Palette button: toggle according to preference; ✕ on strip/side still independent */
      if (pref === "strip") {
        if (cf.stripOpen) collapseEgStripOnly();
        else {
          applyPalettePrefOpen(session);
          session._egSideIgnoreScrimUntil = Date.now() + 280;
          syncCycleBtn();
        }
        return;
      }
      if (pref === "both") {
        if (cf.sideOpen && cf.stripOpen) collapseEgBoth();
        else {
          applyPalettePrefOpen(session);
          session._egSideIgnoreScrimUntil = Date.now() + 280;
          syncCycleBtn();
        }
        return;
      }
      /* pref === side (default path) */
      if (cf.sideOpen) collapseEgSideOnly();
      else {
        applyPalettePrefOpen(session);
        session._egSideIgnoreScrimUntil = Date.now() + 280;
        syncCycleBtn(); /* CSS class only — instant */
      }
    }
    /** legacy aliases */
    function cycleHdrChrome(e) { cycleAllQChrome(e); }
    function toggleEgSide(e) { toggleEgSideOnly(e); }
    function markCurrentPal(idx) {
      /* qxnav1: instant eg-current/cur before full goTo re-render */
      try {
        var selOld = ".eg-pal-cell.cur, .eg-pal-cell.eg-current, .eg-qbar-n.cur, .eg-qbar-n.eg-current, .eg-q-dot.cur, .eg-q-dot.eg-current, .eg-qpreview-row.cur, .eg-qpreview-row.eg-current";
        root.querySelectorAll(selOld).forEach(function (c) {
          c.classList.remove("cur", "eg-current");
        });
        root.querySelectorAll('.eg-pal-cell[data-qidx="' + idx + '"], .eg-qbar-n[data-qidx="' + idx + '"], .eg-qpreview-row[data-qidx="' + idx + '"]').forEach(function (c) {
          c.classList.add("cur", "eg-current");
        });
      } catch (_) { /* */ }
    }
    function goNav(idx) {
      if (typeof api.goTo !== "function") return;
      const cf = chromeFlags(session);
      if (cf.stripOpen || cf.sideOpen || session._egSideUserOpened) {
        session._egStripOpen = !! session._egStripOpen;
        session._egSideOpen = !! session._egSideOpen;
        session._egSideCollapsed = !session._egSideOpen;
      }
      /* Next/Previous must not auto-open Show Answer / solution */
      session._egShowAnswer = false;
      try {
        const showEl = root.querySelector("#egShowAns, #qxPracShowAns");
        if (showEl && !egCheckedAt(session, idx)) showEl.checked = false;
      } catch (_) { /* */ }
      markCurrentPal(idx);
      api.goTo(idx);
    }
    function bindNavBtns() {
      try {
        function wireNav(el, go) {
          if (!el) return;
          /* qxnav1: pointerup once + lock — never double-fire click+touchend */
          var lockUntil = 0;
          function fire(e) {
            if (e) {
              try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
            }
            var now = Date.now();
            if (now < lockUntil) return;
            lockUntil = now + 150;
            go();
          }
          el.ontouchend = null;
          el.onpointerup = function (e) {
            if (!e) return;
            if (typeof e.button === "number" && e.button !== 0) return;
            fire(e);
          };
          /* locked click: non-PointerEvent fallback + doc backup sees onclick */
          el.onclick = fire;
          el.style.setProperty("pointer-events", "auto", "important");
          el.style.setProperty("z-index", "2147483001", "important");
          el.style.setProperty("cursor", "pointer", "important");
          el.style.setProperty("display", "inline-flex", "important");
          el.style.setProperty("visibility", "visible", "important");
          el.style.setProperty("opacity", "1", "important");
          el.style.setProperty("touch-action", "manipulation", "important");
        }
        const p = root.querySelector("#qxPrevBtn");
        if (p) {
          p.textContent = "Previous"; /* qxeg6: re-label every render/bind */
          p.removeAttribute("disabled");
          if (session.idx <= 0) p.setAttribute("disabled", "disabled");
          p.disabled = session.idx <= 0;
          wireNav(p, function () { if (session.idx > 0) goNav(session.idx - 1); });
        }
        const n = root.querySelector("#qxNextBtn");
        if (n) {
          n.textContent = "Next";
          n.removeAttribute("disabled");
          if (session.idx >= session.ids.length - 1) n.setAttribute("disabled", "disabled");
          n.disabled = session.idx >= session.ids.length - 1;
          wireNav(n, function () { if (session.idx < session.ids.length - 1) goNav(session.idx + 1); });
        }
        const sv = root.querySelector("#qxSaveBtn");
        if (sv) {
          sv.textContent = "Save & Next";
          wireNav(sv, function () { if (session.idx < session.ids.length - 1) goNav(session.idx + 1); });
        }
      } catch (_) { /* */ }
    }
    root._egBindNavBtns = bindNavBtns;
    bindNavBtns();
    root._egForceFoot = forceFootVisible;
    forceFootVisible(true); /* one paint on bind — foot already in DOM */
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(function () { try { bindNavBtns(); } catch (_) {} });
    }
    /* qxeg4: document-level Prev/Next/Save backup */
    if (!window._egNavDocBound) {
      window._egNavDocBound = true;
      document.addEventListener("click", function (ev) {
        try {
          const t = ev.target && ev.target.closest && ev.target.closest("#qxPrevBtn, #qxNextBtn, #qxSaveBtn");
          if (!t) return;
          if (t.disabled || t.getAttribute("disabled") != null) return;
          const eng = typeof QuantrexTestEngine !== "undefined" ? QuantrexTestEngine : null;
          const sess = eng && eng.getSession ? eng.getSession() : null;
          if (!sess || !sess.ids) return;
          const id = t.id || "";
          if (id === "qxPrevBtn" && sess.idx > 0) {
            if (typeof t.onclick === "function") return;
            ev.preventDefault(); ev.stopPropagation();
            if (eng.goTo) eng.goTo(sess.idx - 1);
          } else if ((id === "qxNextBtn" || id === "qxSaveBtn") && sess.idx < sess.ids.length - 1) {
            if (typeof t.onclick === "function") return;
            ev.preventDefault(); ev.stopPropagation();
            if (eng.goTo) eng.goTo(sess.idx + 1);
          }
        } catch (_) { /* */ }
      }, true);
    }
    root.querySelectorAll("[data-eg-sub]").forEach(function (btn) {
      btn.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const name = btn.getAttribute("data-eg-sub");
        const g = subjectGroups(session, api.getQ).find(function (x) { return x.name === name; });
        if (g && g.indices.length) goNav(g.indices[0]);
      };
    });
    root.querySelectorAll(".eg-qbar-n[data-qidx], .eg-pal-cell[data-qidx]").forEach(function (cell) {
      /* qxnav1: pointerup + instant active-class sync before goNav refresh */
      var lockUntil = 0;
      function fireCell(e) {
        if (e) {
          try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
        }
        var now = Date.now();
        if (now < lockUntil) return;
        lockUntil = now + 120;
        const idx = parseInt(cell.getAttribute("data-qidx"), 10);
        if (Number.isNaN(idx)) return;
        markCurrentPal(idx);
        goNav(idx);
      }
      cell.ontouchend = null;
      cell.onpointerup = function (e) {
        if (!e) return;
        if (typeof e.button === "number" && e.button !== 0) return;
        fireCell(e);
      };
      cell.onclick = fireCell;
      try {
        cell.style.setProperty("touch-action", "manipulation", "important");
        cell.style.setProperty("cursor", "pointer", "important");
        cell.style.setProperty("pointer-events", "auto", "important");
      } catch (_) { /* */ }
    });

    /* qxmd171: More sheet retained as fallback (hidden on Marks foot); still wires if present */
    (function wireFootMore() {
      try {
        var more = root.querySelector("#egFootMore");
        var extra = root.querySelector("#egFootExtra");
        var scrim = root.querySelector("#egFootSheetScrim");
        function setOpen(on) {
          root.classList.toggle("eg-foot-more-open", !!on);
          if (more) more.setAttribute("aria-expanded", on ? "true" : "false");
          if (scrim) {
            if (on) { scrim.removeAttribute("hidden"); scrim.setAttribute("aria-hidden", "false"); }
            else { scrim.setAttribute("hidden", ""); scrim.setAttribute("aria-hidden", "true"); }
          }
        }
        if (more) {
          more.onclick = function (e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            setOpen(!root.classList.contains("eg-foot-more-open"));
          };
        }
        if (scrim) {
          scrim.onclick = function (e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            setOpen(false);
          };
        }
        /* Close sheet after Mark / Clear so foot stays clean */
        ["#qxReviewNextBtn", "#qxClearBtn"].forEach(function (sel) {
          var b = root.querySelector(sel);
          if (!b) return;
          var prev = b.onclick;
          b.addEventListener("click", function () {
            setTimeout(function () { setOpen(false); }, 30);
          }, true);
        });
        /* Swipe-up / long-press on foot opens More; swipe-down closes */
        var footEl = root.querySelector("#egFoot");
        if (footEl && !footEl._egSwipeBound) {
          footEl._egSwipeBound = true;
          var sy = 0, lpTimer = 0;
          footEl.addEventListener("touchstart", function (ev) {
            try { sy = ev.touches && ev.touches[0] ? ev.touches[0].clientY : 0; } catch (_) { sy = 0; }
            try { clearTimeout(lpTimer); } catch (_) {}
            lpTimer = setTimeout(function () { setOpen(true); }, 480);
          }, { passive: true });
          footEl.addEventListener("touchmove", function () { try { clearTimeout(lpTimer); } catch (_) {} }, { passive: true });
          footEl.addEventListener("touchend", function (ev) {
            try { clearTimeout(lpTimer); } catch (_) {}
            try {
              var ey = ev.changedTouches && ev.changedTouches[0] ? ev.changedTouches[0].clientY : sy;
              var dy = ey - sy;
              if (dy < -40) setOpen(true);
              else if (dy > 40) setOpen(false);
            } catch (_) {}
          }, { passive: true });
          footEl.addEventListener("touchcancel", function () { try { clearTimeout(lpTimer); } catch (_) {} }, { passive: true });
        }
        void extra;
      } catch (_) { /* */ }
    })();

    const themeBtn = root.querySelector("#mtkThemeBtn");
    if (themeBtn) themeBtn.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (window._egThemeLock && Date.now() - window._egThemeLock < 400) return;
      window._egThemeLock = Date.now();
      if (typeof toggleTestTheme === "function") toggleTestTheme();
    };
    const fmtBtn = root.querySelector("#egFmtBtn");
    if (fmtBtn) fmtBtn.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (window._egFmtLock && Date.now() - window._egFmtLock < 120) return;
      window._egFmtLock = Date.now();
      session._egFmtOpen = !session._egFmtOpen;
      var existing = root.querySelector("#egFmtPop");
      if (!session._egFmtOpen) {
        if (existing) try { existing.remove(); } catch (_) {}
        return;
      }
      /* Prefer light refresh only if pop markup not in DOM yet */
      if (typeof api.refresh === "function") api.refresh();
    };
    root.querySelectorAll("[data-eg-scale]").forEach(function (b) {
      b.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (typeof setTestFontScale === "function") setTestFontScale(b.getAttribute("data-eg-scale"));
      };
    });
    root.querySelectorAll("[data-eg-pal]").forEach(function (b) {
      b.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        var mode = b.getAttribute("data-eg-pal");
        setPalettePref(mode);
        root.querySelectorAll("[data-eg-pal]").forEach(function (x) {
          x.classList.toggle("on", x.getAttribute("data-eg-pal") === mode);
        });
        /* Apply immediately without full refresh */
        applyPalettePrefOpen(session);
        if (mode === "side") {
          session._egStripOpen = false;
          session._egSideOpen = true;
        } else if (mode === "strip") {
          session._egStripOpen = true;
          session._egSideOpen = false;
        } else {
          session._egStripOpen = true;
          session._egSideOpen = true;
        }
        session._egSideCollapsed = !session._egSideOpen;
        session._egSideUserOpened = !!(session._egSideOpen || session._egStripOpen);
        syncCycleBtn();
        if (typeof showToast === "function") {
          showToast(mode === "side" ? "Palette: Right sidebar" : mode === "strip" ? "Palette: Top bar" : "Palette: Both");
        }
      };
    });
    /* qxmd167: Aa More row → proxy to toolbar buttons (no extra clutter in Practice foot) */
    root.querySelectorAll("[data-eg-fmt-act]").forEach(function (b) {
      b.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        var act = b.getAttribute("data-eg-fmt-act");
        var map = { star: "#egStarBtn", plus: "#egPlusBtn", full: "#egFullBtn", report: "#mtkReportBtn" };
        var sel = map[act];
        var tgt = sel && root.querySelector(sel);
        session._egFmtOpen = false;
        try {
          var pop = root.querySelector("#egFmtPop");
          if (pop) pop.remove();
        } catch (_) { /* */ }
        if (tgt) {
          try { tgt.click(); } catch (_) {
            try { if (typeof tgt.onclick === "function") tgt.onclick(); } catch (_2) { /* */ }
          }
        }
      };
    });
    const menu = root.querySelector("#egMenuBtn");
    const allQ = root.querySelector("#egAllQBtn");
    function wireTap(el, fn) {
      if (!el) return;
      el.onclick = fn;
      el.ontouchend = function (e) {
        if (!e) return;
        try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
        fn(e);
      };
      el.onpointerup = function (e) {
        if (!e || e.pointerType === "mouse") return;
        fn(e);
      };
      el.style.pointerEvents = "auto";
      el.style.cursor = "pointer";
      el.removeAttribute("disabled");
    }
    wireTap(allQ, cycleAllQChrome);
    wireTap(menu, toggleEgSideOnly);
    /* Ensure EVERY toolbar control is tappable above overlays */
    ["#egStarBtn", "#egPlusBtn", "#egAllQBtn", "#egMenuBtn", "#egFullBtn", "#mtkThemeBtn", "#egFmtBtn", "#mtkReportBtn", "#egFlagBtn", "#egNoteBtn"].forEach(function (sel) {
      const el = root.querySelector(sel);
      if (!el) return;
      el.style.setProperty("pointer-events", "auto", "important");
      el.style.setProperty("z-index", "14050", "important");
      el.style.setProperty("cursor", "pointer", "important");
      el.removeAttribute("disabled");
      try { el.style.setProperty("touch-action", "manipulation", "important"); } catch (_) {}
    });
    const toolsBar = root.querySelector(".eg-top-tools");
    if (toolsBar) {
      toolsBar.style.setProperty("pointer-events", "auto", "important");
      toolsBar.style.setProperty("z-index", "14040", "important");
    }
    const topHdr = root.querySelector(".eg-top");
    if (topHdr) {
      topHdr.style.setProperty("pointer-events", "auto", "important");
      topHdr.style.setProperty("z-index", "14030", "important");
    }
    syncCycleBtn();
    forceFootVisible(false);
    bindNavBtns();
    /* qxeg7: no delayed foot thrash — CSS keeps Prev/Next visible */

    /* Document-level backup so All Q works even if re-render drops onclick */
    if (!window._egMenuDocBound) {
      window._egMenuDocBound = true;
      document.addEventListener("click", function (ev) {
        try {
          const t = ev.target && ev.target.closest && ev.target.closest("#egAllQBtn, #egMenuBtn");
          if (!t) return;
          const rootEl = t.closest(".eg-test-root");
          if (!rootEl) return;
          if (typeof t.onclick === "function") return; /* wireTap already handled */
          ev.preventDefault();
          ev.stopPropagation();
          const eng = typeof QuantrexTestEngine !== "undefined" ? QuantrexTestEngine : null;
          const sess = eng && eng.getSession ? eng.getSession() : null;
          if (!sess) return;
          const id = t.id || "";
          if (id === "egMenuBtn") {
            if (window._egMenuToggleLock && Date.now() - window._egMenuToggleLock < 80) return;
            window._egMenuToggleLock = Date.now();
            if (sess._egSideOpen) {
              sess._egSideOpen = false;
              sess._egSideCollapsed = true;
            } else {
              sess._egSideOpen = true;
              sess._egSideCollapsed = false;
              sess._egSideUserOpened = true;
              sess._egSideIgnoreScrimUntil = Date.now() + 160;
            }
          } else {
            if (window._egAllQToggleLock && Date.now() - window._egAllQToggleLock < 80) return;
            window._egAllQToggleLock = Date.now();
            if (sess._egPreviewOpen || sess._egStripOpen) {
              sess._egPreviewOpen = false;
              sess._egStripOpen = false;
            } else {
              sess._egPreviewOpen = true;
              sess._egStripOpen = true;
              sess._egSideUserOpened = true;
            }
          }
          /* qxeg7: NO eng.refresh() — class sync only (instant chrome) */
          if (typeof rootEl._egSyncCycleBtn === "function") rootEl._egSyncCycleBtn();
          else if (typeof ExamgoalTestUI !== "undefined" && ExamgoalTestUI.chromeFlags) {
            try {
              var cf2 = ExamgoalTestUI.chromeFlags(sess);
              rootEl.classList.toggle("eg-strip-open", !!cf2.stripOpen);
              rootEl.classList.toggle("eg-strip-collapsed", !cf2.stripOpen);
              rootEl.classList.toggle("eg-side-open", !!cf2.sideOpen);
              rootEl.classList.toggle("eg-side-collapsed", !cf2.sideOpen);
              rootEl.classList.toggle("eg-preview-open", !!cf2.previewOpen);
              rootEl.classList.toggle("eg-desktop-mode", !!cf2.anyOpen);
              rootEl.classList.toggle("eg-mobile", !cf2.anyOpen);
            } catch (_) {}
          }
        } catch (_) { /* */ }
      }, true);
    }

    // Submit — always wire (test mode); inline onclick is backup
    function fireSubmit(e) {
      if (e) { try { e.preventDefault(); e.stopPropagation(); } catch (_) { /* */ } }
      if (window._qxSubmitLock && Date.now() - window._qxSubmitLock < 400) return;
      window._qxSubmitLock = Date.now();
      try {
        if (typeof window.qxSubmitTest === "function") window.qxSubmitTest();
        else if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.submit) {
          if (window.confirm("Submit test now?")) QuantrexTestEngine.submit(false);
        }
      } catch (err) { console.error("eg submit", err); }
    }
    root.querySelectorAll("#qxSubmitBtn, #qxSubmitTop, #egSubmit, [data-eg-submit]").forEach(function (btn) {
      btn.onclick = fireSubmit;
      btn.ontouchend = function (e) {
        if (!e) return;
        try { e.preventDefault(); e.stopPropagation(); } catch (_) {}
        fireSubmit(e);
      };
      btn.style.setProperty("pointer-events", "auto", "important");
      btn.style.setProperty("z-index", "200002", "important");
      btn.style.setProperty("cursor", "pointer", "important");
      btn.disabled = false;
      btn.removeAttribute("disabled");
    });
    if (!window._egSubmitDocBound) {
      window._egSubmitDocBound = true;
      document.addEventListener("click", function (ev) {
        try {
          const t = ev.target && ev.target.closest && ev.target.closest("#qxSubmitBtn, #qxSubmitTop, [data-eg-submit]");
          if (!t) return;
          if (window._qxSubmitLock && Date.now() - window._qxSubmitLock < 400) return;
          if (typeof t.onclick === "function") return;
          fireSubmit(ev);
        } catch (_) { /* */ }
      }, true);
    }
    const sideClose = root.querySelector("#egSideClose");
    if (sideClose) sideClose.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      session._egToolsOpen = false;
      collapseEgSideOnly(); /* ✕ right = side ONLY */
    };
    const stripClose = root.querySelector("#egStripClose");
    if (stripClose) stripClose.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      collapseEgStripOnly(); /* ✕ top = strip ONLY */
    };
    const previewClose = root.querySelector("#egQPreviewClose");
    if (previewClose) previewClose.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      session._egPreviewOpen = false;
      syncCycleBtn();
    };
    root.querySelectorAll(".eg-qpreview-row[data-qidx]").forEach(function (row) {
      row.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const idx = parseInt(row.getAttribute("data-qidx"), 10);
        if (Number.isNaN(idx)) return;
        session._egPreviewOpen = false;
        goNav(idx);
      };
    });
    const footCloseBtn = root.querySelector("#egFootClose");
    if (footCloseBtn) footCloseBtn.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      session._egToolsOpen = false;
      collapseEgSideOnly();
    };
    const scrim = root.querySelector("#egSideScrim");
    if (scrim) scrim.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (session._egSideIgnoreScrimUntil && Date.now() < session._egSideIgnoreScrimUntil) return;
      session._egToolsOpen = false;
      collapseEgSideOnly();
    };
    const full = root.querySelector("#egFullBtn");
    if (full) full.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      try {
        const el = root.closest(".eg-test-root") || root || document.documentElement;
        if (typeof toggleQxImmersiveFullscreen === "function") toggleQxImmersiveFullscreen(el);
        else if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen).call(document.documentElement);
        } else {
          (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        }
      } catch (_) { /* */ }
    };
    const qid = session.ids[session.idx];
    const bm = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (typeof toggleBm === "function") toggleBm(qid);
      else if (typeof QuantrexBookmarks !== "undefined") QuantrexBookmarks.toggle(qid);
      if (typeof api.refresh === "function") api.refresh();
    };
    const s1 = root.querySelector("#egStarBtn");
    const s2 = root.querySelector("#egQStar");
    const s3 = root.querySelector("#egStarBtnExtra");
    if (s1) s1.onclick = bm;
    if (s2) s2.onclick = bm;
    if (s3) s3.onclick = bm;
    function openGroup(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (typeof toggleBmWithGroup === "function") toggleBmWithGroup(qid);
      else if (typeof openNotebookGroupPicker === "function") openNotebookGroupPicker(qid);
      else if (typeof showToast === "function") showToast("Group / notebook");
    }
    const plus = root.querySelector("#egPlusBtn");
    if (plus) plus.onclick = openGroup;
    const flagBtn = root.querySelector("#egFlagBtn");
    if (flagBtn) flagBtn.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      try {
        normalizeSessionSets(session);
        if (typeof api.toggleReview === "function") {
          api.toggleReview();
        } else {
          if (session.review.has(session.idx)) session.review.delete(session.idx);
          else session.review.add(session.idx);
        }
      } catch (_) { /* */ }
      const on = !!(session.review && session.review.has(session.idx));
      try {
        flagBtn.classList.toggle("on", on);
        flagBtn.classList.toggle("eg-flag-on", on);
        flagBtn.setAttribute("aria-pressed", on ? "true" : "false");
        root.querySelectorAll('.eg-qbar-n[data-qidx="' + session.idx + '"], .eg-pal-cell[data-qidx="' + session.idx + '"]').forEach(function (cell) {
          const helpers = { hasAnswerAt: api.hasAnswerAt };
          const st = (typeof ExamgoalTestUI !== "undefined" && ExamgoalTestUI.paletteStatus)
            ? ExamgoalTestUI.paletteStatus(session, session.idx, helpers)
            : (on ? "eg-marked" : "eg-unseen");
          const cur = cell.classList.contains("cur") ? " cur" : "";
          const isPal = cell.classList.contains("eg-pal-cell");
          cell.className = (isPal ? "eg-pal-cell mtk-pal-cell " : "eg-qbar-n eg-q-dot ") + st + cur;
        });
      } catch (_) { /* */ }
      if (typeof api.refresh === "function") {
        /* keep immersive; light refresh for status colors */
        setTimeout(function () { try { api.refresh(); } catch (_) {} }, 0);
      }
    };
    // Tooltips: hover/focus show label; leave/blur hide; brief on touch
    root.querySelectorAll(".eg-tool-btn[data-tip], .eg-ico[data-tip]").forEach(function (btn) {
      const tip = btn.querySelector(".eg-tip");
      if (!tip) return;
      const show = function () { btn.classList.add("tip-on"); };
      const hide = function () { btn.classList.remove("tip-on"); };
      btn.addEventListener("mouseenter", show);
      btn.addEventListener("mouseleave", hide);
      btn.addEventListener("focus", show);
      btn.addEventListener("blur", hide);
      btn.addEventListener("touchstart", function () {
        show();
        setTimeout(hide, 900);
      }, { passive: true });
    });
    const noteBtn = root.querySelector("#egNoteBtn");
    if (noteBtn) noteBtn.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      openNote(qid, noteBtn);
    };
    function fireReport(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (typeof openQuestionReport === "function") openQuestionReport(qid);
    }
    const report = root.querySelector("#mtkReportBtn");
    if (report) report.onclick = fireReport;
    const zoomOut = root.querySelector("#egZoomOut");
    const zoomIn = root.querySelector("#egZoomIn");
    const zoomOutH = root.querySelector("#egZoomOutHdr");
    const zoomInH = root.querySelector("#egZoomInHdr");
    function zoomDelta(d) {
      return function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (typeof bumpTestZoom === "function") bumpTestZoom(d);
        if (typeof applyTestZoomToDom === "function") applyTestZoomToDom(typeof getTestZoom === "function" ? getTestZoom() : 1);
      };
    }
    if (zoomOut) zoomOut.onclick = zoomDelta(-1);
    if (zoomIn) zoomIn.onclick = zoomDelta(1);
    if (zoomOutH) zoomOutH.onclick = zoomDelta(-1);
    if (zoomInH) zoomInH.onclick = zoomDelta(1);
    root.querySelectorAll("[data-qzrr-zoom]").forEach(function (btn) {
      if (btn.onclick) return;
      btn.onclick = zoomDelta(Number(btn.getAttribute("data-qzrr-zoom")) || 0);
    });
    if (typeof applyTestZoomToDom === "function") {
      applyTestZoomToDom(typeof getTestZoom === "function" ? getTestZoom() : 1);
    }
    // Light-mode strip: guarantee index numerals are present in each dot
    try {
      root.querySelectorAll(".eg-qbar-n, .eg-q-dot").forEach(function (dot) {
        const raw = (dot.getAttribute("data-qnum") || dot.textContent || "").trim();
        if (!raw) {
          const idx = parseInt(dot.getAttribute("data-qidx"), 10);
          if (!Number.isNaN(idx)) {
            const n = String(idx + 1);
            dot.setAttribute("data-qnum", n);
            dot.textContent = n;
          }
        }
      });
    } catch (_) { /* */ }
  }

  function syncTheme(mode) {
    const m = mode === "dark" ? "dark" : "light";
    try { localStorage.setItem("quantrex_test_theme", m); } catch (_) { /* */ }
    document.querySelectorAll(".eg-test-root, .mtk-test-root").forEach(function (root) {
      try {
        root.setAttribute("data-test-theme", m);
        root.classList.toggle("qzrr-dark", m === "dark");
        root.classList.toggle("qx-theme-dark", m === "dark");
        root.classList.toggle("qx-theme-light", m === "light");
        const btn = root.querySelector("#mtkThemeBtn");
        if (btn) btn.classList.toggle("eg-moon", m === "light");
      } catch (_) { /* */ }
    });
    document.querySelectorAll(".eg-test-root .eg-main, .eg-test-root .eg-q-card, .eg-test-root .eg-opt, .eg-test-root .mtk-opt").forEach(function (el) {
      try { el.style.color = ""; el.style.backgroundColor = ""; } catch (_) { /* */ }
    });
  }

  global.ExamgoalTestUI = {
    isExamgoalUi: isExamgoalUi,
    render: render,
    bind: bind,
    paletteStatus: paletteStatus,
    subjectGroups: subjectGroups,
    applyOptDecor: applyOptDecor,
    checkAnswer: checkAnswer,
    ensureCss: ensureCss,
    openNote: openNote,
    normalizeSessionSets: normalizeSessionSets,
    toIndexSet: toIndexSet,
    chromeFlags: chromeFlags,
    syncTheme: syncTheme,
    revealPracticeSolution: revealPracticeSolution,
    egNukeStemAboveHeader: egNukeStemAboveHeader,
    egCoverHostQuestionStrip: egCoverHostQuestionStrip,
    wantShowSol: wantShowSol,
    egCheckedAt: egCheckedAt,
    solutionHtml: solutionHtml,
    getPalettePref: getPalettePref,
    setPalettePref: setPalettePref,
    applyPalettePrefOpen: applyPalettePrefOpen
  };
})(window);
