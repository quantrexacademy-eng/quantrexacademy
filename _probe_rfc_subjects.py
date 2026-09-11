#!/usr/bin/env python3
import json
import re
import ssl
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
TOKEN = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))["token"]
CTX = ssl.create_default_context()
API = "https://web.getmarks.app"
OUT = ROOT / "_tmp" / "flash_probe"


def get(path):
    req = urllib.request.Request(
        API + path,
        headers={
            "Accept": "application/json",
            "Authorization": "Bearer " + TOKEN,
            "User-Agent": "Mozilla/5.0",
            "Origin": API,
            "Referer": API + "/",
        },
    )
    try:
        with urllib.request.urlopen(req, context=CTX, timeout=40) as r:
            body = r.read()
            return r.status, body
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def main():
    # find rfc subject list in index + app chunks
    for rel in [
        "/_next/static/chunks/pages/index-8a5337e3c2930583.js",
        "/_next/static/chunks/pages/_app-26fdfb1641355f0d.js",
    ]:
        req = urllib.request.Request(API + rel, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=CTX, timeout=40) as r:
            t = r.read().decode("utf-8", "replace")
        print("FILE", rel, "len", len(t))
        for pat in ["/api/v4/rfc", "RFC_", "rfc/subject", "rfc/subjects", "RevisionFlash"]:
            print(" ", pat, t.count(pat))
        idx = 0
        shown = 0
        while shown < 12:
            i = t.find("/api/v4/", idx)
            if i < 0:
                break
            snip = t[max(0, i - 80): i + 180].replace("\n", " ")
            if re.search(r"rfc|flash|subject", snip, re.I):
                print(" API", snip)
                shown += 1
            idx = i + 8

    paths = [
        "/api/v4/rfc",
        "/api/v4/rfc/subjects",
        "/api/v4/rfc/subjects?platform=web",
        "/api/v4/rfc/subjects?platform=app",
        "/api/v4/rfc/?platform=web",
        "/api/v4/rfc/landing",
        "/api/v4/rfc/landing?platform=web",
        "/api/v4/rfc/home",
        "/api/v4/rfc/home?platform=web",
        "/api/v3/dashboard/platform/web?component=RevisionFlashCards",
        "/api/v4/rfc/subjects?examCategory=615d3e0cc52ffa3c944600db",
        "/api/v4/rfc/subjects?examCategory=615d3e29c52ffa3c944600dc",
        "/api/v4/rfc/subjects?category=Engineering",
        "/api/v4/rfc/subjects?category=Medical",
    ]
    for p in paths:
        st, body = get(p)
        txt = body.decode("utf-8", "replace")
        print("GET", st, p, txt[:220].replace("\n", " "))


if __name__ == "__main__":
    main()
