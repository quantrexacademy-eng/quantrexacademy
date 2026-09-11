#!/usr/bin/env python3
import re
from collections import Counter
from pathlib import Path
ROOT = Path(r"C:\Users\Admin\qx-hosting")
BOOK = ROOT / "data" / "books" / "chapters" / "68f1ce4cc729e5251bd00430"
RX = re.compile(r"""(?:src|href)=\\?["']([^"']+)""", re.I)
hosts = Counter()
samples = {k: [] for k in ("getmarks", "quizrr", "qx-book", "qx-self", "qx-org", "other")}
n = 0
for fp in BOOK.glob("*.json"):
    txt = fp.read_text(encoding="utf-8", errors="ignore")
    for u in RX.findall(txt):
        if not re.search(r"\.(png|jpe?g|webp|gif|svg)|/assets/diagrams|getmarks|quizrr|examgoal", u, re.I):
            continue
        n += 1
        if "getmarks" in u.lower():
            hosts["getmarks"] += 1
            if len(samples["getmarks"]) < 4: samples["getmarks"].append(u[:140])
        elif "quizrr" in u.lower():
            hosts["quizrr"] += 1
            if len(samples["quizrr"]) < 4: samples["quizrr"].append(u[:140])
        elif "qx-book-" in u:
            hosts["qx-book"] += 1
        elif "qx-self-" in u:
            hosts["qx-self"] += 1
        elif "qx-org-" in u:
            hosts["qx-org"] += 1
        else:
            hosts["other"] += 1
            if len(samples["other"]) < 6: samples["other"].append(u[:140])
print("imgs", n)
print(dict(hosts))
print(samples)
print("qx-book files", len(list((ROOT/"assets"/"diagrams").glob("qx-book-*.png"))))
print("qx-self files", len(list((ROOT/"assets"/"diagrams").glob("qx-self-*.png"))))
