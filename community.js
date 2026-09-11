// Quantrex — Community Solutions (Firebase Firestore)
const QuantrexCommunity = (() => {
  function qKey(q) {
    if (!q) return null;
    return (q._bank || "q") + "_" + (q._marksId || q.id);
  }

  function postsRef(key) {
    if (!QuantrexDB || !QuantrexDB.db) return null;
    return QuantrexDB.db.collection("solutions").doc(key).collection("posts");
  }

  async function fetchPosts(q) {
    const key = qKey(q);
    if (!key || !QuantrexDB || !QuantrexDB.init()) return [];
    const snap = await postsRef(key).orderBy("createdAt", "desc").limit(30).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function postSolution(q, text) {
    const user = JSON.parse(localStorage.getItem("quantrex_user") || "null");
    if (!user || !user.uid) return { ok: false, error: "Login required" };
    const key = qKey(q);
    if (!key || !text || !text.trim()) return { ok: false, error: "Empty solution" };
    if (!QuantrexDB.init()) return { ok: false, error: "Database offline" };
    await postsRef(key).add({
      uid: user.uid,
      author: user.name || user.email || "Student",
      text: text.trim(),
      upvotes: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { ok: true };
  }

  function renderPanel(q, posts) {
    const key = qKey(q);
    const list = (posts || []).map(p => `
      <div class="comm-post">
        <div class="comm-head"><strong>${p.author || "Student"}</strong><small>${p.createdAt && p.createdAt.toDate ? p.createdAt.toDate().toLocaleString() : "Just now"}</small></div>
        <div class="comm-body qx-content">${typeof Mx !== "undefined" ? Mx.html(p.text) : p.text.replace(/</g, "&lt;")}</div>
      </div>`).join("");

    return `<div class="comm-section" id="commSection" data-qkey="${key}">
      <h3 class="sec-title">🌐 Community Solutions (${(posts || []).length})</h3>
      ${list || '<p class="empty" style="padding:12px 0">No community solutions yet. Be the first!</p>'}
      <div class="comm-add">
        <textarea id="commInput" placeholder="Share your solution or approach…" rows="3"></textarea>
        <button class="btn-primary" type="button" id="commSubmit">Post Solution</button>
      </div>
    </div>`;
  }

  function bind(q, container) {
    const btn = container && container.querySelector("#commSubmit");
    const input = container && container.querySelector("#commInput");
    if (!btn || !input) return;
    btn.onclick = async () => {
      const text = input.value.trim();
      if (!text) { showToast("⚠️ Write a solution first"); return; }
      btn.disabled = true;
      const res = await postSolution(q, text);
      if (res.ok) {
        showToast("✅ Solution posted!");
        input.value = "";
        const posts = await fetchPosts(q);
        const section = container.querySelector("#commSection");
        if (section) {
          const parent = section.parentElement;
          const html = renderPanel(q, posts);
          section.outerHTML = html;
          bind(q, parent);
          if (typeof Mx !== "undefined") Mx.afterRender(parent);
        }
      } else {
        showToast("❌ " + (res.error || "Failed"));
        btn.disabled = false;
      }
    };
  }

  return { fetchPosts, postSolution, renderPanel, bind, qKey };
})();