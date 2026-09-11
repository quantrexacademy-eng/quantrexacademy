// Quantrex catalog client — course → subject → chapter → page of IDs.
// Never downloads a full 12k+ bank. Optional memory cache only.
const QuantrexCatalog = (() => {
  const mem = Object.create(null);
  const LIMIT = 40;

  async function get(params) {
    const qs = new URLSearchParams(params);
    const key = qs.toString();
    if (mem[key]) return mem[key];
    const live = /(?:^|&)action=q(?:s)?(?:&|$)/.test(key);
    const res = await fetch("/api/catalog?" + key, { cache: live ? "no-store" : "force-cache" });
    const data = await res.json();
    if (data && data.ok) mem[key] = data;
    return data;
  }

  function courses() {
    return get({ action: "courses" });
  }

  function toc(exam) {
    return get({ action: "toc", exam: exam });
  }

  function chapters(exam, subject) {
    return get({ action: "chapters", exam: exam, subject: subject });
  }

  function questions(opts) {
    const o = opts || {};
    return get({
      action: "questions",
      exam: o.exam || o.courseId || "",
      subject: o.subject || "",
      chapter: o.chapter || "",
      topicId: o.topicId || "",
      bucketId: o.bucketId || "",
      cursor: String(o.cursor || 0),
      limit: String(o.limit || LIMIT)
    });
  }

  function tests() {
    return get({ action: "tests" });
  }

  function question(id, exam) {
    const p = { action: "q", id: String(id || "") };
    if (exam) p.exam = String(exam);
    return get(p);
  }

  function questionsByIds(ids) {
    const list = (ids || []).filter(Boolean).slice(0, 24).map(String);
    if (!list.length) return Promise.resolve({ ok: false, questions: [] });
    return get({ action: "qs", ids: list.join(",") });
  }

  function normalizeOptions(opts) {
    if (!Array.isArray(opts)) return [];
    return opts.map((o) => (o == null ? "" : (typeof o === "string" ? o : String(o.text || o.html || o.value || ""))));
  }

  function imgCount(s) {
    return (String(s || "").match(/<img\b/gi) || []).length;
  }

  function isMatchHtml(s) {
    const t = String(s || "");
    return /<table/i.test(t) && /List[\s\-]*I/i.test(t);
  }

  function applyCatalogRec(q, rec) {
    if (!q || !rec) return q;
    if ((q._book || q._bookId) && !needsFill(q)) return q;
    let recOpts = normalizeOptions(rec.options);
    let recStem = rec.q || rec.questionText || rec.question || "";
    const curStem = String(q.q || "");
    const stubStem = !curStem.trim()
      || /^Loading question/i.test(curStem.replace(/<[^>]+>/g, " ").trim())
      || /^(figure|fig\.?|diagram|image)$/i.test(curStem.replace(/<[^>]+>/g, " ").trim());
    const recMatch = isMatchHtml(recStem);
    const curMatch = isMatchHtml(curStem);
    const keepMatch = curMatch && !recMatch;
    const keepRicherFig = !stubStem && !recMatch && imgCount(curStem) > imgCount(recStem);
    const proofHtml = (s) => {
      let t = String(s || "");
      if (typeof QxProof !== "undefined" && QxProof.proofreadHtml) t = QxProof.proofreadHtml(t);
      else {
        t = t.replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/");
        t = t.replace(/LIST\s*[-–]?\s*II\s*\$/gi, "List-II").replace(/LIST\s*[-–]?\s*I\s*\$/gi, "List-I");
        t = t.replace(/\\\\\s*\[\s*[\d.]+\s*(?:pt|em|ex)?\s*\]/gi, "\\\\");
        t = t.replace(/\$([A-Za-z])\s*[–—-]\s*(axis|axes|th)\b/gi, "$$$1$-$2");
        if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.rewriteHtml) t = QxOwnedFigs.rewriteHtml(t);
      }
      return t;
    };
    if (recStem) recStem = proofHtml(recStem);
    if (recOpts && recOpts.length) recOpts = recOpts.map(proofHtml);
    if (typeof QxFirebaseBank !== "undefined" && QxFirebaseBank.rewriteOwnedFigures) {
      if (recStem) recStem = QxFirebaseBank.rewriteOwnedFigures(recStem);
      if (recOpts && recOpts.length) recOpts = recOpts.map((o) => QxFirebaseBank.rewriteOwnedFigures(o));
    }
    if (recStem && recMatch && !curMatch) {
      q.q = recStem;
      q._qxBankQ = recStem;
    } else if (recStem && !keepMatch && !keepRicherFig && (stubStem || String(recStem).length > curStem.length + 20 || imgCount(recStem) > imgCount(curStem))) {
      q.q = recStem;
      if (!q._qxBankQ) q._qxBankQ = recStem;
    }
    if (recOpts && recOpts.length) {
      const have = (q.options || []).some((o) => {
        const t = String(o || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (!t || /^[A-D]$/i.test(t)) return false;
        if (/%2F|watermarked|&clean=|cdn-question-pool/i.test(t) && !/<img\b/i.test(String(o || ""))) return false;
        return t.length > 1 || /<img\b/i.test(String(o || ""));
      });
      if (!have) {
        q.options = recOpts.slice();
        q._qxBankOptions = recOpts.slice();
      }
    }
    if (rec.solution && (!q.solution || String(q.solution).length < 20)) q.solution = rec.solution;
    if (rec.explanation && !q.explanation) q.explanation = rec.explanation;
    if (q.answer == null && rec.answer != null) q.answer = rec.answer;
    if (q.answer == null && rec.correctAnswer != null) q.answer = rec.correctAnswer;
    if (!q.answers && rec.answers) q.answers = rec.answers;
    if (rec.questionType && (!q.questionType || q.questionType === "singleCorrect")) q.questionType = rec.questionType;
    if (rec._marksId && !q._marksId) q._marksId = rec._marksId;
    if (rec.id != null && q.id == null) q.id = rec.id;
    if (rec.subject && !q.subject) q.subject = rec.subject;
    if (rec.chapter && !q.chapter) q.chapter = rec.chapter;
    if (rec.source) {
      const recRich = /shift|morning|evening|\d{1,2}\s*[A-Za-z]{3,}/i.test(String(rec.source));
      const cur = String(q.source || q._sourceFull || "");
      const curRich = /shift|morning|evening|\d{1,2}\s*[A-Za-z]{3,}/i.test(cur);
      if (!q.source || (recRich && !curRich)) q.source = rec.source;
      if (recRich) {
        q._sourceFull = rec.source;
        if (!q.paperSource || !curRich) q.paperSource = rec.source;
      }
    }
    if (rec.difficulty && !q.difficulty) q.difficulty = rec.difficulty;
    q._listStub = false;
    q._optsLoadFailed = false;
    return q;
  }

  function needsFill(q) {
    if (!q) return false;
    if (q._book || q._bookId) return false;
    const raw = String(q.q || "");
    const stem = raw.replace(/<[^>]+>/g, " ").trim();
    if (!stem || /^Loading question/i.test(stem)) return true;
    if (/List[\s\-]*I/i.test(stem) && ((raw.match(/<img\b/gi) || []).length < 2)) return true;
    if (/match list|list[\s\-]*i\b/i.test(stem)
      && !/List[\s\-]*II/i.test(stem)
      && !/<table/i.test(raw)
      && !/\\begin\{array\}/i.test(raw)) return true;
    if (/(following (reaction|compound|structure)|given (reaction|compound)|figure)/i.test(stem)
      && !/<img\b/i.test(raw + (q.options || []).join(" "))) return true;
    const opts = q.options || [];
    const hasOpt = opts.some((o) => {
      const t = String(o || "").replace(/<[^>]+>/g, "").trim();
      if (/C_\{|\^\{|\\binom/.test(String(o || ""))) return true;
      return (t && t.length > 0 && !/^[A-D]$/i.test(t)) || /<img\b/i.test(String(o || ""));
    });
    return !hasOpt;
  }

  async function fillQuestion(q) {
    if (!q) return q;
    if (q._catalogTried) return q;
    if (q._catalogFillInFlight) return q._catalogFillInFlight;
    if ((q._book || q._bookId) && !needsFill(q)) {
      q._catalogTried = true;
      return q;
    }
    const id = q._marksId || q.id;
    if (id == null || id === "") {
      q._catalogTried = true;
      return q;
    }
    if (!needsFill(q)) {
      q._catalogTried = true;
      return q;
    }
    q._catalogFillInFlight = _fillQuestionBody(q);
    try {
      return await q._catalogFillInFlight;
    } finally {
      q._catalogFillInFlight = null;
    }
  }

  async function _fillQuestionBody(q) {
    const id = q._marksId || q.id;
    try {
      if (typeof QxFirebaseBank !== "undefined" && QxFirebaseBank.getQuestion) {
        const fb = await QxFirebaseBank.getQuestion(id);
        if (fb) applyCatalogRec(q, fb);
      }
    } catch (_) { /* */ }
    if (!needsFill(q)) {
      q._catalogTried = true;
      q._fromFirebase = !!q._fromFirebase;
      return q;
    }
    try {
      const data = await question(id, q._bank);
      const rec = data && (data.question || (data.questions && data.questions[0]));
      if (rec) applyCatalogRec(q, rec);
    } catch (_) { /* */ }
    q._catalogTried = true;
    return q;
  }

  async function hydrateIds(ids) {
    const out = [];
    const all = (ids || []).slice(0, 80);
    const byKey = Object.create(null);
    for (let i = 0; i < all.length; i += 20) {
      const chunk = all.slice(i, i + 20);
      let packed = null;
      try { packed = await questionsByIds(chunk); } catch (_) { /* */ }
      ((packed && packed.questions) || []).forEach((rec) => {
        if (!rec) return;
        if (rec.id != null) byKey[String(rec.id)] = rec;
        if (rec._marksId) byKey[String(rec._marksId)] = rec;
      });
    }
    const list = all;
    for (const id of list) {
      const rec = byKey[String(id)] || byKey[String(id).replace(/^m_/, "")] || null;
      let q = typeof getQ === "function" ? (getQ(id) || (rec && (getQ(rec.id) || getQ(rec._marksId)))) : null;
      if (rec && q) {
        applyCatalogRec(q, rec);
        out.push(q);
        continue;
      }
      if (rec && rec.options && rec.options.length) {
        const nq = {
          id: rec.id != null ? rec.id : id,
          _marksId: rec._marksId || id,
          q: rec.q || "",
          options: rec.options.slice(),
          _qxBankOptions: rec.options.slice(),
          answer: rec.answer,
          answers: rec.answers,
          questionType: rec.questionType || "singleCorrect",
          subject: rec.subject || "",
          chapter: rec.chapter || "",
          source: rec.source || "",
          difficulty: rec.difficulty || "",
          _bank: rec._bank || "",
          _listStub: false
        };
        if (typeof QUESTIONS !== "undefined") {
          QUESTIONS.push(nq);
          if (typeof _qxIndexQuestion === "function") _qxIndexQuestion(nq);
        }
        out.push(nq);
        continue;
      }
      if (typeof QxQuestionCache !== "undefined" && QxQuestionCache.get) {
        try {
          const q = await QxQuestionCache.get(id);
          if (q) { out.push(q); continue; }
        } catch (_) { /* */ }
      }
      out.push({ id: id, _marksId: id, q: "", options: [], _listStub: true });
    }
    return out;
  }

  return { courses, toc, chapters, questions, tests, hydrateIds, question, questionsByIds, fillQuestion, applyCatalogRec, needsFill, LIMIT };
})();
