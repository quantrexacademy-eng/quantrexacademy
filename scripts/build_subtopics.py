#!/usr/bin/env python3
"""Build chapter buckets + topicwise subtopics from MARKS CPYQB API."""
import atexit
import json
import os
import re
import ssl
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

USB = Path(r"E:\quantrexacademy")
MARKS = USB / "marks_data" / "cpyqb" / "exams"
OUT = USB / "data" / "nav" / "chapter_meta"
TOKEN_FILE = USB / "tools" / "marks_token.json"
PROGRESS = USB / "data" / "nav" / "chapter_meta_progress.json"
PROGRESS_BACKUP = USB / "data" / "nav" / f"chapter_meta_progress.{os.getpid()}.json"
LOCK = USB / "data" / "nav" / ".build_subtopics.lock"
ctx = ssl.create_default_context()


def pid_alive(pid):
    try:
        pid = int(pid)
    except (TypeError, ValueError):
        return False
    if sys.platform == "win32":
        import ctypes
        handle = ctypes.windll.kernel32.OpenProcess(0x1000, 0, pid)
        if handle:
            ctypes.windll.kernel32.CloseHandle(handle)
            return True
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def save_progress(done):
    payload = json.dumps({"done": sorted(done)}, indent=2)
    try:
        PROGRESS_BACKUP.write_text(payload, encoding="utf-8")
    except OSError as e:
        print(f"Warning: backup progress write failed ({e})")
    for attempt in range(8):
        try:
            tmp = PROGRESS.with_suffix(".tmp")
            tmp.write_text(payload, encoding="utf-8")
            try:
                tmp.replace(PROGRESS)
            except PermissionError:
                PROGRESS.write_text(payload, encoding="utf-8")
                try:
                    tmp.unlink(missing_ok=True)
                except OSError:
                    pass
            return True
        except (PermissionError, OSError):
            time.sleep(0.5 * (attempt + 1))
    print("Warning: progress file locked — backup saved, will retry on next save.")
    return False


def load_done_set():
    done = set()
    sources = [PROGRESS, PROGRESS_BACKUP]
    sources.extend(sorted(PROGRESS.parent.glob("chapter_meta_progress.*.json")))
    for path in sources:
        if not path.exists():
            continue
        try:
            done.update(json.loads(path.read_text(encoding="utf-8")).get("done") or [])
        except (json.JSONDecodeError, OSError):
            continue
    return done


def acquire_lock():
    if LOCK.exists():
        try:
            lock_pid = LOCK.read_text(encoding="utf-8").strip()
            if lock_pid and pid_alive(lock_pid):
                print(f"Another build_subtopics.py is running (PID {lock_pid}). Exiting.")
                return False
            LOCK.unlink(missing_ok=True)
        except OSError:
            pass
    LOCK.write_text(str(os.getpid()), encoding="utf-8")
    return True


def release_lock():
    try:
        LOCK.unlink(missing_ok=True)
    except OSError:
        pass


def slug(s):
    return re.sub(r"[^a-zA-Z0-9]+", "_", str(s)).strip("_").lower()[:80] or "item"


def load_token():
    if TOKEN_FILE.exists():
        return json.loads(TOKEN_FILE.read_text(encoding="utf-8")).get("token")
    return None


def api_get(path, token, retries=4):
    url = "https://web.getmarks.app" + path
    headers = {"Accept": "application/json", "Authorization": f"Bearer {token}"}
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, context=ctx, timeout=90) as resp:
                return json.loads(resp.read().decode("utf-8"))
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


def extract_question_ids(data):
    if not isinstance(data, dict):
        return []
    block = data.get("data") or {}
    qs = block.get("questions") or []
    ids = []
    for q in qs:
        if isinstance(q, dict):
            qid = q.get("_id")
            if qid:
                ids.append(qid)
    return ids


def fetch_all_topic_questions(eid, sid, cid, tid, token):
    offset, all_ids = 0, []
    while True:
        path = (
            f"/api/v4/cpyqb/exam/{eid}/subject/{sid}/chapter/{cid}"
            f"/topic/{tid}/questions?platform=web&limit=100&offset={offset}"
        )
        data = api_get(path, token)
        if not data or data.get("_error"):
            break
        block = data.get("data") or {}
        qs = block.get("questions") or []
        for q in qs:
            if q.get("_id"):
                all_ids.append(q["_id"])
        showing = block.get("showing") or len(qs)
        total = block.get("total") or 0
        offset += showing
        if not showing or offset >= total:
            break
        time.sleep(0.08)
    return all_ids


def fetch_all_bucket_questions(eid, sid, cid, bid, token):
    offset, all_ids = 0, []
    while True:
        path = (
            f"/api/v4/cpyqb/exam/{eid}/subject/{sid}/chapter/{cid}"
            f"/bucket/{bid}/questions?platform=web&limit=100&offset={offset}"
        )
        data = api_get(path, token)
        if not data or data.get("_error"):
            break
        block = data.get("data") or {}
        qs = block.get("questions") or []
        for q in qs:
            if q.get("_id"):
                all_ids.append(q["_id"])
        showing = block.get("showing") or len(qs)
        total = block.get("total") or 0
        offset += showing
        if not showing or offset >= total:
            break
        time.sleep(0.08)
    return all_ids


def subject_id_map(exam_json):
    mapping = {}
    for s in (exam_json.get("data") or {}).get("subjects") or []:
        title = s.get("title") or ""
        if s.get("_id"):
            mapping[title] = s["_id"]
            mapping[title.replace(" ", "_")] = s["_id"]
    return mapping


def main():
    if not acquire_lock():
        return 1
    atexit.register(release_lock)

    token = load_token()
    if not token:
        print("No MARKS token in tools/marks_token.json")
        return 1

    done = load_done_set()
    if not done:
        print("No progress file — rebuilding from chapter_meta on disk…")
        for meta_file in OUT.rglob("*.json"):
            if meta_file.name.startswith("chapter_meta_progress"):
                continue
            try:
                meta = json.loads(meta_file.read_text(encoding="utf-8"))
                exam = meta.get("examSlug", "")
                subj = meta.get("subject", "")
                ch = meta.get("chapter", "")
                if exam and subj and ch:
                    done.add(f"{exam}/{subj}/{ch}")
            except Exception:
                pass

    OUT.mkdir(parents=True, exist_ok=True)
    built = 0

    for exam_dir in sorted(MARKS.iterdir()):
        if not exam_dir.is_dir():
            continue
        exam_file = exam_dir / "exam.json"
        if not exam_file.exists():
            continue
        exam_raw = json.loads(exam_file.read_text(encoding="utf-8"))
        if exam_raw.get("_error"):
            continue
        eid = (exam_raw.get("data") or {}).get("_id")
        if not eid:
            continue
        exam_slug = slug(exam_dir.name)
        subj_ids = subject_id_map(exam_raw)
        print(f"\nExam: {exam_dir.name}")

        subj_root = exam_dir / "subjects"
        if not subj_root.exists():
            continue

        for subj_dir in sorted(subj_root.iterdir()):
            if not subj_dir.is_dir():
                continue
            subject = subj_dir.name.replace("_", " ")
            sid = subj_ids.get(subject)
            ch_file = subj_dir / "chapters.json"
            if not sid or not ch_file.exists():
                continue
            chapters = json.loads(ch_file.read_text(encoding="utf-8"))
            if not isinstance(chapters, list):
                continue

            for ch in chapters:
                cid = ch.get("_id")
                ctitle = ch.get("title") or ""
                if not cid or not ctitle:
                    continue
                key = f"{exam_slug}/{subject}/{ctitle}"
                out_path = OUT / exam_slug / subject / f"{slug(ctitle)}.json"
                if key in done and out_path.exists():
                    continue

                # Buckets
                buckets_data = api_get(
                    f"/api/v4/cpyqb/exam/{eid}/subject/{sid}/chapter/{cid}/buckets?platform=web",
                    token,
                )
                time.sleep(0.12)
                buckets_out = []
                if buckets_data and not buckets_data.get("_error"):
                    bblock = buckets_data.get("data") or {}
                    style_map = {}
                    for sb in (bblock.get("styles") or {}).get("buckets") or []:
                        ref = sb.get("_id") or sb.get("id") or sb.get("title")
                        if ref is not None and sb.get("bucketLevel") is not None:
                            style_map[str(ref)] = sb.get("bucketLevel")
                    for b in bblock.get("buckets") or []:
                        bid = b.get("_id")
                        if not bid:
                            continue
                        qids = fetch_all_bucket_questions(eid, sid, cid, bid, token)
                        entry = {
                            "id": bid,
                            "title": b.get("title") or "Bucket",
                            "count": len(qids),
                            "questionIds": qids,
                        }
                        lvl = style_map.get(str(bid)) or style_map.get(b.get("title"))
                        if lvl is not None:
                            entry["bucketLevel"] = lvl
                        buckets_out.append(entry)
                        time.sleep(0.1)

                # Topicwise subtopics
                topics_data = api_get(
                    f"/api/v4/cpyqb/exam/{eid}/subject/{sid}/chapter/{cid}/topics?platform=web",
                    token,
                )
                time.sleep(0.12)
                topics_out = []
                if topics_data and not topics_data.get("_error"):
                    block = topics_data.get("data") or {}
                    for t in block.get("topics") or []:
                        tid = t.get("_id")
                        if not tid:
                            continue
                        qids = fetch_all_topic_questions(eid, sid, cid, tid, token)
                        topics_out.append({
                            "id": tid,
                            "title": t.get("title") or "Topic",
                            "count": len(qids) or t.get("totalQs") or 0,
                            "questionIds": qids,
                        })
                        time.sleep(0.1)

                meta = {
                    "examSlug": exam_slug,
                    "examId": eid,
                    "subjectId": sid,
                    "chapterId": cid,
                    "subject": subject,
                    "chapter": ctitle,
                    "buckets": buckets_out,
                    "topics": topics_out,
                }
                out_path.parent.mkdir(parents=True, exist_ok=True)
                out_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
                done.add(key)
                built += 1
                if built % 5 == 0:
                    save_progress(done)
                print(f"  {subject} / {ctitle}: {len(buckets_out)} buckets, {len(topics_out)} topics")

    save_progress(done)
    print(f"\nDone. Built/updated {built} chapter meta files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())