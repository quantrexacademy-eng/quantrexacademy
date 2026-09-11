#!/usr/bin/env python3
"""Proof-read PYQ Mock full papers for every exam bank used by viewPyqMock."""
from __future__ import annotations
import json, re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANKS = ROOT / "data" / "banks"
INDEX_DIR = ROOT / "data" / "nav" / "pyq_paper_index"
OUT = ROOT / "data" / "_migration" / "pyq_mock_all_exams_proof.json"
TXT = ROOT / "data" / "_migration" / "pyq_mock_all_exams_proof.txt"

IMG = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.I)
DOLLAR_BLOCK = re.compile(r"(?<!\\)\$(.+?)(?<!\\)\$", re.S)
HTML_IN = re.compile(r"<br\s*/?>|</?p>|</?div>|</?span>", re.I)
DOLLAR = re.compile(r"(?<!\\)\$")
DISPLAY = (
    "html_in_math",
    "unbalanced_dollar_stem",
    "array_unclosed",
    "aligned_unclosed",
    "missing_local_fig",
    "stem_only_dead_fig",
    "dead_alcohol_prep",
    "empty_stem",
    "no_options",
    "few_options",
    "mentions_fig_no_img",
    "remote_cdn",
)

TITLES = {
    "aiims": "AIIMS",
    "ap_eamcet": "AP EAMCET",
    "bitsat": "BITSAT",
    "comedk": "COMEDK",
    "iat_iiser": "IAT (IISER)",
    "jee_advanced": "JEE Advanced",
    "jee_main": "JEE Main",
    "jipmer": "JIPMER",
    "kcet": "KCET",
    "kvpy": "KVPY",
    "manipal_met": "Manipal MET",
    "mht_cet": "MHT CET",
    "mht_cet_medical": "MHT CET Medical",
    "nda": "NDA",
    "neet": "NEET",
    "nest_niser": "NEST (NISER)",
    "nta_abhyas_jee_main": "NTA Abhyas JEE Main",
    "nta_abhyas_neet": "NTA Abhyas NEET",
    "ts_eamcet": "TS EAMCET",
    "viteee": "VITEEE",
    "wbjee": "WBJEE",
}


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
    sol = str(q.get("solution") or q.get("explanation") or "")
    plains = [strip(opt_plain(o)) for o in opts]
    issues = []

    for m in DOLLAR_BLOCK.findall(raw):
        if HTML_IN.search(m):
            issues.append("html_in_math")
            break
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
    blob = raw + " ".join(opt_plain(o) for o in opts) + sol
    if "alcohol-prep" in blob:
        issues.append("dead_alcohol_prep")

    emptyish = (not plains) or all(p in ("", "A", "B", "C", "D") for p in plains)
    has_fig_opt = any("<img" in opt_plain(o).lower() for o in opts)
    qtype = str(q.get("questionType") or q.get("type") or "")
    is_num = "numerical" in qtype.lower() or "integer" in qtype.lower() or "nat" in qtype.lower()
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
    return list(dict.fromkeys(issues)), miss


def exam_slugs():
    slugs = sorted(p.stem for p in INDEX_DIR.glob("*.json"))
    return [s for s in slugs if (BANKS / f"{s}.json").is_file()]


def proof_exam(slug):
    path = BANKS / f"{slug}.json"
    print(f"  load {slug} …", flush=True)
    data = json.loads(path.read_text(encoding="utf-8"))
    qs = data.get("questions") if isinstance(data, dict) else data
    if not isinstance(qs, list):
        qs = []
    by_src = defaultdict(list)
    flag_tot = Counter()
    samples = defaultdict(list)
    n_any = n_disp = 0
    miss_paths = Counter()
    papers_bad = []

    for q in qs:
        if not isinstance(q, dict):
            continue
        src = q.get("source") or q.get("paperSource") or q.get("_sourceFull") or "Unknown"
        by_src[src].append(q)

    for src, items in by_src.items():
        pc = Counter()
        flagged = []
        for q in items:
            fl, miss = classify(q)
            for msrc in miss:
                miss_paths[msrc.split("?")[0]] += 1
            for f in fl:
                pc[f] += 1
                flag_tot[f] += 1
                if len(samples[f]) < 4:
                    samples[f].append({
                        "paper": src,
                        "id": q.get("id"),
                        "ch": q.get("chapter") or q.get("subject"),
                        "stem": strip(q.get("q") or q.get("question"))[:120],
                    })
            if fl:
                n_any += 1
                if any(x in DISPLAY for x in fl):
                    n_disp += 1
                if len(flagged) < 6:
                    flagged.append({"id": q.get("id"), "ch": q.get("chapter"), "flags": fl})
        disp_n = sum(1 for q in items if any(x in DISPLAY for x in classify(q)[0]))
        if disp_n:
            papers_bad.append({"paper": src, "n": len(items), "display_broken": disp_n, "flags": dict(pc)})

    papers_bad.sort(key=lambda x: -x["display_broken"])
    return {
        "slug": slug,
        "title": TITLES.get(slug, slug),
        "questions": len(qs),
        "papers": len(by_src),
        "any_issue": n_any,
        "display_broken": n_disp,
        "flags": dict(flag_tot),
        "papers_with_display_issues": len(papers_bad),
        "worst_papers": papers_bad[:8],
        "samples": {k: v for k, v in samples.items()},
        "missing_fig_paths": miss_paths.most_common(8),
    }


def main():
    slugs = exam_slugs()
    print("exams", len(slugs), flush=True)
    exams = []
    grand = Counter()
    tot_q = tot_p = tot_any = tot_disp = 0
    lines = []
    lines.append("PYQ MOCK TEST — ALL EXAMS PROOF READ")
    lines.append("=" * 72)

    for slug in slugs:
        r = proof_exam(slug)
        exams.append(r)
        tot_q += r["questions"]
        tot_p += r["papers"]
        tot_any += r["any_issue"]
        tot_disp += r["display_broken"]
        for k, v in r["flags"].items():
            grand[k] += v
        flags = r["flags"]
        disp_flags = {k: v for k, v in flags.items() if k in DISPLAY}
        other = {k: v for k, v in flags.items() if k not in DISPLAY}
        lines.append("")
        lines.append(f"{r['title']}  ({slug})")
        lines.append(f"  papers {r['papers']}  questions {r['questions']}")
        lines.append(f"  display-broken {r['display_broken']}  any-flag {r['any_issue']}  papers-with-display {r['papers_with_display_issues']}")
        if disp_flags:
            lines.append("  DISPLAY: " + ", ".join(f"{k}={v}" for k, v in sorted(disp_flags.items(), key=lambda x: -x[1])))
        else:
            lines.append("  DISPLAY: none")
        if other:
            lines.append("  OTHER:   " + ", ".join(f"{k}={v}" for k, v in sorted(other.items(), key=lambda x: -x[1])))
        for wp in r["worst_papers"][:3]:
            lines.append(f"    paper {wp['display_broken']}/{wp['n']}  {wp['paper']}")
        for flag in ("html_in_math", "empty_stem", "missing_local_fig", "dead_alcohol_prep", "unbalanced_dollar_stem", "no_options", "few_options", "mentions_fig_no_img", "remote_cdn"):
            for s in r["samples"].get(flag, [])[:2]:
                lines.append(f"    ex {flag} id={s['id']} {s['paper'][:40]} :: {s['stem'][:90]}")

    lines.append("")
    lines.append("=" * 72)
    lines.append(f"TOTAL  exams {len(exams)}  papers {tot_p}  questions {tot_q}")
    lines.append(f"TOTAL  display-broken {tot_disp}  any-flag {tot_any}")
    lines.append("FLAG TOTALS: " + ", ".join(f"{k}={v}" for k, v in grand.most_common()))
    text = "\n".join(lines)
    print(text, flush=True)
    TXT.write_text(text, encoding="utf-8")
    # shrink samples in JSON
    slim = []
    for r in exams:
        slim.append({
            "slug": r["slug"],
            "title": r["title"],
            "questions": r["questions"],
            "papers": r["papers"],
            "any_issue": r["any_issue"],
            "display_broken": r["display_broken"],
            "flags": r["flags"],
            "papers_with_display_issues": r["papers_with_display_issues"],
            "worst_papers": r["worst_papers"][:5],
            "samples": {k: v[:3] for k, v in r["samples"].items()},
            "missing_fig_paths": r["missing_fig_paths"],
        })
    OUT.write_text(json.dumps({
        "exams": len(slim),
        "questions": tot_q,
        "papers": tot_p,
        "display_broken": tot_disp,
        "any_issue": tot_any,
        "flag_totals": dict(grand),
        "by_exam": slim,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", OUT, flush=True)


if __name__ == "__main__":
    main()
