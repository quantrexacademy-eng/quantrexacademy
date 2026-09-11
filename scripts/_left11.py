#!/usr/bin/env python3
import json, re
from pathlib import Path
from collections import defaultdict

ROOT = Path(r"C:\Users\Admin\qx-hosting")
rep = json.loads((ROOT / "data/_migration/pyq_mock_all_papers_proof.json").read_text(encoding="utf-8"))
BANK = json.loads((ROOT / "data/banks/jee_main.json").read_text(encoding="utf-8"))
by_id = {q.get("id"): q for q in BANK["questions"] if isinstance(q, dict)}

print("=== remaining stem $ ===")
for s in rep["samples"].get("unbalanced_dollar_stem", []):
    q = by_id.get(s["id"])
    print("-" * 50)
    print(s["id"], s["paper"], s["ch"])
    print(repr(q.get("q") if q else None)[:600])

print("\n=== html_in_math ===")
for s in rep["samples"].get("html_in_math", []):
    q = by_id.get(s["id"])
    print(s["id"], repr(q.get("q") if q else "")[:700])

print("\n=== remote ===")
for s in rep["samples"].get("remote_cdn", []):
    q = by_id.get(s["id"])
    blob = str(q.get("q")) + str(q.get("solution"))
    urls = re.findall(r'https?://cdn-question-pool[^"\']+', blob)
    print(s["id"], urls[:2], "proxy", "/api/proxy-image" in blob)

print("\n=== alcohol _marksId ===")
n_mid = 0
for q in BANK["questions"]:
    blob = str(q.get("q") or "") + " ".join(q.get("options") or [])
    if "alcohol-prep" in blob:
        print(q.get("id"), q.get("source"), q.get("_marksId"), "opts", len(q.get("options") or []))
        if q.get("_marksId"):
            n_mid += 1
print("with marksId", n_mid)
