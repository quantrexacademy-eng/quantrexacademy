#!/usr/bin/env python3
"""Fill missing/broken stems, options, keys, solutions in chapter shards.

Student runtime stays Marks-free (STUDENT_MARKS_RUNTIME=false).
USB chapter JSON is the live source: data/banks/chapters/{exam}/{subject}/{chapter}.json
Official records are cached in data/qid_marks/{marksId}.json then applied locally.
A companion Node script uploads the changed docs to Firestore.
"""
from __future__ import annotations

import importlib.util
import json
import re
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CHAPTERS = ROOT / "data" / "banks" / "chapters"
REPORT = ROOT / "data" / "_migration" / "chapter_hydrate_report.json"
DOCS = ROOT / "data" / "_migration" / "chapter_hydrate_docs.jsonl"

spec = importlib.util.spec_from_file_location("h", HERE / "_hydrate_all_from_marks.py")
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)

BROKEN_SOL = re.compile(
    r"\\log\s*_y\s*y|\\log_y\s*y|log_y y|\.-=\\frac|\\ldots\s*\.-=",
    re.I,
)
FORCE_FILES = {
    "jee_main/mathematics/sets-and-relations.json",
}
FETCH_CAP = 1200


def rel(p: Path) -> str:
    return str(p.relative_to(ROOT)).replace("\\", "/")


def chapter_files():
    out = []
    if not CHAPTERS.exists():
        return out
    for p in CHAPTERS.rglob("*.json"):
        if p.name.startswith("_") or "bak" in p.name.lower() or p.name == "index.json":
            continue
        out.append(p)
    return sorted(out)


def sol_broken(s: str) -> bool:
    t = str(s or "")
    if not t.strip():
        return True
    if BROKEN_SOL.search(t):
        return True
    if h.sol_score(t) < 12:
        return True
    return False


def repair_sol_tex(s: str) -> str:
    t = str(s or "")
    t2 = re.sub(r"\\log\s*_y\s*y", r"\\log_e y", t)
    t2 = re.sub(r"\\log_y\s*y", r"\\log_e y", t2)
    t2 = re.sub(r"(\\{0,1}ldots)\s*\.-=", r"\\cdots =", t2)
    t2 = re.sub(r"\.\s*-=\\frac", r" = \\frac", t2)
    return t2


def needs_plus(q) -> list:
    rs = list(h.needs(q) or [])
    if sol_broken(q.get("solution") or ""):
        if "sol" not in rs:
            rs.append("sol")
    return rs


def apply_plus(q, rec):
    ch = list(h.apply_rec(q, rec) or [])
    if rec and rec.get("solution") and sol_broken(q.get("solution") or ""):
        q["solution"] = rec["solution"]
        if "sol" not in ch:
            ch.append("sol")
    fixed = repair_sol_tex(q.get("solution") or "")
    if fixed != (q.get("solution") or ""):
        q["solution"] = fixed
        if "sol" not in ch:
            ch.append("sol_repair")
    return ch


def dump_doc(q, file_rel, extra):
    opts = q.get("options") or []
    norm = []
    for i, o in enumerate(opts):
        if isinstance(o, dict):
            norm.append({"id": o.get("id") or chr(65 + i), "text": o.get("text") or o.get("html") or ""})
        else:
            norm.append({"id": chr(65 + i), "text": str(o or "")})
    return {
        "id": q.get("id"),
        "sourceId": q.get("_marksId") or "",
        "bank": (extra or {}).get("bank") or q.get("exam") or "",
        "exam": q.get("exam") or (extra or {}).get("exam") or "",
        "subject": q.get("subject") or (extra or {}).get("subject") or "",
        "chapter": q.get("chapter") or (extra or {}).get("chapter") or "",
        "questionText": q.get("q") or q.get("question") or "",
        "q": q.get("q") or q.get("question") or "",
        "questionType": q.get("questionType") or q.get("type") or "singleCorrect",
        "options": norm,
        "correctAnswer": q.get("answer"),
        "answer": q.get("answer"),
        "answers": q.get("answers"),
        "correctValue": q.get("correctValue"),
        "solution": q.get("solution") or "",
        "explanation": q.get("explanation") or q.get("solution") or "",
        "source": q.get("source") or "",
        "difficulty": q.get("difficulty") or "",
        "file": file_rel,
        "migrationStatus": "completed",
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "metadata": {"origin": "chapter_hydrate"},
    }


def main():
    t0 = time.time()
    files = chapter_files()
    print("chapter files", len(files), flush=True)

    cache_files = {}
    if h.QIDDIR.exists():
        for p in h.QIDDIR.iterdir():
            if p.suffix == ".json":
                cache_files[p.stem] = p
        print("qid_marks files", len(cache_files), flush=True)

    cache_index = {}
    def rec_for(mid):
        if not mid:
            return None
        if mid in cache_index:
            return cache_index[mid]
        p = cache_files.get(mid)
        if not p:
            return None
        rec = h.parse_cache_file(p)
        if rec:
            cache_index[mid] = rec
        return rec

    want_fetch = []
    seen = set()
    stats = {"questions": 0, "need": 0, "nat": 0, "files": len(files)}

    print("scan pass…", flush=True)
    for i, fp in enumerate(files, 1):
        extra, qs, as_list = h.load_qs(fp)
        if qs is None:
            continue
        file_rel = rel(fp).replace("data/banks/chapters/", "").replace("\\", "/")
        force = file_rel in FORCE_FILES
        for q in qs:
            if not q:
                continue
            stats["questions"] += 1
            if h.is_nat(q):
                stats["nat"] += 1
            rs = needs_plus(q)
            mid = h.mongo_id(q)
            if force or rs:
                stats["need"] += 1
                if mid and mid not in seen and mid not in cache_files:
                    seen.add(mid)
                    want_fetch.append(mid)
        if i % 200 == 0:
            print("  scanned", i, "/", len(files), "need", stats["need"], flush=True)
        del qs

    print("scan", stats, "to_fetch", len(want_fetch), flush=True)
    work = want_fetch[:FETCH_CAP]
    fetched = {}
    n_ok = n_api = n_fail = n_empty = 0
    for i, mid in enumerate(work, 1):
        if h.AUTH_DEAD:
            print("AUTH_DEAD stop", flush=True)
            break
        qid, how, rec = h.fetch_one(mid)
        if rec:
            fetched[qid] = rec
            n_ok += 1
            if how == "api":
                n_api += 1
                time.sleep(0.35)
        elif how == "empty":
            n_empty += 1
        else:
            n_fail += 1
        if i % 20 == 0 or i == len(work):
            print(f"  fetch {i}/{len(work)} ok={n_ok} api={n_api} fail={n_fail}", flush=True)

    changed_q = 0
    files_written = 0
    by_reason = {}
    still_need = {}
    changed_ids = []
    docs_n = 0
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    print("apply pass…", flush=True)
    with DOCS.open("w", encoding="utf-8") as docs_f:
        for fp in files:
            extra, qs, as_list = h.load_qs(fp)
            if qs is None:
                continue
            file_rel = rel(fp).replace("data/banks/chapters/", "").replace("\\", "/")
            force = file_rel in FORCE_FILES
            file_ch = 0
            for q in qs:
                if not q:
                    continue
                rec = None
                mid = h.mongo_id(q)
                if mid and mid in fetched:
                    rec = fetched[mid]
                elif mid:
                    rec = rec_for(mid)
                if rec:
                    ch = apply_plus(q, rec)
                else:
                    ch = []
                    fixed = repair_sol_tex(q.get("solution") or "")
                    if fixed != (q.get("solution") or ""):
                        q["solution"] = fixed
                        ch.append("sol_repair")
                if ch:
                    file_ch += 1
                    changed_q += 1
                    if len(changed_ids) < 12000:
                        changed_ids.append({
                            "file": rel(fp),
                            "id": q.get("id"),
                            "marksId": mid or (rec or {}).get("_marksId"),
                            "ch": ch,
                        })
                    for r in ch:
                        by_reason[r] = by_reason.get(r, 0) + 1
                    docs_f.write(json.dumps(dump_doc(q, rel(fp), extra), ensure_ascii=False) + "\n")
                    docs_n += 1
                elif force:
                    docs_f.write(json.dumps(dump_doc(q, rel(fp), extra), ensure_ascii=False) + "\n")
                    docs_n += 1
                rs = needs_plus(q)
                if rs:
                    for r in rs:
                        still_need[r] = still_need.get(r, 0) + 1
            if file_ch:
                h.write_qs(fp, extra, qs, as_list)
                files_written += 1
                print("wrote", rel(fp), "changed", file_ch, flush=True)

    rep = {
        "scan": stats,
        "applied": changed_q,
        "filesWritten": files_written,
        "by_reason": by_reason,
        "fetched_ok": n_ok,
        "api": n_api,
        "cache_used": len(cache_index),
        "fail": n_fail,
        "empty": n_empty,
        "still_need": still_need,
        "authDead": h.AUTH_DEAD,
        "docs": docs_n,
        "seconds": round(time.time() - t0, 1),
        "changed_ids": changed_ids[:4000],
        "changed_id_count": len(changed_ids),
    }
    REPORT.write_text(json.dumps(rep, indent=2), encoding="utf-8")
    print("APPLIED", changed_q, "files", files_written, by_reason, flush=True)
    print("STILL_NEED", still_need, flush=True)
    print("DOCS", docs_n, "REPORT", REPORT, "sec", rep["seconds"], flush=True)


if __name__ == "__main__":
    main()
