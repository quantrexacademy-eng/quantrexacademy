/* Admin question overrides — students see what admin saves (Classplus-style) */
(function (global) {
  const KEY = "qx_admin_bank_v1";
  let map = {};
  try { map = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (_) { map = {}; }

  function isAdmin() {
    return typeof QuantrexAccess !== "undefined" && QuantrexAccess.isAdmin && QuantrexAccess.isAdmin();
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(map)); } catch (_) { /* */ }
  }
  function merge(q) {
    if (!q || q.id == null) return q;
    const ov = map[String(q.id)] || map[q._marksId];
    if (!ov) return q;
    return Object.assign({}, q, ov, { _adminEdited: true });
  }
  function saveCurrent() {
    if (!isAdmin()) return;
    const sess = global.QuantrexTestEngine && QuantrexTestEngine.getSession && QuantrexTestEngine.getSession();
    const id = sess && sess.ids ? sess.ids[sess.idx] : null;
    const q = id != null && typeof getQ === "function" ? getQ(id) : null;
    if (!q) {
      if (typeof showToast === "function") showToast("Open a question first");
      return;
    }
    const stem = prompt("Question text (HTML/LaTeX ok)", String(q.q || "").replace(/<[^>]+>/g, " ").slice(0, 800));
    if (stem == null) return;
    const sol = prompt("Solution (short, no step numbers)", String(q.solution || q.sol || "").replace(/<[^>]+>/g, " ").slice(0, 800));
    const rec = { q: stem, solution: sol || q.solution, _adminEdited: true, updatedAt: Date.now() };
    map[String(q.id)] = rec;
    persist();
    Object.assign(q, rec);
    try {
      const db = firebase.firestore();
      db.collection("admin_bank").doc(String(q.id)).set(rec, { merge: true });
    } catch (_) { /* */ }
    if (typeof showToast === "function") showToast("Saved — students will see this");
    if (global.QuantrexTestEngine && QuantrexTestEngine.refresh) QuantrexTestEngine.refresh();
  }
  async function pull() {
    try {
      const db = firebase.firestore();
      const snap = await db.collection("admin_bank").limit(400).get();
      snap.forEach((doc) => { map[doc.id] = Object.assign({}, map[doc.id] || {}, doc.data()); });
      persist();
    } catch (_) { /* */ }
  }
  if (document.readyState === "complete") pull();
  else window.addEventListener("load", pull);
  global.QxAdminBank = { merge: merge, saveCurrent: saveCurrent, isAdmin: isAdmin, pull: pull };
})(window);
