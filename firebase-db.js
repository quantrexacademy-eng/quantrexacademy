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
    }, err => console.warn("Firestore listener:", err.message));
  }

  async function syncForUser(user) {
    if (!init() || !user || !user.uid) return false;
    currentUid = user.uid;
    await ensureUserProfile(user, localStorage.getItem("quantrex_exam") || "Engineering");
    await loadProgress(user.uid);
    startRealtimeSync(user.uid);
    return true;
  }

  function watchAuth(callback) {
    if (!init()) return;
    auth.onAuthStateChanged(async user => {
      if (user) {
        localStorage.setItem("quantrex_user", JSON.stringify({
          uid: user.uid,
          email: user.email,
          phone: user.phoneNumber,
          name: user.displayName || user.email || "Quantrex Student",
          exam: localStorage.getItem("quantrex_exam") || "Engineering",
          loggedAt: Date.now()
        }));
        await syncForUser(user);
        if (callback) callback(user, true);
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
      project: "quantrexacademy-5da32",
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
  }

  function authErrorMessage(code) {
    const map = {
      "auth/user-not-found": "Account nahi mila. Pehle Sign Up karo.",
      "auth/wrong-password": "Galat password. Dobara try karo.",
      "auth/invalid-email": "Email sahi format mein daalo.",
      "auth/email-already-in-use": "Yeh email pehle se registered hai. Sign In karo.",
      "auth/weak-password": "Password kam se kam 6 characters ka hona chahiye.",
      "auth/too-many-requests": "Bahut zyada tries. Thodi der baad try karo.",
      "auth/popup-closed-by-user": "Google login cancel ho gaya.",
      "auth/unauthorized-domain": "Domain authorized nahi hai. Firebase Console mein domain add karo."
    };
    return map[code] || "Login failed. Dobara try karo.";
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