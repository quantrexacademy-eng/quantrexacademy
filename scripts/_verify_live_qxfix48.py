#!/usr/bin/env python3
import json, re, urllib.parse, urllib.request, ssl
CTX = ssl.create_default_context()

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=60, context=CTX) as r:
        return r.status, r.headers.get("content-type"), r.read()

html = get("https://www.quantrexacademy.com/app.html")[2].decode("utf-8", "ignore")
m = re.search(r'QX_BUILD\s*=\s*"([^"]+)"', html)
print("QX_BUILD", m.group(1) if m else "NONE")
print("soljs", "solution-format.js?v=qxfix48" in html)
print("imgjs", "qx-image-clean.js?v=qxfix48" in html)

u = "https://www.quantrexacademy.com/api/catalog?action=paper&exam=neet&source=" + urllib.parse.quote("NEET 2025") + "&v=qxfix48"
d = json.loads(get(u)[2])
qs = d.get("questions") or []
src = None
for q in qs:
    blob = str(q.get("solution") or "") + str(q.get("q") or "")
    imgs = re.findall(r'src=["\']([^"\']+)["\']', blob, re.I)
    if imgs:
        src = imgs[0]
        break
print("sample src", src[:160] if src else None)
print("is proxy", bool(src and "proxy-image" in src))
print("is firebase", bool(src and "firebasestorage" in src))
if src:
    st, ct, body = get(src if src.startswith("http") else "https://www.quantrexacademy.com" + src)
    print("fig", st, ct, "bytes", len(body), "png", body[:4] == b"\x89PNG")
