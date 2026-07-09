#!/usr/bin/env python3
"""Scan data/*.json for third-party CDN question diagram URLs."""
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

IMG_RX = re.compile(
    r"https?://[^\s\"'<>]+\.(?:png|jpg|jpeg|webp|gif)(?:\?[^\s\"'<>]*)?",
    re.I,
)
POOL_RX = re.compile(
    r"cdn-question-pool|cdn\.quizrr|getmarks\.app|/pyq/|scoremarks|mathongo|allen",
    re.I,
)
BRAND_RX = re.compile(
    r"watermark|marks-premium|marks_selected|getmarks-brand|web_assets|branding",
    re.I,
)


def walk_strings(obj, out):
    if isinstance(obj, str):
        for m in IMG_RX.findall(obj):
            url = m.split("?")[0]
            if POOL_RX.search(url) or BRAND_RX.search(url):
                out.add(url)
    elif isinstance(obj, dict):
        for v in obj.values():
            walk_strings(v, out)
    elif isinstance(obj, list):
        for v in obj:
            walk_strings(v, out)


def main():
    urls = set()
    files = 0
    for path in DATA.rglob("*.json"):
        files += 1
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for m in IMG_RX.findall(text):
            url = m.split("?")[0]
            if POOL_RX.search(url) or BRAND_RX.search(url):
                urls.add(url)
        try:
            data = json.loads(text)
            walk_strings(data, urls)
        except json.JSONDecodeError:
            pass

    print(f"json_files_scanned={files}")
    print(f"unique_pool_images={len(urls)}")
    out = ROOT / "data" / "qx_image_scan.json"
    payload = {
        "count": len(urls),
        "urls": sorted(urls),
    }
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()