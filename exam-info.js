/**
 * Quantrex Academy — Exam Information (Marks-style)
 * Syllabus · important chapters · weightage · trending · strategy · best books
 * Weightage/ranks are trend-based (not official guarantees). Reconfirm official brochures yearly.
 */
const QuantrexExamInfo = (() => {
  "use strict";

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function table(headers, rows) {
    const th = headers.map((h) => `<th>${esc(h)}</th>`).join("");
    const tr = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
    return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
  }

  function ul(items) {
    return `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  }

  function pills(items, cls) {
    return `<div class="ei-pill-row">${items.map((t) => `<span class="ei-pill ${cls || ""}">${t}</span>`).join("")}</div>`;
  }

  function section(cls, icon, title, body) {
    return `<section class="ei-section ${cls}"><h2>${icon} ${title}</h2>${body}</section>`;
  }

  function quickFacts(f) {
    const cells = [
      ["Exam window", f.date],
      ["Duration", f.duration],
      ["Total marks", f.marks],
      ["Negative marking", f.negative],
      ["Mode", f.mode]
    ];
    return `<div class="section-quickfacts">${cells.map(([k, v]) =>
      `<div class="qf"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`
    ).join("")}</div>`;
  }

  function trendFor(id) {
    try {
      const T = typeof window !== "undefined" ? window.QX_EXAM_TRENDS : null;
      return (T && T[id]) || null;
    } catch (e) {
      return null;
    }
  }

  function buildHtml(ex) {
    const d = ex.detail;
    const tr = trendFor(ex.id) || {};
    const syllabusBody = tr.syllabusDetail
      ? (d.syllabus ? d.syllabus + tr.syllabusDetail : tr.syllabusDetail)
      : d.syllabus;
    const parts = [
      quickFacts(d.quick),
      section("section-overview", "📘", "Overview", d.overview)
    ];
    if (tr.marksDist) parts.push(section("section-marksdist", "💯", "Marks distribution", tr.marksDist));
    if (syllabusBody) parts.push(section("section-syllabus", "📋", "Syllabus (detailed)", syllabusBody));
    if (d.important) parts.push(section("section-important", "⭐", "Important chapters", d.important));
    if (d.weightage) parts.push(section("section-weightage", "📊", "Chapter weightage (trend)", d.weightage));
    if (tr.fiveYear) parts.push(section("section-fiveyear", "📅", "Last 5 years — topic-wise list", tr.fiveYear));
    if (d.trending) parts.push(section("section-trending", "🔥", "Trending topics", d.trending));
    if (d.strategy) parts.push(section("section-strategy", "🧠", "Smart strategy", d.strategy));
    parts.push(
      section("section-scope", "🚀", "Future scope & career paths", d.scope),
      section("section-rank", "🎯", "Rank vs college (rough idea)", d.rank),
      section("section-pattern", "⏱️", "Exam pattern", d.pattern),
      section("section-prep", "📝", "Preparation plan", d.prep),
      section("section-books", "📚", "Best books & resources", d.books),
      section("section-links", "🔗", "Official links & Quantrex", d.links)
    );
    return parts.join("");
  }

  const WNOTE = `<p class="ei-note">Weightage is approximate from multi-year PYQ trends. Conducting bodies rarely publish official chapter marks. Use for prioritisation only; reconfirm official syllabus PDF each year.</p>`;

  // ─── Shared content packs (research-backed trends) ───
  const PCM_SYLLABUS = (label) => `<p><strong>${label}</strong> is based on Class 11–12 Physics, Chemistry, Mathematics. Always download the year’s official information bulletin for exact topic list.</p>
    <h3>Physics</h3>
    ${ul([
      "XI: Units & measurements, kinematics, NLM, work–energy–power, system of particles & rotation, gravitation, solids/fluids, thermal properties, thermodynamics, KTG, oscillations & waves",
      "XII: Electrostatics, current electricity, magnetism, EMI & AC, EM waves, ray & wave optics, dual nature, atoms & nuclei, semiconductors / electronic devices"
    ])}
    <h3>Chemistry</h3>
    ${ul([
      "Physical: mole concept, atomic structure, thermodynamics, equilibrium, solutions, electrochemistry, kinetics (surface chemistry as per bulletin)",
      "Inorganic: periodic properties, chemical bonding, s/p/d/f block, coordination compounds, metallurgy (as notified)",
      "Organic: GOC, hydrocarbons, halo compounds, alcohols–phenols–ethers, carbonyls & acids, amines, biomolecules (+ polymers / everyday chemistry if in syllabus)"
    ])}
    <h3>Mathematics</h3>
    ${ul([
      "Algebra: sets, complex, quadratic, sequences & series, binomial, P&C, matrices & determinants",
      "Coordinate geometry: lines, circles, conics",
      "Calculus: limits, continuity, differentiation, AOD, integrals, DE, AOL",
      "Vectors, 3D geometry, probability & statistics, trigonometry (as per bulletin)"
    ])}`;

  const PCM_IMPORTANT = `<p>High-ROI chapters (frequent in recent national/state engineering papers):</p>
    <h3>Physics ⭐</h3>
    ${pills(["Current Electricity", "Ray Optics", "Electrostatics & Capacitance", "Modern Physics", "Rotational Motion", "Thermodynamics / KTG", "Units & Errors", "Semiconductors"], "star")}
    <h3>Chemistry ⭐</h3>
    ${pills(["Coordination Compounds", "Aldehydes–Ketones–Acids", "Chemical Bonding", "Equilibrium", "Electrochemistry", "Kinetics", "d- & f-Block", "GOC + Hydrocarbons"], "star")}
    <h3>Mathematics ⭐</h3>
    ${pills(["3D Geometry", "Matrices & Determinants", "Definite Integration", "Sequences & Series", "Vectors", "Probability", "Binomial", "Limits / AOD"], "star")}`;

  const PCM_WEIGHT = WNOTE + `
    <h3>Physics (approx.)</h3>
    ${table(["Area", "Typical share"], [
      ["Mechanics cluster", "~30–35% of Physics"],
      ["Electromagnetism (incl. current, EMI, AC)", "~25–30%"],
      ["Modern Physics + semiconductors", "~15–20%"],
      ["Optics", "~8–12%"],
      ["Heat / thermo / waves", "~10–15%"]
    ])}
    <h3>Chemistry (approx.)</h3>
    ${table(["Branch", "Typical share"], [
      ["Organic", "~35–40%"],
      ["Physical", "~30–35%"],
      ["Inorganic", "~25–30%"]
    ])}
    <h3>Mathematics (approx.)</h3>
    ${table(["Unit", "Typical share"], [
      ["Calculus", "~30–37%"],
      ["Algebra", "~33–40%"],
      ["Vectors + 3D", "~12–17%"],
      ["Coordinate geometry", "~12–15%"],
      ["Trigonometry", "~2–4%"]
    ])}`;

  const PCM_TREND = `<p>Recently frequent / high-scoring focus areas:</p>
    <h3>Physics 🔥</h3>${pills(["Ray optics & instruments", "Units & error analysis", "Current electricity", "Fluids", "Semiconductors"], "hot")}
    <h3>Chemistry 🔥</h3>${pills(["Coordination (isomerism, CFSE)", "GOC intermediates", "Carbonyls", "Thermo + equilibrium numericals", "NCERT inorganic tables"], "hot")}
    <h3>Maths 🔥</h3>${pills(["3D geometry", "Matrices & determinants", "Definite integrals", "Sequences & series", "Differential equations"], "hot")}`;

  const PCB_SYLLABUS = (label) => `<p><strong>${label}</strong> — Class 11–12 Physics, Chemistry, Biology (Botany + Zoology). Follow official bulletin for exact list.</p>
    <h3>Biology</h3>
    ${ul([
      "Diversity of living organisms, cell structure & biomolecules, plant physiology, human physiology",
      "Reproduction, genetics & evolution, biology in human welfare, biotechnology, ecology"
    ])}
    <h3>Physics & Chemistry</h3>
    <p>Same broad Class 11–12 PCM topics as engineering papers, but emphasis and depth often match board + medical entrance style (fewer advanced multi-concept physics problems than JEE Advanced).</p>`;

  const PCB_IMPORTANT = `<h3>Biology ⭐ (highest marks share)</h3>
    ${pills(["Human Physiology", "Genetics & Evolution", "Ecology", "Cell Biology", "Reproduction", "Biotechnology", "Plant Physiology", "Biological Classification"], "star")}
    <h3>Chemistry ⭐</h3>
    ${pills(["Chemical Bonding", "Equilibrium", "Coordination", "Organic GOC + Carbonyls", "Biomolecules", "Electrochemistry", "Thermodynamics"], "star")}
    <h3>Physics ⭐</h3>
    ${pills(["Modern Physics", "Current Electricity", "Optics", "Laws of Motion / Work Energy", "Electrostatics", "Semiconductors", "Thermodynamics"], "star")}`;

  const PCB_WEIGHT = WNOTE + `
    ${table(["Subject", "Questions (typical NEET)", "Marks share"], [
      ["Biology", "90", "50% (360/720)"],
      ["Physics", "45", "25% (180)"],
      ["Chemistry", "45", "25% (180)"]
    ])}
    <h3>Biology internal trend</h3>
    ${table(["Area", "Approx. share of Biology"], [
      ["Human physiology", "~12–15%"],
      ["Genetics & evolution", "~10–12%"],
      ["Ecology", "~8–10%"],
      ["Cell + biomolecules", "~8–10%"],
      ["Plant physiology + reproduction", "~10–12%"],
      ["Diversity / structural organisation", "~10–12%"]
    ])}`;

  const PCB_TREND = `<h3>Biology 🔥</h3>${pills(["NCERT diagrams & tables", "Genetics numerical + pedigree", "Ecology application", "Biotechnology processes", "Human physiology cycles"], "hot")}
    <h3>Physics 🔥</h3>${pills(["Modern physics formulas", "Ray optics", "Current electricity", "Semiconductors"], "hot")}
    <h3>Chemistry 🔥</h3>${pills(["NCERT inorganic", "GOC mechanisms", "Equilibrium numericals", "Coordination"], "hot")}`;

  function booksList(items) {
    return ul(items);
  }

  const BOOKS_JEE_MAIN = booksList([
    "<strong>Physics:</strong> NCERT XI–XII · H.C. Verma (Vol 1 & 2) · D.C. Pandey (Arihant series) or Cengage · Previous 15+ years PYQ chapterwise",
    "<strong>Chemistry:</strong> NCERT (mandatory, line-by-line for Inorganic) · Physical: N Awasthi / P Bahadur · Organic: M.S. Chauhan or Himanshu Pandey · Inorganic: VK Jaiswal / NCERT only for many toppers",
    "<strong>Maths:</strong> NCERT + Exemplar · Cengage (G. Tewani) or Arihant (SK Goyal / Amit M Agarwal) · Previous year chapterwise",
    "<strong>Mocks:</strong> NTA Abhyas · Quantrex JEE Main Test Series · Full PYQ papers timed"
  ]);

  const BOOKS_JEE_ADV = booksList([
    "<strong>Physics:</strong> HCV + Irodov (selected) · Cengage / Resonance / FIITJEE advanced modules · IE Irodov / SS Krotov selectively · 15–20 years Advanced PYQs",
    "<strong>Chemistry:</strong> NCERT base · Physical: Neeraj Kumar / N Awasthi advanced · Organic: M.S. Chauhan (advanced) · Inorganic: JD Lee (selected) + NCERT + VK Jaiswal",
    "<strong>Maths:</strong> Cengage advanced · Sameer Bansal (calculus) / SL Loney (coord, trig) selectively · Black Book (Vikas Gupta) for problem drill · Advanced PYQs mandatory",
    "<strong>Must:</strong> Official JEE Advanced archive papers under timed 2-paper schedule"
  ]);

  const BOOKS_NEET = booksList([
    "<strong>Biology:</strong> NCERT XI–XII (absolute core) · MTG NCERT at your Fingertips / Objective NCERT · Trueman / Pradeep only if extra needed · NEET PYQ 30+ years",
    "<strong>Physics:</strong> NCERT · D.C. Pandey (NEET) or HCV basics · Errorless / MTG chapterwise · NEET PYQs",
    "<strong>Chemistry:</strong> NCERT · Physical: N Awasthi (NEET) · Organic: M.S. Chauhan (NEET) · Inorganic: NCERT + OP Tandon (select) · PYQs",
    "<strong>Mocks:</strong> Full-length NEET pattern (3h20m) · Quantrex NEET PYQ bank"
  ]);

  const BOOKS_BITSAT = booksList([
    "PCM same stack as JEE Main (NCERT + HCV + Cengage/Arihant light)",
    "<strong>English:</strong> Wren & Martin practice / Arihant English for competitive exams",
    "<strong>Logical Reasoning:</strong> R.S. Aggarwal (Verbal & Non-Verbal) or Arihant LR",
    "BITSAT Explorer (Arihant) / previous mocks · Official sample tests on bitsadmission.com"
  ]);

  const BOOKS_STATE_CET = (board) => booksList([
    `<strong>Primary:</strong> ${board} Class 11–12 textbooks (highest priority)`,
    "NCERT PCM for concept clarity where board books are thin",
    "State CET previous year papers (last 10 years) — mandatory",
    "Target / Arihant / Vidya / local publisher CET practice sets for that state",
    "JEE Main easy-level chapter tests for extra numerical drill (optional)"
  ]);

  const BOOKS_NDA = booksList([
    "<strong>Maths:</strong> NCERT XI–XII · R.S. Aggarwal (Elementary Maths) · Arihant Pathfinder Mathematics · Previous UPSC NDA papers",
    "<strong>GAT English:</strong> Wren & Martin · SP Bakshi (Arihant) Objective General English · newspaper editorial reading",
    "<strong>GAT GK:</strong> Lucent’s General Knowledge · NCERT 6–10 Science/History basics · monthly current affairs (Vision/any standard)",
    "<strong>All-in-one:</strong> Arihant Pathfinder NDA/NA · Quantrex NDA PYQ bank"
  ]);

  function strategyPCM(extra) {
    return ul([
      "<strong>Foundation:</strong> NCERT Chemistry full + board-level Physics/Maths formulas",
      "<strong>Scoring core:</strong> Finish ⭐ chapters with chapterwise PYQs first",
      "<strong>Full coverage:</strong> Don’t leave pure zero chapters — safe-attempt level on rest",
      "<strong>Mocks:</strong> Weekly full mock + error notebook revision",
      "<strong>Last 30 days:</strong> Only PYQ + mocks + formula sheets — no new heavy books",
      ...(extra || [])
    ]);
  }

  function strategyPCB(extra) {
    return ul([
      "<strong>Biology first:</strong> NCERT 8–10 revisions + diagrams from memory",
      "<strong>Chemistry:</strong> NCERT Inorganic daily + Physical numericals alternate days",
      "<strong>Physics:</strong> Formula sheet + 40–50 numericals/day in peak phase",
      "<strong>Mocks:</strong> Full 3h20m with OMR discipline; analyse every wrong",
      ...(extra || [])
    ]);
  }

  // ─── Catalog ───
  const CATALOG = [
    {
      id: "jee_main", name: "JEE Main", yearLabel: "2026–27", category: "Engineering",
      short: "NTA · B.E./B.Tech gateway to NITs, IIITs & JEE Advanced",
      bankSlug: "jee_main", official: "https://jeemain.nta.nic.in/",
      detail: {
        quick: { date: "Jan & Apr sessions (typical)", duration: "3 hours", marks: "300", negative: "−1 (MCQ)", mode: "CBT Online" },
        overview: `<p><strong>Joint Entrance Examination (Main)</strong> by <strong>NTA</strong> for NITs, IIITs, GFTIs and as qualifier for <strong>JEE Advanced</strong>.</p>
          ${ul(["Usually two sessions/year", "Paper 1: B.E./B.Tech (PCM)", "Paper 2A/2B: B.Arch / B.Planning"])}`,
        syllabus: PCM_SYLLABUS("JEE Main Paper 1 syllabus"),
        important: PCM_IMPORTANT,
        weightage: PCM_WEIGHT,
        trending: PCM_TREND,
        strategy: strategyPCM([
          "Two-session plan: Session 1 = real rank + learning; Session 2 = push",
          "Suggested attempt order after mocks: Chem → Phy → Maths",
          "Target bands (rough): 150+ competitive NIT zone; 200+ strong NIT/IIIT (year-dependent)"
        ]),
        scope: `<p>NITs, IIITs, GFTIs, many private universities. Branches: CSE/AI, ECE, EE, Mech, Civil, Chem, Biotech, etc.</p>
          <p>Career: software/product, core engineering, PSUs, M.Tech/MS. Packages vary widely by college & skills (~₹4–20+ LPA trend at strong campuses).</p>`,
        rank: `<p class="ei-note">Approx. General category trends only.</p>
          ${table(["Rank (approx.)", "Likely tier", "Branches"], [
            ["Top ~2k–5k", "Top NITs / strong IIITs", "CSE, ECE preferred"],
            ["~5k–25k", "Mid–upper NITs, good IIITs", "ECE, EE, Mech, Chem"],
            ["~25k–80k", "Other NITs / GFTIs", "Core & emerging"],
            ["Beyond ~1L", "State/private via Main", "Varies by quota"]
          ])}`,
        pattern: `${table(["Section", "Structure", "Marks"], [
          ["Physics / Chem / Maths", "MCQ + numerical (rules per year)", "100 each"],
          ["Total", "Typically 75–90 Qs", "300"]
        ])}
          ${ul(["MCQ usually +4 / −1", "Numerical: +4; negative as per bulletin", "CBT · multi-language options"])}`,
        prep: ul(["2-year integrated ideal; droppers 10–12 months", "Daily: learning + PYQ + revision mix", "Avoid: hard books without PYQs; no mock analysis"]),
        books: BOOKS_JEE_MAIN,
        links: ul([
          `<a href="https://jeemain.nta.nic.in/" target="_blank" rel="noopener">Official NTA JEE Main</a>`,
          `<a href="#" onclick="go('cpyqb',{step:'subjects',exam:'jee_main'});return false">Quantrex PYQ — JEE Main</a>`,
          `<a href="examgoal-test-series.html" target="_blank" rel="noopener">JEE Main 2027 Test Series</a>`
        ])
      }
    },
    {
      id: "jee_advanced", name: "JEE Advanced", yearLabel: "2026–27", category: "Engineering",
      short: "IIT entrance · Paper 1 & 2 · highest difficulty",
      bankSlug: "jee_advanced", official: "https://jeeadv.ac.in/",
      detail: {
        quick: { date: "May / June (after Main)", duration: "2 × 3 hours", marks: "Varies yearly", negative: "Partial / multi-correct", mode: "CBT Online" },
        overview: `<p><strong>JEE Advanced</strong> by an IIT under JAB for admission to <strong>IITs</strong>. Pattern changes almost every year — read official brochure.</p>
          ${ul(["Eligibility via JEE Main rank/criteria of that year", "Two compulsory papers"])}`,
        syllabus: PCM_SYLLABUS("JEE Advanced") + `<p class="ei-note">Advanced syllabus is a refined PCM list published yearly by the organising IIT — some Main topics may be out of Advanced scope. Check brochure PDF.</p>`,
        important: `<p>Depth + multi-concept mastery matters more than “easy scoring chapters” alone.</p>
          <h3>Physics ⭐</h3>${pills(["Mechanics (rotation, COM)", "Electrodynamics", "Optics", "Modern Physics", "Thermodynamics", "SHM & Waves"], "star")}
          <h3>Chemistry ⭐</h3>${pills(["GOC & reaction mechanisms", "Coordination chemistry", "Chemical bonding", "Equilibrium & thermo", "Organic named reactions", "Electrochemistry"], "star")}
          <h3>Maths ⭐</h3>${pills(["Calculus (definite, AOD)", "Algebra (complex, matrices)", "Coordinate geometry", "Vectors & 3D", "Probability", "P&C"], "star")}`,
        weightage: WNOTE + `<p>No fixed marks per chapter. Historically:</p>
          ${table(["Subject focus", "Trend"], [
            ["Physics", "Mechanics + Electrodynamics dominate; multi-correct conceptual"],
            ["Chemistry", "Organic + Physical numericals + bonding/coordination"],
            ["Maths", "Calculus + Algebra heaviest; lengthy multi-step"]
          ])}`,
        trending: `<h3>🔥</h3>${pills(["Paragraph / matrix-match style", "Multi-correct with partial marks", "Integer / numerical answers", "Linked comprehension sets", "Mixed thermo + kinetics + equilibrium"], "hot")}`,
        strategy: strategyPCM([
          "First clear Main-level accuracy, then Advanced depth",
          "Practice multi-correct carefully (negative + partial marking)",
          "Simulate full Paper-1 + Paper-2 days; build stamina",
          "Quality > quantity: 30 hard problems analysed > 100 random"
        ]),
        scope: ul(["IIT B.Tech / dual degrees", "Research, global MS, product/core leadership", "PSU/R&D pathways via GATE later"]),
        rank: `<p class="ei-note">CRL trends only.</p>
          ${table(["Approx. CRL", "Band"], [
            ["Top ~500–1500", "Top IITs, CSE/ECE preferred"],
            ["~1500–5000", "Older IITs, strong branches"],
            ["~5000–12000", "Newer IITs / dual degrees"],
            ["Beyond", "May miss IIT — NIT via Main"]
          ])}`,
        pattern: ul(["2 papers × ~3 hours", "Single/multi correct, numerical, paragraph, matrix (varies)", "Marking scheme in brochure only"]),
        prep: ul(["Advanced mocks weekly in last 4–5 months", "Revise mistakes in multi-correct sets", "Don’t ignore Chemistry NCERT even at Advanced"]),
        books: BOOKS_JEE_ADV,
        links: ul([
          `<a href="https://jeeadv.ac.in/" target="_blank" rel="noopener">Official JEE Advanced</a>`,
          `<a href="#" onclick="go('cpyqb',{step:'subjects',exam:'jee_advanced'});return false">Quantrex PYQ — JEE Advanced</a>`
        ])
      }
    },
    {
      id: "neet_ug", name: "NEET UG", yearLabel: "2026–27", category: "Medical",
      short: "NTA · MBBS / BDS / AYUSH gateway",
      bankSlug: "neet", official: "https://neet.nta.nic.in/",
      detail: {
        quick: { date: "Usually May (single day)", duration: "3 hours 20 min", marks: "720", negative: "−1", mode: "Offline OMR (typical)" },
        overview: `<p><strong>NEET UG</strong> by <strong>NTA</strong> for MBBS, BDS, AYUSH and related UG medical seats across India.</p>`,
        syllabus: PCB_SYLLABUS("NEET UG"),
        important: PCB_IMPORTANT,
        weightage: PCB_WEIGHT,
        trending: PCB_TREND,
        strategy: strategyPCB([
          "Biology = 50% marks — never trade Bio revision for random Physics hard problems",
          "Aim high accuracy; negative marking punishes guesswork",
          "Score bands (rough General): 650+ top GMC; 600+ strong state; lower → private (fees high)"
        ]),
        scope: ul(["MBBS → MD/MS, practice, research", "BDS, BAMS, BHMS, BVSc as applicable", "State + AIQ counselling via MCC/state portals"]),
        rank: `<p class="ei-note">AIR trends (General) — state quota differs a lot.</p>
          ${table(["Score / rank trend", "Likely outcome"], [
            ["~650+ / top", "Top government medical colleges"],
            ["~600–650", "Good state GMC (varies)"],
            ["~550–600", "Many state GMCs"],
            ["Lower", "Private / deemed — plan fees carefully"]
          ])}`,
        pattern: `${table(["Subject", "Q", "Marks"], [["Physics", "45", "180"], ["Chemistry", "45", "180"], ["Biology", "90", "360"], ["Total", "180", "720"]])}
          ${ul(["+4 / −1 / 0", "Confirm mode & scheme on NTA bulletin"])}`,
        prep: ul(["NCERT Bio 10+ revisions", "Daily Physics numerical set", "Chemistry NCERT + mechanisms", "Weekly full mock 3h20m"]),
        books: BOOKS_NEET,
        links: ul([
          `<a href="https://neet.nta.nic.in/" target="_blank" rel="noopener">Official NEET NTA</a>`,
          `<a href="#" onclick="go('cpyqb',{step:'subjects',exam:'neet'});return false">Quantrex PYQ — NEET</a>`
        ])
      }
    },
    {
      id: "bitsat", name: "BITSAT", yearLabel: "2026–27", category: "Engineering",
      short: "BITS Pilani / Goa / Hyderabad · English + LR",
      bankSlug: "bitsat", official: "https://www.bitsadmission.com/",
      detail: {
        quick: { date: "May–June slots", duration: "3 hours", marks: "390", negative: "−1", mode: "CBT Online" },
        overview: `<p><strong>BITSAT</strong> for Integrated First Degree at <strong>BITS Pilani, Goa, Hyderabad</strong>.</p>`,
        syllabus: PCM_SYLLABUS("BITSAT PCM") + `<h3>Also tested</h3>${ul(["English Proficiency", "Logical Reasoning", "Optional bonus questions if you finish early (as per year rules)"])}`,
        important: PCM_IMPORTANT + `<h3>Extra ⭐</h3>${pills(["English grammar & vocab", "Logical reasoning (series, coding, puzzles)", "Speed Maths"], "star")}`,
        weightage: PCM_WEIGHT + `<p>Section marks (typical): Phy 90 · Chem 90 · Eng 30 · LR 60 · Maths 120 = <strong>390</strong>.</p>`,
        trending: PCM_TREND + `<p>🔥 Speed + LR accuracy often separate 300+ from 260 scores.</p>`,
        strategy: strategyPCM([
          "Don’t ignore English & LR — free marks if practised",
          "Aim finish early for bonus questions only if accuracy is high",
          "Full CBT mocks at 130-Q pace weekly"
        ]),
        scope: ul(["BITS dual degrees, strong industry culture", "CSE/ECE highly competitive", "Placements historically strong in IT/product"]),
        rank: `<p class="ei-note">Score-based (not AIR). Cutoffs shift yearly.</p>
          ${table(["Score band (approx.)", "Likely"], [
            ["High 300s", "Pilani CSE / top"],
            ["~280–320", "Pilani core / Goa–Hyd CSE-ECE"],
            ["~240–280", "Other branches"],
            ["Lower", "Waitlist / other exams"]
          ])}`,
        pattern: `${table(["Section", "Q", "Marks"], [
          ["Physics", "30", "90"], ["Chemistry", "30", "90"], ["English", "10", "30"],
          ["Logical Reasoning", "20", "60"], ["Mathematics", "40", "120"], ["Total", "130+", "390"]
        ])}${ul(["+3 / −1 typical"])}`,
        prep: ul(["JEE Main-level PCM + dedicated LR/English 30 min daily", "Timed full mocks"]),
        books: BOOKS_BITSAT,
        links: ul([
          `<a href="https://www.bitsadmission.com/" target="_blank" rel="noopener">BITS Admissions</a>`,
          `<a href="#" onclick="go('cpyqb',{step:'subjects',exam:'bitsat'});return false">Quantrex PYQ — BITSAT</a>`
        ])
      }
    },
    {
      id: "mht_cet", name: "MHT CET", yearLabel: "2026–27", category: "Engineering",
      short: "Maharashtra CET · PCM / PCB · state colleges",
      bankSlug: "mht_cet", official: "https://cetcell.mahacet.org/",
      detail: {
        quick: { date: "April–May (typical)", duration: "3 hours / paper", marks: "200 (PCM/PCB)", negative: "None (typical)", mode: "CBT Online" },
        overview: `<p><strong>Maharashtra CET</strong> for engineering, pharmacy and professional courses in Maharashtra.</p>`,
        syllabus: `<p>Primarily <strong>Maharashtra State Board Class 11–12</strong> PCM/PCB + some NCERT overlap. Official syllabus PDF on CET Cell.</p>
          ${ul(["PCM paper for engineering", "PCB for pharmacy/related", "Application-based questions common"])}`,
        important: PCM_IMPORTANT + `<p class="ei-note">Board textbook examples & exercises are heavily reflected.</p>`,
        weightage: WNOTE + `${table(["Subject (PCM)", "Typical Q / marks trend"], [
          ["Physics", "~50 Q · high board-application mix"],
          ["Chemistry", "~50 Q · NCERT + board"],
          ["Mathematics", "~50 Q · speed-focused"]
        ])}<p>Usually <strong>no negative marking</strong> — attempt smartly after eliminating options.</p>`,
        trending: PCM_TREND + pills(["Maharashtra board numericals", "Direct formula application", "Organic named reactions from board text"], "hot"),
        strategy: strategyPCM([
          "Master HSC textbooks first — then NCERT",
          "No negative ⇒ maximise attempts with elimination",
          "Percentile/home university quota matters in CAP counselling"
        ]),
        scope: ul(["COEP, VJTI, ICT Mumbai, SPIT and state engineering colleges", "Pharmacy streams via PCB"]),
        rank: table(["Percentile band", "Likely"], [
          ["99+", "Top Mumbai/Pune CSE"], ["95–99", "Strong state colleges"],
          ["85–95", "Good regional"], ["Below", "Private / lower branches"]
        ]),
        pattern: ul(["CBT", "Typically no negative marking — verify brochure", "PCM or PCB as applicable"]),
        prep: ul(["HSC + previous MHT CET papers", "Speed practice sets daily"]),
        books: BOOKS_STATE_CET("Maharashtra HSC (Balbharati)") + ul(["Target MHT CET (Physics/Chem/Maths)", "Marvel / previous year solved papers"]),
        links: ul([
          `<a href="https://cetcell.mahacet.org/" target="_blank" rel="noopener">Maharashtra CET Cell</a>`,
          `<a href="#" onclick="go('cpyqb',{step:'subjects',exam:'mht_cet'});return false">Quantrex PYQ — MHT CET</a>`
        ])
      }
    },
    {
      id: "kcet", name: "KCET", yearLabel: "2026–27", category: "Engineering",
      short: "Karnataka CET · engineering & professional courses",
      bankSlug: "kcet", official: "https://cetonline.karnataka.gov.in/",
      detail: {
        quick: { date: "April–May", duration: "80 min / subject paper", marks: "As per papers", negative: "None (typical)", mode: "Offline OMR" },
        overview: `<p><strong>KCET</strong> by <strong>KEA</strong> for professional courses in Karnataka.</p>`,
        syllabus: `<p>Based largely on <strong>Karnataka II PU (Class 11–12)</strong> syllabus for Physics, Chemistry, Maths/Biology.</p>`,
        important: PCM_IMPORTANT,
        weightage: WNOTE + ul(["Separate papers per subject (typically 60 Q · 80 min)", "No negative marking (confirm year)", "Board textbook weight high"]),
        trending: pills(["II PU model paper pattern", "Direct theory from PU texts", "NCERT support for weak concepts"], "hot"),
        strategy: strategyPCM(["Master PU textbooks + model papers", "Time discipline: 80 minutes per paper", "Category & Hyderabad-Karnataka quota rules matter"]),
        scope: ul(["RVCE, BMSCE, MSRIT and VTU colleges", "Engineering, farm science, pharmacy as applicable"]),
        rank: table(["Rank band", "Outcome"], [
          ["Top few thousand", "Bangalore top CSE/ECE"],
          ["Mid", "Strong autonomous / VTU"],
          ["Lower", "Regional / private"]
        ]),
        pattern: ul(["OMR", "Usually no negative", "PCMB separate papers"]),
        prep: ul(["II PU textbooks thrice", "Previous KCET 10 years"]),
        books: BOOKS_STATE_CET("Karnataka II PU") + ul(["KCET chapterwise (Arihant / local)", "NCERT for concept gaps"]),
        links: ul([
          `<a href="https://cetonline.karnataka.gov.in/" target="_blank" rel="noopener">KEA / KCET</a>`,
          `<a href="#" onclick="go('cpyqb',{step:'subjects',exam:'kcet'});return false">Quantrex PYQ — KCET</a>`
        ])
      }
    },
    {
      id: "wbjee", name: "WBJEE", yearLabel: "2026–27", category: "Engineering",
      short: "West Bengal JEE · Jadavpur & state colleges",
      bankSlug: "wbjee", official: "https://wbjeeb.nic.in/",
      detail: {
        quick: { date: "April (typical)", duration: "2 hours / paper", marks: "Paper-wise", negative: "Category-based", mode: "Offline OMR" },
        overview: `<p><strong>WBJEE</strong> for engineering and related courses in West Bengal.</p>`,
        syllabus: PCM_SYLLABUS("WBJEE") + `<p>Aligns with WBCHSE Class 11–12 + standard PCM.</p>`,
        important: PCM_IMPORTANT + `<p>⭐ <strong>Mathematics Paper I</strong> is often rank-deciding — highest priority.</p>`,
        weightage: WNOTE + ul([
          "Paper I: Mathematics (Category 1/2/3 questions — different marks & negatives)",
          "Paper II: Physics + Chemistry",
          "Maths usually carries the highest rank impact"
        ]),
        trending: pills(["Category-marking careful attempts", "Strong calculus & algebra", "Physics numerical accuracy"], "hot"),
        strategy: strategyPCM([
          "Master marking categories before mocks (avoid unnecessary negatives)",
          "Maths daily timed practice non-negotiable",
          "Solve last 10 years WBJEE fully"
        ]),
        scope: ul(["Jadavpur University, Calcutta University colleges, private WB colleges"]),
        rank: table(["GMR band", "Likely"], [
          ["Top ranks", "JU / top state"], ["Mid", "Good govt/autonomous"], ["Lower", "Private"]
        ]),
        pattern: ul(["OMR", "Category 1/2/3 marking — read brochure", "Two papers"]),
        prep: ul(["Maths-first plan", "Category practice sheets"]),
        books: booksList([
          "NCERT PCM",
          "For Maths: S.K. Goyal / Cengage light + WBJEE chapterwise",
          "Arihant WBJEE Explorer / previous years solved",
          "Physics: HCV + DC Pandey (select)",
          "Chemistry: NCERT + MS Chauhan (select)"
        ]),
        links: ul([
          `<a href="https://wbjeeb.nic.in/" target="_blank" rel="noopener">WBJEEB</a>`,
          `<a href="#" onclick="go('cpyqb',{step:'subjects',exam:'wbjee'});return false">Quantrex PYQ — WBJEE</a>`
        ])
      }
    },
    {
      id: "comedk", name: "COMEDK UGET", yearLabel: "2026–27", category: "Engineering",
      short: "Karnataka private engineering consortium",
      bankSlug: "comedk", official: "https://www.comedk.org/",
      detail: {
        quick: { date: "May (typical)", duration: "3 hours", marks: "180", negative: "None", mode: "CBT Online" },
        overview: `<p><strong>COMEDK UGET</strong> for private engineering colleges in Karnataka (consortium). Open to all-India candidates as per rules.</p>`,
        syllabus: PCM_SYLLABUS("COMEDK") + `<p>Difficulty roughly between board and JEE Main (Main-easy level).</p>`,
        important: PCM_IMPORTANT,
        weightage: WNOTE + `${table(["Subject", "Typical Q", "Marks"], [
          ["Physics", "60", "60"], ["Chemistry", "60", "60"], ["Mathematics", "60", "60"], ["Total", "180", "180"]
        ])}<p>Usually <strong>+1, no negative</strong>.</p>`,
        trending: PCM_TREND,
        strategy: strategyPCM(["JEE Main easy-level practice is enough depth", "Speed for 180 Q in 3 hours", "No negative ⇒ maximise accuracy + attempts"]),
        scope: ul(["RVCE, BMS, MSRIT (COMEDK seats), PES and many private colleges"]),
        rank: table(["Rank band", "Outcome"], [
          ["Top few thousand", "Top Bangalore private CSE"],
          ["Mid", "Strong autonomous"], ["Lower", "Other consortium colleges"]
        ]),
        pattern: ul(["CBT", "60+60+60", "Usually no negative"]),
        prep: ul(["Main-level PCM without Advanced depth", "Full 180-Q mocks"]),
        books: booksList([
          "NCERT + HCV (Physics)",
          "Chemistry NCERT + MS Chauhan (select)",
          "Maths RD Sharma objective / Arihant COMEDK",
          "COMEDK previous papers + JEE Main easy PYQs"
        ]),
        links: ul([
          `<a href="https://www.comedk.org/" target="_blank" rel="noopener">COMEDK official</a>`,
          `<a href="#" onclick="go('cpyqb',{step:'subjects',exam:'comedk'});return false">Quantrex PYQ — COMEDK</a>`
        ])
      }
    },
    {
      id: "viteee", name: "VITEEE", yearLabel: "2026–27", category: "Engineering",
      short: "VIT Vellore / Chennai / AP / Bhopal",
      bankSlug: "viteee", official: "https://viteee.vit.ac.in/",
      detail: {
        quick: { date: "April slots", duration: "2 hours 30 min", marks: "As per scheme", negative: "None (typical)", mode: "CBT Online" },
        overview: `<p>Entrance for <strong>VIT</strong> campuses (Vellore, Chennai, AP, Bhopal, etc.).</p>`,
        syllabus: PCM_SYLLABUS("VITEEE") + ul(["Aptitude / English components as per that year’s brochure", "MPCEA structure historically used — verify current"]),
        important: PCM_IMPORTANT,
        weightage: WNOTE + ul(["PCM heavy; English/aptitude if included", "Typically no negative marking — confirm brochure"]),
        trending: PCM_TREND,
        strategy: strategyPCM(["Board + Main-level PCM", "Official sample tests", "Campus preference list ready before counselling"]),
        scope: ul(["Large private university, industry connect", "CSE variants highly competitive"]),
        rank: table(["Performance", "Likely"], [
          ["Top ranks", "Vellore CSE / specialty CS"],
          ["Good", "Chennai / other campuses"],
          ["Lower", "Other branches"]
        ]),
        pattern: ul(["Slot CBT", "Confirm marking yearly"]),
        prep: ul(["NCERT + Main practice", "Timed CBT"]),
        books: booksList([
          "NCERT PCM",
          "HCV + DC Pandey (select)",
          "Arihant VITEEE guide / previous pattern",
          "JEE Main easy PYQs for speed"
        ]),
        links: ul([
          `<a href="https://viteee.vit.ac.in/" target="_blank" rel="noopener">VITEEE official</a>`,
          `<a href="#" onclick="go('cpyqb',{step:'subjects',exam:'viteee'});return false">Quantrex PYQ — VITEEE</a>`
        ])
      }
    },
    {
      id: "srmjeee", name: "SRMJEEE", yearLabel: "2026–27", category: "Engineering",
      short: "SRM IST campuses · multiple phases",
      bankSlug: null, official: "https://www.srmist.edu.in/",
      detail: {
        quick: { date: "Multiple phases", duration: "~2.5 hours", marks: "As notified", negative: "Check brochure", mode: "CBT Online" },
        overview: `<p><strong>SRMJEEE</strong> for B.Tech at <strong>SRM IST</strong> campuses.</p>`,
        syllabus: PCM_SYLLABUS("SRMJEEE") + ul(["Aptitude section often included", "PCB option for some programmes — check brochure"]),
        important: PCM_IMPORTANT,
        weightage: WNOTE + ul(["PCM + aptitude as notified", "Multiple phases — best attempt strategy possible"]),
        trending: PCM_TREND,
        strategy: strategyPCM(["Main-level PCM", "Use multiple phases if allowed", "Campus (KTR etc.) preference by rank"]),
        scope: ul(["Multi-campus private network", "South India industry presence"]),
        rank: table(["Performance", "Outcome"], [
          ["Top", "KTR main CSE variants"],
          ["Mid", "Other campuses/branches"],
          ["Lower", "Alternate programmes"]
        ]),
        pattern: ul(["CBT", "Confirm marking & sections in brochure"]),
        prep: ul(["NCERT + Main PYQ style", "SRM sample papers"]),
        books: booksList([
          "NCERT + HCV",
          "Arihant SRMJEEE / Main practice books",
          "Aptitude: R.S. Aggarwal (select)",
          "Official sample tests"
        ]),
        links: ul([`<a href="https://www.srmist.edu.in/" target="_blank" rel="noopener">SRM IST</a>`])
      }
    },
    {
      id: "manipal_met", name: "Manipal MET", yearLabel: "2026–27", category: "Engineering",
      short: "Manipal Academy of Higher Education",
      bankSlug: "manipal_met", official: "https://manipal.edu/",
      detail: {
        quick: { date: "Slot-based", duration: "2 hours", marks: "As per scheme", negative: "Check year", mode: "CBT Online" },
        overview: `<p><strong>Manipal Entrance Test (MET)</strong> for B.Tech and related programmes at MAHE.</p>`,
        syllabus: PCM_SYLLABUS("MET") + ul(["English / aptitude as per brochure"]),
        important: PCM_IMPORTANT,
        weightage: WNOTE + ul(["PCM core + English/aptitude", "Confirm section marks yearly"]),
        trending: PCM_TREND,
        strategy: strategyPCM(["Board + Main basics", "English comprehension practice", "Online proctored mock if applicable"]),
        scope: ul(["Reputed private university, strong alumni", "Engineering + health sciences campus ecosystem"]),
        rank: table(["Band", "Outcome"], [
          ["Top", "Manipal CSE/ECE"],
          ["Mid", "Other branches/campuses"],
          ["Lower", "Alternate programmes"]
        ]),
        pattern: ul(["CBT / proctored options as notified"]),
        prep: ul(["NCERT + MET practice sets"]),
        books: booksList([
          "NCERT PCM",
          "HCV + Arihant MET guide",
          "English: objective grammar workbooks",
          "Previous MET pattern papers"
        ]),
        links: ul([
          `<a href="https://manipal.edu/" target="_blank" rel="noopener">Manipal official</a>`,
          `<a href="#" onclick="go('cpyqb',{step:'subjects',exam:'manipal_met'});return false">Quantrex PYQ — Manipal</a>`
        ])
      }
    },
    {
      id: "aeee", name: "AEEE", yearLabel: "2026–27", category: "Engineering",
      short: "Amrita Vishwa Vidyapeetham engineering entrance",
      bankSlug: null, official: "https://www.amrita.edu/",
      detail: {
        quick: { date: "Phases (CBT)", duration: "~2.5 hours", marks: "As notified", negative: "Check brochure", mode: "CBT / hybrid options" },
        overview: `<p><strong>AEEE</strong> for Amrita University campuses. JEE Main ranks may also be considered — verify policy.</p>`,
        syllabus: PCM_SYLLABUS("AEEE"),
        important: PCM_IMPORTANT,
        weightage: WNOTE + ul(["Physics, Chemistry, Mathematics", "Marking published each year"]),
        trending: PCM_TREND,
        strategy: strategyPCM(["JEE Main level sufficient", "Apply via AEEE + JEE Main routes if both open"]),
        scope: ul(["NAAC A++ private university", "Strong CSE/ECE demand across campuses"]),
        rank: table(["Route", "Notes"], [
          ["Top AEEE / good JEE Main", "Coimbatore CSE"],
          ["Mid", "Other campuses/branches"]
        ]),
        pattern: ul(["PCM", "Confirm brochure"]),
        prep: ul(["Main-level PCM", "Official samples"]),
        books: booksList(["NCERT + HCV", "Main PYQ / Arihant practice", "Amrita sample papers"]),
        links: ul([`<a href="https://www.amrita.edu/" target="_blank" rel="noopener">Amrita University</a>`])
      }
    },
    {
      id: "gujcet", name: "GUJCET", yearLabel: "2026–27", category: "Engineering",
      short: "Gujarat CET · engineering & pharmacy",
      bankSlug: null, official: "https://gujcet.gseb.org/",
      detail: {
        quick: { date: "March–April", duration: "3 hours", marks: "120", negative: "Check year", mode: "Offline OMR" },
        overview: `<p><strong>GUJCET</strong> for engineering and pharmacy admissions in Gujarat (with ACPC process).</p>`,
        syllabus: `<p>Based largely on <strong>Gujarat Board (GSEB) Class 11–12</strong> PCM/PCB.</p>`,
        important: PCM_IMPORTANT,
        weightage: WNOTE + ul(["PCM or PCB", "Board textbook weight high", "Confirm negative marking in notification"]),
        trending: pills(["GSEB textbook exercises", "Direct theory questions", "NCERT support"], "hot"),
        strategy: strategyPCM(["GSEB textbooks first", "Previous GUJCET papers", "ACPC counselling awareness"]),
        scope: ul(["LDCE, Nirma (via process), other Gujarat colleges"]),
        rank: table(["Merit", "Outcome"], [
          ["Top", "Ahmedabad top CSE"],
          ["Mid", "Strong state"],
          ["Lower", "Private/regional"]
        ]),
        pattern: ul(["OMR", "Confirm scheme yearly"]),
        prep: ul(["GSEB books thrice", "GUJCET PYQs"]),
        books: BOOKS_STATE_CET("Gujarat GSEB") + ul(["GUJCET practice (local publishers)", "NCERT for concepts"]),
        links: ul([`<a href="https://gujcet.gseb.org/" target="_blank" rel="noopener">GUJCET / GSEB</a>`])
      }
    },
    {
      id: "nda", name: "NDA & NA", yearLabel: "2026–27", category: "Defence",
      short: "UPSC · Army / Navy / Air Force academy",
      bankSlug: "nda", official: "https://upsc.gov.in/",
      detail: {
        quick: { date: "April & September (typical)", duration: "2.5h + 2.5h", marks: "900 written", negative: "−1/3 scheme", mode: "Offline OMR" },
        overview: `<p><strong>NDA & NA</strong> by <strong>UPSC</strong> for Army, Navy, Air Force wings (as per notification). Final selection = written + SSB + medical.</p>`,
        syllabus: `<h3>Paper I — Mathematics (300)</h3>
          ${ul(["Algebra, matrices, trigonometry", "Analytical geometry 2D/3D", "Differential & integral calculus", "Vector algebra, statistics & probability"])}
          <h3>Paper II — GAT (600)</h3>
          ${ul(["English (grammar, vocab, comprehension)", "Physics, Chemistry, General Science", "History, Geography, Polity", "Current events"])}`,
        important: `<h3>Maths ⭐</h3>${pills(["Trigonometry", "Algebra", "Calculus basics", "Coordinate geometry", "Probability & statistics", "Matrices"], "star")}
          <h3>GAT ⭐</h3>${pills(["English grammar", "Modern history", "Geography (India & world)", "Polity basics", "Physics formulas (class 11–12 light)", "Current affairs"], "star")}`,
        weightage: WNOTE + `${table(["Paper", "Marks", "Share"], [
          ["Mathematics", "300", "33% of written"],
          ["GAT English", "~200 of 600", "Critical for cutoff"],
          ["GAT GK", "~400 of 600", "Science + social + CA"]
        ])}`,
        trending: pills(["Current affairs last 6–8 months", "NCERT science factual", "English error spotting", "Maths speed sets"], "hot"),
        strategy: ul([
          "Maths + English daily non-negotiable",
          "Static GK from Lucent + NCERT; CA monthly notes",
          "Parallel physical fitness for SSB",
          "Solve last 10 UPSC NDA papers timed",
          "Written cutoff varies by service preference — aim well above bare cutoff"
        ]),
        scope: ul(["Commissioned officer career", "IMA / INA / AFA pathways after NDA", "Leadership, service benefits"]),
        rank: table(["Written", "Next"], [
          ["Clear cutoff", "SSB (5 days)"],
          ["Strong Maths + GAT", "Better service options"],
          ["Below", "Next UPSC attempt"]
        ]),
        pattern: `${table(["Paper", "Subject", "Marks", "Time"], [
          ["I", "Mathematics", "300", "2.5 h"],
          ["II", "GAT", "600", "2.5 h"]
        ])}${ul(["OMR objective", "Typically 1/3 negative"])}`,
        prep: ul(["Maths NCERT + Pathfinder", "English daily 45 min", "GK + CA 1 hour", "Fitness parallel"]),
        books: BOOKS_NDA,
        links: ul([
          `<a href="https://upsc.gov.in/" target="_blank" rel="noopener">UPSC</a>`,
          `<a href="#" onclick="go('cpyqb',{step:'subjects',exam:'nda'});return false">Quantrex PYQ — NDA</a>`
        ])
      }
    },
    {
      id: "ap_eamcet_pcm", name: "AP EAMCET (PCM)", yearLabel: "2026–27", category: "Engineering",
      short: "Andhra Pradesh engineering stream",
      bankSlug: "ap_eamcet", official: "https://cets.apsche.ap.gov.in/",
      detail: {
        quick: { date: "May (typical)", duration: "3 hours", marks: "160", negative: "None (typical)", mode: "CBT Online" },
        overview: `<p>State entrance for engineering in Andhra Pradesh (PCM stream).</p>`,
        syllabus: PCM_SYLLABUS("AP EAPCET/EAMCET") + `<p>Based on AP Intermediate (Class 11–12) syllabus.</p>`,
        important: PCM_IMPORTANT,
        weightage: WNOTE + ul(["Typically Physics 40 + Chemistry 40 + Maths 80 (confirm brochure)", "Usually no negative marking"]),
        trending: PCM_TREND,
        strategy: strategyPCM(["Inter textbooks first", "Maths highest marks — daily timed", "State PYQs 10 years"]),
        scope: ul(["JNTU colleges, state universities, private AP colleges"]),
        rank: table(["Rank", "Outcome"], [
          ["Top", "Top state CSE"],
          ["Mid", "Good regional"],
          ["Lower", "Private"]
        ]),
        pattern: ul(["CBT 3h", "Usually no negative"]),
        prep: ul(["Inter PCM + EAMCET chapterwise"]),
        books: BOOKS_STATE_CET("AP Intermediate") + ul(["Deepthi / Vikram / Arihant EAMCET series", "Previous AP EAPCET papers"]),
        links: ul([
          `<a href="https://cets.apsche.ap.gov.in/" target="_blank" rel="noopener">APSCHE CET</a>`,
          `<a href="#" onclick="go('cpyqb',{step:'subjects',exam:'ap_eamcet'});return false">Quantrex PYQ — AP EAMCET</a>`
        ])
      }
    },
    {
      id: "ap_eamcet_pcb", name: "AP EAMCET (PCB)", yearLabel: "2026–27", category: "Medical",
      short: "Andhra Pradesh agriculture / pharmacy biostream",
      bankSlug: "ap_eamcet", official: "https://cets.apsche.ap.gov.in/",
      detail: {
        quick: { date: "May (typical)", duration: "3 hours", marks: "160", negative: "None (typical)", mode: "CBT Online" },
        overview: `<p>PCB stream for agriculture, pharmacy and related courses in AP. <strong>MBBS via NEET only</strong>.</p>`,
        syllabus: PCB_SYLLABUS("AP EAMCET PCB") + `<p>AP Intermediate Botany + Zoology + Phy + Chem.</p>`,
        important: PCB_IMPORTANT,
        weightage: WNOTE + ul(["Biology heavy for biostream ranks", "Usually no negative"]),
        trending: PCB_TREND,
        strategy: strategyPCB(["Inter Bio NCERT-style depth", "State model papers"]),
        scope: ul(["B.Pharm, Agriculture, Horticulture as notified"]),
        rank: table(["Performance", "Outcome"], [
          ["Top", "Top state pharmacy/agri"],
          ["Lower", "Private/regional"]
        ]),
        pattern: ul(["PCB CBT", "Confirm distribution yearly"]),
        prep: ul(["Inter PCB + PYQs"]),
        books: booksList([
          "AP Intermediate Botany & Zoology texts",
          "NCERT Biology for concepts",
          "EAMCET PCB chapterwise (Deepthi/Arihant)",
          "NCERT Chemistry + board Physics"
        ]),
        links: ul([`<a href="https://cets.apsche.ap.gov.in/" target="_blank" rel="noopener">APSCHE CET</a>`])
      }
    },
    {
      id: "ts_eamcet_pcm", name: "TS EAMCET (PCM)", yearLabel: "2026–27", category: "Engineering",
      short: "Telangana engineering stream",
      bankSlug: "ts_eamcet", official: "https://eamcet.tsche.ac.in/",
      detail: {
        quick: { date: "May (typical)", duration: "3 hours", marks: "160", negative: "None (typical)", mode: "CBT Online" },
        overview: `<p><strong>TS EAMCET/EAPCET</strong> for engineering admissions in Telangana.</p>`,
        syllabus: PCM_SYLLABUS("TS EAMCET") + `<p>TS Intermediate syllabus based.</p>`,
        important: PCM_IMPORTANT,
        weightage: WNOTE + ul(["Typically 160 marks PCM", "Usually no negative", "Maths often 80 marks weight"]),
        trending: PCM_TREND,
        strategy: strategyPCM(["TS Inter textbooks + model papers", "Speed CBT practice", "Hyderabad college cutoffs competitive for CSE"]),
        scope: ul(["JNTUH, OU, private institutions", "Strong Hyd IT corridor for top ranks"]),
        rank: table(["Rank", "Outcome"], [
          ["Top", "Top Hyd CSE"],
          ["Mid", "Good autonomous"],
          ["Lower", "Private"]
        ]),
        pattern: ul(["CBT", "Usually no negative"]),
        prep: ul(["Inter PCM + chapterwise EAMCET"]),
        books: BOOKS_STATE_CET("TS Intermediate") + ul(["Vikram / Deepthi / Arihant TS EAMCET", "Previous papers"]),
        links: ul([
          `<a href="https://eamcet.tsche.ac.in/" target="_blank" rel="noopener">TS EAMCET</a>`,
          `<a href="#" onclick="go('cpyqb',{step:'subjects',exam:'ts_eamcet'});return false">Quantrex PYQ — TS EAMCET</a>`
        ])
      }
    },
    {
      id: "ts_eamcet_pcb", name: "TS EAMCET (PCB)", yearLabel: "2026–27", category: "Medical",
      short: "Telangana biostream · pharmacy / agri",
      bankSlug: "ts_eamcet", official: "https://eamcet.tsche.ac.in/",
      detail: {
        quick: { date: "May (typical)", duration: "3 hours", marks: "160", negative: "None (typical)", mode: "CBT Online" },
        overview: `<p>PCB stream for pharmacy, agriculture etc. in Telangana. MBBS via NEET.</p>`,
        syllabus: PCB_SYLLABUS("TS EAMCET PCB"),
        important: PCB_IMPORTANT,
        weightage: WNOTE + ul(["Biology-focused ranking", "Usually no negative"]),
        trending: PCB_TREND,
        strategy: strategyPCB(["Inter Bio mastery", "State PYQs"]),
        scope: ul(["B.Pharm, Agriculture, related as notified"]),
        rank: table(["Performance", "Outcome"], [
          ["Top", "Top state biostream"],
          ["Lower", "Private"]
        ]),
        pattern: ul(["PCB CBT"]),
        prep: ul(["NCERT Bio + Inter texts"]),
        books: booksList([
          "TS Intermediate Botany/Zoology",
          "NCERT Biology",
          "EAMCET PCB practice series",
          "NCERT Chemistry"
        ]),
        links: ul([`<a href="https://eamcet.tsche.ac.in/" target="_blank" rel="noopener">TS EAMCET</a>`])
      }
    },
    {
      id: "nest_ug", name: "NEST UG", yearLabel: "2026–27", category: "Science",
      short: "NISER & UM-DAE CEBS · integrated MSc",
      bankSlug: "nest_niser", official: "https://www.nestexam.in/",
      detail: {
        quick: { date: "June (typical)", duration: "3.5 hours", marks: "Sectional", negative: "Yes (partial)", mode: "CBT Online" },
        overview: `<p><strong>NEST</strong> for <strong>NISER Bhubaneswar</strong> and <strong>UM-DAE CEBS Mumbai</strong> 5-year Integrated MSc.</p>`,
        syllabus: `<p>Four sections: <strong>Biology, Chemistry, Mathematics, Physics</strong> at Class 11–12 + olympiad-flavoured depth. Best 3 of 4 often count — confirm year rules.</p>
          ${PCM_SYLLABUS("NEST PCM").replace("Mathematics", "Mathematics (section)")}
          <h3>Biology</h3>${ul(["Cell biology, genetics, ecology, physiology — NCERT deep + conceptual"])}`,
        important: `<h3>All four sections matter for cutoff</h3>
          ${pills(["Conceptual Physics", "Physical Chemistry numericals", "Organic mechanisms", "Calculus & algebra", "Genetics & cell bio", "Ecology"], "star")}`,
        weightage: WNOTE + ul(["Sectional cutoffs apply", "Skipping one weak section only works if best-3 rule applies that year", "Negative marking present"]),
        trending: pills(["Multi-concept science", "Olympiad-style reasoning", "NCERT+ depth", "Equal section practice"], "hot"),
        strategy: ul([
          "Build all four subjects — don’t drop one early",
          "Past NEST papers mandatory",
          "Research-oriented mindset: understand, don’t only memorise"
        ]),
        scope: ul(["Integrated MSc research path", "PhD / DAE labs / academia"]),
        rank: table(["Performance", "Outcome"], [
          ["Top ranks", "NISER / CEBS streams"],
          ["Borderline", "Waitlist / next attempt"]
        ]),
        pattern: ul(["CBT ~3.5h", "4 sections", "Negative marking", "Confirm best-3 rule yearly"]),
        prep: ul(["NCERT deep + selective advanced", "NEST PYQs"]),
        books: booksList([
          "NCERT PCBM complete",
          "Physics: HCV + Irodov select",
          "Chemistry: NCERT + advanced physical/organic practice",
          "Maths: Cengage / Arihant JEE level",
          "Biology: NCERT + Campbell excerpts (select)",
          "Previous NEST papers (must)"
        ]),
        links: ul([
          `<a href="https://www.nestexam.in/" target="_blank" rel="noopener">NEST official</a>`,
          `<a href="#" onclick="go('cpyqb',{step:'subjects',exam:'nest_niser'});return false">Quantrex PYQ — NEST</a>`
        ])
      }
    },
    {
      id: "ugee", name: "BITS Hyderabad UGEE", yearLabel: "2026–27", category: "Engineering",
      short: "BITS special dual degree / research pathway (as notified)",
      bankSlug: null, official: "https://www.bitsadmission.com/",
      detail: {
        quick: { date: "As per BITS notification", duration: "Data to be confirmed", marks: "Data to be confirmed", negative: "Data to be confirmed", mode: "As notified" },
        overview: `<p><strong>UGEE</strong> pathway(s) for select BITS dual degree / research-linked programmes as announced. Programme names change — verify brochure.</p>`,
        syllabus: `<p>Typically Advanced-level PCM when dual-degree research track is offered. <strong>Confirm official PDF only</strong> — do not rely on old blogs.</p>
          ${PCM_SYLLABUS("Expected PCM depth (verify)")}`,
        important: PCM_IMPORTANT + `<p class="ei-note">If brochure not out: prepare as JEE Advanced + BITSAT hybrid.</p>`,
        weightage: `<p class="ei-note">Data to be confirmed from that year’s BITS admission brochure.</p>`,
        trending: pills(["Official brochure first", "Research aptitude if tested", "Advanced PCM"], "hot"),
        strategy: strategyPCM(["Read bitsadmission.com every cycle", "Strong Advanced prep if research dual degree"]),
        scope: ul(["BITS dual degree research exposure when offered"]),
        rank: `<p class="ei-note">Seat matrix & cutoffs only with that year’s brochure.</p>`,
        pattern: `<p>Notified annually by BITS.</p>`,
        prep: ul(["BITSAT + Advanced stack", "Official samples if any"]),
        books: BOOKS_JEE_ADV + BOOKS_BITSAT,
        links: ul([`<a href="https://www.bitsadmission.com/" target="_blank" rel="noopener">BITS Admissions</a>`])
      }
    },
    {
      id: "upeseat", name: "UPESEAT", yearLabel: "2026–27", category: "Engineering",
      short: "UPES Dehradun engineering entrance",
      bankSlug: null, official: "https://www.upes.ac.in/",
      detail: {
        quick: { date: "Slot-based", duration: "~3 hours", marks: "As notified", negative: "Check brochure", mode: "CBT Online" },
        overview: `<p>Entrance for <strong>UPES</strong> B.Tech; also admits via JEE Main / Board merit as per policy.</p>`,
        syllabus: PCM_SYLLABUS("UPESEAT") + ul(["English / general awareness as per brochure"]),
        important: PCM_IMPORTANT,
        weightage: WNOTE + ul(["PCM + English/GA", "Confirm yearly"]),
        trending: PCM_TREND,
        strategy: strategyPCM(["Main-level PCM", "Apply JEE Main route if accepted", "Energy/specialisation programmes research"]),
        scope: ul(["Energy, core engg, CSE specialisations", "Industry-aligned programmes"]),
        rank: table(["Route", "Notes"], [
          ["UPESEAT rank", "Branch allocation"],
          ["JEE Main", "If accepted that year"]
        ]),
        pattern: ul(["CBT", "Confirm marking"]),
        prep: ul(["NCERT + Main practice", "English aptitude"]),
        books: booksList([
          "NCERT + HCV",
          "Main PYQ",
          "Arihant / UPES sample if available",
          "English objective practice"
        ]),
        links: ul([`<a href="https://www.upes.ac.in/" target="_blank" rel="noopener">UPES</a>`])
      }
    },
    {
      id: "neet_mds", name: "NEET MDS", yearLabel: "2026–27", category: "Medical",
      short: "Postgraduate dental · MDS seats",
      bankSlug: null, official: "https://nbe.edu.in/",
      detail: {
        quick: { date: "As per NBE/NTA notice", duration: "3 hours", marks: "As notified", negative: "Yes (typical)", mode: "CBT Online" },
        overview: `<p><strong>NEET MDS</strong> for <strong>MDS</strong> seats. Conducting body/portal as notified by MoHFW (often NBE).</p>`,
        syllabus: `<p>Full <strong>BDS curriculum</strong>-based: oral medicine, oral surgery, prosthodontics, orthodontics, periodontics, pedodontics, conservative dentistry, oral pathology, public health dentistry, basic medical sciences applied to dentistry.</p>`,
        important: `<h3>High-yield clinical ⭐</h3>
          ${pills(["Oral surgery", "Orthodontics", "Prosthodontics", "Conservative / Endodontics", "Periodontics", "Oral pathology", "Oral medicine & radiology"], "star")}`,
        weightage: WNOTE + ul(["Single paper CBT", "Clinical subjects dominate", "Negative marking typically applies — confirm bulletin"]),
        trending: pills(["Image-based clinical", "Recent guidelines", "High-yield MCQ banks", "Previous NEET MDS"], "hot"),
        strategy: ul([
          "BDS subject-wise revision notes",
          "Previous NEET MDS papers 5–10 years",
          "Specialisation demand affects cutoff — plan category & college list"
        ]),
        scope: ul(["MDS specialisations", "Academic & specialist clinical careers"]),
        rank: `<p class="ei-note">Cutoffs vary by specialisation & category — check MCC data yearly.</p>`,
        pattern: ul(["CBT", "BDS-based", "Confirm negative marking"]),
        prep: ul(["Subject notes + MCQ banks", "Full mocks"]),
        books: booksList([
          "BDS standard textbooks revision (subject-wise)",
          "Dental Pulse / Dentest / similar MDS entrance MCQ books (popular in market)",
          "Previous NEET MDS solved papers",
          "AIIMS/PGI dental MCQs selectively"
        ]),
        links: ul([
          `<a href="https://nbe.edu.in/" target="_blank" rel="noopener">NBE</a>`,
          `<a href="https://mcc.nic.in/" target="_blank" rel="noopener">MCC counselling</a>`
        ])
      }
    },
    {
      id: "cuet_ug", name: "CUET UG", yearLabel: "2026–27", category: "University",
      short: "NTA · central university UG admissions",
      bankSlug: null, official: "https://cuet.nta.nic.in/",
      detail: {
        quick: { date: "May–June window", duration: "Slot-based", marks: "Subject-wise", negative: "−1 (MCQ typical)", mode: "CBT Online" },
        overview: `<p><strong>CUET UG</strong> by NTA for central and participating universities (DU, BHU, etc. as applicable).</p>`,
        syllabus: `<p>Combination of:</p>
          ${ul([
            "Language paper(s)",
            "Domain subjects (aligned largely to Class 12 NCERT of chosen subjects)",
            "General Test (GK, reasoning, quantitative — if required by programme)"
          ])}
          <p>Choose subjects strictly as per target university programme mapping.</p>`,
        important: `<h3>⭐ Depends on programme</h3>
          ${pills(["Domain NCERT Class 12 deep", "Language comprehension", "General Test quant + reasoning", "Current affairs (GT)"], "star")}
          <p>For B.Sc PCM: Physics/Chem/Maths domains. For BA: language + domain + GT as required.</p>`,
        weightage: WNOTE + ul(["Each university sets programme cutoffs separately", "No single national rank mapping", "Domain accuracy > random GT prep if not required"]),
        trending: pills(["NCERT domain line-by-line", "Language RC practice", "GT reasoning sets", "University-specific subject combo research"], "hot"),
        strategy: ul([
          "List target courses → required CUET subjects first",
          "NCERT domain 100%",
          "Mocks in NTA pattern",
          "Track each university’s previous cutoff style"
        ]),
        scope: ul(["DU, BHU, JNU (as applicable), many central/state universities", "BA/BSc/BCom/professional UG"]),
        rank: `<p class="ei-note">University-wise merit — not one AIR table.</p>`,
        pattern: ul(["CBT slots", "Language + Domain + GT combos", "MCQ negative typical"]),
        prep: ul(["Domain NCERT", "Language daily", "GT if needed"]),
        books: booksList([
          "NCERT Class 12 for each domain subject (primary)",
          "Oswaal / Arihant / MTG CUET domain practice",
          "Language: previous CUET language papers + Wren & Martin practice",
          "General Test: R.S. Aggarwal (quant/reasoning) + Lucent GK (select)",
          "Official NTA sample papers"
        ]),
        links: ul([`<a href="https://cuet.nta.nic.in/" target="_blank" rel="noopener">CUET NTA</a>`])
      }
    },
    {
      id: "keam", name: "KEAM", yearLabel: "2026–27", category: "Engineering",
      short: "Kerala engineering & professional courses",
      bankSlug: null, official: "https://cee.kerala.gov.in/",
      detail: {
        quick: { date: "May–June", duration: "Paper-wise", marks: "As notified", negative: "Check year", mode: "Offline / as notified" },
        overview: `<p><strong>KEAM</strong> under CEE Kerala for professional courses. Medical streams may integrate NEET — verify.</p>`,
        syllabus: PCM_SYLLABUS("KEAM") + `<p>Kerala Higher Secondary + standard PCM.</p>`,
        important: PCM_IMPORTANT,
        weightage: WNOTE + ul(["Physics, Chemistry, Maths papers", "Confirm latest scheme on CEE site"]),
        trending: PCM_TREND,
        strategy: strategyPCM(["Kerala + NCERT syllabus", "Previous KEAM papers", "State rank + reservation rules"]),
        scope: ul(["Govt & private engineering in Kerala", "CET colleges"]),
        rank: table(["Performance", "Outcome"], [
          ["Top", "Top Kerala engg"],
          ["Mid–lower", "Private / other branches"]
        ]),
        pattern: ul(["Confirm yearly on CEE"]),
        prep: ul(["State textbooks + KEAM PYQ"]),
        books: BOOKS_STATE_CET("Kerala HSE") + ul(["DC Books / Arihant KEAM practice", "NCERT support"]),
        links: ul([`<a href="https://cee.kerala.gov.in/" target="_blank" rel="noopener">CEE Kerala</a>`])
      }
    }
  ];

  let _filterCat = "All";
  let _search = "";
  let _activeId = CATALOG[0].id;

  function filtered() {
    const q = _search.trim().toLowerCase();
    return CATALOG.filter((e) => {
      if (_filterCat !== "All" && e.category !== _filterCat) return false;
      if (!q) return true;
      return (e.name + " " + e.short + " " + e.category).toLowerCase().includes(q);
    });
  }

  function cats() {
    const set = new Set(CATALOG.map((e) => e.category));
    return ["All", ...[...set].sort()];
  }

  function listHtml() {
    const items = filtered();
    if (!items.length) return `<div class="empty" style="padding:16px">No exams match.</div>`;
    return items.map((e) => `
      <button type="button" class="ei-item${e.id === _activeId ? " on" : ""}" data-ei="${e.id}">
        <span class="ei-dot"></span>
        <span><strong style="font-weight:700">${esc(e.name)}</strong>
        <small>${esc(e.yearLabel)} · ${esc(e.category)}</small></span>
      </button>`).join("");
  }

  function detailHtml() {
    const ex = CATALOG.find((e) => e.id === _activeId) || CATALOG[0];
    const actions = [];
    if (ex.bankSlug) {
      actions.push(`<button type="button" class="ei-btn primary" onclick="go('cpyqb',{step:'subjects',exam:'${ex.bankSlug}'})">Open PYQ Bank</button>`);
    }
    if (ex.official) {
      actions.push(`<a class="ei-btn" href="${esc(ex.official)}" target="_blank" rel="noopener">Official website ↗</a>`);
    }
    actions.push(`<button type="button" class="ei-btn" onclick="go('tests')">Tests</button>`);
    return `
      <div class="ei-detail-head">
        <div>
          <h1>${esc(ex.name)} <span style="font-size:16px;font-weight:600;color:var(--gray)">${esc(ex.yearLabel)}</span></h1>
          <p>${esc(ex.short)}</p>
        </div>
        <div class="ei-actions">${actions.join("")}</div>
      </div>
      ${buildHtml(ex)}
      <p class="ei-note">Curated from public syllabus patterns, multi-year PYQ trends, and widely recommended book lists. Always reconfirm dates, marking, syllabus PDF and cutoffs from the official conducting body for your exam year.</p>`;
  }

  function pageHtml() {
    const catTabs = cats().map((c) =>
      `<button type="button" class="ei-cat-tab${c === _filterCat ? " on" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`
    ).join("");
    return `
      <div class="ei-page">
        <div class="qx-folder-nav-actions" style="margin-bottom:12px">
          <button type="button" class="qx-nav-back" onclick="go('dashboard')">← Home</button>
          <button type="button" class="qx-nav-exit" onclick="go('dashboard')">Exit</button>
        </div>
        ${typeof topbar === "function" ? topbar("Exam Information", "Syllabus · weightage · books · strategy — complete guides") : "<h1>Exam Information</h1>"}
        <div class="ei-cat-tabs">${catTabs}</div>
        <div class="ei-layout">
          <aside class="ei-list">
            <div class="ei-list-head">All exams (${CATALOG.length})</div>
            <input type="search" class="ei-search" id="eiSearch" placeholder="Search exam…" value="${esc(_search)}">
            <div id="eiListBody">${listHtml()}</div>
          </aside>
          <main class="ei-detail" id="eiDetail">${detailHtml()}</main>
        </div>
      </div>`;
  }

  function bind(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-ei]").forEach((btn) => {
      btn.onclick = () => {
        _activeId = btn.getAttribute("data-ei");
        refresh(scope);
      };
    });
    scope.querySelectorAll("[data-cat]").forEach((tab) => {
      tab.onclick = () => {
        _filterCat = tab.getAttribute("data-cat") || "All";
        const items = filtered();
        if (items.length && !items.some((e) => e.id === _activeId)) _activeId = items[0].id;
        refresh(scope);
      };
    });
    const search = scope.querySelector("#eiSearch");
    if (search) {
      search.oninput = () => {
        _search = search.value || "";
        const body = scope.querySelector("#eiListBody");
        if (body) {
          body.innerHTML = listHtml();
          bindListOnly(scope);
        }
      };
    }
  }

  function bindListOnly(scope) {
    scope.querySelectorAll("[data-ei]").forEach((btn) => {
      btn.onclick = () => {
        _activeId = btn.getAttribute("data-ei");
        const detail = document.getElementById("eiDetail");
        if (detail) detail.innerHTML = detailHtml();
        scope.querySelectorAll("[data-ei]").forEach((b) => b.classList.toggle("on", b.getAttribute("data-ei") === _activeId));
      };
    });
  }

  function refresh(scope) {
    const main = document.getElementById("app-main");
    if (!main) return;
    main.innerHTML = pageHtml();
    bind(main);
  }

  async function viewExamInfo(payload) {
    if (payload && payload.id) _activeId = payload.id;
    const html = pageHtml();
    setTimeout(() => bind(document.getElementById("app-main")), 0);
    return html;
  }

  return {
    viewExamInfo,
    catalog: CATALOG,
    open: (id) => {
      if (id) _activeId = id;
      if (typeof go === "function") go("examinfo", { id: _activeId });
    }
  };
})();

async function viewExamInfo(payload) {
  return QuantrexExamInfo.viewExamInfo(payload);
}
