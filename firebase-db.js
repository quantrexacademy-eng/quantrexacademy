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
      project: "quantrex-premimum",
      version: "1.0.0",
      questionCount: typeof QUESTIONS !== "undefined" ? QUESTIONS.length : 0,
      seededAt: firebase.firestore.FieldValue.serverTimestamp()
    });
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
    set onDataChange(fn) { onDataChange = fn; }
  };
})();