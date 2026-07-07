// MARKS web-style drill-down modules (CPYQB, All Qs, DPP, Formula, Tests, Quick Concepts)

const PAGE_SIZE = 40;
let _navCache = {};
let _listPage = 1;

function mg(view, payload) {
  const p = JSON.stringify(payload || {}).replace(/'/g, "&#39;");
  return `data-mg="${view}" data-mgp='${p}'`;
}

function bindMarksGo(root) {
  (root || document).querySelectorAll("[data-mg]").forEach(el => {
    el.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const payload = JSON.parse((el.dataset.mgp || "{}").replace(/&#39;/g, "'"));
        go(el.dataset.mg, payload);
      } catch (err) {
        console.error("nav error", err);
        showToast("⚠️ Navigation error — try again");
      }
    };
  });
}

async function fetchNav(name) {
  if (_navCache[name]) return _navCache[name];
  try {
    const res = await fetch(`data/nav/${name}.json`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    _navCache[name] = Array.isArray(data) ? data : [];
  } catch (e) {
    _navCache[name] = [];
  }
  return _navCache[name];
}

async function fetchModuleNav(name) {
  const key = `mod:${name}`;
  if (_navCache[key]) return _navCache[key];
  try {
    const res = await fetch(`data/nav/${name}.json`);
    if (!res.ok) throw new Error(res.status);
    _navCache[key] = await res.json();
  } catch (e) {
    _navCache[key] = null;
  }
  return _navCache[key];
}

function qPreview(text) {
  const plain = String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > 140 ? plain.slice(0, 140) + "…" : plain;
}

function breadcrumb(parts) {
  return `<div class="breadcrumb">${parts.map((p, i) =>
    i < parts.length - 1
      ? `<a href="#" ${mg(p.view, p.payload)}>${p.label}</a><span>›</span>`
      : `<span class="bc-cur">${p.label}</span>`
  ).join("")}</div>`;
}

function subjectIcon(subj) {
  const m = { Physics: "⚛️", Chemistry: "🧪", Mathematics: "📐", Biology: "🧬", Botany: "🌿", Zoology: "🦠", Science: "🔬" };
  return m[subj] || "📖";
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

function renderQCard(q) {
  const bm = STATE.bookmarks.includes(q.id);
  const sv = STATE.solved.find(s => s.id === q.id);
  const tag = q.subject.toLowerCase().replace(/\s+/g, "-");
  const bookLabel = q._book ? bookQuestionLabel(q) : null;
  const bookTip = q._book ? bookQuestionTitle(q) : "";
  return `<div class="q-card" onclick="go('question', ${q.id})">
    <div class="q-meta">
      <span class="tag tag-${tag}">${q.subject}</span>
      <span class="tag tag-diff">${q.difficulty}</span>
      ${sv ? `<span class="tag ${sv.correct ? "tag-ok" : "tag-no"}">${sv.correct ? "✓" : "✗"}</span>` : ""}
    </div>
    <div class="q-text">${qPreview(q.q)}</div>
    <div class="q-footer"><small>${bookLabel ? `<span class="qx-book-badge" title="${bookTip}">📕 ${bookLabel}</span>` : "📖 " + q.chapter + " · 📌 " + q.source}</small><span>${bm ? "🔖" : "🤍"}</span></div>
  </div>`;
}

function renderQList(qs, page, testMeta) {
  window._qxListQs = qs;
  const shown = Math.min(qs.length, PAGE_SIZE * Math.max(1, page || _listPage || 1));
  _listPage = Math.ceil(shown / PAGE_SIZE) || 1;
  if (testMeta && qs.length >= 5) {
    window._qxChapterIds = qs.map(q => q.id);
    window._qxChapterMeta = testMeta;
  } else {
    window._qxChapterIds = null;
  }
  const testBar = testMeta && qs.length >= 5 ? `<div class="qx-chapter-test-bar">
    <div><strong>Chapter Test</strong><small>${Math.min(30, qs.length)} questions · ${Math.ceil(Math.min(30, qs.length) * 1.5)} min timer</small></div>
    <button type="button" class="btn-primary sm" onclick="startChapterTest(window._qxChapterIds, window._qxChapterMeta)">▶ Start Test</button>
  </div>` : "";
  const slice = qs.slice(0, shown);
  const list = slice.length ? slice.map(renderQCard).join("") : `<div class="empty">No questions found.</div>`;
  const more = qs.length > shown ? `<div class="qx-load-more" id="qxLoadMore"><span>Loading more…</span></div>` : "";
  return `${testBar}<p class="result-count">${qs.length.toLocaleString()} questions${qs.length > PAGE_SIZE ? ` · showing ${shown}` : ""}</p>
    <div class="q-list" id="marksQList">${list}</div>${more}`;
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
  if (_chapterMetaCache[key]) return _chapterMetaCache[key];
  try {
    const res = await fetch(`data/nav/chapter_meta/${examSlug}/${encodeURIComponent(subject)}/${slugChapter(chapter)}.json`);
    if (!res.ok) throw new Error(res.status);
    _chapterMetaCache[key] = await res.json();
  } catch (e) {
    _chapterMetaCache[key] = null;
  }
  return _chapterMetaCache[key];
}

const CT_EXAM_FOR_SLUG = {
  jee_main: "JEE Main", jee_advanced: "JEE Main", nta_abhyas_jee_main: "JEE Main",
  neet: "NEET", nta_abhyas_neet: "NEET", aiims: "NEET", jipmer: "NEET",
  mht_cet: "MHT CET", mht_cet_medical: "MHT CET"
};
const CT_CLASS_IDS = {
  "615d7802c52ffa3c944600e8": "Class 11",
  "615d780ec52ffa3c944600e9": "Class 12"
};
const CPYQB_CDN = "https://cdn-assets.getmarks.app/app_assets/img/cpyqb";
let _marksCtIndex = null;

async function fetchMarksCtIndex() {
  if (_marksCtIndex) return _marksCtIndex;
  _marksCtIndex = {};
  try {
    const res = await fetch("data/nav/custom_test_exams.json");
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    (data.data && data.data.exams || []).forEach(exam => {
      const bySubject = {};
      (exam.subjects || []).forEach(sub => {
        const byChapter = {};
        (sub.units || []).forEach(unit => {
          (unit.chapters || []).forEach(ch => {
            byChapter[ch.title] = {
              unitId: unit._id,
              unitTitle: unit.title,
              classes: (ch.classes || []).map(id => CT_CLASS_IDS[id] || id),
              syllabusCategory: ch.syllabusCategory || "noChange",
              icon: ch.icon,
              shortName: ch.shortName || ch.title,
              importance: ch.importance || 0
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
  return _marksCtIndex;
}

function qYearFromSource(source) {
  const m = String(source || "").match(/\b(20\d{2})\b/);
  return m ? parseInt(m[1], 10) : null;
}

function cpyqbYearCounts(qs) {
  const counts = {};
  qs.forEach(q => {
    const y = qYearFromSource(q.source);
    if (y) counts[y] = (counts[y] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => Number(b[0]) - Number(a[0])).slice(0, 2);
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
  const qs = QUESTIONS.filter(q => q._bank === examSlug && q.subject === subject && q.chapter === chapterName);
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
  return { solved, total: totalQs, accuracy, lastDate, yearCounts: cpyqbYearCounts(qs), weak: solved >= 3 && accuracy < 45 };
}

function cpyqbChapterIcon(meta) {
  if (!meta || !meta.icon) return "";
  const src = meta.icon.startsWith("http") ? meta.icon : `${CPYQB_CDN}/chapters/${meta.icon}`;
  const letter = (meta.shortName || "?").slice(0, 1).replace(/'/g, "");
  return `<img class="cpyqb-ch-ic" src="${src}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'cpyqb-ch-ic-fb',textContent:'${letter}'}))">`;
}

function cpyqbSyllabusBadge(cat) {
  if (cat === "reduced") return `<span class="cpyqb-syl reduced">REDUCED</span>`;
  if (cat === "removed") return `<span class="cpyqb-syl removed">REMOVED</span>`;
  return "";
}

function bindCpyqbFilters(root) {
  const bar = (root || document).querySelector("#cpyqbFilterBar");
  if (!bar || bar._bound) return;
  bar._bound = true;
  const apply = () => {
    const payload = { ..._cpyqbPayload };
    const cls = bar.querySelector("#cpyqbClass");
    const unit = bar.querySelector("#cpyqbUnit");
    if (cls) payload.filterClass = cls.value;
    if (unit) payload.filterUnit = unit.value;
    payload.filterNotStarted = bar.querySelector('[data-filter="notStarted"]')?.classList.contains("on") || false;
    payload.filterWeak = bar.querySelector('[data-filter="weak"]')?.classList.contains("on") || false;
    const sort = bar.querySelector("#cpyqbSort");
    if (sort) payload.sortBy = sort.value;
    render("cpyqb", payload);
  };
  bar.querySelectorAll("select").forEach(el => { el.onchange = apply; });
  bar.querySelectorAll("[data-filter]").forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      btn.classList.toggle("on");
      apply();
    };
  });
  const sortBtn = bar.querySelector("[data-cpyqb-sort-toggle]");
  if (sortBtn) {
    sortBtn.onclick = (e) => {
      e.preventDefault();
      const sel = bar.querySelector("#cpyqbSort");
      if (!sel) return;
      const opts = ["default", "importance", "progress", "name"];
      const i = opts.indexOf(sel.value);
      sel.value = opts[(i + 1) % opts.length];
      apply();
    };
  }
}

function filterByMarksIds(qs, ids) {
  if (!ids || !ids.length) return qs;
  const set = new Set(ids);
  return qs.filter(q => q._marksId && set.has(q._marksId));
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
  return "bucket-default";
}

function chapterModeCards(meta, payload) {
  const p = payload || _cpyqbPayload;
  const buckets = (meta && meta.buckets) || [];
  const topics = (meta && meta.topics) || [];
  const bucketTotal = buckets.reduce((s, b) => s + (b.count || 0), 0);
  const topicTotal = topics.reduce((s, t) => s + (t.count || 0), 0);
  const cards = [];
  if (buckets.length) {
    cards.push(`<div class="qx-mode-card" ${mg("cpyqb", { step: "buckets", exam: p.exam, subject: p.subject, chapter: p.chapter })}>
      <span class="qx-mode-ic">📂</span>
      <strong>All PYQs</strong>
      <small>${buckets.length} buckets · ${bucketTotal.toLocaleString()} questions</small>
    </div>`);
  }
  if (topics.length) {
    cards.push(`<div class="qx-mode-card" ${mg("cpyqb", { step: "topics", exam: p.exam, subject: p.subject, chapter: p.chapter })}>
      <span class="qx-mode-ic">📋</span>
      <strong>Topicwise PYQs</strong>
      <small>${topics.length} subtopics · ${topicTotal.toLocaleString()} questions</small>
    </div>`);
  }
  return `<div class="qx-mode-grid">${cards.join("")}</div>`;
}

async function viewCpyqb(payload) {
  const p = { ..._cpyqbPayload, ...(payload || {}) };
  _cpyqbPayload = p;
  const nav = await fetchNav("cpyqb");
  const exams = nav.filter(e => e.category === STATE.exam);

  if (!p.forceExamList && (!p.step || p.step === "exams") && !p.exam) {
    const slug = (typeof MarksShell !== "undefined" && localStorage.getItem(MarksShell.EXAM_KEY))
      || (typeof PRIMARY_BANK !== "undefined" && PRIMARY_BANK[STATE.exam])
      || "jee_main";
    const autoExam = exams.find(e => e.slug === slug) || exams[0];
    if (autoExam) {
      const subj = (typeof MarksShell !== "undefined" && localStorage.getItem(MarksShell.SUBJ_KEY))
        || (autoExam.subjects[0] && autoExam.subjects[0].name);
      if (subj) return viewCpyqb({ ...p, step: "chapters", exam: autoExam.slug, subject: subj });
    }
  }

  if (!p.forceExamList && p.step === "subjects" && p.exam && !p.subject) {
    const saved = typeof MarksShell !== "undefined" ? localStorage.getItem(MarksShell.SUBJ_KEY) : null;
    if (saved) {
      const ex = exams.find(e => e.slug === p.exam);
      if (ex && ex.subjects.some(s => s.name === saved)) {
        return viewCpyqb({ ...p, step: "chapters", subject: saved });
      }
    }
  }

  if (p.step === "exams" || !p.exam) {
    _lastListFn = () => ({ step: "exams" });
    const cards = exams.map(e => `
      <div class="exam-card" ${mg("cpyqb", { step: "subjects", exam: e.slug })}>
        <div class="exam-card-ic">📝</div>
        <strong>${e.title}</strong>
        <small>${e.count.toLocaleString()} questions · ${e.subjects.length} subjects</small>
      </div>`).join("");
    return `${topbar("Chapter-wise PYQ Bank", "Select an exam — same as MARKS web")}
      <div class="exam-grid">${cards || '<div class="empty">No exams for this category.</div>'}</div>`;
  }

  const exam = exams.find(e => e.slug === p.exam);
  if (!exam) return viewCpyqb({ step: "exams" });

  if (p.step === "subjects" || !p.subject) {
    _lastListFn = () => ({ step: "subjects", exam: p.exam });
    const bc = breadcrumb([
      { label: "PYQ Bank", view: "cpyqb", payload: { step: "exams" } },
      { label: exam.title }
    ]);
    const cards = exam.subjects.map(s => `
      <div class="subj-card" ${mg("cpyqb", { step: "chapters", exam: p.exam, subject: s.name })}>
        <span class="subj-ic">${subjectIcon(s.name)}</span>
        <div><strong>${s.name}</strong><small>${s.chapters.length} chapters · ${s.count.toLocaleString()} qs</small></div>
      </div>`).join("");
    return `${topbar(exam.title, "Select a subject")}${bc}<div class="subj-grid">${cards}</div>`;
  }

  const subj = exam.subjects.find(s => s.name === p.subject);
  if (!subj) return viewCpyqb({ step: "subjects", exam: p.exam });

  if (p.step === "chapters" || !p.chapter) {
    _lastListFn = () => ({ step: "chapters", exam: p.exam, subject: p.subject, filterClass: p.filterClass, filterUnit: p.filterUnit, filterNotStarted: p.filterNotStarted, filterWeak: p.filterWeak, sortBy: p.sortBy });
    if (!_banksLoaded[p.exam]) await loadSingleBank(p.exam);
    const ctIndex = await fetchMarksCtIndex();
    const ctExam = CT_EXAM_FOR_SLUG[p.exam];
    const ctSubj = ctExam && ctIndex[ctExam] ? ctIndex[ctExam][p.subject] : null;
    const units = ctSubj ? (ctSubj.units || []) : [];
    const filterClass = p.filterClass || "all";
    const filterUnit = p.filterUnit || "all";
    const sortBy = p.sortBy || "default";

    const rows = subj.chapters.map(c => {
      const ctCh = ctSubj && ctSubj.byChapter ? ctSubj.byChapter[c.name] : null;
      const stats = cpyqbChapterStats(p.exam, p.subject, c.name, c.count);
      return { nav: c, ct: ctCh, stats };
    });

    const hasFilters = filterClass !== "all" || filterUnit !== "all" || p.filterNotStarted || p.filterWeak;
    let filtered = rows.filter(row => {
      if (filterClass !== "all" && row.ct && !row.ct.classes.includes(filterClass)) return false;
      if (filterUnit !== "all" && row.ct && row.ct.unitId !== filterUnit) return false;
      if (p.filterNotStarted && p.filterWeak) {
        if (row.stats.solved > 0 && !row.stats.weak) return false;
      } else if (p.filterNotStarted && row.stats.solved > 0) return false;
      else if (p.filterWeak && !row.stats.weak) return false;
      return true;
    });

    if (sortBy === "importance") filtered.sort((a, b) => (b.ct?.importance || 0) - (a.ct?.importance || 0));
    else if (sortBy === "progress") filtered.sort((a, b) => b.stats.solved - a.stats.solved);
    else if (sortBy === "name") filtered.sort((a, b) => a.nav.name.localeCompare(b.nav.name));

    const continueRow = rows
      .filter(r => r.stats.solved > 0 && r.stats.solved < r.stats.total)
      .sort((a, b) => b.stats.lastDate - a.stats.lastDate)[0];
    const continueId = continueRow ? continueRow.nav.name : null;

    const classOpts = `<option value="all"${filterClass === "all" ? " selected" : ""}>All Classes</option>
      <option value="Class 11"${filterClass === "Class 11" ? " selected" : ""}>Class 11</option>
      <option value="Class 12"${filterClass === "Class 12" ? " selected" : ""}>Class 12</option>`;
    const unitOpts = `<option value="all"${filterUnit === "all" ? " selected" : ""}>All Units</option>` +
      units.map(u => `<option value="${u._id}"${filterUnit === u._id ? " selected" : ""}>${u.title}</option>`).join("");
    const countLabel = hasFilters
      ? `Showing ${filtered.length} chapter${filtered.length === 1 ? "" : "s"}`
      : `Showing all chapters (${subj.chapters.length})`;

    const filterBar = `<div class="cpyqb-filter-bar" id="cpyqbFilterBar">
      <button type="button" class="cpyqb-filter-main" tabindex="-1"><span>⚙</span> Filter</button>
      <select id="cpyqbClass" class="cpyqb-pill-sel">${classOpts}</select>
      <select id="cpyqbUnit" class="cpyqb-pill-sel">${unitOpts}</select>
      <button type="button" class="cpyqb-chip-btn${p.filterNotStarted ? " on" : ""}" data-filter="notStarted">Not Started</button>
      <button type="button" class="cpyqb-chip-btn${p.filterWeak ? " on" : ""}" data-filter="weak">Weak Chapter</button>
      <span class="cpyqb-filter-count">${countLabel}</span>
      <a href="#" class="cpyqb-sort-link" data-cpyqb-sort-toggle>↑ Sort</a>
      <select id="cpyqbSort" class="cpyqb-sort-hidden"><option value="default"${sortBy === "default" ? " selected" : ""}>Default</option><option value="importance"${sortBy === "importance" ? " selected" : ""}>Importance</option><option value="progress"${sortBy === "progress" ? " selected" : ""}>Progress</option><option value="name"${sortBy === "name" ? " selected" : ""}>Name</option></select>
    </div>`;

    const renderChRow = (c, ctCh, stats, isContinue) => {
      const displayName = (ctCh && ctCh.shortName) || c.name;
      const yearHtml = stats.yearCounts.length
        ? stats.yearCounts.map(([y, n], i) => `<span class="cpyqb-yr"><b>${y}:</b> ${n} Qs ${cpyqbYearArrow(stats.yearCounts, i)}</span>`).join("")
        : "";
      const continueBtn = isContinue ? `<span class="cpyqb-continue-btn">Continue Solving</span>` : "";
      return `<div class="cpyqb-ch-row${isContinue ? " is-continue" : ""}" ${mg("cpyqb", { step: "chapterHub", exam: p.exam, subject: p.subject, chapter: c.name })}>
        <div class="cpyqb-ch-left">
          ${cpyqbChapterIcon(ctCh)}
          <div class="cpyqb-ch-info">
            <div class="cpyqb-ch-title">${isContinue ? c.name : displayName} ${cpyqbSyllabusBadge(ctCh && ctCh.syllabusCategory)} ${continueBtn}</div>
            ${yearHtml ? `<div class="cpyqb-ch-years">${yearHtml}</div>` : ""}
          </div>
        </div>
        <div class="cpyqb-ch-right"><span class="cpyqb-ch-prog">${stats.solved}/${stats.total} Qs</span></div>
      </div>`;
    };

    const cards = filtered.length ? filtered.map(({ nav: c, ct: ctCh, stats }) =>
      renderChRow(c, ctCh, stats, continueId === c.name)
    ).join("") : `<div class="empty">No chapters match these filters.</div>`;

    const footTabs = `<div class="cpyqb-foot-tabs">
      <button type="button" class="cpyqb-ftab" onclick="go('notebook')">${p.subject} Bookmarks</button>
      <button type="button" class="cpyqb-ftab on" onclick="go('analytics')">${p.subject} Analysis</button>
    </div>`;

    const pageHtml = `<div class="cpyqb-marks-page">
      <div class="cpyqb-marks-head">
        <h1>${p.subject} PYQs</h1>
        <p>Chapter-wise Collection of ${p.subject} PYQs</p>
      </div>
      ${filterBar}<div class="cpyqb-ch-list">${cards}</div>${footTabs}</div>`;
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

  if (p.step === "chapterHub" || (!p.mode && !p.bucketId && !p.bucketTitle && !p.topicId && !p.topicTitle && p.step !== "buckets" && p.step !== "topics" && p.step !== "questions")) {
    const meta = await resolveChapterMeta();
    const hasBuckets = !!(meta && meta.buckets && meta.buckets.length);
    const hasTopics = !!(meta && meta.topics && meta.topics.length);
    if (hasBuckets && !hasTopics) return viewCpyqb({ ...p, step: "buckets" });
    if (hasTopics && !hasBuckets) return viewCpyqb({ ...p, step: "topics" });
    _lastListFn = () => ({ step: "chapterHub", exam: p.exam, subject: p.subject, chapter: p.chapter });
    const bc = breadcrumb(baseBc.slice(0, -1).concat([{ label: p.chapter }]));
    if (!hasBuckets && !hasTopics) {
      if (!_banksLoaded[p.exam]) await loadSingleBank(p.exam);
      const allQs = QUESTIONS.filter(q => q._bank === p.exam && q.subject === p.subject && q.chapter === p.chapter);
      const testMeta = { title: `${p.chapter} · Chapter Test`, returnTo: "cpyqb", limit: 30 };
      return `${topbar(p.chapter, `${exam.title} · ${p.subject}`)}${bc}
        <p class="result-count">MARKS subtopic data not available for this chapter yet — showing all ${allQs.length} questions.</p>
        ${renderQList(allQs, _listPage, testMeta)}`;
    }
    return `${topbar(p.chapter, "Choose practice mode")}${bc}${chapterModeCards(meta, p)}`;
  }

  const meta = await resolveChapterMeta();

  if (p.step === "buckets" && !p.bucketId && !p.bucketTitle) {
    _lastListFn = () => ({ step: "buckets", exam: p.exam, subject: p.subject, chapter: p.chapter });
    const buckets = (meta && meta.buckets) || (chMetaNav && chMetaNav.buckets) || [];
    const bc = breadcrumb(baseBc.concat([{ label: "All PYQs" }]));
    const cards = buckets.length ? buckets.map(b => `
      <div class="ch-card qx-bucket-card ${bucketTone(b)}" ${mg("cpyqb", { step: "questions", mode: "bucket", exam: p.exam, subject: p.subject, chapter: p.chapter, bucketId: b.id, bucketTitle: b.title })}>
        <strong>${b.title}</strong><small>${(b.count || 0).toLocaleString()} questions</small>
      </div>`).join("") : `<div class="empty">No PYQ buckets for this chapter on MARKS.</div>`;
    return `${topbar(p.chapter, "All PYQs")}${bc}<div class="ch-grid">${cards}</div>`;
  }

  if (p.step === "topics" && !p.topicId && !p.topicTitle) {
    _lastListFn = () => ({ step: "topics", exam: p.exam, subject: p.subject, chapter: p.chapter });
    const topics = (meta && meta.topics) || (chMetaNav && chMetaNav.topics) || [];
    const bc = breadcrumb(baseBc.concat([{ label: "Topicwise PYQs" }]));
    const cards = topics.length ? topics.map(t => `
      <div class="ch-card qx-topic-card" ${mg("cpyqb", { step: "questions", mode: "topic", exam: p.exam, subject: p.subject, chapter: p.chapter, topicId: t.id, topicTitle: t.title })}>
        <div class="qx-topic-body">
          <strong>${t.title}</strong>
          <small>${(t.count || 0).toLocaleString()} questions</small>
        </div>
      </div>`).join("") : `<div class="empty">No subtopics for this chapter on MARKS.</div>`;
    return `${topbar(p.chapter, "Topicwise PYQs")}${bc}<div class="ch-grid qx-topic-grid">${cards}</div>`;
  }

  if (!_banksLoaded[p.exam]) {
    showToast(`📚 Loading ${exam.title} questions…`);
    await loadSingleBank(p.exam);
    showToast(`✅ ${exam.title} loaded`);
  }
  let qs = QUESTIONS.filter(q => q._bank === p.exam && q.subject === p.subject && q.chapter === p.chapter);

  let filterNote = "";
  if (meta && p.mode === "bucket" && (p.bucketId || p.bucketTitle)) {
    const bucket = findMetaItem(meta.buckets, p.bucketId, p.bucketTitle);
    if (bucket && bucket.questionIds && bucket.questionIds.length) {
      const filtered = filterByMarksIds(qs, bucket.questionIds);
      if (filtered.length) qs = filtered;
      else filterNote = `<p class="result-count">Could not match MARKS bucket questions (${bucket.questionIds.length} IDs). Re-run patch_marks_ids.py.</p>`;
    }
  }
  if (meta && p.mode === "topic" && (p.topicId || p.topicTitle)) {
    const topic = findMetaItem(meta.topics, p.topicId, p.topicTitle);
    if (topic && topic.questionIds && topic.questionIds.length) {
      const filtered = filterByMarksIds(qs, topic.questionIds);
      if (filtered.length) qs = filtered;
      else filterNote = `<p class="result-count">Could not match MARKS subtopic questions (${topic.questionIds.length} IDs). Re-run patch_marks_ids.py.</p>`;
    }
  }

  _lastListFn = () => ({ ...p, step: "questions" });
  const modeLabel = p.bucketTitle || p.topicTitle || "All Questions";
  const bc = breadcrumb(baseBc.concat([
    p.mode === "bucket" ? { label: "All PYQs", view: "cpyqb", payload: { step: "buckets", exam: p.exam, subject: p.subject, chapter: p.chapter } } :
    p.mode === "topic" ? { label: "Topicwise", view: "cpyqb", payload: { step: "topics", exam: p.exam, subject: p.subject, chapter: p.chapter } } : null,
    { label: modeLabel }
  ].filter(Boolean)));
  const testMeta = { title: `${p.chapter} · ${modeLabel}`, returnTo: "cpyqb", limit: 30 };
  return `${topbar(p.chapter, `${exam.title} · ${modeLabel}`)}${bc}${filterNote}${renderQList(qs, _listPage, testMeta)}`;
}

// ============ ALL QUESTION BANK / NCERT (MARKS NEET modules) ============
let _bankPayload = { module: "allqs", step: "subjects" };

async function viewNeetModuleBank(payload, moduleId) {
  const p = { ..._bankPayload, module: moduleId, ...(payload || {}) };
  _bankPayload = p;
  const navName = moduleId === "ncert" ? "neet_ncert" : "neet_allqs";
  const mod = await fetchModuleNav(navName);
  const title = (mod && mod.title) || (moduleId === "ncert" ? "NCERT Based Qs Bank" : "All Question Bank");
  const subtitle = moduleId === "ncert" ? "100% aligned with latest NEET syllabus" : "Chapter-wise questions by subject";
  const examSlug = (mod && mod.examSlug) || "neet";
  const subjects = (mod && mod.subjects) || [];

  if (p.step === "subjects" || !p.subject) {
    _lastListFn = () => ({ module: moduleId, step: "subjects" });
    const cards = subjects.map(s => `
      <div class="subj-card" ${mg(moduleId, { step: "chapters", subject: s.name })}>
        <span class="subj-ic">${subjectIcon(s.name)}</span>
        <div><strong>${s.name}</strong><small>${s.chapters.length} chapters · ${s.count.toLocaleString()} qs</small></div>
      </div>`).join("");
    return `${topbar(title, subtitle)}<div class="subj-grid">${cards || '<div class="empty">NEET module data loading…</div>'}</div>`;
  }

  const subj = subjects.find(s => s.name === p.subject);
  if (!subj) return viewNeetModuleBank({ step: "subjects" }, moduleId);

  if (p.step === "chapters" || !p.chapter) {
    _lastListFn = () => ({ module: moduleId, step: "chapters", subject: p.subject });
    const bc = breadcrumb([{ label: title, view: moduleId, payload: { step: "subjects" } }, { label: p.subject }]);
    const cards = subj.chapters.map(c => {
      const tc = c.topicCount || (c.topics && c.topics.length) || 0;
      const parts = [`${(c.count || 0).toLocaleString()} questions`];
      if (tc) parts.push(`${tc} subtopics`);
      return `<div class="ch-card qx-ch-row" ${mg(moduleId, { step: "chapterHub", subject: p.subject, chapter: c.name })}>
        <div class="qx-ch-body"><strong>${c.name}</strong><small>${parts.join(" · ")}</small></div>
        ${tc ? `<span class="qx-ch-badge topic">Topicwise</span>` : ""}
      </div>`;
    }).join("");
    return `${topbar(p.subject, title)}${bc}<div class="ch-grid">${cards}</div>`;
  }

  const chNav = subj.chapters.find(c => c.name === p.chapter);
  const baseBc = [
    { label: title, view: moduleId, payload: { step: "subjects" } },
    { label: p.subject, view: moduleId, payload: { step: "chapters", subject: p.subject } },
    { label: p.chapter, view: moduleId, payload: { step: "chapterHub", subject: p.subject, chapter: p.chapter } }
  ];

  async function resolveMeta() {
    let meta = await fetchChapterMeta(examSlug, p.subject, p.chapter);
    if (meta) return meta;
    if (chNav && chNav.topics && chNav.topics.length) return { topics: chNav.topics, buckets: [] };
    return null;
  }

  if (p.step === "chapterHub" || (!p.topicId && !p.topicTitle && p.step !== "topics" && p.step !== "questions")) {
    const meta = await resolveMeta();
    const topics = (meta && meta.topics) || [];
    if (topics.length) return viewNeetModuleBank({ ...p, step: "topics" }, moduleId);
    return viewNeetModuleBank({ ...p, step: "questions" }, moduleId);
  }

  if (p.step === "topics" && !p.topicId && !p.topicTitle) {
    _lastListFn = () => ({ module: moduleId, step: "topics", subject: p.subject, chapter: p.chapter });
    const meta = await resolveMeta();
    const topics = (meta && meta.topics) || (chNav && chNav.topics) || [];
    const bc = breadcrumb(baseBc.slice(0, -1).concat([{ label: p.chapter }]));
    const cards = topics.map(t => `
      <div class="ch-card qx-topic-card" ${mg(moduleId, { step: "questions", mode: "topic", subject: p.subject, chapter: p.chapter, topicId: t.id, topicTitle: t.title })}>
        <div class="qx-topic-body"><strong>${t.title}</strong><small>${(t.count || 0).toLocaleString()} questions</small></div>
      </div>`).join("");
    return `${topbar(p.chapter, "Topicwise · " + title)}${bc}<div class="ch-grid qx-topic-grid">${cards || '<div class="empty">No MARKS subtopics.</div>'}</div>`;
  }

  const bankSlugs = moduleId === "allqs"
    ? (typeof banksForAllQs === "function" ? banksForAllQs() : ["neet", "nta_abhyas_neet"])
    : ["neet"];
  if (typeof loadMultipleBanks === "function") {
    showToast("📚 Loading " + bankSlugs.length + " question banks…");
    await loadMultipleBanks(bankSlugs);
  } else {
    for (const slug of bankSlugs) {
      if (!_banksLoaded[slug]) { showToast("📚 Loading questions…"); await loadSingleBank(slug); }
    }
  }
  let qs = QUESTIONS.filter(q => bankSlugs.includes(q._bank) && q.subject === p.subject && q.chapter === p.chapter);
  const meta = await resolveMeta();
  let filterNote = "";
  if (p.mode === "topic" && (p.topicId || p.topicTitle) && meta) {
    const topic = findMetaItem(meta.topics, p.topicId, p.topicTitle);
    if (topic && topic.questionIds && topic.questionIds.length) {
      const filtered = filterByMarksIds(qs, topic.questionIds);
      if (filtered.length) qs = filtered;
      else filterNote = `<p class="result-count">Could not match MARKS subtopic (${topic.questionIds.length} IDs).</p>`;
    }
  }
  _lastListFn = () => ({ ...p, step: "questions" });
  const modeLabel = p.topicTitle || "All Questions";
  const bc = breadcrumb(baseBc.concat([
    p.topicTitle ? { label: "Topicwise", view: moduleId, payload: { step: "topics", subject: p.subject, chapter: p.chapter } } : null,
    { label: modeLabel }
  ].filter(Boolean)));
  const testMeta = { title: `${p.chapter} · ${modeLabel}`, returnTo: moduleId, limit: 30 };
  return `${topbar(p.chapter, `${p.subject} · ${title}`)}${bc}${filterNote}${renderQList(qs, _listPage, testMeta)}`;
}

async function viewSubjectBank(payload, moduleId) {
  if (STATE.exam === "Medical") return viewNeetModuleBank(payload, moduleId);
  const p = { ..._bankPayload, module: moduleId, ...(payload || {}) };
  _bankPayload = p;
  const slug = PRIMARY_BANK[STATE.exam] || "jee_main";
  const title = "All Question Bank";
  const subtitle = "Chapter-wise questions by subject";

  if (p.step === "subjects" || !p.subject) {
    _lastListFn = () => ({ module: moduleId, step: "subjects" });
    const subjects = EXAMS[STATE.exam].subjects;
    const cards = subjects.map(s => `
      <div class="subj-card" ${mg(moduleId, { step: "chapters", subject: s })}>
        <span class="subj-ic">${subjectIcon(s)}</span>
        <div><strong>${s}</strong><small>${(CHAPTERS[s] || []).length} chapters</small></div>
      </div>`).join("");
    return `${topbar(title, subtitle)}<div class="subj-grid">${cards}</div>`;
  }

  const chapters = CHAPTERS[p.subject] || [];
  if (p.step === "chapters" || !p.chapter) {
    _lastListFn = () => ({ module: moduleId, step: "chapters", subject: p.subject });
    const bc = breadcrumb([{ label: title, view: moduleId, payload: { step: "subjects" } }, { label: p.subject }]);
    const cards = chapters.map(c => `
      <div class="ch-card" ${mg(moduleId, { step: "questions", subject: p.subject, chapter: c })}>
        <strong>${c}</strong>
      </div>`).join("");
    return `${topbar(p.subject, title)}${bc}<div class="ch-grid">${cards}</div>`;
  }

  if (!_banksLoaded[slug]) {
    showToast("📚 Loading question bank…");
    await loadSingleBank(slug);
  }
  const qs = QUESTIONS.filter(q => q._bank === slug && q.subject === p.subject && q.chapter === p.chapter);
  _lastListFn = () => ({ module: moduleId, step: "questions", subject: p.subject, chapter: p.chapter });
  const bc = breadcrumb([
    { label: title, view: moduleId, payload: { step: "subjects" } },
    { label: p.subject, view: moduleId, payload: { step: "chapters", subject: p.subject } },
    { label: p.chapter }
  ]);
  const testMeta = { title: `${p.chapter} · Chapter Test`, returnTo: moduleId, limit: 30 };
  return `${topbar(p.chapter, `${p.subject} · ${title}`)}${bc}${renderQList(qs, _listPage, testMeta)}`;
}

function viewAllQs(p) { return viewSubjectBank(p, "allqs"); }
function viewNcert(p) { return viewSubjectBank(p, "ncert"); }

// ============ DPP (MARKS: Subject → Chapter → Sets) ============
let _dppPayload = { step: "subjects" };

async function viewDppMarks(payload) {
  const p = { ..._dppPayload, ...(payload || {}) };
  _dppPayload = p;
  const nav = await fetchNav("dpp");

  if (p.step === "subjects" || !p.subject) {
    _lastListFn = () => ({ step: "subjects" });
    const cards = nav.map(s => `
      <div class="subj-card" ${mg("dpp", { step: "chapters", subject: s.name })}>
        <span class="subj-ic">${subjectIcon(s.name)}</span>
        <div><strong>${s.name}</strong><small>${s.chapters.length} chapters · ${s.count} DPP sets</small></div>
      </div>`).join("");
    return `${topbar("Solve DPPs", "620+ aspirants solved DPP in the last hour! 🔥")}
      <div class="subj-grid">${cards || '<div class="empty">No DPP data.</div>'}</div>`;
  }

  const subj = nav.find(s => s.name === p.subject);
  if (!subj) return viewDppMarks({ step: "subjects" });

  if (p.step === "chapters" || !p.chapter) {
    _lastListFn = () => ({ step: "chapters", subject: p.subject });
    const bc = breadcrumb([
      { label: "DPP", view: "dpp", payload: { step: "subjects" } },
      { label: p.subject }
    ]);
    const cards = subj.chapters.map(c => `
      <div class="ch-card" ${mg("dpp", { step: "sets", subject: p.subject, chapter: c.name })}>
        <strong>${c.name}</strong><small>${c.count} sets</small>
      </div>`).join("");
    return `${topbar(p.subject, "Select a chapter")}${bc}<div class="ch-grid">${cards}</div>`;
  }

  const ch = subj.chapters.find(c => c.name === p.chapter);
  if (!ch) return viewDppMarks({ step: "chapters", subject: p.subject });

  if (p.step === "sets" || !p.setId) {
    _lastListFn = () => ({ step: "sets", subject: p.subject, chapter: p.chapter });
    const bc = breadcrumb([
      { label: "DPP", view: "dpp", payload: { step: "subjects" } },
      { label: p.subject, view: "dpp", payload: { step: "chapters", subject: p.subject } },
      { label: p.chapter }
    ]);
    const levelOrder = { Easy: 1, Moderate: 2, Tough: 3, Other: 4 };
    const sets = [...ch.sets].sort((a, b) => (levelOrder[a.level] || 9) - (levelOrder[b.level] || 9));
    const cards = sets.map(s => `
      <div class="dpp-set-card level-${s.level.toLowerCase()}" onclick="startDppSet('${s.id}')">
        <span class="dpp-level">${s.level}</span>
        <strong>${s.title}</strong>
        <small>${s.count} questions</small>
      </div>`).join("");
    return `${topbar(p.chapter, `${p.subject} · DPP Sets`)}${bc}<div class="dpp-sets-grid">${cards}</div>`;
  }
  return viewDppMarks({ step: "subjects" });
}

async function startDppSet(dppId) {
  if (!_dppLoaded) await loadDppBank();
  const dpp = DPPS.find(d => d.id === dppId);
  if (!dpp) { showToast("⚠️ DPP not found"); return; }
  const mins = Math.max(10, Math.ceil((dpp.questions.length || 10) * 1.5));
  startTest(dpp.questions, dpp.title, "dpp", {
    testType: "dpp",
    timed: true,
    durationSec: mins * 60,
    modeLabel: `DPP · ${mins} min`
  });
}

// ============ FORMULA CARDS (Subject → Chapter) ============
let _fcPayload = { step: "subjects" };

async function viewFormulaMarks(payload) {
  const p = { ..._fcPayload, ...(payload || {}) };
  _fcPayload = p;
  if (typeof loadFormulas === "function") await loadFormulas();
  const nav = await fetchNav("formulas");

  if (p.step === "subjects" || !p.subject) {
    const cards = nav.map(s => `
      <div class="subj-card" ${mg("formula", { step: "chapters", subject: s.name })}>
        <span class="subj-ic">${subjectIcon(s.name)}</span>
        <div><strong>${s.name}</strong><small>${s.chapters.length} chapters · ${s.count} formulas</small></div>
      </div>`).join("");
    const fallback = FORMULAS.length ? `<div class="chips" id="fcChips"></div><div class="fc-grid">${FORMULAS.slice(0, 20).map(f => `
      <div class="fc-card"><div class="fc-head"><span class="tag">${f.subject}</span><small>${f.topic}</small></div>
      <div class="fc-formula qx-content">${typeof Mx !== "undefined" ? Mx.html(f.formula) : f.formula}</div></div>`).join("")}</div>` : "";
    return `${topbar("Formula Cards", "Every important formula — beautifully organized")}
      <div class="subj-grid">${cards || '<div class="empty">Browse by subject below</div>'}</div>${fallback}`;
  }

  const subj = nav.find(s => s.name === p.subject);
  if (!subj) return viewFormulaMarks({ step: "subjects" });
  const ch = subj.chapters.find(c => c.name === p.chapter);

  if (p.step === "chapters" || !p.chapter) {
    const bc = breadcrumb([
      { label: "Formulas", view: "formula", payload: { step: "subjects" } },
      { label: p.subject }
    ]);
    const cards = subj.chapters.map(c => `
      <div class="ch-card" style="border-left:4px solid ${c.color || '#1589EE'}" ${mg("formula", { step: (c.topics && c.topics.length) ? "topics" : "cards", subject: p.subject, chapter: c.name })}>
        <strong>${c.name}</strong><small>${c.count} formulas${c.topics && c.topics.length ? ` · ${c.topics.length} topics` : ""}</small>
      </div>`).join("");
    return `${topbar(p.subject, "Select a chapter")}${bc}<div class="ch-grid">${cards}</div>`;
  }

  if (p.step === "topics" && !p.topicTitle) {
    const topics = (ch && ch.topics) || [];
    const bc = breadcrumb([
      { label: "Formulas", view: "formula", payload: { step: "subjects" } },
      { label: p.subject, view: "formula", payload: { step: "chapters", subject: p.subject } },
      { label: p.chapter }
    ]);
    const cards = topics.map(t => `
      <div class="ch-card qx-topic-card" ${mg("formula", { step: "cards", subject: p.subject, chapter: p.chapter, topicTitle: t.title })}>
        <div class="qx-topic-body"><strong>${t.title}</strong><small>${(t.count || 0).toLocaleString()} formulas</small></div>
      </div>`).join("");
    return `${topbar(p.chapter, "Select a topic")}${bc}<div class="ch-grid qx-topic-grid">${cards || '<div class="empty">No topics.</div>'}</div>`;
  }

  let list = FORMULAS.filter(f => f.subject === p.subject && f.chapter === p.chapter);
  if (p.topicTitle) list = list.filter(f => f.topic === p.topicTitle);
  const bc = breadcrumb([
    { label: "Formulas", view: "formula", payload: { step: "subjects" } },
    { label: p.subject, view: "formula", payload: { step: "chapters", subject: p.subject } },
    { label: p.chapter, view: "formula", payload: { step: (ch && ch.topics && ch.topics.length) ? "topics" : "cards", subject: p.subject, chapter: p.chapter } },
    ...(p.topicTitle ? [{ label: p.topicTitle }] : [])
  ]);
  if (!list.length) {
    return `${topbar(p.chapter, p.subject)}${bc}<div class="empty">Formula cards for this ${p.topicTitle ? "topic" : "chapter"} are loading.</div>`;
  }
  const cards = list.map(f => {
    const bm = STATE.bookmarks.includes("f" + f.id);
    return `<div class="fc-card">
      <div class="fc-head"><span class="tag">${f.topic}</span>
        <button class="bm-btn ${bm ? "on" : ""}" onclick="toggleFcBm(${f.id})">${bm ? "🔖" : "🤍"}</button></div>
      <div class="fc-formula qx-content">${typeof Mx !== "undefined" ? Mx.html(f.formula) : f.formula}</div>
      <p class="fc-meaning">${f.meaning || ""}</p>
    </div>`;
  }).join("");
  return `${topbar(p.chapter, p.subject)}${bc}<div class="fc-grid">${cards}</div>`;
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
    title: "JEE Mains 2027 Test Series",
    tagline: "Focused JEE Main preparation with NTA-style papers",
    tests: 30, fullMocks: 10, partTests: 20, price: "₹1,499",
    features: ["Chapter-wise part tests", "Full mock papers", "Shift-wise PYQ style", "Rank predictor", "Weak area analysis"]
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

function viewTestSeries(payload) {
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
      <p class="mts-detail-note">Same trusted test series experience as MARKS — launching on Quantrex Academy shortly.</p>
    </div>
  </div>`;
}

function marksTestSeriesCards() {
  const card = (tone, logo, title) => {
    const meta = TEST_SERIES_META[tone];
    const id = meta ? meta.id : tone;
    return `
    <div class="mts-card mts-${tone}" ${mg("testseries", { id })}>
      <div class="mts-logo">${logo}</div>
      <div class="mts-body">
        <strong>${title}</strong>
        <span class="mts-details">View Details →</span>
      </div>
    </div>`;
  };
  if (STATE.exam === "Medical") {
    return [
      card("neet", "NEET", "NEET 2027 Test Series"),
      card("neet2", "NEET", "NEET Part Test Series"),
      card("aiims", "AIIMS", "AIIMS Pattern Test Series")
    ].join("");
  }
  if (STATE.exam === "Foundation") {
    return [
      card("nda", "NDA", "NDA 2027 Test Series"),
      card("nda2", "NDA", "NDA Subject Test Series"),
      card("gk", "GK", "Defence GK Test Series")
    ].join("");
  }
  return [
    card("jeeboth", "JEE MAIN<br>JEE ADV", "JEE Mains + Advanced 2027 Test Series"),
    card("jeemain", "JEE MAIN", "JEE Mains 2027 Test Series"),
    card("jeeadv", "JEE ADV", "JEE Advanced 2027 Test Series")
  ].join("");
}

function viewTests() {
  const hour = new Date().getHours();
  const ctCount = 589 + (hour * 11) % 120;
  const pyqCount = 600 + (hour * 9) % 110;
  return `<div class="marks-tests-page">
    <div class="marks-tests-head">
      <span class="marks-tests-shield">🛡️</span>
      <h1>Tests</h1>
    </div>
    <div class="marks-tests-hero">
      <div class="mth-card" ${mg("custom", { step: "chapters", _draftInit: true, fromTests: true })}>
        <div class="mth-body">
          <strong>Create Your Own Test</strong>
          <small>${ctCount}+ students took a Custom Test in last hour!</small>
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
      <h3>India's Most Trusted Test Series</h3>
      <p class="marks-ts-sub">Brought to you by Quantrex Academy</p>
      <div class="marks-ts-grid">${marksTestSeriesCards()}</div>
    </div>
  </div>`;
}

let _pyqMockPayload = { step: "exams" };
let _pyqPaperIndex = {};

function pyqPaperLabel(source) {
  const m = String(source || "").match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : String(source || "Paper");
}

function pyqSubjectLine(subjects) {
  return Object.entries(subjects || {})
    .map(([s, n]) => `${s}: ${n}`)
    .join(" · ");
}

function pyqPaperDuration(count) {
  if (STATE.exam === "Medical" || count >= 150) return 200 * 60;
  return 180 * 60;
}

async function buildPyqPaperIndex(slug) {
  if (_pyqPaperIndex[slug]) return _pyqPaperIndex[slug];
  if (!_banksLoaded[slug]) await loadSingleBank(slug);
  const papers = {};
  QUESTIONS.filter(q => q._bank === slug).forEach(q => {
    const src = q.source || "Unknown";
    if (!papers[src]) {
      papers[src] = { source: src, count: 0, subjects: {}, ids: [], year: qYearFromSource(src) };
    }
    papers[src].count++;
    papers[src].subjects[q.subject] = (papers[src].subjects[q.subject] || 0) + 1;
    papers[src].ids.push(q.id);
  });
  const byYear = {};
  Object.values(papers).forEach(p => {
    const y = String(p.year || "Other");
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(p);
  });
  Object.keys(byYear).forEach(y => {
    byYear[y].sort((a, b) => b.source.localeCompare(a.source));
  });
  _pyqPaperIndex[slug] = byYear;
  return byYear;
}

function pyqMockBackBar(step, exam, year) {
  if (step === "papers" && exam && year) {
    return `<button type="button" class="pyqmock-back" ${mg("pyqmock", { step: "years", exam })}>← ${year}</button>`;
  }
  if (step === "years" && exam) {
    return `<button type="button" class="pyqmock-back" ${mg("pyqmock", { step: "exams" })}>← All Exams</button>`;
  }
  return `<button type="button" class="pyqmock-back" onclick="go('tests')">← Tests</button>`;
}

async function viewPyqMock(payload) {
  const p = { ..._pyqMockPayload, ...(payload || {}) };
  _pyqMockPayload = p;
  const nav = await fetchNav("cpyqb");
  const exams = nav.filter(e => e.category === STATE.exam);

  if (p.step === "papers" && p.exam && p.year) {
    const exam = exams.find(e => e.slug === p.exam);
    if (!exam) return viewPyqMock({ step: "exams" });
    const byYear = await buildPyqPaperIndex(p.exam);
    const papers = byYear[String(p.year)] || [];
    const cards = papers.map(paper => {
      const srcEnc = encodeURIComponent(paper.source);
      const subLine = pyqSubjectLine(paper.subjects);
      return `<div class="pyqmock-paper-card" onclick="startPyqPaperMock('${p.exam}', decodeURIComponent('${srcEnc}'))">
        <div class="pyqmock-paper-main">
          <strong>${pyqPaperLabel(paper.source)}</strong>
          <small>${subLine}</small>
        </div>
        <div class="pyqmock-paper-meta">
          <span class="pyqmock-full-badge">Full Paper</span>
          <span class="pyqmock-qcount">${paper.count} Qs</span>
          <span class="pyqmock-go">Start →</span>
        </div>
      </div>`;
    }).join("");
    return `<div class="marks-tests-page pyqmock-page">
      ${pyqMockBackBar("papers", p.exam, p.year)}
      <div class="cpyqb-marks-head">
        <h1>${exam.title} ${p.year}</h1>
        <p>${papers.length} full paper${papers.length === 1 ? "" : "s"} · ${STATE.exam === "Medical" ? "3 hr 20 min" : "3 hr"} each</p>
      </div>
      <div class="pyqmock-paper-list">${cards || '<div class="empty">No papers for this year.</div>'}</div>
    </div>`;
  }

  if (p.step === "years" && p.exam) {
    const exam = exams.find(e => e.slug === p.exam);
    if (!exam) return viewPyqMock({ step: "exams" });
    const byYear = await buildPyqPaperIndex(p.exam);
    const yearList = Object.keys(byYear)
      .filter(y => y !== "Other")
      .sort((a, b) => Number(b) - Number(a));
    const cards = yearList.map(y => {
      const papers = byYear[y];
      const totalQs = papers.reduce((s, x) => s + x.count, 0);
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
        <p>${exam.title} · Select year</p>
      </div>
      <div class="pyqmock-year-grid">${cards || '<div class="empty">No PYQ papers for this exam.</div>'}</div>
    </div>`;
  }

  const cards = exams.map(e => `
    <div class="mth-card" ${mg("pyqmock", { step: "years", exam: e.slug })}>
      <div class="mth-body">
        <strong>${e.title}</strong>
        <small>${e.count.toLocaleString()} PYQs · Year-wise full papers</small>
      </div>
      <div class="mth-sq mth-sq-pink"></div>
      <span class="mth-arrow">›</span>
    </div>`).join("");
  return `<div class="marks-tests-page pyqmock-page">
    ${pyqMockBackBar("exams")}
    <div class="cpyqb-marks-head">
      <h1>PYQ Mock Tests</h1>
      <p>Full exam papers · Year & shift wise — same as MARKS</p>
    </div>
    <div class="marks-tests-hero">${cards || '<div class="empty">No exams for this category.</div>'}</div>
  </div>`;
}

async function startPyqPaperMock(slug, source) {
  if (!_banksLoaded[slug]) await loadSingleBank(slug);
  const qs = QUESTIONS.filter(q => q._bank === slug && q.source === source);
  if (!qs.length) {
    showToast("⚠️ Paper not found. Try again.");
    return;
  }
  const ids = qs.map(q => q.id);
  const duration = pyqPaperDuration(qs.length);
  startTest(ids, source, "tests", {
    testType: "pyqmock",
    timed: true,
    durationSec: duration,
    shuffle: false,
    modeLabel: `Full Paper · ${qs.length} Qs · ${Math.floor(duration / 60)} min`
  });
}

// ============ DIGITAL BOOKS (MARKS Selected — real book questions) ============
let _booksCache = null;
let _booksPayload = { step: "list" };

async function fetchBooks() {
  if (_booksCache) return _booksCache;
  try {
    const res = await fetch("data/books.json");
    if (!res.ok) throw new Error(res.status);
    _booksCache = await res.json();
  } catch (e) {
    _booksCache = { title: "Digital Books", subtitle: "", engineering: [], medical: [], curated: [] };
  }
  return _booksCache;
}

function openDigitalBook(book) {
  if (!book || book.isComingSoon) {
    showToast("📚 This book is coming soon!");
    return;
  }
  const step = book.type === "curated" ? "subjects" : "modules";
  go("books", { step, bookId: book.id, moduleId: book.type === "curated" ? book.id : undefined });
}

async function viewBooks(payload) {
  const p = { ..._booksPayload, ...(payload || {}) };
  _booksPayload = p;
  const catalog = await fetchBooks();

  if (!p.bookId || p.step === "list") {
    const isMed = STATE.exam === "Medical";
    const books = isMed ? (catalog.medical.length ? catalog.medical : catalog.engineering) : catalog.engineering;
    const title = isMed ? "NEET Digital Books" : (catalog.title || "Digital Books");
    const subtitle = catalog.subtitle || "Expert-picked question banks — one tap to practice";

    const renderCard = typeof renderBookCard === "function" ? renderBookCard : (b) => `<div class="book-card">${b.title}</div>`;
    const bookCards = books.map(b => renderCard(b)).join("");
    const curated = (catalog.curated || []).map(c => renderCard({ ...c, type: "curated" })).join("");

    return `${topbar(title, subtitle)}
      <p class="sec-desc">Tap a cover to open — each book shows its own questions only.</p>
      <div class="books-grid">${bookCards || '<div class="empty">No digital books for this exam yet.</div>'}</div>
      ${curated.length && !isMed ? `<h3 class="sec-title">Featured PYQ Collections</h3><div class="curated-grid">${curated}</div>` : ""}`;
  }

  const nav = await fetchBookNav(p.bookId);
  if (!nav || !nav.modules || !nav.modules.length) {
    return `${topbar("Digital Books", "")}<div class="empty">📚 This book is syncing. Please try again in a few minutes.</div>
      <button class="btn-soft" ${mg("books", { step: "list" })}>← Back to books</button>`;
  }

  const bookTitle = nav.title || "Digital Book";
  const mod = nav.modules.find(m => m.id === p.moduleId) || nav.modules[0];
  if (!p.moduleId) p.moduleId = mod.id;

  if (p.step === "modules" && nav.type !== "curated" && nav.modules.length > 1) {
    _lastListFn = () => ({ step: "modules", bookId: p.bookId });
    const bc = breadcrumb([{ label: "Digital Books", view: "books", payload: { step: "list" } }, { label: bookTitle }]);
    const cards = nav.modules.map(m => `
      <div class="exam-card" ${mg("books", { step: "subjects", bookId: p.bookId, moduleId: m.id })}>
        <div class="exam-card-ic">📘</div>
        <strong>${m.title}</strong>
        <small>${m.subtitle || ""}${m.count ? ` · ${m.count.toLocaleString()} questions` : ""}</small>
      </div>`).join("");
    return `${topbar(bookTitle, nav.exam || "MARKS Selected")}${bc}<div class="exam-grid">${cards}</div>`;
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
        <span class="subj-ic">${subjectIcon(s.name)}</span>
        <div><strong>${s.name}</strong><small>${(s.chapters || []).length} chapters · ${s.count.toLocaleString()} questions</small></div>
      </div>`).join("");
    return `${topbar(mod.title, bookTitle)}${bc}<div class="subj-grid">${cards}</div>`;
  }

  const subj = (mod.subjects || []).find(s => s.id === p.subjectId);
  if (!subj) return viewBooks({ step: "subjects", bookId: p.bookId, moduleId: p.moduleId });

  if (p.step === "chapters" || !p.chapterId) {
    _lastListFn = () => ({ step: "chapters", bookId: p.bookId, moduleId: p.moduleId, subjectId: p.subjectId, subjectName: p.subjectName });
    const bc = breadcrumb([
      { label: "Digital Books", view: "books", payload: { step: "list" } },
      { label: bookTitle, view: "books", payload: { step: nav.modules.length > 1 ? "modules" : "subjects", bookId: p.bookId, moduleId: p.moduleId } },
      { label: mod.title, view: "books", payload: { step: "subjects", bookId: p.bookId, moduleId: p.moduleId } },
      { label: subj.name }
    ]);
    const cards = (subj.chapters || []).map(c => `
      <div class="ch-card" ${mg("books", { step: "questions", bookId: p.bookId, moduleId: p.moduleId, subjectId: p.subjectId, subjectName: subj.name, chapterId: c.id, chapterName: c.name, chapterKey: c.key })}>
        <strong>${c.name}</strong><small>${c.count.toLocaleString()} questions</small>
      </div>`).join("");
    return `${topbar(subj.name, mod.title + " · " + bookTitle)}${bc}<div class="ch-grid">${cards}</div>`;
  }

  const ch = (subj.chapters || []).find(c => c.id === p.chapterId);
  const chapterKey = p.chapterKey || (ch && ch.key);
  const chapterName = p.chapterName || (ch && ch.name) || "Chapter";
  if (!chapterKey) return viewBooks({ step: "chapters", bookId: p.bookId, moduleId: p.moduleId, subjectId: p.subjectId });

  await loadBookChapter(p.bookId, chapterKey);
  const qs = getBookQuestions(p.bookId, chapterKey);
  _lastListFn = () => ({ step: "questions", bookId: p.bookId, moduleId: p.moduleId, subjectId: p.subjectId, subjectName: subj.name, chapterId: p.chapterId, chapterName, chapterKey });
  const bc = breadcrumb([
    { label: "Digital Books", view: "books", payload: { step: "list" } },
    { label: bookTitle, view: "books", payload: { step: nav.modules.length > 1 ? "modules" : "subjects", bookId: p.bookId, moduleId: p.moduleId } },
    { label: mod.title, view: "books", payload: { step: "subjects", bookId: p.bookId, moduleId: p.moduleId } },
    { label: subj.name, view: "books", payload: { step: "chapters", bookId: p.bookId, moduleId: p.moduleId, subjectId: p.subjectId, subjectName: subj.name } },
    { label: chapterName }
  ]);
  const testMeta = { title: `${chapterName} · Book Test`, returnTo: "books", limit: 30 };
  return `${topbar(chapterName, subj.name + " · " + bookTitle)}${bc}${renderQList(qs, _listPage, testMeta)}`;
}

function bindBooksOpen() {}

// ============ QUICK CONCEPTS (MARKS: Subject → Chapter → Topic → Concepts) ============
let _qcPayload = { step: "subjects" };
const _qcContentCache = {};

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

  if (p.step === "subjects" || !p.subjectId) {
    const cards = nav.map(s => `
      <div class="subj-card" ${mg("quickconcepts", { step: "chapters", subjectId: s.id, subjectName: s.name })}>
        <span class="subj-ic">${subjectIcon(s.name)}</span>
        <div><strong>${s.name}</strong><small>${s.chaptersCount || (s.chapters || []).length} chapters · ${s.topicsCount || 0} topics</small></div>
      </div>`).join("");
    return `${topbar("Quick Concepts", "Fast revision — MARKS topicwise notes & examples")}
      <div class="subj-grid">${cards || '<div class="empty">Quick Concepts syncing…</div>'}</div>`;
  }

  const subj = nav.find(s => s.id === p.subjectId);
  if (!subj) return viewQuickConcepts({ step: "subjects" });

  if (p.step === "chapters" || !p.chapterId) {
    const bc = breadcrumb([
      { label: "Quick Concepts", view: "quickconcepts", payload: { step: "subjects" } },
      { label: subj.name }
    ]);
    const cards = (subj.chapters || []).map(c => `
      <div class="ch-card" ${mg("quickconcepts", { step: "topics", subjectId: p.subjectId, subjectName: subj.name, chapterId: c.id, chapterName: c.name })}>
        <strong>${c.name}</strong><small>${c.topicsCount || (c.topics || []).length} topics</small>
      </div>`).join("");
    return `${topbar(subj.name, "Select a chapter")}${bc}<div class="ch-grid">${cards}</div>`;
  }

  const ch = (subj.chapters || []).find(c => c.id === p.chapterId);
  if (!ch) return viewQuickConcepts({ step: "chapters", subjectId: p.subjectId, subjectName: subj.name });

  if (p.step === "topics" || !p.topicId) {
    const bc = breadcrumb([
      { label: "Quick Concepts", view: "quickconcepts", payload: { step: "subjects" } },
      { label: subj.name, view: "quickconcepts", payload: { step: "chapters", subjectId: p.subjectId, subjectName: subj.name } },
      { label: ch.name }
    ]);
    const cards = (ch.topics || []).map(t => `
      <div class="ch-card qx-topic-card" ${mg("quickconcepts", { step: "content", subjectId: p.subjectId, subjectName: subj.name, chapterId: p.chapterId, chapterName: ch.name, topicId: t.id, topicTitle: t.title })}>
        <div class="qx-topic-body"><strong>${t.title}</strong></div>
      </div>`).join("");
    return `${topbar(ch.name, subj.name)}${bc}<div class="ch-grid qx-topic-grid">${cards || '<div class="empty">No topics on MARKS.</div>'}</div>`;
  }

  const content = await fetchQcContent(p.subjectId, p.chapterId, p.topicId);
  const bc = breadcrumb([
    { label: "Quick Concepts", view: "quickconcepts", payload: { step: "subjects" } },
    { label: subj.name, view: "quickconcepts", payload: { step: "chapters", subjectId: p.subjectId, subjectName: subj.name } },
    { label: ch.name, view: "quickconcepts", payload: { step: "topics", subjectId: p.subjectId, subjectName: subj.name, chapterId: p.chapterId, chapterName: ch.name } },
    { label: p.topicTitle || "Topic" }
  ]);
  if (!content) {
    return `${topbar(p.topicTitle || "Topic", ch.name)}${bc}
      <div class="empty">Topic content syncing — run extract_qc_content.py</div>`;
  }
  const concepts = (content.concepts || []).map(c => `
    <div class="qc-concept-card">
      <h3>${c.title || p.topicTitle || ""}</h3>
      <div class="qx-content">${typeof Mx !== "undefined" ? Mx.html(c.conceptBody || c.body || "") : (c.conceptBody || c.body || "")}</div>
    </div>`).join("");
  const examples = (content.examples || []).map((ex, i) => `
    <div class="qc-example-card">
      <span class="tag">Example ${i + 1}</span>
      <div class="qx-content">${typeof Mx !== "undefined" ? Mx.html(ex.title || ex.q || "") : (ex.title || ex.q || "")}</div>
    </div>`).join("");
  return `${topbar(p.topicTitle || "Topic", `${ch.name} · ${subj.name}`)}${bc}
    <div class="qc-content">${concepts || '<div class="empty">No concept notes.</div>'}</div>
    ${examples ? `<h3 class="sec-title">Examples</h3><div class="qc-examples">${examples}</div>` : ""}`;
}

// ============ MARKS-STYLE DASHBOARD SECTIONS ============
async function marksDashboardSections() {
  const [nav, bookCatalog] = await Promise.all([fetchNav("cpyqb"), fetchBooks()]);
  const exams = nav.filter(e => e.category === STATE.exam).slice(0, 8);
  const dashBooks = STATE.exam === "Medical"
    ? (bookCatalog.medical || [])
    : (bookCatalog.engineering || []);
  const bookScroll = typeof renderBookScroll === "function" ? renderBookScroll(dashBooks, 7) : "";
  const examScroll = exams.map(e => `
    <div class="exam-pill-card" ${mg("cpyqb", { step: "subjects", exam: e.slug })}>
      <strong>${e.title}</strong><small>${e.count.toLocaleString()} qs</small>
    </div>`).join("");
  const subjects = EXAMS[STATE.exam].subjects;
  const subjGrid = subjects.map(s => `
    <div class="subj-mini" ${mg("allqs", { step: "chapters", subject: s })}>
      <span>${subjectIcon(s)}</span><strong>${s}</strong>
    </div>`).join("");
  return `
    <div class="marks-section">
      <div class="marks-sec-head"><h3>All Question Bank</h3><a href="#" ${mg("allqs", { step: "subjects" })}>View All →</a></div>
      <div class="subj-mini-grid">${subjGrid}</div>
    </div>
    ${STATE.exam === "Medical" ? `<div class="marks-section">
      <div class="marks-sec-head"><h3>NCERT Based Qs Bank</h3><a href="#" ${mg("ncert", { step: "subjects" })}>Open →</a></div>
      <p class="sec-desc">100% aligned with latest NEET syllabus</p>
    </div>` : ""}
    <div class="marks-section">
      <div class="marks-sec-head"><h3>Digital Books</h3><a href="#" ${mg("books", { step: "list" })}>View All →</a></div>
      <p class="sec-desc">HC Verma, Irodov, 99% Bank & more — tap cover to open</p>
      ${bookScroll}
    </div>
    <div class="marks-section">
      <div class="marks-sec-head"><h3>Chapter-wise PYQ Bank</h3><a href="#" ${mg("cpyqb", {})}>View All →</a></div>
      <div class="exam-scroll">${examScroll}</div>
    </div>`;
}