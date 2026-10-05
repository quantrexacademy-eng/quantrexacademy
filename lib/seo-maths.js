/**
 * Public Maths hubs: /maths and /maths/pyq/:year are PYQ-only (Google).
 * Formula cards and revision notes stay in the app — chapter/topic URLs 301 to JEE PYQ lists.
 */
"use strict";

const SITE = "https://www.quantrexacademy.com";
const GSC = "pemTmZW6o6YInk0dhVyPgIz7R4v4mWvKhIb1AdI9Alw";

let INDEX = null;
function loadIndex() {
  if (INDEX) return INDEX;
  try {
    INDEX = require("./seo-maths-index.json");
  } catch (_) {
    INDEX = { chapters: [], pyqExtra: [], years: [], totals: {} };
  }
  return INDEX;
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmt(n) {
  return (Number(n) || 0).toLocaleString("en-IN");
}

function parseMaths(req) {
  const raw = decodeURIComponent(String(req.url || "").split("?")[0]);
  const m = raw.match(/^\/maths(?:\/([^/]+))?(?:\/([^/]+))?\/?$/i);
  if (!m) return { kind: "hub" };
  const a = m[1] || "";
  const b = m[2] || "";
  if (!a) return { kind: "hub" };
  if (a === "pyq" && !b) return { kind: "years" };
  if (a === "pyq" && b) return { kind: "year", year: b };
  if (a && b) return { kind: "topic", chapter: a, topic: b };
  return { kind: "chapter", chapter: a };
}

function findChapter(idx, slug) {
  return (idx.chapters || []).find((c) => c.slug === slug) || null;
}

function findTopic(ch, slug) {
  return ((ch && ch.topics) || []).find((t) => t.slug === slug) || null;
}

function css() {
  return `
:root{--bg:#eef4fb;--card:#fff;--ink:#0b1b33;--muted:#5b6b82;--brand:#1565C0;--line:#d4e3f4;--ok:#0f766e}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.55}
a{color:var(--brand)}
.top{background:linear-gradient(125deg,#071526 0%,#0b2a5b 42%,#1565C0 78%,#8450CB 100%);color:#fff;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:#fff;font-weight:800}
.brand img{width:40px;height:40px;border-radius:10px;background:#071526}
.brand small{display:block;font-size:11px;font-weight:650;opacity:.85;letter-spacing:.04em}
.topnav{display:flex;gap:8px;flex-wrap:wrap}
.topnav a{color:#fff;text-decoration:none;font-size:12px;font-weight:800;background:rgba(255,255,255,.12);padding:7px 12px;border-radius:999px}
.topnav a.on{background:#fff;color:#0b2a5b}
.hero{max-width:1120px;margin:0 auto;padding:22px 16px 8px}
.hero h1{font-size:clamp(1.35rem,3.6vw,2.05rem);line-height:1.25;margin:0 0 8px}
.hero p{margin:0 0 8px;color:var(--muted);max-width:760px}
.stats{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 0}
.stat{background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:12px;font-weight:800;color:#0b2a5b}
.wrap{max-width:1120px;margin:0 auto;padding:8px 16px 56px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px;text-decoration:none;color:inherit;display:block;box-shadow:0 8px 22px rgba(15,40,80,.05)}
.tile:hover{border-color:#9ec0e8;transform:translateY(-1px)}
.tile h3{margin:0 0 4px;font-size:15px}
.tile p{margin:0;font-size:12px;color:var(--muted);font-weight:700}
.tile img.thumb{width:100%;height:88px;object-fit:cover;border-radius:10px;margin:0 0 8px;background:#f4f8fd}
.list{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 10px 28px rgba(15,40,80,.06);margin-top:16px}
.qrow{display:grid;grid-template-columns:42px 1fr auto;gap:10px;align-items:start;padding:14px;border-top:1px solid #eef3f9;text-decoration:none;color:inherit}
.qrow:first-child{border-top:0}.qrow:hover{background:#f7fbff}
.num{width:32px;height:32px;border-radius:10px;background:#e8f1fb;color:#1565C0;font-weight:800;display:grid;place-items:center;font-size:12px}
.qrow h3{margin:0 0 6px;font-size:15px;font-weight:750;line-height:1.4}
.pills{display:flex;flex-wrap:wrap;gap:6px}
.pill{font-size:10px;font-weight:800;background:#e8f1fb;color:#1565C0;padding:3px 8px;border-radius:999px}
.pill.ok{background:#ecfdf5;color:#0f766e}
.go{font-size:12px;font-weight:800;color:var(--brand);white-space:nowrap;padding-top:6px}
.cta{display:block;margin-top:16px;text-align:center;background:linear-gradient(90deg,#1565C0,#8450CB);color:#fff;font-weight:800;padding:14px;border-radius:14px;text-decoration:none}
.bc{font-size:12px;color:var(--muted);margin:0 0 10px}
.bc a{font-weight:700;text-decoration:none}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin:16px 0}
.cards figure{margin:0;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden}
.cards img{width:100%;height:auto;display:block;background:#fff}
.cards figcaption{font-size:12px;font-weight:700;padding:8px 10px;color:var(--muted)}
.sidebox{background:#fff;border:1px solid var(--line);border-radius:16px;padding:14px;margin-top:16px}
.sidebox h2,.block h2{margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.sidebox a{display:block;padding:7px 0;font-weight:750;text-decoration:none;color:var(--ink);border-top:1px solid #eef3f9}
.sidebox a:first-of-type{border-top:0}
.sidebox a:hover{color:var(--brand)}
.block{margin-top:22px}
footer{max-width:1120px;margin:0 auto;padding:0 16px 32px;color:var(--muted);font-size:12px;text-align:center}
`;
}

function shell(opts) {
  const { title, desc, url, extraSchema, body } = opts;
  const extras = Array.isArray(extraSchema)
    ? extraSchema
    : extraSchema && extraSchema["@graph"]
      ? extraSchema["@graph"]
      : extraSchema
        ? [extraSchema]
        : [];
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": SITE + "/#org",
        name: "Quantrex Academy",
        url: SITE,
        logo: SITE + "/assets/quantrex-logo-3d-192.png"
      }
    ].concat(extras.filter(Boolean))
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
  <meta name="google-site-verification" content="${GSC}">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Quantrex Academy">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${SITE}/assets/quantrex-logo-3d-192.png">
  <meta name="theme-color" content="#1565C0">
  <link rel="icon" type="image/png" href="/assets/favicon-32x32.png">
  <link rel="search" type="application/opensearchdescription+xml" title="Quantrex PYQ" href="${SITE}/opensearch.xml">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <style>${css()}</style>
</head>
<body>
  <header class="top">
    <a class="brand" href="/">
      <img src="/assets/quantrex-logo-3d-64.png" alt="Quantrex Academy">
      <span>Quantrex Academy<small>JEE Maths PYQs with solutions</small></span>
    </a>
    <nav class="topnav">
      <a class="on" href="/maths">Maths</a>
      <a href="/jee">JEE</a>
      <a href="/neet">NEET</a>
      <a href="/nda">NDA</a>
      <a href="/search">Search</a>
      <a href="/app.html">Open app</a>
    </nav>
  </header>
  <form class="qx-qsearch" action="/search" method="get" style="max-width:1120px;margin:10px auto 0;padding:0 16px;display:flex;gap:8px">
    <input type="search" name="q" placeholder="Paste a Maths PYQ to open the solution page" style="flex:1;padding:10px 12px;border:1px solid #d4e3f4;border-radius:12px;font:inherit;font-weight:650">
    <button type="submit" style="background:#1565C0;color:#fff;border:0;border-radius:12px;padding:10px 14px;font-weight:800">Search</button>
  </form>
  ${body}
  <footer>© Quantrex Academy · JEE Mathematics previous year questions with solutions. Rankings are decided by Google; these pages are crawlable, unique and submitted in the sitemap.</footer>
</body>
</html>`;
}

function qRows(items) {
  return (items || [])
    .map((it, i) => {
      const href = "/q/" + encodeURIComponent(it.id) + "/" + encodeURIComponent(it.slug || "question");
      return `<a class="qrow" href="${esc(href)}">
        <span class="num">${i + 1}</span>
        <span>
          <h3>${esc(it.t)}</h3>
          <span class="pills">
            ${it.exam ? `<span class="pill">${esc(it.exam)}</span>` : ""}
            ${it.year ? `<span class="pill">${esc(it.year)}</span>` : ""}
            ${it.chapter ? `<span class="pill">${esc(it.chapter)}</span>` : ""}
            <span class="pill ok">Solution</span>
          </span>
        </span>
        <span class="go">View →</span>
      </a>`;
    })
    .join("");
}

function cardGrid(cards, chapter, topic) {
  return (cards || [])
    .map((c) => {
      const alt = [chapter, topic, "formula card", c.n].filter(Boolean).join(" — ");
      return `<figure>
        <img src="${esc(c.src)}" alt="${esc(alt)}" loading="lazy" decoding="async" width="480" height="270">
        <figcaption>${esc(topic || chapter)} · card ${esc(c.n)}</figcaption>
      </figure>`;
    })
    .join("");
}

function relatedChapters(idx, current, n) {
  return (idx.chapters || [])
    .filter((c) => c.slug !== current)
    .slice(0, n || 8)
    .map((c) => `<a href="/jee/mathematics/${esc(c.pyqSlug || c.slug)}">${esc(c.name)} <small>(${fmt(c.pyqCount || 0)} PYQs)</small></a>`)
    .join("");
}

function jeeChapterPath(ch) {
  const slug = ch && (ch.pyqSlug || ch.slug);
  return slug ? "/jee/mathematics/" + slug : "/jee/mathematics";
}

function renderHub(idx) {
  const t = idx.totals || {};
  const tiles = (idx.chapters || [])
    .map((c) => {
      return `<a class="tile" href="${esc(jeeChapterPath(c))}">
        <h3>${esc(c.name)}</h3>
        <p>${c.pyqCount ? fmt(c.pyqCount) + " JEE Maths PYQs with solutions" : "JEE Mathematics previous year questions"}</p>
      </a>`;
    })
    .join("");
  const extra = (idx.pyqExtra || [])
    .map((x) => `<a class="tile" href="/jee/mathematics/${esc(x.slug)}"><h3>${esc(x.label)}</h3><p>${fmt(x.count)} JEE Maths PYQs</p></a>`)
    .join("");
  const yearPills = (idx.years || [])
    .map((y) => `<a class="stat" href="/maths/pyq/${esc(y.year)}">${esc(y.year)} · ${fmt(y.count)}</a>`)
    .join("");
  const url = SITE + "/maths";
  const body = `
  <section class="hero">
    <p class="bc"><a href="/">Home</a> · <a href="/jee">JEE PYQs</a> · JEE Mathematics</p>
    <h1>JEE Mathematics previous year questions with solutions</h1>
    <p>${fmt(t.chapters)} chapters linked to ${fmt(t.jeePyq)} JEE Mathematics previous year questions with options, answers and step-by-step solutions on Quantrex Academy.</p>
    <div class="stats">
      <span class="stat">${fmt(t.chapters)} chapters</span>
      <span class="stat">${fmt(t.jeePyq)} JEE Maths PYQs</span>
      <span class="stat">${fmt((idx.years || []).length)} years</span>
    </div>
    <p style="margin-top:12px;font-size:13px;font-weight:700">
      <a href="/jee/mathematics">All JEE Maths PYQs</a> ·
      <a href="/nda/mathematics">NDA Maths PYQs</a> ·
      <a href="/bitsat/mathematics">BITSAT Maths PYQs</a> ·
      <a href="/maths/pyq">Year-wise Maths PYQs</a> ·
      <a href="/iit-jee-mathematics">IIT-JEE Mathematics</a>
    </p>
  </section>
  <div class="wrap">
    <div class="grid">${tiles}</div>
    ${extra ? `<div class="block"><h2>More JEE Maths chapters (PYQ lists)</h2><div class="grid">${extra}</div></div>` : ""}
    <div class="block">
      <h2>JEE Maths by year</h2>
      <div class="stats">${yearPills}</div>
    </div>
    <a class="cta" href="/app.html">Practice JEE Maths in the Quantrex app →</a>
    <section class="sidebox">
      <h2>How these pages help</h2>
      <p style="margin:0;color:var(--muted);font-size:14px">Each chapter opens the official JEE Mathematics PYQ list. Solutions stay on unique <a href="/jee/mathematics">/q/</a> pages — this hub does not invent worked examples.</p>
    </section>
  </div>`;
  return shell({
    title: "JEE Mathematics PYQs with Solutions | Quantrex Academy",
    desc: `Free JEE Main and JEE Advanced Mathematics previous year questions with solutions. ${fmt(t.chapters)} chapters, ${fmt(t.jeePyq)} PYQs on Quantrex Academy.`,
    url,
    extraSchema: {
      "@type": "CollectionPage",
      name: "JEE Mathematics PYQs",
      url,
      isPartOf: { "@id": SITE + "/#org" },
      about: "JEE Main and JEE Advanced Mathematics",
      numberOfItems: t.chapters
    },
    body
  });
}

function renderChapter(idx, ch) {
  const url = SITE + "/maths/" + ch.slug;
  const topicTiles = (ch.topics || [])
    .map((tp) => {
      const preview = tp.preview || (tp.cards[0] && tp.cards[0].src) || "";
      return `<a class="tile" href="/maths/${esc(ch.slug)}/${esc(tp.slug)}">
        ${preview ? `<img class="thumb" src="${esc(preview)}" alt="${esc(ch.name)} — ${esc(tp.title)}" loading="lazy" decoding="async">` : ""}
        <h3>${esc(tp.title)}</h3>
        <p>${fmt(tp.cards.length || tp.count)} formula cards</p>
      </a>`;
    })
    .join("");
  const pyqLinks = [];
  if (ch.pyqSlug) pyqLinks.push(`<a href="/jee/mathematics/${esc(ch.pyqSlug)}">JEE ${esc(ch.pyqLabel || ch.name)} PYQs (${fmt(ch.pyqCount)})</a>`);
  if (ch.ndaSlug) pyqLinks.push(`<a href="/nda/mathematics/${esc(ch.ndaSlug)}">NDA ${esc(ch.name)} PYQs (${fmt(ch.ndaCount)})</a>`);
  if (ch.bitsatSlug) pyqLinks.push(`<a href="/bitsat/mathematics/${esc(ch.bitsatSlug)}">BITSAT ${esc(ch.name)} PYQs (${fmt(ch.bitsatCount)})</a>`);
  const crumbs = [
    { "@type": "ListItem", position: 1, name: "Quantrex Academy", item: SITE + "/" },
    { "@type": "ListItem", position: 2, name: "JEE Mathematics", item: SITE + "/maths" },
    { "@type": "ListItem", position: 3, name: ch.name, item: url }
  ];
  const body = `
  <section class="hero">
    <p class="bc"><a href="/">Home</a> · <a href="/maths">JEE Maths</a> · ${esc(ch.name)}</p>
    <h1>${esc(ch.name)} — JEE Maths formulas and PYQs</h1>
    <p>${fmt(ch.count)} official revision formula cards across ${(ch.topics || []).length} topics in <strong>${esc(ch.name)}</strong>.${ch.pyqCount ? " Linked to " + fmt(ch.pyqCount) + " JEE Mathematics previous year questions with solutions." : ""} ${ch.importance ? "Chapter weight in the bank: " + esc(ch.importance) + "." : ""}</p>
    <div class="stats">
      <span class="stat">${fmt(ch.count)} cards</span>
      <span class="stat">${(ch.topics || []).length} topics</span>
      ${ch.pyqCount ? `<span class="stat">${fmt(ch.pyqCount)} JEE PYQs</span>` : ""}
    </div>
  </section>
  <div class="wrap">
    <div class="grid">${topicTiles}</div>
    ${ch.pyq && ch.pyq.length ? `<div class="list">${qRows(ch.pyq)}</div>` : ""}
    <div class="sidebox"><h2>Practice the same chapter</h2>${pyqLinks.join("") || `<a href="/jee/mathematics">JEE Mathematics PYQs</a>`}<a href="/app.html">Open ${esc(ch.name)} in the Quantrex app</a></div>
    <div class="sidebox"><h2>Related Maths chapters</h2>${relatedChapters(idx, ch.slug, 10)}</div>
    <a class="cta" href="/app.html">Practice ${esc(ch.name)} on Quantrex Academy →</a>
  </div>`;
  return shell({
    title: `${ch.name} Formulas and JEE Maths PYQs with Solutions | Quantrex Academy`,
    desc: `${ch.name} JEE Mathematics: ${fmt(ch.count)} official formula cards, ${(ch.topics || []).length} topics${ch.pyqCount ? ", " + fmt(ch.pyqCount) + " previous year questions" : ""} with solutions on Quantrex Academy.`,
    url,
    extraSchema: {
      "@type": "BreadcrumbList",
      itemListElement: crumbs
    },
    body
  });
}

function renderTopic(idx, ch, tp) {
  const url = SITE + "/maths/" + ch.slug + "/" + tp.slug;
  const siblings = (ch.topics || [])
    .filter((x) => x.slug !== tp.slug)
    .map((x) => `<a href="/maths/${esc(ch.slug)}/${esc(x.slug)}">${esc(x.title)}</a>`)
    .join("");
  const crumbs = [
    { "@type": "ListItem", position: 1, name: "Quantrex Academy", item: SITE + "/" },
    { "@type": "ListItem", position: 2, name: "JEE Mathematics", item: SITE + "/maths" },
    { "@type": "ListItem", position: 3, name: ch.name, item: SITE + "/maths/" + ch.slug },
    { "@type": "ListItem", position: 4, name: tp.title, item: url }
  ];
  const itemList = {
    "@type": "ItemList",
    name: tp.title + " formula cards",
    numberOfItems: (tp.cards || []).length,
    itemListElement: (tp.cards || []).slice(0, 20).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: url,
      name: ch.name + " — " + tp.title + " card " + c.n
    }))
  };
  const body = `
  <section class="hero">
    <p class="bc"><a href="/">Home</a> · <a href="/maths">JEE Maths</a> · <a href="/maths/${esc(ch.slug)}">${esc(ch.name)}</a> · ${esc(tp.title)}</p>
    <h1>${esc(tp.title)} — ${esc(ch.name)} formulas and PYQs</h1>
    <p><strong>${esc(tp.title)}</strong> is a topic in ${esc(ch.name)} for JEE Main and JEE Advanced Mathematics. Below are the official revision formula cards for this topic (${fmt((tp.cards || []).length)} cards), plus previous-year questions from ${esc(ch.name)} on Quantrex Academy.</p>
    <div class="stats">
      <span class="stat">${fmt((tp.cards || []).length)} formula cards</span>
      <span class="stat">${esc(ch.name)}</span>
      ${ch.pyqCount ? `<span class="stat">${fmt(ch.pyqCount)} chapter PYQs</span>` : ""}
    </div>
  </section>
  <div class="wrap">
    <div class="cards">${cardGrid(tp.cards, ch.name, tp.title) || "<p>Open this chapter in the Quantrex app for extra practice.</p>"}</div>
    ${ch.pyq && ch.pyq.length ? `<div class="block"><h2>${esc(ch.name)} previous year questions</h2><div class="list">${qRows(ch.pyq)}</div></div>` : ""}
    <div class="sidebox"><h2>Other topics in ${esc(ch.name)}</h2>${siblings}<a href="/maths/${esc(ch.slug)}">All ${esc(ch.name)} topics</a></div>
    ${ch.pyqSlug ? `<div class="sidebox"><h2>Full PYQ list</h2><a href="/jee/mathematics/${esc(ch.pyqSlug)}">JEE ${esc(ch.name)} PYQs</a>${ch.ndaSlug ? `<a href="/nda/mathematics/${esc(ch.ndaSlug)}">NDA ${esc(ch.name)}</a>` : ""}${ch.bitsatSlug ? `<a href="/bitsat/mathematics/${esc(ch.bitsatSlug)}">BITSAT ${esc(ch.name)}</a>` : ""}</div>` : ""}
    <div class="sidebox"><h2>Related chapters</h2>${relatedChapters(idx, ch.slug, 8)}</div>
    <a class="cta" href="/app.html">Practice ${esc(tp.title)} in the Quantrex app →</a>
  </div>`;
  return shell({
    title: `${tp.title} — ${ch.name} JEE Maths Formulas and PYQs | Quantrex Academy`,
    desc: `${tp.title} in ${ch.name}: ${fmt((tp.cards || []).length)} official JEE Mathematics formula cards and previous year questions with solutions on Quantrex Academy.`,
    url,
    extraSchema: [
      { "@type": "BreadcrumbList", itemListElement: crumbs },
      itemList,
      {
        "@type": "LearningResource",
        name: tp.title + " — " + ch.name,
        url,
        learningResourceType: "Formula sheet",
        educationalUse: "study",
        isAccessibleForFree: true,
        inLanguage: "en",
        about: "JEE Mathematics " + ch.name
      }
    ],
    body
  });
}

function renderYears(idx) {
  const url = SITE + "/maths/pyq";
  const tiles = (idx.years || [])
    .map((y) => `<a class="tile" href="/maths/pyq/${esc(y.year)}"><h3>JEE Maths ${esc(y.year)}</h3><p>${fmt(y.count)} previous year questions</p></a>`)
    .join("");
  const body = `
  <section class="hero">
    <p class="bc"><a href="/">Home</a> · <a href="/maths">JEE Maths</a> · Year-wise PYQs</p>
    <h1>JEE Mathematics previous year questions by year</h1>
    <p>Year clusters from the Quantrex JEE Mathematics bank. Each year page lists featured questions with solutions; the full chapter lists stay on <a href="/jee/mathematics">/jee/mathematics</a>.</p>
  </section>
  <div class="wrap"><div class="grid">${tiles}</div>
  <a class="cta" href="/jee/mathematics">Open the full JEE Maths PYQ list →</a></div>`;
  return shell({
    title: "JEE Mathematics PYQs by Year with Solutions | Quantrex Academy",
    desc: "JEE Main and JEE Advanced Mathematics previous year questions grouped by year, with answers and solutions on Quantrex Academy.",
    url,
    extraSchema: { "@type": "CollectionPage", name: "JEE Maths PYQs by year", url },
    body
  });
}

function renderYear(idx, year) {
  const y = (idx.years || []).find((x) => String(x.year) === String(year));
  if (!y) return null;
  const url = SITE + "/maths/pyq/" + y.year;
  const body = `
  <section class="hero">
    <p class="bc"><a href="/">Home</a> · <a href="/maths">JEE Maths</a> · <a href="/maths/pyq">Year-wise</a> · ${esc(y.year)}</p>
    <h1>JEE Mathematics ${esc(y.year)} previous year questions with solutions</h1>
    <p>${fmt(y.count)} JEE Mathematics questions from ${esc(y.year)} in the Quantrex bank. Featured questions below open unique solution pages. Browse by chapter on <a href="/jee/mathematics">JEE Mathematics</a>.</p>
    <div class="stats"><span class="stat">${fmt(y.count)} questions</span><span class="stat">${esc(y.year)}</span></div>
  </section>
  <div class="wrap">
    <div class="list">${qRows(y.items)}</div>
    <div class="sidebox"><h2>Other years</h2>${(idx.years || []).filter((x) => x.year !== y.year).slice(-12).map((x) => `<a href="/maths/pyq/${esc(x.year)}">${esc(x.year)} · ${fmt(x.count)}</a>`).join("")}</div>
    <a class="cta" href="/jee/mathematics">All JEE Maths chapters →</a>
  </div>`;
  return shell({
    title: `JEE Mathematics ${y.year} PYQs with Solutions | Quantrex Academy`,
    desc: `${fmt(y.count)} JEE Main and JEE Advanced Mathematics previous year questions from ${y.year}, with answers and solutions on Quantrex Academy.`,
    url,
    extraSchema: { "@type": "CollectionPage", name: "JEE Maths " + y.year, url, numberOfItems: y.count },
    body
  });
}

function notFound() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Maths page not found | Quantrex Academy</title><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui;padding:24px;max-width:640px;margin:auto">
<h1>Maths page not found</h1>
<p><a href="/maths">JEE Mathematics hub</a> · <a href="/jee/mathematics">JEE Maths PYQs</a> · <a href="/app.html">Open app</a></p>
</body></html>`;
}

module.exports = async function handler(req, res) {
  const idx = loadIndex();
  const p = parseMaths(req);
  if (p.kind === "chapter" || p.kind === "topic") {
    const ch = findChapter(idx, p.chapter);
    const loc = SITE + jeeChapterPath(ch);
    res.statusCode = 301;
    res.setHeader("Location", loc);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("X-Robots-Tag", "noindex, follow");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Moved</title><meta name="robots" content="noindex,follow"><link rel="canonical" href="${esc(loc)}"><meta http-equiv="refresh" content="0;url=${esc(loc)}"></head><body><p>This page moved to <a href="${esc(loc)}">${esc(loc)}</a>.</p></body></html>`);
  }
  let html = "";
  if (p.kind === "hub") html = renderHub(idx);
  else if (p.kind === "years") html = renderYears(idx);
  else if (p.kind === "year") html = renderYear(idx, p.year);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=120, s-maxage=300, stale-while-revalidate=3600");
  if (!html) {
    res.statusCode = 404;
    return res.end(notFound());
  }
  res.statusCode = 200;
  return res.end(html);
};
