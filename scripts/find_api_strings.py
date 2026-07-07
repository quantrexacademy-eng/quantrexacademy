#!/usr/bin/env python3
import re
import ssl
import urllib.request

CTX = ssl.create_default_context()
ORIGINS = [
    "https://web.getmarks.app",
    "https://getmarks.app",
]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=CTX, timeout=30) as resp:
        return resp.read().decode("utf-8", "ignore")


def main():
    found = set()
    for origin in ORIGINS:
        try:
            html = fetch(origin + "/")
        except Exception as e:
            print("skip", origin, e)
            continue
        scripts = re.findall(r'src="([^"]+\.js)"', html)
        print(origin, "scripts", len(scripts))
        for src in scripts[:30]:
            url = src if src.startswith("http") else origin + src
            try:
                js = fetch(url)
            except Exception:
                continue
            for m in re.findall(r"/api/v[0-9]/[a-zA-Z0-9_./?=&%-]{4,140}", js):
                low = m.lower()
                if any(k in low for k in ("assignment", "lblq", "ncoq", "dbq", "content", "board", "ncert", "neet/subject")):
                    found.add(m[:200])
    for f in sorted(found)[:80]:
        print(f)


if __name__ == "__main__":
    main()