# -*- coding: utf-8 -*-
"""
Rebuild JEE Advanced → Chemistry → Amines → Preparation and Properties of Amides
figures as clean local assets (no MARKS watermark), neat crop + padding.

Uses nuclear ink-preserve bleach (same as live proxy v15/v16), then wires
assets into data/qx_figure_overrides.json and patches data/banks/jee_advanced.json.

Usage:
  python scripts/rebuild_amides_figures.py
"""
from __future__ import annotations

import hashlib
import json
import re
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SCAN = ROOT / "scripts" / "_amides_figs.json"
OUT_DIR = ROOT / "assets" / "qx-figures" / "amides-prep"
SRC_DIR = ROOT / "assets" / "diagrams" / "amides-src"
MANIFEST = ROOT / "data" / "qx_amides_prep_figure_manifest.json"
OVERRIDES = ROOT / "data" / "qx_figure_overrides.json"
BANK = ROOT / "data" / "banks" / "jee_advanced.json"
PREFIX = "qx-amide"
CDN = "https://cdn-question-pool.getmarks.app/"


def fix_url(url: str) -> str:
    return re.sub(r"https?://\.app/", CDN, str(url or ""), flags=re.I)


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
            "User-Agent": "Mozilla/5.0 QuantrexAmidesRebuild/1.0",
            "Referer": "https://web.getmarks.app/",
            "Accept": "image/*,*/*",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            dest.write_bytes(r.read())
        return dest.stat().st_size > 80
    except Exception as e:
        print("  DL fail", fixed[-60:], e)
        return False


def nuclear_clean(im: Image.Image) -> Image.Image:
    """Keep true ink + strong colour; bleach MARKS gray haze to white."""
    im = im.convert("RGBA")
    a = np.asarray(im).astype(np.float32)
    r, g, b, al = a[:, :, 0], a[:, :, 1], a[:, :, 2], a[:, :, 3]
    t = al / 255.0
    rr = r * t + 255 * (1 - t)
    gg = g * t + 255 * (1 - t)
    bb = b * t + 255 * (1 - t)
    lum = 0.299 * rr + 0.587 * gg + 0.114 * bb
    chroma = np.maximum(np.maximum(rr, gg), bb) - np.minimum(np.minimum(rr, gg), bb)
    ink_max = 72.0
    chroma_ink = 55.0
    ink = (lum <= ink_max) | ((chroma >= chroma_ink) & (lum < 200))
    near = (np.abs(rr - gg) < 48) & (np.abs(gg - bb) < 52) & (np.abs(rr - bb) < 54)
    bleach = (~ink) & (
        ((lum > ink_max) & (near | (chroma < 50)))
        | ((lum > 95) & (chroma < 60))
    )
    out = np.stack([rr, gg, bb], axis=2)
    out[bleach] = 255
    # keep ink pixels as compositied RGB
    res = np.dstack([out, np.full_like(al, 255)]).astype(np.uint8)
    return Image.fromarray(res, "RGBA").convert("RGB")


def neat_layout(rgb: Image.Image, pad: int = 28) -> Image.Image:
    """Tight crop content + uniform white padding for exam-neat arrangement."""
    a = np.asarray(rgb)
    lum = 0.299 * a[:, :, 0] + 0.587 * a[:, :, 1] + 0.114 * a[:, :, 2]
    ys, xs = np.where(lum < 248)
    if len(xs) < 20:
        return rgb
    x0, x1 = max(0, int(xs.min()) - 4), min(rgb.width, int(xs.max()) + 5)
    y0, y1 = max(0, int(ys.min()) - 4), min(rgb.height, int(ys.max()) + 5)
    crop = rgb.crop((x0, y0, x1, y1))
    # pad
    w, h = crop.size
    canvas = Image.new("RGB", (w + pad * 2, h + pad * 2), (255, 255, 255))
    canvas.paste(crop, (pad, pad))
    # scale if tiny or huge for readable display
    mw, mh = canvas.size
    max_side = max(mw, mh)
    if max_side > 1400:
        scale = 1400 / max_side
        canvas = canvas.resize((int(mw * scale), int(mh * scale)), Image.Resampling.LANCZOS)
    elif max_side < 320:
        scale = 420 / max_side
        canvas = canvas.resize((int(mw * scale), int(mh * scale)), Image.Resampling.LANCZOS)
    return canvas


def process_one(url: str) -> dict | None:
    sid = short_id(url)
    fixed = fix_url(url)
    ext = Path(fixed.rsplit("?", 1)[0]).suffix.lower() or ".png"
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
        ext = ".png"
    src = SRC_DIR / f"{sid}{ext}"
    out = OUT_DIR / f"{PREFIX}-{sid}.png"
    print(f"  {sid} …")
    if not download(fixed, src):
        return None
    try:
        im = Image.open(src)
        cleaned = nuclear_clean(im)
        neat = neat_layout(cleaned)
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        neat.save(out, "PNG", optimize=True)
        base = fixed.rstrip("/").rsplit("/", 1)[-1]
        clean_path = f"/assets/qx-figures/amides-prep/{PREFIX}-{sid}.png"
        return {
            "id": sid,
            "url": fixed,
            "urlRx": re.escape(base),
            "clean": clean_path,
            "w": neat.width,
            "h": neat.height,
            "bytes": out.stat().st_size,
        }
    except Exception as e:
        print("  process fail", e)
        return None


def update_overrides(figures: list[dict]):
    ov = json.loads(OVERRIDES.read_text(encoding="utf-8")) if OVERRIDES.exists() else {"version": 1, "rules": []}
    rules = ov.get("rules") or []
    # drop previous amides-prep rules
    rules = [r for r in rules if "amides-prep" not in str(r.get("clean", ""))]
    for f in figures:
        rules.append({"urlRx": f["urlRx"], "clean": f["clean"]})
    ov["rules"] = rules
    ov["version"] = int(ov.get("version") or 1) + 1
    OVERRIDES.write_text(json.dumps(ov, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("overrides version", ov["version"], "amides rules", len(figures))


def patch_bank(figures: list[dict]):
    """Replace CDN srcs in bank HTML with local clean assets for Amides topic."""
    text = BANK.read_text(encoding="utf-8")
    n = 0
    for f in figures:
        # replace full URL and any remaining broken host form
        olds = [
            f["url"],
            f["url"].replace(CDN, "https://.app/"),
        ]
        for old in olds:
            if old in text:
                text = text.replace(old, f["clean"] + "?v=amide1")
                n += 1
    BANK.write_text(text, encoding="utf-8")
    print("bank replacements", n)


def main():
    if not SCAN.exists():
        raise SystemExit(f"Run node scripts/_scan_amides_topic.js first ({SCAN})")
    scan = json.loads(SCAN.read_text(encoding="utf-8"))
    urls = [fix_url(u["url"]) for u in scan.get("urls") or []]
    # unique preserve order
    seen = set()
    uniq = []
    for u in urls:
        if u not in seen:
            seen.add(u)
            uniq.append(u)
    print(f"Rebuilding {len(uniq)} Amides figures → {OUT_DIR}")
    SRC_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    figures = []
    fail = 0
    for i, url in enumerate(uniq, 1):
        print(f"[{i}/{len(uniq)}]")
        r = process_one(url)
        if r:
            figures.append(r)
        else:
            fail += 1

    man = {
        "topic": "Preparation and Properties of Amides",
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
    return 0 if figures else 1


if __name__ == "__main__":
    raise SystemExit(main())
