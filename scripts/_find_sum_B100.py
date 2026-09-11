from pathlib import Path
import json
root = Path(r"C:\Users\Admin\qx-hosting\data")
need = b"sum of all the elements of B"
for area in [root/"banks", root/"tests"]:
    for fp in area.rglob("*.json"):
        if fp.name.startswith("_") or "_migration" in str(fp) or "qid_marks" in str(fp):
            continue
        try:
            raw = fp.read_bytes()
        except Exception:
            continue
        if need not in raw and b"100B" not in raw:
            continue
        if b"sum of all the elements" not in raw:
            continue
        try:
            data = json.loads(raw.decode("utf-8"))
        except Exception:
            continue
        qs = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(qs, list):
            continue
        for q in qs:
            s = str(q.get("q") or "")
            if "sum of all the elements" in s and "B" in s:
                print("====", fp.relative_to(root), "ID", q.get("id"))
                print(repr(s[:700]))
                print("---")
