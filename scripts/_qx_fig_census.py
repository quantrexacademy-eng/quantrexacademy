import json
import re
from pathlib import Path
from collections import Counter

CH = Path(r"E:\QUANTREX\website\data\banks\chapters")
IMG = re.compile(r"<img\b", re.I)
SRC = re.compile(r"""src=["']([^"']+)["']""", re.I)
c = Counter()
n = 0
for p in CH.rglob("*.json"):
    if p.name in ("index.json", "manifest.json"):
        continue
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        continue
    qs = raw.get("questions") if isinstance(raw, dict) else raw
    if not isinstance(qs, list):
        continue
    for q in qs:
        if not isinstance(q, dict):
            continue
        n += 1
        blob = str(q.get("q") or "") + " " + str(q.get("solution") or "")
        for o in q.get("options") or []:
            blob += " " + (o.get("text") if isinstance(o, dict) else str(o or ""))
        if IMG.search(blob):
            c["has_img"] += 1
            for u in SRC.findall(blob):
                if "firebasestorage" in u or "storage.googleapis.com" in u:
                    c["src_firebase"] += 1
                elif "/assets/" in u:
                    c["src_assets"] += 1
                elif "getmarks" in u or "cdn-question-pool" in u:
                    c["src_getmarks"] += 1
                elif u.startswith("http"):
                    c["src_http"] += 1
                else:
                    c["src_other"] += 1
print("qs", n)
print(dict(c))
