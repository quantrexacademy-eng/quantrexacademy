# -*- coding: utf-8 -*-
"""
Rebuild ALL JEE Advanced Chemistry → Amines figures as sharp, clear local assets.

Fixes:
  - previous nuclear pass sometimes wiped faint bonds (blank/dotty figures)
  - residual MARKS haze on mid-gray
  - only Amides topic was local; other Amines topics still CDN

Usage:
  python scripts/rebuild_amines_figures.py
"""
from __future__ import annotations

import hashlib
import json
import re
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
BANK = ROOT / "data" / "banks" / "jee_advanced.json"
OUT_DIR = ROOT / "assets" / "qx-figures" / "amines-adv"
SRC_DIR = ROOT / "assets" / "diagrams" / "amines-adv-src"
MANIFEST = ROOT / "data" / "qx_amines_adv_figure_manifest.json"
OVERRIDES = ROOT / "data" / "qx_figure_overrides.json"
PREFIX = "qx-amine"
CDN = "https://cdn-question-pool.getmarks.app/"
# also migrate previous amides pack paths if re-running
OLD_LOCAL_RX = re.compile(
    r"/assets/qx-figures/(?:amides-prep|amines-adv)/qx-(?:amide|amine)-[a-f0-9]{12}\.png(?:\?[^\"'\\s>]*)?",
    re.I,
)


def fix_url(url: str) -> str:
    u = str(url or "")
    u = re.sub(r"https?://\.app/", CDN, u, flags=re.I)
    return u


def short_id(url: str) -> str:
    return hashlib.sha1(fix_url(url).encode("utf-8")).hexdigest()[:12]


def download(url: str, dest: Path) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 80:
        return True
    fixed = fix_url(url)
    req = urllib.request.Request(
        fixed,
        headers={
            "User-Agent": "Mozilla/5.0 QuantrexAminesRebuild/2.0",
            "Referer": "https://web.getmarks.app/",
            "Accept": "image/*,*/*",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=50) as r:
            dest.write_bytes(r.read())
        return dest.stat().st_size > 80
    except Exception as e:
        print("  DL fail", e)
        return False


def sharp_clean(im: Image.Image) -> Image.Image:
    """
    High-clarity exam line-art:
      1) 2× upscale for thin bonds
      2) dark structure → pure black (ink mask + dilate for AA)
      3) mid-gray watermark / haze → pure white
      4) never leave pale washed ink
    """
    # work in RGB after alpha flatten
    im = im.convert("RGBA")
    # mild denoise
    im = im.filter(ImageFilter.MedianFilter(size=3))
    # upscale for clarity
    w, h = im.size
    scale = 2 if max(w, h) < 900 else 1
    if scale > 1:
        im = im.resize((w * scale, h * scale), Image.Resampling.LANCZOS)

    a = np.asarray(im).astype(np.float32)
    r, g, b, al = a[:, :, 0], a[:, :, 1], a[:, :, 2], a[:, :, 3]
    t = np.clip(al / 255.0, 0, 1)
    rr = r * t + 255 * (1 - t)
    gg = g * t + 255 * (1 - t)
    bb = b * t + 255 * (1 - t)
    lum = 0.299 * rr + 0.587 * gg + 0.114 * bb
    chroma = np.maximum(np.maximum(rr, gg), bb) - np.minimum(np.minimum(rr, gg), bb)

    H, W = lum.shape
    # Core ink: dark OR strong color (bonds, text, rings)
    # Use slightly softer threshold so faint hand-drawn lines survive
    ink = (lum <= 118) | ((chroma >= 42) & (lum < 200))
    # protect AA: dilate ink 1px then 1 more for very thin strokes
    ink_u8 = ink.astype(np.uint8)
    dil = ink_u8.copy()
    for _ in range(2):
        pad = np.pad(dil, 1, mode="constant")
        m = pad[1:-1, 1:-1].copy()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy == 0 and dx == 0:
                    continue
                m = np.maximum(m, pad[1 + dy : H + 1 + dy, 1 + dx : W + 1 + dx])
        dil = m
    ink_dil = dil.astype(bool)

    # Watermark: mid-pale gray, low chroma, NOT on ink core
    near_gray = (np.abs(rr - gg) < 50) & (np.abs(gg - bb) < 54) & (np.abs(rr - bb) < 56)
    wm = (~ink) & near_gray & (lum > 125) & (lum < 245) & (chroma < 48)

    out = np.full((H, W, 3), 255, dtype=np.uint8)
    # pure black structure (including AA ring around ink)
    out[ink_dil] = 0
    # force watermark pixels white even if dilate touched them lightly
    # but keep true ink core black
    out[wm & (~ink)] = 255

    # Final binary tighten: any remaining mid-gray → white (clarity)
    gray = out.mean(axis=2)
    out[gray > 40] = 255
    out[gray <= 40] = 0

    rgb = Image.fromarray(out, "RGB")
    # morphological close to reconnect broken bonds (3x3 max then min)
    arr = np.asarray(rgb)
    inv = 255 - arr  # ink white for morphology on dark
    pad = np.pad(inv[:, :, 0], 1, mode="edge")
    dil2 = np.zeros_like(inv[:, :, 0])
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            dil2 = np.maximum(dil2, pad[1 + dy : H + 1 + dy, 1 + dx : W + 1 + dx])
    pad2 = np.pad(dil2, 1, mode="edge")
    clo = np.full_like(dil2, 255)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            clo = np.minimum(clo, pad2[1 + dy : H + 1 + dy, 1 + dx : W + 1 + dx])
    final = np.stack([255 - clo] * 3, axis=2).astype(np.uint8)
    return Image.fromarray(final, "RGB")


def neat_layout(rgb: Image.Image, pad: int = 32) -> Image.Image:
    a = np.asarray(rgb)
    lum = a.mean(axis=2)
    ys, xs = np.where(lum < 250)
    if len(xs) < 30:
        return rgb
    x0 = max(0, int(xs.min()) - 6)
    x1 = min(rgb.width, int(xs.max()) + 7)
    y0 = max(0, int(ys.min()) - 6)
    y1 = min(rgb.height, int(ys.max()) + 7)
    crop = rgb.crop((x0, y0, x1, y1))
    w, h = crop.size
    canvas = Image.new("RGB", (w + pad * 2, h + pad * 2), (255, 255, 255))
    canvas.paste(crop, (pad, pad))
    # readable display size
    mw, mh = canvas.size
    max_side = max(mw, mh)
    if max_side > 1600:
        s = 1600 / max_side
        canvas = canvas.resize((int(mw * s), int(mh * s)), Image.Resampling.LANCZOS)
        # re-binarize after resize
        arr = np.asarray(canvas)
        g = arr.mean(axis=2)
        out = np.where(g < 160, 0, 255).astype(np.uint8)
        canvas = Image.fromarray(np.stack([out] * 3, axis=2), "RGB")
    elif max_side < 360:
        s = 480 / max_side
        canvas = canvas.resize((max(1, int(mw * s)), max(1, int(mh * s))), Image.Resampling.NEAREST)
    return canvas


def ink_ratio(im: Image.Image) -> float:
    a = np.asarray(im.convert("L"))
    return float((a < 200).sum()) / float(a.size)


def process_one(url: str) -> dict | None:
    sid = short_id(url)
    fixed = fix_url(url)
    ext = Path(fixed.rsplit("?", 1)[0]).suffix.lower() or ".png"
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
        ext = ".png"
    src = SRC_DIR / f"{sid}{ext}"
    out = OUT_DIR / f"{PREFIX}-{sid}.png"
    print(f"  {sid}")
    if not download(fixed, src):
        return None
    try:
        raw = Image.open(src)
        src_ink = ink_ratio(raw)
        cleaned = sharp_clean(raw)
        neat = neat_layout(cleaned)
        out_ink = ink_ratio(neat)
        # Safety: if we destroyed the figure, fall back to softer clean
        if src_ink > 0.004 and out_ink < src_ink * 0.15:
            print("    soft-fallback (ink wiped)")
            a = np.asarray(raw.convert("RGBA")).astype(np.float32)
            r, g, b, al = a[:, :, 0], a[:, :, 1], a[:, :, 2], a[:, :, 3]
            t = al / 255.0
            rr, gg, bb = r * t + 255 * (1 - t), g * t + 255 * (1 - t), b * t + 255 * (1 - t)
            lum = 0.299 * rr + 0.587 * gg + 0.114 * bb
            chroma = np.maximum(np.maximum(rr, gg), bb) - np.minimum(np.minimum(rr, gg), bb)
            ink = (lum < 165) | ((chroma > 35) & (lum < 210))
            out_arr = np.full((*lum.shape, 3), 255, dtype=np.uint8)
            out_arr[ink] = 0
            neat = neat_layout(Image.fromarray(out_arr, "RGB"))
            out_ink = ink_ratio(neat)
        if out_ink < 0.0008:
            print("    FAIL nearly blank")
            return None
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        neat.save(out, "PNG", optimize=True)
        base = fixed.rstrip("/").rsplit("/", 1)[-1]
        clean_path = f"/assets/qx-figures/amines-adv/{PREFIX}-{sid}.png"
        return {
            "id": sid,
            "url": fixed,
            "urlRx": re.escape(base),
            "clean": clean_path,
            "w": neat.width,
            "h": neat.height,
            "bytes": out.stat().st_size,
            "ink": round(out_ink, 5),
        }
    except Exception as e:
        print("  process fail", e)
        return None


def collect_urls() -> list[str]:
    j = json.loads(BANK.read_text(encoding="utf-8"))
    qs = [
        q
        for q in j.get("questions") or []
        if str(q.get("subject", "")).lower() == "chemistry"
        and str(q.get("chapter", "")).lower() == "amines"
    ]
    re_url = re.compile(r"https?://[^\"'\\\s>]+\.(?:png|jpg|jpeg|webp)", re.I)
    urls: list[str] = []
    seen = set()
    for q in qs:
        blob = " ".join(
            [
                str(q.get("q") or ""),
                str(q.get("solution") or ""),
                *[str(o) for o in (q.get("options") or [])],
            ]
        )
        for m in re_url.finditer(blob):
            u = fix_url(m.group(0))
            # skip already-local
            if "/assets/" in u:
                continue
            if u not in seen:
                seen.add(u)
                urls.append(u)
        # also recover CDN basename from old local maps via scan of amides pack if needed
    # include previous amides src CDN from scan file
    scan = ROOT / "scripts" / "_amides_figs.json"
    if scan.exists():
        data = json.loads(scan.read_text(encoding="utf-8"))
        for item in data.get("urls") or []:
            u = fix_url(item.get("url") or "")
            if u and u not in seen and "cdn-question-pool" in u:
                seen.add(u)
                urls.append(u)
    return urls


def update_overrides(figures: list[dict]):
    ov = json.loads(OVERRIDES.read_text(encoding="utf-8")) if OVERRIDES.exists() else {"version": 1, "rules": []}
    rules = [
        r
        for r in (ov.get("rules") or [])
        if "amides-prep" not in str(r.get("clean", "")) and "amines-adv" not in str(r.get("clean", ""))
    ]
    for f in figures:
        rules.append({"urlRx": f["urlRx"], "clean": f["clean"]})
    ov["rules"] = rules
    ov["version"] = int(ov.get("version") or 1) + 1
    OVERRIDES.write_text(json.dumps(ov, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("overrides", ov["version"], "amine rules", len(figures))


def patch_bank(figures: list[dict]):
    text = BANK.read_text(encoding="utf-8")
    n = 0
    # map old amides-prep paths to new if same hash suffix
    for f in figures:
        olds = [
            f["url"],
            f["url"].replace(CDN, "https://.app/"),
            f"/assets/qx-figures/amides-prep/qx-amide-{f['id']}.png?v=amide1",
            f"/assets/qx-figures/amides-prep/qx-amide-{f['id']}.png",
        ]
        new = f["clean"] + "?v=amine2"
        for old in olds:
            if old in text:
                text = text.replace(old, new)
                n += 1
    BANK.write_text(text, encoding="utf-8")
    print("bank replacements", n)


def main():
    urls = collect_urls()
    print(f"Amines chapter unique CDN figures: {len(urls)}")
    SRC_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    figures = []
    fail = 0
    for i, url in enumerate(urls, 1):
        print(f"[{i}/{len(urls)}]")
        r = process_one(url)
        if r:
            figures.append(r)
        else:
            fail += 1
    man = {
        "topic": "Amines (all topics)",
        "exam": "jee_advanced",
        "chapter": "Amines",
        "count": len(figures),
        "figures": figures,
    }
    MANIFEST.write_text(json.dumps(man, indent=2, ensure_ascii=False), encoding="utf-8")
    if figures:
        update_overrides(figures)
        patch_bank(figures)
    print("DONE ok", len(figures), "fail", fail)
    # quality report
    bad = [f for f in figures if f.get("ink", 0) < 0.002]
    print("low-ink figures", len(bad))
    return 0 if figures else 1


if __name__ == "__main__":
    raise SystemExit(main())
