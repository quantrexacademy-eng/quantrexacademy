#!/usr/bin/env python3
"""Sample 120 leftover CDN URLs against Firebase Storage (public read)."""
from __future__ import annotations
import ssl
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BUCKET = "quantrexacademy-app.firebasestorage.app"
CTX = ssl.create_default_context()
lines = (ROOT / "data/_migration/unique_cdn_urls.txt").read_text(encoding="utf-8").splitlines()


def storage_path(url: str) -> str:
    u = url.split("?")[0]
    if "cdn-question-pool.getmarks.app/" in u:
        return "questions/figs/" + urllib.parse.unquote(u.split("cdn-question-pool.getmarks.app/", 1)[1])
    if "cdn.quizrr.in/" in u:
        return "questions/figs/quizrr/" + urllib.parse.unquote(u.split("cdn.quizrr.in/", 1)[1])
    if "examgoal.net/" in u:
        return "questions/figs/examgoal/" + urllib.parse.unquote(u.split("examgoal.net/", 1)[1])
    return ""


def head(url: str) -> int:
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=15, context=CTX) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 0


def pick(pred, n):
    out = []
    step = max(1, len(lines) // 400)
    for i, u in enumerate(lines):
        if pred(u) and i % step == 0:
            out.append(u)
            if len(out) >= n:
                break
    return out


pool = pick(lambda u: "cdn-question-pool.getmarks.app" in u, 80)
eg = pick(lambda u: "examgoal.net" in u, 20)
qz = pick(lambda u: "cdn.quizrr.in" in u, 10)
form = pick(lambda u: "cdn-assets.getmarks.app" in u, 10)
groups = {"pool": pool, "examgoal": eg, "quizrr": qz, "formula": form}
for name, urls in groups.items():
    ok = fail = 0
    for u in urls:
        sp = storage_path(u)
        if not sp:
            fail += 1
            continue
        fb = "https://firebasestorage.googleapis.com/v0/b/" + BUCKET + "/o/" + urllib.parse.quote(sp, safe="") + "?alt=media"
        st = head(fb)
        if st == 200:
            ok += 1
        else:
            fail += 1
    print(name, "n", len(urls), "ok", ok, "fail", fail)
print("unique_total", len(lines))
