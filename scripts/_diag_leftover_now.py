#!/usr/bin/env python3
"""Fast leftover diagnosis: TeX glue, space-truncated CDN, empty IDs, letter-no-img."""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
CDN_RX = re.compile(
    r"""https?://(?:cdn-question-pool\.getmarks\.app|cdn-assets\.getmarks\.app|cdn\.quizrr\.in|app-content\.cdn\.examgoal\.net)[^\"'\\>]+""",
    re.I,
)
IMG_RX = re.compile(r"<img\b", re.I)
GLUE_RX = re.compile(r"\$\$\\mathrm\{")
HEX24 = re.compile(r"^[a-f0-9]{24}$", re.I)
AREAS = [
    ROOT / "data" / "banks",
    ROOT / "data" / "books" / "chapters",
    ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter",
    ROOT / "data" / "tests" / "jee_main_examgoal_2027",
    ROOT / "data" / "ncert_offline" / "chapters",
    ROOT / "data" / "board_offline" / "chapters",
    ROOT / "data" / "board_hsc_offline" / "chapters",
    ROOT / "data" / "formulas.json",
]


def strip(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def walk():
    for area in AREAS:
        if area.is_file():
            yield area
            continue
        if not area.exists():
            continue
        for fp in area.rglob("*.json"):
            if fp.name.startswith("_") or ".bak" in fp.name:
                continue
            yield fp


def qs_of(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("questions"), list):
        return data["questions"]
    return []


def opt_list(opts):
    out = []
    for o in opts or []:
        if isinstance(o, str):
            out.append(o)
        elif isinstance(o, dict):
            out.append(str(o.get("text") or o.get("html") or o.get("image") or ""))
        else:
            out.append(str(o or ""))
    return out


c = Counter()
glue = []
space_cdn = []
empty = []
letter_no_img = []
fig_no_img = []
cdn_uniq = set()
cdn_space_uniq = set()
empty_files = Counter()

for fp in walk():
    try:
        data = json.loads(fp.read_text(encoding="utf-8"))
    except Exception:
        continue
    qs = qs_of(data)
    # also scan raw text for CDN with spaces
    try:
        rawtxt = fp.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        rawtxt = ""
    for m in CDN_RX.finditer(rawtxt):
        u = m.group(0).replace("\\/", "/")
        cdn_uniq.add(u.split("?")[0])
        if " " in u or "%20" in u:
            cdn_space_uniq.add(u.split("?")[0])
            if len(space_cdn) < 8:
                space_cdn.append({"file": str(fp.relative_to(ROOT)), "url": u[:180]})
    for q in qs:
        if not isinstance(q, dict):
            continue
        c["qs"] += 1
        raw = str(q.get("q") or q.get("question") or "")
        opts = opt_list(q.get("options"))
        sol = str(q.get("solution") or q.get("explanation") or "")
        blob = raw + " " + " ".join(opts) + " " + sol
        stem = strip(raw)
        img = bool(IMG_RX.search(blob))
        if GLUE_RX.search(raw) or GLUE_RX.search(sol):
            c["glue"] += 1
            if len(glue) < 6:
                glue.append({"file": fp.name, "id": q.get("id"), "q": raw[:240]})
        if (not stem or re.match(r"^(figure|fig\.?|diagram|image)$", stem, re.I)) and not img:
            c["empty"] += 1
            empty_files[str(fp.relative_to(ROOT))] += 1
            if len(empty) < 6:
                empty.append({"file": str(fp.relative_to(ROOT)), "id": q.get("id"), "q": raw[:80], "keys": list(q.keys())[:12]})
        is_num = bool(
            re.search(r"numerical|integer|nat|subjective|fill|written", str(q.get("questionType") or q.get("type") or ""), re.I)
            or (q.get("correctValue") is not None and not opts)
        )
        letter = False
        if opts and not is_num:
            good = False
            for s in opts:
                t = strip(s)
                if IMG_RX.search(s) or (t and not re.match(r"^[\(\[]?[A-Da-d][\)\].:]?$", t)):
                    good = True
                    break
            letter = not good
        if letter:
            c["letter"] += 1
            if IMG_RX.search(raw):
                c["letter_stem_img"] += 1
            else:
                c["letter_no_img"] += 1
                if len(letter_no_img) < 6:
                    letter_no_img.append({"file": fp.name, "id": q.get("id"), "stem": stem[:90], "opts": [strip(x)[:20] for x in opts[:4]]})
        if re.search(r"\b(the figure|shown in (the )?(figure|diagram|graph)|shown below|as shown in)\b", stem, re.I) and not img:
            if not re.search(r"figure formed by|figure\s+\d", stem, re.I):
                c["fig"] += 1
                if len(fig_no_img) < 6:
                    fig_no_img.append({"file": fp.name, "id": q.get("id"), "stem": stem[:100]})
        if not strip(sol) and not IMG_RX.search(sol):
            c["nosol"] += 1

print(json.dumps({
    "counts": dict(c),
    "cdn_uniq": len(cdn_uniq),
    "cdn_with_space": len(cdn_space_uniq),
    "empty_files": empty_files.most_common(8),
    "glue": glue,
    "empty": empty,
    "letter_no_img": letter_no_img,
    "fig": fig_no_img,
    "space_cdn": space_cdn,
    "cdn_space_sample": list(sorted(cdn_space_uniq))[:12],
    "cdn_noext_sample": [u for u in sorted(cdn_uniq) if not re.search(r"\.(png|jpe?g|webp|gif|svg)(?:$|\?)", u, re.I)][:15],
}, indent=2), flush=True)
