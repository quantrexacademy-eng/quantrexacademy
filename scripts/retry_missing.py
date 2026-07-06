#!/usr/bin/env python3
"""Remove empty chapters from progress so extract_marks.py retries them."""
import json
import re
from pathlib import Path

MARKS = Path(r"E:\quantrexacademy\marks_data")
PROGRESS = MARKS / "extraction_progress.json"
STATS = MARKS / "extraction_stats.json"


def safe_name(name: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', "_", str(name)).strip()[:100] or "untitled"


def main():
    progress = json.loads(PROGRESS.read_text(encoding="utf-8"))
    done = set(progress.get("completed_chapters") or [])
    removed = 0

    for exam_dir in (MARKS / "cpyqb" / "exams").iterdir():
        if not exam_dir.is_dir() or exam_dir.name == "Chapter-wise Previous Year Questions":
            continue
        exam_json = exam_dir / "exam.json"
        if not exam_json.exists():
            continue
        exam_data = json.loads(exam_json.read_text(encoding="utf-8"))
        eid = (exam_data.get("data") or {}).get("_id")
        if not eid:
            continue
        subjects = (exam_data.get("data") or {}).get("subjects") or []
        subj_root = exam_dir / "subjects"
        if not subj_root.exists():
            continue
        for subj_dir in subj_root.iterdir():
            if not subj_dir.is_dir():
                continue
            sid = next((s.get("_id") for s in subjects if safe_name(s.get("title", "")) == subj_dir.name), None)
            if not sid:
                continue
            ch_root = subj_dir / "chapters"
            if not ch_root.exists():
                continue
            ch_list = json.loads((subj_dir / "chapters.json").read_text(encoding="utf-8"))
            ch_by_name = {safe_name(c.get("title", "")): c.get("_id") for c in ch_list}
            for ch_dir in ch_root.iterdir():
                if not ch_dir.is_dir():
                    continue
                cid = ch_by_name.get(ch_dir.name)
                if not cid:
                    continue
                key = f"{eid}/{sid}/{cid}"
                qfile = ch_dir / "questions_all.json"
                n = 0
                if qfile.exists():
                    try:
                        n = len(json.loads(qfile.read_text(encoding="utf-8")))
                    except Exception:
                        n = 0
                if n == 0:
                    if key in done:
                        done.remove(key)
                        removed += 1
                    if qfile.exists():
                        qfile.unlink()

    progress["completed_chapters"] = sorted(done)
    PROGRESS.write_text(json.dumps(progress, indent=2), encoding="utf-8")

    if STATS.exists():
        stats = json.loads(STATS.read_text(encoding="utf-8"))
        stats.pop("finished", None)
        STATS.write_text(json.dumps(stats, indent=2), encoding="utf-8")

    print(f"Queued {removed} empty chapters for retry")
    return removed


if __name__ == "__main__":
    main()