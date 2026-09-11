#!/usr/bin/env python3
"""Mechanical official-format repairs only. Never invent stems."""
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


def qs_of(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("questions"), list):
        return data["questions"]
    return None


def odd_dollars(s):
    return len(re.findall(r"(?<!\\)\$", str(s).replace("$$", ""))) % 2 == 1


def is_puzzle_dollar(s):
    t = str(s or "")
    if re.search(r"A@B means|A\$B means|A#B means|alphanumeric|Directions", t, re.I):
        return True
    if re.search(r"A\s+E\s+%|X Z 9|T \$ 6 U K|1 W E 3 \$ R T", t):
        return True
    if "RAIN is written" in t or "How REMAIN" in t:
        return True
    if re.search(r"US \$\s*\d|current account deficit.*\$\d", t, re.I):
        return True
    return False


def escape_literal_dollars(s):
    return str(s).replace("$", "&#36;")


def repair(s):
    if not s or not isinstance(s, str):
        return s
    out = s
    if is_puzzle_dollar(out):
        return escape_literal_dollars(out)

    out = out.replace("$[$.$]", "[.]")
    out = re.sub(r"\\end\{array\}\$", r"\\end{array}", out)
    out = re.sub(r"(List[\s\-]*II)\\left\(", r"\1 $\\left(", out, flags=re.I)
    out = re.sub(r"\$(_+)", r"\1", out)
    out = re.sub(r"</math>\s*100\$", "</math> 100", out)
    out = re.sub(r"(?<!\$)(-?\d+\.\d+\s*V)\$", r"$\1$", out)
    out = re.sub(r"\$y\s*\$\\mathrm\{eV\}", r"$y\\ \\mathrm{eV}$", out)
    out = re.sub(
        r"\$\{\s*\}_{11}\s*Na\s*\$\^\{24\}\$",
        r"${}_{11}\\mathrm{Na}^{24}$",
        out,
    )
    out = re.sub(r"\$\{\s*_11\}\s*Na\s*\$\^\{24\}\$", r"${}_{11}\\mathrm{Na}^{24}$", out)
    out = out.replace("${ }_{11} Na $^{24}$", r"${}_{11}\mathrm{Na}^{24}$")
    out = re.sub(r"\$\{\s*_11\}Na\s*\$\^\{24\}\$", r"${}_{11}\\mathrm{Na}^{24}$", out)
    # Na^{24} form from dump: ${ }_{11} Na $^{24}$
    out = re.sub(
        r"\$\{\s*\}_\{?11\}?\s*Na\s*\$\^\{24\}\$",
        r"${}_{11}\\mathrm{Na}^{24}$",
        out,
    )

    if odd_dollars(out):
        # leftover close after List header cell
        out2 = re.sub(r"(List[\s\-]*II[^$]{0,80})\\left\(", r"\1 $\\left(", out, flags=re.I)
        if not odd_dollars(out2):
            out = out2
        elif out.rstrip().endswith("$") and not out.rstrip().endswith("$$"):
            cand = out.rstrip()[:-1]
            if not odd_dollars(cand):
                out = cand
        elif "$" in out and not re.search(r"\\[a-zA-Z]", out):
            out = escape_literal_dollars(out)
    return out


changed_files = 0
changed_qs = 0
still = []
for area in AREAS:
    if not area.exists():
        continue
    files = [area] if area.is_file() else list(area.rglob("*.json"))
    for fp in files:
        if fp.name.startswith("_") or ".bak" in fp.name:
            continue
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
            for field in ("q", "question", "solution", "explanation"):
                raw = q.get(field)
                if not isinstance(raw, str) or not raw:
                    continue
                new = repair(raw)
                if new != raw:
                    q[field] = new
                    dirty = True
            opts = q.get("options")
            if isinstance(opts, list):
                nopts = []
                och = False
                for o in opts:
                    if isinstance(o, str):
                        no = repair(o)
                        nopts.append(no)
                        if no != o:
                            och = True
                    else:
                        nopts.append(o)
                if och:
                    q["options"] = nopts
                    dirty = True
            raw2 = str(q.get("q") or q.get("question") or "")
            if odd_dollars(raw2) and not is_puzzle_dollar(raw2):
                if re.search(r"\$\$\\mathrm\{", raw2):
                    pass  # valid display chemistry
                else:
                    still.append({"file": str(fp.relative_to(ROOT))[-70:], "id": q.get("id")})
            elif dirty:
                changed_qs += 1
        if dirty:
            fp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            changed_files += 1

print(json.dumps({"changed_files": changed_files, "changed_qs": changed_qs, "still": still[:20], "still_n": len(still)}, indent=2))
