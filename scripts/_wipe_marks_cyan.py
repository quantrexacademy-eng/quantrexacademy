#!/usr/bin/env python3
"""Second pass: bleach only Marks cyan logo + grey MARKS letters.
Never touch dark chemistry ink or colorful fills.
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
    # Dark strokes stay
    dark = lum <= 125
    # Marks brand: pale cyan logo + grey wordmark (not red/green/orange chemistry)
    cyan = (b > r + 6) & (b > g + 2) & (lum > 125) & (lum < 238) & (chroma < 140)
    grey = (chroma < 30) & (lum > 140) & (lum < 225)
    marks = (cyan | grey) & ~dark
    arr[marks, 0] = 255
    arr[marks, 1] = 255
    arr[marks, 2] = 255
    arr[marks, 3] = 255
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
