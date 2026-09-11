#!/usr/bin/env python3
"""Probe CBSE board API shape (no question dump)."""
import json
import ssl
import urllib.request
from pathlib import Path

CFG = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\marks_config.json").read_text(encoding="utf-8"))
TOKEN = CFG["token"]
API = "https://web.getmarks.app"
CBSE = "6943ebc753e4e1880190efca"
CTX = ssl.create_default_context()


def get(path):
    req = urllib.request.Request(
        API + path,
        headers={
            "Authorization": "Bearer " + TOKEN,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
            "Origin": "https://web.getmarks.app",
            "Referer": "https://web.getmarks.app/",
        },
    )
    with urllib.request.urlopen(req, context=CTX, timeout=90) as r:
        return json.loads(r.read().decode() or "{}")


def main():
    exam = get(f"/api/v4/bpyqb/exam/{CBSE}/subjects?platform=web")
    d = exam.get("data") or {}
    print("exam title", d.get("title"))
    subjects = d.get("subjects") or []
    for s in subjects:
        print(
            "SUBJ",
            s.get("title"),
            "subjectId",
            s.get("subjectId"),
            "keys",
            list(s.keys()),
        )

    if not subjects:
        return
    sid = subjects[0].get("subjectId")
    ch = get(
        f"/api/v4/bpyqb/exam/{CBSE}/subject/{sid}/chapters?limit=50&offset=0&sortBy=title&platform=web"
    )
    cd = ch.get("data") or {}
    chapters = cd.get("chapters") or []
    print("chapters", len(chapters), "total", cd.get("totalChapters"))
    for c in chapters[:5]:
        print(" CH", c.get("title"), "id", c.get("chapterId"), "qs", c.get("totalQuestions"))

    if not chapters:
        return
    cid = chapters[0].get("chapterId")
    det = get(
        f"/api/v4/bpyqb/exam/{CBSE}/subject/{sid}/chapter/{cid}/details?platform=web"
    )
    dd = det.get("data") or {}
    print("detail keys", list(dd.keys()))
    for sec in dd.get("sections") or []:
        print(" SEC", sec.get("title"), "buckets", len(sec.get("buckets") or []))
        for b in (sec.get("buckets") or [])[:4]:
            print(
                "  BKT",
                b.get("title"),
                "id",
                b.get("bucketId"),
                "n",
                b.get("totalQuestions"),
            )

    buckets = []
    for sec in dd.get("sections") or []:
        buckets.extend(sec.get("buckets") or [])
    if not buckets:
        return
    bid = buckets[0].get("bucketId")
    bq = get(
        f"/api/v4/bpyqb/exam/{CBSE}/subject/{sid}/chapter/{cid}/bucket/{bid}?offset=0&limit=3&platform=web"
    )
    bd = bq.get("data") or {}
    print("bucket keys", list(bd.keys()))
    qs = bd.get("questions") or []
    print("bucket n", len(qs), "bucket meta", bd.get("bucket"))
    if qs:
        q0 = qs[0]
        print("q0 keys", list(q0.keys())[:30])
        print("q0 id", q0.get("_id") or q0.get("id"))
        print("q0 snippet", json.dumps(q0, ensure_ascii=False)[:800])


if __name__ == "__main__":
    main()
