import re
from pathlib import Path

ROOT = Path(r"E:\quantrexacademy")
IRODOV = ROOT / "data" / "books" / "chapters" / "69cfb5366ecf5579037d96a4"
BROKEN_RE = re.compile(r"https://\.app/[^\"'\s>]+\.(?:webp|png|jpg|jpeg)", re.I)
CDN_FIX = "https://cdn-question-pool.getmarks.app/"

urls = set()
for f in IRODOV.glob("*.json"):
    blob = f.read_text(encoding="utf-8", errors="ignore")
    for u in BROKEN_RE.findall(blob):
        fixed = u.replace("https://.app/", CDN_FIX)
        urls.add(fixed)

print("irodov unique images:", len(urls))
for u in sorted(urls)[:8]:
    print(" ", u)