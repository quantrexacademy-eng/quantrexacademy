"use strict";
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const local = "b0cfafa35b5b8b26";
const orsrc = "ca245f4933217a9f";
const fb = "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/questions%2Ffigs%2Fexamgoal%2Ffly%2F%40width%2Fimage%2F6y3zli1mqoppsey%2Fbc5c981f-864a-4b9e-9ee9-20ee8400ac62%2F687187a0-6df2-11f1-9ee0-6b8578e694cb%2Ffile-6y3zli1mqoppsez.png?alt=media";
const fb2 = "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/questions%2Ffigs%2Fexamgoal%2Ffly%2F%40width%2Fimage%2F6y3zli1mqp10988%2F12ddb880-b531-479c-91be-15e39a4b1e84%2F8ff18380-6e1e-11f1-b20b-99712fa95c73%2Ffile-6y3zli1mqp10989.png?alt=media";

function hashes(s) {
  const buf = Buffer.from(String(s));
  return {
    md5_16: crypto.createHash("md5").update(buf).digest("hex").slice(0, 16),
    sha1_16: crypto.createHash("sha1").update(buf).digest("hex").slice(0, 16),
    sha256_16: crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16)
  };
}

const candidates = [
  fb, fb.split("?")[0], decodeURIComponent(fb),
  fb2, "file-6y3zli1mqoppsez.png", "file-6y3zli1mqp10989.png"
];
for (const c of candidates) {
  const h = hashes(c);
  const hit = h.md5_16 === local || h.sha1_16 === local || h.sha256_16 === local
    || h.md5_16 === orsrc || h.sha1_16 === orsrc || h.sha256_16 === orsrc;
  if (hit) console.log("HIT", c.slice(0, 80), h);
}
console.log("target", local, orsrc);
const png = path.join(__dirname, "..", "assets/diagrams/qx-self-b0cfafa35b5b8b26.png");
if (fs.existsSync(png)) {
  const b = fs.readFileSync(png);
  console.log("file md5_16", crypto.createHash("md5").update(b).digest("hex").slice(0, 16));
  console.log("file sha1_16", crypto.createHash("sha1").update(b).digest("hex").slice(0, 16));
  console.log("file sha256_16", crypto.createHash("sha256").update(b).digest("hex").slice(0, 16));
}
