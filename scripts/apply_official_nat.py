#!/usr/bin/env python3
"""Convert leftover letter-MCQs to official Marks numerical (NAT) when type+correctValue exist.
Never invents values. Also applies official solutions/answers for MCQ leftovers.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import hydrate_books_from_marks as H

ROOT = Path(r"C:\Users\Admin\qx-hosting")
CHDIR = ROOT / "data" / "books" / "chapters"
BANKDIR = ROOT / "data" / "banks"
QID = ROOT / "data" / "qid_marks"


def official(mid):
    if not mid:
        return None
    p = QID / f"{mid}.json"
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8")).get("data") or {}


def apply_nat(q, d, mid):
    cv = d.get("correctValue")
    if cv is None or cv == "":
        return False
    q["type"] = "numerical"
    q["questionType"] = "numerical"
    q["correctValue"] = str(cv)
    q["answer"] = str(cv)
    q["options"] = []
    q["_marksId"] = mid
    rec = H.marks_to_local(d)
    if rec and rec.get("solution"):
        q["solution"] = rec["solution"]
    if rec and rec.get("q") and len(H.strip(rec["q"])) >= len(H.strip(q.get("q") or "")):
        # keep local if it already has local figs; else official text
        if "cdn.quizrr.in" in str(q.get("q") or "") or not H.strip(q.get("q") or ""):
            q["q"] = rec["q"]
            q["question"] = rec["q"]
    return True


def apply_mcq_key(q, d, mid):
    rec = H.marks_to_local(d)
    ch = False
    if rec and rec.get("answer") is not None:
        q["answer"] = rec["answer"]
        ch = True
    if rec and rec.get("solution") and len(H.strip(rec["solution"])) > len(H.strip(q.get("solution") or "")) + 8:
        q["solution"] = rec["solution"]
        ch = True
    if mid and not q.get("_marksId"):
        q["_marksId"] = mid
        ch = True
    # keep official options only if they are actually better (images/text)
    if rec and H.opt_score(rec.get("options")) > H.opt_score(q.get("options")):
        q["options"] = rec["options"]
        ch = True
    return ch


def walk_book(bid):
    d = CHDIR / bid
    if not d.exists():
        return 0, 0, 0
    nat = mcq = files = 0
    need_fetch = []
    for fp in d.glob("*.json"):
        data = json.loads(fp.read_text(encoding="utf-8"))
        qs = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(qs, list):
            continue
        chg = False
        for q in qs:
            if not H.leftover(q) and not (
                H.opt_score(q.get("options")) < 2 and (q.get("options") or [])
            ):
                continue
            mid = q.get("_marksId")
            dlt = official(mid)
            if not dlt:
                if mid:
                    need_fetch.append(mid)
                continue
            t = str(dlt.get("type") or "").lower()
            if "numerical" in t or "integer" in t or dlt.get("correctValue") not in (None, ""):
                if apply_nat(q, dlt, mid):
                    nat += 1
                    chg = True
            else:
                if apply_mcq_key(q, dlt, mid):
                    mcq += 1
                    chg = True
        if chg:
            if isinstance(data, dict):
                data["questions"] = qs
                fp.write_text(json.dumps(data), encoding="utf-8")
            else:
                fp.write_text(json.dumps(qs), encoding="utf-8")
            files += 1
    return nat, mcq, files, need_fetch


def walk_banks():
    nat = mcq = files = 0
    for fp in BANKDIR.glob("*.json"):
        if ".bak" in fp.name:
            continue
        data = json.loads(fp.read_text(encoding="utf-8"))
        qs = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(qs, list):
            continue
        chg = False
        for q in qs:
            mid = q.get("_marksId")
            if not mid:
                continue
            letter = bool(q.get("options")) and H.opt_score(q.get("options")) < 2
            if not letter:
                continue
            dlt = official(mid)
            if not dlt:
                continue
            t = str(dlt.get("type") or "").lower()
            if "numerical" in t or dlt.get("correctValue") not in (None, ""):
                if apply_nat(q, dlt, mid):
                    nat += 1
                    chg = True
            elif letter:
                if apply_mcq_key(q, dlt, mid):
                    mcq += 1
                    chg = True
        if chg:
            if isinstance(data, dict):
                data["questions"] = qs
                fp.write_text(json.dumps(data), encoding="utf-8")
            else:
                fp.write_text(json.dumps(qs), encoding="utf-8")
            files += 1
    return nat, mcq, files


def main():
    stats = {"books": {}, "fetch": 0, "cache": 0}
    all_need = []
    for bid in H.BOOKS:
        nat, mcq, files, need = walk_book(bid)
        stats["books"][bid] = {"nat": nat, "mcq": mcq, "files": files, "needFetch": len(need)}
        all_need.extend(need)
        print(bid, "nat", nat, "mcq", mcq, "need", len(need), flush=True)

    # fetch missing official then re-apply
    uniq = sorted(set(all_need))
    print("fetch missing", len(uniq), flush=True)
    for i, mid in enumerate(uniq, 1):
        rec, src = H.fetch_full(mid)
        if src == "api":
            stats["fetch"] += 1
            time.sleep(H.SLEEP)
        else:
            stats["cache"] += 1
        if i % 50 == 0 or i == len(uniq):
            print(f"  {i}/{len(uniq)} api={stats['fetch']}", flush=True)

    if uniq:
        print("re-apply after fetch", flush=True)
        for bid in H.BOOKS:
            nat, mcq, files, need = walk_book(bid)
            prev = stats["books"][bid]
            prev["nat"] += nat
            prev["mcq"] += mcq
            prev["files"] += files
            prev["stillNeed"] = len(need)
            print(" ", bid, "nat+", nat, "mcq+", mcq, "still", len(need), flush=True)

    bn, bm, bf = walk_banks()
    stats["banks"] = {"nat": bn, "mcq": bm, "files": bf}

    # leftover recount
    left = {}
    for bid in H.BOOKS:
        n = 0
        d = CHDIR / bid
        if not d.exists():
            continue
        for fp in d.glob("*.json"):
            data = json.loads(fp.read_text(encoding="utf-8"))
            qs = data.get("questions") if isinstance(data, dict) else data
            if isinstance(qs, list):
                n += sum(1 for q in qs if H.leftover(q))
        left[bid] = n
    stats["leftoverNow"] = left
    out = ROOT / "data" / "_migration" / "apply_official_nat.json"
    out.write_text(json.dumps(stats, indent=2), encoding="utf-8")
    print("DONE", json.dumps(stats), flush=True)


if __name__ == "__main__":
    main()
