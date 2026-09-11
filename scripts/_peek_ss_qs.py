#!/usr/bin/env python3
import json, re
from pathlib import Path
raw = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\banks\jee_main.json").read_text(encoding="utf-8"))
ids = [29647, 27622, 35964, 42862, 28015, 28663]
by = {q.get("id"): q for q in raw["questions"]}
for i in ids:
    q = by.get(i)
    if not q:
        print("missing", i)
        continue
    print("ID", i)
    print(" stem", re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(q.get("q") or "")))[:160])
    print(" imgs", len(re.findall(r"<img", str(q.get("q")) + str(q.get("options")) + str(q.get("solution")), re.I)))
    print(" opts", [re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(o)))[:70] for o in (q.get("options") or [])])
    print(" sol", re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(q.get("solution") or "")))[:120])
    print("---")
