#!/usr/bin/env python3
import json, re
from pathlib import Path
raw = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\banks\jee_main.json").read_text(encoding="utf-8"))
needle = "06APRS2__q66_d1"
for q in raw["questions"]:
    blob = str(q.get("q") or "") + str(q.get("solution") or "")
    if needle not in blob:
        continue
    print("id", q.get("id"), "mid", q.get("_marksId"), "src", q.get("source"))
    print("keys", list(q.keys()))
    print("q", str(q.get("q"))[:500])
    print("sol", str(q.get("solution"))[:300])
    mid = q.get("_marksId")
    cache = Path(r"C:\Users\Admin\qx-hosting\data\qid_marks") / f"{mid}.json"
    print("cache", cache.exists())
    if cache.exists():
        j = json.loads(cache.read_text(encoding="utf-8"))
        t = json.dumps(j)
        imgs = re.findall(r"https?://[^\"'\\s>]+\.(?:png|jpg|jpeg|webp)", t, re.I)
        print("cache imgs", imgs[:8])
    break
