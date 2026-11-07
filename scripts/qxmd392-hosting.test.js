// node scripts/qxmd392-hosting.test.js — firebase.json ignore + cache intent (glob approximated: ** any path, * no slash, @(a|b))
const assert = require("assert"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), cfg = JSON.parse(fs.readFileSync(path.join(root, "firebase.json"), "utf8"));
const h = Array.isArray(cfg.hosting) ? cfg.hosting[0] : cfg.hosting;
const rx = (g) => new RegExp("^" + g.replace(/^\//, "").replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/@\\\(([^)]*)\\\)/g, (_, a) => "(" + a.replace(/\\\|/g, "|") + ")")
  .replace(/\*\*\//g, "(?:.*/)?").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*") + "$");
const ignored = (f) => h.ignore.some((g) => rx(g).test(f));
const cacheFor = (f) => { let v = null; h.headers.forEach((x) => { if (rx(x.source).test(f)) x.headers.forEach((k) => { if (k.key === "Cache-Control") v = k.value; }); }); return v; };
let n = 0; const t = (name, fn) => { fn(); n++; console.log("ok", n, name); };
t("internal notes/backend source/config are not deployed", () => {
  ["functions/index.js", "firestore.rules", "storage.rules", "package.json", "vercel.json", "_gh_body.json", "_deploy_ui.txt", "_live_aiims.json", "body.txt",
   "JOVI_SETUP.txt", "PROJECT_FULL_BACKUP_DATE.txt", "DOMAIN-SETUP-GODADDY.txt", "DOMAIN-SETUP-FIREBASE-GODADDY.txt", "scripts/qxmd392-nav.test.js", ".git/HEAD", ".gitignore", "AGENTS.md", "deploy.bat"]
    .forEach((f) => assert(ignored(f), "should ignore " + f));
});
t("runtime files still deployed", () => {
  const html = fs.readFileSync(path.join(root, "app.html"), "utf8");
  const refs = [...html.matchAll(/(?:src|href)="([^"#?:]+)(?:\?[^"]*)?"/g)].map((m) => m[1].replace(/^\//, "")).filter((f) => fs.existsSync(path.join(root, f)));
  assert(refs.length > 50);
  refs.concat(["robots.txt", "sitemap.xml", "version.json", "sw.js", ".well-known/assetlinks.json", "app.html", "index.html", "privacy.html", "data/banks/chapters/jee_main/index.json", "qx-start-index.js", "qx-list-filters.js"])
    .forEach((f) => assert(!ignored(f), "must deploy " + f));
});
t("stable-name JS/CSS revalidate (no 1-year immutable)", () => { ["app.js", "test-engine.js", "assets/qxmd392-layout.css"].forEach((f) => assert.strictEqual(cacheFor(f), "public, max-age=0, must-revalidate")); });
t("HTML/sw/version still revalidate or no-store; images keep long cache", () => { assert(/max-age=0/.test(cacheFor("app.html"))); assert(/max-age=0/.test(cacheFor("sw.js"))); assert(/no-store/.test(cacheFor("version.json"))); assert(/immutable/.test(cacheFor("assets/x.png"))); });
t("preview config = live config + noindex; live config has no noindex", () => {
  const pv = JSON.parse(fs.readFileSync(path.join(root, "firebase.preview.json"), "utf8")); const ph = Array.isArray(pv.hosting) ? pv.hosting[0] : pv.hosting;
  assert(ph.headers.some((x) => x.source === "**" && x.headers.some((k) => k.key === "X-Robots-Tag" && /noindex/.test(k.value))));
  assert(!JSON.stringify(h.headers).includes("X-Robots-Tag"));
  assert.deepStrictEqual(ph.rewrites, h.rewrites); assert(h.ignore.every((g) => ph.ignore.includes(g)));
});
t("account deletion request page deploys and is linked; no invented promises", () => {
  assert(!ignored("delete-account.html")); const d = fs.readFileSync(path.join(root, "delete-account.html"), "utf8");
  assert(d.includes("quantrexacademy@gmail.com") && d.includes("com.quantrexacademy.app")); assert(!/\b\d+\s*(days|hours)\b/i.test(d), "no turnaround promise");
  ["index.html", "login.html", "privacy.html", "terms.html"].forEach((f) => assert(fs.readFileSync(path.join(root, f), "utf8").includes('href="delete-account.html"'), f));
});
console.log("PASS", n);
