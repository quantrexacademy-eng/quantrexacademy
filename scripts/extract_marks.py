#!/usr/bin/env python3
"""Extract ALL MARKS premium data to USB — correct v4 API + resume support."""
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

USB_ROOT = Path(r"E:\quantrexacademy")
API_BASE = "https://web.getmarks.app"
OUTPUT_DIR = USB_ROOT / "marks_data"
TOKEN_FILE = USB_ROOT / "tools" / "marks_token.json"
ALT_TOKEN = Path(r"C:\Users\Admin\AppData\Local\Temp\marks_token.json")
PROGRESS_FILE = OUTPUT_DIR / "extraction_progress.json"
ctx = ssl.create_default_context()
UNLOCK = {"isShowAllQs": "true", "isHideOutOfSyllabus": "false"}
Q_WORKERS = 8
Q_PAGE_SIZE = 100


def api(method, path, token=None, params=None, data=None, retries=4):
    url = API_BASE + path
    if params:
        qs = "&".join(f"{k}={urllib.request.quote(str(v))}" for k, v in params.items())
        url += ("&" if "?" in url else "?") + qs
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data is not None else None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=body, headers=headers, method=method)
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
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


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
    return {"completed_chapters": [], "completed_dpp_sets": []}


def save_progress(progress):
    progress["last_update"] = datetime.now(timezone.utc).isoformat()
    save_json(PROGRESS_FILE, progress)


def flatten_exams(chapter_wise):
    exams = []
    for item in (chapter_wise.get("data") or []):
        for stream in item.get("streams") or []:
            for exam in stream.get("exams") or []:
                if exam.get("_id"):
                    exams.append(exam)
    return exams


def get_question_full(token, qid, cache_dir: Path, sleep_on_fetch=False):
    out = cache_dir / f"{qid}.json"
    if out.exists():
        cached = json.loads(out.read_text(encoding="utf-8"))
        if cached.get("data"):
            return cached["data"]
        if cached.get("question"):
            return cached
    data = api("GET", f"/api/v1/questions/{qid}", token=token)
    save_json(out, data)
    if sleep_on_fetch:
        time.sleep(0.05)
    if isinstance(data, dict) and data.get("data"):
        return data["data"]
    return data if isinstance(data, dict) else None


def fetch_chapter_questions(token, all_q_ids, cache_dir: Path, cname: str):
    full_questions = []

    def fetch_one(qitem):
        qid = qitem.get("_id")
        if not qid:
            return None
        return get_question_full(token, qid, cache_dir)

    with ThreadPoolExecutor(max_workers=Q_WORKERS) as pool:
        futures = [pool.submit(fetch_one, q) for q in all_q_ids]
        for qi, fut in enumerate(as_completed(futures)):
            try:
                full = fut.result()
            except Exception:
                full = None
            if full and (full.get("question") or full.get("options")):
                full_questions.append(full)
            if (qi + 1) % 50 == 0:
                print(f"      {cname}: {qi+1}/{len(all_q_ids)} questions")
    return full_questions


def extract_cpyqb(token, root: Path, stats: dict, progress: dict):
    print("\n[CPYQB - Chapter-wise PYQ]")
    mod = root / "cpyqb"
    chapter_wise = api("GET", "/api/v1/cpyqb/chapter-wise", token=token)
    save_json(mod / "exams.json", chapter_wise)
    exam_list = flatten_exams(chapter_wise)
    print(f"  Found {len(exam_list)} exams")

    done_chapters = set(progress.get("completed_chapters") or [])

    for exam in exam_list:
        eid = exam.get("_id")
        ename = safe_name(exam.get("title", eid))
        edir = mod / "exams" / ename
        exam_detail = api("GET", f"/api/v4/cpyqb/exam/{eid}", token=token, params={"platform": "web"})
        save_json(edir / "exam.json", exam_detail)
        if isinstance(exam_detail, dict) and exam_detail.get("_error"):
            print(f"  SKIP {ename}: API error {exam_detail.get('status')}")
            continue

        subjects = (exam_detail.get("data") or {}).get("subjects") or []
        q_meta = next((m.get("description") for m in exam.get("keyPointsMeta") or []
                       if m.get("title") == "Questions"), "?")
        print(f"  Exam: {ename} ({len(subjects)} subjects, ~{q_meta} questions)")

        for subj in subjects:
            sid = subj.get("_id")
            sname = safe_name(subj.get("title", sid))
            sdir = edir / "subjects" / sname
            offset, all_chapters = 0, []
            while True:
                subj_data = api("GET", f"/api/v4/cpyqb/exam/{eid}/subject/{sid}", token=token,
                                params={"platform": "web", "offset": offset, "limit": 25})
                if isinstance(subj_data, dict) and subj_data.get("_error"):
                    break
                chapters = ((subj_data.get("data") or {}).get("chapters") or {}).get("data") or []
                if not chapters:
                    break
                all_chapters.extend(chapters)
                total = ((subj_data.get("data") or {}).get("chapters") or {}).get("total", 0)
                showing = ((subj_data.get("data") or {}).get("chapters") or {}).get("showing", 0)
                offset += showing
                if offset >= total or not showing:
                    break
                time.sleep(0.05)

            save_json(sdir / "chapters.json", all_chapters)
            print(f"    {sname}: {len(all_chapters)} chapters")

            for ch in all_chapters:
                cid = ch.get("_id")
                cname = safe_name(ch.get("title", cid))
                cdir = sdir / "chapters" / cname
                chapter_key = f"{eid}/{sid}/{cid}"
                qfile = cdir / "questions_all.json"

                if chapter_key in done_chapters and qfile.exists():
                    try:
                        n = len(json.loads(qfile.read_text(encoding="utf-8")))
                        print(f"      {cname}: resume skip ({n} cached)")
                        continue
                    except Exception:
                        pass

                q_offset, all_q_ids = 0, []
                while True:
                    qlist = api("GET", f"/api/v3/cpyqb/chapters/{cid}/questions", token=token,
                                params={**UNLOCK, "limit": Q_PAGE_SIZE, "offset": q_offset})
                    if isinstance(qlist, dict) and qlist.get("_error"):
                        break
                    chunk = qlist.get("data") or []
                    if not chunk:
                        break
                    all_q_ids.extend(chunk)
                    if len(chunk) < Q_PAGE_SIZE:
                        break
                    q_offset += Q_PAGE_SIZE
                    time.sleep(0.05)

                full_questions = fetch_chapter_questions(token, all_q_ids, cdir / "questions_cache", cname)

                save_json(qfile, full_questions)
                stats["cpyqb_questions"] = stats.get("cpyqb_questions", 0) + len(full_questions)
                done_chapters.add(chapter_key)
                progress["completed_chapters"] = sorted(done_chapters)
                save_progress(progress)
                save_json(OUTPUT_DIR / "extraction_stats.json", stats)
                print(f"      {cname}: {len(full_questions)} questions saved")


def iter_dpp_sets(chapter_detail):
    data = chapter_detail.get("data") or {}
    for level in data.get("levelWiseDppSets") or []:
        for st in level.get("dppSets") or []:
            yield st


def extract_dpp(token, root: Path, stats: dict, progress: dict):
    print("\n[DPP]")
    mod = root / "dpp"
    landing = api("GET", "/api/v3/dpp/landing/web", token=token, params={"platform": "web"})
    save_json(mod / "landing.json", landing)
    done_sets = set(progress.get("completed_dpp_sets") or [])

    subjects = (landing.get("data") or {}).get("dppSubjects") or []
    for subj in subjects:
        sid = subj.get("subjectId")
        stitle = safe_name(subj.get("subjectTitle", sid))
        sdir = mod / stitle

        chapters = api("GET", f"/api/v4/dpp/subjects/{sid}/chapters", token=token, params={"platform": "web"})
        save_json(sdir / "chapters.json", chapters)
        ch_list = (chapters.get("data") or {}).get("dppChapters") or []

        for ch in ch_list:
            cid = ch.get("_id")
            ctitle = safe_name(ch.get("title", cid))
            cdir = sdir / ctitle
            save_json(cdir / "chapter_meta.json", ch)

            detail = api("GET", f"/api/v4/dpp/subjects/{sid}/chapters/{cid}", token=token, params={"platform": "web"})
            save_json(cdir / "chapter_detail.json", detail)

            for st in iter_dpp_sets(detail):
                set_id = st.get("_id")
                set_key = f"{sid}/{cid}/{set_id}"
                set_dir = cdir / safe_name(st.get("title", set_id))
                save_json(set_dir / "set_meta.json", st)

                if st.get("isLocked"):
                    stats["dpp_locked"] = stats.get("dpp_locked", 0) + 1
                    continue

                if set_key in done_sets and (set_dir / "quiz.json").exists():
                    stats["dpp_sets"] = stats.get("dpp_sets", 0) + 1
                    continue

                quiz = api("GET", f"/api/v3/dpp/quiz/{sid}/{cid}/{set_id}", token=token)
                if quiz and quiz.get("success"):
                    save_json(set_dir / "quiz.json", quiz)
                    qcount = len((quiz.get("data") or {}).get("questions") or [])
                    stats["dpp_questions"] = stats.get("dpp_questions", 0) + qcount
                    stats["dpp_sets"] = stats.get("dpp_sets", 0) + 1
                    done_sets.add(set_key)
                    progress["completed_dpp_sets"] = sorted(done_sets)
                    save_progress(progress)
                    print(f"    {stitle}/{ctitle}/{st.get('title')}: {qcount} qs")
                time.sleep(0.04)


def extract_formula_cards(token, root: Path, stats: dict):
    print("\n[Formula Cards]")
    mod = root / "formula_cards"
    landing = api("GET", "/api/v2/fc/landing", token=token)
    save_json(mod / "landing.json", landing)
    subs = (landing.get("data") or {}).get("subjects") or landing.get("data") or []
    if not isinstance(subs, list):
        return
    for subj in subs:
        sid = subj.get("_id")
        sdir = mod / safe_name(subj.get("title", sid))
        analysis = api("GET", f"/api/v2/fc/subject/{sid}/analysis", token=token)
        save_json(sdir / "analysis.json", analysis)
        for ch in (analysis.get("data") or {}).get("chapters") or []:
            cid = ch.get("_id")
            ch_data = api("GET", f"/api/v2/fc/subject/{sid}/chapter/{cid}", token=token)
            save_json(sdir / safe_name(ch.get("title", cid)) / "chapter.json", ch_data)
            stats["formula_chapters"] = stats.get("formula_chapters", 0) + 1


def extract_quick_concepts(token, root: Path, stats: dict):
    print("\n[Quick Concepts]")
    mod = root / "quick_concepts"
    save_json(mod / "landing.json", api("GET", "/api/v3/qc/landing", token=token))
    save_json(mod / "subjects.json", api("GET", "/api/v3/qc/landing", token=token))
    landing = api("GET", "/api/v3/qc/landing", token=token)
    subject_ids = []
    for s in (landing.get("data") or {}).get("suggestions") or []:
        subj = s.get("qcSubject") or {}
        if subj.get("_id"):
            subject_ids.append((subj["_id"], subj.get("title", subj["_id"])))
    if not subject_ids:
        subject_ids = [
            ("65dcf3d937445f4fe46f420e", "Physics"),
            ("65f032625469774910ab0337", "Chemistry"),
            ("65f033c116c1c6177074b7a8", "Mathematics"),
        ]
    for sid, stitle in subject_ids:
        sdir = mod / safe_name(stitle)
        chapters = api("GET", f"/api/v3/qc/subject/{sid}/chapters", token=token)
        save_json(sdir / "chapters.json", chapters)
        for ch in (chapters.get("data") or {}).get("chapters") or []:
            cid = ch.get("_id")
            cdir = sdir / safe_name(ch.get("title", ch.get("_id")))
            topics = api("GET", f"/api/v3/qc/subject/{sid}/chapter/{cid}/topics", token=token)
            save_json(cdir / "topics.json", topics)
            for topic in (topics.get("data") or {}).get("topics") or []:
                tid = topic.get("_id")
                tdir = cdir / safe_name(topic.get("title", tid))
                save_json(tdir / "concepts.json", api("GET", f"/api/v3/qc/subject/{sid}/chapter/{cid}/topic/{tid}/concepts", token=token))
                save_json(tdir / "examples.json", api("GET", f"/api/v3/qc/subject/{sid}/chapter/{cid}/topic/{tid}/examples", token=token))
                stats["qc_topics"] = stats.get("qc_topics", 0) + 1


def extract_neet_modules(token, root: Path):
    print("\n[NEET Modules]")
    mod = root / "neet"
    for ep, fname, params in [
        ("/api/v4/neet/dashboard", "dashboard.json", None),
        ("/api/v4/neet/books", "books.json", None),
        ("/api/v4/neet/subjects", "subjects_allQsBank.json", {"module": "allQsBank"}),
        ("/api/v4/neet/subjects", "subjects_pyq.json", {"module": "practicePYQs"}),
        ("/api/v4/neet/subjects", "subjects_ncert.json", {"module": "ncertBasedQs"}),
        ("/api/v4/neet/subjects", "subjects_dpp.json", {"module": "DPPs"}),
    ]:
        save_json(mod / fname, api("GET", ep, token=token, params=params))


def extract_account(token, root: Path):
    print("\n[Account + Premium]")
    acc = root / "account"
    for ep in [
        "/api/v1/user/me", "/api/v3/dashboard/platform/web",
        "/api/v4/marks-premium/platform/web", "/api/v1/user/purchases",
        "/api/v4/custom-test/all",
    ]:
        fname = ep.strip("/").replace("/", "_") + ".json"
        save_json(acc / fname, api("GET", ep, token=token, params={"limit": 100, "offset": 0} if "custom-test" in ep else None))


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    token = load_token()
    progress = load_progress()
    stats_path = OUTPUT_DIR / "extraction_stats.json"
    stats = json.loads(stats_path.read_text(encoding="utf-8")) if stats_path.exists() else {}
    stats.update({
        "has_token": bool(token),
        "cpyqb_questions": stats.get("cpyqb_questions", 0),
        "dpp_sets": stats.get("dpp_sets", 0),
        "dpp_questions": stats.get("dpp_questions", 0),
        "output": str(OUTPUT_DIR),
    })
    if not stats.get("started"):
        stats["started"] = datetime.now(timezone.utc).isoformat()
    stats["speed_mode"] = f"{Q_WORKERS} workers, page={Q_PAGE_SIZE}"
    if not token:
        print("NO TOKEN — save JWT to tools/marks_token.json")
        save_json(OUTPUT_DIR / "extraction_stats.json", stats)
        return 1

    print(f"Extracting ALL MARKS premium data to {OUTPUT_DIR}")
    extract_cpyqb(token, OUTPUT_DIR, stats, progress)
    extract_dpp(token, OUTPUT_DIR, stats, progress)
    extract_formula_cards(token, OUTPUT_DIR, stats)
    extract_quick_concepts(token, OUTPUT_DIR, stats)
    extract_neet_modules(token, OUTPUT_DIR)
    extract_account(token, OUTPUT_DIR)

    stats["finished"] = datetime.now(timezone.utc).isoformat()
    save_json(OUTPUT_DIR / "extraction_stats.json", stats)
    print("\nDONE", json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())