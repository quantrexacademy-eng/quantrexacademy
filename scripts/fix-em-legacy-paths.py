import json, re
from pathlib import Path

CHAPTER = Path(
    r"E:\quantrexacademy\data\books\chapters\6a0addba4b032b031e049a36"
    r"\6a0addba4b032b031e049a36__6a2fdc56afb6d6932c18272b__"
    r"6a2fdc56afb6d6932c18272e__6a2fdc56afb6d6932c183850.json"
)
OLD = "/assets/diagrams/hcv-v2-em-induction-ex23-24-two-boys-rhombus.png"
NEW = "/assets/diagrams/hcv-v2-em-induction-e3.png"

with CHAPTER.open(encoding="utf-8") as f:
    data = json.load(f)

n = 0
for q in data.get("questions", []):
    for field in ("q", "solution"):
        if OLD in (q.get(field) or ""):
            q[field] = (q[field] or "").replace(OLD, NEW)
            n += 1

with CHAPTER.open("w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)
print("replaced", n, "fields")