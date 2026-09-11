/**
 * Quantrex student profile — flexible registration details.
 */
(function (global) {
  "use strict";

  const KEY = "quantrex_profile";
  const CLASSES = ["7", "8", "9", "10", "11", "12", "Other"];

  const INDIA = {
    "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati", "Kurnool", "Nellore", "Rajahmundry", "Kakinada"],
    "Arunachal Pradesh": ["Itanagar", "Tawang", "Pasighat", "Naharlagun"],
    "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Tezpur", "Nagaon"],
    "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga", "Purnia", "Nalanda", "Begusarai"],
    "Chhattisgarh": ["Raipur", "Bilaspur", "Durg", "Bhilai", "Korba", "Raigarh"],
    "Goa": ["North Goa", "South Goa", "Panaji", "Margao"],
    "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar"],
    "Haryana": ["Gurugram", "Faridabad", "Hisar", "Karnal", "Panipat", "Rohtak", "Ambala"],
    "Himachal Pradesh": ["Shimla", "Kangra", "Mandi", "Solan", "Kullu", "Hamirpur"],
    "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh", "Deoghar"],
    "Karnataka": ["Bengaluru Urban", "Mysuru", "Mangaluru", "Hubballi", "Belagavi", "Kalaburagi", "Tumakuru"],
    "Kerala": ["Thiruvananthapuram", "Ernakulam", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Alappuzha"],
    "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Rewa"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Kolhapur", "Thane", "Solapur"],
    "Manipur": ["Imphal East", "Imphal West", "Thoubal", "Churachandpur"],
    "Meghalaya": ["East Khasi Hills", "West Garo Hills", "Shillong"],
    "Mizoram": ["Aizawl", "Lunglei"],
    "Nagaland": ["Kohima", "Dimapur", "Mokokchung"],
    "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Puri", "Sambalpur", "Berhampur"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali"],
    "Rajasthan": ["Jaipur", "Kota", "Udaipur", "Jodhpur", "Ajmer", "Bikaner", "Alwar"],
    "Sikkim": ["Gangtok", "Namchi"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Erode"],
    "Telangana": ["Hyderabad", "Warangal", "Karimnagar", "Nizamabad", "Khammam", "Nalgonda"],
    "Tripura": ["Agartala", "West Tripura"],
    "Uttar Pradesh": ["Lucknow", "Varanasi", "Kanpur", "Prayagraj", "Agra", "Meerut", "Noida", "Gorakhpur", "Ghaziabad"],
    "Uttarakhand": ["Dehradun", "Haridwar", "Nainital", "Haldwani", "Roorkee"],
    "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Siliguri", "Asansol", "Kharagpur"],
    "Delhi": ["New Delhi", "South Delhi", "North Delhi", "East Delhi", "West Delhi", "North West Delhi"],
    "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
    "Ladakh": ["Leh", "Kargil"],
    "Chandigarh": ["Chandigarh"],
    "Puducherry": ["Puducherry", "Karaikal"],
    "Andaman and Nicobar": ["Port Blair"],
    "Dadra and Nagar Haveli and Daman and Diu": ["Silvassa", "Daman"]
  };

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
    } catch (_) {
      return {};
    }
  }

  function fromUser() {
    try {
      return JSON.parse(localStorage.getItem("quantrex_user") || "null") || {};
    } catch (_) {
      return {};
    }
  }

  function get() {
    const p = read();
    const u = fromUser();
    const exams = p.exams || u.exams || (p.exam || u.exam || u.targetExam ? [p.exam || u.exam || u.targetExam] : []);
    return {
      name: String(p.name || u.name || u.displayName || "").trim(),
      phone: String(p.phone || u.phone || u.phoneNumber || "").trim(),
      email: String(p.email || u.email || "").trim(),
      className: String(p.className || p.class || u.className || localStorage.getItem("qx_student_class") || "").trim(),
      state: String(p.state || u.state || "").trim(),
      district: String(p.district || u.district || "").trim(),
      exam: String(p.exam || u.exam || u.targetExam || localStorage.getItem("quantrex_exam") || "").trim(),
      exams: Array.isArray(exams) ? exams.filter(Boolean) : [],
      individualMaths: String(p.individualMaths || u.individualMaths || "").trim(),
      groupClass: String(p.groupClass || u.groupClass || "").trim(),
      liveClass: String(p.liveClass || u.liveClass || "").trim(),
      targetYear: String(p.targetYear || u.targetYear || (typeof localStorage !== "undefined" ? (localStorage.getItem("qx_target_year") || "") : "") || "").trim(),
      note: String(p.note || "").trim()
    };
  }

  function missing(p) {
    p = p || get();
    const miss = [];
    if (!p.name || p.name.length < 2) miss.push("name");
    return miss;
  }

  function save(extra) {
    const cur = get();
    const next = Object.assign({}, cur, extra || {});
    next.name = String(next.name || "").trim().slice(0, 48);
    next.phone = String(next.phone || "").replace(/\D/g, "").slice(-10);
    next.email = String(next.email || "").trim();
    next.className = String(next.className || "").trim();
    next.state = String(next.state || "").trim();
    next.district = String(next.district || "").trim();
    next.exam = String(next.exam || (next.exams && next.exams[0]) || "").trim();
    next.exams = Array.isArray(next.exams) ? next.exams.filter(Boolean) : (next.exam ? [next.exam] : []);
    next.individualMaths = String(next.individualMaths || "").trim();
    next.groupClass = String(next.groupClass || "").trim();
    next.liveClass = String(next.liveClass || "").trim();
    next.targetYear = String(next.targetYear || "").trim().slice(0, 8);
    next.note = String(next.note || "").trim().slice(0, 800);
    try { if (next.targetYear) localStorage.setItem("qx_target_year", next.targetYear); } catch (_) {}
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (_) {}
    try { localStorage.setItem("qx_student_class", next.className || ""); } catch (_) {}
    try {
      const u = fromUser();
      u.name = next.name || u.name;
      u.phone = next.phone || u.phone;
      u.email = next.email || u.email;
      u.className = next.className;
      u.state = next.state;
      u.district = next.district;
      u.exams = next.exams;
      u.individualMaths = next.individualMaths;
      u.groupClass = next.groupClass;
      u.liveClass = next.liveClass;
      if (next.exam) u.exam = next.exam;
      localStorage.setItem("quantrex_user", JSON.stringify(u));
    } catch (_) {}
    try {
      if (typeof QuantrexStudentAuth !== "undefined" && firebase && firebase.auth && firebase.auth().currentUser) {
        QuantrexStudentAuth.upsertStudent(firebase.auth().currentUser, {
          name: next.name,
          phone: next.phone,
          email: next.email,
          className: next.className,
          state: next.state,
          district: next.district,
          targetExam: next.exam,
          exams: next.exams,
          individualMaths: next.individualMaths,
          groupClass: next.groupClass,
          liveClass: next.liveClass
        });
      }
    } catch (_) {}
    return next;
  }

  function states() {
    if (typeof QxIndiaGeo !== "undefined" && QxIndiaGeo.states) return QxIndiaGeo.states();
    return Object.keys(INDIA).concat(["Other"]);
  }

  function districts(state) {
    if (typeof QxIndiaGeo !== "undefined" && QxIndiaGeo.districts) return QxIndiaGeo.districts(state);
    const list = INDIA[state] || [];
    return list.concat(["Other"]);
  }

  function fillStateSelect(sel, selected) {
    if (!sel) return;
    const cur = selected || "";
    sel.innerHTML = '<option value="">State</option>' + states().map(function (s) {
      return '<option value="' + esc(s) + '"' + (s === cur ? " selected" : "") + ">" + esc(s) + "</option>";
    }).join("");
  }

  function fillDistrictSelect(sel, state, selected) {
    if (!sel) return;
    const list = districts(state);
    sel.disabled = !state;
    sel.innerHTML = '<option value="">District</option>' + list.map(function (d) {
      return '<option value="' + esc(d) + '"' + (d === selected ? " selected" : "") + ">" + esc(d) + "</option>";
    }).join("");
  }

  function bindOtherField(sel, input) {
    if (!sel || !input) return;
    function sync() {
      const other = sel.value === "Other";
      input.hidden = !other;
      if (other) input.required = false;
    }
    sel.addEventListener("change", sync);
    sync();
  }

  function fillClassSelect(sel, selected) {
    if (!sel) return;
    const cur = String(selected || "");
    sel.innerHTML = '<option value="">Class</option>' + CLASSES.map(function (c) {
      const label = c === "Other" ? "Other" : ("Class " + c);
      return '<option value="' + c + '"' + (c === cur ? " selected" : "") + ">" + label + "</option>";
    }).join("");
  }

  function bindPair(stateSel, distSel) {
    if (!stateSel || !distSel) return;
    stateSel.addEventListener("change", function () {
      const st = stateSel.value;
      fillDistrictSelect(distSel, st, "");
    });
  }

  function yesNoHtml(name, selected) {
    const cur = String(selected || "");
    return '<label class="qx-yn"><input type="radio" name="' + name + '" value="Yes"' + (cur === "Yes" ? " checked" : "") + '> Yes</label>' +
      '<label class="qx-yn"><input type="radio" name="' + name + '" value="No"' + (cur === "No" ? " checked" : "") + '> No</label>';
  }

  function readYesNo(name, root) {
    const el = (root || document).querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : "";
  }

  function mountLoginFields() {
    const state = document.getElementById("regState");
    const dist = document.getElementById("regDistrict");
    const cls = document.getElementById("regClass");
    const p = get();
    fillClassSelect(cls, p.className);
    fillStateSelect(state, p.state);
    fillDistrictSelect(dist, p.state || "", p.district);
    bindPair(state, dist);
    const otpState = document.getElementById("otpState");
    const otpDist = document.getElementById("otpDistrict");
    const otpCls = document.getElementById("otpClass");
    if (otpState) {
      fillClassSelect(otpCls, p.className);
      fillStateSelect(otpState, p.state);
      fillDistrictSelect(otpDist, p.state || "", p.district);
      bindPair(otpState, otpDist);
    }
    bindOtherField(state, document.getElementById("regStateOther"));
    bindOtherField(dist, document.getElementById("regDistrictOther"));
    bindOtherField(cls, document.getElementById("regClassOther"));
    bindOtherField(otpState, document.getElementById("otpStateOther"));
    bindOtherField(otpDist, document.getElementById("otpDistrictOther"));
    bindOtherField(otpCls, document.getElementById("otpClassOther"));
  }

  function collectForm(prefix) {
    prefix = prefix || "reg";
    const nameEl = document.getElementById(prefix + "Name");
    const clsEl = document.getElementById(prefix + "Class");
    const stEl = document.getElementById(prefix + "State");
    const dsEl = document.getElementById(prefix + "District");
    const stOther = document.getElementById(prefix + "StateOther");
    const dsOther = document.getElementById(prefix + "DistrictOther");
    const clsOther = document.getElementById(prefix + "ClassOther");
    const phoneEl = document.getElementById(prefix + "Phone") || document.getElementById("phoneIn") || document.getElementById("regPhone");
    const emailEl = document.getElementById(prefix + "Email") || document.getElementById("emailIn");
    const wrap = document.getElementById(prefix + "Wrap") || document.getElementById("regWrap") || document.getElementById("otpWrap") || document.getElementById("regSuccess");
    let exams = [];
    if (typeof QxExams !== "undefined" && QxExams.readChecked) exams = QxExams.readChecked(wrap || document);
    let className = clsEl ? clsEl.value : "";
    if (className === "Other" && clsOther && clsOther.value) className = String(clsOther.value).trim() || "Other";
    let state = stEl ? stEl.value : "";
    if (state === "Other" && stOther && stOther.value) state = String(stOther.value).trim() || "Other";
    let district = dsEl ? dsEl.value : "";
    if (district === "Other" && dsOther && dsOther.value) district = String(dsOther.value).trim() || "Other";
    return save({
      name: nameEl ? nameEl.value : "",
      phone: phoneEl ? phoneEl.value : "",
      email: emailEl ? emailEl.value : "",
      className: className,
      state: state,
      district: district,
      exams: exams,
      exam: exams[0] || get().exam,
      individualMaths: readYesNo("qxIndMath", wrap) || readYesNo("qxIndMath"),
      groupClass: readYesNo("qxGroupClass", wrap) || readYesNo("qxGroupClass"),
      liveClass: readYesNo("qxLiveClass", wrap) || readYesNo("qxLiveClass")
    });
  }

  function closeModal() {
    const el = document.getElementById("qxProfModal");
    if (el) el.remove();
  }

  function showModal(reason) {
    return new Promise(function (resolve) {
      const p = get();
      closeModal();
      const wrap = document.createElement("div");
      wrap.id = "qxProfModal";
      wrap.className = "qx-prof-overlay";
      wrap.innerHTML =
        '<div class="qx-prof-card" role="dialog" aria-labelledby="qxProfTitle">' +
        '<h3 id="qxProfTitle">' + (reason === "pay" ? "Before payment" : "Complete your profile") + "</h3>" +
        "<p>Only these details — used on your ID and purchase confirmation.</p>" +
        '<label>Full name<input id="qxProfName" type="text" maxlength="48" autocomplete="name" value="' + esc(p.name) + '"></label>' +
        '<label>Class<select id="qxProfClass"></select></label>' +
        '<label>State<select id="qxProfState"></select></label>' +
        '<label>District<select id="qxProfDistrict"></select></label>' +
        '<button type="button" class="qx-prof-go" id="qxProfGo">Continue</button>' +
        "</div>";
      document.body.appendChild(wrap);
      fillClassSelect(document.getElementById("qxProfClass"), p.className);
      fillStateSelect(document.getElementById("qxProfState"), p.state);
      fillDistrictSelect(document.getElementById("qxProfDistrict"), p.state, p.district);
      bindPair(document.getElementById("qxProfState"), document.getElementById("qxProfDistrict"));
      function done() {
        const name = (document.getElementById("qxProfName").value || "").trim();
        const className = document.getElementById("qxProfClass").value;
        const state = document.getElementById("qxProfState").value;
        const district = document.getElementById("qxProfDistrict").value;
        if (!name || name.length < 2) return;
        const saved = save({ name: name, className: className, state: state, district: district });
        closeModal();
        resolve(saved);
      }
      document.getElementById("qxProfGo").onclick = done;
    });
  }

  function ensure(opts) {
    opts = opts || {};
    const miss = missing();
    if (!miss.length) return Promise.resolve(get());
    return showModal(opts.reason || "profile");
  }

  function planLabel() {
    if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.isAdmin && QuantrexAccess.isAdmin()) {
      return "Admin · full access";
    }
    const s = typeof QuantrexAccess !== "undefined" && QuantrexAccess.paidSub ? QuantrexAccess.paidSub() : null;
    if (!s) return "Free · 1 look / folder";
    const names = {
      trial_7: "7-Day Pass",
      jee_ts: "JEE Main Test Series",
      eng_complete: "Engineering Complete",
      eng_combo: "Engineering Combo",
      med_complete: "Medical Complete",
      admin_full: "Admin · full access"
    };
    const key = s.planId || s.key || "";
    const label = names[key] || s.label || "Paid plan";
    const left = s.expiresAt ? Math.max(0, Math.ceil((Number(s.expiresAt) - Date.now()) / 86400000)) : 0;
    return left ? (label + " · " + left + " days left") : label;
  }

  async function doLogout() {
    try {
      if (typeof QuantrexAccess !== "undefined" && QuantrexAccess.clearStolenAdmin) QuantrexAccess.clearStolenAdmin();
    } catch (_) {}
    try { localStorage.removeItem("quantrex_admin"); } catch (_) {}
    try {
      if (typeof QuantrexDB !== "undefined" && QuantrexDB.signOut) await QuantrexDB.signOut();
      else localStorage.removeItem("quantrex_user");
    } catch (_) {
      try { localStorage.removeItem("quantrex_user"); } catch (e) {}
    }
    window.location.href = "login.html";
  }

  function mountChrome() {
    if (!/app\.html/i.test(location.pathname || "")) return;
    const host = document.getElementById("qxUserChip");
    const menu = document.getElementById("qxUserMenu");
    const logoutBtn = document.getElementById("logoutBtn");
    const loginHint = document.getElementById("qxLoginHint");
    let u = {};
    try { u = JSON.parse(localStorage.getItem("quantrex_user") || "null") || {}; } catch (_) { u = {}; }
    const logged = !!(u.uid && String(u.uid).indexOf("guest_") !== 0);
    const p = get();
    if (loginHint) loginHint.classList.toggle("show", !logged);
    if (host) host.hidden = !logged;
    if (logoutBtn) logoutBtn.hidden = true;
    if (!logged || !host) return;
    const name = p.name || u.name || u.email || u.phone || "Student";
    const initials = String(name).replace(/[^A-Za-z]/g, " ").trim().split(" ").map(function (w) { return w.charAt(0); }).join("").slice(0, 2).toUpperCase() || "Q";
    host.innerHTML = '<span class="qx-user-av">' + esc(initials) + "</span><span class=\"qx-user-nm\">" + esc(String(name).split(" ")[0]) + "</span>";
    if (menu) {
      const cls = p.className ? ("Class " + p.className) : "Class —";
      const sub = planLabel();
      const contact = p.email || u.email || p.phone || u.phone || "";
      const loc = [p.district, p.state].filter(Boolean).join(", ");
      const serial = "QX-" + String(u.uid || "ID").replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
      menu.innerHTML =
        '<div class="qx-user-card qx-id-mini">' +
        '<div class="qx-id-mini-head"><span class="qx-user-av">' + esc(initials) + "</span><div><strong>" + esc(name) + "</strong>" +
        '<div><span class="qx-id-pill">' + esc(cls) + "</span><span class=\"qx-id-pill\">" + esc(sub) + "</span></div></div></div>" +
        (loc ? "<span>" + esc(loc) + "</span>" : "") +
        (contact ? "<span>" + esc(contact) + "</span>" : "") +
        "<span>" + esc(serial) + "</span>" +
        '<a href="#" data-qx-go="profile">Open Academy ID</a>' +
        '<button type="button" id="qxUserLogout">Sign out</button>' +
        "</div>";
      const lo = document.getElementById("qxUserLogout");
      if (lo) lo.onclick = function (e) { e.preventDefault(); doLogout(); };
      const gp = menu.querySelector("[data-qx-go=profile]");
      if (gp) gp.onclick = function (e) {
        e.preventDefault();
        menu.hidden = true;
        if (typeof go === "function") go("profile");
      };
    }
    host.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (menu) menu.hidden = !menu.hidden;
    };
    document.addEventListener("click", function (ev) {
      if (menu && !menu.hidden && !menu.contains(ev.target) && ev.target !== host && !host.contains(ev.target)) {
        menu.hidden = true;
      }
    });
  }

  const api = {
    CLASSES: CLASSES,
    INDIA: INDIA,
    get: get,
    save: save,
    missing: missing,
    ensure: ensure,
    states: states,
    districts: districts,
    fillStateSelect: fillStateSelect,
    fillDistrictSelect: fillDistrictSelect,
    fillClassSelect: fillClassSelect,
    bindPair: bindPair,
    bindOtherField: bindOtherField,
    yesNoHtml: yesNoHtml,
    readYesNo: readYesNo,
    mountLoginFields: mountLoginFields,
    collectForm: collectForm,
    mountChrome: mountChrome,
    planLabel: planLabel,
    doLogout: doLogout
  };
  global.QxProfile = api;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { mountLoginFields(); mountChrome(); });
  } else {
    mountLoginFields();
    mountChrome();
  }
})(typeof window !== "undefined" ? window : globalThis);
