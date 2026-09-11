#!/usr/bin/env python3
"""Pair Rank Booster chapters (no _marksId) with official Marks Selected lists, bake clean+stamped figs."""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(r"C:\Users\Admin\qx-hosting") / "scripts"))
import hydrate_books_from_marks as H
import _clean_stamp_book_figs as C
from _rank_official_figs import bake, rec_img_urls, replace_src, urls_in

ROOT = Path(r"C:\Users\Admin\qx-hosting")
RANK_ID = "68f1ce4cc729e5251bd00430"
RANK = ROOT / "data" / "books" / "chapters" / RANK_ID


def parse_ids(fp: Path):
    parts = fp.stem.split("__")
    if len(parts) >= 4 and parts[0] == RANK_ID:
        return parts[1], parts[2], parts[3]
    return None, None, None


def main():
    stats = {"files": 0, "listed": 0, "paired": 0, "mapped": 0}
    for fp in sorted(RANK.glob("*.json")):
        mid, sid, cid = parse_ids(fp)
        if not mid or not sid or not cid or len(str(cid)) < 20:
            continue
        data = json.loads(fp.read_text(encoding="utf-8"))
        qs = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(qs, list) or not qs:
            continue
        need = [q for q in qs if not q.get("_marksId") and ("<img" in str(q.get("q") or "") + "".join(q.get("options") or []))]
        if not need:
            continue
        official = H.chapter_questions(RANK_ID, mid, sid, cid)
        stats["listed"] += len(official)
        time.sleep(H.SLEEP)
        by = {}
        for oq in official:
            oid = oq.get("_id")
            title = ((oq.get("title") or {}) if isinstance(oq.get("title"), dict) else {}).get("text") or ""
            if oid:
                by[H.stem_key(title)[:50]] = oid
        chg = False
        for i, q in enumerate(qs):
            if q.get("_marksId"):
                continue
            raw = q.get("q") or q.get("question") or ""
            if "<img" not in str(raw) + "".join(q.get("options") or []):
                continue
            oid = by.get(H.stem_key(raw)[:50])
            if not oid and len(qs) == len(official):
                oid = official[i].get("_id")
            if not oid:
                p = H.stem_key(raw)[:36]
                for k, v in by.items():
                    if k.startswith(p) or p.startswith(k[:36]):
                        oid = v
                        break
            if not oid:
                continue
            rec, src = H.fetch_full(oid)
            if src == "api":
                time.sleep(H.SLEEP)
            if not rec:
                continue
            stats["paired"] += 1
            q["_marksId"] = oid
            official_urls = rec_img_urls(rec)
            mapping = {}
            for u in official_urls:
                loc = bake(u)
                if loc:
                    mapping[u] = loc
            locals_ = urls_in(str(q.get("q") or "") + " " + " ".join(q.get("options") or []))
            locals_ = [u for u in locals_ if "qx-book-" in u or "getmarks" in u]
            for j, old in enumerate(locals_):
                if j < len(official_urls) and official_urls[j] in mapping:
                    mapping[old] = mapping[official_urls[j]]
            if mapping:
                q["q"] = replace_src(str(q.get("q") or ""), mapping)
                q["question"] = q["q"]
                if isinstance(q.get("options"), list):
                    q["options"] = [replace_src(str(o), mapping) for o in q["options"]]
                if q.get("solution"):
                    q["solution"] = replace_src(str(q["solution"]), mapping)
                stats["mapped"] += 1
                chg = True
        if chg:
            if isinstance(data, dict):
                data["questions"] = qs
                fp.write_text(json.dumps(data), encoding="utf-8")
            else:
                fp.write_text(json.dumps(qs), encoding="utf-8")
            stats["files"] += 1
            print("wrote", fp.name, "mapped", stats["mapped"], flush=True)
    print(json.dumps(stats, indent=2), flush=True)


if __name__ == "__main__":
    main()
