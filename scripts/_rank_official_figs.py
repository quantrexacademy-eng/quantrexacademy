#!/usr/bin/env python3
"""Replace remaining Rank Booster figures from official Marks records (clean + light Quantrex)."""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(r"C:\Users\Admin\qx-hosting") / "scripts"))
import hydrate_books_from_marks as H
import _clean_stamp_book_figs as C

ROOT = Path(r"C:\Users\Admin\qx-hosting")
RANK = ROOT / "data" / "books" / "chapters" / "68f1ce4cc729e5251bd00430"
OUT = ROOT / "assets" / "diagrams"
IMG_RX = re.compile(r"""src=\\?["']([^"']+)""", re.I)


def urls_in(html: str):
    return [C.norm_url(u) for u in IMG_RX.findall(html or "")]


def rec_img_urls(rec):
    blob = str(rec.get("q") or "") + " " + " ".join(rec.get("options") or []) + " " + str(rec.get("solution") or "")
    out = []
    for u in H.img_urls(blob):
        u = C.norm_url(u)
        if re.search(r"getmarks|quizrr", u, re.I):
            out.append(u)
    return out


def bake(url: str) -> str | None:
    dest = OUT / f"qx-book-{C.sha(url)}.png"
    try:
        dest.unlink()
    except Exception:
        pass
    if not C.download(url, dest):
        return None
    C.process_file(dest, stamp=True)
    return "/assets/diagrams/" + dest.name


def replace_src(html: str, mapping: dict) -> str:
    s = html or ""
    for old, new in mapping.items():
        if not old or not new or old == new:
            continue
        s = s.replace(old, new)
        s = s.replace(old.replace("/", "\\/"), new)
    return s


def main():
    stats = {"qs": 0, "withId": 0, "api": 0, "cache": 0, "mapped": 0, "files": 0, "miss": 0}
    for fp in sorted(RANK.glob("*.json")):
        data = json.loads(fp.read_text(encoding="utf-8"))
        qs = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(qs, list):
            continue
        chg = False
        for q in qs:
            stats["qs"] += 1
            mid = q.get("_marksId")
            if not mid:
                continue
            stats["withId"] += 1
            rec, src = H.fetch_full(mid)
            if src == "api":
                stats["api"] += 1
                time.sleep(H.SLEEP)
            elif not rec:
                stats["miss"] += 1
                continue
            else:
                stats["cache"] += 1
            official = rec_img_urls(rec) if rec else []
            if not official:
                continue
            mapping = {}
            for u in official:
                loc = bake(u)
                if loc:
                    mapping[u] = loc
            if not mapping:
                continue
            # also map current local hashes that we can pair by order
            local_html = str(q.get("q") or "") + " " + " ".join(q.get("options") or [])
            locals_ = [u for u in urls_in(local_html) if "qx-book-" in u]
            for i, old in enumerate(locals_):
                if i < len(official) and official[i] in mapping:
                    mapping[old] = mapping[official[i]]
                    mapping[old.split("?")[0]] = mapping[official[i]]
            old_q = q.get("q")
            q["q"] = replace_src(str(q.get("q") or ""), mapping)
            q["question"] = q["q"]
            if isinstance(q.get("options"), list):
                q["options"] = [replace_src(str(o), mapping) for o in q["options"]]
            if q.get("solution"):
                q["solution"] = replace_src(str(q.get("solution")), mapping)
            if q.get("q") != old_q or mapping:
                stats["mapped"] += 1
                chg = True
        if chg:
            if isinstance(data, dict):
                data["questions"] = qs
                fp.write_text(json.dumps(data), encoding="utf-8")
            else:
                fp.write_text(json.dumps(qs), encoding="utf-8")
            stats["files"] += 1
            print("wrote", fp.name, flush=True)
    print(json.dumps(stats, indent=2), flush=True)


if __name__ == "__main__":
    main()
