#!/usr/bin/env python3
"""Deep-resolve missing/broken figures in Q/options/solutions from official Marks.
Never invents. Wipes Marks logos. Stages Firebase uploads.
"""
from __future__ import annotations

import json
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
sys.path.insert(0, str(ROOT / "scripts"))
from _wipe_marks_permanent import (  # noqa: E402
    download,
    firebase_to_marks,
    load_rgb,
    process_figure,
    save_rgb,
)
from _hydrate_all_from_marks import (  # noqa: E402
    HEX24,
    apply_rec,
    fetch_one,
    mongo_id,
    needs,
    parse_marks,
    plain,
    sol_score,
)

BANKS = ROOT / "data" / "banks"
STAGE = ROOT / "data" / "_migration" / "wiped_upload"
MANIFEST = ROOT / "data" / "_migration" / "wiped_upload_manifest.json"
FBSET = ROOT / "data" / "_migration" / "firebase_figs_set.txt"
CFG = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOK = CFG["token"]
CTX = ssl.create_default_context()
SRC_RX = re.compile(r'\bsrc=["\']([^"\']+)["\']', re.I)
FIG_TALK = re.compile(
    r"\b(shown in (the )?(figure|diagram|graph)|see (the )?figure|as shown in (the )?figure)\b",
    re.I,
)
# tighter than previous scan — skip "following reaction" text chemistry


def bank_files():
    return [p for p in sorted(BANKS.glob("*.json")) if "bak" not in p.name]


def load_bank(path: Path):
    raw = json.loads(path.read_text(encoding="utf-8"))
    qs = raw.get("questions") if isinstance(raw, dict) else raw
    extra = {k: v for k, v in raw.items() if k != "questions"} if isinstance(raw, dict) else {}
    return extra, qs, isinstance(raw, list)


def save_bank(path: Path, extra, qs, as_list):
    if as_list:
        path.write_text(json.dumps(qs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        return
    extra["questions"] = qs
    path.write_text(json.dumps(extra, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def fb_path_from_url(u: str) -> str:
    m = re.search(r"/o/([^?]+)", u)
    if not m:
        return ""
    p = urllib.parse.unquote(m.group(1))
    return p


def marks_to_storage(marks_url: str) -> str:
    u = marks_url.split("?")[0]
    m = re.search(r"cdn-question-pool\.getmarks\.app/(.+)$", u, re.I)
    if m:
        return "questions/figs/" + urllib.parse.unquote(m.group(1))
    m = re.search(r"cdn\.quizrr\.in/(.+)$", u, re.I)
    if m:
        return "questions/figs/quizrr/" + urllib.parse.unquote(m.group(1))
    return ""


def rewrite_src_to_firebase(html: str, url_map: dict) -> str:
    if not html or not url_map:
        return html

    def repl(m):
        u = m.group(1)
        nu = url_map.get(u) or url_map.get(u.split("?")[0])
        if not nu:
            return m.group(0)
        return m.group(0).replace(u, nu)

    return SRC_RX.sub(repl, html)


def firebase_public(storage_path: str) -> str:
    return (
        "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/"
        + urllib.parse.quote(storage_path, safe="")
        + "?alt=media"
    )


def collect_urls_and_targets():
    fb_urls = []
    cdn_urls = []
    miss_fig = []  # (path, idx, q, reason)
    letter = []
    seen_fb = set()
    seen_cdn = set()
    for p in bank_files():
        extra, qs, _ = load_bank(p)
        if not qs:
            continue
        rel = str(p.relative_to(ROOT)).replace("\\", "/")
        for i, q in enumerate(qs or []):
            if not q:
                continue
            qh = str(q.get("q") or "")
            sh = str(q.get("solution") or "")
            oh = " ".join(str(o if not isinstance(o, dict) else (o.get("text") or "")) for o in (q.get("options") or []))
            blob = qh + " " + sh + " " + oh
            for u in SRC_RX.findall(blob):
                if "firebasestorage" in u:
                    if u not in seen_fb:
                        seen_fb.add(u)
                        fb_urls.append(u)
                elif "cdn-question-pool.getmarks.app" in u or "cdn.quizrr.in" in u:
                    if u not in seen_cdn:
                        seen_cdn.add(u)
                        cdn_urls.append(u)
            if FIG_TALK.search(plain(qh)) and not SRC_RX.search(qh):
                miss_fig.append((rel, i, "stem"))
            if FIG_TALK.search(plain(sh)) and not SRC_RX.search(sh):
                miss_fig.append((rel, i, "sol"))
            opts = q.get("options") or []
            if opts:
                from _hydrate_all_from_marks import opt_plain, letter_opts, is_nat
                if (not is_nat(q)) and letter_opts(opts):
                    letter.append((rel, i))
    return fb_urls, cdn_urls, miss_fig, letter


def stage_from_marks(marks_url: str, storage: str, rows: list) -> bool:
    raw = ROOT / "data/_migration/_wm_test/resolve_raw" / Path(storage.replace("/", "__")).name
    if not raw.exists() or raw.stat().st_size < 80:
        if not download(marks_url, raw):
            return False
    try:
        arr = load_rgb(raw)
        out = process_figure(arr)
    except Exception:
        return False
    dest = STAGE / storage.replace("/", "__")
    save_rgb(out, dest)
    rows.append({"storage": storage, "file": str(dest), "marks": marks_url})
    return True


def main():
    print("collecting…", flush=True)
    fb_urls, cdn_urls, miss_fig, letter = collect_urls_and_targets()
    print("firebase urls", len(fb_urls), "marks/quizrr cdn", len(cdn_urls), "talk_no_img", len(miss_fig), "letter", len(letter), flush=True)

    have = set()
    if FBSET.exists():
        have = set(x.strip() for x in FBSET.read_text(encoding="utf-8").splitlines() if x.strip())
        print("firebase listed", len(have), flush=True)
    else:
        print("NO firebase list yet — treating all firebase urls as maybe-missing", flush=True)

    missing_fb = []
    for u in fb_urls:
        p = fb_path_from_url(u)
        if not p:
            continue
        if have and p in have:
            continue
        # also try .png if .jpg path
        if have and (p in have or p.rsplit(".", 1)[0] + ".png" in have):
            continue
        missing_fb.append((u, p))
    print("firebase not in listing", len(missing_fb), flush=True)

    rows = []
    if MANIFEST.exists():
        try:
            old = json.loads(MANIFEST.read_text(encoding="utf-8"))
            rows = list(old.get("rows") or [])
        except Exception:
            rows = []
    staged_storage = {r.get("storage") for r in rows}

    ok = fail = 0
    # 1) fill missing firebase from Marks CDN
    todo = []
    for u, p in missing_fb:
        marks = firebase_to_marks(u)
        if marks:
            todo.append((marks, p))
    for u in cdn_urls:
        st = marks_to_storage(u)
        if st and st not in staged_storage:
            todo.append((u.split("?")[0], st))
    # unique storage
    uniq = []
    seen_s = set(staged_storage)
    for marks, st in todo:
        if st in seen_s:
            continue
        seen_s.add(st)
        uniq.append((marks, st))
    print("to download/wipe", len(uniq), flush=True)
    for i, (marks, st) in enumerate(uniq, 1):
        if stage_from_marks(marks, st, rows):
            ok += 1
        else:
            fail += 1
        if i % 40 == 0 or i == len(uniq):
            print(f"  stage {i}/{len(uniq)} ok={ok} fail={fail}", flush=True)
    MANIFEST.write_text(json.dumps({"n": len(rows), "ok": ok, "fail": fail, "rows": rows}, indent=2), encoding="utf-8")
    print("staged total rows", len(rows), "this run ok", ok, "fail", fail)

    # 2) rewrite bank Marks CDN → firebase public URL
    url_map = {}
    for r in rows:
        marks = r.get("marks") or ""
        st = r.get("storage") or ""
        if marks and st:
            pub = firebase_public(st)
            url_map[marks] = pub
            url_map[marks.split("?")[0]] = pub
    changed_files = 0
    changed_q = 0
    if url_map:
        for p in bank_files():
            extra, qs, as_list = load_bank(p)
            if not qs:
                continue
            ch = 0
            for q in qs:
                if not q:
                    continue
                for fld in ("q", "question", "solution", "explanation"):
                    if q.get(fld) and "cdn-question-pool.getmarks.app" in str(q.get(fld)) or (
                        q.get(fld) and "cdn.quizrr.in" in str(q.get(fld))
                    ):
                        nw = rewrite_src_to_firebase(str(q.get(fld)), url_map)
                        if nw != q.get(fld):
                            q[fld] = nw
                            ch += 1
                opts = q.get("options") or []
                new_opts = []
                opt_ch = False
                for o in opts:
                    if isinstance(o, str) and ("getmarks.app" in o or "quizrr.in" in o):
                        nw = rewrite_src_to_firebase(o, url_map)
                        new_opts.append(nw)
                        if nw != o:
                            opt_ch = True
                    elif isinstance(o, dict):
                        t = o.get("text") or ""
                        if "getmarks.app" in t or "quizrr.in" in t:
                            o = dict(o)
                            o["text"] = rewrite_src_to_firebase(t, url_map)
                            opt_ch = True
                        new_opts.append(o)
                    else:
                        new_opts.append(o)
                if opt_ch:
                    q["options"] = new_opts
                    ch += 1
            if ch:
                save_bank(p, extra, qs, as_list)
                changed_files += 1
                changed_q += ch
                print("rewrote cdn→fb", p.name, ch, flush=True)
    print("cdn rewrite files", changed_files, "fields", changed_q)

    # 3) missing fig / letter stubs from Marks v4
    need_ids = []
    jobs = []  # (rel, idx, mid, reason)
    for rel, i, reason in miss_fig:
        extra, qs, _ = load_bank(ROOT / rel)
        q = qs[i]
        mid = mongo_id(q)
        if mid:
            jobs.append((rel, i, mid, reason))
            need_ids.append(mid)
    for rel, i in letter:
        extra, qs, _ = load_bank(ROOT / rel)
        q = qs[i]
        mid = mongo_id(q)
        if mid:
            jobs.append((rel, i, mid, "opts"))
            need_ids.append(mid)
    uniq_ids = []
    seenid = set()
    for mid in need_ids:
        if mid in seenid:
            continue
        seenid.add(mid)
        uniq_ids.append(mid)
    print("marks fetch for leftover", len(uniq_ids), "jobs", len(jobs), flush=True)
    fetched = {}
    n_ok = n_fail = 0
    with ThreadPoolExecutor(max_workers=4) as ex:
        futs = {ex.submit(fetch_one, qid): qid for qid in uniq_ids}
        n = 0
        for fut in as_completed(futs):
            n += 1
            qid, status, rec = fut.result()
            if rec:
                fetched[qid] = rec
                n_ok += 1
            else:
                n_fail += 1
            if n % 50 == 0 or n == len(uniq_ids):
                print(f"  fetch {n}/{len(uniq_ids)} ok={n_ok} fail={n_fail}", flush=True)
    by_file = defaultdict(list)
    for rel, i, mid, reason in jobs:
        by_file[rel].append((i, mid, reason))
    applied = 0
    for rel, items in by_file.items():
        extra, qs, as_list = load_bank(ROOT / rel)
        ch = 0
        for i, mid, reason in items:
            rec = fetched.get(mid)
            if not rec:
                continue
            q = qs[i]
            got = apply_rec(q, rec)
            if got:
                ch += 1
                applied += 1
        if ch:
            save_bank(ROOT / rel, extra, qs, as_list)
            print("applied marks", rel, ch, flush=True)
    print("applied leftover", applied)
    print("DONE")


if __name__ == "__main__":
    main()
