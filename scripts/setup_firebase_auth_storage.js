const https = require("https");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROJECT_ID = "quantrexacademy-live";
const API_KEY = "AIzaSyDdzzuny3f9N5jZGRWotSmY4kZXZUK2MJs";
const TEST_EMAIL = "quantrexacademy@gmail.com";
const TEST_PASSWORD = "function13@";
const BUCKET = "quantrexacademy-live.firebasestorage.app";
const DOMAINS = [
  "localhost",
  "quantrexacademy-live.web.app",
  "quantrexacademy-live.firebaseapp.com",
  "quantrexacademy-lemon.vercel.app",
  "quantrexacademy.vercel.app"
];

const credPath = path.join(process.env.APPDATA || "", "gcloud", "application_default_credentials.json");

function request(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = body ? (typeof body === "string" ? body : JSON.stringify(body)) : null;
    const h = { ...(headers || {}) };
    if (data && !h["Content-Length"]) h["Content-Length"] = Buffer.byteLength(data);
    const req = https.request(
      { method, hostname: u.hostname, path: u.pathname + u.search, headers: h },
      res => {
        let out = "";
        res.on("data", c => (out += c));
        res.on("end", () => {
          let json = null;
          try { json = out ? JSON.parse(out) : null; } catch (_) { json = { raw: out }; }
          resolve({ status: res.statusCode, json });
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getAccessToken() {
  const creds = JSON.parse(fs.readFileSync(credPath, "utf8"));
  const body = new URLSearchParams({
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    refresh_token: creds.refresh_token,
    grant_type: "refresh_token"
  }).toString();
  const res = await request("POST", "https://oauth2.googleapis.com/token", {
    "Content-Type": "application/x-www-form-urlencoded"
  }, body);
  if (!res.json?.access_token) throw new Error("Token refresh failed");
  return res.json.access_token;
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Goog-User-Project": PROJECT_ID
  };
}

async function enableApi(token, service) {
  const url = `https://serviceusage.googleapis.com/v1/projects/${PROJECT_ID}/services/${service}:enable`;
  return request("POST", url, authHeaders(token), "");
}

async function createIdpConfig(token, idpId) {
  const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/defaultSupportedIdpConfigs?idpId=${encodeURIComponent(idpId)}`;
  const res = await request("POST", url, authHeaders(token), { enabled: true });
  if (res.status === 409) {
    const patchUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/defaultSupportedIdpConfigs/${encodeURIComponent(idpId)}?updateMask=enabled`;
    const patch = await request("PATCH", patchUrl, authHeaders(token), { enabled: true });
    return { step: `idp_${idpId}`, status: patch.status, detail: patch.json, action: "patched" };
  }
  return { step: `idp_${idpId}`, status: res.status, detail: res.json, action: "created" };
}

async function setAuthorizedDomains(token) {
  const get = await request("GET", `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`, authHeaders(token));
  const existing = get.json?.authorizedDomains || [];
  const merged = [...new Set([...existing, ...DOMAINS])];
  const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=authorizedDomains`;
  const res = await request("PATCH", url, authHeaders(token), { authorizedDomains: merged });
  return { step: "authorized_domains", status: res.status, detail: res.json, domains: merged };
}

async function createTestUser() {
  const body = JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, returnSecureToken: true });
  const res = await request("POST", `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    "Content-Type": "application/json"
  }, body);
  return { step: "create_user", status: res.status, detail: res.json };
}

async function signInTest() {
  const body = JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, returnSecureToken: true });
  const res = await request("POST", `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
    "Content-Type": "application/json"
  }, body);
  return { step: "sign_in_test", status: res.status, ok: res.status === 200, detail: res.json };
}

async function createStorageBucket(token) {
  const url = `https://storage.googleapis.com/storage/v1/b?project=${PROJECT_ID}`;
  const res = await request("POST", url, authHeaders(token), {
    name: BUCKET,
    location: "ASIA-SOUTH1",
    storageClass: "STANDARD",
    iamConfiguration: { uniformBucketLevelAccess: { enabled: true } }
  });
  return { step: "storage_bucket", status: res.status, detail: res.json };
}

async function main() {
  const report = { project: PROJECT_ID, steps: [], at: new Date().toISOString() };
  const token = await getAccessToken();

  for (const api of ["identitytoolkit.googleapis.com", "firebasestorage.googleapis.com"]) {
    const r = await enableApi(token, api);
    report.steps.push({ step: `enable_${api}`, status: r.status, detail: r.json });
    console.log(`enable_${api}: HTTP ${r.status}`);
  }

  for (const idp of ["password", "google.com"]) {
    const r = await createIdpConfig(token, idp);
    report.steps.push(r);
    console.log(`${r.step}: HTTP ${r.status} (${r.action || ""})`);
  }

  try {
    const r = await setAuthorizedDomains(token);
    report.steps.push(r);
    console.log(`authorized_domains: HTTP ${r.status}`);
  } catch (e) {
    report.steps.push({ step: "authorized_domains", error: e.message });
  }

  try {
    const r = await createTestUser();
    report.steps.push(r);
    console.log(`create_user: HTTP ${r.status}`);
    if (r.detail?.error?.message?.includes("EMAIL_EXISTS")) console.log("create_user: already exists");
  } catch (e) {
    report.steps.push({ step: "create_user", error: e.message });
  }

  try {
    const r = await signInTest();
    report.steps.push(r);
    console.log(`sign_in_test: ${r.ok ? "OK" : "FAIL"} HTTP ${r.status}`);
  } catch (e) {
    report.steps.push({ step: "sign_in_test", error: e.message });
  }

  try {
    const r = await createStorageBucket(token);
    report.steps.push(r);
    console.log(`storage_bucket: HTTP ${r.status}`);
    if (r.status === 409) console.log("storage_bucket: already exists");
  } catch (e) {
    report.steps.push({ step: "storage_bucket", error: e.message });
  }

  try {
    console.log("Deploying storage rules...");
    const out = execSync(
      "firebase deploy --only storage --project quantrexacademy-live --non-interactive",
      { cwd: path.join("E:", "quantrexacademy"), encoding: "utf8" }
    );
    report.steps.push({ step: "storage_rules_deploy", status: "ok" });
    console.log("storage_rules_deploy: OK");
  } catch (e) {
    report.steps.push({ step: "storage_rules_deploy", status: "fail", detail: (e.stderr || e.message || "").slice(-600) });
    console.log("storage_rules_deploy: FAIL");
  }

  const outPath = path.join(__dirname, "setup_auth_storage_result.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log("\nDone. Report:", outPath);
}

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});