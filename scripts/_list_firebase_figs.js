#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "..");
const PROJECT = "quantrexacademy-app";
const BUCKET = "quantrexacademy-app.firebasestorage.app";
const OUT = path.join(ROOT, "data", "_migration", "firebase_figs_set.txt");

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
  const prefixes = ["questions/figs/"];
  const names = [];
  for (const prefix of prefixes) {
    const [files] = await bucket.getFiles({ prefix, autoPaginate: true });
    console.log("prefix", prefix, files.length);
    files.forEach((f) => names.push(f.name));
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, names.join("\n"));
  console.log("wrote", names.length, OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
