#!/usr/bin/env python3
"""Login-token Marks Selected hydrate for digital books (Rank Booster, HCV, etc).
Never invents stems/options. Quizrr is not used here.
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

ROOT = Path(r"C:\Users\Admin\qx-hosting")
NAV = ROOT / "data" / "nav" / "books"
CHDIR = ROOT / "data" / "books" / "chapters"
QIDDIR = ROOT / "data" / "qid_marks"
CFG = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOK = CFG["token"]
CTX = ssl.create_default_context()
BOOKS = [
    "68f1ce4cc729e5251bd00430",  # Rank Booster
    "69f9cc23681eab6d6021a4d1",  # HCV Vol 1
    "6a0addba4b032b031e049a36",  # HCV Vol 2
    "69048808ef55966cf1d71f1d",  # Olympiad
    "68946f70ebd145663de38728",  # 99 percentile
    "6894d29d3156b1f3ca5ad0be",  # Backlog
    "69736c8362b916d85e52cd1b",  # BITSAT
    "69cfb5366ecf5579037d96a4",  # Irodov
    "6a4ce383c59a7b462185330f",  # Organic
]
SLEEP = 0.28


def strip(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def stem_key(s):
    t = strip(s).lower()
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return t.strip()[:90]


def img_urls(html):
    return re.findall(r'\bsrc=["\']([^"\']+)["\']', str(html or ""), flags=re.I)


def opt_score(opts):
    n = 0
    for o in opts or []:
        s = o if isinstance(o, str) else str((o or {}).get("text") or (o or {}).get("html") or "")
        t = strip(s)
        if re.search(r"<img\b", s, re.I):
            n += 8
        elif t and not re.match(r"^[\(\[]?[A-D][\)\].:]?$", t, re.I):
            n += min(6, 1 + len(t) // 12)
    return n


def leftover(q):
    raw = str(q.get("q") or q.get("question") or "")
    opts = q.get("options") or []
    stem = strip(raw)
    has = bool(re.search(r"<img\b", raw + " ".join(map(str, opts)), re.I))
    letter = bool(opts) and opt_score(opts) < 2
    cdn = bool(re.search(r"quizrr|watermarked_images|organic_book", raw + " ".join(map(str, opts)), re.I)) and not re.search(
        r"qx-org-|/assets/diagrams/", raw, re.I
    )
    fig = bool(re.search(r"\b(the figure|shown in (the )?(figure|diagram|graph)|shown below)\b", stem, re.I)) and not has
    return letter or cdn or fig


def api(path, params=None, retries=4):
    url = "https://web.getmarks.app" + path
    if params:
        url += ("&" if "?" in url else "?") + urlencode(params)
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": "Bearer " + TOK,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
            "Origin": "https://web.getmarks.app",
            "Referer": "https://web.getmarks.app/",
        },
    )
    last = None
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
                time.sleep(1.5 + i * 2)
                continue
            return e.code, body
        except Exception as ex:
            last = (0, {"error": str(ex)})
            time.sleep(0.8 + i)
    return last


def chapter_questions(exam, mid, sid, cid):
    out = []
    offset = 0
    while True:
        code, body = api(
            f"/api/v4/marks-selected/exam/{exam}/module/{mid}/subjects/{sid}/chapters/{cid}",
            {"status": "all", "offset": offset, "limit": 50, "platform": "web", "isShowAllQs": "true"},
        )
        if code != 200:
            # try sections
            if offset == 0:
                sc, sb = api(
                    f"/api/v4/marks-selected/exam/{exam}/module/{mid}/subjects/{sid}/chapters/{cid}/sections",
                    {"platform": "web"},
                )
                if sc == 200:
                    data = sb.get("data") or {}
                    secs = data.get("sections") or data.get("data") or []
                    if isinstance(data, list):
                        secs = data
                    for sec in secs or []:
                        set_id = sec.get("_id") or sec.get("id")
                        if not set_id:
                            continue
                        off = 0
                        while True:
                            c2, b2 = api(
                                f"/api/v4/marks-selected/exam/{exam}/module/{mid}/subjects/{sid}/chapters/{cid}/sections/{set_id}",
                                {"status": "all", "offset": off, "limit": 50, "platform": "web"},
                            )
                            if c2 != 200:
                                break
                            dd = (b2.get("data") or {})
                            qs = ((dd.get("questions") or {}) if isinstance(dd.get("questions"), dict) else {}).get("questions")
                            if qs is None:
                                qs = dd.get("questions") if isinstance(dd.get("questions"), list) else []
                            if not qs:
                                break
                            out.extend(qs)
                            if len(qs) < 50:
                                break
                            off += 50
                            time.sleep(SLEEP)
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


def marks_to_local(d):
    if not d or not isinstance(d, dict):
        return None
    qb = d.get("question") or {}
    q = str(qb.get("text") or qb.get("html") or "")
    im = ""
    if isinstance(qb.get("image"), dict):
        im = qb["image"].get("url") or qb["image"].get("src") or ""
    elif isinstance(qb.get("image"), str):
        im = qb["image"]
    if im and "<img" not in q.lower():
        q += f'\n<img src="{im}">'
    opts = []
    for o in d.get("options") or []:
        if isinstance(o, str):
            opts.append(o)
            continue
        t = str((o or {}).get("text") or (o or {}).get("html") or "")
        oim = ""
        if isinstance((o or {}).get("image"), dict):
            oim = o["image"].get("url") or o["image"].get("src") or ""
        elif isinstance((o or {}).get("image"), str):
            oim = o["image"]
        if oim and "<img" not in t.lower():
            t += f'\n<img src="{oim}">'
        opts.append(t)
    ans = None
    for i, o in enumerate(d.get("options") or []):
        if isinstance(o, dict) and o.get("isCorrect"):
            ans = i
            break
    sb = d.get("solution") or {}
    sol = str(sb.get("text") or sb.get("html") or "")
    sim = ""
    if isinstance(sb.get("image"), dict):
        sim = sb["image"].get("url") or sb["image"].get("src") or ""
    elif isinstance(sb.get("image"), str):
        sim = sb["image"]
    if sim and "<img" not in sol.lower():
        sol += f'\n<img src="{sim}">'
    return {"q": q, "options": opts, "answer": ans, "solution": sol, "type": d.get("type") or ""}


def fetch_full(qid):
    cache = QIDDIR / f"{qid}.json"
    if cache.exists():
        raw = json.loads(cache.read_text(encoding="utf-8"))
        rec = marks_to_local(raw.get("data") or raw)
        if rec and (opt_score(rec["options"]) >= 2 or rec["q"]):
            return rec, "cache"
    code, body = api(f"/api/v1/questions/{qid}")
    if code != 200:
        return None, f"http{code}"
    QIDDIR.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(body), encoding="utf-8")
    return marks_to_local(body.get("data") or body), "api"


def apply_rec(q, rec, mid):
    if not rec:
        return False
    ch = False
    old = str(q.get("q") or "")
    if rec["q"] and (
        len(strip(rec["q"])) > len(strip(old))
        or (re.search(r"<img\b", rec["q"], re.I) and not re.search(r"<img\b", old, re.I))
    ):
        # don't pull option-images-only stems over a stem that already has text
        q["q"] = rec["q"]
        q["question"] = rec["q"]
        ch = True
    if opt_score(rec["options"]) > opt_score(q.get("options")):
        q["options"] = rec["options"]
        ch = True
    if rec["answer"] is not None and q.get("answer") is None:
        q["answer"] = rec["answer"]
        ch = True
    if rec["solution"] and len(strip(rec["solution"])) > len(strip(q.get("solution") or "")) + 8:
        q["solution"] = rec["solution"]
        ch = True
    if mid and not q.get("_marksId"):
        q["_marksId"] = mid
        ch = True
    return ch


def restore_stem_option_images(q):
    """If options are A/B/C/D and stem has exactly those option figures, put them back."""
    opts = q.get("options") or []
    if opt_score(opts) >= 2:
        return False
    raw = str(q.get("q") or "")
    imgs = img_urls(raw)
    n = len(opts) if opts else 4
    if len(imgs) < max(2, n):
        return False
    # keep only the last n images as options (common export put option figs at end)
    use = imgs[-n:]
    new_opts = [f'<img src="{u}">' for u in use]
    # remove those imgs from stem
    stem = raw
    for u in use:
        stem = re.sub(r'<img[^>]+src=["\']' + re.escape(u) + r'["\'][^>]*>\s*(?:<br\s*/?>)?', "", stem, flags=re.I)
    stem = re.sub(r"\n{3,}", "\n\n", stem).strip()
    if not strip(stem):
        return False
    q["q"] = stem
    q["question"] = stem
    q["options"] = new_opts
    return True


def iter_nav_chapters(nav):
    exam = nav.get("id")
    for mod in nav.get("modules") or []:
        mid = mod.get("id")
        for sub in mod.get("subjects") or []:
            sid = sub.get("id")
            for ch in sub.get("chapters") or []:
                cid = ch.get("id")
                key = ch.get("key") or f"{exam}__{mid}__{sid}__{cid}"
                yield exam, mid, sid, cid, key, ch.get("name")
                for ex in ch.get("exercises") or []:
                    eid = ex.get("id")
                    ekey = ex.get("key") or f"{exam}__{mid}__{sid}__{eid}"
                    yield exam, mid, sid, eid, ekey, (ch.get("name") or "") + " " + (ex.get("name") or "")


def main():
    stats = {"chapters": 0, "listed": 0, "fetched": 0, "cache": 0, "applied": 0, "restored": 0, "files": 0, "leftLetter": 0}
    for bid in BOOKS:
        navp = NAV / f"{bid}.json"
        if not navp.exists():
            print("NO NAV", bid, flush=True)
            continue
        nav = json.loads(navp.read_text(encoding="utf-8"))
        print("\n====", nav.get("title"), bid, flush=True)
        book_dir = CHDIR / bid
        if not book_dir.exists():
            print("  no chapter dir", flush=True)
            continue

        # mechanical restore first
        for fp in book_dir.glob("*.json"):
            data = json.loads(fp.read_text(encoding="utf-8"))
            qs = data.get("questions") if isinstance(data, dict) else data
            if not isinstance(qs, list):
                continue
            chg = False
            for q in qs:
                if leftover(q) and restore_stem_option_images(q):
                    stats["restored"] += 1
                    chg = True
            if chg:
                if isinstance(data, dict):
                    data["questions"] = qs
                    fp.write_text(json.dumps(data), encoding="utf-8")
                else:
                    fp.write_text(json.dumps(qs), encoding="utf-8")
                stats["files"] += 1

        # leftover after restore
        leftover_files = {}
        for fp in book_dir.glob("*.json"):
            data = json.loads(fp.read_text(encoding="utf-8"))
            qs = data.get("questions") if isinstance(data, dict) else data
            if not isinstance(qs, list):
                continue
            bad = [q for q in qs if leftover(q)]
            if bad:
                leftover_files[fp] = (data, qs, bad)

        print("  leftover files", len(leftover_files), "qs", sum(len(v[2]) for v in leftover_files.values()), flush=True)

        # official chapter lists + match
        id_by_stem = {}
        needed_ids = set()
        for exam, mid, sid, cid, key, name in iter_nav_chapters(nav):
            # only chapters that still have leftover files
            has = any(key in str(fp) or (isinstance(d, dict) and d.get("chapterId") == cid) for fp, (d, _, _) in leftover_files.items())
            if not has:
                # also match by filename ending
                has = any(fp.name.endswith(cid + ".json") or key.replace("/", "_") in fp.name for fp in leftover_files)
            if not has:
                continue
            stats["chapters"] += 1
            listed = chapter_questions(exam, mid, sid, cid)
            stats["listed"] += len(listed)
            print(f"  list {name[:40]:40} {len(listed):3} {cid}", flush=True)
            for oq in listed:
                oid = oq.get("_id")
                title = ((oq.get("title") or {}) if isinstance(oq.get("title"), dict) else {}).get("text") or oq.get("title") or ""
                if oid and title:
                    id_by_stem[stem_key(title)] = oid
            time.sleep(SLEEP)

        for fp, (data, qs, bad) in leftover_files.items():
            chg = False
            for q in bad:
                mid = q.get("_marksId")
                if not mid:
                    mid = id_by_stem.get(stem_key(q.get("q") or q.get("question") or ""))
                if not mid:
                    continue
                rec, src = fetch_full(mid)
                if src == "api":
                    stats["fetched"] += 1
                    time.sleep(SLEEP)
                elif src == "cache":
                    stats["cache"] += 1
                if apply_rec(q, rec, mid):
                    stats["applied"] += 1
                    chg = True
            if chg:
                if isinstance(data, dict):
                    data["questions"] = qs
                    fp.write_text(json.dumps(data), encoding="utf-8")
                else:
                    fp.write_text(json.dumps(qs), encoding="utf-8")
                stats["files"] += 1

        # recount letter
        left = 0
        for fp in book_dir.glob("*.json"):
            data = json.loads(fp.read_text(encoding="utf-8"))
            qs = data.get("questions") if isinstance(data, dict) else data
            if isinstance(qs, list):
                left += sum(1 for q in qs if leftover(q))
        print("  leftover now", left, flush=True)
        stats["leftLetter"] += left

    out = ROOT / "data" / "_migration" / "hydrate_books_marks.json"
    out.write_text(json.dumps(stats, indent=2), encoding="utf-8")
    print("DONE", json.dumps(stats), flush=True)


if __name__ == "__main__":
    main()
