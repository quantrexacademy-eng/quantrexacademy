"""
All digital books — exact original layout, multicolor ink + Quantrex watermark.
Skips already-local /assets/diagrams paths. Resumable via manifest.
"""
import hashlib
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance

ROOT = Path(r"E:\quantrexacademy")
CHAPTERS = ROOT / "data" / "books" / "chapters"
OUT = ROOT / "assets" / "diagrams"
SRC = ROOT / "assets" / "diagrams" / "book-src"
MANIFEST = ROOT / "data" / "qx_book_figure_manifest.json"
OVERRIDES = ROOT / "data" / "qx_figure_overrides.json"
LOGO_SRC = ROOT / "assets" / "quantrex-academy-brand.png"
LOGO_WM = ROOT / "assets" / "quantrex-academy-brand-wm.png"

CDN_RE = re.compile(r"https://cdn\.quizrr\.in/[^\"'\s>]+\.(?:png|jpg|jpeg|webp|gif)", re.I)
LOCAL_SKIP_RE = re.compile(r"^/assets/diagrams/", re.I)

PALETTE = [
    [37, 99, 235], [220, 38, 38], [15, 118, 110], [124, 58, 237],
    [234, 88, 12], [22, 163, 74], [219, 39, 119], [202, 138, 4],
]
LOGO_OPACITY = 0.38
FALLBACK_OPACITY = 0.32
DIAG_COVERAGE = 0.68
ROT_DEG = 35


def url_hash(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]


def local_name(url: str) -> str:
    ext = Path(url.split("?")[0]).suffix.lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
        ext = ".png"
    if ext in (".jpg", ".jpeg", ".webp", ".gif"):
        ext = ".png"
    return f"qx-book-{url_hash(url)}{ext}"


def local_path(url: str) -> Path:
    return OUT / local_name(url)


def load_manifest():
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {"version": 1, "map": {}}


def save_manifest(m):
    MANIFEST.write_text(json.dumps(m, indent=2), encoding="utf-8")


def collect_urls():
    urls = set()
    for book_dir in CHAPTERS.iterdir():
        if not book_dir.is_dir():
            continue
        for f in book_dir.glob("*.json"):
            blob = f.read_text(encoding="utf-8", errors="ignore")
            urls.update(CDN_RE.findall(blob))
    return sorted(urls)


def download(url: str, dest: Path, retries=3):
    if dest.exists() and dest.stat().st_size > 200:
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "QuantrexFigureBot/1.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                dest.write_bytes(r.read())
            if dest.stat().st_size > 100:
                return True
        except Exception as e:
            if i == retries - 1:
                print("download fail", url[:80], e)
            time.sleep(0.5 * (i + 1))
    return False


def recolor_image(path: Path, out_path: Path):
    arr = np.array(Image.open(path).convert("RGBA"), dtype=np.int16)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    lum = (r + g + b) / 3.0
    chroma = np.maximum.reduce([np.abs(r - g), np.abs(g - b), np.abs(r - b)])
    wm = (
        ((b > r + 12) & (b > g + 4) & (lum > 155))
        | ((lum > 165) & (lum < 235) & (chroma < 28))
    )
    bg = (lum > 248) | (a < 10)
    ink = (~bg) & (~wm) & (lum < 215)
    if ink.sum() < 80:
        rgb = Image.open(path).convert("RGB")
        rgb.save(out_path, "PNG", optimize=True)
        return False
    out = np.full(arr.shape, 255, dtype=np.uint8)
    out[..., 3] = 255
    h, w = ink.shape
    band = np.zeros((h, w), dtype=np.int32)
    band[ink & (lum < 95)] = 0
    band[ink & (lum >= 95) & (lum < 145)] = 1
    band[ink & (lum >= 145)] = 2
    yy, xx = np.mgrid[0:h, 0:w]
    xq = np.minimum(3, xx * 4 // max(w, 1))
    yq = np.minimum(2, yy * 3 // max(h, 1))
    color_idx = (band * 12 + xq * 3 + yq) % len(PALETTE)
    for i, rgb in enumerate(PALETTE):
        mask = ink & (color_idx == i)
        out[mask] = [rgb[0], rgb[1], rgb[2], 255]
    textish = ink & (lum >= 130) & (chroma < 35)
    out[textish] = [15, 118, 110, 255]
    result = Image.fromarray(out, "RGBA")
    rgb = Image.new("RGB", result.size, (255, 255, 255))
    rgb.paste(result, mask=result.split()[3])
    rgb = ImageEnhance.Contrast(rgb).enhance(1.06)
    rgb = ImageEnhance.Color(rgb).enhance(1.15)
    rgb.save(out_path, "PNG", optimize=True)
    return True


def prepare_logo():
    im = Image.open(LOGO_SRC).convert("RGBA")
    arr = np.array(im, dtype=np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    lum = (r + g + b) / 3.0
    alpha = a.copy()
    alpha[lum < 18] = 0
    soft = (lum >= 18) & (lum < 42)
    alpha[soft] = np.minimum(alpha[soft], (lum[soft] - 18) / 24 * 255)
    alpha[lum >= 42] = np.maximum(alpha[lum >= 42], 210)
    arr[..., 3] = alpha
    logo = Image.fromarray(arr.astype(np.uint8), "RGBA")
    logo.save(LOGO_WM, "PNG", optimize=True)
    return logo


def ink_mask(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = (r.astype(np.float32) + g + b) / 3.0
    chroma = np.maximum.reduce([np.abs(r - g), np.abs(g - b), np.abs(r - b)])
    return (~(lum > 248)) & (lum < 215) & (chroma > 8)


def watermark_image(fig_path: Path, logo: Image.Image):
    base = Image.open(fig_path).convert("RGB")
    mask = ink_mask(np.array(base))
    dense = mask.sum() / max(mask.size, 1) > 0.12
    opacity = FALLBACK_OPACITY if dense else LOGO_OPACITY
    w, h = base.size
    diag = (w * w + h * h) ** 0.5
    lw = max(84, int(diag * DIAG_COVERAGE * 0.46))
    lh = max(36, int(lw * logo.height / logo.width))
    mark = logo.resize((lw, lh), Image.LANCZOS).rotate(ROT_DEG, expand=True, resample=Image.BICUBIC)
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    x = int(w / 2 - mark.size[0] / 2)
    y = int(h / 2 - mark.size[1] / 2)
    alpha = mark.split()[3].point(lambda p: int(p * opacity))
    mark.putalpha(alpha)
    layer.paste(mark, (x, y), mark)
    Image.alpha_composite(base.convert("RGBA"), layer).convert("RGB").save(fig_path, "PNG", optimize=True)


def process_figure(url: str, logo, manifest_map):
    if url in manifest_map and local_path(url).exists():
        return manifest_map[url]
    src_file = SRC / url_hash(url)
    src_file = src_file.with_suffix(Path(url.split("?")[0]).suffix.lower() or ".png")
    if not download(url, src_file):
        return None
    out = local_path(url)
    recolor_image(src_file, out)
    watermark_image(out, logo)
    local = "/assets/diagrams/" + local_name(url)
    manifest_map[url] = local
    return local


def patch_all_json(url_map):
    changed = 0
    for book_dir in CHAPTERS.iterdir():
        if not book_dir.is_dir():
            continue
        for f in book_dir.glob("*.json"):
            blob = f.read_text(encoding="utf-8")
            new_blob = blob
            for url, local in url_map.items():
                new_blob = new_blob.replace(url, local)
            if new_blob != blob:
                f.write_text(new_blob, encoding="utf-8")
                changed += 1
    return changed


def update_overrides(url_map):
    data = json.loads(OVERRIDES.read_text(encoding="utf-8")) if OVERRIDES.exists() else {"version": 1, "rules": []}
    rules = data.get("rules", [])
    seen = {r.get("url", "") + r.get("urlRx", "") for r in rules}
    for url, local in url_map.items():
        key = re.escape(url.split("/")[-1].split("?")[0])
        if key in seen:
            continue
        rules.append({"urlRx": key, "clean": local})
        seen.add(key)
    data["rules"] = rules
    data["version"] = data.get("version", 1) + 1
    OVERRIDES.write_text(json.dumps(data, indent=2), encoding="utf-8")


def main():
    manifest = load_manifest()
    url_map = dict(manifest.get("map", {}))
    urls = collect_urls()
    pending = [u for u in urls if u not in url_map or not local_path(u).exists()]
    print("total", len(urls), "pending", len(pending), "done", len(urls) - len(pending))
    logo = prepare_logo()
    ok = 0
    for i, url in enumerate(pending, 1):
        local = process_figure(url, logo, url_map)
        if local:
            ok += 1
            url_map[url] = local
        if i % 25 == 0:
            manifest["map"] = url_map
            save_manifest(manifest)
            print(f"progress {i}/{len(pending)} ok={ok}")
    manifest["map"] = url_map
    save_manifest(manifest)
    patched = patch_all_json(url_map)
    update_overrides(url_map)
    print("processed", ok, "patched_files", patched, "total_map", len(url_map))


if __name__ == "__main__":
    main()