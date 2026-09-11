#!/usr/bin/env python3
"""Resolve remaining official leftovers. Never invents stems/options/sols.

Fixes:
  1) Space-aware Marks/Quizrr/Examgoal CDN → Firebase Storage rewrite
  2) Glued TeX  $...$$\\mathrm{...}  islands
  3) Official solutions/figures from data/qid_marks when richer
"""
from __future__ import annotations

import hashlib
import json
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
sys.path.insert(0, str(ROOT / "scripts"))
from _restore_leftovers_official import (  # noqa: E402
    apply_official,
    leftover_kind,
    load_map,
    marks_id,
    official_pack,
    proof_tex,
    qs_of,
    rewrite_cdn,
    walk_json,
)

BUCKET = "quantrexacademy-app.firebasestorage.app"
MIG = ROOT / "data" / "_migration"
LIST_FILE = MIG / "firebase_figs_list.txt"
MAP_FILE = MIG / "selfdep_url_map.json"
NEED_FILE = MIG / "selfdep_need_download.txt"
TMP = MIG / "bake_tmp"
QID = ROOT / "data" / "qid_marks"
CTX = ssl.create_default_context()

CDN_RX = re.compile(
    r"""https?://(?:cdn-question-pool\.getmarks\.app|cdn-assets\.getmarks\.app|cdn\.quizrr\.in|app-content\.cdn\.examgoal\.net)[^\"'<>\\]+""",
    re.I,
)
GLUE_RX = re.compile(r"\$([^$\n]{0,160})\$\$(\\mathrm\{)")
IMG_EXT_RX = re.compile(r"\.(?:png|jpe?g|webp|gif|svg)(?:$|\?)", re.I)

AREAS = [
    ROOT / "data" / "banks",
    ROOT / "data" / "books" / "chapters",
    ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter",
    ROOT / "data" / "tests" / "jee_main_examgoal_2027",
    ROOT / "data" / "formulas.json",
    ROOT / "data" / "ncert_offline",
    ROOT / "data" / "board_offline",
    ROOT / "data" / "board_hsc_offline",
    ROOT / "data" / "quick_concepts",
]


def sha16(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()[:16]


def norm_url(u: str) -> str:
    s = str(u or "").replace("\\/", "/").strip().rstrip("\\").rstrip()
    s = s.split("#")[0]
    return s.split("?")[0]


def looks_image(u: str) -> bool:
    n = norm_url(u)
    if IMG_EXT_RX.search(n):
        return True
    if "formula_card" in n.lower():
        return True
    return False


def storage_rel(url: str) -> str:
    u = norm_url(url)
    if "cdn-question-pool.getmarks.app/" in u:
        rel = urllib.parse.unquote(u.split("cdn-question-pool.getmarks.app/", 1)[1])
        return "questions/figs/" + rel.lstrip("/")
    if "cdn.quizrr.in/" in u:
        rel = urllib.parse.unquote(u.split("cdn.quizrr.in/", 1)[1])
        return "questions/figs/quizrr/" + rel.lstrip("/")
    if "examgoal.net/" in u:
        rel = urllib.parse.unquote(u.split("examgoal.net/", 1)[1])
        return "questions/figs/examgoal/" + rel.lstrip("/")
    if "cdn-assets.getmarks.app/" in u:
        rel = urllib.parse.unquote(u.split("cdn-assets.getmarks.app/", 1)[1])
        return "questions/figs/getmarks-assets/" + rel.lstrip("/")
    ext = ".png"
    m = re.search(r"\.(png|jpe?g|webp|gif|svg)$", u, re.I)
    if m:
        ext = m.group(0).lower()
    return "questions/figs/misc/" + sha16(u) + ext


def fb_url(rel: str) -> str:
    return (
        "https://firebasestorage.googleapis.com/v0/b/"
        + BUCKET
        + "/o/"
        + urllib.parse.quote(rel, safe="")
        + "?alt=media"
    )


def load_fb_set() -> set[str]:
    if not LIST_FILE.exists():
        return set()
    raw = LIST_FILE.read_bytes()
    text = raw.decode("utf-16") if raw[:2] == b"\xff\xfe" else raw.decode("utf-8", "ignore")
    out: set[str] = set()
    for line in text.splitlines():
        s = line.strip().lstrip("\ufeff")
        if not s or s.endswith(":") or s.endswith("/"):
            continue
        if "/questions/figs/" not in s:
            continue
        rel = "questions/figs/" + s.split("/questions/figs/", 1)[1]
        out.add(rel)
        out.add(urllib.parse.unquote(rel))
    return out


def bake_tmp_set() -> set[str]:
    out: set[str] = set()
    if not TMP.exists():
        return out
    for fp in TMP.rglob("*"):
        if fp.is_file():
            rel = "questions/figs/" + str(fp.relative_to(TMP)).replace("\\", "/")
            out.add(rel)
    return out


def walk_areas():
    for area in AREAS:
        yield from walk_json(area)


def collect_cdn() -> set[str]:
    uniq: set[str] = set()
    for fp in walk_areas():
        try:
            txt = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        if "getmarks.app" not in txt and "quizrr.in" not in txt and "examgoal.net" not in txt:
            continue
        work = txt.replace("\\/", "/")
        for m in CDN_RX.finditer(work):
            uniq.add(norm_url(m.group(0)))
    return uniq


def glue_fix(s: str) -> str:
    out = proof_tex(s)
    # $E=$$\mathrm{m}...$  and  $(vec)$$\mathrm{m}$  → single island
    out = GLUE_RX.sub(r"$\1 \2", out)
    out = re.sub(r"\$\$\s*(\\mathrm\s*\{[A-Za-z0-9]+\})\s*\$\$", r"$\1$", out)
    return out


def phase_map() -> dict:
    fb = load_fb_set()
    local = bake_tmp_set()
    have_rel = fb | local
    print("firebase_files", len(fb), "bake_tmp", len(local), flush=True)
    urls = collect_cdn()
    print("cdn_unique", len(urls), flush=True)
    mapping = {}
    need = []
    have = skip = 0
    for u in sorted(urls):
        rel = storage_rel(u)
        if rel in have_rel or urllib.parse.unquote(rel) in have_rel:
            mapping[u] = fb_url(rel)
            have += 1
        elif looks_image(u):
            need.append(u)
        else:
            skip += 1
    blob = {"have": have, "need": len(need), "skip_non_image": skip, "map": mapping}
    MAP_FILE.write_text(json.dumps(blob, indent=0), encoding="utf-8")
    NEED_FILE.write_text("\n".join(need), encoding="utf-8")
    print(json.dumps({"unique": len(urls), "have": have, "need_download": len(need), "skip_non_image": skip}), flush=True)
    return blob


def rewrite_text(txt: str, mapping: dict) -> str:
    def repl(m):
        raw = m.group(0).replace("\\/", "/")
        key = norm_url(raw)
        dest = mapping.get(key)
        if not dest:
            # try unquoted path
            dest = mapping.get(urllib.parse.unquote(key))
        if not dest:
            return m.group(0)
        return dest

    return CDN_RX.sub(repl, txt)


def phase_rewrite():
    blob = json.loads(MAP_FILE.read_text(encoding="utf-8"))
    mapping = blob.get("map") or {}
    print("map_size", len(mapping), flush=True)
    changed = scanned = 0
    for fp in walk_areas():
        scanned += 1
        try:
            txt = fp.read_text(encoding="utf-8")
        except Exception:
            continue
        if "getmarks.app" not in txt and "quizrr.in" not in txt and "examgoal.net" not in txt:
            continue
        work = txt.replace("\\/", "/")
        new = rewrite_text(work, mapping)
        if new != txt:
            fp.write_text(new, encoding="utf-8")
            changed += 1
            if changed % 20 == 0:
                print("  rewritten", changed, fp.name, flush=True)
    print(json.dumps({"scanned": scanned, "rewritten": changed}), flush=True)


def phase_glue_and_qid():
    mapping = load_map()
    stats = Counter()
    files_changed = 0
    for fp in walk_areas():
        # skip quizrr raw test index (not questions)
        if "_raw" in str(fp).replace("\\", "/"):
            continue
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        qs = qs_of(data)
        if qs is None:
            continue
        dirty = False
        for q in qs:
            if not isinstance(q, dict):
                continue
            stats["qs"] += 1
            for field in ("q", "question", "solution", "explanation"):
                raw = q.get(field)
                if not isinstance(raw, str) or not raw:
                    continue
                fixed = glue_fix(raw)
                if mapping:
                    fixed = rewrite_cdn(fixed, mapping)
                if fixed != raw:
                    q[field] = fixed
                    dirty = True
                    stats["glue_or_cdn_field"] += 1
            opts = q.get("options")
            if isinstance(opts, list):
                new_opts = []
                opt_ch = False
                for o in opts:
                    if isinstance(o, str):
                        f = glue_fix(o)
                        if mapping:
                            f = rewrite_cdn(f, mapping)
                        new_opts.append(f)
                        if f != o:
                            opt_ch = True
                    else:
                        new_opts.append(o)
                if opt_ch:
                    q["options"] = new_opts
                    dirty = True
                    stats["glue_opts"] += 1
            kinds = leftover_kind(q)
            if not kinds:
                continue
            stats["leftover"] += 1
            mid = marks_id(q)
            rec = None
            if mid:
                p = QID / f"{mid}.json"
                if p.exists():
                    try:
                        rec = json.loads(p.read_text(encoding="utf-8"))
                    except Exception:
                        rec = None
            pack = official_pack(rec) if rec else None
            if pack:
                ch = apply_official(q, pack, mapping)
                if ch:
                    dirty = True
                    stats["qid_applied"] += 1
                    for c in ch:
                        stats["f_" + c] += 1
        if dirty:
            fp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            files_changed += 1
    print(json.dumps({"files_changed": files_changed, **dict(stats)}, indent=2), flush=True)
    (MIG / "resolve_everything.json").write_text(
        json.dumps({"files_changed": files_changed, **dict(stats)}, indent=2), encoding="utf-8"
    )


def download_one(url: str) -> tuple[str, Path | None, str]:
    rel = storage_rel(url)
    dest = TMP / rel.replace("questions/figs/", "")
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 80:
        return url, dest, "skip"
    # encode spaces for request
    parts = urllib.parse.urlsplit(url)
    req_url = urllib.parse.urlunsplit(
        (
            parts.scheme,
            parts.netloc,
            urllib.parse.quote(urllib.parse.unquote(parts.path), safe="/"),
            parts.query,
            "",
        )
    )
    req = urllib.request.Request(
        req_url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "Referer": "https://web.getmarks.app/",
            "Origin": "https://web.getmarks.app",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            buf = r.read()
        if len(buf) < 80:
            return url, None, "tiny"
        dest.write_bytes(buf)
        return url, dest, "ok"
    except Exception as e:
        return url, None, type(e).__name__


def phase_download(workers: int = 10):
    if not NEED_FILE.exists():
        print("no need file", flush=True)
        return
    need = [u for u in NEED_FILE.read_text(encoding="utf-8").splitlines() if u.strip()]
    print("need", len(need), flush=True)
    TMP.mkdir(parents=True, exist_ok=True)
    ok = fail = 0
    mapping_add = {}
    fails = []
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(download_one, u): u for u in need}
        done = 0
        for fut in as_completed(futs):
            url, dest, st = fut.result()
            done += 1
            if st in ("ok", "skip") and dest:
                ok += 1
                mapping_add[url] = fb_url(storage_rel(url))
            else:
                fail += 1
                if len(fails) < 40:
                    fails.append({"url": url, "st": st})
            if done % 50 == 0 or done == len(need):
                print(f"  {done}/{len(need)} ok={ok} fail={fail}", flush=True)
    blob = json.loads(MAP_FILE.read_text(encoding="utf-8")) if MAP_FILE.exists() else {"map": {}}
    blob.setdefault("map", {}).update(mapping_add)
    blob["downloaded"] = ok
    blob["download_fail"] = fail
    MAP_FILE.write_text(json.dumps(blob, indent=0), encoding="utf-8")
    (MIG / "resolve_download_fail.json").write_text(json.dumps(fails, indent=2), encoding="utf-8")
    print(json.dumps({"downloaded": ok, "fail": fail}), flush=True)


def main():
    phase = (sys.argv[1] if len(sys.argv) > 1 else "all-local").lower()
    if phase == "map":
        phase_map()
    elif phase == "rewrite":
        phase_rewrite()
    elif phase == "glue":
        phase_glue_and_qid()
    elif phase == "download":
        phase_download()
    elif phase == "all-local":
        phase_map()
        phase_rewrite()
        phase_glue_and_qid()
    else:
        print("usage: map|rewrite|glue|download|all-local")
        sys.exit(1)


if __name__ == "__main__":
    main()
