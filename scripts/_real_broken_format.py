#!/usr/bin/env python3
"""Stricter: only actually broken/scattered symbols, not valid $lim$ TeX."""
from __future__ import annotations
import json, re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
AREAS = [
    ("PYQ banks", ROOT / "data" / "banks"),
    ("Digital books", ROOT / "data" / "books" / "chapters"),
    ("Quizrr PYQ", ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter" / "questions"),
    ("Examgoal 2027", ROOT / "data" / "tests" / "jee_main_examgoal_2027" / "questions"),
    ("NCERT", ROOT / "data" / "ncert_offline" / "chapters"),
    ("Board", ROOT / "data" / "board_offline" / "chapters"),
]


def strip(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def qs_of(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("questions"), list):
        return data["questions"]
    return []


def kinds(q):
    raw = str(q.get("q") or q.get("question") or "")
    opts = []
    for o in q.get("options") or []:
        opts.append(o if isinstance(o, str) else str((o or {}).get("text") or ""))
    sol = str(q.get("solution") or "")
    allb = raw + " ".join(opts) + sol
    stem = strip(raw)
    out = []

    # True shatter: $$\mathrm{X} as leftover crumb, not $$ \int display
    if re.search(r"\$\$\\mathrm\{[A-Za-z0-9]", raw) and not re.search(r"\$\$\\int", raw):
        out.append("shattered_mathrm")
    if re.search(r"\\le\s+ft\b|\\ri\s+ght\b", allb):
        out.append("broken_left_right")
    if re.search(r"LIST\s*[-–]?\s*I{1,2}\s*\$", raw, re.I):
        out.append("list_i_dollar")
    if re.search(r"\[\s*[\d.]+\s*pt\s*\]", allb, re.I):
        out.append("pt_junk")
    if re.search(r"&lt;table|&lt;tr\b", allb, re.I):
        out.append("escaped_html_table")
    if re.search(r"\\left\s*[\[(]\s*<table", allb, re.I):
        out.append("html_inside_left")
    # Unbalanced $ in stem (odd count, ignoring $$)
    dollars = len(re.findall(r"(?<!\\)\$", raw.replace("$$", "")))
    if dollars % 2 == 1 and dollars > 0:
        out.append("unbalanced_dollar")
    if re.search(r"Unknown node type|Math input error", allb, re.I):
        out.append("mathjax_error_text")
    if (not stem) and not re.search(r"<img\b", allb, re.I):
        out.append("empty_stem")
    return out


tot = Counter()
area_c = defaultdict(Counter)
file_c = defaultdict(int)
samples = defaultdict(list)
scanned = 0
bad = 0
for label, area in AREAS:
    if not area.exists():
        continue
    files = [area] if area.is_file() else list(area.rglob("*.json"))
    for fp in files:
        if fp.name.startswith("_") or ".bak" in fp.name:
            continue
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        for q in qs_of(data):
            if not isinstance(q, dict):
                continue
            scanned += 1
            ks = kinds(q)
            if not ks:
                continue
            bad += 1
            rel = str(fp.relative_to(ROOT))
            file_c[rel] += 1
            for k in ks:
                tot[k] += 1
                area_c[label][k] += 1
                if len(samples[k]) < 5:
                    samples[k].append({"file": rel[-85:], "id": q.get("id"), "stem": strip(q.get("q") or "")[:85]})

print(json.dumps({
    "scanned": scanned,
    "real_broken_qs": bad,
    "kinds": dict(tot),
    "by_area": {a: dict(c) for a, c in area_c.items()},
    "files": [{"file": f, "n": n} for f, n in sorted(file_c.items(), key=lambda x: -x[1])[:15]],
    "samples": dict(samples),
}, indent=2, ensure_ascii=False))
