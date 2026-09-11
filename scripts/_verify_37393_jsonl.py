#!/usr/bin/env python3
import json
from pathlib import Path
p = Path(r"E:\QUANTREX\website\data\_migration\chapter_hydrate_docs.jsonl")
hit = None
n = 0
for line in p.open(encoding="utf-8"):
    n += 1
    d = json.loads(line)
    if str(d.get("id")) == "37393":
        hit = d
        break
print("lines", n)
if not hit:
    print("37393 NOT in jsonl")
else:
    sol = hit.get("solution") or ""
    print("37393 source", hit.get("source"))
    print("nopts", len(hit.get("options") or []))
    print("answer", hit.get("answer"))
    print("has_R", "$R$" in sol)
    print("has_53", r"\dfrac{5}{3}" in sol or r"\frac{5}{3}" in sol)
    print("has_log_y", r"log_y" in sol or r"log _y" in sol)
    print("has_img", "<img" in sol)
    print("sol_len", len(sol))
