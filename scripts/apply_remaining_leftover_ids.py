#!/usr/bin/env python3
"""Fetch official Marks IDs for leftover book questions that still lack cache, then apply NAT/keys."""
from __future__ import annotations

import json
import time
from pathlib import Path

import hydrate_books_from_marks as H
import apply_official_nat as N

ROOT = Path(r"C:\Users\Admin\qx-hosting")
CHDIR = ROOT / "data" / "books" / "chapters"
TARGET = [
    "68f1ce4cc729e5251bd00430",  # rank leftover ~464
    "68946f70ebd145663de38728",
    "69736c8362b916d85e52cd1b",
    "69048808ef55966cf1d71f1d",
]


def parse_ids(fp: Path, book_id: str):
    parts = fp.stem.split("__")
    if len(parts) >= 4 and parts[0] == book_id:
        return parts[1], parts[2], parts[3]
    data = json.loads(fp.read_text(encoding="utf-8"))
    if isinstance(data, dict):
        return data.get("moduleId"), data.get("subjectId"), data.get("chapterId")
    return None, None, None


def pre(s):
    return H.stem_key(s)[:50]


def main():
    stats = {"listed": 0, "fetched": 0, "appliedNat": 0, "appliedMcq": 0, "files": 0}
    for bid in TARGET:
        d = CHDIR / bid
        if not d.exists():
            continue
        print("====", bid, flush=True)
        for fp in sorted(d.glob("*.json")):
            data = json.loads(fp.read_text(encoding="utf-8"))
            qs = data.get("questions") if isinstance(data, dict) else data
            if not isinstance(qs, list):
                continue
            bad = [(i, q) for i, q in enumerate(qs) if H.leftover(q)]
            if not bad:
                continue
            mid, sid, cid = parse_ids(fp, bid)
            if not mid or not sid or not cid or len(str(cid)) < 20:
                continue
            official = H.chapter_questions(bid, mid, sid, cid)
            stats["listed"] += len(official)
            time.sleep(H.SLEEP)
            by = {}
            for oq in official:
                oid = oq.get("_id")
                title = ((oq.get("title") or {}) if isinstance(oq.get("title"), dict) else {}).get("text") or ""
                if oid:
                    by[pre(title)] = oid
            used = {str(q.get("_marksId") or "") for q in qs if q.get("_marksId")}
            chg = False
            for i, q in bad:
                oid = q.get("_marksId") or by.get(pre(q.get("q") or q.get("question") or ""))
                if not oid:
                    p = pre(q.get("q") or "")
                    for k, v in by.items():
                        if v in used:
                            continue
                        if k.startswith(p[:36]) or p.startswith(k[:36]):
                            oid = v
                            break
                if not oid and len(qs) == len(official):
                    oid = official[i].get("_id")
                if not oid:
                    continue
                rec, src = H.fetch_full(oid)
                if src == "api":
                    stats["fetched"] += 1
                    time.sleep(H.SLEEP)
                dlt = N.official(oid)
                if not dlt:
                    continue
                t = str(dlt.get("type") or "").lower()
                if "numerical" in t or dlt.get("correctValue") not in (None, ""):
                    if N.apply_nat(q, dlt, oid):
                        stats["appliedNat"] += 1
                        chg = True
                        used.add(oid)
                else:
                    if N.apply_mcq_key(q, dlt, oid):
                        stats["appliedMcq"] += 1
                        chg = True
                        used.add(oid)
            if chg:
                if isinstance(data, dict):
                    data["questions"] = qs
                    fp.write_text(json.dumps(data), encoding="utf-8")
                else:
                    fp.write_text(json.dumps(qs), encoding="utf-8")
                stats["files"] += 1
        left = 0
        for fp in d.glob("*.json"):
            data = json.loads(fp.read_text(encoding="utf-8"))
            qs = data.get("questions") if isinstance(data, dict) else data
            if isinstance(qs, list):
                left += sum(1 for q in qs if H.leftover(q))
        print("  leftover", left, flush=True)
        stats[bid] = left
    out = ROOT / "data" / "_migration" / "apply_remaining_ids.json"
    out.write_text(json.dumps(stats, indent=2), encoding="utf-8")
    print("DONE", json.dumps(stats), flush=True)


if __name__ == "__main__":
    main()
