#!/usr/bin/env python3
"""Overnight official resolve + self-dependency bake.
Never invents stems/options/figures/solutions.
"""
from __future__ import annotations

import hashlib
import json
import re
import ssl
import sys
import time
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
sys.path.insert(0, str(ROOT / "scripts"))
import hydrate_books_from_marks as H  # noqa: E402
import apply_official_nat as N  # noqa: E402

OUT_DIAG = ROOT / "assets" / "diagrams"
QID = ROOT / "data" / "qid_marks"
REPORT = ROOT / "data" / "_migration" / "overnight_selfdep_1908.json"
CTX = ssl.create_default_context()

SKIP_DIR = re.compile(r"^(_|\.)|bak|node_modules")
SKIP_FILE = re.compile(r"(\.bak|_gap_scan|_eg_raw|proofread|complete_proofread)")
REMOTE_RX = re.compile(
    r"""(?:src|href)=\\?["'](https?://[^"'\\]+)""",
    re.I,
)
BAKE_HOST = re.compile(
    r"(cdn\.quizrr\.in|watermarked_images|organic_book|cdn-question-pool\.getmarks\.app|"
    r"web\.getmarks\.app/.+\.(?:png|jpe?g|gif|webp|svg)|examgoalapis\.com|examgoal\.com/.+\.(?:png|jpe?g|gif|webp))",
    re.I,
)
LOCAL_OK = re.compile(r"/assets/diagrams/|qx-org-|qx-book-|qx-fig-", re.I)

AREAS = [
    ROOT / "data" / "banks",
    ROOT / "data" / "books" / "chapters",
    ROOT / "data" / "tests" / "jee_main_examgoal_2027" / "questions",
    ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter" / "questions",
    ROOT / "data" / "ncert_offline" / "chapters",
    ROOT / "data" / "board_offline" / "chapters",
    ROOT / "data" / "board_hsc_offline" / "chapters",
]


def walk_json(dirp: Path):
    if not dirp.exists():
        return
    for p in dirp.rglob("*.json"):
        if SKIP_DIR.search(p.parent.name) and p.parent != dirp:
            continue
        if p.name.startswith("_") or ".bak" in p.name:
            continue
        yield p


def qs_of(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("questions"), list):
        return data["questions"]
    return None


def leftover_why(q):
    raw = str(q.get("q") or q.get("question") or "")
    stem = H.strip(raw)
    opts = q.get("options") or []
    has = bool(re.search(r"<img\b", raw + " ".join(map(str, opts)), re.I))
    typ = str(q.get("questionType") or q.get("type") or "")
    is_num = bool(re.search(r"numerical|integer|nat|subjective|fill|written", typ, re.I)) or (
        q.get("correctValue") is not None and not opts
    )
    why = []
    if (not stem or stem.lower().startswith("loading")) and not has:
        why.append("empty")
    if not is_num and opts and H.opt_score(opts) < 2:
        why.append("letter")
    if is_num and q.get("correctValue") is None and q.get("answer") is None:
        why.append("nat")
    if re.search(r"\b(the figure|shown in (the )?(figure|diagram|graph)|shown below)\b", stem, re.I) and not has:
        why.append("fig")
    sol = H.strip(q.get("solution") or q.get("explanation") or "")
    if not sol and not re.search(r"<img\b", str(q.get("solution") or q.get("explanation") or ""), re.I):
        why.append("nosol")
    return why


def scan_remote():
    hosts = Counter()
    bake = Counter()
    files_with = 0
    quizrr_urls = set()
    leftover_getmarks = set()
    for area in AREAS:
        for fp in walk_json(area):
            try:
                txt = fp.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            found = REMOTE_RX.findall(txt)
            if not found:
                continue
            hit = False
            for u in found:
                u = u.replace("\\/", "/")
                if LOCAL_OK.search(u):
                    continue
                m = re.search(r"https?://([^/]+)", u, re.I)
                host = (m.group(1).lower() if m else "other")
                hosts[host] += 1
                if re.search(r"quizrr|watermarked|organic_book|examgoal", u, re.I):
                    quizrr_urls.add(u)
                    bake[host] += 1
                    hit = True
            if hit:
                files_with += 1
    return {
        "hosts": dict(hosts.most_common(20)),
        "bakeHosts": dict(bake),
        "uniqueQuizrr": len(quizrr_urls),
        "uniqueLeftoverGetmarks": len(leftover_getmarks),
        "files": files_with,
        "quizrr_urls": sorted(quizrr_urls),
        "getmarks_urls": sorted(leftover_getmarks),
    }


def sha(u):
    return hashlib.sha1(u.encode("utf-8")).hexdigest()[:16]


def download(url):
    dest = OUT_DIAG / f"qx-self-{sha(url)}.png"
    if dest.exists() and dest.stat().st_size > 80:
        return "/assets/diagrams/" + dest.name
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "image/*,*/*;q=0.8",
            "Referer": "https://web.getmarks.app/",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            buf = r.read()
        if len(buf) < 80:
            return None
        dest.write_bytes(buf)
        return "/assets/diagrams/" + dest.name
    except Exception:
        return None


def bake_urls(urls, limit=None):
    OUT_DIAG.mkdir(parents=True, exist_ok=True)
    mapping = {}
    ok = fail = skip = 0
    work = urls if limit is None else urls[:limit]
    work = [u for u in work if "/assets/diagrams/" not in u]
    print(f"  parallel bake {len(work)} urls", flush=True)

    def one(u):
        loc = download(u)
        return u, loc

    done = 0
    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = [pool.submit(one, u) for u in work]
        for fut in as_completed(futs):
            u, loc = fut.result()
            done += 1
            if loc:
                mapping[u] = loc
                ok += 1
            else:
                fail += 1
            if done % 80 == 0 or done == len(work):
                print(f"  bake {done}/{len(work)} ok={ok} fail={fail}", flush=True)
    rewritten = rewrite_mapping(mapping)
    return {"ok": ok, "fail": fail, "skip": skip, "rewrittenFiles": rewritten, "mapped": len(mapping)}


def rewrite_mapping(mapping):
    if not mapping:
        return 0
    pairs = {}
    for u, loc in mapping.items():
        pairs[u] = loc
        pairs[u.replace("/", "\\/")] = loc
    keys = sorted(pairs.keys(), key=len, reverse=True)
    rx = re.compile("|".join(re.escape(k) for k in keys))
    host_hint = re.compile(r"cdn\.quizrr\.in|examgoal\.net|watermarked|organic_book", re.I)
    rewritten = 0
    scanned = 0
    for area in AREAS:
        for fp in walk_json(area):
            scanned += 1
            try:
                txt = fp.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            if not host_hint.search(txt):
                continue
            nw = rx.sub(lambda m: pairs[m.group(0)], txt)
            if nw != txt:
                fp.write_text(nw, encoding="utf-8")
                rewritten += 1
                print("  rewrite", fp.name, flush=True)
    print(f"  rewrite scanned={scanned} files={rewritten}", flush=True)
    return rewritten


def apply_official_leftovers():
    stats = {
        "files": 0, "restoredOpts": 0, "appliedStem": 0, "appliedOpts": 0,
        "appliedSol": 0, "appliedNat": 0, "appliedMcq": 0, "fetched": 0,
        "cache": 0, "miss": 0, "seenIds": 0,
    }
    ids = []
    file_qs = []
    scanned = 0
    for area in AREAS:
        for fp in walk_json(area):
            try:
                data = json.loads(fp.read_text(encoding="utf-8"))
            except Exception:
                continue
            qs = qs_of(data)
            if not qs:
                continue
            scanned += 1
            if scanned % 200 == 0:
                print(f"  walk files {scanned}", flush=True)
            hit = False
            for q in qs:
                why = leftover_why(q)
                if not why:
                    continue
                # mechanical restore first
                if "letter" in why and H.restore_stem_option_images(q):
                    stats["restoredOpts"] += 1
                    hit = True
                    why = leftover_why(q)
                mid = q.get("_marksId")
                if mid and any(w != "nosol" or w == "nosol" for w in why):
                    # fetch official only for real leftovers or missing sols
                    if mid and why:
                        ids.append(str(mid))
                        hit = True
            if hit:
                file_qs.append((fp, data, qs))

    uniq = sorted(set(ids))
    stats["seenIds"] = len(uniq)
    print("leftover marksIds", len(uniq), "files", len(file_qs), flush=True)

    cache_map = {}
    for i, mid in enumerate(uniq, 1):
        rec, src = H.fetch_full(mid)
        if rec:
            cache_map[mid] = rec
            if src == "api":
                stats["fetched"] += 1
                time.sleep(H.SLEEP)
            else:
                stats["cache"] += 1
        else:
            stats["miss"] += 1
        if i % 40 == 0 or i == len(uniq):
            print(f"  fetch {i}/{len(uniq)} api={stats['fetched']} cache={stats['cache']} miss={stats['miss']}", flush=True)

    for fp, data, qs in file_qs:
        chg = False
        for q in qs:
            why = leftover_why(q)
            if not why:
                continue
            mid = q.get("_marksId")
            rec = cache_map.get(str(mid)) if mid else None
            if rec:
                old_q = str(q.get("q") or "")
                if rec.get("q") and (
                    len(H.strip(rec["q"])) > len(H.strip(old_q)) + 4
                    or (re.search(r"<img\b", rec["q"], re.I) and not re.search(r"<img\b", old_q, re.I))
                ):
                    # don't replace a text stem with image-only
                    if H.strip(rec["q"]) or not H.strip(old_q):
                        q["q"] = rec["q"]
                        q["question"] = rec["q"]
                        stats["appliedStem"] += 1
                        chg = True
                if H.opt_score(rec.get("options")) > H.opt_score(q.get("options")):
                    q["options"] = rec["options"]
                    stats["appliedOpts"] += 1
                    chg = True
                if rec.get("solution") and len(H.strip(rec["solution"])) > len(H.strip(q.get("solution") or q.get("explanation") or "")) + 8:
                    q["solution"] = rec["solution"]
                    q["explanation"] = rec["solution"]
                    stats["appliedSol"] += 1
                    chg = True
                dlt = N.official(mid)
                if dlt:
                    t = str(dlt.get("type") or "").lower()
                    if "numerical" in t or "integer" in t or dlt.get("correctValue") not in (None, ""):
                        if N.apply_nat(q, dlt, mid):
                            stats["appliedNat"] += 1
                            chg = True
                    elif N.apply_mcq_key(q, dlt, mid):
                        stats["appliedMcq"] += 1
                        chg = True
        if chg:
            if isinstance(data, list):
                fp.write_text(json.dumps(qs), encoding="utf-8")
            else:
                data["questions"] = qs
                fp.write_text(json.dumps(data), encoding="utf-8")
            stats["files"] += 1
    return stats


def mechanical_proofread():
    # reuse node qx-proofread via a tiny inline pass in python
    from pathlib import Path as P
    # implement the same replacements as lib/qx-proofread.js
    def proof(s):
        out = str(s or "")
        if not out:
            return out
        out = re.sub(r"https?:\\?/\\?/\.app/", "https://cdn-question-pool.getmarks.app/", out, flags=re.I)
        out = re.sub(r"https?://\.app/", "https://cdn-question-pool.getmarks.app/", out, flags=re.I)
        out = re.sub(r"https?://cdn-question-pool\.app/", "https://cdn-question-pool.getmarks.app/", out, flags=re.I)
        out = re.sub(r"LIST\s*[-–]?\s*II\s*\$", "List-II", out, flags=re.I)
        out = re.sub(r"LIST\s*[-–]?\s*I\s*\$", "List-I", out, flags=re.I)
        out = re.sub(r"\\\\\s*\[\s*[\d.]+\s*(?:pt|em|ex|mm|cm|mu)?\s*\]", r"\\\\", out, flags=re.I)
        out = re.sub(r"(?:^|>|\s)\[\s*[\d.]+\s*pt\s*\](?=\s|<|$)", " ", out)
        out = re.sub(
            r"\$\$\s*(\\mathrm\s*\{[A-Za-z0-9]+\})\s*\$\$",
            lambda m: "$" + m.group(1) + "$",
            out,
        )
        return out

    files = chg_files = chg_fields = 0
    for area in AREAS:
        for fp in walk_json(area):
            try:
                data = json.loads(fp.read_text(encoding="utf-8"))
            except Exception:
                continue
            qs = qs_of(data)
            if not qs:
                continue
            files += 1
            changed = False
            for q in qs:
                for k in ("q", "question", "questionText", "solution", "explanation"):
                    if q.get(k):
                        nw = proof(q[k])
                        if nw != q[k]:
                            q[k] = nw
                            chg_fields += 1
                            changed = True
                if isinstance(q.get("options"), list):
                    nw = [proof(o) if isinstance(o, str) else o for o in q["options"]]
                    if nw != q["options"]:
                        q["options"] = nw
                        chg_fields += 1
                        changed = True
            if changed:
                if isinstance(data, list):
                    fp.write_text(json.dumps(qs), encoding="utf-8")
                else:
                    data["questions"] = qs
                    fp.write_text(json.dumps(data), encoding="utf-8")
                chg_files += 1
    return {"scannedFiles": files, "changedFiles": chg_files, "changedFields": chg_fields}


def leftover_after():
    buckets = Counter()
    by_area = {}
    for area in AREAS:
        name = area.name if area.name != "chapters" else area.parent.name
        c = Counter()
        for fp in walk_json(area):
            try:
                data = json.loads(fp.read_text(encoding="utf-8"))
            except Exception:
                continue
            qs = qs_of(data)
            if not qs:
                continue
            for q in qs:
                for w in leftover_why(q):
                    if w == "nosol":
                        continue  # too many official-empty; count separately below
                    c[w] += 1
                    buckets[w] += 1
                    if q.get("_marksId") or q.get("_quizrrId") or q.get("_examgoalId"):
                        c[w + "_id"] += 1
        by_area[name] = dict(c)
    return {"buckets": dict(buckets), "byArea": by_area}


def main():
    print("=== scan remote ===", flush=True)
    remote = scan_remote()
    quizrr_like = remote.pop("quizrr_urls")
    getmarks = remote.pop("getmarks_urls")
    print(json.dumps({k: remote[k] for k in remote}, indent=2), flush=True)
    print("bake quizrr/eg", len(quizrr_like), "leftover-getmarks", len(getmarks), flush=True)

    print("=== bake quizrr/examgoal cdn ===", flush=True)
    bake_q = bake_urls(quizrr_like)

    bake_g = {"ok": 0, "fail": 0, "rewrittenFiles": 0, "mapped": 0, "skipped": 0}
    if getmarks:
        print("=== bake leftover getmarks figs ===", flush=True)
        bake_g = bake_urls(getmarks)

    print("=== apply official leftovers ===", flush=True)
    apply = apply_official_leftovers()
    print(json.dumps(apply, indent=2), flush=True)

    print("=== mechanical proofread ===", flush=True)
    mech = mechanical_proofread()
    print(json.dumps(mech, indent=2), flush=True)

    print("=== leftover after ===", flush=True)
    after = leftover_after()
    print(json.dumps(after, indent=2), flush=True)

    out = {
        "remoteBefore": {k: remote[k] for k in remote},
        "bakeQuizrr": bake_q,
        "bakeGetmarks": bake_g,
        "apply": apply,
        "mechanical": mech,
        "leftoverAfter": after,
    }
    REPORT.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print("WROTE", REPORT, flush=True)


if __name__ == "__main__":
    main()
