#!/usr/bin/env python3
"""Bake leftover Marks/Quizrr/Examgoal figures onto Firebase (self-dep).
Never invents academic content. Pale-wipes Marks logo on pool figures only.
Phases: map | rewrite | download | upload | rewrite
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
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
sys.path.insert(0, str(ROOT / "lib"))
BUCKET = "quantrexacademy-app.firebasestorage.app"
MIG = ROOT / "data" / "_migration"
LIST_FILE = MIG / "firebase_figs_list.txt"
UNIQ_FILE = MIG / "unique_cdn_urls.txt"
MAP_FILE = MIG / "selfdep_url_map.json"
NEED_FILE = MIG / "selfdep_need_download.txt"
TMP = MIG / "bake_tmp"
OUT_DIAG = ROOT / "assets" / "diagrams"
CTX = ssl.create_default_context()

CDN_RX = re.compile(
    r"""https?://(?:cdn-question-pool\.getmarks\.app|cdn-assets\.getmarks\.app|cdn\.quizrr\.in|app-content\.cdn\.examgoal\.net)[^\"'\\>\s]+""",
    re.I,
)
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
    s = str(u or "").replace("\\/", "/").strip().rstrip("\\")
    s = s.split("#")[0]
    # keep query-less for mapping; some formula cards need query-less path
    if "cdn-assets.getmarks.app" in s:
        return s.split("?")[0]
    return s.split("?")[0]


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
    raw = LIST_FILE.read_bytes()
    text = raw.decode("utf-16") if raw[:2] == b"\xff\xfe" else raw.decode("utf-8", "ignore")
    out = set()
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


def walk_json():
    for area in AREAS:
        if area.is_file():
            yield area
            continue
        if not area.exists():
            continue
        for fp in area.rglob("*.json"):
            if fp.name.startswith("_") or ".bak" in fp.name:
                continue
            yield fp


def phase_map():
    fb = load_fb_set()
    print("firebase_files", len(fb), flush=True)
    urls = [norm_url(u) for u in UNIQ_FILE.read_text(encoding="utf-8").splitlines() if u.strip()]
    urls = sorted(set(urls))
    mapping = {}
    need = []
    have = 0
    for u in urls:
        rel = storage_rel(u)
        if rel in fb or urllib.parse.unquote(rel) in fb:
            mapping[u] = fb_url(rel)
            have += 1
        else:
            need.append(u)
    MAP_FILE.write_text(json.dumps({"have": have, "need": len(need), "map": mapping}, indent=0), encoding="utf-8")
    NEED_FILE.write_text("\n".join(need), encoding="utf-8")
    print(json.dumps({"unique": len(urls), "have_firebase": have, "need_download": len(need)}), flush=True)


def rewrite_text(txt: str, mapping: dict) -> str:
    def repl(m):
        raw = m.group(0).replace("\\/", "/")
        key = norm_url(raw)
        dest = mapping.get(key)
        if not dest:
            return m.group(0)
        return dest

    return CDN_RX.sub(repl, txt)


def phase_rewrite():
    blob = json.loads(MAP_FILE.read_text(encoding="utf-8"))
    mapping = blob.get("map") or {}
    print("map_size", len(mapping), flush=True)
    changed = 0
    files = 0
    for fp in walk_json():
        files += 1
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
            if changed % 25 == 0:
                print("  rewritten", changed, fp.name, flush=True)
    print(json.dumps({"scanned": files, "rewritten": changed}), flush=True)


def download_one(url: str) -> tuple[str, Path | None, str]:
    last = url.split("?")[0].split("/")[-1]
    if "." not in last:
        return url, None, "not_image"
    rel = storage_rel(url)
    dest = TMP / rel.replace("questions/figs/", "")
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 80:
        return url, dest, "skip"
    # reuse local baked sha if present
    local = OUT_DIAG / f"qx-self-{sha16(url)}.png"
    if local.exists() and local.stat().st_size > 80:
        dest.write_bytes(local.read_bytes())
        return url, dest, "local"
    req = urllib.request.Request(
        url,
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


def pale_wipe(path: Path) -> None:
    try:
        import numpy as np
        from PIL import Image
    except Exception:
        return
    name = str(path).replace("\\", "/").lower()
    if "formula_cards" in name or "getmarks-assets" in name:
        return
    try:
        with Image.open(path) as im:
            rgba = im.convert("RGBA")
            arr = np.asarray(rgba).copy()
            r = arr[:, :, 0].astype(np.int16)
            g = arr[:, :, 1].astype(np.int16)
            b = arr[:, :, 2].astype(np.int16)
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            mx = np.maximum(np.maximum(r, g), b)
            mn = np.minimum(np.minimum(r, g), b)
            chroma = mx - mn
            dark = lum <= 180
            pale_cyan = (b > r + 3) & (b > g) & (r > 200) & (b > 245) & (lum > 200) & (lum < 253)
            pale_grey = (chroma <= 5) & (lum > 215) & (lum < 248)
            marks = (pale_cyan | pale_grey) & ~dark
            dil = marks.copy()
            dil[1:, :] |= marks[:-1, :]
            dil[:-1, :] |= marks[1:, :]
            dil[:, 1:] |= marks[:, :-1]
            dil[:, :-1] |= marks[:, 1:]
            dil = dil & ~dark
            if not dil.any():
                return
            arr[dil, 0] = 255
            arr[dil, 1] = 255
            arr[dil, 2] = 255
            arr[dil, 3] = 255
            Image.fromarray(arr, "RGBA").convert("RGB").save(path, "PNG", optimize=True)
    except Exception:
        return


def phase_download(workers: int = 12):
    need = [u for u in NEED_FILE.read_text(encoding="utf-8").splitlines() if u.strip()]
    print("need", len(need), flush=True)
    TMP.mkdir(parents=True, exist_ok=True)
    ok = fail = skip = 0
    mapping_add = {}
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(download_one, u): u for u in need}
        done = 0
        for fut in as_completed(futs):
            url, dest, st = fut.result()
            done += 1
            if st in ("ok", "skip", "local") and dest:
                ok += 1
                if st == "ok":
                    pale_wipe(dest)
                rel = storage_rel(url)
                mapping_add[url] = fb_url(rel)
            else:
                fail += 1
            if done % 100 == 0 or done == len(need):
                print(f"  {done}/{len(need)} ok={ok} fail={fail}", flush=True)
    blob = json.loads(MAP_FILE.read_text(encoding="utf-8"))
    blob.setdefault("map", {}).update(mapping_add)
    blob["downloaded"] = ok
    blob["download_fail"] = fail
    MAP_FILE.write_text(json.dumps(blob, indent=0), encoding="utf-8")
    print(json.dumps({"downloaded": ok, "fail": fail}), flush=True)


def phase_upload():
    # recursive upload of bake_tmp → questions/figs/
    if not TMP.exists():
        print("no tmp", flush=True)
        return
    n = sum(1 for _ in TMP.rglob("*") if _.is_file())
    print("local_files", n, flush=True)


def main():
    phase = (sys.argv[1] if len(sys.argv) > 1 else "map").lower()
    if phase == "map":
        phase_map()
    elif phase == "rewrite":
        phase_rewrite()
    elif phase == "download":
        phase_download()
    elif phase == "upload":
        phase_upload()
    elif phase == "all-existing":
        phase_map()
        phase_rewrite()
    else:
        print("usage: map|rewrite|download|upload|all-existing")
        sys.exit(1)


if __name__ == "__main__":
    main()
