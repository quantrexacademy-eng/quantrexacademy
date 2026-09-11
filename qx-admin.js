/**
 * Quantrex Admin Control — open via 10 clicks on brand logo (owner only).
 * Student activity, reports, bookmarks, progress — full local control panel.
 */
(function () {
  "use strict";

  const KEY_ADMIN = "quantrex_admin_unlocked";
  const KEY_REPORTS = "quantrex_question_reports";
  let _logoClicks = 0;
  let _logoTimer = null;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (_) {
      return fallback;
    }
  }

  function userInfo() {
    try {
      return JSON.parse(localStorage.getItem("quantrex_user") || "null") || {};
    } catch (_) {
      return {};
    }
  }

  function collectSnapshot() {
    const u = userInfo();
    const solved = (typeof STATE !== "undefined" && STATE.solved) || readJson("quantrex_solved", []);
    const bookmarks = (typeof STATE !== "undefined" && STATE.bookmarks) || readJson("quantrex_bookmarks", []);
    const notes = readJson("quantrex_notes", []);
    const reports = readJson(KEY_REPORTS, []);
    const exam = (typeof STATE !== "undefined" && STATE.exam) || localStorage.getItem("quantrex_exam") || "—";
    const theme = localStorage.getItem("quantrex_theme") || "—";
    const cls = localStorage.getItem("qx_student_class") || "—";
    const correct = solved.filter(s => s && s.correct).length;
    const wrong = solved.filter(s => s && !s.correct).length;
    return {
      user: u,
      exam,
      theme,
      cls,
      solved,
      correct,
      wrong,
      bookmarks,
      notes,
      reports,
      keys: Object.keys(localStorage).filter(k => /^quantrex|^qx_/i.test(k)).sort()
    };
  }

  function closeAdmin() {
    const el = document.getElementById("qxAdminPanel");
    if (el) el.remove();
    document.body.classList.remove("qx-admin-open");
  }

  function exportAll() {
    const snap = collectSnapshot();
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "quantrex-student-export-" + Date.now() + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    if (typeof showToast === "function") showToast("📥 Export downloaded");
  }

  function clearReports() {
    if (!confirm("Clear all question reports on this device?")) return;
    localStorage.removeItem(KEY_REPORTS);
    openAdmin();
    if (typeof showToast === "function") showToast("Reports cleared");
  }

  function clearProgress() {
    if (!confirm("Clear solved progress, bookmarks & notes on this device?")) return;
    try {
      localStorage.removeItem("quantrex_solved");
      localStorage.removeItem("quantrex_bookmarks");
      localStorage.removeItem("quantrex_bookmarks_v2");
      localStorage.removeItem("quantrex_notes");
      if (typeof STATE !== "undefined") {
        STATE.solved = [];
        STATE.bookmarks = [];
        if (STATE.notes) STATE.notes = [];
      }
    } catch (_) { /* */ }
    openAdmin();
    if (typeof showToast === "function") showToast("Progress cleared");
  }

  function reportRows(reports) {
    if (!reports.length) {
      return `<div class="qx-admin-empty">No student reports yet. Reports appear when a student uses Report Question on any MCQ.</div>`;
    }
    const sorted = reports.slice().reverse();
    return `<div class="qx-admin-table-wrap"><table class="qx-admin-table">
      <thead><tr>
        <th>Time</th><th>Type</th><th>Q ID</th><th>Subject</th><th>Chapter</th><th>Notes</th>
      </tr></thead>
      <tbody>
        ${sorted.map(r => {
          const t = r.ts ? new Date(r.ts).toLocaleString() : "—";
          return `<tr>
            <td>${esc(t)}</td>
            <td><span class="qx-admin-pill">${esc(r.type || "—")}</span></td>
            <td>${esc(r.questionId)}</td>
            <td>${esc(r.subject)}</td>
            <td>${esc(r.chapter)}</td>
            <td>${esc(r.notes || "—")}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table></div>`;
  }

  function solvedRows(solved) {
    if (!solved.length) return `<div class="qx-admin-empty">No solved attempts logged yet.</div>`;
    const last = solved.slice(-40).reverse();
    return `<div class="qx-admin-table-wrap"><table class="qx-admin-table">
      <thead><tr><th>Q ID</th><th>Result</th><th>When</th></tr></thead>
      <tbody>
        ${last.map(s => `<tr>
          <td>${esc(s.id)}</td>
          <td class="${s.correct ? "ok" : "no"}">${s.correct ? "✓ Correct" : "✗ Wrong"}</td>
          <td>${esc(s.ts ? new Date(s.ts).toLocaleString() : "—")}</td>
        </tr>`).join("")}
      </tbody>
    </table></div>`;
  }

  function panelHtml(snap) {
    const name = snap.user.name || snap.user.email || "Guest student";
    const email = snap.user.email || "—";
    return `<div class="qx-admin-overlay" id="qxAdminPanel" onclick="if(event.target===this)QxAdmin.close()">
      <div class="qx-admin-shell" role="dialog" aria-label="Quantrex Admin Control">
        <header class="qx-admin-head">
          <div class="qx-admin-brand">
            <img src="assets/quantrex-logo-3d-64.png?v=qxfix104" alt="" width="32" height="32" class="qx-ui-brand-logo">
            <div>
              <strong>Quantrex Admin Control</strong>
              <small>Student activity · reports · payments · Firebase</small>
            </div>
          </div>
          <button type="button" class="qx-admin-x" onclick="QxAdmin.close()" aria-label="Close">✕</button>
        </header>
        <div class="qx-admin-stats">
          <div class="qx-admin-stat"><b>${esc(name)}</b><span>Student</span></div>
          <div class="qx-admin-stat"><b>${esc(email)}</b><span>Email</span></div>
          <div class="qx-admin-stat"><b>${esc(snap.exam)}</b><span>Track</span></div>
          <div class="qx-admin-stat"><b>Class ${esc(snap.cls)}</b><span>Class</span></div>
          <div class="qx-admin-stat ok"><b>${snap.correct}</b><span>Correct</span></div>
          <div class="qx-admin-stat no"><b>${snap.wrong}</b><span>Wrong</span></div>
          <div class="qx-admin-stat"><b>${snap.solved.length}</b><span>Attempts</span></div>
          <div class="qx-admin-stat"><b>${Array.isArray(snap.bookmarks) ? snap.bookmarks.length : 0}</b><span>Bookmarks</span></div>
          <div class="qx-admin-stat warn"><b>${snap.reports.length}</b><span>Reports</span></div>
        </div>
        <nav class="qx-admin-tabs" id="qxAdminTabs">
          <button type="button" class="on" data-tab="reports">🚩 Reports</button>
          <button type="button" data-tab="activity">📊 Activity</button>
          <button type="button" data-tab="storage">🗄 Storage</button>
          <button type="button" data-tab="actions">⚡ Actions</button>
          <button type="button" data-tab="health">📦 Content health</button>
          <button type="button" data-tab="courses">🔓 Courses</button>
          <button type="button" data-tab="owner">🏫 Owner</button>
        </nav>
        <div class="qx-admin-body">
          <section class="qx-admin-pane on" data-pane="reports">
            <h3>Question reports from this student</h3>
            <p class="qx-admin-hint">Submitted via Report Question on every MCQ (Typo / Answer / Classification / Translation / Other).</p>
            ${reportRows(snap.reports)}
          </section>
          <section class="qx-admin-pane" data-pane="activity">
            <h3>Recent solve activity</h3>
            ${solvedRows(snap.solved)}
            <h3 style="margin-top:18px">Bookmarks</h3>
            <div class="qx-admin-empty">${Array.isArray(snap.bookmarks) && snap.bookmarks.length
              ? esc(JSON.stringify(snap.bookmarks.slice(0, 30)))
              : "No bookmarks."}</div>
          </section>
          <section class="qx-admin-pane" data-pane="storage">
            <h3>Local storage keys (Quantrex)</h3>
            <ul class="qx-admin-keys">${snap.keys.map(k => `<li><code>${esc(k)}</code></li>`).join("") || "<li>None</li>"}</ul>
          </section>
          <section class="qx-admin-pane" data-pane="actions">
            <h3>Control actions</h3>
            <div class="qx-admin-actions">
              <button type="button" class="qx-admin-btn primary" onclick="QxAdmin.exportAll()">📥 Export all JSON</button>
              <button type="button" class="qx-admin-btn" onclick="QxAdmin.clearReports()">Clear reports</button>
              <button type="button" class="qx-admin-btn danger" onclick="QxAdmin.clearProgress()">Reset student progress</button>
              <button type="button" class="qx-admin-btn" onclick="QxAdmin.close()">Close panel</button>
            </div>
            <p class="qx-admin-hint">Tip: click Quantrex logo 10 times (owner login) to reopen Admin Control.</p>
          </section>
          <section class="qx-admin-pane" data-pane="health">
            <h3>Firebase content health</h3>
            <p class="qx-admin-hint">Student site loads questions from Firestore + local Quantrex catalog. Marks is migration-only.</p>
            <div id="qxContentHealth" class="qx-admin-empty">Loading health…</div>
            <div class="qx-admin-actions" style="margin-top:12px">
              <button type="button" class="qx-admin-btn" onclick="QxAdmin.refreshHealth()">Refresh counts</button>
            </div>
          </section>
          <section class="qx-admin-pane" data-pane="courses">
            <h3>Lock / unlock student courses</h3>
            <p class="qx-admin-hint">If a student paid but content stayed locked, search them and unlock the plan. Writes to Firestore subscriptions.</p>
            <div class="qx-admin-actions" style="margin-bottom:12px">
              <input id="qxAdminStuQ" type="search" placeholder="Email, mobile, name, uid, payment id" style="flex:1;min-width:180px;height:40px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;padding:0 12px">
              <button type="button" class="qx-admin-btn primary" onclick="QxAdmin.searchStudents()">Search</button>
            </div>
            <div id="qxAdminCourses" class="qx-admin-empty">Tap Search to load recent purchases.</div>
          </section>
          <section class="qx-admin-pane" data-pane="owner">
            <h3>Coaching owner setup</h3>
            <p class="qx-admin-hint">Firebase project: quantrexacademy-app (quantrexacademy@gmail.com). Payments use live Razorpay on Vercel.</p>
            <div class="qx-admin-actions">
              <a class="qx-admin-btn primary" href="https://console.firebase.google.com/project/quantrexacademy-app/authentication/providers" target="_blank" rel="noopener">Enable Phone + Email in Firebase</a>
              <a class="qx-admin-btn" href="https://console.firebase.google.com/project/quantrexacademy-app/authentication/settings" target="_blank" rel="noopener">Authorized domains</a>
              <a class="qx-admin-btn" href="pay.html">Open ₹499 checkout</a>
              <a class="qx-admin-btn" href="https://dashboard.razorpay.com/app/payments" target="_blank" rel="noopener">Razorpay payments</a>
            </div>
            <ol class="qx-admin-hint" style="padding-left:18px;line-height:1.6">
              <li>Firebase → Authentication → Sign-in method → <strong>Phone</strong> → Enable.</li>
              <li>Also enable <strong>Email/Password</strong> if Create Account fails.</li>
              <li>Domains: quantrexacademy.com and www.quantrexacademy.com</li>
              <li>Checkout: login → /pay → plan → Razorpay. After pay, Profile shows Access Course.</li>
              <li>Logo 10 taps (login or app) opens this panel for the owner account only.</li>
            </ol>
          </section>
        </div>
      </div>
    </div>`;
  }

  function bindTabs() {
    const tabs = document.getElementById("qxAdminTabs");
    if (!tabs) return;
    tabs.querySelectorAll("button").forEach(btn => {
      btn.onclick = () => {
        tabs.querySelectorAll("button").forEach(b => b.classList.toggle("on", b === btn));
        document.querySelectorAll(".qx-admin-pane").forEach(p => {
          p.classList.toggle("on", p.getAttribute("data-pane") === btn.getAttribute("data-tab"));
        });
      };
    });
  }

  function isOwnerAdmin() {
    try {
      return typeof QuantrexAccess !== "undefined" && QuantrexAccess.isAdmin && QuantrexAccess.isAdmin();
    } catch (_) { return false; }
  }

  function planOpts() {
    return [
      ["trial_7", "7-Day Pass (all courses)", 7],
      ["eng_complete", "Engineering Complete", 365],
      ["eng_combo", "Engineering Combo", 365],
      ["jee_ts", "JEE Main Test Series", 365],
      ["med_complete", "Medical Complete", 365]
    ];
  }

  async function searchStudents() {
    const box = document.getElementById("qxAdminCourses");
    if (!box) return;
    const q = String((document.getElementById("qxAdminStuQ") && document.getElementById("qxAdminStuQ").value) || "").trim().toLowerCase();
    box.textContent = "Loading purchases…";
    let rows = [];
    try {
      if (!firebase || !firebase.firestore) throw new Error("Firebase not ready");
      const db = firebase.firestore();
      const snap = await db.collection("live_purchases").orderBy("ts", "desc").limit(80).get();
      snap.forEach(function (doc) {
        const d = doc.data() || {};
        rows.push({
          id: doc.id,
          uid: d.uid || "",
          name: d.name || "Student",
          course: d.course || "",
          planKey: d.planKey || "",
          district: d.district || "",
          state: d.state || "",
          ts: d.ts || 0
        });
      });
      const subs = await db.collection("subscriptions").limit(80).get();
      subs.forEach(function (doc) {
        const d = doc.data() || {};
        rows.push({
          id: "sub-" + doc.id,
          uid: doc.id,
          name: d.email || d.name || doc.id.slice(0, 10),
          course: d.planId || "",
          planKey: d.planId || "",
          district: d.active ? "ACTIVE" : "locked",
          state: "",
          ts: Date.now(),
          sub: d
        });
      });
    } catch (e) {
      box.textContent = "Could not load. Sign in as owner (quantrexacademy@gmail.com) so Firestore admin rules apply. " + (e && e.message ? e.message : "");
      return;
    }
    if (q) {
      rows = rows.filter(function (r) {
        return (r.uid + " " + r.name + " " + r.course + " " + r.planKey + " " + (r.sub && r.sub.orderId || "")).toLowerCase().indexOf(q) >= 0;
      });
    }
    if (!rows.length) {
      box.innerHTML = "<p class='qx-admin-empty'>No matching purchases. Unlock by Firebase uid below.</p>" + unlockFormHtml({ uid: q, name: "", course: "trial_7" });
      return;
    }
    box.innerHTML = rows.slice(0, 40).map(function (r) {
      const when = r.ts ? new Date(r.ts).toLocaleString("en-IN") : "";
      return "<div class='qx-admin-stu'>" +
        "<strong>" + esc(r.name) + "</strong> · " + esc(r.course || r.planKey) +
        "<div class='qx-admin-hint'>" + esc(r.uid) + (r.district ? " · " + esc(r.district) : "") + " · " + esc(when) + "</div>" +
        unlockFormHtml(r) +
        "</div>";
    }).join("");
  }

  function unlockFormHtml(r) {
    const uid = esc(r.uid || "");
    const opts = planOpts().map(function (p) {
      const sel = String(r.planKey || r.course || "").indexOf(p[0]) >= 0 || String(r.course).toLowerCase().indexOf(p[1].split(" ")[0].toLowerCase()) >= 0 ? " selected" : "";
      return "<option value='" + p[0] + "' data-days='" + p[2] + "'" + sel + ">" + p[1] + "</option>";
    }).join("");
    return "<div class='qx-admin-unlock'>" +
      "<input data-uid value='" + uid + "' placeholder='Firebase uid'>" +
      "<select data-plan>" + opts + "</select>" +
      "<input data-days type='number' min='1' value='7' style='width:72px' title='Days'>" +
      "<input data-note placeholder='Reason / payment id'>" +
      "<button type='button' class='qx-admin-btn primary' onclick='QxAdmin.unlockFrom(this)'>Unlock</button>" +
      "<button type='button' class='qx-admin-btn danger' onclick='QxAdmin.revokeFrom(this)'>Lock</button>" +
      "</div>";
  }

  async function unlockFrom(btn) {
    const wrap = btn && btn.closest(".qx-admin-unlock");
    if (!wrap) return;
    const uid = String((wrap.querySelector("[data-uid]") && wrap.querySelector("[data-uid]").value) || "").trim();
    const sel = wrap.querySelector("[data-plan]");
    const planKey = sel ? sel.value : "trial_7";
    const days = Number((wrap.querySelector("[data-days]") && wrap.querySelector("[data-days]").value) || 7) || 7;
    const note = String((wrap.querySelector("[data-note]") && wrap.querySelector("[data-note]").value) || "").trim();
    if (!uid) return alert("Need the student's Firebase uid.");
    if (!confirm("Unlock " + planKey + " for " + uid + " for " + days + " days?")) return;
    const feats = (typeof QuantrexAccess !== "undefined" && QuantrexAccess.planFeatures)
      ? QuantrexAccess.planFeatures(planKey) : ["eng", "med", "jee_ts"];
    try {
      const db = firebase.firestore();
      const exp = new Date(Date.now() + days * 86400000);
      await db.collection("subscriptions").doc(uid).set({
        uid: uid,
        active: true,
        planId: planKey,
        orderId: "admin_" + Date.now(),
        amount: 0,
        features: feats,
        startedAt: firebase.firestore.Timestamp.fromDate(new Date()),
        expiresAt: firebase.firestore.Timestamp.fromDate(exp),
        activatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        activation_source: "admin",
        adminNote: note
      }, { merge: true });
      await db.collection("admin_audit").add({
        admin: "quantrexacademy@gmail.com",
        studentUid: uid,
        action: "unlock",
        planKey: planKey,
        days: days,
        note: note,
        ts: Date.now()
      });
      if (typeof showToast === "function") showToast("Unlocked " + planKey);
      searchStudents();
    } catch (e) {
      alert((e && e.message) || "Unlock failed — sign in as owner on Firebase.");
    }
  }

  async function revokeFrom(btn) {
    const wrap = btn && btn.closest(".qx-admin-unlock");
    if (!wrap) return;
    const uid = String((wrap.querySelector("[data-uid]") && wrap.querySelector("[data-uid]").value) || "").trim();
    if (!uid) return;
    if (!confirm("Revoke course access for " + uid + "?")) return;
    try {
      await firebase.firestore().collection("subscriptions").doc(uid).set({
        uid: uid,
        active: false,
        orderId: "admin_revoke_" + Date.now()
      }, { merge: true });
      await firebase.firestore().collection("admin_audit").add({
        admin: "quantrexacademy@gmail.com",
        studentUid: uid,
        action: "revoke",
        ts: Date.now()
      });
      if (typeof showToast === "function") showToast("Access locked");
      searchStudents();
    } catch (e) {
      alert((e && e.message) || "Revoke failed");
    }
  }

  function openAdmin() {
    if (!isOwnerAdmin()) {
      if (typeof showToast === "function") showToast("Owner login required");
      return;
    }
    closeAdmin();
    try { localStorage.setItem(KEY_ADMIN, "1"); } catch (_) { /* */ }
    const snap = collectSnapshot();
    document.body.insertAdjacentHTML("beforeend", panelHtml(snap));
    document.body.classList.add("qx-admin-open");
    bindTabs();
    refreshHealth();
  }

  async function refreshHealth() {
    const box = document.getElementById("qxContentHealth");
    if (!box) return;
    box.textContent = "Loading health…";
    let data = null;
    try {
      if (typeof QxFirebaseBank !== "undefined" && QxFirebaseBank.health) data = await QxFirebaseBank.health();
    } catch (_) { /* */ }
    if (!data) {
      box.innerHTML = "No content_health/summary yet. Run <code>node scripts/migrate-banks-to-firebase.js --text</code> on the owner machine.";
      return;
    }
    box.innerHTML = `<div class="qx-admin-stats">
      <div class="qx-admin-stat"><b>${esc(data.totalQuestions)}</b><span>Total</span></div>
      <div class="qx-admin-stat ok"><b>${esc(data.migrated)}</b><span>Migrated</span></div>
      <div class="qx-admin-stat no"><b>${esc(data.failed)}</b><span>Failed</span></div>
      <div class="qx-admin-stat"><b>${esc(data.figuresUploaded)}</b><span>Figures uploaded</span></div>
      <div class="qx-admin-stat warn"><b>${esc(data.missingFigures)}</b><span>Missing figures</span></div>
      <div class="qx-admin-stat"><b>${esc(data.updatedAt || "—")}</b><span>Updated</span></div>
    </div>
    <p class="qx-admin-hint">Student Marks runtime: ${data.studentMarksRuntime === false ? "OFF" : "check marks-live.js"}</p>`;
  }

  function onLogoClick(e) {
    e.preventDefault();
    e.stopPropagation();
    _logoClicks += 1;
    clearTimeout(_logoTimer);
    _logoTimer = setTimeout(() => { _logoClicks = 0; }, 4000);
    if (_logoClicks >= 10) {
      _logoClicks = 0;
      openAdmin();
      if (typeof showToast === "function") showToast("Quantrex Admin Control");
    }
  }

  function bindLogo() {
    const mark = document.querySelector(".sidebar-head .logo-mark, .sidebar-head");
    const target = document.querySelector(".sidebar-head .logo-mark") || document.querySelector(".sidebar-head");
    if (!target || target._qxAdminBound) return;
    target._qxAdminBound = true;
    target.style.cursor = "pointer";
    target.title = "Quantrex";
    target.addEventListener("click", onLogoClick);
  }

  function init() {
    bindLogo();
    try {
      if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.grantIfOwner) QuantrexAccess.grantIfOwner();
      if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.isAdmin && QuantrexAccess.isAdmin()) {
        try { localStorage.setItem(KEY_ADMIN, "1"); } catch (_) {}
      }
    } catch (_) { /* */ }
    // re-bind if shell re-renders
    setInterval(bindLogo, 2500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.QxAdmin = {
    open: openAdmin,
    close: closeAdmin,
    exportAll,
    clearReports,
    clearProgress,
    searchStudents,
    unlockFrom,
    revokeFrom,
    collectSnapshot,
    refreshHealth
  };
})();
