// Quantrex digital book covers — AI photo covers + SVG fallback (no external watermarks)

const BOOK_COVER_PRESETS = {
  "6a0addba4b032b031e049a36": { brand: "HC Verma", line: "Concepts of Physics", vol: "Volume 2", subject: "Physics", badge: "HC Verma", colors: ["#0c1e4a", "#1e3a8a", "#2563eb", "#38bdf8"], icon: "⚛️", pattern: "waves" },
  "69f9cc23681eab6d6021a4d1": { brand: "HC Verma", line: "Concepts of Physics", vol: "Volume 1", subject: "Physics", badge: "HC Verma", colors: ["#1e3a5f", "#2563eb", "#60a5fa"], icon: "⚛️", pattern: "waves" },
  "69f9ccfa011347df7bce2a38": { brand: "HC Verma", line: "Concepts of Physics", vol: "Volume 1", subject: "Physics", badge: "HC Verma", colors: ["#1e3a5f", "#2563eb", "#60a5fa"], icon: "⚛️", pattern: "waves" },
  "6a0adb714b032b031e049a34": { brand: "HC Verma", line: "Concepts of Physics", vol: "Volume 2", subject: "Physics", badge: "HC Verma", colors: ["#0c1e4a", "#1e3a8a", "#2563eb", "#38bdf8"], icon: "⚛️", pattern: "waves" },
  "6a4ce383c59a7b462185330f": { brand: "Organic Chemistry", line: "Fundamentals", vol: "NEET 2027", subject: "Chemistry", badge: "Organic Chemistry", colors: ["#14532d", "#16a34a", "#86efac"], icon: "⚗️", pattern: "hex", tag: "NEET" },
  "6a507da9107f81233d9985c1": { brand: "Organic Chemistry", line: "Fundamentals", vol: "NEET 2027", subject: "Chemistry", badge: "Organic Chemistry", colors: ["#14532d", "#16a34a", "#86efac"], icon: "⚗️", pattern: "hex", tag: "NEET" },
  "69cfb4af611e9b07b5d55e79": { brand: "I.E. Irodov", line: "Top Problems", vol: "MCQs for NEET", subject: "Physics", badge: "Irodov", colors: ["#450a0a", "#b91c1c", "#f87171"], icon: "🔥", pattern: "grid" },
  "69a684ac213ecfafb0629c0d": { brand: "Biology 360/360", line: "NEET Biology", vol: "2027 Edition", subject: "Biology", badge: "NEET 2027", colors: ["#14532d", "#16a34a", "#facc15"], icon: "🧬", pattern: "waves" },
  "69a6ea53213ecfafb0629c18": { brand: "Top 500", line: "JEE Main PYQs", vol: "Physics · NEET 2027", subject: "Physics", badge: "Top 500", colors: ["#111827", "#1f2937", "#fbbf24"], icon: "🎯", pattern: "grid" },
  "69a6eaf1213ecfafb0629c19": { brand: "Top 500", line: "JEE Main PYQs", vol: "Chemistry · NEET 2027", subject: "Chemistry", badge: "Top 500", colors: ["#14532d", "#16a34a", "#facc15"], icon: "🎯", pattern: "grid" },
  "69736c8362b916d85e52cd1b": { brand: "BITSAT", line: "English & Logical Reasoning", vol: "Prep Guide", subject: "English + LR", badge: "BITSAT", colors: ["#0b1226", "#1e3a8a", "#38bdf8"], icon: "🧠", pattern: "waves", tag: "BITSAT" },
  "69cfb5366ecf5579037d96a4": { brand: "I.E. Irodov", line: "General Physics", vol: "Top Problems", subject: "Physics", badge: "Irodov", colors: ["#450a0a", "#b91c1c", "#f87171"], icon: "🔥", pattern: "grid" },
  "68f1ce4cc729e5251bd00430": { brand: "Rank Booster", line: "Most Important Qs", vol: "Advanced Level", subject: "PCM", badge: "Rank Booster", colors: ["#312e81", "#4f46e5", "#818cf8"], icon: "🚀", pattern: "diagonal" },
  "a1b2c3d4e5f6010203040506": { brand: "Skills in Mathematics", line: "Differential Calculus", vol: "JEE Main & Adv", subject: "Mathematics", badge: "Amit M Agarwal", colors: ["#064e3b", "#059669", "#34d399"], icon: "∫", pattern: "waves", tag: "Premium" },
  "a1b2c3d4e5f6010203040507": { brand: "Skills in Mathematics", line: "Integral Calculus", vol: "JEE Main & Adv", subject: "Mathematics", badge: "Amit M Agarwal", colors: ["#9a3412", "#ea580c", "#fdba74"], icon: "∫", pattern: "waves", tag: "Premium" },
  "a1b2c3d4e5f6010203040508": { brand: "Black Book", line: "Advanced Problems in Mathematics", vol: "Vikas Gupta · Pankaj Joshi", subject: "Mathematics", badge: "Black Book", colors: ["#0f172a", "#1e293b", "#fbbf24"], icon: "📘", pattern: "grid", tag: "Maths" },
  "68946f70ebd145663de38728": { brand: "99 Percentile", line: "Question Bank", vol: "High Yield", subject: "PCM", badge: "99 Percentile", colors: ["#78350f", "#d97706", "#fbbf24"], icon: "👑", pattern: "shine" },
  "6894d29d3156b1f3ca5ad0be": { brand: "Backlog Booster", line: "Selective Qs", vol: "Backlog Clear", subject: "PCM", badge: "Backlog Booster", colors: ["#9a3412", "#ea580c", "#fb923c"], icon: "⚡", pattern: "diagonal" },
  "69048808ef55966cf1d71f1d": { brand: "Olympiad", line: "Workbook", vol: "Competitive", subject: "PCM", badge: "Olympiad", colors: ["#134e4a", "#0d9488", "#5eead4"], icon: "🏅", pattern: "grid" },
  "6a91185f41ab5aba084f4d30": { brand: "Quantrex Academy", line: "Most Important PYQ", vol: "JEE Main 2027", subject: "PCM", badge: "Quantrex PYQ", colors: ["#0b1b4a", "#1d4ed8", "#fbbf24"], icon: "⭐", pattern: "shine", tag: "PYQ 2022–2026" },
  "qx_mipyq_neet_2027": { brand: "Quantrex Academy", line: "Most Important PYQ", vol: "NEET 2027", subject: "PCB", badge: "Quantrex PYQ", colors: ["#0b1b4a", "#1d4ed8", "#fbbf24"], icon: "⭐", pattern: "shine", tag: "4941 Questions" },
  "qx_physchem_jee_2027": { brand: "Quantrex Academy", line: "Physical Chemistry", vol: "JEE Main 2027", subject: "Chemistry", badge: "Physical Chemistry", colors: ["#0f172a", "#1e3a8a", "#dc2626"], icon: "⚗️", pattern: "waves" },
  "qx_physchem_neet_2027": { brand: "Quantrex Academy", line: "Physical Chemistry", vol: "NEET 2027", subject: "Chemistry", badge: "Physical Chemistry", colors: ["#0f172a", "#1e3a8a", "#dc2626"], icon: "⚗️", pattern: "waves" },
  "6a916235cb18ffc9d00d5aa1": { brand: "Quantrex Academy", line: "Most Important PYQ", vol: "JEE Main 2027", subject: "PCM", badge: "Quantrex PYQ", colors: ["#0b1b4a", "#1d4ed8", "#fbbf24"], icon: "⭐", pattern: "shine", tag: "PYQ 2022–2026" },
  "69968cee494a12a5771e3455": { brand: "Biology 360", line: "NEET Biology", vol: "2026 Edition", subject: "Biology", badge: "NEET Biology", colors: ["#14532d", "#16a34a", "#86efac"], icon: "🧬", pattern: "waves" },
  "67656ccf18ff438b6c18cc4c": { brand: "Must Do 2024", line: "Top PYQs", vol: "2024 Edition", subject: "PCM", badge: "PYQ 2024", colors: ["#881337", "#e11d48", "#fda4af"], icon: "⭐", pattern: "shine", tag: "New" },
  "67656d13c83ed0673b8b7b68": { brand: "Top 250", line: "Single Correct", vol: "2023–2020", subject: "PCM", badge: "PYQ Collection", colors: ["#1e3a8a", "#3b82f6", "#93c5fd"], icon: "🎯", pattern: "grid", tag: "PYQ" },
  "67656cf0a790fd9b172cf0d2": { brand: "Top 100", line: "Numerical Qs", vol: "2023–2020", subject: "Phy + Math", badge: "Numerical PYQ", colors: ["#065f46", "#059669", "#6ee7b7"], icon: "🔢", pattern: "diagonal", tag: "Numerical" }
};

const BOOK_COVER_PHOTO = {
  "6a0addba4b032b031e049a36": "assets/book-covers/hc-verma-v2.jpg",
  "6a0adb714b032b031e049a34": "assets/book-covers/hc-verma-v2.jpg",
  "69f9cc23681eab6d6021a4d1": "assets/book-covers/hc-verma-v1.jpg",
  "69f9ccfa011347df7bce2a38": "assets/book-covers/hc-verma-v1.jpg",
  // Organic: Quantrex digital cover (not MARKS stock)
  "6a4ce383c59a7b462185330f": "assets/book-covers/organic-chemistry.jpg",
  "6a507da9107f81233d9985c1": "assets/book-covers/organic-chemistry.jpg",
  "69736c8362b916d85e52cd1b": "assets/book-covers/bitsat-english-lr.jpg",
  "69cfb5366ecf5579037d96a4": "assets/book-covers/irodov.jpg",
  "69cfb4af611e9b07b5d55e79": "assets/book-covers/irodov.jpg",
  "69a684ac213ecfafb0629c0d": "assets/book-covers/biology-360.jpg",
  "qx_physchem_jee_2027": "assets/book-covers/physical-chemistry-jee.svg",
  "qx_physchem_neet_2027": "assets/book-covers/physical-chemistry-neet.svg",
  "qx_mipyq_neet_2027": "assets/book-covers/qx-pyq-important.jpg",
  "69a6ea53213ecfafb0629c18": "assets/book-covers/top500-physics.jpg",
  "69a6eaf1213ecfafb0629c19": "assets/book-covers/top500-chemistry.jpg",
  "68f1ce4cc729e5251bd00430": "assets/book-covers/rank-booster.jpg",
  "a1b2c3d4e5f6010203040506": "assets/book-covers/skills-diff-calculus.png",
  "a1b2c3d4e5f6010203040507": "assets/book-covers/skills-integral-calculus.png",
  "a1b2c3d4e5f6010203040508": "assets/book-covers/black-book-math.png",
  "68946f70ebd145663de38728": "assets/book-covers/99-percentile.jpg",
  "6894d29d3156b1f3ca5ad0be": "assets/book-covers/backlog-booster.jpg",
  "69048808ef55966cf1d71f1d": "assets/book-covers/olympiad.jpg",
  "6a91185f41ab5aba084f4d30": "assets/book-covers/qx-pyq-important.jpg",
  "6a916235cb18ffc9d00d5aa1": "assets/book-covers/qx-pyq-important.jpg",
  "69968cee494a12a5771e3455": "assets/book-covers/biology-360.jpg",
  "67656ccf18ff438b6c18cc4c": "assets/book-covers/must-do-2024.jpg",
  "67656d13c83ed0673b8b7b68": "assets/book-covers/top-250.jpg",
  "67656cf0a790fd9b172cf0d2": "assets/book-covers/top-100-numerical.jpg"
};

const BOOK_COVER_SVG = {
  "6a0addba4b032b031e049a36": "assets/book-covers/hc-verma-v2.svg",
  "69f9cc23681eab6d6021a4d1": "assets/book-covers/hc-verma-v1.svg",
  "6a4ce383c59a7b462185330f": "assets/book-covers/organic-chemistry.jpg",
  "69736c8362b916d85e52cd1b": "assets/book-covers/bitsat-english-lr.jpg",
  "69cfb5366ecf5579037d96a4": "assets/book-covers/irodov.svg",
  "68f1ce4cc729e5251bd00430": "assets/book-covers/rank-booster.svg",
  "a1b2c3d4e5f6010203040506": "assets/book-covers/skills-diff-calculus.png",
  "a1b2c3d4e5f6010203040507": "assets/book-covers/skills-integral-calculus.png",
  "a1b2c3d4e5f6010203040508": "assets/book-covers/black-book-math.png",
  "68946f70ebd145663de38728": "assets/book-covers/99-percentile.svg",
  "6894d29d3156b1f3ca5ad0be": "assets/book-covers/backlog-booster.svg",
  "69048808ef55966cf1d71f1d": "assets/book-covers/olympiad.svg",
  "6a91185f41ab5aba084f4d30": "assets/book-covers/qx-pyq-important.jpg",
  "6a916235cb18ffc9d00d5aa1": "assets/book-covers/qx-pyq-important.jpg",
  "69968cee494a12a5771e3455": "assets/book-covers/biology-360.svg",
  "67656ccf18ff438b6c18cc4c": "assets/book-covers/must-do-2024.svg",
  "67656d13c83ed0673b8b7b68": "assets/book-covers/top-250.svg",
  "67656cf0a790fd9b172cf0d2": "assets/book-covers/top-100-numerical.svg"
};

const GENERIC_EXAM_BADGES = /^(jee\s*main|jee\s*adv(?:anced)?|engineering|medical|pcm|physics)$/i;

function bookDisplayBadge(book) {
  if (book && book.badge && !GENERIC_EXAM_BADGES.test(book.badge)) return book.badge;
  if (book && book.id && BOOK_COVER_PRESETS[book.id]) return BOOK_COVER_PRESETS[book.id].badge;
  const t = String(book && book.title || "");
  if (/hc verma|concepts of physics/i.test(t)) return "HC Verma";
  if (/irodov/i.test(t)) return "Irodov";
  if (/rank booster|advanced/i.test(t)) return "Rank Booster";
  if (/99 percentile/i.test(t)) return "99 Percentile";
  if (/backlog/i.test(t)) return "Backlog Booster";
  if (/olympiad/i.test(t)) return "Olympiad";
  if (/most important pyq|pyq based questions/i.test(t)) return "Quantrex PYQ";
  if (/biology 360/i.test(t)) return "NEET Biology";
  if (/physical chemistry/i.test(t)) return "Physical Chemistry";
  if (/organic chemistry/i.test(t)) return "Organic Chemistry";
  if (/bitsat/i.test(t)) return "BITSAT";
  if (/black book/i.test(t)) return "Black Book";
  if (/differential calculus/i.test(t)) return "Amit M Agarwal";
  if (/integral calculus/i.test(t)) return "Amit M Agarwal";
  return book && book.subject ? book.subject : "Digital Book";
}

function inferBookCoverStyle(book) {
  if (!book) return { brand: "Digital Book", line: "Question Bank", vol: "", subject: "PCM", badge: "Digital Book", colors: ["#1e293b", "#475569", "#94a3b8"], icon: "📚", pattern: "waves" };

  const preset = BOOK_COVER_PRESETS[book.id];
  const style = preset ? { ...preset } : {
    brand: book.title || "Digital Book",
    line: book.exam && !GENERIC_EXAM_BADGES.test(book.exam) ? book.exam : "Expert Qs Bank",
    vol: "",
    subject: book.subject || "PCM",
    badge: bookDisplayBadge(book),
    colors: ["#1e3a8a", "#3b82f6", "#93c5fd"],
    icon: "📖",
    pattern: "waves"
  };

  style.badge = bookDisplayBadge(book);
  if (book.subject) style.subject = book.subject;
  if (book.tag) style.tag = book.tag;

  const t = String(book.title || "").toLowerCase();
  if (t.includes("physics") && t.includes("volume 1")) Object.assign(style, BOOK_COVER_PRESETS["69f9cc23681eab6d6021a4d1"], { badge: bookDisplayBadge(book) });
  else if (t.includes("physics") && t.includes("volume 2")) Object.assign(style, BOOK_COVER_PRESETS["6a0addba4b032b031e049a36"], { badge: bookDisplayBadge(book) });
  else if (t.includes("irodov")) Object.assign(style, BOOK_COVER_PRESETS["69cfb5366ecf5579037d96a4"], { badge: bookDisplayBadge(book) });
  else if (t.includes("99 percentile")) Object.assign(style, BOOK_COVER_PRESETS["68946f70ebd145663de38728"], { badge: bookDisplayBadge(book) });
  else if (t.includes("advanced") && t.includes("important")) Object.assign(style, BOOK_COVER_PRESETS["68f1ce4cc729e5251bd00430"], { badge: bookDisplayBadge(book) });
  else if (t.includes("backlog")) Object.assign(style, BOOK_COVER_PRESETS["6894d29d3156b1f3ca5ad0be"], { badge: bookDisplayBadge(book) });
  else if (t.includes("olympiad")) Object.assign(style, BOOK_COVER_PRESETS["69048808ef55966cf1d71f1d"], { badge: bookDisplayBadge(book) });
  else if (t.includes("organic chemistry") || t.includes("fundamentals of organic")) {
    Object.assign(style, BOOK_COVER_PRESETS["6a4ce383c59a7b462185330f"], { badge: bookDisplayBadge(book) });
  }
  else if (t.includes("bitsat") || t.includes("english and logical") || t.includes("english & logical")) {
    Object.assign(style, BOOK_COVER_PRESETS["69736c8362b916d85e52cd1b"], { badge: bookDisplayBadge(book) });
  }
  else if (t.includes("biology") || t.includes("neet")) {
    style.colors = ["#14532d", "#16a34a", "#86efac"];
    style.icon = "🧬";
    style.badge = bookDisplayBadge(book);
  }
  if (book.type === "curated") {
    style.tag = book.tag || style.tag || "Featured";
    style.line = style.line || "Curated PYQs";
  }
  return style;
}

const BOOK_COVER_VER = "qxfix105";

function withCoverVer(path) {
  if (!path) return null;
  return path.includes("?") ? path : `${path}?v=${BOOK_COVER_VER}`;
}

function bookCoverImage(book) {
  if (!book) return null;
  if (BOOK_COVER_PHOTO[book.id]) return withCoverVer(BOOK_COVER_PHOTO[book.id]);
  const cover = book.cover || book.banner || "";
  if (cover && !/getmarks\.app/i.test(cover)) return withCoverVer(cover);
  if (BOOK_COVER_SVG[book.id]) return withCoverVer(BOOK_COVER_SVG[book.id]);
  return null;
}

function bookCoverFallbackImage(book) {
  if (!book) return null;
  return withCoverVer(BOOK_COVER_SVG[book.id]) || withCoverVer(book.cover) || null;
}

function bookCardMeta(book) {
  const parts = [];
  const badge = bookDisplayBadge(book);
  if (badge) parts.push(badge);
  if (book.subject && book.subject !== badge) parts.push(book.subject);
  const cbt = bookCountBadgeText(book);
  if (cbt) parts.push(cbt);
  else if (book.count) parts.push(`${book.count.toLocaleString()} questions`);
  if (book.isComingSoon) parts.push("Coming Soon");
  return parts.join(" · ") || "Digital Book";
}


function bookCountBadgeText(book) {
  if (!book) return "";
  const raw = book.countBadge || book.marksBadge || "";
  if (raw) return String(raw);
  const n = Number(book.count);
  if (!n || n <= 0) return "";
  // Eng MIPYQ local ≥4200 → Marks-style 4200+ when no explicit badge
  if (book.id === "6a91185f41ab5aba084f4d30" && n >= 4200) return "4200+ Questions";
  return n.toLocaleString() + " Questions";
}

function renderBookPhotoCover(book, size) {
  const img = bookCoverImage(book);
  const fallback = bookCoverFallbackImage(book);
  if (!img) return null;

  const sz = size === "sm" ? " qx-cover-sm" : size === "lg" ? " qx-cover-lg" : "";
  const countTxt = bookCountBadgeText(book);
  const count = countTxt ? `<span class="qx-photo-count qx-photo-qbadge" title="${String(countTxt).replace(/"/g, "&quot;")}">${countTxt}</span>` : "";
  const tag = book.tag && !/coming soon/i.test(book.tag) && !/questions/i.test(book.tag) ? `<span class="qx-photo-tag">${book.tag}</span>` : "";
  const soon = book.isComingSoon ? `<span class="qx-photo-soon">Coming Soon</span>` : "";
  const esc = (book.title || "Book").replace(/"/g, "&quot;");
  const fb = fallback && fallback !== img ? fallback.replace(/'/g, "\\'") : "";

  return `<div class="qx-book-photo${sz}">
    <div class="qx-book-photo-frame">
      <img class="qx-book-photo-img" src="${img}" alt="${esc}" loading="lazy"
        onerror="if(this.dataset.fallback){this.src=this.dataset.fallback;this.dataset.fallback=''}else{this.closest('.qx-book-photo').classList.add('qx-photo-broken');this.style.display='none';const fb=this.closest('.qx-book-photo').querySelector('.qx-book-photo-fallback');if(fb)fb.style.display='block'}"
        ${fb ? `data-fallback="${fb}"` : ""}>
      <div class="qx-book-photo-fallback" style="display:none">${renderBookArtCover(book, size, true)}</div>
      <div class="qx-book-photo-shine"></div>
      <div class="qx-book-photo-spine"></div>
      ${tag}${soon}${count}
    </div>
  </div>`;
}

function renderBookArtCover(book, size, inline) {
  const st = inferBookCoverStyle(book);
  const c1 = st.colors[0] || "#1e3a8a";
  const c2 = st.colors[1] || "#3b82f6";
  const c3 = st.colors[2] || "#93c5fd";
  const countTxt = bookCountBadgeText(book);
  const count = countTxt || "";
  const soon = book.isComingSoon ? `<span class="qx-cover-soon">Coming Soon</span>` : "";
  const tag = st.tag ? `<span class="qx-cover-tag">${st.tag}</span>` : "";
  const sz = size === "sm" ? " qx-cover-sm" : size === "lg" ? " qx-cover-lg" : "";
  const badge = bookDisplayBadge(book);

  return `<div class="qx-book-cover${sz} qx-cover-${st.pattern}${inline ? " qx-cover-inline" : ""}" style="--cover-c1:${c1};--cover-c2:${c2};--cover-c3:${c3}" aria-hidden="true">
    <div class="qx-cover-spine"></div>
    <div class="qx-cover-inner">
      ${tag}${soon}
      <span class="qx-cover-publisher">Quantrex Academy</span>
      <span class="qx-cover-icon">${st.icon}</span>
      <strong class="qx-cover-brand">${st.brand}</strong>
      <span class="qx-cover-line">${st.line}</span>
      ${st.vol ? `<span class="qx-cover-vol">${st.vol}</span>` : ""}
      <span class="qx-cover-badge">${badge}</span>
      <span class="qx-cover-subject">${st.subject}</span>
      ${count ? `<span class="qx-cover-count">${count}</span>` : ""}
    </div>
    <div class="qx-cover-foot">Digital Book</div>
  </div>`;
}

function renderBookCover(book, size) {
  const photo = renderBookPhotoCover(book, size);
  if (photo) return photo;
  return renderBookArtCover(book, size, false);
}

function bookOpenPayload(book) {
  if (!book || book.isComingSoon) return null;
  if (typeof QX_REMOVED_BOOK_IDS !== "undefined" && QX_REMOVED_BOOK_IDS.has(book.id)) return null;
  if (book.type === "curated") return { step: "subjects", bookId: book.id, moduleId: book.id };
  return { step: "modules", bookId: book.id };
}

function renderBookCard(book, extraClass) {
  if (typeof QX_REMOVED_BOOK_IDS !== "undefined" && QX_REMOVED_BOOK_IDS.has(book.id)) return "";
  const soon = book.isComingSoon;
  const payload = bookOpenPayload(book);
  let click = "";
  if (!soon) {
    if (book.redirectType === "allqs" || book.redirectType === "formula") {
      click = `role="button" tabindex="0" onclick="typeof openDigitalBook==='function'&&openDigitalBook({id:'${book.id}',redirectType:'${book.redirectType}',subject:'${String(book.subject || "").replace(/'/g, "")}',isComingSoon:false})"`;
    } else if (payload) {
      click = `data-mg="books" data-mgp='${JSON.stringify(payload).replace(/'/g, "&#39;")}'`;
    }
  }
  const title = book.title || "Digital Book";
  const meta = bookCardMeta(book);

  return `<div class="book-card qx-book-card ${soon ? "soon" : ""} ${extraClass || ""}" ${click}>
    ${renderBookCover(book)}
    <div class="book-info">
      <strong title="${title.replace(/"/g, "&quot;")}">${title}</strong>
      <small>${meta}</small>
    </div>
  </div>`;
}

function renderBookScroll(books, limit) {
  const slice = (books || []).slice(0, limit || 8);
  if (!slice.length) return "";
  return `<div class="books-scroll">${slice.map(b => renderBookCard(b, "qx-book-card-compact")).join("")}</div>`;
}