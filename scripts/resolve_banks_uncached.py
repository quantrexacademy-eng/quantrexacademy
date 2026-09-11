#!/usr/bin/env python3
"""Fetch leftover bank questions that have _marksId but no local cache. Skip Examgoal."""
from __future__ import annotations

import json
import time
from pathlib import Path

import apply_official_nat as N
import hydrate_books_from_marks as H

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK = ROOT / "data" / "banks"
QID = ROOT / "data" / "qid_marks"


def leftover_letter(q):
    opts = q.get("options") or []
    return bool(opts) and H.opt_score(opts) < 2


def collect():
    ids = []
    files = []
    for fp in sorted(BANK.glob("*.json")):
        if ".bak" in fp.name:
            continue
        data = json.loads(fp.read_text(encoding="utf-8"))
        qs = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(qs, list):
            continue
        hit = False
        for q in qs:
            if not leftover_letter(q):
                continue
            mid = q.get("_marksId")
            if not mid:
                continue
            if not (QID / f"{mid}.json").exists():
                ids.append(str(mid))
                hit = True
        if hit:
            files.append(fp)
    return sorted(set(ids)), files


def main():
    ids, files = collect()
    print("uncached leftover ids", len(ids), "files", len(files), flush=True)
    stats = {"api": 0, "fail": 0, "nat": 0, "mcq": 0, "files": 0}
    for i, mid in enumerate(ids, 1):
        rec, src = H.fetch_full(mid)
        if src == "api":
            stats["api"] += 1
            time.sleep(H.SLEEP)
        elif src.startswith("http") or src == "fail":
            stats["fail"] += 1
        if i % 50 == 0 or i == len(ids):
            print(f"  fetch {i}/{len(ids)} api={stats['api']} fail={stats['fail']}", flush=True)

    for fp in files:
        data = json.loads(fp.read_text(encoding="utf-8"))
        qs = data.get("questions") if isinstance(data, dict) else data
        chg = False
        for q in qs:
            if not leftover_letter(q):
                continue
            mid = q.get("_marksId")
            dlt = N.official(mid)
            if not dlt:
                continue
            t = str(dlt.get("type") or "").lower()
            if "numerical" in t or "integer" in t or dlt.get("correctValue") not in (None, ""):
                if N.apply_nat(q, dlt, mid):
                    stats["nat"] += 1
                    chg = True
            else:
                if N.apply_mcq_key(q, dlt, mid):
                    stats["mcq"] += 1
                    chg = True
        if chg:
            if isinstance(data, dict):
                data["questions"] = qs
                fp.write_text(json.dumps(data), encoding="utf-8")
            else:
                fp.write_text(json.dumps(qs), encoding="utf-8")
            stats["files"] += 1
            print(" wrote", fp.name, flush=True)

    left = 0
    for fp in BANK.glob("*.json"):
        if ".bak" in fp.name:
            continue
        data = json.loads(fp.read_text(encoding="utf-8"))
        qs = data.get("questions") if isinstance(data, dict) else data
        if isinstance(qs, list):
            left += sum(1 for q in qs if leftover_letter(q))
    stats["letterNow"] = left
    out = ROOT / "data" / "_migration" / "resolve_banks_uncached.json"
    out.write_text(json.dumps(stats, indent=2), encoding="utf-8")
    print("DONE", json.dumps(stats), flush=True)


if __name__ == "__main__":
    main()
