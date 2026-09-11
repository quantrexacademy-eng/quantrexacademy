#!/usr/bin/env node
/**
 * Pale MARKS wipe on Firebase Storage PYQ figures, then overwrite.
 * Same formula-notes rule: never eat lum <= 180 ink.
 */
"use strict";

const PROJECT = "quantrexacademy-app";
const BUCKET = "quantrexacademy-app.firebasestorage.app";
const PREFIXES = ["questions/figs/pyq/", "questions/figs/nta_abhyas/"];

function initAdmin() {
  const appMod = require("firebase-admin/app");
  const stMod = require("firebase-admin/storage");
  if (!appMod.getApps().length) {
    appMod.initializeApp({
      credential: appMod.applicationDefault(),
      projectId: PROJECT,
      storageBucket: BUCKET
    });
  }
  return stMod.getStorage().bucket(BUCKET);
}

function paleWipeRaw(data, w, h, channels) {
  const total = w * h;
  const mark = new Uint8Array(total);
  for (let p = 0, i = 0; p < total; p++, i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const a = channels > 3 ? data[i + 3] : 255;
    if (a < 10) continue;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum <= 180) continue;
    const mx = r > g ? (r > b ? r : b) : (g > b ? g : b);
    const mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
    const chroma = mx - mn;
    const paleCyan = b > r + 3 && b > g && r > 200 && b > 245 && lum > 200 && lum < 253;
    const paleGrey = chroma <= 5 && lum > 215 && lum < 248;
    if (paleCyan || paleGrey) mark[p] = 1;
  }
  let hits = 0;
  for (let p = 0; p < total; p++) if (mark[p]) hits++;
  if (hits < 12) return null;
  for (let p = 0, i = 0; p < total; p++, i += channels) {
    if (!mark[p]) continue;
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    if (channels > 3) data[i + 3] = 255;
  }
  return { data, hits };
}

async function main() {
  const sharp = require("sharp");
  const bucket = initAdmin();
  let listed = 0, wiped = 0, skip = 0, fail = 0;
  for (const prefix of PREFIXES) {
    const [files] = await bucket.getFiles({ prefix, autoPaginate: true });
    console.log("prefix", prefix, "files", files.length);
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      listed += 1;
      try {
        const [buf] = await f.download();
        if (!buf || buf.length < 80) { skip += 1; continue; }
        const img = sharp(buf, { failOn: "none" }).rotate();
        const meta = await img.metadata();
        const w = meta.width || 0, h = meta.height || 0;
        if (w < 8 || h < 8 || w * h > 12e6) { skip += 1; continue; }
        const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const res = paleWipeRaw(data, info.width, info.height, info.channels || 4);
        if (!res) { skip += 1; continue; }
        const out = await sharp(res.data, {
          raw: { width: info.width, height: info.height, channels: info.channels || 4 }
        }).png({ compressionLevel: 4, effort: 2 }).toBuffer();
        await f.save(out, {
          resumable: false,
          metadata: {
            contentType: "image/png",
            cacheControl: "public,max-age=31536000",
            metadata: { qxWipe: "pale1" }
          }
        });
        wiped += 1;
      } catch (e) {
        fail += 1;
        if (fail < 8) console.log("fail", f.name, e.message);
      }
      if (listed % 80 === 0) {
        process.stdout.write("  " + listed + " wiped=" + wiped + " skip=" + skip + " fail=" + fail + "\r");
      }
    }
  }
  console.log("\ndone listed", listed, "wiped", wiped, "skip", skip, "fail", fail);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
