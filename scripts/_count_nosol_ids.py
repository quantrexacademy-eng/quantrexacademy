#!/usr/bin/env python3
"""Count no-sol leftover that have a Marks hex ID and whether qid_marks exists."""
from __future__ import annotations
import json, re
from collections import Counter
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
QID = ROOT / "data" / "qid_marks"
HEX24 = re.compile(r"^[a-f0-9]{24}$", re.I)
IMG = re.compile(r"<img\b", re.I)
AREAS = [
    ROOT / "data" / "banks",
    ROOT / "data" / "books" / "chapters",
    ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter",
    ROOT / "data" / "ncert_offline" / "chapters",
    ROOT / "data" / "board_offline" / "chapters",
]


def strip(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def mid_of(q):
    mid = str(q.get("_marksId") or "")
    if HEX24.match(mid):
        return mid
    sid = str(q.get("id") or "")
    if HEX24.match(sid):
        return sid
    if sid.startswith("m_") and HEX24.match(sid[2:]):
        return sid[2:]
    return ""


def walk(area):
    if area.is_file():
        yield area
        return
    if not area.exists():
        return
    for fp in area.rglob("*.json"):
        if fp.name.startswith("_") or ".bak" in fp.name:
            continue
        yield fp


c = Counter()
need = []
seen = set()
by_area = Counter()
for area in AREAS:
    for fp in walk(area):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        qs = data if isinstance(data, list) else (data.get("questions") if isinstance(data, dict) else None)
        if not isinstance(qs, list):
            continue
        for q in qs:
            if not isinstance(q, dict):
                continue
            sol = str(q.get("solution") or q.get("explanation") or "")
            if strip(sol) or IMG.search(sol):
                continue
            c["nosol"] += 1
            mid = mid_of(q)
            if not mid:
                c["nosol_no_id"] += 1
                continue
            c["nosol_id"] += 1
            p = QID / f"{mid}.json"
            if p.exists() and p.stat().st_size > 80:
                c["nosol_have_qid"] += 1
            else:
                c["nosol_need_fetch"] += 1
                by_area[area.name] += 1
                if mid not in seen:
                    seen.add(mid)
                    need.append(mid)

print(json.dumps({"counts": dict(c), "unique_need": len(need), "by_area": dict(by_area)}, indent=2), flush=True)
(ROOT / "data/_migration/nosol_need_fetch.txt").write_text("\n".join(need), encoding="utf-8")
print("wrote", len(need), flush=True)
