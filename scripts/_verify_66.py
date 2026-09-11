#!/usr/bin/env python3
import json, re
from pathlib import Path
ROOT = Path(r"C:\Users\Admin\qx-hosting")
rows = json.loads((ROOT/"data/_migration/broken66.json").read_text(encoding="utf-8"))
ids = {r["id"] for r in rows}

def qs_of(data):
    if isinstance(data, list): return data
    if isinstance(data, dict) and isinstance(data.get("questions"), list): return data["questions"]
    return []

def odd(s):
    t = str(s).replace("&#36;", "")
    return len(re.findall(r"(?<!\\)\$", t.replace("$$", ""))) % 2 == 1

still = []
ok = 0
entity = 0
tex = 0
AREAS = [
    ROOT/"data/banks",
    ROOT/"data/books/chapters",
    ROOT/"data/tests/jee_main_quizrr_pyq_chapter/questions",
    ROOT/"data/tests/jee_main_examgoal_2027/questions",
    ROOT/"data/ncert_offline/chapters",
]
for area in AREAS:
    for fp in area.rglob("*.json"):
        try: data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception: continue
        for q in qs_of(data):
            if not isinstance(q, dict) or q.get("id") not in ids: continue
            raw = str(q.get("q") or q.get("question") or "")
            if "&#36;" in raw: entity += 1
            if "$" in raw: tex += 1
            if odd(raw) and "$$\\mathrm{" not in raw:
                still.append({"id": q.get("id"), "file": fp.name, "q": raw[:160]})
            else:
                ok += 1
print(json.dumps({"ok": ok, "still": still, "entity_ids": entity, "tex_ids": tex}, indent=2, ensure_ascii=False))
