#!/usr/bin/env python3
"""Remove incomplete chapters from extraction progress so they retry."""
import json
import re
from pathlib import Path

USB = Path(r"E:\quantrexacademy")
PROG = USB / "marks_data" / "marks_selected" / "extraction_progress.json"
ROOT = USB / "marks_data" / "marks_selected" / "exams"


def safe_name(name: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', "_", str(name)).strip()[:100] or "untitled"


def main():
    if not PROG.exists():
        print("No progress file")
        return 0
    data = json.loads(PROG.read_text(encoding="utf-8"))
    done = set(data.get("done_chapters") or [])

    for qf in ROOT.rglob("questions_all.json"):
        try:
            qs = json.loads(qf.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(qs, list):
            continue
        ch_dir = qf.parent
        subj_dir = ch_dir.parent
        mod_dir = subj_dir.parent
        book_dir = mod_dir.parent
        exam_file = book_dir / "exam.json"
        if not exam_file.exists():
            continue
        book_id = (json.loads(exam_file.read_text(encoding="utf-8")).get("data") or {}).get("_id")
        mod = json.loads((mod_dir / "module.json").read_text(encoding="utf-8"))
        mid = mod.get("id")
        ch_meta = subj_dir / "chapters.json"
        if not ch_meta.exists():
            continue
        ch_data = json.loads(ch_meta.read_text(encoding="utf-8"))
        sid = ((ch_data.get("data") or {}).get("subject") or {}).get("_id")
        chapter = ch_dir.name.replace("_", " ")
        cid = None
        expected = 0
        for ch in (ch_data.get("data") or {}).get("chapters", {}).get("chapters") or []:
            if safe_name(ch.get("title", "")) == ch_dir.name or ch.get("title") == chapter:
                cid = ch.get("_id")
                expected = ch.get("questionCount") or ch.get("total") or 0
                break
        if not cid:
            continue
        key = f"{book_id}__{mid}__{sid}__{cid}"
        if len(qs) == 0 or (expected and len(qs) < expected * 0.85):
            if key in done:
                done.discard(key)
                print(f"retry: {chapter} ({len(qs)}/{expected})")

    data["done_chapters"] = sorted(done)
    PROG.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"Progress: {len(done)} completed chapters")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())