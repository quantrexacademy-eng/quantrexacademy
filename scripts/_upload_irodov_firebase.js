#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "assets", "diagrams");
const PROJECT = "quantrexacademy-app";
const BUCKET = "quantrexacademy-app.firebasestorage.app";

async function main() {
  const appMod = require("firebase-admin/app");
  const stMod = require("firebase-admin/storage");
  if (!appMod.getApps().length) {
    appMod.initializeApp({
      credential: appMod.applicationDefault(),
      projectId: PROJECT,
      storageBucket: BUCKET
    });
  }
  const bucket = stMod.getStorage().bucket(BUCKET);
  const files = fs.readdirSync(DIR).filter((n) => /^qx-irodov-.*\.png$/i.test(n));
  console.log("irodov pngs", files.length);
  let ok = 0, fail = 0;
  for (const n of files) {
    const dest = "questions/figs/irodov/" + n;
    try {
      const buf = fs.readFileSync(path.join(DIR, n));
      if (buf.length < 40) { fail++; continue; }
      await bucket.file(dest).save(buf, {
        resumable: false,
        metadata: { contentType: "image/png", cacheControl: "public,max-age=31536000", metadata: { qxWipe: "pale2" } }
      });
      ok++;
    } catch (e) {
      fail++;
      if (fail < 6) console.log("fail", n, e.message);
    }
  }
  console.log("done ok", ok, "fail", fail);
}
main().catch((e) => { console.error(e); process.exit(1); });
