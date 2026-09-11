#!/usr/bin/env python3
"""Proof-read every question in JEE Main 2025 (8 Apr Shift 2) full paper."""
from __future__ import annotations
import json, re
from collections import Counter
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK = ROOT / "data" / "banks" / "jee_main.json"
SRC = "JEE Main 2025 (8 Apr Shift 2)"
OUT = ROOT / "data" / "_migration" / "pyq_2025_8apr_s2_proof.json"

IMG = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.I)
DOLLAR = re.compile(r"(?<!\\)\$")
LOCAL = re.compile(r"^(/assets/[^?#]+)")


def strip(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def odd(s):
    t = str(s or "").replace("$$", "")
    return len(DOLLAR.findall(t)) % 2 == 1


def opt_plain(o):
    if isinstance(o, str):
        return o
    if isinstance(o, dict):
        return str(o.get("text") or o.get("html") or "")
    return str(o or "")


def flags(q):
    raw = str(q.get("q") or q.get("question") or "")
    plain = strip(raw)
    opts = q.get("options") or []
    sol = str(q.get("solution") or "")
    qtype = str(q.get("questionType") or q.get("type") or "")
    is_num = "numerical" in qtype.lower() or qtype.lower() in ("nat", "integer")
    # Heuristic: 0-4 letter options empty + correctValue => NAT
    if q.get("correctValue") not in (None, "") and all(strip(opt_plain(o)) in ("", "A", "B", "C", "D") for o in opts):
        is_num = True
    out = []
    if len(plain) < 12 and not IMG.search(raw):
        out.append("empty_or_tiny_stem")
    if odd(raw):
        out.append("unbalanced_dollar_stem")
    if "\\begin{array}" in raw and "\\end{array}" not in raw:
        out.append("array_unclosed")
    if "\\begin{aligned}" in raw and "\\end{aligned}" not in raw:
        out.append("aligned_unclosed")
    # leading & after aligned often hides first row in KaTeX
    if re.search(r"\\begin\{aligned\}\s*&\s*\\text", raw):
        out.append("aligned_leading_amp_may_hide")
    if re.search(r"\\begin\{aligned\}[^$]{0,40}&\\s*\\\\", raw):
        out.append("aligned_empty_first_row")
    if plain.endswith(" is e") or re.search(r"\bis e$", plain):
        out.append("stem_truncated_end")
    if re.search(r"\\ldots\s*\.?\s*\\\\?\s*\$?\s*$", raw) and len(plain) < 80:
        out.append("stem_looks_cut")
    imgs = IMG.findall(raw) + sum((IMG.findall(opt_plain(o)) for o in opts), [])
    miss = []
    for src in imgs:
        m = LOCAL.match(src.replace("\\", "/").split("?")[0])
        if m:
            fp = ROOT / m.group(1).lstrip("/")
            if not fp.is_file():
                miss.append(src)
        elif "getmarks" in src or "quizrr" in src:
            out.append("remote_cdn_fig")
    if miss:
        out.append("missing_local_fig")
    if re.search(r"as shown in (the )?figure|following figure|given figure", raw, re.I) and not imgs:
        out.append("mentions_figure_no_img")
    if not is_num:
        if len(opts) == 0:
            out.append("no_options")
        elif len(opts) < 4:
            out.append("few_options")
        stubs = 0
        fig_opts = 0
        for o in opts:
            t = strip(opt_plain(o))
            if "<img" in opt_plain(o).lower():
                fig_opts += 1
            elif not t or re.fullmatch(r"[A-Da-d]", t):
                stubs += 1
        if stubs >= 3 and fig_opts == 0:
            out.append("letter_stub_options")
    else:
        if q.get("answer") in (None, "", []) and q.get("correctValue") in (None, "") and not (q.get("answers")):
            out.append("nat_no_answer")
    if odd(sol):
        out.append("unbalanced_dollar_sol")
    if len(strip(sol)) < 4 and not IMG.search(sol):
        out.append("empty_solution")
    return out, is_num, plain


data = json.loads(BANK.read_text(encoding="utf-8"))
qs = [q for q in data["questions"] if isinstance(q, dict) and q.get("source") == SRC]
# preserve bank order
by_flag = Counter()
rows = []
for i, q in enumerate(qs):
    fl, is_num, plain = flags(q)
    for f in fl:
        by_flag[f] += 1
    rows.append({
        "n": i + 1,
        "id": q.get("id"),
        "subject": q.get("subject"),
        "chapter": q.get("chapter"),
        "type": q.get("questionType") or q.get("type") or ("numerical" if is_num else "mcq"),
        "flags": fl,
        "stem": plain[:220],
        "opts": [strip(opt_plain(o))[:40] for o in (q.get("options") or [])],
        "q_preview": str(q.get("q") or "")[:280],
    })

# subject split
subj = Counter(r["subject"] for r in rows)
flagged = [r for r in rows if r["flags"]]
display_risk = [r for r in rows if any(x in r["flags"] for x in (
    "empty_or_tiny_stem", "unbalanced_dollar_stem", "aligned_unclosed",
    "aligned_leading_amp_may_hide", "stem_truncated_end", "missing_local_fig",
    "mentions_figure_no_img", "no_options", "few_options", "letter_stub_options",
    "array_unclosed",
))]

report = {
    "paper": SRC,
    "total": len(qs),
    "by_subject": dict(subj),
    "flag_counts": dict(by_flag),
    "n_with_any_flag": len(flagged),
    "n_display_risk": len(display_risk),
    "n_empty_sol_only": sum(1 for r in flagged if r["flags"] == ["empty_solution"]),
    "display_risk": display_risk,
    "all_flagged": flagged,
    "q37045": next((r for r in rows if r["id"] == 37045), None),
}
OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
print(json.dumps({
    "total": len(qs),
    "by_subject": dict(subj),
    "flag_counts": dict(by_flag),
    "n_with_any_flag": len(flagged),
    "n_display_risk": len(display_risk),
    "n_empty_sol_only": report["n_empty_sol_only"],
    "display_ids": [{"n": r["n"], "id": r["id"], "ch": r["chapter"], "flags": r["flags"], "stem": r["stem"][:120]} for r in display_risk],
}, indent=2, ensure_ascii=False))
