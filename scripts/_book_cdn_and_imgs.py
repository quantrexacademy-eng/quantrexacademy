#!/usr/bin/env python3
import json, re
from collections import Counter
from pathlib import Path
import hydrate_books_from_marks as H

ROOT = Path(r"C:\Users\Admin\qx-hosting\data\books\chapters")
rx = re.compile(r"https?://[^\"'\s>]+", re.I)

def stats(bid):
    imgN = Counter()
    urls = Counter()
    n = 0
    for fp in (ROOT / bid).glob("*.json"):
        data = json.loads(fp.read_text(encoding="utf-8"))
        qs = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(qs, list):
            continue
        for q in qs:
            if not H.leftover(q):
                continue
            n += 1
            raw = str(q.get("q") or "") + " " + " ".join(map(str, q.get("options") or []))
            imgN[len(H.img_urls(raw))] += 1
            for u in rx.findall(raw):
                host = u.split("/")[2] if "://" in u else u[:30]
                urls[host] += 1
    return n, imgN, urls

for bid, name in [
    ("68f1ce4cc729e5251bd00430", "rank"),
    ("69f9cc23681eab6d6021a4d1", "hcv1"),
    ("6a0addba4b032b031e049a36", "hcv2"),
]:
    n, imgN, urls = stats(bid)
    print(name, "leftover", n, "imgCounts", dict(imgN), "hosts", dict(urls))
