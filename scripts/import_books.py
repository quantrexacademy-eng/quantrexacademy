#!/usr/bin/env python3
"""Import MARKS Selected data into Quantrex digital books format."""
import json
import re
import sys
from pathlib import Path

USB = Path(r"E:\quantrexacademy")
MARKS = USB / "marks_data" / "marks_selected"
OUT_NAV = USB / "data" / "nav" / "books"
OUT_CH = USB / "data" / "books" / "chapters"
OUT_CAT = USB / "data" / "books.json"
OUT_INDEX = USB / "data" / "books_index.json"

# Import shared parsers from import_to_quantrex
sys.path.insert(0, str(USB / "scripts"))
from import_to_quantrex import parse_marks_question, sanitize_content  # noqa: E402

BOOK_QID_START = 300_000


def slug(s):
    return re.sub(r"[^a-zA-Z0-9]+", "_", str(s)).strip("_").lower()[:60] or "item"


def chapter_file_key(book_id, module_id, subject_id, chapter_id):
    return f"{book_id}__{module_id}__{subject_id}__{chapter_id}"


def load_questions_file(path: Path, subject, chapter, book_title):
    if not path.exists():
        return []
    try:
        items = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []
    out = []
    for item in items:
        qid = item.get("_id")
        if not qid:
            continue
        parsed = parse_marks_question(item, 0, subject, chapter, book_title, "Engineering", book_mode=True)
        parsed["_marksId"] = qid
        out.append(parsed)
    return out


def walk_exam_book(book_dir: Path, book_meta):
    book_id = book_meta.get("id") or slug(book_meta.get("title", book_dir.name))
    if not book_id:
        return None
    exam_file = book_dir / "exam.json"
    if not exam_file.exists():
        return None
    exam_data = json.loads(exam_file.read_text(encoding="utf-8"))
    exam_info = exam_data.get("data") or {}
    modules_nav = []
    total_q = 0

    for mod_dir in sorted(book_dir.iterdir()):
        if not mod_dir.is_dir() or mod_dir.name == "exam.json":
            continue
        mod_json = mod_dir / "module.json"
        if not mod_json.exists():
            continue
        mod = json.loads(mod_json.read_text(encoding="utf-8"))
        mid = mod.get("id")
        subjects_nav = []

        ch_meta_file = None
        sid = None
        ch_id_map = {}
        for subj_dir in sorted(mod_dir.iterdir()):
            if not subj_dir.is_dir() or subj_dir.name in ("module.json", "subjects.json"):
                continue
            subject = subj_dir.name.replace("_", " ")
            chapters_nav = []
            ch_meta_file = subj_dir / "chapters.json"
            ch_id_map = {}
            sid = slug(subject)
            if ch_meta_file.exists():
                ch_data = json.loads(ch_meta_file.read_text(encoding="utf-8"))
                subj_block = (ch_data.get("data") or {}).get("subject") or {}
                if subj_block.get("_id"):
                    sid = subj_block["_id"]
                if subj_block.get("title"):
                    subject = subj_block["title"]
                for ch in (ch_data.get("data") or {}).get("chapters", {}).get("chapters") or []:
                    ch_id_map[safe_name(ch.get("title", ""))] = ch.get("_id")
                    ch_id_map[ch.get("title", "")] = ch.get("_id")

            for ch_dir in sorted(subj_dir.iterdir()):
                if not ch_dir.is_dir() or ch_dir.name == "chapters.json":
                    continue
                chapter = ch_dir.name.replace("_", " ")
                qfile = ch_dir / "questions_all.json"
                qs = load_questions_file(qfile, subject, chapter, book_meta["title"])
                if not qs:
                    continue

                ch_id = ch_id_map.get(chapter) or ch_id_map.get(ch_dir.name) or slug(chapter)

                key = chapter_file_key(book_id, mid, sid, ch_id)
                OUT_CH.mkdir(parents=True, exist_ok=True)
                ch_out = OUT_CH / book_id / f"{key}.json"
                ch_out.parent.mkdir(parents=True, exist_ok=True)
                ch_out.write_text(json.dumps({
                    "bookId": book_id,
                    "moduleId": mid,
                    "subjectId": sid,
                    "chapterId": ch_id,
                    "subject": subject,
                    "chapter": chapter,
                    "count": len(qs),
                    "questions": qs,
                }, ensure_ascii=False), encoding="utf-8")

                chapters_nav.append({
                    "id": ch_id,
                    "name": chapter,
                    "count": len(qs),
                    "key": key,
                })
                total_q += len(qs)

            if chapters_nav:
                subjects_nav.append({
                    "id": sid,
                    "name": subject,
                    "count": sum(c["count"] for c in chapters_nav),
                    "chapters": chapters_nav,
                })

        if subjects_nav:
            modules_nav.append({
                "id": mid,
                "title": mod.get("title", mod_dir.name),
                "subtitle": mod.get("subtitle", ""),
                "count": sum(s["count"] for s in subjects_nav),
                "subjects": subjects_nav,
            })

    if not modules_nav:
        return None

    return {
        "id": book_id,
        "title": book_meta["title"],
        "type": "exam",
        "banner": book_meta.get("banner", ""),
        "exam": book_meta.get("exam", "JEE Main"),
        "redirectType": exam_info.get("redirectType", book_meta.get("redirectType", "module")),
        "count": total_q,
        "modules": modules_nav,
    }


def safe_name(name: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', "_", str(name)).strip()[:100] or "untitled"


def walk_curated(mod_dir: Path, mod_meta):
    mod_id = mod_meta["id"]
    subjects_nav = []
    total_q = 0

    for subj_dir in sorted(mod_dir.iterdir()):
        if not subj_dir.is_dir() or subj_dir.name == "subjects.json":
            continue
        subject = subj_dir.name.replace("_", " ")
        chapters_nav = []
        sid = slug(subject)

        ch_meta_file = subj_dir / "chapters.json"
        if ch_meta_file.exists():
            ch_data = json.loads(ch_meta_file.read_text(encoding="utf-8"))
            subj_block = (ch_data.get("data") or {}).get("subject") or {}
            if subj_block.get("_id"):
                sid = subj_block["_id"]

        for ch_dir in sorted(subj_dir.iterdir()):
            if not ch_dir.is_dir() or ch_dir.name == "chapters.json":
                continue
            chapter = ch_dir.name.replace("_", " ")
            qfile = ch_dir / "questions_all.json"
            qs = load_questions_file(qfile, subject, chapter, mod_meta["title"])
            if not qs:
                continue
            ch_id = slug(chapter)
            if ch_meta_file.exists():
                ch_data = json.loads(ch_meta_file.read_text(encoding="utf-8"))
                for ch in (ch_data.get("data") or {}).get("chapters", {}).get("chapters") or []:
                    if ch.get("title") == chapter:
                        ch_id = ch.get("_id", ch_id)
                        break

            key = chapter_file_key(mod_id, mod_id, sid, ch_id)
            ch_out = OUT_CH / mod_id / f"{key}.json"
            ch_out.parent.mkdir(parents=True, exist_ok=True)
            ch_out.write_text(json.dumps({
                "bookId": mod_id,
                "moduleId": mod_id,
                "subjectId": sid,
                "chapterId": ch_id,
                "subject": subject,
                "chapter": chapter,
                "count": len(qs),
                "questions": qs,
            }, ensure_ascii=False), encoding="utf-8")

            chapters_nav.append({"id": ch_id, "name": chapter, "count": len(qs), "key": key})
            total_q += len(qs)

        if chapters_nav:
            subjects_nav.append({
                "id": sid,
                "name": subject,
                "count": sum(c["count"] for c in chapters_nav),
                "chapters": chapters_nav,
            })

    if not subjects_nav:
        return None

    return {
        "id": mod_id,
        "title": mod_meta["title"],
        "type": "curated",
        "tag": mod_meta.get("tag", ""),
        "count": total_q,
        "modules": [{
            "id": mod_id,
            "title": mod_meta["title"],
            "subtitle": "",
            "count": total_q,
            "subjects": subjects_nav,
        }],
    }


def assign_ids(book_index):
    """Assign stable numeric IDs to all book questions."""
    qid = BOOK_QID_START
    id_map = {}
    for book in book_index.get("books", []):
        for mod in book.get("modules", []):
            for subj in mod.get("subjects", []):
                for ch in subj.get("chapters", []):
                    ch_path = OUT_CH / book["id"] / f"{ch['key']}.json"
                    if not ch_path.exists():
                        continue
                    data = json.loads(ch_path.read_text(encoding="utf-8"))
                    for q in data.get("questions", []):
                        marks_id = q.pop("_marksId", None) or q.get("source", "")
                        q["id"] = qid
                        q["_book"] = book["id"]
                        q["_chapterKey"] = ch["key"]
                        q["source"] = book["title"]
                        id_map[qid] = {"bookId": book["id"], "key": ch["key"], "marksId": marks_id}
                        qid += 1
                    ch_path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
                    ch["count"] = len(data.get("questions", []))
    return id_map, qid - BOOK_QID_START


def main():
    if not MARKS.exists():
        print("No marks_selected data. Run extract_marks_selected.py first.")
        return 1

    catalog = json.loads(OUT_CAT.read_text(encoding="utf-8")) if OUT_CAT.exists() else {}
    books_index = {"books": [], "curated": []}
    OUT_NAV.mkdir(parents=True, exist_ok=True)

    exams_root = MARKS / "exams"
    if exams_root.exists():
        all_books = catalog.get("engineering", []) + catalog.get("medical", [])
        meta_by_id = {b["id"]: b for b in all_books}
        meta_by_title = {b["title"]: b for b in all_books}
        for book_dir in sorted(exams_root.iterdir()):
            if not book_dir.is_dir():
                continue
            exam_json = book_dir / "exam.json"
            if not exam_json.exists():
                continue
            exam_raw = json.loads(exam_json.read_text(encoding="utf-8"))
            eid = (exam_raw.get("data") or {}).get("_id") if not exam_raw.get("_error") else None
            meta = meta_by_id.get(eid) or meta_by_title.get(book_dir.name) or {"id": eid or slug(book_dir.name), "title": book_dir.name}
            nav = walk_exam_book(book_dir, meta)
            if nav:
                books_index["books"].append(nav)
                (OUT_NAV / f"{nav['id']}.json").write_text(json.dumps(nav, ensure_ascii=False, indent=2), encoding="utf-8")
                print(f"Imported book: {nav['title']} ({nav['count']} qs)")

    curated_root = MARKS / "curated"
    if curated_root.exists():
        meta_by_id = {c["id"]: c for c in catalog.get("curated", [])}
        for mod_dir in sorted(curated_root.iterdir()):
            if not mod_dir.is_dir():
                continue
            subj_file = mod_dir / "subjects.json"
            if not subj_file.exists():
                continue
            data = json.loads(subj_file.read_text(encoding="utf-8"))
            mid = ((data.get("data") or {}).get("module") or {}).get("id")
            meta = meta_by_id.get(mid, {"id": mid, "title": mod_dir.name})
            nav = walk_curated(mod_dir, meta)
            if nav:
                books_index["curated"].append(nav)
                (OUT_NAV / f"{nav['id']}.json").write_text(json.dumps(nav, ensure_ascii=False, indent=2), encoding="utf-8")
                print(f"Imported curated: {nav['title']} ({nav['count']} qs)")

    _, total = assign_ids(books_index)
    books_index["totalQuestions"] = total
    OUT_INDEX.write_text(json.dumps(books_index, ensure_ascii=False, indent=2), encoding="utf-8")

    # Enrich catalog with counts
    for b in catalog.get("engineering", []):
        match = next((x for x in books_index["books"] if x["id"] == b["id"]), None)
        if match:
            b["count"] = match["count"]
            b["type"] = "exam"
    for c in catalog.get("curated", []):
        match = next((x for x in books_index["curated"] if x["id"] == c["id"]), None)
        if match:
            c["count"] = match["count"]
            c["type"] = "curated"
    OUT_CAT.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\nDone: {len(books_index['books'])} books, {len(books_index['curated'])} curated, {total} questions")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())