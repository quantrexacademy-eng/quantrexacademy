#!/usr/bin/env python3
from pathlib import Path
import json, time, urllib.parse, urllib.request, ssl, sys
sys.path.insert(0, str(Path(r"C:\Users\Admin\qx-hosting\scripts")))
from _resolve_everything import download_one, MAP_FILE, fb_url, storage_rel

fails = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\_migration\resolve_download_fail.json").read_text(encoding="utf-8"))
ok = still = 0
mapping_add = {}
still_list = []
for rec in fails:
    url = rec["url"]
    time.sleep(0.15)
    u, dest, st = download_one(url)
    if dest and dest.exists() and dest.stat().st_size > 80:
        ok += 1
        mapping_add[url] = fb_url(storage_rel(url))
        print("OK", st, url[-80:], flush=True)
    else:
        still += 1
        still_list.append({"url": url, "st": st})
        print("FAIL", st, url[-80:], flush=True)
blob = json.loads(MAP_FILE.read_text(encoding="utf-8"))
blob.setdefault("map", {}).update(mapping_add)
MAP_FILE.write_text(json.dumps(blob, indent=0), encoding="utf-8")
print(json.dumps({"retry_ok": ok, "still": still}), flush=True)
Path(r"C:\Users\Admin\qx-hosting\data\_migration\resolve_download_fail.json").write_text(json.dumps(still_list, indent=2), encoding="utf-8")
