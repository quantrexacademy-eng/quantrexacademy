#!/usr/bin/env node
"use strict";
const fs = require("fs");
const cfg = JSON.parse(fs.readFileSync("C:/Users/Admin/qx-hosting/data/quizrr_config.json", "utf8"));
const st = JSON.parse(fs.readFileSync("C:/Users/Admin/quizrr_login/storage_state.json", "utf8"));
const cookie = (st.cookies || []).map((c) => c.name + "=" + c.value).join("; ");
const token = (st.cookies || []).find((c) => c.name === "token");
const PACK = "69f8344e6778181a3132ae94";
const TID = "69de21ed7e39d99b57bc5ace";
(async () => {
  const tok = (token && token.value) || cfg.token;
  const res = await fetch(`https://api.quizrr.in/api/test/solution/${TID}?pack=${PACK}&offset=0&limit=1000`, {
    headers: {
      Authorization: "Bearer " + tok,
      Cookie: cookie,
      Accept: "application/json",
      Origin: "https://app.quizrr.in",
      Referer: "https://app.quizrr.in/",
      "x-no-compression": "1"
    }
  });
  const text = await res.text();
  let keys = 0;
  try {
    const j = JSON.parse(text);
    const s = JSON.stringify(j);
    keys = (s.match(/"isCorrect":true/g) || []).length;
    const cvs = (s.match(/"correctValue":[^n]/g) || []).length;
    console.log(JSON.stringify({ status: res.status, keys, cvs, preview: text.slice(0, 220) }));
  } catch {
    console.log(JSON.stringify({ status: res.status, preview: text.slice(0, 220) }));
  }
})();
