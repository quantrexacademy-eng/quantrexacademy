#!/usr/bin/env python3
"""Build nav for Marks Medical Most Important PYQ Based Questions (NEET)."""
from __future__ import annotations

import json
import ssl
import urllib.request
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]
CFG = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOK = CFG["token"]
CTX = ssl.create_default_context()
BASE = "https://production.getmarks.app"
EID = "6a9158833d351af582b98369"
MID = "6a9161f1a69a205613f39f1b"
OUT = ROOT / "data" / "nav" / "books" / f"{EID}.json"


def get(path, params=None):
    url = BASE + path
    if params:
        url += ("&" if "?" in url else "?") + urlencode(params)
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": "Bearer " + TOK,
            "Accept": "application/json",
            "Origin": "https://web.getmarks.app",
            "Referer": "https://web.getmarks.app/",
            "User-Agent": "Mozilla/5.0",
        },
    )
    with urllib.request.urlopen(req, timeout=60, context=CTX) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def as_list(block, *keys):
    if isinstance(block, list):
        return block
    if isinstance(block, dict):
        for k in keys:
            v = block.get(k)
            if isinstance(v, list):
                return v
    return []


def count_of(obj):
    if not isinstance(obj, dict):
        return 0
    for k in ("totalQuestions", "questionCount", "count", "totalQs"):
        v = obj.get(k)
        if isinstance(v, (int, float)):
            return int(v)
        if isinstance(v, dict):
            for kk in ("total", "count", "all"):
                if isinstance(v.get(kk), (int, float)):
                    return int(v.get(kk))
    return 0


def main():
    d = get(f"/api/v4/marks-selected/exam/{EID}/module/{MID}/subjects", {"platform": "web"})
    data = d.get("data") or {}
    subs = as_list(data.get("subjects"), "subjects")
    module = data.get("module") or {}
    subjects = []
    total = 0
    for s in subs:
        sid = s.get("_id") or s.get("id") or s.get("subjectId")
        name = s.get("title") or s.get("name")
        ch = get(
            f"/api/v4/marks-selected/exam/{EID}/module/{MID}/subjects/{sid}/chapters",
            {"platform": "web", "limit": 80, "offset": 0},
        )
        cd = ch.get("data") or {}
        chs = as_list(cd.get("chapters"), "chapters", "data")
        if not chs:
            chs = as_list(cd, "chapters", "data")
        chapters = []
        scount = 0
        for c in chs:
            cname = c.get("title") or c.get("name")
            cnt = count_of(c)
            scount += cnt
            chapters.append(
                {
                    "id": str(cname or "").replace(" ", "_"),
                    "name": cname,
                    "count": cnt,
                    "key": f"{EID}__{name}__{cname}",
                    "sourceBank": "neet",
                    "sourceSubject": name,
                    "sourceChapter": cname,
                }
            )
        sub_count = count_of(s) or scount
        total += sub_count
        subjects.append(
            {
                "id": sid,
                "name": name,
                "count": sub_count,
                "chapters": chapters,
            }
        )
        print(name, "chapters", len(chapters), "count", sub_count)
    nav = {
        "id": EID,
        "title": "Most Important PYQ Based Questions",
        "type": "exam",
        "exam": "NEET",
        "count": total or count_of(module),
        "modules": [
            {
                "id": MID,
                "title": module.get("title") or "Most Important PYQ Based Questions",
                "subtitle": module.get("subtitle") or "For NEET 2027",
                "count": total or count_of(module),
                "subjects": subjects,
            }
        ],
    }
    OUT.write_text(json.dumps(nav, ensure_ascii=False, indent=2), encoding="utf-8")
    print("WROTE", OUT, "total", nav["count"])


if __name__ == "__main__":
    main()
