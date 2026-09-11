#!/usr/bin/env python3
import json
from pathlib import Path
ROOT = Path(r"C:\Users\Admin\qx-hosting")
idx = json.loads((ROOT/"data/nav/pyq_paper_index/neet.json").read_text(encoding="utf-8"))
ids = json.loads((ROOT/"data/nav/pyq_paper_ids/neet.json").read_text(encoding="utf-8"))
print("years", sorted(idx.keys(), reverse=True))
for y in sorted(idx.keys(), reverse=True):
    for p in idx[y]:
        nids = len(ids.get(p["source"]) or [])
        print(f"{y} {p['officialCount']:3d} ids={nids:3d} {p['durationMin']}min {p['source']}")
        if nids != p["officialCount"]:
            print("  MISMATCH")
print("papers in ids", len(ids))
