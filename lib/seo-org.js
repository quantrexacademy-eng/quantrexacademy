/** qxmd315: shared, factual brand JSON-LD + meta helpers for server-rendered SEO pages. */
const SITE = "https://www.quantrexacademy.com";
const LOGO = SITE + "/assets/quantrex-logo-3d-192.png";
const ORG = {
  "@type": "EducationalOrganization",
  "@id": SITE + "/#org",
  name: "Quantrex Academy",
  alternateName: "Quantrex",
  slogan: "Concept Create Destiny",
  url: SITE + "/",
  logo: { "@type": "ImageObject", url: LOGO, width: 192, height: 192 },
  sameAs: [
    "https://www.youtube.com/@quantrex-iitjee",
    "https://www.linkedin.com/in/ajay-kumar-saroj-63465a118",
    "https://play.google.com/store/apps/details?id=com.quantrexacademy.app"
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    telephone: "+91-87005-08344",
    url: "https://wa.me/918700508344",
    availableLanguage: ["English", "Hindi"]
  }
};
const WEBSITE = {
  "@type": "WebSite",
  "@id": SITE + "/#website",
  url: SITE + "/",
  name: "Quantrex Academy",
  publisher: { "@id": SITE + "/#org" },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: SITE + "/search?q={search_term_string}" },
    "query-input": "required name=search_term_string"
  }
};
function breadcrumb(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.filter((x) => x && x.name).map((x, i) => {
      const li = { "@type": "ListItem", position: i + 1, name: String(x.name) };
      if (x.url) li.item = x.url;
      return li;
    })
  };
}
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
/** Clip at a word boundary without cutting mid-word. */
function clip(s, n) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return t.slice(0, n).replace(/\s+\S*$/, "").replace(/[,;:\-–—\s]+$/, "") + "…";
}
/** Social card meta (OG + Twitter). */
function socialMeta(o) {
  const img = o.image || LOGO;
  return [
    `<meta property="og:type" content="${esc(o.type || "website")}">`,
    `<meta property="og:site_name" content="Quantrex Academy">`,
    `<meta property="og:locale" content="en_IN">`,
    `<meta property="og:title" content="${esc(o.title)}">`,
    `<meta property="og:description" content="${esc(o.desc)}">`,
    `<meta property="og:url" content="${esc(o.url)}">`,
    `<meta property="og:image" content="${esc(img)}">`,
    `<meta property="og:image:alt" content="${esc(o.imageAlt || "Quantrex Academy")}">`,
    `<meta name="twitter:card" content="${o.largeImage ? "summary_large_image" : "summary"}">`,
    `<meta name="twitter:title" content="${esc(o.title)}">`,
    `<meta name="twitter:description" content="${esc(o.desc)}">`,
    `<meta name="twitter:image" content="${esc(img)}">`
  ].join("\n  ");
}
module.exports = { SITE, LOGO, ORG, WEBSITE, breadcrumb, esc, clip, socialMeta };
