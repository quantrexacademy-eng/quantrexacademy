import json
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path(r"E:\quantrexacademy")
CDN_PATTERNS = [
    re.compile(r"https://cdn\.quizrr\.in/[^\"'\s>]+\.(?:png|jpg|jpeg|webp|gif)", re.I),
    re.compile(r"https://cdn-question-pool\.getmarks\.app/[^\"'\s>]+\.(?:png|jpg|jpeg|webp|gif)", re.I),
    re.compile(r"https://\.app/[^\"'\s>]+\.(?:png|jpg|jpeg|webp|gif)", re.I),
]
LOCAL_RE = re.compile(r"/assets/diagrams/[^\"'\s>]+\.png", re.I)


def find_cdn_urls(blob):
    found = set()
    for pat in CDN_PATTERNS:
        found.update(pat.findall(blob))
    return found

def scan_dir(path: Path, label: str):
    cdn = set()
    files = 0
    if not path.exists():
        return cdn, files
    for f in path.rglob("*"):
        if f.suffix.lower() not in (".json", ".js", ".html"):
            continue
        try:
            blob = f.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        hits = find_cdn_urls(blob)
        if hits:
            files += 1
            cdn.update(hits)
    print(label, "files_with_cdn", files, "unique_cdn", len(cdn))
    return cdn, files

all_cdn = set()
for label, p in [
    ("books/chapters", ROOT / "data" / "books" / "chapters"),
    ("data root json", ROOT / "data"),
    ("marks_data", ROOT / "marks_data"),
]:
    if label == "data root json":
        cdn = set()
        files = 0
        for f in (ROOT / "data").glob("*.json"):
            blob = f.read_text(encoding="utf-8", errors="ignore")
            hits = find_cdn_urls(blob)
            if hits:
                files += 1
                cdn.update(hits)
        print(label, "files_with_cdn", files, "unique_cdn", len(cdn))
    else:
        cdn, _ = scan_dir(p, label)
    all_cdn.update(cdn)

# irodov
irodov = ROOT / "data" / "books" / "chapters" / "69cfb5366ecf5579037d96a4"
for f in irodov.glob("*.json"):
    d = json.load(open(f, encoding="utf-8"))
    blob = json.dumps(d)
    imgs = find_cdn_urls(blob) + LOCAL_RE.findall(blob)
    if imgs:
        print("irodov", f.name, "imgs", len(imgs), "sample", imgs[:2])

print("\nTOTAL unique CDN site-wide:", len(all_cdn))
for s in sorted(all_cdn)[:10]:
    print(" ", s[:100])