// Quantrex — Firebase Firestore Database (Primary Data Store)
// Perf: cap array payloads, debounced writes, no force token refresh, local-first
const QuantrexDB = (() => {
  let db = null;
  let auth = null;
  let analytics = null;
  let ready = false;
  let currentUid = null;
  let listener = null;
  let saveTimer = null;
  let onDataChange = null;
  let _lastSnapWrite = 0;
  let _persistInFlight = false;

  // Hard caps — huge solved[] / attempts[] caused multi-MB Firestore docs + UI freezes
  const MAX_BOOKMARKS = 800;
  const MAX_SOLVED = 2500;
  const MAX_NOTES = 400;
  const MAX_ATTEMPTS = 200;

  let cache = {
    exam: "Engineering",
    bookmarks: [],
    solved: [],
    notes: [],
    attempts: [],
    bookmarksV2: null
  };
  let _persistQueued = false;

  function capArray(arr, max) {
    if (!Array.isArray(arr)) return [];
    if (arr.length <= max) return arr;
    return arr.slice(arr.length - max);
  }

  function sanitizeCache(c) {
    return {
      exam: (c && c.exam) || "Engineering",
      bookmarks: capArray(c && c.bookmarks, MAX_BOOKMARKS),
      solved: capArray(c && c.solved, MAX_SOLVED),
      notes: capArray(c && c.notes, MAX_NOTES),
      attempts: capArray(c && c.attempts, MAX_ATTEMPTS),
      bookmarksV2: (c && c.bookmarksV2) || null
    };
  }

  function isGuestUid(uid) {
    return !uid || String(uid).indexOf("guest_") === 0;
  }

  function mergeIds(a, b) {
    const out = [];
    const seen = {};
    [].concat(a || [], b || []).forEach(function (id) {
      if (id == null || id === "") return;
      const k = String(id);
      if (seen[k]) return;
      seen[k] = 1;
      out.push(id);
    });
    return out;
  }

  function mergeById(a, b) {
    const map = {};
    [].concat(a || [], b || []).forEach(function (item) {
      if (item == null) return;
      if (typeof item !== "object") {
        const k = String(item);
        if (!map[k]) map[k] = item;
        return;
      }
      const k = String(item.id != null ? item.id : item.testId || "");
      if (!k) return;
      const prev = map[k];
      if (!prev || Number(item.date || item.updatedAt || 0) >= Number(prev.date || prev.updatedAt || 0)) map[k] = item;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function mergeSolved(a, b) {
    const map = {};
    [].concat(a || [], b || []).forEach(function (item) {
      if (!item || item.id == null) return;
      const k = String(item.id);
      const prev = map[k];
      if (!prev || Number(item.date || 0) >= Number(prev.date || 0)) map[k] = item;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function mergeBookmarkStore(local, remote) {
    const a = local && typeof local === "object" ? local : { groups: [], items: [] };
    const b = remote && typeof remote === "object" ? remote : { groups: [], items: [] };
    const items = [];
    const seen = {};
    [].concat(a.items || [], b.items || []).forEach(function (it) {
      if (!it || it.id == null) return;
      const k = String(it.id);
      if (seen[k]) return;
      seen[k] = 1;
      items.push(it);
    });
    const groups = [];
    const gseen = {};
    [].concat(a.groups || [], b.groups || []).forEach(function (g) {
      if (!g) return;
      const k = String(g.id || g.name || "");
      if (!k || gseen[k]) return;
      gseen[k] = 1;
      groups.push(g);
    });
    return { groups: groups, items: items };
  }

  function init() {
    if (ready) return true;
    if (typeof firebase === "undefined") return false;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    try { auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch (_) { /* */ }
    db = firebase.firestore();
    try {
      db.settings({ ignoreUndefinedProperties: true });
      // NOTE: enablePersistence removed — IndexedDB multi-tab can hang first paint on Android
    } catch (e) { /* already configured */ }
    try {
      if (typeof firebase.analytics === "function") analytics = firebase.analytics();
    } catch (e) {}
    ready = true;
    if (typeof window !== "undefined" && !window._qxProgressFlushBound) {
      window._qxProgressFlushBound = true;
      window.addEventListener("beforeunload", function () { flushProgress(); });
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) flushProgress();
      });
    }
    return true;
  }

  function userRef(uid) {
    return db.collection("users").doc(uid);
  }

  function progressRef(uid) {
    return userRef(uid).collection("data").doc("progress");
  }

  function applyToLocalStorage() {
    cache = sanitizeCache(cache);
    try {
      localStorage.setItem("quantrex_exam", cache.exam);
      localStorage.setItem("quantrex_bookmarks", JSON.stringify(cache.bookmarks));
      localStorage.setItem("quantrex_solved", JSON.stringify(cache.solved));
      localStorage.setItem("quantrex_notes", JSON.stringify(cache.notes));
      localStorage.setItem("quantrex_attempts", JSON.stringify(cache.attempts || []));
      if (cache.bookmarksV2) {
        localStorage.setItem("quantrex_bookmarks_v2", JSON.stringify(cache.bookmarksV2));
      }
    } catch (e) {
      try {
        cache.attempts = capArray(cache.attempts, 50);
        localStorage.setItem("quantrex_attempts", JSON.stringify(cache.attempts));
      } catch (_) { /* */ }
    }
  }

  function readFromLocalStorage() {
    let bmV2 = null;
    try { bmV2 = JSON.parse(localStorage.getItem("quantrex_bookmarks_v2") || "null"); } catch (_) { bmV2 = null; }
    try {
      cache = sanitizeCache({
        exam: localStorage.getItem("quantrex_exam") || "Engineering",
        bookmarks: JSON.parse(localStorage.getItem("quantrex_bookmarks") || "[]"),
        solved: JSON.parse(localStorage.getItem("quantrex_solved") || "[]"),
        notes: JSON.parse(localStorage.getItem("quantrex_notes") || "[]"),
        attempts: JSON.parse(localStorage.getItem("quantrex_attempts") || "[]"),
        bookmarksV2: bmV2
      });
    } catch (_) {
      cache = { exam: "Engineering", bookmarks: [], solved: [], notes: [], attempts: [], bookmarksV2: bmV2 };
    }
  }

  async function ensureUserProfile(user, exam) {
    if (!user || !db) return;
    const ref = userRef(user.uid);
    const provider = (user.providerData && user.providerData[0] && user.providerData[0].providerId) || "password";
    const profile = {
      uid: user.uid,
      email: user.email || null,
      phone: user.phoneNumber || null,
      photoURL: user.photoURL || null,
      name: user.displayName || user.email || user.phoneNumber || "Quantrex Student",
      exam: exam || "Engineering",
      loginProvider: provider,
      lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const snap = await ref.get();
    if (!snap.exists) {
      profile.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      profile.role = "student";
      profile.subscriptionStatus = "none";
    }
    await ref.set(profile, { merge: true });
    try {
      const sref = db.collection("students").doc(user.uid);
      const ssnap = await sref.get();
      const now = firebase.firestore.FieldValue.serverTimestamp();
      const student = {
        uid: user.uid,
        studentId: user.uid,
        email: user.email || null,
        phone: user.phoneNumber || null,
        name: user.displayName || user.email || "Quantrex Student",
        targetExam: exam || "Engineering",
        lastLoginAt: now,
        updatedAt: now
      };
      if (!ssnap.exists) {
        student.role = "student";
        student.status = "active";
        student.subscriptionStatus = "trial";
        student.createdAt = now;
      }
      await sref.set(student, { merge: true });
    } catch (e) {
      console.warn("students profile", e && e.message);
    }
  }

  async function loadProgress(uid) {
    if (!uid || !db) return cache;
    readFromLocalStorage();
    const local = {
      exam: cache.exam,
      bookmarks: cache.bookmarks.slice(),
      solved: cache.solved.slice(),
      notes: cache.notes.slice(),
      attempts: cache.attempts.slice(),
      bookmarksV2: cache.bookmarksV2
    };
    try {
      const snap = await progressRef(uid).get();
      if (snap.exists) {
        const data = snap.data() || {};
        cache = sanitizeCache({
          exam: data.exam || local.exam,
          bookmarks: mergeIds(local.bookmarks, data.bookmarks),
          solved: mergeSolved(local.solved, data.solved),
          notes: mergeById(local.notes, data.notes),
          attempts: mergeById(local.attempts, data.attempts),
          bookmarksV2: mergeBookmarkStore(local.bookmarksV2, data.bookmarksV2)
        });
        applyToLocalStorage();
      }
    } catch (e) {
      console.warn("Firebase loadProgress:", e.message || e);
    }
    return cache;
  }

  async function saveProgress(uid) {
    if (isGuestUid(uid) || !db) return false;
    if (_persistInFlight) {
      _persistQueued = true;
      return false;
    }
    _persistInFlight = true;
    try {
      readFromLocalStorage();
      cache = sanitizeCache(cache);
      const solved = cache.solved || [];
      await progressRef(uid).set({
        exam: cache.exam,
        bookmarks: cache.bookmarks,
        solved: cache.solved,
        notes: cache.notes,
        attempts: cache.attempts,
        bookmarksV2: cache.bookmarksV2 || null,
        stats: {
          solved: solved.length,
          correct: solved.filter(function (s) { return s && s.correct; }).length,
          wrong: solved.filter(function (s) { return s && s.correct === false; }).length,
          bookmarks: (cache.bookmarks || []).length
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return true;
    } catch (e) {
      console.warn("Firebase save:", e.message || e);
      return false;
    } finally {
      _persistInFlight = false;
      if (_persistQueued) {
        _persistQueued = false;
        saveProgress(uid).catch(function () {});
      }
    }
  }

  function persist(uid) {
    uid = uid || currentUid;
    if (isGuestUid(uid)) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveProgress(uid).catch(function () {});
    }, 900);
  }

  function flushProgress() {
    const uid = currentUid || (function () {
      try {
        const u = JSON.parse(localStorage.getItem("quantrex_user") || "null");
        return u && u.uid;
      } catch (_) { return ""; }
    })();
    if (isGuestUid(uid) || !db) return;
    clearTimeout(saveTimer);
    saveProgress(uid).catch(function () {});
  }

  function startRealtimeSync(uid) {
    if (isGuestUid(uid) || !db) return;
    if (listener) listener();
    currentUid = uid;
    listener = progressRef(uid).onSnapshot(function (snap) {
      if (!snap.exists) return;
      const now = Date.now();
      if (now - _lastSnapWrite < 400) return;
      _lastSnapWrite = now;
      if (typeof currentView !== "undefined" && (currentView === "question" || currentView === "test")) return;
      if (document.body && (document.body.classList.contains("marks-test-active") || document.body.classList.contains("allen-practice-active"))) return;
      const data = snap.data() || {};
      readFromLocalStorage();
      cache = sanitizeCache({
        exam: data.exam || cache.exam,
        bookmarks: mergeIds(cache.bookmarks, data.bookmarks),
        solved: mergeSolved(cache.solved, data.solved),
        notes: mergeById(cache.notes, data.notes),
        attempts: mergeById(cache.attempts, data.attempts),
        bookmarksV2: mergeBookmarkStore(cache.bookmarksV2, data.bookmarksV2)
      });
      applyToLocalStorage();
      if (typeof onDataChange === "function") onDataChange(cache);
    }, function (err) {
      if (err && err.code === "permission-denied") {
        console.warn("Firestore listener: permission denied — sign in again");
        if (listener) { listener(); listener = null; }
        return;
      }
      console.warn("Firestore listener:", err && err.message);
    });
  }

  async function syncForUser(user) {
    if (!init() || !user || isGuestUid(user.uid)) return false;
    const live = auth && auth.currentUser;
    if (!live || live.uid !== user.uid) {
      console.warn("Firestore sync skipped — auth not ready for", user.uid);
      return false;
    }
    try { await live.getIdToken(false); } catch (e) { /* */ }
    currentUid = user.uid;
    Promise.all([
      ensureUserProfile(live, localStorage.getItem("quantrex_exam") || "Engineering"),
      loadProgress(user.uid)
    ]).then(function () {
      saveProgress(user.uid).catch(function () {});
      startRealtimeSync(user.uid);
    }).catch(function (e) { console.warn("Firebase sync:", e.message || e); });
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

  function planKeyFromPurchase(d) {
    let k = String((d && (d.planKey || d.planId)) || "").replace(/^plan_/, "").toLowerCase();
    const c = String((d && d.course) || "").toLowerCase();
    if (!k || k === "undefined") {
      if (/7-day|trial/.test(c)) k = "trial_7";
      else if (/medical/.test(c)) k = "med_complete";
      else if (/combo/.test(c)) k = "eng_combo";
      else if (/test series/.test(c)) k = "jee_ts";
      else if (/engineering complete/.test(c)) k = "eng_complete";
      else k = "trial_7";
    }
    if (k === "complete") k = "eng_combo";
    return k;
  }

  async function recoverPaidFromPurchases(uid) {
    if (!uid || !db) return null;
    try {
      const snap = await db.collection("live_purchases").orderBy("ts", "desc").limit(80).get();
      let hit = null;
      snap.forEach(function (doc) {
        if (hit) return;
        const d = doc.data() || {};
        if (String(d.uid || "") === String(uid)) hit = d;
      });
      if (!hit) return null;
      const planId = planKeyFromPurchase(hit);
      const days = planId === "trial_7" ? 7 : 365;
      return await activateSubscription(uid, {
        planId: planId,
        orderId: String(hit.paymentId || hit.orderId || ("recover_" + Date.now())),
        planDays: days,
        amount: hit.amount || 0,
        features: (typeof QuantrexAccess !== "undefined" && QuantrexAccess.planFeatures)
          ? QuantrexAccess.planFeatures(planId) : ["eng", "med", "jee_ts"]
      });
    } catch (_) {
      return null;
    }
  }

  function keepLocalPaid() {
    try {
      if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.paidSub) {
        const loc = QuantrexAccess.paidSub();
        if (loc && loc.active) return loc;
      }
    } catch (_) {}
    return null;
  }

  function tsMs(v) {
    if (!v) return 0;
    if (typeof v === "number") return v;
    if (v && typeof v.toDate === "function") {
      try { return v.toDate().getTime(); } catch (_) { return 0; }
    }
    if (v && typeof v.seconds === "number") return v.seconds * 1000;
    const n = Date.parse(v);
    return isNaN(n) ? 0 : n;
  }

  async function getStudentRecord(uid) {
    if (!uid || !db) return null;
    try {
      const snap = await db.collection("students").doc(uid).get();
      return snap.exists ? snap.data() : null;
    } catch (_) {
      return null;
    }
  }

  async function listMyPurchases(uid) {
    if (!uid || !db) return [];
    const mapRow = function (doc) {
      const d = doc.data() || {};
      return {
        id: doc.id,
        course: d.course || d.planKey || d.planId || d.label || "",
        amount: d.amount || 0,
        orderId: d.orderId || d.paymentId || "",
        ts: tsMs(d.ts) || tsMs(d.createdAt) || Date.now(),
        name: d.name || "",
        district: d.district || ""
      };
    };
    try {
      const snap = await db.collection("live_purchases").where("uid", "==", String(uid)).orderBy("ts", "desc").limit(12).get();
      const rows = [];
      snap.forEach(function (doc) { rows.push(mapRow(doc)); });
      return rows;
    } catch (_) {
      try {
        const snap = await db.collection("live_purchases").where("uid", "==", String(uid)).limit(20).get();
        const rows = [];
        snap.forEach(function (doc) { rows.push(mapRow(doc)); });
        rows.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
        return rows;
      } catch (e2) {
        return [];
      }
    }
  }

  async function getSubscription(uid) {
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.ALL_COURSES_FREE) {
      const free = QuantrexAccess.FREE_ALL_SUB || QuantrexAccess.paidSub();
      try {
        if (QuantrexAccess.applyRemoteSub) QuantrexAccess.applyRemoteSub(free);
      } catch (_) {}
      return free || { active: true, planId: "all_free", features: ["eng", "med", "jee_ts"] };
    }
    if (!uid || !db) {
      const loc = keepLocalPaid();
      if (loc) return loc;
      try {
        if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.applyRemoteSub && !(QuantrexAccess.isAdmin && QuantrexAccess.isAdmin())) {
          QuantrexAccess.applyRemoteSub({ active: false });
        }
      } catch (_) {}
      return { active: false };
    }
    const snap = await subscriptionRef(uid).get();
    if (!snap.exists) {
      const recovered = await recoverPaidFromPurchases(uid);
      if (recovered && recovered.active) return recovered;
      const loc = keepLocalPaid();
      if (loc) return loc;
      try {
        if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.applyRemoteSub && !(QuantrexAccess.isAdmin && QuantrexAccess.isAdmin())) {
          QuantrexAccess.applyRemoteSub({ active: false });
        }
      } catch (_) {}
      return { active: false };
    }
    const data = snap.data();
    const expires = tsMs(data.expiresAt);
    const started = tsMs(data.startedAt) || tsMs(data.activatedAt);
    const active = !!data.active && (!expires || expires > Date.now());
    const out = {
      ...data,
      active,
      expiresAt: expires || 0,
      startedAt: started || 0,
      orderId: data.orderId || data.paymentId || "",
      amount: data.amount || 0,
      features: Array.isArray(data.features) ? data.features : []
    };
    try {
      if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.isAdmin && QuantrexAccess.isAdmin()) {
        QuantrexAccess.grantIfOwner && QuantrexAccess.grantIfOwner();
        return { active: true, planId: "admin_full", features: ["eng", "med", "jee_ts"], expiresAt: Date.parse("2099-12-31T23:59:59+05:30") };
      }
      if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.applyRemoteSub) {
        QuantrexAccess.applyRemoteSub(active ? out : { active: false });
      } else if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.saveSub) {
        QuantrexAccess.saveSub(active ? out : { active: false });
      }
    } catch (_) {}
    return out;
  }

  async function activateSubscription(uid, { planId, orderId, planDays, amount, features }) {
    const days = Number(planDays) || 7;
    const expiresAt = new Date(Date.now() + days * 86400000);
    let feats = Array.isArray(features) ? features.filter(Boolean) : [];
    if (!feats.length && typeof QuantrexAccess !== "undefined" && QuantrexAccess.planFeatures) {
      feats = QuantrexAccess.planFeatures(planId);
    }
    if (!feats.length) feats = ["eng", "med", "jee_ts"];
    const startedAt = new Date();
    const localSub = {
      active: true,
      planId,
      features: feats,
      startedAt: startedAt.getTime(),
      expiresAt: expiresAt.getTime(),
      orderId: orderId || "",
      amount: amount || 0
    };
    try {
      if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.saveSub) QuantrexAccess.saveSub(localSub);
    } catch (_) {}
    if (!uid || !db) return { ok: true, ...localSub, days };
    try {
      const prev = await subscriptionRef(uid).get();
      if (prev.exists) {
        const old = prev.data() || {};
        const oldFeats = Array.isArray(old.features) ? old.features : [];
        feats = Array.from(new Set(oldFeats.concat(feats)));
        const oldExp = old.expiresAt && old.expiresAt.toDate ? old.expiresAt.toDate().getTime() : Number(old.expiresAt || 0);
        if (oldExp > expiresAt.getTime()) expiresAt.setTime(oldExp);
        localSub.features = feats;
        localSub.expiresAt = expiresAt.getTime();
        try { if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.saveSub) QuantrexAccess.saveSub(localSub); } catch (_) {}
      }
      await subscriptionRef(uid).set({
        uid,
        active: true,
        planId,
        orderId: String(orderId || ("pay_" + Date.now())),
        amount: amount || 0,
        features: feats,
        startedAt: firebase.firestore.Timestamp.fromDate(startedAt),
        expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
        activatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        activation_source: "payment"
      }, { merge: true });
    } catch (e) {
      console.warn("subscription write", e && e.message);
    }
    try {
      await userRef(uid).set({ premium: true, planId }, { merge: true });
    } catch (_) {}
    try {
      const now = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("students").doc(uid).set({
        subscriptionStatus: "active",
        subscriptionPlan: planId || "plan_trial_7",
        subscriptionStartDate: now,
        subscriptionEndDate: firebase.firestore.Timestamp.fromDate(expiresAt),
        updatedAt: now
      }, { merge: true });
    } catch (e) {
      console.warn("student subscription", e && e.message);
    }
    return { ok: true, active: true, startedAt: startedAt.getTime(), expiresAt: expiresAt.getTime(), planId, orderId, amount: amount || 0, days, features: feats };
  }

  function watchSubscription(uid, callback) {
    if (!uid || !db) return () => {};
    return subscriptionRef(uid).onSnapshot(snap => {
      const data = snap.exists ? snap.data() : { active: false };
      const expires = data.expiresAt && data.expiresAt.toDate ? data.expiresAt.toDate().getTime() : 0;
      callback({ ...data, active: !!data.active && expires > Date.now() });
    });
  }

  async function logAttempt(uid, attempt) {
    if (!uid || !db || !attempt) return false;
    const id = String(attempt.id || attempt.testId || Date.now());
    await userRef(uid).collection("attempts").doc(id).set({
      id,
      exam: attempt.exam || cache.exam || "",
      testId: attempt.testId || null,
      score: Number(attempt.score || 0),
      correct: Number(attempt.correct || 0),
      incorrect: Number(attempt.incorrect || 0),
      skipped: Number(attempt.skipped || 0),
      timeSpent: Number(attempt.timeSpent || 0),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return true;
  }

  async function saveBookmarkDoc(uid, bookmark) {
    if (!uid || !db || !bookmark || !bookmark.id) return false;
    await userRef(uid).collection("bookmarks").doc(String(bookmark.id)).set({
      id: String(bookmark.id),
      exam: bookmark.exam || "",
      subject: bookmark.subject || "",
      chapter: bookmark.chapter || "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return true;
  }

  async function saveProgressItem(uid, item) {
    if (!uid || !db || !item || !item.id) return false;
    await userRef(uid).collection("progress").doc(String(item.id)).set({
      id: String(item.id),
      kind: item.kind || "chapter",
      exam: item.exam || "",
      subject: item.subject || "",
      chapter: item.chapter || "",
      completed: !!item.completed,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return true;
  }

  async function signOut() {
    if (listener) { listener(); listener = null; }
    currentUid = null;
    if (auth) await auth.signOut();
    localStorage.removeItem("quantrex_user");
    localStorage.removeItem("quantrex_admin");
    localStorage.removeItem("quantrex_portal");
    localStorage.removeItem("quantrex_teacher_profile");
  }

  function authErrorMessage(code, fallback) {
    const map = {
      "auth/user-not-found": "Account not found. Please sign up first.",
      "auth/wrong-password": "Wrong password. Try again.",
      "auth/invalid-credential": "Wrong email or password. Try again, or create an account.",
      "auth/invalid-login-credentials": "Wrong email or password. Try again, or create an account.",
      "auth/invalid-email": "Enter a valid email address.",
      "auth/missing-password": "Enter your password.",
      "auth/missing-email": "Enter your email address.",
      "auth/email-already-in-use": "This email is already registered. Sign in instead.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/too-many-requests": "Too many attempts. Try again later.",
      "auth/popup-closed-by-user": "Google sign-in was cancelled.",
      "auth/unauthorized-domain": "This domain is not authorized.",
      "auth/invalid-phone-number": "Enter a valid 10-digit mobile number.",
      "auth/invalid-verification-code": "Incorrect OTP. Try again.",
      "auth/code-expired": "OTP expired. Request a new one.",
      "auth/missing-phone-number": "Enter your 10-digit mobile number.",
      "auth/missing-verification": "Please send OTP first.",
      "auth/captcha-check-failed": "OTP could not start. Refresh and try again.",
      "auth/quota-exceeded": "SMS limit reached. Try again later.",
      "auth/operation-not-allowed": "This login method is not enabled yet. Try Email or Google.",
      "auth/invalid-app-credential": "Phone verification failed. Refresh the page and try again.",
      "auth/missing-recaptcha-token": "OTP could not start. Refresh the page and tap Send OTP again.",
      "auth/billing-not-enabled": "Phone SMS requires Firebase billing.",
      "auth/not-ready": "App not ready. Refresh the page.",
      "auth/invalid-otp": "Incorrect OTP. Try again.",
      "auth/network-request-failed": "Network error. Check your connection and try again.",
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
    flushProgress,
    saveProgress,
    ensureUserProfile,
    watchAuth,
    seedAppMeta,
    getSubscription,
    getStudentRecord,
    listMyPurchases,
    activateSubscription,
    watchSubscription,
    logAttempt,
    saveBookmarkDoc,
    saveProgressItem,
    signOut,
    authErrorMessage,
    set onDataChange(fn) { onDataChange = fn; }
  };
})();