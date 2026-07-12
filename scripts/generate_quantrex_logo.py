#!/usr/bin/env python3
"""Generate quantrex-academy-watermark.png from SVG specs using Pillow."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "quantrex-academy-brand.png"
W, H = 640, 800


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def grad_color(t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    return (
        int(lerp(0x1E, 0xFF, t)),
        int(lerp(0x4F, 0x7A, t)),
        int(lerp(0xFF, 0x00, t)),
    )


def silver(t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    stops = [(0.0, (248, 250, 252)), (0.35, (203, 213, 225)), (0.65, (148, 163, 184)), (1.0, (226, 232, 240))]
    for i in range(len(stops) - 1):
        a, ca = stops[i]
        b, cb = stops[i + 1]
        if a <= t <= b:
            u = (t - a) / (b - a) if b > a else 0
            return tuple(int(lerp(ca[j], cb[j], u)) for j in range(3))
    return stops[-1][1]


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/Kanit-Bold.ttf" if bold else "C:/Windows/Fonts/Kanit-Regular.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        p = Path(path)
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def draw_orbit(draw: ImageDraw.ImageDraw, cx: int, cy: int) -> None:
    for i in range(360):
        ang = math.radians(i - 28)
        t = i / 360.0
        col = grad_color(t)
        rx, ry = 210, 78
        x = cx + int(rx * math.cos(ang))
        y = cy + int(ry * math.sin(ang))
        draw.ellipse((x - 9, y - 9, x + 9, y + 9), fill=col + (255,))
    for i in range(360):
        ang = math.radians(i + 18)
        t = (i / 360.0 + 0.15) % 1.0
        col = grad_color(t)
        rx, ry = 168, 58
        x = cx + int(rx * math.cos(ang))
        y = cy + int(ry * math.sin(ang))
        draw.ellipse((x - 4, y - 4, x + 4, y + 4), fill=col + (140,))


def draw_gradient_text(img: Image.Image, text: str, xy: tuple[int, int], size: int, spacing: int = 0) -> None:
    font = load_font(size, bold=True)
    tmp = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    tdraw = ImageDraw.Draw(tmp)
    tdraw.text(xy, text, font=font, fill=(255, 255, 255, 255), spacing=spacing, anchor="mm")
    bbox = tmp.getbbox()
    if not bbox:
        return
    grad = Image.new("RGBA", (bbox[2] - bbox[0], bbox[3] - bbox[1]), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(grad)
    gw = grad.width
    for x in range(gw):
        col = grad_color(x / max(gw - 1, 1))
        gdraw.line([(x, 0), (x, grad.height)], fill=col + (255,))
    mask = tmp.crop(bbox)
    colored = Image.new("RGBA", grad.size, (0, 0, 0, 0))
    colored.paste(grad, mask=mask.split()[-1])
    img.alpha_composite(colored, (bbox[0], bbox[1]))


def main() -> None:
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    draw_orbit(draw, 320, 250)

    q_font = load_font(280, bold=True)
    q_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    qdraw = ImageDraw.Draw(q_layer)
    for dx in range(-2, 3):
        for dy in range(-2, 3):
            shade = silver(0.5 + (dx + dy) * 0.05)
            qdraw.text((320 + dx, 252 + dy), "Q", font=q_font, fill=shade + (255,), anchor="mm")
    img.alpha_composite(q_layer)

    draw_gradient_text(img, "QUANTREX", (320, 430), 72, spacing=6)
    acad_font = load_font(44, bold=True)
    draw = ImageDraw.Draw(img)
    draw.text((320, 500), "ACADEMY", font=acad_font, fill=(17, 24, 39, 255), anchor="mm", spacing=18)

    draw.rounded_rectangle((70, 568, 320, 612), radius=6, fill=(30, 79, 255, 255))
    draw.rounded_rectangle((320, 568, 470, 612), radius=6, fill=(255, 122, 0, 255))
    tag_font = load_font(22, bold=True)
    draw.text((195, 590), "CONCEPTS CREATE", font=tag_font, fill=(255, 255, 255, 255), anchor="mm")
    draw.text((395, 590), "DESTINY", font=tag_font, fill=(255, 255, 255, 255), anchor="mm")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()