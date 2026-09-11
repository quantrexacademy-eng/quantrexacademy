#!/usr/bin/env python3
"""Finish self-dependency: bake leftover book/test CDNs; pale-wipe Marks logo on local book figs."""
from __future__ import annotations

import hashlib
import json
import re
import ssl
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"C:\Users\Admin\qx-hosting")
OUT = ROOT / "assets" / "diagrams"
CHDIR = ROOT / "data" / "books" / "chapters"
CTX = ssl.create_default_context()
CDN_RX = re.compile(
    r"https?://(?:cdn-question-pool\.getmarks\.app|cdn\.quizrr\.in|app-content\.cdn\.examgoal\.net)[^\"'\\>\s]+",
    re.I,
)
LOCAL_RX = re.compile(r"/assets/diagrams/(qx-book-[a-f0-9]{16}\.png)", re.I)

AREAS = [
    ROOT / "data" / "books" / "chapters",
    ROOT / "data" / "tests" / "jee_main_examgoal_2027" / "questions",
    ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter" / "questions",
]


def sha(u: str) -> str:
    return hashlib.sha1(u.encode("utf-8")).hexdigest()[:16]


def norm(u: str) -> str:
    s = str(u or "").replace("\\/", "/").rstrip("\\").split("?")[0].strip()
    return re.sub(r"\\+$", "", s)


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


def wipe_pale_marks(img: Image.Image) -> Image.Image:
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
    h, w = marks.shape
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


def collect_cdns():
    urls = set()
    hosts = Counter()
    files = []
    for area in AREAS:
        if not area.exists():
            continue
        for fp in area.rglob("*.json"):
            if fp.name.startswith("_") or ".bak" in fp.name:
                continue
            txt = fp.read_text(encoding="utf-8", errors="ignore")
            found = CDN_RX.findall(txt)
            if not found:
                continue
            files.append(fp)
            for u in found:
                u = norm(u)
                urls.add(u)
                m = re.search(r"https?://([^/]+)", u, re.I)
                hosts[(m.group(1).lower() if m else "x")] += 1
    return urls, hosts, files


def main():
    urls, hosts, files = collect_cdns()
    print("cdn unique", len(urls), "files", len(files), "hosts", dict(hosts), flush=True)
    mapping = {}
    ok = fail = 0
    dests = []

    def one(u):
        dest = OUT / f"qx-book-{sha(u)}.png"
        got = download(u, dest)
        return u, dest, got

    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = [pool.submit(one, u) for u in sorted(urls)]
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
            if done % 50 == 0 or done == len(urls):
                print(f"  dl {done}/{len(urls)} ok={ok} fail={fail}", flush=True)

    wiped = 0
    for dest in dests:
        try:
            with Image.open(dest) as im:
                out = wipe_pale_marks(im)
            out.convert("RGB").save(dest, "PNG", optimize=True)
            wiped += 1
        except Exception as e:
            print("wipe fail", dest.name, e, flush=True)

    rew = 0
    if mapping:
        for fp in files:
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
                rew += 1

    # Pale-wipe existing HCV + all book qx-book still referenced
    book_names = set()
    for d in CHDIR.iterdir() if CHDIR.exists() else []:
        if not d.is_dir():
            continue
        for fp in d.glob("*.json"):
            book_names.update(m.lower() for m in LOCAL_RX.findall(fp.read_text(encoding="utf-8", errors="ignore")))
    extra = 0
    just = {p.name.lower() for p in dests}
    for i, name in enumerate(sorted(book_names), 1):
        if name in just:
            continue
        p = OUT / name
        if not p.exists():
            continue
        try:
            with Image.open(p) as im:
                out = wipe_pale_marks(im)
            out.convert("RGB").save(p, "PNG", optimize=True)
            extra += 1
        except Exception:
            pass
        if i % 200 == 0:
            print(f"  book wipe {i}/{len(book_names)}", flush=True)

    print(json.dumps({
        "cdnUnique": len(urls),
        "dlOk": ok,
        "dlFail": fail,
        "rewritten": rew,
        "wipedNew": wiped,
        "wipedExistingBook": extra,
    }, indent=2), flush=True)


if __name__ == "__main__":
    main()
