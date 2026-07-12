import json
import re
from pathlib import Path

ROOT = Path(r"E:\quantrexacademy")
BOOK = ROOT / "data" / "books" / "chapters" / "6a0addba4b032b031e049a36"
MODULES = ["6a2fdc56afb6d6932c18427d", "6a2fdc56afb6d6932c18482b"]
CDN_RE = re.compile(r"https://cdn\.quizrr\.in/question-assets/resources/physics/hcv/[^\"'\s>]+\.png")

mods = {}
for f in BOOK.glob("*.json"):
    d = json.load(open(f, encoding="utf-8"))
    mid = d.get("moduleId", "")
    if mid not in MODULES:
        continue
    blob = json.dumps(d)
    urls = CDN_RE.findall(blob)
    if not urls:
        continue
    mods.setdefault(mid, {"files": 0, "urls": set(), "qs": 0})
    mods[mid]["files"] += 1
    mods[mid]["qs"] += d.get("count", 0)
    mods[mid]["urls"].update(urls)

for mid, info in mods.items():
    print(mid, "chapters_with_figs", info["files"], "questions", info["qs"], "unique_urls", len(info["urls"]))
    for u in sorted(info["urls"])[:15]:
        print(" ", u.split("/")[-1])

# find objective II - any other module for same book
all_mods = {}
for f in BOOK.glob("*.json"):
    d = json.load(open(f, encoding="utf-8"))
    mid = d.get("moduleId", "")
    all_mods[mid] = all_mods.get(mid, 0) + d.get("count", 0)
print("all modules counts:")
for mid, c in sorted(all_mods.items(), key=lambda x: -x[1]):
    print(mid, c)