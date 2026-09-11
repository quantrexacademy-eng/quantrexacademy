#!/usr/bin/env python3
"""Import Marks 'Most Important PYQ Based Questions' into Quantrex local books + qid cache.
Uses production.getmarks.app. Never writes Marks credentials into frontend files.
"""
from __future__ import annotations

import json
import re
import ssl
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(r"E:\QUANTREX\website")
NAV = ROOT / "data" / "nav" / "books"
CHDIR = ROOT / "data" / "books" / "chapters"
QIDDIR = ROOT / "data" / "qid_marks"
STATE = ROOT / "data" / "_migration" / "marks_pyq_capture" / "import_state.json"
cfg = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOK = cfg["token"]
CTX = ssl.create_default_context()
BASE = "https://production.getmarks.app"
BOOK = "6a91185f41ab5aba084f4d30"
MOD = "6a916235cb18ffc9d00d5aa1"
SLEEP = 0.12


def strip(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def api(path, params=None, retries=4):
    url = BASE + path
    if params:
        url += ("&" if "?" in url else "?") + urlencode(params)
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": "Bearer " + TOK,
            "Accept": "application/json",
            "Origin": "https://web.getmarks.app",
            "Referer": "https://web.getmarks.app/",
            "User-Agent": "Mozilla/5.0",
        },
    )
    last = (0, {"error": "none"})
    for i in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=60, context=CTX) as r:
                return r.status, json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            raw = e.read().decode("utf-8", "replace")
            try:
                body = json.loads(raw)
            except Exception:
                body = {"error": raw[:200]}
            last = (e.code, body)
            if e.code in (429, 500, 502, 503) and i < retries - 1:
                time.sleep(1.4 + i * 2)
                continue
            return e.code, body
        except Exception as ex:
            last = (0, {"error": str(ex)})
            time.sleep(0.8 + i)
    return last


def img_url(v):
    if not v:
        return ""
    if isinstance(v, str):
        return v.strip()
    if isinstance(v, dict):
        return str(v.get("url") or v.get("src") or v.get("original") or "").strip()
    return ""


def img_tag(url):
    u = img_url(url)
    if not u:
        return ""
    return '<img src="' + u.replace('"', "&quot;") + '"><br>'


def marks_to_local(d, book_id, chapter_key, subject, chapter):
    if not d or not isinstance(d, dict):
        return None
    qb = d.get("question") or {}
    if isinstance(qb, str):
        q = qb
        qim = ""
    else:
        q = str(qb.get("text") or qb.get("html") or "")
        qim = img_url(qb.get("image"))
    if qim and "<img" not in q.lower():
        q += "\n" + img_tag(qim)
    opts = []
    ans = None
    for i, o in enumerate(d.get("options") or []):
        if isinstance(o, str):
            opts.append(o)
            continue
        t = str((o or {}).get("text") or (o or {}).get("html") or "")
        oim = img_url((o or {}).get("image"))
        if oim and "<img" not in t.lower():
            t += "\n" + img_tag(oim)
        opts.append(t)
        if isinstance(o, dict) and o.get("isCorrect"):
            ans = i
    sb = d.get("solution") or {}
    if isinstance(sb, str):
        sol = sb
        sim = ""
    else:
        sol = str(sb.get("text") or sb.get("html") or "")
        sim = img_url(sb.get("image"))
    if sim and "<img" not in sol.lower():
        sol += "\n" + img_tag(sim)
    qtype = str(d.get("type") or d.get("questionType") or "")
    rec = {
        "id": str(d.get("_id") or d.get("id") or ""),
        "subject": subject,
        "chapter": chapter,
        "exam": "jee_main",
        "examName": "JEE Main",
        "q": q,
        "question": q,
        "options": opts,
        "answer": ans,
        "solution": sol,
        "difficulty": str(d.get("level") or d.get("difficulty") or ""),
        "source": "quantrex-pyq",
        "type": qtype,
        "_book": book_id,
        "_bookId": book_id,
        "_chapterKey": chapter_key,
        "_marksId": str(d.get("_id") or ""),
    }
    if d.get("correctValue") is not None:
        rec["correctValue"] = d.get("correctValue")
    if not rec["id"]:
        return None
    return rec


def fetch_full(qid):
    QIDDIR.mkdir(parents=True, exist_ok=True)
    cache = QIDDIR / f"{qid}.json"
    if cache.exists():
        try:
            raw = json.loads(cache.read_text(encoding="utf-8"))
            rec = raw.get("data") if isinstance(raw, dict) else raw
            if rec:
                return rec, "cache"
        except Exception:
            pass
    code, body = api(f"/api/v1/questions/{qid}")
    if code != 200:
        return None, f"http{code}"
    cache.write_text(json.dumps(body), encoding="utf-8")
    return (body.get("data") or body), "api"


def chapter_question_ids(sid, cid):
    out = []
    offset = 0
    while True:
        code, body = api(
            f"/api/v4/marks-selected/exam/{BOOK}/module/{MOD}/subjects/{sid}/chapters/{cid}",
            {"status": "all", "offset": offset, "limit": 50, "platform": "web", "isShowAllQs": "true"},
        )
        if code != 200:
            print("  list fail", code, cid, body.get("error") if isinstance(body, dict) else body)
            break
        data = body.get("data") or {}
        block = data.get("questions") or {}
        qs = block.get("questions") if isinstance(block, dict) else block
        if not isinstance(qs, list) or not qs:
            break
        out.extend(qs)
        total = block.get("total") if isinstance(block, dict) else None
        offset += len(qs)
        if total is not None and offset >= int(total):
            break
        if len(qs) < 50:
            break
        time.sleep(SLEEP)
    return out


def title_of(obj):
    if not obj:
        return ""
    if isinstance(obj.get("titles"), list) and obj["titles"]:
        return str(obj["titles"][0])
    return str(obj.get("title") or obj.get("name") or "")


def load_state():
    if STATE.exists():
        try:
            return json.loads(STATE.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_state(st):
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(st, indent=2), encoding="utf-8")


def main():
    stats = {"subjects": 0, "chapters": 0, "listed": 0, "fetched": 0, "cache": 0, "written": 0, "fail": 0}
    st = load_state()
    done = set(st.get("doneKeys") or [])

    code, body = api(f"/api/v4/marks-selected/exam/{BOOK}/module/{MOD}/subjects", {"platform": "web"})
    if code != 200:
        print("SUBJECTS FAIL", code, body)
        return
    data = body.get("data") or {}
    subs = ((data.get("subjects") or {}).get("subjects") if isinstance(data.get("subjects"), dict) else data.get("subjects")) or []
    print("subjects", len(subs), flush=True)

    nav_subjects = []
    for s in subs:
        sid = s.get("_id") or s.get("id")
        sname = title_of(s) or s.get("title") or "Subject"
        print("\n====", sname, sid, flush=True)
        stc, chb = api(
            f"/api/v4/marks-selected/exam/{BOOK}/module/{MOD}/subjects/{sid}/chapters",
            {"platform": "web"},
        )
        chs = []
        if stc == 200:
            cd = chb.get("data") or {}
            chs = cd.get("chapters") or []
            if isinstance(chs, dict):
                chs = chs.get("chapters") or []
        print(" chapters", len(chs), flush=True)
        stats["subjects"] += 1
        nav_chs = []
        for ch in chs:
            cid = ch.get("_id") or ch.get("id")
            cname = title_of(ch) or ch.get("title") or "Chapter"
            key = f"{BOOK}__{MOD}__{sid}__{cid}"
            nav_chs.append({
                "id": cid,
                "name": cname,
                "count": int(ch.get("questionCount") or ch.get("total") or 0),
                "key": key,
            })
            if key in done:
                print("  skip", cname, flush=True)
                continue
            listed = chapter_question_ids(sid, cid)
            stats["listed"] += len(listed)
            stats["chapters"] += 1
            print(f"  list {cname[:42]:42} {len(listed):4} {cid}", flush=True)
            recs = []
            for item in listed:
                qid = item.get("_id") or item.get("id")
                if not qid:
                    continue
                raw, src = fetch_full(qid)
                if src == "api":
                    stats["fetched"] += 1
                    time.sleep(SLEEP)
                elif src == "cache":
                    stats["cache"] += 1
                else:
                    stats["fail"] += 1
                    title = ((item.get("title") or {}) if isinstance(item.get("title"), dict) else {})
                    stem = title.get("text") if isinstance(title, dict) else str(item.get("title") or "")
                    recs.append({
                        "id": str(qid),
                        "subject": sname,
                        "chapter": cname,
                        "exam": "jee_main",
                        "examName": "JEE Main",
                        "q": stem,
                        "question": stem,
                        "options": [],
                        "answer": None,
                        "solution": "",
                        "source": "quantrex-pyq",
                        "_book": BOOK,
                        "_bookId": BOOK,
                        "_chapterKey": key,
                        "_marksId": str(qid),
                    })
                    continue
                rec = marks_to_local(raw, BOOK, key, sname, cname)
                if rec:
                    recs.append(rec)
            outdir = CHDIR / BOOK
            outdir.mkdir(parents=True, exist_ok=True)
            payload = {
                "bookId": BOOK,
                "moduleId": MOD,
                "subjectId": sid,
                "chapterId": cid,
                "subject": sname,
                "chapter": cname,
                "count": len(recs),
                "questions": recs,
            }
            (outdir / f"{key}.json").write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
            stats["written"] += 1
            done.add(key)
            st["doneKeys"] = sorted(done)
            st["stats"] = stats
            save_state(st)
            print(f"    wrote {len(recs)} qs", flush=True)
        nav_subjects.append({
            "id": sid,
            "name": sname,
            "count": int(s.get("questionCount") or sum(c["count"] for c in nav_chs)),
            "chapters": nav_chs,
        })

    nav = {
        "id": BOOK,
        "title": "Most Important PYQ Based Questions",
        "type": "exam",
        "banner": "assets/book-covers/qx-pyq-important.jpg",
        "exam": "JEE Main 2027",
        "redirectType": "subject",
        "count": sum(s["count"] for s in nav_subjects),
        "modules": [
            {
                "id": MOD,
                "title": "Most Important PYQ Based Questions",
                "subtitle": "Quantrex · JEE Main PYQ 2022–2026",
                "count": sum(s["count"] for s in nav_subjects),
                "subjects": nav_subjects,
            }
        ],
    }
    NAV.mkdir(parents=True, exist_ok=True)
    (NAV / f"{BOOK}.json").write_text(json.dumps(nav, indent=2, ensure_ascii=False), encoding="utf-8")
    print("NAV", nav["count"], "STATS", stats, flush=True)


if __name__ == "__main__":
    main()
