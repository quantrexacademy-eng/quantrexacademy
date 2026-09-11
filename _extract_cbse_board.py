#!/usr/bin/env python3
"""Extract official CBSE Board PYQs from Marks bpyqb into data/board_offline."""
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
RAW = Path(r"E:\quantrexacademy\marks_data\cbse_board")
OUT = ROOT / "data" / "board_offline"
Q_POOLS = [
    Path(r"E:\quantrexacademy\marks_data\qid_cache"),
    Path(r"E:\quantrexacademy\marks_data\medical_live\q_pool"),
    RAW / "q_cache",
]
CFG = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOKEN = CFG["token"]
API = "https://web.getmarks.app"
CBSE = "6943ebc753e4e1880190efca"
CTX = ssl.create_default_context()
WORKERS = 4
_GAP = 0.12
_last = 0.0
_lock = threading.Lock()


def api(path: str, retries=8):
    global _last
    url = API + path
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
                req = urllib.request.Request(url, headers=headers, method="GET")
                with urllib.request.urlopen(req, context=CTX, timeout=90) as r:
                    raw = r.read()
                    return json.loads(raw.decode() or "{}")
            except urllib.error.HTTPError as e:
                if e.code in (429, 502, 503, 504) and attempt < retries - 1:
                    time.sleep(min(40.0, 2.5 * (1.6 ** attempt)))
                    continue
                try:
                    body = e.read().decode()[:160]
                except Exception:
                    body = ""
                return {"_error": True, "status": e.code, "body": body}
            except Exception as ex:
                if attempt < retries - 1:
                    time.sleep(1.4 ** attempt)
                    continue
                return {"_error": True, "message": str(ex)}
    return {"_error": True}


def save(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (s or "").lower()).strip("_")[:80] or "x"


def qtext(d):
    q = d.get("question") or {}
    if isinstance(q, dict):
        t = str(q.get("text") or "")
        img = q.get("image")
        if isinstance(img, dict):
            img = img.get("url") or img.get("src")
        if img and "<img" not in t.lower():
            t += f'<img src="{img}" alt="">'
        return t
    return str(q or "")


def norm_q(d, subject, chapter, list_item=None):
    opts = d.get("options") or []
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
    sol = d.get("solution") or {}
    sol_t = sol.get("text") if isinstance(sol, dict) else str(sol or "")
    qid = d.get("_id") or d.get("id")
    papers = d.get("previousYearPapers") or d.get("yearsAppeared") or []
    if list_item:
        papers = list_item.get("previousYearPapers") or list_item.get("yearsAppeared") or papers
        qid = qid or list_item.get("questionId") or list_item.get("_id")
    paper = papers[0] if papers else {}
    source = (paper.get("title") if isinstance(paper, dict) else "") or "CBSE Board"
    paper_date = None
    if isinstance(paper, dict):
        paper_date = paper.get("heldOn") or paper.get("date")
    paper_date = paper_date or (list_item or {}).get("previousYear") or d.get("previousYear")
    return {
        "id": "board_" + str(qid),
        "_marksId": str(qid),
        "q": qtext(d) or qtext(list_item or {}),
        "options": texts,
        "answer": ans,
        "solution": sol_t or "",
        "subject": subject,
        "chapter": chapter,
        "exam": "CBSE",
        "examName": "CBSE Board",
        "_bank": "board",
        "questionType": d.get("type") or d.get("questionType") or (list_item or {}).get("type") or "mcq",
        "source": source,
        "paperSource": source,
        "paperDate": paper_date,
    }


def load_cached(qid: str):
    for pool in Q_POOLS:
        p = pool / f"{qid}.json"
        if not p.exists():
            continue
        try:
            j = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        d = j.get("data") if isinstance(j, dict) and "data" in j else j
        if isinstance(d, dict) and (d.get("question") or d.get("options")):
            return d
    return None


def fetch_full(qid: str):
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


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "chapters").mkdir(exist_ok=True)
    (RAW / "q_cache").mkdir(parents=True, exist_ok=True)

    exam = api(f"/api/v4/bpyqb/exam/{CBSE}/subjects?platform=web")
    save(RAW / "subjects.json", exam)
    ed = exam.get("data") or {}
    subjects = ed.get("subjects") or []
    print("subjects", [s.get("title") for s in subjects])

    index = {
        "board": "CBSE",
        "examId": CBSE,
        "title": ed.get("title") or "CBSE",
        "subjects": [],
    }
    all_jobs = []  # (subj, ch, qid, list_item)

    for s in subjects:
        sname = s.get("title") or ""
        sid = s.get("subjectId")
        if not sid:
            continue
        print(f"\n## {sname}")
        chapters, offset = [], 0
        while True:
            ch = api(
                f"/api/v4/bpyqb/exam/{CBSE}/subject/{sid}/chapters"
                f"?limit=50&offset={offset}&sortBy=title&platform=web"
            )
            block = (ch.get("data") or {})
            batch = block.get("chapters") or []
            chapters.extend(batch)
            offset += len(batch)
            total = block.get("totalChapters") or 0
            if not batch or (total and offset >= total):
                break
        save(RAW / slug(sname) / "chapters.json", chapters)
        subj_out = {"id": sid, "name": sname, "chapters": []}

        for c in chapters:
            cid = c.get("chapterId")
            cname = c.get("title") or ""
            if not cid:
                continue
            det = api(
                f"/api/v4/bpyqb/exam/{CBSE}/subject/{sid}/chapter/{cid}/details?platform=web"
            )
            save(RAW / slug(sname) / slug(cname) / "detail.json", det)
            dd = det.get("data") or {}
            sections_out = []
            seen = {}
            for sec in dd.get("sections") or []:
                buckets_out = []
                for b in sec.get("buckets") or []:
                    bid = b.get("bucketId")
                    if not bid:
                        continue
                    items = list_bucket_items(CBSE, sid, cid, bid)
                    save(
                        RAW / slug(sname) / slug(cname) / f"bucket_{slug(b.get('title') or bid)}.json",
                        {"bucket": b, "questions": items},
                    )
                    ids = []
                    for it in items:
                        qid = it.get("questionId") or it.get("_id")
                        if not qid:
                            continue
                        qid = str(qid)
                        ids.append(qid)
                        if qid not in seen:
                            seen[qid] = it
                            all_jobs.append((sname, cname, qid, it))
                    buckets_out.append(
                        {
                            "title": b.get("title") or "Questions",
                            "bucketId": bid,
                            "count": len(ids) or int(b.get("totalQuestions") or 0),
                            "ids": ids,
                        }
                    )
                sections_out.append({"title": sec.get("title") or "Questions", "buckets": buckets_out})
            file_rel = f"data/board_offline/chapters/{slug(sname)}_{slug(cname)}.json"
            subj_out["chapters"].append(
                {
                    "id": cid,
                    "name": cname,
                    "count": len(seen) or int(c.get("totalQuestions") or 0),
                    "file": file_rel,
                    "sections": sections_out,
                }
            )
            print(f"  - {cname}: unique={len(seen)} listed={c.get('totalQuestions')}")
        index["subjects"].append(subj_out)

    save(RAW / "index_nav.json", index)
    print(f"\nunique question ids: {len(all_jobs)}")

    # hydrate
    qmap = {}
    done = 0
    miss = 0

    def one(job):
        sname, cname, qid, item = job
        d = fetch_full(qid)
        return sname, cname, qid, item, d

    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs = [pool.submit(one, job) for job in all_jobs]
        for fut in as_completed(futs):
            sname, cname, qid, item, d = fut.result()
            key = (sname, cname)
            qmap.setdefault(key, [])
            if d:
                qmap[key].append(norm_q(d, sname, cname, item))
            else:
                miss += 1
                # still keep list stem so folder is not empty
                qmap[key].append(norm_q({"_id": qid, "question": (item or {}).get("question") or {}}, sname, cname, item))
            done += 1
            if done % 100 == 0:
                print(f"  hydrated {done}/{len(all_jobs)} miss={miss}")

    # write chapter packs (dedupe by marks id)
    for subj in index["subjects"]:
        for ch in subj["chapters"]:
            rows = qmap.get((subj["name"], ch["name"])) or []
            uniq, seen = [], set()
            for q in rows:
                mid = q.get("_marksId")
                if mid in seen:
                    continue
                seen.add(mid)
                uniq.append(q)
            dest = ROOT / ch["file"]
            save(dest, {"questions": uniq})
            ch["count"] = len(uniq)

    save(OUT / "index.json", index)
    save(RAW / "extract_stats.json", {
        "unique": len(all_jobs),
        "hydrated": done,
        "miss": miss,
        "subjects": [
            {"name": s["name"], "chapters": len(s["chapters"]), "qs": sum(c["count"] for c in s["chapters"])}
            for s in index["subjects"]
        ],
    })
    print("DONE", json.dumps({
        "unique": len(all_jobs),
        "miss": miss,
        "subjects": [(s["name"], len(s["chapters"]), sum(c["count"] for c in s["chapters"])) for s in index["subjects"]],
    }))


if __name__ == "__main__":
    main()
