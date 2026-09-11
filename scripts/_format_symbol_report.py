#!/usr/bin/env python3
"""Report-only: broken question format / scattered text / bad symbols."""
from __future__ import annotations
import json, re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
AREAS = [
    ("PYQ / practice banks", ROOT / "data" / "banks"),
    ("Digital books", ROOT / "data" / "books" / "chapters"),
    ("Quizrr PYQ tests", ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter" / "questions"),
    ("Examgoal 2027 tests", ROOT / "data" / "tests" / "jee_main_examgoal_2027" / "questions"),
    ("NCERT offline", ROOT / "data" / "ncert_offline" / "chapters"),
    ("Board offline", ROOT / "data" / "board_offline" / "chapters"),
    ("HSC board", ROOT / "data" / "board_hsc_offline" / "chapters"),
]


def strip(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def qs_of(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("questions"), list):
        return data["questions"]
    return []


def opt_join(q):
    out = []
    for o in q.get("options") or []:
        if isinstance(o, str):
            out.append(o)
        elif isinstance(o, dict):
            out.append(str(o.get("text") or o.get("html") or ""))
        else:
            out.append(str(o or ""))
    return out


def classify(q):
    raw = str(q.get("q") or q.get("question") or "")
    opts = opt_join(q)
    sol = str(q.get("solution") or q.get("explanation") or "")
    allb = raw + " " + " ".join(opts) + " " + sol
    stem = strip(raw)
    kinds = []

    # Scattered / broken TeX (screenshot 933/941 style)
    if re.search(r"\$\$\\mathrm\{", raw):
        kinds.append("shattered_tex")
    if re.search(r"\$[^$\n]{0,80}=\$\$", raw):
        kinds.append("glued_dollars")
    if re.search(r"LIST\s*[-–]?\s*I{1,2}\s*\$", raw, re.I):
        kinds.append("list_dollar")
    if re.search(r"\[\s*[\d.]+\s*pt\s*\]", allb, re.I):
        kinds.append("latex_pt_junk")

    # HTML dumped as text (screenshot 943)
    if re.search(r"\\left\s*[\[(]\s*(?:<table|&lt;table)", allb, re.I):
        kinds.append("html_in_math")
    if re.search(r"&lt;table|&lt;tr|&lt;td", allb) and "begin{array}" in allb:
        kinds.append("html_in_math")
    if re.search(r"class\\?=[\"']qx-match-list", allb) and re.search(r"\\left|\\begin\{array\}", allb):
        kinds.append("html_in_math")

    # Symbol flatten (screenshot 935)
    if re.search(r"\bSgn\s*\(", allb) and r"\begin{cases}" not in allb and "operatorname{sgn}" not in allb:
        kinds.append("flat_sgn")

    # Raw TeX likely to show as source if renderer misses HTML stems
    if re.search(r"\$\\lim\b|\$f\s*\(\s*x\s*\)\s*=\s*\\lim", raw):
        kinds.append("long_tex_stem")

    # Empty / loading stem without figure
    img = bool(re.search(r"<img\b", allb, re.I))
    if (not stem or re.match(r"^(figure|fig\.?|diagram|image|loading)", stem, re.I)) and not img:
        kinds.append("empty_or_stub_stem")

    # Options that are only A/B/C/D letters (not figure-in-option)
    is_num = bool(
        re.search(r"numerical|integer|nat|subjective", str(q.get("questionType") or q.get("type") or ""), re.I)
        or (q.get("correctValue") is not None and not opts)
    )
    if opts and not is_num:
        good = False
        for s in opts:
            t = strip(s)
            if re.search(r"<img\b", s, re.I) or (t and not re.match(r"^[\(\[]?[A-Da-d][\)\].:]?$", t)):
                good = True
                break
        if not good:
            # figure-in-stem official A-D-in-image is not a format break
            if img:
                kinds.append("letter_opts_with_fig")
            else:
                kinds.append("letter_only_no_fig")

    return kinds


totals = Counter()
by_area = defaultdict(Counter)
by_file = defaultdict(Counter)
samples = defaultdict(list)
qs_total = 0
bad_qs = 0

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
        qs = qs_of(data)
        for q in qs:
            if not isinstance(q, dict):
                continue
            qs_total += 1
            kinds = classify(q)
            # letter_opts_with_fig is official figure-MCQ, not a format bug
            serious = [k for k in kinds if k != "letter_opts_with_fig"]
            if not serious:
                continue
            bad_qs += 1
            rel = str(fp.relative_to(ROOT))
            for k in serious:
                totals[k] += 1
                by_area[label][k] += 1
                by_file[rel][k] += 1
                if len(samples[k]) < 6:
                    samples[k].append({
                        "file": rel[-90:],
                        "id": q.get("id"),
                        "stem": strip(q.get("q") or q.get("question") or "")[:80],
                    })

# top files
top_files = sorted(by_file.items(), key=lambda kv: sum(kv[1].values()), reverse=True)[:20]

report = {
    "qs_scanned": qs_total,
    "qs_with_format_or_symbol_issue": bad_qs,
    "by_kind": dict(totals),
    "by_area": {a: dict(c) for a, c in by_area.items()},
    "top_files": [{"file": f, "n": sum(c.values()), "kinds": dict(c)} for f, c in top_files],
    "samples": {k: v for k, v in samples.items()},
}
print(json.dumps(report, indent=2, ensure_ascii=False))
(ROOT / "data/_migration/format_symbol_report.json").write_text(
    json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
)
