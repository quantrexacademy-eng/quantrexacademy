#!/usr/bin/env python3
import json, re
from pathlib import Path
ROOT = Path(r"C:\Users\Admin\qx-hosting")
ids = {3709, 13472, 51379, 86878, 113211, 305785, "bb_adv-area-under-curves_multiple-choice_q19"}

def qs_of(data):
    if isinstance(data, list): return data
    if isinstance(data, dict) and isinstance(data.get("questions"), list): return data["questions"]
    return []

files = [
    ROOT/"data/banks/ap_eamcet.json",
    ROOT/"data/banks/kvpy.json",
    ROOT/"data/banks/nest_niser.json",
    ROOT/"data/banks/ts_eamcet.json",
]
files += list((ROOT/"data/books/chapters").rglob("*.json"))

def odd(s):
    return len(re.findall(r"(?<!\\)\$", str(s).replace("$$", "")))

for fp in files:
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
    except Exception:
        continue
    for q in qs_of(data):
        if not isinstance(q, dict): continue
        if q.get("id") not in ids: continue
        raw = str(q.get("q") or q.get("question") or "")
        print("="*80)
        print("FILE", fp.name, "ID", q.get("id"), "dollars", odd(raw), "odd", odd(raw)%2==1)
        print(raw)
        print("---OPTS---")
        print(q.get("options"))
        print()
