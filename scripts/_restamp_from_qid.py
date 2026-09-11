#!/usr/bin/env python3
"""Re-download original Marks figures whose hash matches local qx-book-*.png,
wipe Marks haze, apply a light Quantrex stamp. Fixes leftover heavy overlays.
"""
from __future__ import annotations

import hashlib
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import _clean_stamp_book_figs as C

ROOT = Path(r"C:\Users\Admin\qx-hosting")
QID = ROOT / "data" / "qid_marks"
OUT = ROOT / "assets" / "diagrams"
RANK = ROOT / "data" / "books" / "chapters" / "68f1ce4cc729e5251bd00430"
URL_RX = re.compile(r"https?://(?:cdn-question-pool\.getmarks\.app|cdn\.quizrr\.in)[^\"'\\>\s]+", re.I)


def collect_local_hashes():
    need = set()
    for fp in RANK.glob("*.json"):
        for m in C.LOCAL_RX.findall(fp.read_text(encoding="utf-8", errors="ignore")):
            h = m.replace("qx-book-", "").replace(".png", "")
            need.add(h.lower())
    return need


def collect_qid_urls():
    urls = {}
    n = 0
    for fp in QID.glob("*.json"):
        n += 1
        txt = fp.read_text(encoding="utf-8", errors="ignore")
        for u in URL_RX.findall(txt):
            u = C.norm_url(u)
            urls[C.sha(u)] = u
        if n % 800 == 0:
            print("  qid scanned", n, "urls", len(urls), flush=True)
    print("qid files", n, "unique img urls", len(urls), flush=True)
    return urls


def main():
    need = collect_local_hashes()
    print("rank local hashes", len(need), flush=True)
    qmap = collect_qid_urls()
    matched = [(h, qmap[h]) for h in need if h in qmap]
    print("matched originals", len(matched), "unmatched", len(need) - len(matched), flush=True)

    ok = fail = 0
    dests = []

    def one(item):
        h, u = item
        dest = OUT / f"qx-book-{h}.png"
        # force re-download
        try:
            dest.unlink()
        except Exception:
            pass
        got = C.download(u, dest)
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
            if done % 50 == 0 or done == len(matched):
                print(f"  dl {done}/{len(matched)} ok={ok} fail={fail}", flush=True)

    stamped = 0
    for i, dest in enumerate(dests, 1):
        if C.process_file(dest, stamp=True):
            stamped += 1
        if i % 80 == 0 or i == len(dests):
            print(f"  stamp {i}/{len(dests)}", flush=True)
    print({"matched": len(matched), "dlOk": ok, "dlFail": fail, "stamped": stamped}, flush=True)


if __name__ == "__main__":
    main()
