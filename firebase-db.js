// Quantrex — Firebase Firestore Database (Primary Data Store)
const QuantrexDB = (() => {
  let db = null;
  let auth = null;
  let analytics = null;
  let ready = false;
  let currentUid = null;
  let listener = null;
  let saveTimer = null;
  let onDataChange = null;

  let cache = {
    exam: "Engineering",
    bookmarks: [],
    solved: [],
    notes: [],
    attempts: []
  };

  function init() {
    if (ready) return true;
    if (typeof firebase === "undefined") return false;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    try {
      if (typeof firebase.analytics === "function") analytics = firebase.analytics();
    } catch (e) {}
    ready = true;
    return true;
  }

  function userRef(uid) {
    return db.collection("users").doc(uid);
  }

  function progressRef(uid) {
    return userRef(uid).collection("data").doc("progress");
  }

  function applyToLocalStorage() {
    localStorage.setItem("quantrex_exam", cache.exam);
    localStorage.setItem("quantrex_bookmarks", JSON.stringify(cache.bookmarks));
    localStorage.setItem("quantrex_solved", JSON.stringify(cache.solved));
    localStorage.setItem("quantrex_notes", JSON.stringify(cache.notes));
    localStorage.setItem("quantrex_attempts", JSON.stringify(cache.attempts || []));
  }

  function readFromLocalStorage() {
    cache.exam = localStorage.getItem("quantrex_exam") || "Engineering";
    cache.bookmarks = JSON.parse(localStorage.getItem("quantrex_bookmarks") || "[]");
    cache.solved = JSON.parse(localStorage.getItem("quantrex_solved") || "[]");
    cache.notes = JSON.parse(localStorage.getItem("quantrex_notes") || "[]");
    cache.attempts = JSON.parse(localStorage.getItem("quantrex_attempts") || "[]");
  }

  async function ensureUserProfile(user, exam) {
    if (!user || !db) return;
    const ref = userRef(user.uid);
    const profile = {
      uid: user.uid,
      email: user.email || null,
      phone: user.phoneNumber || null,
      name: user.displayName || user.email || "Quantrex Student",
      exam: exam || "Engineering",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const snap = await ref.get();
    if (!snap.exists) profile.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    await ref.set(profile, { merge: true });
  }

  async function loadProgress(uid) {
    if (!uid || !db) return cache;
    const snap = await progressRef(uid).get();
    if (snap.exists) {
      const data = snap.data();
      cache = {
        exam: data.exam || cache.exam,
        bookmarks: data.bookmarks || [],
        solved: data.solved || [],
        notes: data.notes || [],
        attempts: data.attempts || []
      };
      applyToLocalStorage();
    }
    return cache;
  }

  async function saveProgress(uid) {
    if (!uid || !db) return false;
    readFromLocalStorage();
    cache.exam = localStorage.getItem("quantrex_exam") || cache.exam;
    cache.attempts = JSON.parse(localStorage.getItem("quantrex_attempts") || "[]");
    await progressRef(uid).set({
      exam: cache.exam,
      bookmarks: cache.bookmarks,
      solved: cache.solved,
      notes: cache.notes,
      attempts: cache.attempts,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return true;
  }

  function persist(uid) {
    if (!uid) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveProgress(uid).catch(e => console.warn("Firebase save:", e.message));
    }, 500);
  }

  function startRealtimeSync(uid) {
    if (!uid || !db) return;
    if (listener) listener();
    currentUid = uid;
    listener = progressRef(uid).onSnapshot(snap => {
      if (!snap.exists) return;
      const data = snap.data();
      cache = {
        exam: data.exam || cache.exam,
        bookmarks: data.bookmarks || [],
        solved: data.solved || [],
        notes: data.notes || [],
        attempts: data.attempts || []
      };
      applyToLocalStorage();
      if (typeof onDataChange === "function") onDataChange(cache);
    }, err => {
      if (err && err.code === "permission-denied") {
        console.warn("Firestore listener: permission denied — sign in again");
        if (listener) { listener(); listener = null; }
        return;
      }
      console.warn("Firestore listener:", err.message);
    });
  }

  async function syncForUser(user) {
    if (!init() || !user || !user.uid) return false;
    const live = auth && auth.currentUser;
    if (!live || live.uid !== user.uid) {
      console.warn("Firestore sync skipped — auth not ready for", user.uid);
      return false;
    }
    try { await live.getIdToken(true); } catch (e) { /* */ }
    currentUid = user.uid;
    await ensureUserProfile(live, localStorage.getItem("quantrex_exam") || "Engineering");
    await loadProgress(user.uid);
    startRealtimeSync(user.uid);
    return true;
  }

  function watchAuth(callback) {
    if (!init()) return;
    auth.onAuthStateChanged(user => {
      if (user) {
        localStorage.setItem("quantrex_user", JSON.stringify({
          uid: user.uid,
          email: user.email,
          phone: user.phoneNumber,
          name: user.displayName || user.email || "Quantrex Student",
          exam: localStorage.getItem("quantrex_exam") || "Engineering",
          loggedAt: Date.now()
        }));
        if (callback) callback(user, true);
        syncForUser(user).catch(e => console.warn("Firebase sync:", e.message));
      } else {
        currentUid = null;
        if (listener) { listener(); listener = null; }
        if (callback) callback(null, false);
      }
    });
  }

  async function seedAppMeta() {
    if (!init() || !db) return;
    const metaRef = db.collection("app").doc("meta");
    const meta = await metaRef.get();
    if (meta.exists) return;
    await metaRef.set({
      name: "Quantrex Academy",
      project: "quantrexacademy-live",
      version: "1.0.0",
      questionCount: typeof QUESTIONS !== "undefined" ? QUESTIONS.length : 0,
      seededAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  function subscriptionRef(uid) {
    return db.collection("subscriptions").doc(uid);
  }

  async function getSubscription(uid) {
    if (!uid || !db) return { active: false };
    const snap = await subscriptionRef(uid).get();
    if (!snap.exists) return { active: false };
    const data = snap.data();
    const expires = data.expiresAt && data.expiresAt.toDate ? data.expiresAt.toDate().getTime() : data.expiresAt;
    const active = !!data.active && (!expires || expires > Date.now());
    return { ...data, active };
  }

  async function activateSubscription(uid, { planId, orderId, planDays, amount }) {
    if (!uid || !db) return false;
    const days = Number(planDays) || 30;
    const expiresAt = new Date(Date.now() + days * 86400000);
    await subscriptionRef(uid).set({
      uid,
      active: true,
      planId,
      orderId,
      amount: amount || 0,
      expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
      activatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    await userRef(uid).set({ premium: true, planId }, { merge: true });
    return true;
  }

  function watchSubscription(uid, callback) {
    if (!uid || !db) return () => {};
    return subscriptionRef(uid).onSnapshot(snap => {
      const data = snap.exists ? snap.data() : { active: false };
      const expires = data.expiresAt && data.expiresAt.toDate ? data.expiresAt.toDate().getTime() : 0;
      callback({ ...data, active: !!data.active && expires > Date.now() });
    });
  }

  async function signOut() {
    if (listener) { listener(); listener = null; }
    currentUid = null;
    if (auth) await auth.signOut();
    localStorage.removeItem("quantrex_user");
    localStorage.removeItem("quantrex_portal");
    localStorage.removeItem("quantrex_teacher_profile");
  }

  function authErrorMessage(code, fallback) {
    const map = {
      "auth/user-not-found": "Account not found. Please sign up first.",
      "auth/wrong-password": "Wrong password. Try again.",
      "auth/invalid-email": "Enter a valid email address.",
      "auth/email-already-in-use": "This email is already registered. Sign in instead.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/too-many-requests": "Too many attempts. Try again later.",
      "auth/popup-closed-by-user": "Google sign-in was cancelled.",
      "auth/unauthorized-domain": "This domain is not authorized.",
      "auth/invalid-phone-number": "Enter a valid 10-digit mobile number.",
      "auth/invalid-verification-code": "Incorrect OTP. Try again.",
      "auth/code-expired": "OTP expired. Request a new one.",
      "auth/missing-verification": "Please send OTP first.",
      "auth/captcha-check-failed": "Verification failed. Refresh and try again.",
      "auth/quota-exceeded": "SMS limit reached. Try again later.",
      "auth/operation-not-allowed": "Phone login is not enabled on the server.",
      "auth/invalid-app-credential": "Verification failed. Refresh and try again.",
      "auth/missing-recaptcha-token": "Complete verification and try again.",
      "auth/billing-not-enabled": "Phone SMS requires Firebase billing.",
      "auth/not-ready": "App not ready. Refresh the page.",
      "auth/invalid-otp": "Incorrect OTP. Try again.",
      "functions/not-ready": "OTP server not ready. Refresh the page.",
      "functions/internal": "OTP server error. Try again later.",
      "functions/unavailable": "OTP service unavailable. Try again later.",
      "functions/failed-precondition": "OTP not configured. Use email password or Google.",
      "functions/invalid-argument": "Invalid details. Check and try again.",
      "functions/not-found": "OTP expired or not sent. Request a new one.",
      "functions/deadline-exceeded": "OTP expired. Request a new one.",
      "functions/permission-denied": "Too many wrong attempts. Request a new OTP.",
      "functions/resource-exhausted": "Please wait before resending OTP."
    };
    if (code && map[code]) return map[code];
    if (fallback && typeof fallback === "string") {
      const lower = fallback.toLowerCase();
      if (lower.includes("incorrect otp")) return "Incorrect OTP. Try again.";
      if (lower.includes("expired")) return "OTP expired. Request a new one.";
      if (lower.includes("wait") && lower.includes("resend")) return fallback;
      if (lower.includes("not configured")) return "OTP not configured. Use email password or Google.";
    }
    return fallback || "Login failed. Try again.";
  }

  return {
    init,
    get auth() { return auth; },
    get db() { return db; },
    get analytics() { return analytics; },
    get ready() { return ready; },
    get uid() { return currentUid; },
    get connected() { return ready && !!db; },
    syncForUser,
    persist,
    saveProgress,
    ensureUserProfile,
    watchAuth,
    seedAppMeta,
    getSubscription,
    activateSubscription,
    watchSubscription,
    signOut,
    authErrorMessage,
    set onDataChange(fn) { onDataChange = fn; }
  };
})();