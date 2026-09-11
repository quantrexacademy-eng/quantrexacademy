#!/usr/bin/env python3
import json
from pathlib import Path
BANK = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\banks\jee_main.json").read_text(encoding="utf-8"))
ids = {43502, 29824, 31792}
for q in BANK["questions"]:
    if q.get("id") in ids:
        print("="*60)
        print(q.get("id"), q.get("source"), q.get("chapter"))
        print("Q:", q.get("q")[:500])
        print("OPTS:", q.get("options"))
        print("type", q.get("questionType"), q.get("type"), "ans", q.get("answer"))
