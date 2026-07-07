// MARKS web shell — split layout, exam sidebar, subject rail
const MarksShell = (() => {
  const SUBJ_KEY = "quantrex_marks_subj";
  const EXAM_KEY = "quantrex_marks_exam";

  const SUBJ_ICONS = {
    Physics: "⚛️", Chemistry: "🧪", Mathematics: "📐", Biology: "🧬",
    Botany: "🌿", Zoology: "🦠", Science: "🔬"
  };

  function primarySlug() {
    return (typeof PRIMARY_BANK !== "undefined" && PRIMARY_BANK[STATE.exam]) || "jee_main";
  }

  function saveContext(examSlug, subject) {
    if (examSlug) localStorage.setItem(EXAM_KEY, examSlug);
    if (subject) localStorage.setItem(SUBJ_KEY, subject);
  }

  function examYearRange(byYear) {
    const years = Object.keys(byYear || {}).filter(y => y !== "Other").map(Number).sort((a, b) => a - b);
    if (!years.length) return "";
    return years[years.length - 1] + " - " + years[0];
  }

  function examPaperCount(byYear) {
    return Object.values(byYear || {}).reduce((s, arr) => s + (arr ? arr.length : 0), 0);
  }

  function subjectRail(exam, activeSubject) {
    if (!exam) return "";
    const items = (exam.subjects || []).map(s => {
      const active = s.name === activeSubject ? " active" : "";
      const subjIc = (typeof QuantrexExamLogos !== "undefined" && QuantrexExamLogos.subjectHtml(s.name, 22, "marks-board-subj-ic", s.icon))
        || `<span class="marks-subj-ic">${SUBJ_ICONS[s.name] || "📖"}</span>`;
      return `<button type="button" class="marks-subj-item${active}" data-mg="cpyqb" data-mgp='${JSON.stringify({ step: "chapters", exam: exam.slug, subject: s.name }).replace(/'/g, "&#39;")}'>
        ${subjIc}
        <span>${s.name}</span>
        <span class="marks-subj-arr">›</span>
      </button>`;
    }).join("");

    const yearMeta = exam._marksYearRange ? `<small class="marks-exam-meta">${exam._marksYearRange}${exam._marksPaperCount ? ` · ${exam._marksPaperCount} Papers` : ""} · ${exam.count.toLocaleString()} Qs</small>` : `<small class="marks-exam-meta">${exam.count.toLocaleString()} Questions</small>`;

    const examLogo = typeof QuantrexExamLogos !== "undefined"
      ? QuantrexExamLogos.html(exam.slug, 40, "marks-exam-ic-img")
      : '<span class="marks-exam-ic">📝</span>';
    const cpyqbSwitchPayload = JSON.stringify({ step: "exams", forceExamList: true }).replace(/'/g, "&#39;");
    return `<aside class="marks-subj-rail">
      <div class="marks-exam-head" title="Switch exam" ${typeof mg === "function" ? mg("cpyqb", { step: "exams", forceExamList: true }) : ""}>
        ${examLogo}
        <div><strong>${exam.title}</strong>${yearMeta}</div>
      </div>
      <nav class="marks-subj-list">${items}</nav>
      <button type="button" class="marks-analysis-btn" onclick="go('analytics')">
        <span>📊</span> Analysis <em class="marks-new-badge">NEW</em>
      </button>
      <button type="button" class="marks-exam-switch" data-mg="cpyqb" data-mgp='${cpyqbSwitchPayload}'>Switch Exam</button>
    </aside>`;
  }

  function splitLayout(exam, activeSubject, mainHtml) {
    return `<div class="marks-split-layout">
      ${subjectRail(exam, activeSubject)}
      <div class="marks-split-main">${mainHtml}</div>
    </div>`;
  }

  function boardMetaLine(meta) {
    return (meta || [])
      .slice()
      .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
      .map(m => `${m.title}: ${m.description}`)
      .join(" · ");
  }

  function boardSubjIcon(s) {
    if (typeof QuantrexExamLogos !== "undefined") {
      const img = QuantrexExamLogos.subjectHtml(s && s.name, 22, "marks-board-subj-ic", s && s.icon);
      if (img) return img;
    }
    return `<span class="marks-subj-ic">${SUBJ_ICONS[s.name] || "📖"}</span>`;
  }

  function boardSubjectRail(examData, activeSubject, examId) {
    if (!examData) return "";
    const metaSmall = boardMetaLine(examData.meta);
    const examIcon = examData.icon
      ? (typeof QuantrexExamLogos !== "undefined"
        ? QuantrexExamLogos.fromUrl(examData.icon, 48, "marks-exam-ic-img", examData.title)
        : `<img class="qx-marks-icon marks-exam-ic-img" src="${examData.icon}" width="48" height="48" alt="${examData.title || ""}" loading="eager" decoding="async">`)
      : (typeof QuantrexExamLogos !== "undefined"
        ? QuantrexExamLogos.html(typeof dashBoardSelected === "function" ? dashBoardSelected() : "CBSE", 48, "marks-exam-ic-img")
        : '<span class="marks-exam-ic">📝</span>');
    const items = (examData.subjects || []).map(s => {
      const active = s.name === activeSubject ? " active" : "";
      const payload = JSON.stringify({ step: "chapters", subject: s.name, subjectId: s.id, examId }).replace(/'/g, "&#39;");
      return `<button type="button" class="marks-subj-item${active}" data-mg="board" data-mgp='${payload}'>
        ${boardSubjIcon(s)}
        <span>${s.name}</span>
        <span class="marks-subj-arr">›</span>
      </button>`;
    }).join("");
    const switchPayload = JSON.stringify({ step: "subjects", examId }).replace(/'/g, "&#39;");
    return `<aside class="marks-subj-rail marks-board-rail">
      <div class="marks-exam-head" title="Board home" data-mg="board" data-mgp='${switchPayload}'>
        ${examIcon}
        <div><strong>${examData.title || "Board"}</strong>${metaSmall ? `<small class="marks-exam-meta">${metaSmall}</small>` : ""}</div>
      </div>
      <nav class="marks-subj-list">${items}</nav>
      <button type="button" class="marks-analysis-btn" onclick="go('analytics')">
        <span>📊</span> Analysis <em class="marks-new-badge">NEW</em>
      </button>
      <button type="button" class="marks-exam-switch" data-mg="board" data-mgp='${switchPayload}'>Switch Board</button>
    </aside>`;
  }

  function boardSplitLayout(examData, activeSubject, mainHtml, examId) {
    return `<div class="marks-split-layout marks-board-split">
      ${boardSubjectRail(examData, activeSubject, examId)}
      <div class="marks-split-main">${mainHtml}</div>
    </div>`;
  }

  async function enrichExamMeta(exam) {
    if (!exam || exam._marksEnriched) return exam;
    if (typeof buildPyqPaperIndex === "function") {
      try {
        const byYear = await buildPyqPaperIndex(exam.slug);
        exam._marksYearRange = examYearRange(byYear);
        exam._marksPaperCount = examPaperCount(byYear);
        exam._marksEnriched = true;
      } catch (e) { /* ignore */ }
    }
    return exam;
  }

  function updateSidebarExamBlock(exam) {
    const block = document.getElementById("marksExamBlock");
    if (!block || !exam) return;
    block.innerHTML = `
      <div class="marks-side-exam" ${typeof mg === "function" ? mg("cpyqb", { step: "chapters", exam: exam.slug, subject: localStorage.getItem(SUBJ_KEY) || (exam.subjects[0] && exam.subjects[0].name) }) : ""}>
        ${typeof QuantrexExamLogos !== "undefined" ? QuantrexExamLogos.html(exam.slug, 32, "marks-side-exam-ic-img") : '<span class="marks-side-exam-ic">🔶</span>'}
        <div><strong>${exam.title}</strong><small>${exam._marksYearRange || ""} ${exam._marksPaperCount ? `· ${exam._marksPaperCount} Papers` : ""}</small></div>
      </div>`;
  }

  function initSidebar() {
    const rail = document.getElementById("marksExamBlock");
    if (!rail) return;
    if (typeof fetchNav !== "function") return;
    fetchNav("cpyqb").then(nav => {
      const slug = localStorage.getItem(EXAM_KEY) || primarySlug();
      const exam = nav.find(e => e.slug === slug && e.category === STATE.exam) || nav.find(e => e.category === STATE.exam);
      if (exam) enrichExamMeta(exam).then(e => updateSidebarExamBlock(e));
    }).catch(() => {});
  }

  function bind(root) {
    (root || document).querySelectorAll(".marks-subj-item[data-mg]").forEach(el => {
      if (el._bound) return;
      el._bound = true;
      el.onclick = (e) => {
        e.preventDefault();
        try {
          const payload = JSON.parse((el.dataset.mgp || "{}").replace(/&#39;/g, "'"));
          if (payload.subject) saveContext(payload.exam, payload.subject);
          go(el.dataset.mg, payload);
        } catch (err) { console.error(err); }
      };
    });
  }

  return { splitLayout, boardSplitLayout, boardSubjectRail, enrichExamMeta, saveContext, primarySlug, initSidebar, bind, SUBJ_KEY, EXAM_KEY };
})();