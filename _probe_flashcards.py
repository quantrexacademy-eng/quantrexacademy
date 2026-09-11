#!/usr/bin/env python3
"""Discover Marks Revision Flash Cards API and extract cards."""
from __future__ import annotations

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
OUT.mkdir(parents=True, exist_ok=True)


def http(url: str, headers=None, timeout=40):
    h = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
    }
    if headers:
        h.update(headers)
    req = urllib.request.Request(url, headers=h)
    try:
        with urllib.request.urlopen(req, context=CTX, timeout=timeout) as r:
            return r.status, r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), {}


def api(path: str):
    st, body, _ = http(
        API + path,
        {
            "Accept": "application/json",
            "Authorization": "Bearer " + TOKEN,
            "Origin": API,
            "Referer": API + "/",
        },
    )
    return st, body


KEYS = (
    "flash",
    "Flash",
    "revisionFlash",
    "Revision Flash",
    "flashCard",
    "flash-card",
    "flash_card",
    "rfc",
    "613 Flash",
)


def scan_js():
    st, html, _ = http(API + "/")
    html = html.decode("utf-8", "replace")
    scripts = re.findall(r'(?:src|href)="(/_next/static/[^"]+\.js[^"]*)"', html)
    # build manifest lists more pages
    for m in re.findall(r'"(/_next/static/[^"]+_buildManifest\.js)"', html):
        scripts.append(m)
    st, man, _ = http(API + "/_next/static/ZgIfSg9kw2uGwhkPNssh8/_buildManifest.js")
    man_t = man.decode("utf-8", "replace") if st == 200 else ""
    (OUT / "buildManifest.js").write_text(man_t, encoding="utf-8")
    extra = re.findall(r"static/chunks/[^\"']+\.js", man_t)
    print("manifest extras", len(extra))
    urls = []
    for s in scripts + extra:
        if s.startswith("static/"):
            s = "/_next/" + s
        if s.startswith("/"):
            urls.append(s.split("?")[0])
    # unique
    seen = []
    for u in urls:
        if u not in seen:
            seen.append(u)
    print("scan", len(seen), "js")
    hits = []
    for i, u in enumerate(seen):
        st, body, _ = http(API + u)
        if st != 200:
            print(" fail", st, u)
            continue
        text = body.decode("utf-8", "replace", errors="replace") if False else body.decode("utf-8", "replace")
        low = text.lower()
        if any(k.lower() in low for k in KEYS):
            # extract nearby /api paths
            apis = sorted(set(re.findall(r"/api/v[0-9]/[A-Za-z0-9_./?-]+", text)))
            flash_apis = [a for a in apis if re.search(r"flash|revision|card|rfc", a, re.I)]
            print("HIT", u, "len", len(text), "flash_apis", flash_apis[:20], "api_n", len(apis))
            (OUT / (Path(u).name + ".txt")).write_text(
                "\n".join(flash_apis + ["---"] + apis[:80]), encoding="utf-8"
            )
            hits.append(u)
            # dump snippets
            for k in KEYS:
                idx = text.lower().find(k.lower())
                if idx >= 0:
                    snip = text[max(0, idx - 80) : idx + 160].replace("\n", " ")
                    print("  ", k, "=>", snip[:200])
        if (i + 1) % 15 == 0:
            print(" ...", i + 1, "/", len(seen))
    print("done hits", hits)


def main():
    scan_js()


if __name__ == "__main__":
    main()
