#!/usr/bin/env python3
import json, re, collections
from pathlib import Path
raw = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\banks\jee_main.json").read_text(encoding="utf-8"))
qs = raw["questions"]

def plain(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()

y26 = [q for q in qs if "2026" in str(q.get("source") or "")]
empty = [q for q in y26 if len(plain(q.get("solution") or "")) < 12]
print("jee2026", len(y26), "empty_sol", len(empty))
src = collections.Counter(q.get("source") for q in y26)
print("papers", len(src), "sample", src.most_common(5))
if empty:
    for q in empty[:8]:
        print("EMPTY", q.get("id"), q.get("source"), q.get("_marksId"), repr(plain(q.get("solution"))[:60]))
# sample a filled sol
filled = [q for q in y26 if len(plain(q.get("solution") or "")) >= 40]
print("filled", len(filled))
if filled:
    q = filled[0]
    print("SAMPLE", q.get("id"), q.get("source"))
    print(plain(q.get("solution"))[:280])
