/**
 * Jovi — Universal AI Academic Agent (Quantrex)
 * ChatGPT/Gemini/Grok-class conversation + robotics UI + any-language talk
 * Database-first tools · open exams · Easy/Medium/Hard tests · solutions · SpaceXAI
 */
(function (global) {
  "use strict";

  const MASCOT = "assets/jovi-mascot.svg?v=jovi4";
  const GAP_KEY = "qx_jovi_gaps_v1";
  const SAVE_KEY = "qx_jovi_saved_v1";
  const HIST_KEY = "qx_jovi_session_v1";
  const VOICE_KEY = "qx_jovi_voice_out";
  const LANG_KEY = "qx_jovi_lang";

  let _open = false;
  let _busy = false;
  let _listening = false;
  let _recognition = null;
  let _history = [];
  let _pendingImage = null;
  let _context = {};
  let _voiceOut = false;
  let _expanded = false;
  let _speechLang = "auto";

  try { _voiceOut = localStorage.getItem(VOICE_KEY) === "1"; } catch (e) { /* */ }
  try { _speechLang = localStorage.getItem(LANG_KEY) || "auto"; } catch (e) { /* */ }

  const SPEECH_LANGS = [
    { id: "auto", label: "🌐 Auto-detect" },
    { id: "hi-IN", label: "हिन्दी (Hindi)" },
    { id: "en-IN", label: "English (India)" },
    { id: "en-US", label: "English (US)" },
    { id: "bn-IN", label: "বাংলা (Bengali)" },
    { id: "ta-IN", label: "தமிழ் (Tamil)" },
    { id: "te-IN", label: "తెలుగు (Telugu)" },
    { id: "mr-IN", label: "मराठी (Marathi)" },
    { id: "gu-IN", label: "ગુજરાતી (Gujarati)" },
    { id: "kn-IN", label: "ಕನ್ನಡ (Kannada)" },
    { id: "ml-IN", label: "മലയാളം (Malayalam)" },
    { id: "pa-IN", label: "ਪੰਜਾਬੀ (Punjabi)" },
    { id: "ur-IN", label: "اردو (Urdu)" },
    { id: "ar-SA", label: "العربية (Arabic)" },
    { id: "es-ES", label: "Español" },
    { id: "fr-FR", label: "Français" }
  ];

  function detectSpeechLang(text) {
    const t = String(text || "");
    if (/[\u0900-\u097F]/.test(t)) return "hi-IN"; // Devanagari
    if (/[\u0980-\u09FF]/.test(t)) return "bn-IN";
    if (/[\u0B80-\u0BFF]/.test(t)) return "ta-IN";
    if (/[\u0C00-\u0C7F]/.test(t)) return "te-IN";
    if (/[\u0A80-\u0AFF]/.test(t)) return "gu-IN";
    if (/[\u0C80-\u0CFF]/.test(t)) return "kn-IN";
    if (/[\u0D00-\u0D7F]/.test(t)) return "ml-IN";
    if (/[\u0A00-\u0A7F]/.test(t)) return "pa-IN";
    if (/[\u0600-\u06FF]/.test(t)) return "ar-SA";
    if (/[\u4e00-\u9fff]/.test(t)) return "zh-CN";
    return "en-IN";
  }

  function resolveSttLang() {
    if (_speechLang && _speechLang !== "auto") return _speechLang;
    return "hi-IN"; // default Hinglish-friendly
  }

  function setAgentStatus(msg, busy) {
    const el = document.getElementById("joviAgentStatus");
    const dot = document.querySelector("#joviAgentBar .dot");
    if (el) el.textContent = msg || "Universal Academic Agent · ready";
    if (dot) dot.classList.toggle("busy", !!busy);
  }

  const EXAM_ALIASES = [
    [/jee\s*main|जेईई\s*मेन|jee\s*mains/i, "jee_main"],
    [/jee\s*adv|advanced|जेईई\s*एडवांस/i, "jee_advanced"],
    [/\bmht\s*cet\b|mhtcet|एमएचटी/i, "mht_cet"],
    [/\bts\s*eamcet\b|\bts\s*eapcet\b|tsche|तेलंगाना\s*eamcet/i, "ts_eamcet"],
    [/\bap\s*eamcet\b|\bap\s*eapcet\b/i, "ap_eamcet"],
    [/\bbitsat\b|बिट्स/i, "bitsat"],
    [/\bviteee\b|vit\b/i, "viteee"],
    [/\bcomedk\b/i, "comedk"],
    [/\bkcet\b/i, "kcet"],
    [/\bwbjee\b/i, "wbjee"],
    [/manipal|met\b/i, "manipal_met"],
    [/\bkvpy\b/i, "kvpy"],
    [/\biat\b|iiser/i, "iat_iiser"],
    [/\bnest\b|niser/i, "nest_niser"],
    [/nta\s*abhyas.*jee|abhyas.*jee/i, "nta_abhyas_jee_main"],
    [/nta\s*abhyas.*neet|abhyas.*neet/i, "nta_abhyas_neet"],
    [/\bneet\b|नीट/i, "neet"],
    [/\baiims\b|एम्स/i, "aiims"],
    [/\bjipmer\b/i, "jipmer"],
    [/\bnda\b|एनडीए/i, "nda"]
  ];

  const TRACK_ALIASES = [
    [/engineering|इंजीनियरिंग|engg/i, "Engineering"],
    [/medical|मेडिकल|neet\s*track/i, "Medical"],
    [/defence|defense|डिफेंस|nda\s*track/i, "Defence"],
    [/academic|class\s*(7|8|9|10|11|12)|एकेडमिक|cbse/i, "Academic"]
  ];

  function isLoggedIn() {
    try {
      const u = JSON.parse(localStorage.getItem("quantrex_user") || "null");
      return !!(u && (u.uid || u.email || u.id));
    } catch (e) { return false; }
  }

  function loadSession() {
    try {
      const raw = sessionStorage.getItem(HIST_KEY);
      _history = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(_history)) _history = [];
    } catch (e) { _history = []; }
  }

  function persistSession() {
    try {
      sessionStorage.setItem(HIST_KEY, JSON.stringify(_history.slice(-24)));
    } catch (e) { /* ignore */ }
  }

  function logGap(query, reason) {
    try {
      const list = JSON.parse(localStorage.getItem(GAP_KEY) || "[]");
      list.push({
        q: String(query || "").slice(0, 400),
        reason: reason || "missing",
        at: Date.now(),
        exam: (typeof STATE !== "undefined" && STATE.exam) || null,
        page: (typeof currentView !== "undefined" && currentView) || null
      });
      localStorage.setItem(GAP_KEY, JSON.stringify(list.slice(-200)));
    } catch (e) { /* silent */ }
  }

  function saveToAccount(payload) {
    if (!isLoggedIn()) {
      if (typeof showToast === "function") showToast("🔐 Login to save permanently");
      return false;
    }
    try {
      const list = JSON.parse(localStorage.getItem(SAVE_KEY) || "[]");
      list.unshift({ ...payload, savedAt: Date.now() });
      localStorage.setItem(SAVE_KEY, JSON.stringify(list.slice(0, 100)));
      if (typeof showToast === "function") showToast("✅ Saved to your Jovi notebook");
      return true;
    } catch (e) {
      if (typeof showToast === "function") showToast("⚠️ Could not save");
      return false;
    }
  }

  function stripHtml(s) {
    return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function chapterFileSlug(name) {
    return String(name || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function detectExamSlug(text) {
    const t = String(text || "");
    for (let i = 0; i < EXAM_ALIASES.length; i++) {
      if (EXAM_ALIASES[i][0].test(t)) return EXAM_ALIASES[i][1];
    }
    try {
      const bank = localStorage.getItem("quantrex_bank");
      if (bank) return bank;
    } catch (e) { /* */ }
    if (typeof PRIMARY_BANK !== "undefined" && typeof STATE !== "undefined") {
      return PRIMARY_BANK[STATE.exam] || "jee_main";
    }
    return "jee_main";
  }

  function detectTrack(text) {
    const t = String(text || "");
    for (let i = 0; i < TRACK_ALIASES.length; i++) {
      if (TRACK_ALIASES[i][0].test(t)) return TRACK_ALIASES[i][1];
    }
    return null;
  }

  function detectDifficulty(text) {
    const t = String(text || "").toLowerCase();
    if (/very\s*hard|super\s*hard|advance|advanced|कठिन|मुश्किल|tough/.test(t) || /\bhard\b/.test(t)) return "Hard";
    if (/\beasy\b|beginner|simple|आसान|बेसिक/.test(t)) return "Easy";
    if (/\bmedium\b|moderate|मध्यम|average/.test(t)) return "Medium";
    return "all";
  }

  function detectSubject(text) {
    const t = String(text || "").toLowerCase();
    if (/chemistry|chem\b|रसायन/.test(t)) return "Chemistry";
    if (/physics|भौतिक/.test(t)) return "Physics";
    if (/math|mathematics|गणित/.test(t)) return "Mathematics";
    if (/biology|botany|zoology|जीव/.test(t)) return "Biology";
    return null;
  }

  function detectCount(text, fallback) {
    const m = String(text || "").match(/\b(\d{1,2})\s*(q|qs|question|questions|प्रश्न)?\b/i);
    if (m) return Math.max(3, Math.min(40, parseInt(m[1], 10)));
    return fallback || 10;
  }

  function detectFilters(text) {
    const t = String(text || "").toLowerCase();
    const f = {
      years: [],
      subjects: [],
      hard: false,
      important: false,
      repeated: false,
      difficulty: detectDifficulty(text),
      exam: detectExamSlug(text)
    };
    const yearMatches = t.match(/\b(20\d{2})\b/g);
    if (yearMatches) f.years = [...new Set(yearMatches.map(Number))];
    const sub = detectSubject(text);
    if (sub) f.subjects.push(sub);
    if (f.difficulty === "Hard") f.hard = true;
    if (/important|must.?do|high.?weight|महत्वपूर्ण/.test(t)) f.important = true;
    if (/repeat|repeated|बार.?बार|pyq.*again/.test(t)) f.repeated = true;
    return f;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function bankTitle(slug) {
    if (typeof BANK_INDEX !== "undefined" && BANK_INDEX[slug]) return BANK_INDEX[slug].title;
    return slug;
  }

  function categoryForSlug(slug) {
    if (typeof BANK_INDEX !== "undefined" && BANK_INDEX[slug] && BANK_INDEX[slug].category) {
      return BANK_INDEX[slug].category;
    }
    if (/neet|aiims|jipmer/i.test(slug)) return "Medical";
    if (/nda/i.test(slug)) return "Defence";
    if (/class_/i.test(slug)) return "Academic";
    return "Engineering";
  }

  async function ensureBankLight(slug) {
    if (!slug || typeof loadSingleBank !== "function") return [];
    try {
      const meta = typeof BANK_INDEX !== "undefined" ? BANK_INDEX[slug] : null;
      const count = (meta && meta.count) || 0;
      // Small / medium banks: load fully. Large banks stay on chapter_meta path.
      if (count > 0 && count < 2500) {
        return await loadSingleBank(slug, { allowLarge: true });
      }
      // Still try (anti-hang may no-op for large)
      return await loadSingleBank(slug);
    } catch (e) {
      return [];
    }
  }

  async function collectIdsFromChapterMeta(examSlug, subject, chapterHint, limit) {
    limit = limit || 10;
    let nav = [];
    try {
      if (typeof fetchNav === "function") nav = await fetchNav("cpyqb");
    } catch (e) { /* */ }
    const exam = (nav || []).find((e) => e && e.slug === examSlug);
    if (!exam || !exam.subjects || !exam.subjects.length) return [];

    let subjects = exam.subjects.slice();
    if (subject) {
      subjects = subjects.filter((s) => String(s.name).toLowerCase() === subject.toLowerCase());
      if (!subjects.length) subjects = exam.subjects.slice();
    }

    const chapterPool = [];
    subjects.forEach((s) => {
      (s.chapters || []).forEach((c) => {
        chapterPool.push({ subject: s.name, chapter: c.name || c.title, count: c.count || 0 });
      });
    });

    let chapters = chapterPool;
    if (chapterHint) {
      const h = chapterHint.toLowerCase();
      const hit = chapterPool.filter((c) => String(c.chapter).toLowerCase().includes(h));
      if (hit.length) chapters = hit;
    }
    chapters = shuffle(chapters).slice(0, 8);

    const ids = [];
    for (const ch of chapters) {
      if (ids.length >= limit) break;
      const file = "data/nav/chapter_meta/" + examSlug + "/" + ch.subject + "/" + chapterFileSlug(ch.chapter) + ".json";
      try {
        const res = await fetch(file);
        if (!res.ok) continue;
        const data = await res.json();
        const qids = [];
        (data.topics || []).forEach((t) => {
          (t.questionIds || []).forEach((id) => qids.push(id));
        });
        (data.buckets || []).forEach((b) => {
          (b.questionIds || []).forEach((id) => qids.push(id));
        });
        if (data.questionIds) data.questionIds.forEach((id) => qids.push(id));
        shuffle(qids).forEach((id) => {
          if (ids.length < limit && ids.indexOf(id) < 0) ids.push(id);
        });
      } catch (e) { /* skip chapter */ }
    }
    return ids;
  }

  function filterPoolByDifficulty(pool, difficulty) {
    if (!pool.length || !difficulty || difficulty === "all") return pool;
    const norm = (d) => {
      if (typeof qxNormDifficulty === "function") return qxNormDifficulty(d);
      const s = String(d || "").toLowerCase();
      if (/easy|beginner/.test(s)) return "Easy";
      if (/hard|difficult|advance|tough/.test(s)) return "Hard";
      if (/medium|moderate/.test(s)) return "Medium";
      return "";
    };
    const tagged = pool.filter((q) => norm(q.difficulty || q.level) === difficulty);
    if (tagged.length >= 3) return tagged;
    // Heuristic split when tags missing
    const sh = shuffle(pool);
    if (difficulty === "Easy") return sh.slice(0, Math.ceil(sh.length * 0.4));
    if (difficulty === "Hard") return sh.slice(Math.floor(sh.length * 0.55));
    return sh.slice(Math.floor(sh.length * 0.25), Math.ceil(sh.length * 0.75));
  }

  function searchBank(query, limit) {
    limit = limit || 8;
    const qs = (typeof QUESTIONS !== "undefined" && Array.isArray(QUESTIONS)) ? QUESTIONS : [];
    if (!qs.length) {
      return { hits: [], note: "Bank not in memory yet — open an exam or ask me to make a test (I use chapter index)." };
    }

    const f = detectFilters(query);
    const tokens = String(query || "").toLowerCase()
      .replace(/[^\w\u0900-\u097F\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !/^(the|and|for|give|show|me|questions?|please|from|with|jee|neet|mains?|main|open|test|make|create|banao|kholo)$/i.test(w));

    let pool = qs.slice();
    if (f.exam) {
      const byBank = pool.filter((q) => q._bank === f.exam);
      if (byBank.length) pool = byBank;
    }
    if (f.subjects.length) {
      pool = pool.filter((q) => f.subjects.some((s) => String(q.subject || "").toLowerCase() === s.toLowerCase()));
    }
    if (f.years.length) {
      pool = pool.filter((q) => {
        const src = String(q.source || q.exam || q.year || "");
        return f.years.some((y) => src.includes(String(y)));
      });
    }
    if (f.difficulty && f.difficulty !== "all") {
      pool = filterPoolByDifficulty(pool, f.difficulty);
    }

    const scored = [];
    pool.forEach((q) => {
      const blob = [
        q.subject, q.chapter, q.topic, q.source, q.exam, q._bank,
        stripHtml(q.text || q.question || "")
      ].join(" ").toLowerCase();
      let score = 0;
      tokens.forEach((tok) => { if (blob.includes(tok)) score += 2; });
      if (f.subjects.some((s) => String(q.subject || "").toLowerCase() === s.toLowerCase())) score += 3;
      if (score > 0 || (!tokens.length && (f.subjects.length || f.difficulty !== "all"))) {
        scored.push({ q, score });
      }
    });

    scored.sort((a, b) => b.score - a.score);
    let top = scored.slice(0, limit).map((x) => x.q);

    if (!top.length && f.subjects.length) {
      top = pool.filter((q) => f.subjects.some((s) => String(q.subject || "").toLowerCase() === s.toLowerCase())).slice(0, limit);
    }
    if (!top.length && tokens.length) {
      top = qs.filter((q) => tokens.some((t) => String(q.chapter || "").toLowerCase().includes(t))).slice(0, limit);
    }
    if (!top.length) logGap(query, "no_bank_match");

    return {
      hits: top.map((q) => ({
        id: q.id,
        text: stripHtml(q.text || q.question || "").slice(0, 280),
        subject: q.subject || "",
        chapter: q.chapter || "",
        source: q.source || q.exam || q._bank || "",
        exam: q.exam || "",
        bank: q._bank || "",
        hasSolution: !!(q.solution || q.sol || q.explanation)
      })),
      filters: f
    };
  }

  function studentPerformanceSummary() {
    try {
      const solved = (typeof STATE !== "undefined" && Array.isArray(STATE.solved)) ? STATE.solved : [];
      if (!solved.length) return null;
      const byCh = {};
      let correct = 0;
      solved.forEach((s) => {
        if (s.correct) correct++;
        const ch = s.chapter || s.ch || "Unknown";
        if (!byCh[ch]) byCh[ch] = { n: 0, c: 0 };
        byCh[ch].n++;
        if (s.correct) byCh[ch].c++;
      });
      const weak = Object.entries(byCh)
        .map(([ch, v]) => ({ ch, acc: v.n ? v.c / v.n : 0, n: v.n }))
        .filter((x) => x.n >= 2)
        .sort((a, b) => a.acc - b.acc)
        .slice(0, 5)
        .map((x) => x.ch + " (" + Math.round(x.acc * 100) + "%)");
      return {
        solvedCount: solved.length,
        accuracy: Math.round((correct / solved.length) * 100),
        weakChapters: weak,
        performanceSummary: "solved=" + solved.length + " accuracy=" + Math.round((correct / solved.length) * 100) + "% weak=[" + weak.join("; ") + "]"
      };
    } catch (e) { return null; }
  }

  function buildContext() {
    const ctx = { ..._context };
    try {
      if (typeof STATE !== "undefined") ctx.exam = ctx.exam || STATE.exam;
      if (typeof currentView !== "undefined") ctx.page = currentView;
      try {
        ctx.bank = localStorage.getItem("quantrex_bank") || ctx.bank;
      } catch (e) { /* */ }
      ctx.language = _speechLang || "auto";
      const perf = studentPerformanceSummary();
      if (perf) {
        ctx.solvedCount = perf.solvedCount;
        ctx.accuracy = perf.accuracy;
        ctx.weakChapters = perf.weakChapters;
        ctx.performanceSummary = perf.performanceSummary;
      }
      if (global._qxPracticeCtx && global._qxPracticeCtx.ids) {
        const ids = global._qxPracticeCtx.ids;
        const idx = global._qxPracticeCtx.idx || 0;
        const qid = ids[idx];
        if (qid && typeof getQ === "function") {
          const q = getQ(qid);
          if (q) {
            ctx.questionId = q.id;
            ctx.questionText = stripHtml(q.text || q.question || "");
            ctx.subject = q.subject;
            ctx.chapter = q.chapter;
            ctx.options = (q.options || []).map(stripHtml).slice(0, 6);
            ctx.solution = stripHtml(q.solution || q.sol || "").slice(0, 1500);
          }
        }
      }
    } catch (e) { /* */ }
    return ctx;
  }

  function setContext(partial) {
    _context = { ..._context, ...(partial || {}) };
  }

  /* ─── Teacher actions (voice / text → real app work) ─── */

  function parseTeacherIntent(text) {
    const t = String(text || "").trim();
    if (!t) return null;
    const lower = t.toLowerCase();

    // Weak chapter / analytics
    if (/weak|weakest|kamzor|accuracy|performance|mere\s*result|analytics|progress/i.test(t)) {
      return { type: "analytics" };
    }

    // Open exam / track
    if (/open|kholo|खोलो|switch\s*to|le\s*jao|jao|start\s*(pyq|bank)|pyq\s*bank/i.test(t)
      || /^(ts|ap|jee|neet|bitsat|mht|nda|viteee|kcet|wbjee|comedk)/i.test(t.trim())) {
      const track = detectTrack(t);
      const exam = detectExamSlug(t);
      const wantsList = /all\s*exam|exam\s*list|saare\s*exam|सभी\s*exam|track|engineering|medical|defence|academic/i.test(t)
        && !/ts\s*eamcet|ap\s*eamcet|jee|neet|bitsat|mht|nda|viteee/i.test(t);
      if (wantsList || track) {
        return { type: "open_track", track: track || categoryForSlug(exam) };
      }
      if (exam && (/open|kholo|खोलो|switch|pyq|bank|le\s*jao|subjects|chapters/i.test(t)
        || EXAM_ALIASES.some((pair) => pair[0].test(t)))) {
        return { type: "open_exam", exam };
      }
    }

    // Create / start test
    if (/test|mock|quiz|paper|banao|बनाओ|create|generate|practice\s*set|part\s*test|mini\s*test/i.test(t)) {
      return {
        type: "create_test",
        exam: detectExamSlug(t),
        subject: detectSubject(t),
        difficulty: detectDifficulty(t),
        count: detectCount(t, 10),
        timed: !/practice|no\s*timer|untimed/i.test(t)
      };
    }

    // Solution / explain current or bank q
    if (/solution|solve|explain|samjhao|समझाओ|doubt|galat|wrong|answer\s*batao|solution\s*do/i.test(t)) {
      return { type: "solve", exam: detectExamSlug(t), subject: detectSubject(t) };
    }

    // Explicit easy/medium/hard question packs without "test" word
    if (/\b(easy|medium|hard)\b.*\b(question|pyq|qs)\b|\b(question|pyq)s?\b.*\b(easy|medium|hard)\b/i.test(lower)) {
      return {
        type: "create_test",
        exam: detectExamSlug(t),
        subject: detectSubject(t),
        difficulty: detectDifficulty(t),
        count: detectCount(t, 8),
        timed: false
      };
    }

    return null;
  }

  async function openExamAction(examSlug) {
    const cat = categoryForSlug(examSlug);
    try {
      if (typeof STATE !== "undefined") STATE.exam = cat;
      localStorage.setItem("quantrex_exam", cat);
      localStorage.setItem("quantrex_bank", examSlug);
      if (typeof _currentBankSlug !== "undefined") global._currentBankSlug = examSlug;
    } catch (e) { /* */ }
    if (typeof MarksShell !== "undefined" && MarksShell.saveContext) {
      try { MarksShell.saveContext(examSlug, null); } catch (e) { /* */ }
    }
    if (typeof go === "function") {
      go("cpyqb", { step: "subjects", exam: examSlug, forceExamList: false });
    }
    return "✅ Opened **" + bankTitle(examSlug) + "** — subject list ready. Pick Physics / Chemistry / Maths or ask me to make a test.";
  }

  async function openTrackAction(track) {
    try {
      if (typeof STATE !== "undefined") STATE.exam = track;
      localStorage.setItem("quantrex_exam", track);
    } catch (e) { /* */ }
    if (typeof switchExam === "function") {
      switchExam(track, { open: "cpyqb" });
    } else if (typeof go === "function") {
      go("cpyqb", { step: "exams", forceExamList: true });
    }
    return "✅ Switched to **" + track + "** track — all exams on this track are open.";
  }

  async function createTestAction(intent) {
    const exam = intent.exam || "jee_main";
    const subject = intent.subject;
    const difficulty = intent.difficulty || "all";
    const count = intent.count || 10;
    const cat = categoryForSlug(exam);

    try {
      if (typeof STATE !== "undefined") STATE.exam = cat;
      localStorage.setItem("quantrex_exam", cat);
      localStorage.setItem("quantrex_bank", exam);
    } catch (e) { /* */ }

    if (typeof showToast === "function") showToast("🧪 Jovi is building your " + difficulty + " test…");

    await ensureBankLight(exam);

    let ids = [];
    let pool = (typeof QUESTIONS !== "undefined" ? QUESTIONS : []).filter((q) => q._bank === exam || !q._bank);
    if (subject) pool = pool.filter((q) => String(q.subject || "").toLowerCase() === subject.toLowerCase());
    pool = filterPoolByDifficulty(pool, difficulty);
    if (pool.length) {
      ids = shuffle(pool).slice(0, count).map((q) => q.id);
    }

    if (ids.length < count) {
      const more = await collectIdsFromChapterMeta(exam, subject, null, count - ids.length + 4);
      more.forEach((id) => {
        if (ids.length < count && ids.indexOf(id) < 0) ids.push(id);
      });
    }

    if (ids.length < 3) {
      logGap(JSON.stringify(intent), "test_build_thin");
      if (typeof go === "function") {
        go("cpyqb", { step: "subjects", exam: exam, forceExamList: false });
      }
      return "⚠️ Not enough questions loaded for a full test yet.\n\nI opened **" + bankTitle(exam) + "** subjects — open a chapter once, then say:\n“Make 10 medium Physics test” again.\n\nOr use **Custom Test** from Tests menu.";
    }

    ids = ids.slice(0, count);
    const title = "Jovi · " + bankTitle(exam) + (subject ? " · " + subject : "") + " · " + (difficulty === "all" ? "Mixed" : difficulty);
    const timed = intent.timed !== false;
    toggle(false);

    if (typeof startTest === "function") {
      await startTest(ids, title, "custom", {
        testType: "custom",
        timed: timed,
        durationSec: timed ? Math.max(300, ids.length * 90) : null,
        modeLabel: timed ? "Jovi Timed Test" : "Jovi Practice",
        marksMode: true,
        meta: { source: "jovi", difficulty: difficulty, exam: exam, subject: subject || "all" }
      });
      return "🚀 Started **" + title + "** with **" + ids.length + "** questions (" + (timed ? "timed" : "practice") + ").\n\nAll the best! Ask me after the test to review mistakes.";
    }

    return "Built " + ids.length + " questions but test engine is not ready. Open Tests → Custom Test.";
  }

  async function analyticsAction() {
    const perf = studentPerformanceSummary();
    if (!perf) {
      return "📊 **Student Analytics Agent**\n\nThis information is not currently available in the Quantrex Academy database (no practice attempts saved yet).\n\nStart a few chapter practices or a Jovi test, then ask again — I'll map weak chapters and build a personal plan.";
    }
    let msg = "📊 **Student Analytics** (from your Quantrex attempts)\n\n";
    msg += "• Attempts logged: **" + perf.solvedCount + "**\n";
    msg += "• Accuracy: **" + perf.accuracy + "%**\n";
    if (perf.weakChapters && perf.weakChapters.length) {
      msg += "• Weakest chapters:\n";
      perf.weakChapters.forEach((w, i) => { msg += "  " + (i + 1) + ". " + w + "\n"; });
      msg += "\nBol do: **“Is weak chapter pe 10 medium test banao”** — main personal test start kar dunga.";
    } else {
      msg += "\nAur practice karo taaki chapter-wise weak spots clear dikhen.";
    }
    return msg;
  }

  async function runTeacherIntent(intent) {
    if (!intent) return null;
    if (intent.type === "open_exam") {
      setAgentStatus("Database Agent · opening exam", true);
      return { handled: true, reply: await openExamAction(intent.exam), skipAi: true };
    }
    if (intent.type === "open_track") {
      setAgentStatus("Exam Pattern Agent · switching track", true);
      return { handled: true, reply: await openTrackAction(intent.track), skipAi: true };
    }
    if (intent.type === "create_test") {
      setAgentStatus("Test Generator · building paper", true);
      return { handled: true, reply: await createTestAction(intent), skipAi: true };
    }
    if (intent.type === "analytics") {
      setAgentStatus("Student Analytics Agent · reading attempts", true);
      return { handled: true, reply: await analyticsAction(), skipAi: true };
    }
    if (intent.type === "solve") {
      setContext({ mode: "solve", exam: intent.exam, subject: intent.subject });
      return { handled: false, reply: null, skipAi: false };
    }
    return null;
  }

  function parseAiActions(reply) {
    if (!reply) return { text: reply, actions: [] };
    const actions = [];
    let text = String(reply);
    // ```jovi-action\n{json}\n```
    text = text.replace(/```jovi-action\s*([\s\S]*?)```/gi, (_, raw) => {
      try {
        const obj = JSON.parse(String(raw).trim());
        if (obj && obj.type) actions.push(obj);
      } catch (e) { /* */ }
      return "";
    });
    // inline JOVI_ACTION:{...}
    text = text.replace(/JOVI_ACTION:(\{[^\n]+\})/gi, (_, raw) => {
      try {
        const obj = JSON.parse(raw);
        if (obj && obj.type) actions.push(obj);
      } catch (e) { /* */ }
      return "";
    });
    return { text: text.trim(), actions };
  }

  async function executeAiActions(actions) {
    if (!actions || !actions.length) return "";
    const notes = [];
    for (const a of actions) {
      if (a.type === "open_exam" && a.exam) {
        notes.push(await openExamAction(a.exam));
      } else if (a.type === "open_track" && a.track) {
        notes.push(await openTrackAction(a.track));
      } else if (a.type === "create_test") {
        notes.push(await createTestAction({
          exam: a.exam || detectExamSlug(""),
          subject: a.subject || null,
          difficulty: a.difficulty || "all",
          count: a.count || 10,
          timed: a.timed !== false
        }));
      }
    }
    return notes.filter(Boolean).join("\n\n");
  }

  function formatHitsHtml(hits) {
    if (!hits || !hits.length) return "";
    return hits.map((h) => {
      const sol = h.hasSolution ? " · has solution" : " · no official solution";
      return `<button type="button" class="jovi-hit" data-qid="${String(h.id).replace(/"/g, "")}">
        <strong>${escapeHtml(h.subject || "Q")} · ${escapeHtml(h.chapter || "")}</strong>
        ${escapeHtml(h.text || "")}
        <small>${escapeHtml(h.source || "")}${sol}</small>
      </button>`;
    }).join("");
  }

  function formatActionsHtml(actions) {
    if (!actions || !actions.length) return "";
    return `<div class="jovi-act-row">${actions.map((a, i) =>
      `<button type="button" class="jovi-act" data-act="${i}">${escapeHtml(a.label || a.type)}</button>`
    ).join("")}</div>`;
  }

  function renderMarkdownLite(text) {
    let t = escapeHtml(text);
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    t = t.replace(/\[Jovi-generated[^\]]*\]/gi, '<span class="jovi-tag">Jovi-generated</span>');
    t = t.replace(/\[AI-generated[^\]]*\]/gi, '<span class="jovi-tag">Jovi-generated</span>');
    t = t.replace(/\[DATABASE FACT[^\]]*\]/gi, '<span class="jovi-db-tag">DATABASE FACT</span>');
    t = t.replace(/This information is not currently available in the Quantrex Academy database\./gi,
      '<em>This information is not currently available in the Quantrex Academy database.</em>');
    return t;
  }

  function ensureDom() {
    if (document.getElementById("joviFab")) return;
    const fab = document.createElement("button");
    fab.type = "button";
    fab.id = "joviFab";
    fab.className = "jovi-fab";
    fab.title = "Jovi — Universal AI Academic Agent";
    fab.setAttribute("aria-label", "Open Jovi AI agent");
    fab.innerHTML = `<span class="jovi-fab-pulse"></span><span class="jovi-fab-ring"></span><img src="${MASCOT}" alt="Jovi">`;
    // Only open on explicit user click — never auto during practice
    fab.onclick = (e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      toggle(true);
    };

    const langOpts = SPEECH_LANGS.map((l) =>
      `<option value="${l.id}"${l.id === _speechLang ? " selected" : ""}>${l.label}</option>`
    ).join("");

    const panel = document.createElement("div");
    panel.id = "joviPanel";
    panel.className = "jovi-panel";
    panel.innerHTML = `
      <div class="jovi-head">
        <div class="jovi-head-mascot"><img src="${MASCOT}" alt=""></div>
        <div class="jovi-head-text">
          <strong>Jovi</strong>
          <small>Quantrex academic agent</small>
        </div>
        <div class="jovi-head-actions">
          <button type="button" class="jovi-icon-btn" id="joviSettingsBtn" title="Settings">⚙</button>
          <button type="button" class="jovi-icon-btn" id="joviExpand" title="Expand">⛶</button>
          <button type="button" class="jovi-icon-btn" id="joviClose" title="Close">✕</button>
        </div>
      </div>
      <div class="jovi-settings" id="joviSettingsSheet" hidden>
        <h4>Settings</h4>
        <label class="jovi-set-row" for="joviLang">Language
          <select id="joviLang" title="Speech & reply language">${langOpts}</select>
        </label>
        <label class="jovi-set-row jovi-set-toggle">
          <span>Speak answers</span>
          <input type="checkbox" id="joviSpeak"${_voiceOut ? " checked" : ""}>
        </label>
        <button type="button" class="jovi-set-btn" id="joviStopSpeak">Stop speaking</button>
        <button type="button" class="jovi-set-btn" id="joviNewChat">New chat</button>
      </div>
      <div class="jovi-agent-bar" id="joviAgentBar">
        <span class="dot"></span>
        <span id="joviAgentStatus">Ready</span>
      </div>
      <div class="jovi-listening-banner" id="joviListenBanner">
        <span class="wave"></span> Listening…
      </div>
      <div class="jovi-msgs" id="joviMsgs"></div>
      <div class="jovi-tools">
        <button type="button" class="jovi-chip" data-prompt="Open TS EAMCET">TS EAMCET</button>
        <button type="button" class="jovi-chip" data-prompt="Open JEE Main">JEE Main</button>
        <button type="button" class="jovi-chip" data-prompt="Open NEET">NEET</button>
        <button type="button" class="jovi-chip" data-prompt="Make 10 easy Physics test for JEE Main">Easy test</button>
        <button type="button" class="jovi-chip" data-prompt="Make 15 medium Chemistry test">Medium test</button>
        <button type="button" class="jovi-chip" data-prompt="Make 10 hard Mathematics test JEE Advanced">Hard test</button>
        <button type="button" class="jovi-chip" data-prompt="Mere weak chapters batao">My weak areas</button>
        <button type="button" class="jovi-chip" data-prompt="JEE Main 2023 Chemistry ke important PYQs explain karo">PYQ help</button>
        <button type="button" class="jovi-chip" data-prompt="Explain this step by step like a board professor">Solve doubt</button>
      </div>
      <div class="jovi-compose">
        <button type="button" class="jovi-icon-btn jovi-compose-ico" id="joviMic" title="Voice">🎤</button>
        <button type="button" class="jovi-icon-btn jovi-compose-ico" id="joviImg" title="Photo">📷</button>
        <textarea id="joviInput" rows="1" placeholder="Ask Jovi… Hindi, English, or Hinglish"></textarea>
        <button type="button" class="jovi-send" id="joviSend">Send</button>
      </div>
      <input type="file" id="joviFile" accept="image/*,.txt,.pdf" hidden>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    document.getElementById("joviClose").onclick = () => toggle(false);
    document.getElementById("joviExpand").onclick = () => {
      _expanded = !_expanded;
      panel.classList.toggle("jovi-expand", _expanded);
      document.getElementById("joviExpand").classList.toggle("on", _expanded);
    };
    const settingsBtn = document.getElementById("joviSettingsBtn");
    const settingsSheet = document.getElementById("joviSettingsSheet");
    if (settingsBtn && settingsSheet) {
      settingsBtn.onclick = () => {
        const hide = !settingsSheet.hidden;
        settingsSheet.hidden = hide;
        settingsBtn.classList.toggle("on", !hide);
      };
    }
    document.getElementById("joviSend").onclick = () => send();
    document.getElementById("joviInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });
    document.getElementById("joviMic").onclick = () => toggleVoice();
    document.getElementById("joviStopSpeak").onclick = () => {
      try { if (global.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* */ }
    };
    const speakEl = document.getElementById("joviSpeak");
    if (speakEl) {
      speakEl.onchange = () => {
        _voiceOut = !!speakEl.checked;
        try { localStorage.setItem(VOICE_KEY, _voiceOut ? "1" : "0"); } catch (e) { /* */ }
        if (typeof showToast === "function") showToast(_voiceOut ? "Speak answers on" : "Speak answers off");
      };
    }
    const newChat = document.getElementById("joviNewChat");
    if (newChat) {
      newChat.onclick = () => {
        _history = [];
        persistSession();
        const box = document.getElementById("joviMsgs");
        if (box) box.innerHTML = "";
        pushBot("New chat. Kaise help karun?");
        if (settingsSheet) settingsSheet.hidden = true;
        if (settingsBtn) settingsBtn.classList.remove("on");
      };
    }
    document.getElementById("joviLang").onchange = (e) => {
      _speechLang = e.target.value || "auto";
      try { localStorage.setItem(LANG_KEY, _speechLang); } catch (err) { /* */ }
      if (typeof showToast === "function") showToast("🌐 Language: " + _speechLang);
    };
    document.getElementById("joviImg").onclick = () => document.getElementById("joviFile").click();
    document.getElementById("joviFile").onchange = onPickImage;
    panel.querySelectorAll(".jovi-chip").forEach((chip) => {
      chip.onclick = () => {
        document.getElementById("joviInput").value = chip.getAttribute("data-prompt") || "";
        send();
      };
    });

    if (!_history.length) {
      pushBot("Hey! Main **Jovi** 🤖 — Quantrex **Universal AI Academic Agent**.\n\nJaise ChatGPT / Gemini / Grok — plus aapka **Quantrex database**:\n\n• **Any language** bol/likh (Hindi, English, Hinglish, Tamil, Telugu…)\n• **Mic 🎤** se baat · **🔊** se jawab suno\n• Exam open · Easy/Medium/Hard tests · PYQ · solutions · photo doubts\n• Weak chapters (agar practice data ho)\n• Database pehle · invent nahi\n\nTry: “Open TS EAMCET” ya “10 medium Physics test”");
    } else {
      _history.forEach((m) => appendBubble(m.role === "user" ? "user" : "bot", m.content, m.meta));
    }
  }

  function toggle(force) {
    ensureDom();
    _open = force == null ? !_open : !!force;
    document.getElementById("joviPanel").classList.toggle("open", _open);
    if (_open) {
      const input = document.getElementById("joviInput");
      if (input) setTimeout(() => input.focus(), 50);
    }
  }

  function pushBot(text, meta) {
    _history.push({ role: "assistant", content: text, meta: meta || null });
    persistSession();
    appendBubble("bot", text, meta);
  }

  function pushUser(text) {
    _history.push({ role: "user", content: text });
    persistSession();
    appendBubble("user", text);
  }

  function appendBubble(role, text, meta) {
    const box = document.getElementById("joviMsgs");
    if (!box) return;
    const div = document.createElement("div");
    div.className = "jovi-bubble " + (role === "user" ? "user" : "bot");
    let html = role === "user" ? escapeHtml(text) : renderMarkdownLite(text);
    if (meta && meta.hits && meta.hits.length) html += formatHitsHtml(meta.hits);
    if (meta && meta.quickActs && meta.quickActs.length) html += formatActionsHtml(meta.quickActs);
    if (meta && meta.allowSave) {
      html += `<div style="margin-top:8px"><button type="button" class="jovi-chip" data-save="1">💾 Save</button></div>`;
    }
    div.innerHTML = html;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;

    div.querySelectorAll(".jovi-hit").forEach((btn) => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-qid");
        if (id && typeof go === "function") {
          try { go("question", { id }); } catch (e) { /* */ }
        }
        send("Open and explain question " + id + " step by step. If no official solution, solve it as [Jovi-generated solution].");
      };
    });
    div.querySelectorAll(".jovi-act").forEach((btn) => {
      btn.onclick = () => {
        const i = parseInt(btn.getAttribute("data-act"), 10);
        const act = meta.quickActs && meta.quickActs[i];
        if (!act) return;
        if (act.prompt) {
          document.getElementById("joviInput").value = act.prompt;
          send();
        } else if (act.type) {
          runTeacherIntent(act).then((r) => {
            if (r && r.reply) pushBot(r.reply, { allowSave: true });
          });
        }
      };
    });
    const saveBtn = div.querySelector("[data-save]");
    if (saveBtn) {
      saveBtn.onclick = () => saveToAccount({ type: "chat", text, hits: (meta && meta.hits) || [] });
    }

    if (typeof Mx !== "undefined" && Mx.afterRender) {
      try { Mx.afterRender(div); } catch (e) { /* */ }
    }
  }

  function setTyping(on) {
    const box = document.getElementById("joviMsgs");
    if (!box) return;
    let el = document.getElementById("joviTyping");
    if (!on) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement("div");
      el.id = "joviTyping";
      el.className = "jovi-typing";
      el.textContent = "Jovi is working…";
      box.appendChild(el);
    }
    box.scrollTop = box.scrollHeight;
  }

  async function onPickImage(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 6e6) {
      if (typeof showToast === "function") showToast("📎 File too large (max ~6MB)");
      return;
    }
    const input = document.getElementById("joviInput");
    // Plain text notes / paste files
    if (/text\//.test(file.type) || /\.txt$/i.test(file.name)) {
      const reader = new FileReader();
      reader.onload = () => {
        const body = String(reader.result || "").slice(0, 8000);
        if (input) input.value = "Read this study note / question text and help me:\n\n" + body;
        toggle(true);
        send();
      };
      reader.readAsText(file);
      return;
    }
    if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
      if (typeof showToast === "function") {
        showToast("📄 PDF: screenshot pages as images for best OCR, or paste text");
      }
      if (input && !input.value.trim()) {
        input.value = "I will attach a PDF page screenshot next. For now explain how to extract questions from a PDF for Quantrex practice.";
      }
      toggle(true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      _pendingImage = reader.result;
      if (typeof showToast === "function") showToast("📷 Image attached — Jovi Image Agent");
      if (input && !input.value.trim()) {
        input.value = "Solve this question from the image step by step. Match my language. Tag [Jovi-generated] if not from bank.";
      }
      toggle(true);
    };
    reader.readAsDataURL(file);
  }

  function toggleVoice() {
    const SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    const btn = document.getElementById("joviMic");
    const banner = document.getElementById("joviListenBanner");
    if (!SR) {
      if (typeof showToast === "function") showToast("🎤 Voice: use Chrome / Edge for best multi-language talk");
      return;
    }
    if (_listening && _recognition) {
      try { _recognition.stop(); } catch (e) { /* */ }
      _listening = false;
      if (btn) btn.classList.remove("on");
      if (banner) banner.classList.remove("show");
      setAgentStatus("Universal Academic Agent · ready", false);
      return;
    }
    _recognition = new SR();
    _recognition.lang = resolveSttLang();
    _recognition.interimResults = true;
    _recognition.continuous = false;
    _recognition.maxAlternatives = 3;
    _recognition.onresult = (ev) => {
      let text = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        text += ev.results[i][0].transcript;
      }
      const input = document.getElementById("joviInput");
      if (input) input.value = text;
      if (ev.results[ev.results.length - 1].isFinal) {
        send();
      }
    };
    _recognition.onend = () => {
      _listening = false;
      if (btn) btn.classList.remove("on");
      if (banner) banner.classList.remove("show");
      setAgentStatus("Universal Academic Agent · ready", false);
    };
    _recognition.onerror = (err) => {
      _listening = false;
      if (btn) btn.classList.remove("on");
      if (banner) banner.classList.remove("show");
      if (err && err.error === "not-allowed" && typeof showToast === "function") {
        showToast("🎤 Mic permission chahiye — browser allow karo");
      }
    };
    _listening = true;
    if (btn) btn.classList.add("on");
    if (banner) banner.classList.add("show");
    setAgentStatus("Voice Agent · listening (" + _recognition.lang + ")", true);
    try { _recognition.start(); } catch (e) { _listening = false; }
  }

  function speak(text) {
    if (!global.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      const clean = String(text)
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/[*#`_]/g, " ")
        .replace(/\[Jovi-generated[^\]]*\]/gi, " ")
        .replace(/\[DATABASE FACT[^\]]*\]/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1200);
      if (!clean) return;
      const u = new SpeechSynthesisUtterance(clean);
      u.rate = 1.0;
      const lang = _speechLang !== "auto" ? _speechLang : detectSpeechLang(clean);
      u.lang = lang;
      // Prefer a matching voice if installed
      try {
        const voices = speechSynthesis.getVoices() || [];
        const pref = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
        if (pref) u.voice = pref;
      } catch (e) { /* */ }
      speechSynthesis.speak(u);
    } catch (e) { /* */ }
  }

  async function callApi(userText, bankHits, image, mode) {
    const messages = _history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))
      .slice(-14);
    if (!messages.length || messages[messages.length - 1].content !== userText) {
      messages.push({ role: "user", content: userText });
    }

    const langHint = _speechLang !== "auto" ? _speechLang : detectSpeechLang(userText);
    setAgentStatus("Orchestrator · " + (image ? "Image Agent" : "Reasoning Agent"), true);

    const res = await fetch("/api/jovi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        context: buildContext(),
        bankHits: bankHits || [],
        image: image || null,
        mode: mode || (image ? "image" : "chat"),
        language: langHint,
        agentHint: image ? "image_solve" : "universal_chat"
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data.offline) {
        return { offline: true, message: data.message || "AI offline" };
      }
      throw new Error((data && (data.message || data.error)) || ("HTTP " + res.status));
    }
    return data;
  }

  function offlineCompose(userText, search) {
    const hits = search.hits || [];
    if (hits.length) {
      let msg = "📚 **Quantrex bank** matches (full AI solve needs server key):\n";
      hits.forEach((h, i) => {
        msg += `\n${i + 1}. [${h.subject}] ${h.chapter} — ${h.text.slice(0, 140)}… (${h.source})`;
      });
      msg += "\n\nTap a result for solution. Teacher actions (open exam / make test) still work offline.";
      return msg;
    }
    logGap(userText, "offline_no_hits");
    return "Bank search empty + AI not configured.\n\n**I can still do teacher actions:**\n• “Open TS EAMCET”\n• “Make 10 medium Physics test”\n• “Open Engineering”\n\nOwner: set **XAI_API_KEY** on Vercel for full professor answers.";
  }

  async function send(forcedText) {
    ensureDom();
    if (_busy) return;
    const input = document.getElementById("joviInput");
    const text = (forcedText != null ? forcedText : (input && input.value) || "").trim();
    if (!text && !_pendingImage) return;
    if (input) input.value = "";
    const img = _pendingImage;
    _pendingImage = null;

    pushUser(text || "(image question)");
    _busy = true;
    const sendBtn = document.getElementById("joviSend");
    if (sendBtn) sendBtn.disabled = true;
    setTyping(true);

    try {
      // 1) Teacher intents — real app work (no wait for AI)
      if (text && !img) {
        const intent = parseTeacherIntent(text);
        if (intent && intent.type !== "solve") {
          const result = await runTeacherIntent(intent);
          setTyping(false);
          if (result && result.handled) {
            pushBot(result.reply, {
              allowSave: true,
              quickActs: [
                { label: "Easy 10", prompt: "Make 10 easy questions test for " + (intent.exam || "jee_main") },
                { label: "Medium 15", prompt: "Make 15 medium test for " + (intent.exam || "jee_main") },
                { label: "Hard 10", prompt: "Make 10 hard test for " + (intent.exam || "jee_main") }
              ]
            });
            if (_voiceOut) speak(result.reply);
            return;
          }
        }
      }

      // 2) Bank search + AI professor
      const search = searchBank(text);
      // Warm bank if student asked for a specific exam
      try {
        const slug = detectExamSlug(text);
        if (slug) await ensureBankLight(slug);
      } catch (e) { /* */ }

      const data = await callApi(text || "Solve the attached question.", search.hits, img, img ? "image" : "chat");
      setTyping(false);

      if (data.offline) {
        pushBot(offlineCompose(text, search), { hits: search.hits, allowSave: true });
      } else {
        const parsed = parseAiActions(data.reply || "");
        let reply = parsed.text;
        if (parsed.actions.length) {
          const notes = await executeAiActions(parsed.actions);
          if (notes) reply = (reply ? reply + "\n\n" : "") + notes;
        }
        if (search.hits.length && !/bank|PYQ|Quantrex/i.test(reply.slice(0, 200))) {
          reply = "📚 Bank matches are listed below when relevant.\n\n" + reply;
        }
        pushBot(reply, { hits: search.hits, allowSave: true });
        if (_voiceOut) speak(reply);
      }
    } catch (e) {
      setTyping(false);
      const search = searchBank(text);
      if (search.hits.length) {
        pushBot(offlineCompose(text, search) + "\n\n(API: " + escapeHtml(String(e.message || e)) + ")", { hits: search.hits, allowSave: true });
      } else {
        logGap(text, "api_error");
        // Last chance: teacher intent without AI
        const intent = parseTeacherIntent(text);
        if (intent) {
          try {
            const r = await runTeacherIntent(intent);
            if (r && r.reply) {
              pushBot(r.reply, { allowSave: true });
              return;
            }
          } catch (e2) { /* */ }
        }
        pushBot("AI brain hiccup, aur bank me match nahi mila.\n\nTry:\n• “Open TS EAMCET”\n• “Make 10 medium Physics test”\n• Subject/year: “Physics 2022 electrostatics”\n\nTech: " + String(e.message || e));
      }
    } finally {
      _busy = false;
      if (sendBtn) sendBtn.disabled = false;
      setAgentStatus("Universal Academic Agent · ready", false);
    }
  }

  /** Only runs when student explicitly opens Jovi (FAB) — never auto during practice */
  async function onPracticeWrong(q, studentAnswer) {
    if (!q) return;
    setContext({
      mode: "practice_wrong",
      questionId: q.id,
      questionText: stripHtml(q.text || q.question || ""),
      subject: q.subject,
      chapter: q.chapter,
      options: (q.options || []).map(stripHtml),
      wrongAnswer: studentAnswer
    });
    // Do not auto-open; caller must open panel first if desired
  }

  /** Disabled auto-inject — practice UI stays clean (use orange FAB only) */
  function injectInlineAsk() {
    return;
  }

  function boot() {
    loadSession();
    if (!document.getElementById("joviStyles")) {
      const link = document.createElement("link");
      link.id = "joviStyles";
      link.rel = "stylesheet";
      link.href = "assets/jovi.css?v=jovi5";
      document.head.appendChild(link);
    } else {
      document.getElementById("joviStyles").href = "assets/jovi.css?v=jovi5";
    }
    try {
      if (global.speechSynthesis) {
        speechSynthesis.getVoices();
        speechSynthesis.onvoiceschanged = () => { try { speechSynthesis.getVoices(); } catch (e) { /* */ } };
      }
    } catch (e) { /* */ }
    ensureDom();
    // Close panel if it was left open from a previous session flash
    try { toggle(false); } catch (e) { /* */ }
    // Remove any leftover inline Jovi cards from older deploys
    try {
      document.querySelectorAll(".jovi-inline").forEach((n) => n.remove());
    } catch (e) { /* */ }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  global.Jovi = {
    open: () => toggle(true),
    close: () => toggle(false),
    toggle,
    send,
    setContext,
    searchBank,
    onPracticeWrong,
    injectInlineAsk,
    parseTeacherIntent,
    createTest: (opts) => createTestAction(opts || {}),
    openExam: (slug) => openExamAction(slug),
    getGaps: () => {
      try { return JSON.parse(localStorage.getItem(GAP_KEY) || "[]"); } catch (e) { return []; }
    },
    getSaved: () => {
      try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "[]"); } catch (e) { return []; }
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
