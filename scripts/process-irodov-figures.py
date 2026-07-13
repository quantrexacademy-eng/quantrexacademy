"""
IE Irodov — preserve question text (re-drawn from source ink), multicolor figure only.
Heavy MARKS watermark stripped from figure zone; text zone ink recovered on white.
"""
import hashlib
import json
import re
import time
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageDraw, ImageFont

ROOT = Path(r"E:\quantrexacademy")
IRODOV_DIR = ROOT / "data" / "books" / "chapters" / "69cfb5366ecf5579037d96a4"
OUT = ROOT / "assets" / "diagrams"
SRC = ROOT / "assets" / "diagrams" / "irodov-src"
MANIFEST = ROOT / "data" / "qx_irodov_figure_manifest.json"
OVERRIDES = ROOT / "data" / "qx_figure_overrides.json"
LOGO_SRC = ROOT / "assets" / "quantrex-academy-brand.png"
LOGO_WM = ROOT / "assets" / "quantrex-academy-brand-wm.png"

GETMARKS_CDN = "https://cdn-question-pool.getmarks.app/"

PALETTE = [
    [37, 99, 235], [220, 38, 38], [15, 118, 110], [124, 58, 237],
    [234, 88, 12], [22, 163, 74], [219, 39, 119], [202, 138, 4],
]
TEXT_COLOR = [18, 24, 38]
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


def collect_urls_from_manifest():
    m = load_manifest()
    return sorted(m.get("map", {}).keys())


def chroma(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return np.maximum.reduce([np.abs(r - g), np.abs(g - b), np.abs(r - b)])


def lum(rgb):
    return (rgb[..., 0].astype(np.float32) + rgb[..., 1] + rgb[..., 2]) / 3.0


def is_blue_badge(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    L = lum(rgb)
    return (b > r + 12) & (b > g + 4) & (L > 70) & (L < 230)


def is_wm_pixel(rgb):
    L = lum(rgb)
    C = chroma(rgb)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    return (
        is_blue_badge(rgb)
        | ((L > 155) & (L < 248) & (C < 32))
        | ((b > r + 8) & (b > g + 2) & (L > 135) & (C < 45))
        | ((L > 168) & (L < 252) & (C < 22))
    )


def find_white_box(rgb, h, w):
    L = lum(rgb)
    white = L > 242
    lower = white[h // 4 :, :]
    if not lower.any():
        return None
    rows = np.where(lower.any(axis=1))[0]
    cols = np.where(lower.any(axis=0))[0]
    if len(rows) < 8 or len(cols) < 8:
        return None
    y0 = h // 4 + rows[0]
    y1 = h // 4 + rows[-1] + 1
    x0, x1 = int(cols[0]), int(cols[-1]) + 1
    if (y1 - y0) < h * 0.12 or (x1 - x0) < w * 0.2:
        return None
    return x0, y0, x1, y1


def text_split_y(rgb, h, white_box):
    if white_box:
        return max(24, white_box[1] - 6)
    L = lum(rgb)
    ink = (L < 200) & ~is_blue_badge(rgb) & ~((L > 150) & (chroma(rgb) < 28))
    row_ink = ink.sum(axis=1)
    active = np.where(row_ink > max(8, row_ink.max() * 0.05))[0]
    if len(active) == 0:
        return int(h * 0.42)
    # last text row before figure gap
    gaps = np.where(np.diff(active) > 12)[0]
    if len(gaps):
        split = active[gaps[-1] + 1]
        if split > h * 0.2:
            return int(split)
    return int(min(h * 0.48, active.max() + 10))


def get_font(size=15):
    for name in ("arial.ttf", "segoeui.ttf", "calibri.ttf", "times.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def recover_text_band(rgb, y0, y1):
    """Recover question ink from watermarked source; re-draw as clean typed strokes."""
    band = rgb[y0:y1].copy().astype(np.float32)
    r, g, b = band[..., 0], band[..., 1], band[..., 2]
    badge = is_blue_badge(band.astype(np.uint8))
    dark = np.minimum(np.minimum(r, g), b)
    lo, hi = np.percentile(dark, [0.5, 88])
    norm = np.clip((dark - lo) / max(hi - lo, 1) * 255, 0, 255)
    L = lum(band.astype(np.uint8))
    wm = is_wm_pixel(band.astype(np.uint8))
    text = (norm < 175) & ~badge
    text &= (b < r + 10) | (norm < 85)
    text &= ~((L > 175) & wm & (norm > 95))
    text &= (chroma(band.astype(np.uint8)) < 55) | (norm < 105)
    out = np.full_like(band, 255, dtype=np.uint8)
    out[text] = TEXT_COLOR
    return out


def wrap_text(draw, text, font, max_w):
    words = str(text).split()
    lines, cur = [], []
    for w in words:
        trial = " ".join(cur + [w])
        if draw.textlength(trial, font=font) <= max_w:
            cur.append(w)
        else:
            if cur:
                lines.append(" ".join(cur))
            cur = [w]
    if cur:
        lines.append(" ".join(cur))
    return lines or [str(text)]


def render_typed_lines(rgb, y0, y1, min_conf=0.18):
    """OCR fragments -> clean typed lines; fallback bitmap ink recovery."""
    band_h, band_w = y1 - y0, rgb.shape[1]
    prep = recover_text_band(rgb, y0, y1)
    canvas = Image.new("RGB", (band_w, band_h), (255, 255, 255))
    draw = ImageDraw.Draw(canvas)
    font = get_font(max(13, int(band_h / 24)))
    margin = 10
    max_w = band_w - margin * 2

    try:
        import easyocr  # noqa: WPS433
        reader = getattr(render_typed_lines, "_reader", None)
        if reader is None:
            reader = easyocr.Reader(["en"], gpu=False, verbose=False)
            render_typed_lines._reader = reader
        ocr_img = prep
        if band_w > 900:
            ocr_img = np.array(
                Image.fromarray(prep).resize((900, max(80, int(band_h * 900 / band_w))), Image.LANCZOS)
            )
        results = reader.readtext(ocr_img, paragraph=False, detail=1)
        inv = 255 - ocr_img
        results += reader.readtext(inv, paragraph=False, detail=1)
        rows = {}
        for _box, txt, conf in results:
            t = str(txt).strip()
            if conf < min_conf or len(t) < 2:
                continue
            row = int(_box[0][1]) // max(14, font.size)
            rows.setdefault(row, []).append((int(_box[0][0]), t))
        if rows:
            y_cursor = 6
            for row in sorted(rows):
                line = " ".join(t for _, t in sorted(rows[row]))
                for ln in wrap_text(draw, line, font, max_w):
                    draw.text((margin, y_cursor), ln, fill=tuple(TEXT_COLOR), font=font)
                    y_cursor += int(font.size * 1.4)
                if y_cursor > band_h - 8:
                    break
            if y_cursor > font.size * 1.5:
                return np.array(canvas)
    except ImportError:
        pass
    except Exception:
        pass
    return prep


def gentle_strip_figure(rgb):
    out = rgb.astype(np.float32).copy()
    wm = is_wm_pixel(out.astype(np.uint8))
    # only remove obvious watermark, never diagonal blanket
    L = lum(out)
    C = chroma(out)
    wm &= (L > 130) | is_blue_badge(out.astype(np.uint8))
    wm &= ~((L < 110) & (C < 40))  # keep dark figure ink
    out[wm] = 255.0
    return out.astype(np.uint8)


def recolor_figure_ink(rgb):
    arr = gentle_strip_figure(rgb)
    L = lum(arr)
    C = chroma(arr)
    wm = is_wm_pixel(arr) & (L > 125)
    bg = L > 248
    ink = (~bg) & (~wm) & (L < 220) & (C > 6)
    if ink.sum() < 40:
        return arr
    h, w = ink.shape
    out = np.full((*ink.shape, 3), 255, dtype=np.uint8)
    band = np.zeros((h, w), dtype=np.int32)
    band[ink & (L < 95)] = 0
    band[ink & (L >= 95) & (L < 145)] = 1
    band[ink & (L >= 145)] = 2
    yy, xx = np.mgrid[0:h, 0:w]
    xq = np.minimum(3, xx * 4 // max(w, 1))
    yq = np.minimum(2, yy * 3 // max(h, 1))
    color_idx = (band * 12 + xq * 3 + yq) % len(PALETTE)
    for i, c in enumerate(PALETTE):
        mask = ink & (color_idx == i)
        out[mask] = c
    textish = ink & (L >= 120) & (C < 40)
    out[textish] = [15, 118, 110]
    return out


def recolor_image_v2(path: Path, out_path: Path):
    raw = np.array(Image.open(path).convert("RGB"))
    h, w = raw.shape[:2]
    white_box = find_white_box(raw, h, w)
    split_y = text_split_y(raw, h, white_box)

    canvas = np.full_like(raw, 255)

    if white_box:
        x0, y0, x1, y1 = white_box
        canvas[:y0] = render_typed_lines(raw, 0, y0)
        fig_src = raw[y0:y1, x0:x1]
        fig_out = recolor_figure_ink(fig_src)
        canvas[y0:y1, x0:x1] = fig_out
    else:
        # text-only question image — recover full text, no multicolor blocks
        canvas[:, :] = render_typed_lines(raw, 0, h)

    rgb = Image.fromarray(canvas, "RGB")
    rgb = ImageEnhance.Contrast(rgb).enhance(1.05)
    rgb.save(out_path, "PNG", optimize=True)
    return True


def prepare_logo():
    im = Image.open(LOGO_SRC).convert("RGBA")
    arr = np.array(im, dtype=np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    L = (r + g + b) / 3.0
    alpha = a.copy()
    alpha[L < 18] = 0
    soft = (L >= 18) & (L < 42)
    alpha[soft] = np.minimum(alpha[soft], (L[soft] - 18) / 24 * 255)
    alpha[L >= 42] = np.maximum(alpha[L >= 42], 210)
    arr[..., 3] = alpha
    logo = Image.fromarray(arr.astype(np.uint8), "RGBA")
    logo.save(LOGO_WM, "PNG", optimize=True)
    return logo


def ink_mask(rgb):
    L = lum(rgb)
    C = chroma(rgb)
    return (~(L > 248)) & (L < 215) & (C > 8)


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


def download(cdn_url: str, dest: Path, retries=4):
    if dest.exists() and dest.stat().st_size > 200:
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    for i in range(retries):
        try:
            req = urllib.request.Request(cdn_url, headers={"User-Agent": "QuantrexIrodovBot/2.0"})
            with urllib.request.urlopen(req, timeout=45) as r:
                dest.write_bytes(r.read())
            if dest.stat().st_size > 100:
                return True
        except Exception as e:
            if i == retries - 1:
                print("download fail", cdn_url[:90], e)
            time.sleep(0.8 * (i + 1))
    return False


def process_figure(broken_url: str, logo, manifest_map, force=False):
    local = "/assets/diagrams/" + local_name(broken_url)
    cdn = normalize_url(broken_url)
    stem = Path(cdn.split("?")[0]).name
    src_file = SRC / f"{url_hash(broken_url)}_{stem}"
    if not src_file.exists():
        if not download(cdn, src_file):
            return None
    out = local_path(broken_url)
    recolor_image_v2(src_file, out)
    watermark_image(out, logo)
    manifest_map[broken_url] = local
    return local


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
    import sys
    force = "--force" in sys.argv
    manifest = load_manifest()
    url_map = dict(manifest.get("map", {}))
    urls = sorted(url_map.keys())
    if not urls:
        print("no urls in manifest")
        return
    print("irodov reprocess", len(urls), "force", force)
    logo = prepare_logo()
    ok = 0
    for i, broken in enumerate(urls, 1):
        local = process_figure(broken, logo, url_map, force=force)
        if local:
            ok += 1
        if i % 10 == 0:
            print(f"progress {i}/{len(urls)} ok={ok}")
    manifest["map"] = url_map
    manifest["version"] = 2
    save_manifest(manifest)
    update_overrides(url_map)
    print("reprocessed", ok)


if __name__ == "__main__":
    main()