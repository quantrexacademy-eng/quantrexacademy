/**
 * Public PYQ listing (Sarthaks-style, Quantrex branded).
 * /jee  /jee/:subject  /jee/:subject/:chapter
 * /neet /nda /bitsat /questions
 * qxmd315: SEO wrapper only — unique titles/descriptions, factual chapter intros from list data,
 * breadcrumbs + JSON-LD, related chapters, /topic/* 301 mapping, longer CDN cache.
 * Question text shown in lists is unchanged (polishQuestionText + qRows as before).
 */
const fs = require("fs");
const path = require("path");
const { ORG, WEBSITE, breadcrumb, clip, socialMeta } = require("./seo-org");

const SITE = "https://www.quantrexacademy.com";
const HUBS = {
  jee: {
    label: "JEE Main & Advanced",
    short: "JEE",
    blurb: "Free JEE Main and JEE Advanced previous year questions with solutions — chapter-wise Physics, Chemistry and Mathematics. Includes actual morning and evening shift papers, JEE Maths practice, and links to mock tests and DPP in the Quantrex app."
  },
  neet: { label: "NEET UG", short: "NEET", blurb: "NEET, AIIMS and NTA Abhyas previous year questions with solutions — Physics, Chemistry and Biology." },
  nda: { label: "NDA", short: "NDA", blurb: "NDA Mathematics and GAT previous year questions with answers and solutions." },
  bitsat: { label: "BITSAT", short: "BITSAT", blurb: "BITSAT previous year questions with solutions — Physics, Chemistry, Mathematics, English and Logical Reasoning." },
  other: { label: "Other exams", short: "Other exams", blurb: "MHT CET, WBJEE, KCET, COMEDK, VITEEE, KVPY and more — previous year questions on Quantrex Academy." }
};
const CACHE_LIST = "public, max-age=600, s-maxage=86400, stale-while-revalidate=604800";
const THIN_CHAPTER = 5;

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
.intro{max-width:1120px;margin:0 auto;padding:0 16px}
.card2{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px 18px;margin:14px 0;box-shadow:0 8px 22px rgba(15,40,80,.05)}
.card2 h2{margin:0 0 8px;font-size:1.05rem}
.card2 p{margin:0 0 6px;color:#24364f}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0;padding:0;list-style:none}
.chips li,.chips a{font-size:12px;font-weight:750;background:#e8f1fb;color:#0b2a5b;padding:5px 10px;border-radius:999px;text-decoration:none}
.chips a:hover{background:#d7e8fa}
.lh{margin:0;padding:12px 14px;font-size:1rem;border-bottom:1px solid var(--line)}
`;
}

function shell(opts) {
  const { title, desc, url, extraSchema, body, hub, crumbs, robots, website } = opts;
  const extra = Array.isArray(extraSchema) ? extraSchema : [extraSchema];
  const schema = {
    "@context": "https://schema.org",
    "@graph": [ORG, website ? WEBSITE : null, crumbs && crumbs.length > 1 ? breadcrumb(crumbs) : null].concat(extra).filter(Boolean)
  };
  const nav = ["jee", "neet", "nda", "bitsat"]
    .map((h) => `<a class="${h === hub ? "on" : ""}" href="/${h}">${esc(HUBS[h].label.split(" ")[0])}</a>`)
    .join("") + `<a href="/maths">Maths</a>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="${esc(robots || "index,follow,max-snippet:-1,max-image-preview:large")}">
  <link rel="canonical" href="${esc(url)}">
  ${socialMeta({ title, desc, url, type: "website" })}
  <meta name="google-site-verification" content="pemTmZW6o6YInk0dhVyPgIz7R4v4mWvKhIb1AdI9Alw">
  <meta name="theme-color" content="#1565C0">
  <link rel="icon" type="image/png" href="/assets/favicon-32x32.png">
  <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>
  <style>${css()}</style>
</head>
<body>
  <header class="top">
    <a class="brand" href="/">
      <img src="/assets/quantrex-logo-3d-64.png" alt="Quantrex Academy" width="40" height="40">
      <span>Quantrex Academy<small>PYQs with solutions · JEE · NEET · NDA</small></span>
    </a>
    <nav class="topnav">${nav}<a href="/search">Search</a><a href="/app.html">Open app</a></nav>
  </header>
  <form class="qx-qsearch" action="/search" method="get" role="search" style="max-width:1120px;margin:10px auto 0;padding:0 16px;display:flex;gap:8px">
    <input type="search" name="q" aria-label="Search previous year questions" placeholder="Search a question like on Google…" style="flex:1;padding:10px 12px;border:1px solid #d4e3f4;border-radius:12px;font:inherit;font-weight:650">
    <button type="submit" style="background:#1565C0;color:#fff;border:0;border-radius:12px;padding:10px 14px;font-weight:800">Search</button>
  </form>
  ${body}
  <footer>© Quantrex Academy · Concept Create Destiny · Free previous year questions with answers and solutions. Practice the same questions in the Quantrex app. · <a href="https://www.youtube.com/@quantrex-iitjee" rel="noopener">YouTube</a> · <a href="https://wa.me/918700508344" rel="noopener">WhatsApp +91 87005 08344</a></footer>
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

function bcHtml(crumbs) {
  return `<p class="bc">${crumbs
    .map((c, i) => (i < crumbs.length - 1 && c.url ? `<a href="${esc(c.url.replace(SITE, "") || "/")}">${esc(c.name)}</a>` : esc(c.name)))
    .join(" · ")}</p>`;
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

/* ---------- qxmd315 factual helpers (counts only from list/tree data) ---------- */
function hubShort(hub) {
  return (HUBS[hub] && HUBS[hub].short) || String(hub || "").toUpperCase();
}
function hubLabelOf(hub) {
  return (HUBS[hub] && HUBS[hub].label) || String(hub || "").toUpperCase();
}
function joinAnd(arr) {
  const a = arr.filter(Boolean);
  if (a.length <= 1) return a.join("");
  return a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
}
function listStats(items) {
  const exams = Object.create(null);
  const years = Object.create(null);
  (items || []).forEach((it) => {
    const e = String(it.exam || "").trim();
    if (e) exams[e] = (exams[e] || 0) + 1;
    const y = String(it.year || "").trim();
    if (/^(19|20)\d\d$/.test(y)) years[y] = (years[y] || 0) + 1;
  });
  const examList = Object.keys(exams).sort((a, b) => exams[b] - exams[a]).map((e) => ({ name: e, n: exams[e] }));
  const yearKeys = Object.keys(years).sort();
  return { examList, years, yearKeys, yMin: yearKeys[0] || "", yMax: yearKeys[yearKeys.length - 1] || "" };
}
/** Subjects of a hub that contain this chapter slug, largest first. */
function chapterHomes(tree, hub, chapter) {
  const subs = (tree[hub] && tree[hub].subjects) || {};
  return Object.keys(subs)
    .filter((sk) => subs[sk].chapters && subs[sk].chapters[chapter])
    .map((sk) => ({ sk, count: subs[sk].chapters[chapter].count || 0, label: subs[sk].label || sk }))
    .sort((a, b) => b.count - a.count);
}
function relatedChapterLinks(tree, hub, subject, chapter, limit) {
  const node = tree[hub] && tree[hub].subjects && tree[hub].subjects[subject];
  const chs = (node && node.chapters) || {};
  return Object.keys(chs)
    .filter((ck) => ck !== chapter && (chs[ck].count || 0) >= THIN_CHAPTER)
    .sort((a, b) => (chs[b].count || 0) - (chs[a].count || 0))
    .slice(0, limit || 12)
    .map((ck) => `<a href="/${hub}/${subject}/${ck}">${esc(niceChapter(chs[ck].label || ck))} (${fmt(chs[ck].count)})</a>`);
}
function crossHubLinks(tree, hub, chapter) {
  const out = [];
  ["jee", "neet", "nda", "bitsat"].forEach((h) => {
    if (h === hub) return;
    const homes = chapterHomes(tree, h, chapter).filter((x) => x.count >= THIN_CHAPTER);
    if (homes.length) {
      const top = homes[0];
      const ch = tree[h].subjects[top.sk].chapters[chapter];
      out.push(`<a href="/${h}/${top.sk}/${chapter}">${esc(hubShort(h))} ${esc(niceChapter(ch.label || chapter))} (${fmt(top.count)})</a>`);
    }
  });
  return out;
}
function popularChapters(tree, hub, limit) {
  const subs = (tree[hub] && tree[hub].subjects) || {};
  const all = [];
  Object.keys(subs).forEach((sk) => {
    const chs = subs[sk].chapters || {};
    Object.keys(chs).forEach((ck) => all.push({ sk, ck, label: chs[ck].label || ck, count: chs[ck].count || 0, sub: subs[sk].label || sk }));
  });
  return all.sort((a, b) => b.count - a.count).slice(0, limit || 12);
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
  const crumbs = [{ name: "Home", url: SITE + "/" }, { name: "Question bank", url }];
  const body = `
  <section class="hero">
    ${bcHtml(crumbs)}
    <h1>Previous year questions with solutions</h1>
    <p>Quantrex Academy public PYQ list — JEE Main, JEE Advanced, NEET, NDA and BITSAT. Every question has its own page, answer and solution. More complete and easier to browse than a plain Q&amp;A dump.</p>
    <div class="stats"><span class="stat">${fmt(total)} questions</span><span class="stat">Answers + solutions</span><span class="stat">Chapter-wise</span></div>
  </section>
  <div class="wrap" style="grid-template-columns:1fr">
    <div>
      <h2 class="lh" style="border:0;padding:0 0 10px">Choose your exam</h2>
      <div class="grid">${cards}</div>
      <div class="list" style="margin-top:16px">
        <h2 class="lh">Featured questions</h2>
        <input class="find" id="qfind" type="search" placeholder="Search these questions" aria-label="Filter questions on this page">
        ${qRows(featured.slice(0, 24), 0)}
      </div>
      <a class="cta" href="/app.html">Open Quantrex Academy app — timed tests, DPP, books</a>
    </div>
  </div>`;
  return shell({
    title: "JEE, NEET, NDA, BITSAT Previous Year Questions with Solutions | Quantrex Academy",
    desc: `Free chapter-wise JEE Main, JEE Advanced, NEET, NDA and BITSAT previous year questions with answers and solutions. ${fmt(total)} questions on Quantrex Academy.`,
    url,
    hub: "",
    crumbs,
    website: true,
    extraSchema: {
      "@type": "CollectionPage",
      name: "Quantrex Academy previous year questions",
      url,
      isPartOf: { "@id": SITE + "/#website" },
      publisher: { "@id": SITE + "/#org" }
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
    <p><strong>Is JEE Maths separate?</strong> Yes — <a href="/maths">/maths</a> and <a href="/jee/mathematics">/jee/mathematics</a> list JEE Mathematics previous year questions with solutions.</p>
  </section>`;
}

function renderHub(tree, hub) {
  const node = tree[hub] || { label: HUBS[hub] && HUBS[hub].label, count: 0, subjects: {} };
  const meta = HUBS[hub] || { label: node.label, blurb: "" };
  const short = hubShort(hub);
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
  const pop = popularChapters(tree, hub, 16);
  const chTotal = Object.values(subjects).reduce((a, s) => a + Object.keys(s.chapters || {}).length, 0);
  const url = `${SITE}/${hub}`;
  const crumbs = [{ name: "Home", url: SITE + "/" }, { name: `${short} PYQs`, url }];
  const subjNames = joinAnd(Object.keys(subjects).sort((a, b) => subjects[b].count - subjects[a].count).slice(0, 4).map((sk) => subjects[sk].label));
  const body = `
  <section class="hero">
    ${bcHtml(crumbs)}
    <h1>${hub === "jee" ? "JEE Main &amp; JEE Advanced previous year questions with solutions (IIT-JEE PYQs)" : esc(meta.label) + " previous year questions with solutions"}</h1>
    <p>${esc(meta.blurb)}</p>
    <div class="stats"><span class="stat">${fmt(node.count)} questions</span><span class="stat">${Object.keys(subjects).length} subjects</span><span class="stat">${fmt(chTotal)} chapters</span><span class="stat">Free solutions</span></div>
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
      <h2 class="lh" style="border:0;padding:0 0 10px">${esc(short)} subjects</h2>
      <div class="grid">${tiles}</div>
      ${pop.length ? `<section class="card2"><h2>Popular ${esc(short)} chapters</h2><p>Chapters with the most previous year questions in the ${esc(meta.label)} bank (${esc(subjNames)}).</p><div class="chips">${pop.map((c) => `<a href="/${hub}/${c.sk}/${c.ck}">${esc(niceChapter(c.label))} · ${esc(c.sub)} (${fmt(c.count)})</a>`).join("")}</div></section>` : ""}
      <div class="list" style="margin-top:16px">
        <h2 class="lh">Featured ${esc(short)} questions</h2>
        <input class="find" id="qfind" type="search" placeholder="Search questions on this page" aria-label="Filter questions on this page">
        ${qRows(featured.slice(0, 36), 0)}
      </div>
      <a class="cta" href="/app.html">Practice ${esc(meta.label)} in the Quantrex app →</a>
      ${hub === "jee" ? jeeSeoCopy() : ""}
    </div>
  </div>`;
  const itemList = {
    "@type": "ItemList",
    name: `${short} chapter-wise PYQs`,
    numberOfItems: pop.length,
    itemListElement: pop.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/${hub}/${c.sk}/${c.ck}`,
      name: `${short} ${niceChapter(c.label)} PYQs`
    }))
  };
  const title = hub === "jee"
    ? "JEE Main & Advanced PYQ - Chapter-wise Questions with Solutions | Quantrex Academy"
    : `${short} PYQ - Chapter-wise Previous Year Questions with Solutions | Quantrex Academy`;
  const desc = hub === "jee"
    ? `${fmt(node.count)} free JEE Main and JEE Advanced previous year questions, chapter-wise for Physics, Chemistry and Mathematics, with answers and solutions. Shift-wise papers, mock tests and DPP on Quantrex Academy.`
    : `${fmt(node.count)} free ${meta.label} previous year questions across ${fmt(chTotal)} chapters (${subjNames}) with answers and solutions on Quantrex Academy.`;
  return shell({
    title,
    desc: clip(desc, 300),
    url,
    hub,
    crumbs,
    extraSchema: [{ "@type": "CollectionPage", name: title, url, isPartOf: { "@id": SITE + "/#website" }, about: meta.label }, itemList],
    body
  });
}

function renderSubject(tree, hub, subject, pack) {
  const node = (tree[hub] && tree[hub].subjects && tree[hub].subjects[subject]) || null;
  const label = (pack && pack.label) || (node && node.label) || subject;
  const chapters = (pack && pack.chapters) || (node && node.chapters) || {};
  const count = (pack && pack.count) || (node && node.count) || 0;
  const short = hubShort(hub);
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
  const hubLabel = hubLabelOf(hub);
  const url = `${SITE}/${hub}/${subject}`;
  const subjects = (tree[hub] && tree[hub].subjects) || {};
  const top = Object.keys(chapters).sort((a, b) => (chapters[b].count || 0) - (chapters[a].count || 0)).slice(0, 3)
    .map((ck) => `${niceChapter(chapters[ck].label || ck)} (${fmt(chapters[ck].count)})`);
  const chN = Object.keys(chapters).length;
  const crumbs = [{ name: "Home", url: SITE + "/" }, { name: `${short} PYQs`, url: `${SITE}/${hub}` }, { name: label, url }];
  const body = `
  <section class="hero">
    ${bcHtml(crumbs)}
    <h1>${esc(hubLabel)} ${esc(label)} PYQs with solutions</h1>
    <p>Chapter-wise ${esc(label)} previous year questions for ${esc(hubLabel)}: ${fmt(count)} questions in ${chN} chapters${top.length ? `. Largest chapters: ${esc(joinAnd(top))}` : ""}. Open any question for options, correct answer and solution.</p>
    <div class="stats"><span class="stat">${fmt(count)} questions</span><span class="stat">${chN} chapters</span></div>
    ${/math/i.test(subject + label) ? `<p style="margin:12px 0 0;font-size:13px;font-weight:700"><a href="/jee/mathematics">JEE Mathematics PYQs</a> · <a href="/maths/pyq">Year-wise Maths PYQs</a></p>` : ""}
  </section>
  <div class="wrap">
    ${sideSubjects(hub, subjects, subject)}
    <div>
      <h2 class="lh" style="border:0;padding:0 0 10px">${esc(short)} ${esc(label)} chapters</h2>
      <div class="grid">${tiles}</div>
      <div class="list" style="margin-top:16px">
        <h2 class="lh">Sample ${esc(label)} questions</h2>
        <input class="find" id="qfind" type="search" placeholder="Search ${esc(label)} questions" aria-label="Filter questions on this page">
        ${qRows(preview, 0)}
      </div>
      <a class="cta" href="/app.html">Attempt a ${esc(label)} test on Quantrex →</a>
    </div>
  </div>`;
  const title = `${short} ${label} PYQ - Chapter-wise Questions with Solutions | Quantrex Academy`;
  return shell({
    title,
    desc: clip(`${fmt(count)} ${hubLabel} ${label} previous year questions in ${chN} chapters${top.length ? `, including ${joinAnd(top.map((t) => t.replace(/ \(\S+\)$/, "")))}` : ""}. Answers and solutions, free on Quantrex Academy.`, 300),
    url,
    hub,
    crumbs,
    robots: count ? "" : "noindex,follow",
    extraSchema: {
      "@type": "CollectionPage",
      name: title,
      url,
      isPartOf: { "@id": SITE + "/#website" },
      hasPart: Object.keys(chapters).slice(0, 60).map((ck) => ({ "@type": "CollectionPage", name: niceChapter(chapters[ck].label || ck), url: `${SITE}/${hub}/${subject}/${ck}` }))
    },
    body
  });
}

function renderChapter(tree, hub, subject, chapter, pack) {
  const ch = pack && pack.chapters && pack.chapters[chapter];
  if (!ch) return null;
  const subLabel = pack.label || subject;
  const items = (ch.items || []).slice(0, /math/i.test(subject + subLabel) ? 200 : 120);
  const hubLabel = hubLabelOf(hub);
  const short = hubShort(hub);
  const chLabel = niceChapter(ch.label || chapter);
  const url = `${SITE}/${hub}/${subject}/${chapter}`;
  const subjects = (tree[hub] && tree[hub].subjects) || {};
  const st = listStats(ch.items || []);
  const homes = chapterHomes(tree, hub, chapter);
  const dupe = homes.length > 1 && homes[0].sk !== subject;
  const examTop = st.examList.slice(0, 3).map((e) => `${e.name} (${fmt(e.n)})`);
  const moreExams = st.examList.length > 3 ? `${st.examList.length - 3} other source${st.examList.length - 3 > 1 ? "s" : ""}` : "";
  const shown = (ch.items || []).length;
  const yearSpan = st.yMin ? (st.yMin === st.yMax ? `from ${st.yMin}` : `from ${st.yMin} to ${st.yMax}`) : "";
  const yearsRecent = st.yearKeys.slice().reverse().slice(0, 12);
  const related = relatedChapterLinks(tree, hub, subject, chapter, 12);
  const cross = crossHubLinks(tree, hub, chapter);
  const itemList = {
    "@type": "ItemList",
    name: `${short} ${chLabel} PYQs`,
    numberOfItems: ch.count,
    itemListElement: items.slice(0, 40).map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/q/${it.id}/${it.slug}`,
      name: clip(it.t, 110)
    }))
  };
  const crumbs = [
    { name: "Home", url: SITE + "/" },
    { name: `${short} PYQs`, url: `${SITE}/${hub}` },
    { name: subLabel, url: `${SITE}/${hub}/${subject}` },
    { name: chLabel, url }
  ];
  const intro = `<section class="card2">
        <h2>About ${esc(chLabel)} PYQs</h2>
        <p>${esc(chLabel)} has <strong>${fmt(ch.count)}</strong> previous year questions in the Quantrex Academy ${esc(hubLabel)} ${esc(subLabel)} bank.${shown ? ` The ${fmt(shown)} questions in this list come from ${esc(joinAnd(examTop.concat(moreExams ? [moreExams] : [])))}${yearSpan ? `, spanning ${esc(yearSpan.replace(/^from /, ""))}` : ""}.` : ""} Each question opens on its own page with the options, the correct answer and the worked solution where available.</p>
        ${yearsRecent.length ? `<h2 style="margin-top:12px">Questions by year (this list)</h2><ul class="chips">${yearsRecent.map((y) => `<li>${esc(y)}: ${fmt(st.years[y])}</li>`).join("")}</ul>` : ""}
      </section>`;
  const body = `
  <section class="hero">
    ${bcHtml(crumbs)}
    <h1>${esc(short)} ${esc(chLabel)} PYQs with Solutions</h1>
    <p>${fmt(ch.count)} previous year questions from <strong>${esc(chLabel)}</strong> (${esc(hubLabel)} ${esc(subLabel)}) with answers and solutions. Numbered list, year tags, and one-tap solutions — built for serious JEE / NEET practice.</p>
    <div class="stats"><span class="stat">${fmt(ch.count)} questions</span><span class="stat">${esc(subLabel)}</span>${st.yMin ? `<span class="stat">${esc(st.yMin === st.yMax ? st.yMin : st.yMin + "–" + st.yMax)}</span>` : ""}<span class="stat">Answers + solutions</span></div>
  </section>
  <div class="wrap">
    ${sideSubjects(hub, subjects, subject)}
    <div>
      ${intro}
      <div class="list">
        <h2 class="lh">${esc(chLabel)} questions with solutions</h2>
        <input class="find" id="qfind" type="search" placeholder="Search in ${esc(ch.label)}" aria-label="Filter questions in this chapter">
        ${qRows(items, 0)}
      </div>
      <a class="cta" href="/app.html">Practice all ${esc(ch.label)} questions in the app →</a>
      ${dupe ? `<section class="card2"><h2>Main ${esc(chLabel)} list</h2><p>The larger ${esc(short)} ${esc(chLabel)} list is under <a href="/${hub}/${homes[0].sk}/${chapter}">${esc(homes[0].label)} (${fmt(homes[0].count)} questions)</a>.</p></section>` : ""}
      ${related.length ? `<section class="card2"><h2>Related ${esc(short)} ${esc(subLabel)} chapters</h2><div class="chips">${related.join("")}</div></section>` : ""}
      ${cross.length ? `<section class="card2"><h2>${esc(chLabel)} in other exams</h2><div class="chips">${cross.join("")}</div></section>` : ""}
    </div>
  </div>`;
  const title = `${short} PYQ ${chLabel}${dupe ? ` (${subLabel})` : ""} - Chapter-wise Questions with Solutions | Quantrex Academy`;
  const desc = `${fmt(ch.count)} ${short} ${chLabel} previous year questions${examTop.length ? ` from ${joinAnd(st.examList.slice(0, 3).map((e) => e.name))}` : ""}${yearSpan ? ` (${st.yMin === st.yMax ? st.yMin : st.yMin + "–" + st.yMax})` : ""} with answers and step-by-step solutions. Free chapter-wise ${subLabel} practice on Quantrex Academy.`;
  return shell({
    title,
    desc: clip(desc, 300),
    url,
    hub,
    crumbs,
    robots: (ch.count || 0) < THIN_CHAPTER ? "noindex,follow" : "",
    extraSchema: [{ "@type": "CollectionPage", name: title, url, isPartOf: { "@id": SITE + "/#website" }, about: `${hubLabel} ${subLabel} ${chLabel}` }, itemList],
    body
  });
}

/* /topic/<exam>-<subject>-<chapter> (legacy URLs seen in Search Console) → real listing URL. */
const TOPIC_PREFIX = [
  ["jee-advanced-", "jee"], ["jee-main-", "jee"], ["iit-jee-", "jee"], ["jee-", "jee"],
  ["neet-ug-", "neet"], ["neet-", "neet"], ["aiims-", "neet"], ["jipmer-", "neet"],
  ["nda-", "nda"], ["bitsat-", "bitsat"]
];
function resolveTopic(tree, slugRaw) {
  const slug = String(slugRaw || "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  let hub = "";
  let rest = slug;
  for (const [p, h] of TOPIC_PREFIX) {
    if (slug.indexOf(p) === 0) { hub = h; rest = slug.slice(p.length); break; }
  }
  if (!hub) {
    if (/neet|aiims|biology|botany|zoology/.test(slug)) hub = "neet";
    else if (/nda/.test(slug)) hub = "nda";
    else if (/bitsat/.test(slug)) hub = "bitsat";
    else hub = "jee";
  }
  const subs = (tree[hub] && tree[hub].subjects) || {};
  let sk = Object.keys(subs).sort((a, b) => b.length - a.length).find((k) => rest === k || rest.indexOf(k + "-") === 0) || "";
  if (!sk && /^(biology|bio)-/.test(rest) && hub === "neet") sk = "biology";
  const chapter = sk ? rest.slice(sk.length + 1) : rest;
  if (chapter) {
    const homes = chapterHomes(tree, hub, chapter);
    const own = homes.find((x) => x.sk === sk && x.count >= 20);
    const pick = own || homes[0];
    if (pick) return `/${hub}/${pick.sk}/${chapter}`;
    for (const h of ["jee", "neet", "nda", "bitsat"]) {
      const hh = chapterHomes(tree, h, chapter)[0];
      if (hh) return `/${h}/${hh.sk}/${chapter}`;
    }
  }
  if (!sk) {
    let best = null;
    Object.keys(subs).forEach((k) => {
      Object.keys(subs[k].chapters || {}).forEach((ck) => {
        if ((rest === ck || rest.endsWith("-" + ck)) && (!best || ck.length > best.ck.length || (ck.length === best.ck.length && subs[k].chapters[ck].count > best.n))) {
          best = { k, ck, n: subs[k].chapters[ck].count || 0 };
        }
      });
    });
    if (best) return `/${hub}/${best.k}/${best.ck}`;
  }
  if (sk && subs[sk]) return `/${hub}/${sk}`;
  return `/${hub}`;
}

function redirect(res, loc) {
  res.statusCode = 301;
  res.setHeader("Location", loc);
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=604800");
  return res.end();
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", CACHE_LIST);
  const tree = (await readJson(req, "data/seo/tree.json")) || {};
  const rawPath = (() => {
    try { return decodeURIComponent(String(req.url || "").split("?")[0]); } catch (_) { return String(req.url || "").split("?")[0]; }
  })();
  const tm = rawPath.match(/^\/topic\/([^/]+)/i);
  if (tm) return redirect(res, resolveTopic(tree, tm[1]));
  if (/^\/(jee|neet|nda|bitsat)(\/|$)/i.test(rawPath) && (/[A-Z]/.test(rawPath) || /.\/$/.test(rawPath))) {
    return redirect(res, rawPath.toLowerCase().replace(/\/+$/, ""));
  }
  const { hub, subject, chapter } = parse(req);
  const hubSubs = (tree[hub] && tree[hub].subjects) || {};
  const pack = hub && subject ? await readJson(req, "data/seo/lists/" + hub + "__" + subject + ".json") : null;

  let html = "";
  if (!hub) html = renderHome(tree);
  else if (chapter && subject) {
    html = renderChapter(tree, hub, subject, chapter, pack);
    if (!html) {
      const homes = chapterHomes(tree, hub, chapter);
      if (homes.length) return redirect(res, `/${hub}/${homes[0].sk}/${chapter}`);
      if (pack || hubSubs[subject]) return redirect(res, `/${hub}/${subject}`);
      return redirect(res, `/${hub}`);
    }
  } else if (subject) {
    if (!pack && !hubSubs[subject]) return redirect(res, `/${hub}`);
    html = renderSubject(tree, hub, subject, pack);
  } else html = renderHub(tree, hub);

  res.statusCode = 200;
  return res.end(html);
};
