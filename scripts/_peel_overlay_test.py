#!/usr/bin/env python3
"""Peel leftover heavy overlay from Rank Booster locals that have no original URL."""
from pathlib import Path
import numpy as np
from PIL import Image
import _clean_stamp_book_figs as C

ROOT = Path(r"C:\Users\Admin\qx-hosting")
OUT = ROOT / "assets" / "diagrams"
TEST = ROOT / "data" / "_migration" / "_wm_test"
TEST.mkdir(parents=True, exist_ok=True)

SAMPLES = [
    "qx-book-6775bff4b335d00f.png",
    "qx-book-d88d9414cf5a46f7.png",
    "qx-book-78fb53e857a16110.png",
]


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


for name in SAMPLES:
    src = OUT / name
    with Image.open(src) as im:
        cleaned = peel(im)
        stamped = C.stamp_quantrex(cleaned, opacity=0.18)
    stamped.convert("RGB").save(TEST / name, "PNG")
    print("wrote", TEST / name)
