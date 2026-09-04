// MARKS web-style drill-down modules (CPYQB, All Qs, DPP, Formula, Tests, Quick Concepts)

const PAGE_SIZE = 24; // smaller first paint — infinite scroll loads more
let _navCache = {};
let _listPage = 1;

function mg(view, payload) {
  const p = JSON.stringify(payload || {})
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&#39;");
  return `data-mg="${view}" data-mgp='${p}'`;
}

function qxParseMgp(el) {
  let raw = "";
  try { raw = el.getAttribute("data-mgp") || el.dataset.mgp || "{}"; } catch (_) { raw = "{}"; }
  raw = String(raw)
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  return JSON.parse(raw || "{}");
}

function qxGoFromEl(el) {
  const view = el.getAttribute("data-mg") || el.dataset.mg;
  if (!view || typeof go !== "function") return;
  const payload = qxParseMgp(el);
  if (payload && payload.bookId && typeof QX_REMOVED_BOOK_IDS !== "undefined" && QX_REMOVED_BOOK_IDS.has(payload.bookId)) {
    if (typeof showToast === "function") showToast("This book is no longer available.");
    return;
  }
  if (payload && payload.exam && payload.step !== "exams") {
    payload.forceExamList = false;
    if (!payload.step) payload.step = "subjects";
  }
  go(view, payload);
}

const QX_UX = {
  review: "Review Lab",
  fault: "Fault Log",
  faultSub: "Incorrect attempts to correct",
  drift: "Drift Queue",
  driftSub: "Slow or low-confidence answers",
  core: "Core Archive",
  coreSub: "Secured questions for timed recall",
  drills: "Daily DPP Packs",
  drillsNav: "DPP",
  drillsShort: "DPP sets",
  saved: "Saved Queue",
  binders: "Chapter Binders",
  notes: "Annotations",
  target: "Daily Target",
  library: "Reference Library",
  lineScan: "Line Scan",
  textPlus: "Textbook Plus",
  figureLab: "Figure Lab",
  ncertBox: "Textbook Lab",
  allBank: "Complete Bank",
  replay: "Replay Mocks",
  flash: "Revision Flash Cards",
  flashSub: "Quick revision, anytime"
};

function qxUxZoneMeta(zone) {
  if (zone === "oops") return { title: QX_UX.fault, sub: QX_UX.faultSub, tone: "fault" };
  if (zone === "blur") return { title: QX_UX.drift, sub: QX_UX.driftSub, tone: "drift" };
  return { title: QX_UX.core, sub: QX_UX.coreSub, tone: "vault" };
}

function qxRoboTone(name) {
  const n = String(name || "").toLowerCase();
  if (/phys|bolt|electric|magnet|optic|wave|thermo|mechanic/.test(n)) return "phy";
  if (/chem|mole|bond|organic|inorganic|equilib|kinet/.test(n)) return "chem";
  if (/math|algebra|calcul|integr|matrix|probab|trigo|vector/.test(n)) return "math";
  if (/botan|plant|photo|flower/.test(n)) return "bot";
  if (/zool|animal|human|reproduct|neural/.test(n)) return "zoo";
  if (/bio|cell|gene|eco/.test(n)) return "bio";
  if (/social|history|civics|politic|democra|election|society/.test(n)) return "vault";
  if (/geograph|climate|ocean|earth|terrain/.test(n)) return "ncert";
  if (/econom|financ|market|startup/.test(n)) return "drill";
  if (/science|english/.test(n)) return "fig";
  if (/fault|oops/.test(n)) return "fault";
  if (/drift|blur/.test(n)) return "drift";
  if (/vault|memory|archive/.test(n)) return "vault";
  if (/ncert|line|text/.test(n)) return "ncert";
  if (/diagram|figure/.test(n)) return "fig";
  if (/exemplar|plus/.test(n)) return "plus";
  if (/dpp|drill/.test(n)) return "drill";
  if (/formula/.test(n)) return "formula";
  return "gen";
}

function qxRoboWrap(inner, tone, size) {
  const t = qxRoboTone(tone);
  const sz = size ? (" qx-robo-" + size) : "";
  return `<span class="qx-robo qx-robo-${t}${sz}" aria-hidden="true">
    <span class="qx-robo-hex"></span>
    <span class="qx-robo-pins"></span>
    <span class="qx-robo-scan"></span>
    <span class="qx-robo-core">${inner || ""}</span>
  </span>`;
}

function qxAnimCover(kind, title, sub) {
  const letter = String(title || kind || "Q").replace(/[^A-Za-z0-9]/g, "").slice(0, 1) || "Q";
  const glyph = (typeof QxCardIcons !== "undefined" && QxCardIcons.chapterIconHtml)
    ? QxCardIcons.chapterIconHtml(title || kind, kind, null)
    : `<em>${letter}</em>`;
  return qxRoboWrap(glyph || `<em>${letter}</em>`, kind || title, "md");
}

function bindMarksGoDelegate() {
  if (window._qxMgDelegated) return;
  window._qxMgDelegated = true;
  document.addEventListener("click", function (e) {
    const dppEl = e.target && e.target.closest && e.target.closest("[data-dpp-start]");
    if (dppEl && typeof startDppSet === "function") {
      e.preventDefault();
      e.stopPropagation();
      startDppSet(dppEl.getAttribute("data-dpp-start"));
      return;
    }
    const el = e.target && e.target.closest && e.target.closest("[data-mg]");
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    try { qxGoFromEl(el); }
    catch (err) {
      console.error("nav error", err);
      if (typeof showToast === "function") showToast("⚠️ Navigation error — try again");
    }
  }, true);
}

function bindMarksGo(root) {
  bindMarksGoDelegate();
  const scope = root || document;
  scope.querySelectorAll("[data-irodov-gate]").forEach(el => {
    el.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const bid = el.getAttribute("data-book-id") || QX_IRODOV_BOOK_ID;
      go("books", { step: "modules", bookId: bid });
    };
  });
}

async function fetchNav(name) {
  if (_navCache[name] && _navCache[name].length) return _navCache[name];
  try {
    const ver = (typeof QX_BUILD !== "undefined" && QX_BUILD) || "qxmed6";
    const bust = name === "cpyqb" ? "?v=qxfold1" : name === "rfc" ? "?v=qxrfc1" : ("?v=" + encodeURIComponent(ver));
    const ac = typeof AbortController !== "undefined" ? new AbortController() : null;
    const to = setTimeout(() => { try { ac && ac.abort(); } catch (_) {} }, 20000);
    const res = await fetch(`data/nav/${name}.json${bust}`, { signal: ac ? ac.signal : undefined });
    clearTimeout(to);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    let list = Array.isArray(data) ? data : [];
    // Enrich from BANK_INDEX so tiles never look blank when banks have questions
    if (name === "cpyqb" && typeof BANK_INDEX !== "undefined") {
      list = list.map(e => {
        if (!e || !e.slug) return e;
        const bi = BANK_INDEX[e.slug];
        if (!bi) return e;
        const count = Math.max(Number(e.count) || 0, Number(bi.count) || 0);
        const isComingSoon = bi.isComingSoon === true || (String(e.slug).match(/^class_(7|8|10)$/) != null);
        return {
          ...e,
          title: e.title || bi.title,
          // BANK_INDEX wins — cpyqb.json still tags NDA as Foundation
          category: bi.category || e.category,
          count,
          isComingSoon
        };
      });
      // Ensure every BANK_INDEX exam appears in nav (missing slugs)
      const have = new Set(list.map(e => e && e.slug).filter(Boolean));
      Object.keys(BANK_INDEX).forEach(slug => {
        if (have.has(slug)) return;
        if (slug === "dpp") return;
        const bi = BANK_INDEX[slug];
        if (!bi || !bi.category) return;
        const added = {
          slug,
          title: bi.title || slug,
          category: bi.category,
          count: bi.count || 0,
          subjects: [],
          isComingSoon: !!bi.isComingSoon
        };
        list.push(slug === "class_9" ? qxClass9CpyqbExam(added) : added);
      });
    }
    if (list.length) _navCache[name] = list;
    return list;
  } catch (e) {
    // Do not cache empty forever — retry next open
    console.warn("fetchNav failed:", name, e);
    return _navCache[name] || [];
  }
}

async function fetchModuleNav(name) {
  const key = `mod:${name}`;
  if (_navCache[key]) return _navCache[key];
  try {
    const ver = (typeof QX_BUILD !== "undefined" && QX_BUILD) || "qxmed6";
    const ac = typeof AbortController !== "undefined" ? new AbortController() : null;
    const to = setTimeout(() => { try { ac && ac.abort(); } catch (_) {} }, 20000);
    const res = await fetch(`data/nav/${name}.json?v=${encodeURIComponent(ver)}`, { signal: ac ? ac.signal : undefined });
    clearTimeout(to);
    if (!res.ok) throw new Error(res.status);
    _navCache[key] = await res.json();
  } catch (e) {
    console.warn("fetchModuleNav", name, e);
    if (_navCache[key] === null) delete _navCache[key];
  }
  return _navCache[key];
}

function qPreview(text) {
  let s = String(text || "");
  // Black Book / scanned page questions: never show OCR junk in list cards
  if (/black-book-pages|bb-page-img/i.test(s)) {
    const qn = s.match(/\bQ\.?\s*(\d+)/i);
    return qn ? `Q.${qn[1]} · Tap to open book page` : "Tap to open book page";
  }
  // Drop tables/images — list cards are text previews only
  s = s.replace(/<table[\s\S]*?<\/table>/gi, " ");
  s = s.replace(/<img\b[^>]*>/gi, " ");
  s = s.replace(/<[^>]+>/g, " ");
  // Decode common entities
  s = s.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&[a-z]+;/gi, " ");
  // Strip display math blocks
  s = s.replace(/\$\$[\s\S]*?\$\$/g, " ");
  s = s.replace(/\\\[[\s\S]*?\\\]/g, " ");
  const SUB = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
  const toSub = (d) => String(d).split("").map((ch) => SUB[ch] || ch).join("");
  // $...$ → readable chemistry / math (CH₃ not CH_3)
  s = s.replace(/\$([^$]*)\$/g, (_, inner) => {
    return String(inner)
      .replace(/\\(?:textbf|mathrm|mathbf|textit|text|rm|bf|it)\s*\{([^{}]*)\}/gi, "$1")
      .replace(/\\(?:textbf|mathrm|mathbf|textit|text)\b/gi, " ")
      .replace(/_\{(\d+)\}/g, (_, d) => toSub(d))
      .replace(/_(\d)/g, (_, d) => SUB[d] || d)
      .replace(/\^\{([^{}]+)\}/g, "^$1")
      .replace(/\\[a-zA-Z]+\s*\{([^{}]*)\}/g, "$1")
      .replace(/\\[a-zA-Z]+/g, " ")
      .replace(/[{}]/g, "");
  });
  // Bare leftover LaTeX commands (e.g. \textbf{P} without $)
  s = s.replace(/\\(?:textbf|mathrm|mathbf|textit|text|rm|bf|it)\s*\{([^{}]*)\}/gi, "$1");
  s = s.replace(/\\[a-zA-Z]+\s*\{([^{}]*)\}/g, "$1");
  s = s.replace(/\\[a-zA-Z]+/g, " ");
  s = s.replace(/[{}$]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  // Truncate on word boundary — never cut mid-command (was: "statemen t{…")
  if (s.length > 150) {
    s = s.slice(0, 150).replace(/\s+\S*$/, "").replace(/[.,;:]\s*$/, "") + "…";
  }
  return s || "Question";
}

/**
 * Folder nav: Back (one level up) + Exit (module root / home).
 * Used on every chapter/subject drill-down across banks, books, DPP, etc.
 */
function breadcrumb(parts, opts) {
  opts = opts || {};
  const list = Array.isArray(parts) ? parts : [];
  const parent = list.length >= 2 ? list[list.length - 2] : null;
  const root = list[0] || null;

  let backBtn = "";
  if (parent && parent.view) {
    backBtn = `<button type="button" class="qx-nav-back" ${mg(parent.view, parent.payload || {})}>← Back</button>`;
  } else if (opts.backView) {
    backBtn = `<button type="button" class="qx-nav-back" ${mg(opts.backView, opts.backPayload || {})}>← Back</button>`;
  } else {
    backBtn = `<button type="button" class="qx-nav-back" onclick="go('dashboard')">← Home</button>`;
  }

  let exitBtn = "";
  if (opts.exitOnclick) {
    exitBtn = `<button type="button" class="qx-nav-exit" onclick="${opts.exitOnclick}">${opts.exitLabel || "Exit"}</button>`;
  } else if (list.length >= 2 && root && root.view) {
    // Deep folder → exit to module root (first crumb)
    exitBtn = `<button type="button" class="qx-nav-exit" ${mg(root.view, root.payload || {})}>${opts.exitLabel || "Exit"}</button>`;
  } else if (opts.exitView) {
    exitBtn = `<button type="button" class="qx-nav-exit" ${mg(opts.exitView, opts.exitPayload || {})}>${opts.exitLabel || "Exit"}</button>`;
  } else {
    exitBtn = `<button type="button" class="qx-nav-exit" onclick="go('dashboard')">${opts.exitLabel || "Exit"}</button>`;
  }

  const crumbs = list.map((p, i) =>
    i < list.length - 1
      ? `<a href="#" ${mg(p.view, p.payload)}>${p.label}</a><span>›</span>`
      : `<span class="bc-cur">${p.label}</span>`
  ).join("");

  return `<div class="qx-folder-nav">
    <div class="qx-folder-nav-actions">${backBtn}${exitBtn}</div>
    <div class="breadcrumb">${crumbs}</div>
  </div>`;
}

function subjectIcon(subj, iconUrl, size) {
  let inner = "";
  if (typeof QuantrexExamLogos !== "undefined") {
    inner = QuantrexExamLogos.subjectHtml(subj, size || 36, "subj-ic-img", iconUrl) || "";
  }
  if (!inner && typeof QxCardIcons !== "undefined" && QxCardIcons.chapterIconHtml) {
    inner = QxCardIcons.chapterIconHtml(subj, subj, null);
  }
  if (!inner) {
    inner = `<em>${String(subj || "Q").slice(0, 1)}</em>`;
  }
  return qxRoboWrap(inner, subj, size && size <= 24 ? "sm" : "md");
}

let _marksDashCache = null;
async function fetchMarksDashboard() {
  if (_marksDashCache) return _marksDashCache;
  return null;
  try {
    if (typeof MarksLive !== "undefined") await MarksLive.ensureToken();
    const token = localStorage.getItem("quantrex_marks_token");
    if (!token) return null;
    const res = await fetch("/api/catalog?action=courses", {
      headers: { Authorization: "Bearer " + token, Accept: "application/json" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const comps = [];
    function walk(obj) {
      if (!obj || typeof obj !== "object") return;
      if (obj.componentTitle) comps.push(obj);
      if (Array.isArray(obj)) obj.forEach(walk);
      else Object.values(obj).forEach(walk);
    }
    walk(data.data || data);
    _marksDashCache = {
      board: comps.find(c => c.componentTitle === "BoardExams"),
      ncert: comps.find(c => c.componentTitle === "NcertToolbox"),
      cpyqb: comps.find(c => c.componentTitle === "ChapterwiseExams")
    };
  } catch (e) {
    _marksDashCache = null;
  }
  return _marksDashCache;
}

function marksThemedIcon(icon, size, cls, alt) {
  if (!icon) return "";
  const url = typeof icon === "string" ? icon : (icon.light || icon.dark || "");
  return typeof QuantrexExamLogos !== "undefined"
    ? QuantrexExamLogos.fromUrl(url, size, cls, alt)
    : "";
}

function dashExamIconFor(exam) {
  if (!exam || typeof QuantrexExamLogos === "undefined") return "";
  const slug = exam.slug
    || (typeof QuantrexExamLogos.slugFromTitle === "function" ? QuantrexExamLogos.slugFromTitle(exam.title) : null);
  if (!slug) return "";
  return QuantrexExamLogos.html(slug, 32, "exam-pill-logo");
}

function renderDashExamScroll(exams) {
  const track = typeof cpyqbActiveTrack === "function" ? cpyqbActiveTrack() : (STATE && STATE.exam);
  // Academic dashboard: Class 7–12 folders (not raw bank list)
  if (track === "Academic") {
    return academicClassFolderDefs(exams).map(f => {
      let click;
      if (f.soon) {
        click = `onclick="typeof showToast==='function'&&showToast('📚 ${f.label} — Coming Soon')"`;
      } else if (f.boards) {
        click = mg("cpyqb", { step: "class12boards" });
      } else {
        click = mg("cpyqb", { step: "subjects", exam: f.slug, forceExamList: false });
      }
      const logo = typeof QuantrexExamLogos !== "undefined"
        ? QuantrexExamLogos.html(f.slug === "class_12" ? "cbse" : f.slug, 32, "exam-pill-logo")
        : "";
      return `<div class="exam-pill-card${f.soon ? " soon" : ""}" ${click} style="${f.soon ? "opacity:.7" : ""}">
        <div class="exam-pill-ic">${logo}</div>
        <strong>${f.label}${f.soon ? " · Soon" : ""}</strong>
        <small>${f.sub}</small>
      </div>`;
    }).join("");
  }
  return (exams || []).map(e => {
    const yrs = typeof cpyqbExamYearLabel === "function" ? cpyqbExamYearLabel(e.slug) : "";
    const prog = typeof QxCardIcons !== "undefined"
      ? QxCardIcons.examProgressStats(e.slug)
      : { solved: 0, total: e.count || 0 };
    const total = prog.total || e.count || 0;
    return `<div class="exam-pill-card" ${mg("cpyqb", { step: "subjects", exam: e.slug, forceExamList: false })}>
      <div class="exam-pill-ic">${dashExamIconFor(e)}</div>
      <strong>${e.title}</strong>
      <small>${yrs || total.toLocaleString() + " qs"}</small>
      ${qxProgressBar(prog.solved, total)}
    </div>`;
  }).join("");
}

function dashUserName() {
  try {
    const u = JSON.parse(localStorage.getItem("quantrex_user") || "null");
    if (u && u.name) return String(u.name).split(" ")[0];
    if (u && u.email) return String(u.email).split("@")[0];
  } catch (e) { /* ignore */ }
  return "Student";
}

function dashUserInitial() {
  return dashUserName().slice(0, 1).toUpperCase() || "S";
}

function dashBoardSelected() {
  return localStorage.getItem("quantrex_board") || "CBSE";
}

function dppSubjectStyle(name, iconUrl) {
  const m = {
    Physics: { tone: "phy", color: "#f97316", bg: "rgba(249,115,22,.15)" },
    Chemistry: { tone: "chem", color: "#22c55e", bg: "rgba(34,197,94,.15)" },
    Mathematics: { tone: "math", color: "#3b82f6", bg: "rgba(59,130,246,.15)" },
    Biology: { tone: "bio", color: "#ec4899", bg: "rgba(236,72,153,.15)" },
    Botany: { tone: "bot", color: "#10b981", bg: "rgba(16,185,129,.15)" },
    Zoology: { tone: "zoo", color: "#f59e0b", bg: "rgba(245,158,11,.15)" }
  };
  const base = m[name] || { tone: "sub", color: "#94a3b8", bg: "rgba(148,163,184,.15)" };
  return { ...base, icon: subjectIcon(name, iconUrl, 28) };
}

function dppLiveAspirantCount() {
  const base = 620 + (new Date().getHours() % 12) * 7;
  return base + (new Date().getMinutes() % 50);
}

function dppTotalSets(nav) {
  let n = 0;
  (nav || []).forEach(s => (s.chapters || []).forEach(c => { n += (c.sets || []).length; }));
  return n || 700;
}

function bookQuestionLabel(q) {
  if (!q || !q._book) return null;
  const bid = q._bookId || q._book;
  if (typeof BOOK_COVER_PRESETS !== "undefined" && BOOK_COVER_PRESETS[bid]) {
    const p = BOOK_COVER_PRESETS[bid];
    return `${p.brand}${p.vol ? " · " + p.vol : ""}`;
  }
  const src = String(q.source || "").trim();
  const exam = String(q.examName || q._bookTitle || "").trim();
  const paper = String(q.paperSource || "").trim();
  if (/^(JEE Main|JEE Advanced|NEET) \d{4}/i.test(src) && exam) {
    return exam.replace(/\s+for\s+JEE\s+Main/gi, "").replace(/\s+of\s+JEE\s+Main[\s\d\-–]+/gi, "").trim() || exam;
  }
  let name = exam || src;
  name = name.replace(/\s+for\s+JEE\s+Main/gi, "").replace(/\s+of\s+JEE\s+Main[\s\d\-–]+/gi, "").trim();
  return name || "Digital Book";
}

function bookQuestionTitle(q) {
  const label = bookQuestionLabel(q);
  const paper = q && (q.paperSource || (/^(JEE Main|JEE Advanced|NEET) \d{4}/i.test(q.source || "") ? q.source : ""));
  return paper ? `${label} · ${paper}` : (label || "");
}

/**
 * Safe JS literal for HTML onclick="..." attributes.
 * MUST use single-quoted strings — JSON.stringify uses " and breaks:
 *   onclick="openPracticeQuestion("m_xxx")"  ← broken, click does nothing
 *   onclick="openPracticeQuestion('m_xxx')"  ← correct
 */
function qxJsId(id) {
  if (id == null) return "null";
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  return "'" + String(id).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
}
try {
  if (typeof window !== "undefined") window.qxJsId = qxJsId;
} catch (_) { /* */ }

function renderQCard(q) {
  const bm = typeof QuantrexBookmarks !== "undefined" ? QuantrexBookmarks.isBookmarked(q.id) : STATE.bookmarks.includes(q.id);
  const sv = STATE.solved.find(s => s.id === q.id || String(s.id) === String(q.id));
  const tag = String(q.subject || "general").toLowerCase().replace(/\s+/g, "-");
  const bookRaw = q._book ? bookQuestionLabel(q) : null;
  const bookLabel = bookRaw && !/^(digital\s*)?book$/i.test(String(bookRaw).trim()) ? bookRaw : null;
  const bookTip = bookLabel ? bookQuestionTitle(q) : "";
  const dateLine = q.paperDate && typeof MarksLive !== "undefined"
    ? MarksLive.fmtDate(q.paperDate)
    : "";
  const srcText = typeof QuantrexStrip !== "undefined" ? QuantrexStrip.sourceLabel(q) : (q.source || q.paperSource || q._sourceFull || "");
  // Paper chips only (exam/date/shift) — no repeated subject/chapter
  const paperMeta = !bookLabel
    ? (typeof qxPaperMetaBlock === "function"
      ? qxPaperMetaBlock(q)
      : (typeof QuantrexStrip !== "undefined" && QuantrexStrip.paperMetaHtml
        ? QuantrexStrip.paperMetaHtml(q, { includeChapter: false, includeSubject: false })
        : ""))
    : "";
  // Compact footer: paper chips only (logo already 16px inside chip). No raw giant img.
  const srcLine = bookLabel
    ? `<span class="qx-book-badge" title="${bookTip}">📕 ${bookLabel}</span>`
    : (paperMeta
      || `<span class="qx-src-label">${dateLine ? `📅 ${dateLine} · ` : ""}${String(srcText || "").replace(/</g, "&lt;")}</span>`);
  const hasSol = typeof MarksLive !== "undefined" && MarksLive.hasRealSolution
    ? MarksLive.hasRealSolution(q.solution)
    : !!String(q.solution || "").replace(/<[^>]+>/g, "").trim();
  // Plain-text stem only — never inject HTML imgs into list (was showing huge NTA art)
  const stem = qPreview(q.q);
  // data-qid only — open via document click delegate (no broken inline onclick quotes)
  const qidAttr = String(q.id == null ? "" : q.id)
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const chLabel = (typeof QuantrexStrip !== "undefined" && QuantrexStrip.humanChapter)
    ? QuantrexStrip.humanChapter(q)
    : (q.chapter || "");
  return `<div class="q-card" role="button" tabindex="0" data-qid="${qidAttr}">
    <div class="q-meta">
      <span class="tag tag-${tag}">${q.subject || "Question"}</span>
      ${typeof qxDifficultyTag === "function" ? qxDifficultyTag(q) : ""}
      ${chLabel ? `<span class="tag tag-chapter">${String(chLabel).replace(/</g, "&lt;")}</span>` : ""}
      ${hasSol ? `<span class="tag tag-sol">💡 Solution</span>` : ""}
      ${sv ? `<span class="tag ${sv.correct ? "tag-ok" : "tag-no"}">${sv.correct ? "✓" : "✗"}</span>` : ""}
    </div>
    <div class="q-text">${stem}</div>
    <div class="q-footer"><div class="q-footer-meta">${srcLine}</div><span class="q-footer-bm">${bm ? "🔖" : "🤍"}</span></div>
  </div>`;
}

function qxRegisterOfflineQuestions(qs) {
  (qs || []).forEach((q) => {
    if (!q || q.id == null) return;
    try {
      if (typeof getQ === "function" && getQ(q.id)) {
        if (typeof _qxIndexQuestion === "function") _qxIndexQuestion(q);
        return;
      }
    } catch (_) { /* */ }
    try {
      if (typeof QUESTIONS !== "undefined") QUESTIONS.push(q);
      if (typeof _qxIndexQuestion === "function") _qxIndexQuestion(q);
    } catch (_) { /* */ }
  });
}

function renderQList(qs, page, testMeta, opts) {
  opts = opts || {};
  qxRegisterOfflineQuestions(qs);
  const allQs = opts.allQs || (!opts.skipResetAll ? qs : (window._qxListQsAll || qs));
  if (!opts.skipResetAll) {
    window._qxListQsAll = qs.slice();
    _qxListDiffFilter = "all";
  } else {
    window._qxListQsAll = allQs;
  }
  // Apply difficulty filter on real bank difficulty
  let viewQs = qs;
  if (!opts.skipResetAll && _qxListDiffFilter && _qxListDiffFilter !== "all") {
    viewQs = qs.filter(q => qxNormDifficulty(q.difficulty) === _qxListDiffFilter);
  } else if (opts.skipResetAll) {
    viewQs = qs;
  }
  window._qxListQs = viewQs;
  // Cap prefetch hard — was 250 and flooded Marks API + froze low-end phones
  setTimeout(() => {
    if (typeof qxBackgroundPrefetch === "function") {
      qxBackgroundPrefetch(viewQs.slice(0, 8).map(q => q.id));
    }
  }, 80);
  const shown = Math.min(viewQs.length, PAGE_SIZE * Math.max(1, page || _listPage || 1));
  _listPage = Math.ceil(shown / PAGE_SIZE) || 1;
  if (testMeta && viewQs.length >= 5) {
    window._qxChapterIds = viewQs.map(q => q.id);
    window._qxChapterMeta = testMeta;
  } else if (!opts.skipResetAll) {
    window._qxChapterIds = null;
  }
  const pool = window._qxListQsAll || viewQs;
  const nEasy = pool.filter(q => qxNormDifficulty(q.difficulty) === "Easy").length;
  const nMed = pool.filter(q => qxNormDifficulty(q.difficulty) === "Medium").length;
  const nHard = pool.filter(q => qxNormDifficulty(q.difficulty) === "Hard").length;
  const cur = _qxListDiffFilter || "all";
  const diffBar = `<div class="qx-diff-filter-bar" id="qxDiffFilterBar" role="group" aria-label="Difficulty filter">
    <button type="button" class="qx-diff-chip${cur === "all" ? " on" : ""}" onclick="qxSetListDiffFilter('all')">All <b>${pool.length}</b></button>
    <button type="button" class="qx-diff-chip diff-easy${cur === "Easy" ? " on" : ""}" onclick="qxSetListDiffFilter('Easy')">Easy <b>${nEasy}</b></button>
    <button type="button" class="qx-diff-chip diff-medium${cur === "Medium" ? " on" : ""}" onclick="qxSetListDiffFilter('Medium')">Medium <b>${nMed}</b></button>
    <button type="button" class="qx-diff-chip diff-hard${cur === "Hard" ? " on" : ""}" onclick="qxSetListDiffFilter('Hard')">Hard <b>${nHard}</b></button>
  </div>`;
  const testBar = (typeof cpyqbChapterSessionBar === "function" ? cpyqbChapterSessionBar(testMeta, viewQs.length) : "")
    || (testMeta && viewQs.length >= 5 ? `<div class="qx-chapter-test-bar">
    <div><strong>Chapter Test</strong><small>${Math.min(30, viewQs.length)} questions · ${Math.ceil(Math.min(30, viewQs.length) * 1.5)} min timer</small></div>
    <button type="button" class="btn-primary sm" onclick="startChapterTest(window._qxChapterIds, window._qxChapterMeta)">▶ Start Test</button>
  </div>` : "");
  const slice = viewQs.slice(0, shown);
  const list = slice.length ? slice.map(renderQCard).join("") : `<div class="empty">No questions${cur !== "all" ? " for " + cur : ""} found.</div>`;
  const more = viewQs.length > shown ? `<div class="qx-load-more" id="qxLoadMore"><span>Loading more…</span></div>` : "";
  const filterNote = cur !== "all" ? ` · <span class="qx-diff-active">${cur}</span>` : "";
  return `<div id="qxQListWrap" class="qx-qlist-wrap">${testBar}${diffBar}<p class="result-count">${viewQs.length.toLocaleString()} questions${filterNote}${viewQs.length > PAGE_SIZE ? ` · showing ${shown}` : ""}</p>
    <div class="q-list" id="marksQList">${list}</div>${more}</div>`;
}

function bindMarksInfiniteScroll(root) {
  const el = (root || document).querySelector("#qxLoadMore");
  if (!el || el._qxBound) return;
  el._qxBound = true;
  const obs = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    const qs = window._qxListQs || [];
    const list = document.getElementById("marksQList");
    if (!list || list.children.length >= qs.length) return;
    const next = qs.slice(list.children.length, list.children.length + PAGE_SIZE);
    next.forEach(q => {
      const div = document.createElement("div");
      div.innerHTML = renderQCard(q);
      list.appendChild(div.firstElementChild);
    });
    if (list.children.length >= qs.length) el.remove();
  }, { rootMargin: "120px" });
  obs.observe(el);
}

let _lastListFn = null;
function _refreshMarksList() {
  if (_lastListFn) render(currentView, _lastListFn());
}

// ============ CHAPTER-WISE PYQ BANK (MARKS flow) ============
let _cpyqbPayload = { step: "exams" };
let _chapterMetaCache = {};

function slugChapter(name) {
  return String(name || "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "").toLowerCase().slice(0, 80) || "item";
}

async function fetchChapterMeta(examSlug, subject, chapter) {
  const key = `${examSlug}::${subject}::${chapter}`;
  if (_chapterMetaCache[key] || _chapterMetaCache[key] === null) return _chapterMetaCache[key];
  try {
    const ac = typeof AbortController !== "undefined" ? new AbortController() : null;
    const to = setTimeout(() => { try { ac && ac.abort(); } catch (_) {} }, 4000);
    const res = await fetch(`data/nav/chapter_meta/${examSlug}/${encodeURIComponent(subject)}/${slugChapter(chapter)}.json?v=qxfold1`, {
      signal: ac ? ac.signal : undefined
    });
    clearTimeout(to);
    if (!res.ok) throw new Error(res.status);
    _chapterMetaCache[key] = await res.json();
  } catch (e) {
    _chapterMetaCache[key] = null;
  }
  return _chapterMetaCache[key];
}

/**
 * Marks-sourced exam display names (was wrongly mapping everything → "JEE Main").
 */
const CT_EXAM_FOR_SLUG = {
  jee_main: "JEE Main",
  nta_abhyas_jee_main: "NTA Abhyas (JEE Main)",
  jee_advanced: "JEE Advanced",
  neet: "NEET",
  nta_abhyas_neet: "NTA Abhyas (NEET)",
  aiims: "AIIMS",
  jipmer: "JIPMER",
  bitsat: "BITSAT",
  nda: "NDA",
  mht_cet: "MHT CET",
  mht_cet_medical: "MHT CET (Medical)",
  comedk: "COMEDK",
  wbjee: "WBJEE",
  kcet: "KCET",
  ap_eamcet: "AP EAMCET",
  ts_eamcet: "TS EAMCET",
  viteee: "VITEEE",
  manipal_met: "Manipal MET",
  iat_iiser: "IAT (IISER)",
  nest_niser: "NEST (NISER)",
  kvpy: "KVPY"
};

/**
 * Marks PYQ mock formats — name, default duration, marks, section style.
 * Q-count for a shift uses THIS paper's loaded count; defaults are official/typical.
 * Source: Marks pyq_paper_index + NTA/state exam norms.
 */
const MARKS_EXAM_FORMAT = {
  jee_main: {
    exam: "jee_main", title: "JEE (Main)", format: "jee_main",
    durationMin: 180, totalMarks: 300, defaultQs: 75,
    subjects: ["Mathematics", "Physics", "Chemistry"],
    layout: "jee_main_sc_num"
  },
  nta_abhyas_jee_main: {
    exam: "jee_main", title: "NTA Abhyas (JEE Main)", format: "jee_main",
    durationMin: 180, totalMarks: 300, defaultQs: 75,
    subjects: ["Mathematics", "Physics", "Chemistry"],
    layout: "jee_main_sc_num"
  },
  jee_advanced: {
    exam: "jee_advanced", title: "JEE (Advanced)", format: "jee_advanced",
    durationMin: 180, totalMarks: 180, defaultQs: 54,
    subjects: ["Physics", "Chemistry", "Mathematics"],
    layout: "jee_advanced"
  },
  neet: {
    exam: "neet", title: "NEET (UG)", format: "neet",
    durationMin: 180, totalMarks: 720, defaultQs: 180,
    subjects: ["Physics", "Chemistry", "Botany", "Zoology"],
    layout: "neet"
  },
  nta_abhyas_neet: {
    exam: "neet", title: "NTA Abhyas (NEET)", format: "neet",
    durationMin: 200, totalMarks: 720, defaultQs: 180,
    subjects: ["Physics", "Chemistry", "Botany", "Zoology"],
    layout: "neet"
  },
  aiims: {
    exam: "aiims", title: "AIIMS", format: "neet_medical",
    durationMin: 210, totalMarks: 200, defaultQs: 200,
    subjects: ["Physics", "Chemistry", "Biology"],
    layout: "subject"
  },
  jipmer: {
    exam: "jipmer", title: "JIPMER", format: "neet_medical",
    durationMin: 150, totalMarks: 400, defaultQs: 200,
    subjects: ["Physics", "Chemistry", "Biology", "English", "Logical Reasoning"],
    layout: "subject"
  },
  bitsat: {
    exam: "bitsat", title: "BITSAT", format: "bitsat",
    durationMin: 180, totalMarks: 390, defaultQs: 130,
    subjects: ["Mathematics", "Physics", "Chemistry", "English", "Logical Reasoning"],
    layout: "subject"
  },
  nda: {
    exam: "nda", title: "NDA", format: "nda",
    durationMin: 150, totalMarks: 900, defaultQs: 270,
    subjects: ["Mathematics", "English", "General Science", "General Studies"],
    layout: "subject"
  },
  mht_cet: {
    exam: "mht_cet", title: "MHT CET", format: "mht_cet",
    durationMin: 180, totalMarks: 200, defaultQs: 150,
    subjects: ["Mathematics", "Physics", "Chemistry"],
    layout: "subject"
  },
  mht_cet_medical: {
    exam: "mht_cet_medical", title: "MHT CET (Medical)", format: "mht_cet",
    durationMin: 180, totalMarks: 200, defaultQs: 200,
    subjects: ["Physics", "Chemistry", "Biology"],
    layout: "subject"
  },
  comedk: {
    exam: "comedk", title: "COMEDK UGET", format: "comedk",
    durationMin: 180, totalMarks: 180, defaultQs: 180,
    subjects: ["Mathematics", "Physics", "Chemistry"],
    layout: "subject"
  },
  wbjee: {
    exam: "wbjee", title: "WBJEE", format: "wbjee",
    durationMin: 240, totalMarks: 200, defaultQs: 155,
    subjects: ["Mathematics", "Physics", "Chemistry"],
    layout: "subject"
  },
  kcet: {
    exam: "kcet", title: "KCET", format: "kcet",
    durationMin: 320, totalMarks: 180, defaultQs: 180,
    subjects: ["Mathematics", "Physics", "Chemistry", "Biology"],
    layout: "subject"
  },
  ap_eamcet: {
    exam: "ap_eamcet", title: "AP EAMCET", format: "ap_eamcet",
    durationMin: 180, totalMarks: 160, defaultQs: 160,
    subjects: ["Mathematics", "Physics", "Chemistry"],
    layout: "subject"
  },
  ts_eamcet: {
    exam: "ts_eamcet", title: "TS EAMCET", format: "ts_eamcet",
    durationMin: 180, totalMarks: 160, defaultQs: 160,
    subjects: ["Mathematics", "Physics", "Chemistry"],
    layout: "subject"
  },
  viteee: {
    exam: "viteee", title: "VITEEE", format: "viteee",
    durationMin: 150, totalMarks: 125, defaultQs: 125,
    subjects: ["Mathematics", "Physics", "Chemistry", "English", "Aptitude"],
    layout: "subject"
  },
  manipal_met: {
    exam: "manipal_met", title: "Manipal MET", format: "manipal_met",
    durationMin: 120, totalMarks: 240, defaultQs: 60,
    subjects: ["Mathematics", "Physics", "Chemistry", "English"],
    layout: "subject"
  },
  iat_iiser: {
    exam: "iat_iiser", title: "IAT (IISER)", format: "iat_iiser",
    durationMin: 180, totalMarks: 240, defaultQs: 60,
    subjects: ["Mathematics", "Physics", "Chemistry", "Biology"],
    layout: "subject"
  },
  nest_niser: {
    exam: "nest_niser", title: "NEST (NISER)", format: "nest_niser",
    durationMin: 210, totalMarks: 200, defaultQs: 80,
    subjects: ["Biology", "Chemistry", "Mathematics", "Physics"],
    layout: "subject"
  },
  kvpy: {
    exam: "kvpy", title: "KVPY", format: "kvpy",
    durationMin: 180, totalMarks: 100, defaultQs: 90,
    subjects: ["Mathematics", "Physics", "Chemistry", "Biology"],
    layout: "subject"
  }
};

function marksExamFormat(slug) {
  const s = String(slug || "").toLowerCase();
  if (MARKS_EXAM_FORMAT[s]) return MARKS_EXAM_FORMAT[s];
  // fuzzy
  if (/jee_adv|jee advanced/i.test(s)) return MARKS_EXAM_FORMAT.jee_advanced;
  if (/neet|nta_abhyas_neet/i.test(s)) return MARKS_EXAM_FORMAT.neet;
  if (/aiims/i.test(s)) return MARKS_EXAM_FORMAT.aiims;
  if (/jipmer/i.test(s)) return MARKS_EXAM_FORMAT.jipmer;
  if (/bitsat/i.test(s)) return MARKS_EXAM_FORMAT.bitsat;
  if (/nda/i.test(s)) return MARKS_EXAM_FORMAT.nda;
  if (/mht_cet_medical/i.test(s)) return MARKS_EXAM_FORMAT.mht_cet_medical;
  if (/mht_cet/i.test(s)) return MARKS_EXAM_FORMAT.mht_cet;
  if (/comedk/i.test(s)) return MARKS_EXAM_FORMAT.comedk;
  if (/wbjee/i.test(s)) return MARKS_EXAM_FORMAT.wbjee;
  if (/kcet/i.test(s)) return MARKS_EXAM_FORMAT.kcet;
  if (/ap_eamcet|apeamcet/i.test(s)) return MARKS_EXAM_FORMAT.ap_eamcet;
  if (/ts_eamcet|tseamcet/i.test(s)) return MARKS_EXAM_FORMAT.ts_eamcet;
  if (/viteee/i.test(s)) return MARKS_EXAM_FORMAT.viteee;
  if (/manipal|met/i.test(s)) return MARKS_EXAM_FORMAT.manipal_met;
  if (/iat|iiser/i.test(s)) return MARKS_EXAM_FORMAT.iat_iiser;
  if (/nest|niser/i.test(s)) return MARKS_EXAM_FORMAT.nest_niser;
  if (/kvpy/i.test(s)) return MARKS_EXAM_FORMAT.kvpy;
  if (/jee_main|nta_abhyas_jee/i.test(s)) return MARKS_EXAM_FORMAT.jee_main;
  return MARKS_EXAM_FORMAT.jee_main;
}
window.MARKS_EXAM_FORMAT = MARKS_EXAM_FORMAT;
window.marksExamFormat = marksExamFormat;
const CT_CLASS_IDS = {
  "615d7802c52ffa3c944600e8": "Class 11",
  "615d780ec52ffa3c944600e9": "Class 12"
};
let _marksCtIndex = null;

async function fetchMarksCtIndex() {
  if (_marksCtIndex) return _marksCtIndex;
  if (typeof QxPerf !== "undefined") {
    const cached = QxPerf.cacheGet("qx_ct_index", 86400000);
    if (cached) { _marksCtIndex = cached; return _marksCtIndex; }
  }
  _marksCtIndex = {};
  try {
    const res = await fetch("data/nav/custom_test_exams.json");
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    (data.data && data.data.exams || []).forEach(exam => {
      const bySubject = {};
      (exam.subjects || []).forEach(sub => {
        const byChapter = {};
        let pos = 0;
        (sub.units || []).forEach((unit, ui) => {
          (unit.chapters || []).forEach((ch, ci) => {
            pos += 1;
            byChapter[ch.title] = {
              unitId: unit._id,
              unitTitle: unit.title,
              unitIndex: ui,
              chapterIndex: ci,
              position: pos,
              classes: (ch.classes || []).map(id => CT_CLASS_IDS[id] || id),
              syllabusCategory: ch.syllabusCategory || "noChange",
              icon: ch.icon,
              shortName: ch.shortName || ch.title,
              importance: Number(ch.importance) || 0
            };
          });
        });
        bySubject[sub.title] = { units: sub.units || [], byChapter };
      });
      _marksCtIndex[exam.title] = bySubject;
    });
  } catch (e) {
    _marksCtIndex = {};
  }
  if (typeof QxPerf !== "undefined") QxPerf.cacheSet("qx_ct_index", _marksCtIndex);
  return _marksCtIndex;
}

function qYearFromSource(source) {
  const m = String(source || "").match(/\b(20\d{2}|19\d{2})\b/);
  return m ? parseInt(m[1], 10) : null;
}

function cpyqbYearCounts(qs) {
  const counts = {};
  qs.forEach(q => {
    const y = qYearFromSource(q.source) || qYearFromSource(q.paperSource) || qYearFromSource(q.examName);
    if (y) counts[y] = (counts[y] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => Number(b[0]) - Number(a[0])).slice(0, 5);
}

function cpyqbYearCountMap(qs) {
  const counts = {};
  (qs || []).forEach(q => {
    const y = qYearFromSource(q.source) || qYearFromSource(q.paperSource) || qYearFromSource(q.examName);
    if (y) counts[y] = (counts[y] || 0) + 1;
  });
  return counts;
}

function cpyqbYearArrow(counts, idx) {
  if (!counts || idx >= counts.length - 1) return "";
  const curr = counts[idx][1];
  const older = counts[idx + 1][1];
  if (curr > older) return '<span class="cpyqb-yr-up">↑</span>';
  if (curr < older) return '<span class="cpyqb-yr-down">↓</span>';
  return "";
}

function cpyqbChapterStats(examSlug, subject, chapterName, total) {
  const solvedSet = new Set(STATE.solved.map(s => s.id));
  const qs = (typeof getChapterQuestions === "function")
    ? getChapterQuestions(examSlug, subject, chapterName)
    : QUESTIONS.filter(q => q._bank === examSlug && q.subject === subject && q.chapter === chapterName);
  const ids = qs.length ? qs.map(q => q.id) : [];
  let solved = 0;
  let correct = 0;
  let lastDate = 0;
  ids.forEach(id => {
    if (!solvedSet.has(id)) return;
    solved++;
    const rec = STATE.solved.find(s => s.id === id);
    if (rec && rec.correct) correct++;
    if (rec && rec.date > lastDate) lastDate = rec.date;
  });
  const totalQs = total || qs.length || 0;
  const accuracy = solved ? Math.round(correct / solved * 100) : 0;
  const weak = solved >= 3 && accuracy < 45;
  const strong = solved >= 3 && accuracy >= 70;
  const average = solved >= 3 && !weak && !strong;
  const yearMap = cpyqbYearCountMap(qs);
  const yearCounts = cpyqbYearCounts(qs);
  const y2026 = yearMap[2026] || 0;
  const y2025 = yearMap[2025] || 0;
  return {
    solved, total: totalQs, accuracy, lastDate, yearCounts, yearMap,
    y2026, y2025, weak, strong, average
  };
}

function cpyqbChapterIcon(meta, subject, chapterName) {
  const name = chapterName || (meta && (meta.shortName || meta.title || meta.name)) || "";
  let inner = "";
  if (typeof QxCardIcons !== "undefined") {
    inner = QxCardIcons.chapterIconHtml(name, subject, meta);
  }
  if (!inner) {
    const letter = (name || "?").slice(0, 1).replace(/'/g, "");
    inner = `<span class="cpyqb-ch-ic-fb">${letter}</span>`;
  }
  const plate = (typeof QxCardIcons !== "undefined" && QxCardIcons.plateStyle)
    ? QxCardIcons.plateStyle(typeof QxCardIcons.normSubject === "function" ? QxCardIcons.normSubject(subject) : (subject || "Default"))
    : "";
  return `<span class="qx-ch-plate" style="${plate}" aria-hidden="true">${inner}</span>`;
}

function qxProgressBar(solved, total, opts) {
  if (typeof QxCardIcons !== "undefined") return QxCardIcons.progressBarHtml(solved, total, opts || {});
  const t = Math.max(0, Number(total) || 0);
  const s = t ? Math.min(Math.max(0, Number(solved) || 0), t) : 0;
  const g = t ? (s / t) * 100 : 0;
  return `<div class="qx-prog-bar"><span class="qx-prog-g" style="width:${g}%"></span><span class="qx-prog-r" style="width:${100 - g}%"></span></div>`;
}

function cpyqbSyllabusBadge(cat) {
  if (cat === "reduced") return `<span class="cpyqb-syl reduced">REDUCED</span>`;
  if (cat === "removed") return `<span class="cpyqb-syl removed">REMOVED</span>`;
  return "";
}

/**
 * Real difficulty only — never invent Medium when data is missing.
 * Accepts: Easy / Medium / Hard / Moderate / Tough, or Marks level 0|1|2.
 */
function qxQuestionDifficulty(q) {
  if (!q) return "";
  const raw = q.difficulty != null && String(q.difficulty).trim() !== ""
    ? q.difficulty
    : (q.difficultyLevel != null && String(q.difficultyLevel).trim() !== ""
      ? q.difficultyLevel
      : (q.level != null && q.level !== "" ? q.level : ""));
  return qxNormDifficulty(raw);
}

/** Real Marks difficulty labels: Easy / Medium / Hard (map Moderate→Medium, Tough→Hard). Empty if unknown. */
function qxNormDifficulty(raw) {
  if (raw == null || raw === "") return "";
  // Numeric Marks level (0/1 Easy, 2 Medium, 3 Hard)
  if (typeof raw === "number" || /^\d+$/.test(String(raw).trim())) {
    const n = Number(raw);
    if (n <= 1) return "Easy";
    if (n === 2) return "Medium";
    if (n >= 3) return "Hard";
  }
  const d = String(raw || "").trim().toLowerCase();
  if (!d) return "";
  if (d === "easy" || d === "e" || d === "beginner" || d === "simple") return "Easy";
  if (d === "hard" || d === "tough" || d === "difficult" || d === "advance" || d === "advanced" || d === "h") return "Hard";
  if (d === "medium" || d === "moderate" || d === "med" || d === "m" || d === "normal") return "Medium";
  // Unknown free-text — only show if it looks like a short label
  if (d.length <= 12 && /^[a-z][a-z\s-]*$/.test(d)) {
    return d.charAt(0).toUpperCase() + d.slice(1);
  }
  return "";
}

function qxPaperMetaLooksRich(s) {
  return !!(s && /shift\s*[-–]?\s*[12]|morning|evening|forenoon|afternoon|\d{1,2}\s*[A-Za-z]{3,}/i.test(String(s)));
}

function qxParsePaperBits(q) {
  const raw = [q && q._sourceFull, q && q.paperSource, q && q.source, q && q.examName]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .sort((a, b) => Number(qxPaperMetaLooksRich(b)) - Number(qxPaperMetaLooksRich(a)) || b.length - a.length)[0] || "";
  const out = { exam: "", year: "", date: "", shift: "", paper: "", mode: "", raw };
  let m = raw.match(/\b(JEE\s*Main|JEE\s*Advanced|NEET(?:\s*UG)?|BITSAT|NDA)\b/i);
  if (m) out.exam = m[1].replace(/\s+/g, " ").replace(/JEE\s*MAIN/i, "JEE Main").replace(/JEE\s*ADVANCED/i, "JEE Advanced");
  m = raw.match(/\b(20\d{2}|19\d{2})\b/);
  if (m) out.year = m[1];
  m = raw.match(/\bPaper\s*([12])\b/i);
  if (m) out.paper = "Paper " + m[1];
  m = raw.match(/\b(Online|Offline)\b/i);
  if (m) out.mode = m[1];
  m = raw.match(/\(?\s*(\d{1,2})(?:st|nd|rd|th)?[\s\-/]+([A-Za-z]{3,9})\.?(?:[\s\-/]+(\d{4}))?\s*[,\s]+Shift\s*[-–]?\s*([12])/i)
    || raw.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:\s+(\d{4}))?\s*(?:Online|Offline)?\s*Shift\s*[-–]?\s*([12])\b/i);
  if (m) {
    const mon = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
    out.date = [m[1].replace(/^0/, ""), mon, m[3] || ""].filter(Boolean).join(" ");
    out.shift = m[4] === "1" ? "Morning Shift" : "Evening Shift";
  }
  if (!out.shift) {
    m = raw.match(/\b(Morning|Evening|Forenoon|Afternoon)\s*Shift\b/i);
    if (m) out.shift = /morning|forenoon/i.test(m[1]) ? "Morning Shift" : "Evening Shift";
    else {
      m = raw.match(/\bShift\s*[-–]?\s*([12])\b/i);
      if (m) out.shift = m[1] === "1" ? "Morning Shift" : "Evening Shift";
    }
  }
  if (!out.date) {
    m = raw.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:\s+(\d{4}))?\b/);
    if (m && !/shift|online|offline|main|advanced|paper/i.test(m[2])) {
      const mon = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
      out.date = [m[1].replace(/^0/, ""), mon, m[3] || ""].filter(Boolean).join(" ");
    }
  }
  return out;
}

function qxStripPaperOriginWords(s) {
  return String(s || "")
    .replace(/\bDigital\s*Book\b/gi, " ")
    .replace(/\b(?:Actual|Book)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s·,|/–-]+|[\s·,|/–-]+$/g, "")
    .trim();
}

function qxFallbackPaperMetaHtml(q) {
  const bits = qxParsePaperBits(q);
  const chips = [];
  const examName = qxStripPaperOriginWords(bits.exam);
  const yearTxt = bits.year || "";
  let dateTxt = qxStripPaperOriginWords(bits.date);
  if (yearTxt && dateTxt) {
    dateTxt = dateTxt.replace(new RegExp("(^|\\s)" + yearTxt + "(?=\\s|$)", "g"), " ").replace(/\s+/g, " ").trim();
  }
  const examTxt = examName ? (yearTxt ? examName + " " + yearTxt : examName) : yearTxt;
  if (examTxt) chips.push(`<span class="qx-paper-chip qx-paper-exam"><span class="qx-paper-exam-txt">${examTxt.replace(/</g, "&lt;")}</span></span>`);
  if (dateTxt) chips.push(`<span class="qx-paper-chip qx-paper-date">📅 ${String(dateTxt).replace(/</g, "&lt;")}</span>`);
  if (bits.shift) chips.push(`<span class="qx-paper-chip qx-paper-shift">${bits.shift}</span>`);
  if (bits.mode) chips.push(`<span class="qx-paper-chip qx-paper-mode">${String(bits.mode).replace(/</g, "&lt;")}</span>`);
  if (bits.paper) chips.push(`<span class="qx-paper-chip qx-paper-paper">${String(bits.paper).replace(/</g, "&lt;")}</span>`);
  const diff = typeof qxQuestionDifficulty === "function" ? qxQuestionDifficulty(q) : String((q && q.difficulty) || "").trim();
  if (diff) {
    const dcls = diff.toLowerCase().replace(/[^a-z]/g, "") || "medium";
    chips.push(`<span class="qx-paper-chip qx-paper-diff qx-paper-diff-${dcls}">${diff.replace(/</g, "&lt;")}</span>`);
  }
  if (!chips.length && bits.raw) {
    const full = qxStripPaperOriginWords(bits.raw);
    if (full) chips.push(`<span class="qx-paper-chip qx-paper-full">${String(full).replace(/</g, "&lt;")}</span>`);
  }
  if (!chips.length) return "";
  return `<div class="qx-paper-meta" title="${String(qxStripPaperOriginWords(bits.raw) || "").replace(/"/g, "&quot;")}"><div class="qx-paper-meta-chips">${chips.join("")}</div></div>`;
}

function qxPaperMetaBlock(q) {
  if (typeof QuantrexStrip !== "undefined" && QuantrexStrip.paperMetaHtml) {
    return QuantrexStrip.paperMetaHtml(q, { includeChapter: false, includeSubject: false });
  }
  return qxFallbackPaperMetaHtml(q);
}

function qxDifficultyTag(rawOrQ) {
  const d = (rawOrQ && typeof rawOrQ === "object")
    ? qxQuestionDifficulty(rawOrQ)
    : qxNormDifficulty(rawOrQ);
  if (!d) return "";
  const cls = d === "Easy" ? "diff-easy" : (d === "Hard" ? "diff-hard" : "diff-medium");
  return `<span class="tag tag-diff ${cls}" data-diff="${d}">${d}</span>`;
}

function qxDifficultyRank(raw) {
  const d = qxNormDifficulty(raw);
  if (d === "Easy") return 1;
  if (d === "Hard") return 3;
  if (d === "Medium") return 2;
  return 2;
}

try {
  if (typeof window !== "undefined") {
    window.qxQuestionDifficulty = qxQuestionDifficulty;
    window.qxNormDifficulty = qxNormDifficulty;
    window.qxDifficultyTag = qxDifficultyTag;
    window.qxDifficultyRank = qxDifficultyRank;
    window.qxPaperMetaBlock = qxPaperMetaBlock;
    window.qxParsePaperBits = qxParsePaperBits;
    window.qxFallbackPaperMetaHtml = qxFallbackPaperMetaHtml;
  }
} catch (_) { /* */ }

/** Fuzzy match Marks CT chapter meta by title. */
function cpyqbFindCtChapter(ctSubj, chapterName) {
  if (!ctSubj || !ctSubj.byChapter) return null;
  const name = String(chapterName || "").trim();
  if (!name) return null;
  if (ctSubj.byChapter[name]) return ctSubj.byChapter[name];
  const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const n = norm(name);
  for (const [k, v] of Object.entries(ctSubj.byChapter)) {
    if (norm(k) === n) return v;
    if (norm(v.shortName) === n) return v;
  }
  for (const [k, v] of Object.entries(ctSubj.byChapter)) {
    const nk = norm(k);
    if (nk && (nk.includes(n) || n.includes(nk))) return v;
  }
  return null;
}

/**
 * Marks default chapter priority (position): foundation chapters first
 * (e.g. Maths → Basic of Mathematics first), then unit order from CT.
 * Importance high→low is only when user picks that sort filter.
 */
const MARKS_FOUNDATION_FIRST = {
  Mathematics: [
    "Basic of Mathematics", "Sets and Relations", "Functions", "Limits",
    "Trigonometric Ratios & Identities", "Quadratic Equation", "Complex Number"
  ],
  Physics: [
    "Units and Dimensions", "Mathematics in Physics", "Motion In One Dimension",
    "Motion In Two Dimensions", "Laws of Motion", "Work Power Energy"
  ],
  Chemistry: [
    "Some Basic Concepts of Chemistry", "Structure of Atom", "Atomic Structure",
    "Classification of Elements and Periodicity in Properties",
    "Chemical Bonding and Molecular Structure", "States of Matter"
  ]
};

function cpyqbFoundationRank(subject, chapterName) {
  const list = MARKS_FOUNDATION_FIRST[subject] || [];
  const n = String(chapterName || "").trim().toLowerCase();
  for (let i = 0; i < list.length; i++) {
    const f = list[i].toLowerCase();
    if (n === f) return i;
  }
  // Prefer exact-ish: chapter starts with foundation title (avoid "Functions" matching "Inverse Trigonometric Functions")
  for (let i = 0; i < list.length; i++) {
    const f = list[i].toLowerCase();
    if (n.startsWith(f) || f.startsWith(n)) return i;
  }
  if (/^basic of mathematics$/i.test(chapterName || "") || /^basic math/i.test(chapterName || "")) return 0;
  if (/\bunits?\s+and\s+dimensions\b/i.test(chapterName || "")) return 0;
  if (/\bmathematics in physics\b/i.test(chapterName || "")) return 1;
  return 1000;
}

function cpyqbChapterSortKey(row, mode) {
  const name = (row.nav && row.nav.name) || "";
  const subj = row.subject || "";
  const ct = row.ct;
  const imp = (ct && ct.importance) || 0;
  const pos = (ct && typeof ct.position === "number") ? ct.position : 9999;
  const total = (row.stats && row.stats.total) || (row.nav && row.nav.count) || 0;
  const y2026 = (row.stats && row.stats.y2026) || 0;
  if (mode === "importance_high" || mode === "importance") {
    return [-imp, -y2026, -total, name];
  }
  if (mode === "importance_low") {
    return [imp, total, name];
  }
  // default / position: foundation first (Basic Maths…), then Marks unit position
  const fr = cpyqbFoundationRank(subj, name);
  return [fr, pos, -imp, name];
}

function cpyqbCompareKeys(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    if (typeof x === "string" || typeof y === "string") {
      return String(x || "").localeCompare(String(y || ""));
    }
    return (x || 0) - (y || 0);
  }
  return 0;
}

/** Question list difficulty filter state (Easy / Medium / Hard from real bank data). */
let _qxListDiffFilter = "all";

function qxSetListDiffFilter(diff) {
  _qxListDiffFilter = diff || "all";
  const root = document.getElementById("app-main") || document;
  const all = window._qxListQsAll || window._qxListQs || [];
  const filtered = _qxListDiffFilter === "all"
    ? all.slice()
    : all.filter(q => qxNormDifficulty(q.difficulty) === _qxListDiffFilter);
  _listPage = 1;
  const testMeta = window._qxChapterMeta || null;
  const html = renderQList(filtered, 1, testMeta, { skipResetAll: true, allQs: all });
  const wrap = root.querySelector("#qxQListWrap");
  if (wrap) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    const next = tmp.querySelector("#qxQListWrap") || tmp.firstElementChild;
    if (next) wrap.replaceWith(next);
  } else if (typeof render === "function" && typeof currentView !== "undefined") {
    render(currentView);
    return;
  }
  bindMarksInfiniteScroll(root);
  if (typeof Mx !== "undefined") Mx.afterRender(root);
}

function cpyqbFilterPayloadFromDrawer(drawer) {
  if (!drawer) return {};
  const p = {};
  const sort = drawer.querySelector('input[name="cpyqbSort"]:checked');
  if (sort) p.sortBy = sort.value;
  const cls = drawer.querySelector('input[name="cpyqbClass"]:checked');
  if (cls) p.filterClass = cls.value;
  const syl = drawer.querySelector('input[name="cpyqbSyllabus"]:checked');
  if (syl) p.filterSyllabus = syl.value;
  const imp = drawer.querySelector('input[name="cpyqbImportance"]:checked');
  if (imp) p.filterImportance = imp.value;
  const unit = drawer.querySelector('input[name="cpyqbUnit"]:checked');
  if (unit) p.filterUnit = unit.value;
  p.filterNotStarted = !!drawer.querySelector('[data-filter="notStarted"].on');
  p.filterStrong = !!drawer.querySelector('[data-filter="strong"].on');
  p.filterWeak = !!drawer.querySelector('[data-filter="weak"].on');
  p.filterAverage = !!drawer.querySelector('[data-filter="average"].on');
  return p;
}

function cpyqbFilterDrawerHtml(p, subject, units) {
  const sort = p.sortBy || "default";
  const filterClass = p.filterClass || "all";
  const filterUnit = p.filterUnit || "all";
  const filterSyllabus = p.filterSyllabus || "all";
  const filterImportance = p.filterImportance || "all";
  const unitLabel = subject ? `${subject} Units` : "Units";
  const unitRadios = `<label class="cpyqb-f-radio"><input type="radio" name="cpyqbUnit" value="all"${filterUnit === "all" ? " checked" : ""}> All Units</label>` +
    (units || []).map(u => `<label class="cpyqb-f-radio"><input type="radio" name="cpyqbUnit" value="${u._id}"${filterUnit === u._id ? " checked" : ""}> ${u.title}</label>`).join("");
  const chip = (key, label, on) => `<button type="button" class="cpyqb-f-chip${on ? " on" : ""}" data-filter="${key}">${label}</button>`;
  return `<div class="cpyqb-filter-overlay" id="cpyqbFilterOverlay">
    <aside class="cpyqb-filter-drawer" id="cpyqbFilterDrawer">
      <div class="cpyqb-f-head">
        <strong>Filter &amp; Sorting</strong>
        <button type="button" class="cpyqb-f-clear" id="cpyqbFilterClear">Clear Filters</button>
      </div>
      <div class="cpyqb-f-body">
        <section class="cpyqb-f-sec">
          <h4>Sort by</h4>
          <label class="cpyqb-f-radio"><input type="radio" name="cpyqbSort" value="default"${sort === "default" || sort === "position" ? " checked" : ""}> Default (Quantrex chapter order)</label>
          <label class="cpyqb-f-radio"><input type="radio" name="cpyqbSort" value="importance_high"${sort === "importance_high" || sort === "importance" ? " checked" : ""}> Importance (High → Low)</label>
          <label class="cpyqb-f-radio"><input type="radio" name="cpyqbSort" value="importance_low"${sort === "importance_low" ? " checked" : ""}> Importance (Low → High)</label>
          <label class="cpyqb-f-radio"><input type="radio" name="cpyqbSort" value="name_asc"${sort === "name_asc" ? " checked" : ""}> Alphabetical Order (A - Z)</label>
          <label class="cpyqb-f-radio"><input type="radio" name="cpyqbSort" value="name_desc"${sort === "name_desc" ? " checked" : ""}> Alphabetical Order (Z - A)</label>
        </section>
        <section class="cpyqb-f-sec">
          <h4>👍 Recommended Chapter</h4>
          <div class="cpyqb-f-chips">
            ${chip("notStarted", "Not Started", p.filterNotStarted)}
            ${chip("strong", "Strong Chapter", p.filterStrong)}
            ${chip("weak", "Weak Chapter", p.filterWeak)}
            ${chip("average", "Average Chapter", p.filterAverage)}
          </div>
        </section>
        <section class="cpyqb-f-sec">
          <h4>Syllabus Chapter</h4>
          <label class="cpyqb-f-radio"><input type="radio" name="cpyqbSyllabus" value="all"${filterSyllabus === "all" ? " checked" : ""}> All Chapters</label>
          <label class="cpyqb-f-radio"><input type="radio" name="cpyqbSyllabus" value="reduced"${filterSyllabus === "reduced" ? " checked" : ""}> Reduced Chapters</label>
          <label class="cpyqb-f-radio"><input type="radio" name="cpyqbSyllabus" value="removed"${filterSyllabus === "removed" ? " checked" : ""}> Removed Chapters</label>
        </section>
        <section class="cpyqb-f-sec">
          <h4>Importance</h4>
          <label class="cpyqb-f-radio"><input type="radio" name="cpyqbImportance" value="all"${filterImportance === "all" ? " checked" : ""}> All</label>
          <label class="cpyqb-f-radio"><input type="radio" name="cpyqbImportance" value="high"${filterImportance === "high" ? " checked" : ""}> High Output Low Input</label>
          <label class="cpyqb-f-radio"><input type="radio" name="cpyqbImportance" value="low"${filterImportance === "low" ? " checked" : ""}> Low Output High Input</label>
        </section>
        <section class="cpyqb-f-sec">
          <h4>Class</h4>
          <label class="cpyqb-f-radio"><input type="radio" name="cpyqbClass" value="all"${filterClass === "all" ? " checked" : ""}> All Classes</label>
          <label class="cpyqb-f-radio"><input type="radio" name="cpyqbClass" value="Class 11"${filterClass === "Class 11" ? " checked" : ""}> Class 11</label>
          <label class="cpyqb-f-radio"><input type="radio" name="cpyqbClass" value="Class 12"${filterClass === "Class 12" ? " checked" : ""}> Class 12</label>
        </section>
        <section class="cpyqb-f-sec">
          <h4>${unitLabel}</h4>
          ${unitRadios}
        </section>
      </div>
      <div class="cpyqb-f-foot">
        <button type="button" class="btn-soft" id="cpyqbFilterCancel">Cancel</button>
        <button type="button" class="btn-primary" id="cpyqbFilterApply">Show Results</button>
      </div>
    </aside>
  </div>`;
}

function cpyqbExamsForCategory(allExams, category) {
  const list = allExams || [];
  const cat = category === "NDA" ? "Defence" : category;
  const order = (typeof CPYQB_EXAM_ORDER !== "undefined" && CPYQB_EXAM_ORDER[cat]) || [];
  const bySlug = new Map(list.map(e => [e.slug, e]));
  if (order.length) {
    const ordered = order.map(s => bySlug.get(s)).filter(Boolean);
    const seen = new Set(ordered.map(e => e.slug));
    list.forEach(e => {
      if (!e || !e.slug || seen.has(e.slug)) return;
      const eCat = e.slug === "nda" ? "Defence" : e.category;
      if (eCat === cat) {
        ordered.push(e);
        seen.add(e.slug);
      }
    });
    return ordered;
  }
  return list.filter(e => e && ((e.slug === "nda" && cat === "Defence") || e.category === cat));
}

function resolveCpyqbExam(nav, slug) {
  if (!slug) return null;
  return (nav || []).find(e => e.slug === slug) || null;
}

function qxClass9CpyqbExam(base) {
  const exam = Object.assign({
    slug: "class_9",
    title: "Class 9 CBSE",
    category: "Academic",
    count: 254,
    isComingSoon: false,
    subjects: []
  }, base || {});
  exam.slug = "class_9";
  exam.isComingSoon = false;
  exam.count = Math.max(Number(exam.count) || 0, 254);
  const ns = { name: "Number System", title: "Number System", count: 254 };
  const math = { name: "Mathematics", count: 254, chapters: [ns] };
  const subs = Array.isArray(exam.subjects) ? exam.subjects.slice() : [];
  const i = subs.findIndex(s => s && /math/i.test(s.name || ""));
  if (i < 0) subs.unshift(math);
  else {
    const ch = Array.isArray(subs[i].chapters) ? subs[i].chapters.slice() : [];
    if (!ch.some(c => /number\s*system/i.test(String((c && (c.name || c.title)) || "")))) {
      ch.unshift(ns);
    }
    subs[i] = Object.assign({}, subs[i], {
      chapters: ch,
      count: Math.max(Number(subs[i].count) || 0, 254)
    });
  }
  exam.subjects = subs;
  return exam;
}

/** Current study track for CPYQB (one page per track — never mix). */
function cpyqbActiveTrack() {
  let t = (typeof STATE !== "undefined" && STATE.exam) || "Engineering";
  if (t === "Foundation") t = "Academic";
  if (t === "NDA") t = "Defence";
  return t;
}

/**
 * PRODUCT RULE (owner):
 *  Class 7–10  → questions NOT added yet → Coming Soon
 *  Class 11    → JEE Main chapters + JEE Advanced chapters
 *  Class 12    → CBSE Board + JEE Main chapters + JEE Advanced chapters
 */
function academicClassFolderDefs(allExams) {
  const bySlug = new Map((allExams || []).map(e => [e.slug, e]));
  const classOrder = ["class_7", "class_8", "class_9", "class_10", "class_11", "class_12"];
  return classOrder.map(slug => {
    const nav = bySlug.get(slug) || {};
    const n = parseInt(String(slug).replace("class_", ""), 10);
    const label = Number.isFinite(n) ? `Class ${n}` : (nav.title || slug);
    let sub = "";
    let soon = false;
    if (n === 9) {
      sub = "CBSE Board · Number System";
      soon = false;
    } else if (n >= 7 && n <= 10) {
      sub = "Coming Soon · questions not added yet";
      soon = true;
    } else if (n === 11) {
      sub = "JEE Main · JEE Advanced chapters";
      soon = false;
    } else if (n === 12) {
      sub = "CBSE Board · JEE Main · JEE Advanced";
      soon = false;
    }
    return {
      slug,
      label,
      sub,
      soon,
      bank: !soon,
      count: nav.count || 0,
      chapterCount: (nav.subjects || []).reduce((a, s) => a + ((s.chapters || []).length), 0),
      subjectCount: (nav.subjects || []).length,
      classNum: n,
      hasChapters: true
    };
  });
}

/**
 * Per-class exam tracks — exact product rule above.
 */
function academicClassExamTracks(classNum) {
  const n = Number(classNum);
  const classSlug = `class_${n}`;

  // Class 9: CBSE Number System (Rachna Sagar Together Maths)
  if (n === 9) {
    return [
      {
        id: "cbse_board",
        label: "CBSE Board",
        sub: "Mathematics · Number System",
        logoSlug: "CBSE",
        iconFallback: "📚",
        click: {
          step: "subjects",
          exam: "class_9",
          classSlug: "class_9",
          trackKind: "cbse_board"
        }
      }
    ];
  }

  // Class 7 / 8 / 10: no question packs yet
  if (n >= 7 && n <= 10) {
    return [
      {
        id: "coming_soon",
        label: "Coming Soon",
        sub: "Class " + n + " questions will be added later",
        logoSlug: "CBSE",
        iconFallback: "⏳",
        soon: true,
        click: null
      }
    ];
  }

  // Class 11: JEE Main + JEE Advanced only
  if (n === 11) {
    return [
      {
        id: "jee_main",
        label: "JEE Main",
        sub: "Class 11 chapters · full JEE Main bank",
        logoSlug: "jee_main",
        iconFallback: "⚙️",
        click: {
          step: "subjects",
          exam: "jee_main",
          classSlug,
          trackKind: "jee_main",
          filterClass: "Class 11",
          sortBy: "default"
        }
      },
      {
        id: "jee_advanced",
        label: "JEE Advanced",
        sub: "Class 11 chapters · Advanced bank",
        logoSlug: "jee_advanced",
        iconFallback: "🚀",
        click: {
          step: "subjects",
          exam: "jee_advanced",
          classSlug,
          trackKind: "jee_advanced",
          filterClass: "Class 11",
          sortBy: "default"
        }
      }
    ];
  }

  // Class 12: CBSE Board + JEE Main + JEE Advanced
  return [
    {
      id: "cbse_board",
      label: "CBSE Board",
      sub: "Class 12 Board PYQs · CBSE",
      logoSlug: "CBSE",
      iconFallback: "📚",
      click: { step: "class12boards", classSlug: "class_12", board: "CBSE" }
    },
    {
      id: "jee_main",
      label: "JEE Main",
      sub: "Class 12 chapters · full JEE Main bank",
      logoSlug: "jee_main",
      iconFallback: "⚙️",
      click: {
        step: "subjects",
        exam: "jee_main",
        classSlug: "class_12",
        trackKind: "jee_main",
        filterClass: "Class 12",
        sortBy: "default"
      }
    },
    {
      id: "jee_advanced",
      label: "JEE Advanced",
      sub: "Class 12 chapters · Advanced bank",
      logoSlug: "jee_advanced",
      iconFallback: "🚀",
      click: {
        step: "subjects",
        exam: "jee_advanced",
        classSlug: "class_12",
        trackKind: "jee_advanced",
        filterClass: "Class 12",
        sortBy: "default"
      }
    }
  ];
}

function renderAcademicClassExamTracks(classSlug) {
  const n = parseInt(String(classSlug || "").replace("class_", ""), 10) || 11;
  const tracks = academicClassExamTracks(n);
  const tiles = tracks.map(t => {
    const logo = typeof QuantrexExamLogos !== "undefined"
      ? QuantrexExamLogos.html(t.logoSlug, 44, "cpyqb-exam-tile-logo")
      : `<span class="cpyqb-exam-tile-folder" style="font-size:28px">${t.iconFallback || "📁"}</span>`;
    let click;
    const soon = !!t.soon || !t.click;
    if (t.bookId) {
      click = mg("books", { step: "modules", bookId: t.bookId });
    } else if (t.click && !soon) {
      click = mg("cpyqb", t.click);
    } else {
      click = `onclick="typeof showToast==='function'&&showToast('📚 Class ${n} — Coming Soon (questions not added yet)')"`;
    }
    return `<div class="cpyqb-exam-tile qx-class-exam-tile${soon ? " soon" : ""}" ${click} data-track="${t.id}" style="${soon ? "opacity:.7;cursor:default" : ""}">
      <div class="cpyqb-exam-tile-ic">${logo}</div>
      <strong>${t.label}${soon ? " · Soon" : ""}</strong>
      <small>${t.sub}</small>
    </div>`;
  }).join("");
  const bc = typeof breadcrumb === "function"
    ? breadcrumb([
      { label: "Class 7–12", view: "cpyqb", payload: { step: "exams", forceExamList: true } },
      { label: `Class ${n}` }
    ])
    : "";
  const hint = n === 9
    ? "CBSE Board · Mathematics · Number System"
    : (n <= 10
      ? "Questions for Class " + n + " are not added yet"
      : (n === 11
        ? "Class 11 · open JEE Main or JEE Advanced chapter list"
        : "Class 12 · CBSE Board · JEE Main · JEE Advanced chapter lists"));
  return `<div class="cpyqb-exam-bank-page qx-academic-page">
    <div class="cpyqb-exam-bank-head">
      <h1>Class ${n}</h1>
      <p class="sec-desc">${hint}</p>
    </div>
    ${bc}
    <h2 class="cpyqb-exam-sec-title">${n === 9 ? "Select track" : (n <= 10 ? "Status" : "Select track")}</h2>
    <div class="cpyqb-exam-grid qx-class-exam-grid qx-class-exam-grid-${tracks.length}">${tiles}</div>
  </div>`;
}

function renderAcademicClassFolders(allExams) {
  const folders = academicClassFolderDefs(allExams);
  const tiles = folders.map(f => {
    const logo = typeof QuantrexExamLogos !== "undefined"
      ? QuantrexExamLogos.html(f.slug === "class_12" ? "cbse" : (f.classNum >= 11 ? "jee_main" : f.slug), 44, "cpyqb-exam-tile-logo")
      : `<span class="cpyqb-exam-tile-folder" aria-hidden="true">📁</span>`;
    const click = f.soon
      ? `onclick="typeof showToast==='function'&&showToast('📚 ${String(f.label || "").replace(/'/g, "")} — Coming Soon')"`
      : mg("cpyqb", { step: "classExams", classSlug: f.slug, exam: f.slug });
    const metaLine = f.soon
      ? "Coming Soon"
      : (f.classNum === 9 ? "CBSE · Number System"
        : (f.classNum === 11 ? "2 tracks · JEE Main + Advanced" : "3 tracks · CBSE + JEE Main + Advanced"));
    return `<div class="cpyqb-exam-tile qx-class-folder-tile${f.soon ? " soon" : ""}" ${click} data-class="${f.classNum}">
      <div class="cpyqb-exam-tile-ic">${logo}</div>
      <strong>${f.label}${f.soon ? " · Soon" : ""}</strong>
      <small>${f.sub}</small>
      <span class="qx-class-folder-meta">${metaLine}</span>
    </div>`;
  }).join("");
  return `<div class="cpyqb-exam-bank-page qx-academic-page">
    <div class="cpyqb-exam-bank-head">
      <h1>Class 7–12</h1>
      <p class="sec-desc"><b>7–8, 10:</b> Coming Soon &nbsp;·&nbsp; <b>9:</b> CBSE Number System &nbsp;·&nbsp; <b>11:</b> JEE Main + JEE Advanced &nbsp;·&nbsp; <b>12:</b> CBSE Board + JEE Main + JEE Advanced</p>
    </div>
    <h2 class="cpyqb-exam-sec-title">Select Class</h2>
    <div class="cpyqb-exam-grid qx-class-folder-grid">${tiles}</div>
  </div>`;
}

function renderClass12BoardPicker() {
  // Owner rule: Class 12 → CBSE Board (primary). Keep HSC optional.
  const boards = [
    { id: "CBSE", label: "CBSE Board", sub: "Class 12 Board PYQs · Physics · Chem · Maths · Bio" },
    { id: "HSC", label: "HSC (Maharashtra)", sub: "State board · year & date wise PYQs" }
  ];
  const tiles = boards.map(b => {
    const examId = (typeof MarksLive !== "undefined" && MarksLive.BOARD_EXAMS)
      ? (MarksLive.BOARD_EXAMS[b.id] || "")
      : "";
    const logo = typeof QuantrexExamLogos !== "undefined"
      ? QuantrexExamLogos.html(b.id, 40, "cpyqb-exam-tile-logo")
      : "";
    const click = mg("board", { step: "subjects", examId, board: b.id });
    return `<div class="cpyqb-exam-tile" ${click} data-set-board="${b.id}">
      <div class="cpyqb-exam-tile-ic">${logo}</div>
      <strong>${b.label}</strong>
      <small>${b.sub}</small>
    </div>`;
  }).join("");
  const bc = typeof breadcrumb === "function"
    ? breadcrumb([
      { label: "Class 7–12", view: "cpyqb", payload: { step: "exams", forceExamList: true } },
      { label: "Class 12", view: "cpyqb", payload: { step: "classExams", classSlug: "class_12" } },
      { label: "Board" }
    ])
    : "";
  return `<div class="cpyqb-exam-bank-page">
    <div class="cpyqb-exam-bank-head">
      <h1>Class 12 · Board PYQs</h1>
      <p class="sec-desc">CBSE Board (main) · HSC optional</p>
    </div>
    ${bc}
    <h2 class="cpyqb-exam-sec-title">Boards</h2>
    <div class="cpyqb-exam-grid">${tiles}</div>
  </div>`;
}

function renderCpyqbExamBank(allExams) {
  const track = cpyqbActiveTrack();
  // Academic: Class 7–12 folders only (Class 12 → CBSE/HSC)
  if (track === "Academic") {
    return renderAcademicClassFolders(allExams);
  }

  const sectionTitles = {
    Engineering: "Engineering",
    Medical: "Medical",
    Defence: "Defence"
  };
  const list = cpyqbExamsForCategory(allExams, track);
  // Defence: never mix NDA with academic class stubs
  const exams = track === "Defence"
    ? list.filter(e => e && (e.slug === "nda" || e.category === "Defence"))
    : list.filter(e => e && !String(e.slug || "").startsWith("class_"));

  const tile = e => {
    const bi = (typeof BANK_INDEX !== "undefined" && BANK_INDEX[e.slug]) || null;
    const count = Math.max(Number(e.count) || 0, Number(bi && bi.count) || 0);
    // Only mark Coming Soon for explicit flags / Class 7–10 — never hide real PYQ banks with 0 nav count
    const soon = !!(e.isComingSoon || (bi && bi.isComingSoon) || /^class_(7|8|10)$/.test(String(e.slug || "")) || (count <= 0 && !/^class_9$/.test(String(e.slug || ""))));
    const yrs = typeof cpyqbExamYearLabel === "function" ? cpyqbExamYearLabel(e.slug) : "";
    const sub = soon
      ? "Coming Soon"
      : (yrs ? `${yrs}` : `${count.toLocaleString()} questions`);
    let logo = "";
    try {
      logo = typeof QuantrexExamLogos !== "undefined" ? QuantrexExamLogos.html(e.slug, 40, "cpyqb-exam-tile-logo") : "";
    } catch (_) { logo = ""; }
    let prog = { solved: 0, total: count };
    try {
      if (typeof QxCardIcons !== "undefined") prog = QxCardIcons.examProgressStats(e.slug) || prog;
    } catch (_) { /* keep defaults */ }
    const total = prog.total || count || 0;
    const slug = String(e.slug || "").replace(/[^a-z0-9_]/gi, "");
    // Direct go() — most reliable for every exam (TS EAMCET, AP EAMCET, …)
    const click = soon
      ? `onclick="typeof showToast==='function'&&showToast('📚 ${String(e.title || "").replace(/'/g, "")} — Coming Soon')"`
      : `onclick="event.preventDefault();event.stopPropagation();go('cpyqb',{step:'subjects',exam:'${slug}',forceExamList:false});return false;" ${mg("cpyqb", { step: "subjects", exam: slug, forceExamList: false })}`;
    return `<div class="cpyqb-exam-tile${soon ? " soon" : ""}" ${click} role="button" tabindex="0" data-exam-slug="${slug}" style="${soon ? "opacity:.65;cursor:default" : "cursor:pointer"}">
      <div class="cpyqb-exam-tile-ic">${logo}</div>
      <strong>${e.title}${soon ? " · Soon" : ""}</strong>
      <small>${sub}</small>
      ${soon ? "" : qxProgressBar(prog.solved, total)}
    </div>`;
  };
  const title = sectionTitles[track] || track;
  const head = track === "Defence"
    ? "Defence · NDA Previous Year Questions"
    : track === "Medical"
      ? "Medical · NEET & other medical exams"
      : "Engineering · JEE & other engineering exams";
  return `<div class="cpyqb-exam-bank-page">
    <div class="cpyqb-exam-bank-head">
      <h1>Chapter wise Previous Year Questions Bank</h1>
      <p class="sec-desc">${head}</p>
    </div>
    <h2 class="cpyqb-exam-sec-title">${title}</h2>
    <div class="cpyqb-exam-grid">${exams.map(tile).join("") || '<div class="empty">No exams for this track.</div>'}</div>
  </div>`;
}

function bindCpyqbFilters(root) {
  const scope = root || document;
  const bar = scope.querySelector("#cpyqbFilterBar");
  if (bar && !bar._bound) {
    bar._bound = true;
    const openBtn = bar.querySelector("#cpyqbFilterOpen");
    if (openBtn) {
      openBtn.onclick = (e) => {
        e.preventDefault();
        const overlay = scope.querySelector("#cpyqbFilterOverlay");
        if (overlay) overlay.classList.add("open");
      };
    }
  }
  const overlay = scope.querySelector("#cpyqbFilterOverlay");
  if (!overlay || overlay._bound) return;
  overlay._bound = true;
  const drawer = overlay.querySelector("#cpyqbFilterDrawer");
  const close = () => overlay.classList.remove("open");
  overlay.onclick = e => { if (e.target === overlay) close(); };
  const cancel = overlay.querySelector("#cpyqbFilterCancel");
  if (cancel) cancel.onclick = close;
  drawer.querySelectorAll("[data-filter]").forEach(btn => {
    btn.onclick = e => { e.preventDefault(); btn.classList.toggle("on"); };
  });
  const clear = overlay.querySelector("#cpyqbFilterClear");
  if (clear) {
    clear.onclick = () => {
      // Keep class track context (Class 11 JEE etc.) — only reset optional filters
      const keepClass = (_cpyqbPayload.trackKind === "jee_main" || _cpyqbPayload.trackKind === "jee_advanced")
        && _cpyqbPayload.filterClass && _cpyqbPayload.filterClass !== "all"
        ? _cpyqbPayload.filterClass
        : "all";
      render("cpyqb", {
        ..._cpyqbPayload,
        filterClass: keepClass,
        filterUnit: "all",
        filterSyllabus: "all",
        filterImportance: "all",
        sortBy: "default",
        filterNotStarted: false,
        filterStrong: false,
        filterWeak: false,
        filterAverage: false
      });
    };
  }
  const applyBtn = overlay.querySelector("#cpyqbFilterApply");
  if (applyBtn) {
    applyBtn.onclick = () => {
      const filters = cpyqbFilterPayloadFromDrawer(drawer);
      // Preserve Academic class → exam track context
      render("cpyqb", {
        ..._cpyqbPayload,
        ...filters,
        classSlug: _cpyqbPayload.classSlug,
        trackKind: _cpyqbPayload.trackKind
      });
      close();
    };
  }
}

function filterByMarksIds(qs, ids) {
  if (!ids || !ids.length) return qs;
  const set = new Set(ids);
  return qs.filter(q => q._marksId && set.has(q._marksId));
}

function marksIdsFromMeta(meta, mode, bucketId, bucketTitle, topicId, topicTitle) {
  if (!meta) return [];
  if (mode === "bucket" && (bucketId || bucketTitle)) {
    const b = findMetaItem(meta.buckets, bucketId, bucketTitle);
    return b && b.questionIds ? b.questionIds.slice() : [];
  }
  if (mode === "topic" && (topicId || topicTitle)) {
    const t = findMetaItem(meta.topics, topicId, topicTitle);
    return t && t.questionIds ? t.questionIds.slice() : [];
  }
  // Full chapter: collect from every source so lists are never blank when meta has IDs
  const ids = [];
  const seen = new Set();
  function pushAll(arr) {
    (arr || []).forEach(id => {
      if (!id || seen.has(id)) return;
      seen.add(id);
      ids.push(id);
    });
  }
  pushAll(meta.questionIds || meta.question_ids || meta.allQuestionIds);
  (meta.buckets || []).forEach(b => pushAll(b && b.questionIds));
  (meta.topics || []).forEach(t => pushAll(t && t.questionIds));
  (meta.subtopics || []).forEach(t => pushAll(t && t.questionIds));
  (meta.sections || []).forEach(s => {
    pushAll(s && s.questionIds);
    (s && s.topics || []).forEach(t => pushAll(t && t.questionIds));
  });
  return ids;
}

/** Instant list stubs from Marks IDs — never download 46MB bank for a chapter list */
function qxLightStubsFromMarksIds(ids, liveMeta) {
  const out = [];
  const seen = new Set();
  (ids || []).forEach((mid, i) => {
    if (!mid || seen.has(mid)) return;
    seen.add(mid);
    let existing = null;
    if (typeof QUESTIONS !== "undefined") {
      existing = QUESTIONS.find(q => q && q._marksId === mid);
    }
    if (existing) {
      // Keep session map fresh for refresh-safe deep links
      if (typeof QxQuestionCache !== "undefined" && QxQuestionCache.rememberStub) {
        QxQuestionCache.rememberStub(existing);
      }
      out.push(existing);
      return;
    }
    // Refresh-safe id: m_<marksObjectId> → #question/m_xxx survives reload (fixes 910000000 not found)
    const hid = (typeof QxQuestionCache !== "undefined" && QxQuestionCache.appIdFromMarksId)
      ? QxQuestionCache.appIdFromMarksId(mid)
      : ("m_" + String(mid));
    const rec = {
      id: hid,
      _marksId: String(mid),
      _bank: (liveMeta && liveMeta.bank) || "jee_main",
      _live: true,
      _listStub: true,
      _needsFull: true,
      subject: (liveMeta && liveMeta.subject) || "",
      chapter: (liveMeta && liveMeta.chapter) || "",
      exam: (liveMeta && liveMeta.exam) || (typeof STATE !== "undefined" ? STATE.exam : "Engineering"),
      examName: (liveMeta && liveMeta.examName) || "",
      q: "Loading question " + (out.length + 1) + "…",
      options: ["", "", "", ""],
      answer: 0,
      solution: "",
      difficulty: "Medium",
      source: (liveMeta && liveMeta.examName) || "PYQ",
      _optsLoadFailed: false,
      _needsOpts: true
    };
    if (typeof QUESTIONS !== "undefined") QUESTIONS.push(rec);
    if (typeof _qxIndexQuestion === "function") _qxIndexQuestion(rec);
    if (typeof QxQuestionCache !== "undefined" && QxQuestionCache.rememberStub) {
      QxQuestionCache.rememberStub(rec);
    }
    out.push(rec);
  });
  return out;
}

async function qxFillStubsFromCatalog(qs) {
  const list = qs || [];
  if (!list.length || typeof QuantrexCatalog === "undefined" || !QuantrexCatalog.questionsByIds) return list;
  const need = list.filter((q) => {
    if (!q) return false;
    if (q._listStub || q._needsFull) return true;
    if (/^Loading question/i.test(String(q.q || "").replace(/<[^>]+>/g, " ").trim())) return true;
    const opts = q.options || [];
    return !opts.some((o) => {
      const t = String(o || "").replace(/<[^>]+>/g, "").trim();
      return (t && t.length > 1 && !/^[A-D]$/i.test(t)) || /<img\b/i.test(String(o || ""));
    });
  });
  if (!need.length) return list;
  const ids = need.map((q) => q._marksId || q.id).filter(Boolean);
  for (let i = 0; i < ids.length; i += 20) {
    try {
      const data = await QuantrexCatalog.questionsByIds(ids.slice(i, i + 20));
      ((data && data.questions) || []).forEach((rec) => {
        if (!rec) return;
        need.forEach((q) => {
          if (String(q._marksId) === String(rec._marksId)
            || String(q.id) === String(rec.id)
            || String(q._marksId) === String(rec.id)
            || String(q.id) === String(rec._marksId)) {
            QuantrexCatalog.applyCatalogRec(q, rec);
          }
        });
      });
    } catch (_) { /* next chunk */ }
  }
  return list;
}

async function ensureCpyqbChapterQuestions(examSlug, subject, chapter, meta, opts) {
  opts = opts || {};
  // 0) Fast path: one chapter JSON (~0.2–2 MB), never parse 52 MB jee_main.json
  if (typeof loadChapterBank === "function") {
    try {
      const fast = await loadChapterBank(examSlug, subject, chapter);
      if (fast && fast.length) {
        if (opts.mode === "bucket" && (opts.bucketId || opts.bucketTitle) && meta) {
          const bucket = findMetaItem(meta.buckets, opts.bucketId, opts.bucketTitle);
          if (bucket && bucket.questionIds && bucket.questionIds.length) {
            const filtered = filterByMarksIds(fast, bucket.questionIds);
            if (filtered.length) return filtered;
          }
        } else if (opts.mode === "topic" && (opts.topicId || opts.topicTitle) && meta) {
          const topic = findMetaItem(meta.topics, opts.topicId, opts.topicTitle);
          if (topic && topic.questionIds && topic.questionIds.length) {
            const filtered = filterByMarksIds(fast, topic.questionIds);
            if (filtered.length) return filtered;
          }
        } else {
          return fast;
        }
      }
    } catch (e) {
      console.warn("chapter file load fail", examSlug, subject, chapter, e);
    }
  }
  // 1) If bank already in memory, use chapter slice (fast)
  let qs = [];
  if (_banksLoaded[examSlug]) {
    qs = (typeof getChapterQuestions === "function")
      ? getChapterQuestions(examSlug, subject, chapter)
      : QUESTIONS.filter(q => q._bank === examSlug && q.subject === subject && q.chapter === chapter);
    if (qs.length && !(typeof isBankUnavailable === "function" && isBankUnavailable(examSlug))) {
      if (opts.mode === "bucket" && (opts.bucketId || opts.bucketTitle) && meta) {
        const bucket = findMetaItem(meta.buckets, opts.bucketId, opts.bucketTitle);
        if (bucket && bucket.questionIds && bucket.questionIds.length) {
          const filtered = filterByMarksIds(qs, bucket.questionIds);
          if (filtered.length) return filtered;
        }
      } else if (opts.mode === "topic" && (opts.topicId || opts.topicTitle) && meta) {
        const topic = findMetaItem(meta.topics, opts.topicId, opts.topicTitle);
        if (topic && topic.questionIds && topic.questionIds.length) {
          const filtered = filterByMarksIds(qs, topic.questionIds);
          if (filtered.length) return filtered;
        }
      } else {
        return qs;
      }
    }
  }

  // 2) Catalog API — chapter IDs only (never the full bank)
  if ((!meta || !meta.examId) && typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.questions) {
    try {
      const page = await QuantrexCatalog.questions({ exam: examSlug, subject: subject, chapter: chapter, limit: 80 });
      if (page && page.ok && page.questionIds && page.questionIds.length) {
        const liveFromCat = {
          subject,
          chapter: page.chapter || chapter,
          bank: examSlug,
          exam: (typeof BANK_INDEX !== "undefined" && BANK_INDEX[examSlug] && BANK_INDEX[examSlug].category) || "Engineering",
          examName: (typeof BANK_INDEX !== "undefined" && BANK_INDEX[examSlug] && BANK_INDEX[examSlug].title) || examSlug
        };
        return qxFillStubsFromCatalog(qxLightStubsFromMarksIds(page.questionIds, liveFromCat));
      }
    } catch (_) { /* fall through */ }
  }
  // 3) MARKS-first path — NEVER await 46MB jee_main bank (main hang source)
  if (!meta || !meta.examId) meta = await fetchChapterMeta(examSlug, subject, chapter);
  const liveMeta = {
    subject,
    chapter,
    bank: examSlug,
    exam: (typeof BANK_INDEX !== "undefined" && BANK_INDEX[examSlug] && BANK_INDEX[examSlug].category) || "Engineering",
    examName: (typeof BANK_INDEX !== "undefined" && BANK_INDEX[examSlug] && BANK_INDEX[examSlug].title) || examSlug
  };

  if (meta && typeof MarksLive !== "undefined") {
    try {
      await MarksLive.ensureToken();
    } catch (e) {
      showToast("⚠️ Session sync failed — refresh page");
    }

    try {
      if (opts.mode === "bucket" && opts.bucketId && MarksLive.cpyqbBucketQuestions && meta.examId) {
        showToast("📡 Loading bucket…");
        const data = await MarksLive.cpyqbBucketQuestions(
          meta.examId, meta.subjectId, meta.chapterId, opts.bucketId, liveMeta
        );
        qs = data.questions || [];
      } else if (opts.mode === "topic" && opts.topicId && MarksLive.cpyqbTopicQuestions && meta.examId) {
        showToast("📡 Loading topic…");
        const data = await MarksLive.cpyqbTopicQuestions(
          meta.examId, meta.subjectId, meta.chapterId, opts.topicId, liveMeta
        );
        qs = data.questions || [];
      } else {
        // Instant stubs from chapter_meta IDs (no full-body fetch, no bank)
        const ids = marksIdsFromMeta(meta, opts.mode, opts.bucketId, opts.bucketTitle, opts.topicId, opts.topicTitle);
        if (ids.length) {
          qs = await qxFillStubsFromCatalog(qxLightStubsFromMarksIds(ids, liveMeta));
        } else if (meta.buckets && meta.buckets.length && MarksLive.cpyqbBucketQuestions && meta.examId) {
          // Fallback: one lightweight list call per bucket (still << 46MB parse)
          showToast("📡 Loading chapter list…");
          const all = [];
          for (let bi = 0; bi < meta.buckets.length; bi++) {
            const b = meta.buckets[bi];
            if (!b || !b.id) continue;
            try {
              const data = await MarksLive.cpyqbBucketQuestions(
                meta.examId, meta.subjectId, meta.chapterId, b.id, liveMeta
              );
              (data.questions || []).forEach(q => all.push(q));
            } catch (_) { /* next bucket */ }
          }
          qs = all;
        }
      }
    } catch (e) {
      console.warn("Marks chapter list fail", e);
    }
  }

  // Prefer full local bank text over empty "Loading…" stubs when bank has chapter
  const mostlyStubs = qs.length && qs.filter(q => q && (q._listStub || /^Loading question/i.test(String(q.q || "")))).length >= Math.min(qs.length, 3);
  // Always try bank for topic/bucket when we only have stubs (JEE Adv Amines open fix)
  if (!qs.length || mostlyStubs || (opts.mode === "topic" && mostlyStubs)) {
    try {
      if (typeof loadChapterBank === "function") {
        const fast2 = await loadChapterBank(examSlug, subject, chapter);
        if (fast2 && fast2.length) {
          if (meta) {
            const ids = marksIdsFromMeta(meta, opts.mode, opts.bucketId, opts.bucketTitle, opts.topicId, opts.topicTitle);
            if (ids && ids.length) {
              const filtered = filterByMarksIds(fast2, ids);
              if (filtered.length) return filtered;
            }
          }
          return fast2;
        }
      }
      if (typeof loadSingleBank === "function" && typeof BANK_INDEX !== "undefined" && BANK_INDEX[examSlug]) {
        const metaCount = (BANK_INDEX[examSlug] && BANK_INDEX[examSlug].count) || 0;
        if (typeof showToast === "function" && metaCount > 3000 && (!qs.length || mostlyStubs)) {
          showToast("📚 Loading chapter from bank…");
        }
        await loadSingleBank(examSlug, { allowLarge: true });
        let bankQs = (typeof getChapterQuestions === "function")
          ? getChapterQuestions(examSlug, subject, chapter)
          : [];
        if (!bankQs.length && typeof QUESTIONS !== "undefined") {
          const chL = String(chapter || "").toLowerCase().trim();
          const subL = String(subject || "").toLowerCase().trim();
          bankQs = QUESTIONS.filter(q =>
            q && q._bank === examSlug
            && String(q.subject || "").toLowerCase().trim() === subL
            && (String(q.chapter || "").toLowerCase().trim() === chL
              || String(q.chapter || "").toLowerCase().includes(chL)
              || chL.includes(String(q.chapter || "").toLowerCase().trim()))
          );
        }
        // Topic/bucket: map Marks IDs onto full bank questions (not empty stubs)
        if (bankQs.length && meta) {
          const ids = marksIdsFromMeta(meta, opts.mode, opts.bucketId, opts.bucketTitle, opts.topicId, opts.topicTitle);
          if (ids && ids.length) {
            const filtered = filterByMarksIds(bankQs, ids);
            if (filtered.length) return filtered;
          }
        }
        if (bankQs.length) return bankQs;
      }
    } catch (e) {
      console.warn("Bank chapter fallback failed", examSlug, subject, chapter, e);
    }
  }

  if (qs.length) {
    // Light background prefetch of first few only
    if (typeof MarksLive !== "undefined" && MarksLive.prefetchQuestions) {
      const ids = qs.slice(0, 6).map(q => q.id);
      Promise.resolve().then(() => MarksLive.prefetchQuestions(ids)).catch(() => {});
    }
    return qs;
  }

  if (typeof showToast === "function") {
    showToast("⚠️ Could not load chapter questions. Retry in a moment.");
  }
  return qs;
}

function findMetaItem(list, id, title) {
  if (!list || !list.length) return null;
  if (id) {
    const byId = list.find(x => x.id === id);
    if (byId) return byId;
  }
  if (title) {
    const t = String(title).trim();
    return list.find(x => x.title === t) || list.find(x => (x.title || "").trim() === t);
  }
  return null;
}

function bucketTone(bucket) {
  const b = typeof bucket === "string" ? { title: bucket } : (bucket || {});
  const level = String(b.bucketLevel || b.level || "").toLowerCase();
  if (level.includes("beginner") || level === "1") return "bucket-beginner";
  if (level.includes("mains") || level.includes("target") || level === "2") return "bucket-mains";
  if (level.includes("advance") || level.includes("climb") || level === "3") return "bucket-advance";
  if (level.includes("must") || level.includes("5 year") || level === "4") return "bucket-mustdo";
  if (level.includes("numerical") || level === "5") return "bucket-numerical";
  const t = String(b.title || "").toLowerCase();
  if (t.includes("beginner")) return "bucket-beginner";
  if (t.includes("target") || t.includes("mains")) return "bucket-mains";
  if (t.includes("advance") || t.includes("climb")) return "bucket-advance";
  if (t.includes("must do") || t.includes("5 year")) return "bucket-mustdo";
  if (t.includes("numerical")) return "bucket-numerical";
  // Marks Adv type levels
  if (t.includes("multi") || t.includes("more correct")) return "bucket-advance";
  if (t.includes("single")) return "bucket-mains";
  if (t.includes("true") || t.includes("false") || t.includes("assertion")) return "bucket-mustdo";
  if (t.includes("column") || t.includes("match") || t.includes("matrix")) return "bucket-numerical";
  if (t.includes("subjective") || t.includes("integer") || t.includes("numerical")) return "bucket-numerical";
  return "bucket-default";
}

/** Marks-style Adv levels: Single / Multi / True-False / Column Match / Subjective */
const JEE_ADV_TYPE_LEVELS = [
  { id: "singleCorrect", title: "Single Correct", short: "SC", icon: "①" },
  { id: "multipleCorrect", title: "Multi Correct", short: "MC", icon: "☑" },
  { id: "trueFalse", title: "True / False", short: "T/F", icon: "T/F" },
  { id: "columnMatch", title: "Column Matching", short: "Match", icon: "⇄" },
  { id: "subjective", title: "Subjective / Numerical", short: "NAT", icon: "123" }
];

function classifyJeeAdvLevel(q) {
  if (!q) return "singleCorrect";
  const stemRaw = String(q.q || q.question || "");
  const stem = stemRaw.replace(/<[^>]+>/g, " ");
  const t = String(q.questionType || q.type || q._advSection || "").toLowerCase();
  // Column matching first (List-I / List-II) — Marks label
  if (q._advSection === "MATCH"
    || /list[\s-]*i\b|list[\s-]*ii\b|match the following|column matching|matrix match/i.test(stem)
    || (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.isMatchColumn && QuantrexQFormat.isMatchColumn(q))) {
    return "columnMatch";
  }
  if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.looksCodedSingleCorrect
    && QuantrexQFormat.looksCodedSingleCorrect(q)) {
    return "singleCorrect";
  }
  // Multi correct BEFORE true/false — "which is (are) FALSE?" is MULTI not T/F
  // (old regex matched "which of the following is false" and dumped multi into T/F)
  if (t.includes("multiple") || t === "mc" || q._advSection === "MC"
    || (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.looksMultipleCorrect && QuantrexQFormat.looksMultipleCorrect(q))
    || (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType && QuantrexQFormat.getType(q) === "multipleCorrect")
    || /\bis\s*\(are\)\s+(TRUE|FALSE)\b/i.test(stem)
    || /\bstatement\s*\(s\)\s+is\s*\(are\)\b/i.test(stem)
    || /\bone or more than one\s+(?:of\s+the\s+)?(?:correct\s+)?(?:option|answer|statement)/i.test(stem)
    || /\bcorrect option\(s\)\b/i.test(stem)
    || (Array.isArray(q.answers) && q.answers.length > 1)) {
    return "multipleCorrect";
  }
  // True / False / Assertion-Reason only (NOT multi "which is false")
  if (t.includes("truefalse") || t.includes("true_false") || t.includes("assertion")
    || /assertion[\s-]*reason|both assertion|reason is (true|false)/i.test(stem)
    || (/\btrue\s*\/\s*false\b/i.test(stem) && !/\bis\s*\(are\)\b/i.test(stem))
    || (/\bstatement[\s-]*i\b/i.test(stem) && /\bstatement[\s-]*ii\b/i.test(stem)
      && !/\bis\s*\(are\)\b/i.test(stem))) {
    return "trueFalse";
  }
  // Subjective / numerical / integer
  if (t.includes("numerical") || t.includes("subjective") || t.includes("integer") || t === "num"
    || q._advSection === "NUM"
    || (typeof isNumericalQuestion === "function" && isNumericalQuestion(q))
    || (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType && QuantrexQFormat.getType(q) === "numerical")) {
    return "subjective";
  }
  return "singleCorrect";
}

function buildJeeAdvTypeBuckets(qs) {
  const groups = {
    singleCorrect: [],
    multipleCorrect: [],
    trueFalse: [],
    columnMatch: [],
    subjective: []
  };
  (qs || []).forEach(q => {
    const lv = classifyJeeAdvLevel(q);
    if (!groups[lv]) groups[lv] = [];
    groups[lv].push(q);
  });
  // Always show ALL official Adv type folders (even if count 0) — Marks-style arrange
  return JEE_ADV_TYPE_LEVELS.map(L => ({
    id: L.id,
    title: L.title,
    short: L.short,
    icon: L.icon,
    count: (groups[L.id] || []).length,
    questions: groups[L.id] || [],
    empty: !(groups[L.id] && groups[L.id].length)
  }));
}

function filterQsByJeeAdvLevel(qs, levelId) {
  if (!levelId || levelId === "all") return qs || [];
  return (qs || []).filter(q => classifyJeeAdvLevel(q) === levelId);
}

if (typeof window !== "undefined") {
  window.classifyJeeAdvLevel = classifyJeeAdvLevel;
  window.buildJeeAdvTypeBuckets = buildJeeAdvTypeBuckets;
  window.JEE_ADV_TYPE_LEVELS = JEE_ADV_TYPE_LEVELS;
}

function cpyqbTrendByYear(qs, maxYears) {
  const byYear = {};
  (qs || []).forEach(q => {
    const y = qYearFromSource(q.source);
    if (!y) return;
    if (!byYear[y]) byYear[y] = { easy: 0, medium: 0, tough: 0, total: 0 };
    byYear[y].total++;
    const d = String(q.difficulty || "Medium").toLowerCase();
    if (d === "easy") byYear[y].easy++;
    else if (d === "hard" || d === "tough" || d === "difficult") byYear[y].tough++;
    else byYear[y].medium++;
  });
  return Object.keys(byYear).map(Number).sort((a, b) => b - a).slice(0, maxYears || 3)
    .map(y => ({ year: y, ...byYear[y] }));
}

function cpyqbTrendChartHtml(trends) {
  if (!trends.length) return `<div class="ch-hub-trend-empty">Not enough year data for trends yet.</div>`;
  const max = Math.max(1, ...trends.map(t => t.total));
  const bars = trends.slice().reverse().map(t => {
    const hEasy = Math.round((t.easy / max) * 100);
    const hMed = Math.round((t.medium / max) * 100);
    const hTough = Math.round((t.tough / max) * 100);
    return `<div class="ch-hub-trend-col">
      <div class="ch-hub-trend-stack" title="Easy ${t.easy} · Moderate ${t.medium} · Tough ${t.tough}">
        <span class="ch-t-e" style="height:${hEasy}%"></span>
        <span class="ch-t-m" style="height:${hMed}%"></span>
        <span class="ch-t-t" style="height:${hTough}%"></span>
      </div>
      <em>${t.year}</em>
    </div>`;
  }).join("");
  return `<div class="ch-hub-trend-chart">${bars}</div>
    <div class="ch-hub-trend-legend">
      <span><i class="ch-t-e"></i> Easy</span>
      <span><i class="ch-t-m"></i> Moderate</span>
      <span><i class="ch-t-t"></i> Tough</span>
      <span><i class="ch-t-o"></i> Overall</span>
    </div>`;
}

function renderJeeAdvTypeLevelCards(p, typeBuckets) {
  if (!typeBuckets || !typeBuckets.length) return "";
  const orderHint = { singleCorrect: 1, multipleCorrect: 2, trueFalse: 3, columnMatch: 4, subjective: 5 };
  const sorted = typeBuckets.slice().sort((a, b) => (orderHint[a.id] || 9) - (orderHint[b.id] || 9));
  const cards = sorted.map((b, idx) => {
    const empty = !b.count;
    const tone = empty ? "bucket-empty" : bucketTone(b);
    const click = empty
      ? ""
      : mg("cpyqb", {
        step: "questions",
        mode: "typeLevel",
        exam: p.exam,
        subject: p.subject,
        chapter: p.chapter,
        levelId: b.id,
        levelTitle: b.title
      });
    return `
    <button type="button" class="ch-card qx-bucket-card qx-ch-card-rich qx-adv-level qx-adv-folder ${tone}${empty ? " qx-adv-empty" : ""}"
      ${click || 'disabled aria-disabled="true"'}
      data-adv-level="${b.id}" data-adv-order="${idx + 1}">
      <div class="qx-adv-folder-tab" aria-hidden="true">${b.short || "Q"}</div>
      <div class="qx-ch-card-top">
        <span class="qx-adv-level-ic" aria-hidden="true">${b.icon || "Q"}</span>
        <div class="qx-ch-body">
          <strong>${b.title}</strong>
          <small>${empty ? "No questions in this chapter yet" : `${b.count} question${b.count === 1 ? "" : "s"} · JEE Advanced`}</small>
        </div>
      </div>
      <div class="qx-topic-details">
        <span class="qx-ch-pill qs">${b.count} Qs</span>
        <span class="qx-ch-pill">${b.short || ""}</span>
      </div>
    </button>`;
  }).join("");
  return `<div class="qx-adv-levels">
    <h3 class="qx-all-topics-label">Question Type Folders
      <small style="font-weight:600;opacity:.75">· Single · Multi · T/F · Match · NAT</small>
    </h3>
    <p class="qx-adv-levels-hint">Open a folder to practice only that JEE Advanced pattern.</p>
    <div class="qx-adv-folder-grid">${cards}</div>
  </div>`;
}

function renderChapterHubPage(exam, p, meta, qs, stats) {
  const buckets = (meta && meta.buckets) || [];
  const topics = (meta && meta.topics) || [];
  const isAdv = p.exam === "jee_advanced" || /jee.?advanced/i.test(exam.title || "");
  // Marks-like type levels for JEE Advanced (SC / Multi / T-F / Match / Subjective)
  const typeBuckets = isAdv ? buildJeeAdvTypeBuckets(qs || []) : [];
  const pyqCount = qs.length || buckets.reduce((s, b) => s + (b.count || 0), 0)
    || typeBuckets.reduce((s, b) => s + b.count, 0);
  const topicCount = topics.length;
  const correct = (() => {
    let c = 0;
    (qs || []).forEach(q => {
      const rec = STATE.solved.find(s => s.id === q.id);
      if (rec && rec.correct) c++;
    });
    return c;
  })();
  const examKey = /neet/i.test(exam.title || p.exam || "") ? "neet"
    : /academy|class_/i.test(p.exam || "") ? "academy" : "jee";

  // JEE Advanced: resources (Video/PDF/Formula like Main) + type folders + PYQs
  // IMPORTANT: do NOT use .ch-hub-page (1fr 280px) — it shoved type cards into a 280px column.
  if (isAdv && typeBuckets.length) {
    const formulaPayload = mg("formula", { step: "chapters", subject: p.subject });
    const notesPayload = mg("quickconcepts", { step: "subjects" });
    const videoPayload = mg("quickconcepts", { step: "subjects" });
    const revisionPayload = mg("quickconcepts", { step: "subjects" });
    const resourceMods = [
      { id: "video", title: "Concept Video(s)", sub: "Chapter explanation videos", payload: videoPayload, soon: false },
      { id: "notes", title: "Notes (PDF)", sub: "Downloadable chapter notes", payload: notesPayload, soon: false },
      { id: "formula", title: "Formula Sheet (PDF)", sub: "Quick-reference formulas", payload: formulaPayload, soon: false },
      { id: "revision", title: "Revision / Quick Concepts", sub: "Last-minute revision notes", payload: revisionPayload, soon: false }
    ];
    const resourceCards = resourceMods.map((m) => {
      const click = m.soon
        ? `onclick="typeof showToast==='function'&&showToast('${m.title} — Coming Soon')"`
        : m.payload;
      const ic = (typeof QxCardIcons !== "undefined" && QxCardIcons.chapterIconHtml)
        ? QxCardIcons.chapterIconHtml(m.title, p.subject)
        : "";
      return `<button type="button" class="qx-module-card${m.soon ? " soon" : ""}" style="--folder-grad:var(--grad-jee)" ${click}>
        <span class="qx-module-ic" aria-hidden="true">${ic}</span>
        <span class="qx-module-body"><strong>${m.title}</strong><small>${m.sub}</small></span>
        <span class="qx-module-chev" aria-hidden="true">›</span>
      </button>`;
    }).join("");
    const topicIc = (typeof QxCardIcons !== "undefined" && QxCardIcons.chapterIconHtml)
      ? QxCardIcons.chapterIconHtml("Topic-Wise PYQs", p.subject)
      : "";
    const allIc = (typeof QxCardIcons !== "undefined" && QxCardIcons.chapterIconHtml)
      ? QxCardIcons.chapterIconHtml("All Previous Year Qs", p.subject)
      : "";
    const topicCard = topics.length
      ? `<button type="button" class="qx-module-card" ${mg("cpyqb", { step: "topics", exam: p.exam, subject: p.subject, chapter: p.chapter })}>
          <span class="qx-module-ic">${topicIc}</span>
          <span class="qx-module-body"><strong>Topic-Wise PYQs</strong><small>${topicCount} Topics</small></span>
          <span class="qx-module-chev">›</span>
        </button>`
      : "";
    const allCard = `<button type="button" class="qx-module-card" ${mg("cpyqb", { step: "questions", mode: "all", exam: p.exam, subject: p.subject, chapter: p.chapter })}>
        <span class="qx-module-ic">${allIc}</span>
        <span class="qx-module-body"><strong>All Previous Year Qs</strong><small>${pyqCount} PYQs · mixed types</small></span>
        <span class="qx-module-chev">›</span>
      </button>`;
    const sessionBar = typeof cpyqbChapterSessionBar === "function"
      ? cpyqbChapterSessionBar({ exam: p.exam, subject: p.subject, chapter: p.chapter }, pyqCount)
      : "";
    return `${sessionBar}<div class="qx-adv-hub-page">
      <div class="qx-adv-hub-main">
        <div class="ch-hub-title-row"><span class="ch-hub-bolt">⚡</span><div>
          <h1>${p.chapter}</h1>
          <p>JEE (Advanced) · ${p.subject} · ${pyqCount} PYQs</p>
        </div></div>

        <h3 class="qx-all-topics-label">Study Resources <small style="font-weight:600;opacity:.75">· Video · PDF · Formula</small></h3>
        <div class="qx-module-grid qx-adv-resource-grid">${resourceCards}</div>

        ${renderJeeAdvTypeLevelCards(p, typeBuckets)}

        <h3 class="qx-all-topics-label" style="margin-top:18px">Practice All</h3>
        <div class="qx-module-grid qx-adv-practice-grid">${allCard}${topicCard}</div>
      </div>
      <aside class="qx-adv-hub-side">
        <section class="ch-hub-panel ch-hub-progress"><h4>Your Progress</h4>
          <div class="ch-hub-prog-row"><span class="ch-prog-ic">📘</span><div><strong>${stats.solved}/${stats.total || pyqCount}</strong><small>PYQ Solved</small></div></div>
          <div class="ch-hub-prog-row"><span class="ch-prog-ic">✓</span><div><strong>${correct}/${stats.total || pyqCount}</strong><small>Correct Qs</small></div></div>
          <div class="ch-hub-prog-row"><span class="ch-prog-ic">🎯</span><div><strong>${stats.accuracy || 0}%</strong><small>Accuracy</small></div></div>
        </section>
      </aside>
    </div>`;
  }

  // Redesign module grid (labels/counts unchanged; modules without data = Coming Soon)
  if (typeof QxRedesign !== "undefined" && QxRedesign.renderChapterHub) {
    const practicePayload = (buckets.length || pyqCount)
      ? mg("cpyqb", { step: buckets.length ? "buckets" : "questions", exam: p.exam, subject: p.subject, chapter: p.chapter })
      : null;
    const pyqPayload = practicePayload;
    const revisionPayload = mg("quickconcepts", { step: "subjects" });
    const formulaPayload = mg("formula", { step: "chapters", subject: p.subject });
    const notesPayload = mg("quickconcepts", { step: "subjects" });
    const videoPayload = mg("quickconcepts", { step: "subjects" });
    const hub = QxRedesign.renderChapterHub({
      title: p.chapter,
      subtitle: `${exam.title} · ${p.subject}${pyqCount ? ` · ${pyqCount} PYQs` : ""}${topicCount ? ` · ${topicCount} Topics` : ""}`,
      examKey,
      examSlug: p.exam,
      subject: p.subject,
      questionCount: pyqCount,
      practicePayload,
      pyqPayload,
      revisionPayload,
      formulaPayload,
      notesPayload,
      videoPayload
    });
    const progress = `<div class="ch-hub-side" style="margin-top:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">
      <section class="ch-hub-panel ch-hub-progress"><h4>Your Progress</h4>
        <div class="ch-hub-prog-row"><span class="ch-prog-ic">📘</span><div><strong>${stats.solved}/${stats.total}</strong><small>PYQ Solved</small></div></div>
        <div class="ch-hub-prog-row"><span class="ch-prog-ic">✓</span><div><strong>${correct}/${stats.total}</strong><small>Correct Qs</small></div></div>
        <div class="ch-hub-prog-row"><span class="ch-prog-ic">🎯</span><div><strong>${stats.accuracy}%</strong><small>Accuracy</small></div></div>
      </section>
    </div>`;
    const topicIcHub = (typeof QxCardIcons !== "undefined" && QxCardIcons.chapterIconHtml)
      ? QxCardIcons.chapterIconHtml("Topic-Wise PYQs", p.subject)
      : "";
    const topicCard = topics.length
      ? `<div class="qx-module-grid" style="margin-top:12px"><button type="button" class="qx-module-card" ${mg("cpyqb", { step: "topics", exam: p.exam, subject: p.subject, chapter: p.chapter })}>
          <span class="qx-module-ic">${topicIcHub}</span>
          <span class="qx-module-body"><strong>Topic-Wise PYQs</strong><small>${topicCount} Topics</small></span>
          <span class="qx-module-chev">›</span>
        </button></div>`
      : "";
    const sessionBar = typeof cpyqbChapterSessionBar === "function"
      ? cpyqbChapterSessionBar({ exam: p.exam, subject: p.subject, chapter: p.chapter }, pyqCount)
      : "";
    return sessionBar + hub + topicCard + progress;
  }
  // Fallback (legacy layout)
  const modeCards = [];
  if (buckets.length || pyqCount) {
    modeCards.push(`<div class="ch-hub-mode-card" ${mg("cpyqb", { step: buckets.length ? "buckets" : "questions", exam: p.exam, subject: p.subject, chapter: p.chapter })}>
      <div class="ch-hub-mode-ic">${(typeof QxCardIcons !== "undefined" && QxCardIcons.chapterIconHtml) ? QxCardIcons.chapterIconHtml("All Previous Year Qs", p.subject) : ""}</div>
      <div><strong>All Previous Year Qs</strong><small>${pyqCount} PYQs</small></div>
      <span class="ch-hub-mode-go">›</span>
    </div>`);
  }
  if (topics.length) {
    modeCards.push(`<div class="ch-hub-mode-card" ${mg("cpyqb", { step: "topics", exam: p.exam, subject: p.subject, chapter: p.chapter })}>
      <div class="ch-hub-mode-ic">${(typeof QxCardIcons !== "undefined" && QxCardIcons.chapterIconHtml) ? QxCardIcons.chapterIconHtml("Topic-Wise PYQs", p.subject) : ""}</div>
      <div><strong>Topic-Wise PYQs</strong><small>${topicCount} Topics</small></div>
      <span class="ch-hub-mode-go">›</span>
    </div>`);
  }
  const sessionBarFb = typeof cpyqbChapterSessionBar === "function"
    ? cpyqbChapterSessionBar({ exam: p.exam, subject: p.subject, chapter: p.chapter }, pyqCount)
    : "";
  return `${sessionBarFb}<div class="ch-hub-page"><div class="ch-hub-main">
    <div class="ch-hub-title-row"><span class="ch-hub-bolt">⚡</span><div>
      <h1>${p.chapter}</h1>
      <p>${exam.title} · ${pyqCount} PYQs${topicCount ? ` | ${topicCount} Topics` : ""}</p>
    </div></div>
    <div class="ch-hub-modes">${modeCards.join("") || '<div class="empty">No PYQs in this chapter yet.</div>'}</div>
  </div></div>`;
}

function chapterModeCards(meta, payload) {
  return renderChapterHubPage(
    { title: (_cpyqbPayload && _cpyqbPayload.exam) || "Exam" },
    payload || _cpyqbPayload,
    meta,
    [],
    { solved: 0, total: 0, accuracy: 0, yearCounts: [] }
  );
}

async function viewCpyqb(payload) {
  const incoming = payload || {};
  const p = { ..._cpyqbPayload, ...incoming };

  // Explicit exam open (tile click / deep-link) — always wins over stale list mode.
  // forceExamList used to stick after the Engineering grid and block TS EAMCET etc.
  const wantExamOpen =
    !!(incoming.exam) &&
    incoming.forceExamList !== true &&
    (incoming.step == null ||
      incoming.step === "subjects" ||
      incoming.step === "chapters" ||
      incoming.step === "questions" ||
      incoming.step === "hub" ||
      incoming.step === "classExams" ||
      incoming.step === "class12boards");

  if (wantExamOpen || incoming.forceExamList === false) {
    delete p.forceExamList;
  }
  if (wantExamOpen) {
    // Default into subjects when only exam slug is provided
    if (!p.step || p.step === "exams") p.step = "subjects";
    delete p.resume;
    if (!incoming.classSlug) {
      delete p.classSlug;
      delete p.trackKind;
    }
    if (incoming.filterClass == null && p.step === "subjects") delete p.filterClass;
    if (p.step === "subjects" && !incoming.subject) {
      delete p.subject;
      delete p.chapter;
    }
  }

  // List mode ONLY when explicitly requested — never if a concrete exam is in play
  const explicitList =
    incoming.forceExamList === true ||
    incoming.step === "exams" ||
    (p.forceExamList === true && !p.exam);
  if (explicitList && !wantExamOpen) {
    delete p.classSlug;
    delete p.trackKind;
    p.step = "exams";
    p.forceExamList = true;
    delete p.exam;
    delete p.subject;
    delete p.chapter;
    delete p.filterClass;
  } else if (p.exam) {
    // Concrete exam navigation: never stay in force-list mode
    delete p.forceExamList;
    if (!p.step || p.step === "exams") p.step = "subjects";
  }

  _cpyqbPayload = p;
  try {
    const locked = typeof qxAccessBlock === "function" ? qxAccessBlock("cpyqb", p) : "";
    if (locked) return locked;
  } catch (_) { /* */ }
  const nav = await fetchNav("cpyqb");
  const track = typeof cpyqbActiveTrack === "function" ? cpyqbActiveTrack() : STATE.exam;
  // Engineering / Medical / Defence lists: always include real bank exams even if category label drifts
  const exams = nav.filter(e => {
    if (!e) return false;
    if (e.category === track) return true;
    if (track === "Academic" && (e.category === "Foundation" || String(e.slug || "").startsWith("class_"))) return true;
    if (track === "Defence" && (e.slug === "nda" || e.category === "Defence")) return true;
    if (track === "Engineering" && e.category === "Engineering") return true;
    if (track === "Medical" && e.category === "Medical") return true;
    // Allow opening JEE/NEET banks while user is on Academic class track (Class 11 JEE Main)
    if (p.exam && e.slug === p.exam) return true;
    return false;
  });

  // Class N → product tracks (7–10 Soon · 11 JEE M+A · 12 CBSE+JEE M+A)
  // Never open raw class_7…class_10 banks — owner has not added questions for those yet
  if (p.exam && /^class_(7|8|10)$/.test(String(p.exam)) && p.step !== "classExams" && p.step !== "exams") {
    return viewCpyqb({ step: "classExams", classSlug: p.exam, exam: p.exam, forceExamList: false });
  }
  if (p.exam === "class_9" && p.trackKind !== "cbse_board" && p.step !== "classExams" && p.step !== "exams"
    && p.step !== "subjects" && p.step !== "chapters" && p.step !== "questions" && p.step !== "topics" && p.step !== "buckets") {
    return viewCpyqb({ step: "classExams", classSlug: "class_9", exam: "class_9", forceExamList: false });
  }
  if (p.step === "classExams" && (p.classSlug || (p.exam && String(p.exam).startsWith("class_")))) {
    const cs = p.classSlug || p.exam;
    _lastListFn = () => ({ step: "classExams", classSlug: cs, exam: cs });
    const n = parseInt(String(cs).replace("class_", ""), 10) || 0;
    const sub = n === 9
      ? "CBSE Board · Number System"
      : (n <= 10 ? "Coming Soon" : (n === 11 ? "JEE Main · JEE Advanced" : "CBSE Board · JEE Main · JEE Advanced"));
    return `${topbar(`Class ${n || ""}`.trim(), sub)}
      ${renderAcademicClassExamTracks(cs)}`;
  }
  // Class 11/12 bank slugs → track picker only (JEE banks / CBSE — not empty class_N bank)
  if (p.exam && /^class_(11|12)$/.test(String(p.exam)) && p.step !== "classExams" && p.step !== "class12boards") {
    return viewCpyqb({ step: "classExams", classSlug: p.exam, exam: p.exam, forceExamList: false });
  }

  // Class 12 → CBSE Board picker
  if (p.step === "class12boards") {
    _lastListFn = () => ({ step: "class12boards", classSlug: "class_12" });
    return `${topbar("Class 12 · CBSE Board", "Board PYQs")}
      ${renderClass12BoardPicker()}`;
  }

  if (p.resume && !p.forceExamList && (!p.step || p.step === "exams") && !p.exam) {
    // Academic always shows Class 7–12 folders first (no auto-jump)
    if (track === "Academic") {
      _lastListFn = () => ({ step: "exams", forceExamList: true });
      return `${topbar("Academic Class 7–12", "Select a class folder")}
        ${renderCpyqbExamBank(nav)}`;
    }
    const slug = (typeof MarksShell !== "undefined" && localStorage.getItem(MarksShell.EXAM_KEY))
      || (typeof PRIMARY_BANK !== "undefined" && PRIMARY_BANK[STATE.exam])
      || "jee_main";
    const autoExam = exams.find(e => e.slug === slug) || exams[0];
    if (autoExam && !autoExam.isComingSoon) {
      const subj = (typeof MarksShell !== "undefined" && localStorage.getItem(MarksShell.SUBJ_KEY))
        || (autoExam.subjects[0] && autoExam.subjects[0].name);
      if (subj) return viewCpyqb({ ...p, step: "chapters", exam: autoExam.slug, subject: subj, resume: true });
    }
  }

  if (p.resume && !p.forceExamList && p.step === "subjects" && p.exam && !p.subject) {
    const saved = typeof MarksShell !== "undefined" ? localStorage.getItem(MarksShell.SUBJ_KEY) : null;
    if (saved) {
      const ex = resolveCpyqbExam(nav, p.exam);
      if (ex && ex.subjects && ex.subjects.some(s => s.name === saved)) {
        return viewCpyqb({ ...p, step: "chapters", subject: saved });
      }
    }
  }

  if (p.step === "exams" || !p.exam) {
    _lastListFn = () => ({ step: "exams", forceExamList: true });
    const sub = track === "Academic"
      ? "7–10 Coming Soon · 11: JEE Main + Advanced · 12: CBSE Board + JEE Main + Advanced"
      : track === "Defence"
        ? "Defence exams only"
        : track === "Medical"
          ? "Medical exams only"
          : "Engineering exams only";
    return `${topbar(track === "Academic" ? "Class 7–12" : "Chapter-wise PYQ Bank", sub)}
      ${renderCpyqbExamBank(nav)}`;
  }

  // JEE banks opened from Academic class track must resolve even when track is Academic
  let exam = resolveCpyqbExam(nav, p.exam) || (await fetchNav("cpyqb")).find(e => e.slug === p.exam);
  if (p.exam === "class_9") exam = qxClass9CpyqbExam(exam);
  if (!exam) {
    if (p.classSlug) {
      return viewCpyqb({ step: "classExams", classSlug: p.classSlug, exam: p.classSlug, forceExamList: false });
    }
    return viewCpyqb({ step: "exams", forceExamList: true });
  }
  if (typeof MarksShell !== "undefined") MarksShell.saveContext(exam.slug, p.subject || null);

  if (p.step === "subjects" || !p.subject) {
    _lastListFn = () => ({
      step: "subjects", exam: p.exam, classSlug: p.classSlug, trackKind: p.trackKind,
      filterClass: p.filterClass, sortBy: p.sortBy
    });
    const classNum = p.classSlug ? parseInt(String(p.classSlug).replace("class_", ""), 10) : 0;
    const trackLabel = p.trackKind === "jee_main" ? "JEE Main"
      : p.trackKind === "jee_advanced" ? "JEE Advanced"
      : p.trackKind === "iit_foundation" ? "IIT Foundation"
      : p.trackKind === "academic" ? "Academic"
      : exam.title;
    const headTitle = classNum
      ? `Class ${classNum} · ${trackLabel}`
      : exam.title;
    const crumbs = [
      { label: "PYQ Bank", view: "cpyqb", payload: { step: "exams", forceExamList: true } }
    ];
    if (p.classSlug) {
      crumbs.push({
        label: `Class ${classNum}`,
        view: "cpyqb",
        payload: { step: "classExams", classSlug: p.classSlug, exam: p.classSlug }
      });
    }
    crumbs.push({ label: trackLabel });
    const bc = breadcrumb(crumbs);

    // Marks CT: when Class 11/12 filter is on JEE banks, show real class-scoped chapter counts
    let subjectCards = exam.subjects || [];
    if (p.filterClass && (p.exam === "jee_main" || p.exam === "jee_advanced")) {
      const ctIndex = await fetchMarksCtIndex();
      const ctExam = CT_EXAM_FOR_SLUG[p.exam];
      const ctRoot = ctExam && ctIndex[ctExam] ? ctIndex[ctExam] : null;
      if (ctRoot) {
        subjectCards = subjectCards.map(s => {
          const ctSubj = ctRoot[s.name];
          if (!ctSubj || !ctSubj.byChapter) return s;
          const classCh = Object.entries(ctSubj.byChapter)
            .filter(([, meta]) => (meta.classes || []).includes(p.filterClass) || !(meta.classes || []).length)
            .map(([title, meta]) => ({
              name: title,
              count: (s.chapters || []).find(c => c.name === title)?.count || 0,
              importance: meta.importance || 0
            }));
          // Prefer Marks class chapter list when nav chapters are fuller
          const names = new Set(classCh.map(c => c.name));
          const merged = classCh.length
            ? classCh
            : (s.chapters || []).filter(c => {
                const meta = cpyqbFindCtChapter(ctSubj, c.name);
                return !meta || !(meta.classes || []).length || (meta.classes || []).includes(p.filterClass);
              });
          const countQs = merged.reduce((a, c) => a + (c.count || 0), 0);
          return { ...s, chapters: merged, count: countQs || s.count || 0, _marksClassChapters: true };
        }).filter(s => (s.chapters || []).length > 0);
      }
    }

    const cards = (subjectCards.length ? subjectCards : exam.subjects).map(s => {
      const chN = (s.chapters || []).length;
      const qsN = s.count || 0;
      const subMeta = qsN
        ? `${chN} chapters · ${qsN.toLocaleString()} qs`
        : `${chN} chapters · Marks syllabus`;
      const logoIc = typeof QuantrexExamLogos !== "undefined" && QuantrexExamLogos.subjectHtml
        ? QuantrexExamLogos.subjectHtml(s.name, 36)
        : "";
      const ic = logoIc || subjectIcon(s.name, s.icon);
      return `<div class="subj-card" ${mg("cpyqb", {
        step: "chapters", exam: p.exam, subject: s.name,
        classSlug: p.classSlug, trackKind: p.trackKind,
        filterClass: p.filterClass || "all", sortBy: p.sortBy || "default"
      })}>
        <span class="subj-ic">${ic}</span>
        <div><strong>${s.name}</strong><small>${subMeta}</small></div>
      </div>`;
    }).join("");
    const empty = cards || `<div class="empty">No subjects for this track yet.
      <button type="button" class="btn-soft" style="margin-top:12px" onclick="go('cpyqb',{step:'exams',forceExamList:true})">← Back</button></div>`;
    return `${topbar(headTitle, "Select a subject · Quantrex / CBSE chapters")}${bc}<div class="subj-grid">${empty}</div>`;
  }

  const subj = exam.subjects.find(s => s.name === p.subject);
  if (!subj) return viewCpyqb({ step: "subjects", exam: p.exam });

  if (p.step === "chapters" || !p.chapter) {
    _lastListFn = () => ({
      step: "chapters", exam: p.exam, subject: p.subject,
      filterClass: p.filterClass, filterUnit: p.filterUnit,
      filterNotStarted: p.filterNotStarted, filterWeak: p.filterWeak, sortBy: p.sortBy,
      classSlug: p.classSlug, trackKind: p.trackKind
    });
    // NEVER load full bank for chapter list (was 46MB hang every subject open)
    const ctIndex = await fetchMarksCtIndex();
    const ctExam = CT_EXAM_FOR_SLUG[p.exam];
    const ctSubj = ctExam && ctIndex[ctExam] ? ctIndex[ctExam][p.subject] : null;
    const units = ctSubj ? (ctSubj.units || []) : [];
    const filterClass = p.filterClass || "all";
    const filterUnit = p.filterUnit || "all";
    const filterSyllabus = p.filterSyllabus || "all";
    const filterImportance = p.filterImportance || "all";
    const sortBy = p.sortBy || "default";

    // Class 11/12 JEE tracks: build chapter rows from real Marks CT list (not full nav dump)
    let rows;
    if (filterClass !== "all" && ctSubj && ctSubj.byChapter && (p.exam === "jee_main" || p.exam === "jee_advanced")) {
      rows = Object.entries(ctSubj.byChapter)
        .filter(([, meta]) => {
          const classes = meta.classes || [];
          return !classes.length || classes.includes(filterClass);
        })
        .map(([title, meta]) => {
          const navCh = (subj.chapters || []).find(c => c.name === title)
            || { name: title, count: 0 };
          const stats = cpyqbChapterStats(p.exam, p.subject, title, navCh.count);
          return { nav: { ...navCh, name: title }, ct: meta, stats, subject: p.subject };
        });
    } else {
      rows = (subj.chapters || []).map(c => {
        const ctCh = cpyqbFindCtChapter(ctSubj, c.name);
        const stats = cpyqbChapterStats(p.exam, p.subject, c.name, c.count);
        return { nav: c, ct: ctCh, stats, subject: p.subject };
      });
    }

    const recFilters = [p.filterNotStarted, p.filterStrong, p.filterWeak, p.filterAverage].filter(Boolean).length;
    const hasFilters = filterClass !== "all" || filterUnit !== "all" || filterSyllabus !== "all"
      || filterImportance !== "all" || recFilters > 0 || (sortBy && sortBy !== "default");
    let filtered = rows.filter(row => {
      // Class filter: empty classes = open to all; only drop when CT has other class tags
      if (filterClass !== "all" && row.ct) {
        const classes = row.ct.classes || [];
        if (classes.length && !classes.includes(filterClass)) return false;
      }
      if (filterUnit !== "all" && row.ct && row.ct.unitId !== filterUnit) return false;
      if (filterSyllabus === "reduced" && row.ct && row.ct.syllabusCategory !== "reduced") return false;
      if (filterSyllabus === "removed" && row.ct && row.ct.syllabusCategory !== "removed") return false;
      // High importance = real Marks importance score (top weightage chapters)
      if (filterImportance === "high" && ((row.ct && row.ct.importance) || 0) < 30) return false;
      if (filterImportance === "low" && ((row.ct && row.ct.importance) || 0) >= 28) return false;
      if (recFilters) {
        const matchRec = (p.filterNotStarted && row.stats.solved === 0)
          || (p.filterStrong && row.stats.strong)
          || (p.filterWeak && row.stats.weak)
          || (p.filterAverage && row.stats.average);
        if (!matchRec) return false;
      }
      return true;
    });
    // Never show a blank chapter grid when bank has chapters (filter mismatch fallback)
    if (!filtered.length && rows.length) {
      filtered = rows.slice();
    }

    // Default = Marks foundation-first priority (Basic Maths first).
    // Importance High→Low only when user selects that sort (real CT importance).
    if (sortBy === "importance" || sortBy === "importance_high") {
      filtered.sort((a, b) => cpyqbCompareKeys(
        cpyqbChapterSortKey(a, "importance_high"),
        cpyqbChapterSortKey(b, "importance_high")
      ));
    } else if (sortBy === "importance_low") {
      filtered.sort((a, b) => cpyqbCompareKeys(
        cpyqbChapterSortKey(a, "importance_low"),
        cpyqbChapterSortKey(b, "importance_low")
      ));
    } else if (sortBy === "progress") {
      filtered.sort((a, b) => b.stats.solved - a.stats.solved);
    } else if (sortBy === "name" || sortBy === "name_asc") {
      filtered.sort((a, b) => a.nav.name.localeCompare(b.nav.name));
    } else if (sortBy === "name_desc") {
      filtered.sort((a, b) => b.nav.name.localeCompare(a.nav.name));
    } else {
      // default / position
      filtered.sort((a, b) => cpyqbCompareKeys(
        cpyqbChapterSortKey(a, "default"),
        cpyqbChapterSortKey(b, "default")
      ));
    }

    const continueRow = rows
      .filter(r => r.stats.solved > 0 && r.stats.solved < r.stats.total)
      .sort((a, b) => b.stats.lastDate - a.stats.lastDate)[0];
    const continueId = continueRow ? continueRow.nav.name : null;

    const sortHint = (sortBy === "importance_high" || sortBy === "importance")
      ? "Importance High → Low"
      : (sortBy === "importance_low"
        ? "Importance Low → High"
        : "Quantrex chapter order");
    const countLabel = hasFilters
      ? `Showing ${filtered.length} chapter${filtered.length === 1 ? "" : "s"} · ${sortHint}`
      : `Showing all chapters (${subj.chapters.length}) · ${sortHint}`;

    const filterBar = `<div class="cpyqb-filter-bar" id="cpyqbFilterBar">
      <button type="button" class="cpyqb-filter-main" id="cpyqbFilterOpen"><span>⚙</span> Filter</button>
      <span class="cpyqb-filter-count">${countLabel}</span>
    </div>
    ${cpyqbFilterDrawerHtml(p, p.subject, units)}`;

    // Marks-style chapter cards: name + weightage + 2026 Qs + years + progress (648–651 grid)
    const CH_GRAD = ["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7"];
    const subjectTotalQs = Math.max(1, subj.count || filtered.reduce((s, r) => s + (r.stats.total || r.nav.count || 0), 0) || 1);
    const escCh = (s) => String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const renderChCard = (c, ctCh, stats, isContinue, idx, priorityRank) => {
      // Always prefer full chapter name for tiles (shortName was sometimes blank / too short)
      const rawName = (c && c.name) || (ctCh && (ctCh.title || ctCh.name || ctCh.shortName)) || "Chapter";
      const displayName = String(rawName).trim() || "Chapter";
      const syl = ctCh && ctCh.syllabusCategory;
      const g = CH_GRAD[idx % CH_GRAD.length];
      const total = stats.total || c.count || 0;
      const imp = (ctCh && ctCh.importance) || 0;
      // Weightage as % of subject total when possible
      const subjTotal = subjectTotalQs;
      const weightPct = total ? Math.max(1, Math.round((total / subjTotal) * 1000) / 10) : 0;
      // Real Marks importance when CT index has it; else bank share % from real counts only
      const weightLabel = imp > 0
        ? `Weightage · ${imp}`
        : (weightPct ? `Share · ${weightPct}%` : null);
      const y2026 = stats.y2026 || 0;
      const y2025 = stats.y2025 || 0;
      const priorityPill = priorityRank <= 5
        ? `<span class="qx-ch-priority p${priorityRank}">P${priorityRank}</span>`
        : (imp >= 22 ? `<span class="qx-ch-priority high">High</span>` : "");
      const continueBtn = isContinue ? `<span class="qx-topic-continue">Continue</span>` : "";
      return `<button type="button" class="qx-topic-card qx-topic-rich qx-topic-${g}${isContinue ? " is-continue" : ""}" title="${escCh(displayName)}" ${mg("cpyqb", { step: "chapterHub", exam: p.exam, subject: p.subject, chapter: c.name })}>
        <div class="qx-topic-top">
          <span class="qx-topic-ic" aria-hidden="true">${cpyqbChapterIcon(ctCh, p.subject, c.name)}</span>
          ${priorityPill}
        </div>
        <strong class="qx-topic-name" aria-label="${escCh(displayName)}">${escCh(displayName)}</strong>
        <div class="qx-topic-details">
          ${weightLabel ? `<span class="qx-ch-pill weight">${weightLabel}</span>` : ""}
          ${y2026 > 0 ? `<span class="qx-ch-pill y26">2026 · ${y2026} Qs</span>` : ""}
          ${y2025 > 0 ? `<span class="qx-ch-pill">2025 · ${y2025}</span>` : ""}
          <span class="qx-ch-pill qs">${stats.solved}/${total} Qs</span>
          ${cpyqbSyllabusBadge(syl) || ""}
          ${continueBtn}
        </div>
        ${qxProgressBar(stats.solved, total, { syllabusCategory: syl })}
      </button>`;
    };

    const cards = filtered.length ? filtered.map(({ nav: c, ct: ctCh, stats }, idx) =>
      renderChCard(c, ctCh, stats, continueId === c.name, idx, idx + 1)
    ).join("") : `<div class="empty">No chapters match these filters.</div>`;

    const footTabs = `<div class="cpyqb-foot-tabs">
      <button type="button" class="cpyqb-ftab" onclick="go('notebook')">${p.subject} Bookmarks</button>
      <button type="button" class="cpyqb-ftab on" onclick="go('analytics')">${p.subject} Analysis</button>
    </div>`;

    const totalQs = filtered.reduce((s, r) => s + (r.stats.total || r.nav.count || 0), 0);
    const total2026 = filtered.reduce((s, r) => s + (r.stats.y2026 || 0), 0);
    const pageHtml = `<div class="cpyqb-marks-page">
      <div class="qx-subject-hero qx-subj-${String(p.subject || "").toLowerCase().replace(/[^a-z]/g, "") || "default"}">
        <div class="qx-subject-hero-text">
          <h1>${p.subject} PYQs</h1>
          <p>Chapter-wise Collection of ${p.subject} PYQs · ${filtered.length} chapters · ${totalQs.toLocaleString()} questions · <strong>2026: ${total2026} Qs</strong></p>
        </div>
      </div>
      ${filterBar}
      <h3 class="qx-all-topics-label">All Topics <small style="font-weight:600;opacity:.75">· ${sortHint}</small></h3>
      <div class="qx-topic-grid qx-topic-grid-rich">${cards}</div>
      ${footTabs}</div>`;
    if (typeof MarksShell !== "undefined") {
      await MarksShell.enrichExamMeta(exam);
      MarksShell.saveContext(p.exam, p.subject);
      return MarksShell.splitLayout(exam, p.subject, pageHtml);
    }
    return pageHtml;
  }

  const chMetaNav = subj.chapters.find(c => c.name === p.chapter);
  async function resolveChapterMeta() {
    let meta = await fetchChapterMeta(p.exam, p.subject, p.chapter);
    if (meta) return meta;
    if (chMetaNav && (chMetaNav.topics || chMetaNav.buckets)) {
      return {
        buckets: chMetaNav.buckets || [],
        topics: chMetaNav.topics || [],
      };
    }
    return null;
  }
  const baseBc = [
    { label: "PYQ Bank", view: "cpyqb", payload: { step: "exams" } },
    { label: exam.title, view: "cpyqb", payload: { step: "subjects", exam: p.exam } },
    { label: p.subject, view: "cpyqb", payload: { step: "chapters", exam: p.exam, subject: p.subject } },
    { label: p.chapter, view: "cpyqb", payload: { step: "chapterHub", exam: p.exam, subject: p.subject, chapter: p.chapter } }
  ];

  // Concise Summary Notes removed — deep links go back to chapter hub
  if (p.step === "summaryNotes") {
    return viewCpyqb({ ...p, step: "chapterHub", topicId: undefined, topicTitle: undefined });
  }

  if (p.step === "chapterHub" || (!p.mode && !p.bucketId && !p.bucketTitle && !p.topicId && !p.topicTitle && !p.levelId && p.step !== "buckets" && p.step !== "topics" && p.step !== "questions" && p.step !== "summaryNotes")) {
    const meta = await resolveChapterMeta();
    const hasBuckets = !!(meta && meta.buckets && meta.buckets.length);
    const hasTopics = !!(meta && meta.topics && meta.topics.length);
    const isAdv = p.exam === "jee_advanced";
    // JEE Advanced: always show Marks-like type levels (SC/Multi/TF/Match/Subjective)
    if (isAdv) {
      _lastListFn = () => ({ step: "chapterHub", exam: p.exam, subject: p.subject, chapter: p.chapter });
      const bc = breadcrumb(baseBc.slice(0, -1).concat([{ label: p.chapter }]));
      const allQs = await ensureCpyqbChapterQuestions(p.exam, p.subject, p.chapter, meta, {});
      // Pin types for multi UI
      (allQs || []).forEach(q => {
        try {
          if (typeof qxPinJeeAdvQuestionType === "function") qxPinJeeAdvQuestionType(q);
          const lv = classifyJeeAdvLevel(q);
          if (lv === "multipleCorrect") {
            q.questionType = "multipleCorrect";
            q.type = "multipleCorrect";
            q._advSection = "MC";
          } else if (lv === "subjective") {
            q.questionType = "numerical";
            q.type = "numerical";
            q._advSection = "NUM";
          } else if (lv === "columnMatch") {
            q._advSection = "MATCH";
          }
        } catch (_) { /* */ }
      });
      const hubStats = cpyqbChapterStats(p.exam, p.subject, p.chapter, allQs.length);
      return `${topbar(p.chapter, "JEE (Advanced) · Marks-style levels")}${bc}${renderChapterHubPage(exam, p, meta, allQs, hubStats)}`;
    }
    if (hasBuckets && !hasTopics) return viewCpyqb({ ...p, step: "buckets" });
    if (hasTopics && !hasBuckets) return viewCpyqb({ ...p, step: "topics" });
    _lastListFn = () => ({ step: "chapterHub", exam: p.exam, subject: p.subject, chapter: p.chapter });
    const bc = breadcrumb(baseBc.slice(0, -1).concat([{ label: p.chapter }]));
    if (!hasBuckets && !hasTopics) {
      // Marks-first list — do NOT load 46MB bank on chapter open
      const metaHub = await resolveChapterMeta();
      const allQs = await ensureCpyqbChapterQuestions(p.exam, p.subject, p.chapter, metaHub, {});
      const testMeta = { title: `${p.chapter} · Chapter Test`, returnTo: "cpyqb", limit: 30, exam: p.exam, subject: p.subject, chapter: p.chapter };
      const isClassBank = String(p.exam || "").startsWith("class_");
      const classNum = isClassBank ? parseInt(String(p.exam).replace("class_", ""), 10) : 0;
      if (!allQs.length && isClassBank) {
        const altJee = classNum >= 11
          ? `<button type="button" class="btn-primary" ${mg("cpyqb", {
              step: "subjects", exam: "jee_main", classSlug: p.exam,
              trackKind: "jee_main", filterClass: "Class " + classNum, sortBy: "default"
            })}>Open JEE Main · Class ${classNum}</button>`
          : `<button type="button" class="btn-primary" ${mg("books", { step: "modules", bookId: "69048808ef55966cf1d71f1d" })}>Open Olympiad Workbook</button>`;
        const altBoard = classNum === 12
          ? `<button type="button" class="btn-soft" ${mg("cpyqb", { step: "class12boards", classSlug: "class_12" })}>Class 12 Board PYQs</button>`
          : (classNum >= 9
            ? `<button type="button" class="btn-soft" ${mg("board", { step: "subjects" })}>Board PYQs</button>`
            : "");
        return `${topbar(p.chapter, `${exam.title} · ${p.subject}`)}${bc}
          <div class="empty qx-class-empty">
            <strong>Chapter ready · question pack loading</strong>
            <p>Syllabus structure for <b>${p.chapter}</b> is set. Local question bank for Class ${classNum || ""} is still filling — use these live tracks:</p>
            <div class="qx-class-empty-actions">${altJee}${altBoard}
              <button type="button" class="btn-soft" ${mg("cpyqb", { step: "classExams", classSlug: p.classSlug || p.exam, exam: p.classSlug || p.exam })}>← Back to Class tracks</button>
            </div>
          </div>`;
      }
      return `${topbar(p.chapter, `${exam.title} · ${p.subject}`)}${bc}
        <p class="result-count">${allQs.length ? `Showing all ${allQs.length} questions` : "No questions in this chapter yet"}.</p>
        ${allQs.length ? renderQList(allQs, _listPage, testMeta) : `<div class="empty">No questions found for this chapter.</div>`}`;
    }
    // Hub only needs meta counts / modes — never block on full bank
    const hubCount = (meta && meta.buckets
      ? meta.buckets.reduce((s, b) => s + (b.count || (b.questionIds || []).length || 0), 0)
      : 0) || (meta && meta.topics
      ? meta.topics.reduce((s, t) => s + (t.count || (t.questionIds || []).length || 0), 0)
      : 0);
    const hubQs = _banksLoaded[p.exam]
      ? ((typeof getChapterQuestions === "function")
        ? getChapterQuestions(p.exam, p.subject, p.chapter)
        : QUESTIONS.filter(q => q._bank === p.exam && q.subject === p.subject && q.chapter === p.chapter))
      : [];
    const hubStats = cpyqbChapterStats(p.exam, p.subject, p.chapter, hubQs.length || hubCount);
    return `${topbar(p.chapter, "Choose practice mode")}${bc}${renderChapterHubPage(exam, p, meta, hubQs, hubStats)}`;
  }

  const meta = await resolveChapterMeta();

  if (p.step === "buckets" && !p.bucketId && !p.bucketTitle) {
    _lastListFn = () => ({ step: "buckets", exam: p.exam, subject: p.subject, chapter: p.chapter });
    const buckets = (meta && meta.buckets) || (chMetaNav && chMetaNav.buckets) || [];
    const bc = breadcrumb(baseBc.concat([{ label: "All PYQs" }]));
    const cards = buckets.length ? buckets.map(b => `
      <div class="ch-card qx-bucket-card qx-ch-card-rich ${bucketTone(b)}" ${mg("cpyqb", { step: "questions", mode: "bucket", exam: p.exam, subject: p.subject, chapter: p.chapter, bucketId: b.id, bucketTitle: b.title })}>
        <div class="qx-ch-card-top">
          ${cpyqbChapterIcon(null, p.subject, b.title || p.chapter)}
          <div class="qx-ch-body"><strong>${b.title}</strong><small>${(b.count || 0).toLocaleString()} questions</small></div>
        </div>
        ${qxProgressBar(0, b.count || 0)}
      </div>`).join("") : `<div class="empty">No PYQ buckets for this chapter yet.</div>`;
    return `${topbar(p.chapter, "All PYQs")}${bc}<div class="ch-grid">${cards}</div>`;
  }

  if (p.step === "topics" && !p.topicId && !p.topicTitle) {
    _lastListFn = () => ({ step: "topics", exam: p.exam, subject: p.subject, chapter: p.chapter });
    const topics = (meta && meta.topics) || (chMetaNav && chMetaNav.topics) || [];
    const bc = breadcrumb(baseBc.concat([{ label: "Topicwise PYQs" }]));
    const cards = topics.length ? topics.map(t => `
      <div class="ch-card qx-topic-card qx-ch-card-rich" ${mg("cpyqb", { step: "questions", mode: "topic", exam: p.exam, subject: p.subject, chapter: p.chapter, topicId: t.id, topicTitle: t.title })}>
        <div class="qx-ch-card-top">
          ${cpyqbChapterIcon(null, p.subject, t.title)}
          <div class="qx-topic-body qx-ch-body">
            <strong>${t.title}</strong>
            <small>${(t.count || 0).toLocaleString()} questions</small>
          </div>
        </div>
        ${qxProgressBar(0, t.count || 0)}
      </div>`).join("") : `<div class="empty">No subtopics for this chapter yet.</div>`;
    return `${topbar(p.chapter, "Topicwise PYQs")}${bc}<div class="ch-grid qx-topic-grid">${cards}</div>`;
  }

  // Marks-first chapter list — never force 46MB bank before showing questions
  let filterNote = "";
  let qs = await ensureCpyqbChapterQuestions(p.exam, p.subject, p.chapter, meta, {
    mode: p.mode,
    bucketId: p.bucketId,
    bucketTitle: p.bucketTitle,
    topicId: p.topicId,
    topicTitle: p.topicTitle
  });
  // JEE Advanced type level filter (Single / Multi / T-F / Match / Subjective)
  if (p.exam === "jee_advanced" && (p.mode === "typeLevel" || p.levelId)) {
    const levelId = p.levelId || "all";
    qs = filterQsByJeeAdvLevel(qs, levelId);
    qs.forEach(q => {
      try {
        if (levelId === "multipleCorrect") {
          q.questionType = "multipleCorrect";
          q.type = "multipleCorrect";
          q._advSection = "MC";
        } else if (levelId === "subjective") {
          q.questionType = "numerical";
          q.type = "numerical";
          q._advSection = "NUM";
        } else if (levelId === "columnMatch") {
          q._advSection = "MATCH";
          if (!q.questionType || q.questionType === "unk") {
            q.questionType = "singleCorrect";
            q.type = "singleCorrect";
          }
        } else if (levelId === "trueFalse" || levelId === "singleCorrect") {
          // Explicit SC / T-F levels → single-select UI (not multi)
          q.questionType = "singleCorrect";
          q.type = "singleCorrect";
          q._advSection = "SC";
        }
        if (typeof QxImgClean !== "undefined" && QxImgClean.prepareQuestionFigures) {
          /* figures primed when opened */
        }
      } catch (_) { /* */ }
    });
  }
  if (!qs.length) {
    filterNote = `<p class="result-count">Could not load questions for this chapter. Check connection and retry.</p>`;
  }

  _lastListFn = () => ({ ...p, step: "questions" });
  const modeLabel = p.levelTitle || p.bucketTitle || p.topicTitle || "All Questions";
  const bc = breadcrumb(baseBc.concat([
    p.mode === "typeLevel" || p.levelId
      ? { label: "Types", view: "cpyqb", payload: { step: "chapterHub", exam: p.exam, subject: p.subject, chapter: p.chapter } }
      : null,
    p.mode === "bucket" ? { label: "All PYQs", view: "cpyqb", payload: { step: "buckets", exam: p.exam, subject: p.subject, chapter: p.chapter } } :
    p.mode === "topic" ? { label: "Topicwise", view: "cpyqb", payload: { step: "topics", exam: p.exam, subject: p.subject, chapter: p.chapter } } : null,
    { label: modeLabel }
  ].filter(Boolean)));
  const testMeta = {
    title: `${p.chapter} · ${modeLabel}`,
    returnTo: "cpyqb",
    limit: 30,
    exam: p.exam,
    subject: p.subject,
    chapter: p.chapter,
    mode: p.mode,
    bucketId: p.bucketId,
    topicId: p.topicId,
    topicTitle: p.topicTitle,
    levelId: p.levelId,
    // Multi-correct practice: multi-select
    multiSelect: p.levelId === "multipleCorrect" || p.levelTitle === "Multi Correct"
  };
  return `${topbar(p.chapter, `${exam.title === "JEE Advanced" || p.exam === "jee_advanced" ? "JEE (Advanced)" : exam.title} · ${modeLabel}`)}${bc}
    ${filterNote}
    ${p.levelId === "multipleCorrect" ? `<p class="result-count" style="color:#b45309;font-weight:600">Multi Correct — select one or more options (A–D), Marks style.</p>` : ""}
    ${p.levelId === "columnMatch" ? `<p class="result-count">Column Matching — choose the correct List-I ↔ List-II option.</p>` : ""}
    ${qs.length ? renderQList(qs, _listPage, testMeta) : `<div class="empty">No questions in this type for this chapter.</div>`}`;
}

// ============ ALL QUESTION BANK / NCERT (MARKS NEET modules) ============
let _bankPayload = { module: "allqs", step: "subjects" };

function qxFolderTrack() {
  let t = (typeof STATE !== "undefined" && STATE.exam) || "Engineering";
  if (t === "Foundation") t = "Academic";
  if (t === "NDA") t = "Defence";
  return t;
}

function qxFolderSubjects() {
  const t = qxFolderTrack();
  if (t === "Medical") return ["Physics", "Chemistry", "Botany", "Zoology"];
  if (t === "Defence") return ["Mathematics", "General Ability"];
  if (t === "Academic") {
    return (typeof EXAMS !== "undefined" && EXAMS.Academic && EXAMS.Academic.subjects)
      ? EXAMS.Academic.subjects.slice()
      : ["Mathematics", "Science"];
  }
  return ["Physics", "Chemistry", "Mathematics"];
}

function qxPrimaryBankSlug(track) {
  const t = track || qxFolderTrack();
  if (typeof PRIMARY_BANK !== "undefined" && PRIMARY_BANK[t]) return PRIMARY_BANK[t];
  if (t === "Medical") return "neet";
  if (t === "Defence") return "nda";
  return "jee_main";
}

function qxNcertNavName(kind) {
  if (kind === "ncoq") return "cbse_ncoq";
  if (kind === "dbq") return "cbse_dbq";
  if (kind === "ncert") return "cbse_ncert";
  return "cbse_lblq";
}

function qxMarksTokenReady() {
  return false;
}

function qxChNorm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(of|the|and|a|an|in|on|for|to|its|their)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function qxChMatch(a, b) {
  const x = qxChNorm(a);
  const y = qxChNorm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.startsWith(y) || y.startsWith(x)) return true;
  const xs = x.split(" ").filter(Boolean);
  const ys = y.split(" ").filter(Boolean);
  if (xs.length < 2 || ys.length < 2) return false;
  const set = new Set(ys);
  const hit = xs.filter(w => set.has(w)).length;
  const need = Math.min(xs.length, ys.length, 3);
  return hit >= need || hit / Math.max(xs.length, ys.length) >= 0.72;
}

function qxFilterQsChapter(qs, subject, chapter) {
  const list = qs || [];
  const exact = list.filter(q => q && q.subject === subject && q.chapter === chapter);
  if (exact.length) return exact;
  return list.filter(q => q && qxChMatch(q.subject, subject) && qxChMatch(q.chapter, chapter));
}

async function qxResolveCpyqbExam(slug) {
  const nav = await fetchNav("cpyqb");
  return resolveCpyqbExam(nav, slug);
}

function qxNormalizeChapterRows(raw) {
  return (raw || []).map(c => {
    if (typeof c === "string") return { name: c, count: 0, topics: [] };
    return {
      name: c.name || c.title || "",
      count: c.count || c.totalQuestions || 0,
      topics: c.topics || [],
      id: c.id || c.chapterId
    };
  }).filter(c => c.name);
}

function qxSubjectsFromExam(exam, allowNames) {
  const allow = allowNames && allowNames.length ? new Set(allowNames) : null;
  return ((exam && exam.subjects) || [])
    .filter(s => s && s.name && (!allow || allow.has(s.name)))
    .map(s => ({
      name: s.name,
      count: s.count || 0,
      chapters: qxNormalizeChapterRows(s.chapters)
    }));
}

function qxSubjectsForAllQs(exam, track) {
  const allow = qxFolderSubjects();
  const fromExam = qxSubjectsFromExam(exam, allow);
  if (fromExam.length) return fromExam;
  return allow.map(name => ({
    name,
    count: 0,
    chapters: qxNormalizeChapterRows((typeof CHAPTERS !== "undefined" && CHAPTERS[name]) || [])
  }));
}

function qxBankSlugsForFolder(moduleId, subject, opts) {
  opts = opts || {};
  if (opts.bankSlugs && opts.bankSlugs.length) return opts.bankSlugs.slice();
  const track = qxFolderTrack();
  const sub = String(subject || "");
  if (track === "Defence") return ["nda"];
  if (moduleId === "ncert" || opts.ncertKind) {
    return [];
  }
  if (/math/i.test(sub)) return [qxPrimaryBankSlug("Engineering")];
  if (moduleId === "board") {
    if (String(opts.board || "").toUpperCase() === "HSC") {
      return track === "Medical" ? ["mht_cet_medical", "mht_cet"] : ["mht_cet"];
    }
    return [qxPrimaryBankSlug(track)];
  }
  return [qxPrimaryBankSlug(track)];
}

async function qxAugmentModuleNav(mod, moduleId, opts) {
  const track = qxFolderTrack();
  const out = Object.assign({ subjects: [] }, mod || {});
  out.subjects = (out.subjects || []).map(s => Object.assign({}, s, {
    chapters: qxNormalizeChapterRows(s.chapters)
  }));
  const have = new Set(out.subjects.map(s => s.name));
  const need = qxFolderSubjects();
  let extraSlug = null;
  if (moduleId === "ncert" || (opts && opts.ncertKind)) extraSlug = null;
  else if (track === "Defence") extraSlug = "nda";
  else if (moduleId === "allqs" || moduleId === "board") extraSlug = qxPrimaryBankSlug(track);
  if (extraSlug) {
    try {
      const exam = await qxResolveCpyqbExam(extraSlug);
      qxSubjectsFromExam(exam, need).forEach(s => {
        if (!have.has(s.name)) {
          out.subjects.push(s);
          have.add(s.name);
        }
      });
    } catch (_) { /* keep existing subjects */ }
  }
  return out;
}

function qxBoardAllowNames() {
  const t = qxFolderTrack();
  if (t === "Medical") return ["Physics", "Chemistry", "Biology"];
  if (t === "Defence") return ["Mathematics", "Physics", "Chemistry"];
  return ["Physics", "Chemistry", "Mathematics"];
}

function qxBoardSubjectAllowed(name) {
  const n = String(name || "");
  const allow = qxBoardAllowNames();
  if (allow.indexOf(n) >= 0) return true;
  if (allow.indexOf("Mathematics") >= 0 && /math/i.test(n)) return true;
  if (allow.indexOf("Biology") >= 0 && /biology|botany|zoology/i.test(n)) return true;
  return false;
}

function filterBoardSubjects(subjects) {
  const order = ["Physics", "Chemistry", "Mathematics", "Mathematics & Statistics", "Biology", "Botany", "Zoology"];
  return (subjects || []).filter((s) => qxBoardSubjectAllowed(s && (s.name || s.title))).slice().sort((a, b) => {
    const ia = order.indexOf(a && a.name);
    const ib = order.indexOf(b && b.name);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

async function qxLocalBoardModule(board) {
  const track = qxFolderTrack();
  const isHsc = String(board || "").toUpperCase() === "HSC";
  if (isHsc) {
    const nav = await fetchModuleNav("hsc_board");
    if (nav && (nav.subjects || []).length) {
      if (track === "Medical") {
        const med = await qxResolveCpyqbExam("mht_cet_medical");
        const merged = Object.assign({}, nav, { examSlug: "mht_cet_medical" });
        return qxAugmentModuleNav(merged, "board", { board: "HSC" });
      }
      if (track === "Defence") {
        const nda = await qxResolveCpyqbExam("nda");
        return {
          module: "boardPyq",
          board: "HSC",
          title: "HSC Board PYQ Bank",
          examSlug: "nda",
          subjects: qxSubjectsFromExam(nda, qxFolderSubjects())
        };
      }
      return Object.assign({}, nav, { examSlug: nav.examSlug || "mht_cet" });
    }
  }
  return {
    module: "boardPyq",
    board: isHsc ? "HSC" : "CBSE",
    title: isHsc ? "HSC Maharashtra PYQ Bank" : "CBSE Board PYQ Bank",
    examSlug: "",
    subjects: []
  };
}

function qxNcertKindsHtml() {
  const logo = (k) => (typeof QuantrexExamLogos !== "undefined" ? QuantrexExamLogos.ncertToolHtml(k, 36, "dash-tool-logo") : "");
  const trackHint = qxFolderTrack() === "Medical"
    ? "Physics · Chemistry · Botany · Zoology"
    : "Physics · Chemistry";
  return `${topbar(QX_UX.ncertBox, trackHint)}
    <div class="qx-ncert-tools">
      <button type="button" class="qx-ncert-tool qx-folder-card" ${mg("ncert", { step: "subjects", ncertKind: "lblq" })}>
        ${qxAnimCover("ncert", QX_UX.lineScan)}
        <strong>${QX_UX.lineScan}</strong><small>Concept-by-concept · ${trackHint}</small>
      </button>
      <button type="button" class="qx-ncert-tool qx-folder-card" ${mg("ncert", { step: "subjects", ncertKind: "ncoq" })}>
        ${qxAnimCover("exemplar", QX_UX.textPlus)}
        <strong>${QX_UX.textPlus}</strong><small>In-text · exercise · extra set</small>
      </button>
      <button type="button" class="qx-ncert-tool qx-folder-card" ${mg("ncert", { step: "subjects", ncertKind: "dbq" })}>
        ${qxAnimCover("diagram", QX_UX.figureLab)}
        <strong>${QX_UX.figureLab}</strong><small>Figures · labelling · cycles</small>
      </button>
    </div>`;
}

function qxNcertSortSubjects(subjects) {
  const order = ["Physics", "Chemistry", "Botany", "Zoology", "Mathematics"];
  return (subjects || []).slice().sort((a, b) => {
    const ia = order.indexOf(a && a.name);
    const ib = order.indexOf(b && b.name);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

function filterNcertSubjects(subjects, mod) {
  const track = qxFolderTrack();
  const allow = (mod && mod.filterSubjects && (mod.filterSubjects[track] || mod.filterSubjects[STATE.exam])) || null;
  if (track === "Engineering") {
    const set = new Set(allow && allow.length ? allow : ["Physics", "Chemistry"]);
    return qxNcertSortSubjects((subjects || []).filter(s => set.has(s.name)));
  }
  if (track === "Medical") {
    const set = new Set(allow && allow.length ? allow : ["Physics", "Chemistry", "Botany", "Zoology"]);
    return qxNcertSortSubjects((subjects || []).filter(s => set.has(s.name)));
  }
  if (track === "Defence") {
    const set = new Set(["Mathematics", "General Ability", "Physics", "Chemistry"]);
    return (subjects || []).filter(s => set.has(s.name));
  }
  if (!allow || !allow.length) return qxNcertSortSubjects(subjects || []);
  const set = new Set(allow);
  return qxNcertSortSubjects((subjects || []).filter(s => set.has(s.name)));
}

async function viewNeetModuleBank(payload, moduleId, opts) {
  opts = opts || {};
  const p = { ..._bankPayload, module: moduleId, ...(payload || {}) };
  _bankPayload = p;
  const navName = opts.navName || (moduleId === "ncert" ? "neet_ncert" : "neet_allqs");
  let mod = opts.mod || await fetchModuleNav(navName);
  if (opts.augment !== false) {
    try { mod = await qxAugmentModuleNav(mod, moduleId, opts); } catch (_) { /* keep raw nav */ }
  }
  if (!mod || !((mod.subjects || []).length)) {
    return `${topbar(moduleId === "ncert" ? "NCERT Based Qs Bank" : "All Question Bank", "")}
      <div class="empty">Could not load this bank yet.
        <button type="button" class="btn-primary" onclick="location.reload()">Retry</button>
      </div>`;
  }
  const title = opts.title || (mod && mod.title) || (moduleId === "ncert" ? "NCERT Based Qs Bank" : "All Question Bank");
  const subtitle = opts.subtitle || (moduleId === "ncert" ? "Syllabus-aligned NCERT questions · Quantrex" : "Chapter-wise questions by subject");
  const examSlug = (mod && mod.examSlug) || "neet";
  const subjects = filterNcertSubjects((mod && mod.subjects) || [], mod);
  const viewKey = opts.viewKey || moduleId;

  if (p.step === "subjects" || !p.subject) {
    _lastListFn = () => ({ module: moduleId, step: "subjects", ...(opts.ncertKind ? { ncertKind: opts.ncertKind } : {}) });
    const cards = subjects.map(s => `
      <div class="subj-card" ${mg(viewKey, { step: "chapters", subject: s.name, ...(opts.ncertKind ? { ncertKind: opts.ncertKind } : {}) })}>
        <span class="subj-ic">${subjectIcon(s.name, s.icon)}</span>
        <div><strong>${s.name}</strong><small>${((s.chapters || []).length)} chapters · ${Number(s.count || 0).toLocaleString()} qs</small></div>
      </div>`).join("");
    return `${topbar(title, subtitle)}<div class="subj-grid">${cards || '<div class="empty">NCERT module data loading…</div>'}</div>`;
  }

  const subj = subjects.find(s => s.name === p.subject);
  if (!subj) return viewNeetModuleBank({ step: "subjects", ...(opts.ncertKind ? { ncertKind: opts.ncertKind } : {}) }, moduleId, opts);

  if (p.step === "chapters" || !p.chapter) {
    _lastListFn = () => ({ module: moduleId, step: "chapters", subject: p.subject });
    const bc = breadcrumb([{ label: title, view: viewKey, payload: { step: "subjects", ...(opts.ncertKind ? { ncertKind: opts.ncertKind } : {}) } }, { label: p.subject }]);
    const cards = subj.chapters.map((c, idx) => {
      const tc = c.topicCount || (c.topics && c.topics.length) || 0;
      const prog = typeof QxCardIcons !== "undefined"
        ? QxCardIcons.chapterProgressStats(examSlug, p.subject, c.name, c.count)
        : { solved: 0, total: c.count || 0 };
      const g = ["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7"][idx % 8];
      return `<button type="button" class="qx-topic-card qx-topic-rich qx-topic-${g} ch-card qx-ch-card-rich" ${mg(viewKey, { step: "chapterHub", subject: p.subject, chapter: c.name, ...(opts.ncertKind ? { ncertKind: opts.ncertKind } : {}) })}>
        <div class="qx-topic-top">
          <span class="qx-topic-ic" aria-hidden="true">${cpyqbChapterIcon(null, p.subject, c.name)}</span>
          ${tc ? `<span class="qx-ch-pill">Topics</span>` : ""}
        </div>
        <strong class="qx-topic-name">${c.name}</strong>
        <div class="qx-topic-details">
          <span class="qx-ch-pill qs">${prog.solved}/${prog.total || c.count || 0} Qs</span>
        </div>
        ${qxProgressBar(prog.solved, prog.total || c.count || 0)}
      </button>`;
    }).join("");
    return `${topbar(p.subject, title)}${bc}<div class="ch-grid qx-topic-grid qx-topic-grid-rich">${cards}</div>`;
  }

  const chNav = subj.chapters.find(c => c.name === p.chapter);
  const basePayload = { ...(opts.ncertKind ? { ncertKind: opts.ncertKind } : {}) };
  const baseBc = [
    { label: title, view: viewKey, payload: { step: "subjects", ...basePayload } },
    { label: p.subject, view: viewKey, payload: { step: "chapters", subject: p.subject, ...basePayload } },
    { label: p.chapter, view: viewKey, payload: { step: "chapterHub", subject: p.subject, chapter: p.chapter, ...basePayload } }
  ];

  async function resolveMeta() {
    let meta = await fetchChapterMeta(examSlug, p.subject, p.chapter);
    if (meta) return meta;
    if (chNav && chNav.topics && chNav.topics.length) return { topics: chNav.topics, buckets: [] };
    return null;
  }

  if (p.step === "chapterHub" || (!p.topicId && !p.topicTitle && p.step !== "topics" && p.step !== "questions")) {
    const localTopics = (chNav && chNav.topics) || [];
    if (localTopics.length) return viewNeetModuleBank({ ...p, step: "topics" }, moduleId, opts);
    let meta = null;
    try {
      meta = await Promise.race([
        resolveMeta(),
        new Promise((resolve) => setTimeout(() => resolve(null), 3500))
      ]);
    } catch (_) { meta = null; }
    const topics = (meta && meta.topics) || [];
    if (topics.length) return viewNeetModuleBank({ ...p, step: "topics" }, moduleId, opts);
    return viewNeetModuleBank({ ...p, step: "questions" }, moduleId, opts);
  }

  if (p.step === "topics" && !p.topicId && !p.topicTitle) {
    _lastListFn = () => ({ module: moduleId, step: "topics", subject: p.subject, chapter: p.chapter, ...(opts.ncertKind ? { ncertKind: opts.ncertKind } : {}) });
    const meta = await resolveMeta();
    const topics = (meta && meta.topics) || (chNav && chNav.topics) || [];
    const bc = breadcrumb(baseBc.slice(0, -1).concat([{ label: p.chapter }]));
    const cards = topics.map(t => `
      <div class="ch-card qx-topic-card qx-ch-card-rich" ${mg(viewKey, { step: "questions", mode: "topic", subject: p.subject, chapter: p.chapter, topicId: t.id, topicTitle: t.title, ...(opts.ncertKind ? { ncertKind: opts.ncertKind } : {}) })}>
        <div class="qx-ch-card-top">
          ${cpyqbChapterIcon(null, p.subject, t.title)}
          <div class="qx-topic-body qx-ch-body"><strong>${t.title}</strong><small>${(t.count || 0).toLocaleString()} questions</small></div>
        </div>
        ${qxProgressBar(0, t.count || 0)}
      </div>`).join("");
    return `${topbar(p.chapter, "Topicwise · " + title)}${bc}<div class="ch-grid qx-topic-grid">${cards || '<div class="empty">No subtopics for this chapter yet.</div>'}</div>`;
  }

  const bankSlugs = qxBankSlugsForFolder(moduleId, p.subject, opts);
  const useCpyqb = bankSlugs.length === 1 && typeof ensureCpyqbChapterQuestions === "function";
  let qs = [];
  if (useCpyqb) {
    qs = await ensureCpyqbChapterQuestions(bankSlugs[0], p.subject, p.chapter, null, {
      mode: p.mode,
      topicId: p.topicId,
      topicTitle: p.topicTitle
    });
  }
  if (!qs.length) {
    if (typeof loadMultipleBanks === "function") {
      showToast("📚 Loading complete question bank…");
      await loadMultipleBanks(bankSlugs, { allowLarge: true });
    } else {
      for (const slug of bankSlugs) {
        if (!_banksLoaded[slug]) { showToast("📚 Loading questions…"); await loadSingleBank(slug, { allowLarge: true }); }
      }
    }
    qs = qxFilterQsChapter(
      QUESTIONS.filter(q => q && bankSlugs.includes(q._bank)),
      p.subject,
      p.chapter
    );
  }
  const meta = await resolveMeta();
  let filterNote = "";
  if (p.mode === "topic" && (p.topicId || p.topicTitle) && meta) {
    const topic = findMetaItem(meta.topics, p.topicId, p.topicTitle);
    if (topic && topic.questionIds && topic.questionIds.length) {
      const filtered = filterByMarksIds(qs, topic.questionIds);
      if (filtered.length) qs = filtered;
      else filterNote = `<p class="result-count">Could not match subtopic (${topic.questionIds.length} IDs).</p>`;
    }
  }
  _lastListFn = () => ({ ...p, step: "questions" });
  const modeLabel = p.topicTitle || "All Questions";
  const bc = breadcrumb(baseBc.concat([
    p.topicTitle ? { label: "Topicwise", view: viewKey, payload: { step: "topics", subject: p.subject, chapter: p.chapter, ...basePayload } } : null,
    { label: modeLabel }
  ].filter(Boolean)));
  const testMeta = { title: `${p.chapter} · ${modeLabel}`, returnTo: viewKey, limit: 30 };
  return `${topbar(p.chapter, `${p.subject} · ${title}`)}${bc}${filterNote}${renderQList(qs, _listPage, testMeta)}`;
}

function boardSubjIconHtml(s) {
  return subjectIcon(s && s.name, s && s.icon, 36);
}

function boardExamIconHtml(examData, size, cls) {
  if (examData && examData.icon) {
    return marksThemedIcon(examData.icon, size || 48, cls || "board-exam-icon", examData.title);
  }
  const board = typeof dashBoardSelected === "function" ? dashBoardSelected() : "CBSE";
  return typeof QuantrexExamLogos !== "undefined" ? QuantrexExamLogos.html(board, size || 48, cls || "board-exam-icon") : "";
}

function boardMetaPillsHtml(meta) {
  if (!meta || !meta.length) return "";
  const pills = meta
    .slice()
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
    .map(m => `<div class="board-meta-pill"><span class="board-meta-k">${m.title}</span><span class="board-meta-v">${m.description}</span></div>`)
    .join("");
  return `<div class="board-meta-pills">${pills}</div>`;
}

function boardWrapSplit(examData, subject, mainHtml, examId) {
  if (typeof MarksShell !== "undefined" && MarksShell.boardSplitLayout) {
    return MarksShell.boardSplitLayout(examData, subject, mainHtml, examId);
  }
  return mainHtml;
}

const QX_BOARD_FALLBACK = {
  CBSE: {
    examId: "6943ebc753e4e1880190efca",
    title: "CBSE",
    subjects: [
      { id: "6943ebc753e4e1880190edac", name: "Physics", shortTitle: "Phy" },
      { id: "6943ebc753e4e1880190edad", name: "Chemistry", shortTitle: "Chem" },
      { id: "6943ebc753e4e1880190edae", name: "Mathematics", shortTitle: "Math" },
      { id: "6943ebc753e4e1880190edaf", name: "Biology", shortTitle: "Bio" }
    ]
  },
  HSC: {
    examId: "694ad7d4158e3395c5200f5a",
    title: "HSC (Maharashtra)",
    subjects: [
      { id: "694ad7d4158e3395c5200d2c", name: "Physics", shortTitle: "Phy" },
      { id: "694ad7d4158e3395c5200d2d", name: "Chemistry", shortTitle: "Chem" },
      { id: "694ad7d4158e3395c5200d2e", name: "Mathematics & Statistics", shortTitle: "Math" },
      { id: "694ad7d4158e3395c5200d2f", name: "Biology", shortTitle: "Bio" }
    ]
  }
};

const QX_NCERT_FALLBACK_SUBJECTS = [
  { id: "68942eace8ab0dbd011ac238", name: "Physics" },
  { id: "68942eafe8ab0dbd011accdf", name: "Chemistry" },
  { id: "68bfa5bbf2cd5ba2e9d81bb6", name: "Botany" },
  { id: "68bfa5d22ce847dbab34fdcc", name: "Zoology" }
];

async function qxBoardChaptersFromLocal(subject, board) {
  const local = await qxLocalBoardModule(board);
  const names = /biology/i.test(subject || "")
    ? ["Biology", "Botany", "Zoology"]
    : [subject];
  const out = [];
  const seen = new Set();
  (local.subjects || []).forEach((s) => {
    if (!names.some((n) => n === s.name || qxChMatch(n, s.name))) return;
    (s.chapters || []).forEach((c) => {
      const name = c.name || c.title;
      if (!name || seen.has(name)) return;
      seen.add(name);
      out.push({ id: c.id || "", name, count: c.count || 0 });
    });
  });
  return out;
}

async function qxLoadBoardOffline(board) {
  const key = String(board || "").toUpperCase() === "HSC" ? "hsc" : "cbse";
  window._qxBoardOffBy = window._qxBoardOffBy || {};
  if (window._qxBoardOffBy[key] && window._qxBoardOffBy[key].subjects) return window._qxBoardOffBy[key];
  try {
    const path = key === "hsc"
      ? "data/board_hsc_offline/index.json?v=board2"
      : "data/board_offline/index.json?v=board2";
    const res = await fetch(path);
    if (!res.ok) return null;
    const data = await res.json();
    window._qxBoardOffBy[key] = data;
    if (key === "cbse") window._qxBoardOff = data;
    return data;
  } catch (_) {
    return null;
  }
}

async function qxLoadBoardOfflineChapter(file) {
  window._qxBoardOffCh = window._qxBoardOffCh || {};
  if (window._qxBoardOffCh[file]) return window._qxBoardOffCh[file];
  const res = await fetch(file + "?v=board1");
  if (!res.ok) return { questions: [] };
  const data = await res.json();
  window._qxBoardOffCh[file] = data;
  return data;
}

function qxOfflineMarksHex(id) {
  const s = String(id || "");
  const m = s.match(/^(?:board_|ncert_|m_)?([a-f0-9]{24})$/i);
  return m ? m[1] : "";
}

function qxFindBoardFileForId(off, hex) {
  if (!off || !hex) return null;
  const want = String(hex);
  for (let i = 0; i < (off.subjects || []).length; i++) {
    const s = off.subjects[i];
    for (let j = 0; j < (s.chapters || []).length; j++) {
      const c = s.chapters[j];
      const secs = c.sections || [];
      for (let k = 0; k < secs.length; k++) {
        const bks = (secs[k] && secs[k].buckets) || [];
        for (let n = 0; n < bks.length; n++) {
          const ids = (bks[n] && bks[n].ids) || [];
          if (ids.indexOf(want) >= 0) return c.file;
        }
      }
    }
  }
  return null;
}

async function qxEnsureOfflinePackQuestion(id) {
  const sid = String(id || "");
  try {
    if (typeof getQ === "function") {
      const hit = getQ(sid) || getQ(sid.replace(/^(board_|ncert_)/, ""));
      if (hit && hit.q && String(hit.q).replace(/<[^>]+>/g, "").trim().length > 4) return hit;
    }
  } catch (_) { /* */ }

  const hex = qxOfflineMarksHex(sid);
  const wantBoard = /^board_/i.test(sid) || (!/^ncert_/i.test(sid) && hex);
  const wantNcert = /^ncert_/i.test(sid);

  if (wantBoard && hex) {
    try {
      let off = await qxLoadBoardOffline("CBSE");
      let file = qxFindBoardFileForId(off, hex);
      if (!file) {
        off = await qxLoadBoardOffline("HSC");
        file = qxFindBoardFileForId(off, hex);
      }
      if (file) {
        const pack = await qxLoadBoardOfflineChapter(file);
        const q = (pack.questions || []).find((x) =>
          String(x._marksId) === hex || String(x.id) === sid || String(x.id) === ("board_" + hex)
        );
        if (q) {
          const nq = Object.assign({}, q, {
            id: q.id || ("board_" + hex),
            q: qxNcertProxyHtml(q.q),
            solution: qxNcertProxyHtml(q.solution),
            options: (q.options || []).map(qxNcertProxyHtml)
          });
          qxRegisterOfflineQuestions([nq]);
          return (typeof getQ === "function" && (getQ(nq.id) || getQ(sid))) || nq;
        }
      }
    } catch (e) {
      console.warn("board pack q", e);
    }
  }

  if (wantNcert || (!wantBoard && hex)) {
    try {
      window._qxNcertIdMap = window._qxNcertIdMap || null;
      if (!window._qxNcertIdMap) {
        const res = await fetch("data/ncert_offline/idmap.json?v=ncert2");
        window._qxNcertIdMap = res.ok ? await res.json() : {};
      }
      const file = hex && window._qxNcertIdMap[hex];
      if (file) {
        const pack = await qxLoadNcertOfflineChapter(file);
        const q = (pack.questions || []).find((x) =>
          String(x._marksId) === hex || String(x.id) === sid || String(x.id) === ("ncert_" + hex)
        );
        if (q) {
          const nq = Object.assign({}, q, {
            id: q.id || ("ncert_" + hex),
            q: qxNcertProxyHtml(q.q),
            solution: qxNcertProxyHtml(q.solution),
            options: (q.options || []).map(qxNcertProxyHtml)
          });
          qxRegisterOfflineQuestions([nq]);
          return (typeof getQ === "function" && (getQ(nq.id) || getQ(sid))) || nq;
        }
      }
    } catch (e) {
      console.warn("ncert pack q", e);
    }
  }
  return null;
}
try { window.qxEnsureOfflinePackQuestion = qxEnsureOfflinePackQuestion; } catch (_) { /* */ }

function qxBoardFilterByBucket(qs, bucket) {
  const ids = (bucket && bucket.ids) || [];
  if (!ids.length) return qs || [];
  const want = new Set(ids.map(String));
  return (qs || []).filter((q) => want.has(String(q._marksId || "")) || want.has(String(q.id || "").replace(/^board_/, "")));
}

async function viewBoardOffline(payload, off) {
  const p = { step: "subjects", ...(payload || {}) };
  const boardName = (p.board === "HSC" ? "HSC (Maharashtra)" : "CBSE");
  const title = "PYQ Bank for Board Exams";
  const subtitle = boardName + " · official board papers";
  const examId = off.examId || (QX_BOARD_FALLBACK.CBSE && QX_BOARD_FALLBACK.CBSE.examId);
  const subjects = filterBoardSubjects((off.subjects || []).map((s) => ({
    id: s.id,
    name: s.name,
    shortTitle: s.shortTitle,
    count: (s.chapters || []).reduce((n, c) => n + (c.count || 0), 0),
    chapters: s.chapters || []
  })));
  const examData = { examId, title: off.title || boardName, subjects, meta: [] };
  const boardKey = p.board || "CBSE";

  if (p.step === "subjects" || !p.subject) {
    _lastListFn = () => ({ step: "subjects", examId, board: boardKey });
    const cards = subjects.map((s) => `
      <div class="subj-card board-subj-card" ${mg("board", { step: "chapters", subject: s.name, subjectId: s.id, examId, board: boardKey })}>
        <span class="subj-ic board-subj-ic">${boardSubjIconHtml(s)}</span>
        <div><strong>${s.name}</strong><small>${boardName} · ${(s.count || 0).toLocaleString()} Qs</small></div>
      </div>`).join("");
    return `${topbar(title, subtitle)}
      <div class="board-marks-page">
        <div class="board-marks-hero">
          ${boardExamIconHtml(examData, 72, "board-marks-hero-ic")}
          <div class="board-marks-hero-text">
            <h1>${examData.title || boardName}</h1>
            <p>Previous Year Question Bank</p>
          </div>
        </div>
        <div class="subj-grid board-subj-grid">${cards || '<div class="empty">No subjects.</div>'}</div>
      </div>`;
  }

  const subj = subjects.find((s) => s.name === p.subject)
    || subjects.find((s) => typeof qxChMatch === "function" && qxChMatch(s.name, p.subject));
  if (!subj) return viewBoardOffline({ step: "subjects", examId, board: boardKey }, off);
  const chapters = subj.chapters || [];

  if (p.step === "chapters" || !p.chapter) {
    _lastListFn = () => ({ step: "chapters", subject: p.subject, subjectId: subj.id, examId, board: boardKey });
    const bc = breadcrumb([{ label: examData.title || title, view: "board", payload: { step: "subjects", examId, board: boardKey } }, { label: p.subject }]);
    const cards = chapters.map((c, idx) => {
      const g = ["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7"][idx % 8];
      return `<button type="button" class="qx-topic-card qx-topic-rich qx-topic-${g} ch-card board-ch-card qx-ch-card-rich" ${mg("board", { step: "chapterHub", subject: p.subject, subjectId: subj.id, chapter: c.name, chapterId: c.id, examId, board: boardKey })}>
        <div class="qx-topic-top">
          <span class="qx-topic-ic" aria-hidden="true">${cpyqbChapterIcon(null, p.subject, c.name)}</span>
        </div>
        <strong class="qx-topic-name">${c.name}</strong>
        <div class="qx-topic-details">
          <span class="qx-ch-pill qs">${(c.count || 0).toLocaleString()} Qs</span>
        </div>
      </button>`;
    }).join("");
    const pageHtml = `<div class="board-marks-page board-marks-inner">
      <div class="board-marks-head">
        <h1>${p.subject} PYQs</h1>
        <p>Chapter-wise Collection of ${p.subject} Board PYQs · ${chapters.length} chapters</p>
      </div>
      ${bc}<div class="ch-grid board-ch-grid qx-topic-grid qx-topic-grid-rich">${cards || '<div class="empty">No chapters in this extract.</div>'}</div>
    </div>`;
    return boardWrapSplit(examData, p.subject, pageHtml, examId);
  }

  const ch = chapters.find((c) => c.name === p.chapter || (typeof qxChMatch === "function" && qxChMatch(c.name, p.chapter)));
  const chapterId = p.chapterId || (ch && ch.id);
  const baseBc = [
    { label: title, view: "board", payload: { step: "subjects", examId, board: boardKey } },
    { label: p.subject, view: "board", payload: { step: "chapters", subject: p.subject, subjectId: subj.id, examId, board: boardKey } },
    { label: p.chapter, view: "board", payload: { step: "chapterHub", subject: p.subject, subjectId: subj.id, chapter: p.chapter, chapterId, examId, board: boardKey } }
  ];

  if (p.step === "chapterHub" || (!p.bucketId && !p.bucketTitle && p.step !== "questions")) {
    _lastListFn = () => ({ step: "chapterHub", subject: p.subject, subjectId: subj.id, chapter: p.chapter, chapterId, examId, board: boardKey });
    const sections = (ch && ch.sections) || [];
    const bc = breadcrumb(baseBc);
    const blocks = sections.map((sec) => {
      const cards = (sec.buckets || []).map((b) => `
        <div class="ch-card qx-topic-card qx-ch-card-rich" ${mg("board", { step: "questions", subject: p.subject, subjectId: subj.id, chapter: p.chapter, chapterId, bucketId: b.bucketId, bucketTitle: b.title, examId, board: boardKey })}>
          <div class="qx-ch-card-top">
            ${cpyqbChapterIcon(null, p.subject, b.title || p.chapter)}
            <div class="qx-topic-body qx-ch-body"><strong>${b.title}</strong><small>${(b.count || 0).toLocaleString()} questions</small></div>
          </div>
        </div>`).join("");
      return `<h3 class="sec-title">${sec.title}</h3><div class="ch-grid qx-topic-grid">${cards}</div>`;
    }).join("");
    const sessionBar = typeof cpyqbChapterSessionBar === "function"
      ? cpyqbChapterSessionBar({ exam: examId, subject: p.subject, chapter: p.chapter, returnTo: "board" }, (ch && ch.count) || 0)
      : "";
    const allCard = `<div class="ch-card qx-topic-card qx-ch-card-rich" ${mg("board", { step: "questions", subject: p.subject, subjectId: subj.id, chapter: p.chapter, chapterId, bucketId: "", bucketTitle: "All questions", examId, board: boardKey })}>
      <div class="qx-ch-card-top">
        ${cpyqbChapterIcon(null, p.subject, p.chapter)}
        <div class="qx-topic-body qx-ch-body"><strong>All questions</strong><small>${(ch && ch.count) || 0} questions</small></div>
      </div>
    </div>`;
    const hubHtml = `<div class="board-marks-page board-marks-inner">
      <div class="board-marks-head compact">
        <h1>${p.chapter}</h1>
        <p>${p.subject} · ${examData.title || boardName}</p>
      </div>
      ${bc}${sessionBar}<div class="ch-grid qx-topic-grid">${allCard}</div>${blocks}
    </div>`;
    return boardWrapSplit(examData, p.subject, hubHtml, examId);
  }

  showToast("📚 Loading board questions…");
  let qs = [];
  if (ch && ch.file) {
    const pack = await qxLoadBoardOfflineChapter(ch.file);
    qs = pack.questions || [];
    if (p.bucketId || (p.bucketTitle && !/^all/i.test(p.bucketTitle))) {
      let bucket = null;
      (ch.sections || []).forEach((sec) => {
        (sec.buckets || []).forEach((b) => {
          if (b.bucketId === p.bucketId || b.title === p.bucketTitle) bucket = b;
        });
      });
      if (bucket) qs = qxBoardFilterByBucket(qs, bucket);
    }
    qs = qs.map((q) => {
      const nq = Object.assign({}, q);
      nq.q = qxNcertProxyHtml(nq.q);
      nq.solution = qxNcertProxyHtml(nq.solution);
      nq.options = (nq.options || []).map(qxNcertProxyHtml);
      return nq;
    });
  }

  _lastListFn = () => ({ ...p, step: "questions" });
  const modeLabel = p.bucketTitle || "Questions";
  const bc = breadcrumb(baseBc.concat([{ label: modeLabel }]));
  const testMeta = { title: `${p.chapter} · ${modeLabel}`, returnTo: "board", limit: 30, exam: examId, subject: p.subject, chapter: p.chapter };
  const listHtml = `<div class="board-marks-page board-marks-inner">
    <div class="board-marks-head compact">
      <h1>${modeLabel}</h1>
      <p>${p.chapter} · ${p.subject}</p>
    </div>
    ${bc}${renderQList(qs, _listPage, testMeta)}
  </div>`;
  return boardWrapSplit(examData, p.subject, listHtml, examId);
}

async function viewBoardLocal(payload) {
  const p = { step: "subjects", ...(payload || {}) };
  const boardName = p.board
    || (typeof dashBoardSelected === "function" ? dashBoardSelected() : "CBSE");
  if (typeof MarksLive !== "undefined") {
    try {
      await MarksLive.ensureToken();
      if (MarksLive.boardSubjects) return viewBoardMarksBank(Object.assign({}, p, { _qxBoardLocal: 1 }));
    } catch (_) { /* stay local */ }
  }
  const title = (String(boardName).toUpperCase() === "HSC" ? "HSC (Maharashtra)" : "CBSE") + " Board PYQs";
  const names = qxBoardAllowNames();
  const subtitle = names.join(" · ") + " · official board papers";
  const cards = names.map((name) => `
    <div class="subj-card board-subj-card" ${mg("board", { step: "chapters", subject: name, board: boardName })}>
      <span class="subj-ic board-subj-ic">${subjectIcon(name)}</span>
      <div><strong>${name}</strong><small>${boardName} · Board PYQs</small></div>
    </div>`).join("");
  return `${topbar(title, subtitle)}<div class="subj-grid board-subj-grid">${cards}</div>
    <p class="sec-desc">Open a subject to load board papers.</p>`;
}

async function viewBoardMarksBank(payload) {
  const p = { step: "subjects", ...(payload || {}) };
  {
    const off = await qxLoadBoardOffline(p.board);
    if (off && (off.subjects || []).length) return viewBoardOffline(p, off);
  }
  // From Academic → Class 12 → CBSE/HSC: persist board choice
  if (p.board === "CBSE" || p.board === "HSC") {
    try { localStorage.setItem("quantrex_board", p.board); } catch (_) { /* */ }
  }
  const boardName = (p.board === "HSC" ? "HSC (Maharashtra)" : p.board === "CBSE" ? "CBSE" : null)
    || (typeof dashBoardSelected === "function" ? dashBoardSelected() : "CBSE");
  const title = "PYQ Bank for Board Exams";
  const subtitle = boardName + " · real board papers with dates";
  const viewKey = "board";

  if (typeof MarksLive === "undefined") {
    return p._qxBoardLocal ? `${topbar("Board PYQs", "")}<div class="empty">Board module not loaded.</div>` : viewBoardLocal(p);
  }

  try { await MarksLive.ensureToken(); } catch (_) { /* continue if cached */ }

  const examId = p.examId
    || (p.board && MarksLive.BOARD_EXAMS && MarksLive.BOARD_EXAMS[p.board])
    || MarksLive.boardId();

  let examData;
  try {
    examData = await MarksLive.boardSubjects(examId);
    if (!examData || !((examData.subjects || []).length)) throw new Error("empty board");
  } catch (e) {
    const fbKey = (p.board === "HSC" || /HSC/i.test(String(boardName || ""))) ? "HSC" : "CBSE";
    const fb = QX_BOARD_FALLBACK[fbKey];
    examData = {
      examId: examId || fb.examId,
      title: fb.title,
      subjects: fb.subjects.slice(),
      meta: []
    };
  }

  const subjects = filterBoardSubjects(examData.subjects || []);
  examData.subjects = subjects;
  const boardKey = p.board || (typeof dashBoardSelected === "function" ? dashBoardSelected() : "CBSE");

  if (p.step === "subjects" || !p.subject) {
    _lastListFn = () => ({ step: "subjects", examId, board: boardKey });
    const cards = subjects.map(s => `
      <div class="subj-card board-subj-card" ${mg("board", { step: "chapters", subject: s.name, subjectId: s.id, examId, board: boardKey })}>
        <span class="subj-ic board-subj-ic">${boardSubjIconHtml(s)}</span>
        <div><strong>${s.name}</strong><small>${s.shortTitle || boardName} · Board PYQs</small></div>
      </div>`).join("");
    return `${topbar(title, subtitle)}
      <div class="board-marks-page">
        <div class="board-marks-hero">
          ${boardExamIconHtml(examData, 72, "board-marks-hero-ic")}
          <div class="board-marks-hero-text">
            <h1>${examData.title || boardName}</h1>
            <p>Previous Year Question Bank</p>
          </div>
        </div>
        ${boardMetaPillsHtml(examData.meta)}
        <div class="subj-grid board-subj-grid">${cards || '<div class="empty">No subjects.</div>'}</div>
      </div>`;
  }

  const subj = subjects.find(s => s.name === p.subject)
    || subjects.find(s => typeof qxChMatch === "function" && qxChMatch(s.name, p.subject));
  if (!subj) return viewBoardMarksBank({ step: "subjects", examId, board: boardKey });

  let chapters = p._chapters;
  if (!chapters) {
    showToast("📚 Loading " + p.subject + " chapters…");
    try {
      const chData = await MarksLive.boardChapters(examId, subj.id);
      chapters = (chData && chData.chapters) || [];
    } catch (_) {
      chapters = [];
    }
    if (!chapters.length) chapters = [];
    p._chapters = chapters;
  }

  if (p.step === "chapters" || !p.chapter) {
    _lastListFn = () => ({ step: "chapters", subject: p.subject, subjectId: subj.id, examId, _chapters: chapters });
    const bc = breadcrumb([{ label: examData.title || title, view: "board", payload: { step: "subjects", examId } }, { label: p.subject }]);
    const cards = chapters.map((c, idx) => {
      const g = ["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7"][idx % 8];
      return `<button type="button" class="qx-topic-card qx-topic-rich qx-topic-${g} ch-card board-ch-card qx-ch-card-rich" ${mg("board", { step: "chapterHub", subject: p.subject, subjectId: subj.id, chapter: c.name, chapterId: c.id, examId, _chapters: chapters })}>
        <div class="qx-topic-top">
          <span class="qx-topic-ic" aria-hidden="true">${cpyqbChapterIcon(null, p.subject, c.name)}</span>
        </div>
        <strong class="qx-topic-name">${c.name}</strong>
        <div class="qx-topic-details">
          <span class="qx-ch-pill qs">${(c.count || 0).toLocaleString()} Qs</span>
        </div>
        ${qxProgressBar(0, c.count || 0)}
      </button>`;
    }).join("");
    const pageHtml = `<div class="board-marks-page board-marks-inner">
      <div class="board-marks-head">
        <h1>${p.subject} PYQs</h1>
        <p>Chapter-wise Collection of ${p.subject} Board PYQs · ${chapters.length} chapters</p>
      </div>
      ${bc}<div class="ch-grid board-ch-grid qx-topic-grid qx-topic-grid-rich">${cards}</div>
    </div>`;
    return boardWrapSplit(examData, p.subject, pageHtml, examId);
  }

  const ch = chapters.find(c => c.name === p.chapter);
  const chapterId = p.chapterId || (ch && ch.id);
  const baseBc = [
    { label: title, view: "board", payload: { step: "subjects", examId } },
    { label: p.subject, view: "board", payload: { step: "chapters", subject: p.subject, subjectId: subj.id, examId, _chapters: chapters } },
    { label: p.chapter, view: "board", payload: { step: "chapterHub", subject: p.subject, subjectId: subj.id, chapter: p.chapter, chapterId, examId, _chapters: chapters } }
  ];

  if (p.step === "chapterHub" || (!p.bucketId && !p.bucketTitle && p.step !== "questions")) {
    _lastListFn = () => ({ step: "chapterHub", subject: p.subject, subjectId: subj.id, chapter: p.chapter, chapterId, examId, _chapters: chapters });
    showToast("📊 Loading chapter buckets…");
    let detail = {};
    try {
      if (chapterId && typeof MarksLive.boardChapterDetails === "function") {
        detail = await MarksLive.boardChapterDetails(examId, subj.id, chapterId);
      }
    } catch (_) { detail = {}; }
    const sections = (detail && detail.sections) || [];
    if (!sections.length) {
      return viewBoardMarksBank(Object.assign({}, p, { step: "questions", bucketId: "", bucketTitle: "All questions" }));
    }
    const bc = breadcrumb(baseBc);
    const blocks = sections.map(sec => {
      const cards = (sec.buckets || []).map(b => `
        <div class="ch-card qx-topic-card qx-ch-card-rich" ${mg("board", { step: "questions", subject: p.subject, subjectId: subj.id, chapter: p.chapter, chapterId, bucketId: b.bucketId, bucketTitle: b.title, examId, _chapters: chapters })}>
          <div class="qx-ch-card-top">
            ${cpyqbChapterIcon(null, p.subject, b.title || p.chapter)}
            <div class="qx-topic-body qx-ch-body"><strong>${b.title}</strong><small>${(b.totalQuestions || 0).toLocaleString()} questions</small></div>
          </div>
        </div>`).join("");
      return `<h3 class="sec-title">${sec.title}</h3><div class="ch-grid qx-topic-grid">${cards}</div>`;
    }).join("");
    const hubHtml = `<div class="board-marks-page board-marks-inner">
      <div class="board-marks-head compact">
        <h1>${p.chapter}</h1>
        <p>${p.subject} · ${examData.title || boardName}</p>
      </div>
      ${bc}${typeof cpyqbChapterSessionBar === "function" ? cpyqbChapterSessionBar({ exam: examId, subject: p.subject, chapter: p.chapter, returnTo: "board" }) : ""}${blocks || '<div class="empty">No buckets for this chapter.</div>'}
    </div>`;
    return boardWrapSplit(examData, p.subject, hubHtml, examId);
  }

  showToast("📚 Loading board questions with options…");
  let qs = [];
  if (p.bucketId) {
    try {
      const bucketData = await MarksLive.boardBucketQuestions(
        examId, subj.id, chapterId, p.bucketId, 0, 200,
        { subject: p.subject, chapter: p.chapter, examName: boardName, bank: "board_live" }
      );
      qs = (bucketData && bucketData.questions) || [];
    } catch (_) { qs = []; }
  }
  if (!qs.length) {
    const slug = qxBankSlugsForFolder("board", p.subject, { board: boardKey })[0];
    const bankSubject = /biology/i.test(p.subject || "") ? null : p.subject;
    try { qs = []; } catch (_) { qs = []; }
  }
  // Background only — do not freeze UI waiting for every option
  if (MarksLive.prefetchQuestions && qs.length) {
    const ids = qs.slice(0, 8).map(q => q.id);
    Promise.resolve().then(() => MarksLive.prefetchQuestions(ids)).catch(() => {});
  }
  qs = qs.map(q => (typeof getQ === "function" ? getQ(q.id) : null) || q);

  _lastListFn = () => ({ ...p, step: "questions" });
  const modeLabel = p.bucketTitle || "Questions";
  const bc = breadcrumb(baseBc.concat([
    { label: "Buckets", view: "board", payload: { step: "chapterHub", subject: p.subject, subjectId: subj.id, chapter: p.chapter, chapterId, examId, _chapters: chapters } },
    { label: modeLabel }
  ]));
  const testMeta = { title: `${p.chapter} · ${modeLabel}`, returnTo: "board", limit: 30, exam: examId, subject: p.subject, chapter: p.chapter };
  const listHtml = `<div class="board-marks-page board-marks-inner">
    <div class="board-marks-head compact">
      <h1>${modeLabel}</h1>
      <p>${p.chapter} · ${p.subject}</p>
    </div>
    ${bc}${renderQList(qs, _listPage, testMeta)}
  </div>`;
  return boardWrapSplit(examData, p.subject, listHtml, examId);
}

const NCERT_KIND_NAV = {
  lblq: { title: QX_UX.lineScan, sub: "Concept-by-concept · Quantrex" },
  ncoq: { title: QX_UX.textPlus, sub: "Textbook + extra set · Quantrex" },
  dbq: { title: QX_UX.figureLab, sub: "Figure-based practice" },
  ncert: { title: QX_UX.ncertBox, sub: "Syllabus-aligned · Quantrex" }
};

function qxNcertPyqSlug() {
  const t = qxFolderTrack();
  if (t === "Medical") return "neet";
  if (t === "Defence") return "nda";
  return "jee_main";
}

function qxNcertPyqLabel() {
  const t = qxFolderTrack();
  if (t === "Medical") return "NEET PYQs";
  if (t === "Defence") return "NDA PYQs";
  return "JEE Main PYQs";
}

async function qxEnsureNcertLive(kind) {
  const k = kind || "lblq";
  window._qxNcertLive = window._qxNcertLive || {};
  if (window._qxNcertLive[k] && window._qxNcertLive[k].subjects && window._qxNcertLive[k].subjects.length) {
    return window._qxNcertLive[k];
  }
  if (typeof MarksLive === "undefined" || !MarksLive.ncertSubjects) return null;
  try {
    const pack = await MarksLive.ncertSubjects(k);
    if (!pack || !((pack.subjects || []).length)) throw new Error("empty ncert");
    window._qxNcertLive[k] = pack;
    return pack;
  } catch (_) {
    return {
      module: "LBLQSubject",
      kind: k,
      subjects: QX_NCERT_FALLBACK_SUBJECTS.map((s) => ({ id: s.id, name: s.name }))
    };
  }
}

function qxNcertFindSubject(subjects, name) {
  return (subjects || []).find(s => s && (s.name === name || qxChMatch(s.name, name)));
}

function qxNcertFindChapter(chapters, name) {
  return (chapters || []).find(c => c && (c.name === name || qxChMatch(c.name, name)));
}

async function qxLoadNcertOfflineIndex() {
  if (window._qxNcertOff && window._qxNcertOff.subjects) return window._qxNcertOff;
  try {
    const res = await fetch("data/ncert_offline/index.json?v=ncert2");
    if (!res.ok) return null;
    window._qxNcertOff = await res.json();
    return window._qxNcertOff;
  } catch (_) {
    return null;
  }
}

async function qxLoadNcertOfflineChapter(file) {
  window._qxNcertOffCh = window._qxNcertOffCh || {};
  if (window._qxNcertOffCh[file]) return window._qxNcertOffCh[file];
  const res = await fetch(file + "?v=ncert2");
  if (!res.ok) return { questions: [] };
  const data = await res.json();
  window._qxNcertOffCh[file] = data;
  return data;
}

function qxNcertFilterBySet(qs, setTitle) {
  const t = String(setTitle || "");
  if (!t || /^all\s*ncert/i.test(t)) return qs;
  const want = t.toLowerCase();
  const tagged = (qs || []).filter((q) =>
    (q.ncertSets || []).some((s) => String(s || "").toLowerCase() === want)
  );
  if (tagged.length) return tagged;
  return (qs || []).filter((q) => {
    const blob = String(q.q || "").toLowerCase();
    if (/diagram/i.test(t)) return /<img|diagram-based/i.test(blob);
    if (/assertion/i.test(t)) return /assertion|reason/i.test(blob);
    if (/matrix|match/i.test(t)) return /match the|column|list[\s\-]*i/i.test(blob);
    if (/multi\s*statement/i.test(t)) return /following statements|incorrect statement|correct statements/i.test(blob);
    if (/exemplar/i.test(t)) return /exemplar/i.test(blob);
    if (/exercise/i.test(t)) return !/<img|diagram-based|assertion|reason|match the|exemplar/i.test(blob);
    if (/line\s*by\s*line|lblq/i.test(t)) return true;
    return true;
  });
}

function qxNcertProxyHtml(html) {
  if (typeof QuantrexSolution !== "undefined" && QuantrexSolution.cleanSolutionFigHtml) {
    return QuantrexSolution.cleanSolutionFigHtml(html);
  }
  return String(html || "").replace(/https?:\/\/(?:cdn-question-pool\.getmarks\.app|cdn\.quizrr\.in)\/[^"'>\s]+/gi, (u) => {
    if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc) {
      return QxOwnedFigs.displaySrc(u) || u;
    }
    const owned = (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.ownedFigureUrl)
      ? QxOwnedFigs.ownedFigureUrl(u)
      : "";
    return "/api/proxy-image?clean=1&v=qxfig110&url=" + encodeURIComponent(owned || u);
  });
}

async function viewNcertLocal(payload, kind) {
  return viewNcertMarks(payload || { step: "subjects" }, kind);
}

async function viewNcertMarks(payload, kind) {
  const navMeta = NCERT_KIND_NAV[kind] || NCERT_KIND_NAV.lblq;
  const p = { step: "subjects", ...(payload || {}), ncertKind: kind };
  const title = navMeta.title;
  const off = await qxLoadNcertOfflineIndex();
  let localMod = null;
  try { localMod = await fetchModuleNav(qxNcertNavName(kind)); } catch (_) { localMod = null; }

  let subjects = [];
  if (off && off.subjects && off.subjects.length) {
    subjects = off.subjects.map((s) => ({
      id: s.name,
      name: s.name,
      icon: s.icon,
      count: (s.chapters || []).reduce((n, c) => n + (c.count || 0), 0),
      chapters: (s.chapters || []).map((c) => ({
        name: c.name,
        count: c.count || 0,
        file: c.file,
        sets: c.sets || []
      }))
    }));
  } else {
    subjects = ((localMod && localMod.subjects) || []).map(s => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      count: s.count || 0,
      chapters: qxNormalizeChapterRows(s.chapters)
    }));
  }
  subjects = filterNcertSubjects(subjects, { filterSubjects: { Engineering: ["Physics", "Chemistry"], Medical: ["Physics", "Chemistry", "Botany", "Zoology"] } });

  const kindPay = { ncertKind: kind };

  if (p.step === "subjects" || !p.subject) {
    _lastListFn = () => ({ step: "subjects", ...kindPay });
    const cards = subjects.map(s => `
      <button type="button" class="subj-card qx-folder-card qx-ncert-subj" ${mg("ncert", { step: "chapters", subject: s.name, subjectId: s.id, ...kindPay })}>
        <span class="subj-ic">${subjectIcon(s.name, s.icon)}</span>
        <div><strong>${s.name}</strong><small>NCERT questions</small></div>
      </button>`).join("");
    return `${topbar(title, navMeta.sub)}<div class="subj-grid">${cards || '<div class="empty">NCERT folders could not load yet.</div>'}</div>`;
  }

  const subj = qxNcertFindSubject(subjects, p.subject);
  if (!subj) return viewNcertMarks({ step: "subjects", ...kindPay }, kind);

  if ((!subj.chapters || !subj.chapters.length) && localMod) {
    const loc = qxNcertFindSubject(localMod.subjects, p.subject);
    if (loc) subj.chapters = qxNormalizeChapterRows(loc.chapters);
  }

  if (p.step === "chapters" || !p.chapter) {
    _lastListFn = () => ({ step: "chapters", subject: p.subject, subjectId: subj.id, ...kindPay });
    const bc = breadcrumb([
      { label: title, view: "ncert", payload: { step: "subjects", ...kindPay } },
      { label: p.subject }
    ]);
    const cards = (subj.chapters || []).map((c, idx) => {
      const g = ["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7"][idx % 8];
      return `<button type="button" class="qx-topic-card qx-topic-rich qx-topic-${g} ch-card qx-ch-card-rich" ${mg("ncert", { step: "chapterHub", subject: p.subject, subjectId: subj.id, chapter: c.name, chapterId: c.id, ...kindPay })}>
        <div class="qx-topic-top">
          <span class="qx-topic-ic" aria-hidden="true">${cpyqbChapterIcon(null, p.subject, c.name)}</span>
        </div>
        <strong class="qx-topic-name">${c.name}</strong>
        <div class="qx-topic-details"><span class="qx-ch-pill qs">Open folder</span></div>
      </button>`;
    }).join("");
    return `${topbar(p.subject, title)}${bc}<div class="ch-grid qx-topic-grid qx-topic-grid-rich">${cards || '<div class="empty">No NCERT chapters in this subject.</div>'}</div>`;
  }

  const ch = qxNcertFindChapter(subj.chapters, p.chapter);
  const subjectId = p.subjectId || subj.id;
  const chapterId = p.chapterId || (ch && ch.id);
  const basePay = { subject: p.subject, subjectId, chapter: p.chapter, chapterId, ...kindPay };

  if (p.step === "chapterHub" || p.step === "sets" || (p.step !== "questions" && !p.ncertSetId && !p.ncertPyq && !p.topicId && !p.topicTitle)) {
    const folderSets = (ch && ch.sets && ch.sets.length)
      ? ch.sets
      : [{ title: "All NCERT", count: (ch && ch.count) || 0 }];
    const bc = breadcrumb([
      { label: title, view: "ncert", payload: { step: "subjects", ...kindPay } },
      { label: p.subject, view: "ncert", payload: { step: "chapters", subject: p.subject, subjectId, ...kindPay } },
      { label: p.chapter }
    ]);
    const setCards = folderSets.map((s, idx) => {
      const g = ["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7"][idx % 8];
      const pay = { step: "questions", setTitle: s.title, ...basePay };
      return `<button type="button" class="qx-topic-card qx-topic-rich qx-topic-${g} ch-card qx-ch-card-rich" ${mg("ncert", pay)}>
        <strong class="qx-topic-name">${s.title}</strong>
        <div class="qx-topic-details"><span class="qx-ch-pill qs">${s.count || 0} Qs</span></div>
      </button>`;
    }).join("");
    const allCard = `<button type="button" class="qx-topic-card qx-topic-rich qx-topic-g0 ch-card qx-ch-card-rich" ${mg("ncert", { step: "questions", setTitle: "All NCERT", ...basePay })}>
        <strong class="qx-topic-name">All questions</strong>
        <div class="qx-topic-details"><span class="qx-ch-pill qs">Full chapter</span></div>
      </button>`;
    return `${topbar(p.chapter, p.subject + " · " + title)}${bc}
      <div class="marks-section"><h3 class="qx-ncert-set-h">NCERT Questions</h3>
        <div class="ch-grid qx-topic-grid qx-topic-grid-rich">${allCard}${setCards || ""}</div>
      </div>`;
  }

  _lastListFn = () => ({ ...p, step: "questions" });
  let qs = [];
  let filterNote = "";
  const liveMeta = {
    subject: p.subject,
    chapter: p.chapter,
    bank: "ncert",
    exam: qxFolderTrack() === "Medical" ? "Medical" : "Engineering",
    examName: title
  };

  const chRow = (subj.chapters || []).find((c) => c.name === p.chapter || qxChMatch(c.name, p.chapter));
  if (chRow && chRow.file) {
    try {
      showToast("📚 Loading NCERT questions…");
      const pack = await qxLoadNcertOfflineChapter(chRow.file);
      qs = qxNcertFilterBySet(pack.questions || [], p.setTitle || "All NCERT");
      qs = qs.map((q) => {
        const nq = Object.assign({}, q);
        nq.q = qxNcertProxyHtml(nq.q);
        nq.solution = qxNcertProxyHtml(nq.solution);
        nq.options = (nq.options || []).map(qxNcertProxyHtml);
        return nq;
      });
    } catch (e) {
      console.warn("ncert offline chapter", e);
    }
  }

  if (!qs.length) {
    filterNote = `<p class="result-count">No questions matched this NCERT folder yet.</p>`;
  }
  const modeLabel = p.setTitle || p.topicTitle || "NCERT Questions";
  const bc = breadcrumb([
    { label: title, view: "ncert", payload: { step: "subjects", ...kindPay } },
    { label: p.subject, view: "ncert", payload: { step: "chapters", subject: p.subject, subjectId, ...kindPay } },
    { label: p.chapter, view: "ncert", payload: { step: "chapterHub", ...basePay } },
    { label: modeLabel }
  ]);
  const testMeta = { title: `${p.chapter} · ${modeLabel}`, returnTo: "ncert", limit: 30 };
  return `${topbar(p.chapter, `${p.subject} · ${title}`)}${bc}${filterNote}${renderQList(qs, _listPage, testMeta)}`;
}

async function viewNcert(payload) {
  const kind = (payload && payload.ncertKind) || "lblq";
  if (payload && payload.step === "kinds") {
    return qxNcertKindsHtml();
  }
  return viewNcertMarks(payload, kind);
}

async function viewSubjectBank(payload, moduleId) {
  try {
    const locked = typeof qxAccessBlock === "function" ? qxAccessBlock(moduleId || "allqs", payload || {}) : "";
    if (locked) return locked;
  } catch (_) { /* */ }
  if (qxFolderTrack() === "Medical") return viewNeetModuleBank(payload, moduleId);
  if (moduleId === "ncert") return viewNcert(payload);
  const p = { ..._bankPayload, module: moduleId, ...(payload || {}) };
  _bankPayload = p;
  const track = qxFolderTrack();
  const slug = qxPrimaryBankSlug(track);
  const title = "All Question Bank";
  const subtitle = "Chapter-wise questions by subject";

  // NDA dashboard used to list English / GS as top-level subjects (wrong Class-9 chapters)
  if (track === "Defence" && p.subject && /^(English|General Science|General Studies)$/i.test(p.subject)) {
    if (!p.chapter) {
      p.chapter = p.subject;
      p.step = "questions";
    }
    p.subject = "General Ability";
  }

  const exam = await qxResolveCpyqbExam(slug);
  const subjects = qxSubjectsForAllQs(exam, track);

  if (p.step === "subjects" || !p.subject) {
    _lastListFn = () => ({ module: moduleId, step: "subjects" });
    const cards = subjects.map(s => `
      <div class="subj-card" ${mg(moduleId, { step: "chapters", subject: s.name })}>
        <span class="subj-ic">${subjectIcon(s.name)}</span>
        <div><strong>${s.name}</strong><small>${(s.chapters || []).length} chapters${s.count ? ` · ${Number(s.count).toLocaleString()} qs` : ""}</small></div>
      </div>`).join("");
    return `${topbar(title, subtitle)}<div class="subj-grid">${cards || '<div class="empty">No subjects for this track yet.</div>'}</div>`;
  }

  const subj = subjects.find(s => s.name === p.subject || qxChMatch(s.name, p.subject));
  let chapters = qxNormalizeChapterRows(subj && subj.chapters);
  if (!chapters.length && typeof CHAPTERS !== "undefined" && CHAPTERS[p.subject]) {
    chapters = qxNormalizeChapterRows(CHAPTERS[p.subject]);
  }
  if (p.step === "chapters" || !p.chapter) {
    _lastListFn = () => ({ module: moduleId, step: "chapters", subject: p.subject });
    const bc = breadcrumb([{ label: title, view: moduleId, payload: { step: "subjects" } }, { label: p.subject }]);
    const cards = chapters.map((c, idx) => {
      const prog = typeof QxCardIcons !== "undefined"
        ? QxCardIcons.chapterProgressStats(slug, p.subject, c.name, c.count || 0)
        : { solved: 0, total: c.count || 0 };
      const g = ["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7"][idx % 8];
      return `<button type="button" class="qx-topic-card qx-topic-rich qx-topic-${g} ch-card qx-ch-card-rich" ${mg(moduleId, { step: "questions", subject: p.subject, chapter: c.name })}>
        <div class="qx-topic-top">
          <span class="qx-topic-ic" aria-hidden="true">${cpyqbChapterIcon(null, p.subject, c.name)}</span>
        </div>
        <strong class="qx-topic-name">${c.name}</strong>
        <div class="qx-topic-details">
          <span class="qx-ch-pill qs">${prog.solved}/${prog.total || c.count || 0} Qs</span>
        </div>
        ${qxProgressBar(prog.solved, prog.total || c.count || 0)}
      </button>`;
    }).join("");
    return `${topbar(p.subject, title)}${bc}<div class="ch-grid qx-topic-grid qx-topic-grid-rich">${cards || '<div class="empty">No chapters in this subject yet.</div>'}</div>`;
  }

  showToast("📚 Loading questions…");
  let qs = [];
  if (typeof ensureCpyqbChapterQuestions === "function") {
    qs = await ensureCpyqbChapterQuestions(slug, p.subject, p.chapter, null, { mode: "all" });
  }
  if (!qs.length) {
    if (typeof loadSingleBank === "function") {
      await loadSingleBank(slug, { allowLarge: true });
    }
    qs = qxFilterQsChapter(
      (typeof QUESTIONS !== "undefined" ? QUESTIONS : []).filter(q => q && q._bank === slug),
      p.subject,
      p.chapter
    );
  }
  _lastListFn = () => ({ module: moduleId, step: "questions", subject: p.subject, chapter: p.chapter });
  const bc = breadcrumb([
    { label: title, view: moduleId, payload: { step: "subjects" } },
    { label: p.subject, view: moduleId, payload: { step: "chapters", subject: p.subject } },
    { label: p.chapter }
  ]);
  const testMeta = { title: `${p.chapter} · Chapter Test`, returnTo: moduleId, limit: 30 };
  return `${topbar(p.chapter, `${p.subject} · ${title}`)}${bc}${qs.length ? renderQList(qs, _listPage, testMeta) : '<div class="empty">No questions in this chapter yet.</div>'}`;
}

function viewAllQs(p) { return viewSubjectBank(p, "allqs"); }

function qxFcNorm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(of|the|and|a|an)\b/g, " ")
    .replace(/s\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function qxFcTopicMatch(a, b) {
  const x = qxFcNorm(a);
  const y = qxFcNorm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.startsWith(y) || y.startsWith(x)) return true;
  const xs = x.split(" ").filter(Boolean);
  const ys = y.split(" ").filter(Boolean);
  const smaller = xs.length <= ys.length ? xs : ys;
  const larger = xs.length <= ys.length ? ys : xs;
  return smaller.length >= 2 && smaller.every((w) => larger.includes(w));
}

function qxEnsureFormulaCardSkin() {
  if (!document.getElementById("qxFcCardCss")) {
    const link = document.createElement("link");
    link.id = "qxFcCardCss";
    link.rel = "stylesheet";
    link.href = "assets/qx-formula-cards.css?v=qxfix110";
    document.head.appendChild(link);
  }
  if (!document.getElementById("qxFcCardJs")) {
    const s = document.createElement("script");
    s.id = "qxFcCardJs";
    s.src = "assets/qx-formula-cards.js?v=qxfix110";
    document.head.appendChild(s);
  }
  setTimeout(function () {
    try { if (window.QxFormulaCards) window.QxFormulaCards.enhance(); } catch (_) { /* */ }
  }, 60);
}

function qxFormulaMarkup(html) {
  let s = String(html || "");
  function fcUrl(u) {
    if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc) {
      const d = QxOwnedFigs.displaySrc(u);
      if (d) return d;
    }
    return "/api/proxy-image?clean=1&fc=1&v=qxfig110&url=" + encodeURIComponent(u);
  }
  // Always route formula art through fc=1 wipe (tiled MARKS → white, colour stays)
  s = s.replace(/https?:\/\/(?:cdn-assets\.)?getmarks\.app\/[^"'>\s]+/gi, fcUrl);
  s = s.replace(/\/\/cdn-assets\.getmarks\.app\/[^"'>\s]+/gi, (u) => fcUrl("https:" + u));
  s = s.replace(/https?:\/\/firebasestorage\.googleapis\.com\/[^"'>\s]+/gi, (u) => {
    if (!/formula_cards|revision_flash_cards|another_formula_card/i.test(u)) return u;
    return fcUrl(u);
  });
  s = s.replace(/<img\b([^>]*)>/gi, (full, attrs) => {
    let a = String(attrs || "");
    if (!/\bclass=/i.test(a)) a += ' class="fc-img qx-fc-img"';
    else if (!/fc-img/i.test(a)) {
      a = a.replace(/\bclass=(["'])([^"']*)\1/i, (m, q, c) => `class=${q}${c} fc-img qx-fc-img${q}`);
    }
    if (!/\breferrerpolicy=/i.test(a)) a += ' referrerpolicy="no-referrer"';
    if (!/\bloading=/i.test(a)) a += ' loading="eager"';
    a = a.replace(/\bonerror="[^"]*"/gi, "");
    if (!/\bdata-qx-orig-src=/i.test(a)) {
      const sm = a.match(/\bsrc=(["'])([^"']+)\1/i);
      let stored = sm ? sm[2] : "";
      try {
        if (/proxy-image/i.test(stored)) {
          stored = new URL(stored, "https://www.quantrexacademy.com").searchParams.get("url") || stored;
        }
      } catch (_) { /* */ }
      if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.ownedFigureUrl) {
        stored = QxOwnedFigs.ownedFigureUrl(stored) || stored;
      }
      if (stored) {
        const safe = String(stored).replace(/"/g, "&quot;");
        a += ` data-qx-orig-src="${safe}" data-qx-storage-src="${safe}"`;
      }
    }
    a += ' onerror="if(window.QxOwnedFigs&&QxOwnedFigs.retryOnError)QxOwnedFigs.retryOnError(this)"';
    return `<figure class="qx-fc-page"><img${a}><span class="qx-fc-seal" aria-hidden="true"></span></figure>`;
  });
  return s;
}

function qxHcvModuleMeta(title) {
  const t = String(title || "");
  if (/objective\s*ii/i.test(t)) return { order: 2, hint: "Trickier MCQs · same chapter as the book" };
  if (/objective\s*i\b/i.test(t)) return { order: 1, hint: "Single-correct MCQs · Objective I" };
  if (/exercise/i.test(t)) return { order: 3, hint: "Exercises · numericals as in HC Verma" };
  return { order: 9, hint: "" };
}

function qxMergeFormulaNav(nav) {
  const list = Array.isArray(nav)
    ? nav.map((s) => Object.assign({}, s, { chapters: ((s && s.chapters) || []).slice() }))
    : [];
  const by = {};
  list.forEach((s) => { by[String(s.name || "").toLowerCase()] = s; });
  (typeof FORMULAS !== "undefined" ? FORMULAS : []).forEach((f) => {
    const sn = f.subject || "General";
    const cn = f.chapter || "Formulas";
    let s = by[sn.toLowerCase()];
    if (!s) {
      s = { name: sn, count: 0, chapters: [] };
      list.push(s);
      by[sn.toLowerCase()] = s;
    }
    let ch = (s.chapters || []).find((c) => c.name === cn || qxFcTopicMatch(c.name, cn));
    if (!ch) {
      ch = { name: cn, count: 0, topics: [] };
      s.chapters.push(ch);
    }
    s.count = (Number(s.count) || 0) + 1;
    ch.count = (Number(ch.count) || 0) + 1;
    if (f.topic && !(ch.topics || []).some((t) => t.title === f.topic)) {
      if (!ch.topics) ch.topics = [];
      ch.topics.push({ title: f.topic, count: 1 });
    }
  });
  return list;
}

function qxFormulaNavForExam(nav) {
  const list = qxMergeFormulaNav(nav);
  if (STATE.exam !== "Medical") {
    const keep = list.filter((s) => /physics|chemistry|math/i.test(s.name || ""));
    return keep.length ? keep : list;
  }
  const out = list.filter((s) => /physics|chemistry/i.test(s.name || ""));
  const have = new Set(out.map((s) => String(s.name || "").toLowerCase()));
  (window._qxMedBioFormulaNav || []).forEach((s) => {
    if (s && s.name && !have.has(String(s.name).toLowerCase())) out.push(s);
  });
  return out.length ? out : list;
}

window.qxFcOpenSubject = function (name) {
  if (typeof go === "function") go("formula", { step: "chapters", subject: String(name || "") });
};
window.qxFcOpenChapter = function (subject, chapter) {
  if (typeof go === "function") go("formula", { step: "cards", subject: String(subject || ""), chapter: String(chapter || "") });
};

function qxBioFormulaCards(subject, chapter, ch) {
  const topics = (ch && ch.topics) || [];
  const rows = topics.length ? topics : [{ title: chapter, count: 1 }];
  return rows.map((t, i) => ({
    id: `biofc_${subject}_${chapter}_${i}`,
    subject,
    chapter,
    topic: t.title || t.name || chapter,
    formula: `<div class="qx-bio-fc">
      <span class="qx-bio-fc-sub">${subject}</span>
      <strong>${t.title || chapter}</strong>
      <small>${chapter}</small>
      <p>NCERT memory card · open Line-by-Line or All Qs to practise this topic.</p>
    </div>`,
    meaning: ""
  }));
}

async function qxEnsureMedicalFormulaNav(baseNav) {
  const pcm = qxFormulaNavForExam(baseNav);
  if (window._qxMedBioFormulaNav && window._qxMedBioFormulaNav.length) {
    return qxFormulaNavForExam(baseNav);
  }
  const extra = [];
  try {
    const mod = typeof fetchModuleNav === "function" ? await fetchModuleNav("neet_ncert") : null;
    const colors = ["#37B24D", "#2F86FF", "#E6640E", "#8450CB", "#FC275A", "#0d9488"];
    ["Botany", "Zoology"].forEach((name) => {
      const subj = ((mod && mod.subjects) || []).find((s) => s.name === name);
      if (!subj) return;
      extra.push({
        name,
        count: (subj.chapters || []).reduce((n, c) => n + ((c.topics && c.topics.length) || 1), 0),
        chapters: (subj.chapters || []).map((c, i) => ({
          name: c.name,
          count: (c.topics && c.topics.length) || 1,
          color: colors[i % colors.length],
          topics: c.topics || [],
          source: "ncert-bio"
        }))
      });
    });
  } catch (_) { /* keep PCM */ }
  window._qxMedBioFormulaNav = extra;
  return qxFormulaNavForExam(baseNav);
}

function qxFcTone(name) {
  const n = String(name || "");
  if (/phys/i.test(n)) return "phy";
  if (/chem/i.test(n)) return "chem";
  if (/math/i.test(n)) return "math";
  if (/bot/i.test(n)) return "bot";
  if (/zoo/i.test(n)) return "zoo";
  if (/bio/i.test(n)) return "bot";
  return "gen";
}

function renderFormulaChapterTiles(chapters, subject, limit) {
  const colors = ["#2F86FF", "#37B24D", "#FC275A", "#8450CB", "#E6640E", "#0d9488", "#db2777", "#2563eb"];
  const tone = qxFcTone(subject);
  const slice = (chapters || []).slice(0, limit || 8);
  return `<div class="qx-fc-tile-grid">${slice.map((c, i) => {
    const col = c.color || colors[i % colors.length];
    const subJs = String(subject || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const chJs = String(c.name || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    return `<button type="button" class="qx-fc-tile qx-fc-tile-${tone}" style="--fc-c:${col}" ${mg("formula", { step: (c.topics && c.topics.length) ? "topics" : "cards", subject, chapter: c.name })}>
      ${cpyqbChapterIcon(null, subject, c.name)}
      <strong>${c.name}</strong>
      <small>${c.count || 0} cards</small>
    </button>`;
  }).join("")}</div>`;
}

function qxRevisionBuckets() {
  const solved = (STATE && STATE.solved) || [];
  const bookmarks = (STATE && STATE.bookmarks) || [];
  const oops = solved.filter((s) => s && s.correct === false);
  const memory = solved.filter((s) => s && s.correct === true);
  const blur = solved.filter((s) => s && (Number(s.ms) > 60000 || (s.correct === true && bookmarks.includes(s.id))));
  return { oops, blur, memory, solved };
}

function qxRevisionFilter(list, subject) {
  if (!subject) return list;
  return list.filter((s) => {
    if (s.subject && s.subject === subject) return true;
    if (subject === "Biology" && /botany|zoology|biology/i.test(s.subject || "")) return true;
    return !s.subject;
  });
}

async function viewRevisionMarks(payload) {
  const p = payload || {};
  const isMed = STATE.exam === "Medical";
  const subjects = isMed
    ? ["Physics", "Chemistry", "Botany", "Zoology"]
    : ((EXAMS[STATE.exam] && EXAMS[STATE.exam].subjects) || ["Physics", "Chemistry", "Mathematics"]);
  const tones = {
    Physics: { ic: "⚛️", c: "#2563eb" },
    Chemistry: { ic: "🧪", c: "#ea580c" },
    Botany: { ic: "🌿", c: "#16a34a" },
    Zoology: { ic: "🐾", c: "#ca8a04" },
    Mathematics: { ic: "📐", c: "#7c3aed" },
    Biology: { ic: "🧬", c: "#059669" }
  };
  const buckets = qxRevisionBuckets();

  if (!p.subject && p.step !== "zones") {
    const cards = subjects.map((name) => {
      const st = tones[name] || { ic: "📘", c: "#475569" };
      const n = qxRevisionFilter(buckets.solved, name).length;
      return `<button type="button" class="qx-rev-subj" style="--rev-c:${st.c}" ${mg("revision", { step: "zones", subject: name })}>
        <span class="qx-rev-subj-ic">${subjectIcon(name, null, 32)}</span>
        <strong>${name}</strong>
        <small>${n} practiced Qs</small>
        <span class="qx-rev-arr">›</span>
      </button>`;
    }).join("");
    return `${topbar(QX_UX.review, "Structured review of your own attempts")}
      <div class="qx-rev-page">
        <p class="sec-desc">${QX_UX.review} · ${isMed ? "Physics · Chemistry · Botany · Zoology" : subjects.join(" · ")}</p>
        <div class="qx-rev-subj-col">${cards}</div>
      </div>`;
  }

  const subject = p.subject || subjects[0];
  const oops = qxRevisionFilter(buckets.oops, subject);
  const blur = qxRevisionFilter(buckets.blur, subject);
  const memory = qxRevisionFilter(buckets.memory, subject);
  const zone = p.zone;

  if (!zone) {
    const bc = breadcrumb([
      { label: "Revision", view: "revision", payload: { step: "subjects" } },
      { label: subject }
    ]);
    const zFault = qxUxZoneMeta("oops");
    const zDrift = qxUxZoneMeta("blur");
    const zCore = qxUxZoneMeta("core");
    return `${topbar(subject, QX_UX.review)}${bc}
      <div class="qx-rev-zones">
        <button type="button" class="qx-med-rev-card oops" ${mg("revision", { step: "questions", subject, zone: "oops" })}>
          ${qxRoboWrap(typeof QxCardIcons !== "undefined" ? QxCardIcons.chapterIconHtml("target", "Physics") : "!", "fault", "md")}
          <strong>${zFault.title}</strong>
          <small>${zFault.sub} · ${oops.length} Qs</small>
        </button>
        <button type="button" class="qx-med-rev-card blur" ${mg("revision", { step: "questions", subject, zone: "blur" })}>
          ${qxRoboWrap(typeof QxCardIcons !== "undefined" ? QxCardIcons.chapterIconHtml("gauge", "Mathematics") : "~", "drift", "md")}
          <strong>${zDrift.title}</strong>
          <small>${zDrift.sub} · ${blur.length} Qs</small>
        </button>
        <button type="button" class="qx-med-rev-card mem" ${mg("revision", { step: "questions", subject, zone: "memory" })}>
          ${qxRoboWrap(typeof QxCardIcons !== "undefined" ? QxCardIcons.chapterIconHtml("brain", "Biology") : "*", "vault", "md")}
          <strong>${zCore.title}</strong>
          <small>${zCore.sub} · ${memory.length} Qs</small>
        </button>
      </div>`;
  }

  const pick = zone === "oops" ? oops : zone === "blur" ? blur : memory;
  const title = qxUxZoneMeta(zone).title;
  const ids = new Set(pick.map((s) => String(s.id)));
  let qs = [];
  if (ids.size) {
    const slug = isMed ? "neet" : ((typeof PRIMARY_BANK !== "undefined" && PRIMARY_BANK[STATE.exam]) || "jee_main");
    try {
      if (typeof loadSingleBank === "function") await loadSingleBank(slug, { allowLarge: true });
    } catch (_) { /* */ }
    qs = (typeof QUESTIONS !== "undefined" ? QUESTIONS : []).filter((q) => ids.has(String(q.id)));
    if (subject) qs = qs.filter((q) => !q.subject || q.subject === subject || (subject === "Biology" && /botany|zoology/i.test(q.subject || "")));
  }
  const bc = breadcrumb([
    { label: "Revision", view: "revision", payload: { step: "subjects" } },
    { label: subject, view: "revision", payload: { step: "zones", subject } },
    { label: title }
  ]);
  if (!qs.length) {
    return `${topbar(title, subject)}${bc}
      <div class="empty">No items in ${title} yet. Practice Complete Bank — misses go to ${QX_UX.fault}, slow answers to ${QX_UX.drift}, secured ones to ${QX_UX.core}.</div>
      <button type="button" class="btn-primary" ${mg("allqs", { step: "chapters", subject })}>Practice ${subject} →</button>`;
  }
  const testMeta = { title: `${subject} · ${title}`, returnTo: "revision", limit: 30 };
  return `${topbar(title, subject + " · " + qs.length + " Qs")}${bc}${renderQList(qs, 0, testMeta)}`;
}

// ============ DPP (MARKS: Subject → Chapter → Sets) ============
function qxDppMeta(set) {
  const blob = [set && set.level, set && set.title, set && set.fullTitle].filter(Boolean).join(" ");
  const n = (String(blob).match(/(?:DPP|Pack|Sheet)\s*(\d+)/i) || String(blob).match(/(\d+)\s*$/) || [])[1] || "1";
  const lv = blob.toLowerCase();
  if (/easy|starter|warm/.test(lv)) {
    return { badge: "Starter", title: "Starter Pack " + n, tone: "easy", level: "Easy" };
  }
  if (/mod|medium|core|standard/.test(lv)) {
    return { badge: "Core", title: "Core Pack " + n, tone: "moderate", level: "Moderate" };
  }
  if (/tough|hard|chall|adv/.test(lv)) {
    return { badge: "Challenge", title: "Challenge Pack " + n, tone: "tough", level: "Tough" };
  }
  return { badge: "Pack", title: "Drill Pack " + n, tone: "easy", level: "Easy" };
}

function qxDppSessionTitle(subject, chapter, setOrTitle) {
  const meta = typeof setOrTitle === "string"
    ? qxDppMeta({ title: setOrTitle })
    : qxDppMeta(setOrTitle || {});
  return [subject, chapter, meta.title].filter(Boolean).join(" · ");
}

let _dppPayload = { step: "subjects" };

async function qxEnsureMedicalDppNav(nav) {
  const pcm = (nav || []).filter((s) => /physics|chemistry/i.test(s.name || ""));
  const extra = [];
  try {
    const mod = typeof fetchModuleNav === "function" ? await fetchModuleNav("neet_allqs") : null;
    const subjects = (mod && mod.subjects) || [];
    ["Botany", "Zoology"].forEach((name) => {
      const subj = subjects.find((s) => s.name === name);
      if (!subj) return;
      extra.push({
        name,
        count: (subj.chapters || []).length,
        chapters: (subj.chapters || []).map((c) => ({
          name: c.name,
          count: 6,
          sets: ["Easy", "Easy", "Moderate", "Moderate", "Tough", "Tough"].map((level, i) => ({
            id: `mdpp__${encodeURIComponent(name)}__${encodeURIComponent(c.name)}__${level}__${(i % 2) + 1}`,
            title: qxDppMeta({ level: level, title: level + " " + ((i % 2) + 1) }).title,
            count: 10,
            level
          }))
        }))
      });
    });
  } catch (_) { /* keep PCM */ }
  return pcm.concat(extra);
}

async function viewDppMarks(payload) {
  try {
    const locked = typeof qxAccessBlock === "function" ? qxAccessBlock("dpp", payload || {}) : "";
    if (locked) return locked;
  } catch (_) { /* */ }
  const p = { ..._dppPayload, ...(payload || {}) };
  _dppPayload = p;
  let nav = await fetchNav("dpp");
  if (STATE.exam === "Medical") {
    nav = await qxEnsureMedicalDppNav(nav);
  }

  if (p.step === "subjects" || !p.subject) {
    _lastListFn = () => ({ step: "subjects" });
    const aspirants = dppLiveAspirantCount();
    const totalSets = dppTotalSets(nav);
    const cards = nav.map(s => {
      const st = dppSubjectStyle(s.name);
      const chCount = (s.chapters || []).length;
      return `<div class="dpp-subj-card tone-${st.tone}" ${mg("dpp", { step: "chapters", subject: s.name })}>
        ${subjectIcon(s.name, null, 40)}
        <div class="dpp-subj-body">
          <strong>${s.name}</strong>
          <small>${chCount} Chapter${chCount === 1 ? "" : "s"}</small>
        </div>
        <span class="dpp-subj-arr">›</span>
      </div>`;
    }).join("");
    return `<div class="dpp-marks-page">
      <div class="dpp-marks-head">
        <h1>${QX_UX.drills} <span class="qx-premium-pill">PREMIUM</span></h1>
        <p class="dpp-social-proof">Chapter DPP packs · Starter · Core · Challenge</p>
      </div>
      <div class="dpp-promo-banner">
        <span class="dpp-promo-ic">›</span>
        <span><b>${totalSets}+</b> chapter DPP packs, sorted Starter · Core · Challenge</span>
      </div>
      <div class="dpp-subj-row">${cards || '<div class="empty">No DPP packs yet.</div>'}</div>
    </div>`;
  }

  const subj = nav.find(s => s.name === p.subject);
  if (!subj) return viewDppMarks({ step: "subjects" });

  if (p.step === "chapters" || !p.chapter) {
    _lastListFn = () => ({ step: "chapters", subject: p.subject });
    const bc = breadcrumb([
      { label: QX_UX.drillsNav, view: "dpp", payload: { step: "subjects" } },
      { label: p.subject }
    ]);
    const cards = subj.chapters.map((c, idx) => {
      const g = ["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7"][idx % 8];
      return `<button type="button" class="qx-topic-card qx-topic-rich qx-topic-${g} ch-card qx-ch-card-rich" ${mg("dpp", { step: "sets", subject: p.subject, chapter: c.name })}>
        <div class="qx-topic-top">
          <span class="qx-topic-ic" aria-hidden="true">${cpyqbChapterIcon(null, p.subject, c.name)}</span>
        </div>
        <strong class="qx-topic-name">${c.name}</strong>
        <div class="qx-topic-details">
          <span class="qx-ch-pill qs">${c.count || 0} sets</span>
        </div>
        ${qxProgressBar(0, c.count || 0)}
      </button>`;
    }).join("");
    return `${topbar(p.subject, "Select a chapter")}${bc}<div class="ch-grid qx-topic-grid qx-topic-grid-rich">${cards}</div>`;
  }

  const ch = subj.chapters.find(c => c.name === p.chapter);
  if (!ch) return viewDppMarks({ step: "chapters", subject: p.subject });

  if (p.step === "sets" || !p.setId) {
    _lastListFn = () => ({ step: "sets", subject: p.subject, chapter: p.chapter });
    const bc = breadcrumb([
      { label: QX_UX.drillsNav, view: "dpp", payload: { step: "subjects" } },
      { label: p.subject, view: "dpp", payload: { step: "chapters", subject: p.subject } },
      { label: p.chapter }
    ]);
    const levelOrder = { Easy: 1, Moderate: 2, Tough: 3, Other: 4 };
    const sets = [...ch.sets].sort((a, b) => (levelOrder[a.level] || 9) - (levelOrder[b.level] || 9));
    const cards = sets.map(s => {
      const meta = qxDppMeta(s);
      const n = Number(s.count) || 0;
      return `<div class="dpp-set-card level-${meta.tone}" data-dpp-start="${String(s.id || "").replace(/"/g, "")}">
        <span class="dpp-level">${meta.badge}</span>
        <strong>${meta.title}</strong>
        <small>${n} question${n === 1 ? "" : "s"}</small>
      </div>`;
    }).join("");
    return `${topbar(p.chapter, p.subject + " · " + QX_UX.drillsShort)}${bc}<div class="dpp-sets-grid">${cards}</div>`;
  }
  return viewDppMarks({ step: "subjects" });
}

async function startDppSet(dppId) {
  if (String(dppId).startsWith("mdpp__")) {
    const parts = String(dppId).split("__");
    const subject = decodeURIComponent(parts[1] || "");
    const chapter = decodeURIComponent(parts[2] || "");
    const level = parts[3] || "Easy";
    const n = parseInt(parts[4] || "1", 10) || 1;
    try {
      if (typeof loadSingleBank === "function") await loadSingleBank("neet", { allowLarge: true });
    } catch (_) { /* */ }
    let qs = (typeof QUESTIONS !== "undefined" ? QUESTIONS : []).filter((q) =>
      q._bank === "neet" && q.subject === subject && q.chapter === chapter
    );
    const lv = String(level).toLowerCase();
    const easy = qs.filter((q) => /easy/i.test(q.difficulty || ""));
    const hard = qs.filter((q) => /hard|tough/i.test(q.difficulty || ""));
    const mid = qs.filter((q) => /mod|medium/i.test(q.difficulty || ""));
    if (lv === "easy" && easy.length >= 8) qs = easy;
    else if (lv === "tough" && hard.length >= 8) qs = hard;
    else if (lv === "moderate" && mid.length >= 8) qs = mid;
    qs = qs.slice((n - 1) * 10, n * 10);
    if (!qs.length) {
      showToast("⚠️ This DPP pack is empty — try another chapter");
      return;
    }
    const mins = Math.max(10, Math.ceil(qs.length * 1.5));
    startTest(qs, qxDppSessionTitle(subject, chapter, { level: level, title: String(n) }), "dpp", {
      testType: "dpp",
      timed: true,
      durationSec: mins * 60,
      modeLabel: `DPP · ${mins} min`,
      marksMode: true,
      uiMode: "examgoal",
      skipInstructions: true
    });
    return;
  }
  try {
    if (!_dppLoaded) {
      if (typeof showToast === "function") showToast("📚 Loading DPP…");
      await Promise.race([
        loadDppBank(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("dpp timeout")), 25000))
      ]);
    }
  } catch (e) {
    if (typeof showToast === "function") showToast("⚠️ DPP bank is slow — tap the pack again");
    return;
  }
  const dpp = DPPS.find(d => d.id === dppId);
  if (!dpp) { showToast("⚠️ DPP pack not found"); return; }
  const ids = (dpp.questions || []).map(String);
  let qs = ids.map((id) => (typeof getQ === "function" ? getQ(id) : null)).filter(Boolean);
  if (qs.length < Math.min(5, ids.length)) {
    qs = (typeof QUESTIONS !== "undefined" ? QUESTIONS : []).filter((q) =>
      q._bank === "dpp" && (!dpp.subject || q.subject === dpp.subject) && (!dpp.chapter || q.chapter === dpp.chapter)
    ).slice(0, 10);
  }
  if (!qs.length) { showToast("⚠️ DPP questions not loaded — retry"); return; }
  const qids = qs.map((q) => q.id);
  const mins = Math.max(10, Math.ceil((qids.length || 10) * 1.5));
  startTest(qids, qxDppSessionTitle(dpp.subject, dpp.chapter, dpp), "dpp", {
    testType: "dpp",
    timed: true,
    durationSec: mins * 60,
    modeLabel: `DPP · ${mins} min`
  });
}

// ============ REVISION FLASH CARDS (Marks extract) ============
let _rfcPayload = { step: "subjects" };

function qxRfcTone(name) {
  const n = String(name || "").toLowerCase();
  if (/chem/.test(n)) return "chem";
  if (/math/.test(n)) return "math";
  if (/bot/.test(n)) return "bot";
  if (/zoo/.test(n)) return "zoo";
  return "phy";
}

function qxRfcSlug(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 80) || "x";
}

function qxRfcFileKey(subj) {
  if (subj && subj.key) return subj.key;
  const name = (subj && subj.name) || "";
  const tracks = (subj && subj.tracks) || [];
  const n = String(name).toLowerCase();
  const med = tracks.indexOf("Medical") >= 0 && tracks.indexOf("Engineering") < 0;
  if (med && n === "physics") return "physics_med";
  if (med && n === "chemistry") return "chemistry_med";
  return qxRfcSlug(name);
}

function qxRfcImg(src) {
  const u = String(src || "");
  if (!u) return "";
  if (typeof QxOwnedFigs !== "undefined" && QxOwnedFigs.displaySrc) {
    const d = QxOwnedFigs.displaySrc(u);
    if (d) return d;
  }
  if (/proxy-image/i.test(u) && /fc=1/i.test(u)) return u;
  return "/api/proxy-image?clean=1&fc=1&v=qxfig110&url=" + encodeURIComponent(u);
}

function qxEnsureRfcSkin() {
  let link = document.getElementById("qxRfcCss");
  if (!link) {
    link = document.createElement("link");
    link.id = "qxRfcCss";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = "assets/qx-rfc.css?v=qxfix75";
  if (!document.getElementById("qxRfcJs")) {
    const s = document.createElement("script");
    s.id = "qxRfcJs";
    s.src = "assets/qx-rfc.js?v=qxfix75";
    s.onload = function () { window._qxRfcReady = true; };
    document.head.appendChild(s);
  } else {
    window._qxRfcReady = true;
  }
}

function qxRfcOpenWhenReady(cards, start) {
  function tryOpen(n) {
    if (window.QxRfcCards && window.QxRfcCards.open) {
      window.QxRfcCards.open(cards, start || 0);
      return;
    }
    if (n < 20) setTimeout(function () { tryOpen(n + 1); }, 80);
  }
  qxEnsureRfcSkin();
  tryOpen(0);
}

function qxRfcTrack() {
  return (typeof qxFolderTrack === "function" ? qxFolderTrack() : (STATE && STATE.exam)) || "Engineering";
}

function qxRfcFilterNav(nav) {
  const track = qxRfcTrack();
  const list = Array.isArray(nav) ? nav : [];
  const hit = list.filter((s) => !s.tracks || s.tracks.indexOf(track) >= 0);
  return hit.length ? hit : list.filter((s) => {
    const n = String(s.name || "");
    if (track === "Medical") return /physics|chemistry|botany|zoology/i.test(n);
    return /physics|chemistry|mathematics/i.test(n);
  });
}

function qxRfcEq(name) {
  const n = String(name || "").toLowerCase();
  if (/chem/.test(n)) return "C₆H₅NO";
  if (/math/.test(n)) return "a²+b²=c²";
  if (/bot/.test(n)) return "C₆H₁₂O₆";
  if (/zoo/.test(n)) return "cell";
  return "E=mc²";
}

async function qxRfcLoadChapter(subj, chapterName) {
  const key = qxRfcFileKey(subj);
  const base = qxRfcSlug(chapterName);
  const slugs = [base];
  if (base.indexOf("_and_") >= 0) slugs.push(base.replace(/_and_/g, "_"));
  if (!/_and_/.test(base)) slugs.push(base.replace(/_(\d+)_(\d+)/g, "_$1_and_$2"));
  slugs.push(base.replace(/__+/g, "_"));
  for (let i = 0; i < slugs.length; i++) {
    const file = "data/rfc_offline/chapters/" + key + "_" + slugs[i] + ".json";
    try {
      const res = await fetch(file + "?v=qxrfc3");
      if (res.ok) return await res.json();
    } catch (_) { /* try next slug */ }
  }
  return null;
}

function qxRfcSubjectSectionHtml(nav) {
  const list = qxRfcFilterNav(nav);
  if (!list.length) return "";
  const cards = list.map((s) => {
    const tone = qxRfcTone(s.name);
    const n = Number(s.count) || 0;
    return `<button type="button" class="qx-rfc-deck qx-rfc-${tone}" ${mg("flashcards", { step: "chapters", subject: s.name, subjectId: s.id, key: qxRfcFileKey(s) })}>
      <span class="qx-rfc-face">
        <i class="qx-rfc-hole" aria-hidden="true"></i>
        <span class="qx-rfc-ic">${qxRoboWrap((typeof QxCardIcons !== "undefined" ? QxCardIcons.chapterIconHtml(s.name, s.name) : ""), s.name, "md")}</span>
        <strong>${s.name.toUpperCase()}</strong>
        <small>${n.toLocaleString()} Flash Cards</small>
        <span class="qx-rfc-eq">${qxRfcEq(s.name)}</span>
      </span>
    </button>`;
  }).join("");
  return `<div class="marks-section">
    <div class="qx-rfc-head">
      <h2>${QX_UX.flash}</h2>
      <small>${QX_UX.flashSub}</small>
      <span class="qx-rfc-new">NEW</span>
    </div>
    <div class="qx-rfc-grid">${cards}</div>
  </div>`;
}

async function viewRfcMarks(payload) {
  try {
    const locked = typeof qxAccessBlock === "function" ? qxAccessBlock("flashcards", payload || {}) : "";
    if (locked) return locked;
  } catch (_) { /* */ }
  qxEnsureRfcSkin();
  const p = { ..._rfcPayload, ...(payload || {}) };
  _rfcPayload = p;
  const nav = qxRfcFilterNav(await fetchNav("rfc"));
  const track = qxRfcTrack();

  if (p.step === "subjects" || !p.subject) {
    return `${topbar(QX_UX.flash, QX_UX.flashSub + " · " + track)}
      ${qxRfcSubjectSectionHtml(nav) || '<div class="empty">Flash cards are loading…</div>'}`;
  }

  const subj = nav.find((s) => s.name === p.subject && (!p.subjectId || s.id === p.subjectId))
    || nav.find((s) => s.name === p.subject);
  if (!subj) return viewRfcMarks({ step: "subjects" });

  if (p.step === "chapters" || !p.chapter) {
    const bc = breadcrumb([
      { label: QX_UX.flash, view: "flashcards", payload: { step: "subjects" } },
      { label: p.subject }
    ]);
    const chs = subj.chapters || [];
    const cards = chs.map((c) => {
      const ic = (typeof QxCardIcons !== "undefined" && QxCardIcons.chapterIconHtml)
        ? QxCardIcons.chapterIconHtml(c.name, p.subject, c)
        : "";
      return `<button type="button" class="qx-rfc-ch qx-rfc-ch-rich" ${mg("flashcards", { step: "cards", subject: p.subject, subjectId: subj.id, chapter: c.name, key: qxRfcFileKey(subj) })}>
        <span class="qx-rfc-ch-ic">${ic}</span>
        <strong>${c.name}</strong>
        <small>${(c.count || 0).toLocaleString()} cards</small>
      </button>`;
    }).join("");
    return `${topbar(p.subject, (subj.count || 0).toLocaleString() + " flash cards")}${bc}
      <div class="qx-rfc-ch-grid">${cards || '<div class="empty">No chapters.</div>'}</div>`;
  }

  const pack = await qxRfcLoadChapter(subj, p.chapter);
  const cards = (pack && pack.cards) || [];
  const bc = breadcrumb([
    { label: QX_UX.flash, view: "flashcards", payload: { step: "subjects" } },
    { label: p.subject, view: "flashcards", payload: { step: "chapters", subject: p.subject, subjectId: subj.id } },
    { label: p.chapter }
  ]);
  if (!cards.length) {
    return `${topbar(p.chapter, p.subject)}${bc}<div class="empty">No flash cards in this chapter.</div>`;
  }
  window._qxRfcDeck = cards;
  qxRfcOpenWhenReady(cards, 0);
  const thumbs = cards.slice(0, 24).map((c, i) =>
    `<button type="button" class="qx-rfc-ch" data-rfc-i="${i}">
      <img src="${qxRfcImg(c.src)}" alt="">
      <strong>${p.chapter}</strong>
      <small>Card ${c.n || (i + 1)}</small>
    </button>`
  ).join("");
  setTimeout(function () {
    document.querySelectorAll("[data-rfc-i]").forEach(function (el) {
      el.onclick = function () {
        const i = parseInt(el.getAttribute("data-rfc-i"), 10) || 0;
        if (window.QxRfcCards) window.QxRfcCards.open(window._qxRfcDeck || cards, i);
      };
    });
  }, 120);
  return `${topbar(p.chapter, cards.length + " cards · " + p.subject)}${bc}
    <p class="sec-desc">Tap a card to open the full revision page. Next / Prev or swipe to move.</p>
    <div class="qx-rfc-ch-grid">${thumbs}</div>`;
}

// ============ FORMULA CARDS (Subject → Chapter) ============
let _fcPayload = { step: "subjects" };

async function viewFormulaMarks(payload) {
  try {
    const locked = typeof qxAccessBlock === "function" ? qxAccessBlock("formula", payload || {}) : "";
    if (locked) return locked;
  } catch (_) { /* */ }
  qxEnsureFormulaCardSkin();
  const p = { ..._fcPayload, ...(payload || {}) };
  _fcPayload = p;
  try {
    if (typeof loadFormulas === "function") {
      await Promise.race([
        loadFormulas(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("formula timeout")), 20000))
      ]);
    }
  } catch (e) {
    console.warn("loadFormulas", e);
  }
  let nav = [];
  try {
    nav = await fetchNav("formulas");
  } catch (_) { nav = []; }
  if (STATE.exam === "Medical") nav = await qxEnsureMedicalFormulaNav(nav);
  if (!nav.length && FORMULAS && FORMULAS.length) {
    const bySub = {};
    FORMULAS.forEach((f) => {
      const sn = f.subject || "General";
      const cn = f.chapter || "Formulas";
      if (!bySub[sn]) bySub[sn] = { name: sn, count: 0, chapters: [] };
      bySub[sn].count += 1;
      let ch = bySub[sn].chapters.find((c) => c.name === cn);
      if (!ch) {
        ch = { name: cn, count: 0, topics: [] };
        bySub[sn].chapters.push(ch);
      }
      ch.count += 1;
      if (f.topic && !ch.topics.some((t) => t.title === f.topic)) {
        ch.topics.push({ title: f.topic, count: 1 });
      } else if (f.topic) {
        const t = ch.topics.find((x) => x.title === f.topic);
        if (t) t.count += 1;
      }
    });
    nav = Object.values(bySub);
  }

  if (p.step === "subjects" || !p.subject) {
    const cards = nav.map(s => {
      const tone = qxFcTone(s.name);
      return `
      <button type="button" class="subj-card qx-folder-card qx-fc-subj qx-fc-folder qx-fc-folder-${tone}" data-subj="${String(s.name || "").replace(/"/g, "&quot;")}" ${mg("formula", { step: "chapters", subject: s.name })}>
        <span class="qx-fc-tab" aria-hidden="true"></span>
        <span class="qx-fc-folder-shine" aria-hidden="true"></span>
        <span class="qx-fc-folder-art" aria-hidden="true"><i class="qx-fc-a"></i><i class="qx-fc-b"></i><i class="qx-fc-c"></i></span>
        <span class="qx-fc-folder-badge">${qxRoboWrap((typeof QxCardIcons !== "undefined" ? QxCardIcons.chapterIconHtml(s.name, s.name) : "") || subjectIcon(s.name, s.icon), s.name, "lg")}</span>
        <div class="qx-fc-folder-meta">
          <strong>${s.name}</strong>
          <small>${(s.chapters || []).length} chapters · ${s.count || 0} formulas</small>
          <em>Open subject deck</em>
        </div>
      </button>`;
    }).join("");
    const previewCh = (nav.find((s) => /physics/i.test(s.name || "")) || nav[0] || {}).chapters || [];
    const tiles = previewCh.length ? `<div class="marks-section"><h3 class="qx-fc-recent-h">Recent chapters</h3>${renderFormulaChapterTiles(previewCh, (nav.find((s) => /physics/i.test(s.name || "")) || nav[0]).name, 8)}</div>` : "";
    return `${topbar("Formula Cards", "Every important formula — chapter tiles like a card deck")}
      <div class="subj-grid qx-fc-folder-grid">${cards || '<div class="empty">Browse by subject below</div>'}</div>${tiles}`;
  }

  const subj = nav.find(s => s.name === p.subject)
    || nav.find(s => qxFcTopicMatch(s.name, p.subject));
  if (!subj) return viewFormulaMarks({ step: "subjects" });
  const ch = (subj.chapters || []).find(c => c.name === p.chapter)
    || (subj.chapters || []).find(c => qxFcTopicMatch(c.name, p.chapter));

  if (p.step === "chapters" || !p.chapter) {
    const bc = breadcrumb([
      { label: "Formulas", view: "formula", payload: { step: "subjects" } },
      { label: p.subject }
    ]);
    const tone = qxFcTone(p.subject);
    return `${topbar(p.subject, "Select a chapter")}${bc}
      <div class="qx-fc-ch-hero qx-fc-hero-${tone}">
        <span class="qx-fc-hero-glow" aria-hidden="true"></span>
        ${subjectIcon(p.subject, null, 40)}
        <div><b>${p.subject}</b><small>Subject formula deck · tap a chapter</small></div>
      </div>
      ${renderFormulaChapterTiles(subj.chapters, p.subject, 99)}`;
  }

  if (p.step === "topics" && !p.topicTitle) {
    const topics = (ch && ch.topics) || [];
    const bc = breadcrumb([
      { label: "Formulas", view: "formula", payload: { step: "subjects" } },
      { label: p.subject, view: "formula", payload: { step: "chapters", subject: p.subject } },
      { label: p.chapter }
    ]);
    const cards = topics.map(t => `
      <div class="ch-card qx-topic-card qx-ch-card-rich" ${mg("formula", { step: "cards", subject: p.subject, chapter: p.chapter, topicTitle: t.title })}>
        <div class="qx-ch-card-top">
          ${cpyqbChapterIcon(null, p.subject, t.title)}
          <div class="qx-topic-body qx-ch-body"><strong>${t.title}</strong><small>${(t.count || 0).toLocaleString()} formulas</small></div>
        </div>
      </div>`).join("");
    return `${topbar(p.chapter, "Select a topic")}${bc}<div class="ch-grid qx-topic-grid">${cards || '<div class="empty">No topics.</div>'}</div>`;
  }

  let list = (FORMULAS || []).filter(f =>
    qxFcTopicMatch(f.subject, p.subject) && qxFcTopicMatch(f.chapter, p.chapter)
  );
  if (p.topicTitle) {
    const topicHit = list.filter(f => qxFcTopicMatch(f.topic, p.topicTitle));
    list = topicHit.length ? topicHit : list;
  }
  if (!list.length && /botany|zoology|biology/i.test(p.subject || "")) {
    list = qxBioFormulaCards(p.subject, p.chapter, ch);
    if (p.topicTitle) list = list.filter(f => f.topic === p.topicTitle);
  }
  const bc = breadcrumb([
    { label: "Formulas", view: "formula", payload: { step: "subjects" } },
    { label: p.subject, view: "formula", payload: { step: "chapters", subject: p.subject } },
    { label: p.chapter, view: "formula", payload: { step: (ch && ch.topics && ch.topics.length) ? "topics" : "cards", subject: p.subject, chapter: p.chapter } },
    ...(p.topicTitle ? [{ label: p.topicTitle }] : [])
  ]);
  if (!list.length) {
    return `${topbar(p.chapter, p.subject)}${bc}<div class="empty">No formula cards in this ${p.topicTitle ? "topic" : "chapter"} yet.
      <button type="button" class="btn-soft" ${mg("formula", { step: "chapters", subject: p.subject })}>Back to chapters</button></div>`;
  }
  const sheetTone = qxFcTone(p.subject);
  try {
    window._qxFcDeck = list.map((f) => {
      const body = qxFormulaMarkup(f.formula);
      const m = String(body || "").match(/src=["']([^"']+)["']/i);
      return {
        topic: f.topic || p.subject || "Formula",
        meaning: f.meaning || "",
        html: body,
        src: m ? m[1] : ""
      };
    });
  } catch (_) { window._qxFcDeck = []; }
  const cards = list.map((f, i) => {
    const bm = STATE.bookmarks.includes("f" + f.id);
    const body = qxFormulaMarkup(f.formula);
    const htmlBody = /<img\b|formula_cards|qx-fc-page/i.test(body)
      ? body
      : (typeof Mx !== "undefined" && Mx.html ? Mx.html(body) : body);
    return `<div class="fc-card qx-fc-designed qx-fc-sheet qx-fc-sheet-${sheetTone}" data-fc-i="${i}">
      <div class="fc-head"><span class="tag qx-fc-chip">${f.topic || p.subject || ""}</span>
        <button class="bm-btn ${bm ? "on" : ""}" onclick="event.stopPropagation();toggleFcBm('${String(f.id).replace(/'/g, "")}')">${bm ? "🔖" : "🤍"}</button></div>
      <div class="fc-formula qx-content">${htmlBody}</div>
      <p class="fc-meaning">${f.meaning || ""}</p>
    </div>`;
  }).join("");
  try {
    const chs = (subj && subj.chapters) || [];
    window._qxFcTrail = {
      subject: p.subject,
      chapters: chs.map((c) => ({ name: c.name })),
      chapterIdx: Math.max(0, chs.findIndex((c) => c.name === p.chapter || qxFcTopicMatch(c.name, p.chapter)))
    };
  } catch (_) { window._qxFcTrail = null; }
  qxEnsureFormulaCardSkin();
  return `${topbar(p.chapter, p.subject + " · " + list.length + " cards")}${bc}<div class="fc-grid qx-fc-grid">${cards}</div>`;
}

// ============ QUANTREX TESTS (MARKS web exact) ============
const TEST_SERIES_META = {
  jeeboth: {
    id: "jeeboth", tone: "jeeboth", logo: "JEE MAIN<br>JEE ADV",
    title: "JEE Mains + Advanced 2027 Test Series",
    tagline: "Complete preparation for both JEE Main & Advanced",
    tests: 48, fullMocks: 12, partTests: 36, price: "₹2,999",
    features: ["Full syllabus coverage", "NTA pattern mocks", "Detailed solutions", "All India rank", "Performance analytics"]
  },
  jeemain: {
    id: "jeemain", tone: "jeemain", logo: "JEE MAIN",
    title: "JEE Main New Question Test Series 2027",
    tagline: "Quantrex Ultimate Series · New Questions Only · 458 tests",
    tests: 458, fullMocks: 30, partTests: 10, price: "Included",
    features: ["100% new questions", "Part & full tests", "Topic & chapter tests", "Scheduled releases", "NTA-style CBT"]
  },

  jeeadv: {
    id: "jeeadv", tone: "jeeadv", logo: "JEE ADV",
    title: "JEE Advanced 2027 Test Series",
    tagline: "Advanced-level papers for IIT aspirants",
    tests: 24, fullMocks: 8, partTests: 16, price: "₹1,999",
    features: ["IIT pattern papers", "Multi-correct & integer", "Advanced difficulty", "Video solutions", "Peer comparison"]
  },
  neet: {
    id: "neet", tone: "neet", logo: "NEET",
    title: "NEET 2027 Test Series",
    tagline: "India's most trusted NEET test series",
    tests: 40, fullMocks: 15, partTests: 25, price: "₹1,999",
    features: ["NCERT aligned", "Full syllabus mocks", "Biology heavy analysis", "All India rank", "Previous year trends"]
  },
  neet2: {
    id: "neet2", tone: "neet2", logo: "NEET",
    title: "NEET Part Test Series",
    tagline: "Subject & chapter-wise NEET part tests",
    tests: 60, fullMocks: 0, partTests: 60, price: "₹999",
    features: ["Physics/Chem/Bio splits", "Chapter tests", "Quick revision", "Instant results", "Bookmark mistakes"]
  },
  aiims: {
    id: "aiims", tone: "aiims", logo: "AIIMS",
    title: "AIIMS Pattern Test Series",
    tagline: "Higher difficulty medical entrance pattern",
    tests: 20, fullMocks: 8, partTests: 12, price: "₹1,499",
    features: ["Assertion-reason", "Clinical scenarios", "Advanced biology", "Timed sections", "Expert solutions"]
  },
  nda: {
    id: "nda", tone: "nda", logo: "NDA",
    title: "NDA 2027 Test Series",
    tagline: "Complete NDA written exam preparation",
    tests: 24, fullMocks: 8, partTests: 16, price: "₹999",
    features: ["Math + GAT papers", "Previous year pattern", "Time management", "Sectional analysis", "GK booster"]
  },
  nda2: {
    id: "nda2", tone: "nda2", logo: "NDA",
    title: "NDA Subject Test Series",
    tagline: "Subject-wise practice for NDA",
    tests: 36, fullMocks: 0, partTests: 36, price: "₹699",
    features: ["Mathematics drills", "English & GK", "Weekly schedule", "Instant scoring", "Progress tracking"]
  },
  gk: {
    id: "gk", tone: "gk", logo: "GK",
    title: "Defence GK Test Series",
    tagline: "General Knowledge for defence exams",
    tests: 30, fullMocks: 0, partTests: 30, price: "₹499",
    features: ["Current affairs", "History & polity", "Science GK", "Defence specific", "Daily quizzes"]
  }
};

function viewTestSeriesLegacy(payload) {
  const id = (payload && payload.id) || "jeeboth";
  const meta = TEST_SERIES_META[id] || TEST_SERIES_META.jeeboth;
  const featList = meta.features.map(f => `<li>${f}</li>`).join("");
  return `<div class="marks-tests-page marks-ts-detail">
    <button type="button" class="pyqmock-back" onclick="go('tests')">← Tests</button>
    <div class="mts-detail-hero mts-${meta.tone}">
      <div class="mts-detail-logo">${meta.logo}</div>
      <div class="mts-detail-body">
        <h1>${meta.title}</h1>
        <p>${meta.tagline}</p>
        <div class="mts-detail-stats">
          <span><strong>${meta.tests}</strong> Total Tests</span>
          ${meta.fullMocks ? `<span><strong>${meta.fullMocks}</strong> Full Mocks</span>` : ""}
          <span><strong>${meta.partTests}</strong> Part Tests</span>
        </div>
      </div>
    </div>
    <div class="mts-detail-card">
      <h3>What's Included</h3>
      <ul class="mts-feat-list">${featList}</ul>
      <div class="mts-detail-price">
        <span class="mts-price-label">Starting at</span>
        <strong>${meta.price}</strong>
      </div>
      <button type="button" class="btn-primary big" onclick="showToast('🚀 Test Series launching soon! You will be notified.')">Notify Me — Coming Soon</button>
      <p class="mts-detail-note">Full-length test series — launching on Quantrex Academy shortly.</p>
    </div>
  </div>`;
}

function marksTestSeriesCards() {
  // JEE Main 2027 — new questions only (no PYQ). Opens full series page (proper format).
  const meta = TEST_SERIES_META.jeemain;
  return `<a class="mts-card mts-jeemain" href="examgoal-test-series.html" style="text-decoration:none;color:inherit">
    <div class="mts-logo">${meta.logo}</div>
    <div class="mts-body">
      <strong>${meta.title}</strong>
      <span class="mts-details">Open series →</span>
      <small class="mts-tagline">${meta.tagline} · No PYQ</small>
    </div>
  </a>`;
}

function viewTests() {
  const hour = new Date().getHours();
  const pyqCount = 600 + (hour * 9) % 110;
  if (STATE.exam === "Medical") {
    return `<div class="marks-tests-page qx-med-tests-page">
      <div class="qx-folder-nav-actions" style="margin-bottom:12px">
        <button type="button" class="qx-nav-back" onclick="go('dashboard')">← Home</button>
      </div>
      <div class="marks-tests-head"><span class="marks-tests-shield">🛡️</span><h1>Tests</h1></div>
      <div class="marks-tests-hero qx-med-test-stack">
        <div class="mth-card" ${mg("pyqmock", { exam: "neet" })}>
          <div class="mth-body"><strong>Re-NEET Special PYQ Mock Tests</strong><small>Specially curated mocks to boost Re-NEET score</small></div>
          <span class="qx-new-pill">NEW</span>
          <span class="mth-arrow">›</span>
        </div>
        <div class="mth-card" ${mg("custom", { step: "landing", fromTests: true })}>
          <div class="mth-body"><strong>Create Your Own Test</strong><small>Custom mix · Practice (Quantrex) or timed Mock (NTA)</small></div>
          <div class="mth-sq mth-sq-blue"></div><span class="mth-arrow">›</span>
        </div>
        <div class="mth-card" ${mg("pyqmock", { step: "exams" })}>
          <div class="mth-body"><strong>PYQ Mock Tests</strong><small>${pyqCount}+ students took a PYQ Mock Test in last hour!</small></div>
          <div class="mth-sq mth-sq-pink"></div><span class="mth-arrow">›</span>
        </div>
      </div>
      <div class="marks-ts-section">
        <h3>India's Most Trusted Test Series · NTA FORMAT</h3>
        <div class="mth-card" ${mg("testseries", {})}>
          <div class="mth-body"><strong>NEET 2027 Test Series</strong><small>Full mocks · part tests · NCERT aligned</small></div>
          <span class="mth-arrow">›</span>
        </div>
      </div>
    </div>`;
  }
  return `<div class="marks-tests-page">
    <div class="qx-folder-nav-actions" style="margin-bottom:12px">
      <button type="button" class="qx-nav-back" onclick="go('dashboard')">← Home</button>
    </div>
    <div class="marks-tests-head">
      <span class="marks-tests-shield">🛡️</span>
      <h1>Tests</h1>
    </div>
    <div class="marks-tests-hero">
        <div class="mth-card" ${mg("custom", { step: "landing", fromTests: true })}>
        <div class="mth-body">
          <strong>Create Your Own Test</strong>
          <small>Custom mix · untimed Practice (Quantrex) or timed Mock (NTA)</small>
        </div>
        <div class="mth-sq mth-sq-blue"></div>
        <span class="mth-arrow">›</span>
      </div>
      <div class="mth-card" ${mg("pyqmock", { step: "exams" })}>
        <div class="mth-body">
          <strong>PYQ Mock Tests</strong>
          <small>${pyqCount}+ students took a PYQ Mock Test in last hour!</small>
        </div>
        <div class="mth-sq mth-sq-pink"></div>
        <span class="mth-arrow">›</span>
      </div>
    </div>
    <div class="marks-ts-section">
      <h3>Test Series · NTA FORMAT</h3>
      <p class="marks-ts-sub">Exact NTA CBT shell (timer, palette, Save &amp; Next). Optional Quantrex layout at start.</p>
      <div class="marks-ts-grid">${marksTestSeriesCards()}</div>
    </div>
    <div class="marks-ts-section">
      <h3>Quantrex For Teachers</h3>
      <p class="marks-ts-sub">Create Own Test, Content Library, student dashboard — teacher folder</p>
      <div class="marks-tests-hero" style="margin-bottom:28px">
        <div class="mth-card" onclick="location.hash='teacher';go('teacher')">
          <div class="mth-body"><strong>Teacher Folder</strong><small>Create Own Test · PDF/Video · weak topic retest</small></div>
          <div class="mth-sq mth-sq-pink"></div><span class="mth-arrow">›</span>
        </div>
        <div class="mth-card" onclick="location.hash='teacher/builder';go('teacher')">
          <div class="mth-body"><strong>Create Own Test (Teacher)</strong><small>Same wizard — assign custom test to your batch</small></div>
          <div class="mth-sq mth-sq-blue"></div><span class="mth-arrow">›</span>
        </div>
      </div>
    </div>
  </div>`;
}

let _pyqMockPayload = { step: "exams" };
let _pyqPaperIndex = {};
const PYQ_ATTEMPT_STORE = "quantrex_pyq_attempts_v1";
let _pyqFilters = { status: "all", year: "all" };

function pyqLoadAttempts() {
  try { return JSON.parse(localStorage.getItem(PYQ_ATTEMPT_STORE) || "{}"); }
  catch (e) { return {}; }
}

function pyqSaveAttempt(key, data) {
  const all = pyqLoadAttempts();
  // Merge; prefer newest snapshot fields
  all[key] = { ...all[key], ...data, updatedAt: Date.now() };
  try {
    localStorage.setItem(PYQ_ATTEMPT_STORE, JSON.stringify(all));
  } catch (e) {
    // Quota: drop oldest completed snapshots (keep summary scores)
    try {
      const keys = Object.keys(all).sort((a, b) => (all[a].updatedAt || 0) - (all[b].updatedAt || 0));
      for (let i = 0; i < keys.length && i < 8; i++) {
        if (all[keys[i]] && all[keys[i]].snapshot) delete all[keys[i]].snapshot;
      }
      all[key] = { ...all[key], ...data, updatedAt: Date.now() };
      localStorage.setItem(PYQ_ATTEMPT_STORE, JSON.stringify(all));
    } catch (e2) {
      console.warn("pyqSaveAttempt quota", e2);
    }
  }
}

function pyqAttemptKey(slug, source) {
  return `${slug}::${source}`;
}

function pyqAttemptStatus(slug, source) {
  const rec = pyqLoadAttempts()[pyqAttemptKey(slug, source)];
  if (!rec) return "notStarted";
  return rec.status || "notStarted";
}

function pyqGetAttempt(slug, source) {
  return pyqLoadAttempts()[pyqAttemptKey(slug, source)] || null;
}

/** Open saved Report Card + Solutions after submit (or later from paper list) */
async function pyqViewSavedAnalysis(slug, source) {
  const rec = pyqGetAttempt(slug, source);
  if (!rec || rec.status !== "completed" || !rec.snapshot) {
    if (typeof showToast === "function") {
      showToast(rec && rec.status === "completed"
        ? "⚠️ Analysis data missing for this attempt. Retake to save full solutions."
        : "⚠️ No completed attempt found.");
    }
    // Fall back to preview
    if (typeof pyqShowPreview === "function") pyqShowPreview(slug, source);
    return;
  }
  try {
    if (typeof showToast === "function") showToast("Loading paper…");
    const loaded = await qxLoadPyqPaper(slug, source);
    if (!loaded.length) {
      if (typeof showToast === "function") showToast("⚠️ Could not load this paper.");
      return;
    }
  } catch (e) {
    if (typeof showToast === "function") showToast("⚠️ Could not load question bank.");
    return;
  }
  // Prefetch a few solutions/figures for first questions
  try {
    const ids = (rec.snapshot.ids || []).slice(0, 8);
    if (typeof MarksLive !== "undefined" && MarksLive.prefetchQuestions && ids.length) {
      MarksLive.prefetchQuestions(ids).catch(() => {});
    }
  } catch (_) { /* */ }
  if (typeof QuantrexTestEngine !== "undefined" && QuantrexTestEngine.openSavedAnalysis) {
    QuantrexTestEngine.openSavedAnalysis(rec.snapshot);
  } else if (typeof showToast === "function") {
    showToast("⚠️ Analysis UI not ready — refresh page.");
  }
}
window.pyqViewSavedAnalysis = pyqViewSavedAnalysis;
window.pyqGetAttempt = pyqGetAttempt;

function pyqAvailableYears() {
  const p = _pyqMockPayload || {};
  const byYear = (_pyqPaperIndex && p.exam && _pyqPaperIndex[p.exam]) || {};
  const years = Object.keys(byYear).filter(y => /^\d{4}$/.test(y)).sort((a, b) => Number(b) - Number(a));
  return years.length ? years : ["2026", "2025", "2024", "2023"];
}

function pyqFilterModalHtml() {
  const st = _pyqFilters.status;
  const yr = _pyqFilters.year;
  const statusOpts = [
    { id: "all", label: "All" },
    { id: "attempted", label: "Attempted" },
    { id: "notCompleted", label: "Not Completed" },
    { id: "notStarted", label: "Not Started" }
  ].map(o => `<label class="marks-radio"><input type="radio" name="pyqSt" value="${o.id}" ${st === o.id ? "checked" : ""}>${o.label}</label>`).join("");
  const years = ["all"].concat(pyqAvailableYears());
  const yearOpts = years.map(y => `<label class="marks-radio"><input type="radio" name="pyqYr" value="${y}" ${String(yr) === String(y) ? "checked" : ""}>${y === "all" ? "All Years" : y}</label>`).join("");
  return `<div class="marks-modal-overlay" id="pyqFilterModal" onclick="if(event.target===this)pyqCloseFilterModal()">
    <div class="marks-modal">
      <div class="marks-modal-head">
        <h3>Apply filters</h3>
        <button type="button" class="marks-modal-clear" onclick="pyqClearFilters()">Clear All Filters</button>
      </div>
      <div class="marks-modal-body">
        <div class="marks-modal-section"><h4>Test Attempt Status</h4>${statusOpts}</div>
        <div class="marks-modal-section"><h4>Year</h4>${yearOpts}</div>
      </div>
      <div class="marks-modal-foot">
        <button type="button" class="marks-modal-cancel" onclick="pyqCloseFilterModal()">Cancel</button>
        <button type="button" class="marks-modal-apply" onclick="pyqApplyFilters()">Apply filter</button>
      </div>
    </div>
  </div>`;
}

function pyqOpenFilterModal() {
  const existing = document.getElementById("pyqFilterModal");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", pyqFilterModalHtml());
}

function pyqCloseFilterModal() {
  const el = document.getElementById("pyqFilterModal");
  if (el) el.remove();
}

function pyqClearFilters() {
  _pyqFilters = { status: "all", year: "all" };
  pyqCloseFilterModal();
  render("pyqmock", _pyqMockPayload);
}

function pyqApplyFilters() {
  const st = document.querySelector('input[name="pyqSt"]:checked');
  const yr = document.querySelector('input[name="pyqYr"]:checked');
  _pyqFilters.status = st ? st.value : "all";
  _pyqFilters.year = yr ? yr.value : "all";
  pyqCloseFilterModal();
  render("pyqmock", _pyqMockPayload);
}

function pyqMatchesFilter(slug, paper) {
  if (_pyqFilters.year !== "all" && String(paper.year) !== _pyqFilters.year) return false;
  const status = pyqAttemptStatus(slug, paper.source);
  if (_pyqFilters.status === "all") return true;
  if (_pyqFilters.status === "attempted") return status === "completed";
  if (_pyqFilters.status === "notStarted") return status === "notStarted";
  if (_pyqFilters.status === "notCompleted") return status === "inProgress";
  return true;
}

function pyqPreviewModalHtml(slug, source, paper) {
  const subLine = pyqSubjectLine(paper.subjects);
  const y = typeof qYearFromSource === "function" ? qYearFromSource(source) : (paper.year || null);
  const duration = pyqPaperDuration(paper.officialCount || paper.count, slug, y, source);
  const mins = Math.floor(duration / 60);
  const status = pyqAttemptStatus(slug, source);
  const rec = pyqGetAttempt(slug, source);
  const hasSnap = !!(rec && rec.snapshot && rec.status === "completed");
  const scoreLine = (rec && rec.status === "completed")
    ? `<p class="marks-preview-score">Last score: <strong>${rec.score != null ? rec.score : "—"}</strong>${rec.total != null ? " / " + (rec.maxScore || rec.total * 4) : ""}${rec.pct != null ? " · " + rec.pct + "%" : ""}</p>`
    : "";
  const srcEnc = encodeURIComponent(source);
  const viewAnalysisBtn = hasSnap
    ? `<button type="button" class="marks-preview-attempt" onclick="pyqClosePreview();pyqViewSavedAnalysis('${slug}', decodeURIComponent('${srcEnc}'))">📊 View Analysis →</button>`
    : "";
  const primaryBtn = status === "completed"
    ? `<button type="button" class="marks-preview-later" onclick="pyqClosePreview();startPyqPaperMock('${slug}', decodeURIComponent('${srcEnc}'), true)">Retake test now →</button>`
    : `<button type="button" class="marks-preview-attempt" onclick="pyqClosePreview();startPyqPaperMock('${slug}', decodeURIComponent('${srcEnc}'), false)">Attempt test now →</button>`;
  return `<div class="marks-modal-overlay" id="pyqPreviewModal" onclick="if(event.target===this)pyqClosePreview()">
    <div class="marks-modal marks-preview-modal">
      <div class="marks-modal-head">
        <h3>Test preview</h3>
        <button type="button" class="marks-modal-cancel" style="flex:0;padding:6px 12px" onclick="pyqClosePreview()">✕</button>
      </div>
      <div class="marks-modal-body">
        <h2 class="marks-preview-title">${pyqFullPaperTitle(source)}</h2>
        <div class="marks-preview-badges">
          <span class="marks-preview-badge exam">🎯 Full Paper</span>
          <span class="marks-preview-badge subj">${pyqSubjectNames(paper.subjects) || "Subject-wise"}</span>
          ${status === "completed" ? `<span class="marks-preview-badge exam">Completed</span>` : ""}
          ${status === "inProgress" ? `<span class="marks-preview-badge exam">In progress</span>` : ""}
        </div>
        <div class="marks-preview-stats">
          <div class="marks-preview-stat"><strong>${paper.officialCount || paper.count}</strong><small>Questions</small></div>
          <div class="marks-preview-stat"><strong>${mins} Mins</strong><small>Duration</small></div>
        </div>
        <p class="marks-preview-chapters">${subLine}</p>
        <p class="marks-preview-chapters">${pyqSubjectWiseHint(slug)}</p>
        ${scoreLine}
        ${viewAnalysisBtn}
        ${primaryBtn}
        <button type="button" class="marks-preview-later" onclick="pyqClosePreview()">Close</button>
      </div>
    </div>
  </div>`;
}

function pyqPeekAttr(exam, source, year) {
  const ex = String(exam || "").replace(/"/g, "");
  const yr = String(year || "").replace(/"/g, "");
  const src = String(source || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  return ` data-qx-peek="pyqmock" data-qx-exam="${ex}" data-qx-paper="${src}" data-qx-year="${yr}"`;
}

function qxPyqYearHint(source) {
  try {
    if (typeof _pyqMockPayload !== "undefined" && _pyqMockPayload && _pyqMockPayload.year) {
      return String(_pyqMockPayload.year);
    }
  } catch (_) { /* */ }
  try {
    if (typeof qYearFromSource === "function") return String(qYearFromSource(source) || "");
  } catch (_) { /* */ }
  return "";
}

function qxPyqBlocked(slug, source) {
  try {
    if (typeof QuantrexAccess === "undefined" || !QuantrexAccess.allow) return false;
    const gate = {
      exam: slug,
      slug: slug,
      paperId: source,
      source: source,
      year: qxPyqYearHint(source),
      step: "take"
    };
    if (QuantrexAccess.allow("pyqmock", gate)) return false;
    pyqClosePreview();
    const html = QuantrexAccess.paywallHtml("pyqmock", gate);
    if (typeof finishRender === "function") finishRender(html);
    else if (typeof showToast === "function") showToast("This paper is Premium — buy the matching course to unlock");
    return true;
  } catch (_) {
    return false;
  }
}

function pyqShowPreview(slug, source) {
  if (qxPyqBlocked(slug, source)) return;
  const byYear = _pyqPaperIndex[slug];
  if (!byYear) return;
  let paper = null;
  Object.values(byYear).forEach(list => {
    const hit = list.find(p => p.source === source);
    if (hit) paper = hit;
  });
  if (!paper) return;
  const existing = document.getElementById("pyqPreviewModal");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", pyqPreviewModalHtml(slug, source, paper));
}

function pyqClosePreview() {
  const el = document.getElementById("pyqPreviewModal");
  if (el) el.remove();
}

function pyqSearchPapers(q) {
  const s = String(q || "").toLowerCase().trim();
  document.querySelectorAll(".pyqmock-paper-card").forEach((card) => {
    const t = (card.textContent || "").toLowerCase();
    card.style.display = !s || t.indexOf(s) >= 0 ? "" : "none";
  });
}

function pyqEvalCounts(slug, source) {
  const rec = pyqGetAttempt(slug, source);
  const grades = rec && rec.snapshot && Array.isArray(rec.snapshot.grades) ? rec.snapshot.grades : [];
  let correct = 0, wrong = 0, skip = 0;
  grades.forEach((g) => {
    if (g && g.isCorrect) correct++;
    else if (g && g.isWrong) wrong++;
    else skip++;
  });
  if (!grades.length && rec && rec.correct != null) {
    correct = rec.correct || 0;
    wrong = rec.wrong || 0;
    skip = Math.max(0, (rec.total || 0) - correct - wrong);
  }
  return { correct, wrong, skip, total: grades.length || (rec && rec.total) || 0 };
}

function pyqPaperSubjects(slug, source) {
  const paper = typeof pyqFindPaperMeta === "function" ? pyqFindPaperMeta(slug, source) : null;
  const subs = paper && paper.subjects ? Object.keys(paper.subjects).filter((k) => paper.subjects[k]) : [];
  if (subs.length) return subs;
  if (String(slug).indexOf("neet") >= 0 || slug === "aiims" || slug === "jipmer") {
    return ["Physics", "Chemistry", "Biology"];
  }
  if (slug === "nda") return ["Mathematics", "English", "General Science", "General Studies"];
  return ["Physics", "Chemistry", "Mathematics"];
}

function pyqSubIcon(name) {
  const n = String(name || "").toLowerCase();
  if (/phys/.test(n)) return '<svg class="eg-chip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-60 12 12)"/></svg>';
  if (/chem/.test(n)) return '<svg class="eg-chip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3h6M10 3v6L5 20h14L14 9V3"/><path d="M8.5 14h7"/></svg>';
  if (/math/.test(n)) return '<svg class="eg-chip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 16c2-6 4-10 8-10s6 4 8 10M8 12h8"/></svg>';
  if (/bio|botany|zoo/.test(n)) return '<svg class="eg-chip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22V8M12 8C8 8 5 5 5 2c5 0 7 3 7 6zM12 8c4 0 7-3 7-6-5 0-7 3-7 6z"/></svg>';
  if (/eng/.test(n)) return '<svg class="eg-chip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/></svg>';
  return '<svg class="eg-chip-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>';
}

function pyqOpenPracticeModal(slug, source) {
  pyqOpenSessionModal(slug, source, "practice");
}
function pyqOpenTestModal(slug, source) {
  pyqOpenSessionModal(slug, source, "test");
}

function pyqOpenSessionModal(slug, source, mode) {
  if (qxPyqBlocked(slug, source)) return;
  const isPractice = mode !== "test";
  const rec = pyqGetAttempt(slug, source);
  const title = pyqFullPaperTitle(source, slug);
  const existing = document.getElementById("pyqPracticeModal");
  if (existing) existing.remove();
  const hasPrev = !!(rec && rec.status);
  const srcEnc = encodeURIComponent(source);
  const ev = pyqEvalCounts(slug, source);
  const subjects = pyqPaperSubjects(slug, source);
  const subHtml = subjects.map((s) =>
    `<button type="button" class="eg-chip on" data-sub="${s}" aria-pressed="true">
      <input type="checkbox" name="pyqSub" value="${s}" checked>
      ${pyqSubIcon(s)}
      <span class="eg-chip-lab">${s}</span>
      <span class="eg-chip-tick" aria-hidden="true">✓</span>
    </button>`
  ).join("");
  const goLabel = isPractice
    ? (hasPrev ? "Resume Practice Session" : "Start Practice Session")
    : (hasPrev ? "Resume Test" : "Start Test");
  const resumeHtml = isPractice ? `
      <h4>Continue or Restart?</h4>
      <div class="eg-resume-grid">
        <label class="eg-cfg-resume ${hasPrev ? "on" : ""}"><input type="radio" name="pyqResume" value="resume" ${hasPrev ? "checked" : ""}>
          <strong>Resume</strong><small>Keep your progress, answers</small></label>
        <label class="eg-cfg-resume"><input type="radio" name="pyqResume" value="keep">
          <strong>Don't Restore</strong><small>Keep history, start fresh session</small></label>
        <label class="eg-cfg-resume ${hasPrev ? "" : "on"}"><input type="radio" name="pyqResume" value="fresh" ${hasPrev ? "" : "checked"}>
          <strong>Start Fresh</strong><small>Clear all data &amp; begin with a clean slate</small></label>
      </div>` : `
      <h4>Start options</h4>
      <div class="eg-resume-grid">
        <label class="eg-cfg-resume ${hasPrev ? "on" : ""}"><input type="radio" name="pyqResume" value="resume" ${hasPrev ? "checked" : ""}>
          <strong>Resume</strong><small>Continue saved answers &amp; timer</small></label>
        <label class="eg-cfg-resume ${hasPrev ? "" : "on"}"><input type="radio" name="pyqResume" value="fresh" ${hasPrev ? "" : "checked"}>
          <strong>Start Fresh</strong><small>New timed attempt with selected subjects</small></label>
      </div>`;
  document.body.insertAdjacentHTML("beforeend", `<div class="marks-modal-overlay pyq-eg-overlay" id="pyqPracticeModal" onclick="if(event.target===this)pyqClosePracticeModal()">
    <div class="eg-cfg pyq-eg-modal">
      <div class="eg-cfg-h">
        <div style="flex:1">
          <h3>${title}</h3>
          <small>Configure your session · pick subjects, then start</small>
        </div>
        <span class="eg-cfg-badge${isPractice ? "" : " test"}">${isPractice ? "Practice Mode" : "Test Mode"}</span>
        <button type="button" class="marks-modal-cancel eg-cfg-x" onclick="pyqClosePracticeModal()">✕</button>
      </div>
      <div class="eg-dd-row">
        <button type="button" class="eg-dd-btn" data-pan="diff">${pyqFilterIco("diff")} Difficulty</button>
        <button type="button" class="eg-dd-btn" data-pan="eval">${pyqFilterIco("eval")} Evaluation</button>
        <button type="button" class="eg-dd-btn" data-pan="qtype">${pyqFilterIco("type")} Question Types</button>
        <button type="button" class="eg-dd-btn" data-pan="all">${pyqFilterIco("all")} All Filters</button>
      </div>
      <div class="eg-filter-pans">
        <div class="eg-filter-pan" data-pan="diff" hidden>
          <h5>Difficulty</h5>
          <label class="eg-check-row"><input type="checkbox" name="pyqDiff" value="Easy"> Easy</label>
          <label class="eg-check-row"><input type="checkbox" name="pyqDiff" value="Medium"> Medium</label>
          <label class="eg-check-row"><input type="checkbox" name="pyqDiff" value="Hard"> Hard</label>
        </div>
        <div class="eg-filter-pan" data-pan="eval" hidden>
          <h5>Evaluation</h5>
          <label class="eg-check-row"><input type="checkbox" name="pyqEval" value="correct"> Correct (${ev.correct})</label>
          <label class="eg-check-row"><input type="checkbox" name="pyqEval" value="wrong"> Wrong (${ev.wrong})</label>
          <label class="eg-check-row"><input type="checkbox" name="pyqEval" value="unattempted"> Not Attempted (${ev.skip})</label>
        </div>
        <div class="eg-filter-pan" data-pan="qtype" hidden>
          <h5>Question Types</h5>
          <label class="eg-check-row"><input type="checkbox" name="pyqType" value="mcq" checked> MCQ Single Choice</label>
          <label class="eg-check-row"><input type="checkbox" name="pyqType" value="numerical" checked> Numerical</label>
        </div>
      </div>
      <h4>${pyqFilterIco("lang")} Language Preference</h4>
      <div class="eg-lang">
        <label class="eg-chip on"><input type="radio" name="pyqLang" value="en" checked> English</label>
        <label class="eg-chip" style="opacity:.55"><input type="radio" name="pyqLang" value="hi" disabled> Hindi (coming soon)</label>
      </div>
      <h4>${pyqFilterIco("sub")} Select Subjects <span class="eg-sub-count" id="egSubCount">${subjects.length}/${subjects.length} selected</span></h4>
      <div class="eg-sub-pick">${subHtml}</div>
      ${resumeHtml}
      <button type="button" class="eg-cfg-go" onclick="pyqStartSession('${slug}', decodeURIComponent('${srcEnc}'), '${isPractice ? "practice" : "test"}')">${goLabel}</button>
    </div>
  </div>`);
  pyqBindSessionModal();
}

function pyqFilterIco(kind) {
  const icons = {
    diff: '<svg class="eg-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16l-6 8v6l-4 2v-8z"/></svg>',
    eval: '<svg class="eg-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    type: '<svg class="eg-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    all: '<svg class="eg-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
    lang: '<svg class="eg-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    sub: '<svg class="eg-btn-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/></svg>'
  };
  return icons[kind] || "";
}

function pyqBindPracticeModal() {
  pyqBindSessionModal();
}

function pyqBindSessionModal() {
  const root = document.getElementById("pyqPracticeModal");
  if (!root) return;
  const syncSubCount = () => {
    const boxes = Array.from(root.querySelectorAll('input[name="pyqSub"]'));
    const n = boxes.filter((b) => b.checked).length;
    const el = root.querySelector("#egSubCount");
    if (el) el.textContent = n + "/" + boxes.length + " selected";
    root.querySelectorAll(".eg-chip[data-sub]").forEach((chip) => {
      const inp = chip.querySelector('input[name="pyqSub"]');
      const on = !!(inp && inp.checked);
      chip.classList.toggle("on", on);
      chip.setAttribute("aria-pressed", on ? "true" : "false");
    });
  };
  root.querySelectorAll(".eg-chip[data-sub]").forEach((chip) => {
    chip.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const inp = chip.querySelector('input[name="pyqSub"]');
      if (!inp) return;
      const boxes = Array.from(root.querySelectorAll('input[name="pyqSub"]'));
      const checkedN = boxes.filter((b) => b.checked).length;
      if (inp.checked && checkedN <= 1) {
        if (typeof showToast === "function") showToast("Select at least one subject");
        return;
      }
      inp.checked = !inp.checked;
      syncSubCount();
    };
  });
  root.querySelectorAll(".eg-dd-btn[data-pan]").forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const pan = btn.getAttribute("data-pan");
      const openAll = pan === "all";
      const already = btn.classList.contains("open");
      root.querySelectorAll(".eg-dd-btn").forEach((b) => b.classList.remove("open"));
      root.querySelectorAll(".eg-filter-pan").forEach((p) => {
        if (openAll) p.hidden = already;
        else p.hidden = already || p.getAttribute("data-pan") !== pan;
      });
      if (!already) btn.classList.add("open");
    };
  });
  root.addEventListener("click", (e) => {
    const res = e.target.closest(".eg-cfg-resume");
    if (res) {
      root.querySelectorAll(".eg-cfg-resume").forEach((x) => x.classList.remove("on"));
      res.classList.add("on");
      const inp = res.querySelector("input[name=pyqResume]");
      if (inp) inp.checked = true;
    }
  });
  syncSubCount();
}

function pyqClosePracticeModal() {
  const el = document.getElementById("pyqPracticeModal");
  if (el) el.remove();
}

async function pyqStartPractice(slug, source) {
  return pyqStartSession(slug, source, "practice");
}

async function pyqStartSession(slug, source, mode) {
  const root = document.getElementById("pyqPracticeModal");
  const scope = root || document;
  const subs = Array.from(scope.querySelectorAll('input[name="pyqSub"]:checked')).map((el) => el.value);
  const types = Array.from(scope.querySelectorAll('input[name="pyqType"]:checked')).map((el) => el.value);
  const evals = Array.from(scope.querySelectorAll('input[name="pyqEval"]:checked')).map((el) => el.value);
  const diffs = Array.from(scope.querySelectorAll('input[name="pyqDiff"]:checked')).map((el) => el.value);
  const resumeEl = scope.querySelector('input[name="pyqResume"]:checked');
  const resume = resumeEl ? resumeEl.value : "fresh";
  if (!subs.length) {
    if (typeof showToast === "function") showToast("Select at least one subject");
    return;
  }
  pyqClosePracticeModal();
  const isPractice = mode !== "test";
  await startPyqPaperMock(slug, source, resume === "fresh", {
    practice: isPractice,
    subjects: subs,
    types: types.length ? types : ["mcq", "numerical"],
    evaluation: evals,
    difficulty: diffs,
    resumeMode: resume
  });
}
window.pyqSearchPapers = pyqSearchPapers;
window.pyqOpenPracticeModal = pyqOpenPracticeModal;
window.pyqOpenTestModal = pyqOpenTestModal;
window.pyqOpenSessionModal = pyqOpenSessionModal;
window.pyqClosePracticeModal = pyqClosePracticeModal;
window.pyqStartPractice = pyqStartPractice;
window.pyqStartSession = pyqStartSession;
window.pyqBindPracticeModal = pyqBindPracticeModal;
window.pyqBindSessionModal = pyqBindSessionModal;

function cpyqbSessionKeys(meta) {
  const p = Object.assign(
    {},
    (typeof _cpyqbPayload !== "undefined" ? _cpyqbPayload : {}),
    (typeof _booksPayload !== "undefined" ? _booksPayload : {}),
    meta || {}
  );
  const returnTo = p.returnTo || (typeof currentView !== "undefined" ? currentView : "cpyqb");
  return {
    exam: p.exam || p.examSlug || p.examId || p.bookId || "",
    subject: p.subject || p.subjectName || "",
    chapter: p.chapter || p.chapterName || "",
    mode: p.mode || "",
    bucketId: p.bucketId || "",
    topicId: p.topicId || "",
    topicTitle: p.topicTitle || "",
    levelId: p.levelId || "",
    bookId: p.bookId || "",
    chapterKey: p.chapterKey || "",
    returnTo: returnTo,
    title: p.title || p.chapter || p.chapterName || "Chapter"
  };
}

function cpyqbChapterSessionBar(meta, qCount) {
  const k = cpyqbSessionKeys(meta);
  if (!k.chapter || !(k.exam || k.bookId)) return "";
  if (qCount != null && qCount < 1) return "";
  const e = encodeURIComponent(k.exam || k.bookId);
  const s = encodeURIComponent(k.subject);
  const c = encodeURIComponent(k.chapter);
  const extra = encodeURIComponent(JSON.stringify({
    mode: k.mode, bucketId: k.bucketId, topicId: k.topicId, topicTitle: k.topicTitle, levelId: k.levelId,
    bookId: k.bookId, chapterKey: k.chapterKey, returnTo: k.returnTo
  }));
  return `<div class="pyqmock-eg-actions cpyqb-eg-actions">
    <button type="button" class="pyqmock-practice" onclick="cpyqbOpenSessionModal(decodeURIComponent('${e}'), decodeURIComponent('${s}'), decodeURIComponent('${c}'), 'practice', decodeURIComponent('${extra}'))">Practice</button>
    <button type="button" class="pyqmock-take" onclick="cpyqbOpenSessionModal(decodeURIComponent('${e}'), decodeURIComponent('${s}'), decodeURIComponent('${c}'), 'test', decodeURIComponent('${extra}'))">Take Test</button>
  </div>`;
}

function cpyqbEvalCountsForQs(qs) {
  const solved = ((typeof STATE !== "undefined" && STATE.solved) || []);
  let correct = 0, wrong = 0, skip = 0;
  (qs || []).forEach((q) => {
    const rec = solved.find((x) => x && (x.id === q.id || String(x.id) === String(q.id)));
    if (!rec) skip++;
    else if (rec.correct) correct++;
    else wrong++;
  });
  return { correct, wrong, skip };
}

function cpyqbOpenSessionModal(exam, subject, chapter, mode, extraJson) {
  const isPractice = mode !== "test";
  let extra = {};
  try { extra = extraJson ? JSON.parse(extraJson) : {}; } catch (_) { extra = {}; }
  window._cpyqbSessionCtx = {
    exam: exam, subject: subject, chapter: chapter, mode: extra.mode || "",
    bucketId: extra.bucketId || "", topicId: extra.topicId || "",
    topicTitle: extra.topicTitle || "", levelId: extra.levelId || "",
    bookId: extra.bookId || "", chapterKey: extra.chapterKey || "",
    returnTo: extra.returnTo || (typeof currentView !== "undefined" ? currentView : "cpyqb")
  };
  const qs = (typeof getChapterQuestions === "function")
    ? getChapterQuestions(exam, subject, chapter)
    : ((typeof QUESTIONS !== "undefined" ? QUESTIONS : []).filter((q) => q && q._bank === exam && q.subject === subject && q.chapter === chapter));
  const years = typeof cpyqbYearCounts === "function" ? cpyqbYearCounts(qs) : [];
  const ev = cpyqbEvalCountsForQs(qs);
  const existing = document.getElementById("pyqPracticeModal");
  if (existing) existing.remove();
  const yearHtml = years.length
    ? years.map((pair) => `<label class="eg-check-row"><input type="checkbox" name="cpyqbYear" value="${pair[0]}"> ${pair[0]} (${pair[1]})</label>`).join("")
    : `<p class="eg-cfg-h small" style="margin:0;font-size:12px;opacity:.7">All years in this chapter</p>`;
  const goLabel = isPractice ? "Start Practice Session" : "Start Test";
  document.body.insertAdjacentHTML("beforeend", `<div class="marks-modal-overlay pyq-eg-overlay" id="pyqPracticeModal" onclick="if(event.target===this)pyqClosePracticeModal()">
    <div class="eg-cfg pyq-eg-modal">
      <div class="eg-cfg-h">
        <div style="flex:1">
          <h3>${String(chapter || "").replace(/</g, "&lt;")}</h3>
          <small>${String(exam || "").replace(/_/g, " ")} · ${String(subject || "").replace(/</g, "&lt;")} · chapter-wise PYQ</small>
        </div>
        <span class="eg-cfg-badge${isPractice ? "" : " test"}">${isPractice ? "Practice Mode" : "Test Mode"}</span>
        <button type="button" class="marks-modal-cancel eg-cfg-x" onclick="pyqClosePracticeModal()">✕</button>
      </div>
      <div class="eg-dd-row">
        <button type="button" class="eg-dd-btn" data-pan="diff">${pyqFilterIco("diff")} Difficulty</button>
        <button type="button" class="eg-dd-btn" data-pan="eval">${pyqFilterIco("eval")} Evaluation</button>
        <button type="button" class="eg-dd-btn" data-pan="qtype">${pyqFilterIco("type")} Question Types</button>
        <button type="button" class="eg-dd-btn" data-pan="year">${pyqFilterIco("all")} Years</button>
        <button type="button" class="eg-dd-btn" data-pan="all">${pyqFilterIco("all")} All Filters</button>
      </div>
      <div class="eg-filter-pans">
        <div class="eg-filter-pan" data-pan="diff" hidden>
          <h5>Difficulty</h5>
          <label class="eg-check-row"><input type="checkbox" name="cpyqbDiff" value="Easy"> Easy</label>
          <label class="eg-check-row"><input type="checkbox" name="cpyqbDiff" value="Medium"> Medium</label>
          <label class="eg-check-row"><input type="checkbox" name="cpyqbDiff" value="Hard"> Hard</label>
        </div>
        <div class="eg-filter-pan" data-pan="eval" hidden>
          <h5>Evaluation</h5>
          <label class="eg-check-row"><input type="checkbox" name="cpyqbEval" value="correct"> Correct (${ev.correct})</label>
          <label class="eg-check-row"><input type="checkbox" name="cpyqbEval" value="wrong"> Wrong (${ev.wrong})</label>
          <label class="eg-check-row"><input type="checkbox" name="cpyqbEval" value="unattempted"> Not Attempted (${ev.skip})</label>
        </div>
        <div class="eg-filter-pan" data-pan="qtype" hidden>
          <h5>Question Types</h5>
          <label class="eg-check-row"><input type="checkbox" name="cpyqbType" value="mcq" checked> MCQ Single Choice</label>
          <label class="eg-check-row"><input type="checkbox" name="cpyqbType" value="multiple"> MCQ Multiple Correct</label>
          <label class="eg-check-row"><input type="checkbox" name="cpyqbType" value="numerical" checked> Numerical</label>
        </div>
        <div class="eg-filter-pan" data-pan="year" hidden>
          <h5>Years</h5>
          ${yearHtml}
        </div>
      </div>
      <h4>${pyqFilterIco("lang")} Language Preference</h4>
      <div class="eg-lang">
        <label class="eg-chip on"><input type="radio" name="cpyqbLang" value="en" checked> English</label>
        <label class="eg-chip" style="opacity:.55"><input type="radio" name="cpyqbLang" value="hi" disabled> Hindi (coming soon)</label>
      </div>
      <h4>Start options</h4>
      <div class="eg-resume-grid">
        <label class="eg-cfg-resume on"><input type="radio" name="pyqResume" value="fresh" checked>
          <strong>Start Fresh</strong><small>${isPractice ? "Untimed practice · show answers" : "Timed chapter test"}</small></label>
      </div>
      <button type="button" class="eg-cfg-go" onclick="cpyqbStartSession('${isPractice ? "practice" : "test"}')">${goLabel}</button>
    </div>
  </div>`);
  pyqBindSessionModal();
}

async function cpyqbStartSession(mode) {
  const ctx = window._cpyqbSessionCtx;
  if (!ctx || !ctx.chapter) return;
  const root = document.getElementById("pyqPracticeModal");
  const scope = root || document;
  const types = Array.from(scope.querySelectorAll('input[name="cpyqbType"]:checked')).map((el) => el.value);
  const diffs = Array.from(scope.querySelectorAll('input[name="cpyqbDiff"]:checked')).map((el) => el.value);
  const evals = Array.from(scope.querySelectorAll('input[name="cpyqbEval"]:checked')).map((el) => el.value);
  const years = Array.from(scope.querySelectorAll('input[name="cpyqbYear"]:checked')).map((el) => String(el.value));
  pyqClosePracticeModal();
  try {
    const main = document.getElementById("app-main");
    if (main && typeof qxLoadLogoHtml === "function") {
      main.innerHTML = qxLoadLogoHtml(mode === "test" ? "Starting test…" : "Opening practice…");
    }
  } catch (_) { /* */ }
  if (typeof showToast === "function") showToast("Opening chapter…");
  let qs = window._qxListQsAll || window._qxListQs || [];
  const src = ctx.returnTo || "cpyqb";
  try {
    if ((!qs || !qs.length) && ctx.bookId && typeof loadBookChapter === "function") {
      await loadBookChapter(ctx.bookId, ctx.chapterKey || ctx.chapter);
      qs = typeof getBookQuestions === "function" ? getBookQuestions(ctx.bookId, ctx.chapterKey || ctx.chapter) : [];
    } else if ((!qs || !qs.length) && src !== "books" && src !== "board") {
      qs = await ensureCpyqbChapterQuestions(ctx.exam, ctx.subject, ctx.chapter, null, {
        mode: ctx.mode, bucketId: ctx.bucketId, bucketTitle: ctx.bucketTitle,
        topicId: ctx.topicId, topicTitle: ctx.topicTitle
      });
    }
  } catch (_) { qs = qs || []; }
  if (ctx.levelId && typeof filterQsByJeeAdvLevel === "function") {
    qs = filterQsByJeeAdvLevel(qs, ctx.levelId);
  }
  if (years.length) {
    qs = qs.filter((q) => {
      const y = String(qYearFromSource(q.source) || qYearFromSource(q.paperSource) || qYearFromSource(q.examName) || "");
      return years.indexOf(y) >= 0;
    });
  }
  if (diffs.length) {
    qs = qs.filter((q) => diffs.indexOf(typeof qxNormDifficulty === "function" ? qxNormDifficulty(q.difficulty) : String(q.difficulty || "")) >= 0);
  }
  if (types.length) {
    qs = qs.filter((q) => {
      let t = "mcq";
      try {
        if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType) t = QuantrexQFormat.getType(q);
      } catch (_) { /* */ }
      if (t === "numerical" || t === "subjective") return types.indexOf("numerical") >= 0;
      if (t === "multipleCorrect") return types.indexOf("multiple") >= 0 || types.indexOf("mcq") >= 0;
      return types.indexOf("mcq") >= 0;
    });
  }
  if (evals.length) {
    const solved = ((typeof STATE !== "undefined" && STATE.solved) || []);
    qs = qs.filter((q) => {
      const rec = solved.find((x) => x && (x.id === q.id || String(x.id) === String(q.id)));
      if (!rec) return evals.indexOf("unattempted") >= 0;
      if (rec.correct) return evals.indexOf("correct") >= 0;
      return evals.indexOf("wrong") >= 0;
    });
  }
  const ids = qs.map((q) => q.id).filter(Boolean);
  if (!ids.length) {
    if (typeof showToast === "function") showToast("No questions match these filters");
    return;
  }
  if (!qxBookQsAlreadyLoaded(ids)) {
    try {
      if (typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.hydrateIds) {
        await QuantrexCatalog.hydrateIds(ids.slice(0, 80));
      }
    } catch (_) { /* */ }
  }
  const isPractice = mode !== "test";
  const mins = Math.max(10, Math.ceil(ids.length * 1.5));
  const ret = ctx.returnTo || "cpyqb";
  await startTest(ids, ctx.chapter + " · " + (ctx.subject || "PYQ"), ret, {
    testType: ret === "books" ? "book" : (ret === "board" ? "board" : "chapter"),
    practiceMode: isPractice,
    timed: !isPractice,
    durationSec: isPractice ? null : mins * 60,
    skipInstructions: true,
    skipCountdown: isPractice,
    shuffle: false,
    marksMode: true,
    uiMode: "examgoal",
    organizeJee: false,
    startIdx: 0,
    meta: { slug: ctx.exam, subject: ctx.subject, chapter: ctx.chapter, bookId: ctx.bookId }
  });
}

function qxBookQsAlreadyLoaded(ids) {
  const list = ids || [];
  if (!list.length) return false;
  let n = 0;
  for (let i = 0; i < Math.min(list.length, 12); i++) {
    const q = typeof getQ === "function" ? getQ(list[i]) : null;
    if (q && (q._book || q._bookId) && String(q.q || "").replace(/<[^>]+>/g, " ").trim().length > 8) n++;
  }
  return n >= Math.min(list.length, 8) * 0.7;
}

async function cpyqbLaunchList(ids, title, startIdx, returnTo) {
  if (!ids || !ids.length) return;
  const bookReady = qxBookQsAlreadyLoaded(ids);
  if (!bookReady) {
    try {
      if (typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.hydrateIds) {
        await QuantrexCatalog.hydrateIds(ids.slice(0, 80));
      }
    } catch (_) { /* */ }
  }
  const ret = returnTo || (typeof currentView !== "undefined" ? currentView : "cpyqb");
  return startTest(ids, title || "Chapter PYQ", ret, {
    testType: ret === "books" ? "book" : (ret === "board" ? "board" : "chapter"),
    practiceMode: true,
    timed: false,
    durationSec: null,
    skipInstructions: true,
    skipCountdown: true,
    shuffle: false,
    marksMode: true,
    uiMode: "examgoal",
    organizeJee: false,
    startIdx: startIdx || 0,
    meta: cpyqbSessionKeys({ returnTo: ret })
  });
}

function qxAskBookPracticeOrTest(ids, title, startIdx, returnTo) {
  const existing = document.getElementById("qxBookPtModal");
  if (existing) existing.remove();
  const n = (ids || []).length;
  const ret = returnTo || (typeof currentView !== "undefined" ? currentView : "cpyqb");
  const wrap = document.createElement("div");
  wrap.id = "qxBookPtModal";
  wrap.className = "qx-book-pt-overlay";
  wrap.innerHTML =
    '<div class="qx-book-pt-card" role="dialog" aria-labelledby="qxBookPtTitle">' +
    '<div class="qx-load-orbit"><img src="/assets/quantrex-logo-3d-64.png?v=qxfix110" alt="Quantrex" class="qx-ui-brand-logo" width="64" height="64"></div>' +
    '<h3 id="qxBookPtTitle">Choose mode</h3>' +
    '<p>' + n.toLocaleString() + ' questions · Practice or Test</p>' +
    '<button type="button" class="qx-book-pt-practice" data-mode="practice">Practice</button>' +
    '<button type="button" class="qx-book-pt-test" data-mode="test">Take Test</button>' +
    '<button type="button" class="qx-book-pt-cancel">Cancel</button></div>';
  document.body.appendChild(wrap);
  function launch(mode) {
    wrap.remove();
    const main = document.getElementById("app-main");
    if (main && typeof qxLoadLogoHtml === "function") {
      main.innerHTML = qxLoadLogoHtml(mode === "test" ? "Starting test…" : "Opening practice…");
    }
    const isPractice = mode !== "test";
    const mins = Math.max(10, Math.ceil(n * 1.5));
    const testType = ret === "books" ? "book" : (ret === "board" ? "board" : "chapter");
    if (isPractice && typeof cpyqbLaunchList === "function" && ret !== "books") {
      cpyqbLaunchList(ids, title || "Chapter PYQ", startIdx || 0, ret);
      return;
    }
    if (typeof startTest === "function") {
      startTest(ids, title || "Questions", ret, {
        testType: testType,
        practiceMode: isPractice,
        timed: !isPractice,
        durationSec: isPractice ? null : mins * 60,
        skipInstructions: true,
        skipCountdown: isPractice,
        shuffle: false,
        marksMode: true,
        uiMode: "examgoal",
        organizeJee: false,
        startIdx: isPractice ? (startIdx || 0) : 0,
        meta: (typeof cpyqbSessionKeys === "function" ? cpyqbSessionKeys({ returnTo: ret }) : {})
      });
    }
  }
  wrap.querySelector(".qx-book-pt-practice").onclick = function () { launch("practice"); };
  wrap.querySelector(".qx-book-pt-test").onclick = function () { launch("test"); };
  wrap.querySelector(".qx-book-pt-cancel").onclick = function () { wrap.remove(); };
  wrap.onclick = function (e) { if (e.target === wrap) wrap.remove(); };
}

window.cpyqbOpenSessionModal = cpyqbOpenSessionModal;
window.cpyqbStartSession = cpyqbStartSession;
window.cpyqbChapterSessionBar = cpyqbChapterSessionBar;
window.cpyqbLaunchList = cpyqbLaunchList;
window.qxAskBookPracticeOrTest = qxAskBookPracticeOrTest;
window.qxBookQsAlreadyLoaded = qxBookQsAlreadyLoaded;

function pyqPaperLabel(source) {
  const m = String(source || "").match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : String(source || "Paper");
}

function pyqSubjectLine(subjects) {
  const order = ["Mathematics", "Physics", "Chemistry", "Biology", "Botany", "Zoology", "English", "General Science", "General Studies", "General Ability"];
  const subs = subjects || {};
  const lines = order.filter(s => subs[s]).map(s => `${s}: ${subs[s]}`);
  Object.keys(subs).forEach(s => {
    if (!order.includes(s)) lines.push(`${s}: ${subs[s]}`);
  });
  return lines.join(" · ");
}

function pyqSubjectNames(subjects) {
  const order = ["Mathematics", "Physics", "Chemistry", "Biology", "Botany", "Zoology", "English", "General Science", "General Studies", "General Ability"];
  const subs = subjects || {};
  const names = order.filter(s => subs[s]);
  Object.keys(subs).forEach(s => { if (!names.includes(s)) names.push(s); });
  return names.join(" · ");
}

function pyqSubjectWiseHint(slug) {
  const fmt = typeof marksExamFormat === "function" ? marksExamFormat(slug) : null;
  if (fmt && fmt.subjects && fmt.subjects.length) {
    return "Subject-wise · " + fmt.subjects.join(" → ");
  }
  const hints = {
    jee_advanced: "Subject-wise · Physics → Chemistry → Mathematics",
    neet: "Subject-wise · Physics → Chemistry → Botany → Zoology",
    nta_abhyas_neet: "Subject-wise · Physics → Chemistry → Botany → Zoology",
    aiims: "Subject-wise · Physics → Chemistry → Biology",
    jipmer: "Subject-wise · Physics → Chemistry → Biology",
    nda: "Subject-wise · Mathematics → English → General Science → General Studies",
    mht_cet: "Subject-wise · Mathematics → Physics → Chemistry",
    bitsat: "Subject-wise · Mathematics → Physics → Chemistry → English"
  };
  return hints[slug] || "Subject-wise · as in Marks paper";
}

/** Paper title from Marks source string — never force "JEE Main" on other exams */
function pyqFullPaperTitle(source, slug) {
  const label = typeof pyqPaperLabel === "function" ? pyqPaperLabel(source) : "";
  const src = String(source || "").trim();
  if (label && label.length > 3) return label;
  if (src) return src;
  const fmt = typeof marksExamFormat === "function" ? marksExamFormat(slug) : null;
  return (fmt && fmt.title) || "Full Paper";
}

function pyqPersistKey(slug, source) {
  return `${slug}::${source}`;
}

function pyqResumeModalHtml(slug, source, title) {
  const srcEnc = encodeURIComponent(source);
  return `<div class="marks-modal-overlay marks-resume-overlay" id="pyqResumeModal" onclick="if(event.target===this)pyqCloseResume()">
    <div class="marks-resume-modal">
      <button type="button" class="marks-resume-close" onclick="pyqCloseResume()">✕</button>
      <div class="marks-resume-icon">⏸</div>
      <h3>Resume Test</h3>
      <p class="marks-resume-sub">${title}</p>
      <p class="marks-resume-hint">Your answers &amp; timer are saved. Continue where you left off, or start a fresh attempt.</p>
      <button type="button" class="marks-resume-btn" onclick="pyqCloseResume();pyqResumePaper('${slug}', decodeURIComponent('${srcEnc}'))">▶ Resume Test</button>
      <button type="button" class="marks-resume-secondary" onclick="pyqCloseResume();startPyqPaperMock('${slug}', decodeURIComponent('${srcEnc}'), true)">Start Fresh</button>
      <button type="button" class="marks-resume-cancel" onclick="pyqCloseResume()">Cancel</button>
    </div>
  </div>`;
}

function pyqCloseResume() {
  const el = document.getElementById("pyqResumeModal");
  if (el) el.remove();
}

function pyqShowResume(slug, source) {
  const title = pyqFullPaperTitle(source);
  const existing = document.getElementById("pyqResumeModal");
  if (existing) existing.remove();
  document.body.insertAdjacentHTML("beforeend", pyqResumeModalHtml(slug, source, title));
}

async function pyqResumePaper(slug, source) {
  const key = pyqPersistKey(slug, source);
  const saved = typeof marksLoadSession === "function" ? marksLoadSession(key) : null;
  if (!saved) {
    showToast("⚠️ No saved session found. Starting fresh…");
    return startPyqPaperMock(slug, source, true);
  }
  try {
    const loaded = await qxLoadPyqPaper(slug, source);
    if (!loaded.length) {
      showToast("⚠️ Could not load this paper for resume.");
      return;
    }
  } catch (e) {
    showToast("⚠️ Could not load question bank for resume.");
    return;
  }
  // Cap + background — full paper hydrate used to hang for minutes
  if (typeof MarksLive !== "undefined" && MarksLive.prefetchQuestions) {
    Promise.resolve().then(() => MarksLive.prefetchQuestions((saved.ids || []).slice(0, 12))).catch(() => {});
  }
  const attemptKey = pyqAttemptKey(slug, source);
  pyqSaveAttempt(attemptKey, { status: "inProgress", slug, source });
  startTest(saved.ids, saved.title || pyqPaperLabel(source), "tests", {
    testType: "pyqmock",
    timed: true,
    durationSec: saved.remainingSec != null ? saved.remainingSec : saved.durationSec,
    shuffle: false,
    marksMode: true,
    organizeJee: true,
    // Marks website format (not Quizrr) for PYQ mocks
    uiMode: (saved && saved.uiMode) || "quantrex",
    paperFormat: saved.paperFormat || slug,
    skipCountdown: true,
    persistKey: key,
    resumeData: Object.assign({}, saved, { uiMode: (saved && saved.uiMode) || "quantrex" }),
    meta: { slug, source, year: typeof qYearFromSource === "function" ? qYearFromSource(source) : null },
    modeLabel: `Full Paper · ${saved.ids.length} Qs`,
    onComplete: (data, snapshot) => {
      marksClearSession();
      const snap = snapshot || window._qxLastAttemptSnapshot || null;
      pyqSaveAttempt(attemptKey, {
        status: "completed",
        score: data.score,
        pct: data.pct,
        correct: data.correct,
        wrong: data.wrong,
        total: data.total,
        maxScore: data.maxScore,
        timeUsed: data.timeUsed,
        title: (saved && saved.title) || "",
        slug,
        source,
        snapshot: snap
      });
    }
  });
}

async function pyqOpenPaper(slug, source) {
  if (qxPyqBlocked(slug, source)) return;
  const key = pyqPersistKey(slug, source);
  const saved = typeof marksLoadSession === "function" ? marksLoadSession(key) : null;
  const st = pyqAttemptStatus(slug, source);
  if (saved && (st === "inProgress" || saved.remainingSec > 0)) {
    pyqShowResume(slug, source);
    return;
  }
  pyqShowPreview(slug, source);
}

/** Duration (seconds) from Marks exam format + year tweaks */
function pyqPaperDuration(count, slug, year, source) {
  const meta = (typeof pyqFindPaperMeta === "function") ? pyqFindPaperMeta(slug, source) : null;
  if (meta && meta.durationMin) return Number(meta.durationMin) * 60;
  const fmt = typeof marksExamFormat === "function" ? marksExamFormat(slug) : null;
  const y = year != null ? Number(year) : null;
  let mins = (fmt && fmt.durationMin) || 180;
  if (fmt && fmt.exam === "neet") {
    if (y >= 2021 && y <= 2024) mins = 200;
    else mins = 180;
  }
  return mins * 60;
}

function pyqFindPaperMeta(slug, source) {
  const byYear = _pyqPaperIndex[slug];
  if (!byYear) return null;
  const want = String(source || "").replace(/\s+/g, " ").trim();
  const keys = Object.keys(byYear);
  for (let i = 0; i < keys.length; i++) {
    const papers = byYear[keys[i]] || [];
    for (let j = 0; j < papers.length; j++) {
      if (String(papers[j].source || "").replace(/\s+/g, " ").trim() === want) return papers[j];
    }
  }
  return null;
}

function pyqNeetDurationLabel(year, papers) {
  const y = Number(year);
  if (papers && papers.length) {
    const d = papers[0].durationMin;
    if (d) return d >= 200 ? "3 hr 20 min" : "3 hr";
  }
  if (y >= 2021 && y <= 2024) return "3 hr 20 min";
  return "3 hr";
}

/**
 * Marks-sourced pattern for THIS exam + year.
 * Uses paper Q count when available; never labels BITSAT/NDA as JEE Main.
 */
function pyqOfficialPattern(slug, year, loadedCount, questionIds) {
  const fmt = typeof marksExamFormat === "function" ? marksExamFormat(slug) : null;
  const y = year != null ? Number(year) : null;
  const n = loadedCount || 0;
  const exam = (fmt && fmt.exam) || "jee_main";
  const title = (fmt && fmt.title) || "Exam";
  const format = (fmt && fmt.format) || exam;

  // ── NEET family — Marks PYQ-MT exact paper size ──
  if (exam === "neet" || format === "neet") {
    const paperMeta = (typeof window !== "undefined" && window._pyqActivePaperMeta) || null;
    const officialFromPaper = paperMeta && (paperMeta.officialCount || paperMeta.count);
    const durationFromPaper = paperMeta && paperMeta.durationMin;
    const marksFromPaper = paperMeta && paperMeta.totalMarks;
    const is2021_24 = y != null && y >= 2021 && y <= 2024;
    let officialQs = officialFromPaper || 180;
    if (!officialFromPaper) {
      if (is2021_24) officialQs = 200;
      else if (y != null && y <= 2012 && n >= 190) officialQs = 200;
      else if (y != null && y <= 2012 && n > 0 && n <= 130) officialQs = 120;
      else officialQs = 180;
    }
    const durationMin = durationFromPaper || (is2021_24 ? 200 : 180);
    let totalMarks = marksFromPaper || 720;
    if (!marksFromPaper) {
      if (is2021_24 || officialQs === 180) totalMarks = 720;
      else if (officialQs === 120) totalMarks = 480;
      else if (officialQs === 200) totalMarks = 800;
    }
    const catalogTotalQs = (n >= 20 && n <= 220) ? n : officialQs;
    const is200ab = is2021_24 || (paperMeta && Array.isArray(paperMeta.sections) && paperMeta.sections.some(s => /section b/i.test(String(s.title || ""))));
    return {
      catalogTotalQs,
      totalMarks,
      durationMin,
      pattern: is200ab ? "neet_200_ab" : (officialQs === 200 ? "neet_200_mcq" : (officialQs === 120 ? "neet_120_mcq" : "neet_180_mcq")),
      exam: "neet",
      format: "neet",
      title: title,
      officialQs,
      scoring: { correct: 4, wrong: -1, unattempted: 0 }
    };
  }

  // ── JEE Advanced ONLY — year-exact official pattern (jeeadv.ac.in archive) ──
  if (exam === "jee_advanced" || format === "jee_advanced") {
    const y = year != null ? Number(year) : null;
    const off = (typeof jeeAdvOfficialForYear === "function")
      ? jeeAdvOfficialForYear(y)
      : { durationMin: 180, paperMarksHint: 180 };
    // Prefer real paper size from bank; marks from official year hint
    const catalogTotalQs = n >= 20 ? n : ((fmt && fmt.defaultQs) || 54);
    let totalMarks = off.paperMarksHint || 180;
    // Typical modern Adv ~3–4 marks average per Q when bank size known
    if (n >= 40 && n <= 70) totalMarks = Math.max(off.paperMarksHint || 180, Math.round(n * 3.5));
    const pat = y ? `adv_${y}` : "jee_advanced";
    return {
      catalogTotalQs,
      totalMarks,
      durationMin: off.durationMin || 180,
      pattern: pat,
      exam: "jee_advanced",
      format: "jee_advanced",
      title: "JEE (Advanced)",
      year: y
    };
  }

  // ── JEE Main / Abhyas only ──
  if (exam === "jee_main" || format === "jee_main") {
    let numCount = 0;
    if (Array.isArray(questionIds) && typeof isNumericalQuestion === "function") {
      questionIds.forEach(id => {
        try {
          const q = typeof getQ === "function" ? getQ(id) : null;
          if (q && isNumericalQuestion(q)) numCount++;
        } catch (_) { /* */ }
      });
    }
    let catalogTotalQs = n >= 20 ? n : 75;
    let totalMarks = 300;
    let pattern = "main_75_num";
    if (y != null && !Number.isNaN(y)) {
      if (y <= 2012) { catalogTotalQs = n >= 20 ? n : 90; totalMarks = 360; pattern = "aieee_90"; }
      else if (y <= 2018) { catalogTotalQs = n >= 20 ? n : 90; totalMarks = 360; pattern = "main_90_mcq"; }
      else if (y <= 2020) { catalogTotalQs = n >= 20 ? n : 75; totalMarks = 300; pattern = "main_75_mcq"; }
      else if (y <= 2024) { catalogTotalQs = n >= 20 ? n : 90; totalMarks = 300; pattern = "main_90_num"; }
      else { catalogTotalQs = n >= 20 ? n : 75; totalMarks = 300; pattern = "main_75_num"; }
    } else if (n >= 85) {
      catalogTotalQs = n;
      if (numCount >= 8) { totalMarks = 300; pattern = "main_90_num"; }
      else { totalMarks = 360; pattern = "main_90_mcq"; }
    } else if (n >= 70) {
      catalogTotalQs = n;
      pattern = numCount >= 5 ? "main_75_num" : "main_75_mcq";
      totalMarks = 300;
    }
    return {
      catalogTotalQs, totalMarks, durationMin: 180, pattern,
      exam: "jee_main", format: "jee_main", title: title
    };
  }

  // ── All other Marks exams (BITSAT, NDA, CET, COMEDK, …) ──
  const durationMin = (fmt && fmt.durationMin) || 180;
  const totalMarks = (fmt && fmt.totalMarks) || Math.max(n * 4, 100);
  return {
    catalogTotalQs: n >= 10 ? n : ((fmt && fmt.defaultQs) || n),
    totalMarks,
    durationMin,
    pattern: exam + "_paper",
    exam,
    format,
    title: title
  };
}

/** Marks scoring by exam */
function pyqPaperScoring(slug) {
  const fmt = typeof marksExamFormat === "function" ? marksExamFormat(slug) : null;
  const exam = (fmt && fmt.exam) || String(slug || "");
  if (/neet|aiims|jipmer|mht_cet_medical/i.test(exam + " " + slug)) {
    return { correct: 4, wrong: -1, unattempted: 0, numericalWrong: 0 };
  }
  if (/jee_advanced/i.test(exam + " " + slug)) {
    // Base SC scheme; multi/num adjusted at grade time via type
    return { correct: 3, wrong: -1, partial: 2, unattempted: 0, numericalWrong: 0, multiCorrect: 4, multiWrong: -2, numericalCorrect: 4 };
  }
  if (/nda/i.test(exam + " " + slug)) {
    return { correct: 2.5, wrong: -0.83, unattempted: 0, numericalWrong: 0 };
  }
  if (/mht_cet/i.test(exam + " " + slug)) {
    return { correct: 2, wrong: 0, unattempted: 0, numericalWrong: 0 };
  }
  if (/bitsat|viteee|comedk|kcet|eamcet|wbjee|manipal|iat|nest|kvpy/i.test(exam + " " + slug)) {
    return { correct: 3, wrong: -1, unattempted: 0, numericalWrong: 0 };
  }
  // JEE Main default
  return { correct: 4, wrong: -1, unattempted: 0, numericalWrong: 0 };
}

async function buildPyqPaperIndex(slug) {
  if (_pyqPaperIndex[slug]) return _pyqPaperIndex[slug];

  // 1) Lightweight paper index (instant — no 40MB bank parse). Built offline for PYQ mock list.
  try {
    const res = await fetch(`data/nav/pyq_paper_index/${encodeURIComponent(slug)}.json?v=qxfix50`, { cache: "force-cache" });
    if (res.ok) {
      const byYear = await res.json();
      if (byYear && typeof byYear === "object" && Object.keys(byYear).length) {
        _pyqPaperIndex[slug] = byYear;
        return byYear;
      }
    }
  } catch (e) {
    console.warn("pyq paper index fetch", slug, e);
  }

  // 2) Never parse a 40MB bank on the phone just to list years.
  _pyqPaperIndex[slug] = {};
  return {};
}

function pyqMockBackBar(step, exam, year) {
  if (step === "papers" && exam && year) {
    if (String(exam) === "neet" && String(year) === "2026") {
      return `<button type="button" class="pyqmock-back" ${mg("pyqmock", { step: "modules", exam })}>← PYQ Mock Tests</button>`;
    }
    return `<button type="button" class="pyqmock-back" ${mg("pyqmock", { step: "years", exam })}>← ${year}</button>`;
  }
  if (step === "years" && exam) {
    if (String(exam) === "neet") {
      return `<button type="button" class="pyqmock-back" ${mg("pyqmock", { step: "modules", exam })}>← PYQ Mock Tests</button>`;
    }
    return `<button type="button" class="pyqmock-back" ${mg("pyqmock", { step: "exams" })}>← All Exams</button>`;
  }
  if (step === "modules" && exam) {
    return `<button type="button" class="pyqmock-back" ${mg("pyqmock", { step: "exams" })}>← All Exams</button>`;
  }
  return `<button type="button" class="pyqmock-back" onclick="go('tests')">← Tests</button>`;
}

async function viewPyqMock(payload) {
  const p = { ..._pyqMockPayload, ...(payload || {}) };
  _pyqMockPayload = p;
  try {
    const locked = typeof qxAccessBlock === "function" ? qxAccessBlock("pyqmock", p) : "";
    if (locked) return locked;
  } catch (_) { /* */ }
  let nav = [];
  try {
    nav = await fetchNav("cpyqb");
  } catch (e) {
    console.warn("viewPyqMock nav", e);
  }
  if (!Array.isArray(nav)) nav = [];
  // Normalize track (Foundation→Academic, NDA→Defence)
  const track = typeof cpyqbActiveTrack === "function" ? cpyqbActiveTrack() : (STATE.exam || "Engineering");
  let exams = typeof cpyqbExamsForCategory === "function"
    ? cpyqbExamsForCategory(nav, track)
    : nav.filter(e => e && e.category === track);
  // Fallback: if category filter empty (stale STATE.exam), show Engineering/all with counts
  if (!exams.length && nav.length) {
    exams = typeof cpyqbExamsForCategory === "function"
      ? cpyqbExamsForCategory(nav, "Engineering")
      : nav.filter(e => e && e.category === "Engineering");
  }
  if (!exams.length && nav.length) exams = nav.slice();

  if (p.step === "papers" && p.exam && p.year) {
    const exam = exams.find(e => e.slug === p.exam) || { slug: p.exam, title: p.exam, count: 0 };
    const byYear = await buildPyqPaperIndex(p.exam);
    const allPapers = byYear[String(p.year)] || [];
    const papers = allPapers.filter(paper => pyqMatchesFilter(p.exam, paper));
    const filterPill = _pyqFilters.status !== "all" || _pyqFilters.year !== "all"
      ? `<span class="pyqmock-filter-pill">${_pyqFilters.status !== "all" ? _pyqFilters.status : ""}${_pyqFilters.year !== "all" ? " · " + _pyqFilters.year : ""}</span>` : "";
    const cards = papers.map(paper => {
      const srcEnc = encodeURIComponent(paper.source);
      const subLine = pyqSubjectLine(paper.subjects);
      const st = pyqAttemptStatus(p.exam, paper.source);
      const rec = pyqGetAttempt(p.exam, paper.source);
      const hasSnap = !!(rec && rec.snapshot && st === "completed");
      const stCls = st === "completed" ? "done" : st === "inProgress" ? "progress" : "";
      // Completed + saved → open Report Card; in-progress → resume; else preview
      let clickFn = `pyqShowPreview('${p.exam}', decodeURIComponent('${srcEnc}'))`;
      let actionLabel = "Attempt Now →";
      if (st === "inProgress") {
        clickFn = `pyqOpenPaper('${p.exam}', decodeURIComponent('${srcEnc}'))`;
        actionLabel = "Resume Test →";
      } else if (st === "completed" && hasSnap) {
        clickFn = `pyqViewSavedAnalysis('${p.exam}', decodeURIComponent('${srcEnc}'))`;
        actionLabel = "View Analysis →";
      } else if (st === "completed") {
        clickFn = `pyqShowPreview('${p.exam}', decodeURIComponent('${srcEnc}'))`;
        actionLabel = "View / Retake →";
      }
      const scoreBit = (st === "completed" && rec && rec.score != null)
        ? `<span class="pyqmock-score">${rec.score}${rec.maxScore != null ? "/" + rec.maxScore : ""}</span>`
        : "";
      return `<div class="pyqmock-paper-card ${stCls}"${pyqPeekAttr(p.exam, paper.source, p.year)}>
        <div class="pyqmock-paper-main" onclick="${clickFn}">
          <strong>${pyqPaperLabel(paper.source)}</strong>
          <small>${subLine || ""} · English</small>
        </div>
        <div class="pyqmock-eg-actions">
          <button type="button" class="pyqmock-take" onclick="event.stopPropagation();pyqOpenTestModal('${p.exam}', decodeURIComponent('${srcEnc}'))">Take Test</button>
          <button type="button" class="pyqmock-practice" onclick="event.stopPropagation();pyqOpenPracticeModal('${p.exam}', decodeURIComponent('${srcEnc}'))">Practice</button>
        </div>
        <div class="pyqmock-paper-meta">
          <span class="pyqmock-full-badge">Full Paper</span>
          <span class="pyqmock-qcount">${paper.officialCount || paper.count} Qs</span>
          ${scoreBit}
        </div>
      </div>`;
    }).join("");
    const years = Object.keys(byYear || {}).filter(Boolean).sort((a, b) => Number(b) - Number(a));
    const yearOpts = years.map(y =>
      `<option value="${y}" ${String(p.year) === String(y) ? "selected" : ""}>${y}</option>`
    ).join("");
    return `<div class="marks-tests-page pyqmock-page">
      ${pyqMockBackBar("papers", p.exam, p.year)}
      <div class="cpyqb-marks-head">
        <h1>${String(p.exam) === "neet" && String(p.year) === "2026" ? "Re-NEET 2026 Special Mocks" : (exam.title + " " + p.year)}</h1>
        <p>${papers.length} full paper${papers.length === 1 ? "" : "s"} · ${pyqNeetDurationLabel(p.year, papers)} each · +4 / −1</p>
      </div>
      <div class="pyqmock-filter-bar">
        <input type="search" class="pyqmock-search" placeholder="Search papers by name…" oninput="pyqSearchPapers(this.value)">
        <select class="pyqmock-year-select" onchange="go('pyqmock', {exam:'${p.exam}', step:'papers', year:this.value})">
          ${yearOpts}
        </select>
        <button type="button" class="pyqmock-filter-btn" onclick="pyqOpenFilterModal()">All Filters</button>
        ${filterPill}
      </div>
      <div class="pyqmock-paper-list">${cards || '<div class="empty">No papers match your filters.</div>'}</div>
    </div>`;
  }

  if (p.step === "modules" && p.exam) {
    const exam = exams.find(e => e.slug === p.exam) || { slug: p.exam, title: String(p.exam).replace(/_/g, " ") };
    let mods = [];
    try {
      const res = await fetch(`data/nav/pyq_paper_index/${encodeURIComponent(p.exam)}_modules.json?v=qxfix50`, { cache: "force-cache" });
      if (res.ok) {
        const j = await res.json();
        mods = (j && j.modules) || [];
      }
    } catch (e) {
      console.warn("pyq modules", e);
    }
    if (!mods.length && String(p.exam) === "neet") {
      mods = [
        { id: "re-neet-2026", title: "Re-NEET 2026 Special Mocks", yearRange: [2026, 2026], group: "reneet" },
        { id: "neet", title: "NEET", yearRange: [2002, 2025], group: "neet" }
      ];
    }
    const cards = mods.map(mod => {
      const yrs = Array.isArray(mod.yearRange) ? mod.yearRange : [];
      const range = yrs.length ? `${yrs[0]}${yrs[1] && yrs[1] !== yrs[0] ? " – " + yrs[1] : ""}` : "";
      const go = (mod.group === "reneet" || mod.id === "re-neet-2026")
        ? { step: "papers", exam: p.exam, year: yrs[0] || 2026 }
        : { step: "years", exam: p.exam };
      return `<div class="pyqmock-module-card" ${mg("pyqmock", go)}>
        <div class="pyqmock-module-main">
          <span class="pyqmock-module-ic" aria-hidden="true"></span>
          <div>
            <strong>${mod.title}</strong>
            ${range ? `<small>${range}</small>` : ""}
          </div>
        </div>
        <span class="mth-arrow">›</span>
      </div>`;
    }).join("");
    return `<div class="marks-tests-page pyqmock-page">
      ${pyqMockBackBar("modules", p.exam)}
      <div class="cpyqb-marks-head">
        <h1>PYQ Mock Tests</h1>
        <p>${exam.title || p.exam} · Full papers, Marks official question count</p>
      </div>
      <div class="pyqmock-module-list">${cards || '<div class="empty">No modules.</div>'}</div>
    </div>`;
  }

  if (p.step === "years" && p.exam) {
    const exam = exams.find(e => e.slug === p.exam) || { slug: p.exam, title: String(p.exam).replace(/_/g, " "), count: 0 };
    let byYear = {};
    try {
      byYear = await buildPyqPaperIndex(p.exam);
    } catch (e) {
      console.warn("buildPyqPaperIndex", e);
      byYear = {};
    }
    const yearList = Object.keys(byYear || {})
      .filter(y => y !== "Other" && /^\d{4}$/.test(String(y)))
      .filter(y => String(p.exam) !== "neet" || (Number(y) >= 2002 && Number(y) <= 2025))
      .sort((a, b) => Number(b) - Number(a));
    // Include "Other" only if no real years
    if (!yearList.length && byYear && byYear.Other && byYear.Other.length) yearList.push("Other");
    const cards = yearList.map(y => {
      const papers = byYear[y] || [];
      const totalQs = papers.reduce((s, x) => s + (x.officialCount || x.count || 0), 0);
      return `<div class="pyqmock-year-card" ${mg("pyqmock", { step: "papers", exam: p.exam, year: y })}>
        <strong>${y}</strong>
        <small>${papers.length} Full Paper${papers.length === 1 ? "" : "s"}</small>
        <em>${totalQs.toLocaleString()} Questions</em>
        <span class="pyqmock-go">View Papers →</span>
      </div>`;
    }).join("");
    return `<div class="marks-tests-page pyqmock-page">
      ${pyqMockBackBar("years", p.exam)}
      <div class="cpyqb-marks-head">
        <h1>PYQ Mock Tests</h1>
        <p>${exam.title || p.exam} · Select year</p>
      </div>
      <div class="pyqmock-year-grid">${cards || `<div class="empty">No PYQ papers for this exam yet.<br><button type="button" class="btn-soft" style="margin-top:12px" onclick="go('pyqmock',{step:'exams'})">← All exams</button></div>`}</div>
    </div>`;
  }

  const cards = exams.map(e => {
    const yrs = typeof cpyqbExamYearLabel === "function" ? cpyqbExamYearLabel(e.slug) : "";
    const cnt = Number(e.count) || 0;
    const sub = yrs ? `${yrs} · ${cnt.toLocaleString()} PYQs` : `${cnt.toLocaleString()} PYQs`;
    return `
    <div class="mth-card" ${mg("pyqmock", { step: e.slug === "neet" ? "modules" : "years", exam: e.slug })}>
      <div class="mth-body">
        <strong>${e.title || e.slug}</strong>
        <small>${sub}</small>
      </div>
      <div class="mth-sq mth-sq-pink"></div>
      <span class="mth-arrow">›</span>
    </div>`;
  }).join("");
  return `<div class="marks-tests-page pyqmock-page">
    ${pyqMockBackBar("exams")}
    <div class="cpyqb-marks-head">
      <h1>PYQ Mock Tests</h1>
      <p>Full exam papers · Year &amp; shift wise · ${track}</p>
    </div>
    <div class="marks-tests-hero">${cards || `<div class="empty">No exams for this category (${track}).<br><button type="button" class="btn-primary sm" style="margin-top:12px" onclick="location.reload()">Retry</button></div>`}</div>
  </div>`;
}

/** Load one PYQ paper via catalog ID list (Marks order). Never JSON.parse a 15k–41k bank on the phone. */
async function qxLoadPyqPaper(slug, source) {
  const src = String(source || "");
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
  const want = norm(src);
  let qs = [];
  try {
    if (typeof showToast === "function") showToast("Loading paper…");
    const url = "/api/catalog?action=paper&exam=" + encodeURIComponent(slug) + "&source=" + encodeURIComponent(src) + "&v=qxfix50";
    const data = await fetch(url, { cache: "force-cache" }).then((r) => r.json());
    if (data && data.ok && Array.isArray(data.questions) && data.questions.length) {
      qs = data.questions.map((rec) => {
        const q = Object.assign({}, rec, { _bank: slug, source: rec.source || src, _catalogTried: true });
        try {
          if (typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType) QuantrexQFormat.getType(q);
        } catch (_) { /* */ }
        if (typeof QUESTIONS !== "undefined" && !QUESTIONS.some((x) => x && String(x.id) === String(q.id))) {
          QUESTIONS.push(q);
        }
        return q;
      });
    }
  } catch (_) { /* */ }
  if (qs.length) return qs;
  qs = (typeof QUESTIONS !== "undefined" ? QUESTIONS : []).filter((q) => q && q._bank === slug && (
    q.source === src || q.paperSource === src || q._sourceFull === src
    || norm(q.source) === want || norm(q.paperSource) === want
  ));
  return qs;
}

async function startPyqPaperMock(slug, source, freshStart, practiceOpts) {
  const src = String(source || "");
  const prac = practiceOpts && typeof practiceOpts === "object" ? practiceOpts : null;
  try {
    if (typeof enterMarksTestMode === "function") enterMarksTestMode();
    const mount = typeof getTestMountEl === "function" ? getTestMountEl() : document.getElementById("app-main");
    if (mount) {
      mount.innerHTML = (typeof qxLoadLogoHtml === "function")
        ? qxLoadLogoHtml("Opening this paper…")
        : '<div class="qx-load-logo"><p>Opening this paper…</p></div>';
    }
  } catch (_) { /* */ }
  let qs = await qxLoadPyqPaper(slug, src);
  if (!qs.length) {
    if (typeof exitMarksTestMode === "function") exitMarksTestMode();
    showToast("⚠️ Paper not found. Try another paper or hard-refresh (Ctrl+Shift+R).");
    return;
  }
  try { await buildPyqPaperIndex(slug); } catch (_) { /* */ }
  const paperMeta = typeof pyqFindPaperMeta === "function" ? pyqFindPaperMeta(slug, src) : null;
  window._pyqActivePaperMeta = paperMeta || null;
  const origLen = qs.length;
  const hasSessionFilters = !!(prac && ((prac.subjects && prac.subjects.length) || (prac.types && prac.types.length) || (prac.difficulty && prac.difficulty.length) || (prac.evaluation && prac.evaluation.length)));
  {
    const cap = paperMeta && (paperMeta.officialCount || paperMeta.count);
    if (cap && qs.length > cap && !(prac && (prac.practice || (prac.subjects && prac.subjects.length < pyqPaperSubjects(slug, src).length)))) {
      qs = qs.slice(0, cap);
    }
  }
  if (prac && (prac.practice || hasSessionFilters || (prac.subjects && prac.subjects.length))) {
    const wantSub = (prac.subjects || []).map((s) => String(s).toLowerCase());
    const wantType = prac.types || [];
    if (wantSub.length) {
      qs = qs.filter((q) => {
        const sub = String(q.subject || q.Subject || "").toLowerCase();
        if (!sub) return true;
        return wantSub.some((s) => {
          const w = String(s).toLowerCase();
          if (w === "mathematics") return /math/.test(sub);
          if (w === "biology") return /bio|botany|zoology/.test(sub);
          return sub.indexOf(w) >= 0;
        });
      });
    }
    if (wantType.length && wantType.length < 2) {
      const num = wantType.indexOf("numerical") >= 0;
      const mcq = wantType.indexOf("mcq") >= 0;
      qs = qs.filter((q) => {
        const t = String(q.questionType || q.type || "");
        const isN = /numerical|integer|nat/i.test(t) || (q.correctValue != null && !(q.options || []).length);
        if (isN) return num;
        return mcq;
      });
    }
    const wantDiff = (prac.difficulty || []).map((d) => String(d).toLowerCase());
    if (wantDiff.length) {
      qs = qs.filter((q) => {
        const d = String(q.difficulty || q.level || q.difficultyLevel || "").toLowerCase();
        if (!d) return true;
        if (/easy|1/.test(d)) return wantDiff.indexOf("easy") >= 0;
        if (/hard|3/.test(d)) return wantDiff.indexOf("hard") >= 0;
        return wantDiff.indexOf("medium") >= 0;
      });
    }
    const wantEval = prac.evaluation || [];
    if (wantEval.length) {
      const rec = pyqGetAttempt(slug, src);
      const grades = rec && rec.snapshot && Array.isArray(rec.snapshot.grades) ? rec.snapshot.grades : [];
      const byId = {};
      grades.forEach((g) => { if (g && g.id != null) byId[String(g.id)] = g; });
      if (grades.length) {
        qs = qs.filter((q) => {
          const g = byId[String(q.id)];
          const isC = !!(g && g.isCorrect);
          const isW = !!(g && g.isWrong);
          const isU = !g || g.isSkip;
          if (wantEval.indexOf("correct") >= 0 && isC) return true;
          if (wantEval.indexOf("wrong") >= 0 && isW) return true;
          if (wantEval.indexOf("unattempted") >= 0 && isU) return true;
          return false;
        });
      }
    }
    if (!qs.length) {
      showToast("⚠️ No questions match these practice filters.");
      if (typeof exitMarksTestMode === "function") exitMarksTestMode();
      return;
    }
  }
  const key = pyqPersistKey(slug, source);
  if (freshStart) marksClearSession();
  qs.forEach((q) => {
    if (q && Array.isArray(q.options) && q.options.length && !q._qxBankOptions) {
      q._qxBankOptions = q.options.slice();
    }
    if (q && q.q && !q._qxBankQ) q._qxBankQ = q.q;
    try {
      if (q && typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType) {
        QuantrexQFormat.getType(q);
      }
    } catch (_) { /* */ }
  });
  const ids = qs.map(q => q.id);
  if (typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.questionsByIds) {
    Promise.resolve().then(async () => {
      try {
        const data = await QuantrexCatalog.questionsByIds(ids.slice(0, 24));
        ((data && data.questions) || []).forEach((rec) => {
          const q = typeof getQ === "function" ? (getQ(rec.id) || getQ(rec._marksId)) : null;
          if (q && QuantrexCatalog.applyCatalogRec) QuantrexCatalog.applyCatalogRec(q, rec);
        });
      } catch (_) { /* */ }
    });
  }

  const pyqYear = typeof qYearFromSource === "function" ? qYearFromSource(source) : null;
  // Also try year from first question fields if source string lacks year
  let year = pyqYear;
  if (!year && qs[0]) {
    year = qYearFromSource(qs[0].source) || qYearFromSource(qs[0].paperSource) || qYearFromSource(qs[0].examName) || null;
  }
  const off = typeof pyqOfficialPattern === "function"
    ? pyqOfficialPattern(slug, year, qs.length, ids)
    : { catalogTotalQs: qs.length, totalMarks: qs.length * 4, durationMin: 180, pattern: "", exam: "jee_main", title: "Exam" };
  const fmt = typeof marksExamFormat === "function" ? marksExamFormat(slug) : null;
  let duration = (off.durationMin ? off.durationMin * 60 : null)
    || pyqPaperDuration(qs.length, slug, year, src);
  if (prac && !prac.practice && origLen && qs.length > 0 && qs.length < origLen) {
    duration = Math.max(15 * 60, Math.round(duration * qs.length / origLen));
  }
  const scoring = pyqPaperScoring(slug);
  const attemptKey = pyqAttemptKey(slug, source);
  // Title: JEE Advanced always official name; others keep paper source label
  let title = pyqFullPaperTitle(source, slug);
  let paperNum = null;
  if (slug === "jee_advanced" || (off && off.exam === "jee_advanced")) {
    paperNum = (typeof parseJeeAdvPaperNum === "function") ? parseJeeAdvPaperNum(source) : null;
    const yLab = year || "";
    const pLab = paperNum ? ` Paper ${paperNum}` : "";
    title = `JEE (Advanced)${yLab ? " " + yLab : ""}${pLab}`.trim();
    // Pin question types so in-test UI matches official sections
    qs.forEach(q => {
      try {
        if (typeof qxPinJeeAdvQuestionType === "function") qxPinJeeAdvQuestionType(q);
      } catch (_) { /* */ }
    });
  }
  pyqSaveAttempt(attemptKey, { status: "inProgress", slug, source, title });

  const catalogTotalQs = off.catalogTotalQs || qs.length;
  const totalMarks = off.totalMarks != null ? off.totalMarks : (qs.length * 4);
  const examKey = off.exam || (fmt && fmt.exam) || "jee_main";
  const examTitle = (examKey === "jee_advanced")
    ? "JEE (Advanced)"
    : (off.title || (fmt && fmt.title) || examKey);
  const paperFormat = off.format || (fmt && fmt.format) || slug;

  try {
    if (typeof setTestTheme === "function") setTestTheme(typeof getTestTheme === "function" ? getTestTheme() : "light");
  } catch (_) { /* */ }

  startTest(ids, title, "tests", {
    testType: "pyqmock",
    timed: !(prac && prac.practice),
    durationSec: (prac && prac.practice) ? null : duration,
    practiceMode: !!(prac && prac.practice),
    skipInstructions: true,
    skipCountdown: true,
    shuffle: false,
    // Dual format: Practice → QUANTREX (examgoal); Mock/Test → NTA (quizrr) exact shell
    marksMode: true,
    organizeJee: true,
    uiMode: (prac && prac.practice) ? "examgoal" : "quizrr",
    paperFormat: paperFormat,
    scoring,
    catalogTotalQs,
    totalMarks,
    catalogDurationMin: Math.floor(duration / 60),
    persistKey: key,
    meta: {
      slug,
      source,
      year: year,
      paperNum: paperNum,
      pattern: off.pattern || null,
      exam: examKey,
      examTitle: examTitle,
      format: paperFormat
    },
    modeLabel: (prac && prac.practice)
      ? `${examTitle}${year ? " " + year : ""} · Practice`
      : (examKey === "jee_advanced"
      ? `JEE (Advanced)${year ? " " + year : ""}${paperNum ? " Paper " + paperNum : ""} · ${Math.floor(duration / 60)} min`
      : `${examTitle}${year ? " " + year : ""} · ${Math.floor(duration / 60)} min`.replace(/\s+/g, " ").trim()),
    onComplete: (data, snapshot) => {
      marksClearSession();
      // Prefer engine snapshot; fallback to window
      const snap = snapshot || window._qxLastAttemptSnapshot || null;
      pyqSaveAttempt(attemptKey, {
        status: "completed",
        score: data.score,
        pct: data.pct,
        correct: data.correct,
        wrong: data.wrong,
        total: data.total,
        maxScore: data.maxScore,
        timeUsed: data.timeUsed,
        title: title,
        slug,
        source,
        snapshot: snap
      });
    }
  });
}

// ============ DIGITAL BOOKS (MARKS Selected — real book questions) ============
// Marks digital books — all restored
const QX_REMOVED_BOOK_IDS = new Set([]);

const QX_IRODOV_BOOK_ID = "69cfb5366ecf5579037d96a4";

function isIrodovUnlocked() {
  return true;
}

function setIrodovUnlocked() {
  try { sessionStorage.setItem("qx_irodov_unlocked", "1"); } catch (_) {}
}

function tryIrodovGate() {
  setIrodovUnlocked();
  return true;
}

const QX_BOOKS_CATALOG = {
  title: "Most Imp Digital Books for IIT-JEE",
  subtitle: "No need to buy bulky physical books. Get them all in one place!",
  engineering: [
    { id: "6a91185f41ab5aba084f4d30", title: "Most Important PYQ Based Questions", cover: "assets/book-covers/qx-pyq-important.jpg", subject: "PCM", badge: "Quantrex PYQ", exam: "JEE Main 2027", isComingSoon: false, bankSlug: "jee_main", redirectType: "subject", moduleId: "6a916235cb18ffc9d00d5aa1", count: 4289, type: "exam", tag: "PYQ 2022–2026" },
    { id: "6a0addba4b032b031e049a36", title: "Concepts Of Physics MCQ Edition [Volume 2]", cover: "assets/book-covers/hc-verma-v2.jpg", subject: "Physics", badge: "HC Verma", exam: "Physics", isComingSoon: false, bankSlug: "jee_main", redirectType: "module", moduleId: null, count: 1854, type: "exam" },
    { id: "69f9cc23681eab6d6021a4d1", title: "Concepts Of Physics MCQ Edition [Volume 1]", cover: "assets/book-covers/hc-verma-v1.jpg", subject: "Physics", badge: "HC Verma", exam: "Physics", isComingSoon: false, bankSlug: "jee_main", redirectType: "module", moduleId: null, count: 1853, type: "exam" },
    { id: "6a4ce383c59a7b462185330f", title: "Fundamentals of Organic Chemistry", cover: "assets/book-covers/organic-chemistry.jpg", subject: "Chemistry", badge: "Organic", exam: "JEE Main", isComingSoon: false, bankSlug: "jee_main", redirectType: "subject", moduleId: "6a4e21aea2f0a1af5a74e192", count: 1151, type: "exam" },
    { id: "69736c8362b916d85e52cd1b", title: "BITSAT English and Logical Reasoning Prep Guide", cover: "assets/book-covers/bitsat-english-lr.jpg", subject: "English + LR", badge: "BITSAT", exam: "BITSAT", isComingSoon: false, bankSlug: "jee_main", redirectType: "subject", moduleId: "69736e5def12da848f4c24f2", count: 1749, type: "exam" },
    { id: "69cfb5366ecf5579037d96a4", title: "Top IE IRODOV Physics Problems", cover: "assets/book-covers/irodov.jpg", subject: "Physics", badge: "Irodov", exam: "Advanced Physics", isComingSoon: false, bankSlug: "jee_main", redirectType: "subject", moduleId: "69d34798097639b3bf3ea47a", count: 158, type: "exam" },
    { id: "68f1ce4cc729e5251bd00430", title: "Most Important Selected Qs for JEE Advanced", cover: "assets/book-covers/rank-booster.jpg", subject: "PCM", badge: "Rank Booster", exam: "JEE Advanced", isComingSoon: false, bankSlug: "jee_advanced", redirectType: "module", moduleId: null, count: 2793, type: "exam" },
    { id: "68946f70ebd145663de38728", title: "99 Percentile Qs Bank for JEE Main", cover: "assets/book-covers/99-percentile.jpg", subject: "PCM", badge: "99 Percentile", exam: "High Yield", isComingSoon: false, bankSlug: "jee_main", redirectType: "subject", moduleId: "689470b46cc631f0fbe63f08", count: 3139, type: "exam" },
    { id: "6894d29d3156b1f3ca5ad0be", title: "Highly selective Backlog Qs for JEE Main", cover: "assets/book-covers/backlog-booster.jpg", subject: "PCM", badge: "Backlog Booster", exam: "Selective PYQs", isComingSoon: false, bankSlug: "jee_main", redirectType: "subject", moduleId: "6894d2f5d0af19a8bc64156f", count: 760, type: "exam" },
    { id: "69048808ef55966cf1d71f1d", title: "Olympiad workbook", cover: "assets/book-covers/olympiad.jpg", subject: "PCM", badge: "Olympiad", exam: "Olympiad", isComingSoon: false, bankSlug: "jee_main", redirectType: "module", moduleId: null, count: 1512, type: "exam" }
  ],
  medical: [
    { id: "6a507da9107f81233d9985c1", title: "Fundamentals of Organic Chemistry", cover: "assets/book-covers/organic-chemistry.jpg", description: "for NEET 2027", isComingSoon: false, subject: "Chemistry", badge: "Organic", exam: "NEET", type: "exam", count: 1151 },
    { id: "6a0adb714b032b031e049a34", title: "Concepts Of Physics MCQ Edition [Volume 2]", cover: "assets/book-covers/hc-verma-v2.jpg", description: "Objective I · II · Exercises", isComingSoon: false, subject: "Physics", badge: "HC Verma", exam: "NEET", type: "exam", count: 1854 },
    { id: "69cfb4af611e9b07b5d55e79", title: "Physics Top Irodov Problems", cover: "assets/book-covers/irodov.jpg", description: "MCQs for NEET", isComingSoon: false, subject: "Physics", badge: "Irodov", exam: "NEET", type: "exam", count: 158 },
    { id: "69a684ac213ecfafb0629c0d", title: "Biology 360/360 for NEET 2027", cover: "assets/book-covers/biology-360.jpg", description: "Botany + Zoology complete", isComingSoon: false, subject: "Biology", badge: "NEET 2027", exam: "NEET", type: "exam", count: 17415 },
    { id: "69f9ccfa011347df7bce2a38", title: "Concepts Of Physics MCQ Edition [Volume 1]", cover: "assets/book-covers/hc-verma-v1.jpg", description: "Objective I · II · Exercises", isComingSoon: false, subject: "Physics", badge: "HC Verma", exam: "NEET", type: "exam", count: 1853 },
    { id: "69a6ea53213ecfafb0629c18", title: "Top 500 JEE Main PYQs for NEET 2027", cover: "assets/book-covers/top500-physics.jpg", description: "Physics", isComingSoon: false, subject: "Physics", badge: "Top 500", exam: "NEET", type: "exam", count: 500 },
    { id: "69a6eaf1213ecfafb0629c19", title: "Top 500 JEE Main PYQs for NEET 2027", cover: "assets/book-covers/top500-chemistry.jpg", description: "Chemistry", isComingSoon: false, subject: "Chemistry", badge: "Top 500", exam: "NEET", type: "exam", count: 500 }
  ],
  curated: []
};

function filterActiveBooks(list) {
  return (list || []).filter(b => b && b.id && !QX_REMOVED_BOOK_IDS.has(b.id));
}

function mergeBooksCatalog(remote, base) {
  const b = base || QX_BOOKS_CATALOG;
  const r = remote || {};
  const out = {
    title: r.title || b.title,
    subtitle: r.subtitle || b.subtitle
  };
  ["engineering", "medical", "curated"].forEach(key => {
    const byId = new Map();
    filterActiveBooks(b[key]).forEach(book => byId.set(book.id, { ...book }));
    filterActiveBooks(r[key]).forEach(book => byId.set(book.id, { ...byId.get(book.id), ...book }));
    out[key] = Array.from(byId.values());
  });
  return out;
}

function booksForExam(catalog, examKey) {
  const c = catalog || QX_BOOKS_CATALOG;
  if (examKey === "Medical") {
    const med = filterActiveBooks(c.medical || []);
    return med.length ? med : filterActiveBooks(c.engineering || []);
  }
  const eng = filterActiveBooks(c.engineering || []);
  const curated = filterActiveBooks(c.curated || []);
  return eng.concat(curated);
}

let _booksCache = null;
let _booksPayload = { step: "list" };

function resetBooksCache() {
  _booksCache = null;
  _booksPayload = { step: "list" };
}

async function fetchBooks(force) {
  if (_booksCache && !force) return _booksCache;
  const bust = typeof QX_BUILD !== "undefined" ? QX_BUILD : Date.now();
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const to = setTimeout(() => { try { ctrl && ctrl.abort(); } catch (_) { /* */ } }, 12000);
  try {
    const res = await fetch(`data/books.json?v=${bust}`, {
      cache: "no-store",
      signal: ctrl ? ctrl.signal : undefined
    });
    clearTimeout(to);
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    if (!data || (!data.engineering && !data.medical && !data.curated)) throw new Error("empty catalog");
    _booksCache = mergeBooksCatalog(data, QX_BOOKS_CATALOG);
  } catch (e) {
    clearTimeout(to);
    console.warn("fetchBooks:", e.message || e);
    if (_booksCache && booksForExam(_booksCache, "Engineering").length) return _booksCache;
    _booksCache = mergeBooksCatalog({}, QX_BOOKS_CATALOG);
  }
  return _booksCache;
}

function openDigitalBook(book) {
  if (!book || book.isComingSoon) {
    showToast("📚 This book is coming soon!");
    return;
  }
  if (book.redirectType === "allqs" && book.subject) {
    go("allqs", { step: "chapters", subject: book.subject });
    return;
  }
  if (book.redirectType === "formula" && book.subject) {
    go("formula", { step: "chapters", subject: book.subject });
    return;
  }
  if (QX_REMOVED_BOOK_IDS.has(book.id)) {
    showToast("This book is no longer available.");
    return;
  }
  // Curated → subjects; multi-section books (JEE Advanced Rank Booster 4 sections) → modules first
  if (book.type === "curated") {
    go("books", { step: "subjects", bookId: book.id, moduleId: book.id });
    return;
  }
  // Always open modules step first when book has multiple Must-Do sections
  go("books", { step: "modules", bookId: book.id, moduleId: book.moduleId || undefined });
}

async function viewBooks(payload) {
  const p = { ..._booksPayload, ...(payload || {}) };
  try {
    const locked = typeof qxAccessBlock === "function" ? qxAccessBlock("books", p) : "";
    if (locked) return locked;
  } catch (_) { /* */ }
  if (p.bookId && QX_REMOVED_BOOK_IDS.has(p.bookId)) {
    return viewBooks({ step: "list" });
  }
  _booksPayload = p;
  const catalog = await fetchBooks();

  if (!p.bookId || p.step === "list") {
    const isMed = STATE.exam === "Medical";
    const examBooks = booksForExam(catalog, STATE.exam);
    const title = isMed ? "NEET Digital Books" : (catalog.title || "Digital Books");
    const subtitle = catalog.subtitle || "Expert-picked question banks — one tap to practice";
    const renderCard = typeof renderBookCard === "function" ? renderBookCard : (b) => `<div class="book-card">${b.title || "Book"}</div>`;
    const bookCards = examBooks.map(b => {
      try { return renderCard({ ...b, type: b.type || "exam" }); }
      catch (e) { return `<div class="book-card"><div class="book-info"><strong>${b.title || "Book"}</strong></div></div>`; }
    }).join("");
    const engCount = filterActiveBooks(catalog.engineering || []).length;
    const curatedCount = filterActiveBooks(catalog.curated || []).length;
    const medCount = filterActiveBooks(catalog.medical || []).filter(b => !b.isComingSoon).length;
    const countNote = isMed
      ? `<p class="sec-desc">No need to buy bulky physical books. Get them all in one place · ${medCount} books · HCV Objective I / II / Exercises</p>`
      : `<p class="sec-desc">${engCount} digital books${curatedCount ? ` · ${curatedCount} PYQ collections` : ""} — tap a cover to practice</p>`;

    if (isMed) {
      const recIds = ["6a507da9107f81233d9985c1", "6a0adb714b032b031e049a34", "69cfb4af611e9b07b5d55e79"];
      const rec = recIds.map((id) => examBooks.find((b) => b.id === id)).filter(Boolean);
      const recCards = rec.map((b) => { try { return renderCard({ ...b, type: b.type || "exam" }); } catch (_) { return ""; } }).join("");
      return `${topbar("Most Important Digital Books", "No need to buy bulky physical books. Get them all in one place!")}
        <div class="qx-books-lib">
          <section class="qx-books-lib-sec">
            <h3>Recommended for You</h3>
            <div class="books-scroll">${recCards || bookCards}</div>
          </section>
          <section class="qx-books-lib-sec">
            <h3>All Books</h3>
            <div class="books-grid">${bookCards || '<div class="empty">No digital books yet. <button type="button" class="btn-soft" onclick="resetBooksCache();go(\'books\')">Retry</button></div>'}</div>
          </section>
        </div>`;
    }

    return `${topbar(title, subtitle)}
      ${countNote || '<p class="sec-desc">Tap a cover to open — each book shows its own questions only.</p>'}
      <div class="books-grid">${bookCards || '<div class="empty">No digital books for this exam yet. <button type="button" class="btn-soft" onclick="resetBooksCache();go(\'books\')">Retry</button></div>'}</div>`;
  }

  let nav = null;
  try {
    nav = await fetchBookNav(p.bookId);
  } catch (e) {
    console.warn("viewBooks nav", e);
  }
  if (!nav || !nav.modules || !nav.modules.length) {
    return `${topbar("Digital Books", "")}
      <div class="empty" style="padding:28px;text-align:center;max-width:420px;margin:24px auto">
        <p style="font-weight:700;margin-bottom:8px">📚 Book catalog not loaded</p>
        <p style="font-size:13px;color:var(--gray);margin:0 0 14px;line-height:1.45">Network timeout or missing nav file. Retry, or pick another book.</p>
        <button type="button" class="btn-primary" onclick="resetBooksCache();go('books',{step:'modules',bookId:'${String(p.bookId || "").replace(/'/g, "")}'})">Retry book</button>
        <button type="button" class="btn-soft" ${mg("books", { step: "list" })} style="margin-left:8px">← All books</button>
      </div>`;
  }

  const bookTitle = nav.title || "Digital Book";
  const mod = nav.modules.find(m => m.id === p.moduleId) || nav.modules[0];
  if (!p.moduleId) p.moduleId = mod.id;

  if (p.step === "modules" && nav.type !== "curated" && nav.modules.length > 1) {
    _lastListFn = () => ({ step: "modules", bookId: p.bookId });
    const bc = breadcrumb([{ label: "Digital Books", view: "books", payload: { step: "list" } }, { label: bookTitle }]);
    const cards = nav.modules.map(m => {
      const meta = qxHcvModuleMeta(m.title);
      const ic = /objective\s*i\b/i.test(m.title) && !/ii/i.test(m.title) ? "1️⃣"
        : /objective\s*ii/i.test(m.title) ? "2️⃣"
        : /exercise/i.test(m.title) ? "✏️" : "📘";
      return `<div class="exam-card qx-hcv-mod" ${mg("books", { step: "subjects", bookId: p.bookId, moduleId: m.id })}>
        <div class="exam-card-ic">${ic}</div>
        <strong>${m.title}</strong>
        <small>${meta.hint || m.subtitle || ""}${m.count ? ` · ${m.count.toLocaleString()} questions` : ""}</small>
      </div>`;
    }).join("");
    const hcvNote = /concepts of physics|hc verma/i.test(bookTitle)
      ? `<p class="result-count" style="margin:0 0 12px">Book order: <strong>Objective I → Objective II → Exercises</strong> — same as HC Verma.</p>`
      : "";
    return `${topbar(bookTitle, nav.exam || "Quantrex Digital")}${bc}${hcvNote}<div class="exam-grid">${cards}</div>`;
  }

  if (p.step === "modules" && nav.modules.length === 1) {
    return viewBooks({ ...p, step: "subjects", moduleId: nav.modules[0].id });
  }

  if (p.step === "subjects" || !p.subjectId) {
    _lastListFn = () => ({ step: "subjects", bookId: p.bookId, moduleId: p.moduleId });
    const bc = breadcrumb([
      { label: "Digital Books", view: "books", payload: { step: "list" } },
      { label: bookTitle, view: "books", payload: { step: nav.modules.length > 1 ? "modules" : "subjects", bookId: p.bookId, moduleId: p.moduleId } },
      { label: mod.title }
    ]);
    const cards = (mod.subjects || []).map(s => `
      <div class="subj-card" ${mg("books", { step: "chapters", bookId: p.bookId, moduleId: p.moduleId, subjectId: s.id, subjectName: s.name })}>
        <span class="subj-ic">${subjectIcon(s.name, s.icon)}</span>
        <div><strong>${s.name}</strong><small>${(s.chapters || []).length} chapters · ${s.count.toLocaleString()} questions</small></div>
      </div>`).join("");
    return `${topbar(mod.title, bookTitle)}${bc}<div class="subj-grid">${cards}</div>`;
  }

  const subj = (mod.subjects || []).find(s => s.id === p.subjectId);
  if (!subj) return viewBooks({ step: "subjects", bookId: p.bookId, moduleId: p.moduleId });

  if (p.step === "chapters" || (!p.chapterId && p.step !== "exercises" && p.step !== "questions")) {
    _lastListFn = () => ({ step: "chapters", bookId: p.bookId, moduleId: p.moduleId, subjectId: p.subjectId, subjectName: p.subjectName });
    const bc = breadcrumb([
      { label: "Digital Books", view: "books", payload: { step: "list" } },
      { label: bookTitle, view: "books", payload: { step: nav.modules.length > 1 ? "modules" : "subjects", bookId: p.bookId, moduleId: p.moduleId } },
      { label: mod.title, view: "books", payload: { step: "subjects", bookId: p.bookId, moduleId: p.moduleId } },
      { label: subj.name }
    ]);
    const hasEx = !!(nav.hasExercises || (subj.chapters || []).some(c => c.exercises && c.exercises.length));
    const cards = (subj.chapters || []).map((c, idx) => {
      const n = Number(c.count) || 0;
      const g = ["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7"][idx % 8];
      // Black Book style: open chapter → Exercise 1–5 list
      const nextStep = (hasEx && c.exercises && c.exercises.length) ? "exercises" : "questions";
      return `<button type="button" class="qx-topic-card qx-topic-rich qx-topic-${g} ch-card qx-ch-card-rich" ${mg("books", { step: nextStep, bookId: p.bookId, moduleId: p.moduleId, subjectId: p.subjectId, subjectName: subj.name, chapterId: c.id, chapterName: c.name, chapterKey: c.key })}>
        <div class="qx-topic-top">
          <span class="qx-topic-ic" aria-hidden="true">${cpyqbChapterIcon(null, subj.name, c.name)}</span>
        </div>
        <strong class="qx-topic-name">${c.name}</strong>
        <div class="qx-topic-details">
          <span class="qx-ch-pill qs">${n > 0 ? n.toLocaleString() + " Qs" : "Empty"}</span>
          ${hasEx && c.exercises ? `<span class="qx-ch-pill qs">5 Exercises</span>` : ""}
        </div>
      </button>`;
    }).join("");
    const exNote = hasEx
      ? `<p class="result-count" style="margin:0 0 12px">Open a chapter → choose <strong>Exercise 1–5</strong> (Single / Multiple / Comprehension / Matrix Match / Integer) like Black Book practice.</p>`
      : ((subj.chapters || []).some(c => /^Exercise\s*\d/i.test(c.name || ""))
        ? `<p class="result-count" style="margin:0 0 12px">This chapter has <strong>${(subj.chapters || []).length} exercises</strong> · total <strong>${Number(subj.count || 0).toLocaleString()}</strong> questions (split across exercises — open each Exercise separately).</p>`
        : "");
    return `${topbar(subj.name, mod.title + " · " + bookTitle)}${bc}${exNote}<div class="ch-grid qx-topic-grid qx-topic-grid-rich">${cards}</div>`;
  }

  const ch = (subj.chapters || []).find(c => c.id === p.chapterId || c.key === p.chapterKey);

  // ── Black Book: Exercise 1–5 list (like quantrex-academy.vercel.app) ──
  if (p.step === "exercises" || (ch && ch.exercises && ch.exercises.length && !p.exerciseId && p.step !== "questions")) {
    const chapterName = p.chapterName || (ch && ch.name) || "Chapter";
    const exercises = (ch && ch.exercises) || [];
    _lastListFn = () => ({ step: "exercises", bookId: p.bookId, moduleId: p.moduleId, subjectId: p.subjectId, subjectName: subj.name, chapterId: p.chapterId, chapterName, chapterKey: p.chapterKey || (ch && ch.key) });
    const bc = breadcrumb([
      { label: "Digital Books", view: "books", payload: { step: "list" } },
      { label: bookTitle, view: "books", payload: { step: nav.modules.length > 1 ? "modules" : "subjects", bookId: p.bookId, moduleId: p.moduleId } },
      { label: mod.title, view: "books", payload: { step: "subjects", bookId: p.bookId, moduleId: p.moduleId } },
      { label: subj.name, view: "books", payload: { step: "chapters", bookId: p.bookId, moduleId: p.moduleId, subjectId: p.subjectId, subjectName: subj.name } },
      { label: chapterName }
    ]);
    const cards = exercises.map((ex, idx) => {
      const n = Number(ex.count) || 0;
      const g = ["g0", "g1", "g2", "g3", "g4"][idx % 5];
      const disabled = n <= 0;
      const payload = {
        step: "questions",
        bookId: p.bookId,
        moduleId: p.moduleId,
        subjectId: p.subjectId,
        subjectName: subj.name,
        chapterId: p.chapterId,
        chapterName: chapterName + " · " + (ex.name || ("Exercise " + (idx + 1))),
        chapterKey: ex.key,
        exerciseId: ex.id,
        exerciseName: ex.name
      };
      if (disabled) {
        return `<div class="qx-topic-card qx-topic-rich qx-topic-${g} ch-card qx-ch-card-rich" style="opacity:.55;cursor:not-allowed">
          <div class="qx-topic-top"><span class="qx-topic-ic">📘</span></div>
          <strong class="qx-topic-name">${ex.name || ("Exercise " + (idx + 1))}</strong>
          <div class="qx-topic-details"><span class="qx-ch-pill qs">Updating…</span></div>
        </div>`;
      }
      return `<button type="button" class="qx-topic-card qx-topic-rich qx-topic-${g} ch-card qx-ch-card-rich" ${mg("books", payload)}>
        <div class="qx-topic-top"><span class="qx-topic-ic">▶️</span></div>
        <strong class="qx-topic-name">${ex.name || ("Exercise " + (idx + 1))}</strong>
        <div class="qx-topic-details"><span class="qx-ch-pill qs">${n.toLocaleString()} Qs</span></div>
      </button>`;
    }).join("");
    return `${topbar(chapterName, bookTitle + " · Select Exercise 1–5")}
      ${bc}
      <p class="result-count" style="margin:0 0 12px"><strong>5 Exercises</strong> — same layout as Black Book interactive practice.</p>
      <div class="ch-grid qx-topic-grid qx-topic-grid-rich">${cards}</div>`;
  }

  // If exercise chosen via exercises list, prefer exercise key
  let chapterKey = p.chapterKey || (ch && ch.key);
  let chapterName = p.chapterName || (ch && ch.name) || "Chapter";
  if (p.exerciseId && ch && Array.isArray(ch.exercises)) {
    const ex = ch.exercises.find(e => e.id === p.exerciseId || e.key === p.chapterKey);
    if (ex) {
      chapterKey = ex.key || chapterKey;
      chapterName = (ch.name || chapterName) + " · " + (ex.name || p.exerciseName || "");
    }
  }
  if (!chapterKey) return viewBooks({ step: "chapters", bookId: p.bookId, moduleId: p.moduleId, subjectId: p.subjectId });

  try {
    await loadBookChapter(p.bookId, chapterKey);
  } catch (e) {
    console.warn("loadBookChapter", e);
  }
  // Strict filter: only this exercise pack (never whole chapter dump)
  let qs = getBookQuestions(p.bookId, chapterKey);
  if ((!qs || !qs.length) && ch && ch.key && ch.key !== chapterKey) {
    try { await loadBookChapter(p.bookId, ch.key); } catch (_) { /* */ }
    qs = getBookQuestions(p.bookId, ch.key);
  }
  qs = (qs || []).filter(q => String(q._chapterKey || "") === String(chapterKey));
  // Keep official book LaTeX as stored — render at paint time (Mx.html).
  // In-memory cleanQuestionText glued chemistry names and dumped KaTeX HTML.
  _lastListFn = () => ({ step: "questions", bookId: p.bookId, moduleId: p.moduleId, subjectId: p.subjectId, subjectName: subj.name, chapterId: p.chapterId, chapterName, chapterKey });
  const bc = breadcrumb([
    { label: "Digital Books", view: "books", payload: { step: "list" } },
    { label: bookTitle, view: "books", payload: { step: nav.modules.length > 1 ? "modules" : "subjects", bookId: p.bookId, moduleId: p.moduleId } },
    { label: mod.title, view: "books", payload: { step: "subjects", bookId: p.bookId, moduleId: p.moduleId } },
    { label: subj.name, view: "books", payload: { step: "chapters", bookId: p.bookId, moduleId: p.moduleId, subjectId: p.subjectId, subjectName: subj.name } },
    { label: chapterName }
  ]);
  const testMeta = { title: `${subj.name} · ${chapterName} · Book Test`, returnTo: "books", limit: 30, exam: p.bookId, subject: subj.name, chapter: chapterName, bookId: p.bookId, chapterKey };
  const qHead = `${topbar(subj.name + " · " + chapterName, bookTitle + " · " + (qs.length || 0) + " questions in this exercise only")}`;
  if (!qs.length) {
    return `${qHead}${bc}<div class="empty" style="padding:24px;text-align:center">
      <p style="font-weight:700">No questions loaded for this exercise</p>
      <p style="font-size:13px;color:var(--gray)">File may be missing or network timed out.</p>
      <button type="button" class="btn-primary" onclick="go('books',${JSON.stringify({ step: "questions", bookId: p.bookId, moduleId: p.moduleId, subjectId: p.subjectId, subjectName: subj.name, chapterId: p.chapterId, chapterName, chapterKey }).replace(/"/g, "&quot;")})">Retry</button>
      <button type="button" class="btn-soft" ${mg("books", { step: "chapters", bookId: p.bookId, moduleId: p.moduleId, subjectId: p.subjectId, subjectName: subj.name })} style="margin-left:8px">← Chapters</button>
    </div>`;
  }
  return `${qHead}${bc}${renderQList(qs, _listPage, testMeta)}`;
}

function bindBooksOpen() {}

// ============ QUICK CONCEPTS (MARKS: Subject → Chapter → Topic → Concepts + MCQ Examples) ============
let _qcPayload = { step: "subjects" };
const _qcContentCache = {};
let _qcExampleSeq = 920000000;

function qcRevisionTitle() {
  return STATE.exam === "Medical" ? "NEET Revision Notes" : "JEE Main Revision Notes";
}

function groupQcConcepts(concepts) {
  const groups = [];
  const map = new Map();
  (concepts || []).slice().sort((a, b) => (a.position || 0) - (b.position || 0)).forEach(c => {
    const title = String(c.title || "").trim() || "Concept";
    if (!map.has(title)) {
      const g = { title, blocks: [] };
      map.set(title, g);
      groups.push(g);
    }
    map.get(title).blocks.push(c);
  });
  return groups;
}

function qcConceptBodyHtml(body, groupTitle) {
  let html = String(body || "");
  const m = html.match(/^\s*<h3[^>]*>([\s\S]*?)<\/h3>/i);
  if (m && groupTitle) {
    const inner = m[1].replace(/<[^>]+>/g, "").trim().toLowerCase();
    if (inner === groupTitle.trim().toLowerCase()) html = html.slice(m[0].length);
  }
  return typeof Mx !== "undefined" ? Mx.html(html) : html;
}

function renderQcConceptSections(concepts) {
  const groups = groupQcConcepts(concepts);
  if (!groups.length) return '<div class="empty">No concept notes.</div>';
  return groups.map(g => `
    <section class="qc-section">
      <h2 class="qc-section-title">${g.title}</h2>
      <div class="qc-section-body">
        ${g.blocks.map(b => `<div class="qc-concept-block qx-content">${qcConceptBodyHtml(b.conceptBody || b.body || "", g.title)}</div>`).join("")}
      </div>
    </section>`).join("");
}

function qcStubExample(ex, meta, idx) {
  const rec = {
    id: _qcExampleSeq++,
    _marksId: ex._id,
    _bank: "qc_example",
    _needsFull: true,
    _live: true,
    subject: meta.subject || "",
    chapter: meta.chapter || "",
    exam: typeof STATE !== "undefined" ? STATE.exam : "Engineering",
    q: ex.title || ex.q || "",
    options: ["A", "B", "C", "D"],
    answer: 0,
    solution: "",
    source: "Quick Concepts"
  };
  if (typeof QUESTIONS !== "undefined") QUESTIONS.push(rec);
  return rec;
}

async function loadQcExampleQuestions(examples, meta) {
  const stubs = (examples || []).map((ex, i) => qcStubExample(ex, meta, i));
  if (!stubs.length) return [];
  if (typeof MarksLive === "undefined") return stubs;
  try {
    await MarksLive.ensureToken();
    const ids = stubs.map(s => s._marksId).filter(Boolean);
    const fetched = await MarksLive.fetchQuestionsByMarksIds(ids, {
      subject: meta.subject,
      chapter: meta.chapter,
      bank: "qc_example",
      source: "Quick Concepts"
    });
    const byMarks = new Map(fetched.map(q => [q._marksId, q]));
    return stubs.map(s => byMarks.get(s._marksId) || s);
  } catch (e) {
    return stubs;
  }
}

function renderQcExampleMcq(q, index) {
  const qid = q.id;
  const typeBadge = typeof QuantrexQFormat !== "undefined" ? QuantrexQFormat.typeBadgeHtml(q) : "";
  const optsClass = typeof QuantrexQFormat !== "undefined"
    ? QuantrexQFormat.practiceOptsContainerClass(q)
    : "qx-prac-opts qc-ex-opts";
  const opts = typeof QuantrexQFormat !== "undefined"
    ? QuantrexQFormat.renderOptions(q, { selected: null, done: false })
    : (q.options || []).map((o, i) => `<button type="button" class="qx-prac-opt" data-prac-opt="${i}"><span class="mtk-opt-letter qx-opt-circle qx-prac-letter" aria-hidden="true">${String.fromCharCode(65 + i)}</span><span class="qx-prac-opt-text qx-content">${o}</span></button>`).join("");
  const qBody = typeof Mx !== "undefined" ? Mx.html(q.q || "") : (q.q || "");
  return `<article class="qc-example-mcq" data-qid="${qid}">
    <div class="qc-ex-head">
      <span class="qc-ex-num">Example ${index + 1}</span>
      ${typeBadge}
    </div>
    <div class="qc-ex-q qx-content">${qBody}</div>
    <div class="${optsClass} qc-ex-opts">${opts}</div>
    <div class="qc-ex-actions">
      <button type="button" class="btn-primary sm qc-ex-submit" id="qxPracSubmit" disabled>Check Answer</button>
      <button type="button" class="btn-soft sm qc-ex-sol-btn" data-qc-sol="${qid}">View Solution</button>
    </div>
    <div class="qc-ex-result"></div>
    <div class="qc-ex-sol"></div>
  </article>`;
}

function renderQcExamplesBlock(questions) {
  if (!questions || !questions.length) return "";
  return `<section class="qc-examples-block">
    <h2 class="qc-examples-title">Examples</h2>
    <p class="qc-examples-sub">Practice MCQs — same format as chapter questions</p>
    <div class="qc-examples-mcq">${questions.map(renderQcExampleMcq).join("")}</div>
  </section>`;
}

async function answerQcExample(qid, response) {
  if (response == null) return;
  const ctx = window._qcExampleCtx || { selected: {}, done: {} };
  window._qcExampleCtx = ctx;
  let q = typeof getQ === "function" ? getQ(qid) : null;
  if (!q) return;
  if (typeof QuantrexQFormat !== "undefined" && !QuantrexQFormat.isAnswered(q, response)) return;
  if (typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion) {
    try {
      q = await QuantrexCatalog.fillQuestion(q);
    } catch (e) { /* keep stub */ }
  }
  const card = document.querySelector(`.qc-example-mcq[data-qid="${qid}"]`);
  if (!card) return;
  ctx.done[qid] = true;
  ctx.selected[qid] = response;
  if (typeof QuantrexQFormat !== "undefined") {
    QuantrexQFormat.applyPracticeResult(card, q, response);
  }
  const graded = typeof QuantrexQFormat !== "undefined"
    ? QuantrexQFormat.grade(q, response)
    : { correct: response === q.answer, partial: false };
  if (typeof STATE !== "undefined" && STATE.markSolved) STATE.markSolved(qid, graded.correct || graded.partial);
  const resEl = card.querySelector(".qc-ex-result");
  if (resEl && typeof qxPracticeResultHtml === "function") {
    resEl.innerHTML = qxPracticeResultHtml(q, response);
    if (typeof Mx !== "undefined") Mx.afterRender(resEl);
  }
  const submit = card.querySelector(".qc-ex-submit");
  if (submit) submit.remove();
}

function bindQcExamples(root) {
  const scope = root || document.getElementById("app-main");
  if (!scope || !scope.querySelector(".qc-examples-mcq")) return;
  window._qcExampleCtx = window._qcExampleCtx || { selected: {}, done: {} };
  const ctx = window._qcExampleCtx;
  scope.querySelectorAll(".qc-example-mcq").forEach(card => {
    const qid = parseInt(card.dataset.qid, 10);
    if (!qid || card._qcBound) return;
    card._qcBound = true;
    if (typeof QuantrexQFormat !== "undefined") {
      QuantrexQFormat.bindPractice(card, ctx, qid, answerQcExample);
    }
    const solBtn = card.querySelector("[data-qc-sol]");
    if (solBtn) {
      solBtn.onclick = async () => {
        let q = typeof getQ === "function" ? getQ(qid) : null;
        if (!q) return;
        if (typeof QuantrexCatalog !== "undefined" && QuantrexCatalog.fillQuestion) {
          try { q = await QuantrexCatalog.fillQuestion(q); } catch (e) { /* ignore */ }
        }
        const solEl = card.querySelector(".qc-ex-sol");
        if (!solEl) return;
        if (typeof qxSolutionBlockHtml === "function" && typeof qxHasSolution === "function" && qxHasSolution(q)) {
          solEl.innerHTML = qxSolutionBlockHtml(q);
          if (typeof Mx !== "undefined") Mx.afterRender(solEl);
        } else {
          solEl.innerHTML = '<p class="empty">Solution loading… <button type="button" class="btn-soft sm" data-qc-retry-sol="' + qid + '">Retry</button></p>';
          solEl.querySelector("[data-qc-retry-sol]")?.addEventListener("click", () => solBtn.click());
        }
      };
    }
  });
  if (typeof Mx !== "undefined") Mx.afterRender(scope.querySelector(".qc-examples-mcq"));
  scope.querySelectorAll(".qc-example-mcq").forEach(card => {
    const qid = parseInt(card.dataset.qid, 10);
    const q = typeof getQ === "function" ? getQ(qid) : null;
    if (!q || typeof QuantrexCatalog === "undefined" || !QuantrexCatalog.fillQuestion) return;
    const needs = typeof QuantrexCatalog.needsFill === "function" ? QuantrexCatalog.needsFill(q) : false;
    if (!needs) return;
    QuantrexCatalog.fillQuestion(q).then(hq => {
      if (!hq || ctx.done[qid]) return;
      const qEl = card.querySelector(".qc-ex-q");
      const optsEl = card.querySelector(".qc-ex-opts");
      if (qEl) qEl.innerHTML = typeof Mx !== "undefined" ? Mx.html(hq.q || "") : (hq.q || "");
      if (optsEl && typeof QuantrexQFormat !== "undefined") {
        optsEl.className = QuantrexQFormat.practiceOptsContainerClass(hq) + " qc-ex-opts";
        optsEl.innerHTML = QuantrexQFormat.renderOptions(hq, { selected: ctx.selected[qid], done: !!ctx.done[qid] });
        card._qcBound = false;
        bindQcExamples(scope);
      }
      if (typeof Mx !== "undefined") Mx.afterRender(card);
    }).catch(() => {});
  });
}

async function fetchQcContent(subjectId, chapterId, topicId) {
  const key = `${subjectId}::${chapterId}::${topicId}`;
  if (_qcContentCache[key]) return _qcContentCache[key];
  try {
    const res = await fetch(`data/quick_concepts/${subjectId}/${chapterId}/${topicId}.json`);
    if (!res.ok) throw new Error(res.status);
    _qcContentCache[key] = await res.json();
  } catch (e) {
    _qcContentCache[key] = null;
  }
  return _qcContentCache[key];
}

async function viewQuickConcepts(payload) {
  const p = { ..._qcPayload, ...(payload || {}) };
  _qcPayload = p;
  const nav = await fetchNav("quick_concepts");
  const qcLabel = qcRevisionTitle();

  if (p.step === "subjects" || !p.subjectId) {
    const cards = nav.map(s => `
      <div class="subj-card" ${mg("quickconcepts", { step: "chapters", subjectId: s.id, subjectName: s.name })}>
        <span class="subj-ic">${subjectIcon(s.name, s.icon)}</span>
        <div><strong>${s.name}</strong><small>${s.chaptersCount || (s.chapters || []).length} chapters · ${s.topicsCount || 0} topics</small></div>
      </div>`).join("");
    return `${topbar(qcLabel, "Concept-wise notes with MCQ examples")}
      <div class="subj-grid">${cards || '<div class="empty">Quick Concepts syncing…</div>'}</div>`;
  }

  const subj = nav.find(s => s.id === p.subjectId);
  if (!subj) return viewQuickConcepts({ step: "subjects" });

  if (p.step === "chapters" || !p.chapterId) {
    const bc = breadcrumb([
      { label: qcLabel, view: "quickconcepts", payload: { step: "subjects" } },
      { label: subj.name }
    ]);
    const cards = (subj.chapters || []).map((c, idx) => {
      const g = ["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7"][idx % 8];
      const tc = c.topicsCount || (c.topics || []).length || 0;
      return `<button type="button" class="qx-topic-card qx-topic-rich qx-topic-${g} ch-card qx-ch-card-rich" ${mg("quickconcepts", { step: "topics", subjectId: p.subjectId, subjectName: subj.name, chapterId: c.id, chapterName: c.name })}>
        <div class="qx-topic-top">
          <span class="qx-topic-ic" aria-hidden="true">${cpyqbChapterIcon(null, subj.name, c.name)}</span>
        </div>
        <strong class="qx-topic-name">${c.name}</strong>
        <div class="qx-topic-details">
          <span class="qx-ch-pill qs">${tc} topics</span>
        </div>
      </button>`;
    }).join("");
    return `${topbar(subj.name, "Select a chapter")}${bc}<div class="ch-grid qx-topic-grid qx-topic-grid-rich">${cards}</div>`;
  }

  const ch = (subj.chapters || []).find(c => c.id === p.chapterId);
  if (!ch) return viewQuickConcepts({ step: "chapters", subjectId: p.subjectId, subjectName: subj.name });

  if (p.step === "topics" || !p.topicId) {
    const bc = breadcrumb([
      { label: qcLabel, view: "quickconcepts", payload: { step: "subjects" } },
      { label: subj.name, view: "quickconcepts", payload: { step: "chapters", subjectId: p.subjectId, subjectName: subj.name } },
      { label: ch.name }
    ]);
    const cards = (ch.topics || []).map(t => `
      <div class="ch-card qx-topic-card" ${mg("quickconcepts", { step: "content", subjectId: p.subjectId, subjectName: subj.name, chapterId: p.chapterId, chapterName: ch.name, topicId: t.id, topicTitle: t.title })}>
        <div class="qx-topic-body"><strong>${t.title}</strong></div>
      </div>`).join("");
    return `${topbar(ch.name, subj.name)}${bc}<div class="ch-grid qx-topic-grid">${cards || '<div class="empty">No topics for this chapter yet.</div>'}</div>`;
  }

  const content = await fetchQcContent(p.subjectId, p.chapterId, p.topicId);
  const bc = breadcrumb([
    { label: qcLabel, view: "quickconcepts", payload: { step: "subjects" } },
    { label: subj.name, view: "quickconcepts", payload: { step: "chapters", subjectId: p.subjectId, subjectName: subj.name } },
    { label: ch.name, view: "quickconcepts", payload: { step: "topics", subjectId: p.subjectId, subjectName: subj.name, chapterId: p.chapterId, chapterName: ch.name } },
    { label: p.topicTitle || "Topic" }
  ]);
  if (!content) {
    return `${topbar(p.topicTitle || "Topic", ch.name)}${bc}
      <div class="empty">Topic content syncing — run extract_qc_content.py</div>`;
  }
  const exampleQs = await loadQcExampleQuestions(content.examples, {
    subject: subj.name,
    chapter: ch.name,
    topic: p.topicTitle || content.title || ""
  });
  const conceptHtml = renderQcConceptSections(content.concepts);
  const examplesHtml = renderQcExamplesBlock(exampleQs);
  return `<div class="qc-topic-page">
    ${topbar(p.topicTitle || content.title || "Topic", `${ch.name} · ${subj.name}`)}${bc}
    <div class="qc-content">${conceptHtml}</div>
    ${examplesHtml}
  </div>`;
}

// ============ MARKS-STYLE DASHBOARD (screens 407 + 408 flow) ============
/** Marks-style Medical home: Physics / Chem / Zoology / Botany + NCERT + Tests + Revision */
function renderMedicalMarksHomeExtras(rfcNav) {
  if (STATE.exam !== "Medical") return "";
  // Live counts from BANK_INDEX when available
  const neetMeta = (typeof BANK_INDEX !== "undefined" && BANK_INDEX.neet) || {};
  const neetCount = Number(neetMeta.count) || 41723;
  const subjMeta = {
    Physics: { icon: "⚛️", tone: "#2563eb", n: 7445, ch: 32 },
    Chemistry: { icon: "🧪", tone: "#ea580c", n: 16863, ch: 33 },
    Botany: { icon: "🌿", tone: "#16a34a", n: 8111, ch: 19 },
    Zoology: { icon: "🐾", tone: "#ca8a04", n: 9304, ch: 19 }
  };
  const subjCards = ["Physics", "Chemistry", "Botany", "Zoology"].map((name) => {
    const s = subjMeta[name];
    return `
    <button type="button" class="qx-med-subj-card qx-motion-card" style="--med-tone:${s.tone}"
      ${mg("allqs", { step: "chapters", subject: name })}>
      <span class="qx-med-subj-ic" aria-hidden="true">${subjectIcon(name, null, 40)}</span>
      <strong>${name.toUpperCase()}</strong>
      <small>${s.n.toLocaleString()} questions · ${s.ch} chapters</small>
      <span class="qx-med-subj-go">Open full bank →</span>
    </button>`;
  }).join("");

  const revisionBuckets = `
    <div class="qx-med-rev-grid">
      <button type="button" class="qx-med-rev-card oops" ${mg("revision", { step: "subjects", zone: "oops" })}>
        ${qxRoboWrap("!", "fault", "md")}
        <strong>${QX_UX.fault}</strong>
        <small>${QX_UX.faultSub}</small>
      </button>
      <button type="button" class="qx-med-rev-card blur" ${mg("revision", { step: "subjects", zone: "blur" })}>
        ${qxRoboWrap("~", "drift", "md")}
        <strong>${QX_UX.drift}</strong>
        <small>${QX_UX.driftSub}</small>
      </button>
      <button type="button" class="qx-med-rev-card mem" ${mg("revision", { step: "subjects", zone: "memory" })}>
        ${qxRoboWrap("*", "vault", "md")}
        <strong>${QX_UX.core}</strong>
        <small>${QX_UX.coreSub}</small>
      </button>
    </div>`;

  const testsBlock = `
    <div class="qx-med-tests">
      <button type="button" class="qx-med-test-card" ${mg("pyqmock", { exam: "neet" })}>
        <strong>${QX_UX.replay}</strong>
        <small>Full papers for a second-pass score push</small>
      </button>
      <button type="button" class="qx-med-test-card" ${mg("custom", { step: "landing" })}>
        <strong>Build a Paper</strong>
        <small>Custom chapter mix · Medical</small>
      </button>
      <button type="button" class="qx-med-test-card" ${mg("pyqmock", { exam: "neet" })}>
        <strong>PYQ Mock Tests</strong>
        <small>Full-length NEET / AIIMS / JIPMER papers</small>
      </button>
      <button type="button" class="qx-med-test-card" ${mg("testseries", {})}>
        <strong>NEET 2027 Test Series</strong>
        <small>Scheduled full tests</small>
      </button>
    </div>`;

  const notebooks = `
    <div class="qx-med-notebooks">
      <button type="button" class="qx-med-nb-card" ${mg("notebook", { tab: "bookmarks" })}>
        <strong>${QX_UX.saved}</strong>
        <small>All bookmarked questions</small>
      </button>
      <button type="button" class="qx-med-nb-card" ${mg("notebook", { tab: "chapter" })}>
        <strong>${QX_UX.binders}</strong>
        <small>Bookmarks arranged chapter-wise</small>
      </button>
      <button type="button" class="qx-med-nb-card" ${mg("notebook", { tab: "notes" })}>
        <strong>${QX_UX.notes}</strong>
        <small>Questions you annotated</small>
      </button>
    </div>`;

  return `
    <div class="qx-med-home">
      <div class="qx-med-goal">
        <strong>${QX_UX.target}</strong>
        <span>0 / 15 Qs · Medical track</span>
        <div class="qx-med-goal-bar"><i style="width:0%"></i></div>
      </div>
      <div class="marks-section">
        <div class="marks-sec-head"><h3>${QX_UX.allBank}</h3>
          <a href="#" ${mg("allqs", { step: "subjects" })}>View all PCB →</a>
        </div>
        <p class="sec-desc">Physics · Chemistry · Botany · Zoology · ${neetCount.toLocaleString()} complete questions</p>
        <div class="qx-med-subj-grid">${subjCards}</div>
      </div>
      ${qxRfcSubjectSectionHtml(rfcNav || [])}
      <div class="marks-section">
        <div class="marks-sec-head"><h3>${QX_UX.review}</h3></div>
        <p class="sec-desc">${QX_UX.fault} · ${QX_UX.drift} · ${QX_UX.core}</p>
        ${revisionBuckets}
      </div>
      <div class="marks-section">
        <div class="marks-sec-head"><h3>Tests</h3>
          <a href="#" ${mg("testseries", {})}>View All →</a>
        </div>
        ${testsBlock}
      </div>
      <div class="marks-section">
        <div class="marks-sec-head"><h3>Notebooks</h3></div>
        ${notebooks}
      </div>
      <div class="marks-section">
        <div class="marks-sec-head"><h3>${QX_UX.library}</h3>
          <a href="#" ${mg("books", { step: "list" })}>View All →</a>
        </div>
        <p class="sec-desc">HC Verma Objective I / II / Exercises · Organic · Irodov · Biology 360 · Top 500</p>
        <div id="qxMedBooksMount" class="qx-med-books-mount">Loading books…</div>
      </div>
      <div class="marks-section qx-med-board-banner">
        <div class="marks-sec-head"><h3>CBSE Board PYQs</h3>
          <a href="#" ${mg("board", { step: "subjects", board: "CBSE" })}>Open →</a>
        </div>
        <p class="sec-desc">Physics · Chemistry · Biology — chapter-wise board practice</p>
        <div class="qx-ncert-tools">
          <button type="button" class="qx-ncert-tool qx-folder-card" ${mg("board", { step: "subjects", board: "CBSE" })}>
            ${typeof qxAnimCover === "function" ? qxAnimCover("ncert", "B", "CBSE") : ""}
            <strong>CBSE Board</strong><small>Chapter-wise PYQs</small>
          </button>
          <button type="button" class="qx-ncert-tool qx-folder-card" ${mg("board", { step: "subjects", board: "HSC" })}>
            ${typeof qxAnimCover === "function" ? qxAnimCover("exemplar", "H", "HSC") : ""}
            <strong>HSC (Maharashtra)</strong><small>State board PYQs</small>
          </button>
        </div>
      </div>
      <div class="marks-section qx-med-ncert-banner">
        <div class="marks-sec-head"><h3>${QX_UX.ncertBox}</h3>
          <a href="#" ${mg("ncert", { step: "subjects", ncertKind: "lblq" })}>Practice Now →</a>
        </div>
        <p class="sec-desc">${QX_UX.lineScan} · ${QX_UX.textPlus} · ${QX_UX.figureLab} · Physics · Chemistry · Botany · Zoology</p>
        <div class="qx-ncert-tools">
          <button type="button" class="qx-ncert-tool qx-folder-card" ${mg("ncert", { step: "subjects", ncertKind: "lblq" })}>
            ${qxAnimCover("ncert", QX_UX.lineScan)}
            <strong>${QX_UX.lineScan}</strong><small>Every textbook line, mapped</small>
          </button>
          <button type="button" class="qx-ncert-tool qx-folder-card" ${mg("ncert", { step: "subjects", ncertKind: "ncoq" })}>
            ${qxAnimCover("exemplar", QX_UX.textPlus)}
            <strong>${QX_UX.textPlus}</strong><small>In-text · exercise · extra set</small>
          </button>
          <button type="button" class="qx-ncert-tool qx-folder-card" ${mg("ncert", { step: "subjects", ncertKind: "dbq" })}>
            ${qxAnimCover("diagram", QX_UX.figureLab)}
            <strong>${QX_UX.figureLab}</strong><small>Figures · labelling · cycles</small>
          </button>
        </div>
      </div>
      <div class="marks-section qx-med-dpp-banner">
        <div class="marks-sec-head"><h3>${QX_UX.drills}</h3>
          <a href="#" ${mg("dpp", { step: "subjects" })}>View DPPs →</a>
        </div>
        <p class="sec-desc">Easy · Moderate · Tough · Physics · Chemistry · Botany · Zoology</p>
        <div class="qx-med-dpp-subj">
          <button type="button" class="qx-med-fc-chip phy" ${mg("dpp", { step: "chapters", subject: "Physics" })}>${qxAnimCover("physics", "P", "DPP")} Physics</button>
          <button type="button" class="qx-med-fc-chip chem" ${mg("dpp", { step: "chapters", subject: "Chemistry" })}>${qxAnimCover("chemistry", "C", "DPP")} Chemistry</button>
          <button type="button" class="qx-med-fc-chip bot" ${mg("dpp", { step: "chapters", subject: "Botany" })}>${qxAnimCover("botany", "B", "DPP")} Botany</button>
          <button type="button" class="qx-med-fc-chip zoo" ${mg("dpp", { step: "chapters", subject: "Zoology" })}>${qxAnimCover("zoology", "Z", "DPP")} Zoology</button>
        </div>
      </div>
      <div class="marks-section">
        <div class="marks-sec-head"><h3>Formula Cards</h3>
          <a href="#" ${mg("formula", { step: "subjects" })}>View All →</a>
        </div>
        <div class="qx-med-fc-row">
          <button type="button" class="qx-med-fc-chip phy" ${mg("formula", { step: "chapters", subject: "Physics" })}>${qxAnimCover("physics", "P", "Formula")} Physics</button>
          <button type="button" class="qx-med-fc-chip chem" ${mg("formula", { step: "chapters", subject: "Chemistry" })}>${qxAnimCover("chemistry", "C", "Formula")} Chemistry</button>
          <button type="button" class="qx-med-fc-chip bot" ${mg("formula", { step: "chapters", subject: "Botany" })}>${qxAnimCover("botany", "B", "Formula")} Botany</button>
          <button type="button" class="qx-med-fc-chip zoo" ${mg("formula", { step: "chapters", subject: "Zoology" })}>${qxAnimCover("zoology", "Z", "Formula")} Zoology</button>
        </div>
        <div id="qxMedFormulaMount" class="qx-med-fc-mount"></div>
        <div class="qx-med-util-row" style="margin-top:10px">
          <button type="button" class="qx-med-util" ${mg("quickconcepts", { step: "subjects" })}>Concept-wise Notes</button>
          <button type="button" class="qx-med-util" ${mg("analytics", {})}>Analytics</button>
        </div>
      </div>
      <div class="marks-section qx-med-an-card" ${mg("analytics", {})}>
        <div class="marks-sec-head"><h3>Analytics</h3><a href="#" ${mg("analytics", {})}>Open →</a></div>
        <p class="sec-desc">Accuracy · weak chapters · Physics / Chem / Botany / Zoology mastery</p>
      </div>
    </div>`;
}

async function marksDashboardSections() {
  try { if (typeof qxEnsureFormulaCardSkin === "function") qxEnsureFormulaCardSkin(); } catch (_) { /* */ }
  // Medical: Marks-style full home first
  if (STATE.exam === "Medical") {
    try {
      const bookCatalog = (typeof QX_BOOKS_CATALOG !== "undefined") ? QX_BOOKS_CATALOG : null;
      const rfcNavEarly = await fetchNav("rfc").catch(() => []);
      const med = renderMedicalMarksHomeExtras(rfcNavEarly);
      const [cpyqbNav, formulaNav, rfcNav] = await Promise.all([
        fetchNav("cpyqb").catch(() => []),
        fetchNav("formulas").catch(() => []),
        fetchNav("rfc").catch(() => [])
      ]);
      const dashExams = typeof cpyqbExamsForCategory === "function"
        ? cpyqbExamsForCategory(cpyqbNav || [], "Medical")
        : (cpyqbNav || []).filter((e) => e.category === "Medical");
      const examScroll = typeof renderDashExamScroll === "function" ? renderDashExamScroll(dashExams) : "";
      const dashBooks = typeof booksForExam === "function" ? booksForExam(bookCatalog, "Medical") : [];
      const bookScroll = typeof renderBookScroll === "function" ? renderBookScroll(dashBooks, 12) : "";
      const fcNav = (typeof qxEnsureMedicalFormulaNav === "function")
        ? await qxEnsureMedicalFormulaNav(formulaNav || [])
        : (formulaNav || []);
      const phy = (fcNav || []).find((s) => /physics/i.test(s.name || ""));
      const fcTiles = phy ? renderFormulaChapterTiles(phy.chapters, "Physics", 5) : "";
      const medHydrated = String(med || "")
        .replace(
          '<div id="qxMedBooksMount" class="qx-med-books-mount">Loading books…</div>',
          bookScroll || '<p class="sec-desc">Open Digital Books</p>'
        )
        .replace(
          '<div id="qxMedFormulaMount" class="qx-med-fc-mount"></div>',
          fcTiles || ""
        );
      return `
        ${medHydrated}
        <div class="marks-section">
          <div class="marks-sec-head"><h3>Medical Exams (All PYQ Banks)</h3>
            <a href="#" ${mg("cpyqb", { step: "exams", forceExamList: true })}>View All →</a>
          </div>
          <p class="sec-desc">NEET · AIIMS · JIPMER · NTA Abhyas · MHT CET Medical</p>
          <div class="exam-scroll">${examScroll || ""}</div>
        </div>
        <div class="dash-util-row">
          <div class="dash-util-card" ${mg("examinfo", {})}>
            <span class="dash-util-ic">📘</span>
            <strong>Exam Information</strong>
            <small>NEET pattern · colleges · prep</small>
          </div>
          <div class="dash-util-card" ${mg("notebook", {})}>
            <span class="dash-util-ic">✏️</span>
            <strong>My Solutions</strong>
            <small>Bookmarks &amp; notes</small>
          </div>
        </div>`;
    } catch (e) {
      console.warn("medical home", e);
    }
  }

  const [cpyqbNav, bookCatalog, marksDash] = await Promise.all([
    fetchNav("cpyqb"),
    fetchBooks(),
    fetchMarksDashboard(),
    typeof QuantrexExamLogos !== "undefined" ? QuantrexExamLogos.loadExamIconsFromApi() : Promise.resolve()
  ]);
  const dashExams = typeof cpyqbExamsForCategory === "function"
    ? cpyqbExamsForCategory(cpyqbNav || [], STATE.exam)
    : (cpyqbNav || []).filter(e => e.category === STATE.exam);
  const cpyqbApiItems = (marksDash && marksDash.cpyqb && marksDash.cpyqb.items) || [];
  const examScroll = renderDashExamScroll(dashExams);
  const subjects = typeof qxFolderSubjects === "function"
    ? qxFolderSubjects()
    : ((EXAMS[STATE.exam] && EXAMS[STATE.exam].subjects) || []);
  const subjGrid = subjects.map(s => `
    <div class="subj-mini" ${mg("allqs", { step: "chapters", subject: s })}>
      <span class="subj-mini-ic">${subjectIcon(s, null, 24)}</span><strong>${s}</strong>
    </div>`).join("");
  const dashBooks = booksForExam(bookCatalog, STATE.exam);
  // Show enough cards so Organic + BITSAT always appear on dashboard
  const bookScroll = typeof renderBookScroll === "function" ? renderBookScroll(dashBooks, 12) : "";
  const examLabel = EXAMS[STATE.exam].name;
  const board = dashBoardSelected();
  const boards = [
    { id: "CBSE", label: "CBSE" },
    { id: "HSC", label: "HSC (Maharashtra)" }
  ];
  let boardExamData = null;
  if (typeof MarksLive !== "undefined") {
    try {
      await MarksLive.ensureToken();
      const examId = MarksLive.BOARD_EXAMS[board] || MarksLive.BOARD_EXAMS.CBSE;
      boardExamData = await MarksLive.boardSubjects(examId);
    } catch (e) { /* use fallback logos */ }
  }
  const boardTitle = (boardExamData && boardExamData.title) || (board === "HSC" ? "HSC (Maharashtra)" : "CBSE");
  const boardLogo = boardExamData
    ? boardExamIconHtml(boardExamData, 64, "dash-board-hero-logo")
    : (typeof QuantrexExamLogos !== "undefined" ? QuantrexExamLogos.html(board, 64, "dash-board-hero-logo") : "");
  const boardMetaRow = boardExamData ? boardMetaPillsHtml(boardExamData.meta) : "";
  const boardItems = (marksDash && marksDash.board && marksDash.board.items) || [];
  const boardPills = boards.map(b => {
    const item = boardItems.find(i => i.title === b.label || (b.id === "CBSE" && i.title === "CBSE") || (b.id === "HSC" && /HSC/i.test(i.title || "")));
    const logo = item && item.icon
      ? marksThemedIcon(item.icon, 28, "dash-board-tab-logo", b.label)
      : (typeof QuantrexExamLogos !== "undefined" ? QuantrexExamLogos.html(b.id, 28, "dash-board-tab-logo") : "");
    return `<button type="button" class="dash-board-tab${board === b.id ? " on" : ""}" data-dash-board="${b.id}">
      ${logo}<span>${b.label}</span>
    </button>`;
  }).join("");
  const boardPyqCard = `
    <div class="dash-board-hero">
      <div class="dash-board-hero-top" ${mg("board", { step: "subjects" })}>
        ${boardLogo}
        <div class="dash-board-hero-text">
          <h3>${boardTitle} Board PYQs</h3>
          <p>${qxBoardAllowNames().join(" · ")} — year &amp; date wise</p>
        </div>
        <span class="dash-board-go">Open →</span>
      </div>
      ${boardMetaRow ? `<div class="dash-board-meta">${boardMetaRow}</div>` : ""}
      <div class="dash-board-tabs">${boardPills}</div>
    </div>`;

  const ncertTools = [
    { kind: "lblq", title: QX_UX.lineScan, sub: "Concept-by-concept", view: "ncert", payload: { step: "subjects", ncertKind: "lblq" } },
    { kind: "ncoq", title: QX_UX.textPlus, sub: "Textbook + extra set", view: "ncert", payload: { step: "subjects", ncertKind: "ncoq" } },
    { kind: "dbq", title: QX_UX.figureLab, sub: "Figure-based practice", view: "ncert", payload: { step: "subjects", ncertKind: "dbq" } }
  ];
  const toolCards = ncertTools.map(t => {
    return `<div class="dash-tool-card" ${mg(t.view, t.payload)}>
      <span class="dash-tool-ic" aria-hidden="true">${qxAnimCover(t.kind, t.title)}</span>
      <strong>${t.title}</strong>
      <small>${t.sub}</small>
    </div>`;
  }).join("");

  const utilCards = [
    { icon: "📘", title: "Exam Brief", sub: "Pattern · colleges · prep guides", view: "examinfo" },
    { icon: "✏️", title: QX_UX.saved, sub: "Bookmarks and annotations", view: "notebook" },
    { icon: "📗", title: "Concept Notes", sub: "Quick recap sheets", view: "quickconcepts", payload: { step: "subjects" } }
  ].map(c => `
    <div class="dash-util-card" ${mg(c.view, c.payload || {})}>
      <span class="dash-util-ic">${c.icon}</span>
      <strong>${c.title}</strong>
      <small>${c.sub}</small>
    </div>`).join("");

  const exploreBlock = (typeof QxRedesign !== "undefined" && QxRedesign.exploreSectionHtml)
    ? QxRedesign.exploreSectionHtml()
    : "";
  return `
    <div class="dash-marks-home">
      ${exploreBlock}
      <div class="marks-section">
        <div class="marks-sec-head"><h3>Chapter-wise PYQ Bank</h3><a href="#" ${mg("cpyqb", { step: "exams", forceExamList: true })}>View All →</a></div>
        <p class="sec-desc">${dashExams.length} exams · tap to practice PYQs</p>
        <div class="exam-scroll">${examScroll || '<div class="empty">No exams loaded.</div>'}</div>
      </div>
      <div class="marks-section">
        <div class="marks-sec-head"><h3>All Question Bank</h3><a href="#" ${mg("allqs", { step: "subjects" })}>View All →</a></div>
        <p class="sec-desc">${subjects.join(" · ") || "Chapter-wise questions"}</p>
        <div class="subj-mini-grid">${subjGrid}</div>
      </div>
      ${qxRfcSubjectSectionHtml(await fetchNav("rfc").catch(() => []))}
      <div class="marks-section">
        <div class="marks-sec-head"><h3>${QX_UX.ncertBox}</h3><a href="#" ${mg("ncert", { step: "kinds" })}>Open →</a></div>
        <p class="sec-desc">${qxFolderTrack() === "Medical"
          ? `${QX_UX.lineScan} · ${QX_UX.textPlus} · ${QX_UX.figureLab} · Physics · Chemistry · Botany · Zoology`
          : qxFolderTrack() === "Defence"
            ? "Mathematics · GAT science · textbook-aligned practice"
            : `${QX_UX.lineScan} · ${QX_UX.textPlus} · ${QX_UX.figureLab} · Physics · Chemistry`}</p>
      </div>
      <div class="dash-ncert-block dash-board-block">
        <div class="dash-ncert-head">
          <h2>Board Exam PYQs</h2>
          <p>Previous year papers with solutions</p>
        </div>
        ${boardPyqCard}
      </div>
      <div class="dash-ncert-block">
        <div class="dash-ncert-head">
          <h2><span class="dash-ncert-tag">QX</span> ${QX_UX.ncertBox}</h2>
          <p>${QX_UX.lineScan} · ${QX_UX.textPlus} · ${QX_UX.figureLab}</p>
        </div>
        <div class="dash-tool-scroll">${toolCards}</div>
      </div>
      <div class="dash-promo-duo">
        <div class="dash-assign-box">
          <h3>Quantrex Assignment</h3>
          <p>A new way of classroom learning.</p>
          <button type="button" class="dash-assign-btn" onclick="go('assignments')">View Assignments</button>
        </div>
        <div class="dash-teach-box">
          <h3>Quantrex For Teachers</h3>
          <p>Content Library (PDF, video, lecture links), student dashboard &amp; weak-topic retest.</p>
          <button type="button" class="dash-teach-btn" onclick="go('teacher')">Open Teacher Portal →</button>
        </div>
      </div>
      <div class="dash-util-row">${utilCards}</div>
      <div class="marks-section">
        <div class="marks-sec-head"><h3>Formula Cards</h3><a href="#" ${mg("formula", { step: "subjects" })}>View All →</a></div>
        <p class="sec-desc">Subject decks with icons and covers — tap to open formulas</p>
        <div class="qx-dash-fc-covers">${(STATE.exam === "Medical"
          ? ["Physics", "Chemistry", "Botany", "Zoology"]
          : ["Physics", "Chemistry", "Mathematics"]).map((s) => {
            const tone = typeof qxFcTone === "function" ? qxFcTone(s) : "gen";
            const ic = (typeof QxCardIcons !== "undefined" && QxCardIcons.chapterIconHtml)
              ? QxCardIcons.chapterIconHtml(s, s)
              : (typeof subjectIcon === "function" ? subjectIcon(s, null, 28) : s.slice(0, 1));
            const badge = (typeof qxRoboWrap === "function") ? qxRoboWrap(ic, s, "md") : ic;
            return `<button type="button" class="qx-fc-subj qx-fc-folder qx-fc-folder-${tone} qx-dash-fc-cover" ${mg("formula", { step: "chapters", subject: s })}>
              <span class="qx-fc-tab" aria-hidden="true"></span>
              <span class="qx-fc-folder-shine" aria-hidden="true"></span>
              <span class="qx-fc-folder-art" aria-hidden="true"><i class="qx-fc-a"></i><i class="qx-fc-b"></i><i class="qx-fc-c"></i></span>
              <span class="qx-fc-folder-badge">${badge}</span>
              <div class="qx-fc-folder-meta">
                <strong>${s}</strong>
                <small>Formula Cards</small>
                <em>Open deck</em>
              </div>
            </button>`;
          }).join("")}</div>
      </div>
      <div class="marks-section">
        <div class="marks-sec-head"><h3>Digital Books</h3><a href="#" ${mg("books", { step: "list" })}>View books →</a></div>
        <p class="sec-desc">Expert-picked question banks — tap a cover to practice</p>
        ${bookScroll}
      </div>
    </div>`;
}

function bindDashHome(root) {
  (root || document).querySelectorAll("[data-dash-board]").forEach(btn => {
    btn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      localStorage.setItem("quantrex_board", btn.dataset.dashBoard);
      _marksDashCache = null;
      document.querySelectorAll("[data-dash-board]").forEach(b => b.classList.toggle("on", b === btn));
      showToast(`📚 Board: ${btn.textContent.trim()}`);
      if (currentView === "dashboard" && typeof viewDashboard === "function") {
        finishRender(await viewDashboard());
      }
    };
  });
}