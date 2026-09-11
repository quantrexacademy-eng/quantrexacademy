#!/usr/bin/env python3
import re
import ssl
import urllib.request
from pathlib import Path

API = "https://web.getmarks.app"
CTX = ssl.create_default_context()
OUT = Path(r"C:\Users\Admin\qx-hosting\_tmp\flash_probe")


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=CTX, timeout=40) as r:
        return r.read().decode("utf-8", "replace")


def main():
    t = fetch(API + "/_next/static/chunks/pages/_app-26fdfb1641355f0d.js")
    OUT.joinpath("app.js.txt").write_text(t, encoding="utf-8")
    print("app", len(t))
    for key in ["RFC_SET_SUBJECT", "rfc/", "RevisionFlash", "zoology", "botany", "cardsCount"]:
        print(key, t.lower().count(key.lower()))
    idx = 0
    n = 0
    while n < 20:
        i = t.find("RFC_", idx)
        if i < 0:
            break
        print("RFC", t[max(0, i - 60): i + 180].replace("\n", " "))
        idx = i + 4
        n += 1

    # also search index around RevisionFlashCards for items mapping
    t2 = fetch(API + "/_next/static/chunks/pages/index-8a5337e3c2930583.js")
    i = t2.find("RevisionFlashCards")
    print("index rfc ctx", t2[max(0, i - 200): i + 500].replace("\n", " "))


if __name__ == "__main__":
    main()
