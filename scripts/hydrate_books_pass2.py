#!/usr/bin/env python3
"""Second pass: pair leftover book questions to official Marks IDs by chapter index/prefix."""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

import hydrate_books_from_marks as H

ROOT = Path(r"C:\Users\Admin\qx-hosting")
CHDIR = ROOT / "data" / "books" / "chapters"
NAV = ROOT / "data" / "nav" / "books"


def prefix(s, n=55):
    return H.stem_key(s)[:n]


def parse_ids(fp: Path, book_id: str):
    name = fp.stem
    parts = name.split("__")
    if len(parts) >= 4 and parts[0] == book_id:
        return parts[1], parts[2], parts[3]
    data = json.loads(fp.read_text(encoding="utf-8"))
    if isinstance(data, dict):
        return data.get("moduleId"), data.get("subjectId"), data.get("chapterId")
    return None, None, None


def main():
    stats = {"files": 0, "paired": 0, "fetched": 0, "cache": 0, "applied": 0, "left": 0, "noList": 0}
    for bid in H.BOOKS:
        navp = NAV / f"{bid}.json"
        book_dir = CHDIR / bid
        if not navp.exists() or not book_dir.exists():
            continue
        nav = json.loads(navp.read_text(encoding="utf-8"))
        print("\n====", nav.get("title"), flush=True)
        # cache lists
        lists = {}
        for fp in sorted(book_dir.glob("*.json")):
            data = json.loads(fp.read_text(encoding="utf-8"))
            qs = data.get("questions") if isinstance(data, dict) else data
            if not isinstance(qs, list):
                continue
            bad_idx = [i for i, q in enumerate(qs) if H.leftover(q)]
            if not bad_idx:
                continue
            mid, sid, cid = parse_ids(fp, bid)
            if not mid or not sid or not cid or len(cid) < 20:
                stats["noList"] += len(bad_idx)
                continue
            key = (mid, sid, cid)
            if key not in lists:
                lists[key] = H.chapter_questions(bid, mid, sid, cid)
                time.sleep(H.SLEEP)
            official = lists[key]
            if not official:
                stats["noList"] += len(bad_idx)
                continue
            # map official stems
            by_pre = {}
            for oq in official:
                oid = oq.get("_id")
                title = ((oq.get("title") or {}) if isinstance(oq.get("title"), dict) else {}).get("text") or ""
                if oid:
                    by_pre[prefix(title)] = oid
            used = set()
            chg = False
            # 1) prefix match
            for i in bad_idx:
                q = qs[i]
                pre = prefix(q.get("q") or q.get("question") or "")
                oid = q.get("_marksId") or by_pre.get(pre)
                if not oid:
                    # try shorter
                    for k, v in by_pre.items():
                        if k.startswith(pre[:40]) or pre.startswith(k[:40]):
                            oid = v
                            break
                if not oid and len(qs) == len(official):
                    oid = official[i].get("_id")
                if not oid:
                    continue
                used.add(oid)
                stats["paired"] += 1
                rec, src = H.fetch_full(oid)
                if src == "api":
                    stats["fetched"] += 1
                    time.sleep(H.SLEEP)
                elif src == "cache":
                    stats["cache"] += 1
                # force replace leftover CDN stems and weak options
                if rec:
                    loc_blob = str(q.get("q") or "") + " ".join(map(str, q.get("options") or []))
                    if rec.get("q") and re.search(r"quizrr|watermarked_images|organic_book", loc_blob, re.I):
                        q["q"] = rec["q"]
                        q["question"] = rec["q"]
                        chg = True
                    if H.apply_rec(q, rec, oid):
                        stats["applied"] += 1
                        chg = True
                    elif rec.get("options") and H.opt_score(rec["options"]) >= H.opt_score(q.get("options")):
                        q["options"] = rec["options"]
                        q["_marksId"] = oid
                        stats["applied"] += 1
                        chg = True
            if chg:
                if isinstance(data, dict):
                    data["questions"] = qs
                    fp.write_text(json.dumps(data), encoding="utf-8")
                else:
                    fp.write_text(json.dumps(qs), encoding="utf-8")
                stats["files"] += 1

        left = 0
        for fp in book_dir.glob("*.json"):
            data = json.loads(fp.read_text(encoding="utf-8"))
            qs = data.get("questions") if isinstance(data, dict) else data
            if isinstance(qs, list):
                left += sum(1 for q in qs if H.leftover(q))
        print("  leftover", left, flush=True)
        stats["left"] += left

    out = ROOT / "data" / "_migration" / "hydrate_books_pass2.json"
    out.write_text(json.dumps(stats, indent=2), encoding="utf-8")
    print("DONE", json.dumps(stats), flush=True)


if __name__ == "__main__":
    main()
