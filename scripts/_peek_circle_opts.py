from pathlib import Path
import json, re
fp = Path(r"C:\Users\Admin\qx-hosting\data\banks\jee_main.json")
data = json.loads(fp.read_text(encoding="utf-8"))
qs = data.get("questions") if isinstance(data, dict) else data
n = 0
for q in qs:
    raw = str(q.get("q") or "")
    if "intersect" in raw.lower() and "AQ and BP" in raw:
        print("ID", q.get("id"))
        print("STEM", repr(raw[:400]))
        print("OPTS")
        for i, o in enumerate(q.get("options") or []):
            print(i, repr(str(o)[:200]))
        print("---")
        n += 1
        if n >= 3:
            break
print("found", n)
