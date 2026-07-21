// Quantrex — Teacher & Student portal auth (Firestore-backed, isolated sessions)
const QuantrexTeacherAuth = (() => {
  const PORTAL_KEY = "quantrex_portal";
  const TEACHER_PROFILE_KEY = "quantrex_teacher_profile";

  function db() {
    return typeof QuantrexDB !== "undefined" && QuantrexDB.db ? QuantrexDB.db : null;
  }

  function auth() {
    return typeof QuantrexDB !== "undefined" && QuantrexDB.auth ? QuantrexDB.auth : null;
  }

  function uid() {
    return typeof QuantrexDB !== "undefined" ? QuantrexDB.uid : null;
  }

  function genTeacherCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "QTX-";
    for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  async function uniqueTeacherCode() {
    const database = db();
    if (!database) return genTeacherCode();
    try {
      for (let i = 0; i < 8; i++) {
        const code = genTeacherCode();
        const snap = await database.collection("teachers")
          .where("teacherCode", "==", code)
          .where("status", "==", "active")
          .limit(1).get();
        if (snap.empty) return code;
      }
    } catch (e) {
      console.warn("Teacher code lookup:", e.message || e);
    }
    return genTeacherCode() + String(Date.now()).slice(-2);
  }

  function setPortal(type, profile) {
    localStorage.setItem(PORTAL_KEY, type);
    if (type === "teacher" && profile) {
      localStorage.setItem(TEACHER_PROFILE_KEY, JSON.stringify(profile));
    } else if (type === "student") {
      localStorage.removeItem(TEACHER_PROFILE_KEY);
    }
  }

  function portal() {
    return localStorage.getItem(PORTAL_KEY) || "student";
  }

  function isTeacherSession() {
    return portal() === "teacher" && !!localStorage.getItem(TEACHER_PROFILE_KEY);
  }

  function teacherProfileLocal() {
    try { return JSON.parse(localStorage.getItem(TEACHER_PROFILE_KEY) || "null"); }
    catch (e) { return null; }
  }

  async function getTeacherDoc(teacherUid) {
    const database = db();
    if (!database || !teacherUid) return null;
    try {
      const snap = await database.collection("teachers").doc(teacherUid).get();
      return snap.exists ? { id: snap.id, ...snap.data() } : null;
    } catch (e) {
      console.warn("getTeacherDoc:", e.message || e);
      return null;
    }
  }

  async function isTeacher(teacherUid) {
    try {
      const doc = await getTeacherDoc(teacherUid || uid());
      return !!(doc && doc.status === "active");
    } catch (e) {
      console.warn("isTeacher:", e.message || e);
      return false;
    }
  }

  function sanitizeProfile(profile) {
    if (!profile) return null;
    return {
      uid: profile.uid,
      name: profile.name,
      email: profile.email || null,
      mobile: profile.mobile || null,
      teacherCode: profile.teacherCode,
      status: profile.status || "active"
    };
  }

  async function waitForCurrentUser(maxMs) {
    const a = auth();
    if (!a) return null;
    if (a.currentUser) return a.currentUser;
    const limit = maxMs || 5000;
    return new Promise(resolve => {
      const timer = setTimeout(() => resolve(a.currentUser || null), limit);
      const unsub = a.onAuthStateChanged(user => {
        if (user) {
          clearTimeout(timer);
          unsub();
          resolve(user);
        }
      });
    });
  }

  async function waitAuthToken(user) {
    if (user && user.getIdToken) await user.getIdToken(true);
  }

  async function saveTeacherSession(user, profile) {
    const localProfile = sanitizeProfile(profile);
    setPortal("teacher", localProfile);
    localStorage.setItem("quantrex_user", JSON.stringify({
      uid: user.uid,
      email: user.email,
      name: localProfile.name,
      role: "teacher",
      teacherCode: localProfile.teacherCode,
      loggedAt: Date.now()
    }));
    return localProfile;
  }

  async function provisionTeacherProfile(user, { name, email, mobile, subjects }) {
    const database = db();
    if (!database || !user || !user.uid) throw new Error("Firebase not ready");
    await waitAuthToken(user);
    const existing = await getTeacherDoc(user.uid);
    if (existing && existing.status === "active") {
      await saveTeacherSession(user, existing);
      return existing;
    }

    const teacherName = (name || user.displayName || (email || user.email || "").split("@")[0] || "Teacher").trim();
    const teacherCode = existing?.teacherCode || await uniqueTeacherCode();
    let profile;
    if (typeof QuantrexClassroom !== "undefined") {
      profile = await QuantrexClassroom.upsertTeacher(user.uid, {
        name: teacherName,
        email: (email || user.email || "").trim().toLowerCase(),
        mobile: mobile || null,
        subjects: subjects || ["Physics", "Chemistry", "Mathematics"],
        teacherCode,
        status: "active"
      });
      const batch = await QuantrexClassroom.ensureDefaultBatch(user.uid, teacherName);
      profile = { ...profile, uid: user.uid, teacherCode: batch?.batchCode || teacherCode, defaultBatchId: batch?.batchId };
    } else {
      profile = {
        uid: user.uid,
        teacherId: user.uid,
        name: teacherName,
        email: (email || user.email || "").trim().toLowerCase(),
        mobile: mobile || null,
        teacherCode,
        status: "active",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (!existing) profile.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await database.collection("teachers").doc(user.uid).set(profile, { merge: true });
    }
    if (name && user.updateProfile) {
      try { await user.updateProfile({ displayName: name.trim() }); } catch (e) { /* */ }
    }
    const out = { ...profile, uid: user.uid, teacherCode: profile.teacherCode || teacherCode };
    await saveTeacherSession(user, out);
    return out;
  }

  async function signUpTeacher({ name, email, password, mobile }) {
    const a = auth();
    if (!a || !db()) throw new Error("Firebase not ready");
    const mail = email.trim();
    try {
      const cred = await a.createUserWithEmailAndPassword(mail, password);
      return await provisionTeacherProfile(cred.user, { name, email: mail, mobile });
    } catch (err) {
      if (err && err.code === "auth/email-already-in-use") {
        const cred = await a.signInWithEmailAndPassword(mail, password);
        const doc = await getTeacherDoc(cred.user.uid);
        if (doc && doc.status === "active") {
          await saveTeacherSession(cred.user, doc);
          return { ...doc, _linked: true };
        }
        return await provisionTeacherProfile(cred.user, { name, email: mail, mobile });
      }
      throw err;
    }
  }

  async function signInTeacher(email, password, opts) {
    const a = auth();
    if (!a) throw new Error("Firebase not ready");
    const cred = await a.signInWithEmailAndPassword(email.trim(), password);
    await waitAuthToken(cred.user);
    let doc = await getTeacherDoc(cred.user.uid);
    if (!doc && opts && opts.provisionIfMissing) {
      doc = await provisionTeacherProfile(cred.user, {
        name: opts.name,
        email: email.trim(),
        mobile: opts.mobile
      });
      return doc;
    }
    if (!doc) {
      throw new Error("Teacher profile not set up. Use Sign Up with the same email and password as your student account.");
    }
    if (doc.status !== "active") throw new Error("Teacher account pending approval. Contact Quantrex Academy.");
    await saveTeacherSession(cred.user, doc);
    return doc;
  }

  async function signOutTeacher() {
    setPortal("student");
    if (typeof QuantrexDB !== "undefined" && QuantrexDB.signOut) {
      await QuantrexDB.signOut();
    }
  }

  async function ensureStudentProfile(user, extra) {
    if (!user || !user.uid) return null;
    await waitAuthToken(user);
    const payload = {
      name: (extra && extra.name) || user.displayName || user.email || "Student",
      email: user.email || null,
      mobile: (extra && extra.mobile) || user.phoneNumber || null
    };
    if (typeof QuantrexClassroom !== "undefined") {
      await QuantrexClassroom.upsertStudent(user.uid, payload);
      await QuantrexClassroom.ensureStudentCode(user.uid);
    } else {
      const database = db();
      if (!database) return null;
      await database.collection("students").doc(user.uid).set({
        uid: user.uid,
        studentId: user.uid,
        ...payload,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    setPortal("student");
    return { studentId: user.uid, uid: user.uid, ...payload };
  }

  async function findTeacherByCode(code) {
    const database = db();
    if (!database || !code) return null;
    const normalized = String(code).trim().toUpperCase().replace(/\s+/g, "");
    const snap = await database.collection("teachers")
      .where("teacherCode", "==", normalized)
      .where("status", "==", "active")
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async function joinTeacherByCode(studentUid, code, studentMeta) {
    if (!studentUid || !code) throw new Error("Invalid join request");
    const a = auth();
    if (a && a.currentUser) await waitAuthToken(a.currentUser);
    if (typeof QuantrexClassroom !== "undefined") {
      const { batch } = await QuantrexClassroom.joinBatch(studentUid, code, studentMeta);
      const teacher = await getTeacherDoc(batch.teacherId);
      return { ...teacher, batchCode: batch.batchCode, batchName: batch.batchName, batchId: batch.batchId };
    }
    const database = db();
    if (!database) throw new Error("Firebase not ready");
    const teacher = await findTeacherByCode(code);
    if (!teacher) throw new Error("Invalid batch code. Check with your teacher.");
    const linkId = `${teacher.uid}_${studentUid}`;
    await database.collection("teacher_roster").doc(linkId).set({
      teacherId: teacher.uid,
      studentId: studentUid,
      teacherName: teacher.name,
      teacherCode: teacher.teacherCode,
      studentName: (studentMeta && studentMeta.name) || "Student",
      studentEmail: (studentMeta && studentMeta.email) || null,
      studentMobile: (studentMeta && studentMeta.mobile) || null,
      joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastActiveAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return teacher;
  }

  async function joinBatchByCode(studentUid, code, studentMeta) {
    return joinTeacherByCode(studentUid, code, studentMeta);
  }

  async function addStudentManually(teacherId, { name, email, mobile }) {
    if (!teacherId) throw new Error("Teacher required");
    if (typeof QuantrexClassroom !== "undefined" && QuantrexClassroom.createManualStudent) {
      return QuantrexClassroom.createManualStudent(teacherId, { name, email, mobile });
    }
    throw new Error("Classroom module not loaded");
  }

  async function joinByStudentCode(studentUid, studentCode, studentMeta) {
    if (!studentUid || !studentCode) throw new Error("Invalid request");
    const a = auth();
    if (a && a.currentUser) await waitAuthToken(a.currentUser);
    if (typeof QuantrexClassroom !== "undefined" && QuantrexClassroom.claimStudentByCode) {
      return QuantrexClassroom.claimStudentByCode(studentUid, studentCode, studentMeta);
    }
    throw new Error("Classroom module not loaded");
  }

  async function unlinkStudent(teacherId, studentId, batchId) {
    if (typeof QuantrexClassroom !== "undefined" && QuantrexClassroom.unlinkStudentFromTeacher) {
      return QuantrexClassroom.unlinkStudentFromTeacher(teacherId, studentId, batchId);
    }
    return false;
  }

  async function getStudentCode(studentId) {
    if (typeof QuantrexClassroom !== "undefined" && QuantrexClassroom.ensureStudentCode) {
      return QuantrexClassroom.ensureStudentCode(studentId);
    }
    return null;
  }

  async function listTeacherStudents(teacherId) {
    if (typeof QuantrexClassroom !== "undefined") {
      if (QuantrexClassroom.listStudentsForTeacher) {
        return QuantrexClassroom.listStudentsForTeacher(teacherId);
      }
      const rows = await QuantrexClassroom.listMembershipsForTeacher(teacherId);
      return rows.map(r => ({
        id: r.id,
        studentId: r.studentId,
        studentName: r.studentName,
        studentEmail: r.studentEmail,
        studentMobile: r.studentMobile,
        studentCode: r.studentCode || null,
        batchId: r.batchId,
        batchName: r.batchName,
        batchCode: r.batchCode,
        linkType: "batch",
        joinedAt: r.joinedAt,
        lastActiveAt: r.lastActiveAt
      }));
    }
    const database = db();
    if (!database || !teacherId) return [];
    try {
      const snap = await database.collection("teacher_roster").where("teacherId", "==", teacherId).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { return []; }
  }

  async function listStudentTeachers(studentId) {
    if (typeof QuantrexClassroom !== "undefined") {
      const rows = await QuantrexClassroom.listMembershipsForStudent(studentId);
      return rows.map(r => ({
        id: r.id,
        teacherId: r.teacherId,
        teacherName: r.batchName || "Class",
        teacherCode: r.batchCode,
        batchId: r.batchId,
        batchName: r.batchName,
        joinedAt: r.joinedAt
      }));
    }
    const database = db();
    if (!database || !studentId) return [];
    const snap = await database.collection("teacher_roster").where("studentId", "==", studentId).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function listTeacherBatches(teacherId) {
    if (typeof QuantrexClassroom !== "undefined") {
      return QuantrexClassroom.listBatchesForTeacher(teacherId);
    }
    return [];
  }

  async function touchStudentActive(studentId) {
    if (typeof QuantrexClassroom !== "undefined") {
      return QuantrexClassroom.touchStudentActive(studentId);
    }
    const database = db();
    if (!database || !studentId) return;
    const snap = await database.collection("teacher_roster").where("studentId", "==", studentId).get();
    const batch = database.batch();
    snap.docs.forEach(doc => {
      batch.update(doc.ref, { lastActiveAt: firebase.firestore.FieldValue.serverTimestamp() });
    });
    if (snap.docs.length) await batch.commit();
  }

  async function resolveSessionTeacher() {
    const id = uid();
    if (!id) return null;
    if (isTeacherSession()) return getTeacherDoc(id);
    return null;
  }

  /** Same Firebase login as student — adds teacher profile on existing account (no second email). */
  async function activateTeacherFromCurrentUser(extra) {
    const user = await waitForCurrentUser(6000);
    if (!user || !db()) return null;
    await waitAuthToken(user);
    let doc = await getTeacherDoc(user.uid);
    if (doc && doc.status === "active") {
      await saveTeacherSession(user, doc);
      return doc;
    }
    return await provisionTeacherProfile(user, {
      name: (extra && extra.name) || user.displayName,
      email: user.email,
      mobile: extra && extra.mobile
    });
  }

  return {
    genTeacherCode,
    portal,
    setPortal,
    isTeacherSession,
    teacherProfileLocal,
    getTeacherDoc,
    isTeacher,
    provisionTeacherProfile,
    signUpTeacher,
    signInTeacher,
    signOutTeacher,
    ensureStudentProfile,
    findTeacherByCode,
    joinTeacherByCode,
    joinBatchByCode,
    addStudentManually,
    joinByStudentCode,
    unlinkStudent,
    getStudentCode,
    listTeacherStudents,
    listStudentTeachers,
    listTeacherBatches,
    touchStudentActive,
    resolveSessionTeacher,
    activateTeacherFromCurrentUser,
    waitForCurrentUser,
    sanitizeProfile
  };
})();