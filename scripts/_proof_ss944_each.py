#!/usr/bin/env python3
"""Per-question classification for JEE Main 2025 (8 Apr Shift 2) as in Screenshot 944."""
from __future__ import annotations
import json, re
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK = json.loads((ROOT / "data/banks/jee_main.json").read_text(encoding="utf-8"))
SRC = "JEE Main 2025 (8 Apr Shift 2)"
qs = [q for q in BANK["questions"] if isinstance(q, dict) and q.get("source") == SRC]


def strip(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def opt_plain(o):
    return o if isinstance(o, str) else str((o or {}).get("text") or "")


DOLLAR_BLOCK = re.compile(r"(?<!\\)\$(.+?)(?<!\\)\$", re.S)
HTML_IN = re.compile(r"<br\s*/?>|</?p>|</?div>|</?span>", re.I)
IMG = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.I)


def odd(s):
    t = str(s or "").replace("$$", "")
    return len(re.findall(r"(?<!\\)\$", t)) % 2 == 1


rows = []
for i, q in enumerate(qs, 1):
    raw = str(q.get("q") or "")
    opts = q.get("options") or []
    sol = str(q.get("solution") or "")
    plains = [strip(opt_plain(o)) for o in opts]
    imgs = IMG.findall(raw) + [u for o in opts for u in IMG.findall(opt_plain(o))] + IMG.findall(sol)
    miss_img = []
    for src in imgs:
        path = src.split("?")[0]
        if path.startswith("/assets/"):
            fp = ROOT / path.lstrip("/")
            if not fp.is_file():
                miss_img.append(src)
    html_in_math = False
    for m in DOLLAR_BLOCK.findall(raw):
        if HTML_IN.search(m):
            html_in_math = True
    is_num = "numerical" in str(q.get("questionType") or q.get("type") or "").lower()
    emptyish = (not plains) or all(p in ("", "A", "B", "C", "D") for p in plains)
    if emptyish and "<img" not in raw.lower() and not any("<img" in opt_plain(o).lower() for o in opts):
        # JEE Main paper NATs: blank options; not a display bug
        is_num = True
    issues = []
    if html_in_math:
        issues.append("HTML_<br>_inside_$math$ (KaTeX stem vanish — Screenshot 944 type)")
    if odd(raw):
        issues.append("unbalanced_$ (List/array closer missing)")
    if miss_img:
        issues.append("figure_file_missing: " + "; ".join(miss_img[:3]))
    if not strip(raw) and not IMG.search(raw):
        issues.append("empty_stem")
    if not strip(raw) and miss_img:
        issues.append("stem_only_dead_figure")
    if not is_num:
        if len(opts) < 4:
            issues.append("options_incomplete")
        elif all((not p or re.fullmatch(r"[A-D]", p)) and "<img" not in opt_plain(o).lower() for o, p in zip(opts, plains)):
            issues.append("options_letter_stubs")
    else:
        if q.get("correctValue") in (None, "") and q.get("answer") in (None, "", []):
            issues.append("NAT_no_official_value")
    if odd(sol):
        issues.append("unbalanced_$_in_solution")
    if len(strip(sol)) < 4 and not IMG.search(sol):
        issues.append("empty_solution")
    if "alcohol-prep" in raw or any("alcohol-prep" in opt_plain(o) for o in opts):
        issues.append("dead_alcohol-prep_overlay")
    rows.append({
        "n": i,
        "id": q.get("id"),
        "subject": q.get("subject"),
        "chapter": q.get("chapter"),
        "kind": "NAT" if is_num else "MCQ",
        "issues": issues,
        "stem": strip(raw)[:100],
    })

wrong = [r for r in rows if r["issues"]]
print("TOTAL", len(rows))
print("WRONG", len(wrong))
from collections import Counter
c = Counter()
for r in wrong:
    for x in r["issues"]:
        c[x.split(":")[0]] += 1
print("BY_KIND", dict(c))
print("---EACH WRONG---")
for r in wrong:
    print(f"Q{r['n']:02d} id={r['id']} {r['subject'][:4]} {r['kind']} | {r['chapter']}")
    print("   ", " ; ".join(r["issues"]))
    print("    stem:", r["stem"][:90] or "(no text)")
