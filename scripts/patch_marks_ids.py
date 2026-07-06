#!/usr/bin/env python3
"""Add _marksId to bank questions for subtopic/bucket filtering."""
import json
import re
from pathlib import Path

USB = Path(r"E:\quantrexacademy")
MARKS = USB / "marks_data" / "cpyqb" / "exams"
BANKS = USB / "data" / "banks"


def slugify(name):
    return re.sub(r"[^a-zA-Z0-9]+", "_", str(name)).strip("_").lower()[:80]


def main():
    patched = 0
    for exam_dir in sorted(MARKS.iterdir()):
        if not exam_dir.is_dir():
            continue
        slug = slugify(exam_dir.name)
        bank_path = BANKS / f"{slug}.json"
        if not bank_path.exists():
            continue
        bank = json.loads(bank_path.read_text(encoding="utf-8"))
        qs = bank.get("questions") or []
        idx = 0
        for subj_dir in sorted((exam_dir / "subjects").iterdir()):
            if not subj_dir.is_dir():
                continue
            ch_root = subj_dir / "chapters"
            if not ch_root.exists():
                continue
            for ch_dir in sorted(ch_root.iterdir()):
                if not ch_dir.is_dir():
                    continue
                qfile = ch_dir / "questions_all.json"
                if not qfile.exists():
                    continue
                try:
                    items = json.loads(qfile.read_text(encoding="utf-8"))
                except Exception:
                    continue
                for item in items:
                    if idx >= len(qs):
                        break
                    mid = item.get("_id") if isinstance(item, dict) else None
                    if mid:
                        qs[idx]["_marksId"] = mid
                        patched += 1
                    idx += 1
        bank["questions"] = qs
        bank_path.write_text(json.dumps(bank, ensure_ascii=False), encoding="utf-8")
        print(f"Patched {slug}.json — {idx} questions")

    print(f"\nTotal _marksId fields set: {patched}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())