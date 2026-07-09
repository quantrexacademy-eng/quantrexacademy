#!/usr/bin/env python3
"""
Batch-remove third-party watermarks from CDN question diagrams.
Saves cleaned PNGs to assets/clean-diagrams/ and updates manifest + review list.

Usage:
  python scripts/clean_diagram_images.py --limit 500
  python scripts/clean_diagram_images.py --all
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    raise SystemExit("Install pillow: pip install pillow")

ROOT = Path(__file__).resolve().parents[1]
SCAN = ROOT / "data" / "qx_image_scan.json"
MANIFEST = ROOT / "data" / "qx_clean_manifest.json"
REVIEW = ROOT / "data" / "qx_image_review.json"
OUT_DIR = ROOT / "assets" / "clean-diagrams"

FIX_CDN = re.compile(r"https?://\.app/", re.I)
CDN = "https://cdn-question-pool.getmarks.app/"


def fix_url(url: str) -> str:
    return FIX_CDN.sub(CDN, url.strip())


def url_hash(url: str) -> str:
    return hashlib.sha256(fix_url(url).encode()).hexdigest()[:16]


def rel_path(url: str) -> str:
    h = url_hash(url)
    return f"assets/clean-diagrams/{h[:2]}/{h[2:4]}/{h}.png"


def is_watermark_pixel(r: int, g: int, b: int, a: int = 255) -> bool:
    if a < 20:
        return False
    avg = (r + g + b) / 3
    chroma = max(r, g, b) - min(r, g, b)
    return chroma < 30 and 178 <= avg <= 253


def has_dark_neighbor(px, w, h, x, y, radius=2):
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx == 0 and dy == 0:
                continue
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            r, g, b = px[ny * w + nx]
            if (r + g + b) / 3 < 95:
                return True
    return False


def bg_color(px, w, h, x, y):
    samples = []
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            r, g, b = px[ny * w + nx]
            if (r + g + b) / 3 > 248:
                samples.append((r, g, b))
    if not samples:
        return (255, 255, 255)
    return tuple(int(sum(c[i] for c in samples) / len(samples)) for i in range(3))


def clean_image(im: Image.Image):
    rgb = im.convert("RGBA")
    w, h = rgb.size
    px = list(rgb.getdata())
    flat = [(p[0], p[1], p[2]) for p in px]
    zones = [
        (int(w * 0.76), int(h * 0.80), w, h),
        (0, int(h * 0.80), int(w * 0.24), h),
        (int(w * 0.76), 0, w, int(h * 0.20)),
    ]
    removed = 0
    zone_pixels = 0
    dark_in_zones = 0
    new_px = list(px)

    for x0, y0, x1, y1 in zones:
        for y in range(y0, y1):
            for x in range(x0, x1):
                zone_pixels += 1
                i = y * w + x
                r, g, b, a = new_px[i]
                if (r + g + b) / 3 < 100:
                    dark_in_zones += 1
                if is_watermark_pixel(r, g, b, a):
                    bg = bg_color(flat, w, h, x, y)
                    new_px[i] = (*bg, 255)
                    flat[i] = bg
                    removed += 1

    for y in range(h):
        for x in range(w):
            d1 = abs(x / max(w, 1) - y / max(h, 1))
            d2 = abs(1 - x / max(w, 1) - y / max(h, 1))
            if d1 > 0.14 and d2 > 0.14:
                continue
            i = y * w + x
            r, g, b, a = new_px[i]
            if not is_watermark_pixel(r, g, b, a):
                continue
            if has_dark_neighbor(flat, w, h, x, y):
                continue
            bg = bg_color(flat, w, h, x, y)
            new_px[i] = (*bg, 255)
            flat[i] = bg
            removed += 1

    dark_ratio = dark_in_zones / max(zone_pixels, 1)
    flagged = dark_ratio > 0.42 and removed < 8
    out = Image.new("RGBA", (w, h))
    out.putdata(new_px)
    return out.convert("RGB"), {"removed": removed, "flagged": flagged, "dark_ratio": dark_ratio}


def fetch(url: str, timeout=25) -> bytes:
    req = urllib.request.Request(
        fix_url(url),
        headers={"User-Agent": "QuantrexImageCleaner/1.0"},
    )
    return urllib.request.urlopen(req, timeout=timeout).read()


def load_json(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return default


def save_json(path: Path, data):
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=200, help="Max images to process this run")
    ap.add_argument("--all", action="store_true", help="Process entire scan list")
    ap.add_argument("--resume", action="store_true", default=True)
    args = ap.parse_args()

    if not SCAN.exists():
        raise SystemExit(f"Run scan_pool_images.py first — missing {SCAN}")

    scan = json.loads(SCAN.read_text(encoding="utf-8"))
    urls = [fix_url(u) for u in scan.get("urls", [])]

    manifest = load_json(MANIFEST, {"version": 1, "map": {}, "processed": 0})
    review = load_json(REVIEW, {"flagged": [], "reasons": {}})
    done = set(manifest.get("map", {}).keys()) | set(review.get("flagged", []))

    todo = [u for u in urls if u not in done]
    if not args.all:
        todo = todo[: args.limit]

    print(f"total_urls={len(urls)} already_done={len(done)} this_run={len(todo)}")

    ok = fail = flagged = 0
    for i, url in enumerate(todo, 1):
        try:
            raw = fetch(url)
            im = Image.open(io.BytesIO(raw))
            cleaned, stats = clean_image(im)
            if stats["flagged"]:
                review["flagged"].append(url)
                review["reasons"][url] = "watermark overlaps figure content"
                flagged += 1
                print(f"[{i}/{len(todo)}] FLAG {url}")
            else:
                rel = rel_path(url)
                dest = ROOT / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                cleaned.save(dest, format="PNG", optimize=True, dpi=(300, 300))
                manifest["map"][url] = rel.replace("\\", "/")
                ok += 1
                print(f"[{i}/{len(todo)}] OK {rel} removed={stats['removed']}")
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as e:
            review["flagged"].append(url)
            review["reasons"][url] = f"fetch/process error: {e}"
            fail += 1
            print(f"[{i}/{len(todo)}] ERR {url} — {e}")
        if i % 25 == 0:
            manifest["processed"] = len(manifest.get("map", {}))
            manifest["updated"] = int(time.time())
            save_json(MANIFEST, manifest)
            save_json(REVIEW, review)

    manifest["processed"] = len(manifest.get("map", {}))
    manifest["updated"] = int(time.time())
    review["count"] = len(review.get("flagged", []))
    save_json(MANIFEST, manifest)
    save_json(REVIEW, review)
    print(f"done ok={ok} flagged={flagged} errors={fail}")
    print(f"manifest={MANIFEST} review={REVIEW}")


if __name__ == "__main__":
    main()