#!/usr/bin/env python3
import json, collections
from pathlib import Path
p = Path(r"C:\Users\Admin\qx-hosting\data\banks\dpp.json")
raw = json.loads(p.read_text(encoding="utf-8"))
qs = raw["questions"]
print("n", len(qs), "keys", list(qs[0].keys())[:25])
print("id0", qs[0].get("id"), "marks", qs[0].get("_marksId"), "src", qs[0].get("source"), "exam", qs[0].get("exam"))
print("sol0", str(qs[0].get("solution") or "")[:120])
src = collections.Counter(str(q.get("source") or "")[:50] for q in qs)
print("top source", src.most_common(8))
ids = collections.Counter()
for q in qs:
    for k in ("_marksId", "id", "_id", "qid", "masterId"):
        v = q.get(k)
        if v:
            ids[k] += 1
print("id fields", dict(ids))
empty = 0
empty_src = collections.Counter()
for q in qs:
    s = str(q.get("solution") or "").strip()
    if len(s) < 12 or s.lower() in ("no solution", "no solution."):
        empty += 1
        empty_src[str(q.get("source") or q.get("exam") or "")[:50]] += 1
print("empty", empty)
print("empty src", empty_src.most_common(10))
