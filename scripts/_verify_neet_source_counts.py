#!/usr/bin/env python3
import json, re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
bank = json.loads((ROOT / "data/banks/neet.json").read_text(encoding="utf-8"))
qs = bank["questions"] if isinstance(bank, dict) else bank
idx = json.loads((ROOT / "data/nav/pyq_paper_index/neet.json").read_text(encoding="utf-8"))

def stem(q):
    t = str(q.get("q") or q.get("question") or "")
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"\s+", " ", t).strip().lower()
    return t[:180]

def usable(q):
    t = stem(q)
    opts = q.get("options") or []
    nopt = sum(1 for o in opts if str(o if not isinstance(o, dict) else (o.get("text") or o.get("html") or "")).strip())
    return bool(t) and nopt >= 2

by_src = defaultdict(list)
for q in qs:
    by_src[str(q.get("source") or "").strip()].append(q)

print("BANK_SOURCES")
for src, arr in sorted(by_src.items(), key=lambda x: (-len(x[1]), x[0])):
    if not src:
        src_l = "(empty)"
    else:
        src_l = src
    u = sum(1 for q in arr if usable(q))
    print(f"  {len(arr):5d} usable={u:5d}  {src_l}")

print("\nINDEX")
for y, papers in sorted(idx.items()):
    for p in papers:
        src = p.get("source")
        b = by_src.get(src) or []
        u = sum(1 for q in b if usable(q))
        print(f"  {y} idx={p.get('count')} bank={len(b)} usable={u} {src}")
