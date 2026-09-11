#!/usr/bin/env python3
"""Mechanical proofread of all student JSON: math symbols only. Never invents sols."""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CH = ROOT / "data" / "banks" / "chapters"
BANKS = ROOT / "data" / "banks"
TESTS = ROOT / "data" / "tests"
OUT = ROOT / "data" / "_migration" / "qx_proofread_all_162.json"

KATEX_ERR = re.compile(
    r'<span[^>]*class=["\'][^"\']*katex-error[^"\']*["\'][^>]*>([\s\S]*?)</span>',
    re.I,
)
NEST = re.compile(
    r"\$\s*\\(lt|gt|le|ge|leq|geq|ne|neq|Rightarrow|rightarrow|leftarrow|to|times|div|cdot|pm)\s*\$"
)
CMD = {
    "lt": "\\lt ",
    "gt": "\\gt ",
    "le": "\\le ",
    "ge": "\\ge ",
    "leq": "\\leq ",
    "geq": "\\geq ",
    "ne": "\\ne ",
    "neq": "\\neq ",
    "Rightarrow": "\\Rightarrow ",
    "rightarrow": "\\rightarrow ",
    "leftarrow": "\\leftarrow ",
    "to": "\\to ",
    "times": "\\times ",
    "div": "\\div ",
    "cdot": "\\cdot ",
    "pm": "\\pm ",
}
HTML_TAG = re.compile(
    r"</?(?:span|div|p|br|img|table|td|tr|th|math|mi|mo|mn|mrow|svg|path|"
    r"sub|sup|b|i|em|strong|u|font|a|ul|ol|li|hr|h[1-6]|button|input|section|article)\b",
    re.I,
)
LT_CMP = re.compile(
    r"<(?!/?(?:span|div|p|br|img|table|td|tr|th|math|mi|mo|mn|mrow|svg|path|"
    r"sub|sup|b|i|em|strong|u|font|a|ul|ol|li|hr|h[1-6]|button|input|section|article)\b)",
    re.I,
)
PLACE = re.compile(
    r"solution not available|community solution|support us by uploading|"
    r"official solution is not available|no solution",
    re.I,
)
SKIP_NAMES = {"index.json", "manifest.json"}


def protect_inner(inner: str) -> str:
    t = str(inner or "")
    if re.search(r"smiles", t, re.I):
        return t
    t = t.replace("&lt;", "\\lt ").replace("&gt;", "\\gt ")
    t = t.replace("\\le ft", "\\left").replace("\\ri ght", "\\right")
    if HTML_TAG.search(t):
        t = re.sub(r"<(?=\s*[-+]?\d)", r"\\lt ", t)
        t = re.sub(r">(?=\s*[-+]?\d)", r" \\gt ", t)
        return t
    t = LT_CMP.sub(r"\\lt ", t)
    t = re.sub(r">(?![=])", r" \\gt ", t)
    return t


def sanitize_math(s: str) -> str:
    out = str(s or "")
    if not out:
        return out
    out = KATEX_ERR.sub(r"\1", out)
    out = re.sub(r"ParseError:[^<\n]{0,400}", "", out)
    out = re.sub(r"KaTeX parse error:[^<\n]{0,400}", "", out)
    out = re.sub(r"Unknown node type\s*['\"]?[a-z]+['\"]?", "", out, flags=re.I)
    out = NEST.sub(lambda m: CMD.get(m.group(1), " "), out)

    def dol(m):
        return "$" + protect_inner(m.group(1)) + "$"

    def dol2(m):
        return "$$" + protect_inner(m.group(1)) + "$$"

    def paren(m):
        return "\\(" + protect_inner(m.group(1)) + "\\)"

    def brack(m):
        return "\\[" + protect_inner(m.group(1)) + "\\]"

    out = re.sub(r"\$\$([\s\S]{1,8000}?)\$\$", dol2, out)
    out = re.sub(r"\$([^$]{1,4000})\$", dol, out)
    out = re.sub(r"\\\(([\s\S]{1,4000}?)\\\)", paren, out)
    out = re.sub(r"\\\[([\s\S]{1,8000}?)\\\]", brack, out)
    return out


def sanitize_q(q: dict) -> bool:
    ch = False
    for k in ("q", "question", "stem", "solution", "sol", "explanation"):
        if not q.get(k):
            continue
        nw = sanitize_math(str(q[k]))
        if nw != q[k]:
            q[k] = nw
            ch = True
    opts = q.get("options")
    if isinstance(opts, list):
        new, och = [], False
        for o in opts:
            if isinstance(o, str):
                nw = sanitize_math(o)
                och = och or nw != o
                new.append(nw)
            elif isinstance(o, dict):
                o2 = dict(o)
                for kk in ("text", "html", "q"):
                    if o2.get(kk):
                        nw = sanitize_math(str(o2[kk]))
                        if nw != o2[kk]:
                            o2[kk] = nw
                            och = True
                new.append(o2)
            else:
                new.append(o)
        if och:
            q["options"] = new
            ch = True
    return ch


def load_pack(fp: Path):
    raw = json.loads(fp.read_text(encoding="utf-8"))
    if isinstance(raw, list):
        return raw, None, True
    if isinstance(raw, dict):
        qs = raw.get("questions") or raw.get("qs")
        if isinstance(qs, list):
            return qs, raw, False
    return [], raw, False


def write_pack(fp: Path, qs, wrapper, as_list):
    if as_list:
        fp.write_text(json.dumps(qs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        return
    if isinstance(wrapper, dict):
        if "questions" in wrapper:
            wrapper["questions"] = qs
        elif "qs" in wrapper:
            wrapper["qs"] = qs
        fp.write_text(json.dumps(wrapper, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def iter_json():
    seen = set()
    for base in (CH,):
        if not base.exists():
            continue
        for p in base.rglob("*.json"):
            if p.name in SKIP_NAMES or p.name.startswith("_"):
                continue
            rp = str(p.resolve())
            if rp in seen:
                continue
            seen.add(rp)
            yield p
    if BANKS.exists():
        for p in BANKS.glob("*.json"):
            if p.name in SKIP_NAMES or p.name.startswith("_"):
                continue
            rp = str(p.resolve())
            if rp in seen:
                continue
            seen.add(rp)
            yield p
    if TESTS.exists():
        for p in TESTS.rglob("*.json"):
            if p.name in SKIP_NAMES or p.name.startswith("_"):
                continue
            if "questions" not in p.as_posix().replace("\\", "/"):
                continue
            rp = str(p.resolve())
            if rp in seen:
                continue
            seen.add(rp)
            yield p


def issues_of(q: dict) -> list[str]:
    stem = str(q.get("q") or q.get("question") or "")
    sol = str(q.get("solution") or q.get("sol") or "")
    opts = q.get("options") or []
    blob = stem + " " + sol + " " + " ".join(
        o if isinstance(o, str) else str((o or {}).get("text") or "") for o in opts
    )
    out = []
    if NEST.search(blob):
        out.append("nested_dollar_op")
    if re.search(r"\$[^$]{0,80}<[^$]{0,80}\$", blob):
        out.append("bare_lt_inside_math")
    if re.search(r"katex-error|ParseError:", blob, re.I):
        out.append("katex_error")
    plain = re.sub(r"<[^>]+>", " ", sol)
    plain = re.sub(r"\s+", " ", plain).strip()
    if PLACE.search(plain) or not plain:
        out.append("sol_missing")
    return out


def main():
    files = list(iter_json())
    print("files", len(files), flush=True)
    nq = nf = qs_n = 0
    before = Counter()
    after = Counter()
    for i, fp in enumerate(files, 1):
        try:
            qs, wrap, as_list = load_pack(fp)
        except Exception as e:
            print("skip", fp, e, flush=True)
            continue
        if not qs:
            continue
        qs_n += len(qs)
        ch = False
        for q in qs:
            if not isinstance(q, dict):
                continue
            for k in issues_of(q):
                before[k] += 1
            if sanitize_q(q):
                nq += 1
                ch = True
            for k in issues_of(q):
                after[k] += 1
        if ch:
            write_pack(fp, qs, wrap, as_list)
            nf += 1
        if i % 200 == 0:
            print(" ", i, "/", len(files), "changed_q", nq, "files", nf, flush=True)
        del qs
    report = {
        "files_seen": len(files),
        "questions": qs_n,
        "files_changed": nf,
        "questions_changed": nq,
        "issues_before": dict(before),
        "issues_after": dict(after),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2), flush=True)


if __name__ == "__main__":
    main()
