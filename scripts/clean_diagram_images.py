#!/usr/bin/env python3
"""
Batch-remove third-party watermarks from CDN question diagrams (v2 algorithm).
Saves cleaned PNGs to assets/clean-diagrams/ and updates manifest + review list.

Usage:
  python scripts/clean_diagram_images.py --limit 500
  python scripts/clean_diagram_images.py --all
  python scripts/clean_diagram_images.py --reclean --limit 550
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
CLEAN_VER = 3
WM_RESIDUE_MAX = 0.018

FIX_CDN = re.compile(r"https?://\.app/", re.I)
CDN = "https://cdn-question-pool.getmarks.app/"


def fix_url(url: str) -> str:
    return FIX_CDN.sub(CDN, url.strip())


def url_hash(url: str) -> str:
    return hashlib.sha256(fix_url(url).encode()).hexdigest()[:16]


def rel_path(url: str) -> str:
    h = url_hash(url)
    return f"assets/clean-diagrams/{h[:2]}/{h[2:4]}/{h}.png"


def is_likely_ink(r: int, g: int, b: int) -> bool:
    avg = (r + g + b) / 3
    chroma = max(r, g, b) - min(r, g, b)
    if avg < 118:
        return True
    if chroma > 45 and avg < 210:
        return True
    return False


def is_watermark_pixel(r: int, g: int, b: int, a: int = 255) -> bool:
    if a < 10:
        return False
    avg = (r + g + b) / 3
    chroma = max(r, g, b) - min(r, g, b)
    return chroma < 42 and 140 <= avg <= 248


def is_marks_overlay(r: int, g: int, b: int, a: int = 255) -> bool:
    if a < 8:
        return False
    avg = (r + g + b) / 3
    if avg < 108:
        return False
    chroma = max(r, g, b) - min(r, g, b)
    if chroma >= 60:
        return False
    if b >= r - 22 and b >= g - 14 and 125 <= avg <= 252:
        return True
    if chroma < 44 and 132 <= avg <= 248:
        return True
    return False


def is_removable_wm(r: int, g: int, b: int, a: int = 255) -> bool:
    return is_watermark_pixel(r, g, b, a) or is_marks_overlay(r, g, b, a)


def pixel_avg(flat, w, x, y):
    r, g, b = flat[y * w + x]
    return (r + g + b) / 3


def has_ink_nearby(flat, w, h, x, y, radius):
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx == 0 and dy == 0:
                continue
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            r, g, b = flat[ny * w + nx]
            if is_likely_ink(r, g, b):
                return True
    return False


def light_context_ratio(flat, w, h, x, y, radius=4):
    light = total = 0
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            total += 1
            if pixel_avg(flat, w, nx, ny) > 165:
                light += 1
    return light / max(total, 1)


def median_channel(samples, ch):
    arr = sorted(p[ch] for p in samples)
    return arr[len(arr) // 2]


def local_bg_color(flat, w, h, x, y):
    samples = []
    rays = [
        (1, 0), (-1, 0), (0, 1), (0, -1),
        (2, 0), (-2, 0), (0, 2), (0, -2),
        (1, 1), (-1, -1), (1, -1), (-1, 1),
    ]
    for sdx, sdy in rays:
        for step in range(1, 11):
            nx, ny = x + sdx * step, y + sdy * step
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                break
            r, g, b = flat[ny * w + nx]
            if is_likely_ink(r, g, b):
                break
            if not is_removable_wm(r, g, b):
                samples.append((r, g, b))
                break
    if len(samples) >= 2:
        return (
            median_channel(samples, 0),
            median_channel(samples, 1),
            median_channel(samples, 2),
        )
    white = []
    for dy in range(-4, 5):
        for dx in range(-4, 5):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            if pixel_avg(flat, w, nx, ny) > 242:
                r, g, b = flat[ny * w + nx]
                white.append((r, g, b))
    if white:
        return tuple(int(sum(c[i] for c in white) / len(white)) for i in range(3))
    return (255, 255, 255)


def safe_to_remove(flat, w, h, x, y, strict):
    r, g, b = flat[y * w + x]
    if not is_removable_wm(r, g, b):
        return False
    if is_likely_ink(r, g, b):
        return False
    ink_radius = 2 if strict else 1
    if has_ink_nearby(flat, w, h, x, y, ink_radius):
        return False
    light_need = 0.38 if strict else 0.52
    if light_context_ratio(flat, w, h, x, y, 4) < light_need:
        return False
    return True


def safe_overlay_remove(flat, w, h, x, y):
    r, g, b = flat[y * w + x]
    avg = (r + g + b) / 3
    if not is_removable_wm(r, g, b):
        return False
    if is_likely_ink(r, g, b):
        return False
    if avg < 112:
        return False
    return True


def count_ink(flat, w, h):
    return sum(
        1 for y in range(h) for x in range(w)
        if is_likely_ink(*flat[y * w + x])
    )


def count_wm(flat, w, h):
    return sum(
        1 for y in range(h) for x in range(w)
        if is_removable_wm(*flat[y * w + x])
    )


def paint_bg(flat, w, h, x, y):
    bg = local_bg_color(flat, w, h, x, y)
    flat[y * w + x] = bg
    return bg


def clean_image(im: Image.Image):
    rgb = im.convert("RGBA")
    w, h = rgb.size
    px = list(rgb.getdata())
    flat = [(p[0], p[1], p[2]) for p in px]
    total = w * h
    removed = 0
    before_ink = count_ink(flat, w, h)
    before_wm = count_wm(flat, w, h)

    corners = [
        (int(w * 0.72), int(h * 0.78), w, h),
        (0, int(h * 0.78), int(w * 0.28) + 1, h),
        (int(w * 0.72), 0, w, int(h * 0.22) + 1),
    ]
    for x0, y0, x1, y1 in corners:
        for y in range(y0, y1):
            for x in range(x0, x1):
                if not safe_to_remove(flat, w, h, x, y, False):
                    continue
                paint_bg(flat, w, h, x, y)
                removed += 1

    for y in range(h):
        for x in range(w):
            d1 = abs(x / max(w, 1) - y / max(h, 1))
            d2 = abs(1 - x / max(w, 1) - y / max(h, 1))
            if d1 > 0.16 and d2 > 0.16:
                continue
            if not safe_to_remove(flat, w, h, x, y, False):
                continue
            paint_bg(flat, w, h, x, y)
            removed += 1

    for y in range(h):
        for x in range(w):
            if not safe_to_remove(flat, w, h, x, y, True):
                continue
            paint_bg(flat, w, h, x, y)
            removed += 1

    for y in range(h):
        for x in range(w):
            r, g, b = flat[y * w + x]
            if not is_removable_wm(r, g, b):
                continue
            if light_context_ratio(flat, w, h, x, y, 5) < 0.72:
                continue
            if has_ink_nearby(flat, w, h, x, y, 3):
                continue
            paint_bg(flat, w, h, x, y)
            removed += 1

    cx0, cy0 = int(w * 0.06), int(h * 0.06)
    cx1, cy1 = int(w * 0.94) + 1, int(h * 0.94) + 1
    for y in range(cy0, cy1):
        for x in range(cx0, cx1):
            if not safe_overlay_remove(flat, w, h, x, y):
                continue
            paint_bg(flat, w, h, x, y)
            removed += 1

    for _ in range(2):
        for y in range(h):
            for x in range(w):
                if not safe_overlay_remove(flat, w, h, x, y):
                    continue
                paint_bg(flat, w, h, x, y)
                removed += 1

    after_ink = count_ink(flat, w, h)
    after_wm = count_wm(flat, w, h)
    removed_ratio = removed / max(total, 1)
    damaged = after_ink < max(45, before_ink * 0.22)
    improved = after_wm < before_wm * 0.55 or (before_wm > 0 and after_wm == 0)
    residue_ratio = after_wm / max(total, 1)
    clean_enough = residue_ratio <= WM_RESIDUE_MAX
    flagged = damaged or not improved or not clean_enough
    new_px = [(*flat[i], px[i][3]) for i in range(len(px))]
    out = Image.new("RGBA", (w, h))
    out.putdata(new_px)
    return out.convert("RGB"), {
        "removed": removed,
        "flagged": flagged,
        "removed_ratio": removed_ratio,
        "before_wm": before_wm,
        "after_wm": after_wm,
        "residue_ratio": residue_ratio,
    }


def fetch(url: str, timeout=25) -> bytes:
    req = urllib.request.Request(
        fix_url(url),
        headers={"User-Agent": "QuantrexImageCleaner/2.0"},
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
    ap.add_argument("--reclean", action="store_true", help="Re-process URLs already in manifest")
    ap.add_argument("--urls-file", type=str, default="", help="JSON file with {urls:[]} for worker shard")
    ap.add_argument("--manifest-out", type=str, default="", help="Shard manifest output path")
    ap.add_argument("--review-out", type=str, default="", help="Shard review output path")
    ap.add_argument("--worker", type=int, default=-1, help="Worker id for logging")
    args = ap.parse_args()

    manifest_path = Path(args.manifest_out) if args.manifest_out else MANIFEST
    review_path = Path(args.review_out) if args.review_out else REVIEW

    if args.urls_file:
        uf = json.loads(Path(args.urls_file).read_text(encoding="utf-8"))
        urls = [fix_url(u) for u in uf.get("urls", [])]
        manifest = {"version": CLEAN_VER, "map": {}, "processed": 0}
        review = {"flagged": [], "reasons": {}}
        flagged_set: set[str] = set()
        todo = urls
        tag = f"worker={args.worker}" if args.worker >= 0 else "shard"
        print(f"{tag} urls={len(todo)}")
    else:
        if not SCAN.exists():
            raise SystemExit(f"Run scan_pool_images.py first — missing {SCAN}")

        scan = json.loads(SCAN.read_text(encoding="utf-8"))
        urls = [fix_url(u) for u in scan.get("urls", [])]

        manifest = load_json(manifest_path, {"version": 1, "map": {}, "processed": 0})
        review = load_json(review_path, {"flagged": [], "reasons": {}})
        flagged_set = set(review.get("flagged", []))

        if args.reclean:
            todo = list(manifest.get("map", {}).keys())
            if not args.all:
                todo = todo[: args.limit]
            print(f"reclean mode: {len(todo)} manifest entries (v{CLEAN_VER})")
        else:
            done = set(manifest.get("map", {}).keys()) | flagged_set
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
                if url not in review["flagged"]:
                    review["flagged"].append(url)
                review["reasons"][url] = (
                    f"removed_ratio={stats['removed_ratio']:.3f} "
                    f"after_wm={stats.get('after_wm', 0)} "
                    f"residue={stats.get('residue_ratio', 0):.4f}"
                )
                flagged += 1
                print(f"[{i}/{len(todo)}] FLAG {url} ratio={stats['removed_ratio']:.3f}")
            else:
                if url in flagged_set:
                    review["flagged"] = [u for u in review["flagged"] if u != url]
                    review["reasons"].pop(url, None)
                    flagged_set.discard(url)
                rel = rel_path(url)
                dest = ROOT / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                cleaned.save(dest, format="PNG", optimize=True, dpi=(300, 300))
                manifest["map"][url] = rel.replace("\\", "/")
                ok += 1
                print(f"[{i}/{len(todo)}] OK {rel} removed={stats['removed']}")
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as e:
            if url not in review["flagged"]:
                review["flagged"].append(url)
            review["reasons"][url] = f"fetch/process error: {e}"
            fail += 1
            print(f"[{i}/{len(todo)}] ERR {url} — {e}")
        if i % 25 == 0:
            manifest["version"] = CLEAN_VER
            manifest["processed"] = len(manifest.get("map", {}))
            manifest["updated"] = int(time.time())
            save_json(manifest_path, manifest)
            save_json(review_path, review)

    manifest["version"] = CLEAN_VER
    manifest["processed"] = len(manifest.get("map", {}))
    manifest["updated"] = int(time.time())
    review["count"] = len(review.get("flagged", []))
    save_json(manifest_path, manifest)
    save_json(review_path, review)
    wtag = f" worker={args.worker}" if args.worker >= 0 else ""
    print(f"done ok={ok} flagged={flagged} errors={fail} manifest_version={CLEAN_VER}{wtag}")
    print(f"manifest={manifest_path} review={review_path}")


if __name__ == "__main__":
    main()