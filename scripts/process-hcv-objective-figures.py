"""
HC Verma Vol2 Objective I & II — exact original layout, multicolor + Quantrex watermark.
"""
import json
import re
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance

ROOT = Path(r"E:\quantrexacademy")
BOOK_DIR = ROOT / "data" / "books" / "chapters" / "6a0addba4b032b031e049a36"
OUT = ROOT / "assets" / "diagrams"
SRC = ROOT / "assets" / "diagrams" / "hcv-obj-src"
OVERRIDES = ROOT / "data" / "qx_figure_overrides.json"
CDN_BASE = "https://cdn.quizrr.in/question-assets/resources/physics/hcv/"
MODULES = ["6a2fdc56afb6d6932c18427d", "6a2fdc56afb6d6932c18482b"]
CDN_RE = re.compile(r"https://cdn\.quizrr\.in/question-assets/resources/physics/hcv/([^\"'\s>]+\.png)")

PALETTE = [
    [37, 99, 235],
    [220, 38, 38],
    [15, 118, 110],
    [124, 58, 237],
    [234, 88, 12],
    [22, 163, 74],
    [219, 39, 119],
    [202, 138, 4],
]

LOGO_SRC = ROOT / "assets" / "quantrex-academy-brand.png"
LOGO_WM = ROOT / "assets" / "quantrex-academy-brand-wm.png"
LOGO_SCALE = 0.24
LOGO_OPACITY = 0.38
FALLBACK_OPACITY = 0.32
DIAG_COVERAGE = 0.68
ROT_DEG = 35


def local_name(cdn_file: str) -> str:
    stem = Path(cdn_file).stem
    return f"hcv-v2-obj-{stem}.png"


def local_path(cdn_file: str) -> Path:
    return OUT / local_name(cdn_file)


def collect_cdn_urls():
    urls = set()
    for f in BOOK_DIR.glob("*.json"):
        d = json.load(open(f, encoding="utf-8"))
        if d.get("moduleId") not in MODULES:
            continue
        for m in CDN_RE.findall(json.dumps(d)):
            urls.add(m)
    return sorted(urls)


def download(urls):
    SRC.mkdir(parents=True, exist_ok=True)
    for name in urls:
        dest = SRC / name
        if dest.exists():
            continue
        try:
            urllib.request.urlretrieve(CDN_BASE + name, dest)
            print("downloaded", name)
        except Exception as e:
            print("skip download", name, e)


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


def prepare_logo(path: Path, out: Path) -> Image.Image:
    im = Image.open(path).convert("RGBA")
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
    logo.save(out, "PNG", optimize=True)
    return logo


def ink_mask(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = (r.astype(np.float32) + g + b) / 3.0
    chroma = np.maximum.reduce([np.abs(r - g), np.abs(g - b), np.abs(r - b)])
    bg = lum > 248
    return (~bg) & (lum < 215) & (chroma > 8)


def grid_stats(mask, cols, cols_y):
    h, w = mask.shape
    cells = []
    for ry in range(cols_y):
        for cx in range(cols):
            x0, x1 = cx * w // cols, (cx + 1) * w // cols
            y0, y1 = ry * h // cols_y, (ry + 1) * h // cols_y
            patch = mask[y0:y1, x0:x1]
            ink_r = patch.sum() / max(patch.size, 1)
            cells.append({"cx_mid": (x0 + x1) / 2 / w, "cy_mid": (y0 + y1) / 2 / h, "ink_r": ink_r})
    center = [c for c in cells if 0.33 <= c["cx_mid"] <= 0.67 and 0.33 <= c["cy_mid"] <= 0.67]
    center_ink = sum(c["ink_r"] for c in center) / max(len(center), 1)
    best = min(cells, key=lambda c: c["ink_r"])
    dense = center_ink > 0.12
    return {"center_ink": center_ink, "best": best, "dense": dense}


def watermark_image(fig_path: Path, logo: Image.Image):
    base = Image.open(fig_path).convert("RGB")
    mask = ink_mask(np.array(base))
    grid = grid_stats(mask, 12, 12)
    opacity = FALLBACK_OPACITY if grid["dense"] else LOGO_OPACITY
    diagonal = grid["center_ink"] < 0.20
    w, h = base.size
    if diagonal:
        diag = (w * w + h * h) ** 0.5
        lw = max(84, int(diag * DIAG_COVERAGE * 0.46))
    else:
        lw = max(36, int(w * LOGO_SCALE))
    lh = max(36, int(lw * logo.height / logo.width))
    mark = logo.resize((lw, lh), Image.LANCZOS)
    if diagonal:
        mark = mark.rotate(ROT_DEG, expand=True, resample=Image.BICUBIC)
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    x = int(w / 2 - mark.size[0] / 2)
    y = int(h / 2 - mark.size[1] / 2)
    alpha = mark.split()[3].point(lambda p: int(p * opacity))
    mark.putalpha(alpha)
    layer.paste(mark, (x, y), mark)
    out = Image.alpha_composite(base.convert("RGBA"), layer).convert("RGB")
    out.save(fig_path, "PNG", optimize=True)


def patch_json_files(url_map):
    changed = 0
    for f in BOOK_DIR.glob("*.json"):
        d = json.load(open(f, encoding="utf-8"))
        if d.get("moduleId") not in MODULES:
            continue
        blob = json.dumps(d, ensure_ascii=False)
        new_blob = blob
        for cdn_name, local in url_map.items():
            full = CDN_BASE + cdn_name
            new_blob = new_blob.replace(full, local)
        if new_blob != blob:
            json.dump(json.loads(new_blob), open(f, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
            changed += 1
            print("patched", f.name)
    return changed


def update_overrides(url_map):
    data = json.loads(OVERRIDES.read_text(encoding="utf-8")) if OVERRIDES.exists() else {"version": 1, "rules": []}
    rules = data.get("rules", [])
    existing = {r.get("urlRx", r.get("url", "")) for r in rules}
    for cdn_name, local in url_map.items():
        key = re.escape(cdn_name)
        if key in existing:
            continue
        rules.append({"urlRx": key, "clean": local})
    data["rules"] = rules
    data["version"] = data.get("version", 1) + 1
    OVERRIDES.write_text(json.dumps(data, indent=2), encoding="utf-8")


def main():
    urls = collect_cdn_urls()
    print("figures", len(urls))
    download(urls)
    logo = prepare_logo(LOGO_SRC, LOGO_WM)
    url_map = {}
    for name in urls:
        src = SRC / name
        if not src.exists():
            print("missing src", name)
            continue
        out = local_path(name)
        recolor_image(src, out)
        watermark_image(out, logo)
        url_map[name] = "/assets/diagrams/" + local_name(name)
        print("ok", out.name)
    patch_json_files(url_map)
    update_overrides(url_map)
    print("done", len(url_map))


if __name__ == "__main__":
    main()