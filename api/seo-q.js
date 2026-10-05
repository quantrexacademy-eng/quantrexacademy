/**
 * Server-rendered question page (unique Google URL).
 * GET /q/:id/:slug  →  /api/seo-q?id=
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const SITE = "https://www.quantrexacademy.com";
/* qxmd318: server-side KaTeX (htmlAndMathml) so Google sees real math, not $TeX$. */
const seoQuality = require("../lib/seo-quality");
const seoOrg = require("../lib/seo-org");
const seoKatex = require("../lib/seo-katex");
const seoPaper = require("../lib/seo-paper");
let qxSanitize = null;
try { qxSanitize = require("../qx-math-sanitize"); } catch (_) { qxSanitize = null; }
const ROOT = process.env.QX_SITE_ROOT || process.cwd();
const SEO_ASSET_V = "qxmd319";
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
    const r = await fetch(proto + "://" + host + "/" + rel.replace(/\\/g, "/") + "?v=" + SEO_ASSET_V);
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
  const cap = /math/i.test(String(rec.subject || "")) ? 16 : 8;
  const rel = items.filter((x) => String(x.id) !== String(rec.id)).slice(0, cap);
  /* qxmd315: previous / next question in the chapter list order */
  const at = items.findIndex((x) => String(x.id) === String(rec.id));
  rel.nav = at >= 0 ? { prev: items[at - 1] || null, next: items[at + 1] || null, pos: at + 1, total: items.length } : null;
  return rel;
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let qxSeoAlt = "Question figure";

function plainFig(s) {
  return String(s || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$\n]{0,200}\$/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function figAlt(s) {
  let text = plainFig(s);
  if (text.length < 8) return "Question figure";
  if (text.length > 120) text = text.slice(0, 120).replace(/\s+\S*$/, "");
  return text || "Question figure";
}

/* HTML alt only. Do not touch ?alt=media or &alt=media inside image URLs. */
function stripHtmlAlt(attr) {
  return String(attr || "").replace(/(^|\s)alt\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>]+)/gi, "$1");
}

function absoluteUrl(u) {
  const s = String(u || "").trim();
  if (!s || /^data:/i.test(s) || /^javascript:/i.test(s)) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.indexOf("//") === 0) return "https:" + s;
  if (s.charAt(0) === "/") return SITE + s;
  return SITE + "/" + s.replace(/^\.\//, "");
}

function publicImg(u) {
  let s = String(u || "").trim();
  s = s.replace(/cdn-question-pool\.{2,}app/g, "cdn-question-pool.getmarks.app");
  s = s.replace(/cdn-assets\.{2,}app/g, "cdn-assets.getmarks.app");
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

function healSeoText(s) {
  let t = String(s == null ? "" : s);
  if (!t) return t;
  try {
    if (qxSanitize && typeof qxSanitize.healDisplayBreaks === "function") t = qxSanitize.healDisplayBreaks(t);
  } catch (_) { /* */ }
  try {
    if (qxSanitize && typeof qxSanitize.normalizeMathContent === "function") t = qxSanitize.normalizeMathContent(t).html;
  } catch (_) {
    t = t.replace(/\\left\$/g, "\\left(").replace(/\\right\$/g, "\\right)");
    t = t.replace(/\$Let \$/g, "Let $");
    t = t.replace(/(^|[>\n\r\s])\$(Given|If|Find|The|Simplify|Let|Consider|Which|When|For|Show|Prove|Calculate|Determine)\b(?!\$)/g, "$1$2");
  }
  t = t.replace(/&#39;|&apos;|&#x27;/gi, "'");
  t = t.replace(/&nbsp;|&#160;/gi, " ");
  return t;
}

function plainSnippet(s, n) {
  let t = healSeoText(String(s == null ? "" : s));
  t = t.replace(/<[^>]+>/g, " ");
  t = t.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&");
  for (let i = 0; i < 8; i++) {
    const n2 = t.replace(/\\(?:d|t)?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
    if (n2 === t) break;
    t = n2;
  }
  t = t.replace(/\\mathbb\s*\{([A-Za-z])\}/g, (_, c) => ({ R: "ℝ", N: "ℕ", Z: "ℤ", Q: "ℚ", C: "ℂ" }[c] || c));
  t = t.replace(/\\(?:left|right)\s*/g, "");
  t = t.replace(/\\(?:mathrm|mathbf|mathit|operatorname|text|textrm|textbf)\s*\{([^{}]*)\}/g, "$1");
  const uni = { infty: "∞", times: "×", cdot: "·", pm: "±", leq: "≤", geq: "≥", le: "≤", ge: "≥", neq: "≠", ne: "≠", in: "∈", to: "→", rightarrow: "→", leftarrow: "←", pi: "π", theta: "θ", alpha: "α", beta: "β", gamma: "γ", lambda: "λ", mu: "μ", sigma: "σ", omega: "ω", phi: "φ", Delta: "Δ", sum: "∑", int: "∫", partial: "∂", geqslant: "≥", leqslant: "≤" };
  t = t.replace(/\\([a-zA-Z]+)\*?/g, (m, name) => (uni[name] != null ? uni[name] : " "));
  t = t.replace(/\$+/g, " ").replace(/[{}]/g, " ").replace(/\\\\/g, " ");
  t = t.replace(/\s+/g, " ").trim();
  if (n && t.length > n) {
    t = t.slice(0, n);
    const sp = t.lastIndexOf(" ");
    if (sp > n * 0.55) t = t.slice(0, sp);
    t = t.replace(/[ ,;:-]+$/, "");
  }
  return t;
}

function rich(s) {
  const raw = healSeoText(String(s == null ? "" : s));
  if (!raw) return "";
  const pack = seoKatex.holdMath(raw);
  let h = pack.out;
  if (!/<[a-z/]/i.test(h)) {
    return seoKatex.restoreMath(esc(h), pack.held);
  }
  h = h
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  h = h.replace(/<img([^>]*?)src\s*=\s*(["'])([^"']+)\2([^>]*)>/gi, function (_, a, _q, src, b) {
    const p = publicImg(src);
    if (!p) return "";
    return "<img" + stripHtmlAlt(a) + ' src="' + esc(p) + '" alt="' + esc(figAlt(qxSeoAlt)) + '" loading="lazy" decoding="async"' + stripHtmlAlt(b) + ">";
  });
  return seoKatex.restoreMath(h, pack.held);
}

function letters(i) {
  return String.fromCharCode(65 + i);
}

function paperMeta(rec) {
  const p = seoPaper.parsePaperMeta(rec);
  return {
    date: p.date,
    shift: p.shift,
    mode: p.mode,
    paper: p.paper,
    exam: p.exam,
    year: p.year,
    src: p.raw,
    line: p.line,
    chips: p.chips,
    parts: p.chips
  };
}

function paperDetailPills(rec) {
  const p = paperMeta(rec);
  const chips = [];
  const examTxt = p.exam ? (p.year ? p.exam + " " + p.year : p.exam) : p.year;
  if (examTxt) chips.push(`<span class="pill pill-exam">${esc(examTxt)}</span>`);
  if (p.date) chips.push(`<span class="pill pill-date">${esc(p.date)}</span>`);
  if (p.shift) chips.push(`<span class="pill pill-shift">${esc(p.shift)}</span>`);
  if (p.mode) chips.push(`<span class="pill">${esc(p.mode)}</span>`);
  if (p.paper) chips.push(`<span class="pill">${esc(p.paper)}</span>`);
  return chips.join("");
}

function paperDl(rec) {
  const p = paperMeta(rec);
  const rows = [];
  if (p.exam || rec.exam) rows.push(["Exam", p.exam || rec.exam]);
  if (p.year || rec.year) rows.push(["Year", String(p.year || rec.year)]);
  if (p.date) rows.push(["Date", p.date]);
  if (p.shift) rows.push(["Shift", p.shift]);
  if (p.mode) rows.push(["Mode", p.mode]);
  if (p.paper) rows.push(["Paper", p.paper]);
  if (rec.subject) rows.push(["Subject", rec.subject]);
  if (rec.chapter) rows.push(["Chapter", rec.chapter]);
  if (!rows.length) return "";
  return `<dl class="paper-dl">${rows.map((r) => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join("")}</dl>`;
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
  const qtxt = plainSnippet(rec.text, 220);
  let short = qtxt.slice(0, 68);
  if (qtxt.length > 68) short = short.replace(/\s+\S*$/, "") + "...";
  const paper = paperMeta(rec);
  const examBit = [rec.exam, rec.year].filter(Boolean).join(" ");
  const paperLine = paper.line || examBit;
  const indexable = seoQuality.isIndexable(rec);
  const title = [short, paperLine, rec.subject, "Quantrex Academy"].filter(Boolean).join(" | ");
  const desc = `${qtxt.slice(0, 150)}${qtxt.length > 150 ? "..." : ""} ${paperLine}${rec.chapter ? " · " + rec.chapter : ""}. Answer and step-by-step solution on Quantrex Academy.`.replace(/\s+/g, " ").trim();
  const url = `${SITE}/q/${encodeURIComponent(rec.id)}/${encodeURIComponent(rec.slug)}`;
  const topicUrl = hub === "other" ? `${SITE}/questions` : `${SITE}/${hub}/${subSlug}/${chSlug}`;
  const hubUrl = hub === "other" ? `${SITE}/questions` : `${SITE}/${hub}`;
  const optsArr = optList(rec);
  const ansPlain =
    rec.answer != null && optsArr[Number(rec.answer)] != null
      ? `${letters(Number(rec.answer))}. ${plainSnippet(optsArr[Number(rec.answer)], 220)}`
      : rec.answer != null
        ? String(rec.answer)
        : "";
  const ansHtml =
    rec.answer != null && optsArr[Number(rec.answer)] != null
      ? `${letters(Number(rec.answer))}. ${rich(optsArr[Number(rec.answer)])}`
      : rec.answer != null
        ? esc(String(rec.answer))
        : "";
  const opts = optList(rec)
    .map((o, i) => {
      const ok = String(rec.answer) === String(i);
      return `<li class="${ok ? "hit" : ""}"><span class="ltr">${letters(i)}</span><span class="opt-body">${rich(o)}</span></li>`;
    })
    .join("");
  qxSeoAlt = qtxt || "Question figure";
  const fromField = Array.isArray(rec.imgs) ? rec.imgs.map(publicImg).filter(Boolean) : [];
  const fromBlob = extractImgs(recBlob(rec));
  const seenFig = Object.create(null);
  const stemFigUrls = fromField.concat(fromBlob)
    .filter((u) => {
      if (!u || seenFig[u]) return false;
      seenFig[u] = 1;
      return true;
    })
    .slice(0, 6);
  const stemFigs = stemFigUrls
    .map((u) => `<img class="stem-fig" src="${esc(u)}" alt="${esc(figAlt(qxSeoAlt))}" loading="lazy">`)
    .join("");
  const ogImage = stemFigUrls.length ? absoluteUrl(stemFigUrls[0]) : SITE + "/assets/quantrex-logo-3d-192.png";
  const ogIsFig = stemFigUrls.length > 0;
  const nav = related && related.nav;
  const pnHtml = nav && (nav.prev || nav.next)
    ? `<nav class="pn" aria-label="Previous and next question">${nav.prev ? `<a class="pv" href="/q/${esc(nav.prev.id)}/${esc(nav.prev.slug)}" rel="prev"><small>← Previous question</small>${esc(seoOrg.clip(nav.prev.t, 90))}</a>` : ""}${nav.next ? `<a class="nx" href="/q/${esc(nav.next.id)}/${esc(nav.next.slug)}" rel="next"><small>Next question →</small>${esc(seoOrg.clip(nav.next.t, 90))}</a>` : ""}</nav>`
    : "";
  const relHtml = (related || [])
    .map((x) => {
      const teaser = seoOrg.clip(plainSnippet(x.t || x.text || "", 180), 90);
      const when = [x.exam, x.year].filter(Boolean).join(" ");
      return `<a href="/q/${esc(x.id)}/${esc(x.slug)}">${esc(teaser)}${when ? ` <small>${esc(when)}</small>` : ""}</a>`;
    })
    .join("");
  const crumbItems = [
    { name: "Quantrex Academy", url: SITE + "/" },
    { name: rec.exam || "Questions", url: hubUrl },
    hub === "other" ? null : { name: rec.subject, url: SITE + "/" + hub + "/" + subSlug },
    hub === "other" ? null : { name: rec.chapter, url: topicUrl },
    { name: seoOrg.clip(qtxt, 80) || "Question", url: url }
  ].filter((x) => x && x.name);
  const solPlain = plainSnippet(rec.sol || "", 4000);
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      seoOrg.ORG,
      seoOrg.breadcrumb(crumbItems),
      /* QAPage only when the page has a verified answer and a real solution (education Q&A: one expert answer). */
      indexable
        ? {
            "@type": "QAPage",
            url: url,
            mainEntity: {
              "@type": "Question",
              name: seoOrg.clip(qtxt, 240),
              text: qtxt,
              answerCount: 1,
              educationalAlignment: {
                "@type": "AlignmentObject",
                alignmentType: "educationalSubject",
                targetName: [rec.exam, rec.year, paper.date, paper.shift, rec.subject, rec.chapter].filter(Boolean).join(" ")
              },
              acceptedAnswer: {
                "@type": "Answer",
                text: [ansPlain && "Correct answer: " + ansPlain, solPlain].filter(Boolean).join("\n\n"),
                url: url + "#solution",
                author: { "@type": "Organization", name: "Quantrex Academy", url: SITE + "/" }
              }
            }
          }
        : null,
      {
        "@type": "LearningResource",
        name: title,
        url: url,
        learningResourceType: "Practice problem",
        educationalUse: "practice",
        isAccessibleForFree: true,
        inLanguage: "en",
        provider: { "@id": SITE + "/#org" },
        about: [rec.exam, rec.year, paper.date, paper.shift, rec.subject, rec.chapter].filter(Boolean).join(" · ")
      }
    ].filter(Boolean)
  };
  if (ogIsFig) {
    schema["@graph"].push({
      "@type": "ImageObject",
      contentUrl: ogImage,
      caption: figAlt(qxSeoAlt)
    });
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="${indexable ? "index,follow,max-snippet:-1,max-image-preview:large" : "noindex,follow"}">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Quantrex Academy">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${esc(ogImage)}">
  <meta property="og:image:alt" content="${esc(ogIsFig ? figAlt(qxSeoAlt) : "Quantrex Academy")}">
  <meta name="twitter:card" content="${ogIsFig ? "summary_large_image" : "summary"}">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${esc(ogImage)}">
  <meta name="google-site-verification" content="pemTmZW6o6YInk0dhVyPgIz7R4v4mWvKhIb1AdI9Alw">
  <meta name="theme-color" content="#1565C0">
  <meta name="qx-build" content="qxmd319">
  <link rel="icon" type="image/png" href="/assets/favicon-32x32.png">
  <link rel="stylesheet" href="/assets/katex/katex.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/mhchem.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"></script>
  <script>
    document.addEventListener("DOMContentLoaded", function () {
      if (window.renderMathInElement) {
        renderMathInElement(document.body, {
          delimiters: [
            {left: "$$", right: "$$", display: true},
            {left: "\\\\[", right: "\\\\]", display: true},
            {left: "$", right: "$", display: false},
            {left: "\\\\(", right: "\\\\)", display: false}
          ],
          throwOnError: false
        });
      }
    });
  </script>
  <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>
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
    .pill-exam{background:#1565C0;color:#fff}
    .pill-date{background:#fff;border:1px solid #c5d8ee;color:#0b1b33}
    .pill-shift{background:#dbeafe;color:#1e3a8a}
    .paper-dl{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin:10px 0 6px;padding:12px 14px;background:#fff;border:1px solid var(--line);border-radius:14px}
    .paper-dl div{min-width:0}
    .paper-dl dt{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:0}
    .paper-dl dd{margin:2px 0 0;font-size:13px;font-weight:800;color:var(--ink)}
    h1{font-size:clamp(1.12rem,3.2vw,1.48rem);line-height:1.4;margin:10px 0 14px;font-weight:800}
    .kicker{font-size:13px;font-weight:800;color:var(--brand);margin:4px 0 0}
    .card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;margin:14px 0;box-shadow:0 10px 28px rgba(15,40,80,.06)}
    .card h2{margin:0 0 10px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
    ol.opts{list-style:none;margin:0;padding:0}
    ol.opts li{display:flex;gap:10px;align-items:flex-start;padding:11px 0;border-top:1px solid #eef3f9}
    ol.opts li:first-child{border-top:0}
    ol.opts li.hit{background:#ecfdf5;margin:0 -10px;padding:11px 10px;border-radius:12px;border-top:0}
    .opt-body img,.stem-fig,.q-stem img,.qx-seo-sol img{max-width:min(100%,420px);height:auto;display:block;margin:8px 0;border-radius:10px;background:#fff}
    .q-stem{font-size:clamp(1.12rem,3.2vw,1.48rem);line-height:1.45;margin:10px 0 14px;font-weight:800;overflow-wrap:break-word;word-break:normal}
    .ltr{flex:0 0 32px;width:32px;height:32px;border-radius:50%;background:#1565C0;color:#fff;font-weight:800;display:grid;place-items:center;font-size:14px;line-height:1}
    .hit .ltr{background:#0f766e;color:#fff}
    .ans{background:#ecfdf5;border-color:#99f6e4}
    .sol-diff{margin:0 0 10px;font-size:12px;font-weight:800;color:#0f766e}
    .qx-seo-sol{margin:0;overflow-wrap:break-word;word-break:normal;white-space:normal;line-height:1.65;font-size:16px;font-weight:500}
    .qx-seo-sol .katex,.q-stem .katex,.opt-body .katex,.ans .katex{white-space:nowrap;font-size:1.05em}
    math{font-family:KaTeX_Main,Times New Roman,serif}
    .qx-seo-sol .katex-display,.q-stem .katex-display{margin:10px 0;overflow-x:auto;overflow-y:hidden}
    .cta{display:block;text-align:center;background:linear-gradient(90deg,#1565C0,#8450CB);color:#fff;font-weight:800;padding:14px;border-radius:14px;text-decoration:none;margin-top:8px}
    .rel a{display:block;padding:12px 0;border-top:1px solid #eef3f9;color:var(--ink);font-weight:700;text-decoration:none}
    .rel a:hover{color:var(--brand)}
    .rel small{color:var(--muted);font-weight:750}
    footer{text-align:center;color:var(--muted);font-size:12px;padding:8px 16px 28px}
    .pn{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
    .pn a{display:block;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px;color:var(--ink);text-decoration:none;font-weight:700;font-size:13px;line-height:1.4}
    .pn a small{display:block;color:var(--brand);font-weight:800;font-size:11px;letter-spacing:.04em;text-transform:uppercase;margin-bottom:4px}
    .pn .nx{text-align:right;grid-column:2}
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
    ${paperDl(rec)}
    <p class="kicker">${esc([paperLine, rec.subject, rec.chapter].filter(Boolean).join(" · "))}</p>
    <h1 class="q-stem">${rich(rec.text)}${stemFigs && !/<img/i.test(String(rec.text || "")) ? stemFigs : ""}</h1>
    ${opts ? `<section class="card"><h2>Options</h2><ol class="opts">${opts}</ol></section>` : ""}
    ${ansHtml ? `<section class="card ans"><h2>Correct answer</h2><p style="margin:0;font-weight:800">${ansHtml}</p></section>` : ""}
    <section class="card sol" id="solution">
      <h2>Step-by-step solution</h2>
      ${rec.diff || rec.difficulty ? `<p class="sol-diff">Difficulty: ${esc(String(rec.diff || rec.difficulty))}</p>` : ""}
      <div class="qx-seo-sol">${rich(rec.sol || "Open this question in the Quantrex Academy app for the full interactive solution, figures and similar PYQs.")}</div>
    </section>
    <a class="cta" href="/app.html">Practice ${esc(rec.chapter)} on Quantrex Academy →</a>
    ${pnHtml}
    <section class="card rel">
      <h2>More from ${esc(rec.chapter)}</h2>
      ${relHtml || `<a href="${esc(topicUrl)}">All ${esc(rec.chapter)} questions</a>`}
      <a href="${esc(topicUrl)}">Full ${esc(rec.chapter)} list</a>
      ${/math/i.test(String(rec.subject || "")) ? `<a href="/jee/mathematics/${esc(chSlug)}">${esc(rec.chapter)} JEE Maths PYQs</a><a href="/maths">JEE Mathematics PYQs</a>` : ""}
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

const pasteSearch = require("../lib/seo-paste-search");

function searchWords(q) {
  return pasteSearch.tokens(q);
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
  rawQ = rawQ.replace(/\s+/g, " ").trim().slice(0, 1600);
  const words = searchWords(rawQ);
  const dist = pasteSearch.distinctive(words);
  const paste = pasteSearch.isPaste(rawQ, words);
  const keys = pasteSearch.shardKeys(words, dist);
  const seen = Object.create(null);
  const hits = [];
  const qNorm = pasteSearch.normalizeStem(rawQ);
  const pKey = pasteSearch.phraseKey(qNorm, paste ? 72 : 48);
  const need = pasteSearch.firstPassNeed(paste, words, dist);
  for (const k of keys) {
    const arr = (await readJson(req, "data/seo/qsearch/" + k + ".json")) || [];
    (Array.isArray(arr) ? arr : []).forEach((it) => {
      const id = String(it.id || "");
      if (!id || seen[id]) return;
      const hay = pasteSearch.normalizeStem(it.t || "");
      const prefix = qNorm.slice(0, Math.max(160, Math.min(qNorm.length, hay.length + 48)));
      const pWords = pasteSearch.tokens(prefix);
      const pDist = pasteSearch.distinctive(pWords);
      const st = pasteSearch.scoreHay(hay, pWords, pDist, pasteSearch.phraseKey(prefix, 64));
      if (!pasteSearch.passesFirst(st, need, paste)) return;
      seen[id] = 1;
      it._pre = st.score;
      hits.push(it);
    });
  }
  hits.sort((a, b) => (b._pre || 0) - (a._pre || 0));
  const list = hits.slice(0, paste ? 48 : 28);
  const hydrated = [];
  for (let i = 0; i < list.length; i++) {
    const rec = await loadRec(req, list[i].id);
    hydrated.push(rec ? Object.assign({}, list[i], rec) : list[i]);
  }
  const scored = hydrated.filter((rec) => {
    if (!words.length) return true;
    const hay = pasteSearch.normalizeStem(recBlob(rec));
    const st = pasteSearch.scoreHay(hay, words, dist, pKey);
    rec._score = st.score;
    rec._overlap = st.overlap;
    rec._distOverlap = st.distOverlap;
    rec._phrase = st.phrase;
    return pasteSearch.passesHydrated(st, paste);
  }).sort((a, b) => (b._score || 0) - (a._score || 0) || String(b.year || "").localeCompare(String(a.year || "")));
  const closeMiss = pasteSearch.noCloseMatch(scored, paste);
  if (!closeMiss && pasteSearch.shouldRedirect(scored, paste) && String(q.format || "") !== "json") {
    const best = scored[0];
    const href = "/q/" + encodeURIComponent(best.id) + "/" + encodeURIComponent(best.slug || "question");
    res.statusCode = 302;
    res.setHeader("Location", href);
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=120");
    return res.end();
  }

  if (String(q.format || "") === "json") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.statusCode = 200;
    return res.end(JSON.stringify({
      q: rawQ,
      paste,
      hits: (closeMiss ? [] : scored.slice(0, 24)).map((rec) => ({
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

  const shown = closeMiss ? [] : scored.slice(0, 24);
  const rows = shown
    .map((it, i) => {
      const href = "/q/" + encodeURIComponent(it.id) + "/" + encodeURIComponent(it.slug || "question");
      const opts = optList(it);
      const figs = extractImgs(recBlob(it)).slice(0, 2)
        .map((u) => `<img class="thumb" src="${esc(u)}" alt="${esc(figAlt(it.text || it.t || ""))}" loading="lazy">`)
        .join("");
      const optHtml = opts.length
        ? `<ol class="mini-opts">${opts.map((o, n) => `<li><b>${letters(n)}</b> ${rich(String(o).slice(0, 280))}</li>`).join("")}</ol>`
        : "";
      const stem = rich(String(it.text || it.t || "").slice(0, 420));
      const best = i === 0 && paste ? `<span class="pill ok">Best match</span>` : "";
      return `<a class="qrow" href="${esc(href)}"><span class="num">${i + 1}</span><span><h3>${stem}</h3>${figs ? `<div class="thumbs">${figs}</div>` : ""}${optHtml}<span class="pills">${best}${it.exam ? `<span class="pill">${esc(it.exam)}</span>` : ""}${it.year ? `<span class="pill">${esc(it.year)}</span>` : ""}${it.subject ? `<span class="pill">${esc(it.subject)}</span>` : ""}${it.chapter ? `<span class="pill">${esc(it.chapter)}</span>` : ""}<span class="pill ok">Solution</span></span></span><span class="go">View →</span></a>`;
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
    <a class="brand" href="/"><img src="/assets/quantrex-logo-3d-64.png" alt="Quantrex Academy">Quantrex Academy</a>
    <a class="brand" href="/jee" style="font-size:12px;background:rgba(255,255,255,.14);padding:8px 12px;border-radius:999px">JEE PYQs</a>
  </header>
  <main>
    <h1>Search questions</h1>
    <p class="muted">Paste a JEE / NEET question — same idea as searching on Google, then open the Quantrex solution page.</p>
    <form action="/search" method="get">
      <input type="search" name="q" value="${esc(rawQ)}" placeholder="Paste or type a question…" autofocus>
      <button type="submit">Search</button>
    </form>
    <div class="list">${rows || `<div style="padding:18px" class="muted">${rawQ ? (closeMiss ? "No close match for this pasted question — other stems that only share common words are hidden. Paste a longer unique part of the stem, or browse " : "No match in the public index. Try 4–6 important words from the question, or browse ") : "Type a question, or browse "}<a href="/jee">JEE PYQs</a>.</div>`}</div>
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
  const pathOnly = String(req.url || "").split("?")[0];
  if (/^\/maths(?:\/|$)/i.test(pathOnly) || q.maths != null) {
    return require("../lib/seo-maths")(req, res);
  }
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
    res.setHeader("Cache-Control", "public, max-age=120, s-maxage=300, stale-while-revalidate=3600");
    if (!rec) {
      res.statusCode = 404;
      res.setHeader("Cache-Control", "public, max-age=600, s-maxage=3600");
      return res.end(notFound());
    }
    /* qxmd315: one URL per question — /q/:id or /q/:id/<old-slug> → 301 to the canonical slug */
    if (!q.id && rec.slug) {
      const pm = String(req.url || "").split("?")[0].match(/^\/q\/([^/]+)(?:\/([^/]*))?\/?$/);
      let given = pm ? pm[2] || "" : null;
      try { given = given == null ? null : decodeURIComponent(given); } catch (_) {}
      if (pm && given !== String(rec.slug)) {
        res.statusCode = 301;
        res.setHeader("Location", "/q/" + encodeURIComponent(rec.id) + "/" + encodeURIComponent(rec.slug));
        return res.end();
      }
    }
    res.statusCode = 200;
    return res.end(render(rec, await loadRelated(req, rec)));
  }

  const listing = require("../lib/seo-pages.js");
  return listing(req, res);
};
