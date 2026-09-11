#!/usr/bin/env python3
import re
from collections import Counter
from pathlib import Path
ROOT = Path(r"C:\Users\Admin\qx-hosting")
RX = re.compile(
    r"getmarks-brand|ic_marks|marks-premium|marks_selected|allen[-_]?logo|vedantu-logo|aakash-logo|fiitjee|unacademy-logo|pw[-_]?logo|physicswallah",
    re.I,
)
CDN = re.compile(r"https?://cdn-question-pool\.getmarks\.app[^\"'\\]+")
areas = [
    ROOT/"data"/"books"/"chapters",
    ROOT/"data"/"banks",
    ROOT/"data"/"tests"/"jee_main_examgoal_2027"/"questions",
    ROOT/"data"/"tests"/"jee_main_quizrr_pyq_chapter"/"questions",
]
brand = Counter()
cdn = 0
for area in areas:
    if not area.exists():
        continue
    for fp in area.rglob("*.json"):
        if fp.name.startswith("_") or ".bak" in fp.name:
            continue
        t = fp.read_text(encoding="utf-8", errors="ignore")
        for m in RX.findall(t):
            brand[m.lower()] += 1
        cdn += len(CDN.findall(t))
print("coaching brand hits", dict(brand))
print("getmarks cdn leftover", cdn)
