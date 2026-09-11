#!/usr/bin/env python3
import json, re
from pathlib import Path
ROOT = Path(r"C:\Users\Admin\qx-hosting")
ids = {
    "qz_69de4f312ee0e063d924daf5",
    "qz_69de4ef9c677dc36a88f5be8",
    "qz_69de4f232ee0e063d9241cc1",
}

def odd(s):
    t = str(s or "").replace("$$", "")
    return len(re.findall(r"(?<!\\)\$", t))

for fp in (ROOT / "data/tests/jee_main_quizrr_pyq_chapter/questions").glob("qz-*.json"):
    d = json.loads(fp.read_text(encoding="utf-8"))
    for q in d.get("questions") or []:
        if q.get("id") not in ids:
            continue
        print("=" * 60)
        print(q.get("id"), d.get("title"))
        print("STEM dollars", odd(q.get("q")))
        print(q.get("q"))
        print("---SOL dollars", odd(q.get("solution")))
        print(q.get("solution"))
        print("---OPTS", q.get("options"))
