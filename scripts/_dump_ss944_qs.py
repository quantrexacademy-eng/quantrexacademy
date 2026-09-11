#!/usr/bin/env python3
import json
from pathlib import Path
ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK = json.loads((ROOT / "data/banks/jee_main.json").read_text(encoding="utf-8"))
SRC = "JEE Main 2025 (8 Apr Shift 2)"
qs = [q for q in BANK["questions"] if q.get("source") == SRC]
ids = {26832, 26833, 28684, 29669, 37045}
print("paper n", len(qs))
for i, q in enumerate(qs, 1):
    if q.get("id") not in ids:
        continue
    print("=" * 70)
    print("Q#", i, "id", q.get("id"), q.get("subject"), q.get("chapter"), q.get("questionType") or q.get("type"))
    print("STEM RAW:")
    print(q.get("q"))
    print("OPTS:", q.get("options"))
    print("ANS", q.get("answer"), "CV", q.get("correctValue"))
    sol = str(q.get("solution") or "")
    print("SOL len", len(sol), "head", sol[:180].replace("\n", " "))

# aligned usage in this paper
n_aligned = sum(1 for q in qs if "\\begin{aligned}" in str(q.get("q") or ""))
n_array = sum(1 for q in qs if "\\begin{array}" in str(q.get("q") or ""))
n_img = sum(1 for q in qs if "<img" in str(q.get("q") or "").lower())
print("\naligned stems", n_aligned, "array stems", n_array, "img stems", n_img)

# math order: first math SC is likely among first math questions
math = [q for q in qs if q.get("subject") == "Mathematics"]
print("\nFirst 5 MATH ids/chapters:")
for i, q in enumerate(math[:8], 1):
    opts = q.get("options") or []
    plains = []
    for o in opts:
        t = str(o)
        plains.append(t[:20])
    print(i, q.get("id"), q.get("chapter"), plains, "stem0", str(q.get("q"))[:80].replace("\n"," "))
