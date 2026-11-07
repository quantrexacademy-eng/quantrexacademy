/* Quantrex estimated rank / percentile (qxmd321).
   Tables from published 2025–26 NTA / IIT trends. Every number on the
   report card is labelled Estimated — not an official result.
   Rank ≈ (100 − percentile) / 100 × unique appeared, except JEE Advanced
   which interpolates the 2025 CRL marks-vs-rank table. */
(function (global) {
  "use strict";
  if (global.QxRankEst) return;

  var JEE_MAIN_POOL = 1538468; /* NTA 2026 unique appeared */
  var JEE_ADV_POOL = 180422;   /* JEE Advanced 2025 appeared (approx) */
  var NEET_POOL = 2080000;     /* NEET UG 2025 appeared (approx) */

  /* marks out of 300 → percentile. Mid-shift 2026 Session-1 trend
     (InfinityLearn / SATHEE / CollegeDekho compiled NTA sheets). */
  var JEE_MAIN_PCT = [
    [0, 0], [10, 7], [20, 14], [30, 22], [40, 30], [50, 38],
    [60, 46], [70, 53], [80, 60], [90, 66], [100, 72],
    [110, 77], [120, 82], [130, 85.5], [140, 89], [150, 92],
    [160, 94], [170, 95.5], [180, 97], [190, 97.8], [200, 98.5],
    [210, 98.95], [220, 99.3], [230, 99.5], [240, 99.7],
    [250, 99.85], [260, 99.9], [270, 99.93], [280, 99.97],
    [290, 99.99], [300, 100]
  ];

  /* JEE Advanced 2025 CRL: marks /360 → rank (jeepredictor / IIT Kanpur sheets). */
  var JEE_ADV_RANK = [
    [332, 1], [278, 101], [262, 201], [249, 301], [241, 401],
    [234, 501], [228, 601], [222, 701], [217, 801], [212, 901],
    [208, 1001], [201, 1201], [196, 1401], [191, 1601], [186, 1801],
    [181, 2001], [170, 3000], [160, 3800], [150, 4401], [140, 6200],
    [130, 8000], [120, 9901], [110, 14000], [100, 18000], [90, 22000],
    [80, 27000], [74, 33859], [50, 42000], [30, 48000], [0, 54000]
  ];

  /* NEET UG 2025 marks /720 → percentile (counselling-site compilations). */
  var NEET_PCT = [
    [0, 0], [50, 12], [100, 28], [150, 47], [200, 61], [250, 73],
    [300, 83], [350, 90], [400, 94], [450, 96.6], [500, 98.3],
    [550, 99.1], [600, 99.6], [650, 99.9], [680, 99.97], [700, 99.995], [720, 100]
  ];

  /* BITSAT 2025 score /390 → approx rank among ~3 lakh. */
  var BITSAT_RANK = [
    [390, 1], [350, 200], [330, 500], [320, 800], [300, 2000],
    [280, 4000], [260, 7000], [250, 10000], [230, 15000], [220, 18000],
    [200, 25000], [180, 35000], [150, 50000], [120, 80000], [90, 120000], [0, 280000]
  ];

  /* WBJEE 2025 paper /200 → approx GMR. */
  var WBJEE_RANK = [
    [200, 1], [180, 80], [160, 250], [150, 500], [130, 1500],
    [120, 3000], [100, 8000], [80, 15000], [60, 30000], [40, 55000], [0, 120000]
  ];

  /* MHT CET 2025 /200 → percentile (state CET cell trend). */
  var MHT_PCT = [
    [0, 0], [40, 40], [60, 60], [80, 75], [100, 85], [120, 92],
    [140, 96.5], [160, 98.8], [170, 99.4], [180, 99.8], [190, 99.95], [200, 100]
  ];

  var EXAMS = {
    jee_main: { id: "jee_main", label: "JEE Main", typicalMax: 300, pool: JEE_MAIN_POOL, year: "2026", mode: "pct", table: JEE_MAIN_PCT, source: "NTA 2026 unique appeared 15,38,468 · marks-vs-percentile from 2026 session trends" },
    jee_advanced: { id: "jee_advanced", label: "JEE Advanced", typicalMax: 360, pool: JEE_ADV_POOL, year: "2025", mode: "rank", table: JEE_ADV_RANK, source: "JEE Advanced 2025 CRL marks-vs-rank (IIT Kanpur sheets)" },
    neet: { id: "neet", label: "NEET UG", typicalMax: 720, pool: NEET_POOL, year: "2025", mode: "pct", table: NEET_PCT, source: "NEET UG 2025 appeared ~20.8 lakh · published marks-vs-percentile compilations" },
    bitsat: { id: "bitsat", label: "BITSAT", typicalMax: 390, pool: 300000, year: "2025", mode: "rank", table: BITSAT_RANK, source: "BITSAT 2025 score-vs-rank counselling compilations" },
    wbjee: { id: "wbjee", label: "WBJEE", typicalMax: 200, pool: 150000, year: "2025", mode: "rank", table: WBJEE_RANK, source: "WBJEE 2025 GMR marks-vs-rank compilations" },
    mht_cet: { id: "mht_cet", label: "MHT CET", typicalMax: 200, pool: 700000, year: "2025", mode: "pct", table: MHT_PCT, source: "MHT CET 2025 percentile trend vs score /200" }
  };

  function sortedPairs(table) {
    return (table || []).slice().sort(function (a, b) { return a[0] - b[0]; });
  }
  function lerp(table, x) {
    var t = sortedPairs(table);
    if (!t.length) return 0;
    if (x <= t[0][0]) return t[0][1];
    if (x >= t[t.length - 1][0]) return t[t.length - 1][1];
    for (var i = 1; i < t.length; i++) {
      var a = t[i - 1], b = t[i];
      if (x <= b[0]) {
        var u = (x - a[0]) / (b[0] - a[0] || 1);
        return a[1] + u * (b[1] - a[1]);
      }
    }
    return t[t.length - 1][1];
  }

  function inNum(n) {
    n = Math.round(Math.abs(Number(n) || 0));
    var s = String(n);
    if (s.length <= 3) return s;
    var last3 = s.slice(-3);
    var rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    return rest + "," + last3;
  }

  function poolFmt(n) {
    if (n >= 100000) return (n / 100000).toFixed(n >= 1000000 ? 2 : 2).replace(/\.00$/, "") + " Lakh";
    return inNum(n);
  }

  function bandFromPct(p) {
    if (p >= 90) return "Excellent";
    if (p >= 75) return "Above Average";
    if (p >= 50) return "Average";
    if (p >= 25) return "Below Average";
    return "Needs Improvement";
  }

  function detect(hint) {
    var s = String(hint || "").toLowerCase().replace(/[_-]+/g, " ");
    if (/jee\s*adv|advanced/.test(s)) return "jee_advanced";
    if (/\bneet\b/.test(s)) return "neet";
    if (/bitsat/.test(s)) return "bitsat";
    if (/wbjee/.test(s)) return "wbjee";
    if (/mht\s*cet|mhtcet/.test(s)) return "mht_cet";
    if (/nda/.test(s)) return "nda";
    if (/comedk/.test(s)) return "comedk";
    if (/viteee/.test(s)) return "viteee";
    if (/jee|main|engineering/.test(s)) return "jee_main";
    return "";
  }

  function estimate(opts) {
    opts = opts || {};
    var score = Number(opts.score);
    if (!isFinite(score)) score = 0;
    var maxScore = Number(opts.maxScore) || 0;
    var hint = [opts.exam, opts.slug, opts.title, opts.hint, opts.paperFormat].filter(Boolean).join(" ");
    var id = detect(hint);
    var spec = EXAMS[id] || null;
    var paperPct = maxScore > 0 ? Math.max(0, Math.min(100, (score / maxScore) * 100)) : 0;

    if (!spec) {
      return {
        exam: id || "paper",
        examLabel: "This paper",
        typicalMax: maxScore,
        scaled: score,
        percentile: Math.round(paperPct * 10) / 10,
        rank: null,
        rankFmt: "—",
        pool: null,
        poolFmt: "",
        band: bandFromPct(paperPct),
        year: "",
        source: "",
        label: "This paper",
        note: "National rank is shown for JEE Main, JEE Advanced, NEET, BITSAT, WBJEE and MHT CET. This attempt is scored as a percentage of this paper only.",
        applicable: false,
        scaledNote: false
      };
    }

    var typical = spec.typicalMax;
    var ratio = maxScore > 0 ? (score / maxScore) : 0;
    var closeToFull = maxScore > 0 && Math.abs(maxScore - typical) / typical <= 0.12;
    var scaled = closeToFull ? score : ratio * typical;
    scaled = Math.max(0, scaled);
    var scaledNote = !closeToFull;

    var percentile, rank;
    if (spec.mode === "rank") {
      rank = Math.max(1, Math.round(lerp(spec.table, scaled)));
      percentile = Math.max(0, Math.min(100, 100 * (1 - rank / spec.pool)));
    } else {
      percentile = Math.max(0, Math.min(100, lerp(spec.table, scaled)));
      rank = Math.max(1, Math.round((100 - percentile) / 100 * spec.pool));
    }
    percentile = Math.round(percentile * 10) / 10;

    var note = "Estimated from " + spec.source + ". Not an official NTA / IIT / NEET result.";
    if (scaledNote) {
      note = "This paper is " + Math.round(score) + "/" + Math.round(maxScore) +
        ". Score was scaled to a " + typical + "-mark " + spec.label +
        " paper (" + Math.round(scaled) + "/" + typical + ") before the published table. " + note;
    }

    return {
      exam: spec.id,
      examLabel: spec.label,
      typicalMax: typical,
      scaled: Math.round(scaled * 10) / 10,
      percentile: percentile,
      rank: rank,
      rankFmt: "~ " + inNum(rank),
      pool: spec.pool,
      poolFmt: poolFmt(spec.pool),
      band: bandFromPct(percentile),
      year: spec.year,
      source: spec.source,
      label: "Estimated",
      note: note,
      applicable: true,
      scaledNote: scaledNote
    };
  }

  global.QxRankEst = {
    detect: detect,
    estimate: estimate,
    inNum: inNum,
    poolFmt: poolFmt,
    exams: EXAMS
  };
})(typeof window !== "undefined" ? window : this);
