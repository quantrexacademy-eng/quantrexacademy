/* ExamGOAL-faithful PYQ practice/test chrome — Quantrex Academy */
(function (global) {
  "use strict";

  function ensureCss() {
    let l = document.getElementById("egTestUiCss");
    if (!l) {
      l = document.createElement("link");
      l.id = "egTestUiCss";
      l.rel = "stylesheet";
      document.head.appendChild(l);
    }
    l.href = "assets/examgoal-test-ui.css?v=" + encodeURIComponent(global.QX_BUILD || "qxmd108");
  }

  function isExamgoalUi(session) {
    if (!session) return false;
    if (session.uiMode === "quizrr") return false;
    var tt = String(session.testType || "");
    // Timed PYQ mock + test series must never paint ExamGoal chrome / topic strip
    if (/^pyqmock$/i.test(tt) || /^testseries$/i.test(tt)) {
      if (!session.practiceMode) return false;
    }
    return session.uiMode === "examgoal" || !!session.practiceMode;
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
    const hasAns = helpers && helpers.hasAnswerAt ? helpers.hasAnswerAt(i) : false;
    const visited = !!(session.visited && session.visited.has(i));
    const marked = !!(session.review && session.review.has(i));
    const practice = !!session.practiceMode;
    const revealed = !!(session._egShowAnswer || (session._egChecked && session._egChecked[i]));
    if (practice) {
      if (revealed && hasAns) {
        return (session._egCorrect && session._egCorrect[i]) ? "eg-correct" : "eg-wrong";
      }
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

  function optsLookEmpty(optsEl) {
    if (!optsEl) return true;
    const nodes = optsEl.querySelectorAll(".mtk-opt, [data-opt]");
    if (!nodes.length) return true;
    let filled = 0;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const raw = String(n.innerHTML || "");
      if (/<img\b|\.katex|katex-mathml|katex-html|\\frac|\$/.test(raw)) {
        filled++;
        continue;
      }
      const t = String(n.textContent || "").replace(/\s+/g, "").replace(/^[A-D●○]$/i, "");
      if (t.length > 0) filled++;
    }
    return filled < 1;
  }

  function restoreOptsIfEmpty(optsEl, snap) {
    if (!optsEl || !snap) return false;
    if (!optsLookEmpty(optsEl)) return false;
    optsEl.innerHTML = snap;
    return true;
  }

  function keepOptsVisible(root, snap, session, q) {
    const optsEl = root && root.querySelector("#qxOpts");
    if (!optsEl) return;
    optsEl.hidden = false;
    optsEl.removeAttribute("hidden");
    optsEl.style.removeProperty("display");
    optsEl.style.visibility = "visible";
    optsEl.style.opacity = "1";
    optsEl.classList.add("eg-opts-revealed");
    if (snap && optsLookEmpty(optsEl)) optsEl.innerHTML = snap;
    optsEl.querySelectorAll(".mtk-opt, [data-opt]").forEach(function (btn) {
      btn.hidden = false;
      btn.removeAttribute("hidden");
      btn.style.removeProperty("display");
      btn.style.visibility = "visible";
      btn.style.opacity = "1";
    });
    if (session && q) applyOptDecor(root, session, q, session.idx);
  }

  function paintEgMath(el) {
    if (!el || typeof Mx === "undefined") return;
    try {
      /* Never rewrite #qxOpts as a whole — flattening `&lt;` to `<` eats A–D. */
      if (el.id === "qxOpts" || (el.classList && el.classList.contains("eg-opts"))
        || (el.querySelector && el.querySelector(".mtk-opt, [data-opt]"))) {
        const nodes = el.querySelectorAll(".mtk-opt-text, .mtk-opt .qx-content");
        if (nodes && nodes.length) {
          for (let i = 0; i < nodes.length; i++) paintEgMath(nodes[i]);
        }
        return;
      }
      if (Mx.repairKatexLeakInDom) Mx.repairKatexLeakInDom(el);
      if (Mx.recoverHollowStemInDom) Mx.recoverHollowStemInDom(el);
      const painted = !!(el.querySelector && el.querySelector(".katex, .katex-html"));
      const leaked = /spanclass|katex\s+-\s+html|<\s+span|&lt;\s*span/i.test(el.textContent || "");
      if (Mx.flattenUnsafeMathDollars && !painted && !leaked) {
        const before = el.innerHTML || "";
        if (/katex-error|ParseError:|\$\s*\\(?:lt|gt|le|ge|leq|geq|ne|neq|Rightarrow)\s*\$|set\s*\{[^$]*\$\\in|and3\^\{n\}/.test(before)) {
          const flat = Mx.flattenUnsafeMathDollars(before);
          if (flat !== before && !/\$[^$]{0,120}</.test(flat)) el.innerHTML = flat;
        }
      }
      if (Mx.stripKatexErrorDom) Mx.stripKatexErrorDom(el);
      const html = el.innerHTML || "";
      const needs = /\$[^$]{1,1200}\$|\\\(|\\\[/.test(html) && !(el.querySelector && el.querySelector(".katex"));
      if (needs) {
        if (typeof window.renderMathInElement === "function") {
          window.renderMathInElement(el, {
            delimiters: [
              { left: "$$", right: "$$", display: true },
              { left: "\\[", right: "\\]", display: true },
              { left: "$", right: "$", display: false },
              { left: "\\(", right: "\\)", display: false }
            ],
            throwOnError: false,
            errorColor: "#64748b",
            ignoredClasses: ["katex", "mathjax_ignore", "qx-tex-code"]
          });
        } else if (Mx.afterRenderLight) Mx.afterRenderLight(el);
        else if (Mx.afterRender) Mx.afterRender(el);
      }
      if (Mx.repairKatexLeakInDom) Mx.repairKatexLeakInDom(el);
      if (Mx.stripKatexErrorDom) Mx.stripKatexErrorDom(el);
      if (Mx.fixMathFlowInDom) Mx.fixMathFlowInDom(el);
    } catch (_) { /* */ }
  }

  function solutionHtml(q) {
    let sol = q && (q.solution || q.sol || q.explanation) || "";
    try {
      if (typeof Mx !== "undefined" && Mx.flattenUnsafeMathDollars) sol = Mx.flattenUnsafeMathDollars(sol);
    } catch (_) { /* */ }
    const plain = String(sol).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    let body = "";
    try {
      if (plain && typeof QuantrexSolution !== "undefined" && QuantrexSolution.formatBody) {
        body = QuantrexSolution.formatBody(sol, q);
      }
    } catch (_) { /* */ }
    if (!body) {
      if (!plain || /solution not available|support us by uploading|community solution|official solution is not available/i.test(plain)) {
        body = '<p class="qx-sol-missing">Solution not available.</p>';
      } else {
        body = typeof Mx !== "undefined" && Mx.html ? Mx.html(sol) : sol;
      }
    }
    let ans = "";
    try {
      if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.formatCorrectAnswer) {
        ans = String(QuantrexQFormat.formatCorrectAnswer(q) || "");
      }
    } catch (_) { /* */ }
    const ansHtml = ans
      ? ('<div class="qx-sol-ans"><span class="qx-sol-ans-lab">Answer</span><span class="qx-sol-ans-val qx-content">'
        + (typeof Mx !== "undefined" && Mx.html ? Mx.html(ans) : ans) + "</span></div>")
      : "";
    let diffHtml = "";
    try {
      if (typeof QuantrexStrip !== "undefined" && QuantrexStrip.solDifficultyHtml) {
        diffHtml = QuantrexStrip.solDifficultyHtml(q) || "";
      }
    } catch (_) { /* */ }
    return '<div class="eg-sol-inner">'
      + (diffHtml ? '<div class="qx-sol-diff-row">' + diffHtml + "</div>" : "")
      + ansHtml
      + '<div class="qx-content sol-body">' + body + "</div></div>";
  }

  function dwellSec(session) {
    const stored = (session.qTimes && session.qTimes[session.idx]) || 0;
    const enter = session._qEnterAt || Date.now();
    const extra = Math.max(0, Math.round((Date.now() - enter) / 1000));
    return stored + extra;
  }

  function render(ctx) {
    ensureCss();
    const session = ctx.session;
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
    const isPyq = !!(session && /pyqmock/i.test(String(session.testType || "")));
    const paperMeta = (practice || isPyq)
      ? ((typeof QuantrexStrip !== "undefined" && QuantrexStrip.paperMetaHtml)
        ? QuantrexStrip.paperMetaHtml(q, { includeChapter: false, includeSubject: false, dateShiftOnly: isPyq, pyqMock: isPyq })
        : ((typeof qxPaperMetaBlock === "function") ? qxPaperMetaBlock(q) : ""))
      : "";
    const titleEsc = String(session.title || "Test").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const stem = typeof ctx.renderQuestionText === "function" ? ctx.renderQuestionText(q, ctx.textReady) : "";
    const showSol = !!(practice && (session._egShowAnswer || (session._egChecked && session._egChecked[session.idx])));
    const hasAns = ctx.hasAnswerAt ? ctx.hasAnswerAt(session.idx) : session.answers[session.idx] != null;
    const sideOpen = !!session._egSideOpen;
    const fmtOpen = !!session._egFmtOpen;
    const starred = session.review && session.review.has(session.idx);

    function egEsc(s) {
      return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function egTopicBits(qq, subName) {
      const bits = [];
      if (subName) bits.push(String(subName));
      let ch = "";
      try {
        if (typeof QuantrexStrip !== "undefined" && QuantrexStrip.humanChapter) ch = QuantrexStrip.humanChapter(qq) || "";
      } catch (_) { /* */ }
      if (!ch && qq) ch = String(qq.chapterName || qq.chapterTitle || qq.chapter || "").trim();
      let st = "";
      if (qq) st = String(qq.subtopic || qq.subTopic || "").trim();
      if (!st && qq && qq.topicName) st = String(qq.topicName).trim();
      if (!st && qq && qq.topic) st = String(qq.topic).trim();
      function pushUnique(v) {
        if (!v) return;
        const low = v.toLowerCase();
        if (bits.some(function (b) { return String(b).toLowerCase() === low; })) return;
        bits.push(v);
      }
      pushUnique(ch);
      pushUnique(st);
      return bits;
    }
    /* Topic strip ONLY for chapter-wise practice. PYQ mock / full mock / test series hide it. */
    const showTopicStrip = !!practice;
    const topicBitsNow = showTopicStrip ? egTopicBits(q, curGroup && curGroup.name) : [];
    const topicLabelHtml = topicBitsNow.map(egEsc).join(' <span class="eg-ch-sep">|</span> ');
    /* Active subject tab follows current question subject (fixes Math tab + Chem stem). */
    const qSubName = canonSubject(q && (q.subject || q.Subject));
    const activeGroup = (qSubName && groups.find(function (g) { return g.name === qSubName; })) || curGroup;
    let tabs;
    if (groups.length <= 1) {
      if (showTopicStrip) {
        tabs = '<div class="eg-sub on eg-topic-strip" role="text">' +
          (topicLabelHtml || egEsc((activeGroup && activeGroup.name) || "Subject")) + "</div>";
      } else {
        tabs = '<div class="eg-sub on" role="text">' +
          egEsc((activeGroup && activeGroup.name) || "Subject") + "</div>";
      }
    } else {
      tabs = groups.map(function (g) {
        const on = activeGroup && g.name === activeGroup.name;
        return '<button type="button" class="eg-sub' + (on ? " on" : "") + '" data-eg-sub="' +
          String(g.name).replace(/"/g, "") + '">' + egEsc(g.name) + "</button>";
      }).join("") +
        (showTopicStrip && topicLabelHtml
          ? '<div class="eg-topic-strip eg-topic-strip-multi">' + topicLabelHtml + "</div>"
          : "");
    }
    const qbar = (curGroup && curGroup.indices || []).map(function (i, li) {
      const st = paletteStatus(session, i, ctx);
      const cur = i === session.idx ? " cur" : "";
      return '<button type="button" class="eg-qbar-n ' + st + cur + '" data-qidx="' + i + '" title="Question ' + (li + 1) + '">' + (li + 1) + "</button>";
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
        counts = '<span><i class="eg-dot correct"></i> ' + countStatus(g, "eg-correct") +
          '</span><span><i class="eg-dot wrong"></i> ' + countStatus(g, "eg-wrong") +
          '</span><span><i class="eg-dot att"></i> ' + countStatus(g, "eg-att") +
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
      ? '<div class="eg-leg">' +
        '<div class="eg-leg-i"><i class="eg-dot correct"></i>Correct</div>' +
        '<div class="eg-leg-i"><i class="eg-dot wrong"></i>Wrong</div>' +
        '<div class="eg-leg-i"><i class="eg-dot att"></i>Attempted</div>' +
        '<div class="eg-leg-i"><i class="eg-dot seen-p"></i>Seen</div>' +
        '<div class="eg-leg-i"><i class="eg-dot unseen"></i>Not Seen</div></div>'
      : '<div class="eg-leg">' +
        '<div class="eg-leg-i"><i class="eg-dot attempted"></i>Attempted</div>' +
        '<div class="eg-leg-i"><i class="eg-dot att-mark"></i>Attempted &amp; Marked</div>' +
        '<div class="eg-leg-i"><i class="eg-dot marked"></i>Marked</div>' +
        '<div class="eg-leg-i"><i class="eg-dot seen-t"></i>Seen</div>' +
        '<div class="eg-leg-i"><i class="eg-dot unseen"></i>Not Seen</div></div>';

    const timer = (!practice && session.durationSec != null)
      ? '<div class="eg-timer" id="qxTimer">' + formatClock(session.remainingSec) + "</div>"
      : "";

    const fmt = fmtOpen ? '<div class="eg-fmt-pop" id="egFmtPop">' +
      "<h5>Text size</h5><div class=\"eg-fmt-row\">" +
      '<button type="button" class="eg-scale' + (fontScale === "small" ? " on" : "") + '" data-eg-scale="small">S</button>' +
      '<button type="button" class="eg-scale' + (fontScale === "medium" ? " on" : "") + '" data-eg-scale="medium">M</button>' +
      '<button type="button" class="eg-scale' + (fontScale === "large" ? " on" : "") + '" data-eg-scale="large">L</button>' +
      '<button type="button" class="eg-scale' + (fontScale === "xlarge" ? " on" : "") + '" data-eg-scale="xlarge">XL</button></div>' +
      "<h5>Zoom</h5><div class=\"eg-fmt-row\">" +
      '<button type="button" id="egZoomOut" class="qzrr-zoom-circle" data-qzrr-zoom="-1">−</button>' +
      '<button type="button" id="egZoomIn" class="qzrr-zoom-circle qzrr-zoom-circle-plus" data-qzrr-zoom="1">+</button></div>' +
      "<h5>Math follows text size (KaTeX)</h5></div>" : "";

    const checkRow = practice
      ? '<div class="eg-action-row">' +
        '<div class="eg-check-wrap"><button type="button" class="eg-check" id="egCheckBtn">Check Answer</button></div>' +
        '<button type="button" class="eg-note" id="egNoteBtn">Add a Note</button></div>'
      : "";
    const showSwitch = '<label class="eg-show"><span class="eg-switch"><input type="checkbox" id="egShowAns"' +
      (session._egShowAnswer ? " checked" : "") +
      '><span class="eg-switch-knob" aria-hidden="true"></span></span> Show Answer</label>';
    const lastQ = session.idx >= session.ids.length - 1;
    const firstQ = session.idx <= 0;
    const foot = practice
      ? '<div class="eg-foot">' +
        '<div class="eg-foot-left">' + showSwitch + "</div>" +
        '<div class="eg-foot-right">' +
        '<button type="button" class="eg-btn" id="qxClearBtn">Clear Response</button>' +
        '<button type="button" class="eg-btn" id="qxPrevBtn"' + (firstQ ? " disabled" : "") + ">← Previous</button>" +
        '<button type="button" class="eg-btn eg-btn-next" id="qxNextBtn"' + (lastQ ? " disabled" : "") + ">Next →</button>" +
        "</div></div>"
      : '<div class="eg-foot">' +
        '<div class="eg-foot-left">' +
        '<button type="button" class="eg-btn" id="qxReviewNextBtn">Mark for Review &amp; Next</button>' +
        '<button type="button" class="eg-btn" id="qxClearBtn">Clear Response</button></div>' +
        '<div class="eg-foot-right">' +
        '<button type="button" class="eg-btn" id="qxPrevBtn"' + (firstQ ? " disabled" : "") + ">Previous</button>" +
        '<button type="button" class="eg-btn eg-btn-next" id="qxSaveBtn">Save &amp; Next</button>' +
        "</div>" +
        '<button type="button" class="eg-submit eg-submit-mobile" id="qxSubmitTop" onclick="event.preventDefault();event.stopPropagation();if(window.qxSubmitTest){window.qxSubmitTest();}return false;">Submit</button>' +
        "</div>";
    const submitSide = practice ? "" :
      '<div class="eg-side-foot"><button type="button" class="eg-submit" id="qxSubmitBtn" onclick="event.preventDefault();event.stopPropagation();if(window.qxSubmitTest){window.qxSubmitTest();}return false;">Submit</button></div>';

    const mode = practice ? "PRACTICE" : "TEST";
    if (session._egSideCollapsed == null) {
      session._egSideCollapsed = true;
    }
    if (session._egQbarOpen == null) session._egQbarOpen = false;
    const collapsed = !!session._egSideCollapsed;
    const qbarOn = !!session._egQbarOpen && collapsed;
    const qidNow = session.ids[session.idx];
    const bmOn = !!(typeof QuantrexBookmarks !== "undefined" && QuantrexBookmarks.isBookmarked && QuantrexBookmarks.isBookmarked(qidNow));

    /* topic lives in eg-subs second strip */
return '<div class="eg-test-root mtk-test-root' + (collapsed ? " eg-side-collapsed" : " eg-side-open") +
      (qbarOn ? " eg-qbar-open" : "") +
      '" data-test-theme="' + theme + '" data-font-scale="' + fontScale +
      '" data-eg-mode="' + (practice ? "practice" : "test") + '" data-practice="' + (practice ? "1" : "0") + '" data-ui="examgoal">' +
      '<header class="eg-top">' +
      '<button type="button" class="eg-back" id="mtkExitBtn" data-qx-exit="1" title="Back" aria-label="Back" onclick="event.preventDefault();event.stopPropagation();if(window.qxExitTest){window.qxExitTest();}return false;">' +
      ico('<path d="M15 18l-6-6 6-6"/>') + "</button>" +
      '<div class="eg-top-title">' + titleEsc + ' <span class="eg-mode-pill">' + mode + "</span></div>" +
      '<div class="eg-top-tools">' + timer +
      '<button type="button" class="eg-ico" id="egFullBtn" title="Full screen" aria-label="Full screen">' +
      ico('<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>') + "</button>" +
      '<button type="button" class="eg-ico star' + (bmOn ? " on" : "") + '" id="egStarBtn" title="Bookmark" aria-label="Bookmark">' +
      (bmOn
        ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 18.77 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
        : ico('<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 18.77 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/>')) +
      "</button>" +
      '<button type="button" class="eg-ico mtk-theme-btn' + (theme === "light" ? " eg-moon" : "") + '" id="mtkThemeBtn" title="Light / dark">' +
      (theme === "dark"
        ? ico('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>')
        : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>') +
      "</button>" +
      '<button type="button" class="eg-ico" id="egZoomOutHdr" title="Zoom out" aria-label="Zoom out">−</button>' +
      '<button type="button" class="eg-ico" id="egZoomInHdr" title="Zoom in" aria-label="Zoom in">+</button>' +
      '<button type="button" class="eg-ico" id="egFmtBtn" title="Text size">Aa</button>' +
      '<button type="button" class="eg-ico' + (qbarOn ? " on" : "") + '" id="egMenuBtn" title="Top question numbers">' + ico('<path d="M4 6h16M4 12h16M4 18h16"/>') + "</button>" +
      "</div>" + fmt +
      "</header>" +
      '<div class="eg-subs">' + tabs + "</div>" +
      "" +
      '<div class="eg-qbar" id="egQBar" role="navigation" aria-label="Question numbers">' + qbar + "</div>" +
      '<div class="eg-body">' +
      '<div class="eg-main"><div class="eg-q-card">' +
      '<div class="eg-q-meta">' +
      '<span class="eg-q-time">' + formatQTime(dwellSec(session)) +
      ' | <span class="eg-mark"><span class="plus">+' + marks.pos + '</span> <span class="minus">' + marks.neg + "</span></span></span>" +
      '<span class="eg-q-num">' + qno + "</span>" +
      '<span class="eg-type">' + typeLab + "</span>" +
      '<div class="eg-q-tools">' +
      '<button type="button" class="eg-ico" id="egPlusBtn" title="Save to group">+</button>' +
      '<button type="button" class="eg-ico star' + (bmOn ? " on" : "") + '" id="egQStar" title="Bookmark">' + (bmOn ? "★" : "☆") + "</button>" +
      '<button type="button" class="eg-ico warn" id="mtkReportBtn" title="Report question">!</button>' +
      "</div></div>" +
      (paperMeta || "") +
      '<div class="eg-q-stem" id="egQArea">' + stem + "</div>" +
      (ctx.sectionInstr || "") +
      '<div class="' + (ctx.optsClass || "mtk-options mtk-options-grid") + ' eg-opts" id="qxOpts">' + (ctx.opts || "") + "</div>" +
      checkRow +
      (showSol ? '<div class="eg-sol" id="egSol">' + solutionHtml(q) + "</div>" : "") +
      '</div>' +
      foot +
      "</div>" +
      '<button type="button" class="eg-rail-toggle" id="egRailBtn" title="Question palette" aria-label="Question palette">☰</button>' +
      '<aside class="eg-side" id="egSide">' +
      '<div class="eg-side-h"><span>Questions</span>' +
      '<button type="button" class="eg-side-x" id="egSideClose" title="Close palette" aria-label="Close">×</button></div>' +
      legend + palHtml + submitSide + "</aside>" +
      "</div></div>";
  }

  function applyOptDecor(root, session, q, idx) {
    if (!root || !q) return;
    const show = !!(session._egShowAnswer || (session._egChecked && session._egChecked[idx]));
    const optsEl = root.querySelector("#qxOpts");
    if (optsEl) optsEl.classList.toggle("eg-opts-revealed", !!show);
    const host = root.closest ? (root.closest(".eg-test-root") || root.querySelector(".eg-test-root") || root) : root;
    if (host && host.classList) host.classList.toggle("eg-revealed", !!show);
    if (!show || typeof QuantrexQFormat === "undefined") return;
    let cor = [];
    try { cor = QuantrexQFormat.correctIndices(q) || []; } catch (_) { cor = []; }
    const chosen = session.answers[idx];
    const chosenSet = Array.isArray(chosen) ? chosen : (chosen != null && chosen !== "" ? [chosen] : []);
    root.querySelectorAll("#qxOpts [data-opt], #qxOpts .mtk-opt").forEach(function (btn) {
      const i = parseInt(btn.dataset.opt, 10);
      if (Number.isNaN(i)) return;
      btn.classList.remove("eg-opt-right", "eg-opt-wrong");
      if (cor.indexOf(i) >= 0) btn.classList.add("eg-opt-right");
      else if (chosenSet.indexOf(i) >= 0) btn.classList.add("eg-opt-wrong");
      btn.style.display = "flex";
      btn.style.visibility = "visible";
      btn.style.opacity = "1";
    });
  }

  var PAL_ST = {
    "eg-correct": 1, "eg-wrong": 1, "eg-att": 1, "eg-seen": 1, "eg-unseen": 1,
    "eg-attempted": 1, "eg-att-mark": 1, "eg-marked": 1, "eg-seen-test": 1, "cur": 1
  };

  function syncPalette(root, session, helpers) {
    if (!root || !session) return;
    root.querySelectorAll(".eg-qbar-n[data-qidx], .eg-pal-cell[data-qidx]").forEach(function (cell) {
      const i = parseInt(cell.getAttribute("data-qidx"), 10);
      if (Number.isNaN(i)) return;
      const st = paletteStatus(session, i, helpers || {});
      const keep = [];
      String(cell.className || "").split(/\s+/).forEach(function (c) {
        if (c && !PAL_ST[c]) keep.push(c);
      });
      keep.push(st);
      if (i === session.idx) keep.push("cur");
      cell.className = keep.join(" ");
    });
  }

  function helpersFromSession(session) {
    return {
      hasAnswerAt: function (i) {
        const a = session && session.answers && session.answers[i];
        return a != null && a !== "";
      }
    };
  }

  function resolveQ(session) {
    if (!session || !session.ids) return null;
    const id = session.ids[session.idx];
    if (typeof global.getQ === "function") {
      try {
        const q = global.getQ(id);
        if (q) return q;
      } catch (_) { /* */ }
    }
    const map = global.TS_ACTIVE_QMAP;
    if (map) return map[id] || map[String(id)] || null;
    return null;
  }

  /* Fast-nav patch used to skip rebuilding #egSol — Check / Show Answer did nothing. */
  function syncSolution(root, session, q, helpers) {
    if (!root || !session) return;
    const practice = !!session.practiceMode;
    const show = !!(practice && (session._egShowAnswer || (session._egChecked && session._egChecked[session.idx])));
    const opts = helpers || helpersFromSession(session);
    const scroll = !!opts.scrollIntoView;
    let solEl = root.querySelector("#egSol");
    const card = root.querySelector(".eg-q-card");
    const optsEl = root.querySelector("#qxOpts");
    const optsSnap = optsEl ? optsEl.innerHTML : "";
    const after = root.querySelector(".eg-action-row") || optsEl;
    if (show && q) {
      if (!solEl) {
        solEl = document.createElement("div");
        solEl.id = "egSol";
        solEl.className = "eg-sol eg-sol-open";
        solEl.setAttribute("role", "region");
        solEl.setAttribute("aria-label", "Solution");
        if (after && after.parentNode) after.parentNode.insertBefore(solEl, after.nextSibling);
        else if (card) card.appendChild(solEl);
        else root.appendChild(solEl);
      }
      solEl.classList.add("eg-sol-open");
      solEl.hidden = false;
      solEl.removeAttribute("hidden");
      solEl.style.display = "block";
      solEl.innerHTML = solutionHtml(q);
      keepOptsVisible(root, optsSnap, session, q);
      paintEgMath(solEl);
      applyOptDecor(root, session, q, session.idx);
      requestAnimationFrame(function () {
        keepOptsVisible(root, optsSnap, session, q);
        paintEgMath(solEl);
        /* ExamGoal: stay on the options. Solution is below — user scrolls down. */
        if (scroll) {
          try {
            const cardEl = root.querySelector(".eg-q-card");
            if (cardEl && optsEl) {
              const c = cardEl.getBoundingClientRect();
              const o = optsEl.getBoundingClientRect();
              const delta = o.top - c.top - 12;
              if (delta < 0 || delta > c.height * 0.55) {
                cardEl.scrollTop = Math.max(0, cardEl.scrollTop + delta);
              }
            }
          } catch (_) { /* */ }
        }
        setTimeout(function () { keepOptsVisible(root, optsSnap, session, q); }, 40);
        setTimeout(function () { keepOptsVisible(root, optsSnap, session, q); }, 180);
      });
    } else if (solEl) {
      solEl.remove();
      root.querySelectorAll("[data-opt]").forEach(function (btn) {
        btn.classList.remove("eg-opt-right", "eg-opt-wrong");
      });
    }
    syncPalette(root, session, opts);
    const showBox = root.querySelector("#egShowAns");
    if (showBox) showBox.checked = !!session._egShowAnswer;
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
    if (!session) return false;
    const q = getQFn
      ? getQFn(session.ids[session.idx])
      : resolveQ(session);
    if (!q) return false;
    if (!session._egChecked) session._egChecked = {};
    if (!session._egCorrect) session._egCorrect = {};
    session._egChecked[session.idx] = true;
    const chosen = session.answers[session.idx];
    const answered = typeof QuantrexQFormat !== "undefined"
      ? QuantrexQFormat.isAnswered(q, chosen)
      : chosen != null && chosen !== "";
    if (answered) {
      try {
        const g = QuantrexQFormat.grade(q, chosen);
        session._egCorrect[session.idx] = !!(g && g.correct);
      } catch (_) {
        session._egCorrect[session.idx] = chosen === q.answer;
      }
    }
    return true;
  }

  function bind(root, api) {
    if (!root || !api || !api.session) return;
    const session = api.session;
    applyOptDecor(root, session, api.getQ(session.ids[session.idx]), session.idx);

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
    const qTimeEl = root.querySelector(".eg-q-time");
    if (qTimeEl) {
      global._egQTimerInterval = setInterval(function () {
        if (!document.contains(qTimeEl) || !session) {
          clearInterval(global._egQTimerInterval);
          global._egQTimerInterval = null;
          return;
        }
        const sec = dwellSec(session);
        const marks = posNeg(session, api.getQ(session.ids[session.idx]), false, false);
        qTimeEl.innerHTML = formatQTime(sec) + ' | <span class="eg-mark"><span class="plus">+' + marks.pos + '</span> <span class="minus">' + marks.neg + "</span></span>";
      }, 1000);
    }

    function revealNow(scroll) {
      const qNow = api.getQ ? api.getQ(session.ids[session.idx]) : resolveQ(session);
      syncSolution(root, session, qNow, {
        hasAnswerAt: api.hasAnswerAt || helpersFromSession(session).hasAnswerAt,
        scrollIntoView: !!scroll
      });
    }
    ["#qxSubmitBtn", "#qxSubmitTop"].forEach(function (sel) {
      const el = root.querySelector(sel);
      if (!el) return;
      if (!el.getAttribute("onclick")) {
        el.setAttribute("onclick", "event.preventDefault();event.stopPropagation();if(window.qxSubmitTest){window.qxSubmitTest();}return false;");
      }
      el.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (typeof window.qxSubmitTest === "function") window.qxSubmitTest();
      };
    });
    root.querySelectorAll("#egCheckBtn").forEach(function (check) {
      check.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        checkAnswer(session, api.getQ);
        revealNow(false);
      };
    });
    const show = root.querySelector("#egShowAns");
    if (show) show.onchange = function () {
      session._egShowAnswer = !!show.checked;
      revealNow(!!show.checked);
    };
    function bindFastNav(el, fn) {
      if (!el) return;
      const fire = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); }
        /* One navigation per gesture — pointerdown+click was skipping a question */
        if (window._qxEgNavLock && Date.now() - window._qxEgNavLock < 320) return;
        window._qxEgNavLock = Date.now();
        fn();
      };
      el.onclick = fire;
      el.onpointerdown = null;
      el.onpointerup = null;
    }
    bindFastNav(root.querySelector("#qxPrevBtn"), function () {
      if (session.idx > 0 && api.goTo) api.goTo(session.idx - 1);
    });
    bindFastNav(root.querySelector("#qxNextBtn"), function () {
      if (session.idx < session.ids.length - 1 && api.goTo) api.goTo(session.idx + 1);
    });
    bindFastNav(root.querySelector("#qxSaveBtn"), function () {
      if (typeof api.saveAndNext === "function") api.saveAndNext();
      else if (session.idx < session.ids.length - 1 && api.goTo) api.goTo(session.idx + 1);
    });
    root.querySelectorAll("[data-eg-sub]").forEach(function (btn) {
      btn.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const name = btn.getAttribute("data-eg-sub");
        const g = subjectGroups(session, api.getQ).find(function (x) { return x.name === name; });
        if (g && g.indices.length && typeof api.goTo === "function") api.goTo(g.indices[0]);
      };
    });
    root.querySelectorAll(".eg-qbar-n[data-qidx], .eg-pal-cell[data-qidx]").forEach(function (cell) {
      cell.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const idx = parseInt(cell.getAttribute("data-qidx"), 10);
        if (!Number.isNaN(idx) && typeof api.goTo === "function") api.goTo(idx);
      };
    });
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
      session._egFmtOpen = !session._egFmtOpen;
      if (typeof api.refresh === "function") api.refresh();
    };
    root.querySelectorAll("[data-eg-scale]").forEach(function (b) {
      b.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (typeof setTestFontScale === "function") setTestFontScale(b.getAttribute("data-eg-scale"));
      };
    });
    function applyNav() {
      const sideOn = !session._egSideCollapsed;
      const qbarOnNow = !!session._egQbarOpen && !sideOn;
      root.classList.toggle("eg-side-collapsed", !sideOn);
      root.classList.toggle("eg-side-open", !!sideOn);
      root.classList.toggle("eg-qbar-open", !!qbarOnNow);
      const menuBtn = root.querySelector("#egMenuBtn");
      if (menuBtn) menuBtn.classList.toggle("on", !!qbarOnNow);
    }
    function palLock() {
      if (window._qxEgPalLock && Date.now() - window._qxEgPalLock < 90) return true;
      window._qxEgPalLock = Date.now();
      return false;
    }
    function toggleQbar() {
      if (palLock()) return;
      session._egQbarOpen = !session._egQbarOpen;
      if (session._egQbarOpen) {
        session._egSideCollapsed = true;
        session._qxUserOpenedPal = false;
      }
      applyNav();
    }
    function toggleSide(force) {
      if (palLock()) return;
      if (force === true) session._egSideCollapsed = false;
      else if (force === false) session._egSideCollapsed = true;
      else session._egSideCollapsed = !session._egSideCollapsed;
      session._qxUserOpenedPal = !session._egSideCollapsed;
      if (!session._egSideCollapsed) session._egQbarOpen = false;
      applyNav();
    }
    const menu = root.querySelector("#egMenuBtn");
    if (menu) menu.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      toggleQbar();
    };
    const rail = root.querySelector("#egRailBtn");
    if (rail) rail.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      toggleSide();
    };
    const sideClose = root.querySelector("#egSideClose");
    if (sideClose) sideClose.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      toggleSide(false);
    };
    const full = root.querySelector("#egFullBtn");
    if (full) full.onclick = function () {
      try {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
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
    if (s1) s1.onclick = bm;
    if (s2) s2.onclick = bm;
    const plus = root.querySelector("#egPlusBtn");
    if (plus) plus.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (typeof toggleBmWithGroup === "function") toggleBmWithGroup(qid);
    };
    const noteBtn = root.querySelector("#egNoteBtn");
    if (noteBtn) noteBtn.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      openNote(qid, noteBtn);
    };
    const report = root.querySelector("#mtkReportBtn");
    if (report) report.onclick = function (e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (typeof openQuestionReport === "function") openQuestionReport(qid);
    };
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
  }

  global.ExamgoalTestUI = {
    isExamgoalUi: isExamgoalUi,
    render: render,
    bind: bind,
    paletteStatus: paletteStatus,
    syncPalette: syncPalette,
    subjectGroups: subjectGroups,
    checkAnswer: checkAnswer,
    syncSolution: syncSolution,
    solutionHtml: solutionHtml,
    restoreOptsIfEmpty: restoreOptsIfEmpty,
    keepOptsVisible: keepOptsVisible,
    paintEgMath: paintEgMath,
    ensureCss: ensureCss,
    openNote: openNote,
    applyNav: function (root, session) {
      if (!root || !session) return;
      const sideOn = !session._egSideCollapsed;
      const qbarOnNow = !!session._egQbarOpen && !sideOn;
      root.classList.toggle("eg-side-collapsed", !sideOn);
      root.classList.toggle("eg-side-open", !!sideOn);
      root.classList.toggle("eg-qbar-open", !!qbarOnNow);
      const menuBtn = root.querySelector("#egMenuBtn");
      if (menuBtn) menuBtn.classList.toggle("on", !!qbarOnNow);
    }
  };

  if (!global._qxEgSolClickBound) {
    global._qxEgSolClickBound = true;
    document.addEventListener("click", function (e) {
      const btn = e.target && e.target.closest && e.target.closest("#egCheckBtn");
      if (!btn) return;
      const root = btn.closest(".eg-test-root");
      if (!root) return;
      e.preventDefault();
      e.stopPropagation();
      let session = null;
      try {
        if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.getSession) {
          session = QuantrexTestEngine.getSession();
        }
      } catch (_) { /* */ }
      if (!session) return;
      const q = resolveQ(session);
      checkAnswer(session, typeof global.getQ === "function" ? global.getQ : function () { return q; });
      syncSolution(root, session, q || resolveQ(session), { scrollIntoView: false });
    }, true);
    document.addEventListener("pointerdown", function (e) {
      if (e && e.button != null && e.button !== 0) return;
      const jump = e.target && e.target.closest && e.target.closest(".eg-pal-cell[data-qidx], .eg-qbar-n[data-qidx], .mtk-pal-cell[data-qidx]");
      if (jump) {
        const root = jump.closest(".eg-test-root, .mtk-test-root");
        if (!root) return;
        const idx = parseInt(jump.getAttribute("data-qidx"), 10);
        if (Number.isNaN(idx)) return;
        e.preventDefault();
        e.stopPropagation();
        if (window._qxEgNavLock && Date.now() - window._qxEgNavLock < 40) return;
        window._qxEgNavLock = Date.now();
        try {
          if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.goTo) {
            QuantrexTestEngine.goTo(idx);
          }
        } catch (_) { /* */ }
        return;
      }
      const palBtn = e.target && e.target.closest && e.target.closest("#egMenuBtn, #egRailBtn, #egSideClose");
      if (palBtn) {
        const root = palBtn.closest(".eg-test-root");
        if (!root) return;
        e.preventDefault();
        e.stopPropagation();
        let session = null;
        try {
          if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.getSession) {
            session = QuantrexTestEngine.getSession();
          }
        } catch (_) { /* */ }
        if (!session) return;
        if (window._qxEgPalLock && Date.now() - window._qxEgPalLock < 90) return;
        window._qxEgPalLock = Date.now();
        if (palBtn.id === "egMenuBtn") {
          session._egQbarOpen = !session._egQbarOpen;
          if (session._egQbarOpen) {
            session._egSideCollapsed = true;
            session._qxUserOpenedPal = false;
          }
        } else if (palBtn.id === "egSideClose") {
          session._egSideCollapsed = true;
          session._qxUserOpenedPal = false;
        } else {
          session._egSideCollapsed = !session._egSideCollapsed;
          session._qxUserOpenedPal = !session._egSideCollapsed;
          if (!session._egSideCollapsed) session._egQbarOpen = false;
        }
        if (global.ExamgoalTestUI && ExamgoalTestUI.applyNav) ExamgoalTestUI.applyNav(root, session);
        return;
      }
      const btn = e.target && e.target.closest && e.target.closest("#qxNextBtn, #qxPrevBtn, #qxSaveBtn");
      if (!btn || btn.disabled) return;
      if (!btn.closest(".eg-test-root, .mtk-test-root")) return;
      if (window._qxEgNavLock && Date.now() - window._qxEgNavLock < 320) return; /* qxmd105: no double Next */
      window._qxEgNavLock = Date.now();
      e.preventDefault();
      e.stopPropagation();
      let eng = null;
      try { eng = typeof QuantrexTestEngine !== "undefined" ? QuantrexTestEngine : null; } catch (_) { /* */ }
      const sess = eng && eng.getSession ? eng.getSession() : null;
      if (!sess || !sess.ids) return;
      if (btn.id === "qxPrevBtn" && sess.idx > 0 && eng.goTo) eng.goTo(sess.idx - 1);
      else if (btn.id === "qxNextBtn" && sess.idx < sess.ids.length - 1 && eng.goTo) eng.goTo(sess.idx + 1);
      else if (btn.id === "qxSaveBtn") {
        if (eng.saveAndNext) eng.saveAndNext();
        else if (eng.goTo && sess.idx < sess.ids.length - 1) eng.goTo(sess.idx + 1);
      }
    }, true);
    document.addEventListener("change", function (e) {
      const t = e.target;
      if (!t || t.id !== "egShowAns") return;
      const root = t.closest(".eg-test-root");
      if (!root) return;
      e.stopPropagation();
      let session = null;
      try {
        if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.getSession) {
          session = QuantrexTestEngine.getSession();
        }
      } catch (_) { /* */ }
      if (!session) return;
      session._egShowAnswer = !!t.checked;
      syncSolution(root, session, resolveQ(session), { scrollIntoView: !!t.checked });
    }, true);
  }
})(window);
