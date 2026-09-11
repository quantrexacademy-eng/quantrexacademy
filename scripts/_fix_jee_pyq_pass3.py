#!/usr/bin/env python3
from __future__ import annotations
import json, re
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK = ROOT / "data" / "banks" / "jee_main.json"
BR = re.compile(r"<br\s*/?>", re.I)


def odd(s):
    t = str(s or "").replace("$$", "")
    return len(re.findall(r"(?<!\\)\$", t)) % 2 == 1


def heal(s):
    if not isinstance(s, str) or not s:
        return s
    out = s
    # br inside $
    out = re.sub(
        r"\$(?!\$)([^$]*?)\$",
        lambda m: ("$" + BR.sub(r" \\\\ ", m.group(1)) + "$") if BR.search(m.group(1)) else m.group(0),
        out,
    )
    # extra $$ after a closed mathrm group
    out = out.replace(r"\mathrm{H}_{14}$$", r"\mathrm{H}_{14}$")
    out = re.sub(r"(\}\$\$)(?=\.|\s)", r"}$", out)
    if odd(out):
        wrapped = re.sub(
            r"(?<![\\$])([A-Z][A-Za-z]{0,6}_(?:\{)?\d+(?:\})?(?:\^[+\-–−]?)?)\$",
            r"$\1$",
            out,
        )
        if not odd(wrapped):
            out = wrapped
        elif odd(wrapped) == odd(out):
            # same parity; still try if fewer odd... skip
            pass
        else:
            # if wrapped reduced oddness keep if even
            if not odd(wrapped):
                out = wrapped
    if odd(out):
        wrapped = re.sub(
            r"(?<![\\$])([A-Z][A-Za-z]{0,6}_(?:\{)?\d+(?:\})?\^-)\$",
            r"$\1$",
            out,
        )
        if not odd(wrapped):
            out = wrapped
    return out


print("load")
data = json.loads(BANK.read_text(encoding="utf-8"))
n = 0
for q in data["questions"]:
    if not isinstance(q, dict):
        continue
    dirty = False
    for field in ("q", "question", "solution", "explanation"):
        raw = q.get(field)
        if not isinstance(raw, str):
            continue
        new = heal(raw)
        if new != raw:
            q[field] = new
            dirty = True
    if dirty:
        n += 1
print("changed", n)
BANK.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
print("ok")
