#!/usr/bin/env python3
import json
import ssl
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
TOKEN = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))["token"]
CTX = ssl.create_default_context()
API = "https://web.getmarks.app"


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
        with urllib.request.urlopen(req, context=CTX, timeout=20) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}


def main():
    found = []
    # scan timestamp seconds 6a7c6720 .. 6a7c6760 and a few suffixes
    suffixes = [
        "4a29d63ee45d4d51",
        "4a29d63ee45d4d53",
        "4a29d63ee45d4d55",
        "4a29d63ee45d4d57",
        "4a29d63ee45d4d59",
        "4a29d63ee45d4d5b",
        "4a29d63ee45d4d5d",
        "4a29d63ee45d4d5f",
    ]
    start = int("6a7c6720", 16)
    end = int("6a7c6760", 16)
    n = 0
    for ts in range(start, end + 1):
        prefix = format(ts, "x")
        for suf in suffixes:
            sid = prefix + suf
            st, data = get("/api/v4/rfc/subject/%s/chapters?platform=web" % sid)
            n += 1
            if st == 200:
                sub = ((data.get("data") or {}).get("subject") or {})
                tabs = ((data.get("data") or {}).get("subjectTabs") or [])
                print("FOUND", sid, sub.get("title"), sub.get("cardsCount"), [t.get("title") for t in tabs])
                found.append((sid, sub.get("title"), sub.get("cardsCount"), tabs))
            if n % 40 == 0:
                print("scanned", n)
            time.sleep(0.04)
    print("done found", found)


if __name__ == "__main__":
    main()
