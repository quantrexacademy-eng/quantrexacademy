#!/usr/bin/env python3
"""Mechanical official repairs for JEE Main PYQ chapter mocks. Never invents stems/keys/sols."""
from __future__ import annotations
import json, re
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
QDIR = ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter" / "questions"
QID = ROOT / "data" / "qid_marks"
FB = "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/"

ALC_IMG = re.compile(
    r'<img[^>]+src=["\']/assets/qx-figures/alcohol-prep/[^"\']+["\'][^>]*/?>',
    re.I,
)
CDN = re.compile(
    r'https?://cdn-question-pool\.getmarks\.app/([^"\'\s>]+)',
    re.I,
)
END_ARRAY = re.compile(r"(\\end\{array\})(?!\$)")


def strip(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def odd_dollars(s):
    t = str(s or "").replace("$$", "")
    return len(re.findall(r"(?<!\\)\$", t)) % 2 == 1


def to_fb(path):
    from urllib.parse import unquote, quote
    p = "questions/figs/" + unquote(path)
    return FB + quote(p, safe="") + "?alt=media"


def repair_html(s):
    if not isinstance(s, str) or not s:
        return s
    out = ALC_IMG.sub("", s)
    out = CDN.sub(lambda m: to_fb(m.group(1)), out)
    if "\\begin{array}" in out:
        out = END_ARRAY.sub(r"\1$", out)
    return out


def official_from_marks(mid):
    if not mid:
        return None
    p = QID / f"{mid}.json"
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8")).get("data") or {}
    except Exception:
        return None


def marks_sol(d):
    if not isinstance(d, dict):
        return ""
    for k in ("solution", "explanation", "sol", "answerExplanation"):
        v = d.get(k)
        if isinstance(v, str) and strip(v):
            return v
        if isinstance(v, dict):
            t = v.get("text") or v.get("html") or ""
            if strip(t):
                return t
    return ""


def marks_nat(d):
    if not isinstance(d, dict):
        return None
    for k in ("correctValue", "numericalAnswer", "integerAnswer", "natAnswer"):
        v = d.get(k)
        if v is not None and str(v).strip() != "":
            return str(v).strip()
    return None


stats = {
    "files": 0,
    "qs": 0,
    "array_close": 0,
    "alc_strip": 0,
    "cdn_fb": 0,
    "nat_from_cv": 0,
    "nat_from_marks": 0,
    "sol_from_marks": 0,
}

for fp in sorted(QDIR.glob("qz-*.json")):
    data = json.loads(fp.read_text(encoding="utf-8"))
    qs = data.get("questions")
    if not isinstance(qs, list):
        continue
    dirty = False
    for q in qs:
        if not isinstance(q, dict):
            continue
        stats["qs"] += 1
        is_num = "numerical" in str(q.get("questionType") or q.get("type") or "").lower()

        for field in ("q", "question", "solution", "explanation"):
            raw = q.get(field)
            if not isinstance(raw, str) or not raw:
                continue
            new = repair_html(raw)
            if new != raw:
                if ALC_IMG.search(raw):
                    stats["alc_strip"] += 1
                if CDN.search(raw):
                    stats["cdn_fb"] += 1
                if "\\end{array}" in raw and new != raw:
                    stats["array_close"] += 1
                q[field] = new
                dirty = True

        opts = q.get("options")
        if isinstance(opts, list):
            nopts = []
            och = False
            for o in opts:
                if isinstance(o, str):
                    no = repair_html(o)
                    nopts.append(no)
                    if no != o:
                        och = True
                        if ALC_IMG.search(o):
                            stats["alc_strip"] += 1
                        if CDN.search(o):
                            stats["cdn_fb"] += 1
                else:
                    nopts.append(o)
            if och:
                q["options"] = nopts
                dirty = True

        if is_num:
            cv = q.get("correctValue")
            if (q.get("answer") in (None, "", []) or q.get("answers") in (None, [])) and cv not in (None, ""):
                q["answer"] = str(cv)
                q["answers"] = [str(cv)]
                stats["nat_from_cv"] += 1
                dirty = True

        mid = q.get("_marksId")
        need_sol = len(strip(q.get("solution") or "")) < 4
        need_nat = is_num and (q.get("correctValue") in (None, "") and q.get("answer") in (None, "", []))
        if mid and (need_sol or need_nat):
            d = official_from_marks(mid)
            if d:
                if need_nat:
                    nv = marks_nat(d)
                    if nv:
                        q["correctValue"] = nv
                        q["answer"] = nv
                        q["answers"] = [nv]
                        q["questionType"] = "numerical"
                        q["options"] = []
                        stats["nat_from_marks"] += 1
                        dirty = True
                if need_sol:
                    sol = marks_sol(d)
                    if strip(sol):
                        q["solution"] = repair_html(sol)
                        stats["sol_from_marks"] += 1
                        dirty = True

    if dirty:
        fp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        stats["files"] += 1

print(json.dumps(stats, indent=2))
