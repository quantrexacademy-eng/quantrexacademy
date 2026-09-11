#!/usr/bin/env python3
"""Second-pass math sanitize: \( \), $$ $$ and leftover nested dollars."""
from __future__ import annotations
import importlib.util
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("h", HERE / "_hydrate_all_from_marks.py")
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)
spec2 = importlib.util.spec_from_file_location("fix", HERE / "_qx_fix_kharab.py")
fix = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(fix)

PAREN = re.compile(r"\\\((.{1,4000}?)\\\)", re.S)
DOLL2 = re.compile(r"\$\$(.{1,8000}?)\$\$", re.S)


def extra(s: str) -> str:
    out = fix.sanitize_math(s)

    def prot_inner(inner):
        if re.search(r"</?[a-zA-Z]", inner):
            return inner
        return inner.replace("<", "\\lt ").replace(">", "\\gt ")

    def p(m):
        return "\\(" + prot_inner(m.group(1)) + "\\)"

    def d(m):
        return "$$" + prot_inner(m.group(1)) + "$$"

    out2 = PAREN.sub(p, out)
    out2 = DOLL2.sub(d, out2)
    return out2


def sanitize_q(q) -> bool:
    ch = False
    for k in ("q", "question", "solution", "sol", "explanation"):
        if not q.get(k):
            continue
        nw = extra(str(q[k]))
        if nw != q[k]:
            q[k] = nw
            ch = True
    opts = q.get("options")
    if isinstance(opts, list):
        new, och = [], False
        for o in opts:
            if isinstance(o, str):
                nw = extra(o)
                och = och or nw != o
                new.append(nw)
            elif isinstance(o, dict):
                o2 = dict(o)
                for kk in ("text", "html"):
                    if o2.get(kk):
                        nw = extra(str(o2[kk]))
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


def main():
    files = fix.f.chapter_files()
    nq = nf = 0
    for i, fp in enumerate(files, 1):
        extra_meta, qs, as_list = h.load_qs(fp)
        if not qs:
            continue
        ch = False
        for q in qs:
            if isinstance(q, dict) and sanitize_q(q):
                nq += 1
                ch = True
        if ch:
            h.write_qs(fp, extra_meta, qs, as_list)
            nf += 1
        if i % 400 == 0:
            print(" ", i, "/", len(files), "q", nq, flush=True)
        del qs
    print("files_changed", nf, "q_changed", nq, flush=True)


if __name__ == "__main__":
    main()
