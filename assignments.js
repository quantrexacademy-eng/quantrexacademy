// Quantrex Assignments + For Teachers — full classroom module (Firestore, isolated per teacher)
const QuantrexAssignments = (() => {
  let _teacherTab = localStorage.getItem("qx_teacher_tab") || "home";
  const _teachCache = { teacherId: null, at: 0, students: null, assignments: null, batches: null, subs: null, subMap: null };
  const TEACH_CACHE_MS = 60000;
  let _teacherResolvedId = null;
  let _studentTab = localStorage.getItem("qx_student_tab") || "pending";
  let _createStep = 1;
  let _createDraft = JSON.parse(localStorage.getItem("qx_assign_draft") || "null") || {
    sourceType: "bank",
    title: "",
    examKey: "Engineering",
    examTag: "JEE",
    subject: "Physics",
    chapter: "",
    bankSlug: "jee_main",
    testSeriesTestId: "",
    testSeriesTitle: "",
    testSeriesCategory: "",
    questionIds: [],
    customQuestions: [],
    numQuestions: 10,
    timeLimitMin: 30,
    startAt: "",
    dueAt: "",
    assignToAll: true,
    targetStudentIds: [],
    batchIds: [],
    shuffle: true,
    marking: { correct: 4, wrong: -1, unattempted: 0 }
  };
  let _tsFilter = { categoryId: "", subject: "", query: "" };
  let _submissionUnsub = null;

  function db() { return QuantrexDB && QuantrexDB.db ? QuantrexDB.db : null; }
  function uid() { return QuantrexDB ? QuantrexDB.uid : null; }

  function userName() {
    try {
      const u = JSON.parse(localStorage.getItem("quantrex_user") || "null");
      return (u && (u.name || u.email)) || "User";
    } catch (e) { return "User"; }
  }

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function fmtDate(ts) {
    if (!ts) return "—";
    const d = typeof ts === "number" ? new Date(ts) : (ts.toDate ? ts.toDate() : new Date(ts));
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function assignmentStatus(a) {
    const now = Date.now();
    const start = a.startAt ? (typeof a.startAt === "number" ? a.startAt : a.startAt.toMillis?.() || 0) : 0;
    const due = a.dueAt ? (typeof a.dueAt === "number" ? a.dueAt : a.dueAt.toMillis?.() || 0) : 0;
    if (start && now < start) return "upcoming";
    if (due && now > due) return "expired";
    return "live";
  }

  function platformStats() {
    const banks = typeof BANK_INDEX !== "undefined" ? Object.keys(BANK_INDEX).length : 0;
    const questions = typeof BANK_INDEX !== "undefined"
      ? Object.values(BANK_INDEX).reduce((s, b) => s + (b.count || 0), 0)
      : 0;
    return { banks, questions };
  }

  async function testSeriesCount() {
    try {
      const r = await fetch(`data/tests/jee_main_examgoal_2027/manifest.json?v=${Date.now()}`);
      const m = await r.json();
      return m.totalTests || 458;
    } catch (e) { return 458; }
  }

  async function getTeacherId() {
    const authUid = uid();
    if (QuantrexTeacherAuth.isTeacherSession()) {
      const p = QuantrexTeacherAuth.teacherProfileLocal();
      return (p && p.uid) || authUid;
    }
    return authUid;
  }

  function clearTeachCache() {
    _teachCache.teacherId = null;
    _teachCache.at = 0;
    _teachCache.students = null;
    _teachCache.assignments = null;
    _teachCache.batches = null;
    _teachCache.subs = null;
    _teachCache.subMap = null;
  }

  function teachCacheHit(teacherId) {
    return _teachCache.teacherId === teacherId && (Date.now() - _teachCache.at) < TEACH_CACHE_MS;
  }

  async function loadTeacherBundle(teacherId, opts) {
    const needSubs = opts && opts.submissions;
    if (teachCacheHit(teacherId) && (!needSubs || _teachCache.subMap)) {
      return _teachCache;
    }
    const tasks = [
      QuantrexTeacherAuth.listTeacherStudents(teacherId),
      listAssignmentsForTeacher(teacherId),
      QuantrexTeacherAuth.listTeacherBatches(teacherId)
    ];
    const results = await Promise.all(tasks);
    _teachCache.teacherId = teacherId;
    _teachCache.at = Date.now();
    _teachCache.students = results[0] || [];
    _teachCache.assignments = results[1] || [];
    _teachCache.batches = results[2] || [];
    if (needSubs && typeof QuantrexClassroom !== "undefined") {
      let subs = [];
      if (QuantrexClassroom.listSubmissionsForTeacher) {
        subs = await QuantrexClassroom.listSubmissionsForTeacher(teacherId);
      }
      if (!subs.length && _teachCache.assignments.length && QuantrexClassroom.listSubmissionsForAssignment) {
        const recent = _teachCache.assignments.slice(0, 12);
        const parts = await Promise.all(recent.map(a => QuantrexClassroom.listSubmissionsForAssignment(a.id)));
        subs = parts.flat();
      }
      _teachCache.subs = subs;
      _teachCache.subMap = QuantrexClassroom.submissionLookupMap(subs);
    }
    return _teachCache;
  }

  async function requireTeacher() {
    if (typeof QuantrexTeacherAuth === "undefined") return null;
    const guestTeacher = guestTrialId("teacher");
    if (guestTeacher) return guestTeacher;
    if (_teacherResolvedId && authReady() && QuantrexDB.auth.currentUser.uid === _teacherResolvedId) {
      return _teacherResolvedId;
    }
    if (!authReady()) {
      if (typeof QuantrexTeacherAuth.waitForCurrentUser === "function") {
        await QuantrexTeacherAuth.waitForCurrentUser(1200);
      }
    }
    if (!authReady()) return null;
    if (QuantrexTeacherAuth.isTeacherSession()) {
      const local = QuantrexTeacherAuth.teacherProfileLocal();
      if (local && local.uid) {
        _teacherResolvedId = local.uid;
        return local.uid;
      }
    }
    if (!QuantrexTeacherAuth.isTeacherSession()) {
      try {
        let u = {};
        try { u = JSON.parse(localStorage.getItem("quantrex_user") || "{}"); } catch (e) { /* */ }
        await QuantrexTeacherAuth.activateTeacherFromCurrentUser({ name: u.name, email: u.email });
      } catch (e) {
        console.warn("requireTeacher activate:", e.message || e);
      }
    }
    const id = await getTeacherId();
    if (!id) return null;
    if (QuantrexTeacherAuth.isTeacherSession()) {
      const local = QuantrexTeacherAuth.teacherProfileLocal();
      if (local && local.uid === id && local.status === "active") {
        _teacherResolvedId = id;
        return id;
      }
    }
    try {
      if (await QuantrexTeacherAuth.isTeacher(id)) {
        _teacherResolvedId = id;
        return id;
      }
    } catch (e) {
      console.warn("requireTeacher:", e.message || e);
    }
    _teacherResolvedId = id;
    return id;
  }

  function authReady() {
    return QuantrexDB.auth && QuantrexDB.auth.currentUser && QuantrexDB.auth.currentUser.uid;
  }

  function guestTrialId(role) {
    if (typeof QuantrexGuestTrial !== "undefined" && QuantrexGuestTrial.guestId) {
      return QuantrexGuestTrial.guestId(role);
    }
    return null;
  }

  async function requireStudent() {
    const guestStudent = guestTrialId("student");
    if (guestStudent) return guestStudent;
    if (authReady()) return uid();
    return null;
  }

  async function rosterStudentIds(teacherId) {
    if (typeof QuantrexClassroom !== "undefined") {
      return QuantrexClassroom.studentIdsForTeacher(teacherId);
    }
    const rows = await QuantrexTeacherAuth.listTeacherStudents(teacherId);
    return rows.map(r => r.studentId);
  }

  async function createAssignment(payload) {
    const teacherId = await requireTeacher();
    if (!teacherId) throw new Error("Teacher login required");
    if (typeof QuantrexClassroom !== "undefined") {
      payload.teacherName = QuantrexTeacherAuth.teacherProfileLocal()?.name || userName();
      return QuantrexClassroom.createAssignment(teacherId, payload);
    }
    const database = db();
    if (!database) throw new Error("DB not ready");
    let visibleToStudents = payload.targetStudentIds || [];
    if (payload.assignToAll) visibleToStudents = await rosterStudentIds(teacherId);
    if (!visibleToStudents.length) throw new Error("No students linked. Share batch code first.");
    const tName = QuantrexTeacherAuth.teacherProfileLocal()?.name || userName();
    const doc = {
      teacherId, teacherName: tName, title: payload.title || "Assignment", questionIds: payload.questionIds || [],
      timeLimitMin: Number(payload.timeLimitMin) || 30, visibleToStudents, active: true, createdAt: Date.now(),
      sourceType: payload.sourceType || "bank"
    };
    const ref = await database.collection("assignments").add(doc);
    return { id: ref.id, ...doc };
  }

  async function listAssignmentsForTeacher(teacherId) {
    if (typeof QuantrexClassroom !== "undefined") {
      return QuantrexClassroom.listAssignmentsForTeacher(teacherId);
    }
    const database = db();
    if (!database || !teacherId) return [];
    try {
      const snap = await database.collection("assignments").where("teacherId", "==", teacherId).limit(100).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { return []; }
  }

  async function listAssignmentsForStudent(studentId) {
    if (typeof QuantrexClassroom !== "undefined") {
      return QuantrexClassroom.listAssignmentsForStudent(studentId);
    }
    const database = db();
    if (!database || !studentId) return [];
    const snap = await database.collection("assignments")
      .where("visibleToStudents", "array-contains", studentId).where("active", "==", true).limit(80).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function getSubmission(assignmentId, studentId) {
    if (typeof QuantrexClassroom !== "undefined") {
      return QuantrexClassroom.getSubmission(assignmentId, studentId);
    }
    const database = db();
    if (!database) return null;
    const snap = await database.collection("assignments").doc(assignmentId)
      .collection("submissions").doc(studentId).get();
    return snap.exists ? snap.data() : null;
  }

  function enrichSubmissionFromResult(result) {
    const answers = [];
    const wrongQuestionIds = [];
    const breakdown = JSON.parse(JSON.stringify(result.breakdown || { subject: {}, difficulty: {} }));
    if (!breakdown.chapter) breakdown.chapter = {};

    (result.rows || []).forEach((r) => {
      if (!r || !r.q) return;
      const chapter = r.q.chapter || r.q.topic || "General";
      const subject = r.q.subject || "Other";
      const entry = {
        questionId: String(r.q.id),
        chosen: r.chosen,
        correct: !!r.isCorrect,
        wrong: !!r.isWrong,
        skipped: !!r.isSkip,
        subject,
        chapter
      };
      answers.push(entry);
      if (r.isWrong) wrongQuestionIds.push(String(r.q.id));

      if (!breakdown.chapter[chapter]) breakdown.chapter[chapter] = { correct: 0, wrong: 0, total: 0, subject };
      breakdown.chapter[chapter].total++;
      if (r.isCorrect) breakdown.chapter[chapter].correct++;
      if (r.isWrong) breakdown.chapter[chapter].wrong++;
    });

    return { answers, wrongQuestionIds, breakdown };
  }

  async function submitAttempt(assignmentId, result) {
    const studentId = uid();
    if (!studentId || !assignmentId) return false;
    const database = db();
    const teacherId = database ? (await database.collection("assignments").doc(assignmentId).get()).data()?.teacherId : null;
    const enriched = enrichSubmissionFromResult(result);
    const payload = {
      teacherId, studentName: userName(),
      answers: enriched.answers,
      wrongQuestionIds: enriched.wrongQuestionIds,
      score: result.score || 0, correct: result.correct || 0, wrong: result.wrong || 0,
      skipped: result.skipped || 0, pct: result.pct || 0, timeTaken: result.timeUsed || 0,
      timeTakenSec: result.timeUsed || 0, breakdown: enriched.breakdown
    };
    if (typeof QuantrexClassroom !== "undefined") {
      await QuantrexClassroom.saveSubmission(assignmentId, studentId, payload);
    } else if (database) {
      await database.collection("assignments").doc(assignmentId)
        .collection("submissions").doc(studentId).set({ assignmentId, studentId, ...payload, submittedAt: Date.now() }, { merge: true });
    }
    await QuantrexTeacherAuth.touchStudentActive(studentId);
    return true;
  }

  async function loadQuestionsForAssignment(a) {
    const ids = (a.questionIds || []).map(String);
    const custom = a.customQuestions || [];

    if (a.sourceType === "test_series" && a.testSeriesTestId && typeof tsLoadQuestionsForTest === "function") {
      const test = {
        id: a.testSeriesTestId,
        questionIds: a.questionIds,
        totalQs: a.numQuestions,
        seriesId: "jee_main_examgoal_2027"
      };
      await tsLoadQuestionsForTest(test);
      return ids.filter(id => getQ(id) || (window.TS_ACTIVE_QMAP && window.TS_ACTIVE_QMAP[id]));
    }

    const slug = a.bankSlug || (PRIMARY_BANK && PRIMARY_BANK[STATE.exam]) || "jee_main";
    if (!_banksLoaded[slug]) await loadSingleBank(slug);

    custom.forEach((q, i) => {
      const cq = {
        id: q.id || `tq_${a.teacherId}_${i}`,
        subject: q.subject || a.subject,
        chapter: q.chapter || a.chapter,
        q: q.q || q.question,
        options: q.options || [],
        answer: q.answer,
        difficulty: q.difficulty || "Medium",
        _bank: "teacher_custom",
        _teacherId: a.teacherId
      };
      if (typeof QUESTIONS !== "undefined") QUESTIONS.push(cq);
    });

    return ids.map(Number).filter(id => !isNaN(id) && getQ(id));
  }

  async function start(assignmentId) {
    const database = db();
    const studentId = uid();
    if (!database || !studentId) { showToast("Login required"); return; }

    const snap = await database.collection("assignments").doc(assignmentId).get();
    if (!snap.exists) { showToast("Assignment not found"); return; }
    const a = snap.data();

    if (!(a.visibleToStudents || []).includes(studentId)) {
      showToast("This assignment is not assigned to you");
      return;
    }

    const status = assignmentStatus(a);
    if (status === "upcoming") { showToast("Assignment not started yet"); return; }
    if (status === "expired") { showToast("Assignment deadline passed"); return; }

    const existing = await getSubmission(assignmentId, studentId);
    if (existing) { showToast("Already submitted"); go("assignments"); return; }

    const contentUrl = a.contentUrl || a.pdfUrl || a.videoUrl || a.lectureUrl;
    if ((a.sourceType === "pdf" || a.sourceType === "video" || a.sourceType === "lecture_link") && contentUrl) {
      window.open(contentUrl, "_blank", "noopener");
      showToast(a.sourceType === "pdf" ? "PDF opened" : "Link opened in new tab");
      return;
    }

    const validIds = await loadQuestionsForAssignment(a);
    if (!validIds.length) { showToast("Questions unavailable"); return; }

    let qIds = validIds;
    if (a.numQuestions && qIds.length > a.numQuestions) {
      qIds = [...qIds].sort(() => Math.random() - 0.5).slice(0, a.numQuestions);
    }

    const marking = a.markingScheme || { correct: 4, wrong: -1, unattempted: 0 };
    startTest(qIds, a.title, "assignments", {
      testType: "assignment",
      timed: true,
      durationSec: (a.timeLimitMin || 30) * 60,
      modeLabel: `Assignment · ${a.title}`,
      marksMode: true,
      shuffle: a.shuffle !== false,
      scoring: marking,
      onComplete: async (data) => {
        await submitAttempt(assignmentId, data);
        showToast("Assignment submitted!");
        go("assignments");
      }
    });
  }

  async function pickBankQuestions(subject, chapter, count, bankSlug) {
    const slug = bankSlug || (PRIMARY_BANK && PRIMARY_BANK[STATE.exam]) || "jee_main";
    if (!_banksLoaded[slug]) await loadSingleBank(slug);
    let pool = QUESTIONS.filter(q => q._bank === slug);
    if (subject) pool = pool.filter(q => q.subject === subject);
    if (chapter) pool = pool.filter(q => (q.chapter || "").toLowerCase().includes(chapter.toLowerCase()));
    if (!pool.length) pool = QUESTIONS.filter(q => q._bank === slug).slice(0, 500);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(q => q.id);
  }

  async function fetchTestSeriesOptions(filters) {
    if (typeof QuantrexTeacherCatalog !== "undefined") {
      return QuantrexTeacherCatalog.listTests(filters || _tsFilter);
    }
    try {
      const r = await fetch(`data/tests/jee_main_examgoal_2027/manifest.json?v=${Date.now()}`);
      const m = await r.json();
      return (m.tests || []).filter(t => t.status !== "upcoming").map(t => ({
        id: t.id, title: t.title, categoryId: t.categoryId, totalQs: t.totalQs, seriesId: m.id
      }));
    } catch (e) { return []; }
  }

  function examSelectHtml(selected) {
    if (typeof QuantrexTeacherCatalog === "undefined") return "";
    return QuantrexTeacherCatalog.examGroups().map(g =>
      `<option value="${g.key}" ${selected === g.key ? "selected" : ""}>${g.icon} ${g.name}</option>`
    ).join("");
  }

  function bankSelectHtml(examKey, selected) {
    if (typeof QuantrexTeacherCatalog === "undefined") return "";
    return QuantrexTeacherCatalog.banksForGroup(examKey).map(b =>
      `<option value="${b.slug}" ${selected === b.slug ? "selected" : ""}>${b.title} (${(b.count || 0).toLocaleString()} Qs)</option>`
    ).join("");
  }

  function subjectSelectHtml(examKey, selected) {
    const subs = typeof QuantrexTeacherCatalog !== "undefined"
      ? QuantrexTeacherCatalog.subjectsForGroup(examKey)
      : ((typeof EXAMS !== "undefined" && EXAMS[examKey]) ? EXAMS[examKey].subjects : ["Physics", "Chemistry", "Mathematics"]);
    return subs.map(s => `<option value="${s}" ${selected === s ? "selected" : ""}>${s}</option>`).join("");
  }

  function teacherTabsHtml(active) {
    const tabs = [
      ["builder", "Create Own Test"],
      ["home", "Overview"],
      ["batches", "Batches"],
      ["banks", "Question Banks"],
      ["testseries", "New Q Test Series 2027"],
      ["content", "Content Library"],
      ["students", "My Students"],
      ["create", "Publish"],
      ["assignments", "Assignments"]
    ];
    return `<div class="qx-teach-tabs">${tabs.map(([id, label]) =>
      `<button type="button" class="qx-teach-tab${active === id ? " on" : ""}" onclick="QuantrexAssignments.setTeacherTab('${id}')">${label}</button>`
    ).join("")}</div>`;
  }

  async function safeList(collection, fallback) {
    try { return await collection; }
    catch (e) {
      console.warn("Teacher data load:", e.message || e);
      return fallback;
    }
  }

  async function viewTeacherHome(teacherId) {
    const stats = platformStats();
    const tsCount = 458;
    const bundle = await loadTeacherBundle(teacherId, { submissions: false });
    const students = bundle.students || [];
    const batches = bundle.batches || [];
    const primaryBatch = batches[0];
    const code = primaryBatch?.batchCode || QuantrexTeacherAuth.teacherProfileLocal()?.teacherCode || "—";
    const examCards = typeof QuantrexTeacherCatalog !== "undefined"
      ? QuantrexTeacherCatalog.examGroups().map(g => {
          const banks = QuantrexTeacherCatalog.banksForGroup(g.key);
          const qCount = banks.reduce((s, b) => s + (b.count || 0), 0);
          return `<div class="assign-card qx-click-row" onclick="QuantrexAssignments.setTeacherTab('banks');QuantrexAssignments.filterBanks('${g.key}')">
            <strong>${g.icon} ${esc(g.name)}</strong>
            <p>${banks.length} banks · ${qCount.toLocaleString()} questions · ${g.subjects.join(", ")}</p>
          </div>`;
        }).join("")
      : "";
    const folderCards = `
    <div class="marks-tests-page" style="margin-bottom:20px">
      <div class="marks-tests-head"><span class="marks-tests-shield">👩‍🏫</span><h1>Teacher Folder</h1></div>
      <p style="color:var(--gray);font-size:14px;margin:-8px 0 18px">Same as Tests page — Create Own Test, Content Library, and student dashboard</p>
      <div class="marks-tests-hero">
        <div class="mth-card" onclick="QuantrexAssignments.openCreateOwnTest()">
          <div class="mth-body"><strong>Create Own Test</strong><small>Student wala same wizard — exam, chapters, years, assign to batch</small></div>
          <div class="mth-sq mth-sq-blue"></div><span class="mth-arrow">›</span>
        </div>
        <div class="mth-card" onclick="QuantrexAssignments.setTeacherTab('content')">
          <div class="mth-body"><strong>Content Library</strong><small>PDF upload · Video share · Lecture recording links</small></div>
          <div class="mth-sq mth-sq-pink"></div><span class="mth-arrow">›</span>
        </div>
        <div class="mth-card" onclick="QuantrexAssignments.setTeacherTab('students')">
          <div class="mth-body"><strong>Student Dashboard</strong><small>${students.length} students · weak topics · wrong Qs · retest</small></div>
          <div class="mth-sq mth-sq-blue"></div><span class="mth-arrow">›</span>
        </div>
        <div class="mth-card" onclick="QuantrexAssignments.setTeacherTab('banks')">
          <div class="mth-body"><strong>Question Banks</strong><small>JEE · NEET · NDA — assign from all banks</small></div>
          <div class="mth-sq mth-sq-pink"></div><span class="mth-arrow">›</span>
        </div>
        <div class="mth-card" onclick="QuantrexAssignments.setTeacherTab('testseries')">
          <div class="mth-body"><strong>JEE Main New Question Test Series 2027</strong><small>458 tests · Physics · Chem · Math · Part & Full Mocks</small></div>
          <div class="mth-sq mth-sq-blue"></div><span class="mth-arrow">›</span>
        </div>
        <div class="mth-card" onclick="QuantrexAssignments.setTeacherTab('create')">
          <div class="mth-body"><strong>Publish Assignment</strong><small>Publish test, PDF, video, or lecture link</small></div>
          <div class="mth-sq mth-sq-pink"></div><span class="mth-arrow">›</span>
        </div>
      </div>
    </div>`;
    return `${teacherTabsHtml("home")}
    ${folderCards}
    <div class="qx-teach-stats">
      <div class="qx-teach-stat"><span>Exams</span><strong>${typeof QuantrexTeacherCatalog !== "undefined" ? QuantrexTeacherCatalog.examGroups().length : 3}</strong><em>JEE · NEET · NDA · BITSAT…</em></div>
      <div class="qx-teach-stat"><span>Question Banks</span><strong>${stats.banks}</strong><em>${stats.questions.toLocaleString()} questions</em></div>
      <div class="qx-teach-stat"><span>New Q Series 2027</span><strong>${tsCount}</strong><em>JEE Main · chapter & mock tests</em></div>
      <div class="qx-teach-stat"><span>Batches</span><strong>${batches.length}</strong><em>${students.length} students</em></div>
    </div>
    ${examCards ? `<div class="assign-create-box" style="margin-top:16px"><h3>All Exams — Assign to Students</h3><div class="assign-grid">${examCards}</div></div>` : ""}
    <div class="assign-create-box">
      <h3>Default Batch Code</h3>
      <p style="color:var(--gray);font-size:14px;margin:8px 0 12px">Students join via <strong>Batch Code</strong> (StudentBatchMembership). One student can join many batches.</p>
      <div class="assign-join-row">
        <input type="text" class="assign-input" readonly value="${esc(code)}" id="teacherCodeDisplay">
        <button type="button" class="btn-primary sm" onclick="navigator.clipboard.writeText('${esc(code)}');showToast('Batch code copied!')">Copy Code</button>
      </div>
      ${primaryBatch ? `<p style="font-size:13px;color:var(--gray);margin-top:10px">Batch: <strong>${esc(primaryBatch.batchName)}</strong></p>` : ""}
    </div>`;
  }

  let _bankFilterGroup = localStorage.getItem("qx_bank_filter") || "Engineering";

  function filterBanks(groupKey) {
    _bankFilterGroup = groupKey || "Engineering";
    localStorage.setItem("qx_bank_filter", _bankFilterGroup);
    go("teacher");
  }

  async function viewTeacherBanks() {
    if (typeof QuantrexTeacherCatalog === "undefined") {
      return `${teacherTabsHtml("banks")}<div class="empty">Catalog loading…</div>`;
    }
    const groups = QuantrexTeacherCatalog.examGroups();
    const chips = groups.map(g =>
      `<button type="button" class="qx-teach-tab${_bankFilterGroup === g.key ? " on" : ""}" onclick="QuantrexAssignments.filterBanks('${g.key}')">${g.icon} ${g.name}</button>`
    ).join("");
    const banks = QuantrexTeacherCatalog.banksForGroup(_bankFilterGroup);
    const subs = QuantrexTeacherCatalog.subjectsForGroup(_bankFilterGroup).join(" · ");
    const cards = banks.map(b => `<div class="assign-card">
      <div class="assign-card-head"><strong>${esc(b.title)}</strong><span class="tag">${esc(b.examTag)}</span></div>
      <p>${(b.count || 0).toLocaleString()} questions</p>
      <button type="button" class="btn-primary sm" onclick="QuantrexAssignments.startAssignFromBank('${_bankFilterGroup}','${b.slug}')">Assign from Bank →</button>
    </div>`).join("");
    return `${teacherTabsHtml("banks")}
    <div class="assign-create-box">
      <h3>Question Banks — ${_bankFilterGroup}</h3>
      <p style="color:var(--gray);font-size:14px;margin:8px 0 14px">Subjects: ${esc(subs)}</p>
      <div class="qx-teach-tabs" style="flex-wrap:wrap;margin-bottom:16px">${chips}</div>
    </div>
    <div class="assign-grid">${cards || '<div class="empty">No banks for this exam.</div>'}</div>`;
  }

  function startAssignFromBank(examKey, bankSlug) {
    _createDraft.examKey = examKey;
    _createDraft.bankSlug = bankSlug;
    _createDraft.examTag = typeof QuantrexTeacherCatalog !== "undefined"
      ? QuantrexTeacherCatalog.examTagForBank(bankSlug) : examKey;
    _createDraft.sourceType = "bank";
    _createDraft.subject = QuantrexTeacherCatalog.subjectsForGroup(examKey)[0] || "Physics";
    _createStep = 1;
    _teacherTab = "create";
    localStorage.setItem("qx_assign_draft", JSON.stringify(_createDraft));
    go("teacher");
  }

  async function quickAssignTest(testId) {
    const tests = await fetchTestSeriesOptions(_tsFilter);
    const t = tests.find(x => x.id === testId);
    if (!t) { showToast("Test not found"); return; }
    _createDraft.sourceType = "test_series";
    _createDraft.testSeriesTestId = t.id;
    _createDraft.testSeriesTitle = t.title || "";
    _createDraft.testSeriesCategory = t.categoryId || "";
    _createDraft.title = t.title || "Test Series Assignment";
    _createDraft.numQuestions = t.totalQs || 15;
    _createDraft.timeLimitMin = Math.max(15, Math.round((t.totalQs || 15) * 1.2));
    _createDraft.examTag = "JEE";
    _createStep = 2;
    _teacherTab = "create";
    localStorage.setItem("qx_assign_draft", JSON.stringify(_createDraft));
    go("teacher");
  }

  function onExamChange(val) {
    _createDraft.examKey = val;
    _createDraft.bankSlug = typeof QuantrexTeacherCatalog !== "undefined"
      ? QuantrexTeacherCatalog.bankSlugForGroup(val) : "jee_main";
    _createDraft.examTag = QuantrexTeacherCatalog.examTagForBank(_createDraft.bankSlug);
    _createDraft.subject = QuantrexTeacherCatalog.subjectsForGroup(val)[0] || "Physics";
    saveDraft();
    go("teacher");
  }

  function onBankChange(val) {
    _createDraft.bankSlug = val;
    _createDraft.examTag = typeof QuantrexTeacherCatalog !== "undefined"
      ? QuantrexTeacherCatalog.examTagForBank(val) : val;
    saveDraft();
    go("teacher");
  }

  function onTsFilterChange(field, val) {
    _tsFilter[field] = val || "";
    go("teacher");
  }

  async function viewTeacherBatches(teacherId) {
    const bundle = await loadTeacherBundle(teacherId, { submissions: false });
    const batches = bundle.batches || [];
    const countByBatch = {};
    (bundle.students || []).forEach(s => {
      if (s.batchId) countByBatch[s.batchId] = (countByBatch[s.batchId] || 0) + 1;
    });
    const cards = batches.map(b => {
      const n = countByBatch[b.batchId] || 0;
      return `<div class="assign-card qx-click-row" onclick="QuantrexAssignments.openBatchDetail('${esc(b.batchId)}')">
        <div class="assign-card-head"><strong>${esc(b.batchName)}</strong><span class="tag">${esc(b.batchCode)}</span></div>
        <p>${n} students · Click to assign to batch</p>
        <button type="button" class="btn-outline sm" onclick="event.stopPropagation();navigator.clipboard.writeText('${esc(b.batchCode)}');showToast('Copied!')">Copy Code</button>
      </div>`;
    });
    return `${teacherTabsHtml("batches")}
    <div class="assign-create-box" style="margin-bottom:16px">
      <h3>Create New Batch</h3>
      <div class="assign-join-row">
        <input type="text" id="newBatchName" class="assign-input" placeholder="e.g. JEE 2027 — Batch A">
        <button type="button" class="btn-primary sm" onclick="QuantrexAssignments.createBatch()">Create →</button>
      </div>
    </div>
    <div class="assign-grid">${cards.join("") || '<div class="empty">Default batch will appear after teacher login.</div>'}</div>`;
  }

  async function viewBatchDetail(batchId) {
    const teacherId = await requireTeacher();
    const bundle = await loadTeacherBundle(teacherId, { submissions: false });
    const batches = bundle.batches || [];
    const batch = batches.find(b => b.batchId === batchId || b.id === batchId);
    if (!batch) return `${teacherTabsHtml("batches")}<div class="empty">Batch not found.</div>`;

    const members = (bundle.students || []).filter(s => s.batchId === batch.batchId);
    const assignments = bundle.assignments || [];
    const batchAssignments = assignments.filter(a =>
      (a.batchIds || []).includes(batch.batchId) || a.target?.type === "batch" && a.target?.id === batch.batchId
    );

    const memberRows = members.map(m =>
      `<tr class="qx-click-row" onclick="QuantrexAssignments.openStudentDetail('${esc(m.studentId)}')">
        <td><strong>${esc(m.studentName)}</strong></td>
        <td><code>${esc(m.studentCode || "—")}</code></td>
        <td>${fmtDate(m.joinedAt)}</td>
      </tr>`
    ).join("");

    const assignRows = batchAssignments.map(a =>
      `<tr><td>${esc(a.title)}</td><td>${assignmentStatus(a)}</td><td>${(a.visibleToStudents || []).length} students</td></tr>`
    ).join("");

    return `${teacherTabsHtml("batches")}
    <button type="button" class="btn-soft sm" onclick="QuantrexAssignments.closeBatchDetail()" style="margin-bottom:12px">← Back to Batches</button>
    <div class="assign-create-box">
      <h3>${esc(batch.batchName)} <span class="tag">${esc(batch.batchCode)}</span></h3>
      <p style="font-size:13px;color:var(--gray);margin:8px 0 16px">${members.length} students · Assign work to the whole batch at once</p>
      <div class="assign-join-row" style="margin-bottom:16px">
        <button type="button" class="btn-primary sm" onclick="QuantrexAssignments.quickAssignToBatch('${esc(batch.batchId)}')">Assign Test to All →</button>
        <button type="button" class="btn-outline sm" onclick="navigator.clipboard.writeText('${esc(batch.batchCode)}');showToast('Batch code copied!')">Copy Batch Code</button>
      </div>
    </div>
    <div class="assign-create-box">
      <h4>Students in Batch</h4>
      ${members.length
        ? `<table class="ts-table qx-teach-table"><thead><tr><th>Name</th><th>Student Code</th><th>Joined</th></tr></thead><tbody>${memberRows}</tbody></table>`
        : `<div class="empty">No students yet. Share batch code <strong>${esc(batch.batchCode)}</strong></div>`}
    </div>
    <div class="assign-create-box">
      <h4>Batch Assignments</h4>
      ${assignRows
        ? `<table class="ts-table qx-teach-table"><thead><tr><th>Title</th><th>Status</th><th>Reach</th></tr></thead><tbody>${assignRows}</tbody></table>`
        : `<div class="empty">No assignments for this batch yet.</div>`}
    </div>`;
  }

  async function viewTeacherStudents(teacherId) {
    const bundle = await loadTeacherBundle(teacherId, { submissions: true });
    const students = bundle.students || [];
    const assignments = bundle.assignments || [];
    const byKey = bundle.subMap?.byKey || new Map();
    const rows = students.map(s => {
      let done = 0, totalScore = 0, attempts = 0;
      for (const a of assignments) {
        const sub = byKey.get(`${a.id}_${s.studentId}`);
        if (sub) { done++; totalScore += sub.score || 0; attempts++; }
      }
      const avg = attempts ? Math.round(totalScore / attempts) : 0;
      const last = s.lastActiveAt && s.lastActiveAt.toDate ? fmtDate(s.lastActiveAt.toDate()) : "—";
      return `<tr class="qx-click-row" onclick="QuantrexAssignments.openStudentDetail('${s.studentId}')">
        <td><strong>${esc(s.studentName)}</strong><br><small>${esc(s.studentEmail || s.studentMobile || "")}</small></td>
        <td><code style="font-size:12px">${esc(s.studentCode || "—")}</code></td>
        <td>${esc(s.batchName || "Direct")}</td>
        <td>${fmtDate(s.joinedAt)}</td>
        <td>${last}</td>
        <td>${done} / ${assignments.length}</td>
        <td>${avg > 0 ? avg + " avg" : "—"}</td>
      </tr>`;
    });
    return `${teacherTabsHtml("students")}
    <div class="assign-create-box">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <h3 style="margin:0">My Students (${students.length})</h3>
        <button type="button" class="btn-primary sm" onclick="document.getElementById('qxAddStudentBox').classList.toggle('hidden')">+ Add Student</button>
      </div>
      <div id="qxAddStudentBox" class="hidden" style="margin-bottom:16px;padding:14px;border:1px dashed var(--border);border-radius:10px;background:var(--bg)">
        <p style="font-size:13px;color:var(--gray);margin:0 0 10px">Add a student manually — they get a permanent <strong>Student Code</strong> to link their account later. Requires <a href="teacher-login.html">teacher sign in</a> (guest trial cannot save).</p>
        <div class="assign-join-row">
          <input type="text" id="qxAddStudentName" class="assign-input" placeholder="Student name *">
          <input type="email" id="qxAddStudentEmail" class="assign-input" placeholder="Email (optional)">
          <input type="tel" id="qxAddStudentMobile" class="assign-input" placeholder="Mobile (optional)">
          <button type="button" class="btn-primary sm" onclick="QuantrexAssignments.addStudentManual()">Add →</button>
        </div>
      </div>
      <p style="font-size:13px;color:var(--gray);margin:0 0 12px">Click a student for <strong>full dashboard</strong>. Share batch code or student code to link accounts.</p>
      ${students.length ? `<table class="ts-table qx-teach-table"><thead><tr><th>Student</th><th>Code</th><th>Batch</th><th>Joined</th><th>Last active</th><th>Completed</th><th>Score</th></tr></thead><tbody>${rows.join("")}</tbody></table>`
        : `<div class="empty">No students yet. Use <strong>+ Add Student</strong> or share batch code <strong>${esc(QuantrexTeacherAuth.teacherProfileLocal()?.teacherCode)}</strong></div>`}
    </div>`;
  }

  function analyzeStudentPerformance(assignments, submissions) {
    let totalAttempts = 0, totalScore = 0, totalCorrect = 0, totalWrong = 0, totalQs = 0;
    const subjectAgg = {};
    const chapterAgg = {};
    const wrongByQ = {};

    submissions.forEach(({ assignment, sub }) => {
      if (!sub) return;
      totalAttempts++;
      totalScore += sub.score || 0;
      totalCorrect += sub.correct || 0;
      totalWrong += sub.wrong || 0;
      totalQs += (sub.correct || 0) + (sub.wrong || 0) + (sub.skipped || 0);

      const bd = sub.breakdown || {};
      Object.entries(bd.subject || {}).forEach(([subj, v]) => {
        if (!subjectAgg[subj]) subjectAgg[subj] = { correct: 0, wrong: 0, total: 0 };
        subjectAgg[subj].correct += v.correct || 0;
        subjectAgg[subj].wrong += v.wrong || 0;
        subjectAgg[subj].total += v.total || 0;
      });
      Object.entries(bd.chapter || {}).forEach(([ch, v]) => {
        if (!chapterAgg[ch]) chapterAgg[ch] = { correct: 0, wrong: 0, total: 0, subject: v.subject || "" };
        chapterAgg[ch].correct += v.correct || 0;
        chapterAgg[ch].wrong += v.wrong || 0;
        chapterAgg[ch].total += v.total || 0;
        if (v.subject) chapterAgg[ch].subject = v.subject;
      });

      (sub.answers || []).forEach(a => {
        if (!a.wrong) return;
        const qid = String(a.questionId);
        if (!wrongByQ[qid]) {
          wrongByQ[qid] = {
            questionId: qid,
            chapter: a.chapter || "General",
            subject: a.subject || "",
            count: 0,
            assignments: []
          };
        }
        wrongByQ[qid].count++;
        if (assignment && !wrongByQ[qid].assignments.includes(assignment.title)) {
          wrongByQ[qid].assignments.push(assignment.title);
        }
      });
      (sub.wrongQuestionIds || []).forEach(qid => {
        qid = String(qid);
        if (!wrongByQ[qid]) wrongByQ[qid] = { questionId: qid, chapter: "General", subject: "", count: 1, assignments: [assignment?.title || ""] };
      });
    });

    const weakTopics = Object.entries(chapterAgg)
      .filter(([, v]) => v.total >= 2 && (v.wrong / v.total) >= 0.4)
      .map(([chapter, v]) => ({
        chapter,
        subject: v.subject,
        accuracy: v.total ? Math.round(v.correct / v.total * 100) : 0,
        wrong: v.wrong,
        total: v.total,
        questionIds: Object.values(wrongByQ).filter(w => w.chapter === chapter).map(w => w.questionId)
      }))
      .sort((a, b) => a.accuracy - b.accuracy);

    const wrongQuestions = Object.values(wrongByQ).sort((a, b) => b.count - a.count);

    return {
      totalAttempts,
      avgScore: totalAttempts ? Math.round(totalScore / totalAttempts) : 0,
      avgPct: totalQs ? Math.round(totalCorrect / totalQs * 100) : 0,
      totalCorrect,
      totalWrong,
      completed: totalAttempts,
      pending: assignments.length - totalAttempts,
      subjectAgg,
      weakTopics,
      wrongQuestions
    };
  }

  async function viewStudentDetail(studentId) {
    const teacherId = await requireTeacher();
    const bundle = await loadTeacherBundle(teacherId, { submissions: true });
    const assignments = bundle.assignments || [];
    const roster = bundle.students || [];
    const student = roster.find(s => s.studentId === studentId);
    const byKey = bundle.subMap?.byKey || new Map();

    const submissions = assignments.map(a => ({
      assignment: a,
      sub: byKey.get(`${a.id}_${studentId}`) || null
    }));
    const perf = analyzeStudentPerformance(assignments, submissions);

    const kpiHtml = `<div class="qx-teach-stats" style="margin-bottom:20px">
      <div class="qx-teach-stat"><span>Completed</span><strong>${perf.completed}</strong><em>${perf.pending} pending</em></div>
      <div class="qx-teach-stat"><span>Avg Score</span><strong>${perf.avgScore || "—"}</strong><em>${perf.avgPct}% accuracy</em></div>
      <div class="qx-teach-stat"><span>Correct</span><strong>${perf.totalCorrect}</strong><em>${perf.totalWrong} wrong</em></div>
      <div class="qx-teach-stat"><span>Weak Topics</span><strong>${perf.weakTopics.length}</strong><em>needs retest</em></div>
    </div>`;

    const subjBars = Object.entries(perf.subjectAgg).sort((a, b) => b[1].total - a[1].total).map(([name, v]) => {
      const acc = v.total ? Math.round(v.correct / v.total * 100) : 0;
      const col = acc >= 70 ? "#10b981" : acc >= 45 ? "#0d9488" : "#ef4444";
      return `<div class="qx-an-subj-card" style="margin-bottom:8px">
        <div class="qx-an-subj-top"><span>${esc(name)}</span><strong style="color:${col}">${acc}%</strong></div>
        <div class="qx-an-subj-track"><div class="qx-an-subj-fill" style="width:${acc}%;background:${col}"></div></div>
        <small>${v.correct} correct · ${v.wrong} wrong · ${v.total} total</small>
      </div>`;
    }).join("");

    const weakRows = perf.weakTopics.map((t) => {
      const qIds = [...new Set(t.questionIds)].slice(0, 30);
      return `<tr>
        <td><strong>${esc(t.chapter)}</strong><br><small>${esc(t.subject)}</small></td>
        <td style="color:#ef4444">${t.accuracy}%</td>
        <td>${t.wrong}/${t.total}</td>
        <td><button type="button" class="btn-primary sm qx-retest-btn" data-student="${esc(studentId)}" data-qids="${esc(JSON.stringify(qIds))}" data-chapter="${esc(t.chapter)}" data-subject="${esc(t.subject)}">Retest →</button></td>
      </tr>`;
    }).join("");

    const wrongRows = perf.wrongQuestions.slice(0, 25).map(w =>
      `<tr><td>Q ${esc(w.questionId)}</td><td>${esc(w.chapter)}</td><td>${esc(w.subject)}</td><td>${w.count}×</td></tr>`
    ).join("");

    const allWrongIds = [...new Set(perf.wrongQuestions.map(w => w.questionId))].slice(0, 40);
    const retestAllBtn = allWrongIds.length
      ? `<button type="button" class="btn-primary sm qx-retest-btn" style="margin-bottom:12px" data-student="${esc(studentId)}" data-qids="${esc(JSON.stringify(allWrongIds))}" data-chapter="All Wrong Questions" data-subject="">Retest All Wrong Questions (${allWrongIds.length}) →</button>`
      : "";

    const assignRows = submissions.map(({ assignment: a, sub }) =>
      `<tr><td>${esc(a.title)}</td><td>${assignmentStatus(a)}</td><td>${sub ? sub.score + " (" + sub.pct + "%)" : "—"}</td><td>${sub ? (sub.correct || 0) + "✓ " + (sub.wrong || 0) + "✗" : "—"}</td><td>${sub ? Math.round((sub.timeTakenSec || 0) / 60) + " min" : "—"}</td></tr>`
    ).join("");

    let studentCode = student?.studentCode;
    if (!studentCode && typeof QuantrexClassroom !== "undefined") {
      const doc = await QuantrexClassroom.getStudent(studentId);
      studentCode = doc?.studentCode;
    }
    if (!studentCode && typeof QuantrexTeacherAuth.getStudentCode === "function") {
      try { studentCode = await QuantrexTeacherAuth.getStudentCode(studentId); } catch (e) { /* */ }
    }

    return `${teacherTabsHtml("students")}
    <button type="button" class="btn-soft sm" onclick="QuantrexAssignments.setTeacherTab('students')" style="margin-bottom:12px">← Back to Students</button>
    <div class="assign-create-box">
      <h3>📊 ${esc(student?.studentName || "Student")} — Full Dashboard</h3>
      <p style="font-size:13px;color:var(--gray);margin:4px 0 8px">${esc(student?.studentEmail || student?.studentMobile || "")} · Joined ${fmtDate(student?.joinedAt)}</p>
      ${studentCode ? `<p style="font-size:13px;margin:0 0 12px">Student Code: <code style="background:var(--bg);padding:4px 8px;border-radius:6px">${esc(studentCode)}</code>
        <button type="button" class="btn-outline sm" style="margin-left:8px" onclick="navigator.clipboard.writeText('${esc(studentCode)}');showToast('Code copied!')">Copy</button></p>` : ""}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <button type="button" class="btn-primary sm" onclick="QuantrexAssignments.setTeacherTab('create')">Assign Individual Test →</button>
        <button type="button" class="btn-outline sm" onclick="QuantrexAssignments.unlinkStudentFromRoster('${esc(studentId)}','${esc(student?.batchId || "")}')">Unlink Student</button>
      </div>
      ${kpiHtml}
    </div>
    ${subjBars ? `<div class="assign-create-box"><h4>Subject Performance</h4>${subjBars}</div>` : ""}
    <div class="assign-create-box">
      <h4>Weak Topics — Assign Retest</h4>
      <p style="font-size:13px;color:var(--gray);margin:0 0 12px">Chapters with low accuracy (≥2 attempts, &lt;60% correct). Teacher can re-test weak areas.</p>
      ${retestAllBtn}
      ${weakRows ? `<table class="ts-table qx-teach-table"><thead><tr><th>Chapter</th><th>Accuracy</th><th>Wrong/Total</th><th></th></tr></thead><tbody>${weakRows}</tbody></table>`
        : `<div class="empty">No weak topics detected yet — student needs to complete more assignments.</div>`}
    </div>
    ${wrongRows ? `<div class="assign-create-box"><h4>Wrong Questions</h4><table class="ts-table qx-teach-table"><thead><tr><th>Q ID</th><th>Chapter</th><th>Subject</th><th>Missed</th></tr></thead><tbody>${wrongRows}</tbody></table></div>` : ""}
    <div class="assign-create-box">
      <h4>All Assignments</h4>
      <table class="ts-table qx-teach-table"><thead><tr><th>Assignment</th><th>Status</th><th>Score</th><th>Result</th><th>Time</th></tr></thead><tbody>${assignRows}</tbody></table>
    </div>`;
  }

  function assignWeakRetestFromBtn(btn) {
    if (!btn) return;
    let qIds = [];
    try { qIds = JSON.parse(btn.dataset.qids || "[]"); } catch (e) { qIds = []; }
    assignWeakRetest(btn.dataset.student, qIds, btn.dataset.chapter || "", btn.dataset.subject || "");
  }

  async function assignWeakRetest(studentId, questionIds, chapterLabel, subject) {
    const teacherId = await requireTeacher();
    if (!teacherId) { showToast("Teacher login required"); return; }
    const ids = (Array.isArray(questionIds) ? questionIds : []).map(String).filter(Boolean);
    if (!ids.length) { showToast("No wrong questions to retest"); return; }
    const roster = await QuantrexTeacherAuth.listTeacherStudents(teacherId);
    if (!roster.some(s => s.studentId === studentId)) {
      showToast("Student not in your batch");
      return;
    }
    try {
      const title = `Retest — ${chapterLabel || "Weak Topics"}`;
      const payload = {
        title,
        sourceType: "retest",
        questionIds: ids,
        targetStudentIds: [studentId],
        assignToAll: false,
        batchIds: [],
        numQuestions: ids.length,
        timeLimitMin: Math.max(15, Math.min(90, ids.length * 2)),
        subject: subject || "",
        chapter: chapterLabel || "",
        bankSlug: "jee_main",
        shuffle: true,
        marking: { correct: 4, wrong: -1, unattempted: 0 }
      };
      await createAssignment(payload);
      showToast(`Retest assigned: ${ids.length} questions`);
      window._qxStudentDetail = studentId;
      go("teacher");
    } catch (e) {
      showToast("⚠️ " + (e.message || "Retest failed"));
    }
  }

  function applyFromCustomTest(record) {
    if (!record) return;
    _createDraft.sourceType = "custom_test";
    _createDraft.title = record.title || "Assignment";
    _createDraft.examTag = record.examTitle || "JEE";
    _createDraft.examKey = STATE.exam || "Engineering";
    _createDraft.bankSlug = record.examSlug || _createDraft.bankSlug || "jee_main";
    _createDraft.subject = record.subjectTitle || _createDraft.subject;
    _createDraft.chapter = (record.chapters || []).map(c => c.shortName || c.title).join(", ");
    _createDraft.chapterIds = (record.chapters || []).map(c => c.id).filter(Boolean);
    _createDraft.questionIds = record.questionIds || [];
    _createDraft.numQuestions = record.totalQs || _createDraft.questionIds.length;
    _createDraft.timeLimitMin = Math.max(10, Math.round((record.durationSec || 3600) / 60));
    _createDraft.marking = { correct: 4, wrong: -1, unattempted: 0 };
    _createStep = 3;
    _teacherTab = "create";
    localStorage.setItem("qx_assign_draft", JSON.stringify(_createDraft));
    go("teacher");
  }

  function applyFromPdf(meta) {
    applyFromContent({ ...meta, type: "pdf", url: meta.pdfUrl || meta.url });
  }

  function applyFromContent(meta) {
    if (!meta) return;
    const type = meta.type || "pdf";
    const url = meta.url || meta.pdfUrl || "";
    _createDraft.sourceType = type;
    _createDraft.title = meta.title || (type === "video" ? "Video" : type === "lecture_link" ? "Lecture Recording" : "PDF Assignment");
    _createDraft.contentUrl = url;
    _createDraft.pdfUrl = type === "pdf" ? url : null;
    _createDraft.videoUrl = type === "video" ? url : null;
    _createDraft.lectureUrl = type === "lecture_link" ? url : null;
    _createDraft.contentId = meta.id;
    _createDraft.pdfFileId = type === "pdf" ? meta.id : null;
    _createDraft.questionIds = [];
    _createDraft.customQuestions = [];
    _createStep = 3;
    _teacherTab = "create";
    localStorage.setItem("qx_assign_draft", JSON.stringify(_createDraft));
    go("teacher");
  }

  function createFormHtml(students, batches) {
    const batchChecks = (batches || []).map(b =>
      `<label class="qx-check-row"><input type="checkbox" name="qxTargetBatch" value="${b.batchId}" ${_createDraft.assignToAll ? "checked" : (_createDraft.batchIds || []).includes(b.batchId) ? "checked" : ""}/> ${esc(b.batchName)} <small>(${esc(b.batchCode)})</small></label>`
    ).join("");
    const studentChecks = students.map(s =>
      `<label class="qx-check-row"><input type="checkbox" name="qxTargetStudent" value="${s.studentId}" ${_createDraft.assignToAll ? "disabled" : ""}/> ${esc(s.studentName)}</label>`
    ).join("");
    const builtInfo = _createDraft.questionIds?.length
      ? `<p class="qx-muted" style="margin-bottom:12px">✓ ${_createDraft.questionIds.length} questions from builder · ${esc(_createDraft.chapter || "chapters")}</p>`
      : "";
    const contentUrl = _createDraft.contentUrl || _createDraft.pdfUrl || _createDraft.videoUrl || _createDraft.lectureUrl;
    const contentInfo = contentUrl && ["pdf", "video", "lecture_link"].includes(_createDraft.sourceType)
      ? `<p class="qx-muted">${_createDraft.sourceType === "video" ? "🎬" : _createDraft.sourceType === "lecture_link" ? "🔗" : "📄"} <a href="${esc(contentUrl)}" target="_blank">${esc(_createDraft.title)}</a></p>`
      : "";
    return `${teacherTabsHtml("create")}
    <div class="assign-create-box">
      <h3>Publish Assignment — Step ${_createStep} of 3</h3>
      ${_createStep === 1 ? `
        <div class="assign-create-box" style="background:var(--bg);margin-bottom:16px;padding:16px">
          <h4 style="margin:0 0 8px">Recommended — Full Test Builder</h4>
          <p style="font-size:13px;color:var(--gray);margin:0 0 12px">Same as <strong>Create Own Test</strong>: exam → subject → <strong>multiple chapters</strong> → years → Q count & time</p>
          <button type="button" class="btn-primary" onclick="QuantrexTeacherBuilder.start()">Open Test Builder →</button>
        </div>
        <div class="assign-form-grid">
          <input type="text" id="qxAssignTitle" class="assign-input" placeholder="Assignment title" value="${esc(_createDraft.title)}">
          <select id="qxSourceType" class="assign-input" onchange="QuantrexAssignments.onSourceChange(this.value)">
            <option value="bank" ${_createDraft.sourceType === "bank" ? "selected" : ""}>Quick — Question Bank</option>
            <option value="test_series" ${_createDraft.sourceType === "test_series" ? "selected" : ""}>JEE Main New Question Test Series 2027</option>
            <option value="custom" ${_createDraft.sourceType === "custom" ? "selected" : ""}>Type Custom MCQs</option>
            <option value="pdf" ${_createDraft.sourceType === "pdf" ? "selected" : ""}>PDF Assignment</option>
            <option value="video" ${_createDraft.sourceType === "video" ? "selected" : ""}>Video Share</option>
            <option value="lecture_link" ${_createDraft.sourceType === "lecture_link" ? "selected" : ""}>Lecture Recording Link</option>
          </select>
        </div>
        ${builtInfo}${contentInfo}
        <div id="qxSourcePanel">${_createDraft.sourceType === "test_series" ? `<p class="qx-muted">Pick a test on step 2</p>` : ["pdf", "video", "lecture_link"].includes(_createDraft.sourceType) ? `
          <p style="font-size:14px;color:var(--gray);margin:12px 0">Upload PDFs, videos, or lecture links in <strong>Content Library</strong>, then share with batch.</p>
          <button type="button" class="btn-outline sm" onclick="QuantrexAssignments.setTeacherTab('content')">Open Content Library →</button>
          ${contentUrl ? `<p style="margin-top:12px"><a href="${esc(contentUrl)}" target="_blank">${esc(_createDraft.title)}</a></p>` : ""}
        ` : _createDraft.sourceType === "custom" ? `
          <textarea id="qxCustomQ" class="assign-input" rows="4" placeholder="Paste MCQ: question | opt1 | opt2 | opt3 | opt4 | answer(1-4)"></textarea>
          <button type="button" class="btn-soft sm" onclick="QuantrexAssignments.addCustomQuestion()">+ Add question</button>
          <div id="qxCustomList">${(_createDraft.customQuestions || []).map((q, i) => `<div class="qx-pill">${esc((q.q || "").slice(0, 60))}…</div>`).join("")}</div>
        ` : `
          <div class="assign-form-grid">
            <select id="qxExamPick" class="assign-input" onchange="QuantrexAssignments.onExamChange(this.value)">${examSelectHtml(_createDraft.examKey || "Engineering")}</select>
            <select id="qxBankPick" class="assign-input" onchange="QuantrexAssignments.onBankChange(this.value)">${bankSelectHtml(_createDraft.examKey || "Engineering", _createDraft.bankSlug || "jee_main")}</select>
            <select id="qxAssignSubject" class="assign-input">${subjectSelectHtml(_createDraft.examKey || "Engineering", _createDraft.subject)}</select>
            <input type="text" id="qxAssignChapter" class="assign-input" placeholder="Chapter / topic (optional)" value="${esc(_createDraft.chapter)}">
          </div>
          <p class="qx-muted" style="margin-top:8px">Exam tag: <strong>${esc(_createDraft.examTag || "JEE")}</strong> · Bank: <strong>${esc(_createDraft.bankSlug || "jee_main")}</strong></p>
        `}</div>
        <button type="button" class="btn-primary" onclick="QuantrexAssignments.createNext(2)">Next →</button>
      ` : _createStep === 2 ? `
        <div class="assign-form-grid">
          <input type="number" id="qxNumQ" class="assign-input" min="5" max="90" value="${_createDraft.numQuestions}" placeholder="Number of questions">
          <input type="number" id="qxTimeLimit" class="assign-input" min="10" max="180" value="${_createDraft.timeLimitMin}" placeholder="Time (minutes)">
          <input type="datetime-local" id="qxStartAt" class="assign-input" value="${_createDraft.startAt}">
          <input type="datetime-local" id="qxDueAt" class="assign-input" value="${_createDraft.dueAt}">
          <label class="qx-check-row"><input type="checkbox" id="qxShuffle" ${_createDraft.shuffle ? "checked" : ""}/> Shuffle questions</label>
        </div>
        ${_createDraft.sourceType === "test_series" ? `
          <div class="assign-form-grid" style="margin-top:10px">
            <select id="qxTsCategory" class="assign-input" onchange="QuantrexAssignments.onTsFilterChange('categoryId',this.value)">
              <option value="">All categories</option>
              <option value="physics" ${_tsFilter.categoryId === "physics" ? "selected" : ""}>Physics</option>
              <option value="chemistry" ${_tsFilter.categoryId === "chemistry" ? "selected" : ""}>Chemistry</option>
              <option value="mathematics" ${_tsFilter.categoryId === "mathematics" ? "selected" : ""}>Mathematics</option>
              <option value="ept" ${_tsFilter.categoryId === "ept" ? "selected" : ""}>Part Tests</option>
              <option value="eft" ${_tsFilter.categoryId === "eft" ? "selected" : ""}>Full Mock Tests</option>
            </select>
            <input type="text" id="qxTsSearch" class="assign-input" placeholder="Search test name…" value="${esc(_tsFilter.query || "")}" onchange="QuantrexAssignments.onTsFilterChange('query',this.value)">
          </div>
          <select id="qxTestSeriesPick" class="assign-input" style="width:100%;margin-top:10px"><option value="">Select test…</option></select>
        ` : ""}
        <div style="display:flex;gap:10px;margin-top:14px">
          <button type="button" class="btn-soft" onclick="QuantrexAssignments.createPrev(1)">← Back</button>
          <button type="button" class="btn-primary" onclick="QuantrexAssignments.createNext(3)">Next →</button>
        </div>
      ` : `
        <h4 style="margin:0 0 10px">Publish to Batch(es)</h4>
        <p class="qx-muted" style="margin-bottom:10px">AssignmentBatchLink — select which batches receive this assignment.</p>
        <div class="qx-student-picks">${batchChecks || '<p class="empty">Create a batch first (Batches tab).</p>'}</div>
        <label class="qx-check-row" style="margin-top:12px"><input type="checkbox" id="qxAssignAll" ${_createDraft.assignToAll ? "checked" : ""} onchange="document.querySelectorAll('[name=qxTargetStudent]').forEach(c=>c.disabled=this.checked)"/> Or pick individual students (${students.length})</label>
        <div class="qx-student-picks">${studentChecks || '<p class="empty">No students linked yet.</p>'}</div>
        <div style="display:flex;gap:10px;margin-top:14px">
          <button type="button" class="btn-soft" onclick="QuantrexAssignments.createPrev(2)">← Back</button>
          <button type="button" class="btn-primary" onclick="QuantrexAssignments.publishAssignment()">Publish Assignment →</button>
        </div>
      `}
    </div>`;
  }

  async function viewTeacherCreate(teacherId) {
    const bundle = await loadTeacherBundle(teacherId, { submissions: false });
    return createFormHtml(bundle.students || [], bundle.batches || []);
  }

  async function viewTeacherAssignments(teacherId) {
    const bundle = await loadTeacherBundle(teacherId, { submissions: true });
    const list = (bundle.assignments || []).slice(0, 40);
    const byAssignment = bundle.subMap?.byAssignment || new Map();
    const cards = list.map(a => {
      const subs = byAssignment.get(a.id) || [];
      const st = assignmentStatus(a);
      const scores = subs.map(s => s.score || 0);
      const avg = scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : 0;
      return `<div class="assign-card">
        <div class="assign-card-head"><strong>${esc(a.title)}</strong><span class="tag">${st}</span></div>
        <p>${(a.questionIds || []).length} Qs · ${a.timeLimitMinutes || a.timeLimitMin} min · ${subs.length} submitted · class avg ${avg}</p>
        <button type="button" class="btn-outline sm" onclick="QuantrexAssignments.openAssignmentResults('${a.id}')">View Results →</button>
      </div>`;
    });
    return `${teacherTabsHtml("assignments")}
    <div class="assign-grid">${cards.join("") || '<div class="empty">No assignments yet.</div>'}</div>`;
  }

  async function viewAssignmentResults(assignmentId) {
    const teacherId = await requireTeacher();
    const snap = await db().collection("assignments").doc(assignmentId).get();
    if (!snap.exists || snap.data().teacherId !== teacherId) return `<div class="empty">Not found</div>`;
    const a = snap.data();
    const subs = typeof QuantrexClassroom !== "undefined"
      ? await QuantrexClassroom.listSubmissionsForAssignment(assignmentId)
      : (await db().collection("assignments").doc(assignmentId).collection("submissions").get()).docs.map(d => d.data());
    const rows = subs.map((s, i) => {
      return `<tr><td>${i + 1}</td><td>${esc(s.studentName)}</td><td><strong>${s.score}</strong> (${s.pct}%)</td><td>${Math.round((s.timeTakenSec || 0) / 60)} min</td><td>${fmtDate(s.submittedAt)}</td></tr>`;
    });
    return `${teacherTabsHtml("assignments")}
    <button type="button" class="btn-soft sm" onclick="QuantrexAssignments.setTeacherTab('assignments')" style="margin-bottom:12px">← Back</button>
    <div class="assign-create-box">
      <h3>${esc(a.title)} — Leaderboard</h3>
      <table class="ts-table qx-teach-table"><thead><tr><th>#</th><th>Student</th><th>Score</th><th>Time</th><th>Submitted</th></tr></thead><tbody>${rows.join("") || '<tr><td colspan="5" class="empty">No submissions yet</td></tr>'}</tbody></table>
    </div>`;
  }

  async function viewTeacherTestSeries() {
    const m = typeof QuantrexTeacherCatalog !== "undefined"
      ? await QuantrexTeacherCatalog.loadTestSeriesManifest()
      : { title: "JEE Main New Question Test Series 2027", categories: [], tests: [] };
    const cats = (m.categories || []);
    const catCards = cats.map(c => {
      const count = (m.tests || []).filter(t => t.categoryId === c.id && t.status !== "upcoming").length;
      return `<div class="assign-card qx-click-row" onclick="QuantrexAssignments.onTsFilterChange('categoryId','${c.id}');QuantrexAssignments.setTeacherTab('create');QuantrexAssignments.onSourceChange('test_series')">
        <strong>${esc(c.title)}</strong>
        <p>${count} tests · ${esc(c.subject || "All")} · ${esc(c.section || "")}</p>
      </div>`;
    }).join("");
    const tests = await fetchTestSeriesOptions(_tsFilter);
    const testRows = tests.slice(0, 80).map(t =>
      `<tr><td>${esc(t.title)}</td><td>${esc(t.categoryId)}</td><td>${t.totalQs || "—"}</td>
        <td><button type="button" class="btn-outline sm" onclick="QuantrexAssignments.quickAssignTest('${t.id}')">Assign →</button></td></tr>`
    ).join("");
    return `${teacherTabsHtml("testseries")}
    <div class="assign-create-box">
      <h3>${esc(m.title || "JEE Main New Question Test Series 2027")}</h3>
      <p style="color:var(--gray);font-size:14px;margin:8px 0 16px">Quantrex Ultimate Series · 100% new questions (no PYQ) · Physics · Chemistry · Mathematics · Part & Full Mocks — assign any test to your batch.</p>
      <div class="assign-grid" style="margin-bottom:16px">${catCards}</div>
      <div class="assign-form-grid">
        <select class="assign-input" onchange="QuantrexAssignments.onTsFilterChange('categoryId',this.value)">
          <option value="">All subjects</option>
          ${cats.map(c => `<option value="${c.id}" ${_tsFilter.categoryId === c.id ? "selected" : ""}>${esc(c.title)}</option>`).join("")}
        </select>
        <input class="assign-input" placeholder="Search tests…" value="${esc(_tsFilter.query || "")}" onchange="QuantrexAssignments.onTsFilterChange('query',this.value)">
      </div>
      <table class="ts-table qx-teach-table" style="margin-top:14px"><thead><tr><th>Test</th><th>Category</th><th>Qs</th><th></th></tr></thead>
        <tbody>${testRows || '<tr><td colspan="4" class="empty">No tests match filter</td></tr>'}</tbody></table>
      <div style="margin-top:14px">
        <button type="button" class="btn-primary" onclick="QuantrexAssignments.setTeacherTab('create');QuantrexAssignments.onSourceChange('test_series')">Create from Test Series →</button>
        <button type="button" class="btn-outline sm" style="margin-left:10px" onclick="window.open('examgoal-test-series.html','_blank','noopener')">Preview Series</button>
      </div>
    </div>`;
  }

  async function viewTeacher() {
    if (typeof QuantrexTeacherAuth === "undefined") {
      return `${topbar("Quantrex For Teachers", "")}<div class="empty">Teacher module loading… <button class="btn-soft" onclick="go('teacher')">Retry</button></div>`;
    }
    const teacherId = await requireTeacher();
    if (!teacherId) {
      return `${topbar("Quantrex For Teachers", "")}
        <div class="assign-create-box" style="text-align:center;padding:32px">
          <h3>Teacher Login Required</h3>
          <p style="color:var(--gray);margin:12px 0 20px">Your trial has ended. <a href="login.html">Sign in</a> to use the teacher portal.</p>
          <a href="login.html?mode=signin" class="btn-primary" style="display:inline-block;text-decoration:none;padding:12px 24px">Sign In</a>
        </div>`;
    }

    if (_teacherTab === "students" && window._qxStudentDetail) {
      return `${topbar("Quantrex For Teachers", QuantrexTeacherAuth.teacherProfileLocal()?.name || "")}${await viewStudentDetail(window._qxStudentDetail)}`;
    }
    if (_teacherTab === "batches" && window._qxBatchDetail) {
      return `${topbar("Quantrex For Teachers", "")}${await viewBatchDetail(window._qxBatchDetail)}`;
    }
    if (_teacherTab === "results" && window._qxResultAssignment) {
      return `${topbar("Quantrex For Teachers", "")}${await viewAssignmentResults(window._qxResultAssignment)}`;
    }

    let inner = "";
    if (_teacherTab === "batches") inner = await viewTeacherBatches(teacherId);
    else if (_teacherTab === "builder") {
      if (typeof viewTeacherCustomTests === "function") {
        const ctHtml = await viewTeacherCustomTests({
          step: (typeof QuantrexTeacherBuilder !== "undefined" && QuantrexTeacherBuilder.isActive()) ? "wizard" : "landing",
          teacherMode: true
        });
        inner = `${teacherTabsHtml("builder")}<div class="marks-tests-page qx-teach-ct-full">${ctHtml}</div>`;
      } else {
        inner = `${teacherTabsHtml("builder")}<div class="empty">Create Own Test loading… refresh page</div>`;
      }
    } else if (_teacherTab === "content" || _teacherTab === "pdfs") {
      const contentBody = typeof QuantrexTeacherBuilder !== "undefined"
        ? (await QuantrexTeacherBuilder.viewContentLibraryHtml())
        : '<div class="empty">Content library loading…</div>';
      inner = `${teacherTabsHtml("content")}${contentBody}`;
    } else if (_teacherTab === "banks") inner = await viewTeacherBanks();
    else if (_teacherTab === "students") inner = await viewTeacherStudents(teacherId);
    else if (_teacherTab === "create") inner = await viewTeacherCreate(teacherId);
    else if (_teacherTab === "assignments") inner = await viewTeacherAssignments(teacherId);
    else if (_teacherTab === "testseries") inner = await viewTeacherTestSeries();
    else inner = await viewTeacherHome(teacherId);

    return `${topbar("Quantrex For Teachers", QuantrexTeacherAuth.teacherProfileLocal()?.name || "Dashboard")}
      <div class="qx-teach-wrap">${inner}</div>`;
  }

  function studentTabsHtml(active) {
    return `<div class="qx-teach-tabs">
      <button type="button" class="qx-teach-tab${active === "pending" ? " on" : ""}" onclick="QuantrexAssignments.setStudentTab('pending')">Pending / Live</button>
      <button type="button" class="qx-teach-tab${active === "completed" ? " on" : ""}" onclick="QuantrexAssignments.setStudentTab('completed')">Completed</button>
      <button type="button" class="qx-teach-tab${active === "join" ? " on" : ""}" onclick="QuantrexAssignments.setStudentTab('join')">Join Teacher</button>
    </div>`;
  }

  async function viewStudent() {
    const studentId = await requireStudent();
    if (!studentId) {
      return `${topbar("Quantrex Assignments", "")}<div class="empty">Your trial has ended. <a href="login.html">Sign in</a> to continue.</div>`;
    }

    const isGuest = String(studentId).startsWith("guest_");
    if (!isGuest) {
      try {
        await QuantrexTeacherAuth.ensureStudentProfile({ uid: studentId, email: JSON.parse(localStorage.getItem("quantrex_user") || "{}").email, displayName: userName() });
        await QuantrexTeacherAuth.touchStudentActive(studentId);
      } catch (e) { console.warn("student profile:", e.message || e); }
    }

    if (_studentTab === "join") {
      const teachers = await QuantrexTeacherAuth.listStudentTeachers(studentId);
      return `${topbar("Quantrex Assignments", "Classroom learning")}
        ${studentTabsHtml("join")}
        <div class="assign-join-box">
          <h3>Join Teacher Batch</h3>
          <p style="font-size:13px;color:var(--gray);margin-bottom:10px">Enter your teacher's <strong>Batch Code</strong> (e.g. QTX-AB12C) to see assignments here.</p>
          <div class="assign-join-row">
            <input type="text" id="assignTeacherCode" placeholder="Batch code e.g. QTX-AK234" class="assign-input">
            <button type="button" class="btn-primary sm" onclick="QuantrexAssignments.joinTeacher()">Join Batch →</button>
          </div>
          <hr style="margin:20px 0;border:none;border-top:1px solid var(--border)">
          <h4 style="font-size:15px;margin-bottom:8px">Have a personal Student Code?</h4>
          <p style="font-size:13px;color:var(--gray);margin-bottom:10px">Enter the <strong>QTX-STU-####</strong> code from your teacher to link 1:1 (no batch).</p>
          <div class="assign-join-row">
            <input type="text" id="assignStudentCode" placeholder="Student code e.g. QTX-STU-4821" class="assign-input">
            <button type="button" class="btn-outline sm" onclick="QuantrexAssignments.joinStudentCode()">Link Code →</button>
          </div>
          ${teachers.length ? `<p style="margin-top:14px;font-size:14px;color:var(--gray)">Joined: ${teachers.map(t => esc(t.batchName || t.teacherName)).join(", ")}</p>` : ""}
        </div>`;
    }

    const all = await listAssignmentsForStudent(studentId);
    const completed = [];
    const pending = [];
    for (const a of all) {
      const sub = await getSubmission(a.id, studentId);
      if (sub) completed.push({ ...a, sub });
      else pending.push(a);
    }

    const list = _studentTab === "completed" ? completed : pending;
    const cards = list.map(item => {
      const a = item.sub ? item : item;
      const sub = item.sub;
      const st = assignmentStatus(a);
      if (_studentTab === "completed" && sub) {
        return `<div class="assign-card">
          <div class="assign-card-head"><strong>${esc(a.title)}</strong><span class="tag">Done</span></div>
          <p>Score: <strong>${sub.score}</strong> (${sub.pct}%) · ${sub.correct}/${sub.correct + sub.wrong + sub.skipped} correct</p>
          <small>${esc(a.teacherName || "Teacher")} · ${fmtDate(sub.submittedAt)}</small>
        </div>`;
      }
      const contentUrl = a.contentUrl || a.pdfUrl || a.videoUrl || a.lectureUrl;
      const isContent = ["pdf", "video", "lecture_link"].includes(a.sourceType) && contentUrl;
      const contentLabel = a.sourceType === "video" ? "Video" : a.sourceType === "lecture_link" ? "Lecture" : "PDF";
      const openLabel = a.sourceType === "video" ? "Watch Video →" : a.sourceType === "lecture_link" ? "Open Lecture →" : "Open PDF →";
      const btn = st === "live"
        ? (isContent
          ? `<a href="${esc(contentUrl)}" target="_blank" rel="noopener" class="btn-primary sm" style="display:inline-block;text-decoration:none;padding:8px 14px">${openLabel}</a>`
          : `<button type="button" class="btn-primary sm" onclick="QuantrexAssignments.start('${a.id}')">Start →</button>`)
        : `<span class="tag">${st}</span>`;
      return `<div class="assign-card">
        <div class="assign-card-head"><strong>${esc(a.title)}</strong><span class="tag">${isContent ? contentLabel : a.sourceType === "retest" ? "Retest" : st}</span></div>
        <p>${isContent ? contentLabel + " from teacher" : `${(a.questionIds || []).length} questions · ${a.timeLimitMin || 30} min`}</p>
        <small>By ${esc(a.teacherName || "Teacher")}${a.dueAt ? " · Due " + fmtDate(a.dueAt) : ""}</small>
        ${btn}
      </div>`;
    });

    return `${topbar("Student Assignments", "Join batch code · receive tests from your teacher")}
      ${studentTabsHtml(_studentTab)}
      <div class="assign-grid">${cards.join("") || `<div class="empty">No ${_studentTab} assignments.</div>`}</div>`;
  }

  async function viewMain() {
    return viewStudent();
  }

  async function joinTeacher() {
    const code = (document.getElementById("assignTeacherCode")?.value || "").trim();
    if (!code) { showToast("Enter batch code"); return; }
    try {
      const u = JSON.parse(localStorage.getItem("quantrex_user") || "{}");
      await QuantrexTeacherAuth.joinTeacherByCode(uid(), code, { name: u.name, email: u.email });
      clearTeachCache();
      showToast("Joined batch successfully!");
      go("assignments");
    } catch (e) {
      showToast("⚠️ " + (e.message || "Could not join"));
    }
  }

  async function joinStudentCode() {
    const code = (document.getElementById("assignStudentCode")?.value || "").trim();
    if (!code) { showToast("Enter your student code"); return; }
    try {
      const u = JSON.parse(localStorage.getItem("quantrex_user") || "{}");
      const res = await QuantrexTeacherAuth.joinByStudentCode(uid(), code, { name: u.name, email: u.email });
      showToast("Linked! Code: " + (res.studentCode || code));
      go("assignments");
    } catch (e) {
      showToast("⚠️ " + (e.message || "Could not link"));
    }
  }

  function teachWriteBlockedReason(teacherId) {
    if (!teacherId) return "Sign in as a teacher to add students.";
    if (String(teacherId).startsWith("guest_")) {
      return "Guest trial is view-only. Sign in to add students.";
    }
    if (!authReady()) return "Sign in to save students to your account.";
    if (!QuantrexTeacherAuth.isTeacherSession()) {
      return "Activate teacher access first (Teacher Sign In).";
    }
    return null;
  }

  function friendlyFirestoreError(err) {
    const code = err && err.code;
    const msg = (err && err.message) || "";
    if (code === "permission-denied" || /insufficient|permission/i.test(msg)) {
      return "Permission denied. Sign in as teacher and try again.";
    }
    return msg || "Could not save. Try again.";
  }

  async function addStudentManual() {
    const name = (document.getElementById("qxAddStudentName")?.value || "").trim();
    const email = (document.getElementById("qxAddStudentEmail")?.value || "").trim();
    const mobile = (document.getElementById("qxAddStudentMobile")?.value || "").trim();
    if (!name) { showToast("Enter student name"); return; }
    try {
      const teacherId = await requireTeacher();
      const blocked = teachWriteBlockedReason(teacherId);
      if (blocked) { showToast("⚠️ " + blocked); return; }
      const doc = await QuantrexTeacherAuth.addStudentManually(teacherId, { name, email, mobile });
      clearTeachCache();
      showToast("Added! Student code: " + (doc.studentCode || ""));
      document.getElementById("qxAddStudentName").value = "";
      document.getElementById("qxAddStudentEmail").value = "";
      document.getElementById("qxAddStudentMobile").value = "";
      go("teacher");
    } catch (e) {
      console.warn("addStudentManual:", e);
      showToast("⚠️ " + friendlyFirestoreError(e));
    }
  }

  async function quickAssignToBatch(batchId) {
    _createDraft.batchIds = [batchId];
    _createDraft.assignToAll = true;
    _createDraft.targetStudentIds = [];
    saveDraft();
    _teacherTab = "create";
    localStorage.setItem("qx_teacher_tab", "create");
    go("teacher");
    showToast("Select test to assign to batch");
  }

  async function unlinkStudentFromRoster(studentId, batchId) {
    if (!confirm("Unlink this student? Their code and test history are kept.")) return;
    try {
      const teacherId = await requireTeacher();
      if (!teacherId) return;
      await QuantrexTeacherAuth.unlinkStudent(teacherId, studentId, batchId || null);
      clearTeachCache();
      showToast("Student unlinked");
      window._qxStudentDetail = null;
      go("teacher");
    } catch (e) {
      showToast("⚠️ " + (e.message || "Unlink failed"));
    }
  }

  function saveDraft() {
    localStorage.setItem("qx_assign_draft", JSON.stringify(_createDraft));
  }

  function setTeacherTab(tab) {
    _teacherTab = tab;
    localStorage.setItem("qx_teacher_tab", tab);
    window._qxStudentDetail = null;
    window._qxBatchDetail = null;
    window._qxResultAssignment = null;
    go("teacher");
  }

  function openCreateOwnTest() {
    _teacherTab = "builder";
    localStorage.setItem("qx_teacher_tab", "builder");
    window._qxStudentDetail = null;
    window._qxResultAssignment = null;
    go("teacher");
  }

  function openTeacherPortal() {
    _teacherTab = "home";
    localStorage.setItem("qx_teacher_tab", "home");
    window._qxStudentDetail = null;
    window._qxResultAssignment = null;
    if ((location.hash || "").startsWith("#teacher")) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    go("teacher");
  }

  function setStudentTab(tab) {
    _studentTab = tab;
    localStorage.setItem("qx_student_tab", tab);
    go("assignments");
  }

  function onSourceChange(val) {
    _createDraft.sourceType = val;
    saveDraft();
    go("teacher");
  }

  function readCreateStep1() {
    const titleEl = document.getElementById("qxAssignTitle");
    if (titleEl) _createDraft.title = titleEl.value || _createDraft.title;
    const sourceEl = document.getElementById("qxSourceType");
    if (sourceEl) _createDraft.sourceType = sourceEl.value || _createDraft.sourceType;
    if (_createDraft.sourceType === "bank") {
      const examEl = document.getElementById("qxExamPick");
      const bankEl = document.getElementById("qxBankPick");
      const subEl = document.getElementById("qxAssignSubject");
      const chapEl = document.getElementById("qxAssignChapter");
      if (examEl) _createDraft.examKey = examEl.value || _createDraft.examKey;
      if (bankEl) _createDraft.bankSlug = bankEl.value || _createDraft.bankSlug;
      _createDraft.examTag = typeof QuantrexTeacherCatalog !== "undefined"
        ? QuantrexTeacherCatalog.examTagForBank(_createDraft.bankSlug) : _createDraft.examTag;
      if (subEl) _createDraft.subject = subEl.value || _createDraft.subject;
      if (chapEl) _createDraft.chapter = chapEl.value || "";
    }
  }

  async function readCreateStep2() {
    const numEl = document.getElementById("qxNumQ");
    const timeEl = document.getElementById("qxTimeLimit");
    const startEl = document.getElementById("qxStartAt");
    const dueEl = document.getElementById("qxDueAt");
    const shuffleEl = document.getElementById("qxShuffle");
    if (numEl) _createDraft.numQuestions = Number(numEl.value) || 10;
    if (timeEl) _createDraft.timeLimitMin = Number(timeEl.value) || 30;
    if (startEl) _createDraft.startAt = startEl.value || "";
    if (dueEl) _createDraft.dueAt = dueEl.value || "";
    if (shuffleEl) _createDraft.shuffle = shuffleEl.checked !== false;
    const testPick = document.getElementById("qxTestSeriesPick");
    if (testPick && testPick.value) {
      const opt = testPick.selectedOptions[0];
      _createDraft.testSeriesTestId = testPick.value;
      _createDraft.testSeriesTitle = opt.dataset.title || "";
      _createDraft.testSeriesCategory = opt.dataset.cat || "";
      const tests = await fetchTestSeriesOptions(_tsFilter);
      const meta = tests.find(t => t.id === testPick.value) || { id: testPick.value, file: opt.dataset.file, testIndex: opt.dataset.idx, seriesId: "jee_main_examgoal_2027" };
      if (typeof QuantrexTeacherCatalog !== "undefined") {
        const ids = await QuantrexTeacherCatalog.resolveTestQuestionIds(meta);
        _createDraft.questionIds = ids;
        _createDraft.numQuestions = Math.min(_createDraft.numQuestions, ids.length || _createDraft.numQuestions);
      } else {
        _createDraft.questionIds = JSON.parse(opt.dataset.ids || "[]");
      }
    }
  }

  async function createNext(step) {
    const prev = _createStep;
    if (step > prev) {
      if (prev === 1 && step >= 2) readCreateStep1();
      if (prev === 2 && step >= 3) await readCreateStep2();
    }
    _createStep = step;
    saveDraft();
    go("teacher");
  }

  function createPrev(step) {
    _createStep = Math.max(1, Number(step) || 1);
    saveDraft();
    go("teacher");
  }

  function addCustomQuestion() {
    const raw = document.getElementById("qxCustomQ")?.value || "";
    const parts = raw.split("|").map(s => s.trim());
    if (parts.length < 6) { showToast("Format: question | opt1 | opt2 | opt3 | opt4 | answer"); return; }
    const q = { q: parts[0], options: parts.slice(1, 5), answer: Number(parts[5]) - 1, subject: _createDraft.subject };
    _createDraft.customQuestions = _createDraft.customQuestions || [];
    _createDraft.customQuestions.push(q);
    saveDraft();
    go("teacher");
  }

  async function createBatch() {
    const name = document.getElementById("newBatchName")?.value?.trim();
    if (!name) { showToast("Enter batch name"); return; }
    const teacherId = await requireTeacher();
    if (!teacherId || typeof QuantrexClassroom === "undefined") { showToast("Teacher login required"); return; }
    try {
      const b = await QuantrexClassroom.createBatch(teacherId, { batchName: name });
      showToast("Batch created: " + b.batchCode);
      go("teacher");
    } catch (e) {
      showToast("⚠️ " + (e.message || "Failed"));
    }
  }

  async function publishAssignment() {
    try {
      const teacherId = await requireTeacher();
      _createDraft.batchIds = [...document.querySelectorAll("[name=qxTargetBatch]:checked")].map(c => c.value);
      _createDraft.assignToAll = document.getElementById("qxAssignAll")?.checked === true;
      if (!_createDraft.assignToAll) {
        _createDraft.targetStudentIds = [...document.querySelectorAll("[name=qxTargetStudent]:checked")].map(c => c.value);
      }
      if (!_createDraft.batchIds.length && !_createDraft.targetStudentIds.length) {
        _createDraft.assignToAll = true;
      }

      if (_createDraft.sourceType === "custom_test") {
        if (!_createDraft.questionIds.length) throw new Error("Create Own Test — no questions. Rebuild test.");
      } else if (_createDraft.sourceType === "bank") {
        _createDraft.questionIds = await pickBankQuestions(
          _createDraft.subject, _createDraft.chapter, _createDraft.numQuestions, _createDraft.bankSlug
        );
        if (!_createDraft.bankSlug) {
          _createDraft.bankSlug = (PRIMARY_BANK && PRIMARY_BANK[_createDraft.examKey || STATE.exam]) || "jee_main";
        }
        _createDraft.examTag = typeof QuantrexTeacherCatalog !== "undefined"
          ? QuantrexTeacherCatalog.examTagForBank(_createDraft.bankSlug) : _createDraft.examTag;
      } else if (_createDraft.sourceType === "custom") {
        const savedIds = [];
        if (typeof QuantrexClassroom !== "undefined" && teacherId) {
          for (const q of (_createDraft.customQuestions || [])) {
            const doc = await QuantrexClassroom.saveQuestion(teacherId, {
              sourceType: "custom",
              subject: q.subject || _createDraft.subject,
              topic: _createDraft.chapter,
              examTag: STATE.exam === "Medical" ? "NEET" : "JEE",
              questionText: q.q,
              options: q.options,
              correctAnswer: q.answer,
              marks: _createDraft.marking?.correct || 4,
              negativeMarks: Math.abs(_createDraft.marking?.wrong || 1)
            });
            savedIds.push(doc.questionId);
          }
          _createDraft.questionIds = savedIds;
        } else {
          _createDraft.questionIds = (_createDraft.customQuestions || []).map((q, i) => `tq_${uid()}_${i}`);
        }
      } else if (_createDraft.sourceType === "test_series") {
        if (!_createDraft.questionIds.length && _createDraft.testSeriesTestId && typeof QuantrexTeacherCatalog !== "undefined") {
          const tests = await fetchTestSeriesOptions(_tsFilter);
          const meta = tests.find(t => t.id === _createDraft.testSeriesTestId);
          if (meta) _createDraft.questionIds = await QuantrexTeacherCatalog.resolveTestQuestionIds(meta);
        }
        if (!_createDraft.questionIds.length) throw new Error("Select a test from Test Series");
        _createDraft.examTag = "JEE";
      }

      if (["pdf", "video", "lecture_link"].includes(_createDraft.sourceType)) {
        const curl = _createDraft.contentUrl || _createDraft.pdfUrl || _createDraft.videoUrl || _createDraft.lectureUrl;
        if (!curl) throw new Error("Add content first (Content Library tab)");
        _createDraft.contentUrl = curl;
        _createDraft.questionIds = [];
      } else if (_createDraft.sourceType === "retest") {
        if (!_createDraft.questionIds.length) throw new Error("No questions for retest");
      } else if (!_createDraft.questionIds.length && !_createDraft.customQuestions.length) {
        throw new Error("No questions selected — use Build Test tab");
      }

      const a = await createAssignment(_createDraft);
      _createStep = 1;
      _createDraft = { sourceType: "bank", title: "", subject: "Physics", chapter: "", numQuestions: 10, timeLimitMin: 30, assignToAll: true, batchIds: [], shuffle: true, marking: { correct: 4, wrong: -1, unattempted: 0 }, customQuestions: [], questionIds: [] };
      localStorage.removeItem("qx_assign_draft");
      clearTeachCache();
      showToast("Assignment published!");
      window._qxResultAssignment = a.id;
      _teacherTab = "assignments";
      go("teacher");
    } catch (e) {
      showToast("⚠️ " + (e.message || "Publish failed"));
    }
  }

  function openStudentDetail(studentId) {
    window._qxStudentDetail = studentId;
    window._qxBatchDetail = null;
    _teacherTab = "students";
    localStorage.setItem("qx_teacher_tab", "students");
    go("teacher");
  }

  function openBatchDetail(batchId) {
    window._qxBatchDetail = batchId;
    window._qxStudentDetail = null;
    _teacherTab = "batches";
    localStorage.setItem("qx_teacher_tab", "batches");
    go("teacher");
  }

  function closeBatchDetail() {
    window._qxBatchDetail = null;
    go("teacher");
  }

  function openAssignmentResults(assignmentId) {
    window._qxResultAssignment = assignmentId;
    _teacherTab = "results";
    go("teacher");
  }

  function bind(root) {
    (root || document).querySelectorAll(".qx-retest-btn").forEach(btn => {
      btn.onclick = () => assignWeakRetestFromBtn(btn);
    });
    if (_createStep === 2 && _createDraft.sourceType === "test_series") {
      fetchTestSeriesOptions(_tsFilter).then(tests => {
        const sel = document.getElementById("qxTestSeriesPick");
        if (!sel) return;
        sel.innerHTML = '<option value="">Select test…</option>' + tests.map(t =>
          `<option value="${t.id}" data-title="${esc(t.title)}" data-cat="${t.categoryId}" data-file="${esc(t.file || "")}" data-idx="${t.testIndex ?? ""}">${esc(t.title)} (${t.totalQs || "?"} Qs · ${t.categoryId})</option>`
        ).join("");
        if (_createDraft.testSeriesTestId) sel.value = _createDraft.testSeriesTestId;
      });
    }
  }

  return {
    viewMain, viewStudent, viewTeacher, start, joinTeacher, joinStudentCode, addStudentManual, createBatch, bind,
    setTeacherTab, setStudentTab, onSourceChange, onExamChange, onBankChange, onTsFilterChange,
    teacherTabsHtml,
    filterBanks, startAssignFromBank, quickAssignTest, quickAssignToBatch, applyFromCustomTest, applyFromPdf, applyFromContent,
    createNext, createPrev, addCustomQuestion, publishAssignment, assignWeakRetest, assignWeakRetestFromBtn, openCreateOwnTest, openTeacherPortal,
    openStudentDetail, openBatchDetail, closeBatchDetail, unlinkStudentFromRoster, openAssignmentResults
  };
})();

async function viewAssignments() { return QuantrexAssignments.viewMain(); }
async function viewTeacherPortal() {
  return QuantrexAssignments.viewTeacher();
}
window.QuantrexAssignments = QuantrexAssignments;