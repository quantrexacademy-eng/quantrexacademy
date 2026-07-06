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
      return `<button type="button" class="marks-subj-item${active}" data-mg="cpyqb" data-mgp='${JSON.stringify({ step: "chapters", exam: exam.slug, subject: s.name }).replace(/'/g, "&#39;")}'>
        <span class="marks-subj-ic">${SUBJ_ICONS[s.name] || "📖"}</span>
        <span>${s.name}</span>
        <span class="marks-subj-arr">›</span>
      </button>`;
    }).join("");

    const yearMeta = exam._marksYearRange ? `<small class="marks-exam-meta">${exam._marksYearRange}${exam._marksPaperCount ? ` · ${exam._marksPaperCount} Papers` : ""} · ${exam.count.toLocaleString()} Qs</small>` : `<small class="marks-exam-meta">${exam.count.toLocaleString()} Questions</small>`;

    return `<aside class="marks-subj-rail">
      <div class="marks-exam-head" title="Switch exam" ${typeof mg === "function" ? mg("cpyqb", { step: "exams", forceExamList: true }) : ""}>
        <span class="marks-exam-ic">📝</span>
        <div><strong>${exam.title}</strong>${yearMeta}</div>
      </div>
      <nav class="marks-subj-list">${items}</nav>
      <button type="button" class="marks-analysis-btn" onclick="go('analytics')">
        <span>📊</span> Analysis <em class="marks-new-badge">NEW</em>
      </button>
      <button type="button" class="marks-exam-switch" ${typeof mg === "function" ? mg("cpyqb", { step: "exams", forceExamList: true }) : ""}>Switch Exam</button>
    </aside>`;
  }

  function splitLayout(exam, activeSubject, mainHtml) {
    return `<div class="marks-split-layout">
      ${subjectRail(exam, activeSubject)}
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
        <span class="marks-side-exam-ic">🔶</span>
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

  return { splitLayout, enrichExamMeta, saveContext, primarySlug, initSidebar, bind, SUBJ_KEY, EXAM_KEY };
})();