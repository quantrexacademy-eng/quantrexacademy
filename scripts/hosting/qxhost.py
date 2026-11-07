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
import argparse, gzip, hashlib, io, json, os, re, sys, time, copy, urllib.request, urllib.parse, urllib.error

API = "https://firebasehosting.googleapis.com/v1beta1"
SCOPE = "https://www.googleapis.com/auth/cloud-platform"  # gcloud ADC user login only grants this family (see README)
PROTECTED = re.compile(r"^/data/")  # question/solution/answer data: never patched, never deleted

HERE = os.path.dirname(os.path.abspath(__file__))
GUARD_ASSET = os.path.join(HERE, "preview", "qx-preview-guard.js")  # durable, reviewed; never in the production root
GUARD_SHA256 = "2e03fb1b517dfcaa0db8c32e0ce70d08be903a293722ca08b0cf0997f1a7bf4d"  # reviewed guard; any edit must update this pin (and its test) deliberately
FETCH_CAP = 30 * 1024 * 1024
CLONE_DEADLINE_S = 900
_BAD_PATH = re.compile(r"(^|/)\.\.?(/|$)|\\|\x00|//|%(2e|2f|5c|00)|^[a-z][a-z0-9+.-]*:", re.I)

def safe_path(p):
    """Hosting manifest/patch path: '/'-rooted, no traversal, no backslash/NUL/encoded separators, no scheme/host."""
    if not isinstance(p, str) or not p.startswith("/") or _BAD_PATH.search(p) or any(ord(c) < 32 for c in p):
        raise SystemExit(f"refusing unsafe path: {p!r}")
    return p

def root_join(root, p):
    """join a safe hosting path under root and prove the real path stays inside root (symlinks too)."""
    safe_path(p)
    r = os.path.realpath(root); f = os.path.realpath(os.path.join(r, p.lstrip("/")))
    if os.path.commonpath([r, f]) != r: raise SystemExit(f"refusing path escaping root: {p!r}")
    return f

class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None

def canonical_fetcher(site, known_paths, log, opener=None, cap=FETCH_CAP):
    """Fetch ONLY manifest-known paths from https://<site>.web.app (the Firebase-served default host, not the
    custom www domain/CDN), with a cache-buster. Direct 200 only: any redirect/other status/oversize = abort.
    Raw byte SHA-256 of every fetched body is recorded in `log` for plan review."""
    origin = f"https://{site}.web.app"
    op = opener or urllib.request.build_opener(_NoRedirect)
    def fetch(p):
        safe_path(p)
        if p not in known_paths: raise SystemExit(f"refusing fetch of path not in live manifest: {p}")
        url = f"{origin}{urllib.parse.quote(p)}?qxcb={int(time.time())}"
        try: r = op.open(url, timeout=60)
        except urllib.error.HTTPError as e: raise SystemExit(f"fetch {p}: HTTP {e.code} (redirect/clean-URL or missing; no fallback)")
        if getattr(r, "status", 200) != 200 or (r.geturl().split("?")[0] != url.split("?")[0]): raise SystemExit(f"fetch {p}: not a direct 200")
        body = r.read(cap + 1)
        if len(body) > cap: raise SystemExit(f"fetch {p}: over {cap} bytes")
        log[p] = {"url": url.split("?")[0], "rawBytes": len(body), "rawSha256": hashlib.sha256(body).hexdigest()}
        return body
    return fetch

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
def _nodup(pairs):
    keys = [k for k, _ in pairs]
    if len(keys) != len(set(keys)): raise ValueError("duplicate JSON object key: " + ", ".join(sorted({k for k in keys if keys.count(k) > 1})))
    return dict(pairs)

def _load_strict(b):
    return json.loads(b, object_pairs_hook=_nodup)

class _Raw:
    """Minimal JSON parser that keeps byte spans of every value (no reformatting, no number coercion)."""
    WS = b" \t\r\n"
    def __init__(self, b): self.b = b; self.i = 0
    def ws(self):
        while self.i < len(self.b) and self.b[self.i] in self.WS: self.i += 1
    def string(self):
        b, i = self.b, self.i
        if b[i:i + 1] != b'"': raise ValueError(f"string expected @{i}")
        i += 1
        while True:
            c = b[i:i + 1]
            if not c: raise ValueError("unterminated string")
            if c == b"\\": i += 2; continue
            if c == b'"': i += 1; break
            i += 1
        s0 = self.i; self.i = i; return ("str", s0, i, json.loads(b[s0:i]))
    def value(self):
        self.ws(); b = self.b; c = b[self.i:self.i + 1]; s0 = self.i
        if c == b"{":
            self.i += 1; items = []; keys = set(); self.ws()
            if b[self.i:self.i + 1] == b"}": self.i += 1; return ("obj", s0, self.i, items)
            while True:
                self.ws(); k = self.string()[3]
                if k in keys: raise ValueError(f"duplicate JSON object key: {k}")
                keys.add(k); self.ws()
                if b[self.i:self.i + 1] != b":": raise ValueError(f"':' expected @{self.i}")
                self.i += 1; items.append((k, self.value())); self.ws()
                c = b[self.i:self.i + 1]; self.i += 1
                if c == b"}": return ("obj", s0, self.i, items)
                if c != b",": raise ValueError(f"',' expected @{self.i - 1}")
        if c == b"[":
            self.i += 1; items = []; self.ws()
            if b[self.i:self.i + 1] == b"]": self.i += 1; return ("arr", s0, self.i, items)
            while True:
                items.append(self.value()); self.ws(); c = b[self.i:self.i + 1]; self.i += 1
                if c == b"]": return ("arr", s0, self.i, items)
                if c != b",": raise ValueError(f"',' expected @{self.i - 1}")
        if c == b'"': return self.string()
        m = re.compile(rb"-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?|true|false|null").match(b, self.i)
        if not m or m.end() == self.i: raise ValueError(f"bad token @{self.i}")
        self.i = m.end(); return ("lit", s0, self.i, json.loads(b[s0:self.i]))
    def doc(self):
        v = self.value(); self.ws()
        if self.i != len(self.b): raise ValueError("trailing bytes")
        return v

def _raw_questions(node):
    if node[0] == "arr": return node[3]
    if node[0] == "obj":
        for k, v in node[3]:
            if k in ("questions", "items") and v[0] == "arr": return v[3]
    raise ValueError("no question array")

def verify_solution_only(old_bytes, new_bytes, approved_ids, entry=None):
    """EXACT RAW proof: new bytes == old bytes except the JSON string token of an allowed solution field of each
    approved id, whose old value was empty or exactly an allowed placeholder, replaced by a valid non-empty JSON
    string. Everything else (key order, numbers, whitespace, other fields) must be byte-identical. Manifest entry is
    mandatory: non-empty provenance, official_solution_claim false, valid baseline_sha256 + patched_sha256."""
    e = entry or {}; errs = []
    hexok = lambda h: isinstance(h, str) and re.fullmatch(r"[0-9a-f]{64}", h)
    if not str(e.get("provenance") or "").strip(): errs.append("manifest provenance empty")
    if e.get("official_solution_claim") is not False: errs.append("manifest must state official_solution_claim false")
    if not hexok(e.get("baseline_sha256")) or not hexok(e.get("patched_sha256")): errs.append("manifest baseline_sha256/patched_sha256 required")
    else:
        if hashlib.sha256(old_bytes).hexdigest() != e["baseline_sha256"]: errs.append("fresh baseline sha256 differs from manifest")
        if hashlib.sha256(new_bytes).hexdigest() != e["patched_sha256"]: errs.append("patched sha256 differs from manifest")
    if errs: return errs
    try: old = _Raw(old_bytes).doc(); _Raw(new_bytes).doc()
    except ValueError as x: return [str(x)]
    fields = set(e.get("allowed_fields") or ["solution"]) & set(SOLUTION_FIELDS)
    placeholders = set(e.get("allowed_original_values") or [])
    seen, spans = set(), []
    for q in _raw_questions(old):
        if q[0] != "obj": return ["non-object question"]
        d = dict(q[3]); idn = d.get("id")
        if idn is None or idn[0] == "obj" or idn[0] == "arr": return ["question without id"]
        k = str(idn[3])
        if k in seen: return ["duplicate question ids"]
        seen.add(k)
        if k in approved_ids:
            hits = [v for f, v in q[3] if f in fields]
            if len(hits) != 1 or hits[0][0] != "str": return [f"id {k}: needs exactly one string {sorted(fields)} field"]
            v = hits[0]
            if v[3].strip() and v[3] not in placeholders: return [f"id {k}: existing solution is not empty/placeholder; replacement refused"]
            spans.append((v[1], v[2], k))
    missing = set(approved_ids) - {k for _, _, k in spans}
    if missing: return ["approved ids not found: " + ",".join(sorted(missing))]
    po = pn = 0
    for s0, s1, k in sorted(spans):
        seg = old_bytes[po:s0]
        if new_bytes[pn:pn + len(seg)] != seg: return [f"bytes outside solution tokens changed (before id {k})"]
        pn += len(seg); r = _Raw(new_bytes); r.i = pn
        try: tok = r.string()
        except ValueError: return [f"id {k}: new value is not a JSON string"]
        if not tok[3].strip(): return [f"id {k}: new solution empty"]
        if tok[3] == json.loads(old_bytes[s0:s1]): return [f"id {k}: not filled"]
        po, pn = s1, r.i
    if old_bytes[po:] != new_bytes[pn:]: return ["bytes outside solution tokens changed (tail)"]
    return []

BACKEND_REWRITE_KEYS = ("function", "functionRegion", "run", "dynamicLinks")
ISOLATION_HEADERS = ("content-security-policy", "content-security-policy-report-only", "x-robots-tag")

def preview_config(live_cfg, csp):
    """PREVIEW ONLY. Removes every backend rewrite (Functions, Cloud Run, Dynamic Links), drops every prior
    CSP / CSP-report-only / X-Robots-Tag header case-insensitively (other live headers kept as-is), then adds ONE
    global header block. Never used for a production version (see production_config)."""
    cfg = copy.deepcopy(live_cfg or {})
    removed = [r for r in cfg.get("rewrites", []) if any(k in r for k in BACKEND_REWRITE_KEYS)]
    cfg["rewrites"] = [r for r in cfg.get("rewrites", []) if r not in removed]
    out, dropped = [], []
    for h in cfg.get("headers", []):
        h = copy.deepcopy(h); hs = h.get("headers", {})
        for k in list(hs):
            if k.strip().lower() in ISOLATION_HEADERS: dropped.append({"glob": h.get("glob") or h.get("regex"), "header": k}); hs.pop(k)
        if hs: out.append(h)
    out.append({"glob": "**", "headers": {"X-Robots-Tag": "noindex, nofollow", "Content-Security-Policy": csp}})
    cfg["headers"] = out
    if not cfg["rewrites"]: cfg.pop("rewrites")
    return cfg, removed, dropped

SERVING_CONFIG_FIELDS = {"headers", "redirects", "rewrites", "cleanUrls", "trailingSlashBehavior", "i18n", "appAssociation"}
def assert_api_config(cfg):
    extra = set(cfg) - SERVING_CONFIG_FIELDS
    if extra: raise SystemExit(f"refusing: not Hosting ServingConfig fields: {sorted(extra)}")

def production_config(live_cfg):
    """Future production version: the live config UNCHANGED (all backend rewrites kept, no noindex/CSP/guard)."""
    return copy.deepcopy(live_cfg or {})

def assert_isolated(cfg):
    assert_api_config(cfg)
    errs = [r for r in cfg.get("rewrites", []) if any(k in r for k in BACKEND_REWRITE_KEYS)]
    hs = [(k.lower(), v) for h in cfg.get("headers", []) for k, v in h.get("headers", {}).items()]
    csp = [v for k, v in hs if k == "content-security-policy"]; xr = [v for k, v in hs if k == "x-robots-tag"]
    if errs: raise SystemExit(f"not isolated: backend rewrites remain {errs[:3]}")
    if len(csp) != 1 or len(xr) != 1 or "noindex" not in xr[0]: raise SystemExit("not isolated: need exactly one CSP and one noindex header")
    for d in ("connect-src 'self'", "form-action 'none'", "worker-src 'none'", "frame-src 'self'"):
        if d not in csp[0]: raise SystemExit(f"not isolated: CSP lacks {d}")

# script-src keeps 'unsafe-inline' on purpose: the real app boots from inline <script> and onclick handlers.
# Isolation here = no backend: connect-src 'self' (no Auth/Firestore/Functions hosts), no forms, no workers,
# same-origin frames only, and NO function/run rewrites. It is not an XSS guarantee.
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

def build_plan(base, patch_dir, patched_paths, exclusion_globs, guard_paths_html=None, guard_tag=None, fetch=None, csp=CSP, approved_data=None, approved_deletions=None, guard_asset=GUARD_ASSET):
    files = base["files"]
    for p in files: safe_path(p)
    patched_paths = [safe_path(p) for p in patched_paths]
    if len(set(patched_paths)) != len(patched_paths): raise SystemExit("refusing: duplicate patched paths")
    regs = [re.compile(glob_to_regex(g)) for g in exclusion_globs]
    candidates = sorted(p for p in files if any(r.match(p) for r in regs))
    exact = set(safe_path(p) for p in (approved_deletions or []))
    stray = sorted(exact - set(candidates))
    if stray: raise SystemExit(f"refusing: approved deletions not matched by audited exclusion patterns / not in manifest: {stray[:5]}")
    deletions = sorted(exact)  # ONLY the exact reviewed list; wildcards just propose candidates
    bad = [p for p in deletions if PROTECTED.match(p)]
    if bad: raise SystemExit(f"refusing: exclusions would delete protected data paths: {bad[:5]}")
    populate, report = {}, []
    for p in patched_paths:
        entry = (approved_data or {}).get(p) or {}
        ok_ids = set(str(x) for x in entry.get("ids", []))
        if PROTECTED.match(p) and not ok_ids: raise SystemExit(f"refusing: patch touches protected data path {p} (not in approved solution manifest)")
        if guard_tag and p == "/qx-preview-guard.js":
            if not os.path.isfile(guard_asset): raise SystemExit(f"refusing: reviewed guard asset missing: {guard_asset}")
            data = open(guard_asset, "rb").read()
            if guard_asset == GUARD_ASSET and hashlib.sha256(data).hexdigest() != GUARD_SHA256: raise SystemExit("refusing: guard asset differs from reviewed pin")
        else:
            f = root_join(patch_dir, p)
            if not os.path.isfile(f): raise SystemExit(f"refusing: patched file missing: {p}")
            data = open(f, "rb").read()
        if PROTECTED.match(p):
            errs = verify_solution_only(fetch(p), data, ok_ids, entry)
            if errs: raise SystemExit(f"refusing {p}: not a solution-only addition: {errs[:5]}")
        h, gz = gz_hash(data)
        populate[p] = {"hash": h, "gz": gz, "rawBytes": len(data), "was": files.get(p, {}).get("hash"), "kind": "patch"}
    if guard_tag:  # preview isolation: guard first on every HTML entry point that ends up in the preview
        for p in sorted(x for x in (guard_paths_html or []) if x.endswith(".html") and x not in deletions):
            raw = open(root_join(patch_dir, p), "rb").read() if p in populate else fetch(p)
            txt = raw.decode("utf-8", "surrogateescape")
            if guard_tag not in txt:
                txt2, n = re.subn(r"(<head[^>]*>)", lambda m: m.group(1) + "\n" + guard_tag, txt, count=1)
                if not n: report.append(f"no <head>: {p} (left out of preview isolation; block by CSP only)"); continue
                txt = txt2
            h, gz = gz_hash(txt.encode("utf-8", "surrogateescape"))
            populate[p] = {"hash": h, "gz": gz, "rawBytes": len(txt), "was": files.get(p, {}).get("hash"), "kind": "guard" if p not in populate else "patch+guard"}
    if guard_tag:
        cfg, removed, dropped = preview_config(base.get("config"), csp); assert_isolated(cfg)
        unguarded = [p for p in (guard_paths_html or []) if p.endswith(".html") and p not in deletions and p not in populate]
        report += [f"UNGUARDED html (no <head>): {p}" for p in unguarded]
    else:
        cfg, removed, dropped = production_config(base.get("config")), [], []
    untouched = {p: v["hash"] for p, v in files.items() if p not in populate and p not in deletions}
    final = dict(untouched); final.update({p: v["hash"] for p, v in populate.items()})
    return {"baselineVersion": base["version"], "isolation": bool(guard_tag), "deletions": deletions, "deletionCandidates": candidates,
            "populate": populate, "untouched": untouched, "finalManifest": final, "droppedHeaders": dropped,
            "previewConfig": cfg, "removedRewrites": removed, "configDiff": config_diff(base.get("config", {}), cfg), "notes": report}

def cmd_plan(a):
    base = json.load(open(a.baseline))
    ign = [l.strip() for l in open(a.exclusions) if l.strip() and not l.strip().startswith("#")]
    paths = [l.strip() for l in open(a.patched) if l.strip() and not l.strip().startswith("#")]
    tag = f'<script src="/qx-preview-guard.js?v={a.guard_ver}"></script>' if a.preview_isolation else None
    if tag and "/qx-preview-guard.js" not in paths: paths.append("/qx-preview-guard.js")
    fetched = {}
    fetch = canonical_fetcher(base["site"], set(base["files"]), fetched)
    html = [p for p in base["files"] if p.endswith(".html")]
    appr = json.load(open(a.approved_solutions)) if a.approved_solutions else None
    dels = [l.strip() for l in open(a.approved_deletions) if l.strip() and not l.strip().startswith("#")] if a.approved_deletions else []
    plan = build_plan(base, a.patch_dir, paths, ign, html, tag, fetch, approved_data=appr, approved_deletions=dels)
    plan["fetched"] = fetched
    os.makedirs(a.out, exist_ok=True)
    gzdir = os.path.join(a.out, "gz"); os.makedirs(gzdir, exist_ok=True)
    for p, v in plan["populate"].items(): open(os.path.join(gzdir, v["hash"]), "wb").write(v.pop("gz"))
    json.dump(plan, open(os.path.join(a.out, "plan.json"), "w"), indent=1, sort_keys=True)
    print(f"plan: patch/guard={len(plan['populate'])} delete={len(plan['deletions'])} untouched={len(plan['untouched'])} "
          f"rewrites removed={len(plan['removedRewrites'])} config changes={len(plan['configDiff'])} notes={len(plan['notes'])}")

def read_blob(gzdir, h):
    if not re.fullmatch(r"[0-9a-f]{64}", h): raise SystemExit(f"abort: bad hash {h!r}")
    blob = open(os.path.join(gzdir, h), "rb").read()
    if hashlib.sha256(blob).hexdigest() != h: raise SystemExit(f"abort: local gz blob {h[:12]} does not hash to its name")
    return blob

def manifest_errors(got, plan):
    """EXACT final set: same paths as planned (no extra, none missing) and every hash equal."""
    want = plan["finalManifest"]
    errs = [f"missing {p}" for p in want if p not in got] + [f"unexpected {p}" for p in got if p not in want]
    errs += [f"hash {p}" for p, h in want.items() if p in got and got[p] != h]
    return errs

# ---------- writes (dry-run default) ----------
def cmd_apply(a):
    ch_id = str(a.channel or "").strip().lower()
    if not ch_id or ch_id == "live" or "/" in ch_id or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,62}", ch_id):
        raise SystemExit("refusing: apply never targets the live channel (or an invalid channel id)")
    plan = json.load(open(a.plan)); gzdir = os.path.join(os.path.dirname(a.plan), "gz")
    if not plan.get("isolation"): raise SystemExit("refusing: apply only releases ISOLATED previews; production needs a fresh live-derived plan and the normal reviewed release")
    assert_isolated(plan["previewConfig"]); assert_api_config(plan["previewConfig"])
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
    ch = s.get(f"{API}/sites/{a.site}/channels/{ch_id}", timeout=60)
    if ch.status_code != 200: raise SystemExit(f"abort: preview channel '{ch_id}' must already exist (create it with the CLI first)")
    if str(ch.json().get("name", "")).rstrip("/").endswith("/channels/live"): raise SystemExit("refusing: resolved channel is live")
    body = {"sourceVersion": plan["baselineVersion"], "finalize": False}
    if plan["deletions"]: body["exclude"] = {"regexes": ["^" + re.escape(p) + "$" for p in plan["deletions"]]}
    op = s.post(f"{API}/sites/{a.site}/versions:clone", json=body, timeout=120); op.raise_for_status(); op = op.json()
    t0 = time.time()
    while not op.get("done"):
        if time.time() - t0 > CLONE_DEADLINE_S: raise SystemExit(f"abort: clone not done after {CLONE_DEADLINE_S}s ({op.get('name')}); version stays unfinalized")
        time.sleep(2); op = jget(s, f"{API}/{op['name']}")
    if "error" in op: raise SystemExit(f"clone failed: {op['error']}")
    ver = op["response"]["name"]; print("cloned (CREATED, not live):", ver)
    files = {p: v["hash"] for p, v in plan["populate"].items()}
    need = set(); url = None
    items = list(files.items())
    for i in range(0, len(items), 1000):
        r = s.post(f"{API}/{ver}:populateFiles", json={"files": dict(items[i:i + 1000])}, timeout=120); r.raise_for_status(); r = r.json()
        need |= set(r.get("uploadRequiredHashes", [])); url = r.get("uploadUrl") or url
    if need - set(files.values()): raise SystemExit("abort: server asked for hashes not in plan")
    if need and not url: raise SystemExit("abort: upload required but no uploadUrl returned")
    for h in sorted(need):
        blob = read_blob(gzdir, h)
        u = s.post(f"{url}/{h}", data=blob, headers={"Content-Type": "application/octet-stream"}, timeout=300); u.raise_for_status()
    r = s.patch(f"{API}/{ver}", params={"updateMask": "config"}, json={"config": plan["previewConfig"]}, timeout=60); r.raise_for_status()
    got = {p: v["hash"] for p, v in list_files(s, ver).items()}
    errs = manifest_errors(got, plan)
    if errs: raise SystemExit(f"verify failed ({len(errs)}), version left unfinalized: {errs[:10]}")
    print("verified manifest:", len(got), "paths")
    if not a.finalize: print("stop: not finalized (pass --finalize)"); return
    s.patch(f"{API}/{ver}", params={"updateMask": "status"}, json={"status": "FINALIZED"}, timeout=60).raise_for_status()
    if not a.release: print("stop: finalized, not released (pass --release)"); return
    s.post(f"{API}/sites/{a.site}/channels/{ch_id}/releases", params={"versionName": ver}, json={"message": "qx preview from live baseline"}, timeout=60).raise_for_status()
    print("released to preview channel", ch_id)

def main(argv=None):
    ap = argparse.ArgumentParser(); sp = ap.add_subparsers(dest="cmd", required=True)
    b = sp.add_parser("baseline"); b.add_argument("--site", default="quantrexacademy-app"); b.add_argument("--project", default="quantrexacademy-app"); b.add_argument("--out", required=True)
    p = sp.add_parser("plan"); p.add_argument("--baseline", required=True); p.add_argument("--patch-dir", required=True); p.add_argument("--patched", required=True)
    p.add_argument("--exclusions", required=True, help="audited deletion globs (exclusions.txt)"); p.add_argument("--out", required=True); p.add_argument("--preview-isolation", action="store_true")
    p.add_argument("--approved-solutions", help='JSON {"/data/...json": {"ids": [...], "provenance": "..."}}');
    p.add_argument("--guard-ver", default="qa3"); p.add_argument("--approved-deletions", help="exact reviewed path list (one per line); without it nothing is deleted")
    x = sp.add_parser("apply"); x.add_argument("--plan", required=True); x.add_argument("--channel", required=True)
    x.add_argument("--site", default="quantrexacademy-app"); x.add_argument("--project", default="quantrexacademy-app")
    x.add_argument("--execute", action="store_true"); x.add_argument("--finalize", action="store_true"); x.add_argument("--release", action="store_true")
    a = ap.parse_args(argv)
    {"baseline": cmd_baseline, "plan": cmd_plan, "apply": cmd_apply}[a.cmd](a)

if __name__ == "__main__":
    main()
