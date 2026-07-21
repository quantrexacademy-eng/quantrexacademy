/**
 * Jovi — Quantrex Academy AI study assistant (client)
 * Bank-first search + SpaceXAI professor mode via /api/jovi
 */
(function (global) {
  "use strict";

  const MASCOT = "assets/jovi-mascot.svg?v=jovi2";
  const GAP_KEY = "qx_jovi_gaps_v1";
  const SAVE_KEY = "qx_jovi_saved_v1";
  const HIST_KEY = "qx_jovi_session_v1";

  let _open = false;
  let _busy = false;
  let _listening = false;
  let _recognition = null;
  let _history = [];
  let _pendingImage = null;
  let _context = {};

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

  function detectFilters(text) {
    const t = String(text || "").toLowerCase();
    const f = { years: [], subjects: [], hard: false, important: false, repeated: false, chapter: null };
    const yearMatches = t.match(/\b(20\d{2})\b/g);
    if (yearMatches) f.years = [...new Set(yearMatches.map(Number))];
    if (/chemistry|chem\b|रसायन/.test(t)) f.subjects.push("Chemistry");
    if (/physics|भौतिक/.test(t)) f.subjects.push("Physics");
    if (/math|mathematics|गणित/.test(t)) f.subjects.push("Mathematics");
    if (/biology|botany|zoology|जीव/.test(t)) f.subjects.push("Biology");
    if (/hard|difficult|tough|advance|कठिन|मुश्किल/.test(t)) f.hard = true;
    if (/important|must.?do|high.?weight|महत्वपूर्ण/.test(t)) f.important = true;
    if (/repeat|repeated|बार.?बार|pyq.*again/.test(t)) f.repeated = true;
    return f;
  }

  function searchBank(query, limit) {
    limit = limit || 8;
    const qs = (typeof QUESTIONS !== "undefined" && Array.isArray(QUESTIONS)) ? QUESTIONS : [];
    if (!qs.length) return { hits: [], note: "Bank not loaded yet — open a subject once, or I can still solve/generate with AI." };

    const f = detectFilters(query);
    const tokens = String(query || "").toLowerCase()
      .replace(/[^\w\u0900-\u097F\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !/^(the|and|for|give|show|me|questions?|please|from|with|jee|neet|mains?|main)$/i.test(w));

    let pool = qs.slice();
    if (f.subjects.length) {
      pool = pool.filter((q) => f.subjects.some((s) => String(q.subject || "").toLowerCase() === s.toLowerCase()));
    }
    if (f.years.length) {
      pool = pool.filter((q) => {
        const src = String(q.source || q.exam || q.year || "");
        return f.years.some((y) => src.includes(String(y)));
      });
    }
    if (f.hard) {
      const hardish = pool.filter((q) => /hard|difficult|advance|tough/i.test(String(q.difficulty || q.level || q.tags || "")));
      if (hardish.length) pool = hardish;
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
      if (score > 0 || (!tokens.length && f.subjects.length)) {
        scored.push({ q, score });
      }
    });

    scored.sort((a, b) => b.score - a.score);
    let top = scored.slice(0, limit).map((x) => x.q);

    // Fallback: subject-only sample
    if (!top.length && f.subjects.length) {
      top = pool.filter((q) => f.subjects.some((s) => String(q.subject || "").toLowerCase() === s.toLowerCase())).slice(0, limit);
    }
    if (!top.length && tokens.length) {
      // loose chapter match
      top = qs.filter((q) => tokens.some((t) => String(q.chapter || "").toLowerCase().includes(t))).slice(0, limit);
    }

    if (!top.length) {
      logGap(query, "no_bank_match");
    }

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

  function buildContext() {
    const ctx = { ..._context };
    try {
      if (typeof STATE !== "undefined") {
        ctx.exam = ctx.exam || STATE.exam;
      }
      if (typeof currentView !== "undefined") ctx.page = currentView;
      // Practice / question context
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

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderMarkdownLite(text) {
    let t = escapeHtml(text);
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    t = t.replace(/\[Jovi-generated[^\]]*\]/gi, '<span class="jovi-tag">Jovi-generated</span>');
    t = t.replace(/\[AI-generated[^\]]*\]/gi, '<span class="jovi-tag">Jovi-generated</span>');
    return t;
  }

  function ensureDom() {
    if (document.getElementById("joviFab")) return;
    const fab = document.createElement("button");
    fab.type = "button";
    fab.id = "joviFab";
    fab.className = "jovi-fab";
    fab.title = "Ask Jovi";
    fab.setAttribute("aria-label", "Open Jovi AI assistant");
    fab.innerHTML = `<span class="jovi-fab-pulse"></span><img src="${MASCOT}" alt="Jovi">`;
    fab.onclick = () => toggle(true);

    const panel = document.createElement("div");
    panel.id = "joviPanel";
    panel.className = "jovi-panel";
    panel.innerHTML = `
      <div class="jovi-head">
        <img src="${MASCOT}" alt="">
        <div class="jovi-head-text">
          <strong>Jovi</strong>
          <small>Quantrex study AI · bank + professor mode</small>
        </div>
        <div class="jovi-head-actions">
          <button type="button" class="jovi-icon-btn" id="joviMic" title="Voice">🎤</button>
          <button type="button" class="jovi-icon-btn" id="joviImg" title="Photo question">📷</button>
          <button type="button" class="jovi-icon-btn" id="joviClose" title="Close">✕</button>
        </div>
      </div>
      <div class="jovi-msgs" id="joviMsgs"></div>
      <div class="jovi-tools">
        <button type="button" class="jovi-chip" data-prompt="JEE Main Chemistry hard PYQs">Hard Chem</button>
        <button type="button" class="jovi-chip" data-prompt="Give me important Mathematics questions">Important Maths</button>
        <button type="button" class="jovi-chip" data-prompt="Make a 15 question JEE Main Physics part test on Mechanics">Make test</button>
        <button type="button" class="jovi-chip" data-prompt="Explain this question step by step">Explain</button>
      </div>
      <div class="jovi-compose">
        <textarea id="joviInput" rows="1" placeholder="Ask Jovi… PYQs, doubts, harder questions, tests"></textarea>
        <button type="button" class="jovi-send" id="joviSend">Send</button>
      </div>
      <input type="file" id="joviFile" accept="image/*" hidden>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    document.getElementById("joviClose").onclick = () => toggle(false);
    document.getElementById("joviSend").onclick = () => send();
    document.getElementById("joviInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });
    document.getElementById("joviMic").onclick = () => toggleVoice();
    document.getElementById("joviImg").onclick = () => document.getElementById("joviFile").click();
    document.getElementById("joviFile").onchange = onPickImage;
    panel.querySelectorAll(".jovi-chip").forEach((chip) => {
      chip.onclick = () => {
        document.getElementById("joviInput").value = chip.getAttribute("data-prompt") || "";
        send();
      };
    });

    if (!_history.length) {
      pushBot("Hey! I'm **Jovi** 🤖 — your Quantrex study buddy.\n\nI can:\n• Pull real PYQs from the bank\n• Solve any doubt step-by-step\n• Make practice tests\n• Read questions from photos\n• Speak with you in Hindi / English / Hinglish\n\nTry: \"JEE Main 2023 Chemistry hard questions\"");
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
    if (meta && meta.hits && meta.hits.length) {
      html += formatHitsHtml(meta.hits);
    }
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
        send("Open and explain question " + id + " step by step. If no official solution, solve it as Jovi-generated.");
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
      el.textContent = "Jovi is thinking…";
      box.appendChild(el);
    }
    box.scrollTop = box.scrollHeight;
  }

  async function onPickImage(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 4.5e6) {
      if (typeof showToast === "function") showToast("📷 Image too large (max ~4.5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      _pendingImage = reader.result;
      if (typeof showToast === "function") showToast("📷 Image attached — ask Jovi to solve it");
      const input = document.getElementById("joviInput");
      if (input && !input.value.trim()) input.value = "Solve this question from the image step by step. Keep language simple.";
      toggle(true);
    };
    reader.readAsDataURL(file);
  }

  function toggleVoice() {
    const SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    const btn = document.getElementById("joviMic");
    if (!SR) {
      if (typeof showToast === "function") showToast("🎤 Voice not supported in this browser");
      return;
    }
    if (_listening && _recognition) {
      try { _recognition.stop(); } catch (e) { /* */ }
      _listening = false;
      if (btn) btn.classList.remove("on");
      return;
    }
    _recognition = new SR();
    _recognition.lang = "hi-IN";
    _recognition.interimResults = false;
    _recognition.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      const input = document.getElementById("joviInput");
      if (input) input.value = text;
      send();
    };
    _recognition.onend = () => {
      _listening = false;
      if (btn) btn.classList.remove("on");
    };
    _recognition.onerror = () => {
      _listening = false;
      if (btn) btn.classList.remove("on");
    };
    _listening = true;
    if (btn) btn.classList.add("on");
    try { _recognition.start(); } catch (e) { _listening = false; }
  }

  function speak(text) {
    if (!global.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(String(text).replace(/[*#`]/g, " ").slice(0, 600));
      u.rate = 1.02;
      speechSynthesis.speak(u);
    } catch (e) { /* */ }
  }

  async function callApi(userText, bankHits, image) {
    const messages = _history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }))
      .slice(-10);
    // ensure last user message is current
    if (!messages.length || messages[messages.length - 1].content !== userText) {
      messages.push({ role: "user", content: userText });
    }

    const res = await fetch("/api/jovi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        context: buildContext(),
        bankHits: bankHits || [],
        image: image || null,
        mode: image ? "image" : "chat"
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
      let msg = "I found these in **Quantrex bank** (AI professor mode needs `XAI_API_KEY` on server for full solve):\n";
      hits.forEach((h, i) => {
        msg += `\n${i + 1}. [${h.subject}] ${h.chapter} — ${h.text.slice(0, 140)}… (${h.source})`;
      });
      msg += "\n\nTap a result or ask me to explain any ID. Owner: set **XAI_API_KEY** in Vercel for Jovi full answers.";
      return msg;
    }
    logGap(userText, "offline_no_hits");
    return "Bank search found no match and Jovi AI is not configured on the server yet.\n\n**Owner:** add env `XAI_API_KEY` (SpaceXAI / xAI) on Vercel so I can solve, generate tests, and read images like a professor.\n\nYou can still open PYQ Bank / chapters manually.";
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

    const search = searchBank(text);
    try {
      const data = await callApi(text || "Solve the attached question.", search.hits, img);
      setTyping(false);
      if (data.offline) {
        pushBot(offlineCompose(text, search), { hits: search.hits, allowSave: true });
      } else {
        let reply = data.reply || "";
        if (search.hits.length && !/bank|PYQ|Quantrex/i.test(reply.slice(0, 200))) {
          // Prepend bank summary for transparency
          reply = "📚 **From Quantrex bank** (top matches) are listed below if relevant.\n\n" + reply;
        }
        pushBot(reply, { hits: search.hits, allowSave: true });
        if (_listening || (document.getElementById("joviMic") || {}).classList.contains("on")) {
          speak(reply);
        }
      }
    } catch (e) {
      setTyping(false);
      // Fallback: bank-only
      if (search.hits.length) {
        pushBot(offlineCompose(text, search) + "\n\n(API error: " + escapeHtml(String(e.message || e)) + ")", { hits: search.hits, allowSave: true });
      } else {
        logGap(text, "api_error");
        pushBot("I hit a snag talking to the AI brain. Bank search also found nothing for that query.\n\nTry a subject/year like \"Physics 2022 electrostatics\" or open the chapter first so the bank loads.\n\nTech: " + String(e.message || e));
      }
    } finally {
      _busy = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  /** Practice: auto-solve when student is wrong and solution missing */
  async function onPracticeWrong(q, studentAnswer) {
    if (!q) return;
    const hasSol = !!(q.solution || q.sol || q.explanation);
    if (hasSol) return;
    setContext({
      mode: "practice_wrong",
      questionId: q.id,
      questionText: stripHtml(q.text || q.question || ""),
      subject: q.subject,
      chapter: q.chapter,
      options: (q.options || []).map(stripHtml),
      wrongAnswer: studentAnswer
    });
    toggle(true);
    const prompt = `The student got this practice question WRONG and there is NO official solution in the database. Solve it NOW step-by-step (board professor style). Label clearly as [Jovi-generated solution]. Keep language simple.\n\nQuestion ID: ${q.id}\nSubject: ${q.subject || ""}\nChapter: ${q.chapter || ""}\nQuestion: ${stripHtml(q.text || q.question || "").slice(0, 2000)}\nOptions: ${JSON.stringify((q.options || []).map(stripHtml).slice(0, 6))}\nStudent picked: ${studentAnswer}`;
    await send(prompt);
  }

  function injectInlineAsk(root) {
    const host = root || document.getElementById("app-main");
    if (!host) return;
    if (host.querySelector(".jovi-inline")) return;
    const sol = host.querySelector(".sol-body, .qx-sol-body, .mtk-sol, .qx-prac-correct-ans, #solReveal, .qx-sol-card");
    if (!sol || !sol.parentNode) return;
    const wrap = document.createElement("div");
    wrap.className = "jovi-inline";
    wrap.innerHTML = `
      <div class="jovi-inline-head">
        <img src="${MASCOT}" alt="">
        <div><strong>Ask Jovi about this solution</strong><small>Doubt? Wrong step? Want a harder twin question?</small></div>
      </div>
      <div class="jovi-inline-body">
        <div class="jovi-compose">
          <textarea class="jovi-inline-input" rows="2" placeholder="e.g. Why is option B wrong? / Give a harder one"></textarea>
          <button type="button" class="jovi-send jovi-inline-send">Ask</button>
        </div>
      </div>`;
    sol.parentNode.insertBefore(wrap, sol.nextSibling);
    wrap.querySelector(".jovi-inline-head").onclick = () => wrap.classList.toggle("open");
    wrap.querySelector(".jovi-inline-send").onclick = () => {
      const ta = wrap.querySelector(".jovi-inline-input");
      const q = (ta && ta.value || "").trim();
      if (!q) return;
      if (ta) ta.value = "";
      wrap.classList.add("open");
      setContext({ mode: "solution_doubt" });
      toggle(true);
      send(q);
    };
  }

  function boot() {
    loadSession();
    if (!document.getElementById("joviStyles")) {
      const link = document.createElement("link");
      link.id = "joviStyles";
      link.rel = "stylesheet";
      link.href = "assets/jovi.css?v=jovi2";
      document.head.appendChild(link);
    }
    ensureDom();
    // Re-inject ask box after navigations
    const obs = new MutationObserver(() => {
      try { injectInlineAsk(); } catch (e) { /* */ }
    });
    const main = document.getElementById("app-main");
    if (main) obs.observe(main, { childList: true, subtree: true });
    setTimeout(() => injectInlineAsk(), 800);
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
    getGaps: () => {
      try { return JSON.parse(localStorage.getItem(GAP_KEY) || "[]"); } catch (e) { return []; }
    },
    getSaved: () => {
      try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "[]"); } catch (e) { return []; }
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
