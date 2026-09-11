#!/usr/bin/env python3
"""Restore Rank Booster (and book) figures from official Marks/Quizrr URLs.
Only bleach Marks-style pale grey/blue watermark. Never drop academic ink or color fills.
Does not remap JSON srcs. Does not peel. Does not stamp over the figure.
"""
from __future__ import annotations

import hashlib
import json
import re
import ssl
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"C:\Users\Admin\qx-hosting")
OUT = ROOT / "assets" / "diagrams"
QID = ROOT / "data" / "qid_marks"
CHDIR = ROOT / "data" / "books" / "chapters"
RANK = CHDIR / "68f1ce4cc729e5251bd00430"
CTX = ssl.create_default_context()
URL_RX = re.compile(r"https?://(?:cdn-question-pool\.getmarks\.app|cdn\.quizrr\.in)[^\"'\\>\s]+", re.I)
LOCAL_RX = re.compile(r"/assets/diagrams/(qx-book-[a-f0-9]{16}\.png)", re.I)


def sha(u: str) -> str:
    return hashlib.sha1(u.encode("utf-8")).hexdigest()[:16]


def norm_url(u: str) -> str:
    s = str(u or "").replace("\\/", "/").rstrip("\\").split("?")[0].strip()
    return re.sub(r"\\+$", "", s)


def download(url: str, dest: Path) -> bool:
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


def wipe_marks_only(img: Image.Image) -> Image.Image:
    """Keep every academic pixel (dark ink + color fills). Bleach only pale Marks lettering/logo."""
    rgba = img.convert("RGBA")
    arr = np.asarray(rgba).copy()
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    a = arr[:, :, 3]
    t = a.astype(np.float32) / 255.0
    rr = np.round(r * t + 255 * (1 - t)).astype(np.int16)
    gg = np.round(g * t + 255 * (1 - t)).astype(np.int16)
    bb = np.round(b * t + 255 * (1 - t)).astype(np.int16)
    lum = 0.299 * rr + 0.587 * gg + 0.114 * bb
    mx = np.maximum(np.maximum(rr, gg), bb)
    mn = np.minimum(np.minimum(rr, gg), bb)
    chroma = mx - mn
    # Academic ink/fill — NEVER remove
    ink = (a >= 12) & ((lum <= 160) | (chroma >= 22))
    # Marks brand only: mid-grey letters / blue-grey logo, not colorful chemistry
    marks = ((chroma < 18) & (lum > 125) & (lum < 210)) | (
        (bb > rr + 10) & (bb > gg + 6) & (lum > 100) & (lum < 215) & (chroma < 70) & ~ink
    )
    # do not punch holes in real ink
    marks = marks & ~ink
    arr[:, :, 0] = np.clip(rr, 0, 255).astype(np.uint8)
    arr[:, :, 1] = np.clip(gg, 0, 255).astype(np.uint8)
    arr[:, :, 2] = np.clip(bb, 0, 255).astype(np.uint8)
    arr[:, :, 3] = 255
    arr[marks, 0] = 255
    arr[marks, 1] = 255
    arr[marks, 2] = 255
    return Image.fromarray(arr, "RGBA")


def collect_needed_hashes():
    need = set()
    for fp in RANK.glob("*.json"):
        for m in LOCAL_RX.findall(fp.read_text(encoding="utf-8", errors="ignore")):
            need.add(m.lower().replace("qx-book-", "").replace(".png", ""))
    return need


def collect_qid_urls():
    urls = {}
    for fp in QID.glob("*.json"):
        txt = fp.read_text(encoding="utf-8", errors="ignore")
        for u in URL_RX.findall(txt):
            u = norm_url(u)
            urls[sha(u)] = u
    return urls


def main():
    need = collect_needed_hashes()
    print("rank hashes", len(need), flush=True)
    qmap = collect_qid_urls()
    matched = [(h, qmap[h]) for h in need if h in qmap]
    print("restore from original url", len(matched), "no-url", len(need) - len(matched), flush=True)

    ok = fail = 0
    dests = []

    def one(item):
        h, u = item
        dest = OUT / f"qx-book-{h}.png"
        got = download(u, dest)
        return dest, got

    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = [pool.submit(one, it) for it in matched]
        done = 0
        for fut in as_completed(futs):
            dest, got = fut.result()
            done += 1
            if got:
                ok += 1
                dests.append(dest)
            else:
                fail += 1
            if done % 80 == 0 or done == len(matched):
                print(f"  dl {done}/{len(matched)} ok={ok} fail={fail}", flush=True)

    wiped = 0
    for i, dest in enumerate(dests, 1):
        try:
            with Image.open(dest) as im:
                out = wipe_marks_only(im)
            out.convert("RGB").save(dest, "PNG", optimize=True)
            wiped += 1
        except Exception as e:
            print("wipe fail", dest.name, e, flush=True)
        if i % 100 == 0 or i == len(dests):
            print(f"  wipe {i}/{len(dests)}", flush=True)

    # Gentle wipe only (no re-download) for remaining referenced files
    leftover = 0
    have = {p.name.lower() for p in dests}
    for h in need:
        name = f"qx-book-{h}.png"
        if name in have:
            continue
        p = OUT / name
        if not p.exists():
            continue
        try:
            with Image.open(p) as im:
                out = wipe_marks_only(im)
            out.convert("RGB").save(p, "PNG", optimize=True)
            leftover += 1
        except Exception:
            pass
    print(json.dumps({"matched": len(matched), "dlOk": ok, "dlFail": fail, "wiped": wiped, "gentleLeft": leftover}), flush=True)


if __name__ == "__main__":
    main()
