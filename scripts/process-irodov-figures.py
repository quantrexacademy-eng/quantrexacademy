"""
IE Irodov — heavy MARKS watermark strip, exact layout multicolor, Quantrex watermark.
Only patches img src URLs in Irodov chapter JSON; question/options/answer unchanged.
"""
import hashlib
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(r"E:\quantrexacademy")
IRODOV_DIR = ROOT / "data" / "books" / "chapters" / "69cfb5366ecf5579037d96a4"
OUT = ROOT / "assets" / "diagrams"
SRC = ROOT / "assets" / "diagrams" / "irodov-src"
MANIFEST = ROOT / "data" / "qx_irodov_figure_manifest.json"
OVERRIDES = ROOT / "data" / "qx_figure_overrides.json"
LOGO_SRC = ROOT / "assets" / "quantrex-academy-brand.png"
LOGO_WM = ROOT / "assets" / "quantrex-academy-brand-wm.png"

BROKEN_RE = re.compile(r"https://\.app/([^\"'\s>]+\.(?:webp|png|jpg|jpeg))", re.I)
GETMARKS_CDN = "https://cdn-question-pool.getmarks.app/"

PALETTE = [
    [37, 99, 235], [220, 38, 38], [15, 118, 110], [124, 58, 237],
    [234, 88, 12], [22, 163, 74], [219, 39, 119], [202, 138, 4],
]
LOGO_OPACITY = 0.38
FALLBACK_OPACITY = 0.32
DIAG_COVERAGE = 0.68
ROT_DEG = 35


def normalize_url(url: str) -> str:
    u = url.strip()
    if u.startswith("https://.app/"):
        return GETMARKS_CDN + u[len("https://.app/") :]
    return u


def url_hash(url: str) -> str:
    return hashlib.sha1(normalize_url(url).encode("utf-8")).hexdigest()[:16]


def local_name(broken_url: str) -> str:
    return f"qx-irodov-{url_hash(broken_url)}.png"


def local_path(broken_url: str) -> Path:
    return OUT / local_name(broken_url)


def load_manifest():
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {"version": 1, "map": {}}


def save_manifest(m):
    MANIFEST.write_text(json.dumps(m, indent=2), encoding="utf-8")


def collect_broken_urls():
    urls = set()
    for f in IRODOV_DIR.glob("*.json"):
        blob = f.read_text(encoding="utf-8", errors="ignore")
        urls.update(re.findall(r"https://\.app/[^\"'\s>]+\.(?:webp|png|jpg|jpeg)", blob, flags=re.I))
    return sorted(urls)


def download(cdn_url: str, dest: Path, retries=4):
    if dest.exists() and dest.stat().st_size > 200:
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    for i in range(retries):
        try:
            req = urllib.request.Request(cdn_url, headers={"User-Agent": "QuantrexIrodovBot/1.0"})
            with urllib.request.urlopen(req, timeout=45) as r:
                dest.write_bytes(r.read())
            if dest.stat().st_size > 100:
                return True
        except Exception as e:
            if i == retries - 1:
                print("download fail", cdn_url[:90], e)
            time.sleep(0.8 * (i + 1))
    return False


def aggressive_strip_watermark(arr: np.ndarray) -> np.ndarray:
    """Remove heavy diagonal MARKS watermark; preserve figure ink."""
    out = arr.astype(np.float32).copy()
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    lum = (r + g + b) / 3.0
    chroma = np.maximum.reduce([np.abs(r - g), np.abs(g - b), np.abs(r - b)])

    wm = (
        ((b > r + 6) & (b > g + 1) & (lum > 130))
        | ((lum > 148) & (lum < 248) & (chroma < 34))
        | ((r > 175) & (g > 155) & (b > 195) & (chroma < 48))
        | ((lum > 165) & (lum < 252) & (chroma < 24))
    )

    h, w = lum.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    # diagonal bands (MARKS often centered / repeated)
    d1 = np.abs(yy / max(h, 1) - xx / max(w, 1))
    d2 = np.abs(yy / max(h, 1) + xx / max(w, 1) - 1.0)
    diag = (d1 < 0.14) | (d2 < 0.14)
    wm |= diag & (lum > 142) & (chroma < 42)

    # faint overlay on ink: bluish tint over dark lines
    ink_zone = (lum < 200) & (chroma > 10)
    bluish_film = ink_zone & (b > r + 4) & (b > g) & (lum > 55) & (lum < 195)
    wm |= bluish_film

    out[wm] = 255.0
    return out.astype(np.uint8)


def recolor_image(path: Path, out_path: Path):
    raw = np.array(Image.open(path).convert("RGBA"), dtype=np.int16)
    stripped = aggressive_strip_watermark(raw.astype(np.uint8))
    arr = stripped.astype(np.int16)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    lum = (r + g + b) / 3.0
    chroma = np.maximum.reduce([np.abs(r - g), np.abs(g - b), np.abs(r - b)])

    wm_residue = (
        ((b > r + 6) & (b > g + 1) & (lum > 130))
        | ((lum > 150) & (lum < 245) & (chroma < 30))
    )
    bg = (lum > 248)
    ink = (~bg) & (~wm_residue) & (lum < 215)

    if ink.sum() < 60:
        rgb = Image.open(path).convert("RGB")
        rgb = rgb.filter(ImageFilter.SHARPEN)
        rgb.save(out_path, "PNG", optimize=True)
        return False

    out = np.full((*ink.shape, 4), 255, dtype=np.uint8)
    h, w = ink.shape
    band = np.zeros((h, w), dtype=np.int32)
    band[ink & (lum < 95)] = 0
    band[ink & (lum >= 95) & (lum < 145)] = 1
    band[ink & (lum >= 145)] = 2
    yy, xx = np.mgrid[0:h, 0:w]
    xq = np.minimum(3, xx * 4 // max(w, 1))
    yq = np.minimum(2, yy * 3 // max(h, 1))
    color_idx = (band * 12 + xq * 3 + yq) % len(PALETTE)
    for i, rgb_c in enumerate(PALETTE):
        mask = ink & (color_idx == i)
        out[mask, :3] = rgb_c
    textish = ink & (lum >= 125) & (chroma < 38)
    out[textish, :3] = [15, 118, 110]

    result = Image.fromarray(out, "RGBA")
    rgb = Image.new("RGB", result.size, (255, 255, 255))
    rgb.paste(result, mask=result.split()[3])
    rgb = ImageEnhance.Contrast(rgb).enhance(1.08)
    rgb = ImageEnhance.Color(rgb).enhance(1.18)
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


def process_figure(broken_url: str, logo, manifest_map):
    local = "/assets/diagrams/" + local_name(broken_url)
    if broken_url in manifest_map and local_path(broken_url).exists():
        return local
    cdn = normalize_url(broken_url)
    stem = Path(cdn.split("?")[0]).name
    src_file = SRC / f"{url_hash(broken_url)}_{stem}"
    if not download(cdn, src_file):
        return None
    out = local_path(broken_url)
    recolor_image(src_file, out)
    watermark_image(out, logo)
    manifest_map[broken_url] = local
    return local


def patch_irodov_json(url_map):
    changed = 0
    for f in IRODOV_DIR.glob("*.json"):
        blob = f.read_text(encoding="utf-8")
        new_blob = blob
        for broken, local in url_map.items():
            new_blob = new_blob.replace(broken, local)
        if new_blob != blob:
            f.write_text(new_blob, encoding="utf-8")
            changed += 1
    return changed


def update_overrides(url_map):
    data = json.loads(OVERRIDES.read_text(encoding="utf-8")) if OVERRIDES.exists() else {"version": 1, "rules": []}
    rules = data.get("rules", [])
    seen = {r.get("url", "") + r.get("urlRx", "") for r in rules}
    for broken, local in url_map.items():
        key = re.escape(Path(broken.split("/")[-1]).stem)
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
    urls = collect_broken_urls()
    pending = [u for u in urls if u not in url_map or not local_path(u).exists()]
    print("irodov total", len(urls), "pending", len(pending), "done", len(urls) - len(pending))
    logo = prepare_logo()
    ok = 0
    for i, broken in enumerate(pending, 1):
        local = process_figure(broken, logo, url_map)
        if local:
            ok += 1
            url_map[broken] = local
        if i % 10 == 0:
            manifest["map"] = url_map
            save_manifest(manifest)
            print(f"progress {i}/{len(pending)} ok={ok}")
    manifest["map"] = url_map
    save_manifest(manifest)
    patched = patch_irodov_json(url_map)
    update_overrides(url_map)
    print("processed", ok, "patched_files", patched, "total_map", len(url_map))


if __name__ == "__main__":
    main()