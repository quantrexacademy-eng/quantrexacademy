#!/usr/bin/env python3
"""Proof-read JEE Main PYQ chapter mock tests (Quizrr pack). Never invents content."""
from __future__ import annotations
import json, os, re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
QDIR = ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter" / "questions"
CATDIR = ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter" / "categories"
MANIFEST = ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter" / "manifest.json"
OUT = ROOT / "data" / "_migration" / "pyq_mock_proof.json"

IMG_SRC = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.I)
DOLLAR = re.compile(r"(?<!\\)\$")
LOCAL_IMG = re.compile(r"^(/assets/diagrams/[^?#]+)")


def strip_html(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def odd_dollars(s):
    t = str(s or "").replace("$$", "")
    return len(DOLLAR.findall(t)) % 2 == 1


def opt_text(o):
    if isinstance(o, str):
        return o
    if isinstance(o, dict):
        return str(o.get("text") or o.get("html") or "")
    return str(o or "")


def flags_for(q):
    raw = str(q.get("q") or q.get("question") or "")
    plain = strip_html(raw)
    opts = q.get("options") or []
    sol = str(q.get("solution") or q.get("explanation") or "")
    qtype = str(q.get("questionType") or q.get("type") or "")
    out = []
    if len(plain) < 8 and not IMG_SRC.search(raw):
        out.append("empty_stem")
    if odd_dollars(raw):
        out.append("unbalanced_dollar_stem")
    if "\\begin{array}" in raw and "\\end{array}" not in raw:
        out.append("array_unclosed")
    if re.search(r"List[\s\-]*II\\begin\{array\}", raw, re.I) and "$\\begin{array}" not in raw:
        if odd_dollars(raw):
            out.append("list_array_unopened")
    imgs = IMG_SRC.findall(raw)
    for o in opts:
        imgs += IMG_SRC.findall(opt_text(o))
    imgs += IMG_SRC.findall(sol)
    missing_local = []
    remote = []
    for src in imgs:
        m = LOCAL_IMG.match(src.replace("\\", "/"))
        if m:
            fp = ROOT / m.group(1).lstrip("/")
            if not fp.is_file():
                missing_local.append(src)
        elif src.startswith("http") or src.startswith("//"):
            if "getmarks" in src or "quizrr.in" in src or "cdn-question-pool" in src:
                remote.append(src)
        elif src.startswith("/"):
            fp = ROOT / src.lstrip("/")
            if not fp.is_file():
                missing_local.append(src)
    if missing_local:
        out.append("missing_local_fig")
    if remote:
        out.append("remote_cdn_fig")
    if re.search(r"as shown in (the )?figure|following figure|given figure", raw, re.I) and not imgs:
        out.append("mentions_figure_no_img")

    nopts = len(opts)
    is_num = "numerical" in qtype.lower() or qtype.lower() in ("nat", "integer", "numerical")
    if not is_num:
        if nopts == 0:
            out.append("no_options")
        elif nopts < 4:
            out.append("few_options")
        stubs = 0
        for o in opts:
            t = strip_html(opt_text(o))
            if not t or re.fullmatch(r"[A-Da-d]", t):
                stubs += 1
        if stubs >= 3 and nopts >= 4:
            out.append("letter_stub_options")
    else:
        if q.get("answer") in (None, "", []):
            out.append("nat_no_answer")

    if odd_dollars(sol):
        out.append("unbalanced_dollar_sol")
    if len(strip_html(sol)) < 4 and not IMG_SRC.search(sol):
        out.append("empty_solution")

    # truncated TeX dump
    if raw.rstrip().endswith("$") and len(plain) < 40:
        out.append("tiny_truncated")
    if "\\fr" in raw and "\\frac" not in raw and re.search(r"\\fr(?:ac)?\s*$", raw):
        out.append("truncated_tex")
    return out, missing_local, remote


def main():
    files = sorted(QDIR.glob("qz-*.json"))
    by_flag = Counter()
    samples = defaultdict(list)
    tests = 0
    qs_n = 0
    qid_files = {}
    test_qcount = []
    missing_files_vs_manifest = []

    man = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
    man_ids = {t["id"] for t in man.get("tests") or []}

    file_ids = set()
    for fp in files:
        data = json.loads(fp.read_text(encoding="utf-8"))
        tests += 1
        tid = data.get("id")
        file_ids.add(tid)
        qs = data.get("questions") or []
        test_qcount.append((tid, len(qs), data.get("title")))
        for q in qs:
            if not isinstance(q, dict):
                continue
            qs_n += 1
            qid = q.get("id")
            fl, miss, remote = flags_for(q)
            for f in fl:
                by_flag[f] += 1
                if len(samples[f]) < 8:
                    samples[f].append({
                        "test": tid,
                        "title": data.get("title"),
                        "id": qid,
                        "q": str(q.get("q") or "")[:220],
                        "miss": miss[:2],
                        "remote": remote[:2],
                    })

    # category qids vs files
    cat_missing_qfiles = []
    cat_qid_missing = []
    for catf in CATDIR.glob("*.json"):
        cat = json.loads(catf.read_text(encoding="utf-8"))
        for t in cat.get("tests") or []:
            tid = t.get("id")
            qfile = QDIR / f"qz-{t.get('_quizrrTestId') or ''}.json"
            # find by id
            hit = None
            for fp in files:
                # cheap: we already loaded; skip, check later map
                pass
    # map test id -> file
    id_to_file = {}
    for fp in files:
        try:
            d = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        id_to_file[d.get("id")] = fp.name

    for catf in CATDIR.glob("*.json"):
        cat = json.loads(catf.read_text(encoding="utf-8"))
        for t in cat.get("tests") or []:
            tid = t.get("id")
            if tid not in id_to_file:
                cat_missing_qfiles.append({"cat": catf.name, "id": tid, "title": t.get("title")})

    qcount_odd = [{"id": i, "n": n, "title": t} for i, n, t in test_qcount if n != 25]
    short_tests = [x for x in qcount_odd if x["n"] < 20]
    report = {
        "tests_files": tests,
        "questions": qs_n,
        "manifest_tests": len(man_ids),
        "sync_failed": "Quadratic Equation - Test 4 (no questions)",
        "flags": dict(by_flag),
        "samples": {k: v for k, v in samples.items()},
        "qcount_not_25": len(qcount_odd),
        "qcount_not_25_samples": qcount_odd[:15],
        "short_tests": short_tests[:15],
        "category_tests_without_question_file": cat_missing_qfiles[:20],
        "category_missing_n": len(cat_missing_qfiles),
        "standalone_html_dataRoot": "data/tests/jee_main_pyq_chapter (MISSING — must alias to quizrr folder)",
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({
        "tests_files": tests,
        "questions": qs_n,
        "flags": dict(by_flag),
        "qcount_not_25": len(qcount_odd),
        "short_tests": len(short_tests),
        "cat_missing_n": len(cat_missing_qfiles),
        "sample_keys": list(samples.keys()),
    }, indent=2))


if __name__ == "__main__":
    main()
