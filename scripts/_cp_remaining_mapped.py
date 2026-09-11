#!/usr/bin/env python3
"""Copy remaining mapped bake_tmp files that are not formula/modules/AP EAMCET."""
from pathlib import Path
import json, subprocess, sys
sys.path.insert(0, str(Path(r"C:\Users\Admin\qx-hosting\scripts")))
from _resolve_everything import MAP_FILE, TMP, storage_rel, norm_url

blob = json.loads(MAP_FILE.read_text(encoding="utf-8"))
mapping = blob.get("map") or {}
skip_sub = ("getmarks-assets", "modules/ms", "without_watermark/AP EAMCET")
to_cp = []
for u in mapping:
    rel = storage_rel(u)
    tail = rel.replace("questions/figs/", "")
    if any(s in tail.replace("\\", "/") for s in skip_sub):
        continue
    src = TMP / tail
    if src.exists() and src.stat().st_size > 80:
        to_cp.append((src, "gs://quantrexacademy-app.firebasestorage.app/" + rel.replace("\\", "/")))
print("to_cp", len(to_cp), flush=True)
# batch via gcloud storage cp
ok = fail = 0
for i, (src, dest) in enumerate(to_cp, 1):
    r = subprocess.run(
        ["gcloud", "storage", "cp", str(src), dest],
        capture_output=True,
        text=True,
    )
    if r.returncode == 0:
        ok += 1
    else:
        fail += 1
        print("FAIL", src.name, r.stderr[-200:] if r.stderr else r.stdout[-200:], flush=True)
    if i % 10 == 0 or i == len(to_cp):
        print(f"  {i}/{len(to_cp)} ok={ok} fail={fail}", flush=True)
print(json.dumps({"ok": ok, "fail": fail}), flush=True)
