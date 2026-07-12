import json
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path(r"E:\quantrexacademy\data\books\chapters")
CDN_RE = re.compile(r"https://cdn\.quizrr\.in/[^\"'\s>]+\.(?:png|jpg|jpeg|webp|gif)", re.I)
LOCAL_RE = re.compile(r"/assets/diagrams/[^\"'\s>]+\.png", re.I)

by_book = defaultdict(lambda: {"cdn": set(), "local": set(), "files_cdn": 0})
all_cdn = set()

for book_dir in ROOT.iterdir():
    if not book_dir.is_dir():
        continue
    bid = book_dir.name
    for f in book_dir.glob("*.json"):
        try:
            d = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        blob = json.dumps(d)
        cdn_urls = CDN_RE.findall(blob)
        local_urls = LOCAL_RE.findall(blob)
        if cdn_urls:
            by_book[bid]["files_cdn"] += 1
        by_book[bid]["cdn"].update(cdn_urls)
        by_book[bid]["local"].update(local_urls)
        all_cdn.update(cdn_urls)

print("books_with_cdn", sum(1 for b in by_book.values() if b["cdn"]))
print("total_unique_cdn", len(all_cdn))
print("total_local", sum(len(b["local"]) for b in by_book.values()))
print()
for bid, info in sorted(by_book.items(), key=lambda x: -len(x[1]["cdn"])):
    if not info["cdn"]:
        continue
    print(bid, "cdn", len(info["cdn"]), "local", len(info["local"]), "chapters", info["files_cdn"])

# sample URL patterns
samples = list(all_cdn)[:20]
print("\nsamples:")
for s in samples:
    print(s)