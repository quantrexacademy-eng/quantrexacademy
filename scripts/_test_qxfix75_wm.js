"use strict";
const { ownedFigureUrl, displaySrc, isForeignHost, isCardArt } = require("../qx-owned-figures");

const rfc = "https://cdn-assets.getmarks.app/app_assets/img/revision_flash_cards/cards/subjects/physics/electrostatics/electric-charge-and-coulomb-s-law/electric_charge_and_coulomb_s_law_6a796502849920e27f682daa.webp";
const fc = "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/questions%2Ffigs%2Fgetmarks-assets%2Fapp_assets%2Fimg%2Fui%2Fformula_cards%2Fcards%2Fchemistry%2Falcohols_phenols_and_ethers_00337_8ed94cc113c202a4ad91c980.webp?alt=media";

const ownedRfc = ownedFigureUrl(rfc);
const dispRfc = displaySrc(rfc);
const dispFc = displaySrc(fc);

const report = {
  rfcIsCard: isCardArt(rfc),
  fcIsCard: isCardArt(fc),
  rfcForeign: isForeignHost(rfc),
  rfcOwnedHasGetmarksAssets: /getmarks-assets/i.test(ownedRfc),
  rfcOwnedHasMarksHost: /getmarks\.app|quizrr\.in/i.test(ownedRfc),
  rfcDispIsProxy: /proxy-image/i.test(dispRfc),
  rfcDispHasFc: /fc=1/i.test(dispRfc),
  rfcDispHasMarksHost: /getmarks|quizrr/i.test(dispRfc) && !/url=/.test(dispRfc),
  rfcProxyInnerIsFirebase: /firebasestorage/i.test(decodeURIComponent((dispRfc.match(/url=([^&]+)/) || [])[1] || "")),
  fcDispIsProxy: /proxy-image/i.test(dispFc),
  fcDispHasFc: /fc=1/i.test(dispFc),
  fcDispHasMarksHost: /getmarks\.app/i.test(dispFc)
};

console.log(JSON.stringify(report, null, 2));
const fail = [];
if (!report.rfcIsCard || !report.fcIsCard) fail.push("card detect");
if (!report.rfcOwnedHasGetmarksAssets) fail.push("rfc map path");
if (report.rfcOwnedHasMarksHost) fail.push("rfc owned still marks");
if (!report.rfcDispIsProxy || !report.rfcDispHasFc) fail.push("rfc display");
if (!report.rfcProxyInnerIsFirebase) fail.push("rfc proxy inner");
if (report.rfcDispHasMarksHost) fail.push("rfc display host");
if (!report.fcDispIsProxy || !report.fcDispHasFc) fail.push("fc display");
if (report.fcDispHasMarksHost) fail.push("fc display host");
if (fail.length) {
  console.error("FAIL", fail.join(", "));
  process.exit(1);
}
console.log("PASS");
