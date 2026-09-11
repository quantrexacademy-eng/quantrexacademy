#!/usr/bin/env python3
import json, re
from collections import Counter
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")

def plain(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()

def peek(bank, n=8):
    raw = json.loads((ROOT / "data/banks" / bank).read_text(encoding="utf-8"))
    qs = raw["questions"] if isinstance(raw, dict) else raw
    empty = []
    stub = []
    letter = 0
    for q in qs:
        if not q: continue
        p = plain(q.get("solution") or "")
        opts = q.get("options") or []
        op = []
        for o in opts:
            op.append(plain(o.get("text") if isinstance(o, dict) else o))
        if op and all(re.fullmatch(r"[A-Da-d]", x or "") for x in op if x):
            letter += 1
        if not p or p.lower() in ("no solution", "no solution."):
            empty.append(q)
        elif len(p) < 12:
            stub.append(q)
    print(f"\n== {bank} empty={len(empty)} stub={len(stub)} letter_opts={letter}")
    src = Counter(str(q.get("source") or "(none)")[:50] for q in empty)
    print(" empty by source", src.most_common(8))
    for q in empty[:n]:
        print("  E", q.get("id"), q.get("subject"), str(q.get("source"))[:40], "stem", plain(q.get("q"))[:70])
    for q in stub[:4]:
        print("  S", q.get("id"), repr(plain(q.get("solution"))), "stem", plain(q.get("q"))[:60])

peek("neet.json")
peek("jee_main.json")
peek("jee_advanced.json")
peek("dpp.json", 4)
peek("class_9.json", 4)

# test series layout
ts = ROOT / "data" / "tests"
if ts.exists():
    files = list(ts.rglob("*.json"))
    print("\n=== tests json files", len(files))
    for p in files[:8]:
        try:
            j = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        keys = list(j.keys())[:12] if isinstance(j, dict) else type(j).__name__
        print(" ", p.relative_to(ROOT), "keys", keys)
