/**
 * Quantrex redesign — folder IA + chapter module grid (visual/UX only).
 * Does not rewrite exam names, counts, or question content.
 */
(function () {
  "use strict";

  /**
   * PRODUCT RULE:
   *  7–10 → Coming Soon (no packs yet)
   *  11   → JEE Main + JEE Advanced
   *  12   → CBSE Board + JEE Main + JEE Advanced
   */
  const CLASS_EXAMS = {
    "7": ["coming_soon"],
    "8": ["coming_soon"],
    "9": ["coming_soon"],
    "10": ["coming_soon"],
    "11": ["jee_main", "jee_advanced"],
    "12": ["cbse_board", "jee_main", "jee_advanced"]
  };

  const EXAM_META = {
    jee: {
      id: "jee",
      label: "JEE Main & Advanced",
      icon: "⚙️",
      track: "Engineering",
      sub: "Chapter-wise PYQs & mocks"
    },
    jee_main: {
      id: "jee_main",
      label: "JEE Main",
      icon: "⚙️",
      track: "Engineering",
      sub: "Class chapters · JEE Main bank",
      bank: "jee_main"
    },
    jee_advanced: {
      id: "jee_advanced",
      label: "JEE Advanced",
      icon: "🚀",
      track: "Engineering",
      sub: "Class chapters · Advanced bank",
      bank: "jee_advanced"
    },
    cbse_board: {
      id: "cbse_board",
      label: "CBSE Board",
      icon: "📚",
      track: "Academic",
      sub: "Class 12 Board PYQs"
    },
    coming_soon: {
      id: "coming_soon",
      label: "Coming Soon",
      icon: "⏳",
      track: "Academic",
      sub: "Questions not added yet",
      soon: true
    },
    academy: {
      id: "academy",
      label: "Academic",
      icon: "📚",
      track: "Academic",
      sub: "CBSE / school syllabus"
    },
    olympiad: {
      id: "olympiad",
      label: "Olympiad",
      icon: "🏅",
      track: "Engineering",
      sub: "Olympiad workbook track",
      bookId: "69048808ef55966cf1d71f1d"
    },
    iit_foundation: {
      id: "iit_foundation",
      label: "IIT Foundation",
      icon: "🔬",
      track: "Academic",
      sub: "Foundation building"
    }
  };

  const SUBJ_IC = {
    Physics: "⚛️",
    Chemistry: "🧪",
    Mathematics: "📐",
    Biology: "🧬",
    Botany: "🌿",
    Zoology: "🦋",
    English: "📖",
    Science: "🔬",
    "Social Science": "🌍"
  };

  function realIc(name, subject) {
    if (typeof QxCardIcons !== "undefined" && QxCardIcons.chapterIconHtml) {
      return QxCardIcons.chapterIconHtml(name, subject || name);
    }
    return "";
  }

  /** Exam tiles keep official exam logos — do not replace with chapter glyphs. */
  function examFolderIcon(examId) {
    if (typeof QuantrexExamLogos !== "undefined" && QuantrexExamLogos.html) {
      return QuantrexExamLogos.html(examId, 44, "qx-exam-folder-logo");
    }
    return "";
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getClass() {
    try {
      return localStorage.getItem("qx_student_class") || "11";
    } catch (_) {
      return "11";
    }
  }

  function setClass(c) {
    try {
      localStorage.setItem("qx_student_class", String(c));
    } catch (_) { /* */ }
  }

  function topbar(title, sub) {
    if (typeof window.topbar === "function") return window.topbar(title, sub);
    return `<div class="qx-page-banner"><h1>${esc(title)}</h1><p>${esc(sub || "")}</p></div>`;
  }

  function breadcrumb(items) {
    if (typeof window.breadcrumb === "function") return window.breadcrumb(items);
    return "";
  }

  function mg(view, payload) {
    if (typeof window.mg === "function") return window.mg(view, payload);
    const p = JSON.stringify(payload || {}).replace(/'/g, "&#39;");
    return `data-mg="${view}" data-mgp='${p}'`;
  }

  function folderCard(opts) {
    const soon = !!opts.soon;
    const exam = opts.examKey || "";
    const subj = opts.subjKey || "";
    const click = soon
      ? `onclick="typeof showToast==='function'&&showToast('${esc(opts.title)} — Coming Soon')"`
      : opts.attrs || "";
    const ic = opts.iconHtml || realIc(opts.title, opts.subjKey || opts.examKey || opts.title) || opts.icon || "";
    return `<button type="button" class="qx-folder-card${soon ? " soon" : ""}" data-exam="${esc(exam)}" data-subj="${esc(subj)}" ${click}>
      <span class="qx-folder-ic" aria-hidden="true">${ic}</span>
      <span class="qx-folder-title">${esc(opts.title)}</span>
      <span class="qx-folder-sub">${esc(opts.sub || "")}</span>
    </button>`;
  }

  function classChips(active) {
    const classes = ["7", "8", "9", "10", "11", "12"];
    const a = String(active || "11");
    return `<div class="qx-class-row" role="tablist" aria-label="Select class 7 to 12">
      ${classes.map(c => `<button type="button" class="qx-class-chip${a === c ? " on" : ""}" data-qx-class="${c}" aria-selected="${a === c ? "true" : "false"}">Class ${c}</button>`).join("")}
    </div>`;
  }

  /** Home-style explore: Class chips → exam folders */
  function renderExploreHome() {
    const cls = getClass();
    const examIds = CLASS_EXAMS[cls] || CLASS_EXAMS["11"];
    const n = Number(cls);
    const cards = examIds.map(id => {
      const m = EXAM_META[id];
      if (!m) return "";
      const soon = !!m.soon || id === "coming_soon" || n <= 10;
      const attrs = soon
        ? `onclick="typeof showToast==='function'&&showToast('📚 Class ${cls} — Coming Soon')"`
        : `onclick="typeof QxRedesign!=='undefined'&&QxRedesign.openExam('${id}')"`;
      return folderCard({
        title: m.label,
        sub: m.sub,
        iconHtml: examFolderIcon(id),
        icon: m.icon,
        examKey: id,
        soon,
        attrs
      });
    }).join("");

    const rule = n <= 10
      ? "Coming Soon (questions not added yet)"
      : (cls === "11" ? "JEE Main · JEE Advanced chapters" : "CBSE Board · JEE Main · JEE Advanced");

    return `${topbar("Explore by Class", "7–10 Soon · 11 JEE · 12 Board + JEE")}
      ${classChips(cls)}
      <h2 class="cpyqb-exam-sec-title" style="margin:8px 0 12px">Class ${esc(cls)} · ${esc(rule)}</h2>
      <div class="qx-folder-grid">${cards}</div>`;
  }

  function openExam(examId) {
    const m = EXAM_META[examId];
    if (!m) return;
    const cls = getClass();
    const classSlug = "class_" + cls;
    const n = Number(cls);

    if (n >= 7 && n <= 10) {
      if (typeof showToast === "function") showToast("📚 Class " + cls + " — Coming Soon (questions not added yet)");
      return;
    }
    if (examId === "coming_soon") {
      if (typeof showToast === "function") showToast("📚 Coming Soon");
      return;
    }
    if (typeof go !== "function") return;

    try {
      localStorage.setItem("quantrex_exam", "Academic");
      if (typeof STATE !== "undefined") STATE.exam = "Academic";
    } catch (_) { /* */ }

    // Class 12 CBSE Board
    if (examId === "cbse_board" || (examId === "academy" && cls === "12")) {
      go("cpyqb", { step: "class12boards", classSlug: "class_12" });
      return;
    }

    // JEE Main / Advanced — class-filtered chapters
    if (examId === "jee_main" || examId === "jee" || examId === "jee_advanced") {
      const bank = examId === "jee_advanced" ? "jee_advanced" : "jee_main";
      const kind = examId === "jee_advanced" ? "jee_advanced" : "jee_main";
      go("cpyqb", {
        step: "subjects",
        exam: bank,
        classSlug,
        trackKind: kind,
        filterClass: "Class " + cls,
        sortBy: "default"
      });
      return;
    }

    go("cpyqb", { step: "classExams", classSlug, exam: classSlug });
  }

  /**
   * Chapter module hub — shown before raw question list.
   * Links into existing data; Coming Soon for modules without data.
   */
  function renderChapterHub(ctx) {
    const {
      title,
      subtitle,
      examKey,
      subject,
      questionCount,
      practicePayload,
      pyqPayload,
      formulaPayload,
      notesPayload,
      videoPayload,
      revisionPayload,
      examSlug
    } = ctx || {};

    const gradAttr = examKey || "jee";
    /* qxmd172-no-video */
    const nQ = questionCount != null ? String(questionCount) : "";
    /* qxmd172: videos excluded — Quantrex ships Q/practice/notes/formula only */
    const modules = [
      {
        id: "notes",
        icon: "📄",
        title: "Notes (PDF)",
        sub: "Downloadable chapter notes",
        soon: !notesPayload,
        payload: notesPayload
      },
      {
        id: "formula",
        icon: "∑",
        title: "Formula Sheet (PDF)",
        sub: "Quick-reference formulas",
        soon: !formulaPayload,
        payload: formulaPayload
      },
      {
        id: "practice",
        icon: "✏️",
        title: "Practice Questions",
        sub: nQ ? `${nQ} questions` : "Chapter-wise question bank",
        soon: !practicePayload,
        payload: practicePayload
      },
      {
        id: "revision",
        icon: "⚡",
        title: "Revision Notes / Quick Revision",
        sub: "Condensed last-minute revision",
        soon: !revisionPayload,
        payload: revisionPayload
      },
      {
        id: "flash",
        icon: "🃏",
        title: "Flash Cards",
        sub: "Revision flash cards for this subject",
        soon: false,
        payload: (typeof mg === "function") ? mg("flashcards", { step: "chapters", subject: subject || "" }) : ""
      },
      {
        id: "pyq",
        icon: "🎯",
        title: "Previous Year Questions",
        sub: "PYQs for this chapter",
        soon: !pyqPayload,
        payload: pyqPayload
      }
    ];

    const cards = modules.map(m => {
      const soon = m.soon;
      const click = soon
        ? `onclick="typeof showToast==='function'&&showToast('${esc(m.title)} — Coming Soon')"`
        : m.payload || "";
      const ic = realIc(m.title, subject) || m.icon;
      return `<button type="button" class="qx-module-card${soon ? " soon" : ""}" style="--folder-grad:var(--grad-${gradAttr === "academy" ? "academy" : gradAttr === "neet" ? "neet" : "jee"})" ${click}>
        <span class="qx-module-ic" aria-hidden="true">${ic}</span>
        <span class="qx-module-body"><strong>${esc(m.title)}</strong><small>${esc(m.sub)}</small></span>
        <span class="qx-module-chev" aria-hidden="true">›</span>
      </button>`;
    }).join("");

    return `<div class="qx-ch-hub" style="--folder-grad:var(--grad-${gradAttr === "academy" ? "academy" : "jee"})">
      <div class="qx-ch-hub-hero">
        <h1>${esc(title || "Chapter")}</h1>
        <p>${esc(subtitle || subject || "Choose a module")}</p>
      </div>
      <div class="qx-module-grid">${cards}</div>
    </div>`;
  }

  /** Enhance subject/chapter grids to folder look without changing labels */
  function enhanceFolderLook(root) {
    const scope = root || document.getElementById("app-main");
    if (!scope) return;
    scope.querySelectorAll(".subj-card").forEach(el => {
      if (el.classList.contains("qx-folder-enhanced")) return;
      el.classList.add("qx-folder-enhanced");
      const name = (el.querySelector("strong") || {}).textContent || "";
      if (name) el.setAttribute("data-subj", name.trim());
    });
    scope.querySelectorAll(".ch-card, .cpyqb-exam-tile").forEach(el => {
      if (el.classList.contains("qx-folder-enhanced")) return;
      el.classList.add("qx-folder-enhanced");
    });
  }

  function bindClassChips(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-qx-class]").forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        setClass(btn.getAttribute("data-qx-class"));
        if (typeof finishRender === "function") {
          finishRender(renderExploreHome());
          bindClassChips();
          if (typeof bindMarksGo === "function") bindMarksGo(document.getElementById("app-main"));
        }
      };
    });
  }

  /** Optional explore view for dashboard injection */
  function exploreSectionHtml() {
    const cls = getClass();
    const n = Number(cls);
    const examIds = CLASS_EXAMS[cls] || CLASS_EXAMS["11"];
    const cards = examIds.map(id => {
      const m = EXAM_META[id];
      if (!m) return "";
      const soon = !!m.soon || id === "coming_soon" || n <= 10;
      return folderCard({
        title: m.label,
        sub: m.sub,
        iconHtml: examFolderIcon(id),
        icon: m.icon,
        examKey: id,
        soon,
        attrs: soon
          ? `onclick="typeof showToast==='function'&&showToast('📚 Class ${cls} — Coming Soon')"`
          : `onclick="typeof QxRedesign!=='undefined'&&QxRedesign.openExam('${id}')"`
      });
    }).join("");
    return `<div class="marks-section qx-explore-block">
      <div class="marks-sec-head"><h3>Explore by Class (7–12)</h3>
        <a href="#" ${mg("cpyqb", { step: "exams", forceExamList: true })} onclick="try{localStorage.setItem('quantrex_exam','Academic');if(window.STATE)STATE.exam='Academic';}catch(e){}">All classes →</a>
      </div>
      <p class="sec-desc" style="margin:0 0 10px">7–10 Coming Soon · 11: JEE Main + Advanced · 12: CBSE Board + JEE Main + Advanced</p>
      ${classChips(cls)}
      <div class="qx-folder-grid">${cards}</div>
    </div>`;
  }

  function afterRender(root) {
    enhanceFolderLook(root);
    bindClassChips(root);
  }

  // Hook finishRender lightly
  const _origFinish = window.finishRender;
  if (typeof _origFinish === "function") {
    window.finishRender = function (html) {
      const r = _origFinish.apply(this, arguments);
      try {
        afterRender(document.getElementById("app-main"));
      } catch (_) { /* */ }
      return r;
    };
  }

  window.QxRedesign = {
    CLASS_EXAMS,
    EXAM_META,
    getClass,
    setClass,
    renderExploreHome,
    exploreSectionHtml,
    renderChapterHub,
    openExam,
    folderCard,
    afterRender,
    SUBJ_IC
  };
})();
