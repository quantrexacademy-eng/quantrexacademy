// Quantrex Search — Google-like: stem, options, figures (local + public index)
const QuantrexSearch = (() => {
  let lastQuery = "";
  let lastResults = [];
  let _runId = 0;

  function normalize(s) {
    return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function optText(item) {
    const o = item && item.options;
    if (!o) return "";
    if (Array.isArray(o)) {
      return o.map(function (x) {
        if (x == null) return "";
        if (typeof x === "string") return x;
        return String(x.text || x.html || x.value || "");
      }).join(" ");
    }
    return String(o);
  }

  function figUrls(item) {
    const blob = [
      item && item.q,
      item && item.question,
      item && item.solution,
      item && item.sol,
      optText(item)
    ].join(" ");
    const urls = [];
    const seen = Object.create(null);
    function add(u) {
      let s = String(u || "").trim();
      if (!s || seen[s]) return;
      if (/getmarks|quizrr|examgoal\.net/i.test(s) && s.indexOf("/api/proxy-image") < 0) {
        s = "/api/proxy-image?clean=1&url=" + encodeURIComponent(s);
      }
      seen[s] = 1;
      urls.push(s);
    }
    const re = /<img[^>]+src=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(blob))) add(m[1]);
    const re2 = /https?:\/\/[^\s"'<>]+?\.(?:png|jpe?g|webp|gif)(?:\?[^\s"'<>]*)?/gi;
    while ((m = re2.exec(blob))) add(m[0]);
    if (item && item.img) add(item.img);
    if (item && item.figure) add(item.figure);
    return urls.slice(0, 3);
  }

  function haystack(item) {
    return normalize([
      item && item.q,
      item && item.question,
      item && item.text,
      item && item.chapter,
      item && item.subject,
      item && item.exam,
      item && item.source,
      item && item.solution,
      item && item.sol,
      optText(item)
    ].join(" "));
  }

  function yieldTick() {
    return new Promise(function (r) {
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(function () { r(); });
      else setTimeout(r, 0);
    });
  }

  async function searchLocal(query, limit) {
    const q = normalize(query);
    const tokens = q.split(" ").filter(function (w) { return w.length >= 2; }).slice(0, 8);
    if (!q || q.length < 2) return [];
    const max = limit || 24;
    const pool = (typeof QUESTIONS !== "undefined" && QUESTIONS) || [];
    const exam = (typeof STATE !== "undefined" && STATE.exam) || "";
    const out = [];
    const scanMax = Math.min(pool.length, 8000);
    for (let i = 0; i < scanMax; i++) {
      if (i && i % 350 === 0) await yieldTick();
      const item = pool[i];
      if (!item) continue;
      const hay = haystack(item);
      if (!hay) continue;
      let score = 0;
      if (hay.indexOf(q) >= 0) score += 50;
      for (let t = 0; t < tokens.length; t++) {
        if (hay.indexOf(tokens[t]) >= 0) score += tokens[t].length >= 5 ? 4 : 2;
      }
      if (score <= 0) continue;
      if (exam && item.exam === exam) score += 6;
      item._qxSearchScore = score;
      item._qxFigs = figUrls(item);
      out.push(item);
    }
    out.sort(function (a, b) { return (b._qxSearchScore || 0) - (a._qxSearchScore || 0); });
    return out.slice(0, max);
  }

  async function searchRemote(query) {
    try {
      const r = await fetch("/api/seo-q?mode=search&format=json&q=" + encodeURIComponent(query), { cache: "no-store" });
      if (!r.ok) return [];
      const d = await r.json();
      return (d && d.hits) || (d && d.results) || [];
    } catch (_) {
      return [];
    }
  }

  function remoteAsQuestion(hit) {
    return {
      id: hit.id,
      slug: hit.slug,
      q: hit.text || hit.t || "",
      text: hit.text || hit.t || "",
      exam: hit.exam || "",
      year: hit.year || "",
      subject: hit.subject || "",
      chapter: hit.chapter || "",
      options: hit.options || [],
      solution: hit.sol || "",
      _qxFigs: hit.imgs || hit.figs || [],
      _qxRemote: true,
      _qxSearchScore: 12
    };
  }

  async function search(query, limit) {
    lastQuery = query;
    const local = await searchLocal(query, limit || 24);
    const remote = await searchRemote(query);
    const seen = Object.create(null);
    const merged = [];
    function add(item) {
      const id = String(item && item.id || "");
      if (id && seen[id]) return;
      if (id) seen[id] = 1;
      merged.push(item);
    }
    local.forEach(add);
    remote.forEach(function (h) { add(remoteAsQuestion(h)); });
    merged.sort(function (a, b) { return (b._qxSearchScore || 0) - (a._qxSearchScore || 0); });
    lastResults = merged.slice(0, limit || 28);
    return lastResults;
  }

  function preview(text, n) {
    const plain = String(text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const cap = n || 180;
    return plain.length > cap ? plain.slice(0, cap) + "…" : plain;
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function letter(i) {
    return String.fromCharCode(65 + i);
  }

  function cardHtml(q) {
    const tag = String(q.subject || "PYQ").toLowerCase().replace(/\s+/g, "-");
    const figs = (q._qxFigs || figUrls(q)).map(function (u) {
      return '<img class="qx-search-fig" src="' + esc(u) + '" alt="Quantrex figure" loading="lazy">';
    }).join("");
    const opts = (Array.isArray(q.options) ? q.options : []).slice(0, 4).map(function (o, i) {
      const t = typeof o === "string" ? o : String((o && (o.text || o.html)) || "");
      return "<li><b>" + letter(i) + "</b> " + esc(preview(t, 110)) + "</li>";
    }).join("");
    const solPlain = preview(q.solution || q.sol || "", 160);
    const qid = String(q.id || "").replace(/"/g, "");
    return '<article class="q-card qx-search-card" role="button" tabindex="0" data-qid="' + esc(qid) + '"' +
      (q._qxRemote ? ' data-qx-remote="1" data-slug="' + esc(q.slug || "") + '"' : "") + ">" +
      '<div class="q-meta"><span class="tag tag-' + esc(tag) + '">' + esc(q.subject || q.exam || "Question") + "</span>" +
      (q.exam ? '<span class="tag">' + esc(q.exam) + "</span>" : "") +
      (q.year ? '<span class="tag">' + esc(String(q.year)) + "</span>" : "") +
      (typeof qxDifficultyTag === "function" ? qxDifficultyTag(q) : "") +
      "</div>" +
      '<div class="q-text">' + esc(preview(q.q || q.text, 220)) + "</div>" +
      (figs ? '<div class="qx-search-figs">' + figs + "</div>" : "") +
      (opts ? '<ol class="qx-search-opts">' + opts + "</ol>" : "") +
      (solPlain ? '<p class="qx-search-sol"><strong>Solution:</strong> ' + esc(solPlain) + "</p>" : "") +
      '<div class="q-footer"><small>' + esc(q.chapter || "") + "</small></div></article>";
  }

  function viewSearch(query) {
    const q = (query || lastQuery || "").replace(/"/g, "&quot;");
    return (typeof topbar === "function" ? topbar("Search", "Question text, options and figures") : "") +
      '<div class="qx-search-box qx-search-hero">' +
      '<input type="search" id="qxSearchInput" placeholder="Search like Google — paste a question, option, or topic" value="' + q + '" autocomplete="off">' +
      '<button class="btn-primary" id="qxSearchBtn" type="button">Search</button></div>' +
      '<div id="qxSearchResults"><div class="empty">Type at least 2 characters. Results include stem, options and figures.</div></div>' +
      "<style>.qx-search-hero{display:flex;gap:10px;margin:8px 0 14px}" +
      ".qx-search-hero input{flex:1;min-height:48px;border-radius:14px;padding:0 14px;font-weight:650}" +
      ".qx-search-card{cursor:pointer;margin-bottom:10px}" +
      ".qx-search-figs{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}" +
      ".qx-search-fig{max-width:min(100%,240px);height:auto;border-radius:10px;background:#fff}" +
      ".qx-search-opts{margin:8px 0 0;padding:0;list-style:none}" +
      ".qx-search-opts li{font-size:13px;line-height:1.4;padding:3px 0}" +
      ".qx-search-opts b{color:#2563eb;margin-right:6px}" +
      ".qx-search-sol{margin:8px 0 0;font-size:13px;line-height:1.45;color:#334155}</style>";
  }

  function openCard(card) {
    if (!card) return;
    const qid = card.getAttribute("data-qid");
    if (card.getAttribute("data-qx-remote") === "1") {
      const slug = card.getAttribute("data-slug") || "question";
      window.location.href = "/q/" + encodeURIComponent(qid) + "/" + encodeURIComponent(slug);
      return;
    }
    if (typeof go === "function") go("question", { qid: qid });
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
    const id = ++_runId;
    box.innerHTML = '<div class="empty">Searching question text, options and figures…</div>';
    const results = await search(query);
    if (id !== _runId) return;
    if (!results.length) {
      box.innerHTML = '<div class="empty">No match. Try a chapter name or paste more of the question. <a href="/search?q=' +
        encodeURIComponent(query) + '">Open full search</a></div>';
      return;
    }
    box.innerHTML = '<p class="result-count">' + results.length + " result" + (results.length !== 1 ? "s" : "") +
      " for \"" + esc(query) + '"</p><div class="q-list">' + results.map(cardHtml).join("") + "</div>";
    if (typeof QxPerf !== "undefined" && QxPerf.lazyImages) QxPerf.lazyImages(box);
  }

  function bind(root) {
    const scope = root || document;
    const btn = scope.querySelector("#qxSearchBtn");
    const input = scope.querySelector("#qxSearchInput");
    const box = scope.querySelector("#qxSearchResults") || document.getElementById("qxSearchResults");
    if (btn) btn.onclick = function () { runSearch(); };
    if (input) {
      input.onkeydown = function (e) { if (e.key === "Enter") runSearch(); };
      if (input.value.trim().length >= 2) runSearch();
    }
    if (box && !box._qxSearchBound) {
      box._qxSearchBound = true;
      box.addEventListener("click", function (e) {
        const card = e.target.closest(".q-card");
        if (card) openCard(card);
      });
      box.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        const card = e.target.closest(".q-card");
        if (card) {
          e.preventDefault();
          openCard(card);
        }
      });
    }
  }

  function openOverlay() {
    go("search");
  }

  return { search, viewSearch, bind, openOverlay, runSearch };
})();
