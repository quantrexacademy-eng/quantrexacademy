/**
 * Server-rendered SEO question page for Google crawlers.
 * GET /api/seo-q?slug=...  OR  used via rewrite /q/:slug
 */
const fs = require("fs");
const path = require("path");

const SITE = "https://www.quantrexacademy.com";
let _index = null;
let _bySlug = null;

function loadIndex() {
  if (_bySlug) return _bySlug;
  try {
    const fp = path.join(process.cwd(), "data", "seo", "q-index.json");
    _index = JSON.parse(fs.readFileSync(fp, "utf8"));
    _bySlug = new Map(_index.map((e) => [e.slug, e]));
  } catch (e) {
    _index = [];
    _bySlug = new Map();
  }
  return _bySlug;
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function optionLetter(i) {
  return String.fromCharCode(65 + i);
}

function renderHtml(entry) {
  const titleBase = entry.text.slice(0, 90).replace(/\s+/g, " ");
  const title = `${entry.exam} ${entry.subject}${entry.year ? " " + entry.year : ""}: ${titleBase}… | Quantrex Academy`;
  const desc = `${entry.exam} ${entry.subject} · ${entry.chapter}${entry.year ? " · " + entry.year : ""}. Full question, options & step-by-step solution. Practice free on Quantrex Academy.`;
  const url = `${SITE}/q/${entry.slug}`;
  const optsHtml = (entry.options || [])
    .map((o, i) => `<li><strong>${optionLetter(i)}.</strong> ${esc(o)}</li>`)
    .join("");
  const ans =
    entry.answer != null && entry.options && entry.options[entry.answer] != null
      ? `${optionLetter(entry.answer)}. ${entry.options[entry.answer]}`
      : entry.answer != null
        ? String(entry.answer)
        : "";
  const solHtml = entry.solution
    ? `<section class="sol"><h2>Step-by-step solution</h2><p>${esc(entry.solution)}</p></section>`
    : `<section class="sol"><h2>Solution</h2><p>Open in the Quantrex app for interactive practice. Jovi AI can also generate a detailed board-style solution.</p></section>`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: entry.text.slice(0, 300),
      text: entry.text,
      answerCount: entry.hasSolution || ans ? 1 : 0,
      dateCreated: entry.year ? `${entry.year}-01-01` : undefined,
      author: { "@type": "Organization", name: "Quantrex Academy" },
      acceptedAnswer: ans || entry.solution
        ? {
            "@type": "Answer",
            text: [ans && `Correct answer: ${ans}`, entry.solution].filter(Boolean).join("\n\n"),
            author: { "@type": "Organization", name: "Quantrex Academy" }
          }
        : undefined,
      educationalLevel: entry.exam,
      about: {
        "@type": "Thing",
        name: `${entry.subject} — ${entry.chapter}`
      }
    }
  };

  // Clean undefined fields
  if (!schema.mainEntity.acceptedAnswer) delete schema.mainEntity.acceptedAnswer;
  if (!schema.mainEntity.dateCreated) delete schema.mainEntity.dateCreated;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="index,follow,max-snippet:-1,max-image-preview:large">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:site_name" content="Quantrex Academy">
  <meta name="twitter:card" content="summary">
  <meta name="theme-color" content="#0D9488">
  <link rel="icon" type="image/png" href="/assets/favicon-32x32.png">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <style>
    :root { --bg:#f8fafc; --card:#fff; --text:#0f172a; --muted:#64748b; --brand:#0d9488; --border:#e2e8f0; }
    *{box-sizing:border-box} body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.6}
    header{background:linear-gradient(135deg,#0f766e,#0d9488);color:#fff;padding:14px 16px}
    header a{color:#fff;text-decoration:none;font-weight:800}
    main{max-width:760px;margin:0 auto;padding:16px 14px 48px}
    .badge{display:inline-block;background:#ccfbf1;color:#0f766e;font-size:11px;font-weight:800;padding:4px 10px;border-radius:999px;margin:4px 4px 0 0}
    h1{font-size:clamp(1.15rem,4vw,1.45rem);line-height:1.35;margin:12px 0}
    .qbox,.sol,.opts{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;margin:14px 0}
    .opts ol{margin:0;padding-left:1.2rem}
    .opts li{margin:8px 0}
    .ans{background:#ecfdf5;border-color:#86efac}
    .cta{display:block;text-align:center;background:#0d9488;color:#fff;font-weight:800;padding:14px;border-radius:12px;text-decoration:none;margin-top:18px}
    footer{text-align:center;color:var(--muted);font-size:12px;padding:20px}
    @media(min-width:640px){main{padding:24px 20px 60px}}
  </style>
</head>
<body>
  <header><a href="/">Quantrex Academy</a> · Free ${esc(entry.exam)} PYQ solutions</header>
  <main>
    <div>
      <span class="badge">${esc(entry.exam)}</span>
      <span class="badge">${esc(entry.subject)}</span>
      <span class="badge">${esc(entry.chapter)}</span>
      ${entry.year ? `<span class="badge">${esc(entry.year)}</span>` : ""}
      ${entry.source ? `<span class="badge">${esc(entry.source)}</span>` : ""}
    </div>
    <h1>${esc(entry.exam)} ${esc(entry.subject)} Question${entry.year ? " (" + esc(entry.year) + ")" : ""} — Solution</h1>
    <article class="qbox">
      <h2 style="font-size:1rem;margin:0 0 10px;color:var(--muted)">Question</h2>
      <p style="margin:0;font-size:1.05rem;font-weight:500">${esc(entry.text)}</p>
    </article>
    ${optsHtml ? `<section class="opts"><h2 style="font-size:1rem;margin:0 0 8px">Options</h2><ol type="A">${optsHtml}</ol></section>` : ""}
    ${ans ? `<section class="opts ans"><h2 style="font-size:1rem;margin:0 0 8px">Answer</h2><p style="margin:0;font-weight:700">${esc(ans)}</p></section>` : ""}
    ${solHtml}
    <a class="cta" href="/app.html?exam=Engineering#question">Practice more on Quantrex App →</a>
    <p style="font-size:13px;color:var(--muted);margin-top:16px">Related: <a href="/topic/${esc(slugifyTopic(entry))}">${esc(entry.subject)} — ${esc(entry.chapter)}</a> · <a href="/app.html">All PYQ Banks</a></p>
  </main>
  <footer>© Quantrex Academy · JEE · NEET · NDA · BITSAT previous year questions with solutions</footer>
</body>
</html>`;
}

function slugifyTopic(entry) {
  return [entry.bank, entry.subject, entry.chapter]
    .join("-")
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function notFound() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Question not found | Quantrex</title><meta name="robots" content="noindex"></head>
<body style="font-family:system-ui;padding:24px;max-width:560px;margin:auto">
<h1>Question not found</h1>
<p>This PYQ page is not in the SEO index yet. Browse the full bank in the app.</p>
<p><a href="/app.html">Open Quantrex Academy</a></p>
</body></html>`;
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url || "/", "https://www.quantrexacademy.com");
  let slug = url.searchParams.get("slug") || "";
  // From rewrite path /q/:slug
  if (!slug && req.url) {
    const m = String(req.url).match(/\/q\/([^/?#]+)/);
    if (m) slug = decodeURIComponent(m[1]);
  }
  // Vercel may pass query only
  if (!slug && req.query && req.query.slug) slug = req.query.slug;

  const map = loadIndex();
  const entry = map.get(slug);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  if (!entry) {
    res.statusCode = 404;
    return res.end(notFound());
  }
  res.statusCode = 200;
  return res.end(renderHtml(entry));
};
