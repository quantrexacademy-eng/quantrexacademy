// Quantrex Assignments — student + teacher (MARKS-style, Firestore-backed)
const QuantrexAssignments = (() => {
  let _role = localStorage.getItem("quantrex_assign_role") || "student";

  function db() {
    return typeof QuantrexDB !== "undefined" && QuantrexDB.db ? QuantrexDB.db : null;
  }

  function uid() {
    return typeof QuantrexDB !== "undefined" ? QuantrexDB.uid : null;
  }

  function userName() {
    try {
      const u = JSON.parse(localStorage.getItem("quantrex_user") || "null");
      return (u && (u.name || u.email)) || "Student";
    } catch (e) { return "Student"; }
  }

  function genCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  async function listAssignmentsForStudent() {
    const database = db();
    const id = uid();
    if (!database || !id) return [];
    const snap = await database.collection("assignments").where("active", "==", true).limit(50).get();
    const mine = [];
    snap.forEach(doc => {
      const d = doc.data();
      if ((d.attempts || {})[id]) return;
      mine.push({ id: doc.id, ...d });
    });
    return mine.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async function listTeacherAssignments() {
    const database = db();
    const id = uid();
    if (!database || !id) return [];
    const snap = await database.collection("assignments").where("teacherUid", "==", id).limit(50).get();
    const rows = [];
    snap.forEach(doc => rows.push({ id: doc.id, ...doc.data() }));
    return rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async function findByCode(code) {
    const database = db();
    if (!database || !code) return null;
    const snap = await database.collection("assignments").where("code", "==", String(code).trim().toUpperCase()).where("active", "==", true).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async function createAssignment({ title, subject, chapter, questionIds, durationMin }) {
    const database = db();
    const id = uid();
    if (!database || !id) throw new Error("Login required");
    const code = genCode();
    const payload = {
      title: title || "Chapter Assignment",
      subject: subject || "Physics",
      chapter: chapter || "",
      questionIds: questionIds || [],
      code,
      teacherUid: id,
      teacherName: userName(),
      active: true,
      durationMin: Number(durationMin) || 30,
      attempts: {},
      createdAt: Date.now()
    };
    const ref = await database.collection("assignments").add(payload);
    return { id: ref.id, ...payload };
  }

  async function submitAttempt(assignmentId, answers, score) {
    const database = db();
    const id = uid();
    if (!database || !id || !assignmentId) return false;
    await database.collection("assignments").doc(assignmentId).set({
      attempts: { [id]: { score, answers, submittedAt: Date.now(), name: userName() } }
    }, { merge: true });
    return true;
  }

  function rolePickerHtml() {
    return `<div class="assign-role-row">
      <button type="button" class="assign-role-btn${_role === "student" ? " on" : ""}" data-assign-role="student">👨‍🎓 I am a Student</button>
      <button type="button" class="assign-role-btn${_role === "teacher" ? " on" : ""}" data-assign-role="teacher">👩‍🏫 I am a Teacher</button>
    </div>`;
  }

  async function viewStudent() {
    const list = await listAssignmentsForStudent();
    const cards = list.map(a => `
      <div class="assign-card">
        <div class="assign-card-head">
          <strong>${a.title}</strong>
          <span class="tag">${a.subject}</span>
        </div>
        <p>${a.chapter || "Mixed chapter"} · ${(a.questionIds || []).length} questions · ${a.durationMin || 30} min</p>
        <small>By ${a.teacherName || "Teacher"} · Code <b>${a.code}</b></small>
        <button type="button" class="btn-primary sm" onclick="QuantrexAssignments.start('${a.id}')">Start Assignment →</button>
      </div>`).join("");
    return `${topbar("Quantrex Assignments", "Classroom learning — MARKS style")}
      ${rolePickerHtml()}
      <div class="assign-join-box">
        <h3>Join with code</h3>
        <div class="assign-join-row">
          <input type="text" id="assignJoinCode" placeholder="Enter 6-digit code" maxlength="8" class="assign-input">
          <button type="button" class="btn-primary sm" onclick="QuantrexAssignments.joinByCode()">Join →</button>
        </div>
      </div>
      <h3 class="sec-title">Available assignments</h3>
      <div class="assign-grid">${cards || '<div class="empty">No assignments yet. Ask your teacher for a code.</div>'}</div>`;
  }

  async function viewTeacher() {
    const list = await listTeacherAssignments();
    const subs = (typeof EXAMS !== "undefined" && EXAMS[STATE.exam]) ? EXAMS[STATE.exam].subjects : ["Physics", "Chemistry", "Mathematics"];
    const subOpts = subs.map(s => `<option value="${s}">${s}</option>`).join("");
    const cards = list.map(a => {
      const attempts = Object.keys(a.attempts || {}).length;
      return `<div class="assign-card">
        <div class="assign-card-head"><strong>${a.title}</strong><span class="tag">${a.code}</span></div>
        <p>${a.subject} · ${(a.questionIds || []).length} Qs · ${attempts} submission${attempts === 1 ? "" : "s"}</p>
        <button type="button" class="btn-outline sm" onclick="navigator.clipboard.writeText('${a.code}');showToast('Code copied!')">Copy code</button>
      </div>`;
    }).join("");
    return `${topbar("Quantrex For Teachers", "Create & share live assignments")}
      ${rolePickerHtml()}
      <div class="assign-create-box">
        <h3>Create new assignment</h3>
        <div class="assign-form-grid">
          <input type="text" id="assignTitle" placeholder="Assignment title" class="assign-input" value="Chapter Test">
          <select id="assignSubject" class="assign-input">${subOpts}</select>
          <input type="text" id="assignChapter" placeholder="Chapter name (optional)" class="assign-input">
          <input type="number" id="assignCount" placeholder="Questions" class="assign-input" value="10" min="5" max="30">
          <input type="number" id="assignMins" placeholder="Minutes" class="assign-input" value="30" min="10" max="180">
        </div>
        <button type="button" class="btn-primary" onclick="QuantrexAssignments.createFromForm()">Create &amp; Get Share Code →</button>
      </div>
      <h3 class="sec-title">Your assignments</h3>
      <div class="assign-grid">${cards || '<div class="empty">No assignments created yet.</div>'}</div>`;
  }

  async function viewMain() {
    if (!uid()) {
      return `${topbar("Assignments", "")}<div class="empty">Please login to use Assignments.</div>`;
    }
    return _role === "teacher" ? viewTeacher() : viewStudent();
  }

  async function createFromForm() {
    if (!uid()) { showToast("⚠️ Login required"); return; }
    const subject = document.getElementById("assignSubject")?.value || "Physics";
    const chapter = document.getElementById("assignChapter")?.value || "";
    const count = Math.min(30, Math.max(5, Number(document.getElementById("assignCount")?.value) || 10));
    const slug = (typeof PRIMARY_BANK !== "undefined" && PRIMARY_BANK[STATE.exam]) || "jee_main";
    if (!_banksLoaded[slug]) await loadSingleBank(slug);
    let pool = QUESTIONS.filter(q => q._bank === slug && q.subject === subject);
    if (chapter) pool = pool.filter(q => q.chapter === chapter);
    if (!pool.length) pool = QUESTIONS.filter(q => q._bank === slug).slice(0, 200);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const ids = shuffled.slice(0, count).map(q => q.id);
    try {
      const a = await createAssignment({
        title: document.getElementById("assignTitle")?.value || "Chapter Assignment",
        subject,
        chapter,
        questionIds: ids,
        durationMin: Number(document.getElementById("assignMins")?.value) || 30
      });
      showToast(`✅ Created! Share code: ${a.code}`);
      go("teacher");
    } catch (e) {
      showToast("⚠️ " + (e.message || "Could not create"));
    }
  }

  async function joinByCode() {
    const code = (document.getElementById("assignJoinCode")?.value || "").trim();
    if (!code) { showToast("Enter a code"); return; }
    const a = await findByCode(code);
    if (!a) { showToast("⚠️ Invalid or expired code"); return; }
    start(a.id);
  }

  async function start(assignmentId) {
    const database = db();
    if (!database) return;
    const snap = await database.collection("assignments").doc(assignmentId).get();
    if (!snap.exists) { showToast("Assignment not found"); return; }
    const a = snap.data();
    const ids = (a.questionIds || []).map(Number).filter(n => !isNaN(n));
    const validIds = ids.filter(id => QUESTIONS.some(q => q.id === id));
    if (!validIds.length) { showToast("⚠️ Questions unavailable"); return; }
    const slug = (typeof PRIMARY_BANK !== "undefined" && PRIMARY_BANK[STATE.exam]) || "jee_main";
    if (!_banksLoaded[slug]) await loadSingleBank(slug);
    startTest(validIds, a.title, "assignments", {
      testType: "assignment",
      timed: true,
      durationSec: (a.durationMin || 30) * 60,
      modeLabel: `Assignment · ${a.code}`,
      marksMode: true,
      onComplete: async (data) => {
        await submitAttempt(assignmentId, {}, data.score || 0);
        showToast("✅ Assignment submitted!");
      }
    });
  }

  function bind(root) {
    (root || document).querySelectorAll("[data-assign-role]").forEach(btn => {
      btn.onclick = () => {
        _role = btn.dataset.assignRole;
        localStorage.setItem("quantrex_assign_role", _role);
        go(_role === "teacher" ? "teacher" : "assignments");
      };
    });
  }

  return { viewMain, viewStudent, viewTeacher, createFromForm, joinByCode, start, bind };
})();

async function viewAssignments() { return QuantrexAssignments.viewMain(); }
async function viewTeacherPortal() { localStorage.setItem("quantrex_assign_role", "teacher"); return QuantrexAssignments.viewTeacher(); }