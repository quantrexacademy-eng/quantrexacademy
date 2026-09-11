#!/usr/bin/env python3
"""Apply official Marks stems/options/sols for leftover missing-fig + letter stubs."""
from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
sys.path.insert(0, str(ROOT / "scripts"))
from _hydrate_all_from_marks import (  # noqa: E402
    apply_rec,
    fetch_one,
    is_nat,
    letter_opts,
    mongo_id,
    plain,
)

BANKS = ROOT / "data" / "banks"
FIG_TALK = re.compile(
    r"\b(shown in (the )?(figure|diagram|graph)|see (the )?figure|as shown in (the )?figure)\b",
    re.I,
)
SRC_RX = re.compile(r"<img\b", re.I)


def banks():
    return [p for p in sorted(BANKS.glob("*.json")) if "bak" not in p.name]


def load(path: Path):
    raw = json.loads(path.read_text(encoding="utf-8"))
    qs = raw.get("questions") if isinstance(raw, dict) else raw
    extra = {k: v for k, v in raw.items() if k != "questions"} if isinstance(raw, dict) else {}
    return extra, qs, isinstance(raw, list)


def save(path: Path, extra, qs, as_list):
    if as_list:
        path.write_text(json.dumps(qs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        return
    extra["questions"] = qs
    path.write_text(json.dumps(extra, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def main():
    jobs = []
    for p in banks():
        extra, qs, _ = load(p)
        if not qs:
            continue
        rel = str(p)
        for i, q in enumerate(qs or []):
            if not q:
                continue
            mid = mongo_id(q)
            if not mid:
                continue
            qh = str(q.get("q") or "")
            sh = str(q.get("solution") or "")
            reasons = []
            if FIG_TALK.search(plain(qh)) and not SRC_RX.search(qh):
                reasons.append("stem")
            if FIG_TALK.search(plain(sh)) and not SRC_RX.search(sh):
                reasons.append("sol")
            if q.get("options") and (not is_nat(q)) and letter_opts(q.get("options")):
                reasons.append("opts")
            if reasons:
                jobs.append((rel, i, mid, reasons))
    uniq = []
    seen = set()
    for _, _, mid, _ in jobs:
        if mid not in seen:
            seen.add(mid)
            uniq.append(mid)
    print("jobs", len(jobs), "unique", len(uniq), flush=True)
    fetched = {}
    n_ok = n_fail = 0
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(fetch_one, qid): qid for qid in uniq}
        n = 0
        for fut in as_completed(futs):
            n += 1
            qid, status, rec = fut.result()
            if rec:
                fetched[qid] = rec
                n_ok += 1
            else:
                n_fail += 1
            if n % 40 == 0 or n == len(uniq):
                print(f"  fetch {n}/{len(uniq)} ok={n_ok} fail={n_fail} {status}", flush=True)
    by = defaultdict(list)
    for rel, i, mid, reasons in jobs:
        by[rel].append((i, mid, reasons))
    applied = 0
    for rel, items in by.items():
        extra, qs, as_list = load(Path(rel))
        ch = 0
        for i, mid, reasons in items:
            rec = fetched.get(mid)
            if not rec:
                continue
            got = apply_rec(qs[i], rec)
            if got:
                ch += 1
                applied += 1
        if ch:
            save(Path(rel), extra, qs, as_list)
            print("wrote", Path(rel).name, ch, flush=True)
    print("applied", applied, "fetched", n_ok, "fail", n_fail, flush=True)


if __name__ == "__main__":
    main()
