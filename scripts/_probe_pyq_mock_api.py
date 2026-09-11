#!/usr/bin/env python3
"""Walk Marks /api/v3/pyq-mock tree for NEET papers + Q counts."""
from __future__ import annotations

import json
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
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


def get(path):
    url = path if path.startswith("http") else "https://web.getmarks.app" + path
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/json",
            "Origin": "https://web.getmarks.app",
            "Referer": "https://web.getmarks.app/pyq-mt",
            "Authorization": "Bearer " + TOK,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60, context=CTX) as r:
            raw = r.read()
            return r.status, raw
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return None, str(e).encode()


def dump(name, body):
    p = OUT / name
    if isinstance(body, (bytes, bytearray)):
        p.write_bytes(body)
    else:
        p.write_text(str(body), encoding="utf-8")
    return p


def preview(body, n=240):
    s = body.decode("utf-8", "ignore") if isinstance(body, (bytes, bytearray)) else str(body)
    return s[:n].replace("\n", " ")


def main():
    paths = [
        "/api/v3/pyq-mock",
        "/api/v3/pyq-mock/",
        "/api/v3/pyq-mock/exams",
        "/api/v3/pyq-mock/landing",
        "/api/v3/pyq-mock/exam",
        "/api/v3/pyq-mock/list",
        "/api/v3/pyq-mock/neet",
        "/api/v3/pyq-mock/NEET",
        "/api/v3/pyq-mock?platform=web",
        "/api/v1/cpyqb/",
        "/api/v1/cpyqb/exam",
        "/api/v1/cpyqb/exam/",
        "/api/v1/cpyqb/exams",
        "/api/v1/content/examCategory",
        "/api/v1/user/examCategory",
        "/api/v4/neet/dashboard",
        "/api/v4/neet/count",
        "/api/v3/user/me",
        "/api/v2/user/me",
        "/api/v1/user/me",
    ]
    for p in paths:
        st, body = get(p)
        print(f"{st} {p} {len(body)} {preview(body)}")
        if st == 200:
            safe = p.strip("/").replace("/", "_").replace("?", "_")[:80]
            dump(f"ok_{safe}.json", body)

    # exams listing already saved
    exams_p = OUT / "api_api_v1_exams.json"
    if exams_p.exists():
        j = json.loads(exams_p.read_text(encoding="utf-8"))
        exams = []
        data = j.get("data") or {}
        for cat in data.get("exams") or []:
            for rec in cat.get("records") or []:
                exams.append(rec)
        print("EXAMS", len(exams))
        # find NEET
        for rec in exams:
            title = str(rec.get("title") or rec.get("name") or rec.get("exam") or "")
            slug = str(rec.get("slug") or rec.get("code") or rec.get("examSlug") or "")
            eid = str(rec.get("_id") or rec.get("id") or "")
            blob = json.dumps(rec)
            if "NEET" in blob.upper() or "neet" in blob:
                print("NEET_EXAM", title, slug, eid, json.dumps(rec)[:300])
                for p in [
                    f"/api/v3/pyq-mock/{eid}",
                    f"/api/v3/pyq-mock/exam/{eid}",
                    f"/api/v3/pyq-mock/exams/{eid}",
                    f"/api/v3/pyq-mock/{eid}/years",
                    f"/api/v3/pyq-mock/{eid}/papers",
                    f"/api/v1/cpyqb/exam/{eid}",
                    f"/api/v1/cpyqb/{eid}",
                ]:
                    st, body = get(p)
                    print(f"  {st} {p} {len(body)} {preview(body)}")
                    if st == 200:
                        dump(f"neet_{eid}_{p.strip('/').replace('/','_')[:60]}.json", body)


if __name__ == "__main__":
    main()
