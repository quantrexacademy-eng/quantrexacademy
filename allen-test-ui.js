// Quantrex Academy — NTA-style CBT UI (instructions, marking schemes, practice layout)
const AllenTestUI = (() => {
  const BRAND_NAME = "Quantrex Academy";
  // Premium 3D chrome ring + blue orbit mark (tight emblem, no excess padding)
  const LOGO_SVG = `<span class="mtk-logo mtk-logo-img" aria-hidden="true"><img src="assets/quantrex-logo-3d-64.png?v=qxfix104" width="28" height="28" alt="" class="qx-ui-brand-logo qx-brand-logo-svg"></span>`;
  window.QX_BRAND = { name: BRAND_NAME, logo: LOGO_SVG };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function detectContext(config) {
    const cfg = config || {};
    const meta = cfg.meta || {};
    const slug = String(meta.slug || cfg.paperFormat || "").toLowerCase();
    const source = String(meta.source || "");
    let year = meta.year != null ? Number(meta.year) : null;
    if (!year && source && typeof qYearFromSource === "function") year = qYearFromSource(source);
    if (!year && source) {
      const m = source.match(/\b(20\d{2}|19\d{2})\b/);
      if (m) year = parseInt(m[1], 10);
    }
    if (!year && cfg.title) {
      const m = String(cfg.title).match(/\b(20\d{2}|19\d{2})\b/);
      if (m) year = parseInt(m[1], 10);
    }
    // Marks exam format — never default wrong exam to JEE Main when slug says otherwise
    let exam = meta.exam || null;
    let examTitleStr = meta.examTitle || null;
    if (!exam && typeof marksExamFormat === "function") {
      const fmt = marksExamFormat(slug || cfg.paperFormat || "");
      if (fmt) {
        exam = fmt.exam;
        examTitleStr = examTitleStr || fmt.title;
      }
    }
    if (!exam) {
      const blob = slug + " " + source + " " + (cfg.paperFormat || "") + " " + (cfg.title || "");
      if (/jee_advanced|jee advanced/i.test(blob)) exam = "jee_advanced";
      else if (/neet|nta_abhyas_neet/i.test(blob)) exam = "neet";
      else if (/aiims/i.test(blob)) exam = "aiims";
      else if (/jipmer/i.test(blob)) exam = "jipmer";
      else if (/bitsat/i.test(blob)) exam = "bitsat";
      else if (/\bnda\b/i.test(blob)) exam = "nda";
      else if (/mht.?cet.?med/i.test(blob)) exam = "mht_cet_medical";
      else if (/mht.?cet/i.test(blob)) exam = "mht_cet";
      else if (/comedk/i.test(blob)) exam = "comedk";
      else if (/wbjee/i.test(blob)) exam = "wbjee";
      else if (/kcet/i.test(blob)) exam = "kcet";
      else if (/ap.?eamcet/i.test(blob)) exam = "ap_eamcet";
      else if (/ts.?eamcet/i.test(blob)) exam = "ts_eamcet";
      else if (/viteee/i.test(blob)) exam = "viteee";
      else if (/manipal|met/i.test(blob)) exam = "manipal_met";
      else if (/iat|iiser/i.test(blob)) exam = "iat_iiser";
      else if (/nest|niser/i.test(blob)) exam = "nest_niser";
      else if (/kvpy/i.test(blob)) exam = "kvpy";
      else exam = "jee_main";
    }
    if (cfg.testType === "testseries" && !meta.exam) {
      exam = "jee_main";
      if (!year) year = 2027;
    }
    const pattern = resolveOfficialPattern(exam, year, (cfg.questionIds || []).length, cfg);
    return {
      exam,
      year,
      slug,
      source,
      testType: cfg.testType || "custom",
      pattern,
      examTitle: examTitleStr || null
    };
  }

  /**
   * Infer JEE Main pattern from THIS paper's questions first (Marks PYQ = real shift).
   * Never force a false "20+5 all" template when the paper is 90-MCQ or 20+10.
   */
  function inferJeeMainFromPaper(questionIds) {
    const ids = questionIds || [];
    const n = ids.length;
    if (!n || typeof getQ !== "function") return null;
    let num = 0;
    ids.forEach(id => {
      try {
        const q = getQ(id);
        if (q && typeof isNumericalQuestion === "function" && isNumericalQuestion(q)) num++;
        else if (q && typeof QuantrexQFormat !== "undefined" && QuantrexQFormat.getType
          && QuantrexQFormat.getType(q) === "numerical") num++;
      } catch (_) { /* */ }
    });
    // Pure MCQ papers
    if (num <= 1) {
      if (n >= 85) return "main_90_mcq";
      if (n >= 70) return "main_75_mcq";
      return n >= 60 ? "main_75_mcq" : "main_90_mcq";
    }
    // Has numericals: 2021–24 style ~30 nums (10×3), 2025+ style ~15 nums (5×3)
    if (num >= 20 || (n >= 85 && num >= 10)) return "main_90_num";
    if (num >= 3) return "main_75_num";
    return n >= 85 ? "main_90_num" : "main_75_num";
  }

  /**
   * Official year map — overridden by real paper structure for PYQ mocks.
   */
  function jeeMainPattern(year, loadedCount, questionIds) {
    // Prefer actual paper (PYQ shift) so we never show false 20+5 on a different paper
    if (questionIds && questionIds.length >= 20) {
      const fromPaper = inferJeeMainFromPaper(questionIds);
      if (fromPaper) return fromPaper;
    }
    const y = year != null ? Number(year) : null;
    const n = Number(loadedCount) || 0;
    if (y != null && !Number.isNaN(y)) {
      if (y <= 2012) return "aieee_90";
      if (y <= 2018) return "main_90_mcq";
      if (y <= 2020) return "main_75_mcq";
      if (y <= 2024) return "main_90_num"; // 20 MCQ + 10 NUM (attempt any 5)
      return "main_75_num"; // 2025+ : 20 MCQ + 5 NUM
    }
    if (n >= 85) return "main_90_mcq";
    if (n >= 70 && n <= 84) return "main_75_mcq";
    if (n > 0) return n >= 60 ? "main_75_mcq" : "main_90_mcq";
    return "main_90_mcq";
  }

  function neetPattern(year, loadedCount) {
    const y = year != null ? Number(year) : null;
    const n = Number(loadedCount) || 0;
    if (y != null && !Number.isNaN(y)) {
      if (y >= 2021 && y <= 2024) return "neet_200_ab";
      return "neet_180_mcq"; // ≤2020 and 2025+
    }
    if (n >= 190) return "neet_200_ab";
    return "neet_180_mcq";
  }

  /** Single resolver used by instructions + in-test sections */
  function resolveOfficialPattern(exam, year, loadedCount, config) {
    const meta = (config && config.meta) || {};
    const ids = (config && config.questionIds) || [];
    if (exam === "neet") return neetPattern(year, loadedCount);
    // JEE Advanced — year key only (never JEE Main labels)
    if (exam === "jee_advanced") {
      if (meta.pattern && /^adv_/.test(String(meta.pattern))) return meta.pattern;
      const y = year != null ? Number(year) : null;
      return y ? `adv_${y}` : "jee_advanced";
    }
    // Only JEE Main uses SC/NUM year maps — other exams use subject layout
    if (exam === "jee_main" || !exam) {
      const fromPaper = ids.length >= 20 ? inferJeeMainFromPaper(ids) : null;
      if (fromPaper) return fromPaper;
      if (meta.pattern && !ids.length) return meta.pattern;
      return jeeMainPattern(year, loadedCount, ids);
    }
    return (meta.pattern) || (exam + "_paper");
  }

  function patternMeta(pat, ctx) {
    const M = {
      aieee_90: { qs: 90, marks: 360, mins: 180, label: "AIEEE / JEE Main — 90 MCQ" },
      main_90_mcq: { qs: 90, marks: 360, mins: 180, label: "JEE Main — 90 MCQ" },
      main_75_mcq: { qs: 75, marks: 300, mins: 180, label: "JEE Main — 75 MCQ" },
      main_90_num: { qs: 90, marks: 300, mins: 180, label: "JEE Main — Section A (MCQ) + Section B (Numerical)" },
      main_75_num: { qs: 75, marks: 300, mins: 180, label: "JEE Main — Section A (MCQ) + Section B (Numerical)" },
      neet_180_mcq: { qs: 180, marks: 720, mins: 180, label: "NEET — 180 MCQ" },
      neet_200_ab: { qs: 200, marks: 720, mins: 200, label: "NEET — Section A + Section B" },
      jee_advanced: { qs: 54, marks: 180, mins: 180, label: "JEE (Advanced)" }
    };
    if (M[pat]) return M[pat];
    // Year-wise JEE Advanced (adv_2025, adv_2024, …)
    if (/^adv_/.test(String(pat || "")) || (ctx && ctx.exam === "jee_advanced")) {
      const y = (ctx && ctx.year) || (String(pat).match(/adv_(\d{4})/) || [])[1];
      const off = (typeof jeeAdvOfficialForYear === "function")
        ? jeeAdvOfficialForYear(y)
        : { durationMin: 180, paperMarksHint: 180 };
      const n = (ctx && ctx.loaded) || 0;
      return {
        qs: n >= 20 ? n : 54,
        marks: off.paperMarksHint || 180,
        mins: off.durationMin || 180,
        label: `JEE (Advanced)${y ? " " + y : ""}`
      };
    }
    // Other Marks exams — use registry
    if (ctx && typeof marksExamFormat === "function") {
      const fmt = marksExamFormat(ctx.slug || ctx.exam || "");
      if (fmt) {
        return {
          qs: fmt.defaultQs || 0,
          marks: fmt.totalMarks || 0,
          mins: fmt.durationMin || 180,
          label: fmt.title + " — Full paper"
        };
      }
    }
    return { qs: 0, marks: 0, mins: 180, label: (ctx && ctx.examTitle) || pat || "Official" };
  }

  function examTitle(ctx) {
    if (ctx && ctx.examTitle) return ctx.examTitle;
    if (ctx && ctx.slug && typeof marksExamFormat === "function") {
      const fmt = marksExamFormat(ctx.slug);
      if (fmt && fmt.title) return fmt.title;
    }
    if (ctx && ctx.exam && typeof marksExamFormat === "function") {
      const fmt = marksExamFormat(ctx.exam);
      if (fmt && fmt.title) return fmt.title;
    }
    const e = (ctx && ctx.exam) || "";
    if (e === "jee_advanced" || (ctx && ctx.slug === "jee_advanced")) return "JEE (Advanced)";
    if (e === "neet") return "NEET (UG)";
    if (e === "bitsat") return "BITSAT";
    if (e === "nda") return "NDA";
    if (e === "aiims") return "AIIMS";
    if (e === "jipmer") return "JIPMER";
    if (e === "mht_cet") return "MHT CET";
    if (e === "mht_cet_medical") return "MHT CET (Medical)";
    if (e === "comedk") return "COMEDK UGET";
    if (e === "wbjee") return "WBJEE";
    if (e === "kcet") return "KCET";
    if (e === "ap_eamcet") return "AP EAMCET";
    if (e === "ts_eamcet") return "TS EAMCET";
    if (e === "viteee") return "VITEEE";
    if (e === "manipal_met") return "Manipal MET";
    if (e === "iat_iiser") return "IAT (IISER)";
    if (e === "nest_niser") return "NEST (NISER)";
    if (e === "kvpy") return "KVPY";
    const y = Number(ctx && ctx.year) || 0;
    if (y && y <= 2012 && (e === "jee_main" || !e)) return "AIEEE / JEE (Main)";
    if (e === "jee_main" || !e) return "JEE (Main)";
    return e.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  function paperStats(config, ctx) {
    const loaded = (config.questionIds || []).length;
    const pat = ctx.pattern || resolveOfficialPattern(ctx.exam, ctx.year, loaded, config);
    const pm = patternMeta(pat, ctx);
    const expected = pm.qs || loaded;
    // Official instructions: use official year total (not bank noise)
    const catalogN = config.catalogTotalQs || config.expectedQs || 0;
    const isPyq = (config.testType === "pyqmock") || (ctx.testType === "pyqmock");
    const n = isPyq ? (expected || catalogN || loaded) : (loaded >= 20 ? loaded : (catalogN || expected));
    let mins = config.catalogDurationMin
      || (config.durationSec ? Math.floor(config.durationSec / 60) : null)
      || pm.mins;
    // NEET 2021+ duration 200 min even for 180-MCQ 2025 pattern
    if (ctx.exam === "neet" && ctx.year && Number(ctx.year) >= 2021) mins = config.catalogDurationMin || mins || 200;
    if (ctx.exam === "neet" && ctx.year && Number(ctx.year) <= 2020) mins = config.catalogDurationMin || 180;
    let totalMarks = config.totalMarks != null ? config.totalMarks : pm.marks;
    if (!totalMarks) {
      if (ctx.exam === "jee_advanced" || /^adv_/.test(String(pat || ""))) {
        const off = (typeof jeeAdvOfficialForYear === "function")
          ? jeeAdvOfficialForYear(ctx.year)
          : null;
        totalMarks = (off && off.paperMarksHint) || Math.max(n * 3, 180);
      } else if (ctx.exam === "neet") totalMarks = 720;
      else totalMarks = (pat === "aieee_90" || pat === "main_90_mcq") ? 360 : 300;
    }
    if (ctx.exam === "jee_advanced" || /^adv_/.test(String(pat || ""))) {
      const off = (typeof jeeAdvOfficialForYear === "function")
        ? jeeAdvOfficialForYear(ctx.year)
        : null;
      if (off && off.durationMin) mins = config.catalogDurationMin || off.durationMin;
    }
    return { n, mins, totalMarks, loaded, expected, pat, patternLabel: pm.label };
  }

  /** Official marking scheme ONLY for this paper's year pattern (Marks / NTA) */
  function markingBlock(ctx) {
    const y = ctx.year || "—";
    const pat = ctx.pattern || resolveOfficialPattern(ctx.exam, ctx.year, 0, { meta: ctx });
    const title = examTitle(ctx);
    // Non–JEE-Main / non–NEET exams: simple Marks-style scheme
    if (ctx.exam && !/jee_main|neet|jee_advanced/i.test(ctx.exam) && pat !== "jee_advanced"
      && pat !== "neet_180_mcq" && pat !== "neet_200_ab"
      && !/^main_|^aieee_/.test(pat)) {
      const pm = patternMeta(pat, ctx);
      return `<div class="allen-instr-block">
        <h3>Official Marking Scheme — ${esc(title)} ${y}</h3>
        <p>As per <strong>${esc(title)}</strong> full paper (Quantrex PYQ mock).</p>
        <p>Typical scoring for this exam; details may vary by year.</p>
        <p class="allen-instr-note"><strong>${y || "Paper"}:</strong> ~${pm.qs || "—"} questions · ${pm.marks || "—"} marks · ${pm.mins || "—"} min.</p>
      </div>`;
    }
    if (ctx.exam === "jee_advanced" || pat === "jee_advanced" || /^adv_/.test(String(pat || ""))) {
      const off = (typeof jeeAdvOfficialForYear === "function")
        ? jeeAdvOfficialForYear(y === "—" ? null : y)
        : null;
      const secs = (off && off.sections) || [
        { name: "Single Correct Option", correct: "+3", wrong: "−1", unattempted: "0" },
        { name: "One or More Correct Options", correct: "+4 (partial)", wrong: "−2", unattempted: "0" },
        { name: "Numerical Value Answer", correct: "+4", wrong: "0", unattempted: "0" },
        { name: "Match List", correct: "+3", wrong: "−1", unattempted: "0" }
      ];
      const rows = secs.map((s, i) =>
        `<tr><td>Section ${i + 1}</td><td>${esc(s.name)}</td><td>${esc(s.correct)}</td><td>${esc(s.wrong)}</td><td>${esc(s.unattempted)}</td></tr>`
      ).join("");
      const paperBit = ctx.source && /paper\s*[12]/i.test(ctx.source)
        ? (String(ctx.source).match(/paper\s*([12])/i) || [])[1]
        : "";
      return `<div class="allen-instr-block">
        <h3>Official Marking Scheme — JEE (Advanced) ${y}${paperBit ? " · Paper " + paperBit : ""}</h3>
        <p>Exam name: <strong>JEE (Advanced)</strong> only (not JEE Main). Source: <strong>jeeadv.ac.in</strong> archive.</p>
        <table class="allen-instr-table">
          <thead><tr><th>Section</th><th>Type</th><th>Correct</th><th>Incorrect</th><th>Unattempted</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="allen-instr-note">${esc((off && off.note) || "Paper 1 & Paper 2 · Physics · Chemistry · Mathematics · 3 hours each.")} Partial marks may apply for multi-correct as per official key.</p>
      </div>`;
    }
    if (ctx.exam === "neet" || pat === "neet_200_ab" || pat === "neet_180_mcq") {
      if (pat === "neet_200_ab") {
        return `<div class="allen-instr-block">
          <h3>Official Marking Scheme — NEET (UG) ${y}</h3>
          <table class="allen-instr-table">
            <thead><tr><th>Section</th><th>Type</th><th>Correct</th><th>Incorrect</th><th>Unattempted</th></tr></thead>
            <tbody>
              <tr><td>Section A</td><td>MCQ (Single Correct)</td><td>+4</td><td>−1</td><td>0</td></tr>
              <tr><td>Section B</td><td>Numerical (attempt any 10 of 15)</td><td>+4</td><td>0</td><td>0</td></tr>
            </tbody>
          </table>
          <p class="allen-instr-note"><strong>Official ${y} pattern:</strong> 200 questions · attempt 180 · 720 marks · 3 hours 20 minutes.</p>
        </div>`;
      }
      const dur = (Number(ctx.year) >= 2021) ? "3 hours 20 minutes" : "3 hours";
      return `<div class="allen-instr-block">
        <h3>Official Marking Scheme — NEET (UG) ${y}</h3>
        <p>All questions are <strong>Multiple Choice (Single Correct)</strong> — 4 options.</p>
        <p>Correct: <strong>+4</strong> · Incorrect: <strong>−1</strong> · Unattempted: <strong>0</strong>.</p>
        <p class="allen-instr-note"><strong>Official ${y} pattern:</strong> 180 questions · 720 marks · ${dur}. Physics 45 · Chemistry 45 · Botany 45 · Zoology 45.</p>
      </div>`;
    }
    // JEE Main — exact year pattern only
    if (pat === "aieee_90" || pat === "main_90_mcq") {
      return `<div class="allen-instr-block">
        <h3>Official Marking Scheme — ${examTitle(ctx)} ${y}</h3>
        <p>All questions are <strong>Multiple Choice (Single Correct)</strong> — 4 options (A/B/C/D).</p>
        <p>Correct: <strong>+4</strong> · Incorrect: <strong>−1</strong> · Unattempted: <strong>0</strong>.</p>
        <p class="allen-instr-note"><strong>Official ${y} pattern:</strong> 90 questions (30 Mathematics + 30 Physics + 30 Chemistry) · 360 marks · 3 hours.</p>
      </div>`;
    }
    if (pat === "main_75_mcq") {
      return `<div class="allen-instr-block">
        <h3>Official Marking Scheme — JEE (Main) ${y}</h3>
        <p>All questions are <strong>Multiple Choice (Single Correct)</strong>.</p>
        <p>Correct: <strong>+4</strong> · Incorrect: <strong>−1</strong> · Unattempted: <strong>0</strong>.</p>
        <p class="allen-instr-note"><strong>Official ${y} pattern:</strong> 75 questions (25 Mathematics + 25 Physics + 25 Chemistry) · 300 marks · 3 hours.</p>
      </div>`;
    }
    if (pat === "main_90_num") {
      return `<div class="allen-instr-block">
        <h3>Official Marking Scheme — JEE (Main) ${y}</h3>
        <table class="allen-instr-table">
          <thead><tr><th>Section</th><th>Questions</th><th>Correct</th><th>Incorrect</th><th>Unattempted</th></tr></thead>
          <tbody>
            <tr><td>Section A — Single Correct (MCQ)</td><td>20 per subject</td><td>+4</td><td>−1</td><td>0</td></tr>
            <tr><td>Section B — Numerical Value</td><td>10 per subject (attempt any 5)</td><td>+4</td><td>0</td><td>0</td></tr>
          </tbody>
        </table>
        <p class="allen-instr-note"><strong>Official ${y} pattern:</strong> 90 questions · attempt 75 · 300 marks · 3 hours. Only first 5 numerical attempts per subject are evaluated.</p>
      </div>`;
    }
    // main_75_num — 2025 / 2026
    return `<div class="allen-instr-block">
      <h3>Official Marking Scheme — JEE (Main) ${y}</h3>
      <table class="allen-instr-table">
        <thead><tr><th>Section</th><th>Questions</th><th>Correct</th><th>Incorrect</th><th>Unattempted</th></tr></thead>
        <tbody>
          <tr><td>Section A — Single Correct (MCQ)</td><td>20 per subject</td><td>+4</td><td>−1</td><td>0</td></tr>
          <tr><td>Section B — Numerical Value</td><td>5 per subject (all compulsory)</td><td>+4</td><td>0</td><td>0</td></tr>
        </tbody>
      </table>
      <p class="allen-instr-note"><strong>Official ${y} pattern:</strong> 75 questions (20 MCQ + 5 Numerical × 3 subjects) · 300 marks · 3 hours. All questions compulsory.</p>
    </div>`;
  }

  /**
   * ONLY official paper pattern table for this year (no "this shift" / second instructions).
   */
  function paperStructureBlock(ctx, config) {
    const y = ctx.year || "—";
    const pat = ctx.pattern || resolveOfficialPattern(ctx.exam, ctx.year, (config.questionIds || []).length, config);

    if (ctx.exam === "neet" || pat === "neet_200_ab" || pat === "neet_180_mcq") {
      if (pat === "neet_200_ab") {
        return `<div class="allen-instr-block"><h3>Official Paper Pattern — NEET (UG) ${y}</h3>
          <table class="allen-instr-table"><thead><tr><th>Subject</th><th>Section A (MCQ)</th><th>Section B (Numerical)</th></tr></thead><tbody>
            <tr><td>Physics</td><td>35</td><td>15 (attempt any 10)</td></tr>
            <tr><td>Chemistry</td><td>35</td><td>15 (attempt any 10)</td></tr>
            <tr><td>Botany</td><td>35</td><td>15 (attempt any 10)</td></tr>
            <tr><td>Zoology</td><td>35</td><td>15 (attempt any 10)</td></tr>
          </tbody></table>
          <p class="allen-instr-note">200 questions · attempt 180 · 720 marks · 3h 20m.</p></div>`;
      }
      const dur = (Number(ctx.year) >= 2021) ? "3h 20m" : "3h";
      return `<div class="allen-instr-block"><h3>Official Paper Pattern — NEET (UG) ${y}</h3>
        <table class="allen-instr-table"><thead><tr><th>Subject</th><th>MCQ</th></tr></thead><tbody>
          <tr><td>Physics</td><td>45</td></tr>
          <tr><td>Chemistry</td><td>45</td></tr>
          <tr><td>Botany</td><td>45</td></tr>
          <tr><td>Zoology</td><td>45</td></tr>
        </tbody></table>
        <p class="allen-instr-note">180 MCQ · 720 marks · ${dur}.</p></div>`;
    }
    if (ctx.exam === "jee_main" || !ctx.exam) {
      if (pat === "aieee_90" || pat === "main_90_mcq") {
        return `<div class="allen-instr-block"><h3>Official Paper Pattern — ${examTitle(ctx)} ${y}</h3>
          <table class="allen-instr-table"><thead><tr><th>Subject</th><th>MCQ</th></tr></thead><tbody>
            <tr><td>Mathematics</td><td>30</td></tr>
            <tr><td>Physics</td><td>30</td></tr>
            <tr><td>Chemistry</td><td>30</td></tr>
          </tbody></table>
          <p class="allen-instr-note">90 MCQ · 360 marks · 3 hours.</p></div>`;
      }
      if (pat === "main_75_mcq") {
        return `<div class="allen-instr-block"><h3>Official Paper Pattern — JEE (Main) ${y}</h3>
          <table class="allen-instr-table"><thead><tr><th>Subject</th><th>MCQ</th></tr></thead><tbody>
            <tr><td>Mathematics</td><td>25</td></tr>
            <tr><td>Physics</td><td>25</td></tr>
            <tr><td>Chemistry</td><td>25</td></tr>
          </tbody></table>
          <p class="allen-instr-note">75 MCQ · 300 marks · 3 hours.</p></div>`;
      }
      if (pat === "main_90_num") {
        return `<div class="allen-instr-block"><h3>Official Paper Pattern — JEE (Main) ${y}</h3>
          <table class="allen-instr-table"><thead><tr><th>Section</th><th>Questions</th></tr></thead><tbody>
            <tr><td>Mathematics — Single Correct</td><td>20</td></tr>
            <tr><td>Mathematics — Numerical</td><td>10 (attempt any 5)</td></tr>
            <tr><td>Physics — Single Correct</td><td>20</td></tr>
            <tr><td>Physics — Numerical</td><td>10 (attempt any 5)</td></tr>
            <tr><td>Chemistry — Single Correct</td><td>20</td></tr>
            <tr><td>Chemistry — Numerical</td><td>10 (attempt any 5)</td></tr>
          </tbody></table>
          <p class="allen-instr-note">90 questions · attempt 75 · 300 marks · 3 hours.</p></div>`;
      }
      // main_75_num 2025–2026
      return `<div class="allen-instr-block"><h3>Official Paper Pattern — JEE (Main) ${y}</h3>
        <table class="allen-instr-table"><thead><tr><th>Section</th><th>Questions</th></tr></thead><tbody>
          <tr><td>Mathematics — Single Correct</td><td>20</td></tr>
          <tr><td>Mathematics — Numerical</td><td>5 (all compulsory)</td></tr>
          <tr><td>Physics — Single Correct</td><td>20</td></tr>
          <tr><td>Physics — Numerical</td><td>5 (all compulsory)</td></tr>
          <tr><td>Chemistry — Single Correct</td><td>20</td></tr>
          <tr><td>Chemistry — Numerical</td><td>5 (all compulsory)</td></tr>
        </tbody></table>
        <p class="allen-instr-note">75 questions · 300 marks · 3 hours · all compulsory.</p></div>`;
    }
    // JEE Advanced — year pattern + subjects (only when exam is Advanced)
    if (ctx.exam === "jee_advanced" || /^adv_/.test(String(pat || ""))) {
      const off = (typeof jeeAdvOfficialForYear === "function")
        ? jeeAdvOfficialForYear(y === "—" ? null : y)
        : null;
      const secs = (off && off.sections) || [];
      const paperBit = ctx.source && /paper\s*[12]/i.test(String(ctx.source))
        ? (String(ctx.source).match(/paper\s*([12])/i) || [])[1]
        : "";
      const typeRows = secs.map((s, i) =>
        `<tr><td>Section ${i + 1}</td><td>${esc(s.name)}</td><td>${esc(s.correct)} / ${esc(s.wrong)}</td></tr>`
      ).join("") || `<tr><td colspan="3">Single Correct · One or More Correct · Numerical · Match List</td></tr>`;
      const nQs = (config && (config.catalogTotalQs || (config.questionIds || []).length)) || "—";
      return `<div class="allen-instr-block">
        <h3>Official Paper Pattern — JEE (Advanced) ${y}${paperBit ? " Paper " + paperBit : ""}</h3>
        <p><strong>Exam:</strong> JEE (Advanced) · <strong>Not</strong> JEE Main</p>
        <table class="allen-instr-table">
          <thead><tr><th>Subject order</th><th colspan="2">Physics → Chemistry → Mathematics</th></tr></thead>
          <tbody>
            <tr><td>Duration</td><td colspan="2">${(off && off.durationMin) || 180} minutes</td></tr>
            <tr><td>This paper</td><td colspan="2">${nQs} questions (as in official PYQ set)</td></tr>
          </tbody>
        </table>
        <table class="allen-instr-table" style="margin-top:10px">
          <thead><tr><th>Section</th><th>Question type</th><th>Marking</th></tr></thead>
          <tbody>${typeRows}</tbody>
        </table>
        <p class="allen-instr-note">Inside the test, each subject is split into the same section types present in this paper — matching official instructions. Full papers: <a href="https://jeeadv.ac.in/archive.html" target="_blank" rel="noopener">jeeadv.ac.in/archive</a></p>
      </div>`;
    }
    return `<div class="allen-instr-block"><h3>Official Paper Pattern</h3>
      <p>Full paper as per selected exam.</p></div>`;
  }

  /** Minimal NTA rules only — pattern-specific, no extra fluff */
  function generalRules(ctx, stats) {
    const mins = stats.mins;
    const pat = ctx.pattern || stats.pat;
    if (ctx.exam === "jee_advanced" || /^adv_/.test(String(pat || ""))) {
      return [
        `This is <strong>JEE (Advanced)</strong> only — not JEE Main.`,
        `Total duration is <strong>${mins} minutes</strong> per paper (Paper 1 / Paper 2).`,
        `Subjects appear in order: <strong>Physics → Chemistry → Mathematics</strong>, each with official section types (Single Correct, One or More Correct, Match List, Numerical) as in that year.`,
        `Marking depends on section type (see table above). Multi-correct may award partial marks.`,
        `Numerical answers are integers (or as specified). You may change answers before final submit.`,
        `Official papers: <strong>jeeadv.ac.in/archive.html</strong>.`
      ].map((r) => `<li>${r}</li>`).join("");
    }
    const rules = [
      `Total duration of the examination is <strong>${mins} minutes</strong>.`,
      `Each question has four options, out of which only one is correct (MCQ). Numerical questions require an integer answer.`,
      `You can change your answer any number of times before final submission.`
    ];
    if (pat === "main_90_num") {
      rules.push(`Section B has <strong>10 numerical</strong> questions per subject — attempt only <strong>any 5</strong>. No negative marking on numerical.`);
    } else if (pat === "main_75_num") {
      rules.push(`Section B has <strong>5 numerical</strong> questions per subject — <strong>all compulsory</strong>. No negative marking on numerical.`);
    } else if (pat === "neet_200_ab") {
      rules.push(`Section B: attempt only <strong>any 10 of 15</strong> per subject.`);
    }
    return rules.map((r) => `<li>${r}</li>`).join("");
  }

  function legendBlock() {
    return `<div class="allen-instr-block">
      <h3>Question Palette</h3>
      <div class="allen-instr-legend">
        <span><i class="mtk-dot answered"></i> Answered</span>
        <span><i class="mtk-dot not-answered"></i> Not Answered</span>
        <span><i class="mtk-dot unvisited"></i> Not Visited</span>
        <span><i class="mtk-dot rev-ans"></i> Marked for Review</span>
      </div>
    </div>`;
  }

  /**
   * Instructions screen = OFFICIAL only (no second/extra instruction blocks).
   * Stats use official year totals (not bank-only noise).
   */
  function instructionHtml(config) {
    const ctx = detectContext(config);
    const stats = paperStats(config, ctx);
    const title = esc(config.title || examTitle(ctx));
    const examLbl = examTitle(ctx);
    const yearTag = ctx.year ? ` ${ctx.year}` : "";
    // Official totals for this year pattern
    const offQs = stats.expected || stats.n;
    const offMarks = stats.totalMarks;
    const offMins = stats.mins;

    return `<div id="marksInstrOverlay" class="allen-instr-fullpage" role="dialog" aria-modal="true">
      <header class="allen-instr-top">
        <div class="allen-instr-brand">${LOGO_SVG}<div>
          <strong>${BRAND_NAME}</strong>
          <small>${examLbl}${yearTag} — Official Paper Instructions</small>
        </div></div>
        <button type="button" class="allen-instr-exit" id="allenInstrExitBtn">✕ Exit</button>
      </header>
      <div class="allen-instr-scroll">
        <div class="allen-instr-inner">
          <div class="allen-instr-banner">
            <h1 class="allen-instr-title">${title}</h1>
            <p class="allen-instr-desc">${examLbl}${yearTag} · ${ctx.exam === "jee_advanced" ? "Official JEE Advanced (jeeadv.ac.in)" : "Official exam pattern only"}</p>
          </div>
          <div class="allen-instr-stats">
            <div><span>Total Questions</span><strong>${offQs}</strong></div>
            <div><span>Duration</span><strong>${offMins} min</strong></div>
            <div><span>Max Marks</span><strong>${offMarks}</strong></div>
          </div>
          ${markingBlock(ctx)}
          ${paperStructureBlock(ctx, config)}
          <div class="allen-instr-block">
            <h3>Instructions</h3>
            <ol class="allen-instr-list">${generalRules(ctx, stats)}</ol>
          </div>
          ${legendBlock()}
          <label class="allen-instr-check"><input type="checkbox" id="qzInstrAgree"/> I have read and understood the official instructions.</label>
        </div>
      </div>
      <footer class="allen-instr-foot">
        <button type="button" class="allen-instr-cancel" id="allenInstrBackBtn">Go Back</button>
        <button type="button" class="allen-instr-proceed" id="qzInstrProceed" disabled>Proceed to Test →</button>
      </footer>
    </div>`;
  }

  function practicePalette(ctx) {
    if (!ctx || !ctx.ids.length) return "";
    const cells = ctx.ids.map((id, i) => {
      const done = !!ctx.done[id];
      const cur = i === ctx.idx ? " cur" : "";
      const st = done ? "answered" : (i === ctx.idx ? "not-answered" : "unvisited");
      return `<button type="button" class="mtk-pal-cell ${st}${cur}" data-prac-idx="${i}">${i + 1}</button>`;
    }).join("");
    const doneCount = ctx.ids.filter(id => ctx.done[id]).length;
    return `<aside class="mtk-palette">
      <div class="mtk-pal-head-row"><strong>Overview</strong></div>
      <div class="mtk-pal-legend">
        <span><i class="mtk-dot answered"></i> Attempted</span>
        <span><i class="mtk-dot unvisited"></i> Not Visited</span>
      </div>
      <div class="mtk-pal-stats">
        <div class="mtk-stat"><i class="mtk-dot answered"></i><span>${doneCount} Attempted</span></div>
        <div class="mtk-stat"><i class="mtk-dot unvisited"></i><span>${ctx.ids.length - doneCount} Remaining</span></div>
      </div>
      <div class="mtk-pal-groups"><div class="mtk-pal-grp-grid flat">${cells}</div></div>
    </aside>`;
  }

  function practiceColorStrip() {
    return `<div class="mtk-color-strip" aria-hidden="true">
      <span class="mtk-strip-seg mtk-strip-math"></span>
      <span class="mtk-strip-seg mtk-strip-phys"></span>
      <span class="mtk-strip-seg mtk-strip-chem"></span>
      <span class="mtk-strip-seg mtk-strip-acc"></span>
    </div>`;
  }

  function practiceHtml(q, ctx, parts) {
    try {
      if (typeof ExamgoalTestUI !== "undefined" && ExamgoalTestUI.ensureCss) ExamgoalTestUI.ensureCss();
    } catch (_) { /* */ }
    const pc = ctx || { ids: [], idx: 0, done: {}, selected: {} };
    const pos = pc.idx + 1;
    const total = pc.ids.length;
    const done = !!pc.done[q.id];
    const sel = pc.selected[q.id];
    const subj = (q.subject || "").toLowerCase();
    let secCls = "";
    if (subj.includes("math")) secCls = "mtk-sec-math";
    else if (subj.includes("phys")) secCls = "mtk-sec-phys";
    else if (subj.includes("chem")) secCls = "mtk-sec-chem";

    // Sync practice shell with app theme (dark app → dark practice; light → light)
    const appTheme = (typeof document !== "undefined"
      && document.documentElement.getAttribute("data-theme") === "dark")
      ? "dark" : "light";

    // Same default + saved scale as Test Series (medium unless user changed A−/A+)
    const fontScale = (typeof getTestFontScale === "function" ? getTestFontScale() : "medium");
    const bmOn = typeof QuantrexBookmarks !== "undefined" && QuantrexBookmarks.isBookmarked(q.id);
    const qidAttr = typeof q.id === "number" ? q.id : `'${String(q.id).replace(/'/g, "\\'")}'`;
    const BM_SVG = `<svg class="qx-bm-svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 3.5h12a1.5 1.5 0 0 1 1.5 1.5v15.2a.9.9 0 0 1-1.4.75L12 16.6l-6.1 4.35A.9.9 0 0 1 4.5 20.2V5A1.5 1.5 0 0 1 6 3.5z" fill="currentColor"/></svg>`;
    const FOLDER_SVG = `<svg class="qx-bm-svg" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h3.1l1.4 1.6h8.5a2 2 0 0 1 2 2v8.4a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-10z" fill="currentColor"/></svg>`;

    const bookCls = (q && (q._book || q._bookId)) ? " qx-book-q" : "";
    const sizeOn = (s) => (fontScale === s ? " on" : "");
    const zoomPct = (typeof getTestZoom === "function"
      ? Math.round(getTestZoom() * 100)
      : 100) + "%";
    const themeLbl = appTheme === "dark" ? "Light" : "Dark";
    return `<div class="mtk-test-root allen-cbt allen-practice qx-font-host${bookCls}" data-test-theme="${appTheme}" data-font-scale="${fontScale}">
      <header class="mtk-header">
        <div class="mtk-header-left">
          <button type="button" class="mtk-close-btn" id="qxPracBackBtn" title="Back" aria-label="Back">&larr;</button>
          <div class="mtk-brand allen-brand">${LOGO_SVG}<span class="mtk-brand-text">${BRAND_NAME} · Practice</span></div>
        </div>
        <div class="mtk-prac-progress">Q${pos} / ${total}</div>
        <div class="mtk-header-tools qx-prac-tools eg-top-tools">
          <button type="button" class="eg-ico star ${bmOn ? "on" : ""}" onclick="typeof toggleBm==='function'&&toggleBm(${qidAttr})" title="${bmOn ? "Remove bookmark" : "Bookmark question"}" aria-label="Bookmark" aria-pressed="${bmOn ? "true" : "false"}">${bmOn
            ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 18.77 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 18.77 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'}</button>
          <button type="button" class="eg-ico" onclick="typeof toggleBmWithGroup==='function'&&toggleBmWithGroup(${qidAttr})" title="Save to notebook group" aria-label="Save to group"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>
          <button type="button" class="eg-ico warn" onclick="typeof openQuestionReport==='function'&&openQuestionReport(${qidAttr})" title="Report Question" aria-label="Report">!</button>
          <button type="button" class="eg-ico mtk-theme-btn qx-prac-theme-btn${appTheme === "light" ? " eg-moon" : ""}" id="pracThemeToggle" title="Toggle light / dark mode" aria-label="Toggle theme">${appTheme === "dark"
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'}</button>
          <div class="qx-prac-view-wrap">
            <button type="button" class="eg-ico qx-prac-view-btn" id="pracViewMenuBtn" title="Text size and zoom" aria-expanded="false" aria-controls="pracViewPanel" aria-label="Text size">Aa</button>
            <div class="qx-prac-view-panel" id="pracViewPanel" hidden>
              <div class="qx-prac-view-sec">
                <div class="qx-prac-view-label">Text size</div>
                <div class="qx-prac-size-row">
                  <button type="button" class="qx-prac-size-btn${sizeOn("small")}" data-scale="small">Standard</button>
                  <button type="button" class="qx-prac-size-btn${sizeOn("medium")}" data-scale="medium">Medium</button>
                  <button type="button" class="qx-prac-size-btn${sizeOn("large")}" data-scale="large">Large</button>
                  <button type="button" class="qx-prac-size-btn${sizeOn("xlarge")}" data-scale="xlarge">Extra Large</button>
                </div>
              </div>
              <div class="qx-prac-view-sec">
                <div class="qx-prac-view-label">Zoom (unlimited)</div>
                <div class="qx-prac-zoom-row">
                  <button type="button" class="mtk-font-btn" id="pracZoomOut" title="Zoom out">−</button>
                  <span class="qx-zoom-lbl" id="pracZoomLbl">${zoomPct}</span>
                  <button type="button" class="mtk-font-btn" id="pracZoomIn" title="Zoom in">+</button>
                  <button type="button" class="qx-prac-zoom-reset" id="pracZoomReset" title="Reset zoom">100%</button>
                </div>
                <p class="qx-prac-view-hint">Zoom 50%–300% · Text size is separate</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      ${practiceColorStrip()}
      <div class="mtk-sec-bar">
        <div class="mtk-sec-tabs"><button type="button" class="mtk-sec-tab ${secCls} active">${esc(
          (typeof QuantrexStrip !== "undefined" && QuantrexStrip.humanSubject
            ? QuantrexStrip.humanSubject(q)
            : "") || (!/^[a-f0-9]{24}$/i.test(String(q.subject || "")) ? (q.subject || "Question") : "Question")
        )}</button></div>
      </div>
      <div class="mtk-body">
        <div class="mtk-main">
          <div class="mtk-q-head">
            <span class="mtk-q-num">Q${pos}</span>
            ${parts.typeBadge || ""}
            ${(() => {
              const ch = (typeof QuantrexStrip !== "undefined" && QuantrexStrip.humanChapter)
                ? QuantrexStrip.humanChapter(q)
                : (!/^[a-f0-9]{24}$/i.test(String(q.chapter || "")) ? (q.chapter || "") : "");
              return ch ? `<span class="allen-prac-chapter">${esc(ch)}</span>` : "";
            })()}
            <button type="button" class="qx-bm-icon-only ${bmOn ? "on" : ""}" onclick="typeof toggleBm==='function'&&toggleBm(${qidAttr})" title="${bmOn ? "Remove bookmark" : "Bookmark"}" aria-label="Bookmark">${BM_SVG}</button>
          </div>
          ${parts.paperMeta || (typeof QuantrexStrip !== "undefined" && QuantrexStrip.paperMetaHtml ? QuantrexStrip.paperMetaHtml(q, { includeChapter: false, includeSubject: false }) : "")}
          ${parts.diagramSlot || ""}
          ${(parts.qBody || "").includes("qx-question-body")
            ? (parts.qBody || "")
            : `<div class="mtk-q-text qx-content qx-q-text-only" data-qx-qid="${q.id}">${parts.qBody || ""}</div>`}
          <div class="${parts.optsClass || "mtk-options mtk-options-grid"}" id="qaOpts">${parts.opts || ""}</div>
          <div class="eg-action-row">
            <div class="eg-check-wrap">${done || parts.incomplete ? "" : `<button type="button" class="eg-check" id="qxPracSubmit" ${parts.canSubmit ? "" : "disabled"}>Check Answer</button>`}</div>
            <button type="button" class="eg-note" id="qxPracNote">Add a Note</button>
          </div>
          <div id="qaSolReveal">${parts.solReveal || ""}</div>
          <div id="qaResult">${parts.resultHtml || ""}</div>
          <div class="eg-foot mtk-controls">
            <div class="eg-foot-left">
              <label class="eg-show"><span class="eg-switch"><input type="checkbox" id="qxPracShowAns"${pc.showAnswer ? " checked" : ""}><span class="eg-switch-knob" aria-hidden="true"></span></span> Show Answer</label>
            </div>
            <div class="eg-foot-right">
              <button type="button" class="eg-btn" id="qxPracClear">Clear Response</button>
              <button type="button" class="eg-btn" id="qxPracPrev" ${pc.idx <= 0 ? "disabled" : ""}>← Previous</button>
              <button type="button" class="eg-btn eg-btn-next" id="qxPracNext" ${pc.idx >= total - 1 ? "disabled" : ""}>Next →</button>
            </div>
          </div>
          <div id="qaCommunity">${parts.community || ""}</div>
        </div>
        ${practicePalette(pc)}
      </div>
    </div>`;
  }

  function syncPracticeTheme(root, mode) {
    const m = mode === "dark" ? "dark" : "light";
    const shell = root && (root.classList && root.classList.contains("mtk-test-root")
      ? root
      : root && root.querySelector && root.querySelector(".mtk-test-root"));
    if (shell) shell.setAttribute("data-test-theme", m);
    document.querySelectorAll(".mtk-test-root.allen-practice, .mtk-test-root.allen-cbt").forEach(el => {
      el.setAttribute("data-test-theme", m);
    });
  }

  function bindPractice(root, callbacks) {
    if (!root) return;
    const cbs = callbacks || {};
    // Match app theme on bind (in case HTML was cached light)
    const appTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    syncPracticeTheme(root, appTheme);
    // Marks-style figures only (no zoom button); digital books untouched
    try {
      if (window.QxFigureViewer && typeof window.QxFigureViewer.bind === "function") {
        window.QxFigureViewer.bind(root);
      }
      // Kill any leftover zoom chrome
      root.querySelectorAll(".qx-fig-zoom-btn, button.qx-fig-zoom-btn").forEach((el) => el.remove());
      window.dispatchEvent(new CustomEvent("qx:question-rendered", { detail: { root } }));
      try {
        if (typeof Mx !== "undefined") {
          if (Mx.afterRenderLight) Mx.afterRenderLight(root);
          else if (Mx.afterRender) Mx.afterRender(root);
        }
      } catch (_) { /* */ }
    } catch (_) { /* */ }

    const backBtn = root.querySelector("#qxPracBackBtn");
    if (backBtn) {
      backBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (cbs.onBack) cbs.onBack();
        else if (typeof qxPracticeBack === "function") qxPracticeBack();
        else if (typeof history !== "undefined" && history.length > 1) history.back();
      });
    }
    root.querySelector("#qxPracPrev")?.addEventListener("click", () => cbs.onNav && cbs.onNav(-1));
    root.querySelector("#qxPracNext")?.addEventListener("click", () => cbs.onNav && cbs.onNav(1));
    root.querySelectorAll("[data-prac-idx]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.pracIdx, 10);
        if (cbs.onJump) cbs.onJump(idx);
      });
    });
    if (typeof syncQuestionFontScale === "function") {
      syncQuestionFontScale(root.querySelector(".mtk-test-root") || root);
    } else if (typeof applyTestZoomToDom === "function" && typeof getTestZoom === "function") {
      applyTestZoomToDom(getTestZoom());
    }

    // View panel: text size presets + continuous zoom
    const viewBtn = root.querySelector("#pracViewMenuBtn");
    const viewPanel = root.querySelector("#pracViewPanel");
    if (viewBtn && viewPanel) {
      viewBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = viewPanel.hasAttribute("hidden");
        if (open) viewPanel.removeAttribute("hidden");
        else viewPanel.setAttribute("hidden", "");
        viewBtn.setAttribute("aria-expanded", open ? "true" : "false");
      });
      document.addEventListener("click", function pracViewOutside(ev) {
        if (!root.contains(ev.target)) return;
        if (viewPanel.hasAttribute("hidden")) return;
        if (viewBtn.contains(ev.target) || viewPanel.contains(ev.target)) return;
        viewPanel.setAttribute("hidden", "");
        viewBtn.setAttribute("aria-expanded", "false");
      });
    }
    root.querySelectorAll(".qx-prac-size-btn[data-scale]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sc = btn.getAttribute("data-scale");
        if (typeof setTestFontScale === "function") setTestFontScale(sc);
        else if (typeof applyTestFontScaleToDom === "function") applyTestFontScaleToDom(sc);
        root.querySelectorAll(".qx-prac-size-btn").forEach((b) => {
          b.classList.toggle("on", b.getAttribute("data-scale") === sc);
        });
      });
    });
    root.querySelector("#pracZoomOut")?.addEventListener("click", () => {
      if (typeof bumpTestZoom === "function") bumpTestZoom(-1);
    });
    root.querySelector("#pracZoomIn")?.addEventListener("click", () => {
      if (typeof bumpTestZoom === "function") bumpTestZoom(1);
    });
    root.querySelector("#pracZoomReset")?.addEventListener("click", () => {
      if (typeof setTestZoom === "function") setTestZoom(1);
    });

    root.querySelector("#pracThemeToggle")?.addEventListener("click", () => {
      let next;
      if (typeof QuantrexTheme !== "undefined" && QuantrexTheme.toggle) {
        QuantrexTheme.toggle();
        next = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      } else {
        next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try { localStorage.setItem("quantrex_theme", next); } catch (_) { /* */ }
      }
      syncPracticeTheme(root, next);
      const tbtn = root.querySelector("#pracThemeToggle");
      // Button shows the mode you can switch TO
      if (tbtn) {
        tbtn.classList.toggle("eg-moon", next === "light");
        tbtn.innerHTML = next === "dark"
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      }
    });
  }

  return {
    instructionHtml,
    detectContext,
    practiceHtml,
    bindPractice,
    syncPracticeTheme,
    examTitle,
    jeeMainPattern,
    neetPattern,
    resolveOfficialPattern,
    patternMeta,
    paperStats,
    markingBlock
  };
})();

window.AllenTestUI = AllenTestUI;

function bindAllenInstructionEvents() {
  const root = document.getElementById("marksInstrOverlay");
  if (!root) return;
  const cancel = () => {
    if (typeof window.marksCancelInstructions === "function") window.marksCancelInstructions();
    else if (typeof marksCancelInstructions === "function") marksCancelInstructions();
  };
  const proceed = () => {
    if (typeof window.marksAcceptInstructions === "function") window.marksAcceptInstructions();
    else if (typeof marksAcceptInstructions === "function") marksAcceptInstructions();
  };
  root.querySelector("#allenInstrExitBtn")?.addEventListener("click", cancel);
  root.querySelector("#allenInstrBackBtn")?.addEventListener("click", cancel);
  root.querySelector("#qzInstrProceed")?.addEventListener("click", proceed);
  const agree = root.querySelector("#qzInstrAgree");
  const proceedBtn = root.querySelector("#qzInstrProceed");
  if (agree && proceedBtn) {
    agree.addEventListener("change", () => { proceedBtn.disabled = !agree.checked; });
  }
}

function showAllenInstructions(config, onDone, onCancel) {
  const existing = document.getElementById("marksInstrOverlay");
  if (existing) existing.remove();
  window._marksInstrDone = onDone;
  window._marksInstrCancel = onCancel;
  document.body.classList.add("marks-instr-active", "allen-cbt-active");
  const tsRoot = document.getElementById("ts-root");
  if (tsRoot) tsRoot.style.display = "";
  try {
    document.body.insertAdjacentHTML("beforeend", AllenTestUI.instructionHtml(config));
    bindAllenInstructionEvents();
  } catch (err) {
    console.error("Allen instructions render failed:", err);
    document.body.classList.remove("marks-instr-active", "allen-cbt-active");
    if (typeof onDone === "function") onDone();
    return;
  }
  window.scrollTo(0, 0);
}
window.showAllenInstructions = showAllenInstructions;