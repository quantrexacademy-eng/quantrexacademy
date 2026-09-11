#!/usr/bin/env python3
import json, re
from pathlib import Path

bank = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\banks\jee_main.json").read_text(encoding="utf-8"))
qs = bank["questions"]

def plain(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()

needles = [
    "25^{13}",
    "25^13",
    "divisible by 7",
    "Taking the limit as",
    "(1+x)^{1000}",
    "geometric series",
]
hits = []
for q in qs:
    blob = str(q.get("q") or "") + " " + str(q.get("solution") or "")
    if "2026" not in str(q.get("source") or ""):
        continue
    if any(n.lower() in blob.lower() or n in blob for n in ("divisible by 7", "25^{13}", "Taking the limit as", "(1+x)^{1000}", "1000} + x(1+x)")):
        hits.append(q)

print("hits", len(hits))
for q in hits[:8]:
    sol = str(q.get("solution") or "")
    print("\n====", q.get("id"), q.get("source"), "ans", q.get("answer"))
    print("STEM", plain(q.get("q"))[:180])
    print("SOL_LEN", len(sol), "table", "<table" in sol.lower(), "float", "float" in sol.lower(), "div", sol.lower().count("<div"))
    print(sol[:2500])
    print("---END---")

# 2026 paper counts vs empty stems
from collections import Counter, defaultdict
by = defaultdict(list)
empty_stem = Counter()
empty_sol = Counter()
for q in qs:
    src = str(q.get("source") or "")
    if "2026" not in src:
        continue
    by[src].append(q)
    if len(plain(q.get("q"))) < 8:
        empty_stem[src] += 1
    if len(plain(q.get("solution"))) < 12:
        empty_sol[src] += 1
print("\n=== 2026 papers ===")
for src in sorted(by):
    print(f"{len(by[src]):3d} emptyStem={empty_stem[src]:2d} emptySol={empty_sol[src]:2d}  {src}")
