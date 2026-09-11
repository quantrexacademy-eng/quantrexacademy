"use strict";
const { irodovStorageUrl, displaySrc } = require("../qx-owned-figures");
const src = "/assets/diagrams/qx-book-250e293106820500.png";
const u = irodovStorageUrl(src);
const d = displaySrc(src);
console.log(JSON.stringify({
  mapped: /irodov\/qx-irodov-250e293106820500/.test(u),
  firebase: /firebasestorage/.test(u),
  dispFb: /firebasestorage/.test(d),
  notLocal: !/assets\/diagrams/.test(d),
  u: (u || "").slice(0, 140)
}, null, 2));
if (!u || !/qx-irodov-250e293106820500/.test(u) || /assets\/diagrams/.test(d)) process.exit(1);
console.log("IRODOV MAP PASS");
