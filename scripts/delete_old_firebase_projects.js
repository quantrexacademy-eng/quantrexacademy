const https = require("https");
const fs = require("fs");
const path = require("path");

const KEEP = "quantrexacademy-live";
const DELETE_LIST = [
  "gen-lang-client-0152704106",
  "planning-with-ai-c7e08",
  "quantrex-9c898",
  "quantrex-academy",
  "quantrexacademy-5da32"
];

const credPath = path.join(
  process.env.APPDATA || "",
  "gcloud",
  "application_default_credentials.json"
);

function request(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        method,
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: headers || {}
      },
      res => {
        let data = "";
        res.on("data", c => (data += c));
        res.on("end", () => {
          let json = null;
          try {
            json = data ? JSON.parse(data) : null;
          } catch (_) {
            json = { raw: data };
          }
          resolve({ status: res.statusCode, json, headers: res.headers });
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken(creds) {
  const body = new URLSearchParams({
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    refresh_token: creds.refresh_token,
    grant_type: "refresh_token"
  }).toString();

  const res = await request(
    "POST",
    "https://oauth2.googleapis.com/token",
    { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(body) },
    body
  );
  if (!res.json || !res.json.access_token) {
    throw new Error("Token refresh failed: " + JSON.stringify(res.json));
  }
  return res.json.access_token;
}

async function deleteProject(projectId, token) {
  const url = `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}`;
  const res = await request("DELETE", url, {
    Authorization: `Bearer ${token}`
  });
  return res;
}

async function main() {
  if (!fs.existsSync(credPath)) {
    console.error("No gcloud ADC credentials at", credPath);
    process.exit(1);
  }
  const creds = JSON.parse(fs.readFileSync(credPath, "utf8"));
  const token = await getAccessToken(creds);
  const results = [];

  for (const id of DELETE_LIST) {
    if (id === KEEP) continue;
    process.stdout.write(`Deleting ${id}... `);
    try {
      const res = await deleteProject(id, token);
      if (res.status === 200 || res.status === 204) {
        console.log("OK (scheduled for deletion)");
        results.push({ id, status: "deleted", detail: res.json });
      } else if (res.status === 403) {
        console.log("DENIED");
        results.push({ id, status: "denied", detail: res.json });
      } else if (res.status === 404) {
        console.log("NOT FOUND");
        results.push({ id, status: "not_found", detail: res.json });
      } else {
        console.log("HTTP " + res.status);
        results.push({ id, status: "error", http: res.status, detail: res.json });
      }
    } catch (e) {
      console.log("FAIL " + e.message);
      results.push({ id, status: "fail", detail: e.message });
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log("Kept:", KEEP);
  for (const r of results) {
    console.log(`${r.id}: ${r.status}`);
  }
  fs.writeFileSync(
    path.join(__dirname, "delete_projects_result.json"),
    JSON.stringify({ kept: KEEP, results, at: new Date().toISOString() }, null, 2)
  );
}

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});