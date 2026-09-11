"use strict";
const { irodovStorageUrl } = require("../qx-owned-figures");
(async () => {
  const samples = [
    "/assets/diagrams/qx-book-250e293106820500.png",
    "https://cdn-question-pool.getmarks.app/2026_modules/jee_advanced_physics/AKCR2_1.webp",
    "qx-irodov-08b62a12684c9ce2.png",
    "AKCR2_47"
  ];
  for (const s of samples) {
    const u = irodovStorageUrl(s);
    if (!u) {
      console.log("NOMAP", s);
      continue;
    }
    const r = await fetch(u);
    const b = Buffer.from(await r.arrayBuffer());
    console.log(r.status, b.length, r.headers.get("content-type"), s.slice(0, 70));
  }
})();
