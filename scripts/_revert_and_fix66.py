#!/usr/bin/env python3
"""Revert &#36; → $ (aggressive script damage), then mechanical 66-id repairs only."""
from __future__ import annotations
import json, re
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
AREAS = [
    ROOT / "data" / "banks",
    ROOT / "data" / "books" / "chapters",
    ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter" / "questions",
    ROOT / "data" / "tests" / "jee_main_examgoal_2027" / "questions",
    ROOT / "data" / "ncert_offline" / "chapters",
    ROOT / "data" / "board_offline" / "chapters",
]
BROKEN66 = ROOT / "data" / "_migration" / "broken66.json"

# Literal $ (puzzles / currency) — escape after revert. IDs from broken66 only.
LITERAL_IDS = {
    72642, 96548, 307026, 307559, 307591, 307602,
    307473, 307476, 307477, 307480, 307482, 307484, 307488, 307496,
    307497, 307499, 307507, 307509, 307512, 307513, 307514, 307886,
    307269, 307292,
}


def qs_of(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("questions"), list):
        return data["questions"]
    return None


def odd_dollars(s):
    return len(re.findall(r"(?<!\\)\$", str(s).replace("$$", ""))) % 2 == 1


def repair(s: str) -> str:
    if not s or not isinstance(s, str):
        return s
    out = s

    out = out.replace("$[$.$]", "$[.]$")
    out = re.sub(r"\$\[\s*\$\.\s*\$\]", r"$[.]$", out)
    out = out.replace("$_________.", "_________.")
    out = out.replace("$_________", "_________")
    out = re.sub(r"</math>\s*100\$", "</math> 100", out)
    out = re.sub(r"(?<!\$)(-3\.0\s*V)\$", r"$\1$", out)
    out = re.sub(r"\$y\s*\$\\mathrm\{eV\}", r"$y\\ \\mathrm{eV}$", out)
    out = out.replace("${ }_{11} Na $^{24}$", r"${}_{11}\mathrm{Na}^{24}$")
    out = re.sub(
        r"\$\{\s*\}_{11}\s*Na\s*\$\^\{24\}\$",
        r"${}_{11}\\mathrm{Na}^{24}$",
        out,
    )
    out = re.sub(r"\$\{\s*_11\}\s*Na\s*\$\^\{24\}\$", r"${}_{11}\\mathrm{Na}^{24}$", out)
    out = re.sub(r"(?<!\$)(\\mathrm\{Cr\}\(\\mathrm\{CO\}\)\_6)\$", r"$\1$", out)
    out = re.sub(r"\$25 ml of", r"$25$ ml of", out)
    out = re.sub(r"\$100\\%\\\"\.", r'$100\\%$".', out)
    out = re.sub(
        r"\$\\left\(\\mathrm\{g\}=10\s*(?=<img)",
        r"$(\\mathrm{g}=10)$ ",
        out,
    )
    # List-II leftover closer
    out = re.sub(
        r"(List[\s\-]*II)\s*(\\left\(.+?\\right\))\$",
        r"\1 $\2$",
        out,
        flags=re.I | re.S,
    )
    out = re.sub(
        r"(List[\s\-]*II)(\\begin\{array\})",
        r"\1 $\2",
        out,
        flags=re.I,
    )
    # NDA frequency tables: opening $ \begin{array} ... \end{array}  then English
    out = re.sub(r"(\\end\{array\})\s*\n(?=[A-Z])", r"\1$\n", out)
    out = re.sub(r"(\\end\{array\})\n(What |The total |If the )", r"\1$\n\2", out)
    # Split array then temperature
    if out.lstrip().startswith("\\text") and "\\end{array}$" in out and not out.lstrip().startswith("$"):
        out = "$\\begin{array}{l}" + out
    # Tiny truncated leftover closer only
    if out.rstrip().endswith("=$") and len(out) < 80 and odd_dollars(out):
        out = out.rstrip()[:-1]
    # Trailing unmatched $ after array already opened
    if odd_dollars(out):
        out2 = re.sub(r"(List[\s\-]*II[^$]{0,80})\\left\(", r"\1 $\\left(", out, flags=re.I)
        if not odd_dollars(out2):
            out = out2
        elif re.search(r"\\end\{array\}\$", out) and "\\begin{array}" in out and "$\\begin{array}" not in out and "List" in out:
            out3 = re.sub(r"(List[\s\-]*II)", r"\1 $", out, count=1, flags=re.I)
            if not odd_dollars(out3):
                out = out3
        elif out.rstrip().endswith("$") and not out.rstrip().endswith("$$") and "\\begin{array}" not in out[-40:]:
            cand = out.rstrip()[:-1]
            if not odd_dollars(cand) and len(out) < 120:
                out = cand
    # Black-book OCR fragments (restore TeX delimiters only)
    out = out.replace(r"For a unique value of $\mu and \lambda,$", r"For a unique value of $\mu$ and $\lambda$,")
    out = out.replace(r"$2x + 5y + $\lambda z = \$mu$", r"$2x + 5y + \lambda z = \mu$")
    out = out.replace(r"$2x + 5y + $\lambda z = \\$mu$", r"$2x + 5y + \lambda z = \mu$")
    return out


def walk_json_files():
    files = []
    for area in AREAS:
        if not area.exists():
            continue
        files.extend(area.rglob("*.json") if area.is_dir() else [area])
    return [fp for fp in files if not fp.name.startswith("_") and ".bak" not in fp.name]


def main():
    files = walk_json_files()
    reverted_files = 0
    entity_hits = 0
    for fp in files:
        try:
            raw = fp.read_text(encoding="utf-8")
        except Exception:
            continue
        n = raw.count("&#36;")
        if n:
            entity_hits += n
            fp.write_text(raw.replace("&#36;", "$"), encoding="utf-8")
            reverted_files += 1

    ids = set()
    if BROKEN66.exists():
        for row in json.loads(BROKEN66.read_text(encoding="utf-8")):
            ids.add(row.get("id"))

    changed_files = 0
    changed_qs = 0
    still = []
    touched_ids = set()
    for fp in files:
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        qs = qs_of(data)
        if qs is None:
            continue
        dirty = False
        for q in qs:
            if not isinstance(q, dict):
                continue
            qid = q.get("id")
            if qid not in ids:
                continue
            touched_ids.add(qid)
            literal = qid in LITERAL_IDS

            def fix_field(val):
                if not isinstance(val, str) or not val:
                    return val, False
                new = repair(val)
                if literal:
                    new = new.replace("$", "&#36;")
                return new, new != val

            qdirty = False
            for field in ("q", "question", "solution", "explanation"):
                new, ch = fix_field(q.get(field))
                if ch:
                    q[field] = new
                    qdirty = True
            opts = q.get("options")
            if isinstance(opts, list):
                nopts, och = [], False
                for o in opts:
                    if isinstance(o, str):
                        no, ch = fix_field(o)
                        nopts.append(no)
                        och = och or ch
                    else:
                        nopts.append(o)
                if och:
                    q["options"] = nopts
                    qdirty = True
            if qdirty:
                dirty = True
                changed_qs += 1
            raw2 = str(q.get("q") or q.get("question") or "")
            if odd_dollars(raw2.replace("&#36;", "")) and not literal:
                if re.search(r"\$\$\\mathrm\{", raw2):
                    pass
                else:
                    still.append({"file": str(fp.relative_to(ROOT))[-80:], "id": qid})
        if dirty:
            fp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            changed_files += 1

    missing = [i for i in ids if i not in touched_ids]
    print(json.dumps({
        "reverted_files": reverted_files,
        "entity_hits": entity_hits,
        "changed_files": changed_files,
        "changed_qs": changed_qs,
        "still": still,
        "still_n": len(still),
        "missing_ids": missing[:20],
        "ids_n": len(ids),
        "touched_n": len(touched_ids),
    }, indent=2, default=str))


if __name__ == "__main__":
    main()
