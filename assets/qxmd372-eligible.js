/* qxmd372: eligibility — filter empty DPP sols + Class9 boardWritten from auto-pick.
   Never invent solutions. Archives never touched. */
(function (global) {
  "use strict";
  function hasRealSolution(sol) {
    if (typeof MarksLive !== "undefined" && MarksLive.hasRealSolution) {
      try { return !!MarksLive.hasRealSolution(sol); } catch (_) { /* */ }
    }
    var plain = String(sol || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    if (!plain) return false;
    if (/^no solution\.?$/.test(plain)) return false;
    if (/solution not available|official solution is not available/.test(plain)) return false;
    if (/support us by uploading|community solution|upload your own solution/.test(plain)) return false;
    return true;
  }
  function hasUsableOpts(q) {
    var opts = (q && q.options) || [];
    if (!Array.isArray(opts)) return false;
    var n = 0;
    for (var i = 0; i < opts.length; i++) {
      var t = String(opts[i] || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (t) n++;
    }
    return n >= 2;
  }
  /** Scored Create-on-Test / custom test auto-pick */
  function qxEligibleForAutoPick(q) {
    if (!q) return false;
    if (q._boardWritten) return false;
    var typ = String(q.type || q.qType || "").toLowerCase();
    if ((typ === "subjective" || typ === "board" || typ === "written") && !hasUsableOpts(q)) return false;
    if (q.answer == null && q.answers == null && !hasUsableOpts(q) && !hasRealSolution(q.solution)) return false;
    if (!hasRealSolution(q.solution) && !q._marksId) return false;
    return true;
  }
  /** Practice / chapter lists: hide empty-sol items that cannot hydrate remotely */
  function qxEligibleForPracticeList(q) {
    if (!q) return false;
    if (!hasRealSolution(q.solution) && !q._marksId) return false;
    return true;
  }
  global.qxHasRealSolutionLocal = hasRealSolution;
  global.qxEligibleForAutoPick = qxEligibleForAutoPick;
  global.qxEligibleForPracticeList = qxEligibleForPracticeList;
})(typeof window !== "undefined" ? window : this);
