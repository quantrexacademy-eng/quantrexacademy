// Quantrex Bookmarks — exam / subject / topic metadata + custom groups
const QuantrexBookmarks = (() => {
  const STORE_KEY = "quantrex_bookmarks_v2";
  const LEGACY_KEY = "quantrex_bookmarks";
  const GROUP_COLORS = ["#6366f1", "#0ea5e9", "#14b8a6", "#f59e0b", "#ef4444", "#a855f7", "#ec4899"];

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return migrateLegacy();
  }

  function save(store) {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    syncLegacyIds(store);
    if (typeof _syncDb === "function") _syncDb();
  }

  function syncLegacyIds(store) {
    const ids = (store.items || []).map(x => x.id);
    localStorage.setItem(LEGACY_KEY, JSON.stringify(ids));
  }

  function migrateLegacy() {
    let legacy = [];
    try { legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]"); } catch (e) { /* ignore */ }
    const store = { groups: [], items: [] };
    legacy.forEach(id => {
      const meta = metaFromQuestion(id);
      store.items.push({
        id,
        groupId: null,
        exam: meta.exam,
        examSlug: meta.examSlug,
        subject: meta.subject,
        chapter: meta.chapter,
        topic: meta.topic,
        source: meta.source,
        savedAt: Date.now()
      });
    });
    save(store);
    return store;
  }

  function metaFromQuestion(id) {
    const q = typeof getQ === "function" ? getQ(id) : null;
    const exam = typeof STATE !== "undefined" ? STATE.exam : "Engineering";
    if (typeof id === "string" && id.startsWith("f")) {
      const f = typeof FORMULAS !== "undefined" ? FORMULAS.find(x => "f" + x.id === id) : null;
      return {
        exam,
        examSlug: null,
        subject: f ? f.subject : null,
        chapter: null,
        topic: f ? f.topic : null,
        source: "Formula"
      };
    }
    if (!q) return { exam, examSlug: null, subject: null, chapter: null, topic: null, source: null };
    return {
      exam: q.exam || exam,
      examSlug: q._bank || (typeof _currentBankSlug !== "undefined" ? _currentBankSlug : null),
      subject: q.subject || null,
      chapter: q.chapter || null,
      topic: q.topic || q.chapter || null,
      source: q.source || q.paperSource || null
    };
  }

  function itemKey(id) {
    return typeof id === "string" ? id : Number(id);
  }

  function findItem(store, id) {
    const key = itemKey(id);
    return store.items.find(x => itemKey(x.id) === key);
  }

  function isBookmarked(id) {
    return !!findItem(load(), id);
  }

  function toggle(id, meta) {
    const store = load();
    const hit = findItem(store, id);
    if (hit) {
      store.items = store.items.filter(x => itemKey(x.id) !== itemKey(id));
      save(store);
      return false;
    }
    const m = { ...metaFromQuestion(id), ...(meta || {}) };
    store.items.unshift({
      id,
      groupId: m.groupId || null,
      exam: m.exam,
      examSlug: m.examSlug,
      subject: m.subject,
      chapter: m.chapter,
      topic: m.topic,
      source: m.source,
      savedAt: Date.now()
    });
    save(store);
    return true;
  }

  function assignGroup(id, groupId) {
    const store = load();
    const hit = findItem(store, id);
    if (!hit) return;
    hit.groupId = groupId || null;
    save(store);
  }

  function createGroup(name) {
    const store = load();
    const trimmed = String(name || "").trim();
    if (!trimmed) return null;
    const g = {
      id: "g" + Date.now(),
      name: trimmed,
      color: GROUP_COLORS[store.groups.length % GROUP_COLORS.length],
      createdAt: Date.now()
    };
    store.groups.push(g);
    save(store);
    return g;
  }

  function renameGroup(id, name) {
    const store = load();
    const g = store.groups.find(x => x.id === id);
    if (!g) return;
    g.name = String(name || "").trim() || g.name;
    save(store);
  }

  function deleteGroup(id) {
    const store = load();
    store.groups = store.groups.filter(x => x.id !== id);
    store.items.forEach(it => { if (it.groupId === id) it.groupId = null; });
    save(store);
  }

  function remove(id) {
    const store = load();
    store.items = store.items.filter(x => itemKey(x.id) !== itemKey(id));
    save(store);
  }

  function getItems(filter) {
    const f = filter || {};
    let items = load().items.slice();
    if (f.exam && f.exam !== "all") items = items.filter(x => x.exam === f.exam);
    if (f.subject && f.subject !== "all") items = items.filter(x => x.subject === f.subject);
    if (f.chapter && f.chapter !== "all") items = items.filter(x => x.chapter === f.chapter || x.topic === f.chapter);
    if (f.groupId === "none") items = items.filter(x => !x.groupId);
    else if (f.groupId && f.groupId !== "all") items = items.filter(x => x.groupId === f.groupId);
    if (f.type === "formula") items = items.filter(x => typeof x.id === "string" && x.id.startsWith("f"));
    else if (f.type === "question") items = items.filter(x => typeof x.id === "number");
    return items;
  }

  function examOptions(items) {
    const set = new Set(items.map(x => x.exam).filter(Boolean));
    return ["all", ...set];
  }

  function subjectOptions(items, exam) {
    let pool = items;
    if (exam && exam !== "all") pool = pool.filter(x => x.exam === exam);
    const set = new Set(pool.map(x => x.subject).filter(Boolean));
    return ["all", ...set];
  }

  function chapterOptions(items, exam, subject) {
    let pool = items;
    if (exam && exam !== "all") pool = pool.filter(x => x.exam === exam);
    if (subject && subject !== "all") pool = pool.filter(x => x.subject === subject);
    const set = new Set(pool.map(x => x.chapter || x.topic).filter(Boolean));
    return ["all", ...set];
  }

  function bookmarkCount() {
    return load().items.length;
  }

  return {
    load, save, toggle, remove, isBookmarked, assignGroup,
    createGroup, renameGroup, deleteGroup, getItems,
    examOptions, subjectOptions, chapterOptions, bookmarkCount, metaFromQuestion
  };
})();

let _nbFilter = { exam: "all", subject: "all", chapter: "all", groupId: "all", type: "question" };

function qxBookmarkMeta(id) {
  return QuantrexBookmarks.metaFromQuestion(id);
}

function toggleBm(id, meta) {
  const added = QuantrexBookmarks.toggle(id, meta);
  const main = document.getElementById("app-main");
  if (currentView === "question" && main) {
    (async () => {
      await qxHydrateQuestion(getQ(id), false);
      main.innerHTML = viewQuestion(id);
      bindPracticeQuestion(main);
      if (typeof Mx !== "undefined") Mx.afterRender(main);
    })();
  } else if (currentView === "notebook") {
    render("notebook");
  } else {
    render("question", id);
  }
  showToast(added ? "🔖 Saved to notebook!" : "Removed bookmark");
}

function toggleBmWithGroup(id) {
  if (QuantrexBookmarks.isBookmarked(id)) {
    toggleBm(id);
    return;
  }
  const meta = qxBookmarkMeta(id);
  const store = QuantrexBookmarks.load();
  const groups = store.groups || [];
  if (!groups.length) {
    toggleBm(id, meta);
    return;
  }
  const opts = groups.map(g =>
    `<button type="button" class="qx-bm-grp-opt" data-gid="${g.id}" style="--gc:${g.color}">${g.name}</button>`
  ).join("");
  const existing = document.getElementById("qxBmGroupPop");
  if (existing) existing.remove();
  const pop = document.createElement("div");
  pop.id = "qxBmGroupPop";
  pop.className = "marks-modal-overlay";
  pop.innerHTML = `<div class="marks-modal qx-bm-pop">
    <div class="marks-modal-head"><h3>Save bookmark</h3>
      <button type="button" class="marks-modal-cancel" style="flex:0;padding:6px 12px" onclick="qxCloseBmPop()">✕</button></div>
    <div class="marks-modal-body">
      <p class="qx-bm-meta">${meta.subject || "Question"} · ${meta.chapter || meta.topic || meta.exam || ""}</p>
      <button type="button" class="btn-primary qx-bm-save-default" onclick="qxBmSaveDefault(${typeof id === "number" ? id : `'${id}'`})">Save now (default)</button>
      <p class="qx-bm-or">or add to group</p>
      <div class="qx-bm-grp-list">${opts}</div>
      <button type="button" class="btn-soft qx-bm-new-grp" onclick="qxBmNewGroupPrompt(${typeof id === "number" ? id : `'${id}'`})">+ Create new group</button>
    </div>
  </div>`;
  pop.onclick = e => { if (e.target === pop) qxCloseBmPop(); };
  document.body.appendChild(pop);
  pop.querySelectorAll(".qx-bm-grp-opt").forEach(btn => {
    btn.onclick = () => {
      toggleBm(id, { ...meta, groupId: btn.dataset.gid });
      qxCloseBmPop();
    };
  });
}

function qxCloseBmPop() {
  const el = document.getElementById("qxBmGroupPop");
  if (el) el.remove();
}

function qxBmSaveDefault(id) {
  toggleBm(id, qxBookmarkMeta(id));
  qxCloseBmPop();
}

function qxBmNewGroupPrompt(id) {
  const name = prompt("Group name (e.g. Rotation, Organic Chemistry)");
  if (!name || !name.trim()) return;
  const g = QuantrexBookmarks.createGroup(name.trim());
  if (g) toggleBm(id, { ...qxBookmarkMeta(id), groupId: g.id });
  qxCloseBmPop();
}

function nbSetFilter(key, val) {
  _nbFilter[key] = val;
  if (key === "exam") { _nbFilter.subject = "all"; _nbFilter.chapter = "all"; }
  if (key === "subject") _nbFilter.chapter = "all";
  render("notebook");
}

function nbCreateGroup() {
  const name = prompt("New group name");
  if (!name || !name.trim()) return;
  QuantrexBookmarks.createGroup(name.trim());
  showToast("✅ Group created");
  render("notebook");
}

function viewNotebook() {
  const notes = STATE.notes;
  const store = QuantrexBookmarks.load();
  const allItems = store.items;
  const qItems = QuantrexBookmarks.getItems({ ..._nbFilter, type: "question" });
  const fItems = QuantrexBookmarks.getItems({ type: "formula" });

  const exams = QuantrexBookmarks.examOptions(allItems.filter(x => typeof x.id === "number"));
  const subs = QuantrexBookmarks.subjectOptions(allItems, _nbFilter.exam);
  const chaps = QuantrexBookmarks.chapterOptions(allItems, _nbFilter.exam, _nbFilter.subject);

  const filterBar = `<div class="nb-filters">
    <select onchange="nbSetFilter('exam', this.value)">${exams.map(e => `<option value="${e}" ${_nbFilter.exam === e ? "selected" : ""}>${e === "all" ? "All Exams" : e}</option>`).join("")}</select>
    <select onchange="nbSetFilter('subject', this.value)">${subs.map(s => `<option value="${s}" ${_nbFilter.subject === s ? "selected" : ""}>${s === "all" ? "All Subjects" : s}</option>`).join("")}</select>
    <select onchange="nbSetFilter('chapter', this.value)">${chaps.map(c => `<option value="${c}" ${_nbFilter.chapter === c ? "selected" : ""}>${c === "all" ? "All Topics" : c}</option>`).join("")}</select>
    <select onchange="nbSetFilter('groupId', this.value)">
      <option value="all" ${_nbFilter.groupId === "all" ? "selected" : ""}>All Groups</option>
      <option value="none" ${_nbFilter.groupId === "none" ? "selected" : ""}>Uncategorized</option>
      ${store.groups.map(g => `<option value="${g.id}" ${_nbFilter.groupId === g.id ? "selected" : ""}>${g.name}</option>`).join("")}
    </select>
  </div>`;

  const groupBar = `<div class="nb-groups-bar">
    <button type="button" class="btn-soft sm" onclick="nbCreateGroup()">+ Create Group</button>
    ${store.groups.map(g => `<span class="nb-grp-pill" style="--gc:${g.color}">${g.name} <small>${allItems.filter(x => x.groupId === g.id).length}</small></span>`).join("")}
  </div>`;

  const qCards = qItems.length ? qItems.map(it => {
    const q = getQ(it.id);
    if (!q) return "";
    const grp = it.groupId ? store.groups.find(g => g.id === it.groupId) : null;
    return `<div class="q-card nb-q-card" onclick="openPracticeQuestion(${q.id})">
      <div class="q-meta">
        <span class="tag tag-${(q.subject || "").toLowerCase().replace(/\s+/g, "-")}">${q.subject}</span>
        ${grp ? `<span class="nb-grp-tag" style="--gc:${grp.color}">${grp.name}</span>` : ""}
      </div>
      <div class="q-text qx-content">${typeof Mx !== "undefined" ? Mx.html(q.q) : q.q}</div>
      <div class="q-footer"><small>📖 ${it.chapter || it.topic || "—"} · ${it.examSlug || it.exam || ""}</small>
        <button type="button" class="nb-rm" onclick="event.stopPropagation();QuantrexBookmarks.remove(${q.id});render('notebook')">✕</button></div>
    </div>`;
  }).join("") : '<div class="empty">Bookmark questions from practice — saved with exam, subject & topic automatically.</div>';

  const fCards = fItems.length ? fItems.map(it => {
    const f = FORMULAS.find(x => "f" + x.id === it.id);
    if (!f) return "";
    return `<div class="note-card"><div class="fc-formula qx-content">${typeof Mx !== "undefined" ? Mx.html(f.formula) : f.formula}</div><small>${f.subject} · ${f.topic}</small></div>`;
  }).join("") : '<div class="empty">Bookmark formulas to revisit them quickly.</div>';

  return `${topbar("My Notebook", "Saved by exam, subject & topic — organize with groups")}
  <div class="nb-section">
    <h3 class="sec-title">➕ Quick Note</h3>
    <div class="note-add">
      <textarea id="noteText" placeholder="Type a quick note or concept you want to remember..."></textarea>
      <button class="btn-primary" onclick="addNoteFromInput()">Save Note</button>
    </div>
  </div>
  <div class="nb-section">
    <h3 class="sec-title">📝 My Notes (${notes.length})</h3>
    ${notes.length ? notes.map(n => `<div class="note-card"><p>${n.text.replace(/</g, "&lt;")}</p>
      <div class="note-meta"><small>${n.date}</small><button onclick="deleteNote(${n.id})">🗑️</button></div></div>`).join("")
      : '<div class="empty">No notes yet. Add one above!</div>'}
  </div>
  <div class="nb-section">
    <h3 class="sec-title">🔖 Saved Questions (${qItems.length})</h3>
    ${groupBar}
    ${filterBar}
    <div class="q-list">${qCards}</div>
  </div>
  <div class="nb-section">
    <h3 class="sec-title">🧮 Saved Formulas (${fItems.length})</h3>
    ${fCards}
  </div>`;
}