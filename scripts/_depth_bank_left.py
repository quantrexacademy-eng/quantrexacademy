#!/usr/bin/env python3
import json
from collections import Counter
from pathlib import Path
import hydrate_books_from_marks as H

BANK = Path(r"C:\Users\Admin\qx-hosting\data\banks")
QID = Path(r"C:\Users\Admin\qx-hosting\data\qid_marks")
by = Counter()
off_type = Counter()
has_cv = 0
with_id = 0
n = 0
for fp in BANK.glob("*.json"):
    if ".bak" in fp.name:
        continue
    data = json.loads(fp.read_text(encoding="utf-8"))
    qs = data.get("questions") if isinstance(data, dict) else data
    if not isinstance(qs, list):
        continue
    for q in qs:
        opts = q.get("options") or []
        letter = bool(opts) and H.opt_score(opts) < 2
        if not letter:
            continue
        n += 1
        by[fp.name] += 1
        mid = q.get("_marksId")
        if mid:
            with_id += 1
            p = QID / f"{mid}.json"
            if p.exists():
                d = json.loads(p.read_text(encoding="utf-8")).get("data") or {}
                t = str(d.get("type") or "blank")
                off_type[t] += 1
                if d.get("correctValue") not in (None, ""):
                    has_cv += 1
            else:
                off_type["no_cache"] += 1
        else:
            off_type["no_id"] += 1
print("bank_letter", n, "withId", with_id, "official_cv", has_cv)
print("by_file", dict(by.most_common(15)))
print("off_type", dict(off_type))
