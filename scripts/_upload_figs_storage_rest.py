#!/usr/bin/env python3
"""Download official figure URLs and upload to Firebase Storage. Never invents."""
from __future__ import annotations

import json
import os
import ssl
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(r"E:\QUANTREX\website")
LIST = ROOT / "data" / "_migration" / "fill_missing_fig_urls.txt"
BUCKET = "quantrexacademy-app.firebasestorage.app"
CTX = ssl.create_default_context()
STAGE = ROOT / "data" / "_migration" / "fig_stage"
REPORT = ROOT / "data" / "_migration" / "fig_upload_report.json"


def adc_token():
    env = os.environ.get("FIRESTORE_TOKEN") or os.environ.get("GOOGLE_OAUTH_ACCESS_TOKEN") or ""
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


def storage_path(url):
    raw = str(url or "").strip()
    m1 = re_search(r"cdn-question-pool\.getmarks\.app/(.+?)(?:\?|#|$)", raw)
    if m1:
        return "questions/figs/" + urllib.parse.unquote(m1)
    m2 = re_search(r"cdn\.quizrr\.in/(.+?)(?:\?|#|$)", raw)
    if m2:
        return "questions/figs/quizrr/" + urllib.parse.unquote(m2)
    m3 = re_search(r"examgoal\.net/(.+?)(?:\?|#|$)", raw)
    if m3:
        return "questions/figs/examgoal/" + urllib.parse.unquote(m3)
    return ""


def re_search(pat, s):
    import re
    m = re.search(pat, s, re.I)
    return m.group(1) if m else ""


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


def exists(token, path):
    url = (
        "https://firebasestorage.googleapis.com/v0/b/"
        + BUCKET
        + "/o/"
        + urllib.parse.quote(path, safe="")
        + "?alt=media"
    )
    req = urllib.request.Request(url, method="GET", headers={"Authorization": "Bearer " + token})
    try:
        with urllib.request.urlopen(req, timeout=20, context=CTX) as r:
            return r.status == 200
    except urllib.error.HTTPError as e:
        return e.code == 200
    except Exception:
        return False


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
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": ctype or "image/png",
        },
    )
    with urllib.request.urlopen(req, timeout=60, context=CTX) as r:
        return r.status, r.read()[:120]


def main():
    urls = []
    if LIST.exists():
        urls = [ln.strip() for ln in LIST.read_text(encoding="utf-8").splitlines() if ln.strip()]
    print("urls", len(urls), flush=True)
    token = adc_token()
    STAGE.mkdir(parents=True, exist_ok=True)
    ok = skip = fail = 0
    for i, u in enumerate(urls, 1):
        dest = storage_path(u)
        if not dest:
            fail += 1
            continue
        try:
            if exists(token, dest):
                skip += 1
                continue
            data, ctype = download(u)
            if not data or len(data) < 40:
                fail += 1
                continue
            st, raw = upload(token, dest, data, ctype)
            if st in (200, 201):
                ok += 1
            else:
                fail += 1
                print("upload", st, dest, raw, flush=True)
        except Exception as e:
            fail += 1
            if fail <= 12:
                print("fail", dest, e, flush=True)
        if i % 20 == 0 or i == len(urls):
            print(f"  {i}/{len(urls)} ok={ok} skip={skip} fail={fail}", flush=True)
    REPORT.write_text(json.dumps({"ok": ok, "skip": skip, "fail": fail, "n": len(urls)}, indent=2), encoding="utf-8")
    print("DONE", {"ok": ok, "skip": skip, "fail": fail}, flush=True)


if __name__ == "__main__":
    main()
