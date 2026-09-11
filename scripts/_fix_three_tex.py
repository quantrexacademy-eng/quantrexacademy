#!/usr/bin/env python3
from pathlib import Path
import json, re
ROOT = Path(r"C:\Users\Admin\qx-hosting")
ids = {127738, 52337, 70875}
rx = re.compile(r"\$\$\\mathrm\{[A-Za-z]\}")
for fp in (ROOT / "data/banks").glob("*.json"):
    data = json.loads(fp.read_text(encoding="utf-8"))
    qs = data.get("questions") if isinstance(data, dict) else data
    if not isinstance(qs, list):
        continue
    for q in qs:
        if not isinstance(q, dict):
            continue
        if q.get("id") in ids or rx.search(str(q.get("q") or "")):
            print("FILE", fp.name, "ID", q.get("id"))
            print(repr(str(q.get("q") or "")[:400]))
            print("---")
