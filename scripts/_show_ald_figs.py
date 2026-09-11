import json, re
from pathlib import Path
p = Path(r"C:\Users\Admin\qx-hosting\data\books\chapters\68f1ce4cc729e5251bd00430\68f1ce4cc729e5251bd00430__68f8d38b834dea3be41f0b19__68f8d38c834dea3be41f0b1c__68f8d38e834dea3be41f0b1e.json")
d = json.loads(p.read_text(encoding="utf-8"))
q = d["questions"][0]
print("marks", q.get("_marksId"))
blob = (q.get("q") or "") + " " + " ".join(q.get("options") or [])
print(re.findall(r"/assets/diagrams/[^\"'\\]+", blob))
