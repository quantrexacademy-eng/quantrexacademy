from pathlib import Path
import json
ROOT = Path(r"C:\Users\Admin\qx-hosting\data\banks")
want = {127738, 52337, 70875}
for name in ("dpp.json", "kvpy.json", "mht_cet.json"):
    data = json.loads((ROOT / name).read_text(encoding="utf-8"))
    qs = data.get("questions") if isinstance(data, dict) else data
    for q in qs:
        if q.get("id") in want:
            print(name, q.get("id"))
            print(repr(str(q.get("q") or "")[:360]))
            print("---")
