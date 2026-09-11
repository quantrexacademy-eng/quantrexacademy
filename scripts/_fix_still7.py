#!/usr/bin/env python3
"""Mechanical closer repairs for the 7 leftover unbalanced-$ stems."""
from __future__ import annotations
import json, re
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
TARGETS = {
    3709: ROOT / "data/banks/ap_eamcet.json",
    13472: ROOT / "data/banks/ap_eamcet.json",
    51379: ROOT / "data/banks/kvpy.json",
    86878: ROOT / "data/banks/nest_niser.json",
    113211: ROOT / "data/banks/ts_eamcet.json",
    305785: None,  # book chapter, find
    "bb_adv-area-under-curves_multiple-choice_q19": None,
}


def qs_of(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("questions"), list):
        return data["questions"]
    return []


def odd(s):
    return len(re.findall(r"(?<!\\)\$", str(s).replace("$$", ""))) % 2 == 1


def repair(s: str) -> str:
    out = s
    out = re.sub(r"(\\end\{array\})(?!\$)", r"\1$", out)
    out = re.sub(r"</math>\s*355\$", "</math>", out)
    out = out.replace(r"$y\ \mathrm{eV}$$", r"$y\ \mathrm{eV}$")
    out = out.replace(r"$y $\mathrm{eV}$$", r"$y\ \mathrm{eV}$")
    out = re.sub(r"\$100\\%\"\.", r'$100\\%$".', out)
    out = out.replace("$100\\%\".", '$100\\%$".')
    if out.rstrip().endswith("and $f"):
        out = out.rstrip() + "$"
    return out


def find_book_files():
    out = {}
    for fp in (ROOT / "data/books/chapters").rglob("*.json"):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        for q in qs_of(data):
            if isinstance(q, dict) and q.get("id") in (305785, "bb_adv-area-under-curves_multiple-choice_q19"):
                out[q.get("id")] = fp
    return out


book_map = find_book_files()
changed = []
still = []
seen = set()
files = {p for p in TARGETS.values() if p} | set(book_map.values())
for fp in files:
    data = json.loads(fp.read_text(encoding="utf-8"))
    dirty = False
    for q in qs_of(data):
        if not isinstance(q, dict):
            continue
        qid = q.get("id")
        if qid not in TARGETS and qid not in book_map:
            continue
        seen.add(qid)
        for field in ("q", "question"):
            raw = q.get(field)
            if isinstance(raw, str) and raw:
                new = repair(raw)
                if new != raw:
                    q[field] = new
                    dirty = True
        if isinstance(q.get("options"), list):
            nopts, och = [], False
            for o in q["options"]:
                if isinstance(o, str):
                    no = repair(o)
                    nopts.append(no)
                    och = och or no != o
                else:
                    nopts.append(o)
            if och:
                q["options"] = nopts
                dirty = True
        raw2 = str(q.get("q") or q.get("question") or "")
        if odd(raw2):
            still.append({"id": qid, "file": fp.name, "q": raw2[:180]})
        else:
            changed.append(qid)
    if dirty:
        fp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

print(json.dumps({"balanced": changed, "still": still, "seen": list(seen)}, indent=2, ensure_ascii=False))
