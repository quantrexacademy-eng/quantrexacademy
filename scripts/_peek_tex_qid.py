from pathlib import Path
import json
p = Path(r"C:\Users\Admin\qx-hosting\data\qid_marks")
for mid in ["6174d21304ecbe1ff0aa9056", "65a25fa10279619d9d8a1e07"]:
    f = p / f"{mid}.json"
    print("====", mid, "exists", f.exists(), "size", f.stat().st_size if f.exists() else 0)
    if not f.exists():
        continue
    j = json.loads(f.read_text(encoding="utf-8"))
    d = j.get("data") if isinstance(j, dict) and "data" in j else j
    q = d.get("question") if isinstance(d, dict) else {}
    t = (q.get("text") if isinstance(q, dict) else "") or (d.get("q") if isinstance(d, dict) else "") or ""
    print("STEM", t[:500])
    print("---")
