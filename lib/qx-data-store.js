/**
 * qxmd328: server-side JSON reader for Cloud Functions (seo-q, seo-pages).
 * Order: bundled disk -> in-memory LRU -> Cloud Storage bucket in us-central1
 * (same region as functions = no Hosting bandwidth, no inter-region egress).
 * Hosting HTTP is used ONLY as an emergency fallback if Storage errors, and every
 * such fallback is logged (qx-data-store hosting-fallback) so it can be spotted.
 * Data in the bucket is a mirror of website/data/seo/** — sync with
 * scripts/sync-seo-data-to-gcs.ps1 whenever data/seo is rebuilt.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = process.env.QX_SITE_ROOT || process.cwd();
const BUCKET = process.env.QX_DATA_BUCKET || "quantrexacademy-app-seo-uc1";
const MAX_BYTES = Number(process.env.QX_DATA_CACHE_BYTES || 350 * 1024 * 1024);

const _mem = new Map(); // rel -> { v, size }
const _inflight = new Map();
let _bytes = 0;
let _bucket = null;

function bucket() {
  if (_bucket) return _bucket;
  const admin = require("firebase-admin");
  if (!admin.apps.length) admin.initializeApp();
  _bucket = admin.storage().bucket(BUCKET);
  return _bucket;
}

function remember(rel, v, size) {
  if (_mem.has(rel)) { _bytes -= _mem.get(rel).size; _mem.delete(rel); }
  _mem.set(rel, { v, size });
  _bytes += size;
  while (_bytes > MAX_BYTES && _mem.size > 1) {
    const k = _mem.keys().next().value;
    _bytes -= _mem.get(k).size;
    _mem.delete(k);
  }
}

function normRel(rel) {
  return String(rel || "").replace(/\\/g, "/").replace(/^\/+/, "").split("?")[0];
}

async function fromHosting(req, rel) {
  const host = String((req && req.headers && (req.headers["x-forwarded-host"] || req.headers.host)) || "www.quantrexacademy.com")
    .split(",")[0].trim();
  console.warn("qx-data-store hosting-fallback", rel);
  const r = await fetch("https://" + host + "/" + rel);
  if (!r.ok) return null;
  return await r.text();
}

async function load(req, rel) {
  try {
    const t = fs.readFileSync(path.join(ROOT, rel), "utf8");
    return t;
  } catch (_) {}
  try {
    const [buf] = await bucket().file(rel).download();
    return buf.toString("utf8");
  } catch (e) {
    if (e && (e.code === 404 || /No such object/i.test(String(e.message)))) return null;
    console.error("qx-data-store gcs", rel, e && e.message);
  }
  try { return await fromHosting(req, rel); } catch (_) { return null; }
}

async function readJson(req, relIn) {
  const rel = normRel(relIn);
  if (!rel || rel.indexOf("..") >= 0) return null;
  const hit = _mem.get(rel);
  if (hit) { _mem.delete(rel); _mem.set(rel, hit); return hit.v; }
  if (_inflight.has(rel)) return _inflight.get(rel);
  const p = (async () => {
    const txt = await load(req, rel);
    if (txt == null) return null;
    let v = null;
    try { v = JSON.parse(txt); } catch (_) { return null; }
    remember(rel, v, txt.length);
    return v;
  })();
  _inflight.set(rel, p);
  try { return await p; } finally { _inflight.delete(rel); }
}

module.exports = { readJson, BUCKET };
