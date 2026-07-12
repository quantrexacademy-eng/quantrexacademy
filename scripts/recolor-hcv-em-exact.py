"""
HC Verma Vol2 EM Induction — exact original layout, multicolor ink, no watermark.
"""
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance

ROOT = Path(r"E:\quantrexacademy")
SRC = ROOT / "assets" / "diagrams" / "hcv-em-induction-src"
OUT = ROOT / "assets" / "diagrams"
CDN = "https://cdn.quizrr.in/question-assets/resources/physics/hcv/chapter_38_electromagnetic_induction_figure_38_{id}.png"

PALETTE = [
    [37, 99, 235],    # blue
    [220, 38, 38],    # red
    [15, 118, 110],   # teal
    [124, 58, 237],   # purple
    [234, 88, 12],    # orange
    [22, 163, 74],    # green
    [219, 39, 119],   # pink
    [202, 138, 4],    # amber
]


def download_missing():
    SRC.mkdir(parents=True, exist_ok=True)
    for i in range(1, 33):
        fid = f"e{i}"
        name = f"chapter_38_electromagnetic_induction_figure_38_{fid}.png"
        dest = SRC / name
        if dest.exists():
            continue
        try:
            urllib.request.urlretrieve(CDN.format(id=fid), dest)
            print("downloaded", fid)
        except Exception as e:
            print("skip", fid, e)


def process_image(path: Path, out_path: Path):
    arr = np.array(Image.open(path).convert("RGBA"), dtype=np.int16)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    lum = (r + g + b) / 3.0
    chroma = np.maximum.reduce([np.abs(r - g), np.abs(g - b), np.abs(r - b)])

    wm = (
        ((b > r + 12) & (b > g + 4) & (lum > 155))
        | ((lum > 165) & (lum < 235) & (chroma < 28))
    )
    bg = (lum > 248) | (a < 10)
    ink = (~bg) & (~wm) & (lum < 215)

    out = np.full(arr.shape, 255, dtype=np.uint8)
    out[..., 3] = 255

    h, w = ink.shape
    band = np.zeros((h, w), dtype=np.int32)
    band[ink & (lum < 95)] = 0
    band[ink & (lum >= 95) & (lum < 145)] = 1
    band[ink & (lum >= 145)] = 2

    yy, xx = np.mgrid[0:h, 0:w]
    xq = np.minimum(3, xx * 4 // max(w, 1))
    yq = np.minimum(2, yy * 3 // max(h, 1))
    color_idx = (band * 12 + xq * 3 + yq) % len(PALETTE)

    for i, rgb in enumerate(PALETTE):
        mask = ink & (color_idx == i)
        out[mask] = [rgb[0], rgb[1], rgb[2], 255]

    textish = ink & (lum >= 130) & (chroma < 35)
    out[textish] = [15, 118, 110, 255]

    result = Image.fromarray(out, "RGBA")
    rgb = Image.new("RGB", result.size, (255, 255, 255))
    rgb.paste(result, mask=result.split()[3])
    rgb = ImageEnhance.Contrast(rgb).enhance(1.06)
    rgb = ImageEnhance.Color(rgb).enhance(1.15)
    rgb.save(out_path, "PNG", optimize=True)
    print("wrote", out_path.name)


def main():
    download_missing()
    for i in range(1, 33):
        fid = f"e{i}"
        src = SRC / f"chapter_38_electromagnetic_induction_figure_38_{fid}.png"
        if not src.exists():
            print("missing", fid)
            continue
        process_image(src, OUT / f"hcv-v2-em-induction-{fid}.png")
    e3 = OUT / "hcv-v2-em-induction-e3.png"
    legacy = OUT / "hcv-v2-em-induction-ex23-24-two-boys-rhombus.png"
    if e3.exists():
        import shutil
        shutil.copy2(e3, legacy)
    import subprocess
    wm_script = ROOT / "scripts" / "watermark-hcv-em-figures.py"
    if wm_script.exists():
        subprocess.run(["python", str(wm_script)], check=False)
    print("done")


if __name__ == "__main__":
    main()