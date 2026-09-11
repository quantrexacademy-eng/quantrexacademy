#!/usr/bin/env python3
import json, re
from pathlib import Path
r = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\_migration\pyq_mock_all_papers_proof.json").read_text(encoding="utf-8"))
print("html_in_math leftover")
for s in r["samples"].get("html_in_math", []):
    print(s)
print("\nunbalanced stem leftover")
for s in r["samples"].get("unbalanced_dollar_stem", []):
    print(s)
print("\nunbalanced sol leftover")
for s in r["samples"].get("unbalanced_dollar_sol", []):
    print(s)
print("\ncdn leftover")
for s in r["samples"].get("remote_cdn", []):
    print(s)

# dump one remaining html and one cdn from bank
BANK = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\banks\jee_main.json").read_text(encoding="utf-8"))
need = set()
for k in ("html_in_math", "unbalanced_dollar_stem", "remote_cdn"):
    for s in r["samples"].get(k, []):
        need.add(s["id"])
print("\n--- RAW ---")
for q in BANK["questions"]:
    if q.get("id") in need:
        print("="*40, q.get("id"), q.get("source"))
        raw = str(q.get("q") or "")
        print("Q:", raw[:500])
        print("cdn in q", "getmarks" in raw)
        sol = str(q.get("solution") or "")
        print("cdn in sol", "getmarks" in sol, sol[sol.find("http"):sol.find("http")+120] if "http" in sol else "")
