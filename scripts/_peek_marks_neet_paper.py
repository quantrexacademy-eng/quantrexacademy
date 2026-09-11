#!/usr/bin/env python3
import json
from pathlib import Path

p = Path(r"C:\Users\Admin\qx-hosting\data\_migration\marks_pyqmt_probe\papers\sample.json")
j = json.loads(p.read_text(encoding="utf-8"))
data = j["data"]
print("data_keys", list(data.keys()))
td = data["testData"]
print("testData_keys", list(td.keys()))
for k, v in td.items():
    if isinstance(v, list):
        print(f"  list {k} n={len(v)} item0_type={type(v[0]).__name__ if v else None}")
        if v and isinstance(v[0], dict):
            print("    keys", list(v[0].keys())[:40])
    elif isinstance(v, dict):
        print(f"  dict {k} keys={list(v.keys())[:30]}")
    else:
        print(f"  {k}={v!r}"[:160])

# find questions
def find_q_lists(obj, path=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k in ("questions", "questionIds", "qs") and isinstance(v, list) and v:
                print("QLIST", path + "." + k, len(v), type(v[0]).__name__)
                if isinstance(v[0], dict):
                    print("  keys", list(v[0].keys())[:50])
            find_q_lists(v, path + "." + str(k))
    elif isinstance(obj, list) and obj and isinstance(obj[0], dict):
        # don't recurse huge lists blindly except sections
        if path.endswith("sections") or path.endswith("subjects"):
            print("SECLIST", path, len(obj), list(obj[0].keys())[:30])
            for i, s in enumerate(obj[:6]):
                print("  sec", i, {k: (len(v) if isinstance(v, list) else v if not isinstance(v, dict) else "dict") for k, v in s.items() if k in ("title","name","subject","questions","questionIds","questionCount","totalQuestions","_id")})
            for s in obj:
                find_q_lists(s, path + "[]")

find_q_lists(td, "testData")

# duration / marks / pattern
for k in ("duration","durationInMinutes","time","totalTime","totalMarks","maxMarks","positiveMarks","negativeMarks","pattern","totalQuestions"):
    if k in td:
        print("FIELD", k, td[k])
