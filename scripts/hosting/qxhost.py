#!/usr/bin/env python3
"""qxhost: live-baseline -> patched PREVIEW channel via the documented Firebase Hosting REST API (v1beta1).

Docs: https://firebase.google.com/docs/hosting/api-deploy
      https://firebase.google.com/docs/reference/hosting/rest/v1beta1/sites.versions/clone
      https://firebase.google.com/docs/reference/hosting/rest/v1beta1/sites.versions/populateFiles
      https://firebase.google.com/docs/reference/hosting/rest/v1beta1/sites.versions/patch
      https://firebase.google.com/docs/reference/hosting/rest/v1beta1/sites.versions.files/list
Auth: Application Default Credentials through the official google-auth SDK (google.auth.default()).
      This script never reads, prints or stores credential files or tokens.

Stages
  baseline  READ-ONLY. Saves live version name, its serving config and the full path->hash manifest.
  plan      OFFLINE.   Gzip+SHA256 of patched files, audited deletions, preview isolation, config diff.
  apply     WRITES.    Dry-run unless --execute. Never targets the live channel. Aborts if live moved.
"""
import argparse, gzip, hashlib, io, json, os, re, sys, time, copy, urllib.request

API = "https://firebasehosting.googleapis.com/v1beta1"
SCOPE = "https://www.googleapis.com/auth/cloud-platform"  # gcloud ADC user login only grants this family (see README)
PROTECTED = re.compile(r"^/data/")  # question/solution/answer data: never patched, never deleted

def gz_hash(data: bytes):
    """Hosting hash = SHA256 of the gzipped bytes; the SAME gz bytes must be uploaded (deterministic: mtime=0)."""
    buf = io.BytesIO()
    with gzip.GzipFile(fileobj=buf, mode="wb", compresslevel=9, mtime=0) as g:
        g.write(data)
    gz = buf.getvalue()
    return hashlib.sha256(gz).hexdigest(), gz

def session(project):
    import google.auth
    from google.auth.transport.requests import AuthorizedSession
    creds, _ = google.auth.default(scopes=[SCOPE], quota_project_id=project)
    return AuthorizedSession(creds)

def jget(s, url, **params):
    r = s.get(url, params=params, timeout=60); r.raise_for_status(); return r.json()

def live_version(s, site):
    ch = jget(s, f"{API}/sites/{site}/channels/live")
    return ch["release"]["version"]["name"], ch["release"]["name"]

def list_files(s, version):
    out, tok = {}, None
    while True:
        p = {"pageSize": 1000}
        if tok: p["pageToken"] = tok
        d = jget(s, f"{API}/{version}/files", **p)
        for f in d.get("files", []): out[f["path"]] = {"hash": f["hash"], "status": f.get("status")}
        tok = d.get("nextPageToken")
        if not tok: return out

def cmd_baseline(a):
    s = session(a.project)
    vname, rname = live_version(s, a.site)
    ver = jget(s, f"{API}/{vname}")
    files = list_files(s, vname)
    os.makedirs(a.out, exist_ok=True)
    base = {"site": a.site, "takenAt": int(time.time()), "liveRelease": rname, "version": vname,
            "status": ver.get("status"), "fileCount": ver.get("fileCount"), "versionBytes": ver.get("versionBytes"),
            "config": ver.get("config", {}), "files": files}
    json.dump(base, open(os.path.join(a.out, "baseline.json"), "w"), indent=1, sort_keys=True)
    print(f"baseline: {vname} files={len(files)} bytes={ver.get('versionBytes')} -> {a.out}/baseline.json (read-only)")

# ---------- offline planning ----------
def glob_to_regex(g):
    """firebase.json 'ignore' glob -> anchored path regex (paths start with '/')."""
    r, i = "", 0
    while i < len(g):
        c = g[i]
        if g.startswith("**/", i): r += "(?:.*/)?"; i += 3; continue
        if g.startswith("**", i): r += ".*"; i += 2; continue
        r += "[^/]*" if c == "*" else ("[^/]" if c == "?" else re.escape(c)); i += 1
    return "^/" + r + "$"

SOLUTION_FIELDS = ("solution", "explanation")
def _qs(doc):
    return doc if isinstance(doc, list) else (doc.get("questions") or doc.get("items") or [])
def verify_solution_only(old_bytes, new_bytes, approved_ids):
    """Approved data change = ONLY a solution/explanation that was empty gets filled, for approved ids.
    Every other field, question order, ids, options and answer keys must be identical."""
    old, new = json.loads(old_bytes), json.loads(new_bytes)
    if isinstance(old, dict):
        if {k: v for k, v in old.items() if k not in ("questions", "items")} != {k: v for k, v in new.items() if k not in ("questions", "items")}:
            return ["file-level fields changed"]
    a, b = _qs(old), _qs(new); errs = []
    if [q.get("id") for q in a] != [q.get("id") for q in b]: return ["question ids/order changed"]
    for qa, qb in zip(a, b):
        for k in set(qa) | set(qb):
            if qa.get(k) == qb.get(k): continue
            empty = not str(qa.get(k) or "").strip()
            if k in SOLUTION_FIELDS and empty and str(qa.get("id")) in approved_ids: continue
            errs.append(f"id {qa.get('id')} field {k} changed")
    return errs

def preview_config(live_cfg, csp):
    cfg = copy.deepcopy(live_cfg or {})
    removed = [r for r in cfg.get("rewrites", []) if "function" in r or "run" in r or "functionRegion" in r]
    cfg["rewrites"] = [r for r in cfg.get("rewrites", []) if r not in removed]
    hdr = {"glob": "**", "headers": {"X-Robots-Tag": "noindex, nofollow", "Content-Security-Policy": csp}}
    cfg["headers"] = list(cfg.get("headers", [])) + [hdr]
    return cfg, removed

CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://cdn.jsdelivr.net; "
       "style-src 'self' 'unsafe-inline' https:; font-src 'self' data: https:; img-src 'self' data: blob: https:; media-src 'self' blob: https:; "
       "connect-src 'self'; frame-src 'self'; worker-src 'none'; form-action 'none'; base-uri 'self'; object-src 'none'")

def config_diff(a, b, path=""):
    out = []
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            out += config_diff(a.get(k), b.get(k), f"{path}.{k}" if path else k)
    elif a != b:
        out.append({"path": path, "live": a, "preview": b})
    return out

def build_plan(base, patch_dir, patched_paths, exclusion_globs, guard_paths_html=None, guard_tag=None, fetch=None, csp=CSP, approved_data=None):
    files = base["files"]
    regs = [re.compile(glob_to_regex(g)) for g in exclusion_globs]
    deletions = sorted(p for p in files if any(r.match(p) for r in regs))
    bad = [p for p in deletions if PROTECTED.match(p)]
    if bad: raise SystemExit(f"refusing: exclusions would delete protected data paths: {bad[:5]}")
    populate, report = {}, []
    for p in patched_paths:
        ok_ids = set(str(x) for x in ((approved_data or {}).get(p) or {}).get("ids", []))
        if PROTECTED.match(p) and not ok_ids: raise SystemExit(f"refusing: patch touches protected data path {p} (not in approved solution manifest)")
        data = open(os.path.join(patch_dir, p.lstrip("/")), "rb").read()
        if PROTECTED.match(p):
            errs = verify_solution_only(fetch(p), data, ok_ids)
            if errs: raise SystemExit(f"refusing {p}: not a solution-only addition: {errs[:5]}")
        h, gz = gz_hash(data)
        populate[p] = {"hash": h, "gz": gz, "rawBytes": len(data), "was": files.get(p, {}).get("hash"), "kind": "patch"}
    if guard_tag:  # preview isolation: guard first on every HTML entry point that ends up in the preview
        for p in sorted(x for x in (guard_paths_html or []) if x.endswith(".html") and x not in deletions):
            raw = open(os.path.join(patch_dir, p.lstrip("/")), "rb").read() if p in populate else fetch(p)
            txt = raw.decode("utf-8", "surrogateescape")
            if guard_tag not in txt:
                txt2, n = re.subn(r"(<head[^>]*>)", lambda m: m.group(1) + "\n" + guard_tag, txt, count=1)
                if not n: report.append(f"no <head>: {p} (left out of preview isolation; block by CSP only)"); continue
                txt = txt2
            h, gz = gz_hash(txt.encode("utf-8", "surrogateescape"))
            populate[p] = {"hash": h, "gz": gz, "rawBytes": len(txt), "was": files.get(p, {}).get("hash"), "kind": "guard" if p not in populate else "patch+guard"}
    cfg, removed = preview_config(base.get("config"), csp)
    untouched = {p: v["hash"] for p, v in files.items() if p not in populate and p not in deletions}
    return {"baselineVersion": base["version"], "deletions": deletions, "populate": populate, "untouched": untouched,
            "previewConfig": cfg, "removedRewrites": removed, "configDiff": config_diff(base.get("config", {}), cfg), "notes": report}

def cmd_plan(a):
    base = json.load(open(a.baseline))
    ign = [l.strip() for l in open(a.exclusions) if l.strip() and not l.startswith("#")]
    paths = ["/" + l.strip().lstrip("/") for l in open(a.patched) if l.strip()]
    tag = f'<script src="/qx-preview-guard.js?v={a.guard_ver}"></script>' if a.preview_isolation else None
    if tag and "/qx-preview-guard.js" not in paths: paths.append("/qx-preview-guard.js")
    fetch = (lambda p: urllib.request.urlopen(a.public_origin + p, timeout=60).read())
    html = [p for p in base["files"] if p.endswith(".html")]
    appr = json.load(open(a.approved_solutions)) if a.approved_solutions else None
    plan = build_plan(base, a.patch_dir, paths, ign, html, tag, fetch, approved_data=appr)
    os.makedirs(a.out, exist_ok=True)
    gzdir = os.path.join(a.out, "gz"); os.makedirs(gzdir, exist_ok=True)
    for p, v in plan["populate"].items(): open(os.path.join(gzdir, v["hash"]), "wb").write(v.pop("gz"))
    json.dump(plan, open(os.path.join(a.out, "plan.json"), "w"), indent=1, sort_keys=True)
    print(f"plan: patch/guard={len(plan['populate'])} delete={len(plan['deletions'])} untouched={len(plan['untouched'])} "
          f"rewrites removed={len(plan['removedRewrites'])} config changes={len(plan['configDiff'])} notes={len(plan['notes'])}")

# ---------- writes (dry-run default) ----------
def cmd_apply(a):
    if a.channel in ("live", "", None): raise SystemExit("refusing: apply never targets the live channel")
    plan = json.load(open(a.plan)); gzdir = os.path.join(os.path.dirname(a.plan), "gz")
    steps = [f"check live still == {plan['baselineVersion']}",
             f"versions:clone finalize=false exclude={len(plan['deletions'])} audited paths",
             f"populateFiles {len(plan['populate'])} paths (only these change)",
             "upload required gz blobs", "patch config (updateMask=config) -> previewConfig",
             "re-list files: untouched hashes == baseline, patched == plan, excluded absent",
             "patch status FINALIZED" + ("" if a.finalize else "  [skipped: no --finalize]"),
             f"release to preview channel '{a.channel}'" + ("" if a.release else "  [skipped: no --release]")]
    if not a.execute:
        print("DRY RUN (no API calls):"); [print("  -", x) for x in steps]; return
    s = session(a.project)
    cur, _ = live_version(s, a.site)
    if cur != plan["baselineVersion"]: raise SystemExit(f"abort: live moved {plan['baselineVersion']} -> {cur}; re-run baseline+plan")
    ch = s.get(f"{API}/sites/{a.site}/channels/{a.channel}", timeout=60)
    if ch.status_code != 200: raise SystemExit(f"abort: preview channel '{a.channel}' must already exist (create it with the CLI first)")
    body = {"sourceVersion": plan["baselineVersion"], "finalize": False}
    if plan["deletions"]: body["exclude"] = {"regexes": ["^" + re.escape(p) + "$" for p in plan["deletions"]]}
    op = s.post(f"{API}/sites/{a.site}/versions:clone", json=body, timeout=120); op.raise_for_status(); op = op.json()
    while not op.get("done"):
        time.sleep(2); op = jget(s, f"{API}/{op['name']}")
    if "error" in op: raise SystemExit(f"clone failed: {op['error']}")
    ver = op["response"]["name"]; print("cloned (CREATED, not live):", ver)
    files = {p: v["hash"] for p, v in plan["populate"].items()}
    need = set()
    items = list(files.items())
    for i in range(0, len(items), 1000):
        r = s.post(f"{API}/{ver}:populateFiles", json={"files": dict(items[i:i + 1000])}, timeout=120); r.raise_for_status(); r = r.json()
        need |= set(r.get("uploadRequiredHashes", [])); url = r.get("uploadUrl")
    for h in sorted(need):
        u = s.post(f"{url}/{h}", data=open(os.path.join(gzdir, h), "rb").read(), headers={"Content-Type": "application/octet-stream"}, timeout=300); u.raise_for_status()
    r = s.patch(f"{API}/{ver}", params={"updateMask": "config"}, json={"config": plan["previewConfig"]}, timeout=60); r.raise_for_status()
    got = {p: v["hash"] for p, v in list_files(s, ver).items()}
    errs = [p for p, h in plan["untouched"].items() if got.get(p) != h] + [p for p, h in files.items() if got.get(p) != h] + [p for p in plan["deletions"] if p in got]
    if errs: raise SystemExit(f"verify failed ({len(errs)}), version left unfinalized: {errs[:10]}")
    print("verified manifest:", len(got), "paths")
    if not a.finalize: print("stop: not finalized (pass --finalize)"); return
    s.patch(f"{API}/{ver}", params={"updateMask": "status"}, json={"status": "FINALIZED"}, timeout=60).raise_for_status()
    if not a.release: print("stop: finalized, not released (pass --release)"); return
    s.post(f"{API}/sites/{a.site}/channels/{a.channel}/releases", params={"versionName": ver}, json={"message": "qx preview from live baseline"}, timeout=60).raise_for_status()
    print("released to preview channel", a.channel)

def main(argv=None):
    ap = argparse.ArgumentParser(); sp = ap.add_subparsers(dest="cmd", required=True)
    b = sp.add_parser("baseline"); b.add_argument("--site", default="quantrexacademy-app"); b.add_argument("--project", default="quantrexacademy-app"); b.add_argument("--out", required=True)
    p = sp.add_parser("plan"); p.add_argument("--baseline", required=True); p.add_argument("--patch-dir", required=True); p.add_argument("--patched", required=True)
    p.add_argument("--exclusions", required=True, help="audited deletion globs (exclusions.txt)"); p.add_argument("--out", required=True); p.add_argument("--preview-isolation", action="store_true")
    p.add_argument("--approved-solutions", help='JSON {"/data/...json": {"ids": [...], "provenance": "..."}}');
    p.add_argument("--guard-ver", default="qa2"); p.add_argument("--public-origin", default="https://www.quantrexacademy.com")
    x = sp.add_parser("apply"); x.add_argument("--plan", required=True); x.add_argument("--channel", required=True)
    x.add_argument("--site", default="quantrexacademy-app"); x.add_argument("--project", default="quantrexacademy-app")
    x.add_argument("--execute", action="store_true"); x.add_argument("--finalize", action="store_true"); x.add_argument("--release", action="store_true")
    a = ap.parse_args(argv)
    {"baseline": cmd_baseline, "plan": cmd_plan, "apply": cmd_apply}[a.cmd](a)

if __name__ == "__main__":
    main()
