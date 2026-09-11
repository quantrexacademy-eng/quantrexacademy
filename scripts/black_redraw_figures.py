#!/usr/bin/env python3
"""
Site-wide: redraw multi-color question figures as pure BLACK line art.
Geometry stays EXACTLY the same — only ink becomes pure black on white.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"C:\Users\Admin\qx-hosting\assets\diagrams")
BACKUP = ROOT / "color-src-backup"
SKIP_DIRS = {"color-src-backup", "book-src", "org-src", "irodov-src", "hcv-em-induction-src", "hcv-obj-src"}


def to_black_ink(img: Image.Image) -> Image.Image:
    """Exact same geometry; multi-color lines → pure black, background → white."""
    rgba = img.convert("RGBA")
    arr = np.asarray(rgba).astype(np.float32)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]

    lum = 0.299 * r + 0.587 * g + 0.114 * b
    chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)

    # Background: near-white or transparent
    bg = ((lum >= 238) & (chroma < 22)) | (a < 10)

    # Ink score: dark OR colorful (rainbow borders → black)
    ink = np.clip((1.0 - lum / 255.0) * 1.55 + (chroma / 255.0) * 0.75, 0, 1)
    ink[bg] = 0

    # Bold solid black — anything with meaningful ink becomes #000
    mask = ink > 0.045

    out = np.empty_like(arr)
    out[:, :, 0] = 255
    out[:, :, 1] = 255
    out[:, :, 2] = 255
    out[:, :, 3] = 255

    # Pure black RGB; soft AA via alpha so edges stay clean
    out[mask, 0] = 0
    out[mask, 1] = 0
    out[mask, 2] = 0
    out[mask, 3] = np.clip(ink[mask] * 1.9 * 255.0, 70, 255)

    return Image.fromarray(out.astype(np.uint8), "RGBA")


def process_file(src: Path) -> bool:
    try:
        with Image.open(src) as im:
            # Skip already pure black+white tiny icons
            black = to_black_ink(im)
        black.save(src, "PNG", optimize=True)
        return True
    except Exception as e:
        print("FAIL", src, e)
        return False


def collect_files() -> list[Path]:
    files = []
    for p in ROOT.rglob("*.png"):
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        # Only top-level diagrams + known prefixes (skip nested src)
        if p.parent != ROOT and p.parent.name not in ("clean-diagrams",):
            # allow subfolders that are not src backups
            if "src" in p.parent.name.lower() or "backup" in p.parent.name.lower():
                continue
        files.append(p)
    # Prefer root-level figures first
    root_files = [f for f in files if f.parent == ROOT]
    return sorted(set(root_files))


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "--all"
    if mode == "--hcv":
        files = sorted(ROOT.glob("hcv-*.png"))
    elif mode == "--books":
        files = sorted(list(ROOT.glob("qx-book-*.png")) + list(ROOT.glob("qx-org-*.png")) + list(ROOT.glob("qx-irodov-*.png")))
    else:
        files = collect_files()

    if not files:
        print("No figures found")
        return 1

    BACKUP.mkdir(parents=True, exist_ok=True)
    ok = 0
    for i, f in enumerate(files, 1):
        bak = BACKUP / f.name
        # Only backup once (preserve original multi-color)
        if not bak.exists():
            try:
                shutil.copy2(f, bak)
            except Exception:
                pass
        if process_file(f):
            ok += 1
        if i % 100 == 0 or i == len(files):
            print(f"[{i}/{len(files)}] black ok={ok}", flush=True)

    print(f"DONE pure-black redraw {ok}/{len(files)} backup={BACKUP}", flush=True)
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
