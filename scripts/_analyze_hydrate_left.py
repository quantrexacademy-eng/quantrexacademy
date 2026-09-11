#!/usr/bin/env python3
"""Analyze leftover after Marks hydrate. Never invents."""
from __future__ import annotations
import json, re, collections
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
STATE = json.loads((ROOT / "data/_migration/marks_all_hydrate_state.json").read_text(encoding="utf-8"))
REP = json.loads((ROOT / "data/_migration/marks_all_hydrate_report.json").read_text(encoding="utf-8"))

print("applied", REP.get("applied"), "files", REP.get("filesWritten"), REP.get("by_reason"))
print("still_need", REP.get("still_need"))
print("fetch ok/fail/empty", REP.get("fetched_ok"), REP.get("fail"), REP.get("empty"))

done = STATE.get("done") or {}
ctr = collections.Counter(done.values())
print("done statuses", dict(ctr))
fails = [k for k, v in done.items() if v not in ("ok", "empty", "404", True, "cache")]
print("fail sample", fails[:8], "n", len(fails))
print("404 n", sum(1 for v in done.values() if v == "404"))

# leftover by bank
import sys
sys.path.insert(0, str(ROOT / "scripts"))
from _hydrate_all_from_marks import needs, mongo_id, plain, load_qs, json_files, sol_score  # noqa

by_file = collections.Counter()
by_reason = collections.Counter()
no_id = collections.Counter()
with_id = collections.Counter()
jee2026_empty = 0
samples = []
for fp in json_files():
    extra, qs, _ = load_qs(fp)
    if not qs:
        continue
    rel = str(fp.relative_to(ROOT)).replace("\\", "/")
    for q in qs:
        if not q:
            continue
        rs = needs(q)
        if not rs:
            continue
        by_file[rel] += 1
        for r in rs:
            by_reason[r] += 1
        mid = mongo_id(q)
        if mid:
            with_id[rel] += 1
        else:
            no_id[rel] += 1
        src = str(q.get("source") or "")
        if "jee_main" in rel and "2026" in src and "sol" in rs:
            jee2026_empty += 1
            if len(samples) < 8:
                samples.append({"id": q.get("id"), "mid": mid, "src": src, "sol": plain(q.get("solution"))[:80], "need": rs})

print("leftover by_reason", dict(by_reason))
print("top leftover files:")
for f, n in by_file.most_common(20):
    print(f"  {n:5d} id={with_id[f]:4d} noid={no_id[f]:4d}  {f}")
print("jee2026 empty sol", jee2026_empty)
print("samples", json.dumps(samples, indent=2)[:1500])
