#!/usr/bin/env python3
"""Bake leftover Marks CDN book figures locally, wipe Marks/coaching haze,
and apply a light Quantrex watermark. Never invents academic ink.
"""
from __future__ import annotations

import hashlib
import json
import re
import ssl
import time
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"C:\Users\Admin\qx-hosting")
CHDIR = ROOT / "data" / "books" / "chapters"
OUT = ROOT / "assets" / "diagrams"
WM_PATH = ROOT / "assets" / "quantrex-fig-wm-organic.png"
RANK = "68f1ce4cc729e5251bd00430"
CTX = ssl.create_default_context()
URL_RX = re.compile(r"https?://(?:cdn-question-pool\.getmarks\.app|cdn\.quizrr\.in)[^\"'\\>\s]+", re.I)
LOCAL_RX = re.compile(r"/assets/diagrams/(qx-book-[a-f0-9]{16}\.png)", re.I)

SLEEP = 0.0


def sha(u: str) -> str:
    return hashlib.sha1(u.encode("utf-8")).hexdigest()[:16]


def norm_url(u: str) -> str:
    s = str(u or "").replace("\\/", "/").rstrip("\\").split("?")[0].strip()
    s = re.sub(r"\\+$", "", s)
    return s


def collect_book_urls():
    by_book = defaultdict(set)
    local_by_book = defaultdict(set)
    for d in sorted(p for p in CHDIR.iterdir() if p.is_dir()):
        for fp in d.glob("*.json"):
            txt = fp.read_text(encoding="utf-8", errors="ignore")
            for u in URL_RX.findall(txt):
                by_book[d.name].add(norm_url(u))
            for m in LOCAL_RX.findall(txt):
                local_by_book[d.name].add(m.lower())
    return by_book, local_by_book


def download(url: str, dest: Path) -> bool:
    if dest.exists() and dest.stat().st_size > 80:
        return True
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "image/*,*/*;q=0.8",
            "Referer": "https://web.getmarks.app/",
            "Origin": "https://web.getmarks.app",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            buf = r.read()
        if len(buf) < 80:
            return False
        dest.write_bytes(buf)
        return True
    except Exception:
        return False


def wipe_marks(img: Image.Image) -> Image.Image:
    """Keep dark/color academic ink; bleach pale grey/blue Marks (and similar coaching haze)."""
    rgba = img.convert("RGBA")
    arr = np.asarray(rgba).copy()
    r, g, b, a = arr[:, :, 0].astype(np.int16), arr[:, :, 1].astype(np.int16), arr[:, :, 2].astype(np.int16), arr[:, :, 3]
    t = a.astype(np.float32) / 255.0
    rr = np.round(r * t + 255 * (1 - t)).astype(np.int16)
    gg = np.round(g * t + 255 * (1 - t)).astype(np.int16)
    bb = np.round(b * t + 255 * (1 - t)).astype(np.int16)
    lum = 0.299 * rr + 0.587 * gg + 0.114 * bb
    mx = np.maximum(np.maximum(rr, gg), bb)
    mn = np.minimum(np.minimum(rr, gg), bb)
    chroma = mx - mn
    ink = (a >= 12) & ((lum <= 132) | ((chroma >= 30) & (lum < 236)))
    # drop mid-gray Marks lettering and blue-gray logo from ink
    marks_letter = (chroma < 22) & (lum > 118) & (lum < 218)
    marks_blue = (bb > rr + 8) & (bb > gg + 4) & (lum > 85) & (lum < 228) & (chroma < 100)
    ink = ink & ~marks_letter & ~marks_blue

    h, w = ink.shape
    core = ink
    # 2px dilate
    dil = core.copy()
    for dy in (-2, -1, 0, 1, 2):
        for dx in (-2, -1, 0, 1, 2):
            if dx == 0 and dy == 0:
                continue
            shifted = np.zeros_like(core)
            y0, y1 = max(0, dy), h + min(0, dy)
            x0, x1 = max(0, dx), w + min(0, dx)
            shifted[y0:y1, x0:x1] = core[y0 - dy : y1 - dy, x0 - dx : x1 - dx]
            dil |= shifted

    out = np.empty_like(arr)
    out[:, :, 0] = 255
    out[:, :, 1] = 255
    out[:, :, 2] = 255
    out[:, :, 3] = 255
    # keep ink pixels (de-blue Marks tint on ink)
    keep = dil
    ink_bb = bb.copy()
    tint = (bb > rr + 8) & (bb > gg + 6) & (lum > 70)
    mx2 = np.maximum(rr, gg)
    ink_bb = np.where(tint & (bb > mx2 + 3), mx2 + 3, ink_bb)
    out[keep, 0] = np.clip(rr[keep], 0, 255).astype(np.uint8)
    out[keep, 1] = np.clip(gg[keep], 0, 255).astype(np.uint8)
    out[keep, 2] = np.clip(ink_bb[keep], 0, 255).astype(np.uint8)
    out[keep, 3] = 255
    return Image.fromarray(out, "RGBA")


_WM = None


def stamp_quantrex(img: Image.Image, opacity: float = 0.20) -> Image.Image:
    global _WM
    if _WM is None:
        _WM = Image.open(WM_PATH).convert("RGBA")
    base = img.convert("RGBA")
    w, h = base.size
    if w < 48 or h < 48:
        return base
    side = max(48, int(min(w, h) * 0.46))
    wm = _WM.copy()
    wm.thumbnail((side, side), Image.Resampling.LANCZOS)
    # fade alpha
    a = np.asarray(wm.split()[-1]).astype(np.float32) * opacity
    bands = list(wm.split())
    bands[-1] = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "L")
    wm = Image.merge("RGBA", bands)
    layer = Image.new("RGBA", base.size, (255, 255, 255, 0))
    x = (w - wm.size[0]) // 2
    y = (h - wm.size[1]) // 2
    layer.paste(wm, (x, y), wm)
    return Image.alpha_composite(base, layer)


def process_file(path: Path, stamp: bool) -> bool:
    try:
        with Image.open(path) as im:
            cleaned = wipe_marks(im)
        if stamp:
            cleaned = stamp_quantrex(cleaned)
        cleaned.convert("RGB").save(path, "PNG", optimize=True)
        return True
    except Exception as e:
        print("proc fail", path.name, e, flush=True)
        return False


def rewrite_files(mapping: dict):
    rewritten = 0
    for d in CHDIR.iterdir():
        if not d.is_dir():
            continue
        for fp in d.glob("*.json"):
            txt = fp.read_text(encoding="utf-8", errors="ignore")
            orig = txt
            for u, loc in mapping.items():
                if u in txt:
                    txt = txt.replace(u, loc)
                esc = u.replace("/", "\\/")
                if esc in txt:
                    txt = txt.replace(esc, loc)
            if txt != orig:
                fp.write_text(txt, encoding="utf-8")
                rewritten += 1
    return rewritten


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    by_book, local_by_book = collect_book_urls()
    print("cdn leftover", {k: len(v) for k, v in sorted(by_book.items(), key=lambda kv: -len(kv[1]))}, flush=True)
    urls = sorted({u for s in by_book.values() for u in s if u})
    print("unique cdn", len(urls), "rank", len(by_book.get(RANK, ())), flush=True)

    mapping = {}
    ok = fail = 0
    dests = []

    def one(u):
        dest = OUT / f"qx-book-{sha(u)}.png"
        got = download(u, dest)
        return u, dest, got

    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = [pool.submit(one, u) for u in urls]
        done = 0
        for fut in as_completed(futs):
            u, dest, got = fut.result()
            done += 1
            if got:
                ok += 1
                mapping[u] = "/assets/diagrams/" + dest.name
                dests.append(dest)
            else:
                fail += 1
            if done % 80 == 0 or done == len(urls):
                print(f"  dl {done}/{len(urls)} ok={ok} fail={fail}", flush=True)

    print("clean+stamp downloaded", len(dests), flush=True)
    cleaned = stamped = 0
    for i, dest in enumerate(dests, 1):
        if process_file(dest, stamp=True):
            cleaned += 1
            stamped += 1
        if i % 100 == 0 or i == len(dests):
            print(f"  stamp {i}/{len(dests)}", flush=True)

    # Rank Booster existing local figs: wipe leftover Marks haze, keep/add light Quantrex
    rank_locals = []
    for name in local_by_book.get(RANK, ()):
        p = OUT / name
        if p.exists():
            rank_locals.append(p)
    # skip files we just stamped from CDN
    just = {p.resolve() for p in dests}
    rank_locals = [p for p in rank_locals if p.resolve() not in just]
    print("rank existing local", len(rank_locals), flush=True)
    for i, p in enumerate(rank_locals, 1):
        process_file(p, stamp=True)
        if i % 80 == 0 or i == len(rank_locals):
            print(f"  rank local {i}/{len(rank_locals)}", flush=True)

    rew = rewrite_files(mapping)
    print(json.dumps({
        "uniqueCdn": len(urls),
        "dlOk": ok,
        "dlFail": fail,
        "stampedNew": stamped,
        "rankLocal": len(rank_locals),
        "rewrittenFiles": rew,
        "rankCdnLeftBefore": len(by_book.get(RANK, ())),
    }, indent=2), flush=True)


if __name__ == "__main__":
    main()
