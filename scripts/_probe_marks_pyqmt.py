#!/usr/bin/env python3
"""Login-token probe of Marks PYQ Mock Tests APIs + page JS."""
from __future__ import annotations

import json
import re
import ssl
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
CFG = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOK = CFG["token"]
OUT = ROOT / "data" / "_migration" / "marks_pyqmt_probe"
OUT.mkdir(parents=True, exist_ok=True)
CTX = ssl.create_default_context()
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def fetch(url, json_accept=True, extra=None):
    h = {
        "User-Agent": UA,
        "Accept": "application/json" if json_accept else "text/html,*/*",
        "Origin": "https://web.getmarks.app",
        "Referer": "https://web.getmarks.app/pyq-mt",
        "Authorization": "Bearer " + TOK,
    }
    if extra:
        h.update(extra)
    req = urllib.request.Request(url, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            raw = r.read()
            return r.status, dict(r.headers), raw
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()
    except Exception as e:
        return None, {}, str(e).encode("utf-8", "ignore")


def main():
    print("TOKEN_EXP", json.loads(__import__("base64").b64decode(TOK.split(".")[1] + "==").decode())["exp"])
    st, hdrs, raw = fetch("https://web.getmarks.app/pyq-mt", json_accept=False)
    html = raw.decode("utf-8", "ignore") if isinstance(raw, (bytes, bytearray)) else str(raw)
    print("HTML", st, len(html))
    (OUT / "pyq-mt.html").write_text(html[:200000], encoding="utf-8")
    scripts = re.findall(r"/_next/static/[^\"']+\.js", html)
    print("SCRIPTS", len(scripts))
    for s in scripts:
        print(" ", s)
    build = re.search(r'"buildId":"([^"]+)"', html)
    print("BUILD", build.group(1) if build else None)

    # download unique chunk names that look like pages
    for s in scripts:
        if "chunks/pages" in s or "pyq" in s.lower() or s.endswith("pyq-mt.js") or "/pages/" in s:
            st2, _, raw2 = fetch("https://web.getmarks.app" + s, json_accept=False)
            name = s.replace("/", "_")[-80:]
            p = OUT / name
            p.write_bytes(raw2 if isinstance(raw2, (bytes, bytearray)) else raw2.encode())
            print("SAVED", s, st2, p.stat().st_size)

    # Next.js data
    candidates = []
    if build:
        bid = build.group(1)
        candidates += [
            f"https://web.getmarks.app/_next/data/{bid}/pyq-mt.json",
            f"https://web.getmarks.app/_next/data/{bid}/tests.json",
        ]
    apis = [
        "/api/v1/pyq-mt",
        "/api/v1/pyq-mt/exams",
        "/api/v1/pyq-mt/landing",
        "/api/v2/pyq-mt",
        "/api/v2/pyq-mt/exams",
        "/api/v3/pyq-mt",
        "/api/v4/pyq-mt",
        "/api/v1/pyq/mt",
        "/api/v1/pyq/mock-tests",
        "/api/v1/pyq/mock",
        "/api/v2/pyq/mock-tests",
        "/api/v1/tests/pyq",
        "/api/v1/tests/pyq-mt",
        "/api/v2/tests/pyq-mt",
        "/api/v1/mock-tests",
        "/api/v1/mock-tests/pyq",
        "/api/v1/exams",
        "/api/v1/exams/neet",
        "/api/v2/exams",
        "/api/v1/pyq",
        "/api/v2/pyq",
        "/api/v1/pyq/exams",
        "/api/v2/pyq/exams",
        "/api/v1/pyq/papers",
        "/api/v1/papers",
        "/api/v1/previous-year",
        "/api/v1/previousYear",
        "/api/v4/pyq",
        "/api/v4/pyq-mt/landing",
        "/api/v4/tests",
        "/api/v4/tests/pyq",
        "/api/v4/tests/landing",
        "/api/v1/user/exams",
        "/api/v1/user",
        "/api/v1/home",
        "/api/v2/home",
        "/api/v1/landing",
        "/api/v2/landing",
        "/api/v1/config",
        "/api/v1/app/config",
        "/api/v2/app-config",
        "/api/v1/neet/papers",
        "/api/v1/exam/neet",
        "/api/v1/exam/neet/papers",
        "/api/v1/exam/neet/years",
        "/api/v2/exam/neet/papers",
        "/api/v1/ct/exams",
        "/api/v1/custom-test/exams",
        "/api/v4/custom-test/exams",
        "/api/v1/full-tests",
        "/api/v1/full-paper",
        "/api/v1/full-papers",
        "/api/v2/full-papers",
        "/api/v1/pyqmt",
        "/api/v1/pyqMt",
        "/api/v1/pyq-mock-tests",
        "/api/v2/pyq-mock-tests",
        "/api/v3/pyq-mock-tests",
        "/api/v4/pyq-mock-tests",
        "/api/v1/test-series",
        "/api/v4/test-series",
    ]
    hits = []
    for path in apis:
        url = "https://web.getmarks.app" + path
        st, _, raw = fetch(url)
        body = raw.decode("utf-8", "ignore") if isinstance(raw, (bytes, bytearray)) else str(raw)
        preview = body[:180].replace("\n", " ")
        print(f"API {st} {path} {len(body)} {preview}")
        if st == 200 and body and not body.lstrip().startswith("<!"):
            safe = path.strip("/").replace("/", "_")
            (OUT / f"api_{safe}.json").write_text(body[:2_000_000], encoding="utf-8")
            hits.append(path)
    print("HITS", hits)

    for url in candidates:
        st, _, raw = fetch(url, json_accept=True)
        body = raw.decode("utf-8", "ignore") if isinstance(raw, (bytes, bytearray)) else str(raw)
        print("NEXTDATA", st, url, len(body), body[:160].replace("\n", " "))
        if st == 200:
            (OUT / "nextdata.json").write_text(body[:2_000_000], encoding="utf-8")


if __name__ == "__main__":
    main()
