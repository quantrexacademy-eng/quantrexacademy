#!/usr/bin/env python3
"""Extract official HSC Maharashtra Board PYQs into data/board_hsc_offline."""
from __future__ import annotations

import json
import re
import ssl
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
RAW = Path(r"E:\quantrexacademy\marks_data\hsc_board")
OUT = ROOT / "data" / "board_hsc_offline"
CFG = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOKEN = CFG["token"]
API = "https://web.getmarks.app"
HSC = "694ad7d4158e3395c5200f5a"
CTX = ssl.create_default_context()
WORKERS = 8
_GAP = 0.07
_last = 0.0
_lock = threading.Lock()


def api(path, retries=7):
    global _last
    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer " + TOKEN,
        "User-Agent": "Mozilla/5.0",
        "Origin": "https://web.getmarks.app",
        "Referer": "https://web.getmarks.app/",
    }
    for attempt in range(retries):
        with _lock:
            now = time.time()
            wait = _GAP - (now - _last)
            if wait > 0:
                time.sleep(wait)
            _last = time.time()
            try:
                req = urllib.request.Request(API + path, headers=headers)
                with urllib.request.urlopen(req, context=CTX, timeout=90) as r:
                    return json.loads(r.read().decode() or "{}")
            except urllib.error.HTTPError as e:
                if e.code in (429, 502, 503, 504) and attempt < retries - 1:
                    time.sleep(min(25.0, 2.0 * (1.5 ** attempt)))
                    continue
                return {"_error": True, "status": getattr(e, "code", 0)}
            except Exception:
                if attempt < retries - 1:
                    time.sleep(1.2 ** attempt)
                    continue
                return {"_error": True}
    return {"_error": True}


def save(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (s or "").lower()).strip("_")[:80] or "x"


def qtext(d):
    q = (d or {}).get("question") or {}
    if isinstance(q, dict):
        t = str(q.get("text") or "")
        img = q.get("image")
        if isinstance(img, dict):
            img = img.get("url") or img.get("src")
        if img and "<img" not in t.lower():
            t += f'<img src="{img}" alt="">'
        return t
    return str(q or "")


def list_bucket_items(eid, sid, cid, bid):
    items, offset = [], 0
    while True:
        j = api(
            f"/api/v4/bpyqb/exam/{eid}/subject/{sid}/chapter/{cid}/bucket/{bid}"
            f"?offset={offset}&limit=100&platform=web"
        )
        if j.get("_error"):
            break
        block = j.get("data") or {}
        batch = block.get("questions") or []
        items.extend(batch)
        showing = len(batch)
        total = ((block.get("bucket") or {}).get("totalQuestions")) or 0
        offset += showing
        if not showing or (total and offset >= total):
            break
    return items


def load_cached(qid):
    p = RAW / "q_cache" / f"{qid}.json"
    if p.exists():
        try:
            j = json.loads(p.read_text(encoding="utf-8"))
            d = j.get("data") if isinstance(j, dict) and "data" in j else j
            if isinstance(d, dict) and (d.get("question") or d.get("options") or d.get("_id")):
                return d
        except Exception:
            pass
    cbse = Path(r"E:\quantrexacademy\marks_data\cbse_board\q_cache") / f"{qid}.json"
    if cbse.exists():
        try:
            j = json.loads(cbse.read_text(encoding="utf-8"))
            d = j.get("data") if isinstance(j, dict) and "data" in j else j
            if isinstance(d, dict) and (d.get("question") or d.get("options")):
                return d
        except Exception:
            pass
    return None


def fetch_full(qid):
    cached = load_cached(qid)
    if cached:
        return cached
    j = api(f"/api/v1/questions/{qid}")
    if j.get("_error"):
        return None
    d = j.get("data") if isinstance(j, dict) and "data" in j else j
    if isinstance(d, dict) and (d.get("question") or d.get("options") or d.get("_id")):
        save(RAW / "q_cache" / f"{qid}.json", j)
        return d
    return None


def norm_q(d, subject, chapter, list_item=None):
    src = d or {}
    opts = src.get("options") or []
    texts, ans = [], 0
    for i, o in enumerate(opts):
        if isinstance(o, dict):
            ot = str(o.get("text") or "")
            oimg = o.get("image")
            if isinstance(oimg, dict):
                oimg = oimg.get("url") or oimg.get("src")
            if oimg and "<img" not in ot.lower():
                ot += f'<img src="{oimg}" alt="">'
            texts.append(ot)
            if o.get("isCorrect"):
                ans = i
        else:
            texts.append(str(o))
    sol = src.get("solution") or {}
    sol_t = sol.get("text") if isinstance(sol, dict) else str(sol or "")
    qid = src.get("_id") or src.get("id") or (list_item or {}).get("questionId")
    papers = src.get("previousYearPapers") or src.get("yearsAppeared") or []
    if list_item:
        papers = list_item.get("previousYearPapers") or list_item.get("yearsAppeared") or papers
    paper = papers[0] if papers else {}
    source = (paper.get("title") if isinstance(paper, dict) else "") or "HSC Board"
    paper_date = None
    if isinstance(paper, dict):
        paper_date = paper.get("heldOn") or paper.get("date")
    paper_date = paper_date or (list_item or {}).get("previousYear")
    return {
        "id": "board_" + str(qid),
        "_marksId": str(qid),
        "q": qtext(src) or qtext(list_item or {}),
        "options": texts,
        "answer": ans,
        "solution": sol_t or "",
        "subject": subject,
        "chapter": chapter,
        "exam": "HSC",
        "examName": "HSC Board",
        "_bank": "board",
        "questionType": src.get("type") or src.get("questionType") or (list_item or {}).get("type") or "mcq",
        "source": source,
        "paperSource": source,
        "paperDate": paper_date,
    }


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    (RAW / "q_cache").mkdir(exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "chapters").mkdir(exist_ok=True)

    exam = api(f"/api/v4/bpyqb/exam/{HSC}/subjects?platform=web")
    save(RAW / "subjects.json", exam)
    ed = exam.get("data") or {}
    subjects = ed.get("subjects") or []
    print("subjects", [s.get("title") for s in subjects], flush=True)

    index = {"board": "HSC", "examId": HSC, "title": ed.get("title") or "HSC (Maharashtra)", "subjects": []}
    jobs = []

    for s in subjects:
        sname = s.get("title") or ""
        sid = s.get("subjectId")
        if not sid:
            continue
        print("##", sname, flush=True)
        chapters, offset = [], 0
        while True:
            ch = api(
                f"/api/v4/bpyqb/exam/{HSC}/subject/{sid}/chapters"
                f"?limit=50&offset={offset}&sortBy=title&platform=web"
            )
            block = ch.get("data") or {}
            batch = block.get("chapters") or []
            chapters.extend(batch)
            offset += len(batch)
            total = block.get("totalChapters") or 0
            if not batch or (total and offset >= total):
                break
        subj_out = {"id": sid, "name": sname, "chapters": []}
        for c in chapters:
            cid = c.get("chapterId")
            cname = c.get("title") or ""
            if not cid:
                continue
            det = api(
                f"/api/v4/bpyqb/exam/{HSC}/subject/{sid}/chapter/{cid}/details?platform=web"
            )
            dd = det.get("data") or {}
            sections_out = []
            seen = {}
            for sec in dd.get("sections") or []:
                buckets_out = []
                for b in sec.get("buckets") or []:
                    bid = b.get("bucketId")
                    if not bid:
                        continue
                    items = list_bucket_items(HSC, sid, cid, bid)
                    ids = []
                    for it in items:
                        qid = it.get("questionId") or it.get("_id")
                        if not qid:
                            continue
                        qid = str(qid)
                        ids.append(qid)
                        if qid not in seen:
                            seen[qid] = it
                            jobs.append((sname, cname, qid, it))
                    buckets_out.append({
                        "title": b.get("title") or "Questions",
                        "bucketId": bid,
                        "count": len(ids) or int(b.get("totalQuestions") or 0),
                        "ids": ids,
                    })
                sections_out.append({"title": sec.get("title") or "Questions", "buckets": buckets_out})
            file_rel = f"data/board_hsc_offline/chapters/{slug(sname)}_{slug(cname)}.json"
            subj_out["chapters"].append({
                "id": cid,
                "name": cname,
                "count": len(seen) or int(c.get("totalQuestions") or 0),
                "file": file_rel,
                "sections": sections_out,
            })
            print(f"  - {cname}: {len(seen)}", flush=True)
        index["subjects"].append(subj_out)

    print("jobs", len(jobs), flush=True)
    full = {}
    miss = 0
    done = 0

    def one(job):
        sname, cname, qid, item = job
        return sname, cname, qid, item, fetch_full(qid)

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs = [pool.submit(one, j) for j in jobs]
        for fut in as_completed(futs):
            sname, cname, qid, item, d = fut.result()
            full[(sname, cname, qid)] = (d, item)
            if not d:
                miss += 1
            done += 1
            if done % 200 == 0:
                print(f"hydrated {done}/{len(jobs)} miss={miss}", flush=True)

    for s in index["subjects"]:
        for ch in s["chapters"]:
            qs, seen = [], set()
            for sec in ch.get("sections") or []:
                for b in sec.get("buckets") or []:
                    for qid in b.get("ids") or []:
                        if qid in seen:
                            continue
                        seen.add(qid)
                        d, item = full.get((s["name"], ch["name"], qid), (None, None))
                        qs.append(norm_q(d, s["name"], ch["name"], item))
            dest = ROOT / ch["file"]
            save(dest, {"questions": qs})
            ch["count"] = len(qs)
    save(OUT / "index.json", index)
    print("DONE miss", miss, [(s["name"], len(s["chapters"]), sum(c["count"] for c in s["chapters"])) for s in index["subjects"]], flush=True)


if __name__ == "__main__":
    main()
