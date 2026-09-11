#!/usr/bin/env python3
from __future__ import annotations
import importlib.util
import json
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
REPORT = ROOT / "data" / "_migration" / "qx_apply_cache_only_report.json"

spec = importlib.util.spec_from_file_location("h", HERE / "_hydrate_all_from_marks.py")
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)
spec2 = importlib.util.spec_from_file_location("fix", HERE / "_qx_fix_kharab.py")
fix = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(fix)


def main():
    t0 = time.time()
    files = fix.f.chapter_files()
    cache_files = {p.stem: p for p in h.QIDDIR.glob("*.json")} if h.QIDDIR.exists() else {}
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

    stats = {"applied": 0, "need": 0, "no_rec": 0, "by": {}}
    for i, fp in enumerate(files, 1):
        extra, qs, as_list = h.load_qs(fp)
        if not qs:
            continue
        file_ch = False
        for q in qs:
            if not isinstance(q, dict) or not fix.needs(q):
                continue
            stats["need"] += 1
            rec = rec_for(fix.qid_for_fetch(q))
            if not rec:
                stats["no_rec"] += 1
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
        if i % 200 == 0:
            print("  apply", i, "/", len(files), "applied", stats["applied"], flush=True)
        del qs
    stats["sec"] = round(time.time() - t0, 1)
    REPORT.write_text(json.dumps(stats, indent=2), encoding="utf-8")
    print(json.dumps(stats, indent=2), flush=True)


if __name__ == "__main__":
    main()
