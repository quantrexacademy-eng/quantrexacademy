/**
 * Live purchase cards (home + pay) + in-app notifications for website updates.
 * Hidden during practice / tests.
 */
(function (global) {
  "use strict";

  const FIRSTS = [
    "Aarav", "Vivaan", "Aditya", "Rohan", "Kabir", "Arjun", "Ishaan", "Yash", "Harsh", "Kunal",
    "Ankit", "Rahul", "Dev", "Shaurya", "Krish", "Ayaan", "Siddharth", "Nikhil", "Pranav", "Ritvik",
    "Ananya", "Priya", "Isha", "Diya", "Saanvi", "Aadhya", "Kiara", "Riya", "Kavya", "Meera",
    "Sneha", "Aditi", "Tanvi", "Khushi", "Shruti", "Avni", "Nisha", "Pooja", "Ishaani", "Myra",
    "Aryan", "Om", "Reyansh", "Dhruv", "Atharv", "Ira", "Anvi", "Pari", "Navya", "Trisha"
  ];
  const LASTS = [
    "Sharma", "Verma", "Patel", "Reddy", "Iyer", "Nair", "Singh", "Yadav", "Gupta", "Joshi",
    "Deshmukh", "Banerjee", "Rao", "Pillai", "Menon", "Das", "Mishra", "Tiwari", "Pandey", "Choudhary",
    "Rathore", "Bansal", "Aggarwal", "Malhotra", "Bhat", "Sheikh", "Ansari", "Kulkarni", "Patil", "Mehta"
  ];
  const TITLES = ["", "", "", "Mr.", "Ms.", "Mrs.", "", "Mr.", "Ms."];
  /* Same five products as pay.html / lib/qx-plans.js — never invent extra courses. */
  const PAY_PLANS = [
    { key: "trial_7", label: "7-Day Pass" },
    { key: "jee_ts", label: "JEE Main Test Series" },
    { key: "eng_complete", label: "Engineering Complete" },
    { key: "eng_combo", label: "Engineering Combo" },
    { key: "med_complete", label: "Medical Complete" }
  ];
  const COURSES = PAY_PLANS.map(function (p) { return p.label; });
  const PAY_COURSE_MAP = {
    trial_7: "7-Day Pass",
    plan_trial_7: "7-Day Pass",
    "7-day pass": "7-Day Pass",
    jee_ts: "JEE Main Test Series",
    plan_jee_ts: "JEE Main Test Series",
    "jee main test series": "JEE Main Test Series",
    eng_complete: "Engineering Complete",
    plan_eng_complete: "Engineering Complete",
    "engineering complete": "Engineering Complete",
    "complete engineering": "Engineering Complete",
    eng_combo: "Engineering Combo",
    plan_eng_combo: "Engineering Combo",
    complete: "Engineering Combo",
    "engineering combo": "Engineering Combo",
    med_complete: "Medical Complete",
    plan_med_complete: "Medical Complete",
    "medical complete": "Medical Complete"
  };

  function officialCourse(course, planKey) {
    const k = String(planKey || "").trim().toLowerCase();
    if (k && PAY_COURSE_MAP[k]) return PAY_COURSE_MAP[k];
    const c = String(course || "").replace(/\s+/g, " ").trim();
    if (!c) return "";
    if (PAY_COURSE_MAP[c.toLowerCase()]) return PAY_COURSE_MAP[c.toLowerCase()];
    for (let i = 0; i < COURSES.length; i++) {
      if (COURSES[i].toLowerCase() === c.toLowerCase()) return COURSES[i];
    }
    return "";
  }
  const VERBS = ["purchased", "just enrolled in", "unlocked", "started"];
  const AGOS = ["Just now", "Just now", "1 min ago", "2 min ago"];
  const COLORS = ["#2563eb", "#7c3aed", "#db2777", "#16a34a", "#ea580c", "#0d9488", "#ca8a04"];

  const UPDATES = [
    {
      id: "qxfix114-sync",
      title: "Website and app stay in sync",
      body: "Same Quantrex Academy on the website and the Android app. Open either one — PYQ, tests, books and login match.",
      ts: Date.parse("2026-08-31T19:20:00+05:30")
    },
    {
      id: "qxfix113-free",
      title: "All courses are free",
      body: "No subscription. Every course, test series, book and PYQ is unlocked on website and app.",
      ts: Date.parse("2026-08-31T19:00:00+05:30")
    },
    {
      id: "qxfix91-play",
      title: "Website and app are connected",
      body: "Same Quantrex login on the website and the Android app. Download from the Get the app page.",
      ts: Date.parse("2026-08-27T10:00:00+05:30")
    },
    {
      id: "qxfix64-icons",
      title: "New chapter icons",
      body: "Every folder and chapter now has a professional 3D icon that matches its name.",
      ts: Date.parse("2026-08-23T10:00:00+05:30")
    },
    {
      id: "qxfix64-sol",
      title: "Clearer solutions",
      body: "If an official solution is not in the bank, you will see “Solution not available.”",
      ts: Date.parse("2026-08-23T10:10:00+05:30")
    }
  ];

  const usedNames = [];
  const usedCourses = [];
  const shownFp = new Set();
  let toastTimer = 0;
  let host = null;
  let liveUnsub = null;
  let liveTries = 0;

  function studyMode() {
    const b = document.body;
    if (!b) return false;
    if (b.classList.contains("marks-test-active")) return true;
    if (b.classList.contains("allen-practice-active")) return true;
    if (b.classList.contains("allen-cbt-active")) return true;
    if (b.classList.contains("marks-instr-active")) return true;
    if (b.classList.contains("qzrr-instr-active")) return true;
    if (b.classList.contains("ts-fmt-chooser-active")) return true;
    const v = b.getAttribute("data-qx-view") || "";
    if (/^(test|question|pyqmock)$/i.test(v)) return true;
    if (document.querySelector(".eg-test-root, .mtk-test-root, .razorpay-container")) return true;
    return false;
  }

  function pick(arr, bag) {
    if (!bag.length) {
      const copy = arr.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = copy[i];
        copy[i] = copy[j];
        copy[j] = t;
      }
      bag.push.apply(bag, copy);
    }
    return bag.pop();
  }

  function places() {
    const map = (typeof QxProfile !== "undefined" && QxProfile.INDIA) || {};
    const out = [];
    Object.keys(map).forEach(function (st) {
      (map[st] || []).forEach(function (d) {
        if (d && d !== "Other") out.push({ district: d, state: st });
      });
    });
    return out.length ? out : [{ district: "Kota", state: "Rajasthan" }];
  }

  function dummyEvent() {
    const title = pick(TITLES, []);
    const first = pick(FIRSTS, usedNames.length > 40 ? (usedNames.length = 0, usedNames) : usedNames);
    const last = LASTS[Math.floor(Math.random() * LASTS.length)];
    const loc = places()[Math.floor(Math.random() * places().length)];
    const course = pick(COURSES, usedCourses);
    const name = (title ? title + " " : "") + first + " " + last;
    return {
      name: name,
      initials: (first.charAt(0) + last.charAt(0)).toUpperCase(),
      district: loc.district,
      state: loc.state,
      course: officialCourse(course) || COURSES[0],
      verb: VERBS[Math.floor(Math.random() * VERBS.length)],
      ago: AGOS[Math.floor(Math.random() * AGOS.length)],
      color: COLORS[Math.abs(first.length + last.length) % COLORS.length],
      real: false
    };
  }

  function publicName(raw) {
    const s = String(raw || "Student").replace(/\s+/g, " ").trim();
    const parts = s.split(" ");
    if (parts.length === 1) return parts[0];
    return parts[0] + " " + parts[parts.length - 1].charAt(0).toUpperCase() + ".";
  }

  function fromProfile(course, planKey) {
    const p = typeof QxProfile !== "undefined" ? QxProfile.get() : {};
    const name = publicName(p.name || "Student");
    const parts = name.replace(/^(Mr|Ms|Mrs|Dr)\.\s+/i, "").split(" ");
    return {
      name: name,
      initials: ((parts[0] || "S").charAt(0) + (parts[1] || "Q").charAt(0)).toUpperCase(),
      district: p.district || "India",
      state: p.state || "",
      className: p.className || "",
      course: officialCourse(course, planKey) || COURSES[0],
      planKey: planKey || "",
      verb: "purchased",
      ago: "Just now",
      color: "#2563eb",
      real: true
    };
  }

  function cardHtml(ev) {
    const where = ev.district + (ev.state ? ", " + ev.state : "");
    const cls = ev.className ? " · Class " + ev.className : "";
    return (
      '<div class="qx-live-buy-card">' +
      '<span class="qx-live-dot" aria-hidden="true"></span>' +
      '<span class="qx-live-av" style="background:' + ev.color + '">' + ev.initials + "</span>" +
      '<span class="qx-live-body">' +
      "<strong>" + ev.name + "</strong>" +
      '<span class="qx-live-where">' + where + cls + "</span>" +
      '<span class="qx-live-act">' + ev.verb + " <em>" + ev.course + "</em></span>" +
      '<span class="qx-live-ago">' + ev.ago + "</span>" +
      "</span></div>"
    );
  }

  function ensureHost() {
    if (host && host.parentNode) return host;
    host = document.createElement("div");
    host.className = "qx-live-buy";
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
    return host;
  }

  function myUid() {
    try {
      if (typeof firebase !== "undefined" && firebase.auth && firebase.auth().currentUser) {
        return String(firebase.auth().currentUser.uid || "");
      }
    } catch (_) { /* */ }
    try {
      const u = JSON.parse(localStorage.getItem("quantrex_user") || "null");
      if (u && u.uid && String(u.uid).indexOf("guest_") !== 0) return String(u.uid);
    } catch (_) { /* */ }
    return "";
  }

  function recordPurchaseNotif(ev, opts) {
    const o = opts || {};
    pushNotif({
      id: o.id || ("act-" + Date.now() + "-" + String(ev.name || "s").slice(0, 8)),
      title: o.title || (ev.real ? "A student purchased a course" : "Live on Quantrex"),
      body: o.body || (ev.name + " · " + (ev.district || "India") + " · " + ev.verb + " " + ev.course),
      ts: o.ts || Date.now(),
      kind: o.kind || (ev.real ? "purchase" : "activity")
    });
  }

  function showToast(ev, opts) {
    const o = opts || {};
    if (!o.skipNotif) recordPurchaseNotif(ev, o);
    if (studyMode() || document.hidden) return;
    const fp = o.id || (String(ev.name || "") + "|" + String(ev.course || "") + "|" + Math.floor(Date.now() / 20000));
    if (shownFp.has(fp)) return;
    shownFp.add(fp);
    if (shownFp.size > 80) shownFp.clear();
    const box = ensureHost();
    box.innerHTML = cardHtml(ev);
    const card = box.firstElementChild;
    setTimeout(function () {
      if (card) card.classList.add("out");
      setTimeout(function () {
        if (card && card.parentNode) card.parentNode.removeChild(card);
      }, 400);
    }, 4800);
  }

  function nextDelay() {
    return 6500 + Math.floor(Math.random() * 2500);
  }

  function isFeedAdmin() {
    try {
      return (typeof QuantrexAccess !== "undefined" && QuantrexAccess.isAdmin && QuantrexAccess.isAdmin())
        || localStorage.getItem("quantrex_admin") === "1";
    } catch (_) { return false; }
  }

  function studentHasPaid() {
    try {
      if (isFeedAdmin()) return false;
      if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.paidSub) {
        return !!QuantrexAccess.paidSub();
      }
    } catch (_) {}
    return false;
  }

  function loop() {
    clearTimeout(toastTimer);
    if (studyMode()) {
      toastTimer = setTimeout(loop, 4000);
      return;
    }
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.ALL_COURSES_FREE) return;
    if (!studentHasPaid()) showToast(dummyEvent());
    toastTimer = setTimeout(loop, nextDelay());
  }

  function publishReal(course, planKey) {
    const ev = fromProfile(course, planKey);
    showToast(ev, { skipNotif: true });
    pushNotif({
      id: "pay-" + Date.now(),
      title: "Purchase confirmed",
      body: (ev.course || "Your plan") + " is now active on this account.",
      ts: Date.now(),
      kind: "purchase"
    });
    try {
      if (!firebase || !firebase.firestore) return ev;
      const db = firebase.firestore();
      const uid = myUid();
      db.collection("live_purchases").add({
        name: String(ev.name || "Student").slice(0, 47),
        className: String(ev.className || ""),
        district: String(ev.district || "India"),
        state: String(ev.state || ""),
        course: ev.course,
        planKey: String(planKey || ""),
        ts: Date.now(),
        uid: uid,
        uidHash: String(uid || ev.name || "x").slice(0, 12)
      });
    } catch (_) { /* rules may block — dummy feed still runs */ }
    return ev;
  }

  function liveEventFromDoc(d, course) {
    const name = publicName(d.name || "Student");
    const parts = name.replace(/^(Mr|Ms|Mrs|Dr)\.\s+/i, "").split(" ");
    return {
      name: name,
      initials: ((parts[0] || "S").charAt(0) + (parts[1] || "Q").charAt(0)).toUpperCase(),
      district: d.district || "India",
      state: d.state || "",
      className: d.className || "",
      course: course,
      verb: "purchased",
      ago: "Just now",
      color: "#16a34a",
      real: true
    };
  }

  function ingestLiveDoc(doc) {
    const d = (doc && doc.data && doc.data()) || {};
    if (!d.name) return;
    const course = officialCourse(d.course, d.planKey);
    if (!course) return;
    const ts = Number(d.ts || 0) || Date.now();
    if (Date.now() - ts > 7 * 86400000) return;
    const uid = String(d.uid || "");
    const self = myUid();
    if (self && uid && uid === self) return;
    const ev = liveEventFromDoc(d, course);
    const nid = "buy-" + (doc.id || (uid + ts));
    recordPurchaseNotif(ev, {
      id: nid,
      title: "A student purchased a course",
      body: ev.name + " · " + (ev.district || "India") + " · purchased " + course,
      ts: ts,
      kind: "purchase"
    });
    if (Date.now() - ts <= 15 * 60 * 1000) {
      showToast(ev, { skipNotif: true, id: nid });
    }
  }

  function listenLive() {
    try {
      if (!firebase || !firebase.firestore) {
        if (liveTries++ < 16) setTimeout(listenLive, 2000);
        return;
      }
      if (liveUnsub) return;
      liveUnsub = firebase.firestore().collection("live_purchases").orderBy("ts", "desc").limit(20)
        .onSnapshot(function (snap) {
          snap.docChanges().forEach(function (ch) {
            if (ch.type !== "added") return;
            ingestLiveDoc(ch.doc);
          });
        }, function () {
          liveUnsub = null;
          if (liveTries++ < 16) setTimeout(listenLive, 4000);
        });
    } catch (_) {
      liveUnsub = null;
      if (liveTries++ < 16) setTimeout(listenLive, 4000);
    }
  }

  /* ——— Notifications (website updates) ——— */
  const READ_KEY = "qx_notif_read_v1";
  const SEEN_BUILD = "qx_notif_seen_build";
  const DISMISS_BAR_KEY = "qx_update_bar_dismissed";
  const APPLIED_FORCE = "qx_update_applied_ids";
  let pendingUpdate = null;
  let versionTimer = 0;

  function readSet() {
    try {
      return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"));
    } catch (_) {
      return new Set();
    }
  }

  function writeSet(set) {
    try { localStorage.setItem(READ_KEY, JSON.stringify(Array.from(set))); } catch (_) {}
  }

  function extraNotifs() {
    try {
      return JSON.parse(localStorage.getItem("qx_notif_extra") || "[]") || [];
    } catch (_) {
      return [];
    }
  }

  function pushNotif(item) {
    const list = extraNotifs();
    if (list.some(function (x) { return x.id === item.id; })) return;
    list.unshift(item);
    try { localStorage.setItem("qx_notif_extra", JSON.stringify(list.slice(0, 40))); } catch (_) {}
    paintBell();
  }

  function allNotifs() {
    const build = String(global.QX_BUILD || "");
    const items = UPDATES.slice();
    if (build) {
      var bkey = "qx_build_ts_" + build;
      var bts = 0;
      try { bts = Number(localStorage.getItem(bkey) || 0); } catch (_) { bts = 0; }
      if (!bts) {
        bts = Date.now();
        try { localStorage.setItem(bkey, String(bts)); } catch (_) {}
      }
      items.unshift({
        id: "build-" + build,
        title: "Update Quantrex",
        body: "A new Academy update is live. Tap Update now so PYQ, DPP, tests and books match the latest website and app.",
        ts: bts,
        kind: "update"
      });
    }
    extraNotifs().forEach(function (x) { items.push(x); });
    items.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    const seen = {};
    return items.filter(function (x) {
      if (!x || !x.id || seen[x.id]) return false;
      seen[x.id] = 1;
      return true;
    });
  }

  function unreadCount() {
    const read = readSet();
    return allNotifs().filter(function (n) { return !read.has(n.id); }).length;
  }

  function markAllRead() {
    const s = readSet();
    allNotifs().forEach(function (n) { s.add(n.id); });
    writeSet(s);
    paintBell();
  }

  function paintBell() {
    const btn = document.getElementById("qxNotifBtn");
    const badge = document.getElementById("qxNotifBadge");
    const n = unreadCount();
    if (badge) {
      badge.hidden = n <= 0;
      badge.textContent = n > 9 ? "9+" : String(n);
    }
    if (btn) btn.setAttribute("aria-label", n ? n + " unread notifications" : "Notifications");
    const list = document.getElementById("qxNotifList");
    if (!list) return;
    const read = readSet();
    const tab = (document.getElementById("qxNotifPanel") && document.getElementById("qxNotifPanel").dataset.tab) || "all";
    const html = allNotifs().filter(function (item) {
      if (tab === "all") return true;
      if (tab === "activity") return item.kind === "activity" || item.kind === "purchase";
      return (item.kind || "update") === tab;
    }).map(function (item) {
      const unread = !read.has(item.id);
      const when = item.ts ? new Date(item.ts).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
      return '<button type="button" class="qx-notif-item' + (unread ? " unread" : "") + '" data-nid="' + item.id + '" data-kind="' + (item.kind || "update") + '">' +
        "<strong>" + item.title + "</strong>" +
        "<span>" + item.body + "</span>" +
        (when ? '<em>' + when + "</em>" : "") +
        "</button>";
    }).join("");
    list.innerHTML = html || '<p class="qx-notif-empty">No updates yet.</p>';
  }

  function openPanel(open) {
    const panel = document.getElementById("qxNotifPanel");
    if (!panel) return;
    panel.hidden = !open;
    if (open) paintBell();
  }

  function mountBell() {
    if (!isFeedAdmin()) {
      const old = document.getElementById("qxNotifBtn");
      if (old && old.parentNode) old.parentNode.removeChild(old);
      const pan = document.getElementById("qxNotifPanel");
      if (pan && pan.parentNode) pan.parentNode.removeChild(pan);
      return;
    }
    if (document.getElementById("qxNotifBtn")) return;
    const right = document.querySelector(".topbar-right");
    if (!right) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "qxNotifBtn";
    btn.className = "theme-btn qx-notif-btn";
    btn.title = "Notifications";
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 22a2.2 2.2 0 0 0 2.2-2.2h-4.4A2.2 2.2 0 0 0 12 22zm6.7-6.2V11a6.7 6.7 0 0 0-5.2-6.5V3.8a1.5 1.5 0 1 0-3 0v.7A6.7 6.7 0 0 0 5.3 11v4.8L4 17.1V18h16v-.9l-1.3-1.3z"/></svg><span class="qx-notif-badge" id="qxNotifBadge" hidden>0</span>';
    const search = document.getElementById("searchBtn");
    if (search) right.insertBefore(btn, search);
    else right.insertBefore(btn, right.firstChild);

    let panel = document.getElementById("qxNotifPanel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "qxNotifPanel";
      panel.className = "qx-notif-panel";
      panel.hidden = true;
      var admin = false;
      try {
        admin = (typeof QuantrexAccess !== "undefined" && QuantrexAccess.isAdmin && QuantrexAccess.isAdmin())
          || localStorage.getItem("quantrex_admin") === "1";
      } catch (_) { admin = false; }
      panel.innerHTML =
        '<div class="qx-notif-head"><strong>Academy desk</strong>' +
        '<button type="button" id="qxNotifRead">Mark all read</button></div>' +
        '<div class="qx-notif-tabs">' +
        '<button type="button" class="on" data-tab="all">All</button>' +
        '<button type="button" data-tab="activity">Live</button>' +
        '<button type="button" data-tab="purchase">Purchases</button>' +
        '<button type="button" data-tab="update">Academy</button></div>' +
        (admin
          ? '<div class="qx-notif-admin"><input id="qxNotifTitle" maxlength="80" placeholder="Update title"><textarea id="qxNotifBody" maxlength="240" placeholder="Short note for students"></textarea><label class="qx-notif-force"><input type="checkbox" id="qxNotifForce" checked> Students must tap Update now</label><button type="button" id="qxNotifPost">Post to Academy</button></div>'
          : "") +
        '<div class="qx-notif-list" id="qxNotifList"></div>';
      panel.dataset.tab = "all";
      panel.querySelectorAll(".qx-notif-tabs button").forEach(function (b) {
        b.onclick = function (ev) {
          ev.stopPropagation();
          panel.dataset.tab = b.getAttribute("data-tab") || "all";
          panel.querySelectorAll(".qx-notif-tabs button").forEach(function (x) { x.classList.toggle("on", x === b); });
          paintBell();
        };
      });
      document.body.appendChild(panel);
    }
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (studyMode()) return;
      openPanel(panel.hidden);
    });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        openPanel(false);
      }
    });
    document.getElementById("qxNotifRead").onclick = function () {
      markAllRead();
    };
    var postBtn = document.getElementById("qxNotifPost");
    if (postBtn) {
      postBtn.onclick = function () {
        var title = (document.getElementById("qxNotifTitle").value || "").trim();
        var body = (document.getElementById("qxNotifBody").value || "").trim();
        if (!title) return;
        var forceEl = document.getElementById("qxNotifForce");
        var force = !forceEl || forceEl.checked;
        var item = {
          id: "adm-" + Date.now(),
          title: title,
          body: body || "Tap Update now to load the latest Quantrex Academy.",
          ts: Date.now(),
          kind: "update",
          force: force
        };
        pushNotif(item);
        if (force) announceUpdate(item);
        try {
          if (firebase && firebase.firestore) {
            firebase.firestore().collection("site_updates").add({
              title: item.title,
              body: item.body,
              ts: item.ts,
              force: force,
              build: String(global.QX_BUILD || "")
            });
          }
        } catch (_) { /* */ }
        document.getElementById("qxNotifTitle").value = "";
        document.getElementById("qxNotifBody").value = "";
      };
    }
    panel.addEventListener("click", function (e) {
      const it = e.target.closest("[data-nid]");
      if (!it) return;
      const s = readSet();
      s.add(it.getAttribute("data-nid"));
      writeSet(s);
      paintBell();
    });
    paintBell();
  }

  function appliedForceIds() {
    try {
      return new Set(JSON.parse(localStorage.getItem(APPLIED_FORCE) || "[]"));
    } catch (_) {
      return new Set();
    }
  }

  function markForceApplied(id) {
    const s = appliedForceIds();
    if (id) s.add(id);
    try { localStorage.setItem(APPLIED_FORCE, JSON.stringify(Array.from(s).slice(-50))); } catch (_) {}
  }

  function applyUpdateNow() {
    const local = String(global.QX_BUILD || "");
    try { localStorage.setItem(SEEN_BUILD, local); } catch (_) {}
    if (pendingUpdate && pendingUpdate.id) markForceApplied(pendingUpdate.id);
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
      }
    } catch (_) {}
    try {
      const u = new URL(location.href);
      u.searchParams.set("v", local || String(Date.now()));
      location.replace(u.toString());
    } catch (_) {
      location.reload();
    }
  }

  function isUpdateBarDismissed(item) {
    try {
      const id = item && item.id ? String(item.id) : "";
      if (!id) return false;
      return localStorage.getItem(DISMISS_BAR_KEY) === id;
    } catch (_) {
      return false;
    }
  }

  function dismissUpdateBar(item) {
    try {
      const id = item && item.id ? String(item.id) : ("pending-" + Date.now());
      localStorage.setItem(DISMISS_BAR_KEY, id);
    } catch (_) { /* */ }
    const bar = document.getElementById("qxUpdateBar");
    if (bar) bar.hidden = true;
  }

  function showUpdateBar(item) {
    pendingUpdate = item;
    if (studyMode()) return;
    if (isUpdateBarDismissed(item)) return;
    let bar = document.getElementById("qxUpdateBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "qxUpdateBar";
      bar.className = "qx-update-bar";
      bar.setAttribute("role", "status");
      document.body.appendChild(bar);
    }
    bar.hidden = false;
    bar.innerHTML =
      '<div class="qx-update-copy"><strong>' + (item.title || "Update Quantrex") + "</strong>" +
      "<span>" + (item.body || "A new Academy update is live. Tap Update now.") + "</span></div>" +
      '<div class="qx-update-actions">' +
      '<button type="button" id="qxUpdateNow">Update now</button>' +
      '<button type="button" id="qxUpdateDismiss" class="qx-update-dismiss" title="Hide for now" aria-label="Dismiss update bar">Not now</button>' +
      "</div>";
    const go = document.getElementById("qxUpdateNow");
    if (go) go.onclick = function (e) { e.preventDefault(); applyUpdateNow(); };
    const dismiss = document.getElementById("qxUpdateDismiss");
    if (dismiss) dismiss.onclick = function (e) {
      e.preventDefault();
      dismissUpdateBar(item);
    };
  }

  function systemNotify(item) {
    try {
      if (!("Notification" in window) || Notification.permission !== "granted") return;
      new Notification(item.title || "Update Quantrex", {
        body: item.body || "Tap Update now in Quantrex Academy.",
        icon: "/assets/icon-192.png",
        tag: item.id || "qx-update"
      });
    } catch (_) {}
  }

  function askNotifPermission() {
    try {
      if (!("Notification" in window) || Notification.permission !== "default") return;
      if (localStorage.getItem("qx_notif_perm_asked") === "1") return;
      localStorage.setItem("qx_notif_perm_asked", "1");
      Notification.requestPermission().catch(function () {});
    } catch (_) {}
  }

  function announceUpdate(item) {
    if (!item || !item.id) return;
    if (appliedForceIds().has(item.id)) return;
    pushNotif({
      id: item.id,
      title: item.title || "Update Quantrex",
      body: item.body || "Tap Update now to load the latest Academy.",
      ts: item.ts || Date.now(),
      kind: "update"
    });
    showUpdateBar(item);
    systemNotify(item);
  }

  function checkLocalBuildUpdate() {
    const build = String(global.QX_BUILD || "");
    if (!build) return;
    let seen = "";
    try { seen = localStorage.getItem(SEEN_BUILD) || ""; } catch (_) { seen = ""; }
    if (build !== seen) {
      announceUpdate({
        id: "build-force-" + build,
        title: "Update Quantrex",
        body: "A new Academy update is live. Tap Update now so PYQ, DPP, tests and books match the latest website and app.",
        ts: Date.now(),
        kind: "update",
        force: true
      });
    }
  }

  function pollVersion() {
    fetch("/version.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) {
        if (!v || !v.build) return;
        const local = String(global.QX_BUILD || "");
        if (v.build && local && v.build !== local) {
          announceUpdate({
            id: "ver-" + v.build,
            title: v.title || "Update Quantrex",
            body: v.body || "A new Academy update is live. Tap Update now.",
            ts: v.ts || Date.now(),
            kind: "update",
            force: true
          });
        }
      })
      .catch(function () {});
    clearTimeout(versionTimer);
    versionTimer = setTimeout(pollVersion, 90000);
  }

  let remoteTries = 0;
  function loadRemoteUpdates() {
    try {
      if (!firebase || !firebase.firestore) {
        if (remoteTries++ < 16) setTimeout(loadRemoteUpdates, 2500);
        return;
      }
      firebase.firestore().collection("site_updates").orderBy("ts", "desc").limit(20)
        .onSnapshot(function (snap) {
          snap.docChanges().forEach(function (ch) {
            const doc = ch.doc;
            const d = (doc && doc.data && doc.data()) || {};
            if (!d.title) return;
            const item = {
              id: "fs-" + doc.id,
              title: d.title,
              body: d.body || "Tap Update now to load the latest Quantrex Academy.",
              ts: d.ts || Date.now(),
              kind: "update",
              force: !!d.force
            };
            pushNotif(item);
            if (item.force && Date.now() - item.ts < 14 * 86400000) announceUpdate(item);
          });
        });
    } catch (_) { /* */ }
  }

  function watchStudy() {
    const mo = new MutationObserver(function () {
      if (studyMode()) {
        if (host) host.innerHTML = "";
        openPanel(false);
        var bar = document.getElementById("qxUpdateBar");
        if (bar) bar.hidden = true;
      } else if (pendingUpdate && !isUpdateBarDismissed(pendingUpdate)) {
        showUpdateBar(pendingUpdate);
      }
    });
    mo.observe(document.body, { attributes: true, attributeFilter: ["class", "data-qx-view"] });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden && host) host.innerHTML = "";
      if (!document.hidden) {
        pollVersion();
        if (pendingUpdate && !studyMode() && !isUpdateBarDismissed(pendingUpdate)) showUpdateBar(pendingUpdate);
      }
    });
  }

  function start() {
    if (document.body) document.body.classList.toggle("qx-pay-page", /pay\.html/i.test(location.pathname));
    mountBell();
    watchStudy();
    checkLocalBuildUpdate();
    pollVersion();
    if (isFeedAdmin()) {
      askNotifPermission();
      setTimeout(loadRemoteUpdates, 1600);
    }
    window.addEventListener("qx-sw-update", function () {
      announceUpdate({
        id: "sw-" + String(global.QX_BUILD || "now"),
        title: "Update Quantrex",
        body: "A new Academy update is ready on this device. Tap Update now.",
        ts: Date.now(),
        kind: "update",
        force: true
      });
    });
    setTimeout(function () {
      if (!studyMode() && !(typeof QuantrexAccess !== "undefined" && QuantrexAccess.ALL_COURSES_FREE) && !studentHasPaid()) showToast(dummyEvent());
      toastTimer = setTimeout(loop, nextDelay());
    }, 2200);
    setTimeout(listenLive, 1800);
    try {
      if (typeof firebase !== "undefined" && firebase.auth) {
        firebase.auth().onAuthStateChanged(function () { listenLive(); });
      }
    } catch (_) { /* */ }
    if (typeof QxProfile !== "undefined" && !/login\.html/i.test(location.pathname)) {
      let logged = false;
      try {
        const u = JSON.parse(localStorage.getItem("quantrex_user") || "null");
        logged = !!(u && u.uid && String(u.uid).indexOf("guest_") !== 0);
      } catch (_) { /* */ }
      if (logged) {
        if (isFeedAdmin()) {
          pushNotif({
            id: "welcome-" + new Date().toDateString(),
            title: "Welcome to your Quantrex desk",
            body: "You are signed in. Progress stays on this Academy ID — not on any other coaching app.",
            ts: Date.now(),
            kind: "update"
          });
        }
        if (QxProfile.missing().length) {
          setTimeout(function () {
            if (!studyMode()) QxProfile.ensure({ reason: "welcome" });
          }, 1600);
        }
      }
    }
  }


  (function injectUpdateBarCss() {
    if (document.getElementById("qxUpdateBarCss")) return;
    var s = document.createElement("style");
    s.id = "qxUpdateBarCss";
    s.textContent = ".qx-update-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:12000;padding:12px 14px;border-radius:14px;background:#0f172a;color:#f8fafc;box-shadow:0 10px 30px rgba(0,0,0,.28)}" +
      ".qx-update-bar[hidden]{display:none!important}" +
      ".qx-update-copy{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}" +
      ".qx-update-copy strong{font-size:14px}" +
      ".qx-update-copy span{font-size:12px;opacity:.85;line-height:1.35}" +
      ".qx-update-actions{display:flex;gap:8px;align-items:center;flex-shrink:0}" +
      "#qxUpdateNow{border:0;background:#38bdf8;color:#0f172a;font-weight:800;border-radius:10px;padding:10px 12px;cursor:pointer}" +
      ".qx-update-dismiss{border:1px solid rgba(248,250,252,.35);background:transparent;color:#e2e8f0;font-weight:700;border-radius:10px;padding:9px 11px;cursor:pointer}" +
      "body.qx-study .qx-update-bar,body.mtk-test-open .qx-update-bar,body.marks-test-active .qx-update-bar,body.allen-cbt-active .qx-update-bar,body.allen-practice-active .qx-update-bar,body.qx-cbt-session .qx-update-bar,body.qzrr-instr-active .qx-update-bar,body.marks-instr-active .qx-update-bar,body.ts-fmt-chooser-active .qx-update-bar{display:none!important}" +
      "@media (max-width:720px){.qx-update-bar{bottom:calc(70px + env(safe-area-inset-bottom,0px))}}";
    (document.head || document.documentElement).appendChild(s);
  })();

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  global.QxLiveFeed = {
    publishReal: publishReal,
    pushNotif: pushNotif,
    showToast: showToast,
    announceUpdate: announceUpdate,
    applyUpdateNow: applyUpdateNow,
    dismissUpdateBar: dismissUpdateBar,
    isUpdateBarDismissed: isUpdateBarDismissed
  };
})(typeof window !== "undefined" ? window : globalThis);
