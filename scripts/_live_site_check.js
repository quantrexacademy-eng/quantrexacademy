#!/usr/bin/env node
"use strict";
(async () => {
  const app = await (await fetch("https://www.quantrexacademy.com/app.html", { cache: "no-store" })).text();
  const build = (app.match(/QX_BUILD\s*=\s*"([^"]+)"/) || [])[1] || "";
  const title = (app.match(/<title>([^<]+)/) || [])[1] || "";
  const pages = {};
  for (const u of [
    "https://www.quantrexacademy.com/",
    "https://www.quantrexacademy.com/login.html",
    "https://www.quantrexacademy.com/examgoal-test-series.html",
    "https://www.quantrexacademy.com/quantrex-test-series.html",
    "https://www.quantrexacademy.com/pay.html",
    "https://www.quantrexacademy.com/teacher-login.html"
  ]) {
    const r = await fetch(u, { cache: "no-store" });
    const t = await r.text();
    pages[u.replace("https://www.quantrexacademy.com", "")] = {
      status: r.status,
      title: (t.match(/<title>([^<]+)/) || [])[1] || "",
      getmarks: /GetMarks|Marks App/i.test(t),
      quantrex: /Quantrex/i.test(t)
    };
  }
  const cat = await (await fetch("https://www.quantrexacademy.com/api/catalog?action=qs&ids=27196,27189,24475")).json();
  const qs = (cat.questions || []).map((q) => {
    const opts = q.options || [];
    return {
      id: q.id,
      nOpts: opts.length,
      optImg: opts.map((o) => /<img/i.test(String(o || ""))),
      optText: opts.map((o) => String(o || "").replace(/<[^>]+>/g, " ").trim().slice(0, 24)),
      stemImg: /<img/i.test(String(q.q || ""))
    };
  });
  console.log(JSON.stringify({ liveBuild: build, liveTitle: title, pages, catalog: qs }, null, 2));
})();
