#!/usr/bin/env python3
from collections import Counter
from pathlib import Path
import re
ROOT = Path(r"C:\Users\Admin\qx-hosting")
CH = ROOT / "data" / "books" / "chapters"
RX = re.compile(r"https?://cdn-question-pool\.getmarks\.app[^\"'\\]+")
by = Counter()
for d in sorted(p for p in CH.iterdir() if p.is_dir()):
    n = 0
    for fp in d.glob("*.json"):
        n += len(RX.findall(fp.read_text(encoding="utf-8", errors="ignore")))
    if n:
        by[d.name] = n
print("getmarks by book")
for k, v in by.most_common():
    print(k, v)
qid = ROOT / "data" / "qid_marks"
print("qid_marks", qid.exists(), len(list(qid.glob("*.json"))) if qid.exists() else 0)
