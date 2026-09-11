#!/usr/bin/env node
/**
 * One-time: copy revision flash card images onto Quantrex Firebase Storage.
 * Uses gcloud ADC (no firebase-admin install).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const DIR = path.join(ROOT, "data", "rfc_offline", "chapters");
const BUCKET = "quantrexacademy-app.firebasestorage.app";
const CONCURRENCY = 5;
const STATE = path.join(ROOT, "data", "_migration", "rfc_upload_state.json");

function token() {
  return execSync("gcloud auth application-default print-access-token", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function collectUrls() {
  const set = new Set();
  for (const name of fs.readdirSync(DIR)) {
    if (!/\.json$/i.test(name)) continue;
    const j = JSON.parse(fs.readFileSync(path.join(DIR, name), "utf8"));
    const cards = Array.isArray(j.cards) ? j.cards : [];
    for (const c of cards) {
      const u = String((c && c.src) || "").trim();
      if (/cdn-assets\.getmarks\.app/i.test(u)) set.add(u.split("?")[0]);
    }
  }
  return [...set];
}

function storagePathFromMarks(url) {
  const m = String(url || "").match(/cdn-assets\.getmarks\.app\/(.+?)(?:\?|#|$)/i);
  if (!m) return "";
  let rest = m[1];
  try { rest = decodeURIComponent(rest); } catch (_) { /* */ }
  return "questions/figs/getmarks-assets/" + rest;
}

async function main() {
  let access = token();
  const urls = collectUrls();
  let state = { done: {}, ok: 0, fail: 0, skip: 0 };
  try {
    if (fs.existsSync(STATE)) state = Object.assign(state, JSON.parse(fs.readFileSync(STATE, "utf8")));
  } catch (_) { /* */ }
  if (!state.done) state.done = {};
  console.log("rfc unique", urls.length, "already", Object.keys(state.done).length);

  function authHeaders(extra) {
    return Object.assign({ Authorization: "Bearer " + access }, extra || {});
  }

  async function exists(dest) {
    const url = "https://storage.googleapis.com/storage/v1/b/" + BUCKET + "/o/" + encodeURIComponent(dest);
    const res = await fetch(url, { headers: authHeaders() });
    return res.ok;
  }

  async function upload(dest, buf, ctype) {
    const url = "https://storage.googleapis.com/upload/storage/v1/b/" + BUCKET
      + "/o?uploadType=media&name=" + encodeURIComponent(dest);
    const res = await fetch(url, {
      method: "POST",
      headers: authHeaders({
        "Content-Type": /image\//i.test(ctype) ? ctype : "image/webp"
      }),
      body: buf
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error("upload " + res.status + " " + t.slice(0, 120));
    }
  }

  let i = 0;
  let lastTok = Date.now();
  async function one(u) {
    const dest = storagePathFromMarks(u);
    if (!dest) { state.fail++; return; }
    if (state.done[dest] === "ok") { state.skip++; return; }
    try {
      if (Date.now() - lastTok > 40 * 60 * 1000) {
        access = token();
        lastTok = Date.now();
      }
      if (await exists(dest)) {
        state.done[dest] = "ok";
        state.skip++;
        return;
      }
      const res = await fetch(u, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
          Referer: "https://www.quantrexacademy.com/"
        }
      });
      if (!res.ok) throw new Error("http " + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 80) throw new Error("tiny " + buf.length);
      const ctype = (res.headers.get("content-type") || "image/webp").split(";")[0];
      await upload(dest, buf, ctype);
      state.done[dest] = "ok";
      state.ok++;
    } catch (e) {
      state.fail++;
      state.done[dest] = "fail";
      if (state.fail < 10) console.log("fail", dest.slice(-70), e.message);
    }
  }

  async function worker() {
    while (i < urls.length) {
      const u = urls[i++];
      await one(u);
      const n = state.ok + state.skip + state.fail;
      if (n && n % 30 === 0) {
        fs.writeFileSync(STATE, JSON.stringify({
          ok: state.ok, fail: state.fail, skip: state.skip, done: state.done
        }));
        console.log("progress ok", state.ok, "skip", state.skip, "fail", state.fail, "i", i);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  fs.writeFileSync(STATE, JSON.stringify({
    ok: state.ok, fail: state.fail, skip: state.skip, done: state.done
  }));
  console.log("done ok", state.ok, "skip", state.skip, "fail", state.fail, "total", urls.length);
}

main().catch((e) => {
  console.error(e && e.message ? e.message : e);
  process.exit(1);
});
