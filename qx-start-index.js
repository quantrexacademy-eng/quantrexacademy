/* qxmd392: pure helpers for "open the question the student clicked" + Prev/Next bounds.
   No DOM, no data changes. Used by app.js / test-engine.js; unit-tested in scripts/qxmd392-nav.test.js */
(function (root) {
  function same(a, b) { return a != null && b != null && String(a) === String(b); }
  /* Index of clicked id in a list of ids, or in list objects by id/_marksId/marksId/qid. -1 if absent. */
  function findClicked(ids, list, clickedId) {
    if (clickedId == null || clickedId === "") return -1;
    ids = ids || [];
    for (var i = 0; i < ids.length; i++) if (same(ids[i], clickedId)) return i;
    var bare = /^m_/.test(String(clickedId)) ? String(clickedId).slice(2) : null;
    list = list || [];
    for (var j = 0; j < list.length; j++) {
      var x = list[j];
      if (x && (same(x._marksId, clickedId) || same(x.marksId, clickedId) || same(x.qid, clickedId) || (bare && same(x._marksId, bare)))) return j;
    }
    return -1;
  }
  function clamp(i, n) { i = Number(i); if (!isFinite(i)) i = 0; return Math.max(0, Math.min(Math.max(0, n - 1), Math.floor(i))); }
  /* After the engine re-orders ids, find where the originally chosen question went. */
  function resolveStart(origIds, startIdx, finalIds) {
    var fb = clamp(startIdx, finalIds.length);
    if (!origIds || !origIds.length) return fb;
    var id = origIds[clamp(startIdx, origIds.length)];
    for (var i = 0; i < finalIds.length; i++) if (same(finalIds[i], id)) return i;
    return fb;
  }
  function step(idx, delta, n) { var t = idx + delta; return t < 0 || t >= n ? idx : t; }
  var api = { findClicked: findClicked, resolveStart: resolveStart, clamp: clamp, step: step };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.QxStartIndex = api;
})(typeof window !== "undefined" ? window : globalThis);
