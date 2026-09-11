#!/usr/bin/env python3
"""Peel leftover heavy overlay on Rank Booster locals still referenced after official remap."""
from pathlib import Path
import re
import numpy as np
from PIL import Image
import _clean_stamp_book_figs as C

ROOT = Path(r"C:\Users\Admin\qx-hosting")
RANK = ROOT / "data" / "books" / "chapters" / "68f1ce4cc729e5251bd00430"
OUT = ROOT / "assets" / "diagrams"
RX = re.compile(r"/assets/diagrams/(qx-book-[a-f0-9]{16}\.png)", re.I)


def peel(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    arr = np.asarray(rgba).copy()
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    chroma = mx - mn
    white = (lum >= 246) & (chroma < 18)
    ink = (chroma >= 58) | (lum <= 105)
    overlay = ~white & ~ink
    arr[overlay, 0] = 255
    arr[overlay, 1] = 255
    arr[overlay, 2] = 255
    arr[overlay, 3] = 255
    return Image.fromarray(arr, "RGBA")


def main():
    names = set()
    for fp in RANK.glob("*.json"):
        names.update(m.lower() for m in RX.findall(fp.read_text(encoding="utf-8", errors="ignore")))
    print("rank local unique", len(names), flush=True)
    n = 0
    for i, name in enumerate(sorted(names), 1):
        p = OUT / name
        if not p.exists():
            continue
        with Image.open(p) as im:
            cleaned = peel(im)
            stamped = C.stamp_quantrex(cleaned, opacity=0.18)
        stamped.convert("RGB").save(p, "PNG", optimize=True)
        n += 1
        if i % 100 == 0 or i == len(names):
            print(f"  peel {i}/{len(names)}", flush=True)
    print("peeled", n, flush=True)


if __name__ == "__main__":
    main()
