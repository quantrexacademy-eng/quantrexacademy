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
  // Instant UI update without full re-render flash
  document.querySelectorAll(".qx-bm-btn, .qx-bm-icon-only").forEach(btn => {
    const isGroup = btn.classList.contains("qx-bm-group");
    if (isGroup) return;
    btn.classList.toggle("on", added);
    btn.setAttribute("aria-pressed", added ? "true" : "false");
    btn.title = added ? "Remove bookmark" : "Bookmark question";
    const lbl = btn.querySelector(".qx-bm-lbl");
    if (lbl) lbl.textContent = added ? "Saved" : "Bookmark";
  });
  const main = document.getElementById("app-main");
  if (currentView === "question" && main) {
    // keep practice session; only refresh chrome if needed
    if (typeof window._qxPracticeCtx === "undefined") {
      (async () => {
        await qxHydrateQuestion(getQ(id), false);
        main.innerHTML = viewQuestion(id);
        bindPracticeQuestion(main);
        if (typeof Mx !== "undefined") Mx.afterRender(main);
      })();
    }
  } else if (currentView === "notebook") {
    render("notebook");
  }
  showToast(added ? "🔖 Saved to My Notebook" : "Bookmark removed");
}

const QX_BM_GROUP_MAX = 90;

function qxBmEsc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function qxBmJsId(id) {
  if (typeof qxJsId === "function") return qxJsId(id);
  return typeof id === "number" ? String(id) : JSON.stringify(String(id));
}

function qxBmHumanMeta(id) {
  const meta = qxBookmarkMeta(id);
  const q = typeof getQ === "function" ? getQ(id) : null;
  let subject = meta.subject || "Question";
  let chapter = meta.chapter || meta.topic || "";
  if (q && typeof QuantrexStrip !== "undefined") {
    try {
      if (QuantrexStrip.humanSubject) subject = QuantrexStrip.humanSubject(q) || subject;
      if (QuantrexStrip.humanChapter) chapter = QuantrexStrip.humanChapter(q) || chapter;
    } catch (_) { /* */ }
  }
  // Strip Mongo-looking ids
  if (/^[a-f0-9]{24}$/i.test(String(subject))) subject = "Subject";
  if (/^[a-f0-9]{24}$/i.test(String(chapter))) chapter = "";
  return { ...meta, subject, chapter };
}

function qxBmGroupCount(store, gid) {
  return (store.items || []).filter(x => x.groupId === gid).length;
}

/** Open ExamGoal-style right panel: Add to Bookmark / Create group */
function toggleBmWithGroup(id) {
  const meta = qxBmHumanMeta(id);
  const store = QuantrexBookmarks.load();
  const groups = (store.groups || []).slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const existing = document.getElementById("qxBmGroupPop");
  if (existing) existing.remove();

  const chapterLabel = meta.chapter || meta.topic || meta.subject || "this chapter";
  const pathBits = [
    meta.subject ? `${qxBmEsc(meta.subject)} Chapters` : "Chapters",
    meta.chapter ? qxBmEsc(meta.chapter) : null,
    "More",
    "Bookmarked Questions"
  ].filter(Boolean);

  const groupRows = groups.length
    ? groups.map(g => {
      const n = qxBmGroupCount(store, g.id);
      const full = n >= QX_BM_GROUP_MAX;
      return `<div class="qx-bm-drawer-row" data-gid="${qxBmEsc(g.id)}">
        <div class="qx-bm-drawer-row-left">
          <span class="qx-bm-drawer-folder" style="--gc:${g.color || "#2563eb"}" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h3.1l1.4 1.6h8.5a2 2 0 0 1 2 2v8.4a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10z" fill="currentColor"/></svg>
          </span>
          <div class="qx-bm-drawer-row-meta">
            <strong>${qxBmEsc(g.name)}</strong>
            <span>${n} question${n === 1 ? "" : "s"}</span>
          </div>
        </div>
        <button type="button" class="qx-bm-drawer-add" data-gid="${qxBmEsc(g.id)}" ${full ? "disabled" : ""}>${full ? "Full" : "Add"}</button>
      </div>`;
    }).join("")
    : `<div class="qx-bm-drawer-empty">No groups yet. Create one below to organise bookmarks.</div>`;

  const pop = document.createElement("div");
  pop.id = "qxBmGroupPop";
  pop.className = "qx-bm-drawer-overlay";
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-modal", "true");
  pop.setAttribute("aria-label", "Add to Bookmark");
  pop.innerHTML = `
    <div class="qx-bm-drawer" id="qxBmDrawer">
      <header class="qx-bm-drawer-head">
        <div class="qx-bm-drawer-head-left">
          <span class="qx-bm-drawer-head-ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M6 3.5h12a1.5 1.5 0 0 1 1.5 1.5v15.2a.9.9 0 0 1-1.4.75L12 16.6l-6.1 4.35A.9.9 0 0 1 4.5 20.2V5A1.5 1.5 0 0 1 6 3.5z" fill="currentColor"/></svg>
          </span>
          <div>
            <h3>Add to Bookmark</h3>
            <p>Organize your questions</p>
          </div>
        </div>
        <button type="button" class="qx-bm-drawer-close" id="qxBmDrawerClose" aria-label="Close">X</button>
      </header>

      <div class="qx-bm-drawer-body">
        <section class="qx-bm-quick">
          <div class="qx-bm-quick-top">
            <div class="qx-bm-quick-title">
              <span class="qx-bm-quick-bolt" aria-hidden="true">&#9889;</span>
              <strong>Quick Save to Chapter</strong>
            </div>
            <span class="qx-bm-new-badge">NEW</span>
          </div>
          <p class="qx-bm-quick-desc">Automatically save to <strong>${qxBmEsc(chapterLabel)}</strong> chapter group for quick access later.</p>
          <div class="qx-bm-quick-path">
            <div class="qx-bm-quick-path-label">How to Save this question:</div>
            <div class="qx-bm-crumb">${pathBits.map((b, i) =>
              `<span>${b}</span>${i < pathBits.length - 1 ? `<span class="qx-bm-crumb-sep">&#8250;</span>` : ""}`
            ).join("")}</div>
          </div>
          <button type="button" class="qx-bm-quick-save" id="qxBmQuickChapter">+ Save to ${qxBmEsc(chapterLabel)}</button>
        </section>

        <section class="qx-bm-groups-sec">
          <div class="qx-bm-groups-head">
            <div class="qx-bm-groups-title">
              <span class="qx-bm-groups-ic" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16"><path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h3.1l1.4 1.6h8.5a2 2 0 0 1 2 2v8.4a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10z" fill="currentColor"/></svg>
              </span>
              <strong>Your Bookmark Groups</strong>
            </div>
            <span class="qx-bm-groups-count">${groups.length}</span>
          </div>
          <div class="qx-bm-groups-list" id="qxBmGroupsList">${groupRows}</div>
        </section>
      </div>

      <footer class="qx-bm-drawer-foot">
        <div class="qx-bm-create-form" id="qxBmCreateForm" hidden>
          <input type="text" id="qxBmNewGroupName" class="qx-bm-create-input" maxlength="60" placeholder="Group name (e.g. Limits, Organic)" autocomplete="off">
          <div class="qx-bm-create-actions">
            <button type="button" class="qx-bm-create-cancel" id="qxBmCreateCancel">Cancel</button>
            <button type="button" class="qx-bm-create-ok" id="qxBmCreateOk">Create &amp; Add</button>
          </div>
        </div>
        <button type="button" class="qx-bm-create-btn" id="qxBmCreateOpen">+ Create New Group</button>
        <p class="qx-bm-max-note">Maximum ${QX_BM_GROUP_MAX} questions per group</p>
      </footer>
    </div>`;

  document.body.appendChild(pop);
  requestAnimationFrame(() => pop.classList.add("open"));

  const close = () => qxCloseBmPop();
  pop.querySelector("#qxBmDrawerClose")?.addEventListener("click", close);
  pop.addEventListener("click", (e) => { if (e.target === pop) close(); });

  pop.querySelector("#qxBmQuickChapter")?.addEventListener("click", () => {
    qxBmSaveToChapter(id, meta);
  });

  pop.querySelectorAll(".qx-bm-drawer-add").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      qxBmAddToGroup(id, btn.getAttribute("data-gid"));
    });
  });

  const form = pop.querySelector("#qxBmCreateForm");
  const openBtn = pop.querySelector("#qxBmCreateOpen");
  const nameInp = pop.querySelector("#qxBmNewGroupName");
  openBtn?.addEventListener("click", () => {
    form?.removeAttribute("hidden");
    openBtn.setAttribute("hidden", "");
    nameInp?.focus();
  });
  pop.querySelector("#qxBmCreateCancel")?.addEventListener("click", () => {
    form?.setAttribute("hidden", "");
    openBtn?.removeAttribute("hidden");
    if (nameInp) nameInp.value = "";
  });
  const doCreate = () => {
    const name = (nameInp && nameInp.value || "").trim();
    if (!name) {
      nameInp?.focus();
      return;
    }
    const g = QuantrexBookmarks.createGroup(name);
    if (!g) return;
    qxBmAddToGroup(id, g.id);
  };
  pop.querySelector("#qxBmCreateOk")?.addEventListener("click", doCreate);
  nameInp?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); doCreate(); }
    if (e.key === "Escape") close();
  });
}

function qxCloseBmPop() {
  const el = document.getElementById("qxBmGroupPop");
  if (!el) return;
  el.classList.remove("open");
  setTimeout(() => el.remove(), 180);
}

function qxBmEnsureBookmarked(id, meta, groupId) {
  const m = { ...(meta || qxBookmarkMeta(id)), groupId: groupId || null };
  if (!QuantrexBookmarks.isBookmarked(id)) {
    QuantrexBookmarks.toggle(id, m);
    return true;
  }
  if (groupId) QuantrexBookmarks.assignGroup(id, groupId);
  return true;
}

function qxBmAddToGroup(id, groupId) {
  if (!groupId) return;
  const store = QuantrexBookmarks.load();
  const n = qxBmGroupCount(store, groupId);
  if (n >= QX_BM_GROUP_MAX) {
    if (typeof showToast === "function") showToast("Group is full (max " + QX_BM_GROUP_MAX + ")");
    return;
  }
  const meta = qxBmHumanMeta(id);
  qxBmEnsureBookmarked(id, meta, groupId);
  // refresh UI chrome
  document.querySelectorAll(".qx-bm-btn:not(.qx-bm-group), .qx-bm-icon-only").forEach((btn) => {
    btn.classList.add("on");
    btn.setAttribute("aria-pressed", "true");
    const lbl = btn.querySelector(".qx-bm-lbl");
    if (lbl) lbl.textContent = "Saved";
  });
  const g = store.groups.find(x => x.id === groupId) || QuantrexBookmarks.load().groups.find(x => x.id === groupId);
  if (typeof showToast === "function") {
    showToast(g ? ("Saved to " + g.name) : "Saved to group");
  }
  qxCloseBmPop();
  if (typeof currentView !== "undefined" && currentView === "notebook" && typeof render === "function") {
    render("notebook");
  }
}

function qxBmSaveToChapter(id, metaIn) {
  const meta = metaIn || qxBmHumanMeta(id);
  const chName = (meta.chapter || meta.topic || meta.subject || "Chapter").trim();
  const store = QuantrexBookmarks.load();
  let g = (store.groups || []).find(x => String(x.name).toLowerCase() === chName.toLowerCase());
  if (!g) g = QuantrexBookmarks.createGroup(chName);
  if (!g) return;
  qxBmAddToGroup(id, g.id);
}

function qxBmSaveDefault(id) {
  const meta = qxBmHumanMeta(id);
  if (!QuantrexBookmarks.isBookmarked(id)) {
    QuantrexBookmarks.toggle(id, meta);
  }
  document.querySelectorAll(".qx-bm-btn:not(.qx-bm-group), .qx-bm-icon-only").forEach((btn) => {
    btn.classList.add("on");
    const lbl = btn.querySelector(".qx-bm-lbl");
    if (lbl) lbl.textContent = "Saved";
  });
  if (typeof showToast === "function") showToast("Saved to My Notebook");
  qxCloseBmPop();
}

function qxBmNewGroupPrompt(id) {
  // Legacy entry — open drawer instead of browser prompt
  toggleBmWithGroup(id);
}

function nbSetFilter(key, val) {
  _nbFilter[key] = val;
  if (key === "exam") { _nbFilter.subject = "all"; _nbFilter.chapter = "all"; }
  if (key === "subject") _nbFilter.chapter = "all";
  render("notebook");
}

function nbCreateGroup() {
  // Inline notebook create (no browser prompt)
  const existing = document.getElementById("qxNbCreateGroupPop");
  if (existing) existing.remove();
  const pop = document.createElement("div");
  pop.id = "qxNbCreateGroupPop";
  pop.className = "qx-bm-drawer-overlay open";
  pop.innerHTML = `<div class="qx-bm-drawer qx-bm-drawer-sm">
    <header class="qx-bm-drawer-head">
      <div class="qx-bm-drawer-head-left">
        <span class="qx-bm-drawer-head-ic" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h3.1l1.4 1.6h8.5a2 2 0 0 1 2 2v8.4a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10z" fill="currentColor"/></svg>
        </span>
        <div><h3>Create New Group</h3><p>Organize bookmarked questions</p></div>
      </div>
      <button type="button" class="qx-bm-drawer-close" id="qxNbCreateClose">X</button>
    </header>
    <div class="qx-bm-drawer-body">
      <label class="qx-bm-create-label" for="qxNbGroupName">Group name</label>
      <input type="text" id="qxNbGroupName" class="qx-bm-create-input" maxlength="60" placeholder="e.g. Limits, Organic Chemistry" autocomplete="off">
      <p class="qx-bm-max-note" style="text-align:left;margin-top:10px">Maximum ${QX_BM_GROUP_MAX} questions per group</p>
    </div>
    <footer class="qx-bm-drawer-foot">
      <button type="button" class="qx-bm-create-btn" id="qxNbCreateOk">+ Create New Group</button>
    </footer>
  </div>`;
  document.body.appendChild(pop);
  const close = () => pop.remove();
  pop.querySelector("#qxNbCreateClose")?.addEventListener("click", close);
  pop.addEventListener("click", (e) => { if (e.target === pop) close(); });
  const inp = pop.querySelector("#qxNbGroupName");
  const save = () => {
    const n = (inp && inp.value || "").trim();
    if (!n) { inp?.focus(); return; }
    QuantrexBookmarks.createGroup(n);
    if (typeof showToast === "function") showToast("Group created");
    close();
    if (typeof render === "function") render("notebook");
  };
  pop.querySelector("#qxNbCreateOk")?.addEventListener("click", save);
  inp?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); save(); } });
  setTimeout(() => inp?.focus(), 50);
}

window.toggleBmWithGroup = toggleBmWithGroup;
window.qxCloseBmPop = qxCloseBmPop;
window.qxBmSaveDefault = qxBmSaveDefault;
window.qxBmNewGroupPrompt = qxBmNewGroupPrompt;
window.qxBmAddToGroup = qxBmAddToGroup;
window.qxBmSaveToChapter = qxBmSaveToChapter;
window.nbCreateGroup = nbCreateGroup;

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
    return `<div class="q-card nb-q-card" role="button" tabindex="0" data-qid="${String(q.id).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">
      <div class="q-meta">
        <span class="tag tag-${(q.subject || "").toLowerCase().replace(/\s+/g, "-")}">${q.subject}</span>
        ${grp ? `<span class="nb-grp-tag" style="--gc:${grp.color}">${grp.name}</span>` : ""}
      </div>
      <div class="q-text qx-content">${typeof Mx !== "undefined" ? Mx.html(q.q) : q.q}</div>
      <div class="q-footer"><small>📖 ${it.chapter || it.topic || "—"} · ${it.examSlug || it.exam || ""}</small>
        <button type="button" class="nb-rm" onclick='event.stopPropagation();QuantrexBookmarks.remove(${typeof qxJsId === "function" ? qxJsId(q.id) : JSON.stringify(String(q.id))});render("notebook")'>✕</button></div>
    </div>`;
  }).join("") : '<div class="empty">Bookmark questions from practice — saved with exam, subject & topic automatically.</div>';

  const fCards = fItems.length ? fItems.map(it => {
    const f = FORMULAS.find(x => "f" + x.id === it.id);
    if (!f) return "";
    return `<div class="note-card"><div class="fc-formula qx-content">${typeof Mx !== "undefined" ? Mx.html(f.formula) : f.formula}</div><small>${f.subject} · ${f.topic}</small></div>`;
  }).join("") : '<div class="empty">Bookmark formulas to revisit them quickly.</div>';

  return `${topbar("My Notebook", "Bookmarks by exam · subject · topic — better than Marks")}
  <div class="qx-nb-hero">
    <div class="qx-nb-hero-stat"><strong>${qItems.length}</strong><span>Questions</span></div>
    <div class="qx-nb-hero-stat"><strong>${fItems.length}</strong><span>Formulas</span></div>
    <div class="qx-nb-hero-stat"><strong>${notes.length}</strong><span>Notes</span></div>
    <div class="qx-nb-hero-stat"><strong>${(store.groups || []).length}</strong><span>Groups</span></div>
  </div>
  <div class="nb-section">
    <h3 class="sec-title">🔖 Saved Questions (${qItems.length})</h3>
    ${groupBar}
    ${filterBar}
    <div class="q-list qx-nb-q-list">${qCards}</div>
  </div>
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
    <h3 class="sec-title">🧮 Saved Formulas (${fItems.length})</h3>
    ${fCards}
  </div>`;
}