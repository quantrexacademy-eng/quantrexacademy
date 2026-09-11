#!/usr/bin/env python3
import re
import urllib.request

hdr = {"User-Agent": "QuantrexVerify/150"}

def get(url):
    req = urllib.request.Request(url, headers=hdr)
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.status, r.read().decode("utf-8", "ignore")

st, ver = get("https://www.quantrexacademy.com/version.json")
print("version.json", st, ver[:300].replace("\n", " "))
st, html = get("https://www.quantrexacademy.com/app.html")
m = re.search(r'QX_BUILD\s*=\s*"([^"]+)"', html)
print("app.html", st, "QX_BUILD", m.group(1) if m else "none")
st, man = get("https://www.quantrexacademy.com/manifest.webmanifest")
print("manifest", st, man[:220].replace("\n", " "))
