#!/usr/bin/env python3
"""Bleach the actual Marks logo: pale cyan (234,243,255) + near-white grey.
Never touch dark chemistry ink.
"""
from pathlib import Path
import re
import numpy as np
from PIL import Image

ROOT = Path(r"C:\Users\Admin\qx-hosting")
RANK = ROOT / "data" / "books" / "chapters" / "68f1ce4cc729e5251bd00430"
OUT = ROOT / "assets" / "diagrams"
RX = re.compile(r"/assets/diagrams/(qx-book-[a-f0-9]{16}\.png)", re.I)


def wipe(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    arr = np.asarray(rgba).copy()
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    chroma = mx - mn
    dark = lum <= 180
    pale_cyan = (b > r + 3) & (b > g) & (r > 200) & (b > 245) & (lum > 200) & (lum < 253)
    pale_grey = (chroma <= 5) & (lum > 215) & (lum < 248)
    marks = (pale_cyan | pale_grey) & ~dark
    # 1px dilate on marks only, still never eat dark ink
    h, w = marks.shape
    dil = marks.copy()
    dil[1:, :] |= marks[:-1, :]
    dil[:-1, :] |= marks[1:, :]
    dil[:, 1:] |= marks[:, :-1]
    dil[:, :-1] |= marks[:, 1:]
    dil = dil & ~dark
    arr[dil, 0] = 255
    arr[dil, 1] = 255
    arr[dil, 2] = 255
    arr[dil, 3] = 255
    return Image.fromarray(arr, "RGBA")


def main():
    names = set()
    for fp in RANK.glob("*.json"):
        names.update(m.lower() for m in RX.findall(fp.read_text(encoding="utf-8", errors="ignore")))
    n = 0
    for i, name in enumerate(sorted(names), 1):
        p = OUT / name
        if not p.exists():
            continue
        with Image.open(p) as im:
            out = wipe(im)
        out.convert("RGB").save(p, "PNG", optimize=True)
        n += 1
        if i % 200 == 0 or i == len(names):
            print(f"  {i}/{len(names)}", flush=True)
    print("wiped", n, flush=True)


if __name__ == "__main__":
    main()
