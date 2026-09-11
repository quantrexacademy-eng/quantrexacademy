#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { IRODOV_AKCR } = (function () {
  const mod = require("../qx-owned-figures");
  return { IRODOV_AKCR: null, mod };
})();
const owned = require("../qx-owned-figures");
const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "assets", "diagrams");
const BUCKET = "quantrexacademy-app.firebasestorage.app";

function token() {
  return execSync("gcloud auth application-default print-access-token", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function hashes() {
  const src = fs.readFileSync(path.join(ROOT, "qx-owned-figures.js"), "utf8");
  const m = src.match(/const IRODOV_AKCR = (\{[\s\S]*?\});/);
  if (!m) return [];
  const obj = JSON.parse(m[1]);
  return Object.keys(obj).map((k) => String(obj[k]).replace(/^qx-irodov-/i, "").toLowerCase());
}

async function main() {
  let access = token();
  const list = hashes();
  console.log("irodov hashes", list.length);
  let ok = 0, skip = 0, fail = 0, missing = 0;
  for (const h of list) {
    const book = path.join(DIR, "qx-book-" + h + ".png");
    const iro = path.join(DIR, "qx-irodov-" + h + ".png");
    let file = "";
    let sz = 0;
    if (fs.existsSync(book) && fs.statSync(book).size > 20000) {
      file = book;
      sz = fs.statSync(book).size;
    } else if (fs.existsSync(iro) && fs.statSync(iro).size > 20000) {
      file = iro;
      sz = fs.statSync(iro).size;
    }
    if (!file) {
      missing++;
      continue;
    }
    const dest = "questions/figs/irodov/qx-irodov-" + h + ".png";
    try {
      const buf = fs.readFileSync(file);
      const url = "https://storage.googleapis.com/upload/storage/v1/b/" + BUCKET
        + "/o?uploadType=media&name=" + encodeURIComponent(dest);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + access,
          "Content-Type": "image/png"
        },
        body: buf
      });
      if (!res.ok) throw new Error("upload " + res.status);
      ok++;
      if (ok % 20 === 0) console.log("uploaded", ok, "last", h, sz);
    } catch (e) {
      fail++;
      if (fail < 8) console.log("fail", h, e.message);
    }
  }
  console.log("done ok", ok, "skip", skip, "fail", fail, "missingLocal", missing);
}

main().catch((e) => {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
});
