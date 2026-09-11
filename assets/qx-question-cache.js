/**
 * Instant deep-link / question open — NO full bank download.
 * Uses tiny sharded maps (data/qid_marks/XX.json) + /api/catalog (never Marks).
 */
(function (global) {
  "use strict";

  const _shards = Object.create(null);
  const _mem = Object.create(null);

  function shardPref(id) {
    const s = String(id || "");
    return s.length > 3 ? s.slice(0, -3) : "0";
  }

  async function loadShard(pref) {
    if (_shards[pref]) return _shards[pref];
    try {
      const res = await fetch("data/qid_marks/" + encodeURIComponent(pref) + ".json?v=qxperf1", {
        cache: "force-cache"
      });
      _shards[pref] = res.ok ? await res.json() : {};
    } catch (_) {
      _shards[pref] = {};
    }
    return _shards[pref];
  }

  async function resolveMeta(id) {
    const sid = String(id);
    if (_mem[sid] && _mem[sid]._meta) return _mem[sid]._meta;
    const shard = await loadShard(shardPref(sid));
    return shard[sid] || null; // { m: marksId, b: bankSlug }
  }

  function sessionGet(id) {
    try {
      const raw = sessionStorage.getItem("qx_qcache_" + id);
      if (!raw) return null;
      const o = JSON.parse(raw);
      // Accept stub shells with only _marksId (refresh recovery for #question/910000000)
      if (o && (o.id === id || String(o.id) === String(id)) && (o.q || o._marksId)) return o;
    } catch (_) { /* */ }
    return null;
  }

  function sessionSet(q) {
    if (!q || q.id == null) return;
    try {
      const slim = {
        id: q.id,
        _marksId: q._marksId,
        _bank: q._bank,
        subject: q.subject,
        chapter: q.chapter,
        q: q.q,
        options: q.options,
        answer: q.answer,
        answers: q.answers,
        correctValue: q.correctValue,
        questionType: q.questionType,
        solution: q.solution,
        source: q.source,
        exam: q.exam,
        difficulty: q.difficulty,
        _listStub: !!q._listStub,
        _live: !!q._live
      };
      sessionStorage.setItem("qx_qcache_" + q.id, JSON.stringify(slim));
      // Stub → Marks id map so refresh of #question/910000000 still works
      if (q._marksId) {
        sessionStorage.setItem("qx_stub_mid_" + q.id, String(q._marksId));
        sessionStorage.setItem("qx_mid_stub_" + q._marksId, String(q.id));
      }
    } catch (_) { /* quota */ }
  }

  function rememberStub(q) {
    sessionSet(q);
  }

  function marksIdForStub(id) {
    try {
      const mid = sessionStorage.getItem("qx_stub_mid_" + id);
      if (mid) return mid;
      const c = sessionGet(id);
      if (c && c._marksId) return String(c._marksId);
    } catch (_) { /* */ }
    return null;
  }

  /** App id that survives refresh: m_<marksObjectId> */
  function appIdFromMarksId(mid) {
    return "m_" + String(mid || "");
  }

  function marksIdFromAppId(id) {
    const s = String(id || "");
    if (s.indexOf("m_") === 0 && s.length > 10) return s.slice(2);
    return marksIdForStub(id);
  }

  function titleOf(arr) {
    if (!arr || !arr.length) return null;
    const x = arr[0];
    if (typeof x === "string") return x;
    return x.title || x.name || x.shortName || null;
  }

  function mapOptions(rawOpts, imageBaseUrl) {
    const base = String(imageBaseUrl || "").replace(/\/$/, "");
    return (rawOpts || []).map(o => {
      if (!o || typeof o !== "object") return String(o || "");
      let t = String(o.text || "").trim();
      let img = o.image || o.img;
      if (img && typeof img === "object") img = img.url || img.src || img.path;
      if (img) {
        img = String(img).trim();
        if (img && !/^https?:|^data:|^\/\//i.test(img) && base) {
          img = base + "/" + img.replace(/^\//, "");
        }
      }
      if (img && !/<img\b/i.test(t)) {
        const safe = String(img).replace(/"/g, "&quot;");
        t = (t ? t + "<br>" : "") +
          `<img class="qx-pool-fig qx-no-wm qx-opt-fig-img" src="${safe}" data-qx-orig-src="${safe}" alt="Option" loading="eager" decoding="async" referrerpolicy="no-referrer" style="max-width:min(100%,360px);max-height:min(36vh,280px);width:auto;height:auto;display:block;margin:8px auto;object-fit:contain;background:#fff">`;
      }
      return t;
    });
  }

  function richerSrc(a, b) {
    const sa = String(a || "");
    const sb = String(b || "");
    const score = (s) => {
      if (!s) return 0;
      let n = 0;
      if (/shift\s*[-–]?\s*[12]|morning|evening/i.test(s)) n += 20;
      if (/\d{1,2}\s*[A-Za-z]{3,}/i.test(s)) n += 15;
      if (/\b(20\d{2}|19\d{2})\b/.test(s)) n += 5;
      return n + Math.min(s.length, 80) / 10;
    };
    return score(sa) >= score(sb) ? (sa || sb) : (sb || sa);
  }

  function applyPaperMetaFromMarks(q, d) {
    if (!q || !d) return;
    const papers = d.previousYearPapers || d.yearsAppeared || [];
    let paper = papers[0] || {};
    if (papers.length > 1) {
      paper = papers.slice().sort((a, b) => {
        const tb = String((b && b.title) || "");
        const ta = String((a && a.title) || "");
        const sb = (/shift|morning|evening|\d{1,2}\s*[A-Za-z]{3}/i.test(tb) ? 10 : 0) + tb.length;
        const sa = (/shift|morning|evening|\d{1,2}\s*[A-Za-z]{3}/i.test(ta) ? 10 : 0) + ta.length;
        return sb - sa;
      })[0] || paper;
    }
    const title = paper.title || d.source || d.paperSource || "";
    const prev = q.source || q.paperSource || "";
    const best = richerSrc(prev, title);
    const prevThin = !prev || prev === "PYQ" || /^jee[_\s]?main$/i.test(String(prev).trim());
    if (best && (prevThin || richerSrc(best, prev) === best)) {
      q.source = best;
      q.paperSource = best;
    }
    const held = paper.heldOn || paper.date || paper.examDate || d.heldOn || d.previousYear;
    if (held && !q.paperDate) q.paperDate = held;
    let sh = paper.shift != null ? paper.shift : (paper.session != null ? paper.session : (paper.slot != null ? paper.slot : d.shift));
    if ((sh == null || sh === "") && title) {
      const sm = String(title).match(/\bShift\s*[-–]?\s*([12])\b/i)
        || String(title).match(/\b(Morning|Evening|Forenoon|Afternoon)\s*Shift\b/i);
      if (sm) sh = sm[1];
    }
    if (sh != null && sh !== "" && (q.paperShift == null || q.paperShift === "")) {
      q.paperShift = sh;
      q.shift = sh;
    }
  }

  function applyMarksData(q, d) {
    if (!q || !d) return q;
    const rawOpts = Array.isArray(d.options) ? d.options : [];
    const qtRaw = String(d.type || d.questionType || "").toLowerCase();
    const optsEmpty = !rawOpts.length || rawOpts.every(o => {
      if (!o) return true;
      if (typeof o !== "object") return !String(o).trim();
      return !String(o.text || "").trim() && !(o.image || o.img);
    });
    const qBody = d.question || d.title || {};
    const hasFig = (s) => /<img\b/i.test(String(s || "")) && /cdn-question-pool|cdn\.quizrr|\/pyq\/|2026_modules|modules\/ms|proxy-image|assets\/(?:diagrams|qx-figures)|watermark_improved|AKCR2_/i.test(String(s || ""));
    const figStub = (s) => {
      const t = String(s || "").replace(/<img\b[^>]*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (hasFig(s)) return false;
      return !t || /^(figure|fig\.?|diagram|image|structure|photo)$/i.test(t);
    };
    if (qBody && qBody.text) {
      const incoming = String(qBody.text);
      const cur = String(q.q || "");
      const pinned = String(q._qxBankQ || "");
      if (hasFig(cur) && (figStub(incoming) || !hasFig(incoming))) {
        /* keep local stem */
      } else if (hasFig(pinned) && (figStub(incoming) || figStub(cur))) {
        q.q = pinned;
      } else if ((q._book || q._bookId) && hasFig(cur)) {
        /* book pack already has the figure */
      } else if (!cur || figStub(cur) || (hasFig(incoming) && incoming.length > cur.length)) {
        q.q = incoming;
      }
    }
    const sol = d.solution || {};
    if (sol && sol.text) {
      const incomingSol = String(sol.text);
      const curSol = String(q.solution || "");
      if (!curSol || curSol.length < 20 || (hasFig(incomingSol) && !hasFig(curSol))) {
        q.solution = incomingSol;
      }
    }

    const subj = titleOf(d.subjects);
    const chap = titleOf(d.chapters);
    if (subj) q.subject = subj;
    if (chap) q.chapter = chap;
    // Real difficulty from Marks level (0/1 Easy, 2 Medium, 3 Hard) or string
    if (d.level != null && d.level !== "") {
      const lv = d.level;
      if (typeof lv === "number" || /^\d+$/.test(String(lv))) {
        const n = Number(lv);
        q.difficulty = n <= 1 ? "Easy" : (n === 2 ? "Medium" : "Hard");
      } else {
        q.difficulty = String(lv);
      }
    } else if (d.difficulty) {
      q.difficulty = d.difficulty;
    }
    // Paper: exam year · date · morning/evening shift (do not leave "JEE Main" alone)
    applyPaperMetaFromMarks(q, d);
    // Force full paper title from previousYearPapers when still thin
    try {
      const papers = d.previousYearPapers || d.yearsAppeared || [];
      let bestTitle = "";
      papers.forEach((p) => {
        const t = p && p.title ? String(p.title) : "";
        if (t && richerSrc(bestTitle, t) === t) bestTitle = t;
      });
      if (bestTitle && richerSrc(q.source || "", bestTitle) === bestTitle) {
        q.source = bestTitle;
        q.paperSource = bestTitle;
        q._sourceFull = bestTitle;
      }
      // Extract shift number into field for parsePaperMeta
      if ((q.paperShift == null || q.paperShift === "") && bestTitle) {
        const sm = bestTitle.match(/\bShift\s*[-–]?\s*([12])\b/i);
        if (sm) {
          q.paperShift = sm[1];
          q.shift = sm[1];
        }
      }
    } catch (_) { /* */ }

    if (optsEmpty || (/numerical|integer|subjective|fill/.test(qtRaw) && optsEmpty)) {
      q.questionType = d.type || d.questionType || "numerical";
      if (d.correctValue != null) q.correctValue = d.correctValue;
      q.options = [];
    } else {
      const opts = mapOptions(rawOpts, d.imageBaseUrl || d.image_base_url);
      const bankOpts = q._qxBankOptions || [];
      if (bankOpts.some(hasFig) && opts.every(figStub)) {
        q.options = bankOpts.slice();
      } else if (bankOpts.some(hasFig)) {
        q.options = opts.map((o, i) => {
          const b = bankOpts[i];
          if (hasFig(b) && (!o || figStub(o) || !hasFig(o))) return b;
          return o;
        });
      } else {
        q.options = opts;
      }
      let answer = 0;
      const multi = [];
      rawOpts.forEach((o, i) => {
        if (o && o.isCorrect) { answer = i; multi.push(i); }
      });
      q.answer = answer;
      if (multi.length > 1) {
        q.answers = multi;
        q.questionType = d.type || "multipleCorrect";
      } else {
        q.questionType = d.type || d.questionType || "singleCorrect";
      }
      if (d.correctValue != null) q.correctValue = d.correctValue;
    }
    q._optsLoadFailed = false;
    q._fullFetched = true;
    q._marksFillTried = true;
    q._needsFull = false;
    return q;
  }

  async function fetchMarks(mid) {
    if (typeof QxFirebaseBank !== "undefined" && QxFirebaseBank.getQuestion) {
      try {
        const rec = await QxFirebaseBank.getQuestion(mid);
        if (rec) return rec;
      } catch (_) { /* */ }
    }
    if (typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.question) {
      try {
        const data = await QuantrexCatalog.question(mid);
        const rec = data && (data.question || (data.questions && data.questions[0]));
        if (rec) return rec;
      } catch (_) { /* */ }
    }
    return null;
  }

  /**
   * Instant path: shard (~50KB) + Marks API — never load 46MB bank for one link.
   * Also recovers list stubs: m_<marksId> and 910000000+ synthetic ids after refresh.
   */
  async function loadQuestionFast(id) {
    const sid = String(id);
    if (_mem[sid] && _mem[sid].q && String(_mem[sid].q).length > 8) return _mem[sid];

    // 1) session cache (may be stub shell with only _marksId)
    let cached = sessionGet(id);
    let mid = marksIdFromAppId(id);
    if (cached && cached._marksId) mid = mid || String(cached._marksId);

    // 2) Real bank id → shard map
    let bankSlug = (cached && cached._bank) || "jee_main";
    if (!mid) {
      const meta = await resolveMeta(id);
      if (meta && meta.m) {
        mid = meta.m;
        bankSlug = meta.b || bankSlug;
      }
    }
    if (!mid) return cached && cached.q ? cached : null;

    // If we only have shell with good body already, return it
    if (cached && cached.q && String(cached.q).replace(/<[^>]+>/g, "").trim().length > 12
      && (cached.correctValue != null || (cached.options && cached.options.length))) {
      _mem[sid] = cached;
      return cached;
    }

    const d = await fetchMarks(mid);
    if (!d) {
      // Return shell so UI can show something / retry
      if (cached) {
        _mem[sid] = cached;
        return cached;
      }
      return null;
    }
    const q = {
      id: /^\d+$/.test(sid) ? Number(sid) : id,
      _marksId: String(mid),
      _bank: bankSlug,
      subject: (cached && cached.subject) || "",
      chapter: (cached && cached.chapter) || "",
      q: (cached && cached.q) || "",
      options: (cached && cached.options) || [],
      answer: 0,
      solution: "",
      source: bankSlug.replace(/_/g, " "),
      exam: (cached && cached.exam) || "Engineering",
      difficulty: (cached && cached.difficulty) || "Medium"
    };
    if (d.q || d.questionText || (Array.isArray(d.options) && d.options.length && typeof d.options[0] === "string")) {
      if (typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.applyCatalogRec) {
        QuantrexCatalog.applyCatalogRec(q, d);
        q._optsLoadFailed = false;
        q._fullFetched = true;
        q._marksFillTried = true;
        q._needsFull = false;
        q._listStub = false;
        _mem[sid] = q;
        sessionSet(q);
        return q;
      }
    }
    applyMarksData(q, d);
    _mem[sid] = q;
    sessionSet(q);
    return q;
  }

  function registerInApp(q) {
    if (!q || typeof QUESTIONS === "undefined") return q;
    if (typeof getQ === "function" && getQ(q.id)) return getQ(q.id);
    QUESTIONS.push(q);
    if (typeof _qxIndexQuestion === "function") _qxIndexQuestion(q);
    else {
      // soft index if helpers not hoisted yet
      try {
        if (typeof window !== "undefined") {
          /* maps may live in data.js closure — only QUESTIONS push works */
        }
      } catch (_) { /* */ }
    }
    return q;
  }

  global.QxQuestionCache = {
    loadQuestionFast,
    registerInApp,
    resolveMeta,
    applyMarksData,
    sessionGet,
    sessionSet,
    rememberStub,
    marksIdForStub,
    appIdFromMarksId,
    marksIdFromAppId,
    fetchMarks
  };
})(typeof window !== "undefined" ? window : globalThis);
