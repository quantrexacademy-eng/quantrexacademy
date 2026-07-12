"""
Bake Quantrex Academy logo watermark into HC Verma EM Induction figures.
Preserves exact diagram layout; smart placement avoids ink overlap.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"E:\quantrexacademy")
OUT = ROOT / "assets" / "diagrams"
LOGO_SRC = ROOT / "assets" / "quantrex-academy-brand.png"
LOGO_WM = ROOT / "assets" / "quantrex-academy-brand-wm.png"

LOGO_SCALE = 0.22
LOGO_OPACITY = 0.20
FALLBACK_OPACITY = 0.17
DIAG_COVERAGE = 0.58
ROT_DEG = 35


def prepare_logo(path: Path, out: Path) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    arr = np.array(im, dtype=np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    lum = (r + g + b) / 3.0
    alpha = a.copy()
    alpha[lum < 22] = 0
    soft = (lum >= 22) & (lum < 50)
    alpha[soft] = np.minimum(alpha[soft], (lum[soft] - 22) / 28 * 255)
    arr[..., 3] = alpha
    logo = Image.fromarray(arr.astype(np.uint8), "RGBA")
    logo.save(out, "PNG", optimize=True)
    return logo


def ink_mask(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = (r.astype(np.float32) + g + b) / 3.0
    chroma = np.maximum.reduce([np.abs(r - g), np.abs(g - b), np.abs(r - b)])
    bg = lum > 248
    return (~bg) & (lum < 215) & (chroma > 8)


def grid_stats(mask: np.ndarray, cols: int, cols_y: int):
    h, w = mask.shape
    cells = []
    for ry in range(cols_y):
        for cx in range(cols):
            x0 = cx * w // cols
            x1 = (cx + 1) * w // cols
            y0 = ry * h // cols_y
            y1 = (ry + 1) * h // cols_y
            patch = mask[y0:y1, x0:x1]
            area = patch.size or 1
            ink_r = patch.sum() / area
            cells.append(
                {
                    "cx": cx,
                    "ry": ry,
                    "cx_mid": (x0 + x1) / 2 / w,
                    "cy_mid": (y0 + y1) / 2 / h,
                    "ink_r": ink_r,
                }
            )
    center = [c for c in cells if 4 <= c["cx"] <= 7 and 4 <= c["ry"] <= 7]
    center_ink = sum(c["ink_r"] for c in center) / max(len(center), 1)
    center_blank = 1 - center_ink
    best = min(cells, key=lambda c: c["ink_r"])
    corners = [c for c in cells if c["cx"] in (0, 1, 10, 11) and c["ry"] in (0, 1, 10, 11)]
    best_corner = min(corners, key=lambda c: c["ink_r"]) if corners else best
    dense = center_ink > 0.12
    return {
        "cells": cells,
        "center_ink": center_ink,
        "center_blank": center_blank,
        "best": best,
        "best_corner": best_corner,
        "dense": dense,
    }


def footprint_ink(mask, nx, ny, nfw, nfh):
    h, w = mask.shape
    lw = int(w * nfw)
    lh = int(h * nfh)
    x0 = max(0, int(nx * w - lw / 2))
    y0 = max(0, int(ny * h - lh / 2))
    x1 = min(w, x0 + lw)
    y1 = min(h, y0 + lh)
    patch = mask[y0:y1, x0:x1]
    return patch.sum() / max(patch.size, 1)


def resolve_placement(mask, logo_aspect: float, is_dense: bool):
    grid = grid_stats(mask, 12, 12)
    opacity = FALLBACK_OPACITY if is_dense else LOGO_OPACITY
    # Coaching-style: large center diagonal watermark (visible but not blocking).
    if grid["center_ink"] < 0.20:
        return 0.5, 0.5, LOGO_SCALE, opacity, True

    scale = LOGO_SCALE * (0.82 if is_dense else 1.0)
    max_ink = 0.055 if is_dense else 0.07
    candidates = []
    if grid["best"]["ink_r"] < 0.08:
        candidates.append((grid["best"]["cx_mid"], grid["best"]["cy_mid"], scale, opacity))
    if grid["best_corner"]["ink_r"] < 0.07:
        c = grid["best_corner"]
        candidates.append((c["cx_mid"], c["cy_mid"], scale * 0.9, opacity))

    for nx, ny, sc, op in candidates:
        if footprint_ink(mask, nx, ny, sc, sc * logo_aspect) <= max_ink:
            return nx, ny, sc, op, False

    return 0.5, 0.5, scale * 0.9, opacity, True


def paste_logo(base: Image.Image, logo: Image.Image, nx, ny, scale, opacity, diagonal):
    w, h = base.size
    if diagonal:
        diag = (w * w + h * h) ** 0.5
        lw = max(72, int(diag * DIAG_COVERAGE * 0.40))
    else:
        lw = max(36, int(w * scale))
    lh = max(36, int(lw * logo.height / logo.width))
    mark = logo.resize((lw, lh), Image.LANCZOS)
    if diagonal:
        mark = mark.rotate(ROT_DEG, expand=True, resample=Image.BICUBIC)
        lw, lh = mark.size

    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    x = int(nx * w - lw / 2)
    y = int(ny * h - lh / 2)
    alpha = mark.split()[3]
    alpha = alpha.point(lambda p: int(p * opacity))
    mark.putalpha(alpha)
    layer.paste(mark, (x, y), mark)
    return Image.alpha_composite(base.convert("RGBA"), layer).convert("RGB")


def watermark_figure(fig_path: Path, logo: Image.Image):
    base = Image.open(fig_path).convert("RGB")
    rgb = np.array(base)
    mask = ink_mask(rgb)
    aspect = logo.height / logo.width
    nx, ny, scale, opacity, diagonal = resolve_placement(mask, aspect, grid_stats(mask, 12, 12)["dense"])
    out = paste_logo(base, logo, nx, ny, scale, opacity, diagonal)
    out.save(fig_path, "PNG", optimize=True)
    mode = "diagonal" if diagonal else "placed"
    print(f"watermarked {fig_path.name} ({mode}, opacity={opacity:.2f})")


def main():
    logo = prepare_logo(LOGO_SRC, LOGO_WM)
    for i in range(1, 33):
        path = OUT / f"hcv-v2-em-induction-e{i}.png"
        if not path.exists():
            print("skip missing", path.name)
            continue
        watermark_figure(path, logo)
    legacy = OUT / "hcv-v2-em-induction-ex23-24-two-boys-rhombus.png"
    e3 = OUT / "hcv-v2-em-induction-e3.png"
    if e3.exists():
        import shutil
        shutil.copy2(e3, legacy)
    print("done")


if __name__ == "__main__":
    main()