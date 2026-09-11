#!/usr/bin/env python3
"""Resolve Rank Booster Numerical-module leftovers using official Marks subject/chapter IDs."""
from __future__ import annotations

import json
import time
from pathlib import Path

import apply_official_nat as N
import hydrate_books_from_marks as H

ROOT = Path(r"C:\Users\Admin\qx-hosting")
EXAM = "68f1ce4cc729e5251bd00430"
MOD = "68f8d5406d5eb44aa9cc2c1f"  # Must Do Numerical Type Qs
CHDIR = ROOT / "data" / "books" / "chapters" / EXAM


def slug(s):
    return "".join(ch if ch.isalnum() else "_" for ch in (s or "").lower()).strip("_")


def main():
    code, body = H.api(f"/api/v4/marks-selected/exam/{EXAM}/module/{MOD}/subjects", {"platform": "web"})
    print("subjects", code, flush=True)
    data = (body or {}).get("data") or body or {}
    subs = []
    if isinstance(data, list):
        subs = data
    elif isinstance(data, dict):
        block = data.get("subjects")
        if isinstance(block, dict):
            subs = block.get("subjects") or block.get("data") or []
        elif isinstance(block, list):
            subs = block
    print("n subjects", len(subs), flush=True)
    if subs:
        print("sub0", subs[0].get("_id"), subs[0].get("title") or subs[0].get("name"), flush=True)

    stats = {"listed": 0, "fetched": 0, "nat": 0, "files": 0}
    for sub in subs:
        sid = sub.get("_id") or sub.get("id")
        sname = sub.get("title") or sub.get("name") or ""
        print("SUB", sname, sid, flush=True)
        cc, cb = H.api(
            f"/api/v4/marks-selected/exam/{EXAM}/module/{MOD}/subjects/{sid}/chapters",
            {"platform": "web"},
        )
        chs = []
        if cc == 200:
            dd = cb.get("data") or {}
            if isinstance(dd, list):
                chs = dd
            elif isinstance(dd, dict):
                block = dd.get("chapters") or dd.get("subjects") or dd
                if isinstance(block, dict):
                    chs = block.get("chapters") or block.get("data") or []
                elif isinstance(block, list):
                    chs = block
                else:
                    chs = []
        print("  chapters", cc, len(chs), flush=True)
        time.sleep(H.SLEEP)
        for ch in chs:
            cid = ch.get("_id") or ch.get("id")
            cname = ch.get("title") or ch.get("name") or ""
            sl = slug(cname)
            # find leftover local file by slug
            matches = list(CHDIR.glob(f"*__{sl}.json")) + list(CHDIR.glob(f"*mathematics__{sl}.json"))
            matches = [p for p in matches if MOD in p.name or "mathematics" in p.name]
            if not matches:
                # broader
                matches = [p for p in CHDIR.glob("*.json") if p.stem.endswith("__" + sl)]
            if not matches:
                continue
            official = H.chapter_questions(EXAM, MOD, sid, cid)
            stats["listed"] += len(official)
            print(f"  {cname[:40]:40} off={len(official):3} files={len(matches)} {cid}", flush=True)
            time.sleep(H.SLEEP)
            by = {}
            for oq in official:
                oid = oq.get("_id")
                title = ((oq.get("title") or {}) if isinstance(oq.get("title"), dict) else {}).get("text") or ""
                if oid:
                    by[H.stem_key(title)[:50]] = oid
            for fp in matches:
                data = json.loads(fp.read_text(encoding="utf-8"))
                qs = data.get("questions") if isinstance(data, dict) else data
                if not isinstance(qs, list):
                    continue
                chg = False
                for i, q in enumerate(qs):
                    if not H.leftover(q) and q.get("correctValue") not in (None, ""):
                        continue
                    if not H.leftover(q):
                        continue
                    p = H.stem_key(q.get("q") or "")[:50]
                    oid = q.get("_marksId") or by.get(p)
                    if not oid:
                        for k, v in by.items():
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
                            stats["nat"] += 1
                            chg = True
                    else:
                        if N.apply_mcq_key(q, dlt, oid):
                            chg = True
                if chg:
                    if isinstance(data, dict):
                        data["questions"] = qs
                        fp.write_text(json.dumps(data), encoding="utf-8")
                    else:
                        fp.write_text(json.dumps(qs), encoding="utf-8")
                    stats["files"] += 1

    left = 0
    for fp in CHDIR.glob("*.json"):
        data = json.loads(fp.read_text(encoding="utf-8"))
        qs = data.get("questions") if isinstance(data, dict) else data
        if isinstance(qs, list):
            left += sum(1 for q in qs if H.leftover(q))
    stats["leftover"] = left
    print("DONE", json.dumps(stats), flush=True)
    (ROOT / "data" / "_migration" / "fix_rank_numerical.json").write_text(json.dumps(stats, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
