#!/usr/bin/env python3
"""From filled JSONL, download official CDN figures and put them on Firebase Storage."""
from __future__ import annotations

import json
import os
import re
import ssl
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(r"E:\QUANTREX\website")
DOCS = ROOT / "data" / "_migration" / "fill_missing_docs.jsonl"
BUCKET = "quantrexacademy-app.firebasestorage.app"
CTX = ssl.create_default_context()
SRC = re.compile(r'\bsrc=["\']([^"\']+)["\']', re.I)
REPORT = ROOT / "data" / "_migration" / "fig_upload_report.json"


def adc_token():
    env = os.environ.get("FIRESTORE_TOKEN") or ""
    if env.startswith("ya29."):
        return env.strip()
    bins = [
        r"C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
        r"C:\Users\Admin\google-cloud-sdk\bin\gcloud.cmd",
    ]
    for b in bins:
        try:
            out = subprocess.check_output(
                [b, "auth", "application-default", "print-access-token"],
                text=True,
                stderr=subprocess.STDOUT,
            )
            tok = out.strip().splitlines()[-1].strip()
            if tok.startswith("ya29."):
                return tok
        except Exception:
            continue
    raise SystemExit("no ADC token")


def storage_from_fb(url):
    m = re.search(r"/o/([^?]+)", url)
    if not m:
        return ""
    return urllib.parse.unquote(m.group(1))


def marks_from_storage(path):
    rel = path.replace("questions/figs/", "", 1)
    if rel.startswith("quizrr/"):
        return "https://cdn.quizrr.in/" + rel[len("quizrr/") :]
    if rel.startswith("examgoal/"):
        return "https://cdn.examgoal.net/" + rel[len("examgoal/") :]
    if rel.startswith("getmarks-assets/"):
        return "https://cdn-assets.getmarks.app/" + rel[len("getmarks-assets/") :]
    return "https://cdn-question-pool.getmarks.app/" + rel


def walk_text(obj, acc):
    if isinstance(obj, str):
        acc.append(obj)
    elif isinstance(obj, dict):
        for v in obj.values():
            walk_text(v, acc)
    elif isinstance(obj, list):
        for v in obj:
            walk_text(v, acc)


def collect():
    paths = set()
    if not DOCS.exists():
        return paths
    with DOCS.open(encoding="utf-8") as f:
        for line in f:
            if "firebasestorage" not in line and "cdn-question-pool" not in line:
                continue
            try:
                d = json.loads(line)
            except Exception:
                continue
            chunks = []
            walk_text(d, chunks)
            blob = "\n".join(chunks)
            for u in SRC.findall(blob):
                if "firebasestorage" in u:
                    p = storage_from_fb(u)
                    if p.startswith("questions/figs/"):
                        paths.add(p)
                elif "cdn-question-pool" in u:
                    m = re.search(r"cdn-question-pool\.getmarks\.app/(.+?)(?:\?|#|$)", u, re.I)
                    if m:
                        paths.add("questions/figs/" + urllib.parse.unquote(m.group(1)))
    return paths


def exists(token, path):
    url = (
        "https://firebasestorage.googleapis.com/v0/b/"
        + BUCKET
        + "/o/"
        + urllib.parse.quote(path, safe="")
        + "?alt=media"
    )
    req = urllib.request.Request(url, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=8, context=CTX) as r:
            return r.status == 200
    except urllib.error.HTTPError as e:
        return e.code == 200
    except Exception:
        return False


def download(url):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "QuantrexAcademyMigration/1.0",
            "Accept": "image/*,*/*",
            "Referer": "https://www.quantrexacademy.com/",
        },
    )
    with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
        return r.read(), r.headers.get("content-type") or "image/png"


def upload(token, path, data, ctype):
    url = (
        "https://firebasestorage.googleapis.com/v0/b/"
        + urllib.parse.quote(BUCKET, safe="")
        + "/o?name="
        + urllib.parse.quote(path, safe="")
        + "&uploadType=media"
    )
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={"Authorization": "Bearer " + token, "Content-Type": ctype or "image/png"},
    )
    with urllib.request.urlopen(req, timeout=60, context=CTX) as r:
        return r.status


def main():
    paths = sorted(collect())
    print("fig paths", len(paths), flush=True)
    token = adc_token()
    ok = skip = fail = 0
    from concurrent.futures import ThreadPoolExecutor, as_completed

    def one(path):
        try:
            if exists(token, path):
                return "skip"
            src = marks_from_storage(path)
            data, ctype = download(src)
            if not data or len(data) < 40:
                return "fail"
            st = upload(token, path, data, ctype)
            return "ok" if st in (200, 201) else "fail"
        except Exception:
            return "fail"

    n = 0
    with ThreadPoolExecutor(max_workers=10) as ex:
        futs = {ex.submit(one, p): p for p in paths}
        for fut in as_completed(futs):
            n += 1
            kind = fut.result()
            if kind == "ok":
                ok += 1
            elif kind == "skip":
                skip += 1
            else:
                fail += 1
            if n % 50 == 0 or n == len(paths):
                print(f"  {n}/{len(paths)} ok={ok} skip={skip} fail={fail}", flush=True)
    REPORT.write_text(json.dumps({"ok": ok, "skip": skip, "fail": fail, "n": len(paths)}, indent=2), encoding="utf-8")
    print("DONE", {"ok": ok, "skip": skip, "fail": fail}, flush=True)


if __name__ == "__main__":
    main()
