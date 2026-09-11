#!/usr/bin/env python3
"""Hydrate remaining CBSE board questions from cache/API and write board_offline pack."""
from __future__ import annotations

import json
import ssl
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
RAW = Path(r"E:\quantrexacademy\marks_data\cbse_board")
OUT = ROOT / "data" / "board_offline"
CFG = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOKEN = CFG["token"]
API = "https://web.getmarks.app"
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


def load_cached(qid):
    p = RAW / "q_cache" / f"{qid}.json"
    if not p.exists():
        return None
    try:
        j = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return None
    d = j.get("data") if isinstance(j, dict) and "data" in j else j
    if isinstance(d, dict) and (d.get("question") or d.get("options") or d.get("_id")):
        return d
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
    source = (paper.get("title") if isinstance(paper, dict) else "") or "CBSE Board"
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
        "exam": "CBSE",
        "examName": "CBSE Board",
        "_bank": "board",
        "questionType": src.get("type") or src.get("questionType") or (list_item or {}).get("type") or "mcq",
        "source": source,
        "paperSource": source,
        "paperDate": paper_date,
    }


def collect_jobs(index):
    jobs = []
    for s in index.get("subjects") or []:
        for ch in s.get("chapters") or []:
            seen = set()
            for sec in ch.get("sections") or []:
                for b in sec.get("buckets") or []:
                    for qid in b.get("ids") or []:
                        qid = str(qid)
                        if qid in seen:
                            continue
                        seen.add(qid)
                        jobs.append((s["name"], ch["name"], qid))
    return jobs


def main():
    index = json.loads((RAW / "index_nav.json").read_text(encoding="utf-8"))
    jobs = collect_jobs(index)
    print("jobs", len(jobs), flush=True)
    full = {}
    miss = 0
    done = 0

    def one(job):
        sname, cname, qid = job
        return sname, cname, qid, fetch_full(qid)

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs = [pool.submit(one, j) for j in jobs]
        for fut in as_completed(futs):
            sname, cname, qid, d = fut.result()
            full[(sname, cname, qid)] = d
            if not d:
                miss += 1
            done += 1
            if done % 200 == 0:
                print(f"hydrated {done}/{len(jobs)} miss={miss}", flush=True)

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "chapters").mkdir(exist_ok=True)
    for s in index["subjects"]:
        for ch in s["chapters"]:
            qs, seen = [], set()
            for sec in ch.get("sections") or []:
                for b in sec.get("buckets") or []:
                    for qid in b.get("ids") or []:
                        qid = str(qid)
                        if qid in seen:
                            continue
                        seen.add(qid)
                        d = full.get((s["name"], ch["name"], qid))
                        qs.append(norm_q(d, s["name"], ch["name"]))
            dest = ROOT / ch["file"]
            save(dest, {"questions": qs})
            ch["count"] = len(qs)
            # keep ids in index for bucket filter; drop nothing
    save(OUT / "index.json", index)
    print("DONE miss", miss, "subjects", [(s["name"], len(s["chapters"]), sum(c["count"] for c in s["chapters"])) for s in index["subjects"]], flush=True)


if __name__ == "__main__":
    main()
