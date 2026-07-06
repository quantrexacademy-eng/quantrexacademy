#!/usr/bin/env python3
"""Extract MARKS Selected / Digital Books — real questions per book chapter."""
import json
import re
import ssl
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

USB = Path(r"E:\quantrexacademy")
API_BASE = "https://web.getmarks.app"
OUT = USB / "marks_data" / "marks_selected"
TOKEN_FILE = USB / "tools" / "marks_token.json"
ALT_TOKEN = Path(r"C:\Users\Admin\AppData\Local\Temp\marks_token.json")
PROGRESS_FILE = OUT / "extraction_progress.json"
ctx = ssl.create_default_context()
Q_WORKERS = 3
PAGE_SIZE = 50
Q_FETCH_DELAY = 0.15


def api(method, path, token=None, params=None, retries=4):
    url = API_BASE + path
    if params:
        qs = "&".join(f"{k}={urllib.request.quote(str(v))}" for k, v in params.items())
        url += ("&" if "?" in url else "?") + qs
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers, method=method)
            with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
                raw = resp.read()
                return json.loads(raw.decode("utf-8")) if raw else None
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503, 504) and attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            return {"_error": True, "status": e.code}
        except Exception as ex:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            return {"_error": True, "message": str(ex)}
    return None


def save_json(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def safe_name(name: str) -> str:
    return re.sub(r'[<>:"/\\|?*]', "_", str(name)).strip()[:100] or "untitled"


def load_token():
    for p in [TOKEN_FILE, ALT_TOKEN]:
        if p.exists():
            tok = json.loads(p.read_text(encoding="utf-8")).get("token")
            if tok and len(str(tok)) > 20:
                return tok
    return None


def load_progress():
    if PROGRESS_FILE.exists():
        return json.loads(PROGRESS_FILE.read_text(encoding="utf-8"))
    return {"done_chapters": [], "done_books": []}


def save_progress(progress):
    progress["last_update"] = datetime.now(timezone.utc).isoformat()
    save_json(PROGRESS_FILE, progress)


def nested_list(data, *keys):
    cur = data
    for k in keys:
        if not isinstance(cur, dict):
            return []
        cur = cur.get(k) or {}
    if isinstance(cur, list):
        return cur
    if isinstance(cur, dict):
        return cur.get("data") or cur.get("chapters") or cur.get("subjects") or cur.get("questions") or []
    return []


def get_question_full(token, qid, cache_dir: Path):
    out = cache_dir / f"{qid}.json"
    if out.exists():
        try:
            cached = json.loads(out.read_text(encoding="utf-8"))
            if cached.get("_error"):
                out.unlink(missing_ok=True)
            elif cached.get("data"):
                return cached["data"]
            elif cached.get("question"):
                return cached
        except Exception:
            pass
    for attempt in range(6):
        data = api("GET", f"/api/v1/questions/{qid}", token=token, retries=1)
        if isinstance(data, dict) and data.get("_error"):
            if data.get("status") == 429:
                time.sleep(1.5 * (attempt + 1))
                continue
            return None
        save_json(out, data if isinstance(data, dict) else {"data": data})
        if isinstance(data, dict) and data.get("data"):
            time.sleep(Q_FETCH_DELAY)
            return data["data"]
        if isinstance(data, dict) and (data.get("question") or data.get("options")):
            time.sleep(Q_FETCH_DELAY)
            return data
        return None
    return None


def fetch_chapter_question_ids(token, path_prefix, params_base):
    offset, all_ids = 0, []
    while True:
        params = {**params_base, "offset": offset, "limit": PAGE_SIZE, "statusFilter": "all"}
        resp = api("GET", path_prefix, token=token, params=params)
        if isinstance(resp, dict) and resp.get("_error"):
            break
        data = resp.get("data") or {}
        block = data.get("questions") or {}
        if isinstance(block, dict):
            chunk = block.get("questions") or []
            total = block.get("total", 0)
        else:
            chunk = block or []
            total = len(chunk)
        if not chunk:
            break
        for q in chunk:
            qid = q.get("_id")
            if qid:
                all_ids.append(qid)
        offset += len(chunk)
        if offset >= total or len(chunk) < PAGE_SIZE:
            break
        time.sleep(0.04)
    return all_ids


def fetch_full_questions(token, qids, cache_dir: Path, label: str):
    full, failed = [], []

    def one(qid):
        return qid, get_question_full(token, qid, cache_dir)

    with ThreadPoolExecutor(max_workers=Q_WORKERS) as pool:
        futures = [pool.submit(one, qid) for qid in qids]
        for i, fut in enumerate(as_completed(futures)):
            try:
                qid, item = fut.result()
            except Exception:
                qid, item = None, None
            if item and (item.get("question") or item.get("options")):
                full.append(item)
            elif qid:
                failed.append(qid)
            if (i + 1) % 25 == 0:
                print(f"      {label}: {i+1}/{len(qids)}")
    if failed:
        print(f"      {label}: retrying {len(failed)} failed")
        time.sleep(3)
        for qid in failed:
            item = get_question_full(token, qid, cache_dir)
            if item and (item.get("question") or item.get("options")):
                full.append(item)
            time.sleep(Q_FETCH_DELAY)
    return full


def chapter_key(book_id, module_id, subject_id, chapter_id):
    return f"{book_id}__{module_id}__{subject_id}__{chapter_id}"


def extract_chapters_for_module(token, book_id, book_title, mid, mod, book_dir, progress, stats):
    mdir = book_dir / safe_name(mod.get("title", mid))
    save_json(mdir / "module.json", mod)
    subj_resp = api("GET", f"/api/v4/marks-selected/exam/{book_id}/module/{mid}/subjects",
                    token=token, params={"platform": "web"})
    save_json(mdir / "subjects.json", subj_resp)
    subjects = nested_list(subj_resp.get("data") or {}, "subjects", "subjects")
    if not subjects:
        subjects = mod.get("subjects") or []
    for subj in subjects:
        sid = subj.get("_id")
        sname = safe_name(subj.get("title", sid))
        ch_resp = api("GET",
                      f"/api/v4/marks-selected/exam/{book_id}/module/{mid}/subjects/{sid}/chapters",
                      token=token, params={"platform": "web"})
        save_json(mdir / sname / "chapters.json", ch_resp)
        chapters = nested_list(ch_resp.get("data") or {}, "chapters", "chapters")
        for ch in chapters:
            cid = ch.get("_id")
            cname = safe_name(ch.get("title", cid))
            ckey = chapter_key(book_id, mid, sid, cid)
            if ckey in progress.get("done_chapters", []):
                stats["chapters_skipped"] = stats.get("chapters_skipped", 0) + 1
                continue
            cdir = mdir / sname / cname
            path = f"/api/v4/marks-selected/exam/{book_id}/module/{mid}/subjects/{sid}/chapters/{cid}"
            qids = fetch_chapter_question_ids(token, path, {})
            cache = cdir / "cache"
            full = fetch_full_questions(token, qids, cache, f"{book_title}/{cname}")
            if qids and len(full) < max(1, int(len(qids) * 0.85)):
                print(f"    RETRY later {ch.get('title')}: got {len(full)}/{len(qids)} (rate limit?)")
                done = progress.get("done_chapters", [])
                if ckey in done:
                    done.remove(ckey)
                    progress["done_chapters"] = done
                    save_progress(progress)
                time.sleep(5)
                continue
            save_json(cdir / "questions_all.json", full)
            stats["questions"] = stats.get("questions", 0) + len(full)
            stats["chapters"] = stats.get("chapters", 0) + 1
            progress.setdefault("done_chapters", []).append(ckey)
            save_progress(progress)
            print(f"    {mod.get('title')}/{subj.get('title')}/{ch.get('title')}: {len(full)} qs")
            time.sleep(0.3)


def extract_v4_subject_book(token, book, progress, stats):
    book_id = book["id"]
    mid = book.get("moduleId")
    if not mid:
        print(f"  SKIP {book['title']}: no moduleId")
        return False
    book_dir = OUT / "exams" / safe_name(book.get("title", book_id))
    save_json(book_dir / "exam.json", {
        "success": True,
        "data": {"_id": book_id, "mainTitle": book["title"], "redirectType": "subject", "moduleId": mid},
    })
    mod = {"id": mid, "title": book["title"], "subtitle": book.get("exam", "")}
    print(f"  Book (subject): {book['title']}")
    extract_chapters_for_module(token, book_id, book["title"], mid, mod, book_dir, progress, stats)
    return True


def extract_v4_book(token, book, progress, stats):
    if book.get("redirectType") == "subject" and book.get("moduleId"):
        return extract_v4_subject_book(token, book, progress, stats)
    book_id = book["id"]
    book_dir = OUT / "exams" / safe_name(book.get("title", book_id))
    exam_resp = api("GET", f"/api/v4/marks-selected/exam/{book_id}", token=token)
    save_json(book_dir / "exam.json", exam_resp)
    if not exam_resp or (isinstance(exam_resp, dict) and exam_resp.get("_error")):
        err = (exam_resp or {}).get("status") if isinstance(exam_resp, dict) else "no response"
        print(f"  SKIP {book['title']}: API {err}")
        return False

    modules = (exam_resp.get("data") or {}).get("modules") or []
    print(f"  Book: {book['title']} ({len(modules)} modules)")

    for mod in modules:
        if mod.get("isComingSoon"):
            continue
        extract_chapters_for_module(token, book_id, book["title"], mod.get("id"), mod, book_dir, progress, stats)
    return True


def extract_v3_module(token, mod, progress, stats):
    mod_id = mod["id"]
    mod_dir = OUT / "curated" / safe_name(mod.get("title", mod_id))
    subj_resp = api("GET", f"/api/v3/marks-selected/module/{mod_id}/subjects",
                    token=token, params={"platform": "web"})
    save_json(mod_dir / "subjects.json", subj_resp)
    subjects = nested_list(subj_resp.get("data") or {}, "subjects", "subjects")
    print(f"  Curated: {mod['title']} ({len(subjects)} subjects)")

    for subj in subjects:
        sid = subj.get("_id")
        sname = safe_name(subj.get("title", sid))
        ch_resp = api("GET", f"/api/v3/marks-selected/module/{mod_id}/subjects/{sid}/chapters",
                       token=token, params={"platform": "web"})
        save_json(mod_dir / sname / "chapters.json", ch_resp)
        chapters = nested_list(ch_resp.get("data") or {}, "chapters", "chapters")

        for ch in chapters:
            cid = ch.get("_id")
            cname = safe_name(ch.get("title", cid))
            ckey = chapter_key(mod_id, mod_id, sid, cid)
            if ckey in progress.get("done_chapters", []):
                stats["chapters_skipped"] = stats.get("chapters_skipped", 0) + 1
                continue

            cdir = mod_dir / sname / cname
            path = f"/api/v3/marks-selected/module/{mod_id}/subjects/{sid}/chapters/{cid}"
            qids = fetch_chapter_question_ids(token, path, {})
            cache = cdir / "cache"
            full = fetch_full_questions(token, qids, cache, f"{mod['title']}/{cname}")
            if qids and len(full) < max(1, int(len(qids) * 0.85)):
                print(f"    RETRY later {ch.get('title')}: got {len(full)}/{len(qids)}")
                done = progress.get("done_chapters", [])
                if ckey in done:
                    done.remove(ckey)
                    progress["done_chapters"] = done
                    save_progress(progress)
                time.sleep(5)
                continue
            save_json(cdir / "questions_all.json", full)
            stats["questions"] = stats.get("questions", 0) + len(full)
            stats["chapters"] = stats.get("chapters", 0) + 1
            progress.setdefault("done_chapters", []).append(ckey)
            save_progress(progress)
            print(f"    {subj.get('title')}/{ch.get('title')}: {len(full)} qs")
            time.sleep(0.3)


def load_catalog():
    catalog_file = USB / "data" / "books.json"
    if catalog_file.exists():
        return json.loads(catalog_file.read_text(encoding="utf-8"))
    return {"engineering": [], "medical": [], "curated": []}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    token = load_token()
    if not token:
        print("NO TOKEN — save JWT to tools/marks_token.json")
        return 1

    catalog = load_catalog()
    progress = load_progress()
    stats = {"questions": 0, "chapters": 0, "started": datetime.now(timezone.utc).isoformat()}

    print("\n[MARKS Selected — Digital Books]")
    dash = api("GET", "/api/v4/marks-selected/dashboard", token=token)
    save_json(OUT / "dashboard.json", dash)

    books = [b for b in catalog.get("engineering", []) + catalog.get("medical", []) if not b.get("isComingSoon")]
    for book in books:
        if book["id"] in progress.get("done_books", []):
            print(f"  SKIP book (done): {book['title']}")
            continue
        if extract_v4_book(token, book, progress, stats):
            progress.setdefault("done_books", []).append(book["id"])
            save_progress(progress)
        else:
            time.sleep(2)

    print("\n[MARKS Selected — Curated PYQ Modules]")
    for mod in catalog.get("curated", []):
        extract_v3_module(token, mod, progress, stats)

    stats["finished"] = datetime.now(timezone.utc).isoformat()
    save_json(OUT / "extraction_stats.json", stats)
    print("\nDONE", json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())