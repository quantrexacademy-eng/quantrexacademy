import json
from pathlib import Path

paths = [
    Path(r"C:\Users\Admin\qx-hosting\data\banks\nda.json"),
    Path(r"C:\Users\Admin\qx-hosting\data\banks\jee_main.json"),
    Path(r"C:\Users\Admin\qx-hosting\data\banks\jee_advanced.json"),
]
needle_ids = {"76510", 76510}
for p in paths:
    if not p.exists():
        print("missing", p)
        continue
    data = json.loads(p.read_text(encoding="utf-8"))
    qs = data.get("questions") or data if isinstance(data, list) else data.get("questions") or []
    print(p.name, "n", len(qs) if isinstance(qs, list) else "?")
    for q in qs if isinstance(qs, list) else []:
        if str(q.get("id")) == "76510":
            print("FOUND", p.name)
            print(json.dumps(q, ensure_ascii=False)[:2500])
            break
