import json
from pathlib import Path

data = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\banks\jee_main.json").read_text(encoding="utf-8"))
for q in data["questions"]:
    if q.get("id") == 27196:
        print("STEM\n", q.get("q"))
        for i, o in enumerate(q.get("options") or []):
            print("OPT", i)
            print(o)
            print("----")
        break
