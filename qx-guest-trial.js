// Quantrex Academy — guest browse + 1 free peek (paid unlock in qx-access.js)
const QuantrexGuestTrial = (() => {
  const START_KEY = "quantrex_guest_start";
  const OPEN_FULL_ACCESS = true;

  function isLoggedIn() {
    try {
      const u = JSON.parse(localStorage.getItem("quantrex_user") || "null");
      if (u && u.uid && String(u.uid).indexOf("guest_") !== 0) return true;
    } catch (e) { /* */ }
    if (typeof QuantrexDB !== "undefined" && QuantrexDB.uid) return true;
    if (typeof QuantrexDB !== "undefined" && QuantrexDB.auth && QuantrexDB.auth.currentUser) return true;
    return false;
  }

  function ensureStart() {
    if (!localStorage.getItem(START_KEY)) {
      localStorage.setItem(START_KEY, String(Date.now()));
    }
  }

  function isActive() {
    ensureStart();
    return true;
  }

  function daysLeft() {
    return 0;
  }

  function clearOnLogin() {
    localStorage.removeItem(START_KEY);
  }

  function guestId(role) {
    if (isLoggedIn()) return null;
    const key = role === "teacher" ? "quantrex_guest_teacher_id" : "quantrex_guest_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = "guest_" + (role || "user") + "_" + Date.now();
      localStorage.setItem(key, id);
    }
    return id;
  }

  function startGuestAndGoApp(exam) {
    ensureStart();
    if (exam) localStorage.setItem("quantrex_exam", exam);
    window.location.href = exam
      ? "app.html?exam=" + encodeURIComponent(exam)
      : "app.html";
  }

  function bannerHtml() {
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.isAdmin && QuantrexAccess.isAdmin()) {
      return `<div class="qx-guest-banner">
        <span><strong>Quantrex Admin</strong> — full access on this account (all courses unlocked).</span>
      </div>`;
    }
    if (OPEN_FULL_ACCESS || (typeof QuantrexAccess !== "undefined" && QuantrexAccess.ALL_COURSES_FREE)) {
      return `<div class="qx-guest-banner">
        <span><strong>Quantrex Academy</strong> — all courses are free. No subscription.</span>
      </div>`;
    }
    const paid = typeof QuantrexAccess !== "undefined" && QuantrexAccess.paidSub && QuantrexAccess.paidSub();
    if (paid) {
      const left = Math.max(1, Math.ceil((Number(paid.expiresAt) - Date.now()) / 86400000));
      const feats = paid.features || [];
      const have = [];
      if (feats.indexOf("eng") >= 0) have.push("Engineering");
      if (feats.indexOf("med") >= 0) have.push("Medical");
      if (feats.indexOf("jee_ts") >= 0) have.push("JEE Test Series");
      const miss = [];
      if (feats.indexOf("eng") < 0) miss.push("Engineering");
      if (feats.indexOf("med") < 0) miss.push("Medical");
      if (feats.indexOf("jee_ts") < 0) miss.push("JEE Test Series");
      return `<div class="qx-guest-banner">
        <span><strong>Quantrex Academy</strong> — ${have.join(" + ") || "plan"} unlocked · ${left} day${left === 1 ? "" : "s"} left${miss.length ? " · locked: " + miss.join(", ") : ""}</span>
        <a href="pay.html" class="qx-guest-banner-btn">${miss.length ? "Unlock more →" : "Manage plan"}</a>
      </div>`;
    }
    return `<div class="qx-guest-banner">
      <span><strong>Course intro:</strong> 1st chapter free in every subject · 1 free PYQ mock per exam · 1 free chapter in every book folder · 1 free formula &amp; revision set per subject. The rest is <strong>Premium</strong>.</span>
      <a href="pay.html" class="qx-guest-banner-btn">Buy a course →</a>
    </div>`;
  }

  function expiredHtml() {
    return "";
  }

  return {
    TRIAL_DAYS: 7,
    OPEN_FULL_ACCESS,
    ensureStart,
    isActive,
    daysLeft,
    clearOnLogin,
    guestId,
    startGuestAndGoApp,
    bannerHtml,
    expiredHtml,
    isLoggedIn
  };
})();
