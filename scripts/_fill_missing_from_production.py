#!/usr/bin/env python3
"""Login-token fill: official Marks (production.getmarks.app) → USB chapters.

Never drops existing figures. Never invents. Student runtime stays Marks-free.
"""
from __future__ import annotations

import importlib.util
import json
import re
import time
import urllib.parse
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CHAPTERS = ROOT / "data" / "banks" / "chapters"
REPORT = ROOT / "data" / "_migration" / "fill_missing_report.json"
DOCS = ROOT / "data" / "_migration" / "fill_missing_docs.jsonl"
FIGURLS = ROOT / "data" / "_migration" / "fill_missing_fig_urls.txt"

spec = importlib.util.spec_from_file_location("h", HERE / "_hydrate_all_from_marks.py")
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)

SRC_RX = re.compile(r'\bsrc=(["\'])([^"\']+)\1', re.I)
IMG_RX = re.compile(r"<img\b[^>]*>", re.I)
FIGTALK = re.compile(
    r"shown in (the )?(figure|diagram|graph)|see (the )?(figure|diagram)|"
    r"as shown|the following (figure|diagram|graph)|given (figure|diagram)",
    re.I,
)
FOREIGN = re.compile(
    r"cdn-question-pool\.getmarks\.app|cdn-assets\.getmarks\.app|cdn\.quizrr\.in|examgoal\.net",
    re.I,
)
FETCH_CAP = 2200
BUCKET = "quantrexacademy-app.firebasestorage.app"


def rel(p: Path) -> str:
    return str(p.relative_to(ROOT)).replace("\\", "/")


def chapter_files():
    out = []
    for p in CHAPTERS.rglob("*.json"):
        if p.name.startswith("_") or "bak" in p.name.lower() or p.name == "index.json":
            continue
        out.append(p)
    out.sort(key=lambda p: (0 if "jee_main" in str(p) else 1, str(p)))
    return out


def srcs(html):
    return [m.group(2) for m in SRC_RX.finditer(str(html or ""))]


def basenames(html):
    out = set()
    for u in srcs(html):
        bn = urllib.parse.unquote(u.split("?")[0].split("/")[-1]).lower()
        if bn:
            out.add(bn)
    return out


def firebase_url(url):
    raw = str(url or "").strip()
    raw = raw.replace("https://.app/", "https://cdn-question-pool.getmarks.app/")
    rel_path = ""
    m1 = re.search(r"cdn-question-pool\.getmarks\.app/(.+?)(?:\?|#|$)", raw, re.I)
    if m1:
        rel_path = urllib.parse.unquote(m1.group(1))
    m2 = not rel_path and re.search(r"cdn\.quizrr\.in/(.+?)(?:\?|#|$)", raw, re.I)
    if m2:
        rel_path = "quizrr/" + urllib.parse.unquote(m2.group(1))
    m3 = not rel_path and re.search(r"examgoal\.net/(.+?)(?:\?|#|$)", raw, re.I)
    if m3:
        rel_path = "examgoal/" + urllib.parse.unquote(m3.group(1))
    m4 = not rel_path and re.search(r"cdn-assets\.getmarks\.app/(.+?)(?:\?|#|$)", raw, re.I)
    if m4:
        rel_path = "getmarks-assets/" + urllib.parse.unquote(m4.group(1))
    if not rel_path:
        return raw
    rel_path = rel_path.replace("\\", "/").lstrip("/")
    storage = "questions/figs/" + rel_path
    return (
        "https://firebasestorage.googleapis.com/v0/b/"
        + BUCKET
        + "/o/"
        + urllib.parse.quote(storage, safe="")
        + "?alt=media"
    )


def rewrite_foreign(html):
    s = str(html or "")
    if not FOREIGN.search(s):
        return s, False

    def repl(m):
        q, url = m.group(1), m.group(2)
        if not FOREIGN.search(url):
            return m.group(0)
        if "firebasestorage" in url or "/api/proxy-image" in url:
            return m.group(0)
        return "src=" + q + firebase_url(url) + q

    out = SRC_RX.sub(repl, s)
    return out, out != s


def merge_keep_figs(local, rec):
    loc = str(local or "")
    recs = str(rec or "")
    ch = False
    if recs and h.stem_score(recs) > h.stem_score(loc) + 8:
        # keep any local figures the official rec does not have
        keep = []
        rb = basenames(recs)
        for tag in IMG_RX.findall(loc):
            bn = (srcs(tag) or [""])[0].split("?")[0].split("/")[-1].lower()
            if bn and bn not in rb:
                keep.append(tag)
        loc = recs
        if keep:
            loc = loc.rstrip() + "\n" + "\n".join(keep)
        ch = True
    loc2, added = _append_missing_imgs(loc, recs)
    return loc2, ch or added


def _append_missing_imgs(local, rec):
    loc = str(local or "")
    lb = basenames(loc)
    added = []
    for tag in IMG_RX.findall(str(rec or "")):
        su = srcs(tag)
        bn = su[0].split("?")[0].split("/")[-1].lower() if su else ""
        if bn and bn not in lb:
            added.append(tag)
            lb.add(bn)
    if not added:
        return loc, False
    return loc.rstrip() + "\n" + "\n".join(added), True


def needs_plus(q):
    rs = list(h.needs(q) or [])
    raw = str(q.get("q") or q.get("question") or "")
    blob = raw + " " + " ".join(map(str, q.get("options") or [])) + " " + str(q.get("solution") or "")
    if FIGTALK.search(h.plain(raw)) and not IMG_RX.search(blob):
        if "fig" not in rs:
            rs.append("fig")
    if FOREIGN.search(blob) and "firebasestorage" not in blob:
        rs.append("foreign")
    return rs


def apply_keep(q, rec):
    ch = []
    if not rec:
        return ch
    old_q = str(q.get("q") or q.get("question") or "")
    new_q, stem_ch = merge_keep_figs(old_q, rec.get("q") or "")
    if stem_ch:
        q["q"] = new_q
        if "question" in q:
            q["question"] = new_q
        ch.append("stem")
    if rec.get("options") and h.opt_score(rec["options"]) > h.opt_score(q.get("options")):
        # merge option images onto richer official opts, keep local imgs if official missing them
        new_opts = list(rec["options"])
        old_opts = q.get("options") or []
        if len(old_opts) == len(new_opts):
            for i, o in enumerate(new_opts):
                merged, _ = merge_keep_figs(
                    old_opts[i] if isinstance(old_opts[i], str) else str((old_opts[i] or {}).get("text") or ""),
                    o if isinstance(o, str) else str(o or ""),
                )
                new_opts[i] = merged
        q["options"] = new_opts
        if rec.get("answer") is not None:
            q["answer"] = rec["answer"]
        ch.append("opts")
    else:
        opts = q.get("options") or []
        rec_opts = rec.get("options") or []
        if opts and rec_opts and len(opts) == len(rec_opts):
            changed_o = False
            out = []
            for i, o in enumerate(opts):
                local_o = o if isinstance(o, str) else str((o or {}).get("text") or "")
                rec_o = rec_opts[i] if isinstance(rec_opts[i], str) else str(rec_opts[i] or "")
                merged, did = merge_keep_figs(local_o, rec_o)
                if did:
                    changed_o = True
                out.append(merged)
            if changed_o:
                q["options"] = out
                ch.append("opts_fig")
    if rec.get("answer") is not None and q.get("answer") is None:
        q["answer"] = rec["answer"]
        ch.append("key")
    if rec.get("correctValue") is not None and q.get("correctValue") is None:
        q["correctValue"] = rec["correctValue"]
        ch.append("nat")
    old_sol = str(q.get("solution") or "")
    rec_sol = str(rec.get("solution") or "")
    if rec_sol:
        local_ok = IMG_RX.search(old_sol) and h.sol_score(old_sol) >= 40
        if local_ok:
            merged, did = _append_missing_imgs(old_sol, rec_sol)
            if did:
                q["solution"] = merged
                ch.append("sol_fig")
        elif h.sol_score(rec_sol) > h.sol_score(old_sol) + 8:
            merged, _ = merge_keep_figs(rec_sol, old_sol)
            q["solution"] = merged
            ch.append("sol")
        else:
            merged, did = _append_missing_imgs(old_sol, rec_sol)
            if did:
                q["solution"] = merged
                ch.append("sol_fig")
    if rec.get("_marksId") and not q.get("_marksId"):
        q["_marksId"] = rec["_marksId"]
    return ch


def rewrite_q(q):
    ch = False
    for k in ("q", "question", "solution", "explanation"):
        if k in q and q.get(k):
            nw, did = rewrite_foreign(q[k])
            if did:
                q[k] = nw
                ch = True
    opts = q.get("options")
    if isinstance(opts, list):
        new = []
        o_ch = False
        for o in opts:
            if isinstance(o, str):
                nw, did = rewrite_foreign(o)
                new.append(nw)
                o_ch = o_ch or did
            elif isinstance(o, dict):
                o2 = dict(o)
                for kk in ("text", "html"):
                    if o2.get(kk):
                        nw, did = rewrite_foreign(o2[kk])
                        if did:
                            o2[kk] = nw
                            o_ch = True
                new.append(o2)
            else:
                new.append(o)
        if o_ch:
            q["options"] = new
            ch = True
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
        "correctValue": q.get("correctValue"),
        "solution": q.get("solution") or "",
        "source": q.get("source") or "",
        "difficulty": q.get("difficulty") or "",
        "file": file_rel,
        "migrationStatus": "completed",
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "metadata": {"origin": "production_marks_fill"},
    }


def rec_quality(rec):
    if not rec:
        return 0
    n = h.stem_score(rec.get("q")) + h.opt_score(rec.get("options")) + h.sol_score(rec.get("solution"))
    return n


def main():
    t0 = time.time()
    files = chapter_files()
    print("chapter files", len(files), flush=True)
    cache_files = {}
    if h.QIDDIR.exists():
        for p in h.QIDDIR.iterdir():
            if p.suffix == ".json":
                cache_files[p.stem] = p
    print("qid_marks", len(cache_files), flush=True)
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

    want = []
    seen = set()
    stats = {"q": 0, "need": 0, "fig": 0, "foreign": 0}
    print("scan…", flush=True)
    for i, fp in enumerate(files, 1):
        extra, qs, as_list = h.load_qs(fp)
        if not qs:
            continue
        pri = 0 if "jee_main" in rel(fp) else 1
        for q in qs:
            if not q:
                continue
            stats["q"] += 1
            rs = needs_plus(q)
            if not rs:
                continue
            stats["need"] += 1
            if "fig" in rs:
                stats["fig"] += 1
            if "foreign" in rs:
                stats["foreign"] += 1
            mid = h.mongo_id(q)
            if not mid or mid in seen:
                continue
            rec = rec_for(mid)
            still = True
            if rec and rec_quality(rec) >= 30 and "fig" not in rs and "opts" not in rs:
                # cache may still fill sol on apply; skip live fetch if rec looks complete
                if "sol" in rs and h.sol_score(rec.get("solution")) < 20:
                    still = True
                elif "sol" in rs and h.sol_score(rec.get("solution")) >= 20:
                    still = False
                else:
                    still = False
            if still:
                seen.add(mid)
                want.append((pri, 0 if "fig" in rs or "opts" in rs else 1, mid))
        if i % 250 == 0:
            print("  scanned", i, "/", len(files), "need", stats["need"], "queue", len(want), flush=True)
        del qs
    want.sort()
    mids = [m for _, _, m in want][:FETCH_CAP]
    print("scan", stats, "to_fetch", len(mids), "queued", len(want), flush=True)

    def fetch_prod(mid):
        cached = rec_for(mid)
        if cached and rec_quality(cached) >= 50 and h.sol_score(cached.get("solution")) >= 20:
            return cached, "cache"
        if h.AUTH_DEAD:
            return cached, "auth"
        for url in (
            "https://production.getmarks.app/api/v1/questions/" + mid,
            "https://production.getmarks.app/api/v4/questions/" + mid,
        ):
            code, body = h.api_get(url)
            if code in (401, 403):
                return cached, "auth"
            if code == 200:
                rec = h.parse_marks(body)
                if rec:
                    try:
                        h.QIDDIR.mkdir(parents=True, exist_ok=True)
                        (h.QIDDIR / f"{mid}.json").write_text(json.dumps(body), encoding="utf-8")
                    except Exception:
                        pass
                    cache_index[mid] = rec
                    return rec, "api"
            if code == 429:
                time.sleep(8)
                continue
        return cached, "fail"

    fetched = {}
    n_ok = n_api = n_fail = 0
    for i, mid in enumerate(mids, 1):
        if h.AUTH_DEAD:
            print("AUTH_DEAD", flush=True)
            break
        rec, how = fetch_prod(mid)
        if rec:
            fetched[mid] = rec
            n_ok += 1
            if how == "api":
                n_api += 1
                time.sleep(0.16)
        else:
            n_fail += 1
        if i % 25 == 0 or i == len(mids):
            print(f"  fetch {i}/{len(mids)} ok={n_ok} api={n_api} fail={n_fail}", flush=True)

    changed_q = 0
    files_written = 0
    by_reason = {}
    still_need = {}
    fig_urls = set()
    docs_n = 0
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    print("apply…", flush=True)
    with DOCS.open("w", encoding="utf-8") as docs_f:
        for fp in files:
            extra, qs, as_list = h.load_qs(fp)
            if not qs:
                continue
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
                ch = apply_keep(q, rec) if rec else []
                if rewrite_q(q):
                    ch.append("rewrite")
                if ch:
                    file_ch += 1
                    changed_q += 1
                    for r in ch:
                        by_reason[r] = by_reason.get(r, 0) + 1
                    blob = str(q.get("q") or "") + str(q.get("solution") or "") + "".join(map(str, q.get("options") or []))
                    for u in srcs(blob):
                        if "cdn-question-pool" in u or "cdn.quizrr" in u or "examgoal.net" in u:
                            fig_urls.add(u)
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

    FIGURLS.write_text("\n".join(sorted(fig_urls)), encoding="utf-8")
    rep = {
        "scan": stats,
        "applied": changed_q,
        "filesWritten": files_written,
        "by_reason": by_reason,
        "fetched_ok": n_ok,
        "api": n_api,
        "fail": n_fail,
        "still_need": still_need,
        "authDead": h.AUTH_DEAD,
        "docs": docs_n,
        "fig_urls": len(fig_urls),
        "seconds": round(time.time() - t0, 1),
    }
    REPORT.write_text(json.dumps(rep, indent=2), encoding="utf-8")
    print("APPLIED", changed_q, "files", files_written, by_reason, flush=True)
    print("STILL_NEED", still_need, flush=True)
    print("DOCS", docs_n, "FIGS", len(fig_urls), "sec", rep["seconds"], flush=True)


if __name__ == "__main__":
    main()
