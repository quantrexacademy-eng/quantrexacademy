// Quantrex digital book cover art — clear identity per book (MARKS-style grid)

const BOOK_COVER_PRESETS = {
  "6a0addba4b032b031e049a36": { brand: "HC Verma", line: "Concepts of Physics", vol: "Vol. 2", subject: "Physics", exam: "JEE Main", colors: ["#0c4a6e", "#0284c7", "#38bdf8"], icon: "⚛️", pattern: "waves" },
  "69f9cc23681eab6d6021a4d1": { brand: "HC Verma", line: "Concepts of Physics", vol: "Vol. 1", subject: "Physics", exam: "JEE Main", colors: ["#1e3a5f", "#2563eb", "#60a5fa"], icon: "⚛️", pattern: "waves" },
  "69cfb5366ecf5579037d96a4": { brand: "I.E. Irodov", line: "Problems in General Physics", vol: "Top Selected", subject: "Physics", exam: "JEE Adv+", colors: ["#450a0a", "#b91c1c", "#f87171"], icon: "🔥", pattern: "grid" },
  "68f1ce4cc729e5251bd00430": { brand: "Rank Booster", line: "Most Important Qs", vol: "JEE Advanced", subject: "PCM", exam: "JEE Advanced", colors: ["#312e81", "#4f46e5", "#818cf8"], icon: "🚀", pattern: "diagonal" },
  "68946f70ebd145663de38728": { brand: "99 Percentile", line: "Qs Bank", vol: "JEE Main", subject: "PCM", exam: "JEE Main", colors: ["#78350f", "#d97706", "#fbbf24"], icon: "👑", pattern: "shine" },
  "6894d29d3156b1f3ca5ad0be": { brand: "Backlog Booster", line: "Highly Selective Qs", vol: "Clear Backlog", subject: "PCM", exam: "JEE Main", colors: ["#9a3412", "#ea580c", "#fb923c"], icon: "⚡", pattern: "diagonal" },
  "69048808ef55966cf1d71f1d": { brand: "Olympiad", line: "Workbook", vol: "Competitive", subject: "PCM", exam: "JEE Main", colors: ["#134e4a", "#0d9488", "#5eead4"], icon: "🏅", pattern: "grid" },
  "69968cee494a12a5771e3455": { brand: "Biology 360", line: "Complete NEET Bio", vol: "2026 Edition", subject: "Biology", exam: "NEET", colors: ["#14532d", "#16a34a", "#86efac"], icon: "🧬", pattern: "waves" },
  "67656ccf18ff438b6c18cc4c": { brand: "Must Do 2024", line: "Top PYQs", vol: "JEE Main", subject: "PCM", exam: "JEE Main", colors: ["#881337", "#e11d48", "#fda4af"], icon: "⭐", pattern: "shine", tag: "New" },
  "67656d13c83ed0673b8b7b68": { brand: "Top 250", line: "Single Correct", vol: "2023–2020", subject: "PCM", exam: "JEE Main", colors: ["#1e3a8a", "#3b82f6", "#93c5fd"], icon: "🎯", pattern: "grid", tag: "PYQ" },
  "67656cf0a790fd9b172cf0d2": { brand: "Top 100", line: "Numerical Qs", vol: "2023–2020", subject: "Math+Phy", exam: "JEE Main", colors: ["#065f46", "#059669", "#6ee7b7"], icon: "🔢", pattern: "diagonal", tag: "Numerical" }
};

function inferBookCoverStyle(book) {
  if (!book) return { brand: "Digital Book", line: "Question Bank", vol: "", subject: "PCM", exam: "JEE", colors: ["#1e293b", "#475569", "#94a3b8"], icon: "📚", pattern: "waves" };
  if (BOOK_COVER_PRESETS[book.id]) return { ...BOOK_COVER_PRESETS[book.id] };

  const t = String(book.title || "").toLowerCase();
  const style = { brand: book.title || "Digital Book", line: "Expert Qs Bank", vol: book.exam || "", subject: "PCM", exam: book.exam || "JEE Main", colors: ["#1e3a8a", "#3b82f6", "#93c5fd"], icon: "📖", pattern: "waves" };

  if (t.includes("physics") && t.includes("volume 1")) Object.assign(style, BOOK_COVER_PRESETS["69f9cc23681eab6d6021a4d1"]);
  else if (t.includes("physics") && t.includes("volume 2")) Object.assign(style, BOOK_COVER_PRESETS["6a0addba4b032b031e049a36"]);
  else if (t.includes("irodov")) Object.assign(style, BOOK_COVER_PRESETS["69cfb5366ecf5579037d96a4"]);
  else if (t.includes("99 percentile")) Object.assign(style, BOOK_COVER_PRESETS["68946f70ebd145663de38728"]);
  else if (t.includes("backlog")) Object.assign(style, BOOK_COVER_PRESETS["6894d29d3156b1f3ca5ad0be"]);
  else if (t.includes("olympiad")) Object.assign(style, BOOK_COVER_PRESETS["69048808ef55966cf1d71f1d"]);
  else if (t.includes("advanced")) Object.assign(style, BOOK_COVER_PRESETS["68f1ce4cc729e5251bd00430"]);
  else if (t.includes("biology") || t.includes("neet")) {
    style.colors = ["#14532d", "#16a34a", "#86efac"];
    style.icon = "🧬";
    style.exam = "NEET";
  }
  if (book.type === "curated") {
    style.tag = book.tag || "Featured";
    style.line = style.line || "Curated PYQs";
  }
  return style;
}

function renderBookCover(book, size) {
  const st = inferBookCoverStyle(book);
  const c1 = st.colors[0] || "#1e3a8a";
  const c2 = st.colors[1] || "#3b82f6";
  const c3 = st.colors[2] || "#93c5fd";
  const count = book.count ? `${book.count.toLocaleString()} Qs` : "";
  const soon = book.isComingSoon ? `<span class="qx-cover-soon">Coming Soon</span>` : "";
  const tag = st.tag ? `<span class="qx-cover-tag">${st.tag}</span>` : "";
  const sz = size === "sm" ? " qx-cover-sm" : size === "lg" ? " qx-cover-lg" : "";

  return `<div class="qx-book-cover${sz} qx-cover-${st.pattern}" style="--cover-c1:${c1};--cover-c2:${c2};--cover-c3:${c3}" aria-hidden="true">
    <div class="qx-cover-spine"></div>
    <div class="qx-cover-inner">
      ${tag}${soon}
      <span class="qx-cover-exam">${st.exam}</span>
      <span class="qx-cover-icon">${st.icon}</span>
      <strong class="qx-cover-brand">${st.brand}</strong>
      <span class="qx-cover-line">${st.line}</span>
      ${st.vol ? `<span class="qx-cover-vol">${st.vol}</span>` : ""}
      <span class="qx-cover-subject">${st.subject}</span>
      ${count ? `<span class="qx-cover-count">${count}</span>` : ""}
    </div>
    <div class="qx-cover-foot">Quantrex Digital</div>
  </div>`;
}

function bookOpenPayload(book) {
  if (!book || book.isComingSoon) return null;
  if (book.type === "curated") return { step: "subjects", bookId: book.id, moduleId: book.id };
  return { step: "modules", bookId: book.id };
}

function renderBookCard(book, extraClass) {
  const soon = book.isComingSoon;
  const payload = bookOpenPayload(book);
  const click = soon ? "" : `data-mg="books" data-mgp='${JSON.stringify(payload).replace(/'/g, "&#39;")}'`;
  const title = book.title || "Digital Book";
  const meta = `${book.exam || "Quantrex"}${book.count ? ` · ${book.count.toLocaleString()} questions` : ""}${soon ? " · Coming Soon" : ""}`;

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