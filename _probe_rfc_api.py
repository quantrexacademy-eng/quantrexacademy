#!/usr/bin/env python3
import json
import re
import ssl
import urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
TOKEN = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))["token"]
CTX = ssl.create_default_context()
API = "https://web.getmarks.app"


def fetch(url, auth=False):
    h = {"User-Agent": "Mozilla/5.0", "Accept": "*/*"}
    if auth:
        h["Authorization"] = "Bearer " + TOKEN
        h["Origin"] = API
        h["Referer"] = API + "/"
        h["Accept"] = "application/json"
    req = urllib.request.Request(url, headers=h)
    with urllib.request.urlopen(req, context=CTX, timeout=40) as r:
        return r.read()


def main():
    js = fetch(API + "/_next/static/chunks/1225-e7f558b7c4e7882f.js").decode("utf-8", "replace")
    Path(r"C:\Users\Admin\qx-hosting\_tmp\flash_probe\rfc_api.js").write_text(js, encoding="utf-8")
    print("js", len(js))
    for m in sorted(set(re.findall(r"/api/v4/rfc[^\"'` ]+", js))):
        print("API", m)
    idx = 0
    n = 0
    while True:
        i = js.find("/api/v4/rfc", idx)
        if i < 0:
            break
        print("----", js[max(0, i - 200): i + 240].replace("\n", " "))
        idx = i + 10
        n += 1
    print("snippets", n)

    # landing page also
    js2 = fetch(API + "/_next/static/chunks/pages/revision-flash-cards-d58304d256176c91.js").decode("utf-8", "replace")
    print("landing js", len(js2))
    for m in sorted(set(re.findall(r"/api/v4/rfc[^\"'` ]+", js2))):
        print("LAPI", m)
    idx = 0
    while True:
        i = js2.find("/api/v4/", idx)
        if i < 0:
            break
        print("L----", js2[max(0, i - 120): i + 200].replace("\n", " "))
        idx = i + 8


if __name__ == "__main__":
    main()
