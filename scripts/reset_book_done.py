#!/usr/bin/env python3
"""Keep only books with extracted questions marked as done."""
import json
from pathlib import Path

USB = Path(r"E:\quantrexacademy")
PROG = USB / "marks_data" / "marks_selected" / "extraction_progress.json"
CATALOG = USB / "data" / "books.json"
EXAMS = USB / "marks_data" / "marks_selected" / "exams"


def book_has_questions(book_id: str) -> bool:
    if not CATALOG.exists() or not EXAMS.exists():
        return False
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    title = None
    for b in catalog.get("engineering", []) + catalog.get("medical", []):
        if b.get("id") == book_id:
            title = b.get("title")
            break
    if not title:
        return False
    for d in EXAMS.iterdir():
        if not d.is_dir():
            continue
        if d.name == title or book_id in d.name:
            for qf in d.rglob("questions_all.json"):
                try:
                    if json.loads(qf.read_text(encoding="utf-8")):
                        return True
                except Exception:
                    pass
    return False


def main():
    if not PROG.exists():
        print("No progress file")
        return 0
    data = json.loads(PROG.read_text(encoding="utf-8"))
    old = data.get("done_books", [])
    kept = [bid for bid in old if book_has_questions(bid)]
    removed = [bid for bid in old if bid not in kept]
    data["done_books"] = kept
    PROG.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"Kept {len(kept)} done books, removed {len(removed)}: {removed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())