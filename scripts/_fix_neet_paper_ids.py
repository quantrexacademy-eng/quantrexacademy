#!/usr/bin/env python3
"""Rebuild NEET PYQ paper ID lists: exact Marks order, no prefix-collapse."""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK = ROOT / "data" / "banks" / "neet.json"
PAPERS = ROOT / "data" / "_migration" / "marks_pyqmt_probe" / "papers"
IDS_PATH = ROOT / "data" / "nav" / "pyq_paper_ids" / "neet.json"
INDEX_PATH = ROOT / "data" / "nav" / "pyq_paper_index" / "neet.json"


def norm(s):
    t = re.sub(r"<[^>]+>", " ", str(s or ""))
    t = re.sub(r"[^a-z0-9]+", " ", t.lower())
    return re.sub(r"\s+", " ", t).strip()


def marks_text(mq):
    qq = mq.get("question") or {}
    return str(qq.get("text") or "")


def main():
    raw = json.loads(BANK.read_text(encoding="utf-8"))
    qs = raw["questions"]
    by_id = {}
    by_mid = {}
    by_stem = defaultdict(list)
    for q in qs:
        if not q:
            continue
        i = str(q.get("id") or "")
        if i:
            by_id[i] = q
        m = str(q.get("_marksId") or "")
        if m:
            by_mid[m] = q
        st = norm(q.get("q") or "")
        if len(st) >= 24:
            by_stem[st].append(q)

    old_ids = json.loads(IDS_PATH.read_text(encoding="utf-8"))
    new_ids = {}
    report = []
    for fp in sorted(p for p in PAPERS.glob("*.json") if p.name != "sample.json"):
        j = json.loads(fp.read_text(encoding="utf-8"))
        td = (j.get("data") or {}).get("testData") or {}
        title = str(td.get("title") or "").strip()
        used = set()
        ids = []
        miss = 0
        for sec in td.get("sections") or []:
            for mq in sec.get("questions") or []:
                qid = str(mq.get("questionId") or mq.get("_id") or "")
                hit = None
                if qid and qid in by_mid:
                    hit = by_mid[qid]
                if hit and str(hit.get("id")) in used:
                    hit = None
                if not hit:
                    st = norm(marks_text(mq))
                    for cand in by_stem.get(st) or []:
                        cid = str(cand.get("id"))
                        if cid not in used:
                            hit = cand
                            break
                if not hit and qid and qid in by_id and qid not in used:
                    hit = by_id[qid]
                if not hit:
                    miss += 1
                    # last resort: marks id even if unused check
                    if qid and qid in by_mid:
                        hit = by_mid[qid]
                    elif qid and qid in by_id:
                        hit = by_id[qid]
                if not hit:
                    continue
                bid = str(hit.get("id"))
                ids.append(bid)
                used.add(bid)
        new_ids[title] = ids
        oldn = len(old_ids.get(title) or [])
        rec = {"title": title, "official": td.get("totalQuestions"), "new": len(ids), "unique": len(used), "old": oldn, "miss": miss}
        report.append(rec)
        print(json.dumps(rec))

    IDS_PATH.write_text(json.dumps(new_ids, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    # keep index counts = official / new
    idx = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    for y, papers in idx.items():
        for p in papers:
            n = len(new_ids.get(p["source"]) or [])
            p["count"] = n
            if p.get("officialCount") and n != p["officialCount"]:
                print("WARN count", p["source"], n, p["officialCount"])
    INDEX_PATH.write_text(json.dumps(idx, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("rewrote ids", len(new_ids), "short", sum(1 for r in report if r["new"] < (r["official"] or 0)))


if __name__ == "__main__":
    main()
