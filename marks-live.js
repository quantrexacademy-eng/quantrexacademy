// Live MARKS API client â€” board PYQs (bpyqb) + NCERT toolbox (neet modules)
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

  // mn.txt — student UI never calls Marks. Firebase + /api/catalog only.
  const STUDENT_MARKS_RUNTIME = false;
  let _token = null;
  let _cfgLoaded = false;
  let _idSeq = 910000000;
  const _fullCache = {};
  const _navCache = {};
  /** Permanent browser cache of successfully loaded options (survives reloads) */
  const OPTS_CACHE_KEY = "qx_marks_opts_v5";
  const OPTS_CACHE_MAX = 2500;
  let _optsMem = null;

  function isJwtExpired(tok) {
    try {
      const p = String(tok || "").split(".")[1];
      if (!p) return true;
      const json = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
      return !json.exp || (json.exp * 1000) < (Date.now() + 60000);
    } catch (_) { return true; }
  }

  async function ensureToken() {
    if (!STUDENT_MARKS_RUNTIME) return null;
    if (_token && !isJwtExpired(_token)) return _token;
    if (_token && isJwtExpired(_token)) _token = null;
    const stored = localStorage.getItem("quantrex_marks_token");
    if (stored && stored.length > 20 && !isJwtExpired(stored)) {
      _token = stored;
      return _token;
    }
    if (stored && isJwtExpired(stored)) {
      try { localStorage.removeItem("quantrex_marks_token"); } catch (_) {}
    }
    // Always re-read config if token missing (config may refresh on deploy)
    if (!_cfgLoaded || !_token) {
      _cfgLoaded = true;
      try {
        const res = await fetch("data/marks_config.json?t=" + Date.now(), { cache: "no-store" });
        if (res.ok) {
          const cfg = await res.json();
          if (cfg.token && !isJwtExpired(cfg.token)) {
            _token = cfg.token;
            localStorage.setItem("quantrex_marks_token", cfg.token);
          }
        }
      } catch (e) { /* ignore */ }
    }
    return _token;
  }

  function readOptsCacheStore() {
    if (_optsMem) return _optsMem;
    try {
      const raw = localStorage.getItem(OPTS_CACHE_KEY);
      _optsMem = raw ? JSON.parse(raw) : {};
      if (!_optsMem || typeof _optsMem !== "object") _optsMem = {};
    } catch (_) {
      _optsMem = {};
    }
    return _optsMem;
  }

  function writeOptsCacheStore(store) {
    _optsMem = store || {};
    try {
      const keys = Object.keys(_optsMem);
      if (keys.length > OPTS_CACHE_MAX) {
        keys
          .map(k => ({ k, t: (_optsMem[k] && _optsMem[k].ts) || 0 }))
          .sort((a, b) => a.t - b.t)
          .slice(0, keys.length - OPTS_CACHE_MAX)
          .forEach(x => { delete _optsMem[x.k]; });
      }
      localStorage.setItem(OPTS_CACHE_KEY, JSON.stringify(_optsMem));
    } catch (_) {
      // Quota — drop half and retry once
      try {
        const keys = Object.keys(_optsMem || {});
        keys.slice(0, Math.floor(keys.length / 2)).forEach(k => delete _optsMem[k]);
        localStorage.setItem(OPTS_CACHE_KEY, JSON.stringify(_optsMem));
      } catch (__) { /* */ }
    }
  }

  function getCachedFull(marksId) {
    if (!marksId) return null;
    const store = readOptsCacheStore();
    const hit = store[String(marksId)];
    if (!hit || !hit.options) return null;
    // Reject letter-only / empty cache entries
    if (isLetterStubOptions(hit.options) || !hit.options.length) return null;
    if (hit.options.every(o => !String(o || "").replace(/<[^>]+>/g, "").trim() && !/<img\b/i.test(String(o || "")))) {
      return null;
    }
    return hit;
  }

  function setCachedFull(marksId, payload) {
    if (!marksId || !payload) return;
    const opts = payload.options || [];
    if (!opts.length || isLetterStubOptions(opts)) return;
    if (!opts.some(o => /<img\b/i.test(String(o || "")) || String(o || "").replace(/<[^>]+>/g, "").trim().length > 1)) {
      return;
    }
    const store = readOptsCacheStore();
    store[String(marksId)] = {
      options: opts.slice(),
      q: payload.q || undefined,
      solution: payload.solution || undefined,
      answer: payload.answer,
      answers: payload.answers,
      correctValue: payload.correctValue,
      questionType: payload.questionType,
      ts: Date.now()
    };
    writeOptsCacheStore(store);
  }

  function isRichMatchStem(html) {
    const s = String(html || "");
    if (!/List[\s\-]*I/i.test(s)) return false;
    const imgs = (s.match(/<img\b/gi) || []).length;
    if (/<table/i.test(s) && (imgs >= 2 || /List[\s\-]*II/i.test(s))) return true;
    if (/<table/i.test(s) && s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length > 80) return true;
    return false;
  }

  function applyCachedToQuestion(q, hit) {
    if (!q || !hit) return q;
    if (hit.options && hit.options.length && !isLetterStubOptions(hit.options) && !isPlaceholderOptions(hit.options)) {
      const keep = q.options || [];
      q.options = hit.options.map((o, i) => preferLocalDiagramHtml(keep[i], o));
    }
    if (hit.q) {
      // Never replace a complete List-I/II table with a single-figure cache (Q24475)
      if (isRichMatchStem(q.q) && !isRichMatchStem(hit.q)) {
        /* keep local match stem */
      } else {
        const cacheFig = hasPoolFigureInHtml(hit.q);
        const localFig = hasPoolFigureInHtml(q.q);
        const localEmptyList = isEmptyListMatchTable(q.q);
        const cacheFillsList = localEmptyList && !isEmptyListMatchTable(hit.q);
        if (cacheFig || cacheFillsList || (!localFig && String(hit.q).length > String(q.q || "").length / 2)) {
          if (cacheFig || cacheFillsList || String(hit.q).length >= String(q.q || "").length) {
            q.q = hit.q;
          }
        }
      }
    }
    if (hit.solution && hasRealSolution(hit.solution)) q.solution = hit.solution;
    if (hit.answer != null) q.answer = hit.answer;
    if (hit.answers) q.answers = hit.answers;
    if (hit.correctValue != null) q.correctValue = hit.correctValue;
    if (hit.questionType) q.questionType = hit.questionType;
    q._fullFetched = true;
    q._needsFull = false;
    q._optsLoadFailed = false;
    q._fromOptsCache = true;
    return q;
  }

  function marksProxyUrls(questionId) {
    const id = encodeURIComponent(String(questionId || "").trim());
    if (!id) return [];
    // Student site is catalog-only. Marks proxy is admin migrate, never student.
    return [`/api/catalog?action=q&id=${id}`];
  }

  function marksProxyUrl(questionId) {
    const urls = marksProxyUrls(questionId);
    return urls[0] || null;
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /** One fetch with hard timeout (avoids 12s hydrate race dying on hung proxies) */
  async function fetchJsonTimed(url, headers, ms) {
    const ac = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = setTimeout(() => {
      try { if (ac) ac.abort(); } catch (_) { /* */ }
    }, ms || 9000);
    try {
      const res = await fetch(url, {
        headers: headers || { Accept: "application/json" },
        credentials: "omit",
        cache: "no-store",
        mode: "cors",
        signal: ac ? ac.signal : undefined
      });
      if (!res.ok) {
        const err = new Error("HTTP " + res.status);
        err.status = res.status;
        throw err;
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function recToQuestion(rec, id) {
    const opts = (typeof QxFirebaseBank !== "undefined" && QxFirebaseBank.normalizeOptions)
      ? QxFirebaseBank.normalizeOptions(rec.options)
      : (Array.isArray(rec.options) ? rec.options.slice() : []);
    return {
      id: rec.id != null ? rec.id : id,
      _marksId: rec._marksId || rec.sourceId || id,
      q: rec.q || rec.questionText || "",
      options: opts,
      _qxBankOptions: opts.slice(),
      _qxBankQ: rec.q || rec.questionText || "",
      answer: rec.answer != null ? rec.answer : rec.correctAnswer,
      answers: rec.answers || null,
      questionType: rec.questionType || rec.type || "singleCorrect",
      solution: rec.solution || rec.explanation || "",
      subject: rec.subject || "",
      chapter: rec.chapter || "",
      source: rec.source || "",
      difficulty: rec.difficulty || "",
      _bank: rec._bank || rec.bank || "",
      _fullFetched: true,
      _needsFull: false,
      _listStub: false,
      _fromSelf: true
    };
  }

  async function loadSelfQuestion(qid) {
    const id = String(qid || "").trim();
    if (!id) return null;
    if (typeof QxFirebaseBank !== "undefined" && QxFirebaseBank.getQuestion) {
      try {
        const rec = await QxFirebaseBank.getQuestion(id);
        if (rec && (rec.q || (rec.options && rec.options.length))) return recToQuestion(rec, id);
      } catch (_) { /* */ }
    }
    if (typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.question) {
      try {
        const data = await QuantrexCatalog.question(id);
        const rec = data && (data.question || (data.questions && data.questions[0]));
        if (rec && (rec.q || (rec.options && rec.options.length))) return recToQuestion(rec, id);
      } catch (_) { /* */ }
    }
    return null;
  }

  async function api(path) {
    if (!STUDENT_MARKS_RUNTIME) {
      const qMatchOff = String(path || "").match(/\/api\/v1\/questions\/([^/?#]+)/);
      if (qMatchOff) {
        const self = await loadSelfQuestion(qMatchOff[1]);
        if (self) return { data: self, _qxSelf: true };
      }
      throw new Error("Marks student runtime disabled");
    }
    // Prefer server proxy for single-question fetch (avoids CORS blocks on getmarks.app)
    const qMatch = String(path || "").match(/\/api\/v1\/questions\/([^/?#]+)/);
    if (qMatch) {
      const id = String(qMatch[1] || "").trim();
      const urls = marksProxyUrls(id);
      let lastErr = null;
      // Permanent: race ALL proxies in parallel — first 200 wins (was sequential hang)
      for (let attempt = 0; attempt < 3; attempt++) {
        if (urls.length) {
          try {
            const raced = urls.map(u =>
              fetchJsonTimed(u, { Accept: "application/json" }, 9000).catch(e => {
                lastErr = e;
                if (e && (e.status === 401 || e.status === 503)) {
                  _cfgLoaded = false;
                  _token = null;
                }
                return Promise.reject(e);
              })
            );
            // Promise.any = first fulfilled; polyfill via manual race
            if (typeof Promise.any === "function") {
              return await Promise.any(raced);
            }
            return await new Promise((resolve, reject) => {
              let left = raced.length;
              let settled = false;
              raced.forEach(p => {
                p.then(v => {
                  if (!settled) { settled = true; resolve(v); }
                }).catch(e => {
                  lastErr = e;
                  left -= 1;
                  if (left <= 0 && !settled) reject(lastErr || e);
                });
              });
            });
          } catch (e) {
            lastErr = e && e.errors ? e.errors[0] : e;
            console.warn("marks proxy race fail attempt", attempt, lastErr && lastErr.message);
          }
        }
        if (attempt < 2) await sleep(280 + attempt * 200);
      }
      // Last resort: direct Marks API with token (may CORS-fail on some browsers)
      try {
        const token = await ensureToken();
        if (token) {
          const data = await fetchJsonTimed(
            API + "/api/v1/questions/" + encodeURIComponent(id),
            { Authorization: "Bearer " + token, Accept: "application/json" },
            10000
          );
          return data;
        }
      } catch (e) {
        lastErr = e;
      }
      throw lastErr || new Error("Marks question fetch failed");
    }
    const p = String(path || "");
    if (/^\/api\/v4\/(bpyqb|neet)\//.test(p)) {
      try {
        return await fetchJsonTimed(
          "/api/marks-nav?path=" + encodeURIComponent(p),
          { Accept: "application/json" },
          20000
        );
      } catch (e) {
        console.warn("marks-nav proxy", e && e.message);
      }
    }
    const token = await ensureToken();
    if (!token) throw new Error("MARKS token missing");
    return fetchJsonTimed(
      API + path,
      { Authorization: "Bearer " + token, Accept: "application/json" },
      8000
    );
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

  function hasLocalDiagramHtml(html) {
    return /\/assets\/(?:diagrams|clean-diagrams|qx-figures\/perm)\//i.test(String(html || ""));
  }

  function hasExternalPoolHtml(html) {
    return /cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\//i.test(String(html || ""));
  }

  /** Prefer bank-local clean diagrams over Quizrr/Marks CDN (watermarks, proxy failures). */
  function preferLocalDiagramHtml(local, remote) {
    const L = String(local || "");
    const R = String(remote || "");
    if (!L) return R;
    if (!R) return L;
    if (hasLocalDiagramHtml(L) && !hasLocalDiagramHtml(R)) return L;
    if (hasLocalDiagramHtml(L) && hasExternalPoolHtml(R)) return L;
    // Local has structure image; remote is text/latex only (or stub)
    if (/<img\b/i.test(L) && !/<img\b/i.test(R)) return L;
    // Screenshot 865: Marks hydrate sent "FIGURE" (+ optional broken img) over real structures
    if (/<img\b/i.test(L) && isFigureLabelText(R)) return L;
    return R;
  }

  function mergePreserveImages(prev, next) {
    if (!next) return prev || null;
    if (!prev) return next;
    const out = { ...next };
    // Keep complete List-I/II table when API returned only one molecule (Q24475)
    if (isRichMatchStem(prev.q) && !isRichMatchStem(out.q)) {
      out.q = prev.q;
    }
    // Stem figure: keep local clean diagram when API omitted it or only has CDN
    if (hasLocalDiagramHtml(prev.q) && (!hasPoolFigureInHtml(out.q) || hasExternalPoolHtml(out.q))) {
      if (!hasLocalDiagramHtml(out.q)) {
        const imgs = extractPoolImgTags(prev.q);
        if (imgs.length) out.q = prependPoolImgs(out.q, imgs);
        else if (!hasPoolFigureInHtml(out.q)) out.q = prev.q;
      }
    } else if (!/<img\b/i.test(out.q || "")) {
      const imgs = extractPoolImgTags(prev.q);
      if (imgs.length) out.q = prependPoolImgs(out.q, imgs);
    }
    const pOpts = prev.options || [];
    const nOpts = out.options || [];
    if (pOpts.length && nOpts.length) {
      out.options = nOpts.map((o, i) => preferLocalDiagramHtml(pOpts[i], o));
    } else if (pOpts.length && !nOpts.length) {
      out.options = pOpts.slice();
    }
    if (!/<img\b/i.test(out.solution || "")) {
      const imgs = extractPoolImgTags(prev.solution);
      if (imgs.length) out.solution = prependPoolImgs(out.solution, imgs);
    }
    return out;
  }

  function htmlPart(text, image) {
    let out = String(text || "").trim();
    if (isFigureLabelText(out)) out = "";
    // Preserve image-only options; don't run MathJax prep that can strip tags
    const hasImg = /<img\b/i.test(out);
    if (out && !hasImg && typeof Mx !== "undefined" && Mx.html) {
      out = Mx.html(out);
    } else if (out && hasImg) {
      out = fixImgUrl(out);
    }
    const imgUrl = image || pickImageFromText(String(text || "")) || null;
    if (imgUrl && !/<img\b/i.test(out)) {
      const cdn = fixImgUrl(typeof imgUrl === "string" ? imgUrl : (imgUrl.url || imgUrl.src || ""));
      if (cdn) {
        const disp = (typeof QxImgClean !== "undefined" && QxImgClean.poolDisplaySrc)
          ? QxImgClean.poolDisplaySrc(cdn)
          : cdn;
        out += (out ? "" : "") + (typeof QxImgClean !== "undefined" && QxImgClean.poolOptionFigureHtml
          ? QxImgClean.poolOptionFigureHtml(disp || cdn, 0)
          : `<img class="qx-no-wm qx-pool-fig qx-opt-fig-img" src="${disp || cdn}" alt="" loading="eager" decoding="async" style="max-width:min(100%,280px);max-height:220px;height:auto;display:block;margin:6px auto;object-fit:contain;background:#fff">`);
      }
    }
    // Ensure option images are visible size
    out = out.replace(/<img\b(?![^>]*style=)/gi, '<img style="max-width:220px;height:auto;display:block" ');
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
    const t = s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!t) return true;
    if (/^Loading question/i.test(t)) return true;
    if (/^(figure|fig\.?|diagram|image|structure|photo)$/i.test(t)) return true;
    return false;
  }

  function isNonMcqType(type) {
    const t = String(type || "").toLowerCase();
    if (/multiple|single|match/i.test(t)) return false;
    return /numerical|subjective|integer|long|descriptive|fill/i.test(t);
  }

  function isExamgoalQuestion(q) {
    if (!q) return false;
    if (q._examgoalId || q._bank === "examgoal_2027") return true;
    return /examgoal/i.test(String(q.source || ""));
  }

  function optionHasContent(o) {
    const s = String(o || "");
    if (/<img/i.test(s)) return true;
    // SMILES tags count as content (will expand to structure images)
    if (/smiles/i.test(s) && s.length > 8) return true;
    const t = s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    // Single letter alone is NOT enough content for structure MCQs (hydrate needed)
    if (/^[ABCDabcd]$/.test(t)) return false;
    if (/^(figure|fig\.?|diagram|image|structure|photo)$/i.test(t)) return false;
    return t.length > 0;
  }

  /** Pure A/B/C/D stubs from incomplete bank import — must hydrate from Marks */
  function isLetterStubOptions(options) {
    if (!options || !options.length) return false;
    if ((options || []).some(o => /<img\b|smiles/i.test(String(o || "")))) return false;
    const plain = (options || []).map(o => String(o || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\$/g, "")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/\s+/g, " ")
      .trim());
    if (!plain.some(t => t.length > 0)) return false;
    // A / (A) / MathML-stripped A
    return plain.every(t => !t || /^[ABCDabcd]$/.test(t) || /^\(?[ABCDabcd]\)?$/.test(t));
  }

  function isPlaceholderOptions(options) {
    if (!options || !options.length) return true;
    // Any real image option = not placeholder
    if ((options || []).some(o => /<img\b/i.test(String(o || "")))) return false;
    if ((options || []).some(o => /smiles/i.test(String(o || "")) && String(o || "").length > 10)) return false;
    const plain = (options || []).map(o => String(o || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\$/g, "")
      .replace(/\s+/g, " ")
      .trim());
    // All empty / whitespace / empty HTML tags only
    if (!plain.some(t => t.length > 0)) return true;
    // Marks list stubs: "FIGURE" / "Fig." with no real structure
    if (plain.every(t => !t || /^(figure|fig\.?|diagram|image|structure)$/i.test(t))) return true;
    // PERMANENT: letter-only A–D = incomplete bank stubs (need Marks full question)
    if (isLetterStubOptions(options)) return true;
    return false;
  }

  function stemNeedsRealOptions(q) {
    const stem = String((q && q.q) || "").replace(/<[^>]+>/g, " ");
    if (/<img\b/i.test(String((q && q.q) || ""))) {
      // Stem has figure — options may still be structures
      if (/\b(major product|structure of|identify|correct option|correct reaction|respectively)\b/i.test(stem)) {
        return true;
      }
    }
    return /\b(identify|structure|major product|mixed ether|following reaction|given below|correct reaction|correct sequence|compound\s*[A-Z]\b|products?\s*[A-Z]|respectively)\b/i.test(stem)
      || questionReferencesFigure(q && q.q);
  }

  function allOptionsHaveContent(options) {
    const opts = options || [];
    if (!opts.length) return false;
    if (isPlaceholderOptions(opts)) return false;
    return opts.every(optionHasContent);
  }

  function isPartialOptions(options) {
    if (!options || !options.length) return true;
    if (isPlaceholderOptions(options)) return true;
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
    if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType) {
      try {
        if (QuantrexQFormat.getType(q) === "numerical") return true;
      } catch (_) { /* */ }
    }
    const text = String(q.q || "").replace(/<[^>]+>/g, " ");
    if (/nearest\s+integer|nearest integer|integer\s*value|integer\s*type|_______|_{3,}/i.test(text)) return true;
    if (/molecular\s*weight|molar\s*mass|g\s*\/\s*mol|is\s+g\s*\/\s*mol/i.test(text)) {
      const opts = q.options || [];
      const lettersOnly = !opts.length || opts.every(o => {
        const t = String(o || "").replace(/<[^>]+>/g, "").trim();
        return !t || /^[A-D]$/i.test(t);
      });
      if (lettersOnly) return true;
    }
    if (q.correctValue != null && String(q.correctValue) !== "") return true;
    return false;
  }

  function isQuestionTextReady(q) {
    return !!q && !isBlankText(q.q);
  }

  function isOptionsReady(q) {
    if (!q) return false;
    // After one failed hydrate, stop treating as incomplete (prevents infinite Loading…)
    if (q._optsFetchFailed || q._catalogTried) return true;
    // Numerical / integer always ready once stem text is present
    if (isNumericalQuestion(q)) return isQuestionTextReady(q);
    if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType) {
      try {
        const t = QuantrexQFormat.getType(q);
        if (t === "numerical" || t === "subjective") return isQuestionTextReady(q);
      } catch (_) { /* */ }
    }
    const opts = q.options || [];
    if (!opts.length) {
      // Empty options: numerical already handled; MCQ with marksId still loading (once)
      if (q._optsFetchFailed || q._fullFetched) return true;
      return !q._marksId || !!q._book || !!q._bookId;
    }
    // Letter stubs / empty = not ready when we can still hydrate from Marks
    if (isPlaceholderOptions(opts)) {
      if (q._optsFetchFailed || q._fullFetched) return true;
      // Figure already contains A–D structures (ExamGoal / Quizrr / PYQ) — letters are the real options
      if (isLetterStubOptions(opts) && /<img\b/i.test(String(q.q || ""))) return true;
      if (isExamgoalQuestion(q) && isLetterStubOptions(opts)) return true;
      if (q._marksId && !q._book && !q._bookId) return false;
      // Offline pack / no marks: letter-only rank-booster style is acceptable
      if (isLetterStubOptions(opts) && !stemNeedsRealOptions(q)) return true;
      return false;
    }
    // Any option with image counts ready if most options have content/images
    const withContent = opts.filter(o => optionHasContent(o) || /<img\b/i.test(String(o || ""))).length;
    if (withContent >= Math.min(2, opts.length) && withContent === opts.length) return true;
    if (opts.every(o => /<img\b/i.test(String(o || "")))) return true;
    if (isPartialOptions(opts)) return false;
    if (!allOptionsHaveContent(opts)) return false;
    return true;
  }

  function isQuestionReady(q) {
    return isQuestionTextReady(q) && isOptionsReady(q);
  }

  function isQuestionIncomplete(q) {
    return !isQuestionTextReady(q);
  }

  function isOptionsIncomplete(q) {
    if (!q || q._optsFetchFailed) return false;
    return isQuestionTextReady(q) && !isOptionsReady(q);
  }

  function hasRealSolution(sol) {
    const plain = String(sol || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    if (!plain) return false;
    if (/^no solution\.?$/.test(plain)) return false;
    if (/solution not available|official solution is not available/.test(plain)) return false;
    if (/support us by uploading|community solution|upload your own solution/.test(plain)) return false;
    return true;
  }

  function cleanSolution(sol) {
    return hasRealSolution(sol) ? sol : "";
  }

  function needsFullQuestion(q) {
    if (!q || !q._marksId) return false;
    if (!STUDENT_MARKS_RUNTIME) {
      if (q._catalogTried || q._fullFetched || q._optsFetchFailed) return false;
      if (isNumericalQuestion(q) && isQuestionTextReady(q)) return false;
    }
    if (isExamgoalQuestion(q)) return false;
    // Digital books ship complete chapter packs offline — never wipe good local content
    // BUT Rank Booster letter-only stubs (A–D, no stem figure) still need Marks hydrate
    if (q._book || q._bookId) {
      if (!isBlankText(q.q) && !isPlaceholderOptions(q.options)) return false;
      // Letter A–D only with no images in options → incomplete pack
      const opts = q.options || [];
      const plain = opts.map(o => String(o || "").replace(/<[^>]+>/g, "").trim());
      const letterOnly = plain.length >= 2 && plain.every(t => /^[A-D]$/i.test(t) || !t);
      const hasOptImg = opts.some(o => /<img\b/i.test(String(o || "")));
      const stemFig = /<img\b/i.test(String(q.q || ""));
      if (letterOnly && !hasOptImg && !stemFig) return true;
      if (!isBlankText(q.q) && !letterOnly) return false;
    }
    if (isNumericalQuestion(q) && isQuestionTextReady(q)) {
      // Numerical needs body only; skip option hydrate loops
      return questionNeedsFigure(q);
    }
    if (questionNeedsFigure(q)) return true;
    const nonMcq = isNonMcqType(q.questionType || q.type);
    // Letter stubs / empty MCQ options always need Marks full payload
    if (!nonMcq && isPlaceholderOptions(q.options)) return true;
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
      // Re-fetch if still letter stubs after a "full" fetch that actually failed
      return !nonMcq && isPlaceholderOptions(q.options);
    }
    return !!q._needsFull || isBlankText(q.q) || (!nonMcq && isPlaceholderOptions(q.options));
  }

  function pickImage(obj) {
    if (!obj) return null;
    if (typeof obj === "string" && /^(https?:)?\/\//i.test(obj)) return obj;
    const unwrap = (im) => {
      if (!im) return null;
      if (typeof im === "string") return im;
      return im.url || im.src || im.href || im.path || null;
    };
    const direct = unwrap(obj.image) || unwrap(obj.img) || obj.imageUrl || obj.imgUrl;
    if (direct) return direct;
    if (Array.isArray(obj.images) && obj.images[0]) return unwrap(obj.images[0]);
    return null;
  }

  function isFigureLabelText(html) {
    const t = String(html || "")
      .replace(/<img\b[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return !t || /^(figure|fig\.?|diagram|image|structure|photo)$/i.test(t);
  }

  function pickImageFromText(text) {
    const s = String(text || "");
    const m = s.match(/\bsrc=["']([^"']+(?:cdn-question-pool|cdn\.quizrr|\/pyq\/)[^"']+)["']/i);
    return m ? fixImgUrl(m[1]) : null;
  }

  function hasPoolFigureInHtml(html) {
    const s = String(html || "");
    if (/\bdata-qx-orig-src=["'][^"']+(?:cdn-question-pool|cdn\.quizrr|\/pyq\/|assets\/(?:diagrams|clean-diagrams))/i.test(s)) return true;
    if (/<img\b[^>]*src=["'][^"']+(?:cdn-question-pool|cdn\.quizrr|\/pyq\/|\/cbse\/|ap_eamcet|assets\/(?:diagrams|clean-diagrams))/i.test(s)) return true;
    if (/\/api\/(?:restore-image|proxy-image)\?url=[^"']+(?:cdn-question-pool|cdn\.quizrr|%2Fpyq%2F|assets%2Fdiagrams)/i.test(s)) return true;
    if (/\/assets\/(?:diagrams|clean-diagrams)\//i.test(s) && /<img\b/i.test(s)) return true;
    return extractPoolImgTags(s).length > 0;
  }

  function questionReferencesFigure(html) {
    const plain = String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!plain) return false;
    // Explicit figure wording
    if (/\b(as (?:illustrated|shown)(?:\s+in)?(?:\s+the)?\s+figure|as in (?:the )?figure|see (?:the )?figure|figure (?:below|above|shown)|in the (?:following |given )?figure|from the figure|refer (?:to )?(?:the )?figure)\b/i.test(plain)) {
      return true;
    }
    // "Given / following compound|structure|molecule" â€” almost always a stem diagram on MARKS books
    if (/\b(?:the\s+)?(?:given|following)\s+(?:compound|structure|molecule|species|organic\s+compound|organic\s+molecule)\b/i.test(plain)) {
      return true;
    }
    if (/\b(?:IUPAC\s+)?(?:name|numbering|systematic\s+name)\s+(?:of|for)\s+(?:the\s+)?(?:given|following)\b/i.test(plain)) {
      return true;
    }
    if (/\b(?:correct\s+IUPAC\s+numbering|structure\s+that\s+shows)\b/i.test(plain)
      && /\b(?:given|following)\b/i.test(plain)) {
      return true;
    }
    // Reaction schemes / conversions that almost always ship as CDN images on MARKS
    if (/\b(above conversion|following conversion|given conversion|conversion of\s*[XYA-Z]\s*(?:to|into|â†’|->)\s*[XYA-Z]|correct sequence of reagents for the above|sequence of reagents for the above|in the (?:above|following|given) (?:reaction|conversion|scheme|sequence)|shown (?:above|below)|given reaction|following reaction|reaction scheme|structural formula(?:e)? (?:of|for)|following structural formula)\b/i.test(plain)) {
      return true;
    }
    // Reaction sequence / products I,J,L / paragraph schemes (screenshots 672â€“674)
    if (/\breaction sequence\b/i.test(plain)) return true;
    if (/\bproducts?\s+[IJLXYZPQRST]\b/i.test(plain) && /\b(structure|formed|reagent|sequence)\b/i.test(plain)) return true;
    if (/\bParagraph\b/i.test(String(html || "")) && /\b(reaction|product|reagent)\b/i.test(plain)) return true;
    // List-I / List-II matching tables almost always embed structure images in cells
    if (/\bList[\s-]*I\b/i.test(plain) && /\bList[\s-]*II\b/i.test(plain)) return true;
    if (/\bLIST\s*-\s*I\b/i.test(plain) && /\bLIST\s*-\s*II\b/i.test(plain)) return true;
    // "X to Y" / "A â†’ B" style stems with very little text â‡’ image expected
    if (/\b[XYA-D]\s*(?:to|â†’|->|into)\s*[XYA-D]\b/i.test(plain) && plain.length < 220) {
      return true;
    }
    return false;
  }

  /** List-I / List-II table has only (P)/(1) labels — content/images missing (screenshot 774) */
  function isEmptyListMatchTable(html) {
    const s = String(html || "");
    // Match stem without table but referencing structures + no figure
    if (/List[\s\-]*I/i.test(s) && /List[\s\-]*II/i.test(s) && !/<img\b/i.test(s)) {
      if (!/<table/i.test(s)) {
        // "structures in List-II" style without any content block
        if (/structure|product|reactant|compound|reagent/i.test(s)) return true;
      }
    }
    if (!/<table/i.test(s)) return false;
    if (!/List[\s\-]*I/i.test(s) || !/List[\s\-]*II/i.test(s)) return false;
    if (/<img\b/i.test(s)) return false;
    // Broken nested <td>(P) <td>(1) form (bank import loss)
    if (/<td[^>]*>\s*\([PQRS]\)\s*<td/i.test(s) && !/<img\b/i.test(s)) {
      const onlyLabs = s
        .replace(/<[^>]+>/g, " ")
        .replace(/List[\s\-]*I{1,2}/gi, " ")
        .replace(/\([PQRS]\)|\([1-5]\)/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (onlyLabs.length < 20) return true;
    }
    const table = (s.match(/<table[\s\S]*?<\/table>/i) || [])[0] || s;
    const body = table
      .replace(/<[^>]+>/g, " ")
      .replace(/List[\s\-]*I{1,2}/gi, " ")
      .replace(/\([PQRS]\)|\([1-5]\)/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Only headers/labels left → blank columns
    return body.length < 12;
  }

  function questionNeedsFigure(q) {
    if (!q || !q._marksId) return false;
    if (isEmptyListMatchTable(q.q)) return true;
    if (hasPoolFigureInHtml(q.q)) return false;
    if (q._questionImage && !hasPoolFigureInHtml(q.q)) return true;
    if (!questionReferencesFigure(q.q)) return false;
    // Allow one forced API pull even if a previous attempt ran (local stub often lacks img)
    if (q._figureFetchAttempted && q._fullFetched && !hasPoolFigureInHtml(q.q) && !isEmptyListMatchTable(q.q)) {
      // Already tried full fetch — stop looping, but first attempt still happens via needsFull
      return false;
    }
    return true;
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
    // Prefer paper with richest title (date + shift)
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
    // Prefer longest / richest source among paper title, meta, existing bank source
    const sourceCands = [
      paper.title,
      meta && meta.source,
      meta && meta.paperSource,
      d.source,
      d.paperSource
    ].filter(Boolean).map(String);
    let source = sourceCands[0] || "Quantrex PYQ";
    sourceCands.forEach(c => {
      const score = (c.match(/shift|morning|evening|apr|jan|feb|mar|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}/gi) || []).length;
      const prev = (source.match(/shift|morning|evening|apr|jan|feb|mar|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}/gi) || []).length;
      if (score > prev || (score === prev && c.length > source.length)) source = c;
    });
    const paperDate = paper.heldOn || paper.date || paper.examDate || d.previousYear || d.heldOn || null;
    let paperShift = paper.shift || paper.session || paper.slot
      || (meta && (meta.shift || meta.session)) || d.shift || null;
    // Extract Shift 1/2 or Morning/Evening from title when API field empty
    if (paperShift == null || paperShift === "") {
      const sm = String(source).match(/\bShift\s*[-–]?\s*([12])\b/i)
        || String(source).match(/\b(Morning|Evening|Forenoon|Afternoon)\s*Shift\b/i);
      if (sm) paperShift = sm[1];
    }

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
      paperShift: paperShift,
      shift: paperShift,
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
      // Keep richer paper meta from bank if API/list returned a thin "JEE Main" only
      const keepSource = (a, b) => {
        const sa = String(a || "");
        const sb = String(b || "");
        const score = (s) => (s.match(/shift|morning|evening|apr|jan|feb|mar|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}/gi) || []).length;
        if (score(sa) > score(sb)) return sa;
        if (score(sb) > score(sa)) return sb;
        return sa.length >= sb.length ? sa : sb;
      };
      const bestSource = keepSource(existing.source || existing.paperSource, merged.source || merged.paperSource);
      Object.assign(existing, merged, {
        subject: meta.subject || existing.subject,
        chapter: meta.chapter || existing.chapter,
        _bank: meta.bank || existing._bank,
        source: bestSource || merged.source || existing.source,
        paperSource: bestSource || merged.paperSource || existing.paperSource,
        paperDate: existing.paperDate || merged.paperDate || null,
        paperShift: existing.paperShift || merged.paperShift || existing.shift || merged.shift || null,
        shift: existing.shift || merged.shift || existing.paperShift || merged.paperShift || null,
        difficulty: merged.difficulty || existing.difficulty
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
    const self = await loadSelfQuestion(qid);
    if (self) {
      _fullCache[qid] = Object.assign({}, self, meta || {});
      return _fullCache[qid];
    }
    if (!STUDENT_MARKS_RUNTIME) {
      throw new Error("Question not in Quantrex bank");
    }
    const data = await api("/api/v1/questions/" + qid);
    return normalizeFull(data, meta || {});
  }

  function mergeIntoActiveMap(q, fields) {
    if (!q || q.id == null) return q;
    // Mutate the same object callers already hold (practice UI uses getQ â†’ QUESTIONS/map refs)
    if (fields && typeof fields === "object") Object.assign(q, fields, { id: q.id });
    if (window.TS_ACTIVE_QMAP) {
      window.TS_ACTIVE_QMAP[q.id] = q;
      window.TS_ACTIVE_QMAP[String(q.id)] = q;
    }
    return q;
  }

  /** Prefer source string that carries date / shift / month detail. */
  function richerPaperSource(a, b) {
    const sa = String(a || "");
    const sb = String(b || "");
    const score = (s) => {
      if (!s) return 0;
      let n = 0;
      if (/shift\s*[-–]?\s*[12]|morning|evening|forenoon|afternoon/i.test(s)) n += 20;
      if (/\d{1,2}\s*[A-Za-z]{3,}|20\d{2}-\d{2}-\d{2}/i.test(s)) n += 15;
      if (/\b(20\d{2}|19\d{2})\b/.test(s)) n += 5;
      n += Math.min(s.length, 80) / 10;
      return n;
    };
    return score(sa) >= score(sb) ? (sa || sb) : (sb || sa);
  }

  function preservePaperMeta(target, prev) {
    if (!target || !prev) return target;
    const best = richerPaperSource(
      richerPaperSource(prev.source, prev.paperSource),
      richerPaperSource(target.source, target.paperSource)
    );
    if (best) {
      target.source = best;
      target.paperSource = best;
    }
    if (prev.paperDate && !target.paperDate) target.paperDate = prev.paperDate;
    const prevShift = prev.paperShift != null && prev.paperShift !== ""
      ? prev.paperShift
      : prev.shift;
    if ((target.paperShift == null || target.paperShift === "") && prevShift != null && prevShift !== "") {
      target.paperShift = prevShift;
      target.shift = prevShift;
    }
    // Keep bank difficulty if API left empty
    if ((!target.difficulty || target.difficulty === "Medium") && prev.difficulty
      && prev.difficulty !== "Medium" && !target._fullFetched) {
      /* keep API difficulty when full fetched */
    }
    if (!target.difficulty && prev.difficulty) target.difficulty = prev.difficulty;
    return target;
  }

  async function ensureQuestionFull(q, opts) {
    if (!q || !q._marksId) return q;
    if (isExamgoalQuestion(q)) {
      q._shardLoaded = true;
      q._fullFetched = true;
      q._needsFull = false;
      return q;
    }
    const force = !!(opts && opts.force);
    const needSol = !!(opts && opts.solution);
    // Snapshot paper meta BEFORE hydrate (API often returns thin "JEE Main" only)
    const paperSnap = {
      source: q.source,
      paperSource: q.paperSource,
      paperDate: q.paperDate,
      paperShift: q.paperShift,
      shift: q.shift,
      difficulty: q.difficulty
    };

    // Instant path: permanent local cache of real options (no network)
    // BUT never skip network when List-I/II table is still empty (blank columns)
    if ((isPlaceholderOptions(q.options) || !isOptionsReady(q)) && !isEmptyListMatchTable(q.q)) {
      const cached = getCachedFull(q._marksId);
      if (cached) {
        applyCachedToQuestion(q, cached);
        preservePaperMeta(q, paperSnap);
        preservePaperMeta(q, cached);
        if (isOptionsReady(q) && !isEmptyListMatchTable(q.q) && !questionNeedsFigure(q)) {
          _fullCache[q._marksId] = q;
          return q;
        }
      }
    }

    if (!force && !needsFullQuestion(q) && !(needSol && !hasRealSolution(q.solution))
      && !isEmptyListMatchTable(q.q)) return q;
    const snap = {
      q: q.q,
      options: (q.options || []).slice(),
      solution: q.solution,
      source: q.source,
      paperSource: q.paperSource,
      paperDate: q.paperDate,
      paperShift: q.paperShift,
      shift: q.shift,
      difficulty: q.difficulty
    };
    try {
      const fetched = await fetchFullQuestion(q._marksId, {
        subject: q.subject,
        chapter: q.chapter,
        bank: q._bank,
        examName: q.examName,
        source: richerPaperSource(q.source, q.paperSource) || q.source,
        paperSource: q.paperSource || q.source,
        shift: q.paperShift || q.shift
      }, true);
      // Prefer API payload; keep local clean diagrams when API only has CDN/watermarks
      let merged = mergePreserveImages(snap, fetched);
      // Never keep stub A/B/C/D or empty options when API returned real ones —
      // but prefer bank-local /assets/diagrams paths over Quizrr CDN
      if (!isPlaceholderOptions(fetched.options)) {
        const snapOpts = snap.options || [];
        const apiOpts = fetched.options || [];
        // Permanent (683): empty bank slots ("") must never beat real API options
        merged = {
          ...merged,
          options: apiOpts.map((o, i) => {
            const local = snapOpts[i];
            const localEmpty = !String(local || "").replace(/<[^>]+>/g, "").trim()
              && !/<img\b/i.test(String(local || ""));
            if (localEmpty) return o;
            return preferLocalDiagramHtml(local, o);
          })
        };
      } else if (isPlaceholderOptions(merged.options) && !isPlaceholderOptions(snap.options)) {
        merged = { ...merged, options: snap.options };
      } else if (isPlaceholderOptions(fetched.options) && isPlaceholderOptions(snap.options)) {
        // API also returned stubs/empty — try permanent cache
        const cached = getCachedFull(q._marksId);
        if (cached && cached.options && !isPlaceholderOptions(cached.options)) {
          merged.options = cached.options.slice();
        }
      }
      // Hard guarantee: never leave empty-string option arrays after a successful fetch
      if (isPlaceholderOptions(merged.options) && !isPlaceholderOptions(fetched.options)) {
        merged.options = (fetched.options || []).slice();
      }
      // Prefer API body when it carries the reaction diagram the local stub omitted
      if (fetched.q && !isBlankText(fetched.q)) {
        const gut = (s) => {
          const t = String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
          return /\bLet\s*[.,;:]?\s*(Consider|Then|the following)\b/i.test(t) || /\bLet\s+\.\s/i.test(t);
        };
        const mathW = (s) => (String(s || "").match(/\$/g) || []).length + (String(s || "").match(/\\[a-zA-Z]+/g) || []).length;
        let keepBankStem = false;
        if (gut(fetched.q) && snap.q && !gut(snap.q)) {
          merged.q = snap.q;
          keepBankStem = true;
        } else if (mathW(snap.q) > mathW(fetched.q) + 3) {
          merged.q = snap.q;
          keepBankStem = true;
        }
        const apiFig = hasPoolFigureInHtml(fetched.q);
        const localFig = hasPoolFigureInHtml(snap.q);
        const localClean = hasLocalDiagramHtml(snap.q);
        const localMatchLocal =
          /assets\/diagrams\/qx-match|qx-local-fig/i.test(String(snap.q || ""))
          && /<img\b/i.test(String(snap.q || ""));
        const apiOnlyCdn = apiFig && hasExternalPoolHtml(fetched.q) && !hasLocalDiagramHtml(fetched.q);
        const localEmptyList = isEmptyListMatchTable(snap.q);
        const apiFillsList = localEmptyList && (apiFig || !isEmptyListMatchTable(fetched.q)
          || String(fetched.q).length > String(snap.q || "").length + 80);
        // CRITICAL: never overwrite local List-I/II figures with Marks CDN (blank columns)
        if (keepBankStem) {
          /* already kept richer bank stem (Let $f(x)=…$) */
        } else if (localMatchLocal) {
          merged.q = snap.q;
        } else if (apiFillsList) {
          merged.q = fetched.q;
        } else if (localClean && (!apiFig || apiOnlyCdn) && !localEmptyList) {
          // Keep local clean stem figure + use API text if richer
          if (!localFig) merged.q = preferLocalDiagramHtml(snap.q, fetched.q);
          else merged.q = snap.q;
        } else if (localClean && hasExternalPoolHtml(fetched.q)) {
          merged.q = snap.q;
        } else if (/AKCR2_|2026_modules\/jee_advanced_physics|irodov/i.test(String(snap.q || snap._qxBankQ || "") + " " + String(snap._book || snap._bookId || ""))) {
          merged.q = snap._qxBankQ || snap.q;
        } else if (isRichMatchStem(snap.q || snap._qxBankQ) && !isRichMatchStem(fetched.q)) {
          merged.q = snap._qxBankQ && isRichMatchStem(snap._qxBankQ) ? snap._qxBankQ : snap.q;
        } else if (apiFig || !localFig || String(fetched.q).length >= String(snap.q || "").length) {
          // Prefer local if it has more <img> than API (match tables)
          const nL = (String(snap.q || "").match(/<img\b/gi) || []).length;
          const nA = (String(fetched.q || "").match(/<img\b/gi) || []).length;
          if (nL > 0 && nL >= nA && /List[\s\-]*I/i.test(String(snap.q || ""))) {
            merged.q = snap.q;
          } else if (isRichMatchStem(snap._qxBankQ) && !isRichMatchStem(fetched.q)) {
            merged.q = snap._qxBankQ;
          } else {
            merged.q = fetched.q;
          }
        }
      }
      if (hasRealSolution(fetched.solution)) merged.solution = fetched.solution;
      if (fetched.correctValue != null) merged.correctValue = fetched.correctValue;
      if (fetched.questionType) merged.questionType = fetched.questionType;
      if (fetched.answers) merged.answers = fetched.answers;
      if (fetched.answer != null) merged.answer = fetched.answer;

      // Stem says "given compound" but API omitted figure: do not loop forever —
      // only keep needing full when options are still stubs
      const stillNeedFig = questionReferencesFigure(merged.q) && !hasPoolFigureInHtml(merged.q)
        && !hasPoolFigureInHtml((merged.options || []).join(" "));
      const optsHaveStructs = (merged.options || []).filter(o => /<img\b/i.test(String(o || ""))).length >= 2;
      const optsStillBad = isPlaceholderOptions(merged.options)
        && !isNumericalQuestion({ ...q, ...merged, options: merged.options, q: merged.q });
      merged._fullFetched = true;
      merged._figureFetchAttempted = true;
      merged._needsFull = optsStillBad || (stillNeedFig && !optsHaveStructs);
      // Never permanent-fail when we still have retry room — only mark failed if stubs remain
      // AND caller has exhausted attempts (app.js). Soft flag only.
      merged._optsLoadFailed = false;
      merged._optsStillStub = optsStillBad;
      merged.id = q.id;
      merged._marksId = q._marksId;
      merged._bank = q._bank;

      // Always write onto the live question object (never replace with a disconnected copy)
      Object.assign(q, merged);
      // CRITICAL: never let thin API source wipe bank date/shift (screenshot 730)
      preservePaperMeta(q, paperSnap);
      preservePaperMeta(q, snap);
      if (window.TS_ACTIVE_QMAP) {
        window.TS_ACTIVE_QMAP[q.id] = q;
        window.TS_ACTIVE_QMAP[String(q.id)] = q;
      }
      if (typeof QUESTIONS !== "undefined") {
        const existing = QUESTIONS.find(x =>
          x._marksId === q._marksId || x.id === q.id || String(x.id) === String(q.id)
        );
        if (existing && existing !== q) {
          Object.assign(existing, q);
          preservePaperMeta(existing, paperSnap);
        }
      }
      _fullCache[q._marksId] = q;
      // Permanent cache for next visit
      if (!isPlaceholderOptions(q.options)) {
        setCachedFull(q._marksId, q);
      }
      return q;
    } catch (e) {
      console.warn("ensureQuestionFull failed", q._marksId, e && e.message);
      // Permanent: try cache on network error — never fail hard on first error
      const cached = getCachedFull(q._marksId);
      if (cached) {
        applyCachedToQuestion(q, cached);
        q._fetchError = String(e && e.message || e);
        return q;
      }
      q._fetchError = String(e && e.message || e);
      q._fetchFailCount = (q._fetchFailCount || 0) + 1;
      // Only after 4 hard failures mark load failed (was: first failure)
      if (q._fetchFailCount >= 4) q._optsLoadFailed = true;
      else q._optsLoadFailed = false;
      q._needsFull = true;
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
    let paper = papers[0] || {};
    if (papers.length > 1) {
      paper = papers.slice().sort((a, b) => String((b && b.title) || "").length - String((a && a.title) || "").length)[0] || paper;
    }
    const source = paper.title || meta.source || "PYQ";
    const paperDate = paper.heldOn || paper.date || item.previousYear || null;
    const paperShift = paper.shift || paper.session || (meta && meta.shift) || null;

    if (hasRealOpts) {
      return normalizeFull({ data: item }, meta || {});
    }

    // Refresh-safe app id (not 910000000 sequence — that broke #question/910000000 on reload)
    const appId = marksId
      ? ("m_" + String(marksId))
      : (_idSeq++);
    const rec = {
      id: appId,
      _marksId: marksId,
      _bank: meta.bank || "marks_live",
      _live: true,
      _listStub: true,
      _needsFull: true,
      subject: meta.subject || "",
      chapter: meta.chapter || "",
      exam: meta.exam || (typeof STATE !== "undefined" ? STATE.exam : "Engineering"),
      examName: meta.examName || "",
      q: htmlPart(qBody.text, pickImage(qBody)),
      options: [],
      answer: 0,
      solution: "",
      difficulty: levelLabel(item.level),
      source,
      paperDate,
      paperSource: source,
      paperShift,
      shift: paperShift
    };
    if (typeof QUESTIONS !== "undefined") QUESTIONS.push(rec);
    _fullCache[marksId] = rec;
    try {
      if (typeof QxQuestionCache !== "undefined" && QxQuestionCache.rememberStub) {
        QxQuestionCache.rememberStub(rec);
      }
    } catch (_) { /* */ }
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
    if (isExamgoalQuestion(q)) return false;
    const opts = q.options || [];
    // Already have real structure/graph images — do not hydrate FIGURE stubs over them
    if (opts.some(o => /<img\b/i.test(String(o || "")) && /cdn-question-pool|proxy-image|\/pyq\/|watermark_improved|assets\//i.test(String(o || "")))) {
      return false;
    }
    if (needsFullQuestion(q)) return true;
    if (isOptionsIncomplete(q)) return true;
    const hasBody = opts.some(o => {
      const t = String(o || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (!t) return false;
      if (/^(figure|fig\.?|diagram|image|structure)$/i.test(t)) return false;
      return true;
    });
    return !hasBody && !isNonMcqType(q.questionType || q.type);
  }

  async function prefetchQuestions(ids, onProgress) {
    if (!STUDENT_MARKS_RUNTIME) return 0;
    const need = [];
    const seen = new Set();
    (ids || []).forEach(id => {
      const q = typeof getQ === "function" ? getQ(id) : null;
      if (q && needsPrefetch(q) && q._marksId && !seen.has(q._marksId)) {
        seen.add(q._marksId);
        need.push(q);
      }
    });
    // Hard cap — never block UI hydrating whole chapter (hang on Mole Concept / big PYQ sets)
    const capped = need.slice(0, 8);
    if (!capped.length) return 0;
    let done = 0;
    const batch = 3;
    for (let i = 0; i < capped.length; i += batch) {
      await Promise.all(capped.slice(i, i + batch).map(async q => {
        try {
          // Short path: options fill only (not full figure/solution stack)
          if (typeof qxFillOptionsFromMarks === "function") {
            await Promise.race([
              qxFillOptionsFromMarks(q),
              new Promise(r => setTimeout(r, 6000))
            ]);
          } else {
            await Promise.race([
              ensureQuestionFull(q),
              new Promise(r => setTimeout(r, 6000))
            ]);
          }
        } catch (e) { /* skip */ }
        done++;
        if (typeof onProgress === "function") onProgress(done, capped.length);
      }));
    }
    return done;
  }

  async function boardSubjects(examId) {
    if (!STUDENT_MARKS_RUNTIME) {
      return { examId: examId || boardId(), title: boardLabel(), icon: null, meta: [], subjects: [], _self: true };
    }
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
        if (!s._id || s._id === "all_pyqs" || s._id === "topicwise_pyqs") continue;
        sets.push({
          moduleId: m._id,
          setId: s._id,
          title: s.title,
          count: s.questionCount || s.count || 0,
          kind: "ncert"
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
    isLetterStubOptions,
    allOptionsHaveContent,
    isPartialOptions,
    isImageMcq,
    optionHasContent,
    isExamgoalQuestion,
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
    ncertSetQuestionIds,
    ncertSetQuestions,
    fetchFullQuestion,
    fetchQuestionsByMarksIds,
    ensureQuestionFull,
    hydrateQuestions,
    prefetchQuestions,
    loadSelfQuestion,
    STUDENT_MARKS_RUNTIME,
    cpyqbBucketQuestions,
    cpyqbTopicQuestions,
    ensureToken,
    getCachedFull,
    setCachedFull,
    applyCachedToQuestion,
    isRichMatchStem
  };
})();