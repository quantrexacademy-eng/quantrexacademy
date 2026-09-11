"use strict";
(async () => {
  const html = await (await fetch("https://www.quantrexacademy.com/app.html?n=" + Date.now())).text();
  const build = (html.match(/QX_BUILD\s*=\s*"([^"]+)"/) || [])[1] || "";
  const sample = "https://cdn-question-pool.getmarks.app/nta_abhyas/jee_main/images/4412s1.png";
  const owned = "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/"
    + encodeURIComponent("questions/figs/nta_abhyas/jee_main/images/4412s1.png") + "?alt=media";
  const proxy = "https://www.quantrexacademy.com/api/proxy-image?clean=1&v=wm2&url=" + encodeURIComponent(owned);
  const r = await fetch(proxy);
  const buf = Buffer.from(await r.arrayBuffer());
  const out = {
    build,
    proxyStatus: r.status,
    type: r.headers.get("content-type"),
    clean: r.headers.get("x-qx-clean"),
    len: buf.length
  };
  console.log(JSON.stringify(out, null, 2));
  if (build !== "qxfix78") process.exit(1);
  console.log("LIVE BUILD OK");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
