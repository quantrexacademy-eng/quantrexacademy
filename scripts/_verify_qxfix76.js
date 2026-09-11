"use strict";
(async () => {
  const t = await (await fetch("https://www.quantrexacademy.com/app.html?n=" + Date.now())).text();
  const build = (t.match(/QX_BUILD\s*=\s*"([^"]+)"/) || [])[1] || "";
  const css = /qx-fig-proof\.css\?v=qxfix76/.test(t);
  const js = /qx-image-clean\.js\?v=qxfix76/.test(t);
  const qf = /question-format\.js\?v=qxfix76/.test(t);
  const proof = await (await fetch("https://www.quantrexacademy.com/assets/qx-fig-proof.css?v=qxfix76")).text();
  const out = {
    build,
    css,
    js,
    qf,
    landHost: /qx-fig-land-host/.test(proof),
    twoCol: /grid-template-columns:\s*1fr 1fr/.test(proof)
  };
  console.log(JSON.stringify(out, null, 2));
  if (build !== "qxfix76" || !css || !js || !qf || !out.landHost || !out.twoCol) process.exit(1);
  console.log("LIVE PASS");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
