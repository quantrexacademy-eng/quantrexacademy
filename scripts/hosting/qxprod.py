#!/usr/bin/env python3
"""qxprod: PRODUCTION publisher for a live-derived qxhost plan (non-isolated). Separate from qxhost.cmd_apply
(which stays preview-only). Documented Hosting REST v1beta1 only, official SDK ADC session. Dry-run by default.
Hard gates: plan SHA pinned, checksums file verified, live == expected baseline, plan config == CURRENT live config,
not isolated, zero deletions, no preview artifacts, final == live paths + planned populate, only approved /data change.
Writes (only with --execute): versions:clone(finalize=false) -> populateFiles -> upload -> config=live -> verify -> FINALIZED -> releases(live).
"""
import argparse, hashlib, json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import qxhost as Q

PREVIEW_MARKERS = (b"qx-preview-guard", b"noindex")

def sha(p): return hashlib.sha256(open(p, "rb").read()).hexdigest()

def check_plan(plan, live_files, live_cfg, approved_data, blob):
    """Offline gates; blob(h) -> raw gz bytes. Returns list of errors (empty == OK)."""
    e = []
    if plan.get("isolation"): e.append("plan is preview-isolated")
    if plan.get("deletions"): e.append(f"deletions {len(plan['deletions'])}")
    if plan.get("removedRewrites"): e.append("rewrites removed")
    if plan.get("previewConfig") != live_cfg: e.append("plan config != current live config")
    fm, pop = plan["finalManifest"], plan["populate"]
    miss = set(live_files) - set(fm)
    if miss: e.append(f"live paths missing {len(miss)}")
    extra = set(fm) - set(live_files) - set(pop)
    if extra: e.append(f"unplanned new paths {sorted(extra)[:5]}")
    for p in fm:
        if p not in pop and fm[p] != live_files[p]["hash"]: e.append(f"untouched path changed {p}")
        if "qx-preview-guard" in p: e.append(f"preview artifact {p}")
    for p, v in pop.items():
        if fm.get(p) != v["hash"]: e.append(f"populate/final mismatch {p}")
        if p.startswith("/data/") and p not in approved_data: e.append(f"unapproved data change {p}")
        import gzip
        raw = gzip.decompress(blob(v["hash"]))
        if p.endswith((".html", ".htm")) and any(m in raw.lower() for m in PREVIEW_MARKERS):
            e.append(f"preview marker in {p}")
    return e

def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True); ap.add_argument("--plan-sha", required=True)
    ap.add_argument("--checksums", required=True); ap.add_argument("--expect-live", required=True)
    ap.add_argument("--approved-solutions", required=True)
    ap.add_argument("--site", default="quantrexacademy-app"); ap.add_argument("--project", default="quantrexacademy-app")
    ap.add_argument("--execute", action="store_true")
    a = ap.parse_args(argv)
    if sha(a.plan) != a.plan_sha: raise SystemExit("abort: plan sha mismatch")
    d = os.path.dirname(os.path.abspath(a.plan))
    if subprocess.run(["sha256sum", "-c", "--quiet", os.path.abspath(a.checksums)], cwd=d).returncode: raise SystemExit("abort: checksums")
    plan = json.load(open(a.plan)); gzdir = os.path.join(d, "gz")
    if plan["baselineVersion"].split("/")[-1] != a.expect_live: raise SystemExit("abort: plan baseline != --expect-live")
    appr = set(json.load(open(a.approved_solutions)))
    s = Q.session(a.project)
    cur, _ = Q.live_version(s, a.site)
    if cur != plan["baselineVersion"]: raise SystemExit(f"abort: live moved -> {cur}; re-baseline/re-plan")
    live_cfg = Q.jget(s, f"{Q.API}/{cur}").get("config", {})
    live_files = Q.list_files(s, cur)
    errs = check_plan(plan, live_files, live_cfg, appr, lambda h: Q.read_blob(gzdir, h))
    if errs: raise SystemExit(f"abort: {len(errs)} gate errors: {errs[:10]}")
    Q.assert_api_config(live_cfg)
    print(f"gates OK: live {cur.split('/')[-1]}, final {len(plan['finalManifest'])}, populate {len(plan['populate'])}, deletions 0, config == live")
    if not a.execute: print("DRY RUN: no writes"); return
    op = s.post(f"{Q.API}/sites/{a.site}/versions:clone", json={"sourceVersion": cur, "finalize": False}, timeout=120); op.raise_for_status(); op = op.json()
    import time; t0 = time.time()
    while not op.get("done"):
        if time.time() - t0 > Q.CLONE_DEADLINE_S: raise SystemExit("abort: clone timeout; nothing released")
        time.sleep(2); op = Q.jget(s, f"{Q.API}/{op['name']}")
    if "error" in op: raise SystemExit(f"clone failed: {op['error']}")
    ver = op["response"]["name"]; print("cloned (unfinalized):", ver)
    files = {p: v["hash"] for p, v in plan["populate"].items()}
    r = s.post(f"{Q.API}/{ver}:populateFiles", json={"files": files}, timeout=120); r.raise_for_status(); r = r.json()
    need = set(r.get("uploadRequiredHashes", [])); url = r.get("uploadUrl")
    if need - set(files.values()): raise SystemExit("abort: server asked for unplanned hashes")
    if need and not url: raise SystemExit("abort: no uploadUrl")
    for h in sorted(need):
        s.post(f"{url}/{h}", data=Q.read_blob(gzdir, h), headers={"Content-Type": "application/octet-stream"}, timeout=300).raise_for_status()
    print("uploaded", len(need))
    s.patch(f"{Q.API}/{ver}", params={"updateMask": "config"}, json={"config": live_cfg}, timeout=60).raise_for_status()
    got = {p: v["hash"] for p, v in Q.list_files(s, ver).items()}
    me = Q.manifest_errors(got, plan)
    vcfg = Q.jget(s, f"{Q.API}/{ver}").get("config", {})
    if me or vcfg != live_cfg: raise SystemExit(f"verify failed (manifest {len(me)}, config equal {vcfg == live_cfg}); left unfinalized, live untouched")
    print("verified", len(got), "paths, config == live")
    if Q.live_version(s, a.site)[0] != cur: raise SystemExit("abort: live moved during publish; unfinalized")
    s.patch(f"{Q.API}/{ver}", params={"updateMask": "status"}, json={"status": "FINALIZED"}, timeout=60).raise_for_status()
    rel = s.post(f"{Q.API}/sites/{a.site}/releases", params={"versionName": ver}, json={"message": "qxmd392 production (live-derived, zero deletions)"}, timeout=60)
    rel.raise_for_status(); print("released to live:", ver, rel.json().get("name"))

if __name__ == "__main__":
    main()
