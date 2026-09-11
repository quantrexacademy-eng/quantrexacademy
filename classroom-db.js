// Quantrex Classroom — Firestore schema layer
// Auth passwords live in Firebase Auth (not password_hash in Firestore).
//
// Teacher        → teachers/{teacherId}
// Batch          → batches/{batchId}
// Student        → students/{studentId}
// Membership     → student_batch_memberships/{batchId_studentId}
// Question       → questions/{questionId}
// Assignment     → assignments/{assignmentId}
// BatchLink      → assignment_batch_links/{assignmentId_batchId}
// TeacherLink    → teacher_student_links/{teacherId_studentId}
// Submission     → submissions/{assignmentId_studentId}

const QuantrexClassroom = (() => {
  const COL = {
    teachers: "teachers",
    batches: "batches",
    students: "students",
    memberships: "student_batch_memberships",
    teacherLinks: "teacher_student_links",
    questions: "questions",
    assignments: "assignments",
    batchLinks: "assignment_batch_links",
    submissions: "submissions"
  };

  function db() {
    return typeof QuantrexDB !== "undefined" && QuantrexDB.db ? QuantrexDB.db : null;
  }

  function ts() {
    return firebase.firestore.FieldValue.serverTimestamp();
  }

  function genBatchCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "QTX-";
    for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  async function uniqueBatchCode() {
    const database = db();
    if (!database) return genBatchCode();
    try {
      for (let i = 0; i < 10; i++) {
        const code = genBatchCode();
        const snap = await database.collection(COL.batches)
          .where("batchCode", "==", code).limit(1).get();
        if (snap.empty) return code;
      }
    } catch (e) {
      console.warn("batchCode lookup:", e.message || e);
    }
    return genBatchCode() + String(Date.now()).slice(-2);
  }

  // ─── Teacher ───────────────────────────────────────────────
  async function upsertTeacher(teacherId, data) {
    const database = db();
    if (!database || !teacherId) return null;
    const payload = {
      teacherId,
      name: data.name,
      email: (data.email || "").toLowerCase(),
      mobile: data.mobile || null,
      subjects: Array.isArray(data.subjects) ? data.subjects : (data.subjects ? [data.subjects] : []),
      status: data.status || "active",
      updatedAt: ts()
    };
    const ref = database.collection(COL.teachers).doc(teacherId);
    const snap = await ref.get();
    if (!snap.exists) payload.createdAt = ts();
    if (data.teacherCode) payload.teacherCode = data.teacherCode;
    await ref.set(payload, { merge: true });
    return { id: teacherId, ...payload };
  }

  async function getTeacher(teacherId) {
    const database = db();
    if (!database || !teacherId) return null;
    try {
      const snap = await database.collection(COL.teachers).doc(teacherId).get();
      return snap.exists ? { id: snap.id, ...snap.data() } : null;
    } catch (e) { return null; }
  }

  // ─── Batch ─────────────────────────────────────────────────
  async function createBatch(teacherId, { batchName, batchCode }) {
    const database = db();
    if (!database || !teacherId) throw new Error("Teacher required");
    const code = batchCode || await uniqueBatchCode();
    const ref = database.collection(COL.batches).doc();
    const doc = {
      batchId: ref.id,
      teacherId,
      batchName: (batchName || "My Class").trim(),
      batchCode: String(code).trim().toUpperCase(),
      createdAt: ts()
    };
    await ref.set(doc);
    return doc;
  }

  async function ensureDefaultBatch(teacherId, teacherName) {
    const database = db();
    if (!database || !teacherId) return null;
    try {
      const snap = await database.collection(COL.batches)
        .where("teacherId", "==", teacherId).limit(1).get();
      if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    } catch (e) { /* */ }
    return createBatch(teacherId, { batchName: (teacherName || "My Class") + " — Batch" });
  }

  async function findBatchByCode(batchCode) {
    const database = db();
    if (!database || !batchCode) return null;
    const normalized = String(batchCode).trim().toUpperCase().replace(/\s+/g, "");
    try {
      const snap = await database.collection(COL.batches)
        .where("batchCode", "==", normalized).limit(1).get();
      if (!snap.empty) {
        const d = snap.docs[0];
        return { id: d.id, ...d.data() };
      }
    } catch (e) { /* */ }
    // Legacy: teacherCode on teachers collection
    try {
      const tsnap = await database.collection(COL.teachers)
        .where("teacherCode", "==", normalized)
        .where("status", "==", "active").limit(1).get();
      if (!tsnap.empty) {
        const teacher = { id: tsnap.docs[0].id, ...tsnap.docs[0].data() };
        return ensureDefaultBatch(teacher.teacherId || teacher.id, teacher.name);
      }
    } catch (e) { /* */ }
    return null;
  }

  async function listBatchesForTeacher(teacherId) {
    const database = db();
    if (!database || !teacherId) return [];
    try {
      const snap = await database.collection(COL.batches)
        .where("teacherId", "==", teacherId).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { return []; }
  }

  // ─── Student ───────────────────────────────────────────────
  function genStudentCode() {
    const n = Math.floor(1000 + Math.random() * 899999);
    return "QTX-STU-" + n;
  }

  async function findStudentByCode(studentCode) {
    const database = db();
    if (!database || !studentCode) return null;
    const normalized = String(studentCode).trim().toUpperCase().replace(/\s+/g, "");
    try {
      const snap = await database.collection(COL.students)
        .where("studentCode", "==", normalized).limit(1).get();
      if (!snap.empty) {
        const d = snap.docs[0];
        return { id: d.id, ...d.data() };
      }
    } catch (e) { /* */ }
    return null;
  }

  async function uniqueStudentCode() {
    for (let i = 0; i < 12; i++) {
      const code = genStudentCode();
      const existing = await findStudentByCode(code);
      if (!existing) return code;
    }
    return "QTX-STU-" + String(Date.now()).slice(-6);
  }

  async function getStudent(studentId) {
    const database = db();
    if (!database || !studentId) return null;
    try {
      const snap = await database.collection(COL.students).doc(studentId).get();
      return snap.exists ? { id: snap.id, ...snap.data() } : null;
    } catch (e) { return null; }
  }

  /** Permanent student code — generated once, never changes. */
  async function ensureStudentCode(studentId) {
    const database = db();
    if (!database || !studentId) return null;
    const ref = database.collection(COL.students).doc(studentId);
    const snap = await ref.get();
    if (snap.exists && snap.data().studentCode) return snap.data().studentCode;
    const code = await uniqueStudentCode();
    const patch = { studentId, studentCode: code, updatedAt: ts() };
    if (!snap.exists) patch.createdAt = ts();
    await ref.set(patch, { merge: true });
    return code;
  }

  async function upsertStudent(studentId, data) {
    const database = db();
    if (!database || !studentId) return null;
    const payload = {
      studentId,
      name: data.name || "Student",
      email: data.email || null,
      mobile: data.mobile || null,
      updatedAt: ts()
    };
    const ref = database.collection(COL.students).doc(studentId);
    const snap = await ref.get();
    if (!snap.exists) payload.createdAt = ts();
    if (data.batchIds) payload.batchIds = data.batchIds;
    if (data.studentCode && !snap.data()?.studentCode) payload.studentCode = data.studentCode;
    if (data.linkedTeacherIds) payload.linkedTeacherIds = data.linkedTeacherIds;
    await ref.set(payload, { merge: true });
    if (!payload.studentCode && !snap.data()?.studentCode) {
      payload.studentCode = await ensureStudentCode(studentId);
    }
    return payload;
  }

  async function linkStudentToTeacherDirect(teacherId, studentId, meta) {
    const database = db();
    if (!database || !teacherId || !studentId) throw new Error("Invalid link");
    const studentCode = meta.studentCode || await ensureStudentCode(studentId);
    const linkId = `${teacherId}_${studentId}`;
    const link = {
      teacherId,
      studentId,
      linkType: "direct",
      studentName: (meta && meta.name) || "Student",
      studentEmail: (meta && meta.email) || null,
      studentMobile: (meta && meta.mobile) || null,
      studentCode,
      joinedAt: ts()
    };
    await database.collection(COL.teacherLinks).doc(linkId).set(link, { merge: true });
    await database.collection(COL.students).doc(studentId).set({
      linkedTeacherIds: firebase.firestore.FieldValue.arrayUnion(teacherId),
      studentCode,
      updatedAt: ts()
    }, { merge: true });
    await database.collection("teacher_roster").doc(linkId).set({
      teacherId,
      studentId,
      linkType: "direct",
      studentName: link.studentName,
      studentEmail: link.studentEmail,
      studentMobile: link.studentMobile,
      studentCode,
      joinedAt: ts(),
      lastActiveAt: ts()
    }, { merge: true });
    return link;
  }

  async function listDirectLinksForTeacher(teacherId) {
    const database = db();
    if (!database || !teacherId) return [];
    try {
      const snap = await database.collection(COL.teacherLinks)
        .where("teacherId", "==", teacherId).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { return []; }
  }

  async function createManualStudent(teacherId, { name, email, mobile }) {
    const database = db();
    if (!database || !teacherId) throw new Error("Teacher required");
    const ref = database.collection(COL.students).doc();
    const studentCode = await uniqueStudentCode();
    const studentId = ref.id;
    const doc = {
      studentId,
      studentCode,
      name: (name || "Student").trim(),
      email: (email || "").trim() || null,
      mobile: (mobile || "").trim() || null,
      linkedTeacherIds: [teacherId],
      isPlaceholder: true,
      createdByTeacher: teacherId,
      createdAt: ts(),
      updatedAt: ts()
    };
    await ref.set(doc);
    await linkStudentToTeacherDirect(teacherId, studentId, {
      name: doc.name, email: doc.email, mobile: doc.mobile, studentCode
    });
    return doc;
  }

  async function mergePlaceholderStudent(placeholderId, realUid, meta) {
    const database = db();
    if (!database || !placeholderId || !realUid) return null;
    const ph = await getStudent(placeholderId);
    if (!ph || !ph.isPlaceholder) return null;
    const code = ph.studentCode;
    const batch = database.batch();

    const memSnap = await database.collection(COL.memberships)
      .where("studentId", "==", placeholderId).get();
    memSnap.docs.forEach(doc => {
      const data = doc.data();
      const newId = `${data.batchId}_${realUid}`;
      batch.set(database.collection(COL.memberships).doc(newId), {
        ...data, studentId: realUid, studentName: meta.name || data.studentName
      });
      batch.delete(doc.ref);
    });

    const linkSnap = await database.collection(COL.teacherLinks)
      .where("studentId", "==", placeholderId).get();
    linkSnap.docs.forEach(doc => {
      const data = doc.data();
      const newLinkId = `${data.teacherId}_${realUid}`;
      batch.set(database.collection(COL.teacherLinks).doc(newLinkId), {
        ...data, studentId: realUid, studentName: meta.name || data.studentName
      });
      batch.delete(doc.ref);
    });

    const rosterSnap = await database.collection("teacher_roster")
      .where("studentId", "==", placeholderId).get();
    rosterSnap.docs.forEach(doc => {
      const data = doc.data();
      const newRid = `${data.teacherId}_${realUid}`;
      batch.set(database.collection("teacher_roster").doc(newRid), {
        ...data, studentId: realUid, studentName: meta.name || data.studentName
      });
      batch.delete(doc.ref);
    });

    batch.set(database.collection(COL.students).doc(realUid), {
      studentId: realUid,
      studentCode: code,
      name: (meta && meta.name) || ph.name,
      email: (meta && meta.email) || ph.email,
      mobile: (meta && meta.mobile) || ph.mobile,
      linkedTeacherIds: ph.linkedTeacherIds || [],
      isPlaceholder: false,
      mergedFrom: placeholderId,
      updatedAt: ts()
    }, { merge: true });
    batch.delete(database.collection(COL.students).doc(placeholderId));
    await batch.commit();
    return { studentId: realUid, studentCode: code };
  }

  /** Student enters their QTX-STU code to claim placeholder or confirm teacher link. */
  async function claimStudentByCode(authUid, studentCode, meta) {
    const database = db();
    if (!database || !authUid || !studentCode) throw new Error("Invalid request");
    const student = await findStudentByCode(studentCode);
    if (!student) throw new Error("Invalid student code. Check with your teacher.");
    const teacherId = student.createdByTeacher
      || (Array.isArray(student.linkedTeacherIds) && student.linkedTeacherIds[0]);
    if (!teacherId) throw new Error("This code is not linked to a teacher.");

    let targetId = authUid;
    let code = student.studentCode;

    if (student.studentId !== authUid && student.isPlaceholder) {
      const merged = await mergePlaceholderStudent(student.studentId, authUid, meta);
      if (merged) { targetId = merged.studentId; code = merged.studentCode; }
    } else if (student.studentId === authUid) {
      await upsertStudent(authUid, { ...meta, studentCode: code });
    } else {
      await upsertStudent(authUid, meta);
      const ownCode = await ensureStudentCode(authUid);
      if (ownCode !== code) {
        throw new Error("This code belongs to another student. Use your own code or ask your teacher.");
      }
      targetId = authUid;
    }

    await linkStudentToTeacherDirect(teacherId, targetId, {
      name: meta.name, email: meta.email, mobile: meta.mobile, studentCode: code
    });
    const teacher = await getTeacher(teacherId);
    return { teacherId, teacher, studentCode: code, studentId: targetId };
  }

  async function unlinkStudentFromTeacher(teacherId, studentId, batchId) {
    const database = db();
    if (!database || !teacherId || !studentId) return false;
    const batch = database.batch();
    if (batchId) {
      const mid = `${batchId}_${studentId}`;
      batch.delete(database.collection(COL.memberships).doc(mid));
    } else {
      const linkId = `${teacherId}_${studentId}`;
      batch.delete(database.collection(COL.teacherLinks).doc(linkId));
      batch.delete(database.collection("teacher_roster").doc(linkId));
    }
    batch.update(database.collection(COL.students).doc(studentId), {
      linkedTeacherIds: firebase.firestore.FieldValue.arrayRemove(teacherId),
      updatedAt: ts()
    });
    await batch.commit();
    return true;
  }

  // ─── StudentBatchMembership ────────────────────────────────
  async function joinBatch(studentId, batchCode, studentMeta) {
    const database = db();
    if (!database || !studentId || !batchCode) throw new Error("Invalid join");
    const batch = await findBatchByCode(batchCode);
    if (!batch) throw new Error("Invalid batch code. Check with your teacher.");

    const studentCode = await ensureStudentCode(studentId);
    await upsertStudent(studentId, {
      name: (studentMeta && studentMeta.name) || "Student",
      email: studentMeta?.email,
      mobile: studentMeta?.mobile
    });

    const membershipId = `${batch.batchId}_${studentId}`;
    const membership = {
      studentId,
      batchId: batch.batchId,
      teacherId: batch.teacherId,
      batchName: batch.batchName,
      batchCode: batch.batchCode,
      studentName: (studentMeta && studentMeta.name) || "Student",
      studentEmail: (studentMeta && studentMeta.email) || null,
      studentMobile: (studentMeta && studentMeta.mobile) || null,
      studentCode,
      joinedAt: ts()
    };
    await database.collection(COL.memberships).doc(membershipId).set(membership, { merge: true });
    await database.collection(COL.students).doc(studentId).set({
      batchIds: firebase.firestore.FieldValue.arrayUnion(batch.batchId)
    }, { merge: true });

    // Legacy roster sync for backward compat
    const linkId = `${batch.teacherId}_${studentId}`;
    await database.collection("teacher_roster").doc(linkId).set({
      teacherId: batch.teacherId,
      studentId,
      batchId: batch.batchId,
      batchCode: batch.batchCode,
      teacherName: studentMeta?.teacherName || "",
      teacherCode: batch.batchCode,
      studentName: membership.studentName,
      studentEmail: membership.studentEmail,
      studentMobile: membership.studentMobile,
      studentCode,
      joinedAt: ts(),
      lastActiveAt: ts()
    }, { merge: true });

    return { batch, membership, studentCode };
  }

  async function listMembershipsForBatch(batchId) {
    const database = db();
    if (!database || !batchId) return [];
    try {
      const snap = await database.collection(COL.memberships)
        .where("batchId", "==", batchId).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { return []; }
  }

  async function listMembershipsForTeacher(teacherId) {
    const database = db();
    if (!database || !teacherId) return [];
    try {
      const snap = await database.collection(COL.memberships)
        .where("teacherId", "==", teacherId).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { return []; }
  }

  async function listMembershipsForStudent(studentId) {
    const database = db();
    if (!database || !studentId) return [];
    try {
      const snap = await database.collection(COL.memberships)
        .where("studentId", "==", studentId).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { return []; }
  }

  async function studentIdsInBatches(batchIds) {
    const database = db();
    if (!database || !batchIds || !batchIds.length) return [];
    const ids = new Set();
    for (const batchId of batchIds) {
      const rows = await listMembershipsForBatch(batchId);
      rows.forEach(r => ids.add(r.studentId));
    }
    return [...ids];
  }

  async function studentIdsForTeacher(teacherId) {
    const ids = new Set();
    const rows = await listMembershipsForTeacher(teacherId);
    rows.forEach(r => ids.add(r.studentId));
    const direct = await listDirectLinksForTeacher(teacherId);
    direct.forEach(r => ids.add(r.studentId));
    if (ids.size) return [...ids];
    try {
      const snap = await db().collection("teacher_roster").where("teacherId", "==", teacherId).get();
      return snap.docs.map(d => d.data().studentId);
    } catch (e) { return []; }
  }

  async function listStudentsForTeacher(teacherId) {
    const byId = new Map();
    const memberships = await listMembershipsForTeacher(teacherId);
    memberships.forEach(r => {
      byId.set(r.studentId, {
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
      });
    });
    const direct = await listDirectLinksForTeacher(teacherId);
    for (const r of direct) {
      if (!byId.has(r.studentId)) {
        byId.set(r.studentId, {
          studentId: r.studentId,
          studentName: r.studentName,
          studentEmail: r.studentEmail,
          studentMobile: r.studentMobile,
          studentCode: r.studentCode || null,
          batchId: null,
          batchName: "Direct",
          batchCode: null,
          linkType: "direct",
          joinedAt: r.joinedAt,
          lastActiveAt: r.lastActiveAt
        });
      } else {
        const row = byId.get(r.studentId);
        if (!row.studentCode && r.studentCode) row.studentCode = r.studentCode;
      }
    }
    return [...byId.values()];
  }

  // ─── Question ──────────────────────────────────────────────
  async function saveQuestion(teacherId, q) {
    const database = db();
    if (!database) throw new Error("DB not ready");
    const ref = q.questionId
      ? database.collection(COL.questions).doc(q.questionId)
      : database.collection(COL.questions).doc();
    const doc = {
      questionId: ref.id,
      teacherId: teacherId || null,
      sourceType: q.sourceType || "custom",
      subject: q.subject || "",
      topic: q.topic || q.chapter || "",
      examTag: q.examTag || "JEE",
      questionText: q.questionText || q.q || "",
      options: q.options || [],
      correctAnswer: q.correctAnswer != null ? q.correctAnswer : (q.answer != null ? q.answer : 0),
      marks: Number(q.marks) || 4,
      negativeMarks: Number(q.negativeMarks) || 1,
      pdfUrl: q.pdfUrl || null,
      imageUrl: q.imageUrl || null,
      bankRefId: q.bankRefId || null,
      updatedAt: ts()
    };
    if (!q.questionId) doc.createdAt = ts();
    await ref.set(doc, { merge: true });
    return doc;
  }

  async function getQuestions(questionIds) {
    const database = db();
    if (!database || !questionIds || !questionIds.length) return [];
    const out = [];
    for (const qid of questionIds.slice(0, 100)) {
      try {
        const snap = await database.collection(COL.questions).doc(String(qid)).get();
        if (snap.exists) out.push(snap.data());
      } catch (e) { /* */ }
    }
    return out;
  }

  // ─── Assignment ────────────────────────────────────────────
  async function createAssignment(teacherId, payload) {
    const database = db();
    if (!database || !teacherId) throw new Error("Teacher required");

    const batchIds = payload.batchIds || [];
    let visibleToStudents = payload.targetStudentIds || [];
    if (payload.assignToAll || !visibleToStudents.length) {
      visibleToStudents = batchIds.length
        ? await studentIdsInBatches(batchIds)
        : await studentIdsForTeacher(teacherId);
    }
    if (!visibleToStudents.length) throw new Error("No students linked. Add students or share batch code.");

    const questionIds = (payload.questionIds || []).map(String);
    let target = payload.target || null;
    if (!target) {
      if (payload.targetStudentIds && payload.targetStudentIds.length === 1 && !batchIds.length) {
        target = { type: "student", id: payload.targetStudentIds[0] };
      } else if (batchIds.length === 1 && payload.assignToAll !== false) {
        target = { type: "batch", id: batchIds[0] };
      }
    }
    const ref = database.collection(COL.assignments).doc();
    const doc = {
      assignmentId: ref.id,
      teacherId,
      target,
      teacherName: payload.teacherName || null,
      title: payload.title || "Assignment",
      questionIds,
      timeLimitMinutes: Number(payload.timeLimitMinutes || payload.timeLimitMin) || 30,
      startAt: payload.startAt ? (typeof payload.startAt === "number" ? payload.startAt : new Date(payload.startAt).getTime()) : Date.now(),
      dueAt: payload.dueAt ? (typeof payload.dueAt === "number" ? payload.dueAt : new Date(payload.dueAt).getTime()) : null,
      markingScheme: payload.markingScheme || payload.marking || { correct: 4, wrong: -1, unattempted: 0 },
      createdAt: Date.now(),
      active: true,
      // Denormalized for student queries + legacy fields
      sourceType: payload.sourceType || "bank",
      examTag: payload.examTag || null,
      examKey: payload.examKey || null,
      subject: payload.subject || "",
      chapter: payload.chapter || "",
      bankSlug: payload.bankSlug || null,
      testSeriesTestId: payload.testSeriesTestId || null,
      customQuestions: payload.customQuestions || [],
      pdfUrl: payload.pdfUrl || payload.contentUrl || null,
      pdfFileId: payload.pdfFileId || null,
      contentUrl: payload.contentUrl || payload.pdfUrl || payload.videoUrl || payload.lectureUrl || null,
      videoUrl: payload.videoUrl || (payload.sourceType === "video" ? payload.contentUrl : null),
      lectureUrl: payload.lectureUrl || (payload.sourceType === "lecture_link" ? payload.contentUrl : null),
      contentId: payload.contentId || null,
      chapterIds: payload.chapterIds || [],
      chapters: payload.chapter ? payload.chapter.split(",").map(s => s.trim()).filter(Boolean) : [],
      numQuestions: payload.numQuestions || questionIds.length,
      shuffle: payload.shuffle !== false,
      batchIds,
      visibleToStudents,
      timeLimitMin: Number(payload.timeLimitMinutes || payload.timeLimitMin) || 30
    };

    const batch = database.batch();
    batch.set(ref, doc);
    for (const batchId of batchIds) {
      const linkId = `${ref.id}_${batchId}`;
      batch.set(database.collection(COL.batchLinks).doc(linkId), {
        assignmentId: ref.id,
        batchId,
        teacherId
      });
    }
    await batch.commit();
    return { id: ref.id, ...doc };
  }

  async function listAssignmentsForTeacher(teacherId) {
    const database = db();
    if (!database || !teacherId) return [];
    try {
      const snap = await database.collection(COL.assignments)
        .where("teacherId", "==", teacherId).limit(100).get();
      return snap.docs.map(d => ({ id: d.id, assignmentId: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (e) { return []; }
  }

  async function listAssignmentsForStudent(studentId) {
    const database = db();
    if (!database || !studentId) return [];
    try {
      const snap = await database.collection(COL.assignments)
        .where("visibleToStudents", "array-contains", studentId)
        .where("active", "==", true).limit(80).get();
      return snap.docs.map(d => ({ id: d.id, assignmentId: d.id, ...d.data() }));
    } catch (e) { return []; }
  }

  async function getAssignmentBatchLinks(assignmentId) {
    const database = db();
    if (!database) return [];
    try {
      const snap = await database.collection(COL.batchLinks)
        .where("assignmentId", "==", assignmentId).get();
      return snap.docs.map(d => d.data());
    } catch (e) { return []; }
  }

  // ─── Submission ────────────────────────────────────────────
  function submissionId(assignmentId, studentId) {
    return `${assignmentId}_${studentId}`;
  }

  async function getSubmission(assignmentId, studentId) {
    const database = db();
    if (!database) return null;
    const sid = submissionId(assignmentId, studentId);
    try {
      const snap = await database.collection(COL.submissions).doc(sid).get();
      if (snap.exists) return snap.data();
    } catch (e) { /* */ }
    // Legacy subcollection
    try {
      const leg = await database.collection(COL.assignments).doc(assignmentId)
        .collection("submissions").doc(studentId).get();
      return leg.exists ? leg.data() : null;
    } catch (e) { return null; }
  }

  async function saveSubmission(assignmentId, studentId, data) {
    const database = db();
    if (!database) return false;
    const sid = submissionId(assignmentId, studentId);
    const doc = {
      submissionId: sid,
      assignmentId,
      studentId,
      teacherId: data.teacherId || null,
      studentName: data.studentName || "Student",
      answers: data.answers || [],
      score: Number(data.score) || 0,
      correct: data.correct || 0,
      wrong: data.wrong || 0,
      skipped: data.skipped || 0,
      pct: data.pct || 0,
      timeTaken: Number(data.timeTaken || data.timeTakenSec) || 0,
      timeTakenSec: Number(data.timeTaken || data.timeTakenSec) || 0,
      breakdown: data.breakdown || {},
      wrongQuestionIds: data.wrongQuestionIds || [],
      submittedAt: Date.now()
    };
    await database.collection(COL.submissions).doc(sid).set(doc, { merge: true });
    // Legacy mirror
    try {
      await database.collection(COL.assignments).doc(assignmentId)
        .collection("submissions").doc(studentId).set(doc, { merge: true });
    } catch (e) { /* */ }
    return true;
  }

  async function listSubmissionsForAssignment(assignmentId) {
    const database = db();
    if (!database) return [];
    try {
      const snap = await database.collection(COL.submissions)
        .where("assignmentId", "==", assignmentId).get();
      if (snap.docs.length) {
        return snap.docs.map(d => d.data()).sort((a, b) => (b.score || 0) - (a.score || 0));
      }
    } catch (e) { /* */ }
    // Legacy
    try {
      const snap = await database.collection(COL.assignments).doc(assignmentId)
        .collection("submissions").get();
      return snap.docs.map(d => d.data());
    } catch (e) { return []; }
  }

  /** One query for teacher portal — avoids N×M per-student submission fetches. */
  async function listSubmissionsForTeacher(teacherId, limit) {
    const database = db();
    if (!database || !teacherId) return [];
    const cap = limit || 400;
    try {
      const snap = await database.collection(COL.submissions)
        .where("teacherId", "==", teacherId).limit(cap).get();
      if (snap.docs.length) return snap.docs.map(d => d.data());
    } catch (e) { /* index may be missing */ }
    return [];
  }

  function submissionLookupMap(submissions) {
    const byKey = new Map();
    const byAssignment = new Map();
    (submissions || []).forEach(s => {
      if (!s || !s.assignmentId || !s.studentId) return;
      byKey.set(`${s.assignmentId}_${s.studentId}`, s);
      if (!byAssignment.has(s.assignmentId)) byAssignment.set(s.assignmentId, []);
      byAssignment.get(s.assignmentId).push(s);
    });
    return { byKey, byAssignment };
  }

  async function touchStudentActive(studentId) {
    const database = db();
    if (!database || !studentId) return;
    try {
      const snap = await database.collection(COL.memberships)
        .where("studentId", "==", studentId).get();
      const batch = database.batch();
      snap.docs.forEach(doc => {
        batch.update(doc.ref, { lastActiveAt: ts() });
      });
      if (snap.docs.length) await batch.commit();
    } catch (e) { /* */ }
  }

  return {
    COL,
    genBatchCode,
    genStudentCode,
    upsertTeacher,
    getTeacher,
    createBatch,
    ensureDefaultBatch,
    findBatchByCode,
    listBatchesForTeacher,
    getStudent,
    findStudentByCode,
    ensureStudentCode,
    upsertStudent,
    createManualStudent,
    claimStudentByCode,
    linkStudentToTeacherDirect,
    unlinkStudentFromTeacher,
    listDirectLinksForTeacher,
    listStudentsForTeacher,
    joinBatch,
    listMembershipsForBatch,
    listMembershipsForTeacher,
    listMembershipsForStudent,
    studentIdsInBatches,
    studentIdsForTeacher,
    saveQuestion,
    getQuestions,
    createAssignment,
    listAssignmentsForTeacher,
    listAssignmentsForStudent,
    getAssignmentBatchLinks,
    getSubmission,
    saveSubmission,
    listSubmissionsForAssignment,
    listSubmissionsForTeacher,
    submissionLookupMap,
    submissionId,
    touchStudentActive
  };
})();