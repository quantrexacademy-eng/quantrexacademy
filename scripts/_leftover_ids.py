#!/usr/bin/env python3
from pathlib import Path
import json, re, sys
sys.path.insert(0, str(Path(r"C:\Users\Admin\qx-hosting\scripts")))
from _restore_leftovers_official import leftover_kind, marks_id, walk_json, qs_of, AREAS, QID

need = []
for area in AREAS:
    for fp in walk_json(area):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        qs = qs_of(data)
        if not qs:
            continue
        for q in qs:
            if not isinstance(q, dict):
                continue
            kinds = leftover_kind(q)
            if not kinds:
                continue
            # skip nosol-only (too many, often official has none)
            serious = [k for k in kinds if k in ("letter", "fig", "empty", "tex")]
            if not serious and kinds == ["nosol"]:
                continue
            mid = marks_id(q)
            has = bool(mid and (QID / f"{mid}.json").exists())
            if mid and not has:
                need.append({"id": mid, "kinds": serious or kinds, "qid": q.get("id")})
print("need_fetch", len(need))
print("kinds", __import__("collections").Counter(k for r in need for k in r["kinds"]))
Path(r"C:\Users\Admin\qx-hosting\data\_migration\leftover_need_fetch.json").write_text(json.dumps(need), encoding="utf-8")
print("wrote", len(need))
