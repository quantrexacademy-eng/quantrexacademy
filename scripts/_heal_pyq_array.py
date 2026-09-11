#!/usr/bin/env python3
"""Undo extra \\end{array}$ closers; add closer only when it balances odd dollars."""
from __future__ import annotations
import json, re
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
QDIR = ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter" / "questions"
END_DOL = re.compile(r"(\\end\{array\})\$")
END_BARE = re.compile(r"(\\end\{array\})(?!\$)")


def odd(s):
    t = str(s or "").replace("$$", "")
    return len(re.findall(r"(?<!\\)\$", t)) % 2 == 1


def heal(s):
    if not isinstance(s, str) or "\\end{array}" not in s:
        return s
    out = s
    if odd(out) and END_DOL.search(out):
        cand = END_DOL.sub(r"\1", out, count=1)
        if not odd(cand):
            out = cand
    if odd(out) and END_BARE.search(out):
        cand = END_BARE.sub(r"\1$", out, count=1)
        if not odd(cand):
            out = cand
    return out


files = 0
fields = 0
still = 0
for fp in QDIR.glob("qz-*.json"):
    data = json.loads(fp.read_text(encoding="utf-8"))
    qs = data.get("questions")
    if not isinstance(qs, list):
        continue
    dirty = False
    for q in qs:
        if not isinstance(q, dict):
            continue
        for field in ("q", "question", "solution", "explanation"):
            raw = q.get(field)
            new = heal(raw)
            if new != raw:
                q[field] = new
                dirty = True
                fields += 1
        opts = q.get("options")
        if isinstance(opts, list):
            nopts, och = [], False
            for o in opts:
                if isinstance(o, str):
                    no = heal(o)
                    nopts.append(no)
                    och = och or no != o
                else:
                    nopts.append(o)
            if och:
                q["options"] = nopts
                dirty = True
        raw2 = str(q.get("q") or "")
        if odd(raw2):
            still += 1
    if dirty:
        fp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        files += 1

print(json.dumps({"files": files, "fields": fields, "still_odd_stems": still}))
