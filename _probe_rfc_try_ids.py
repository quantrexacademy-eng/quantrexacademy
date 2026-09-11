#!/usr/bin/env python3
import json
import ssl
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
        with urllib.request.urlopen(req, context=CTX, timeout=40) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {"raw": "err"}


def main():
    ids = [
        "615d708dbd4a37c4058ee5a8",
        "615d70bd9948bc1b21da2b1f",
        "615d70e621450b3f267390c8",
        "615d70f9a489afa3080ade2d",
        "67f804c39e66a9b0818202df",
        "67f8052c9e66a9b0818202e0",
        "68942eace8ab0dbd011ac238",  # neet physics from earlier
    ]
    # more from formulas nav
    fn = json.loads((ROOT / "data" / "nav" / "formulas.json").read_text(encoding="utf-8"))
    for s in fn:
        if s.get("id"):
            ids.append(s["id"])
    seen = set()
    for sid in ids:
        if sid in seen:
            continue
        seen.add(sid)
        st, data = get("/api/v4/rfc/subject/" + sid + "/chapters?platform=web")
        if st != 200:
            print("NO", st, sid, str(data)[:120])
            continue
        d = data.get("data") if isinstance(data, dict) else data
        print("OK", sid, type(d).__name__, str(d)[:240] if not isinstance(d, dict) else list(d.keys()))
        if isinstance(d, dict):
            title = d.get("title") or d.get("name") or d.get("subject")
            ch = d.get("chapters") or d.get("data") or []
            print("  title", title, "chapters", len(ch) if isinstance(ch, list) else type(ch))
            if isinstance(ch, list) and ch:
                print("  first", str(ch[0])[:200])

    # dashboard variants
    for p in [
        "/api/v3/dashboard/platform/web?examCategoryId=615d3e0cc52ffa3c944600db",
        "/api/v3/dashboard/platform/app?examCategoryId=615d3e0cc52ffa3c944600db",
        "/api/v3/dashboard/platform/web?targetExam=jee",
        "/api/v3/dashboard/items?platform=web",
        "/api/v3/dashboard/components?platform=web",
        "/api/v4/dashboard/items?platform=web",
        "/api/v3/home/items?platform=app",
        "/api/v3/home-feed?platform=app",
        "/api/v4/home-feed?platform=web",
    ]:
        st, data = get(p)
        s = json.dumps(data) if not isinstance(data, str) else data
        print("DASH", st, p, "flash" in s.lower(), "items" in s[:200], s[:160].replace("\n", " "))


if __name__ == "__main__":
    main()
