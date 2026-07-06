// Quantrex Search — global question lookup across loaded banks
const QuantrexSearch = (() => {
  let lastQuery = "";
  let lastResults = [];

  function normalize(s) {
    return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  }

  async function ensureBank() {
    const slug = (typeof PRIMARY_BANK !== "undefined" && PRIMARY_BANK[STATE.exam]) || "jee_main";
    if (typeof loadSingleBank === "function" && typeof _banksLoaded !== "undefined" && !_banksLoaded[slug]) {
      await loadSingleBank(slug);
    }
  }

  async function search(query, limit) {
    const q = normalize(query);
    if (!q || q.length < 2) return [];
    lastQuery = query;
    await ensureBank();
    const max = limit || 40;
    const results = [];
    for (const item of QUESTIONS) {
      if (item.exam && item.exam !== STATE.exam) continue;
      const hay = normalize(item.q) + " " + normalize(item.chapter) + " " + normalize(item.subject);
      if (hay.includes(q)) {
        results.push(item);
        if (results.length >= max) break;
      }
    }
    lastResults = results;
    return results;
  }

  function preview(text) {
    const plain = String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return plain.length > 120 ? plain.slice(0, 120) + "…" : plain;
  }

  function viewSearch(query) {
    return `${typeof topbar === "function" ? topbar("Search", "Find questions by keyword, chapter, or topic") : ""}
      <div class="qx-search-box">
        <input type="search" id="qxSearchInput" placeholder="Search questions… (e.g. thermodynamics, optics)" value="${(query || lastQuery).replace(/"/g, "&quot;")}" autocomplete="off">
        <button class="btn-primary" id="qxSearchBtn">Search</button>
      </div>
      <div id="qxSearchResults"><div class="empty">Type at least 2 characters and press Search.</div></div>`;
  }

  async function runSearch() {
    const input = document.getElementById("qxSearchInput");
    const box = document.getElementById("qxSearchResults");
    if (!input || !box) return;
    const query = input.value.trim();
    if (query.length < 2) {
      box.innerHTML = '<div class="empty">Enter at least 2 characters.</div>';
      return;
    }
    box.innerHTML = '<div class="empty">⏳ Searching…</div>';
    const results = await search(query);
    if (!results.length) {
      box.innerHTML = '<div class="empty">No questions match your search. Try a different keyword.</div>';
      return;
    }
    box.innerHTML = `<p class="result-count">${results.length} result${results.length !== 1 ? "s" : ""} for "${query.replace(/</g, "")}"</p>
      <div class="q-list">${results.map(q => {
        const tag = (q.subject || "").toLowerCase().replace(/\s+/g, "-");
        return `<div class="q-card" onclick="go('question', ${q.id})">
          <div class="q-meta"><span class="tag tag-${tag}">${q.subject}</span><span class="tag tag-diff">${q.difficulty || ""}</span></div>
          <div class="q-text">${preview(q.q)}</div>
          <div class="q-footer"><small>📖 ${q.chapter || ""}</small></div>
        </div>`;
      }).join("")}</div>`;
  }

  function bind(root) {
    const btn = (root || document).querySelector("#qxSearchBtn");
    const input = (root || document).querySelector("#qxSearchInput");
    if (btn) btn.onclick = () => runSearch();
    if (input) {
      input.onkeydown = e => { if (e.key === "Enter") runSearch(); };
      if (input.value.trim().length >= 2) runSearch();
    }
  }

  function openOverlay() {
    go("search");
  }

  return { search, viewSearch, bind, openOverlay, runSearch };
})();