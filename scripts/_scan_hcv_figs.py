#!/usr/bin/env python3
"""Scan HC Verma + all digital books for broken/missing figure files."""
from __future__ import annotations
from collections import Counter, defaultdict
from pathlib import Path
import json
import re

ROOT = Path(r"C:\Users\Admin\qx-hosting")
CH = ROOT / "data" / "books" / "chapters"
BOOKS = json.loads((ROOT / "data" / "books.json").read_text(encoding="utf-8"))
NAMES = {}
for b in (BOOKS.get("engineering") or []) + (BOOKS.get("medical") or []):
    if b and b.get("id"):
        NAMES[b["id"]] = b.get("title") or b.get("badge") or b["id"]

SRC = re.compile(r"""src\s*=\s*\\?["']([^"']+)""", re.I)

def norm(u: str) -> str:
    s = str(u or "").replace("\\/", "/").split("?")[0].strip().rstrip("\\")
    return s

def local_path(u: str):
    s = norm(u)
    if s.startswith("/assets/") or s.startswith("assets/"):
        return ROOT / s.lstrip("/")
    if s.startswith("/"):
        return ROOT / s.lstrip("/")
    return None

def scan_book(bid: str):
    d = CH / bid
    c = Counter()
    missing = []
    hosts = Counter()
    if not d.exists():
        return {"exists": False}
    for fp in d.glob("*.json"):
        txt = fp.read_text(encoding="utf-8", errors="ignore")
        for raw in SRC.findall(txt):
            u = norm(raw)
            if not re.search(r"\.(png|jpe?g|webp|gif|svg)|/assets/diagrams|getmarks|quizrr|examgoal|proxy-image", u, re.I):
                continue
            c["imgs"] += 1
            if "getmarks" in u.lower():
                c["getmarks"] += 1
                hosts["getmarks"] += 1
            elif "quizrr" in u.lower():
                c["quizrr"] += 1
            elif "proxy-image" in u.lower():
                c["proxy"] += 1
            elif "/assets/diagrams/" in u or u.startswith("assets/diagrams/"):
                c["local"] += 1
                p = local_path(u)
                if p is None or not p.exists() or p.stat().st_size < 80:
                    c["missing"] += 1
                    if len(missing) < 8:
                        missing.append({"file": fp.name[-50:], "url": u[:120], "exists": bool(p and p.exists()), "size": (p.stat().st_size if p and p.exists() else 0)})
            else:
                c["other"] += 1
                if len(missing) < 8 and "mathpix" not in u.lower():
                    missing.append({"file": fp.name[-50:], "url": u[:120], "kind": "other"})
    return {"exists": True, "title": NAMES.get(bid, bid), **c, "missing_samples": missing}

def main():
    ids = sorted({p.name for p in CH.iterdir() if p.is_dir()})
    rows = []
    for bid in ids:
        r = scan_book(bid)
        r["id"] = bid
        rows.append(r)
        if r.get("missing") or r.get("getmarks") or r.get("quizrr") or r.get("proxy"):
            print(json.dumps({k: r[k] for k in r if k != "missing_samples"}, ensure_ascii=False), flush=True)
            if r.get("missing_samples"):
                print("  samples", r["missing_samples"][:3], flush=True)
    print("---ALL---", flush=True)
    print(json.dumps([{k: x[k] for k in x if k != "missing_samples"} for x in rows], indent=2), flush=True)

if __name__ == "__main__":
    main()
