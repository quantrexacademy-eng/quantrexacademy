#!/usr/bin/env python3
import json, re
from pathlib import Path
import hydrate_books_from_marks as H

ROOT = Path(r"C:\Users\Admin\qx-hosting\data\books\chapters")
for bid, name in [
    ("68f1ce4cc729e5251bd00430", "rank"),
    ("69f9cc23681eab6d6021a4d1", "hcv1"),
    ("6a0addba4b032b031e049a36", "hcv2"),
    ("69048808ef55966cf1d71f1d", "olymp"),
]:
    letter = cdn = fig = with_id = 0
    samples = []
    for fp in (ROOT / bid).glob("*.json"):
        data = json.loads(fp.read_text(encoding="utf-8"))
        qs = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(qs, list):
            continue
        for q in qs:
            if not H.leftover(q):
                continue
            raw = str(q.get("q") or "")
            opts = q.get("options") or []
            if H.opt_score(opts) < 2:
                letter += 1
            if re.search(r"quizrr|watermarked_images|organic_book", raw + " ".join(map(str, opts)), re.I):
                cdn += 1
            if re.search(r"shown in|the figure|shown below", H.strip(raw), re.I) and not re.search(r"<img", raw, re.I):
                fig += 1
            if q.get("_marksId"):
                with_id += 1
            if len(samples) < 3:
                samples.append({
                    "file": fp.name[-40:],
                    "id": q.get("id"),
                    "marks": q.get("_marksId"),
                    "optScore": H.opt_score(opts),
                    "opts": [H.strip(o)[:20] for o in opts[:4]],
                    "nImgStem": len(H.img_urls(raw)),
                    "stem": H.strip(raw)[:70],
                    "cdn": bool(re.search(r"quizrr|watermarked", raw, re.I)),
                })
    print(name, "letter", letter, "cdn", cdn, "fig", fig, "withId", with_id)
    for s in samples:
        print(" ", s)
