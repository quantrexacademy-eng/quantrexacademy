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

function renderQCard(q) {
  const bm = STATE.bookmarks.includes(q.id);
  const sv = STATE.solved.find(s => s.id === q.id);
  const tag = q.subject.toLowerCase().replace(/\s+/g, "-");
  return `<div class="q-card" onclick="go('question', ${q.id})">
    <div class="q-meta">
      <span class="tag tag-${tag}">${q.subject}</span>
      <span class="tag tag-diff">${q.difficulty}</span>
      ${sv ? `<span class="tag ${sv.correct ? "tag-ok" : "tag-no"}">${sv.correct ? "✓" : "✗"}</span>` : ""}
    </div>
    <div class="q-text">${qPreview(q.q)}</div>
    <div class="q-footer"><small>${q._book ? `<span class="qx-book-badge" title="${q.source || ""}">📕 ${q.source || "Digital Book"}</span>` : "📖 " + q.chapter}${q._book ? "" : " · 📌 " + q.source}</small><span>${bm ? "🔖" : "🤍"}</span></div>
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
    _lastListFn = () => ({ step: "chapters", exam: p.exam, subject: p.subject });
    const bc = breadcrumb([
      { label: "PYQ Bank", view: "cpyqb", payload: { step: "exams" } },
      { label: exam.title, view: "cpyqb", payload: { step: "subjects", exam: p.exam } },
      { label: p.subject }
    ]);
    const cards = subj.chapters.map(c => {
      const parts = [`${c.count} questions`];
      if (c.buckets && c.buckets.length) parts.push(`${c.buckets.length} buckets`);
      if (c.topics && c.topics.length) parts.push(`${c.topics.length} subtopics`);
      return `<div class="ch-card qx-ch-row" ${mg("cpyqb", { step: "chapterHub", exam: p.exam, subject: p.subject, chapter: c.name })}>
        <div class="qx-ch-body"><strong>${c.name}</strong><small>${parts.join(" · ")}</small></div>
        ${c.topics && c.topics.length ? `<span class="qx-ch-badge topic">Topicwise</span>` : ""}
        ${c.buckets && c.buckets.length ? `<span class="qx-ch-badge bucket">Buckets</span>` : ""}
      </div>`;
    }).join("");
    return `${topbar(p.subject, exam.title)}${bc}<div class="ch-grid">${cards}</div>`;
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

// ============ QUANTREX TESTS ============
function viewTests() {
  const sum = typeof QuantrexAnalytics !== "undefined" ? QuantrexAnalytics.summary() : { attempts: 0, avgPct: 0, bestPct: 0 };
  const primarySlug = (typeof PRIMARY_BANK !== "undefined" && PRIMARY_BANK[STATE.exam]) || "jee_main";
  const mockLabel = STATE.exam === "Medical" ? "NEET Full Mock (180 Q)" : "JEE Main Mock (90 Q)";
  return `${topbar("Assessment Center", "Timed mocks, chapter tests & custom practice")}
    <div class="dash-stats">
      <div class="ds"><strong>${sum.attempts}</strong><small>Tests Completed</small></div>
      <div class="ds"><strong>${sum.avgPct}%</strong><small>Average Score</small></div>
      <div class="ds"><strong>${sum.bestPct}%</strong><small>Personal Best</small></div>
      <div class="ds"><strong>${STATE.solved.length}</strong><small>Practice Solved</small></div>
    </div>
    <div class="tests-grid">
      <div class="test-card" ${mg("custom", { step: "landing" })}>
        <span class="test-ic">🧪</span>
        <strong>Custom Tests</strong>
        <small>Select chapters → configure → timed or practice test</small>
        <button class="btn-primary sm">Create Test →</button>
      </div>
      <div class="test-card" onclick="startMockTest('${primarySlug}')">
        <span class="test-ic">⏱️</span>
        <strong>${mockLabel}</strong>
        <small>3-hour simulation with JEE/NEET scoring (+4/−1)</small>
        <button class="btn-primary sm">Start Mock →</button>
      </div>
      <div class="test-card" ${mg("cpyqb", { step: "exams" })}>
        <span class="test-ic">📋</span>
        <strong>Chapter PYQ Tests</strong>
        <small>30-question timed tests from any PYQ chapter</small>
        <button class="btn-soft sm">Browse PYQs →</button>
      </div>
      <div class="test-card" ${mg("dpp", { step: "subjects" })}>
        <span class="test-ic">📝</span>
        <strong>DPP Timed Sets</strong>
        <small>Daily practice with timer & solutions</small>
        <button class="btn-soft sm">Start DPP →</button>
      </div>
      <div class="test-card" onclick="go('analytics')">
        <span class="test-ic">📊</span>
        <strong>Performance Analytics</strong>
        <small>Subject breakdown, history & accuracy trends</small>
        <button class="btn-soft sm">View Stats →</button>
      </div>
      <div class="test-card" ${mg("books", { step: "list" })}>
        <span class="test-ic">📖</span>
        <strong>Digital Book Tests</strong>
        <small>Chapter tests from expert question banks</small>
        <button class="btn-soft sm">Open Books →</button>
      </div>
    </div>`;
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
      <div class="marks-sec-head"><h3>Chapter-wise PYQ Bank</h3><a href="#" ${mg("cpyqb", { step: "exams" })}>View All →</a></div>
      <div class="exam-scroll">${examScroll}</div>
    </div>`;
}