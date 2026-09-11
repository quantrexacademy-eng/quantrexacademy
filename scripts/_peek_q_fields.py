#!/usr/bin/env python3
import json
from pathlib import Path

p = Path(r"C:\Users\Admin\qx-hosting\data\_migration\marks_pyqmt_probe\papers\sample.json")
j = json.loads(p.read_text(encoding="utf-8"))
q = j["data"]["testData"]["sections"][0]["questions"][0]
print("MARKS_Q_KEYS", list(q.keys()))
# print compact without huge html
for k, v in q.items():
    if k in ("question", "options", "helperText"):
        if isinstance(v, dict):
            print(k, "dict", list(v.keys()), {kk: (str(vv)[:120] if not isinstance(vv, (list, dict)) else type(vv).__name__) for kk, vv in v.items()})
        elif isinstance(v, list):
            print(k, "list", len(v))
            if v:
                print("  opt0", json.dumps(v[0])[:400])
        else:
            print(k, str(v)[:200])
    else:
        s = json.dumps(v, default=str)
        print(k, s[:220])

print("\nMARKING", j["data"]["testData"]["sections"][0].get("markingScheme"))
print("SEC1", j["data"]["testData"]["sections"][1]["title"], len(j["data"]["testData"]["sections"][1]["questions"]), j["data"]["testData"]["sections"][1].get("markingScheme"))
print("SEC2", j["data"]["testData"]["sections"][2]["title"], len(j["data"]["testData"]["sections"][2]["questions"]), j["data"]["testData"]["sections"][2].get("markingScheme"))

# local bank sample
import ijson  # may not exist
