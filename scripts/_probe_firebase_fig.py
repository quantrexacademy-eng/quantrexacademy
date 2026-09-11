#!/usr/bin/env python3
"""Probe whether previously uploaded Firebase Storage figures are publicly readable."""
from __future__ import annotations
import json
import ssl
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BUCKET = "quantrexacademy-app.firebasestorage.app"
CTX = ssl.create_default_context()

# sample leftover getmarks URLs
samples_path = ROOT / "data" / "_migration" / "unique_cdn_urls.txt"
lines = samples_path.read_text(encoding="utf-8", errors="ignore").splitlines()
pool = [u for u in lines if "cdn-question-pool.getmarks.app" in u][:8]
quiz = [u for u in lines if "cdn.quizrr.in" in u][:3]
form = [u for u in lines if "cdn-assets.getmarks.app" in u][:3]
urls = pool + quiz + form


def storage_path(url: str) -> str:
    u = url.split("?")[0]
    if "cdn-question-pool.getmarks.app/" in u:
        rel = u.split("cdn-question-pool.getmarks.app/", 1)[1]
        return "questions/figs/" + urllib.parse.unquote(rel)
    if "cdn.quizrr.in/" in u:
        rel = u.split("cdn.quizrr.in/", 1)[1]
        return "questions/figs/quizrr/" + urllib.parse.unquote(rel)
    if "examgoal.net/" in u:
        rel = u.split("examgoal.net/", 1)[1]
        return "questions/figs/examgoal/" + urllib.parse.unquote(rel)
    return ""


def head(url: str) -> tuple[int, str, str]:
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=20, context=CTX) as r:
            return r.status, r.headers.get("Content-Type", ""), r.headers.get("Content-Length", "")
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Content-Type", "") if e.headers else "", ""
    except Exception as e:
        return 0, str(e)[:80], ""


print("samples", len(urls))
ok = fail = 0
for u in urls:
    sp = storage_path(u)
    if not sp:
        print("skip", u[:90])
        continue
    fb = "https://firebasestorage.googleapis.com/v0/b/" + BUCKET + "/o/" + urllib.parse.quote(sp, safe="") + "?alt=media"
    st, ct, ln = head(fb)
    print(st, ln, ct, sp[:90])
    if st == 200:
        ok += 1
    else:
        fail += 1
print("firebase_head ok", ok, "fail", fail)

# list API without token (often 401)
list_url = "https://firebasestorage.googleapis.com/v0/b/" + BUCKET + "/o?prefix=questions/figs/&maxResults=2"
st, ct, ln = head(list_url)
print("list_head", st, ct)
