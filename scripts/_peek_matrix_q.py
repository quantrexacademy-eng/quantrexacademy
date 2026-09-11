from pathlib import Path
import json
fps = [
    Path(r"C:\Users\Admin\qx-hosting\data\tests\jee_main_examgoal_2027\questions\tst-19g61mobg1kap.json"),
    Path(r"C:\Users\Admin\qx-hosting\data\tests\jee_main_examgoal_2027\questions\tst-19g61mobgpsjd.json"),
]
for fp in fps:
    data = json.loads(fp.read_text(encoding="utf-8"))
    qs = data.get("questions") if isinstance(data, dict) else data
    print("====", fp.name)
    for q in qs:
        raw = str(q.get("q") or "")
        if "100" in raw and ("matrix" in raw.lower() or "begin{array}" in raw or "B^{" in raw or "B^" in raw):
            print("ID", q.get("id"))
            print(repr(raw[:900]))
            print("---")
