#!/usr/bin/env python3
"""Analyze watermark patterns on sample CDN diagrams."""
import io
import json
import re
import urllib.request
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("pip install pillow")

ROOT = Path(__file__).resolve().parents[1]
SCAN = ROOT / "data" / "qx_image_scan.json"
OUT = ROOT / "scripts" / "_samples"
OUT.mkdir(parents=True, exist_ok=True)

FIX_CDN = re.compile(r"https?://\.app/", re.I)
CDN = "https://cdn-question-pool.getmarks.app/"


def fix_url(url: str) -> str:
    return FIX_CDN.sub(CDN, url)


def zone_stats(im, x0, y0, x1, y1):
    crop = im.crop((x0, y0, x1, y1)).convert("RGB")
    px = list(crop.getdata())
    n = len(px)
    mean = tuple(sum(p[i] for p in px) / n for i in range(3))
    grayish = sum(1 for p in px if max(p) - min(p) < 25 and 170 <= sum(p) / 3 <= 248)
    dark = sum(1 for p in px if sum(p) / 3 < 120)
    return {"mean": mean, "grayish": grayish, "dark": dark, "total": n}


def analyze(url: str):
    url = fix_url(url)
    name = url.split("/")[-1][:40]
    try:
        data = urllib.request.urlopen(url, timeout=20).read()
        im = Image.open(io.BytesIO(data))
    except Exception as e:
        return {"url": url, "error": str(e)}
    w, h = im.size
    zones = {
        "br": zone_stats(im, int(w * 0.78), int(h * 0.82), w, h),
        "bl": zone_stats(im, 0, int(h * 0.82), int(w * 0.22), h),
        "center": zone_stats(im, int(w * 0.25), int(h * 0.25), int(w * 0.75), int(h * 0.75)),
    }
    # diagonal band heuristic
    diag_gray = 0
    rgb = im.convert("RGB")
    for y in range(h):
        for x in range(w):
            if abs((x / max(w, 1)) - (y / max(h, 1))) > 0.35:
                continue
            p = rgb.getpixel((x, y))
            if max(p) - min(p) < 20 and 185 <= sum(p) / 3 <= 245:
                diag_gray += 1
    return {"url": url, "size": [w, h], "zones": zones, "diag_gray": diag_gray}


def main():
    scan = json.loads(SCAN.read_text(encoding="utf-8"))
    urls = [u for u in scan["urls"] if "jee_main" in u or "pyq" in u][:12]
    results = []
    for u in urls:
        r = analyze(u)
        results.append(r)
        print(json.dumps(r, indent=2)[:500])
        print("---")
    (OUT / "analysis.json").write_text(json.dumps(results, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()