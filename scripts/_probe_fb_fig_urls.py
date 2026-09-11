#!/usr/bin/env python3
import json
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request

CTX = ssl.create_default_context()


def get(url):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "image/*,*/*",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            b = r.read(80)
            return r.status, r.headers.get("content-type"), len(r.read()) + len(b), b[:40]
    except urllib.error.HTTPError as e:
        body = e.read()[:180]
        return e.code, e.headers.get("content-type"), len(body), body
    except Exception as e:
        return None, "", 0, str(e).encode()


u = "https://www.quantrexacademy.com/api/catalog?action=paper&exam=neet&source=" + urllib.parse.quote("NEET 2025") + "&v=qxfix47"
req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
raw = urllib.request.urlopen(req, timeout=90, context=CTX).read()
d = json.loads(raw)
qs = d["questions"]
imgs = []
for q in qs:
    for field in ("q", "solution"):
        blob = str(q.get(field) or "")
        for src in re.findall(r'src=["\']([^"\']+)["\']', blob, re.I):
            imgs.append((field, q.get("id"), src))
print("n imgs", len(imgs))
for field, qid, src in imgs[:6]:
    print("\nFIELD", field, "qid", qid)
    print("SRC", src)
    print("has alt=media", "alt=media" in src, "len", len(src))
    st, ct, n, prev = get(src)
    print("DIRECT", st, ct, n, prev[:80])
    prox = "https://www.quantrexacademy.com/api/proxy-image?url=" + urllib.parse.quote(src, safe="") + "&clean=1&v=pale1"
    st2, ct2, n2, prev2 = get(prox)
    print("PROXY", st2, ct2, n2, prev2[:80])

# also a known-good getmarks cdn if any
for field, qid, src in imgs:
    if "getmarks" in src or "quizrr" in src:
        print("CDN", src[:160])
        break
