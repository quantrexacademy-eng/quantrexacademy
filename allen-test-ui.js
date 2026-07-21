// Quantrex Academy — NTA-style CBT UI (instructions, marking schemes, practice layout)
const AllenTestUI = (() => {
  const BRAND_NAME = "Quantrex Academy";
  // Full-color brand mark (teal → indigo → violet) — matches site gradient strip
  const LOGO_SVG = `<svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true" class="qx-brand-logo-svg">
    <defs>
      <linearGradient id="qxBrandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0D9488"/>
        <stop offset="45%" stop-color="#6366F1"/>
        <stop offset="100%" stop-color="#A855F7"/>
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="8" fill="url(#qxBrandGrad)"/>
    <text x="16" y="22" text-anchor="middle" fill="#fff" font-family="Kanit,Arial,sans-serif" font-weight="900" font-size="17">Q</text>
  </svg>`;
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
    let year = meta.year || null;
    if (!year && source && typeof qYearFromSource === "function") year = qYearFromSource(source);
    if (!year && cfg.title) {
      const m = String(cfg.title).match(/\b(20\d{2})\b/);
      if (m) year = parseInt(m[1], 10);
    }
    let exam = "jee_main";
    if (/jee_advanced|jee advanced/i.test(slug + source) || cfg.paperFormat === "jee_advanced") exam = "jee_advanced";
    else if (/neet|aiims/i.test(slug)) exam = "neet";
    if (cfg.testType === "testseries") {
      exam = "jee_main";
      if (!year) year = 2027;
    }
    return { exam, year, slug, source, testType: cfg.testType || "custom" };
  }

  function jeeMainPattern(year) {
    const y = Number(year) || 2025;
    if (y <= 2018) return "legacy_75";
    if (y <= 2020) return "mcq_75";
    if (y <= 2024) return "numerical_90";
    return "numerical_75";
  }

  function examTitle(ctx) {
    if (ctx.exam === "jee_advanced") return "JEE (Advanced)";
    if (ctx.exam === "neet") return "NEET (UG)";
    return "JEE (Main)";
  }

  function paperStats(config, ctx) {
    const loaded = (config.questionIds || []).length;
    const catalogN = config.catalogTotalQs || config.expectedQs || 0;
    const n = (catalogN >= 75 && loaded < catalogN * 0.85) ? catalogN : (catalogN || loaded);
    const mins = config.catalogDurationMin
      || (config.durationSec ? Math.floor(config.durationSec / 60) : null)
      || (ctx.exam === "neet" ? 200 : 180);
    let totalMarks = config.totalMarks;
    if (!totalMarks) {
      if (ctx.exam === "jee_advanced") totalMarks = n * 3;
      else if (jeeMainPattern(ctx.year) === "numerical_90") totalMarks = 300;
      else totalMarks = n >= 75 ? 300 : n * 4;
    }
    return { n, mins, totalMarks, loaded };
  }

  function markingBlock(ctx) {
    const y = ctx.year;
    if (ctx.exam === "jee_advanced") {
      return `<div class="allen-instr-block">
        <h3>Marking Scheme — JEE (Advanced)</h3>
        <table class="allen-instr-table">
          <thead><tr><th>Section</th><th>Type</th><th>Correct</th><th>Incorrect</th><th>Unattempted</th></tr></thead>
          <tbody>
            <tr><td>Section 1</td><td>Single Correct Option</td><td>+3</td><td>−1</td><td>0</td></tr>
            <tr><td>Section 2</td><td>One or More Correct / Match</td><td>+4 (partial)</td><td>−2</td><td>0</td></tr>
            <tr><td>Section 3</td><td>Numerical Value</td><td>+4</td><td>0</td><td>0</td></tr>
          </tbody>
        </table>
        <p class="allen-instr-note">Partial marking applies in Section 2 as per official JEE Advanced rules for the session year.</p>
      </div>`;
    }
    if (ctx.exam === "neet") {
      return `<div class="allen-instr-block">
        <h3>Marking Scheme — NEET (UG)</h3>
        <p>Each correct answer: <strong>+4</strong> marks · Each incorrect answer: <strong>−1</strong> mark · Unattempted: <strong>0</strong> marks.</p>
      </div>`;
    }
    const pat = jeeMainPattern(y);
    if (pat === "legacy_75" || pat === "mcq_75") {
      return `<div class="allen-instr-block">
        <h3>Marking Scheme — JEE (Main) ${y || ""}</h3>
        <p>All <strong>75 questions</strong> are Multiple Choice (Single Correct). Each correct answer: <strong>+4</strong> · Each incorrect: <strong>−1</strong> · Unattempted: <strong>0</strong>.</p>
      </div>`;
    }
    if (pat === "numerical_90") {
      return `<div class="allen-instr-block">
        <h3>Marking Scheme — JEE (Main) ${y || ""}</h3>
        <table class="allen-instr-table">
          <thead><tr><th>Section</th><th>Questions</th><th>Correct</th><th>Incorrect</th><th>Unattempted</th></tr></thead>
          <tbody>
            <tr><td>Section A — MCQ (per subject)</td><td>20</td><td>+4</td><td>−1</td><td>0</td></tr>
            <tr><td>Section B — Numerical (per subject)</td><td>10 (attempt any 5)</td><td>+4</td><td>0</td><td>0</td></tr>
          </tbody>
        </table>
        <p class="allen-instr-note">Total <strong>90 questions</strong> · <strong>300 marks</strong> · 3 hours. In Section B, only the first 5 attempted numerical questions per subject are evaluated if more than 5 are answered.</p>
      </div>`;
    }
    return `<div class="allen-instr-block">
      <h3>Marking Scheme — JEE (Main) ${y || "2025+"}</h3>
      <table class="allen-instr-table">
        <thead><tr><th>Section</th><th>Questions</th><th>Correct</th><th>Incorrect</th><th>Unattempted</th></tr></thead>
        <tbody>
          <tr><td>Section A — MCQ (per subject)</td><td>20</td><td>+4</td><td>−1</td><td>0</td></tr>
          <tr><td>Section B — Numerical (per subject)</td><td>10 (attempt any 5)</td><td>+4</td><td>0</td><td>0</td></tr>
        </tbody>
      </table>
      <p class="allen-instr-note">Total <strong>75 questions</strong> · <strong>300 marks</strong> · 3 hours. Section B: attempt any <strong>5 out of 10</strong> numerical questions per subject.</p>
    </div>`;
  }

  function paperStructureBlock(ctx, config) {
    const stats = paperStats(config, ctx);
    const n = stats.n;
    let secRows = "";
    if (typeof organizeExamPaper === "function" && (config.questionIds || []).length >= 10) {
      try {
        const preview = organizeExamPaper(config.questionIds || [], {
          paperFormat: ctx.exam === "jee_advanced" ? "jee_advanced" : (ctx.exam === "neet" ? "neet" : "jee_main"),
          examSlug: ctx.slug,
          shuffle: false
        });
        secRows = (preview && preview.sections || []).map(s =>
          `<tr><td>${esc(s.label || s.shortLabel)}</td><td>${s.count}</td></tr>`
        ).join("");
      } catch (e) {
        console.warn("Allen paper section preview skipped:", e);
      }
    }
    if (secRows && stats.loaded >= n * 0.85) {
      return `<div class="allen-instr-block"><h3>Paper Sections (This Test)</h3>
        <table class="allen-instr-table"><thead><tr><th>Section</th><th>Questions</th></tr></thead><tbody>${secRows}</tbody></table></div>`;
    }
    const pat = jeeMainPattern(ctx.year);
    if (ctx.exam === "jee_main" && pat === "numerical_75" && n >= 75) {
      return `<div class="allen-instr-block"><h3>Paper Structure — This Test</h3>
        <table class="allen-instr-table"><thead><tr><th>Section</th><th>Questions</th></tr></thead><tbody>
          <tr><td>Mathematics — Section A (MCQ)</td><td>20</td></tr>
          <tr><td>Mathematics — Section B (Numerical)</td><td>5</td></tr>
          <tr><td>Physics — Section A (MCQ)</td><td>20</td></tr>
          <tr><td>Physics — Section B (Numerical)</td><td>5</td></tr>
          <tr><td>Chemistry — Section A (MCQ)</td><td>20</td></tr>
          <tr><td>Chemistry — Section B (Numerical)</td><td>5</td></tr>
        </tbody></table>
        <p class="allen-instr-note">Subject order: Mathematics → Physics → Chemistry (as per NTA JEE Main ${ctx.year || "2025+"} pattern).</p></div>`;
    }
    if (ctx.exam === "jee_main" && pat === "numerical_90") {
      return `<div class="allen-instr-block"><h3>Paper Structure</h3>
        <p>90 Questions · Mathematics (30) → Physics (30) → Chemistry (30). Each subject: Section A (20 MCQ) + Section B (10 Numerical, attempt 5).</p></div>`;
    }
    if (ctx.exam === "jee_main" && pat === "numerical_75") {
      return `<div class="allen-instr-block"><h3>Paper Structure</h3>
        <p>75 Questions · Mathematics (25) → Physics (25) → Chemistry (25). Each subject: Section A (20 MCQ) + Section B (10 Numerical, attempt 5).</p></div>`;
    }
    if (ctx.exam === "jee_advanced") {
      return `<div class="allen-instr-block"><h3>Paper Structure</h3>
        <p>Subject order: Chemistry → Mathematics → Physics. Each subject has Section 1 (Single Correct), Section 2 (Multiple Correct / Match), Section 3 (Numerical).</p></div>`;
    }
    return "";
  }

  function generalRules(ctx, stats) {
    const mins = stats.mins;
    const common = [
      `The total duration of the examination is <strong>${mins} minutes</strong>. The countdown timer at the top displays remaining time. When it reaches zero, the test ends automatically.`,
      `The <strong>Question Palette</strong> on the right shows status of each question. Click a number to navigate directly.`,
      `Click <strong>Save &amp; Next</strong> to save your response and move to the next question.`,
      `Click <strong>Mark For Review &amp; Next</strong> to mark a question for review. You may revisit marked questions before final submission.`,
      `Click <strong>Clear Response</strong> to erase the selected answer for the current question.`,
      `You may change your response any number of times before final submission.`,
      `Do not refresh the page or close the browser during the test. Use <strong>Stop</strong> to save progress and resume later.`
    ];
    const pat = jeeMainPattern(ctx.year);
    if (ctx.exam === "jee_main" && (pat === "numerical_90" || pat === "numerical_75")) {
      common.splice(2, 0, `In <strong>Section B (Numerical)</strong>, enter the integer value in the input box. Attempt only <strong>5 numerical questions per subject</strong>; extra attempts may not be evaluated.`);
    }
    if (ctx.exam === "jee_advanced") {
      common.splice(2, 0, `Section 2 may have <strong>multiple correct options</strong>. Partial marking applies. Section 3 numerical answers have <strong>no negative marking</strong>.`);
    }
    return common.map((r, i) => `<li>${r}</li>`).join("");
  }

  function legendBlock() {
    return `<div class="allen-instr-block">
      <h3>Question Palette — Legend</h3>
      <div class="allen-instr-legend">
        <span><i class="mtk-dot answered"></i> Green — Answered</span>
        <span><i class="mtk-dot not-answered"></i> Red — Not Answered</span>
        <span><i class="mtk-dot unvisited"></i> Grey — Not Visited</span>
        <span><i class="mtk-dot rev-ans"></i> Purple — Marked for Review (Answered)</span>
        <span><i class="mtk-dot rev-skip"></i> Violet — Marked for Review (Not Answered)</span>
      </div>
    </div>`;
  }

  function instructionHtml(config) {
    const ctx = detectContext(config);
    const stats = paperStats(config, ctx);
    const title = esc(config.title || examTitle(ctx));
    const subtitle = esc(config.subtitle || `${examTitle(ctx)} · Computer Based Test (CBT)`);
    const examLbl = examTitle(ctx);
    const yearTag = ctx.year ? ` · ${ctx.year}` : "";

    return `<div id="marksInstrOverlay" class="allen-instr-fullpage" role="dialog" aria-modal="true">
      <header class="allen-instr-top">
        <div class="allen-instr-brand">${LOGO_SVG}<div>
          <strong>${BRAND_NAME}</strong>
          <small>${examLbl}${yearTag} — Instructions</small>
        </div></div>
        <button type="button" class="allen-instr-exit" id="allenInstrExitBtn">✕ Exit</button>
      </header>
      <div class="allen-instr-scroll">
        <div class="allen-instr-inner">
          <div class="allen-instr-banner">
            <h1 class="allen-instr-title">${title}</h1>
            <p class="allen-instr-desc">${subtitle}</p>
          </div>
          <div class="allen-instr-stats">
            <div><span>Total Questions</span><strong>${stats.n}</strong></div>
            <div><span>Duration</span><strong>${stats.mins} min</strong></div>
            <div><span>Max Marks</span><strong>${stats.totalMarks}</strong></div>
          </div>
          <p class="allen-instr-lead"><strong>Please read all instructions carefully before proceeding.</strong></p>
          ${markingBlock(ctx)}
          ${paperStructureBlock(ctx, config)}
          <div class="allen-instr-block">
            <h3>General Instructions</h3>
            <ol class="allen-instr-list">${generalRules(ctx, stats)}</ol>
          </div>
          ${legendBlock()}
          <label class="allen-instr-check"><input type="checkbox" id="qzInstrAgree"/> I have read and understood all the instructions.</label>
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

    return `<div class="mtk-test-root allen-cbt allen-practice qx-font-host" data-test-theme="${appTheme}" data-font-scale="${fontScale}">
      <header class="mtk-header">
        <div class="mtk-header-left">
          <button type="button" class="mtk-close-btn" id="qxPracBackBtn" title="Back">✕</button>
          <div class="mtk-brand allen-brand">${LOGO_SVG}<span class="mtk-brand-text">${BRAND_NAME} · Practice</span></div>
        </div>
        <div class="mtk-prac-progress">Q${pos} / ${total}</div>
        <div class="mtk-header-tools">
          <button type="button" class="mtk-font-btn" id="pracThemeToggle" title="Toggle light/dark">◐</button>
          <button type="button" class="mtk-font-btn" id="pracFontDown" title="Decrease text size">A−</button>
          <span class="mtk-font-lbl qx-font-lbl" id="qxFontLbl" title="Text size">${fontScale === "xlarge" ? "XL" : (fontScale.charAt(0).toUpperCase() + fontScale.slice(1))}</span>
          <button type="button" class="mtk-font-btn" id="pracFontUp" title="Increase text size">A+</button>
        </div>
      </header>
      ${practiceColorStrip()}
      <div class="mtk-sec-bar">
        <div class="mtk-sec-tabs"><button type="button" class="mtk-sec-tab ${secCls} active">${esc(q.subject || "Question")}</button></div>
      </div>
      <div class="mtk-body">
        <div class="mtk-main">
          <div class="mtk-q-head">
            <span class="mtk-q-num">Q${pos}</span>
            ${parts.typeBadge || ""}
            <span class="allen-prac-chapter">${esc(q.chapter || "")}</span>
          </div>
          ${parts.paperMeta || (typeof QuantrexStrip !== "undefined" && QuantrexStrip.paperMetaHtml ? QuantrexStrip.paperMetaHtml(q) : "")}
          ${parts.diagramSlot || ""}
          ${(parts.qBody || "").includes("qx-question-body")
            ? (parts.qBody || "")
            : `<div class="mtk-q-text qx-content qx-q-text-only" data-qx-qid="${q.id}">${parts.qBody || ""}</div>`}
          <div class="${parts.optsClass || "mtk-options mtk-options-grid"}" id="qaOpts">${parts.opts || ""}</div>
          ${parts.solActions || ""}
          <div id="qaSolReveal">${parts.solReveal || ""}</div>
          <div id="qaResult">${parts.resultHtml || ""}</div>
          <div class="mtk-controls">
            <button type="button" class="mtk-btn mtk-btn-prev" id="qxPracPrev" ${pc.idx <= 0 ? "disabled" : ""}>← Previous</button>
            ${done || parts.incomplete ? "" : `<button type="button" class="mtk-btn mtk-btn-save" id="qxPracSubmit" ${parts.canSubmit ? "" : "disabled"}>Submit Answer</button>`}
            <button type="button" class="mtk-btn mtk-btn-review" id="qxPracNext" ${pc.idx >= total - 1 ? "disabled" : ""}>Next →</button>
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
    // Figure click-to-open after each practice paint
    try {
      if (window.QxFigureViewer && typeof window.QxFigureViewer.bind === "function") {
        window.QxFigureViewer.bind(root);
      }
      window.dispatchEvent(new CustomEvent("qx:question-rendered", { detail: { root } }));
    } catch (_) { /* */ }

    root.querySelector("#qxPracBackBtn")?.addEventListener("click", () => cbs.onBack && cbs.onBack());
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
    }
    if (typeof bumpTestFont === "function") {
      root.querySelector("#pracFontDown")?.addEventListener("click", () => {
        bumpTestFont(-1);
        if (typeof syncQuestionFontScale === "function") syncQuestionFontScale(root);
      });
      root.querySelector("#pracFontUp")?.addEventListener("click", () => {
        bumpTestFont(1);
        if (typeof syncQuestionFontScale === "function") syncQuestionFontScale(root);
      });
    }
    root.querySelector("#pracThemeToggle")?.addEventListener("click", () => {
      if (typeof QuantrexTheme !== "undefined" && QuantrexTheme.toggle) {
        QuantrexTheme.toggle();
      } else {
        const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        syncPracticeTheme(root, next);
      }
    });
  }

  return { instructionHtml, detectContext, practiceHtml, bindPractice, syncPracticeTheme, examTitle, jeeMainPattern };
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