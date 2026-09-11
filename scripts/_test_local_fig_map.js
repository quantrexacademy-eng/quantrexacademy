"use strict";
const { displaySrc } = require("../qx-owned-figures");
const samples = [
  "/assets/diagrams/qx-self-b0cfafa35b5b8b26.png",
  "/assets/diagrams/qx-book-abbfd823c663a2a6.png"
];
for (const s of samples) {
  const d = displaySrc(s);
  console.log(JSON.stringify({
    local: s,
    disp: String(d || "").slice(0, 180),
    stillLocal: /\/assets\/diagrams\//i.test(d || ""),
    isProxy: /proxy-image/i.test(d || ""),
    empty: !d
  }));
}
