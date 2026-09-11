#!/usr/bin/env python3
import json, re, urllib.parse, urllib.request
from pathlib import Path

u = "https://www.quantrexacademy.com/api/catalog?action=paper&exam=neet&source=" + urllib.parse.quote("NEET 2025") + "&v=qxfix47"
d = json.loads(urllib.request.urlopen(u, timeout=90).read())
qs = d["questions"]
shown = 0
for q in qs:
    sol = str(q.get("solution") or "")
    if "<table" in sol.lower() or "float" in sol.lower() or "<img" in sol.lower():
        print("ID", q.get("id"), "len", len(sol), "table", "<table" in sol.lower(), "img", sol.lower().count("<img"))
        print(sol[:900].replace("\n", " "))
        print("---")
        shown += 1
        if shown >= 4:
            break
print("total", len(qs))
# also local bank sample with table
bank = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\banks\neet.json").read_text(encoding="utf-8"))
n_table = n_float = n_img = 0
for q in bank["questions"][:8000]:
    sol = str(q.get("solution") or "")
    if "<table" in sol.lower(): n_table += 1
    if "float" in sol.lower(): n_float += 1
    if "<img" in sol.lower(): n_img += 1
print("first 8k table", n_table, "float", n_float, "img", n_img)
