#!/usr/bin/env node
/**
 * Upload permanently wiped PYQ figures to Firebase Storage at the paths
 * the bank already references. Student site never calls Marks.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "data", "_migration", "wiped_upload_manifest.json");
const PROJECT = "quantrexacademy-app";
const BUCKET = "quantrexacademy-app.firebasestorage.app";

function loadJson(p, fb) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (_) { return fb; }
}

async function main() {
  const man = loadJson(MANIFEST, null);
  if (!man || !Array.isArray(man.rows)) {
    console.error("missing manifest", MANIFEST);
    process.exit(1);
  }
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
  let ok = 0, skip = 0, fail = 0;
  for (let i = 0; i < man.rows.length; i++) {
    const row = man.rows[i];
    const dest = row.storage;
    const file = row.file;
    if (!dest || !file || !fs.existsSync(file)) { fail += 1; continue; }
    try {
      const buf = fs.readFileSync(file);
      if (!buf || buf.length < 40) { fail += 1; continue; }
      await bucket.file(dest).save(buf, {
        resumable: false,
        metadata: {
          contentType: "image/png",
          cacheControl: "public,max-age=31536000",
          metadata: { qxWipe: "pale2" }
        }
      });
      ok += 1;
    } catch (e) {
      fail += 1;
      if (fail < 10) console.log("fail", dest, e.message);
    }
    if ((i + 1) % 25 === 0 || i + 1 === man.rows.length) {
      console.log("  upload", (i + 1) + "/" + man.rows.length, "ok=" + ok, "fail=" + fail);
    }
  }
  console.log("done ok", ok, "skip", skip, "fail", fail);
}

main().catch((e) => { console.error(e); process.exit(1); });
