#!/usr/bin/env python3
import json
from collections import Counter
from pathlib import Path
import hydrate_books_from_marks as H

QID = Path(r"C:\Users\Admin\qx-hosting\data\qid_marks")
CH = Path(r"C:\Users\Admin\qx-hosting\data\books\chapters")


def official(mid):
    p = QID / f"{mid}.json"
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8")).get("data") or {}


def scan_book(bid):
    types = Counter()
    has_cv = 0
    letter_off = 0
    img_opts = 0
    n = 0
    samples = []
    for fp in (CH / bid).glob("*.json"):
        data = json.loads(fp.read_text(encoding="utf-8"))
        qs = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(qs, list):
            continue
        for q in qs:
            if not H.leftover(q):
                continue
            n += 1
            mid = q.get("_marksId")
            d = official(mid) if mid else None
            if not d:
                types["no_cache"] += 1
                continue
            t = str(d.get("type") or "")
            types[t or "blank"] += 1
            if d.get("correctValue") not in (None, ""):
                has_cv += 1
            opts = d.get("options") or []
            good = False
            for o in opts:
                txt = (o.get("text") if isinstance(o, dict) else o) or ""
                im = (o.get("image") if isinstance(o, dict) else None)
                if im or "<img" in str(txt).lower() or (H.strip(txt) and not H.strip(txt).upper() in list("ABCD") and not H.strip(txt).lower() in ("(a)", "(b)", "(c)", "(d)")):
                    good = True
            if good:
                img_opts += 1
            else:
                letter_off += 1
            if len(samples) < 4:
                samples.append({"localType": q.get("type"), "offType": t, "cv": d.get("correctValue"), "nopt": len(opts), "stemImg": len(H.img_urls(str(q.get("q") or "")))})
    return {"n": n, "types": dict(types), "has_cv": has_cv, "letter_off": letter_off, "img_opts": img_opts, "samples": samples}


for bid, name in [
    ("68f1ce4cc729e5251bd00430", "rank"),
    ("69048808ef55966cf1d71f1d", "olymp"),
    ("69f9cc23681eab6d6021a4d1", "hcv1"),
    ("6a0addba4b032b031e049a36", "hcv2"),
]:
    print(name, json.dumps(scan_book(bid)))
