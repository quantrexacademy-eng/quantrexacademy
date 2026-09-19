#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const PROJECT = "quantrexacademy-app";
const NAME = "projects/" + PROJECT + "/databases/(default)/documents/app_config/question_settings";
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "qx-question-settings.json"), "utf8"));

function fv(v) {
  if (v == null) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fv) } };
  if (typeof v === "object") {
    const fields = {};
    Object.keys(v).forEach((k) => { fields[k] = fv(v[k]); });
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

function req(method, url, token, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        "Content-Length": data ? Buffer.byteLength(data) : 0
      }
    }, (res) => {
      let buf = "";
      res.on("data", (c) => { buf += c; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(buf || "{}")); } catch (_) { resolve({ raw: buf }); }
        } else reject(new Error(res.statusCode + " " + buf.slice(0, 400)));
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  const token = String(process.env.FB_TOKEN || "").trim();
  if (!token) {
    console.error("Set FB_TOKEN");
    process.exit(1);
  }
  const fields = {
    build: fv(cfg.build),
    source: fv(cfg.source),
    settings: fv(cfg.settings),
    questionSettings: fv(cfg.questionSettings),
    updatedAt: fv(new Date().toISOString())
  };
  const url = "https://firestore.googleapis.com/v1/" + NAME;
  const out = await req("PATCH", url + "?updateMask.fieldPaths=build&updateMask.fieldPaths=source&updateMask.fieldPaths=settings&updateMask.fieldPaths=questionSettings&updateMask.fieldPaths=updatedAt", token, { fields });
  console.log("OK", out && out.name);
})().catch((e) => {
  console.error("FAIL", e.message || e);
  process.exit(1);
});
