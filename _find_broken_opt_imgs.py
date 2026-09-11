import json
import re
from pathlib import Path

bank = Path(r"C:\Users\Admin\qx-hosting\data\banks\jee_main.json")
data = json.loads(bank.read_text(encoding="utf-8"))
qs = data.get("questions") or []
rx = re.compile(r"watermark_unproved|2026_watermark|unproved%2F", re.I)
n = 0
for q in qs:
    blob = json.dumps(q, ensure_ascii=False)
    if rx.search(blob):
        n += 1
        if n <= 4:
            print("id", q.get("id"), "ch", q.get("chapter"))
            print("Q", str(q.get("q") or "")[:180])
            for i, o in enumerate(q.get("options") or []):
                print(" opt", i, str(o)[:200])
            print("---")
print("total", n)

# also amines + img + major product
m = 0
for q in qs:
    if str(q.get("chapter")) != "Amines":
        continue
    stem = str(q.get("q") or "")
    if "major product" in stem.lower() and "correct reaction" in stem.lower():
        m += 1
        print("MAJOR id", q.get("id"))
        print(stem[:250])
        for i, o in enumerate(q.get("options") or []):
            print(" o", i, str(o)[:220])
print("major hits", m)
