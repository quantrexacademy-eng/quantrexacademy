// Live MARKS API client — board PYQs (bpyqb) + NCERT toolbox (neet modules)
const MarksLive = (() => {
  const API = "https://web.getmarks.app";
  const BOARD_EXAMS = {
    CBSE: "6943ebc753e4e1880190efca",
    HSC: "694ad7d4158e3395c5200f5a"
  };
  const NCERT_MOD = {
    lblq: "LBLQSubject",
    ncoq: "NCOQSubject",
    dbq: "DBQSubject"
  };
  const NCERT_KIND_META = {
    lblq: { title: "NCERT Line by Line Qs", setFilter: null },
    ncoq: { title: "NCERT & Exemplar Qs", setFilter: null },
    dbq: { title: "Diagram Based Qs", setFilter: /diagram/i }
  };

  let _token = null;
  let _cfgLoaded = false;
  let _idSeq = 910000000;
  const _fullCache = {};
  const _navCache = {};

  async function ensureToken() {
    if (_token) return _token;
    const stored = localStorage.getItem("quantrex_marks_token");
    if (stored && stored.length > 20) {
      _token = stored;
      return _token;
    }
    if (!_cfgLoaded) {
      _cfgLoaded = true;
      try {
        const res = await fetch("data/marks_config.json");
        if (res.ok) {
          const cfg = await res.json();
          if (cfg.token) {
            _token = cfg.token;
            localStorage.setItem("quantrex_marks_token", cfg.token);
          }
        }
      } catch (e) { /* ignore */ }
    }
    return _token;
  }

  async function api(path) {
    const token = await ensureToken();
    if (!token) throw new Error("MARKS token missing");
    const res = await fetch(API + path, {
      headers: { Authorization: "Bearer " + token, Accept: "application/json" }
    });
    if (!res.ok) throw new Error("MARKS API " + res.status);
    return res.json();
  }

  function fmtDate(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) {
      return String(iso).slice(0, 10);
    }
  }

  function htmlPart(text, image) {
    let out = String(text || "").trim();
    if (image) out += (out ? "<br>" : "") + `<img src="${image}" alt="">`;
    return out;
  }

  function levelLabel(level) {
    if (level === 0 || level === 1) return "Easy";
    if (level === 2) return "Medium";
    return "Hard";
  }

  function boardId() {
    const b = (typeof dashBoardSelected === "function" ? dashBoardSelected() : null) || "CBSE";
    return BOARD_EXAMS[b] || BOARD_EXAMS.CBSE;
  }

  function boardLabel() {
    const b = (typeof dashBoardSelected === "function" ? dashBoardSelected() : null) || "CBSE";
    return b === "HSC" ? "HSC (Maharashtra)" : "CBSE";
  }

  function normalizeFull(data, meta) {
    const d = data.data || data;
    const qBody = d.question || d.title || {};
    const opts = (d.options || []).map(o => htmlPart(o.text, o.image));
    let answer = opts.findIndex((_, i) => d.options[i] && d.options[i].isCorrect);
    if (answer < 0 && d.correctValue != null) answer = 0;

    const papers = d.previousYearPapers || d.yearsAppeared || [];
    const paper = papers[0] || {};
    const source = paper.title || meta.source || "MARKS";
    const paperDate = paper.heldOn || d.previousYear || null;

    const marksId = d._id || d.id;
    let existing = marksId && typeof QUESTIONS !== "undefined"
      ? QUESTIONS.find(q => q._marksId === marksId)
      : null;
    if (existing) return existing;

    const rec = {
      id: _idSeq++,
      _marksId: marksId,
      _bank: meta.bank || "marks_live",
      _live: true,
      subject: meta.subject || "",
      chapter: meta.chapter || "",
      exam: meta.exam || (typeof STATE !== "undefined" ? STATE.exam : "Engineering"),
      examName: meta.examName || boardLabel(),
      q: htmlPart(qBody.text, qBody.image),
      options: opts.length ? opts : ["A", "B", "C", "D"],
      answer: Math.max(0, answer),
      solution: htmlPart((d.solution || {}).text, (d.solution || {}).image),
      difficulty: levelLabel(d.level),
      source,
      paperDate,
      paperSource: source
    };
    if (typeof QUESTIONS !== "undefined") QUESTIONS.push(rec);
    return rec;
  }

  function normalizeBoardListItem(item, meta) {
    const marksId = item.questionId || item._id;
    let existing = marksId && typeof QUESTIONS !== "undefined"
      ? QUESTIONS.find(q => q._marksId === marksId)
      : null;
    if (existing) return existing;

    const qBody = item.question || item.title || {};
    const papers = item.previousYearPapers || item.yearsAppeared || [];
    const paper = papers[0] || {};
    const source = paper.title || meta.source || boardLabel();
    const paperDate = paper.heldOn || item.previousYear || null;

    const rec = {
      id: _idSeq++,
      _marksId: marksId,
      _bank: "board_live",
      _live: true,
      _needsFull: true,
      subject: meta.subject || "",
      chapter: meta.chapter || "",
      exam: typeof STATE !== "undefined" ? STATE.exam : "Engineering",
      examName: boardLabel(),
      q: htmlPart(qBody.text, qBody.image),
      options: ["A", "B", "C", "D"],
      answer: 0,
      solution: "",
      difficulty: "Medium",
      source,
      paperDate,
      paperSource: source
    };
    if (typeof QUESTIONS !== "undefined") QUESTIONS.push(rec);
    return rec;
  }

  async function fetchFullQuestion(qid, meta) {
    if (_fullCache[qid]) return _fullCache[qid];
    const data = await api("/api/v1/questions/" + qid);
    const rec = normalizeFull(data, meta || {});
    _fullCache[qid] = rec;
    return rec;
  }

  async function hydrateQuestions(qs, meta) {
    const out = [];
    for (const q of qs) {
      if (q._needsFull && q._marksId) {
        try {
          out.push(await fetchFullQuestion(q._marksId, { ...meta, subject: q.subject, chapter: q.chapter }));
        } catch (e) {
          out.push(q);
        }
      } else {
        out.push(q);
      }
    }
    return out;
  }

  async function boardSubjects(examId) {
    const id = examId || boardId();
    const key = "bs:" + id;
    if (_navCache[key]) return _navCache[key];
    const data = await api("/api/v4/bpyqb/exam/" + id + "/subjects?platform=web");
    const d = data.data || {};
    const out = {
      examId: id,
      title: d.title || boardLabel(),
      meta: d.keyPointsMeta || [],
      subjects: (d.subjects || []).map(s => ({
        id: s.subjectId,
        name: s.title,
        shortTitle: s.shortTitle,
        icon: s.icon,
        globalSubjectId: s.globalSubjectId
      }))
    };
    _navCache[key] = out;
    return out;
  }

  async function boardChapters(examId, subjectId, offset, limit) {
    const id = examId || boardId();
    const data = await api(
      "/api/v4/bpyqb/exam/" + id + "/subject/" + subjectId +
      "/chapters?limit=" + (limit || 50) + "&offset=" + (offset || 0) + "&sortBy=title&platform=web"
    );
    const d = data.data || {};
    return {
      chapters: (d.chapters || []).map(c => ({
        id: c.chapterId,
        name: c.title,
        count: c.totalQuestions || 0,
        icon: c.icon
      })),
      total: d.totalChapters || (d.chapters || []).length,
      subject: d.subject,
      exam: d.exam
    };
  }

  async function boardChapterDetails(examId, subjectId, chapterId) {
    const id = examId || boardId();
    const key = "bcd:" + id + ":" + subjectId + ":" + chapterId;
    if (_navCache[key]) return _navCache[key];
    const data = await api(
      "/api/v4/bpyqb/exam/" + id + "/subject/" + subjectId + "/chapter/" + chapterId + "/details?platform=web"
    );
    _navCache[key] = data.data || {};
    return _navCache[key];
  }

  async function boardBucketQuestions(examId, subjectId, chapterId, bucketId, offset, limit, meta) {
    const id = examId || boardId();
    const data = await api(
      "/api/v4/bpyqb/exam/" + id + "/subject/" + subjectId + "/chapter/" + chapterId +
      "/bucket/" + bucketId + "?offset=" + (offset || 0) + "&limit=" + (limit || 100) + "&platform=web"
    );
    const d = data.data || {};
    const items = d.questions || [];
    return {
      bucket: d.bucket,
      questions: items.map(q => normalizeBoardListItem(q, meta || {})),
      total: (d.bucket && d.bucket.totalQuestions) || items.length
    };
  }

  async function ncertSubjects(kind) {
    const mod = NCERT_MOD[kind] || NCERT_MOD.lblq;
    const key = "ns:" + mod;
    if (_navCache[key]) return _navCache[key];
    const data = await api("/api/v4/neet/subjects?module=" + mod + "&platform=web");
    const subjects = ((data.data || {}).subjects || []).map(s => ({
      id: s._id,
      name: s.title,
      shortTitle: s.shortTitle,
      icon: s.icon,
      position: s.position
    }));
    _navCache[key] = { module: mod, kind, subjects };
    return _navCache[key];
  }

  async function ncertChapters(subjectId, kind) {
    const mod = NCERT_MOD[kind] || NCERT_MOD.lblq;
    const key = "nc:" + mod + ":" + subjectId;
    if (_navCache[key]) return _navCache[key];
    let offset = 0;
    const chapters = [];
    while (true) {
      const data = await api(
        "/api/v4/neet/subject/" + subjectId + "?module=" + mod + "&platform=web&offset=" + offset + "&limit=50"
      );
      const block = ((data.data || {}).chapters) || {};
      const batch = block.data || [];
      chapters.push(...batch.map(c => ({
        id: c._id,
        name: c.title,
        count: c.totalQs || c.questionsCount || c.questionCount || 0
      })));
      const showing = block.showing || batch.length;
      const total = block.total || chapters.length;
      offset += showing;
      if (!showing || offset >= total) break;
    }
    _navCache[key] = chapters;
    return chapters;
  }

  async function ncertChapterSets(subjectId, chapterId, kind) {
    const mod = NCERT_MOD[kind] || NCERT_MOD.lblq;
    const meta = NCERT_KIND_META[kind] || NCERT_KIND_META.lblq;
    const key = "ncs:" + mod + ":" + subjectId + ":" + chapterId;
    if (_navCache[key]) return _navCache[key];
    const data = await api(
      "/api/v4/neet/subject/" + subjectId + "/chapter/" + chapterId + "?module=" + mod + "&platform=web"
    );
    const modules = (data.data || {}).modules || [];
    const sets = [];
    for (const m of modules) {
      if (m.moduleType !== "ncertBasedQs") continue;
      for (const s of (m.questionSets || [])) {
        if (meta.setFilter && !meta.setFilter.test(s.title || "")) continue;
        if (!(s.questionCount || s.count)) continue;
        sets.push({
          moduleId: m._id,
          setId: s._id,
          title: s.title,
          count: s.questionCount || s.count || 0
        });
      }
    }
    _navCache[key] = sets;
    return sets;
  }

  async function ncertSetQuestionIds(subjectId, chapterId, moduleId, setId) {
    const ids = [];
    let offset = 0;
    while (true) {
      const data = await api(
        "/api/v4/neet/subject/" + subjectId + "/chapter/" + chapterId +
        "/module/" + moduleId + "/questionSet/" + setId +
        "/questions?platform=web&offset=" + offset + "&limit=100"
      );
      const block = data.data || {};
      const batch = block.questions || [];
      batch.forEach(q => {
        const qid = q.id || q._id;
        if (qid) ids.push(qid);
      });
      const showing = block.showing || batch.length;
      const total = block.total || ids.length;
      offset += showing;
      if (!showing || offset >= total) break;
    }
    return ids;
  }

  async function ncertSetQuestions(subjectId, chapterId, moduleId, setId, meta) {
    const qids = await ncertSetQuestionIds(subjectId, chapterId, moduleId, setId);
    const out = [];
    for (const qid of qids) {
      try {
        out.push(await fetchFullQuestion(qid, meta || {}));
      } catch (e) { /* skip */ }
    }
    return out;
  }

  return {
    BOARD_EXAMS,
    NCERT_MOD,
    NCERT_KIND_META,
    boardId,
    boardLabel,
    fmtDate,
    boardSubjects,
    boardChapters,
    boardChapterDetails,
    boardBucketQuestions,
    ncertSubjects,
    ncertChapters,
    ncertChapterSets,
    ncertSetQuestions,
    fetchFullQuestion,
    hydrateQuestions,
    ensureToken
  };
})();