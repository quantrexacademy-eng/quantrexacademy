#!/usr/bin/env python3
"""Dump one chapter (or all jee_main math) to JSONL for Firestore upload."""
import json
import time
from pathlib import Path

ROOT = Path(r"E:\QUANTREX\website")
SRC = ROOT / "data" / "banks" / "chapters" / "jee_main" / "mathematics" / "sets-and-relations.json"
OUT = ROOT / "data" / "_migration" / "sets_relations_docs.jsonl"


def dump_file(fp: Path, outf):
    d = json.loads(fp.read_text(encoding="utf-8"))
    extra = {k: v for k, v in d.items() if k != "questions"} if isinstance(d, dict) else {}
    qs = d.get("questions") if isinstance(d, dict) else d
    n = 0
    for q in qs or []:
        if not q:
            continue
        opts = q.get("options") or []
        norm = []
        for i, o in enumerate(opts):
            if isinstance(o, dict):
                norm.append({"id": o.get("id") or chr(65 + i), "text": o.get("text") or o.get("html") or ""})
            else:
                norm.append({"id": chr(65 + i), "text": str(o or "")})
        doc = {
            "id": q.get("id"),
            "sourceId": q.get("_marksId") or "",
            "bank": extra.get("bank") or "jee_main",
            "exam": q.get("exam") or extra.get("exam") or "JEE Main",
            "subject": q.get("subject") or extra.get("subject") or "",
            "chapter": q.get("chapter") or extra.get("chapter") or "",
            "questionText": q.get("q") or "",
            "q": q.get("q") or "",
            "questionType": q.get("questionType") or q.get("type") or "singleCorrect",
            "options": norm,
            "correctAnswer": q.get("answer"),
            "answer": q.get("answer"),
            "correctValue": q.get("correctValue"),
            "solution": q.get("solution") or "",
            "explanation": q.get("explanation") or q.get("solution") or "",
            "source": q.get("source") or "",
            "difficulty": q.get("difficulty") or "",
            "migrationStatus": "completed",
            "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "metadata": {"origin": "chapter_usb_master"},
            "studentMarksRuntime": False,
        }
        outf.write(json.dumps(doc, ensure_ascii=False) + "\n")
        n += 1
    return n


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        n = dump_file(SRC, f)
    print("wrote", n, "docs", OUT)


if __name__ == "__main__":
    main()
