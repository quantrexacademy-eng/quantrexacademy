import json
from pathlib import Path

bank = Path(r"C:\Users\Admin\qx-hosting\data\banks\jee_main.json")
data = json.loads(bank.read_text(encoding="utf-8"))
qs = data.get("questions") or []
hits = []
for q in qs:
    stem = str(q.get("q") or "")
    if "giving major product" in stem.lower() and "correct reaction" in stem.lower():
        hits.append(q)
    elif "Consider the following reactions giving major product" in stem:
        hits.append(q)

print("hits", len(hits))
for q in hits[:8]:
    print("id", q.get("id"), "ch", q.get("chapter"))
    print("Q", str(q.get("q"))[:350])
    for i, o in enumerate(q.get("options") or []):
        print("  opt", i, str(o)[:250])
    print("---")

# also amines with img options
img_hits = []
for q in qs:
    if str(q.get("chapter") or "") != "Amines":
        continue
    opts = q.get("options") or []
    if any("<img" in str(o) or "http" in str(o) for o in opts):
        blob = " ".join(str(o) for o in opts)
        if "watermark" in blob or "2026" in blob or "unproved" in blob or "Si" in blob:
            img_hits.append(q)

print("amines img-ish", len(img_hits))
for q in img_hits[:5]:
    print("id", q.get("id"))
    print("Q", str(q.get("q"))[:200])
    for i, o in enumerate(q.get("options") or []):
        print("  opt", i, str(o)[:220])
