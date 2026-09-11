#!/usr/bin/env python3
"""Scan student-facing JSON for screenshot-type format problems. Never invents."""
from __future__ import annotations
import json, re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
AREAS = [
    ("banks", ROOT / "data" / "banks"),
    ("books", ROOT / "data" / "books" / "chapters"),
    ("quizrr", ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter" / "questions"),
    ("examgoal", ROOT / "data" / "tests" / "jee_main_examgoal_2027" / "questions"),
    ("ncert", ROOT / "data" / "ncert_offline" / "chapters"),
    ("board", ROOT / "data" / "board_offline" / "chapters"),
]


def strip(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def qs_of(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("questions"), list):
        return data["questions"]
    return []


def blob(q):
    opts = q.get("options") or []
    opt_s = " ".join(o if isinstance(o, str) else str((o or {}).get("text") or "") for o in opts)
    return str(q.get("q") or q.get("question") or "") + " " + opt_s + " " + str(q.get("solution") or "")


flags = Counter()
samples = defaultdict(list)
by_area = defaultdict(Counter)

# Screenshot 943: HTML table leaked into TeX
LEAK = re.compile(r"\\left\s*\(\s*<table|\\left\s*\(\s*&lt;table|qx-match-list qx-match-array", re.I)
# Screenshot 942: polynomial option missing = before trailing 0
MISS_EQ = re.compile(
    r"(?:x\s*\^\s*\{?\s*2|x\s*<sup>\s*2)[\s\S]{0,80}(?:y\s*\^\s*\{?\s*2|y\s*<sup>\s*2)[\s\S]{0,80}\s{2,}0\s*$",
    re.I,
)
MISS_EQ2 = re.compile(r"[xyz0-9\^\{\}\\+\-–−\s]{8,}\s{2,}0\s*$")
# Screenshot 941: raw $...$ with \lim still in stored form is OK; renderer issue
# Screenshot 933: shattered $$\mathrm
SHATTER = re.compile(r"\$\$\\mathrm\{")
# Screenshot 935: flattened Sgn
SGN = re.compile(r"\bSgn\s*\(")
# List-I leftover $
LISTD = re.compile(r"LIST\s*[-–]?\s*I{1,2}\s*\$", re.I)
# HTML dumped as text
DUMP = re.compile(r"&lt;table|&lt;tr|&lt;td|class=\"qx-match-list")


def flag_q(q):
    raw = str(q.get("q") or q.get("question") or "")
    opts = q.get("options") or []
    allb = blob(q)
    out = []
    if LEAK.search(allb) or DUMP.search(allb):
        out.append("html_leak_in_tex")
    if SHATTER.search(raw):
        out.append("shattered_tex")
    if SGN.search(allb) and r"\begin{cases}" not in allb and "operatorname{sgn}" not in allb:
        out.append("flat_sgn")
    if LISTD.search(raw):
        out.append("list_dollar")
    for o in opts:
        s = o if isinstance(o, str) else str((o or {}).get("text") or "")
        t = strip(s)
        if MISS_EQ.search(t) or (MISS_EQ2.search(t) and re.search(r"[xyz]\s*\^", t) and "=" not in t):
            out.append("opt_missing_eq")
            break
    return out


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
            fs = flag_q(q)
            for f in fs:
                flags[f] += 1
                by_area[label][f] += 1
                if len(samples[f]) < 8:
                    samples[f].append({
                        "area": label,
                        "file": str(fp.relative_to(ROOT))[-80:],
                        "id": q.get("id"),
                        "stem": strip(q.get("q") or q.get("question") or "")[:90],
                    })

print(json.dumps({
    "counts": dict(flags),
    "by_area": {k: dict(v) for k, v in by_area.items()},
    "samples": {k: v for k, v in samples.items()},
}, indent=2, ensure_ascii=False))
(ROOT / "data/_migration/format_scan_ss942.json").write_text(
    json.dumps({"counts": dict(flags), "by_area": {k: dict(v) for k, v in by_area.items()}, "samples": dict(samples)}, indent=2),
    encoding="utf-8",
)
