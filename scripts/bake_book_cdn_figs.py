#!/usr/bin/env python3
"""Download official book figure URLs to local assets/diagrams and rewrite JSON."""
from __future__ import annotations

import hashlib
import json
import re
import ssl
import time
import urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
CHDIR = ROOT / "data" / "books" / "chapters"
OUT = ROOT / "assets" / "diagrams"
BOOKS = [
    "68f1ce4cc729e5251bd00430",
    "69f9cc23681eab6d6021a4d1",
    "6a0addba4b032b031e049a36",
    "6a4ce383c59a7b462185330f",
    "69736c8362b916d85e52cd1b",  # BITSAT English/LR leftover CDN
]
RX = re.compile(
    r"""src=\\?["'](https?://(?:cdn\.quizrr\.in|cdn-question-pool\.getmarks\.app)[^"'\\]+)""",
    re.I,
)
CTX = ssl.create_default_context()


def sha(u):
    return hashlib.sha1(u.encode("utf-8")).hexdigest()[:16]


def download(url):
    dest = OUT / f"qx-book-{sha(url)}.png"
    if dest.exists() and dest.stat().st_size > 80:
        return "/assets/diagrams/" + dest.name
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "image/*,*/*;q=0.8",
            "Referer": "https://web.getmarks.app/",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            buf = r.read()
        if len(buf) < 80:
            return None
        dest.write_bytes(buf)
        return "/assets/diagrams/" + dest.name
    except Exception:
        return None


def main():
    urls = []
    files = []
    for bid in BOOKS:
        d = CHDIR / bid
        if not d.exists():
            continue
        for fp in d.glob("*.json"):
            txt = fp.read_text(encoding="utf-8")
            found = RX.findall(txt)
            if found:
                files.append(fp)
                urls.extend(found)
    uniq = sorted(set(urls))
    print("files", len(files), "urls", len(uniq), flush=True)
    mapping = {}
    ok = fail = 0
    for i, u in enumerate(uniq, 1):
        loc = download(u)
        if loc:
            mapping[u] = loc
            ok += 1
        else:
            fail += 1
        if i % 25 == 0 or i == len(uniq):
            print(f"  {i}/{len(uniq)} ok={ok} fail={fail}", flush=True)
        time.sleep(0.05)
    rewritten = 0
    for fp in files:
        txt = fp.read_text(encoding="utf-8")
        orig = txt
        for u, loc in mapping.items():
            txt = txt.replace(u, loc)
        if txt != orig:
            fp.write_text(txt, encoding="utf-8")
            rewritten += 1
    print(json.dumps({"unique": len(uniq), "ok": ok, "fail": fail, "rewrittenFiles": rewritten}), flush=True)


if __name__ == "__main__":
    main()
