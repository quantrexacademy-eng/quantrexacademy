#!/usr/bin/env python3
"""Permanently wipe Marks watermarks. Never eat academic ink (lum<=180).
No Quantrex stamp. Student site stays Marks-free.
"""
from __future__ import annotations

import json
import re
import ssl
import urllib.request
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(r"C:\Users\Admin\qx-hosting")
DIAG = ROOT / "assets" / "diagrams"
TEST = ROOT / "data" / "_migration" / "_wm_test"
IRO_MAN = ROOT / "data" / "qx_irodov_figure_manifest.json"
CTX = ssl.create_default_context()
UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
}


def load_rgb(path: Path) -> np.ndarray:
    im = Image.open(path).convert("RGBA")
    return np.asarray(im).copy()


def save_rgb(arr: np.ndarray, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr, "RGBA").convert("RGB").save(path, "PNG", optimize=True)


def channels(arr: np.ndarray):
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    a = arr[:, :, 3] if arr.shape[2] > 3 else np.full(r.shape, 255, np.uint8)
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    chroma = mx - mn
    return r, g, b, a, lum, chroma


def wipe_white_paper(arr: np.ndarray) -> np.ndarray:
    """Bleach Marks logo/ghost on white paper. Never touch lum<=180 ink."""
    r, g, b, a, lum, chroma = channels(arr)
    ink = lum <= 180
    pale_cyan = (b > r + 3) & (b > g) & (r > 200) & (b > 245) & (lum > 200) & (lum < 253)
    pale_grey = (chroma <= 18) & (lum > 168) & (lum < 252)
    marks_blue = (b > r + 10) & (b > g + 4) & (b > 145) & (lum > 165) & (chroma >= 12)
    mark = (pale_cyan | pale_grey | marks_blue) & ~ink & (a >= 10)
    # 1px dilate, still never ink
    dil = mark.copy()
    dil[1:, :] |= mark[:-1, :]
    dil[:-1, :] |= mark[1:, :]
    dil[:, 1:] |= mark[:, :-1]
    dil[:, :-1] |= mark[:, 1:]
    dil = dil & ~ink
    out = arr.copy()
    out[dil, 0] = 255
    out[dil, 1] = 255
    out[dil, 2] = 255
    out[dil, 3] = 255
    return out


def large_white_mask(arr: np.ndarray) -> np.ndarray:
    lum = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    mask = (lum >= 200).astype(np.uint8) * 255
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    keep = np.zeros(mask.shape, np.uint8)
    H, W = mask.shape
    for i in range(1, n):
        area = int(stats[i, cv2.CC_STAT_AREA])
        w = int(stats[i, cv2.CC_STAT_WIDTH])
        h = int(stats[i, cv2.CC_STAT_HEIGHT])
        if area >= 6000 and w >= 70 and h >= 70 and area >= 0.04 * H * W:
            keep[labels == i] = 255
    return keep


def wipe_dark_logos(arr: np.ndarray) -> np.ndarray:
    """Paint tiled blue MARKS icons on dark backgrounds to black."""
    r, g, b, a, lum, chroma = channels(arr)
    dark_blue = (b > r + 16) & (b > g + 8) & (b > 70) & (r < 175) & (lum < 210) & (a >= 10)
    mark = dark_blue.astype(np.uint8) * 255
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))
    dil = cv2.dilate(mark, k) > 0
    paper = large_white_mask(arr) > 0
    dil = dil & ~paper
    out = arr.copy()
    out[dil, 0] = 0
    out[dil, 1] = 0
    out[dil, 2] = 0
    return out


def crop_white_inset(arr: np.ndarray) -> np.ndarray | None:
    """Largest bright paper region (the actual Irodov diagram)."""
    lum = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    mask = (lum >= 200).astype(np.uint8) * 255
    k = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if n <= 1:
        return None
    areas = stats[1:, cv2.CC_STAT_AREA]
    i = int(np.argmax(areas)) + 1
    x, y, w, h, area = stats[i, 0], stats[i, 1], stats[i, 2], stats[i, 3], stats[i, 4]
    H, W = arr.shape[:2]
    if area < 6000 or w < 70 or h < 70:
        return None
    if area < 0.04 * H * W:
        return None
    pad = 8
    x0 = max(0, x - pad)
    y0 = max(0, y - pad)
    x1 = min(W, x + w + pad)
    y1 = min(H, y + h + pad)
    return arr[y0:y1, x0:x1].copy()


def process_figure(arr: np.ndarray) -> np.ndarray:
    lum = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    dark = float(np.median(lum)) < 90
    if dark:
        arr = wipe_dark_logos(arr)
        inset = crop_white_inset(arr)
        if inset is not None:
            return wipe_white_paper(inset)
        # No real diagram — problem-text scan with tiled Marks. Keep a white card.
        out = np.full_like(arr, 255)
        out[:, :, 3] = 255
        return out
    return wipe_white_paper(arr)


def download(url: str, dest: Path) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={
        **UA,
        "Referer": "https://web.getmarks.app/",
        "Origin": "https://web.getmarks.app",
    })
    try:
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            buf = r.read()
        if len(buf) < 80:
            return False
        dest.write_bytes(buf)
        return True
    except Exception:
        return False


def firebase_to_marks(url: str) -> str:
    from urllib.parse import unquote
    m = re.search(r"/o/([^?]+)", url)
    if not m:
        return ""
    p = unquote(m.group(1))
    p = re.sub(r"^questions/figs/", "", p)
    if p.startswith("quizrr/"):
        return "https://cdn.quizrr.in/" + p[len("quizrr/"):]
    if p.startswith(("pyq/", "nta_abhyas/", "2026_modules/")):
        return "https://cdn-question-pool.getmarks.app/" + p
    return ""


def test_samples():
    TEST.mkdir(parents=True, exist_ok=True)
    pairs = [
        (TEST / "06APRS2__q66_d1.jpg", TEST / "wipe_jee_06apr.png"),
        (TEST / "irodov_AKCR2_100.webp", TEST / "wipe_irodov_100.png"),
        (TEST / "irodov_AKCR2_2.webp", TEST / "wipe_irodov_2.png"),
        (ROOT / "assets/diagrams/qx-org-c49221e5dad1f07b.png", TEST / "wipe_amine.png"),
    ]
    for src, dest in pairs:
        if not src.exists():
            print("missing", src)
            continue
        arr = load_rgb(src)
        out = process_figure(arr)
        save_rgb(out, dest)
        print("wrote", dest.name, out.shape)


def restore_irodov():
    man = json.loads(IRO_MAN.read_text(encoding="utf-8"))
    mp = man.get("map") or {}
    ok = fail = 0
    tmp = TEST / "irodov_raw"
    tmp.mkdir(parents=True, exist_ok=True)
    for i, (src, local) in enumerate(mp.items(), 1):
        url = re.sub(r"https?:\/\/\.app\/", "https://cdn-question-pool.getmarks.app/", src)
        dest = ROOT / str(local).lstrip("/")
        raw = tmp / (Path(url).name)
        if not raw.exists() or raw.stat().st_size < 80:
            if not download(url, raw):
                fail += 1
                print("dl fail", url)
                continue
        try:
            arr = load_rgb(raw)
            out = process_figure(arr)
            save_rgb(out, dest)
            ok += 1
        except Exception as e:
            fail += 1
            print("wipe fail", dest.name, e)
        if i % 25 == 0 or i == len(mp):
            print(f"  irodov {i}/{len(mp)} ok={ok} fail={fail}", flush=True)
    print("irodov done", ok, "fail", fail)
    return ok, fail


def collect_fb_urls():
    urls = []
    bank = json.loads((ROOT / "data/banks/jee_main.json").read_text(encoding="utf-8"))
    for q in bank.get("questions") or []:
        if "2026" not in str(q.get("source") or ""):
            continue
        blob = str(q.get("q") or "") + " " + str(q.get("solution") or "") + " " + " ".join(map(str, q.get("options") or []))
        for u in re.findall(r'src=["\']([^"\']+)["\']', blob):
            if "firebasestorage" in u or "cdn-question-pool.getmarks.app" in u:
                urls.append(u)
    # unique
    seen = []
    had = set()
    for u in urls:
        if u in had:
            continue
        had.add(u)
        seen.append(u)
    return seen


def wipe_and_stage_jee():
    """Download Marks originals for JEE firebase/CDN figs, wipe, stage for upload."""
    stage = ROOT / "data/_migration/wiped_upload"
    stage.mkdir(parents=True, exist_ok=True)
    rows = []
    urls = collect_fb_urls()
    print("jee fig urls", len(urls), flush=True)
    ok = fail = 0
    for i, u in enumerate(urls, 1):
        marks = u if "cdn-question-pool.getmarks.app" in u else firebase_to_marks(u)
        if not marks:
            fail += 1
            continue
        from urllib.parse import unquote, urlparse
        path = urlparse(marks).path.lstrip("/")
        raw = TEST / "jee_raw" / Path(path).name
        if not raw.exists() or raw.stat().st_size < 80:
            if not download(marks, raw):
                fail += 1
                if fail <= 8:
                    print("dl fail", marks)
                continue
        try:
            arr = load_rgb(raw)
            out = process_figure(arr)
        except Exception as e:
            fail += 1
            print("wipe fail", marks, e)
            continue
        storage = "questions/figs/" + path.replace("\\", "/")
        dest = stage / storage.replace("/", "__")
        save_rgb(out, dest)
        rows.append({"storage": storage, "file": str(dest), "marks": marks, "site": u})
        ok += 1
        if i % 40 == 0 or i == len(urls):
            print(f"  jee {i}/{len(urls)} ok={ok} fail={fail}", flush=True)
    man = ROOT / "data/_migration/wiped_upload_manifest.json"
    man.write_text(json.dumps({"n": ok, "fail": fail, "rows": rows}, indent=2), encoding="utf-8")
    print("jee staged", ok, "fail", fail, "manifest", man)
    return ok, fail


def wipe_local_globs():
    amine = ROOT / "data/books/chapters/6a4ce383c59a7b462185330f"
    names = set()
    rx = re.compile(r"/assets/diagrams/(qx-org-[a-f0-9]{16}\.png)", re.I)
    if amine.exists():
        for fp in amine.glob("*.json"):
            t = fp.read_text(encoding="utf-8", errors="ignore")
            if re.search(r'"chapter"\s*:\s*"Amines"', t):
                names.update(m.lower() for m in rx.findall(t))
    n = 0
    for name in sorted(names):
        p = DIAG / name
        if not p.exists():
            continue
        arr = load_rgb(p)
        out = process_figure(arr)
        save_rgb(out, p)
        n += 1
    print("amine qx-org wiped", n)

    # JEE local qx-self
    bank = json.loads((ROOT / "data/banks/jee_main.json").read_text(encoding="utf-8"))
    self_rx = re.compile(r"/assets/diagrams/(qx-self-[a-f0-9]{16}\.png)", re.I)
    selfs = set()
    for q in bank.get("questions") or []:
        if "2026" not in str(q.get("source") or ""):
            continue
        blob = str(q.get("q") or "") + " " + str(q.get("solution") or "")
        selfs.update(m.lower() for m in self_rx.findall(blob))
    n2 = 0
    for name in sorted(selfs):
        p = DIAG / name
        if not p.exists():
            continue
        arr = load_rgb(p)
        out = process_figure(arr)
        save_rgb(out, p)
        n2 += 1
    print("jee qx-self wiped", n2)


def main():
    import sys
    args = set(sys.argv[1:] or ["--all"])
    if "--test" in args:
        test_samples()
        return
    if "--all" in args or "--irodov" in args:
        restore_irodov()
    if "--all" in args or "--jee" in args:
        wipe_and_stage_jee()
    if "--all" in args or "--amine" in args:
        wipe_local_globs()
    print("done")


if __name__ == "__main__":
    main()
