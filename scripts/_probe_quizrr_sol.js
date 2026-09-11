#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const cfg = JSON.parse(fs.readFileSync("C:/Users/Admin/qx-hosting/data/quizrr_config.json", "utf8"));
const PACK = cfg.packId;
const TOKEN = cfg.token;
const TIDS = [
  "69de21e87e39d99b57bc5a88",
  "69de21f77e39d99b57bc5b75",
  "69de21ed7e39d99b57bc5ace"
];
async function get(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: "Bearer " + TOKEN,
      Accept: "application/json",
      Origin: "https://app.quizrr.in",
      Referer: "https://app.quizrr.in/",
      "x-no-compression": "1"
    }
  });
  const text = await res.text();
  let j; try { j = JSON.parse(text); } catch { j = text.slice(0, 180); }
  return { status: res.status, keys: j && typeof j === "object" ? Object.keys(j) : typeof j, preview: typeof j === "string" ? j : JSON.stringify(j).slice(0, 250) };
}
(async () => {
  for (const tid of TIDS) {
    const urls = [
      `https://api.quizrr.in/api/test/solution/${tid}?pack=${PACK}&offset=0&limit=1000`,
      `https://api.quizrr.in/api/v2/test/${PACK}/${tid}/check-submission`,
      `https://api.quizrr.in/api/test/detailedAnalysis/${tid}`,
      `https://api.quizrr.in/api/v2/answers/${tid}/test-wise`
    ];
    for (const u of urls) {
      const r = await get(u);
      console.log(r.status, u.split("/api/")[1].slice(0, 80), r.preview.slice(0, 180));
    }
    console.log("---");
  }
})();
