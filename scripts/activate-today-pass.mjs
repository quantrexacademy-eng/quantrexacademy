/**
 * One-off: activate 7-Day Pass for today's Razorpay / live_purchases buyers.
 * Run from QUANTREX/website. Do not print secrets.
 */
import { readFileSync } from "fs";
import { createHash } from "crypto";

const WEB = "E:/QUANTREX/website";
const envTxt = readFileSync(WEB + "/.env", "utf8");
function env(k) {
  const m = envTxt.match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].trim() : "";
}
const RZP_ID = env("RAZORPAY_KEY_ID");
const RZP_SEC = env("RAZORPAY_KEY_SECRET");
const FB_KEY = "AIzaSyDaUw4eXSA5PudxVI6HT3Al-3mD1N9tLXE";
const PROJECT = "quantrexacademy-app";
const EMAIL = "quantrexacademy@gmail.com";
const PASS = process.env.QX_ADMIN_PASSWORD || "function13@";

const startIst = Date.parse("2026-08-28T00:00:00+05:30");
const now = Date.now();
const startUnix = Math.floor(startIst / 1000);
const endUnix = Math.floor(now / 1000) + 60;

function fv(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    if (Number.isInteger(v)) return { integerValue: String(v) };
    return { doubleValue: v };
  }
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(fv) } };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  const fields = {};
  Object.keys(v).forEach((k) => { fields[k] = fv(v[k]); });
  return { mapValue: { fields } };
}

async function rzp(path) {
  const auth = Buffer.from(RZP_ID + ":" + RZP_SEC).toString("base64");
  const r = await fetch("https://api.razorpay.com/v1" + path, {
    headers: { Authorization: "Basic " + auth }
  });
  const j = await r.json();
  if (!r.ok) throw new Error("Razorpay " + r.status + " " + JSON.stringify(j));
  return j;
}

async function fbSignIn() {
  if (process.env.GOOGLE_TOKEN) {
    return { idToken: process.env.GOOGLE_TOKEN, email: "gcloud", localId: "gcloud" };
  }
  const r = await fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + FB_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASS, returnSecureToken: true })
    }
  );
  const j = await r.json();
  if (!j.idToken) throw new Error("Firebase login failed: " + (j.error && j.error.message));
  return j;
}

async function fsQuery(token, structuredQuery) {
  const r = await fetch(
    "https://firestore.googleapis.com/v1/projects/" + PROJECT + "/databases/(default)/documents:runQuery",
    {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery })
    }
  );
  return r.json();
}

function fieldsToObj(fields) {
  const out = {};
  if (!fields) return out;
  Object.keys(fields).forEach((k) => {
    const v = fields[k];
    if (v.stringValue != null) out[k] = v.stringValue;
    else if (v.integerValue != null) out[k] = Number(v.integerValue);
    else if (v.doubleValue != null) out[k] = v.doubleValue;
    else if (v.booleanValue != null) out[k] = v.booleanValue;
    else if (v.timestampValue != null) out[k] = v.timestampValue;
    else if (v.arrayValue) out[k] = (v.arrayValue.values || []).map((x) => x.stringValue || x);
  });
  return out;
}

async function writeSub(token, uid, extra) {
  const started = new Date();
  const expires = new Date(started.getTime() + 7 * 86400000);
  const body = {
    fields: {
      uid: fv(uid),
      active: fv(true),
      planId: fv("trial_7"),
      orderId: fv(extra.orderId || ("admin_today_" + Date.now())),
      amount: fv(Number(extra.amount || 9)),
      features: fv(["eng", "med", "jee_ts"]),
      startedAt: fv(started),
      expiresAt: fv(expires),
      activatedAt: fv(started),
      activation_source: fv("admin_today_7day"),
      paymentId: fv(extra.paymentId || ""),
      email: fv(extra.email || ""),
      phone: fv(extra.phone || "")
    }
  };
  const r = await fetch(
    "https://firestore.googleapis.com/v1/projects/" + PROJECT + "/databases/(default)/documents/subscriptions/" + encodeURIComponent(uid),
    {
      method: "PATCH",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );
  const j = await r.json();
  if (!r.ok) throw new Error("Firestore write " + uid + " " + JSON.stringify(j.error || j));
  return { uid, expires: expires.toISOString() };
}

const buyers = new Map();

function addBuyer(uid, meta) {
  if (!uid || String(uid).indexOf("admin_") === 0) return;
  const prev = buyers.get(uid) || {};
  buyers.set(uid, { ...prev, ...meta, uid });
}

try {
  if (!RZP_ID || !RZP_SEC) throw new Error("Razorpay env missing");
  const pays = await rzp("/payments?from=" + startUnix + "&to=" + endUnix + "&count=100");
  const items = pays.items || [];
  console.log("RZP_TODAY", items.length);

  for (const p of items) {
    const captured = p.status === "captured" || p.status === "authorized";
    const notes = p.notes || {};
    console.log("PAY", p.id, p.status, (p.amount || 0) / 100, notes.plan_key || notes.plan_id || "", notes.uid || "", notes.email || "");
    if (!captured) continue;
    let uid = notes.uid || "";
    let plan = notes.plan_key || notes.plan_id || "";
    if (p.order_id && (!uid || !plan)) {
      try {
        const od = await rzp("/orders/" + p.order_id);
        const n = od.notes || {};
        uid = uid || n.uid || "";
        plan = plan || n.plan_key || n.plan_id || "";
        notes.email = notes.email || n.email;
        notes.phone = notes.phone || n.phone;
      } catch (_) {}
    }
    if (!uid) continue;
    addBuyer(uid, {
      paymentId: p.id,
      orderId: p.order_id || "",
      amount: (p.amount || 0) / 100,
      email: notes.email || "",
      phone: notes.phone || "",
      plan
    });
  }

  const auth = await fbSignIn();
  console.log("FB_OK", auth.email || EMAIL, auth.localId);

  const live = await fsQuery(auth.idToken, {
    from: [{ collectionId: "live_purchases" }],
    orderBy: [{ field: { fieldPath: "ts" }, direction: "DESCENDING" }],
    limit: 50
  });
  for (const row of live) {
    const doc = row.document;
    if (!doc) continue;
    const d = fieldsToObj(doc.fields);
    const ts = Number(d.ts || 0);
    if (ts && ts < startIst) continue;
    console.log("LIVE", d.uid, d.name, d.course, d.planKey, ts ? new Date(ts).toISOString() : "");
    if (d.uid) addBuyer(d.uid, { name: d.name, plan: d.planKey, orderId: d.orderId || d.uidHash });
  }

  console.log("BUYERS", buyers.size);
  const results = [];
  for (const [uid, meta] of buyers) {
    try {
      const out = await writeSub(auth.idToken, uid, meta);
      results.push({ ok: true, ...out, email: meta.email, plan: meta.plan || "trial_7" });
      console.log("ACTIVATED", uid, meta.email || meta.name || "", out.expires);
    } catch (e) {
      results.push({ ok: false, uid, error: e.message });
      console.log("FAIL", uid, e.message);
    }
  }
  if (!buyers.size) console.log("NONE_TODAY");
} catch (e) {
  console.error("FATAL", e.message);
  process.exitCode = 1;
}
