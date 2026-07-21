/**
 * SEO topic hub page — all indexed questions for an exam/subject/chapter.
 * GET ?slug=jee-main-mathematics-...
 */
const fs = require("fs");
const path = require("path");

const SITE = "https://www.quantrexacademy.com";
let _index = null;

function load() {
  if (_index) return _index;
  try {
    _index = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "seo", "q-index.json"), "utf8"));
  } catch (e) {
    _index = [];
  }
  return _index;
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function topicSlug(e) {
  return [e.bank, e.subject, e.chapter]
    .join("-")
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url || "/", SITE);
  let slug = url.searchParams.get("slug") || (req.query && req.query.slug) || "";
  if (!slug && req.url) {
    const m = String(req.url).match(/\/topic\/([^/?#]+)/);
    if (m) slug = decodeURIComponent(m[1]);
  }

  const all = load();
  const items = all.filter((e) => topicSlug(e) === slug).slice(0, 80);
  const meta = items[0];

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");

  if (!meta) {
    res.statusCode = 404;
    return res.end(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Topic not found</title><meta name="robots" content="noindex"></head><body style="font-family:system-ui;padding:24px"><h1>Topic not found</h1><p><a href="/">Home</a></p></body></html>`);
  }

  const title = `${meta.exam} ${meta.subject} — ${meta.chapter} PYQs with Solutions | Quantrex Academy`;
  const desc = `Practice ${meta.exam} ${meta.subject} chapter ${meta.chapter} previous year questions with answers and step-by-step solutions. Free on Quantrex Academy.`;
  const pageUrl = `${SITE}/topic/${slug}`;

  const faqEntities = items.slice(0, 20).map((e) => ({
    "@type": "Question",
    name: e.text.slice(0, 200),
    acceptedAnswer: {
      "@type": "Answer",
      text: e.solution
        ? e.solution.slice(0, 500)
        : e.answer != null
          ? `Answer option index: ${e.answer}`
          : "Practice this question on Quantrex Academy."
    }
  }));

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqEntities
  };

  const list = items
    .map(
      (e, i) => `<li style="margin:12px 0">
      <a href="/q/${esc(e.slug)}" style="color:#0f766e;font-weight:600;text-decoration:none">${i + 1}. ${esc(e.text.slice(0, 160))}…</a>
      <div style="font-size:12px;color:#64748b;margin-top:4px">${esc(e.source || e.year || "")}${e.hasSolution ? " · Solution available" : ""}</div>
    </li>`
    )
    .join("\n");

  res.statusCode = 200;
  return res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${esc(pageUrl)}">
  <meta name="robots" content="index,follow">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(pageUrl)}">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <style>
    body{margin:0;font-family:Inter,system-ui,sans-serif;background:#f8fafc;color:#0f172a;line-height:1.55}
    header{background:linear-gradient(135deg,#0f766e,#0d9488);color:#fff;padding:14px 16px;font-weight:800}
    header a{color:#fff;text-decoration:none}
    main{max-width:800px;margin:0 auto;padding:16px 14px 48px}
    h1{font-size:clamp(1.2rem,4vw,1.6rem)}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px}
    .cta{display:inline-block;margin-top:16px;background:#0d9488;color:#fff;padding:12px 18px;border-radius:12px;font-weight:800;text-decoration:none}
  </style>
</head>
<body>
  <header><a href="/">Quantrex Academy</a></header>
  <main>
    <p style="color:#64748b;font-size:13px">${esc(meta.exam)} · ${esc(meta.subject)}</p>
    <h1>${esc(meta.chapter)} — Previous Year Questions & Solutions</h1>
    <p>${esc(desc)}</p>
    <div class="card">
      <ol style="padding-left:1.2rem;margin:0">${list}</ol>
    </div>
    <a class="cta" href="/app.html">Practice interactively in the app →</a>
  </main>
</body>
</html>`);
};
