"""Bleach Marks/Quizrr logos from qx-org PNGs. Keep black ink + real atom color."""
from pathlib import Path
import sys

from PIL import Image
import numpy as np

ROOT = Path(r"C:\Users\Admin\qx-hosting")
ORG = ROOT / "assets" / "diagrams"
ONLY = sys.argv[1] if len(sys.argv) > 1 else ""


def clean_arr(arr):
    rgb = arr[..., :3].astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    blue = (b > r + 8) & (b > g + 4)
    ink = lum <= 148
    color_atom = (chroma >= 38) & (lum < 188) & ~((blue) & (lum > 125))
    core = ink | color_atom
    # 2px dilate so bond anti-alias stays
    h, w = core.shape
    dil = core.copy()
    for dy in (-2, -1, 0, 1, 2):
        for dx in (-2, -1, 0, 1, 2):
            if dx == 0 and dy == 0:
                continue
            ys = slice(max(0, dy), h + dy if dy < 0 else h)
            xs = slice(max(0, dx), w + dx if dx < 0 else w)
            src_y = slice(max(0, -dy), h - dy if dy > 0 else h)
            src_x = slice(max(0, -dx), w - dx if dx > 0 else w)
            dil[ys, xs] |= core[src_y, src_x]
    out = arr.copy()
    keep = dil
    # drop cyan/blue cast on kept ink (logo sitting on bonds)
    keep_idx = np.where(keep)
    rr, gg, bb = r[keep_idx], g[keep_idx], b[keep_idx]
    ll = lum[keep_idx]
    blu = (bb > rr + 8) & (bb > gg + 6) & (ll > 70)
    if np.any(blu):
        mx = np.maximum(rr[blu], gg[blu])
        bb[blu] = np.minimum(bb[blu], mx + 3)
        rr_k, gg_k, bb_k = rr.copy(), gg.copy(), bb.copy()
        rr_k[blu], gg_k[blu], bb_k[blu] = rr[blu], gg[blu], bb[blu]
        r[keep_idx], g[keep_idx], b[keep_idx] = rr_k, gg_k, bb_k
    out[..., 0] = np.where(keep, np.clip(r, 0, 255), 255)
    out[..., 1] = np.where(keep, np.clip(g, 0, 255), 255)
    out[..., 2] = np.where(keep, np.clip(b, 0, 255), 255)
    if out.shape[-1] == 4:
        out[..., 3] = 255
    return out.astype(np.uint8)


def clean_file(path):
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    out = clean_arr(arr)
    Image.fromarray(out, "RGBA").save(path, optimize=True)


def main():
    if ONLY:
        p = Path(ONLY)
        if not p.is_absolute():
            p = ORG / p
        clean_file(p)
        print("cleaned", p)
        return
    files = sorted(ORG.glob("qx-org-*.png"))
    n = 0
    for i, f in enumerate(files, 1):
        try:
            clean_file(f)
            n += 1
        except Exception as e:
            print("fail", f.name, e)
        if i % 200 == 0:
            print("...", i, "/", len(files))
    print("done", n, "/", len(files))


if __name__ == "__main__":
    main()
