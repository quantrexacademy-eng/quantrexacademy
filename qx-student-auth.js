// Quantrex — student identity (Firebase Auth + Firestore students/{uid})
const QuantrexStudentAuth = (() => {
  const EXAMS = ["Engineering", "Medical", "Academic", "Defence"];

  function db() {
    if (typeof QuantrexDB !== "undefined") QuantrexDB.init();
    return firebase.firestore();
  }
  function auth() {
    if (typeof QuantrexDB !== "undefined") QuantrexDB.init();
    return firebase.auth();
  }
  function studentRef(uid) {
    return db().collection("students").doc(uid);
  }

  function friendly(err) {
    if (typeof QuantrexDB !== "undefined" && QuantrexDB.authErrorMessage) {
      return QuantrexDB.authErrorMessage(err && err.code, err && err.message);
    }
    return (err && err.message) || "Something went wrong.";
  }

  function sessionFromUser(user, extra) {
    return {
      uid: user.uid,
      email: user.email || (extra && extra.email) || "",
      phone: user.phoneNumber || (extra && extra.phone) || "",
      name: user.displayName || (extra && extra.name) || user.email || "Quantrex Student",
      photoURL: user.photoURL || "",
      exam: (extra && extra.exam) || localStorage.getItem("quantrex_exam") || "Engineering",
      className: (extra && extra.className) || "",
      state: (extra && extra.state) || "",
      district: (extra && extra.district) || "",
      loggedAt: Date.now()
    };
  }

  async function upsertStudent(user, extra) {
    if (!user || !user.uid) return null;
    const ref = studentRef(user.uid);
    const snap = await ref.get();
    const exam = (extra && (extra.targetExam || extra.exam)) || localStorage.getItem("quantrex_exam") || "Engineering";
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const base = {
      uid: user.uid,
      studentId: user.uid,
      name: (extra && extra.name) || user.displayName || (snap.exists && snap.data().name) || user.email || "Quantrex Student",
      email: user.email || (extra && extra.email) || (snap.exists && snap.data().email) || null,
      phone: user.phoneNumber || (extra && extra.phone) || (snap.exists && snap.data().phone) || null,
      photoURL: user.photoURL || (snap.exists && snap.data().photoURL) || "",
      class: (extra && extra.className) || (snap.exists && snap.data().class) || "",
      className: (extra && extra.className) || (snap.exists && snap.data().className) || (snap.exists && snap.data().class) || "",
      state: (extra && extra.state) || (snap.exists && snap.data().state) || "",
      district: (extra && extra.district) || (snap.exists && snap.data().district) || "",
      targetExam: exam,
      board: (extra && extra.board) || (snap.exists && snap.data().board) || "",
      city: (extra && extra.city) || (extra && extra.district) || (snap.exists && snap.data().city) || "",
      lastLoginAt: now,
      updatedAt: now
    };
    if (!snap.exists) {
      await ref.set({
        ...base,
        role: "student",
        status: "active",
        enrolledCourses: [],
        courseAccess: ["eng", "med", "jee_ts"],
        subscriptionStatus: "free",
        subscriptionPlan: "all_free",
        subscriptionStartDate: now,
        subscriptionEndDate: null,
        testAttempts: 0,
        totalTestsAttempted: 0,
        totalQuestionsAttempted: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        totalMarks: 0,
        averageScore: 0,
        rank: 0,
        createdAt: now
      });
    } else {
      const safe = { ...base };
      await ref.set(safe, { merge: true });
    }
    if (typeof QuantrexDB !== "undefined" && QuantrexDB.ensureUserProfile) {
      await QuantrexDB.ensureUserProfile(user, exam);
    }
    return (await ref.get()).data();
  }

  async function loadStudent(uid) {
    if (!uid) return null;
    const snap = await studentRef(uid).get();
    return snap.exists ? snap.data() : null;
  }

  async function finishLogin(user, extra) {
    let profile = null;
    try {
      profile = await upsertStudent(user, extra);
    } catch (e) {
      console.warn("QuantrexStudentAuth.finishLogin profile", e && e.message);
    }
    const session = sessionFromUser(user, extra);
    try {
      if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.isOwnerIdentity
        && QuantrexAccess.isOwnerIdentity(session.email, session.phone)) {
        session.role = "admin";
      } else {
        session.role = "student";
        try { localStorage.removeItem("quantrex_admin"); } catch (_) {}
      }
    } catch (_) { /* */ }
    try { localStorage.setItem("quantrex_user", JSON.stringify(session)); } catch (_) {}
    try { localStorage.setItem("quantrex_exam", session.exam); } catch (_) {}
    try {
      if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.grantIfOwner) {
        QuantrexAccess.grantIfOwner(session);
      }
    } catch (_) { /* */ }
    try {
      if (typeof QuantrexDB !== "undefined") QuantrexDB.syncForUser(user);
    } catch (_) { /* */ }
    return profile;
  }

  async function sendPhoneOtp(phone) {
    if (typeof QuantrexAuthOtp === "undefined") throw new Error("OTP module not loaded");
    return QuantrexAuthOtp.sendPhoneOtp(phone);
  }

  async function verifyPhoneOtp(code, extra) {
    const user = await QuantrexAuthOtp.verifyPhoneOtp(code);
    await finishLogin(user, extra);
    return user;
  }

  async function registerEmail(opts) {
    opts = opts || {};
    const a = auth();
    const cred = await a.createUserWithEmailAndPassword(String(opts.email).trim(), opts.password);
    if (opts.name) {
      try { await cred.user.updateProfile({ displayName: opts.name }); } catch (_) {}
    }
    try { await cred.user.sendEmailVerification(); } catch (_) {}
    await finishLogin(cred.user, {
      name: opts.name,
      email: opts.email,
      phone: opts.phone,
      className: opts.className,
      exam: opts.targetExam,
      targetExam: opts.targetExam,
      state: opts.state,
      district: opts.district,
      exams: opts.exams,
      individualMaths: opts.individualMaths,
      groupClass: opts.groupClass,
      liveClass: opts.liveClass
    });
    return cred.user;
  }

  async function loginEmail(email, password) {
    const cred = await auth().signInWithEmailAndPassword(String(email).trim(), password);
    await finishLogin(cred.user);
    return cred.user;
  }

  async function resetPassword(email) {
    await auth().sendPasswordResetEmail(String(email).trim());
  }

  async function linkEmail(email, password) {
    const user = auth().currentUser;
    if (!user) throw new Error("Login first");
    const cred = firebase.auth.EmailAuthProvider.credential(email, password);
    await user.linkWithCredential(cred);
    await upsertStudent(user, { email });
    return user;
  }

  async function linkPhone(confirmationResult, code) {
    const user = auth().currentUser;
    if (!user) throw new Error("Login first");
    const cred = firebase.auth.PhoneAuthProvider.credential(confirmationResult.verificationId, code);
    await user.linkWithCredential(cred);
    await upsertStudent(user, { phone: user.phoneNumber });
    return user;
  }

  async function logout() {
    if (typeof QuantrexDB !== "undefined" && QuantrexDB.signOut) {
      await QuantrexDB.signOut();
    } else {
      try { await auth().signOut(); } catch (_) {}
      try { localStorage.removeItem("quantrex_user"); } catch (_) {}
    }
    window.location.href = "login.html";
  }

  return {
    EXAMS,
    upsertStudent,
    loadStudent,
    finishLogin,
    sendPhoneOtp,
    verifyPhoneOtp,
    registerEmail,
    loginEmail,
    resetPassword,
    linkEmail,
    linkPhone,
    logout,
    friendly,
    sessionFromUser
  };
})();
