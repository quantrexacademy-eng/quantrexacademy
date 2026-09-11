#!/usr/bin/env python3
"""Apply official Marks cache to remaining broken Qs. Short API retries."""
from __future__ import annotations

import importlib.util
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
REPORT = ROOT / "data" / "_migration" / "qx_apply_kharab_report.json"

spec = importlib.util.spec_from_file_location("h", HERE / "_hydrate_all_from_marks.py")
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)
spec2 = importlib.util.spec_from_file_location("fix", HERE / "_qx_fix_kharab.py")
fix = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(fix)

WORKERS = 6
FETCH_CAP = 2500


def fetch_quick(qid):
    cache = h.QIDDIR / f"{qid}.json"
    if cache.exists() and cache.stat().st_size > 80:
        rec = h.parse_cache_file(cache)
        if rec:
            return qid, "cache", rec
    if h.AUTH_DEAD:
        return qid, "auth", None
    urls = (
        "https://production.getmarks.app/api/v1/questions/" + qid,
        "https://production.getmarks.app/api/v4/questions/" + qid,
    )
    for url in urls:
        for attempt in range(3):
            if h.AUTH_DEAD:
                return qid, "auth", None
            code, body = h.api_get(url)
            if code == 429:
                time.sleep(2 + attempt * 3)
                continue
            if code in (500, 502, 503):
                time.sleep(0.8)
                continue
            if code == 200:
                rec = h.parse_marks(body)
                if rec:
                    try:
                        h.QIDDIR.mkdir(parents=True, exist_ok=True)
                        cache.write_text(json.dumps(body), encoding="utf-8")
                    except Exception:
                        pass
                    return qid, "api", rec
                return qid, "empty", None
            if code in (401, 403):
                return qid, "auth", None
            if code == 404:
                break
            break
    return qid, "fail", None


def main():
    t0 = time.time()
    files = fix.f.chapter_files()
    cache_files = {}
    if h.QIDDIR.exists():
        for p in h.QIDDIR.iterdir():
            if p.suffix == ".json":
                cache_files[p.stem] = p
    print("files", len(files), "cache", len(cache_files), flush=True)
    cache_index = {}

    def rec_for(mid):
        if not mid:
            return None
        if mid in cache_index:
            return cache_index[mid]
        p = cache_files.get(str(mid))
        if not p:
            return None
        rec = h.parse_cache_file(p)
        if rec:
            cache_index[mid] = rec
        return rec

    stats = {"applied": 0, "need": 0, "fetch_ok": 0, "fetch_fail": 0, "by": {}, "cache_hit": 0}
    want = []
    seen = set()
    for fp in files:
        extra, qs, as_list = h.load_qs(fp)
        if not qs:
            continue
        pri = 0 if "jee_main" in str(fp) else 1
        for q in qs or []:
            if not isinstance(q, dict) or not fix.needs(q):
                continue
            stats["need"] += 1
            mid = fix.qid_for_fetch(q)
            if not mid or mid in seen:
                continue
            seen.add(mid)
            rec = rec_for(mid)
            if rec:
                stats["cache_hit"] += 1
                continue
            want.append((pri, mid))
        del qs
    want.sort()
    mids = [m for _, m in want][:FETCH_CAP]
    print("need_q", stats["need"], "cache_hit_ids", stats["cache_hit"], "to_fetch", len(mids), flush=True)

    fetched = dict(cache_index)
    if mids:
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            futs = {ex.submit(fetch_quick, mid): mid for mid in mids}
            n = 0
            for fut in as_completed(futs):
                qid, st, rec = fut.result()
                n += 1
                if rec:
                    fetched[qid] = rec
                    cache_index[qid] = rec
                    stats["fetch_ok"] += 1
                else:
                    stats["fetch_fail"] += 1
                if n % 200 == 0:
                    print("  fetch", n, "/", len(mids), "ok", stats["fetch_ok"], "fail", stats["fetch_fail"], flush=True)

    print("apply…", flush=True)
    for i, fp in enumerate(files, 1):
        extra, qs, as_list = h.load_qs(fp)
        if not qs:
            continue
        file_ch = False
        for q in qs:
            if not isinstance(q, dict):
                continue
            if not fix.needs(q):
                continue
            mid = fix.qid_for_fetch(q)
            rec = fetched.get(mid) or rec_for(mid)
            if not rec:
                continue
            ch = fix.apply_keep(q, rec)
            if ch:
                fix.sanitize_q(q)
                file_ch = True
                stats["applied"] += 1
                for c in ch:
                    stats["by"][c] = stats["by"].get(c, 0) + 1
        if file_ch:
            h.write_qs(fp, extra, qs, as_list)
        if i % 250 == 0:
            print("  apply", i, "/", len(files), "applied", stats["applied"], flush=True)
        del qs
    stats["sec"] = round(time.time() - t0, 1)
    REPORT.write_text(json.dumps(stats, indent=2), encoding="utf-8")
    print(json.dumps(stats, indent=2), flush=True)


if __name__ == "__main__":
    main()
