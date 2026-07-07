#!/usr/bin/env python3
"""Fix digital book question labels: show book name, not PYQ paper; fix JEE Mains typo."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CH_DIR = ROOT / "data" / "books" / "chapters"
PYQ_SRC = re.compile(r"^(JEE Main|JEE Advanced|NEET) \d{4}", re.I)
JEE_MAINS_TYPO = re.compile(r"\bJEE\s+Mains\b", re.I)


def fix_text(val):
    if not isinstance(val, str) or not val:
        return val, False
    new = JEE_MAINS_TYPO.sub("JEE Main", val)
    return new, new != val


def fix_question(q):
    changed = False
    src = (q.get("source") or "").strip()
    exam = (q.get("examName") or "").strip()
    if PYQ_SRC.match(src) and exam:
        if q.get("paperSource") != src:
            q["paperSource"] = src
            changed = True
        if q.get("source") != exam:
            q["source"] = exam
            changed = True
    for key in ("source", "examName", "q", "solution"):
        if key in q:
            fixed, did = fix_text(q.get(key))
            if did:
                q[key] = fixed
                changed = True
    if isinstance(q.get("options"), list):
        opts = []
        for o in q["options"]:
            fixed, did = fix_text(o)
            opts.append(fixed)
            if did:
                changed = True
        q["options"] = opts
    return changed


def main():
    files = 0
    questions = 0
    fixed_q = 0
    for path in CH_DIR.rglob("*.json"):
        data = json.loads(path.read_text(encoding="utf-8"))
        ch_changed = False
        for q in data.get("questions") or []:
            questions += 1
            if fix_question(q):
                fixed_q += 1
                ch_changed = True
        if ch_changed:
            path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ": ")), encoding="utf-8")
            files += 1
    print(f"Updated {files} chapter files, {fixed_q}/{questions} questions normalized")


if __name__ == "__main__":
    main()