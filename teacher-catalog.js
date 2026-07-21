// Quantrex Teacher — full exam / subject / bank / test-series catalog for assignments
const QuantrexTeacherCatalog = (() => {
  const TS_SERIES = "jee_main_examgoal_2027";
  let _manifestCache = null;
  let _resolvedTestCache = {};

  const EXAM_TAG = {
    jee_main: "JEE", jee_advanced: "JEE Advanced", neet: "NEET", aiims: "NEET", jipmer: "NEET",
    bitsat: "BITSAT", nda: "NDA", kvpy: "Olympiad", nest_niser: "Olympiad", iat_iiser: "Olympiad",
    nta_abhyas_jee_main: "JEE", nta_abhyas_neet: "NEET", mht_cet: "MHT CET", mht_cet_medical: "MHT CET",
    comedk: "COMEDK", wbjee: "WBJEE", kcet: "KCET", ap_eamcet: "AP EAMCET", ts_eamcet: "TS EAMCET",
    viteee: "VITEEE", manipal_met: "MET", dpp: "DPP"
  };

  function examGroups() {
    if (typeof EXAMS === "undefined" || typeof BANK_INDEX === "undefined") {
      return [
        { key: "Engineering", name: "JEE & Engineering", icon: "⚙️", subjects: ["Physics", "Chemistry", "Mathematics"] },
        { key: "Medical", name: "NEET & Medical", icon: "⚕️", subjects: ["Physics", "Chemistry", "Biology"] },
        { key: "Foundation", name: "Class 9-10 & NDA", icon: "📚", subjects: ["Science", "Mathematics"] }
      ];
    }
    return Object.entries(EXAMS).map(([key, e]) => ({
      key,
      name: e.name,
      icon: e.icon || "📘",
      subjects: e.subjects || [],
      color: e.color
    }));
  }

  function banksForGroup(groupKey) {
    if (typeof BANK_INDEX === "undefined") return [];
    return Object.entries(BANK_INDEX)
      .filter(([, b]) => b.category === groupKey || (groupKey === "Engineering" && b.category === "DPP"))
      .map(([slug, b]) => ({
        slug,
        title: b.title,
        count: b.count || 0,
        examTag: EXAM_TAG[slug] || b.title,
        category: b.category
      }))
      .sort((a, b) => (b.count || 0) - (a.count || 0));
  }

  function allBanksFlat() {
    if (typeof BANK_INDEX === "undefined") return [];
    return Object.entries(BANK_INDEX).map(([slug, b]) => ({
      slug,
      title: b.title,
      count: b.count || 0,
      examTag: EXAM_TAG[slug] || b.title,
      category: b.category,
      groupKey: b.category
    }));
  }

  function subjectsForGroup(groupKey) {
    const g = examGroups().find(x => x.key === groupKey);
    return g ? g.subjects : ["Physics", "Chemistry", "Mathematics"];
  }

  function chaptersForSubject(subject) {
    if (typeof CHAPTERS === "undefined" || !subject) return [];
    return CHAPTERS[subject] || [];
  }

  function bankSlugForGroup(groupKey, preferred) {
    if (preferred && typeof BANK_INDEX !== "undefined" && BANK_INDEX[preferred]) return preferred;
    if (typeof PRIMARY_BANK !== "undefined" && PRIMARY_BANK[groupKey]) return PRIMARY_BANK[groupKey];
    const banks = banksForGroup(groupKey);
    return banks[0]?.slug || "jee_main";
  }

  function examTagForBank(slug) {
    return EXAM_TAG[slug] || slug;
  }

  async function loadTestSeriesManifest() {
    if (_manifestCache) return _manifestCache;
    try {
      if (typeof tsFetchManifest === "function") {
        _manifestCache = await tsFetchManifest(TS_SERIES);
        return _manifestCache;
      }
      const r = await fetch(`data/tests/${TS_SERIES}/manifest.json?v=${Date.now()}`);
      if (!r.ok) throw new Error("manifest");
      _manifestCache = await r.json();
      return _manifestCache;
    } catch (e) {
      console.warn("Test series manifest:", e.message || e);
      return { id: TS_SERIES, title: "JEE Main New Question Test Series 2027", tests: [], categories: [], totalTests: 0 };
    }
  }

  async function listTests(filters) {
    const m = await loadTestSeriesManifest();
    let tests = (m.tests || []).filter(t => t.status !== "upcoming");
    const f = filters || {};
    if (f.categoryId) tests = tests.filter(t => t.categoryId === f.categoryId);
    if (f.subject) {
      const catIds = (m.categories || [])
        .filter(c => (c.subject || "").toLowerCase() === f.subject.toLowerCase() || c.title === f.subject)
        .map(c => c.id);
      if (catIds.length) tests = tests.filter(t => catIds.includes(t.categoryId));
    }
    if (f.query) {
      const q = f.query.toLowerCase();
      tests = tests.filter(t => (t.title || "").toLowerCase().includes(q));
    }
    return tests.map(t => ({
      id: t.id,
      title: t.title,
      categoryId: t.categoryId,
      totalQs: t.totalQs || 0,
      file: t.file,
      testIndex: t.testIndex,
      status: t.status,
      seriesId: m.id || TS_SERIES
    }));
  }

  async function resolveTestQuestionIds(testMeta) {
    if (!testMeta || !testMeta.id) return [];
    if (_resolvedTestCache[testMeta.id]) return _resolvedTestCache[testMeta.id];
    try {
      if (typeof tsResolveTest === "function") {
        const resolved = await tsResolveTest(testMeta.seriesId || TS_SERIES, testMeta);
        const ids = (resolved?.questionIds || []).map(id => (id && id.id) ? id.id : id).filter(Boolean);
        if (ids.length) {
          _resolvedTestCache[testMeta.id] = ids;
          return ids;
        }
      }
      const r = await fetch(`data/tests/${testMeta.seriesId || TS_SERIES}/questions/${testMeta.id}.json?v=${Date.now()}`);
      if (r.ok) {
        const qs = await r.json();
        if (Array.isArray(qs) && qs.length) {
          const ids = qs.map(q => q.id).filter(Boolean);
          _resolvedTestCache[testMeta.id] = ids;
          return ids;
        }
      }
    } catch (e) {
      console.warn("resolveTest:", e.message || e);
    }
    return [];
  }

  function catalogStats() {
    const banks = allBanksFlat();
    const questions = banks.reduce((s, b) => s + (b.count || 0), 0);
    return {
      examGroups: examGroups().length,
      banks: banks.length,
      questions,
      testSeries: _manifestCache?.totalTests || 458
    };
  }

  async function statsAsync() {
    await loadTestSeriesManifest();
    return catalogStats();
  }

  return {
    TS_SERIES,
    EXAM_TAG,
    examGroups,
    banksForGroup,
    allBanksFlat,
    subjectsForGroup,
    chaptersForSubject,
    bankSlugForGroup,
    examTagForBank,
    loadTestSeriesManifest,
    listTests,
    resolveTestQuestionIds,
    catalogStats,
    statsAsync
  };
})();