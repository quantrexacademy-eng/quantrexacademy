/**
 * Public PYQ listing (Sarthaks-style, Quantrex branded).
 * /jee  /jee/:subject  /jee/:subject/:chapter
 * /neet /nda /bitsat /questions
 */
const fs = require("fs");
const path = require("path");

const SITE = "https://www.quantrexacademy.com";
const HUBS = {
  jee: {
    label: "JEE Main & Advanced",
    blurb: "Free JEE Main and JEE Advanced previous year questions with solutions — chapter-wise Physics, Chemistry and Mathematics. Includes actual morning and evening shift papers, JEE Maths practice, and links to mock tests and DPP in the Quantrex app."
  },
  neet: { label: "NEET UG", blurb: "NEET, AIIMS and NTA Abhyas previous year questions with solutions — Physics, Chemistry and Biology." },
  nda: { label: "NDA", blurb: "NDA Mathematics and GAT previous year questions with answers and solutions." },
  bitsat: { label: "BITSAT", blurb: "BITSAT previous year questions with solutions — Physics, Chemistry, Mathematics, English and Logical Reasoning." },
  other: { label: "Other exams", blurb: "MHT CET, WBJEE, KCET, COMEDK, VITEEE, KVPY and more — previous year questions on Quantrex Academy." }
};

const CHAPTER_DISPLAY_ALIASES = {
  "Motion in One Dimension": "Motion in One Dimension",
  "Motion in Two Dimensions": "Motion in Two Dimensions",
  "Work, Power and Energy": "Work, Power and Energy",
  "Center of Mass, Momentum and Collision": "Center of Mass, Momentum and Collision",
  "Basics of Mathematics": "Basics of Mathematics",
  "Permutation and Combination": "Permutation and Combination",
  "Sequences and Series": "Sequences and Series",
  "Quadratic Equation": "Quadratic Equation"
};

function niceChapter(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  if (CHAPTER_DISPLAY_ALIASES[raw]) return CHAPTER_DISPLAY_ALIASES[raw];
  return raw.replace(/\bIn\b/g, "in").replace(/\bOf\b(?!$)/g, "of").replace(/\bAnd\b/g, "and");
}

function polishQuestionText(t) {
  return String(t || "")
    .replace(/\bA LCR\b/g, "An LCR")
    .replace(/\ba LCR\b/g, "an LCR")
    .replace(/\bonly for for\b/gi, "only for")
    .replace(/\balochol\b/gi, "alcohol")
    .replace(/\bimpedence\b/gi, "impedance")
    .replace(/Which of the following statements is incorrect\s*\?/gi, "Which of the following statements is incorrect?")
    .replace(/Which of the following statements is incorrect/gi, "Which of the following statements is incorrect");
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function readJson(req, rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.env.QX_SITE_ROOT || process.cwd(), rel), "utf8"));
  } catch (_) {}
  try {
    const host = String((req.headers && (req.headers["x-forwarded-host"] || req.headers.host)) || "www.quantrexacademy.com")
      .split(",")[0]
      .trim();
    const proto = String((req.headers && req.headers["x-forwarded-proto"]) || "https").split(",")[0].trim();
    const r = await fetch(proto + "://" + host + "/" + rel.replace(/\\/g, "/"));
    if (r.ok) return await r.json();
  } catch (_) {}
  return null;
}

function parse(req) {
  const q = req.query || {};
  let hub = String(q.hub || "").toLowerCase();
  let subject = String(q.subject || "");
  let chapter = String(q.chapter || "");
  const raw = decodeURIComponent(String(req.url || "").split("?")[0]);
  const m = raw.match(/\/(jee|neet|nda|bitsat|questions)(?:\/([^/]+))?(?:\/([^/]+))?/i);
  if (m) {
    if (!hub) hub = m[1].toLowerCase();
    if (!subject && m[2]) subject = m[2];
    if (!chapter && m[3]) chapter = m[3];
  }
  if (hub === "questions") hub = "";
  return { hub, subject, chapter };
}

function fmt(n) {
  n = Number(n) || 0;
  return n.toLocaleString("en-IN");
}

function css() {
  return `
:root{--bg:#eef4fb;--card:#fff;--ink:#0b1b33;--muted:#5b6b82;--brand:#1565C0;--line:#d4e3f4;--ok:#0f766e;--violet:#8450CB}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.55}
a{color:var(--brand)}
.top{background:linear-gradient(125deg,#071526 0%,#0b2a5b 42%,#1565C0 78%,#8450CB 100%);color:#fff;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#fff;font-weight:800}
.brand img{width:40px;height:40px;border-radius:10px;background:#071526}
.brand small{display:block;font-size:11px;font-weight:650;opacity:.85;letter-spacing:.04em}
.topnav{display:flex;gap:8px;flex-wrap:wrap}
.topnav a{color:#fff;text-decoration:none;font-size:12px;font-weight:800;background:rgba(255,255,255,.12);padding:7px 12px;border-radius:999px}
.topnav a.on{background:#fff;color:#0b2a5b}
.hero{max-width:1120px;margin:0 auto;padding:22px 16px 8px}
.hero h1{font-size:clamp(1.35rem,3.6vw,2.05rem);line-height:1.25;margin:0 0 8px}
.hero p{margin:0;color:var(--muted);max-width:720px}
.stats{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 0}
.stat{background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:800;color:#0b2a5b}
.wrap{max-width:1120px;margin:0 auto;padding:8px 16px 56px;display:grid;grid-template-columns:240px 1fr;gap:18px}
@media(max-width:860px){.wrap{grid-template-columns:1fr}.side{position:static}}
.side{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:14px;height:fit-content;position:sticky;top:12px}
.side h2{margin:0 0 8px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.side a{display:flex;justify-content:space-between;gap:8px;text-decoration:none;padding:8px 8px;border-radius:10px;color:var(--ink);font-weight:700;font-size:13px}
.side a:hover,.side a.on{background:#e8f1fb;color:var(--brand)}
.side b{color:var(--muted);font-weight:750}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;text-decoration:none;color:inherit;display:block;box-shadow:0 8px 22px rgba(15,40,80,.05)}
.tile:hover{border-color:#9ec0e8;transform:translateY(-1px)}
.tile h3{margin:0 0 4px;font-size:15px}
.tile p{margin:0;font-size:12px;color:var(--muted);font-weight:700}
.list{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 10px 28px rgba(15,40,80,.06)}
.find{width:100%;border:0;border-bottom:1px solid var(--line);padding:12px 14px;font:inherit;font-weight:650}
.qrow{display:grid;grid-template-columns:42px 1fr auto;gap:10px;align-items:start;padding:14px 14px;border-top:1px solid #eef3f9;text-decoration:none;color:inherit}
.qrow:hover{background:#f7fbff}
.num{width:32px;height:32px;border-radius:10px;background:linear-gradient(180deg,#e8f1fb,#d7e8fa);color:#1565C0;font-weight:800;display:grid;place-items:center;font-size:12px}
.qrow h3{margin:0 0 6px;font-size:15px;font-weight:750;line-height:1.4}
.pills{display:flex;flex-wrap:wrap;gap:6px}
.pill{font-size:10px;font-weight:800;background:#e8f1fb;color:#1565C0;padding:3px 8px;border-radius:999px}
.pill.ok{background:#ecfdf5;color:#0f766e}
.go{font-size:12px;font-weight:800;color:var(--brand);white-space:nowrap;padding-top:6px}
.cta{display:block;margin-top:16px;text-align:center;background:linear-gradient(90deg,#1565C0,#8450CB);color:#fff;font-weight:800;padding:14px;border-radius:14px;text-decoration:none}
.bc{font-size:12px;color:var(--muted);margin:0 0 10px}
.bc a{font-weight:700;text-decoration:none}
footer{max-width:1120px;margin:0 auto;padding:0 16px 32px;color:var(--muted);font-size:12px;text-align:center}
`;
}

function shell(opts) {
  const { title, desc, url, extraSchema, body, hub } = opts;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": SITE + "/#org",
        name: "Quantrex Academy",
        url: SITE,
        logo: SITE + "/assets/quantrex-logo-3d-192.png"
      },
      extraSchema
    ].filter(Boolean)
  };
  const nav = ["jee", "neet", "nda", "bitsat"]
    .map((h) => `<a class="${h === hub ? "on" : ""}" href="/${h}">${esc(HUBS[h].label.split(" ")[0])}</a>`)
    .join("");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Quantrex Academy">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${SITE}/assets/quantrex-logo-3d-192.png">
  <meta name="theme-color" content="#1565C0">
  <link rel="icon" type="image/png" href="/assets/favicon-32x32.png">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <style>${css()}</style>
</head>
<body>
  <header class="top">
    <a class="brand" href="/">
      <img src="/assets/quantrex-logo-3d-64.png" alt="Quantrex Academy">
      <span>Quantrex Academy<small>PYQs with solutions · JEE · NEET · NDA</small></span>
    </a>
    <nav class="topnav">${nav}<a href="/search">Search</a><a href="/app.html">Open app</a></nav>
  </header>
  <form class="qx-qsearch" action="/search" method="get" style="max-width:1120px;margin:10px auto 0;padding:0 16px;display:flex;gap:8px">
    <input type="search" name="q" placeholder="Search a question like on Google…" style="flex:1;padding:10px 12px;border:1px solid #d4e3f4;border-radius:12px;font:inherit;font-weight:650">
    <button type="submit" style="background:#1565C0;color:#fff;border:0;border-radius:12px;padding:10px 14px;font-weight:800">Search</button>
  </form>
  ${body}
  <footer>© Quantrex Academy · Free previous year questions with answers and solutions. Practice the same questions in the Quantrex app.</footer>
  <script>
  (function(){
    var i=document.getElementById('qfind');
    if(!i) return;
    i.addEventListener('input', function(){
      var v=this.value.toLowerCase();
      document.querySelectorAll('.qrow').forEach(function(el){
        el.hidden = !!(v && el.textContent.toLowerCase().indexOf(v)===-1);
      });
    });
  })();
  </script>
</body>
</html>`;
}

function qRows(items, start) {
  return (items || [])
    .map((it, i) => {
      const href = `/q/${encodeURIComponent(it.id)}/${encodeURIComponent(it.slug || "question")}`;
      return `<a class="qrow" href="${esc(href)}">
        <span class="num">${start + i + 1}</span>
        <span>
          <h3>${esc(polishQuestionText(it.t))}</h3>
          <span class="pills">
            ${it.exam ? `<span class="pill">${esc(it.exam)}</span>` : ""}
            ${it.year ? `<span class="pill">${esc(it.year)}</span>` : ""}
            <span class="pill ok">Solution</span>
          </span>
        </span>
        <span class="go">View →</span>
      </a>`;
    })
    .join("");
}

function sideSubjects(hub, subjects, on) {
  const links = Object.keys(subjects || {})
    .sort((a, b) => (subjects[b].count || 0) - (subjects[a].count || 0))
    .map((sk) => {
      const s = subjects[sk];
      return `<a class="${sk === on ? "on" : ""}" href="/${hub}/${sk}"><span>${esc(s.label)}</span><b>${fmt(s.count)}</b></a>`;
    })
    .join("");
  return `<aside class="side"><h2>Subjects</h2>${links}<a href="/app.html">Practice in app</a></aside>`;
}

function renderHome(tree) {
  const cards = ["jee", "neet", "nda", "bitsat", "other"]
    .filter((h) => tree[h] && tree[h].count)
    .map((h) => {
      const n = tree[h];
      const href = h === "other" ? "/questions" : "/" + h;
      const subs = Object.values(n.subjects || {})
        .map((s) => s.label)
        .slice(0, 4)
        .join(" · ");
      return `<a class="tile" href="${href}"><h3>${esc(n.label)}</h3><p>${fmt(n.count)} questions</p><p>${esc(subs)}</p></a>`;
    })
    .join("");
  const total = Object.values(tree).reduce((a, n) => a + (n.count || 0), 0);
  const featured = [];
  ["jee", "neet"].forEach((h) => {
    Object.values((tree[h] && tree[h].subjects) || {}).forEach((s) => {
      (s.featured || []).slice(0, 4).forEach((x) => featured.push(x));
    });
  });
  const url = SITE + "/questions";
  const body = `
  <section class="hero">
    <p class="bc"><a href="/">Home</a> · Question bank</p>
    <h1>Previous year questions with solutions</h1>
    <p>Quantrex Academy public PYQ list — JEE Main, JEE Advanced, NEET, NDA and BITSAT. Every question has its own page, answer and solution. More complete and easier to browse than a plain Q&amp;A dump.</p>
    <div class="stats"><span class="stat">${fmt(total)} questions</span><span class="stat">Answers + solutions</span><span class="stat">Chapter-wise</span></div>
  </section>
  <div class="wrap" style="grid-template-columns:1fr">
    <div>
      <div class="grid">${cards}</div>
      <div class="list" style="margin-top:16px">
        <input class="find" id="qfind" type="search" placeholder="Search these questions">
        ${qRows(featured.slice(0, 24), 0)}
      </div>
      <a class="cta" href="/app.html">Open Quantrex Academy app — timed tests, DPP, books</a>
    </div>
  </div>`;
  return shell({
    title: "JEE, NEET, NDA, BITSAT Previous Year Questions with Solutions | Quantrex Academy",
    desc: "Free chapter-wise JEE Main, JEE Advanced, NEET, NDA and BITSAT previous year questions with answers and step-by-step solutions on Quantrex Academy.",
    url,
    hub: "",
    extraSchema: {
      "@type": "CollectionPage",
      name: "Quantrex Academy previous year questions",
      url,
      isPartOf: { "@id": SITE + "/#org" }
    },
    body
  });
}

function jeeSeoCopy() {
  return `<section class="card" style="margin-top:18px;background:#fff;border:1px solid #d4e3f4;border-radius:18px;padding:18px">
    <h2 style="margin:0 0 8px;font-size:1.15rem">JEE Main previous year questions</h2>
    <p>Practice official JEE Main PYQs chapter-wise — Physics, Chemistry and JEE Mathematics. Each question page shows the paper year, exam date, Morning Shift or Evening Shift when the source has it, Easy/Medium/Hard as stored, and whether it is an Actual paper question.</p>
    <h2 style="margin:16px 0 8px;font-size:1.15rem">JEE Advanced &amp; IIT-JEE</h2>
    <p>JEE Advanced previous year questions with solutions sit on the same list. Use <a href="/jee/mathematics">JEE Mathematics PYQs</a> for IIT-JEE Maths practice, then attempt a timed paper in the <a href="/jee-mock-test">JEE mock test</a> area of the app.</p>
    <h2 style="margin:16px 0 8px;font-size:1.15rem">Mock tests, DPP and 2027 prep</h2>
    <p>JEE Main 2027 is expected in two sessions (January and April, as NTA usually schedules). Until NTA publishes official dates, use <a href="/jee-dpp">daily DPP</a>, chapter PYQs and full <a href="/jee-mock-test">JEE mock tests</a> on Quantrex Academy — same login on website and Google Play.</p>
    <h3 style="margin:16px 0 8px;font-size:1rem">FAQs</h3>
    <p><strong>Where are JEE Main shift-wise PYQs?</strong> Open a question — the chips show year, date and Morning/Evening Shift when the paper label has them.</p>
    <p><strong>Is JEE Maths separate?</strong> Yes — <a href="/jee/mathematics">/jee/mathematics</a> is the JEE Mathematics hub.</p>
  </section>`;
}

function renderHub(tree, hub) {
  const node = tree[hub] || { label: HUBS[hub] && HUBS[hub].label, count: 0, subjects: {} };
  const meta = HUBS[hub] || { label: node.label, blurb: "" };
  const subjects = node.subjects || {};
  const tileKeys = Object.keys(subjects)
    .sort((a, b) => subjects[b].count - subjects[a].count)
    .filter((sk) => subjects[sk].count >= 150 || /physics|chemistry|math|botany|zoology|biology|english|ability/i.test(sk));
  const tiles = (tileKeys.length ? tileKeys : Object.keys(subjects))
    .map((sk) => {
      const s = subjects[sk];
      const chN = Object.keys(s.chapters || {}).length;
      return `<a class="tile" href="/${hub}/${sk}"><h3>${esc(s.label)}</h3><p>${fmt(s.count)} questions · ${chN} chapters</p></a>`;
    })
    .join("");
  const featured = [];
  Object.values(subjects).forEach((s) => (s.featured || []).forEach((x) => featured.push(x)));
  const url = `${SITE}/${hub}`;
  const body = `
  <section class="hero">
    <p class="bc"><a href="/">Home</a> · <a href="/questions">Questions</a> · ${esc(meta.label)}</p>
    <h1>${hub === "jee" ? "JEE Main &amp; JEE Advanced previous year questions with solutions (IIT-JEE PYQs)" : esc(meta.label) + " previous year questions with solutions"}</h1>
    <p>${esc(meta.blurb)}</p>
    <div class="stats"><span class="stat">${fmt(node.count)} questions</span><span class="stat">${Object.keys(subjects).length} subjects</span><span class="stat">Free solutions</span></div>
    ${hub === "jee" ? `<p class="more-links" style="margin:12px 0 0;font-size:13px;font-weight:700">
      <a href="/jee/mathematics">JEE Mathematics PYQs</a> ·
      <a href="/jee-mock-test">JEE mock tests</a> ·
      <a href="/jee-dpp">JEE DPP</a> ·
      <a href="/jee-main-2027">JEE Main 2027</a> ·
      <a href="/app.html">Practice in app</a>
    </p>` : ""}
  </section>
  <div class="wrap">
    ${sideSubjects(hub, subjects, "")}
    <div>
      <div class="grid">${tiles}</div>
      <div class="list" style="margin-top:16px">
        <input class="find" id="qfind" type="search" placeholder="Search questions on this page">
        ${qRows(featured.slice(0, 36), 0)}
      </div>
      <a class="cta" href="/app.html">Practice ${esc(meta.label)} in the Quantrex app →</a>
      ${hub === "jee" ? jeeSeoCopy() : ""}
    </div>
  </div>`;
  const itemList = {
    "@type": "ItemList",
    name: meta.label + " PYQs",
    numberOfItems: featured.length,
    itemListElement: featured.slice(0, 30).map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/q/${it.id}/${it.slug}`,
      name: it.t
    }))
  };
  return shell({
    title: hub === "jee"
      ? "JEE Main & JEE Advanced PYQs with Solutions | IIT-JEE Mathematics, Mock Tests | Quantrex Academy"
      : `${meta.label} Previous Year Questions with Solutions | Quantrex Academy`,
    desc: hub === "jee"
      ? `Free JEE Main and JEE Advanced previous year questions with answers and solutions. Chapter-wise IIT-JEE Physics, Chemistry and Mathematics, actual shift papers, mock tests and DPP on Quantrex Academy. ${fmt(node.count)} questions.`
      : `${meta.blurb} ${fmt(node.count)} questions. Free on Quantrex Academy.`,
    url,
    hub,
    extraSchema: itemList,
    body
  });
}

function renderSubject(tree, hub, subject, pack) {
  const node = (tree[hub] && tree[hub].subjects && tree[hub].subjects[subject]) || null;
  const label = (pack && pack.label) || (node && node.label) || subject;
  const chapters = (pack && pack.chapters) || (node && node.chapters) || {};
  const count = (pack && pack.count) || (node && node.count) || 0;
  const tiles = Object.keys(chapters)
    .sort((a, b) => (chapters[b].count || 0) - (chapters[a].count || 0))
    .map((ck) => {
      const c = chapters[ck];
      return `<a class="tile" href="/${hub}/${subject}/${ck}"><h3>${esc(niceChapter(c.label || ck))}</h3><p>${fmt(c.count)} PYQs</p></a>`;
    })
    .join("");
  let preview = [];
  Object.keys(chapters).forEach((ck) => {
    (chapters[ck].items || []).slice(0, 3).forEach((x) => preview.push(x));
  });
  preview = preview.slice(0, 40);
  const hubLabel = (HUBS[hub] && HUBS[hub].label) || hub.toUpperCase();
  const url = `${SITE}/${hub}/${subject}`;
  const subjects = (tree[hub] && tree[hub].subjects) || {};
  const body = `
  <section class="hero">
    <p class="bc"><a href="/">Home</a> · <a href="/${hub}">${esc(hubLabel)}</a> · ${esc(label)}</p>
    <h1>${esc(hubLabel)} ${esc(label)} PYQs with solutions</h1>
    <p>Chapter-wise ${esc(label)} previous year questions for ${esc(hubLabel)}. Open any question for options, correct answer and solution.</p>
    <div class="stats"><span class="stat">${fmt(count)} questions</span><span class="stat">${Object.keys(chapters).length} chapters</span></div>
  </section>
  <div class="wrap">
    ${sideSubjects(hub, subjects, subject)}
    <div>
      <div class="grid">${tiles}</div>
      <div class="list" style="margin-top:16px">
        <input class="find" id="qfind" type="search" placeholder="Search ${esc(label)} questions">
        ${qRows(preview, 0)}
      </div>
      <a class="cta" href="/app.html">Attempt a ${esc(label)} test on Quantrex →</a>
    </div>
  </div>`;
  return shell({
    title: `${hubLabel} ${label} Previous Year Questions with Solutions | Quantrex Academy`,
    desc: `Practice ${fmt(count)} ${hubLabel} ${label} previous year questions chapter-wise with answers and solutions on Quantrex Academy.`,
    url,
    hub,
    extraSchema: {
      "@type": "CollectionPage",
      name: `${hubLabel} ${label} PYQs`,
      url
    },
    body
  });
}

function renderChapter(tree, hub, subject, chapter, pack) {
  const ch = pack && pack.chapters && pack.chapters[chapter];
  if (!ch) return null;
  const subLabel = pack.label || subject;
  const items = (ch.items || []).slice(0, 120);
  const hubLabel = (HUBS[hub] && HUBS[hub].label) || hub.toUpperCase();
  const url = `${SITE}/${hub}/${subject}/${chapter}`;
  const subjects = (tree[hub] && tree[hub].subjects) || {};
  const itemList = {
    "@type": "ItemList",
    name: `${hubLabel} ${subLabel} — ${ch.label}`,
    numberOfItems: ch.count,
    itemListElement: items.slice(0, 40).map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/q/${it.id}/${it.slug}`,
      name: it.t
    }))
  };
  const body = `
  <section class="hero">
    <p class="bc"><a href="/">Home</a> · <a href="/${hub}">${esc(hubLabel)}</a> · <a href="/${hub}/${subject}">${esc(subLabel)}</a> · ${esc(ch.label)}</p>
    <h1>${esc(ch.label)} — ${esc(hubLabel)} ${esc(subLabel)} PYQs</h1>
    <p>${fmt(ch.count)} previous year questions from <strong>${esc(ch.label)}</strong> with answers and solutions. Numbered list, year tags, and one-tap solutions — built for serious JEE / NEET practice.</p>
    <div class="stats"><span class="stat">${fmt(ch.count)} questions</span><span class="stat">${esc(subLabel)}</span><span class="stat">Solutions on every page</span></div>
  </section>
  <div class="wrap">
    ${sideSubjects(hub, subjects, subject)}
    <div>
      <div class="list">
        <input class="find" id="qfind" type="search" placeholder="Search in ${esc(ch.label)}">
        ${qRows(items, 0)}
      </div>
      <a class="cta" href="/app.html">Practice all ${esc(ch.label)} questions in the app →</a>
    </div>
  </div>`;
  return shell({
    title: `${ch.label} ${hubLabel} ${subLabel} PYQs with Solutions | Quantrex Academy`,
    desc: `${fmt(ch.count)} ${hubLabel} ${subLabel} previous year questions from ${ch.label}, with answers and step-by-step solutions on Quantrex Academy.`,
    url,
    hub,
    extraSchema: itemList,
    body
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  const tree = (await readJson(req, "data/seo/tree.json")) || {};
  const { hub, subject, chapter } = parse(req);
  const pack = hub && subject ? await readJson(req, "data/seo/lists/" + hub + "__" + subject + ".json") : null;

  let html = "";
  if (!hub) html = renderHome(tree);
  else if (chapter && subject) {
    html = renderChapter(tree, hub, subject, chapter, pack);
    if (!html) {
      res.statusCode = 404;
      return res.end(renderHub(tree, hub));
    }
  } else if (subject) html = renderSubject(tree, hub, subject, pack);
  else html = renderHub(tree, hub);

  res.statusCode = 200;
  return res.end(html);
};
