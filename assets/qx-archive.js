/* qxmd377 archive speed: force-cache catalogue + warm PDF viewer */
/* qxmd376: zip/non-PDF skipped in viewer (download-only); Archive source untouched */
/* Quantrex Archive — catalogue on Quantrex Hosting. PDF bytes stay on Drive/Mega (no Firebase PDF storage). */
(function (w) {
  "use strict";
  var LS = "qxArchiveReaderV1";
  var cache = null;
  var readerState = { list: [], i: 0, zoom: 1, theme: "day", preview: 0, drawer: false };

  var CATS = [
    { id: "physics", group: "Physics Books", icon: "⚛️", classHint: "11–12" },
    { id: "chemistry", group: "Chemistry Books", icon: "⚗️", classHint: "11–12" },
    { id: "maths", group: "Maths Books", icon: "∑", classHint: "11–12" },
    { id: "coaching", group: "Coaching Materials", icon: "🏫", classHint: "11–12" },
    { id: "pyq", group: "PYQ Books", icon: "🎯", classHint: "11–12" },
    { id: "tests", group: "Test Series", icon: "📝", classHint: "11–12" },
    { id: "class9", group: "Class 9 Study Material", icon: "9️⃣", classHint: "9" },
    { id: "class10", group: "Class 10 Study Material", icon: "🔟", classHint: "10" },
    { id: "notes", group: "Handwritten Notes", icon: "✍️", classHint: "11–12" },
    { id: "shortnotes", group: "Handwritten Short Notes", icon: "📌", classHint: "11–12" },
    { id: "ncert", group: "NCERT", icon: "📘", classHint: "11–12" },
    { id: "misc", group: "More Resources", icon: "📚", classHint: "All" }
  ];

  function bust() {
    return (typeof w.QX_BUILD === "string" && w.QX_BUILD) || "qxmd374";
  }
  /* Root-absolute paths: /app/ trailing slash must not resolve to /app/assets (404). */
  function assetUrl(path) {
    var p = String(path || "").replace(/^\/+/, "");
    return "/" + p;
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function slug(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function goP(p) {
    return "onclick='go(\"archive\"," + JSON.stringify(p).replace(/'/g, "&#39;") + ")'";
  }
  function readAttr(id) {
    return 'data-qx-arch-read="' + esc(id) + '"';
  }
  function booksOf(lib) { return (lib && lib.books) || []; }
  function byCat(lib, catId) {
    var cat = CATS.filter(function (c) { return c.id === catId; })[0];
    if (!cat) return [];
    return booksOf(lib).filter(function (b) { return b.category === catId || b.group === cat.group; });
  }
  function seriesList(list) {
    var map = {};
    list.forEach(function (b) {
      var k = b.series || "Other";
      if (!map[k]) map[k] = [];
      map[k].push(b);
    });
    return Object.keys(map).sort().map(function (k) { return { series: k, books: map[k] }; });
  }
  function findBook(lib, id) {
    var list = booksOf(lib);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function siblings(lib, book) {
    return booksOf(lib).filter(function (b) { return b.series === book.series && b.group === book.group; });
  }
  function isOwnDrive(id) {
    return !!(id && String(id).indexOf("local") !== 0);
  }
  function chapterHasView(ch) {
    if (!ch) return false;
    if (ch.iaId || ch.iaFile || ch.pdfUrl || ch.megaUrl) return true;
    if (isOwnDrive(ch.ownDriveId)) return true;
    if (ch.driveId && !ch.driveBlocked) return true;
    return false;
  }
  function hasFile(b) {
    if (!b) return false;
    if (b.iaId || b.megaUrl || b.pdfUrl) return true;
    if (isOwnDrive(b.ownDriveId)) return true;
    if (b.kind === "folder" && b.driveId && !b.driveBlocked) return true;
    if (b.driveId && !b.driveBlocked) return true;
    if (b.chapters && b.chapters.some(chapterHasView)) return true;
    return false;
  }
  function coverSrc(b) {
    if (b && b.cover && String(b.cover).indexOf("http") !== 0) return b.cover;
    if (b && b.cover) return b.cover;
    var own = b && b.ownDriveId && String(b.ownDriveId).indexOf("local") !== 0 ? b.ownDriveId : "";
    if (own) return "https://drive.google.com/thumbnail?id=" + encodeURIComponent(own) + "&sz=w400";
    if (b && b.driveId) return "https://drive.google.com/thumbnail?id=" + encodeURIComponent(b.driveId) + "&sz=w400";
    if (b && b.iaId) return "https://archive.org/services/img/" + encodeURIComponent(b.iaId);
    return "";
  }
  function coverHtml(b, alt) {
    var src = coverSrc(b);
    var fb = '<div class="qx-arch-fallback"' + (src ? ' style="display:none"' : "") + '><i>QUANTREX ACADEMY</i><b>' + esc((b && b.title) || "Book") + "</b></div>";
    if (!src) return fb;
    return '<img src="' + esc(src) + '" alt="' + esc(alt || (b && b.title) || "") + '" loading="lazy" decoding="async" onerror="this.style.display=\'none\';var f=this.parentNode&&this.parentNode.querySelector(\'.qx-arch-fallback\');if(f)f.style.display=\'flex\'">' + fb;
  }
  function ribbon(b) {
    if (b && b.isAnswerKey) return '<span class="qx-arch-ribbon gold">Answer Key</span>';
    if (b && !hasFile(b)) return '<span class="qx-arch-ribbon miss">Link pending</span>';
    if (b && b.kind === "folder") return '<span class="qx-arch-ribbon">Chapters</span>';
    return "";
  }
  /* Official NCERT unit titles for the filenames already in the catalogue. */
  var NCERT_UNITS = {
    kech101: "Some Basic Concepts of Chemistry",
    kech102: "Structure of Atom",
    kech103: "Classification of Elements and Periodicity",
    kech104: "Chemical Bonding and Molecular Structure",
    kech105: "States of Matter",
    kech106: "Thermodynamics",
    kech107: "Equilibrium",
    kech201: "Redox Reactions",
    kech202: "Hydrogen",
    kech203: "The s-Block Elements",
    kech204: "The p-Block Elements",
    kech205: "Organic Chemistry — Basic Principles",
    kech206: "Hydrocarbons",
    kech207: "Environmental Chemistry",
    lech101: "The Solid State",
    lech102: "Solutions",
    lech103: "Electrochemistry",
    lech104: "Chemical Kinetics",
    lech105: "Surface Chemistry",
    lech106: "Isolation of Elements",
    lech107: "The p-Block Elements",
    lech108: "The d- and f-Block Elements",
    lech109: "Coordination Compounds",
    lech201: "Haloalkanes and Haloarenes",
    lech202: "Alcohols, Phenols and Ethers",
    lech203: "Aldehydes, Ketones and Carboxylic Acids",
    lech204: "Amines",
    lech205: "Biomolecules",
    lech206: "Polymers",
    lech207: "Chemistry in Everyday Life",
    kemh101: "Sets",
    kemh102: "Relations and Functions",
    kemh103: "Trigonometric Functions",
    kemh104: "Principle of Mathematical Induction",
    kemh105: "Complex Numbers and Quadratic Equations",
    kemh106: "Linear Inequalities",
    kemh107: "Permutations and Combinations",
    kemh108: "Binomial Theorem",
    kemh109: "Sequences and Series",
    kemh110: "Straight Lines",
    kemh111: "Conic Sections",
    kemh112: "Introduction to Three Dimensional Geometry",
    kemh113: "Limits and Derivatives",
    kemh114: "Mathematical Reasoning",
    kemh115: "Statistics",
    kemh116: "Probability",
    lemh101: "Relations and Functions",
    lemh102: "Inverse Trigonometric Functions",
    lemh103: "Matrices",
    lemh104: "Determinants",
    lemh105: "Continuity and Differentiability",
    lemh107: "Integrals",
    lemh201: "Application of Integrals",
    lemh202: "Differential Equations",
    lemh203: "Vector Algebra",
    lemh204: "Three Dimensional Geometry",
    lemh205: "Linear Programming",
    lemh206: "Probability",
    keph101: "Physical World",
    keph102: "Units and Measurements",
    keph103: "Motion in a Straight Line",
    keph104: "Motion in a Plane",
    keph105: "Laws of Motion",
    keph106: "Work, Energy and Power",
    keph107: "System of Particles and Rotational Motion",
    keph108: "Gravitation",
    keph201: "Mechanical Properties of Solids",
    keph202: "Mechanical Properties of Fluids",
    keph203: "Thermal Properties of Matter",
    keph204: "Thermodynamics",
    keph205: "Kinetic Theory",
    keph206: "Oscillations",
    keph207: "Waves",
    leph101: "Electric Charges and Fields",
    leph102: "Electrostatic Potential and Capacitance",
    leph103: "Current Electricity",
    leph104: "Moving Charges and Magnetism",
    leph105: "Magnetism and Matter",
    leph106: "Electromagnetic Induction",
    leph107: "Alternating Current",
    leph108: "Electromagnetic Waves",
    leph209: "Ray Optics and Optical Instruments",
    leph210: "Wave Optics",
    leph211: "Dual Nature of Radiation and Matter",
    leph212: "Atoms",
    leph213: "Nuclei",
    leph214: "Semiconductor Electronics"
  };
  function classLabel(b) {
    var c = String((b && b.classLevel) || "");
    if (c === "11-12") return "Class 11–12";
    if (c === "9") return "Class 9";
    if (c === "10") return "Class 10";
    if (!c || c === "all") return "";
    return "Class " + c;
  }
  function kindWord(b) {
    if (!b) return "PDF";
    if (b.isAnswerKey) return "Answer key";
    if (b.kind === "folder") return "Chapter folder";
    if (b.kind === "missing") return "Listed file";
    return "PDF";
  }
  function prettyName(s) {
    var parts = String(s || "").split(/\s*\/\s*/).map(function (p) { return p.trim(); }).filter(Boolean);
    var t = parts.join(" · ");
    t = t.replace(/\.pdf_?/gi, "");
    t = t.replace(/@/g, " ");
    t = t.replace(/JEEAdvanced/gi, "JEE Advanced");
    t = t.replace(/[_]+/g, " ");
    t = t.replace(/\s+/g, " ").trim();
    return t;
  }
  function fileLabel(ch) {
    var raw = String((ch && (ch.title || ch.iaFile)) || "");
    var code = raw.toLowerCase().replace(/\.pdf$/i, "").trim();
    if (NCERT_UNITS[code]) return NCERT_UNITS[code];
    if (/^(kech|lech|kemh|lemh|keph|leph)\d{3}$/.test(code)) return "NCERT file " + code;
    var parts = raw.split(/\s*\/\s*/).map(prettyName).filter(Boolean);
    if (parts.length >= 2) {
      var leaf = parts[parts.length - 1];
      var parent = parts[parts.length - 2];
      if (leaf.toLowerCase().indexOf(parent.toLowerCase()) === 0) return leaf;
      if (parent.length > 42) return leaf;
      return parent + " · " + leaf;
    }
    return parts[0] || "PDF";
  }
  function shareNoun(b) {
    return ((b.chapters || []).length || b.kind === "folder") ? "folder" : "pdf";
  }
  function thinDesc(d) {
    return !d || /open in quantrex reader/i.test(d);
  }
  function sigOf(b) {
    if (!b) return "";
    var ch = b.chapters || [];
    if (ch.length) {
      return "ch:" + ch.map(function (c) {
        return c.driveId || c.iaFile || c.iaId || c.megaUrl || c.title || "";
      }).join("|");
    }
    if (b.kind === "folder" && b.driveId) return "folder:" + b.driveId;
    if (b.driveId) return "file:" + b.driveId;
    if (b.iaId) return "ia:" + b.iaId + ":" + (b.iaFile || "");
    if (b.megaUrl) return "mega:" + b.megaUrl;
    return "";
  }
  function shareIndex(lib) {
    if (lib._qxShare) return lib._qxShare;
    var map = {};
    booksOf(lib).forEach(function (b) {
      var s = sigOf(b);
      if (!s) return;
      if (!map[s]) map[s] = [];
      map[s].push(b);
    });
    lib._qxShare = map;
    return map;
  }
  function sharedWith(lib, b) {
    var s = sigOf(b);
    if (!lib || !s) return [];
    return (shareIndex(lib)[s] || []).filter(function (o) { return o.id !== b.id; });
  }
  function listPhrase(labels, cap) {
    var show = labels.slice(0, cap);
    var more = labels.length - show.length;
    return show.join("; ") + (more ? "; and " + more + " more" : "");
  }
  function cardBlurb(lib, b) {
    var titles = (b.chapters || []).map(fileLabel).filter(Boolean);
    var shares = sharedWith(lib, b);
    if (shares.length && !titles.length) {
      return (shareNoun(b) === "folder" ? "Shared folder · " : "Same PDF as ") + shares[0].title;
    }
    if (shares.length) {
      return "Shared folder · " + titles.length + " files · " + titles[0];
    }
    if (titles.length > 1) return titles.length + " files · " + titles.slice(0, 2).join(" · ");
    if (titles.length === 1) return "1 file · " + titles[0];
    var bits = [kindWord(b)];
    if (b.subject) bits.push(b.subject);
    if (classLabel(b)) bits.push(classLabel(b));
    if (b.series && b.series !== b.title) bits.push(b.series);
    return bits.join(" · ");
  }
  function insideText(lib, b) {
    if (!b) return "";
    var stored = String(b.description || "").trim();
    var titles = (b.chapters || []).map(fileLabel).filter(Boolean);
    var shares = sharedWith(lib, b);
    var bits = [];
    if (!thinDesc(stored)) bits.push(stored);
    else {
      var where = [b.series, b.subject, classLabel(b)].filter(function (x, i, a) {
        return x && a.indexOf(x) === i;
      });
      bits.push(b.title + " — " + kindWord(b) + (where.length ? " · " + where.join(" · ") : "") + ".");
    }
    if (shares.length) {
      var shareLead = shareNoun(b) === "folder" ? "Same public folder as " : "Opens the same PDF as ";
      bits.push(shareLead + listPhrase(shares.map(function (s) { return s.title; }), 6) + ".");
    }
    if (titles.length) {
      bits.push(titles.length + (titles.length === 1 ? " file" : " files") + " inside: " + listPhrase(titles, 10) + ".");
    } else if (!shares.length && thinDesc(stored) && b.isAnswerKey) {
      bits.push("Worked answer key for " + (b.series || "this series") + ". Opens in the Quantrex reader.");
    } else if (!shares.length && thinDesc(stored) && b.kind === "folder") {
      bits.push("Chapter folder. Opens in the Quantrex reader.");
    } else if (!shares.length && thinDesc(stored)) {
      bits.push("One PDF. Opens in the Quantrex reader.");
    }
    return bits.join(" ");
  }
  function insideLead(lib, b) {
    var titles = (b.chapters || []).map(fileLabel).filter(Boolean);
    var shares = sharedWith(lib, b);
    var head = cardBlurb(lib, b);
    if (titles.length > 2) return head.replace(/\.\s*$/, "") + ". " + listPhrase(titles, 8) + ".";
    if (shares.length) {
      var shareLead = shareNoun(b) === "folder" ? "Same folder as " : "Same PDF as ";
      return head.replace(/\.\s*$/, "") + ". " + shareLead + listPhrase(shares.map(function (s) { return s.title; }), 4) + ".";
    }
    var stored = String(b.description || "").trim();
    if (!thinDesc(stored)) return stored;
    return insideText(lib, b);
  }
  function factsHtml(lib, b) {
    var n = (b.chapters || []).filter(chapterHasView).length;
    var shares = sharedWith(lib, b);
    var chips = [];
    if (b.subject) chips.push(b.subject);
    if (classLabel(b)) chips.push(classLabel(b));
    if (b.series) chips.push(b.series);
    chips.push(kindWord(b));
    if (n) chips.push(n + (n === 1 ? " file" : " files"));
    if (shares.length) chips.push("Shared folder");
    return '<div class="qx-arch-facts">' + chips.map(function (c) { return "<span>" + esc(c) + "</span>"; }).join("") + "</div>";
  }
  function card(b, lib) {
    return '<button type="button" class="qx-arch-card" ' + goP({ step: "book", id: b.id }) + ">" +
      '<div class="qx-arch-cover">' + ribbon(b) + coverHtml(b) + "</div>" +
      "<figcaption><strong>" + esc(b.title) + "</strong><small>" + esc(cardBlurb(lib, b)) + "</small></figcaption></button>";
  }
  function brandBar() {
    return '<div class="qx-arch-brand">' +
      '<img src="assets/quantrex-logo-3d-64.png" alt="Quantrex Academy">' +
      "<div><strong>Quantrex Archive</strong><span>Kindle reader · subject, class, and the files inside each title</span></div></div>";
  }
  function top(title, sub, back) {
    var tb = typeof topbar === "function" ? topbar(title, sub, back || { backView: "archive", backPayload: { step: "home" }, backLabel: "Archive" }) : ("<h1>" + esc(title) + "</h1>");
    return tb + '<div class="qx-arch">' + brandBar();
  }


  function warmPdfViewer() {
    try {
      if (window.__qxPdfWarmed) return;
      window.__qxPdfWarmed = 1;
      var u = assetUrl("assets/qx-pdf-viewer.html") + "?v=" + encodeURIComponent(bust());
      var l = document.createElement("link");
      l.rel = "prefetch"; l.as = "document"; l.href = u;
      document.head.appendChild(l);
      /* also warm pdf.js from CDN */
      var l2 = document.createElement("link");
      l2.rel = "prefetch"; l2.as = "script";
      l2.href = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      document.head.appendChild(l2);
    } catch (e) { /* */ }
  }

  async function loadLib(force) {
    if (cache && !force) return cache;
    var res = await fetch(assetUrl("data/qx-archive.json") + "?v=" + encodeURIComponent(bust()), { cache: force ? "no-store" : "force-cache" });
    if (!res.ok) throw new Error("archive missing");
    cache = await res.json();
    warmPdfViewer();
    return cache;
  }

  function viewHome(lib, p) {
    var q = String((p && p.q) || "").trim().toLowerCase();
    var cls = String((p && p.classLevel) || "all");
    var books = booksOf(lib).filter(function (b) {
      if (cls !== "all" && String(b.classLevel) !== cls) return false;
      if (!q) return true;
      var blob = (b.title + " " + b.series + " " + b.group + " " + (b.subject || "") + " " + (b.description || "") + " " + (b.chapters || []).map(fileLabel).join(" ")).toLowerCase();
      return blob.indexOf(q) >= 0;
    });
    var folders = CATS.map(function (c) {
      var total = booksOf(lib).filter(function (b) { return b.category === c.id || b.group === c.group; }).length;
      return '<button type="button" class="qx-arch-folder" ' + goP({ step: "category", cat: c.id }) + ">" +
        "<em>" + c.icon + "</em><strong>" + esc(c.group) + "</strong>" +
        "<small>" + total + " files · Class " + c.classHint + "</small></button>";
    }).join("");
    var keys = books.filter(function (b) { return b.isAnswerKey; });
    var search = q ? books.slice(0, 60).map(function (b) { return card(b, lib); }).join("") : "";
    return top("Quantrex Archive", "Every title opens in the reader · what’s inside is on the card") +
      '<input class="qx-arch-search" placeholder="Search books, notes, PYQ, answer keys…" value="' + esc(q) + '" onkeydown="if(event.key===\'Enter\')go(\'archive\',{step:\'home\',q:this.value,classLevel:\'' + esc(cls) + '\'})">' +
      '<div class="qx-arch-chips">' +
      chip("all", "All classes", cls) + chip("9", "Class 9", cls) + chip("10", "Class 10", cls) + chip("11-12", "Class 11–12", cls) +
      "</div>" +
      (q ? ('<div class="qx-arch-sec"><h3>Search</h3><small>' + books.length + "</small></div><div class=\"qx-arch-grid\">" + (search || "<p>No match.</p>") + "</div>") :
        ('<div class="qx-arch-folders">' + folders + "</div>" +
          (keys.length ? ('<div class="qx-arch-sec"><h3>Answer Keys</h3><small>' + keys.length + "</small></div><div class=\"qx-arch-grid\">" + keys.map(function (b) { return card(b, lib); }).join("") + "</div>") : ""))) +
      "</div>";
  }
  function chip(id, lab, on) {
    return '<button type="button" class="' + (on === id ? "on" : "") + '" ' + goP({ step: "home", classLevel: id }) + ">" + esc(lab) + "</button>";
  }

  function viewCat(lib, p) {
    var cat = CATS.filter(function (c) { return c.id === p.cat; })[0] || CATS[0];
    var list = byCat(lib, cat.id);
    var groups = seriesList(list);
    var html = groups.map(function (g) {
      return '<div class="qx-arch-sec"><h3>' + esc(g.series) + "</h3><small>" + g.books.length + "</small></div>" +
        '<div class="qx-arch-grid">' + g.books.map(function (b) { return card(b, lib); }).join("") + "</div>";
    }).join("");
    return top(cat.group, list.length + " files · tap a cover, then Open book") +
      '<div class="qx-arch-chips"><button type="button" ' + goP({ step: "home" }) + ">All categories</button></div>" +
      (html || "<p>Nothing in this folder yet.</p>") + "</div>";
  }

  function viewBook(lib, p) {
    var book = findBook(lib, p.id);
    if (!book) return top("Book", "Not found") + "<p>This file is missing.</p></div>";
    var sibs = siblings(lib, book);
    var fileCh = (Array.isArray(book.chapters) ? book.chapters : []).filter(chapterHasView);
    var chapters = sibs.filter(function (b) { return !b.isAnswerKey; });
    var keys = sibs.filter(function (b) { return b.isAnswerKey; });
    var chHtml = "";
    if (fileCh.length) {
      chHtml = fileCh.map(function (ch, i) {
        return '<button type="button" class="qx-arch-ch" data-qx-arch-read="' + esc(book.id) + '" data-qx-arch-ch="' + i + '">' +
          '<span class="n">' + (i + 1) + "</span><div><strong>" + esc(fileLabel(ch)) + "</strong><small>Open this file in the Quantrex reader</small></div></button>";
      }).join("");
    } else {
      chHtml = chapters.map(function (b, i) {
        return '<button type="button" class="qx-arch-ch" ' + readAttr(b.id) + ">" +
          '<span class="n">' + (i + 1) + "</span><div><strong>" + esc(b.title) + "</strong><small>" +
          esc(!hasFile(b) ? "PDF not published on source yet" : cardBlurb(lib, b)) +
          "</small></div></button>";
      }).join("");
    }
    var keyHtml = keys.map(function (b) {
      return '<button type="button" class="qx-arch-ch on-key" ' + readAttr(b.id) + ">" +
        '<span class="n">★</span><div><strong>' + esc(b.title) + "</strong><small>Answer Key · Quantrex reader</small></div></button>";
    }).join("");
    var openLabel = !hasFile(book) ? "PDF not on source" : (book.isAnswerKey ? "Open Answer Key" : (fileCh.length ? "Open PDF" : (book.kind === "folder" ? "Open chapter files" : "Open book")));
    return top(book.series || "Quantrex Archive", book.group + " · Class " + (book.classLevel || "11-12"), {
      backView: "archive",
      backPayload: { step: "category", cat: book.category },
      backLabel: book.group
    }) +
      '<div class="qx-arch-book"><div class="qx-arch-hero">' + coverHtml(book, book.title) + "</div>" +
      '<div class="qx-arch-meta"><h2>' + esc(book.title) + "</h2>" +
      factsHtml(lib, book) +
      '<p class="qx-arch-inside">' + esc(insideText(lib, book)) + "</p>" +
      '<div class="qx-arch-actions">' +
      '<button type="button" class="pri" ' + readAttr(book.id) + ">" + esc(openLabel) + "</button>" +
      (keys[0] && keys[0].id !== book.id ? '<button type="button" class="key" ' + readAttr(keys[0].id) + ">Answer Key</button>" : "") +
      "</div></div></div>" +
      ((fileCh.length || chapters.length) ? ('<div class="qx-arch-sec"><h3>Chapter catalogue</h3><small>Tap a row to open</small></div>' + chHtml) : "") +
      (keys.length ? ('<div class="qx-arch-sec"><h3>Answer Keys</h3><small>Worked solutions</small></div>' + keyHtml) : "") +
      "</div>";
  }

  async function viewArchive(payload) {
    var p = payload || { step: "home" };
    try {
      var lib = await loadLib(!!p.forceReload);
      if (p.step === "category") return viewCat(lib, p);
      if (p.step === "series") {
        var list = booksOf(lib).filter(function (b) { return slug(b.series) === slug(p.series) || b.series === p.series; });
        if (list[0]) return viewBook(lib, { id: list[0].id });
        return viewCat(lib, { cat: p.cat });
      }
      if (p.step === "book") return viewBook(lib, p);
      return viewHome(lib, p);
    } catch (e) {
      return top("Quantrex Archive", "Could not load catalogue") +
        '<p>Tap retry.</p>' +
        '<button type="button" class="btn-primary" onclick="go(\'archive\',{step:\'home\',forceReload:true})">Retry</button></div>';
    }
  }

  function pdfView(url) {
    if (!url || /\.zip$/i.test(url)) return "";
    return assetUrl("assets/qx-pdf-viewer.html") + "?v=" + encodeURIComponent(bust()) + "&file=" + encodeURIComponent(url);
  }
  function pdfViewDrive(fid) {
    if (!isOwnDrive(fid)) return "";
    return assetUrl("assets/qx-pdf-viewer.html") + "?v=" + encodeURIComponent(bust()) + "&drive=" + encodeURIComponent(fid);
  }
  function iaPdfUrl(item, file) {
    if (!item || !file || /\.zip$/i.test(file)) return "";
    return "https://archive.org/download/" + item + "/" + String(file).split("/").map(encodeURIComponent).join("/");
  }
  function previewUrls(b) {
    var urls = [];
    function pushDriveFile(fid) {
      if (!isOwnDrive(fid)) return;
      var wrapped = pdfViewDrive(fid);
      if (wrapped) urls.push(wrapped);
      /* Direct download URL for pdf.js inside Quantrex viewer (may CORS-fail; viewer falls back). */
      urls.push(assetUrl("assets/qx-pdf-viewer.html") + "?v=" + encodeURIComponent(bust()) + "&file=" + encodeURIComponent("https://drive.google.com/uc?export=download&id=" + fid));
      /* raw Drive preview as last-resort iframe if Quantrex chrome path fails */
      urls.push("https://drive.google.com/file/d/" + encodeURIComponent(fid) + "/preview");
    }
    function pushIa(item, file) {
      if (!item) return;
      var dl = iaPdfUrl(item, file);
      if (dl) {
        urls.push(pdfView(dl));
        urls.push("https://archive.org/embed/" + encodeURIComponent(item) + "/" + encodeURIComponent(file));
      }
      urls.push("https://archive.org/embed/" + encodeURIComponent(item));
    }
    /* Prefer Quantrex-hosted Drive copies first (ownDriveId), then legacy driveId, then public PDF / IA. */
    if (isOwnDrive(b.ownDriveId)) pushDriveFile(b.ownDriveId);
    if (b.driveId && !b.driveBlocked && b.driveId !== b.ownDriveId) pushDriveFile(b.driveId);
    if (b.pdfUrl && !/\.zip$/i.test(b.pdfUrl)) urls.push(pdfView(b.pdfUrl));
    pushIa(b.iaId, b.iaFile);
    if (b.megaUrl) {
      var m = String(b.megaUrl);
      if (/\/file\//.test(m)) urls.push(m.replace("/file/", "/embed/"));
      else if (/\/folder\//.test(m)) urls.push(m.replace("/folder/", "/embedfolder/"));
    }
    var firstCh = (b.chapters || []).filter(chapterHasView)[0];
    if (b.kind === "folder" && firstCh) {
      if (isOwnDrive(firstCh.ownDriveId)) pushDriveFile(firstCh.ownDriveId);
      else if (firstCh.driveId && !firstCh.driveBlocked) pushDriveFile(firstCh.driveId);
    } else if (b.kind === "folder" && b.driveId && !b.driveBlocked) {
      urls.push("https://drive.google.com/embeddedfolderview?id=" + encodeURIComponent(b.driveId) + "#list");
    } else if (b.driveId && !b.driveBlocked) {
      pushDriveFile(b.driveId);
    }
    return urls.filter(function (u, i, a) { return u && a.indexOf(u) === i; });
  }
  function extUrl(b) {
    if (isOwnDrive(b.ownDriveId)) return "https://drive.google.com/file/d/" + b.ownDriveId + "/view";
    if (b.iaId) {
      if (b.iaFile && !/\.zip$/i.test(b.iaFile)) return "https://archive.org/details/" + b.iaId + "/" + encodeURIComponent(b.iaFile);
      return "https://archive.org/details/" + b.iaId;
    }
    if (b.megaUrl) return b.megaUrl.replace("/file/", "/embed/").replace("/folder/", "/embedfolder/");
    if (b.kind === "folder" && b.driveId && !b.driveBlocked) {
      return "https://drive.google.com/embeddedfolderview?id=" + encodeURIComponent(b.driveId) + "#list";
    }
    if (b.driveId && !b.driveBlocked) return "https://drive.google.com/file/d/" + b.driveId + "/view";
    return "";
  }

  function saveReader() {
    try {
      var all = JSON.parse(localStorage.getItem(LS) || "{}");
      var b = readerState.list[readerState.i];
      if (!b) return;
      all[b.id] = { zoom: readerState.zoom, theme: readerState.theme, t: Date.now() };
      localStorage.setItem(LS, JSON.stringify(all));
    } catch (_) { /* */ }
  }
  function loadPrefs(id) {
    try { return JSON.parse(localStorage.getItem(LS) || "{}")[id] || {}; } catch (_) { return {}; }
  }

  function paintReader() {
    var wrap = document.getElementById("qxArchReader");
    if (!wrap) return;
    var b = readerState.list[readerState.i];
    if (!b) return;
    var urls = previewUrls(b);
    var theme = readerState.theme || "day";
    var z = readerState.zoom || 1;
    var n = readerState.list.length;
    var pct = n ? Math.round(((readerState.i + 1) / n) * 100) : 0;
    var src = urls[readerState.preview] || urls[0] || "";
    var stage;
    if (!src) {
      stage = '<div class="qx-k-mega"><h2>' + esc(b.title) + "</h2><p>No file link on this title.</p></div>";
    } else {
      stage = '<div class="qx-k-framewrap ' + theme + '" id="qxArchFrame">' +
        '<iframe id="qxArchIframe" src="' + esc(src) + '" title="' + esc(b.title) + '" allow="fullscreen" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe></div>';
    }
    var aboutBook = readerState.mode === "files" ? (readerState.parent || b) : b;
    var about = insideText(readerState.lib, aboutBook);
    var lead = insideLead(readerState.lib, aboutBook);
    var drawer = "";
    if (readerState.drawer) {
      drawer = '<div class="qx-k-drawer" id="qxArchDrawer"><h3>' +
        (readerState.mode === "files" ? "Files in this set" : "In this series") + "</h3>" +
        '<p class="qx-k-about"><b>What’s inside</b>' + esc(about) + "</p>" +
        readerState.list.map(function (it, idx) {
          var sub = readerState.mode === "files" ? "PDF in this set" : cardBlurb(readerState.lib, it);
          return '<button type="button" class="qx-k-ditem' + (idx === readerState.i ? " on" : "") + (it.isAnswerKey ? " key" : "") + '" data-qx-arch-jump="' + idx + '">' +
            esc((idx + 1) + ". " + it.title) + "<small>" + esc(sub) + "</small></button>";
        }).join("") + "</div>";
    }
    var where = readerState.mode === "files"
      ? ((readerState.parent && readerState.parent.title) || "This set")
      : (b.series || b.group || "Quantrex Archive");
    wrap.innerHTML =
      '<div class="qx-k-bar">' +
      '<img src="' + assetUrl('assets/quantrex-logo-3d-64.png') + '" alt="">' +
      '<div class="qx-k-title"><strong>' + esc(b.title) + "</strong><small>" + esc(where) +
      (b.isAnswerKey ? " · Answer key" : "") + " · " + (readerState.i + 1) + " / " + n + "</small></div>" +
      '<div class="qx-k-tools">' +
      '<button type="button" id="qxArchCh">Contents</button>' +
      '<button type="button" id="qxArchPrev"' + (readerState.i <= 0 ? " disabled" : "") + ">Prev</button>" +
      '<button type="button" id="qxArchNext"' + (readerState.i >= n - 1 ? " disabled" : "") + ">Next</button>" +
      '<button type="button" id="qxArchTheme">' + (theme === "night" ? "Night" : theme === "sepia" ? "Sepia" : "Day") + "</button>" +
      '<button type="button" id="qxArchZmOut">−</button>' +
      '<button type="button" id="qxArchZmIn">+</button>' +
      '<button type="button" id="qxArchFit">Fit</button>' +
      '<button type="button" id="qxArchRetry">Reload</button>' +
      (extUrl(b) ? '<button type="button" id="qxArchExt">New tab</button>' : "") +
      '<button type="button" id="qxArchFs">Full</button>' +
      '<button type="button" id="qxArchX">Close</button>' +
      "</div></div>" +
      '<button type="button" class="qx-k-strip" id="qxArchAbout"><b>What’s inside</b><span>' + esc(lead) + "</span></button>" +
      '<div class="qx-k-stage">' + stage + drawer + "</div>" +
      '<div class="qx-k-foot"><span>' + (readerState.i + 1) + " / " + n + '</span><span class="bar"><i style="width:' + pct + '%"></i></span><span>' + Math.round(z * 100) + "%</span></div>";

    var frame = wrap.querySelector("#qxArchFrame");
    if (frame) frame.style.transform = "scale(" + z + ")";

    wrap.querySelector("#qxArchX").onclick = closeReader;
    wrap.querySelector("#qxArchCh").onclick = function () { readerState.drawer = !readerState.drawer; paintReader(); };
    var aboutBtn = wrap.querySelector("#qxArchAbout");
    if (aboutBtn) aboutBtn.onclick = function () { readerState.drawer = true; paintReader(); };
    var prev = wrap.querySelector("#qxArchPrev");
    var next = wrap.querySelector("#qxArchNext");
    if (prev) prev.onclick = function () { if (readerState.i > 0) { readerState.i--; readerState.preview = 0; saveReader(); paintReader(); } };
    if (next) next.onclick = function () { if (readerState.i < n - 1) { readerState.i++; readerState.preview = 0; saveReader(); paintReader(); } };
    wrap.querySelector("#qxArchTheme").onclick = function () {
      readerState.theme = theme === "day" ? "sepia" : theme === "sepia" ? "night" : "day";
      saveReader(); paintReader();
    };
    wrap.querySelector("#qxArchZmOut").onclick = function () { readerState.zoom = Math.max(0.7, +(z - 0.1).toFixed(2)); saveReader(); paintReader(); };
    wrap.querySelector("#qxArchZmIn").onclick = function () { readerState.zoom = Math.min(1.8, +(z + 0.1).toFixed(2)); saveReader(); paintReader(); };
    wrap.querySelector("#qxArchFit").onclick = function () { readerState.zoom = 1; saveReader(); paintReader(); };
    wrap.querySelector("#qxArchRetry").onclick = function () {
      if (urls.length) {
        readerState.preview = (Number(readerState.preview || 0) + 1) % urls.length;
        paintReader();
      }
    };
    var ext = wrap.querySelector("#qxArchExt");
    if (ext) ext.onclick = function () { try { w.open(extUrl(b), "_blank", "noopener"); } catch (_) { /* */ } };
    wrap.querySelector("#qxArchFs").onclick = function () {
      try {
        if (!document.fullscreenElement) wrap.requestFullscreen();
        else document.exitFullscreen();
      } catch (_) { /* */ }
    };
    wrap.querySelectorAll("[data-qx-arch-jump]").forEach(function (btn) {
      btn.onclick = function () {
        readerState.i = Number(btn.getAttribute("data-qx-arch-jump")) || 0;
        readerState.preview = 0;
        readerState.drawer = false;
        saveReader();
        paintReader();
      };
    });
  }

  function closeReader() {
    var el = document.getElementById("qxArchReader");
    if (el) el.remove();
    document.removeEventListener("keydown", onKey);
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (_) { /* */ }
  }
  function onKey(e) {
    if (e.key === "Escape") closeReader();
    if (e.key === "ArrowLeft") { var p = document.getElementById("qxArchPrev"); if (p) p.click(); }
    if (e.key === "ArrowRight") { var n = document.getElementById("qxArchNext"); if (n) n.click(); }
    if (e.key === "+" || e.key === "=") { var zi = document.getElementById("qxArchZmIn"); if (zi) zi.click(); }
    if (e.key === "-") { var zo = document.getElementById("qxArchZmOut"); if (zo) zo.click(); }
  }

  w.qxArchiveRead = async function (id, chapterDriveId) {
    try {
      var lib = await loadLib();
      var book = findBook(lib, String(id || ""));
      if (!book) {
        if (typeof showToast === "function") showToast("This file is missing.");
        return;
      }
      if (!hasFile(book)) {
        if (typeof showToast === "function") showToast("Source has not published this PDF yet.");
        return;
      }
      var list;
      var usableCh = (book.chapters || []).filter(chapterHasView);
      if (usableCh.length) {
        list = usableCh.map(function (ch, n) {
          var ownFile = !!(ch.iaId || ch.iaFile || ch.pdfUrl || ch.megaUrl || ch.driveId || isOwnDrive(ch.ownDriveId));
          return {
            id: book.id + "-ch-" + n,
            title: fileLabel(ch),
            iaId: ch.iaId || (!ownFile ? book.iaId : ""),
            iaFile: ch.iaFile || (!ownFile ? book.iaFile : ""),
            pdfUrl: ch.pdfUrl,
            megaUrl: ch.megaUrl || (!ownFile ? book.megaUrl : ""),
            ownDriveId: isOwnDrive(ch.ownDriveId) ? ch.ownDriveId : "",
            driveId: (ch.driveId && !ch.driveBlocked) ? ch.driveId : "",
            driveBlocked: !!ch.driveBlocked,
            series: book.series,
            group: book.group,
            kind: "file"
          };
        });
      } else {
        list = siblings(lib, book);
        if (!list.length) list = [book];
      }
      var i = 0;
      var want = chapterDriveId == null || chapterDriveId === "" ? -1 : Number(chapterDriveId);
      for (var x = 0; x < list.length; x++) {
        if (want >= 0 && x === want) i = x;
        else if (want < 0 && list[x].id === book.id) i = x;
      }
      var prefs = loadPrefs(book.id);
      readerState = {
        list: list,
        i: i,
        zoom: prefs.zoom || 1,
        theme: prefs.theme || "day",
        preview: 0,
        drawer: false,
        lib: lib,
        parent: book,
        mode: usableCh.length ? "files" : "series"
      };
      closeReader();
      var wrap = document.createElement("div");
      wrap.id = "qxArchReader";
      wrap.setAttribute("role", "dialog");
      wrap.setAttribute("aria-label", "Quantrex Archive reader");
      document.body.appendChild(wrap);
      document.addEventListener("keydown", onKey);
      paintReader();
    } catch (e) {
      if (typeof showToast === "function") showToast("Could not open this book.");
    }
  };

  if (!w._qxArchClickBound) {
    w._qxArchClickBound = true;
    document.addEventListener("click", function (ev) {
      var el = ev.target && ev.target.closest && ev.target.closest("[data-qx-arch-read]");
      if (!el) return;
      ev.preventDefault();
      ev.stopPropagation();
      w.qxArchiveRead(el.getAttribute("data-qx-arch-read"), el.getAttribute("data-qx-arch-ch"));
    }, true);
    w.addEventListener("message", function (ev) {
      if (!ev || !ev.data || ev.data.type !== "qx-pdf-fail") return;
      if (!document.getElementById("qxArchReader")) return;
      var b = readerState.list[readerState.i];
      var urls = previewUrls(b || {});
      var next = Number(readerState.preview || 0) + 1;
      if (next >= urls.length) return;
      readerState.preview = next;
      paintReader();
    });
  }

  w.qxArchiveReadDirect = function () {
    if (typeof showToast === "function") showToast("Open the book from Archive to view the PDF.");
  };

  w.viewArchive = viewArchive;
})(window);
