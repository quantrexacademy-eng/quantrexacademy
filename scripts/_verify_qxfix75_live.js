"use strict";
const { ownedFigureUrl, displaySrc } = require("../qx-owned-figures");

async function get(url) {
  const res = await fetch(url, { redirect: "follow" });
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    status: res.status,
    type: res.headers.get("content-type") || "",
    clean: res.headers.get("x-qx-clean") || "",
    proxy: res.headers.get("x-qx-proxy") || "",
    len: buf.length,
    head: buf.slice(0, 16).toString("hex")
  };
}

(async () => {
  const app = await fetch("https://www.quantrexacademy.com/app.html?nocache=" + Date.now());
  const html = await app.text();
  const build = (html.match(/QX_BUILD\s*=\s*"([^"]+)"/) || [])[1] || "";
  const rfcMarks = "https://cdn-assets.getmarks.app/app_assets/img/revision_flash_cards/cards/subjects/physics/electrostatics/electric-charge-and-coulomb-s-law/electric_charge_and_coulomb_s_law_6a796502849920e27f682daa.webp";
  const owned = ownedFigureUrl(rfcMarks);
  const disp = displaySrc(rfcMarks);
  const liveDisp = "https://www.quantrexacademy.com" + disp;
  const fcFb = "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/questions%2Ffigs%2Fgetmarks-assets%2Fapp_assets%2Fimg%2Fui%2Fformula_cards%2Fcards%2Fchemistry%2Falcohols_phenols_and_ethers_00337_8ed94cc113c202a4ad91c980.webp?alt=media";
  const fcDisp = displaySrc(fcFb);
  const liveFc = "https://www.quantrexacademy.com" + fcDisp;

  const [fbRfc, proxyRfc, proxyFc] = await Promise.all([
    get(owned),
    get(liveDisp),
    get(liveFc)
  ]);

  const out = {
    build,
    rfcDispHasFc: /fc=1/.test(disp),
    rfcDispNoMarksHost: !/getmarks\.app/.test(disp),
    fbRfc,
    proxyRfc,
    proxyFc,
    fcDispHasFc: /fc=1/.test(fcDisp)
  };
  console.log(JSON.stringify(out, null, 2));
  const ok = build === "qxfix75"
    && fbRfc.status === 200
    && proxyRfc.status === 200
    && /image\//i.test(proxyRfc.type)
    && proxyRfc.clean === "1"
    && proxyFc.status === 200
    && /image\//i.test(proxyFc.type)
    && proxyFc.clean === "1"
    && out.rfcDispHasFc
    && out.rfcDispNoMarksHost;
  if (!ok) {
    console.error("LIVE FAIL");
    process.exit(1);
  }
  console.log("LIVE PASS");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
