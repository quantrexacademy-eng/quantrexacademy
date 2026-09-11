"use strict";
const { irodovStorageUrl } = require("../qx-owned-figures");
(async () => {
  const html = await (await fetch("https://www.quantrexacademy.com/app.html?n=" + Date.now())).text();
  const build = (html.match(/QX_BUILD\s*=\s*"([^"]+)"/) || [])[1] || "";
  const css = /qx-academy-id\.css\?v=qxfix77/.test(html);
  const owned = irodovStorageUrl("/assets/diagrams/qx-book-250e293106820500.png");
  const head = await fetch(owned, { method: "GET" });
  const buf = Buffer.from(await head.arrayBuffer());
  const out = {
    build,
    css,
    fbStatus: head.status,
    fbType: head.headers.get("content-type"),
    fbLen: buf.length,
    png: buf[0] === 0x89 && buf[1] === 0x50
  };
  console.log(JSON.stringify(out, null, 2));
  if (build !== "qxfix77" || !css || head.status !== 200 || buf.length < 10000) process.exit(1);
  console.log("LIVE PASS");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
