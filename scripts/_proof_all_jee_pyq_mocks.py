#!/usr/bin/env python3
"""Complete proof-read of JEE Main PYQ mock full papers (jee_main.json by source)."""
from __future__ import annotations
import json, re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK = ROOT / "data" / "banks" / "jee_main.json"
OUT = ROOT / "data" / "_migration" / "pyq_mock_all_papers_proof.json"

IMG = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.I)
DOLLAR_BLOCK = re.compile(r"(?<!\\)\$(.+?)(?<!\\)\$", re.S)
HTML_IN = re.compile(r"<br\s*/?>|</?p>|</?div>|</?span>", re.I)
DOLLAR = re.compile(r"(?<!\\)\$")


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


def classify(q):
    raw = str(q.get("q") or q.get("question") or "")
    opts = q.get("options") or []
    sol = str(q.get("solution") or "")
    plains = [strip(opt_plain(o)) for o in opts]
    issues = []

    html_in_math = False
    for m in DOLLAR_BLOCK.findall(raw):
        if HTML_IN.search(m):
            html_in_math = True
            break
    if html_in_math:
        issues.append("html_in_math")  # Screenshot 944 — stem vanishes
    if odd(raw):
        issues.append("unbalanced_dollar_stem")
    if "\\begin{array}" in raw and "\\end{array}" not in raw:
        issues.append("array_unclosed")
    if "\\begin{aligned}" in raw and "\\end{aligned}" not in raw:
        issues.append("aligned_unclosed")

    imgs = IMG.findall(raw)
    for o in opts:
        imgs += IMG.findall(opt_plain(o))
    imgs += IMG.findall(sol)
    miss = []
    for src in imgs:
        path = src.split("?")[0]
        if path.startswith("/assets/"):
            fp = ROOT / path.lstrip("/")
            if not fp.is_file():
                miss.append(src)
        elif "getmarks.app" in src or "cdn.quizrr" in src:
            issues.append("remote_cdn")
    if miss:
        issues.append("missing_local_fig")
    if re.search(r"as shown in (the )?figure|following figure|given figure", raw, re.I) and not imgs:
        issues.append("mentions_fig_no_img")
    if not strip(raw) and not IMG.search(raw):
        issues.append("empty_stem")
    if not strip(raw) and miss:
        issues.append("stem_only_dead_fig")
    if "alcohol-prep" in (raw + " ".join(opt_plain(o) for o in opts) + sol):
        issues.append("dead_alcohol_prep")

    emptyish = (not plains) or all(p in ("", "A", "B", "C", "D") for p in plains)
    has_fig_opt = any("<img" in opt_plain(o).lower() for o in opts)
    is_num = "numerical" in str(q.get("questionType") or q.get("type") or "").lower()
    if emptyish and not has_fig_opt:
        is_num = True
    if not is_num:
        if len(opts) == 0:
            issues.append("no_options")
        elif len(opts) < 4:
            issues.append("few_options")
        elif not has_fig_opt and sum(1 for p in plains if not p or re.fullmatch(r"[A-Da-d]", p)) >= 3:
            issues.append("letter_stubs")
    else:
        if q.get("correctValue") in (None, "") and q.get("answer") in (None, "", []):
            issues.append("nat_no_key")

    if odd(sol):
        issues.append("unbalanced_dollar_sol")
    if len(strip(sol)) < 4 and not IMG.search(sol):
        issues.append("empty_sol")
    return list(dict.fromkeys(issues))


print("loading bank…")
data = json.loads(BANK.read_text(encoding="utf-8"))
qs = data.get("questions") or []
print("questions in bank", len(qs))

by_src = defaultdict(list)
for q in qs:
    if not isinstance(q, dict):
        continue
    src = q.get("source") or "Unknown"
    by_src[src].append(q)

papers = []
flag_tot = Counter()
wrong_qs = 0
samples = defaultdict(list)

for src, items in sorted(by_src.items(), key=lambda x: (-len(x[1]), x[0])):
    pc = Counter()
    flagged = []
    for q in items:
        fl = classify(q)
        for f in fl:
            pc[f] += 1
            flag_tot[f] += 1
            if len(samples[f]) < 6:
                samples[f].append({
                    "paper": src,
                    "id": q.get("id"),
                    "ch": q.get("chapter"),
                    "stem": strip(q.get("q"))[:140],
                })
        if fl:
            wrong_qs += 1
            if len(flagged) < 8:
                flagged.append({"id": q.get("id"), "ch": q.get("chapter"), "flags": fl})
    papers.append({
        "paper": src,
        "n": len(items),
        "n_wrong": sum(1 for q in items if classify(q)),
        "flags": dict(pc),
        "samples": flagged,
    })

# expensive double classify — recompute n_wrong without double
for p in papers:
    src = p["paper"]
    p["n_wrong"] = sum(1 for q in by_src[src] if classify(q))

display_keys = {
    "html_in_math", "unbalanced_dollar_stem", "array_unclosed", "aligned_unclosed",
    "missing_local_fig", "stem_only_dead_fig", "empty_stem", "mentions_fig_no_img",
    "no_options", "few_options", "letter_stubs", "dead_alcohol_prep", "remote_cdn",
}
n_display = 0
for q in qs:
    if not isinstance(q, dict):
        continue
    fl = classify(q)
    if any(x in display_keys for x in fl):
        n_display += 1

report = {
    "bank": "jee_main.json",
    "papers": len(papers),
    "questions": len(qs),
    "questions_with_any_issue": wrong_qs,
    "questions_display_broken": n_display,
    "flag_totals": dict(flag_tot),
    "papers_with_issues": [p for p in papers if p["n_wrong"]],
    "samples": {k: v for k, v in samples.items()},
    "paper_counts_head": [{"paper": p["paper"], "n": p["n"], "wrong": p["n_wrong"]} for p in papers[:15]],
}
OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
print(json.dumps({
    "papers": len(papers),
    "questions": len(qs),
    "any_issue": wrong_qs,
    "display_broken": n_display,
    "flags": dict(flag_tot),
    "papers_with_wrong": sum(1 for p in papers if p["n_wrong"]),
    "sample_keys": list(samples),
}, indent=2))
