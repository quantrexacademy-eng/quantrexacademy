/**
 * Build compact Maths SEO index from RFC formula cards + JEE/NDA/BITSAT PYQ lists.
 * Run: node lib/build-seo-maths-index.js
 * Does not invent lessons or touch stored answers.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE = "https://www.quantrexacademy.com";
const TODAY = "2026-10-03";

function slugify(s, n) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, n || 60);
}

function loadJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  } catch (e) {
    return null;
  }
}

function chapterFileCandidates(name) {
  const s = slugify(name).replace(/-/g, "_");
  return [
    "mathematics_" + s + ".json",
    "mathematics_" + s.replace(/_and_/g, "_") + ".json"
  ];
}

function loadChapterPack(name) {
  const dir = path.join(ROOT, "data", "rfc_offline", "chapters");
  const tried = {};
  for (const file of chapterFileCandidates(name)) {
    if (tried[file]) continue;
    tried[file] = 1;
    const full = path.join(dir, file);
    if (fs.existsSync(full)) {
      try {
        return JSON.parse(fs.readFileSync(full, "utf8"));
      } catch (_) {}
    }
  }
  return null;
}

function topicFolder(preview) {
  const u = String(preview || "");
  const m = u.match(/\/([^/]+)\/[^/]+\.(?:webp|png|jpe?g)(?:\?|$)/i);
  return m ? m[1] : "";
}

function matchChapterKey(chapters, rfcName) {
  const want = slugify(rfcName, 80);
  if (!chapters) return "";
  if (chapters[want]) return want;
  const aliases = {
    "permutation-and-combination": "permutation-combination",
    "quadratic-equations": "quadratic-equation",
    "sequence-and-series": "sequences-and-series",
    "trigonometric-ratios-identities": "trigonometric-ratios-and-identities",
    "trigonometric-ratios-and-identities": "trigonometric-ratios-and-identities"
  };
  if (aliases[want] && chapters[aliases[want]]) return aliases[want];
  const keys = Object.keys(chapters);
  const compact = want.replace(/-/g, "");
  return (
    keys.find((k) => k === want) ||
    keys.find((k) => k.replace(/-/g, "") === compact) ||
    keys.find((k) => k.startsWith(want.slice(0, 22)) || want.startsWith(k.slice(0, 22))) ||
    ""
  );
}

function clipItems(items, n) {
  return (items || []).slice(0, n).map((it) => ({
    id: String(it.id || ""),
    slug: String(it.slug || "question"),
    t: String(it.t || "").replace(/\s+/g, " ").trim().slice(0, 160),
    year: it.year ? String(it.year) : "",
    exam: it.exam ? String(it.exam) : ""
  })).filter((x) => x.id);
}

function main() {
  const subj = loadJson("data/rfc_offline/subjects/mathematics.json");
  if (!subj || !Array.isArray(subj.chapters)) {
    throw new Error("missing RFC mathematics subject JSON");
  }
  const jee = loadJson("data/seo/lists/jee__mathematics.json") || { chapters: {}, count: 0 };
  const nda = loadJson("data/seo/lists/nda__mathematics.json") || { chapters: {} };
  const bitsat = loadJson("data/seo/lists/bitsat__mathematics.json") || { chapters: {} };

  const usedPyq = Object.create(null);
  const chapters = [];
  let topicN = 0;
  let cardN = 0;

  subj.chapters.forEach((ch) => {
    const slug = slugify(ch.name, 60);
    const pack = loadChapterPack(ch.name);
    const cards = (pack && pack.cards) || [];
    const pyqSlug = matchChapterKey(jee.chapters, ch.name);
    const ndaSlug = matchChapterKey(nda.chapters, ch.name);
    const bitsatSlug = matchChapterKey(bitsat.chapters, ch.name);
    if (pyqSlug) usedPyq[pyqSlug] = 1;

    const topics = (ch.topics || []).map((tp) => {
      const tslug = slugify(tp.title, 60);
      const folder = topicFolder(tp.preview);
      const mine = cards.filter((c) => {
        const src = String(c.src || "");
        if (folder && src.indexOf("/" + folder + "/") >= 0) return true;
        return false;
      });
      const list = (mine.length ? mine : []).map((c) => ({
        n: c.n,
        src: String(c.src || "")
      })).filter((c) => c.src);
      topicN += 1;
      cardN += list.length;
      return {
        slug: tslug,
        title: String(tp.title || ""),
        count: Number(tp.count || list.length || 0),
        preview: String(tp.preview || (list[0] && list[0].src) || ""),
        cards: list
      };
    });

    const pyqCh = pyqSlug && jee.chapters[pyqSlug];
    chapters.push({
      slug,
      name: String(ch.name || ""),
      count: Number(ch.count || 0),
      importance: String(ch.importance || ""),
      image: String(ch.image || ""),
      pyqSlug: pyqSlug || "",
      pyqCount: pyqCh ? Number(pyqCh.count || (pyqCh.items || []).length || 0) : 0,
      pyqLabel: pyqCh ? String(pyqCh.label || ch.name) : "",
      ndaSlug: ndaSlug || "",
      ndaCount: ndaSlug && nda.chapters[ndaSlug] ? Number(nda.chapters[ndaSlug].count || 0) : 0,
      bitsatSlug: bitsatSlug || "",
      bitsatCount: bitsatSlug && bitsat.chapters[bitsatSlug] ? Number(bitsat.chapters[bitsatSlug].count || 0) : 0,
      topics,
      pyq: pyqCh ? clipItems(pyqCh.items, 16) : []
    });
  });

  const pyqExtra = Object.keys(jee.chapters || {})
    .filter((k) => !usedPyq[k])
    .map((k) => ({
      slug: k,
      label: String(jee.chapters[k].label || k),
      count: Number(jee.chapters[k].count || 0)
    }))
    .sort((a, b) => b.count - a.count);

  const yearMap = Object.create(null);
  Object.keys(jee.chapters || {}).forEach((k) => {
    (jee.chapters[k].items || []).forEach((it) => {
      const y = String(it.year || "");
      if (!/^\d{4}$/.test(y)) return;
      if (!yearMap[y]) yearMap[y] = { year: y, count: 0, items: [] };
      yearMap[y].count += 1;
      if (yearMap[y].items.length < 24) {
        yearMap[y].items.push({
          id: String(it.id || ""),
          slug: String(it.slug || "question"),
          t: String(it.t || "").replace(/\s+/g, " ").trim().slice(0, 160),
          year: y,
          exam: it.exam ? String(it.exam) : "",
          chapter: String(jee.chapters[k].label || k)
        });
      }
    });
  });
  const years = Object.keys(yearMap)
    .sort()
    .filter((y) => yearMap[y].count >= 50)
    .map((y) => yearMap[y]);

  const index = {
    generated: TODAY,
    site: SITE,
    totals: {
      chapters: chapters.length,
      topics: topicN,
      cards: cardN,
      jeePyq: Number(jee.count || 0),
      years: years.length
    },
    chapters,
    pyqExtra,
    years
  };

  const json = JSON.stringify(index);
  fs.writeFileSync(path.join(ROOT, "lib", "seo-maths-index.json"), json);
  fs.mkdirSync(path.join(ROOT, "data", "seo"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "data", "seo", "maths-index.json"), json);

  const urls = [];
  function add(loc, pri, freq) {
    urls.push({ loc, pri, freq });
  }
  add(SITE + "/maths", "1.0", "weekly");
  add(SITE + "/maths/pyq", "0.85", "weekly");
  years.forEach((y) => add(SITE + "/maths/pyq/" + y.year, "0.8", "weekly"));

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls
      .map(
        (u) =>
          "  <url><loc>" +
          u.loc +
          "</loc><lastmod>" +
          TODAY +
          "</lastmod><changefreq>" +
          u.freq +
          "</changefreq><priority>" +
          u.pri +
          "</priority></url>"
      )
      .join("\n") +
    "\n</urlset>\n";
  fs.writeFileSync(path.join(ROOT, "sitemap-maths.xml"), xml);

  console.log(
    JSON.stringify(
      {
        chapters: chapters.length,
        topics: topicN,
        cards: cardN,
        years: years.length,
        pyqExtra: pyqExtra.length,
        sitemapUrls: urls.length,
        bytes: json.length
      },
      null,
      2
    )
  );
}

main();
