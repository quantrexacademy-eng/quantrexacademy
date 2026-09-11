// Quantrex — embedded watermark removal (never hides or breaks figures)
window.QxImgClean = (() => {
  const DB_NAME = "quantrex_clean_images_v63";
  const DB_STORE = "blobs";
  const MANIFEST_URL = "data/qx_clean_manifest.json";
  const REVIEW_URL = "data/qx_image_review.json";
  const CLEAN_VER = 100; // PYQ proxy Marks fallback; no hang on all-img rewrite
  /** true = show pool figures from Marks CDN like Marks website (figures never blank) */
  const MARKS_NATIVE_PYQ = false; // clean-proxy PYQ — no Marks logo; color kept
  const CENTER_WM_MAX = 0.006;
  const WM_DETECT_MIN = 0.0035;
  const CDN_ONLY = false;
  const _pinnedHtml = new Map();
  const _cleanSrcCache = new Map();
  const _manifestExistsCache = new Map();
  let _manifestAssetsAvailable = null;
  const FIG_PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  const MIN_INK_RATIO = 0.004;
  const MIN_INK_VS_CDN = 0.38;
  const MAX_WHITE_RATIO = 0.97;
  const MANIFEST_MIN_VER = 3;
  const WM_RESIDUE_MAX = 0.048;
  const PYQ_CDN = "https://cdn-question-pool.getmarks.app/";
  const PROXY_BASE = (typeof location !== "undefined" && location.origin && !/localhost|127\.0\.0\.1/i.test(location.origin))
    ? location.origin.replace(/\/$/, "")
    : ((typeof QUANTREX_STACK !== "undefined" && QUANTREX_STACK.frontend && QUANTREX_STACK.frontend.url)
      ? QUANTREX_STACK.frontend.url.replace(/\/$/, "")
      : "https://quantrexacademy-live.web.app");
  const BROKEN_CDN_RX = /https?:\/\/\.app\//gi;
  const POOL_RX = /cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\/|\/cbse\/|ap_eamcet/i;
  const OPT_IMG_SEL = ".mtk-opt-text, .qx-prac-opt-text, .mtk-opt, .qa-opt, .qx-prac-opt";
  // NOTE: never skip "watermarked_images" (Quizrr structure diagram folder — real figures)
  const SKIP_RX = /marks-premium|ic_marks|marks_selected|getmarks-brand|web_assets|ic_content_exam_|cpyqb\/subjects\/|(?:^|\/)watermark(?:\.png|\.svg|overlay|_logo|_badge|_layer)(?:\b|$)|(?:^|\/)watermarks?\//i;
  const CARD_ART_RX = /formula_cards|revision_flash_cards|another_formula_card/i;

  function keepWipeProxy(src) {
    const s = String(src || "");
    if (CARD_ART_RX.test(s)) return true;
    if (/irodov|qx-irodov/i.test(s)) return false;
    if (typeof needsMarksCleanProxy === "function" && needsMarksCleanProxy(s)) return true;
    return /questions(%2F|\/)figs/i.test(s) && /firebasestorage/i.test(s);
  }

  function shouldRotatePortrait(img) {
    if (!img || !img.isConnected) return false;
    if (img.classList.contains("fc-img") || img.classList.contains("qx-rfc-img")
      || img.classList.contains("qx-irodov-stem") || img.classList.contains("qx-smiles-fig")
      || img.classList.contains("qx-opt-fig-img") || img.classList.contains("qx-marks-icon")) {
      return false;
    }
    if (img.closest(".mtk-opt, .qx-prac-opt, .qa-opt, table, .qx-match-q-body, .qx-opt-pair, .fc-card, #qxRfcReader, #qxFcReader, .qx-rfc-ch")) {
      return false;
    }
    const src = (img.getAttribute("src") || "") + " " + (img.dataset.qxOrigSrc || "");
    if (/formula_cards|revision_flash|qx-irodov|AKCR2_|2026_modules|qx-org-|smiles|pubchem|cactus/i.test(src)) {
      return false;
    }
    const nw = img.naturalWidth || 0;
    const nh = img.naturalHeight || 0;
    if (nw < 48 || nh < 48) return false;
    return nh / nw >= 1.38;
  }

  function resetLand(img) {
    if (!img || img.dataset.qxLand !== "1") return;
    const host = img.closest(".qx-fig-land-host");
    img.classList.remove("qx-fig-landscape");
    img.dataset.qxLand = "0";
    img.style.removeProperty("transform");
    img.style.removeProperty("width");
    img.style.removeProperty("height");
    img.style.removeProperty("max-width");
    img.style.removeProperty("max-height");
    if (host && host.parentNode) {
      host.parentNode.insertBefore(img, host);
      host.remove();
    }
  }

  function arrangePortraitToLandscape(img) {
    if (!img || !img.isConnected) return;
    if (!shouldRotatePortrait(img)) {
      resetLand(img);
      return;
    }
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    const parent = img.closest(".qx-diagram-slot, .qx-diagram-seg, .qx-question-body, .mtk-q-text, .qx-prac-q, .qx-content")
      || img.parentElement;
    const maxW = Math.max(160, Math.min((parent && parent.clientWidth) || 560, 640));
    const visW = Math.min(maxW, nh);
    const scale = visW / nh;
    const visH = Math.max(48, Math.round(nw * scale));
    let host = img.closest(".qx-fig-land-host");
    if (!host) {
      host = document.createElement("div");
      host.className = "qx-fig-land-host";
      img.parentNode.insertBefore(host, img);
      host.appendChild(img);
    }
    img.dataset.qxLand = "1";
    img.classList.add("qx-fig-landscape", "qx-fig-ready", "qx-no-wm");
    host.style.width = visW + "px";
    host.style.height = visH + "px";
    img.style.width = Math.round(nw * scale) + "px";
    img.style.height = Math.round(nh * scale) + "px";
    img.style.maxWidth = "none";
    img.style.maxHeight = "none";
    img.style.margin = "0";
  }

  function inTestUi() {
    try {
      const b = document.body;
      return !!(b && (b.classList.contains("marks-test-active")
        || b.classList.contains("allen-cbt-active")
        || b.classList.contains("allen-practice-active")));
    } catch (_) {
      return false;
    }
  }

  function queueFigLayout(img) {
    if (!img || img.dataset.qxLandQ === "1") return;
    img.dataset.qxLandQ = "1";
    const run = () => {
      try {
        img.style.setProperty("opacity", "1", "important");
        img.style.setProperty("visibility", "visible", "important");
        img.loading = "eager";
        if (!inTestUi()) arrangePortraitToLandscape(img);
      } catch (_) { /* */ }
    };
    if (img.complete && img.naturalWidth > 0) run();
    else img.addEventListener("load", run, { once: true });
  }

  function arrangePortraitFigures(root) {
    const scope = root || document;
    if (!scope || !scope.querySelectorAll) return;
    scope.querySelectorAll("#qxDiagramSlot img, .qx-diagram-slot img, .qx-diagram-seg img, .mtk-q-text img.qx-pool-fig, .qx-prac-q img.qx-pool-fig, img.qx-pool-fig").forEach(queueFigLayout);
  }
  const BRAND_OVERLAY_IMG = "/assets/quantrex-academy-brand.png";
  const GETMARKS_POOL_RX = /cdn-question-pool\.getmarks\.app/i;
  const FIGURE_OVERRIDES_URL = "data/qx_figure_overrides.json";
  const PERM_MANIFEST_URL = "data/qx_perm_figure_manifest.json";
  /** IE Irodov + module book figures: CDN/broken → local clean PNGs */
  const IRODOV_FIG_MANIFEST_URL = "data/qx_irodov_figure_manifest.json";
  const MATCH_STEM_URL = "data/qx_match_stems.json";
  let _matchStemMap = null;
  let _matchStemLoading = null;

  function loadMatchStemIndex() {
    if (_matchStemMap) return Promise.resolve(_matchStemMap);
    if (_matchStemLoading) return _matchStemLoading;
    _matchStemLoading = fetch(MATCH_STEM_URL + "?v=qxstem6", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        _matchStemMap = (j && j.map) || {};
        return _matchStemMap;
      })
      .catch(() => {
        _matchStemMap = _matchStemMap || {};
        return _matchStemMap;
      })
      .finally(() => { _matchStemLoading = null; });
    return _matchStemLoading;
  }
  try { void loadMatchStemIndex(); } catch (_) { /* */ }

  function normalizeQidKey(k) {
    let s = String(k == null ? "" : k).trim();
    if (!s) return "";
    s = s.replace(/^(m_|board_|ncert_)/i, "");
    return s;
  }

  function matchTableRichness(html) {
    const s = String(html || "");
    let n = 0;
    n += (s.match(/<img\b/gi) || []).length * 80;
    if (/<table/i.test(s)) n += 40;
    if (/List[\s\-]*I/i.test(s)) n += 20;
    if (/List[\s\-]*II/i.test(s)) n += 20;
    n += Math.min(80, String(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length);
    return n;
  }

  function repairListDollarHeaders(html) {
    return String(html || "")
      .replace(/LIST\s*[-–]?\s*<math\b[^>]*>[\s\S]*?<\/math>/gi, (m) =>
        /II|2/i.test(m.replace(/<[^>]+>/g, "")) ? "List-II" : "List-I"
      )
      .replace(/LIST\s*[-–]?\s*II\s*\$/gi, "List-II")
      .replace(/LIST\s*[-–]?\s*I\s*\$/gi, "List-I")
      .replace(/List\s*[-–]?\s*II\s*\$/gi, "List-II")
      .replace(/List\s*[-–]?\s*I\s*\$/gi, "List-I")
      .replace(/LIST\s*[-–]?\s*II\s*,/gi, "List-II,")
      .replace(/LIST\s*[-–]?\s*I\s*,/gi, "List-I,");
  }

  function isGuttedMatchTable(html) {
    const s = String(html || "");
    if (!/List[\s\-]*I/i.test(s)) return false;
    const imgs = (s.match(/<img\b/gi) || []).length;
    if (/<table/i.test(s) && imgs < 2) return true;
    if (!/<table/i.test(s) && /LIST\s*[-–]?\s*II\s*\$/i.test(s)) return true;
    return false;
  }

  function matchStemRec(q, qid) {
    const map = _matchStemMap;
    if (!map) return null;
    const rawKeys = [qid, q && q.id, q && q._marksId, q && q._qxMarksId];
    const keys = [];
    rawKeys.forEach((k) => {
      if (k == null || k === "") return;
      const s = String(k);
      keys.push(s);
      const n = normalizeQidKey(s);
      if (n && n !== s) keys.push(n);
    });
    for (const k of keys) {
      const rec = map[k] || map[String(k)];
      if (rec && rec.q) return rec;
    }
    const blob = String((q && (q.q || q.questionText)) || "");
    const needle = blob.replace(/<[^>]+>/g, " ").replace(/LIST\s*[-–]?\s*II\s*\$/gi, "List-II")
      .replace(/\s+/g, " ").trim().slice(0, 48).toLowerCase();
    if (needle.length >= 28 && /list|match the/i.test(needle)) {
      for (const rec of Object.keys(map)) {
        const rq = map[rec] && map[rec].q;
        if (!rq) continue;
        const hay = String(rq).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
        if (hay.indexOf(needle.slice(0, 36)) >= 0) return map[rec];
      }
    }
    return null;
  }

  function matchStemHtml(q, qid) {
    const rec = matchStemRec(q, qid);
    return rec && rec.q ? rec.q : "";
  }

  function applyMatchStemToQuestion(q, qid) {
    if (!q) return q;
    const rec = matchStemRec(q, qid);
    if (!rec || !rec.q) return q;
    const recRich = matchTableRichness(rec.q);
    const curRich = matchTableRichness(q.q);
    if (recRich > curRich + 20 || isGuttedMatchTable(q.q) || (!isMatchListOrTableFigureHtml(q.q) && isMatchListOrTableFigureHtml(rec.q))) {
      q.q = rec.q;
      q._qxBankQ = rec.q;
      q._qxOrigStem = rec.q;
    }
    const opts = rec.o || rec.options;
    if (opts && opts.length) {
      const cur = q.options || [];
      const curTxt = cur.join("\0");
      const recTxt = opts.join("\0");
      const curThin = !cur.length || cur.every((o) => {
        const t = String(o || "").replace(/<[^>]+>/g, " ").trim();
        return !t || /^[A-D]$/i.test(t) || (t.split(/[;|]/).length < 3 && /P\s*[→\-]/.test(t));
      });
      if (curThin || recTxt.length > curTxt.length + 12) {
        q.options = opts.slice();
        q._qxBankOptions = opts.slice();
        q._qxOrigOptions = opts.slice();
      }
    }
    if (q.answer == null && rec.a != null) q.answer = rec.a;
    if (!q.answers && rec.as) q.answers = rec.as;
    q._columnMatch = true;
    q._matchList = true;
    return q;
  }
  // Always-on book figure maps (loaded before JSON / if overrides lag)
  const FIGURE_OVERRIDE_FALLBACK = [
    {
      urlRx: "chapter_38_electromagnetic_induction_figure_38_e3\\.png",
      clean: "/assets/diagrams/hcv-v2-em-induction-ex23-24-two-boys-rhombus.png"
    },
    {
      urlRx: "hcv-v2-em-induction-e3\\.png",
      clean: "/assets/diagrams/hcv-v2-em-induction-ex23-24-two-boys-rhombus.png"
    }
  ];

  /** url → /assets/diagrams/…  (Irodov + future book manifests) */
  let bookFigureMap = null;
  let bookFigureMapLoading = null;
  const bookFigureReverse = new Map();

  function putBookFigureMapEntry(from, to) {
    if (!bookFigureMap || !from || !to) return;
    const clean = normalizeAssetSrc(String(to).split("?")[0]) || String(to);
    const keys = new Set();
    keys.add(fixUrl(from));
    keys.add(String(from).split("?")[0]);
    const base = String(from).split("?")[0].split("/").pop();
    if (base) keys.add(base);
    // Also map fixed CDN host variants
    const fixed = fixUrl(from);
    keys.add(fixed);
    keys.add(fixed.split("?")[0]);
    keys.forEach(k => {
      if (k) bookFigureMap.set(k, clean);
    });
    if (/AKCR2_|2026_modules\/jee_advanced_physics|irodov/i.test(String(from))) {
      const localKey = String(clean).split("?")[0];
      if (localKey && fixed) bookFigureReverse.set(localKey, fixed.split("?")[0]);
    }
  }

  async function loadBookFigureMaps() {
    if (bookFigureMap) return bookFigureMap;
    if (bookFigureMapLoading) return bookFigureMapLoading;
    bookFigureMapLoading = (async () => {
      bookFigureMap = new Map();
      try {
        const bust = (typeof window !== "undefined" && window.QX_BUILD) || "irodov3";
        const r = await fetch(IRODOV_FIG_MANIFEST_URL + "?v=" + bust, { cache: "force-cache" });
        if (r.ok) {
          const j = await r.json();
          const m = (j && j.map) || j || {};
          Object.keys(m).forEach(k => putBookFigureMapEntry(k, m[k]));
        }
      } catch (_) { /* */ }
      try {
        const ro = await fetch("data/qx_organic_figure_manifest.json?v=" + bust, { cache: "force-cache" });
        if (ro.ok) {
          const jo = await ro.json();
          const mo = (jo && jo.map) || {};
          Object.keys(mo).forEach(k => putBookFigureMapEntry(k, mo[k]));
        }
      } catch (_) { /* */ }
      return bookFigureMap;
    })();
    try { return await bookFigureMapLoading; }
    finally { bookFigureMapLoading = null; }
  }
  // Kick off early so first Irodov/PYQ paint can hit local figures
  try { void loadBookFigureMaps(); } catch (_) { /* */ }

  let _irodovStemIndex = window._qxIrodovStemIndex || null;
  function loadIrodovStemIndex() {
    if (!_irodovStemIndex && window._qxIrodovStemIndex && typeof window._qxIrodovStemIndex === "object") {
      _irodovStemIndex = window._qxIrodovStemIndex;
    }
    if (_irodovStemIndex) {
      window._qxIrodovStemIndex = _irodovStemIndex;
      return;
    }
    fetch("data/qx_irodov_stem_index.json?v=qxiro1", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        _irodovStemIndex = (j && j.map) || {};
        window._qxIrodovStemIndex = _irodovStemIndex;
        try {
          if (window.QxSoftWm && typeof QxSoftWm.schedule === "function") QxSoftWm.schedule(20);
        } catch (_) { /* */ }
      })
      .catch(() => { _irodovStemIndex = _irodovStemIndex || {}; });
  }
  try { loadIrodovStemIndex(); } catch (_) { /* */ }

  function isIrodovQuestion(q) {
    if (!q) return false;
    if (q._irodov || q._marksNativeBook) {
      if (String(q._book || q._bookId || "") === "69cfb5366ecf5579037d96a4") return true;
    }
    if (String(q._book || q._bookId || "") === "69cfb5366ecf5579037d96a4") return true;
    if (/irodov/i.test(String(q.source || q._source || ""))) return true;
    const blob = String(q._qxBankQ || q.q || "");
    return /AKCR2_|2026_modules\/jee_advanced_physics/i.test(blob);
  }

  function isIrodovSrc(s) {
    const t = String(s || "");
    if (/irodov|AKCR2_|2026_modules\/jee_advanced_physics|qx-irodov-/i.test(t)) return true;
    if (/qx-book-[a-f0-9]+/i.test(t) && typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.irodovStorageUrl) {
      return !!QxOwnedFigs.irodovStorageUrl(t);
    }
    return false;
  }

  function extractProxiedUrl(u) {
    const s = String(u || "");
    if (!/proxy-image|restore-image/i.test(s)) return "";
    try {
      const inner = new URL(s, "https://www.quantrexacademy.com").searchParams.get("url");
      return inner ? fixUrl(inner) : "";
    } catch (_) {
      const m = s.match(/[?&]url=([^&\s]+)/);
      if (!m) return "";
      try { return fixUrl(decodeURIComponent(m[1])); } catch (e) { return fixUrl(m[1]); }
    }
  }

  function qxFigFirebaseUrl(filename, folder) {
    const base = String(filename || "").split("?")[0].split("/").pop();
    if (!base) return "";
    const p = "questions/figs/" + folder + "/" + base;
    return "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/"
      + encodeURIComponent(p) + "?alt=media";
  }

  function irodovLocalSrc(url) {
    const fixed = fixUrl(url || "");
    if (!fixed) return "";
    let mapped = "";
    if (/\/assets\/diagrams\/qx-irodov-/i.test(fixed)) mapped = fixed.split("?")[0];
    try {
      if (!mapped && bookFigureMap && bookFigureMap.size) {
        if (bookFigureMap.has(fixed)) mapped = bookFigureMap.get(fixed) || "";
        const noQ = fixed.split("?")[0];
        if (!mapped && bookFigureMap.has(noQ)) mapped = bookFigureMap.get(noQ) || "";
        const base = noQ.split("/").pop();
        if (!mapped && base && bookFigureMap.has(base)) mapped = bookFigureMap.get(base) || "";
      }
    } catch (_) { /* */ }
    const file = (mapped || fixed).split("?")[0].split("/").pop();
    if (/^qx-irodov-/i.test(file)) return qxFigFirebaseUrl(file, "irodov") || mapped;
    return mapped;
  }

  function firebaseToMarksCdn(url) {
    const raw = fixUrl(url || "");
    if (!/firebasestorage/i.test(raw)) return "";
    try {
      const u = new URL(raw, "https://www.quantrexacademy.com");
      const parts = u.pathname.split("/o/");
      if (parts.length < 2) return "";
      let p = decodeURIComponent(parts[1].replace(/^\/+/, ""));
      p = p.replace(/^questions\/figs\//, "");
      if (/^quizrr\//i.test(p)) return "https://cdn.quizrr.in/" + p.replace(/^quizrr\//i, "");
      if (/^(pyq|nta_abhyas|2026_modules)\//i.test(p)) return PYQ_CDN + p;
    } catch (_) { /* */ }
    return "";
  }

  function irodovCdnFromAny(url) {
    let u = fixUrl(url || "");
    if (!u) return "";
    const fromProxy = extractProxiedUrl(u);
    if (fromProxy) u = fromProxy;
    if (/\/assets\/diagrams\/qx-irodov-/i.test(u)) {
      const key = u.split("?")[0];
      u = bookFigureReverse.get(key) || "";
    }
    if (/AKCR2_|2026_modules\/jee_advanced_physics/i.test(u)) {
      if (/^https?:\/\/\.app\//i.test(u)) u = fixUrl(u);
      return u.split("?")[0];
    }
    return "";
  }

  function irodovStemCdn(q) {
    const idx = _irodovStemIndex || window._qxIrodovStemIndex;
    if (q && idx) {
      const rec = idx[String(q.id)] || (q._marksId ? idx[String(q._marksId)] : null);
      if (rec && rec.s) return fixUrl(rec.s);
    }
    const raw = String((q && (q._qxBankQ || q.q)) || "");
    const m = raw.match(/\bsrc=["']([^"']+)["']/i);
    if (m && /AKCR2_|2026_modules/i.test(m[1])) {
      let u = fixUrl(m[1]);
      if (/proxy-image/i.test(u)) {
        try {
          const inner = new URL(u, "https://www.quantrexacademy.com").searchParams.get("url");
          if (inner) u = decodeURIComponent(inner);
        } catch (_) { /* */ }
      }
      return u.split("?")[0];
    }
    return "";
  }

  function irodovStemHtml(q) {
    const cdn = irodovStemCdn(q);
    if (!cdn) return "";
    const proxy = proxyImageUrl(cdn) || cdn;
    const safeP = String(proxy).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    const safeO = String(cdn).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    return `<img class="qx-pool-fig qx-fig-img qx-no-wm qx-irodov-stem" src="${safeP}" data-qx-orig-src="${safeO}" alt="" loading="eager" decoding="async" fetchpriority="high" style="max-width:min(100%,720px);height:auto;min-height:140px;display:block;margin:8px auto;object-fit:contain;background:#fff;content-visibility:visible">`;
  }

  function ensureIrodovStem(q) {
    if (!q || !isIrodovQuestion(q)) return q;
    const html = irodovStemHtml(q);
    if (!html) return q;
    const cur = String(q.q || "");
    const hasReal = /AKCR2_|2026_modules\/jee_advanced_physics|qx-irodov-|questions(?:%2F|\/)figs(?:%2F|\/)irodov/i.test(cur);
    const localMiss = /\/assets\/diagrams\/qx-book-/i.test(cur);
    const stub = !/<img\b/i.test(cur) || localMiss
      || /\b(?:alt|title)\s*=\s*["'][^"']*\b(?:figure|fig\.?)\b/i.test(cur)
      || /^(figure|fig\.?|diagram)$/i.test(cur.replace(/<img\b[^>]*>/gi, " ").replace(/<[^>]+>/g, " ").trim());
    if (!hasReal || stub) q.q = html;
    if (!q._qxBankQ || !/AKCR2_|2026_modules/i.test(String(q._qxBankQ))) q._qxBankQ = html;
    return q;
  }

  /** Sync URL → local colored/clean asset (uses loaded overrides + Irodov map + fallback) */
  function resolveLocalFigureSrcSync(url) {
    const fixed = fixUrl(String(url || ""));
    if (!fixed) return null;
    // Irodov: prefer permanently wiped local PNGs. Proxy only if local missing.
    if (isIrodovSrc(fixed)) {
      if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.irodovStorageUrl) {
        const fb = QxOwnedFigs.irodovStorageUrl(fixed);
        if (fb) return fb;
      }
      const local = irodovLocalSrc(fixed);
      if (local && /firebasestorage/i.test(local)) return local;
      if (local && /^qx-irodov-/i.test(String(local).split("/").pop() || "")) {
        return qxFigFirebaseUrl(String(local).split("/").pop(), "irodov");
      }
      return local || null;
    }
    if (isLocalCleanAsset(fixed) && /ex23-24-two-boys-rhombus|hcv-v2-em-induction-e[0-9]+/i.test(fixed)) {
      return normalizeAssetSrc(fixed);
    }
    // Local book diagrams already on disk — never remap / never throw (HCV Vol 2).
    if (/\/assets\/diagrams\/(?:qx-(?:book|self|org)-|hcv-)/i.test(fixed)) {
      return normalizeAssetSrc(fixed);
    }
    // Other book figure manifest (local clean PNGs). Irodov already returned above.
    if (bookFigureMap && bookFigureMap.size) {
      try {
        if (bookFigureMap.has(fixed)) return bookFigureMap.get(fixed);
        const noQ = fixed.split("?")[0];
        if (bookFigureMap.has(noQ)) return bookFigureMap.get(noQ);
        const base = noQ.split("/").pop();
        if (base && bookFigureMap.has(base)) return bookFigureMap.get(base);
      } catch (_) { /* keep original src */ }
    }
    const rules = [...(figureOverrides && figureOverrides.rules ? figureOverrides.rules : []), ...FIGURE_OVERRIDE_FALLBACK];
    for (const rule of rules) {
      if (!rule) continue;
      if (rule.url && (rule.url === fixed || rule.url === url)) return normalizeAssetSrc(rule.clean);
      if (rule.urlRx) {
        try {
          if (new RegExp(rule.urlRx, "i").test(fixed)) return normalizeAssetSrc(rule.clean);
        } catch (_) { /* */ }
      }
    }
    return null;
  }

  /** Rewrite CDN / broken hosts → local clean diagrams (Irodov, HCV, …) */
  function rewriteBookFigureHtml(html) {
    let out = String(html || "");
    // Never expand broken Marks hosts to getmarks.app.
    out = out.replace(/\bsrc=(["'])([^"']+)\1/gi, (m, q, src) => {
      try {
        const fixed = fixUrl(src);
        const iro = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.irodovStorageUrl)
          ? (QxOwnedFigs.irodovStorageUrl(fixed) || QxOwnedFigs.irodovStorageUrl(src))
          : (isIrodovSrc(fixed) ? (irodovLocalSrc(fixed) || irodovLocalSrc(src)) : "");
        if (iro) {
          return "src=" + q + iro + q + " class=\"qx-irodov-stem qx-no-wm qx-pool-fig\" data-qx-orig-src=" + q + iro + q;
        }
        if (/\/assets\/diagrams\/(?:qx-(?:book|self|org)-|hcv-)/i.test(fixed) && !/qx-irodov-/i.test(fixed)) {
          return m;
        }
        const local = resolveLocalFigureSrcSync(fixed) || resolveLocalFigureSrcSync(src);
        if (local && local !== src) {
          return `src=${q}${local}${q} data-qx-orig-src=${q}${fixed || src}${q}`;
        }
        // Pool / Quizrr leftovers → Quantrex Storage (never paint Marks CDN)
        if (/cdn-question-pool|cdn\.quizrr|\/pyq\/|watermarked_images|getmarks\.app|organic_book/i.test(fixed)
          && !/qx-org-/i.test(fixed)
          && !/\/api\/proxy-image/i.test(fixed)) {
          const disp = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc)
            ? QxOwnedFigs.displaySrc(fixed)
            : (typeof proxyImageUrl === "function" ? proxyImageUrl(fixed) : "");
          if (disp) {
            const stored = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.ownedFigureUrl)
              ? (QxOwnedFigs.ownedFigureUrl(fixed) || fixed)
              : fixed;
            return `src=${q}${disp}${q} data-qx-orig-src=${q}${fixed}${q} data-qx-storage-src=${q}${stored}${q}`;
          }
        }
        if (fixed && fixed !== src) return `src=${q}${fixed}${q}`;
      } catch (_) { /* never abort the stem rewrite — that blanked HCV figures */ }
      return m;
    });
    return out;
  }

  /** All questions (PYQ + books): rewrite figures in HTML string before paint */
  function rewriteHtmlFigures(html) {
    return rewriteBookFigureHtml(html);
  }
  const LOCAL_CLEAN_RX = /^\.?\/?assets\/(diagrams|clean-diagrams|qx-figures)\//i;

  const PERM_FIG_RX = /\/assets\/qx-figures\/perm\/qx-perm-[a-f0-9]+\.png/i;
  let permFigureMap = null;
  const ORG_SRC_RX = /\/assets\/diagrams\/org-src\//i;
  const QX_ORG_RX = /\/assets\/diagrams\/qx-org-[a-f0-9]+\.png/i;
  // Render like Marks web: preserve native HTML + inline diagrams
  const MARKS_NATIVE_BOOKS = new Set([
    "68f1ce4cc729e5251bd00430", // Rank Booster
    "69cfb5366ecf5579037d96a4",
    "6a4ce383c59a7b462185330f", // Fundamentals of Organic Chemistry
    "69736c8362b916d85e52cd1b", // BITSAT English & Logical Reasoning
    "a1b2c3d4e5f6010203040508", // Black Book — Advanced Problems in Mathematics
  ]);

  function isMarksNativeBook(q) {
    if (!q) return false;
    // All digital books: keep original HTML flow (text + figures tight).
    // Do NOT extract figures into oversized diagram cards (user: too much space).
    if (q._book || q._bookId) return true;
    const bid = q._book || q._bookId;
    return MARKS_NATIVE_BOOKS.has(String(bid));
  }

  let manifest = null;
  let reviewSet = null;
  let figureOverrides = null;
  let dbPromise = null;

  function fixUrl(url) {
    return String(url || "").replace(BROKEN_CDN_RX, PYQ_CDN);
  }

  function isPoolDiagram(src, el) {
    const s = fixUrl(src);
    if (!s || s.startsWith("data:")) return false;
    if (s.startsWith("blob:")) return !!(el && el.dataset && el.dataset.qxOrigSrc);
    // Quizrr chemistry structure packs
    if (/watermarked_images|cdn\.quizrr\.in/i.test(s)) return true;
    if (SKIP_RX.test(s)) return false;
    if (CARD_ART_RX.test(s)) return false;
    if (el && (el.classList.contains("qx-marks-icon") || el.classList.contains("fc-img"))) return false;
    if (isLocalCleanAsset(s)) return true;
    return POOL_RX.test(s);
  }

  function poolCdnSrc(img) {
    const origRaw = fixUrl(img.dataset.qxOrigSrc || "");
    const orig = canonicalCdnSrc(origRaw) || (origRaw && POOL_RX.test(origRaw) && !SKIP_RX.test(origRaw) ? origRaw : "");
    if (orig) return orig;
    const cur = fixUrl(img.getAttribute("src") || "");
    const canon = canonicalCdnSrc(cur);
    if (canon) return canon;
    if (cur && !cur.startsWith("blob:") && !cur.includes("clean-diagrams") && !isLocalCleanAsset(cur) && !isApiFigureSrc(cur)) return cur;
    return origRaw || cur;
  }

  function hashUrl(url) {
    const s = fixUrl(url);
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
    return (h >>> 0).toString(16);
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      if (!window.indexedDB) return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    }).catch(() => null);
    return dbPromise;
  }

  async function getCachedBlob(url) {
    const db = await openDb();
    if (!db) return null;
    const key = hashUrl(url) + ":v" + CLEAN_VER;
    return new Promise(resolve => {
      const tx = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  async function putCachedBlob(url, blob) {
    const db = await openDb();
    if (!db) return;
    const key = hashUrl(url) + ":v" + CLEAN_VER;
    return new Promise(resolve => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  async function loadManifest() {
    if (manifest) return manifest;
    try {
      const r = await fetch(MANIFEST_URL);
      if (r.ok) manifest = await r.json();
      else manifest = { map: {}, version: 1 };
    } catch (_) {
      manifest = { map: {}, version: 1 };
    }
    return manifest;
  }

  function isManifestCleanPath(manifestRel, cdnSrc) {
    if (!manifestRel || manifestRel.startsWith("http")) return false;
    const fixed = fixUrl(cdnSrc || "");
    return manifestRel !== fixed && manifestRel !== cdnSrc;
  }

  async function manifestAssetsAvailable() {
    if (_manifestAssetsAvailable !== null) return _manifestAssetsAvailable;
    try {
      const r = await fetch("/assets/clean-diagrams/08/1d/081d55c5d82314ae.png", { method: "HEAD" });
      _manifestAssetsAvailable = r.ok;
    } catch (_) {
      _manifestAssetsAvailable = false;
    }
    return _manifestAssetsAvailable;
  }

  async function manifestFileExists(path) {
    if (!path || path.startsWith("http")) return false;
    if (!(await manifestAssetsAvailable())) return false;
    if (_manifestExistsCache.has(path)) return _manifestExistsCache.get(path);
    const url = path.startsWith("/") ? path : "/" + path;
    try {
      const r = await fetch(url, { method: "HEAD" });
      const ok = r.ok;
      _manifestExistsCache.set(path, ok);
      return ok;
    } catch (_) {
      _manifestExistsCache.set(path, false);
      return false;
    }
  }

  async function loadReview() {
    if (reviewSet) return reviewSet;
    try {
      const r = await fetch(REVIEW_URL, { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        reviewSet = new Set((j.flagged || []).map(fixUrl));
      } else reviewSet = new Set();
    } catch (_) {
      reviewSet = new Set();
    }
    return reviewSet;
  }

  async function loadFigureOverrides() {
    if (figureOverrides) return figureOverrides;
    try {
      const r = await fetch(FIGURE_OVERRIDES_URL, { cache: "no-store" });
      if (r.ok) figureOverrides = await r.json();
      else figureOverrides = { version: 1, rules: [] };
    } catch (_) {
      figureOverrides = { version: 1, rules: [] };
    }
    return figureOverrides;
  }

  /** Permanent clean local figures (no Marks CDN / no watermark forever) */
  async function loadPermFigureMap() {
    if (permFigureMap) return permFigureMap;
    permFigureMap = new Map();
    try {
      const bust = (typeof window !== "undefined" && window.QX_BUILD) || "1";
      const r = await fetch(PERM_MANIFEST_URL + "?v=" + bust, { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        (j.figures || []).forEach((f) => {
          if (f && f.url && f.clean) {
            permFigureMap.set(fixUrl(f.url), f.clean);
            // basename key for partial matches
            const base = String(f.url).split("?")[0].split("/").pop();
            if (base) permFigureMap.set(base, f.clean);
          }
        });
      }
    } catch (_) { /* */ }
    return permFigureMap;
  }

  /**
   * Permanent local "clean" map DISABLED.
   * Many /assets/qx-figures/perm/*.png are solid teal/green blocks from a bad
   * recolor pass — they hide the real structure (screenshot 676 option D).
   * Always use same-origin proxy clean instead.
   */
  function permCleanSrc(_cdnSrc) {
    return "";
  }

  function normalizeAssetSrc(src) {
    const s = String(src || "").trim();
    if (!s) return s;
    if (LOCAL_CLEAN_RX.test(s)) {
      let path = s.startsWith("/") ? s : "/" + s;
      const q = path.indexOf("?");
      const base = q >= 0 ? path.slice(0, q) : path;
      const build = (typeof window !== "undefined" && window.QX_BUILD) || "1";
      return `${base}?v=${build}`;
    }
    return s;
  }

  function isLocalCleanAsset(src) {
    return LOCAL_CLEAN_RX.test(String(src || ""));
  }

  function isPreprocessedQxOrg(src) {
    return QX_ORG_RX.test(String(src || ""));
  }

  function isOrganicOrgSrc(src) {
    return ORG_SRC_RX.test(String(src || "")) && !isPreprocessedQxOrg(src);
  }

  function isOrganicFigure(src) {
    return isPreprocessedQxOrg(src) || isOrganicOrgSrc(src);
  }

  function isLocalReadyAsset(src) {
    if (isPreprocessedQxOrg(src)) return true;
    return isLocalCleanAsset(src) && !isOrganicOrgSrc(src);
  }

  function finalizeQxOrgDisplay(img) {
    if (!img || !img.isConnected) return;
    restoreOrganicFigureSize(img);
    markDisplayClean(img);
    revealOrganicClean(img);
  }

  function parseImgDisplayWidth(attrs) {
    const s = String(attrs || "");
    const dw = s.match(/\bdata-qx-display-w=["'](\d+)["']/i);
    if (dw) return parseInt(dw[1], 10) || 0;
    const style = s.match(/\bstyle=["']([^"']*)["']/i);
    if (style) {
      const wm = style[1].match(/width:\s*(\d+)\s*px/i);
      if (wm) return parseInt(wm[1], 10) || 0;
    }
    return 0;
  }

  function captureOrganicDisplayWidth(img) {
    if (!img) return 0;
    const stored = parseInt(img.dataset.qxDisplayW || "", 10);
    if (stored > 12) return stored;
    const fromStyle = parseImgDisplayWidth(img.getAttribute("style") || "");
    if (fromStyle > 12) {
      img.dataset.qxDisplayW = String(fromStyle);
      return fromStyle;
    }
    return 0;
  }

  const ORGANIC_DEFAULT_FIG_W = 300;

  function isBookFigureContext(img) {
    if (!img) return false;
    if (img.closest(".qx-marks-native, .qx-marks-native-q, .qx-marks-native-opt, .qx-book-q, .mtk-test-root.qx-book-q")) return true;
    if (typeof document !== "undefined" && document.body && document.body.classList.contains("qx-book-mode")) return true;
    return false;
  }

  function restoreOrganicFigureSize(img) {
    if (!img) return;
    img.classList.add("qx-organic-fig");
    // Digital books: never reserve huge min-height or force 680px width
    if (isBookFigureContext(img) || isBookOrLocalFigure(img.getAttribute("src") || img.dataset.qxOrigSrc || "")) {
      let tw = captureOrganicDisplayWidth(img);
      const nw = img.naturalWidth || 0;
      if (!tw && nw > 0) tw = Math.min(nw, 360);
      if (!tw) tw = ORGANIC_DEFAULT_FIG_W;
      tw = Math.min(tw, 380);
      img.dataset.qxDisplayW = String(tw);
      img.style.setProperty("width", "auto", "important");
      img.style.setProperty("max-width", "min(100%, " + tw + "px)", "important");
      img.style.setProperty("height", "auto", "important");
      img.style.setProperty("min-height", "0", "important");
      img.style.setProperty("display", "inline-block", "important");
      img.style.setProperty("margin", "4px 0", "important");
      img.style.removeProperty("min-width");
      return;
    }
    let targetW = captureOrganicDisplayWidth(img);
    const nw = img.naturalWidth || 0;
    const nh = img.naturalHeight || 0;
    if (!targetW && nw > 0) targetW = Math.min(nw, 680);
    if (!targetW) targetW = ORGANIC_DEFAULT_FIG_W;
    const px = `${targetW}px`;
    const stack = img.closest(".qx-fig-inner");
    const fig = img.closest(".qx-fig, .qx-opt-fig");
    const slot = img.closest("#qxDiagramSlot, .qx-diagram-slot");
    img.dataset.qxDisplayW = String(targetW);
    img.style.setProperty("--qx-fig-w", px);
    img.style.setProperty("width", px, "important");
    img.style.setProperty("max-width", "100%", "important");
    img.style.setProperty("height", "auto", "important");
    img.style.setProperty("display", "block", "important");
    img.style.setProperty("visibility", "visible", "important");
    img.style.setProperty("opacity", "1", "important");
    if (nw > 0 && nh > 0) {
      img.style.setProperty("min-height", `${Math.max(48, Math.round(targetW * nh / nw))}px`, "important");
    }
    if (stack) {
      stack.style.setProperty("--qx-fig-w", px);
      stack.style.setProperty("width", px, "important");
      stack.style.setProperty("max-width", "100%", "important");
      stack.style.setProperty("min-width", px, "important");
      stack.style.removeProperty("height");
      stack.style.removeProperty("max-height");
    }
    if (fig) {
      fig.style.setProperty("--qx-fig-w", px);
      fig.style.setProperty("max-width", "100%", "important");
      fig.style.setProperty("width", px, "important");
    }
    if (slot) {
      slot.style.setProperty("max-width", "100%", "important");
      slot.style.setProperty("width", "100%", "important");
    }
  }

  function hideOrganicPending(img) {
    if (!img) return;
    captureOrganicDisplayWidth(img);
    img.classList.add("qx-wm-loading", "qx-org-pending");
    img.classList.remove("qx-fig-ready", "qx-cleaned", "qx-restored");
    const fig = img.closest(".qx-fig, .qx-opt-fig, .qx-fig-inner");
    if (fig) fig.classList.remove("qx-fig-ready");
    /* Keep colorful organic figures visible — never blank to a 1x1 gif. */
  }

  function revealOrganicClean(img) {
    if (!img) return;
    img.classList.remove("qx-wm-loading", "qx-org-pending", "qx-wm-pending");
    img.classList.add("qx-fig-ready");
    img.style.removeProperty("visibility");
    img.style.removeProperty("opacity");
    const fig = img.closest(".qx-fig, .qx-opt-fig");
    if (fig) {
      fig.classList.remove("qx-wm-pending-wrap");
      fig.classList.add("qx-fig-ready");
    }
    revealFigure(img);
  }

  function cleanOrganicOrgImageData(data, w, h) {
    const total = w * h;
    let sumL = 0;
    for (let i = 0; i < total; i++) {
      const pi = i * 4;
      sumL += (data[pi] + data[pi + 1] + data[pi + 2]) / 3;
    }
    if (sumL / total < 130) {
      for (let i = 0; i < total; i++) {
        const pi = i * 4;
        data[pi] = 255 - data[pi];
        data[pi + 1] = 255 - data[pi + 1];
        data[pi + 2] = 255 - data[pi + 2];
      }
    }
    const beforeInk = countInk(data, w, h);
    let removed = 0;
    const lumAt = (x, y) => {
      const pi = (y * w + x) * 4;
      return (data[pi] + data[pi + 1] + data[pi + 2]) / 3;
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const pi = (y * w + x) * 4;
        const r = data[pi];
        const g = data[pi + 1];
        const b = data[pi + 2];
        const L = (r + g + b) / 3;
        const C = Math.max(r, g, b) - Math.min(r, g, b);
        if (b > r + 18 && b > g + 10 && L > 120 && L < 230) {
          data[pi] = data[pi + 1] = data[pi + 2] = 255;
          removed++;
        } else if (L > 110 && L < 200 && C < 28 && C > 4) {
          data[pi] = data[pi + 1] = data[pi + 2] = 255;
          removed++;
        }
      }
    }
    const rowFrac = new Float32Array(h);
    for (let y = 0; y < h; y++) {
      let dark = 0;
      for (let x = 0; x < w; x++) if (lumAt(x, y) < 38) dark++;
      rowFrac[y] = dark / w;
    }
    const barRows = new Uint8Array(h);
    let runStart = null;
    for (let y = 0; y < h; y++) {
      if (rowFrac[y] >= 0.92) {
        if (runStart === null) runStart = y;
      } else if (runStart !== null) {
        if (y - runStart >= 6) barRows.fill(1, runStart, y);
        runStart = null;
      }
    }
    if (runStart !== null && h - runStart >= 6) barRows.fill(1, runStart, h);
    for (let y = 0; y < h; y++) {
      if (!barRows[y]) continue;
      for (let x = 0; x < w; x++) {
        if (lumAt(x, y) < 50) {
          const pi = (y * w + x) * 4;
          data[pi] = data[pi + 1] = data[pi + 2] = 255;
          removed++;
        }
      }
    }
    const afterInk = countInk(data, w, h);
    return {
      removed,
      removedRatio: removed / Math.max(total, 1),
      improved: removed > 0,
      cleanEnough: true,
      damaged: afterInk < Math.max(30, beforeInk * 0.25),
      residueRatio: 0,
      beforeInk,
      afterInk
    };
  }

  function normalizeMatchText(s) {
    return String(s || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&amp;|&Omega;|&#\d+;/gi, " ")
      .replace(/[₁₂₃₄₅₆₇₈₉₀]/g, ch => ({ "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "₀": "0" }[ch] || ch))
      .replace(/(\b[pq])\s+(\d)\b/gi, "$1$2")
      .replace(/\bomega\b/gi, "ω")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function collectQuestionHtml(rawHtml, qid) {
    const parts = [String(rawHtml || "")];
    if (qid != null && window._qxDiagramRaw && window._qxDiagramRaw[String(qid)]) {
      parts.push(window._qxDiagramRaw[String(qid)]);
    }
    return parts.join(" ");
  }

  function getFigureOverrideSrc(rawHtml, qid) {
    const norm = normalizeMatchText(collectQuestionHtml(rawHtml, qid));
    if (!norm) return null;
    const rules = [
      ...(figureOverrides && figureOverrides.rules ? figureOverrides.rules : []),
      ...FIGURE_OVERRIDE_FALLBACK
    ];
    for (const rule of rules) {
      if (!rule) continue;
      if (rule.match && norm.includes(normalizeMatchText(rule.match))) return normalizeAssetSrc(rule.clean);
      if (rule.matchRx) {
        try {
          if (new RegExp(rule.matchRx, "i").test(norm)) return normalizeAssetSrc(rule.clean);
        } catch (_) {}
      }
      if (rule.matchAny && Array.isArray(rule.matchAny)) {
        const hits = rule.matchAny.filter(m => norm.includes(normalizeMatchText(m))).length;
        if (rule.matchMin ? hits >= rule.matchMin : hits >= (rule.matchAny.length >= 2 ? 2 : 1)) {
          return normalizeAssetSrc(rule.clean);
        }
      }
    }
    return null;
  }

  function questionImageSrc(q) {
    if (!q) return null;
    const raw = q._questionImage || q.questionImage || q.questionFigure
      || q.imageUrl || q.image || q.figureUrl || q.figure
      || q.diagramUrl || q.diagram || null;
    if (!raw) return null;
    const cdn = fixUrl(typeof raw === "string" ? raw : (raw.url || raw.src || raw.href || ""));
    if (!cdn) return null;
    if (isPoolDiagram(cdn) || /2026_modules|AKCR2_|modules\/ms\/|getmarks\.app|quizrr/i.test(cdn)) {
      return normalizeAssetSrc(cdn) || cdn;
    }
    return null;
  }

  function extractDiagramEntries(html) {
    const entries = [];
    const s = String(html || "");
    const imgRx = /<img\b([^>]*)>/gi;
    let m;
    while ((m = imgRx.exec(s)) !== null) {
      const attrs = m[1];
      const origM = attrs.match(/\bdata-qx-orig-src=["']([^"']+)["']/i);
      const srcM = attrs.match(/\bsrc=["']([^"']+)["']/i);
      let raw = origM ? origM[1] : (srcM ? srcM[1] : "");
      raw = fixUrl(raw);
      if (!raw || raw.startsWith("data:image/gif")) continue;
      // Unwrap proxy so we store the real CDN path once
      if (isApiFigureSrc(raw)) {
        const unwrapped = canonicalCdnSrc(raw);
        if (unwrapped) raw = unwrapped;
        else continue;
      }
      let src = "";
      if (isLocalCleanAsset(raw)) src = normalizeAssetSrc(raw);
      else {
        const cdn = canonicalCdnSrc(raw);
        if (cdn) src = cdn;
        else if (POOL_RX.test(raw) || /^https?:\/\//i.test(raw)) src = raw;
      }
      if (!src || (!isPoolDiagram(src) && !isLocalCleanAsset(src) && !/^https?:\/\//i.test(src))) continue;
      const displayW = parseImgDisplayWidth(attrs);
      const key = figureSrcKey(src);
      // Dedupe by basename (proxy + CDN + query variants = one figure)
      if (key && entries.some(e => figureSrcKey(e.src) === key)) continue;
      if (entries.some(e => e.src === src)) continue;
      entries.push({ src, displayW });
    }
    return entries;
  }

  /** Option A/B/C/D: exactly one structure figure (never stack duplicates). */
  function resolveOptionEntries(rawHtml, key) {
    const entries = resolveDiagramEntries(rawHtml, key);
    const unique = [];
    const seen = new Set();
    entries.forEach(e => {
      const k = figureSrcKey(e.src);
      if (!k || seen.has(k)) return;
      seen.add(k);
      unique.push(e);
    });
    if (!unique.length) {
      extractPoolSrcs(rawHtml).forEach(src => {
        const k = figureSrcKey(src);
        if (!k || seen.has(k)) return;
        seen.add(k);
        unique.push({ src, displayW: 0 });
      });
    }
    if (!unique.length) {
      const spilled = recoverSpilledPoolUrl(rawHtml);
      if (spilled) unique.push({ src: spilled, displayW: 0 });
    }
    // Hard cap: one figure per option (fixes stacked twin structures)
    return unique.slice(0, 1);
  }

  function resolveDiagramEntries(rawHtml, qid, q) {
    const override = getFigureOverrideSrc(rawHtml, qid);
    if (override) return [{ src: override, displayW: 0 }];
    const entries = extractDiagramEntries(rawHtml);
    if (!entries.length) {
      const qSrc = questionImageSrc(q);
      if (qSrc) entries.push({ src: qSrc, displayW: 0 });
    }
    return entries;
  }

  function resolveDiagramSrcs(rawHtml, qid, q) {
    return resolveDiagramEntries(rawHtml, qid, q).map(e => e.src);
  }

  function applyLocalCleanFigure(img, src, qid) {
    if (!img || !src) return false;
    const clean = normalizeAssetSrc(src);
    if (!isLocalReadyAsset(clean)) return false;
    if (!img.closest(".qx-fig, .qx-opt-fig")) ensureDiagramWrap(img);
    overlayTargetForImg(img);
    img.setAttribute("src", clean);
    img.dataset.qxOrigSrc = clean;
    img.dataset.qxHasWm = "0";
    img.dataset.qxCleaned = "1";
    img.dataset.qxPinned = "1";
    if (qid != null) img.dataset.qxQid = String(qid);
    img.classList.add("qx-cleaned", "qx-restored", "qx-wm-clean", "qx-no-wm", "qx-pool-fig", "qx-fig-img");
    img.classList.remove("qx-wm-fallback", "qx-wm-pending");
    removeCanvasShield(img);
    const target = overlayTargetForImg(img);
    if (target) stripBrandOverlay(target);
    const fig = img.closest(".qx-fig, .qx-opt-fig");
    if (fig) fig.classList.remove("qx-wm-active");
    return true;
  }

  function trySwapFigureOverride(img) {
    return false;
  }

  async function cleanUrl(url) {
    const fixed = fixUrl(url);
    await loadFigureOverrides();
    const rules = [...(figureOverrides?.rules || []), ...FIGURE_OVERRIDE_FALLBACK];
    for (const rule of rules) {
      if (rule.url && (rule.url === fixed || rule.url === url)) return normalizeAssetSrc(rule.clean);
      if (rule.urlRx) {
        try {
          if (new RegExp(rule.urlRx, "i").test(fixed)) return normalizeAssetSrc(rule.clean);
        } catch (_) {}
      }
    }
    const m = await loadManifest();
    if ((m.version || 1) >= MANIFEST_MIN_VER && m.map && m.map[fixed]) return m.map[fixed];
    if ((m.version || 1) >= MANIFEST_MIN_VER && m.map && m.map[url]) return m.map[url];
    return fixed;
  }

  function pixelAvg(data, i) {
    return (data[i] + data[i + 1] + data[i + 2]) / 3;
  }

  function isLikelyInk(r, g, b) {
    const avg = (r + g + b) / 3;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (avg < 118) return true;
    if (chroma > 45 && avg < 210) return true;
    return false;
  }

  function isWatermarkPixel(r, g, b, a) {
    if (a !== undefined && a < 8) return false;
    const avg = (r + g + b) / 3;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    return chroma < 52 && avg >= 118 && avg <= 252;
  }

  function isMarksOverlay(r, g, b, a) {
    if (a !== undefined && a < 5) return false;
    const avg = (r + g + b) / 3;
    if (avg < 88) return false;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (chroma >= 80) return false;
    if (b > r + 4 && b > g && avg >= 112 && avg <= 252) return true;
    if (b >= r - 35 && b >= g - 22 && avg >= 105 && avg <= 252) return true;
    if (chroma < 55 && avg >= 112 && avg <= 250) return true;
    return false;
  }

  function isRemovableWm(r, g, b, a) {
    return isWatermarkPixel(r, g, b, a) || isMarksOverlay(r, g, b, a);
  }

  function isStainPixel(r, g, b, a) {
    if (a !== undefined && a < 6) return false;
    const avg = (r + g + b) / 3;
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    if (isLikelyInk(r, g, b)) return false;
    if (chroma > 50) return false;
    return avg >= 152 && avg <= 246;
  }

  function isArtifactPixel(r, g, b, a) {
    return isRemovableWm(r, g, b, a) || isStainPixel(r, g, b, a);
  }

  function hasInkNearby(data, w, h, x, y, radius) {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const i = (ny * w + nx) * 4;
        if (isLikelyInk(data[i], data[i + 1], data[i + 2])) return true;
      }
    }
    return false;
  }

  function lightContextRatio(data, w, h, x, y, radius) {
    let light = 0;
    let total = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        total++;
        if (pixelAvg(data, (ny * w + nx) * 4) > 165) light++;
      }
    }
    return total ? light / total : 0;
  }

  function medianChannel(samples, ch) {
    const arr = samples.map(p => p[ch]).sort((a, b) => a - b);
    return arr[Math.floor(arr.length / 2)];
  }

  function localBgColor(data, w, h, x, y) {
    const samples = [];
    const rays = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [2, 0], [-2, 0], [0, 2], [0, -2],
      [1, 1], [-1, -1], [1, -1], [-1, 1]
    ];
    for (const [sdx, sdy] of rays) {
      for (let step = 1; step <= 10; step++) {
        const nx = x + sdx * step;
        const ny = y + sdy * step;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) break;
        const i = (ny * w + nx) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (isLikelyInk(r, g, b)) break;
        if (!isRemovableWm(r, g, b, data[i + 3])) {
          samples.push([r, g, b]);
          break;
        }
      }
    }
    if (samples.length >= 2) {
      return [medianChannel(samples, 0), medianChannel(samples, 1), medianChannel(samples, 2)];
    }
    const white = [];
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const i = (ny * w + nx) * 4;
        if (pixelAvg(data, i) > 242) white.push([data[i], data[i + 1], data[i + 2]]);
      }
    }
    if (white.length) {
      return [
        Math.round(white.reduce((s, p) => s + p[0], 0) / white.length),
        Math.round(white.reduce((s, p) => s + p[1], 0) / white.length),
        Math.round(white.reduce((s, p) => s + p[2], 0) / white.length)
      ];
    }
    return [255, 255, 255];
  }

  function paintBg(data, w, h, x, y) {
    const i = (y * w + x) * 4;
    const bg = localBgColor(data, w, h, x, y);
    data[i] = bg[0];
    data[i + 1] = bg[1];
    data[i + 2] = bg[2];
    data[i + 3] = 255;
  }

  function safeToRemove(data, w, h, x, y, strict) {
    const i = (y * w + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (!isRemovableWm(r, g, b, data[i + 3])) return false;
    if (isLikelyInk(r, g, b)) return false;
    const inkRadius = strict ? 2 : 1;
    if (hasInkNearby(data, w, h, x, y, inkRadius)) return false;
    const lightNeed = strict ? 0.38 : 0.52;
    if (lightContextRatio(data, w, h, x, y, 4) < lightNeed) return false;
    return true;
  }

  function safeOverlayRemove(data, w, h, x, y) {
    const i = (y * w + x) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const avg = (r + g + b) / 3;
    if (!isRemovableWm(r, g, b, data[i + 3])) return false;
    if (isLikelyInk(r, g, b)) return false;
    if (avg < 112) return false;
    return true;
  }

  function countInk(data, w, h) {
    let ink = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (isLikelyInk(data[i], data[i + 1], data[i + 2])) ink++;
      }
    }
    return ink;
  }

  function countWm(data, w, h) {
    let wm = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (isRemovableWm(data[i], data[i + 1], data[i + 2], data[i + 3])) wm++;
      }
    }
    return wm;
  }

  function countCenterBandWm(data, w, h) {
    const x0 = Math.floor(w * 0.24);
    const x1 = Math.ceil(w * 0.76);
    const y0 = Math.floor(h * 0.36);
    const y1 = Math.ceil(h * 0.64);
    let wm = 0;
    let total = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        total++;
        const i = (y * w + x) * 4;
        if (isRemovableWm(data[i], data[i + 1], data[i + 2], data[i + 3])) wm++;
      }
    }
    return { wm, total, ratio: wm / Math.max(total, 1) };
  }

  function countCornerBandWm(data, w, h) {
    const zones = [
      [0, Math.floor(w * 0.30), Math.floor(h * 0.72), h],
      [Math.floor(w * 0.70), w, Math.floor(h * 0.72), h],
      [0, Math.floor(w * 0.30), 0, Math.floor(h * 0.28)],
      [Math.floor(w * 0.70), w, 0, Math.floor(h * 0.28)]
    ];
    let wm = 0;
    let total = 0;
    for (const [x0, x1, y0, y1] of zones) {
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          total++;
          const i = (y * w + x) * 4;
          if (isRemovableWm(data[i], data[i + 1], data[i + 2], data[i + 3])
            || isMarksOverlay(data[i], data[i + 1], data[i + 2], data[i + 3])) wm++;
        }
      }
    }
    return { wm, total, ratio: wm / Math.max(total, 1) };
  }

  function countZoneWm(data, w, h, x0, x1, y0, y1) {
    let wm = 0;
    let total = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        total++;
        const i = (y * w + x) * 4;
        if (isRemovableWm(data[i], data[i + 1], data[i + 2], data[i + 3])
          || isMarksOverlay(data[i], data[i + 1], data[i + 2], data[i + 3])) wm++;
      }
    }
    return { wm, total, ratio: wm / Math.max(total, 1) };
  }

  function watermarkZonesFromData(data, w, h) {
    const zones = [];
    const center = countCenterBandWm(data, w, h);
    const tl = countZoneWm(data, w, h, 0, Math.floor(w * 0.32), 0, Math.floor(h * 0.28));
    const tr = countZoneWm(data, w, h, Math.floor(w * 0.68), w, 0, Math.floor(h * 0.28));
    const bl = countZoneWm(data, w, h, 0, Math.floor(w * 0.32), Math.floor(h * 0.72), h);
    const br = countZoneWm(data, w, h, Math.floor(w * 0.68), w, Math.floor(h * 0.72), h);
    if (center.ratio > WM_DETECT_MIN) zones.push("center");
    if (tl.ratio > WM_DETECT_MIN) zones.push("tl");
    if (tr.ratio > WM_DETECT_MIN) zones.push("tr");
    if (bl.ratio > WM_DETECT_MIN) zones.push("bl");
    if (br.ratio > WM_DETECT_MIN) zones.push("br");
    if (!zones.length) {
      const corners = countCornerBandWm(data, w, h);
      const totalRatio = countWm(data, w, h) / Math.max(w * h, 1);
      if (corners.ratio > WM_DETECT_MIN || totalRatio > 0.01) zones.push("br");
    }
    return { zones, centerRatio: center.ratio, cornerRatio: br.ratio, totalRatio: countWm(data, w, h) / Math.max(w * h, 1) };
  }

  function analyzeWatermarkPixels(data, w, h) {
    const probe = watermarkZonesFromData(data, w, h);
    const hasWm = probe.zones.length > 0;
    return { hasWm, zones: probe.zones, centerRatio: probe.centerRatio, cornerRatio: probe.cornerRatio, totalRatio: probe.totalRatio };
  }

  function buildInkMask(data, w, h) {
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (isLikelyInk(data[i], data[i + 1], data[i + 2])) mask[y * w + x] = 1;
      }
    }
    const dilated = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (mask[idx]) { dilated[idx] = 1; continue; }
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            if (mask[ny * w + nx]) { dilated[idx] = 1; break; }
          }
          if (dilated[idx]) break;
        }
      }
    }
    return dilated;
  }

  function buildWmMask(data, w, h, inkMask) {
    const wm = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (inkMask[idx]) continue;
        const i = idx * 4;
        if (isArtifactPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) wm[idx] = 1;
      }
    }
    return wm;
  }

  function dilateMaskSafe(mask, w, h, inkMask, radius) {
    const out = new Uint8Array(mask);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (!mask[idx]) continue;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const ni = ny * w + nx;
            if (inkMask[ni]) continue;
            out[ni] = 1;
          }
        }
      }
    }
    return out;
  }

  function buildArtifactMask(data, w, h, inkMask) {
    const base = buildWmMask(data, w, h, inkMask);
    return dilateMaskSafe(base, w, h, inkMask, 1);
  }

  function seamlessFeather(data, w, h, cleanedMask, inkMask) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (!cleanedMask[idx] || inkMask[idx]) continue;
        let border = false;
        for (let dy = -1; dy <= 1 && !border; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ni = (y + dy) * w + (x + dx);
            if (!cleanedMask[ni]) { border = true; break; }
          }
        }
        if (!border) continue;
        let sr = 0, sg = 0, sb = 0, n = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const ni = ny * w + nx;
            if (cleanedMask[ni] || inkMask[ni]) continue;
            const pi = ni * 4;
            sr += data[pi];
            sg += data[pi + 1];
            sb += data[pi + 2];
            n++;
          }
        }
        if (n < 3) continue;
        const pi = idx * 4;
        const blend = 0.55;
        data[pi] = Math.round(data[pi] * (1 - blend) + (sr / n) * blend);
        data[pi + 1] = Math.round(data[pi + 1] * (1 - blend) + (sg / n) * blend);
        data[pi + 2] = Math.round(data[pi + 2] * (1 - blend) + (sb / n) * blend);
      }
    }
  }

  function restoreProfessional(data, w, h) {
    const inkMask = buildInkMask(data, w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (inkMask[idx]) continue;
        const i = idx * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const avg = (r + g + b) / 3;
        if (isArtifactPixel(r, g, b, data[i + 3]) || avg >= 236) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          data[i + 3] = 255;
        }
      }
    }
  }

  function medianOf(arr) {
    if (!arr.length) return 255;
    const s = arr.slice().sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }

  function inpaintMasked(data, w, h, wmMask, inkMask) {
    const remaining = new Uint8Array(wmMask);
    const known = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) known[i] = (!remaining[i] || inkMask[i]) ? 1 : 0;

    for (let pass = 0; pass < 28; pass++) {
      let any = false;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          if (!remaining[idx] || inkMask[idx]) continue;
          let nk = 0;
          const rs = [], gs = [], bs = [];
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (!dx && !dy) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
              const ni = ny * w + nx;
              if (!known[ni]) continue;
              nk++;
              const pi = ni * 4;
              rs.push(data[pi]);
              gs.push(data[pi + 1]);
              bs.push(data[pi + 2]);
            }
          }
          if (nk < 4) continue;
          const pi = idx * 4;
          data[pi] = medianOf(rs);
          data[pi + 1] = medianOf(gs);
          data[pi + 2] = medianOf(bs);
          data[pi + 3] = 255;
          remaining[idx] = 0;
          known[idx] = 1;
          any = true;
        }
      }
      if (!any) break;
    }

    for (let i = 0; i < w * h; i++) {
      if (!remaining[i] || inkMask[i]) continue;
      const pi = i * 4;
      data[pi] = 255;
      data[pi + 1] = 255;
      data[pi + 2] = 255;
      data[pi + 3] = 255;
    }
  }

  function normalizeWhiteBackground(data, w, h, inkMask) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (inkMask[idx]) continue;
        const i = idx * 4;
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (avg >= 240) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        }
      }
    }
  }

  function scrubCenterWatermark(data, w, h, inkMask) {
    let removed = 0;
    const mx0 = Math.floor(w * 0.08);
    const mx1 = Math.ceil(w * 0.92);
    const my0 = Math.floor(h * 0.08);
    const my1 = Math.ceil(h * 0.92);
    for (let pass = 0; pass < 5; pass++) {
      for (let y = my0; y < my1; y++) {
        for (let x = mx0; x < mx1; x++) {
          const idx = y * w + x;
          if (inkMask[idx]) continue;
          const i = idx * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (isLikelyInk(r, g, b)) continue;
          if (isRemovableWm(r, g, b, data[i + 3]) || isMarksOverlay(r, g, b, data[i + 3])) {
            paintBg(data, w, h, x, y);
            removed++;
          }
        }
      }
    }
    return removed;
  }

  function scrubMarksTextBand(data, w, h, inkMask) {
    let n = 0;
    const x0 = Math.floor(w * 0.22);
    const x1 = Math.ceil(w * 0.78);
    const y0 = Math.floor(h * 0.34);
    const y1 = Math.ceil(h * 0.66);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = y * w + x;
        if (inkMask[idx]) continue;
        const i = idx * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (isLikelyInk(r, g, b)) continue;
        if (isRemovableWm(r, g, b, data[i + 3]) || isMarksOverlay(r, g, b, data[i + 3])) {
          paintBg(data, w, h, x, y);
          n++;
        }
      }
    }
    return n;
  }

  function scrubCornerWatermarks(data, w, h, inkMask) {
    let n = 0;
    const zones = [
      [0, Math.floor(w * 0.34), Math.floor(h * 0.72), h],
      [Math.floor(w * 0.66), w, Math.floor(h * 0.72), h],
      [0, Math.floor(w * 0.34), 0, Math.floor(h * 0.28)],
      [Math.floor(w * 0.66), w, 0, Math.floor(h * 0.28)]
    ];
    for (const [x0, x1, y0, y1] of zones) {
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const idx = y * w + x;
          if (inkMask[idx]) continue;
          const i = idx * 4;
          if (isLikelyInk(data[i], data[i + 1], data[i + 2])) continue;
          if (isRemovableWm(data[i], data[i + 1], data[i + 2], data[i + 3]) || isMarksOverlay(data[i], data[i + 1], data[i + 2], data[i + 3])) {
            paintBg(data, w, h, x, y);
            n++;
          }
        }
      }
    }
    return n;
  }

  function whitenMarksBand(data, w, h, inkMask) {
    let n = 0;
    const x0 = Math.floor(w * 0.18);
    const x1 = Math.ceil(w * 0.82);
    const y0 = Math.floor(h * 0.30);
    const y1 = Math.ceil(h * 0.70);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const idx = y * w + x;
        if (inkMask[idx]) continue;
        const i = idx * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const avg = (r + g + b) / 3;
        if (isLikelyInk(r, g, b)) continue;
        if (isRemovableWm(r, g, b, data[i + 3]) || isMarksOverlay(r, g, b, data[i + 3])
          || (avg >= 108 && avg <= 248 && Math.max(r, g, b) - Math.min(r, g, b) < 58)) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          data[i + 3] = 255;
          n++;
        }
      }
    }
    return n;
  }

  function forceCenterWmScrub(data, w, h, inkMask) {
    return scrubMarksTextBand(data, w, h, inkMask) + whitenMarksBand(data, w, h, inkMask);
  }

  function colorizeLineArt(data, w, h) {
    const inkMask = buildInkMask(data, w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const pi = idx * 4;
        const r = data[pi];
        const g = data[pi + 1];
        const b = data[pi + 2];
        const avg = (r + g + b) / 3;
        if (inkMask[idx]) {
          if (avg < 95) {
            data[pi] = 18;
            data[pi + 1] = 52;
            data[pi + 2] = 118;
          } else if (avg < 150) {
            data[pi] = 42;
            data[pi + 1] = 88;
            data[pi + 2] = 158;
          } else {
            data[pi] = 72;
            data[pi + 1] = 118;
            data[pi + 2] = 188;
          }
          data[pi + 3] = 255;
          continue;
        }
        if (avg >= 248) {
          data[pi] = 255;
          data[pi + 1] = 255;
          data[pi + 2] = 255;
          continue;
        }
        if (avg >= 175 && avg < 248 && !isRemovableWm(r, g, b, data[pi + 3])) {
          data[pi] = 212;
          data[pi + 1] = 228;
          data[pi + 2] = 245;
        }
      }
    }
  }

  function cleanImageData(data, w, h) {
    const total = w * h;
    const beforeInk = countInk(data, w, h);
    const beforeWm = countWm(data, w, h);

    const inkMask = buildInkMask(data, w, h);
    const wmMask = buildArtifactMask(data, w, h, inkMask);
    let removed = 0;
    for (let i = 0; i < w * h; i++) if (wmMask[i]) removed++;

    inpaintMasked(data, w, h, wmMask, inkMask);
    seamlessFeather(data, w, h, wmMask, inkMask);
    removed += scrubCenterWatermark(data, w, h, buildInkMask(data, w, h));
    removed += scrubMarksTextBand(data, w, h, buildInkMask(data, w, h));
    removed += whitenMarksBand(data, w, h, buildInkMask(data, w, h));
    removed += scrubCornerWatermarks(data, w, h, buildInkMask(data, w, h));

    const inkMask2 = buildInkMask(data, w, h);
    normalizeWhiteBackground(data, w, h, inkMask2);

    for (let pass = 0; pass < 3; pass++) {
      const inkMask3 = buildInkMask(data, w, h);
      const wm2 = buildArtifactMask(data, w, h, inkMask3);
      inpaintMasked(data, w, h, wm2, inkMask3);
      seamlessFeather(data, w, h, wm2, inkMask3);
      normalizeWhiteBackground(data, w, h, buildInkMask(data, w, h));
    }

    restoreProfessional(data, w, h);

    const afterInk = countInk(data, w, h);
    const afterWm = countWm(data, w, h);
    const centerBand = countCenterBandWm(data, w, h);
    const removedRatio = removed / Math.max(total, 1);
    const damaged = afterInk < Math.max(45, beforeInk * MIN_INK_VS_CDN);
    const improved = afterWm < beforeWm * 0.55 || (beforeWm > 0 && afterWm === 0);
    const residueRatio = afterWm / Math.max(total, 1);
    const cleanEnough = residueRatio <= WM_RESIDUE_MAX || (improved && residueRatio <= 0.03);
    return {
      removed, damaged, improved, cleanEnough, residueRatio, centerResidue: centerBand.ratio,
      removedRatio, beforeInk, afterInk, beforeWm, afterWm
    };
  }

  function hasVisibleInk(data, w, h) {
    let ink = 0;
    let white = 0;
    const total = Math.max(w * h, 1);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (avg < 200) ink++;
        if (avg > 248) white++;
      }
    }
    return (ink / total) >= MIN_INK_RATIO && (white / total) < MAX_WHITE_RATIO;
  }

  function revertToCdn(img, cdnSrc) {
    const orig = fixUrl(cdnSrc || img.dataset.qxOrigSrc || "");
    if (!orig) return;
    img.classList.remove("qx-img-flagged", "qx-cleaned", "qx-wm-clean");
    delete img.dataset.qxCleaned;
    delete img.dataset.qxCleanVer;
    delete img.dataset.qxWmClean;
    img.style.display = "";
    img.style.visibility = "";
    img.style.opacity = "";
    stripDisplayCors(img);
    const display = poolDisplaySrc(orig);
    if (img.getAttribute("src") !== display) img.src = display;
  }

  function forceKeepVisible(img, cdnSrc) {
    revertToCdn(img, cdnSrc);
  }

  function inkRatioFromData(data, w, h) {
    let ink = 0;
    const total = Math.max(w * h, 1);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if ((data[i] + data[i + 1] + data[i + 2]) / 3 < 200) ink++;
      }
    }
    return ink / total;
  }

  async function probeInkRatio(probe) {
    const w = probe.naturalWidth || probe.width;
    const h = probe.naturalHeight || probe.height;
    if (!w || !h) return 0;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(probe, 0, 0);
      return inkRatioFromData(ctx.getImageData(0, 0, w, h).data, w, h);
    } catch (_) {
      return 0;
    }
  }

  async function validateProbeInk(probe) {
    const w = probe.naturalWidth || probe.width;
    const h = probe.naturalHeight || probe.height;
    if (!w || !h) return false;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(probe, 0, 0);
      return hasVisibleInk(ctx.getImageData(0, 0, w, h).data, w, h);
    } catch (_) {
      return true;
    }
  }

  function showReviewPlaceholder(img) {
    markPendingMask(img);
    forceKeepVisible(img);
    const wrap = img.closest(".qx-fig, .qx-opt-fig, .qx-img-wrap, figure") || img.parentElement;
    if (!wrap || wrap.querySelector(".qx-img-review-note")) return;
    const note = document.createElement("div");
    note.className = "qx-img-review-note";
    note.textContent = "Diagram under review — showing original until recreation is ready.";
    wrap.classList.add("qx-img-under-review");
    wrap.appendChild(note);
  }

  function isInOptionContext(node) {
    return !!(node && node.closest && node.closest(OPT_IMG_SEL));
  }

  function defaultWmZones(cdnSrc) {
    if (GETMARKS_POOL_RX.test(fixUrl(cdnSrc || ""))) return ["br", "center", "tr", "bl"];
    return ["br", "center"];
  }

  function isApiFigureSrc(src) {
    const s = fixUrl(src || "");
    return s.includes("/api/restore-image") || s.includes("/api/proxy-image");
  }

  function canonicalCdnSrc(src) {
    const s = fixUrl(src || "");
    if (!s) return "";
    if (isLocalCleanAsset(s)) return normalizeAssetSrc(s);
    if (isApiFigureSrc(s)) {
      try {
        const u = new URL(s, PROXY_BASE);
        const inner = u.searchParams.get("url");
        if (inner) return canonicalCdnSrc(inner);
      } catch (_) { /* ignore */ }
      return "";
    }
    if (SKIP_RX.test(s)) return "";
    if (POOL_RX.test(s)) return s;
    return "";
  }

  function isGetmarksPool(cdnSrc) {
    const cdn = canonicalCdnSrc(cdnSrc) || fixUrl(cdnSrc || "");
    return GETMARKS_POOL_RX.test(cdn) && !isApiFigureSrc(cdnSrc);
  }

  function marksHideHtml() {
    return "";
  }

  function premiumSheetHtml() {
    // Never inject Quantrex/MARKS text watermarks over figures
    return "";
  }

  function quantrexWmCoverHtml(zones) {
    return "";
  }

  function watermarkStripHtml() {
    return "";
  }

  function premiumWatermarkHtml() {
    return "";
  }

  function diagramWatermarkHtml() {
    return "";
  }

  function brandOverlayHtml() {
    return "";
  }

  const OVERLAY_CLASS_RX = /^(qx-quantrex-wm|qx-premium-wm|qx-premium-wm-sheet|qx-diag-watermark|qx-brand-overlay|qx-wm-mask|qx-marks-scrub|qx-marks-strip|qx-wm-diagonal)$/;

  function directOverlayKids(parent) {
    if (!parent || !parent.children) return [];
    return Array.from(parent.children).filter(el => {
      if (!el.classList) return false;
      for (const cls of el.classList) if (OVERLAY_CLASS_RX.test(cls)) return true;
      return false;
    });
  }

  function stripBrandOverlay(container) {
    if (!container) return;
    directOverlayKids(container).forEach(el => el.remove());
    if (container.matches && container.matches(".qx-fig-inner, .qx-fig, .qx-opt-fig")) {
      container.classList.remove("qx-wm-active", "qx-wm-fallback-wrap", "qx-premium-wm--over-embedded", "qx-quantrex-wm--marks-present", "qx-quantrex-wm--clean");
    }
  }

  function ensureFigInnerStack(img) {
    if (!img || !img.parentNode) return null;
    let inner = img.closest(".qx-fig-inner");
    if (inner) return inner;
    const fig = img.closest(".qx-fig, .qx-opt-fig");
    if (!fig) return null;
    inner = document.createElement("div");
    inner.className = "qx-fig-inner qx-wm-stack";
    fig.insertBefore(inner, img);
    inner.appendChild(img);
    return inner;
  }

  function overlayTargetForImg(img) {
    if (!img) return null;
    return ensureFigInnerStack(img) || img.closest(".qx-fig-inner, .qx-fig, .qx-opt-fig");
  }

  const _canvasResizeObs = typeof WeakMap !== "undefined" ? new WeakMap() : null;

  function bindCanvasResize(img, stack) {
    if (!img || !stack || !_canvasResizeObs || _canvasResizeObs.has(img)) return;
    _canvasResizeObs.set(img, true);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (!img.isConnected || img.dataset.qxHasWm !== "1") return;
      paintPremiumWatermark(img);
    });
    ro.observe(img);
    ro.observe(stack);
  }

  function removeCanvasShield(img) {
    const stack = img && img.closest(".qx-fig-inner");
    if (!stack) return;
    stack.querySelectorAll("canvas.qx-marks-scrub-canvas, canvas.qx-premium-wm-canvas, img.qx-quantrex-wm-overlay").forEach(c => c.remove());
    stack.classList.remove("qx-wm-canvas-active", "qx-quantrex-wm-active", "qx-premium-wm-active");
    if (img) {
      delete img.dataset.qxQuantrexWm;
      delete img.dataset.qxWmOverlay;
      delete img.dataset.qxBrandWm;
      delete img.dataset.qxPremiumWm;
      img.classList.remove("qx-brand-wm");
    }
  }

  function paintPremiumWatermark(img) {
    // Never paint Quantrex brand on figures — only strip leftovers
    if (!img) return;
    removeCanvasShield(img);
    const stack = overlayTargetForImg(img);
    if (stack) {
      stripBrandOverlay(stack);
      stack.querySelectorAll(
        ".qx-premium-wm-sheet, .qx-quantrex-wm, .qx-quantrex-black-wm, .qx-quantrex-black-seal, img.qx-quantrex-wm-overlay, canvas.qx-premium-wm-canvas, .qx-brand-overlay, .qx-diag-watermark"
      ).forEach(el => el.remove());
    }
  }

  function paintCanvasShield(img) {
    paintPremiumWatermark(img);
  }

  function enhancePoolFigure(img) {
    if (!img) return;
    img.classList.add("qx-hq-color", "qx-pool-fig");
    img.style.setProperty("display", "block", "important");
    img.style.setProperty("visibility", "visible", "important");
    img.style.setProperty("opacity", "1", "important");
    img.style.setProperty("position", "relative", "important");
    img.style.setProperty("z-index", "2", "important");
    img.style.setProperty("image-rendering", "auto", "important");
    img.style.setProperty("max-height", "none", "important");
    img.style.setProperty("object-fit", "contain", "important");
  }

  function applyWmCover(img) {
    if (!img || !img.isConnected) return;
    enhancePoolFigure(img);
    revealFigure(img);
    const target = overlayTargetForImg(img);
    if (target) {
      stripBrandOverlay(target);
      removeCanvasShield(img);
      target.classList.remove("qx-premium-wm-active");
    }
    const fig = img.closest(".qx-fig, .qx-opt-fig");
    if (fig) fig.classList.remove("qx-premium-wm-active");
    // Always try MARKS clean for pool figures (server may already have cleaned via proxy)
    if (img.naturalWidth > 0 && typeof QxPremiumWM !== "undefined" && QxPremiumWM.paintMarksHideOnly) {
      void QxPremiumWM.paintMarksHideOnly(img);
    }
  }

  function markFigureReady(img, keepScrub) {
    if (!img) return;
    revealFigure(img);
    enhancePoolFigure(img);
    img.classList.add("qx-fig-ready", "qx-hq-color");
    const target = overlayTargetForImg(img);
    if (target) {
      target.querySelectorAll(".qx-premium-wm-sheet, .qx-quantrex-wm, .qx-diag-watermark, .qx-brand-overlay, img.qx-quantrex-wm-overlay").forEach(el => el.remove());
      if (!keepScrub) removeCanvasShield(img);
      target.classList.remove("qx-premium-wm-active", "qx-wm-active");
    }
    const fig = img.closest(".qx-fig, .qx-opt-fig");
    if (fig) fig.classList.remove("qx-premium-wm-active", "qx-wm-active");
  }

  async function upgradePoolFigure(img, cdnSrc) {
    if (!img || !img.isConnected) return;
    const cdn = canonicalCdnSrc(cdnSrc) || fixUrl(cdnSrc || poolCdnSrc(img) || "");
    revealFigure(img);
    enhancePoolFigure(img);
    if (!cdn || !isPoolDiagram(cdn, img)) {
      if (img.naturalWidth > 0) markFigureReady(img, false);
      return;
    }
    if (isPreprocessedQxOrg(cdn)) {
      const busted = normalizeAssetSrc(cdn);
      if (busted && fixUrl(img.getAttribute("src") || "") !== fixUrl(busted)) {
        img.setAttribute("src", busted);
      }
      if (img.naturalWidth <= 0) await waitForImageLoad(img, 8000);
      finalizeQxOrgDisplay(img);
      return;
    }
    if (isOrganicOrgSrc(cdn) && img.classList.contains("qx-cleaned")) {
      await finalizeOrganicOrgDisplay(img);
      return;
    }
    if (isLocalReadyAsset(cdn) || (img.classList.contains("qx-cleaned") && !isOrganicOrgSrc(cdn))) {
      const busted = normalizeAssetSrc(cdn);
      if (busted && fixUrl(img.getAttribute("src") || "") !== fixUrl(busted)) {
        img.setAttribute("src", busted);
      }
      if (img.dataset.qxDisplayW) finalizeQxOrgDisplay(img);
      else markDisplayClean(img);
      return;
    }

    if (img.naturalWidth <= 0) await loadPoolFigureSrc(img, cdn);
    if (img.naturalWidth <= 0) return;

    const cur = String(img.getAttribute("src") || "");
    // Irodov: local wiped PNG; proxy only as fallback
    if (isIrodovSrc(cdn) || isIrodovSrc(cur) || img.classList.contains("qx-irodov-stem")) {
      const local = irodovLocalSrc(cdn) || irodovLocalSrc(cur);
      const iro = irodovCdnFromAny(cdn) || irodovCdnFromAny(cur);
      const fb = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.irodovStorageUrl)
        ? (QxOwnedFigs.irodovStorageUrl(cdn) || QxOwnedFigs.irodovStorageUrl(cur) || local)
        : local;
      if (fb) await loadDisplaySrc(img, fb, fb);
      img.classList.add("qx-irodov-stem", "qx-no-wm");
      markFigureReady(img, false);
      return;
    }
    // Always use clean proxy (server-side MARKS wipe) — never leave raw CDN
    if (isGetmarksPool(cdn) || /cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(cdn)) {
      await loadDisplaySrc(img, proxyImageUrl(cdn), cdn);
    }

    img.dataset.qxHasWm = "1";
    if (!img.dataset.qxWmZones) img.dataset.qxWmZones = defaultWmZones(cdn).join(",");
    stripBrandOverlay(overlayTargetForImg(img));
    // Always pixel-strip residual MARKS (even after server clean)
    let scrubbed = false;
    if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.paintMarksHideOnly) {
      scrubbed = await QxPremiumWM.paintMarksHideOnly(img);
    }
    if (!scrubbed) {
      queueSoftStrip(img);
    }
    img.dataset.qxHasWm = "0";
    img.dataset.qxWmClean = "1";
    markFigureReady(img, scrubbed);
  }

  function shouldBrandOverlay(img) {
    // Always false — Quantrex watermarks removed from all figures
    return false;
  }

  function applyQuantrexBrand(img) {
    // Watermarks disabled — they were covering figures. Only strip leftovers.
    if (!img || !img.isConnected) return Promise.resolve(false);
    if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.stripQuantrexBrand) {
      QxPremiumWM.stripQuantrexBrand(img);
    } else {
      removeCanvasShield(img);
    }
    return Promise.resolve(false);
  }

  function flagPoolWatermark(img, wmProbe) {
    if (!img) return;
    const cdn = poolCdnSrc(img) || fixUrl(img.getAttribute("src") || "");
    if (!isPoolDiagram(cdn, img)) return;
    if (wmProbe && wmProbe.hasWm) {
      img.dataset.qxHasWm = "1";
      if (wmProbe.zones && wmProbe.zones.length) {
        img.dataset.qxWmZones = wmProbe.zones.join(",");
      } else if (!img.dataset.qxWmZones) {
        img.dataset.qxWmZones = defaultWmZones(cdn).join(",");
      }
      return;
    }
    if (wmProbe && !wmProbe.hasWm) {
      img.dataset.qxHasWm = "0";
      img.dataset.qxWmClean = "1";
      delete img.dataset.qxWmZones;
      return;
    }
    if (img.dataset.qxHasWm === "1" || img.dataset.qxHasWm === "0") return;
    img.dataset.qxHasWm = "pending";
  }

  function markNoWatermark(img) {
    if (!img) return;
    revealFigure(img);
    img.dataset.qxHasWm = "0";
    img.dataset.qxWmClean = "1";
    img.classList.add("qx-wm-none", "qx-wm-clean");
    img.classList.remove("qx-wm-pending", "qx-wm-fallback");
    const target = overlayTargetForImg(img);
    const fig = img.closest(".qx-fig, .qx-opt-fig");
    removeCanvasShield(img);
    if (target) {
      target.classList.remove("qx-wm-active", "qx-wm-pending-wrap", "qx-wm-canvas-active");
      stripBrandOverlay(target);
    }
    if (fig) fig.classList.remove("qx-wm-active", "qx-wm-pending-wrap");
  }

  function markWmClean(img) {
    if (!img) return;
    img.dataset.qxHasWm = "0";
    img.dataset.qxWmClean = "1";
    img.classList.add("qx-wm-clean");
    img.classList.remove("qx-wm-pending", "qx-wm-fallback");
    removeCanvasShield(img);
    const target = overlayTargetForImg(img);
    const fig = img.closest(".qx-fig, .qx-opt-fig");
    if (target) {
      target.classList.remove("qx-wm-pending-wrap", "qx-wm-canvas-active", "qx-wm-active", "qx-premium-wm-active");
      stripBrandOverlay(target);
    }
    if (fig) fig.classList.remove("qx-wm-pending-wrap", "qx-wm-active", "qx-premium-wm-active");
  }

  function markWmNeedsOverlay(img) {
    if (img && img.dataset.qxHasWm === "1") applyWmCover(img);
  }

  async function retryInpaint(img, cdnSrc, attempt) {
    if (!img || !img.isConnected || isCleanedImg(img) || img.dataset.qxHasWm !== "1") return;
    const n = attempt || 0;
    if (n > 2) return;
    await new Promise(r => setTimeout(r, 400 + n * 600));
    if (!img.isConnected || isCleanedImg(img)) return;
    if (await resolveAndShowClean(img, cdnSrc)) return;
    const manifestRel = await cleanUrl(cdnSrc);
    const manifestPath = manifestRel && manifestRel !== cdnSrc && !manifestRel.startsWith("http")
      ? manifestRel : null;
    if (await tryClean(img, cdnSrc, manifestPath)) return;
    keepPoolImageVisible(img, cdnSrc);
    void retryInpaint(img, cdnSrc, n + 1);
  }

  function probeFromDrawable(drawable, w, h) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(drawable, 0, 0);
      return analyzeWatermarkPixels(ctx.getImageData(0, 0, w, h).data, w, h);
    } catch (_) {
      return null;
    }
  }

  async function probeWatermarkFromImage(img, cdnSrc) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const cdn = fixUrl(cdnSrc || img.dataset.qxOrigSrc || poolCdnSrc(img) || "");
    if (!w || !h) return { hasWm: false, zones: [] };
    let wm = probeFromDrawable(img, w, h);
    if (!wm) {
      const viaProxy = await loadProbe(proxyImageUrl(cdn), true);
      if (viaProxy) wm = probeFromDrawable(viaProxy, viaProxy.naturalWidth, viaProxy.naturalHeight);
    }
    if (wm) return wm;
    if (isGetmarksPool(cdn)) return { hasWm: true, zones: defaultWmZones(cdn) };
    return { hasWm: false, zones: [] };
  }

  async function probeCenterWmFromImage(img) {
    const probe = await probeWatermarkFromImage(img, img.dataset.qxOrigSrc);
    return probe.centerRatio != null ? probe.centerRatio : 1;
  }

  async function finalizeOrganicOrgDisplay(img) {
    if (!img || !img.isConnected) return;
    restoreOrganicFigureSize(img);
    await waitForImageLoad(img, 4000);
    restoreOrganicFigureSize(img);
    const stack = img.closest(".qx-fig-inner") || img.parentElement;
    if (!stack || typeof QxPremiumWM === "undefined") return;
    const dw = captureOrganicDisplayWidth(img);
    const w = dw > 12 ? dw : (img.offsetWidth || img.clientWidth || img.naturalWidth || 0);
    const nh = img.naturalHeight || 0;
    const nw = img.naturalWidth || 0;
    const h = w > 12 && nw > 0 && nh > 0 ? Math.round(w * nh / nw) : (img.offsetHeight || img.clientHeight || nh || 0);
    if (w < 12 || h < 12) {
      if (img.dataset.qxCoachingWmBound !== "1") {
        img.dataset.qxCoachingWmBound = "1";
        const repaint = () => { void finalizeOrganicOrgDisplay(img); };
        img.addEventListener("load", repaint, { once: true });
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(repaint);
      }
      return;
    }
    // No watermark overlays (they covered figures) — clean black figure only
    if (QxPremiumWM.stripQuantrexBrand) QxPremiumWM.stripQuantrexBrand(img);
    if (QxPremiumWM.paintMarksHideOnly) await QxPremiumWM.paintMarksHideOnly(img);
    markDisplayClean(img);
    revealOrganicClean(img);
  }

  async function finalizeCleanDisplay(img, stats) {
    if (!img || !img.isConnected) return;
    const cdn = poolCdnSrc(img) || fixUrl(img.dataset.qxOrigSrc || "");
    if (img.naturalWidth > 0 && img.dataset.qxOrigSrc) {
      if (isOrganicOrgSrc(cdn) && (img.classList.contains("qx-cleaned") || String(img.getAttribute("src") || "").startsWith("blob:"))) {
        await finalizeOrganicOrgDisplay(img);
        return;
      }
      await upgradePoolFigure(img, poolCdnSrc(img));
      return;
    }
    const cur = String(img.getAttribute("src") || "");
    const cleanedPixels = img.classList.contains("qx-cleaned") || img.classList.contains("qx-restored")
      || cur.includes("clean-diagrams") || cur.startsWith("blob:") || cur.includes("/api/restore-image");
    if (!cleanedPixels) {
      if (isPoolDiagram(poolCdnSrc(img), img)) await upgradePoolFigure(img, poolCdnSrc(img));
      return;
    }
    const centerResidue = stats && typeof stats.centerResidue === "number"
      ? stats.centerResidue
      : await probeCenterWmFromImage(img);
    if (centerResidue <= CENTER_WM_MAX) markDisplayClean(img);
    else await upgradePoolFigure(img, poolCdnSrc(img));
  }

  function isOptFigure(img) {
    return !!(img && img.closest && img.closest(".mtk-opt-text, .qx-prac-opt-text, .mtk-opt, .qa-opt, .qx-prac-opt"));
  }

  function syncBrandOverlay(container) {
    // Never inject Quantrex watermark — always strip overlays, keep figure clean
    if (!container) return;
    const img = container.matches && container.matches("img")
      ? container
      : container.querySelector("img.qx-pool-fig, img.qx-fig-img, img.qx-no-wm, img");
    const target = (img && overlayTargetForImg(img)) || container;
    stripBrandOverlay(target);
    if (img) removeCanvasShield(img);
    target.querySelectorAll(
      ".qx-premium-wm-sheet, .qx-quantrex-wm, .qx-quantrex-black-wm, .qx-quantrex-black-seal, img.qx-quantrex-wm-overlay, canvas.qx-premium-wm-canvas, .qx-brand-overlay, .qx-diag-watermark, .qx-coaching-wm"
    ).forEach(el => el.remove());
    target.classList.remove("qx-wm-active", "qx-premium-wm-active", "qx-quantrex-wm-active", "qx-coaching-wm-active");
    const fig = img && img.closest(".qx-fig, .qx-opt-fig");
    if (fig) fig.classList.remove("qx-wm-active", "qx-premium-wm-active");
    // Still upgrade pool figures via clean proxy (no brand paint)
    if (img && img.naturalWidth > 0) {
      const cdn = poolCdnSrc(img);
      if (cdn) void upgradePoolFigure(img, cdn);
    }
  }

  function ensureBrandOverlay(container) {
    // No brand watermark overlays — only strip leftovers
    if (!container) return;
    stripBrandOverlay(container);
    container.querySelectorAll(
      ".qx-premium-wm-sheet, .qx-quantrex-wm, .qx-diag-watermark, .qx-brand-overlay, img.qx-quantrex-wm-overlay, canvas.qx-premium-wm-canvas, .qx-quantrex-black-wm, .qx-quantrex-black-seal"
    ).forEach(el => el.remove());
  }

  function ensureBrandOverlayLegacy(container) {
    syncBrandOverlay(container);
  }

  function processAllDiagrams(root) {
    const scope = root || document.body;
    if (!scope) return;
    startObserver();
    startGuardian();
    scope.querySelectorAll("img").forEach(img => processImage(img));
  }

  function ensureDiagramWrap(img) {
    // Digital books: never wrap into padded figure cards (creates huge empty space)
    if (isBookFigureContext(img) || isBookOrLocalFigure(img && (img.getAttribute("src") || img.dataset.qxOrigSrc || ""))) {
      return img && img.parentElement;
    }
    let wrap = img.closest(".qx-fig, .qx-opt-fig");
    if (wrap) {
      ensureBrandOverlay(wrap);
      return wrap;
    }
    if (isInOptionContext(img)) {
      const span = document.createElement("span");
      span.className = "qx-opt-fig qx-brand-covered qx-fig-stack";
      img.parentNode.insertBefore(span, img);
      span.appendChild(img);
      img.classList.add("qx-no-wm");
      return span;
    }
    const fig = document.createElement("figure");
    fig.className = "qx-fig qx-pool-fig-wrap qx-brand-covered qx-fig-stack";
    img.parentNode.insertBefore(fig, img);
    fig.appendChild(img);
    img.classList.add("qx-fig-img", "qx-no-wm", "qx-pool-fig");
    ensureFigInnerStack(img);
    return fig;
  }

  function apiBase() {
    if (location.origin && !location.origin.includes("localhost") && location.origin.includes("vercel.app")) {
      return location.origin;
    }
    return PROXY_BASE;
  }

  function isBookOrLocalFigure(src) {
    const s = String(src || "");
    return /\/assets\/(diagrams|qx-figures|clean-diagrams|books)\//i.test(s)
      || /\/images\/[^?\s]+\.(png|jpe?g|webp|gif)/i.test(s)
      || /quantrex-academy\.vercel\.app\/images\//i.test(s)
      || /qx-book-|qx-irodov|hcv-|qx-org-|qx-perm-|qx-alc-|qx-bb-fig/i.test(s)
      || /pubchem\.ncbi|cactus\.nci/i.test(s);
  }

  /** Already clean organic / Rank Booster book figs — never re-proxy (HCV blanked if proxied).
      qx-self PYQ bakes still carry Marks haze and MUST go through pale wipe. */
  function isAlreadyCleanFigure(src) {
    const s = String(src || "");
    return /qx-org-|qx-smiles|pubchem\.ncbi|cactus\.nci|quantrex-wm|quantrex-logo/i.test(s)
      || /\/assets\/diagrams\/qx-(?:org|book)-/i.test(s);
  }

  /** Needs MARKS wipe (CDN pool OR Firebase copies of Marks pool figs) */
  function needsMarksCleanProxy(src) {
    const s = fixUrl(src || "");
    if (!s || s.startsWith("data:") || s.startsWith("blob:")) return false;
    if (isAlreadyCleanFigure(s)) return false;
    if (SKIP_RX.test(s)) return false;
    if (CARD_ART_RX.test(s)) return true;
    if (isGetmarksPool(s) || POOL_RX.test(s)) return true;
    // Firebase copies of Marks pool figures — wipe via our proxy (fetch is Firebase, not Marks).
    if (/firebasestorage/i.test(s) && /questions(%2F|\/)figs/i.test(s)
      && !/getmarks-assets/i.test(s)) return true;
    if (/\/assets\/diagrams\/qx-self-/i.test(s)) return true;
    // Local baked book figures must load as files. Proxying them blanks HCV / Rank Booster.
    if (/\/assets\/diagrams\/qx-(?:book|org)-/i.test(s)) return false;
    return false;
  }

  function proxyImageUrl(cdnSrc) {
    let fixed = fixUrl(cdnSrc);
    if (!fixed) return fixed;
    if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc
      && /\/assets\/diagrams\/qx-(?:self|book|org)-/i.test(fixed)) {
      const mapped = QxOwnedFigs.displaySrc(fixed);
      if (mapped && mapped !== fixed) return mapped;
    }
    // Already on clean proxy — keep (idempotent — no thrash)
    if (/\/api\/proxy-image/i.test(fixed) && /[?&]clean=1\b/i.test(fixed) && /[?&]v=qxfig110\b/i.test(fixed)) {
      try {
        const inner = extractProxiedUrl(fixed);
        if (inner && /getmarks|quizrr/i.test(inner) && typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.ownedFigureUrl) {
          const owned = QxOwnedFigs.ownedFigureUrl(inner);
          if (owned && /firebasestorage/i.test(owned)) {
            const fc = CARD_ART_RX.test(owned + " " + inner) ? "&fc=1" : "";
            return "/api/proxy-image?url=" + encodeURIComponent(owned) + "&clean=1" + fc + "&v=qxfig110";
          }
        }
      } catch (_) { /* keep */ }
      return fixed;
    }
    // Organic / smiles / local baked books: never proxy (HCV Vol 2 was blanking)
    if (isAlreadyCleanFigure(fixed) || /\/assets\/diagrams\/qx-(?:book|org)-/i.test(fixed)) {
      const rel = String(cdnSrc || fixed);
      if (/^https?:/i.test(rel) && /\/assets\/diagrams\//i.test(rel)) {
        const i = rel.indexOf("/assets/diagrams/");
        if (i >= 0) return rel.slice(i).split("?")[0];
      }
      return fixUrl(rel).split("?")[0] || rel;
    }
    // ALWAYS clean-proxy pool / quizrr / watermarked_images (remove MARKS watermark)
    // Do NOT return raw CDN — user requirement: Marks WM must not show
    if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.ownedFigureUrl
      && /getmarks|quizrr/i.test(fixed)) {
      const owned = QxOwnedFigs.ownedFigureUrl(fixed);
      if (owned && /firebasestorage/i.test(owned)) fixed = owned;
    }
    const perm = permCleanSrc(fixed);
    if (perm) return perm;
    // Relative local → absolute for proxy fetch
    if (fixed.startsWith("/")) {
      try {
        if (typeof location !== "undefined" && location.origin) {
          fixed = location.origin + fixed;
        }
      } catch (_) { /* */ }
    }
    if (!needsMarksCleanProxy(fixed) && !isGetmarksPool(fixed) && !POOL_RX.test(fixed) && !/qx-book-/i.test(fixed)) {
      // Non-diagram local assets (UI) — leave
      if (isBookOrLocalFigure(cdnSrc) && !/qx-book-/i.test(String(cdnSrc))) return fixUrl(cdnSrc);
    }
    // Server MARKS wipe (ink + multi-color preserved; logo bleached)
    const fc = CARD_ART_RX.test(fixed) ? "&fc=1" : "";
    const q = `url=${encodeURIComponent(fixed)}&clean=1${fc}&v=qxfig110`;
    try {
      if (typeof location !== "undefined" && location.origin && !/localhost|127\.0\.0\.1/i.test(location.origin)) {
        return `/api/proxy-image?${q}`;
      }
    } catch (_) { /* */ }
    const base = String(PROXY_BASE || apiBase() || "https://quantrexacademy-live.web.app").replace(/\/$/, "");
    return `${base}/api/proxy-image?${q}`;
  }

  /** True only for question-pool diagrams — never exam/subject/UI icons */
  function isRewritablePoolSrc(src, img) {
    const s = fixUrl(src || "");
    if (!s || s.startsWith("data:") || s.startsWith("blob:")) return false;
    if (SKIP_RX.test(s)) return false;
    if (CARD_ART_RX.test(s)) return false;
    if (/cdn-assets\.getmarks|app_assets\/img\/(exams|ui|cpyqb)\//i.test(s)) return false;
    if (img && (img.classList.contains("qx-marks-icon") || img.classList.contains("qx-exam-logo")
      || img.classList.contains("fc-img") || img.classList.contains("subj-ic-img")
      || img.classList.contains("dash-tool-logo") || img.classList.contains("exam-pill-logo"))) {
      return false;
    }
    // Only actual question figures (pool / quizrr / pyq paths)
    return /cdn-question-pool\.getmarks|cdn\.quizrr\.in|\/pyq\//i.test(s);
  }

  /** Books freeze as-is. PYQ uses server proxy clean (no heavy canvas hang). */
  function queueSoftStrip(img) {
    if (!img) return;
    const STRIP_VER = "31";
    const cur = String(img.getAttribute("src") || "");
    img.dataset.qxSoftStrip = "2";
    img.dataset.qxSoftVer = STRIP_VER;
    img.dataset.qxFigFrozen = "1";
    img.classList.add("qx-fig-ready");
    // Books / local / smiles: never proxy, mark clean
    if (isBookOrLocalFigure(cur) || img.classList.contains("qx-smiles-fig")) {
      img.dataset.qxHasWm = "0";
      img.classList.add("qx-wm-clean", "qx-no-wm", "qx-cleaned");
      return;
    }
    // Already on clean proxy
    if (/proxy-image/i.test(cur) && /[?&]clean=1\b/i.test(cur)) {
      img.dataset.qxHasWm = "0";
      img.classList.add("qx-wm-clean", "qx-no-wm", "qx-cleaned", "qx-pool-fig");
      img.removeAttribute("crossorigin");
      return;
    }
    // PYQ pool CDN → same-origin proxy wipe
    const orig = fixUrl(img.dataset.qxOrigSrc || cur);
    if (orig && (isGetmarksPool(orig) || POOL_RX.test(orig)) && !isBookOrLocalFigure(orig)) {
      const disp = poolDisplaySrc(orig);
      if (disp && fixUrl(cur) !== fixUrl(disp)) {
        img.dataset.qxOrigSrc = orig;
        img.removeAttribute("crossorigin");
        img.setAttribute("src", disp);
      }
      img.dataset.qxHasWm = "0";
      img.classList.add("qx-wm-clean", "qx-no-wm", "qx-cleaned", "qx-pool-fig");
    }
  }

  function isPermanentCleanSrc(src) {
    const s = String(src || "");
    return PERM_FIG_RX.test(s) || /\/assets\/qx-figures\/perm\//i.test(s);
  }

  function freezePermanentFig(img, src) {
    // Do not freeze solid-teal /assets/qx-figures/perm — re-route to proxy when possible
    if (!img) return;
    const clean = normalizeAssetSrc(src || img.getAttribute("src") || "");
    if (/\/assets\/qx-figures\/perm\//i.test(clean)) {
      const orig = fixUrl(img.dataset.qxOrigSrc || "");
      if (/cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(orig)) {
        img.removeAttribute("crossorigin");
        img.src = proxyImageUrl(orig);
        img.dataset.qxHasWm = "0";
        img.dataset.qxSoftStrip = "2";
        img.dataset.qxSoftVer = "26";
        img.dataset.qxFigFrozen = "1";
        img.dataset.qxProcessedVer = String(CLEAN_VER);
        img.classList.add("qx-fig-ready", "qx-no-wm", "qx-wm-clean", "qx-nowm", "qx-cleaned");
        return;
      }
      // No CDN orig known — skip freeze so rewrite can recover
      return;
    }
    if (!clean) return;
    img.dataset.qxOrigSrc = clean;
    img.removeAttribute("crossorigin");
    img.crossOrigin = null;
    if (fixUrl(img.getAttribute("src") || "") !== fixUrl(clean)) {
      img.src = clean;
    }
    img.dataset.qxProxied = "1";
    img.dataset.qxHasWm = "0";
    img.dataset.qxSoftStrip = "2";
    img.dataset.qxSoftVer = "26";
    img.dataset.qxFigFrozen = "1";
    img.dataset.qxProcessedVer = String(CLEAN_VER);
    img.classList.add("qx-fig-ready", "qx-no-wm", "qx-wm-clean", "qx-nowm");
  }

  /** Books + PYQ: pin orig CDN, prefer local clean map, else clean proxy. Always visible. */
  function rewriteAllPoolImgs(root) {
    const scope = root || document;
    if (!scope || !scope.querySelectorAll) return 0;
    let n = 0;
    const STRIP_VER = "32";
    const FIG_SEL = "img.qx-pool-fig, img.qx-opt-fig-img, img.qx-irodov-stem, img.qx-match-fig, #qxDiagramSlot img, .qx-diagram-slot img, .mtk-q-text img, .mtk-opt-text img, .qx-prac-q img, .qx-prac-opt-text img, .sol-body img, .qx-content img[src*='proxy-image'], .qx-content img[src*='firebasestorage'], .qx-content img[src*='getmarks'], .qx-content img[src*='quizrr']";
    scope.querySelectorAll(FIG_SEL).forEach((img) => {
      if (!img) return;
      if (SKIP_RX.test(fixUrl(img.getAttribute("src") || ""))
        || img.classList.contains("qx-marks-icon")
        || img.classList.contains("qx-exam-logo")
        || img.classList.contains("qx-ui-brand-logo")) {
        return;
      }
      let cur = fixUrl(img.getAttribute("src") || "");
      // Fix broken host on the attribute itself
      if (/https?:\/\/\.app\//i.test(String(img.getAttribute("src") || ""))) {
        cur = fixUrl(img.getAttribute("src") || "");
        img.setAttribute("src", cur);
      }
      let src = fixUrl(img.dataset.qxOrigSrc || cur);
      if (/proxy-image|restore-image/i.test(src) || /proxy-image|restore-image/i.test(cur)) {
        try {
          const m = (src + " " + cur).match(/[?&]url=([^&\s]+)/);
          if (m) src = fixUrl(decodeURIComponent(m[1]));
        } catch (_) { /* */ }
      }
      if (!src || /^data:/.test(src)) return;

      if (/getmarks\.app|quizrr\.in/i.test(cur + " " + src)
        && typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc) {
        const mapped = QxOwnedFigs.displaySrc(src);
        if (mapped && mapped !== cur) {
          img.dataset.qxOrigSrc = src;
          img.setAttribute("src", mapped);
          cur = mapped;
        }
      }

      // Irodov: local wiped figures. Never pin the old ink-eaten OCR map.
      if (isIrodovSrc(src) || isIrodovSrc(cur) || isIrodovSrc(img.dataset.qxOrigSrc)
        || img.classList.contains("qx-irodov-stem")) {
        const cdn = irodovCdnFromAny(img.dataset.qxOrigSrc || src || cur) || irodovCdnFromAny(cur);
        const local = irodovLocalSrc(img.dataset.qxOrigSrc || src || cur) || irodovLocalSrc(cur) || irodovLocalSrc(cdn);
        const disp = local || (cdn ? proxyImageUrl(cdn) : "");
        img.classList.add("qx-irodov-stem", "qx-pool-fig", "qx-no-wm", "qx-fig-ready", "qx-wm-clean");
        img.removeAttribute("crossorigin");
        img.crossOrigin = null;
        if (cdn) img.dataset.qxOrigSrc = cdn;
        if (disp && fixUrl(cur) !== fixUrl(disp)) img.setAttribute("src", disp);
        img.style.contentVisibility = "visible";
        img.style.opacity = "1";
        img.style.visibility = "visible";
        img.style.display = "block";
        img.loading = "eager";
        try { img.fetchPriority = "high"; } catch (_) { /* */ }
        img.dataset.qxFigFrozen = "1";
        img.dataset.qxSoftStrip = "2";
        img.dataset.qxSoftVer = STRIP_VER;
        img.dataset.qxHasWm = "0";
        n++;
        return;
      }

      // Already on current clean proxy — leave src UNLESS it wraps Firebase (proxy 400s those)
      if (/\/api\/proxy-image/i.test(cur) && /[?&]clean=1\b/i.test(cur) && /[?&]v=qxfig110\b/i.test(cur)) {
        let inner = "";
        try {
          const m = cur.match(/[?&]url=([^&\s]+)/);
          if (m) inner = decodeURIComponent(m[1]);
        } catch (_) { /* */ }
        if (/firebasestorage/i.test(inner)) {
          img.removeAttribute("crossorigin");
          img.crossOrigin = null;
          img.dataset.qxOrigSrc = inner;
          if (!keepWipeProxy(inner) && /irodov|qx-irodov/i.test(inner)) {
            img.setAttribute("src", inner);
          }
          img.classList.add("qx-fig-ready", "qx-pool-fig", "qx-no-wm", "qx-wm-clean");
          img.style.opacity = "1";
          img.style.visibility = "visible";
          img.style.display = "block";
          queueFigLayout(img);
          n++;
          return;
        }
        img.removeAttribute("crossorigin");
        img.crossOrigin = null;
        img.dataset.qxSoftStrip = "2";
        img.dataset.qxSoftVer = STRIP_VER;
        img.dataset.qxFigFrozen = "1";
        img.classList.add("qx-fig-ready", "qx-pool-fig", "qx-no-wm", "qx-wm-clean");
        img.style.opacity = "1";
        img.style.visibility = "visible";
        img.style.display = "block";
        return;
      }

      // Local clean already showing — keep visible
      if (isAlreadyCleanFigure(cur) || isPermanentCleanSrc(cur)
        || /hcv-|qx-irodov|qx-perm-|qx-alc-|\/assets\/diagrams\/qx-(?:book|self|org)-|\/assets\/diagrams\//i.test(cur)) {
        img.dataset.qxSoftStrip = "2";
        img.dataset.qxSoftVer = STRIP_VER;
        img.dataset.qxFigFrozen = "1";
        img.classList.add("qx-fig-ready", "qx-pool-fig");
        img.style.opacity = "1";
        img.style.visibility = "visible";
        img.style.display = "block";
        return;
      }

      const isPool = /cdn-question-pool|cdn\.quizrr|\/pyq\/|2026_modules\//i.test(src)
        || isRewritablePoolSrc(src, img)
        || /cdn-question-pool|cdn\.quizrr|\/pyq\/|2026_modules\//i.test(cur);
      if (!isPool && !resolveLocalFigureSrcSync(src)) return;

      img.dataset.qxOrigSrc = src;
      img.dataset.qxHdSrc = src;
      const disp = poolDisplaySrc(src) || src;
      img.removeAttribute("crossorigin");
      img.crossOrigin = null;
      if (disp && fixUrl(img.getAttribute("src") || "") !== fixUrl(disp)) {
        img.setAttribute("src", disp);
      }
      // Fallback chain: local miss → proxy → direct CDN
      if (!img.getAttribute("onerror") || !/data-qx-orig-src|qxOrigSrc/i.test(img.getAttribute("onerror") || "")) {
        img.onerror = function () {
          try {
            const orig = fixUrl(this.dataset.qxOrigSrc || this.dataset.qxHdSrc || "");
            const now = fixUrl(this.getAttribute("src") || "");
            if (!orig) return;
            if (/\/assets\//i.test(now) && orig && now !== orig) {
              this.removeAttribute("crossorigin");
              this.src = proxyImageUrl(orig);
              return;
            }
            if (/firebasestorage/i.test(now)) {
              this.removeAttribute("crossorigin");
              if (this.dataset.qxFbRetry !== "1") {
                this.dataset.qxFbRetry = "1";
                this.src = proxyImageUrl(now) + "&r=" + Date.now();
                return;
              }
              return;
            }
            if (/proxy-image/i.test(now) && orig) {
              this.removeAttribute("crossorigin");
              const owned = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.ownedFigureUrl)
                ? QxOwnedFigs.ownedFigureUrl(orig)
                : "";
              if (/firebasestorage/i.test(orig) || /firebasestorage/i.test(owned)) {
                const fb = owned || orig;
                if (/irodov|qx-irodov/i.test(fb) && !keepWipeProxy(fb)) {
                  this.src = fb;
                  return;
                }
                if (this.dataset.qxProxyRetryHtml !== "1") {
                  this.dataset.qxProxyRetryHtml = "1";
                  this.src = proxyImageUrl(fb) + "&r=" + Date.now();
                  return;
                }
                this.alt = "Figure";
                this.style.opacity = "1";
                this.style.display = "block";
                this.style.background = "#fff";
                return;
              }
              if (this.dataset.qxProxyRetryHtml !== "1") {
                this.dataset.qxProxyRetryHtml = "1";
                this.src = proxyImageUrl(owned || orig) + "&r=" + Date.now();
                return;
              }
              if (owned && !/getmarks\.app|quizrr\.in/i.test(owned)) this.src = owned;
              return;
            }
          } catch (_) { /* */ }
        };
      }
      img.classList.add("qx-pool-fig", "qx-fig-ready", "qx-no-wm", "qx-wm-clean", "qx-cleaned");
      img.classList.remove("qx-marks-native-fig");
      img.style.opacity = "1";
      img.style.visibility = "visible";
      img.style.display = "block";
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.loading = "eager";
      img.dataset.qxSoftStrip = "2";
      img.dataset.qxSoftVer = STRIP_VER;
      img.dataset.qxFigFrozen = "1";
      img.dataset.qxHasWm = "0";
      img.dataset.qxProcessedVer = String(CLEAN_VER);
      n++;
    });
    return n;
  }

  function poolDisplaySrc(cdnSrc) {
    const cdn = canonicalCdnSrc(cdnSrc) || fixUrl(cdnSrc || "");
    if (!cdn) return "";
    // Black Book / pre-site graphs — local /images or vercel.app absolute, never proxy-wipe
    if (/\/images\/[^?\s]+\.(png|jpe?g|webp|gif)/i.test(cdn)
      || /quantrex-academy\.vercel\.app\/images\//i.test(cdn)
      || /\bqx-bb-fig\b/i.test(cdn)) {
      if (cdn.startsWith("/images/")) return cdn.split("?")[0] || cdn;
      return cdn.split("?")[0] || cdn;
    }
    // Irodov: local wiped PNG first
    if (isIrodovSrc(cdn)) {
      const local = irodovLocalSrc(cdn);
      if (local) return local;
      const iro = irodovCdnFromAny(cdn);
      if (iro) return proxyImageUrl(iro);
    }
    // 1) Local clean map first (HCV / other books) — instant, no proxy hang
    const local = resolveLocalFigureSrcSync(cdn);
    if (local) return local;
    // Already-clean organic figures — Firebase wiped copy (bypass stale Vercel PNG cache)
    if (isAlreadyCleanFigure(cdn) || /\/assets\/diagrams\/qx-org-/i.test(cdn)) {
      const file = String(cdn.split("?")[0].split("/").pop() || "");
      if (/^qx-org-/i.test(file)) return qxFigFirebaseUrl(file, "org") || normalizeAssetSrc(cdn) || cdn;
      return normalizeAssetSrc(cdn) || cdn;
    }
    // Owned Firebase copies — wipe via our proxy (fetch is Quantrex Storage, not Marks).
    if (/firebasestorage\.googleapis\.com|quantrexacademy-app\.firebasestorage/i.test(cdn)) {
      if (needsMarksCleanProxy(cdn)) return proxyImageUrl(cdn);
      return cdn;
    }
    // Pool / quizrr leftovers — remap to Quantrex Storage then wipe
    if (isGetmarksPool(cdn) || /cdn\.quizrr\.in|watermarked_images/i.test(cdn)) {
      if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc) {
        return QxOwnedFigs.displaySrc(cdn) || proxyImageUrl(cdn);
      }
      return proxyImageUrl(cdn);
    }
    // Bare /pyq/ on leftover pool paths only (not Firebase %2Fpyq%2F)
    if (/\/pyq\//i.test(cdn) && /cdn-question-pool|getmarks/i.test(cdn)) {
      if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc) {
        return QxOwnedFigs.displaySrc(cdn) || proxyImageUrl(cdn);
      }
      return proxyImageUrl(cdn);
    }
    const perm = permCleanSrc(cdn);
    if (perm) return perm;
    if (/\/assets\/diagrams\/qx-(?:book|self|org)-/i.test(cdn)) {
      if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc) {
        const d = QxOwnedFigs.displaySrc(cdn);
        if (d && d !== cdn) return d;
      }
      return cdn.split("?")[0] || cdn;
    }
    if (needsMarksCleanProxy(cdn) || /2026_modules\//i.test(cdn)) {
      return proxyImageUrl(cdn);
    }
    // other local (hcv etc.) direct
    if (isBookOrLocalFigure(cdn)) return cdn.split("?")[0] || cdn;
    return cdn;
  }

  function setApiImgCors(img) {
    if (!img) return;
    // Same-origin proxy does not need CORS. crossorigin="anonymous" taints/fails
    // display and then onerror swaps to raw Marks CDN (Irodov looks blank/dark).
    img.removeAttribute("crossorigin");
    img.crossOrigin = null;
  }

  function stripDisplayCors(img) {
    if (!img) return;
    img.removeAttribute("crossorigin");
    img.crossOrigin = null;
  }

  async function ensurePoolDisplay(img, cdnSrc) {
    if (!img || !cdnSrc) return false;
    const display = poolDisplaySrc(cdnSrc);
    if (!display || display === fixUrl(cdnSrc)) return false;
    return loadDisplaySrc(img, display, cdnSrc);
  }

  function restoreImageUrl(cdnSrc) {
    const fixed = fixUrl(cdnSrc);
    return `${apiBase()}/api/restore-image?url=${encodeURIComponent(fixed)}`;
  }

  async function fetchRestoredBlob(cdnSrc) {
    try {
      const r = await fetch(restoreImageUrl(cdnSrc), { cache: "no-store" });
      if (!r.ok) return null;
      const blob = await r.blob();
      if (!blob || !blob.size) return null;
      return blob;
    } catch (_) {
      return null;
    }
  }

  function figureSrcIsDisplayable(src) {
    const s = fixUrl(src || "");
    if (!s || s === FIG_PLACEHOLDER || s.startsWith("data:image/gif")) return false;
    return s.includes("/api/restore-image") || s.includes("/api/proxy-image")
      || s.includes("clean-diagrams") || isLocalCleanAsset(s) || POOL_RX.test(s);
  }

  function primePoolFigure(img, cdnSrc) {
    if (!img || !cdnSrc) return;
    if (imgHasRealFigure(img)) {
      revealFigure(img);
      return;
    }
    const cur = fixUrl(img.getAttribute("src") || "");
    if (figureSrcIsDisplayable(cur) && img.naturalWidth > 0) {
      revealFigure(img);
      return;
    }
    const display = poolDisplaySrc(cdnSrc);
    if (!display || display === cur) return;
    img.dataset.qxOrigSrc = fixUrl(cdnSrc);
    img.dataset.qxPrimed = "1";
    img.setAttribute("src", display);
    revealFigure(img);
  }

  function hideFigureLoading(img) {
    if (!img || img.classList.contains("qx-pool-fig") || img.dataset.qxOrigSrc) return;
    const cur = fixUrl(img.getAttribute("src") || "");
    if (figureSrcIsDisplayable(cur) || img.dataset.qxPrimed === "1") return;
    img.classList.add("qx-wm-loading");
    img.classList.remove("qx-fig-ready");
    const stack = img.closest(".qx-fig-inner");
    if (stack) stack.classList.remove("qx-fig-ready");
  }

  function revealFigure(img) {
    if (!img) return;
    img.classList.remove("qx-wm-loading");
    img.classList.add("qx-fig-ready");
    img.style.removeProperty("opacity");
    img.style.removeProperty("visibility");
    const stack = img.closest(".qx-fig-inner");
    if (stack) stack.classList.add("qx-fig-ready");
  }

  function markDisplayClean(img) {
    if (!img) return;
    img.dataset.qxCleaned = "1";
    img.dataset.qxCleanVer = String(CLEAN_VER);
    img.dataset.qxRestoredSrc = "1";
    img.dataset.qxHasWm = "0";
    img.classList.remove("qx-img-flagged", "qx-wm-pending", "qx-wm-fallback");
    img.classList.add("qx-no-wm", "qx-cleaned", "qx-restored", "qx-wm-clean");
    const fig = img.closest(".qx-fig, .qx-opt-fig, .qx-diagram-slot, #qxDiagramSlot");
    if (fig) fig.classList.remove("qx-wm-pending-wrap", "qx-wm-fallback-wrap");
    markWmClean(img);
    revealFigure(img);
  }

  async function preloadCleanSrc(cdn) {
    const fixed = fixUrl(cdn);
    if (_cleanSrcCache.has(fixed)) return _cleanSrcCache.get(fixed);
    const task = (async () => {
      const manifestRel = await cleanUrl(fixed);
      let clean = null;
      if (isManifestCleanPath(manifestRel, fixed) && await manifestFileExists(manifestRel)) {
        clean = manifestRel;
      }
      return { cdn: fixed, clean };
    })();
    _cleanSrcCache.set(fixed, task);
    return task;
  }

  async function prepareQuestionFigures(q) {
    if (!q) return;
    rememberQuestionRaw(q);
    await Promise.all([
      loadManifest().catch(() => {}),
      loadPermFigureMap().catch(() => {}),
      loadBookFigureMaps().catch(() => {}),
      loadFigureOverrides().catch(() => {})
    ]);
    // Rewrite in-memory HTML to local figures when map is ready (Irodov etc.)
    try {
      if (q.q && /cdn-question-pool|cdn\.quizrr|https?:\/\/\.app|2026_modules/i.test(String(q.q))) {
        const rw = rewriteHtmlFigures(q.q);
        if (rw && rw !== q.q) q.q = rw;
      }
      if (Array.isArray(q.options)) {
        q.options = q.options.map(o => {
          if (!o || !/cdn-question-pool|cdn\.quizrr|https?:\/\/\.app|2026_modules/i.test(String(o))) return o;
          return rewriteHtmlFigures(o);
        });
      }
    } catch (_) { /* */ }
    const urls = new Set();
    extractPoolSrcs(q.q || "").forEach(u => urls.add(fixUrl(u)));
    (q.options || []).forEach((opt, i) => {
      extractPoolSrcs(opt || "").forEach(u => urls.add(fixUrl(u)));
      const key = String(q.id) + ":opt:" + i;
      if (window._qxDiagramRaw && window._qxDiagramRaw[key]) {
        extractPoolSrcs(window._qxDiagramRaw[key]).forEach(u => urls.add(fixUrl(u)));
      }
    });
    if (!urls.size) return;
    void Promise.all([...urls].map(u => preloadCleanSrc(u)));
  }

  function waitForMarksHide(img, ms) {
    const limit = ms || 4000;
    return new Promise(resolve => {
      const start = Date.now();
      const tick = () => {
        if (!img || !img.isConnected) return resolve();
        const stack = img.closest(".qx-fig-inner");
        if (img.dataset.qxPremiumWm === "1" || (stack && stack.classList.contains("qx-marks-hidden"))) return resolve();
        if (img.dataset.qxHasWm === "0" || img.classList.contains("qx-wm-clean")) return resolve();
        if (Date.now() - start > limit) return resolve();
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  function loadDisplaySrc(img, src, cdnSrc) {
    if (!img || !src) return Promise.resolve(false);
    img.dataset.qxOrigSrc = fixUrl(cdnSrc || src);
    img.removeAttribute("crossorigin");
    img.crossOrigin = null;
    const prevSrc = img.getAttribute("src") || "";
    return new Promise(resolve => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (ok && img.naturalWidth > 0) {
          markDisplayClean(img);
          revealFigure(img);
          resolve(true);
          return;
        }
        resolve(false);
      };
      const timer = setTimeout(() => finish(false), 12000);
      img.addEventListener("load", () => finish(img.naturalWidth > 0), { once: true });
      img.addEventListener("error", () => {
        const hint = cdnSrc || img.dataset.qxOrigSrc || src;
        // Irodov raw CDN is a dark MARKS scan — never fall back to it (looks blank).
        if (isIrodovSrc(hint) || isIrodovSrc(src) || img.classList.contains("qx-irodov-stem")) {
          finish(false);
          return;
        }
        // Never fall back to Marks / Quizrr CDN
        if (/getmarks|quizrr|examgoal\.net/i.test(String(hint))) {
          finish(false);
          return;
        }
        if (prevSrc && prevSrc !== src && !img.naturalWidth && !prevSrc.includes("data:image/gif")) {
          img.setAttribute("src", prevSrc);
        }
        finish(false);
      }, { once: true });
      if (img.getAttribute("src") !== src) img.src = src;
      else if (img.complete) finish(img.naturalWidth > 0);
    });
  }

  async function loadPoolFigureSrc(img, cdnSrc) {
    if (!img || !cdnSrc) return false;
    const cdn = canonicalCdnSrc(cdnSrc) || fixUrl(cdnSrc);
    // 1) CORS proxy (best — Quantrex WM canvas)  2) direct CDN  3) local clean
    if (await loadDisplaySrc(img, poolDisplaySrc(cdn), cdn)) return true;
    if (await loadDisplaySrc(img, cdn, cdn)) return true;
    const manifestRel = await cleanUrl(cdn);
    if (isManifestCleanPath(manifestRel, cdn) && await manifestFileExists(manifestRel)) {
      if (await loadDisplaySrc(img, manifestRel, cdn)) return true;
    }
    return false;
  }

  function waitForImageLoad(img, ms) {
    if (!img) return Promise.resolve(false);
    if (img.naturalWidth > 0) return Promise.resolve(true);
    return new Promise(resolve => {
      const limit = ms || 10000;
      const done = (ok) => {
        clearTimeout(timer);
        resolve(!!ok && img.naturalWidth > 0);
      };
      const timer = setTimeout(() => done(false), limit);
      img.addEventListener("load", () => done(true), { once: true });
      img.addEventListener("error", () => done(false), { once: true });
      if (img.complete) done(img.naturalWidth > 0);
    });
  }

  async function resolveAndShowClean(img, cdnSrc) {
    if (!img || !cdnSrc) return false;
    if (img.dataset.qxRestoreTried === String(CLEAN_VER) && isCleanedImg(img) && img.naturalWidth > 0) return true;

    if (isOrganicOrgSrc(cdnSrc)) {
      const cached = await getCachedBlob(cdnSrc);
      if (cached && await blobLooksValid(cached)) {
        const ok = await applyOrganicCleanedBlob(img, cached, cdnSrc);
        if (ok) {
          img.dataset.qxRestoreTried = String(CLEAN_VER);
          return true;
        }
      }
      return false;
    }

    if (isLocalReadyAsset(cdnSrc)) {
      const busted = normalizeAssetSrc(cdnSrc);
      if (busted && await loadDisplaySrc(img, busted, cdnSrc)) {
        img.dataset.qxRestoreTried = String(CLEAN_VER);
        return true;
      }
      img.dataset.qxRestoreTried = String(CLEAN_VER);
      return false;
    }

    const cached = await getCachedBlob(cdnSrc);
    if (cached && await blobLooksValid(cached)) {
      const url = URL.createObjectURL(cached);
      try {
        if (await loadDisplaySrc(img, url, cdnSrc)) {
          img.dataset.qxRestoreTried = String(CLEAN_VER);
          return true;
        }
      } finally {
        if (String(img.getAttribute("src") || "") !== url) URL.revokeObjectURL(url);
      }
    }

    if (await loadPoolFigureSrc(img, cdnSrc)) {
      img.dataset.qxRestoreTried = String(CLEAN_VER);
      return true;
    }
    img.dataset.qxRestoreTried = String(CLEAN_VER);
    return false;
  }

  async function tryShowRestored(img, cdnSrc) {
    return resolveAndShowClean(img, cdnSrc);
  }

  function markPendingMask(img) {
    if (!img.classList.contains("qx-cleaned")) {
      ensureDiagramWrap(img);
      img.classList.add("qx-wm-pending");
      const fig = img.closest(".qx-fig, .qx-opt-fig");
      if (fig) fig.classList.add("qx-wm-pending-wrap");
    }
  }

  function restoreOriginal(img) {
    // NEVER restore raw Marks/Quizrr CDN (shows watermark). Always clean proxy.
    const orig = img.dataset.qxOrigSrc || img.getAttribute("src") || "";
    if (!orig) return;
    stripDisplayCors(img);
    let next = orig;
    if (/cdn-question-pool|cdn\.quizrr|\/pyq\/|watermarked_images|getmarks\.app/i.test(orig)
      || (/proxy-image/i.test(orig) && !/[?&]clean=1\b/i.test(orig))) {
      next = proxyImageUrl(orig);
    } else if (/proxy-image/i.test(orig) && /[?&]clean=1\b/i.test(orig)) {
      next = orig;
    } else if (/cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(String(img.getAttribute("src") || ""))) {
      next = proxyImageUrl(img.getAttribute("src"));
    }
    if (next && img.getAttribute("src") !== next) img.src = next;
    img.classList.remove("qx-img-flagged");
    img.classList.add("qx-no-wm", "qx-wm-clean", "qx-pool-fig");
    img.style.display = "";
    img.style.visibility = "";
    img.style.opacity = "1";
  }

  function loadProbe(url, useCors) {
    return new Promise(resolve => {
      const probe = new Image();
      if (useCors) probe.crossOrigin = "anonymous";
      probe.onload = () => resolve(probe.naturalWidth > 0 ? probe : null);
      probe.onerror = () => resolve(null);
      probe.src = url;
    });
  }

  async function loadForCanvas(cdnSrc, manifestPath) {
    if (isOrganicOrgSrc(cdnSrc)) {
      const localPath = normalizeAssetSrc(cdnSrc);
      const local = await loadProbe(localPath, false);
      if (local) return { img: local, source: localPath, canRead: true };
    }
    if (manifestPath && !manifestPath.startsWith("http")) {
      const local = await loadProbe(manifestPath, false);
      if (local) return { img: local, source: manifestPath, canRead: true };
    }
    const proxy = proxyImageUrl(cdnSrc);
    const viaProxy = await loadProbe(proxy, true);
    if (viaProxy) return { img: viaProxy, source: proxy, canRead: true };
    const cors = await loadProbe(cdnSrc, true);
    if (cors) return { img: cors, source: cdnSrc, canRead: true };
    const display = await loadProbe(cdnSrc, false);
    if (display) return { img: display, source: cdnSrc, canRead: false };
    return null;
  }

  function canvasToBlob(canvas) {
    return new Promise(resolve => {
      canvas.toBlob(b => resolve(b), "image/png", 1.0);
    });
  }

  async function cleanOrganicFromProbe(probe) {
    const w = probe.naturalWidth || probe.width;
    const h = probe.naturalHeight || probe.height;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    try {
      ctx.drawImage(probe, 0, 0);
      const imageData = ctx.getImageData(0, 0, w, h);
      const stats = cleanOrganicOrgImageData(imageData.data, w, h);
      if (stats.damaged || !hasVisibleInk(imageData.data, w, h)) return { blob: null, stats };
      ctx.putImageData(imageData, 0, 0);
      const blob = await canvasToBlob(canvas);
      return { blob, stats };
    } catch (_) {
      return null;
    }
  }

  async function cleanFromProbe(probe) {
    const w = probe.naturalWidth || probe.width;
    const h = probe.naturalHeight || probe.height;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    try {
      ctx.drawImage(probe, 0, 0);
      const imageData = ctx.getImageData(0, 0, w, h);
      const stats = cleanImageData(imageData.data, w, h);
      const usable = !stats.damaged && (stats.improved || stats.removedRatio >= 0.002)
        && (stats.cleanEnough || stats.residueRatio <= WM_RESIDUE_MAX || stats.removedRatio >= 0.002);
      const fallback = !stats.damaged && stats.beforeInk > 0 && hasVisibleInk(imageData.data, w, h);
      if (!usable && !fallback) return { blob: null, stats };
      if (!hasVisibleInk(imageData.data, w, h)) return { blob: null, stats: { ...stats, damaged: true } };
      ctx.putImageData(imageData, 0, 0);
      const blob = await canvasToBlob(canvas);
      return { blob, stats };
    } catch (_) {
      return null;
    }
  }

  async function applyOrganicCleanedBlob(img, blob, src) {
    if (!blob || !img) return false;
    const preview = URL.createObjectURL(blob);
    try {
      const probe = await loadProbe(preview, false);
      if (!probe || !(await validateProbeInk(probe))) return false;
    } finally {
      URL.revokeObjectURL(preview);
    }
    await putCachedBlob(src, blob);
    const url = URL.createObjectURL(blob);
    return new Promise(resolve => {
      const done = async (ok) => {
        if (!ok || !img.isConnected) {
          URL.revokeObjectURL(url);
          hideOrganicPending(img);
          resolve(false);
          return;
        }
        img.dataset.qxCleaned = "1";
        img.dataset.qxCleanVer = String(CLEAN_VER);
        img.classList.add("qx-no-wm", "qx-cleaned", "qx-restored");
        stripDisplayCors(img);
        img.src = url;
        await waitForImageLoad(img, 8000);
        if (img.naturalWidth > 0) {
          restoreOrganicFigureSize(img);
          await finalizeOrganicOrgDisplay(img);
        }
        resolve(img.naturalWidth > 0);
      };
      img.addEventListener("load", () => { void done(true); }, { once: true });
      img.addEventListener("error", () => { void done(false); }, { once: true });
      stripDisplayCors(img);
      img.src = url;
      if (img.complete && img.naturalWidth > 0) void done(true);
    });
  }

  async function applyCleanedBlob(img, blob, src) {
    if (!blob) return false;
    if (isOrganicOrgSrc(src)) return applyOrganicCleanedBlob(img, blob, src);
    const preview = URL.createObjectURL(blob);
    try {
      const probe = await loadProbe(preview, false);
      if (!probe || !(await validateProbeInk(probe))) return false;
      const cdnProbe = await loadProbe(fixUrl(src), false);
      if (cdnProbe) {
        const mInk = await probeInkRatio(probe);
        const cInk = await probeInkRatio(cdnProbe);
        if (cInk > 0.01 && mInk < cInk * MIN_INK_VS_CDN) return false;
      }
    } finally {
      URL.revokeObjectURL(preview);
    }
    await putCachedBlob(src, blob);
    const url = URL.createObjectURL(blob);
    const prev = img.src;
    return new Promise(resolve => {
      const done = (ok) => {
        if (!ok) {
          URL.revokeObjectURL(url);
          restoreOriginal(img);
          resolve(false);
          return;
        }
        img.dataset.qxCleaned = "1";
        img.dataset.qxCleanVer = String(CLEAN_VER);
        img.classList.remove("qx-img-flagged");
        img.style.display = "";
        img.classList.add("qx-no-wm", "qx-cleaned", "qx-restored");
        void finalizeCleanDisplay(img).then(() => resolve(true));
      };
      img.addEventListener("load", () => done(true), { once: true });
      img.addEventListener("error", () => {
        img.src = prev;
        done(false);
      }, { once: true });
      stripDisplayCors(img);
      img.src = url;
    });
  }

  function waitForDisplay(img, url, forceReload) {
    return new Promise(resolve => {
      const finish = () => resolve(img.naturalWidth > 0);
      stripDisplayCors(img);
      const needsReload = forceReload || !img.naturalWidth || !img.getAttribute("src")
        || img.getAttribute("src") === window.location.href
        || String(img.getAttribute("src") || "").includes("://.app/");
      if (!needsReload && img.complete && img.naturalWidth > 0) return resolve(true);
      img.addEventListener("load", finish, { once: true });
      img.addEventListener("error", finish, { once: true });
      if (needsReload) img.src = url;
      else if (img.complete) finish();
    });
  }

  async function ensureVisible(img, cdnSrc) {
    stripDisplayCors(img);
    img.dataset.qxOrigSrc = cdnSrc;
    const current = fixUrl(img.getAttribute("src") || "");
    if (current !== cdnSrc) img.src = cdnSrc;
    await waitForDisplay(img, cdnSrc, current !== cdnSrc);
    return img.naturalWidth > 0;
  }

  async function blobLooksValid(blob) {
    if (!blob || !blob.size) return false;
    const url = URL.createObjectURL(blob);
    try {
      const probe = await loadProbe(url, false);
      return !!(probe && probe.naturalWidth > 0 && probe.naturalHeight > 0);
    } catch (_) {
      return false;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function tryDisplayManifest(img, manifestPath, cdnSrc) {
    if (!manifestPath || manifestPath.startsWith("http")) return false;
    const probe = await loadProbe(manifestPath, false);
    if (!probe || !(await validateProbeInk(probe))) return false;
    const cdnProbe = await loadProbe(cdnSrc, false);
    if (cdnProbe) {
      const mInk = await probeInkRatio(probe);
      const cInk = await probeInkRatio(cdnProbe);
      if (cInk > 0.01 && mInk < cInk * MIN_INK_VS_CDN) return false;
    }
    stripDisplayCors(img);
    img.dataset.qxOrigSrc = cdnSrc;
    const ok = await new Promise(resolve => {
      const finish = async (success) => {
        if (success && (await validateProbeInk(img))) {
          img.dataset.qxCleaned = "1";
          img.dataset.qxCleanVer = String(CLEAN_VER);
          img.classList.add("qx-no-wm", "qx-cleaned", "qx-restored");
          img.classList.remove("qx-img-flagged", "qx-wm-pending");
          const fig = img.closest(".qx-fig, .qx-opt-fig");
          if (fig) fig.classList.remove("qx-wm-pending-wrap");
          await finalizeCleanDisplay(img);
          resolve(true);
          return;
        }
        revertToCdn(img, cdnSrc);
        resolve(false);
      };
      img.addEventListener("load", () => finish(img.naturalWidth > 0), { once: true });
      img.addEventListener("error", () => finish(false), { once: true });
      img.src = manifestPath;
      if (img.complete) finish(img.naturalWidth > 0);
    });
    return ok;
  }

  async function tryClean(img, cdnSrc, manifestPath) {
    if (!img.naturalWidth) return false;

    const cached = await getCachedBlob(cdnSrc);
    if (cached && await blobLooksValid(cached)) {
      const ok = await applyCleanedBlob(img, cached, cdnSrc);
      if (ok) return true;
    }

    const restored = await fetchRestoredBlob(cdnSrc);
    if (restored && await blobLooksValid(restored)) {
      const ok = await applyCleanedBlob(img, restored, cdnSrc);
      if (ok) {
        await finalizeCleanDisplay(img);
        return true;
      }
    }

    const loaded = await loadForCanvas(cdnSrc, manifestPath);
    if (!loaded || loaded.canRead === false) return false;

    const result = await cleanFromProbe(loaded.img);
    if (!result || !result.blob) return false;
    if (!(await blobLooksValid(result.blob))) return false;
    const ok = await applyCleanedBlob(img, result.blob, cdnSrc);
    if (ok && img.naturalWidth > 0) {
      await finalizeCleanDisplay(img, result.stats);
      return true;
    }
    if (isGetmarksPool(cdnSrc) && await loadDisplaySrc(img, restoreImageUrl(cdnSrc), cdnSrc)) {
      await finalizeCleanDisplay(img, result.stats);
      return true;
    }
    if (await ensurePoolDisplay(img, cdnSrc)) return true;
    return false;
  }

  function attachErrorFallback(img) {
    if (img.dataset.qxErrBound === "1") return;
    img.dataset.qxErrBound = "1";
    img.addEventListener("load", () => {
      if (img.naturalWidth > 0) {
        img.dataset.qxProxyOk = "1";
        revealFigure(img);
      }
    });
    img.addEventListener("error", () => {
      const cdn = canonicalCdnSrc(img.dataset.qxOrigSrc || "") || fixUrl(img.dataset.qxOrigSrc || poolCdnSrc(img) || "");
      if (!cdn) {
        hideFigureLoading(img);
        img.style.opacity = "1";
        img.style.display = "block";
        if (window.QxOwnedFigs && QxOwnedFigs.retryOnError) QxOwnedFigs.retryOnError(img);
        return;
      }
      revealFigure(img);
      // NEVER fall back to raw Marks CDN (brings baked MARKS watermark).
      // Max 2 clean-proxy retries then stop (prevents hang / infinite error loop).
      if (img.dataset.qxProxyRetryA !== "1") {
        img.dataset.qxProxyRetryA = "1";
        img.dataset.qxOrigSrc = cdn;
        img.removeAttribute("crossorigin");
        img.setAttribute("src", proxyImageUrl(cdn));
        return;
      }
      if (img.dataset.qxProxyRetryB !== "1") {
        img.dataset.qxProxyRetryB = "1";
        img.setAttribute("src", proxyImageUrl(cdn) + "&r=" + Date.now());
        return;
      }
      // Give up cleanly — show placeholder, no more retries
      img.dataset.qxImgFailed = "1";
      hideFigureLoading(img);
      img.style.opacity = "1";
      img.style.display = "block";
      img.style.background = "#fff";
      if (window.QxOwnedFigs && QxOwnedFigs.retryOnError) QxOwnedFigs.retryOnError(img);
    });
  }

  function attachWatchdog(img, cdnSrc) {
    if (img.dataset.qxWatchdog === "1") return;
    img.dataset.qxWatchdog = "1";
    let lastGood = img.naturalWidth || 0;

    const heal = () => {
      if (!img.isConnected) return;
      const cdn = poolCdnSrc(img) || cdnSrc;
      if (!cdn || !POOL_RX.test(cdn)) return;
      const cur = fixUrl(img.getAttribute("src") || "");
      if (isWorkingAltSrc(img, cur)) return;
      if (cur.includes("/api/restore-image") && !img.naturalWidth && img.complete) {
        img.removeAttribute("crossorigin");
        img.setAttribute("src", proxyImageUrl(cdn));
        void upgradePoolFigure(img, cdn);
        return;
      }
      if (cur.includes("/api/proxy-image") && usingProxy(img)) return;
      if (isLocalCleanAsset(cur) || isLocalCleanAsset(cdn)) return;
      if (isCleanedImg(img) || usingRestoredSrc(img)) return;
      if (cur !== cdn && !cur.startsWith("blob:") && !cur.includes("clean-diagrams") && !cur.includes("/api/restore-image")) {
        keepPoolImageVisible(img, cdn);
      }
      if (img.naturalWidth > 0) lastGood = img.naturalWidth;
      else if ((lastGood > 0 || img.dataset.qxOrigSrc) && !usingRestoredSrc(img) && !isCleanedImg(img)) {
        void ensurePoolDisplay(img, cdn);
      }
    };

    img.addEventListener("load", heal);
    img.addEventListener("error", heal);
    let ticks = 0;
    const poll = setInterval(() => {
      if (!img.isConnected || isCleanedImg(img) || img.naturalWidth > 0) {
        clearInterval(poll);
        return;
      }
      heal();
      if (++ticks >= 8) clearInterval(poll);
    }, 800);
  }

  function attachSrcLock(img, cdnSrc) {
    if (img.dataset.qxSrcLock === "1" || !window.MutationObserver) return;
    if (isCleanedImg(img) || usingRestoredSrc(img)) return;
    img.dataset.qxSrcLock = "1";
    const obs = new MutationObserver(() => {
      if (!img.isConnected) { obs.disconnect(); return; }
      if (isCleanedImg(img) || usingRestoredSrc(img)) { obs.disconnect(); return; }
      const cdn = poolCdnSrc(img) || cdnSrc;
      const cur = fixUrl(img.getAttribute("src") || "");
      if (!cdn) return;
      if (cur.includes("/api/restore-image")) return;
      if (cur.includes("/api/proxy-image") && usingProxy(img)) return;
      if (cur.startsWith("blob:") || cur.startsWith("data:image")) return;
      if (img.dataset.qxSoftStrip === "2") { obs.disconnect(); return; }
      if (isLocalCleanAsset(cur) || isLocalCleanAsset(cdn)) return;
      if (cur.includes("clean-diagrams")) return;
      // Only re-pin if src was wiped/broken — never pull dirty CDN over a clean figure
      if (!cur || cur === FIG_PLACEHOLDER || cur.includes("://.app/")) keepPoolImageVisible(img, cdn);
    });
    obs.observe(img, { attributes: true, attributeFilter: ["src"] });
  }

  let legacyPurged = false;
  function purgeLegacyDbs() {
    if (legacyPurged || !window.indexedDB) return;
    legacyPurged = true;
    for (let v = 1; v <= 61; v++) {
      try { indexedDB.deleteDatabase(`quantrex_clean_images_v${v}`); } catch (_) {}
    }
  }

  function isCleanedImg(img) {
    if (!img) return false;
    const cur = fixUrl(img.getAttribute("src") || "");
    if (isOrganicOrgSrc(cur) && !cur.startsWith("blob:")) {
      return !!(img.dataset.qxCleaned === "1" && img.dataset.qxCleanVer === String(CLEAN_VER));
    }
    if (isLocalReadyAsset(cur) && (img.dataset.qxCleaned === "1" || img.classList.contains("qx-cleaned"))) return true;
    return !!(img.dataset.qxCleaned === "1" || img.classList.contains("qx-cleaned"));
  }

  function usingProxy(img) {
    return !!(img && (img.dataset.qxCdnFailed === "1" || img.dataset.qxProxyOk === "1"
      || String(img.getAttribute("src") || "").includes("/api/proxy-image")));
  }

  function usingRestoredSrc(img) {
    const cur = fixUrl(img.getAttribute("src") || "");
    // Soft-stripped data: URLs must NEVER be overwritten with dirty CDN (screen 636)
    return !!(img && (img.dataset.qxRestoredSrc === "1" || img.dataset.qxSoftStrip === "2"
      || cur.includes("/api/restore-image")
      || cur.startsWith("blob:") || cur.startsWith("data:image")
      || isLocalCleanAsset(cur) || cur.includes("clean-diagrams")));
  }

  function isWorkingAltSrc(img, cur) {
    if (!img || !cur) return false;
    if (isLocalCleanAsset(cur)) return true;
    if (cur.startsWith("data:image") || cur.startsWith("blob:")) return true;
    if (img.dataset && img.dataset.qxSoftStrip === "2") return true;
    if (img.naturalWidth <= 0) return false;
    return cur.includes("/api/restore-image") || cur.includes("clean-diagrams");
  }

  function keepPoolImageVisible(img, cdnSrc, force) {
    if (!img) return;
    const cdn = fixUrl(cdnSrc || poolCdnSrc(img) || "");
    if (!cdn) return;
    if (isLocalCleanAsset(cdn)) return;
    const cur = fixUrl(img.getAttribute("src") || "");
    // Never clobber a successful soft-strip (was re-applying MARKS watermark)
    if (!force && (cur.startsWith("data:image") || img.dataset.qxSoftStrip === "2")) return;
    if (isWorkingAltSrc(img, cur)) return;
    const broken = cur.includes("://.app/") || (!img.naturalWidth && img.complete);
    if (!force && !broken && isCleanedImg(img) && img.naturalWidth > 0) return;
    if (!force && !broken && usingRestoredSrc(img) && img.naturalWidth > 0) return;

    img.dataset.qxOrigSrc = cdn;
    img.classList.remove("qx-img-flagged", "qx-wm-pending");
    stripDisplayCors(img);
    const display = poolDisplaySrc(cdn);
    if (!force && usingProxy(img) && !broken) {
      const proxy = proxyImageUrl(cdn);
      if (!cur.includes("/api/proxy-image") && img.getAttribute("src") !== proxy) img.setAttribute("src", proxy);
    } else if (force || broken || !cur || cur === FIG_PLACEHOLDER || cur.includes("://.app/") || (isGetmarksPool(cdn) && cur === cdn)) {
      if (img.getAttribute("src") !== display) img.setAttribute("src", display);
    } else if (cur !== cdn && !usingRestoredSrc(img) && !cur.includes("clean-diagrams") && !cur.startsWith("blob:")) {
      if (img.getAttribute("src") !== display) img.setAttribute("src", display);
    }
    img.style.removeProperty("display");
    img.style.removeProperty("visibility");
    img.style.removeProperty("opacity");
    img.style.display = "block";
    img.style.visibility = "visible";
    img.style.opacity = "1";
    const fig = img.closest(".qx-fig, .qx-opt-fig, figure, .qx-img-wrap, .qx-diagram-slot, #qxDiagramSlot");
    if (fig) {
      fig.classList.remove("qx-wm-pending-wrap", "qx-img-under-review");
      fig.style.removeProperty("display");
      fig.style.removeProperty("visibility");
      fig.style.removeProperty("opacity");
      fig.style.display = "block";
      fig.style.visibility = "visible";
      fig.style.opacity = "1";
      fig.querySelectorAll(".qx-img-review-note").forEach(n => n.remove());
    }
    const slot = img.closest("#qxDiagramSlot, .qx-diagram-slot");
    if (slot) {
      slot.style.display = "block";
      slot.style.visibility = "visible";
      slot.style.opacity = "1";
    }
  }

  async function runCleanPipeline(img, cdnSrc) {
    if (!img || !img.isConnected || isCleanedImg(img) || img.dataset.qxHasWm !== "1") return;
    if (await resolveAndShowClean(img, cdnSrc)) return;
    const manifestRel = await cleanUrl(cdnSrc);
    const manifestPath = manifestRel && manifestRel !== cdnSrc && !manifestRel.startsWith("http")
      ? manifestRel : null;
    const ok = await tryClean(img, cdnSrc, manifestPath);
    if (!ok && !isCleanedImg(img)) {
      keepPoolImageVisible(img, cdnSrc);
      markWmNeedsOverlay(img);
      void retryInpaint(img, cdnSrc, 0);
    }
  }

  async function processImageAsync(img, cdnSrc) {
    if (!img || !img.isConnected) return;
    hideFigureLoading(img);
    try {
      if (await resolveAndShowClean(img, cdnSrc)) return;

      if (isOrganicOrgSrc(cdnSrc)) {
        hideOrganicPending(img);
        const loaded = await loadForCanvas(cdnSrc, null);
        if (loaded && loaded.canRead !== false) {
          const result = await cleanOrganicFromProbe(loaded.img);
          if (result && result.blob && await applyOrganicCleanedBlob(img, result.blob, cdnSrc)) {
            return;
          }
        }
        hideOrganicPending(img);
        return;
      }

      const cached = await preloadCleanSrc(cdnSrc);
      const manifestPath = cached.clean || null;
      if (manifestPath && await loadDisplaySrc(img, manifestPath, cdnSrc)) return;

      if (!img.naturalWidth && await loadPoolFigureSrc(img, cdnSrc)) return;

      if (await tryClean(img, cdnSrc, manifestPath)) return;

      const loaded = await loadForCanvas(cdnSrc, manifestPath);
      if (loaded && loaded.canRead !== false) {
        const result = await cleanFromProbe(loaded.img);
        if (result && result.blob && await applyCleanedBlob(img, result.blob, cdnSrc) && img.naturalWidth > 0) {
          await finalizeCleanDisplay(img, result.stats);
          return;
        }
      }

      if (await loadPoolFigureSrc(img, cdnSrc)) return;

      enhancePoolFigure(img);
      flagPoolWatermark(img, { hasWm: true, zones: defaultWmZones(cdnSrc) });
      applyWmCover(img);
      await waitForMarksHide(img);
    } finally {
      if (!img || !img.isConnected) return;
      if (isOrganicOrgSrc(cdnSrc)) {
        if (isCleanedImg(img) && img.naturalWidth > 0) {
          if (!img.dataset.qxCoachingWm) void finalizeOrganicOrgDisplay(img);
          return;
        }
        hideOrganicPending(img);
        return;
      }
      if (img.naturalWidth > 0) {
        revealFigure(img);
        if (!isCleanedImg(img)) removeCanvasShield(img);
        return;
      }
      primePoolFigure(img, cdnSrc);
      await waitForImageLoad(img, 10000);
      if (img.naturalWidth > 0) {
        markDisplayClean(img);
        return;
      }
      await loadPoolFigureSrc(img, cdnSrc);
      if (img.naturalWidth > 0) markDisplayClean(img);
      revealFigure(img);
    }
  }

  function processImage(img) {
    if (!img) return;
    let curSrc = fixUrl(img.getAttribute("src") || "");
    // Organic / already-clean local maps — never strip
    if (/\/api\/proxy-image/i.test(curSrc) && /[?&]clean=1\b/i.test(curSrc) && /[?&]v=qxfig110\b/i.test(curSrc)) {
      img.removeAttribute("crossorigin");
      img.crossOrigin = null;
      img.classList.add("qx-fig-ready", "qx-pool-fig", "qx-no-wm", "qx-wm-clean", "qx-cleaned");
      img.dataset.qxFigFrozen = "1";
      img.dataset.qxHasWm = "0";
      queueFigLayout(img);
      return;
    }
    if (isAlreadyCleanFigure(curSrc)
      || (isBookOrLocalFigure(curSrc) && !needsMarksCleanProxy(curSrc))) {
      const local = resolveLocalFigureSrcSync(curSrc) || resolveLocalFigureSrcSync(img.dataset.qxOrigSrc || "");
      if (local && local !== curSrc) {
        img.dataset.qxOrigSrc = curSrc;
        img.setAttribute("src", local);
        curSrc = local;
      }
      if (!needsMarksCleanProxy(curSrc)) {
        img.classList.add("qx-fig-ready", "qx-pool-fig", "qx-book-fig");
        img.style.opacity = "1";
        img.style.visibility = "visible";
        img.style.display = img.style.display || "inline-block";
        img.style.maxWidth = img.style.maxWidth || "min(100%, 420px)";
        img.style.height = "auto";
        return;
      }
    }
    // Native book HTML shell — still clean any Marks CDN/qx-book imgs inside
    if (img.closest(".qx-marks-native, .qx-marks-native-q, .qx-marks-native-opt")
      || isBookFigureContext(img)) {
      if (isAlreadyCleanFigure(curSrc)) {
        img.classList.add("qx-fig-ready", "qx-pool-fig", "qx-book-fig");
        return;
      }
    }
    if (isPermanentCleanSrc(curSrc) && !MARKS_NATIVE_PYQ) {
      freezePermanentFig(img, curSrc);
      return;
    }
    const cdnSrc = poolCdnSrc(img);
    if (!cdnSrc || !isPoolDiagram(cdnSrc, img)) return;

    // PYQ pool + Marks-origin book figures: clean proxy (no MARKS brand)
    if (!MARKS_NATIVE_PYQ && (needsMarksCleanProxy(cdnSrc) || /cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(cdnSrc))
      && !/\/assets\/diagrams\/qx-(?:book|self|org)-/i.test(cdnSrc)) {
      let raw = fixUrl(cdnSrc);
      if (/proxy-image|restore-image/i.test(raw)) {
        try {
          const u = new URL(raw, location.origin);
          const inner = u.searchParams.get("url");
          if (inner) raw = fixUrl(inner);
        } catch (_) { /* */ }
      }
      img.dataset.qxOrigSrc = raw;
      img.dataset.qxHdSrc = raw;
      const disp = poolDisplaySrc(raw);
      img.removeAttribute("crossorigin");
      img.crossOrigin = null;
      if (disp && fixUrl(img.getAttribute("src") || "") !== fixUrl(disp)) {
        img.setAttribute("src", disp);
      }
      img.classList.add("qx-pool-fig", "qx-fig-ready", "qx-no-wm", "qx-wm-clean", "qx-cleaned");
      img.classList.remove("qx-marks-native-fig");
      img.style.opacity = "1";
      img.style.visibility = "visible";
      img.style.display = "block";
      img.dataset.qxSoftStrip = "2";
      img.dataset.qxSoftVer = "31";
      img.dataset.qxFigFrozen = "1";
      img.dataset.qxProcessedVer = String(CLEAN_VER);
      img.dataset.qxHasWm = "0";
      attachErrorFallback(img);
      queueFigLayout(img);
      return;
    }

    const permHit = permCleanSrc(cdnSrc);
    if (permHit) {
      freezePermanentFig(img, permHit);
      return;
    }
    const STRIP_VER = "30";
    const stripDone = img.dataset.qxSoftStrip === "2" && img.dataset.qxSoftVer === STRIP_VER;
    if (img.dataset.qxProcessedVer === String(CLEAN_VER)) {
      if (stripDone && img.naturalWidth > 0) {
        revealFigure(img);
        return;
      }
      if (img.dataset.qxProcessing === "1") return;
    }

    if (isPreprocessedQxOrg(cdnSrc)) {
      captureOrganicDisplayWidth(img);
      const busted = normalizeAssetSrc(cdnSrc);
      if (busted) img.setAttribute("src", busted);
      img.dataset.qxHasWm = "0";
      img.classList.add("qx-cleaned", "qx-restored", "qx-wm-clean");
      void (async () => {
        await waitForImageLoad(img, 10000);
        if (img.isConnected && img.naturalWidth > 0) {
          finalizeQxOrgDisplay(img);
          queueSoftStrip(img);
        }
      })();
    } else if (isOrganicOrgSrc(cdnSrc)) {
      img.dataset.qxHasWm = "1";
      img.classList.remove("qx-cleaned", "qx-restored", "qx-wm-clean");
      delete img.dataset.qxCleaned;
      hideOrganicPending(img);
    } else if (isLocalReadyAsset(cdnSrc)) {
      const busted = normalizeAssetSrc(cdnSrc);
      if (busted && fixUrl(img.getAttribute("src") || "") !== fixUrl(busted)) {
        img.setAttribute("src", busted);
      }
    }

    attachErrorFallback(img);
    attachSrcLock(img, cdnSrc);
    attachWatchdog(img, cdnSrc);
    img.classList.add("qx-no-wm", "qx-pool-fig");
    img.dataset.qxProcessedVer = String(CLEAN_VER);
    if (!img.dataset.qxOrigSrc) img.dataset.qxOrigSrc = fixUrl(cdnSrc);

    ensureDiagramWrap(img);
    const fig = img.closest(".qx-fig, .qx-opt-fig, figure, .qx-img-wrap");
    if (fig) {
      fig.classList.add("qx-pool-fig-wrap");
      fig.style.removeProperty("display");
      fig.style.removeProperty("visibility");
      fig.style.removeProperty("opacity");
    }

    if (isCleanedImg(img) && (isLocalReadyAsset(cdnSrc) || isPreprocessedQxOrg(cdnSrc) || img.dataset.qxSoftVer === STRIP_VER)) {
      if (isPreprocessedQxOrg(cdnSrc) || img.dataset.qxDisplayW) {
        if (img.naturalWidth > 0) finalizeQxOrgDisplay(img);
        else img.addEventListener("load", () => finalizeQxOrgDisplay(img), { once: true });
      }
      revealFigure(img);
      if (!isPreprocessedQxOrg(cdnSrc)) void finalizeCleanDisplay(img);
      // Always soft-strip until v15 freezes (preprocessed qx-org can still carry residual MARKS)
      if (img.dataset.qxSoftVer !== STRIP_VER) queueSoftStrip(img);
      return;
    }

    primePoolFigure(img, cdnSrc);
    hideFigureLoading(img);

    const displaySrcNow = fixUrl(img.getAttribute("src") || "");
    if (img.dataset.qxPrimed === "1" || isApiFigureSrc(displaySrcNow)) {
      revealFigure(img);
      if (img.naturalWidth > 0) {
        void upgradePoolFigure(img, cdnSrc);
        return;
      }
      img.dataset.qxProcessing = "1";
      void (async () => {
        try {
          await waitForImageLoad(img, 12000);
          if (img.naturalWidth <= 0) await loadPoolFigureSrc(img, cdnSrc);
          if (img.naturalWidth > 0) await upgradePoolFigure(img, cdnSrc);
        } finally {
          revealFigure(img);
          delete img.dataset.qxProcessing;
        }
      })();
      return;
    }

    img.dataset.qxProcessing = "1";
    void processImageAsync(img, cdnSrc).finally(() => {
      delete img.dataset.qxProcessing;
    });
  }

  let observerStarted = false;
  let observerPending = false;
  const observerQueue = new Set();

  function queueProcessImage(img) {
    if (!img || img.nodeType !== 1) return;
    observerQueue.add(img);
    if (observerPending) return;
    observerPending = true;
    requestAnimationFrame(() => {
      observerPending = false;
      const batch = [...observerQueue];
      observerQueue.clear();
      batch.forEach(processImage);
    });
  }

  function startObserver() {
    observerStarted = true;
    if (typeof window !== "undefined" && !window._qxFigLandResize) {
      window._qxFigLandResize = 1;
      let t = 0;
      window.addEventListener("resize", () => {
        clearTimeout(t);
        t = setTimeout(() => {
          try {
            arrangePortraitFigures(document.getElementById("app-main") || document.body);
          } catch (_) { /* */ }
        }, 180);
      });
    }
  }

  function extractPoolFigureHtml(html, qid) {
    if (isMatchListOrTableFigureHtml(html)) return "";
    const override = getFigureOverrideSrc(html, qid);
    if (override && !/List[\s\-]*I/i.test(String(html || ""))) return poolFigureHtml(override);
    const parts = [];
    const s = String(html || "");
    const figRx = /<figure\b[^>]*>[\s\S]*?<\/figure>/gi;
    let fm;
    while ((fm = figRx.exec(s)) !== null) {
      if (POOL_RX.test(fm[0])) parts.push(fm[0]);
    }
    const imgRx = /<img\b[^>]*>/gi;
    let m;
    while ((m = imgRx.exec(s)) !== null) {
      const tag = m[0];
      const origM = tag.match(/\bdata-qx-orig-src=["']([^"']+)["']/i);
      const srcM = tag.match(/\bsrc=["']([^"']+)["']/i);
      let raw = origM ? origM[1] : (srcM ? srcM[1] : "");
      if (!raw) continue;
      if (isApiFigureSrc(raw)) raw = canonicalCdnSrc(raw) || "";
      if (!raw) continue;
      const src = canonicalCdnSrc(raw) || (isLocalCleanAsset(raw) ? normalizeAssetSrc(raw) : raw);
      if (!src || (!isPoolDiagram(src) && !isLocalCleanAsset(src))) continue;
      if (parts.some(p => p.includes(src))) continue;
      parts.push(poolFigureHtml(src, parseImgDisplayWidth(tag)));
    }
    return parts.join("");
  }

  function compactQuestionHtml(html) {
    return String(html || "")
      .replace(/(<br\s*\/?>\s*){2,}/gi, "<br>")
      .replace(/(<\/p>\s*)+<p[^>]*>/gi, "</p><p>")
      .replace(/<p>\s*<\/p>/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function stripDiagramTags(html) {
    return compactQuestionHtml(String(html || "")
      .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, " ")
      .replace(/<img\b[^>]*>/gi, " ")
      .replace(/<p>\s*<\/p>/gi, " "));
  }

  /** List-I/II (or any table with cell figures) — never pull imgs out of cells */
  function isMatchListOrTableFigureHtml(html) {
    const s = String(html || "");
    if (/\\begin\{array/i.test(s) && /List[\s\-]*I/i.test(s)) return true;
    if (!/<table/i.test(s)) return false;
    if (/List[\s\-]*I/i.test(s) && (/List[\s\-]*II/i.test(s) || /\([1-5]\)/.test(s))) return true;
    if (/\([PQRS]\)/.test(s) && /\([1-5]\)/.test(s)) return true;
    // Multi-cell structure diagrams inside a table
    if (/<table[\s\S]*?<img\b[\s\S]*?<\/table>/i.test(s)) return true;
    // Self-closing / unclosed tables with quizrr watermarked assets
    if (/<table[\s\S]*?cdn\.quizrr[\s\S]*?<\/table>/i.test(s)) return true;
    if (/<table[\s\S]*?watermarked_images[\s\S]*?<\/table>/i.test(s)) return true;
    return false;
  }

  /**
   * Render List-I/II match HTML without Mx.stripBranding deleting cell figures.
   * Protects every <img> with a placeholder, renders text/math, restores images.
   */
  function renderTextChunk(chunk, renderFn) {
    const render = typeof renderFn === "function" ? renderFn : (t) => t;
    const s = String(chunk || "");
    if (!s.trim()) return s;
    try { return render(s); } catch (_) { return s; }
  }

  function renderMatchListHtml(rawHtml, renderFn) {
    const render = typeof renderFn === "function" ? renderFn : (t) => t;
    let raw = fixUrl(String(rawHtml || ""));
    raw = repairListDollarHeaders(raw);
    // Keep <table> markup intact. Running Mx.html on the full table escaped
    // </td></tr> as visible text (Q24475 live). Only render intro / cell text.
    const split = String(raw).match(/^([\s\S]*?)(<table\b[\s\S]*<\/table>)([\s\S]*)$/i);
    if (split) {
      const intro = renderTextChunk(split[1], render);
      let table = split[2];
      try { table = forceCleanProxyInHtml(table); } catch (_) { /* */ }
      table = table.replace(/#([0-9a-f]{3,8})\b/gi, "yellow");
      const colCount = ((table.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/i) || [""])[0].match(/<t[dh]\b/gi) || []).length;
      if (colCount >= 4) {
        table = /class\s*=/i.test(table)
          ? table.replace(/<table\b([^>]*?)class=(["'])([^"']*)\2/i, '<table$1class=$2$3 qx-match-list qx-match-4col$2')
          : table.replace(/<table\b/i, '<table class="qx-match-list qx-match-4col"');
      } else {
        table = /class\s*=/i.test(table)
          ? table.replace(/<table\b([^>]*?)class=(["'])([^"']*)\2/i, '<table$1class=$2$3 qx-match-list$2')
          : table.replace(/<table\b/i, '<table class="qx-match-list"');
      }
      table = table.replace(/(<t[dh][^>]*>)([\s\S]*?)(<\/t[dh]>)/gi, (_, open, inner, close) => {
        if (/<img\b/i.test(inner)) {
          const parts = String(inner).split(/(<img\b[^>]*>)/gi);
          const rebuilt = parts.map((p, i) => {
            if (/^<img\b/i.test(p)) return p;
            return p && /[A-Za-z\\$]/.test(p) ? renderTextChunk(p, render) : p;
          }).join("");
          return open + rebuilt + close;
        }
        if (!inner || !inner.trim()) return open + inner + close;
        return open + renderTextChunk(inner, render) + close;
      });
      const tail = split[3] ? renderTextChunk(split[3], render) : "";
      return intro + table + tail;
    }
    // Prefer local assets as-is (already clean); only proxy remote CDN
    if (!/assets\/diagrams\/qx-match/i.test(raw)) {
      try { raw = forceCleanProxyInHtml(raw); } catch (_) { /* */ }
    } else {
      // Normalize local match imgs: visible classes, no broken self-close
      raw = raw.replace(/<img\b([^>]*?)(\s*\/\s*)?>/gi, (full, attrs) => {
        let a = String(attrs || "").replace(/\/\s*$/, "").trim();
        const srcM = a.match(/\bsrc\s*=\s*(["'])([^"']*)\1/i);
        if (!srcM) return full;
        let src = srcM[2];
        if (src && !src.startsWith("/") && !/^https?:/i.test(src) && /assets\//i.test(src)) {
          src = "/" + src.replace(/^\.\//, "");
        }
        a = a.replace(/\bsrc\s*=\s*(["'])[^"']*\1/i, `src="${src}"`);
        a = a.replace(/\bdata-qx-orig-src\s*=\s*(["'])[^"']*\1/i, "");
        if (!/class=/i.test(a)) a += ' class="qx-pool-fig qx-no-wm qx-match-fig qx-local-fig"';
        else if (!/qx-local-fig|qx-match-fig/i.test(a)) {
          a = a.replace(/class=(["'])([^"']*)\1/i, "class=$1$2 qx-pool-fig qx-no-wm qx-match-fig qx-local-fig$1");
        }
        if (!/style=/i.test(a)) {
          a += ' style="max-width:min(100%,300px);height:auto;display:block!important;margin:6px auto 0;object-fit:contain;background:#fff;opacity:1;visibility:visible"';
        }
        if (!/loading=/i.test(a)) a += ' loading="eager"';
        return `<img ${a}>`;
      });
    }

    const slots = [];
    // Placeholder must NOT contain "watermark" or look like an img tag
    const protectedHtml = raw.replace(/<img\b[^>]*>/gi, (tag) => {
      const key = `§§QXMATCHFIG${slots.length}§§`;
      slots.push(tag);
      return key;
    });

    let body = "";
    try {
      body = render(protectedHtml);
    } catch (_) {
      body = protectedHtml;
    }
    // Restore images (render may escape § or split text)
    slots.forEach((tag, i) => {
      const keys = [
        `§§QXMATCHFIG${i}§§`,
        `§§QXMATCHFIG${i}§§`,
        `__QXMATCHFIG${i}__`,
        `QXMATCHFIG${i}`,
      ];
      // Also HTML-escaped variants
      keys.push(keys[0].replace(/§/g, "&#167;"));
      keys.forEach((k) => {
        if (body.indexOf(k) >= 0) body = body.split(k).join(tag);
      });
    });
    // If placeholders were eaten, append nothing — but try common escape
    if (slots.length && (body.match(/<img\b/gi) || []).length < slots.length) {
      // Fallback: render intro only + raw table with images (no strip)
      const m = String(rawHtml || "").match(/^([\s\S]*?)(<table\b[\s\S]*?<\/table>)([\s\S]*)$/i);
      if (m) {
        let intro = "";
        try { intro = render(m[1]); } catch (_) { intro = m[1]; }
        let tail = "";
        try { tail = render(m[3] || ""); } catch (_) { tail = m[3] || ""; }
        let table = m[2];
        if (/assets\/diagrams\/qx-match/i.test(table)) {
          table = table.replace(/<img\b([^>]*?)(\s*\/\s*)?>/gi, (full, attrs) => {
            let a = String(attrs || "").replace(/\/\s*$/, "").trim();
            if (!/class=/i.test(a)) a += ' class="qx-pool-fig qx-no-wm qx-match-fig qx-local-fig"';
            return `<img ${a}>`;
          });
        } else {
          try { table = forceCleanProxyInHtml(table); } catch (_) { /* */ }
        }
        body = intro + table + tail;
      } else {
        body = raw; // last resort: unrendered but images present
      }
    }
    return body;
  }

  /**
   * Drop spilled figure URLs / leftover img attributes from TEXT only.
   * Never punch /api/proxy-image out of a live <img src> (that leaked
   * loading="lazy" and %2F crumbs as option text — screenshots 912–914).
   */
  function stripSpilledFigUrls(html) {
    let s = String(html || "");
    const slots = [];
    s = s.replace(/<[^>]+>/g, (tag) => {
      const k = "\uE210" + slots.length + "\uE211";
      slots.push(tag);
      return k;
    });
    s = s.replace(/(?:https?:)?\/\/(?:cdn-question-pool|cdn\.quizrr)[^<\s]*/gi, "");
    s = s.replace(/(?:https?:\/\/|https?%3A%2F%2F|\/api\/proxy-image)[^\s<]*/gi, (url) => {
      if (/watermark|proxy-image|getmarks|quizrr|%2F|cdn-question|2026_modules|AKCR2_/i.test(url)) return "";
      return url;
    });
    s = s.replace(/\b(?:https?%3A%2F%2F)?(?:cdn-question-pool\.getmarks\.app|cdn\.quizrr\.in)[^<\s]*/gi, "");
    s = s.replace(/\b[A-Za-z0-9_.%/-]*(?:watermark_improved|watermarked_images|2026_modules|AKCR2_)[^<\s]*/gi, "");
    s = s.replace(/\/api\/proxy-image\?[^\s<]*/gi, "");
    s = s.replace(/\burl=https?[^\s<]*/gi, "");
    s = s.replace(/\b(?:getmarks\.app|cdn-question-pool)[^\s<]*/gi, "");
    s = s.replace(/\b(?:loading|decoding|fetchpriority|referrerpolicy|crossorigin)\s*=\s*["']?[\w-]*["']?/gi, "");
    s = s.replace(/\bdata-qx-[a-z0-9-]+\s*=\s*["'][^"']*["']/gi, "");
    s = s.replace(/\uE210(\d+)\uE211/g, (_, i) => slots[+i] || "");
    return s;
  }

  function isMeaningfulOptionText(t) {
    const s = String(t || "").trim();
    if (!s) return false;
    // Real answers: 3, 11, 14, 7, 2Bau, √3Bau, 1/2, 0.25
    if (/^[+\-]?\d+(?:\.\d+)?(?:\s*[/÷]\s*\d+(?:\.\d+)?)?$/.test(s)) return true;
    if (/^\$[\s\S]+\$$/.test(s)) return true;
    if (/\\(?:dfrac|frac|sqrt|mathrm|text)/.test(s) && s.length <= 80) return true;
    if (/\d/.test(s) && /[A-Za-z√π∞°]/.test(s) && s.length <= 48 && !/%2F|proxy|https?:/i.test(s)) return true;
    if (/^[+\-]?\d/.test(s) && s.length <= 24 && !/%2F|proxy|https?:|watermark/i.test(s)) return true;
    if (/^[A-Za-z√π∞][A-Za-z0-9√π∞°+\-/*^_{}\\$]{0,24}$/.test(s) && !/http|proxy|png|jpg/i.test(s)) return true;
    return false;
  }

  function isSpillGarbageText(s) {
    const t = String(s || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&(?:nbsp|amp|quot|lt|gt);/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!t) return true;
    if (isMeaningfulOptionText(t)) return false;
    if (/^(?:loading|decoding|async|eager|lazy|high|auto|referrerpolicy|no-referrer|crossorigin|fetchpriority|alt)(?:\s+|=|["']|$)/i.test(t)
      && t.length < 96) return true;
    // Path crumbs from a punched <img> (ss 912–914 / live 27189)
    if (/%2F|&clean=|v\s*=\s*c93|watermarked/i.test(t) && /http|proxy|png|jpg|webp/i.test(t)) return true;
    if (/\.(?:png|jpe?g|webp|gif)\b/i.test(t) && /clean|alt\s*=|watermark/i.test(t)) return true;
    if (/["']\s*>\s*$/.test(t) && /alt|clean|src/i.test(t)) return true;
    if (/cdn-question-pool|getmarks\.app|proxy-image|watermark_improved|2026_modules|AKCR2_|quizrr\.in/i.test(t)
      && /https?:|%2F|\.png|\.jpg|src=/i.test(t)) {
      return true;
    }
    // Attribute crumbs only — never bare numbers like 3 / 11 / 14
    if (/^[\s"'=:/._%?&;,()\[\]#-]*$/.test(t)) return true;
    return false;
  }

  function sanitizeOptionLeftover(html) {
    let s = stripSpilledFigUrls(String(html || ""));
    s = s.replace(/<img\b[^>]*>/gi, " ");
    s = s.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, " ");
    if (isSpillGarbageText(s)) return "";
    return compactQuestionHtml(s);
  }

  function recoverSpilledPoolUrl(html) {
    const s = String(html || "");
    const enc = s.match(/https?%3A%2F%2Fcdn-question-pool\.getmarks\.app[^"'<\s]*/i);
    if (enc) {
      try { return decodeURIComponent(enc[0].replace(/&amp;/g, "&")); } catch (_) { /* */ }
    }
    const raw = s.match(/https?:\/\/cdn-question-pool\.getmarks\.app\/[^\s"'<>]+/i);
    if (raw) return raw[0].replace(/&amp;/g, "&");
    const path = s.match(/((?:jee_main|neet|jee_adv)[^\s"'<>]*watermark(?:ed|_improved|ed_images)(?:%2F|\/)[^\s"'<>]+)/i);
    if (path) {
      const rest = path[1].replace(/%2F/ig, "/").replace(/&amp;/g, "&").replace(/["'].*$/, "").replace(/[>\s].*$/, "");
      return "https://cdn-question-pool.getmarks.app/pyq/" + rest.replace(/^\/+/, "");
    }
    return "";
  }

  function forceCleanProxyInHtml(html) {
    const out = String(html || "").replace(/<img\b([^>]*?)(\s*\/\s*)?>/gi, (full, attrs) => {
      let a = String(attrs || "").replace(/\/\s*$/, "").trim();
      const srcM = a.match(/\bsrc\s*=\s*(["'])([^"']*)\1/i)
        || a.match(/\bsrc\s*=\s*([^\s>]+)/i);
      if (!srcM) return full;
      let src = srcM[2] != null ? srcM[2] : srcM[1];
      if (/proxy-image|restore-image/i.test(src)) {
        try {
          const u = new URL(src, "https://www.quantrexacademy.com");
          const inner = u.searchParams.get("url");
          if (inner) src = inner;
        } catch (_) { /* */ }
      }
      src = fixUrl(src);
      if (/cdn-assets\.getmarks\.app\/app_assets\/img\/(?:exams|ui)\//i.test(src + " " + a)
        && !CARD_ART_RX.test(src + " " + a)
        && !/fc-img|qx-fc-img|qx-rfc-img/i.test(a)) {
        return full;
      }
      if (CARD_ART_RX.test(src) || /fc-img|qx-fc-img|qx-rfc-img/i.test(a)) {
        const cardDisp = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc)
          ? QxOwnedFigs.displaySrc(src)
          : ("/api/proxy-image?url=" + encodeURIComponent(src) + "&clean=1&fc=1&v=qxfig110");
        if (cardDisp && cardDisp !== src) {
          const safeCard = String(cardDisp).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
          a = a.replace(/\bsrc\s*=\s*(["'])[\s\S]*?\1/i, "src=$1" + safeCard + "$1")
            .replace(/\bsrc\s*=\s*[^\s>]+/i, "src=\"" + safeCard + "\"");
          if (!/\bsrc=/i.test(a)) a += ' src="' + safeCard + '"';
          return `<img ${a}>`;
        }
      }
      const isPool = /cdn-question-pool|cdn\.quizrr|\/pyq\/|watermarked_images|getmarks\.app|2026_modules|AKCR2_/i.test(src);
      if (!isPool && !/proxy-image/i.test(String(srcM[0] || ""))) return full;
      const orig = (canonicalCdnSrc(src) || src).split("?")[0] || src;
      const proxy = isPool ? (proxyImageUrl(orig) || orig) : orig;
      const safeOrig = String(orig).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      const safeProxy = String(proxy).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
      a = a
        .replace(/\bsrc\s*=\s*(["'])[\s\S]*?\1/i, "")
        .replace(/\bsrc\s*=\s*[^\s>]+/i, "")
        .replace(/\bdata-qx-orig-src\s*=\s*(["'])[\s\S]*?\1/i, "")
        .replace(/\bdata-qx-orig-src\s*=\s*[^\s>]+/i, "")
        .replace(/\s*crossorigin(?:\s*=\s*(["'])[^"']*\1)?/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!/\bclass\s*=/i.test(a)) {
        a += ' class="qx-pool-fig qx-no-wm qx-fig-ready qx-wm-clean"';
      } else if (!/qx-pool-fig|qx-no-wm/i.test(a)) {
        a = a.replace(/\bclass\s*=\s*(["'])([^"']*)\1/i, (mm, q, c) =>
          `class=${q}${c} qx-pool-fig qx-no-wm qx-fig-ready qx-wm-clean${q}`
        );
      }
      if (!/\bloading\s*=/i.test(a)) a += ' loading="eager"';
      a += ` src="${safeProxy}" data-qx-orig-src="${safeOrig}" alt=""`;
      return `<img ${a.trim()}>`;
    });
    return stripSpilledFigUrls(out);
  }

  /**
   * Strip figures only outside <table>…</table> so List-I/II cell images stay.
   */
  function stripDiagramTagsOutsideTables(html) {
    const s = String(html || "");
    if (!/<table/i.test(s)) return stripDiagramTags(s);
    const parts = [];
    let last = 0;
    const re = /<table\b[\s\S]*?<\/table>/gi;
    let m;
    while ((m = re.exec(s)) !== null) {
      parts.push(stripDiagramTags(s.slice(last, m.index)));
      parts.push(m[0]); // keep table + cell images intact
      last = m.index + m[0].length;
    }
    parts.push(stripDiagramTags(s.slice(last)));
    return compactQuestionHtml(parts.join(""));
  }

  function splitQuestionHtml(html, qid) {
    const raw = compactQuestionHtml(html);
    // Match tables: keep full HTML as text; do not extract cell figures to a side slot
    if (isMatchListOrTableFigureHtml(raw)) {
      return { diagrams: "", text: raw, before: raw, after: "" };
    }
    const diagrams = extractPoolFigureHtml(raw, qid);
    const imgAt = raw.search(/<(?:figure|img)\b/i);
    if (imgAt < 0) {
      const text = stripDiagramTags(raw);
      return { diagrams, text, before: text, after: "" };
    }
    const before = stripDiagramTags(raw.slice(0, imgAt));
    const after = stripDiagramTags(raw.slice(imgAt));
    const text = [before, after].filter(Boolean).join(" ");
    return { diagrams, text, before, after };
  }

  function parseFigureFromTag(tag) {
    const block = String(tag || "");
    const imgM = block.match(/<img\b([^>]*)>/i);
    if (!imgM) return null;
    const attrs = imgM[1];
    const origM = attrs.match(/\bdata-qx-orig-src=["']([^"']+)["']/i)
      || attrs.match(/\bdata-qx-orig-src=([^\s>]+)/i);
    const srcM = attrs.match(/\bsrc=["']([^"']+)["']/i)
      || attrs.match(/\bsrc=([^\s>]+)/i);
    let raw = origM ? origM[1] : (srcM ? srcM[1] : "");
    raw = fixUrl(raw);
    if (isApiFigureSrc(raw)) raw = canonicalCdnSrc(raw) || "";
    if (!raw) return null;
    let src = "";
    if (isLocalCleanAsset(raw) || /\/assets\/(diagrams|qx-figures)\//i.test(raw)) {
      src = normalizeAssetSrc(raw);
    } else {
      const cdn = canonicalCdnSrc(raw) || (POOL_RX.test(raw) ? raw : "");
      if (cdn) src = cdn;
    }
    if (!src) return null;
    if (!isPoolDiagram(src) && !isLocalCleanAsset(src) && !/\/assets\/(diagrams|qx-figures)\//i.test(src)) {
      // Still accept obvious PYQ figure paths
      if (!/\/pyq\/|cdn-question-pool|cdn\.quizrr/i.test(src)) return null;
    }
    let dw = parseImgDisplayWidth(attrs);
    if (dw > 0 && dw < 180) dw = 0;
    return { src, displayW: dw };
  }

  function figureSrcKey(src) {
    let s = fixUrl(String(src || ""));
    if (isApiFigureSrc(s)) {
      const inner = canonicalCdnSrc(s);
      if (inner) s = inner;
    }
    const base = s.split("?")[0].replace(/\/$/, "").split("/").pop() || s;
    // Never collapse every /api/proxy-image to one key (that deleted option figures)
    if (/^proxy-image$/i.test(base) || /^restore-image$/i.test(base)) {
      return s.toLowerCase();
    }
    return base.toLowerCase();
  }

  function parseQuestionSegments(html, qid, q) {
    const override = getFigureOverrideSrc(html, qid);
    const raw = compactQuestionHtml(html);
    // Never replace a List-I/II stem with a single override figure (Q24475).
    if (override && !isMatchListOrTableFigureHtml(raw) && !/List[\s\-]*I/i.test(raw)) {
      let textOnly = stripDiagramTagsOutsideTables(raw);
      let hasText = stemPlainText(textOnly).length > 8;
      if (!hasText && q) {
        const extra = stripDiagramTagsOutsideTables(bestStemHtml(q, raw));
        if (stemPlainText(extra).length > 8) {
          textOnly = extra;
          hasText = true;
        }
      }
      if (hasText) {
        return [
          { type: "text", html: textOnly },
          { type: "figure", src: override, displayW: 0 }
        ];
      }
      return [{ type: "figure", src: override, displayW: 0 }];
    }
    const qSrc = questionImageSrc(q);

    // CRITICAL: List-I/II tables keep figures IN cells.
    // Extracting them left blank columns (screenshot blank match tables).
    if (isMatchListOrTableFigureHtml(raw)) {
      return [{ type: "text", html: raw }];
    }

    // Mask tables so images inside any table stay in the text stream
    const tableSlots = [];
    const masked = raw.replace(/<table\b[\s\S]*?<\/table>/gi, (block) => {
      const key = `\uE300${tableSlots.length}\uE301`;
      tableSlots.push(block);
      return key;
    });

    const figRx = /<figure\b[^>]*>[\s\S]*?<\/figure>|<img\b[^>]*>/gi;
    const segments = [];
    const seenFig = new Set();
    let last = 0;
    let m;
    while ((m = figRx.exec(masked)) !== null) {
      const text = masked.slice(last, m.index).trim();
      if (text) {
        segments.push({
          type: "text",
          html: text.replace(/\uE300(\d+)\uE301/g, (_, i) => tableSlots[+i] || "")
        });
      }
      const fig = parseFigureFromTag(m[0]);
      if (fig) {
        const key = figureSrcKey(fig.src);
        // Never emit the same figure twice in one question
        if (!seenFig.has(key)) {
          seenFig.add(key);
          segments.push({ type: "figure", src: fig.src, displayW: fig.displayW });
        }
      }
      last = m.index + m[0].length;
    }
    const tail = masked.slice(last).trim();
    if (tail) {
      segments.push({
        type: "text",
        html: tail.replace(/\uE300(\d+)\uE301/g, (_, i) => tableSlots[+i] || "")
      });
    }
    if (!segments.length && raw) segments.push({ type: "text", html: stripDiagramTagsOutsideTables(raw) });
    if (!segments.some(s => s.type === "figure") && qSrc) {
      segments.push({ type: "figure", src: qSrc, displayW: 0 });
    }
    // Strip imgs only outside tables (cell figures must remain)
    return segments.map(seg => {
      if (seg.type !== "text") return seg;
      return { type: "text", html: stripDiagramTagsOutsideTables(seg.html) };
    });
  }

  function pushPoolSrc(srcs, raw) {
    const cdn = canonicalCdnSrc(raw);
    if (!cdn || srcs.includes(cdn)) return;
    srcs.push(cdn);
  }

  function pushDiagramSrc(srcs, raw) {
    if (isLocalCleanAsset(raw)) {
      const local = normalizeAssetSrc(raw);
      if (local && !srcs.includes(local)) srcs.push(local);
      return;
    }
    pushPoolSrc(srcs, raw);
  }

  function extractPoolSrcs(html) {
    const srcs = [];
    const s = String(html || "");
    const origRx = /\bdata-qx-orig-src=["']([^"']+)["']/gi;
    let om;
    while ((om = origRx.exec(s)) !== null) pushDiagramSrc(srcs, om[1]);
    const rx = /\bsrc=["']([^"']+)["']/gi;
    let m;
    while ((m = rx.exec(s)) !== null) {
      let found = m[1];
      if (isApiFigureSrc(found)) found = canonicalCdnSrc(found) || "";
      if (!found) continue;
      pushDiagramSrc(srcs, found);
    }
    if (!srcs.length && POOL_RX.test(s)) {
      const urlRx = /(https?:\/\/[^\s"'<>]+|\/pyq\/[^\s"'<>]+)/gi;
      let um;
      while ((um = urlRx.exec(s)) !== null) {
        const raw = um[1].startsWith("/") ? PYQ_CDN.replace(/\/$/, "") + um[1] : um[1];
        pushPoolSrc(srcs, raw);
      }
    }
    if (!srcs.length) {
      const spilled = recoverSpilledPoolUrl(s);
      if (spilled) pushDiagramSrc(srcs, spilled);
    }
    return srcs;
  }

  function rememberQuestionRaw(q) {
    if (!q || q.id == null) return;
    try { pinOriginalQuestion(q); } catch (_) { /* */ }
    window._qxDiagramRaw = window._qxDiagramRaw || {};
    const id = String(q.id);
    const incoming = q._qxOrigStem || q._qxBankQ || q.q;
    const prev = window._qxDiagramRaw[id];
    if (!prev || stemPlainText(incoming) >= stemPlainText(prev)) {
      window._qxDiagramRaw[id] = incoming;
    }
    (q.options || []).forEach((o, i) => {
      const key = id + ":opt:" + i;
      const cur = window._qxDiagramRaw[key];
      if (!cur || String(o || "").length >= String(cur || "").length) {
        window._qxDiagramRaw[key] = o;
      }
    });
  }

  function imgIsLoading(img) {
    if (!img) return false;
    const src = fixUrl(img.getAttribute("src") || "");
    return !!src && !img.complete;
  }

  function mountDiagramSlot(slot, qid, rawHtml) {
    if (!slot) return;
    pinQuestionHtml(qid, rawHtml);
    const isOpt = slot.classList.contains("qx-opt-diagram-slot")
      || (qid != null && String(qid).includes(":opt:"));
    const q = (typeof getQ === "function" && qid != null && !isOpt) ? getQ(qid) : null;
    const entries = isOpt
      ? resolveOptionEntries(rawHtml, qid)
      : resolveDiagramEntries(rawHtml, qid, q);
    slot.classList.add("mathjax_ignore", "tex2jax_ignore");
    if (!isOpt) slot.classList.add("qx-pool-fig-wrap");
    slot.dataset.qxQid = String(qid);
    slot.dataset.qxLocked = "1";
    if (isOpt) slot.dataset.qxOptOne = "1";
    slot.style.display = "block";
    slot.style.visibility = "visible";
    slot.style.opacity = "1";

    // Already has a figure painted — never remount (was stacking twin structures)
    const existingImgs = Array.from(slot.querySelectorAll("img[src]"));
    if (isOpt && existingImgs.length) {
      // Collapse to a single img if somehow more than one
      for (let i = 1; i < existingImgs.length; i++) {
        const wrap = existingImgs[i].closest(".qx-opt-fig, figure.qx-fig, .qx-fig");
        if (wrap && wrap !== existingImgs[0].closest(".qx-opt-fig, figure.qx-fig, .qx-fig")) wrap.remove();
        else existingImgs[i].remove();
      }
      existingImgs[0] && processImage(existingImgs[0]);
      return;
    }

    if (!entries.length) return;

    const existing = Array.from(slot.querySelectorAll("img"));
    const existingSrcs = existing.map(i =>
      figureSrcKey(i.dataset.qxOrigSrc || i.getAttribute("src") || "")
    );
    const srcs = entries.map(e => figureSrcKey(e.src));
    if (srcs.length === existingSrcs.length && srcs.every((s, i) => s === existingSrcs[i])) {
      if (existing.some(imgIsLoading)) return;
      existing.forEach(img => processImage(img));
      return;
    }
    if (existing.some(imgIsLoading) && existingSrcs.length && srcs.length === existingSrcs.length) return;

    slot.innerHTML = isOpt
      ? entries.map(e => poolOptionFigureHtml(e.src, e.displayW)).join("")
      : entries.map(e => poolFigureHtml(e.src, e.displayW)).join("");
    slot.querySelectorAll("img").forEach(img => processImage(img));
  }

  function escAttr(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  // Retry Quantrex proxy/storage — never hide, never raw Marks CDN.
  const FIG_ONERROR = "if(window.QxOwnedFigs&&QxOwnedFigs.retryOnError){QxOwnedFigs.retryOnError(this);return;}this.removeAttribute('crossorigin');this.style.opacity='1';this.style.display='block';this.style.background='#fff';var t=+this.dataset.qxTries||0;var o=this.getAttribute('data-qx-orig-src')||this.getAttribute('data-qx-storage-src')||'';if(t<3&&o){this.dataset.qxTries=t+1;this.src='/api/proxy-image?url='+encodeURIComponent(o)+'&clean=1&v=qxfig110&r='+Date.now();}";

  function poolFigureHtml(cdn, displayW) {
    const src = normalizeAssetSrc(canonicalCdnSrc(cdn) || cdn);
    const u = escAttr(src);
    const organic = isPreprocessedQxOrg(src) || isOrganicOrgSrc(src);
    let dw = parseInt(displayW, 10) || 0;
    if (organic && dw <= 12) dw = ORGANIC_DEFAULT_FIG_W;
    const orgSrc = isOrganicOrgSrc(src);
    const iroFb = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.irodovStorageUrl)
      ? (QxOwnedFigs.irodovStorageUrl(src) || "")
      : "";
    const localClean = !iroFb && (isLocalReadyAsset(src) || isPreprocessedQxOrg(src));
    const pool = !iroFb && !localClean && !orgSrc && isPoolDiagram(src);
    // Pool → CORS proxy for soft-strip; Irodov always Firebase (local diagrams/ is not deployed)
    let displaySrc = u;
    if (iroFb) displaySrc = escAttr(iroFb);
    else if (pool) displaySrc = escAttr(poolDisplaySrc(src) || src);
    const corsAttr = "";
    const wmAttrs = localClean || isPreprocessedQxOrg(src)
      ? ` data-qx-has-wm="0" data-qx-cleaned="1"`
      : (pool
        ? ` data-qx-has-wm="1" data-qx-wm-zones="${escAttr(defaultWmZones(src).join(","))}" data-qx-primed="1"`
        : "");
    const cleanCls = " qx-cleaned qx-wm-clean qx-fig-ready";
    const imgDataW = dw > 12 ? ` data-qx-display-w="${dw}"` : "";
    // Flat ONE wrap + img only (single white box comes from outer slot CSS)
    // Do NOT mark qx-cleaned until soft-strip/proxy actually runs (was skipping MARKS wipe on PYQ)
    const readyCls = localClean || isPreprocessedQxOrg(src) ? cleanCls : " qx-fig-ready";
    const imgStyle = dw > 12
      ? ` style="--qx-fig-w:${dw}px;width:auto;height:auto;max-width:min(100%,${Math.max(dw, 240)}px);max-height:none;display:block;margin:8px auto;opacity:1;visibility:visible;object-fit:contain;background:#fff;"`
      : ` style="max-width:min(100%,760px);height:auto;max-height:none;display:block;margin:8px auto;opacity:1;visibility:visible;object-fit:contain;background:#fff;"`;
    const imgClass = ` class="qx-fig-img qx-no-wm qx-pool-fig${iroFb ? " qx-irodov-stem" : ""}${organic ? " qx-organic-fig qx-org-fig" : ""}${readyCls}"`;
    return `<div class="qx-fig-flat mathjax_ignore tex2jax_ignore"><img${imgClass}${imgDataW}${imgStyle} src="${displaySrc}" alt="" loading="eager" decoding="async" fetchpriority="high" data-qx-orig-src="${u}" data-qx-pinned="1"${wmAttrs} onerror="${FIG_ONERROR}"></div>`;
  }

  function buildSlotInnerHtml(rawHtml, qid, q) {
    const entries = resolveDiagramEntries(rawHtml, qid, q);
    if (entries.length) {
      return entries.map(e => poolFigureHtml(e.src, e.displayW)).join("");
    }
    const pinned = extractPoolFigureHtml(rawHtml, qid);
    return pinned || "";
  }

  function buildDiagramSlotHtml(qid, rawHtml, q) {
    if (qid == null || qid === "") return "";
    pinQuestionHtml(qid, rawHtml);
    const inner = buildSlotInnerHtml(rawHtml, qid, q);
    if (!inner) return "";
    return `<div class="qx-diagram-slot qx-pool-fig-wrap mathjax_ignore tex2jax_ignore" id="qxDiagramSlot" data-qx-qid="${qid}" data-qx-locked="1">${inner}</div>`;
  }

  function buildOptSlotHtml(qid, optIndex, rawHtml) {
    if (qid == null || qid === "") return "";
    const key = String(qid) + ":opt:" + optIndex;
    pinQuestionHtml(key, rawHtml);
    const entries = resolveOptionEntries(rawHtml, key);
    if (!entries.length) return "";
    // Flat option figure: one card, one img (no nested figure+inner double frames)
    const e = entries[0];
    const inner = poolOptionFigureHtml(e.src, e.displayW);
    return `<div class="qx-opt-diagram-slot qx-diagram-slot mathjax_ignore tex2jax_ignore" data-qx-qid="${key}" data-qx-locked="1" data-qx-opt-one="1">${inner}</div>`;
  }

  /** Compact option structure — single wrap + img (one back box only). */
  function poolOptionFigureHtml(cdn, displayW) {
    const src = normalizeAssetSrc(canonicalCdnSrc(cdn) || cdn);
    const u = escAttr(src);
    const organic = isPreprocessedQxOrg(src) || isOrganicOrgSrc(src);
    let dw = parseInt(displayW, 10) || 0;
    if (organic && dw <= 12) dw = ORGANIC_DEFAULT_FIG_W;
    const localClean = isLocalReadyAsset(src) || isPreprocessedQxOrg(src);
    const pool = !localClean && !isOrganicOrgSrc(src) && isPoolDiagram(src);
    let displaySrc = u;
    if (pool) displaySrc = escAttr(poolDisplaySrc(src) || src);
    const corsAttr = "";
    const wmAttrs = localClean
      ? ` data-qx-has-wm="0" data-qx-cleaned="1"`
      : (pool ? ` data-qx-has-wm="1" data-qx-primed="1"` : "");
    const cleanCls = " qx-cleaned qx-wm-clean qx-fig-ready";
    const imgDataW = dw > 12 ? ` data-qx-display-w="${dw}"` : "";
    const cap = dw > 12 ? Math.min(Math.max(dw, 180), 560) : 0;
    const imgStyle = cap
      ? ` style="--qx-fig-w:${cap}px;width:auto;height:auto;max-width:min(100%,${cap}px);max-height:none;display:block;margin:0 auto;opacity:1;visibility:visible;object-fit:contain;background:#fff;"`
      : ` style="max-width:min(100%,520px);height:auto;max-height:none;display:block;margin:0 auto;opacity:1;visibility:visible;object-fit:contain;background:#fff;"`;
    const imgClass = ` class="qx-fig-img qx-no-wm qx-pool-fig qx-opt-fig-img${organic ? " qx-organic-fig qx-org-fig" : ""}${cleanCls}"`;
    return `<div class="qx-fig-flat mathjax_ignore tex2jax_ignore"><img${imgClass}${imgDataW}${imgStyle} src="${displaySrc}" alt="" loading="eager" decoding="async" fetchpriority="high" data-qx-orig-src="${u}" data-qx-pinned="1"${wmAttrs} onerror="${FIG_ONERROR}"></div>`;
  }

  function optionDirectImgHtml(raw) {
    const entries = resolveOptionEntries(raw, null);
    if (entries.length) return poolOptionFigureHtml(entries[0].src, entries[0].displayW);
    const m = String(raw || "").match(/\bsrc=["']([^"']+)["']/i)
      || String(raw || "").match(/\bsrc=([^\s>]+)/i);
    if (!m) {
      const spilled = recoverSpilledPoolUrl(raw);
      if (spilled) return poolOptionFigureHtml(spilled, 0);
      return "";
    }
    let src = fixUrl(m[1]);
    if (isApiFigureSrc(src)) src = canonicalCdnSrc(src) || src;
    if (!src || src.startsWith("data:image/gif")) return "";
    return poolOptionFigureHtml(src, 0);
  }

  function renderOptionContent(qid, optIndex, rawOpt, renderText) {
    const q = (typeof getQ === "function" && qid != null) ? getQ(qid) : null;
    try { if (q) { pinOriginalQuestion(q); restoreOptionsFromPin(q); } } catch (_) { /* */ }
    const render = typeof renderText === "function" ? renderText : (t => t);
    let rawIn = rawOpt;
    if ((!rawIn || !String(rawIn).trim()) && q) {
      const fb = (q._qxOrigOptions || q._qxBankOptions || [])[optIndex];
      if (fb) rawIn = fb;
    }
    const raw = fixUrl(String(rawIn || ""));
    if (isMarksNativeBook(q)) {
      const cleaned = stripSpilledFigUrls(/<img\b/i.test(raw) ? forceCleanProxyInHtml(raw) : raw);
      return `<span class="qx-marks-native-opt">${render(cleaned)}</span>`;
    }
    const key = String(qid) + ":opt:" + optIndex;
    pinQuestionHtml(key, raw);
    // Image options: always keep a visible img path (never blank A/B/C/D boxes)
    if (/<img\b/i.test(raw)) {
      const slot = buildOptSlotHtml(qid, optIndex, raw);
      const { text } = splitQuestionHtml(raw, key);
      const leftover = sanitizeOptionLeftover(text);
      const nameM = String(raw).match(/^\s*([^<]{2,80}?)(?:\s*<img\b|$)/i);
      const nameOnly = nameM && !isSpillGarbageText(nameM[1]) ? String(nameM[1]).replace(/\s+/g, " ").trim() : "";
      const body = leftover ? render(leftover) : (nameOnly ? render(nameOnly) : "");
      if (slot) return slot + (body ? `<span class="qx-opt-text-only">${body}</span>` : "");
      // Slot builder failed — still emit one cleaned figure (never blank box)
      const direct = optionDirectImgHtml(raw);
      if (direct) {
        return `<div class="qx-opt-diagram-slot qx-diagram-slot mathjax_ignore tex2jax_ignore" data-qx-qid="${key}" data-qx-locked="1" data-qx-opt-one="1">${direct}</div>`
          + (body ? `<span class="qx-opt-text-only">${body}</span>` : "");
      }
      return `<span class="qx-opt-direct-img qx-content">${raw.replace(/src=(["'])(https?:\/\/[^"']+)\1/gi, (mm, qch, url) => {
        if (/proxy-image|data:/i.test(url)) return mm;
        if (/cdn-question-pool|cdn\.quizrr|\/pyq\//i.test(url)) {
          const prox = poolDisplaySrc(url) || url;
          return `src=${qch}${prox}${qch} data-qx-orig-src=${qch}${url}${qch}`;
        }
        return mm;
      })}</span>`;
    }
    if (isSpillGarbageText(raw)) {
      const direct = optionDirectImgHtml(raw);
      if (direct) {
        return `<div class="qx-opt-diagram-slot qx-diagram-slot mathjax_ignore tex2jax_ignore" data-qx-qid="${key}" data-qx-locked="1" data-qx-opt-one="1">${direct}</div>`;
      }
      return `<span class="qx-content">${render(raw)}</span>`;
    }
    return `<span class="qx-content">${render(raw)}</span>`;
  }

  function imgHasRealFigure(img) {
    if (!img) return false;
    const nw = img.naturalWidth || 0;
    const nh = img.naturalHeight || 0;
    if (nw < 40 || nh < 40) return false;
    const src = fixUrl(img.getAttribute("src") || "");
    if (!src || src === FIG_PLACEHOLDER || src.startsWith("data:image/gif")) return false;
    // Fully loaded and painted
    if (!img.complete) return false;
    return (img.offsetHeight > 24 || img.clientHeight > 24);
  }

  function slotFigureVisible(slot) {
    const slotImg = slot && slot.querySelector("img.qx-pool-fig, img");
    return imgHasRealFigure(slotImg);
  }

  function stripQuestionInlineImgs(root) {
    // Only remove DUPLICATE inline copies when a diagram slot already shows the same figure.
    // Never remove the only figure copy (blank question bug).
    const scope = root || document;
    if (scope.querySelector && scope.querySelector(".qx-marks-native, .qx-book-q, .mtk-test-root.qx-book-q")) return;
    if (typeof document !== "undefined" && document.body && document.body.classList.contains("qx-book-mode")) return;
    const slot = scope.querySelector("#qxDiagramSlot, .qx-question-body .qx-diagram-slot");
    if (!slotFigureVisible(slot)) return;
    const slotImg = slot.querySelector("img[src]");
    const slotKey = slotImg
      ? figureSrcKey(slotImg.dataset.qxOrigSrc || slotImg.getAttribute("src") || "")
      : "";
    if (!slotKey) return;
    scope.querySelectorAll(".mtk-q-text, .qx-q-text-only, .qa-q, .qx-prac-q, .qx-question-body .mtk-q-text").forEach(textEl => {
      if (textEl.closest(".qx-diagram-slot, #qxDiagramSlot")) return;
      if (textEl.classList.contains("qx-marks-native") || textEl.classList.contains("qx-marks-native-q")) return;
      textEl.querySelectorAll("img").forEach(img => {
        if (img.closest(".qx-diagram-slot, #qxDiagramSlot")) return;
        const key = figureSrcKey(img.dataset.qxOrigSrc || img.getAttribute("src") || "");
        // only strip exact duplicates of the slot figure
        if (key && key === slotKey) img.remove();
      });
    });
  }

  function stripInlinePoolImgs(root) {
    const scope = root || document;
    stripQuestionInlineImgs(scope);
    scope.querySelectorAll(".mtk-opt-text, .qx-prac-opt-text, .qa-opt .qx-content, .qx-prac-opt-text").forEach(textEl => {
      const slot = textEl.querySelector(".qx-opt-diagram-slot, .qx-diagram-slot");
      const slotImg = slot && slot.querySelector("img[src]");
      // If the slot already owns a figure src, drop every other option figure immediately
      // (do not wait for full load — waiting left twin structures on screen for 629)
      const slotHasSrc = !!(slotImg && (slotImg.getAttribute("src") || "").length > 8
        && slotImg.getAttribute("src") !== FIG_PLACEHOLDER);
      textEl.querySelectorAll("img").forEach(img => {
        if (img.closest(".qx-opt-diagram-slot, .qx-diagram-slot")) return;
        const cdn = fixUrl(img.getAttribute("src") || img.dataset.qxOrigSrc || "");
        const isFig = isPoolDiagram(cdn, img) || isLocalCleanAsset(cdn)
          || img.classList.contains("qx-pool-fig") || img.classList.contains("qx-fig-img");
        if (!isFig) return;
        if (slotHasSrc && img !== slotImg) img.remove();
        else processImage(img);
      });
    });
  }

  function finalizeDiagrams(root, q) {
    const scope = root || document;
    // Already-built segments: only process images, never remount full question HTML
    scope.querySelectorAll(".qx-diagram-seg[data-qx-qid]").forEach(slot => {
      slot.querySelectorAll("img").forEach(img => processImage(img));
    });
    // Empty locked slots only — if already has img, leave alone (prevents duplicate remount)
    scope.querySelectorAll("#qxDiagramSlot, .qx-diagram-slot[data-qx-qid]").forEach(slot => {
      if (slot.classList.contains("qx-diagram-seg")) return;
      if (slot.querySelector("img[src]")) {
        slot.querySelectorAll("img").forEach(img => processImage(img));
        return;
      }
      const qid = slot.dataset.qxQid;
      let raw = null;
      if (q && String(q.id) === String(qid)) raw = q.q;
      else if (window._qxDiagramRaw && window._qxDiagramRaw[String(qid)]) raw = window._qxDiagramRaw[String(qid)];
      if (raw) mountDiagramSlot(slot, qid, raw);
    });
  }

  function resolveCurrentQuestion(root) {
    if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.getSession && typeof getQ === "function") {
      const sess = QuantrexTestEngine.getSession();
      if (sess && sess.ids && sess.ids[sess.idx] != null) {
        const q = getQ(sess.ids[sess.idx]);
        if (q) return q;
      }
    }
    const scope = root || document;
    const qidEl = scope.querySelector(".qx-question-body[data-qx-qid], [data-qx-qid].mtk-q-text, [data-qx-qid].qx-q-text-only, #qxDiagramSlot[data-qx-qid]");
    if (qidEl && qidEl.dataset.qxQid && typeof getQ === "function") {
      const q = getQ(qidEl.dataset.qxQid);
      if (q) return q;
    }
    return null;
  }

  function dedupeOptionFigures(root) {
    const scope = root || document;
    scope.querySelectorAll(".mtk-opt, .qa-opt, .qx-prac-opt").forEach(btn => {
      const textEl = btn.querySelector(".mtk-opt-text, .qx-prac-opt-text, .qx-content") || btn;
      const imgs = Array.from(textEl.querySelectorAll("img")).filter(img => {
        const src = img.getAttribute("src") || img.dataset.qxOrigSrc || "";
        return /cdn-question-pool|\/pyq\/|qx-figures|proxy-image|qx-pool-fig|assets\/diagrams/i.test(src)
          || img.classList.contains("qx-pool-fig") || img.classList.contains("qx-fig-img");
      });
      if (imgs.length <= 1) return;
      // Keep first img inside a diagram slot if any; drop the rest
      let keep = imgs.find(i => i.closest(".qx-opt-diagram-slot, .qx-diagram-slot")) || imgs[0];
      imgs.forEach(img => {
        if (img === keep) return;
        const wrap = img.closest(".qx-opt-fig, figure.qx-fig, .qx-fig, .qx-opt-diagram-slot");
        // Never remove the whole slot if it still holds keep
        if (wrap && wrap.contains(keep)) {
          img.remove();
          return;
        }
        if (wrap && wrap !== keep.closest(".qx-opt-fig, figure.qx-fig, .qx-fig, .qx-opt-diagram-slot")) {
          wrap.remove();
        } else {
          img.remove();
        }
      });
      // Extra empty slots
      textEl.querySelectorAll(".qx-opt-diagram-slot").forEach((slot, idx) => {
        if (idx === 0) return;
        if (!slot.querySelector("img")) slot.remove();
        else if (keep && !slot.contains(keep)) slot.remove();
      });
    });
  }

  function finalizeOptionDiagrams(root, q) {
    const scope = root || document;
    // Only fill empty option slots — never remount over existing figures (629 twins)
    scope.querySelectorAll(".qx-opt-diagram-slot[data-qx-qid]").forEach(slot => {
      if (slot.querySelector("img[src]")) {
        slot.querySelectorAll("img").forEach(img => processImage(img));
        return;
      }
      const key = slot.dataset.qxQid;
      let raw = window._qxDiagramRaw && window._qxDiagramRaw[key];
      if (!raw && q && key && String(q.id) === String(key.split(":opt:")[0])) {
        const idx = parseInt(String(key).split(":opt:")[1], 10);
        if (!isNaN(idx)) raw = (q.options || [])[idx];
      }
      if (raw) mountDiagramSlot(slot, key, raw);
    });
    if (!q || !q.options) {
      dedupeOptionFigures(scope);
      stripInlinePoolImgs(scope);
      return;
    }
    const optBtns = scope.querySelectorAll(".mtk-opt, .qa-opt, .qx-prac-opt");
    (q.options || []).forEach((opt, i) => {
      const hasFig = /<img\b/i.test(String(opt || "")) || extractPoolSrcs(opt).length;
      if (!hasFig) return;
      const btn = optBtns[i];
      if (!btn) return;
      const textEl = btn.querySelector(".mtk-opt-text, .qx-prac-opt-text, .qx-content");
      if (!textEl) return;
      // Already showing a figure anywhere in the option — do not inject another
      if (textEl.querySelector("img[src]")) {
        textEl.querySelectorAll("img").forEach(img => processImage(img));
        return;
      }
      let slot = textEl.querySelector(".qx-opt-diagram-slot");
      if (!slot) {
        slot = document.createElement("div");
        slot.className = "qx-opt-diagram-slot qx-diagram-slot mathjax_ignore tex2jax_ignore";
        slot.dataset.qxQid = String(q.id) + ":opt:" + i;
        slot.dataset.qxLocked = "1";
        slot.dataset.qxOptOne = "1";
        textEl.insertBefore(slot, textEl.firstChild);
      }
      mountDiagramSlot(slot, q.id + ":opt:" + i, opt);
      // If still empty after mount, inject direct figure so boxes are never blank
      if (!slot.querySelector("img[src]")) {
        const direct = optionDirectImgHtml(opt);
        if (direct) slot.innerHTML = direct;
        slot.querySelectorAll("img").forEach(img => processImage(img));
      }
    });
    dedupeOptionFigures(scope);
    stripInlinePoolImgs(scope);
  }

  function applyBrandOverlays(root) {
    const scope = root || document.body;
    if (!scope) return;
    if (typeof QxPremiumWM !== "undefined" && QxPremiumWM.scanAllFigures) {
      QxPremiumWM.scanAllFigures(scope);
    }
    scope.querySelectorAll(".qx-diagram-slot, #qxDiagramSlot, .qx-opt-diagram-slot").forEach(slot => {
      directOverlayKids(slot).forEach(el => el.remove());
      slot.classList.remove("qx-wm-active");
    });
    scope.querySelectorAll("img.qx-pool-fig, img[src*='cdn-question-pool'], img[src*='/pyq/'], img[src*='/assets/diagrams/']").forEach(img => {
      removeCanvasShield(img);
      const target = overlayTargetForImg(img);
      if (target) syncBrandOverlay(target);
    });
  }

  function scrubOptionSpillDom(root) {
    const scope = root || document;
    if (!scope || !scope.querySelectorAll) return;
    try {
      scope.querySelectorAll(".mtk-opt-text, .qx-prac-opt-text, .qx-opt-text-only, .qx-marks-native-opt").forEach((el) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        const kill = [];
        let n;
        while ((n = walker.nextNode())) {
          const v = String(n.nodeValue || "").trim();
          if (!v) continue;
          if (isMeaningfulOptionText(v)) continue;
          if (isSpillGarbageText(n.nodeValue)) kill.push(n);
        }
        kill.forEach((node) => {
          if (node.parentNode) node.parentNode.removeChild(node);
        });
      });
    } catch (_) { /* */ }
  }

  function finalizeMarksNative(root, q) {
    const scope = root || document;
    if (q) rememberQuestionRaw(q);
    scope.querySelectorAll(".qx-marks-native img, .qx-marks-native-opt img").forEach(img => {
      const src = fixUrl(img.getAttribute("src") || "");
      if (src && src !== img.getAttribute("src")) img.setAttribute("src", src);
      img.classList.add("qx-marks-inline-fig");
      img.removeAttribute("crossorigin");
      img.loading = "eager";
      img.decoding = "async";
    });
  }

  function finalizeAll(root, q) {
    const scope = root || document;
    // Ensure Irodov/book local map is loading (non-blocking; re-run after resolve)
    try {
      if (!bookFigureMap || !bookFigureMap.size) {
        void loadBookFigureMaps().then(() => {
          try { rewriteAllPoolImgs(scope); } catch (_) { /* */ }
        });
      }
    } catch (_) { /* */ }
    // Digital books: keep previous native finalize (no canvas strip storms)
    if (isMarksNativeBook(q)) {
      try {
        finalizeMarksNative(root, q);
        rewriteAllPoolImgs(scope);
        ensureStemVisible(scope, q);
      } catch (_) { /* */ }
      return;
    }
    // PYQ practice: one light pass only (anti-hang)
    if (q) {
      try { rememberQuestionRaw(q); } catch (_) { /* */ }
    }
    try {
      rewriteAllPoolImgs(scope);
      scrubOptionSpillDom(scope);
      ensureStemVisible(scope, q);
      if (!inTestUi()) {
        scope.querySelectorAll(
          "#qxDiagramSlot img, .qx-diagram-slot img, .qx-opt-diagram-slot img, img.qx-pool-fig, .mtk-opt-text img, .qx-prac-opt-text img, .qx-prac-q img, .mtk-q-text img"
        ).forEach(img => {
          if (img.dataset.qxFigFrozen === "1" && img.naturalWidth > 0) {
            queueFigLayout(img);
            return;
          }
          processImage(img);
          queueFigLayout(img);
        });
        arrangePortraitFigures(scope);
      }
    } catch (e) {
      console.warn("finalizeAll", e);
    }
  }

  /**
   * NEVER destroy stem figures (was blanking questions like bromine sequence).
   * Only no-op: keep inline pool imgs visible so proxy-clean can show them.
   */
  function forceStripStemTextImgs(_root) {
    return;
  }

  function stemPlainText(html) {
    return String(html || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<img\b[^>]*>/gi, " ")
      .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;|&#160;|&#x0*A0;/gi, " ")
      .replace(/&(?:amp|lt|gt|quot|#39);/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function optionsLookUseful(opts) {
    return (opts || []).some((o) => {
      const s = String(o || "");
      if (/<img\b/i.test(s)) return true;
      const t = s.replace(/<img\b[^>]*>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (!t || /^[A-D]$/i.test(t)) return false;
      if (isMeaningfulOptionText(t)) return true;
      return t.length > 0 && !isSpillGarbageText(t);
    });
  }

  function pinOriginalQuestion(q) {
    if (!q) return q;
    const stem = String(q.q || q.questionText || "");
    const n = stemPlainText(stem).length;
    const prevN = stemPlainText(q._qxOrigStem || "").length;
    if (isGuttedMatchTable(stem) && matchTableRichness(q._qxOrigStem) > matchTableRichness(stem)) {
      /* keep richer pinned match stem */
    } else if (n > 8 && (n > prevN || matchTableRichness(stem) > matchTableRichness(q._qxOrigStem) + 20)) {
      q._qxOrigStem = stem;
    }
    if (n > 8 && !q._qxBankQ) q._qxBankQ = stem;
    else if (n > stemPlainText(q._qxBankQ || "").length + 12) q._qxBankQ = stem;
    if (Array.isArray(q.options) && optionsLookUseful(q.options)) {
      if (!q._qxOrigOptions) q._qxOrigOptions = q.options.slice();
      if (!q._qxBankOptions) q._qxBankOptions = q.options.slice();
    }
    return q;
  }

  function bestStemHtml(q, rawHtml) {
    const cands = [];
    if (q) {
      if (q._qxOrigStem) cands.push(q._qxOrigStem);
      if (q._qxBankQ) cands.push(q._qxBankQ);
      if (q.q) cands.push(q.q);
      if (q.questionText) cands.push(q.questionText);
    }
    if (rawHtml) cands.push(rawHtml);
    try {
      if (q && q.id != null && typeof window !== "undefined" && window._qxDiagramRaw) {
        const mem = window._qxDiagramRaw[String(q.id)];
        if (mem) cands.push(mem);
      }
    } catch (_) { /* */ }
    let best = String(rawHtml || (q && q.q) || "");
    let bestN = matchTableRichness(best) || stemPlainText(best).length;
    cands.forEach((c) => {
      const n = matchTableRichness(c) || stemPlainText(c).length;
      if (n > bestN) {
        best = String(c);
        bestN = n;
      }
    });
    return best;
  }

  function safeRenderStem(html, render) {
    const src = String(html || "");
    const plain = stemPlainText(src);
    if (!plain) return "";
    let out = "";
    try { out = typeof render === "function" ? String(render(src) || "") : src; } catch (_) { out = ""; }
    if (stemPlainText(out).length >= Math.min(12, Math.floor(plain.length * 0.35))) return out;
    return src
      .replace(/<img\b[^>]*>/gi, " ")
      .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, " ");
  }

  function restoreOptionsFromPin(q) {
    if (!q) return q;
    const master = q._qxOrigOptions || q._qxBankOptions;
    if (!master || !master.length) return q;
    if (!optionsLookUseful(q.options)) q.options = master.slice();
    return q;
  }

  function ensureStemVisible(root, q) {
    try {
      if (!q) return;
      pinOriginalQuestion(q);
      restoreOptionsFromPin(q);
      const source = bestStemHtml(q, q.q);
      const want = stemPlainText(source);
      if (want.length < 12) return;
      const scope = root || (typeof document !== "undefined" ? document.getElementById("app-main") : null);
      if (!scope || !scope.querySelector) return;
      const body = scope.querySelector(".qx-question-body, .mtk-main, .qx-prac-q, .qa-q") || scope;
      const hosts = Array.from(body.querySelectorAll(".mtk-q-text, .qx-q-seg-text, .qx-marks-native-q, .qx-q-text-only"))
        .filter((el) => !el.closest(".mtk-opt, .qx-prac-opt, .qa-opt, .mtk-opt-text, .qx-prac-opt-text"));
      const live = stemPlainText(hosts.map((el) => el.innerHTML || "").join(" "));
      const key = want.replace(/\$/g, " ").replace(/\s+/g, " ").slice(0, 28);
      if (key.length >= 12 && live.replace(/\$/g, " ").toLowerCase().includes(key.slice(0, 20).toLowerCase())) return;
      if (live.length >= want.length * 0.5) return;
      const render = (typeof Mx !== "undefined" && Mx.html) ? (t) => Mx.html(t) : (t) => t;
      const html = safeRenderStem(stripDiagramTagsOutsideTables(source), render);
      if (!stemPlainText(html)) return;
      const host = body.querySelector(".qx-question-body") || body;
      const textEl = hosts[0];
      if (textEl && stemPlainText(textEl.innerHTML).length < 12) {
        textEl.innerHTML = html;
        textEl.style.display = "block";
        textEl.style.visibility = "visible";
        textEl.style.opacity = "1";
        return;
      }
      const div = document.createElement("div");
      div.className = "mtk-q-text qx-content qx-marks-native-q qx-stem-rescued";
      if (q.id != null) div.setAttribute("data-qx-qid", String(q.id));
      div.innerHTML = html;
      div.style.cssText = "display:block;visibility:visible;opacity:1;margin:0 0 10px;line-height:1.55";
      const firstFig = host.querySelector(".qx-fig, .qx-diagram-slot, #qxDiagramSlot, img.qx-pool-fig");
      if (firstFig && firstFig.parentNode === host) host.insertBefore(div, firstFig);
      else host.insertBefore(div, host.firstChild);
    } catch (_) { /* */ }
    try {
      if (typeof Mx !== "undefined" && Mx.recoverHollowStemInDom) Mx.recoverHollowStemInDom(root);
    } catch (_) { /* */ }
  }

  function buildQuestionBodyHtml(qid, rawHtml, renderText, q) {
    if (qid == null || qid === "") return "";
    try {
      applyMatchStemToQuestion(q, q && (q.id != null ? q.id : qid));
      pinOriginalQuestion(q);
      restoreOptionsFromPin(q);
    } catch (_) { /* */ }
    const source = bestStemHtml(q, rawHtml);
    const render = typeof renderText === "function" ? renderText : (t => t);
    let html = "";
    try {
      html = buildQuestionBodyHtmlInner(qid, source, render, q);
    } catch (_) {
      html = "";
    }
    if (isMatchListOrTableFigureHtml(source) || isGuttedMatchTable(source)) {
      try {
        const body = renderMatchListHtml(source, render);
        if ((String(body).match(/<img\b/gi) || []).length >= 2) {
          return `<div class="qx-question-body qx-question-flow qx-match-q-body" data-qx-qid="${qid}" data-qx-keep-table-figs="1"><div class="mtk-q-text qx-content qx-q-text-only qx-inline-table-figs" data-qx-qid="${qid}">${body}</div></div>`;
        }
      } catch (_) { /* */ }
    }
    const want = stemPlainText(source);
    const got = stemPlainText(html);
    if (!isMatchListOrTableFigureHtml(source) && want.length > 12 && got.length < Math.max(12, Math.floor(want.length * 0.4))) {
      const textHtml = safeRenderStem(stripDiagramTagsOutsideTables(source), render);
      if (stemPlainText(textHtml)) {
        const textDiv = `<div class="mtk-q-text qx-content qx-q-seg-text qx-stem-forced" data-qx-qid="${qid}" style="display:block;visibility:visible;opacity:1;margin:0 0 10px">${textHtml}</div>`;
        if (/class="[^"]*qx-question-body/i.test(html)) {
          html = html.replace(/(<div\b[^>]*class="[^"]*qx-question-body[^"]*"[^>]*>)/i, "$1" + textDiv);
        } else {
          html = `<div class="qx-question-body qx-question-flow" data-qx-qid="${qid}">${textDiv}${html || ""}</div>`;
        }
      }
    }
    if (!html) {
      const textHtml = safeRenderStem(stripDiagramTagsOutsideTables(source), render);
      let figBits = "";
      try {
        figBits = extractPoolSrcs(source).map((src) => poolFigureHtml(src, 0)).join("");
      } catch (_) { /* */ }
      html = `<div class="qx-question-body qx-question-flow" data-qx-qid="${qid}"><div class="mtk-q-text qx-content" data-qx-qid="${qid}">${textHtml || "Question text unavailable"}</div>${figBits}</div>`;
    }
    return html;
  }

  function buildQuestionBodyHtmlInner(qid, rawHtml, renderText, q) {
    const render = typeof renderText === "function" ? renderText : (t => t);
    if (isMatchListOrTableFigureHtml(rawHtml) || (q && isMatchListOrTableFigureHtml(q.q))) {
      const rawMatch = isMatchListOrTableFigureHtml(rawHtml) ? rawHtml : q.q;
      const body = renderMatchListHtml(rawMatch, render);
      return `<div class="qx-question-body qx-question-flow qx-match-q-body qx-marks-native" data-qx-qid="${qid}" data-qx-keep-table-figs="1"><div class="mtk-q-text qx-content qx-q-text-only qx-inline-table-figs" data-qx-qid="${qid}">${body}</div></div>`;
    }
    if (isMarksNativeBook(q)) {
      try { if (isIrodovQuestion(q)) ensureIrodovStem(q); } catch (_) { /* */ }
      const pinned = bestStemHtml(q, rawHtml);
      let raw = fixUrl(pinned);
      try { raw = rewriteBookFigureHtml(raw) || raw; } catch (_) { raw = fixUrl(pinned); }
      if (isIrodovQuestion(q) && !/AKCR2_|2026_modules\/jee_advanced_physics/i.test(raw)) {
        const stem = irodovStemHtml(q);
        if (stem) raw = stem + (raw && !/^(figure|fig\.?)$/i.test(raw.replace(/<[^>]+>/g, " ").trim()) ? "<br>" + raw : "");
      }
      raw = raw
        .replace(/(?:<br\s*\/?>\s*){2,}/gi, "<br>")
        .replace(/<p[^>]*>\s*(?:&nbsp;|\s|<br\s*\/?>)*\s*<\/p>/gi, "");
      raw = raw.replace(/\$([^$]+)\$/g, (_, inner) =>
        "$" + inner.replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&").replace(/&nbsp;/gi, " ") + "$"
      );
      const mathRender = (typeof Mx !== "undefined" && Mx.html) ? (t) => Mx.html(t) : render;
      // Textbook layout: full stem first, figure below (ss928: text wrapped beside figure)
      let segs = [];
      try { segs = parseQuestionSegments(raw, qid, q) || []; } catch (_) { segs = []; }
      const textSegs = [];
      const figSegs = [];
      segs.forEach((seg) => {
        if (seg.type === "text" && String(seg.html || "").replace(/<[^>]+>/g, " ").trim()) textSegs.push(seg);
        else if (seg.type === "figure" && seg.src) figSegs.push(seg);
      });
      const ordered = (figSegs.length <= 1) ? textSegs.concat(figSegs) : segs;
      const parts = [];
      ordered.forEach((seg) => {
        if (seg.type === "text" && String(seg.html || "").replace(/<[^>]+>/g, " ").trim()) {
          parts.push(`<div class="mtk-q-text qx-content qx-marks-native-q" data-qx-qid="${qid}">${mathRender(stripDiagramTagsOutsideTables(seg.html))}</div>`);
        } else if (seg.type === "figure" && seg.src) {
          parts.push(poolFigureHtml(seg.src, seg.displayW || 0));
        }
      });
      const outPlain = parts.join("").replace(/<img\b[^>]*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const inPlain = raw.replace(/<img\b[^>]*>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (inPlain.length > 20 && outPlain.length < Math.min(20, inPlain.length * 0.35)) {
        parts.unshift(`<div class="mtk-q-text qx-content qx-marks-native-q" data-qx-qid="${qid}">${mathRender(stripDiagramTagsOutsideTables(raw))}</div>`);
      }
      // Never drop official book figures (HCV Vol 2: extract miss used to leave text-only)
      if (/<img\b/i.test(raw) && !/<img\b/i.test(parts.join(""))) {
        try {
          extractPoolSrcs(raw).forEach((src) => { if (src) parts.push(poolFigureHtml(src, 0)); });
        } catch (_) { /* */ }
        if (!/<img\b/i.test(parts.join(""))) {
          parts.push(`<div class="mtk-q-text qx-content qx-marks-native-q qx-keep-book-figs" data-qx-qid="${qid}">${raw}</div>`);
        }
      }
      if (!parts.length) {
        return `<div class="mtk-q-text qx-content qx-marks-native qx-marks-native-q" data-qx-qid="${qid}">${mathRender(raw)}</div>`;
      }
      return `<div class="qx-question-body qx-marks-native qx-question-flow qx-stem-then-fig" data-qx-qid="${qid}">${parts.join("")}</div>`;
    }
    // If hydrate gutted List-I/II, prefer bank / match-stem index.
    if (!isMatchListOrTableFigureHtml(rawHtml)) {
      const fromBank = (q && q._qxBankQ && isMatchListOrTableFigureHtml(q._qxBankQ)) ? q._qxBankQ : "";
      const fromIdx = matchStemHtml(q, qid);
      if (fromBank) rawHtml = fromBank;
      else if (fromIdx && isMatchListOrTableFigureHtml(fromIdx)) rawHtml = fromIdx;
    }
    pinQuestionHtml(qid, rawHtml);

    // CRITICAL: match / multi-figure tables — render intact (figures stay in cells)
    // Never extract to diagram slots (that blanked List-I/II columns on Amines Q).
    // Never run stripBranding on full HTML with data-qx-orig watermarked URLs.
    if (isMatchListOrTableFigureHtml(rawHtml)) {
      const body = renderMatchListHtml(rawHtml, render);
      const rawImgs = (String(rawHtml).match(/<img\b/gi) || []).length;
      const outImgs = (String(body).match(/<img\b/gi) || []).length;
      const safe = (outImgs < rawImgs)
        ? forceCleanProxyInHtml(String(rawHtml))
        : body;
      return `<div class="qx-question-body qx-question-flow qx-match-q-body" data-qx-qid="${qid}" data-qx-keep-table-figs="1"><div class="mtk-q-text qx-content qx-q-text-only qx-inline-table-figs" data-qx-qid="${qid}">${safe}</div></div>`;
    }

    // Prefer natural document order: text → figure → text → figure (proofreading layout)
    try {
      const segments = parseQuestionSegments(rawHtml, qid, q);
      if (segments && segments.length) {
        const seenFig = new Set();
        let figIdx = 0;
        const parts = [];
        segments.forEach(seg => {
          if (seg.type === "text") {
            const t = String(seg.html || "").trim();
            if (!t) return;
            parts.push(
              `<div class="mtk-q-text qx-content qx-q-seg-text" data-qx-qid="${qid}">${render(t)}</div>`
            );
            return;
          }
          if (seg.type === "figure" && seg.src) {
            const key = figureSrcKey(seg.src);
            if (key && seenFig.has(key)) return;
            if (key) seenFig.add(key);
            const inner = poolFigureHtml(seg.src, seg.displayW || 0);
            const idAttr = figIdx === 0 ? ' id="qxDiagramSlot"' : "";
            figIdx++;
            parts.push(
              `<div class="qx-diagram-seg qx-diagram-slot qx-pool-fig-wrap mathjax_ignore tex2jax_ignore"${idAttr} data-qx-qid="${qid}" data-qx-seg="${figIdx}" data-qx-locked="1" data-qx-fig-key="${escAttr(key || "")}">${inner}</div>`
            );
          }
        });
        if (parts.length) {
          return `<div class="qx-question-body qx-question-flow" data-qx-qid="${qid}">${parts.join("")}</div>`;
        }
      }
    } catch (_) { /* fall through */ }

    // Fallback: text only, or text then unique figures (never figure-before-text dump)
    const textCls = "mtk-q-text qx-content qx-q-text-only";
    // Tables with embedded figures: never strip cell images into a side dump
    if (isMatchListOrTableFigureHtml(rawHtml)) {
      return `<div class="qx-question-body qx-question-flow qx-match-q-body" data-qx-qid="${qid}"><div class="${textCls} qx-inline-table-figs" data-qx-qid="${qid}">${render(fixUrl(String(rawHtml || "")))}</div></div>`;
    }
    const entries = resolveDiagramEntries(rawHtml, qid, q);
    const unique = [];
    const seen = new Set();
    entries.forEach(e => {
      const k = figureSrcKey(e.src);
      if (!k || seen.has(k)) return;
      seen.add(k);
      unique.push(e);
    });
    if (!unique.length) {
      extractPoolSrcs(rawHtml).forEach(src => {
        const k = figureSrcKey(src);
        if (!k || seen.has(k)) return;
        seen.add(k);
        unique.push({ src, displayW: 0 });
      });
    }
    const textOnly = stripDiagramTagsOutsideTables(rawHtml);
    const textHtml = `<div class="${textCls}" data-qx-qid="${qid}">${render(textOnly)}</div>`;
    if (!unique.length) {
      return `<div class="qx-question-body qx-question-flow" data-qx-qid="${qid}">${textHtml}</div>`;
    }
    // If remaining unique figures all came from tables we already kept, skip dump
    const textHasAll = unique.every(e => {
      const k = figureSrcKey(e.src);
      return k && textOnly.toLowerCase().includes(k);
    });
    if (textHasAll) {
      return `<div class="qx-question-body qx-question-flow" data-qx-qid="${qid}">${textHtml}</div>`;
    }
    const figParts = unique.map((e, i) => {
      const inner = poolFigureHtml(e.src, e.displayW);
      const idAttr = i === 0 ? ' id="qxDiagramSlot"' : "";
      return `<div class="qx-diagram-seg qx-diagram-slot qx-pool-fig-wrap mathjax_ignore tex2jax_ignore"${idAttr} data-qx-qid="${qid}" data-qx-seg="${i + 1}" data-qx-locked="1" data-qx-fig-key="${escAttr(figureSrcKey(e.src))}">${inner}</div>`;
    });
    // Text first, then figures (readable JEE layout)
    return `<div class="qx-question-body qx-question-flow" data-qx-qid="${qid}">${textHtml}${figParts.join("")}</div>`;
  }

  /** Remove duplicate figure imgs in question stem (same file) — keep one */
  function dedupeDomFigures(root) {
    const scope = root || document;
    const main = scope.querySelector(".qx-question-body, .mtk-main, .qx-practice-page") || scope;
    const stemImgs = Array.from(main.querySelectorAll(
      "img.qx-pool-fig, img.qx-fig-img, .qx-diagram-slot img, #qxDiagramSlot img, .mtk-q-text img, .qx-q-text-only img, .qx-q-seg-text img"
    )).filter(img => !img.closest(".mtk-opt-text, .qx-prac-opt-text, .mtk-opt, .qx-prac-opt, .qa-opt, .sol-body, .qx-sol-body"));

    const byKey = new Map();
    stemImgs.forEach(img => {
      const key = figureSrcKey(img.dataset.qxOrigSrc || img.getAttribute("src") || "");
      if (!key) return;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(img);
    });

    byKey.forEach(list => {
      if (list.length < 2) return;
      // NEVER dedupe images inside List-I/II match tables (each cell is unique content)
      const inTable = list.filter((img) => img.closest("table, .qx-match-list, .qx-inline-table-figs, .qx-match-q-body"));
      if (inTable.length) {
        // Only remove duplicates OUTSIDE the table, keep all table cells
        list.forEach((img) => {
          if (!img.closest("table, .qx-match-list, .qx-inline-table-figs, .qx-match-q-body")) {
            const wrap = img.closest(".qx-diagram-seg, figure.qx-fig, .qx-fig");
            if (wrap) wrap.remove();
            else img.remove();
          }
        });
        return;
      }
      // Prefer keeping the one inside #qxDiagramSlot / first diagram-slot
      list.sort((a, b) => {
        const as = a.closest("#qxDiagramSlot") ? 0 : (a.closest(".qx-diagram-slot") ? 1 : 2);
        const bs = b.closest("#qxDiagramSlot") ? 0 : (b.closest(".qx-diagram-slot") ? 1 : 2);
        return as - bs;
      });
      const keep = list[0];
      for (let i = 1; i < list.length; i++) {
        const img = list[i];
        const wrap = img.closest(".qx-diagram-seg, figure.qx-fig, .qx-fig");
        if (wrap && wrap !== keep.closest(".qx-diagram-seg, figure.qx-fig, .qx-fig")) {
          wrap.remove();
        } else {
          img.remove();
        }
      }
    });
  }

  function pinQuestionHtml(qid, html) {
    if (qid == null || qid === "") return;
    // Store unique figure markup only (not full multi-img blob that duplicates)
    const entries = resolveDiagramEntries(html, qid);
    const seen = new Set();
    const parts = [];
    entries.forEach(e => {
      const k = figureSrcKey(e.src);
      if (!k || seen.has(k)) return;
      seen.add(k);
      parts.push(poolFigureHtml(e.src, e.displayW));
    });
    if (parts.length) _pinnedHtml.set(String(qid), parts.join(""));
    else {
      const block = extractPoolFigureHtml(html, qid);
      if (block) _pinnedHtml.set(String(qid), block);
    }
  }

  function slotNeedsDiagram(slot) {
    if (!slot) return false;
    const imgs = slot.querySelectorAll("img");
    if (!imgs.length) return true;
    if (Array.from(imgs).some(imgIsLoading)) return false;
    if (Array.from(imgs).some(img => isLocalCleanAsset(poolCdnSrc(img) || img.getAttribute("src")))) return false;
    let hasVisible = false;
    for (const img of imgs) {
      const cdn = poolCdnSrc(img) || fixUrl(img.getAttribute("src") || "");
      if (isLocalCleanAsset(cdn)) { hasVisible = true; continue; }
      if (!cdn || !isPoolDiagram(cdn, img)) continue;
      const st = window.getComputedStyle ? getComputedStyle(img) : img.style;
      const hidden = st && (st.display === "none" || st.visibility === "hidden" || parseFloat(st.opacity || "1") <= 0.05);
      if (!hidden && (img.offsetHeight > 8 || img.naturalWidth > 0 || img.complete)) hasVisible = true;
    }
    return !hasVisible;
  }

  function reinjectPinned(scope) {
    const root = scope || document;
    const isBook = !!(root.querySelector && root.querySelector(".qx-marks-native, .qx-book-q, .mtk-test-root.qx-book-q"))
      || (typeof document !== "undefined" && document.body && document.body.classList.contains("qx-book-mode"));
    root.querySelectorAll(".qx-diagram-slot[data-qx-qid]").forEach(slot => {
      // Never reinject over an already-built segment (causes double figures)
      if (slot.classList.contains("qx-diagram-seg") && slot.querySelector("img[src]")) return;
      if (slot.querySelector("img[src]") && slot.dataset.qxLocked === "1") return;
      const qid = slot.dataset.qxQid;
      const pin = _pinnedHtml.get(String(qid));
      if (!pin || !slotNeedsDiagram(slot)) return;
      slot.innerHTML = pin;
      slot.classList.add("qx-pool-fig-wrap");
      slot.querySelectorAll("img").forEach(img => processImage(img));
    });
    // Books: keep inline figures + rewrite CDN → local color
    if (isBook) {
      root.querySelectorAll(".qx-marks-native img, .qx-marks-native-q img, .qx-book-q img").forEach(img => processImage(img));
      return;
    }
    forceStripStemTextImgs(root);
    stripQuestionInlineImgs(root);
    dedupeDomFigures(root);
  }

  let guardianStarted = false;
  const GUARDIAN_MS = 25000;
  const GUARDIAN_SEL = "img.qx-pool-fig, .qx-diagram-slot img, .qx-opt-fig img, .qx-fig img";

  function runGuardianPass() {
    // Disabled — was fighting image src and hanging the UI
    return;
  }

  function startGuardian() {
    // no-op (anti-hang)
  }

  function scan(root) {
    const scope = root || document.body;
    if (!scope) return;
    // Lightweight Marks-native path only (no premium canvas, no multi-pass rewrite)
    try {
      rewriteAllPoolImgs(scope);
      scope.querySelectorAll(
        "img[src*='cdn-question-pool'], img[src*='/pyq/'], img[src*='cdn.quizrr'], img.qx-pool-fig, #qxDiagramSlot img, .qx-diagram-slot img, .mtk-opt-text img, .qx-prac-opt-text img"
      ).forEach(img => {
        if (img.dataset.qxProcessedVer === String(CLEAN_VER) && img.dataset.qxFigFrozen === "1") return;
        processImage(img);
      });
      // Remove overlay chrome only (cheap)
      scope.querySelectorAll(
        ".qx-premium-wm-sheet, .qx-quantrex-wm-overlay, .qx-brand-overlay, .qx-diag-watermark, canvas.qx-premium-wm-canvas, canvas.qx-marks-scrub-canvas"
      ).forEach(el => el.remove());
      arrangePortraitFigures(scope);
    } catch (e) {
      console.warn("QxImgClean.scan", e);
    }
    // Observer only for newly added images — throttled
    startObserver();
  }

  return {
    fixUrl,
    isPoolDiagram,
    cleanUrl,
    scan,
    rewriteAllPoolImgs,
    arrangePortraitFigures,
    queueFigLayout,
    rewriteHtmlFigures,
    rewriteBookFigureHtml,
    resolveLocalFigureSrcSync,
    loadBookFigureMaps,
    proxyImageUrl,
    processImage,
    pinQuestionHtml,
    splitQuestionHtml,
    extractPoolSrcs,
    buildDiagramSlotHtml,
    buildOptSlotHtml,
    renderOptionContent,
    buildQuestionBodyHtml,
    pinOriginalQuestion,
    bestStemHtml,
    stemPlainText,
    restoreOptionsFromPin,
    ensureStemVisible,
    isMatchListOrTableFigureHtml,
    forceCleanProxyInHtml,
    stripSpilledFigUrls,
    isSpillGarbageText,
    sanitizeOptionLeftover,
    scrubOptionSpillDom,
    matchStemHtml,
    matchStemRec,
    applyMatchStemToQuestion,
    loadMatchStemIndex,
    renderMatchListHtml,
    dedupeDomFigures,
    forceStripStemTextImgs,
    isMarksNativeBook,
    isIrodovQuestion,
    ensureIrodovStem,
    isIrodovSrc,
    irodovCdnFromAny,
    irodovStemCdn,
    irodovStemHtml,
    questionImageSrc,
    mountDiagramSlot,
    rememberQuestionRaw,
    finalizeDiagrams,
    finalizeOptionDiagrams,
    finalizeAll,
    prepareQuestionFigures,
    revealFigure,
    resolveCurrentQuestion,
    reinjectPinned,
    brandOverlayHtml,
    poolFigureHtml,
    poolOptionFigureHtml,
    poolDisplaySrc,
    ensureBrandOverlay,
    syncBrandOverlay,
    finalizeCleanDisplay,
    applyBrandOverlays,
    applyWmCover,
    applyQuantrexBrand,
    exportWatermarkedFigure: (img) => (
      typeof QxPremiumWM !== "undefined" && QxPremiumWM.exportWatermarkedFigure
        ? QxPremiumWM.exportWatermarkedFigure(img)
        : Promise.resolve(null)
    ),
    processAllDiagrams,
    cleanImageData,
    loadManifest,
    loadReview,
    restoreOriginal,
    CLEAN_VER
  };
})();