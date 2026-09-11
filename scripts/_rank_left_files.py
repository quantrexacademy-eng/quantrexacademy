#!/usr/bin/env python3
from collections import Counter
from pathlib import Path
import json
import hydrate_books_from_marks as H

d = Path(r"C:\Users\Admin\qx-hosting\data\books\chapters\68f1ce4cc729e5251bd00430")
by = Counter()
n = 0
with_id = 0
samples = []
for fp in d.glob("*.json"):
    data = json.loads(fp.read_text(encoding="utf-8"))
    qs = data.get("questions") if isinstance(data, dict) else data
    if not isinstance(qs, list):
        continue
    bad = [q for q in qs if H.leftover(q)]
    if not bad:
        continue
    n += len(bad)
    with_id += sum(1 for q in bad if q.get("_marksId"))
    tail = fp.stem.split("__")[-1] if "__" in fp.stem else fp.stem
    by[tail] += len(bad)
    if len(samples) < 8:
        q = bad[0]
        samples.append({"file": tail, "n": len(bad), "mid": q.get("_marksId"), "opts": q.get("options"), "stem": H.strip(q.get("q"))[:60]})
print("total", n, "withId", with_id, "files", len(by))
print("top files", by.most_common(15))
for s in samples:
    print(s)
