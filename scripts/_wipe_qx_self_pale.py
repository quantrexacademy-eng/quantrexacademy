#!/usr/bin/env python3
"""Pale MARKS wipe on baked PYQ figures (qx-self). Same as revision formula notes.
Never touches dark ink (lum <= 180)."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(r"C:\Users\Admin\qx-hosting")
OUT = ROOT / "assets" / "diagrams"


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
    files = sorted(OUT.glob("qx-self-*.png"))
    print("files", len(files), flush=True)
    n = 0
    for i, p in enumerate(files, 1):
        try:
            with Image.open(p) as im:
                out = wipe(im)
            out.convert("RGB").save(p, "PNG", optimize=False, compress_level=3)
            n += 1
        except Exception as e:
            print("fail", p.name, e, flush=True)
        if i % 400 == 0 or i == len(files):
            print(f"  {i}/{len(files)} wiped={n}", flush=True)
    print("done", n, flush=True)


if __name__ == "__main__":
    main()
