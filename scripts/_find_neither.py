from pathlib import Path
import json
paths = [
    Path(r"C:\Users\Admin\qx-hosting\data\banks\jee_main.json"),
    Path(r"C:\Users\Admin\qx-hosting\data\tests\jee_main_examgoal_2027\questions"),
]
needle = "Neither (I) nor"
for p in paths:
    files = [p] if p.is_file() else list(p.glob("*.json"))
    for fp in files:
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        qs = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(qs, list):
            continue
        for q in qs:
            blob = str(q.get("q") or "") + " " + " ".join(map(str, q.get("options") or []))
            if "Neither (I) nor" in blob and ("lim" in blob or "f(x)" in blob or r"\lim" in blob):
                print("FILE", fp.name, "ID", q.get("id"))
                print(repr(str(q.get("q") or "")[:800]))
                print("OPTS", q.get("options"))
                print("---")
