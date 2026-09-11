#!/usr/bin/env python3
import json, re
from pathlib import Path
ROOT = Path(r"C:\Users\Admin\qx-hosting")
ids = {
    "qz_69de4f392ee0e063d9253c0f",
    "qz_69de4f6a2ee0e063d927eb52",
    "qz_69de4f292ee0e063d9247385",
    "qz_69de4f4f2ee0e063d926789b",
    "qz_69de4f4f2ee0e063d92678b4",
}
for fp in (ROOT / "data/tests/jee_main_quizrr_pyq_chapter/questions").glob("qz-*.json"):
    d = json.loads(fp.read_text(encoding="utf-8"))
    for q in d.get("questions") or []:
        if q.get("id") not in ids:
            continue
        blob = str(q.get("q")) + " " + " ".join(q.get("options") or []) + " " + str(q.get("solution") or "")
        imgs = re.findall(r'src=["\']([^"\']+)["\']', blob)
        print("ID", q.get("id"), "marks", q.get("_marksId"))
        for i in imgs:
            print(" ", i)
        print("sol_len", len(str(q.get("solution") or "")))
        print("---")
