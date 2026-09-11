#!/usr/bin/env python3
"""Proofread every chapter-bank question: stem, options, solution, figures."""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"E:\QUANTREX\website")
CH = ROOT / "data" / "banks" / "chapters"
OUT = ROOT / "data" / "_migration" / "qx_proofread_qsol_fig.json"

IMG = re.compile(r"<img\b", re.I)
SRC = re.compile(r'\bsrc=["\']([^"\']+)["\']', re.I)
FIG_TALK = re.compile(
    r"\b(shown in (the )?(figure|diagram|graph)|see (the )?figure|"
    r"as shown in (the )?(figure|diagram)|refer (to )?(the )?(figure|diagram)|"
    r"in the (given )?(figure|diagram)|following figure|figure shows|"
    r"diagram shows|as shown below)\b",
    re.I,
)
PLACE_SOL = re.compile(
    r"solution not available|community solution|support us by uploading|"
    r"official solution is not available|no solution|sol not available|"
    r"upload a solution",
    re.I,
)
KATEX_LEAK = re.compile(r"katex-error|ParseError:|KaTeX parse error|Can't use function", re.I)
NESTED_LT = re.compile(r"\$\s*\\(lt|gt|le|ge|leq|geq|Rightarrow)\s*\$")
LOADING = re.compile(r"^loading question|loading options", re.I)


def plain(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def opt_html(o) -> str:
    if isinstance(o, dict):
        return str(o.get("text") or o.get("html") or o.get("q") or "")
    return str(o or "")


def is_nat(q) -> bool:
    t = str(q.get("questionType") or q.get("type") or "")
    if re.search(r"numerical|integer|nat|subjective|fill|written", t, re.I):
        return True
    opts = q.get("options") or []
    if q.get("correctValue") not in (None, "") and len(opts) < 2:
        return True
    return False


def letter_only(opts) -> bool:
    if not opts or len(opts) < 2:
        return False
    vals = [plain(opt_html(o)) for o in opts]
    if any(IMG.search(opt_html(o) or "") for o in opts):
        return False
    return all(re.fullmatch(r"[A-Da-d]?", v or "") for v in vals)


def has_img(blob: str) -> bool:
    return bool(IMG.search(blob or ""))


def srcs(blob: str) -> list[str]:
    return SRC.findall(blob or "")


def classify_src(u: str) -> str:
    u = str(u or "")
    if not u.strip() or u.strip() in ("#", "about:blank"):
        return "empty"
    if "firebasestorage.googleapis.com" in u or "storage.googleapis.com" in u:
        return "firebase"
    if "/assets/" in u or u.startswith("assets/") or u.startswith("/assets/"):
        return "local_assets"
    if "cdn-question-pool" in u or "getmarks" in u:
        return "getmarks_cdn"
    if "quizrr" in u or "cdn.quizrr" in u:
        return "quizrr_cdn"
    if "examgoal" in u:
        return "examgoal_cdn"
    if u.startswith("http"):
        return "foreign_http"
    return "other"


def load_qs(p: Path):
    raw = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        return raw.get("questions") or raw.get("qs") or []
    return raw if isinstance(raw, list) else []


def issues_for(q: dict, exam: str, subj: str, chap: str) -> list[dict]:
    out = []
    qid = q.get("id") or q.get("_marksId")
    stem = str(q.get("q") or q.get("question") or q.get("stem") or "")
    sol = str(q.get("solution") or q.get("sol") or q.get("explanation") or "")
    opts = q.get("options") or []
    blob = stem + " " + sol + " " + " ".join(opt_html(o) for o in opts)
    sp = plain(stem)
    sop = plain(sol)
    nat = is_nat(q)

    def add(kind, detail=""):
        out.append({
            "id": qid, "exam": exam, "subject": subj, "chapter": chap,
            "kind": kind, "detail": detail[:180], "nat": nat,
        })

    if LOADING.search(sp) or len(sp) < 12:
        add("stem_empty_or_stub", sp[:80])
    if not nat:
        filled = 0
        for o in opts:
            t = plain(opt_html(o))
            if IMG.search(opt_html(o) or "") or (t and not re.fullmatch(r"[A-Da-d]", t)):
                filled += 1
        if len(opts) < 2:
            add("mcq_missing_options", f"n={len(opts)}")
        elif filled < 2:
            add("mcq_empty_or_letter_opts", f"n={len(opts)} filled={filled}")
        ans = q.get("answer")
        if ans in (None, "", "None"):
            add("mcq_no_answer_key")
    else:
        cv = q.get("correctValue")
        ans = q.get("answer")
        if cv in (None, "") and (ans in (None, "", "None") or isinstance(ans, int)):
            # numerical may store numeric answer in `answer` as string
            if not (isinstance(ans, str) and re.search(r"\d", ans)):
                add("nat_no_correct_value")

    if PLACE_SOL.search(sop) or not sop:
        add("sol_missing_placeholder", sop[:80])
    elif len(sop) < 40:
        add("sol_too_short", sop[:80])

    if FIG_TALK.search(blob) and not has_img(blob):
        add("fig_talk_no_image", sp[:80])

    for u in srcs(blob):
        kind = classify_src(u)
        if kind in ("empty", "getmarks_cdn", "quizrr_cdn", "examgoal_cdn", "foreign_http"):
            add("fig_src_" + kind, u[:120])

    if KATEX_LEAK.search(blob):
        add("katex_error_leaked")
    if NESTED_LT.search(blob):
        add("nested_dollar_lt_le")
    if re.search(r"\$[^$]{0,80}<[^$]{0,80}\$", blob):
        add("bare_lt_inside_math")

    return out


def main():
    totals = Counter()
    by_kind = Counter()
    by_exam = defaultdict(Counter)
    sets_issues = []
    samples = defaultdict(list)
    files = 0
    qs_n = 0

    for p in sorted(CH.rglob("*.json")):
        if p.name in ("index.json", "manifest.json"):
            continue
        rel = p.relative_to(CH).as_posix()
        parts = rel.split("/")
        exam = parts[0] if parts else "?"
        subj = parts[1] if len(parts) > 1 else "?"
        chap = p.stem
        try:
            qs = load_qs(p)
        except Exception as e:
            totals["file_parse_fail"] += 1
            samples["file_parse_fail"].append({"file": rel, "err": str(e)[:120]})
            continue
        files += 1
        qs_n += len(qs)
        for q in qs:
            if not isinstance(q, dict):
                continue
            issues = issues_for(q, exam, subj, chap)
            if exam == "jee_main" and chap == "sets-and-relations":
                sets_issues.extend(issues)
            for it in issues:
                by_kind[it["kind"]] += 1
                by_exam[exam][it["kind"]] += 1
                if len(samples[it["kind"]]) < 8:
                    samples[it["kind"]].append(it)

    report = {
        "files": files,
        "questions": qs_n,
        "issue_counts": dict(by_kind),
        "by_exam": {k: dict(v) for k, v in sorted(by_exam.items())},
        "samples": {k: v for k, v in samples.items()},
        "sets_and_relations": {
            "path": "jee_main/mathematics/sets-and-relations.json",
            "n_issues": len(sets_issues),
            "issues": sets_issues,
            "by_kind": dict(Counter(i["kind"] for i in sets_issues)),
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "files": files,
        "questions": qs_n,
        "issue_counts": dict(by_kind.most_common()),
        "sets_and_relations": report["sets_and_relations"]["by_kind"],
        "out": str(OUT),
    }, indent=2))


if __name__ == "__main__":
    main()
