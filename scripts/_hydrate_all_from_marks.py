#!/usr/bin/env python3
"""Login-token Marks harvest → fill empty/broken stems, options, keys, solutions.

Never invents. Student site stays Marks-free (STUDENT_MARKS_RUNTIME=false).
Cache: data/qid_marks/{id}.json
Resume: data/_migration/marks_all_hydrate_state.json
"""
from __future__ import annotations

import json
import re
import ssl
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANKS = ROOT / "data" / "banks"
BOOKS = ROOT / "data" / "books" / "chapters"
TESTS = ROOT / "data" / "tests"
QIDDIR = ROOT / "data" / "qid_marks"
CFG = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOK = CFG["token"]
STATE = ROOT / "data" / "_migration" / "marks_all_hydrate_state.json"
REPORT = ROOT / "data" / "_migration" / "marks_all_hydrate_report.json"
CTX = ssl.create_default_context()
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
WORKERS = 4
HDR = {
    "Authorization": "Bearer " + TOK,
    "Accept": "application/json",
    "Origin": "https://web.getmarks.app",
    "Referer": "https://web.getmarks.app/",
    "User-Agent": UA,
}
HEX24 = re.compile(r"^[a-fA-F0-9]{24}$")
IMG_RX = re.compile(r"<img\b", re.I)
AUTH_DEAD = False


def plain(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def opt_plain(o):
    if isinstance(o, dict):
        return plain(o.get("text") or o.get("html") or "")
    return plain(o)


def opt_html(o):
    if isinstance(o, dict):
        return str(o.get("text") or o.get("html") or "")
    return str(o or "")


def is_nat(q):
    t = str(q.get("questionType") or q.get("type") or "")
    if re.search(r"numerical|integer|nat|subjective|fill|written", t, re.I):
        return True
    opts = q.get("options") or []
    return (q.get("correctValue") is not None) and not opts


def letter_opts(opts):
    if not opts:
        return False
    op = [opt_plain(o) for o in opts]
    return all(re.fullmatch(r"[A-Da-d]?", x or "") for x in op) and not any(
        IMG_RX.search(opt_html(o)) for o in opts
    )


def sol_score(s):
    raw = str(s or "")
    t = plain(raw)
    if not t or re.match(r"^(no solution\.?|&nbsp;)$", t, re.I):
        n = 0
    else:
        n = len(t)
    if IMG_RX.search(raw):
        n += 80
    if re.search(r"<table\b", raw, re.I):
        n += 20
    return n


def stem_score(s):
    raw = str(s or "")
    n = len(plain(raw))
    if IMG_RX.search(raw):
        n += 80
    if re.search(r"<table\b", raw, re.I):
        n += 40
    return n


def opt_score(opts):
    n = 0
    for o in opts or []:
        raw = opt_html(o)
        t = plain(raw)
        if IMG_RX.search(raw):
            n += 8
        elif t and not re.fullmatch(r"[A-Da-d]?", t):
            n += min(6, 1 + len(t) // 12)
    return n


def needs(q):
    if not q or not isinstance(q, dict):
        return []
    raw = str(q.get("q") or q.get("question") or "")
    p = plain(raw)
    reasons = []
    if len(p) < 8 and not IMG_RX.search(raw):
        reasons.append("stem")
    if sol_score(q.get("solution") or "") < 12:
        reasons.append("sol")
    nat = is_nat(q)
    opts = q.get("options") or []
    if not nat and letter_opts(opts):
        reasons.append("opts")
    has_key = (
        q.get("answer") is not None
        or q.get("correctValue") is not None
        or q.get("correctAnswer") is not None
        or q.get("answers")
    )
    if not has_key and not nat:
        reasons.append("key")
    return reasons


def mongo_id(q):
    for k in ("_marksId", "id", "_id"):
        v = str(q.get(k) or "").strip()
        if HEX24.fullmatch(v):
            return v
    return ""


def html_img(url, base=""):
    u = str(url or "").strip()
    if not u:
        return ""
    if isinstance(url, dict):
        u = str(url.get("url") or url.get("src") or url.get("original") or "").strip()
    if not u:
        return ""
    if u.startswith("//"):
        u = "https:" + u
    if base and not u.startswith("http"):
        u = str(base).rstrip("/") + "/" + u.lstrip("/")
    return f'<img src="{u}" alt="">'


def combine(text, image, base=""):
    t = str(text or "")
    tag = html_img(image, base)
    if tag and tag.lower() not in t.lower():
        t = (t + "\n" + tag).strip() if t else tag
    return t


def unwrap_marks(j):
    if not j or not isinstance(j, dict):
        return None
    d = j.get("data") if isinstance(j.get("data"), dict) else j
    inner = d.get("question") if isinstance(d, dict) else None
    if isinstance(inner, dict) and (
        inner.get("options") is not None
        or inner.get("solution") is not None
        or isinstance(inner.get("question"), dict)
    ):
        return inner
    return d if isinstance(d, dict) else None


def parse_marks(j):
    d = unwrap_marks(j)
    if not d:
        return None
    base = d.get("imageBaseUrl") or ""
    qq = d.get("question") or {}
    stem = ""
    if isinstance(qq, dict):
        stem = combine(qq.get("text") or qq.get("html"), qq.get("image"), base)
    elif isinstance(qq, str):
        stem = qq
    opts_in = d.get("options") or []
    opts = []
    answer = None
    for i, o in enumerate(opts_in):
        if isinstance(o, dict):
            opts.append(combine(o.get("text") or o.get("html"), o.get("image"), base))
            if o.get("isCorrect") and answer is None:
                answer = i
        else:
            opts.append(str(o or ""))
    if answer is None and d.get("correctIndex") is not None:
        try:
            answer = int(d.get("correctIndex"))
        except Exception:
            answer = None
    solb = d.get("solution") or {}
    if isinstance(solb, dict):
        sol = combine(solb.get("text") or solb.get("html"), solb.get("image"), base)
    else:
        sol = str(solb or "")
    cv = d.get("correctValue")
    if cv is None:
        cv = d.get("numericalAnswer")
    rec = {
        "q": stem,
        "options": opts,
        "answer": answer,
        "solution": sol,
        "correctValue": cv,
        "type": d.get("type") or "",
        "_marksId": d.get("_id") or "",
    }
    if not (rec["q"] or rec["solution"] or rec["options"]):
        return None
    return rec


def apply_rec(q, rec):
    ch = []
    if not rec:
        return ch
    old_q = str(q.get("q") or q.get("question") or "")
    if rec.get("q") and stem_score(rec["q"]) > stem_score(old_q) + 8:
        q["q"] = rec["q"]
        if "question" in q:
            q["question"] = rec["q"]
        ch.append("stem")
    if rec.get("options"):
        if opt_score(rec["options"]) > opt_score(q.get("options")):
            q["options"] = rec["options"]
            ch.append("opts")
            if rec.get("answer") is not None:
                q["answer"] = rec["answer"]
    if rec.get("answer") is not None and q.get("answer") is None:
        q["answer"] = rec["answer"]
        ch.append("key")
    if rec.get("correctValue") is not None and q.get("correctValue") is None:
        q["correctValue"] = rec["correctValue"]
        ch.append("nat")
    if rec.get("solution") and sol_score(rec["solution"]) > sol_score(q.get("solution") or "") + 8:
        q["solution"] = rec["solution"]
        if "explanation" in q or q.get("explanation") is not None:
            q["explanation"] = rec["solution"]
        ch.append("sol")
    if rec.get("type") and not q.get("questionType"):
        q["questionType"] = rec["type"]
        q["type"] = rec["type"]
    if rec.get("_marksId") and not q.get("_marksId"):
        q["_marksId"] = rec["_marksId"]
    return ch


def load_state():
    try:
        return json.loads(STATE.read_text(encoding="utf-8"))
    except Exception:
        return {"done": {}, "ok": 0, "fail": 0, "skip": 0}


def save_state(st):
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(st), encoding="utf-8")


def json_files():
    out = []
    for p in sorted(BANKS.glob("*.json")):
        if "bak" in p.name:
            continue
        out.append(p)
    if BOOKS.exists():
        out.extend(sorted(BOOKS.rglob("*.json")))
    if TESTS.exists():
        for p in sorted(TESTS.rglob("*.json")):
            if p.name.startswith("_"):
                continue
            out.append(p)
    return out


def load_qs(path: Path):
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None, None, None
    if isinstance(raw, dict):
        qs = raw.get("questions")
        if not isinstance(qs, list):
            return None, None, None
        extra = {k: v for k, v in raw.items() if k != "questions"}
        return extra, qs, False
    if isinstance(raw, list):
        return {}, raw, True
    return None, None, None


def write_qs(path: Path, extra, qs, as_list):
    if as_list:
        path.write_text(json.dumps(qs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        return
    extra["questions"] = qs
    path.write_text(json.dumps(extra, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def parse_cache_file(path: Path):
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    return parse_marks(raw)


def stem_key(s):
    t = plain(s).lower()
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return t.strip()[:90]


def api_get(url):
    global AUTH_DEAD
    req = urllib.request.Request(url, headers=HDR)
    try:
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            return r.status, json.loads(r.read().decode("utf-8", "ignore"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "ignore")
        if e.code in (401, 403):
            AUTH_DEAD = True
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, None
    except Exception as e:
        return None, {"_err": str(e)}


def fetch_one(qid):
    if AUTH_DEAD:
        return qid, "auth", None
    cache = QIDDIR / f"{qid}.json"
    if cache.exists() and cache.stat().st_size > 80:
        rec = parse_cache_file(cache)
        if rec:
            return qid, "cache", rec
    for path in (
        "https://production.getmarks.app/api/v1/questions/" + qid,
        "https://production.getmarks.app/api/v4/questions/" + qid,
        "https://web.getmarks.app/api/v1/questions/" + qid,
        "https://web.getmarks.app/api/v4/questions/" + qid,
    ):
        wait = 6
        for attempt in range(7):
            if AUTH_DEAD:
                return qid, "auth", None
            code, body = api_get(path)
            if code == 429:
                time.sleep(wait)
                wait = min(90, int(wait * 1.6))
                continue
            if code in (500, 502, 503):
                time.sleep(1.2 + attempt)
                continue
            if code == 200:
                rec = parse_marks(body)
                if rec:
                    try:
                        QIDDIR.mkdir(parents=True, exist_ok=True)
                        cache.write_text(json.dumps(body), encoding="utf-8")
                    except Exception:
                        pass
                    return qid, "api", rec
                return qid, "empty", None
            if code in (401, 403):
                return qid, "auth", None
            if code == 404:
                break
            if code is None:
                time.sleep(0.8 + attempt)
                continue
            break
    return qid, "fail", None


def main():
    t0 = time.time()
    st = load_state()
    done = st.get("done") or {}
    files = json_files()
    print("files", len(files), flush=True)

    cache_index = {}
    if QIDDIR.exists():
        n = 0
        for p in QIDDIR.glob("*.json"):
            rec = parse_cache_file(p)
            n += 1
            if rec:
                cache_index[p.stem] = rec
            if n % 2000 == 0:
                print(f"  cache loaded {n}", flush=True)
        print("qid_marks usable", len(cache_index), "files", n, flush=True)

    stem_index = {}
    stem_dup = set()
    for mid, rec in cache_index.items():
        k = stem_key(rec.get("q") or "")
        if len(k) < 40:
            continue
        if k in stem_index or k in stem_dup:
            stem_dup.add(k)
            stem_index.pop(k, None)
            continue
        stem_index[k] = rec

    need_ids = []
    seen_need = set()
    stats = {"qs": 0, "need": 0, "need_id": 0, "need_no_id": 0, "reasons": {}}
    for fp in files:
        extra, qs, as_list = load_qs(fp)
        if qs is None:
            continue
        for q in qs:
            if not q:
                continue
            stats["qs"] += 1
            rs = needs(q)
            if not rs:
                continue
            stats["need"] += 1
            for r in rs:
                stats["reasons"][r] = stats["reasons"].get(r, 0) + 1
            mid = mongo_id(q)
            if mid:
                stats["need_id"] += 1
                if mid not in seen_need and done.get(mid) not in ("ok", "empty", "404"):
                    if mid not in cache_index:
                        seen_need.add(mid)
                        need_ids.append(mid)
            else:
                stats["need_no_id"] += 1
    print(
        "scan qs={qs} need={need} withId={need_id} noId={need_no_id} reasons={reasons} fetch={n}".format(
            n=len(need_ids), **stats
        ),
        flush=True,
    )

    fetched = dict(cache_index)
    n_ok = n_fail = n_empty = n_cache = n_api = 0
    if need_ids:
        print("fetching", len(need_ids), "from Marks", flush=True)
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            futs = {ex.submit(fetch_one, qid): qid for qid in need_ids}
            n = 0
            for fut in as_completed(futs):
                n += 1
                qid, status, rec = fut.result()
                if status == "cache":
                    n_cache += 1
                    fetched[qid] = rec
                    done[qid] = "ok"
                    n_ok += 1
                elif status == "api" and rec:
                    n_api += 1
                    fetched[qid] = rec
                    done[qid] = "ok"
                    n_ok += 1
                elif status == "empty":
                    done[qid] = "empty"
                    n_empty += 1
                elif status == "auth":
                    done[qid] = "auth"
                    n_fail += 1
                    print("AUTH DEAD at", n, flush=True)
                else:
                    done[qid] = status or "fail"
                    n_fail += 1
                if n % 50 == 0 or n == len(need_ids):
                    print(
                        f"  fetch {n}/{len(need_ids)} ok={n_ok} api={n_api} cache={n_cache} empty={n_empty} fail={n_fail}",
                        flush=True,
                    )
                    st.update(
                        {
                            "done": done,
                            "ok": n_ok,
                            "fail": n_fail,
                            "empty": n_empty,
                            "api": n_api,
                            "at": time.time(),
                        }
                    )
                    save_state(st)
    print("fetched ok", n_ok, "empty", n_empty, "fail", n_fail, "api", n_api, flush=True)

    changed_q = 0
    files_written = 0
    by_reason = {}
    changed_ids = []
    still_need = {}
    for fp in files:
        extra, qs, as_list = load_qs(fp)
        if qs is None:
            continue
        file_ch = 0
        for q in qs:
            if not q:
                continue
            rec = None
            mid = mongo_id(q)
            if mid and mid in fetched:
                rec = fetched[mid]
            elif needs(q):
                k = stem_key(q.get("q") or q.get("question") or "")
                if k in stem_index:
                    rec = stem_index[k]
                    if rec.get("_marksId") and not q.get("_marksId"):
                        q["_marksId"] = rec["_marksId"]
            if rec:
                ch = apply_rec(q, rec)
                if ch:
                    file_ch += 1
                    changed_q += 1
                    if len(changed_ids) < 8000:
                        changed_ids.append(
                            {
                                "file": str(fp.relative_to(ROOT)).replace("\\", "/"),
                                "id": q.get("id"),
                                "marksId": mid or rec.get("_marksId"),
                                "ch": ch,
                            }
                        )
                    for r in ch:
                        by_reason[r] = by_reason.get(r, 0) + 1
            rs = needs(q)
            if rs:
                for r in rs:
                    still_need[r] = still_need.get(r, 0) + 1
        if file_ch:
            write_qs(fp, extra, qs, as_list)
            files_written += 1
            print("wrote", fp.relative_to(ROOT), "changed", file_ch, flush=True)

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
        "authDead": AUTH_DEAD,
        "seconds": round(time.time() - t0, 1),
        "changed_ids": changed_ids,
    }
    REPORT.write_text(json.dumps(rep, indent=2), encoding="utf-8")
    st.update({"done": done, "ok": n_ok, "fail": n_fail, "empty": n_empty, "at": time.time()})
    save_state(st)
    print("APPLIED", changed_q, "files", files_written, by_reason, flush=True)
    print("STILL_NEED", still_need, flush=True)
    print("REPORT", REPORT, "sec", rep["seconds"], flush=True)


if __name__ == "__main__":
    main()
