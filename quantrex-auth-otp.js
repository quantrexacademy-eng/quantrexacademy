// Quantrex — Real OTP login (Cloud Functions Phone/Email + Firebase Phone fallback)
const QuantrexAuthOtp = (() => {
  let recaptchaVerifier = null;
  let phoneConfirmation = null;
  let channel = null; // "phone" | "email"
  let target = ""; // +91XXXXXXXXXX or email
  let phone10 = "";
  let phoneUsesFirebase = false;

  function auth() {
    if (typeof QuantrexDB === "undefined" || !QuantrexDB.init()) return null;
    return QuantrexDB.auth;
  }

  function functions() {
    if (typeof firebase === "undefined" || !firebase.functions) return null;
    return firebase.app().functions("us-central1");
  }

  function resetRecaptcha() {
    if (recaptchaVerifier) {
      try { recaptchaVerifier.clear(); } catch (e) { /* */ }
      recaptchaVerifier = null;
    }
    const el = document.getElementById("recaptcha-container");
    if (el) el.innerHTML = "";
  }

  async function initRecaptcha(containerId, size) {
    const a = auth();
    if (!a) throw Object.assign(new Error("Firebase auth not ready"), { code: "auth/not-ready" });
    resetRecaptcha();
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier(containerId || "recaptcha-container", {
      size: size || "normal",
      callback: () => {},
      "expired-callback": () => {
        resetRecaptcha();
      }
    });
    await recaptchaVerifier.render();
    return recaptchaVerifier;
  }

  function normalizePhone10(raw) {
    const digits = String(raw || "").replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
    return digits.slice(0, 10);
  }

  function mapCallableError(err) {
    const code = (err && err.code) || "";
    const message = (err && err.message) || String(err || "");
    if (code === "functions/failed-precondition") {
      return Object.assign(new Error(message), { code: "functions/failed-precondition" });
    }
    if (code === "functions/not-found") {
      return Object.assign(new Error(message), { code: "functions/not-found" });
    }
    if (code === "functions/deadline-exceeded") {
      return Object.assign(new Error(message), { code: "functions/deadline-exceeded" });
    }
    if (code === "functions/permission-denied") {
      return Object.assign(new Error(message), { code: "functions/permission-denied" });
    }
    if (code === "functions/resource-exhausted") {
      return Object.assign(new Error(message), { code: "functions/resource-exhausted" });
    }
    if (code === "functions/invalid-argument") {
      return Object.assign(new Error(message), { code: "functions/invalid-argument" });
    }
    if (code === "functions/unavailable" || code === "functions/internal") {
      return Object.assign(new Error(message), { code: "functions/internal" });
    }
    return Object.assign(new Error(message), { code: code || "functions/internal" });
  }

  async function sendPhoneOtpViaFunction(ten) {
    const fn = functions();
    if (!fn) throw Object.assign(new Error("Firebase Functions not loaded"), { code: "functions/not-ready" });
    const callable = fn.httpsCallable("sendPhoneOtp");
    const res = await callable({ phone: ten });
    const data = res.data || { ok: true };
    if (data.demo && data.demoOtp) data._demoOtp = data.demoOtp;
    return data;
  }

  async function sendPhoneOtpViaFirebase(ten) {
    const a = auth();
    if (!a) throw Object.assign(new Error("Firebase auth not ready"), { code: "auth/not-ready" });
    channel = "phone";
    target = "+91" + ten;
    phone10 = ten;
    phoneUsesFirebase = true;
    const verifier = await initRecaptcha("recaptcha-container", "normal");
    try {
      await verifier.verify();
    } catch (e) {
      resetRecaptcha();
      throw e;
    }
    phoneConfirmation = await a.signInWithPhoneNumber(target, verifier);
    return { channel, target, provider: "firebase" };
  }

  async function sendPhoneOtp(rawPhone) {
    const ten = normalizePhone10(rawPhone);
    if (ten.length !== 10 || !/^[6-9]/.test(ten)) {
      throw Object.assign(new Error("Enter a valid 10-digit Indian mobile number"), { code: "auth/invalid-phone" });
    }
    channel = "phone";
    target = "+91" + ten;
    phone10 = ten;
    phoneUsesFirebase = false;
    phoneConfirmation = null;
    resetRecaptcha();

    try {
      const data = await sendPhoneOtpViaFunction(ten);
      return {
        channel,
        target,
        provider: (data && data.provider) || (data && data.demo ? "demo" : "cloud"),
        demo: !!(data && data.demo),
        demoOtp: data && (data.demoOtp || data._demoOtp)
      };
    } catch (err) {
      const code = err && err.code;
      const useFirebaseFallback = code === "functions/failed-precondition"
        || code === "functions/not-found"
        || code === "functions/unavailable"
        || code === "functions/internal"
        || code === "functions/not-ready";
      if (!useFirebaseFallback) throw mapCallableError(err);
      try {
        return await sendPhoneOtpViaFirebase(ten);
      } catch (fbErr) {
        if (code === "functions/failed-precondition") {
          throw Object.assign(
            new Error("Mobile SMS is not configured and phone login failed. Try email OTP or Google."),
            { code: "functions/failed-precondition", cause: fbErr }
          );
        }
        throw fbErr;
      }
    }
  }

  async function verifyPhoneOtp(code) {
    const entered = String(code || "").trim();
    if (phoneUsesFirebase) {
      if (!phoneConfirmation) {
        throw Object.assign(new Error("Please send OTP first"), { code: "auth/missing-verification" });
      }
      const cred = await phoneConfirmation.confirm(entered);
      resetRecaptcha();
      phoneConfirmation = null;
      channel = null;
      phoneUsesFirebase = false;
      return cred.user;
    }

    const fn = functions();
    const a = auth();
    if (!fn || !a) throw Object.assign(new Error("Firebase not ready"), { code: "auth/not-ready" });
    if (!phone10) throw Object.assign(new Error("Please send OTP first"), { code: "auth/missing-verification" });

    const callable = fn.httpsCallable("verifyPhoneOtp");
    const res = await callable({ phone: phone10, code: entered });
    const token = res.data && res.data.token;
    if (!token) throw Object.assign(new Error("OTP verify failed"), { code: "auth/invalid-otp" });
    const cred = await a.signInWithCustomToken(token);
    channel = null;
    phone10 = "";
    return cred.user;
  }

  async function resendPhoneOtp(rawPhone) {
    resetRecaptcha();
    phoneConfirmation = null;
    phoneUsesFirebase = false;
    return sendPhoneOtp(rawPhone || phone10);
  }

  async function sendEmailOtp(email) {
    const fn = functions();
    if (!fn) throw Object.assign(new Error("Firebase Functions not loaded"), { code: "functions/not-ready" });
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw Object.assign(new Error("Enter a valid email address"), { code: "auth/invalid-email" });
    }
    channel = "email";
    target = normalized;
    const callable = fn.httpsCallable("sendEmailOtp");
    const res = await callable({ email: normalized });
    const data = res.data || { ok: true };
    return {
      ...data,
      demo: !!data.demo,
      demoOtp: data.demoOtp
    };
  }

  async function verifyEmailOtp(email, code) {
    const fn = functions();
    const a = auth();
    if (!fn || !a) throw Object.assign(new Error("Firebase not ready"), { code: "auth/not-ready" });
    const normalized = String(email || "").trim().toLowerCase();
    const callable = fn.httpsCallable("verifyEmailOtp");
    const res = await callable({ email: normalized, code: String(code || "").trim() });
    const token = res.data && res.data.token;
    if (!token) throw Object.assign(new Error("OTP verify failed"), { code: "auth/invalid-otp" });
    const cred = await a.signInWithCustomToken(token);
    channel = null;
    return cred.user;
  }

  function friendlyError(err) {
    if (!err) return "Something went wrong. Try again.";
    const code = err.code || "";
    const message = err.message || String(err);
    if (typeof QuantrexDB !== "undefined" && QuantrexDB.authErrorMessage) {
      return QuantrexDB.authErrorMessage(code, message);
    }
    return message;
  }

  return {
    sendPhoneOtp,
    verifyPhoneOtp,
    resendPhoneOtp,
    sendEmailOtp,
    verifyEmailOtp,
    resetRecaptcha,
    initRecaptcha,
    friendlyError,
    get channel() { return channel; },
    get target() { return target; }
  };
})();