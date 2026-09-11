#!/usr/bin/env python3
"""Match Marks PYQ-MT papers against local neet.json IDs."""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK = ROOT / "data" / "banks" / "neet.json"
PAPERS = ROOT / "data" / "_migration" / "marks_pyqmt_probe" / "papers"
OUT = ROOT / "data" / "_migration" / "marks_pyqmt_probe"

print("loading bank...")
qs = json.loads(BANK.read_text(encoding="utf-8"))
print("bank", len(qs), "type", type(qs).__name__)
if isinstance(qs, dict):
    # maybe {questions:[]}
    qs = qs.get("questions") or qs.get("data") or list(qs.values())
    if qs and isinstance(qs[0], str):
        print("dict values are str, keys sample", list(qs)[:5] if isinstance(qs, dict) else None)
print("n", len(qs))
print("sample keys", list(qs[0].keys())[:40] if qs and isinstance(qs[0], dict) else None)
# print one compact
s0 = {k: (str(v)[:80] if not isinstance(v, (list, dict)) else type(v).__name__) for k, v in qs[0].items()}
print("sample", s0)
src_c = Counter(str(q.get("source") or "") for q in qs)
print("top sources", src_c.most_common(20))
print("n_sources", len(src_c))

ids = set()
mids = set()
masters = set()
for q in qs:
    if q.get("id") is not None:
        ids.add(str(q.get("id")))
    if q.get("_id") is not None:
        ids.add(str(q.get("_id")))
    if q.get("_marksId"):
        mids.add(str(q["_marksId"]))
        ids.add(str(q["_marksId"]))
    if q.get("masterId"):
        masters.add(str(q["masterId"]))
    if q.get("sourceId"):
        ids.add(str(q["sourceId"]))

print("id_set", len(ids), "marksIds", len(mids), "masters", len(masters))

rows = []
for fp in sorted(PAPERS.glob("*.json")):
    if fp.name == "sample.json":
        continue
    j = json.loads(fp.read_text(encoding="utf-8"))
    td = ((j.get("data") or {}).get("testData") or {})
    title = td.get("title") or fp.name
    year = None
    official_n = td.get("totalQuestions")
    ttime = td.get("totalTime")
    paper_ids = []
    paper_masters = []
    hit_id = 0
    hit_master = 0
    for sec in td.get("sections") or []:
        for q in sec.get("questions") or []:
            qid = str(q.get("questionId") or q.get("_id") or "")
            mid = str(q.get("masterId") or "")
            paper_ids.append(qid)
            paper_masters.append(mid)
            if qid and qid in ids or qid in mids:
                hit_id += 1
            if mid and mid in masters:
                hit_master += 1
    rec = {
        "file": fp.name,
        "title": title,
        "official": official_n,
        "time": ttime,
        "n": len(paper_ids),
        "hit_id": hit_id,
        "hit_master": hit_master,
        "miss": len(paper_ids) - max(hit_id, hit_master),
        "secs": [(s.get("title"), len(s.get("questions") or [])) for s in td.get("sections") or []],
    }
    rows.append(rec)
    print(json.dumps(rec))

(OUT / "neet_pyq_match.json").write_text(json.dumps(rows, indent=2), encoding="utf-8")
print("papers", len(rows), "miss_total", sum(r["miss"] for r in rows), "hit_id", sum(r["hit_id"] for r in rows))
