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

  function fixImgUrl(url) {
    if (typeof QxImgClean !== "undefined" && QxImgClean.fixUrl) return QxImgClean.fixUrl(url);
    return String(url || "").replace(/https?:\/\/\.app\//gi, "https://cdn-question-pool.getmarks.app/");
  }

  const POOL_IMG_RX = /cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\/|\/cbse\/|ap_eamcet/i;

  function isPoolImgSrc(src) {
    return POOL_IMG_RX.test(fixImgUrl(src || ""));
  }

  function extractPoolImgTags(html) {
    const tags = [];
    const s = String(html || "");
    const figRx = /<figure\b[^>]*>[\s\S]*?<\/figure>/gi;
    let fm;
    while ((fm = figRx.exec(s)) !== null) {
      if (/<img\b/i.test(fm[0]) && isPoolImgSrc((fm[0].match(/\bsrc=["']([^"']+)["']/i) || [])[1])) {
        tags.push(fm[0]);
      }
    }
    const rx = /<img\b[^>]*>/gi;
    let m;
    while ((m = rx.exec(s)) !== null) {
      const srcM = m[0].match(/\bsrc=["']([^"']+)["']/i);
      if (!srcM || !isPoolImgSrc(srcM[1])) continue;
      if (tags.some(t => t.includes(srcM[1]))) continue;
      tags.push(m[0]);
    }
    const urlRx = /(?:src=["']|https?:\/\/)([^"'\s>]+)/gi;
    let um;
    while ((um = urlRx.exec(s)) !== null) {
      const src = fixImgUrl(um[1]);
      if (!isPoolImgSrc(src)) continue;
      if (tags.some(t => t.includes(src))) continue;
      tags.push(typeof QxImgClean !== "undefined" && QxImgClean.poolFigureHtml
        ? QxImgClean.poolFigureHtml(src)
        : `<figure class="qx-fig qx-pool-fig-wrap"><img class="qx-fig-img qx-no-wm qx-pool-fig" src="${src}" alt="" loading="eager" decoding="async"></figure>`);
    }
    return tags;
  }

  function prependPoolImgs(html, imgs) {
    if (!imgs || !imgs.length) return html || "";
    const body = String(html || "").trim();
    const block = imgs.join("<br>");
    return body ? block + "<br>" + body : block;
  }

  function mergePreserveImages(prev, next) {
    if (!next) return prev || null;
    if (!prev) return next;
    const out = { ...next };
    if (!/<img\b/i.test(out.q || "")) {
      const imgs = extractPoolImgTags(prev.q);
      if (imgs.length) out.q = prependPoolImgs(out.q, imgs);
    }
    const pOpts = prev.options || [];
    const nOpts = out.options || [];
    if (pOpts.length && nOpts.length) {
      out.options = nOpts.map((o, i) => {
        if (/<img\b/i.test(String(o || ""))) return o;
        const imgs = extractPoolImgTags(pOpts[i]);
        return imgs.length ? prependPoolImgs(o, imgs) : o;
      });
    }
    if (!/<img\b/i.test(out.solution || "")) {
      const imgs = extractPoolImgTags(prev.solution);
      if (imgs.length) out.solution = prependPoolImgs(out.solution, imgs);
    }
    return out;
  }

  function htmlPart(text, image) {
    let out = String(text || "").trim();
    if (typeof Mx !== "undefined" && Mx.html) out = Mx.html(out);
    const imgUrl = image || pickImageFromText(String(text || "")) || null;
    if (imgUrl && !/<img\b/i.test(out)) {
      const cdn = fixImgUrl(typeof imgUrl === "string" ? imgUrl : (imgUrl.url || imgUrl.src || ""));
      if (cdn) {
        out += (out ? "<br>" : "") + (typeof QxImgClean !== "undefined" && QxImgClean.poolFigureHtml
          ? QxImgClean.poolFigureHtml(cdn)
          : `<img class="qx-no-wm qx-pool-fig" src="${cdn}" alt="" loading="eager" decoding="async">`);
      }
    }
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

  function isBlankText(text) {
    const s = String(text || "");
    if (/<img\b/i.test(s)) return false;
    return !s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  function isNonMcqType(type) {
    const t = String(type || "").toLowerCase();
    if (/multiple|single|match/i.test(t)) return false;
    return /numerical|subjective|integer|long|descriptive|fill/i.test(t);
  }

  function optionHasContent(o) {
    const s = String(o || "");
    if (/<img/i.test(s)) return true;
    const t = s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!t) return false;
    const letters = new Set(["A", "B", "C", "D", "a", "b", "c", "d", "1", "2", "3", "4"]);
    return !letters.has(t);
  }

  function isPlaceholderOptions(options) {
    if (!options || !options.length) return true;
    return !options.some(optionHasContent);
  }

  function allOptionsHaveContent(options) {
    const opts = options || [];
    if (!opts.length) return false;
    return opts.every(optionHasContent);
  }

  function isPartialOptions(options) {
    if (!options || !options.length) return true;
    const filled = options.filter(optionHasContent).length;
    return filled > 0 && filled < options.length;
  }

  function isImageMcq(q) {
    if (!q || isNumericalQuestion(q)) return false;
    return (q.options || []).some(o => /<img/i.test(String(o || "")));
  }

  function isNumericalQuestion(q) {
    if (!q) return false;
    if (isNonMcqType(q.questionType || q.type)) return true;
    if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType(q) === "numerical") return true;
    const text = String(q.q || "");
    if (/nearest\s+integer|nearest integer|integer\s*value|integer\s*type|_______|_{3,}/i.test(text)) return true;
    if (q.correctValue != null && String(q.correctValue) !== "") return true;
    return false;
  }

  function isQuestionTextReady(q) {
    return !!q && !isBlankText(q.q);
  }

  function isOptionsReady(q) {
    if (!q) return false;
    if (isNumericalQuestion(q)) return isQuestionTextReady(q);
    const opts = q.options || [];
    if (!opts.length) return false;
    if (isPartialOptions(opts)) return false;
    if (isImageMcq(q) && !allOptionsHaveContent(opts)) return false;
    if (q._shardLoaded) return allOptionsHaveContent(opts);
    if (!q._marksId) return allOptionsHaveContent(opts);
    return !needsFullQuestion(q) || allOptionsHaveContent(opts);
  }

  function isQuestionReady(q) {
    return isQuestionTextReady(q) && isOptionsReady(q);
  }

  function isQuestionIncomplete(q) {
    return !isQuestionTextReady(q);
  }

  function isOptionsIncomplete(q) {
    return isQuestionTextReady(q) && !isOptionsReady(q);
  }

  function hasRealSolution(sol) {
    const plain = String(sol || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    if (!plain) return false;
    if (/^no solution\.?$/.test(plain)) return false;
    if (plain === "solution not available") return false;
    return true;
  }

  function cleanSolution(sol) {
    return hasRealSolution(sol) ? sol : "";
  }

  function needsFullQuestion(q) {
    if (!q || !q._marksId) return false;
    if (questionNeedsFigure(q)) return true;
    const nonMcq = isNonMcqType(q.questionType || q.type);
    if (q._shardLoaded) {
      if (isBlankText(q.q)) return true;
      if (nonMcq || isNumericalQuestion(q)) return false;
      return isPartialOptions(q.options) || !allOptionsHaveContent(q.options);
    }
    if (q._bank === "ts_active") {
      if (isBlankText(q.q)) return true;
      return !nonMcq && isPlaceholderOptions(q.options);
    }
    if (q._fullFetched) {
      if (isBlankText(q.q)) return true;
      return !nonMcq && isPlaceholderOptions(q.options);
    }
    return !!q._needsFull || isBlankText(q.q) || (!nonMcq && isPlaceholderOptions(q.options));
  }

  function pickImage(obj) {
    if (!obj) return null;
    if (obj.image) return obj.image;
    if (obj.img) return obj.img;
    if (Array.isArray(obj.images) && obj.images[0]) return obj.images[0];
    return null;
  }

  function pickImageFromText(text) {
    const s = String(text || "");
    const m = s.match(/\bsrc=["']([^"']+(?:cdn-question-pool|cdn\.quizrr|\/pyq\/)[^"']+)["']/i);
    return m ? fixImgUrl(m[1]) : null;
  }

  function hasPoolFigureInHtml(html) {
    const s = String(html || "");
    if (/<img\b[^>]*src=["'][^"']+(?:cdn-question-pool|cdn\.quizrr|\/pyq\/|\/cbse\/|ap_eamcet)/i.test(s)) return true;
    return extractPoolImgTags(s).length > 0;
  }

  function questionReferencesFigure(html) {
    const plain = String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return /\b(as (?:illustrated|shown)(?:\s+in)?(?:\s+the)?\s+figure|as in (?:the )?figure|see (?:the )?figure|figure (?:below|above|shown)|in the (?:following |given )?figure|from the figure|refer (?:to )?(?:the )?figure)\b/i.test(plain);
  }

  function questionNeedsFigure(q) {
    if (!q || !q._marksId) return false;
    if (q._figureFetchAttempted) return false;
    if (hasPoolFigureInHtml(q.q)) return false;
    if (q._questionImage) return true;
    if (questionReferencesFigure(q.q)) return true;
    return false;
  }

  function fieldsFromApi(d, meta) {
    const qBody = d.question || d.title || {};
    const qImg = pickImage(qBody) || pickImageFromText(qBody.text);
    const rawOpts = d.options || [];
    const opts = rawOpts.map(o => htmlPart(o.text, pickImage(o)));
    const correctList = rawOpts.map((o, i) => (o && o.isCorrect) ? i : -1).filter(i => i >= 0);
    let answer = correctList[0] != null ? correctList[0] : -1;
    if (answer < 0 && d.correctValue != null) answer = 0;
    if (answer < 0 && (d.type === "numerical" || d.questionType === "numerical")) answer = 0;
    const qType = d.type || d.questionType || (opts.length ? "singleCorrect" : "subjective");
    const numVal = d.correctValue != null ? d.correctValue
      : (d.correctAnswer != null ? d.correctAnswer : null);

    const papers = d.previousYearPapers || d.yearsAppeared || [];
    const paper = papers[0] || {};
    const source = paper.title || meta.source || d.source || "Quantrex PYQ";
    const paperDate = paper.heldOn || d.previousYear || null;

    const solRaw = htmlPart((d.solution || {}).text, pickImage(d.solution || {}));
    const video = d.videoSolution || null;
    return {
      q: htmlPart(qBody.text, qImg),
      _questionImage: qImg ? (typeof qImg === "string" ? qImg : (qImg.url || qImg.src || null)) : null,
      options: opts.length ? opts : [],
      answer: Math.max(0, answer),
      answers: correctList.length ? correctList : (answer >= 0 ? [answer] : []),
      correctValue: numVal,
      solution: cleanSolution(solRaw),
      hasSolution: hasRealSolution(solRaw),
      videoSolution: video,
      hasVideoSolution: !!(d.hasVideoSolution || (video && video.videoId)),
      difficulty: levelLabel(d.level),
      source,
      paperDate,
      paperSource: source,
      _needsFull: false,
      _fullFetched: true,
      questionType: qType
    };
  }

  function normalizeFull(data, meta) {
    const d = data.data || data;
    const marksId = d._id || d.id;
    const fields = fieldsFromApi(d, meta || {});

    let existing = marksId && typeof QUESTIONS !== "undefined"
      ? QUESTIONS.find(q => q._marksId === marksId)
      : null;

    if (existing) {
      const merged = mergePreserveImages(existing, fields);
      Object.assign(existing, merged, {
        subject: meta.subject || existing.subject,
        chapter: meta.chapter || existing.chapter,
        _bank: meta.bank || existing._bank
      });
      _fullCache[marksId] = existing;
      return existing;
    }

    const rec = {
      id: _idSeq++,
      _marksId: marksId,
      _bank: meta.bank || "marks_live",
      _live: true,
      subject: meta.subject || "",
      chapter: meta.chapter || "",
      exam: meta.exam || (typeof STATE !== "undefined" ? STATE.exam : "Engineering"),
      examName: meta.examName || boardLabel(),
      ...fields
    };
    if (!rec.options.length && !isNonMcqType(rec.questionType)) {
      rec._needsFull = true;
      rec._fullFetched = false;
    }
    if (typeof QUESTIONS !== "undefined") QUESTIONS.push(rec);
    _fullCache[marksId] = rec;
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
      q: htmlPart(qBody.text, pickImage(qBody)),
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

  async function fetchFullQuestion(qid, meta, force) {
    if (!force && _fullCache[qid] && !needsFullQuestion(_fullCache[qid])) return _fullCache[qid];
    const data = await api("/api/v1/questions/" + qid);
    return normalizeFull(data, meta || {});
  }

  function mergeIntoActiveMap(q, fields) {
    if (!q || q.id == null || !window.TS_ACTIVE_QMAP) return q;
    const preserved = mergePreserveImages(q, fields);
    const merged = { ...q, ...preserved, id: q.id, _bank: q._bank || "ts_active" };
    window.TS_ACTIVE_QMAP[q.id] = merged;
    window.TS_ACTIVE_QMAP[String(q.id)] = merged;
    return merged;
  }

  async function ensureQuestionFull(q, opts) {
    if (!q || !q._marksId) return q;
    const force = !!(opts && opts.force);
    const needSol = !!(opts && opts.solution);
    if (!force && !needsFullQuestion(q) && !(needSol && !hasRealSolution(q.solution))) return q;
    const snap = {
      q: q.q,
      options: (q.options || []).slice(),
      solution: q.solution
    };
    try {
      const fetched = await fetchFullQuestion(q._marksId, {
        subject: q.subject,
        chapter: q.chapter,
        bank: q._bank,
        examName: q.examName,
        source: q.source
      }, true);
      const preserved = mergePreserveImages(snap, fetched);
      Object.assign(fetched, preserved);
      if (q._bank === "ts_active" || window.TS_ACTIVE_QMAP) {
        return mergeIntoActiveMap(q, fetched);
      }
      if (typeof QUESTIONS !== "undefined") {
        const existing = QUESTIONS.find(x => x._marksId === q._marksId || x.id === q.id);
        if (existing) Object.assign(existing, preserved);
      }
      return fetched;
    } catch (e) {
      return q;
    }
  }

  async function hydrateQuestions(qs, meta) {
    const out = (qs || []).slice();
    const needIdx = [];
    out.forEach((q, i) => { if (needsFullQuestion(q)) needIdx.push(i); });
    const batch = 8;
    for (let i = 0; i < needIdx.length; i += batch) {
      await Promise.all(needIdx.slice(i, i + batch).map(async idx => {
        try {
          out[idx] = await ensureQuestionFull({ ...out[idx], ...meta });
        } catch (e) { /* keep stub */ }
      }));
    }
    return out;
  }

  async function fetchQuestionsByMarksIds(ids, meta) {
    const unique = [...new Set((ids || []).filter(Boolean))];
    const out = [];
    const missing = [];
    for (const id of unique) {
      if (_fullCache[id] && !needsFullQuestion(_fullCache[id])) {
        out.push(_fullCache[id]);
        continue;
      }
      if (typeof QUESTIONS !== "undefined") {
        const ex = QUESTIONS.find(q => q._marksId === id);
        if (ex && !needsFullQuestion(ex)) {
          out.push(ex);
          _fullCache[id] = ex;
          continue;
        }
      }
      missing.push(id);
    }
    const batch = 8;
    for (let i = 0; i < missing.length; i += batch) {
      const chunk = missing.slice(i, i + batch);
      const fetched = await Promise.all(chunk.map(async id => {
        try {
          return await fetchFullQuestion(id, meta || {});
        } catch (e) {
          return null;
        }
      }));
      fetched.filter(Boolean).forEach(q => out.push(q));
    }
    return out;
  }

  function normalizeCpyqbListItem(item, meta) {
    const marksId = item._id || item.questionId || item.id;
    let existing = marksId && typeof QUESTIONS !== "undefined"
      ? QUESTIONS.find(q => q._marksId === marksId)
      : null;
    if (existing && !needsFullQuestion(existing)) return existing;

    const qBody = item.question || item.title || {};
    const rawOpts = item.options || [];
    const hasRealOpts = rawOpts.length && rawOpts.some(o => o && (o.text || o.image));
    const papers = item.previousYearPapers || item.yearsAppeared || [];
    const paper = papers[0] || {};
    const source = paper.title || meta.source || "PYQ";
    const paperDate = paper.heldOn || item.previousYear || null;

    if (hasRealOpts) {
      return normalizeFull({ data: item }, meta || {});
    }

    const rec = {
      id: _idSeq++,
      _marksId: marksId,
      _bank: meta.bank || "marks_live",
      _live: true,
      _needsFull: true,
      subject: meta.subject || "",
      chapter: meta.chapter || "",
      exam: meta.exam || (typeof STATE !== "undefined" ? STATE.exam : "Engineering"),
      examName: meta.examName || "",
      q: htmlPart(qBody.text, pickImage(qBody)),
      options: ["A", "B", "C", "D"],
      answer: 0,
      solution: "",
      difficulty: levelLabel(item.level),
      source,
      paperDate,
      paperSource: source
    };
    if (typeof QUESTIONS !== "undefined") QUESTIONS.push(rec);
    _fullCache[marksId] = rec;
    return rec;
  }

  async function cpyqbBucketQuestions(examId, subjectId, chapterId, bucketId, meta) {
    const items = [];
    let offset = 0;
    while (true) {
      const data = await api(
        "/api/v4/cpyqb/exam/" + examId + "/subject/" + subjectId + "/chapter/" + chapterId +
        "/bucket/" + bucketId + "/questions?platform=web&limit=100&offset=" + offset
      );
      const block = data.data || {};
      const batch = block.questions || [];
      batch.forEach(q => items.push(normalizeCpyqbListItem(q, meta || {})));
      const showing = block.showing || batch.length;
      const total = block.total || items.length;
      offset += showing;
      if (!showing || offset >= total) break;
    }
    return { questions: items, total: items.length };
  }

  async function cpyqbTopicQuestions(examId, subjectId, chapterId, topicId, meta) {
    const items = [];
    let offset = 0;
    while (true) {
      const data = await api(
        "/api/v4/cpyqb/exam/" + examId + "/subject/" + subjectId + "/chapter/" + chapterId +
        "/topic/" + topicId + "/questions?platform=web&limit=100&offset=" + offset
      );
      const block = data.data || {};
      const batch = block.questions || [];
      batch.forEach(q => items.push(normalizeCpyqbListItem(q, meta || {})));
      const showing = block.showing || batch.length;
      const total = block.total || items.length;
      offset += showing;
      if (!showing || offset >= total) break;
    }
    return { questions: items, total: items.length };
  }

  function needsPrefetch(q) {
    if (!q || !q._marksId) return false;
    if (needsFullQuestion(q)) return true;
    if (isOptionsIncomplete(q)) return true;
    const opts = q.options || [];
    const hasBody = opts.some(o => String(o || "").replace(/<[^>]+>/g, " ").trim());
    return !hasBody && !isNonMcqType(q.questionType || q.type);
  }

  async function prefetchQuestions(ids, onProgress) {
    const need = [];
    const seen = new Set();
    (ids || []).forEach(id => {
      const q = typeof getQ === "function" ? getQ(id) : null;
      if (q && needsPrefetch(q) && !seen.has(q._marksId)) {
        seen.add(q._marksId);
        need.push(q);
      }
    });
    if (!need.length) return 0;
    let done = 0;
    const batch = 6;
    for (let i = 0; i < need.length; i += batch) {
      await Promise.all(need.slice(i, i + batch).map(async q => {
        try {
          await ensureQuestionFull(q);
        } catch (e) { /* skip */ }
        done++;
        if (typeof onProgress === "function") onProgress(done, need.length);
      }));
    }
    return done;
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
      icon: d.icon || null,
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
    isBlankText,
    isNonMcqType,
    isPlaceholderOptions,
    allOptionsHaveContent,
    isPartialOptions,
    isImageMcq,
    optionHasContent,
    isNumericalQuestion,
    isQuestionTextReady,
    isOptionsReady,
    isOptionsIncomplete,
    isQuestionReady,
    isQuestionIncomplete,
    hasRealSolution,
    cleanSolution,
    needsFullQuestion,
    questionNeedsFigure,
    hasPoolFigureInHtml,
    boardSubjects,
    boardChapters,
    boardChapterDetails,
    boardBucketQuestions,
    ncertSubjects,
    ncertChapters,
    ncertChapterSets,
    ncertSetQuestions,
    fetchFullQuestion,
    fetchQuestionsByMarksIds,
    ensureQuestionFull,
    hydrateQuestions,
    prefetchQuestions,
    cpyqbBucketQuestions,
    cpyqbTopicQuestions,
    ensureToken
  };
})();