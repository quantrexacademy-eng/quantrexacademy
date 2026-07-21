// Quantrex — open full access (no login required for launch)
// Set OPEN_FULL_ACCESS = false later to enforce 7-day trial + login.
const QuantrexGuestTrial = (() => {
  const START_KEY = "quantrex_guest_start";
  const TRIAL_DAYS = 7;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  /** Launch mode: everyone gets full access without login */
  const OPEN_FULL_ACCESS = true;

  function isLoggedIn() {
    try {
      const u = JSON.parse(localStorage.getItem("quantrex_user") || "null");
      if (u && u.uid) return true;
    } catch (e) { /* */ }
    if (typeof QuantrexDB !== "undefined" && QuantrexDB.uid) return true;
    if (typeof QuantrexDB !== "undefined" && QuantrexDB.auth && QuantrexDB.auth.currentUser) return true;
    return false;
  }

  function ensureStart() {
    if (isLoggedIn()) return;
    if (!localStorage.getItem(START_KEY)) {
      localStorage.setItem(START_KEY, String(Date.now()));
    }
  }

  function startAt() {
    return parseInt(localStorage.getItem(START_KEY) || "0", 10) || 0;
  }

  function endsAt() {
    if (OPEN_FULL_ACCESS) return Date.now() + 365 * MS_PER_DAY;
    const s = startAt();
    return s ? s + TRIAL_DAYS * MS_PER_DAY : 0;
  }

  function isActive() {
    if (OPEN_FULL_ACCESS) {
      ensureStart();
      return true;
    }
    if (isLoggedIn()) return true;
    ensureStart();
    return Date.now() < endsAt();
  }

  function daysLeft() {
    if (OPEN_FULL_ACCESS) return 999;
    if (isLoggedIn()) return TRIAL_DAYS;
    const end = endsAt();
    if (!end) return TRIAL_DAYS;
    return Math.max(0, Math.ceil((end - Date.now()) / MS_PER_DAY));
  }

  function clearOnLogin() {
    localStorage.removeItem(START_KEY);
  }

  function guestId(role) {
    if (!isActive() || isLoggedIn()) return null;
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
    if (isLoggedIn()) return "";
    if (OPEN_FULL_ACCESS) {
      return `<div class="qx-guest-banner">
        <span><strong>Explore freely</strong> — full access is open. <strong>Login with email</strong> to save progress, bookmarks &amp; test history across devices.</span>
        <a href="login.html" class="qx-guest-banner-btn">Login to save progress →</a>
      </div>`;
    }
    const d = daysLeft();
    if (d <= 0) return "";
    const urgent = d <= 2;
    return `<div class="qx-guest-banner${urgent ? " urgent" : ""}">
      <span>Free access · ${d} day${d === 1 ? "" : "s"} left · <strong>Login with email</strong> to save your records</span>
      <a href="login.html" class="qx-guest-banner-btn">Login</a>
    </div>`;
  }

  function expiredHtml() {
    if (OPEN_FULL_ACCESS) return "";
    return `<div class="qx-guest-expired">
      <div class="empty" style="max-width:460px;margin:56px auto;text-align:center;padding:28px">
        <div style="font-size:56px;margin-bottom:16px">⏰</div>
        <h2 style="font-family:Kanit,sans-serif;font-size:28px;margin-bottom:10px">Continue with your account</h2>
        <p style="color:var(--gray);line-height:1.6;margin-bottom:24px">
          Sign in with your <strong>email</strong> to keep progress, bookmarks, and test history saved securely.
        </p>
        <a href="login.html" class="btn-primary" style="display:inline-block;text-decoration:none;padding:14px 32px;border-radius:11px">Login with Email</a>
      </div>
    </div>`;
  }

  return {
    TRIAL_DAYS,
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
