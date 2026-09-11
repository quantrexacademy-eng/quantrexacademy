#!/usr/bin/env python3
import json
from pathlib import Path

OUT = Path(r"C:\Users\Admin\qx-hosting\data\_migration\marks_pyqmt_probe")

def walk(obj, path=""):
    if isinstance(obj, dict):
        keys = list(obj.keys())
        interesting = [k for k in keys if any(x in k.lower() for x in (
            "question", "count", "year", "paper", "title", "name", "duration", "mark",
            "subject", "shift", "source", "total", "id", "time", "qcount", "nques"
        ))]
        if interesting:
            print("KEYS", path, interesting[:40])
        for k, v in obj.items():
            walk(v, path + "." + str(k))
    elif isinstance(obj, list):
        print("LIST", path, "n=", len(obj), "sample_type", type(obj[0]).__name__ if obj else None)
        if obj and isinstance(obj[0], dict):
            print("  item_keys", list(obj[0].keys())[:40])
            for i, it in enumerate(obj[:3]):
                slim = {k: (str(v)[:80] if not isinstance(v, (list, dict)) else type(v).__name__) for k, v in it.items()}
                print("  item", i, slim)
        if len(obj) <= 80:
            for it in obj:
                walk(it, path + "[]")
        else:
            walk(obj[0], path + "[0]")


for name in [
    "hit_api_v3_pyq-mock_615d76e4c52ffa3c944600e1__re-neet.json",
    "hit_api_v3_pyq-mock_615d76e4c52ffa3c944600e1__pyqmocktest.json",
]:
    p = OUT / name
    print("\n====", name, p.stat().st_size)
    j = json.loads(p.read_text(encoding="utf-8"))
    walk(j)
