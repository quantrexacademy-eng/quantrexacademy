#!/usr/bin/env python3
"""Admin fetch leftover Marks IDs into qid_marks. Student site never calls Marks."""
from __future__ import annotations
import json, ssl, time, urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
QID = ROOT / "data" / "qid_marks"
CFG = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOK = CFG["token"]
NEED = json.loads((ROOT / "data/_migration/leftover_need_fetch.json").read_text(encoding="utf-8"))
CTX = ssl.create_default_context()
QID.mkdir(parents=True, exist_ok=True)

# unique ids
ids = []
seen = set()
for r in NEED:
    i = r.get("id")
    if i and i not in seen:
        seen.add(i)
        ids.append(i)
print("unique_ids", len(ids), flush=True)
ok = fail = skip = 0
for n, mid in enumerate(ids, 1):
    dest = QID / f"{mid}.json"
    if dest.exists() and dest.stat().st_size > 80:
        skip += 1
        continue
    url = "https://web.getmarks.app/api/v1/questions/" + mid
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": "Bearer " + TOK,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
            "Origin": "https://web.getmarks.app",
            "Referer": "https://web.getmarks.app/",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=CTX) as r:
            body = r.read()
        if len(body) > 80:
            dest.write_bytes(body)
            ok += 1
        else:
            fail += 1
    except Exception:
        fail += 1
    if n % 25 == 0 or n == len(ids):
        print(f"  {n}/{len(ids)} ok={ok} fail={fail} skip={skip}", flush=True)
    time.sleep(0.22)
print(json.dumps({"ok": ok, "fail": fail, "skip": skip, "total": len(ids)}), flush=True)
