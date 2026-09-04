/**
 * Server-rendered question page (unique Google URL).
 * GET /q/:id/:slug  →  /api/seo-q?id=
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SITE = "https://www.quantrexacademy.com";
const ROOT = process.cwd();
const _shardCache = Object.create(null);
const _shardOrder = [];

function shardKey(id) {
  return crypto.createHash("md5").update(String(id)).digest("hex").slice(0, 2);
}

function rememberShard(key, obj) {
  _shardCache[key] = obj;
  const i = _shardOrder.indexOf(key);
  if (i >= 0) _shardOrder.splice(i, 1);
  _shardOrder.push(key);
  while (_shardOrder.length > 24) {
    const old = _shardOrder.shift();
    delete _shardCache[old];
  }
}

async function readJson(req, rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
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

async function loadRec(req, id) {
  const sid = String(id || "").trim();
  if (!sid) return null;
  const key = shardKey(sid);
  if (!_shardCache[key]) {
    rememberShard(key, (await readJson(req, "data/seo/shards/" + key + ".json")) || {});
  }
  return _shardCache[key][sid] || null;
}

async function loadRelated(req, rec) {
  const hub = hubOf(rec);
  const sk = slugify(rec.subject, 40);
  const ck = slugify(rec.chapter, 50);
  const pack = await readJson(req, "data/seo/lists/" + hub + "__" + sk + ".json");
  const items = (pack && pack.chapters && pack.chapters[ck] && pack.chapters[ck].items) || [];
  return items.filter((x) => String(x.id) !== String(rec.id)).slice(0, 8);
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function publicImg(u) {
  const s = String(u || "").trim();
  if (!s || /^data:/i.test(s) || /^javascript:/i.test(s)) return "";
  if (/quantrex-logo|favicon/i.test(s)) return s;
  // already proxied — ensure clean=1 for watermark wipe (no crop)
  if (/\/api\/(?:proxy|restore)-image/i.test(s)) {
    if (/clean=1/i.test(s)) return s;
    return s + (s.indexOf("?") >= 0 ? "&" : "?") + "clean=1";
  }
  if (/firebasestorage\.googleapis/i.test(s)) {
    return "/api/proxy-image?clean=1&url=" + encodeURIComponent(s);
  }
  if (/quantrexacademy\.com/i.test(s)) return s;
  if (/^https?:\/\//i.test(s) || s.indexOf("//") === 0) {
    return "/api/proxy-image?clean=1&url=" + encodeURIComponent(s);
  }
  return s;
}
}

function extractImgs(blob) {
  const s = String(blob || "");
  const urls = [];
  const seen = Object.create(null);
  function add(u) {
    const p = publicImg(u);
    if (!p || seen[p]) return;
    seen[p] = 1;
    urls.push(p);
  }
  const re = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(s))) add(m[1]);
  const re2 = /https?:\/\/[^\s"'<>]+?\.(?:png|jpe?g|webp|gif)(?:\?[^\s"'<>]*)?/gi;
  while ((m = re2.exec(s))) add(m[0]);
  return urls;
}

function optList(rec) {
  const o = rec && rec.options;
  if (!o) return [];
  if (Array.isArray(o)) return o.map((x) => (x == null ? "" : String(x)));
  if (typeof o === "string") {
    try {
      const p = JSON.parse(o);
      if (Array.isArray(p)) return p.map((x) => (x == null ? "" : String(x)));
    } catch (_) { /* */ }
    return [o];
  }
  return [];
}

function recBlob(rec) {
  return [rec && rec.text, rec && rec.t, rec && rec.sol, rec && rec.chapter, rec && rec.subject]
    .concat(optList(rec))
    .filter(Boolean)
    .join(" ");
}

function rich(s) {
  const raw = String(s == null ? "" : s);
  if (!raw) return "";
  if (!/<[a-z/]/i.test(raw)) return esc(raw);
  let h = raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  h = h.replace(/<img([^>]*?)src\s*=\s*(["'])([^"']+)\2([^>]*)>/gi, function (_, a, _q, src, b) {
    const p = publicImg(src);
    if (!p) return "";
    return "<img" + a + ' src="' + esc(p) + '" alt="Quantrex figure" loading="lazy" decoding="async"' + b + ">";
  });
  return h;
}

function letters(i) {
  return String.fromCharCode(65 + i);
}

function paperDetailPills(rec) {
  const src = String(rec.source || rec.paperSource || "");
  const pills = [];
  if (rec.exam) pills.push(rec.exam);
  if (rec.year) pills.push(String(rec.year));
  let date = "";
  let shift = "";
  let m = src.match(/\(?\s*(\d{1,2})(?:st|nd|rd|th)?[\s\-/]+([A-Za-z]{3,9})\.?(?:[\s\-/]+(\d{4}))?\s*[,\s]+Shift\s*[-–]?\s*([12])/i)
    || src.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?(?:\s+(\d{4}))?\s*(?:Online|Offline)?\s*Shift\s*[-–]?\s*([12])\b/i);
  if (m) {
    const mon = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
    date = [String(m[1]).replace(/^0/, ""), mon, m[3] || rec.year].filter(Boolean).join(" ");
    shift = m[4] === "1" ? "Morning Shift" : "Evening Shift";
  }
  if (!shift) {
    m = src.match(/\b(Morning|Evening)\s*Shift\b/i);
    if (m) shift = /morning/i.test(m[1]) ? "Morning Shift" : "Evening Shift";
    else {
      m = src.match(/\bShift\s*[-–]?\s*([12])\b/i);
      if (m) shift = m[1] === "1" ? "Morning Shift" : "Evening Shift";
    }
  }
  if (date) pills.push(date);
  if (shift) pills.push(shift);
  if (rec.subject) pills.push(rec.subject);
  if (rec.chapter) pills.push(rec.chapter);
  const blob = (src + " " + String(rec.bank || "")).toLowerCase();
  if (/abhyas|dpp/.test(blob)) pills.push("Practice");
  else if (rec.year && /jee|neet|nda|bitsat|shift/.test(blob)) pills.push("Actual");
  if (rec.diff || rec.difficulty) pills.push(String(rec.diff || rec.difficulty));
  return pills.filter(Boolean).map((p) => `<span class="pill">${esc(p)}</span>`).join("");
}

function hubOf(rec) {
  const b = String(rec.bank || "");
  const ex = String(rec.exam || "");
  if (/neet|aiims|jipmer|medical/i.test(b + ex)) return "neet";
  if (/nda/i.test(b + ex)) return "nda";
  if (/bitsat/i.test(b + ex)) return "bitsat";
  if (/jee|abhyas_jee|book/i.test(b) || /JEE/i.test(ex)) return "jee";
  return "other";
}

function slugify(s, n) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, n || 40);
}

function parseId(req) {
  const q = req.query || {};
  if (q.id) return String(q.id);
  const raw = String(req.url || "");
  const m2 = raw.match(/\/q\/([^/?#]+)\/([^/?#]+)/);
  if (m2) return decodeURIComponent(m2[1]);
  const m = raw.match(/\/q\/([^/?#]+)/);
  if (!m) return "";
  return decodeURIComponent(m[1]);
}

function render(rec, related) {
  const hub = hubOf(rec);
  const subSlug = slugify(rec.subject, 40);
  const chSlug = slugify(rec.chapter, 50);
  const qtxt = String(rec.text || "").replace(/\s+/g, " ").trim();
  let short = qtxt.slice(0, 72);
  if (qtxt.length > 72) short = short.replace(/\s+\S*$/, "") + "...";
  const title = `${short} | ${rec.exam}${rec.year ? " " + rec.year : ""} | Quantrex Academy`;
  const desc = `${qtxt.slice(0, 140)}${qtxt.length > 140 ? "..." : ""} ${rec.exam}${rec.year ? " " + rec.year : ""} ${rec.subject} PYQ with answer and solution — Quantrex Academy.`;
  const url = `${SITE}/q/${encodeURIComponent(rec.id)}/${encodeURIComponent(rec.slug)}`;
  const topicUrl = hub === "other" ? `${SITE}/questions` : `${SITE}/${hub}/${subSlug}/${chSlug}`;
  const hubUrl = hub === "other" ? `${SITE}/questions` : `${SITE}/${hub}`;
  const optsArr = optList(rec);
  const ans =
    rec.answer != null && optsArr[Number(rec.answer)] != null
      ? `${letters(Number(rec.answer))}. ${optsArr[Number(rec.answer)]}`
      : rec.answer != null
        ? String(rec.answer)
        : "";
  const opts = optList(rec)
    .map((o, i) => {
      const ok = String(rec.answer) === String(i);
      return `<li class="${ok ? "hit" : ""}"><span class="ltr">${letters(i)}</span><span class="opt-body">${rich(o)}</span></li>`;
    })
    .join("");
  const fromField = Array.isArray(rec.imgs) ? rec.imgs.map(publicImg).filter(Boolean) : [];
  const fromBlob = extractImgs(recBlob(rec));
  const seenFig = Object.create(null);
  const stemFigs = fromField.concat(fromBlob)
    .filter((u) => {
      if (!u || seenFig[u]) return false;
      seenFig[u] = 1;
      return true;
    })
    .slice(0, 6)
    .map((u) => `<img class="stem-fig" src="${esc(u)}" alt="Quantrex figure" loading="lazy">`)
    .join("");
  const relHtml = (related || [])
    .map((x) => `<a href="/q/${esc(x.id)}/${esc(x.slug)}">${esc(x.t)}${x.year ? ` <small>${esc(x.year)}</small>` : ""}</a>`)
    .join("");
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
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Quantrex Academy", item: SITE + "/" },
          { "@type": "ListItem", position: 2, name: rec.exam, item: hubUrl },
          { "@type": "ListItem", position: 3, name: rec.subject, item: hub === "other" ? hubUrl : SITE + "/" + hub + "/" + subSlug },
          { "@type": "ListItem", position: 4, name: rec.chapter, item: topicUrl },
          { "@type": "ListItem", position: 5, name: rec.text.slice(0, 80), item: url }
        ]
      },
      {
        "@type": "QAPage",
        mainEntity: {
          "@type": "Question",
          name: rec.text.slice(0, 240),
          text: rec.text,
          answerCount: ans || rec.sol ? 1 : 0,
          educationalAlignment: {
            "@type": "AlignmentObject",
            alignmentType: "educationalSubject",
            targetName: rec.exam + " " + rec.subject
          },
          acceptedAnswer:
            ans || rec.sol
              ? {
                  "@type": "Answer",
                  text: [ans && "Correct answer: " + ans, rec.sol].filter(Boolean).join("\n\n"),
                  author: { "@type": "Organization", name: "Quantrex Academy" }
                }
              : undefined
        }
      }
    ]
  };
  if (!schema["@graph"][2].mainEntity.acceptedAnswer) delete schema["@graph"][2].mainEntity.acceptedAnswer;

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
  <meta property="og:site_name" content="Quantrex Academy">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${SITE}/assets/quantrex-logo-3d-192.png">
  <meta name="twitter:card" content="summary">
  <meta name="theme-color" content="#1565C0">
  <link rel="icon" type="image/png" href="/assets/favicon-32x32.png">
  <!-- KaTeX for remaining $math$ on SEO pages -->
  <link rel="stylesheet" href="/assets/katex/katex.min.css">
  <script defer src="/assets/katex/katex.min.js"></script>
  <script defer src="/assets/katex/auto-render.min.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", function () {
      if (window.renderMathInElement) {
        renderMathInElement(document.body, {
          delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "$", right: "$", display: false}
          ],
          throwOnError: false
        });
      }
    });
  </script>
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
  <style>
    :root{--bg:#eef4fb;--card:#fff;--ink:#0b1b33;--muted:#5b6b82;--brand:#1565C0;--line:#d4e3f4;--ok:#0f766e}
    *{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.55}
    header{background:linear-gradient(125deg,#071526,#0b2a5b 45%,#1565C0 78%,#8450CB);color:#fff;padding:14px 16px;display:flex;gap:12px;align-items:center;justify-content:space-between}
    .brand{display:flex;gap:10px;align-items:center;color:#fff;text-decoration:none;font-weight:800}
    header img{width:40px;height:40px;border-radius:10px;background:#071526}
    header small{display:block;opacity:.85;font-weight:650;font-size:11px;letter-spacing:.04em}
    .app{color:#fff;text-decoration:none;font-size:12px;font-weight:800;background:rgba(255,255,255,.14);padding:8px 12px;border-radius:999px}
    nav.bc{max-width:880px;margin:0 auto;padding:12px 16px 0;font-size:12px;color:var(--muted)}
    nav.bc a{color:var(--brand);text-decoration:none;font-weight:700}
    main{max-width:880px;margin:0 auto;padding:8px 16px 48px}
    .pills{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 4px}
    .pill{background:#e8f1fb;color:#1565C0;font-size:11px;font-weight:800;padding:5px 10px;border-radius:999px}
    h1{font-size:clamp(1.12rem,3.2vw,1.48rem);line-height:1.4;margin:10px 0 14px;font-weight:800}
    .card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;margin:14px 0;box-shadow:0 10px 28px rgba(15,40,80,.06)}
    .card h2{margin:0 0 10px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
    ol.opts{list-style:none;margin:0;padding:0}
    ol.opts li{display:flex;gap:10px;align-items:flex-start;padding:11px 0;border-top:1px solid #eef3f9}
    ol.opts li:first-child{border-top:0}
    ol.opts li.hit{background:#ecfdf5;margin:0 -10px;padding:11px 10px;border-radius:12px;border-top:0}
    .opt-body img,.stem-fig,.q-stem img{max-width:min(100%,420px);height:auto;display:block;margin:8px 0;border-radius:10px;background:#fff}
    .q-stem{font-size:clamp(1.12rem,3.2vw,1.48rem);line-height:1.45;margin:10px 0 14px;font-weight:800}
    .ltr{flex:0 0 28px;height:28px;border-radius:8px;background:#e8f1fb;color:#1565C0;font-weight:800;display:grid;place-items:center;font-size:13px}
    .hit .ltr{background:#0f766e;color:#fff}
    .ans{background:#ecfdf5;border-color:#99f6e4}
    .sol p{margin:0;white-space:pre-wrap}
    .cta{display:block;text-align:center;background:linear-gradient(90deg,#1565C0,#8450CB);color:#fff;font-weight:800;padding:14px;border-radius:14px;text-decoration:none;margin-top:8px}
    .rel a{display:block;padding:12px 0;border-top:1px solid #eef3f9;color:var(--ink);font-weight:700;text-decoration:none}
    .rel a:hover{color:var(--brand)}
    .rel small{color:var(--muted);font-weight:750}
    footer{text-align:center;color:var(--muted);font-size:12px;padding:8px 16px 28px}
  </style>
</head>
<body>
  <header>
    <a class="brand" href="/">
      <img src="/assets/quantrex-logo-3d-64.png" alt="Quantrex">
      <span>Quantrex Academy<small>JEE · NEET · NDA PYQs with solutions</small></span>
    </a>
    <a class="app" href="/app.html">Open app</a>
  </header>
  <nav class="bc">
    <a href="/">Home</a> · <a href="${esc(hubUrl)}">${esc(rec.exam)}</a> ·
    <a href="${hub === "other" ? "/questions" : "/" + esc(hub) + "/" + esc(subSlug)}">${esc(rec.subject)}</a> ·
    <a href="${esc(topicUrl)}">${esc(rec.chapter)}</a>
  </nav>
  <main>
    <div class="pills">
      ${paperDetailPills(rec)}
    </div>
    <h1 class="q-stem">${rich(rec.text)}${stemFigs && !/<img/i.test(String(rec.text || "")) ? stemFigs : ""}</h1>
    ${opts ? `<section class="card"><h2>Options</h2><ol class="opts">${opts}</ol></section>` : ""}
    ${ans ? `<section class="card ans"><h2>Correct answer</h2><p style="margin:0;font-weight:800">${esc(ans)}</p></section>` : ""}
    <section class="card sol">
      <h2>Step-by-step solution</h2>
      <p>${rich(rec.sol || "Open this question in the Quantrex Academy app for the full interactive solution, figures and similar PYQs.")}</p>
    </section>
    <a class="cta" href="/app.html">Practice ${esc(rec.chapter)} on Quantrex Academy →</a>
    <section class="card rel">
      <h2>More from ${esc(rec.chapter)}</h2>
      ${relHtml || `<a href="${esc(topicUrl)}">All ${esc(rec.chapter)} questions</a>`}
      <a href="${esc(topicUrl)}">Full ${esc(rec.chapter)} list</a>
      <a href="${esc(hubUrl)}">All ${esc(rec.exam)} PYQs</a>
    </section>
  </main>
  <footer>© Quantrex Academy · Free JEE Main, JEE Advanced, NEET, NDA &amp; BITSAT previous year questions with solutions</footer>
</body>
</html>`;
}

function notFound() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Question not found | Quantrex Academy</title><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui;padding:24px;max-width:640px;margin:auto">
<h1>Question not found</h1>
<p>Browse free PYQs on Quantrex Academy.</p>
<p><a href="/jee">JEE questions</a> · <a href="/neet">NEET questions</a> · <a href="/app.html">Open app</a></p>
</body></html>`;
}

function topicRedirect(req) {
  const raw = String((req.query && (req.query.topic || req.query.slug)) || req.url || "");
  if (/neet|aiims|biology/i.test(raw)) return "/neet";
  if (/nda/i.test(raw)) return "/nda";
  if (/bitsat/i.test(raw)) return "/bitsat";
  return "/jee";
}

function searchKey(word) {
  const t = String(word || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (t.length < 2) return "zz";
  return t.slice(0, 2);
}

const SEARCH_STOP = {
  the: 1, and: 1, for: 1, with: 1, that: 1, this: 1, from: 1, which: 1, what: 1,
  when: 1, then: 1, each: 1, into: 1, following: 1, given: 1, find: 1, than: 1
};

function searchWords(q) {
  const raw = String(q || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const words = raw.filter((w) => w.length >= 2 && !SEARCH_STOP[w]);
  return words.length ? words : raw.filter((w) => w.length >= 2);
}

async function renderSearch(req, res) {
  const q = req.query || {};
  let rawQ = String(q.q || q.query || "");
  if (!rawQ) {
    const m = String(req.url || "").match(/[?&]q=([^&]*)/);
    if (m) {
      try {
        rawQ = decodeURIComponent(m[1].replace(/\+/g, " "));
      } catch (_) {
        rawQ = m[1];
      }
    }
  }
  rawQ = rawQ.replace(/\s+/g, " ").trim().slice(0, 160);
  const words = searchWords(rawQ);
  const keys = [];
  words.slice(0, 6).forEach((w) => {
    const k = searchKey(w);
    if (keys.indexOf(k) < 0) keys.push(k);
  });
  const seen = Object.create(null);
  const hits = [];
  const need = words.length <= 1 ? 1 : Math.min(2, words.length);
  for (const k of keys) {
    const arr = (await readJson(req, "data/seo/qsearch/" + k + ".json")) || [];
    (Array.isArray(arr) ? arr : []).forEach((it) => {
      const id = String(it.id || "");
      if (!id || seen[id]) return;
      const hay = String(it.t || "").toLowerCase();
      const ok = words.length ? words.filter((w) => hay.indexOf(w) >= 0).length >= need : false;
      if (!ok) return;
      seen[id] = 1;
      hits.push(it);
    });
  }
  hits.sort((a, b) => String(b.year || "").localeCompare(String(a.year || "")));
  const list = hits.slice(0, 28);
  const hydrated = [];
  for (let i = 0; i < list.length; i++) {
    const rec = await loadRec(req, list[i].id);
    hydrated.push(rec ? Object.assign({}, list[i], rec) : list[i]);
  }
  const scored = hydrated.filter((rec) => {
    if (!words.length) return true;
    const hay = recBlob(rec).toLowerCase();
    const n = words.filter((w) => hay.indexOf(w) >= 0).length;
    rec._score = n;
    return n >= need;
  }).sort((a, b) => (b._score || 0) - (a._score || 0) || String(b.year || "").localeCompare(String(a.year || "")));

  if (String(q.format || "") === "json") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.statusCode = 200;
    return res.end(JSON.stringify({
      q: rawQ,
      hits: scored.slice(0, 24).map((rec) => ({
        id: rec.id,
        slug: rec.slug,
        exam: rec.exam,
        year: rec.year,
        subject: rec.subject,
        chapter: rec.chapter,
        text: rec.text || rec.t || "",
        options: optList(rec),
        answer: rec.answer,
        sol: rec.sol || "",
        imgs: (Array.isArray(rec.imgs) && rec.imgs.length
          ? rec.imgs.map(publicImg).filter(Boolean)
          : extractImgs(recBlob(rec))
        ).slice(0, 4)
      }))
    }));
  }

  const rows = scored
    .slice(0, 24)
    .map((it, i) => {
      const href = "/q/" + encodeURIComponent(it.id) + "/" + encodeURIComponent(it.slug || "question");
      const opts = optList(it);
      const figs = extractImgs(recBlob(it)).slice(0, 2)
        .map((u) => `<img class="thumb" src="${esc(u)}" alt="Quantrex figure" loading="lazy">`)
        .join("");
      const optHtml = opts.length
        ? `<ol class="mini-opts">${opts.map((o, n) => `<li><b>${letters(n)}</b> ${rich(String(o).slice(0, 280))}</li>`).join("")}</ol>`
        : "";
      const stem = rich(String(it.text || it.t || "").slice(0, 420));
      return `<a class="qrow" href="${esc(href)}"><span class="num">${i + 1}</span><span><h3>${stem}</h3>${figs ? `<div class="thumbs">${figs}</div>` : ""}${optHtml}<span class="pills">${it.exam ? `<span class="pill">${esc(it.exam)}</span>` : ""}${it.year ? `<span class="pill">${esc(it.year)}</span>` : ""}${it.subject ? `<span class="pill">${esc(it.subject)}</span>` : ""}${it.chapter ? `<span class="pill">${esc(it.chapter)}</span>` : ""}<span class="pill ok">Solution</span></span></span><span class="go">View →</span></a>`;
    })
    .join("");
  const title = rawQ
    ? `${rawQ.slice(0, 60)} — question search | Quantrex Academy`
    : "Search JEE, NEET, NDA questions | Quantrex Academy";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="Search Quantrex Academy previous year questions. Paste a JEE Main, JEE Advanced or NEET question to open the solution page.">
  <meta name="robots" content="noindex,follow">
  <link rel="canonical" href="${SITE}/search${rawQ ? "?q=" + encodeURIComponent(rawQ) : ""}">
  <style>
    :root{--bg:#eef4fb;--card:#fff;--ink:#0b1b33;--muted:#5b6b82;--brand:#1565C0;--line:#d4e3f4}
    *{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--ink)}
    .top{background:linear-gradient(125deg,#071526,#1565C0 70%,#8450CB);color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
    .brand{color:#fff;text-decoration:none;font-weight:800;display:flex;gap:10px;align-items:center}
    .brand img{width:40px;height:40px;border-radius:10px}
    main{max-width:880px;margin:0 auto;padding:18px 16px 48px}
    form{display:flex;gap:8px;margin:12px 0 16px}
    input[type=search]{flex:1;padding:12px 14px;border:1px solid var(--line);border-radius:12px;font:inherit;font-weight:650}
    button{background:#1565C0;color:#fff;border:0;border-radius:12px;padding:12px 16px;font-weight:800;cursor:pointer}
    .list{background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden}
    .qrow{display:grid;grid-template-columns:42px 1fr auto;gap:10px;padding:14px;border-top:1px solid #eef3f9;text-decoration:none;color:inherit;align-items:start}
    .qrow:first-child{border-top:0}.qrow:hover{background:#f7fbff}
    .num{width:32px;height:32px;border-radius:10px;background:#e8f1fb;color:#1565C0;font-weight:800;display:grid;place-items:center}
    h1{font-size:1.25rem}h3{margin:0 0 6px;font-size:15px;line-height:1.4;font-weight:750}
    h3 img,.thumb{max-width:min(100%,280px);height:auto;border-radius:10px;display:block;margin:8px 0;background:#fff}
    .thumbs{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}
    .mini-opts{margin:8px 0;padding:0;list-style:none;font-size:13px;color:#334155}
    .mini-opts li{display:flex;gap:8px;padding:4px 0;align-items:flex-start}
    .mini-opts b{flex:0 0 18px;color:#1565C0}
    .mini-opts img{max-width:160px;height:auto;border-radius:8px}
    .pills{display:flex;gap:6px;flex-wrap:wrap}.pill{font-size:10px;font-weight:800;background:#e8f1fb;color:#1565C0;padding:3px 8px;border-radius:999px}
    .pill.ok{background:#ecfdf5;color:#0f766e}.go{color:#1565C0;font-weight:800;font-size:12px}
    .muted{color:var(--muted)}
    .thumbs{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
    .thumbs img,.thumb{max-width:min(100%,280px);height:auto;border-radius:10px;background:#fff;border:1px solid #e8eef6}
    .mini-opts{margin:8px 0 4px;padding:0;list-style:none}
    .mini-opts li{font-size:13px;line-height:1.45;padding:4px 0;color:#334155}
    .mini-opts b{display:inline-block;min-width:18px;color:#1565C0}
  </style>
</head>
<body>
  <header class="top">
    <a class="brand" href="/"><img src="/assets/quantrex-logo-3d-64.png" alt="">Quantrex Academy</a>
    <a class="brand" href="/jee" style="font-size:12px;background:rgba(255,255,255,.14);padding:8px 12px;border-radius:999px">JEE PYQs</a>
  </header>
  <main>
    <h1>Search questions</h1>
    <p class="muted">Paste a JEE / NEET question — same idea as searching on Google, then open the Quantrex solution page.</p>
    <form action="/search" method="get">
      <input type="search" name="q" value="${esc(rawQ)}" placeholder="Paste or type a question…" autofocus>
      <button type="submit">Search</button>
    </form>
    <div class="list">${rows || `<div style="padding:18px" class="muted">${rawQ ? "No match in the public index. Try 4–6 important words from the question, or browse " : "Type a question, or browse "}<a href="/jee">JEE PYQs</a>.</div>`}</div>
  </main>
</body>
</html>`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
  res.statusCode = 200;
  return res.end(html);
}

module.exports = async function handler(req, res) {
  const q = req.query || {};
  if (q.mode === "search" || /\/search(?:\?|$)/.test(String(req.url || "").split("#")[0])) {
    return renderSearch(req, res);
  }
  if (q.topic && !q.id) {
    res.statusCode = 301;
    res.setHeader("Location", topicRedirect(req));
    res.setHeader("Cache-Control", "public, max-age=600");
    return res.end();
  }

  const wantsQ = !!(q.id || /\/q\//.test(String(req.url || "")));
  if (wantsQ) {
    const id = parseId(req);
    const rec = await loadRec(req, id);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    if (!rec) {
      res.statusCode = 404;
      return res.end(notFound());
    }
    res.statusCode = 200;
    return res.end(render(rec, await loadRelated(req, rec)));
  }

  const listing = require("../lib/seo-pages.js");
  return listing(req, res);
};
