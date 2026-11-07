/* qxmd392: question-list year / type filters. Pure; reads only fields already on each question.
   Year comes from q.year or a "<Exam> YYYY" source label (mocks/abhyas excluded -> no year).
   Type comes from q.questionType / q.type only. Missing values stay "unknown"; nothing is guessed. */
(function (root) {
  var TYPES = { singlecorrect: "Single correct", single: "Single correct", mcq: "Single correct", multiplecorrect: "Multiple correct", multiple: "Multiple correct", numerical: "Numerical", integer: "Numerical", numeric: "Numerical", matrix: "Matrix match", matchthefollowing: "Matrix match", assertion: "Assertion–Reason", assertionreason: "Assertion–Reason", comprehension: "Comprehension", paragraph: "Comprehension" };
  function yearOf(q) {
    if (!q) return null;
    var y = Number(q.year);
    if (y >= 1970 && y <= 2100 && Math.floor(y) === y) return y;
    var s = String(q.source || "");
    if (!s || /mock|abhyas|sample|practice|test series|dpp/i.test(s)) return null;
    var m = s.match(/\b(19[7-9]\d|20\d\d)\b/);
    return m ? Number(m[1]) : null;
  }
  function typeOf(q) {
    var raw = q && (q.questionType || q.type);
    if (!raw) return null;
    var k = String(raw).toLowerCase().replace(/[^a-z]/g, "");
    return TYPES[k] || null;
  }
  function yearOk(q, f, maxY) {
    if (!f || f === "all") return true;
    var y = yearOf(q);
    if (f === "unknown") return y == null;
    var m = /^last(\d+)$/.exec(f);
    if (m) return y != null && maxY != null && y > maxY - Number(m[1]);
    return y != null && String(y) === String(f);
  }
  function typeOk(q, f) {
    if (!f || f === "all") return true;
    var t = typeOf(q);
    return f === "unknown" ? t == null : t === f;
  }
  function facets(pool) {
    pool = pool || [];
    var years = {}, types = {}, noYear = 0, noType = 0, maxY = null;
    for (var i = 0; i < pool.length; i++) {
      var y = yearOf(pool[i]), t = typeOf(pool[i]);
      if (y == null) noYear++; else { years[y] = (years[y] || 0) + 1; if (maxY == null || y > maxY) maxY = y; }
      if (t == null) noType++; else types[t] = (types[t] || 0) + 1;
    }
    var yl = Object.keys(years).map(Number).sort(function (a, b) { return b - a; });
    var last = [3, 5, 10].map(function (n) { var c = 0; yl.forEach(function (y) { if (y > maxY - n) c += years[y]; }); return { id: "last" + n, n: n, count: c }; });
    return { total: pool.length, maxYear: maxY, years: yl.map(function (y) { return { year: y, count: years[y] }; }), noYear: noYear,
      last: last, types: Object.keys(types).sort().map(function (t) { return { type: t, count: types[t] }; }), noType: noType };
  }
  /* order preserved: filter never re-sorts */
  function apply(pool, st, diffOf) {
    st = st || {}; pool = pool || [];
    var maxY = (st.year && /^last/.test(st.year)) ? facets(pool).maxYear : null;
    return pool.filter(function (q) {
      if (st.diff && st.diff !== "all" && diffOf && diffOf(q.difficulty) !== st.diff) return false;
      return yearOk(q, st.year, maxY) && typeOk(q, st.type);
    });
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return "&#" + c.charCodeAt(0) + ";"; }); }
  function chip(kind, val, label, count, cur) {
    return '<button type="button" class="qx-diff-chip' + (cur === val ? ' on" aria-pressed="true"' : '" aria-pressed="false"') +
      ' data-qx-facet="' + kind + '" data-qx-val="' + esc(val) + '" onclick="qxSetListFacet(\'' + kind + '\',this.getAttribute(\'data-qx-val\'))">' + esc(label) + ' <b>' + count + '</b></button>';
  }
  /* Bars only appear when the data really has the field (>=2 distinct values). */
  function barsHtml(pool, st) {
    var f = facets(pool), h = "";
    if (f.years.length >= 2) {
      var cy = (st && st.year) || "all";
      h += '<div class="qx-diff-filter-bar qx-year-filter-bar" role="group" aria-label="Year filter">' + chip("year", "all", "All years", f.total, cy);
      f.last.forEach(function (l) { if (f.years.length > l.n) h += chip("year", l.id, "Last " + l.n + " (" + (f.maxYear - l.n + 1) + "–" + f.maxYear + ")", l.count, cy); });
      f.years.forEach(function (y) { h += chip("year", String(y.year), String(y.year), y.count, cy); });
      if (f.noYear) h += chip("year", "unknown", "Year not tagged", f.noYear, cy);
      h += "</div>";
    }
    if (f.types.length >= 2) {
      var ct = (st && st.type) || "all";
      h += '<div class="qx-diff-filter-bar qx-type-filter-bar" role="group" aria-label="Question type filter">' + chip("type", "all", "All types", f.total, ct);
      f.types.forEach(function (t) { h += chip("type", t.type, t.type, t.count, ct); });
      if (f.noType) h += chip("type", "unknown", "Type not tagged", f.noType, ct);
      h += "</div>";
    }
    return h;
  }
  var api = { yearOf: yearOf, typeOf: typeOf, facets: facets, apply: apply, barsHtml: barsHtml };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.QxListFilters = api;
})(typeof window !== "undefined" ? window : globalThis);
