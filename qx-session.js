// Quantrex — one active device per student account
const QuantrexSession = (() => {
  const DEVICE_KEY = "qx_device_id";
  const ADMINS = ["quantrexacademy@gmail.com"];
  const ADMIN_PHONES = ["7750858874"];
  let unsub = null;

  function deviceId() {
    let id = "";
    try { id = localStorage.getItem(DEVICE_KEY) || ""; } catch (_) {}
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) ||
        ("dev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10));
      try { localStorage.setItem(DEVICE_KEY, id); } catch (_) {}
    }
    return id;
  }

  function isAdmin(user) {
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.isAdmin && QuantrexAccess.isAdmin()) return true;
    const email = String((user && user.email) || "").toLowerCase();
    if (ADMINS.indexOf(email) >= 0) return true;
    const ph = String((user && (user.phoneNumber || user.phone)) || "").replace(/\D/g, "");
    if (ph === "7750858874" || ph.endsWith("7750858874")) return true;
    return false;
  }

  function db() {
    if (typeof QuantrexDB !== "undefined") QuantrexDB.init();
    if (typeof firebase === "undefined" || !firebase.firestore) return null;
    return firebase.firestore();
  }

  function kick(reason) {
    try { sessionStorage.setItem("qx_kicked", reason || "another-device"); } catch (_) {}
    try { localStorage.removeItem("quantrex_user"); } catch (_) {}
    if (typeof firebase !== "undefined" && firebase.auth) {
      firebase.auth().signOut().catch(function () {});
    }
    const next = "login.html?kicked=1";
    if (!/login\.html/i.test(location.pathname)) location.replace(next);
  }

  async function claim(user) {
    if (!user || !user.uid || isAdmin(user)) return true;
    const fire = db();
    if (!fire) return true;
    const id = deviceId();
    try {
      await fire.collection("users").doc(user.uid).set({
        uid: user.uid,
        sessionDeviceId: id,
        sessionAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("session claim", e && e.message);
    }
    watch(user);
    return true;
  }

  function watch(user) {
    if (unsub) { try { unsub(); } catch (_) {} unsub = null; }
    if (!user || !user.uid || isAdmin(user)) return;
    const fire = db();
    if (!fire) return;
    const mine = deviceId();
    unsub = fire.collection("users").doc(user.uid).onSnapshot(function (snap) {
      if (!snap.exists) return;
      const remote = snap.data() && snap.data().sessionDeviceId;
      if (remote && remote !== mine) kick("another-device");
    }, function () { /* offline */ });
  }

  function start() {
    let user = null;
    try { user = JSON.parse(localStorage.getItem("quantrex_user") || "null"); } catch (_) {}
    if (typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser) {
      user = firebase.auth().currentUser;
    }
    if (user && user.uid) watch(user);
    if (typeof firebase !== "undefined" && firebase.auth) {
      firebase.auth().onAuthStateChanged(function (u) {
        if (u) watch(u);
      });
    }
  }

  return { deviceId, claim, watch, start, kick };
})();
