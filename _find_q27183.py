import json
import re
from pathlib import Path

bank = Path(r"C:\Users\Admin\qx-hosting\data\banks\jee_main.json")
print("size", bank.stat().st_size)
# stream find
needle = '"id": 27183'
# also string id
found = None
with bank.open(encoding="utf-8", errors="replace") as f:
    # load if array
    data = json.load(f)

qs = data if isinstance(data, list) else data.get("questions") or data.get("data") or []
print("type", type(data).__name__, "n", len(qs) if isinstance(qs, list) else "n/a")
if isinstance(data, dict):
    print("keys", list(data.keys())[:20])

for q in qs if isinstance(qs, list) else []:
    if str(q.get("id")) == "27183" or q.get("_marksId") == "27183":
        found = q
        break

if not found:
    print("NOT FOUND by id, scanning html")
    for q in qs if isinstance(qs, list) else []:
        blob = json.dumps(q)
        if "27183" in blob and ("Amines" in blob or "amine" in blob.lower()):
            found = q
            break

if not found:
    print("still missing")
else:
    print("id", found.get("id"), "chapter", found.get("chapter"), "type", found.get("questionType") or found.get("type"))
    print("Q", str(found.get("q") or "")[:500])
    opts = found.get("options") or []
    print("nopts", len(opts))
    for i, o in enumerate(opts):
        print("--- opt", i, str(o)[:400])
    print("SOL", str(found.get("solution") or "")[:300])
