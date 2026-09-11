#!/usr/bin/env python3
"""Fix broken chapter-bank Q/sol/fig from official Marks + mechanical sanitize.

Never invents academic content. Never drops existing figures.
"""
from __future__ import annotations

import html
import importlib.util
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CHAPTERS = ROOT / "data" / "banks" / "chapters"
REPORT = ROOT / "data" / "_migration" / "qx_fix_kharab_report.json"

spec = importlib.util.spec_from_file_location("h", HERE / "_hydrate_all_from_marks.py")
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)

spec2 = importlib.util.spec_from_file_location("f", HERE / "_fill_missing_from_production.py")
f = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(f)

IMG = re.compile(r"<img\b", re.I)
PLACE = re.compile(
    r"solution not available|no solution available|community solution|"
    r"support us by uploading|official solution is not available|no solution\.?$",
    re.I,
)
NEST = re.compile(
    r"\$\s*\\(lt|gt|le|ge|leq|geq|ne|neq|Rightarrow|rightarrow|leftarrow|to|times|cdot|pm)\s*\$"
)
CMD = {
    "lt": "\\lt ", "gt": "\\gt ", "le": "≤", "ge": "≥", "leq": "≤", "geq": "≥",
    "ne": "≠", "neq": "≠", "Rightarrow": "⇒", "rightarrow": "→",
    "leftarrow": "←", "to": "→", "times": "×", "cdot": "·", "pm": "±",
}
KATEX_ERR = re.compile(r'<span[^>]*class=["\'][^"\']*katex-error[^"\']*["\'][^>]*>([\s\S]*?)</span>', re.I)
WORKERS = 5
FETCH_CAP = 8000


def plain(s):
    return h.plain(s)


def is_nat(q):
    return h.is_nat(q)


def sol_bad(q):
    s = str(q.get("solution") or q.get("sol") or "")
    t = plain(s)
    if PLACE.search(t) or not t:
        return True
    return h.sol_score(s) < 12


def nat_key_bad(q):
    if not is_nat(q):
        return False
    cv = q.get("correctValue")
    if cv not in (None, ""):
        return False
    ans = q.get("answer")
    if isinstance(ans, str) and re.search(r"\d", ans) and ans.strip() not in ("0", "None"):
        return False
    # integer 0 with no correctValue is almost always a missing NAT key
    return True


def mcq_opts_bad(q):
    if is_nat(q):
        return False
    opts = q.get("options") or []
    if len(opts) < 2:
        return True
    return h.letter_opts(opts)


def needs(q):
    rs = []
    raw = str(q.get("q") or q.get("question") or "")
    p = plain(raw)
    if len(p) < 8 and not IMG.search(raw):
        rs.append("stem")
    if sol_bad(q):
        rs.append("sol")
    if mcq_opts_bad(q):
        rs.append("opts")
    if nat_key_bad(q):
        rs.append("nat")
    blob = raw + " " + " ".join(map(str, q.get("options") or [])) + " " + str(q.get("solution") or "")
    if f.FIGTALK.search(plain(raw)) and not IMG.search(blob):
        rs.append("fig")
    return rs


def sanitize_math(s: str) -> str:
    out = str(s or "")
    if not out:
        return out
    out = html.unescape(out)
    out = KATEX_ERR.sub(r"\1", out)
    out = re.sub(r"ParseError:[^<\n]{0,400}", "", out)
    out = re.sub(r"KaTeX parse error:[^<\n]{0,400}", "", out)
    out = NEST.sub(lambda m: CMD.get(m.group(1), " "), out)

    def protect(m):
        inner = m.group(1)
        if re.search(r"</?[a-zA-Z]", inner):
            return m.group(0)
        inner = inner.replace("<", "\\lt ").replace(">", "\\gt ")
        return "$" + inner + "$"

    out = re.sub(r"\$([^$]{1,4000})\$", protect, out)
    return out


def sanitize_q(q) -> bool:
    ch = False
    for k in ("q", "question", "solution", "sol", "explanation"):
        if not q.get(k):
            continue
        nw = sanitize_math(str(q[k]))
        if nw != q[k]:
            q[k] = nw
            ch = True
    opts = q.get("options")
    if isinstance(opts, list):
        new = []
        o_ch = False
        for o in opts:
            if isinstance(o, str):
                nw = sanitize_math(o)
                o_ch = o_ch or nw != o
                new.append(nw)
            elif isinstance(o, dict):
                o2 = dict(o)
                for kk in ("text", "html"):
                    if o2.get(kk):
                        nw = sanitize_math(str(o2[kk]))
                        if nw != o2[kk]:
                            o2[kk] = nw
                            o_ch = True
                new.append(o2)
            else:
                new.append(o)
        if o_ch:
            q["options"] = new
            ch = True
    if f.rewrite_q(q):
        ch = True
    return ch


def apply_keep(q, rec):
    """Like fill.apply_keep, but always replace placeholder sols and fill NAT 0-keys."""
    ch = list(f.apply_keep(q, rec) or [])
    if not rec:
        return ch
    rec_sol = str(rec.get("solution") or "")
    old_sol = str(q.get("solution") or "")
    if rec_sol and PLACE.search(plain(old_sol)) and h.sol_score(rec_sol) >= 20:
        q["solution"] = rec_sol
        if "sol" not in ch:
            ch.append("sol")
    cv = rec.get("correctValue")
    if cv not in (None, "", "None") and is_nat(q):
        if q.get("correctValue") in (None, "", "None") or nat_key_bad(q):
            q["correctValue"] = cv
            q["answer"] = cv
            if "nat" not in ch:
                ch.append("nat")
    if rec.get("answer") is not None and not is_nat(q) and q.get("answer") in (None, "", "None"):
        q["answer"] = rec["answer"]
        if "key" not in ch:
            ch.append("key")
    return ch


def qid_for_fetch(q):
    mid = h.mongo_id(q)
    if mid:
        return mid
    i = q.get("id")
    if i is not None and re.fullmatch(r"\d{4,}", str(i)):
        return str(i)
    return ""


def main():
    t0 = time.time()
    files = f.chapter_files()
    print("files", len(files), flush=True)

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
        p = cache_files.get(str(mid))
        if not p:
            return None
        rec = h.parse_cache_file(p)
        if rec:
            cache_index[mid] = rec
        return rec

    stats = {
        "q": 0, "sanitized_files": 0, "sanitized_q": 0,
        "need": 0, "applied": 0, "fetch_ok": 0, "fetch_fail": 0,
        "by": {},
    }
    want = []
    seen = set()

    print("phase1 sanitize + collect…", flush=True)
    for i, fp in enumerate(files, 1):
        extra, qs, as_list = h.load_qs(fp)
        if not qs:
            continue
        file_ch = False
        for q in qs:
            if not isinstance(q, dict):
                continue
            stats["q"] += 1
            if sanitize_q(q):
                stats["sanitized_q"] += 1
                file_ch = True
            rs = needs(q)
            if not rs:
                continue
            stats["need"] += 1
            mid = qid_for_fetch(q)
            if mid and mid not in seen:
                seen.add(mid)
                pri = 0 if "jee_main" in str(fp) else 1
                want.append((pri, 0 if ("opts" in rs or "nat" in rs or "fig" in rs) else 1, mid))
        if file_ch:
            h.write_qs(fp, extra, qs, as_list)
            stats["sanitized_files"] += 1
        if i % 200 == 0:
            print("  scanned", i, "/", len(files), "need-ids", len(want), "san_q", stats["sanitized_q"], flush=True)
        del qs

    want.sort()
    mids = [m for _, _, m in want][:FETCH_CAP]
    print("to_fetch", len(mids), "queued", len(want), "need_q", stats["need"], flush=True)

    fetched = {}
    if mids:
        with ThreadPoolExecutor(max_workers=WORKERS) as ex:
            futs = {ex.submit(h.fetch_one, mid): mid for mid in mids}
            done_n = 0
            for fut in as_completed(futs):
                qid, status, rec = fut.result()
                done_n += 1
                if rec:
                    fetched[qid] = rec
                    cache_index[qid] = rec
                    stats["fetch_ok"] += 1
                elif status not in ("cache",):
                    stats["fetch_fail"] += 1
                if rec and status == "cache":
                    stats["fetch_ok"] += 1
                if done_n % 200 == 0:
                    print("  fetch", done_n, "/", len(mids), "ok", stats["fetch_ok"], flush=True)

    print("phase2 apply…", flush=True)
    for i, fp in enumerate(files, 1):
        extra, qs, as_list = h.load_qs(fp)
        if not qs:
            continue
        file_ch = False
        for q in qs:
            if not isinstance(q, dict):
                continue
            if not needs(q) and not nat_key_bad(q) and not sol_bad(q):
                continue
            mid = qid_for_fetch(q)
            rec = fetched.get(mid) or rec_for(mid)
            if not rec:
                continue
            ch = apply_keep(q, rec)
            if ch:
                sanitize_q(q)
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
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(stats, indent=2), encoding="utf-8")
    print(json.dumps(stats, indent=2), flush=True)


if __name__ == "__main__":
    main()
